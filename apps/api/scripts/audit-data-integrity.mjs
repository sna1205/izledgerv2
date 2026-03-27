import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env.ts";
import {
  loadDataIntegrityAudit,
  summarizeDataIntegrityAudit,
  writeDataIntegrityReport,
} from "./lib/data-integrity-audit.mjs";

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];

    if (!part.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = part.slice(2).split("=", 2);
    const nextValue = inlineValue ?? argv[index + 1];

    if (inlineValue === undefined && nextValue && !nextValue.startsWith("--")) {
      options[rawKey] = nextValue;
      index += 1;
      continue;
    }

    options[rawKey] = inlineValue ?? "true";
  }

  return options;
}

function parsePositiveInt(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }

  return parsed;
}

const args = parseArgs(process.argv.slice(2));
const sampleSize = parsePositiveInt(args["sample-size"], 25);
const writeReport = String(args["write-report"] ?? "false").toLowerCase() === "true";

const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

try {
  const audit = await loadDataIntegrityAudit(prisma);
  const summary = summarizeDataIntegrityAudit(audit, { sampleSize });
  const payload = {
    generatedAt: new Date().toISOString(),
    ...summary,
  };

  if (writeReport) {
    payload.reportPath = await writeDataIntegrityReport(audit, { sampleSize });
  }

  console.log(JSON.stringify(payload, null, 2));
} finally {
  await prisma.$disconnect();
}

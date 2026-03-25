import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { persistenceReleaseTestFiles } from "./lib/persistence-release-tests.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const disallowedPatterns = [
  { pattern: /\btest\.skip\s*\(/, label: "test.skip" },
  { pattern: /\bskip\s*\(/, label: "skip(...)" },
  { pattern: /\btest\.todo\s*\(/, label: "test.todo" },
  { pattern: /\btodo\s*\(/, label: "todo(...)" },
  { pattern: /\btest\.only\s*\(/, label: "test.only" },
  { pattern: /\bonly\s*\(/, label: "only(...)" },
];

function fail(message, details = "") {
  console.error(details ? `${message}\n${details}` : message);
  process.exit(1);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: apiRoot,
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
}

function parseTapCount(output, label) {
  const match = output.match(new RegExp(`^# ${label} (\\d+)$`, "m"));
  return match ? Number(match[1]) : 0;
}

function assertPersistenceTestsAreExplicit() {
  const offenders = [];

  for (const relativePath of persistenceReleaseTestFiles) {
    const absolutePath = path.resolve(apiRoot, relativePath);
    const source = fs.readFileSync(absolutePath, "utf8");

    for (const { pattern, label } of disallowedPatterns) {
      if (pattern.test(source)) {
        offenders.push(`${relativePath}: contains ${label}`);
      }
    }
  }

  if (offenders.length > 0) {
    fail(
      [
        "Persistence-critical test files cannot contain skipped, todo, or only markers.",
        "Remove these markers before releasing.",
      ].join("\n"),
      offenders.join("\n"),
    );
  }
}

assertPersistenceTestsAreExplicit();

const prepareResult = run(process.execPath, ["./scripts/prepare-integration-db.mjs"]);

if (prepareResult.status !== 0) {
  fail(
    "Failed to prepare the persistence integration database.",
    [
      prepareResult.error instanceof Error ? prepareResult.error.message : "",
      text(prepareResult.stdout),
      text(prepareResult.stderr),
    ].filter(Boolean).join("\n"),
  );
}

const testArgs = [
  "--import",
  "tsx",
  "--import",
  "./test/setup.ts",
  "--test",
  ...persistenceReleaseTestFiles,
];

const testResult = run("node", testArgs);
const testOutput = [text(testResult.stdout), text(testResult.stderr)].filter(Boolean).join("\n");

const summary = {
  tests: parseTapCount(testOutput, "tests"),
  pass: parseTapCount(testOutput, "pass"),
  fail: parseTapCount(testOutput, "fail"),
  skipped: parseTapCount(testOutput, "skipped"),
  cancelled: parseTapCount(testOutput, "cancelled"),
  todo: parseTapCount(testOutput, "todo"),
};

if (testResult.status !== 0 || summary.fail > 0 || summary.skipped > 0 || summary.cancelled > 0 || summary.todo > 0 || summary.tests === 0) {
  fail(
    [
      "Persistence-critical integration gate failed.",
      "The release gate requires zero failures, zero skips, zero todos, and at least one executed persistence test.",
    ].join("\n"),
    [
      testOutput,
      "",
      `Parsed summary: ${JSON.stringify(summary)}`,
    ].join("\n"),
  );
}

process.stdout.write(
  [
    "Persistence-critical integration gate passed.",
    `Executed ${summary.tests} tests with ${summary.pass} passing and 0 skipped.`,
  ].join("\n"),
);
process.stdout.write("\n");

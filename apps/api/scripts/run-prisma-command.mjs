import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parse as parseDotenv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const prismaCliPath = require.resolve("prisma/build/index.js", { paths: [apiRoot] });

function readEnvFile(filename) {
  const filePath = path.join(apiRoot, filename);

  if (!existsSync(filePath)) {
    return {};
  }

  return parseDotenv(readFileSync(filePath, "utf8"));
}

function resolveRuntimeEnv() {
  const candidate = process.env.NODE_ENV ?? process.env.APP_ENV ?? "development";

  if (candidate === "production" || candidate === "test") {
    return candidate;
  }

  return "development";
}

function loadFileEnv() {
  const runtimeEnv = resolveRuntimeEnv();
  const hasLocalFile = existsSync(path.join(apiRoot, ".env.local"));

  const developmentFallback = runtimeEnv === "development" && !hasLocalFile
    ? readEnvFile(".env.example")
    : {};

  const modeEnv = runtimeEnv === "production"
    ? readEnvFile(".env.production")
    : runtimeEnv === "test"
      ? readEnvFile(".env.test")
      : readEnvFile(".env.local");

  return {
    ...developmentFallback,
    ...modeEnv,
  };
}

const prismaArgs = process.argv.slice(2);

if (prismaArgs.length === 0) {
  console.error("Usage: node ./scripts/run-prisma-command.mjs <prisma-args...>");
  process.exit(1);
}

const fileEnv = loadFileEnv();
const prismaEnv = {
  ...fileEnv,
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? process.env.APP_ENV ?? fileEnv.NODE_ENV ?? fileEnv.APP_ENV ?? "development",
  APP_ENV: process.env.APP_ENV ?? process.env.NODE_ENV ?? fileEnv.APP_ENV ?? fileEnv.NODE_ENV,
};

const result = spawnSync(process.execPath, [prismaCliPath, ...prismaArgs], {
  cwd: apiRoot,
  env: prismaEnv,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import {
  applyLocalApiMigrations,
  ensureLocalDevEnvFiles,
  getApiLocalProcessEnv,
  loadLocalDevConfig,
  preferredNodePath,
  rootDir,
} from "./local-dev-config.mjs";

function log(message) {
  process.stdout.write(`[start:api] ${message}\n`);
}

function logError(message) {
  process.stderr.write(`[start:api] ${message}\n`);
}

await ensureLocalDevEnvFiles(log);
const config = await loadLocalDevConfig();
const serverEntryPath = path.join(rootDir, "apps/api/dist/server.js");

if (!existsSync(serverEntryPath)) {
  logError("missing apps/api/dist/server.js. Run `npm run build:api` first.");
  process.exit(1);
}

log("applying local Prisma migrations before starting API");
await applyLocalApiMigrations(log, logError);
log(`using ${path.relative(rootDir, config.paths.apiEnvLocalPath)}`);
log(`starting built API at ${config.api.origin}`);

const child = spawn(
  preferredNodePath,
  [serverEntryPath],
  {
    cwd: path.join(rootDir, "apps/api"),
    env: getApiLocalProcessEnv(),
    stdio: "inherit",
  },
);

child.on("error", (error) => {
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

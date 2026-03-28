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
  process.stdout.write(`[dev:api] ${message}\n`);
}

function logError(message) {
  process.stderr.write(`[dev:api] ${message}\n`);
}

await ensureLocalDevEnvFiles(log);
const config = await loadLocalDevConfig();
log("applying local Prisma migrations before starting API");
await applyLocalApiMigrations(log, logError);

log(`using ${path.relative(rootDir, config.paths.apiEnvLocalPath)}`);
log(`API will listen at ${config.api.origin}`);

const child = spawn(
  preferredNodePath,
  [path.join(rootDir, "node_modules/tsx/dist/cli.mjs"), "watch", "src/server.ts"],
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

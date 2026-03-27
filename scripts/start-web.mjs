import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import {
  ensureLocalDevEnvFiles,
  getWebLocalProcessEnv,
  loadLocalDevConfig,
  preferredNodePath,
  rootDir,
} from "./local-dev-config.mjs";

function log(message) {
  process.stdout.write(`[start:web] ${message}\n`);
}

function logError(message) {
  process.stderr.write(`[start:web] ${message}\n`);
}

await ensureLocalDevEnvFiles(log);
const config = await loadLocalDevConfig();
const webDistPath = path.join(rootDir, "apps/web/dist/index.html");

if (!existsSync(webDistPath)) {
  logError("missing apps/web/dist/index.html. Run `npm run build:web:local` first.");
  process.exit(1);
}

log(`using ${path.relative(rootDir, config.paths.webEnvLocalPath)}`);
log(`starting built web preview at ${config.web.origin}`);
log(`preview will call ${config.web.apiBaseUrl}`);

const child = spawn(
  preferredNodePath,
  [
    path.join(rootDir, "node_modules/vite/bin/vite.js"),
    "preview",
    "--host",
    "0.0.0.0",
    "--port",
    String(config.web.port),
    "--strictPort",
  ],
  {
    cwd: path.join(rootDir, "apps/web"),
    env: getWebLocalProcessEnv(),
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

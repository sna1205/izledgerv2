import { spawn } from "node:child_process";
import { access, copyFile } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_WEB_PORT = 5173;
const DEFAULT_API_PORT = 4000;
const WSL_SAFE_TMP_DIR = "/tmp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const preferredNodePath =
  process.env.IZLEDGER_NODE_PATH ??
  (process.platform === "linux" && existsSync("/usr/bin/node") ? "/usr/bin/node" : process.execPath);

const runningChildren = [];

function log(message) {
  process.stdout.write(`[dev] ${message}\n`);
}

function logError(message) {
  process.stderr.write(`[dev] ${message}\n`);
}

async function ensureFile(targetPath, examplePath) {
  try {
    await access(targetPath, constants.F_OK);
    return false;
  } catch {
    await copyFile(examplePath, targetPath);
    return true;
  }
}

function isPortAvailable(port, host = "0.0.0.0") {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error && typeof error === "object" && "code" in error) {
        resolve(false);
        return;
      }

      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen({ host, port });
  });
}

async function findAvailablePort(preferredPort) {
  let port = preferredPort;

  while (!(await isPortAvailable(port))) {
    port += 1;
  }

  return port;
}

function pipeWithPrefix(stream, prefix, output) {
  if (!stream) {
    return;
  }

  let buffered = "";
  stream.setEncoding("utf8");

  stream.on("data", (chunk) => {
    buffered += chunk;

    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? "";

    for (const line of lines) {
      output.write(`[${prefix}] ${line}\n`);
    }
  });

  stream.on("end", () => {
    if (buffered.length > 0) {
      output.write(`[${prefix}] ${buffered}\n`);
    }
  });
}

function killChild(child) {
  if (!child || child.killed || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  child.kill("SIGTERM");

  setTimeout(() => {
    if (child.exitCode === null) {
      child.kill("SIGKILL");
    }
  }, 3000).unref();
}

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of runningChildren) {
    killChild(child);
  }

  setTimeout(() => {
    process.exit(code);
  }, 100).unref();
}

function spawnApp(name, cwd, scriptPath, args, env) {
  const child = spawn(preferredNodePath, [scriptPath, ...args], {
    cwd,
    env,
    stdio: ["inherit", "pipe", "pipe"],
  });

  runningChildren.push(child);

  pipeWithPrefix(child.stdout, name, process.stdout);
  pipeWithPrefix(child.stderr, `${name}:err`, process.stderr);

  child.on("error", (error) => {
    logError(`${name} failed to start: ${error.message}`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    logError(`${name} exited with ${reason}`);
    shutdown(code ?? 1);
  });

  return child;
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(0));
}

process.on("exit", () => {
  for (const child of runningChildren) {
    killChild(child);
  }
});

async function main() {
  const apiEnvPath = path.join(rootDir, "apps/api/.env");
  const apiEnvExamplePath = path.join(rootDir, "apps/api/.env.example");
  const webEnvPath = path.join(rootDir, "apps/web/.env.local");
  const webEnvExamplePath = path.join(rootDir, "apps/web/.env.example");

  const createdApiEnv = await ensureFile(apiEnvPath, apiEnvExamplePath);
  const createdWebEnv = await ensureFile(webEnvPath, webEnvExamplePath);

  if (createdApiEnv) {
    log("created apps/api/.env from apps/api/.env.example");
  }

  if (createdWebEnv) {
    log("created apps/web/.env.local from apps/web/.env.example");
  }

  const apiPort = await findAvailablePort(DEFAULT_API_PORT);
  const webPort = await findAvailablePort(DEFAULT_WEB_PORT);

  if (apiPort !== DEFAULT_API_PORT) {
    log(`port ${DEFAULT_API_PORT} is busy, using API port ${apiPort}`);
  }

  if (webPort !== DEFAULT_WEB_PORT) {
    log(`port ${DEFAULT_WEB_PORT} is busy, using web port ${webPort}`);
  }

  const apiOrigin = `http://localhost:${apiPort}`;
  const webOrigin = `http://localhost:${webPort}`;

  log(`starting API at ${apiOrigin}`);
  log(`starting web at ${webOrigin}`);

  spawnApp(
    "api",
    path.join(rootDir, "apps/api"),
    path.join(rootDir, "node_modules/tsx/dist/cli.mjs"),
    ["watch", "src/server.ts"],
    {
    ...process.env,
    PORT: String(apiPort),
    FRONTEND_URL: webOrigin,
    TMPDIR: WSL_SAFE_TMP_DIR,
    TMP: WSL_SAFE_TMP_DIR,
    TEMP: WSL_SAFE_TMP_DIR,
    },
  );

  spawnApp(
    "web",
    path.join(rootDir, "apps/web"),
    path.join(rootDir, "node_modules/vite/bin/vite.js"),
    ["--host", "0.0.0.0", "--port", String(webPort)],
    {
      ...process.env,
      VITE_API_BASE_URL: apiOrigin,
    },
  );
}

main().catch((error) => {
  logError(error instanceof Error ? error.stack ?? error.message : String(error));
  shutdown(1);
});

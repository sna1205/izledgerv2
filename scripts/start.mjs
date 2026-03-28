import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import {
  applyLocalApiMigrations,
  ensureLocalDevEnvFiles,
  getApiLocalProcessEnv,
  getWebLocalProcessEnv,
  loadLocalDevConfig,
  preferredNodePath,
  rootDir,
} from "./local-dev-config.mjs";

const API_READY_TIMEOUT_MS = 30_000;
const API_READY_POLL_MS = 500;
const API_LIVENESS_PATH = "/live";

const runningChildren = [];

function log(message) {
  process.stdout.write(`[start] ${message}\n`);
}

function logError(message) {
  process.stderr.write(`[start] ${message}\n`);
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

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve({
          statusCode: response.statusCode ?? 0,
          body,
        });
      });
    });

    request.on("error", reject);
    request.setTimeout(5_000, () => {
      request.destroy(new Error(`Timed out waiting for ${url}`));
    });
  });
}

function getApiLivenessUrls(apiOrigin) {
  const urls = [];

  try {
    const parsed = new URL(apiOrigin);
    const addUrl = (hostname) => {
      const nextUrl = new URL(parsed);
      nextUrl.hostname = hostname;
      urls.push(`${nextUrl.origin}${API_LIVENESS_PATH}`);
    };

    addUrl(parsed.hostname);

    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(parsed.hostname)) {
      addUrl("127.0.0.1");
      addUrl("localhost");
    }
  } catch {
    urls.push(`${apiOrigin}${API_LIVENESS_PATH}`);
  }

  return [...new Set(urls)];
}

async function waitForApiBoot(apiOrigin) {
  const livenessUrls = getApiLivenessUrls(apiOrigin);
  const deadline = Date.now() + API_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    for (const livenessUrl of livenessUrls) {
      try {
        const response = await requestJson(livenessUrl);

        if (response.statusCode === 200) {
          return livenessUrl;
        }
      } catch {
        // Keep polling until the timeout is reached.
      }
    }

    await delay(API_READY_POLL_MS);
  }

  throw new Error(`API liveness checks at ${livenessUrls.join(", ")} did not succeed within ${API_READY_TIMEOUT_MS}ms.`);
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
  await ensureLocalDevEnvFiles(log);
  const config = await loadLocalDevConfig();
  const apiOrigin = config.api.origin;
  const webOrigin = config.web.origin;
  const webPort = config.web.port;

  log(`starting built API at ${apiOrigin}`);
  log(`starting built web preview at ${webOrigin}`);
  log(`local env sources: ${path.relative(rootDir, config.paths.apiEnvLocalPath)} and ${path.relative(rootDir, config.paths.webEnvLocalPath)}`);
  log("applying local Prisma migrations before starting built API");
  await applyLocalApiMigrations(log, logError);

  spawnApp(
    "api",
    path.join(rootDir, "apps/api"),
    path.join(rootDir, "apps/api/dist/server.js"),
    [],
    getApiLocalProcessEnv(),
  );

  log("waiting for API liveness check before starting web preview");
  const readyUrl = await waitForApiBoot(apiOrigin);

  if (readyUrl !== `${apiOrigin}${API_LIVENESS_PATH}`) {
    log(`API became ready via ${readyUrl}`);
  }

  spawnApp(
    "web",
    path.join(rootDir, "apps/web"),
    path.join(rootDir, "node_modules/vite/bin/vite.js"),
    ["preview", "--host", "0.0.0.0", "--port", String(webPort), "--strictPort"],
    getWebLocalProcessEnv(),
  );
}

main().catch((error) => {
  logError(error instanceof Error ? error.stack ?? error.message : String(error));
  shutdown(1);
});

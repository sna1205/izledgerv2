import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const composeArgs = ["compose", "-f", "docker-compose.test.yml"];
const integrationDatabaseUrl =
  process.env.TEST_DATABASE_URL
  ?? process.env.INTEGRATION_DATABASE_URL
  ?? "postgresql://postgres:postgres@127.0.0.1:5433/izledger_test";
const npmExecPath = process.env.npm_execpath;

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: apiRoot,
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
}

function runPrisma(args, options = {}) {
  if (npmExecPath) {
    return run(process.execPath, [npmExecPath, "exec", "--", "prisma", ...args], options);
  }

  return run("npx", ["prisma", ...args], options);
}

function outputText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createPrismaWorkspace(databaseUrl) {
  const workspaceRoot = fs.mkdtempSync(path.join(apiRoot, ".prisma-test-workspace-"));
  const workspacePrismaDir = path.join(workspaceRoot, "prisma");
  fs.cpSync(path.join(apiRoot, "prisma"), workspacePrismaDir, { recursive: true });
  fs.writeFileSync(
    path.join(workspaceRoot, ".env"),
    [
      `DATABASE_URL=${databaseUrl}`,
      `DIRECT_URL=${databaseUrl}`,
      "",
    ].join("\n"),
    "utf8",
  );
  return workspaceRoot;
}

function cleanupWorkspace(workspaceRoot) {
  try {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: could not remove temporary Prisma workspace at ${workspaceRoot}: ${message}`);
  }
}

function runOrFail(command, args, options = {}) {
  const result = run(command, args, options);

  if (result.status !== 0) {
    const processError = result.error instanceof Error ? result.error.message : "";
    const details = [processError, outputText(result.stdout), outputText(result.stderr)].filter(Boolean).join("\n");
    console.error(details || `Command failed: ${command} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }

  return result;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForPostgres() {
  for (let attempt = 1; attempt <= 45; attempt += 1) {
    const result = run("docker", [
      ...composeArgs,
      "exec",
      "-T",
      "postgres",
      "pg_isready",
      "-U",
      "postgres",
      "-d",
      "izledger_test",
    ]);

    if (result.status === 0) {
      return;
    }

    await sleep(1000);
  }

  console.error("Timed out waiting for the integration PostgreSQL container to become ready.");
  process.exit(1);
}

runOrFail("docker", [...composeArgs, "down", "-v", "--remove-orphans"]);
runOrFail("docker", [...composeArgs, "up", "-d", "postgres"]);
await waitForPostgres();

const prismaWorkspace = createPrismaWorkspace(integrationDatabaseUrl);

try {
  const result = runPrisma(
    ["migrate", "deploy", "--schema", "prisma/schema.prisma"],
    {
      cwd: prismaWorkspace,
      env: {
        ...process.env,
        DATABASE_URL: integrationDatabaseUrl,
        DIRECT_URL: integrationDatabaseUrl,
      },
    },
  );

  if (result.status !== 0) {
    const processError = result.error instanceof Error ? result.error.message : "";
    const details = [processError, outputText(result.stdout), outputText(result.stderr)].filter(Boolean).join("\n");
    console.error(details || "Command failed: prisma migrate deploy --schema prisma/schema.prisma");
    process.exit(result.status ?? 1);
  }
} finally {
  cleanupWorkspace(prismaWorkspace);
}

process.stdout.write(
  [
    "Prepared a clean integration PostgreSQL database.",
    `DATABASE_URL=${integrationDatabaseUrl}`,
  ].join("\n"),
);
process.stdout.write("\n");

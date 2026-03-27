function parseConnectionUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    return ["postgres:", "postgresql:"].includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

function hasRequiredSsl(url) {
  return url?.searchParams?.get("sslmode") === "require";
}

function isNeonHost(url) {
  return Boolean(url?.hostname?.endsWith(".neon.tech"));
}

function isNeonPooler(url) {
  return isNeonHost(url) && url.hostname.includes("-pooler.");
}

const databaseUrl = parseConnectionUrl(process.env.DATABASE_URL);
const directUrl = parseConnectionUrl(process.env.DIRECT_URL);

if (!databaseUrl) {
  console.error(
    [
      "Invalid Render database configuration:",
      "- DATABASE_URL is missing or is not a valid PostgreSQL connection string.",
    ].join("\n"),
  );

  process.exit(1);
}

if (!hasRequiredSsl(databaseUrl)) {
  console.error(
    [
      "Invalid Render database configuration:",
      "- DATABASE_URL must include sslmode=require for Neon/Postgres over Render.",
    ].join("\n"),
  );

  process.exit(1);
}

if (process.env.DIRECT_URL && !directUrl) {
  console.error(
    [
      "Invalid Render database configuration:",
      "- DIRECT_URL is set but is not a valid PostgreSQL connection string.",
    ].join("\n"),
  );

  process.exit(1);
}

if (directUrl && !hasRequiredSsl(directUrl)) {
  console.error(
    [
      "Invalid Render database configuration:",
      "- DIRECT_URL must include sslmode=require when it is set.",
    ].join("\n"),
  );

  process.exit(1);
}

if (isNeonHost(databaseUrl) && !isNeonPooler(databaseUrl)) {
  console.warn(
    [
      "Render database warning:",
      "- DATABASE_URL is using a direct Neon host.",
      "- For this long-running backend service, prefer the pooled Neon connection string in DATABASE_URL.",
      "- Keep the direct Neon URL in DIRECT_URL for prisma migrate deploy when needed.",
    ].join("\n"),
  );
}

if (directUrl && isNeonPooler(directUrl)) {
  console.warn(
    [
      "Render database warning:",
      "- DIRECT_URL is using a pooled Neon host.",
      "- Prisma migrations usually work best with the direct Neon connection string in DIRECT_URL.",
    ].join("\n"),
  );
}

if (isNeonPooler(databaseUrl) && !process.env.DIRECT_URL) {
  console.warn(
    [
      "Render database warning:",
      "- DATABASE_URL is using the Neon pooler and DIRECT_URL is not set.",
      "- Prisma will fall back to DATABASE_URL for prisma migrate deploy.",
      "- If deploys hang on prisma migrate deploy, set DIRECT_URL to the direct Neon Postgres connection string.",
    ].join("\n"),
  );
}

process.stdout.write(
  [
    "Render database configuration looks valid.",
    "- DATABASE_URL is present and uses a PostgreSQL connection string",
    `- DATABASE_URL sslmode=require is ${hasRequiredSsl(databaseUrl) ? "set" : "missing"}`,
    directUrl
      ? "- DIRECT_URL is present and uses a PostgreSQL connection string"
      : "- DIRECT_URL is not set; prisma migrate deploy will use DATABASE_URL",
  ].join("\n"),
);
process.stdout.write("\n");

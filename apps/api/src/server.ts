import { buildApp } from "./app.js";
import { env, envWarnings } from "./config/env.js";

const app = await buildApp();

try {
  for (const warning of envWarnings) {
    app.log.warn({ warning }, "Environment warning.");
  }

  await app.listen({
    port: env.PORT,
    host: env.HOST,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

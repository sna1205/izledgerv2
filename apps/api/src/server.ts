import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { ensureFounderAccount } from "./modules/founder/bootstrap.js";

const app = await buildApp();

try {
  await ensureFounderAccount({
    enabled: env.FOUNDER_BOOTSTRAP_ENABLED,
    password: env.FOUNDER_BOOTSTRAP_PASSWORD,
    logger: {
      info: (message) => app.log.info(message),
    },
  });

  await app.listen({
    port: env.PORT,
    host: env.HOST,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = await buildApp();

try {
  await app.listen({
    port: env.PORT,
    host: env.HOST,
  });

  app.log.info({
    provider: env.ECONOMIC_CALENDAR_PROVIDER,
    tradingEconomicsConfigured: Boolean(env.ECONOMIC_CALENDAR_TRADING_ECONOMICS_API_KEY),
  }, "Economic calendar provider initialized.");
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

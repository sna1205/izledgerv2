import { env } from "../config/env.js";
import { ensureFounderAccount } from "../modules/founder/bootstrap.js";

await ensureFounderAccount({
  enabled: true,
  password: env.FOUNDER_BOOTSTRAP_PASSWORD,
  logger: console,
});

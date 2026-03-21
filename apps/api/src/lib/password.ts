import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

const INVALID_PASSWORD_SENTINEL_HASH = "$2a$12$V3PrDKg6EbS1QrGHpHgfJumj/aguDX1E6jWZ2HDYFOCxhCacKOIhK";

export function hashPassword(password: string) {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function consumePasswordVerificationTime(password: string) {
  return bcrypt.compare(password, INVALID_PASSWORD_SENTINEL_HASH);
}

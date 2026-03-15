import { Decimal } from "@prisma/client/runtime/library";

export function toNumber(value: Decimal | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return value instanceof Decimal ? value.toNumber() : value;
}

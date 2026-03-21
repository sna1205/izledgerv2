import type { AuthUser } from "@/lib/types";

export const FOUNDER_USERNAME = "VEASNA";

export function isFounderUser(user: Pick<AuthUser, "username"> | null | undefined) {
  return user?.username?.trim().toUpperCase() === FOUNDER_USERNAME;
}

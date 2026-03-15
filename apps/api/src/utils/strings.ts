export function normalizeUsername(username: string) {
  return username.trim();
}

export function safeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

export function assertNever(_: never, message = "Unexpected value") {
  throw new Error(message);
}

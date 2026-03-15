export function sessionToDb(value: string | null | undefined) {
  if (!value) return null;
  return value === "New York" ? "New_York" : value;
}

export function sessionFromDb(value: string | null | undefined) {
  if (!value) return null;
  return value === "New_York" ? "New York" : value;
}

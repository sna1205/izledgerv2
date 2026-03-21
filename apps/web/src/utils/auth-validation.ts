export const AUTH_USERNAME_MIN_LENGTH = 3;
export const AUTH_USERNAME_MAX_LENGTH = 32;
export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_PASSWORD_MAX_LENGTH = 128;

export function validateAuthCredentials(username: string, password: string) {
  const normalizedUsername = username.trim();

  if (!normalizedUsername) {
    return "Username is required.";
  }

  if (normalizedUsername.length < AUTH_USERNAME_MIN_LENGTH) {
    return `Username must be at least ${AUTH_USERNAME_MIN_LENGTH} characters.`;
  }

  if (normalizedUsername.length > AUTH_USERNAME_MAX_LENGTH) {
    return `Username must be ${AUTH_USERNAME_MAX_LENGTH} characters or fewer.`;
  }

  if (!password.trim()) {
    return "Password is required.";
  }

  if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${AUTH_PASSWORD_MIN_LENGTH} characters.`;
  }

  if (password.length > AUTH_PASSWORD_MAX_LENGTH) {
    return `Password must be ${AUTH_PASSWORD_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

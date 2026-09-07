import { AuthError } from "./errors";

export { hashPassword, verifyPassword } from "./password-crypto.mjs";

export function readPassword(value: unknown) {
  if (typeof value !== "string" || !value.length || value.length > 128) {
    throw new AuthError("Enter a password of at most 128 characters.");
  }
  return value;
}

export function readNewPassword(value: unknown, confirmation: unknown) {
  const password = readPassword(value);
  if (password.length < 8) throw new AuthError("Use at least 8 characters for your password.");
  if (password !== confirmation) throw new AuthError("The new passwords do not match.");
  return password;
}

export function readUsername(value: unknown) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_.-]{3,32}$/.test(value.trim())) {
    throw new AuthError("Use 3–32 letters, numbers, dots, underscores or hyphens for your username.");
  }
  return value.trim();
}

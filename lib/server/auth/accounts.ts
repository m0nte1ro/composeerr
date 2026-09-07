import { db } from "../db";
import { AuthError } from "./errors";
import { hashPassword, verifyPassword } from "./passwords";
import { createSession } from "./sessions";
import { findUser } from "./store";

export async function authenticate(username: string, password: string) {
  const user = findUser(username);
  // Spend the same hashing work for unknown usernames.
  const fallback = "scrypt:32768:8:3:" + "0".repeat(32) + ":" + "0".repeat(128);
  const valid = await verifyPassword(password, user?.password_hash ?? fallback);
  if (!user || !valid) throw new AuthError("Invalid username or password.", 401);
  return createSession(user.id, user.password_hash);
}

export async function changePassword(username: string, currentPassword: string, nextPassword: string) {
  const user = findUser(username);
  if (!user || !await verifyPassword(currentPassword, user.password_hash)) {
    throw new AuthError("Your current password is incorrect.");
  }
  if (currentPassword === nextPassword) throw new AuthError("Choose a different new password.");
  const nextHash = await hashPassword(nextPassword);
  return db.transaction(() => {
    const updated = db.prepare(`UPDATE auth_users SET password_hash = ?, must_change_password = 0
      WHERE id = ? AND password_hash = ?`).run(nextHash, user.id, user.password_hash);
    if (!updated.changes) throw new AuthError("Your credentials changed. Please sign in again.", 401);
    db.prepare("DELETE FROM auth_sessions WHERE user_id = ?").run(user.id);
    return createSession(user.id, nextHash);
  }).immediate();
}

import { createHash, randomBytes } from "node:crypto";
import { db } from "../db";
import { AuthError } from "./errors";
import { hashPassword, readNewPassword, readUsername } from "./passwords";
import { findUser, publicUser, type UserRecord } from "./store";
export function listUsers() {
  return (
    db
      .prepare("SELECT * FROM auth_users ORDER BY username COLLATE NOCASE")
      .all() as UserRecord[]
  ).map(publicUser);
}
export async function createUser(body: Record<string, unknown>) {
  const username = readUsername(body.username);
  const password = readNewPassword(body.password, body.confirmPassword);
  if (body.role !== "admin" && body.role !== "user")
    throw new AuthError("Choose a valid role.");
  const hash = await hashPassword(password);
  return db
    .transaction(() => {
      if (findUser(username))
        throw new AuthError("That username is already taken.", 409);
      db.prepare(
        "INSERT INTO auth_users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, 1)",
      ).run(username, hash, body.role as string);
      return listUsers();
    })
    .immediate();
}
function findTarget(id: unknown) {
  if (!Number.isSafeInteger(id) || Number(id) <= 0)
    throw new AuthError("Choose a valid user.");
  const user = db
    .prepare("SELECT * FROM auth_users WHERE id = ?")
    .get(Number(id)) as UserRecord | undefined;
  if (!user) throw new AuthError("User not found.", 404);
  return user;
}
export function deleteUser(id: unknown, actorId: number) {
  return db
    .transaction(() => {
      const user = findTarget(id);
      if (user.id === actorId)
        throw new AuthError("You cannot delete your own account.");
      if (
        user.role === "admin" &&
        (
          db
            .prepare(
              "SELECT COUNT(*) AS count FROM auth_users WHERE role = 'admin'",
            )
            .get() as { count: number }
        ).count <= 1
      )
        throw new AuthError("The last administrator cannot be deleted.");
      db.prepare("DELETE FROM auth_users WHERE id = ?").run(user.id);
      return listUsers();
    })
    .immediate();
}
export async function resetUserPassword(id: unknown, actorId: number) {
  const user = findTarget(id);
  if (user.id === actorId)
    throw new AuthError("Use the password change form for your own account.");
  const temporaryPassword = randomBytes(18).toString("base64url");
  const hash = await hashPassword(temporaryPassword);
  db.transaction(() => {
    const updated = db
      .prepare(
        "UPDATE auth_users SET password_hash = ?, must_change_password = 1 WHERE id = ? AND password_hash = ?",
      )
      .run(hash, user.id, user.password_hash);
    if (!updated.changes)
      throw new AuthError("The account changed. Try again.", 409);
    db.prepare("DELETE FROM auth_sessions WHERE user_id = ?").run(user.id);
    const bucket = (value: string) =>
      createHash("sha256").update(value).digest("hex");
    db.prepare("DELETE FROM auth_rate_limits WHERE bucket IN (?, ?)").run(
      bucket("login:" + user.username.toLowerCase()),
      bucket("password:" + user.id),
    );
  }).immediate();
  return { temporaryPassword, users: listUsers() };
}

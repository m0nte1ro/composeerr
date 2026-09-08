import type { AuthUser } from "@/lib/auth/types";
import { db } from "../db";
import { AuthError } from "./errors";

export type UserRecord = {
  id: number;
  username: string;
  role: AuthUser["role"];
  password_hash: string;
  must_change_password: number;
};

export function publicUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: Boolean(user.must_change_password),
  };
}

export function findUser(username: string) {
  return db.prepare("SELECT * FROM auth_users WHERE username = ? COLLATE NOCASE")
    .get(username) as UserRecord | undefined;
}

export function registrationsEnabled() {
  const setting = db.prepare("SELECT value FROM app_settings WHERE key = 'auth.registration_enabled'")
    .get() as { value: string } | undefined;
  // A fresh instance is private until its owner explicitly opens registration.
  const complete = db.prepare("SELECT value FROM app_settings WHERE key = 'setup.complete'").get() as { value: string } | undefined;
  return complete?.value === "true" && setting?.value === "true";
}

export function setRegistrationsEnabled(enabled: boolean) {
  db.prepare(`INSERT INTO app_settings (key, value) VALUES ('auth.registration_enabled', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`)
    .run(String(enabled));
}

export function insertRegisteredUser(username: string, passwordHash: string) {
  return db.transaction(() => {
    // Recheck after password hashing, inside the same transaction as the insert.
    if (!registrationsEnabled()) throw new AuthError("Registration is currently closed.", 403);
    if (findUser(username)) throw new AuthError("That username is already taken.", 409);
    const result = db.prepare("INSERT INTO auth_users (username, password_hash) VALUES (?, ?)")
      .run(username, passwordHash);
    return db.prepare("SELECT * FROM auth_users WHERE id = ?").get(result.lastInsertRowid) as UserRecord;
  }).immediate();
}

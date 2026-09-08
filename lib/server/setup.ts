import { db } from "./db";
import { AuthError } from "./auth/errors";
import { hashPassword } from "./auth/passwords";
import { createSession } from "./auth/sessions";

export function getSetupState() {
  const read = (key: string) =>
    (
      db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as
        { value: string } | undefined
    )?.value;
  return {
    complete: read("setup.complete") === "true",
    hasAdmin: Boolean(db.prepare("SELECT 1 FROM auth_users LIMIT 1").get()),
    step: Math.min(5, Math.max(1, Number(read("setup.step")) || 1)),
  };
}

export async function createSetupAdmin(username: string, password: string) {
  if (getSetupState().hasAdmin || getSetupState().complete)
    throw new AuthError("Setup administrator already exists.", 409);
  const hash = await hashPassword(password);
  return db
    .transaction(() => {
      if (getSetupState().hasAdmin || getSetupState().complete)
        throw new AuthError("Setup administrator already exists.", 409);
      const result = db
        .prepare(
          "INSERT INTO auth_users (username, password_hash, role) VALUES (?, ?, 'admin')",
        )
        .run(username, hash);
      return createSession(Number(result.lastInsertRowid), hash);
    })
    .immediate();
}

export function updateSetup(step: unknown, complete: unknown) {
  if (getSetupState().complete)
    throw new AuthError("Setup is already complete.", 409);
  if (
    !Number.isInteger(step) ||
    Number(step) < 1 ||
    Number(step) > 5 ||
    typeof complete !== "boolean"
  )
    throw new AuthError("Invalid setup progress.");
  db.transaction(() => {
    db.prepare(
      "INSERT INTO app_settings (key, value) VALUES ('setup.step', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run(String(step));
    if (complete)
      db.prepare(
        "INSERT INTO app_settings (key, value) VALUES ('setup.complete', 'true') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      ).run();
  }).immediate();
  return getSetupState();
}

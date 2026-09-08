import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import nextEnv from "@next/env";
import { hashPassword } from "../lib/server/auth/password-crypto.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
    console.log("Usage: node scripts/reset-password.mjs <username>");
    console.log("Generates a temporary password and revokes that account's sessions.");
    return;
  }
  if (args.length !== 1 || !/^[a-zA-Z0-9_.-]{3,32}$/.test(args[0])) {
    throw new Error("Usage: node scripts/reset-password.mjs <username>");
  }

  nextEnv.loadEnvConfig(root, process.env.NODE_ENV !== "production", { info() {}, error() {} });
  const databasePath = path.resolve(root, process.env.COMPOSEERR_DATA_DIR ?? "data", "composeerr.db");
  let db;
  try {
    db = new Database(databasePath, { fileMustExist: true, timeout: 5000 });
  } catch {
    throw new Error("Cannot open the existing Composeerr database. Run this inside the instance container and check COMPOSEERR_DATA_DIR.");
  }

  try {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'auth_users'").get()) {
      throw new Error("Accounts have not been initialized. Open Composeerr and create the administrator in initial setup first.");
    }
    const user = db.prepare("SELECT id, username FROM auth_users WHERE username = ? COLLATE NOCASE").get(args[0]);
    if (!user) throw new Error("Account not found. Check the username and which instance you are running this command in.");
    const temporaryPassword = randomBytes(18).toString("base64url");
    const passwordHash = await hashPassword(temporaryPassword);
    const bucketHash = (bucket) => createHash("sha256").update(bucket).digest("hex");

    db.transaction(() => {
      const result = db.prepare("UPDATE auth_users SET password_hash = ?, must_change_password = 1 WHERE id = ? AND username = ?")
        .run(passwordHash, user.id, user.username);
      if (result.changes !== 1) throw new Error("The account changed. Run the command again.");
      db.prepare("DELETE FROM auth_sessions WHERE user_id = ?").run(user.id);
      db.prepare("DELETE FROM auth_rate_limits WHERE bucket IN (?, ?)")
        .run(bucketHash("login:" + user.username.toLowerCase()), bucketHash("password:" + user.id));
    }).immediate();

    console.log("Password reset for " + user.username + ".");
    console.log("Temporary password: " + temporaryPassword);
    console.log("Sign in and choose a new password in Settings > General.");
    console.log("Existing sessions were revoked. Instance settings are unchanged.");
  } finally {
    db.close();
  }
}

main().catch((error) => {
  // Database errors can contain internal details; only show our actionable messages.
  console.error(error.code ? "Could not reset the password. Check database permissions and try again." : error.message);
  process.exitCode = 1;
});

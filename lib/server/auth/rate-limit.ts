import { createHash } from "node:crypto";
import { db } from "../db";
import { AuthError } from "./errors";

export function consumeLimit(bucket: string, maximum: number, windowMs: number) {
  const now = Date.now();
  const key = createHash("sha256").update(bucket).digest("hex");
  const allowed = db.transaction(() => {
    db.prepare("DELETE FROM auth_rate_limits WHERE resets_at <= ?").run(now);
    const row = db.prepare("SELECT attempts FROM auth_rate_limits WHERE bucket = ?")
      .get(key) as { attempts: number } | undefined;
    if (row && row.attempts >= maximum) return false;
    db.prepare(`INSERT INTO auth_rate_limits (bucket, attempts, resets_at) VALUES (?, 1, ?)
      ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1`).run(key, now + windowMs);
    return true;
  }).immediate();
  if (!allowed) throw new AuthError("Too many attempts. Please try again later.", 429);
}

export function limitSignIn(username: string) {
  // These limits cannot be bypassed by forged IP forwarding headers.
  consumeLimit("login:instance", 100, 60_000);
  consumeLimit("login:" + username.toLowerCase(), 10, 5 * 60_000);
}

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "../db";
import { AuthError } from "./errors";
import { publicUser, type UserRecord } from "./store";

export const SESSION_COOKIE = "composeerr_session";
const SESSION_SECONDS = 30 * 24 * 60 * 60;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function currentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const hash = tokenHash(token);
  const row = db.prepare(`SELECT u.* FROM auth_sessions s
    JOIN auth_users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`)
    .get(hash, Date.now()) as UserRecord | undefined;
  return row ? { user: publicUser(row), tokenHash: hash } : null;
}

export async function currentUser() {
  return (await currentSession())?.user ?? null;
}

export function createSession(userId: number, expectedPasswordHash: string) {
  return db.transaction(() => {
    // Do not let an in-flight login restore a session after a password change.
    const user = db.prepare("SELECT * FROM auth_users WHERE id = ? AND password_hash = ?")
      .get(userId, expectedPasswordHash) as UserRecord | undefined;
    if (!user) throw new AuthError("Your credentials changed. Please sign in again.", 401);
    const token = randomBytes(32).toString("hex");
    db.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").run(Date.now());
    db.prepare("INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
      .run(tokenHash(token), user.id, Date.now() + SESSION_SECONDS * 1000);
    return { token, user: publicUser(user) };
  }).immediate();
}

export function revokeSession(hash: string) {
  db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").run(hash);
}

function cookieOptions(request: Request) {
  const configuredOrigin = process.env.COMPOSEERR_ORIGIN;
  const secure = configuredOrigin
    ? new URL(configuredOrigin).protocol === "https:"
    : new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  return { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
}

export function sessionResponse(request: Request, session: ReturnType<typeof createSession>) {
  const response = NextResponse.json({ ok: true, user: session.user });
  response.cookies.set(SESSION_COOKIE, session.token, { ...cookieOptions(request), maxAge: SESSION_SECONDS });
  return response;
}

export function logoutResponse(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(request), maxAge: 0 });
  return response;
}

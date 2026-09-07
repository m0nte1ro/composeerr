import { AuthError } from "@/lib/server/auth/errors";
import { readAuthBody, withPublicAuth } from "@/lib/server/auth/http";
import { hashPassword, readNewPassword, readUsername } from "@/lib/server/auth/passwords";
import { consumeLimit } from "@/lib/server/auth/rate-limit";
import { createSession, sessionResponse } from "@/lib/server/auth/sessions";
import { ensureAdmin, insertRegisteredUser, registrationsEnabled } from "@/lib/server/auth/store";

export const runtime = "nodejs";

export const POST = withPublicAuth(async (request) => {
  consumeLimit("registration:instance", 10, 5 * 60_000);
  await ensureAdmin();
  if (!registrationsEnabled()) throw new AuthError("Registration is currently closed.", 403);
  const body = await readAuthBody(request);
  const username = readUsername(body.username);
  const password = readNewPassword(body.password, body.confirmPassword);
  const user = insertRegisteredUser(username, await hashPassword(password));
  return sessionResponse(request, createSession(user.id, user.password_hash));
});

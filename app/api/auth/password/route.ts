import { changePassword } from "@/lib/server/auth/accounts";
import { readAuthBody, withAuth } from "@/lib/server/auth/http";
import { readNewPassword, readPassword } from "@/lib/server/auth/passwords";
import { consumeLimit } from "@/lib/server/auth/rate-limit";
import { sessionResponse } from "@/lib/server/auth/sessions";

export const runtime = "nodejs";

export const PUT = withAuth(async (request, user) => {
  consumeLimit("password:" + user.id, 10, 5 * 60_000);
  const body = await readAuthBody(request);
  const current = readPassword(body.currentPassword);
  const next = readNewPassword(body.newPassword, body.confirmPassword);
  return sessionResponse(request, await changePassword(user.username, current, next));
}, { allowPasswordChange: true });

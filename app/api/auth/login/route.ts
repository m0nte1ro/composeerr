import { authenticate } from "@/lib/server/auth/accounts";
import { readAuthBody, withPublicAuth } from "@/lib/server/auth/http";
import { readPassword, readUsername } from "@/lib/server/auth/passwords";
import { limitSignIn } from "@/lib/server/auth/rate-limit";
import { sessionResponse } from "@/lib/server/auth/sessions";

export const runtime = "nodejs";

export const POST = withPublicAuth(async (request) => {
  const body = await readAuthBody(request);
  const username = readUsername(body.username);
  const password = readPassword(body.password);
  limitSignIn(username);
  return sessionResponse(request, await authenticate(username, password));
});

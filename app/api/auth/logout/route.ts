import { withPublicAuth } from "@/lib/server/auth/http";
import { currentSession, logoutResponse, revokeSession } from "@/lib/server/auth/sessions";

export const runtime = "nodejs";

export const POST = withPublicAuth(async (request) => {
  const session = await currentSession();
  if (session) revokeSession(session.tokenHash);
  return logoutResponse(request);
});

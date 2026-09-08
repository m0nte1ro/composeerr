import { readAuthBody, withPublicAuth } from "@/lib/server/auth/http";
import { readNewPassword, readUsername } from "@/lib/server/auth/passwords";
import { consumeLimit } from "@/lib/server/auth/rate-limit";
import { sessionResponse } from "@/lib/server/auth/sessions";
import { createSetupAdmin } from "@/lib/server/setup";

export const POST = withPublicAuth(async (request) => {
  consumeLimit("setup:instance", 10, 5 * 60_000);
  const body = await readAuthBody(request);
  return sessionResponse(
    request,
    await createSetupAdmin(
      readUsername(body.username),
      readNewPassword(body.password, body.confirmPassword),
    ),
  );
});

import { NextResponse } from "next/server";
import { readAuthBody, withAuth } from "@/lib/server/auth/http";
import { getSetupState, updateSetup } from "@/lib/server/setup";
export const GET = withAuth(
  async () => NextResponse.json({ ok: true, setup: getSetupState() }),
  { admin: true },
);
export const PUT = withAuth(
  async (request) => {
    const body = await readAuthBody(request);
    return NextResponse.json({
      ok: true,
      setup: updateSetup(body.step, body.complete),
    });
  },
  { admin: true },
);

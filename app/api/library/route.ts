import { withAuth } from "@/lib/server/auth/http";
import { NextResponse } from "next/server";

import { resolveLibraryAvailability } from "@/lib/server/providers/library-resolver";

export const runtime = "nodejs";

export const GET = withAuth(async function GET() {
  return NextResponse.json({
    ok: true,
    library: await resolveLibraryAvailability(),
  });
});
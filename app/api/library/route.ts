import { NextResponse } from "next/server";

import { resolveLibraryAvailability } from "@/lib/server/providers/library-resolver";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    library: await resolveLibraryAvailability(),
  });
}
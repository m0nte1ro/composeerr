import { NextResponse } from "next/server";
import { withAuth } from "@/lib/server/auth/http";

export const runtime = "nodejs";

export const GET = withAuth(async (_request, user) => {
  return NextResponse.json({ ok: true, user });
}, { allowPasswordChange: true });

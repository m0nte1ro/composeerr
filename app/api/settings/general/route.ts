import { NextResponse } from "next/server";
import { AuthError } from "@/lib/server/auth/errors";
import { readAuthBody, withAuth } from "@/lib/server/auth/http";
import { registrationsEnabled, setRegistrationsEnabled } from "@/lib/server/auth/store";

export const runtime = "nodejs";

export const GET = withAuth(async () => {
  return NextResponse.json({ ok: true, registrationEnabled: registrationsEnabled() });
}, { admin: true, allowPasswordChange: true });

export const PUT = withAuth(async (request) => {
  const body = await readAuthBody(request);
  if (typeof body.registrationEnabled !== "boolean") {
    throw new AuthError("Choose whether registration is enabled.");
  }
  setRegistrationsEnabled(body.registrationEnabled);
  return NextResponse.json({ ok: true, registrationEnabled: registrationsEnabled() });
}, { admin: true });

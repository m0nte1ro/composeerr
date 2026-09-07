import { withAuth } from "@/lib/server/auth/http";
import { NextResponse } from "next/server";

import type { LibraryProviderPayload } from "@/lib/providers/types";
import {
  addLibraryProvider,
  getLibraryProvidersSettings,
  LibraryProviderSettingsError,
  removeLibraryProvider,
  updateLibraryProvider,
} from "@/lib/server/providers/library-settings";

export const runtime = "nodejs";

async function readBody(request: Request) {
  try {
    return (await request.json()) as LibraryProviderPayload;
  } catch {
    throw new LibraryProviderSettingsError("Invalid request body.");
  }
}

function handleError(error: unknown) {
  if (error instanceof LibraryProviderSettingsError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  console.error("Library provider settings operation failed.");
  return NextResponse.json(
    { ok: false, error: "Could not update Library provider settings." },
    { status: 500 },
  );
}

export const GET = withAuth(async function GET() {
  return NextResponse.json({ ok: true, settings: getLibraryProvidersSettings() });
}, { admin: true });

export const POST = withAuth(async function POST(request: Request) {
  try {
    return NextResponse.json({
      ok: true,
      settings: addLibraryProvider(await readBody(request)),
    });
  } catch (error) {
    return handleError(error);
  }
}, { admin: true });

export const PUT = withAuth(async function PUT(request: Request) {
  try {
    return NextResponse.json({
      ok: true,
      settings: updateLibraryProvider(await readBody(request)),
    });
  } catch (error) {
    return handleError(error);
  }
}, { admin: true });

export const DELETE = withAuth(async function DELETE(request: Request) {
  try {
    const body = await readBody(request);
    return NextResponse.json({
      ok: true,
      settings: removeLibraryProvider(body.key),
    });
  } catch (error) {
    return handleError(error);
  }
}, { admin: true });
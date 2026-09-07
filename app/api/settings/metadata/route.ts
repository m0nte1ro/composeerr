import { withAuth } from "@/lib/server/auth/http";
import { NextResponse } from "next/server";

import type { MetadataProviderPayload } from "@/lib/providers/types";
import {
  addMetadataProvider,
  getMetadataProvidersSettings,
  MetadataProviderSettingsError,
  removeMetadataProvider,
  updateMetadataProvider,
} from "@/lib/server/providers/metadata-settings";

export const runtime = "nodejs";

async function readBody(request: Request) {
  try {
    return (await request.json()) as MetadataProviderPayload;
  } catch {
    throw new MetadataProviderSettingsError("Invalid request body.");
  }
}

function handleError(error: unknown) {
  if (error instanceof MetadataProviderSettingsError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  console.error("Metadata provider settings operation failed.");
  return NextResponse.json(
    { ok: false, error: "Could not update metadata provider settings." },
    { status: 500 },
  );
}

export const GET = withAuth(async function GET() {
  return NextResponse.json({ ok: true, settings: getMetadataProvidersSettings() });
}, { admin: true });

export const POST = withAuth(async function POST(request: Request) {
  try {
    return NextResponse.json({
      ok: true,
      settings: addMetadataProvider(await readBody(request)),
    });
  } catch (error) {
    return handleError(error);
  }
}, { admin: true });

export const PUT = withAuth(async function PUT(request: Request) {
  try {
    return NextResponse.json({
      ok: true,
      settings: updateMetadataProvider(await readBody(request)),
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
      settings: removeMetadataProvider(body.key),
    });
  } catch (error) {
    return handleError(error);
  }
}, { admin: true });

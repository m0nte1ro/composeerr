import { withAuth } from "@/lib/server/auth/http";
import { NextResponse } from "next/server";

import type { ArtworkProviderPayload } from "@/lib/providers/types";
import {
  ArtworkProviderSettingsError,
  testArtworkProviderPayload,
} from "@/lib/server/providers/artwork-settings";
import { ProviderConnectionError } from "@/lib/server/providers/http";

export const runtime = "nodejs";

export const POST = withAuth(async function POST(request: Request) {
  let body: ArtworkProviderPayload;

  try {
    body = (await request.json()) as ArtworkProviderPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    await testArtworkProviderPayload(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof ArtworkProviderSettingsError ||
      error instanceof ProviderConnectionError
    ) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error instanceof ProviderConnectionError ? 502 : 400 },
      );
    }

    console.error("Unexpected artwork provider connection test error.");
    return NextResponse.json(
      { ok: false, error: "Artwork provider connection test failed." },
      { status: 500 },
    );
  }
}, { admin: true });

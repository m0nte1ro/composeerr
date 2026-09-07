import { withAuth } from "@/lib/server/auth/http";
import { NextResponse } from "next/server";

import type { LibraryProviderPayload } from "@/lib/providers/types";
import { LidarrRequestError } from "@/lib/server/lidarr";
import { ProviderConnectionError } from "@/lib/server/providers/http";
import {
  LibraryProviderSettingsError,
  testLibraryProviderPayload,
} from "@/lib/server/providers/library-settings";

export const runtime = "nodejs";

export const POST = withAuth(async function POST(request: Request) {
  let body: LibraryProviderPayload;

  try {
    body = (await request.json()) as LibraryProviderPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    await testLibraryProviderPayload(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LibraryProviderSettingsError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }

    if (error instanceof ProviderConnectionError || error instanceof LidarrRequestError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 502 },
      );
    }

    console.error("Unexpected Library provider connection test error.");
    return NextResponse.json(
      { ok: false, error: "Library provider connection test failed." },
      { status: 500 },
    );
  }
}, { admin: true });
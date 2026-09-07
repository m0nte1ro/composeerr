import { withAuth } from "@/lib/server/auth/http";
import { NextResponse } from "next/server";

import type { MusicBrainzSettingsPayload } from "@/lib/content/musicbrainz-settings";
import {
  MusicBrainzSettingsError,
  testMusicBrainzConnection,
} from "@/lib/server/musicbrainz-settings";

export const runtime = "nodejs";

export const POST = withAuth(async function POST(request: Request) {
  let body: MusicBrainzSettingsPayload;

  try {
    body = (await request.json()) as MusicBrainzSettingsPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    await testMusicBrainzConnection(body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MusicBrainzSettingsError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }

    console.error("Unexpected MusicBrainz connection test error.");

    return NextResponse.json(
      { ok: false, error: "MusicBrainz connection test failed." },
      { status: 500 },
    );
  }
}, { admin: true });

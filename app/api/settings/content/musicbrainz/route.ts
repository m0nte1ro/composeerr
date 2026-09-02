import { NextResponse } from "next/server";

import type { MusicBrainzSettingsPayload } from "@/lib/content/musicbrainz-settings";
import {
  getPublicMusicBrainzSettings,
  MusicBrainzSettingsError,
  resetMusicBrainzSettings,
  saveMusicBrainzSettings,
} from "@/lib/server/musicbrainz-settings";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, settings: getPublicMusicBrainzSettings() });
}

export async function PUT(request: Request) {
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
    return NextResponse.json({ ok: true, settings: saveMusicBrainzSettings(body) });
  } catch (error) {
    if (error instanceof MusicBrainzSettingsError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    console.error("Could not save MusicBrainz settings.");
    return NextResponse.json(
      { ok: false, error: "Could not save MusicBrainz settings." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    return NextResponse.json({ ok: true, settings: resetMusicBrainzSettings() });
  } catch {
    console.error("Could not reset MusicBrainz settings.");
    return NextResponse.json(
      { ok: false, error: "Could not reset MusicBrainz settings." },
      { status: 500 },
    );
  }
}

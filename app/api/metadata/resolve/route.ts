import { withAuth } from "@/lib/server/auth/http";
import { NextResponse } from "next/server";

import type { DiscoverySearchResult } from "@/lib/metadata/types";
import { resolveDiscoveryIdentity } from "@/lib/server/metadata/discovery-resolution";

export const runtime = "nodejs";

const MUSICBRAINZ_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalString(value: unknown) {
  return value === null || typeof value === "string";
}

function isDiscoveryResult(value: unknown): value is DiscoverySearchResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  const validShared =
    (result.source === "lastfm" || result.source === "musicbrainz-public") &&
    typeof result.canonical === "boolean" &&
    optionalString(result.sourceId) &&
    optionalString(result.artworkUrl) &&
    (result.listeners === null || typeof result.listeners === "number") &&
    (result.musicBrainzId === null ||
      (typeof result.musicBrainzId === "string" &&
        MUSICBRAINZ_ID_PATTERN.test(result.musicBrainzId)));
  if (!validShared) return false;

  if (result.kind === "artist") {
    return typeof result.name === "string" && Boolean(result.name.trim());
  }

  return (
    (result.kind === "album" || result.kind === "song") &&
    typeof result.title === "string" &&
    Boolean(result.title.trim()) &&
    typeof result.artist === "string" &&
    Boolean(result.artist.trim())
  );
}

export const POST = withAuth(async function POST(request: Request) {
  let discovery: unknown;

  try {
    discovery = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid discovery result." },
      { status: 400 },
    );
  }

  if (!isDiscoveryResult(discovery)) {
    return NextResponse.json(
      { ok: false, error: "Invalid discovery result." },
      { status: 400 },
    );
  }

  try {
    const canonical = await resolveDiscoveryIdentity(discovery);
    if (!canonical) {
      return NextResponse.json(
        { ok: false, error: "Could not match this result to MusicBrainz." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, canonical });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not resolve this result right now." },
      { status: 502 },
    );
  }
});
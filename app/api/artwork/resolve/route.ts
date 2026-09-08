import { withAuth } from "@/lib/server/auth/http";
import { NextRequest, NextResponse } from "next/server";

import type {
  MetadataAlbumResult,
  MetadataArtistResult,
} from "@/lib/metadata/types";
import {
  resolveAlbumArtwork,
  resolveArtistArtwork,
  resolveArtistArtworkByName,
} from "@/lib/server/providers/artwork-resolver";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GET = withAuth(async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  const name = request.nextUrl.searchParams.get("name")?.trim() ?? "";

  if (type === "artist" && !id && name && name.length <= 300) {
    return NextResponse.json({ ok: true, artwork: await resolveArtistArtworkByName(name) });
  }

  if ((type !== "album" && type !== "artist") || !UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { ok: false, error: "A valid artwork entity is required." },
      { status: 400 },
    );
  }

  if (type === "artist") {
    const artist: MetadataArtistResult = {
      kind: "artist",
      id,
      name,
      disambiguation: null,
      type: null,
      country: null,
      area: null,
      beginYear: null,
      score: 0,
    };
    return NextResponse.json({ ok: true, artwork: await resolveArtistArtwork(artist) });
  }

  const album: MetadataAlbumResult = {
    kind: "album",
    id,
    title: request.nextUrl.searchParams.get("title")?.trim() ?? "",
    artist: request.nextUrl.searchParams.get("artist")?.trim() ?? "",
    artistId: request.nextUrl.searchParams.get("artistId")?.trim() || null,
    year: null,
    primaryType: null,
    secondaryTypes: [],
    disambiguation: null,
    score: 0,
  };
  return NextResponse.json({ ok: true, artwork: await resolveAlbumArtwork(album) });
});
import { NextRequest, NextResponse } from "next/server";

import type { MetadataSearchType } from "@/lib/metadata/types";

import { getMetadataProvider } from "@/lib/server/metadata";

export const runtime = "nodejs";

const VALID_TYPES =
  new Set<MetadataSearchType>([
    "song",
    "album",
    "artist",
  ]);

export async function GET(
  request: NextRequest,
) {
  const query =
    request.nextUrl.searchParams
      .get("q")
      ?.trim() ?? "";

  const type =
    request.nextUrl.searchParams
      .get("type") as
      | MetadataSearchType
      | null;

  if (!query) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Search query is required.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !type ||
    !VALID_TYPES.has(type)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Search type must be song, album or artist.",
      },
      {
        status: 400,
      },
    );
  }

  const provider =
    getMetadataProvider();

  try {
    let results;

    if (type === "artist") {
      results =
        await provider.searchArtists(
          query,
        );
    } else if (
      type === "album"
    ) {
      results =
        await provider.searchAlbums(
          query,
        );
    } else {
      results =
        await provider.searchSongs(
          query,
        );
    }

    return NextResponse.json({
      ok: true,

      provider: provider.id,

      type,
      query,

      results,
    });
  } catch (error) {
    console.error(
      "Metadata search failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          "Metadata search failed.",
      },
      {
        status: 502,
      },
    );
  }
}
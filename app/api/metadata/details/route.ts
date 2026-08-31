import {
  NextRequest,
  NextResponse,
} from "next/server";

import type {
  MetadataSearchType,
} from "@/lib/metadata/types";

import {
  getMetadataProvider,
} from "@/lib/server/metadata";

export const runtime =
  "nodejs";

const VALID_TYPES =
  new Set<MetadataSearchType>([
    "song",
    "album",
    "artist",
  ]);

export async function GET(
  request: NextRequest,
) {
  const id =
    request.nextUrl.searchParams
      .get("id")
      ?.trim() ?? "";

  const type =
    request.nextUrl.searchParams
      .get("type") as
      | MetadataSearchType
      | null;

  if (!id) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "MusicBrainz ID is required.",
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
          "Type must be song, album or artist.",
      },
      {
        status: 400,
      },
    );
  }

  const provider =
    getMetadataProvider();

  try {
    let details;

    if (type === "song") {
      details =
        await provider.getSong(id);
    } else if (
      type === "album"
    ) {
      details =
        await provider.getAlbum(id);
    } else {
      details =
        await provider.getArtist(id);
    }

    return NextResponse.json({
      ok: true,

      provider:
        provider.id,

      type,

      details,
    });
  } catch (error) {
    console.error(
      "Metadata details failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not load metadata details.",
      },
      {
        status: 502,
      },
    );
  }
}
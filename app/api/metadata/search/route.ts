import { withAuth } from "@/lib/server/auth/http";
import { NextRequest, NextResponse } from "next/server";

import type { MetadataSearchType } from "@/lib/metadata/types";

import { searchDiscovery } from "@/lib/server/metadata/discovery";

export const runtime = "nodejs";

const VALID_TYPES =
  new Set<MetadataSearchType>([
    "song",
    "album",
    "artist",
  ]);

export const GET = withAuth(async function GET(
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

  try {
    const discovery = await searchDiscovery(type, query);

    return NextResponse.json({
      ok: true,

      provider: discovery.provider,

      type,
      query,

      results: discovery.results,
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
});
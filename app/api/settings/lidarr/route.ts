import { NextResponse } from "next/server";

import {
  getLidarrOptions,
  getLidarrStatus,
  LidarrRequestError,
  normalizeLidarrUrl,
} from "@/lib/server/lidarr";

import {
  getLidarrSettings,
  getPublicLidarrSettings,
  saveLidarrSettings,
} from "@/lib/server/lidarr-settings";

export const runtime = "nodejs";

type SaveSettingsRequest = {
  url?: string;
  apiKey?: string;

  rootFolderId?: number | null;
  qualityProfileId?: number | null;
  metadataProfileId?: number | null;

  searchAfterAdd?: boolean;
};

export async function GET() {
  const settings = getPublicLidarrSettings();

  return NextResponse.json({
    ok: true,
    settings,
  });
}

export async function PUT(request: Request) {
  let body: SaveSettingsRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request body.",
      },
      {
        status: 400,
      },
    );
  }

  const existing = getLidarrSettings();

  const url = normalizeLidarrUrl(body.url ?? existing?.url ?? "");

  const apiKey = body.apiKey?.trim() || existing?.apiKey || "";

  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        error: "Lidarr URL is required.",
      },
      {
        status: 400,
      },
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Lidarr API key is required.",
      },
      {
        status: 400,
      },
    );
  }

  const connection = {
    url,
    apiKey,
  };

  try {
    await getLidarrStatus(connection);

    const options = await getLidarrOptions(connection);

    const rootFolderId = body.rootFolderId ?? null;

    const qualityProfileId = body.qualityProfileId ?? null;

    const metadataProfileId = body.metadataProfileId ?? null;

    if (
      rootFolderId !== null &&
      !options.rootFolders.some((item) => item.id === rootFolderId)
    ) {
      throw new LidarrRequestError(
        "Selected root folder does not exist in Lidarr.",
        400,
      );
    }

    if (
      qualityProfileId !== null &&
      !options.qualityProfiles.some((item) => item.id === qualityProfileId)
    ) {
      throw new LidarrRequestError(
        "Selected quality profile does not exist in Lidarr.",
        400,
      );
    }

    if (
      metadataProfileId !== null &&
      !options.metadataProfiles.some((item) => item.id === metadataProfileId)
    ) {
      throw new LidarrRequestError(
        "Selected metadata profile does not exist in Lidarr.",
        400,
      );
    }

    saveLidarrSettings({
      url,
      apiKey,

      rootFolderId,
      qualityProfileId,
      metadataProfileId,

      searchAfterAdd: body.searchAfterAdd ?? true,
    });

    return NextResponse.json({
      ok: true,
      settings: getPublicLidarrSettings(),
    });
  } catch (error) {
    if (error instanceof LidarrRequestError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        {
          status: error.status ?? 502,
        },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Could not save Lidarr settings.",
      },
      {
        status: 500,
      },
    );
  }
}

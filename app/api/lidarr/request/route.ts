import { withAuth } from "@/lib/server/auth/http";
import { NextResponse } from "next/server";

import {
  getLidarrOptions,
  LidarrRequestError,
  requestAlbumInLidarr,
} from "@/lib/server/lidarr";

import { getLidarrSettings } from "@/lib/server/lidarr-settings";

export const runtime = "nodejs";

type RequestBody = {
  musicBrainzReleaseGroupId?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const POST = withAuth(async function POST(request: Request) {
  let body: RequestBody;

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

  const foreignAlbumId = body.musicBrainzReleaseGroupId?.trim() ?? "";

  if (!UUID_PATTERN.test(foreignAlbumId)) {
    return NextResponse.json(
      {
        ok: false,
        error: "A valid MusicBrainz Release Group ID is required.",
      },
      {
        status: 400,
      },
    );
  }

  const settings = getLidarrSettings();

  if (!settings) {
    return NextResponse.json(
      {
        ok: false,
        error: "Lidarr is not configured.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    settings.rootFolderId === null ||
    settings.qualityProfileId === null ||
    settings.metadataProfileId === null
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Lidarr request defaults are incomplete.",
      },
      {
        status: 400,
      },
    );
  }

  const connection = {
    url: settings.url,
    apiKey: settings.apiKey,
  };

  try {
    const options = await getLidarrOptions(connection);

    const rootFolder = options.rootFolders.find(
      (folder) => folder.id === settings.rootFolderId,
    );

    if (!rootFolder) {
      return NextResponse.json(
        {
          ok: false,
          error: "The configured Lidarr root folder no longer exists.",
        },
        {
          status: 400,
        },
      );
    }

    const result = await requestAlbumInLidarr(connection, foreignAlbumId, {
      rootFolderPath: rootFolder.path,

      qualityProfileId: settings.qualityProfileId,

      metadataProfileId: settings.metadataProfileId,

      searchAfterAdd: settings.searchAfterAdd,
    });

    return NextResponse.json({
      ok: true,
      request: result,
    });
  } catch (error) {
    console.error("Lidarr album request failed:", error);

    if (error instanceof LidarrRequestError) {
      /*
       * Keep detailed upstream failures server-side.
       */
      return NextResponse.json(
        {
          ok: false,

          error:
            error.status === 404
              ? "Lidarr could not find that album."
              : "Lidarr could not process the request.",
        },
        {
          status: error.status === 404 ? 404 : 502,
        },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Could not request album.",
      },
      {
        status: 500,
      },
    );
  }
});

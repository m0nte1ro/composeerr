import { NextResponse } from "next/server";

import { getLidarrLibrary, LidarrRequestError } from "@/lib/server/lidarr";

import { getLidarrSettings } from "@/lib/server/lidarr-settings";

export const runtime = "nodejs";

export async function GET() {
  const settings = getLidarrSettings();

  if (!settings) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error: "Lidarr is not configured.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const library = await getLidarrLibrary({
      url: settings.url,
      apiKey: settings.apiKey,
    });

    return NextResponse.json({
      ok: true,
      configured: true,
      library,
    });
  } catch (error) {
    if (error instanceof LidarrRequestError) {
      return NextResponse.json(
        {
          ok: false,
          configured: true,
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
        configured: true,
        error: "Could not load the Lidarr library.",
      },
      {
        status: 500,
      },
    );
  }
}

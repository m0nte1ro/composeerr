import { NextResponse } from "next/server";

import { getLidarrOptions, LidarrRequestError } from "@/lib/server/lidarr";

import { getLidarrSettings } from "@/lib/server/lidarr-settings";

export const runtime = "nodejs";

export async function GET() {
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

  try {
    const options = await getLidarrOptions({
      url: settings.url,
      apiKey: settings.apiKey,
    });

    return NextResponse.json({
      ok: true,
      options,
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
        error: "Could not load Lidarr options.",
      },
      {
        status: 500,
      },
    );
  }
}

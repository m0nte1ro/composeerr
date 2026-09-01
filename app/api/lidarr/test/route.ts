import { NextResponse } from "next/server";

import {
  getLidarrOptions,
  getLidarrStatus,
  LidarrRequestError,
  normalizeLidarrUrl,
} from "@/lib/server/lidarr";

import { getLidarrSettings } from "@/lib/server/lidarr-settings";

export const runtime = "nodejs";

type TestConnectionRequest = {
  url?: string;
  apiKey?: string;
};

export async function POST(request: Request) {
  let body: TestConnectionRequest;

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

  try {
    const connection = {
      url,
      apiKey,
    };

    const [status, options] = await Promise.all([
      getLidarrStatus(connection),
      getLidarrOptions(connection),
    ]);

    return NextResponse.json({
      ok: true,

      lidarr: {
        appName: status.appName ?? "Lidarr",
        instanceName: status.instanceName ?? null,
        version: status.version ?? null,
      },

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
        error: "Unexpected Lidarr connection error.",
      },
      {
        status: 500,
      },
    );
  }
}

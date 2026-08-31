import { NextResponse } from "next/server";

type TestConnectionRequest = {
  url?: string;
  apiKey?: string;
};

type LidarrSystemStatus = {
  appName?: string;
  instanceName?: string;
  version?: string;
  isDebug?: boolean;
  isProduction?: boolean;
  startupPath?: string;
  appData?: string;
  osName?: string;
  osVersion?: string;
};

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

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

  const url = normalizeBaseUrl(body.url ?? "");
  const apiKey = body.apiKey?.trim() ?? "";

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

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Lidarr URL is not valid.",
      },
      {
        status: 400,
      },
    );
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Lidarr URL must use HTTP or HTTPS.",
      },
      {
        status: 400,
      },
    );
  }

  const statusUrl = `${url}/api/v1/system/status`;

  try {
    const response = await fetch(statusUrl, {
      method: "GET",

      headers: {
        Accept: "application/json",
        "X-Api-Key": apiKey,
      },

      cache: "no-store",

      signal: AbortSignal.timeout(8000),
    });

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        {
          ok: false,
          error: "Lidarr rejected the API key.",
        },
        {
          status: 401,
        },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Lidarr returned HTTP ${response.status}.`,
        },
        {
          status: 502,
        },
      );
    }

    const status = (await response.json()) as LidarrSystemStatus;

    return NextResponse.json({
      ok: true,

      lidarr: {
        appName: status.appName ?? "Lidarr",
        instanceName: status.instanceName ?? null,
        version: status.version ?? null,
        osName: status.osName ?? null,
        osVersion: status.osVersion ?? null,
      },
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    return NextResponse.json(
      {
        ok: false,

        error: isTimeout
          ? "Timed out while connecting to Lidarr."
          : "Could not connect to Lidarr.",
      },
      {
        status: 502,
      },
    );
  }
}
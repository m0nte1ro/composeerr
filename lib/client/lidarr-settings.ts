import type { LidarrOptions, LidarrSystemStatus } from "@/lib/lidarr/types";

export type PublicLidarrSettings = {
  configured: boolean;
  hasApiKey: boolean;
  url: string;
  rootFolderId: number | null;
  qualityProfileId: number | null;
  metadataProfileId: number | null;
  searchAfterAdd: boolean;
};

export type LidarrSettingsPayload = {
  url: string;
  apiKey?: string;
  rootFolderId: number | null;
  qualityProfileId: number | null;
  metadataProfileId: number | null;
  searchAfterAdd: boolean;
};

function ensureOkResponse<T extends { ok?: boolean; error?: string }>(
  response: Response,
  data: T,
  fallbackMessage: string,
) {
  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? fallbackMessage);
  }
}

export async function getLidarrSettings() {
  const response = await fetch("/api/settings/lidarr", {
    cache: "no-store",
  });

  const data = (await response.json()) as {
    ok?: boolean;
    settings?: PublicLidarrSettings | null;
    error?: string;
  };

  ensureOkResponse(response, data, "Could not load settings.");

  return data.settings ?? null;
}

export async function getLidarrOptions() {
  const response = await fetch("/api/lidarr/options", {
    cache: "no-store",
  });

  let data: {
    ok?: boolean;
    options?: LidarrOptions;
    error?: string;
  };

  try {
    data = (await response.json()) as typeof data;
  } catch {
    throw new Error("Could not load Lidarr options.");
  }

  ensureOkResponse(response, data, "Could not load Lidarr options.");

  if (!data.options) {
    throw new Error("Could not load Lidarr options.");
  }

  return data.options;
}

export async function testLidarrConnection(payload: {
  url: string;
  apiKey?: string;
}) {
  const response = await fetch("/api/lidarr/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    ok?: boolean;
    error?: string;
    lidarr?: LidarrSystemStatus;
    options?: LidarrOptions;
  };

  ensureOkResponse(response, data, "Connection test failed.");

  if (!data.options) {
    throw new Error("Connection test failed.");
  }

  return {
    lidarr: data.lidarr,
    options: data.options,
  };
}

export async function saveLidarrSettings(payload: LidarrSettingsPayload) {
  const response = await fetch("/api/settings/lidarr", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    ok?: boolean;
    settings?: PublicLidarrSettings;
    error?: string;
  };

  ensureOkResponse(response, data, "Could not save settings.");

  return data.settings;
}

import { apiFetch } from "./http";
import type { LidarrAlbumRequestResult } from "@/lib/lidarr/types";

export async function requestAlbumByReleaseGroupId(
  musicBrainzReleaseGroupId: string,
) {
  const response = await apiFetch("/api/lidarr/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      musicBrainzReleaseGroupId,
    }),
  });

  let data: {
    ok?: boolean;
    error?: string;
    request?: LidarrAlbumRequestResult;
  };

  try {
    data = (await response.json()) as typeof data;
  } catch {
    throw new Error("Request failed.");
  }

  if (!response.ok || !data.ok || !data.request) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data.request;
}

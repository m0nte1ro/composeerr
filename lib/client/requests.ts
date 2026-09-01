import type { LidarrAlbumRequestResult } from "@/lib/lidarr/types";

export async function requestAlbumByReleaseGroupId(
  musicBrainzReleaseGroupId: string,
) {
  const response = await fetch("/api/lidarr/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      musicBrainzReleaseGroupId,
    }),
  });

  const data = (await response.json()) as {
    ok?: boolean;
    error?: string;
    request?: LidarrAlbumRequestResult;
  };

  if (!response.ok || !data.ok || !data.request) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data.request;
}

import type { ComposeerrLibrary } from "@/lib/lidarr/types";

export async function fetchLidarrLibrary(): Promise<ComposeerrLibrary> {
  const response = await fetch("/api/lidarr/library", {
    cache: "no-store",
  });

  const data = (await response.json()) as {
    ok?: boolean;
    error?: string;
    library?: ComposeerrLibrary;
  };

  if (!response.ok || !data.ok || !data.library) {
    throw new Error(data.error ?? "Could not refresh Lidarr library.");
  }

  return data.library;
}

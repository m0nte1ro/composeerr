import { apiFetch } from "./http";
import type { ComposeerrLibrary } from "@/lib/lidarr/types";
import type { LibraryAvailability } from "@/lib/library/types";

export async function fetchLidarrLibrary(): Promise<ComposeerrLibrary> {
  const response = await apiFetch("/api/lidarr/library", {
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

export async function fetchLibraryAvailability(): Promise<LibraryAvailability> {
  const response = await apiFetch("/api/library", { cache: "no-store" });
  const data = (await response.json()) as {
    ok?: boolean;
    library?: LibraryAvailability;
  };

  if (!response.ok || !data.ok || !data.library) {
    throw new Error("Could not refresh Library availability.");
  }

  return data.library;
}

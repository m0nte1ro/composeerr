import type { MetadataAlbumResult } from "@/lib/metadata/types";

export function formatDuration(milliseconds: number | null) {
  if (!milliseconds) {
    return "-";
  }

  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function albumTypeLabel(album: MetadataAlbumResult) {
  if (album.secondaryTypes.length) {
    return album.secondaryTypes.join(" · ");
  }

  return album.primaryType ?? "Release";
}

export function artistSummary(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" · ");
}

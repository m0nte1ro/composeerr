import type { LibraryAlbum } from "@/lib/library/types";
import type { MetadataAlbumResult } from "@/lib/metadata/types";

export function normalizeLibraryText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getLibraryAlbumIdentity(
  album: Pick<
    LibraryAlbum,
    "title" | "artist" | "musicBrainzReleaseGroupId"
  >,
) {
  return (
    album.musicBrainzReleaseGroupId?.toLowerCase() ||
    `${normalizeLibraryText(album.artist)}|${normalizeLibraryText(album.title)}`
  );
}

export function findLibraryAlbum(
  albums: LibraryAlbum[],
  album: MetadataAlbumResult,
) {
  const musicBrainzId = album.id.toLowerCase();
  const byMusicBrainzId = albums.find(
    (candidate) =>
      candidate.musicBrainzReleaseGroupId?.toLowerCase() === musicBrainzId,
  );

  if (byMusicBrainzId) {
    return byMusicBrainzId;
  }

  const artist = normalizeLibraryText(album.artist);
  const title = normalizeLibraryText(album.title);

  return (
    albums.find(
      (candidate) =>
        normalizeLibraryText(candidate.artist) === artist &&
        normalizeLibraryText(candidate.title) === title &&
        (candidate.year === null || album.year === null || candidate.year === album.year),
    ) ?? null
  );
}
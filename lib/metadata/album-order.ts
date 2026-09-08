import type { MetadataAlbumResult, MetadataSongResult } from "./types";

export function chronologicalAlbums(a: MetadataAlbumResult, b: MetadataAlbumResult) {
  return (a.year ?? Infinity) - (b.year ?? Infinity) || a.title.localeCompare(b.title);
}

function isArtistStudioAlbum(album: MetadataAlbumResult, song: MetadataSongResult) {
  const sameArtist = album.artistId && song.artistId
    ? album.artistId === song.artistId
    : album.artist.trim().toLowerCase() === song.artist.trim().toLowerCase();
  return sameArtist && album.primaryType?.toLowerCase() === "album" && album.secondaryTypes.length === 0;
}

/** Guidance from the returned albums only; neither popularity nor proof of original release. */
export function songAlbumChoices(albums: MetadataAlbumResult[], song: MetadataSongResult) {
  const studio = albums.filter((album) => isArtistStudioAlbum(album, song));
  const dated = studio.filter((album) => album.year !== null);
  const earliestYear = dated.length ? Math.min(...dated.map((album) => album.year!)) : null;
  return [...albums]
    .sort((a, b) => Number(isArtistStudioAlbum(b, song)) - Number(isArtistStudioAlbum(a, song)) || chronologicalAlbums(a, b))
    .map((album) => ({
      album,
      earliestStudio: earliestYear !== null && album.year === earliestYear && isArtistStudioAlbum(album, song),
    }));
}

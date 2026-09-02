import { lidarrGet } from "@/lib/server/lidarr/http-client";
import type {
  ComposeerrLibrary,
  ComposeerrLibraryAlbum,
  LidarrAlbumResource,
  LidarrArtistResource,
  LidarrConnection,
} from "@/lib/server/lidarr/types";

function mapLibraryAlbum(
  album: LidarrAlbumResource,
  artist: LidarrArtistResource | undefined,
): ComposeerrLibraryAlbum {
  const trackFileCount = album.statistics?.trackFileCount ?? 0;
  const trackCount = album.statistics?.trackCount ?? 0;

  let status: ComposeerrLibraryAlbum["status"] = "tracked";

  if (trackCount > 0 && trackFileCount >= trackCount) {
    status = "available";
  } else if (trackFileCount > 0) {
    status = "partial";
  }

  const releaseYear = album.releaseDate
    ? Number(album.releaseDate.slice(0, 4))
    : null;

  return {
    lidarrId: album.id,
    title: album.title,
    artist: artist?.artistName ?? "Unknown Artist",
    year: Number.isFinite(releaseYear) ? releaseYear : null,
    musicBrainzReleaseGroupId: album.foreignAlbumId,
    musicBrainzArtistId: artist?.foreignArtistId ?? null,
    monitored: album.monitored,
    status,
    trackFileCount,
    trackCount,
    sizeOnDisk: album.statistics?.sizeOnDisk ?? 0,
  };
}

export async function getLidarrLibrary(
  connection: LidarrConnection,
): Promise<ComposeerrLibrary> {
  const [artists, albums] = await Promise.all([
    lidarrGet<LidarrArtistResource[]>(connection, "/api/v1/artist"),
    lidarrGet<LidarrAlbumResource[]>(connection, "/api/v1/album"),
  ]);

  const artistsById = new Map(artists.map((artist) => [artist.id, artist]));

  const normalizedAlbums = albums.map<ComposeerrLibraryAlbum>((album) =>
    mapLibraryAlbum(album, artistsById.get(album.artistId)),
  );

  const libraryAlbums = normalizedAlbums.filter(
    (album) => album.monitored || album.trackFileCount > 0,
  );

  const albumsWithFiles = libraryAlbums.filter(
    (album) => album.trackFileCount > 0,
  );

  return {
    albums: libraryAlbums,
    knownAlbumCount: normalizedAlbums.length,
    monitoredAlbumCount: normalizedAlbums.filter((album) => album.monitored)
      .length,
    albumCount: albumsWithFiles.length,
    trackFileCount: normalizedAlbums.reduce(
      (total, album) => total + album.trackFileCount,
      0,
    ),
    artistCount: artists.length,
  };
}

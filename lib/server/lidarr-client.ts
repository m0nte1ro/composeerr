export type LidarrConnection = {
  url: string;
  apiKey: string;
};

export type LidarrSystemStatus = {
  appName?: string;
  instanceName?: string;
  version?: string;
  osName?: string;
  osVersion?: string;
};

export type LidarrRootFolder = {
  id: number;
  name?: string;
  path: string;
};

export type LidarrProfile = {
  id: number;
  name: string;
};

export type LidarrOptions = {
  rootFolders: LidarrRootFolder[];
  qualityProfiles: LidarrProfile[];
  metadataProfiles: LidarrProfile[];
};

type LidarrArtistResource = {
  id: number;
  artistName: string;
  foreignArtistId: string;
  monitored: boolean;
};

type LidarrAlbumStatistics = {
  trackFileCount: number;
  trackCount: number;
  totalTrackCount: number;
  sizeOnDisk: number;
  percentOfTracks?: number;
};

type LidarrAlbumResource = {
  id: number;
  artistId: number;

  title: string;
  foreignAlbumId: string;

  monitored: boolean;

  releaseDate?: string | null;

  albumType?: string | null;
  secondaryTypes?: string[];

  statistics?: LidarrAlbumStatistics | null;
};

export type ComposeerrLibraryAlbum = {
  lidarrId: number;

  title: string;
  artist: string;

  year: number | null;

  musicBrainzReleaseGroupId: string;
  musicBrainzArtistId: string | null;

  monitored: boolean;

  status: "tracked" | "partial" | "available";

  trackFileCount: number;
  trackCount: number;
  sizeOnDisk: number;
};

export type ComposeerrLibrary = {
  albums: ComposeerrLibraryAlbum[];

  knownAlbumCount: number;
  monitoredAlbumCount: number;
  albumCount: number;
  trackFileCount: number;

  artistCount: number;
};

export class LidarrRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);

    this.name = "LidarrRequestError";
  }
}

export function normalizeLidarrUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function validateLidarrUrl(value: string) {
  const normalized = normalizeLidarrUrl(value);

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new LidarrRequestError(
      "Lidarr URL is not valid.",
      400,
    );
  }

  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {
    throw new LidarrRequestError(
      "Lidarr URL must use HTTP or HTTPS.",
      400,
    );
  }

  return normalized;
}

async function lidarrGet<T>(
  connection: LidarrConnection,
  path: string,
): Promise<T> {
  const url = validateLidarrUrl(connection.url);

  let response: Response;

  try {
    response = await fetch(`${url}${path}`, {
      method: "GET",

      headers: {
        Accept: "application/json",
        "X-Api-Key": connection.apiKey,
      },

      cache: "no-store",

      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    const timeout =
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError");

    throw new LidarrRequestError(
      timeout
        ? "Timed out while connecting to Lidarr."
        : "Could not connect to Lidarr.",
      502,
    );
  }

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    throw new LidarrRequestError(
      "Lidarr rejected the API key.",
      401,
    );
  }

  if (!response.ok) {
    throw new LidarrRequestError(
      `Lidarr returned HTTP ${response.status}.`,
      502,
    );
  }

  return (await response.json()) as T;
}

export function getLidarrStatus(
  connection: LidarrConnection,
) {
  return lidarrGet<LidarrSystemStatus>(
    connection,
    "/api/v1/system/status",
  );
}

export async function getLidarrOptions(
  connection: LidarrConnection,
): Promise<LidarrOptions> {
  const [
    rootFolders,
    qualityProfiles,
    metadataProfiles,
  ] = await Promise.all([
    lidarrGet<LidarrRootFolder[]>(
      connection,
      "/api/v1/rootfolder",
    ),

    lidarrGet<LidarrProfile[]>(
      connection,
      "/api/v1/qualityprofile",
    ),

    lidarrGet<LidarrProfile[]>(
      connection,
      "/api/v1/metadataprofile",
    ),
  ]);

  return {
    rootFolders,
    qualityProfiles,
    metadataProfiles,
  };
}

export async function getLidarrLibrary(
  connection: LidarrConnection,
): Promise<ComposeerrLibrary> {
  const [artists, albums] = await Promise.all([
    lidarrGet<LidarrArtistResource[]>(
      connection,
      "/api/v1/artist",
    ),

    lidarrGet<LidarrAlbumResource[]>(
      connection,
      "/api/v1/album",
    ),
  ]);

  const artistsById = new Map(
    artists.map((artist) => [
      artist.id,
      artist,
    ]),
  );

  const normalizedAlbums =
    albums.map<ComposeerrLibraryAlbum>(
      (album) => {
        const artist =
          artistsById.get(album.artistId);

        const trackFileCount =
          album.statistics?.trackFileCount ?? 0;

        const trackCount =
          album.statistics?.trackCount ?? 0;

        let status:
          | "tracked"
          | "partial"
          | "available" = "tracked";

        if (
          trackCount > 0 &&
          trackFileCount >= trackCount
        ) {
          status = "available";
        } else if (trackFileCount > 0) {
          status = "partial";
        }

        const releaseYear =
          album.releaseDate
            ? Number(
                album.releaseDate.slice(0, 4),
              )
            : null;

        return {
          lidarrId: album.id,

          title: album.title,

          artist:
            artist?.artistName ??
            "Unknown Artist",

          year:
            Number.isFinite(releaseYear)
              ? releaseYear
              : null,

          musicBrainzReleaseGroupId:
            album.foreignAlbumId,

          musicBrainzArtistId:
            artist?.foreignArtistId ??
            null,

          monitored: album.monitored,

          status,

          trackFileCount,
          trackCount,

          sizeOnDisk:
            album.statistics?.sizeOnDisk ?? 0,
        };
      },
    );

 const libraryAlbums = normalizedAlbums.filter(
  (album) =>
    album.monitored ||
    album.trackFileCount > 0,
);

const albumsWithFiles = libraryAlbums.filter(
  (album) => album.trackFileCount > 0,
);

return {
  albums: libraryAlbums,

  knownAlbumCount: normalizedAlbums.length,

  monitoredAlbumCount:
    normalizedAlbums.filter(
      (album) => album.monitored,
    ).length,

  albumCount: albumsWithFiles.length,

  trackFileCount:
    normalizedAlbums.reduce(
      (total, album) =>
        total + album.trackFileCount,
      0,
    ),

  artistCount: artists.length,
};
}
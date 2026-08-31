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

type LidarrCommandResource = {
  id: number;

  name?: string;
  status?: string;
  message?: string | null;
};

type LidarrRequestArtist = {
  id?: number;

  artistName?: string;
  foreignArtistId?: string;

  monitored?: boolean;

  rootFolderPath?: string;

  qualityProfileId?: number;
  metadataProfileId?: number;

  monitorNewItems?: string;

  addOptions?: {
    monitor?: string;

    albumsToMonitor?: string[];

    searchForMissingAlbums?: boolean;

    monitored?: boolean;
  };

  [key: string]: unknown;
};

type LidarrRequestAlbum = {
  id?: number;

  artistId?: number;

  title?: string;

  foreignAlbumId?: string;

  monitored?: boolean;

  artist?: LidarrRequestArtist;

  addOptions?: {
    searchForNewAlbum?: boolean;
  };

  [key: string]: unknown;
};

export type ComposeerrLibraryAlbum = {
  lidarrId: number;

  title: string;
  artist: string;

  year: number | null;

  musicBrainzReleaseGroupId: string;
  musicBrainzArtistId: string | null;

  monitored: boolean;

  status:
    | "tracked"
    | "partial"
    | "available";

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

export type LidarrAlbumRequestDefaults = {
  rootFolderPath: string;

  qualityProfileId: number;
  metadataProfileId: number;

  searchAfterAdd: boolean;
};

export type LidarrAlbumRequestResult = {
  albumId: number;

  artistId: number | null;

  foreignAlbumId: string;

  added: boolean;

  searchTriggered: boolean;
  searchCommandId: number | null;
};

export class LidarrRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);

    this.name =
      "LidarrRequestError";
  }
}

export function normalizeLidarrUrl(
  value: string,
) {
  return value
    .trim()
    .replace(/\/+$/, "");
}

export function validateLidarrUrl(
  value: string,
) {
  const normalized =
    normalizeLidarrUrl(value);

  let parsed: URL;

  try {
    parsed =
      new URL(normalized);
  } catch {
    throw new LidarrRequestError(
      "Lidarr URL is not valid.",
      400,
    );
  }

  if (
    parsed.protocol !==
      "http:" &&
    parsed.protocol !==
      "https:"
  ) {
    throw new LidarrRequestError(
      "Lidarr URL must use HTTP or HTTPS.",
      400,
    );
  }

  return normalized;
}

function sleep(
  milliseconds: number,
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

async function lidarrGet<T>(
  connection: LidarrConnection,
  path: string,
): Promise<T> {
  const url =
    validateLidarrUrl(
      connection.url,
    );

  let response: Response;

  try {
    response =
      await fetch(
        `${url}${path}`,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",

            "X-Api-Key":
              connection.apiKey,
          },

          cache: "no-store",

          signal:
            AbortSignal.timeout(
              8000,
            ),
        },
      );
  } catch (error) {
    const timeout =
      error instanceof Error &&
      (
        error.name ===
          "TimeoutError" ||
        error.name ===
          "AbortError"
      );

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
    const responseText =
      await response
        .text()
        .catch(() => "");

    console.error(
      `Lidarr GET ${path} failed with HTTP ${response.status}:`,
      responseText,
    );

    throw new LidarrRequestError(
      `Lidarr returned HTTP ${response.status}.`,
      502,
    );
  }

  return (
    await response.json()
  ) as T;
}

async function lidarrWrite<
  T = unknown,
>(
  connection: LidarrConnection,
  path: string,
  method: "POST" | "PUT",
  body: unknown,
): Promise<T> {
  const url =
    validateLidarrUrl(
      connection.url,
    );

  let response: Response;

  try {
    response =
      await fetch(
        `${url}${path}`,
        {
          method,

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            "X-Api-Key":
              connection.apiKey,
          },

          body:
            JSON.stringify(
              body,
            ),

          cache: "no-store",

          signal:
            AbortSignal.timeout(
              15_000,
            ),
        },
      );
  } catch (error) {
    const timeout =
      error instanceof Error &&
      (
        error.name ===
          "TimeoutError" ||
        error.name ===
          "AbortError"
      );

    throw new LidarrRequestError(
      timeout
        ? "Timed out while communicating with Lidarr."
        : "Could not communicate with Lidarr.",
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
    const responseText =
      await response
        .text()
        .catch(() => "");

    console.error(
      `Lidarr ${method} ${path} failed with HTTP ${response.status}:`,
      responseText,
    );

    throw new LidarrRequestError(
      `Lidarr returned HTTP ${response.status}.`,
      502,
    );
  }

  const text =
    await response.text();

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(
      text,
    ) as T;
  } catch {
    return text as T;
  }
}

async function startLidarrCommand(
  connection: LidarrConnection,
  body: Record<
    string,
    unknown
  >,
) {
  const command =
    await lidarrWrite<
      LidarrCommandResource
    >(
      connection,
      "/api/v1/command",
      "POST",
      body,
    );

  if (
    !command ||
    typeof command.id !==
      "number"
  ) {
    throw new LidarrRequestError(
      "Lidarr queued a command but did not return a valid command ID.",
      502,
    );
  }

  return command;
}

async function waitForLidarrCommand(
  connection: LidarrConnection,
  commandId: number,
  timeoutMs = 90_000,
) {
  const deadline =
    Date.now() +
    timeoutMs;

  while (
    Date.now() <
    deadline
  ) {
    const command =
      await lidarrGet<
        LidarrCommandResource
      >(
        connection,
        `/api/v1/command/${commandId}`,
      );

    const status =
      command.status
        ?.toLowerCase() ??
      "";

    if (
      status ===
      "completed"
    ) {
      return command;
    }

    if (
      status ===
        "failed" ||
      status ===
        "aborted" ||
      status ===
        "cancelled"
    ) {
      console.error(
        `Lidarr command ${commandId} (${command.name ?? "unknown"}) ended with status ${command.status}:`,
        command.message,
      );

      throw new LidarrRequestError(
        "A Lidarr command failed.",
        502,
      );
    }

    await sleep(750);
  }

  throw new LidarrRequestError(
    "Timed out waiting for Lidarr to refresh metadata.",
    502,
  );
}

async function findAlbumByForeignId(
  connection: LidarrConnection,
  foreignAlbumId: string,
) {
  const albums =
    await lidarrGet<
      LidarrRequestAlbum[]
    >(
      connection,
      `/api/v1/album?foreignAlbumId=${encodeURIComponent(
        foreignAlbumId,
      )}`,
    );

  return (
    albums.find(
      (album) =>
        album.foreignAlbumId
          ?.toLowerCase() ===
        foreignAlbumId.toLowerCase(),
    ) ?? null
  );
}

export function getLidarrStatus(
  connection: LidarrConnection,
) {
  return lidarrGet<
    LidarrSystemStatus
  >(
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
  ] =
    await Promise.all([
      lidarrGet<
        LidarrRootFolder[]
      >(
        connection,
        "/api/v1/rootfolder",
      ),

      lidarrGet<
        LidarrProfile[]
      >(
        connection,
        "/api/v1/qualityprofile",
      ),

      lidarrGet<
        LidarrProfile[]
      >(
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
  const [
    artists,
    albums,
  ] =
    await Promise.all([
      lidarrGet<
        LidarrArtistResource[]
      >(
        connection,
        "/api/v1/artist",
      ),

      lidarrGet<
        LidarrAlbumResource[]
      >(
        connection,
        "/api/v1/album",
      ),
    ]);

  const artistsById =
    new Map(
      artists.map(
        (artist) => [
          artist.id,
          artist,
        ],
      ),
    );

  const normalizedAlbums =
    albums.map<
      ComposeerrLibraryAlbum
    >(
      (album) => {
        const artist =
          artistsById.get(
            album.artistId,
          );

        const trackFileCount =
          album.statistics
            ?.trackFileCount ??
          0;

        const trackCount =
          album.statistics
            ?.trackCount ??
          0;

        let status:
          | "tracked"
          | "partial"
          | "available" =
          "tracked";

        if (
          trackCount > 0 &&
          trackFileCount >=
            trackCount
        ) {
          status =
            "available";
        } else if (
          trackFileCount > 0
        ) {
          status =
            "partial";
        }

        const releaseYear =
          album.releaseDate
            ? Number(
                album.releaseDate.slice(
                  0,
                  4,
                ),
              )
            : null;

        return {
          lidarrId:
            album.id,

          title:
            album.title,

          artist:
            artist
              ?.artistName ??
            "Unknown Artist",

          year:
            Number.isFinite(
              releaseYear,
            )
              ? releaseYear
              : null,

          musicBrainzReleaseGroupId:
            album.foreignAlbumId,

          musicBrainzArtistId:
            artist
              ?.foreignArtistId ??
            null,

          monitored:
            album.monitored,

          status,

          trackFileCount,
          trackCount,

          sizeOnDisk:
            album.statistics
              ?.sizeOnDisk ??
            0,
        };
      },
    );

  const libraryAlbums =
    normalizedAlbums.filter(
      (album) =>
        album.monitored ||
        album.trackFileCount >
          0,
    );

  const albumsWithFiles =
    libraryAlbums.filter(
      (album) =>
        album.trackFileCount >
        0,
    );

  return {
    albums:
      libraryAlbums,

    knownAlbumCount:
      normalizedAlbums.length,

    monitoredAlbumCount:
      normalizedAlbums.filter(
        (album) =>
          album.monitored,
      ).length,

    albumCount:
      albumsWithFiles.length,

    trackFileCount:
      normalizedAlbums.reduce(
        (
          total,
          album,
        ) =>
          total +
          album.trackFileCount,
        0,
      ),

    artistCount:
      artists.length,
  };
}

export async function requestAlbumInLidarr(
  connection: LidarrConnection,
  foreignAlbumId: string,
  defaults: LidarrAlbumRequestDefaults,
): Promise<LidarrAlbumRequestResult> {
  let album = await findAlbumByForeignId(connection, foreignAlbumId);
  let added = false;

  if (!album) {
    const lookupResults = await lidarrGet<LidarrRequestAlbum[]>(
      connection,
      `/api/v1/album/lookup?term=${encodeURIComponent(`lidarr:${foreignAlbumId}`)}`,
    );

    const lookupAlbum = lookupResults.find(
      (candidate) =>
        candidate.foreignAlbumId?.toLowerCase() === foreignAlbumId.toLowerCase(),
    );

    if (!lookupAlbum) {
      throw new LidarrRequestError(
        "Lidarr could not find this MusicBrainz album.",
        404,
      );
    }

    if (!lookupAlbum.artist || !lookupAlbum.artist.foreignArtistId) {
      throw new LidarrRequestError(
        "Lidarr lookup did not return a valid artist.",
        502,
      );
    }

    const payload: LidarrRequestAlbum = {
      ...lookupAlbum,
      monitored: true,
      addOptions: {
        ...lookupAlbum.addOptions,
        searchForNewAlbum: false,
      },
      artist: {
        ...lookupAlbum.artist,
        monitored: true,
        rootFolderPath: defaults.rootFolderPath,
        qualityProfileId: defaults.qualityProfileId,
        metadataProfileId: defaults.metadataProfileId,
        monitorNewItems: lookupAlbum.artist.monitorNewItems ?? "none",
        addOptions: {
          ...lookupAlbum.artist.addOptions,
          monitor: "none",
          albumsToMonitor: [foreignAlbumId],
          searchForMissingAlbums: false,
          monitored: true,
        },
      },
    };

    await lidarrWrite(connection, "/api/v1/album", "POST", payload);
    added = true;

    album = await findAlbumByForeignId(connection, foreignAlbumId);

    if (!album) {
      throw new LidarrRequestError(
        "Lidarr added the album but Composeerr could not resolve it afterwards.",
        502,
      );
    }
  }

  // Store the narrowed ID in a dedicated constant
  if (typeof album.id !== "number") {
    throw new LidarrRequestError(
      "Lidarr returned an album without a valid ID.",
      502,
    );
  }
  let resolvedAlbumId: number = album.id;

  await lidarrWrite(connection, "/api/v1/album/monitor", "PUT", {
    albumIds: [resolvedAlbumId],
    monitored: true,
  });

  if (typeof album.artistId === "number") {
    const artist = await lidarrGet<LidarrRequestArtist>(
      connection,
      `/api/v1/artist/${album.artistId}`,
    );

    if (!artist.monitored) {
      await lidarrWrite(
        connection,
        `/api/v1/artist/${album.artistId}`,
        "PUT",
        {
          ...artist,
          monitored: true,
        },
      );
    }
  }

  if (added && typeof album.artistId === "number") {
    const refreshCommand = await startLidarrCommand(connection, {
      name: "RefreshArtist",
      artistId: album.artistId,
    });

    console.info(
      `Lidarr RefreshArtist queued for artist ${album.artistId} as command ${refreshCommand.id}.`,
    );

    await waitForLidarrCommand(connection, refreshCommand.id);

    console.info(
      `Lidarr RefreshArtist command ${refreshCommand.id} completed.`,
    );

    const refreshedAlbum = await findAlbumByForeignId(
      connection,
      foreignAlbumId,
    );

    if (!refreshedAlbum || typeof refreshedAlbum.id !== "number") {
      throw new LidarrRequestError(
        "Lidarr refreshed the artist but Composeerr could not resolve the album afterwards.",
        502,
      );
    }

    album = refreshedAlbum;
    // Update the local narrowed ID variable after the reassignment
    resolvedAlbumId = refreshedAlbum.id;

    await lidarrWrite(connection, "/api/v1/album/monitor", "PUT", {
      albumIds: [resolvedAlbumId],
      monitored: true,
    });
  }

  let searchTriggered = false;
  let searchCommandId: number | null = null;

  if (defaults.searchAfterAdd) {
    const searchCommand = await startLidarrCommand(connection, {
      name: "AlbumSearch",
      albumIds: [resolvedAlbumId],
    });

    searchTriggered = true;
    searchCommandId = searchCommand.id;

    console.info(
      `Lidarr AlbumSearch queued for album ${resolvedAlbumId} as command ${searchCommand.id}.`,
    );
  }

  return {
    albumId: resolvedAlbumId,
    artistId: typeof album.artistId === "number" ? album.artistId : null,
    foreignAlbumId,
    added,
    searchTriggered,
    searchCommandId,
  };
}
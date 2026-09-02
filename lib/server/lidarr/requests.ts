import { LidarrRequestError } from "@/lib/server/lidarr/errors";
import { lidarrGet, lidarrWrite } from "@/lib/server/lidarr/http-client";
import {
  startLidarrCommand,
  waitForLidarrCommand,
} from "@/lib/server/lidarr/commands";
import type {
  LidarrAlbumRequestDefaults,
  LidarrAlbumRequestResult,
  LidarrConnection,
  LidarrRequestAlbum,
  LidarrRequestArtist,
} from "@/lib/server/lidarr/types";

async function findAlbumByForeignId(
  connection: LidarrConnection,
  foreignAlbumId: string,
) {
  const albums = await lidarrGet<LidarrRequestAlbum[]>(
    connection,
    `/api/v1/album?foreignAlbumId=${encodeURIComponent(foreignAlbumId)}`,
  );

  return (
    albums.find(
      (album) =>
        album.foreignAlbumId?.toLowerCase() === foreignAlbumId.toLowerCase(),
    ) ?? null
  );
}

async function addAlbumFromLookup(
  connection: LidarrConnection,
  foreignAlbumId: string,
  defaults: LidarrAlbumRequestDefaults,
) {
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
}

async function monitorAlbum(connection: LidarrConnection, albumId: number) {
  await lidarrWrite(connection, "/api/v1/album/monitor", "PUT", {
    albumIds: [albumId],
    monitored: true,
  });
}

async function ensureArtistMonitored(
  connection: LidarrConnection,
  artistId: number,
) {
  const artist = await lidarrGet<LidarrRequestArtist>(
    connection,
    `/api/v1/artist/${artistId}`,
  );

  if (!artist.monitored) {
    await lidarrWrite(connection, `/api/v1/artist/${artistId}`, "PUT", {
      ...artist,
      monitored: true,
    });
  }
}

export async function requestAlbumInLidarr(
  connection: LidarrConnection,
  foreignAlbumId: string,
  defaults: LidarrAlbumRequestDefaults,
): Promise<LidarrAlbumRequestResult> {
  let album = await findAlbumByForeignId(connection, foreignAlbumId);
  let added = false;

  if (!album) {
    await addAlbumFromLookup(connection, foreignAlbumId, defaults);
    added = true;

    album = await findAlbumByForeignId(connection, foreignAlbumId);

    if (!album) {
      throw new LidarrRequestError(
        "Lidarr added the album but Composeerr could not resolve it afterwards.",
        502,
      );
    }
  }

  if (typeof album.id !== "number") {
    throw new LidarrRequestError(
      "Lidarr returned an album without a valid ID.",
      502,
    );
  }

  let resolvedAlbumId = album.id;

  await monitorAlbum(connection, resolvedAlbumId);

  if (typeof album.artistId === "number") {
    await ensureArtistMonitored(connection, album.artistId);
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
    resolvedAlbumId = refreshedAlbum.id;

    await monitorAlbum(connection, resolvedAlbumId);
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

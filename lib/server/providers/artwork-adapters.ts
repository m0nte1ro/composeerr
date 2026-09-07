import type {
  ArtworkAuthMode,
  ArtworkProviderKey,
  CredentialProviderAuthMode,
} from "@/lib/providers/types";
import {
  ProviderConnectionError,
  providerFetch,
  readProviderJson,
} from "@/lib/server/providers/http";

const TEST_RELEASE_GROUP_ID = "b1392450-e666-3926-a536-22c65f834433";
const TEST_ARTIST_ID = "f4a31f0a-51dd-4fa7-986d-3095c40c5ed9";
const USER_AGENT = "Composeerr/0.1.0 (https://github.com/m0nte1ro/composeerr)";

export function getArtworkProviderName(key: ArtworkProviderKey) {
  return key === "cover-art-archive" ? "Cover Art Archive" : "Fanart.tv";
}

export type CoverArtArchiveConnection = {
  url: string;
  authMode: ArtworkAuthMode;
  username: string;
  password: string;
  headerName: string;
  headerSecret: string;
};

function getCoverArtArchiveHeaders(connection: CoverArtArchiveConnection) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };

  if (connection.authMode === "basic") {
    headers.Authorization = `Basic ${Buffer.from(
      `${connection.username}:${connection.password}`,
    ).toString("base64")}`;
  }

  if (connection.authMode === "header") {
    headers[connection.headerName] = connection.headerSecret;
  }

  return headers;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function resolveCoverArtArchiveAlbum(
  connection: CoverArtArchiveConnection,
  releaseGroupId: string,
) {
  const response = await providerFetch(
    `${connection.url}/release-group/${encodeURIComponent(releaseGroupId)}`,
    { headers: getCoverArtArchiveHeaders(connection) },
    "Cover Art Archive",
  );

  if (response.status === 404) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }

  const data = await readProviderJson(response, "Cover Art Archive");
  const images = isObject(data) && Array.isArray(data.images) ? data.images : [];
  const front = images.find(
    (image) => isObject(image) && image.front === true,
  );

  if (!isObject(front)) {
    return null;
  }

  const thumbnails = isObject(front.thumbnails) ? front.thumbnails : null;
  const imageUrl = thumbnails?.["1200"] ?? thumbnails?.large ?? front.image;
  return typeof imageUrl === "string" ? imageUrl : null;
}

export async function testCoverArtArchiveConnection(
  connection: CoverArtArchiveConnection,
) {
  const response = await providerFetch(
    `${connection.url}/release-group/${TEST_RELEASE_GROUP_ID}`,
    { headers: getCoverArtArchiveHeaders(connection) },
    "Cover Art Archive",
  );
  const data = await readProviderJson(response, "Cover Art Archive");

  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray((data as { images?: unknown }).images)
  ) {
    throw new ProviderConnectionError(
      "Cover Art Archive returned an invalid response.",
    );
  }
}

export type FanartConnection = {
  enabled: boolean;
  url: string;
  authMode: CredentialProviderAuthMode;
  nativeSecret: string;
  username: string;
  password: string;
  headerName: string;
  headerSecret: string;
};

function getFanartHeaders(connection: FanartConnection) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };

  if (connection.authMode === "native") {
    headers["api-key"] = connection.nativeSecret;
  }

  if (connection.authMode === "basic") {
    headers.Authorization = `Basic ${Buffer.from(
      `${connection.username}:${connection.password}`,
    ).toString("base64")}`;
  }

  if (connection.authMode === "header") {
    headers[connection.headerName] = connection.headerSecret;
  }

  return headers;
}

async function getFanartArtist(connection: FanartConnection, artistId: string) {
  const response = await providerFetch(
    `${connection.url.replace(/\/+$/, "")}/music/${encodeURIComponent(artistId)}`,
    { headers: getFanartHeaders(connection) },
    "Fanart.tv",
  );

  if (response.status === 404) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }

  const data = await readProviderJson(response, "Fanart.tv");
  return isObject(data) ? data : null;
}

function firstFanartUrl(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const image = value.find((item) => isObject(item) && typeof item.url === "string");
  return isObject(image) && typeof image.url === "string" ? image.url : null;
}

export async function resolveFanartArtist(
  connection: FanartConnection,
  artistId: string,
) {
  const data = await getFanartArtist(connection, artistId);
  return data
    ? firstFanartUrl(data.artistthumb) ?? firstFanartUrl(data.artistbackground)
    : null;
}

export async function resolveFanartAlbum(
  connection: FanartConnection,
  artistId: string,
  releaseGroupId: string,
) {
  const data = await getFanartArtist(connection, artistId);
  const albums = data && isObject(data.albums) ? data.albums : null;
  const album = albums && isObject(albums[releaseGroupId])
    ? albums[releaseGroupId]
    : null;
  return album ? firstFanartUrl(album.albumcover) : null;
}

export async function testFanartConnection(connection: FanartConnection) {
  const response = await providerFetch(
    `${connection.url.replace(/\/+$/, "")}/music/${TEST_ARTIST_ID}`,
    { headers: getFanartHeaders(connection) },
    "Fanart.tv",
  );
  const data = await readProviderJson(response, "Fanart.tv");

  if (typeof data !== "object" || data === null) {
    throw new ProviderConnectionError("Fanart.tv returned an invalid response.");
  }
}

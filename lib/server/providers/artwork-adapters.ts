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

type CoverArtArchiveConnection = {
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

export async function testFanartConnection(connection: FanartConnection) {
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

  const response = await providerFetch(
    `${connection.url.replace(/\/+$/, "")}/music/${TEST_ARTIST_ID}`,
    { headers },
    "Fanart.tv",
  );
  const data = await readProviderJson(response, "Fanart.tv");

  if (typeof data !== "object" || data === null) {
    throw new ProviderConnectionError("Fanart.tv returned an invalid response.");
  }
}

import { createHash, randomBytes } from "node:crypto";

import {
  ProviderConnectionError,
  providerFetch,
  readProviderJson,
} from "@/lib/server/providers/http";

export type NavidromeConnection = {
  url: string;
  username: string;
  password: string;
};

export type NavidromeAlbum = {
  id: string;
  name: string;
  artist: string;
  year: number | null;
  songCount: number;
  musicBrainzId: string | null;
};

type SubsonicResponse = {
  "subsonic-response"?: {
    status?: unknown;
    error?: { message?: unknown };
    albumList2?: { album?: unknown };
  };
};

function requestUrl(
  connection: NavidromeConnection,
  resource: string,
  params: Record<string, string | number> = {},
) {
  const salt = randomBytes(8).toString("hex");
  const token = createHash("md5")
    .update(`${connection.password}${salt}`)
    .digest("hex");
  const url = new URL(connection.url);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/rest/${resource}.view`;
  url.search = "";
  url.searchParams.set("u", connection.username);
  url.searchParams.set("t", token);
  url.searchParams.set("s", salt);
  url.searchParams.set("v", "1.16.1");
  url.searchParams.set("c", "Composeerr");
  url.searchParams.set("f", "json");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url;
}

async function requestSubsonic(
  connection: NavidromeConnection,
  resource: string,
  params?: Record<string, string | number>,
) {
  const response = await providerFetch(
    requestUrl(connection, resource, params),
    { headers: { Accept: "application/json" } },
    "Navidrome",
  );
  const body = (await readProviderJson(response, "Navidrome")) as SubsonicResponse;
  const subsonic = body["subsonic-response"];

  if (subsonic?.status !== "ok") {
    throw new ProviderConnectionError(
      typeof subsonic?.error?.message === "string"
        ? subsonic.error.message
        : "Navidrome rejected the credentials or returned an error.",
    );
  }

  return subsonic;
}

export async function testNavidromeConnection(connection: NavidromeConnection) {
  await requestSubsonic(connection, "ping");
}

export async function getNavidromeAlbums(connection: NavidromeConnection) {
  const albums: NavidromeAlbum[] = [];
  const pageSize = 500;

  for (let offset = 0; offset < 10_000; offset += pageSize) {
    const response = await requestSubsonic(connection, "getAlbumList2", {
      type: "alphabeticalByArtist",
      size: pageSize,
      offset,
    });
    const page = Array.isArray(response.albumList2?.album)
      ? response.albumList2.album
      : [];

    for (const value of page) {
      if (typeof value !== "object" || value === null) continue;
      const album = value as Record<string, unknown>;
      if (typeof album.id !== "string" || typeof album.name !== "string") continue;
      albums.push({
        id: album.id,
        name: album.name,
        artist: typeof album.artist === "string" ? album.artist : "Unknown Artist",
        year: typeof album.year === "number" ? album.year : null,
        songCount: typeof album.songCount === "number" ? album.songCount : 0,
        musicBrainzId:
          typeof album.musicBrainzId === "string" ? album.musicBrainzId : null,
      });
    }

    if (page.length < pageSize) break;
  }

  return albums;
}
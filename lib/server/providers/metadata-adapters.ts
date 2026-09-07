import type {
  DiscoverySearchResult,
  MetadataSearchType,
  MetadataAlbumResult,
  MetadataArtistResult,
  MetadataEnrichment,
} from "@/lib/metadata/types";
import type {
  CredentialProviderAuthMode,
  MetadataProviderKey,
} from "@/lib/providers/types";
import {
  ProviderConnectionError,
  providerFetch,
  readProviderJson,
} from "@/lib/server/providers/http";

const USER_AGENT = "Composeerr/0.1.0 (https://github.com/m0nte1ro/composeerr)";

type MetadataProviderAdapter = {
  name: string;
  test(connection: MetadataProviderConnection): Promise<void>;
  search?: (
    connection: MetadataProviderConnection,
    type: MetadataSearchType,
    query: string,
    limit: number,
  ) => Promise<DiscoverySearchResult[]>;
};

export type MetadataProviderConnection = {
  key: MetadataProviderKey;
  enabled: boolean;
  url: string;
  authMode: CredentialProviderAuthMode;
  nativeSecret: string;
  username: string;
  password: string;
  headerName: string;
  headerSecret: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function appendPath(endpoint: string, path: string) {
  return `${endpoint.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function getHeaders(connection: MetadataProviderConnection) {
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

function getNativeUrl(
  connection: MetadataProviderConnection,
  path: string,
) {
  return appendPath(
    connection.url,
    connection.authMode === "native"
      ? `${encodeURIComponent(connection.nativeSecret)}/${path}`
      : path,
  );
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function plainText(value: unknown) {
  const content = text(value);
  return content
    ? content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || null
    : null;
}

function normalizeMatch(value: unknown) {
  return typeof value === "string"
    ? value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
    : "";
}

function count(value: unknown) {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

const MUSICBRAINZ_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function musicBrainzId(value: unknown) {
  const id = text(value);
  return id && MUSICBRAINZ_ID_PATTERN.test(id) ? id : null;
}

function lastFmArtwork(value: unknown) {
  if (!Array.isArray(value)) return null;

  const images = value.flatMap((image) => {
    if (!isObject(image)) return [];
    const url = text(image["#text"]);
    const size = text(image.size);
    return url ? [{ url, size }] : [];
  });
  const selected = ["extralarge", "large", "medium"].flatMap((size) =>
    images.filter((image) => image.size === size),
  )[0] ?? images.at(-1);

  return selected?.url.includes("2a96cbd8b46e442fc41c2b86b821562f")
    ? null
    : selected?.url ?? null;
}

async function searchLastFm(
  connection: MetadataProviderConnection,
  type: MetadataSearchType,
  query: string,
  limit: number,
) {
  const methodByType = {
    artist: "artist.search",
    album: "album.search",
    song: "track.search",
  } as const;
  const parameterByType = {
    artist: "artist",
    album: "album",
    song: "track",
  } as const;
  const url = new URL(connection.url);
  url.searchParams.set("method", methodByType[type]);
  url.searchParams.set(parameterByType[type], query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("page", "1");

  if (connection.authMode === "native") {
    url.searchParams.set("api_key", connection.nativeSecret);
  }

  const data = await requestJson(connection, url);
  if (!isObject(data) || "error" in data) {
    throw new ProviderConnectionError("Last.fm search failed.");
  }

  const results = isObject(data.results) ? data.results : null;
  const matchesKey = type === "artist"
    ? "artistmatches"
    : type === "album"
      ? "albummatches"
      : "trackmatches";
  const itemKey = type === "artist" ? "artist" : type === "album" ? "album" : "track";
  const matches = results && isObject(results[matchesKey])
    ? results[matchesKey]
    : null;
  const items = matches && Array.isArray(matches[itemKey]) ? matches[itemKey] : [];

  const discovered = items.flatMap((item, index): Array<{
    result: DiscoverySearchResult;
    index: number;
  }> => {
    if (!isObject(item)) return [];

    const name = text(item.name);
    const artist = text(item.artist);
    if (!name || (type !== "artist" && !artist)) return [];

    const shared = {
      source: "lastfm" as const,
      canonical: false,
      sourceId: text(item.url),
      musicBrainzId: musicBrainzId(item.mbid),
      artworkUrl: lastFmArtwork(item.image),
      listeners: count(item.listeners),
    };

    if (type === "artist") {
      return [{ result: { kind: "artist", name, ...shared }, index }];
    }

    return [{ result: { kind: type, title: name, artist: artist!, ...shared }, index }];
  });

  if (type !== "album") {
    discovered.sort((left, right) =>
      (right.result.listeners ?? -1) - (left.result.listeners ?? -1) ||
      left.index - right.index,
    );
  }

  return discovered.map(({ result }) => result);
}

async function requestJson(
  connection: MetadataProviderConnection,
  url: URL | string,
) {
  const headers = getHeaders(connection);

  if (connection.key === "discogs" && connection.authMode === "native") {
    headers.Authorization = `Discogs token=${connection.nativeSecret}`;
  }

  const response = await providerFetch(url, { headers }, getMetadataProviderName(connection.key));

  if (response.status === 404) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }

  return readProviderJson(response, getMetadataProviderName(connection.key));
}

async function enrichLastFm(
  connection: MetadataProviderConnection,
  entity: MetadataArtistResult | MetadataAlbumResult,
): Promise<MetadataEnrichment | null> {
  const url = new URL(connection.url);
  url.searchParams.set("method", entity.kind === "artist" ? "artist.getInfo" : "album.getInfo");
  url.searchParams.set("format", "json");
  url.searchParams.set("autocorrect", "1");
  url.searchParams.set("mbid", entity.id);

  if (entity.kind === "artist") {
    url.searchParams.set("artist", entity.name);
  } else {
    url.searchParams.set("artist", entity.artist);
    url.searchParams.set("album", entity.title);
  }

  if (connection.authMode === "native") {
    url.searchParams.set("api_key", connection.nativeSecret);
  }

  const data = await requestJson(connection, url);
  const root = isObject(data)
    ? entity.kind === "artist" && isObject(data.artist)
      ? data.artist
      : entity.kind === "album" && isObject(data.album)
        ? data.album
        : null
    : null;

  if (!root) return null;
  const bio = isObject(root.bio) ? plainText(root.bio.content) : null;
  const wiki = isObject(root.wiki) ? plainText(root.wiki.content) : null;
  const tagRoot = isObject(root.tags) && Array.isArray(root.tags.tag) ? root.tags.tag : [];
  const tags = tagRoot.flatMap((tag) =>
    isObject(tag) && typeof tag.name === "string" ? [tag.name] : [],
  );
  const stats = isObject(root.stats) ? root.stats : null;

  return {
    description: bio ?? wiki,
    tags,
    listeners: stats ? count(stats.listeners) : null,
    playCount: stats ? count(stats.playcount) : count(root.playcount),
    providerNames: ["Last.fm"],
  };
}

async function enrichDiscogs(
  connection: MetadataProviderConnection,
  entity: MetadataArtistResult | MetadataAlbumResult,
): Promise<MetadataEnrichment | null> {
  const url = new URL(appendPath(connection.url, "database/search"));
  url.searchParams.set("type", entity.kind === "artist" ? "artist" : "release");
  url.searchParams.set("per_page", "1");
  url.searchParams.set("q", entity.kind === "artist" ? entity.name : `${entity.artist} ${entity.title}`);
  const data = await requestJson(connection, url);
  const results = isObject(data) && Array.isArray(data.results) ? data.results : [];
  const first = results.find(isObject);
  if (!first) return null;

  return {
    description: null,
    tags: [...strings(first.genre), ...strings(first.style)],
    listeners: null,
    playCount: null,
    providerNames: ["Discogs"],
  };
}

async function searchAudioDb(
  connection: MetadataProviderConnection,
  entity: MetadataArtistResult | MetadataAlbumResult,
) {
  const path = entity.kind === "artist" ? "search.php" : "searchalbum.php";
  const url = new URL(getNativeUrl(connection, path));
  if (entity.kind === "artist") {
    url.searchParams.set("s", entity.name);
  } else {
    url.searchParams.set("s", entity.artist);
    url.searchParams.set("a", entity.title);
  }
  return requestJson(connection, url);
}

function findAudioDbRecord(
  records: unknown[],
  entity: MetadataArtistResult | MetadataAlbumResult,
) {
  return records.find((value): value is Record<string, unknown> => {
    if (!isObject(value)) {
      return false;
    }

    if (
      normalizeMatch(value.strMusicBrainzID) === normalizeMatch(entity.id)
    ) {
      return true;
    }

    if (entity.kind === "artist") {
      return normalizeMatch(value.strArtist) === normalizeMatch(entity.name);
    }

    return (
      normalizeMatch(value.strArtist) === normalizeMatch(entity.artist) &&
      normalizeMatch(value.strAlbum) === normalizeMatch(entity.title)
    );
  });
}

async function enrichAudioDb(
  connection: MetadataProviderConnection,
  entity: MetadataArtistResult | MetadataAlbumResult,
): Promise<MetadataEnrichment | null> {
  const data = await searchAudioDb(connection, entity);
  const records = isObject(data)
    ? entity.kind === "artist" && Array.isArray(data.artists)
      ? data.artists
      : entity.kind === "album" && Array.isArray(data.album)
        ? data.album
        : []
    : [];
  const record = findAudioDbRecord(records, entity);
  if (!record) return null;

  return {
    description:
      plainText(record.strBiographyEN) ?? plainText(record.strDescriptionEN),
    tags: [text(record.strGenre), text(record.strStyle)].filter(
      (value): value is string => Boolean(value),
    ),
    listeners: null,
    playCount: null,
    providerNames: ["TheAudioDB"],
  };
}

export async function enrichMetadataProvider(
  connection: MetadataProviderConnection,
  entity: MetadataArtistResult | MetadataAlbumResult,
) {
  if (connection.key === "lastfm") return enrichLastFm(connection, entity);
  if (connection.key === "discogs") return enrichDiscogs(connection, entity);
  return enrichAudioDb(connection, entity);
}

export async function resolveAudioDbArtwork(
  connection: MetadataProviderConnection,
  entity: MetadataArtistResult | MetadataAlbumResult,
) {
  if (connection.key !== "theaudiodb") return null;
  const data = await searchAudioDb(connection, entity);
  const records = isObject(data)
    ? entity.kind === "artist" && Array.isArray(data.artists)
      ? data.artists
      : entity.kind === "album" && Array.isArray(data.album)
        ? data.album
        : []
    : [];
  const record = findAudioDbRecord(records, entity);
  if (!record) return null;
  return text(entity.kind === "artist" ? record.strArtistThumb : record.strAlbumThumb);
}

const adapters: Record<MetadataProviderKey, MetadataProviderAdapter> = {
  lastfm: {
    name: "Last.fm",
    search: searchLastFm,
    async test(connection) {
      const url = new URL(connection.url);
      url.searchParams.set("method", "artist.getInfo");
      url.searchParams.set("artist", "Cher");
      url.searchParams.set("format", "json");

      if (connection.authMode === "native") {
        url.searchParams.set("api_key", connection.nativeSecret);
      }

      const response = await providerFetch(
        url,
        { headers: getHeaders(connection) },
        "Last.fm",
      );
      const data = await readProviderJson(response, "Last.fm");

      if (!isObject(data) || "error" in data || !isObject(data.artist)) {
        throw new ProviderConnectionError("Last.fm rejected the API request.");
      }
    },
  },
  discogs: {
    name: "Discogs",
    async test(connection) {
      const headers = getHeaders(connection);

      if (connection.authMode === "native") {
        headers.Authorization = `Discogs token=${connection.nativeSecret}`;
      }

      const response = await providerFetch(
        appendPath(connection.url, "oauth/identity"),
        { headers },
        "Discogs",
      );
      const data = await readProviderJson(response, "Discogs");

      if (!isObject(data) || typeof data.username !== "string") {
        throw new ProviderConnectionError("Discogs returned an invalid identity response.");
      }
    },
  },
  theaudiodb: {
    name: "TheAudioDB",
    async test(connection) {
      const path =
        connection.authMode === "native"
          ? `${encodeURIComponent(connection.nativeSecret)}/search.php`
          : "search.php";
      const url = new URL(
        appendPath(connection.url, path),
      );
      url.searchParams.set("s", "coldplay");

      const response = await providerFetch(
        url,
        { headers: getHeaders(connection) },
        "TheAudioDB",
      );
      const data = await readProviderJson(response, "TheAudioDB");

      if (!isObject(data) || !Array.isArray(data.artists)) {
        throw new ProviderConnectionError("TheAudioDB rejected the API request.");
      }
    },
  },
};

export function getMetadataProviderName(key: MetadataProviderKey) {
  return adapters[key].name;
}

export function supportsMetadataDiscoveryProvider(key: MetadataProviderKey) {
  return Boolean(adapters[key].search);
}

export async function searchMetadataDiscoveryProvider(
  connection: MetadataProviderConnection,
  type: MetadataSearchType,
  query: string,
  limit = 25,
) {
  const search = adapters[connection.key].search;
  if (!search) {
    throw new ProviderConnectionError(
      `${getMetadataProviderName(connection.key)} does not support discovery search.`,
    );
  }

  return search(connection, type, query, limit);
}

export async function testMetadataProviderConnection(
  connection: MetadataProviderConnection,
) {
  await adapters[connection.key].test(connection);
}

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

const adapters: Record<MetadataProviderKey, MetadataProviderAdapter> = {
  lastfm: {
    name: "Last.fm",
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

export async function testMetadataProviderConnection(
  connection: MetadataProviderConnection,
) {
  await adapters[connection.key].test(connection);
}

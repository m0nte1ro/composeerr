import { createHash } from "node:crypto";

import {
  DEFAULT_MUSICBRAINZ_URL,
  type MusicBrainzAuthMode,
  type MusicBrainzSettingsPayload,
  type PublicMusicBrainzSettings,
} from "@/lib/content/musicbrainz-settings";
import { db } from "@/lib/server/db";

export type MusicBrainzScope = "content" | "search";
const settingsKey = (scope: MusicBrainzScope) => `${scope}.musicbrainz`;
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

type StoredMusicBrainzSettings = {
  url: string;
  authMode: MusicBrainzAuthMode;
  username: string;
  password: string;
  headerName: string;
  headerSecret: string;
};

export type MusicBrainzConnection = StoredMusicBrainzSettings;

type SettingRow = {
  value: string;
};

export class MusicBrainzSettingsError extends Error {}

function getDefaultSettings(): StoredMusicBrainzSettings {
  return {
    url: DEFAULT_MUSICBRAINZ_URL,
    authMode: "none",
    username: "",
    password: "",
    headerName: "",
    headerSecret: "",
  };
}

export function normalizeMusicBrainzUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");

  if (!trimmed) {
    throw new MusicBrainzSettingsError("MusicBrainz endpoint is required.");
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new MusicBrainzSettingsError("Enter a valid MusicBrainz endpoint URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new MusicBrainzSettingsError(
      "MusicBrainz endpoint must use HTTP or HTTPS.",
    );
  }

  if (url.username || url.password) {
    throw new MusicBrainzSettingsError(
      "Configure credentials with an authentication mode, not in the endpoint URL.",
    );
  }

  return trimmed;
}

function isAuthMode(value: unknown): value is MusicBrainzAuthMode {
  return value === "none" || value === "basic" || value === "header";
}

function parseStoredSettings(value: string): StoredMusicBrainzSettings | null {
  try {
    const parsed = JSON.parse(value) as Partial<StoredMusicBrainzSettings>;

    if (typeof parsed.url !== "string" || !isAuthMode(parsed.authMode)) {
      return null;
    }

    return {
      url: normalizeMusicBrainzUrl(parsed.url),
      authMode: parsed.authMode,
      username: typeof parsed.username === "string" ? parsed.username : "",
      password: typeof parsed.password === "string" ? parsed.password : "",
      headerName: typeof parsed.headerName === "string" ? parsed.headerName : "",
      headerSecret:
        typeof parsed.headerSecret === "string" ? parsed.headerSecret : "",
    };
  } catch {
    return null;
  }
}

export function getStoredMusicBrainzSettings(scope: MusicBrainzScope = "content"): StoredMusicBrainzSettings | null {
  const row = db
    .prepare(
      `
        SELECT value
        FROM app_settings
        WHERE key = ?
      `,
    )
    .get(settingsKey(scope)) as SettingRow | undefined;

  return row ? parseStoredSettings(row.value) : null;
}

export function usesSearchMusicBrainz() {
  return (db.prepare("SELECT value FROM app_settings WHERE key = 'content.use_search'").get() as SettingRow | undefined)?.value === "true";
}

export function getMusicBrainzConnection(scope: MusicBrainzScope = "content"): MusicBrainzConnection {
  return getStoredMusicBrainzSettings(scope === "content" && usesSearchMusicBrainz() ? "search" : scope) ?? getDefaultSettings();
}

function toPublicSettings(
  settings: StoredMusicBrainzSettings,
  customized: boolean,
): PublicMusicBrainzSettings {
  return {
    available: true,
    customized,
    url: settings.url,
    authMode: settings.authMode,
    username: settings.authMode === "basic" ? settings.username : "",
    headerName: settings.authMode === "header" ? settings.headerName : "",
    hasPassword: settings.authMode === "basic" && Boolean(settings.password),
    hasHeaderSecret:
      settings.authMode === "header" && Boolean(settings.headerSecret),
  };
}

export function getPublicMusicBrainzSettings(scope: MusicBrainzScope = "content"): PublicMusicBrainzSettings {
  const stored = getStoredMusicBrainzSettings(scope);

  return toPublicSettings(stored ?? getDefaultSettings(), Boolean(stored));
}

export function resolveMusicBrainzSettings(
  payload: MusicBrainzSettingsPayload,
  scope: MusicBrainzScope = "content",
): StoredMusicBrainzSettings {
  const existing = getStoredMusicBrainzSettings(scope);
  const authMode = payload?.authMode;

  if (!isAuthMode(authMode)) {
    throw new MusicBrainzSettingsError("Choose a valid authentication mode.");
  }

  const settings: StoredMusicBrainzSettings = {
    url: normalizeMusicBrainzUrl(
      typeof payload?.url === "string" ? payload.url : "",
    ),
    authMode,
    username: "",
    password: "",
    headerName: "",
    headerSecret: "",
  };

  if (authMode === "basic") {
    settings.username =
      typeof payload.username === "string" ? payload.username.trim() : "";
    settings.password =
      typeof payload.password === "string"
        ? payload.password
        : existing?.authMode === "basic"
          ? existing.password
          : "";

    if (!settings.username) {
      throw new MusicBrainzSettingsError("Basic Auth username is required.");
    }

    if (!settings.password) {
      throw new MusicBrainzSettingsError("Basic Auth password is required.");
    }
  }

  if (authMode === "header") {
    settings.headerName =
      typeof payload.headerName === "string" ? payload.headerName.trim() : "";
    settings.headerSecret =
      typeof payload.headerSecret === "string"
        ? payload.headerSecret
        : existing?.authMode === "header"
          ? existing.headerSecret
          : "";

    if (!settings.headerName) {
      throw new MusicBrainzSettingsError("Header name is required.");
    }

    if (!HEADER_NAME_PATTERN.test(settings.headerName)) {
      throw new MusicBrainzSettingsError("Enter a valid HTTP header name.");
    }

    if (!settings.headerSecret) {
      throw new MusicBrainzSettingsError("API key / header value is required.");
    }
  }

  return settings;
}

export function saveMusicBrainzSettings(payload: MusicBrainzSettingsPayload, scope: MusicBrainzScope = "content") {
  const settings = resolveMusicBrainzSettings(payload, scope);

  db.prepare(
    `
      INSERT INTO app_settings (
        key,
        value,
        updated_at
      )
      VALUES (?, ?, CURRENT_TIMESTAMP)

      ON CONFLICT(key)
      DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `,
  ).run(settingsKey(scope), JSON.stringify(settings));

  return toPublicSettings(settings, true);
}

export function resetMusicBrainzSettings(scope: MusicBrainzScope = "content") {
  db.prepare("DELETE FROM app_settings WHERE key = ?").run(settingsKey(scope));
  return getPublicMusicBrainzSettings(scope);
}

export function getMusicBrainzCacheNamespace(
  connection: MusicBrainzConnection,
) {
  return createHash("sha256")
    .update(JSON.stringify(connection))
    .digest("hex");
}

export function getMusicBrainzHeaders(connection: MusicBrainzConnection) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "Composeerr/0.1.0 (https://github.com/m0nte1ro/composeerr)",
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

export async function testResolvedMusicBrainzConnection(
  connection: MusicBrainzConnection,
  scope: MusicBrainzScope = "content",
) {
  const probeId = "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d";
  const url = new URL(connection.url + (scope === "search" ? "/artist/" : `/artist/${probeId}`));
  if (scope === "search") {
    url.searchParams.set("query", "artist:Beatles");
    url.searchParams.set("limit", "1");
  }
  url.searchParams.set("fmt", "json");

  let response: Response;

  try {
    response = await fetch(url, {
      headers: getMusicBrainzHeaders(connection),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new MusicBrainzSettingsError(
      "Could not reach the MusicBrainz Web Service endpoint.",
    );
  }

  if (response.status === 401 || response.status === 403) {
    await response.body?.cancel().catch(() => undefined);
    throw new MusicBrainzSettingsError("MusicBrainz authentication was rejected.");
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new MusicBrainzSettingsError(
      "The endpoint did not return a successful MusicBrainz response.",
    );
  }

  try {
    const data = (await response.json()) as { artists?: unknown; id?: string; name?: string };

    if (scope === "search" ? !Array.isArray(data.artists) : data.id !== probeId || typeof data.name !== "string") {
      throw new Error("Invalid MusicBrainz response shape.");
    }
  } catch {
    throw new MusicBrainzSettingsError(
      "The endpoint did not return a valid MusicBrainz response.",
    );
  }
}

export function testMusicBrainzConnection(
  payload: MusicBrainzSettingsPayload,
) {
  return testResolvedMusicBrainzConnection(payload.useSearchSettings ? getMusicBrainzConnection("search") : resolveMusicBrainzSettings(payload));
}

export function testCurrentMusicBrainzConnection() {
  return testResolvedMusicBrainzConnection(getMusicBrainzConnection());
}

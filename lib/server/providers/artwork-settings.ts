import type {
  ArtworkAuthMode,
  ArtworkProviderPayload,
  ArtworkSettings,
  CredentialProviderAuthMode,
} from "@/lib/providers/types";
import {
  DEFAULT_COVER_ART_ARCHIVE_URL,
  DEFAULT_FANART_URL,
} from "@/lib/providers/types";
import { db } from "@/lib/server/db";
import {
  getStoredMetadataProvider,
} from "@/lib/server/providers/metadata-settings";
import {
  type FanartConnection,
  testCoverArtArchiveConnection,
  testFanartConnection,
} from "@/lib/server/providers/artwork-adapters";
import { testMetadataProviderConnection } from "@/lib/server/providers/metadata-adapters";

const COVER_ART_KEY = "provider.cover-art-archive";
const FANART_KEY = "provider.fanart";
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

type StoredCoverArtArchive = {
  enabled: boolean;
  url: string;
  authMode: ArtworkAuthMode;
  username: string;
  password: string;
  headerName: string;
  headerSecret: string;
};

type StoredFanart = FanartConnection;

type SettingRow = { value: string };

export class ArtworkProviderSettingsError extends Error {}

function isAuthMode(value: unknown): value is ArtworkAuthMode {
  return value === "none" || value === "basic" || value === "header";
}

function isCredentialAuthMode(
  value: unknown,
): value is CredentialProviderAuthMode {
  return value === "native" || isAuthMode(value);
}

function normalizeProviderUrl(value: unknown, providerName: string) {
  const trimmed = typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";

  if (!trimmed) {
    throw new ArtworkProviderSettingsError(`${providerName} endpoint is required.`);
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new ArtworkProviderSettingsError(`Enter a valid ${providerName} endpoint URL.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ArtworkProviderSettingsError(
      `${providerName} endpoint must use HTTP or HTTPS.`,
    );
  }

  if (url.username || url.password) {
    throw new ArtworkProviderSettingsError(
      `Do not include credentials in the ${providerName} endpoint URL.`,
    );
  }

  return trimmed;
}

function readSetting(key: string) {
  return db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(key) as SettingRow | undefined;
}

function writeSetting(key: string, value: unknown) {
  db.prepare(
    `
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `,
  ).run(key, JSON.stringify(value));
}

function getDefaultCoverArtArchiveSettings(): StoredCoverArtArchive {
  return {
    enabled: true,
    url: DEFAULT_COVER_ART_ARCHIVE_URL,
    authMode: "none",
    username: "",
    password: "",
    headerName: "",
    headerSecret: "",
  };
}

function getStoredCoverArtArchiveSettings(): StoredCoverArtArchive | null {
  const row = readSetting(COVER_ART_KEY);

  if (!row) {
    return null;
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<StoredCoverArtArchive>;
    const authMode = isAuthMode(parsed.authMode) ? parsed.authMode : "none";

    return {
      enabled: parsed.enabled !== false,
      url:
        typeof parsed.url === "string"
          ? normalizeProviderUrl(parsed.url, "Cover Art Archive")
          : DEFAULT_COVER_ART_ARCHIVE_URL,
      authMode,
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

function getCoverArtArchiveSettings() {
  const stored = getStoredCoverArtArchiveSettings();
  const settings = stored ?? getDefaultCoverArtArchiveSettings();
  const customized =
    settings.url !== DEFAULT_COVER_ART_ARCHIVE_URL ||
    settings.authMode !== "none";

  return { settings, customized };
}

export function getStoredFanartSettings(): StoredFanart | null {
  const row = readSetting(FANART_KEY);

  if (!row) {
    return null;
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<StoredFanart> & {
      secret?: unknown;
    };

    if (typeof parsed.enabled !== "boolean") {
      return null;
    }

    const legacySecret = typeof parsed.secret === "string" ? parsed.secret : "";
    const authMode = isCredentialAuthMode(parsed.authMode)
      ? parsed.authMode
      : "native";

    return {
      enabled: parsed.enabled,
      url:
        typeof parsed.url === "string"
          ? normalizeProviderUrl(parsed.url, "Fanart.tv")
          : DEFAULT_FANART_URL,
      authMode,
      nativeSecret:
        typeof parsed.nativeSecret === "string"
          ? parsed.nativeSecret
          : legacySecret,
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

export function getArtworkSettings(): ArtworkSettings {
  const coverArt = getCoverArtArchiveSettings();
  const fanart = getStoredFanartSettings();
  const theAudioDb = getStoredMetadataProvider("theaudiodb");

  return {
    coverArtArchive: {
      available: true,
      enabled: coverArt.settings.enabled,
      customized: coverArt.customized,
      url: coverArt.settings.url,
      authMode: coverArt.settings.authMode,
      username:
        coverArt.settings.authMode === "basic" ? coverArt.settings.username : "",
      headerName:
        coverArt.settings.authMode === "header" ? coverArt.settings.headerName : "",
      hasPassword:
        coverArt.settings.authMode === "basic" && Boolean(coverArt.settings.password),
      hasHeaderSecret:
        coverArt.settings.authMode === "header" &&
        Boolean(coverArt.settings.headerSecret),
    },
    fanart: fanart
      ? {
          enabled: fanart.enabled,
          url: fanart.url,
          authMode: fanart.authMode,
          username: fanart.authMode === "basic" ? fanart.username : "",
          headerName: fanart.authMode === "header" ? fanart.headerName : "",
          hasApiKey:
            fanart.authMode === "native" && Boolean(fanart.nativeSecret),
          hasNativeSecret:
            fanart.authMode === "native" && Boolean(fanart.nativeSecret),
          hasPassword:
            fanart.authMode === "basic" && Boolean(fanart.password),
          hasHeaderSecret:
            fanart.authMode === "header" && Boolean(fanart.headerSecret),
        }
      : null,
    theAudioDbFallback: {
      configured: Boolean(theAudioDb),
      enabled: Boolean(theAudioDb?.enabled),
    },
  };
}

function resolveCoverArtArchive(
  payload: Extract<ArtworkProviderPayload, { key: "cover-art-archive" }>,
) {
  if (typeof payload.enabled !== "boolean") {
    throw new ArtworkProviderSettingsError("Enabled state is required.");
  }

  if (!isAuthMode(payload.authMode)) {
    throw new ArtworkProviderSettingsError("Choose a valid authentication mode.");
  }

  const existing = getStoredCoverArtArchiveSettings();
  const settings: StoredCoverArtArchive = {
    enabled: payload.enabled,
    url: normalizeProviderUrl(payload.url, "Cover Art Archive"),
    authMode: payload.authMode,
    username: "",
    password: "",
    headerName: "",
    headerSecret: "",
  };

  if (settings.authMode === "basic") {
    settings.username =
      typeof payload.username === "string" ? payload.username.trim() : "";
    settings.password =
      typeof payload.password === "string"
        ? payload.password
        : existing?.authMode === "basic"
          ? existing.password
          : "";

    if (!settings.username) {
      throw new ArtworkProviderSettingsError("Basic Auth username is required.");
    }

    if (!settings.password) {
      throw new ArtworkProviderSettingsError("Basic Auth password is required.");
    }
  }

  if (settings.authMode === "header") {
    settings.headerName =
      typeof payload.headerName === "string" ? payload.headerName.trim() : "";
    settings.headerSecret =
      typeof payload.headerSecret === "string"
        ? payload.headerSecret
        : existing?.authMode === "header"
          ? existing.headerSecret
          : "";

    if (!settings.headerName) {
      throw new ArtworkProviderSettingsError("Header name is required.");
    }

    if (!HEADER_NAME_PATTERN.test(settings.headerName)) {
      throw new ArtworkProviderSettingsError("Enter a valid HTTP header name.");
    }

    if (!settings.headerSecret) {
      throw new ArtworkProviderSettingsError("API key / header value is required.");
    }
  }

  return settings;
}

export function updateCoverArtArchive(
  payload: Extract<ArtworkProviderPayload, { key: "cover-art-archive" }>,
) {
  writeSetting(COVER_ART_KEY, resolveCoverArtArchive(payload));
  return getArtworkSettings();
}

export function resetCoverArtArchive() {
  db.prepare("DELETE FROM app_settings WHERE key = ?").run(COVER_ART_KEY);
  return getArtworkSettings();
}

function resolveFanart(payload: Extract<ArtworkProviderPayload, { key: "fanart" }>) {
  if (typeof payload.enabled !== "boolean") {
    throw new ArtworkProviderSettingsError("Enabled state is required.");
  }

  if (!isCredentialAuthMode(payload.authMode)) {
    throw new ArtworkProviderSettingsError("Choose a valid authentication mode.");
  }

  const existing = getStoredFanartSettings();
  const settings: StoredFanart = {
    enabled: payload.enabled,
    url: normalizeProviderUrl(payload.url, "Fanart.tv"),
    authMode: payload.authMode,
    nativeSecret:
      typeof payload.nativeSecret === "string"
        ? payload.nativeSecret
        : existing?.nativeSecret ?? "",
    username: "",
    password: "",
    headerName: "",
    headerSecret: "",
  };

  if (settings.authMode === "native") {
    if (!settings.nativeSecret) {
      throw new ArtworkProviderSettingsError("Fanart.tv API key is required.");
    }
  }

  if (settings.authMode === "basic") {
    settings.username =
      typeof payload.username === "string" ? payload.username.trim() : "";
    settings.password =
      typeof payload.password === "string"
        ? payload.password
        : existing?.authMode === "basic"
          ? existing.password
          : "";

    if (!settings.username) {
      throw new ArtworkProviderSettingsError("Basic Auth username is required.");
    }

    if (!settings.password) {
      throw new ArtworkProviderSettingsError("Basic Auth password is required.");
    }
  }

  if (settings.authMode === "header") {
    settings.headerName =
      typeof payload.headerName === "string" ? payload.headerName.trim() : "";
    settings.headerSecret =
      typeof payload.headerSecret === "string"
        ? payload.headerSecret
        : existing?.authMode === "header"
          ? existing.headerSecret
          : "";

    if (!settings.headerName) {
      throw new ArtworkProviderSettingsError("Header name is required.");
    }

    if (!HEADER_NAME_PATTERN.test(settings.headerName)) {
      throw new ArtworkProviderSettingsError("Enter a valid HTTP header name.");
    }

    if (!settings.headerSecret) {
      throw new ArtworkProviderSettingsError("API key / header value is required.");
    }
  }

  return settings;
}

export function addFanart(payload: Extract<ArtworkProviderPayload, { key: "fanart" }>) {
  if (getStoredFanartSettings()) {
    throw new ArtworkProviderSettingsError("Fanart.tv is already configured.");
  }

  writeSetting(FANART_KEY, resolveFanart(payload));
  return getArtworkSettings();
}

export function updateFanart(payload: Extract<ArtworkProviderPayload, { key: "fanart" }>) {
  if (!getStoredFanartSettings()) {
    throw new ArtworkProviderSettingsError("Fanart.tv is not configured.");
  }

  writeSetting(FANART_KEY, resolveFanart(payload));
  return getArtworkSettings();
}

export function removeFanart() {
  db.prepare("DELETE FROM app_settings WHERE key = ?").run(FANART_KEY);
  return getArtworkSettings();
}

export async function testArtworkProviderPayload(payload: ArtworkProviderPayload) {
  if (payload?.key === "cover-art-archive") {
    await testCoverArtArchiveConnection(resolveCoverArtArchive(payload));
    return;
  }

  if (payload?.key !== "fanart") {
    throw new ArtworkProviderSettingsError("Choose a valid artwork provider.");
  }

  await testFanartConnection(resolveFanart(payload));
}

export async function checkEnabledArtworkProviders() {
  const checks: Array<{ name: string; run: () => Promise<void> }> = [];
  const coverArt = getCoverArtArchiveSettings().settings;
  const fanart = getStoredFanartSettings();
  const theAudioDb = getStoredMetadataProvider("theaudiodb");

  if (coverArt.enabled) {
    checks.push({
      name: "Cover Art Archive",
      run: () => testCoverArtArchiveConnection(coverArt),
    });
  }

  if (fanart?.enabled) {
    checks.push({ name: "Fanart.tv", run: () => testFanartConnection(fanart) });
  }

  if (theAudioDb?.enabled) {
    checks.push({
      name: "TheAudioDB",
      run: () => testMetadataProviderConnection(theAudioDb),
    });
  }

  if (!checks.length) {
    return { status: "skipped" as const, summary: "No enabled artwork providers." };
  }

  const results = await Promise.allSettled(checks.map((check) => check.run()));
  const failed = results.flatMap((result, index) =>
    result.status === "rejected" ? [checks[index].name] : [],
  );

  if (failed.length) {
    throw new Error(`Health check failed for: ${failed.join(", ")}.`);
  }

  return {
    status: "success" as const,
    summary: `${checks.length} artwork provider${checks.length === 1 ? "" : "s"} healthy.`,
  };
}

import {
  LIBRARY_PROVIDER_KEYS,
  type LibraryProviderKey,
  type LibraryProviderPayload,
  type LibraryProvidersSettings,
  type PublicLibraryProvider,
} from "@/lib/providers/types";
import { getLidarrOptions, getLidarrStatus } from "@/lib/server/lidarr";
import { db } from "@/lib/server/db";
import { getLidarrSettings } from "@/lib/server/lidarr-settings";
import {
  testNavidromeConnection,
  type NavidromeConnection,
} from "@/lib/server/providers/library-adapters";

const ORDER_KEY = "providers.library.order";
const PROVIDER_KEY_PREFIX = "provider.library.";
const DEFAULT_NAVIDROME_URL = "http://localhost:4533";

type StoredLidarrProvider = {
  key: "lidarr";
  enabled: boolean;
};

type StoredNavidromeProvider = NavidromeConnection & {
  key: "navidrome";
  enabled: boolean;
  url: string;
  username: string;
  password: string;
};

type StoredLibraryProvider = StoredLidarrProvider | StoredNavidromeProvider;

type SettingRow = {
  value: string;
};

export class LibraryProviderSettingsError extends Error {}

function isLibraryProviderKey(value: unknown): value is LibraryProviderKey {
  return LIBRARY_PROVIDER_KEYS.includes(value as LibraryProviderKey);
}

function getProviderName(key: LibraryProviderKey) {
  return key === "lidarr" ? "Lidarr" : "Navidrome";
}

function getSettingsKey(key: LibraryProviderKey) {
  return `${PROVIDER_KEY_PREFIX}${key}`;
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

function normalizeNavidromeUrl(value: unknown) {
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (!trimmed) {
    throw new LibraryProviderSettingsError("Navidrome URL is required.");
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new LibraryProviderSettingsError("Enter a valid Navidrome URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new LibraryProviderSettingsError(
      "Navidrome URL must use HTTP or HTTPS.",
    );
  }

  if (url.username || url.password) {
    throw new LibraryProviderSettingsError(
      "Do not include credentials in the Navidrome URL.",
    );
  }

  return trimmed.replace(/\/+$/, "");
}

function hasConfiguredLidarr() {
  const settings = getLidarrSettings();
  return Boolean(settings?.url.trim() && settings.apiKey.trim());
}

function parseProvider(
  key: LibraryProviderKey,
  value: string,
): StoredLibraryProvider | null {
  try {
    const parsed = JSON.parse(value) as Partial<StoredNavidromeProvider>;

    if (typeof parsed.enabled !== "boolean") {
      return null;
    }

    if (key === "lidarr") {
      return { key, enabled: parsed.enabled };
    }

    return {
      key,
      enabled: parsed.enabled,
      url:
        typeof parsed.url === "string"
          ? normalizeNavidromeUrl(parsed.url)
          : DEFAULT_NAVIDROME_URL,
      username: typeof parsed.username === "string" ? parsed.username : "",
      password: typeof parsed.password === "string" ? parsed.password : "",
    };
  } catch {
    return null;
  }
}

function getStoredProvider(key: LibraryProviderKey) {
  const row = readSetting(getSettingsKey(key));
  return row ? parseProvider(key, row.value) : null;
}

export type EnabledLibraryProvider =
  | { key: "lidarr"; url: string; apiKey: string }
  | ({ key: "navidrome" } & NavidromeConnection);

export function getEnabledLibraryProviders(): EnabledLibraryProvider[] {
  return getProviderOrder().reduce<EnabledLibraryProvider[]>((providers, key) => {
    const provider = getStoredProvider(key);
    if (!provider?.enabled) return providers;

    if (provider.key === "lidarr") {
      const settings = getLidarrSettings();
      if (settings?.url.trim() && settings.apiKey.trim()) {
        providers.push({ key: "lidarr", url: settings.url, apiKey: settings.apiKey });
      }
      return providers;
    }

    providers.push({
      key: "navidrome",
      url: provider.url,
      username: provider.username,
      password: provider.password,
    });
    return providers;
  }, []);
}

function getProviderOrder(): LibraryProviderKey[] {
  const row = readSetting(ORDER_KEY);

  if (!row) {
    return [];
  }

  try {
    const parsed = JSON.parse(row.value) as unknown;
    return Array.isArray(parsed)
      ? parsed
          .filter(isLibraryProviderKey)
          .filter((key, index, values) => values.indexOf(key) === index)
      : [];
  } catch {
    return [];
  }
}

function toPublicProvider(
  provider: StoredLibraryProvider,
  order: number,
): PublicLibraryProvider {
  if (provider.key === "lidarr") {
    const lidarr = getLidarrSettings();

    return {
      key: provider.key,
      name: "Lidarr",
      enabled: provider.enabled,
      order,
      configured: hasConfiguredLidarr(),
      url: lidarr?.url ?? "",
      username: "",
      hasPassword: false,
    };
  }

  return {
    key: provider.key,
    name: "Navidrome",
    enabled: provider.enabled,
    order,
    configured: Boolean(provider.url && provider.username && provider.password),
    url: provider.url,
    username: provider.username,
    hasPassword: Boolean(provider.password),
  };
}

export function getLibraryProvidersSettings(): LibraryProvidersSettings {
  const configured = LIBRARY_PROVIDER_KEYS.flatMap((key) => {
    const provider = getStoredProvider(key);
    return provider ? [provider] : [];
  });
  const savedOrder = getProviderOrder();
  const order = [
    ...savedOrder.filter((key) => configured.some((item) => item.key === key)),
    ...configured
      .map((provider) => provider.key)
      .filter((key) => !savedOrder.includes(key)),
  ];

  return {
    providers: order.flatMap((key, index) => {
      const provider = configured.find((item) => item.key === key);
      return provider ? [toPublicProvider(provider, index + 1)] : [];
    }),
    availableProviders: LIBRARY_PROVIDER_KEYS.filter(
      (key) => !configured.some((provider) => provider.key === key),
    ),
  };
}

function resolvePayload(
  payload: LibraryProviderPayload,
  existing: StoredLibraryProvider | null,
): StoredLibraryProvider {
  if (!isLibraryProviderKey(payload?.key)) {
    throw new LibraryProviderSettingsError("Choose a valid Library provider.");
  }

  if (typeof payload.enabled !== "boolean") {
    throw new LibraryProviderSettingsError("Enabled state is required.");
  }

  if (payload.key === "lidarr") {
    if (!hasConfiguredLidarr()) {
      throw new LibraryProviderSettingsError(
        "Configure Lidarr in Lidarr Settings before adding it as a Library provider.",
      );
    }

    return { key: payload.key, enabled: payload.enabled };
  }

  const existingNavidrome = existing?.key === "navidrome" ? existing : null;
  const username = typeof payload.username === "string" ? payload.username.trim() : "";
  const password =
    typeof payload.password === "string"
      ? payload.password
      : existingNavidrome?.password ?? "";

  if (!username) {
    throw new LibraryProviderSettingsError("Navidrome username is required.");
  }

  if (!password) {
    throw new LibraryProviderSettingsError("Navidrome password is required.");
  }

  return {
    key: payload.key,
    enabled: payload.enabled,
    url: normalizeNavidromeUrl(payload.url),
    username,
    password,
  };
}

export function addLibraryProvider(payload: LibraryProviderPayload) {
  if (!isLibraryProviderKey(payload?.key)) {
    throw new LibraryProviderSettingsError("Choose a valid Library provider.");
  }

  if (getStoredProvider(payload.key)) {
    throw new LibraryProviderSettingsError(
      `${getProviderName(payload.key)} is already configured.`,
    );
  }

  const provider = resolvePayload(payload, null);
  const transaction = db.transaction(() => {
    writeSetting(getSettingsKey(provider.key), provider);
    writeSetting(ORDER_KEY, [...getProviderOrder(), provider.key]);
  });

  transaction();
  return getLibraryProvidersSettings();
}

export function updateLibraryProvider(payload: LibraryProviderPayload) {
  if (!isLibraryProviderKey(payload?.key)) {
    throw new LibraryProviderSettingsError("Choose a valid Library provider.");
  }

  const existing = getStoredProvider(payload.key);

  if (!existing) {
    throw new LibraryProviderSettingsError("Library provider is not configured.");
  }

  writeSetting(getSettingsKey(payload.key), resolvePayload(payload, existing));
  return getLibraryProvidersSettings();
}

export function removeLibraryProvider(key: unknown) {
  if (!isLibraryProviderKey(key)) {
    throw new LibraryProviderSettingsError("Choose a valid Library provider.");
  }

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM app_settings WHERE key = ?").run(getSettingsKey(key));
    writeSetting(
      ORDER_KEY,
      getProviderOrder().filter((providerKey) => providerKey !== key),
    );
  });

  transaction();
  return getLibraryProvidersSettings();
}

async function testLidarrProvider() {
  const settings = getLidarrSettings();

  if (!settings?.url.trim() || !settings.apiKey.trim()) {
    throw new LibraryProviderSettingsError(
      "Configure Lidarr in Lidarr Settings before testing this provider.",
    );
  }

  await Promise.all([
    getLidarrStatus({ url: settings.url, apiKey: settings.apiKey }),
    getLidarrOptions({ url: settings.url, apiKey: settings.apiKey }),
  ]);
}

async function testNavidromeProvider(provider: StoredNavidromeProvider) {
  await testNavidromeConnection(provider);
}

export async function testLibraryProviderPayload(
  payload: LibraryProviderPayload,
) {
  if (!isLibraryProviderKey(payload?.key)) {
    throw new LibraryProviderSettingsError("Choose a valid Library provider.");
  }

  if (payload.key === "lidarr") {
    await testLidarrProvider();
    return;
  }

  const provider = resolvePayload(payload, getStoredProvider(payload.key));
  await testNavidromeProvider(provider as StoredNavidromeProvider);
}
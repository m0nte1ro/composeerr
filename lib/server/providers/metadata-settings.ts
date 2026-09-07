import {
  DEFAULT_METADATA_PROVIDER_URLS,
  METADATA_PROVIDER_KEYS,
  type CredentialProviderAuthMode,
  type MetadataProviderKey,
  type MetadataProviderPayload,
  type MetadataProvidersSettings,
  type PublicMetadataProvider,
} from "@/lib/providers/types";
import { db } from "@/lib/server/db";
import {
  getMetadataProviderName,
  type MetadataProviderConnection,
  testMetadataProviderConnection,
} from "@/lib/server/providers/metadata-adapters";

const ORDER_KEY = "providers.metadata.order";
const PROVIDER_KEY_PREFIX = "provider.";
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

type StoredMetadataProvider = MetadataProviderConnection;

type SettingRow = {
  value: string;
};

export class MetadataProviderSettingsError extends Error {}

function isAuthMode(value: unknown): value is CredentialProviderAuthMode {
  return (
    value === "native" ||
    value === "none" ||
    value === "basic" ||
    value === "header"
  );
}

function isMetadataProviderKey(value: unknown): value is MetadataProviderKey {
  return METADATA_PROVIDER_KEYS.includes(value as MetadataProviderKey);
}

function getSettingsKey(key: MetadataProviderKey) {
  return `${PROVIDER_KEY_PREFIX}${key}`;
}

function normalizeProviderUrl(value: unknown, providerName: string) {
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (!trimmed) {
    throw new MetadataProviderSettingsError(`${providerName} endpoint is required.`);
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new MetadataProviderSettingsError(
      `Enter a valid ${providerName} endpoint URL.`,
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new MetadataProviderSettingsError(
      `${providerName} endpoint must use HTTP or HTTPS.`,
    );
  }

  if (url.username || url.password) {
    throw new MetadataProviderSettingsError(
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

function parseProvider(
  key: MetadataProviderKey,
  value: string,
): StoredMetadataProvider | null {
  try {
    const parsed = JSON.parse(value) as Partial<StoredMetadataProvider> & {
      secret?: unknown;
    };

    if (typeof parsed.enabled !== "boolean") {
      return null;
    }

    const legacySecret = typeof parsed.secret === "string" ? parsed.secret : "";
    const authMode = isAuthMode(parsed.authMode) ? parsed.authMode : "native";

    return {
      key,
      enabled: parsed.enabled,
      url:
        typeof parsed.url === "string"
          ? normalizeProviderUrl(parsed.url, getMetadataProviderName(key))
          : DEFAULT_METADATA_PROVIDER_URLS[key],
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

export function getStoredMetadataProvider(key: MetadataProviderKey) {
  const row = readSetting(getSettingsKey(key));
  return row ? parseProvider(key, row.value) : null;
}

function getProviderOrder(): MetadataProviderKey[] {
  const row = readSetting(ORDER_KEY);

  if (!row) {
    return [];
  }

  try {
    const parsed = JSON.parse(row.value) as unknown;

    return Array.isArray(parsed)
      ? parsed.filter(isMetadataProviderKey).filter(
          (key, index, values) => values.indexOf(key) === index,
        )
      : [];
  } catch {
    return [];
  }
}

function toPublicProvider(
  provider: StoredMetadataProvider,
  order: number,
): PublicMetadataProvider {
  return {
    key: provider.key,
    name: getMetadataProviderName(provider.key),
    enabled: provider.enabled,
    order,
    url: provider.url,
    authMode: provider.authMode,
    username: provider.authMode === "basic" ? provider.username : "",
    headerName: provider.authMode === "header" ? provider.headerName : "",
    hasApiKey:
      provider.authMode === "native" &&
      provider.key !== "discogs" &&
      Boolean(provider.nativeSecret),
    hasToken:
      provider.authMode === "native" &&
      provider.key === "discogs" &&
      Boolean(provider.nativeSecret),
    hasNativeSecret:
      provider.authMode === "native" && Boolean(provider.nativeSecret),
    hasPassword:
      provider.authMode === "basic" && Boolean(provider.password),
    hasHeaderSecret:
      provider.authMode === "header" && Boolean(provider.headerSecret),
  };
}

export function getMetadataProvidersSettings(): MetadataProvidersSettings {
  const configured = METADATA_PROVIDER_KEYS.flatMap((key) => {
    const provider = getStoredMetadataProvider(key);
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
    availableProviders: METADATA_PROVIDER_KEYS.filter(
      (key) => !configured.some((provider) => provider.key === key),
    ),
  };
}

export function getEnabledMetadataProviders(): MetadataProviderConnection[] {
  const settings = getMetadataProvidersSettings();

  return settings.providers.flatMap((provider) => {
    if (!provider.enabled) {
      return [];
    }

    const stored = getStoredMetadataProvider(provider.key);
    return stored ? [stored] : [];
  });
}

function resolvePayload(
  payload: MetadataProviderPayload,
  existing: StoredMetadataProvider | null,
): StoredMetadataProvider {
  if (!isMetadataProviderKey(payload?.key)) {
    throw new MetadataProviderSettingsError("Choose a valid metadata provider.");
  }

  if (typeof payload.enabled !== "boolean") {
    throw new MetadataProviderSettingsError("Enabled state is required.");
  }

  if (!isAuthMode(payload.authMode)) {
    throw new MetadataProviderSettingsError("Choose a valid authentication mode.");
  }

  const name = getMetadataProviderName(payload.key);
  const provider: StoredMetadataProvider = {
    key: payload.key,
    enabled: payload.enabled,
    url: normalizeProviderUrl(payload.url, name),
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

  if (provider.authMode === "native") {
    if (!provider.nativeSecret) {
      throw new MetadataProviderSettingsError(`${name} credentials are required.`);
    }
  }

  if (provider.authMode === "basic") {
    provider.username =
      typeof payload.username === "string" ? payload.username.trim() : "";
    provider.password =
      typeof payload.password === "string"
        ? payload.password
        : existing?.authMode === "basic"
          ? existing.password
          : "";

    if (!provider.username) {
      throw new MetadataProviderSettingsError("Basic Auth username is required.");
    }

    if (!provider.password) {
      throw new MetadataProviderSettingsError("Basic Auth password is required.");
    }
  }

  if (provider.authMode === "header") {
    provider.headerName =
      typeof payload.headerName === "string" ? payload.headerName.trim() : "";
    provider.headerSecret =
      typeof payload.headerSecret === "string"
        ? payload.headerSecret
        : existing?.authMode === "header"
          ? existing.headerSecret
          : "";

    if (!provider.headerName) {
      throw new MetadataProviderSettingsError("Header name is required.");
    }

    if (!HEADER_NAME_PATTERN.test(provider.headerName)) {
      throw new MetadataProviderSettingsError("Enter a valid HTTP header name.");
    }

    if (!provider.headerSecret) {
      throw new MetadataProviderSettingsError("API key / header value is required.");
    }
  }

  return provider;
}

export function addMetadataProvider(payload: MetadataProviderPayload) {
  if (!isMetadataProviderKey(payload?.key)) {
    throw new MetadataProviderSettingsError("Choose a valid metadata provider.");
  }

  if (getStoredMetadataProvider(payload.key)) {
    throw new MetadataProviderSettingsError(
      `${getMetadataProviderName(payload.key)} is already configured.`,
    );
  }

  const provider = resolvePayload(payload, null);
  const transaction = db.transaction(() => {
    writeSetting(getSettingsKey(provider.key), provider);
    writeSetting(ORDER_KEY, [...getProviderOrder(), provider.key]);
  });

  transaction();
  return getMetadataProvidersSettings();
}

export function updateMetadataProvider(payload: MetadataProviderPayload) {
  if (!isMetadataProviderKey(payload?.key)) {
    throw new MetadataProviderSettingsError("Choose a valid metadata provider.");
  }

  const existing = getStoredMetadataProvider(payload.key);

  if (!existing) {
    throw new MetadataProviderSettingsError("Metadata provider is not configured.");
  }

  writeSetting(getSettingsKey(payload.key), resolvePayload(payload, existing));
  return getMetadataProvidersSettings();
}

export function removeMetadataProvider(key: unknown) {
  if (!isMetadataProviderKey(key)) {
    throw new MetadataProviderSettingsError("Choose a valid metadata provider.");
  }

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM app_settings WHERE key = ?").run(getSettingsKey(key));
    writeSetting(
      ORDER_KEY,
      getProviderOrder().filter((providerKey) => providerKey !== key),
    );
  });

  transaction();
  return getMetadataProvidersSettings();
}

export async function testMetadataProviderPayload(payload: MetadataProviderPayload) {
  if (!isMetadataProviderKey(payload?.key)) {
    throw new MetadataProviderSettingsError("Choose a valid metadata provider.");
  }

  const connection = resolvePayload(payload, getStoredMetadataProvider(payload.key));
  await testMetadataProviderConnection(connection);
}

export async function checkEnabledMetadataProviders() {
  const providers = METADATA_PROVIDER_KEYS.flatMap((key) => {
    const provider = getStoredMetadataProvider(key);
    return provider?.enabled ? [provider] : [];
  });

  if (!providers.length) {
    return { status: "skipped" as const, summary: "No enabled metadata providers." };
  }

  const results = await Promise.allSettled(
    providers.map((provider) => testMetadataProviderConnection(provider)),
  );
  const failed = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [getMetadataProviderName(providers[index].key)]
      : [],
  );

  if (failed.length) {
    throw new Error(`Health check failed for: ${failed.join(", ")}.`);
  }

  return {
    status: "success" as const,
    summary: `${providers.length} metadata provider${providers.length === 1 ? "" : "s"} healthy.`,
  };
}

import { db } from "@/lib/server/db";

const SETTINGS_KEY = "lidarr";

export type LidarrSettings = {
  url: string;
  apiKey: string;

  rootFolderId: number | null;
  qualityProfileId: number | null;
  metadataProfileId: number | null;

  searchAfterAdd: boolean;
};

export type PublicLidarrSettings = Omit<
  LidarrSettings,
  "apiKey"
> & {
  configured: boolean;
  hasApiKey: boolean;
};

type SettingRow = {
  value: string;
};

export function getLidarrSettings(): LidarrSettings | null {
  const row = db
    .prepare(
      `
        SELECT value
        FROM app_settings
        WHERE key = ?
      `,
    )
    .get(SETTINGS_KEY) as SettingRow | undefined;

  if (!row) {
    return null;
  }

  try {
    return JSON.parse(row.value) as LidarrSettings;
  } catch {
    return null;
  }
}

export function saveLidarrSettings(
  settings: LidarrSettings,
) {
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
  ).run(
    SETTINGS_KEY,
    JSON.stringify(settings),
  );
}

export function getPublicLidarrSettings():
  | PublicLidarrSettings
  | null {
  const settings = getLidarrSettings();

  if (!settings) {
    return null;
  }

  return {
    configured: true,
    hasApiKey: Boolean(settings.apiKey),

    url: settings.url,

    rootFolderId: settings.rootFolderId,
    qualityProfileId: settings.qualityProfileId,
    metadataProfileId: settings.metadataProfileId,

    searchAfterAdd: settings.searchAfterAdd,
  };
}

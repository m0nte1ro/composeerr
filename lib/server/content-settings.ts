import type { MusicBrainzSettingsPayload } from "@/lib/content/musicbrainz-settings";
import { db } from "./db";
import { getSearchEngine } from "./search-settings";
import {
  getPublicMusicBrainzSettings,
  MusicBrainzSettingsError,
  resetMusicBrainzSettings,
  saveMusicBrainzSettings,
  usesSearchMusicBrainz,
} from "./musicbrainz-settings";

export function getContentSettings() {
  return {
    ...getPublicMusicBrainzSettings(),
    useSearchSettings: usesSearchMusicBrainz(),
    searchEngine: getSearchEngine(),
  };
}

export function saveContentSettings(payload: MusicBrainzSettingsPayload) {
  if (
    !payload ||
    (payload.useSearchSettings !== undefined &&
      typeof payload.useSearchSettings !== "boolean")
  ) {
    throw new MusicBrainzSettingsError(
      "Choose whether to share the Search configuration.",
    );
  }
  return db
    .transaction(() => {
      // Linking never copies credentials or discards the independent Content configuration.
      if (!payload.useSearchSettings) saveMusicBrainzSettings(payload);
      db.prepare(
        `INSERT INTO app_settings (key, value) VALUES ('content.use_search', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      ).run(String(payload.useSearchSettings === true));
      return getContentSettings();
    })
    .immediate();
}

export function resetContentSettings() {
  return db
    .transaction(() => {
      resetMusicBrainzSettings();
      db.prepare(
        "DELETE FROM app_settings WHERE key = 'content.use_search'",
      ).run();
      return getContentSettings();
    })
    .immediate();
}

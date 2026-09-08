import { db } from "./db";
import type {
  SearchEngine,
  SearchSettingsPayload,
} from "@/lib/search/settings";
import {
  getMusicBrainzConnection,
  getPublicMusicBrainzSettings,
  saveMusicBrainzSettings,
  resolveMusicBrainzSettings,
  testResolvedMusicBrainzConnection,
} from "./musicbrainz-settings";
import {
  addMetadataProvider,
  getStoredMetadataProvider,
  updateMetadataProvider,
  resolvePayload,
  toPublicProvider,
} from "./providers/metadata-settings";
import { searchMetadataDiscoveryProvider } from "./providers/metadata-adapters";
import { AuthError } from "./auth/errors";

export function getSearchEngine(): SearchEngine {
  const row = db
    .prepare("SELECT value FROM app_settings WHERE key = 'search.engine'")
    .get() as { value: string } | undefined;
  return row?.value === "lastfm" ? "lastfm" : "musicbrainz";
}
export function getSearchSettings() {
  const lastfm = getStoredMetadataProvider("lastfm");
  return {
    engine: getSearchEngine(),
    musicbrainz: getPublicMusicBrainzSettings("search"),
    lastfm: lastfm ? toPublicProvider(lastfm, 1) : null,
  };
}
function validate(payload: SearchSettingsPayload) {
  if (!payload || !["musicbrainz", "lastfm"].includes(payload.engine))
    throw new AuthError("Choose a search engine.");
  if (payload.engine === "musicbrainz" && !payload.musicbrainz)
    throw new AuthError("MusicBrainz settings are required.");
  if (payload.engine === "lastfm" && payload.lastfm?.key !== "lastfm")
    throw new AuthError("Last.fm settings are required.");
}
export function saveSearchSettings(payload: SearchSettingsPayload) {
  validate(payload);
  db.transaction(() => {
    if (payload.engine === "musicbrainz")
      saveMusicBrainzSettings(payload.musicbrainz!, "search");
    else {
      const existing = getStoredMetadataProvider("lastfm");
      // Enrichment enabled state is independent of search selection.
      const values = {
        ...payload.lastfm!,
        enabled: existing?.enabled ?? false,
      };
      if (existing) updateMetadataProvider(values);
      else addMetadataProvider(values);
    }
    db.prepare(
      "INSERT INTO app_settings (key, value) VALUES ('search.engine', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run(payload.engine);
  }).immediate();
  return getSearchSettings();
}
export async function testSearchSettings(payload: SearchSettingsPayload) {
  validate(payload);
  if (payload.engine === "musicbrainz")
    return testResolvedMusicBrainzConnection(
      resolveMusicBrainzSettings(payload.musicbrainz!, "search"),
      "search",
    );
  try {
    await searchMetadataDiscoveryProvider(
      resolvePayload(payload.lastfm!, getStoredMetadataProvider("lastfm")),
      "artist",
      "Beatles",
    );
  } catch {
    throw new AuthError(
      "Last.fm search test failed. Check the endpoint and credentials.",
    );
  }
}
// Identity resolution needs indexed search even when Content uses a lookup-only mirror.
export function getIdentitySearchConnection() {
  return getMusicBrainzConnection("search");
}

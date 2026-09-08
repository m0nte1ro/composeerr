"use client";
import { useEffect, useState } from "react";
import { ApiProviderCard, type ApiProviderValues } from "./ApiProviderCard";
import { MusicBrainzProviderCard } from "./MusicBrainzProviderCard";
import { SettingsPageHeader } from "./SettingsPageHeader";
import {
  getSearchSettings,
  saveSearchSettings,
  testSearchSettings,
} from "@/lib/client/setup";
import type { SearchEngine, SearchSettings } from "@/lib/search/settings";
import { DEFAULT_METADATA_PROVIDER_URLS } from "@/lib/providers/types";
export function SearchSettingsPageClient({
  onContinue,
}: {
  onContinue?: () => Promise<void>;
}) {
  const [settings, setSettings] = useState<SearchSettings | null>(null);
  const [engine, setEngine] = useState<SearchEngine | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    getSearchSettings()
      .then((value) => {
        setSettings(value);
        if (!onContinue) setEngine(value.engine);
      })
      .catch((e) => setError(e.message));
  }, [onContinue]);
  const lastfmPayload = (values: ApiProviderValues) => ({
    engine: "lastfm" as const,
    lastfm: { ...values, key: "lastfm" as const },
  });
  return (
    <>
      <SettingsPageHeader
        title="Search"
        description="Choose one search engine. Content uses its own MusicBrainz connection."
      />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!settings ? (
        <p>Loading search settings...</p>
      ) : (
        <div className="provider-settings-list">
          <div
            role="radiogroup"
            aria-label="Search engine"
            className="search-engine-options"
          >
            {(["lastfm", "musicbrainz"] as const).map((key) => (
              <label
                key={key}
                className={`search-engine-option ${engine === key ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="search-engine"
                  value={key}
                  checked={engine === key}
                  disabled={busy}
                  onChange={() => setEngine(key)}
                />
                <span>
                  <strong>
                    {key === "lastfm" ? "Last.fm" : "MusicBrainz"}
                  </strong>
                  <small>
                    {key === "lastfm"
                      ? "Search with your API key or a customized endpoint."
                      : "Public API by default, with optional mirror and authentication."}
                  </small>
                </span>
              </label>
            ))}
          </div>
          {engine === "musicbrainz" && (
            <MusicBrainzProviderCard
              key="musicbrainz"
              settings={settings.musicbrainz}
              purpose="search"
              onContinue={onContinue}
              onBusyChange={setBusy}
              onSave={async (musicbrainz) => {
                setSettings(await saveSearchSettings({ engine, musicbrainz }));
              }}
              onTest={(musicbrainz) =>
                testSearchSettings({ engine, musicbrainz })
              }
            />
          )}
          {engine === "lastfm" && (
            <ApiProviderCard
              key="lastfm"
              providerId="search-lastfm"
              name="Last.fm"
              description="Credentials are shared with Last.fm in Metadata. Enrichment can be enabled separately."
              defaultUrl={DEFAULT_METADATA_PROVIDER_URLS.lastfm}
              nativeCredential={{
                label: "API Key",
                placeholder: "Last.fm API key",
              }}
              enabled
              showEnabled={false}
              url={settings.lastfm?.url}
              authMode={settings.lastfm?.authMode ?? "native"}
              username={settings.lastfm?.username}
              headerName={settings.lastfm?.headerName}
              hasSavedNativeSecret={settings.lastfm?.hasNativeSecret ?? false}
              hasSavedPassword={settings.lastfm?.hasPassword}
              hasSavedHeaderSecret={settings.lastfm?.hasHeaderSecret}
              onSave={async (values) => {
                setSettings(await saveSearchSettings(lastfmPayload(values)));
              }}
              onTest={(values) => testSearchSettings(lastfmPayload(values))}
              requireTest={Boolean(onContinue)}
              onContinue={onContinue}
              onBusyChange={setBusy}
            />
          )}
          <p className="settings-note">
            Only results verified against your MusicBrainz Content connection are
            shown. Songs must resolve to recordings, albums to release groups,
            and artists to artists.
          </p>
        </div>
      )}
    </>
  );
}

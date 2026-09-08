"use client";
import { useSetupFormState } from "@/components/setup/SetupFormState";
import { useEffect, useState } from "react";
import { MusicBrainzProviderCard } from "./MusicBrainzProviderCard";
import { SettingsPageHeader } from "./SettingsPageHeader";
import { Button } from "@/components/ui/Button";
import {
  getMusicBrainzSettings,
  saveMusicBrainzSettings,
  testMusicBrainzConnection,
} from "@/lib/client/musicbrainz-settings";
import type { PublicMusicBrainzSettings } from "@/lib/content/musicbrainz-settings";
export function ContentSettingsPageClient({
  onContinue,
}: {
  onContinue?: () => Promise<void>;
}) {
  const [settings, setSettings] = useState<PublicMusicBrainzSettings | null>(
    null,
  );
  const [linked, setLinked] = useState(false);
  const [tested, setTested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    getMusicBrainzSettings()
      .then((value) => {
        setSettings(value);
        setLinked(Boolean(value.useSearchSettings));
      })
      .catch((e) => setError(e.message));
  }, []);
  useSetupFormState("content-link", false, busy);
  async function linkedAction(test: boolean) {
    if (!settings) return;
    setBusy(true);
    setError("");
    try {
      const payload = { ...settings, useSearchSettings: true };
      if (test) {
        setTested(false);
        await testMusicBrainzConnection(payload);
        setTested(true);
      } else {
        setSettings(await saveMusicBrainzSettings(payload));
        setSaved(true);
        if (onContinue) await onContinue();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SettingsPageHeader
        title="Content"
        description="Configure MusicBrainz identity, album tracklists, appearances and artist discography. The connection test retrieves an artist by MBID."
      />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!settings ? (
        <p>Loading content settings...</p>
      ) : (
        <div className="provider-settings-list">
          {(settings.searchEngine === "musicbrainz" || linked) && (
            <label className="settings-toggle settings-card">
              <input
                type="checkbox"
                checked={linked}
                disabled={busy}
                onChange={(e) => {
                  setLinked(e.target.checked);
                  setTested(false);
                  setSaved(false);
                  setError("");
                }}
              />
              <span>
                <strong>
                  Use the same configuration as MusicBrainz Search
                </strong>
                <small>
                  Shares the endpoint and credentials. Uncheck to use a separate
                  content mirror.
                </small>
              </span>
            </label>
          )}
          {linked ? (
            <section className="settings-card settings-card-padded">
              <p>Content follows the saved MusicBrainz Search configuration.</p>
              {tested && (
                <p role="status" className="save-feedback">
                  MusicBrainz ID lookup succeeded.
                </p>
              )}
              {saved && <p role="status">Saved</p>}
              <div className="settings-actions">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void linkedAction(true)}
                >
                  {busy ? "Working..." : "Test Connection"}
                </Button>
                <Button
                  disabled={busy || (Boolean(onContinue) && !tested)}
                  onClick={() => void linkedAction(false)}
                >
                  {onContinue ? "Next" : "Save Settings"}
                </Button>
              </div>
            </section>
          ) : (
            <MusicBrainzProviderCard
              settings={settings}
              purpose="content"
              onContinue={onContinue}
              onBusyChange={setBusy}
              onSave={async (values) => {
                setSettings(
                  await saveMusicBrainzSettings({
                    ...values,
                    useSearchSettings: false,
                  }),
                );
              }}
              onTest={(values) =>
                testMusicBrainzConnection({
                  ...values,
                  useSearchSettings: false,
                })
              }
            />
          )}
        </div>
      )}
    </>
  );
}

"use client";

import {
  ApiProviderCard,
  type ApiProviderValues,
} from "@/components/settings/ApiProviderCard";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { useMusicBrainzSettings } from "@/hooks/useMusicBrainzSettings";
import {
  DEFAULT_MUSICBRAINZ_URL,
  type MusicBrainzSettingsPayload,
} from "@/lib/content/musicbrainz-settings";

function toMusicBrainzPayload(
  values: ApiProviderValues,
): MusicBrainzSettingsPayload {
  return {
    url: values.url,
    authMode: values.authMode === "native" ? "none" : values.authMode,
    username: values.username,
    password: values.password,
    headerName: values.headerName,
    headerSecret: values.headerSecret,
  };
}

export function ContentSettingsPageClient() {
  const settings = useMusicBrainzSettings();

  return (
    <>
      <SettingsPageHeader
        title="Content"
        description="Configure the canonical content source Composeerr uses for music identity, search, and details."
      />

      {settings.loading ? (
        <section className="settings-card">
          <div className="settings-loading">Loading settings...</div>
        </section>
      ) : settings.loadError ? (
        <section className="settings-card">
          <ErrorState
            title="Could not load Content settings"
            message={settings.loadError}
            className="settings-state"
          />
        </section>
      ) : (
        <ApiProviderCard
          providerId="musicbrainz"
          name="MusicBrainz"
          description="Composeerr uses a MusicBrainz-compatible HTTP Web Service as its canonical content provider."
          defaultUrl={DEFAULT_MUSICBRAINZ_URL}
          defaultAuthMode="none"
          enabled
          showEnabled={false}
          customized={settings.customized}
          url={settings.url}
          authMode={settings.authMode}
          username={settings.username}
          headerName={settings.headerName}
          hasSavedNativeSecret={false}
          hasSavedPassword={settings.hasSavedPassword}
          hasSavedHeaderSecret={settings.hasSavedHeaderSecret}
          onSave={async (values) => {
            await settings.saveConnectionValues(toMusicBrainzPayload(values));
          }}
          onTest={async (values) => {
            await settings.testConnectionValues(toMusicBrainzPayload(values));
          }}
          onReset={settings.resetSettings}
        />
      )}
    </>
  );
}
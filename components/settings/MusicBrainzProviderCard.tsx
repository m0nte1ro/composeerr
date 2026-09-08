"use client";
import { ApiProviderCard, type ApiProviderValues } from "./ApiProviderCard";
import {
  DEFAULT_MUSICBRAINZ_URL,
  type MusicBrainzSettingsPayload,
  type PublicMusicBrainzSettings,
} from "@/lib/content/musicbrainz-settings";
export function musicBrainzPayload(
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
export function MusicBrainzProviderCard({
  settings,
  purpose,
  onSave,
  onTest,
  onContinue,
  onBusyChange,
}: {
  settings: PublicMusicBrainzSettings;
  purpose: "search" | "content";
  onSave: (values: MusicBrainzSettingsPayload) => Promise<void>;
  onTest: (values: MusicBrainzSettingsPayload) => Promise<void>;
  onContinue?: () => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  return (
    <ApiProviderCard
      providerId={`musicbrainz-${purpose}`}
      name="MusicBrainz"
      description={
        purpose === "search"
          ? "Search artists, albums and songs. A custom mirror must have indexed search enabled."
          : "Music identity, tracklists, appearances and discography by MBID. Local HTTP mirrors work without indexed search."
      }
      defaultUrl={DEFAULT_MUSICBRAINZ_URL}
      defaultAuthMode="none"
      enabled
      showEnabled={false}
      {...settings}
      hasSavedNativeSecret={false}
      hasSavedPassword={settings.hasPassword}
      hasSavedHeaderSecret={settings.hasHeaderSecret}
      onSave={(values) => onSave(musicBrainzPayload(values))}
      onTest={(values) => onTest(musicBrainzPayload(values))}
      onContinue={onContinue}
      onBusyChange={onBusyChange}
      requireTest={Boolean(onContinue)}
    />
  );
}

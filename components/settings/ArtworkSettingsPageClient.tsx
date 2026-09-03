"use client";

import { useState } from "react";
import Link from "next/link";

import { ApiProviderCard } from "@/components/settings/ApiProviderCard";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { useArtworkProviders } from "@/hooks/useArtworkProviders";
import {
  DEFAULT_COVER_ART_ARCHIVE_URL,
  DEFAULT_FANART_URL,
} from "@/lib/providers/types";

export function ArtworkSettingsPageClient() {
  const providers = useArtworkProviders();
  const [addingFanart, setAddingFanart] = useState(false);

  const settings = providers.settings;

  return (
    <>
      <SettingsPageHeader
        title="Artwork"
        description="Configure the fixed artwork fallback chain used for albums and artists."
      />

      {providers.loading ? (
        <section className="settings-card">
          <div className="settings-loading">Loading artwork providers...</div>
        </section>
      ) : providers.error || !settings ? (
        <section className="settings-card">
          <ErrorState
            title="Could not load Artwork settings"
            message={providers.error || "Artwork settings are unavailable."}
            className="settings-state"
          />
        </section>
      ) : (
        <div className="provider-settings-list">
          <ApiProviderCard
            providerId="cover-art-archive"
            name="Cover Art Archive"
            description="Primary album and release-group artwork provider."
            defaultUrl={DEFAULT_COVER_ART_ARCHIVE_URL}
            defaultAuthMode="none"
            enabled={settings.coverArtArchive.enabled}
            customized={settings.coverArtArchive.customized}
            url={settings.coverArtArchive.url}
            authMode={settings.coverArtArchive.authMode}
            username={settings.coverArtArchive.username}
            headerName={settings.coverArtArchive.headerName}
            hasSavedNativeSecret={false}
            hasSavedPassword={settings.coverArtArchive.hasPassword}
            hasSavedHeaderSecret={settings.coverArtArchive.hasHeaderSecret}
            onSave={async (values) => {
              await providers.update({
                key: "cover-art-archive",
                ...values,
                authMode: values.authMode === "native" ? "none" : values.authMode,
              });
            }}
            onTest={(values) =>
              providers.test({
                key: "cover-art-archive",
                ...values,
                authMode: values.authMode === "native" ? "none" : values.authMode,
              })
            }
            onReset={async () => {
              await providers.resetCoverArtArchive();
            }}
          />

          {settings.fanart ? (
            <ApiProviderCard
              providerId="fanart"
              name="Fanart.tv"
              description="Artist and album artwork fallback after Cover Art Archive."
              defaultUrl={DEFAULT_FANART_URL}
              nativeCredential={{
                label: "API Key",
                placeholder: "Fanart.tv API key",
              }}
              enabled={settings.fanart.enabled}
              url={settings.fanart.url}
              authMode={settings.fanart.authMode}
              username={settings.fanart.username}
              headerName={settings.fanart.headerName}
              hasSavedNativeSecret={settings.fanart.hasNativeSecret}
              hasSavedPassword={settings.fanart.hasPassword}
              hasSavedHeaderSecret={settings.fanart.hasHeaderSecret}
              onSave={async (values) => {
                await providers.update({ key: "fanart", ...values });
              }}
              onTest={(values) => providers.test({ key: "fanart", ...values })}
              onRemove={async () => {
                await providers.removeFanart();
              }}
            />
          ) : addingFanart ? (
            <ApiProviderCard
              providerId="fanart"
              name="Fanart.tv"
              description="Artist and album artwork fallback after Cover Art Archive."
              defaultUrl={DEFAULT_FANART_URL}
              nativeCredential={{
                label: "API Key",
                placeholder: "Fanart.tv API key",
              }}
              enabled
              authMode="native"
              hasSavedNativeSecret={false}
              createMode
              onSave={async (values) => {
                await providers.add({ key: "fanart", ...values });
                setAddingFanart(false);
              }}
              onTest={(values) => providers.test({ key: "fanart", ...values })}
              onCancelCreate={() => setAddingFanart(false)}
            />
          ) : (
            <div className="provider-add-bar">
              <div>
                <strong>Fanart.tv</strong>
                <span>Add optional artist and album artwork.</span>
              </div>
              <Button onClick={() => setAddingFanart(true)}>+ Add Provider</Button>
            </div>
          )}

          <div className="settings-note settings-note-stacked">
            <strong>Fixed resolution order</strong>
            <span>
              Albums: Cover Art Archive → Fanart.tv → TheAudioDB. Artists:
              Fanart.tv → TheAudioDB.
            </span>
            <span>
              TheAudioDB is {settings.theAudioDbFallback.configured ? "configured" : "not configured"}
              {settings.theAudioDbFallback.configured && !settings.theAudioDbFallback.enabled
                ? " but disabled"
                : ""} through <Link href="/settings/metadata">Metadata settings</Link>.
              Its credentials are shared and are never entered again here.
            </span>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";

import { ApiProviderCard } from "@/components/settings/ApiProviderCard";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Select } from "@/components/ui/Select";
import { useMetadataProviders } from "@/hooks/useMetadataProviders";
import {
  DEFAULT_METADATA_PROVIDER_URLS,
  type MetadataProviderKey,
} from "@/lib/providers/types";

const PROVIDERS: Record<
  MetadataProviderKey,
  {
    name: string;
    description: string;
    defaultUrl: string;
    nativeAuthLabel: string;
    nativeSecretLabel: string;
    nativeSecretPlaceholder: string;
  }
> = {
  lastfm: {
    name: "Last.fm",
    description: "Metadata, popularity signals, and future recommendation capabilities.",
    defaultUrl: DEFAULT_METADATA_PROVIDER_URLS.lastfm,
    nativeAuthLabel: "Last.fm API Key",
    nativeSecretLabel: "API Key",
    nativeSecretPlaceholder: "Last.fm API key",
  },
  discogs: {
    name: "Discogs",
    description: "Release metadata and detailed release information.",
    defaultUrl: DEFAULT_METADATA_PROVIDER_URLS.discogs,
    nativeAuthLabel: "Discogs Personal Token",
    nativeSecretLabel: "Personal Access Token",
    nativeSecretPlaceholder: "Discogs personal access token",
  },
  theaudiodb: {
    name: "TheAudioDB",
    description: "Supplemental metadata and artwork from one shared provider account.",
    defaultUrl: DEFAULT_METADATA_PROVIDER_URLS.theaudiodb,
    nativeAuthLabel: "TheAudioDB API Key",
    nativeSecretLabel: "API Key",
    nativeSecretPlaceholder: "TheAudioDB API key",
  },
};

export function MetadataSettingsPageClient() {
  const providers = useMetadataProviders();
  const [selected, setSelected] = useState<MetadataProviderKey | "">("");
  const [draft, setDraft] = useState<MetadataProviderKey | null>(null);

  const available = providers.settings?.availableProviders ?? [];
  const selectedIsAvailable = Boolean(selected && available.includes(selected));

  return (
    <>
      <SettingsPageHeader
        title="Metadata"
        description="Configure optional enrichment providers used after MusicBrainz canonical content."
      />

      {providers.loading ? (
        <section className="settings-card">
          <div className="settings-loading">Loading metadata providers...</div>
        </section>
      ) : providers.error ? (
        <section className="settings-card">
          <ErrorState
            title="Could not load Metadata settings"
            message={providers.error}
            className="settings-state"
          />
        </section>
      ) : (
        <div className="provider-settings-list">
          <section className="provider-add-bar">
            <div>
              <strong>Add provider</strong>
              <span>Each provider can be configured once.</span>
            </div>
            <Select
              aria-label="Metadata provider"
              value={selected}
              disabled={!available.length || Boolean(draft)}
              onChange={(event) =>
                setSelected(event.target.value as MetadataProviderKey | "")
              }
            >
              <option value="">
                {available.length ? "Choose provider" : "All providers configured"}
              </option>
              {available.map((key) => (
                <option key={key} value={key}>
                  {PROVIDERS[key].name}
                </option>
              ))}
            </Select>
            <Button
              disabled={!selectedIsAvailable || Boolean(draft)}
              onClick={() => {
                setDraft(selected as MetadataProviderKey);
                setSelected("");
              }}
            >
              + Add Provider
            </Button>
          </section>

          {!providers.settings?.providers.length && !draft ? (
            <EmptyState
              title="No metadata providers configured"
              message="Add a provider to enable optional metadata enrichment."
              className="settings-card settings-state"
            />
          ) : null}

          {providers.settings?.providers.map((provider) => {
            const definition = PROVIDERS[provider.key];

            return (
              <ApiProviderCard
                key={provider.key}
                providerId={`metadata-${provider.key}`}
                {...definition}
                enabled={provider.enabled}
                priority={provider.order}
                url={provider.url}
                authMode={provider.authMode}
                username={provider.username}
                headerName={provider.headerName}
                hasSavedNativeSecret={provider.hasNativeSecret}
                hasSavedPassword={provider.hasPassword}
                hasSavedHeaderSecret={provider.hasHeaderSecret}
                onSave={(values) => providers.update({ key: provider.key, ...values })}
                onTest={(values) => providers.test({ key: provider.key, ...values })}
                onRemove={() => providers.remove(provider.key)}
              />
            );
          })}

          {draft ? (
            <ApiProviderCard
              key={`draft-${draft}`}
              providerId={`metadata-${draft}`}
              {...PROVIDERS[draft]}
              enabled
              authMode="native"
              hasSavedNativeSecret={false}
              createMode
              onSave={async (values) => {
                await providers.add({ key: draft, ...values });
                setDraft(null);
              }}
              onTest={(values) => providers.test({ key: draft, ...values })}
              onCancelCreate={() => setDraft(null)}
            />
          ) : null}

          <div className="settings-note">
            <strong>Provider order:</strong>
            <span>
              Providers keep the order in which they are added. Reordering is not part
              of this phase; remove and add again to place a provider last.
            </span>
          </div>
        </div>
      )}
    </>
  );
}

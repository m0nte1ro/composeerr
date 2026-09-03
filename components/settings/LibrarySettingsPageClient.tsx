"use client";

import { useState } from "react";

import { LidarrLibraryProviderCard } from "@/components/settings/LidarrLibraryProviderCard";
import { NavidromeLibraryProviderCard } from "@/components/settings/NavidromeLibraryProviderCard";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Select } from "@/components/ui/Select";
import { useLibraryProviders } from "@/hooks/useLibraryProviders";
import type { LibraryProviderKey } from "@/lib/providers/types";

const PROVIDER_NAMES: Record<LibraryProviderKey, string> = {
    lidarr: "Lidarr",
    navidrome: "Navidrome",
};

export function LibrarySettingsPageClient() {
    const providers = useLibraryProviders();
    const [selected, setSelected] = useState<LibraryProviderKey | "">("");
    const [draft, setDraft] = useState<"navidrome" | null>(null);
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState("");
    const [recentlyAdded, setRecentlyAdded] = useState<LibraryProviderKey | null>(null);

    const available = providers.settings?.availableProviders ?? [];
    const selectedIsAvailable = Boolean(selected && available.includes(selected));

    async function addSelectedProvider() {
        if (!selectedIsAvailable || !selected) {
            return;
        }

        setAddError("");

        if (selected === "navidrome") {
            setDraft("navidrome");
            setSelected("");
            return;
        }

        setAdding(true);

        try {
            await providers.add({ key: "lidarr", enabled: true });
            setRecentlyAdded("lidarr");
            setSelected("");
        } catch (error) {
            setAddError(error instanceof Error ? error.message : "Could not add Lidarr.");
        } finally {
            setAdding(false);
        }
    }

    return (
        <>
            <SettingsPageHeader
                title="Library"
                description="Configure sources Composeerr can use to determine music availability."
            />

            {providers.loading ? (
                <section className="settings-card">
                    <div className="settings-loading">Loading Library providers...</div>
                </section>
            ) : providers.error ? (
                <section className="settings-card">
                    <ErrorState
                        title="Could not load Library settings"
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
                            aria-label="Library provider"
                            value={selected}
                            disabled={!available.length || Boolean(draft) || adding}
                            onChange={(event) => {
                                setSelected(event.target.value as LibraryProviderKey | "");
                                setAddError("");
                            }}
                        >
                            <option value="">
                                {available.length ? "Choose provider" : "All providers configured"}
                            </option>
                            {available.map((key) => (
                                <option key={key} value={key}>
                                    {PROVIDER_NAMES[key]}
                                </option>
                            ))}
                        </Select>
                        <Button
                            disabled={!selectedIsAvailable || Boolean(draft) || adding}
                            onClick={() => void addSelectedProvider()}
                        >
                            {adding ? "Adding..." : "+ Add Provider"}
                        </Button>
                        {addError ? <span className="form-error provider-add-error">{addError}</span> : null}
                    </section>

                    {!providers.settings?.providers.length && !draft ? (
                        <EmptyState
                            title="No Library providers configured"
                            message="Add Lidarr, Navidrome, or both as availability sources."
                            className="settings-card settings-state"
                        />
                    ) : null}

                    {providers.settings?.providers.map((provider) =>
                        provider.key === "lidarr" ? (
                            <LidarrLibraryProviderCard
                                key={provider.key}
                                provider={provider}
                                initiallySaved={recentlyAdded === provider.key}
                                onUpdate={providers.update}
                                onTest={providers.test}
                                onRemove={() => providers.remove(provider.key)}
                            />
                        ) : (
                            <NavidromeLibraryProviderCard
                                key={provider.key}
                                enabled={provider.enabled}
                                url={provider.url}
                                username={provider.username}
                                hasSavedPassword={provider.hasPassword}
                                priority={provider.order}
                                initiallySaved={recentlyAdded === provider.key}
                                onSave={providers.update}
                                onTest={providers.test}
                                onRemove={() => providers.remove(provider.key)}
                            />
                        ),
                    )}

                    {draft ? (
                        <NavidromeLibraryProviderCard
                            key="draft-navidrome"
                            enabled
                            hasSavedPassword={false}
                            createMode
                            onSave={async (values) => {
                                setRecentlyAdded("navidrome");

                                try {
                                    await providers.add(values);
                                    setDraft(null);
                                } catch (error) {
                                    setRecentlyAdded(null);
                                    throw error;
                                }
                            }}
                            onTest={providers.test}
                            onCancelCreate={() => setDraft(null)}
                        />
                    ) : null}

                    <div className="settings-note">
                        <strong>Availability sources:</strong>
                        <span>All enabled providers contribute to music availability together.</span>
                    </div>
                </div>
            )}
        </>
    );
}
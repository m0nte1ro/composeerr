"use client";

import Link from "next/link";
import { useState } from "react";

import { ConnectionTestStatus } from "@/components/settings/ConnectionTestStatus";
import { ProviderCard } from "@/components/settings/ProviderCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type {
    LibraryProviderPayload,
    PublicLibraryProvider,
} from "@/lib/providers/types";

type ConnectionState =
    | { status: "idle" }
    | { status: "testing" }
    | { status: "success"; title: string; message: string }
    | { status: "error"; message: string };

type LidarrLibraryProviderCardProps = {
    provider: PublicLibraryProvider;
    initiallySaved?: boolean;
    onUpdate: (values: LibraryProviderPayload) => Promise<void>;
    onTest: (values: LibraryProviderPayload) => Promise<void>;
    onRemove: () => Promise<void>;
};

export function LidarrLibraryProviderCard({
    provider,
    initiallySaved = false,
    onUpdate,
    onTest,
    onRemove,
}: LidarrLibraryProviderCardProps) {
    const [enabled, setEnabled] = useState(provider.enabled);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [message, setMessage] = useState(initiallySaved ? "Saved" : "");
    const [connectionState, setConnectionState] = useState<ConnectionState>({
        status: "idle",
    });

    async function updateEnabled(nextEnabled: boolean) {
        const previousEnabled = enabled;
        setEnabled(nextEnabled);
        setSaving(true);
        setMessage("");
        setConnectionState({ status: "idle" });

        try {
            await onUpdate({ key: "lidarr", enabled: nextEnabled });
            setMessage("Saved");
        } catch (error) {
            setEnabled(previousEnabled);
            setMessage(error instanceof Error ? error.message : "Save failed.");
        } finally {
            setSaving(false);
        }
    }

    async function testConnection() {
        setConnectionState({ status: "testing" });

        try {
            await onTest({ key: "lidarr", enabled });
            setConnectionState({
                status: "success",
                title: "Lidarr is reachable.",
                message: "The saved Lidarr connection responded successfully.",
            });
        } catch (error) {
            setConnectionState({
                status: "error",
                message:
                    error instanceof Error ? error.message : "Connection test failed.",
            });
        }
    }

    async function remove() {
        if (!window.confirm("Remove Lidarr as a Library provider?")) {
            return;
        }

        setRemoving(true);
        setMessage("");

        try {
            await onRemove();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Remove failed.");
            setRemoving(false);
        }
    }

    return (
        <ProviderCard>
            <div className="provider-card-header">
                <div>
                    <div className="provider-card-title-row">
                        <h2>Lidarr</h2>
                        <span className="provider-priority">Priority {provider.order}</span>
                    </div>
                    <p>Uses your configured Lidarr instance as an availability source.</p>
                </div>

                <label className="provider-enabled-toggle">
                    <Input
                        type="checkbox"
                        checked={enabled}
                        disabled={saving || !provider.configured}
                        onChange={(event) => void updateEnabled(event.target.checked)}
                    />
                    <span>{enabled ? "Enabled" : "Disabled"}</span>
                </label>
            </div>

            <div className="provider-card-body">
                {provider.configured ? (
                    <div className="settings-note">
                        <strong>Using saved Lidarr settings</strong>
                        <span>{provider.url}</span>
                    </div>
                ) : (
                    <div className="connection-result connection-result-error library-provider-warning">
                        <strong>Lidarr is not configured</strong>
                        <span>Configure and save Lidarr before using it as a Library provider.</span>
                    </div>
                )}

                <ConnectionTestStatus state={connectionState} />

                <div className="provider-card-footer">
                    <Link
                        href="/settings/lidarr"
                        className="secondary-button provider-settings-link"
                    >
                        Go to Lidarr Settings
                    </Link>

                    <div className="provider-card-actions">
                        {message ? (
                            <span className={message === "Saved" ? "save-feedback" : "form-error"}>
                                {message === "Saved" ? "✓ Saved" : message}
                            </span>
                        ) : null}
                        <Button
                            variant="secondary"
                            disabled={!provider.configured || connectionState.status === "testing"}
                            onClick={() => void testConnection()}
                        >
                            {connectionState.status === "testing" ? "Testing..." : "Test Connection"}
                        </Button>
                        <Button variant="text" disabled={removing} onClick={() => void remove()}>
                            {removing ? "Removing..." : "Remove"}
                        </Button>
                    </div>
                </div>
            </div>
        </ProviderCard>
    );
}
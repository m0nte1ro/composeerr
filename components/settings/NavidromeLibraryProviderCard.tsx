"use client";

import { useState } from "react";

import { ConnectionTestStatus } from "@/components/settings/ConnectionTestStatus";
import { ProviderCard } from "@/components/settings/ProviderCard";
import { SecretField } from "@/components/settings/SecretField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { LibraryProviderPayload } from "@/lib/providers/types";

type ConnectionState =
    | { status: "idle" }
    | { status: "testing" }
    | { status: "success"; title: string; message: string }
    | { status: "error"; message: string };

type NavidromeLibraryProviderCardProps = {
    enabled: boolean;
    url?: string;
    username?: string;
    hasSavedPassword: boolean;
    priority?: number;
    createMode?: boolean;
    initiallySaved?: boolean;
    onSave: (values: LibraryProviderPayload) => Promise<void>;
    onTest: (values: LibraryProviderPayload) => Promise<void>;
    onRemove?: () => Promise<void>;
    onCancelCreate?: () => void;
};

export function NavidromeLibraryProviderCard({
    enabled: initialEnabled,
    url: initialUrl = "http://localhost:4533",
    username: initialUsername = "",
    hasSavedPassword,
    priority,
    createMode = false,
    initiallySaved = false,
    onSave,
    onTest,
    onRemove,
    onCancelCreate,
}: NavidromeLibraryProviderCardProps) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [url, setUrl] = useState(initialUrl);
    const [username, setUsername] = useState(initialUsername);
    const [password, setPassword] = useState("");
    const [editingPassword, setEditingPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [message, setMessage] = useState(initiallySaved ? "Saved" : "");
    const [connectionState, setConnectionState] = useState<ConnectionState>({
        status: "idle",
    });

    const fieldsAreValid = Boolean(
        url.trim() &&
        username.trim() &&
        (password || hasSavedPassword),
    );

    function markAsEdited() {
        setMessage("");
        setConnectionState({ status: "idle" });
    }

    function values(): LibraryProviderPayload {
        return {
            key: "navidrome",
            enabled,
            url,
            username,
            password: password || undefined,
        };
    }

    function clearPasswordEditor() {
        setPassword("");
        setEditingPassword(false);
        setShowPassword(false);
    }

    async function testConnection() {
        setConnectionState({ status: "testing" });

        try {
            await onTest(values());
            setConnectionState({
                status: "success",
                title: "Navidrome is reachable.",
                message: "The Subsonic-compatible API responded successfully.",
            });
        } catch (error) {
            setConnectionState({
                status: "error",
                message:
                    error instanceof Error ? error.message : "Connection test failed.",
            });
        }
    }

    async function save() {
        setSaving(true);
        setMessage("");

        try {
            await onSave(values());
            setUrl(url.trim().replace(/\/+$/, ""));
            setUsername(username.trim());
            clearPasswordEditor();
            setMessage("Saved");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Save failed.");
        } finally {
            setSaving(false);
        }
    }

    async function remove() {
        if (!onRemove || !window.confirm("Remove Navidrome and its saved password?")) {
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
                        <h2>Navidrome</h2>
                        {priority ? (
                            <span className="provider-priority">Priority {priority}</span>
                        ) : null}
                    </div>
                    <p>Uses your Navidrome library as an availability source.</p>
                </div>

                <label className="provider-enabled-toggle">
                    <Input
                        type="checkbox"
                        checked={enabled}
                        onChange={(event) => {
                            setEnabled(event.target.checked);
                            markAsEdited();
                        }}
                    />
                    <span>{enabled ? "Enabled" : "Disabled"}</span>
                </label>
            </div>

            <div className="provider-card-body library-provider-fields">
                <div className="settings-field">
                    <label htmlFor="library-navidrome-url">Navidrome URL</label>
                    <Input
                        id="library-navidrome-url"
                        type="url"
                        value={url}
                        placeholder="http://192.168.1.50:4533"
                        autoComplete="off"
                        onChange={(event) => {
                            setUrl(event.target.value);
                            markAsEdited();
                        }}
                    />
                </div>

                <div className="settings-field">
                    <label htmlFor="library-navidrome-username">Username</label>
                    <Input
                        id="library-navidrome-username"
                        value={username}
                        autoComplete="username"
                        onChange={(event) => {
                            setUsername(event.target.value);
                            markAsEdited();
                        }}
                    />
                </div>

                <div className="settings-field">
                    <label htmlFor="library-navidrome-password">Password</label>
                    <SecretField
                        id="library-navidrome-password"
                        ariaLabel="Saved Navidrome password"
                        hasSavedValue={hasSavedPassword}
                        isEditing={editingPassword}
                        showValue={showPassword}
                        value={password}
                        placeholder="Navidrome password"
                        onStartEditing={() => {
                            setEditingPassword(true);
                            setPassword("");
                            setShowPassword(false);
                        }}
                        onCancelEditing={() => {
                            setEditingPassword(false);
                            setPassword("");
                            setShowPassword(false);
                        }}
                        onToggleVisibility={() => setShowPassword((current) => !current)}
                        onChange={(value) => {
                            setPassword(value);
                            markAsEdited();
                        }}
                    />
                    <span>The saved password is never returned to the browser.</span>
                </div>

                <ConnectionTestStatus state={connectionState} />

                <div className="provider-card-footer library-provider-footer">
                    <div className="provider-card-actions">
                        {onRemove ? (
                            <Button variant="text" disabled={removing} onClick={() => void remove()}>
                                {removing ? "Removing..." : "Remove"}
                            </Button>
                        ) : onCancelCreate ? (
                            <Button variant="text" onClick={onCancelCreate}>
                                Cancel
                            </Button>
                        ) : null}
                        {message ? (
                            <span className={message === "Saved" ? "save-feedback" : "form-error"}>
                                {message === "Saved" ? "✓ Saved" : message}
                            </span>
                        ) : null}
                        <Button
                            variant="secondary"
                            disabled={!fieldsAreValid || connectionState.status === "testing"}
                            onClick={() => void testConnection()}
                        >
                            {connectionState.status === "testing" ? "Testing..." : "Test Connection"}
                        </Button>
                        <Button disabled={!fieldsAreValid || saving} onClick={() => void save()}>
                            {saving ? "Saving..." : createMode ? "Add Provider" : "Save Settings"}
                        </Button>
                    </div>
                </div>
            </div>
        </ProviderCard>
    );
}
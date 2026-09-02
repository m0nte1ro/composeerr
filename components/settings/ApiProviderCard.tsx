"use client";

import { useState } from "react";

import { ConnectionTestStatus } from "@/components/settings/ConnectionTestStatus";
import { ProviderCard } from "@/components/settings/ProviderCard";
import { SecretField } from "@/components/settings/SecretField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { CredentialProviderAuthMode } from "@/lib/providers/types";

type ConnectionState =
    | { status: "idle" }
    | { status: "testing" }
    | { status: "success"; title: string; message: string }
    | { status: "error"; message: string };

export type ApiProviderValues = {
    enabled: boolean;
    url: string;
    authMode: CredentialProviderAuthMode;
    nativeSecret?: string;
    username?: string;
    password?: string;
    headerName?: string;
    headerSecret?: string;
};

type ApiProviderCardProps = {
    providerId: string;
    name: string;
    description: string;
    defaultUrl: string;
    nativeAuthLabel: string;
    nativeSecretLabel: string;
    nativeSecretPlaceholder: string;
    enabled: boolean;
    url?: string;
    authMode?: CredentialProviderAuthMode;
    username?: string;
    headerName?: string;
    hasSavedNativeSecret: boolean;
    hasSavedPassword?: boolean;
    hasSavedHeaderSecret?: boolean;
    priority?: number;
    createMode?: boolean;
    onSave: (values: ApiProviderValues) => Promise<void>;
    onTest: (values: ApiProviderValues) => Promise<void>;
    onRemove?: () => Promise<void>;
    onCancelCreate?: () => void;
};

export function ApiProviderCard({
    providerId,
    name,
    description,
    defaultUrl,
    nativeAuthLabel,
    nativeSecretLabel,
    nativeSecretPlaceholder,
    enabled: initialEnabled,
    url: initialUrl = defaultUrl,
    authMode: initialAuthMode = "native",
    username: initialUsername = "",
    headerName: initialHeaderName = "",
    hasSavedNativeSecret,
    hasSavedPassword = false,
    hasSavedHeaderSecret = false,
    priority,
    createMode = false,
    onSave,
    onTest,
    onRemove,
    onCancelCreate,
}: ApiProviderCardProps) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [url, setUrl] = useState(initialUrl);
    const [authMode, setAuthMode] =
        useState<CredentialProviderAuthMode>(initialAuthMode);
    const [nativeSecret, setNativeSecret] = useState("");
    const [editingNativeSecret, setEditingNativeSecret] = useState(false);
    const [showNativeSecret, setShowNativeSecret] = useState(false);
    const [username, setUsername] = useState(initialUsername);
    const [password, setPassword] = useState("");
    const [editingPassword, setEditingPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [headerName, setHeaderName] = useState(initialHeaderName);
    const [headerSecret, setHeaderSecret] = useState("");
    const [editingHeaderSecret, setEditingHeaderSecret] = useState(false);
    const [showHeaderSecret, setShowHeaderSecret] = useState(false);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [connectionState, setConnectionState] = useState<ConnectionState>({
        status: "idle",
    });

    function markAsEdited() {
        setConnectionState({ status: "idle" });
        setSaveMessage("");
    }

    function values(): ApiProviderValues {
        return {
            enabled,
            url,
            authMode,
            nativeSecret:
                authMode === "native" && nativeSecret.length > 0
                    ? nativeSecret
                    : undefined,
            username: authMode === "basic" ? username : undefined,
            password:
                authMode === "basic" && password.length > 0 ? password : undefined,
            headerName: authMode === "header" ? headerName : undefined,
            headerSecret:
                authMode === "header" && headerSecret.length > 0
                    ? headerSecret
                    : undefined,
        };
    }

    function clearSecretEditors() {
        setNativeSecret("");
        setPassword("");
        setHeaderSecret("");
        setEditingNativeSecret(false);
        setEditingPassword(false);
        setEditingHeaderSecret(false);
        setShowNativeSecret(false);
        setShowPassword(false);
        setShowHeaderSecret(false);
    }

    async function testConnection() {
        setConnectionState({ status: "testing" });

        try {
            await onTest(values());
            setConnectionState({
                status: "success",
                title: `${name} is reachable.`,
                message: "The configured API endpoint responded successfully.",
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
        setSaveMessage("");

        try {
            await onSave(values());
            clearSecretEditors();
            setSaveMessage("Saved");
        } catch (error) {
            setSaveMessage(error instanceof Error ? error.message : "Save failed.");
        } finally {
            setSaving(false);
        }
    }

    async function remove() {
        if (!onRemove || !window.confirm(`Remove ${name} and its saved credentials?`)) {
            return;
        }

        setRemoving(true);

        try {
            await onRemove();
        } catch (error) {
            setSaveMessage(error instanceof Error ? error.message : "Remove failed.");
            setRemoving(false);
        }
    }

    const hasRequiredSecret =
        authMode === "native"
            ? Boolean(nativeSecret) || hasSavedNativeSecret
            : authMode === "basic"
                ? Boolean(password) || hasSavedPassword
                : authMode === "header"
                    ? Boolean(headerSecret) || hasSavedHeaderSecret
                    : true;
    const fieldsAreValid =
        Boolean(url.trim()) &&
        hasRequiredSecret &&
        (authMode !== "basic" || Boolean(username.trim())) &&
        (authMode !== "header" || Boolean(headerName.trim()));

    return (
        <ProviderCard>
            <div className="provider-card-header">
                <div>
                    <div className="provider-card-title-row">
                        <h2>{name}</h2>
                        {priority ? (
                            <span className="provider-priority">Priority {priority}</span>
                        ) : null}
                    </div>
                    <p>{description}</p>
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

            <div className="provider-card-body">
                <div className="settings-field">
                    <label htmlFor={`${providerId}-url`}>Endpoint</label>
                    <Input
                        id={`${providerId}-url`}
                        type="url"
                        value={url}
                        placeholder={defaultUrl}
                        autoComplete="off"
                        onChange={(event) => {
                            setUrl(event.target.value);
                            markAsEdited();
                        }}
                    />
                    <span>Use the default service or an API-compatible endpoint.</span>
                </div>

                <div className="settings-field">
                    <label htmlFor={`${providerId}-auth-mode`}>Authentication</label>
                    <Select
                        id={`${providerId}-auth-mode`}
                        value={authMode}
                        onChange={(event) => {
                            setAuthMode(event.target.value as CredentialProviderAuthMode);
                            markAsEdited();
                        }}
                    >
                        <option value="native">{nativeAuthLabel}</option>
                        <option value="none">None</option>
                        <option value="basic">Basic Auth</option>
                        <option value="header">API Key / Header</option>
                    </Select>
                </div>

                {authMode === "native" ? (
                    <div className="settings-auth-fields">
                        <div className="settings-field">
                            <label htmlFor={`${providerId}-native-secret`}>
                                {nativeSecretLabel}
                            </label>
                            <SecretField
                                id={`${providerId}-native-secret`}
                                ariaLabel={`Saved ${name} ${nativeSecretLabel}`}
                                hasSavedValue={hasSavedNativeSecret}
                                isEditing={editingNativeSecret}
                                showValue={showNativeSecret}
                                value={nativeSecret}
                                placeholder={nativeSecretPlaceholder}
                                onStartEditing={() => {
                                    setEditingNativeSecret(true);
                                    setNativeSecret("");
                                    setShowNativeSecret(false);
                                }}
                                onCancelEditing={() => {
                                    setEditingNativeSecret(false);
                                    setNativeSecret("");
                                    setShowNativeSecret(false);
                                }}
                                onToggleVisibility={() =>
                                    setShowNativeSecret((current) => !current)
                                }
                                onChange={(value) => {
                                    setNativeSecret(value);
                                    markAsEdited();
                                }}
                            />
                            <span>The saved credential is never returned to the browser.</span>
                        </div>
                    </div>
                ) : null}

                {authMode === "basic" ? (
                    <div className="settings-auth-fields">
                        <div className="settings-field">
                            <label htmlFor={`${providerId}-username`}>Username</label>
                            <Input
                                id={`${providerId}-username`}
                                value={username}
                                autoComplete="username"
                                onChange={(event) => {
                                    setUsername(event.target.value);
                                    markAsEdited();
                                }}
                            />
                        </div>
                        <div className="settings-field">
                            <label htmlFor={`${providerId}-password`}>Password</label>
                            <SecretField
                                id={`${providerId}-password`}
                                ariaLabel={`Saved ${name} password`}
                                hasSavedValue={hasSavedPassword}
                                isEditing={editingPassword}
                                showValue={showPassword}
                                value={password}
                                placeholder="Password"
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
                    </div>
                ) : null}

                {authMode === "header" ? (
                    <div className="settings-auth-fields">
                        <div className="settings-field">
                            <label htmlFor={`${providerId}-header-name`}>Header name</label>
                            <Input
                                id={`${providerId}-header-name`}
                                value={headerName}
                                placeholder="X-API-Key"
                                autoComplete="off"
                                onChange={(event) => {
                                    setHeaderName(event.target.value);
                                    markAsEdited();
                                }}
                            />
                        </div>
                        <div className="settings-field">
                            <label htmlFor={`${providerId}-header-secret`}>API key / value</label>
                            <SecretField
                                id={`${providerId}-header-secret`}
                                ariaLabel={`Saved ${name} header value`}
                                hasSavedValue={hasSavedHeaderSecret}
                                isEditing={editingHeaderSecret}
                                showValue={showHeaderSecret}
                                value={headerSecret}
                                placeholder="API key or header value"
                                onStartEditing={() => {
                                    setEditingHeaderSecret(true);
                                    setHeaderSecret("");
                                    setShowHeaderSecret(false);
                                }}
                                onCancelEditing={() => {
                                    setEditingHeaderSecret(false);
                                    setHeaderSecret("");
                                    setShowHeaderSecret(false);
                                }}
                                onToggleVisibility={() =>
                                    setShowHeaderSecret((current) => !current)
                                }
                                onChange={(value) => {
                                    setHeaderSecret(value);
                                    markAsEdited();
                                }}
                            />
                            <span>The saved header value is never returned to the browser.</span>
                        </div>
                    </div>
                ) : null}

                <ConnectionTestStatus state={connectionState} />

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

                    {saveMessage ? (
                        <span className={saveMessage === "Saved" ? "save-feedback" : "form-error"}>
                            {saveMessage === "Saved" ? "✓ Saved" : saveMessage}
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
        </ProviderCard>
    );
}
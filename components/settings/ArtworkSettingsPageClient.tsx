"use client";

import { useState } from "react";
import Link from "next/link";

import { ConnectionTestStatus } from "@/components/settings/ConnectionTestStatus";
import { ApiProviderCard } from "@/components/settings/ApiProviderCard";
import { ProviderCard } from "@/components/settings/ProviderCard";
import { SecretField } from "@/components/settings/SecretField";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useArtworkProviders } from "@/hooks/useArtworkProviders";
import {
  DEFAULT_COVER_ART_ARCHIVE_URL,
  DEFAULT_FANART_URL,
  type ArtworkAuthMode,
  type ArtworkProviderPayload,
  type ArtworkSettings,
} from "@/lib/providers/types";

type ConnectionState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "success"; title: string; message: string }
  | { status: "error"; message: string };

type CoverArtArchiveCardProps = {
  settings: ArtworkSettings["coverArtArchive"];
  onSave: (
    values: Extract<ArtworkProviderPayload, { key: "cover-art-archive" }>,
  ) => Promise<ArtworkSettings>;
  onReset: () => Promise<ArtworkSettings>;
  onTest: (
    values: Extract<ArtworkProviderPayload, { key: "cover-art-archive" }>,
  ) => Promise<void>;
};

function CoverArtArchiveCard({
  settings,
  onSave,
  onReset,
  onTest,
}: CoverArtArchiveCardProps) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [url, setUrl] = useState(settings.url);
  const [authMode, setAuthMode] = useState<ArtworkAuthMode>(settings.authMode);
  const [username, setUsername] = useState(settings.username);
  const [password, setPassword] = useState("");
  const [hasSavedPassword, setHasSavedPassword] = useState(settings.hasPassword);
  const [editingPassword, setEditingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [headerName, setHeaderName] = useState(settings.headerName);
  const [headerSecret, setHeaderSecret] = useState("");
  const [hasSavedHeaderSecret, setHasSavedHeaderSecret] = useState(
    settings.hasHeaderSecret,
  );
  const [editingHeaderSecret, setEditingHeaderSecret] = useState(false);
  const [showHeaderSecret, setShowHeaderSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [connection, setConnection] = useState<ConnectionState>({ status: "idle" });

  function values() {
    return {
      key: "cover-art-archive" as const,
      enabled,
      url,
      authMode,
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

  function applyPublicSettings(next: ArtworkSettings["coverArtArchive"]) {
    setEnabled(next.enabled);
    setUrl(next.url);
    setAuthMode(next.authMode);
    setUsername(next.username);
    setHeaderName(next.headerName);
    setHasSavedPassword(next.hasPassword);
    setHasSavedHeaderSecret(next.hasHeaderSecret);
    setPassword("");
    setHeaderSecret("");
    setEditingPassword(false);
    setEditingHeaderSecret(false);
    setShowPassword(false);
    setShowHeaderSecret(false);
  }

  function markAsEdited() {
    setConnection({ status: "idle" });
    setMessage("");
  }

  async function testConnection() {
    setConnection({ status: "testing" });

    try {
      await onTest(values());
      setConnection({
        status: "success",
        title: "Cover Art Archive is reachable.",
        message: "The configured artwork service responded successfully.",
      });
    } catch (error) {
      setConnection({
        status: "error",
        message: error instanceof Error ? error.message : "Connection test failed.",
      });
    }
  }

  async function save() {
    setSaving(true);
    setMessage("");

    try {
      const nextSettings = await onSave(values());
      applyPublicSettings(nextSettings.coverArtArchive);
      setMessage("Saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!window.confirm("Reset Cover Art Archive to the Composeerr default?")) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const nextSettings = await onReset();
      applyPublicSettings(nextSettings.coverArtArchive);
      setConnection({ status: "idle" });
      setMessage("Saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setSaving(false);
    }
  }

  const hasRequiredSecret =
    authMode === "basic"
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
            <h2>Cover Art Archive</h2>
            <span className="provider-priority">
              {settings.customized ? "Customized" : "Default"}
            </span>
          </div>
          <p>Primary album and release-group artwork provider.</p>
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
          <label htmlFor="cover-art-archive-url">Endpoint</label>
          <Input
            id="cover-art-archive-url"
            type="url"
            value={url}
            placeholder={DEFAULT_COVER_ART_ARCHIVE_URL}
            autoComplete="off"
            onChange={(event) => {
              setUrl(event.target.value);
              markAsEdited();
            }}
          />
          <span>
            Use the default service or another Cover Art Archive-compatible endpoint.
          </span>
        </div>

        <div className="settings-field">
          <label htmlFor="cover-art-archive-auth-mode">Authentication</label>
          <Select
            id="cover-art-archive-auth-mode"
            value={authMode}
            onChange={(event) => {
              setAuthMode(event.target.value as ArtworkAuthMode);
              markAsEdited();
            }}
          >
            <option value="none">None</option>
            <option value="basic">Basic Auth</option>
            <option value="header">API Key / Header</option>
          </Select>
        </div>

        {authMode === "basic" ? (
          <div className="settings-auth-fields">
            <div className="settings-field">
              <label htmlFor="cover-art-archive-username">Username</label>
              <Input
                id="cover-art-archive-username"
                value={username}
                autoComplete="username"
                onChange={(event) => {
                  setUsername(event.target.value);
                  markAsEdited();
                }}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="cover-art-archive-password">Password</label>
              <SecretField
                id="cover-art-archive-password"
                ariaLabel="Saved Cover Art Archive password"
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
              <label htmlFor="cover-art-archive-header-name">Header name</label>
              <Input
                id="cover-art-archive-header-name"
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
              <label htmlFor="cover-art-archive-header-secret">
                API key / value
              </label>
              <SecretField
                id="cover-art-archive-header-secret"
                ariaLabel="Saved Cover Art Archive header value"
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

        <div className="settings-note">
          <strong>Local instances:</strong>
          <span>
            Configure the HTTP endpoint and authentication required by your Cover
            Art Archive-compatible service.
          </span>
        </div>

        <ConnectionTestStatus state={connection} />

        <div className="provider-card-actions">
          {settings.customized ? (
            <Button variant="text" disabled={saving} onClick={() => void reset()}>
              Reset to default
            </Button>
          ) : null}
          {message ? (
            <span className={message === "Saved" ? "save-feedback" : "form-error"}>
              {message === "Saved" ? "✓ Saved" : message}
            </span>
          ) : null}
          <Button
            variant="secondary"
            disabled={!fieldsAreValid || saving || connection.status === "testing"}
            onClick={() => void testConnection()}
          >
            {connection.status === "testing" ? "Testing..." : "Test Connection"}
          </Button>
          <Button disabled={!fieldsAreValid || saving} onClick={() => void save()}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </ProviderCard>
  );
}

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
          <CoverArtArchiveCard
            settings={settings.coverArtArchive}
            onSave={providers.update}
            onReset={providers.resetCoverArtArchive}
            onTest={providers.test}
          />

          {settings.fanart ? (
            <ApiProviderCard
              providerId="fanart"
              name="Fanart.tv"
              description="Artist and album artwork fallback after Cover Art Archive."
              defaultUrl={DEFAULT_FANART_URL}
              nativeAuthLabel="Fanart.tv API Key"
              nativeSecretLabel="API Key"
              nativeSecretPlaceholder="Fanart.tv API key"
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
              nativeAuthLabel="Fanart.tv API Key"
              nativeSecretLabel="API Key"
              nativeSecretPlaceholder="Fanart.tv API key"
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

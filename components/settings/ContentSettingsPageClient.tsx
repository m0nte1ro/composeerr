"use client";

import type { FormEvent } from "react";

import { ConnectionTestStatus } from "@/components/settings/ConnectionTestStatus";
import { ProviderCard } from "@/components/settings/ProviderCard";
import { SecretField } from "@/components/settings/SecretField";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useMusicBrainzSettings } from "@/hooks/useMusicBrainzSettings";

export function ContentSettingsPageClient() {
  const settings = useMusicBrainzSettings();

  function handleTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void settings.testConnection();
  }

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
        <ProviderCard>
          <SettingsSection
            title="MusicBrainz"
            description="Composeerr uses a MusicBrainz-compatible HTTP Web Service as its canonical content provider."
            headerRight={
              settings.connectionState.status === "success" ? (
                <div className="connection-chip connection-chip-success">
                  <span className="status-dot" />
                  Connected
                </div>
              ) : null
            }
          >
            <form onSubmit={handleTest}>
              <div className="settings-field">
                <label htmlFor="musicbrainz-url">Endpoint</label>
                <Input
                  id="musicbrainz-url"
                  type="url"
                  value={settings.url}
                  onChange={(event) => {
                    settings.setUrl(event.target.value);
                    settings.markAsEdited();
                  }}
                  placeholder="https://musicbrainz.org/ws/2"
                  autoComplete="off"
                />
                <span>
                  Use the public service or an HTTP endpoint exposed by your private
                  MusicBrainz-compatible mirror.
                </span>
              </div>

              <div className="settings-field">
                <label htmlFor="musicbrainz-auth-mode">Authentication</label>
                <Select
                  id="musicbrainz-auth-mode"
                  value={settings.authMode}
                  onChange={(event) => {
                    settings.setAuthMode(
                      event.target.value as "none" | "basic" | "header",
                    );
                    settings.markAsEdited();
                  }}
                >
                  <option value="none">None</option>
                  <option value="basic">Basic Auth</option>
                  <option value="header">API Key / Header</option>
                </Select>
              </div>

              {settings.authMode === "basic" && (
                <div className="settings-auth-fields">
                  <div className="settings-field">
                    <label htmlFor="musicbrainz-username">Username</label>
                    <Input
                      id="musicbrainz-username"
                      value={settings.username}
                      onChange={(event) => {
                        settings.setUsername(event.target.value);
                        settings.markAsEdited();
                      }}
                      autoComplete="username"
                    />
                  </div>

                  <div className="settings-field">
                    <label htmlFor="musicbrainz-password">Password</label>
                    <SecretField
                      id="musicbrainz-password"
                      ariaLabel="Saved MusicBrainz password"
                      hasSavedValue={settings.hasSavedPassword}
                      isEditing={settings.editingPassword}
                      showValue={settings.showPassword}
                      value={settings.password}
                      placeholder="Password"
                      onStartEditing={() => {
                        settings.setEditingPassword(true);
                        settings.setPassword("");
                        settings.setShowPassword(false);
                      }}
                      onCancelEditing={() => {
                        settings.setEditingPassword(false);
                        settings.setPassword("");
                        settings.setShowPassword(false);
                      }}
                      onToggleVisibility={() =>
                        settings.setShowPassword((current) => !current)
                      }
                      onChange={(value) => {
                        settings.setPassword(value);
                        settings.markAsEdited();
                      }}
                    />
                    <span>The saved password is never returned to the browser.</span>
                  </div>
                </div>
              )}

              {settings.authMode === "header" && (
                <div className="settings-auth-fields">
                  <div className="settings-field">
                    <label htmlFor="musicbrainz-header-name">Header name</label>
                    <Input
                      id="musicbrainz-header-name"
                      value={settings.headerName}
                      onChange={(event) => {
                        settings.setHeaderName(event.target.value);
                        settings.markAsEdited();
                      }}
                      placeholder="X-API-Key"
                      autoComplete="off"
                    />
                  </div>

                  <div className="settings-field">
                    <label htmlFor="musicbrainz-header-secret">API key / value</label>
                    <SecretField
                      id="musicbrainz-header-secret"
                      ariaLabel="Saved MusicBrainz header value"
                      hasSavedValue={settings.hasSavedHeaderSecret}
                      isEditing={settings.editingHeaderSecret}
                      showValue={settings.showHeaderSecret}
                      value={settings.headerSecret}
                      placeholder="API key or header value"
                      onStartEditing={() => {
                        settings.setEditingHeaderSecret(true);
                        settings.setHeaderSecret("");
                        settings.setShowHeaderSecret(false);
                      }}
                      onCancelEditing={() => {
                        settings.setEditingHeaderSecret(false);
                        settings.setHeaderSecret("");
                        settings.setShowHeaderSecret(false);
                      }}
                      onToggleVisibility={() =>
                        settings.setShowHeaderSecret((current) => !current)
                      }
                      onChange={(value) => {
                        settings.setHeaderSecret(value);
                        settings.markAsEdited();
                      }}
                    />
                    <span>The saved header value is never returned to the browser.</span>
                  </div>
                </div>
              )}

              <div className="settings-note">
                <strong>Local mirrors:</strong>
                <span>
                  Composeerr expects a MusicBrainz-compatible Web Service endpoint. A
                  local mirror must expose its HTTP API; Composeerr does not connect
                  directly to the MusicBrainz PostgreSQL database.
                </span>
              </div>

              <ConnectionTestStatus state={settings.connectionState} />

              <div className="settings-actions settings-actions-split">
                <Button
                  variant="secondary"
                  type="submit"
                  disabled={!settings.canTest}
                >
                  {settings.connectionState.status === "testing"
                    ? "Testing..."
                    : "Test Connection"}
                </Button>

                <div className="settings-save-group">
                  {settings.saveState === "saved" && (
                    <span className="save-feedback">✓ Saved</span>
                  )}
                  {settings.saveState === "error" && (
                    <span className="save-feedback save-feedback-error">
                      Save failed
                    </span>
                  )}
                  <Button
                    type="button"
                    disabled={!settings.canSave}
                    onClick={() => void settings.saveSettings()}
                  >
                    {settings.saveState === "saving" ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>
            </form>
          </SettingsSection>
        </ProviderCard>
      )}
    </>
  );
}

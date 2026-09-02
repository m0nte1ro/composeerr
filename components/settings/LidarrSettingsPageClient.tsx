"use client";

import Link from "next/link";
import type { FormEvent } from "react";

import { ConnectionTestStatus } from "@/components/settings/ConnectionTestStatus";
import { ProviderCard } from "@/components/settings/ProviderCard";
import { SecretField } from "@/components/settings/SecretField";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useLidarrSettings } from "@/hooks/useLidarrSettings";

export function LidarrSettingsPageClient() {
  const {
    loading,
    options,
    connectionState,
    saveState,
    canTest,
    canSave,
    url,
    setUrl,
    apiKey,
    setApiKey,
    hasSavedApiKey,
    showApiKey,
    setShowApiKey,
    editingApiKey,
    setEditingApiKey,
    rootFolderId,
    setRootFolderId,
    qualityProfileId,
    setQualityProfileId,
    metadataProfileId,
    setMetadataProfileId,
    searchAfterAdd,
    setSearchAfterAdd,
    connectionChanged,
    markAsEdited,
    testConnection,
    saveSettings,
  } = useLidarrSettings();

  function handleTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void testConnection();
  }

  return (
    <div className="settings-page">
      <aside className="settings-sidebar">
        <Link href="/" className="settings-brand">
          <div className="brand-mark">C</div>

          <div>
            <strong>Composeerr</strong>
            <span>Settings</span>
          </div>
        </Link>

        <nav className="settings-navigation">
          <button type="button" className="settings-nav-item settings-nav-item-active">
            Lidarr
          </button>

          <button type="button" className="settings-nav-item" disabled>
            Metadata
            <span>Soon</span>
          </button>

          <button type="button" className="settings-nav-item" disabled>
            Artwork
            <span>Soon</span>
          </button>

          <button type="button" className="settings-nav-item" disabled>
            Recommendations
            <span>Soon</span>
          </button>
        </nav>

        <Link href="/" className="settings-back">
          ← Back to Composeerr
        </Link>
      </aside>

      <main className="settings-content">
        <div className="settings-content-inner">
          <header className="settings-header">
            <div className="settings-eyebrow">Settings</div>

            <h1>Lidarr</h1>

            <p>
              Connect Composeerr to the Lidarr instance that manages your music library.
            </p>
          </header>

          {loading ? (
            <section className="settings-card">
              <div className="settings-loading">Loading settings...</div>
            </section>
          ) : (
            <ProviderCard>
              <SettingsSection
                title="Connection"
                description="Composeerr talks to Lidarr server-side. Saved credentials stay on the Composeerr server."
                headerRight={
                  connectionState.status === "success" ? (
                    <div className="connection-chip connection-chip-success">
                      <span className="status-dot" />
                      Connected
                    </div>
                  ) : null
                }
              >
                <form onSubmit={handleTest}>
                  <div className="settings-field">
                    <label htmlFor="lidarr-url">Lidarr URL</label>

                    <Input
                      id="lidarr-url"
                      type="url"
                      value={url}
                      onChange={(event) => {
                        setUrl(event.target.value);
                        connectionChanged();
                      }}
                      placeholder="http://192.168.1.159:8686"
                      autoComplete="off"
                    />
                  </div>

                  <div className="settings-field">
                    <label htmlFor="lidarr-api-key">API Key</label>

                    <SecretField
                      id="lidarr-api-key"
                      hasSavedValue={hasSavedApiKey}
                      isEditing={editingApiKey}
                      showValue={showApiKey}
                      value={apiKey}
                      placeholder={hasSavedApiKey ? "Enter new API key" : "Lidarr API key"}
                      onStartEditing={() => {
                        setEditingApiKey(true);
                        setApiKey("");
                        setShowApiKey(false);
                      }}
                      onCancelEditing={() => {
                        setEditingApiKey(false);
                        setApiKey("");
                        setShowApiKey(false);
                      }}
                      onToggleVisibility={() => setShowApiKey((current) => !current)}
                      onChange={(value) => {
                        setApiKey(value);
                        connectionChanged();
                      }}
                    />

                    <span>The saved API key is never returned to the browser.</span>
                  </div>

                  <ConnectionTestStatus state={connectionState} />

                  <div className="settings-actions settings-actions-test">
                    <Button
                      variant="secondary"
                      type="submit"
                      disabled={!canTest || connectionState.status === "testing"}
                    >
                      {connectionState.status === "testing" ? "Testing..." : "Test Connection"}
                    </Button>
                  </div>

                  {options && connectionState.status === "success" && (
                    <div className="lidarr-options">
                      <div className="settings-divider" />

                      <div className="settings-subheading">
                        <h2>Request defaults</h2>

                        <p>
                          These values will be used when Composeerr sends an album to Lidarr.
                        </p>
                      </div>

                      <div className="settings-field">
                        <label htmlFor="root-folder">Root Folder</label>

                        <Select
                          id="root-folder"
                          value={rootFolderId}
                          onChange={(event) => {
                            setRootFolderId(event.target.value);
                            markAsEdited();
                          }}
                        >
                          {options.rootFolders.map((folder) => (
                            <option key={folder.id} value={folder.id}>
                              {folder.path}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="settings-grid">
                        <div className="settings-field">
                          <label htmlFor="quality-profile">Quality Profile</label>

                          <Select
                            id="quality-profile"
                            value={qualityProfileId}
                            onChange={(event) => {
                              setQualityProfileId(event.target.value);
                              markAsEdited();
                            }}
                          >
                            {options.qualityProfiles.map((profile) => (
                              <option key={profile.id} value={profile.id}>
                                {profile.name}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div className="settings-field">
                          <label htmlFor="metadata-profile">Metadata Profile</label>

                          <Select
                            id="metadata-profile"
                            value={metadataProfileId}
                            onChange={(event) => {
                              setMetadataProfileId(event.target.value);
                              markAsEdited();
                            }}
                          >
                            {options.metadataProfiles.map((profile) => (
                              <option key={profile.id} value={profile.id}>
                                {profile.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>

                      <label className="settings-toggle">
                        <Input
                          type="checkbox"
                          checked={searchAfterAdd}
                          onChange={(event) => {
                            setSearchAfterAdd(event.target.checked);
                            markAsEdited();
                          }}
                        />

                        <span>
                          <strong>Search after requesting</strong>

                          <small>
                            Trigger a Lidarr search immediately after adding an album.
                          </small>
                        </span>
                      </label>

                      <div className="settings-actions">
                        {saveState === "saved" && <span className="save-feedback">✓ Saved</span>}

                        {saveState === "error" && (
                          <span className="save-feedback save-feedback-error">Save failed</span>
                        )}

                        <Button type="button" disabled={!canSave} onClick={() => void saveSettings()}>
                          {saveState === "saving" ? "Saving..." : "Save Settings"}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              </SettingsSection>
            </ProviderCard>
          )}
        </div>
      </main>
    </div>
  );
}

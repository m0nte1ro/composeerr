"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

type RootFolder = {
  id: number;
  name?: string;
  path: string;
};

type Profile = {
  id: number;
  name: string;
};

type LidarrOptions = {
  rootFolders: RootFolder[];
  qualityProfiles: Profile[];
  metadataProfiles: Profile[];
};

type ConnectionState =
  | {
      status: "idle";
    }
  | {
      status: "testing";
    }
  | {
      status: "success";
      version?: string | null;
      instanceName?: string | null;
    }
  | {
      status: "error";
      message: string;
    };

type SaveState =
  | "idle"
  | "saving"
  | "saved"
  | "error";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [hasSavedApiKey, setHasSavedApiKey] =
    useState(false);

  const [showApiKey, setShowApiKey] =
    useState(false);
    
  const [editingApiKey, setEditingApiKey] =
    useState(false);

  const [rootFolderId, setRootFolderId] =
    useState("");

  const [qualityProfileId, setQualityProfileId] =
    useState("");

  const [
    metadataProfileId,
    setMetadataProfileId,
  ] = useState("");

  const [searchAfterAdd, setSearchAfterAdd] =
    useState(true);

  const [options, setOptions] =
    useState<LidarrOptions | null>(null);

  const [connectionState, setConnectionState] =
    useState<ConnectionState>({
      status: "idle",
    });

  const [saveState, setSaveState] =
    useState<SaveState>("idle");

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch(
          "/api/settings/lidarr",
          {
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (data.settings) {
          setUrl(data.settings.url ?? "");

          setHasSavedApiKey(
            Boolean(data.settings.hasApiKey),
          );

          setRootFolderId(
            data.settings.rootFolderId?.toString() ??
              "",
          );

          setQualityProfileId(
            data.settings.qualityProfileId?.toString() ??
              "",
          );

          setMetadataProfileId(
            data.settings.metadataProfileId?.toString() ??
              "",
          );

          setSearchAfterAdd(
            data.settings.searchAfterAdd ?? true,
          );

          const optionsResponse = await fetch(
            "/api/lidarr/options",
            {
              cache: "no-store",
            },
          );

          const optionsData =
            await optionsResponse.json();

          if (
            optionsResponse.ok &&
            optionsData.ok
          ) {
            setOptions(optionsData.options);

            setConnectionState({
              status: "success",
            });
          }
        }
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, []);

  function setDefaultSelections(
    nextOptions: LidarrOptions,
  ) {
    setRootFolderId((current) => {
      if (
        current &&
        nextOptions.rootFolders.some(
          (item) =>
            item.id.toString() === current,
        )
      ) {
        return current;
      }

      return (
        nextOptions.rootFolders[0]?.id.toString() ??
        ""
      );
    });

    setQualityProfileId((current) => {
      if (
        current &&
        nextOptions.qualityProfiles.some(
          (item) =>
            item.id.toString() === current,
        )
      ) {
        return current;
      }

      return (
        nextOptions.qualityProfiles[0]?.id.toString() ??
        ""
      );
    });

    setMetadataProfileId((current) => {
      if (
        current &&
        nextOptions.metadataProfiles.some(
          (item) =>
            item.id.toString() === current,
        )
      ) {
        return current;
      }

      return (
        nextOptions.metadataProfiles[0]?.id.toString() ??
        ""
      );
    });
  }

  function connectionChanged() {
    setConnectionState({
      status: "idle",
    });

    setSaveState("idle");
  }

  async function testConnection(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setConnectionState({
      status: "testing",
    });

    setSaveState("idle");

    try {
      const response = await fetch(
        "/api/lidarr/test",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            url,
            apiKey:
              apiKey.trim() || undefined,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setConnectionState({
          status: "error",
          message:
            data.error ??
            "Connection test failed.",
        });

        return;
      }

      setOptions(data.options);
      setDefaultSelections(data.options);

      setConnectionState({
        status: "success",
        version: data.lidarr?.version,
        instanceName:
          data.lidarr?.instanceName,
      });
    } catch {
      setConnectionState({
        status: "error",
        message:
          "Could not contact the Composeerr backend.",
      });
    }
  }

  async function saveSettings() {
    setSaveState("saving");

    try {
      const response = await fetch(
        "/api/settings/lidarr",
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            url,

            apiKey:
              apiKey.trim() || undefined,

            rootFolderId: rootFolderId
              ? Number(rootFolderId)
              : null,

            qualityProfileId:
              qualityProfileId
                ? Number(qualityProfileId)
                : null,

            metadataProfileId:
              metadataProfileId
                ? Number(metadataProfileId)
                : null,

            searchAfterAdd,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setSaveState("error");

        setConnectionState({
          status: "error",
          message:
            data.error ??
            "Could not save settings.",
        });

        return;
      }

      setHasSavedApiKey(true);
      setApiKey("");

      setEditingApiKey(false);
      setShowApiKey(false);

      setSaveState("saved");

      window.setTimeout(() => {
        setSaveState("idle");
      }, 1800);
    } catch {
      setSaveState("error");
    }
  }

  const canTest =
    Boolean(url.trim()) &&
    (Boolean(apiKey.trim()) ||
      hasSavedApiKey);

  const canSave =
    connectionState.status === "success" &&
    Boolean(rootFolderId) &&
    Boolean(qualityProfileId) &&
    Boolean(metadataProfileId) &&
    saveState !== "saving";

  return (
    <div className="settings-page">
      <aside className="settings-sidebar">
        <Link
          href="/"
          className="settings-brand"
        >
          <div className="brand-mark">C</div>

          <div>
            <strong>Composeerr</strong>
            <span>Settings</span>
          </div>
        </Link>

        <nav className="settings-navigation">
          <button
            type="button"
            className="settings-nav-item settings-nav-item-active"
          >
            Lidarr
          </button>

          <button
            type="button"
            className="settings-nav-item"
            disabled
          >
            Metadata
            <span>Soon</span>
          </button>

          <button
            type="button"
            className="settings-nav-item"
            disabled
          >
            Artwork
            <span>Soon</span>
          </button>

          <button
            type="button"
            className="settings-nav-item"
            disabled
          >
            Recommendations
            <span>Soon</span>
          </button>
        </nav>

        <Link
          href="/"
          className="settings-back"
        >
          ← Back to Composeerr
        </Link>
      </aside>

      <main className="settings-content">
        <div className="settings-content-inner">
          <header className="settings-header">
            <div className="settings-eyebrow">
              Settings
            </div>

            <h1>Lidarr</h1>

            <p>
              Connect Composeerr to the Lidarr
              instance that manages your music
              library.
            </p>
          </header>

          {loading ? (
            <section className="settings-card">
              <div className="settings-loading">
                Loading settings...
              </div>
            </section>
          ) : (
            <section className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2>Connection</h2>

                  <p>
                    Composeerr talks to Lidarr
                    server-side. Saved credentials
                    stay on the Composeerr server.
                  </p>
                </div>

                {connectionState.status ===
                  "success" && (
                  <div className="connection-chip connection-chip-success">
                    <span className="status-dot" />
                    Connected
                  </div>
                )}
              </div>

              <form onSubmit={testConnection}>
                <div className="settings-field">
                  <label htmlFor="lidarr-url">
                    Lidarr URL
                  </label>

                  <input
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
                  <label htmlFor="lidarr-api-key">
                    API Key
                  </label>

                  {hasSavedApiKey && !editingApiKey ? (
  <div className="secret-input">
    <input
      id="lidarr-api-key"
      type="text"
      value="••••••••••••••••"
      readOnly
      aria-label="Saved Lidarr API key"
    />

    <button
      type="button"
      onClick={() => {
        setEditingApiKey(true);
        setApiKey("");
        setShowApiKey(false);
      }}
    >
      Change
    </button>
  </div>
) : (
  <div className="secret-input">
    <input
      id="lidarr-api-key"
      type={showApiKey ? "text" : "password"}
      value={apiKey}
      onChange={(event) => {
        setApiKey(event.target.value);
        connectionChanged();
      }}
      placeholder={
        hasSavedApiKey
          ? "Enter new API key"
          : "Lidarr API key"
      }
      autoComplete="off"
    />

    <button
      type="button"
      onClick={() =>
        setShowApiKey((current) => !current)
      }
    >
      {showApiKey ? "Hide" : "Show"}
    </button>

    {hasSavedApiKey && (
      <button
        type="button"
        onClick={() => {
          setEditingApiKey(false);
          setApiKey("");
          setShowApiKey(false);
        }}
      >
        Cancel
      </button>
    )}
  </div>
)}

                  <span>
                    The saved API key is never
                    returned to the browser.
                  </span>
                </div>

                {connectionState.status ===
                  "error" && (
                  <div className="connection-result connection-result-error">
                    <strong>
                      Connection failed
                    </strong>

                    <span>
                      {connectionState.message}
                    </span>
                  </div>
                )}

                {connectionState.status ===
                  "success" &&
                  connectionState.version && (
                    <div className="connection-result connection-result-success">
                      <strong>
                        {connectionState.instanceName ||
                          "Lidarr"}{" "}
                        is reachable.
                      </strong>

                      <span>
                        Running Lidarr{" "}
                        {connectionState.version}.
                      </span>
                    </div>
                  )}

                <div className="settings-actions settings-actions-test">
                  <button
                    className="secondary-button"
                    type="submit"
                    disabled={
                      !canTest ||
                      connectionState.status ===
                        "testing"
                    }
                  >
                    {connectionState.status ===
                    "testing"
                      ? "Testing..."
                      : "Test Connection"}
                  </button>
                </div>

                {options &&
                  connectionState.status ===
                    "success" && (
                    <div className="lidarr-options">
                      <div className="settings-divider" />

                      <div className="settings-subheading">
                        <h2>
                          Request defaults
                        </h2>

                        <p>
                          These values will be used
                          when Composeerr sends an
                          album to Lidarr.
                        </p>
                      </div>

                      <div className="settings-field">
                        <label htmlFor="root-folder">
                          Root Folder
                        </label>

                        <select
                          id="root-folder"
                          value={rootFolderId}
                          onChange={(event) => {
                            setRootFolderId(
                              event.target.value,
                            );

                            setSaveState("idle");
                          }}
                        >
                          {options.rootFolders.map(
                            (folder) => (
                              <option
                                key={folder.id}
                                value={folder.id}
                              >
                                {folder.path}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      <div className="settings-grid">
                        <div className="settings-field">
                          <label htmlFor="quality-profile">
                            Quality Profile
                          </label>

                          <select
                            id="quality-profile"
                            value={qualityProfileId}
                            onChange={(event) => {
                              setQualityProfileId(
                                event.target.value,
                              );

                              setSaveState(
                                "idle",
                              );
                            }}
                          >
                            {options.qualityProfiles.map(
                              (profile) => (
                                <option
                                  key={profile.id}
                                  value={profile.id}
                                >
                                  {profile.name}
                                </option>
                              ),
                            )}
                          </select>
                        </div>

                        <div className="settings-field">
                          <label htmlFor="metadata-profile">
                            Metadata Profile
                          </label>

                          <select
                            id="metadata-profile"
                            value={
                              metadataProfileId
                            }
                            onChange={(event) => {
                              setMetadataProfileId(
                                event.target.value,
                              );

                              setSaveState(
                                "idle",
                              );
                            }}
                          >
                            {options.metadataProfiles.map(
                              (profile) => (
                                <option
                                  key={profile.id}
                                  value={profile.id}
                                >
                                  {profile.name}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      </div>

                      <label className="settings-toggle">
                        <input
                          type="checkbox"
                          checked={searchAfterAdd}
                          onChange={(event) => {
                            setSearchAfterAdd(
                              event.target.checked,
                            );

                            setSaveState("idle");
                          }}
                        />

                        <span>
                          <strong>
                            Search after requesting
                          </strong>

                          <small>
                            Trigger a Lidarr search
                            immediately after adding
                            an album.
                          </small>
                        </span>
                      </label>

                      <div className="settings-actions">
                        {saveState ===
                          "saved" && (
                          <span className="save-feedback">
                            ✓ Saved
                          </span>
                        )}

                        {saveState ===
                          "error" && (
                          <span className="save-feedback save-feedback-error">
                            Save failed
                          </span>
                        )}

                        <button
                          className="primary-button"
                          type="button"
                          disabled={!canSave}
                          onClick={saveSettings}
                        >
                          {saveState === "saving"
                            ? "Saving..."
                            : "Save Settings"}
                        </button>
                      </div>
                    </div>
                  )}
              </form>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
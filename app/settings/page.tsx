"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type TestState =
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

export default function SettingsPage() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const [testState, setTestState] = useState<TestState>({
    status: "idle",
  });

  async function testConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setTestState({
      status: "testing",
    });

    try {
      const response = await fetch("/api/lidarr/test", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          url,
          apiKey,
        }),
      });

      const data = (await response.json()) as {
        ok: boolean;

        error?: string;

        lidarr?: {
          version?: string | null;
          instanceName?: string | null;
        };
      };

      if (!response.ok || !data.ok) {
        setTestState({
          status: "error",
          message: data.error ?? "Connection test failed.",
        });

        return;
      }

      setTestState({
        status: "success",
        version: data.lidarr?.version,
        instanceName: data.lidarr?.instanceName,
      });
    } catch {
      setTestState({
        status: "error",
        message: "Could not contact the Composeerr backend.",
      });
    }
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
          <button
            type="button"
            className="settings-nav-item settings-nav-item-active"
          >
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
              Connect Composeerr to the Lidarr instance that manages your music
              library.
            </p>
          </header>

          <section className="settings-card">
            <div className="settings-card-header">
              <div>
                <h2>Connection</h2>
                <p>
                  Composeerr talks to Lidarr server-side. Your API key is never
                  sent directly from the browser to Lidarr.
                </p>
              </div>

              {testState.status === "success" && (
                <div className="connection-chip connection-chip-success">
                  <span className="status-dot" />
                  Connected
                </div>
              )}
            </div>

            <form onSubmit={testConnection}>
              <div className="settings-field">
                <label htmlFor="lidarr-url">Lidarr URL</label>

                <input
                  id="lidarr-url"
                  type="url"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setTestState({ status: "idle" });
                  }}
                  placeholder="http://192.168.1.100:8686"
                  autoComplete="off"
                />

                <span>
                  The address Composeerr can use to reach your Lidarr instance.
                </span>
              </div>

              <div className="settings-field">
                <label htmlFor="lidarr-api-key">API Key</label>

                <div className="secret-input">
                  <input
                    id="lidarr-api-key"
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(event) => {
                      setApiKey(event.target.value);
                      setTestState({ status: "idle" });
                    }}
                    placeholder="Lidarr API key"
                    autoComplete="off"
                  />

                  <button
                    type="button"
                    onClick={() => setShowApiKey((current) => !current)}
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                </div>

                <span>
                  Found in Lidarr under Settings → General → Security.
                </span>
              </div>

              {testState.status === "error" && (
                <div className="connection-result connection-result-error">
                  <strong>Connection failed</strong>
                  <span>{testState.message}</span>
                </div>
              )}

              {testState.status === "success" && (
                <div className="connection-result connection-result-success">
                  <strong>
                    {testState.instanceName || "Lidarr"} is reachable.
                  </strong>

                  <span>
                    {testState.version
                      ? `Running Lidarr ${testState.version}.`
                      : "The connection was authenticated successfully."}
                  </span>
                </div>
              )}

              <div className="settings-actions">
                <button
                  className="secondary-button"
                  type="submit"
                  disabled={
                    testState.status === "testing" ||
                    !url.trim() ||
                    !apiKey.trim()
                  }
                >
                  {testState.status === "testing"
                    ? "Testing..."
                    : "Test Connection"}
                </button>

                <button className="primary-button" type="button" disabled>
                  Save Settings
                </button>
              </div>
            </form>
          </section>

          <div className="settings-note">
            <strong>Not persisted yet.</strong>

            <span>
              This step only proves that Composeerr can communicate with
              Lidarr. Persistent server-side settings come next.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
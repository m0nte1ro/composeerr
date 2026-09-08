"use client";
import { useState, type FormEvent } from "react";
import { createSetupAdmin } from "@/lib/client/setup";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
export function SetupAdminForm({ onCreated }: { onCreated: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await createSetupAdmin({
        username: String(data.get("username")),
        password: String(data.get("password")),
        confirmPassword: String(data.get("confirmPassword")),
      });
      onCreated();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create administrator.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card">
      <header className="settings-card-header setup-admin-header">
        <div>
          <h1>Create your administrator account</h1>
          <p>This account manages users and the shared configuration.</p>
        </div>
      </header>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="provider-fields">
          <div className="settings-field">
            <label htmlFor="setup-username">Username</label>
            <Input
              id="setup-username"
              name="username"
              required
              minLength={3}
              maxLength={32}
              autoComplete="username"
              pattern="[a-zA-Z0-9_.-]+"
            />
          </div>
          <div className="settings-field">
            <label htmlFor="setup-password">Password</label>
            <Input
              id="setup-password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </div>
          <div className="settings-field">
            <label htmlFor="setup-confirm">Confirm password</label>
            <Input
              id="setup-confirm"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="settings-actions">
            <Button type="submit">
              {busy ? "Creating..." : "Create account and continue"}
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}

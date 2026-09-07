"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { SettingsSection } from "./SettingsSection";
import { updateRegistration } from "@/lib/client/auth";

export function RegistrationSettings({ initialEnabled, locked }: { initialEnabled: boolean; locked: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saved, setSaved] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");
    try {
      const result = await updateRegistration(enabled);
      setSaved(result.registrationEnabled);
      setEnabled(result.registrationEnabled);
      setMessage(result.registrationEnabled ? "Registration is open." : "Registration is closed.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save registration settings.");
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSection title="Registration" description="Choose who can join this Composeerr instance. Existing accounts can still sign in when registration is closed.">
      <form onSubmit={submit}>
        <label className="settings-toggle">
          <input type="checkbox" checked={enabled} disabled={pending || locked}
            onChange={(event) => { setEnabled(event.target.checked); setMessage(""); }} />
          <span>
            <strong>Allow new registrations</strong>
            <small>Anyone who can reach this website can create an account and request albums when enabled.</small>
          </span>
        </label>
        {locked && <p className="auth-notice">Update your password first.</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {message && <p className="auth-success" role="status">{message}</p>}
        <div className="settings-actions">
          <Button type="submit" disabled={pending || locked || enabled === saved}>{pending ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
    </SettingsSection>
  );
}

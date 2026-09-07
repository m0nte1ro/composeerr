"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SettingsSection } from "./SettingsSection";
import { updatePassword } from "@/lib/client/auth";
import type { AuthUser } from "@/lib/auth/types";

export function PasswordChangeForm({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setMessage("");
    setError("");
    try {
      await updatePassword({
        currentPassword: String(data.get("currentPassword") ?? ""),
        newPassword: String(data.get("newPassword") ?? ""),
        confirmPassword: String(data.get("confirmPassword") ?? ""),
      });
      form.reset();
      setMessage("Password updated. Your other devices have been signed out.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not update your password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSection title="Change password" description={"Update the password for " + user.username + ". Use at least 8 characters."}>
      <form onSubmit={submit}>
        <input type="hidden" name="username" autoComplete="username" value={user.username} />
        {user.mustChangePassword && (
          <p className="auth-notice" role="status">Choose a new password before using Composeerr.</p>
        )}
        <fieldset disabled={pending} className="auth-fields">
          <div className="settings-field">
            <label htmlFor="currentPassword">Current password</label>
            <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} />
          </div>
          <div className="settings-field">
            <label htmlFor="newPassword">New password</label>
            <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
          </div>
          <div className="settings-field">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
          </div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-success" role="status">{message}</p>}
          <div className="settings-actions">
            <Button type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</Button>
          </div>
        </fieldset>
      </form>
    </SettingsSection>
  );
}

"use client";

import Link from "next/link";
import { PasswordRecoveryHelp } from "./PasswordRecoveryHelp";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signIn } from "@/lib/client/auth";

export function AuthForm({ mode, registrationEnabled }: { mode: "login" | "register"; registrationEnabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const registering = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const { user } = await signIn(mode, {
        username: String(data.get("username") ?? ""),
        password: String(data.get("password") ?? ""),
        confirmPassword: registering ? String(data.get("confirmPassword") ?? "") : undefined,
      });
      // A full navigation also clears data cached for a previous account.
      window.location.assign(user.mustChangePassword ? "/settings/general" : "/");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in.");
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand"><div className="brand-mark">C</div><span>Composeerr</span></div>
        <h1 id="auth-title">{registering ? "Create an account" : "Welcome back"}</h1>
        <p>{registering ? "A username and password. That’s all you need." : "Sign in to find music and request albums."}</p>
        {registering && !registrationEnabled ? (
          <p className="auth-notice" role="status">Registration is currently closed. Ask the instance administrator to enable it.</p>
        ) : (
          <form onSubmit={submit}>
            <fieldset disabled={pending} className="auth-fields">
              <div className="settings-field">
                <label htmlFor="username">Username</label>
                <Input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
                  required minLength={3} maxLength={32} pattern="[a-zA-Z0-9_.\-]+" autoFocus />
                {registering && <span>3–32 letters, numbers, dots, underscores or hyphens.</span>}
              </div>
              <div className="settings-field">
                <label htmlFor="password">Password</label>
                <Input id="password" name="password" type="password" autoComplete={registering ? "new-password" : "current-password"}
                  required minLength={registering ? 8 : 1} maxLength={128} />
                {registering && <span>At least 8 characters.</span>}
              </div>
              {registering && (
                <div className="settings-field">
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password"
                    required minLength={8} maxLength={128} />
                </div>
              )}
              {error && <p className="auth-error" role="alert">{error}</p>}
              <Button type="submit" className="auth-submit" disabled={pending}>
                {pending ? "Please wait…" : registering ? "Create account" : "Sign in"}
              </Button>
            </fieldset>
          </form>
        )}
        {!registering && <PasswordRecoveryHelp />}
        <div className="auth-footer">
          {registering ? <Link href="/login">Already have an account? Sign in</Link>
            : registrationEnabled ? <Link href="/register">Create an account</Link>
              : <span>Registration is currently closed.</span>}
        </div>
      </section>
    </main>
  );
}

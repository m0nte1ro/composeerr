"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { AuthUser } from "@/lib/auth/types";
import { signOut } from "@/lib/client/auth";

export function AccountMenu({ user }: { user: AuthUser }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setPending(true);
    setError("");
    try {
      await signOut();
      // Clear all browser-side application state at an account boundary.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    } catch {
      setError("Could not sign out. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="account-menu">
      <span>Signed in as <strong>{user.username}</strong></span>
      <Button variant="secondary" disabled={pending} onClick={() => void logout()}>
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  );
}

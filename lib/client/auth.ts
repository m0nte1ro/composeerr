import type { AuthResult } from "@/lib/auth/types";
import { apiFetch } from "./http";

async function readResult<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error ?? "Could not complete this request.");
  return body as T;
}

export async function signIn(mode: "login" | "register", values: { username: string; password: string; confirmPassword?: string }) {
  return readResult<AuthResult>(await fetch("/api/auth/" + mode, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  }));
}

export async function signOut() {
  return readResult(await fetch("/api/auth/logout", { method: "POST" }));
}

export async function updatePassword(values: { currentPassword: string; newPassword: string; confirmPassword: string }) {
  return readResult<AuthResult>(await apiFetch("/api/auth/password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  }));
}

export async function updateRegistration(registrationEnabled: boolean) {
  return readResult<{ registrationEnabled: boolean }>(await apiFetch("/api/settings/general", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ registrationEnabled }),
  }));
}

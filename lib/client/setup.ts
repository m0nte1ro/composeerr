import type {
  SearchSettings,
  SearchSettingsPayload,
} from "@/lib/search/settings";
import { apiFetch } from "./http";
export async function configurationRequest<T>(
  path: string,
  method = "GET",
  payload?: unknown,
): Promise<T> {
  const response = await apiFetch(path, {
    method,
    cache: "no-store",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body = await response.json();
  if (!response.ok || !body.ok)
    throw new Error(body.error ?? "Could not save configuration.");
  return body as T;
}
export async function getSearchSettings() {
  return (
    await configurationRequest<{ settings: SearchSettings }>(
      "/api/settings/search",
    )
  ).settings;
}
export async function saveSearchSettings(payload: SearchSettingsPayload) {
  return (
    await configurationRequest<{ settings: SearchSettings }>(
      "/api/settings/search",
      "PUT",
      payload,
    )
  ).settings;
}
export async function testSearchSettings(payload: SearchSettingsPayload) {
  await configurationRequest("/api/search/test", "POST", payload);
}
export async function saveSetupProgress(step: number, complete = false) {
  await configurationRequest("/api/setup", "PUT", { step, complete });
}
export async function createSetupAdmin(payload: {
  username: string;
  password: string;
  confirmPassword: string;
}) {
  await configurationRequest("/api/auth/setup", "POST", payload);
}

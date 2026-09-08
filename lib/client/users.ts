import type { AuthUser } from "@/lib/auth/types";
import { configurationRequest } from "./setup";
export function getUsers() {
  return configurationRequest<{ users: AuthUser[] }>("/api/settings/users");
}
export function manageUsers(
  method: "POST" | "DELETE" | "PATCH",
  payload: unknown,
) {
  return configurationRequest<{
    users: AuthUser[];
    temporaryPassword?: string;
  }>("/api/settings/users", method, payload);
}

import { apiFetch } from "./http";
import type {
  ScheduledTaskKey,
  ScheduledTasksSettings,
  ScheduledTaskUpdatePayload,
} from "@/lib/scheduler/types";

async function readSettingsResponse(response: Response, fallback: string) {
  const data = (await response.json()) as {
    ok?: boolean;
    error?: string;
    settings?: ScheduledTasksSettings;
  };

  if (!response.ok || !data.ok || !data.settings) {
    throw new Error(data.error ?? fallback);
  }

  return data.settings;
}

export function getScheduledTasks() {
  return apiFetch("/api/settings/scheduled-tasks", { cache: "no-store" }).then(
    (response) => readSettingsResponse(response, "Could not load scheduled tasks."),
  );
}

export function updateScheduledTask(payload: ScheduledTaskUpdatePayload) {
  return apiFetch("/api/settings/scheduled-tasks", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((response) =>
    readSettingsResponse(response, "Could not update scheduled task."),
  );
}

export function runScheduledTask(key: ScheduledTaskKey) {
  return apiFetch("/api/scheduled-tasks/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  }).then((response) =>
    readSettingsResponse(response, "Could not run scheduled task."),
  );
}

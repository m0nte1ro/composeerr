export const SCHEDULED_TASK_KEYS = [
  "content-health",
  "metadata-health",
  "artwork-health",
  "metadata-backfill",
  "artwork-backfill",
] as const;

export type ScheduledTaskKey = (typeof SCHEDULED_TASK_KEYS)[number];

export type FriendlySchedule =
  | { kind: "hourly" }
  | { kind: "every-hours"; hours: number }
  | { kind: "daily"; time: string }
  | { kind: "weekly"; weekday: number; time: string };

export type ScheduledTaskStatus =
  | "idle"
  | "running"
  | "success"
  | "error"
  | "skipped"
  | "unavailable";

export type PublicScheduledTask = {
  key: ScheduledTaskKey;
  name: string;
  description: string;
  available: boolean;
  unavailableReason: string | null;
  enabled: boolean;
  schedule: FriendlySchedule;
  scheduleLabel: string;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  nextRunAt: string | null;
  lastDurationMs: number | null;
  status: ScheduledTaskStatus;
  summary: string | null;
};

export type ScheduledTasksSettings = {
  timezone: "UTC";
  tasks: PublicScheduledTask[];
};

export type ScheduledTaskUpdatePayload = {
  key: ScheduledTaskKey;
  enabled: boolean;
  schedule: FriendlySchedule;
};

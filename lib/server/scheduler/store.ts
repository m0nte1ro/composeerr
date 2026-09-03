import type {
  FriendlySchedule,
  PublicScheduledTask,
  ScheduledTaskKey,
  ScheduledTaskStatus,
  ScheduledTasksSettings,
  ScheduledTaskUpdatePayload,
} from "@/lib/scheduler/types";
import { db } from "@/lib/server/db";
import {
  getTaskDefinition,
  SCHEDULED_TASK_REGISTRY,
} from "@/lib/server/scheduler/registry";
import {
  calculateNextRun,
  describeSchedule,
  ScheduleValidationError,
  validateSchedule,
} from "@/lib/server/scheduler/schedules";

type TaskRow = {
  task_key: ScheduledTaskKey;
  enabled: number;
  schedule_json: string;
  last_run_at: string | null;
  last_success_at: string | null;
  next_run_at: string | null;
  last_duration_ms: number | null;
  last_status: ScheduledTaskStatus;
  last_summary: string | null;
};

export class ScheduledTaskSettingsError extends Error {}

export function initializeScheduledTasks() {
  const insert = db.prepare(
    `
      INSERT OR IGNORE INTO scheduled_tasks (
        task_key, enabled, schedule_json, next_run_at, last_status, last_summary
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
  );

  const transaction = db.transaction(() => {
    for (const definition of SCHEDULED_TASK_REGISTRY) {
      const available = Boolean(definition.execute);
      insert.run(
        definition.key,
        available && definition.defaultEnabled ? 1 : 0,
        JSON.stringify(definition.defaultSchedule),
        available ? calculateNextRun(definition.defaultSchedule) : null,
        available ? "idle" : "unavailable",
        definition.unavailableReason ?? null,
      );

      if (!available) {
        db.prepare(
          `
            UPDATE scheduled_tasks
            SET enabled = 0,
                next_run_at = NULL,
                last_status = 'unavailable',
                last_summary = ?,
                lock_token = NULL,
                lock_expires_at = NULL
            WHERE task_key = ?
          `,
        ).run(definition.unavailableReason ?? "Task is unavailable.", definition.key);
      }
    }
  });

  transaction();
}

function parseSchedule(value: string, fallback: FriendlySchedule) {
  try {
    return validateSchedule(JSON.parse(value));
  } catch {
    return fallback;
  }
}

function toPublicTask(row: TaskRow): PublicScheduledTask | null {
  const definition = getTaskDefinition(row.task_key);

  if (!definition) {
    return null;
  }

  const schedule = parseSchedule(row.schedule_json, definition.defaultSchedule);
  const available = Boolean(definition.execute);

  return {
    key: definition.key,
    name: definition.name,
    description: definition.description,
    available,
    unavailableReason: definition.unavailableReason ?? null,
    enabled: available && Boolean(row.enabled),
    schedule,
    scheduleLabel: describeSchedule(schedule),
    lastRunAt: row.last_run_at,
    lastSuccessAt: row.last_success_at,
    nextRunAt: available && row.enabled ? row.next_run_at : null,
    lastDurationMs: row.last_duration_ms,
    status: available ? row.last_status : "unavailable",
    summary: available ? row.last_summary : definition.unavailableReason ?? null,
  };
}

export function getScheduledTasksSettings(): ScheduledTasksSettings {
  initializeScheduledTasks();
  const rows = db.prepare("SELECT * FROM scheduled_tasks").all() as TaskRow[];

  return {
    timezone: "UTC",
    tasks: SCHEDULED_TASK_REGISTRY.flatMap((definition) => {
      const row = rows.find((item) => item.task_key === definition.key);
      const task = row ? toPublicTask(row) : null;
      return task ? [task] : [];
    }),
  };
}

export function updateScheduledTask(payload: ScheduledTaskUpdatePayload) {
  const definition = getTaskDefinition(payload?.key);

  if (!definition) {
    throw new ScheduledTaskSettingsError("Choose a valid scheduled task.");
  }

  if (!definition.execute) {
    throw new ScheduledTaskSettingsError(
      definition.unavailableReason ?? "This task is not available.",
    );
  }

  if (typeof payload.enabled !== "boolean") {
    throw new ScheduledTaskSettingsError("Enabled state is required.");
  }

  let schedule: FriendlySchedule;

  try {
    schedule = validateSchedule(payload.schedule);
  } catch (error) {
    throw new ScheduledTaskSettingsError(
      error instanceof ScheduleValidationError
        ? error.message
        : "Choose a valid schedule.",
    );
  }

  initializeScheduledTasks();
  db.prepare(
    `
      UPDATE scheduled_tasks
      SET enabled = ?,
          schedule_json = ?,
          next_run_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE task_key = ?
    `,
  ).run(
    payload.enabled ? 1 : 0,
    JSON.stringify(schedule),
    payload.enabled ? calculateNextRun(schedule) : null,
    definition.key,
  );

  return getScheduledTasksSettings();
}

export function recoverExpiredTaskLocks(now = new Date()) {
  const nowIso = now.toISOString();
  const transaction = db.transaction(() => {
    const expired = db
      .prepare(
        `
          SELECT task_key
          FROM scheduled_tasks
          WHERE lock_token IS NOT NULL
            AND lock_expires_at <= ?
        `,
      )
      .all(nowIso) as Array<{ task_key: ScheduledTaskKey }>;

    const expireRuns = db.prepare(
      `
        UPDATE scheduled_task_runs
        SET completed_at = ?,
            status = 'error',
            summary = 'Previous execution was interrupted.'
        WHERE task_key = ? AND status = 'running'
      `,
    );

    for (const row of expired) {
      expireRuns.run(nowIso, row.task_key);
    }

    db.prepare(
      `
        UPDATE scheduled_tasks
        SET last_status = 'error',
            last_summary = 'Previous execution was interrupted.',
            lock_token = NULL,
            lock_expires_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE lock_token IS NOT NULL
          AND lock_expires_at <= ?
      `,
    ).run(nowIso);
  });

  transaction();
}

export function acquireTaskLock(
  key: ScheduledTaskKey,
  token: string,
  startedAt: Date,
) {
  initializeScheduledTasks();
  const startedIso = startedAt.toISOString();
  const expiresIso = new Date(startedAt.getTime() + 30 * 60 * 1000).toISOString();
  const transaction = db.transaction(() => {
    const result = db.prepare(
      `
        UPDATE scheduled_tasks
        SET lock_token = ?,
            lock_expires_at = ?,
            last_run_at = ?,
            last_status = 'running',
            last_summary = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE task_key = ?
          AND (lock_token IS NULL OR lock_expires_at <= ?)
      `,
    ).run(token, expiresIso, startedIso, key, startedIso);

    if (result.changes !== 1) {
      return null;
    }

    const run = db.prepare(
      `
        INSERT INTO scheduled_task_runs (task_key, started_at, status)
        VALUES (?, ?, 'running')
      `,
    ).run(key, startedIso);

    return Number(run.lastInsertRowid);
  });

  return transaction();
}

export function completeTaskRun(values: {
  key: ScheduledTaskKey;
  token: string;
  runId: number;
  completedAt: Date;
  durationMs: number;
  status: "success" | "error" | "skipped";
  summary: string;
}) {
  const definition = getTaskDefinition(values.key);

  if (!definition) return;

  const row = db
    .prepare("SELECT schedule_json, enabled FROM scheduled_tasks WHERE task_key = ?")
    .get(values.key) as { schedule_json: string; enabled: number } | undefined;
  const schedule = parseSchedule(
    row?.schedule_json ?? JSON.stringify(definition.defaultSchedule),
    definition.defaultSchedule,
  );
  const completedIso = values.completedAt.toISOString();
  const transaction = db.transaction(() => {
    db.prepare(
      `
        UPDATE scheduled_task_runs
        SET completed_at = ?, status = ?, duration_ms = ?, summary = ?
        WHERE id = ?
      `,
    ).run(
      completedIso,
      values.status,
      values.durationMs,
      values.summary,
      values.runId,
    );

    db.prepare(
      `
        UPDATE scheduled_tasks
        SET last_success_at = CASE WHEN ? = 'success' THEN ? ELSE last_success_at END,
            next_run_at = ?,
            last_duration_ms = ?,
            last_status = ?,
            last_summary = ?,
            lock_token = NULL,
            lock_expires_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE task_key = ? AND lock_token = ?
      `,
    ).run(
      values.status,
      completedIso,
      row?.enabled ? calculateNextRun(schedule, values.completedAt) : null,
      values.durationMs,
      values.status,
      values.summary,
      values.key,
      values.token,
    );

    db.prepare(
      `
        DELETE FROM scheduled_task_runs
        WHERE task_key = ?
          AND id NOT IN (
            SELECT id FROM scheduled_task_runs
            WHERE task_key = ?
            ORDER BY started_at DESC
            LIMIT 25
          )
      `,
    ).run(values.key, values.key);
  });

  transaction();
}

export function getDueTaskKeys(now = new Date()) {
  initializeScheduledTasks();
  return (
    db
      .prepare(
        `
          SELECT task_key
          FROM scheduled_tasks
          WHERE enabled = 1
            AND next_run_at IS NOT NULL
            AND next_run_at <= ?
        `,
      )
      .all(now.toISOString()) as Array<{ task_key: ScheduledTaskKey }>
  ).map((row) => row.task_key);
}

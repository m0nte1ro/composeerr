import { getSetupState } from "@/lib/server/setup";
import { randomUUID } from "node:crypto";

import type { ScheduledTaskKey } from "@/lib/scheduler/types";
import { getTaskDefinition } from "@/lib/server/scheduler/registry";
import {
  acquireTaskLock,
  completeTaskRun,
  getDueTaskKeys,
  initializeScheduledTasks,
  recoverExpiredTaskLocks,
} from "@/lib/server/scheduler/store";

export class ScheduledTaskRunningError extends Error {}
export class ScheduledTaskUnavailableError extends Error {}

function safeExecutionError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message.slice(0, 500)
    : "Scheduled task failed.";
}

export async function runScheduledTask(key: ScheduledTaskKey) {
  const definition = getTaskDefinition(key);

  if (!definition) {
    throw new ScheduledTaskUnavailableError("Scheduled task does not exist.");
  }

  if (!definition.execute) {
    throw new ScheduledTaskUnavailableError(
      definition.unavailableReason ?? "Scheduled task is unavailable.",
    );
  }

  const token = randomUUID();
  const startedAt = new Date();
  const runId = acquireTaskLock(key, token, startedAt);

  if (!runId) {
    throw new ScheduledTaskRunningError(`${definition.name} is already running.`);
  }

  let status: "success" | "error" | "skipped" = "error";
  let summary = "Scheduled task failed.";

  try {
    const result = await definition.execute();
    status = result.status;
    summary = result.summary;
  } catch (error) {
    summary = safeExecutionError(error);
  }

  const completedAt = new Date();
  completeTaskRun({
    key,
    token,
    runId,
    completedAt,
    durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
    status,
    summary,
  });

  return { status, summary };
}

export async function runDueScheduledTasks() {
  if (!getSetupState().complete) return;
  recoverExpiredTaskLocks();
  const keys = getDueTaskKeys();
  await Promise.allSettled(keys.map((key) => runScheduledTask(key)));
}

type SchedulerGlobalState = {
  timer: NodeJS.Timeout | null;
};

const globalForScheduler = globalThis as unknown as {
  composeerrScheduler?: SchedulerGlobalState;
};

const schedulerState =
  globalForScheduler.composeerrScheduler ?? { timer: null };
globalForScheduler.composeerrScheduler = schedulerState;

export function startScheduler() {
  if (schedulerState.timer) {
    return;
  }

  initializeScheduledTasks();
  recoverExpiredTaskLocks();
  void runDueScheduledTasks();

  schedulerState.timer = setInterval(() => {
    void runDueScheduledTasks();
  }, 60_000);
  schedulerState.timer.unref();
}

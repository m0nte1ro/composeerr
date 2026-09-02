"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getScheduledTasks,
  runScheduledTask,
  updateScheduledTask,
} from "@/lib/client/scheduled-tasks";
import type {
  ScheduledTaskKey,
  ScheduledTasksSettings,
  ScheduledTaskUpdatePayload,
} from "@/lib/scheduler/types";

export function useScheduledTasks() {
  const [settings, setSettings] = useState<ScheduledTasksSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningKey, setRunningKey] = useState<ScheduledTaskKey | null>(null);

  useEffect(() => {
    getScheduledTasks()
      .then(setSettings)
      .catch((value) =>
        setError(value instanceof Error ? value.message : "Could not load tasks."),
      )
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback(async (payload: ScheduledTaskUpdatePayload) => {
    setSettings(await updateScheduledTask(payload));
  }, []);

  const run = useCallback(async (key: ScheduledTaskKey) => {
    setRunningKey(key);
    try {
      setSettings(await runScheduledTask(key));
    } finally {
      setRunningKey(null);
    }
  }, []);

  return { settings, loading, error, runningKey, update, run };
}

"use client";

import { useState } from "react";

import { ProviderCard } from "@/components/settings/ProviderCard";
import { ScheduleEditor } from "@/components/settings/ScheduleEditor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type {
  FriendlySchedule,
  PublicScheduledTask,
} from "@/lib/scheduler/types";

type ScheduledTaskCardProps = {
  task: PublicScheduledTask;
  running: boolean;
  onSave: (values: { enabled: boolean; schedule: FriendlySchedule }) => Promise<void>;
  onRun: () => Promise<void>;
};

function formatTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function formatDuration(value: number | null) {
  if (value === null) return "—";
  return value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(1)} s`;
}

export function ScheduledTaskCard({
  task,
  running,
  onSave,
  onRun,
}: ScheduledTaskCardProps) {
  const [enabled, setEnabled] = useState(task.enabled);
  const [schedule, setSchedule] = useState(task.schedule);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await onSave({ enabled, schedule });
      setMessage("Saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function run() {
    setMessage("");
    try {
      await onRun();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run failed.");
    }
  }

  return (
    <ProviderCard>
      <div className="provider-card-header scheduled-task-header">
        <div>
          <div className="provider-card-title-row">
            <h2>{task.name}</h2>
            <span className={`task-status task-status-${task.status}`}>
              {task.status === "unavailable" ? "Not ready" : task.status}
            </span>
          </div>
          <p>{task.description}</p>
        </div>

        <label className="provider-enabled-toggle">
          <Input
            type="checkbox"
            checked={enabled}
            disabled={!task.available}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <span>{enabled ? "Enabled" : "Disabled"}</span>
        </label>
      </div>

      <div className="provider-card-body">
        {task.available ? (
          <ScheduleEditor schedule={schedule} onChange={setSchedule} />
        ) : (
          <div className="task-unavailable">{task.unavailableReason}</div>
        )}

        <dl className="task-state-grid">
          <div><dt>Schedule</dt><dd>{task.scheduleLabel}</dd></div>
          <div><dt>Last run</dt><dd>{formatTimestamp(task.lastRunAt)}</dd></div>
          <div><dt>Last success</dt><dd>{formatTimestamp(task.lastSuccessAt)}</dd></div>
          <div><dt>Next run</dt><dd>{formatTimestamp(task.nextRunAt)}</dd></div>
          <div><dt>Duration</dt><dd>{formatDuration(task.lastDurationMs)}</dd></div>
          <div><dt>Result</dt><dd>{task.summary ?? "No runs recorded."}</dd></div>
        </dl>

        <div className="provider-card-actions scheduled-task-actions">
          {message ? (
            <span className={message === "Saved" ? "save-feedback" : "form-error"}>
              {message === "Saved" ? "✓ Saved" : message}
            </span>
          ) : null}
          <Button
            variant="secondary"
            disabled={!task.available || running || task.status === "running"}
            onClick={() => void run()}
          >
            {running || task.status === "running" ? "Running..." : "▶ Run Now"}
          </Button>
          <Button
            disabled={!task.available || saving}
            onClick={() => void save()}
          >
            {saving ? "Saving..." : "Save Schedule"}
          </Button>
        </div>
      </div>
    </ProviderCard>
  );
}

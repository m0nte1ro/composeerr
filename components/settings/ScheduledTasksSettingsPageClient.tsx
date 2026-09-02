"use client";

import { ScheduledTaskCard } from "@/components/settings/ScheduledTaskCard";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { useScheduledTasks } from "@/hooks/useScheduledTasks";

export function ScheduledTasksSettingsPageClient() {
  const tasks = useScheduledTasks();

  return (
    <>
      <SettingsPageHeader
        title="Scheduled Tasks"
        description="Configure Composeerr-owned provider health work and run tasks on demand."
      />

      {tasks.loading ? (
        <section className="settings-card">
          <div className="settings-loading">Loading scheduled tasks...</div>
        </section>
      ) : tasks.error || !tasks.settings ? (
        <section className="settings-card">
          <ErrorState
            title="Could not load Scheduled Tasks"
            message={tasks.error || "Scheduled task settings are unavailable."}
            className="settings-state"
          />
        </section>
      ) : (
        <div className="provider-settings-list">
          <div className="settings-note">
            <strong>Schedule timezone:</strong>
            <span>All configured times and next-run calculations use UTC.</span>
          </div>

          {tasks.settings.tasks.map((task) => (
            <ScheduledTaskCard
              key={task.key}
              task={task}
              running={tasks.runningKey === task.key}
              onSave={(values) => tasks.update({ key: task.key, ...values })}
              onRun={() => tasks.run(task.key)}
            />
          ))}
        </div>
      )}
    </>
  );
}

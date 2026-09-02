"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { FriendlySchedule } from "@/lib/scheduler/types";

type ScheduleEditorProps = {
  schedule: FriendlySchedule;
  disabled?: boolean;
  onChange: (schedule: FriendlySchedule) => void;
};

export function ScheduleEditor({
  schedule,
  disabled,
  onChange,
}: ScheduleEditorProps) {
  return (
    <div className="schedule-editor">
      <div className="settings-field">
        <label>Frequency</label>
        <Select
          value={schedule.kind}
          disabled={disabled}
          onChange={(event) => {
            const kind = event.target.value;
            if (kind === "hourly") onChange({ kind: "hourly" });
            if (kind === "every-hours") onChange({ kind, hours: 6 });
            if (kind === "daily") onChange({ kind, time: "03:00" });
            if (kind === "weekly") onChange({ kind, weekday: 0, time: "03:00" });
          }}
        >
          <option value="hourly">Hourly</option>
          <option value="every-hours">Every N hours</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </Select>
      </div>

      {schedule.kind === "every-hours" ? (
        <div className="settings-field">
          <label>Hours</label>
          <Input
            type="number"
            min={2}
            max={168}
            value={schedule.hours}
            disabled={disabled}
            onChange={(event) =>
              onChange({ kind: "every-hours", hours: Number(event.target.value) })
            }
          />
        </div>
      ) : null}

      {schedule.kind === "weekly" ? (
        <div className="settings-field">
          <label>Day</label>
          <Select
            value={schedule.weekday}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...schedule, weekday: Number(event.target.value) })
            }
          >
            {[
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ].map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {schedule.kind === "daily" || schedule.kind === "weekly" ? (
        <div className="settings-field">
          <label>Time (UTC)</label>
          <Input
            type="time"
            value={schedule.time}
            disabled={disabled}
            onChange={(event) => onChange({ ...schedule, time: event.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}

import type { FriendlySchedule } from "@/lib/scheduler/types";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class ScheduleValidationError extends Error {}

export function validateSchedule(value: unknown): FriendlySchedule {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    throw new ScheduleValidationError("Choose a valid schedule.");
  }

  const schedule = value as Partial<FriendlySchedule> & {
    hours?: unknown;
    time?: unknown;
    weekday?: unknown;
  };

  if (schedule.kind === "hourly") {
    return { kind: "hourly" };
  }

  if (
    schedule.kind === "every-hours" &&
    typeof schedule.hours === "number" &&
    Number.isInteger(schedule.hours) &&
    schedule.hours >= 2 &&
    schedule.hours <= 168
  ) {
    return { kind: "every-hours", hours: schedule.hours };
  }

  if (schedule.kind === "daily" && typeof schedule.time === "string") {
    if (!TIME_PATTERN.test(schedule.time)) {
      throw new ScheduleValidationError("Daily time must use HH:MM.");
    }
    return { kind: "daily", time: schedule.time };
  }

  if (
    schedule.kind === "weekly" &&
    typeof schedule.time === "string" &&
    TIME_PATTERN.test(schedule.time) &&
    typeof schedule.weekday === "number" &&
    Number.isInteger(schedule.weekday) &&
    schedule.weekday >= 0 &&
    schedule.weekday <= 6
  ) {
    return { kind: "weekly", weekday: schedule.weekday, time: schedule.time };
  }

  throw new ScheduleValidationError("Choose a valid schedule.");
}

function timeParts(time: string) {
  const [, hours, minutes] = TIME_PATTERN.exec(time) ?? [];
  return { hours: Number(hours), minutes: Number(minutes) };
}

export function calculateNextRun(schedule: FriendlySchedule, from = new Date()) {
  if (schedule.kind === "hourly") {
    return new Date(from.getTime() + 60 * 60 * 1000).toISOString();
  }

  if (schedule.kind === "every-hours") {
    return new Date(from.getTime() + schedule.hours * 60 * 60 * 1000).toISOString();
  }

  const { hours, minutes } = timeParts(schedule.time);
  const next = new Date(from);
  next.setUTCHours(hours, minutes, 0, 0);

  if (schedule.kind === "daily") {
    if (next.getTime() <= from.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next.toISOString();
  }

  let daysAhead = (schedule.weekday - next.getUTCDay() + 7) % 7;

  if (daysAhead === 0 && next.getTime() <= from.getTime()) {
    daysAhead = 7;
  }

  next.setUTCDate(next.getUTCDate() + daysAhead);
  return next.toISOString();
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function describeSchedule(schedule: FriendlySchedule) {
  if (schedule.kind === "hourly") return "Hourly";
  if (schedule.kind === "every-hours") return `Every ${schedule.hours} hours`;
  if (schedule.kind === "daily") return `Daily at ${schedule.time} UTC`;
  return `Weekly on ${WEEKDAYS[schedule.weekday]} at ${schedule.time} UTC`;
}

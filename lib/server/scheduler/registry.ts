import type {
  FriendlySchedule,
  ScheduledTaskKey,
} from "@/lib/scheduler/types";
import { testCurrentMusicBrainzConnection } from "@/lib/server/musicbrainz-settings";
import { checkEnabledArtworkProviders } from "@/lib/server/providers/artwork-settings";
import { checkEnabledMetadataProviders } from "@/lib/server/providers/metadata-settings";

export type TaskExecutionResult = {
  status: "success" | "skipped";
  summary: string;
};

export type ScheduledTaskDefinition = {
  key: ScheduledTaskKey;
  name: string;
  description: string;
  defaultEnabled: boolean;
  defaultSchedule: FriendlySchedule;
  unavailableReason?: string;
  execute?: () => Promise<TaskExecutionResult>;
};

export const SCHEDULED_TASK_REGISTRY: ScheduledTaskDefinition[] = [
  {
    key: "content-health",
    name: "Content Health Check",
    description: "Checks the currently active MusicBrainz Web Service endpoint.",
    defaultEnabled: true,
    defaultSchedule: { kind: "every-hours", hours: 6 },
    async execute() {
      await testCurrentMusicBrainzConnection();
      return { status: "success", summary: "MusicBrainz is healthy." };
    },
  },
  {
    key: "metadata-health",
    name: "Metadata Provider Health Check",
    description: "Checks every configured and enabled metadata provider.",
    defaultEnabled: true,
    defaultSchedule: { kind: "daily", time: "03:00" },
    execute: checkEnabledMetadataProviders,
  },
  {
    key: "artwork-health",
    name: "Artwork Provider Health Check",
    description: "Checks enabled artwork providers and shared TheAudioDB fallback.",
    defaultEnabled: true,
    defaultSchedule: { kind: "daily", time: "04:00" },
    execute: checkEnabledArtworkProviders,
  },
  {
    key: "metadata-backfill",
    name: "Metadata Backfill",
    description: "Would enrich persisted library metadata through the configured priority chain.",
    defaultEnabled: false,
    defaultSchedule: { kind: "daily", time: "02:00" },
    unavailableReason:
      "Not ready: Composeerr has no persisted enrichment target yet.",
  },
  {
    key: "artwork-backfill",
    name: "Artwork Backfill",
    description: "Would populate persisted album and artist artwork.",
    defaultEnabled: false,
    defaultSchedule: { kind: "weekly", weekday: 0, time: "02:00" },
    unavailableReason:
      "Not ready: Composeerr has no persisted artwork target yet.",
  },
];

export function getTaskDefinition(key: unknown) {
  return SCHEDULED_TASK_REGISTRY.find((task) => task.key === key) ?? null;
}

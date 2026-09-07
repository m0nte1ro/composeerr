import { requirePageUser } from "@/lib/server/auth/pages";
import { ScheduledTasksSettingsPageClient } from "@/components/settings/ScheduledTasksSettingsPageClient";

export default async function ScheduledTasksSettingsPage() {
  await requirePageUser({ admin: true });
  return <ScheduledTasksSettingsPageClient />;
}

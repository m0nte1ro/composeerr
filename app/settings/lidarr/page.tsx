import { LibrarySettingsPageClient } from "@/components/settings/LibrarySettingsPageClient";
import { requirePageUser } from "@/lib/server/auth/pages";
import { LidarrSettingsPageClient } from "@/components/settings/LidarrSettingsPageClient";

export default async function LidarrSettingsPage() {
  await requirePageUser({ admin: true });
  return <><LidarrSettingsPageClient /><section id="library-providers"><LibrarySettingsPageClient /></section></>;
}

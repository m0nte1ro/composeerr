import { requirePageUser } from "@/lib/server/auth/pages";
import { ArtworkSettingsPageClient } from "@/components/settings/ArtworkSettingsPageClient";

export default async function ArtworkSettingsPage() {
  await requirePageUser({ admin: true });
  return <ArtworkSettingsPageClient />;
}

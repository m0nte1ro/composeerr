import { requirePageUser } from "@/lib/server/auth/pages";
import { MetadataSettingsPageClient } from "@/components/settings/MetadataSettingsPageClient";

export default async function MetadataSettingsPage() {
  await requirePageUser({ admin: true });
  return <MetadataSettingsPageClient />;
}

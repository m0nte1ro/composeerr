import { requirePageUser } from "@/lib/server/auth/pages";
import { ContentSettingsPageClient } from "@/components/settings/ContentSettingsPageClient";

export default async function ContentSettingsPage() {
  await requirePageUser({ admin: true });
  return <ContentSettingsPageClient />;
}

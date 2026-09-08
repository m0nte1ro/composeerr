import { LibrarySettingsPageClient } from "@/components/settings/LibrarySettingsPageClient";
import { requirePageUser } from "@/lib/server/auth/pages";

export default async function LibrarySettingsPage() {
  await requirePageUser({ admin: true });
  return <LibrarySettingsPageClient />;
}

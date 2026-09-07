import { requirePageUser } from "@/lib/server/auth/pages";
import { LibrarySettingsPageClient } from "@/components/settings/LibrarySettingsPageClient";

export default async function LibrarySettingsPage() {
  await requirePageUser({ admin: true });
  return <LibrarySettingsPageClient />;
}

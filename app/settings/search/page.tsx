import { requirePageUser } from "@/lib/server/auth/pages";
import { SearchSettingsPageClient } from "@/components/settings/SearchSettingsPageClient";
export default async function SearchSettingsPage() {
  await requirePageUser({ admin: true });
  return <SearchSettingsPageClient />;
}

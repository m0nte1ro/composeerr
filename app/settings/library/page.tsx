import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/server/auth/pages";
export default async function LibrarySettingsPage() { await requirePageUser({ admin: true }); redirect("/settings/lidarr#library-providers"); }

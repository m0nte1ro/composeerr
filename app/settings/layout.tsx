import { requirePageUser } from "@/lib/server/auth/pages";
import type { ReactNode } from "react";

import { SettingsShell } from "@/components/settings/SettingsShell";

import "../styles/settings-phase-one.css";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser({ allowPasswordChange: true });
  return <SettingsShell user={user}>{children}</SettingsShell>;
}

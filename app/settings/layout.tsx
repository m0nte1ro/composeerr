import type { ReactNode } from "react";

import { SettingsShell } from "@/components/settings/SettingsShell";

import "../styles/settings-phase-one.css";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}

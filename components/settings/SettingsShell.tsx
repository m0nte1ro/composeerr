import { AccountMenu } from "@/components/auth/AccountMenu";
import type { AuthUser } from "@/lib/auth/types";
import Link from "next/link";
import type { ReactNode } from "react";

import { SettingsNavigation } from "@/components/settings/SettingsNavigation";

type SettingsShellProps = {
  user: AuthUser;
  children: ReactNode;
};

export function SettingsShell({ children, user }: SettingsShellProps) {
  return (
    <div className="settings-page">
      <aside className="settings-sidebar">
        <Link href="/" className="settings-brand">
          <div className="brand-mark">C</div>
          <div>
            <strong>Composeerr</strong>
            <span>Settings</span>
          </div>
        </Link>

        <SettingsNavigation isAdmin={user.role === "admin" && !user.mustChangePassword} />
        <AccountMenu user={user} />

        <Link href="/" className="settings-back">
          ← Back to Composeerr
        </Link>
      </aside>

      <main className="settings-content">
        <div className="settings-content-inner">{children}</div>
      </main>
    </div>
  );
}

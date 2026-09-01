import type { ReactNode } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  mobileNav: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, mobileNav, children }: AppShellProps) {
  return (
    <div className="app-shell">
      {sidebar}
      {children}
      {mobileNav}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SETTINGS_NAVIGATION } from "@/components/settings/settings-navigation";

export function SettingsNavigation({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="settings-navigation" aria-label="Settings sections">
      {SETTINGS_NAVIGATION.filter((item) => isAdmin || item.href === "/settings/general").map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            pathname === item.href
              ? "settings-nav-item settings-nav-item-active"
              : "settings-nav-item"
          }
          aria-current={pathname === item.href ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

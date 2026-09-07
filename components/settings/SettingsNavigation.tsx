"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SETTINGS_NAVIGATION } from "@/components/settings/settings-navigation";

export function SettingsNavigation() {
  const pathname = usePathname();

  return (
    <nav className="settings-navigation" aria-label="Settings sections">
      {SETTINGS_NAVIGATION.map((item) => (
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

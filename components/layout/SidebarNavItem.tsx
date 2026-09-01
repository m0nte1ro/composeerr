import Link from "next/link";
import type { ReactNode } from "react";

type SidebarNavItemProps = {
  icon: string;
  label: string;
  active?: boolean;
  href?: string;
};

export function SidebarNavItem({
  icon,
  label,
  active = false,
  href,
}: SidebarNavItemProps) {
  const className = ["nav-item", active ? "nav-item-active" : ""]
    .filter(Boolean)
    .join(" ");

  const content: ReactNode = (
    <>
      <span className="nav-icon">{icon}</span>
      {label}
    </>
  );

  if (href) {
    return (
      <Link className={`${className} nav-link`} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button className={className} type="button">
      {content}
    </button>
  );
}

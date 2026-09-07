import { AccountMenu } from "@/components/auth/AccountMenu";
import type { AuthUser } from "@/lib/auth/types";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import { LibraryStatusWidget } from "@/components/layout/LibraryStatusWidget";

type SidebarProps = {
  user: AuthUser;
  libraryStatus: "loading" | "ready" | "error";
  albumCount: number;
  trackFileCount: number;
};

export function Sidebar({
  user,
  libraryStatus,
  albumCount,
  trackFileCount,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">C</div>

        <div>
          <div className="brand-name">Composeerr</div>
          <div className="brand-subtitle">Music requests</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <SidebarNavItem icon="⌂" label="Discover" active />
        <SidebarNavItem icon="⌕" label="Search" />
        <SidebarNavItem icon="♫" label="Library" />
        <SidebarNavItem icon="↻" label="Activity" />
      </nav>

      <div className="sidebar-footer">
        <AccountMenu user={user} />
        <SidebarNavItem icon="⚙" label="Settings" href="/settings" />

        <LibraryStatusWidget
          status={libraryStatus}
          albumCount={albumCount}
          trackFileCount={trackFileCount}
        />
      </div>
    </aside>
  );
}

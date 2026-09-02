import type { ReactNode } from "react";

type DrawerShellProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function DrawerShell({
  open,
  onClose,
  children,
}: DrawerShellProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <button
        className="drawer-backdrop"
        type="button"
        onClick={onClose}
        aria-label="Close drawer"
      />

      <aside className="media-drawer">{children}</aside>
    </>
  );
}

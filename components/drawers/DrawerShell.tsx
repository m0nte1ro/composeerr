import type { ReactNode } from "react";

type DrawerShellProps = {
  open: boolean;
  className?: string;
  onClose: () => void;
  children: ReactNode;
};

export function DrawerShell({
  open,
  className,
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

      <aside className={["media-drawer", className].filter(Boolean).join(" ")}>{children}</aside>
    </>
  );
}

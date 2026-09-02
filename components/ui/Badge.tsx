import type { HTMLAttributes, ReactNode } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export function Badge({ className, children, ...props }: BadgeProps) {
  return (
    <span className={className} {...props}>
      {children}
    </span>
  );
}

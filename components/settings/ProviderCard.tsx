import type { ReactNode } from "react";

type ProviderCardProps = {
  children: ReactNode;
};

export function ProviderCard({ children }: ProviderCardProps) {
  return <>{children}</>;
}

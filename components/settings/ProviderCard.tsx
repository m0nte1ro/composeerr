import type { ReactNode } from "react";

type ProviderCardProps = {
  children: ReactNode;
};

export function ProviderCard({ children }: ProviderCardProps) {
  return <section className="provider-card">{children}</section>;
}

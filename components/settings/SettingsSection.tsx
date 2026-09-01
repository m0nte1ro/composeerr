import type { ReactNode } from "react";

type SettingsSectionProps = {
  title: string;
  description: string;
  headerRight?: ReactNode;
  children: ReactNode;
};

export function SettingsSection({
  title,
  description,
  headerRight,
  children,
}: SettingsSectionProps) {
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        {headerRight}
      </div>

      {children}
    </section>
  );
}

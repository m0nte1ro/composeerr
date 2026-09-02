type SettingsPageHeaderProps = {
  title: string;
  description: string;
};

export function SettingsPageHeader({
  title,
  description,
}: SettingsPageHeaderProps) {
  return (
    <header className="settings-header">
      <div className="settings-eyebrow">Settings</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

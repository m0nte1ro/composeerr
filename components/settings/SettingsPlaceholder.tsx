import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";

type SettingsPlaceholderProps = {
  title: string;
  description: string;
};

export function SettingsPlaceholder({
  title,
  description,
}: SettingsPlaceholderProps) {
  return (
    <>
      <SettingsPageHeader title={title} description={description} />
      <SettingsSection
        title="Coming Soon"
        description={`Configuration for ${title} will be added in a future Settings phase.`}
      >
        <div className="settings-placeholder">
          No settings are available in this section yet.
        </div>
      </SettingsSection>
    </>
  );
}

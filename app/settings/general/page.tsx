import { UserManagement } from "@/components/settings/UserManagement";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";
import { RegistrationSettings } from "@/components/settings/RegistrationSettings";
import { requirePageUser } from "@/lib/server/auth/pages";
import { registrationsEnabled } from "@/lib/server/auth/store";

export default async function GeneralSettingsPage() {
  const user = await requirePageUser({ allowPasswordChange: true });
  return (
    <>
      <SettingsPageHeader title="General" description={user.role === "admin"
        ? "Manage your account and who can join this instance."
        : "Manage your account password."} />
      <div className="general-settings-sections">
        <PasswordChangeForm user={user} />
        {user.role === "admin" && <RegistrationSettings initialEnabled={registrationsEnabled()} locked={user.mustChangePassword} />}
        {user.role === "admin" && !user.mustChangePassword && <UserManagement currentUserId={user.id} />}
      </div>
    </>
  );
}

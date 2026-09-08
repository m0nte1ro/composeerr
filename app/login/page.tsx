import { getSetupState } from "@/lib/server/setup";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { currentUser } from "@/lib/server/auth/sessions";
import { registrationsEnabled } from "@/lib/server/auth/store";

export default async function LoginPage() {
  if (!getSetupState().hasAdmin) redirect("/setup");
  const user = await currentUser();
  if (user) redirect(user.mustChangePassword ? "/settings/general" : "/");
  return <AuthForm mode="login" registrationEnabled={registrationsEnabled()} />;
}

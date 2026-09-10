import { getSetupState } from "@/lib/server/setup";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { currentUser } from "@/lib/server/auth/sessions";
import { registrationsEnabled } from "@/lib/server/auth/store";

// Setup checks can redirect before cookies() is reached; never prerender this page.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (!getSetupState().complete) redirect("/setup");
  const user = await currentUser();
  if (user) redirect(user.mustChangePassword ? "/settings/general" : "/");
  return <AuthForm mode="register" registrationEnabled={registrationsEnabled()} />;
}

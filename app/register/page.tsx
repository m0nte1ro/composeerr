import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { currentUser } from "@/lib/server/auth/sessions";
import { ensureAdmin, registrationsEnabled } from "@/lib/server/auth/store";

export default async function RegisterPage() {
  const user = await currentUser();
  if (user) redirect(user.mustChangePassword ? "/settings/general" : "/");
  await ensureAdmin();
  return <AuthForm mode="register" registrationEnabled={registrationsEnabled()} />;
}

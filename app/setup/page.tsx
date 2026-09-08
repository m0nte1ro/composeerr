import { redirect } from "next/navigation";
import { SetupWizard } from "@/components/setup/SetupWizard";
import { getSetupState } from "@/lib/server/setup";
import { currentUser } from "@/lib/server/auth/sessions";
import "../styles/settings-phase-one.css";
export const dynamic = "force-dynamic";
export default async function SetupPage() {
  const setup = getSetupState();
  if (setup.complete) redirect("/");
  const user = await currentUser();
  if (setup.hasAdmin && !user) redirect("/login");
  if (user?.mustChangePassword) redirect("/settings/general");
  if (user && user.role !== "admin")
    return (
      <main className="auth-page">
        <p>An administrator must finish setting up this instance.</p>
      </main>
    );
  return <SetupWizard initialStep={setup.hasAdmin ? setup.step : 0} />;
}

"use client";
import { SetupFormContext, type SetupFormStatus } from "./SetupFormState";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { SetupAdminForm } from "./SetupAdminForm";
import { SearchSettingsPageClient } from "@/components/settings/SearchSettingsPageClient";
import { LidarrSettingsPageClient } from "@/components/settings/LidarrSettingsPageClient";
import { ContentSettingsPageClient } from "@/components/settings/ContentSettingsPageClient";
import { MetadataSettingsPageClient } from "@/components/settings/MetadataSettingsPageClient";
import { ArtworkSettingsPageClient } from "@/components/settings/ArtworkSettingsPageClient";
import { Button } from "@/components/ui/Button";
import { saveSetupProgress } from "@/lib/client/setup";
const steps = [
  "Administrator",
  "Search",
  "Lidarr",
  "Content",
  "Metadata",
  "Artwork",
];
export function SetupWizard({ initialStep }: { initialStep: number }) {
  const router = useRouter();
  const [forms, setForms] = useState<Record<string, SetupFormStatus>>({});
  const reportForm = useCallback(
    (id: string, status: SetupFormStatus | null) => {
      setForms((current) => {
        const next = { ...current };
        if (status) next[id] = status;
        else delete next[id];
        return next;
      });
    },
    [],
  );
  const hasUnsaved = Object.values(forms).some((form) => form.dirty);
  const formBusy = Object.values(forms).some((form) => form.busy);
  const [step, setStep] = useState(initialStep);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const next = useCallback(async () => {
    await saveSetupProgress(Math.min(step + 1, 5), step === 5);
    if (step === 5) router.push("/");
    else setStep(step + 1);
  }, [step, router]);
  async function navigate(target?: number) {
    setBusy(true);
    setError("");
    try {
      if (target !== undefined) {
        await saveSetupProgress(target);
        setStep(target);
      } else await next();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save setup progress.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="setup-shell">
      <header className="setup-heading">
        <span className="setup-brand">Composeerr</span>
        <p>Make yourself at home.</p>
      </header>
      <ol className="setup-progress" aria-label="Setup progress">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={index < step ? "complete" : ""}
          >
            <span>{index < step ? "✓" : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <SetupFormContext.Provider value={reportForm}>
        <div className="setup-slide" key={step}>
          {step === 0 && <SetupAdminForm onCreated={() => setStep(1)} />}
          {step === 1 && <SearchSettingsPageClient onContinue={next} />}
          {step === 2 && <LidarrSettingsPageClient onContinue={next} />}
          {step === 3 && <ContentSettingsPageClient onContinue={next} />}
          {step === 4 && <MetadataSettingsPageClient />}
          {step === 5 && <ArtworkSettingsPageClient />}
        </div>
      </SetupFormContext.Provider>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <footer className="setup-footer">
        {step > 1 && (
          <Button
            variant="secondary"
            disabled={busy || formBusy}
            onClick={() => void navigate(step - 1)}
          >
            Back
          </Button>
        )}
        {step >= 4 ? (
          <>
            <p>
              Optional providers: save any changes in their cards before
              continuing.
            </p>
            <Button
              disabled={busy || formBusy || hasUnsaved}
              onClick={() => void navigate()}
            >
              {busy ? "Saving..." : step === 5 ? "Finish setup" : "Next"}
            </Button>
          </>
        ) : (
          step > 0 && <p>Test the current configuration to unlock Next.</p>
        )}
      </footer>
    </main>
  );
}

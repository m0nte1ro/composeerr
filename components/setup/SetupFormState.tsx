"use client";
import { createContext, useContext, useEffect } from "react";
export type SetupFormStatus = { dirty: boolean; busy: boolean };
export const SetupFormContext = createContext<
  ((id: string, status: SetupFormStatus | null) => void) | null
>(null);
export function useSetupFormState(id: string, dirty: boolean, busy: boolean) {
  const report = useContext(SetupFormContext);
  useEffect(() => {
    report?.(id, { dirty, busy });
    return () => report?.(id, null);
  }, [report, id, dirty, busy]);
}

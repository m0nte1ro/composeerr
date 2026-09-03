"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addArtworkProvider,
  getArtworkProviders,
  removeFanartProvider,
  resetCoverArtArchiveProvider,
  testArtworkProvider,
  updateArtworkProvider,
} from "@/lib/client/provider-settings";
import type { ArtworkProviderPayload, ArtworkSettings } from "@/lib/providers/types";

export function useArtworkProviders() {
  const [settings, setSettings] = useState<ArtworkSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getArtworkProviders()
      .then(setSettings)
      .catch((value) =>
        setError(value instanceof Error ? value.message : "Could not load providers."),
      )
      .finally(() => setLoading(false));
  }, []);

  const add = useCallback(async (payload: ArtworkProviderPayload) => {
    const nextSettings = await addArtworkProvider(payload);
    setSettings(nextSettings);
    return nextSettings;
  }, []);

  const update = useCallback(async (payload: ArtworkProviderPayload) => {
    const nextSettings = await updateArtworkProvider(payload);
    setSettings(nextSettings);
    return nextSettings;
  }, []);

  const removeFanart = useCallback(async () => {
    const nextSettings = await removeFanartProvider();
    setSettings(nextSettings);
    return nextSettings;
  }, []);

  const resetCoverArtArchive = useCallback(async () => {
    const nextSettings = await resetCoverArtArchiveProvider();
    setSettings(nextSettings);
    return nextSettings;
  }, []);

  return {
    settings,
    loading,
    error,
    add,
    update,
    removeFanart,
    resetCoverArtArchive,
    test: testArtworkProvider,
  };
}

"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addMetadataProvider,
  getMetadataProviders,
  removeMetadataProvider,
  testMetadataProvider,
  updateMetadataProvider,
} from "@/lib/client/provider-settings";
import type {
  MetadataProviderKey,
  MetadataProviderPayload,
  MetadataProvidersSettings,
} from "@/lib/providers/types";

export function useMetadataProviders() {
  const [settings, setSettings] = useState<MetadataProvidersSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMetadataProviders()
      .then(setSettings)
      .catch((value) =>
        setError(value instanceof Error ? value.message : "Could not load providers."),
      )
      .finally(() => setLoading(false));
  }, []);

  const add = useCallback(async (payload: MetadataProviderPayload) => {
    setSettings(await addMetadataProvider(payload));
  }, []);

  const update = useCallback(async (payload: MetadataProviderPayload) => {
    setSettings(await updateMetadataProvider(payload));
  }, []);

  const remove = useCallback(async (key: MetadataProviderKey) => {
    setSettings(await removeMetadataProvider({ key }));
  }, []);

  return { settings, loading, error, add, update, remove, test: testMetadataProvider };
}

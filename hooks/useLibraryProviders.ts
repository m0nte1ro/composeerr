"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addLibraryProvider,
  getLibraryProviders,
  removeLibraryProvider,
  testLibraryProvider,
  updateLibraryProvider,
} from "@/lib/client/provider-settings";
import type {
  LibraryProviderKey,
  LibraryProviderPayload,
  LibraryProvidersSettings,
} from "@/lib/providers/types";

export function useLibraryProviders() {
  const [settings, setSettings] = useState<LibraryProvidersSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getLibraryProviders()
      .then(setSettings)
      .catch((value) =>
        setError(
          value instanceof Error ? value.message : "Could not load providers.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const add = useCallback(async (payload: LibraryProviderPayload) => {
    setSettings(await addLibraryProvider(payload));
  }, []);

  const update = useCallback(async (payload: LibraryProviderPayload) => {
    setSettings(await updateLibraryProvider(payload));
  }, []);

  const remove = useCallback(async (key: LibraryProviderKey) => {
    setSettings(await removeLibraryProvider({ key }));
  }, []);

  return {
    settings,
    loading,
    error,
    add,
    update,
    remove,
    test: testLibraryProvider,
  };
}
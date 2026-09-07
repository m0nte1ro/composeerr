"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchLibraryAvailability } from "@/lib/client/library";
import {
  EMPTY_LIBRARY_AVAILABILITY,
  type LibraryAvailability,
} from "@/lib/library/types";

type LibraryStatus = "loading" | "ready" | "error";

export function useLibraryAvailability() {
  const [status, setStatus] = useState<LibraryStatus>("loading");
  const [library, setLibrary] = useState<LibraryAvailability>(EMPTY_LIBRARY_AVAILABILITY);

  const refreshLibrary = useCallback(async () => {
    const nextLibrary = await fetchLibraryAvailability();
    setLibrary(nextLibrary);
    setStatus("ready");
  }, []);

  useEffect(() => {
    async function loadLibrary() {
      try {
        await refreshLibrary();
      } catch {
        setLibrary(EMPTY_LIBRARY_AVAILABILITY);
        setStatus("error");
      }
    }

    void loadLibrary();
  }, [refreshLibrary]);

  return { status, library, refreshLibrary };
}
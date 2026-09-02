"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchLidarrLibrary } from "@/lib/client/library";
import { EMPTY_LIBRARY, type ComposeerrLibrary } from "@/lib/lidarr/types";

type LibraryStatus = "loading" | "ready" | "error";

export function useLidarrLibrary() {
  const [status, setStatus] = useState<LibraryStatus>("loading");
  const [library, setLibrary] = useState<ComposeerrLibrary>(EMPTY_LIBRARY);

  const refreshLibrary = useCallback(async () => {
    const nextLibrary = await fetchLidarrLibrary();
    setLibrary(nextLibrary);
    setStatus("ready");
  }, []);

  useEffect(() => {
    async function loadLibrary() {
      try {
        await refreshLibrary();
      } catch {
        setLibrary(EMPTY_LIBRARY);
        setStatus("error");
      }
    }

    void loadLibrary();
  }, [refreshLibrary]);

  return {
    status,
    library,
    refreshLibrary,
  };
}

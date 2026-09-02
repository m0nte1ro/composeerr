"use client";

import { useCallback, useState } from "react";

import { requestAlbumByReleaseGroupId } from "@/lib/client/requests";
import type { MetadataAlbumResult } from "@/lib/metadata/types";

type UseAlbumRequestParams = {
  isAlbumManaged: (album: MetadataAlbumResult) => boolean;
  refreshLibrary: () => Promise<void>;
};

export function useAlbumRequest({
  isAlbumManaged,
  refreshLibrary,
}: UseAlbumRequestParams) {
  const [requestedAlbumIds, setRequestedAlbumIds] = useState<Set<string>>(
    new Set(),
  );
  const [requestingAlbumId, setRequestingAlbumId] = useState<string | null>(
    null,
  );
  const [requestError, setRequestError] = useState<string | null>(null);

  const clearRequestError = useCallback(() => {
    setRequestError(null);
  }, []);

  const isAlbumRequested = useCallback(
    (albumId: string) => requestedAlbumIds.has(albumId),
    [requestedAlbumIds],
  );

  const requestAlbum = useCallback(
    async (album: MetadataAlbumResult) => {
      if (
        isAlbumManaged(album) ||
        requestedAlbumIds.has(album.id) ||
        requestingAlbumId === album.id
      ) {
        return;
      }

      setRequestError(null);
      setRequestingAlbumId(album.id);

      try {
        await requestAlbumByReleaseGroupId(album.id);

        setRequestedAlbumIds((current) => {
          const next = new Set(current);
          next.add(album.id);
          return next;
        });

        await refreshLibrary();
      } catch (error) {
        setRequestError(
          error instanceof Error ? error.message : "Could not request album.",
        );
      } finally {
        setRequestingAlbumId(null);
      }
    },
    [isAlbumManaged, requestedAlbumIds, requestingAlbumId, refreshLibrary],
  );

  return {
    requestedAlbumIds,
    requestingAlbumId,
    requestError,
    isAlbumRequested,
    clearRequestError,
    requestAlbum,
  };
}

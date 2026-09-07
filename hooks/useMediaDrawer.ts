"use client";

import { useCallback, useRef, useState } from "react";

import { loadMetadataDetails, resolveDiscoveryResult } from "@/lib/client/metadata";
import type {
  DiscoverySearchResult,
  MetadataAlbumDetails,
  MetadataAlbumResult,
  MetadataArtistDetails,
  MetadataArtistResult,
  MetadataSongDetails,
  MetadataSongResult,
} from "@/lib/metadata/types";

export type ArtistSection = "albums" | "compilations" | "live" | "singles";

type DrawerMode = "song" | "album" | "artist" | null;

type UseMediaDrawerParams = {
  onNavigationChange?: () => void;
};

export function useMediaDrawer({
  onNavigationChange,
}: UseMediaDrawerParams = {}) {
  const navigationId = useRef(0);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [pendingDiscovery, setPendingDiscovery] =
    useState<DiscoverySearchResult | null>(null);

  const [selectedSong, setSelectedSong] = useState<MetadataSongDetails | null>(
    null,
  );
  const [selectedAlbum, setSelectedAlbum] =
    useState<MetadataAlbumDetails | null>(null);
  const [selectedArtist, setSelectedArtist] =
    useState<MetadataArtistDetails | null>(null);

  const [artistSection, setArtistSection] = useState<ArtistSection>("albums");
  const [drawerSessionId, setDrawerSessionId] = useState(0);

  const resetSelections = useCallback(() => {
    setSelectedSong(null);
    setSelectedAlbum(null);
    setSelectedArtist(null);
  }, []);

  const closeDrawer = useCallback(() => {
    ++navigationId.current;
    onNavigationChange?.();

    setDrawerMode(null);
    setDrawerLoading(false);
    setDrawerError(null);
    setPendingDiscovery(null);

    resetSelections();
    setDrawerSessionId((current) => current + 1);
  }, [onNavigationChange, resetSelections]);

  const openDiscovery = useCallback(
    async (discovery: DiscoverySearchResult) => {
      const requestId = ++navigationId.current;
      onNavigationChange?.();
      setDrawerMode(discovery.kind);
      setDrawerLoading(true);
      setDrawerError(null);
      setPendingDiscovery(discovery);
      resetSelections();
      setDrawerSessionId((current) => current + 1);

      try {
        const canonical = await resolveDiscoveryResult(discovery);
        if (requestId !== navigationId.current) return;
        if (canonical.kind !== discovery.kind) {
          throw new Error("MusicBrainz returned a different result type.");
        }

        if (canonical.kind === "artist") {
          const details = await loadMetadataDetails("artist", canonical.id);
          if (requestId !== navigationId.current) return;
          setSelectedArtist(details);
          setArtistSection("albums");
        } else if (canonical.kind === "album") {
          const details = await loadMetadataDetails("album", canonical.id);
          if (requestId !== navigationId.current) return;
          setSelectedAlbum(details);
        } else {
          const details = await loadMetadataDetails("song", canonical.id);
          if (requestId !== navigationId.current) return;
          setSelectedSong(details);
        }
      } catch (error) {
        if (requestId !== navigationId.current) return;
        setDrawerError(
          error instanceof Error ? error.message : "Could not open this result.",
        );
      } finally {
        if (requestId === navigationId.current) setDrawerLoading(false);
      }
    },
    [onNavigationChange, resetSelections],
  );

  const openSong = useCallback(
    async (song: MetadataSongResult) => {
      const requestId = ++navigationId.current;
      onNavigationChange?.();
      setPendingDiscovery(null);

      setDrawerMode("song");
      setDrawerLoading(true);
      setDrawerError(null);

      resetSelections();
      setDrawerSessionId((current) => current + 1);

      try {
        const details = await loadMetadataDetails("song", song.id);
        if (requestId !== navigationId.current) return;
        setSelectedSong(details);
      } catch (error) {
        if (requestId !== navigationId.current) return;
        setDrawerError(
          error instanceof Error ? error.message : "Could not load song.",
        );
      } finally {
        if (requestId === navigationId.current) setDrawerLoading(false);
      }
    },
    [onNavigationChange, resetSelections],
  );

  const openArtist = useCallback(
    async (artist: MetadataArtistResult) => {
      const requestId = ++navigationId.current;
      onNavigationChange?.();
      setPendingDiscovery(null);

      setDrawerMode("artist");
      setDrawerLoading(true);
      setDrawerError(null);

      resetSelections();
      setDrawerSessionId((current) => current + 1);
      setArtistSection("albums");

      try {
        const details = await loadMetadataDetails("artist", artist.id);
        if (requestId !== navigationId.current) return;
        setSelectedArtist(details);
      } catch (error) {
        if (requestId !== navigationId.current) return;
        setDrawerError(
          error instanceof Error ? error.message : "Could not load artist.",
        );
      } finally {
        if (requestId === navigationId.current) setDrawerLoading(false);
      }
    },
    [onNavigationChange, resetSelections],
  );

  const openAlbum = useCallback(
    async (album: MetadataAlbumResult, preserveParent = true) => {
      const requestId = ++navigationId.current;
      onNavigationChange?.();
      setPendingDiscovery(null);

      if (!preserveParent) {
        setSelectedSong(null);
        setSelectedArtist(null);
        setDrawerSessionId((current) => current + 1);
      }

      setSelectedAlbum({ album, tracks: [], representativeReleaseId: null });

      setDrawerMode("album");
      setDrawerLoading(true);
      setDrawerError(null);

      try {
        const details = await loadMetadataDetails("album", album.id);
        if (requestId !== navigationId.current) return;
        setSelectedAlbum(details);
      } catch (error) {
        if (requestId !== navigationId.current) return;
        setDrawerError(
          error instanceof Error ? error.message : "Could not load album.",
        );
      } finally {
        if (requestId === navigationId.current) setDrawerLoading(false);
      }
    },
    [onNavigationChange],
  );

  const goBack = useCallback(() => {
    ++navigationId.current;
    setDrawerLoading(false);
    setDrawerError(null);
    setPendingDiscovery(null);
    onNavigationChange?.();

    if (drawerMode === "album") {
      setSelectedAlbum(null);

      if (selectedSong) {
        setDrawerMode("song");
        return;
      }

      if (selectedArtist) {
        setDrawerMode("artist");
        return;
      }
    }

    closeDrawer();
  }, [
    closeDrawer,
    drawerMode,
    onNavigationChange,
    selectedArtist,
    selectedSong,
  ]);

  return {
    drawerMode,
    drawerLoading,
    drawerError,
    drawerOpen: drawerMode !== null,
    drawerSessionId,
    pendingDiscovery,
    selectedSong,
    selectedAlbum,
    selectedArtist,
    artistSection,
    setArtistSection,
    closeDrawer,
    openSong,
    openAlbum,
    openArtist,
    openDiscovery,
    goBack,
  };
}

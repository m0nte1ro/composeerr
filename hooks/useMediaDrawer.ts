"use client";

import { useCallback, useMemo, useState } from "react";

import { loadMetadataDetails } from "@/lib/client/metadata";
import type {
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
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const [selectedSong, setSelectedSong] = useState<MetadataSongDetails | null>(
    null,
  );
  const [selectedAlbum, setSelectedAlbum] =
    useState<MetadataAlbumDetails | null>(null);
  const [selectedArtist, setSelectedArtist] =
    useState<MetadataArtistDetails | null>(null);

  const [artistSection, setArtistSection] = useState<ArtistSection>("albums");

  const resetSelections = useCallback(() => {
    setSelectedSong(null);
    setSelectedAlbum(null);
    setSelectedArtist(null);
  }, []);

  const closeDrawer = useCallback(() => {
    onNavigationChange?.();

    setDrawerMode(null);
    setDrawerLoading(false);
    setDrawerError(null);

    resetSelections();
  }, [onNavigationChange, resetSelections]);

  const openSong = useCallback(
    async (song: MetadataSongResult) => {
      onNavigationChange?.();

      setDrawerMode("song");
      setDrawerLoading(true);
      setDrawerError(null);

      resetSelections();

      try {
        const details = await loadMetadataDetails("song", song.id);
        setSelectedSong(details);
      } catch (error) {
        setDrawerError(
          error instanceof Error ? error.message : "Could not load song.",
        );
      } finally {
        setDrawerLoading(false);
      }
    },
    [onNavigationChange, resetSelections],
  );

  const openArtist = useCallback(
    async (artist: MetadataArtistResult) => {
      onNavigationChange?.();

      setDrawerMode("artist");
      setDrawerLoading(true);
      setDrawerError(null);

      resetSelections();
      setArtistSection("albums");

      try {
        const details = await loadMetadataDetails("artist", artist.id);
        setSelectedArtist(details);
      } catch (error) {
        setDrawerError(
          error instanceof Error ? error.message : "Could not load artist.",
        );
      } finally {
        setDrawerLoading(false);
      }
    },
    [onNavigationChange, resetSelections],
  );

  const openAlbum = useCallback(
    async (album: MetadataAlbumResult, preserveParent = true) => {
      onNavigationChange?.();

      if (!preserveParent) {
        setSelectedSong(null);
        setSelectedArtist(null);
      }

      setSelectedAlbum(null);

      setDrawerMode("album");
      setDrawerLoading(true);
      setDrawerError(null);

      try {
        const details = await loadMetadataDetails("album", album.id);
        setSelectedAlbum(details);
      } catch (error) {
        setDrawerError(
          error instanceof Error ? error.message : "Could not load album.",
        );
      } finally {
        setDrawerLoading(false);
      }
    },
    [onNavigationChange],
  );

  const goBack = useCallback(() => {
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

  const filteredArtistAlbums = useMemo(() => {
    const discography = selectedArtist?.discography ?? [];

    return discography.filter((album) => {
      const secondary = album.secondaryTypes.map((value) =>
        value.toLowerCase(),
      );
      const primary = album.primaryType?.toLowerCase() ?? "";

      if (artistSection === "compilations") {
        return secondary.includes("compilation");
      }

      if (artistSection === "live") {
        return secondary.includes("live");
      }

      if (artistSection === "singles") {
        return primary === "single" || primary === "ep";
      }

      return (
        primary === "album" &&
        !secondary.includes("compilation") &&
        !secondary.includes("live")
      );
    });
  }, [artistSection, selectedArtist]);

  return {
    drawerMode,
    drawerLoading,
    drawerError,
    drawerOpen: drawerMode !== null,
    selectedSong,
    selectedAlbum,
    selectedArtist,
    artistSection,
    filteredArtistAlbums,
    setArtistSection,
    closeDrawer,
    openSong,
    openAlbum,
    openArtist,
    goBack,
  };
}

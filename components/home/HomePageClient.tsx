"use client";

import Link from "next/link";
import type { AuthUser } from "@/lib/auth/types";

import { useCallback, useEffect, useRef } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { MediaDrawer } from "@/components/drawers/MediaDrawer";
import { LibraryOverview } from "@/components/home/LibraryOverview";
import { SearchHero } from "@/components/home/SearchHero";
import { SearchResults } from "@/components/search/SearchResults";
import { useAlbumRequest } from "@/hooks/useAlbumRequest";
import { useLibraryAvailability } from "@/hooks/useLibraryAvailability";
import { useMediaDrawer } from "@/hooks/useMediaDrawer";
import { useMusicSearch } from "@/hooks/useMusicSearch";
import { findLibraryAlbum } from "@/lib/library/match";
import type {
  MetadataAlbumResult,
} from "@/lib/metadata/types";

export function HomePageClient({ user }: { user: AuthUser }) {
  const searchRef = useRef<HTMLInputElement>(null);

  const { status: libraryStatus, library, refreshLibrary } = useLibraryAvailability();

  const {
    searchType,
    query,
    submittedQuery,
    searchState,
    songResults,
    albumResults,
    artistResults,
    setQuery,
    setSearchType,
    submitSearch,
  } = useMusicSearch("song");

  const isAlbumManaged = useCallback(
    (album: MetadataAlbumResult) => Boolean(findLibraryAlbum(library.albums, album)),
    [library.albums],
  );

  const isAlbumAvailable = useCallback(
    (album: MetadataAlbumResult) => {
      const match = findLibraryAlbum(library.albums, album);
      return Boolean(match && match.trackFileCount > 0);
    },
    [library.albums],
  );

  const getLibraryStatusLabel = useCallback(
    (album: MetadataAlbumResult) => {
      const libraryAlbum = findLibraryAlbum(library.albums, album);

      if (!libraryAlbum) {
        return null;
      }

      if (libraryAlbum.status === "available") {
        return "Available";
      }

      if (libraryAlbum.status === "partial") {
        return `${libraryAlbum.trackFileCount}/${libraryAlbum.trackCount} tracks`;
      }

      return libraryAlbum.managedByLidarr ? "In Lidarr" : "In library";
    },
    [library.albums],
  );

  const {
    requestingAlbumId,
    requestError,
    isAlbumRequested,
    clearRequestError,
    requestAlbum,
  } = useAlbumRequest({
    isAlbumManaged,
    refreshLibrary,
  });

  const {
    drawerMode,
    drawerLoading,
    drawerError,
    drawerOpen,
    drawerSessionId,
    pendingDiscovery,
    selectedSong,
    selectedAlbum,
    selectedArtist,
    artistSection,
    setArtistSection,
    closeDrawer,
    openAlbum,
    openDiscovery,
    goBack,
  } = useMediaDrawer({
    onNavigationChange: clearRequestError,
  });

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (event.key === "Escape") {
        closeDrawer();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [closeDrawer]);

  return (
    <AppShell
      sidebar={
        <Sidebar
          user={user}
          libraryStatus={libraryStatus}
          albumCount={library.albumCount}
          trackFileCount={library.trackFileCount}
        />
      }
      mobileNav={<MobileNav />}
    >
      <main className="main-content">
        <header className="mobile-header">
          <div className="brand-mark">C</div>
          <span>Composeerr</span>

          <Link className="mobile-settings-link" href="/settings" aria-label="Open settings">
            ⚙
          </Link>
        </header>

        <SearchHero
          searchType={searchType}
          query={query}
          loading={searchState.status === "loading"}
          inputRef={searchRef}
          onQueryChange={setQuery}
          onTypeChange={setSearchType}
          onSubmit={(event) => {
            if (!query.trim()) {
              event.preventDefault();
              searchRef.current?.focus();
              return;
            }

            closeDrawer();
            void submitSearch(event);
          }}
        />

        <SearchResults
          submittedQuery={submittedQuery}
          status={searchState.status}
          errorMessage={searchState.status === "error" ? searchState.message : undefined}
          searchType={searchType}
          songResults={songResults}
          albumResults={albumResults}
          artistResults={artistResults}
          isAlbumRequested={isAlbumRequested}
          onOpenSong={openDiscovery}
          onOpenAlbum={openDiscovery}
          onOpenArtist={openDiscovery}
        />

        {!submittedQuery && (
          <LibraryOverview
            albumCount={library.albumCount}
            trackFileCount={library.trackFileCount}
            artistCount={library.artistCount}
          />
        )}
      </main>

      <MediaDrawer
        open={drawerOpen}
        sessionId={drawerSessionId}
        mode={drawerMode}
        loading={drawerLoading}
        error={drawerError}
        pendingDiscovery={pendingDiscovery}
        selectedSong={selectedSong}
        selectedAlbum={selectedAlbum}
        selectedArtist={selectedArtist}
        artistSection={artistSection}
        requestError={requestError}
        requestingAlbumId={requestingAlbumId}
        setArtistSection={setArtistSection}
        isAlbumManaged={isAlbumManaged}
        isAlbumAvailable={isAlbumAvailable}
        isAlbumRequested={isAlbumRequested}
        getLibraryStatusLabel={getLibraryStatusLabel}
        onClose={closeDrawer}
        onBack={goBack}
        onOpenAlbum={(album) => {
          void openAlbum(album);
        }}
        onRequestAlbum={(album) => {
          void requestAlbum(album);
        }}
      />
    </AppShell>
  );
}

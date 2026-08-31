"use client";

import Link from "next/link";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  MetadataAlbumDetails,
  MetadataAlbumResult,
  MetadataArtistDetails,
  MetadataArtistResult,
  MetadataSearchResult,
  MetadataSearchType,
  MetadataSongDetails,
  MetadataSongResult,
} from "@/lib/metadata/types";

type ArtistSection =
  | "albums"
  | "compilations"
  | "live"
  | "singles";

type LibraryAlbum = {
  lidarrId: number;

  title: string;
  artist: string;

  year: number | null;

  musicBrainzReleaseGroupId: string;
  musicBrainzArtistId: string | null;

  monitored: boolean;

  status:
    | "tracked"
    | "partial"
    | "available";

  trackFileCount: number;
  trackCount: number;
  sizeOnDisk: number;
};

type LibraryState = {
  status:
    | "loading"
    | "ready"
    | "error";

  albums: LibraryAlbum[];

  knownAlbumCount: number;
  monitoredAlbumCount: number;

  albumCount: number;
  trackFileCount: number;

  artistCount: number;
};

type SearchState =
  | {
      status: "idle";
      results: MetadataSearchResult[];
    }
  | {
      status: "loading";
      results: MetadataSearchResult[];
    }
  | {
      status: "ready";
      results: MetadataSearchResult[];
    }
  | {
      status: "error";
      results: MetadataSearchResult[];
      message: string;
    };

type DrawerMode =
  | "song"
  | "album"
  | "artist"
  | null;

function formatDuration(
  milliseconds: number | null,
) {
  if (!milliseconds) {
    return "—";
  }

  const totalSeconds =
    Math.round(
      milliseconds / 1000,
    );

  const minutes =
    Math.floor(
      totalSeconds / 60,
    );

  const seconds =
    totalSeconds % 60;

  return `${minutes}:${String(
    seconds,
  ).padStart(2, "0")}`;
}

function albumTypeLabel(
  album: MetadataAlbumResult,
) {
  if (
    album.secondaryTypes.length
  ) {
    return album.secondaryTypes.join(
      " · ",
    );
  }

  return (
    album.primaryType ??
    "Release"
  );
}

export default function Home() {
  const [
    searchType,
    setSearchType,
  ] =
    useState<MetadataSearchType>(
      "song",
    );

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    submittedQuery,
    setSubmittedQuery,
  ] = useState("");

  const [
    searchState,
    setSearchState,
  ] = useState<SearchState>({
    status: "idle",
    results: [],
  });

  const [
    library,
    setLibrary,
  ] = useState<LibraryState>({
    status: "loading",

    albums: [],

    knownAlbumCount: 0,
    monitoredAlbumCount: 0,

    albumCount: 0,
    trackFileCount: 0,

    artistCount: 0,
  });

  const [
    drawerMode,
    setDrawerMode,
  ] =
    useState<DrawerMode>(null);

  const [
    drawerLoading,
    setDrawerLoading,
  ] = useState(false);

  const [
    drawerError,
    setDrawerError,
  ] =
    useState<string | null>(null);

  const [
    selectedSong,
    setSelectedSong,
  ] =
    useState<MetadataSongDetails | null>(
      null,
    );

  const [
    selectedAlbum,
    setSelectedAlbum,
  ] =
    useState<MetadataAlbumDetails | null>(
      null,
    );

  const [
    selectedArtist,
    setSelectedArtist,
  ] =
    useState<MetadataArtistDetails | null>(
      null,
    );

  const [
    artistSection,
    setArtistSection,
  ] =
    useState<ArtistSection>(
      "albums",
    );

  const [
    requestedAlbumIds,
    setRequestedAlbumIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    requestingAlbumId,
    setRequestingAlbumId,
  ] =
    useState<string | null>(null);

  const searchRef =
    useRef<HTMLInputElement>(
      null,
    );

  function closeDrawer() {
    setDrawerMode(null);

    setDrawerLoading(false);
    setDrawerError(null);

    setSelectedSong(null);
    setSelectedAlbum(null);
    setSelectedArtist(null);
  }

  useEffect(() => {
    function handleShortcut(
      event: KeyboardEvent,
    ) {
      if (
        (
          event.metaKey ||
          event.ctrlKey
        ) &&
        event.key.toLowerCase() ===
          "k"
      ) {
        event.preventDefault();

        searchRef.current?.focus();
      }

      if (
        event.key === "Escape"
      ) {
        closeDrawer();
      }
    }

    window.addEventListener(
      "keydown",
      handleShortcut,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleShortcut,
      );
  }, []);

  useEffect(() => {
    async function loadLibrary() {
      try {
        const response =
          await fetch(
            "/api/lidarr/library",
            {
              cache: "no-store",
            },
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.ok ||
          !data.library
        ) {
          throw new Error();
        }

        setLibrary({
          status: "ready",

          albums:
            data.library.albums,

          knownAlbumCount:
            data.library
              .knownAlbumCount ??
            0,

          monitoredAlbumCount:
            data.library
              .monitoredAlbumCount ??
            0,

          albumCount:
            data.library
              .albumCount ??
            0,

          trackFileCount:
            data.library
              .trackFileCount ??
            0,

          artistCount:
            data.library
              .artistCount ??
            0,
        });
      } catch {
        setLibrary({
          status: "error",

          albums: [],

          knownAlbumCount: 0,
          monitoredAlbumCount: 0,

          albumCount: 0,
          trackFileCount: 0,

          artistCount: 0,
        });
      }
    }

    void loadLibrary();
  }, []);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmed =
      query.trim();

    if (!trimmed) {
      searchRef.current?.focus();

      return;
    }

    closeDrawer();

    setSubmittedQuery(trimmed);

    setSearchState({
      status: "loading",
      results: [],
    });

    try {
      const params =
        new URLSearchParams({
          type: searchType,
          q: trimmed,
        });

      const response =
        await fetch(
          `/api/metadata/search?${params}`,
          {
            cache: "no-store",
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        setSearchState({
          status: "error",
          results: [],
          message:
            data.error ??
            "Search failed.",
        });

        return;
      }

      setSearchState({
        status: "ready",
        results:
          data.results ?? [],
      });
    } catch {
      setSearchState({
        status: "error",
        results: [],
        message:
          "Could not search metadata.",
      });
    }
  }

  async function loadDetails(
    type: MetadataSearchType,
    id: string,
  ) {
    const params =
      new URLSearchParams({
        type,
        id,
      });

    const response =
      await fetch(
        `/api/metadata/details?${params}`,
        {
          cache: "no-store",
        },
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.ok
    ) {
      throw new Error(
        data.error ??
        "Could not load details.",
      );
    }

    return data.details;
  }

  async function openSong(
    song: MetadataSongResult,
  ) {
    setDrawerMode("song");
    setDrawerLoading(true);
    setDrawerError(null);

    setSelectedSong(null);
    setSelectedAlbum(null);
    setSelectedArtist(null);

    try {
      const details =
        (await loadDetails(
          "song",
          song.id,
        )) as MetadataSongDetails;

      setSelectedSong(details);
    } catch (error) {
      setDrawerError(
        error instanceof Error
          ? error.message
          : "Could not load song.",
      );
    } finally {
      setDrawerLoading(false);
    }
  }

  async function openArtist(
    artist: MetadataArtistResult,
  ) {
    setDrawerMode("artist");
    setDrawerLoading(true);
    setDrawerError(null);

    setSelectedSong(null);
    setSelectedAlbum(null);
    setSelectedArtist(null);

    setArtistSection(
      "albums",
    );

    try {
      const details =
        (await loadDetails(
          "artist",
          artist.id,
        )) as MetadataArtistDetails;

      setSelectedArtist(
        details,
      );
    } catch (error) {
      setDrawerError(
        error instanceof Error
          ? error.message
          : "Could not load artist.",
      );
    } finally {
      setDrawerLoading(false);
    }
  }

  async function openAlbum(
    album: MetadataAlbumResult,
    preserveParent = true,
  ) {
    if (!preserveParent) {
      setSelectedSong(null);
      setSelectedArtist(null);
    }

    setSelectedAlbum(null);

    setDrawerMode("album");
    setDrawerLoading(true);
    setDrawerError(null);

    try {
      const details =
        (await loadDetails(
          "album",
          album.id,
        )) as MetadataAlbumDetails;

      setSelectedAlbum(
        details,
      );
    } catch (error) {
      setDrawerError(
        error instanceof Error
          ? error.message
          : "Could not load album.",
      );
    } finally {
      setDrawerLoading(false);
    }
  }

  function goBack() {
    if (
      drawerMode === "album"
    ) {
      setSelectedAlbum(null);

      if (selectedSong) {
        setDrawerMode("song");

        return;
      }

      if (selectedArtist) {
        setDrawerMode(
          "artist",
        );

        return;
      }
    }

    closeDrawer();
  }

  function findLibraryAlbum(
    album: MetadataAlbumResult,
  ) {
    const id =
      album.id.toLowerCase();

    return (
      library.albums.find(
        (candidate) =>
          candidate
            .musicBrainzReleaseGroupId
            ?.toLowerCase() ===
          id,
      ) ?? null
    );
  }

  function isAlbumInLidarr(
    album: MetadataAlbumResult,
  ) {
    return Boolean(
      findLibraryAlbum(album),
    );
  }

  function getLibraryStatusLabel(
    album: MetadataAlbumResult,
  ) {
    const libraryAlbum =
      findLibraryAlbum(album);

    if (!libraryAlbum) {
      return null;
    }

    if (
      libraryAlbum.status ===
      "available"
    ) {
      return "Available";
    }

    if (
      libraryAlbum.status ===
      "partial"
    ) {
      return `${libraryAlbum.trackFileCount}/${libraryAlbum.trackCount} tracks`;
    }

    return "In Lidarr";
  }

  function requestAlbum(
    album: MetadataAlbumResult,
  ) {
    if (
      isAlbumInLidarr(album) ||
      requestedAlbumIds.has(
        album.id,
      )
    ) {
      return;
    }

    setRequestingAlbumId(
      album.id,
    );

    // Still simulated.
    // Real Lidarr request is the next step.
    window.setTimeout(() => {
      setRequestedAlbumIds(
        (current) => {
          const next =
            new Set(current);

          next.add(
            album.id,
          );

          return next;
        },
      );

      setRequestingAlbumId(
        null,
      );
    }, 850);
  }

  const songResults =
    searchState.results.filter(
      (
        result,
      ): result is MetadataSongResult =>
        result.kind === "song",
    );

  const albumResults =
    searchState.results.filter(
      (
        result,
      ): result is MetadataAlbumResult =>
        result.kind === "album",
    );

  const artistResults =
    searchState.results.filter(
      (
        result,
      ): result is MetadataArtistResult =>
        result.kind === "artist",
    );

  const artistAlbums =
    selectedArtist?.discography ??
    [];

  const filteredArtistAlbums =
    artistAlbums.filter(
      (album) => {
        const secondary =
          album.secondaryTypes.map(
            (value) =>
              value.toLowerCase(),
          );

        const primary =
          album.primaryType
            ?.toLowerCase() ??
          "";

        if (
          artistSection ===
          "compilations"
        ) {
          return secondary.includes(
            "compilation",
          );
        }

        if (
          artistSection ===
          "live"
        ) {
          return secondary.includes(
            "live",
          );
        }

        if (
          artistSection ===
          "singles"
        ) {
          return (
            primary ===
              "single" ||
            primary === "ep"
          );
        }

        return (
          primary === "album" &&
          !secondary.includes(
            "compilation",
          ) &&
          !secondary.includes(
            "live",
          )
        );
      },
    );

  const currentResultCount =
    searchState.results.length;

  const drawerOpen =
    drawerMode !== null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            C
          </div>

          <div>
            <div className="brand-name">
              Composeerr
            </div>

            <div className="brand-subtitle">
              Music requests
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-item nav-item-active"
            type="button"
          >
            <span className="nav-icon">
              ⌂
            </span>
            Discover
          </button>

          <button
            className="nav-item"
            type="button"
          >
            <span className="nav-icon">
              ⌕
            </span>
            Search
          </button>

          <button
            className="nav-item"
            type="button"
          >
            <span className="nav-icon">
              ♫
            </span>
            Library
          </button>

          <button
            className="nav-item"
            type="button"
          >
            <span className="nav-icon">
              ↻
            </span>
            Activity
          </button>
        </nav>

        <div className="sidebar-footer">
          <Link
            className="nav-item nav-link"
            href="/settings"
          >
            <span className="nav-icon">
              ⚙
            </span>

            Settings
          </Link>

          <div className="lidarr-status">
            <span
              className={
                library.status ===
                "ready"
                  ? "status-dot"
                  : "status-dot status-dot-offline"
              }
            />

            <div>
              <strong>
                Lidarr
              </strong>

              <span>
                {library.status ===
                  "loading" &&
                  "Syncing library..."}

                {library.status ===
                  "ready" &&
                  `${library.albumCount} albums · ${library.trackFileCount} tracks`}

                {library.status ===
                  "error" &&
                  "Unavailable"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="mobile-header">
          <div className="brand-mark">
            C
          </div>

          <span>
            Composeerr
          </span>

          <Link
            className="mobile-settings-link"
            href="/settings"
            aria-label="Open settings"
          >
            ⚙
          </Link>
        </header>

        <section className="hero">
          <div className="hero-eyebrow">
            Your music, without
            the admin
          </div>

          <h1>
            Find it. Pick the
            album. Request it.
          </h1>

          <p>
            Search for a song,
            album or artist.
            Composeerr handles
            the messy part
            between you and
            Lidarr.
          </p>

          <form
            className="search-form"
            onSubmit={
              handleSubmit
            }
          >
            <div className="search-control">
              <span className="search-icon">
                ⌕
              </span>

              <input
                ref={searchRef}
                value={query}
                onChange={(
                  event,
                ) =>
                  setQuery(
                    event.target
                      .value,
                  )
                }
                placeholder={
                  searchType ===
                  "song"
                    ? "Search for a song..."
                    : searchType ===
                        "album"
                      ? "Search for an album..."
                      : "Search for an artist..."
                }
              />

              <span className="keyboard-hint">
                ⌘K
              </span>
            </div>

            <select
              className="search-type"
              value={
                searchType
              }
              onChange={(
                event,
              ) => {
                setSearchType(
                  event.target
                    .value as MetadataSearchType,
                );

                setSubmittedQuery(
                  "",
                );

                setSearchState({
                  status:
                    "idle",
                  results: [],
                });
              }}
            >
              <option value="song">
                Song
              </option>

              <option value="album">
                Album
              </option>

              <option value="artist">
                Artist
              </option>
            </select>

            <button
              className="search-button"
              type="submit"
              disabled={
                searchState.status ===
                "loading"
              }
            >
              {searchState.status ===
              "loading"
                ? "Searching..."
                : "Search"}
            </button>
          </form>
        </section>

        {submittedQuery && (
          <section className="content-section search-results-section">
            <div className="section-header">
              <div>
                <h2>
                  Search results
                </h2>

                <p>
                  Real MusicBrainz
                  results matching
                  {" "}
                  “{submittedQuery}”
                </p>
              </div>

              {searchState.status ===
                "ready" && (
                <span className="result-count">
                  {
                    currentResultCount
                  }{" "}
                  result
                  {currentResultCount ===
                  1
                    ? ""
                    : "s"}
                </span>
              )}
            </div>

            {searchState.status ===
              "loading" && (
              <div className="empty-state">
                <strong>
                  Searching MusicBrainz…
                </strong>

                <span>
                  Public API mode
                  respects the global
                  rate limit.
                </span>
              </div>
            )}

            {searchState.status ===
              "error" && (
              <div className="empty-state">
                <strong>
                  Search failed.
                </strong>

                <span>
                  {
                    searchState.message
                  }
                </span>
              </div>
            )}

            {searchState.status ===
              "ready" &&
              currentResultCount ===
                0 && (
                <div className="empty-state">
                  <strong>
                    Nothing found.
                  </strong>

                  <span>
                    Try another
                    search.
                  </span>
                </div>
              )}

            {searchState.status ===
              "ready" &&
              searchType ===
                "song" && (
                <div className="song-results">
                  {songResults.map(
                    (song) => (
                      <button
                        className="song-result"
                        type="button"
                        key={
                          song.id
                        }
                        onClick={() =>
                          void openSong(
                            song,
                          )
                        }
                      >
                        <div className="song-result-icon">
                          ♪
                        </div>

                        <div className="song-result-copy">
                          <strong>
                            {
                              song.title
                            }
                          </strong>

                          <span>
                            {
                              song.artist
                            }

                            {song.firstReleaseYear
                              ? ` · ${song.firstReleaseYear}`
                              : ""}

                            {song.disambiguation
                              ? ` · ${song.disambiguation}`
                              : ""}
                          </span>
                        </div>

                        <span className="song-duration">
                          {formatDuration(
                            song.durationMs,
                          )}
                        </span>

                        <span className="result-chevron">
                          ›
                        </span>
                      </button>
                    ),
                  )}
                </div>
              )}

            {searchState.status ===
              "ready" &&
              searchType ===
                "album" && (
                <div className="song-results">
                  {albumResults.map(
                    (album) => {
                      const requested =
                        requestedAlbumIds.has(
                          album.id,
                        );

                      return (
                        <button
                          className="song-result"
                          type="button"
                          key={
                            album.id
                          }
                          onClick={() =>
                            void openAlbum(
                              album,
                              false,
                            )
                          }
                        >
                          <div className="result-artwork metadata-result-artwork">
                            {album.title
                              .charAt(
                                0,
                              )
                              .toUpperCase()}
                          </div>

                          <div className="song-result-copy">
                            <strong>
                              {
                                album.title
                              }
                            </strong>

                            <span>
                              {
                                album.artist
                              }

                              {album.year
                                ? ` · ${album.year}`
                                : ""}

                              {" · "}

                              {albumTypeLabel(
                                album,
                              )}
                            </span>
                          </div>

                          {isAlbumInLidarr(
                            album,
                          ) ? (
                            <span
                              className="library-badge"
                              title={
                                getLibraryStatusLabel(
                                  album,
                                ) ??
                                "In Lidarr"
                              }
                            >
                              ✓
                            </span>
                          ) : requested ? (
                            <span className="requested-badge">
                              Requested
                            </span>
                          ) : (
                            <span className="result-chevron">
                              ›
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              )}

            {searchState.status ===
              "ready" &&
              searchType ===
                "artist" && (
                <div className="song-results">
                  {artistResults.map(
                    (artist) => (
                      <button
                        className="song-result"
                        type="button"
                        key={
                          artist.id
                        }
                        onClick={() =>
                          void openArtist(
                            artist,
                          )
                        }
                      >
                        <div className="artist-result-artwork metadata-artist-artwork">
                          {artist.name
                            .charAt(
                              0,
                            )
                            .toUpperCase()}
                        </div>

                        <div className="song-result-copy">
                          <strong>
                            {
                              artist.name
                            }
                          </strong>

                          <span>
                            {[
                              artist.type,
                              artist.area,
                              artist.country,
                              artist.disambiguation,
                            ]
                              .filter(
                                Boolean,
                              )
                              .join(
                                " · ",
                              )}
                          </span>
                        </div>

                        <span className="result-chevron">
                          ›
                        </span>
                      </button>
                    ),
                  )}
                </div>
              )}
          </section>
        )}

        {!submittedQuery && (
          <section className="content-section">
            <div className="section-header">
              <div>
                <h2>
                  Your library
                </h2>

                <p>
                  Live state from
                  Lidarr.
                </p>
              </div>
            </div>

            <div className="flow-grid">
              <div className="flow-card">
                <span className="flow-number">
                  ALBUMS
                </span>

                <strong>
                  {
                    library.albumCount
                  }
                </strong>

                <p>
                  Albums with
                  files known by
                  Lidarr.
                </p>
              </div>

              <div className="flow-card">
                <span className="flow-number">
                  TRACKS
                </span>

                <strong>
                  {
                    library.trackFileCount
                  }
                </strong>

                <p>
                  Track files
                  currently indexed
                  by Lidarr.
                </p>
              </div>

              <div className="flow-card">
                <span className="flow-number">
                  ARTISTS
                </span>

                <strong>
                  {
                    library.artistCount
                  }
                </strong>

                <p>
                  Artists managed by
                  Lidarr.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      <nav className="mobile-nav">
        <button
          className="mobile-nav-active"
          type="button"
        >
          <span>⌂</span>
          Home
        </button>

        <button type="button">
          <span>⌕</span>
          Search
        </button>

        <button type="button">
          <span>♫</span>
          Library
        </button>

        <button type="button">
          <span>↻</span>
          Activity
        </button>
      </nav>

      {drawerOpen && (
        <>
          <button
            className="drawer-backdrop"
            type="button"
            onClick={
              closeDrawer
            }
            aria-label="Close drawer"
          />

          <aside className="media-drawer">
            <header className="drawer-header">
              <button
                className="drawer-back-button"
                type="button"
                onClick={
                  goBack
                }
              >
                {drawerMode ===
                  "album" &&
                (selectedSong ||
                  selectedArtist)
                  ? "←"
                  : "×"}
              </button>

              <span>
                {drawerMode ===
                  "song" &&
                  "Song"}

                {drawerMode ===
                  "album" &&
                  "Album"}

                {drawerMode ===
                  "artist" &&
                  "Artist"}
              </span>

              <button
                className="drawer-close-button"
                type="button"
                onClick={
                  closeDrawer
                }
              >
                ×
              </button>
            </header>

            {drawerLoading && (
              <div className="drawer-content">
                <div className="drawer-empty">
                  Loading from
                  MusicBrainz…
                </div>
              </div>
            )}

            {!drawerLoading &&
              drawerError && (
                <div className="drawer-content">
                  <div className="drawer-empty">
                    {
                      drawerError
                    }
                  </div>
                </div>
              )}

            {!drawerLoading &&
              !drawerError &&
              drawerMode ===
                "song" &&
              selectedSong && (
                <div className="drawer-content">
                  <div className="media-kicker">
                    Song
                  </div>

                  <h2 className="drawer-title">
                    {
                      selectedSong
                        .song.title
                    }
                  </h2>

                  <div className="drawer-artist">
                    {
                      selectedSong
                        .song.artist
                    }
                  </div>

                  <div className="metadata-grid">
                    <div>
                      <span>
                        Duration
                      </span>

                      <strong>
                        {formatDuration(
                          selectedSong
                            .song
                            .durationMs,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        First release
                      </span>

                      <strong>
                        {selectedSong
                          .song
                          .firstReleaseYear ??
                          "Unknown"}
                      </strong>
                    </div>
                  </div>

                  <section className="drawer-section">
                    <div className="drawer-section-heading">
                      <div>
                        <h3>
                          Appears on
                        </h3>

                        <p>
                          Choose
                          which album
                          you actually
                          want.
                        </p>
                      </div>
                    </div>

                    {selectedSong
                      .appearances
                      .length ===
                    0 ? (
                      <div className="drawer-empty">
                        No official
                        album
                        appearances
                        found.
                      </div>
                    ) : (
                      <div className="appears-on-list">
                        {selectedSong.appearances.map(
                          (
                            album,
                          ) => {
                            const requested =
                              requestedAlbumIds.has(
                                album.id,
                              );

                            return (
                              <button
                                className="appears-on-item"
                                type="button"
                                key={
                                  album.id
                                }
                                onClick={() =>
                                  void openAlbum(
                                    album,
                                  )
                                }
                              >
                                <div className="appears-on-artwork metadata-result-artwork">
                                  {album.title
                                    .charAt(
                                      0,
                                    )
                                    .toUpperCase()}
                                </div>

                                <div className="appears-on-copy">
                                  <strong>
                                    {
                                      album.title
                                    }
                                  </strong>

                                  <span>
                                    {album.year ??
                                      "Unknown"}

                                    {" · "}

                                    {albumTypeLabel(
                                      album,
                                    )}
                                  </span>
                                </div>

                                {isAlbumInLidarr(
                                  album,
                                ) ? (
                                  <span className="library-badge">
                                    ✓
                                  </span>
                                ) : requested ? (
                                  <span className="requested-badge">
                                    Requested
                                  </span>
                                ) : (
                                  <span className="result-chevron">
                                    ›
                                  </span>
                                )}
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}
                  </section>
                </div>
              )}

            {!drawerLoading &&
              !drawerError &&
              drawerMode ===
                "artist" &&
              selectedArtist && (
                <div className="drawer-content">
                  <div className="artist-hero metadata-artist-hero">
                    {selectedArtist.artist.name
                      .charAt(
                        0,
                      )
                      .toUpperCase()}
                  </div>

                  <div className="media-kicker">
                    Artist
                  </div>

                  <h2 className="drawer-title">
                    {
                      selectedArtist
                        .artist.name
                    }
                  </h2>

                  <div className="drawer-artist">
                    {[
                      selectedArtist
                        .artist.type,
                      selectedArtist
                        .artist.area,
                      selectedArtist
                        .artist
                        .country,
                      selectedArtist
                        .artist
                        .disambiguation,
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(" · ")}
                  </div>

                  <div className="artist-metadata">
                    {selectedArtist
                      .artist
                      .beginYear && (
                      <span>
                        Since{" "}
                        {
                          selectedArtist
                            .artist
                            .beginYear
                        }
                      </span>
                    )}

                    <span>
                      {
                        selectedArtist
                          .discography
                          .length
                      }{" "}
                      release groups
                    </span>
                  </div>

                  <section className="drawer-section">
                    <div className="drawer-section-heading">
                      <div>
                        <h3>
                          Discography
                        </h3>

                        <p>
                          Choose an
                          album to
                          inspect it.
                        </p>
                      </div>
                    </div>

                    <div className="artist-tabs">
                      <button
                        type="button"
                        className={
                          artistSection ===
                          "albums"
                            ? "artist-tab artist-tab-active"
                            : "artist-tab"
                        }
                        onClick={() =>
                          setArtistSection(
                            "albums",
                          )
                        }
                      >
                        Albums
                      </button>

                      <button
                        type="button"
                        className={
                          artistSection ===
                          "compilations"
                            ? "artist-tab artist-tab-active"
                            : "artist-tab"
                        }
                        onClick={() =>
                          setArtistSection(
                            "compilations",
                          )
                        }
                      >
                        Compilations
                      </button>

                      <button
                        type="button"
                        className={
                          artistSection ===
                          "live"
                            ? "artist-tab artist-tab-active"
                            : "artist-tab"
                        }
                        onClick={() =>
                          setArtistSection(
                            "live",
                          )
                        }
                      >
                        Live
                      </button>

                      <button
                        type="button"
                        className={
                          artistSection ===
                          "singles"
                            ? "artist-tab artist-tab-active"
                            : "artist-tab"
                        }
                        onClick={() =>
                          setArtistSection(
                            "singles",
                          )
                        }
                      >
                        Singles & EPs
                      </button>
                    </div>

                    {filteredArtistAlbums.length ===
                    0 ? (
                      <div className="drawer-empty">
                        Nothing in
                        this category.
                      </div>
                    ) : (
                      <div className="appears-on-list">
                        {filteredArtistAlbums.map(
                          (
                            album,
                          ) => (
                            <button
                              className="appears-on-item"
                              type="button"
                              key={
                                album.id
                              }
                              onClick={() =>
                                void openAlbum(
                                  album,
                                )
                              }
                            >
                              <div className="appears-on-artwork metadata-result-artwork">
                                {album.title
                                  .charAt(
                                    0,
                                  )
                                  .toUpperCase()}
                              </div>

                              <div className="appears-on-copy">
                                <strong>
                                  {
                                    album.title
                                  }
                                </strong>

                                <span>
                                  {album.year ??
                                    "Unknown"}

                                  {" · "}

                                  {albumTypeLabel(
                                    album,
                                  )}
                                </span>
                              </div>

                              {isAlbumInLidarr(
                                album,
                              ) ? (
                                <span className="library-badge">
                                  ✓
                                </span>
                              ) : (
                                <span className="result-chevron">
                                  ›
                                </span>
                              )}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </section>
                </div>
              )}

            {!drawerLoading &&
              !drawerError &&
              drawerMode ===
                "album" &&
              selectedAlbum && (
                <div className="drawer-content">
                  <div className="drawer-album-artwork metadata-album-hero">
                    {selectedAlbum.album.title
                      .charAt(
                        0,
                      )
                      .toUpperCase()}
                  </div>

                  <div className="media-kicker">
                    {albumTypeLabel(
                      selectedAlbum.album,
                    )}
                  </div>

                  <h2 className="drawer-title">
                    {
                      selectedAlbum
                        .album.title
                    }
                  </h2>

                  <div className="drawer-artist">
                    {
                      selectedAlbum
                        .album.artist
                    }

                    {selectedAlbum
                      .album.year
                      ? ` · ${selectedAlbum.album.year}`
                      : ""}
                  </div>

                  <section className="drawer-section">
                    <div className="drawer-section-heading">
                      <div>
                        <h3>
                          Tracklist
                        </h3>

                        <p>
                          {
                            selectedAlbum
                              .tracks
                              .length
                          }{" "}
                          tracks ·
                          representative
                          MusicBrainz
                          release
                        </p>
                      </div>
                    </div>

                    {selectedAlbum
                      .tracks
                      .length ===
                    0 ? (
                      <div className="drawer-empty">
                        No tracklist
                        available.
                      </div>
                    ) : (
                      <ol className="track-list">
                        {selectedAlbum.tracks.map(
                          (
                            track,
                            index,
                          ) => {
                            const highlighted =
                              selectedSong?.song.id ===
                              track.recordingId;

                            return (
                              <li
                                className={
                                  highlighted
                                    ? "track-highlighted"
                                    : ""
                                }
                                key={`${track.position}-${track.recordingId ?? index}`}
                              >
                                <span className="track-number">
                                  {
                                    track.position
                                  }
                                </span>

                                <span>
                                  {
                                    track.title
                                  }
                                </span>

                                {highlighted ? (
                                  <span className="track-match">
                                    Selected
                                    song
                                  </span>
                                ) : (
                                  <span className="track-duration">
                                    {formatDuration(
                                      track.durationMs,
                                    )}
                                  </span>
                                )}
                              </li>
                            );
                          },
                        )}
                      </ol>
                    )}
                  </section>

                  <div className="request-area">
                    {isAlbumInLidarr(
                      selectedAlbum.album,
                    ) ? (
                      <div className="in-library-state">
                        <span className="status-dot" />

                        {getLibraryStatusLabel(
                          selectedAlbum.album,
                        )}
                      </div>
                    ) : requestedAlbumIds.has(
                        selectedAlbum
                          .album.id,
                      ) ? (
                      <button
                        className="request-button requested"
                        disabled
                      >
                        ✓ Requested
                      </button>
                    ) : (
                      <button
                        className="request-button"
                        type="button"
                        disabled={
                          requestingAlbumId ===
                          selectedAlbum
                            .album.id
                        }
                        onClick={() =>
                          requestAlbum(
                            selectedAlbum.album,
                          )
                        }
                      >
                        {requestingAlbumId ===
                        selectedAlbum
                          .album.id
                          ? "Requesting..."
                          : "Request Album"}
                      </button>
                    )}
                  </div>
                </div>
              )}
          </aside>
        </>
      )}
    </div>
  );
}
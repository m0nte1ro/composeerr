"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { albums, songs, type Album, type Song } from "@/lib/mock-music";

type SearchType = "song" | "album" | "artist";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function scoreSong(song: Song, query: string) {
  const title = normalize(song.title);
  const artist = normalize(song.artist);
  const search = normalize(query);

  if (!search) return 0;

  if (title === search) return 1000;
  if (title.startsWith(search)) return 800;
  if (title.includes(search)) return 600;
  if (artist.includes(search)) return 300;

  return 0;
}

export default function Home() {
  const [searchType, setSearchType] = useState<SearchType>("song");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  const [requestedAlbumIds, setRequestedAlbumIds] = useState<Set<string>>(
    new Set(),
  );
  const [requestingAlbumId, setRequestingAlbumId] = useState<string | null>(
    null,
  );

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (event.key === "Escape") {
        setSelectedAlbum(null);
        setSelectedSong(null);
      }
    }

    window.addEventListener("keydown", handleShortcut);

    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const songResults = useMemo(() => {
    if (!submittedQuery || searchType !== "song") return [];

    return songs
      .map((song) => ({
        song,
        score: scoreSong(song, submittedQuery),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((result) => result.song);
  }, [submittedQuery, searchType]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      searchRef.current?.focus();
      return;
    }

    setSubmittedQuery(trimmedQuery);
    setSelectedSong(null);
    setSelectedAlbum(null);
  }

  function openSong(song: Song) {
    setSelectedSong(song);
    setSelectedAlbum(null);
  }

  function openAlbum(album: Album) {
    setSelectedAlbum(album);
  }

  function closeDrawer() {
    setSelectedAlbum(null);
    setSelectedSong(null);
  }

  function goBack() {
    if (selectedAlbum && selectedSong) {
      setSelectedAlbum(null);
      return;
    }

    closeDrawer();
  }

  function requestAlbum(album: Album) {
    if (album.inLibrary || requestedAlbumIds.has(album.id)) return;

    setRequestingAlbumId(album.id);

    window.setTimeout(() => {
      setRequestedAlbumIds((current) => {
        const next = new Set(current);
        next.add(album.id);
        return next;
      });

      setRequestingAlbumId(null);
    }, 850);
  }

  const appearsOnAlbums =
    selectedSong?.albumIds
      .map((albumId) => albums.find((album) => album.id === albumId))
      .filter((album): album is Album => Boolean(album)) ?? [];

  const drawerOpen = Boolean(selectedSong || selectedAlbum);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>

          <div>
            <div className="brand-name">Composeerr</div>
            <div className="brand-subtitle">Music requests</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item nav-item-active" type="button">
            <span className="nav-icon">⌂</span>
            Discover
          </button>

          <button className="nav-item" type="button">
            <span className="nav-icon">⌕</span>
            Search
          </button>

          <button className="nav-item" type="button">
            <span className="nav-icon">♫</span>
            Library
          </button>

          <button className="nav-item" type="button">
            <span className="nav-icon">↻</span>
            Activity
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" type="button">
            <span className="nav-icon">⚙</span>
            Settings
          </button>

          <div className="lidarr-status">
            <span className="status-dot" />

            <div>
              <strong>Lidarr</strong>
              <span>Connected</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="mobile-header">
          <div className="brand-mark">C</div>
          <span>Composeerr</span>

          <button type="button" aria-label="Open settings">
            ⚙
          </button>
        </header>

        <section className="hero">
          <div className="hero-eyebrow">Your music, without the admin</div>

          <h1>Find it. Pick the album. Request it.</h1>

          <p>
            Search for a song, album or artist. Composeerr handles the messy
            part between you and Lidarr.
          </p>

          <form className="search-form" onSubmit={handleSubmit}>
            <div className="search-control">
              <span className="search-icon">⌕</span>

              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  searchType === "song"
                    ? "Search for a song..."
                    : searchType === "album"
                      ? "Search for an album..."
                      : "Search for an artist..."
                }
              />

              <span className="keyboard-hint">⌘K</span>
            </div>

            <select
              className="search-type"
              value={searchType}
              onChange={(event) =>
                setSearchType(event.target.value as SearchType)
              }
            >
              <option value="song">Song</option>
              <option value="album">Album</option>
              <option value="artist">Artist</option>
            </select>

            <button className="search-button" type="submit">
              Search
            </button>
          </form>
        </section>

        {submittedQuery && (
          <section className="content-section search-results-section">
            <div className="section-header">
              <div>
                <h2>Search results</h2>

                <p>
                  {searchType === "song"
                    ? `Songs matching “${submittedQuery}”`
                    : `${searchType} search comes next`}
                </p>
              </div>

              {searchType === "song" && (
                <span className="result-count">
                  {songResults.length} result
                  {songResults.length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {searchType !== "song" ? (
              <div className="empty-state">
                <strong>{searchType} search isn&apos;t wired yet.</strong>
                <span>For now, switch back to Song.</span>
              </div>
            ) : songResults.length === 0 ? (
              <div className="empty-state">
                <strong>No songs found.</strong>
                <span>Try “Let Down” or “Fly Me to the Moon”.</span>
              </div>
            ) : (
              <div className="song-results">
                {songResults.map((song) => (
                  <button
                    className="song-result"
                    type="button"
                    key={song.id}
                    onClick={() => openSong(song)}
                  >
                    <div className="song-result-icon">♪</div>

                    <div className="song-result-copy">
                      <strong>{song.title}</strong>
                      <span>
                        {song.artist} · {song.firstRelease}
                      </span>
                    </div>

                    <span className="song-duration">{song.duration}</span>
                    <span className="result-chevron">›</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {!submittedQuery && (
          <section className="content-section">
            <div className="section-header">
              <div>
                <h2>Recently requested</h2>
                <p>A small preview while we build the real library state.</p>
              </div>
            </div>

            <div className="album-grid">
              {albums.slice(0, 4).map((album) => (
                <button
                  type="button"
                  className="album-card"
                  key={album.id}
                  onClick={() => openAlbum(album)}
                >
                  <div className={`album-artwork ${album.artworkClass}`}>
                    {album.inLibrary && (
                      <div className="album-status">
                        <span className="status-dot" />
                        In Library
                      </div>
                    )}
                  </div>

                  <div className="album-info">
                    <strong>{album.title}</strong>
                    <span>
                      {album.artist} · {album.year}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <nav className="mobile-nav">
        <button className="mobile-nav-active" type="button">
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
            onClick={closeDrawer}
            aria-label="Close drawer"
          />

          <aside className="media-drawer">
            <header className="drawer-header">
              <button className="drawer-back-button" type="button" onClick={goBack}>
                {selectedAlbum && selectedSong ? "←" : "×"}
              </button>

              <span>
                {selectedAlbum
                  ? "Album"
                  : selectedSong
                    ? "Song"
                    : ""}
              </span>

              <button
                className="drawer-close-button"
                type="button"
                onClick={closeDrawer}
              >
                ×
              </button>
            </header>

            {selectedSong && !selectedAlbum && (
              <div className="drawer-content">
                <div className="media-kicker">Song</div>

                <h2 className="drawer-title">{selectedSong.title}</h2>
                <div className="drawer-artist">{selectedSong.artist}</div>

                <div className="metadata-grid">
                  <div>
                    <span>Duration</span>
                    <strong>{selectedSong.duration}</strong>
                  </div>

                  <div>
                    <span>First release</span>
                    <strong>{selectedSong.firstRelease}</strong>
                  </div>
                </div>

                <section className="drawer-section">
                  <div className="drawer-section-heading">
                    <div>
                      <h3>Appears on</h3>
                      <p>Choose which album you actually want.</p>
                    </div>
                  </div>

                  {appearsOnAlbums.length === 0 ? (
                    <div className="drawer-empty">
                      No album data in the mock dataset yet.
                    </div>
                  ) : (
                    <div className="appears-on-list">
                      {appearsOnAlbums.map((album) => {
                        const requested = requestedAlbumIds.has(album.id);

                        return (
                          <button
                            className="appears-on-item"
                            type="button"
                            key={album.id}
                            onClick={() => openAlbum(album)}
                          >
                            <div
                              className={`appears-on-artwork ${album.artworkClass}`}
                            />

                            <div className="appears-on-copy">
                              <strong>{album.title}</strong>
                              <span>
                                {album.year} · {album.type}
                              </span>
                            </div>

                            {album.inLibrary ? (
                              <span className="library-badge">✓</span>
                            ) : requested ? (
                              <span className="requested-badge">Requested</span>
                            ) : (
                              <span className="result-chevron">›</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}

            {selectedAlbum && (
              <div className="drawer-content">
                <div
                  className={`drawer-album-artwork ${selectedAlbum.artworkClass}`}
                />

                <div className="media-kicker">{selectedAlbum.type}</div>

                <h2 className="drawer-title">{selectedAlbum.title}</h2>

                <div className="drawer-artist">
                  {selectedAlbum.artist} · {selectedAlbum.year}
                </div>

                <section className="drawer-section">
                  <div className="drawer-section-heading">
                    <div>
                      <h3>Tracklist</h3>
                      <p>{selectedAlbum.tracks.length} tracks</p>
                    </div>
                  </div>

                  <ol className="track-list">
                    {selectedAlbum.tracks.map((track, index) => {
                      const highlighted =
                        selectedSong &&
                        normalize(track) === normalize(selectedSong.title);

                      return (
                        <li
                          className={highlighted ? "track-highlighted" : ""}
                          key={`${track}-${index}`}
                        >
                          <span className="track-number">
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <span>{track}</span>

                          {highlighted && (
                            <span className="track-match">Selected song</span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </section>

                <div className="request-area">
                  {selectedAlbum.inLibrary ? (
                    <div className="in-library-state">
                      <span className="status-dot" />
                      In Library
                    </div>
                  ) : requestedAlbumIds.has(selectedAlbum.id) ? (
                    <button className="request-button requested" disabled>
                      ✓ Requested
                    </button>
                  ) : (
                    <button
                      className="request-button"
                      type="button"
                      disabled={requestingAlbumId === selectedAlbum.id}
                      onClick={() => requestAlbum(selectedAlbum)}
                    >
                      {requestingAlbumId === selectedAlbum.id
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
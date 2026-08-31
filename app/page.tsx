"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type SearchType = "song" | "album" | "artist";

const recentAlbums = [
  {
    title: "OK Computer",
    artist: "Radiohead",
    year: 1997,
    status: "Available",
    artworkClass: "artwork-radiohead",
  },
  {
    title: "Nothing but the Best",
    artist: "Frank Sinatra",
    year: 2008,
    status: "Requested",
    artworkClass: "artwork-sinatra",
  },
  {
    title: "In Rainbows",
    artist: "Radiohead",
    year: 2007,
    status: "Available",
    artworkClass: "artwork-rainbows",
  },
  {
    title: "Random Access Memories",
    artist: "Daft Punk",
    year: 2013,
    status: "Available",
    artworkClass: "artwork-ram",
  },
];

export default function Home() {
  const [searchType, setSearchType] = useState<SearchType>("song");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleShortcut);

    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      searchRef.current?.focus();
      return;
    }

    setSubmittedQuery(trimmedQuery);
  }

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

        <nav className="sidebar-nav" aria-label="Primary navigation">
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
                aria-label="Search"
              />

              <span className="keyboard-hint">⌘K</span>
            </div>

            <select
              className="search-type"
              value={searchType}
              onChange={(event) =>
                setSearchType(event.target.value as SearchType)
              }
              aria-label="Search type"
            >
              <option value="song">Song</option>
              <option value="album">Album</option>
              <option value="artist">Artist</option>
            </select>

            <button className="search-button" type="submit">
              Search
            </button>
          </form>

          {submittedQuery && (
            <div className="search-preview">
              <span>Search ready</span>

              <strong>{submittedQuery}</strong>

              <small>
                {searchType === "song" && "Looking for matching songs"}
                {searchType === "album" && "Looking for matching albums"}
                {searchType === "artist" && "Looking for matching artists"}
              </small>
            </div>
          )}
        </section>

        <section className="content-section">
          <div className="section-header">
            <div>
              <h2>Recently requested</h2>
              <p>Albums that have recently made their way into your library.</p>
            </div>

            <button type="button" className="text-button">
              View library
            </button>
          </div>

          <div className="album-grid">
            {recentAlbums.map((album) => (
              <button
                type="button"
                className="album-card"
                key={`${album.artist}-${album.title}`}
              >
                <div className={`album-artwork ${album.artworkClass}`}>
                  <div className="album-status">
                    <span
                      className={
                        album.status === "Available"
                          ? "status-dot"
                          : "status-dot status-dot-requested"
                      }
                    />

                    {album.status}
                  </div>
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

        <section className="content-section secondary-section">
          <div className="section-header">
            <div>
              <h2>How Composeerr works</h2>
              <p>No release-group archaeology required.</p>
            </div>
          </div>

          <div className="flow-grid">
            <div className="flow-card">
              <span className="flow-number">01</span>
              <strong>Search</strong>
              <p>Choose Song, Album or Artist and find what you actually want.</p>
            </div>

            <div className="flow-card">
              <span className="flow-number">02</span>
              <strong>Inspect</strong>
              <p>See where a song appears and inspect each album&apos;s tracklist.</p>
            </div>

            <div className="flow-card">
              <span className="flow-number">03</span>
              <strong>Request</strong>
              <p>Choose an album and Composeerr takes care of Lidarr.</p>
            </div>
          </div>
        </section>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
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
    </div>
  );
}
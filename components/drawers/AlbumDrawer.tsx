import { DiscoveryArtwork } from "@/components/search/DiscoveryArtwork";
import type { DiscoveryAlbumResult } from "@/lib/metadata/types";
import { AlbumArtwork } from "@/components/music/AlbumArtwork";
import { MetadataEnrichment } from "@/components/drawers/MetadataEnrichment";
import { TrackList } from "@/components/music/TrackList";
import { Button } from "@/components/ui/Button";
import { albumTypeLabel } from "@/lib/metadata/format";
import type {
  MetadataAlbumDetails,
  MetadataAlbumResult,
} from "@/lib/metadata/types";

type AlbumDrawerProps = {
  details: MetadataAlbumDetails | null;
  preview?: DiscoveryAlbumResult | null;
  loading?: boolean;
  error?: string | null;
  selectedSongRecordingId: string | null;
  requestError: string | null;
  requestingAlbumId: string | null;
  isAlbumManaged: (album: MetadataAlbumResult) => boolean;
  isAlbumRequested: (albumId: string) => boolean;
  getLibraryStatusLabel: (album: MetadataAlbumResult) => string | null;
  onRequestAlbum: (album: MetadataAlbumResult) => void;
};

export function AlbumDrawer({
  details,
  preview,
  loading = false,
  error,
  selectedSongRecordingId,
  requestError,
  requestingAlbumId,
  isAlbumManaged,
  isAlbumRequested,
  getLibraryStatusLabel,
  onRequestAlbum,
}: AlbumDrawerProps) {
  const album = details?.album;
  const display = album ?? preview;
  if (!display) return null;
  const ready = Boolean(album) && !loading && !error;
  const managed = ready && album ? isAlbumManaged(album) : false;
  const requested = ready && album ? isAlbumRequested(album.id) : false;

  return (
    <div className="album-drawer">
      <div className="drawer-content album-drawer-scroll">
        {preview && (preview.artworkUrl || preview.canonical || !album) ? (
          <DiscoveryArtwork result={preview} className="drawer-album-artwork metadata-album-hero" />
        ) : album ? (
          <AlbumArtwork album={album} className="drawer-album-artwork metadata-album-hero" />
        ) : null}

        <div className="media-kicker">{album ? albumTypeLabel(album) : "Album"}</div>

        <h2 className="drawer-title">{display.title}</h2>
        <div className="drawer-artist">
          {display.artist}
          {album?.year ? ` · ${album.year}` : ""}
        </div>

        {album && !loading && !error && <MetadataEnrichment entity={album} />}

        <section className="drawer-section">
          <div className="drawer-section-heading">
            <div>
              <h3>Tracklist</h3>
              <p>{loading ? "Loading tracks…" : error ? "Tracklist unavailable" : `${details?.tracks.length ?? 0} tracks`}</p>
            </div>
          </div>

          {error ? <p role="alert">{error}</p> : loading ? (
            <p role="status">Loading album details…</p>
          ) : <TrackList tracks={details?.tracks ?? []} selectedRecordingId={selectedSongRecordingId} />}
        </section>

      </div>

      <div className="request-area">
        {requestError && <div className="request-error">{requestError}</div>}

        {!ready || !album ? (
          <Button className="request-button" disabled>
            {loading ? "Loading album…" : "Album unavailable"}
          </Button>
        ) : managed ? (
          <div className="in-library-state">
            <span className="status-dot" />
            {getLibraryStatusLabel(album)}
          </div>
        ) : requested ? (
          <button className="request-button requested" disabled>
            ✓ Requested
          </button>
        ) : (
          <Button
            className="request-button"
            type="button"
            disabled={requestingAlbumId === album.id}
            onClick={() => onRequestAlbum(album)}
          >
            {requestingAlbumId === album.id ? "Requesting..." : "Request Album"}
          </Button>
        )}
      </div>
    </div>
  );
}

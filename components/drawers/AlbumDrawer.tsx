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
  details: MetadataAlbumDetails;
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
  selectedSongRecordingId,
  requestError,
  requestingAlbumId,
  isAlbumManaged,
  isAlbumRequested,
  getLibraryStatusLabel,
  onRequestAlbum,
}: AlbumDrawerProps) {
  const album = details.album;
  const managed = isAlbumManaged(album);
  const requested = isAlbumRequested(album.id);

  return (
    <div className="drawer-content">
      <AlbumArtwork album={album} className="drawer-album-artwork metadata-album-hero" />

      <div className="media-kicker">{albumTypeLabel(album)}</div>

      <h2 className="drawer-title">{album.title}</h2>
      <div className="drawer-artist">
        {album.artist}
        {album.year ? ` · ${album.year}` : ""}
      </div>

      <MetadataEnrichment entity={album} />

      <section className="drawer-section">
        <div className="drawer-section-heading">
          <div>
            <h3>Tracklist</h3>
            <p>{details.tracks.length} tracks · representative MusicBrainz release</p>
          </div>
        </div>

        <TrackList tracks={details.tracks} selectedRecordingId={selectedSongRecordingId} />
      </section>

      <div className="request-area">
        {requestError && <div className="request-error">{requestError}</div>}

        {managed ? (
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

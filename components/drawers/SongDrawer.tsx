import { AlbumArtwork } from "@/components/music/AlbumArtwork";
import { AvailabilityBadge } from "@/components/music/AvailabilityBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { albumTypeLabel, formatDuration } from "@/lib/metadata/format";
import type {
  MetadataAlbumResult,
  MetadataSongDetails,
} from "@/lib/metadata/types";

type SongDrawerProps = {
  details: MetadataSongDetails;
  isAlbumManaged: (album: MetadataAlbumResult) => boolean;
  isAlbumRequested: (albumId: string) => boolean;
  onOpenAlbum: (album: MetadataAlbumResult) => void;
};

export function SongDrawer({
  details,
  isAlbumManaged,
  isAlbumRequested,
  onOpenAlbum,
}: SongDrawerProps) {
  return (
    <div className="drawer-content">
      <div className="media-kicker">Song</div>

      <h2 className="drawer-title">{details.song.title}</h2>
      <div className="drawer-artist">{details.song.artist}</div>

      <div className="metadata-grid">
        <div>
          <span>Duration</span>
          <strong>{formatDuration(details.song.durationMs)}</strong>
        </div>

        <div>
          <span>First release</span>
          <strong>{details.song.firstReleaseYear ?? "Unknown"}</strong>
        </div>
      </div>

      <section className="drawer-section">
        <div className="drawer-section-heading">
          <div>
            <h3>Appears on</h3>
            <p>Choose which album you actually want.</p>
          </div>
        </div>

        {details.appearances.length === 0 ? (
          <EmptyState
            className="drawer-empty"
            title="No official album appearances found."
            message=""
          />
        ) : (
          <div className="appears-on-list">
            {details.appearances.map((album) => (
              <button
                className="appears-on-item"
                type="button"
                key={album.id}
                onClick={() => onOpenAlbum(album)}
              >
                <AlbumArtwork title={album.title} className="appears-on-artwork metadata-result-artwork" />

                <div className="appears-on-copy">
                  <strong>{album.title}</strong>

                  <span>
                    {album.year ?? "Unknown"}
                    {" · "}
                    {albumTypeLabel(album)}
                  </span>
                </div>

                <AvailabilityBadge
                  status={
                    isAlbumManaged(album)
                      ? "available"
                      : isAlbumRequested(album.id)
                        ? "requested"
                        : "none"
                  }
                />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

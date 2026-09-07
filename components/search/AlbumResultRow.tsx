import { DiscoveryArtwork } from "@/components/search/DiscoveryArtwork";
import { AvailabilityBadge } from "@/components/music/AvailabilityBadge";
import type { DiscoveryAlbumResult } from "@/lib/metadata/types";

type AlbumResultRowProps = {
  album: DiscoveryAlbumResult;
  requested: boolean;
  available: boolean;
  statusLabel: string | null;
  onOpen: (album: DiscoveryAlbumResult) => void;
};

export function AlbumResultRow({
  album,
  requested,
  available,
  statusLabel,
  onOpen,
}: AlbumResultRowProps) {
  return (
    <button className="song-result" type="button" onClick={() => onOpen(album)}>
      <DiscoveryArtwork result={album} className="result-artwork metadata-result-artwork" />

      <div className="song-result-copy">
        <strong>{album.title}</strong>

        <span>
          {album.artist}
        </span>
      </div>

      <AvailabilityBadge
        status={available ? "available" : requested ? "requested" : "none"}
        title={statusLabel ?? "In Lidarr"}
      />
    </button>
  );
}

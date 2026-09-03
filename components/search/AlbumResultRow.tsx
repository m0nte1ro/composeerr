import { AlbumArtwork } from "@/components/music/AlbumArtwork";
import { AvailabilityBadge } from "@/components/music/AvailabilityBadge";
import { albumTypeLabel } from "@/lib/metadata/format";
import type { MetadataAlbumResult } from "@/lib/metadata/types";

type AlbumResultRowProps = {
  album: MetadataAlbumResult;
  requested: boolean;
  available: boolean;
  statusLabel: string | null;
  onOpen: (album: MetadataAlbumResult) => void;
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
      <AlbumArtwork album={album} className="result-artwork metadata-result-artwork" />

      <div className="song-result-copy">
        <strong>{album.title}</strong>

        <span>
          {album.artist}
          {album.year ? ` · ${album.year}` : ""}
          {" · "}
          {albumTypeLabel(album)}
        </span>
      </div>

      <AvailabilityBadge
        status={available ? "available" : requested ? "requested" : "none"}
        title={statusLabel ?? "In Lidarr"}
      />
    </button>
  );
}

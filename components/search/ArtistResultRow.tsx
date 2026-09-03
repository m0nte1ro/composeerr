import { ArtistArtwork } from "@/components/music/ArtistArtwork";
import { artistSummary } from "@/lib/metadata/format";
import type { MetadataArtistResult } from "@/lib/metadata/types";

type ArtistResultRowProps = {
  artist: MetadataArtistResult;
  onOpen: (artist: MetadataArtistResult) => void;
};

export function ArtistResultRow({
  artist,
  onOpen,
}: ArtistResultRowProps) {
  return (
    <button className="song-result" type="button" onClick={() => onOpen(artist)}>
      <ArtistArtwork artist={artist} className="artist-result-artwork metadata-artist-artwork" />

      <div className="song-result-copy">
        <strong>{artist.name}</strong>

        <span>
          {artistSummary([
            artist.type,
            artist.area,
            artist.country,
            artist.disambiguation,
          ])}
        </span>
      </div>

      <span className="result-chevron">›</span>
    </button>
  );
}

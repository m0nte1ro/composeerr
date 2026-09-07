import { DiscoveryArtwork } from "@/components/search/DiscoveryArtwork";
import type { DiscoveryArtistResult } from "@/lib/metadata/types";

type ArtistResultRowProps = {
  artist: DiscoveryArtistResult;
  onOpen: (artist: DiscoveryArtistResult) => void;
};

export function ArtistResultRow({
  artist,
  onOpen,
}: ArtistResultRowProps) {
  return (
    <button className="song-result" type="button" onClick={() => onOpen(artist)}>
      <DiscoveryArtwork result={artist} className="artist-result-artwork metadata-artist-artwork" />

      <div className="song-result-copy">
        <strong>{artist.name}</strong>

        {artist.listeners !== null ? <span>{artist.listeners.toLocaleString()} listeners</span> : null}
      </div>

      <span className="result-chevron">›</span>
    </button>
  );
}

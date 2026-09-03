import { ResolvedArtwork } from "@/components/music/ResolvedArtwork";
import type { MetadataArtistResult } from "@/lib/metadata/types";

type ArtistArtworkProps = {
  artist: MetadataArtistResult;
  className?: string;
};

export function ArtistArtwork({ artist, className }: ArtistArtworkProps) {
  return (
    <ResolvedArtwork
      entity={artist}
      label={artist.name}
      shape="circle"
      className={className ?? "artist-result-artwork metadata-artist-artwork"}
    />
  );
}

import { ArtworkPlaceholder } from "@/components/music/ArtworkPlaceholder";

type ArtistArtworkProps = {
  name: string;
  className?: string;
};

export function ArtistArtwork({ name, className }: ArtistArtworkProps) {
  return (
    <ArtworkPlaceholder
      label={name}
      shape="circle"
      className={className ?? "artist-result-artwork metadata-artist-artwork"}
    />
  );
}

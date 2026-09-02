import { ArtworkPlaceholder } from "@/components/music/ArtworkPlaceholder";

type AlbumArtworkProps = {
  title: string;
  className?: string;
};

export function AlbumArtwork({ title, className }: AlbumArtworkProps) {
  return (
    <ArtworkPlaceholder
      label={title}
      className={className ?? "result-artwork metadata-result-artwork"}
    />
  );
}

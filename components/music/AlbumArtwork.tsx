import { ResolvedArtwork } from "@/components/music/ResolvedArtwork";
import type { MetadataAlbumResult } from "@/lib/metadata/types";

type AlbumArtworkProps = {
  album: MetadataAlbumResult;
  className?: string;
};

export function AlbumArtwork({ album, className }: AlbumArtworkProps) {
  return (
    <ResolvedArtwork
      entity={album}
      label={album.title}
      className={className ?? "result-artwork metadata-result-artwork"}
    />
  );
}

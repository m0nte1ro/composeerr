import type {
  MetadataAlbumResult,
  MetadataArtistResult,
  MetadataSongResult,
} from "@/lib/metadata/types";

export interface MusicMetadataProvider {
  readonly id: string;
  readonly name: string;

  searchArtists(
    query: string,
    limit?: number,
  ): Promise<MetadataArtistResult[]>;

  searchAlbums(
    query: string,
    limit?: number,
  ): Promise<MetadataAlbumResult[]>;

  searchSongs(
    query: string,
    limit?: number,
  ): Promise<MetadataSongResult[]>;
}
import type {
  MetadataAlbumDetails,
  MetadataAlbumResult,
  MetadataArtistDetails,
  MetadataArtistResult,
  MetadataSongDetails,
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

  getArtist(
    id: string,
  ): Promise<MetadataArtistDetails>;

  getAlbum(
    id: string,
  ): Promise<MetadataAlbumDetails>;

  getSong(
    id: string,
  ): Promise<MetadataSongDetails>;
}
export type MetadataSearchType =
  | "song"
  | "album"
  | "artist";

export type MetadataArtistResult = {
  kind: "artist";

  id: string;
  name: string;

  disambiguation: string | null;
  type: string | null;
  country: string | null;
  area: string | null;

  beginYear: number | null;

  score: number;
};

export type MetadataAlbumResult = {
  kind: "album";

  id: string;
  title: string;

  artist: string;
  artistId: string | null;

  year: number | null;

  primaryType: string | null;
  secondaryTypes: string[];

  disambiguation: string | null;

  score: number;
};

export type MetadataSongResult = {
  kind: "song";

  id: string;
  title: string;

  artist: string;
  artistId: string | null;

  durationMs: number | null;
  firstReleaseYear: number | null;

  disambiguation: string | null;

  score: number;
};

export type MetadataSearchResult =
  | MetadataArtistResult
  | MetadataAlbumResult
  | MetadataSongResult;

export type MetadataTrack = {
  position: string;
  title: string;
  durationMs: number | null;
  recordingId: string | null;
};

export type MetadataSongDetails = {
  song: MetadataSongResult;
  appearances: MetadataAlbumResult[];
};

export type MetadataAlbumDetails = {
  album: MetadataAlbumResult;

  representativeReleaseId: string | null;

  tracks: MetadataTrack[];
};

export type MetadataArtistDetails = {
  artist: MetadataArtistResult;
  discography: MetadataAlbumResult[];
};

export type MetadataEnrichment = {
  description: string | null;
  tags: string[];
  listeners: number | null;
  playCount: number | null;
  providerNames: string[];
};

export type ArtworkResolution = {
  url: string | null;
  provider: string | null;
};
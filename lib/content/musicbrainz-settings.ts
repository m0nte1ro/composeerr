export const DEFAULT_MUSICBRAINZ_URL = "https://musicbrainz.org/ws/2";

export type MusicBrainzAuthMode = "none" | "basic" | "header";

export type PublicMusicBrainzSettings = {
  available: true;
  customized: boolean;
  useSearchSettings?: boolean;
  searchEngine?: "musicbrainz" | "lastfm";
  url: string;
  authMode: MusicBrainzAuthMode;
  username: string;
  headerName: string;
  hasPassword: boolean;
  hasHeaderSecret: boolean;
};

export type MusicBrainzSettingsPayload = {
  url: string;
  useSearchSettings?: boolean;
  authMode: MusicBrainzAuthMode;
  username?: string;
  password?: string;
  headerName?: string;
  headerSecret?: string;
};

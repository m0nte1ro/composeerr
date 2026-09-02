export const METADATA_PROVIDER_KEYS = [
  "lastfm",
  "discogs",
  "theaudiodb",
] as const;

export type MetadataProviderKey = (typeof METADATA_PROVIDER_KEYS)[number];

export const DEFAULT_METADATA_PROVIDER_URLS: Record<MetadataProviderKey, string> = {
  lastfm: "https://ws.audioscrobbler.com/2.0/",
  discogs: "https://api.discogs.com",
  theaudiodb: "https://www.theaudiodb.com/api/v1/json",
};

export type ApiAuthMode = "none" | "basic" | "header";
export type CredentialProviderAuthMode = ApiAuthMode | "native";

export type PublicMetadataProvider = {
  key: MetadataProviderKey;
  name: string;
  enabled: boolean;
  order: number;
  url: string;
  authMode: CredentialProviderAuthMode;
  username: string;
  headerName: string;
  hasApiKey: boolean;
  hasToken: boolean;
  hasNativeSecret: boolean;
  hasPassword: boolean;
  hasHeaderSecret: boolean;
};

export type MetadataProvidersSettings = {
  providers: PublicMetadataProvider[];
  availableProviders: MetadataProviderKey[];
};

export type MetadataProviderPayload = {
  key: MetadataProviderKey;
  enabled: boolean;
  url: string;
  authMode: CredentialProviderAuthMode;
  nativeSecret?: string;
  username?: string;
  password?: string;
  headerName?: string;
  headerSecret?: string;
};

export const ARTWORK_PROVIDER_KEYS = [
  "cover-art-archive",
  "fanart",
] as const;

export type ArtworkProviderKey = (typeof ARTWORK_PROVIDER_KEYS)[number];

export const DEFAULT_COVER_ART_ARCHIVE_URL = "https://coverartarchive.org";
export const DEFAULT_FANART_URL = "https://webservice.fanart.tv/v3.2";

export type ArtworkAuthMode = ApiAuthMode;

export type ArtworkSettings = {
  coverArtArchive: {
    available: true;
    enabled: boolean;
    customized: boolean;
    url: string;
    authMode: ArtworkAuthMode;
    username: string;
    headerName: string;
    hasPassword: boolean;
    hasHeaderSecret: boolean;
  };
  fanart: {
    enabled: boolean;
    url: string;
    authMode: CredentialProviderAuthMode;
    username: string;
    headerName: string;
    hasApiKey: boolean;
    hasNativeSecret: boolean;
    hasPassword: boolean;
    hasHeaderSecret: boolean;
  } | null;
  theAudioDbFallback: {
    configured: boolean;
    enabled: boolean;
  };
};

export type ArtworkProviderPayload =
  | {
      key: "cover-art-archive";
      enabled: boolean;
      url: string;
      authMode: ArtworkAuthMode;
      username?: string;
      password?: string;
      headerName?: string;
      headerSecret?: string;
    }
  | {
      key: "fanart";
      enabled: boolean;
      url: string;
      authMode: CredentialProviderAuthMode;
      nativeSecret?: string;
      username?: string;
      password?: string;
      headerName?: string;
      headerSecret?: string;
    };

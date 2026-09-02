export type LidarrConnection = {
  url: string;
  apiKey: string;
};

export type LidarrSystemStatus = {
  appName?: string;
  instanceName?: string;
  version?: string;
  osName?: string;
  osVersion?: string;
};

export type LidarrRootFolder = {
  id: number;
  name?: string;
  path: string;
};

export type LidarrProfile = {
  id: number;
  name: string;
};

export type LidarrOptions = {
  rootFolders: LidarrRootFolder[];
  qualityProfiles: LidarrProfile[];
  metadataProfiles: LidarrProfile[];
};

export type ComposeerrLibraryAlbum = {
  lidarrId: number;
  title: string;
  artist: string;
  year: number | null;
  musicBrainzReleaseGroupId: string;
  musicBrainzArtistId: string | null;
  monitored: boolean;
  status: "tracked" | "partial" | "available";
  trackFileCount: number;
  trackCount: number;
  sizeOnDisk: number;
};

export type ComposeerrLibrary = {
  albums: ComposeerrLibraryAlbum[];
  knownAlbumCount: number;
  monitoredAlbumCount: number;
  albumCount: number;
  trackFileCount: number;
  artistCount: number;
};

export type LidarrAlbumRequestDefaults = {
  rootFolderPath: string;
  qualityProfileId: number;
  metadataProfileId: number;
  searchAfterAdd: boolean;
};

export type LidarrAlbumRequestResult = {
  albumId: number;
  artistId: number | null;
  foreignAlbumId: string;
  added: boolean;
  searchTriggered: boolean;
  searchCommandId: number | null;
};

export const EMPTY_LIBRARY: ComposeerrLibrary = {
  albums: [],
  knownAlbumCount: 0,
  monitoredAlbumCount: 0,
  albumCount: 0,
  trackFileCount: 0,
  artistCount: 0,
};

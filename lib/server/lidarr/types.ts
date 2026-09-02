export type {
  ComposeerrLibrary,
  ComposeerrLibraryAlbum,
  LidarrAlbumRequestDefaults,
  LidarrAlbumRequestResult,
  LidarrConnection,
  LidarrOptions,
  LidarrProfile,
  LidarrRootFolder,
  LidarrSystemStatus,
} from "@/lib/lidarr/types";

export type LidarrArtistResource = {
  id: number;
  artistName: string;
  foreignArtistId: string;
  monitored: boolean;
};

export type LidarrAlbumStatistics = {
  trackFileCount: number;
  trackCount: number;
  totalTrackCount: number;
  sizeOnDisk: number;
  percentOfTracks?: number;
};

export type LidarrAlbumResource = {
  id: number;
  artistId: number;
  title: string;
  foreignAlbumId: string;
  monitored: boolean;
  releaseDate?: string | null;
  albumType?: string | null;
  secondaryTypes?: string[];
  statistics?: LidarrAlbumStatistics | null;
};

export type LidarrCommandResource = {
  id: number;
  name?: string;
  status?: string;
  message?: string | null;
};

export type LidarrRequestArtist = {
  id?: number;
  artistName?: string;
  foreignArtistId?: string;
  monitored?: boolean;
  rootFolderPath?: string;
  qualityProfileId?: number;
  metadataProfileId?: number;
  monitorNewItems?: string;
  addOptions?: {
    monitor?: string;
    albumsToMonitor?: string[];
    searchForMissingAlbums?: boolean;
    monitored?: boolean;
  };
  [key: string]: unknown;
};

export type LidarrRequestAlbum = {
  id?: number;
  artistId?: number;
  title?: string;
  foreignAlbumId?: string;
  monitored?: boolean;
  artist?: LidarrRequestArtist;
  addOptions?: {
    searchForNewAlbum?: boolean;
  };
  [key: string]: unknown;
};

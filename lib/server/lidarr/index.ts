export {
  normalizeLidarrUrl,
  validateLidarrUrl,
} from "@/lib/server/lidarr/http-client";

export { getLidarrLibrary } from "@/lib/server/lidarr/library";

export { getLidarrOptions, getLidarrStatus } from "@/lib/server/lidarr/options";

export { requestAlbumInLidarr } from "@/lib/server/lidarr/requests";

export { LidarrRequestError } from "@/lib/server/lidarr/errors";

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
} from "@/lib/server/lidarr/types";

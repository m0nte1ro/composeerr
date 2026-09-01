import { lidarrGet } from "@/lib/server/lidarr/http-client";
import type {
  LidarrConnection,
  LidarrOptions,
  LidarrProfile,
  LidarrRootFolder,
  LidarrSystemStatus,
} from "@/lib/server/lidarr/types";

export function getLidarrStatus(connection: LidarrConnection) {
  return lidarrGet<LidarrSystemStatus>(connection, "/api/v1/system/status");
}

export async function getLidarrOptions(
  connection: LidarrConnection,
): Promise<LidarrOptions> {
  const [rootFolders, qualityProfiles, metadataProfiles] = await Promise.all([
    lidarrGet<LidarrRootFolder[]>(connection, "/api/v1/rootfolder"),
    lidarrGet<LidarrProfile[]>(connection, "/api/v1/qualityprofile"),
    lidarrGet<LidarrProfile[]>(connection, "/api/v1/metadataprofile"),
  ]);

  return {
    rootFolders,
    qualityProfiles,
    metadataProfiles,
  };
}

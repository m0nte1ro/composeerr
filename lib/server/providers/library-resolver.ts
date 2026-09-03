import type { LibraryAlbum, LibraryAvailability } from "@/lib/library/types";
import {
  getLibraryAlbumIdentity,
  normalizeLibraryText,
} from "@/lib/library/match";
import { getLidarrLibrary } from "@/lib/server/lidarr";
import { getNavidromeAlbums } from "@/lib/server/providers/library-adapters";
import { getEnabledLibraryProviders } from "@/lib/server/providers/library-settings";

export async function resolveLibraryAvailability(): Promise<LibraryAvailability> {
  const providers = getEnabledLibraryProviders();
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        if (provider.key === "lidarr") {
          return { key: provider.key, value: await getLidarrLibrary(provider) } as const;
        }
        return { key: provider.key, value: await getNavidromeAlbums(provider) } as const;
      } catch {
        return { key: provider.key, value: null } as const;
      }
    }),
  );
  const albums = new Map<string, LibraryAlbum>();

  for (const result of results) {
    if (!result.value) continue;

    if (result.key === "lidarr" && "albums" in result.value) {
      for (const album of result.value.albums) {
        const mapped: LibraryAlbum = {
          title: album.title,
          artist: album.artist,
          year: album.year,
          musicBrainzReleaseGroupId: album.musicBrainzReleaseGroupId || null,
          sources: ["lidarr"],
          managedByLidarr: true,
          status: album.status,
          trackFileCount: album.trackFileCount,
          trackCount: album.trackCount,
        };
        albums.set(getLibraryAlbumIdentity(mapped), mapped);
      }
      continue;
    }

    if (result.key === "navidrome" && Array.isArray(result.value)) {
      for (const album of result.value) {
        const mapped: LibraryAlbum = {
          title: album.name,
          artist: album.artist,
          year: album.year,
          musicBrainzReleaseGroupId: album.musicBrainzId,
          sources: ["navidrome"],
          managedByLidarr: false,
          status: "available",
          trackFileCount: album.songCount,
          trackCount: album.songCount,
        };
        const key = getLibraryAlbumIdentity(mapped);
        const existing = albums.get(key) ?? [...albums.values()].find(
          (candidate) =>
            normalizeLibraryText(candidate.artist) ===
              normalizeLibraryText(mapped.artist) &&
            normalizeLibraryText(candidate.title) ===
              normalizeLibraryText(mapped.title),
        );
        if (existing) {
          existing.sources = [...new Set([...existing.sources, "navidrome" as const])];
          existing.status = "available";
          existing.trackFileCount = Math.max(existing.trackFileCount, mapped.trackFileCount);
          existing.trackCount = Math.max(existing.trackCount, mapped.trackCount);
        } else {
          albums.set(key, mapped);
        }
      }
    }
  }

  const values = [...albums.values()];
  return {
    albums: values,
    albumCount: values.filter((album) => album.status === "available").length,
    trackFileCount: values.reduce((count, album) => count + album.trackFileCount, 0),
    artistCount: new Set(
      values.map((album) => normalizeLibraryText(album.artist)),
    ).size,
  };
}
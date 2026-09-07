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

  // Merge Lidarr management data first, regardless of the Settings order.
  const orderedResults = [...results].sort(
    (left, right) => Number(right.key === "lidarr") - Number(left.key === "lidarr"),
  );
  const navidromeAlbums = new Map<string, LibraryAlbum>();

  for (const result of orderedResults) {
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
        navidromeAlbums.set(key, mapped);
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
          existing.trackFileCount = mapped.trackFileCount;
          existing.trackCount = mapped.trackCount;
        } else {
          albums.set(key, mapped);
        }
      }
    }
  }

  const values = [...albums.values()];
  // A successful Navidrome response (including an empty library) is the
  // playback inventory. Unmatched Lidarr names must not inflate its totals.
  const hasNavidromeInventory = results.some(
    (result) => result.key === "navidrome" && Array.isArray(result.value),
  );
  if (hasNavidromeInventory) {
    for (const album of values) {
      if (!album.sources.includes("navidrome")) {
        album.status = "tracked";
        album.trackFileCount = 0;
      }
    }
  }
  const inventory = (hasNavidromeInventory ? [...navidromeAlbums.values()] : values)
    .filter((album) => album.trackFileCount > 0);

  return {
    albums: values,
    albumCount: inventory.length,
    trackFileCount: inventory.reduce((count, album) => count + album.trackFileCount, 0),
    artistCount: new Set(
      inventory.map((album) => normalizeLibraryText(album.artist)),
    ).size,
  };
}
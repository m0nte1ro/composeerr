import type { LibraryProviderKey } from "@/lib/providers/types";

export type LibraryAlbum = {
  title: string;
  artist: string;
  year: number | null;
  musicBrainzReleaseGroupId: string | null;
  sources: LibraryProviderKey[];
  managedByLidarr: boolean;
  status: "tracked" | "partial" | "available";
  trackFileCount: number;
  trackCount: number;
};

export type LibraryAvailability = {
  albums: LibraryAlbum[];
  albumCount: number;
  trackFileCount: number;
  artistCount: number;
};

export const EMPTY_LIBRARY_AVAILABILITY: LibraryAvailability = {
  albums: [],
  albumCount: 0,
  trackFileCount: 0,
  artistCount: 0,
};
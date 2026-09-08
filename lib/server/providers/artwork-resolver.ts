import type {
  ArtworkResolution,
  MetadataAlbumResult,
  MetadataArtistResult,
} from "@/lib/metadata/types";
import {
  resolveCoverArtArchiveAlbum,
  resolveFanartAlbum,
  resolveFanartArtist,
} from "@/lib/server/providers/artwork-adapters";
import {
  getCurrentCoverArtArchiveConnection,
  getStoredFanartSettings,
} from "@/lib/server/providers/artwork-settings";
import { getProviderCache, setProviderCache } from "@/lib/server/providers/cache";
import { lookupLastFmArtist, resolveAudioDbArtwork } from "@/lib/server/providers/metadata-adapters";
import { getStoredMetadataProvider } from "@/lib/server/providers/metadata-settings";
import { getRuntimeConnectionKey } from "@/lib/server/providers/runtime-key";

const ARTWORK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type ArtworkEntity = MetadataArtistResult | MetadataAlbumResult;

type ArtworkAdapter = {
  id: string;
  resolve(): Promise<string | null>;
};

function cacheKey(entity: ArtworkEntity, adapters: ArtworkAdapter[]) {
  return `${entity.kind}:${entity.id}:${getRuntimeConnectionKey(adapters)}`;
}

async function resolveChain(entity: ArtworkEntity, adapters: ArtworkAdapter[]) {
  const key = cacheKey(entity, adapters);
  const cached = getProviderCache<ArtworkResolution>("artwork", key);

  if (cached) {
    return cached;
  }

  for (const adapter of adapters) {
    try {
      const url = await adapter.resolve();
      if (url) {
        const result = { url, provider: adapter.id };
        setProviderCache("artwork", key, result, ARTWORK_TTL_MS);
        return result;
      }
    } catch {
      continue;
    }
  }

  return { url: null, provider: null };
}

export function resolveAlbumArtwork(album: MetadataAlbumResult) {
  const adapters: ArtworkAdapter[] = [];
  const coverArt = getCurrentCoverArtArchiveConnection();
  if (coverArt) {
    adapters.push({
      id: "cover-art-archive",
      resolve: () => resolveCoverArtArchiveAlbum(coverArt, album.id),
      ...coverArt,
    });
  }
  const fanart = getStoredFanartSettings();
  if (fanart?.enabled && album.artistId) {
    adapters.push({
      id: "fanart",
      resolve: () => resolveFanartAlbum(fanart, album.artistId!, album.id),
      ...fanart,
    });
  }
  const audioDb = getStoredMetadataProvider("theaudiodb");
  if (audioDb?.enabled) {
    adapters.push({
      id: "theaudiodb",
      resolve: () => resolveAudioDbArtwork(audioDb, album),
      ...audioDb,
    });
  }
  return resolveChain(album, adapters);
}

export function resolveArtistArtwork(artist: MetadataArtistResult) {
  const adapters: ArtworkAdapter[] = [];
  const fanart = getStoredFanartSettings();
  if (fanart?.enabled) {
    adapters.push({
      id: "fanart",
      resolve: () => resolveFanartArtist(fanart, artist.id),
      ...fanart,
    });
  }
  const audioDb = getStoredMetadataProvider("theaudiodb");
  if (audioDb?.enabled) {
    adapters.push({
      id: "theaudiodb",
      resolve: () => resolveAudioDbArtwork(audioDb, artist),
      ...audioDb,
    });
  }
  return resolveChain(artist, adapters);
}
const artistNameRequests = new Map<string, Promise<ArtworkResolution>>();

export async function resolveArtistArtworkByName(name: string): Promise<ArtworkResolution> {
  const lastfm = getStoredMetadataProvider("lastfm");
  const fanart = getStoredFanartSettings();
  const audioDb = getStoredMetadataProvider("theaudiodb");
  const key = getRuntimeConnectionKey([name.toLowerCase(), lastfm, fanart, audioDb]);
  const cached = getProviderCache<ArtworkResolution>("artist-name-artwork", key);
  if (cached) return cached;
  const pending = artistNameRequests.get(key);
  if (pending) return pending;
  const request = (async () => {
    let result: ArtworkResolution = { url: null, provider: null };
    const artist: MetadataArtistResult = {
      kind: "artist", id: "", name, disambiguation: null, type: null,
      country: null, area: null, beginYear: null, score: 0,
    };
    if (lastfm) {
      try {
        const info = await lookupLastFmArtist(lastfm, name);
        if (info?.image) result = { url: info.image, provider: "lastfm" };
        if (info?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(info.id)) artist.id = info.id;
      } catch { /* Continue with independent artwork providers. */ }
    }
    if (!result.url && artist.id) result = await resolveArtistArtwork(artist);
    else if (!result.url && audioDb?.enabled) {
      try {
        const url = await resolveAudioDbArtwork(audioDb, artist);
        if (url) result = { url, provider: "theaudiodb" };
      } catch { /* Artwork is optional. */ }
    }
    setProviderCache("artist-name-artwork", key, result, result.url ? ARTWORK_TTL_MS : 60_000);
    return result;
  })();
  artistNameRequests.set(key, request);
  try { return await request; } finally { artistNameRequests.delete(key); }
}

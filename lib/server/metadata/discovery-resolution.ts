import type {
  DiscoverySearchResult,
  MetadataAlbumResult,
  MetadataArtistResult,
  MetadataSearchResult,
  MetadataSongResult,
} from "@/lib/metadata/types";
import { getMetadataProvider } from "@/lib/server/metadata";
import { getMusicBrainzConnection } from "@/lib/server/musicbrainz-settings";
import { getProviderCache, setProviderCache } from "@/lib/server/providers/cache";
import { getRuntimeConnectionKey } from "@/lib/server/providers/runtime-key";

import { MusicBrainzPublicProvider } from "./musicbrainz-public";
import { getIdentitySearchConnection } from "../search-settings";

const RESOLUTION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RESOLUTION_CACHE_VERSION = 1;

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesDiscovery(
  discovery: DiscoverySearchResult,
  candidate: MetadataSearchResult,
) {
  if (discovery.kind !== candidate.kind) return false;

  if (discovery.kind === "artist") {
    return normalize(discovery.name) === normalize((candidate as MetadataArtistResult).name);
  }

  const titledCandidate = candidate as MetadataAlbumResult | MetadataSongResult;
  return (
    normalize(discovery.title) === normalize(titledCandidate.title) &&
    normalize(discovery.artist) === normalize(titledCandidate.artist)
  );
}

function selectUnambiguousCandidate(
  discovery: DiscoverySearchResult,
  candidates: MetadataSearchResult[],
) {
  if (candidates.length === 1) return candidates[0];

  if (discovery.kind === "song") {
    const standardRecordings = (candidates as MetadataSongResult[]).filter(
      (candidate) => !candidate.disambiguation,
    );
    return standardRecordings.length === 1 ? standardRecordings[0] : null;
  }

  return null;
}

async function canonicalById(
  discovery: DiscoverySearchResult,
  id: string,
): Promise<MetadataSearchResult | null> {
  const provider = getMetadataProvider();

  try {
    const candidate = discovery.kind === "artist"
      ? (await provider.getArtist(id)).artist
      : discovery.kind === "album"
        ? (await provider.getAlbum(id)).album
        : (await provider.getSong(id)).song;

    return matchesDiscovery(discovery, candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export async function resolveDiscoveryIdentity(
  discovery: DiscoverySearchResult,
): Promise<MetadataSearchResult | null> {
  const connectionKey = getRuntimeConnectionKey([getMusicBrainzConnection(), getIdentitySearchConnection()]);
  const cacheKey = `v${RESOLUTION_CACHE_VERSION}:${connectionKey}:${getRuntimeConnectionKey(discovery)}`;
  const cached = getProviderCache<MetadataSearchResult>(
    "discovery-identity",
    cacheKey,
  );
  if (cached) return cached;

  let canonical = discovery.musicBrainzId
    ? await canonicalById(discovery, discovery.musicBrainzId)
    : null;

  if (!canonical) {
    const candidates = await new MusicBrainzPublicProvider(getIdentitySearchConnection()).findCanonicalMatches(discovery);
    const exact = candidates.filter((candidate) =>
      matchesDiscovery(discovery, candidate),
    );
    const unique = [...new Map(exact.map((candidate) => [candidate.id, candidate])).values()];
    canonical = selectUnambiguousCandidate(discovery, unique);
  }

  if (canonical) {
    setProviderCache(
      "discovery-identity",
      cacheKey,
      canonical,
      RESOLUTION_CACHE_TTL_MS,
    );
  }

  return canonical;
}
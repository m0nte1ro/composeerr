import type { DiscoverySearchResult, MetadataSearchResult } from "@/lib/metadata/types";
import { MusicBrainzPublicProvider, MUSICBRAINZ_ID_PATTERN } from "./musicbrainz-public";
import { getMusicBrainzConnection } from "@/lib/server/musicbrainz-settings";
import { getProviderCache, setProviderCache } from "@/lib/server/providers/cache";
import { getRuntimeConnectionKey } from "@/lib/server/providers/runtime-key";

export async function resolveDiscoveryIdentity(
  discovery: DiscoverySearchResult,
): Promise<MetadataSearchResult | null> {
  const id = discovery.musicBrainzId?.toLowerCase();
  if (!id || !MUSICBRAINZ_ID_PATTERN.test(id)) return null;

  const connection = getMusicBrainzConnection();
  const prefix = `v2:${getRuntimeConnectionKey(connection)}:${discovery.kind}:`;
  const cacheKey = `${prefix}${id}`;
  const cached = getProviderCache<{ canonical: MetadataSearchResult | null }>(
    "discovery-identity", cacheKey,
  );
  if (cached) return cached.canonical;

  // An authoritative ID wins over differences in spelling between providers.
  // Transient/authentication errors propagate and are never cached as missing IDs.
  const canonical = await new MusicBrainzPublicProvider(connection).resolveIdentity(discovery.kind, id);
  const ttl = canonical ? 24 * 60 * 60 * 1000 : 5 * 60 * 1000;
  setProviderCache("discovery-identity", cacheKey, { canonical }, ttl);
  if (canonical && canonical.id !== id) {
    setProviderCache("discovery-identity", `${prefix}${canonical.id}`, { canonical }, ttl);
  }
  return canonical;
}

import type {
  MetadataAlbumResult,
  MetadataArtistResult,
  MetadataEnrichment,
} from "@/lib/metadata/types";
import { getProviderCache, setProviderCache } from "@/lib/server/providers/cache";
import { enrichMetadataProvider } from "@/lib/server/providers/metadata-adapters";
import { getEnabledMetadataProviders } from "@/lib/server/providers/metadata-settings";
import { getRuntimeConnectionKey } from "@/lib/server/providers/runtime-key";

const ENRICHMENT_TTL_MS = 24 * 60 * 60 * 1000;
const ENRICHMENT_CACHE_VERSION = 3;
const MAX_DESCRIPTION_WORDS = 50;

function limitWords(value: string | null) {
  if (!value) return null;

  const words = value.trim().split(/\s+/);
  const description = words.slice(0, MAX_DESCRIPTION_WORDS).join(" ");
  return words.length > MAX_DESCRIPTION_WORDS ? `${description}...` : description;
}

export async function resolveMetadataEnrichment(
  entity: MetadataArtistResult | MetadataAlbumResult,
): Promise<MetadataEnrichment | null> {
  const providers = getEnabledMetadataProviders();
  const cacheKey = `v${ENRICHMENT_CACHE_VERSION}:${entity.kind}:${entity.id}:${getRuntimeConnectionKey(providers)}`;
  const cached = getProviderCache<MetadataEnrichment>("metadata", cacheKey);
  if (cached) return cached;

  const result: MetadataEnrichment = {
    description: null,
    tags: [],
    listeners: null,
    playCount: null,
    providerNames: [],
  };

  for (const provider of providers) {
    try {
      const enrichment = await enrichMetadataProvider(provider, entity);
      if (!enrichment) continue;

      const contributesDescription = !result.description && enrichment.description;
      const contributesListeners = result.listeners === null && enrichment.listeners !== null;
      const contributesPlayCount = result.playCount === null && enrichment.playCount !== null;

      result.description ??= limitWords(enrichment.description);
      result.listeners ??= enrichment.listeners;
      result.playCount ??= enrichment.playCount;
      if (contributesDescription || contributesListeners || contributesPlayCount) {
        result.providerNames.push(...enrichment.providerNames);
      }
    } catch {
      continue;
    }
  }

  if (
    !result.description &&
    result.listeners === null &&
    result.playCount === null
  ) {
    return null;
  }

  result.providerNames = [...new Set(result.providerNames)];
  setProviderCache("metadata", cacheKey, result, ENRICHMENT_TTL_MS);
  return result;
}
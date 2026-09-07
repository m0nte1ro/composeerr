import type {
  DiscoverySearchResult,
  MetadataSearchResult,
  MetadataSearchType,
} from "@/lib/metadata/types";
import { getMetadataProvider } from "@/lib/server/metadata";
import {
  searchMetadataDiscoveryProvider,
  supportsMetadataDiscoveryProvider,
} from "@/lib/server/providers/metadata-adapters";
import { getEnabledMetadataProviders } from "@/lib/server/providers/metadata-settings";

function fromCanonical(result: MetadataSearchResult): DiscoverySearchResult {
  const shared = {
    source: "musicbrainz-public" as const,
    canonical: true,
    sourceId: result.id,
    musicBrainzId: result.id,
    artworkUrl: null,
    listeners: null,
  };

  if (result.kind === "artist") {
    return { kind: "artist", name: result.name, ...shared };
  }

  return {
    kind: result.kind,
    title: result.title,
    artist: result.artist,
    ...shared,
  };
}

async function searchMusicBrainz(type: MetadataSearchType, query: string) {
  const provider = getMetadataProvider();
  const results = type === "artist"
    ? await provider.searchArtists(query)
    : type === "album"
      ? await provider.searchAlbums(query)
      : await provider.searchSongs(query);

  return {
    provider: provider.id,
    results: results.map(fromCanonical),
  };
}

export async function searchDiscovery(type: MetadataSearchType, query: string) {
  const connection = getEnabledMetadataProviders().find((provider) =>
    supportsMetadataDiscoveryProvider(provider.key),
  );

  if (connection) {
    try {
      return {
        provider: connection.key,
        results: await searchMetadataDiscoveryProvider(connection, type, query),
      };
    } catch {
      // Discovery provider failures fall back to canonical search.
    }
  }

  return searchMusicBrainz(type, query);
}
import type {
  DiscoverySearchResult,
  MetadataSearchResult,
  MetadataSearchType,
} from "@/lib/metadata/types";
import { MusicBrainzPublicProvider } from "./musicbrainz-public";
import { getIdentitySearchConnection, getSearchEngine } from "../search-settings";
import { getStoredMetadataProvider } from "../providers/metadata-settings";
import { searchMetadataDiscoveryProvider } from "../providers/metadata-adapters";

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
  const provider = new MusicBrainzPublicProvider(getIdentitySearchConnection());
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
  if (getSearchEngine() === "lastfm") {
    const connection = getStoredMetadataProvider("lastfm");
    if (!connection) throw new Error("Search provider is not configured.");
    return { provider: "lastfm", results: await searchMetadataDiscoveryProvider(connection, type, query) };
  }
  return searchMusicBrainz(type, query);
}

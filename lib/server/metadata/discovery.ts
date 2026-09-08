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

const MUSICBRAINZ_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function searchDiscovery(type: MetadataSearchType, query: string) {
  let discovery: { provider: string; results: DiscoverySearchResult[] };
  if (getSearchEngine() === "lastfm") {
    const connection = getStoredMetadataProvider("lastfm");
    if (!connection) throw new Error("Search provider is not configured.");
    discovery = {
      provider: "lastfm",
      results: await searchMetadataDiscoveryProvider(connection, type, query),
    };
  } else {
    discovery = await searchMusicBrainz(type, query);
  }

  // Every search engine must supply an ID before a result can reach the UI.
  return {
    ...discovery,
    results: discovery.results.filter((result) =>
      MUSICBRAINZ_ID_PATTERN.test(result.musicBrainzId ?? ""),
    ),
  };
}

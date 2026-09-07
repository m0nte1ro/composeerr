import type {
  DiscoverySearchResult,
  MetadataAlbumDetails,
  MetadataArtistDetails,
  MetadataSearchResult,
  MetadataSearchType,
  MetadataSongDetails,
} from "@/lib/metadata/types";

type MetadataDetailsByType = {
  song: MetadataSongDetails;
  album: MetadataAlbumDetails;
  artist: MetadataArtistDetails;
};

async function parseResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error(fallbackMessage);
  }

  const data = payload as {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? fallbackMessage);
  }

  return payload as T;
}

export async function searchMetadata(type: MetadataSearchType, query: string) {
  const params = new URLSearchParams({
    type,
    q: query,
  });

  const response = await fetch(`/api/metadata/search?${params}`, {
    cache: "no-store",
  });

  const data = await parseResponse<{ results?: DiscoverySearchResult[] }>(
    response,
    "Search failed.",
  );

  return data.results ?? [];
}

export async function resolveDiscoveryResult(
  discovery: DiscoverySearchResult,
) {
  const response = await fetch("/api/metadata/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(discovery),
  });
  const data = await parseResponse<{ canonical: MetadataSearchResult }>(
    response,
    "Could not match this result to MusicBrainz.",
  );

  return data.canonical;
}

export async function loadMetadataDetails<TType extends MetadataSearchType>(
  type: TType,
  id: string,
): Promise<MetadataDetailsByType[TType]> {
  const params = new URLSearchParams({
    type,
    id,
  });

  const response = await fetch(`/api/metadata/details?${params}`, {
    cache: "no-store",
  });

  const data = await parseResponse<{ details: MetadataDetailsByType[TType] }>(
    response,
    "Could not load details.",
  );

  return data.details;
}

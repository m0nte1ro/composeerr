import type {
  ArtworkResolution,
  MetadataAlbumResult,
  MetadataArtistResult,
  MetadataEnrichment,
} from "@/lib/metadata/types";

type EnrichmentEntity = MetadataArtistResult | MetadataAlbumResult;

function entityParams(entity: EnrichmentEntity) {
  const params = new URLSearchParams({ type: entity.kind, id: entity.id });

  if (entity.kind === "artist") {
    params.set("name", entity.name);
  } else {
    params.set("title", entity.title);
    params.set("artist", entity.artist);
    if (entity.artistId) params.set("artistId", entity.artistId);
  }

  return params;
}

export async function loadArtwork(entity: EnrichmentEntity) {
  const response = await fetch(`/api/artwork/resolve?${entityParams(entity)}`);
  const data = (await response.json()) as {
    ok?: boolean;
    artwork?: ArtworkResolution;
  };

  if (!response.ok || !data.ok || !data.artwork) {
    return { url: null, provider: null } satisfies ArtworkResolution;
  }

  return data.artwork;
}

export async function loadEnrichment(entity: EnrichmentEntity) {
  const response = await fetch(`/api/metadata/enrichment?${entityParams(entity)}`);
  const data = (await response.json()) as {
    ok?: boolean;
    enrichment?: MetadataEnrichment | null;
  };

  return response.ok && data.ok ? data.enrichment ?? null : null;
}
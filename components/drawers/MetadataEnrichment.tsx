"use client";

import { useProviderResource } from "@/components/drawers/DrawerProviderData";
import { loadEnrichment } from "@/lib/client/enrichment";
import type {
    MetadataAlbumResult,
    MetadataArtistResult,
} from "@/lib/metadata/types";

export function MetadataEnrichment({
    entity,
}: {
    entity: MetadataArtistResult | MetadataAlbumResult;
}) {
    const resource = useProviderResource(
        `metadata:${entity.kind}:${entity.id}`,
        () => loadEnrichment(entity),
    );

    if (resource.loading || !resource.value) {
        return null;
    }

    const description = resource.value.description;

    if (!description) {
        return null;
    }

    return (
        <section className="drawer-enrichment" aria-label="Additional metadata">
            <p className="enrichment-description">{description}</p>
        </section>
    );
}
"use client";

import Image from "next/image";

import { useState } from "react";

import { useProviderResource } from "@/components/drawers/DrawerProviderData";
import { ArtworkPlaceholder } from "@/components/music/ArtworkPlaceholder";
import { loadArtwork } from "@/lib/client/enrichment";
import type {
    ArtworkResolution,
    MetadataAlbumResult,
    MetadataArtistResult,
} from "@/lib/metadata/types";

type ResolvedArtworkProps = {
    entity: MetadataAlbumResult | MetadataArtistResult;
    label: string;
    shape?: "square" | "circle";
    className: string;
    resourceKey?: string;
    loader?: () => Promise<ArtworkResolution>;
};

export function ResolvedArtwork({
    entity,
    label,
    shape = "square",
    className,
    resourceKey,
    loader,
}: ResolvedArtworkProps) {
    const resource = useProviderResource(
        resourceKey ?? `artwork:${entity.kind}:${entity.id}`,
        loader ?? (() => loadArtwork(entity)),
    );
    const [imageState, setImageState] = useState<{
        url: string | null;
        status: "loading" | "ready" | "failed";
    }>({ url: null, status: "loading" });
    const artworkUrl = resource.value?.url ?? null;
    const imageReady = imageState.url === artworkUrl && imageState.status === "ready";
    const imageFailed = imageState.url === artworkUrl && imageState.status === "failed";

    if ((!resource.loading && !resource.value?.url) || imageFailed) {
        return <ArtworkPlaceholder label={label} shape={shape} className={className} />;
    }

    return (
        <div
            className={[
                className,
                shape === "circle" ? "artwork-circle" : "",
                "resolved-artwork",
            ]
                .filter(Boolean)
                .join(" ")}
            style={{ position: "relative", overflow: "hidden" }}
        >
            {!imageReady ? <span className="artwork-loader" aria-label="Loading artwork" /> : null}
            {artworkUrl ? (
                <Image
                    src={artworkUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 700px) 96px, 160px"
                    className={imageReady ? "artwork-image artwork-image-ready" : "artwork-image"}
                    onLoad={() => setImageState({ url: artworkUrl, status: "ready" })}
                    onError={() => setImageState({ url: artworkUrl, status: "failed" })}
                />
            ) : null}
        </div>
    );
}
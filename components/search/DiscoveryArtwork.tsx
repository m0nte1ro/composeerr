"use client";

import Image from "next/image";
import { useState } from "react";

import { AlbumArtwork } from "@/components/music/AlbumArtwork";
import { ArtistArtwork } from "@/components/music/ArtistArtwork";
import { ArtworkPlaceholder } from "@/components/music/ArtworkPlaceholder";
import type {
    DiscoveryAlbumResult,
    DiscoveryArtistResult,
} from "@/lib/metadata/types";

type DiscoveryArtworkProps = {
    result: DiscoveryAlbumResult | DiscoveryArtistResult;
    className: string;
};

export function DiscoveryArtwork({ result, className }: DiscoveryArtworkProps) {
    const [failed, setFailed] = useState(false);
    const label = result.kind === "artist" ? result.name : result.title;
    const shape = result.kind === "artist" ? "circle" : "square";

    if (result.artworkUrl && !failed) {
        return (
            <div
                className={`${className} resolved-artwork`}
                style={{ position: "relative", overflow: "hidden" }}
            >
                <Image
                    src={result.artworkUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="48px"
                    className="artwork-image artwork-image-ready"
                    onError={() => setFailed(true)}
                />
            </div>
        );
    }

    if (result.canonical && result.musicBrainzId) {
        return result.kind === "artist" ? (
            <ArtistArtwork
                artist={{
                    kind: "artist",
                    id: result.musicBrainzId,
                    name: result.name,
                    disambiguation: null,
                    type: null,
                    country: null,
                    area: null,
                    beginYear: null,
                    score: 0,
                }}
                className={className}
            />
        ) : (
            <AlbumArtwork
                album={{
                    kind: "album",
                    id: result.musicBrainzId,
                    title: result.title,
                    artist: result.artist,
                    artistId: null,
                    year: null,
                    primaryType: null,
                    secondaryTypes: [],
                    disambiguation: null,
                    score: 0,
                }}
                className={className}
            />
        );
    }

    return (
        <ArtworkPlaceholder
            label={label}
            shape={shape}
            className={className}
        />
    );
}
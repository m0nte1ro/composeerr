"use client";

import { ResolvedArtwork } from "@/components/music/ResolvedArtwork";
import { loadArtistArtworkByName } from "@/lib/client/enrichment";

export function SongArtistArtwork({ name }: { name: string }) {
  return <ResolvedArtwork
    entity={{ kind: "artist", id: "", name, disambiguation: null, type: null,
      country: null, area: null, beginYear: null, score: 0 }}
    label={name}
    shape="circle"
    className="artist-result-artwork metadata-artist-artwork"
    resourceKey={`artist-name-artwork:${name.toLowerCase()}`}
    loader={() => loadArtistArtworkByName(name)}
  />;
}

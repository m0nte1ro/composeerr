import { useState } from "react";

import { AlbumArtwork } from "@/components/music/AlbumArtwork";
import { AvailabilityBadge } from "@/components/music/AvailabilityBadge";
import { ArtistArtwork } from "@/components/music/ArtistArtwork";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetadataEnrichment } from "@/components/drawers/MetadataEnrichment";
import { chronologicalAlbums } from "@/lib/metadata/album-order";
import { albumTypeLabel, artistSummary } from "@/lib/metadata/format";
import type { ArtistSection } from "@/hooks/useMediaDrawer";
import type {
  MetadataAlbumResult,
  MetadataArtistDetails,
} from "@/lib/metadata/types";

type ArtistDrawerProps = {
  details: MetadataArtistDetails;
  artistSection: ArtistSection;
  active: boolean;
  setArtistSection: (section: ArtistSection) => void;
  isAlbumAvailable: (album: MetadataAlbumResult) => boolean;
  onOpenAlbum: (album: MetadataAlbumResult) => void;
};

const TABS: Array<{
  id: ArtistSection;
  label: string;
}> = [
    {
      id: "albums",
      label: "Albums",
    },
    {
      id: "compilations",
      label: "Compilations",
    },
    {
      id: "live",
      label: "Live",
    },
    {
      id: "singles",
      label: "Singles & EPs",
    },
  ];

function albumsForSection(
  albums: MetadataAlbumResult[],
  section: ArtistSection,
) {
  return albums.filter((album) => {
    const secondary = album.secondaryTypes.map((value) => value.toLowerCase());
    const primary = album.primaryType?.toLowerCase() ?? "";

    if (section === "compilations") return secondary.includes("compilation");
    if (section === "live") return secondary.includes("live");
    if (section === "singles") return primary === "single" || primary === "ep";

    return (
      primary === "album" &&
      !secondary.includes("compilation") &&
      !secondary.includes("live")
    );
  });
}

export function ArtistDrawer({
  details,
  artistSection,
  active,
  setArtistSection,
  isAlbumAvailable,
  onOpenAlbum,
}: ArtistDrawerProps) {
  const [visitedSections, setVisitedSections] = useState<Set<ArtistSection>>(
    () => new Set([artistSection]),
  );

  function selectSection(section: ArtistSection) {
    setVisitedSections((current) => new Set(current).add(section));
    setArtistSection(section);
  }

  return (
    <div className="drawer-content" hidden={!active}>
      <ArtistArtwork
        artist={details.artist}
        className="artist-hero metadata-artist-hero"
      />

      <div className="media-kicker">Artist</div>

      <h2 className="drawer-title">{details.artist.name}</h2>
      <div className="drawer-artist">
        {artistSummary([
          details.artist.type,
          details.artist.area,
          details.artist.country,
          details.artist.disambiguation,
        ])}
      </div>

      <div className="artist-metadata">
        {details.artist.beginYear && <span>Since {details.artist.beginYear}</span>}
        <span>{details.discography.length} release groups</span>
      </div>

      <MetadataEnrichment entity={details.artist} />

      <section className="drawer-section">
        <div className="drawer-section-heading">
          <div>
            <h3>Discography</h3>
            <p>Albums are ordered oldest first. Use the tabs to separate
              albums, compilations and live releases.</p>
          </div>
        </div>

        <div className="artist-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={
                artistSection === tab.id ? "artist-tab artist-tab-active" : "artist-tab"
              }
              onClick={() => selectSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {TABS.map((tab) => {
          if (!visitedSections.has(tab.id)) return null;

          const albums = albumsForSection(details.discography, tab.id).sort(chronologicalAlbums);
          return (
            <div key={tab.id} hidden={artistSection !== tab.id}>
              {albums.length === 0 ? (
                <EmptyState className="drawer-empty" title="Nothing in this category." message="" />
              ) : (
                <div className="appears-on-list">
                  {albums.map((album) => (
                    <button
                      className="appears-on-item"
                      type="button"
                      key={album.id}
                      onClick={() => onOpenAlbum(album)}
                    >
                      <AlbumArtwork album={album} className="appears-on-artwork metadata-result-artwork" />

                      <div className="appears-on-copy">
                        <strong>{album.title}</strong>

                        <span>
                          {album.year ?? "Unknown"}
                          {" · "}
                          {albumTypeLabel(album)}
                        </span>
                      </div>

                      <AvailabilityBadge status={isAlbumAvailable(album) ? "available" : "none"} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

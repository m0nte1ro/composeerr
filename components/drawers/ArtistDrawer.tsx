import { AlbumArtwork } from "@/components/music/AlbumArtwork";
import { AvailabilityBadge } from "@/components/music/AvailabilityBadge";
import { ArtistArtwork } from "@/components/music/ArtistArtwork";
import { EmptyState } from "@/components/ui/EmptyState";
import { albumTypeLabel, artistSummary } from "@/lib/metadata/format";
import type { ArtistSection } from "@/hooks/useMediaDrawer";
import type {
  MetadataAlbumResult,
  MetadataArtistDetails,
} from "@/lib/metadata/types";

type ArtistDrawerProps = {
  details: MetadataArtistDetails;
  artistSection: ArtistSection;
  filteredAlbums: MetadataAlbumResult[];
  setArtistSection: (section: ArtistSection) => void;
  isAlbumManaged: (album: MetadataAlbumResult) => boolean;
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

export function ArtistDrawer({
  details,
  artistSection,
  filteredAlbums,
  setArtistSection,
  isAlbumManaged,
  onOpenAlbum,
}: ArtistDrawerProps) {
  return (
    <div className="drawer-content">
      <ArtistArtwork
        name={details.artist.name}
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

      <section className="drawer-section">
        <div className="drawer-section-heading">
          <div>
            <h3>Discography</h3>
            <p>Choose an album to inspect it.</p>
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
              onClick={() => setArtistSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredAlbums.length === 0 ? (
          <EmptyState className="drawer-empty" title="Nothing in this category." message="" />
        ) : (
          <div className="appears-on-list">
            {filteredAlbums.map((album) => (
              <button
                className="appears-on-item"
                type="button"
                key={album.id}
                onClick={() => onOpenAlbum(album)}
              >
                <AlbumArtwork title={album.title} className="appears-on-artwork metadata-result-artwork" />

                <div className="appears-on-copy">
                  <strong>{album.title}</strong>

                  <span>
                    {album.year ?? "Unknown"}
                    {" · "}
                    {albumTypeLabel(album)}
                  </span>
                </div>

                <AvailabilityBadge status={isAlbumManaged(album) ? "available" : "none"} />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

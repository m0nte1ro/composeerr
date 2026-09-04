import { ArtistDrawer } from "@/components/drawers/ArtistDrawer";
import { AlbumDrawer } from "@/components/drawers/AlbumDrawer";
import { DrawerHeader } from "@/components/drawers/DrawerHeader";
import { DrawerShell } from "@/components/drawers/DrawerShell";
import { SongDrawer } from "@/components/drawers/SongDrawer";
import { DrawerProviderData } from "@/components/drawers/DrawerProviderData";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ArtistSection } from "@/hooks/useMediaDrawer";
import type {
  DiscoverySearchResult,
  MetadataAlbumDetails,
  MetadataAlbumResult,
  MetadataArtistDetails,
  MetadataSongDetails,
} from "@/lib/metadata/types";

type MediaDrawerProps = {
  open: boolean;
  sessionId: number;
  mode: "song" | "album" | "artist" | null;
  loading: boolean;
  error: string | null;
  pendingDiscovery: DiscoverySearchResult | null;
  selectedSong: MetadataSongDetails | null;
  selectedAlbum: MetadataAlbumDetails | null;
  selectedArtist: MetadataArtistDetails | null;
  artistSection: ArtistSection;
  requestError: string | null;
  requestingAlbumId: string | null;
  setArtistSection: (section: ArtistSection) => void;
  isAlbumManaged: (album: MetadataAlbumResult) => boolean;
  isAlbumRequested: (albumId: string) => boolean;
  getLibraryStatusLabel: (album: MetadataAlbumResult) => string | null;
  onClose: () => void;
  onBack: () => void;
  onOpenAlbum: (album: MetadataAlbumResult) => void;
  onRequestAlbum: (album: MetadataAlbumResult) => void;
};

export function MediaDrawer({
  open,
  sessionId,
  mode,
  loading,
  error,
  pendingDiscovery,
  selectedSong,
  selectedAlbum,
  selectedArtist,
  artistSection,
  requestError,
  requestingAlbumId,
  setArtistSection,
  isAlbumManaged,
  isAlbumRequested,
  getLibraryStatusLabel,
  onClose,
  onBack,
  onOpenAlbum,
  onRequestAlbum,
}: MediaDrawerProps) {
  const showBackArrow = mode === "album" && (Boolean(selectedSong) || Boolean(selectedArtist));

  return (
    <DrawerShell open={open} onClose={onClose}>
      <DrawerProviderData key={sessionId}>
        <DrawerHeader
          mode={mode}
          showBackArrow={showBackArrow}
          onBack={onBack}
          onClose={onClose}
        />

        {loading && (
          <div className="drawer-content">
            {pendingDiscovery ? (
              <>
                <div className="media-kicker">{pendingDiscovery.kind}</div>
                <h2 className="drawer-title">
                  {pendingDiscovery.kind === "artist" ? pendingDiscovery.name : pendingDiscovery.title}
                </h2>
                {pendingDiscovery.kind !== "artist" ? (
                  <div className="drawer-artist">{pendingDiscovery.artist}</div>
                ) : null}
                <EmptyState
                  className="drawer-empty"
                  style={{ marginTop: 24 }}
                  title="Matching with MusicBrainz..."
                  message=""
                />
              </>
            ) : (
              <EmptyState className="drawer-empty" title="Loading from MusicBrainz..." message="" />
            )}
          </div>
        )}

        {!loading && error && (
          <div className="drawer-content">
            <EmptyState className="drawer-empty" title={error} message="" />
          </div>
        )}

        {!loading && !error && mode === "song" && selectedSong && (
          <SongDrawer
            details={selectedSong}
            isAlbumManaged={isAlbumManaged}
            isAlbumRequested={isAlbumRequested}
            onOpenAlbum={onOpenAlbum}
          />
        )}

        {selectedArtist && (
          <ArtistDrawer
            details={selectedArtist}
            artistSection={artistSection}
            active={!loading && !error && mode === "artist"}
            setArtistSection={setArtistSection}
            isAlbumManaged={isAlbumManaged}
            onOpenAlbum={onOpenAlbum}
          />
        )}

        {!loading && !error && mode === "album" && selectedAlbum && (
          <AlbumDrawer
            details={selectedAlbum}
            selectedSongRecordingId={selectedSong?.song.id ?? null}
            requestError={requestError}
            requestingAlbumId={requestingAlbumId}
            isAlbumManaged={isAlbumManaged}
            isAlbumRequested={isAlbumRequested}
            getLibraryStatusLabel={getLibraryStatusLabel}
            onRequestAlbum={onRequestAlbum}
          />
        )}
      </DrawerProviderData>
    </DrawerShell>
  );
}

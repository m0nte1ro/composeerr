import { AlbumResultRow } from "@/components/search/AlbumResultRow";
import { ArtistResultRow } from "@/components/search/ArtistResultRow";
import { SongResultRow } from "@/components/search/SongResultRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type {
  MetadataAlbumResult,
  MetadataArtistResult,
  MetadataSearchType,
  MetadataSongResult,
} from "@/lib/metadata/types";

type SearchResultsProps = {
  submittedQuery: string;
  status: "idle" | "loading" | "ready" | "error";
  errorMessage?: string;
  searchType: MetadataSearchType;
  songResults: MetadataSongResult[];
  albumResults: MetadataAlbumResult[];
  artistResults: MetadataArtistResult[];
  isAlbumRequested: (albumId: string) => boolean;
  isAlbumManaged: (album: MetadataAlbumResult) => boolean;
  getLibraryStatusLabel: (album: MetadataAlbumResult) => string | null;
  onOpenSong: (song: MetadataSongResult) => void;
  onOpenAlbum: (album: MetadataAlbumResult) => void;
  onOpenArtist: (artist: MetadataArtistResult) => void;
};

export function SearchResults({
  submittedQuery,
  status,
  errorMessage,
  searchType,
  songResults,
  albumResults,
  artistResults,
  isAlbumRequested,
  isAlbumManaged,
  getLibraryStatusLabel,
  onOpenSong,
  onOpenAlbum,
  onOpenArtist,
}: SearchResultsProps) {
  if (!submittedQuery) {
    return null;
  }

  const currentResultCount =
    searchType === "song"
      ? songResults.length
      : searchType === "album"
        ? albumResults.length
        : artistResults.length;

  return (
    <section className="content-section search-results-section">
      <div className="section-header">
        <div>
          <h2>Search results</h2>
          <p>Real MusicBrainz results matching “{submittedQuery}”</p>
        </div>

        {status === "ready" && (
          <span className="result-count">
            {currentResultCount} result{currentResultCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {status === "loading" && (
        <LoadingState
          title="Searching MusicBrainz..."
          message="Public API mode respects the global rate limit."
        />
      )}

      {status === "error" && (
        <ErrorState title="Search failed." message={errorMessage ?? "Search failed."} />
      )}

      {status === "ready" && currentResultCount === 0 && (
        <EmptyState title="Nothing found." message="Try another search." />
      )}

      {status === "ready" && searchType === "song" && (
        <div className="song-results">
          {songResults.map((song) => (
            <SongResultRow key={song.id} song={song} onOpen={onOpenSong} />
          ))}
        </div>
      )}

      {status === "ready" && searchType === "album" && (
        <div className="song-results">
          {albumResults.map((album) => (
            <AlbumResultRow
              key={album.id}
              album={album}
              requested={isAlbumRequested(album.id)}
              available={isAlbumManaged(album)}
              statusLabel={getLibraryStatusLabel(album)}
              onOpen={onOpenAlbum}
            />
          ))}
        </div>
      )}

      {status === "ready" && searchType === "artist" && (
        <div className="song-results">
          {artistResults.map((artist) => (
            <ArtistResultRow key={artist.id} artist={artist} onOpen={onOpenArtist} />
          ))}
        </div>
      )}
    </section>
  );
}

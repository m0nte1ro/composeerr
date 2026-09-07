import { AlbumResultRow } from "@/components/search/AlbumResultRow";
import { ArtistResultRow } from "@/components/search/ArtistResultRow";
import { SongResultRow } from "@/components/search/SongResultRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type {
  DiscoveryAlbumResult,
  DiscoveryArtistResult,
  DiscoverySongResult,
  MetadataSearchType,
} from "@/lib/metadata/types";

type SearchResultsProps = {
  submittedQuery: string;
  status: "idle" | "loading" | "ready" | "error";
  errorMessage?: string;
  searchType: MetadataSearchType;
  songResults: DiscoverySongResult[];
  albumResults: DiscoveryAlbumResult[];
  artistResults: DiscoveryArtistResult[];
  isAlbumRequested: (albumId: string) => boolean;
  onOpenSong: (song: DiscoverySongResult) => void;
  onOpenAlbum: (album: DiscoveryAlbumResult) => void;
  onOpenArtist: (artist: DiscoveryArtistResult) => void;
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
          <p>Discovery results matching “{submittedQuery}”</p>
        </div>

        {status === "ready" && (
          <span className="result-count">
            {currentResultCount} result{currentResultCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {status === "loading" && (
        <LoadingState
          title="Searching music..."
          message=""
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
          {songResults.map((song, index) => (
            <SongResultRow key={song.sourceId ?? song.musicBrainzId ?? `${song.title}:${song.artist}:${index}`} song={song} onOpen={onOpenSong} />
          ))}
        </div>
      )}

      {status === "ready" && searchType === "album" && (
        <div className="song-results">
          {albumResults.map((album, index) => (
            <AlbumResultRow
              key={album.sourceId ?? album.musicBrainzId ?? `${album.title}:${album.artist}:${index}`}
              album={album}
              requested={Boolean(album.canonical && album.musicBrainzId && isAlbumRequested(album.musicBrainzId))}
              available={false}
              statusLabel={null}
              onOpen={onOpenAlbum}
            />
          ))}
        </div>
      )}

      {status === "ready" && searchType === "artist" && (
        <div className="song-results">
          {artistResults.map((artist, index) => (
            <ArtistResultRow key={artist.sourceId ?? artist.musicBrainzId ?? `${artist.name}:${index}`} artist={artist} onOpen={onOpenArtist} />
          ))}
        </div>
      )}
    </section>
  );
}

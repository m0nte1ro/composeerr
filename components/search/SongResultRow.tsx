import { SongArtistArtwork } from "./SongArtistArtwork";
import type { DiscoverySongResult } from "@/lib/metadata/types";

type SongResultRowProps = {
  song: DiscoverySongResult;
  onOpen: (song: DiscoverySongResult) => void;
};

export function SongResultRow({ song, onOpen }: SongResultRowProps) {
  return (
    <button className="song-result" type="button" onClick={() => onOpen(song)}>
      <SongArtistArtwork name={song.artist} />

      <div className="song-result-copy">
        <strong>{song.title}</strong>
        <span>
          {song.artist}
          {song.listeners !== null ? ` · ${song.listeners.toLocaleString()} listeners` : ""}
        </span>
      </div>

      <span className="result-chevron">›</span>
    </button>
  );
}

import type { MetadataSongResult } from "@/lib/metadata/types";
import { formatDuration } from "@/lib/metadata/format";

type SongResultRowProps = {
  song: MetadataSongResult;
  onOpen: (song: MetadataSongResult) => void;
};

export function SongResultRow({ song, onOpen }: SongResultRowProps) {
  return (
    <button className="song-result" type="button" onClick={() => onOpen(song)}>
      <div className="song-result-icon">♪</div>

      <div className="song-result-copy">
        <strong>{song.title}</strong>
        <span>
          {song.artist}
          {song.firstReleaseYear ? ` · ${song.firstReleaseYear}` : ""}
          {song.disambiguation ? ` · ${song.disambiguation}` : ""}
        </span>
      </div>

      <span className="song-duration">{formatDuration(song.durationMs)}</span>
      <span className="result-chevron">›</span>
    </button>
  );
}

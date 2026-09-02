import { formatDuration } from "@/lib/metadata/format";
import type { MetadataTrack } from "@/lib/metadata/types";

type TrackRowProps = {
  track: MetadataTrack;
  highlighted: boolean;
  fallbackIndex: number;
};

export function TrackRow({
  track,
  highlighted,
  fallbackIndex,
}: TrackRowProps) {
  return (
    <li
      className={highlighted ? "track-highlighted" : ""}
      key={`${track.position}-${track.recordingId ?? fallbackIndex}`}
    >
      <span className="track-number">{track.position}</span>
      <span>{track.title}</span>

      {highlighted ? (
        <span className="track-match">Selected song</span>
      ) : (
        <span className="track-duration">{formatDuration(track.durationMs)}</span>
      )}
    </li>
  );
}

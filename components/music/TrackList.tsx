import { EmptyState } from "@/components/ui/EmptyState";
import { TrackRow } from "@/components/music/TrackRow";
import type { MetadataTrack } from "@/lib/metadata/types";

type TrackListProps = {
  tracks: MetadataTrack[];
  selectedRecordingId: string | null;
};

export function TrackList({ tracks, selectedRecordingId }: TrackListProps) {
  if (!tracks.length) {
    return (
      <EmptyState
        className="drawer-empty"
        title="No tracklist available."
        message=""
      />
    );
  }

  return (
    <ol className="track-list">
      {tracks.map((track, index) => (
        <TrackRow
          key={`${track.position}-${track.recordingId ?? index}`}
          track={track}
          highlighted={Boolean(selectedRecordingId && track.recordingId === selectedRecordingId)}
          fallbackIndex={index}
        />
      ))}
    </ol>
  );
}

import type {
  MusicBrainzSettingsPayload,
  PublicMusicBrainzSettings,
} from "@/lib/content/musicbrainz-settings";
import type {
  MetadataProviderPayload,
  PublicMetadataProvider,
} from "@/lib/providers/types";
export type SearchEngine = "musicbrainz" | "lastfm";
export type SearchSettings = {
  engine: SearchEngine;
  musicbrainz: PublicMusicBrainzSettings;
  lastfm: PublicMetadataProvider | null;
};
export type SearchSettingsPayload = {
  engine: SearchEngine;
  musicbrainz?: MusicBrainzSettingsPayload;
  lastfm?: MetadataProviderPayload;
};

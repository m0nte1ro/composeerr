import type { MusicMetadataProvider } from "@/lib/server/metadata/provider";

import { MusicBrainzPublicProvider } from "@/lib/server/metadata/musicbrainz-public";
import { getMusicBrainzConnection } from "@/lib/server/musicbrainz-settings";

export function getMetadataProvider(): MusicMetadataProvider {
  return new MusicBrainzPublicProvider(getMusicBrainzConnection());
}

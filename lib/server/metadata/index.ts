import type { MusicMetadataProvider } from "@/lib/server/metadata/provider";

import { MusicBrainzPublicProvider } from "@/lib/server/metadata/musicbrainz-public";

let provider:
  | MusicMetadataProvider
  | null = null;

export function getMetadataProvider():
  MusicMetadataProvider {
  if (!provider) {
    provider =
      new MusicBrainzPublicProvider();
  }

  return provider;
}
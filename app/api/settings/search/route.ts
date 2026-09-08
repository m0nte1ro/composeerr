import { NextResponse } from "next/server";
import { readAuthBody, withAuth } from "@/lib/server/auth/http";
import { AuthError } from "@/lib/server/auth/errors";
import { MusicBrainzSettingsError } from "@/lib/server/musicbrainz-settings";
import { MetadataProviderSettingsError } from "@/lib/server/providers/metadata-settings";
import {
  getSearchSettings,
  saveSearchSettings,
} from "@/lib/server/search-settings";
import type { SearchSettingsPayload } from "@/lib/search/settings";
async function save(request: Request) {
  const body = (await readAuthBody(request)) as SearchSettingsPayload;
  try {
    return NextResponse.json({ ok: true, settings: saveSearchSettings(body) });
  } catch (error) {
    if (
      error instanceof MusicBrainzSettingsError ||
      error instanceof MetadataProviderSettingsError
    )
      throw new AuthError(error.message);
    throw error;
  }
}
export const GET = withAuth(
  async () => NextResponse.json({ ok: true, settings: getSearchSettings() }),
  { admin: true },
);
export const PUT = withAuth(async (request) => save(request), {
  admin: true,
});

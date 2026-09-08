import { NextResponse } from "next/server";
import { readAuthBody, withAuth } from "@/lib/server/auth/http";
import { AuthError } from "@/lib/server/auth/errors";
import { MusicBrainzSettingsError } from "@/lib/server/musicbrainz-settings";
import { MetadataProviderSettingsError } from "@/lib/server/providers/metadata-settings";
import { testSearchSettings } from "@/lib/server/search-settings";
import type { SearchSettingsPayload } from "@/lib/search/settings";
async function test(request: Request) {
  const body = (await readAuthBody(request)) as SearchSettingsPayload;
  try {
    await testSearchSettings(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof MusicBrainzSettingsError ||
      error instanceof MetadataProviderSettingsError
    )
      throw new AuthError(error.message);
    throw error;
  }
}
export const POST = withAuth(async (request) => test(request), {
  admin: true,
});

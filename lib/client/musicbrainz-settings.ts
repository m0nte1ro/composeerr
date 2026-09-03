import type {
  MusicBrainzSettingsPayload,
  PublicMusicBrainzSettings,
} from "@/lib/content/musicbrainz-settings";

function ensureOkResponse(
  response: Response,
  data: { ok?: boolean; error?: string },
  fallbackMessage: string,
) {
  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? fallbackMessage);
  }
}

async function readSettingsResponse(response: Response, fallback: string) {
  const data = (await response.json()) as {
    ok?: boolean;
    settings?: PublicMusicBrainzSettings;
    error?: string;
  };
  ensureOkResponse(response, data, fallback);

  if (!data.settings) {
    throw new Error(fallback);
  }

  return data.settings;
}

export async function getMusicBrainzSettings() {
  return readSettingsResponse(
    await fetch("/api/settings/content/musicbrainz", { cache: "no-store" }),
    "Could not load MusicBrainz settings.",
  );
}

export async function saveMusicBrainzSettings(payload: MusicBrainzSettingsPayload) {
  return readSettingsResponse(
    await fetch("/api/settings/content/musicbrainz", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    "Could not save MusicBrainz settings.",
  );
}

export async function resetMusicBrainzSettings() {
  return readSettingsResponse(
    await fetch("/api/settings/content/musicbrainz", { method: "DELETE" }),
    "Could not reset MusicBrainz settings.",
  );
}

export async function testMusicBrainzConnection(payload: MusicBrainzSettingsPayload) {
  const response = await fetch("/api/content/musicbrainz/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as { ok?: boolean; error?: string };
  ensureOkResponse(response, data, "MusicBrainz connection test failed.");
}

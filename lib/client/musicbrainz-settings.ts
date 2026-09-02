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

export async function getMusicBrainzSettings() {
  const response = await fetch("/api/settings/content/musicbrainz", {
    cache: "no-store",
  });
  const data = (await response.json()) as {
    ok?: boolean;
    settings?: PublicMusicBrainzSettings;
    error?: string;
  };

  ensureOkResponse(response, data, "Could not load MusicBrainz settings.");

  if (!data.settings) {
    throw new Error("Could not load MusicBrainz settings.");
  }

  return data.settings;
}

export async function saveMusicBrainzSettings(payload: MusicBrainzSettingsPayload) {
  const response = await fetch("/api/settings/content/musicbrainz", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as {
    ok?: boolean;
    settings?: PublicMusicBrainzSettings;
    error?: string;
  };

  ensureOkResponse(response, data, "Could not save MusicBrainz settings.");

  if (!data.settings) {
    throw new Error("Could not save MusicBrainz settings.");
  }

  return data.settings;
}

export async function testMusicBrainzConnection(payload: MusicBrainzSettingsPayload) {
  const response = await fetch("/api/content/musicbrainz/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as {
    ok?: boolean;
    error?: string;
  };

  ensureOkResponse(response, data, "MusicBrainz connection test failed.");
}

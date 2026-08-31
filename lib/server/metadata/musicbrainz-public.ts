import type {
  MetadataAlbumResult,
  MetadataArtistResult,
  MetadataSongResult,
} from "@/lib/metadata/types";

import type { MusicMetadataProvider } from "@/lib/server/metadata/provider";

const MUSICBRAINZ_API =
  "https://musicbrainz.org/ws/2";

const USER_AGENT =
  "Composeerr/0.1.0 (https://github.com/m0nte1ro/composeerr)";

const CACHE_TTL_MS = 15 * 60 * 1000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type MusicBrainzArtistCredit = {
  name?: string;

  joinphrase?: string;

  artist?: {
    id?: string;
    name?: string;
  };
};

type MusicBrainzArtist = {
  id: string;
  name: string;

  type?: string;
  country?: string;

  disambiguation?: string;

  score?: number;

  area?: {
    name?: string;
  };

  "life-span"?: {
    begin?: string;
  };
};

type MusicBrainzReleaseGroup = {
  id: string;
  title: string;

  score?: number;

  disambiguation?: string;

  "first-release-date"?: string;

  "primary-type"?: string;

  "secondary-types"?: string[];

  "artist-credit"?: MusicBrainzArtistCredit[];
};

type MusicBrainzRecording = {
  id: string;
  title: string;

  length?: number;

  score?: number;

  disambiguation?: string;

  "first-release-date"?: string;

  "artist-credit"?: MusicBrainzArtistCredit[];
};

type MusicBrainzArtistSearchResponse = {
  artists?: MusicBrainzArtist[];
};

type MusicBrainzReleaseGroupSearchResponse = {
  "release-groups"?: MusicBrainzReleaseGroup[];
};

type MusicBrainzRecordingSearchResponse = {
  recordings?: MusicBrainzRecording[];
};

type MusicBrainzGlobalState = {
  cache?: Map<
    string,
    CacheEntry<unknown>
  >;

  queue?: Promise<void>;

  lastRequestAt?: number;
};

const globalState =
  globalThis as unknown as {
    composeerrMusicBrainz?: MusicBrainzGlobalState;
  };

if (!globalState.composeerrMusicBrainz) {
  globalState.composeerrMusicBrainz = {
    cache: new Map(),
    queue: Promise.resolve(),
    lastRequestAt: 0,
  };
}

const state =
  globalState.composeerrMusicBrainz;

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function escapeLucene(value: string) {
  return value.replace(
    /&&|\|\||[+\-!(){}\[\]^"~*?:\\/]/g,
    "\\$&",
  );
}

function getYear(
  value: string | undefined,
) {
  if (!value) {
    return null;
  }

  const year = Number(value.slice(0, 4));

  return Number.isFinite(year)
    ? year
    : null;
}

function getArtistCredit(
  credits:
    | MusicBrainzArtistCredit[]
    | undefined,
) {
  if (!credits?.length) {
    return {
      name: "Unknown Artist",
      id: null,
    };
  }

  const name = credits
    .map((credit) => {
      const artistName =
        credit.name ??
        credit.artist?.name ??
        "Unknown Artist";

      return `${artistName}${credit.joinphrase ?? ""}`;
    })
    .join("");

  return {
    name,
    id: credits[0]?.artist?.id ?? null,
  };
}

function rankText(
  value: string,
  query: string,
  providerScore: number,
) {
  const candidate =
    value.trim().toLowerCase();

  const search =
    query.trim().toLowerCase();

  if (candidate === search) {
    return 10_000 + providerScore;
  }

  if (candidate.startsWith(search)) {
    return 8_000 + providerScore;
  }

  if (candidate.includes(search)) {
    return 6_000 + providerScore;
  }

  return providerScore;
}

function getCached<T>(
  key: string,
): T | null {
  const entry =
    state.cache?.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    state.cache?.delete(key);

    return null;
  }

  return entry.value as T;
}

function setCached<T>(
  key: string,
  value: T,
) {
  state.cache?.set(key, {
    value,
    expiresAt:
      Date.now() + CACHE_TTL_MS,
  });
}

async function runRateLimited<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let resolveResult:
    | ((value: T) => void)
    | undefined;

  let rejectResult:
    | ((reason?: unknown) => void)
    | undefined;

  const result = new Promise<T>(
    (resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    },
  );

  const previous =
    state.queue ?? Promise.resolve();

  state.queue = previous
    .catch(() => undefined)
    .then(async () => {
      try {
        const lastRequestAt =
          state.lastRequestAt ?? 0;

        const elapsed =
          Date.now() - lastRequestAt;

        const waitFor =
          Math.max(0, 1100 - elapsed);

        if (waitFor > 0) {
          await sleep(waitFor);
        }

        state.lastRequestAt =
          Date.now();

        const value =
          await operation();

        resolveResult?.(value);
      } catch (error) {
        rejectResult?.(error);
      }
    });

  return result;
}

async function requestMusicBrainz<T>(
  resource: string,
  query: string,
  limit: number,
): Promise<T> {
  const safeLimit =
    Math.max(1, Math.min(limit, 25));

  const cacheKey =
    `${resource}:${query}:${safeLimit}`
      .toLowerCase();

  const cached =
    getCached<T>(cacheKey);

  if (cached) {
    return cached;
  }

  return runRateLimited(
    async () => {
      const params =
        new URLSearchParams({
          query,
          fmt: "json",
          limit:
            safeLimit.toString(),
        });

      const response =
        await fetch(
          `${MUSICBRAINZ_API}/${resource}/?${params}`,
          {
            headers: {
              Accept:
                "application/json",

              "User-Agent":
                USER_AGENT,
            },

            cache: "no-store",

            signal:
              AbortSignal.timeout(
                10_000,
              ),
          },
        );

      if (!response.ok) {
        throw new Error(
          `MusicBrainz returned HTTP ${response.status}.`,
        );
      }

      const data =
        (await response.json()) as T;

      setCached(
        cacheKey,
        data,
      );

      return data;
    },
  );
}

function buildSearchQuery(
  field: string,
  query: string,
) {
  const escaped =
    escapeLucene(query.trim());

  return `${field}:(${escaped})`;
}

function buildMultiFieldSearchQuery(
  fields: string[],
  query: string,
) {
  const escaped =
    escapeLucene(query.trim());

  return fields
    .map(
      (field) =>
        `${field}:(${escaped})`,
    )
    .join(" OR ");
}

export class MusicBrainzPublicProvider
  implements MusicMetadataProvider
{
  readonly id =
    "musicbrainz-public";

  readonly name =
    "MusicBrainz Public API";

  async searchArtists(
    query: string,
    limit = 15,
  ): Promise<MetadataArtistResult[]> {
    const searchQuery =
      buildSearchQuery(
        "artist",
        query,
      );

    const response =
      await requestMusicBrainz<MusicBrainzArtistSearchResponse>(
        "artist",
        searchQuery,
        limit,
      );

    return (
      response.artists ?? []
    )
      .map((artist) => {
        const providerScore =
          artist.score ?? 0;

        return {
          kind:
            "artist" as const,

          id: artist.id,
          name: artist.name,

          disambiguation:
            artist.disambiguation ??
            null,

          type:
            artist.type ?? null,

          country:
            artist.country ?? null,

          area:
            artist.area?.name ??
            null,

          beginYear:
            getYear(
              artist["life-span"]
                ?.begin,
            ),

          score:
            rankText(
              artist.name,
              query,
              providerScore,
            ),
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score,
      );
  }

  async searchAlbums(
    query: string,
    limit = 15,
  ): Promise<MetadataAlbumResult[]> {
    const searchQuery =
      buildMultiFieldSearchQuery(
        [
          "releasegroup",
          "artist",
        ],
        query,
      );

    const response =
      await requestMusicBrainz<MusicBrainzReleaseGroupSearchResponse>(
        "release-group",
        searchQuery,
        limit,
      );

    return (
      response[
        "release-groups"
      ] ?? []
    )
      .map((album) => {
        const artist =
          getArtistCredit(
            album[
              "artist-credit"
            ],
          );

        const providerScore =
          album.score ?? 0;

        const titleScore =
          rankText(
            album.title,
            query,
            providerScore,
          );

        const artistScore =
          rankText(
            artist.name,
            query,
            providerScore,
          );

        return {
          kind:
            "album" as const,

          id: album.id,

          title:
            album.title,

          artist:
            artist.name,

          artistId:
            artist.id,

          year:
            getYear(
              album[
                "first-release-date"
              ],
            ),

          primaryType:
            album[
              "primary-type"
            ] ?? null,

          secondaryTypes:
            album[
              "secondary-types"
            ] ?? [],

          disambiguation:
            album.disambiguation ??
            null,

          score:
            Math.max(
              titleScore,
              artistScore,
            ),
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score,
      );
  }

  async searchSongs(
    query: string,
    limit = 15,
  ): Promise<MetadataSongResult[]> {
    const searchQuery =
      buildMultiFieldSearchQuery(
        [
          "recording",
          "artist",
        ],
        query,
      );

    const response =
      await requestMusicBrainz<MusicBrainzRecordingSearchResponse>(
        "recording",
        searchQuery,
        limit,
      );

    return (
      response.recordings ?? []
    )
      .map((recording) => {
        const artist =
          getArtistCredit(
            recording[
              "artist-credit"
            ],
          );

        const providerScore =
          recording.score ?? 0;

        return {
          kind:
            "song" as const,

          id:
            recording.id,

          title:
            recording.title,

          artist:
            artist.name,

          artistId:
            artist.id,

          durationMs:
            recording.length ??
            null,

          firstReleaseYear:
            getYear(
              recording[
                "first-release-date"
              ],
            ),

          disambiguation:
            recording.disambiguation ??
            null,

          score:
            rankText(
              recording.title,
              query,
              providerScore,
            ),
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score,
      );
  }
}
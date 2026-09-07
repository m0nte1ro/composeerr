import type {
  DiscoverySearchResult,
  MetadataAlbumDetails,
  MetadataAlbumResult,
  MetadataArtistDetails,
  MetadataArtistResult,
  MetadataSongDetails,
  MetadataSongResult,
  MetadataTrack,
} from "@/lib/metadata/types";

import type { MusicMetadataProvider } from "@/lib/server/metadata/provider";
import {
  getMusicBrainzCacheNamespace,
  getMusicBrainzHeaders,
  type MusicBrainzConnection,
} from "@/lib/server/musicbrainz-settings";

const CACHE_TTL_MS =
  15 * 60 * 1000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const MIN_REQUEST_INTERVAL_MS = 1500;
const MAX_REQUEST_ATTEMPTS = 4;

const RETRYABLE_STATUS_CODES =
  new Set([
    429,
    502,
    503,
    504,
  ]);

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

  releases?: MusicBrainzRelease[];
};

type MusicBrainzRelease = {
  id: string;
  title: string;

  date?: string;
  status?: string;
  country?: string;

  "artist-credit"?: MusicBrainzArtistCredit[];

  "release-group"?: MusicBrainzReleaseGroup;

  media?: MusicBrainzMedium[];
};

type MusicBrainzMedium = {
  position?: number;

  tracks?: MusicBrainzTrack[];
};

type MusicBrainzTrack = {
  position?: number;
  number?: string;

  title?: string;
  length?: number;

  recording?: {
    id?: string;
    title?: string;
    length?: number;
  };
};

type MusicBrainzRecording = {
  id: string;
  title: string;

  length?: number;

  score?: number;
  disambiguation?: string;

  "first-release-date"?: string;

  "artist-credit"?: MusicBrainzArtistCredit[];

  releases?: MusicBrainzRelease[];
};

type ArtistSearchResponse = {
  artists?: MusicBrainzArtist[];
};

type ReleaseGroupSearchResponse = {
  "release-groups"?: MusicBrainzReleaseGroup[];
};

type RecordingSearchResponse = {
  recordings?: MusicBrainzRecording[];
};

type ReleaseBrowseResponse = {
  releases?: MusicBrainzRelease[];
  count?: number;
  offset?: number;
};

type ReleaseGroupBrowseResponse = {
  "release-groups"?: MusicBrainzReleaseGroup[];
  count?: number;
  offset?: number;
};

type MusicBrainzGlobalState = {
  cache: Map<
    string,
    CacheEntry<unknown>
  >;

  queue: Promise<void>;

  lastRequestAt: number;
};

const globalForMusicBrainz =
  globalThis as unknown as {
    composeerrMusicBrainz?: MusicBrainzGlobalState;
  };

const state: MusicBrainzGlobalState =
  globalForMusicBrainz.composeerrMusicBrainz ??
  {
    cache: new Map(),
    queue: Promise.resolve(),
    lastRequestAt: 0,
  };

globalForMusicBrainz.composeerrMusicBrainz =
  state;

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function escapeLucene(
  value: string,
) {
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

  const year =
    Number(value.slice(0, 4));

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
    id:
      credits[0]?.artist?.id ??
      null,
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

  if (
    candidate.startsWith(search)
  ) {
    return 8_000 + providerScore;
  }

  if (
    candidate.includes(search)
  ) {
    return 6_000 + providerScore;
  }

  return providerScore;
}

function getCached<T>(
  key: string,
): T | null {
  const entry =
    state.cache.get(key);

  if (!entry) {
    return null;
  }

  if (
    entry.expiresAt <= Date.now()
  ) {
    state.cache.delete(key);

    return null;
  }

  return entry.value as T;
}

function setCached<T>(
  key: string,
  value: T,
) {
  state.cache.set(key, {
    value,

    expiresAt:
      Date.now() +
      CACHE_TTL_MS,
  });
}

async function waitForRateLimitSlot() {
  const elapsed =
    Date.now() -
    state.lastRequestAt;

  const waitFor =
    Math.max(
      0,
      MIN_REQUEST_INTERVAL_MS -
        elapsed,
    );

  if (waitFor > 0) {
    await sleep(waitFor);
  }

  state.lastRequestAt =
    Date.now();
}

async function runRateLimited<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const previous =
    state.queue;

  let release:
    (() => void) | undefined;

  const current =
    new Promise<void>(
      (resolve) => {
        release = resolve;
      },
    );

  state.queue = previous
    .catch(() => undefined)
    .then(() => current);

  await previous.catch(
    () => undefined,
  );

  try {
    return await operation();
  } finally {
    release?.();
  }
}

function getRetryAfterMs(
  response: Response,
) {
  const value =
    response.headers.get(
      "retry-after",
    );

  if (!value) {
    return null;
  }

  const seconds =
    Number(value);

  if (
    Number.isFinite(seconds)
  ) {
    return Math.max(
      0,
      seconds * 1000,
    );
  }

  const date =
    Date.parse(value);

  if (
    Number.isFinite(date)
  ) {
    return Math.max(
      0,
      date - Date.now(),
    );
  }

  return null;
}

function getRetryDelayMs(
  response: Response,
  attempt: number,
) {
  const retryAfter =
    getRetryAfterMs(response);

  const backoff =
    Math.min(
      8000,
      2000 * 2 ** (attempt - 1),
    );

  const jitter =
    Math.floor(
      Math.random() * 500,
    );

  return Math.max(
    retryAfter ?? 0,
    backoff + jitter,
  );
}

async function requestMusicBrainz<T>(
  connection: MusicBrainzConnection,
  resource: string,
  params: Record<
    string,
    string | number | undefined
  > = {},
): Promise<T> {
  const searchParams =
    new URLSearchParams({
      fmt: "json",
    });

  for (
    const [key, value]
    of Object.entries(params)
  ) {
    if (value === undefined) {
      continue;
    }

    searchParams.set(
      key,
      String(value),
    );
  }

  const cacheKey =
    `${getMusicBrainzCacheNamespace(connection)}|${resource}?${searchParams.toString()}`
      .toLowerCase();

  const cached =
    getCached<T>(cacheKey);

  if (cached) {
    return cached;
  }

  return runRateLimited(
    async () => {
      for (
        let attempt = 1;
        attempt <=
        MAX_REQUEST_ATTEMPTS;
        attempt++
      ) {
        await waitForRateLimitSlot();

        let response: Response;

        try {
          response =
            await fetch(
              `${connection.url}/${resource}?${searchParams}`,
              {
                headers:
                  getMusicBrainzHeaders(
                    connection,
                  ),

                cache:
                  "no-store",

                signal:
                  AbortSignal.timeout(
                    12_000,
                  ),
              },
            );
        } catch (error) {
          if (
            attempt >=
            MAX_REQUEST_ATTEMPTS
          ) {
            throw error;
          }

          const delay =
            MIN_REQUEST_INTERVAL_MS *
            2 **
              (attempt - 1);

          console.warn(
            `MusicBrainz network request failed; retrying in ${delay}ms (attempt ${attempt}/${MAX_REQUEST_ATTEMPTS}).`,
          );

          await sleep(delay);

          continue;
        }

        if (response.ok) {
          const data =
            (await response.json()) as T;

          setCached(
            cacheKey,
            data,
          );

          return data;
        }

        const retryable =
          RETRYABLE_STATUS_CODES.has(
            response.status,
          );

        if (
          !retryable ||
          attempt >=
            MAX_REQUEST_ATTEMPTS
        ) {
          throw new Error(
            `MusicBrainz returned HTTP ${response.status}.`,
          );
        }

        const delay =
          getRetryDelayMs(
            response,
            attempt,
          );

        console.warn(
          `MusicBrainz returned HTTP ${response.status}; retrying in ${delay}ms (attempt ${attempt}/${MAX_REQUEST_ATTEMPTS}).`,
        );

        // Consume the response before retrying so
        // the underlying connection can be reused
        // or closed cleanly.
        await response
          .arrayBuffer()
          .catch(
            () => undefined,
          );

        await sleep(delay);
      }

      throw new Error(
        "MusicBrainz request failed after retries.",
      );
    },
  );
}

function buildSearchTerm(
  query: string,
) {
  const escaped =
    escapeLucene(
      query.trim(),
    );

  if (escaped.includes(" ")) {
    return `"${escaped}"`;
  }

  return escaped;
}

function buildSearchQuery(
  field: string,
  query: string,
) {
  return `${field}:${buildSearchTerm(query)}`;
}

function buildMultiFieldSearchQuery(
  fields: string[],
  query: string,
) {
  const term =
    buildSearchTerm(query);

  return fields
    .map(
      (field) =>
        `${field}:${term}`,
    )
    .join(" OR ");
}

function mapArtist(
  artist: MusicBrainzArtist,
  query = "",
): MetadataArtistResult {
  const providerScore =
    artist.score ?? 0;

  return {
    kind: "artist",

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

    score: query
      ? rankText(
          artist.name,
          query,
          providerScore,
        )
      : providerScore,
  };
}

function mapReleaseGroup(
  album: MusicBrainzReleaseGroup,
  fallbackCredits?: MusicBrainzArtistCredit[],
  query = "",
): MetadataAlbumResult {
  const artist =
    getArtistCredit(
      album["artist-credit"] ??
      fallbackCredits,
    );

  const providerScore =
    album.score ?? 0;

  const titleScore =
    query
      ? rankText(
          album.title,
          query,
          providerScore,
        )
      : providerScore;

  const artistScore =
    query
      ? rankText(
          artist.name,
          query,
          providerScore,
        )
      : providerScore;

  return {
    kind: "album",

    id: album.id,

    title: album.title,

    artist: artist.name,

    artistId: artist.id,

    year:
      getYear(
        album[
          "first-release-date"
        ],
      ),

    primaryType:
      album["primary-type"] ??
      null,

    secondaryTypes:
      album["secondary-types"] ??
      [],

    disambiguation:
      album.disambiguation ??
      null,

    score:
      Math.max(
        titleScore,
        artistScore,
      ),
  };
}

function getRecordingPopularityScore(
  recording: MusicBrainzRecording,
) {
  const releases =
    recording.releases ?? [];

  const officialReleases =
    releases.filter(
      (release) =>
        !release.status ||
        release.status.toLowerCase() ===
          "official",
    );

  const usableReleases =
    officialReleases.length
      ? officialReleases
      : releases;

  const releaseGroupIds =
    new Set(
      usableReleases
        .map(
          (release) =>
            release[
              "release-group"
            ]?.id,
        )
        .filter(
          (
            id,
          ): id is string =>
            Boolean(id),
        ),
    );

  const albumReleases =
    usableReleases.filter(
      (release) =>
        release[
          "release-group"
        ]?.["primary-type"]
          ?.toLowerCase() ===
        "album",
    ).length;

  const compilationReleases =
    usableReleases.filter(
      (release) =>
        release[
          "release-group"
        ]?.["secondary-types"]
          ?.some(
            (type) =>
              type.toLowerCase() ===
              "compilation",
          ),
    ).length;

  /*
   * This is a relevance proxy, not a true popularity metric.
   *
   * A recording that appears on many official releases / release
   * groups is generally more established than one that appears once.
   */
  let score =
    Math.min(
      usableReleases.length,
      40,
    ) *
      12 +
    Math.min(
      releaseGroupIds.size,
      25,
    ) *
      20 +
    Math.min(
      albumReleases,
      20,
    ) *
      12 +
    Math.min(
      compilationReleases,
      20,
    ) *
      6;

  /*
   * Versions with these disambiguations are normally less likely to
   * be what someone means when searching only for a song title.
   */
  const version =
    recording.disambiguation
      ?.toLowerCase() ?? "";

  if (
    /\b(live|karaoke|demo|remix|instrumental|dj[- ]?mix)\b/.test(
      version,
    )
  ) {
    score -= 350;
  }

  return score;
}

function mapRecording(
  recording: MusicBrainzRecording,
  query = "",
): MetadataSongResult {
  const artist =
    getArtistCredit(
      recording[
        "artist-credit"
      ],
    );

  const providerScore =
    recording.score ?? 0;

  const textScore =
    query
      ? rankText(
          recording.title,
          query,
          providerScore,
        )
      : providerScore;

  const popularityScore =
    query
      ? getRecordingPopularityScore(
          recording,
        )
      : 0;

  return {
    kind: "song",

    id: recording.id,

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
      textScore +
      popularityScore,
  };
}

export class MusicBrainzPublicProvider
  implements MusicMetadataProvider
{
  constructor(
    private readonly connection: MusicBrainzConnection,
  ) {}
  readonly id =
    "musicbrainz-public";

  readonly name =
    "MusicBrainz Public API";

  async findCanonicalMatches(
    discovery: DiscoverySearchResult,
    limit = 10,
  ) {
    if (discovery.kind === "artist") {
      const response = await requestMusicBrainz<ArtistSearchResponse>(
        this.connection,
        "artist/",
        {
          query: buildSearchQuery("artist", discovery.name),
          limit,
        },
      );
      return (response.artists ?? []).map((artist) =>
        mapArtist(artist, discovery.name),
      );
    }

    if (discovery.kind === "album") {
      const response = await requestMusicBrainz<ReleaseGroupSearchResponse>(
        this.connection,
        "release-group/",
        {
          query: `${buildSearchQuery("releasegroup", discovery.title)} AND ${buildSearchQuery("artist", discovery.artist)} AND primarytype:album`,
          limit,
        },
      );
      return (response["release-groups"] ?? []).map((album) =>
        mapReleaseGroup(album, undefined, discovery.title),
      );
    }

    const response = await requestMusicBrainz<RecordingSearchResponse>(
      this.connection,
      "recording/",
      {
        query: `${buildSearchQuery("recording", discovery.title)} AND ${buildSearchQuery("artist", discovery.artist)}`,
        limit,
      },
    );
    return (response.recordings ?? [])
      .map((recording) => mapRecording(recording, discovery.title))
      .sort((a, b) => b.score - a.score);
  }

  async searchArtists(
  query: string,
  limit = 25,
) {
  const response =
    await requestMusicBrainz<ArtistSearchResponse>(
      this.connection,
      "artist/",
      {
        query:
          buildSearchQuery(
            "artist",
            query,
          ),

        /*
         * Fetch a larger candidate pool.
         * MusicBrainz relevance remains the primary ranking signal.
         */
        limit:
          Math.min(
            Math.max(
              limit,
              50,
            ),
            100,
          ),
      },
    );

  return (
    response.artists ?? []
  )
    .map(
      (artist) =>
        /*
         * Deliberately do NOT pass query here.
         *
         * mapArtist() will retain the provider's own score rather than
         * applying Composeerr's exact-name boost.
         */
        mapArtist(
          artist,
        ),
    )
    .sort(
      (a, b) =>
        b.score - a.score,
    )
    .slice(
      0,
      limit,
    );
}

  async searchAlbums(
    query: string,
    limit = 15,
  ) {
    const textQuery =
  buildMultiFieldSearchQuery(
    [
      "releasegroup",
      "artist",
    ],
    query,
  );

const response =
  await requestMusicBrainz<ReleaseGroupSearchResponse>(
    this.connection,
    "release-group/",
    {
      query:
        `(${textQuery}) AND primarytype:album`,

      limit:
        Math.min(limit, 25),
    },
  );

    return (
      response[
        "release-groups"
      ] ?? []
    )
      .map(
        (album) =>
          mapReleaseGroup(
            album,
            undefined,
            query,
          ),
      )
      .sort(
        (a, b) =>
          b.score - a.score,
      );
  }

 async searchSongs(
  query: string,
  limit = 25,
) {
  const searchQuery =
    buildSearchQuery(
      "recording",
      query,
    );

  const response =
    await requestMusicBrainz<RecordingSearchResponse>(
      this.connection,
      "recording/",
      {
        query:
          searchQuery,

        limit: 100,
      },
    );

  const normalizedQuery =
    query
      .trim()
      .toLowerCase();

  const results =
    (
      response.recordings ?? []
    ).map(
      (recording) =>
        mapRecording(
          recording,
          query,
        ),
    );

  /*
   * Exact song titles always come before partial title matches.
   * Inside each group, Composeerr's relevance score decides order.
   */
  return results
    .sort((a, b) => {
      const aExact =
        a.title
          .trim()
          .toLowerCase() ===
        normalizedQuery;

      const bExact =
        b.title
          .trim()
          .toLowerCase() ===
        normalizedQuery;

      if (
        aExact !== bExact
      ) {
        return aExact
          ? -1
          : 1;
      }

      return (
        b.score -
        a.score
      );
    })
    .slice(
      0,
      limit,
    );
}

  async getSong(
    id: string,
  ): Promise<MetadataSongDetails> {
    const [
      recording,
      releaseResponse,
    ] = await Promise.all([
      requestMusicBrainz<MusicBrainzRecording>(
        this.connection,
        `recording/${id}`,
        {
          inc:
            "artist-credits",
        },
      ),

      requestMusicBrainz<ReleaseBrowseResponse>(
        this.connection,
        "release/",
        {
          recording: id,

          status:
            "official",

          inc:
            "artist-credits+release-groups",

          limit: 100,
        },
      ),
    ]);

    const song =
      mapRecording(recording);

    if (
      !song.firstReleaseYear
    ) {
      const years =
        (
          releaseResponse.releases ??
          []
        )
          .map(
            (release) =>
              getYear(
                release.date,
              ),
          )
          .filter(
            (year): year is number =>
              year !== null,
          );

      song.firstReleaseYear =
        years.length
          ? Math.min(...years)
          : null;
    }

    const unique =
      new Map<
        string,
        MetadataAlbumResult
      >();

    for (
      const release
      of releaseResponse.releases ??
      []
    ) {
      const group =
        release[
          "release-group"
        ];

      if (!group) {
        continue;
      }

      if (group["primary-type"]?.toLowerCase() !== "album") {
        continue;
      }

      if (
        unique.has(group.id)
      ) {
        continue;
      }

      unique.set(
        group.id,
        mapReleaseGroup(
          group,
          release[
            "artist-credit"
          ],
        ),
      );
    }

    const appearances =
      Array.from(
        unique.values(),
      ).sort((a, b) => {
        if (
          a.year !== null &&
          b.year !== null &&
          a.year !== b.year
        ) {
          return (
            a.year - b.year
          );
        }

        return a.title.localeCompare(
          b.title,
        );
      });

    return {
      song,
      appearances,
    };
  }

  async getAlbum(
    id: string,
  ): Promise<MetadataAlbumDetails> {
    const releaseGroup =
      await requestMusicBrainz<MusicBrainzReleaseGroup>(
        this.connection,
        `release-group/${id}`,
        {
          inc:
            "artist-credits+releases",
        },
      );

    const album =
      mapReleaseGroup(
        releaseGroup,
      );

    const releases =
      releaseGroup.releases ??
      [];

    const official =
      releases.filter(
        (release) =>
          !release.status ||
          release.status ===
            "Official",
      );

    const candidates =
      official.length
        ? official
        : releases;

    const representative =
      [...candidates].sort(
        (a, b) => {
          const dateA =
            a.date ??
            "9999-99-99";

          const dateB =
            b.date ??
            "9999-99-99";

          return dateA.localeCompare(
            dateB,
          );
        },
      )[0];

    if (!representative) {
      return {
        album,
        representativeReleaseId:
          null,
        tracks: [],
      };
    }

    const release =
      await requestMusicBrainz<MusicBrainzRelease>(
        this.connection,
        `release/${representative.id}`,
        {
          inc:
            "recordings+artist-credits+release-groups",
        },
      );

    const tracks:
      MetadataTrack[] = [];

    for (
      const medium
      of release.media ?? []
    ) {
      for (
        const track
        of medium.tracks ?? []
      ) {
        tracks.push({
          position:
            track.number ??
            String(
              track.position ??
              tracks.length + 1,
            ),

          title:
            track.title ??
            track.recording
              ?.title ??
            "Unknown Track",

          durationMs:
            track.length ??
            track.recording
              ?.length ??
            null,

          recordingId:
            track.recording
              ?.id ??
            null,
        });
      }
    }

    return {
      album,

      representativeReleaseId:
        representative.id,

      tracks,
    };
  }

  async getArtist(
    id: string,
  ): Promise<MetadataArtistDetails> {
    const [
      artist,
      releaseGroups,
    ] = await Promise.all([
      requestMusicBrainz<MusicBrainzArtist>(
        this.connection,
        `artist/${id}`,
      ),

      requestMusicBrainz<ReleaseGroupBrowseResponse>(
        this.connection,
        "release-group/",
        {
          artist: id,

          inc:
            "artist-credits",

          "release-group-status":
            "website-default",

          limit: 100,
        },
      ),
    ]);

    const discography =
      (
        releaseGroups[
          "release-groups"
        ] ?? []
      )
        .map(
          (group) =>
            mapReleaseGroup(
              group,
            ),
        )
        .sort((a, b) => {
          if (
            a.year !== null &&
            b.year !== null &&
            a.year !== b.year
          ) {
            return (
              a.year - b.year
            );
          }

          return a.title.localeCompare(
            b.title,
          );
        });

    return {
      artist:
        mapArtist(artist),

      discography,
    };
  }
}
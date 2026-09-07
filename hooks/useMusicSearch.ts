"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";

import { searchMetadata } from "@/lib/client/metadata";
import type {
  DiscoveryAlbumResult,
  DiscoveryArtistResult,
  DiscoverySearchResult,
  DiscoverySongResult,
  MetadataSearchType,
} from "@/lib/metadata/types";

type SearchState =
  | {
      status: "idle";
      results: DiscoverySearchResult[];
    }
  | {
      status: "loading";
      results: DiscoverySearchResult[];
    }
  | {
      status: "ready";
      results: DiscoverySearchResult[];
    }
  | {
      status: "error";
      results: DiscoverySearchResult[];
      message: string;
    };

export function useMusicSearch(initialType: MetadataSearchType = "song") {
  const [searchType, setSearchTypeState] =
    useState<MetadataSearchType>(initialType);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const [searchState, setSearchState] = useState<SearchState>({
    status: "idle",
    results: [],
  });

  const setSearchType = useCallback((type: MetadataSearchType) => {
    setSearchTypeState(type);
    setSubmittedQuery("");
    setSearchState({
      status: "idle",
      results: [],
    });
  }, []);

  const submitSearch = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();

      const trimmed = query.trim();

      if (!trimmed) {
        return false;
      }

      setSubmittedQuery(trimmed);
      setSearchState({
        status: "loading",
        results: [],
      });

      try {
        const results = await searchMetadata(searchType, trimmed);

        setSearchState({
          status: "ready",
          results,
        });
      } catch (error) {
        setSearchState({
          status: "error",
          results: [],
          message:
            error instanceof Error
              ? error.message
              : "Could not search metadata.",
        });
      }

      return true;
    },
    [query, searchType],
  );

  const songResults = useMemo(
    () =>
      searchState.results.filter(
        (result): result is DiscoverySongResult => result.kind === "song",
      ),
    [searchState.results],
  );

  const albumResults = useMemo(
    () =>
      searchState.results.filter(
        (result): result is DiscoveryAlbumResult => result.kind === "album",
      ),
    [searchState.results],
  );

  const artistResults = useMemo(
    () =>
      searchState.results.filter(
        (result): result is DiscoveryArtistResult => result.kind === "artist",
      ),
    [searchState.results],
  );

  return {
    searchType,
    query,
    submittedQuery,
    searchState,
    songResults,
    albumResults,
    artistResults,
    setQuery,
    setSearchType,
    submitSearch,
  };
}

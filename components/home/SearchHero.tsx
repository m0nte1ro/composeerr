import type {
  FormEvent,
  RefObject,
} from "react";

import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchTypeSelect } from "@/components/search/SearchTypeSelect";
import { SecondarySearchFilter } from "@/components/search/SecondarySearchFilter";
import type { MetadataSearchType } from "@/lib/metadata/types";

type SearchHeroProps = {
  searchType: MetadataSearchType;
  query: string;
  loading: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (value: string) => void;
  onTypeChange: (value: MetadataSearchType) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SearchHero({
  searchType,
  query,
  loading,
  inputRef,
  onQueryChange,
  onTypeChange,
  onSubmit,
}: SearchHeroProps) {
  const placeholder =
    searchType === "song"
      ? "Search for a song..."
      : searchType === "album"
        ? "Search for an album..."
        : "Search for an artist...";

  return (
    <section className="hero">
      <div className="hero-eyebrow">Your music, without the admin</div>

      <h1>Find it. Pick the album. Request it.</h1>

      <p>
        Search for a song, album or artist. Composeerr handles the messy part between you and
        Lidarr.
      </p>

      <form className="search-form" onSubmit={onSubmit}>
        <SearchBar
          inputRef={inputRef}
          value={query}
          onChange={onQueryChange}
          placeholder={placeholder}
        />

        <SearchTypeSelect value={searchType} onChange={onTypeChange} />
        <SecondarySearchFilter />

        <Button className="search-button" type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </form>
    </section>
  );
}

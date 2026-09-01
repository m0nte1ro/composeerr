import { Select } from "@/components/ui/Select";
import type { MetadataSearchType } from "@/lib/metadata/types";

type SearchTypeSelectProps = {
  value: MetadataSearchType;
  onChange: (value: MetadataSearchType) => void;
};

export function SearchTypeSelect({
  value,
  onChange,
}: SearchTypeSelectProps) {
  return (
    <Select
      className="search-type"
      value={value}
      onChange={(event) => onChange(event.target.value as MetadataSearchType)}
    >
      <option value="song">Song</option>
      <option value="album">Album</option>
      <option value="artist">Artist</option>
    </Select>
  );
}

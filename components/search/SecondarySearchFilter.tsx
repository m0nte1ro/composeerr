import { Select } from "@/components/ui/Select";

export function SecondarySearchFilter() {
  return (
    <Select className="search-type" defaultValue="default" disabled aria-label="Secondary search filter">
      <option value="default">All releases</option>
    </Select>
  );
}

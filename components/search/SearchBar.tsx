import type { RefObject } from "react";

import { Input } from "@/components/ui/Input";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement | null>;
};

export function SearchBar({
  value,
  onChange,
  placeholder,
  inputRef,
}: SearchBarProps) {
  return (
    <div className="search-control">
      <span className="search-icon">⌕</span>

      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />

      <span className="keyboard-hint">⌘K</span>
    </div>
  );
}

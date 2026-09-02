type DrawerHeaderProps = {
  mode: "song" | "album" | "artist" | null;
  showBackArrow: boolean;
  onBack: () => void;
  onClose: () => void;
};

export function DrawerHeader({
  mode,
  showBackArrow,
  onBack,
  onClose,
}: DrawerHeaderProps) {
  return (
    <header className="drawer-header">
      <button className="drawer-back-button" type="button" onClick={onBack}>
        {showBackArrow ? "←" : "×"}
      </button>

      <span>
        {mode === "song" && "Song"}
        {mode === "album" && "Album"}
        {mode === "artist" && "Artist"}
      </span>

      <button className="drawer-close-button" type="button" onClick={onClose}>
        ×
      </button>
    </header>
  );
}

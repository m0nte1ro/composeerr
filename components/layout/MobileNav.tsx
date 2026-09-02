export function MobileNav() {
  return (
    <nav className="mobile-nav">
      <button className="mobile-nav-active" type="button">
        <span>⌂</span>
        Home
      </button>

      <button type="button">
        <span>⌕</span>
        Search
      </button>

      <button type="button">
        <span>♫</span>
        Library
      </button>

      <button type="button">
        <span>↻</span>
        Activity
      </button>
    </nav>
  );
}

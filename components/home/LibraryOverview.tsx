type LibraryOverviewProps = {
  albumCount: number;
  trackFileCount: number;
  artistCount: number;
};

export function LibraryOverview({
  albumCount,
  trackFileCount,
  artistCount,
}: LibraryOverviewProps) {
  return (
    <section className="content-section">
      <div className="section-header">
        <div>
          <h2>Your library</h2>
          <p>Live state from your enabled Library providers.</p>
        </div>
      </div>

      <div className="flow-grid">
        <div className="flow-card">
          <span className="flow-number">ALBUMS</span>
          <strong>{albumCount}</strong>
          <p>Albums available from your library.</p>
        </div>

        <div className="flow-card">
          <span className="flow-number">TRACKS</span>
          <strong>{trackFileCount}</strong>
          <p>Track files currently indexed.</p>
        </div>

        <div className="flow-card">
          <span className="flow-number">ARTISTS</span>
          <strong>{artistCount}</strong>
          <p>Artists found across enabled providers.</p>
        </div>
      </div>
    </section>
  );
}

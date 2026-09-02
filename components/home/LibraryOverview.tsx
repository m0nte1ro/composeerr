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
          <p>Live state from Lidarr.</p>
        </div>
      </div>

      <div className="flow-grid">
        <div className="flow-card">
          <span className="flow-number">ALBUMS</span>
          <strong>{albumCount}</strong>
          <p>Albums with files known by Lidarr.</p>
        </div>

        <div className="flow-card">
          <span className="flow-number">TRACKS</span>
          <strong>{trackFileCount}</strong>
          <p>Track files currently indexed by Lidarr.</p>
        </div>

        <div className="flow-card">
          <span className="flow-number">ARTISTS</span>
          <strong>{artistCount}</strong>
          <p>Artists managed by Lidarr.</p>
        </div>
      </div>
    </section>
  );
}

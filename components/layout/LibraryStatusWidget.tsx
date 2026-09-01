type LibraryStatusWidgetProps = {
  status: "loading" | "ready" | "error";
  albumCount: number;
  trackFileCount: number;
};

export function LibraryStatusWidget({
  status,
  albumCount,
  trackFileCount,
}: LibraryStatusWidgetProps) {
  return (
    <div className="lidarr-status">
      <span
        className={
          status === "ready" ? "status-dot" : "status-dot status-dot-offline"
        }
      />

      <div>
        <strong>Lidarr</strong>

        <span>
          {status === "loading" && "Syncing library..."}
          {status === "ready" && `${albumCount} albums · ${trackFileCount} tracks`}
          {status === "error" && "Unavailable"}
        </span>
      </div>
    </div>
  );
}

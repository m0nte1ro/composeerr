type ConnectionState =
  | { status: "idle" }
  | { status: "testing" }
  | {
      status: "success";
      version?: string | null;
      instanceName?: string | null;
      title?: string;
      message?: string;
    }
  | { status: "error"; message: string };

type ConnectionTestStatusProps = {
  state: ConnectionState;
};

export function ConnectionTestStatus({ state }: ConnectionTestStatusProps) {
  if (state.status === "error") {
    return (
      <div className="connection-result connection-result-error">
        <strong>Connection failed</strong>
        <span>{state.message}</span>
      </div>
    );
  }

  if (state.status === "success" && (state.version || state.title)) {
    return (
      <div className="connection-result connection-result-success">
        <strong>
          {state.title || (state.instanceName || "Lidarr") + " is reachable."}
        </strong>
        <span>{state.message || "Running Lidarr " + state.version + "."}</span>
      </div>
    );
  }

  return null;
}

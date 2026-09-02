type ConnectionState =
  | {
      status: "idle";
    }
  | {
      status: "testing";
    }
  | {
      status: "success";
      version?: string | null;
      instanceName?: string | null;
    }
  | {
      status: "error";
      message: string;
    };

type ConnectionTestStatusProps = {
  state: ConnectionState;
};

export function ConnectionTestStatus({
  state,
}: ConnectionTestStatusProps) {
  if (state.status === "error") {
    return (
      <div className="connection-result connection-result-error">
        <strong>Connection failed</strong>
        <span>{state.message}</span>
      </div>
    );
  }

  if (state.status === "success" && state.version) {
    return (
      <div className="connection-result connection-result-success">
        <strong>{state.instanceName || "Lidarr"} is reachable.</strong>
        <span>Running Lidarr {state.version}.</span>
      </div>
    );
  }

  return null;
}

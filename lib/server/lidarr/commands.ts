import { LidarrRequestError } from "@/lib/server/lidarr/errors";
import { lidarrGet, lidarrWrite } from "@/lib/server/lidarr/http-client";
import type {
  LidarrCommandResource,
  LidarrConnection,
} from "@/lib/server/lidarr/types";

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function startLidarrCommand(
  connection: LidarrConnection,
  body: Record<string, unknown>,
) {
  const command = await lidarrWrite<LidarrCommandResource>(
    connection,
    "/api/v1/command",
    "POST",
    body,
  );

  if (!command || typeof command.id !== "number") {
    throw new LidarrRequestError(
      "Lidarr queued a command but did not return a valid command ID.",
      502,
    );
  }

  return command;
}

export async function waitForLidarrCommand(
  connection: LidarrConnection,
  commandId: number,
  timeoutMs = 90000,
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const command = await lidarrGet<LidarrCommandResource>(
      connection,
      `/api/v1/command/${commandId}`,
    );

    const status = command.status?.toLowerCase() ?? "";

    if (status === "completed") {
      return command;
    }

    if (status === "failed" || status === "aborted" || status === "cancelled") {
      console.error(
        `Lidarr command ${commandId} (${command.name ?? "unknown"}) ended with status ${command.status}:`,
        command.message,
      );

      throw new LidarrRequestError("A Lidarr command failed.", 502);
    }

    await sleep(750);
  }

  throw new LidarrRequestError(
    "Timed out waiting for Lidarr to refresh metadata.",
    502,
  );
}

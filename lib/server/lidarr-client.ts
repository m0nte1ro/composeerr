export type LidarrConnection = {
  url: string;
  apiKey: string;
};

export type LidarrSystemStatus = {
  appName?: string;
  instanceName?: string;
  version?: string;
  osName?: string;
  osVersion?: string;
};

export type LidarrRootFolder = {
  id: number;
  name?: string;
  path: string;
};

export type LidarrProfile = {
  id: number;
  name: string;
};

export type LidarrOptions = {
  rootFolders: LidarrRootFolder[];
  qualityProfiles: LidarrProfile[];
  metadataProfiles: LidarrProfile[];
};

export class LidarrRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);

    this.name = "LidarrRequestError";
  }
}

export function normalizeLidarrUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function validateLidarrUrl(value: string) {
  const normalized = normalizeLidarrUrl(value);

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new LidarrRequestError(
      "Lidarr URL is not valid.",
      400,
    );
  }

  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {
    throw new LidarrRequestError(
      "Lidarr URL must use HTTP or HTTPS.",
      400,
    );
  }

  return normalized;
}

async function lidarrGet<T>(
  connection: LidarrConnection,
  path: string,
): Promise<T> {
  const url = validateLidarrUrl(connection.url);

  let response: Response;

  try {
    response = await fetch(`${url}${path}`, {
      method: "GET",

      headers: {
        Accept: "application/json",
        "X-Api-Key": connection.apiKey,
      },

      cache: "no-store",

      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    const timeout =
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError");

    throw new LidarrRequestError(
      timeout
        ? "Timed out while connecting to Lidarr."
        : "Could not connect to Lidarr.",
      502,
    );
  }

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    throw new LidarrRequestError(
      "Lidarr rejected the API key.",
      401,
    );
  }

  if (!response.ok) {
    throw new LidarrRequestError(
      `Lidarr returned HTTP ${response.status}.`,
      502,
    );
  }

  return (await response.json()) as T;
}

export function getLidarrStatus(
  connection: LidarrConnection,
) {
  return lidarrGet<LidarrSystemStatus>(
    connection,
    "/api/v1/system/status",
  );
}

export async function getLidarrOptions(
  connection: LidarrConnection,
): Promise<LidarrOptions> {
  const [
    rootFolders,
    qualityProfiles,
    metadataProfiles,
  ] = await Promise.all([
    lidarrGet<LidarrRootFolder[]>(
      connection,
      "/api/v1/rootfolder",
    ),

    lidarrGet<LidarrProfile[]>(
      connection,
      "/api/v1/qualityprofile",
    ),

    lidarrGet<LidarrProfile[]>(
      connection,
      "/api/v1/metadataprofile",
    ),
  ]);

  return {
    rootFolders,
    qualityProfiles,
    metadataProfiles,
  };
}
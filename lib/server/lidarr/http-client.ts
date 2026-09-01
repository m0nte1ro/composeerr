import { LidarrRequestError } from "@/lib/server/lidarr/errors";
import type { LidarrConnection } from "@/lib/server/lidarr/types";

const DEFAULT_GET_TIMEOUT_MS = 8000;
const DEFAULT_WRITE_TIMEOUT_MS = 15000;

export function normalizeLidarrUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function validateLidarrUrl(value: string) {
  const normalized = normalizeLidarrUrl(value);

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new LidarrRequestError("Lidarr URL is not valid.", 400);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new LidarrRequestError("Lidarr URL must use HTTP or HTTPS.", 400);
  }

  return normalized;
}

function getConnectionErrorMessage(
  error: unknown,
  timeoutMessage: string,
  genericMessage: string,
) {
  const timeout =
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError");

  return timeout ? timeoutMessage : genericMessage;
}

function getHeaders(connection: LidarrConnection, includeJsonBody = false) {
  return {
    Accept: "application/json",
    ...(includeJsonBody ? { "Content-Type": "application/json" } : {}),
    "X-Api-Key": connection.apiKey,
  };
}

async function parseLidarrResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

function ensureLidarrResponseOk(response: Response) {
  if (response.status === 401 || response.status === 403) {
    throw new LidarrRequestError("Lidarr rejected the API key.", 401);
  }

  if (!response.ok) {
    throw new LidarrRequestError(
      `Lidarr returned HTTP ${response.status}.`,
      502,
    );
  }

  return response;
}

export async function lidarrGet<T>(
  connection: LidarrConnection,
  path: string,
  timeoutMs = DEFAULT_GET_TIMEOUT_MS,
): Promise<T> {
  const baseUrl = validateLidarrUrl(connection.url);

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: getHeaders(connection),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new LidarrRequestError(
      getConnectionErrorMessage(
        error,
        "Timed out while connecting to Lidarr.",
        "Could not connect to Lidarr.",
      ),
      502,
    );
  }

  try {
    ensureLidarrResponseOk(response);
  } catch (error) {
    const responseText = await response.text().catch(() => "");
    console.error(
      `Lidarr GET ${path} failed with HTTP ${response.status}:`,
      responseText,
    );
    throw error;
  }

  return (await parseLidarrResponse<T>(response)) as T;
}

export async function lidarrWrite<T = unknown>(
  connection: LidarrConnection,
  path: string,
  method: "POST" | "PUT",
  body: unknown,
  timeoutMs = DEFAULT_WRITE_TIMEOUT_MS,
): Promise<T> {
  const baseUrl = validateLidarrUrl(connection.url);

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: getHeaders(connection, true),
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new LidarrRequestError(
      getConnectionErrorMessage(
        error,
        "Timed out while communicating with Lidarr.",
        "Could not communicate with Lidarr.",
      ),
      502,
    );
  }

  try {
    ensureLidarrResponseOk(response);
  } catch (error) {
    const responseText = await response.text().catch(() => "");
    console.error(
      `Lidarr ${method} ${path} failed with HTTP ${response.status}:`,
      responseText,
    );
    throw error;
  }

  return await parseLidarrResponse<T>(response);
}

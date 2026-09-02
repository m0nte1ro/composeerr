const REQUEST_TIMEOUT_MS = 12_000;

export class ProviderConnectionError extends Error {}

export async function providerFetch(
  url: URL | string,
  init: RequestInit,
  providerName: string,
) {
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ProviderConnectionError(`${providerName} could not be reached.`);
  }
}

export async function readProviderJson(
  response: Response,
  providerName: string,
) {
  if (response.status === 401 || response.status === 403) {
    await response.body?.cancel().catch(() => undefined);
    throw new ProviderConnectionError(`${providerName} rejected the credentials.`);
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new ProviderConnectionError(
      `${providerName} did not return a successful response.`,
    );
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new ProviderConnectionError(
      `${providerName} did not return a valid response.`,
    );
  }
}

import type {
  ArtworkProviderPayload,
  ArtworkSettings,
  LibraryProviderPayload,
  LibraryProvidersSettings,
  MetadataProviderPayload,
  MetadataProvidersSettings,
} from "@/lib/providers/types";

async function readResponse<T>(response: Response, fallback: string) {
  const data = (await response.json()) as {
    ok?: boolean;
    error?: string;
    settings?: T;
  };

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? fallback);
  }

  return data;
}

async function settingsRequest<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  payload?: unknown,
  fallback = "Could not update provider settings.",
) {
  const response = await fetch(path, {
    method,
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await readResponse<T>(response, fallback);

  if (!data.settings) {
    throw new Error(fallback);
  }

  return data.settings;
}

export async function getMetadataProviders() {
  const response = await fetch("/api/settings/metadata", { cache: "no-store" });
  const data = await readResponse<MetadataProvidersSettings>(
    response,
    "Could not load metadata providers.",
  );

  if (!data.settings) {
    throw new Error("Could not load metadata providers.");
  }

  return data.settings;
}

export function addMetadataProvider(payload: MetadataProviderPayload) {
  return settingsRequest<MetadataProvidersSettings>(
    "/api/settings/metadata",
    "POST",
    payload,
    "Could not add metadata provider.",
  );
}

export function updateMetadataProvider(payload: MetadataProviderPayload) {
  return settingsRequest<MetadataProvidersSettings>(
    "/api/settings/metadata",
    "PUT",
    payload,
    "Could not update metadata provider.",
  );
}

export function removeMetadataProvider(payload: {
  key: MetadataProviderPayload["key"];
}) {
  return settingsRequest<MetadataProvidersSettings>(
    "/api/settings/metadata",
    "DELETE",
    payload,
    "Could not remove metadata provider.",
  );
}

export async function testMetadataProvider(payload: MetadataProviderPayload) {
  const response = await fetch("/api/metadata/providers/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await readResponse(response, "Metadata provider connection test failed.");
}

export async function getArtworkProviders() {
  const response = await fetch("/api/settings/artwork", { cache: "no-store" });
  const data = await readResponse<ArtworkSettings>(
    response,
    "Could not load artwork providers.",
  );

  if (!data.settings) {
    throw new Error("Could not load artwork providers.");
  }

  return data.settings;
}

export function addArtworkProvider(payload: ArtworkProviderPayload) {
  return settingsRequest<ArtworkSettings>(
    "/api/settings/artwork",
    "POST",
    payload,
    "Could not add artwork provider.",
  );
}

export function updateArtworkProvider(payload: ArtworkProviderPayload) {
  return settingsRequest<ArtworkSettings>(
    "/api/settings/artwork",
    "PUT",
    payload,
    "Could not update artwork provider.",
  );
}

export function removeFanartProvider() {
  return settingsRequest<ArtworkSettings>(
    "/api/settings/artwork",
    "DELETE",
    { key: "fanart" },
    "Could not remove Fanart.tv.",
  );
}

export function resetCoverArtArchiveProvider() {
  return settingsRequest<ArtworkSettings>(
    "/api/settings/artwork",
    "DELETE",
    { key: "cover-art-archive" },
    "Could not reset Cover Art Archive.",
  );
}

export async function testArtworkProvider(payload: ArtworkProviderPayload) {
  const response = await fetch("/api/artwork/providers/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await readResponse(response, "Artwork provider connection test failed.");
}

export async function getLibraryProviders() {
  const response = await fetch("/api/settings/library", { cache: "no-store" });
  const data = await readResponse<LibraryProvidersSettings>(
    response,
    "Could not load Library providers.",
  );

  if (!data.settings) {
    throw new Error("Could not load Library providers.");
  }

  return data.settings;
}

export function addLibraryProvider(payload: LibraryProviderPayload) {
  return settingsRequest<LibraryProvidersSettings>(
    "/api/settings/library",
    "POST",
    payload,
    "Could not add Library provider.",
  );
}

export function updateLibraryProvider(payload: LibraryProviderPayload) {
  return settingsRequest<LibraryProvidersSettings>(
    "/api/settings/library",
    "PUT",
    payload,
    "Could not update Library provider.",
  );
}

export function removeLibraryProvider(payload: {
  key: LibraryProviderPayload["key"];
}) {
  return settingsRequest<LibraryProvidersSettings>(
    "/api/settings/library",
    "DELETE",
    payload,
    "Could not remove Library provider.",
  );
}

export async function testLibraryProvider(payload: LibraryProviderPayload) {
  const response = await fetch("/api/library/providers/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await readResponse(response, "Library provider connection test failed.");
}

export async function apiFetch(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  if (response.status === 401 && typeof window !== "undefined") {
    // Clear all browser-side application state at an account boundary.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }
  return response;
}

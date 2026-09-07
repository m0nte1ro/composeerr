import { db } from "@/lib/server/db";

type CacheRow = {
  value_json: string;
};

export function getProviderCache<T>(namespace: string, key: string): T | null {
  const now = Date.now();
  const row = db
    .prepare(
      `
        SELECT value_json
        FROM provider_cache
        WHERE namespace = ? AND cache_key = ? AND expires_at > ?
      `,
    )
    .get(namespace, key, now) as CacheRow | undefined;

  if (!row) {
    db.prepare(
      "DELETE FROM provider_cache WHERE namespace = ? AND cache_key = ? AND expires_at <= ?",
    ).run(namespace, key, now);
    return null;
  }

  try {
    return JSON.parse(row.value_json) as T;
  } catch {
    db.prepare(
      "DELETE FROM provider_cache WHERE namespace = ? AND cache_key = ?",
    ).run(namespace, key);
    return null;
  }
}

export function setProviderCache(
  namespace: string,
  key: string,
  value: unknown,
  ttlMs: number,
) {
  db.prepare(
    `
      INSERT INTO provider_cache (
        namespace,
        cache_key,
        value_json,
        expires_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(namespace, cache_key) DO UPDATE SET
        value_json = excluded.value_json,
        expires_at = excluded.expires_at,
        updated_at = CURRENT_TIMESTAMP
    `,
  ).run(namespace, key, JSON.stringify(value), Date.now() + ttlMs);
}
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

function isSqliteBusy(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "SQLITE_BUSY"
  );
}

type ComposeerrDatabase = ReturnType<typeof createDatabase>;

function createDatabase() {
  const dataDirectory =
    process.env.COMPOSEERR_DATA_DIR ??
    path.join(process.cwd(), "data");

  fs.mkdirSync(dataDirectory, {
    recursive: true,
  });

  const databasePath = path.join(dataDirectory, "composeerr.db");

  const database = new Database(databasePath, {
    timeout: 5000,
  });

  database.pragma("busy_timeout = 5000");

  try {
    database.pragma("journal_mode = WAL");
  } catch (error) {
    if (!isSqliteBusy(error)) {
      throw error;
    }

    console.warn(
      "Composeerr DB lock detected while enabling WAL; continuing with existing mode.",
    );
  }

  database.pragma("foreign_keys = ON");

  database.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return database;
}

const globalForDatabase = globalThis as unknown as {
  composeerrDatabase?: ComposeerrDatabase;
};

/*
 * Lazily create the SQLite connection.
 *
 * This is important for Next.js production builds:
 * route modules can be imported concurrently while Next
 * collects page data. Merely importing this module must
 * therefore NOT open or initialise SQLite.
 */
export function getDatabase(): ComposeerrDatabase {
  if (!globalForDatabase.composeerrDatabase) {
    globalForDatabase.composeerrDatabase = createDatabase();
  }

  return globalForDatabase.composeerrDatabase;
}

/*
 * Backwards-compatible lazy proxy.
 *
 * Existing code can continue doing:
 *
 *   import { db } from "@/lib/server/db";
 *   db.prepare(...);
 *
 * Accessing a property/method is what causes the real
 * database connection to be created.
 */
export const db = new Proxy({} as ComposeerrDatabase, {
  get(_target, property) {
    const database = getDatabase();

    const value = Reflect.get(database, property, database);

    /*
     * better-sqlite3 methods rely on their instance as
     * `this`, so bind methods back to the actual DB.
     */
    if (typeof value === "function") {
      return value.bind(database);
    }

    return value;
  },

  set(_target, property, value) {
    const database = getDatabase();

    return Reflect.set(database, property, value, database);
  },
});

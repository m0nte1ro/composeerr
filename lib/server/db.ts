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

function createDatabase() {
  const dataDirectory =
    process.env.COMPOSEERR_DATA_DIR ?? path.join(process.cwd(), "data");

  fs.mkdirSync(dataDirectory, {
    recursive: true,
  });

  const databasePath = path.join(dataDirectory, "composeerr.db");

  const database = new Database(databasePath, {
    timeout: 5000,
  });

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
  composeerrDatabase?: ReturnType<typeof createDatabase>;
};

export const db = globalForDatabase.composeerrDatabase ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.composeerrDatabase = db;
}

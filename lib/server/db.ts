import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

function createDatabase() {
  const dataDirectory =
    process.env.COMPOSEERR_DATA_DIR ??
    path.join(process.cwd(), "data");

  fs.mkdirSync(dataDirectory, {
    recursive: true,
  });

  const databasePath = path.join(
    dataDirectory,
    "composeerr.db",
  );

  const database = new Database(databasePath);

  database.pragma("journal_mode = WAL");
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

export const db =
  globalForDatabase.composeerrDatabase ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.composeerrDatabase = db;
}
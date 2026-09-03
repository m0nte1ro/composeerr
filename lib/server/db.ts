import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATABASE_SCHEMA_VERSION = 1;

function isSqliteBusy(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "SQLITE_BUSY"
  );
}

type ComposeerrDatabase = ReturnType<typeof createDatabase>;

function applyDatabaseSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      task_key TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      schedule_json TEXT NOT NULL,
      last_run_at TEXT,
      last_success_at TEXT,
      next_run_at TEXT,
      last_duration_ms INTEGER,
      last_status TEXT NOT NULL DEFAULT 'idle',
      last_summary TEXT,
      lock_token TEXT,
      lock_expires_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scheduled_task_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_key TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL,
      duration_ms INTEGER,
      summary TEXT,
      FOREIGN KEY (task_key) REFERENCES scheduled_tasks(task_key)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS scheduled_task_runs_task_started_idx
      ON scheduled_task_runs(task_key, started_at DESC);
  `);
}

function createDatabase() {
  const dataDirectory =
    process.env.COMPOSEERR_DATA_DIR ?? path.join(process.cwd(), "data");

  fs.mkdirSync(dataDirectory, { recursive: true });

  const databasePath = path.join(dataDirectory, "composeerr.db");
  const database = new Database(databasePath, { timeout: 5000 });

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

  return database;
}

const globalForDatabase = globalThis as unknown as {
  composeerrDatabase?: ComposeerrDatabase;
  composeerrDatabaseSchemaVersion?: number;
};

/*
 * Lazily create the SQLite connection.
 *
 * Route modules can be imported concurrently during production builds, so
 * importing this module must not open or initialize SQLite.
 */
export function getDatabase(): ComposeerrDatabase {
  if (!globalForDatabase.composeerrDatabase) {
    globalForDatabase.composeerrDatabase = createDatabase();
  }

  if (globalForDatabase.composeerrDatabaseSchemaVersion !== DATABASE_SCHEMA_VERSION) {
    applyDatabaseSchema(globalForDatabase.composeerrDatabase);
    globalForDatabase.composeerrDatabaseSchemaVersion = DATABASE_SCHEMA_VERSION;
  }

  return globalForDatabase.composeerrDatabase;
}

/* Existing modules can keep using db.prepare(...); property access initializes it. */
export const db = new Proxy({} as ComposeerrDatabase, {
  get(_target, property) {
    const database = getDatabase();
    const value = Reflect.get(database, property, database);

    return typeof value === "function" ? value.bind(database) : value;
  },

  set(_target, property, value) {
    const database = getDatabase();
    return Reflect.set(database, property, value, database);
  },
});

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import Database from "better-sqlite3";

const run = promisify(execFile);
test("explicit instance reset backs up records and keeps the schema version", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "composeerr-reset-test-"),
  );
  const database = new Database(path.join(directory, "composeerr.db"));
  try {
    database.exec(
      "CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL); PRAGMA user_version = 5;",
    );
    database
      .prepare("INSERT INTO app_settings VALUES (?, ?)")
      .run("test.preserved-in-backup", "fixture-value");
    const options = { env: { ...process.env, COMPOSEERR_DATA_DIR: directory } };
    await assert.rejects(
      run(process.execPath, ["scripts/reset-instance.mjs"], options),
      /Usage:/,
    );
    assert.equal(
      database.prepare("SELECT COUNT(*) AS count FROM app_settings").get()
        .count,
      1,
    );
    await run(
      process.execPath,
      ["scripts/reset-instance.mjs", "--confirm"],
      options,
    );
    assert.equal(
      database.prepare("SELECT COUNT(*) AS count FROM app_settings").get()
        .count,
      0,
    );
    assert.equal(database.pragma("user_version", { simple: true }), 5);
    const backups = await readdir(path.join(directory, "backups"));
    assert.equal(backups.length, 1);
    const backupPath = path.join(directory, "backups", backups[0]);
    const backup = new Database(backupPath, { readonly: true });
    try {
      assert.equal(
        backup.prepare("SELECT value FROM app_settings").get().value,
        "fixture-value",
      );
    } finally {
      backup.close();
    }
    assert.equal((await stat(backupPath)).mode & 0o777, 0o600);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("setup-only reset reopens the wizard without changing instance records", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "composeerr-setup-reset-test-"));
  const database = new Database(path.join(directory, "composeerr.db"));
  try {
    database.exec(`
      CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE auth_users (id INTEGER PRIMARY KEY, username TEXT NOT NULL);
      CREATE TABLE auth_sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER);
      CREATE TABLE scheduled_tasks (task_key TEXT PRIMARY KEY, enabled INTEGER);
      INSERT INTO auth_users VALUES (1, 'owner');
      INSERT INTO auth_sessions VALUES ('fixture-session', 1);
      INSERT INTO scheduled_tasks VALUES ('fixture-task', 1);
      INSERT INTO app_settings VALUES ('setup.complete', 'true'), ('setup.step', '5'), ('provider.lastfm', 'fixture-secret');
      PRAGMA user_version = 5;
    `);
    const snapshots = ["auth_users", "auth_sessions", "scheduled_tasks"].map((table) => [table, database.prepare(`SELECT * FROM ${table}`).all()]);
    const options = { env: { ...process.env, COMPOSEERR_DATA_DIR: directory } };
    await assert.rejects(run(process.execPath, ["scripts/reset-instance.mjs", "--setup-only"], options), /Usage:/);
    await run(process.execPath, ["scripts/reset-instance.mjs", "--setup-only", "--confirm"], options);
    assert.equal(database.prepare("SELECT value FROM app_settings WHERE key = 'setup.complete'").get().value, "false");
    assert.equal(database.prepare("SELECT value FROM app_settings WHERE key = 'setup.step'").get().value, "1");
    assert.equal(database.prepare("SELECT value FROM app_settings WHERE key = 'provider.lastfm'").get().value, "fixture-secret");
    for (const [table, rows] of snapshots) assert.deepEqual(database.prepare(`SELECT * FROM ${table}`).all(), rows);
    assert.equal(database.pragma("user_version", { simple: true }), 5);
    const backups = await readdir(path.join(directory, "backups"));
    assert.equal(backups.length, 1);
    const backup = new Database(path.join(directory, "backups", backups[0]), { readonly: true });
    try { assert.equal(backup.prepare("SELECT value FROM app_settings WHERE key = 'setup.complete'").get().value, "true"); }
    finally { backup.close(); }
  } finally { database.close(); await rm(directory, { recursive: true, force: true }); }
});

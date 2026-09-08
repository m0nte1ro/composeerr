import Database from "better-sqlite3";
import { mkdir, chmod } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const root = fileURLToPath(new URL("../", import.meta.url));
async function main() {
  const args = process.argv.slice(2);
  const setupOnly = args.includes("--setup-only");
  if (!args.includes("--confirm") || args.some((arg) => !["--confirm", "--setup-only"].includes(arg))) {
    throw new Error(
      "Usage: node scripts/reset-instance.mjs [--setup-only] --confirm\nBacks up first. --setup-only reopens setup and preserves accounts and API settings. Without it, clears this instance. Stop the application first. Never run as part of an update.",
    );
  }
  nextEnv.loadEnvConfig(root, process.env.NODE_ENV !== "production", {
    info() {},
    error() {},
  });
  const directory = path.resolve(
    root,
    process.env.COMPOSEERR_DATA_DIR ?? "data",
  );
  const database = new Database(path.join(directory, "composeerr.db"), {
    fileMustExist: true,
    timeout: 5000,
  });
  try {
    database.pragma("foreign_keys = ON");
    const backupDirectory = path.join(directory, "backups");
    await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
    const backup = path.join(
      backupDirectory,
      `before-setup-reset-${new Date().toISOString().replace(/[:.]/g, "-")}.db`,
    );
    await database.backup(backup);
    await chmod(backup, 0o600);
    database
      .transaction(() => {
        if (setupOnly) {
          const write = database.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
          write.run("setup.complete", "false");
          write.run("setup.step", "1");
          return;
        }
        for (const table of [
          "auth_sessions",
          "auth_rate_limits",
          "scheduled_task_runs",
          "scheduled_tasks",
          "provider_cache",
          "auth_users",
          "app_settings",
        ]) {
          if (
            database
              .prepare(
                "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
              )
              .get(table)
          )
            database.exec(`DELETE FROM ${table}`);
        }
        // Keep the schema version. Only instance data is reset.
      })
      .immediate();
    database.pragma("wal_checkpoint(TRUNCATE)");
    console.log(setupOnly
      ? "Setup reopened. Sign in as an administrator and open /setup. Accounts and API settings are preserved."
      : "Instance reset. Open Composeerr to start setup.");
    console.log("Backup: " + backup);
  } finally {
    database.close();
  }
}
main().catch((error) => {
  console.error(
    error.code
      ? "Could not reset the instance. Check database permissions and stop the application first."
      : error.message,
  );
  process.exitCode = 1;
});

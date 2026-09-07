import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { once } from "node:events";
import { mkdtemp, readFile, readdir, rm, mkdir, copyFile, symlink, access } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import Database from "better-sqlite3";

const root = process.cwd();
const execFileAsync = promisify(execFile);

async function routeFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? routeFiles(path.join(directory, entry.name))
    : entry.name === "route.ts" ? [path.join(directory, entry.name)] : []))).flat();
}

test("local accounts and protected application APIs", { timeout: 120_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "composeerr-auth-test-"));
  const database = new Database(path.join(dataDir, "composeerr.db"));
  // Start with a pre-auth settings table to exercise the additive migration.
  database.exec("CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  database.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").run("test.existing-setting", "preserved");
  const portServer = createServer();
  portServer.listen(0, "127.0.0.1");
  await once(portServer, "listening");
  const port = portServer.address().port;
  await new Promise((resolve) => portServer.close(resolve));
  const base = "http://127.0.0.1:" + port;
  let child;
  let logs = "";

  async function start(publicOrigin = base) {
    child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
      cwd: root,
      env: { ...process.env, COMPOSEERR_DATA_DIR: dataDir, COMPOSEERR_ORIGIN: publicOrigin, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => { logs += chunk; });
    child.stderr.on("data", (chunk) => { logs += chunk; });
    for (let i = 0; i < 200; i++) {
      if (child.exitCode !== null) throw new Error("Test server exited: " + logs);
      try {
        const response = await fetch(base + "/api/health");
        if (response.ok) return;
      } catch {}
      await delay(100);
    }
    throw new Error("Test server did not start: " + logs);
  }

  async function stop() {
    if (!child || child.exitCode !== null) return;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    await exited;
  }

  async function request(route, { method = "GET", body, cookie, origin = base, headers = {} } = {}) {
    return fetch(base + route, {
      method,
      headers: {
        ...(method !== "GET" ? { Origin: origin, "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: "manual",
    });
  }
  function cookieOf(response) {
    const value = response.headers.get("set-cookie");
    assert.ok(value?.includes("HttpOnly"));
    assert.ok(value?.includes("SameSite=lax"));
    return value.split(";")[0];
  }
  async function login(username, password) {
    const response = await request("/api/auth/login", { method: "POST", body: { username, password } });
    assert.equal(response.status, 200, await response.clone().text());
    return { cookie: cookieOf(response), ...(await response.json()) };
  }
  const passwordBody = (currentPassword, newPassword) => ({ currentPassword, newPassword, confirmPassword: newPassword });
  let adminCookie;
  let userCookie;
  const protectedRoutes = [];

  try {
    await start();
    await t.test("all application handlers reject anonymous and forged sessions", async () => {
      for (const file of await routeFiles(path.join(root, "app/api"))) {
        const route = "/" + path.relative(path.join(root, "app"), path.dirname(file)).split(path.sep).join("/");
        if (route === "/api/health" || route.startsWith("/api/auth/")) continue;
        const source = await readFile(file, "utf8");
        const methods = [...source.matchAll(/export (?:const (GET|POST|PUT|DELETE|PATCH) =|async function (GET|POST|PUT|DELETE|PATCH)\()/g)].map((match) => match[1] ?? match[2]);
        assert.ok(methods.length, "No tested handlers for " + route);
        for (const method of methods) {
          protectedRoutes.push({ route, method });
          const response = await request(route, { method, ...(method === "GET" ? {} : { body: {} }) });
          assert.equal(response.status, 401, method + " " + route);
          assert.match(response.headers.get("cache-control"), /no-store/);
        }
      }
      assert.ok(protectedRoutes.length >= 30);
      assert.equal((await request("/api/lidarr/request", {
        method: "POST", body: {}, cookie: "composeerr_session=" + "a".repeat(64),
        headers: { "x-middleware-subrequest": "middleware:middleware:middleware:middleware:middleware", "x-user-role": "admin" },
      })).status, 401);
      assert.equal((await request("/")).headers.get("location"), "/login");
      assert.equal((await request("/settings/general")).headers.get("location"), "/login");
    });

    await t.test("bootstrap admin is unique and must change its password", async () => {
      const pages = await Promise.all([request("/login"), request("/register"), request("/login")]);
      for (const page of pages) assert.equal(page.status, 200);
      assert.equal(database.prepare("SELECT COUNT(*) AS count FROM auth_users").get().count, 1);
      assert.equal(database.prepare("SELECT value FROM app_settings WHERE key = 'test.existing-setting'").get().value, "preserved");
      assert.match(await pages[0].text(), /autoComplete="username"/);
      const admin = await login("ADMIN", "admin");
      adminCookie = admin.cookie;
      assert.equal(admin.user.role, "admin");
      assert.equal(admin.user.mustChangePassword, true);
      assert.equal((await request("/", { cookie: adminCookie })).headers.get("location"), "/settings/general");
      assert.equal((await request("/api/lidarr/request", { method: "POST", body: {}, cookie: adminCookie })).status, 403);
      assert.equal((await request("/api/settings/general", { method: "PUT", body: { registrationEnabled: true }, cookie: adminCookie })).status, 403);
      assert.equal((await request("/api/auth/register", { method: "POST", body: { username: "early", password: "password123", confirmPassword: "password123" } })).status, 403);
      const first = await request("/api/auth/password", { method: "PUT", cookie: adminCookie, body: passwordBody("admin", "Owner password 123") });
      assert.equal(first.status, 200, await first.clone().text());
      const oldCookie = adminCookie;
      adminCookie = cookieOf(first);
      assert.equal((await first.json()).user.mustChangePassword, false);
      assert.equal((await request("/api/auth/session", { cookie: oldCookie })).status, 401);
    });

    await t.test("admin can open registration; accounts can never self-promote", async () => {
      const enabled = await request("/api/settings/general", { method: "PUT", cookie: adminCookie, body: { registrationEnabled: true } });
      assert.equal(enabled.status, 200);
      assert.equal((await request("/api/settings/general", { cookie: adminCookie })).status, 200);
      const response = await request("/api/auth/register", {
        method: "POST", body: { username: "listener", password: "Listener password 123", confirmPassword: "Listener password 123", role: "admin", mustChangePassword: false },
      });
      assert.equal(response.status, 200);
      userCookie = cookieOf(response);
      const body = await response.json();
      assert.equal(body.user.role, "user");
      assert.equal("password_hash" in body.user, false);
      const stored = database.prepare("SELECT * FROM auth_users WHERE username = 'listener'").get();
      assert.match(stored.password_hash, /^scrypt:32768:8:3:/);
      assert.notEqual(stored.password_hash, "Listener password 123");
      const rawToken = userCookie.split("=")[1];
      assert.equal(database.prepare("SELECT COUNT(*) AS count FROM auth_sessions WHERE token_hash = ?").get(rawToken).count, 0);
    });

    await t.test("ordinary users can request albums but cannot read or edit instance settings", async () => {
      for (const { route, method } of protectedRoutes) {
        const adminOnly = route.startsWith("/api/settings/") || route.endsWith("/providers/test") ||
          ["/api/lidarr/test", "/api/lidarr/options", "/api/content/musicbrainz/test", "/api/scheduled-tasks/run"].includes(route);
        if (!adminOnly) continue;
        assert.equal((await request(route, { method, cookie: userCookie, ...(method === "GET" ? {} : { body: {} }) })).status, 403, method + " " + route);
      }
      // Invalid input is handled only after successful authentication. No live Lidarr call.
      assert.equal((await request("/api/lidarr/request", { method: "POST", cookie: userCookie, body: {} })).status, 400);
      const general = await request("/settings/general", { cookie: userCookie });
      const html = await general.text();
      assert.match(html, /Current password/);
      assert.match(html, /Confirm new password/);
      assert.doesNotMatch(html, /Allow new registrations/);
      assert.doesNotMatch(html, /href="\/settings\/lidarr"/);
      for (const section of ["lidarr", "library", "content", "metadata", "artwork", "scheduled-tasks"]) {
        const response = await request("/settings/" + section, { cookie: userCookie });
        assert.ok(response.headers.get("location") === "/settings/general" ||
          (await response.text()).includes('url=/settings/general'));
      }
    });

    await t.test("password validation, case-insensitive uniqueness and CSRF checks", async () => {
      assert.equal((await request("/api/auth/register", { method: "POST", body: { username: "LISTENER", password: "password123", confirmPassword: "password123" } })).status, 409);
      assert.equal((await request("/api/auth/register", { method: "POST", body: { username: "bad", password: "short", confirmPassword: "short" } })).status, 400);
      assert.equal((await request("/api/auth/register", { method: "POST", body: null })).status, 400);
      assert.equal((await request("/api/auth/password", { method: "PUT", cookie: userCookie, body: passwordBody("wrong", "Next password 123") })).status, 400);
      assert.equal((await request("/api/auth/password", { method: "PUT", cookie: userCookie, body: { ...passwordBody("Listener password 123", "Next password 123"), confirmPassword: "mismatch" } })).status, 400);
      for (const route of ["/api/auth/login", "/api/auth/logout", "/api/auth/register", "/api/auth/password", "/api/settings/general", "/api/lidarr/request"]) {
        const method = ["/api/auth/password", "/api/settings/general"].includes(route) ? "PUT" : "POST";
        assert.equal((await request(route, { method, cookie: adminCookie, body: {}, origin: "https://attacker.example" })).status, 403, route);
        assert.equal((await request(route, { method, cookie: adminCookie, body: {}, origin: "" })).status, 403, route + " missing origin");
      }
      assert.equal((await request("/api/auth/login", { method: "POST", body: { username: "listener", password: "x".repeat(5000) } })).status, 413);
    });

    await t.test("closing registration blocks the API and preserves existing access", async () => {
      const response = await request("/api/settings/general", { method: "PUT", cookie: adminCookie, body: { registrationEnabled: false } });
      assert.equal(response.status, 200);
      assert.equal((await request("/api/auth/register", { method: "POST", body: { username: "closed", password: "password123", confirmPassword: "password123" } })).status, 403);
      assert.equal((await request("/api/auth/session", { cookie: userCookie })).status, 200);
      assert.match(await (await request("/register")).text(), /Registration is currently closed/);
    });

    await t.test("sessions survive a restart and password changes sign out other devices", async () => {
      const secondDevice = await login("listener", "Listener password 123");
      await stop();
      await start();
      assert.equal((await request("/api/auth/session", { cookie: userCookie })).status, 200);
      assert.equal((await request("/api/auth/session", { cookie: secondDevice.cookie })).status, 200);
      const setting = await request("/api/settings/general", { cookie: adminCookie });
      assert.equal((await setting.json()).registrationEnabled, false);
      assert.equal(database.prepare("SELECT COUNT(*) AS count FROM auth_users WHERE role = 'admin'").get().count, 1);
      const changed = await request("/api/auth/password", { method: "PUT", cookie: userCookie, body: passwordBody("Listener password 123", "New listener password 456") });
      assert.equal(changed.status, 200);
      const previousCookie = userCookie;
      userCookie = cookieOf(changed);
      assert.equal((await request("/api/auth/session", { cookie: previousCookie })).status, 401);
      assert.equal((await request("/api/auth/session", { cookie: secondDevice.cookie })).status, 401);
      assert.equal((await request("/api/auth/session", { cookie: userCookie })).status, 200);
      assert.equal((await request("/api/auth/login", { method: "POST", body: { username: "listener", password: "Listener password 123" } })).status, 401);
      await login("listener", "New listener password 456");
      assert.equal((await request("/api/auth/login", { method: "POST", body: { username: "admin", password: "admin" } })).status, 401);
    });

    await t.test("logout and expiration revoke access; login attempts are limited", async () => {
      const logout = await request("/api/auth/logout", { method: "POST", cookie: userCookie });
      assert.equal(logout.status, 200);
      assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
      assert.equal((await request("/api/auth/session", { cookie: userCookie })).status, 401);
      const device = await login("listener", "New listener password 456");
      database.prepare("UPDATE auth_sessions SET expires_at = 0 WHERE user_id = (SELECT id FROM auth_users WHERE username = 'listener')").run();
      assert.equal((await request("/api/auth/session", { cookie: device.cookie })).status, 401);
      for (let i = 0; i < 10; i++) {
        assert.equal((await request("/api/auth/login", { method: "POST", body: { username: "unknown", password: "wrong" } })).status, 401);
      }
      const blocked = await request("/api/auth/login", { method: "POST", body: { username: "unknown", password: "wrong" }, headers: { "x-forwarded-for": "198.51.100.1" } });
      assert.equal(blocked.status, 429);
      assert.ok(blocked.headers.get("retry-after"));
    });


    await t.test("Docker recovery works without the source tree and preserves other accounts and settings", async () => {
      const runtimeDir = path.join(dataDir, "recovery-runtime");
      await mkdir(path.join(runtimeDir, "scripts"), { recursive: true });
      await mkdir(path.join(runtimeDir, "lib/server/auth"), { recursive: true });
      // Stage the files copied by Docker against only the standalone runtime dependencies.
      await copyFile(path.join(root, "scripts/reset-password.mjs"), path.join(runtimeDir, "scripts/reset-password.mjs"));
      await copyFile(path.join(root, "lib/server/auth/password-crypto.mjs"), path.join(runtimeDir, "lib/server/auth/password-crypto.mjs"));
      await symlink(path.join(root, ".next/standalone/node_modules"), path.join(runtimeDir, "node_modules"), "dir");
      const command = path.join(runtimeDir, "scripts/reset-password.mjs");
      const env = { ...process.env, NODE_ENV: "production", COMPOSEERR_DATA_DIR: dataDir };
      const run = (args, overrides = {}) => execFileAsync(process.execPath, [command, ...args], {
        cwd: runtimeDir, env: { ...env, ...overrides },
      });

      assert.match((await run(["--help"])).stdout, /Usage:/);
      const before = database.prepare("SELECT * FROM auth_users ORDER BY id").all();
      await assert.rejects(run(["missing-user"]), /Account not found/);
      await assert.rejects(run(["admin", "not-a-password-argument"]), /Usage:/);
      assert.deepEqual(database.prepare("SELECT * FROM auth_users ORDER BY id").all(), before);
      const missingDir = path.join(dataDir, "missing-instance");
      await assert.rejects(run(["admin"], { COMPOSEERR_DATA_DIR: missingDir }), /Cannot open the existing/);
      await assert.rejects(access(path.join(missingDir, "composeerr.db")));

      const listener = await login("listener", "New listener password 456");
      const settings = database.prepare("SELECT * FROM app_settings ORDER BY key").all();
      const otherUser = database.prepare("SELECT * FROM auth_users WHERE username = 'listener'").get();
      const hashBucket = (name) => createHash("sha256").update(name).digest("hex");
      for (const bucket of ["login:admin", "password:1", "login:unrelated"]) {
        database.prepare("INSERT OR REPLACE INTO auth_rate_limits (bucket, attempts, resets_at) VALUES (?, 10, ?)")
          .run(hashBucket(bucket), Date.now() + 300_000);
      }
      const { stdout } = await run(["ADMIN"]);
      const temporaryPassword = stdout.match(/Temporary password: ([A-Za-z0-9_-]{24})/)?.[1];
      assert.ok(temporaryPassword);
      assert.equal((await request("/api/auth/session", { cookie: adminCookie })).status, 401);
      assert.equal((await request("/api/auth/session", { cookie: listener.cookie })).status, 200);
      assert.deepEqual(database.prepare("SELECT * FROM app_settings ORDER BY key").all(), settings);
      assert.deepEqual(database.prepare("SELECT * FROM auth_users WHERE username = 'listener'").get(), otherUser);
      assert.equal(database.prepare("SELECT COUNT(*) AS count FROM auth_rate_limits WHERE bucket IN (?, ?)")
        .get(hashBucket("login:admin"), hashBucket("password:1")).count, 0);
      assert.ok(database.prepare("SELECT 1 FROM auth_rate_limits WHERE bucket = ?").get(hashBucket("login:unrelated")));
      assert.equal((await request("/api/auth/login", {
        method: "POST", body: { username: "admin", password: "Owner password 123" },
      })).status, 401);
      const recovered = await login("admin", temporaryPassword);
      assert.equal(recovered.user.mustChangePassword, true);
      assert.equal(recovered.user.role, "admin");
      assert.equal((await request("/api/library", { cookie: recovered.cookie })).status, 403);
      const response = await request("/api/auth/password", {
        method: "PUT", cookie: recovered.cookie,
        body: passwordBody(temporaryPassword, "Owner recovered password 789"),
      });
      assert.equal(response.status, 200);
      adminCookie = cookieOf(response);
      assert.equal((await response.json()).user.mustChangePassword, false);
      assert.match(await (await request("/login")).text(), /Forgot password/);
    });

    await t.test("HTTPS proxy origin sets secure cookies and rejects other origins", async () => {
      await stop();
      const publicOrigin = "https://music.example.test";
      await start(publicOrigin);
      const body = { username: "admin", password: "Owner recovered password 789" };
      assert.equal((await request("/api/auth/login", { method: "POST", body })).status, 403);
      const response = await request("/api/auth/login", { method: "POST", body, origin: publicOrigin });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("set-cookie"), /; Secure/);
      assert.match(response.headers.get("set-cookie"), /HttpOnly/);
      assert.equal((await request("/api/health")).status, 200);
    });
  } finally {
    await stop();
    database.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});

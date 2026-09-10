import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { once } from "node:events";
import { mkdtemp, readFile, readdir, rm, mkdir, copyFile, symlink, access } from "node:fs/promises";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
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

test("local accounts and protected application APIs", { timeout: 180_000 }, async (t) => {
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
    const manifest = JSON.parse(await readFile(path.join(root, ".next/prerender-manifest.json"), "utf8"));
    for (const route of ["/login", "/register", "/setup"]) {
      assert.equal(manifest.routes[route], undefined, `${route} must never be prerendered from build-time setup state`);
    }
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
      assert.equal((await request("/")).headers.get("location"), "/setup");
      assert.equal((await request("/settings/general")).headers.get("location"), "/setup");
    });

    await t.test("fresh setup creates one administrator, resumes and protects application access", async () => {
      assert.equal((await request("/login")).headers.get("location"), "/setup");
      assert.equal((await request("/register")).headers.get("location"), "/setup");
      assert.equal(database.prepare("SELECT COUNT(*) AS count FROM auth_users").get().count, 0);
      assert.match(await (await request("/setup")).text(), /Create your administrator account/);
      assert.equal((await request("/api/auth/setup", { method: "POST", origin: "https://attacker.example", body: {} })).status, 403);
      assert.equal((await request("/api/auth/setup", { method: "POST", body: { username: "admin", password: "short", confirmPassword: "short" } })).status, 400);
      const body = { username: "admin", password: "Initial owner 123", confirmPassword: "Initial owner 123", role: "user" };
      const results = await Promise.all([request("/api/auth/setup", { method: "POST", body }), request("/api/auth/setup", { method: "POST", body })]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      adminCookie = cookieOf(results.find((r) => r.status === 200));
      const admin = await login("ADMIN", "Initial owner 123");
      assert.equal(admin.user.role, "admin");
      assert.equal(admin.user.mustChangePassword, false);
      assert.equal(database.prepare("SELECT COUNT(*) AS count FROM auth_users").get().count, 1);
      assert.equal(database.prepare("SELECT value FROM app_settings WHERE key = 'test.existing-setting'").get().value, "preserved");
      assert.equal((await request("/", { cookie: adminCookie })).headers.get("location"), "/setup");
      assert.equal((await request("/api/lidarr/request", { method: "POST", body: {}, cookie: adminCookie })).status, 403);
      assert.equal((await request("/api/auth/register", { method: "POST", body: { username: "early", password: "password123", confirmPassword: "password123" } })).status, 403);
      assert.equal((await request("/api/setup", { method: "PUT", cookie: adminCookie, body: { step: 3, complete: false } })).status, 200);
      await stop(); await start();
      assert.equal((await (await request("/api/setup", { cookie: adminCookie })).json()).setup.step, 3);
      // Connection-test gating is intentionally frontend-only.
      assert.equal((await request("/api/setup", { method: "PUT", cookie: adminCookie, body: { step: 5, complete: true } })).status, 200);
      assert.equal((await request("/api/auth/setup", { method: "POST", body })).status, 409);
      const changed = await request("/api/auth/password", { method: "PUT", cookie: adminCookie, body: passwordBody("Initial owner 123", "Owner password 123") });
      assert.equal(changed.status, 200);
      const oldCookie = adminCookie; adminCookie = cookieOf(changed);
      assert.equal((await request("/api/auth/session", { cookie: oldCookie })).status, 401);
    });

    await t.test("completed setup keeps anonymous auth pages dynamic after restart", async () => {
      async function checkAuthPages() {
        assert.equal(database.prepare("SELECT value FROM app_settings WHERE key = 'setup.complete'").get().value, "true");
        assert.equal((await request("/")).headers.get("location"), "/login");
        assert.equal((await request("/setup")).headers.get("location"), "/");
        for (const route of ["/login", "/register"]) {
          const response = await request(route);
          assert.equal(response.status, 200, `${route} must read the current database`);
          assert.equal(response.headers.get("location"), null);
          assert.notEqual(response.headers.get("x-nextjs-cache"), "HIT");
          assert.match(response.headers.get("cache-control") ?? "", /no-store/);
        }
      }
      await checkAuthPages();
      await stop(); await start();
      await checkAuthPages();
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
          ["/api/lidarr/test", "/api/lidarr/options", "/api/content/musicbrainz/test", "/api/search/test", "/api/setup", "/api/scheduled-tasks/run"].includes(route);
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
      for (const section of ["lidarr", "search", "library", "content", "metadata", "artwork", "scheduled-tasks"]) {
        const response = await request("/settings/" + section, { cookie: userCookie });
        assert.ok(response.headers.get("location") === "/settings/general" ||
          (await response.text()).includes('url=/settings/general'));
      }
    });

    await t.test("administrators manage users and temporary passwords revoke access", async () => {
      const values = { username: "managed", password: "Managed initial 123", confirmPassword: "Managed initial 123", role: "user" };
      assert.equal((await request("/api/settings/users", { method: "POST", cookie: userCookie, body: values })).status, 403);
      assert.equal((await request("/api/settings/users", { method: "POST", cookie: adminCookie, origin: "https://attacker.example", body: values })).status, 403);
      const created = await request("/api/settings/users", { method: "POST", cookie: adminCookie, body: values });
      assert.equal(created.status, 200);
      const users = (await created.json()).users;
      const managed = users.find((u) => u.username === "managed");
      assert.ok(managed.mustChangePassword);
      assert.ok(users.every((u) => !("password_hash" in u)));
      assert.equal((await request("/api/settings/users", { method: "POST", cookie: adminCookie, body: { ...values, username: "MANAGED" } })).status, 409);
      const session = await login("managed", values.password);
      assert.equal((await request("/api/library", { cookie: session.cookie })).status, 403);
      const reset = await request("/api/settings/users", { method: "PATCH", cookie: adminCookie, body: { id: managed.id } });
      assert.equal(reset.status, 200);
      assert.match(reset.headers.get("cache-control"), /no-store/);
      const temporary = (await reset.json()).temporaryPassword;
      assert.match(temporary, /^[A-Za-z0-9_-]{24}$/);
      assert.equal((await request("/api/auth/session", { cookie: session.cookie })).status, 401);
      const recovered = await login("managed", temporary);
      const changed = await request("/api/auth/password", { method: "PUT", cookie: recovered.cookie, body: passwordBody(temporary, "Managed changed 456") });
      assert.equal(changed.status, 200);
      const active = cookieOf(changed);
      assert.equal((await request("/api/settings/users", { method: "DELETE", cookie: adminCookie, body: { id: 1 } })).status, 400);
      assert.equal((await request("/api/settings/users", { method: "PATCH", cookie: adminCookie, body: { id: 1 } })).status, 400);
      assert.equal((await request("/api/settings/users", { method: "DELETE", cookie: adminCookie, body: { id: managed.id } })).status, 200);
      assert.equal((await request("/api/auth/session", { cookie: active })).status, 401);
      assert.equal((await request("/api/settings/users", { method: "PATCH", cookie: adminCookie, body: { id: managed.id } })).status, 404);
    });

    await t.test("Search and Content use independent endpoints, tests and shared secrets", async () => {
      const calls = [];
      const mbid = "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d";
      const fixture = createHttpServer((req, res) => {
        const url = new URL(req.url, "http://fixture"); calls.push({ path: url.pathname, query: url.searchParams.has("query"), auth: req.headers.authorization, method: url.searchParams.get("method") });
        res.setHeader("Content-Type", "application/json");
        if (url.pathname.startsWith("/content") && url.searchParams.has("query")) { res.statusCode = 503; res.end(JSON.stringify({ error: "Search is disabled" })); return; }
        if (url.pathname === "/lastfm") {
          const kind = url.searchParams.get("method").split(".")[0];
          const items = [null, "", undefined, "not-an-mbid", "00000000-0000-0000-0000-000000000000"].map((id) => ({ name: "Unlinked result", artist: "The Beatles", mbid: id, listeners: "1000" }));
          if (url.searchParams.get(kind) !== "unlinked-only") items.push({ name: "The Beatles", artist: "The Beatles", mbid, listeners: "100" });
          res.end(JSON.stringify({ results: { [kind + "matches"]: { [kind]: items } } })); return;
        }
        if (url.pathname.endsWith("/release-group/")) { res.end(JSON.stringify({ "release-groups": [] })); return; }
        res.end(JSON.stringify(url.searchParams.has("query") ? { artists: [{ id: null, name: "Unlinked artist", score: 100 }, { id: "invalid", name: "Invalid artist", score: 100 }, { id: mbid, name: "The Beatles", score: 100 }] } : { id: mbid, name: "The Beatles", title: "The Beatles" }));
      });
      fixture.listen(0, "127.0.0.1"); await once(fixture, "listening");
      const endpoint = "http://127.0.0.1:" + fixture.address().port;
      const content = { url: endpoint + "/content/ws/2", authMode: "basic", username: "mirror", password: "fixture-password" };
      const search = { engine: "musicbrainz", musicbrainz: { url: endpoint + "/search/ws/2", authMode: "none" } };
      try {
        assert.equal((await request("/api/content/musicbrainz/test", { method: "POST", cookie: adminCookie, body: content })).status, 200);
        assert.equal(calls.at(-1).path, "/content/ws/2/artist/" + mbid);
        assert.equal(calls.at(-1).query, false);
        assert.equal(calls.at(-1).auth, "Basic " + Buffer.from("mirror:fixture-password").toString("base64"));
        assert.equal((await request("/api/search/test", { method: "POST", cookie: adminCookie, body: { engine: "musicbrainz", musicbrainz: content } })).status, 400);
        assert.equal((await request("/api/search/test", { method: "POST", cookie: adminCookie, body: search })).status, 200);
        assert.ok(calls.at(-1).query);
        const saved = await request("/api/settings/content/musicbrainz", { method: "PUT", cookie: adminCookie, body: content });
        assert.equal(saved.status, 200);
        assert.doesNotMatch(await saved.text(), /fixture-password/);
        assert.equal((await request("/api/settings/search", { method: "PUT", cookie: adminCookie, body: search })).status, 200);
        const canonicalSearch = await request("/api/metadata/search?type=artist&q=Beatles", { cookie: adminCookie });
        assert.equal(canonicalSearch.status, 200);
        assert.deepEqual((await canonicalSearch.json()).results.map((result) => result.musicBrainzId), [mbid]);
        assert.equal((await request("/api/metadata/details?type=artist&id=" + mbid, { cookie: adminCookie })).status, 200);
        const lastfm = { engine: "lastfm", lastfm: { key: "lastfm", enabled: true, url: endpoint + "/lastfm", authMode: "native", nativeSecret: "fixture-lastfm-key" } };
        assert.equal((await request("/api/search/test", { method: "POST", cookie: adminCookie, body: lastfm })).status, 200);
        assert.equal(calls.at(-1).method, "artist.search");
        const lastfmSaved = await request("/api/settings/search", { method: "PUT", cookie: adminCookie, body: lastfm });
        assert.equal(lastfmSaved.status, 200);
        assert.doesNotMatch(await lastfmSaved.text(), /fixture-lastfm-key/);
        const discoveryResponse = await request("/api/metadata/search?type=artist&q=Beatles", { cookie: adminCookie });
        assert.equal(discoveryResponse.status, 200);
        const discovery = await discoveryResponse.json();
        assert.equal(discovery.provider, "lastfm");
        assert.deepEqual(discovery.results.map((result) => result.musicBrainzId), [mbid]);
        for (const type of ["artist", "album", "song"]) {
          const beforeSearch = calls.length;
          const response = await request(`/api/metadata/search?type=${type}&q=Beatles`, { cookie: adminCookie });
          assert.equal(response.status, 200);
          const results = (await response.json()).results;
          assert.deepEqual(results.map((result) => [result.kind, result.musicBrainzId]), [[type, mbid]]);
          assert.ok(calls.slice(beforeSearch).every((call) => call.path === "/lastfm"), "Search must not verify result IDs through MusicBrainz lookups");
          const beforeEmpty = calls.length;
          const empty = await request(`/api/metadata/search?type=${type}&q=unlinked-only`, { cookie: adminCookie });
          assert.equal(empty.status, 200);
          assert.deepEqual((await empty.json()).results, []);
          assert.ok(calls.slice(beforeEmpty).every((call) => call.path === "/lastfm"), "Missing IDs must not trigger MusicBrainz lookups");
        }
        // Older clients may still submit an unlinked result directly to the resolver.
        assert.equal((await request("/api/metadata/resolve", { method: "POST", cookie: adminCookie, body: { ...discovery.results[0], musicBrainzId: null } })).status, 404);
        assert.equal((await request("/api/settings/metadata", { method: "DELETE", cookie: adminCookie, body: { key: "lastfm" } })).status, 400);
        // Secrets survive partial updates, and enrichment being disabled does not disable search.
        delete lastfm.lastfm.nativeSecret;
        assert.equal((await request("/api/settings/search", { method: "PUT", cookie: adminCookie, body: lastfm })).status, 200);
        const metadata = (await (await request("/api/settings/metadata", { cookie: adminCookie })).json()).settings;
        assert.equal(metadata.providers.find((p) => p.key === "lastfm").enabled, false);
        assert.equal((await request("/api/settings/search", { method: "PUT", cookie: adminCookie, body: search })).status, 200);
        assert.equal((await request("/api/settings/content/musicbrainz", { method: "PUT", cookie: adminCookie, body: { ...content, password: undefined, useSearchSettings: true } })).status, 200);
        assert.equal((await request("/api/content/musicbrainz/test", { method: "POST", cookie: adminCookie, body: { ...content, useSearchSettings: true } })).status, 200);
        assert.equal(calls.at(-1).path, "/search/ws/2/artist/" + mbid);
        assert.equal(calls.at(-1).query, false);
        assert.equal((await request("/api/settings/content/musicbrainz", { method: "PUT", cookie: adminCookie, body: { ...content, password: undefined, useSearchSettings: false } })).status, 200);
        assert.equal((await request("/api/content/musicbrainz/test", { method: "POST", cookie: adminCookie, body: { ...content, password: undefined } })).status, 200);
        assert.equal(calls.at(-1).path, "/content/ws/2/artist/" + mbid);
        const settingsBefore = database.prepare("SELECT * FROM app_settings ORDER BY key").all();
        await stop(); await start();
        assert.deepEqual(database.prepare("SELECT * FROM app_settings ORDER BY key").all(), settingsBefore);
      } finally { await new Promise((resolve) => fixture.close(resolve)); }
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

    await t.test("legacy upgrade preserves accounts, sessions and provider configuration", async () => {
      await stop();
      const users = database.prepare("SELECT * FROM auth_users ORDER BY id").all();
      const providers = database.prepare("SELECT * FROM app_settings WHERE key LIKE 'provider.%' OR key = 'content.musicbrainz' ORDER BY key").all();
      database.prepare("DELETE FROM app_settings WHERE key IN ('setup.complete', 'search.engine', 'search.musicbrainz')").run();
      database.pragma("user_version = 4");
      await start();
      assert.equal(database.pragma("user_version", { simple: true }), 5);
      assert.deepEqual(database.prepare("SELECT * FROM auth_users ORDER BY id").all(), users);
      assert.deepEqual(database.prepare("SELECT * FROM app_settings WHERE key LIKE 'provider.%' OR key = 'content.musicbrainz' ORDER BY key").all(), providers);
      assert.equal((await (await request("/api/setup", { cookie: adminCookie })).json()).setup.complete, true);
      assert.equal(database.prepare("SELECT value FROM app_settings WHERE key = 'search.musicbrainz'").get().value, database.prepare("SELECT value FROM app_settings WHERE key = 'content.musicbrainz'").get().value);
      assert.equal((await request("/api/auth/session", { cookie: adminCookie })).status, 200);
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

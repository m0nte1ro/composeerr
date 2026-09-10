import './helpers/register-typescript.mjs';
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(['next/headers', 'next/server'].includes(specifier) ? `${specifier}.js` : specifier, context);
} });

const directory = mkdtempSync(path.join(tmpdir(), 'composeerr-setup-rendering-'));
process.env.COMPOSEERR_DATA_DIR = directory;
const { getSetupState } = await import('../lib/server/setup.ts');
const { db } = await import('../lib/server/db.ts');
after(() => {
  db.close();
  rmSync(directory, { recursive: true, force: true });
});

// Exercise the actual page bodies with real fixture SQLite state. The framework
// rendering/cache behavior itself is covered by auth.integration.mjs after a build.
function loadPage(route) {
  const source = readFileSync(new URL(`../app/${route}/page.tsx`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  const modules = {
    '@/lib/server/setup': { getSetupState },
    '@/lib/server/auth/sessions': { currentUser: async () => null },
    '@/lib/server/auth/store': { registrationsEnabled: () => false },
    '@/components/auth/AuthForm': { AuthForm: 'AuthForm' },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'next/navigation': { redirect: location => { throw new Error(`redirect:${location}`); } },
  };
  runInNewContext(compiled, { exports, require: name => {
    assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
    return modules[name];
  } });
  return exports;
}

test('login and registration opt out of prerendering before any setup-dependent redirect', () => {
  for (const route of ['login', 'register']) assert.equal(loadPage(route).dynamic, 'force-dynamic');
});

test('fresh, incomplete and completed setup read live string settings, including after reopening SQLite', async () => {
  const login = loadPage('login').default;
  const register = loadPage('register').default;
  assert.deepEqual(getSetupState(), { complete: false, hasAdmin: false, step: 1 });
  await assert.rejects(login(), /redirect:\/setup/);
  await assert.rejects(register(), /redirect:\/setup/);
  db.prepare("INSERT INTO auth_users (username, password_hash, role) VALUES ('fixture-admin', 'unused', 'admin')").run();
  assert.equal((await login()).props.mode, 'login', 'An owner must be able to sign in to resume setup');
  await assert.rejects(register(), /redirect:\/setup/);
  db.prepare("INSERT INTO app_settings (key, value) VALUES ('setup.complete', ?)").run('true');
  assert.equal(getSetupState().complete, true);
  for (let pass = 0; pass < 2; pass++) {
    assert.equal((await login()).props.mode, 'login');
    assert.equal((await register()).props.mode, 'register');
    if (pass === 0) {
      db.close();
      delete globalThis.composeerrDatabase;
      delete globalThis.composeerrDatabaseSchemaVersion;
    }
  }
  assert.equal(db.prepare("SELECT value FROM app_settings WHERE key = 'setup.complete'").get().value, 'true');
});

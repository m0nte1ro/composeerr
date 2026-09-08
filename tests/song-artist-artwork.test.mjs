import './helpers/register-typescript.mjs';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dir = mkdtempSync(join(tmpdir(), 'composeerr-photos-'));
process.env.COMPOSEERR_DATA_DIR = dir;
const { saveSearchSettings } = await import('../lib/server/search-settings.ts');
const { resolveArtistArtworkByName } = await import('../lib/server/providers/artwork-resolver.ts');
const { db } = await import('../lib/server/db.ts');
const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; db.close(); rmSync(dir, { recursive: true, force: true }); });
test('song artist photos use names, share requests and cache independently of MusicBrainz', async () => {
  saveSearchSettings({engine: 'lastfm', lastfm: {key: 'lastfm', enabled: false,
    url: 'https://lastfm.test', authMode: 'native', nativeSecret: 'fixture'}});
  const calls = [];
  globalThis.fetch = async input => {
    const url = new URL(input); calls.push(url);
    assert.equal(url.hostname, 'lastfm.test');
    assert.equal(url.searchParams.get('method'), 'artist.getInfo');
    assert.equal(url.searchParams.get('artist'), 'Tony Bennett');
    assert.equal(url.searchParams.has('mbid'), false);
    return Response.json({artist: {image: [{size: 'large', '#text': 'https://images.test/tony.jpg'}]}});
  };
  const results = await Promise.all([resolveArtistArtworkByName('Tony Bennett'), resolveArtistArtworkByName('Tony Bennett')]);
  assert.deepEqual(results[0], {url: 'https://images.test/tony.jpg', provider: 'lastfm'});
  assert.deepEqual(results[1], results[0]);
  assert.equal(calls.length, 1);
  assert.deepEqual(await resolveArtistArtworkByName('Tony Bennett'), results[0]);
  assert.equal(calls.length, 1);
});

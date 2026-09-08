import './helpers/register-typescript.mjs';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'composeerr-identity-'));
process.env.COMPOSEERR_DATA_DIR = dir;
const { MusicBrainzPublicProvider } = await import('../lib/server/metadata/musicbrainz-public.ts');
const { resolveDiscoveryIdentity } = await import('../lib/server/metadata/discovery-resolution.ts');
const { searchDiscovery } = await import('../lib/server/metadata/discovery.ts');
const { saveSearchSettings } = await import('../lib/server/search-settings.ts');
const { saveMusicBrainzSettings } = await import('../lib/server/musicbrainz-settings.ts');
const { db } = await import('../lib/server/db.ts');
const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; db.close(); rmSync(dir, { recursive: true, force: true }); });
const ids = Array.from({length: 6}, (_, i) => `0000000${i + 1}-1111-4111-8111-111111111111`);
const [artist, recording, track, group, release, missing] = ids;
const connection = { url: 'https://content.test/ws/2', authMode: 'none', username: '', password: '', headerName: '', headerSecret: '' };
const provider = new MusicBrainzPublicProvider(connection);
const calls = [];
let failure = false;
const entity = (id, name = 'Canonical title') => ({ id, name, title: name, 'primary-type': 'Album', 'artist-credit': [{ name: 'Canonical artist', artist: { id: artist, name: 'Canonical artist' } }] });
const discovery = (kind, id) => ({kind, musicBrainzId: id, name: 'Different spelling', title: 'Different spelling', artist: 'Different credit', source: 'lastfm', sourceId: id, canonical: false, artworkUrl: null, listeners: null});
globalThis.fetch = async (input) => {
  const url = new URL(input); calls.push(url);
  // Disable pacing only for this in-memory transport, never for real requests.
  globalThis.composeerrMusicBrainz.lastRequestAt = 0;
  if (failure) return Response.json({}, {status: 401});
  if (url.hostname === 'lastfm.test') {
    const kind = url.searchParams.get('method').split('.')[0];
    const id = kind === 'artist' ? artist : kind === 'album' ? release : track;
    return Response.json({ results: { [kind + 'matches']: { [kind]: [
      { name: 'Different spelling', artist: 'Different credit', mbid: id },
      { name: 'Duplicate', artist: 'Different credit', mbid: id },
      { name: 'Missing', artist: 'Unknown', mbid: missing },
      ...[null, '', undefined, 'invalid', '00000000-0000-0000-0000-000000000000'].map(mbid => ({ name: 'Unlinked', mbid })),
    ] } } });
  }
  const resource = url.pathname.replace('/ws/2/', '').replace(/\/$/, '');
  if (url.searchParams.has('query')) {
    assert.equal(url.hostname, 'search.test', 'Content must never use indexed search');
    const key = resource === 'artist' ? 'artists' : resource === 'recording' ? 'recordings' : 'release-groups';
    return Response.json({ [key]: [entity(resource === 'artist' ? artist : resource === 'recording' ? recording : group)] });
  }
  if (resource === `artist/${artist}` || resource === `recording/${recording}` || resource === `release-group/${group}`) return Response.json(entity(resource.split('/')[1]));
  if (resource === `release/${release}`) return Response.json({ ...entity(release), 'release-group': entity(group) });
  if (resource === 'release' && url.searchParams.has('track')) return Response.json({ releases: url.searchParams.get('track') === track ? [{media: [{tracks: [{id: track, recording: {id: recording}}]}]}] : [] });
  return Response.json({}, {status: 404});
};

test('drawer identity resolution and fast discovery with both search engines', async (t) => {
  saveMusicBrainzSettings(connection);
  await t.test('songs resolve recording IDs and track IDs to the same recording', async () => {
    assert.equal((await provider.resolveIdentity('song', recording)).id, recording);
    assert.equal((await provider.resolveIdentity('song', track)).id, recording);
    assert.ok(calls.some(url => url.searchParams.get('track') === track));
  });
  await t.test('albums normalize releases to release groups; artists stay artists', async () => {
    assert.equal((await provider.resolveIdentity('album', release)).id, group);
    assert.equal((await provider.resolveIdentity('album', group)).id, group);
    assert.equal((await provider.resolveIdentity('artist', artist)).id, artist);
    assert.equal(await provider.resolveIdentity('artist', recording), null);
    assert.equal(await provider.resolveIdentity('song', group), null);
  });
  await t.test('valid IDs win over spelling; missing IDs never trigger name searches', async () => {
    assert.equal((await resolveDiscoveryIdentity(discovery('song', track))).id, recording);
    const before = calls.length;
    assert.equal((await resolveDiscoveryIdentity(discovery('song', recording))).id, recording);
    for (const id of [null, '', 'invalid']) assert.equal(await resolveDiscoveryIdentity(discovery('song', id)), null);
    assert.equal(calls.length, before);
    assert.equal(await resolveDiscoveryIdentity(discovery('artist', missing)), null);
    const afterMissing = calls.length;
    assert.equal(await resolveDiscoveryIdentity(discovery('artist', missing)), null);
    assert.equal(calls.length, afterMissing);
  });
  await t.test('both engines preserve supplied IDs and filter invalid IDs without Content lookups', async () => {
    // Cold caches ensure accidental pre-display verification cannot hide behind caching.
    db.prepare("DELETE FROM provider_cache").run();
    globalThis.composeerrMusicBrainz.cache.clear();
    for (const engine of ['musicbrainz', 'lastfm']) {
      saveSearchSettings(engine === 'musicbrainz'
        ? { engine, musicbrainz: {...connection, url: 'https://search.test/ws/2'} }
        : { engine, lastfm: {key: 'lastfm', enabled: false, url: 'https://lastfm.test', authMode: 'native', nativeSecret: 'fixture'} });
      for (const [kind, expected] of [['artist', artist], ['album', group], ['song', recording]]) {
        const before = calls.length;
        const result = await searchDiscovery(kind, 'Different');
        assert.equal(result.provider, engine === 'musicbrainz' ? 'musicbrainz-public' : engine);
        const suppliedId = kind === 'artist' ? artist : kind === 'album' ? release : track;
        assert.deepEqual(result.results.map(item => item.musicBrainzId),
          engine === 'musicbrainz' ? [expected] : [suppliedId, suppliedId, missing]);
        assert.ok(result.results.every(item => item.canonical === (engine === 'musicbrainz')));
        if (engine === 'lastfm') {
          assert.equal(result.results[0].name ?? result.results[0].title, 'Different spelling');
        }
        const searchCalls = calls.slice(before);
        assert.ok(searchCalls.length > 0);
        assert.ok(searchCalls.every(url => engine === 'lastfm'
          ? url.hostname === 'lastfm.test'
          : url.hostname === 'search.test' && url.searchParams.has('query')),
        'Search must only contact the selected search engine, never resolve IDs through Content');
      }
    }
  });
  await t.test('opening a Last.fm result resolves its supplied track or release ID on demand', async () => {
    for (const [kind, expected] of [['song', recording], ['album', group], ['artist', artist]]) {
      const result = await searchDiscovery(kind, 'Different');
      const before = calls.length;
      const canonical = await resolveDiscoveryIdentity(result.results[0]);
      assert.equal(canonical.kind, kind);
      assert.equal(canonical.id, expected);
      const resolutionCalls = calls.slice(before);
      assert.ok(resolutionCalls.length > 0);
      assert.ok(resolutionCalls.every(url => url.hostname === 'content.test' && !url.searchParams.has('query')));
    }
  });
  await t.test('changing Content invalidates cache; authentication failures propagate and are not cached', async () => {
    saveMusicBrainzSettings({...connection, url: 'https://other-content.test/ws/2'});
    failure = true;
    await assert.rejects(resolveDiscoveryIdentity(discovery('artist', artist)), /HTTP 401/);
    failure = false;
    assert.equal((await resolveDiscoveryIdentity(discovery('artist', artist))).id, artist);
    assert.equal(calls.at(-1).hostname, 'other-content.test');
  });
});

import './helpers/register-typescript.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const { songAlbumChoices, chronologicalAlbums } = await import('../lib/metadata/album-order.ts');
const song = { artistId: 'artist', artist: 'Artist' };
const album = (id, year, secondaryTypes = [], artistId = 'artist') => ({
  id, title: id, year, secondaryTypes, artistId, artist: 'Artist', primaryType: 'Album',
});

test('studio albums by the song artist come first without calling compilations original', () => {
  const input = [album('compilation', 1950, ['Compilation']), album('later studio', 1970),
    album('earlier studio', 1960), album('various artists', 1940, [], 'various'), album('live', 1955, ['Live'])];
  const choices = songAlbumChoices(input, song);
  assert.deepEqual(choices.map(({album}) => album.id), ['earlier studio', 'later studio', 'various artists', 'compilation', 'live']);
  assert.deepEqual(choices.filter(item => item.earliestStudio).map(item => item.album.id), ['earlier studio']);
  assert.equal(input[0].id, 'compilation', 'ordering must not mutate drawer data');
});

test('ties are honest and undated or compilation-only lists have no earliest studio label', () => {
  const choices = songAlbumChoices([album('a', 1960), album('b', 1960), album('unknown', null)], song);
  assert.deepEqual(choices.map(item => item.earliestStudio), [true, true, false]);
  assert.ok(songAlbumChoices([album('unknown', null), album('comp', 1960, ['Compilation'])], song).every(item => !item.earliestStudio));
  assert.deepEqual(songAlbumChoices([], song), []);
});

test('discography dates sort oldest first with unknown dates last', () => {
  assert.deepEqual([album('unknown', null), album('new', 2000), album('old', 1960)]
    .sort(chronologicalAlbums).map(item => item.id), ['old', 'new', 'unknown']);
});

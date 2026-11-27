// The AI note (dist/ainote.mjs): shown once per browser, before a new game's power-up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NOTE_KEY, noteSeen, aiNote } from './dist/ainote.mjs';

const fake = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('the note counts as seen only once marked', () => {
  assert.equal(noteSeen(fake()), false);
  assert.equal(noteSeen(fake({ [NOTE_KEY]: 'seen' })), true);
  assert.equal(noteSeen(null), false, 'no storage: it shows');
  assert.equal(noteSeen({ getItem: () => { throw new Error('blocked'); } }), false);
});

test('a browser that has seen it goes straight on', async () => {
  await aiNote({ store: fake({ [NOTE_KEY]: 'seen' }) }); // resolves without touching the page
});

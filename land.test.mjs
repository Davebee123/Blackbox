import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { saveVersionOf, saveClash } from './scripts/land.mjs';

test('land reads SAVE_VERSION from the source as written', () => {
  assert.equal(saveVersionOf(readFileSync('dist/combat.mjs', 'utf8')), Number((/SAVE_VERSION = (\d+)/.exec(readFileSync('dist/combat.mjs', 'utf8')))[1]));
  assert.equal(saveVersionOf('export const SAVE_VERSION = 48; // v48: ...'), 48);
  assert.equal(saveVersionOf(''), null);
  assert.equal(saveVersionOf(undefined), null);
});

test('land stops only when both sides raised SAVE_VERSION since they split', () => {
  assert.ok(saveClash({ base: 46, ours: 47, theirs: 47 }), 'two migrations claiming 47');
  assert.ok(saveClash({ base: 46, ours: 47, theirs: 48 }), 'different numbers still need ordering by hand');
  assert.ok(!saveClash({ base: 46, ours: 47, theirs: 46 }), 'only yours: it merges');
  assert.ok(!saveClash({ base: 46, ours: 46, theirs: 48 }), "only main's: it merges");
  assert.ok(!saveClash({ base: 48, ours: 49, theirs: 48 }), 'already renumbered after a merge of main');
  assert.ok(!saveClash({ base: null, ours: 47, theirs: 47 }), 'unreadable base: no claim');
});

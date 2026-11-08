// Themed telegraph chips (dist/chipfx.mjs, docs/ui.md "The fight board"): a part with a theme marks its board row, and
// its chips play it faint at +1, stronger in Now, strongest in the last 1.5 s, and not at all further out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter } from './dist/combat.mjs';
import { FAMILIES } from './dist/data.mjs';
import { boardMarkup } from './dist/view.mjs';
import { CHIP_THEMES, chipTheme, chipLevel } from './dist/chipfx.mjs';

test('every themed name is a part the game has', () => {
  const names = new Set(Object.values(FAMILIES).flatMap((f) => f.parts.map((p) => p.name)));
  for (const name of Object.keys(CHIP_THEMES)) assert.ok(names.has(name), `${name} is a part`);
});

test('a part finds its theme by the name the player sees, .exe builds too', () => {
  assert.equal(chipTheme('Pulse Node'), 'zap');
  assert.equal(chipTheme('Encryptor.exe'), 'lock');
  assert.equal(chipTheme('Mutex'), null);
  assert.equal(chipTheme(undefined), null);
});

test('chips play faint at +1, stronger in Now, strongest in its last 1.5 s, and not further out', () => {
  const [far] = chipLevel(2, 4000), [next, nextOp] = chipLevel(1, 4000), [now, nowOp] = chipLevel(0, 4000), [late, lateOp] = chipLevel(0, 1200);
  assert.equal(far, 0);
  assert.deepEqual(chipLevel(3, 4000), [0, 0]);
  assert.ok(next > 0 && next < now && now < late);
  assert.ok(nextOp < nowOp && nowOp < lateOp && lateOp < 1, 'always faint');
});

test('a themed part marks its board row; an unthemed one does not', () => {
  const s = fresh(); s.hackers = { breaker: { level: 50, xp: 0 } };
  selectEncounter(s, 'cryptjack', 7, { level: 6 }); command(s, 'engage');
  const row = (id) => boardMarkup(s).split('data-target="').find((r) => r.startsWith(id + '"')).split('>')[0];
  assert.match(row('pulse'), /data-th="zap"/);
  assert.match(row('encryptor'), /data-th="lock"/);
  const t = fresh(); t.hackers = { breaker: { level: 12, xp: 0 } }; t.metAll = true;
  selectEncounter(t, 'random', 2, { level: 12, family: 'ransomware', mutation: null }); command(t, 'engage');
  const plain = t.encounter.virus.parts.find((p) => !chipTheme(p.name));
  assert.ok(plain, 'this fight has an unthemed part');
  assert.doesNotMatch(boardMarkup(t).split('data-target="').find((r) => r.startsWith(plain.id + '"')).split('>')[0], /data-th=/);
});

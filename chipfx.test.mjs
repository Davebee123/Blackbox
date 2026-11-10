// Themed telegraph chips (dist/chipfx.mjs, docs/ui.md "The fight board"): a part with a theme marks its board row, and
// its chips play it faint at +1, stronger in Now, strongest in the last 1.5 s, and not at all further out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter } from './dist/combat.mjs';
import { FAMILIES } from './dist/data.mjs';
import { boardMarkup } from './dist/view.mjs';
import { CHIP_THEMES, STRIKES, chipTheme, chipLevel } from './dist/chipfx.mjs';

test('every themed name is a part the game has', () => {
  const names = new Set(Object.values(FAMILIES).flatMap((f) => f.parts.map((p) => p.name)));
  for (const name of Object.keys(CHIP_THEMES)) assert.ok(names.has(name), `${name} is a part`);
});

test('every part wears a theme, and every theme strikes', () => {
  for (const f of Object.values(FAMILIES)) for (const p of f.parts) assert.ok(chipTheme(p.name), `${p.name} has a theme`);
});

test('a part finds its theme by the name the player sees, .exe builds too', () => {
  assert.equal(chipTheme('Pulse Node'), 'zap');
  assert.equal(chipTheme('Encryptor.exe'), 'lock');
  assert.equal(chipTheme('Not A Part'), null);
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
  const rows = boardMarkup(t).split('data-target="');
  for (const p of t.encounter.virus.parts) {
    const r = rows.find((x) => x.startsWith(p.id + '"'))?.split('>')[0];
    if (!r) continue;
    const th = r.match(/data-th="([^"]+)"/)?.[1];
    if (th) assert.equal(th, chipTheme(p.name), `${p.name} wears its own theme`);
    if (!chipTheme(p.name)) assert.equal(th, undefined, `${p.name} wears none`);
  }
});

test('every theme has a strike, so no themed hit throws a lash', () => {
  for (const th of new Set(Object.values(CHIP_THEMES))) assert.ok(STRIKES.has(th), `${th} strikes`);
});

test('a shared theme marks every part that wears it', () => {
  assert.equal(chipTheme('Twin Rig'), 'heat');
  assert.equal(chipTheme('Recycle Bin'), 'crumble');
  assert.equal(chipTheme('Obfuscator.exe'), 'scramble');
  assert.equal(chipTheme('Opportunist'), 'thorn');
  assert.equal(chipTheme('Idle Timer'), 'clock');
  assert.equal(chipTheme('Jitter'), 'strobe');
  assert.equal(chipTheme('Fan-in'), 'copy');
  assert.equal(chipTheme('Tripwire'), 'scan');
  assert.equal(chipTheme('Lockbox'), 'plate');
  assert.equal(chipTheme('Damper'), 'ledger');
  assert.equal(chipTheme('C&C'), 'mask');
});

test('what a fight spawns (fragments, hatchlings) wears byte, and its Gnaw strikes instead of lashing', () => {
  assert.equal(chipTheme('Fragment 1'), 'byte');
  assert.equal(chipTheme('Fragment 12'), 'byte');
  assert.equal(chipTheme('Hatchling 3'), 'byte');
  assert.equal(chipTheme('Fragment'), null, 'only a numbered spawn');
  assert.ok(STRIKES.has('byte'));
  const s = fresh(); s.hackers = { breaker: { level: 50, xp: 0 } };
  selectEncounter(s, 'cryptjack', 7, { level: 6 }); command(s, 'engage');
  const e = s.encounter;
  e.virus.parts.push({ id: 'frag9', name: 'Fragment 9', kind: 'fragment', integrity: 18, max: 18, armor: 0, maxArmor: 0, patchAt: null, veiled: false, loot: null, special: false, attack: { name: 'Gnaw', effect: 'damage', amount: 3, interval: 1, due: e.cycle + 1 }, exposedUntil: 0, lastDamaged: 0, boosted: false });
  const row = boardMarkup(s).split('data-target="').find((r) => r.startsWith('frag9"')).split('>')[0];
  assert.match(row, /data-th="byte"/);
});

// The three solo bosses' own parts and phases (docs/solo-bosses.md, GAME_RULES.md "Solo bosses"): RELAY-KING's Broadcast
// and Crown Hop, REPO MAN's Liens, HOLLOW CHOIR's second voice and Round.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, livingParts, attackers, attackAmount, liftOf, hit } from './dist/combat.mjs';
import { CONFIG, BOSSES } from './dist/data.mjs';
import { tellsOf, copyOf, mimicLands, sungOf } from './dist/tells.mjs';
import { boardMarkup } from './dist/view.mjs';
import * as FP from './dist/floorplan.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.baseCrit = 0;
// A boss fight at home with its attacks parked and its tells quiet, so nothing lands unless a test says so.
function boss(id, { level = 14, cls = 'breaker' } = {}) {
  const s = fresh();
  FP.outfit(s, { cls, level });
  selectEncounter(s, 'random', 7, { level, mutation: null, family: BOSSES[id].family, boss: id });
  command(s, 'engage');
  s.server.max = s.server.integrity = 5000;
  s.encounter.hardened = 0;
  for (const p of attackers(s)) p.attack.due = 999;
  for (const t of tellsOf(s)?.list || []) { t.told = false; t.after = 999; }
  return s;
}
const fire = (s, text) => { command(s, text); return resolveCycle(s); };
const of = (s, id) => livingParts(s).find((p) => p.id === id);
const crown = (s) => livingParts(s).find((p) => p.core);
// Take the ♛ part just under a share of its max with a hit of the server's (no command, no Lien, no stagger).
const under = (s, at) => { const c = crown(s); c.integrity = Math.floor(at * c.max) + 1; c.armor = 0; command(s, 'hold'); resolveCycle(s); hitServer(s, c, 2); };
const hitServer = (s, p, n) => hit(s, p, n, { pierce: true, server: true });

test("RELAY-KING's Relay broadcasts harder for each fragment on the board", () => {
  const s = boss('relayking'), r = of(s, 'relay');
  assert.ok(r?.broadcast && r.attack.name === 'Broadcast');
  const base = attackAmount(r);
  s.encounter.virus.parts.push({ id: 'frag1', name: 'Fragment 1', kind: 'fragment', integrity: 5, max: 5, armor: 0, maxArmor: 0, attack: { name: 'Gnaw', effect: 'damage', amount: 1, interval: 1, due: 999 } });
  liftOf(s);
  assert.equal(attackAmount(r) - base, Math.round(r.attack.amount * r.fanin), 'one fragment, one more base');
  assert.match(boardMarkup(s), /×1<\/span>/, 'the Relay shows the fragments it counts');
});

test("RELAY-KING's Crown Hop: at 50% the ♛ moves to its healthiest part with the 25% tick; the part it leaves heals", () => {
  const s = boss('relayking'), was = crown(s);
  assert.equal(was.id, 'replicator');
  under(s, 0.5);
  resolveCycle(s);
  const now = crown(s);
  assert.notEqual(now, was, 'the ♛ moved');
  assert.ok(!was.core && was.integrity > 0.5 * was.max, 'the old crown healed a quarter');
  assert.deepEqual(now.ticks.map((t) => [t.at, t.phase]), [[0.25, 1]], 'the 25% phase tick went with it');
  assert.ok(was.ticks.every((t) => t.phase == null), 'the old crown takes plain ticks');
  under(s, 0.25);
  resolveCycle(s);
  assert.equal(of(s, 'replicator').attack.interval, 2, 'the Flood');
  assert.equal(of(s, 'relay').attack.interval, 3);
});

test("REPO MAN's Liens: a command a ◆ absorbs adds one and grows the Collection; a Collection clears them", () => {
  const s = boss('repoman'), v = s.encounter.virus, l = of(s, 'ledger'), p = of(s, 'pulse');
  assert.ok(l?.lien);
  p.armor = p.maxArmor = 3;
  const before = attackAmount(l);
  fire(s, 'spike pulse');
  assert.equal(v.liens, 1);
  assert.equal(attackAmount(l) - before, Math.round(l.attack.amount * l.lien), 'one Lien, one more base');
  fire(s, 'crack pulse');
  assert.equal(v.liens, 1, 'a strip files none');
  assert.match(boardMarkup(s), /§1<\/span>/);
  l.attack.due = s.encounter.cycle;
  resolveCycle(s);
  assert.equal(v.liens, 0, 'the Collection paid them off');
});

test("REPO MAN's phases call a Collection 3 cycles out, and at 25% each Lien counts twice", () => {
  const s = boss('repoman'), v = s.encounter.virus, l = of(s, 'ledger');
  under(s, 0.5);
  resolveCycle(s);
  assert.ok(l.attack.due <= s.encounter.cycle + 3, 'a Collection is coming');
  v.liens = 2; liftOf(s);
  const one = l.attack.lift;
  l.attack.due = 999;
  under(s, 0.25);
  resolveCycle(s);
  liftOf(s);
  assert.equal(v.interest, 2);
  assert.equal(l.attack.lift, one * 2);
});

test('HOLLOW CHOIR: one voice, a second at 50% beating two behind, and at 25% the Round sings back the cycles before the beat', () => {
  const s = boss('choir', { level: 14 }), v = s.encounter.virus;
  assert.equal(livingParts(s).filter((p) => p.mimic).length, 1);
  assert.ok(!livingParts(s).some((p) => p.reflect), 'no Decoy');
  under(s, 0.5);
  resolveCycle(s);
  const ms = livingParts(s).filter((p) => p.mimic), beats = tellsOf(s).list.filter((t) => t.kind === 'mimic');
  assert.equal(ms.length, 2, 'a second voice');
  assert.equal(beats.length, 2);
  assert.equal(((beats[1].first - beats[0].first) % 4 + 4) % 4, 2, 'two cycles behind');
  under(s, 0.25);
  resolveCycle(s);
  assert.equal(v.round, 3);
  // Fire two hits, then hold on the beat: the beat sings the two back.
  const m = ms[0], t = beats[0];
  const target = livingParts(s).find((p) => !p.mimic && !p.core) || livingParts(s).find((p) => !p.mimic);
  target.armor = 0;
  fire(s, `spike ${target.id}`);
  fire(s, `spike ${target.id}`);
  command(s, 'hold');
  const sung = sungOf(s, m);
  assert.equal(sung.length, 2, 'the two cycles before the beat');
  assert.ok(sung.every((c) => c.kind === 'hit'));
  Object.assign(t, { told: true, said: s.encounter.cycle, next: s.encounter.cycle });
  const hp = s.server.integrity;
  mimicLands(s, t, m);
  assert.ok(s.server.integrity < hp, 'the round lands');
  assert.ok(copyOf(s, 'spike', target), 'copyOf still prices the beat');
});

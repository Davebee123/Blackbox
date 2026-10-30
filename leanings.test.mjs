// Leanings (leanings.mjs, docs/leanings.md): a traced server's one positive rule, from its seed. Venting and Wind-up
// on the damage a part takes, Brownout on an attack that lands on you, the fight's count, and the card's tag.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, hit, damageMultiplier, defender, part } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import * as FP from './dist/floorplan.mjs';
import { play } from './dist/run.mjs';
import { leaningOf } from './dist/specials.mjs';
import { LEANINGS, LEANING, leanShown } from './dist/leanings.mjs';
import { mapMarkup, hudMarkup, boardMarkup } from './dist/view.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.baseCrit = 0;
CONFIG.exfil.chance = 0;
hooks.now = () => 1_700_000_000_000;

// A traced server with the given leaning (a seed that rolls it), connected, and a fight in its first fight room.
function fight(id) {
  const s = fresh(); s.tutorialCompleted = true; s.rng = 7777;
  command(s, 'developer location ransomware');
  const loc = s.locations[0];
  let seed = 1;
  while (leaningOf({ ...loc, seed }) !== id) seed++;
  Object.assign(loc, { lockUntil: 0, seed });
  play(s, 'connect ' + loc.id);
  const room = FP.roomList(s).find((x) => x.kind === 'fight' || x.kind === 'guard');
  s.rooms.at = FP.neighbours(s.rooms.graph, room.id)[0]; s.rooms.visit.walked[s.rooms.at] = true; s.rooms.screen = null; FP.look(s);
  FP.go(s, room.id); if (!active(s)) FP.act(s, 'engage');
  const e = s.encounter;
  if (e.phase !== 'active') { command(s, 'hold'); resolveCycle(s); }
  for (const p of e.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, integrity: 9999, max: 9999, attack: null });
  return { s, loc, e, p: e.virus.parts[0], q: e.virus.parts[1] };
}

test('every traced server leans one of three ways from its seed; a wild one never', () => {
  const seen = {};
  for (let seed = 1; seed <= 600; seed++) { const id = leaningOf({ seed }); seen[id] = (seen[id] || 0) + 1; }
  assert.deepEqual(Object.keys(seen).sort(), ['brownout', 'venting', 'windup']);
  for (const n of Object.values(seen)) assert.ok(n > 150, 'about a third each');
  assert.equal(leaningOf({ seed: 5, rogue: { kind: 'pit' } }), null);
  assert.equal(leaningOf({ seed: 5, member: 'kai' }), null);
});

test('a fight on the server carries its leaning', () => {
  const { e, loc } = fight('venting');
  assert.equal(e.leaning.id, leaningOf(loc));
  assert.equal(e.leaning.paid, 0);
});

test('Venting: a part takes 50% more on the cycle after it attacks, and the fight counts it', () => {
  const { s, e, p } = fight('venting');
  const before = damageMultiplier(s, p, { mine: true });
  p.lastLanded = e.cycle - 2;
  assert.equal(damageMultiplier(s, p, { mine: true }), before, 'two cycles on, nothing');
  p.lastLanded = e.cycle - 1;
  assert.ok(Math.abs(damageMultiplier(s, p, { mine: true }) / before - LEANING.venting) < 1e-9);
  const was = p.integrity;
  hit(s, p, 40, { mine: true });
  assert.ok(e.leaning.paid > 0 && e.leaning.paid < was - p.integrity);
  assert.equal(e.leaning.last.parts[p.id], e.leaning.paid);
  e.cycle++;
  assert.deepEqual(leanShown(e), { [p.id]: e.leaning.paid }, 'the board shows it the cycle after');
  assert.match(boardMarkup(s), /class="tag tag-lean"/);
  assert.match(hudMarkup(s), new RegExp(`class="gfx lean lit"[^>]*>.*Venting<b class="lean-n">\\+${e.leaning.paid}</b>`));
  e.cycle++;
  assert.equal(leanShown(e), null);
  assert.doesNotMatch(boardMarkup(s), /tag-lean/);
});

test('Wind-up: a part takes 25% more on the cycle its attack lands', () => {
  const { s, e, p } = fight('windup');
  const before = damageMultiplier(s, p, { mine: true });
  p.attack = { name: 'Bite', effect: 'damage', amount: 10, interval: 3, due: e.cycle + 1 };
  assert.equal(damageMultiplier(s, p, { mine: true }), before, 'next cycle, nothing yet');
  p.attack.due = e.cycle;
  assert.ok(Math.abs(damageMultiplier(s, p, { mine: true }) / before - LEANING.windup) < 1e-9);
});

test('Brownout: an attack deals 30% less to you when your command aims at its part that cycle', () => {
  const lost = (aimAt) => {
    const { s, e, p, q } = fight('brownout');
    p.attack = { name: 'Bite', effect: 'damage', amount: 40, interval: 3, due: e.cycle };
    const d = defender(s), was = d.integrity;
    command(s, `spike ${aimAt === 'p' ? p.id : q.id}`); resolveCycle(s);
    return { lost: was - d.integrity, paid: e.leaning.paid };
  };
  const off = lost('q'), on = lost('p');
  assert.equal(off.paid, 0);
  assert.ok(on.lost < off.lost, `${on.lost} < ${off.lost}`);
  assert.ok(Math.abs(on.lost - off.lost * LEANING.brownout) <= 1);
  assert.ok(on.paid > 0);
});

test('the server card: its tags beside the leaning, a filled amber tag with the rule in its tooltip', () => {
  const s = fresh(); s.tutorialCompleted = true;
  command(s, 'developer location ransomware');
  const loc = s.locations[0], x = LEANINGS[leaningOf(loc)];
  const html = mapMarkup(s, loc.id);
  assert.match(html, /class="srv-tags"><span class="hg-k">Server<\/span><span class="hg-k">Leaning<\/span>/);
  assert.match(html, new RegExp(`data-leaning="${leaningOf(loc)}" title="${x.name}: Server leaning\\.\\n${x.rule.replace(/[.%]/g, '\\$&')}\\n▸ `));
});

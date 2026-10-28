// The order levers (docs/puzzle-levers.md 3.2 to 3.4, dist/order.mjs): the Tripwire loud both ways, the Zip Bomb's
// blast on both sides, the Lockbox's held damage. Each rule, the fact that decides it (order.mjs), the planner reading
// it, its WHEN chip and preset (routines.mjs), and its marks on the board (view.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, selectEncounter, part, livingParts, active, codexKey, damageMultiplier, blastOf, hit } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import * as FP from './dist/floorplan.mjs';
import { planner } from './dist/planner.mjs';
import * as R from './dist/routines.mjs';
import * as O from './dist/order.mjs';
import { boardMarkup } from './dist/view.mjs';
import { TIER } from './dist/research.mjs';
import { FIXED } from './solved.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.baseCrit = 0;

// A hacker of a class at a level against a wild virus carrying a gene, every part researched to a tier.
function fight({ cls = 'breaker', level = 22, family = 'ransomware', gene, research = TIER.rule, seed = 7 } = {}) {
  const s = fresh();
  FP.outfit(s, { cls, level });
  selectEncounter(s, 'random', seed, { level, family, mutation: null, classic: true, genes: [gene], quiet: true });
  command(s, 'engage');
  s.research = {}; s.researchScale = 3;
  for (const p of s.encounter.virus.parts) s.research[codexKey(s.encounter.virus, p)] = research;
  s.server.max = s.server.integrity = 5000;
  s.encounter.soft = 1;
  return s;
}
const step = (s, text = 'hold') => { command(s, text); return resolveCycle(s); };
const still = (s) => { for (const p of livingParts(s)) if (p.attack) p.attack.due = 999; };
const lever = (s, key) => livingParts(s).find((p) => p[key]);

// ---------- the Tripwire ----------
test('Tripwire: broken while others stand, they go loud both ways: harder and sooner, and they take more and drop their ◆ for good', () => {
  const s = fight({ gene: 'tripwire' }), t = lever(s, 'deadman');
  const rest = livingParts(s).filter((p) => p !== t);
  still(s);
  const p = rest.find((x) => x.attack), amount = p.attack.amount, interval = p.attack.interval;
  for (const x of rest) x.armor = x.maxArmor = 3;
  const was = damageMultiplier(s, p, { server: true });
  Object.assign(t, { armor: 0, integrity: 1 });
  const ev = step(s, `spike ${t.id}`);
  assert.ok(rest.every((x) => x.loud && x.armor === 0 && x.patchAt === null), 'loud, and their ◆ gone');
  assert.equal(p.attack.amount, Math.round(amount * CONFIG.tripwire.loud));
  assert.equal(p.attack.interval, Math.max(2, interval - CONFIG.tripwire.sooner), 'every attack a cycle sooner');
  assert.ok(Math.abs(damageMultiplier(s, p, { server: true }) - was * CONFIG.tripwire.taken) < 1e-9, 'they take more');
  assert.match(ev.find((e) => e.tripwire).message, /more damage taken and 6 ◆ dropped/);
  for (let i = 0; i < 8 && active(s); i++) step(s);
  assert.ok(rest.every((x) => !(x.armor > 0)), 'no ◆ patches back on a loud part');
});

test('Tripwire: an attack due next cycle lands in the cycle you trip it', () => {
  const s = fight({ gene: 'tripwire' }), t = lever(s, 'deadman');
  still(s);
  const p = livingParts(s).find((x) => x !== t && x.attack);
  p.attack.due = s.encounter.cycle + 1;
  Object.assign(t, { armor: 0, integrity: 1 });
  const hp = s.server.integrity;
  const ev = step(s, `spike ${t.id}`);
  assert.ok(ev.some((e) => e.type === 'server-hit' && e.source === p.id), `the ${p.name}'s attack lands now`);
  assert.ok(s.server.integrity < hp);
});

test('loud wins: the trip and then every other part, loud, within the window, and no attack pulled into this cycle uncovered', () => {
  const s = fight({ gene: 'tripwire' }), t = lever(s, 'deadman');
  still(s);
  const rest = livingParts(s).filter((p) => p !== t);
  Object.assign(t, { armor: 0, integrity: 1 });
  for (const p of rest) Object.assign(p, { armor: 2, integrity: 5 });
  assert.equal(O.loudWins(s)?.part, t, 'the others nearly gone: tripping now wins the race');
  rest[0].attack.due = s.encounter.cycle + 1;
  assert.equal(O.loudWins(s), null, 'an attack it would pull into this cycle, and nothing up to take it');
  s.encounter.chits = 2;
  assert.equal(O.loudWins(s)?.part, t, 'a ◆ up takes it');
  s.encounter.chits = 0; still(s);
  for (const p of rest) Object.assign(p, { armor: 0, integrity: 5000 });
  assert.equal(O.loudWins(s), null, 'a slow kill: leave it');
});

test('the planner trips it when loud wins and leaves it last when not', () => {
  const s = fight({ gene: 'tripwire' }), t = lever(s, 'deadman');
  still(s);
  const rest = livingParts(s).filter((p) => p !== t);
  Object.assign(t, { armor: 0, integrity: 1 });
  for (const p of rest) Object.assign(p, { armor: 3, integrity: 4000 });
  assert.notEqual(planner(s).split(' ')[1], t.id, 'a slow kill: the others first');
  for (const p of rest) Object.assign(p, { integrity: 5 }); // their ◆ would take three cycles each; loud, none
  assert.ok(O.loudWins(s));
  assert.equal(planner(s).split(' ')[1], t.id, 'loud wins: trip it');
});

// ---------- the Zip Bomb ----------
test('Zip Bomb: when the fuse runs out every part of the virus loses a ◆ and its share of its own max, and you take yours', () => {
  const s = fight({ gene: 'zipbomb', family: 'worm', level: 18 }), z = lever(s, 'fuse');
  still(s);
  const rest = livingParts(s).filter((p) => p !== z);
  for (const p of rest) Object.assign(p, { armor: 2, maxArmor: 2, integrity: p.max });
  Object.assign(z, { armor: 0, integrity: 1 });
  step(s, `spike ${z.id}`);
  const hp = s.server.integrity, before = rest.map((p) => p.integrity);
  step(s); step(s);
  assert.ok(hp - s.server.integrity > 0.9 * Math.round(s.server.max * CONFIG.zipbomb.share), 'yours, as today (less your Reduction)');
  rest.forEach((p, i) => { assert.equal(p.armor, 1, `${p.name} loses a ◆`); assert.equal(before[i] - p.integrity, blastOf(p), `${p.name} takes ${blastOf(p)} through its ◆`); });
  assert.equal(blastOf(rest[0]), Math.round(rest[0].max * CONFIG.zipbomb.parts));
});

test('Zip Bomb: a blast that breaks the last part wins the fight; a ◆ of yours still takes your share', () => {
  const s = fight({ gene: 'zipbomb', family: 'worm', level: 18 }), z = lever(s, 'fuse');
  still(s);
  for (const p of livingParts(s)) if (p !== z) Object.assign(p, { armor: 0, integrity: 1 });
  Object.assign(z, { armor: 0, integrity: 1 });
  // Keep one alive past the break, low enough for the blast.
  const last = livingParts(s).find((p) => p !== z);
  for (const p of livingParts(s)) if (p !== z && p !== last) p.integrity = 0;
  s.encounter.chits = 1;
  step(s, `spike ${z.id}`);
  const hp = s.server.integrity;
  step(s); step(s);
  assert.ok(!active(s) && s.reports.at(-1).result === 'victory', 'the blast took the last part');
  assert.equal(s.server.integrity, hp, 'your ◆ took your share');
});

test('blast pays: the Zip Bomb breaks now, its blast breaks a part, and a ◆ or a shield covers the fuse; the planner takes it then', () => {
  const s = fight({ gene: 'zipbomb', family: 'worm', level: 18, cls: 'bastion' }), z = lever(s, 'fuse');
  still(s);
  const rest = livingParts(s).filter((p) => p !== z);
  Object.assign(z, { armor: 0, integrity: 1 });
  for (const p of rest) Object.assign(p, { armor: 0, max: 5000, integrity: 5000 }); // nothing your one hit breaks
  s.encounter.chits = 1;
  assert.equal(O.blastPays(s), null, 'nothing it would break');
  Object.assign(rest[0], { armor: 2, integrity: blastOf(rest[0]) }); // its ◆ keep your hits off; the blast goes through
  assert.equal(O.blastPays(s)?.part, z, 'it would break one');
  assert.equal(planner(s).split(' ')[1], z.id, 'the planner breaks it now');
  s.encounter.chits = 0; s.encounter.shield = 0; s.encounter.readyAt = Object.fromEntries(Object.keys(s.encounter.readyAt || {}).map((k) => [k, s.encounter.cycle + 9]));
  for (const id of ['harden', 'firewall']) s.encounter.readyAt[id] = s.encounter.cycle + 9;
  assert.equal(O.blastPays(s), null, 'no cover: it doesn\'t pay');
  assert.notEqual(planner(s).split(' ')[1], z.id, 'no cover: it waits');
});

// ---------- the Lockbox ----------
test('Lockbox: damage past the ward\'s cap is held, and half of it lands on the partner at once when the Lockbox breaks', () => {
  const s = fight({ gene: 'ward', level: 18 }), box = lever(s, 'ward'), t = part(s, box.ward);
  still(s);
  Object.assign(t, { armor: 0, integrity: t.max });
  const cap = Math.max(1, Math.round(t.max * CONFIG.ward));
  hit(s, t, cap + 40, { server: true });
  assert.equal(t.max - t.integrity, cap, 'the cap holds');
  assert.equal(box.held[t.id], 40, 'the rest is held, not lost');
  assert.deepEqual(O.heldOf(s, box).map((h) => [h.partner.id, h.held, h.land]), [[t.id, 40, 20]]);
  const was = t.integrity;
  t.armor = 2;
  Object.assign(box, { armor: 0, integrity: 1 });
  step(s, `spike ${box.id}`);
  assert.equal(was - t.integrity, Math.floor(40 * CONFIG.wardHeld), 'half lands, through its ◆');
  assert.equal(t.armor, 2);
});

test('cash in: half of what it holds breaks the partner, and the planner breaks the Lockbox then (a burn class too)', () => {
  for (const cls of ['breaker', 'infiltrator']) {
    const s = fight({ gene: 'ward', level: 18, cls }), box = lever(s, 'ward'), t = part(s, box.ward);
    still(s);
    Object.assign(box, { armor: 0, integrity: 1 });
    box.held = { [t.id]: 10 };
    t.integrity = 50;
    assert.equal(O.cashIn(s), null, `${cls}: not yet`);
    box.held[t.id] = 100;
    assert.equal(O.cashIn(s)?.part, box);
    assert.equal(planner(s).split(' ')[1], box.id, `${cls}: cash it in`);
  }
});

// ---------- the routine: WHEN chips and presets ----------
test('each order lever brings a rule-tier WHEN chip on its own part, and a preset that reads it', () => {
  for (const [gene, key, cond, preset, family] of [['tripwire', 'deadman', 'loudwins', 'loud', 'ransomware'], ['zipbomb', 'fuse', 'blastpays', 'blast', 'worm'], ['ward', 'ward', 'cashin', 'cash', 'ransomware']]) {
    const s = fight({ gene, family, level: 22 }), p = lever(s, key), ref = codexKey(s.encounter.virus, p);
    const chip = R.PART_WHEN[cond];
    assert.equal(chip.tier, TIER.rule); assert.equal(chip.ram, 2);
    assert.ok(R.whenOpen(s, `${ref}:${cond}`), `${cond} opens with ${p.name}'s rule`);
    const other = livingParts(s).find((x) => x !== p && !x[key]);
    assert.equal(R.parseWhen(`${codexKey(s.encounter.virus, other)}:${cond}`), null, `${cond} only on the part it reads`);
    const pal = R.palette(s, family);
    assert.ok(pal.parts.find((x) => x.ref === ref).chips.some((c) => c.cond === cond));
    assert.ok(!pal.parts.filter((x) => x.ref !== ref).some((x) => x.chips.some((c) => c.cond === cond)));
    const pre = R.presetsFor(s, family).find((x) => x.id === `${preset}:${p.id}`);
    assert.ok(pre, `${preset} preset`);
    assert.deepEqual(pre.handlers[0], { when: `${ref}:${cond}`, do: 'rotation', target: 'that' });
  }
});

test('the loud wins preset: the Tripwire when loud wins, the other parts while it stands', () => {
  const s = fight({ gene: 'tripwire' }), t = lever(s, 'deadman');
  R.installPrograms();
  still(s);
  command(s, `program ransomware preset loud:${t.id}`);
  assert.ok(!R.exceptionsOf(s).some((x) => x.part === t.id), 'named: covered');
  const rest = livingParts(s).filter((p) => p !== t);
  Object.assign(t, { armor: 0, integrity: 1 });
  for (const p of rest) Object.assign(p, { armor: 3, integrity: 4000 });
  assert.notEqual(R.decide(s).text.split(' ')[1], t.id, 'not yet: the others');
  for (const p of rest) p.integrity = 5;
  assert.equal(R.decide(s).text.split(' ')[1], t.id, 'loud wins: the Tripwire');
});

// ---------- the board ----------
test('the board: a queued trip shows the others\' loud numbers and their ◆ falling; a lit fuse a blast ghost on every bar; held damage in your teal', () => {
  const s = fight({ gene: 'tripwire' }), t = lever(s, 'deadman');
  const p = livingParts(s).find((x) => x !== t && x.attack);
  p.armor = p.maxArmor = 2;
  p.attack.due = s.encounter.cycle + 2;
  Object.assign(t, { armor: 0, integrity: 1 });
  assert.doesNotMatch(boardMarkup(s), /intent[^"]*\bloud\b/);
  command(s, `spike ${t.id}`);
  const b = boardMarkup(s);
  assert.match(b, new RegExp(`class="intent next[^"]*\\bloud\\b"[^>]*title="[^"]*Loud: if the ${t.name} breaks this cycle, it deals \\d+ instead of \\d+ and lands next cycle`), 'its attack, a cycle sooner and harder');
  assert.match(b, /<b class="going">◆◆<\/b>/, 'its ◆ falling');

  const z = fight({ gene: 'zipbomb', family: 'worm', level: 18 }), zb = lever(z, 'fuse');
  still(z);
  Object.assign(zb, { armor: 0, integrity: 1 });
  step(z, `spike ${zb.id}`);
  const zm = boardMarkup(z);
  assert.equal((zm.match(/class="blastghost/g) || []).length, livingParts(z).length, 'every bar but its own');
  assert.match(zm, /title="Blast: the Zip Bomb(&#39;|')s fuse runs out next cycle\./);

  const w = fight({ gene: 'ward', level: 18 }), box = lever(w, 'ward'), partner = part(w, box.ward);
  box.held = { [partner.id]: 30 };
  const wm = boardMarkup(w);
  assert.match(wm, /class="tag you held"[^>]*>.*held 30<\/span>/, 'the Lockbox row: what it holds, in your teal');
  assert.match(wm, /class="heldghost"[^>]*title="Held: the Lockbox holds 30 of your damage on the Encryptor\. When it breaks, half of it, 15, lands at once/);
});

test('solved.mjs: each order lever has its no-fixed-rule entry, two sides that always take one side of it', () => {
  for (const [id, gene, family, sides] of [['tripwire', 'tripwire', 'ransomware', ['always trip early', 'never trip']], ['zipbomb', 'zipbomb', 'worm', ['always early', 'always last']], ['lockbox', 'ward', 'ransomware', ['Lockbox first', 'Lockbox last']]]) {
    assert.equal(FIXED[id].gene, gene); assert.equal(FIXED[id].family, family);
    assert.deepEqual(Object.keys(FIXED[id].sides), sides);
  }
  // The sides wrap the planner: first aims at the part, last never sees it while anything else stands.
  const s = fight({ gene: 'tripwire' }), t = lever(s, 'deadman');
  still(s);
  Object.assign(t, { armor: 0 });
  for (const p of livingParts(s)) if (p !== t) Object.assign(p, { armor: 0, integrity: 4000 });
  assert.equal(FIXED.tripwire.sides['always trip early'](planner)(s).split(' ')[1], t.id);
  assert.notEqual(FIXED.tripwire.sides['never trip'](planner)(s).split(' ')[1], t.id);
});

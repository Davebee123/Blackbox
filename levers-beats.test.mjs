// The beats (docs/puzzle-levers.md 3.1 and 3.8, decided 9.1 and 9.6). The Mimic copies everything you fire on its beat
// and turns it on you, so no move is free and the cheapest copy depends on the board; the Decoy bends your command at one
// part onto the part it points at, and the pointer moves each beat. Each with the planner taught, its WHEN chip and
// preset, its board marks, and its entry in the no-fixed-rule test (solved.mjs FIXED).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, livingParts, intents, mirrorOn, bendOf, previewDamage, damageMultiplier, blocked, skillBase } from './dist/combat.mjs';
import { CONFIG, TELL, createVirus } from './dist/data.mjs';
import { tellsOf, copyOf, copyKind, dearCopy, paceOf } from './dist/tells.mjs';
import { planner } from './dist/planner.mjs';
import * as R from './dist/routines.mjs';
import { boardMarkup, hudMarkup } from './dist/view.mjs';
import { partLinks } from './dist/fightread.mjs';
import { FIXED } from './solved.mjs';
import * as FP from './dist/floorplan.mjs';

CONFIG.enemyCrit = 0; // exact numbers: no enemy crits, no misses
CONFIG.misses = false;
R.installPrograms();

const withPart = (id, level) => Array.from({ length: 200 }, (_, i) => i + 1).find((seed) => createVirus('random', seed, { family: 'ghostroot', threat: 9 + level, classic: true }).parts.some((p) => p.id === id));
// A ghostroot fight with a Mimic or a Decoy, every part fat and bare, nothing attacking unless asked.
function fight(id, { level = 14, cls = 'breaker', sub = null, max = 1000 } = {}) {
  const s = fresh();
  FP.outfit(s, { cls, level, sub });
  selectEncounter(s, 'random', withPart(id, level), { level, mutation: null, family: 'ghostroot', classic: true });
  command(s, 'engage');
  s.server.max = s.server.integrity = max;
  s.encounter.hardened = 0;
  for (const p of s.encounter.virus.parts) { Object.assign(p, { armor: 0, maxArmor: 0, integrity: 900, max: 900 }); if (p.attack) p.attack.due = 999; }
  for (const t of tellsOf(s)?.list || []) { t.told = false; t.after = 999; }
  return s;
}
// The Mimic's beat, said now and landing this cycle.
function beat(s) {
  const e = s.encounter, t = tellsOf(s).list.find((x) => x.kind === 'mimic');
  Object.assign(t, { told: true, said: e.cycle, next: e.cycle, after: 999, opened: null });
  return t;
}
const fire = (s, text) => { const ev = command(s, text); assert.ok(!ev.some((x) => x.type === 'warning'), ev.at(-1)?.message); return resolveCycle(s); };
const mimic = (s) => livingParts(s).find((p) => p.mimic);
const other = (s) => livingParts(s).find((p) => !p.mimic && !p.reflect && p.attack);

test('the Mimic copies everything: each kind of command, by its data', () => {
  assert.equal(copyKind('overload'), 'hit');
  assert.equal(copyKind('crack'), 'strip');
  assert.equal(copyKind('exploit'), 'strip', 'Exploit counts as a strip (TELL.copy.strips)');
  assert.equal(copyKind('inject'), 'burn');
  assert.equal(copyKind('deploy'), 'burn', 'a helper\'s hits count as its ticks');
  assert.equal(copyKind('tag'), 'debuff');
  assert.equal(copyKind('firewall'), 'gift');
  assert.equal(copyKind('brace'), 'gift');
  assert.equal(copyKind('patch'), 'heal');
  assert.equal(copyKind('sigint'), 'hang');
  assert.equal(copyKind('suspend'), 'hang');
  assert.equal(copyKind('hold'), 'hold');
});

test('a hit copied hits you, never past the tell ceiling; a ◆ on you takes it', () => {
  const s = fight('mimic');
  beat(s);
  const t = other(s), was = s.server.integrity, c = copyOf(s, 'overload', t);
  fire(s, `overload ${t.id}`);
  assert.equal(was - s.server.integrity, c.amount);
  assert.ok(c.amount <= TELL.ceiling * 1000, 'under the ceiling');
  const s2 = fight('mimic', { max: 60 });
  beat(s2);
  assert.ok(copyOf(s2, 'overload', other(s2)).amount <= Math.ceil(CONFIG.spikeCap.wild * 60), 'a wild virus: the spike cap');
  const s3 = fight('mimic');
  beat(s3); s3.encounter.chits = 1;
  const w3 = s3.server.integrity;
  fire(s3, `overload ${other(s3).id}`);
  assert.equal(s3.server.integrity, w3, 'the ◆ takes it whole');
  assert.equal(s3.encounter.chits, 0);
});

test('a strip copied strips your ◆ and your shield; with neither on you it is cheap, and a read', () => {
  const s = fight('mimic');
  beat(s);
  Object.assign(s.encounter, { chits: 3, shield: 20 });
  for (const p of livingParts(s)) Object.assign(p, { armor: 3, maxArmor: 3 });
  const t = other(s);
  assert.match(copyOf(s, 'crack', t).text, /^strips 3 ◆ and your 20 shield from you$/);
  fire(s, `crack ${t.id}`);
  assert.equal(s.encounter.chits, 0);
  assert.equal(s.encounter.shield, 0);
  const s2 = fight('mimic');
  beat(s2);
  for (const p of livingParts(s2)) Object.assign(p, { armor: 3, maxArmor: 3 });
  assert.equal(copyOf(s2, 'crack', other(s2)).cost, 0, 'nothing to strip');
  const ev = fire(s2, `crack ${other(s2).id}`);
  assert.ok(ev.some((x) => x.type === 'read' && x.open), 'a cheap copy is a read: the Mimic is Open');
});

test('a burn copied leaves you Corrupted for its ticks, and Purge cleanses it', () => {
  const s = fight('mimic', { cls: 'infiltrator' });
  beat(s);
  const t = other(s), c = copyOf(s, 'inject', t);
  assert.equal(c.ticks, 4);
  assert.equal(c.per, Math.max(1, Math.round(c.per)), 'a tick a share of its own');
  fire(s, `inject ${t.id}`);
  assert.equal(s.encounter.corrupt.amount, c.per);
  assert.equal(s.encounter.corrupt.left, 4);
  const b = fight('mimic', { cls: 'bastion' });
  b.encounter.corrupt = { name: 'Mimic', amount: 9, left: 4, source: 'mimic' };
  fire(b, `purge ${other(b).id}`);
  assert.equal(b.encounter.corrupt, null, 'Purge cleanses it');
});

test('a debuff copied Throttles you: your hits deal half for its cycles, burns and helpers in full', () => {
  const s = fight('mimic', { cls: 'infiltrator' });
  beat(s);
  const t = other(s);
  fire(s, `tag ${t.id}`);
  assert.equal(s.encounter.throttledUntil, s.encounter.cycle - 1 + 4);
  const half = previewDamage(s, 'spike', t), dot = damageMultiplier(s, t, { mine: true, dot: true });
  s.encounter.throttledUntil = 0;
  const full = previewDamage(s, 'spike', t);
  assert.ok(Math.abs(half * 2 - full) <= 2, `Throttled key 1: ${half} against ${full}`);
  assert.equal(damageMultiplier(s, t, { mine: true, dot: true }), dot, 'burns and helpers in full');
});

test('a shield or buff copied re-arms the Mimic; a heal heals the virus\'s most damaged part; SIGINT Hangs you; hold copies nothing', () => {
  const s = fight('mimic', { cls: 'bastion' });
  beat(s);
  fire(s, 'firewall');
  assert.equal(mimic(s).armor, TELL.copy.gift);
  const h = fight('mimic', { cls: 'bastion', sub: 'sysop' });
  beat(h);
  const hurt = other(h);
  hurt.integrity = 500;
  h.server.integrity = 500; // Patch needs you hurt
  const c = copyOf(h, 'patch');
  assert.equal(c.part, hurt.id);
  fire(h, 'patch');
  assert.equal(hurt.integrity, 500 + c.amount);
  const g = fight('mimic', { level: 14 });
  beat(g);
  fire(g, 'hold');
  assert.ok(!g.encounter.hung, 'hold copies nothing');
  const k = fight('mimic', { level: 14, cls: 'bastion' });
  beat(k);
  fire(k, `suspend ${other(k).id}`);
  assert.equal(k.encounter.hung, k.encounter.cycle, 'Hung: this cycle\'s command does not fire');
});

test('the planner reads the copy: it fires a cheap one, and goes off a dear one', () => {
  const s = fight('mimic');
  for (const p of livingParts(s)) if (p.attack) p.attack.due = s.encounter.cycle + 1;
  beat(s);
  const plan = planner(s), [id, at] = plan.split(' ');
  assert.ok(!dearCopy(s, copyOf(s, id, part(s, at))), `its move's copy is not dear (${plan})`);
  // No Mimic recording (Sudo): it plays its plan, whatever it is.
  s.encounter.buffs.sudo = s.encounter.cycle;
  assert.ok(planner(s));
  // Reading it pays: the planner's copy costs less than the blind kit player's.
  const k = fight('mimic', { cls: 'bastion' });
  for (const p of livingParts(k)) if (p.attack) p.attack.due = k.encounter.cycle + 1;
  beat(k);
  const cost = (text) => (text === 'hold' ? paceOf(k) : copyOf(k, text.split(' ')[0], part(k, text.split(' ')[1])).cost);
  assert.ok(cost(planner(k)) <= cost(R.decide(k).text) + 1e-9, 'never a dearer copy than the rotation\'s');
});

test('a cast whose window outlasts the Mimic\'s beat: the planner SIGINTs it the cycle after, not into the copy', () => {
  const s = fight('mimic', { level: 14 });
  const t = other(s), e = s.encounter;
  tellsOf(s).list.push({ kind: 'cast', name: 'Persistence', gene: 'persistence', does: 'haste', id: 'persistence', part: t.id, told: true, said: e.cycle, next: e.cycle + 1, n: null, after: 999, opened: null, count: 0 });
  beat(s);
  assert.notEqual(planner(s), 'sigint', 'not on the beat');
  fire(s, planner(s));
  assert.equal(planner(s), 'sigint', 'the cycle after, still in its window');
});

test('dear copy: the Mimic\'s chip holds when the copy of your rotation\'s move costs a tenth of your max; its preset holds', () => {
  const s = fight('mimic', { level: 14 });
  s.research = {}; s.researchScale = 3;
  for (const p of s.encounter.virus.parts) s.research[R.refOf(s.encounter.virus, p)] = 15;
  assert.ok(R.whenOpen(s, 'dearcopy'));
  assert.equal(R.GLOBAL_WHEN.dearcopy.ram, 2, 'a rule chip');
  const pre = R.presetsFor(s, 'ghostroot').find((p) => p.id === `beat:${mimic(s).id}`);
  assert.equal(pre.name, 'Hold on a dear copy');
  assert.deepEqual(pre.handlers, [{ when: 'dearcopy', do: 'hold', target: 'that' }]);
  command(s, `program ghostroot preset beat:${mimic(s).id}`);
  assert.ok(!R.exceptionsOf(s).some((x) => x.part === mimic(s).id), 'dear copy covers the beat');
  beat(s);
  const rot = R.decide(s);
  const [id, at] = (rot.handler === 0 ? 'hold' : rot.text).split(' ');
  if (rot.handler === 0) assert.equal(rot.text, 'hold');
  else assert.ok(id === 'hold' || !dearCopy(s, copyOf(s, id, part(s, at))), 'it fires only when the copy is cheap');
});

test('the Mimic\'s beat cell says what your command would copy, and a red ghost marks your Signal or your ◆', () => {
  const s = fight('mimic');
  beat(s);
  const t = other(s);
  const html = boardMarkup(s, null, { ok: true, ability: 'overload', target: t.id, text: `overload ${t.id}` });
  const c = copyOf(s, 'overload', t);
  assert.match(html, new RegExp(`tl-what copy dear">${c.short}<`));
  assert.match(html, /title="Mimic: Beat, this cycle\. Copies the command you fire then and turns it on you\. Copies your Overload: deals \d+ damage to you\.\n▸ Fire what costs you least to have copied, or hold/);
  assert.match(hudMarkup(s, { preview: { ok: true, ability: 'overload', target: t.id } }), /class="copy-ghost"/);
  s.encounter.chits = 2;
  for (const p of livingParts(s)) Object.assign(p, { armor: 3, maxArmor: 3 });
  assert.match(hudMarkup(s, { preview: { ok: true, ability: 'crack', target: t.id } }), /<b class="st-ghost">−2◆<\/b>/);
});

test('the Decoy bends your command at one part onto the part it points at; area commands and the ones on you are not bent', () => {
  const s = fight('decoy');
  const d = livingParts(s).find((p) => p.reflect), [a, b] = livingParts(s).filter((p) => p !== d);
  while (!mirrorOn(s)) fire(s, 'hold');
  d.bend = { at: s.encounter.cycle, to: b.id, was: null };
  const was = { a: a.integrity, b: b.integrity };
  fire(s, `spike ${a.id}`);
  assert.equal(a.integrity, was.a, 'not where you aimed');
  assert.ok(b.integrity < was.b, 'where it points');
  assert.ok(s.logs.some((x) => x.bent && /bends your/.test(x.message)));
  // An area command: every part, as usual.
  const s2 = fight('decoy');
  const d2 = livingParts(s2).find((p) => p.reflect);
  while (!mirrorOn(s2)) fire(s2, 'hold');
  d2.bend = { at: s2.encounter.cycle, to: d2.id, was: null };
  for (const p of livingParts(s2)) Object.assign(p, { armor: 3, maxArmor: 3 });
  fire(s2, 'fork-bomb');
  assert.ok(livingParts(s2).every((p) => p.armor === 0), 'Fork Bomb strips every part');
});

test('pointing at itself, your hit lands on the Decoy and half of it bounces back; HOLLOW CHOIR\'s Harmony raises it', () => {
  const s = fight('decoy');
  const d = livingParts(s).find((p) => p.reflect), t = livingParts(s).find((p) => p !== d);
  while (!mirrorOn(s)) fire(s, 'hold');
  d.bend = { at: s.encounter.cycle, to: d.id, was: null };
  const dw = d.integrity, hw = s.server.integrity, back = blocked(s, Math.round(skillBase(s, 'spike', d) * CONFIG.mirrorBounce));
  fire(s, `spike ${t.id}`);
  assert.ok(dw - d.integrity > 0, 'it lands on the Decoy');
  assert.ok(Math.abs(hw - s.server.integrity - back) <= 1, `${CONFIG.mirrorBounce * 100}% of the hit back: ${hw - s.server.integrity} against ${back}`);
  assert.ok(CONFIG.decoy.harmony > CONFIG.mirrorBounce);
});

test('the pointer moves to another part each beat, and shows once the Decoy is stripped or Tagged', () => {
  const s = fight('decoy');
  const d = livingParts(s).find((p) => p.reflect);
  Object.assign(d, { armor: 1, maxArmor: 1 });
  const seen = [];
  for (let i = 0; i < 24; i++) {
    const b = bendOf(s, d);
    if (mirrorOn(s)) seen.push(b.to.id);
    const bend = intents(s, 4).find((x) => x.effect === 'mirror');
    if (bend) { assert.equal(bend.hidden, false, 'the beat always shows'); assert.equal(bend.to, null, 'veiled: not where'); }
    fire(s, 'hold');
  }
  assert.ok(seen.length >= 5);
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1], 'it moves each beat');
  d.armor = 0;
  const bend = intents(s, 4).find((x) => x.effect === 'mirror' && x.to);
  assert.ok(bend, 'stripped: the next beat says where');
  assert.ok(partLinks(s).some((l) => l.kind === 'bend' && l.from === d.id), 'the dashed red tether');
  assert.equal(CONFIG.decoy.veil, d.maxArmor, 'its veil is one ◆ at any level');
});

test('the planner reads the pointer: quiet when it points at the Decoy, at the part it points at when that is worth a hit', () => {
  const s = fight('decoy');
  const d = livingParts(s).find((p) => p.reflect), t = livingParts(s).find((p) => p !== d && p.attack);
  for (const p of livingParts(s)) if (p.attack) p.attack.due = s.encounter.cycle + 2;
  while (!mirrorOn(s)) fire(s, 'hold');
  for (const p of livingParts(s)) if (p.attack) p.attack.due = s.encounter.cycle + 1;
  d.bend = { at: s.encounter.cycle, to: d.id, was: null };
  const q = planner(s), [qid, qat] = q.split(' ');
  assert.ok(!qat || !part(s, qat), `pointing at itself: nothing at one part (${q})`);
  d.bend = { at: s.encounter.cycle, to: t.id, was: d.id };
  const f = planner(s);
  assert.ok(f.endsWith(' ' + t.id) || !f.split(' ')[1], `pointing at the ${t.name}: there (${f})`);
});

test('bent onto a lever: the Decoy\'s chip and its preset', () => {
  const s = fight('decoy', { level: 14 });
  const d = livingParts(s).find((p) => p.reflect);
  s.research = {}; s.researchScale = 3;
  for (const p of s.encounter.virus.parts) s.research[R.refOf(s.encounter.virus, p)] = 15;
  assert.ok(R.whenOpen(s, 'bent'));
  const pre = R.presetsFor(s, 'ghostroot').find((p) => p.id === `beat:${d.id}`);
  assert.equal(pre.name, 'Quiet when bent');
  assert.deepEqual(pre.handlers, [{ when: 'bent', do: 'rotation', target: 'nobeat' }]);
  command(s, `program ghostroot preset beat:${d.id}`);
  assert.ok(!R.exceptionsOf(s).some((x) => x.part === d.id), 'bent covers the beat');
  while (!mirrorOn(s)) fire(s, 'program');
  d.bend = { at: s.encounter.cycle, to: d.id, was: null };
  const m = R.decide(s);
  assert.equal(m.handler, 0, 'pointing at itself: the handler fires');
  assert.ok(!m.text.split(' ')[1] || !part(s, m.text.split(' ')[1]), `its rotation reads the bend: nothing at one part (${m.text})`);
  d.bend = { at: s.encounter.cycle, to: livingParts(s).find((p) => p !== d).id, was: d.id };
  assert.equal(R.decide(s).handler, -1, 'pointing at a part you can hit: the rotation plays');
});

test('the Decoy\'s Bend chip says where its next beat points, and the tooltip what to do', () => {
  const s = fight('decoy');
  const d = livingParts(s).find((p) => p.reflect), t = livingParts(s).find((p) => p !== d);
  const at = bendOf(s, d).at;
  d.bend = { at, to: t.id, was: null };
  assert.match(boardMarkup(s, null), new RegExp(`class="intent bend[^"]*"[^>]*title="Decoy: Bend, [^"]*It points at the ${t.name}\\.\\n▸ Fire then if you want the ${t.name} hit\\.">.*→ ${t.name}<`));
  d.bend = { at, to: d.id, was: null };
  assert.match(boardMarkup(s, null), /class="intent bend[^"]* harm"[^>]*title="[^"]*It points at itself[^"]*\n▸ Fire nothing at one part then: a shield, a buff or an area command\.">.*→ itself</);
});

test('the no-fixed-rule test has both beats, each with its two sides (solved.mjs FIXED)', () => {
  assert.deepEqual(Object.keys(FIXED.mimic.sides), ['quiet on every beat', 'fire on every beat']);
  assert.equal(FIXED.mimic.gene, 'mimic');
  assert.equal(FIXED.mimic.from, 8);
  assert.deepEqual(Object.keys(FIXED.decoy.sides), ['quiet on every beat', 'fire on every beat']);
  assert.equal(FIXED.decoy.gene, 'decoymirror');
  assert.equal(FIXED.decoy.from, 6);
});

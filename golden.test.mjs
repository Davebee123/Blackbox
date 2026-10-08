// Phase 0 of the genome (docs/genome.md): viruses are built from genes now, and that changed nothing in play. The
// same seeds build the same viruses through createVirus as through the builder from before genes (golden-virus.mjs),
// part for part and number for number, and the same fights end the same way on either.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createVirus, STRAINS, BOSSES, GUARDS, FIXTURES } from './dist/data.mjs';
import { GENES } from './dist/genes.mjs';
import { hooks } from './dist/combat.mjs';
import { createVirus as legacy } from './golden-virus.mjs';
import { fight, BRACKETS, strainsAt } from './balance.mjs';
import { bossFight } from './genesim.mjs';

// What the genome adds to a virus: its genes, its author, and a name read off them (phase 1).
const ADDED = ['genes', 'author', 'name'];
// The name keeps its tag and grade; a wild one swaps its family's name for its body's stem, after the adjective of its
// costliest rolled gene.
const STEMS = { RANSOMWARE: 'CRYPTJACK', WORM: 'SPLINTER', GHOSTROOT: 'GHOSTROOT' };
const nameOk = (a, b) => {
  const want = b.name.replace(/^(ELITE )?(RANSOMWARE|WORM|GHOSTROOT)-/, (m, e, f) => `${e || ''}${STEMS[f]}-`);
  if (a.name === want) return !a.genes.some((g) => g.src === 'rolled') || !!a.strain || !/-\d{4}/.test(want);
  const adj = a.genes.filter((g) => g.src === 'rolled').map((g) => GENES[g.id].adj.toUpperCase());
  return adj.some((x) => a.name === want.replace(/^(ELITE )?/, (m) => `${m}${x} `));
};
const strip = (v) => { const o = structuredClone(v); for (const k of ADDED) delete o[k]; return o; };
// Phase 1 rebuilt three bosses on purpose (docs/genome.md 7.5 and 5.3): HASHLORD, MIRRORSHADE and HOLLOW CHOIR's Harmony.
// genesim.test.mjs holds them to their designs and their band; every other boss is the same fight it was.
const REBUILT = ['nb-hashlord', 'nb-mirrorshade', 'choir'];
const SOLO = Object.keys(BOSSES).filter((k) => !BOSSES[k].raid && !REBUILT.includes(k));

// 10,000 seeds over everything a virus can be: wild viruses of every family at every level, strains, grades, run
// and home numbers, mutations rolled, forced and off, elites, bosses, guards and the named fixtures.
function config(i) {
  const r = (n) => (Math.imul(i + 1, 2654435761) >>> 0) % n;
  const seed = (i * 7919 + 13) >>> 0, threat = 10 + (i % 52), o = { threat, run: i % 3 !== 0 };
  if (i % 5 === 1) o.family = ['ransomware', 'worm', 'ghostroot'][r(3)];
  if (i % 7 === 2) { const st = Object.keys(STRAINS)[r(Object.keys(STRAINS).length)]; o.strain = st; o.family = STRAINS[st].lineage; }
  if (i % 4 === 3) o.grade = 1 + r(3);
  if (i % 9 === 4) o.mutation = null;
  if (i % 11 === 5) o.mutation = ['armored', 'regenerative', 'hasty', 'adaptive', 'rerouting'][r(5)];
  if (i % 13 === 6) { o.elite = true; if (r(2)) o.eliteHp = 1; }
  if (i % 17 === 7) { const b = SOLO[r(SOLO.length)]; o.boss = b; o.family = BOSSES[b].family || 'ransomware'; o.strain = BOSSES[b].strain || undefined; o.mutation = null; if (r(3) === 0) o.bossHp = 0.75; }
  const keys = ['random', 'random', 'random', ...Object.keys(FIXTURES), ...Object.keys(STRAINS)];
  const key = i % 6 === 5 ? keys[r(keys.length)] : 'random';
  return { key, seed, o: key === 'random' ? o : { threat, run: o.run, ...(o.grade ? { grade: o.grade } : {}) } };
}

test('golden: 10,000 seeds build the same viruses with genes as without, part for part and number for number', () => {
  let n = 0;
  for (let i = 0; i < 10000; i++) {
    const { key, seed, o } = config(i);
    const a = createVirus(key, seed, { ...o }), b = legacy(key, seed, { ...o });
    const { name, ...rest } = b;
    assert.deepEqual(strip(a), rest, `${key} ${seed} ${JSON.stringify(o)}`);
    assert.ok(nameOk(a, b), `${a.name} for ${b.name}`);
    assert.ok(a.genes.length >= 1, 'every virus carries genes');
    n++;
  }
  assert.equal(n, 10000);
  // Guards on their own keys too, at every layer's levels.
  for (const g of Object.keys(GUARDS)) for (let t = 10; t <= 50; t += 4) for (const run of [true, false]) { const { name, ...rest } = legacy(g, t * 31, { threat: t, run }); assert.deepEqual(strip(createVirus(g, t * 31, { threat: t, run })), rest, `${g} ${t}`); assert.equal(createVirus(g, t * 31, { threat: t, run }).name, name); }
});

// The same fight, played by the planner, on a virus from either builder: the same result, the same cycles, the same
// Signal lost and the same commands. Each subclass's own kit, so this holds whatever the class pass changes.
const same = (label, play) => {
  const now = play();
  hooks.createVirus = legacy;
  let then;
  try { then = play(); } finally { hooks.createVirus = null; }
  assert.deepEqual(now, then, label);
};
test('golden: the same fights end the same way, wild, strain, grade, guard and boss', () => {
  let n = 0;
  for (const b of BRACKETS.slice(0, 4)) {
    for (const policy of ['Breaker', 'Bastion', 'Infiltrator', 'Operator']) {
      for (let i = 0; i < 12; i++) { same(`${policy} ${b.name} wild ${i}`, () => fight(policy, 'random', b, { seed: i + 1, mode: 'run', zone: true })); n++; }
      for (const g of ['watchdog', 'sentinel', 'crawler', 'shredder', 'bouncer', 'tracer']) { same(`${policy} ${b.name} ${g}`, () => fight(policy, g, b, { mode: 'run', depth: b.depth })); n++; }
      for (const [k, strain] of strainsAt(b.level).entries()) { same(`${policy} ${b.name} ${strain}`, () => fight(policy, 'random', b, { seed: 100 + k, mode: 'run', zone: true, strain })); n++; }
      for (let i = 0; i < 3; i++) { same(`${policy} ${b.name} v2 ${i}`, () => fight(policy, 'random', b, { seed: 200 + i, mode: 'run', zone: true, grade: 2 })); n++; }
    }
  }
  for (const id of SOLO.filter((k) => k !== 'resident')) for (const L of [10, 18, 30]) for (const [cls, sub] of [['breaker', 'demolitionist'], ['operator', 'herder']]) { same(`${id} ${L} ${sub}`, () => bossFight(id, L, cls, sub, 1)); n++; }
  assert.ok(n > 500, `${n} fights`);
});

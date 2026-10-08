// The genome harness (genesim.mjs, docs/genome.md section 11) as tests: the rebuilt HASHLORD and MIRRORSHADE sit in the
// boss band at their floors, and every gene in play today has its cost and its answer measured, gene by gene. Targets
// the content doesn't meet yet are `todo` tests: they run and report the misfits, like the class band in balance.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bossBand, bossFight, geneCheck, PROBES, ANSWERED, SUBS, playersAt, player } from './genesim.mjs';
import { strainsAt } from './balance.mjs';
import { selectEncounter, command, resolveCycle, active } from './dist/combat.mjs';
import { planner } from './dist/planner.mjs';
import { BOSSES } from './dist/data.mjs';
import { GENES, GENE_IDS } from './dist/genes.mjs';

const SEEDS12 = Array.from({ length: 12 }, (_, i) => i + 1);
// The boss band (docs/genome.md 7.2): the planner wins 60–80% at the floor, a misreading planner at least 45%, and the
// blind one at least 20 points less than the reader (reading matters). No subclass under two in six; one that is gets
// flagged for its kit, not tuned around: the Sysop alone, weaker solo on purpose, against MIRRORSHADE's sustained
// pressure. Twelve seeds a cell, a little wider than the band for what the class pass may move.
const FLAGGED = { 'nb-mirrorshade': ['sysop'] };
const bands = {};
const band = (id) => (bands[id] ||= bossBand(id, BOSSES[id].floor, undefined, SEEDS12));

test('HASHLORD and MIRRORSHADE, rebuilt, sit in the boss band at their floors (16 and 12)', () => {
  for (const id of ['nb-hashlord', 'nb-mirrorshade']) {
    const b = band(id), line = `${id} at ${b.level}: read ${b.read.toFixed(2)} misread ${b.misread.toFixed(2)} blind ${b.blind.toFixed(2)} ${JSON.stringify(b.subs)}`;
    assert.ok(b.read >= 0.55 && b.read <= 0.85, line);
    assert.ok(b.misread >= 0.45, line);
    assert.ok(b.read - b.blind >= 0.2, line);
    for (const [sub, w] of Object.entries(b.subs)) if (!(FLAGGED[id] || []).includes(sub)) assert.ok(w >= 4, `${sub}: ${line}`);
    // The worst three cycles stay under 85% of your max, as the spike cap asks of a boss.
    assert.ok(b.three <= 0.85, `${line} three ${b.three}`);
  }
});

test('the rebuilt bosses keep their designs: one punishment per axis, one beat, and the signatures', async () => {
  const { compatible } = await import('./dist/genes.mjs');
  const { createVirus, TELL_SETS, TELLS } = await import('./dist/data.mjs');
  const { tellGenes, virusGenes } = await import('./dist/genome.mjs');
  const h = createVirus('random', 7, { family: 'ransomware', strain: 'hashrat', boss: 'nb-hashlord', threat: 25, run: true, mutation: null });
  assert.deepEqual(h.parts.map((p) => p.id), ['pulse', 'miner', 'poollock']);
  assert.ok(h.parts.find((p) => p.id === 'poollock').wardCommands);
  assert.deepEqual([...virusGenes(h).map((g) => g.id), ...tellGenes(h)], ['surge', 'cycletax', 'ward', 'overcharge', 'selfupdate', 'rekey']);
  assert.deepEqual(TELL_SETS['nb-hashlord'].map((k) => TELLS[k].name), ['Difficulty Bomb', 'Block Reward', 'Key Rotation']);
  const m = createVirus('random', 7, { family: 'ghostroot', boss: 'nb-mirrorshade', threat: 21, run: true, mutation: null });
  assert.deepEqual(m.parts.map((p) => p.id), ['pulse', 'scrambler', 'mimic']);
  assert.deepEqual([...virusGenes(m).map((g) => g.id), ...tellGenes(m)], ['surge', 'veil', 'scramble', 'mimic', 'overcharge', 'persistence', 'rekey']);
  // At 12 and 13 its budget trims the Scrambler: ◆3 and a Scramble every 5 cycles; from 14 it's whole.
  const sc = (L) => createVirus('random', 7, { family: 'ghostroot', boss: 'nb-mirrorshade', threat: L + 9, run: true, mutation: null }).parts.find((p) => p.id === 'scrambler');
  assert.equal(sc(12).maxArmor, 3); assert.equal(sc(12).attack.interval, 5);
  assert.ok(sc(14).maxArmor > 3); assert.equal(sc(14).attack.interval, 4);
  for (const v of [h, m]) assert.deepEqual(compatible([...virusGenes(v).map((g) => g.id), ...tellGenes(v)], { boss: true }), [], v.name);
  // HOLLOW CHOIR keeps one Decoy: Harmony, not a second beat.
  const c = createVirus('random', 7, { family: 'ghostroot', boss: 'choir', threat: 19, mutation: null });
  assert.equal(c.parts.filter((p) => p.reflect).length, 1);
  assert.ok(!BOSSES.choir.phases.some((ph) => ph.do.some((d) => d.startsWith('spawn'))));
  assert.deepEqual(compatible(virusGenes(c).map((g) => g.id), { boss: true }), []);
});

// ---------- per gene ----------
// Two seeds a cell here (node genesim.mjs genes runs six): every probe, at the levels it's open at among 5, 10, 18 and
// 30, on the four classes below 10 and every subclass from 10.
const SEEDS = [1, 2];
const checks = Object.fromEntries(Object.keys(PROBES).map((id) => [id, geneCheck(id, { seeds: SEEDS })]));
const BODY = ['surge', 'encrypt', 'replicate', 'scramble', 'veil']; // the body is free: no probe
const BUILT = Object.keys(PROBES).filter((id) => PROBES[id].build); // a named build, measured against its family's body

test('every gene in play has its cost measured: a probe for each one a virus rolls or carries, at every level it opens by', () => {
  const covered = new Set([...Object.keys(PROBES), ...BODY, ...Object.values(PROBES).flatMap((p) => p.also || [])]);
  assert.deepEqual(GENE_IDS.filter((id) => !covered.has(id)), []);
  for (const [id, c] of Object.entries(checks)) {
    assert.ok(Object.keys(c.levels).length >= 1, `${id} is measured somewhere`);
    for (const L of Object.keys(c.levels)) assert.ok(+L >= PROBES[id].opens, `${id} only from ${PROBES[id].opens}`);
    assert.ok(Number.isFinite(c.delta), id);
  }
  for (const id of ANSWERED) if (checks[id]) assert.ok(checks[id].answered && Number.isFinite(checks[id].answer), `${id} has an answer measured`);
  assert.equal(playersAt(5).length, 4); assert.equal(playersAt(18).length, SUBS.length);
});

// Bounds that hold today and guard what comes next: a gene a wild virus rolls (a third part, a mutation) or a tell
// never costs more than 25 points of Signal a fight on average over its levels, and ignoring one never costs more than 25.
test('no rolled gene or tell runs away: at most 25 points a fight with it, and at most 25 for ignoring it', () => {
  const off = [];
  for (const [id, c] of Object.entries(checks)) {
    if (BUILT.includes(id)) continue;
    if (c.delta > 25) off.push(`${id} costs ${c.delta.toFixed(1)}`);
    if (c.answered && c.ignoreCost > 25) off.push(`ignoring ${id} costs ${c.ignoreCost.toFixed(1)}`);
  }
  assert.deepEqual(off, []);
});

// The calibration targets (docs/genome.md 3.2 and 11.1): about 3 to 4 points of Signal a fight per cost point (2 to 6
// here, over noise), answering a gene worth at least 3 points, ignoring one costing no more than 20, and every
// subclass owning an answer that wins at least as often as ignoring (rule 4). Named builds are measured against their
// family's body, which they replace a part of, so they're reported in genesim.mjs and left out of the point target.
test('per-gene calibration: about 3–4 points a cost point, answers worth 3 or more, ignoring 20 at most, an answer in every kit', { todo: 'docs/genome.md "What shipped" has the table: Armored, Linked and the Keyring cost far more than their points, Regenerative, Adaptive, Escalation, the Decoy, the Mimic and most tells far less (the Decoy and the Mimic trim the other parts by 15%, so a reader comes out ahead); the Keyring is now answered as it should be (the Gate between re-arms, the Keyring first only for a Breaker that can\'t get through the Gate\'s shell in time), which saves a Lv 5 Breaker most of its fights but is worth little over every kit' }, () => {
  const off = [];
  for (const [id, c] of Object.entries(checks)) {
    if (BUILT.includes(id)) continue;
    if (c.perPoint < 2 || c.perPoint > 6) off.push(`${GENES[id].name} ${c.perPoint.toFixed(1)} a point`);
    if (c.answered && c.answer < 3) off.push(`answering ${GENES[id].name} saves ${c.answer.toFixed(1)}`);
    if (c.answered && c.ignoreCost > 20) off.push(`ignoring ${GENES[id].name} costs ${c.ignoreCost.toFixed(1)}`);
    if (c.answered) for (const [who, x] of Object.entries(c.subs)) if (x.with < x.ignore) off.push(`${who} wins more ignoring ${GENES[id].name}`);
  }
  assert.deepEqual(off, []);
});

// The spike cap (docs/genome.md rule 5, as the designer set it in docs/kits.md 11, CONFIG.spikeCap): a solo boss's
// single landing may reach 60% of your max, so it hurts but never one-shots you, and a wild virus's or a guard's charge
// stops at 45%. The rebuilt bosses on their twelve seeds, every solo boss at 10, 18 and 30 on one seed a subclass,
// and the hard slice of wild fights (every open strain, elites) at 10 and 30.
test('the spike cap: a solo boss lands at most 60% of your max in one hit, a wild virus\'s charge at most 45%', () => {
  for (const id of ['nb-hashlord', 'nb-mirrorshade']) assert.ok(band(id).spike <= 0.6, `${id}: ${band(id).spike.toFixed(2)} (${band(id).spikeBy})`);
  const solo = Object.keys(BOSSES).filter((k) => !BOSSES[k].raid);
  for (const id of solo) for (const L of [10, 18, 30]) for (const [cls, sub] of SUBS) {
    const r = bossFight(id, Math.max(L, BOSSES[id].floor || 0), cls, sub, 1);
    assert.ok(r.spike <= 0.6, `${id} at ${L}, ${sub}: ${r.spike.toFixed(2)} (${r.spikeBy})`);
  }
  let charges = 0;
  for (const L of [10, 30]) for (const [cls, sub] of SUBS) {
    const fights = [...strainsAt(L).map((strain, i) => ({ strain, seed: 100 + i })), ...[0, 1, 2].map((i) => ({ elite: true, seed: 950 + i }))];
    for (const f of fights) {
      const s = player(cls, sub, L), max = s.run.max;
      s.rng = (f.seed * 2654435761 + L) >>> 0;
      selectEncounter(s, 'random', f.seed, { mode: 'run', room: '/sim', level: L, zone: true, strain: f.strain, ...(f.elite ? { elite: true } : {}) });
      s.encounter.soft = 1;
      command(s, 'engage');
      for (let n = 0; n < 80 && active(s); n++) {
        command(s, planner(s) || 'hold');
        for (const x of resolveCycle(s)) if (x.type === 'server-hit' && x.tell && !x.who) { charges++; assert.ok(x.amount <= 0.45 * max + 1, `${sub} at ${L}, ${JSON.stringify(f)}: ${x.message} (max ${max})`); }
      }
    }
  }
  assert.ok(charges > 20, `charges landed: ${charges}`);
});

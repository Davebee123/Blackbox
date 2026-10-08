// Genes (genes.mjs, docs/genome.md): today's content, read as genes. Every family, strain, third part, mutation, tell
// and guard rule is a gene or a set of genes, every gene is carried by something in the game, and today's wild
// viruses all pass the compatibility rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GENES, GENE_IDS, AXES, CATS, partGenes, compatible, budgetFor } from './dist/genes.mjs';
import { AUTHORS, crewOf } from './dist/authors.mjs';
import { createVirus, FAMILIES, STRAINS, GUARDS, MUTATIONS, ROLLED_MUTATIONS, TELLS, TELL_SETS } from './dist/data.mjs';
import { CREWS } from './dist/mail.mjs';

const ids = (v) => v.genes.map((g) => g.id);

test('the library: 41 genes that carry today\'s content, each with a category, an axis, a role, a cost and an answer', () => {
  assert.equal(GENE_IDS.length, 41);
  for (const [id, g] of Object.entries(GENES)) {
    assert.ok(CATS[g.cat] && AXES[g.axis], id);
    assert.ok(['primary', 'amplifier'].includes(g.role), id);
    assert.ok(g.cost >= 1 && g.cost <= 3 && g.opens >= 1, id);
    for (const k of ['name', 'adj', 'does', 'telegraph', 'answer', 'implicit']) assert.ok(g[k]?.length > 3, `${id}.${k}`);
    assert.ok(['part', 'tell', 'kills'].includes(g.decode), id);
  }
  const by = Object.fromEntries(Object.keys(CATS).map((c) => [c, GENE_IDS.filter((id) => GENES[id].cat === c).length]));
  assert.deepEqual(by, { attack: 10, part: 9, defence: 3, rule: 9, tell: 10 });
});

test('today\'s content, mapped: the bodies, the third parts, the mutations, the strains and the guards are genes', () => {
  const body = (f) => ids(createVirus('random', 5, { family: f, threat: 10, genes: [] }));
  assert.deepEqual(body('ransomware'), ['surge', 'encrypt']);
  assert.deepEqual(body('worm'), ['surge', 'replicate']);
  assert.deepEqual(body('ghostroot'), ['surge', 'veil', 'scramble']);
  for (const f of Object.keys(FAMILIES)) assert.deepEqual([...body(f)].sort(), [...FAMILIES[f].core].sort(), f);
  // Each third part is its gene's part, in its family's pool.
  const third = { lockbox: 'ward', mutex: 'mutexlock', tripwire: 'tripwire', mirror: 'twin', c2: 'c2', decoy: 'decoymirror', mimic: 'mimic' };
  for (const f of Object.values(FAMILIES)) for (const p of f.parts.filter((x) => x.pool === 'third')) assert.equal(p.gene, third[p.id], p.id);
  for (const [part, gene] of Object.entries(third)) {
    const fam = Object.keys(FAMILIES).find((f) => FAMILIES[f].parts.some((p) => p.id === part));
    const v = createVirus('random', 9, { family: fam, threat: 40, genes: [gene], mutation: null });
    assert.ok(v.parts.some((p) => p.id === part), part);
    assert.deepEqual(v.genes.find((g) => g.id === gene), { id: gene, src: 'rolled' });
  }
  // Mutations are rule genes with the same rule.
  for (const m of ROLLED_MUTATIONS) { assert.equal(MUTATIONS[m].gene, m); assert.equal(MUTATIONS[m].rule, GENES[m].does); assert.ok(GENES[m].mutation); }
  assert.equal(MUTATIONS.rerouting.gene, 'linked');
  // Linked from v2.
  assert.ok(ids(createVirus('random', 3, { threat: 20, grade: 2 })).includes('linked'));
  assert.ok(!ids(createVirus('random', 3, { threat: 20, grade: 1, mutation: null })).includes('linked'));
  // Strains are named builds of their authors, with their genes on their rule's part.
  const builds = { keylogger: ['synclock', 'keystrokedump'], hashrat: ['cycletax'], floodgate: ['floodramp'], leech: ['siphon'], sleeper: ['dormant'], patchwork: ['mend'], flicker: ['phaseshift'], extortion: ['deadline'], echo: ['echo'], bricker: ['rage'], overrun: ['hivebrood'] };
  const author = { keylogger: 'nullchoir', hashrat: 'glassjaw', floodgate: 'swarmline', leech: 'swarmline', sleeper: 'palemask', patchwork: 'swarmline', flicker: 'palemask', extortion: 'tollgate', echo: 'palemask', bricker: 'tollgate', overrun: 'swarmline' };
  for (const [k, st] of Object.entries(STRAINS)) {
    assert.deepEqual(st.genes, builds[k], k);
    assert.equal(st.author, author[k], k);
    assert.ok(GENES[st.tell.gene]?.cat === 'tell', k);
    const v = createVirus(k, 7, { threat: 20, mutation: null });
    for (const id of st.genes) assert.ok(v.genes.some((g) => g.id === id && g.src === 'build'), `${k} carries ${id}`);
    assert.equal(v.author, st.author);
  }
  // The guards: Surge bodies, the Sentinel veiled, the Crawler's Brood replicates; the ICE carry Kestrel's builds.
  assert.deepEqual(ids(createVirus('bouncer', 3, { threat: 20 })), ['surge', 'keyring']);
  assert.deepEqual(ids(createVirus('tracer', 3, { threat: 20 })), ['surge', 'escalation']);
  assert.deepEqual(ids(createVirus('sentinel', 3, { threat: 20 })), ['surge', 'veil']);
  assert.deepEqual(ids(createVirus('crawler', 3, { threat: 20 })), ['surge', 'replicate']);
  for (const g of ['bouncer', 'tracer', 'sentinel']) assert.equal(createVirus(g, 3, { threat: 20 }).author, 'kestrel');
  // Every tell is a tell gene (the Mimic's beat is its part's gene).
  for (const [k, t] of Object.entries(TELLS)) assert.ok(GENES[t.gene] && (GENES[t.gene].cat === 'tell' || k === 'mimic'), k);
  for (const set of Object.values(TELL_SETS)) for (const k of set) assert.ok(TELLS[k], k);
});

test('every gene is carried by something in the game today', () => {
  const seen = new Set();
  const all = [
    ...Object.keys(FAMILIES).flatMap((f) => FAMILIES[f].third.map((g) => createVirus('random', 3, { family: f, threat: 40, genes: [g] }))),
    ...ROLLED_MUTATIONS.map((m) => createVirus('random', 3, { threat: 20, mutation: m })),
    ...Object.keys(STRAINS).map((k) => createVirus(k, 3, { threat: 20 })),
    ...Object.keys(GUARDS).map((k) => createVirus(k, 3, { threat: 20 })),
    createVirus('random', 3, { threat: 20, grade: 2 }),
  ];
  for (const v of all) for (const g of v.genes) seen.add(g.id);
  for (const t of Object.values(TELLS)) seen.add(t.gene);
  for (const st of Object.values(STRAINS)) seen.add(st.tell.gene);
  assert.deepEqual(GENE_IDS.filter((id) => !seen.has(id)), []);
});

test('the authors: TOLLGATE, SWARMLINE and PALEMASK write the three families, as the contract mail names them', () => {
  for (const [f, name] of Object.entries(CREWS)) assert.equal(AUTHORS[crewOf(f)].name, name);
  for (const f of Object.keys(FAMILIES)) assert.equal(createVirus('random', 11, { family: f, threat: 12 }).author, crewOf(f));
  for (const a of Object.values(AUTHORS)) assert.ok(a.style.length > 20 && a.colour, a.name);
  // A signature gene of an author that exists today is in the library.
  for (const a of Object.values(AUTHORS)) for (const id of a.signature) if (!['ransomtimer', 'hotspare', 'synflood', 'acl', 'watchdogtimer', 'packed', 'honeypot'].includes(id)) assert.ok(GENES[id], `${a.name}: ${id}`);
});

test('compatibility: today\'s wild viruses all pass the rules (one punishment per axis, one beat), tells left out', () => {
  let n = 0;
  for (let seed = 1; seed <= 3000; seed++) {
    const v = createVirus('random', seed, { threat: 10 + (seed % 40), run: true, grade: 1 + (seed % 3) });
    assert.deepEqual(compatible(ids(v)), [], `${v.name}: ${ids(v)}`);
    n++;
  }
  for (const k of Object.keys(STRAINS)) for (const m of [null, ...ROLLED_MUTATIONS]) assert.deepEqual(compatible(ids(createVirus(k, 5, { threat: 30, mutation: m, grade: 3 }))), [], `${k} ${m}`);
  assert.equal(n, 3000);
  // What the rules reject: two amplifiers on one axis, two beats, the hard exclusions.
  assert.equal(compatible(['surge', 'scramble', 'veil', 'mimic', 'decoymirror']).length, 2, 'MIRRORSHADE after half, before its rebuild');
  assert.equal(compatible(['decoymirror', 'decoymirror']).length, 2, 'HOLLOW CHOIR\'s second Decoy, before Harmony');
  assert.ok(compatible(['synclock', 'clockglitch']).length);
  assert.deepEqual(compatible(['surge', 'scramble', 'possession', 'persistence', 'overcharge']), [], 'tells don\'t count');
});

test('the budget: points by level and grade, for the genes phase 3 rolls', () => {
  assert.equal(budgetFor(2), 0);
  assert.equal(budgetFor(5), 2);
  assert.equal(budgetFor(10), 4);
  assert.equal(budgetFor(18, { grade: 2 }), 7);
  assert.equal(budgetFor(30, { grade: 3 }), 9);
  assert.equal(budgetFor(40, { elite: true }), 11);
});

test('a part\'s genes: Surge only on a plain attacker; a gene\'s own small hit stays its gene\'s', () => {
  const v = createVirus('random', 3, { family: 'ransomware', threat: 40, genes: ['tripwire'], mutation: null });
  assert.deepEqual(partGenes(v.parts.find((p) => p.id === 'tripwire')), ['tripwire']);
  assert.deepEqual(partGenes(v.parts.find((p) => p.id === 'pulse')), ['surge']);
  const b = createVirus('bricker', 3, { threat: 20 });
  assert.deepEqual(partGenes(b.parts[0]), ['surge', 'rage']);
  assert.deepEqual(partGenes({ kind: 'fragment', attack: { effect: 'damage' } }), []);
});

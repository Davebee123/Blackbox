// The genome in play (genome.mjs, docs/genome.md phase 1): names and bylines, the gene codex, `scan` and `inspect`, and
// HASHLORD's and MIRRORSHADE's lairs opening at their floors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, selectEncounter, syncServer, part, knowsPart } from './dist/combat.mjs';
import { play, layoutOf } from './dist/run.mjs';
import { createVirus, BOSSES } from './dist/data.mjs';
import { GENES } from './dist/genes.mjs';
import { geneState, codexCount, genomeCard, cardLines, virusGenes } from './dist/genome.mjs';
import { hudMarkup, codexMarkup, netTranscript } from './dist/view.mjs';
import { signature, openLair, lairOf, networkLines } from './dist/network.mjs';
import { rogueSpawns } from './dist/rogue.mjs';

// Win the fight you're in: every part down to 1, bare, then a Spike each.
const win = (s) => { for (let i = 0; i < 12 && s.encounter?.phase === 'active'; i++) { const p = s.encounter.virus.parts.find((x) => x.integrity > 0); Object.assign(p, { integrity: 1, armor: 0 }); command(s, 'spike ' + p.id); resolveCycle(s); } assert.equal(s.encounter.phase, 'victory'); };
const at = (level, cls = 'breaker') => { const s = fresh(); s.hackers = { [cls]: { level, xp: 0 } }; s.loadout.archetype = cls; syncServer(s); s.server.integrity = s.server.max; return s; };

test('names and bylines: WARDED CRYPTJACK-4821 v2 · TOLLGATE, a named build keeps its name, SPRAWL-00\'s strays sign nothing', () => {
  const v = createVirus('random', 4821, { family: 'ransomware', threat: 22, grade: 2, genes: ['ward', 'hasty'], run: true });
  assert.equal(v.name, 'WARDED CRYPTJACK-4821 v2');
  assert.equal(v.author, 'tollgate');
  assert.deepEqual(v.genes.map((g) => `${g.id}:${g.src}`), ['surge:core', 'encrypt:core', 'ward:rolled', 'hasty:rolled', 'linked:grade']);
  assert.equal(createVirus('hashrat', 193, { threat: 20, grade: 2, mutation: 'armored' }).name, 'HASHRAT-0193 v2');
  assert.equal(createVirus('random', 7, { family: 'worm', threat: 12, genes: [] }).name, 'SPLINTER-0007');
  // The fight on a run carries its file's tag, and the HUD the byline in the author's colour.
  const s = at(12);
  play(s, 'connect sprawl'); play(s, 'cd tmp');
  const file = s.logs.findLast((e) => e.type === 'net-ls').entries.find((x) => x.kind === 'virus').name.replace(/\.exe$/, '');
  assert.match(file, /^(cryptjack|splinter|ghostroot)-\d{4}$/);
  play(s, 'attack');
  assert.ok(s.encounter.virus.name.endsWith(file.toUpperCase()), `${s.encounter.virus.name} for ${file}`);
  assert.equal(s.encounter.virus.author, null, 'SPRAWL-00 is nobody\'s');
  assert.doesNotMatch(hudMarkup(s), /class="byline"/);
  // A traced server's guard is its family's crew's; a faction's server is the faction's; ICE is Kestrel's.
  const t = at(12);
  command(t, 'developer location worm');
  const loc = t.locations.find((l) => !l.zone);
  const guarded = Object.keys(layoutOf(loc)).find((k) => layoutOf(loc)[k].guard);
  play(t, 'connect ' + loc.id); play(t, 'cd ' + guarded.slice(1));
  assert.equal(t.encounter.virus.author, ['bouncer', 'tracer', 'sentinel'].includes(t.encounter.virus.family) ? 'kestrel' : 'swarmline');
  assert.match(hudMarkup(t), /class="byline"[^>]*>· (SWARMLINE|Kestrel)</);
  play(t, 'jack out');
  loc.faction = 'glassjaw'; loc.lockUntil = 0;
  for (const k of Object.keys(loc.state.cleared || {})) delete loc.state.cleared[k];
  t.encounter = null;
  play(t, 'connect ' + loc.id); play(t, 'cd ' + guarded.slice(1));
  if (!['bouncer', 'tracer', 'sentinel'].includes(t.encounter.virus.family)) assert.equal(t.encounter.virus.author, 'glassjaw');
});

test('the gene codex: ??? until met, seen in a fight, decoded by breaking its part, reading its tell, or two kills of a rule', () => {
  const s = at(12);
  assert.equal(geneState(s, 'surge'), 'unknown');
  assert.match(codexMarkup(s), /Codex · 0\/41 decoded/);
  assert.match(codexMarkup(s), /An attack type you haven&#39;t met/);
  selectEncounter(s, 'random', 5, { level: 12, family: 'ransomware', genes: ['ward'], mutation: 'armored' });
  command(s, 'engage');
  for (const id of ['surge', 'encrypt', 'ward', 'armored']) assert.equal(geneState(s, id), 'seen', id);
  assert.equal(geneState(s, 'mimic'), 'unknown');
  // Break the Lockbox: Ward is decoded, and the codex says what it does.
  const lock = part(s, 'lockbox');
  Object.assign(lock, { armor: 0, integrity: 1 });
  command(s, 'spike lockbox');
  const ev = resolveCycle(s);
  assert.ok(ev.some((e) => e.type === 'codex' && /Ward/.test(e.message)));
  assert.equal(geneState(s, 'ward'), 'decoded');
  assert.match(codexMarkup(s), new RegExp(GENES.ward.does.slice(0, 30)));
  // Two kills of an Armored virus decode Armored.
  win(s);
  assert.equal(s.geneCodex.armored.kills, 1);
  assert.equal(geneState(s, 'armored'), 'seen');
  s.encounter = null;
  selectEncounter(s, 'random', 6, { level: 12, family: 'worm', genes: [], mutation: 'armored' });
  command(s, 'engage');
  win(s);
  assert.equal(geneState(s, 'armored'), 'decoded');
  assert.ok(codexCount(s).decoded >= 2);
});

test('the codex carries across bodies, and a save from before genes reads its part codex as genes, with no migration', () => {
  const old = fresh();
  old.codex = { 'ransomware:pulse': true, 'ransomware:lockbox': true, 'keylogger:logger': true };
  old.met = { ghostroot: true };
  delete old.geneCodex;
  for (const id of ['surge', 'ward', 'synclock', 'keystrokedump']) assert.equal(geneState(old, id), 'decoded', id);
  assert.equal(geneState(old, 'scramble'), 'seen', 'a family you met shows its body\'s genes');
  assert.equal(geneState(old, 'decoymirror'), 'unknown', 'but not the third parts you never saw');
  // A worm's Pulse Node is known on sight: Surge is decoded.
  selectEncounter(old, 'splinter', 3, { level: 8 });
  assert.ok(knowsPart(old, old.encounter.virus, old.encounter.virus.parts.find((p) => p.id === 'pulse')));
});

test('scan: the genome card before you engage costs 1 Signal (and Trace on a break-in); an Infiltrator scans free and reads deeper', () => {
  const s = at(12);
  play(s, 'connect sprawl'); play(s, 'cd tmp');
  const before = s.run.integrity;
  play(s, 'scan');
  const card = s.logs.findLast((e) => e.type === 'net-scan');
  assert.ok(card?.card, 'a card');
  assert.equal(s.run.integrity, before - 1);
  assert.match(card.message, /stray nobody signs/);
  assert.match(card.message, /Its body carries (two attack types you haven't seen|an attack type you haven't seen)/);
  assert.match(netTranscript(s), /class="scan-card"/);
  assert.equal(s.encounter, null, 'scanning starts nothing');
  // Scan a folder next door on a traced server: its guard, and the Trace.
  const t = at(12);
  command(t, 'developer location ransomware');
  const loc = t.locations.find((l) => !l.zone);
  play(t, 'connect ' + loc.id);
  const kid = layoutOf(loc)['/'].dirs.find((d) => layoutOf(loc)['/' + d]?.guard);
  if (kid) {
    const trace = t.run.trace || 0;
    play(t, 'scan ' + kid);
    assert.ok(t.logs.findLast((e) => e.type === 'net-scan'), 'the guard\'s card');
    assert.equal(t.run.trace, trace + 4);
  }
  // An Infiltrator: free and quiet, the rules of genes it hasn't decoded, and its inspect reads them in that fight.
  const i = at(12, 'infiltrator');
  play(i, 'connect sprawl'); play(i, 'cd tmp');
  const sig = i.run.integrity;
  play(i, 'scan');
  assert.equal(i.run.integrity, sig);
  const deep = i.logs.findLast((e) => e.type === 'net-scan');
  assert.ok(deep.card.deep && deep.card.genes.every((c) => c.rule), 'every rule');
  play(i, 'attack');
  const n = i.logs.length, cycle = i.encounter.cycle;
  command(i, 'inspect pulse');
  assert.equal(i.encounter.cycle, cycle, 'inspect takes no cycle');
  assert.match(i.logs.slice(n).map((e) => e.message).join(' '), /Surge is an attack type that presses on Burst\. Deals a plain heavy hit/);
});

test('inspect: a part\'s genes, what each does once decoded, and nothing spent', () => {
  const s = at(12);
  selectEncounter(s, 'random', 9, { level: 12, family: 'worm', genes: ['twin'], mutation: null });
  command(s, 'engage');
  const n = s.logs.length;
  command(s, 'inspect mirror');
  const say = s.logs.slice(n).map((e) => e.message).join('\n');
  assert.match(say, /The Mirror carries Twin/);
  assert.match(say, /haven't decoded Twin yet/);
  assert.equal(s.encounter.queue, null, 'no command queued');
  // A fight's card, free: scan mid-fight.
  command(s, 'scan');
  assert.match(s.logs.at(-1).message, /written by SWARMLINE/);
  assert.match(cardLines(genomeCard(s, s.encounter.virus)).join(' '), /It also carries Twin/);
  assert.ok(virusGenes(s.encounter.virus).some((g) => g.id === 'twin'));
});

test('HASHLORD and MIRRORSHADE hold /core from their floors: the lair opens at 8, its boss when you reach 16 or 12', () => {
  let seed = 1, boss = null;
  for (; seed < 5000; seed++) if (signature(seed).boss === 'nb-hashlord') { boss = 'nb-hashlord'; break; }
  const s = at(10);
  s.netSeed = seed;
  for (const f of ['ransomware', 'worm', 'ghostroot']) command(s, 'developer location ' + f);
  openLair(s);
  const lair = lairOf(s);
  assert.ok(lair && lair.lair === boss);
  assert.equal(rogueSpawns(s, lair, Date.now())['/core'], undefined, 'no HASHLORD at 10');
  assert.ok(rogueSpawns(s, lair, Date.now())['/outer']?.alive, 'its folders are open');
  assert.match(networkLines(s, 'you').join(' '), /holds \/core from level 16/);
  play(s, 'connect lair'); play(s, 'cd core');
  const why = play(s, 'attack').map((e) => e.message).join(' ');
  assert.match(why, /isn't in yet\. It holds \/core from level 16/);
  play(s, 'jack out');
  s.hackers.breaker.level = 16;
  assert.equal(rogueSpawns(s, lair, Date.now())['/core']?.boss, 'nb-hashlord');
  assert.equal(BOSSES['nb-mirrorshade'].floor, 12);
});

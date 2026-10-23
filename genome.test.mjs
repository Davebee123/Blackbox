// The genome in play (genome.mjs, docs/genome.md phase 1): names and bylines, what the rules' chips know (a part's rule
// by its research, research.mjs; a tell's once answered; a mutation's at two kills), `scan` and `inspect`, and
// HASHLORD's and MIRRORSHADE's lairs opening at their floors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, selectEncounter, syncServer, part, knowsPart, restore } from './dist/combat.mjs';
import { play, layoutOf } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { createVirus, BOSSES } from './dist/data.mjs';
import { GENES } from './dist/genes.mjs';
import { geneState, genomeCard, cardLines, virusGenes } from './dist/genome.mjs';
import { hudMarkup, netTranscript } from './dist/view.mjs';
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
  // The fight on a run carries its spawn's tag (SPRAWL-00's rooms are its folders: netrooms.mjs), and the HUD the
  // byline in the author's colour.
  const s = at(12);
  play(s, 'connect sprawl'); play(s, 'cd tmp');
  const file = s.zone.spawns['/tmp'].name;
  assert.match(file, /^(cryptjack|splinter|ghostroot)-\d{4}$/);
  play(s, 'attack');
  assert.ok(s.encounter.virus.name.endsWith(file.toUpperCase()), `${s.encounter.virus.name} for ${file}`);
  assert.equal(s.encounter.virus.author, null, 'SPRAWL-00 is nobody\'s');
  assert.doesNotMatch(hudMarkup(s), /class="byline"/);
  // A traced server's guard post is its family's crew's; a faction's server is the faction's; ICE is Kestrel's.
  const t = at(12);
  command(t, 'developer location worm');
  const loc = t.locations.find((l) => !l.zone);
  const toGuard = () => { const R = t.rooms, g = R.graph, post = Object.values(g.rooms).find((r) => r.kind === 'guard'); R.at = FP.neighbours(g, post.id)[0]; R.screen = null; FP.go(t, post.id); FP.act(t, 'engage'); };
  play(t, 'connect ' + loc.id); toGuard();
  assert.equal(t.encounter.virus.author, ['bouncer', 'tracer', 'sentinel'].includes(t.encounter.virus.family) ? 'kestrel' : 'swarmline');
  assert.match(hudMarkup(t), /class="byline"[^>]*>· (SWARMLINE|Kestrel)</);
  play(t, 'jack out');
  loc.faction = 'glassjaw'; loc.lockUntil = 0;
  for (const k of Object.keys(loc.floorplan.down)) delete loc.floorplan.down[k];
  t.encounter = null;
  play(t, 'connect ' + loc.id); toGuard();
  if (!['bouncer', 'tracer', 'sentinel'].includes(t.encounter.virus.family)) assert.equal(t.encounter.virus.author, 'glassjaw');
});

test('the rules\' chips: ??? until met, seen in a fight; a part\'s rule at its research 15, a mutation\'s at two kills', () => {
  const s = at(12);
  assert.equal(geneState(s, 'surge'), 'unknown');
  selectEncounter(s, 'random', 5, { level: 12, family: 'ransomware', genes: ['ward'], mutation: 'armored' });
  command(s, 'engage');
  for (const id of ['surge', 'encrypt', 'ward', 'armored']) assert.equal(geneState(s, id), 'seen', id);
  assert.equal(geneState(s, 'mimic'), 'unknown');
  // Break the Lockbox from research 2: it's decoded (research 3), but Ward's rule waits for research 15 on a part that carries it.
  const lock = part(s, 'lockbox');
  s.research['ransomware:lockbox'] = 2;
  Object.assign(lock, { armor: 0, integrity: 1 });
  command(s, 'spike lockbox');
  const ev = resolveCycle(s);
  const line = ev.find((e) => e.type === 'codex');
  assert.equal(line?.message, 'Lockbox decoded: research 3. Hover it to see its numbers.');
  assert.doesNotMatch(line.message, /gene|Ward/i, 'the decode names the part, nothing else');
  assert.equal(s.research['ransomware:lockbox'], 3);
  assert.equal(geneState(s, 'ward'), 'seen', 'a decode alone is not its rule');
  s.research['ransomware:lockbox'] = 15;
  assert.equal(geneState(s, 'ward'), 'decoded', 'research 15: its rule');
  // Two kills of an Armored virus decode Armored (mutations stay as they were).
  win(s);
  assert.equal(s.geneCodex.armored.kills, 1);
  assert.equal(geneState(s, 'armored'), 'seen');
  s.encounter = null;
  selectEncounter(s, 'random', 6, { level: 12, family: 'worm', genes: [], mutation: 'armored' });
  command(s, 'engage');
  win(s);
  assert.equal(geneState(s, 'armored'), 'decoded');
});

test('knowledge stays on the part: a worm\'s Pulse Node is not known because you researched a ransomware one, and an older save\'s part codex is research 3', () => {
  const raw = JSON.parse(JSON.stringify(fresh()));
  delete raw.research;
  raw.codex = { 'ransomware:pulse': true, 'ransomware:lockbox': true, 'keylogger:logger': true };
  raw.met = { ghostroot: true };
  delete raw.geneCodex;
  const old = restore(raw);
  selectEncounter(old, 'cryptjack', 3, { level: 8 });
  assert.deepEqual(old.research, { 'ransomware:pulse': 3, 'ransomware:lockbox': 3, 'keylogger:logger': 3 }, 'each part it decoded starts at 3');
  assert.ok(knowsPart(old, old.encounter.virus, old.encounter.virus.parts.find((p) => p.id === 'pulse')));
  for (const id of ['surge', 'ward', 'synclock', 'keystrokedump']) assert.notEqual(geneState(old, id), 'decoded', `${id}: research 3 is not its rule`);
  assert.equal(geneState(old, 'scramble'), 'seen', 'a family you met shows its body\'s rules as seen');
  assert.equal(geneState(old, 'decoymirror'), 'unknown', 'but not the third parts you never saw');
  old.encounter = null;
  selectEncounter(old, 'splinter', 3, { level: 8 });
  assert.ok(!knowsPart(old, old.encounter.virus, old.encounter.virus.parts.find((p) => p.id === 'pulse')), 'a worm\'s Pulse Node is its own part');
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
  assert.match(card.message, /Its body carries [A-Z]/, 'a scan names what it carries, met or not');
  assert.doesNotMatch(card.message, /you haven't seen/);
  assert.match(netTranscript(s), /class="scan-card"/);
  assert.equal(s.encounter, null, 'scanning starts nothing');
  // Scan a room next door on a traced server (no Trace since R1: the break-in Trace is cut).
  const t = at(12);
  command(t, 'developer location ransomware');
  const loc = t.locations.find((l) => !l.zone);
  play(t, 'connect ' + loc.id);
  const R = t.rooms, kid = FP.neighbours(R.graph, R.at).map((id) => R.graph.rooms[id]).find((r) => FP.isUp(t, r) && r.kind !== 'core');
  if (kid) {
    // Unknown until you've been in it (floorplan.mjs fog): nothing to read from outside, and nothing spent.
    const sig1 = t.run.integrity, cards = t.logs.filter((e) => e.type === 'net-scan').length;
    play(t, 'scan ' + kid.dir);
    assert.equal(t.logs.filter((e) => e.type === 'net-scan').length, cards, 'no card for an unknown room');
    assert.match(t.logs.at(-1).message, /haven't been in that room/);
    assert.equal(t.run.integrity, sig1);
    R.seen[kid.id] = 'kind'; // discovered (as if you'd been in and stepped back)
    const sig0 = t.run.integrity;
    play(t, 'scan ' + kid.dir);
    assert.ok(t.logs.findLast((e) => e.type === 'net-scan'), 'its card');
    assert.equal(t.run.integrity, sig0 - 1);
  }
  // An Infiltrator: free and quiet, the rules it hasn't learned, and its inspect reads them in that fight.
  const i = at(12, 'infiltrator');
  play(i, 'connect sprawl'); play(i, 'cd tmp');
  const sig = i.run.integrity;
  play(i, 'scan');
  assert.equal(i.run.integrity, sig);
  const deep = i.logs.findLast((e) => e.type === 'net-scan');
  assert.ok(deep.card.deep && deep.card.genes.every((c) => c.rule), 'every rule');
  play(i, 'attack');
  const n = i.logs.length, cycle = i.encounter.cycle;
  const plain = i.encounter.virus.parts.find((p) => p.attack?.effect === 'damage' && (p.basic || p.id === 'pulse')); // its basic (the parts roll picks it: dist/parts.mjs)
  command(i, 'inspect ' + plain.id);
  assert.equal(i.encounter.cycle, cycle, 'inspect takes no cycle');
  assert.match(i.logs.slice(n).map((e) => e.message).join(' '), /Surge is an attack type\. Deals a plain heavy hit/);
});

test('inspect: a part\'s rules, what each does once its research says so, and nothing spent', () => {
  const s = at(12);
  selectEncounter(s, 'random', 9, { level: 12, family: 'worm', genes: ['twin'], mutation: null });
  command(s, 'engage');
  const n = s.logs.length;
  command(s, 'inspect mirror');
  const say = s.logs.slice(n).map((e) => e.message).join('\n');
  assert.match(say, /The Mirror carries Twin/);
  assert.match(say, /You haven't learned Twin yet\. Reach research 15 on the Mirror to learn what it does\./);
  assert.doesNotMatch(say, /gene/i);
  assert.equal(s.encounter.queue, null, 'no command queued');
  // A fight's card, free: scan mid-fight.
  command(s, 'scan');
  assert.match(s.logs.at(-1).message, /written by SWARMLINE/);
  assert.match(cardLines(genomeCard(s, s.encounter.virus)).join(' '), /It also carries Twin/);
  assert.ok(virusGenes(s.encounter.virus).some((g) => g.id === 'twin'));
});

test('HASHLORD and MIRRORSHADE hold /core from their floors: a lair stands on floor 2 and deeper, its boss when you reach 16 or 12', () => {
  let seed = 1, boss = null;
  for (; seed < 5000; seed++) if (signature(seed).boss === 'nb-hashlord') { boss = 'nb-hashlord'; break; }
  const s = at(10);
  s.netSeed = seed;
  for (const f of ['ransomware', 'worm', 'ghostroot']) command(s, 'developer location ' + f);
  openLair(s, true); // developer lair: the lair on floor 2, located now (a player traces it, floors.mjs)
  const lair = lairOf(s);
  assert.ok(lair && lair.lair === boss);
  assert.equal(rogueSpawns(s, lair, Date.now())['/core'], undefined, 'no HASHLORD at 10');
  assert.ok(rogueSpawns(s, lair, Date.now())['/outer']?.alive, 'its folders are open');
  assert.match(networkLines(s, 'you').join(' '), /holds the Core from level 16/);
  play(s, 'connect lair');
  const why = play(s, 'cd core').map((e) => e.message).join(' ');
  assert.match(why, /The Core is sealed\. HASHLORD holds it from level 16/); // its Core room (netrooms.mjs)
  play(s, 'jack out');
  s.hackers.breaker.level = 16;
  assert.equal(rogueSpawns(s, lair, Date.now())['/core']?.boss, 'nb-hashlord');
  assert.equal(lair.spawns['/core'].level, 16, 'never under its floor');
  assert.equal(BOSSES['nb-mirrorshade'].floor, 12);
});

// Rivals (GAME_RULES.md "Rivals", docs/rivals.md): named runners who race you to a server's vault and fight you
// trainer-style. rivals.mjs (the roll, the walk, the lineup, the counter-pick, stakes and memory), floorplan.mjs (the
// hooks on moves and fights), netrooms.mjs (the roll on the network, the files that go with it), the map and board marks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, encounterVirus } from './dist/combat.mjs';
import * as FP from './dist/floorplan.mjs';
import * as RV from './dist/rivals.mjs';
import { GENES } from './dist/genes.mjs';
import { roomsMarkup } from './dist/floorplan-view.mjs';
import { boardMarkup } from './dist/view.mjs';
import { CONFIG } from './dist/data.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
let clock = 1_700_000_000_000;
hooks.now = () => clock;
// A level-12 character on a rooms server (floor 3 unless told), connected at the entry.
function onServer({ floor = 3, seed = 7, level = 12 } = {}) {
  const s = fresh(); s.tutorialCompleted = true;
  s.hackers = { [s.loadout.archetype]: { level, xp: 0 } };
  FP.startRooms(s, { seed, size: 'medium', floor, level });
  FP.connect(s);
  return s;
}
const kill = (s) => { for (let i = 0; i < 40 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: Math.min(p.integrity, 1) }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); if (p) command(s, 'spike ' + p.id); resolveCycle(s); } FP.settle(s); };
const lose = (s) => { for (let i = 0; i < 200 && active(s); i++) { s.run.integrity = 1; s.rooms.signal = 1; for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = s.encounter.cycle; resolveCycle(s); } FP.settle(s); };
// Wait until the rival has you (or it's gone).
const until = (s) => { for (let i = 0; i < 40 && RV.rivalOf(s) && s.rooms.screen?.kind !== 'rival'; i++) FP.wait(s); };

test('a rival starts as far from the vault as the entry is, never next to you, and walks a room a move toward it', () => {
  for (const seed of [3, 7, 11, 19]) {
    const s = onServer({ seed }), R = s.rooms, g = R.graph, v = RV.spawnRival(s, 99, 'kudzu');
    const d = FP.distances(g, g.vaults[0], (x) => x !== g.core);
    assert.ok(d[v.at] >= d[g.entry], `seed ${seed}: ${d[v.at]} ≥ ${d[g.entry]}`);
    assert.ok((FP.distances(g, R.at)[v.at] ?? 9) > 1, 'never next to you');
    assert.equal(v.level, 13, 'one level over you');
    const before = RV.routeOf(s).length;
    FP.wait(s);
    if (R.screen?.kind !== 'rival') assert.equal(RV.routeOf(s).length, before - 1, 'one room a move');
    for (const id of RV.routeOf(s)) assert.ok(FP.seenOf(s, id), 'its route shows through the fog');
    assert.ok(FP.seenOf(s, g.vaults[0]), 'and the vault it is after');
    assert.ok(!RV.routeOf(s).includes(g.core), 'never through the Core');
  }
});

test('at the vault it takes the files and walks out; reaching the entry with them, it got away', () => {
  const s = onServer(), R = s.rooms, g = R.graph, v = RV.spawnRival(s, 99, 'escrow');
  R.at = g.core; // out of its way (a room it never walks)
  for (let i = 0; i < 30 && v.state === 'loose'; i++) RV.rivalMove(s);
  assert.equal(v.vault, true);
  assert.ok(R.opened[g.vaults[0]], 'the vault is open');
  assert.equal(v.state, 'gone');
  assert.deepEqual(RV.memoryOf(s, 'escrow'), { met: 0, won: 0, lost: 0, away: 1, last: 'away', quote: null });
});

test('aggro: when it reaches you it has you; no step back, no jack out, no wait, Engage only', () => {
  const s = onServer(), R = s.rooms, v = RV.spawnRival(s, 99, 'kudzu');
  until(s);
  assert.equal(R.screen?.kind, 'rival');
  assert.equal(v.state, 'on');
  assert.equal(RV.memoryOf(s, 'kudzu').met, 1);
  const at = R.at;
  const next = FP.exits(s)[0];
  FP.go(s, FP.neighbours(R.graph, at)[0]);
  assert.equal(R.at, at, 'no stepping away');
  assert.equal(next, undefined, 'no exits while it has you');
  FP.jackOut(s);
  assert.ok(R.at, 'no jacking out');
  FP.act(s, 'back');
  assert.equal(R.screen?.kind, 'rival');
  FP.act(s, 'engage');
  assert.ok(active(s));
  assert.equal(s.encounter.rooms.as, 'rival');
  assert.equal(s.encounter.virus.level, 13);
});

test('walking into its room starts it too', () => {
  const s = onServer(), R = s.rooms, v = RV.spawnRival(s, 99, 'hush');
  const n = FP.neighbours(R.graph, R.at).find((id) => id !== R.graph.core);
  v.at = n;
  FP.go(s, n);
  assert.equal(R.screen?.kind, 'rival');
});

test('the lineup: 2 fights on floors 1–2, 3 from floor 3, one after another; Signal carries, a counter-pick between', () => {
  for (const [floor, n] of [[1, 2], [2, 2], [3, 3], [5, 3]]) assert.equal(RV.RIVAL.fights(floor), n);
  const s = onServer({ floor: 2 }), R = s.rooms, v = RV.spawnRival(s, 99, 'escrow');
  assert.equal(v.fights, 2);
  assert.equal(RV.lineupOf(s).length, 2);
  until(s);
  FP.act(s, 'engage');
  s.run.integrity = 100;
  kill(s);
  assert.equal(R.screen?.kind, 'rival');
  assert.ok(R.screen.between);
  assert.ok(RV.COUNTERS[v.next.counter], 'a counter-pick, shown before you engage');
  assert.ok(FP.sigOf(s) <= 100, 'your Signal carries: what the fight left you');
  const card = roomsMarkup(s);
  assert.match(card, /1 of 2 down/);
  assert.match(card, new RegExp(RV.COUNTERS[v.next.counter].name));
  FP.act(s, 'engage');
  assert.equal(s.encounter.rivalAdd, v.next.counter, 'the part it adds rides the next fight');
  assert.ok(Object.keys(s.encounter.readyAt).length === 0, 'cooldowns start fresh');
  kill(s);
  assert.equal(v.state, 'down');
  assert.equal(RV.memoryOf(s, 'escrow').won, 1);
});

test('the counter-pick reads how you won: each rival its three reads, one part each, built at its level', () => {
  assert.deepEqual(RV.counterFor('kudzu', { burst: true }), { read: 'burst', counter: 'patcher' });
  assert.deepEqual(RV.counterFor('kudzu', { spread: true }), { read: 'spread', counter: 'hotspare' });
  assert.deepEqual(RV.counterFor('kudzu', {}), { read: 'slow', counter: 'floodramp' });
  assert.deepEqual(RV.counterFor('escrow', { burst: true }), { read: 'burst', counter: 'mutexlock' });
  assert.deepEqual(RV.counterFor('escrow', { burns: true }), { read: 'burns', counter: 'deadline' });
  assert.deepEqual(RV.counterFor('escrow', {}), { read: 'strips', counter: 'ward' });
  assert.deepEqual(RV.counterFor('hush', { reads: true, burst: true }), { read: 'reads', counter: 'veil' });
  assert.deepEqual(RV.counterFor('hush', { helpers: true }), { read: 'helpers', counter: 'phaseshift' });
  assert.deepEqual(RV.counterFor('hush', {}), { read: 'burst', counter: 'decoymirror' });
  // Every counter adds exactly one part that carries its gene (the Veil veils the virus instead).
  for (const [id, c] of Object.entries(RV.COUNTERS)) {
    const s = onServer(), R = s.rooms, v = RV.spawnRival(s, 99, 'escrow');
    v.next = { read: 'burst', counter: id, cycles: 3 };
    R.screen = { kind: 'rival', room: R.at, between: true }; v.state = 'on'; v.at = R.at;
    const bare = encounterVirus(s, ...Object.values((({ key, seed, opts }) => ({ key, seed, opts }))(RV.rivalFight(s, FP.hereOf(s))))).parts.length;
    FP.act(s, 'engage');
    const parts = s.encounter.virus.parts;
    if (c.veil) { assert.equal(parts.length, bare); assert.ok(parts.every((p) => p.veiled && p.maxArmor >= 1)); continue; }
    assert.equal(parts.length, bare + 1, id);
    const p = parts.find((x) => x.rival);
    assert.ok(GENES[c.gene].carried(p), `${id} carries ${c.gene}`);
    assert.equal(p.special, false);
    for (const k of ['ward', 'lock', 'twin', 'fallback']) if (p[k]) assert.ok(parts.some((x) => x.id === p[k]), `${id}: its ${k} points at a part of this virus`);
    assert.match(boardMarkup(s), /\+ ESCROW/, 'its board mark');
  }
});

test('readFight: burst, spread, slow, burns, helpers, reads and strips from the fight log', () => {
  const s = fresh();
  s.logs = [];
  const e = { serial0: 0, cycle: 15, virus: { parts: [{ max: 50 }, { max: 50 }] }, metrics: { tells: { a: { said: 2, read: 2 } } } };
  let id = 0; const ev = (x) => s.logs.push({ id: ++id, cycle: 1, ...x });
  ev({ type: 'damage', target: 'a', amount: 25 }); ev({ type: 'damage', target: 'b', amount: 5 });
  ev({ type: 'damage', target: 'a', amount: 40, src: 'burn' });
  for (let i = 0; i < 6; i++) ev({ type: 'armor', broke: 1 });
  const r = RV.readFight(s, e);
  assert.deepEqual({ ...r }, { burst: true, spread: true, slow: true, burns: true, helpers: false, reads: true, strips: true, cycles: 15 });
  assert.equal(RV.readFight(s, { ...e, cycle: 4, metrics: {} }).reads, false, 'no tells said: none read');
});

test('stakes: beat it and its pack is yours, with the vault it opened; lose and it is gone with both', () => {
  const s = onServer(), R = s.rooms, g = R.graph, v = RV.spawnRival(s, 99, 'kudzu');
  until(s);
  assert.ok(v.vault, 'it got to the vault first (you waited)');
  const credits = R.credits, packed = R.pack.length;
  for (let i = 0; i < v.fights; i++) { FP.act(s, 'engage'); kill(s); }
  assert.equal(v.state, 'down');
  assert.equal(R.pack.length, packed + 2, "its pack's item and the vault's");
  assert.ok(R.credits > credits, 'its credits');
  assert.ok(s.logs.some((e) => e.type === 'spoil' && e.kind === 'credits'), 'a row on the spoils card');
  assert.equal(R.screen, null);
  // Lost: gone with its pack, your record says so, and you're disconnected as from any lost fight.
  const t = onServer({ seed: 11 }), w = RV.spawnRival(t, 5, 'hush');
  until(t);
  FP.act(t, 'engage');
  lose(t);
  assert.equal(w.state, 'gone');
  assert.equal(RV.memoryOf(t, 'hush').lost, 1);
  assert.equal(t.rooms.at, null, 'disconnected');
});

test('a vault it holds: you cannot pull its files; got away, the files go with it', () => {
  const s = onServer(), R = s.rooms, g = R.graph, v = RV.spawnRival(s, 99, 'escrow');
  v.vault = true; R.opened[g.vaults[0]] = clock;
  R.at = g.vaults[0]; R.screen = null;
  const ev = FP.act(s, 'pull');
  assert.match(ev.map((e) => e.message).join(' '), /ESCROW took the files/);
});

test('memory: meetings and your record, its line and wick\'s, kept on the save (v52, keyed on the field)', () => {
  const s = onServer(), v = RV.spawnRival(s, 99, 'kudzu');
  until(s);
  assert.equal(RV.rivalSays(s, 'kudzu'), 'hiii!! that vault is mine!!');
  assert.equal(RV.wickLine(s, v, 'challenge'), RV.RIVALS.kudzu.wick.first);
  for (let i = 0; i < v.fights; i++) { FP.act(s, 'engage'); kill(s); }
  const m = RV.memoryOf(s, 'kudzu');
  assert.equal(m.won, 1); assert.equal(m.last, 'won'); assert.equal(m.quote, 'spike', 'HUSH would quote your last command');
  m.met = 2;
  assert.equal(RV.rivalSays(s, 'kudzu'), 'hiii again!! brought friends');
  assert.equal(RV.wickLine(s, v, 'challenge'), RV.RIVALS.kudzu.wick.won);
  assert.equal(RV.rivalSays(s, 'escrow'), 'Invoice 0417. Your time is billable.');
  assert.equal(RV.rivalSays(s, 'hush'), '> connect');
  v.next = { counter: 'patcher' };
  assert.match(RV.wickLine(s, v, 'between'), /brought a patcher/);
  // The save: an older one has no field and gets none; a broken one is dropped; an unknown rival is forgotten.
  const old = { by: { kudzu: m, cantor: { met: 1 } }, at: null, n: 1 };
  const t = { rivals: structuredClone(old) }; RV.rivalsRestore(t);
  assert.deepEqual(Object.keys(t.rivals.by), ['kudzu']);
  RV.rivalsRestore(t); assert.deepEqual(Object.keys(t.rivals.by), ['kudzu'], 'safe to run twice');
  const u = { rivals: [] }; RV.rivalsRestore(u); assert.equal(u.rivals, undefined);
  const back = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(RV.memoryOf(back, 'kudzu').won, 1);
});

test('the roll: one in RIVAL.chance, then your cooldown', () => {
  const s = fresh();
  let hits = 0;
  for (let i = 0; i < 400; i++) { s.rivals = { at: null, n: 0, by: {} }; if (RV.rivalRoll(s, i * 7 + 1, clock)) hits++; }
  assert.ok(hits > 400 * RV.RIVAL.chance * 0.6 && hits < 400 * RV.RIVAL.chance * 1.4, `${hits}`);
  s.rivals = { at: clock, n: 1, by: {} };
  for (let i = 0; i < 50; i++) assert.equal(RV.rivalRoll(s, i, clock + 1000), 0, 'not while the cooldown runs');
});

test('the map: its ring and name tab, its route, its lineup chips, the race on the vault; the strip', () => {
  const s = onServer(), v = RV.spawnRival(s, 99, 'kudzu');
  const html = roomsMarkup(s);
  assert.match(html, /fp-rv-ring/);
  assert.match(html, /fp-rv-tab[^]*KUDZU/);
  assert.match(html, /fp-rv-route/);
  assert.match(html, /fp-rv-lineup/);
  assert.match(html, /YOU \d/);
  assert.match(html, /KUDZU \d<\/text>/);
  assert.match(html, /fp-rvstat[^]*to vault/);
  assert.match(html, /Rival · SWARMLINE · level 13/, 'its tooltip: name, kind, what it does');
  until(s);
  const card = roomsMarkup(s);
  assert.match(card, /challenged/);
  assert.match(card, /hiii!! that vault is mine!!/);
  assert.match(card, /fp-rv-stakes/);
  assert.match(card, /data-rooms="engage"/);
  assert.doesNotMatch(card, /data-rooms="back"/, 'Engage only');
  assert.ok(v.state === 'on');
});

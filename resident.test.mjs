import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, part, active, hooks } from './dist/combat.mjs';
import { play, connect, currentLocation, residentLevel } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { CONFIG, BOSSES } from './dist/data.mjs';
import { tickNetwork } from './dist/invasion.mjs';

const say = (s, t) => play(s, t);
const onRun = () => { const s = fresh(); command(s, 'developer location ransomware'); connect(s, s.locations[0].id); return s; };
const finishOff = (s, id) => {
  for (const p of s.encounter.virus.parts) Object.assign(p, { integrity: 0, armor: 0 });
  part(s, id).integrity = 1;
  command(s, 'spike ' + id);
  resolveCycle(s);
};
const winFight = (s) => { if (!active(s)) command(s, 'engage'); finishOff(s, s.encounter.virus.parts[0].id); FP.settle(s); };
// Since R1 a server is rooms (netrooms.mjs): the vault's key is an elite's, the Resident waits in the Core.
const at = (s, id) => { const R = s.rooms; R.at = id; R.visit.walked[id] = true; R.screen = null; FP.look(s); };
// To the open vault: the key in hand (its elite beaten), the vault opened.
const openVault = (s) => { const loc = currentLocation(s), R = s.rooms, v = R.graph.vaults[0]; R.visit.keys.push(v); at(s, v); FP.act(s, 'open'); return loc; };
const coreRoom = (s) => s.rooms.graph.rooms[s.rooms.graph.core];
// Into the Core: the Resident's fight starts.
const toCore = (s) => { const R = s.rooms; at(s, FP.neighbours(R.graph, R.graph.core)[0]); FP.go(s, R.graph.core); if (R.screen?.kind === 'virus') FP.act(s, 'engage'); };

test('opening the vault no longer takes the server: it unseals the Core, where the Resident lives', () => {
  const s = onRun();
  const loc = currentLocation(s);
  assert.ok(s.run.rooms && !FP.coreOpen(s), 'the Core is sealed before the vault opens');
  openVault(s);
  assert.equal(loc.takenOver, undefined, 'not yours yet');
  assert.ok(FP.coreOpen(s) && FP.isUp(s, coreRoom(s)), 'the Core is open, and the Resident holds it');
  toCore(s);
  assert.ok(active(s) || s.encounter?.phase === 'alert', 'the Resident fight starts');
  assert.equal(s.encounter.virus.boss, 'resident');
  assert.equal(s.encounter.virus.level, residentLevel(loc));
});

test('beating the Resident takes the server; the core goes quiet', () => {
  const s = onRun();
  const loc = openVault(s);
  toCore(s);
  winFight(s);
  assert.ok(loc.takenOver);
  assert.equal(FP.isUp(s, coreRoom(s)), false, 'nothing holds the Core of a server you hold');
});

test('a Resident that beats you is a level stronger for 6 hours, up to three', () => {
  let t = 1_700_000_000_000;
  hooks.now = () => t;
  try {
    const s = onRun();
    const loc = openVault(s);
    const base = residentLevel(loc, t);
    toCore(s);
    s.run.integrity = 1;
    for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = s.encounter.cycle;
    for (let i = 0; i < 6 && active(s); i++) { command(s, 'hold'); resolveCycle(s); }
    assert.equal(loc.takenOver, undefined);
    assert.equal(residentLevel(loc, t), base + 1);
    t += 7 * 3600000;
    assert.equal(residentLevel(loc, t), base, 'it wears off');
  } finally { hooks.now = null; }
});

test('a boss has phases (GAME_RULES.md "Solo bosses", rule a): taking the Resident\'s core part across its 50% tick re-arms every part', () => {
  const s = onRun();
  openVault(s);
  toCore(s);
  const e = s.encounter, v = e.virus;
  assert.ok(v.phases.length && v.enrageAt === BOSSES.resident.enrageAt);
  assert.equal(e.bossRule, 'a');
  const core = v.parts.find((p) => p.core);
  assert.ok(core && core.special && core.ticks.every((t) => t.phase != null), 'its ♛ part carries phase ticks');
  // Its total under half alone starts nothing.
  for (const p of v.parts) { p.armor = 0; if (p !== core) p.integrity = Math.floor(p.max * 0.3); }
  command(s, 'hold'); resolveCycle(s);
  assert.ok(!v.phases[0].done, 'the total alone starts nothing');
  core.integrity = Math.floor(core.max * 0.5) + 2; core.lockHp = 0;
  command(s, 'spike ' + core.id); resolveCycle(s);
  assert.ok(v.phases[0].done, 'across its tick: the phase');
  assert.ok(v.parts.filter((p) => p.id !== 'sentry' && p.integrity > 0).every((p) => p.armor >= 1), 're-armed');
  assert.ok(s.logs.some((e2) => e2.type === 'phase'));
});

test('a boss enrages: from its cycle every attack lands every cycle', () => {
  const s = onRun();
  openVault(s);
  toCore(s);
  const v = s.encounter.virus;
  s.run.integrity = s.run.max = 1e6;
  for (const p of v.parts) { p.max = p.integrity = 1e6; p.armor = 0; }
  for (let i = 0; i < v.enrageAt + 1 && active(s); i++) { command(s, 'hold'); resolveCycle(s); }
  assert.ok(v.enraged);
  assert.ok(v.parts.filter((p) => p.attack).every((p) => p.attack.interval === 1));
});

test('a server you hold stays yours: no lockdowns, and the Resident never regrows (R2: outposts and their retakes are gone)', () => {
  const s = onRun();
  const loc = openVault(s);
  toCore(s);
  winFight(s);
  assert.ok(loc.takenOver);
  const t0 = Date.now();
  for (let h = 1; h <= 48; h++) tickNetwork(s, t0 + h * 3600000);
  assert.ok(loc.takenOver && !loc.outpost, 'two days on, still yours');
  assert.ok(!FP.isUp(s, coreRoom(s)), 'and its Core stays empty');
});

test('early bosses: RELAY-KING holds /net/relay from level 3; the bounty is REPO MAN from 8; the Hollow Choir comes from 10', async () => {
  const { zoneSpawns, KING_ROOM } = await import('./dist/run.mjs');
  const { deal } = await import('./dist/events.mjs');
  const s = fresh();
  s.hackers = { breaker: { level: 2, xp: 0 } };
  zoneSpawns(s); s.zone.reboots = 1;
  assert.ok(!zoneSpawns(s)[KING_ROOM], 'not before level 3: the Core sealed and empty');
  s.hackers.breaker.level = 3; s.zone.reboots = 0; s.zone.spawns = {};
  assert.ok(!zoneSpawns(s)[KING_ROOM], 'nor before SPRAWL-00 first reboots');
  for (const sp of Object.values(s.zone.spawns)) Object.assign(sp, { alive: false, respawnAt: null });
  assert.equal(zoneSpawns(s)[KING_ROOM].boss, 'relayking', 'the first reboot opens the Core');
  assert.equal(s.zone.reboots, 1);
  s.hackers.breaker.level = 8;
  command(s, 'developer location worm');
  assert.equal(deal(s, 'bounty').boss, 'repoman');
  s.events = [];
  s.hackers.breaker.level = 9;
  assert.equal(deal(s, 'choir'), null, 'no Hollow Choir before level 10');
  s.hackers.breaker.level = 10;
  const ev = deal(s, 'choir');
  assert.equal(ev.boss, 'choir');
  command(s, `event fight ${ev.id}`);
  assert.equal(s.encounter.virus.boss, 'choir');
  assert.equal(s.encounter.virus.family, 'ghostroot');
});

test('boss uniques: each boss has two; a kill without one raises the next kill\'s chance by 10%, shown in the log', async () => {
  const { BOSS_LOOT } = await import('./dist/data.mjs');
  const { bossUniques, bossChance } = await import('./dist/combat.mjs');
  const { collectionMarkup } = await import('./dist/view.mjs');
  for (const b of Object.keys(BOSSES).filter((k) => !BOSSES[k].native)) assert.equal(bossUniques(b).length, 2, b); // a native boss drops its network's natives (network.test.mjs)
  const was = BOSS_LOOT.chance;
  try {
    BOSS_LOOT.chance = -1; // a miss for sure
    const s = onRun();
    openVault(s);
    toCore(s);
    winFight(s);
    assert.equal(s.pity.resident, 1);
    assert.ok(s.logs.some((e) => /No unique from Resident this time\. The next kill has a -?\d+% chance/.test(e.message)));
    BOSS_LOOT.chance = was;
    assert.equal(Math.round(bossChance(s, 'resident') * 100), Math.round((was + BOSS_LOOT.pity) * 100));
    s.collection = { 'wicks-old-toolkit': 1 };
    assert.match(collectionMarkup(s), new RegExp(`A Resident · <span class="coll-odds"[^>]*>${Math.round((was + BOSS_LOOT.pity) * 100)}% a kill`));
    // A hit resets it, and gives one you haven't found.
    BOSS_LOOT.chance = 2;
    const t = onRun();
    openVault(t);
    toCore(t);
    winFight(t);
    assert.equal(t.pity.resident, 0);
    assert.ok(t.stash.some((it) => bossUniques('resident').some((u) => u.id === it.unique)));
  } finally { BOSS_LOOT.chance = was; }
});

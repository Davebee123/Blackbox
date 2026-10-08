import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, part, active, hooks } from './dist/combat.mjs';
import { play, connect, currentLocation, layoutOf, residentLevel, CORE } from './dist/run.mjs';
import { CONFIG, BOSSES } from './dist/data.mjs';
import { regrow } from './dist/outpost.mjs';

const say = (s, t) => play(s, t);
const onRun = () => { const s = fresh(); command(s, 'developer location ransomware'); connect(s, s.locations[0].id); return s; };
const finishOff = (s, id) => {
  for (const p of s.encounter.virus.parts) Object.assign(p, { integrity: 0, armor: 0 });
  part(s, id).integrity = 1;
  command(s, 'spike ' + id);
  resolveCycle(s);
};
const winFight = (s) => { command(s, 'engage'); finishOff(s, s.encounter.virus.parts[0].id); };
// To the open vault: clear the relay guard, unlock, and come back to the root.
const openVault = (s) => { const loc = currentLocation(s); say(s, 'cd relay'); winFight(s); say(s, `unlock vault ${loc.password}`); say(s, 'cd /'); return loc; };

test('opening the vault no longer takes the server: it opens /core, where the Resident lives', () => {
  const s = onRun();
  const loc = currentLocation(s);
  assert.ok(!layoutOf(loc)[CORE], 'no core before the vault opens');
  openVault(s);
  assert.equal(loc.takenOver, undefined, 'not yours yet');
  assert.ok(layoutOf(loc)[CORE]?.guard, 'the core is guarded');
  say(s, 'cd core');
  assert.ok(active(s) || s.encounter?.phase === 'alert', 'the Resident fight starts');
  assert.equal(s.encounter.virus.boss, 'resident');
  assert.equal(s.encounter.virus.level, residentLevel(loc));
});

test('beating the Resident takes the server; the core goes quiet', () => {
  const s = onRun();
  const loc = openVault(s);
  say(s, 'cd core');
  winFight(s);
  assert.ok(loc.takenOver);
  assert.ok(!layoutOf(loc)[CORE].guard, 'nothing guards the core of a server you hold');
});

test('a Resident that beats you is a level stronger for 6 hours, up to three', () => {
  let t = 1_700_000_000_000;
  hooks.now = () => t;
  try {
    const s = onRun();
    const loc = openVault(s);
    const base = residentLevel(loc, t);
    say(s, 'cd core');
    command(s, 'engage');
    s.run.integrity = 1;
    for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = s.encounter.cycle;
    for (let i = 0; i < 6 && active(s); i++) { command(s, 'hold'); resolveCycle(s); }
    assert.equal(loc.takenOver, undefined);
    assert.equal(residentLevel(loc, t), base + 1);
    t += 7 * 3600000;
    assert.equal(residentLevel(loc, t), base, 'it wears off');
  } finally { hooks.now = null; }
});

test('a boss has phases: at half its Integrity the Resident re-arms', () => {
  const s = onRun();
  openVault(s);
  say(s, 'cd core');
  command(s, 'engage');
  const v = s.encounter.virus;
  assert.ok(v.phases.length && v.enrageAt === BOSSES.resident.enrageAt);
  const total = v.parts.reduce((n, p) => n + p.max, 0);
  for (const p of v.parts) { p.armor = 0; p.integrity = Math.floor(p.max * 0.45); }
  assert.ok(v.parts.reduce((n, p) => n + p.integrity, 0) < total / 2);
  command(s, 'hold'); resolveCycle(s);
  assert.ok(v.phases[0].done);
  assert.ok(v.parts.filter((p) => p.id !== 'sentry' && p.integrity > 0).every((p) => p.armor >= 1), 're-armed');
  assert.ok(s.logs.some((e) => e.type === 'phase'));
});

test('a boss enrages: from its cycle every attack lands every cycle', () => {
  const s = onRun();
  openVault(s);
  say(s, 'cd core');
  command(s, 'engage');
  const v = s.encounter.virus;
  s.run.integrity = s.run.max = 1e6;
  for (const p of v.parts) { p.max = p.integrity = 1e6; p.armor = 0; }
  for (let i = 0; i < v.enrageAt + 1 && active(s); i++) { command(s, 'hold'); resolveCycle(s); }
  assert.ok(v.enraged);
  assert.ok(v.parts.filter((p) => p.attack).every((p) => p.attack.interval === 1));
});

test('the Resident regrows after two lockdowns left to run out: the core is guarded again', () => {
  const s = onRun();
  const loc = openVault(s);
  say(s, 'cd core');
  winFight(s);
  assert.ok(loc.takenOver);
  regrow(s, loc);
  assert.ok(!loc.takenOver);
  assert.ok(layoutOf(loc)[CORE].guard);
});

test('early bosses: RELAY-KING holds /net/relay from level 3; the bounty is REPO MAN from 8; the Hollow Choir comes from 10', async () => {
  const { zoneSpawns, KING_ROOM } = await import('./dist/run.mjs');
  const { deal } = await import('./dist/events.mjs');
  const s = fresh();
  s.hackers = { breaker: { level: 2, xp: 0 } };
  assert.ok(!zoneSpawns(s)[KING_ROOM].boss, 'not before level 3');
  s.hackers.breaker.level = 3; s.zone.spawns = {};
  assert.equal(zoneSpawns(s)[KING_ROOM].boss, 'relayking');
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
    say(s, 'cd core');
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
    say(t, 'cd core');
    winFight(t);
    assert.equal(t.pity.resident, 0);
    assert.ok(t.stash.some((it) => bossUniques('resident').some((u) => u.id === it.unique)));
  } finally { BOSS_LOOT.chance = was; }
});

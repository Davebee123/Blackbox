// The loot model (World of Warcraft's): trash rarely drops an item, elites and guards better, a rare spawn usually
// something, a boss always one item and its uniques at BOSS_LOOT's odds with slow, visible pity, a crew boss better.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, finish, rollDrop, tierOf, bossChance, bossTable, sureDrop, hackerOf, UNIQUES } from './dist/combat.mjs';
import { BOSS_LOOT, BOSSES } from './dist/data.mjs';
import { LOOT, RARITY_ORDER } from './dist/gear.mjs';
import { entryOf } from './dist/codex.mjs';
import { codexPageMarkup } from './dist/codex-view.mjs';

const at = (L) => { const s = fresh(); hackerOf(s).level = L; return s; };
const rank = (it) => (it ? RARITY_ORDER.indexOf(it.rarity) : -1);
const sample = (s, ctx, n = 20000) => { const c = { item: 0, tuned: 0, custom: 0 }; for (let i = 0; i < n; i++) { const it = rollDrop(s, ctx, 12); if (it) { c.item++; if (rank(it) >= rank({ rarity: 'tuned' })) c.tuned++; if (rank(it) >= rank({ rarity: 'custom' })) c.custom++; } } return c; };
// A boss kill outside any server: what it drops, by line.
const kill = (s, boss, level = 12) => { const mark = s.serial; selectEncounter(s, 'random', 7, { level, boss }); command(s, 'engage'); finish(s, 'victory'); return s.logs.filter((e) => e.id > mark); };
const drops = (log) => log.filter((e) => e.type === 'drop' && e.item).map((e) => e.item);

test('trash: most kills drop no item, a blue now and then, a yellow rarely', () => {
  const s = at(12), c = sample(s, { kind: 'home' });
  assert.ok(c.item / 20000 < 0.05, `items ${c.item}`);
  assert.ok(c.tuned > 0 && c.tuned / 20000 < 0.005, `blues ${c.tuned}`);
  assert.ok(c.custom / 20000 < 0.001, `yellows ${c.custom}`);
});

test('elites, guards and rare spawns: better than trash, a rare spawn usually drops something; guards roll once', () => {
  const s = at(12);
  assert.equal(tierOf({ kind: 'guard' }), 'elite');
  assert.equal(tierOf({ kind: 'home', elite: true }), 'elite');
  assert.equal(tierOf({ kind: 'home', rare: true }), 'rare');
  assert.equal(LOOT.rolls.guard, undefined, 'a guard rolls once: it already carries the key');
  const trash = sample(s, { kind: 'home' }), guard = sample(s, { kind: 'guard' }), rare = sample(s, { kind: 'home', rare: true }, 4000);
  assert.ok(guard.item > 2 * trash.item && guard.tuned > trash.tuned, `guard ${JSON.stringify(guard)} vs trash ${JSON.stringify(trash)}`);
  // One roll: a guard's item rate is its tier's single-roll odds, not two rolls' (1 - (1 - p)^2).
  const p = Object.values(LOOT.odds.elite).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(guard.item / 20000 - p) < 0.012, `${guard.item / 20000} vs ${p}`);
  assert.ok(rare.item / 4000 > 0.5 && rare.tuned / 4000 > 4 * guard.tuned / 20000, `rare ${JSON.stringify(rare)}`);
});

test('a dungeon boss always drops one item at its level, a blue or a yellow, and rolls its uniques at 15% with slow pity', () => {
  const s = at(12), was = BOSS_LOOT.chance;
  try {
    BOSS_LOOT.chance = -1; // a miss for sure
    const log = kill(s, 'relayking'), got = drops(log);
    assert.equal(got.length, 1, 'one item');
    assert.ok(['tuned', 'custom'].includes(got[0].rarity) && got[0].level === 12 && !got[0].unique);
    assert.equal(s.pity.relayking, 1);
    assert.match(log.find((e) => /No unique from RELAY-KING/.test(e.message)).message, /next kill has a/);
    BOSS_LOOT.chance = was;
    assert.ok(Math.abs(bossChance(s, 'relayking') - (BOSS_LOOT.chance + BOSS_LOOT.pity)) < 1e-9, 'the next kill: its chance plus one miss of pity');
    // Yellows about BOSS_LOOT.yellow of the time.
    let yellow = 0; for (let i = 0; i < 400; i++, s.stash = []) yellow += drops(kill(s, 'relayking')).some((x) => x.rarity === 'custom' && !x.unique) ? 1 : 0;
    assert.ok(Math.abs(yellow / 400 - BOSS_LOOT.yellow) < 0.08, `${yellow} yellows in 400`);
  } finally { BOSS_LOOT.chance = was; }
  assert.ok(BOSS_LOOT.chance === 0.15 && BOSS_LOOT.pity > 0 && BOSS_LOOT.pity <= 0.05, 'about 15% a kill, pity far gentler than +10% a miss');
});

test('a boss\'s uniques take a handful of kills: under 5 on average for the first, with pity back to the base on a drop', () => {
  // The expected kills to the first unique, from BOSS_LOOT's odds.
  let alive = 1, mean = 0;
  for (let k = 0; k < 100 && alive > 1e-9; k++) { mean += alive; alive *= 1 - Math.min(1, BOSS_LOOT.chance + BOSS_LOOT.pity * k); }
  assert.ok(mean > 3 && mean < 5, `${mean.toFixed(2)} kills`);
  const s = at(12);
  s.pity = { relayking: 20 }; // a drop for sure
  const got = drops(kill(s, 'relayking'));
  assert.ok(got.some((x) => x.unique && UNIQUES[x.unique].sources.some((src) => src.kind === 'boss' && src.id === 'relayking')));
  assert.equal(s.pity.relayking, 0);
});

test('the Resident: one switch decides whether it always drops an item (BOSS_LOOT.resident)', () => {
  const was = BOSS_LOOT.resident, chance = BOSS_LOOT.chance;
  try {
    BOSS_LOOT.chance = -1;
    BOSS_LOOT.resident = 'elite';
    assert.equal(sureDrop('resident'), false);
    const s = at(12); let items = 0; for (let i = 0; i < 200; i++, s.stash = []) items += drops(kill(s, 'resident')).length;
    assert.ok(items < 200 * 0.5, `like an elite: ${items} items in 200 kills`);
    BOSS_LOOT.resident = 'boss';
    assert.equal(sureDrop('resident'), true);
    const got = drops(kill(at(12), 'resident'));
    assert.equal(got.length, 1);
    assert.ok(['tuned', 'custom'].includes(got[0].rarity));
  } finally { BOSS_LOOT.resident = was; BOSS_LOOT.chance = chance; }
  assert.ok(['elite', 'boss'].includes(BOSS_LOOT.resident));
});

test('a crew boss is the best source of gold: always a yellow, its uniques at better odds, a world unique now and then', () => {
  assert.ok(BOSSES.foreman.raid && BOSS_LOOT.raid.chance > BOSS_LOOT.chance && BOSS_LOOT.raid.gold > 0);
  const s = at(12), was = { ...BOSS_LOOT.raid };
  try {
    Object.assign(BOSS_LOOT.raid, { chance: -1, gold: 1 });
    const got = drops(kill(s, 'foreman'));
    assert.ok(got.some((x) => x.rarity === 'custom' && !x.unique), 'a yellow');
    assert.ok(got.some((x) => x.unique && UNIQUES[x.unique].sources.some((src) => ['sprawl', 'vault', 'guard', 'rogue'].includes(src.kind))), 'a world unique');
    assert.equal(s.pity.foreman, 1);
    Object.assign(BOSS_LOOT.raid, was);
    assert.ok(Math.abs(bossChance(s, 'foreman') - (was.chance + was.pity)) < 1e-9, 'its own odds and pity');
  } finally { Object.assign(BOSS_LOOT.raid, was); }
});

test('the Codex: a boss\'s page lists its loot table, the odds and the next kill\'s chance; uniques stay ??? until found', () => {
  const s = at(12);
  s.dex = { fought: { relayking: 1, foreman: 1 }, won: {} };
  s.pity = { relayking: 2 };
  const e = entryOf(s, 'boss:relayking');
  assert.equal(e.loot.sure, 'tuned');
  assert.ok(e.loot.uniques.length === 2 && e.loot.uniques.every((u) => u.name === null));
  const html = codexPageMarkup(s, 'boss:relayking');
  assert.match(html, /every kill, at its level · Custom 25%/);
  assert.match(html, /Uniques: 15% a kill, \+5% a miss\. Next kill <b class="you">25%<\/b>/);
  assert.match(html, /\?\?\?/);
  s.collection = { 'crown-packet': 1 };
  assert.match(codexPageMarkup(s, 'boss:relayking'), /Crown Packet/);
  assert.match(codexPageMarkup(s, 'boss:foreman'), /Custom<\/b><small>every kill/);
  assert.equal(bossTable(s, 'resident').sure, BOSS_LOOT.resident === 'boss' ? 'tuned' : null);
});

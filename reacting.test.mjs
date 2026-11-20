// Reacting (docs/pays.md P3, GAME_RULES.md "Markets"): while a market card wants a ware, what pays it is dealt twice as
// often, each on its own dice (ticker.mjs wanted; events.mjs, runcards.mjs, netrooms.mjs, sites.mjs). With no card
// wanting anything every deal is as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, hooks } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { tickerOf, dealTicker, wanted, PAYERS } from './dist/ticker.mjs';
import { deal, runCardRoll } from './dist/events.mjs';
import { ROGUE } from './dist/rogue.mjs';
import { PAYS } from './dist/sites.mjs';
import { floorsOf } from './dist/floors.mjs';
import { WARE_IDS } from './dist/market.mjs';
import { marketMarkup } from './dist/view.mjs';

let clock = 1_700_000_000_000;
hooks.now = () => clock;
const world = (seed = 777, level = 12) => {
  const s = fresh(); s.tutorialCompleted = true; s.netSeed = seed; s.seed = seed;
  command(s, 'mail'); s.mail.boardOpen = true;
  s.hubFound = { glassjaw: true, kestrel: true, lantern: true, nullchoir: true };
  s.hackers = { [s.loadout.archetype]: { level, xp: 0 } };
  s.director = { next: 9e9, n: 0, last: null, blipNext: 9e9 };
  return s;
};
// A live card that raises (or lowers) one ware at a hub.
const want = (s, ware, mult = 1.6) => tickerOf(s).live.push({ id: 99, card: 'thermal', left: 9e9, ms: 9e9, moves: [{ hub: 'kestrel', ware, mult }] });
// Odds of a share: p / (1 − p). Twice as often is twice the odds.
const odds = (n, of) => n / (of - n);

test('wanted: the wares a live card raises at a hub; not one it lowers, a card on every ware, or a leaked one still waiting', () => {
  const s = world();
  assert.deepEqual([...wanted(s)], []);
  want(s, 'kernel');
  assert.deepEqual([...wanted(s)], ['kernel']);
  tickerOf(s).live = [];
  want(s, 'kernel', 0.7);
  assert.deepEqual([...wanted(s)], [], 'lowered: nothing wanted');
  tickerOf(s).live = [];
  dealTicker(s, 'tax', null);
  assert.deepEqual([...wanted(s)], [], 'every ware at every hub: nothing in particular');
  tickerOf(s).live = [];
  dealTicker(s, 'thermal', 'leaked');
  assert.deepEqual([...wanted(s)], [], 'leaked, still waiting');
  tickerOf(s).live[0].wait = 0;
  assert.deepEqual([...wanted(s)], ['kernel']);
});

test('the director: with a card wanting Kernel code, its family (ghostroot) comes up about twice as often; with none the deal is unchanged', () => {
  const families = (s, n = 900) => Array.from({ length: n }, () => { s.events = []; s.director.last = null; return deal(s, 'outbreak').family; });
  const none = families(world()), lowered = world(), other = world(), kern = world();
  want(lowered, 'kernel', 0.7); want(other, 'salvage');
  want(kern, 'kernel');
  assert.deepEqual(families(lowered), none, 'a card lowering a price: the same deal');
  assert.deepEqual(families(other), none, 'a card wanting components: the same deal');
  const a = none.filter((f) => f === 'ghostroot').length, b = families(kern).filter((f) => f === 'ghostroot').length;
  const r = odds(b, 900) / odds(a, 900);
  assert.ok(r > 1.6 && r < 2.5, `ghostroot ${a} → ${b}: odds ×${r.toFixed(2)}`);
});

test('run cards: the surge twice as often while a card wants components, its pay (docs/pays.md P2)', () => {
  const kinds = (s, n = 900) => Array.from({ length: n }, () => { delete s.director.lastCard; return runCardRoll(s, null)?.kind || null; });
  const none = kinds(world()), comp = world(), code = world();
  want(comp, 'salvage'); want(code, 'worm');
  assert.deepEqual(kinds(code), none, 'a code wanted: the same run cards');
  const k = kinds(comp);
  assert.deepEqual(k.map((x) => !!x), none.map((x) => !!x), 'as many run cards: the kind leans, the roll for one is the same');
  const a = none.filter((x) => x === 'surge').length, b = k.filter((x) => x === 'surge').length, all = none.filter(Boolean).length;
  const r = odds(b, all) / odds(a, all);
  assert.ok(r > 1.6 && r < 2.5, `surges ${a} → ${b} of ${all}: odds ×${r.toFixed(2)}`);
});

test('the Exfil\'s roll: twice as likely while a card wants Exploits, its archive\'s pay; the same roll otherwise', () => {
  const M = CONFIG.exfil, was = M.chance;
  const s = world(); s.hackers = { [s.loadout.archetype]: { level: 12, xp: 0 } };
  let loc;
  for (let i = 0; i < 60 && !loc; i++) { (s.net ||= {}).rogueDry = ROGUE.pity; command(s, 'developer location worm'); const l = s.locations.at(-1); if (l.rogue && !l.farm) loc = l; }
  loc.lockUntil = 0;
  M.chance = 0;
  try { play(s, 'connect ' + loc.id); } finally { M.chance = was; }
  const rolls = (n = 600) => { let hit = 0; for (let i = 0; i < n; i++) { s.exfil = null; s.rooms.visits = i; if (FP.WORLD.exfil(s, clock)) hit++; } return hit; };
  M.chance = 0.2;
  try {
    const a = rolls();
    want(s, 'kernel');
    assert.equal(rolls(), a, 'a code wanted: the same roll');
    want(s, 'exploit');
    const b = rolls(), r = b / a;
    assert.ok(r > 1.6 && r < 2.5, `${a} → ${b}: ×${r.toFixed(2)}`);
  } finally { M.chance = was; }
});

test('sites: while a card wants what one pays, its clock runs twice as fast and that kind goes first', () => {
  assert.deepEqual(PAYS, { rig: 'exploit', rack: 'salvage' });
  const s = world(1, 6);
  floorsOf(s).reached = 1;
  for (let i = 0; i < 4; i++) command(s, 'developer location worm');
  s.sites = { up: [], next: 10 * 60000, n: 0, last: 'rack' };
  want(s, 'salvage');
  hooks.tickSites(s, 5 * 60000);
  assert.equal(s.sites.up[0]?.site.kind, 'rack', 'ten minutes of clock in five; the rack out of turn');
  s.sites = { up: [], next: 10 * 60000, n: 0, last: 'rack' };
  tickerOf(s).live = [];
  hooks.tickSites(s, 5 * 60000);
  assert.equal(s.sites.up.length, 0, 'none wanted: the clock as before');
  hooks.tickSites(s, 5 * 60000);
  assert.equal(s.sites.up[0]?.site.kind, 'rig', 'and the kinds in turn');
});

test('a price\'s tooltip lists what pays its ware as icons, ×2 on each while a card wants it', () => {
  for (const w of WARE_IDS) assert.ok(PAYERS[w]?.length, `${w}: something pays it`);
  const s = world(), html = () => marketMarkup(s, 'kestrel', clock);
  assert.doesNotMatch(html(), /rw-x/);
  want(s, 'kernel');
  const rows = html().split('data-mk-pick="').slice(1), row = (w) => rows.find((r) => r.startsWith(w));
  assert.match(row('kernel'), /<template class="tt-more">.*Hollow Choir.*×2/s);
  assert.doesNotMatch(row('worm'), /rw-x/);
  // Named for the card moving it most, its kind the card's; a price no card moves is named for its ware.
  assert.match(row('kernel'), /class="mk-d [a-z]+" title="Thermal alarm: Overheating racks ×1\.8 · Thermal alarm ×1\.6" data-tt-kind="Kestrel · Market card"/);
  assert.match(row('worm'), /class="mk-d [a-z]+" title="Worm code" data-tt-kind="Kestrel · Price"/);
  // The Hollow Choir only from level 10, when the director can deal it.
  s.hackers[s.loadout.archetype].level = 9;
  assert.doesNotMatch(html(), /Hollow Choir/);
});

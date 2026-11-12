// Your house (dist/house.mjs, dist/house-view.mjs, dist/content/furniture.mjs): floors open with achievement points,
// furniture comes from achievements, and nothing overlaps a piece, a window or the ladder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, restore } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { developerAchieve, achById, achievements, rewardText, tickAchievements, fightOver } from './dist/achievements.mjs';
import { FURNITURE, FURNITURE_IDS } from './dist/content/furniture.mjs';
import * as H from './dist/house.mjs';
import { houseMarkup, housePageMarkup } from './dist/house-view.mjs';
import { rigMarkup, RIG_TABS } from './dist/view.mjs';
import { logComms } from './dist/comms.mjs';

const said = (out) => out.map((e) => e.message).join(' ');
const warned = (out) => out.some((e) => e.type === 'warning');
const all = () => { const s = fresh(); developerAchieve(s, 'all'); return s; };

test('a new house: the street floor and the roof, the mattress out, the loft as a dotted outline', () => {
  const s = fresh();
  assert.deepEqual(H.floorsOpen(s).map((f) => f.id), ['street']);
  assert.equal(H.nextFloor(s).id, 'loft');
  assert.deepEqual(H.ownedIds(s), ['mattress']);
  assert.deepEqual(H.placedOf(s), { mattress: ['street', 2] });
  const html = houseMarkup(s);
  assert.match(html, /data-hs-piece="mattress"/);
  assert.match(html, /class="hs-next"[^>]*title="\?\?\?: \n▸ Earn 50 achievement points\."[^>]*data-tt-kind="Floor"/);
  assert.equal((html.match(/class="hs-floor"/g) || []).length, 1);
});

test('floors open in order at their points, and each one is a pager line once', () => {
  const s = fresh();
  assert.equal(H.tickHouse(s), null, 'the first tick only notes what is open');
  developerAchieve(s, 'x-mapper'); developerAchieve(s, 'k-collector'); // 50 points
  const e = H.tickHouse(s);
  assert.equal(e.message, 'House: the Loft is open.');
  assert.equal(H.tickHouse(s), null);
  assert.equal(logComms(s, [e])[0]?.go, 'house');
  developerAchieve(s, 'all');
  assert.deepEqual(H.floorsOpen(s).map((f) => f.id), ['street', 'loft', 'cellar', 'shack', 'bunker', 'subnet']);
  assert.match(H.tickHouse(s).message, /Cellar.*Shack.*Bunker.*Subnet.* are open\./);
  // A save new to the house says nothing about the floors it already had.
  const t = all(); assert.equal(H.tickHouse(t), null);
  assert.equal(H.nextFloor(t), null);
});

test('every piece comes from an achievement (the mattress aside), and the achievement says so', () => {
  for (const id of FURNITURE_IDS) {
    const f = FURNITURE[id];
    if (!f.from) { assert.equal(id, 'mattress'); continue; }
    const a = achById(f.from);
    assert.ok(a, `${id}: ${f.from}`);
    assert.match(rewardText(a), /for your house\./, a.id);
  }
  assert.equal(rewardText(achById('x-hours')), 'Rewards the cat for your house.');
  const s = fresh();
  assert.ok(warned(play(s, 'house place cat street 20')), 'not yours yet');
  developerAchieve(s, 'x-hours');
  assert.ok(H.owns(s, 'cat'));
  assert.equal(said(play(s, 'house place cat street 20')), 'The cat: Street floor.');
});

test('the new achievements: boards won, servers traced, hours played, a LOWLIGHT job, 1 Signal', () => {
  const s = fresh();
  tickAchievements(s);
  for (let i = 0; i < 25; i++) s.logs.push({ id: ++s.serial, type: 'puzzle-end', kind: 'cascade', won: true });
  s.logs.push({ id: ++s.serial, type: 'puzzle-end', kind: 'quarantine', won: false });
  tickAchievements(s);
  assert.ok(s.achievements.got['x-cascade']);
  assert.ok(!s.achievements.got['x-quarantine']);
  s.pace = { kills: 0, ms: 100 * 3600000 };
  s.mail.jobs.push({ id: 1, story: 0, done: true });
  s.dex.won.heatsink = 1;
  tickAchievements(s);
  for (const id of ['x-hours', 'f-firstjob', 'c-heatsink']) assert.ok(s.achievements.got[id], id);
  assert.ok(!s.achievements.got['c-coldwallet']);
  assert.ok(achById('t-onesignal').hidden);
  assert.ok(achievements().every((a, i, l) => l.findIndex((b) => b.id === a.id) === i), 'ids are unique');
});

test('placing: on the floor or the wall, never over a window, the ladder, the shack wall or another piece', () => {
  const s = all();
  assert.equal(H.boxOf('cat', 20).y, H.H - 3, 'stands on the floor');
  assert.equal(H.boxOf('poster', 20).y, 1, 'hangs on the wall');
  assert.ok(!H.fits(s, 'throne', 'loft', 2), 'over the window');
  assert.ok(H.fits(s, 'mattress', 'loft', 2), 'under the window');
  assert.ok(!H.fits(s, 'cat', 'street', 39), 'on the ladder');
  assert.ok(!H.fits(s, 'cat', 'street', 5), 'on the mattress');
  assert.ok(H.fits(s, 'mattress', 'street', 5), 'a piece never blocks itself');
  assert.ok(!H.fits(s, 'cat', 'shack', 24), 'across the shack wall');
  assert.ok(H.fits(s, 'cat', 'shack', 28), 'on the terrace');
  assert.ok(!H.fits(s, 'poster', 'shack', 28), 'the terrace has no wall');
  assert.ok(!H.fits(s, 'cat', 'street', -1) && !H.fits(s, 'cat', 'street', H.W - 6));
  assert.equal(H.leftFor('cat', 0), 0); assert.equal(H.leftFor('cat', 99), H.W - 7);
  // Moving a piece, putting it away, and the floors that aren't open.
  assert.ok(!warned(play(s, 'house place mattress cellar 3')));
  assert.deepEqual(H.placedOf(s).mattress, ['cellar', 3]);
  assert.ok(!warned(play(s, 'house store mattress')));
  assert.equal(H.placedOf(s).mattress, undefined);
  assert.ok(warned(play(s, 'house store mattress')));
  const t = fresh();
  assert.ok(warned(play(t, 'house place mattress cellar 3')), 'no cellar yet');
  assert.ok(warned(play(t, 'house place sofa street 3')));
  assert.match(said(play(t, 'house')), /1 of 6 floors, 1 of 1 pieces out/);
});

test('the yard: either side of the street floor, open from the start; yard pieces stay out, wall pieces stay in', () => {
  const s = all();
  assert.ok(H.isOpen(fresh(), 'west') && H.isOpen(fresh(), 'east'));
  assert.ok(H.fits(s, 'car', 'west', 0) && H.fits(s, 'car', 'east', H.YW - 13));
  assert.ok(!H.fits(s, 'car', 'west', H.YW - 12), 'past the yard');
  assert.ok(!H.fits(s, 'car', 'street', 15), 'a yard piece stays out');
  assert.ok(H.fits(s, 'cat', 'east', 4), 'the cat can go out');
  assert.ok(!H.fits(s, 'poster', 'west', 0), 'no wall out there');
  assert.equal(H.leftFor('car', 99, 'east'), H.YW - 13);
  assert.ok(!warned(play(s, 'house place car west 1')));
  assert.ok(warned(play(s, 'house place grill west 1')), 'one piece over another');
  const html = houseMarkup(s);
  assert.match(html, /data-hs-floor="west"[^>]*>.*data-hs-piece="car"/);
  assert.match(html, /data-hs-floor="east"/);
  assert.match(housePageMarkup(s), /data-hs-pick="car"[^>]*data-tt-kind="Furniture, yard"|data-tt-kind="Furniture, yard"/);
});

test('the house survives a save and a load', () => {
  const s = all();
  play(s, 'house place cat loft 20');
  const t = restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(H.placedOf(t).cat, ['loft', 20]);
});

test('the page: Rig → House, the picker with its count, locked tiles as blocks with what brings them', () => {
  assert.deepEqual(RIG_TABS.at(-1), ['house', 'House']);
  const s = fresh();
  const html = housePageMarkup(s);
  assert.match(html, /Furniture <small class="hs-count">1\/20<\/small>/);
  assert.match(html, /data-hs-pick="mattress"[^>]*class|class="hs-tile out" data-hs-pick="mattress"/);
  assert.match(html, /hs-tile locked[\s\S]*?█[\s\S]*?\?\?\?[\s\S]*?Win Cascade 25 times\./);
  assert.match(html, /Closer than a thread\./, 'a hidden one gives its hint');
  assert.match(rigMarkup(s, { tab: 'house' }), /hs-page/);
  // In hand: the piece dims, its ghost shows where it would go, dimmer where it doesn't fit.
  const ui = { held: 'mattress', hover: { floor: 'street', x: 20 } };
  const h = houseMarkup(s, ui);
  assert.match(h, /hs-piece held" data-hs-piece="mattress"/);
  assert.match(h, /hs-ghost" style="--x:20;--y:4"/);
  assert.match(houseMarkup(s, { held: 'mattress', hover: { floor: 'street', x: 33 } }), /hs-ghost no"/);
});

test('furniture keeps to the text colour: no teal, red, violet, steel or amber', () => {
  const css = readFileSync(new URL('./dist/house.css', import.meta.url), 'utf8');
  const piece = css.split('\n').filter((l) => /^\.hs-(piece|shell|ghost|house)/.test(l)).join('\n');
  assert.doesNotMatch(piece, /--(you|teal|threat|red|violet|daemon|steel|armor|amber)/);
});

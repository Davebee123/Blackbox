// The test bench (dist/bench.mjs, ?bench=<name>): a save of its own that never touches the real one, `bench <sub> <level>`
// building a ready character the way the balance sims do, bench list / delete, and the dev panel's buttons, each one an
// existing command.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, restore, hackerLevel, classOf, subOf, subWaiting, talentPoints, pointsSpent, equippedSkills, presetKeys, maxSignal, active } from './dist/combat.mjs';
import { protocolSlots, SLOT_KINDS } from './dist/gear.mjs';
import { SUBS, ARCHETYPES, FLOORS, floorFor } from './dist/data.mjs';
import { CAMPAIGN_KEY } from './dist/campaign.mjs';
import { PARTS } from './dist/parts.mjs';
import { play, signalNow } from './dist/run.mjs';
import * as B from './dist/bench.mjs';
import { build } from './balance.mjs';

// A stand-in for localStorage.
const storage = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), map: m };
};
const REAL = JSON.stringify({ real: 'my real save' });
const benched = (what, level, name = 'x') => { const s = fresh(); s.netSeed = 4242; const ev = B.benchCommand(s, `bench ${what} ${level}`, { bench: name }); return { s, ev }; };
const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');

// ---------- the save keys ----------
test('a bench saves under its own key: never the real save\'s, never the campaign\'s, whatever the name', () => {
  assert.deepEqual(B.pageSave('?bench=phantom10', CAMPAIGN_KEY), { key: 'blackbox-bench-phantom10', bench: 'phantom10', camp: false });
  assert.equal(B.pageSave('', CAMPAIGN_KEY).key, B.SAVE_KEY);
  assert.equal(B.pageSave('?dev', CAMPAIGN_KEY).key, 'blackbox-v6');
  assert.equal(B.pageSave('?bench=Lv-10', CAMPAIGN_KEY).bench, 'lv-10', 'letters, digits and dashes, lower case');
  assert.equal(B.pageSave('?bench=a&campaign=breach', CAMPAIGN_KEY).key, 'blackbox-bench-a', 'a bench is never the campaign');
  assert.equal(B.pageSave('?bench=a&playtest=random', CAMPAIGN_KEY).bench, null, 'a playtest is never saved, bench or not');
  for (const bad of ['', '../blackbox-v6', 'v6 ', 'a/b', 'x'.repeat(40), '-x', 'é']) {
    const p = B.pageSave('?bench=' + encodeURIComponent(bad), CAMPAIGN_KEY);
    assert.equal(p.bench, null, bad);
  }
  for (const name of ['v6', 'blackbox-v6', 'campaign-v1', 'a', '0']) {
    const k = B.pageSave('?bench=' + name, CAMPAIGN_KEY).key;
    assert.ok(k.startsWith(B.BENCH_PREFIX), name);
    assert.notEqual(k, B.SAVE_KEY); assert.notEqual(k, CAMPAIGN_KEY);
  }
  // app.js reads, writes and wipes its save only through KEY, which pageSave picks.
  assert.match(app, /const \{ key: KEY, bench: BENCH, camp: CAMP \} = BN\.pageSave\(location\.search, CP\.CAMPAIGN_KEY\);/);
  assert.ok(!app.includes("'blackbox-v6'"), 'the real key is named only in bench.mjs');
  const saves = app.match(/localStorage\.(getItem|setItem|removeItem)\(([^,)]+)/g).filter((x) => !/'bb-/.test(x));
  assert.ok(saves.length >= 4);
  for (const x of saves) assert.match(x, /\((KEY|CP\.CAMPAIGN_KEY)$/, x);
});

test('loading, saving and resetting a bench never cross the real save', () => {
  const store = storage({ [B.SAVE_KEY]: REAL, [CAMPAIGN_KEY]: '{"camp":1}' });
  const { key } = B.pageSave('?bench=phantom10', CAMPAIGN_KEY);
  // Load: nothing there yet, so a fresh state, and the real save is not read into it.
  assert.equal(store.getItem(key), null);
  const { s } = benched('phantom', 10, 'phantom10');
  // Save, load back.
  store.setItem(key, JSON.stringify(s));
  const back = restore(JSON.parse(store.getItem(key)));
  assert.equal(classOf(back), 'infiltrator'); assert.equal(hackerLevel(back), 10);
  // Reset (app.js resetGame writes a fresh state to KEY): the bench starts over, the real save is as it was.
  store.setItem(key, JSON.stringify(fresh()));
  assert.equal(hackerLevel(restore(JSON.parse(store.getItem(key)))), 1);
  assert.equal(store.getItem(B.SAVE_KEY), REAL);
  assert.equal(store.getItem(CAMPAIGN_KEY), '{"camp":1}');
});

test('bench list and bench delete see only bench saves: the real save is never listed or removed', () => {
  const store = storage({ [B.SAVE_KEY]: REAL, [CAMPAIGN_KEY]: '{}', 'bb-crewwin': '{}', 'blackbox-bench-phantom10': '{}', 'blackbox-bench-herder30': '{}' });
  assert.deepEqual(B.benchList(store), ['herder30', 'phantom10']);
  const s = fresh();
  const say = (text, bench = 'phantom10') => B.benchCommand(s, text, { bench, store }).at(-1);
  assert.match(say('bench list').message, /herder30, phantom10 \(this one\)/);
  assert.equal(say('bench delete phantom10').type, 'warning', 'not the bench you are on');
  assert.equal(say('bench delete v6').type, 'warning', 'no bench called v6');
  assert.equal(say('bench delete blackbox-v6').type, 'warning');
  assert.equal(say('bench delete herder30').type, 'info');
  assert.deepEqual(B.benchList(store), ['phantom10']);
  assert.equal(store.getItem(B.SAVE_KEY), REAL);
  assert.equal(B.benchDelete(store, '../v6'), false);
  // With ?dev on the real game, list and delete work; a build never does.
  assert.equal(B.benchCommand(s, 'bench list', { dev: true, store }).at(-1).type, 'info');
  assert.equal(B.benchCommand(s, 'bench phantom 10', { dev: true, store }).at(-1).type, 'warning');
});

// ---------- bench <sub> <level> ----------
test('bench phantom 10: an Infiltrator Phantom at 10, talents spent, level-10 blues in every open slot, on floor 2', () => {
  const { s, ev } = benched('phantom', 10);
  assert.equal(ev.at(-1).type, 'bench');
  assert.equal(ev.at(-1).message, 'Bench: Phantom (Infiltrator), level 10, on floor 2.');
  assert.equal(classOf(s), 'infiltrator');
  assert.equal(subOf(s), 'phantom');
  assert.equal(hackerLevel(s), 10);
  assert.equal(talentPoints(s), 1);
  assert.equal(pointsSpent(s, 'infiltrator'), 1, 'every point spent');
  // Talents and gear as balance.mjs build() makes them (it is the same function).
  const ref = fresh(); build(ref, 'infiltrator', { level: 10 }, { sub: 'phantom' });
  assert.deepEqual(s.loadout.ranks.phantom, ref.loadout.ranks.phantom);
  assert.deepEqual(s.loadout.picks.phantom, ref.loadout.picks.phantom);
  const rig = s.gear.rigs.infiltrator.map((id) => s.stash.find((x) => x.id === id));
  const open = Array.from({ length: protocolSlots(10) }, (_, i) => i).filter((i) => SLOT_KINDS[i] !== 'implant');
  assert.equal(rig.length, open.length, 'every open slot filled (no implant below 15)');
  for (const it of rig) { assert.equal(it.rarity, 'tuned'); assert.equal(it.level, 10); }
  assert.deepEqual(rig.map((x) => x.name), ref.gear.rigs.infiltrator.map((id) => ref.stash.find((x) => x.id === id).name), 'the sims\' gear');
  // The bar: the Phantom's rotation preset.
  assert.deepEqual(equippedSkills(s, 'infiltrator'), presetKeys(s, 'infiltrator', 'rotation'));
  assert.equal(s.loadout.follow.phantom, 'rotation');
  // Floors: 10 is on Backhaul (7–14); the map is there, a few servers traced on it.
  assert.equal(floorFor(10), 2);
  assert.equal(s.floors.reached, 2); assert.equal(s.floors.at, 2);
  assert.ok(s.locations.filter((l) => l.depth === 2 && l.slot).length >= B.BENCH.traced);
  assert.ok(s.locations.some((l) => l.depth === 1 && l.slot), 'a server beside floor 1\'s exit, the way down');
  // Full, done with the tutorial, ready.
  assert.equal(s.server.integrity, s.server.max);
  assert.equal(signalNow(s), maxSignal(s));
  assert.equal(s.tutorialCompleted, true);
  assert.ok(s.profile?.handle);
  assert.ok(!active(s));
});

test('bench at any level: a class name is that class with no subclass picked (a subclass name picks it), the deepest floor whose band holds the level, more slots deeper', () => {
  const low = benched('phantom', 5).s;
  assert.equal(classOf(low), 'infiltrator'); assert.equal(subOf(low), null, 'below 10, the class only');
  assert.equal(low.floors.reached, 1);
  const b = benched('breaker', 5).s;
  assert.equal(classOf(b), 'breaker'); assert.equal(hackerLevel(b), 5);
  const h = benched('herder', 30).s;
  assert.equal(classOf(h), 'operator'); assert.equal(subOf(h), 'herder');
  assert.equal(talentPoints(h), pointsSpent(h, 'operator'));
  assert.equal(h.floors.reached, floorFor(30)); assert.equal(h.floors.at, floorFor(30));
  assert.ok(30 >= FLOORS[h.floors.at - 1].band[0] && 30 <= FLOORS[h.floors.at - 1].band[1]);
  assert.equal(h.gear.rigs.operator.length, protocolSlots(30));
  const c = benched('bastion', 50).s;
  assert.equal(subOf(c), null, 'a class from 10: no subclass picked yet, the core alone');
  assert.ok(subWaiting(c), 'its breakout waiting');
  assert.equal(pointsSpent(c, 'bastion'), 0);
  assert.equal(c.floors.reached, FLOORS.length);
  for (const sub of Object.keys(SUBS)) assert.equal(subOf(benched(sub, 20).s), sub, sub);
  for (const cls of Object.keys(ARCHETYPES)) assert.equal(classOf(benched(cls, 12).s), cls, cls);
});

test('bench again: the bench starts over as the new character, its settings kept', () => {
  const { s } = benched('phantom', 10);
  s.settings.music = false;
  B.benchCommand(s, 'bench sysop 40', { bench: 'x' });
  assert.equal(subOf(s), 'sysop'); assert.equal(hackerLevel(s), 40);
  assert.deepEqual(Object.keys(s.gear.rigs), ['bastion']);
  assert.equal(s.settings.music, false);
  assert.equal(s.floors.at, floorFor(40));
  assert.equal(B.benchCommand(s, 'bench wizard 10', { bench: 'x' }).at(-1).type, 'warning');
  assert.equal(B.benchCommand(s, 'bench phantom', { bench: 'x' }).at(-1).type, 'warning');
  assert.equal(subOf(s), 'sysop', 'a bad bench command changes nothing');
});

test('outside a bench, bench <sub> <level> is refused with a short warning and changes nothing', () => {
  const s = fresh();
  const ev = B.benchCommand(s, 'bench phantom 10');
  assert.equal(ev.length, 1);
  assert.equal(ev[0].type, 'warning');
  assert.match(ev[0].message, /\?bench=<name>/);
  assert.equal(hackerLevel(s), 1); assert.equal(classOf(s), 'breaker');
  // app.js sends bench commands here, and keeps developer commands to ?dev, a playtest and a bench.
  assert.match(app, /if \(\/\^bench\( \|\$\)\/\.test\(text\)\) return benchRun\(text\);/);
  assert.match(app, /const DEV = params\.has\('dev'\) \|\| !!BENCH;/);
  assert.match(app, /&& !DEV && !playtest &&/);
});

// ---------- the dev panel ----------
test('every panel button types an existing command, and each one works on a bench', () => {
  const was = PARTS.on;
  try {
    for (const id of B.PANEL_IDS) {
      const { s } = benched('phantom', 10);
      const v = { level: '12', kit: 'herder', event: 'courier', family: 'worm', seed: '3', part: B.panelParts()[1] };
      const cmd = B.benchAction(s, id, v);
      assert.ok(cmd, id);
      if (cmd === 'reset game') { assert.match(app, /if \(text === 'reset game' \|\| text === 'new game'\) return resetGame\(\);/); continue; }
      const ev = cmd.startsWith('bench ') ? B.benchCommand(s, cmd, { bench: 'x', store: storage() }) : play(s, cmd);
      assert.ok(!ev.some((e) => /Unknown command|usage/.test(e.message || '')), `${id}: ${cmd}: ${ev.map((e) => e.message).join(' ')}`);
      assert.ok(ev.length, `${id}: ${cmd} says something`);
    }
  } finally { PARTS.on = was; }
});

test('the panel\'s commands do what their buttons say', () => {
  const { s } = benched('phantom', 10);
  assert.equal(B.benchAction(s, 'lv+5'), 'developer level 15');
  assert.equal(B.benchAction(s, 'lv-1'), 'developer level 9');
  assert.equal(B.benchAction(s, 'lv', { level: '33' }), 'developer level 33');
  assert.equal(B.benchAction(s, 'lv', { level: '99' }), 'developer level 50');
  assert.equal(B.benchAction(s, 'build', { kit: 'herder', level: '' }), 'bench herder 10', 'your level when the field is empty');
  assert.equal(B.benchAction(s, 'fight', { family: 'ghostroot', level: '', seed: '' }), 'developer fight ghostroot 10 1');
  assert.equal(B.benchAction(s, 'event', { event: '' }), 'developer event');
  play(s, B.benchAction(s, 'lv+5'));
  assert.equal(hackerLevel(s), 15);
  // Refill: Signal and Integrity full.
  s.server.integrity = 3; s.signal = 1;
  play(s, B.benchAction(s, 'refill'));
  assert.equal(s.server.integrity, s.server.max); assert.equal(signalNow(s), maxSignal(s));
  const c = s.server.credits; play(s, B.benchAction(s, 'credits')); assert.equal(s.server.credits, c + 1000);
  // A fight: that family at that level, engaged.
  play(s, B.benchAction(s, 'fight', { family: 'worm', level: '12', seed: '5' }));
  assert.ok(active(s)); assert.equal(s.encounter.virus.family, 'worm'); assert.equal(s.encounter.virus.level, 12);
  assert.equal(play(s, 'developer fight worm 12 5').at(-1).type, 'warning', 'one fight at a time');
  // A part's fight: the part is in it.
  const t = benched('phantom', 10).s, pid = 'zipbomb';
  play(t, B.benchAction(t, 'part', { part: pid, level: '' }));
  assert.ok(active(t)); assert.ok(t.encounter.virus.parts.some((p) => p.id === pid), pid); assert.equal(t.encounter.virus.level, 5, 'at the level it opens');
  assert.ok(B.panelParts().includes(pid));
  // The parts roll: off, then on.
  const was = PARTS.on;
  try { play(s, B.benchAction(s, 'parts-on')); assert.equal(PARTS.on, !was); play(s, B.benchAction(s, 'parts-on')); assert.equal(PARTS.on, was); } finally { PARTS.on = was; }
  // The markup: one button a command, a tooltip each.
  const html = B.panelMarkup(s);
  for (const id of B.PANEL_IDS) assert.ok(html.includes(`data-bench-act="${id}"`), id);
  assert.equal((html.match(/<button /g) || []).length, B.PANEL_IDS.length);
  assert.equal((html.match(/ title="/g) || []).length >= B.PANEL_IDS.length, true);
});

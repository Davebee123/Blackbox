// The demo build (docs/demo-plan.md Phase 1; demo.mjs): the cap at level 14, floor 2's exit to the full game, nothing
// dealt below floor 2, its own save; the save's export and import (backup.mjs); opt-in telemetry (telemetry.mjs) and
// the Worker's numbers (tools/telemetry/stats.js); the build with --demo. With DEMO null the game is the game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fresh, command, hackerOf, gainXp, addLocation, SAVE_VERSION } from './dist/combat.mjs';
import { LOADOUT, FLOORS, floorFor, dealFloor, lastFloor } from './dist/data.mjs';
import { DEMO_BUILD, setDemo, version } from './dist/demo.mjs';
import { graphOf, canDescend, floorsOf } from './dist/floors.mjs';
import { mapMarkup, systemMarkup } from './dist/view.mjs';
import { levelGains } from './dist/progression.mjs';
import { gainItem } from './dist/levelup-view.mjs';
import { tradeOf } from './dist/runners.mjs';
import { pageSave, SAVE_KEY, DEMO_KEY } from './dist/bench-key.mjs';
import * as BU from './dist/backup.mjs';
import * as TM from './dist/telemetry.mjs';
import { endStats, endMarkup } from './dist/demo-view.mjs';
import { stats } from './tools/telemetry/stats.js';

const mk = (level = 1) => { const s = fresh(); s.tutorialCompleted = true; s.netSeed = 977; s.profile = { handle: 'Tester.1', pwLen: 6, since: 1 }; hackerOf(s).level = level; return s; };
const adj = (g, id) => g.links.filter((l) => l.includes(id)).map((l) => (l[0] === id ? l[1] : l[0]));
const demo = (fn) => { setDemo(DEMO_BUILD); try { return fn(); } finally { setDemo(null); } };
const down = (s) => { const g = graphOf(s, 1), host = adj(g, g.exits[0])[0]; addLocation(s, g.nodes[host].family, 1, null, host); command(s, 'descend'); };

test('without the demo the game is the game: level 50, eight floors, the real save', () => {
  assert.equal(LOADOUT.maxLevel, 50);
  assert.equal(lastFloor(), FLOORS.length);
  assert.equal(dealFloor(20), floorFor(20));
  assert.equal(version(), 'dev');
  assert.deepEqual(pageSave('?bench=x'), { key: 'blackbox-bench-x', bench: 'x' });
  assert.equal(pageSave('').key, SAVE_KEY);
  assert.doesNotMatch(systemMarkup(mk()), /Share play data/, 'no telemetry outside the demo');
});

test('the cap: XP stops at 14, the bar full; level 13 names the full game in place of floor 3', () => demo(() => {
  const s = mk(13);
  assert.equal(LOADOUT.maxLevel, 14);
  command(s, 'developer level 20');
  assert.equal(hackerOf(s).level, 14, 'no level past the demo');
  gainXp(s, 10_000);
  assert.equal(hackerOf(s).level, 14);
  assert.equal(hackerOf(s).xp, 0, 'no XP banks at the cap');
  const g = levelGains('breaker', 13);
  assert.ok(g.includes('The full game (floor 3)'), g.join(', '));
  assert.equal(gainItem('The full game (floor 3)', { arch: 'breaker', level: 13 }).label, 'The full game');
}));

test("floor 2's exit: its card says The full game, and descend stays shut", () => demo(() => {
  const s = mk(13);
  down(s);
  assert.equal(floorsOf(s).reached, 2);
  const g = graphOf(s, 2), host = adj(g, g.exits[0]).find((id) => g.nodes[id].kind === 'server' || g.nodes[id].kind === 'lair');
  addLocation(s, g.nodes[host].family, 2, null, host);
  assert.equal(canDescend(s), false);
  assert.match(command(s, 'descend').map((e) => e.message).join(' '), /Floor 3 and below are in the full game/);
  assert.equal(floorsOf(s).reached, 2);
  const card = mapMarkup(s, g.exits[0], 'mine', { floor: 2 });
  assert.match(card, />The full game<\/button>/);
  assert.doesNotMatch(card, /data-command="descend"/);
}));

test('nothing is dealt below floor 2: your floor for content, a runner\'s trade', () => demo(() => {
  assert.equal(lastFloor(), 2);
  assert.equal(dealFloor(14), 2);
  assert.equal(dealFloor(5), 1);
  const r = { handle: 'nyx', need: 300, tradeAt: 7 };
  for (let k = 0; k < 2000; k += 37) assert.ok(tradeOf(r, k, 2).floor <= 2);
}));

test('its own save: blackbox-demo, whatever the address asks for', () => {
  assert.deepEqual(pageSave('?bench=x&playtest=fx', DEMO_BUILD), { key: DEMO_KEY, bench: null });
  assert.notEqual(DEMO_KEY, SAVE_KEY);
});

test('export → import round-trips a save; a newer save, or no save, is refused', () => {
  const s = mk(9);
  s.server.credits = 1234;
  assert.equal(BU.exportName(s, Date.UTC(2026, 10, 22)), 'blackbox-tester1-2026-11-22.json');
  const r = BU.readSave(BU.exportText(s));
  assert.ok(r.ok, r.why);
  assert.equal(r.save.server.credits, 1234);
  assert.equal(hackerOf(r.save).level, 9);
  assert.deepEqual(r.who, { handle: 'Tester.1', level: 9, cls: 'Breaker' });
  const newer = BU.readSave(JSON.stringify({ ...s, version: SAVE_VERSION + 1 }));
  assert.equal(newer.ok, false);
  assert.match(newer.why, /newer build/);
  assert.equal(BU.readSave('not json').ok, false);
  assert.equal(BU.readSave('{"a":1}').ok, false);
});

test('the feedback report: build, device, level, floor, the last 100 log lines and the save', () => {
  const s = mk(4);
  for (let i = 0; i < 150; i++) s.logs.push({ type: 'info', message: `line ${i}` });
  const r = BU.reportOf(s, { browser: 'UA', screen: '390×844' });
  assert.equal(r.version, 'dev');
  assert.equal(r.level, 4);
  assert.equal(r.floor, 1);
  assert.equal(r.log.length, 100);
  assert.equal(r.log.at(-1), 'info: line 149');
  assert.equal(r.state, s);
  assert.equal(demo(() => BU.reportOf(s).version), 'demo 0.1');
});

test('telemetry: off until yes, a random id never the handle, only in the demo', () => {
  const s = mk(3);
  assert.equal(TM.askable(s), false, 'never asked outside the demo');
  demo(() => {
    assert.equal(TM.askable(s), true);
    assert.equal(TM.track(s, 'start'), null, 'nothing before yes');
    TM.observe(s, [{ type: 'level-up', level: 4 }]);
    assert.equal(TM.drain(s), null);
    TM.setTelemetry(s, true);
    assert.equal(TM.askable(s), false);
    assert.match(s.telemetry.id, /^[0-9a-f]{16}$/);
    TM.observe(s, [{ type: 'level-up', level: 4 }, { type: 'disconnected', where: 'SPRAWL-00', by: 'Cryptjack' }]);
    TM.bossOver(s, { virus: { boss: 'relayking' }, cycle: 18 }, 'victory', 41.6);
    TM.bossOver(s, { virus: {}, cycle: 3 }, 'victory', 10);
    const b = TM.drain(s);
    assert.equal(b.v, 'demo 0.1');
    assert.deepEqual(b.events.map((e) => e.k), ['level', 'disconnect', 'boss']);
    assert.deepEqual({ ...b.events[2], t: 0 }, { k: 'boss', t: 0, p: 0, L: 3, boss: 'relayking', won: true, cycles: 18, hp: 42 });
    assert.ok(!JSON.stringify(b).includes('Tester'), 'no handle');
    TM.setTelemetry(s, false);
    TM.track(s, 'start');
    assert.equal(TM.drain(s), null);
  });
});

test("the Worker's numbers: median play, hours to 5/10/14, where players stop, bosses", () => {
  const h = 3600000, ev = (id, k, p, L, x = {}) => ({ id, k, t: p, p, L, ...x });
  const s = stats([
    ev('a', 'level', 1 * h, 5), ev('a', 'level', 3 * h, 10), ev('a', 'boss', 3.1 * h, 10, { boss: 'pagenine', won: false, cycles: 20 }), ev('a', 'close', 4 * h, 10, { screen: 'map' }),
    ev('b', 'level', 2 * h, 5), ev('b', 'boss', 2.5 * h, 6, { boss: 'pagenine', won: true, cycles: 16, hp: 30 }), ev('b', 'done', 9 * h, 14), ev('b', 'close', 9 * h, 14, { screen: 'combat' }),
  ]);
  assert.equal(s.installs, 2);
  assert.equal(s.medianPlay, 6.5 * h);
  assert.equal(s.finished, 1);
  assert.equal(s.hoursTo[5], 1.5 * h);
  assert.equal(s.hoursTo[10], 6 * h);
  assert.deepEqual(s.stopAt, { 10: 1, 14: 1 });
  assert.deepEqual(s.bosses.pagenine, { won: 1, lost: 1, cycles: 18, hp: 30 });
  assert.deepEqual(s.lastScreen, { map: 1, combat: 1 });
});

test('the end card: time played, level, bosses down, uniques found, Feedback', () => {
  const s = mk(14);
  s.pace = { kills: 0, ms: 5 * 3600000 + 7 * 60000 };
  s.dex = { won: { relayking: 2, centrifuge: 1, nonsense: 1 } };
  assert.deepEqual(endStats(s), { ms: s.pace.ms, level: 14, bosses: 2, uniques: 0 });
  const html = endMarkup(s);
  assert.match(html, /5:07/);
  assert.match(html, /data-backup="feedback"/);
});

const esbuild = existsSync('node_modules/esbuild');
test('the demo build: DEMO in the bundle, the developer pages left out', { skip: !esbuild && 'esbuild not installed (npm ci)' }, async () => {
  const { buildGame } = await import('./scripts/build.mjs');
  const out = mkdtempSync(join(tmpdir(), 'bb-demo-'));
  try {
    const r = await buildGame(out, { demo: true });
    for (const m of ['dist/bench.mjs', 'dist/arena.mjs', 'dist/abilityfx-playtest.mjs', 'dist/editor.mjs']) assert.ok(!r.inputs.includes(m), `${m} left out`);
    assert.ok(r.inputs.includes('dist/demo.mjs'));
    const js = readFileSync(join(out, r.script), 'utf8');
    assert.match(js, /blackbox-demo/);
  } finally { rmSync(out, { recursive: true, force: true }); }
  const { build } = await import('esbuild'), { eager } = await import('./scripts/build.mjs');
  const one = async (demoOn) => { const b = await build({ entryPoints: ['dist/demo.mjs'], bundle: true, write: false, format: 'esm', plugins: [eager(demoOn)], logLevel: 'silent' }); return import(`data:text/javascript,${encodeURIComponent(b.outputFiles[0].text)}`); };
  assert.deepEqual((await one(true)).DEMO, DEMO_BUILD, 'the switch: DEMO set');
  assert.equal((await one(false)).DEMO, null, 'and null in the game');
});

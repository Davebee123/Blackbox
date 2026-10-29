// The Server page (dist/server-view.mjs, dist/server.css): the ring, the rows, the panel's actions as real commands,
// their before and after worked out on a copy of the save, and the Safe readout counting an invader's grade
// (invasion.mjs wallSafety, shared with the map's server card).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, command, syncServer, hooks } from './dist/combat.mjs';
import { benchBuild } from './dist/bench.mjs';
import { play } from './dist/run.mjs';
import { tickNetwork, wallBands, wallSafety, verdictOf, countsAt, pushOf, sendTop, senderGrade, GRADE_LEVELS, KINDS } from './dist/invasion.mjs';
import { addFilter, rollFilter, filtersOf } from './dist/filters.mjs';
import { seeded } from './dist/gear.mjs';
import { fwOf } from './dist/firewall.mjs';
import { mapMarkup, safetyTip } from './dist/view.mjs';
import { serverMarkup, ringMarkup, previewOf, previewable, readBack, copyOf } from './dist/server-view.mjs';

const T = 1_800_000_000_000; // a fixed clock for every command and read
const at = (fn) => { const was = hooks.now; hooks.now = () => T; try { return fn(); } finally { hooks.now = was; } };
// The panel's buttons, as [data-act, data-command, has a preview, disabled].
const actions = (html) => [...html.matchAll(/<button type="button" class="btn[^"]*" data-command="([^"]+)"([^>]*)>/g)].map(([, cmd, rest]) => ({ cmd, act: rest.match(/data-act="([^"]+)"/)?.[1] || null, preview: /data-preview=/.test(rest), off: /\bdisabled\b/.test(rest) }));
const panelOf = (html) => html.slice(html.indexOf('<aside class="hsv-panel'));

// One server of yours, on floor 4 (v3), at level L; your wall's base pinned at `wall` (tier 0, no filters).
function deep({ L = 20, wall = 20 } = {}) {
  const s = fresh();
  command(s, 'developer location ghostroot');
  command(s, 'developer level 30');
  s.locations = s.locations.filter((l) => !l.zone).slice(0, 1);
  for (const l of s.locations) { Object.assign(l, { level: L, depth: 4, runs: 1 }); delete l.rogue; delete l.member; }
  s.hidden = [];
  s.firewall = { pin: wall, plus: 0, frag: 0, defragUntil: 0 };
  syncServer(s);
  s.server.integrity = s.server.max;
  s.clock = 0;
  tickNetwork(s, 0);
  s.net.seq = 1;
  return s;
}
// The test bench's level-30 Herder with its servers connected, money and code, filters held, a fragmented wall.
function bench({ invade = null, frag = 6, hp = 100 } = {}) {
  const s = fresh();
  s.netSeed = 7; s.rng = 4242;
  benchBuild(s, 'herder', 30);
  for (const l of s.locations) l.runs = Math.max(1, l.runs || 0);
  const r = seeded(99);
  for (const stat of ['chip', 'defrag']) addFilter(s, rollFilter(r, { level: 26, rarity: 'tuned', stat }));
  at(() => {
    for (const c of ['developer credits 5000', 'developer code 300', `developer frag ${frag}`, `developer integrity ${hp}`, 'developer wall 22', 'filter equip 1']) play(s, c);
    if (invade) for (let n = 0; n < 30 && !s.invasion; n++) play(s, `developer invade ${invade}`);
  });
  return s;
}

test('the Safe readout counts the grade: a v3 server is no longer Safe at its own level, and a contested v3 champion never reads Safe', () => {
  const s = deep({ L: 20, wall: 20 }), loc = s.locations[0], b = wallBands(s);
  assert.equal(senderGrade(loc), 3, 'floor 4 sends v3');
  // What the game read before: blocks against the senders' bare level.
  assert.ok(b.blocks >= loc.level, 'the old readout said Safe here');
  const w = wallSafety(s);
  assert.equal(w.top, loc.level + 2 * GRADE_LEVELS, 'a plain v3 counts 4 levels over its server');
  assert.equal(sendTop(s), w.top);
  assert.notEqual(w.state, 'ok');
  assert.equal(w.vuln, b.blocks + 1);
  // A champion comes: a level over its server, 2 for its kind, 4 for its grade. Contested at the wall.
  play(s, 'developer invade champion');
  const inv = s.invasion;
  assert.equal(inv.kind, 'champion');
  assert.equal(inv.grade, 3);
  assert.equal(inv.level, loc.level + KINDS.champion.lvl);
  assert.ok(pushOf(inv) >= KINDS.champion.push);
  assert.equal(countsAt(inv), inv.level + pushOf(inv) + 2 * GRADE_LEVELS);
  assert.equal(verdictOf(s, inv), 'siege', 'contested');
  const w2 = wallSafety(s);
  assert.equal(w2.state, 'mid');
  assert.equal(w2.at, countsAt(inv));
  // Every place the readout shows: the Server page (vitals, the Level tile, the panel), the map's server card, the hover.
  const page = serverMarkup(s, T, { sel: 'wall' });
  assert.doesNotMatch(page, />Safe</);
  assert.match(page, new RegExp(`Wall <b class="warn">lv ${w2.vuln}\\+</b>`));
  assert.match(page, new RegExp(`Vulnerable to lv ${w2.vuln}\\+`));
  const card = mapMarkup(s, 'server');
  assert.doesNotMatch(card, /<small>safe<\/small>/);
  assert.match(card, new RegExp(`<small>vuln lv</small> ${w2.vuln}\\+`));
  assert.match(safetyTip(s, w2), new RegExp(`counts ${countsAt(inv)}: your wall contests it`));
});

test('the Safe readout still says Safe when the wall clears every grade, and a champion at the wall it blocks', () => {
  const s = deep({ L: 20, wall: 27 });
  assert.equal(wallSafety(s).state, 'ok');
  assert.match(serverMarkup(s, T), /Wall <b class="you">Safe<\/b>/);
  assert.match(mapMarkup(s, 'server'), /<small>safe<\/small>/);
  // A wall that blocks the plain ones but not the champion out now: not Safe while it sits contested.
  const t = deep({ L: 20, wall: 24 });
  assert.equal(wallSafety(t).state, 'ok', 'a plain v3 (24) is blocked');
  play(t, 'developer invade champion');
  assert.equal(verdictOf(t, t.invasion), 'siege');
  assert.equal(wallSafety(t).state, 'mid', 'the champion counts 27: not Safe');
});

test('the ring: hollow, cracked blocks for fragmentation, an amber arc at the wall, a red marker and ETA on the road', () => {
  const calm = bench({ frag: 6 });
  let svg = ringMarkup(calm, T);
  assert.equal((svg.match(/class="blk"/g) || []).length, 10, 'whole blocks');
  assert.equal((svg.match(/class="blk frag/g) || []).length, 6, 'fragmented blocks, hollow');
  assert.equal((svg.match(/class="crack"/g) || []).length, 6, 'each cracked');
  assert.doesNotMatch(svg, /class="press|class="road"|class="mark"/, 'calm: no arc, no road');
  fwOf(calm).frag = 0;
  assert.doesNotMatch(ringMarkup(calm, T), /blk frag|crack/);

  const road = bench({ invade: 'champion road' });
  assert.equal(road.invasion.state, 'travel');
  svg = ringMarkup(road, T);
  assert.match(svg, /class="road"/);
  assert.match(svg, /class="mark"/);
  const left = Math.round(road.invasion.left / 1000);
  assert.match(svg, new RegExp(`<text class="eta"[^>]*>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</text>`), 'the time left by the marker');
  assert.doesNotMatch(svg, /class="press/, 'no arc while it is on its way');
  // Further down its road, the marker sits lower.
  const y = (h) => Number(h.match(/<rect class="mark" x="[^"]+" y="([^"]+)"/)[1]);
  const y0 = y(svg);
  road.invasion.left = Math.round(road.invasion.total * 0.2);
  assert.ok(y(ringMarkup(road, T)) > y0);

  const wall = bench({ invade: 'champion' });
  assert.notEqual(wall.invasion.state, 'travel');
  svg = ringMarkup(wall, T);
  assert.match(svg, /<path class="press /, 'the amber arc');
  assert.doesNotMatch(svg, /class="road"|class="mark"/);
  // Integrity is the inner ring, with its number.
  assert.match(svg, new RegExp(`<text class="num[^"]*"[^>]*>${wall.server.integrity}</text>`));
});

test('every action button on the page issues its real command, and doing it does what it says', () => {
  const s = bench({ invade: 'champion' });
  const keys = ['core', 'wall', 'blocks', 'inv', `filter:0`, 'slot:1'];
  const seen = new Map();
  for (const k of keys) for (const a of actions(panelOf(serverMarkup(s, T, { sel: k })))) if (a.act) seen.set(a.act, a);
  const header = actions(serverMarkup(s, T).slice(0, serverMarkup(s, T).indexOf('<aside')));
  assert.deepEqual(header.map((a) => [a.act, a.cmd]), [['repair', 'repair']], 'the header\'s Repair');
  const want = { repair: 'repair', upgrade: 'firewall upgrade', defrag: 'firewall defrag', jack: 'jack in', 'filter-out': /^filter unequip \d+$/, 'filter-in': /^filter equip \d+$/ };
  for (const [act, cmd] of Object.entries(want)) {
    const a = seen.get(act);
    assert.ok(a, `${act} is on the page`);
    if (typeof cmd === 'string') assert.equal(a.cmd, cmd, act); else assert.match(a.cmd, cmd, act);
    assert.equal(a.off, false, `${act} is live`);
    assert.equal(a.preview, act !== 'jack', `${act} ${act === 'jack' ? 'has no' : 'has a'} preview`);
  }
  // Each one, run as the prompt runs it, changes the save the way it says.
  const did = (cmd, check) => { const c = copyOf(s); const ev = at(() => play(c, cmd)); assert.ok(!ev.some((e) => e.type === 'warning'), `${cmd}: ${ev.find((e) => e.type === 'warning')?.message}`); check(c); };
  did(seen.get('repair').cmd, (c) => assert.equal(c.server.integrity, c.server.max));
  did(seen.get('upgrade').cmd, (c) => assert.equal(fwOf(c).plus, 1));
  did(seen.get('defrag').cmd, (c) => assert.ok(fwOf(c).defragUntil > T));
  did(seen.get('jack').cmd, (c) => assert.equal(c.encounter?.invader, s.invasion.id));
  did(seen.get('filter-out').cmd, (c) => assert.equal(c.filters.on.length, s.filters.on.length - 1));
  // A held filter's own panel: Put in, and Scrap (asked twice).
  const held = filtersOf(s).findIndex((_, i) => !s.filters.on.includes(i));
  const fp = actions(panelOf(serverMarkup(s, T, { sel: `filter:${held}` })));
  assert.deepEqual(fp.map((a) => a.cmd), [`filter equip ${held + 1}`, `filter scrap ${held + 1}`]);
  assert.match(serverMarkup(s, T, { sel: `filter:${held}` }), /data-command="filter scrap \d+"[^>]*data-confirm=/);
  did(fp[0].cmd, (c) => assert.ok(c.filters.on.includes(held)));
  did(fp[1].cmd, (c) => assert.equal(filtersOf(c).length, filtersOf(s).length - 1));
});

test('a preview never touches the real save, and shows exactly what the action then does', () => {
  const s = bench({ invade: 'champion', frag: 9, hp: 90 });
  const cmds = ['repair', 'firewall defrag', 'filter unequip 1', 'filter equip 1', 'firewall upgrade'];
  for (const cmd of cmds) {
    assert.ok(previewable(cmd), cmd);
    const before = JSON.stringify(s);
    const p = at(() => previewOf(s, cmd, T));
    assert.equal(JSON.stringify(s), before, `${cmd}: the real save is untouched`);
    assert.equal(p.refused, null, `${cmd}: ${p.refused}`);
    assert.deepEqual(p.before, at(() => readBack(s, T)), `${cmd}: before is now`);
    // The page with that preview showing doesn't touch it either.
    at(() => serverMarkup(s, T, { sel: 'wall', preview: cmd }));
    assert.equal(JSON.stringify(s), before, `${cmd}: drawing it is harmless`);
    at(() => play(s, cmd));
    assert.deepEqual(at(() => readBack(s, T)), p.after, `${cmd}: after is what it did`);
  }
  // A defrag's preview reads the wall once it has finished.
  const t = bench({ frag: 8 });
  const p = at(() => previewOf(t, 'firewall defrag', T));
  assert.ok(p.done && p.done.eff > p.after.eff && p.done.frag === 0);
  // Jack in and scrap have no preview; something the game would refuse says why.
  assert.equal(previewable('jack in'), false);
  assert.equal(previewable('filter scrap 1'), false);
  t.server.integrity = t.server.max;
  assert.match(at(() => previewOf(t, 'repair', T)).refused, /full/);
  assert.match(serverMarkup(t, T, { sel: 'core', preview: 'repair' }), /hsv-refused/);
});

test('the page keeps the wall, filters and code, and repeats nothing: daemons, senders and the network card live elsewhere', () => {
  const s = bench();
  command(s, 'developer daemon flare 27');
  command(s, 'daemon slot flare');
  const page = serverMarkup(s, T);
  assert.match(page, /Codebases · \d/);
  assert.match(panelOf(serverMarkup(s, T, { sel: 'codebases' })), /Harvester/);
  assert.match(page, /Held · 1/);
  for (const k of ['network', 'daemon:0', 'dslot', 'sender:0', 'senders', 'harden', 'ports']) assert.doesNotMatch(page, new RegExp(`data-svkey="${k}"`), k);
  assert.doesNotMatch(page, /Open ports|harden\.sh/);
  // The map's list marks every server that sends invasions with what your wall does to a plain one.
  const list = mapMarkup(s, null, 'mine', { list: true });
  const marks = list.match(/class="sl-wall (you|warn|hot)"/g) || [];
  assert.ok(marks.length >= 1, 'senders marked in the list');
  assert.match(list, /class="sl-wall [^"]+" title="Sends invasions/);
  // Rule highlights only in the panel.
  const card = page.slice(0, page.indexOf('<aside'));
  assert.doesNotMatch(card, /class="hi"/);
  assert.match(panelOf(page), /class="hi"/);
});

test('a phone: one column, no sideways scroll, the panel a bottom sheet of a fixed height; motion is light only', () => {
  const css = readFileSync(new URL('./dist/server.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const phone = css.slice(css.indexOf('@media (max-width: 900px)'));
  assert.match(phone, /\.hsv-page \{ grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(phone, /\.hsv-sec \{ grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(phone, /\.hsv-wall, \.hsv-chips \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(phone, /\.hsv-panel \{ display: none; position: sticky;[^}]*bottom: var\(--dock-h, 0px\);[^}]*height: min\(/, 'a sheet of a fixed height above the prompt');
  assert.match(phone, /\.hsv-panel\.open \{ display: grid; \}/);
  // Every grid column can shrink; nothing in a cell holds the page wider.
  for (const [, cols] of phone.matchAll(/grid-template-columns: ([^;]+);/g)) assert.match(cols, /^(repeat\(\d, )?minmax\(0, 1fr\)\)?$|^\d{2,3}px minmax\(0, 1fr\)$/, `phone columns shrink: ${cols}`);
  for (const [, px] of phone.matchAll(/(?<![\w-])(?:min-)?width: (\d+)px/g)) assert.ok(Number(px) <= 120, `a fixed width on a phone: ${px}px`);
  for (const rule of css.match(/[^{}]+\{[^}]*white-space: nowrap[^}]*\}/g)) assert.match(rule, /overflow: hidden|min-width: 0|^\s*\.hsv-(vital|ba dd|chip (em|small)|pcost)|\.pcost > span/, rule.trim().slice(0, 60));
  // Nothing moves: the arc pulses and the road flows in light only, and both stop with Motion off or reduced motion.
  for (const [, kf] of css.matchAll(/@keyframes [\w-]+ \{(.*?\})\s*\}/g)) assert.doesNotMatch(kf, /transform|translate|top|left|width|height/);
  assert.match(css, /\.no-motion \.hsv-ring \.press, \.no-motion \.hsv-ring \.road \{ animation: none; \}/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.hsv-ring \.press, \.hsv-ring \.road \{ animation: none; \} \}/);
  // The markup at a phone's width: nothing with a fixed width beyond the screen.
  const s = bench({ invade: 'champion road' });
  const html = serverMarkup(s, T, { open: true });
  assert.doesNotMatch(html, /style="[^"]*width:\s*\d{3,}px/);
  assert.doesNotMatch(html, /<canvas/);
});

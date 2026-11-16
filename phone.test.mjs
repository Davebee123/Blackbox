// The phone's shell (docs/phone-plan.md P1): every shell control is a tap path (a data- command), every page is two
// taps away, nothing on the cut list is in the shell, phone.css only speaks to a phone, and the desktop-only modules
// are never imported at start.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tabBarMarkup, tabsOf, moreMarkup, contextOf, CUT } from './dist/phone-shell.mjs';
import { sheetMarkup, HEIGHTS } from './dist/sheet.mjs';
import { form, isPhone, PHONE_QUERY } from './dist/form.mjs';
import { pageSave } from './dist/bench.mjs';
import { DISTRICTS } from './dist/window.mjs';
import { DISTRICTS as D2 } from './dist/districts.mjs';

const home = { mail: { list: [{ id: 1, read: false }] } };
const controls = (html) => html.match(/<button\b[^>]*>/g) || [];
const who = { handle: 'tester', cls: 'Breaker', level: 20, xp: 0.4 };

test('every control in the tab bar and More carries a data- command', () => {
  for (const html of [tabBarMarkup(home, { module: 'map' }), tabBarMarkup({ ...home, rooms: {} }, { module: 'map', active: true }), moreMarkup(home, { who, consortium: true, people: true }), tabBarMarkup(home, { camp: true })]) {
    const bs = controls(html);
    assert.ok(bs.length >= 4);
    for (const b of bs) assert.match(b, /data-(module|phone|finger)="[^"]+"/, b);
  }
});

test('every page is reachable in two taps: one on the bar, or More and one row', () => {
  const ids = (html) => [...html.matchAll(/data-module="([a-z]+)"/g)].map((m) => m[1]);
  const reach = new Set([...ids(tabBarMarkup(home)), ...ids(moreMarkup(home, { who, consortium: true }))]);
  for (const page of ['map', 'mail', 'loadout', 'server', 'codex', 'rig', 'system', 'consortium']) assert.ok(reach.has(page), page);
  assert.match(moreMarkup(home, { who }), /data-phone="prompt"/); // the command line, behind >_
  assert.match(moreMarkup(home, { who }), /data-finger="tester"/); // the player card
});

test('the first slot is the live context in Map\'s place, a red dot while you are away from it', () => {
  assert.equal(tabsOf(home)[0].module, 'map');
  const fight = tabsOf({ ...home, rooms: {} }, { module: 'map', active: true });
  assert.deepEqual([fight[0].module, fight[0].label, fight[0].dot], ['combat', 'Fight', true]);
  assert.equal(tabsOf(home, { module: 'combat', active: true })[0].dot, false);
  assert.equal(contextOf({ rooms: {} }).module, 'rooms');
  assert.equal(contextOf({ run: {} }).module, 'net');
  assert.equal(contextOf({ breach: {} }).module, 'breach');
  assert.match(tabBarMarkup(home, { module: 'mail' }), /data-module="mail" aria-current="page"/);
  assert.match(tabBarMarkup(home, { module: 'codex' }), /data-phone="more"[^>]*aria-current="page"/); // a More page lights More
  assert.match(tabBarMarkup(home, { counts: { mail: 1 } }), /ph-n">1</);
});

test('nothing on the cut list is in the phone shell', () => {
  const all = [tabBarMarkup(home), moreMarkup(home, { who, consortium: true, people: true }), sheetMarkup('x')].join('');
  for (const c of CUT) assert.ok(!all.includes(c), c);
  for (const c of ['Casing', 'Window', 'UI scale', '#net', 'Dev']) assert.ok(!all.includes(c), c);
});

test('the sheet comes at three heights and closes on a tap outside', () => {
  for (const h of HEIGHTS) assert.match(sheetMarkup('x', { height: h }), new RegExp(`h-${h}`));
  assert.match(sheetMarkup('x', { height: 'tall' }), /h-peek/);
  assert.match(sheetMarkup('x'), /class="sh-scrim" data-sheet-close/);
});

test('form.mjs: a desk where no screen answers; the phone query', () => {
  assert.equal(form(), 'desk');
  assert.equal(isPhone(), false);
  assert.equal(PHONE_QUERY, '(max-width: 600px), (max-height: 500px) and (pointer: coarse)');
});

test('phone.css speaks only to a phone', () => {
  const css = readFileSync(new URL('./dist/phone.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/(^|})\s*([^{}@][^{}]*?)\s*\{/g)].map((m) => m[2].trim()).filter((s) => !/^(from|to|\d+%|@.*)$/.test(s));
  assert.ok(rules.length > 20);
  for (const sel of rules) for (const part of sel.split(/,(?![^(]*\))/)) assert.match(part.trim(), /^(\[data-form='phone'\]|:root:not\(\[data-form='phone'\]\))/, part);
  assert.match(css, /--tap: 44px/);
  assert.match(readFileSync(new URL('./dist/index.html', import.meta.url), 'utf8'), /viewport-fit=cover/);
});

test('the desktop-only modules load on demand: the window, the bench, the fx playtest', () => {
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  const statics = [...app.matchAll(/^import [^;]+ from '\.\/([^']+)';/gm)].map((m) => m[1]);
  for (const m of ['window.mjs', 'bench.mjs', 'abilityfx-playtest.mjs']) assert.ok(!statics.includes(m), m);
  for (const f of ['casing.mjs', 'casing-view.mjs', 'achievements-view.mjs']) assert.ok(!/from '\.\/window\.mjs'/.test(readFileSync(new URL(`./dist/${f}`, import.meta.url), 'utf8')), f);
  assert.equal(DISTRICTS, D2); // window.mjs still offers the districts it moved out
  assert.ok(!/matchMedia\('\(max-width: 900px\)'\)/.test(app)); // the one answer is form.mjs
  assert.equal(pageSave('?bench=phone', 'c').bench, 'phone'); // bench.mjs still re-exports the save keys
});

// P2: the fight on a phone.
import { fresh, selectEncounter } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { crewLineMarkup } from './dist/view.mjs';

test('the fight HUD: a crewmate is a thin violet line with its card; none when solo', () => {
  const s = fresh();
  assert.equal(crewLineMarkup(s), '');
  s.hackers[s.loadout.archetype].level = 12; // the sim crew comes at level 5
  play(s, 'crew sim bastion');
  selectEncounter(s, 'random', 2, { level: 1, family: 'ransomware', mutation: null });
  const html = crewLineMarkup(s);
  assert.equal((html.match(/class="ph-mate/g) || []).length, 1);
  assert.match(html, /title="[^"]+: Bastion, Lv \d+\.\n(Signal \d+\/\d+\.|Down\.)"/);
  assert.match(html, /<i style="width:\d+(\.\d+)?%"><\/i>/);
});

test('the fight tray: the menu key and +n are tap paths; no prompt key, no #net line', () => {
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  const menu = app.slice(app.indexOf('function phMenuKey('), app.indexOf('function phMenuMarkup('));
  assert.match(menu, /data-phone="menu"/);
  assert.match(menu, /data-phone="keys"/);
  assert.match(app, /const PH_KEYS = 8;/);
  const css = readFileSync(new URL('./dist/phone.css', import.meta.url), 'utf8');
  assert.match(css, /body\.ph-fight #tray > :is\(\.ability\.ph-over, \.tk-open\) \{ display: none; \}/); // past eight under +n; the Toolkit's key out
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) 44px/); // two rows of four, the menu column
  assert.match(css, /body\.ph-fight \.ph-tabs:not\(\.ph-in-sheet\) \{ display: none; \}/); // the tab bar behind the menu key
  assert.match(css, /\.command-dock :is\(\.net-line, \.channel\) \{ display: none; \}/);
  assert.match(css, /body\.ph-fight #board \.brow\.byou \{ display: none; \}/); // no You row on a phone
  assert.match(app, /function phPicked\(\)/); // the picked key outlined instead
  assert.match(css, /body\.ph-fight \.hud :is\(\.vname, \.gene-line, \.hud-status\) \{ display: none; \}/); // the one-line HUD (pick C)
  const cards = app.slice(app.indexOf('function phHudCards('), app.indexOf('function phPicked('));
  assert.match(cards, /if \(!F\.isPhone\(\)\) \{ for \(const b of \[en, me\]\) \{ delete b\.dataset\.tt;/); // never a card on a desktop
  assert.match(cards, /Rules: /);
});

// P3: maps and sheets.
import { mapChips, mapRail, mapMarkup } from './dist/view.mjs';
import { play as playRun } from './dist/run.mjs';

test('the map on a phone: chips for the rail and the tracker, each a tap path; no rail, no hover names key needed', () => {
  const s = fresh();
  assert.match(mapChips(s), /class="ph-chip job" data-phone="jobs"/); // a fresh save holds its first contract
  assert.ok(!mapChips(s).includes('ph-chip hot') && !mapChips(s).includes('ph-chip ok')); // a chip at zero is left out
  s.degraded = { until: Date.now() + 60000, ms: 600000 };
  const chips = mapChips(s);
  assert.match(chips, /class="ph-chip hot" data-phone="threats"/);
  for (const b of controls(chips)) assert.match(b, /data-phone="(threats|jobs)"/, b);
  assert.match(mapRail(s, 'threats'), /class="tr-row [^"]*" data-select="server"/); // the list a chip opens: the desktop's rows
  const phone = mapMarkup(s, null, 'mine', { side: false, phone: true }), desk = mapMarkup(s, null, 'mine', { side: false });
  assert.ok(phone.includes('ph-chips') && !phone.includes('map-lcol'));
  assert.ok(desk.includes('map-lcol') && !desk.includes('ph-chip')); // the desktop keeps its rail
  assert.ok(phone.indexOf('floor-lift') < phone.indexOf('ph-chips')); // the floors, then the chips
  for (const c of CUT) assert.ok(!chips.includes(c), c);
  assert.ok(!mapMarkup(s, 'server', 'mine', { side: false, pop: true, list: true, phone: true }).includes('map-side')); // List mode: the card is the sheet's too
});

test('the sheet: a see-through one has no scrim; closed() says when another took its place', () => {
  assert.ok(!sheetMarkup('x', { through: true }).includes('sh-scrim'));
  assert.match(sheetMarkup('x', { through: true }), /aria-modal="false"/);
  const src = readFileSync(new URL('./dist/sheet.mjs', import.meta.url), 'utf8');
  assert.match(src, /f\(\{ replaced: true, by: id \}\)/);
});

test('every pop-up is the one sheet, and the four old sheets are gone', () => {
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8'), css = readFileSync(new URL('./dist/phone.css', import.meta.url), 'utf8');
  const pops = app.slice(app.indexOf('const PH_POPS = ['), app.indexOf('let phPop = null'));
  for (const id of ['journal', 'offer', 'quest', 'comms', 'item', 'map', 'room', 'server', 'daemon', 'levelup']) assert.match(pops, new RegExp(`\\{ id: '${id}', (host|page): `), id);
  for (const row of pops.split('\n').filter((l) => /\{ id: /.test(l))) assert.match(row, /shut: \(\) =>/, row); // each closes by hand
  assert.match(css, /#page-view :is\(#map-pop, #fp-pop, #hsv-panel, \.dm-panel, #th-panel\)/); // at home none shows on a phone
  const read = (f) => readFileSync(new URL(`./dist/${f}`, import.meta.url), 'utf8');
  assert.ok(!/\.pg-pop\.sheet/.test(read('style.css')));
  assert.ok(!/\.hsv-panel \{[^}]*position: sticky; top: auto; bottom/.test(read('server.css')));
  assert.ok(!/\.dm-panel \{[^}]*position: fixed/.test(read('daemons.css')));
  assert.ok(!/\.gain\.jr-wrap \{[^}]*place-items: end/.test(read('codex.css')));
  assert.ok(!/pd\.sheet/.test(app));
});

test('the maps on a phone: pinch and double-tap, the rooms header one line, Wait and Jack out afloat', () => {
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8'), css = readFileSync(new URL('./dist/phone.css', import.meta.url), 'utf8');
  assert.match(app, /function phZoomAt\(svg, at, k\)/);
  assert.match(css, /:is\(\.map-svg, \.fp-svg\) \{ touch-action: none; \}/);
  assert.match(css, /body\.ph-rooms \.topbar \{ display: none; \}/);
  assert.match(css, /body\.ph-rooms #page-view \.fp-acts \{ position: fixed;/);
  assert.match(moreMarkup(home, { who, pager: '<i></i>' }), /data-phone="comms"/); // no strip on a server: the pager is in More
  assert.ok(!/data-phone="comms"/.test(moreMarkup(home, { who })));
});

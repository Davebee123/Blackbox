// Screen effects (dist/screenfx.mjs, dist/screenfx.css): light on the glass around the game, never on it. The effects
// only ever touch the backdrop, the tube's edge, the casing's lamps and the virus picture; the settings persist;
// Motion off and reduced motion hold everything still; every floor's palette keeps its text readable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SFX, PALETTES, TOUCHES, createScreenFx, screenState, screenFxCommand, levelOf, effectOn, floorOf, lowOf, warnOf, lampsOf, varsOf, boardFxOf, migrateEffects } from './dist/screenfx.mjs';
import { fresh, restore } from './dist/combat.mjs';
import { FLOORS } from './dist/data.mjs';

const css = readFileSync(new URL('./dist/screenfx.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
// Every rule in the file, @media blocks flattened: { sel, body, media }.
function rules(text) {
  const out = [];
  let i = 0;
  const walk = (end, media) => {
    while (i < end) {
      const open = text.indexOf('{', i);
      if (open < 0 || open >= end) { i = end; return; }
      const head = text.slice(i, open).trim();
      let depth = 1, j = open + 1;
      while (depth && j < text.length) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
      if (head.startsWith('@media')) { i = open + 1; walk(j - 1, head); i = j; continue; }
      if (!head.startsWith('@keyframes')) out.push({ sel: head, body: text.slice(open + 1, j - 1), media });
      i = j;
    }
  };
  walk(text.length, null);
  return out;
}
const props = (body) => body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => d.slice(0, d.indexOf(':')).trim());

test('every screen effect rule styles only the backdrop, the bezel, the lamps or the virus picture', () => {
  const all = rules(css);
  assert.ok(all.length > 30, 'the file parses into rules');
  // The subject (the last compound of each selector) must be one of these; the rest of the selector only says when.
  const ok = [/^#fx-back\b/, /^\.fx-(tex|static|vig|tear)$/, /^#crt-bezel\.(low|warn)(::after)?$/, /^\.lamp\b/, /^#virus-canvas\.sfx-tear$/];
  // The three exceptions, each limited to what it may set: :root's own variables, the map's empty field (its
  // background, so the floor shows through it), the screen's own background and glow, and the window's z-index.
  const limited = [
    { re: /^:root(\[[^\]]+\])*$/, may: (p) => p.startsWith('--') },
    { re: /^\.map-canvas$/, may: (p) => p === 'background' },
    { re: /^\.app$/, may: (p) => p === 'background' || p === 'box-shadow' },
    { re: /^\.window-out$/, may: (p) => p === 'z-index' },
  ];
  for (const r of all) {
    for (const sel of r.sel.split(',').map((x) => x.trim())) {
      const parts = sel.split(/\s+|>/).filter(Boolean), subject = parts.at(-1);
      if (ok.some((re) => re.test(subject))) continue;
      if (parts.slice(0, -1).some((x) => /^#fx-back\b|^\.lamp\b/.test(x))) continue; // inside the backdrop or a lamp
      const lim = limited.find((l) => l.re.test(subject));
      assert.ok(lim, `"${sel}" styles something that isn't the backdrop, bezel, lamps or virus picture`);
      for (const p of props(r.body)) assert.ok(lim.may(p), `"${sel}" may not set ${p}`);
    }
  }
  // The backdrop sits behind the page and never catches a click.
  const back = all.find((r) => r.sel === '#fx-back');
  assert.match(back.body, /z-index: -1/);
  assert.match(back.body, /pointer-events: none/);
});

test('the effects write only to the backdrop, the bezel, the lamps, the virus picture and <html>\'s data and tokens', () => {
  const touched = new Set(), els = {};
  const el = (id) => (els[id] ||= { id, className: 'lamp', title: '', offsetWidth: 1, classList: { add: () => touched.add(id), remove: () => touched.add(id), toggle: () => touched.add(id), contains: () => false } });
  const html = { dataset: {}, style: { setProperty: (k) => { assert.ok(k.startsWith('--'), `sets ${k}`); touched.add('html'); }, removeProperty: (k) => { assert.ok(k.startsWith('--')); } } };
  const doc = { documentElement: html, getElementById: (id) => { touched.add(id); return el(id); } };
  const fx = createScreenFx(doc, { canMove: () => true });
  const s = fresh();
  s.run = { integrity: 10, max: 100, loc: 'x' };
  const st = screenState(s, { module: 'net', loc: { depth: 4 }, health: 0.1, until: fx.until });
  assert.equal(st.floor, 4);
  assert.equal(st.low, true);
  fx.apply(st);
  assert.ok(fx.hit(0.5, false), 'a big hit tears');
  assert.ok(fx.crit(), 'a crit tears the virus picture');
  fx.blink('net');
  fx.apply(screenState(s, { module: 'net', loc: { depth: 4 }, health: 0.1, until: fx.until }));
  for (const id of touched) assert.ok(TOUCHES.includes(id), `touched #${id}`);
  assert.equal(html.dataset.floor, '4');
  assert.equal(html.dataset.sfxTex, 'frost');
  assert.equal(html.dataset.sfx, 'medium');
  assert.match(els['lamp-net'].className, /blink-once/);
  assert.ok(!touched.has('app') && !touched.has('board') && !touched.has('workspace'));
});

test('Screen effects: off / subtle / medium (the default) / bold, and each effect on its own; the settings persist', () => {
  const s = fresh();
  assert.equal(levelOf(s), 'medium');
  assert.equal(screenFxCommand(s, 'screen fx'), 'Screen effects: bold.');
  assert.equal(screenFxCommand(s, 'screen fx next'), 'Screen effects: off.');
  assert.equal(effectOn(s, 'floor'), false, 'off turns every effect off');
  assert.equal(screenFxCommand(s, 'screen fx subtle'), 'Screen effects: subtle.');
  assert.match(screenFxCommand(s, 'screen fx floor off'), /Floor colour: off/);
  assert.match(screenFxCommand(s, 'screen fx leds off'), /Status lights: off/);
  assert.equal(effectOn(s, 'floor'), false);
  assert.equal(effectOn(s, 'hits'), true);
  assert.equal(screenFxCommand(s, 'connect sprawl'), null, 'other commands pass through');
  assert.match(screenFxCommand(s, 'screen fx wobble'), /screen fx off\|subtle\|medium\|bold/);
  const back = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(levelOf(back), 'subtle');
  assert.deepEqual(back.settings.screenFxOff, { floor: true, lamps: true });
  assert.equal(screenFxCommand(back, 'screen fx floor on'), 'Floor colour: on.');
  assert.equal(effectOn(back, 'floor'), true);
  // With the floor's colour off, a run keeps the default amber.
  back.run = { integrity: 50, max: 100 };
  back.settings.screenFxOff.floor = true;
  assert.equal(screenState(back, { module: 'net', loc: { depth: 3 } }).floor, null);
});

test('Motion off and reduced motion: nothing tears, and the CSS stops every animation', () => {
  const doc = { documentElement: { dataset: {}, style: { setProperty() {}, removeProperty() {} } }, getElementById: () => null };
  const fx = createScreenFx(doc, { canMove: () => false });
  fx.apply(screenState(fresh(), {}));
  assert.equal(fx.hit(1, true), false);
  assert.equal(fx.crit(), false);
  const all = rules(css);
  for (const scope of [(r) => !r.media && /^\.no-motion /.test(r.sel), (r) => /prefers-reduced-motion/.test(r.media || '')]) {
    const still = all.filter(scope).filter((r) => /animation: none !important/.test(r.body)).map((r) => r.sel).join(',');
    for (const what of ['#fx-back', '#fx-back > i', '#crt-bezel.low::after', '.lamp i', '#virus-canvas.sfx-tear']) assert.ok(still.includes(what), `${what} holds still`);
    assert.ok(all.filter(scope).some((r) => /\.fx-tear/.test(r.sel) && /display: none/.test(r.body)), 'no tear');
  }
});

test('a hit tears the backdrop only when it is big (or a crit), by strength', () => {
  const doc = { documentElement: { dataset: {}, style: { setProperty() {}, removeProperty() {} } }, getElementById: () => null };
  const fx = createScreenFx(doc);
  const s = fresh();
  fx.apply(screenState(s, {}));
  assert.equal(fx.hit(0.05), false);
  assert.equal(fx.hit(SFX.big.medium), true);
  assert.equal(fx.hit(0.01, true), true, 'a crit always');
  s.settings.screenFx = 'subtle';
  fx.apply(screenState(s, {}));
  assert.equal(fx.hit(0.15), false);
  s.settings.screenFxOff = { hits: true, crits: true };
  fx.apply(screenState(s, {}));
  assert.equal(fx.hit(1, true), false);
  assert.equal(fx.crit(), false);
});

test('the floor whose colours are up: the map\'s floor, a run\'s server; home keeps amber', () => {
  const s = fresh();
  assert.equal(floorOf(s, { module: 'map', mapFloor: 5 }), 5);
  assert.equal(floorOf(s, { module: 'server' }), null);
  s.run = { integrity: 80, max: 100 };
  assert.equal(floorOf(s, { module: 'net', loc: { depth: 7 } }), 7);
  assert.equal(floorOf(s, { module: 'net', loc: {} }), 1);
  s.encounter = { phase: 'active', mode: 'run' };
  assert.equal(floorOf(s, { module: 'combat', loc: { depth: 2 } }), 2, 'a fight on its server');
  s.encounter = { phase: 'active', mode: 'home' };
  assert.equal(floorOf(s, { module: 'combat', loc: { depth: 2 } }), null, 'a fight at home');
  assert.equal(lowOf(0.24), true);
  assert.equal(lowOf(0.25), false);
  assert.equal(lowOf(null), false, 'home: a resting Signal is no danger');
});

test('the casing\'s lamps show real state', () => {
  const s = fresh(), now = 1000;
  let L = lampsOf(s, { now });
  assert.equal(L.pwr.cls, 'on');
  assert.equal(L.gate.cls, '');
  assert.equal(L.inst.cls, '');
  s.degraded = { until: now + 1000 };
  s.invasion = { name: 'WORM', state: 'breach' };
  s.install = { startedAt: 0, doneAt: now * 2 };
  s.market = { transfers: [{ landsAt: now + 10 }] };
  s.daemons = ['watchman'];
  s.events = [{ card: 'feud' }];
  L = lampsOf(s, { now, gate: { phase: 'alert', virus: { name: 'CRYPTJACK' } }, until: { dmn: now + 5 } });
  assert.deepEqual([L.pwr.cls, L.pwr.blink], ['hot', 'slow']);
  assert.deepEqual([L.gate.cls, L.gate.blink], ['on', 'fast']);
  assert.match(L.gate.title, /^GATE: CRYPTJACK waiting/);
  assert.equal(L.wall.cls, 'low', 'degraded dims the wall');
  delete s.degraded;
  L = lampsOf(s, { now, until: {} });
  assert.deepEqual([L.wall.cls, L.wall.blink], ['hot', 'fast']);
  assert.deepEqual([L.inst.cls, L.inst.blink], ['on', 'busy']);
  assert.equal(L.net.cls, 'on', 'an event up');
  assert.equal(L.dmn.cls, 'low dmn', 'slotted, not firing');
  assert.equal(lampsOf(s, { now, until: { dmn: now + 1 } }).dmn.blink, 'once');
  for (const [id, l] of Object.entries(L)) assert.ok(l.title.startsWith(id.toUpperCase() + ':'), `${id}'s tooltip names it`);
});

// WCAG contrast.
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lum = (h) => { const c = rgb(h).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (a, b, t) => '#' + rgb(a).map((v, i) => Math.round((v * (1 - t) + rgb(b)[i] * t) * 255).toString(16).padStart(2, '0')).join('');

test('eight floors, eight palettes, every text tint readable on every surface, at every strength', () => {
  assert.deepEqual(PALETTES.map((p) => p.name), FLOORS.map((f) => f.name));
  assert.equal(new Set(PALETTES.map((p) => p.texture)).size, 8, 'a texture each');
  const JOBS = { hot: '#ff5b3d', next: '#ffd85c', you: '#7fd1c7', daemon: '#c3a6ff', steel: '#86b6c6' };
  for (const p of PALETTES) for (const level of SFX.levels.slice(1)) {
    const v = varsOf(p, level);
    if (level === 'subtle') assert.deepEqual(v, p.vars, 'subtle keeps the palette\'s own panels');
    else assert.notEqual(v['--panel'], p.vars['--panel'], `${p.name}: the floor tints the panels at ${level}`);
    // The panels, the bg, and the bg with the floor's texture over it (its accent at 10%, more than any layer shows).
    const backs = [v['--bg'], v['--panel'], v['--panel-2'], mix(v['--bg'], v['--amber'], 0.1)];
    for (const tint of ['--text', '--bright', '--muted', '--dim', '--amber']) for (const b of backs) assert.ok(contrast(v[tint], b) >= 4.5, `${p.name} (${level}): ${tint} on ${b} is ${contrast(v[tint], b).toFixed(2)}`);
    for (const b of backs) assert.ok(contrast(v['--text'], b) >= 7, `${p.name}: body text`);
    // The job colours stay the same colours and stay readable.
    for (const [job, c] of Object.entries(JOBS)) for (const b of backs) assert.ok(contrast(c, b) >= 4.5, `${p.name}: ${job} on ${b}`);
  }
});

test('one setting: the old Effects setting folds into Screen effects (saves migrate, the command is an alias)', () => {
  const s = fresh();
  assert.equal(boardFxOf(s), 'calm', 'medium: calm on the board');
  for (const [old, level, board] of [['full', 'bold', 'full'], ['minimal', 'off', 'minimal'], ['calm', 'medium', 'calm']]) {
    const t = fresh();
    t.settings.effects = old;
    assert.equal(levelOf(t), level, `an unmigrated ${old} reads as ${level}`);
    assert.equal(migrateEffects(t), true);
    assert.equal(t.settings.screenFx, level);
    assert.equal('effects' in t.settings, false, 'the old setting is gone');
    assert.equal(boardFxOf(t), board);
    assert.equal(migrateEffects(t), false, 'once');
  }
  const kept = fresh();
  Object.assign(kept.settings, { effects: 'full', screenFx: 'subtle' });
  migrateEffects(kept);
  assert.equal(kept.settings.screenFx, 'subtle', 'a Screen effects level already chosen wins');
  assert.equal(screenFxCommand(s, 'effects full'), 'Screen effects: bold.');
  assert.equal(screenFxCommand(s, 'effects minimal'), 'Screen effects: off.');
  assert.equal(boardFxOf(s), 'minimal');
  assert.equal(screenFxCommand(s, 'effects'), 'Screen effects: subtle.', 'effects alone steps on');
  assert.equal(screenFxCommand(s, 'effects calm'), 'Screen effects: medium.');
  const view = readFileSync(new URL('./dist/view.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(view, /data-run="effects/, 'no separate Effects button');
});

test('your health on the screen\'s edge: warm under a half, Low Signal under a quarter, one look', () => {
  assert.deepEqual([warnOf(0.6), warnOf(0.49), warnOf(0.25), warnOf(0.2), warnOf(null)], [false, true, true, false, false]);
  const s = fresh();
  assert.deepEqual([screenState(s, { health: 0.4 }).warn, screenState(s, { health: 0.4 }).low], [true, false]);
  assert.deepEqual([screenState(s, { health: 0.1 }).warn, screenState(s, { health: 0.1 }).low], [false, true]);
  s.settings.screenFxOff = { signal: true };
  assert.deepEqual([screenState(s, { health: 0.1 }).warn, screenState(s, { health: 0.1 }).low], [false, false]);
  // The old red glow over the interface is gone; the edge lives only on the bezel.
  const style = readFileSync(new URL('./dist/style.css', import.meta.url), 'utf8');
  assert.doesNotMatch(style, /hp-crit|hp-warn/);
});

test('nothing on the interface moves: no screen shake, no nudge, no jolt that shifts a thing', () => {
  const style = readFileSync(new URL('./dist/style.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(style, /fx-nudge|fx-quake|fx-split|crt-glitch/, 'the screen shakes are gone');
  assert.doesNotMatch(app, /juice\.(nudge|quake)|nudge\(|quake\(/, 'and nothing calls them');
  // The flashes on the interface keep their light and lose their movement.
  for (const name of ['fx-hurt', 'fx-nope', 'fx-strike', 'fx-lashed', 'fx-jolt', 'fx-jolt-crit', 'fx-jolt-miss', 'pagerbuzz']) {
    const kf = style.match(new RegExp(`@keyframes ${name} \\{.*\\}`))?.[0];
    assert.ok(kf, name);
    assert.doesNotMatch(kf, /transform|translate|rotate/, `${name} doesn't move anything`);
  }
  assert.match(style, /\.virus-stage\.fx-punch canvas \{/, 'a punch moves the picture only');
});

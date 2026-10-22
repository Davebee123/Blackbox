// Ability effects on the fight board (dist/abilityfx.mjs): one table maps an ability to its effect, an ability with no
// row keeps the plain hit effect (hitfx.mjs), nothing plays at Screen effects off or with Motion off, the layer takes no
// input and is hidden from screen readers, and no piece of any effect is ever laid over a part's name line (its name,
// ◆ and Integrity), its tags or your label, at any point of its motion, on a roomy board or a dense one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RECIPES, MOTIONS, PARTICLES, keyOf, keyFor, recipeOf, idOfName, levelOf, countOf, layout, boxAt, keyAt, overlaps, rect, createAbilityFx } from './dist/abilityfx.mjs';
import { SPIKE, ABILITIES } from './dist/data.mjs';

const R = (s) => { const [l, t, w, h] = s.split(',').map(Number); return rect(l, t, w, h); };
// Two boards as the page measured them (layer pixels): a roomy two-part fight, and a dense three-part one with tags.
const roomy = () => {
  const you = { row: R('47,295,786,68'), cell: R('85,296,201,67'), now: R('286,296,134,67') };
  const parts = [
    { row: R('47,363,786,68'), cell: R('85,364,201,67'), name: R('91,383,189,21'), bar: R('91,408,189,5') },
    { row: R('47,431,786,68'), cell: R('85,432,201,67'), name: R('91,451,189,21'), bar: R('91,476,189,5') },
  ];
  return { you, parts, keep: [...parts.map((p) => p.name), R('91,320,28,18')] };
};
const dense = () => {
  const you = { row: R('47,295,786,86'), cell: R('85,296,201,85'), now: R('286,296,134,85') };
  const parts = [
    { row: R('47,381,786,84'), cell: R('85,382,201,83'), name: R('91,389,189,36'), bar: R('91,429,189,5'), tags: R('91,438,189,20') },
    { row: R('47,465,786,68'), cell: R('85,466,201,67'), name: R('91,485,189,21'), bar: R('91,510,189,5') },
    { row: R('47,533,786,69'), cell: R('85,534,201,68'), name: R('91,541,189,21'), bar: R('91,566,189,5'), tags: R('91,575,189,20') },
  ];
  return { you, parts, keep: [...parts.flatMap((p) => [p.name, p.tags].filter(Boolean)), R('91,328,28,20')] };
};
const pad = (q) => ({ l: q.l - 1, t: q.t - 1, r: q.r + 1, b: q.b + 1 });
const geoOf = (b, i) => ({ keep: b.keep.map(pad), first: b.parts[0].name, you: b.you, part: b.parts[i] });
const seeded = (n) => () => ((n = (n * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

const ev = (type, x = {}) => ({ id: 1, type, message: '', ...x });

test('the table resolves every starter ability: key 1 by its class\'s word, Inject (and its ticks), the big hits, Firewall on your side', () => {
  assert.deepEqual(Object.fromEntries(Object.keys(SPIKE).map((c) => [c, keyOf(ev('damage', { target: 'p', amount: 25, skill: 'spike' }), c)])), { breaker: 'bash', bastion: 'ban', infiltrator: 'poke', operator: 'ping' });
  const cases = [
    [ev('damage', { target: 'p', amount: 25, skill: 'spike' }), 'bastion', 'ban'],
    [ev('armor', { target: 'p', absorbed: true, ability: 'spike' }), 'bastion', 'ban'], // all of it on ◆: still the hammer
    [ev('status', { target: 'p', mark: 'burn', ability: 'inject' }), 'infiltrator', 'inject'],
    [ev('damage', { target: 'p', amount: 20, src: 'burn', via: 'Inject' }), 'infiltrator', 'inject:tick'],
    [ev('damage', { target: 'p', amount: 20, via: 'Inject (Surprise)', src: 'burn' }), 'infiltrator', 'inject:tick'],
    [ev('damage', { target: 'p', amount: 40, skill: 'overload' }), 'breaker', 'overload'],
    [ev('status', { mark: 'shield', ability: 'firewall' }), 'bastion', 'firewall'],
    [ev('status', { target: 'p', mark: 'helper', ability: 'deploy' }), 'operator', 'deploy'],
    [ev('damage', { target: 'p', amount: 90, via: 'Detonate' }), 'infiltrator', 'detonate'],
  ];
  for (const [e, cls, key] of cases) {
    assert.equal(keyOf(e, cls), key, JSON.stringify(e));
    assert.ok(recipeOf(key), key);
  }
  // Every row is complete: a known motion and particles, a piece where the motion needs one, timings in range.
  for (const [k, r] of Object.entries(RECIPES)) {
    assert.ok(MOTIONS[r.motion], `${k}: motion ${r.motion}`);
    for (const b of r.burst || []) assert.ok(PARTICLES[b.style], `${k}: ${b.style}`);
    if (['swing', 'punch', 'dart', 'wave'].includes(r.motion)) assert.ok(r.art?.length, `${k}: art`);
    if (['walk', 'blast'].includes(r.motion)) assert.ok(r.frames?.length > 1, `${k}: frames`);
    assert.ok(r.impact >= 0 && r.impact < r.dur, `${k}: it lands before it ends`);
    assert.ok(r.dur >= 380 && r.dur <= 1000, `${k}: short (${r.dur} ms)`);
    assert.ok(r.label, `${k}: a label`);
    const id = k.split(':')[0];
    assert.ok(ABILITIES[id] || Object.values(SPIKE).some((s) => s.word === id), `${k} is an ability (or key 1's word)`);
  }
  assert.equal(RECIPES.inject.dur, 1000, 'Inject burns for about a second');
  assert.equal(RECIPES.firewall.on, 'you', 'a shield plays on your side');
});

test('an ability with no row falls back to the plain hit effect; events that are no ability have no key', () => {
  assert.equal(recipeOf(keyOf(ev('damage', { target: 'p', amount: 52, skill: 'rate-limit' }), 'bastion')), null);
  assert.equal(recipeOf(keyOf(ev('damage', { target: 'p', amount: 8, src: 'burn', via: 'Purge' }), 'bastion')), null);
  assert.equal(recipeOf(keyOf(ev('damage', { target: 'p', amount: 8, src: 'burn', via: 'Keepalive (Inject)' }), 'infiltrator')), null);
  assert.equal(keyOf(ev('damage', { target: 'p', amount: 12, src: 'helper', via: 'Helper' }), 'operator'), null);
  assert.equal(keyOf(ev('server-hit', { amount: 10, source: 'p' }), 'bastion'), null);
  assert.equal(keyOf(ev('status', { target: 'p', mark: 'tagged', ability: 'tag' }), 'infiltrator'), null);
  assert.equal(keyFor('spike', 'nobody'), null, 'key 1 of an unknown class: no row');
  assert.equal(recipeOf('constructor'), null, 'only the table\'s own rows');
  assert.equal(idOfName('Inject (Surprise)'), 'inject');
  // app.js plays the strike for every hit the table doesn't take, and when an effect can't play.
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.match(app, /fxKey\.has\(key\) && abilityStrike\(fxKey\.get\(key\), e, \{ result, delay: delayOf\(e\), fallback: strike \}\)\) continue;\n\s+pendingStrikes\.push\(\(\) => later\(delayOf\(e\), strike\)\);/);
  // A narrow board (no lane beside the name cell): no layout, so the plain hit effect plays.
  const g = geoOf(roomy(), 0);
  g.part = { ...g.part, row: { ...g.part.row, r: g.part.cell.r + 40 } };
  assert.equal(layout(RECIPES.ban, g), null);
});

test('Screen effects off or Motion off: nothing; subtle and medium: lighter than bold; bigger hits and crits throw more', () => {
  assert.equal(levelOf({ level: 'minimal', motion: true }), null);
  assert.equal(levelOf({ level: 'full', motion: false }), null);
  assert.equal(levelOf({ level: 'calm', motion: false }), null);
  assert.equal(levelOf({ level: 'calm' }), 'calm');
  assert.equal(levelOf({ level: 'full' }), 'full');
  const g = geoOf(roomy(), 0);
  for (const r of Object.values(RECIPES)) assert.equal(layout(r, g, { lvl: null }), null);
  const b = { n: 10, per: 10 }, flourish = { n: 1, full: true };
  assert.ok(countOf(b, { lvl: 'calm' }) < countOf(b, { lvl: 'full' }));
  assert.equal(countOf(flourish, { lvl: 'calm' }), 0, 'no flourishes on calm');
  assert.equal(countOf(b, { lvl: null }), 0);
  assert.ok(countOf(b, { power: 0.9 }) > countOf(b, { power: 0.1 }));
  assert.ok(countOf(b, { crit: true }) > countOf(b));
  for (const [k, r] of Object.entries(RECIPES)) {
    const full = layout(r, g, { lvl: 'full', rnd: seeded(3) }).els.length, calm = layout(r, g, { lvl: 'calm', rnd: seeded(3) }).els.length;
    assert.ok(calm < full, `${k}: calm ${calm} < full ${full}`);
  }
  // On the page: Motion off or effects off plays nothing and puts nothing on the layer.
  for (const [motion, level] of [[false, 'full'], [true, 'minimal']]) {
    const { fx, layer, row } = fakePage({ motion, level });
    assert.equal(fx.play('ban', row), false);
    assert.equal(fx.play('firewall', null), false);
    assert.equal(layer.children.length, 0);
  }
  const { fx, layer, row } = fakePage({ motion: true, level: 'full' });
  assert.equal(fx.play('ban', row), true);
  assert.ok(layer.children.length > 3);
  assert.equal(fx.play('rate-limit', row), false, 'no row: no effect (app.js strikes instead)');
});

test('the layer is hidden from screen readers and takes no input; its pieces have no background', () => {
  const { layer } = fakePage({});
  assert.equal(layer.id, 'abilityfx');
  assert.equal(layer.attrs['aria-hidden'], 'true');
  const css = readFileSync(new URL('./dist/style.css', import.meta.url), 'utf8');
  assert.match(css, /#abilityfx \{[^}]*pointer-events: none/);
  assert.match(css, /\.afx \{[^}]*pointer-events: none/);
  assert.match(css, /\.no-motion #abilityfx \{ display: none; \}/);
  for (const rule of css.match(/\.afx[^{]*\{[^}]*\}/g)) assert.doesNotMatch(rule, /background|backdrop|filter|mix-blend/, rule);
  // Teal is yours; a crewmate's violet, a hit on ◆ steel (docs/ui.md).
  assert.match(css, /\.afx \{[^}]*color: var\(--you\)/);
  assert.match(css, /\.afx\.crew \{[^}]*var\(--daemon\)/);
  assert.match(css, /\.afx\.chit \{[^}]*var\(--steel\)/);
  // The board itself is never touched: the module only writes to its own layer.
  const src = readFileSync(new URL('./dist/abilityfx.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /board\.(classList|style)|row\.(classList|style)|canvas|PIXI/i);
});

test('no piece of any effect is laid over a part\'s name line, its tags or your label, at any point of its motion', () => {
  let checked = 0;
  for (const [name, board] of [['roomy', roomy()], ['dense', dense()]]) {
    for (let i = 0; i < board.parts.length; i++) {
      const g = geoOf(board, i);
      for (const [k, r] of Object.entries(RECIPES)) {
        for (const lvl of ['full', 'calm']) for (const opt of [{}, { crit: true, power: 1, result: 'crit' }, { result: 'chit', power: 0 }, { kind: 'crew' }]) for (const seed of [1, 7, 42]) {
          const plan = layout(r, g, { lvl, rnd: seeded(seed), ...opt });
          assert.ok(plan?.els.length, `${name} ${k}`);
          for (const el of plan.els) {
            for (let s = 0; s <= 40; s++) {
              const key = keyAt(el, s / 40);
              if (!(key.o > 0.02)) continue;
              const box = boxAt(el, key), hit = board.keep.find((q) => overlaps(box, q));
              assert.ok(!hit, `${name} part ${i} ${k} ${lvl} ${el.cls} "${el.text}" at ${s / 40}: ${JSON.stringify(box)} over ${JSON.stringify(hit)}`);
              checked++;
            }
          }
        }
      }
    }
  }
  assert.ok(checked > 10000, `checked ${checked} points`);
});

test('effects land on time: the piece arrives at impact, short pieces, teal unless a crit, a hit on ◆ or a crewmate', () => {
  const g = geoOf(roomy(), 1);
  for (const [k, r] of Object.entries(RECIPES)) {
    const plan = layout(r, g, { rnd: seeded(5) });
    assert.equal(plan.impact, r.impact, k);
    assert.ok(plan.dur <= 1100, `${k}: ${plan.dur} ms`);
    for (const el of plan.els) assert.ok(el.delay + el.dur <= plan.dur + 1, k);
  }
  const crit = layout(RECIPES.ban, g, { crit: true, result: 'crit', rnd: seeded(5) }), mate = layout(RECIPES.ban, g, { kind: 'crew', rnd: seeded(5) }), chit = layout(RECIPES.ban, g, { result: 'chit', rnd: seeded(5) });
  assert.ok(crit.els.every((e) => /\bcrit\b/.test(e.cls)));
  assert.ok(mate.els.every((e) => /\bcrew\b/.test(e.cls)));
  assert.ok(chit.els.some((e) => /\bchit\b/.test(e.cls)) && !/\bchit\b/.test(chit.els[0].cls), 'the shock off ◆ is steel, the hammer stays yours');
  // Ban's hammer comes down onto the part's bar line, beside its name cell.
  const hammer = layout(RECIPES.ban, g, { rnd: seeded(5) }).els[0], end = boxAt(hammer, keyAt(hammer, r0(RECIPES.ban)));
  assert.ok(Math.abs(end.b - (g.part.bar.t + g.part.bar.b) / 2) < 4 && end.l >= g.part.cell.r, JSON.stringify(end));
  // Firewall stands between your row and the first part.
  const wall = layout(RECIPES.firewall, g, { rnd: seeded(5) }).els.filter((e) => /wall/.test(e.cls));
  for (const w of wall) { const b = boxAt(w, keyAt(w, 0.5)); assert.ok(b.b <= g.first.t && b.t >= g.you.row.t, JSON.stringify(b)); }
});
const r0 = (r) => r.impact / r.dur;

// A page just big enough for createAbilityFx: a board, its rows, and elements that remember what's put on them.
function fakePage({ motion = true, level = 'full' }) {
  const el = (tag, box = rect(0, 0, 0, 0)) => ({
    tag, children: [], attrs: {}, style: {}, className: '', textContent: '', isConnected: true, box,
    setAttribute(k, v) { this.attrs[k] = String(v); }, appendChild(c) { this.children.push(c); c.parent = this; return c; },
    remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); },
    getBoundingClientRect() { const b = this.box; return { left: b.l, top: b.t, width: b.r - b.l, height: b.b - b.t, right: b.r, bottom: b.b }; },
    animate() { return {}; }, sel: {}, querySelector(s) { return this.sel[s] || null; }, querySelectorAll(s) { return this.all?.[s] || []; },
  });
  const b = roomy();
  const board = el('div', rect(0, 0, 800, 480));
  board.offsetWidth = 800; board.offsetHeight = 480; board.offsetLeft = 0; board.offsetTop = 0;
  board.parentElement = el('section');
  const you = el('div', b.you.row);
  you.sel = { '.bname': el('div', b.you.cell), '.bcell:nth-child(2)': el('div', b.you.now), '.bname b': el('b', b.keep[b.keep.length - 1]) };
  const rows = b.parts.map((p) => { const r = el('button', p.row); r.sel = { '.bname': el('div', p.cell), '.part-top': el('span', p.name), '.part-bar': el('span', p.bar) }; return r; });
  board.sel = { '.brow.byou': you };
  board.all = { '.bpart': rows };
  globalThis.document = { createElement: (t) => el(t) };
  globalThis.setTimeout ??= setTimeout;
  const fx = createAbilityFx(board, { canMove: () => motion, level: () => level });
  const layer = board.parentElement.children[0];
  Object.defineProperty(layer, 'getBoundingClientRect', { value: () => ({ left: 0, top: 0, width: 800, height: 480 }) });
  return { fx, layer, row: rows[0] };
}

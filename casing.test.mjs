// Casing cosmetics (dist/casing.mjs, dist/casing-view.mjs, dist/casing.css): colourways, the plate and stickers on
// the monitor's casing, each from an achievement. Only ever the bezel: never an element or a rule on the screen, and
// the stock casing is today's exactly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, restore } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { FACTION_IDS } from './dist/factions.mjs';
import { achievements, earned, tickAchievements, developerAchieve } from './dist/achievements.mjs';
import { CASING, COLORWAYS, COLORWAY_IDS, casingLook, decalStrips, decalsOwned, cosmeticsOf, colorwayOpen, colorwayFrom } from './dist/casing.mjs';
import { casingPageMarkup } from './dist/casing-view.mjs';
import { systemMarkup } from './dist/view.mjs';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const me = () => { const s = fresh(); s.tutorialCompleted = true; s.profile = { handle: 'dana' }; s.hackers = { breaker: { level: 12, xp: 0 } }; return s; };
const warned = (out) => out.some((e) => e.type === 'warning');

test('the stock casing is today\'s: no colourway, BLACKBOX · MODEL 7, no stickers, and style.css falls back to the old colours', () => {
  for (const s of [fresh(), restore(JSON.parse(JSON.stringify(fresh()))), me()]) {
    assert.deepEqual(casingLook(s), { color: null, plate: 'BLACKBOX · MODEL 7', decals: [null, null, null, null] });
    assert.deepEqual(decalStrips(s), { left: '', right: '' });
  }
  const html = read('./dist/index.html');
  assert.match(html, /<div class="badge" aria-hidden="true">BLACKBOX · MODEL 7<\/div>/, 'the plate ships as it was');
  assert.match(html, /<div class="decals l"><\/div><div class="badge" aria-hidden="true">BLACKBOX · MODEL 7<\/div><div class="decals r"><\/div>/, 'the sticker strips ship empty, either side of the plate');
  // Every colour the casing reads is a variable whose fallback is the colour it always had.
  const css = strip(read('./dist/style.css'));
  for (const [v, was] of [['--case-hi', '#2a2724'], ['--case-mid', '#181614'], ['--case-lo', '#0e0d0c'], ['--case-rim', '#0b0a09'], ['--case-ink', '#5b554d'], ['--case-badge', '#6b655c'], ['--case-knob-hi', '#3a3632'], ['--case-knob-lo', '#151312'], ['--case-win', '#0b0a09'], ['--case-ink-on', '#8a8378']]) assert.ok(css.includes(`var(${v}, ${was})`), `${v} falls back to ${was}`);
  // casing.css sets them only for a colourway: nothing on a stock body.
  for (const m of strip(read('./dist/casing.css')).matchAll(/([^{}]+)\{([^}]*--case-[\w-]+:[^}]*)\}/g)) assert.match(m[1].trim(), /^\[data-case="\w+"\]$/, `${m[1].trim()} sets casing colours only for a colourway`);
});

test('nothing goes on the screen: every casing rule and element is on the bezel', () => {
  // The strips live in #casing (the chin, outside the screen), never in .app.
  const html = read('./dist/index.html');
  const casing = html.slice(html.indexOf('<div id="casing">'), html.indexOf('<!-- finger <handle>'));
  assert.match(casing, /class="decals l"/); assert.match(casing, /class="decals r"/);
  const app = html.slice(html.indexOf('<div class="app"'), html.indexOf('<div id="casing">'));
  assert.ok(!/decal|cs-|data-case/.test(app), 'no casing element in the app');
  // casing.css: each rule is a colourway's variables, the body's plastic, the chin (#casing) or System → Casing's page.
  const css = strip(read('./dist/casing.css')).replace(/@media \(min-width: 1100px\) and \(min-height: 720px\) \{/g, ''); // the casing's own media query (style.css): rules inside it are checked like the rest
  for (const m of css.matchAll(/([^{}]+)\{[^}]*\}/g)) {
    for (const sel of m[1].split(',').map((x) => x.trim()).filter(Boolean)) {
      assert.ok(/^\[data-case="\w+"\]$/.test(sel) || /^body\.cased\[data-case(="\w+")?\](::after| #casing( \.[\w-]+)*)?$/.test(sel) || /^#casing\b/.test(sel) || /^\.cs-/.test(sel), `${sel} is on the casing or its page`);
      assert.ok(!/\.app|#crt|\.workspace|\.topbar|#fx-|\.page|\.board|\.lamp|\.knob/.test(sel.replace(/^\.cs-page/, '')), `${sel} never styles the screen, the lamps or the knobs`);
    }
  }
  // A colourway changes the plastic and its print only: no job colour, no screen token.
  for (const m of css.matchAll(/\[data-case="\w+"\] \{([^}]*)\}/g)) for (const v of m[1].matchAll(/(--[\w-]+):/g)) assert.match(v[1], /^--case-/, `${v[1]}: a casing variable`);
  // The strips sit inside the chin, one row tall, and clip a sticker that doesn't fit (never onto the plate).
  assert.match(css, /#casing \.decals \{[^}]*position: absolute;[^}]*overflow: hidden;/);
  // The one fixed box is a colourway's plastic: the bezel's frame, behind the page, with the glass cut out of it exactly.
  const fixed = [...css.matchAll(/([^{}]+)\{([^}]*position: fixed[^}]*)\}/g)];
  assert.equal(fixed.length, 1);
  assert.match(fixed[0][1].trim(), /^body\.cased\[data-case\]::after$/);
  for (const bit of ['z-index: -1', 'pointer-events: none', 'top: calc(var(--top) - 14px)', 'bottom: calc(var(--desk) + 8px)', 'left: calc(var(--side) - 18px)', 'padding: 14px 18px calc(var(--chin) - 8px)', 'mask: linear-gradient(#000 0 0) content-box exclude']) assert.ok(fixed[0][2].includes(bit), bit);
  // ...whose cut-out is the screen's own box (style.css: the screen sits at --top, --side and --chin + --desk).
  assert.match(strip(read('./dist/style.css')), /body\.cased \{[^}]*padding: var\(--top\) var\(--side\) calc\(var\(--chin\) \+ var\(--desk\)\);/);
  // app.js draws the stickers into the chin's strips only.
  const js = read('./dist/app.js');
  assert.match(js, /#casing \.decals\.l/);
  assert.ok(!/\.app[^\n]*decalStrips|decalStrips[^\n]*\.app/.test(js));
});

test('colourways: stock, beige, matte, smoked and one a faction, each from an achievement (a faction\'s at its top tier)', () => {
  assert.deepEqual(COLORWAY_IDS, ['stock', 'beige', 'matte', 'smoked', ...FACTION_IDS]);
  for (const id of COLORWAY_IDS.slice(1)) assert.ok(colorwayFrom(id), `${id} comes with an achievement`);
  for (const f of FACTION_IDS) assert.equal(colorwayFrom(f).id, 'f-' + f);
  const s = me();
  assert.ok(warned(play(s, 'casing color beige')), 'locked until earned');
  assert.equal(cosmeticsOf(s).case, 'stock');
  s.dex.kills = { worm: 100 };
  tickAchievements(s);
  assert.ok(earned(s, 'c-win-100') && colorwayOpen(s, 'beige'));
  play(s, 'casing color beige');
  assert.equal(casingLook(s).color, 'beige');
  s.standing = { lantern: 80 };
  tickAchievements(s);
  play(s, 'casing color lantern copper');
  assert.equal(casingLook(s).color, 'lantern');
  s.standing = { lantern: 20 };
  assert.equal(casingLook(s).color, 'lantern', 'kept for good: standing that drops takes nothing back');
  play(s, 'casing color stock');
  assert.equal(casingLook(s).color, null);
});

test('the plate: stock, MODEL 7 and a title you hold, or 16 plain characters of your own', () => {
  const s = me();
  play(s, 'casing plate night shift');
  assert.equal(casingLook(s).plate, 'NIGHT SHIFT');
  assert.ok(warned(play(s, 'casing plate ' + 'x'.repeat(CASING.plate + 1))));
  assert.ok(warned(play(s, 'casing plate héllo')));
  assert.equal(casingLook(s).plate, 'NIGHT SHIFT', 'a bad plate changes nothing');
  assert.ok(warned(play(s, 'casing plate title uncrowner')), 'only a title you hold');
  s.dex.won = { relayking: 1 };
  tickAchievements(s);
  play(s, 'casing plate title uncrowner');
  assert.equal(casingLook(s).plate, 'MODEL 7 · UNCROWNER');
  play(s, 'casing plate stock');
  assert.equal(casingLook(s).plate, 'BLACKBOX · MODEL 7');
});

test('stickers: four slots, only ones you\'ve earned, one place each, drawn as decals in their colours', () => {
  const s = me();
  assert.ok(warned(play(s, 'casing sticker 1 f2')), 'none earned yet');
  s.floors.reached = 3;
  s.dex.won = { 'nb-deadbolt': 1 };
  tickAchievements(s);
  assert.deepEqual(decalsOwned(s).map((x) => x.id).sort(), ['floor-2', 'floor-3', 'lair-nb-deadbolt']);
  play(s, 'casing sticker 1 f2');
  play(s, 'casing sticker 3 deadbolt');
  assert.ok(warned(play(s, 'casing sticker 5 f3')), 'four slots');
  let L = casingLook(s).decals;
  assert.deepEqual(L.map((x) => x?.id || null), ['floor-2', null, 'lair-nb-deadbolt', null]);
  play(s, 'casing sticker 2 f2');
  L = casingLook(s).decals;
  assert.deepEqual(L.map((x) => x?.id || null), [null, 'floor-2', 'lair-nb-deadbolt', null], 'moved, not copied');
  const strips = decalStrips(s);
  assert.match(strips.left, /class="decal k-floor" style="--sc:#9aa7b4"[^>]*>.*F2<\/span>/);
  assert.match(strips.right, /DEADBOLT/);
  play(s, 'casing sticker 3 off');
  assert.equal(decalStrips(s).right, '');
});

test('System → Casing: the swatches (locked with their achievement), the plate and the chin\'s slots; a view never writes the save', () => {
  const s = me(), snap = JSON.stringify(s);
  const html = casingPageMarkup(s, { slot: 1 });
  assert.equal(JSON.stringify(s), snap);
  assert.match(html, /class="cs-sw" data-case="stock" data-run="casing color stock" aria-pressed="true"/);
  assert.match(html, /class="cs-sw locked" data-case="beige" title="Beige box: [^"]*Comes with Process Killer\."/);
  assert.match(html, /data-cs-slot="1" aria-pressed="true"/);
  assert.match(html, /None yet/);
  assert.match(systemMarkup(s), /data-stab="casing"/, 'a tab on the System page');
  assert.match(systemMarkup(s, { tab: 'casing' }), /cs-page/);
  developerAchieve(s, 'all');
  const all = casingPageMarkup(s, {});
  assert.ok(!all.includes('cs-sw locked'), 'every colourway open');
  assert.ok(achievements().filter((a) => a.reward?.casing).length === COLORWAY_IDS.length - 1);
  for (const id of COLORWAY_IDS) assert.ok(COLORWAYS[id].name && COLORWAYS[id].tip.endsWith('.'), id);
});

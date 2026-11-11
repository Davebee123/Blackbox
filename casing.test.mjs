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
import { CASING, COLORWAYS, COLORWAY_IDS, casingLook, decalMarkup, decalsOwned, cosmeticsOf, colorwayOpen, colorwayFrom, stickerSpot, stickerAt, propSpot, propAt, placeSticker, placeProp, FRAME, SIDES } from './dist/casing.mjs';
import { casingPageMarkup } from './dist/casing-view.mjs';
import { rigMarkup } from './dist/view.mjs';
import { DISTRICT_IDS, DISTRICTS } from './dist/window.mjs';
import { districtOf, districtOpen, districtFrom, PROPS, PROP_IDS, PROP_BOX, propsLook, propsOwned, propOpen, propFrom, propMarkup } from './dist/casing.mjs';
import { DECOR_REWARDS, rewardText } from './dist/achievements.mjs';
import { achRow } from './dist/achievements-view.mjs';
import { districtCardMarkup } from './dist/casing-view.mjs';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const me = () => { const s = fresh(); s.tutorialCompleted = true; s.profile = { handle: 'dana' }; s.hackers = { breaker: { level: 12, xp: 0 } }; return s; };
const warned = (out) => out.some((e) => e.type === 'warning');

test('the stock casing is today\'s: no colourway, BLACKBOX · MODEL 7, no stickers, and style.css falls back to the old colours', () => {
  for (const s of [fresh(), restore(JSON.parse(JSON.stringify(fresh()))), me()]) {
    assert.deepEqual(casingLook(s), { color: null, plate: 'BLACKBOX · MODEL 7', decals: [] });
  }
  const html = read('./dist/index.html');
  assert.match(html, /<div class="badge" aria-hidden="true">BLACKBOX · MODEL 7<\/div>/, 'the plate ships as it was');
  assert.match(html, /<div class="decals"><\/div>\n  <div class="props" aria-hidden="true"><\/div>\n<\/div>/, 'the casing ships with no sticker and no prop on it');
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
  assert.match(casing, /class="decals"/);
  const app = html.slice(html.indexOf('<div class="app"'), html.indexOf('<div id="casing">'));
  assert.ok(!/decal|cs-|data-case/.test(app), 'no casing element in the app');
  // casing.css: each rule is a colourway's variables, the body's plastic, the chin (#casing) or Rig → Casing's page.
  // the casing's own media query (style.css) and the reduced-motion one (the mug's steam): rules inside them are checked
  // like the rest; the steam's keyframes are its own (only #casing .prop .steam runs them)
  const css = strip(read('./dist/casing.css')).replace(/@media \(min-width: 1100px\) and \(min-height: 720px\) \{|@media \(prefers-reduced-motion: reduce\) \{/g, '').replace(/@keyframes cs-steam \{(?:[^{}]*\{[^}]*\})*\s*\}/g, '');
  for (const m of css.matchAll(/([^{}]+)\{[^}]*\}/g)) {
    for (const sel of m[1].split(',').map((x) => x.trim()).filter(Boolean)) {
      assert.ok(/^\[data-case="\w+"\]$/.test(sel) || /^body\.cased\[data-case(="\w+")?\](::after| #casing( \.[\w-]+)*)?$/.test(sel) || /^(\.no-motion )?#casing\b/.test(sel) || /^\.cs-/.test(sel), `${sel} is on the casing or its page`);
      assert.ok(!/\.app|#crt|\.workspace|\.topbar|#fx-|\.page|\.board|\.lamp|\.knob/.test(sel.replace(/^\.cs-page/, '')), `${sel} never styles the screen, the lamps or the knobs`);
    }
  }
  // A colourway changes the plastic and its print only: no job colour, no screen token.
  for (const m of css.matchAll(/\[data-case="\w+"\] \{([^}]*)\}/g)) for (const v of m[1].matchAll(/(--[\w-]+):/g)) assert.match(v[1], /^--case-/, `${v[1]}: a casing variable`);
  // The stickers' layer is the casing's own, and never takes a click meant for the screen.
  assert.match(css, /#casing \.decals \{ position: absolute; inset: 0; pointer-events: none; \}/);
  // The one fixed box is a colourway's plastic: the bezel's frame, behind the page, with the glass cut out of it exactly.
  const fixed = [...css.matchAll(/([^{}]+)\{([^}]*position: fixed[^}]*)\}/g)];
  assert.equal(fixed.length, 1);
  assert.match(fixed[0][1].trim(), /^body\.cased\[data-case\]::after$/);
  for (const bit of ['z-index: -1', 'pointer-events: none', 'top: calc(var(--top) - 14px)', 'bottom: calc(var(--desk) + 8px)', 'left: calc(var(--side) - 18px)', 'padding: 14px 18px calc(var(--chin) - 8px)', 'mask: linear-gradient(#000 0 0) content-box exclude']) assert.ok(fixed[0][2].includes(bit), bit);
  // ...whose cut-out is the screen's own box (style.css: the screen sits at --top, --side and --chin + --desk).
  assert.match(strip(read('./dist/style.css')), /body\.cased \{[^}]*padding: var\(--top\) var\(--side\) calc\(var\(--chin\) \+ var\(--desk\)\);/);
  // app.js draws the stickers into the casing only, each where stickerSpot puts it, and drags them only on Rig → Casing.
  const js = read('./dist/app.js');
  assert.match(js, /const DC = host\.querySelector\('\.decals'\)/);
  assert.match(js, /casePut\(el, stickerSpot\(caseM, caseKeep, look\.decals\[i\], caseSize\(el\)\)\)/);
  assert.match(js, /host\.classList\.toggle\('edit', cased && module === 'rig' && rigTab === 'casing'\)/);
  assert.match(js, /if \(!el \|\| !caseM \|\| !\$\('casing'\)\.classList\.contains\('edit'\)\) return;/);
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

test('stickers: any you\'ve earned, as many as you like, each on a side of the casing, one place each, the last on top', () => {
  const s = me();
  assert.ok(warned(play(s, 'casing sticker f2')), 'none earned yet');
  assert.equal(placeSticker(s, 'floor-2', { side: 'top', u: 0.5 }), false, 'nor by a drag');
  s.floors.reached = 3;
  s.dex.won = { 'nb-deadbolt': 1 };
  tickAchievements(s);
  assert.deepEqual(decalsOwned(s).map((x) => x.id).sort(), ['floor-2', 'floor-3', 'lair-nb-deadbolt']);
  play(s, 'casing sticker f2');
  play(s, 'casing sticker deadbolt left 30');
  play(s, 'casing sticker f3 top 80');
  let L = casingLook(s).decals;
  assert.deepEqual(L.map((x) => [x.id, x.side, x.u]), [['floor-2', 'chin', 0.22], ['lair-nb-deadbolt', 'left', 0.3], ['floor-3', 'top', 0.8]], 'no cap: every one you own');
  play(s, 'casing sticker f2 right 10');
  L = casingLook(s).decals;
  assert.deepEqual(L.map((x) => [x.id, x.side]), [['lair-nb-deadbolt', 'left'], ['floor-3', 'top'], ['floor-2', 'right']], 'moved, not copied, and on top');
  assert.ok(placeSticker(s, 'floor-3', { side: 'chin', u: 0.5, v: 2 }));
  assert.deepEqual(s.cosmetics.stickers.at(-1), { id: 'floor-3', side: 'chin', u: 0.5, v: 1 }, 'a drag saves the place, kept in range');
  assert.match(decalMarkup(L[2]), /^<span class="decal k-floor" style="--sc:#9aa7b4" data-sticker="floor-2"[^>]*>.*F2<\/span>$/);
  play(s, 'casing sticker deadbolt off');
  assert.deepEqual(casingLook(s).decals.map((x) => x.id), ['floor-2', 'floor-3']);
  play(s, 'casing sticker off');
  assert.deepEqual(casingLook(s).decals, []);
  assert.ok(warned(play(s, 'casing sticker nothing top')));
});

test('an older save\'s four chin slots and two desk spots become places, once, and a view never converts them', () => {
  const s = me();
  s.floors.reached = 3; s.achievements = { flags: { 't-untouched': 1 } };
  tickAchievements(s);
  s.cosmetics = { decals: ['floor-2', null, 'floor-3', 'not-mine'], props: [null, 'cactus'] };
  const snap = JSON.stringify(s);
  assert.deepEqual(casingLook(s).decals.map((x) => [x.id, x.side, x.u, x.v]), [['floor-2', 'chin', 0.2, 0.5], ['floor-3', 'chin', 0.68, 0.5]]);
  assert.deepEqual(propsLook(s).map((p) => [p.id, p.on, p.u]), [['cactus', 'desk', 0.79]]);
  casingPageMarkup(s);
  assert.equal(JSON.stringify(s), snap, 'reading leaves the save alone');
  const C = cosmeticsOf(s), once = JSON.stringify(C);
  assert.equal(C.decals, undefined);
  assert.deepEqual(C.stickers.map((x) => x.id), ['floor-2', 'floor-3', 'not-mine']);
  assert.deepEqual(C.props, [{ id: 'cactus', on: 'desk', u: 0.79 }]);
  assert.equal(JSON.stringify(cosmeticsOf(s)), once, 'safe to run twice');
  assert.deepEqual(casingLook(restore(JSON.parse(JSON.stringify(s)))).decals.map((x) => x.id), ['floor-2', 'floor-3'], 'and it survives a save');
});

// The page at a size: the screen's margins as style.css sets them, and the chin's knobs, plate and lamps.
const R = (x, y, w, h) => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y });
const hits = (a, b) => a.left < b.right - 0.01 && b.left < a.right - 0.01 && a.top < b.bottom - 0.01 && b.top < a.bottom - 0.01;
function* pages() {
  for (const [W, H] of [[1100, 720], [1280, 800], [1440, 900], [1700, 900], [1920, 1080], [2560, 1440], [3840, 2160]]) for (const win of [false, true]) for (const plateW of [234, 330]) {
    const wide = win && W >= 1700, desk = wide && H >= 860 ? (H >= 1000 ? 34 : 30) : 0, side = wide ? Math.max(48, W * 0.035) : Math.max(26, W * 0.012), top = wide && H >= 860 ? (H >= 1000 ? 56 : 46) : 22;
    const m = { W, H, top, side, chin: 52, desk, win: wide }, box = R(side + 20, H - desk - 52, W - 2 * (side + 20), 52);
    const knobs = R(box.left, box.top + 17, 46, 18), lamps = R(box.right - 300, box.top + 20, 300, 12), plate = R(W / 2 - plateW / 2, box.top + 19, plateW, 14);
    yield { m, box, keep: [knobs, plate, lamps], screen: R(side, top, W - 2 * side, H - top - 52 - desk), name: `${W}×${H}${wide ? ' window' : ''}` };
  }
}

test('a sticker sits wholly on the plastic wherever it is dropped: never on the screen, the knobs, the plate or the lamps', () => {
  for (const { m, keep, screen, name } of pages()) for (const size of [{ w: 44, h: 16 }, { w: 128, h: 16 }]) {
    for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) {
      const px = (m.W * i) / 20, py = (m.H * j) / 20, at = stickerAt(m, px, py, size), p = stickerSpot(m, keep, { id: 'floor-2', ...at }, size);
      assert.ok(SIDES.includes(at.side) && at.u >= 0 && at.u <= 1 && at.v >= 0 && at.v <= 1);
      const box = R(p.cx - p.bw / 2, p.cy - p.bh / 2, p.bw, p.bh);
      assert.ok(!hits(box, screen), `${name}: dropped at ${px},${py}, clear of the screen`);
      for (const k of keep) assert.ok(!hits(box, k), `${name}: dropped at ${px},${py} on the ${at.side}, clear of the knobs, the plate and the lamps`);
      assert.ok(box.left >= screen.left - FRAME.s - 0.01 && box.right <= screen.right + FRAME.s + 0.01 && box.top >= screen.top - FRAME.t - 0.01 && box.bottom <= m.H - m.desk, `${name}: on the casing`);
      if (at.side === 'left' || at.side === 'right') assert.equal(Math.abs(p.rot), 90, 'it reads upward on a side'); else if (at.side === 'top') assert.equal(p.rot, 0, 'flat on the top');
    }
    // a drop on the glass takes the nearest side
    assert.equal(stickerAt(m, m.W / 2, screen.top + 30, size).side, 'top');
    assert.equal(stickerAt(m, screen.left + 30, m.H / 2, size).side, 'left');
    assert.equal(stickerAt(m, m.W / 2, screen.bottom - 30, size).side, 'chin');
  }
});

test('Rig → Casing: the swatches (locked with their achievement), the plate and your stickers; a view never writes the save', () => {
  const s = me(), snap = JSON.stringify(s);
  const html = casingPageMarkup(s);
  assert.equal(JSON.stringify(s), snap);
  assert.match(html, /class="cs-sw" data-case="stock" data-run="casing color stock" aria-pressed="true"/);
  assert.match(html, /class="cs-sw locked" data-case="beige" title="Beige box: [^"]*Comes with Process Killer\."/);
  assert.match(html, /None yet/);
  assert.match(rigMarkup(s), /data-rtab="casing"/, 'a tab on the Rig page');
  assert.match(rigMarkup(s, { tab: 'casing' }), /cs-page/);
  developerAchieve(s, 'all');
  const all = casingPageMarkup(s);
  assert.ok(!all.includes('cs-sw locked'), 'every colourway open');
  const mine = decalsOwned(s);
  assert.match(all, new RegExp(`class="cs-decal" data-run="casing sticker ${mine[0].id}" aria-pressed="false"`));
  play(s, `casing sticker ${mine[0].id}`);
  assert.match(casingPageMarkup(s), new RegExp(`class="cs-decal" data-run="casing sticker ${mine[0].id} off" aria-pressed="true"`), 'a click puts it on, another takes it off');
  for (const x of mine) play(s, `casing sticker ${x.id}`);
  assert.equal(casingLook(s).decals.length, mine.length, 'all of them at once');
  assert.ok(achievements().filter((a) => a.reward?.casing).length === COLORWAY_IDS.length - 1);
  for (const id of COLORWAY_IDS) assert.ok(COLORWAYS[id].name && COLORWAYS[id].tip.endsWith('.'), id);
});

// ---------- the window's districts and the desk's props ----------
test('defaults unchanged: the Sprawl out the window and a bare desk, for a new game and an older save', () => {
  for (const s of [fresh(), restore(JSON.parse(JSON.stringify(fresh()))), me()]) {
    assert.equal(districtOf(s), 'sprawl');
    assert.deepEqual(propsLook(s), []);
    assert.deepEqual(propsOwned(s), []);
  }
  assert.ok(districtOpen(fresh(), 'sprawl'), 'the Sprawl is always open');
  assert.match(read('./dist/index.html'), /<div class="props" aria-hidden="true"><\/div>\n<\/div>/, 'the desk ships bare, in the casing');
});

test('districts: each from its achievement (a separate block of rewards), locked ones refused, kept for good', () => {
  assert.deepEqual(DISTRICT_IDS.slice(1).map((id) => districtFrom(id)?.id), ['x-floor-2', 'x-mapper', 'f-lantern', 'c-crowns']);
  assert.equal(districtFrom('sprawl'), null);
  for (const [id, r] of Object.entries(DECOR_REWARDS)) assert.ok(achievements().find((a) => a.id === id)?.reward?.[r.district ? 'district' : 'prop'], `${id} carries its reward`);
  const s = me();
  for (const id of DISTRICT_IDS.slice(1)) {
    const out = play(s, `district ${DISTRICTS[id].name}`);
    assert.ok(warned(out), `${id} is locked`);
    assert.ok(out.some((e) => e.message.includes(`comes with ${districtFrom(id).name}`)), `${id}: its achievement named`);
  }
  s.cosmetics = { district: 'coldline' }; // a save that names one not earned
  assert.equal(districtOf(s), 'sprawl', 'one not yours shows the Sprawl');
  s.floors.reached = 2;
  tickAchievements(s);
  assert.ok(earned(s, 'x-floor-2') && districtOpen(s, 'backhaul'));
  assert.ok(!warned(play(s, 'district backhaul')));
  assert.equal(districtOf(s), 'backhaul');
  assert.ok(warned(play(s, 'district stacks')), 'the others still locked');
  assert.equal(districtOf(s), 'backhaul', 'a refused pick changes nothing');
  s.floors.reached = 1;
  assert.equal(districtOf(s), 'backhaul', 'kept for good');
  assert.ok(warned(play(s, 'district atlantis')));
  play(s, 'district the sprawl');
  assert.equal(districtOf(s), 'sprawl');
  assert.equal(s.cosmetics.district, undefined, 'the Sprawl saves as nothing');
  developerAchieve(s, 'all');
  for (const id of DISTRICT_IDS) { play(s, `district ${id}`); assert.equal(districtOf(s), id); }
  // app.js hands it to the window on every render
  assert.match(read('./dist/app.js'), /outside\.district\(districtOf\(campaign\)\);/);
});

test('Rig → Casing → Window: the districts, yours to pick, the rest dim with their achievement; the reward shows as a chip', () => {
  const s = me(), snap = JSON.stringify(s);
  const html = rigMarkup(s, { tab: 'casing' });
  assert.equal(JSON.stringify(s), snap, 'a view never writes the save');
  assert.match(html, /<h2>Window<\/h2>/);
  assert.match(html, /class="cs-dist" data-run="district sprawl" aria-pressed="true"/);
  for (const id of DISTRICT_IDS.slice(1)) assert.ok(html.includes(`class="cs-dist locked" title="${DISTRICTS[id].name}: `) && html.includes(`Comes with ${districtFrom(id).name}.`), `${id} dim, with its achievement`);
  developerAchieve(s, 'all');
  play(s, 'district tarbeach');
  const all = districtCardMarkup(s);
  assert.ok(!all.includes('cs-dist locked'));
  assert.match(all, /data-run="district tarbeach" aria-pressed="true"/);
  const row = achRow(s, achievements().find((a) => a.id === 'x-floor-2'));
  assert.match(row, /class="ach-rw ach-rw-district" title="Window: Backhaul\.[^"]*"><svg class="cs-mini-d"/);
  assert.match(rewardText(achievements().find((a) => a.id === 'x-floor-2')), /the window district Backhaul/);
  assert.match(achRow(s, achievements().find((a) => a.id === 'c-patient')), /class="ach-rw ach-rw-prop"[^>]*>.*Coffee mug/);
});

test('props: six, each from an achievement, only earned ones, on the desk or on top of the monitor, one place each', () => {
  assert.deepEqual(PROP_IDS, ['mug', 'duck', 'keycard', 'cactus', 'floppies', 'die']);
  assert.deepEqual(PROP_IDS.map((id) => propFrom(id)?.id), ['c-patient', 't-program', 'x-hubs', 't-untouched', 'k-collector', 't-thread']);
  for (const id of PROP_IDS) assert.ok(PROPS[id].name && PROPS[id].tip.endsWith('.'), id);
  const s = me();
  assert.ok(warned(play(s, 'casing prop mug')), 'locked until earned');
  assert.equal(placeProp(s, 'mug', { on: 'top', u: 0.5 }), false);
  assert.deepEqual(propsLook(s), []);
  s.achievements = { flags: { 't-untouched': 1 } };
  tickAchievements(s);
  assert.ok(propOpen(s, 'cactus'));
  play(s, 'casing prop cactus');
  assert.deepEqual(propsLook(s).map((p) => [p.id, p.on, p.u]), [['cactus', 'desk', 0.11]]);
  play(s, 'casing prop cactus top 40');
  assert.deepEqual(propsLook(s).map((p) => [p.id, p.on, p.u]), [['cactus', 'top', 0.4]], 'moved, not copied');
  assert.ok(placeProp(s, 'cactus', { on: 'desk', u: 0.9 }));
  assert.deepEqual(s.cosmetics.props, [{ id: 'cactus', on: 'desk', u: 0.9 }], 'a drag saves the place');
  assert.match(propMarkup(propsLook(s)[0]), /^<span class="prop p-cactus" data-prop="cactus" title="Cactus\. [^"]*"><svg viewBox="0 0 30 26"/);
  // Rig → Casing → Props
  const html = casingPageMarkup(s);
  assert.match(html, /<h2>Props<\/h2>/);
  assert.match(html, /class="cs-prop" data-run="casing prop cactus off" aria-pressed="true"/);
  assert.match(html, /class="cs-prop locked" title="Coffee mug: [^"]*Comes with Long Uptime\."/);
  assert.match(html, /class="cs-prop locked" title="Lucky die: [^"]*Comes with a hidden achievement\."/, 'a hidden one stays hidden');
  play(s, 'casing prop cactus off');
  assert.deepEqual(propsLook(s), []);
  developerAchieve(s, 'all');
  for (const id of PROP_IDS) play(s, `casing prop ${id}`);
  assert.equal(propsLook(s).length, PROP_IDS.length, 'every one you own can be out');
  play(s, 'casing prop off');
  assert.deepEqual(propsLook(s), []);
});

test('props never cover the knobs, the lamps, the plate or the screen: on the desk, on the chin or on top of the monitor', () => {
  for (const { m, box, keep, screen, name } of pages()) {
    const fw = Math.min(260, m.W * 0.14);
    for (let i = 0; i <= 40; i++) for (const y of [0, m.H * 0.3, m.H * 0.7, m.H]) {
      const at = propAt(m, (m.W * i) / 40, y), p = propSpot(m, keep, at), r = R(p.x, p.y, p.w, p.h);
      assert.ok(at.u >= 0 && at.u <= 1);
      assert.equal(p.w, PROP_BOX.w); assert.equal(p.h, PROP_BOX.h);
      for (const k of [...keep, screen]) assert.ok(!hits(r, k), `${name}: a prop at ${at.on} ${at.u} clear of the knobs, the plate, the lamps and the screen`);
      assert.ok(p.x >= 0 && p.x + p.w <= m.W && p.y >= 0 && p.y + p.h <= m.H, `${name}: on the page`);
      if (p.on === 'top') { assert.ok(m.win && m.top >= 46, 'on top only with the window, and room over the monitor'); assert.ok(p.y + p.h <= m.top - 14, 'standing on the frame'); }
      else if (m.desk) { assert.ok(p.y >= m.H - m.desk, 'on the desk, under the chin'); assert.ok(p.x + p.w <= m.W * 0.2 || (p.x >= m.W * 0.4 && p.x + p.w <= m.W / 2 - fw / 2) || p.x >= m.W / 2 + fw * 1.2, `${name}: clear of the desk's keyboard, foot and cable`); }
      else assert.ok(p.y >= box.top && p.y + p.h <= box.bottom, 'on the chin');
    }
    assert.equal(propAt(m, m.W / 2, 0).on, m.win && m.top >= 46 ? 'top' : 'desk', `${name}: the top only when a prop can stand there`);
    assert.equal(propSpot(m, keep, { on: 'top', u: 0.5 }).on, m.win && m.top >= 46 ? 'top' : 'desk', 'one saved on top stands on the desk meanwhile');
  }
  // app.js places them from that layout, inside #casing (never in .app); phones never show the casing
  const js = read('./dist/app.js');
  assert.match(js, /casePut\(el, propSpot\(caseM, caseKeep, props\[i\]\)\)/);
  assert.match(js, /PR = host\.querySelector\('\.props'\)/);
  const css = read('./dist/casing.css');
  assert.match(css, /#casing \.props \{ position: absolute; inset: 0; pointer-events: none; \}/);
  assert.match(css, /\.no-motion #casing \.prop \.steam \{ animation: none; \}/, 'the steam rises only with Motion on');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ #casing \.prop \.steam \{ animation: none; \} \}/);
  assert.match(strip(read('./dist/style.css')), /#casing \{ display: none; \}/, 'no casing, no props, on a phone');
});

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
import { DISTRICT_IDS, DISTRICTS } from './dist/window.mjs';
import { districtOf, districtOpen, districtFrom, PROPS, PROP_IDS, PROP_BOX, propsLook, propsOwned, propOpen, propFrom, propLayout, propMarkup } from './dist/casing.mjs';
import { DECOR_REWARDS, rewardText } from './dist/achievements.mjs';
import { achRow } from './dist/achievements-view.mjs';
import { districtCardMarkup } from './dist/casing-view.mjs';

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

// ---------- the window's districts and the desk's props ----------
test('defaults unchanged: the Sprawl out the window and a bare desk, for a new game and an older save', () => {
  for (const s of [fresh(), restore(JSON.parse(JSON.stringify(fresh()))), me()]) {
    assert.equal(districtOf(s), 'sprawl');
    assert.deepEqual(propsLook(s), [null, null]);
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

test('System → Settings → Window: the districts, yours to pick, the rest dim with their achievement; the reward shows as a chip', () => {
  const s = me(), snap = JSON.stringify(s);
  const html = systemMarkup(s);
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

test('desk props: six, each from an achievement, two spots, only earned ones, one place each', () => {
  assert.deepEqual(PROP_IDS, ['mug', 'duck', 'keycard', 'cactus', 'floppies', 'die']);
  assert.deepEqual(PROP_IDS.map((id) => propFrom(id)?.id), ['c-patient', 't-program', 'x-hubs', 't-untouched', 'k-collector', 't-thread']);
  for (const id of PROP_IDS) assert.ok(PROPS[id].name && PROPS[id].tip.endsWith('.'), id);
  const s = me();
  assert.ok(warned(play(s, 'casing prop 1 mug')), 'locked until earned');
  assert.deepEqual(propsLook(s), [null, null]);
  s.achievements = { flags: { 't-untouched': 1 } };
  tickAchievements(s);
  assert.ok(propOpen(s, 'cactus'));
  play(s, 'casing prop 1 cactus');
  assert.deepEqual(propsLook(s).map((p) => p?.id || null), ['cactus', null]);
  play(s, 'casing prop 2 cactus');
  assert.deepEqual(propsLook(s).map((p) => p?.id || null), [null, 'cactus'], 'moved, not copied');
  assert.ok(warned(play(s, 'casing prop 3 cactus')), 'two spots');
  assert.match(propMarkup(propsLook(s)[1], 1), /^<span class="prop p-cactus" data-prop-slot="1" title="Cactus\. [^"]*"><svg viewBox="0 0 30 26"/);
  // System → Casing → Desk
  const html = casingPageMarkup(s, { pslot: 1 });
  assert.match(html, /<h2>Desk<\/h2>/);
  assert.match(html, /data-cs-pslot="1" aria-pressed="true"/);
  assert.match(html, /class="cs-prop" data-run="casing prop 2 cactus" aria-pressed="true"/);
  assert.match(html, /class="cs-prop locked" title="Coffee mug: [^"]*Comes with Long Uptime\."/);
  assert.match(html, /class="cs-prop locked" title="Lucky die: [^"]*Comes with a hidden achievement\."/, 'a hidden one stays hidden');
  play(s, 'casing prop 2 off');
  assert.deepEqual(propsLook(s), [null, null]);
});

test('props never cover the knobs, the lamps, the plate, a sticker or the screen, on the desk or the chin', () => {
  const R = (x, y, w, h) => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y });
  const overlap = (a, b) => a.x < b.right && b.left < a.x + a.w && a.y < b.bottom && b.top < a.y + a.h;
  for (const [W, H] of [[1100, 720], [1280, 800], [1440, 900], [1700, 900], [1920, 1080], [2560, 1440], [3840, 2160]]) for (const win of [false, true]) for (const plateW of [234, 330]) {
    const desk = win && W >= 1700 && H >= 860 ? (H >= 1000 ? 34 : 30) : 0, side = win && W >= 1700 ? Math.max(48, W * 0.035) : Math.max(26, W * 0.012);
    const box = R(side + 20, H - desk - 52, W - 2 * (side + 20), 52);
    const knobs = R(box.left, box.top + 17, 46, 18), lamps = R(box.right - 300, box.top + 20, 300, 12), plate = R(W / 2 - plateW / 2, box.top + 19, plateW, 14);
    const screen = R(side, 22, W - 2 * side, H - 22 - 52 - desk);
    const { spots, dz } = propLayout({ W, H, desk, box, knobs, plate, lamps }, [true, true]);
    if (desk) assert.ok(spots[0] && spots[1], `${W}×${H}: both on the desk`);
    else if (W >= 1440) assert.ok(spots[0] && spots[1], `${W}×${H}: both on the chin`);
    for (const p of spots.filter(Boolean)) {
      assert.equal(p.w, PROP_BOX.w); assert.equal(p.h, PROP_BOX.h);
      for (const [name, r] of [['knobs', knobs], ['lamps', lamps], ['plate', plate], ['screen', screen]]) assert.ok(!overlap(p, r), `${W}×${H} window ${win}: a prop clear of the ${name}`);
      assert.ok(p.x >= 0 && p.x + p.w <= W && p.y >= 0 && p.y + p.h <= H, 'on the page');
      if (desk) {
        assert.ok(p.y >= H - desk, 'on the desk, under the chin');
        const fw = Math.min(260, W * 0.14); // clear of the keyboard, the monitor's foot and its cable, as the window draws them
        assert.ok(p.x + p.w <= W * 0.2 || p.x >= W / 2 + fw * 1.2, `${W}: clear of the desk's keyboard, foot and cable`);
      } else assert.ok(p.y >= box.top && p.y + p.h <= box.bottom, 'on the chin');
      // the sticker strips (measured from the chin's edges) stay off it
      const left = R(box.left + dz.l0, box.top + 17, box.width - dz.l0 - dz.l1, 18), right = R(box.left + dz.r0, box.top + 17, box.width - dz.r0 - dz.r1, 18);
      for (const r of [left, right]) if (r.width > 0) assert.ok(!overlap(p, r), `${W}×${H}: no sticker under a prop`);
    }
    // with no props the strips are as they always were
    const bare = propLayout({ W, H, desk, box, knobs, plate, lamps });
    assert.deepEqual(bare.spots, [null, null]);
    assert.deepEqual(bare.dz, { l0: knobs.right - box.left + 18, l1: box.right - plate.left + 18, r0: plate.right - box.left + 18, r1: box.right - lamps.left + 18 });
  }
  // app.js places them from that layout, inside #casing (never in .app); phones never show the casing
  const js = read('./dist/app.js');
  assert.match(js, /const \{ spots, dz \} = propLayout\(/);
  assert.match(js, /document\.querySelector\('#casing \.props'\)/);
  const css = read('./dist/casing.css');
  assert.match(css, /#casing \.props \{ position: absolute; inset: 0; pointer-events: none; \}/);
  assert.match(css, /\.no-motion #casing \.prop \.steam \{ animation: none; \}/, 'the steam rises only with Motion on');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ #casing \.prop \.steam \{ animation: none; \} \}/);
  assert.match(strip(read('./dist/style.css')), /#casing \{ display: none; \}/, 'no casing, no props, on a phone');
});

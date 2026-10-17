// Protocol glyphs (dist/protocol-glyphs.mjs): three shapes a kind, every one 23 columns and its own mirror, a fill for
// every stat a protocol rolls, and the same picture for the same item every time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHAPES, FILL, MIRROR, GLYPH_W, GLYPH_H, asymmetric, shapeOf, fillOf, glyphText, glyphFx, glyphMarkup, glyphFrame, scanRow, flickering } from './dist/protocol-glyphs.mjs';
import { SLOT_KINDS, PROTOCOL_STATS, seeded, rollItem } from './dist/gear.mjs';

test('every protocol kind has three shapes, each 23 columns, fill spots marked, mirror-symmetric', () => {
  assert.deepEqual(Object.keys(SHAPES).sort(), [...new Set(SLOT_KINDS)].sort());
  for (const [kind, list] of Object.entries(SHAPES)) {
    assert.equal(list.length, 3, `${kind}: three shapes`);
    assert.equal(new Set(list.map((x) => x.name)).size, 3, `${kind}: three names`);
    for (const { name, rows } of list) {
      assert.ok(rows.length > 0 && rows.length <= GLYPH_H, `${kind} ${name}: fits the ${GLYPH_H}-row box`);
      assert.ok(rows.every((r) => r.length === GLYPH_W), `${kind} ${name}: ${GLYPH_W} columns`);
      assert.deepEqual(asymmetric(rows), [], `${kind} ${name}: symmetric`);
      assert.ok(rows.some((r) => r.includes('%')), `${kind} ${name}: has a fill spot`);
    }
  }
});

test('every stat a protocol can roll has a fill, one character that mirrors itself', () => {
  for (const k of PROTOCOL_STATS) {
    assert.equal(typeof FILL[k], 'string', `${k}: has a fill`);
    assert.equal(FILL[k].length, 1, `${k}: one character`);
    assert.ok(!MIRROR[FILL[k]] && FILL[k] !== '%' && FILL[k] !== ' ', `${k}: '${FILL[k]}' keeps the glyph symmetric`);
  }
  // Filled, every shape stays symmetric.
  for (const list of Object.values(SHAPES)) for (const { rows } of list) for (const ch of Object.values(FILL)) assert.deepEqual(asymmetric(rows.map((r) => r.replaceAll('%', ch))), []);
});

test('an item’s glyph: its kind’s family, a shape from its name, a fill from its main stat, the same every time', () => {
  const r = seeded(5);
  for (let i = 0; i < 40; i++) {
    const it = rollItem(r, { level: 10 + (i % 30), slot: SLOT_KINDS[i % 5] });
    assert.ok(SHAPES[it.group].includes(shapeOf(it)), 'its kind picks the family');
    assert.equal(fillOf(it), FILL[Object.keys(it.stats)[0]], 'its first stat picks the fill');
    const text = glyphText(it), rows = text.split('\n');
    assert.equal(rows.length, GLYPH_H);
    assert.ok(rows.every((x) => x.length === GLYPH_W));
    assert.ok(!text.includes('%'), 'every fill spot filled');
    assert.equal(glyphText({ ...it, level: it.level + 1 }), text, 'the same item looks the same');
  }
  // Names spread over the three shapes.
  const seen = new Set(['Loader', 'Zero-click', 'Rust Mesh', 'Burnt Ghost', 'Onion Circuit', 'Implant of Skew', 'Restricted Shell Escape', 'Sasser'].map((name) => shapeOf({ group: 'script', name, stats: { damage: 1 } }).name));
  assert.ok(seen.size >= 2, 'different names, different shapes');
});

test('rarity: white dims, yellow and up get corner marks, a Zero-day scans, a unique flickers', () => {
  const base = { group: 'exploit', name: 'Zero-click', stats: { damage: 4 } };
  assert.match(glyphMarkup({ ...base, rarity: 'stock' }), /class="pglyph pg-md r-stock" aria-hidden="true">/);
  assert.doesNotMatch(glyphMarkup({ ...base, rarity: 'tuned' }), /pg-framed|data-pg-fx/);
  assert.match(glyphMarkup({ ...base, rarity: 'custom' }, 'lg'), /class="pglyph pg-lg r-custom pg-framed"/);
  assert.equal(glyphFx({ ...base, rarity: 'zeroday', zeroDay: 'x' }), 'scan');
  assert.equal(glyphFx({ ...base, rarity: 'zeroday', unique: 'lien' }), 'flicker');
  assert.equal(glyphFx({ ...base, rarity: 'indemnified' }), 'flicker');
  assert.match(glyphMarkup({ ...base, rarity: 'zeroday' }), /pg-framed" aria-hidden="true" data-pg-fx="scan" data-base="/);
  // The scanline sweeps down a row at a time; the flicker is on a few steps in fourteen.
  const text = glyphText(base);
  assert.equal(scanRow(0), 0);
  assert.equal(scanRow(260 * 4), 4);
  assert.match(glyphFrame(text, 'scan', 260 * 4).split('\n')[4], /^<b class="pg-scan">/);
  assert.ok(flickering(0) && !flickering(140 * 5));
  assert.notEqual(glyphFrame(text, 'flicker', 0, () => 0.01), glyphFrame(text, 'flicker', 140 * 5));
  assert.equal(glyphFrame(text, 'flicker', 140 * 5), text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
});

test('the Loadout’s board: footprints with glyphs, a datasheet for the pick, the stash as tiles, stats one a line', async () => {
  const { fresh, addItem, command, rigOf } = await import('./dist/combat.mjs');
  const { protocolGearMarkup, itemTipMarkup, stashUi } = await import('./dist/view.mjs');
  const s = fresh();
  s.hackers = { breaker: { level: 16, xp: 0 } };
  s.profile = { handle: 'zer0' };
  const r = seeded(4);
  const on = addItem(s, rollItem(r, { level: 15, rarity: 'tuned', slot: 'exploit' }));
  const spare = addItem(s, rollItem(r, { level: 16, rarity: 'custom', slot: 'exploit' }));
  command(s, 'load ' + on.id);
  stashUi.sel = null;
  let html = protocolGearMarkup(s);
  // The board: the rig, six footprints (the sixth opens at 30), the loaded one with its glyph and name.
  assert.match(html, /<div class="silk-rig">.*<b>zer0<\/b><small>Breaker · 16<\/small>/s);
  assert.equal(html.match(/<div class="silk-fp /g).length, 6);
  assert.match(html, /<div class="silk-fp at-l0 sel r-tuned" data-kind="exploit"[^>]*><button type="button" class="silk-pick" data-silk-sel="slot:0" aria-pressed="true"[^>]*><span class="pglyph pg-md r-tuned"/);
  assert.match(html, /<div class="silk-fp at-r0 empty" data-kind="proxy"[^>]*>.*?<span class="silk-none">Empty<\/span><\/span><span class="silk-ref"><i class="silk-led" aria-hidden="true"><\/i><b>J1<\/b>Proxy<\/span>/s);
  assert.match(html, /<div class="silk-fp at-r2 locked"[^>]*><div class="silk-pick">.*?Lv 30/s);
  assert.match(html, new RegExp(`data-command="unload ${on.id}"`), 'unload from the board');
  // The datasheet: the first slot by default, its item's stats one a line.
  assert.match(html, /<aside class="card silk-sheet r-tuned" aria-label="Datasheet"><h2>U1 · Exploit<\/h2><div class="silk-plate"><span class="pglyph pg-lg r-tuned"/);
  assert.equal(html.match(/<dl class="silk-stats">(.*?)<\/dl>/s)[1].match(/<div[ >]/g).length, Object.keys(on.stats).length, 'a row a stat');
  // The stash: a tile with a small glyph, Swap (the slot is full) and Deconstruct (a yellow asks first).
  assert.match(html, new RegExp(`<li class="silk-tile r-custom" data-kind="exploit"><button type="button" class="silk-pick" data-silk-sel="${spare.id}" aria-pressed="false" data-ptip="${spare.id}"><span class="pglyph pg-sm r-custom pg-framed"`));
  assert.match(html, new RegExp(`class="inv-btn load" data-command="load ${spare.id}"[^>]*>Swap<`));
  assert.match(html, new RegExp(`data-command="deconstruct ${spare.id}" data-confirm="Sure\\? Deconstruct"`));
  // Pick the stash item: the datasheet reads it against U1, and U1 takes it in one click.
  stashUi.sel = spare.id;
  html = protocolGearMarkup(s);
  assert.match(html, /<aside class="card silk-sheet r-custom" aria-label="Datasheet"><h2>Stash · Exploit<\/h2>/);
  assert.ok(html.includes(`Stats · vs ${on.name} v15`));
  assert.match(html, /class="silk-d (up|down)">[▲▼]/, 'gains and losses against the slot');
  assert.match(html, />Swap into U1<\/button>/);
  assert.match(html, new RegExp(`<div class="silk-fp at-l0 target r-tuned"[^>]*><button type="button" class="silk-pick" data-command="load ${spare.id}"`));
  assert.match(html, /class="silk-trace live"/, 'its trace lights');
  // Loaded, the pick follows it to its slot.
  command(s, 'load ' + spare.id);
  assert.equal(rigOf(s)[0], spare.id);
  assert.match(protocolGearMarkup(s), /<h2>U1 · Exploit<\/h2>/);
  stashUi.sel = null;
  // The hover card shows the item's glyph, stats one a line.
  const tip = itemTipMarkup(s, on.id);
  assert.match(tip, /<div class="ptip-card r-tuned"><span class="ptip-glyph"><span class="pglyph pg-tip r-tuned"/);
  assert.doesNotMatch(tip, /ptip-art/);
});

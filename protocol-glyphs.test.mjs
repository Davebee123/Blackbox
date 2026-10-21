// Protocol glyphs (dist/protocol-glyphs.mjs): three shapes a kind, every one 23 columns and its own mirror, a fill for
// every stat a protocol rolls, and the same picture for the same item every time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHAPES, FILL, MIRROR, GLYPH_W, GLYPH_H, asymmetric, shapeOf, fillOf, glyphText, glyphFx, glyphMarkup, glyphFrame, scanRow, flickering } from './dist/protocol-glyphs.mjs';
import { SLOT_KINDS, PROTOCOL_STATS, STATS, seeded, rollItem } from './dist/gear.mjs';

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

test('the Loadout’s board: footprints with glyphs, the stash as scannable rows, a datasheet popover for each, stats one a line', async () => {
  const { fresh, addItem, command, rigOf } = await import('./dist/combat.mjs');
  const { protocolGearMarkup, protocolStashCard, protocolDetailMarkup, itemTipMarkup, stashUi } = await import('./dist/view.mjs');
  const s = fresh();
  s.hackers = { breaker: { level: 16, xp: 0 } };
  s.profile = { handle: 'zer0' };
  const r = seeded(4);
  const on = addItem(s, rollItem(r, { level: 15, rarity: 'tuned', slot: 'exploit' }));
  const spare = addItem(s, rollItem(r, { level: 16, rarity: 'custom', slot: 'exploit' }));
  const proxies = [addItem(s, rollItem(r, { level: 16, rarity: 'stock', slot: 'proxy' })), addItem(s, rollItem(r, { level: 16, rarity: 'tuned', slot: 'proxy' }))];
  command(s, 'load ' + on.id);
  stashUi.sel = null; stashUi.filter = 'all';
  let html = protocolGearMarkup(s);
  // The board: the rig, six footprints (the sixth opens at 30), the loaded one with its glyph beside its name and label.
  assert.match(html, /<div class="silk-rig">.*<b>zer0<\/b><small>Breaker · 16<\/small>/s);
  assert.equal(html.match(/<div class="silk-fp /g).length, 6);
  assert.match(html, /<div class="silk-fp at-l0 sel r-tuned" data-kind="exploit"[^>]*><button type="button" class="silk-pick" data-silk-sel="slot:0" data-silk-kind="exploit" aria-pressed="true"[^>]*><span class="pglyph pg-md r-tuned"[^]*?<\/span><span class="silk-text"><b class="iname r-tuned">/);
  // An empty slot: how many in the stash fit it.
  assert.match(html, /<div class="silk-fp at-r0 empty" data-kind="proxy"[^>]*>.*?<span class="silk-text"><span class="silk-none">Empty <b class="silk-count"[^>]*>2<\/b><\/span><span class="silk-ref"><i class="silk-led" aria-hidden="true"><\/i><b>J1<\/b>Proxy<\/span>/s);
  assert.match(html, /<div class="silk-fp at-r2 locked"[^>]*><div class="silk-pick">.*?Lv 30/s);
  assert.match(html, new RegExp(`data-command="unload ${on.id}"`), 'unload from the board');
  // No datasheet card in the layout: a filled slot carries its item for the popover (app.js).
  assert.doesNotMatch(html, /silk-sheet|Datasheet/);
  assert.match(html, new RegExp(`<div class="silk-fp at-l0 sel r-tuned" data-kind="exploit" data-pdetail="${on.id}"`));
  assert.doesNotMatch(html, /<div class="silk-fp at-r0 empty"[^>]*data-pdetail/, 'an empty slot has none');
  // A filled slot's datasheet: its stats one a line, no ▲ ▼ (nothing to compare), Unload.
  const slotSheet = protocolDetailMarkup(s, on.id);
  assert.match(slotSheet, /^<div class="pg-detail r-tuned"><div class="silk-head">/);
  assert.match(slotSheet, /<div class="silk-plate"><span class="pglyph pg-lg r-tuned"/);
  assert.equal(slotSheet.match(/<dl class="silk-stats">(.*?)<\/dl>/s)[1].match(/<div[ >]/g).length, Object.keys(on.stats).length, 'a row a stat');
  assert.match(slotSheet, new RegExp(`<div class="silk-acts pg-acts"><button type="button" class="btn" data-command="unload ${on.id}"`));
  // A stash row: a small glyph, the name, its biggest stats as numbers with ▲ ▼ against the slot, no effect text; a
  // click loads it (a swap: the slot is full); Swap and Deconstruct (a yellow asks first) on it. Nothing lit until you
  // pick a slot.
  const tile = html.match(new RegExp(`<li class="silk-tile r-custom" data-kind="exploit" data-pdetail="${spare.id}">.*?</li>`, 's'))[0];
  assert.match(tile, new RegExp(`<button type="button" class="silk-pick" data-command="load ${spare.id}" aria-label="Swap [^"]+ into U1"><span class="pglyph pg-sm r-custom pg-framed"`));
  assert.ok((tile.match(/class="silk-st[ "]/g) || []).length >= 1 && (tile.match(/class="silk-st[ "]/g) || []).length <= 3, 'two or three numbers');
  assert.match(tile, /<i class="(up|down)">[▲▼]<\/i>/, 'against what it would replace');
  assert.doesNotMatch(tile, /inv-fx|set-lines|<em|data-ptip/);
  assert.match(tile, new RegExp(`class="inv-btn load" data-command="load ${spare.id}"[^>]*>Swap<`));
  assert.match(tile, new RegExp(`data-command="deconstruct ${spare.id}" data-confirm="Sure\\? Deconstruct"`));
  assert.doesNotMatch(html, /silk-tile [^"]* fit/);
  // Its datasheet: against U1, ▲ ▼ a stat, the buttons naming the slot.
  const sheet = protocolDetailMarkup(s, spare.id);
  assert.match(sheet, /^<div class="pg-detail r-custom">/);
  assert.ok(sheet.includes(`Stats · vs ${on.name} v15`));
  assert.match(sheet, /<dl class="silk-stats vs">/);
  assert.match(sheet, /class="silk-d (up|down)">[▲▼] /, 'gains and losses against the slot');
  assert.match(sheet, />Swap into U1<\/button>/);
  assert.match(sheet, new RegExp(`data-command="deconstruct ${spare.id}" data-confirm="Sure\\? Deconstruct"[^>]*>.*? Deconstruct</button>`));
  assert.equal(protocolDetailMarkup(s, 'nope'), '');
  // Pick a slot (app.js also filters the stash to its kind): what fits it lights, its trace too.
  stashUi.sel = 'slot:1';
  html = protocolGearMarkup(s);
  assert.equal((html.match(/<li class="silk-tile [^"]* fit"/g) || []).length, 2, 'both proxies light');
  assert.match(html, /class="silk-trace live"/);
  // Busy (a fight): no click-to-load on a row, and the buttons wait.
  command(s, 'encounter cryptjack'); command(s, 'engage');
  const busyRow = protocolStashCard(s).match(new RegExp(`<li class="silk-tile r-custom"[^>]*>.*?</li>`, 's'))[0];
  assert.match(busyRow, /<button type="button" class="silk-pick" aria-disabled="true" title="At home only">/);
  assert.doesNotMatch(busyRow, /class="silk-pick" data-command/);
  assert.match(protocolDetailMarkup(s, on.id), /data-command="unload [^"]+" disabled title="At home only">Unload/);
  s.encounter = null;
  // Loaded, it leaves the stash for the board.
  command(s, 'load ' + spare.id);
  assert.equal(rigOf(s)[0], spare.id);
  assert.match(protocolGearMarkup(s), new RegExp(`<div class="silk-fp at-l0 [^"]*" data-kind="exploit" data-pdetail="${spare.id}"`));
  stashUi.sel = null;
  // The hover card shows the item's glyph, stats one a line.
  const tip = itemTipMarkup(s, on.id);
  assert.match(tip, /<div class="ptip-card r-tuned"><span class="ptip-glyph"><span class="pglyph pg-tip r-tuned"/);
  assert.doesNotMatch(tip, /ptip-art/);
});

test('a picked slot lists every stash item of its kind, best first, and each one’s datasheet compares it ▲ ▼', async () => {
  const { fresh, addItem, command } = await import('./dist/combat.mjs');
  const { protocolStashCard, protocolDetailMarkup, stashUi } = await import('./dist/view.mjs');
  const s = fresh();
  s.hackers = { breaker: { level: 20, xp: 0 } };
  const r = seeded(7);
  const on = addItem(s, rollItem(r, { level: 12, rarity: 'stock', slot: 'shell' }));
  command(s, 'load ' + on.id);
  const shells = [5, 20, 12, 16, 9].map((level, i) => addItem(s, rollItem(r, { level, rarity: ['stock', 'tuned', 'custom'][i % 3], slot: 'shell' })));
  const others = [addItem(s, rollItem(r, { level: 18, rarity: 'tuned', slot: 'exploit' })), addItem(s, rollItem(r, { level: 18, rarity: 'tuned', slot: 'proxy' }))];
  // As app.js does on a click of SH1: pick it, show its kind.
  Object.assign(stashUi, { sel: 'slot:2', filter: 'shell', sort: 'up' });
  let card = protocolStashCard(s);
  const ids = [...card.matchAll(/<li class="silk-tile [^"]*" data-kind="([a-z]+)" data-pdetail="([^"]+)"/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(ids.map(([, id]) => id).sort(), shells.map((x) => x.id).sort(), 'every shell in the stash, nothing else');
  assert.ok(ids.every(([k]) => k === 'shell'));
  assert.ok(!ids.some(([, id]) => id === on.id || others.some((o) => o.id === id)));
  assert.match(card, /data-stash-filter="shell" aria-pressed="true" ?>Shell <span>5<\/span>/, 'with the count');
  assert.match(card, /data-stash-sort="up" aria-pressed="true">▲ Best</);
  // Best first: the biggest gain against SH1 leads; by level, the highest.
  const gain = (it) => Object.keys({ ...it.stats, ...on.stats }).filter((k) => STATS[k]).reduce((n, k) => n + ((it.stats[k] || 0) - (on.stats[k] || 0)) / STATS[k].base, 0);
  assert.equal(ids[0][1], [...shells].sort((a, b) => gain(b) - gain(a))[0].id);
  stashUi.sort = 'level';
  card = protocolStashCard(s);
  assert.deepEqual([...card.matchAll(/<li [^>]*data-pdetail="([^"]+)"/g)].map((m) => m[1]), [...shells].sort((a, b) => b.level - a.level).map((x) => x.id));
  // All: everything again.
  stashUi.filter = 'all';
  assert.equal(protocolStashCard(s).match(/<li class="silk-tile /g).length, shells.length + others.length);
  // Each one's datasheet: every stat against SH1's, ▲ ▼ and by how much.
  const sheet = protocolDetailMarkup(s, shells[1].id);
  assert.ok(sheet.includes(`Stats · vs ${on.name}`));
  const rows = sheet.match(/<dl class="silk-stats vs">(.*?)<\/dl>/s)[1];
  assert.equal(rows.match(/<div[ >]/g).length, new Set([...Object.keys(on.stats), ...Object.keys(shells[1].stats)].filter((k) => STATS[k])).size, 'a row a stat of either');
  assert.match(rows, /<dd class="silk-d (up|down)">[▲▼] /);
  // Loaded elsewhere: on another class, it still lists here with its tag.
  s.hackers.bastion = { level: 20, xp: 0 };
  command(s, 'archetype bastion'); command(s, 'load ' + shells[0].id); command(s, 'archetype breaker');
  stashUi.filter = 'shell';
  assert.match(protocolStashCard(s).match(new RegExp(`<li [^>]*data-pdetail="${shells[0].id}">.*?</li>`, "s"))[0], / <span class="tag dim">on Bastion<\/span><\/b>.*<span class="pg-lv"><b>Lv 5<\/b><small>Shell<\/small>/s);
  Object.assign(stashUi, { sel: null, filter: 'all', sort: 'up' });
});

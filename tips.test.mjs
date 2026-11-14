// First-time tips: the only tutorial. One at a time, once each, only where their thing is on screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, restore } from './dist/combat.mjs';
import { TIPS, nextTip, markSeen, paceOf } from './dist/tips.mjs';
import { mapMarkup, serverMarkup, protocolsMarkup, loadoutMarkup, daemonsMarkup, systemMarkup, boardMarkup, hudMarkup } from './dist/view.mjs';

// A stand-in for "is it on screen": the selector's last class/attribute appears in the markup.
const onPage = (html) => (sel) => {
  const last = sel.trim().split(/\s+/).at(-1);
  const bits = [...last.matchAll(/\.([\w-]+)|\[([\w-]+)="([^"]+)"\]|#([\w-]+)/g)];
  return bits.length > 0 && bits.every(([, cls, attr, val, id]) => (cls ? new RegExp(`class="[^"]*\\b${cls}\\b`).test(html) : attr ? html.includes(`${attr}="${val}"`) : html.includes(`id="${id}"`)));
};

test('every tip has an id, a page, a selector and one or two short sentences', () => {
  const ids = new Set();
  for (const t of TIPS) {
    assert.ok(t.id && !ids.has(t.id), `unique id ${t.id}`);
    ids.add(t.id);
    assert.ok(t.page && t.at && t.text, t.id);
    assert.ok(t.text.length <= 200, `${t.id} is short`);
  }
});

test('one tip at a time, in order, only on its page and only once', () => {
  const s = fresh();
  let map = mapMarkup(s, 'server');
  const first = nextTip(s, 'map', onPage(map));
  assert.equal(first.id, 'map-start', 'the opening map has one tip: where to start');
  assert.equal(first.done(s), false);
  markSeen(s, first.id);
  assert.equal(nextTip(s, 'map', onPage(map)), null, 'your server and the ? servers wait until they matter');
  command(s, 'encounter cryptjack');
  map = mapMarkup(s, 'server');
  const gate = nextTip(s, 'map', onPage(map));
  assert.equal(gate.id, 'map-server', 'an intrusion at your gate brings your server\'s tip');
  assert.deepEqual(gate.covers, ['map-intrusion'], 'and the intrusion\'s, as one tip');
  for (const id of [gate.id, ...gate.covers]) markSeen(s, id);
  assert.equal(nextTip(s, 'map', onPage(map)), null, 'no ? tip before anything traces one');
  s.hidden[0].lead = 5;
  assert.equal(nextTip(s, 'map', onPage(map)).id, 'map-hidden', 'a ? with a trace on it brings its tip');
  markSeen(s, 'map-hidden');
  assert.equal(nextTip(s, 'map', onPage(map)), null, 'nothing else on this map yet');
  assert.equal(nextTip(s, 'server', onPage(map)), null, 'map tips stay on the map');
  command(s, 'developer location worm');
  assert.equal(nextTip(s, 'map', onPage(mapMarkup(s, 'server'))).id, 'map-origin', 'a new thing brings its tip');
});

test('tips are paced: a calm tip once a screen visit and a while apart, an opening tip once a fight and only while it is paused', () => {
  const s = fresh();
  const map = mapMarkup(s, 'server');
  assert.equal(nextTip(s, 'map', onPage(map), { quiet: true }), null, 'a calm tip waits while the screen is quiet');
  assert.equal(paceOf(nextTip(s, 'map', onPage(map)), 'map'), 'calm');
  command(s, 'encounter cryptjack');
  command(s, 'engage');
  const html = hudMarkup(s) + boardMarkup(s) + '<div id="tray"></div>';
  assert.notEqual(nextTip(s, 'combat', onPage(html))?.id, 'fight-timeline', 'a running fight never stops for what it opened with');
  s.encounter.paused = true;
  assert.equal(nextTip(s, 'combat', onPage(html)).id, 'fight-timeline', 'paused, it shows');
  assert.notEqual(nextTip(s, 'combat', onPage(html), { told: true })?.id, 'fight-timeline', 'one opening tip a fight');
  s.encounter.paused = false;
  s.encounter.metrics.wasted = 1;
  assert.equal(nextTip(s, 'combat', (sel) => sel === '.board .ptick.spent', { told: true, quiet: true })?.id, 'fight-wasted', 'what lands mid-fight still pauses it');
  assert.equal(paceOf(TIPS.find((t) => t.id === 'fight-wasted'), 'combat'), 'mid');
  assert.equal(paceOf(TIPS.find((t) => t.id === 'tour-walk'), 'rooms'), 'free', 'the rooms tour is never held back');
  assert.equal(paceOf(TIPS.find((t) => t.id === 'degraded'), 'map'), 'free', 'nor is a crash');
});

test('fight tips pause the fight and wait for what they explain', () => {
  const s = fresh();
  command(s, 'encounter cryptjack');
  command(s, 'engage');
  s.encounter.paused = true; // a room fight opens paused until your first order
  const html = hudMarkup(s) + boardMarkup(s) + '<div id="tray"></div>';
  const t = nextTip(s, 'combat', onPage(html));
  assert.equal(t.id, 'fight-timeline');
  assert.ok(t.pause);
  assert.deepEqual(t.covers, ['fight-keys', 'fight-ticks', 'fight-armor', 'sync'], 'the first fight is one pause: board, keys, the interrupt\'s ticks, armor and sync together');
  assert.deepEqual(t.steps.map((x) => x.id), ['fight-timeline', 'fight-keys', 'fight-ticks', 'fight-armor', 'sync'], 'clicked through in order, each step its own tip');
  assert.match(t.steps[2].text, /50% and 25%[\s\S]*cancelled/, 'the ticks step teaches the interrupt');
  for (const id of [t.id, ...t.covers]) markSeen(s, id);
  assert.notEqual(nextTip(s, 'combat', onPage(html))?.id, 'fight-keys');
  assert.notEqual(nextTip(s, 'combat', onPage(html))?.id, 'fight-quiet', 'no Trace tip before you have Trace');
  // A tick crossed with nothing due gets its own tip.
  assert.equal(nextTip(s, 'combat', (sel) => sel === '.board .ptick.spent'), null, 'a tick spent on a cut is no mistake');
  s.encounter.metrics.wasted = 1;
  assert.equal(nextTip(s, 'combat', (sel) => sel === '.board .ptick.spent')?.id, 'fight-wasted');
});

test('tips off means none; seen tips survive a save and a new game keeps settings', () => {
  const s = fresh();
  s.settings.tips = false;
  assert.equal(nextTip(s, 'map', () => true), null);
  const t = fresh();
  markSeen(t, 'map-server');
  const back = restore(JSON.parse(JSON.stringify(t)));
  assert.equal(back.settings.seen['map-server'], 1);
  assert.equal(back.settings.tips, true);
});

test('the screens carry names, numbers and state, not explanations', () => {
  const s = fresh();
  command(s, 'developer location worm');
  command(s, 'encounter cryptjack');
  const pages = [mapMarkup(s, 'server'), mapMarkup(s, s.locations[0].id), serverMarkup(s), protocolsMarkup(s), loadoutMarkup(s, 'breaker'), daemonsMarkup(s), systemMarkup(s)].join('\n');
  for (const phrase of [/Neutralize intrusions to trace/, /Services run on ports/, /Any protocol goes in any slot/, /Daemons act for you in cycles/, /Each class levels on its own/, /numbers are layers/, /click to target/, /Speed changes seconds per cycle/, /its guards, its vault/]) {
    assert.doesNotMatch(pages, phrase);
  }
  for (const t of TIPS) if (/^(map|server|protocols|loadout|daemons)-/.test(t.id)) assert.ok(t.text.length > 20);
});

test('the newer systems have their tips: a found server’s memory, plans on Craft, and what to build on a server you hold', async () => {
  const { addLocation } = await import('./dist/combat.mjs');
  const { MEMORY } = await import('./dist/memory.mjs');
  const was = MEMORY.on; MEMORY.on = true; // the memory tip, with memory switched on
  const s = fresh();
  s.tutorialCompleted = true;
  const loc = addLocation(s, 'worm', 1); // found: not on your network yet
  for (const id of ['map-start', 'map-server', 'map-exit']) markSeen(s, id);
  assert.equal(nextTip(s, 'map', onPage(mapMarkup(s, loc.id))).id, 'map-origin');
  markSeen(s, 'map-origin');
  assert.equal(nextTip(s, 'map', onPage(mapMarkup(s, loc.id, undefined, { side: true }))).id, 'map-memory', 'its card: what joining costs');
  command(s, 'attach ' + loc.id);
  loc.takenOver = true;
  (await import('./dist/netrooms.mjs')).roomsFor(s, loc); // traced: its sockets show
  markSeen(s, 'map-memory'); markSeen(s, 'map-owned');
  // Other tips about this server (its quirk, its trait) may come first; the build tip (its sockets) follows.
  let t = null;
  for (let i = 0; i < 6; i++) { t = nextTip(s, 'map', onPage(mapMarkup(s, loc.id, undefined, { side: true }))); if (!t || t.id === 'map-build') break; markSeen(s, t.id); }
  assert.equal(t?.id, 'map-build');
  MEMORY.on = was;
});

test('your first protocol: Loadout, then Load at home; on a run the tip says it waits for home', async () => {
  const { addItem } = await import('./dist/combat.mjs');
  const { rollItem } = await import('./dist/gear.mjs');
  const s = fresh();
  addItem(s, rollItem(() => 0.5, { level: 1, rarity: 'tuned' }));
  const visible = (sel) => sel.includes('aria-selected') ? false : sel.includes(':not([disabled])') ? !s.run : sel.includes('[disabled]') ? !!s.run : onPage(loadoutMarkup(s, 'breaker', 'protocols'))(sel); // on the Protocols tab already
  assert.equal(nextTip(s, 'map', (sel) => sel === '.modules [data-module="loadout"]').id, 'protocol');
  markSeen(s, 'protocol');
  assert.equal(nextTip(s, 'loadout', visible).id, 'protocol-load');
  s.run = { loc: 'sprawl', cwd: '/', pack: [] };
  assert.equal(nextTip(s, 'loadout', visible).id, 'protocol-home');
  assert.match(TIPS.find((t) => t.id === 'protocol').text, /only equip at home/);
});

test('the market teaches itself in order: rows, ▲/▼, the news, then the ticket and transfers', () => {
  const s = fresh();
  const chain = ['hub-menu', 'hub-market', 'hub-compare', 'hub-news', 'hub-slider', 'hub-preview', 'hub-go', 'hub-xfers'];
  const all = (sel) => /hub-row|mk-/.test(sel); // the menu and an open market with a ticket
  for (const id of chain) { assert.equal(nextTip(s, 'hub', all)?.id, id); markSeen(s, id); }
  // The ticket's tips wait for the ticket.
  const t = fresh();
  ['hub-menu', 'hub-market', 'hub-compare', 'hub-news'].forEach((id) => markSeen(t, id));
  assert.equal(nextTip(t, 'hub', (sel) => !sel.includes('mk-ticket') && !sel.includes('mk-xfers') && sel.includes('mk-')), null);
});

test('every threat on the map has a tip, and none speaks of outposts (gone in R2)', () => {
  const has = (sel) => TIPS.some((t) => t.page === 'map' && t.at === sel);
  for (const sel of ['.mnode.intrusion', '.mnode.invader[data-select="invader"]', '.mnode.invader.siege[data-select="invader"]', '.mnode.invader.breach']) assert.ok(has(sel), sel);
  for (const t of TIPS) assert.doesNotMatch(t.text, /outpost|bandwidth|salvage|take (it|the outpost) back|cut off/i, t.id);
});

// The parts plan's P2 (docs/parts-plan.md): one tip for each new board element, and each element is on the board in
// a fight with its part (selectEncounter's forced genes, as ?playtest=part:<id> builds it).
test('the P2 parts\' board elements each have a tip, and each shows in a fight with its part', async () => {
  const { selectEncounter } = await import('./dist/combat.mjs');
  const fight = (family, level, genes) => { const s = fresh(); s.metAll = true; selectEncounter(s, 'random', 77, { level, family, basic: 'pulse', genes, mutation: null, quiet: true }); command(s, 'engage'); return s; };
  const cases = {
    'fight-cap': ['ransomware', 13, ['limiter']],
    'fight-standby': ['worm', 14, ['spare']],
    'fight-scrape': ['ransomware', 19, ['scraper']],
    'fight-cracked': ['ghostroot', 21, ['badblock']],
    'fight-damper': ['cryptominer', 23, ['damper']],
    'fight-frost': ['ransomware', 24, ['coldstore']],
  };
  for (const [id, [family, level, genes]] of Object.entries(cases)) {
    const t = TIPS.find((x) => x.id === id);
    assert.ok(t?.pause && t.page === 'combat' && t.text.length <= 200, id);
    const s = fight(family, level, genes);
    if (id === 'fight-cracked') { s.server.integrity = Math.round(s.server.max / 2); s.encounter.badBlock = { left: 10, max: 10, source: 'badblock', name: 'Bad Block' }; }
    const html = hudMarkup(s) + boardMarkup(s);
    assert.ok(onPage(html)(t.at), `${id}: ${t.at} is on the board`);
    const off = fight(family, level, []);
    assert.ok(!onPage(hudMarkup(off) + boardMarkup(off))(t.at), `${id}: not without its part`);
  }
});
// The parts plan's P3 and priority 3: the Rig's heat, the Degausser's Wipe, the C&C and the Payload each have a tip, on the board in a fight of its family.
test('the P3 families\' board elements each have a tip, and each shows in a fight of its family', async () => {
  const { selectEncounter } = await import('./dist/combat.mjs');
  const fight = (family, level, genes = []) => { const s = fresh(); s.metAll = true; selectEncounter(s, 'random', 77, { level, family, basic: 'pulse', genes, mutation: null, quiet: true }); command(s, 'engage'); return s; };
  for (const [id, family, level, genes] of [['fight-heat', 'cryptominer', 9], ['fight-wipe', 'wiper', 19], ['fight-twin', 'cryptominer', 9, ['twinrig']], ['fight-cnc', 'botnet', 8], ['fight-payload', 'logicbomb', 12]]) {
    const t = TIPS.find((x) => x.id === id);
    assert.ok(t?.pause && t.page === 'combat' && t.text.length <= 200, id);
    const s = fight(family, level, genes), off = fight('ransomware', level);
    assert.ok(onPage(hudMarkup(s) + boardMarkup(s))(t.at), `${id}: ${t.at} is on the board`);
    assert.ok(!onPage(hudMarkup(off) + boardMarkup(off))(t.at), `${id}: not on a Ransomware's`);
  }
});

// A tip whose selector names a class or id no markup ever writes can never show (the old file-system runs' tips, the
// store page's). Every class and id a tip points at must be written by some module's markup: literally, or as a
// prefix built with a template (`k-${room.kind}`).
test('every tip points at something the game draws', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const dir = new URL('./dist/', import.meta.url);
  const src = readdirSync(dir).filter((f) => /\.(mjs|js|html)$/.test(f) && f !== 'tips.mjs').map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
  const drawn = (name) => new RegExp(`(^|[^\\w-])${name}([^\\w-]|$)`).test(src)
    || [...name.matchAll(/-/g)].some((m) => src.includes(`${name.slice(0, m.index + 1)}\${`));
  const missing = [];
  for (const t of TIPS) for (const sel of [t.at, t.also, t.under].filter(Boolean)) {
    for (const [, name] of sel.matchAll(/[.#]([a-zA-Z][\w-]*)/g)) if (!drawn(name)) missing.push(`${t.id}: ${name}`);
  }
  assert.deepEqual(missing, []);
});

// wick narrates the guided path (tips.mjs wick): the opening pointer, the rooms tour, the first fight and a few firsts.
// His lines are lowercase, as he writes, and the rest of the tips keep the plain voice.
test('wick narrates the guided path, in his own voice, and nothing else', async () => {
  const guided = ['map-start', 'tour-walk', 'tour-engage', 'tour-cache', 'tour-hunter', 'tour-rest', 'tour-jackout',
    'fight-timeline', 'fight-keys', 'fight-ticks', 'fight-armor', 'sync', 'run-signal', 'run-rival', 'room-vault', 'room-core', 'fight-crown'];
  assert.deepEqual(TIPS.filter((t) => t.wick).map((t) => t.id).sort(), [...guided].sort());
  for (const t of TIPS.filter((x) => x.wick)) assert.equal(t.text, t.text.toLowerCase(), `${t.id} is in wick's lowercase`);
  // A rival's tip opens with wick's line on that rival.
  const FP = await import('./dist/floorplan.mjs');
  const RV = await import('./dist/rivals.mjs');
  const s = fresh(); s.tutorialCompleted = true;
  FP.startRooms(s, { seed: 7, size: 'medium', floor: 3, level: 12 }); FP.connect(s);
  RV.spawnRival(s, 99, 'kudzu');
  const t = nextTip(s, 'rooms', (sel) => sel === '.fp-rvstat');
  assert.equal(t.id, 'run-rival');
  assert.ok(t.text.startsWith(RV.wickLine(s, RV.rivalOf(s)) + ' '), t.text);
});

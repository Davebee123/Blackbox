// First-time tips: the only tutorial. One at a time, once each, only where their thing is on screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, restore } from './dist/combat.mjs';
import { TIPS, nextTip, markSeen } from './dist/tips.mjs';
import { mapMarkup, serverMarkup, protocolsMarkup, craftMarkup, loadoutMarkup, daemonsMarkup, systemMarkup, boardMarkup, hudMarkup } from './dist/view.mjs';

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
  command(s, 'encounter cryptjack');
  const map = mapMarkup(s, 'server');
  const first = nextTip(s, 'map', onPage(map));
  assert.equal(first.id, 'map-server');
  markSeen(s, first.id);
  assert.equal(nextTip(s, 'map', onPage(map)).id, 'map-zone');
  markSeen(s, 'map-zone');
  assert.equal(nextTip(s, 'map', onPage(map)).id, 'map-intrusion');
  markSeen(s, 'map-intrusion');
  assert.equal(nextTip(s, 'map', onPage(map)), null, 'nothing else on this map yet');
  assert.equal(nextTip(s, 'server', onPage(map)), null, 'map tips stay on the map');
  command(s, 'developer location worm');
  assert.equal(nextTip(s, 'map', onPage(mapMarkup(s, 'server'))).id, 'map-origin', 'a new thing brings its tip');
});

test('fight tips pause the fight and wait for what they explain', () => {
  const s = fresh();
  command(s, 'encounter cryptjack');
  command(s, 'engage');
  const html = hudMarkup(s) + boardMarkup(s) + '<div id="tray"></div>';
  const t = nextTip(s, 'combat', onPage(html));
  assert.equal(t.id, 'fight-timeline');
  assert.ok(t.pause);
  assert.deepEqual(t.covers, ['fight-keys', 'fight-armor', 'sync'], 'the first fight is one pause: board, keys, armor and sync together');
  for (const id of [t.id, ...t.covers]) markSeen(s, id);
  assert.notEqual(nextTip(s, 'combat', onPage(html))?.id, 'fight-keys');
  assert.notEqual(nextTip(s, 'combat', onPage(html))?.id, 'fight-quiet', 'no Trace tip before you have Trace');
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
  const pages = [mapMarkup(s, 'server'), mapMarkup(s, s.locations[0].id), serverMarkup(s), protocolsMarkup(s), craftMarkup(s), loadoutMarkup(s, 'breaker'), daemonsMarkup(s), systemMarkup(s)].join('\n');
  for (const phrase of [/Neutralize intrusions to trace/, /Services run on ports/, /Any protocol goes in any slot/, /Daemons act for you in cycles/, /Each class levels on its own/, /numbers are layers/, /click to target/, /Speed changes seconds per cycle/, /its guards, its vault/]) {
    assert.doesNotMatch(pages, phrase);
  }
  for (const t of TIPS) if (/^(map|server|protocols|loadout|daemons)-/.test(t.id)) assert.ok(t.text.length > 20);
});

test('the newer systems have their tips: a found server’s memory, plans on Craft, and your harvester rack', async () => {
  const { addLocation } = await import('./dist/combat.mjs');
  const s = fresh();
  s.tutorialCompleted = true;
  const loc = addLocation(s, 'worm', 1); // found: not on your network yet
  for (const id of ['map-server', 'map-zone']) markSeen(s, id);
  assert.equal(nextTip(s, 'map', onPage(mapMarkup(s, loc.id))).id, 'map-origin');
  markSeen(s, 'map-origin');
  assert.equal(nextTip(s, 'map', onPage(mapMarkup(s, loc.id, undefined, { side: true }))).id, 'map-memory', 'its card: what joining costs');
  command(s, 'attach ' + loc.id);
  loc.takenOver = true;
  assert.equal(nextTip(s, 'craft', onPage(craftMarkup(s))).id, 'craft-plans', 'where recipes come from');
  s.harvesters = [{ kind: 'siphon', level: 1, traits: [] }];
  markSeen(s, 'map-memory'); markSeen(s, 'map-owned');
  assert.equal(nextTip(s, 'map', onPage(mapMarkup(s, loc.id, undefined, { side: true }))).id, 'map-install');
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

test('every threat on the map has a tip, and none says a lost outpost is gone for good', () => {
  const has = (sel) => TIPS.some((t) => t.page === 'map' && t.at === sel);
  for (const sel of ['.mnode.intrusion', '.mnode.invader[data-select="invader"]', '.mnode.invader.siege[data-select="invader"]', '.mnode.invader.breach', '.mnode.besieged', '.mnode.locked', '.mnode.fleet', '.mnode.hub.yours.threat', '.mnode.invader[data-select="roamer"]', '.mnode.member.besieged', '.mnode.member.down']) assert.ok(has(sel), sel);
  for (const t of TIPS) assert.doesNotMatch(t.text, /take (it|the outpost) back|take the outpost|cut off/, t.id);
});

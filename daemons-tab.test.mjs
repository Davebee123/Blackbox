// The Loadout's Daemons tab (dist/daemons-view.mjs): the party with its 12-cycle bars and the order of play for a
// cycle, the bench, the roster of forty and the panel. The timing comes from daemons.mjs (daemonCycles, playOrder),
// checked here against a real fight; every action (slot, unslot, swap) is a button on the tab.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, command, resolveCycle, selectEncounter, gainDaemon, daemonSlots } from './dist/combat.mjs';
import { DAEMONS, CONFIG } from './dist/data.mjs';
import { daemonCycles, playOrder, daemonText } from './dist/daemons.mjs';
import { daemonsMarkup, daemonUi, loadoutMarkup } from './dist/view.mjs';
import { panelMarkup, orderMarkup, actsLine, TRIGGER, unitOf, dropLevels, CYCLES } from './dist/daemons-view.mjs';
import { sprite } from './dist/daemon-sprites.mjs';

CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;
const IDS = Object.keys(DAEMONS);
const reset = (x = {}) => Object.assign(daemonUi, { view: 'party', sel: null, cycle: 1 }, x);
// A level-30 Operator with a party of five and a few more on the bench.
function herder(party = ['overseer', 'cron', 'kindle', 'capacitor', 'lookout'], bench = { drill: 30, flare: 26, sweeper: 9 }) {
  const s = fresh();
  s.hackers = { operator: { level: 30, xp: 0 } };
  s.loadout = { ...(s.loadout || {}), archetype: 'operator' };
  for (const id of party) gainDaemon(s, id, 28);
  for (const [id, L] of Object.entries(bench)) gainDaemon(s, id, L);
  s.daemons = [...party];
  return s;
}
// The cells of one party row, as the cycles they light.
function litCells(html, id) {
  const from = html.indexOf(`class="dm-who" data-dmn-sel="${id}"`);
  assert.ok(from >= 0, `${id} has a row`);
  const row = html.slice(from, html.indexOf('class="dm-who', from + 10) > 0 ? html.indexOf('class="dm-who', from + 10) : undefined);
  return [...row.matchAll(/class="dm-cell on[^"]*" data-dmn-cycle="(\d+)"/g)].map((m) => Number(m[1]));
}

test('the party timeline follows the daemon rules: an every-3 daemon lights cycles 1, 4, 7 and 10', () => {
  assert.equal(CYCLES, 12);
  assert.deepEqual(daemonCycles('cron'), [1, 4, 7, 10]);
  assert.deepEqual(daemonCycles('overseer'), [1, 3, 5, 7, 9, 11]);
  assert.deepEqual(daemonCycles('void'), [1, 9]);
  assert.deepEqual(daemonCycles('lookout'), [], 'a triggered daemon has no timer');
  for (const id of IDS) if (DAEMONS[id].cd) assert.deepEqual(daemonCycles(id), Array.from({ length: 12 }, (_, i) => i + 1).filter((c) => (c - 1) % DAEMONS[id].cd === 0), id);
  reset();
  const html = daemonsMarkup(herder());
  assert.deepEqual(litCells(html, 'cron'), [1, 4, 7, 10]);
  assert.deepEqual(litCells(html, 'overseer'), [1, 3, 5, 7, 9, 11]);
  assert.deepEqual(litCells(html, 'capacitor'), [1, 6, 11]);
  // You act every cycle; a triggered daemon gets a dashed lane with its trigger, not cells.
  assert.equal((html.match(/class="dm-cell me/g) || []).length, 12);
  assert.match(html, /<span class="dm-lane" title="When a part starts winding up a tell"><span class="dm-lt">When a part starts winding up a tell<\/span><\/span>/);
  assert.deepEqual(litCells(html, 'lookout'), []);
});

test('the timeline is the real one: in a fight, each cooldown daemon acts in exactly the cycles its bar lights', () => {
  const s = fresh();
  s.hackers = { breaker: { level: 20, xp: 0 } };
  const party = ['overseer', 'cron', 'capacitor'];
  for (const id of party) gainDaemon(s, id, 20);
  s.daemons = [...party];
  assert.equal(daemonSlots(s), 3);
  selectEncounter(s, 'cryptjack', 7, { level: 20 });
  command(s, 'engage');
  const e = s.encounter;
  e.virus.tells = null;
  for (const p of e.virus.parts) Object.assign(p, { integrity: 1e6, max: 1e6, armor: 0, maxArmor: 0 }, p.attack ? { attack: { ...p.attack, due: 999 } } : {});
  for (let c = 1; c <= 12; c++) { command(s, 'hold'); resolveCycle(s); }
  assert.ok(e.cycle > 12, 'twelve cycles played');
  for (const id of party) {
    const acted = [...new Set(s.logs.filter((x) => x.daemon === id && x.auto === 'daemon').map((x) => x.cycle))].filter((c) => c <= 12);
    assert.deepEqual(acted, daemonCycles(id), `${id} acted in ${acted}`);
  }
  // And in party order within a cycle (cycle 7: Overseer, then Cron Job).
  const seven = s.logs.filter((x) => x.cycle === 7 && x.auto === 'daemon').map((x) => x.daemon);
  assert.deepEqual([...new Set(seven)], ['overseer', 'cron']);
});

test('the order of play for a picked cycle: you, the daemons in party order, burns and helpers, the virus; triggers armed beside it', () => {
  const s = herder(['airbag', 'overseer', 'cron', 'lookout', 'canary']);
  assert.deepEqual(playOrder(s, 7), { start: [], daemons: ['overseer', 'cron'], armed: ['lookout', 'canary'] });
  assert.deepEqual(playOrder(s, 1).start, ['airbag'], 'an Airbag goes as the fight starts');
  assert.deepEqual(playOrder(s, 2).daemons, []);
  const strip = orderMarkup(s, 7).replace(/ title="[^"]*"/g, '');
  const steps = strip.match(/<span class="dm-steps">(.*?)<\/span><span class="dm-armed">/)[1].replace(/<span class="dm-gt" aria-hidden="true">▸<\/span>/g, ' ▸ ').replace(/<[^>]+>/g, '');
  assert.equal(steps, 'You ▸ Overseer ▸ Cron Job ▸ Burns and helpers ▸ The virus');
  assert.match(strip, /dm-armed"><span class="dm-st armed">Lookout · when a part starts winding up a tell<\/span><span class="dm-st armed">Canary · when you drop below half health, once a fight<\/span>/);
  assert.match(orderMarkup(s, 1).replace(/ title="[^"]*"/g, ''), /dm-steps"><span class="dm-st dm">Airbag<\/span><span class="dm-gt"[^>]*>▸<\/span><span class="dm-st you">You/);
  // The tab shows the picked cycle's strip, and the cycle buttons pick it.
  reset({ cycle: 4 });
  const html = daemonsMarkup(s);
  assert.match(html, /aria-label="Order of play in cycle 4"/);
  assert.match(html, /<button type="button" class="dm-ch" data-dmn-cycle="4" aria-pressed="true"/);
  assert.equal((html.match(/class="dm-ch" data-dmn-cycle="\d+"/g) || []).length, 12);
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.match(app, /closest\('\[data-dmn-view\], \[data-dmn-sel\], \[data-dmn-cycle\]'\)/, 'app.js handles the picks');
  reset();
});

test('slot, unslot and swap are buttons on the tab, and the commands they run work', () => {
  const s = herder(['overseer', 'cron'], { drill: 30, flare: 26 });
  s.hackers.operator.level = 14; // three slots: two, and the Operator's thread
  assert.equal(daemonSlots(s), 3);
  reset();
  // Room in the party: Slot.
  assert.match(panelMarkup(s, 'drill'), /<button type="button" class="btn primary" data-command="daemon slot drill">Slot<\/button>/);
  command(s, 'daemon slot drill');
  assert.deepEqual(s.daemons, ['overseer', 'cron', 'drill']);
  // A slotted one: Unslot.
  assert.match(panelMarkup(s, 'cron'), /data-command="daemon unslot cron">Unslot<\/button>/);
  // A full party: Swap with each of them, and the swap keeps the slot's place.
  const full = panelMarkup(s, 'flare');
  for (const o of ['overseer', 'cron', 'drill']) assert.match(full, new RegExp(`data-command="daemon swap ${o} flare"[^>]*>[\\s\\S]*?Swap with ${DAEMONS[o].name}</button>`));
  assert.doesNotMatch(full, /daemon slot flare/);
  command(s, 'daemon swap cron flare');
  assert.deepEqual(s.daemons, ['overseer', 'flare', 'drill']);
  command(s, 'daemon swap drill cron job'); // either order, and a name of two words
  assert.deepEqual(s.daemons, ['overseer', 'flare', 'cron']);
  command(s, 'daemon unslot flare');
  assert.deepEqual(s.daemons, ['overseer', 'cron']);
  command(s, 'daemon swap drill sweeper');
  assert.match(s.logs.at(-1).message, /Neither|don't have/);
  // Every button the tab shows runs a daemon command, and they're off in a fight.
  const html = daemonsMarkup(s) + panelMarkup(s, 'cron') + panelMarkup(s, 'drill');
  for (const m of html.matchAll(/data-command="([^"]+)"/g)) assert.match(m[1], /^daemon (slot|unslot|swap) \w+( \w+)?$/);
  selectEncounter(s, 'cryptjack', 7, { level: 14 });
  command(s, 'engage');
  assert.match(panelMarkup(s, 'drill'), /data-command="daemon slot drill" disabled title="Between fights"/);
  command(s, 'daemon swap cron drill');
  assert.match(s.logs.at(-1).message, /between fights/);
});

test('the bench holds what you have but have not slotted; the roster all forty, the unfound as silhouettes', () => {
  const s = herder();
  reset();
  const party = daemonsMarkup(s);
  const bench = party.slice(party.indexOf('aria-label="Bench"'));
  for (const id of ['drill', 'flare', 'sweeper']) assert.match(bench, new RegExp(`data-dmn-sel="${id}"`));
  for (const id of s.daemons) assert.doesNotMatch(bench, new RegExp(`data-dmn-sel="${id}"`));
  assert.match(party, /<button type="button" data-dmn-view="party" aria-pressed="true"[^>]*>Party<small>5\/5<\/small>/);
  assert.match(party, /data-dmn-view="roster" aria-pressed="false"[^>]*>Roster<small>8\/40<\/small>/, 'the roster count: found, of 40');
  assert.match(party, /<div class="dm-who locked" title="[^"]*45[^"]*">Slot 6 · level 45<\/div>/, 'the locked slot shows its level');
  reset({ view: 'roster' });
  const roster = daemonsMarkup(s);
  assert.equal((roster.match(/class="dm-row( unk)?" data-dmn-sel=/g) || []).length, 40);
  assert.equal((roster.match(/class="dm-row unk"/g) || []).length, 32);
  assert.equal((roster.match(/class="spr ghost"/g) || []).length, 32, 'an unfound one is its silhouette');
  for (const id of IDS.filter((k) => !s.daemonLv[k])) {
    const row = roster.slice(roster.indexOf(`data-dmn-sel="${id}"`), roster.indexOf('</button>', roster.indexOf(`data-dmn-sel="${id}"`)));
    assert.ok(!row.includes(DAEMONS[id].name), `${id} keeps its name`);
    assert.ok(row.includes(sprite(id).ghost[3].trim()), `${id}'s own silhouette`);
    assert.ok(!panelMarkup(s, id).includes(DAEMONS[id].name) && !panelMarkup(s, id).includes(daemonText(id, 30)), `${id}'s panel keeps it hidden`);
  }
  assert.match(roster, /<h4 title="Invasions at levels 16–25 drop these">Levels 16–25<small>4\/8<\/small><\/h4>/);
  assert.deepEqual([1, 2, 3, 4, 5].map(dropLevels), [[1, 6], [7, 15], [16, 25], [26, 37], [38, 50]]);
  reset();
});

test('the panel: plain words, the rule highlighted only here, the detail in tooltips, no jargon', () => {
  const s = herder();
  reset({ sel: 'flare' });
  const p = panelMarkup(s, 'flare');
  const face = p.replace(/ title="[^"]*"/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(face, /Flare Level 26/);
  assert.match(p, /<p class="dm-does">.*<b class="hi">.*10 damage/);
  assert.match(face, /Acts Every 6 cycles, after you/);
  assert.match(face, /Gets stronger 10 damage now, 15 at level 50/);
  assert.match(face, /Found in Invasions from The Stacks, Coldline and Deep Core \(levels 16–25\)/);
  assert.match(face, /Scrap for 12 code/);
  assert.match(p, /title="[^"]*% of the daemons invasions drop at your level \(30\)[^"]*35%[^"]*"/, 'the odds are in a tooltip');
  assert.doesNotMatch(face, /%/, 'not on the face');
  // No jargon on any panel or the tab's labels.
  const all = IDS.map((id) => panelMarkup(s, id)).join('\n');
  for (const word of [/\bband\b/i, /habitat/i, /\bden\b/i, /bestiary/i, /No\. ?\d/, /⟳/, /\bLV \d/, /\bHITS\b/, /\bNUMBER\b/, /\bDROPS\b/, /\bSCRAP\b/]) assert.doesNotMatch(all, word, String(word));
  assert.doesNotMatch(all, /\bbench\b/i, 'the buttons use the game\'s own verbs');
  // Rule highlights appear only in the panel: nothing else on the tab carries them.
  reset();
  const tab = daemonsMarkup(s);
  const outside = tab.slice(0, tab.indexOf('<aside'));
  assert.doesNotMatch(outside, /class="hi"/);
  assert.match(tab.slice(tab.indexOf('<aside')), /class="hi"/);
  // Every trigger reads as a sentence; every number has a unit.
  for (const id of IDS) {
    if (!DAEMONS[id].cd) assert.ok(TRIGGER[DAEMONS[id].on], id);
    assert.match(actsLine(id), /^[A-Z]/);
    assert.ok(unitOf(id).trim(), id);
  }
  assert.equal(unitOf('capacitor'), ' shield');
  assert.equal(unitOf('snapshot'), '% heal');
  assert.equal(actsLine('leash'), 'Every 2 cycles, after you, in an Exfil fight');
  // A phone's sheet opens only for a daemon you picked, and has a close button.
  assert.doesNotMatch(tab, /dm-panel open/);
  reset({ sel: 'cron' });
  assert.match(daemonsMarkup(s), /<aside class="dm-panel open"[^>]*><button type="button" class="dm-close" data-dmn-sel="" aria-label="Close">×<\/button>/);
  reset();
});

test('the tab fits a 390px phone: no fixed width wider than the screen, every column can shrink', () => {
  const css = readFileSync(new URL('./dist/daemons.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const phone = css.slice(css.indexOf('@media (max-width: 900px)'));
  assert.ok(phone.length > 100);
  // The phone's bar: a shrinkable name column and twelve 13px cells, inside 390 less the page and card padding.
  const m = phone.match(/\.dm-turns \{ grid-template-columns: minmax\(0, 1fr\) repeat\(12, (\d+)px\); gap: [^ ]+ (\d+)px; \}/);
  assert.ok(m, 'the phone bar');
  const cells = 12 * Number(m[1]) + 12 * Number(m[2]);
  assert.ok(cells + 120 <= 390 - 2 * 16 - 2 * 14, `twelve cells (${cells}px) and a 120px name fit`);
  // Every grid column on the tab can shrink (minmax(0, …)), or is a small fixed width.
  for (const [, cols] of css.matchAll(/grid-template-columns: ([^;]+);/g)) {
    for (const px of cols.matchAll(/(?<!minmax\()(\d+)px/g)) assert.ok(Number(px[1]) <= 360, `${cols}`);
  }
  for (const [, w] of phone.matchAll(/(?<![-\w])width: (\d+)px/g)) assert.ok(Number(w) <= 200, `width ${w}px on a phone`);
  // Long words ellipsize: anything nowrap can shrink.
  for (const rule of css.match(/[^{}]+\{[^}]*white-space: nowrap[^}]*\}/g)) assert.match(rule, /overflow: hidden|text-overflow: ellipsis/, rule);
  // The page loads the tab's styles.
  assert.match(readFileSync(new URL('./dist/index.html', import.meta.url), 'utf8'), /<link rel="stylesheet" href="daemons.css">/);
  // And the Loadout page shows it.
  const s = herder();
  assert.match(loadoutMarkup(s, 'operator', 'daemons'), /class="dm-page/);
});

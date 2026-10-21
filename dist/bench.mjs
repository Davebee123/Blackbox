// The test bench (?bench=<name>): a save of its own for playtesting any class or subclass at any level, so the real
// game is never touched. A bench loads and saves under blackbox-bench-<name> (never the real save's key or the
// campaign's), has developer mode on (as ?dev), and wears a BENCH tag in the top bar (app.js).
//   bench <subclass|class> <level>   a ready character on this bench (below SUBCLASS.from the class only): build()
//                                    below, the subclass's rotation preset on the bar, the floors down to that level's
//                                    with you on the deepest, a few servers traced there, full Signal and Integrity
//   bench list                       the bench saves in this browser
//   bench delete <name>              one of them gone (never the one you are on, never the real save)
// The dev panel (PANEL, benchAction) is buttons for the common developer commands: each one only types a command.
// build() is the class-balance sims' character (balance.mjs re-exports it): what a level's talents, gear and slots are.
import { fresh, bindRooms, command, addItem, addLocation, syncServer, emit, warn, hackerLevel, classOf, subOf, presetKeys, UNIQUES } from './combat.mjs';
import { rollItem, seeded, protocolSlots, SLOT_KINDS, chaseStat, uniqueItem } from './gear.mjs';
import { ARCHETYPES, SUBS, SUBCLASS, LOADOUT, FAMILIES, defaultSub, skillOrder, floorFor } from './data.mjs';
import { floorsOf, graphOf, neighbours, serverSlot, locAt, descend } from './floors.mjs';
import { CARDS as EVENT_CARDS } from './events.mjs';
import { PARTS } from './parts.mjs';
import { openFarm } from './rogue.mjs';

// ---------- the save keys ----------
export const SAVE_KEY = 'blackbox-v6'; // the real game's save
export const BENCH_PREFIX = 'blackbox-bench-';
// A bench's name: letters, digits and dashes (up to 32), lower case. Anything else is no bench.
export const benchName = (v) => (typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,31}$/i.test(v) ? v.toLowerCase() : null);
export const benchKey = (name) => BENCH_PREFIX + benchName(name);
// The page's save: { key, bench, camp }. A bench never reads or writes the real save, nor the campaign's (campaignKey).
// A playtest page has no bench (it is never saved at all).
export function pageSave(search, campaignKey) {
  const p = new URLSearchParams(search), playtest = p.get('playtest');
  const bench = playtest ? null : benchName(p.get('bench'));
  if (bench) return { key: benchKey(bench), bench, camp: false };
  const camp = !playtest && p.get('campaign') === 'breach';
  return { key: camp ? campaignKey : SAVE_KEY, bench: null, camp };
}
// The bench saves in a storage (localStorage, or a test's stand-in): their names, sorted.
export function benchList(store) {
  const out = [];
  for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k?.startsWith(BENCH_PREFIX) && benchName(k.slice(BENCH_PREFIX.length))) out.push(k.slice(BENCH_PREFIX.length)); }
  return out.sort();
}
export function benchDelete(store, name) {
  const n = benchName(name);
  if (!n || store.getItem(benchKey(n)) == null) return false;
  store.removeItem(benchKey(n));
  return true;
}

// ---------- the character ----------
// Talents as a player would have them: a point at 10 and every 2 levels after (LOADOUT), spent in a
// fixed order (rank up a row's first node, take the tier's choice, move down). `tree: 'full'` maxes it.
const fillOrder = (F) => [[F[0][0].id, 3], ['c0'], [F[1][0].id, 3], [F[1][1].id, 1], ['c1'], [F[2][0].id, 3], [F[2][1].id, 2], ['c2'], [F[0][1].id, 3], [F[1][1].id, 2], [F[2][1].id, 1]];
export function build(s, cls, b, opts) {
  s.loadout.archetype = cls;
  s.metAll = true; // a veteran: every part met, so the parts roll (dist/parts.mjs) brings its whole mix, strangers and all
  s.hackers = { [cls]: { level: b.level, xp: 0 } };
  // From SUBCLASS.from a subclass (opts.sub, else the class's default): its skill line and tree.
  const sub = b.level >= SUBCLASS.from ? opts.sub || defaultSub(cls) : null, key = sub || cls, kit = SUBS[sub];
  if (sub) s.loadout.sub = { [cls]: sub };
  if (!kit) { /* no tree before the subclass */ }
  else if (b.tree === 'full') { s.loadout.picks[key] = [0, 0, 0]; s.loadout.ranks[key] = Object.fromEntries(kit.fillers.flat().map((n) => [n.id, 3])); }
  else {
    let left = b.level < LOADOUT.talentFrom ? 0 : Math.floor((b.level - LOADOUT.talentFrom) / LOADOUT.talentEvery) + 1;
    const ranks = {}, picks = [];
    for (const [id, n] of fillOrder(kit.fillers)) {
      if (left <= 0) break;
      if (!n) { picks[+id[1]] = (opts.picks || [0, 0, 0])[+id[1]]; left--; } else { const k = Math.min(n, left); ranks[id] = (ranks[id] || 0) + k; left -= k; }
    }
    s.loadout.picks[key] = picks; s.loadout.ranks[key] = ranks;
  }
  if (opts.picks) s.loadout.picks[key] = opts.picks;
  if (opts.ranks) s.loadout.ranks[key] = opts.ranks;
  // The capstone (from level 45, rank 2 at 50): opts.capstone 0 or 1, the first by default; null for none.
  if (kit && b.level >= LOADOUT.capstoneAt[0] && opts.capstone !== null) s.loadout.caps = { [key]: opts.capstone ?? 0 };
  if (opts.extra) s.loadout.equipped[key] = [...skillOrder(cls).slice(0, 4), opts.extra];
  if (opts.bar) s.loadout.equipped[key] = [...opts.bar]; // a bar of your own (the press-diversity test puts each unlock on it)
  // Protocols: a Tuned one in every open slot at the bracket's level, except an implant slot below
  // the level implants start to drop (item level 15). From the subclass, each carries the stat its
  // player chases (the subclass's `chase` list in turn: Restore for a Sysop, Payload for a burn or
  // helper class), as a player would build; a white has no affix to carry one. Services: the bracket's set.
  if (!opts.noGear) {
    const rarity = opts.rarity || 'tuned';
    for (let i = 0; i < protocolSlots(b.level); i++) {
      if (SLOT_KINDS[i] === 'implant' && b.level < 15) continue;
      const stat = opts.randomGear ? undefined : chaseStat(kit?.chase, i, rarity);
      const it = addItem(s, rollItem(seeded(b.level * 100 + i + (opts.gearSeed || 0) * 7919), { level: b.level, rarity, group: SLOT_KINDS[i], stat }));
      command(s, 'load ' + it.id);
    }
  }
  // Uniques in place of the blue in their slot (opts.uniques: ids), at the bracket's level: the native-unique check
  // (network.test.mjs) loads each one this way.
  for (const id of opts.uniques || []) { const it = addItem(s, uniqueItem(UNIQUES[id], b.level, seeded(b.level * 7 + 3))); command(s, 'load ' + it.id); }
  syncServer(s);
  s.server.integrity = s.server.max;
}

// A class or subclass by name: { cls, sub } (sub null for a class), or null.
export function benchKit(name) {
  const n = String(name || '').toLowerCase();
  if (SUBS[n]) return { cls: SUBS[n].cls, sub: n };
  if (ARCHETYPES[n]) return { cls: n, sub: null };
  return null;
}
export const BENCH = { traced: 3 }; // servers traced on your floor

// The floors down to the one your level is on: on each floor above it, a server beside its exit located and the exit
// taken (floors.mjs descend, as a player goes down); on yours, a few servers traced near its entry.
function benchFloors(s, level) {
  const want = floorFor(level);
  floorsOf(s);
  for (let f = 1; f < want; f++) {
    const g = graphOf(s, f), ex = g.exits[0];
    const near = neighbours(s, ex).map((id) => g.nodes[id]).find((n) => serverSlot(n) && !locAt(s, n.id));
    if (near && !neighbours(s, ex).some((id) => locAt(s, id))) addLocation(s, near.family, f, null, near.id);
    if (!descend(s)) break;
  }
  const F = floorsOf(s), n = F.reached;
  F.at = n;
  const found = () => s.locations.filter((l) => l.depth === n && l.slot && !l.member).length;
  for (let guard = 0; found() < BENCH.traced && guard < 20; guard++) {
    const h = (s.hidden || []).filter((x) => x.depth === n && graphOf(s, n).nodes[x.slot]?.kind === 'server').sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level))[0];
    if (!h) break;
    addLocation(s, h.family, n, null, h.slot);
  }
  return n;
}

// bench <subclass|class> <level>: this bench's save becomes that character, ready to play. Settings and the network's
// seed stay; everything else starts over.
export function benchBuild(s, name, level) {
  const kit = benchKit(name), L = Math.max(1, Math.min(LOADOUT.maxLevel, Math.round(Number(level)) || 0));
  if (!kit) return { error: `No class or subclass called ${name}. Try ${[...Object.keys(ARCHETYPES), ...Object.keys(SUBS)].join(', ')}.` };
  if (!(Number(level) >= 1)) return { error: 'usage: bench <subclass|class> <level>' };
  const keep = { settings: s.settings, netSeed: s.netSeed, rng: s.rng, profile: s.profile, serial: s.serial };
  const t = fresh();
  for (const k of Object.keys(s)) delete s[k];
  Object.assign(s, t);
  bindRooms(s);
  s.settings = keep.settings || s.settings;
  s.netSeed = keep.netSeed || 1;
  s.serial = keep.serial || 0; // events keep counting up (the page reads what this command said)
  s.rng = keep.rng ?? s.rng;
  s.tutorialCompleted = true;
  if (!keep.profile) s.settings.tips = false; // a new bench: no first-time tips (tips on brings them back)
  s.profile = keep.profile || { handle: 'bench', pwLen: 6, since: Date.now() };
  const sub = L >= SUBCLASS.from ? kit.sub || defaultSub(kit.cls) : null;
  build(s, kit.cls, { level: L }, { sub });
  if (sub) { s.loadout.equipped[sub] = presetKeys(s, kit.cls, 'rotation'); (s.loadout.follow ||= {})[sub] = 'rotation'; }
  const floor = benchFloors(s, L);
  openFarm(s); // KESSLER-FARM-00, from its level (rogue.mjs): on the map now, not a notice later
  s.signal = null; // full: whatever your max is
  syncServer(s);
  s.server.integrity = s.server.max;
  s.server.credits = Math.max(s.server.credits, 500);
  const who = sub ? `${SUBS[sub].name} (${ARCHETYPES[kit.cls].name})` : ARCHETYPES[kit.cls].name;
  const note = kit.sub && !sub ? ` Subclasses open at level ${SUBCLASS.from}, so this is a plain ${ARCHETYPES[kit.cls].name}.` : '';
  return { ok: true, cls: kit.cls, sub, level: L, floor, message: `Bench: ${who}, level ${L}, on floor ${floor}.${note}` };
}

// bench …: on a bench (bench: its name), or bench list / delete with developer mode on. store: localStorage.
// Returns the events it emitted, as command() does.
export function benchCommand(s, text, { bench = null, dev = false, store = null } = {}) {
  const first = s.serial, words = String(text).trim().toLowerCase().split(/\s+/);
  const out = () => s.logs.filter((e) => e.id > first);
  if (!bench && !(dev && ['list', 'delete'].includes(words[1]))) { warn(s, 'Bench commands work on a test bench. Open the game with ?bench=<name>.'); return out(); }
  if (words[1] === 'list') {
    const names = store ? benchList(store) : [];
    emit(s, 'info', names.length ? `Benches in this browser: ${names.map((n) => (n === bench ? `${n} (this one)` : n)).join(', ')}.` : 'No bench saves in this browser yet.');
    return out();
  }
  if (words[1] === 'delete') {
    const n = benchName(words[2]);
    if (!n) warn(s, 'usage: bench delete <name>');
    else if (n === bench) warn(s, `You are on bench ${n}. Open another bench to delete it, or type reset game to start this one over.`);
    else if (!store || !benchDelete(store, n)) warn(s, `No bench called ${n}.`);
    else emit(s, 'info', `Bench ${n} deleted.`);
    return out();
  }
  if (words.length !== 3 || !/^\d+$/.test(words[2])) { warn(s, 'usage: bench <subclass|class> <level> · bench list · bench delete <name>'); return out(); }
  const r = benchBuild(s, words[1], words[2]);
  if (r.error) warn(s, r.error); else emit(s, 'bench', r.message, { bench: r });
  return out();
}

// ---------- the dev panel ----------
// Each button types one command (benchAction). icon: a glyph; label: a word or two; title: the tooltip; fields: the
// pickers in its row it reads (level, kit, event, family, seed, part).
export const PANEL = [
  { group: 'Level', items: [
    { id: 'lv-5', icon: '«', label: '5', title: 'Five levels down (developer level)' },
    { id: 'lv-1', icon: '‹', label: '1', title: 'A level down (developer level)' },
    { id: 'lv+1', icon: '›', label: '1', title: 'A level up (developer level)' },
    { id: 'lv+5', icon: '»', label: '5', title: 'Five levels up (developer level)' },
    { id: 'lv', icon: '↦', label: 'Set', title: 'Set your level (developer level <n>)', fields: ['level'] },
  ] },
  { group: 'Build', items: [
    { id: 'build', icon: '⚙', label: 'Build', title: 'Start this bench over as that class or subclass at that level: talents, Tuned gear, floors (bench <subclass|class> <level>)', fields: ['kit', 'level'] },
  ] },
  { group: 'Top up', items: [
    { id: 'refill', icon: '♥', label: 'Refill', title: 'Signal and Integrity to full (developer refill)' },
    { id: 'credits', icon: '¤', label: '1000', title: 'A thousand credits (developer credits 1000)' },
    { id: 'code', icon: '⌗', label: 'Code', title: 'Fifty of each code and five exploits (developer code 50)' },
    { id: 'components', icon: '◫', label: 'Parts', title: 'Fifty components to build with (developer components 50)' },
  ] },
  { group: 'Event', items: [
    { id: 'event', icon: '✦', label: 'Deal', title: 'An event now: the card picked, or any that fits (developer event [card])', fields: ['event'] },
  ] },
  { group: 'Fight', items: [
    { id: 'fight', icon: '⚔', label: 'Fight', title: 'A fight at home now: family, level (yours if empty) and seed (developer fight <family|random> <level> <seed>)', fields: ['family', 'level', 'seed'] },
  ] },
  { group: 'Part', items: [
    { id: 'part', icon: '◈', label: 'Fight', title: 'A fight with that part in it, at the level it opens if empty (developer fight part:<id> [level])', fields: ['part', 'level'] },
  ] },
  { group: 'Parts', items: [
    { id: 'parts-on', icon: '⇄', label: 'Roll', title: 'The parts roll on or off (developer parts on 1|0)', toggle: true },
    { id: 'parts', icon: '≡', label: 'Numbers', title: 'The parts numbers and the mix at your level (developer parts)' },
  ] },
  { group: 'Bench', items: [
    { id: 'list', icon: '☰', label: 'List', title: 'The bench saves in this browser (bench list)' },
    { id: 'reset', icon: '⟲', label: 'Reset', title: 'Start this bench over at the class picker: press twice (reset game)' },
  ] },
];
export const PANEL_IDS = PANEL.flatMap((g) => g.items.map((x) => x.id));
// What the panel offers in its pickers.
export const panelKits = () => [...Object.keys(SUBS), ...Object.keys(ARCHETYPES)];
export const panelEvents = () => Object.keys(EVENT_CARDS).filter((k) => !EVENT_CARDS[k].chain);
export const panelFamilies = () => ['random', ...Object.keys(FAMILIES)];
export const panelParts = () => [...new Set(Object.values(FAMILIES).flatMap((f) => f.parts.map((p) => p.id)))];
// The command a panel button types. v: its row's fields { level, kit, event, family, seed, part }.
export function benchAction(s, id, v = {}) {
  const L = hackerLevel(s), clamp = (n) => Math.max(1, Math.min(LOADOUT.maxLevel, Math.round(Number(n)) || L));
  const lv = /^lv([+-]\d+)$/.exec(id);
  if (lv) return `developer level ${clamp(L + Number(lv[1]))}`;
  switch (id) {
    case 'lv': return `developer level ${clamp(v.level)}`;
    case 'build': return `bench ${benchKit(v.kit) ? String(v.kit).toLowerCase() : subOf(s) || classOf(s)} ${clamp(v.level)}`;
    case 'refill': return 'developer refill';
    case 'credits': return 'developer credits 1000';
    case 'code': return 'developer code 50';
    case 'components': return 'developer components 50';
    case 'event': return v.event && panelEvents().includes(v.event) ? `developer event ${v.event}` : 'developer event';
    case 'fight': return `developer fight ${panelFamilies().includes(v.family) ? v.family : 'random'} ${clamp(v.level)} ${Math.max(1, Number(v.seed) >>> 0 || 1)}`;
    case 'part': return `developer fight part:${panelParts().includes(v.part) ? v.part : panelParts()[0]}${Number(v.level) >= 1 ? ` ${clamp(v.level)}` : ''}`;
    case 'parts-on': return `developer parts on ${PARTS.on ? 0 : 1}`;
    case 'parts': return 'developer parts';
    case 'list': return 'bench list';
    case 'reset': return 'reset game';
    default: return null;
  }
}
// The panel (app.js puts it in a drawer at the bottom of the screen on a bench): a row a group, its pickers, its buttons.
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const options = (xs, name, pick) => xs.map((x) => `<option value="${esc(x)}"${x === pick ? ' selected' : ''}>${esc(name(x))}</option>`).join('');
const partName = (id) => Object.values(FAMILIES).flatMap((f) => f.parts).find((p) => p.id === id)?.name || id;
function field(s, f) {
  if (f === 'level') return `<input class="bp-num" type="number" min="1" max="${LOADOUT.maxLevel}" placeholder="lv" data-bench-field="level" aria-label="Level" title="Level (yours if empty)">`;
  if (f === 'seed') return '<input class="bp-num" type="number" min="1" placeholder="seed" data-bench-field="seed" aria-label="Seed" title="Seed: the same seed is the same fight">';
  if (f === 'kit') return `<select data-bench-field="kit" aria-label="Class or subclass" title="Class or subclass">${options(panelKits(), (k) => SUBS[k]?.name || ARCHETYPES[k].name, subOf(s) || classOf(s))}</select>`;
  if (f === 'event') return `<select data-bench-field="event" aria-label="Event card" title="Event card"><option value="">Any card</option>${options(panelEvents(), (k) => EVENT_CARDS[k].name || k)}</select>`;
  if (f === 'family') return `<select data-bench-field="family" aria-label="Family" title="Family">${options(panelFamilies(), (k) => (k === 'random' ? 'Any family' : FAMILIES[k].name))}</select>`;
  if (f === 'part') return `<select data-bench-field="part" aria-label="Part" title="Part">${options(panelParts(), partName)}</select>`;
  return '';
}
export function panelMarkup(s) {
  const row = (g) => `<div class="bp-row" role="group" aria-label="${esc(g.group)}"><span class="bp-label">${esc(g.group)}</span>${[...new Set(g.items.flatMap((x) => x.fields || []))].map((f) => field(s, f)).join('')}${g.items.map((x) => `<button type="button" class="bp-btn" data-bench-act="${esc(x.id)}" title="${esc(x.title)}"${x.toggle ? ` aria-pressed="${PARTS.on}"` : ''}><span class="bp-ico" aria-hidden="true">${esc(x.icon)}</span>${esc(x.label)}</button>`).join('')}</div>`;
  return PANEL.map(row).join('');
}

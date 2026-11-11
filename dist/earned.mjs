// Earned pieces (docs/loot-plan.md *Earned pieces*, GAME_RULES.md *Earned pieces*): set pieces and floor uniques that
// come from finishing an activity, never a roll. A piece carrying `earn` (content/items.mjs) has a count; the count
// starts when you reach its band (its set's first level, a floor feat's floor's), and when it fills the piece arrives
// once, at your level, through addItem (the reward card's *New in collection*). They sit outside the one-an-hour rate.
//   earn: { n }                       events matching the piece's sources (sets.mjs fromHere), counted in setDrop
//   earn: { n, on: [src] }            events matching `on` instead (a floor feat's: bait, a Router vault, a takeover)
//   earn: { n, distinct: 'strain' }   different ones, by that field of the event (Seam's strains, Mixed Bag's specials)
//   earn: { state, floor, n? }        what a floor shows now: mapped, held, root (Root 3), elites, located; no n: all
// The engine reaches this module through hooks (combat.mjs setDrop, floorplan.mjs takeCache, profile.mjs tickProfile),
// so it adds no import cycle; netrooms.mjs and view.mjs load it.
//   earnedOf(s, id)    a piece's count: { n, of, from (its band), open, got, text, short, todo }
//   earnEvent(s, ctx)  an event (a source's ctx, as setDrop takes it): counts it, and pays a piece whose count fills
//   earnTick(s)        every second: the floor goals, paid once full
//   pinsOf, pinCommand up to three pins (s.pins), shown on the map under Contracts
import { hooks, emit, warn, addItem, hackerLevel, rand, UNIQUES } from './combat.mjs';
import { FLOORS, GUARDS, FAMILIES } from './data.mjs';
import { uniqueItem } from './gear.mjs';
import { SETS, setOf, fromHere } from './sets.mjs';
import { PUZZLES } from './puzzles.mjs';
import { floorGraph, floorSeed, locAt, serverSlot, floorName } from './floors.mjs';
import { owned, rootOf } from './root.mjs';
import { sizeOf } from './sockets.mjs';
import { specialsOf } from './specials.mjs';

export const EARNED = Object.values(UNIQUES).filter((u) => u.earn);
export const isEarned = (id) => !!UNIQUES[id]?.earn;
export const PIN_MAX = 3;
// A count past this many draws one cell for two (the Ledger's and the map's cells).
export const CELLS = 8;

const plural = (k, one, many = one + 's') => `${k} ${k === 1 ? one : many}`;
const floors = (f) => (Array.isArray(f) ? (f[0] === f[1] ? `floor ${f[0]}` : `floors ${f[0]}–${f[1]}`) : `floor ${f}`);
// Its band: a set piece's set's first level, a floor feat's floor's first.
export const bandOf = (u) => (u.set ? SETS[u.set]?.levels?.[0] || u.level : FLOORS[(u.earn.floor || 1) - 1]?.band[0] || u.level);
const onOf = (u) => u.earn.on || u.sources || [];

// What it asks, as the Ledger, the datasheet and the map say it: text (Cascade boards), short (Cascade), and todo(k),
// the tooltip's answer (Win 2 more Cascade boards).
function goalOf(u) {
  const E = u.earn, src = onOf(u)[0] || {}, F = E.floor && floorName(E.floor);
  if (E.state === 'mapped') return { text: `${F} mapped`, short: 'Mapped', todo: (k) => `Map ${plural(k, 'more server')} on ${F}` };
  if (E.state === 'held') return { text: `${F} held`, short: 'Held', todo: (k) => `Hold ${plural(k, 'more server')} on ${F}` };
  if (E.state === 'root') return { text: 'Root 3 servers', short: 'Root 3', todo: (k) => `Reach Root 3 on ${plural(k, 'more server')} on ${F}` };
  if (E.state === 'elites') return { text: 'Elite rooms', short: 'Elites', todo: (k) => `Clear ${plural(k, 'more elite room')} on ${F}, on every server there` };
  if (E.state === 'located') return { text: `${F} located`, short: 'Located', todo: (k) => `Locate ${plural(k, 'more server')} on ${F}` };
  switch (src.kind) {
    case 'thread': return { text: 'Threads', short: 'Threads', todo: (k) => `Finish ${plural(k, 'more thread')} on ${floors(src.floor)}` };
    case 'guard': { const g = GUARDS[src.id]?.name || src.id; return { text: `${g} kills`, short: g, todo: (k) => `Beat the ${g} ${plural(k, 'more time')}` }; }
    case 'strain': {
      if (E.distinct) return { text: 'Strains', short: 'Strains', todo: (k) => `Kill ${plural(k, 'more strain')} you haven't killed since` };
      const f = FAMILIES[src.lineage]?.name || src.lineage;
      return { text: `${f} strains`, short: f, todo: (k) => `Kill ${plural(k, `more ${f.toLowerCase()} strain`)}` };
    }
    case 'courier': return { text: 'Couriers', short: 'Couriers', todo: (k) => `Intercept ${plural(k, 'more courier')}` };
    case 'vault': { const w = !Array.isArray(src.floor) ? floorName(src.floor) : null; return { text: w ? `${w} vaults` : 'Vaults', short: 'Vaults', todo: (k) => `Open ${plural(k, 'more vault')} on ${w || floors(src.floor)}` }; }
    case 'puzzle': { const p = PUZZLES[src.id]?.name || src.id; return { text: `${p} boards`, short: p, todo: (k) => `Win ${plural(k, `more ${p} board`)}` }; }
    case 'rare': return { text: '★ rare spawns', short: '★ rares', todo: (k) => `Kill ${plural(k, 'more ★ rare spawn')} on floor ${Array.isArray(src.floor) ? src.floor[0] : src.floor} or deeper` };
    case 'takeover': return E.distinct
      ? { text: 'Specials taken', short: 'Specials', todo: (k) => `Take over servers on ${floorName(src.floor)} with ${plural(k, 'more special')}` }
      : { text: 'Takeovers', short: 'Takeovers', todo: (k) => `Take over ${plural(k, 'more server')} on ${floors(src.floor)}` };
    case 'router-vault': return { text: 'Router vaults', short: 'Routers', todo: (k) => `Bank ${plural(k, 'more Router vault')}, the Tracker never reaching you` };
    case 'bait': return { text: 'Honeypot bait', short: 'Bait', todo: (k) => `Take ${plural(k, 'more bait cache')} on Honeypots` };
    default: return { text: '', short: '', todo: () => '' };
  }
}

// ---------- the floor goals ----------
// A floor's graph, read without floors.mjs graphOf's set-up (it would reset a save's floors that has no seed yet).
const slotsOn = (s, f) => Object.entries(floorGraph(s.floors?.seed || floorSeed(s), f).nodes).filter(([, x]) => serverSlot(x)).map(([id]) => id);
// A server's elite rooms: its floorplan's once built, else its size's (floorplan.mjs builds small 0, medium 1, large 2).
const ELITES = { small: 0, medium: 1, large: 2 };
function elitesOf(loc) {
  const R = loc.floorplan;
  if (!R?.graph) return { n: 0, of: ELITES[sizeOf(loc).id] ?? 1 };
  const rooms = Object.values(R.graph.rooms).filter((x) => x.kind === 'elite');
  return { n: rooms.filter((x) => R.cleared?.[x.id]).length, of: rooms.length };
}
// Elite rooms cleared on a floor (each once, for good), of those on its servers: a server you haven't located counts as
// one (about a server's average) until you do. all: every slot located.
export function floorElites(s, f) {
  const locs = slotsOn(s, f).map((id) => locAt(s, id)), e = locs.filter((l) => l && !l.lair).map(elitesOf), unseen = locs.filter((l) => !l).length;
  return { n: e.reduce((a, x) => a + x.n, 0), of: e.reduce((a, x) => a + x.of, 0) + unseen, all: !unseen };
}
// The servers you hold on a floor (root.mjs owned), and those at Root 3 or more.
export const floorHeld = (s, f, root = 1) => slotsOn(s, f).filter((id) => rootOf(locAt(s, id)) >= root && owned(locAt(s, id))).length;
function stateOf(s, u) {
  const E = u.earn, ids = slotsOn(s, E.floor), at = (id) => locAt(s, id);
  if (E.state === 'mapped') return { n: ids.filter((id) => at(id)?.floorplan?.mapped).length, of: E.n || ids.length };
  if (E.state === 'held') return { n: floorHeld(s, E.floor), of: E.n || ids.length };
  if (E.state === 'root') return { n: floorHeld(s, E.floor, E.root || 3), of: E.n || ids.length };
  if (E.state === 'located') return { n: ids.filter((id) => at(id)).length, of: E.n || ids.length };
  if (E.state === 'elites') { const x = floorElites(s, E.floor); return { n: x.n, of: Math.max(1, x.of), full: x.all && x.n >= x.of && x.of > 0 }; }
  return { n: 0, of: 1 };
}

// ---------- the count ----------
const counted = (s, u) => { const v = s.earned?.[u.id]; return Array.isArray(v) ? v.length : Number(v) || 0; };
export function earnedOf(s, id) {
  const u = UNIQUES[id];
  if (!u?.earn) return null;
  const from = bandOf(u), open = hackerLevel(s) >= from, got = !!s.collection?.[id], g = goalOf(u);
  const st = u.earn.state ? stateOf(s, u) : { n: counted(s, u), of: u.earn.n };
  const n = Math.min(st.of, st.n), full = st.full ?? n >= st.of;
  return { id, n: got ? st.of : n, of: st.of, from, open, got, full, text: g.text, short: g.short, todo: g.todo(Math.max(1, st.of - n)), set: setOf(id)?.id || null };
}
// The cells a count draws: one a count, past CELLS one for two. [lit, all].
export const cellsOf = (n, of) => { const k = of > CELLS ? 2 : 1; return [Math.floor(n / k), Math.ceil(of / k)]; };

function pay(s, u, why) {
  if (s.collection?.[u.id]) return null;
  const it = addItem(s, uniqueItem(u, Math.max(u.level, hackerLevel(s)), () => rand(s)), `Earned (${why}): `);
  if (s.pins) s.pins = s.pins.filter((x) => x !== u.id);
  return it;
}
// An event: each earned piece it counts for (in its band, not found yet) counts it, and pays once full.
// ctx: a source's ctx (sets.mjs fromHere: { kind, id, floor, layer, lineage }), with strain and special for distinct.
export function earnEvent(s, ctx) {
  const L = hackerLevel(s), out = [];
  for (const u of EARNED) {
    if (u.earn.state || s.collection?.[u.id] || L < bandOf(u) || !onOf(u).some((src) => fromHere(src, ctx))) continue;
    const E = (s.earned ||= {});
    if (u.earn.distinct) {
      const list = (E[u.id] = Array.isArray(E[u.id]) ? E[u.id] : []);
      for (const k of [].concat(ctx[u.earn.distinct] || [])) if (k && !list.includes(k)) list.push(k);
    } else E[u.id] = (Number(E[u.id]) || 0) + 1;
    if (counted(s, u) >= u.earn.n) { const it = pay(s, u, goalOf(u).text); if (it) out.push(it); }
  }
  return out;
}
// Every second (profile.mjs tickProfile): the floor goals in band, paid once full.
export function earnTick(s) {
  if (s.who) return [];
  const L = hackerLevel(s), out = [];
  for (const u of EARNED) {
    if (!u.earn.state || s.collection?.[u.id] || L < bandOf(u)) continue;
    const st = stateOf(s, u);
    if (st.full ?? st.n >= st.of) { const it = pay(s, u, goalOf(u).text); if (it) out.push(it); }
  }
  return out;
}

// ---------- pins ----------
// Up to PIN_MAX earned pieces you lack, pinned from their Ledger line, shown on the map under Contracts.
export const pinsOf = (s) => (s.pins || []).filter((id) => isEarned(id) && !s.collection?.[id]);
export function pinCommand(s, text) {
  const want = text.replace(/^(un)?pin\s*/, '').trim().toLowerCase(), u = UNIQUES[want] || EARNED.find((x) => x.name.toLowerCase() === want);
  if (!u?.earn) return warn(s, want ? `No earned piece called ${want}.` : 'pin <piece>: an earned piece, from its Ledger line.');
  if (s.collection?.[u.id]) return warn(s, `${u.name} is already yours.`);
  const pins = (s.pins = pinsOf(s));
  if (pins.includes(u.id)) { s.pins = pins.filter((x) => x !== u.id); return emit(s, 'info', `Unpinned ${u.name}.`, { pin: u.id }); }
  if (/^unpin/.test(text)) return warn(s, `${u.name} isn't pinned.`);
  if (pins.length >= PIN_MAX) return warn(s, `Pins are full (${PIN_MAX}). Unpin one first.`);
  pins.push(u.id);
  return emit(s, 'info', `Pinned ${u.name} to the map.`, { pin: u.id });
}

hooks.earnEvent = earnEvent;
hooks.earnTick = earnTick;
hooks.pinCommand = pinCommand;
hooks.isEarned = isEarned;

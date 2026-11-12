// Your house (docs/house.md): a cutaway of a tenement, floors stacked, and the furniture you place in it. Cosmetic
// only: nothing here touches play. Every piece comes from an achievement (content/furniture.mjs); a floor opens at a
// number of achievement points (FLOORS). Pure functions of state; the page is house-view.mjs.
//
// Each floor is the same grid: W columns by H rows inside its walls (the lot YW columns), row 0 under its ceiling, the floor under row
// H - 1. A floor piece stands on the floor (its bottom row on row H - 1); a wall piece hangs from row 1. Nothing
// overlaps another piece, a window or the ladder (blockers). A yard piece stands only in the lot; a floor piece may
// go out there too. The geometry never depends on which floors are open, so a
// piece placed stays valid.
//
// Saved on s.house = { placed: { id: [floor, x] }, seen: floors open when last told }. A save without it starts with
// the mattress on the street floor and no pager line for the floors its points already open.
import { emit, warn } from './combat.mjs';
import { pointsOf, earned, achById } from './achievements.mjs';
import { FURNITURE, FURNITURE_IDS } from './content/furniture.mjs';

export const W = 44, H = 6;
// In the order they open. above: over the street (a window); the Shack is on the roof, its right part a terrace.
export const FLOORS = [
  { id: 'street', name: 'Street floor', at: 0, above: true },
  { id: 'loft', name: 'Loft', at: 50, above: true },
  { id: 'cellar', name: 'Cellar', at: 200 },
  { id: 'shack', name: 'Shack', at: 450, above: true },
  { id: 'bunker', name: 'Bunker', at: 800 },
  { id: 'subnet', name: 'Subnet', at: 1200 },
];
export const floorById = (id) => FLOORS.find((f) => f.id === id) || YARDS.find((f) => f.id === id) || null;
// Top to bottom, as drawn.
export const STACK = ['shack', 'loft', 'street', 'cellar', 'bunker', 'subnet'];
export const LADDER = { x: W - 4, w: 3 };
export const WINDOW = { x: 6, y: 1, w: 8, h: 3 };
export const SHACK = 26; // the shack's right wall; the terrace beyond it has no back wall
// The lot: open ground west of the street floor, there from the start, a chain-link fence at its far side. YW columns,
// H rows over the gravel. East of the walls is the pavement, where nothing goes.
export const YW = 32;
export const YARDS = [{ id: 'west', name: 'Lot', yard: true }];
export const widthOf = (floor) => (YARDS.some((y) => y.id === floor) ? YW : W);

export const floorsOpen = (s) => FLOORS.filter((f) => pointsOf(s) >= f.at);
export const nextFloor = (s) => FLOORS.find((f) => pointsOf(s) < f.at) || null;
export const isOpen = (s, id) => YARDS.some((f) => f.id === id) || floorsOpen(s).some((f) => f.id === id);

export function houseOf(s) {
  const h = (s.house ||= {});
  if (!h.placed) h.placed = { mattress: ['street', 2] };
  // A piece left on a ground that's gone (the east yard, before the lot): into the lot where it fits, else put away.
  for (const [id, [floor]] of Object.entries(h.placed)) {
    if (floorById(floor) && FURNITURE[id]) continue;
    delete h.placed[id];
    const x = FURNITURE[id] && Array.from({ length: YW }, (_, i) => i).find((i) => fits(s, id, 'west', i));
    if (x != null) h.placed[id] = ['west', x];
  }
  return h;
}
export const owns = (s, id) => !!FURNITURE[id] && (!FURNITURE[id].from || earned(s, FURNITURE[id].from));
export const ownedIds = (s) => FURNITURE_IDS.filter((id) => owns(s, id));
export const placedOf = (s) => s.house?.placed || { mattress: ['street', 2] };

export const sizeOf = (id) => { const a = FURNITURE[id].art; return { w: Math.max(...a.map((l) => l.length)), h: a.length }; };
// A piece's box at x on a floor.
export function boxOf(id, x) {
  const { w, h } = sizeOf(id);
  return { x, y: FURNITURE[id].wall ? 1 : H - h, w, h };
}
// Where a piece centred on a column starts, kept inside the walls (or the yard).
export const leftFor = (id, col, floor = 'street') => Math.max(0, Math.min(widthOf(floor) - sizeOf(id).w, Math.round(col - sizeOf(id).w / 2)));
// What nothing may overlap on a floor: its window (above ground), the ladder, the shack's wall.
export function blockers(floor) {
  const f = floorById(floor), out = [];
  if (f?.yard) return out;
  if (f?.above) out.push({ ...WINDOW, what: 'window' });
  out.push(floor === 'shack' ? { x: LADDER.x, y: H - 2, w: LADDER.w, h: 2, what: 'ladder' } : { x: LADDER.x, y: 0, w: LADDER.w, h: H, what: 'ladder' });
  if (floor === 'shack') out.push({ x: SHACK, y: 0, w: 1, h: H, what: 'wall' });
  return out;
}
const meets = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
// Whether a piece fits at x on a floor (the pieces placed there, itself aside).
export function fits(s, id, floor, x) {
  if (!FURNITURE[id] || !floorById(floor) || !Number.isInteger(x)) return false;
  const b = boxOf(id, x), yard = !!floorById(floor).yard;
  if (b.x < 0 || b.x + b.w > widthOf(floor)) return false;
  if (FURNITURE[id].yard ? !yard : yard && FURNITURE[id].wall) return false; // a yard piece stays out; a wall piece needs a wall
  if (FURNITURE[id].wall && floor === 'shack' && b.x + b.w > SHACK) return false; // the terrace has no wall to hang it on
  if (blockers(floor).some((k) => meets(b, k))) return false;
  return !Object.entries(placedOf(s)).some(([o, [f, ox]]) => o !== id && f === floor && FURNITURE[o] && meets(b, boxOf(o, ox)));
}

// house: a line on it. house place <piece> <floor> <x>: stand it there (or move it). house store <piece>: take it out.
export function houseCommand(s, raw) {
  const words = String(raw).trim().split(/\s+/), verb = (words[1] || '').toLowerCase(), id = (words[2] || '').toLowerCase();
  const h = houseOf(s), open = floorsOpen(s);
  if (!verb) return emit(s, 'info', `House: ${open.length} of ${FLOORS.length} floors, ${Object.keys(h.placed).length} of ${ownedIds(s).length} pieces out.`);
  if (verb === 'place') {
    const floor = (words[3] || '').toLowerCase(), x = Number(words[4]);
    if (!FURNITURE[id]) return warn(s, `No piece called ${id || 'that'}.`);
    if (!owns(s, id)) return warn(s, "That piece isn't yours yet.");
    if (!isOpen(s, floor)) return warn(s, `No floor called ${floor || 'that'} yet.`);
    if (!fits(s, id, floor, x)) return warn(s, `${FURNITURE[id].name} doesn't fit there.`);
    h.placed[id] = [floor, x];
    return emit(s, 'info', `${FURNITURE[id].name}: ${floorById(floor).name}.`, { house: id });
  }
  if (verb === 'store') {
    if (!h.placed[id]) return warn(s, `${FURNITURE[id]?.name || 'That'} isn't out.`);
    delete h.placed[id];
    return emit(s, 'info', `${FURNITURE[id].name}: put away.`, { house: id });
  }
  return warn(s, 'house, house place <piece> <floor> <x>, house store <piece>');
}

// Every second (profile.mjs tickProfile, after the achievements): a floor your points just opened is one pager line.
export function tickHouse(s) {
  const h = houseOf(s), open = floorsOpen(s);
  if (h.seen == null || open.length < h.seen) { h.seen = open.length; return null; } // a save new to the house: no lines for what it had
  if (open.length === h.seen) return null;
  const fresh = open.slice(h.seen);
  h.seen = open.length;
  return emit(s, 'house', `House: ${fresh.map((f) => `the ${f.name}`).join(' and ')} ${fresh.length > 1 ? 'are' : 'is'} open.`, { floors: fresh.map((f) => f.id) });
}

// What brings a piece, in words (its tooltip, a locked tile).
export function sourceOf(s, id) {
  const from = FURNITURE[id]?.from, a = from && achById(from);
  if (!from) return 'Yours from the start.';
  if (!a) return '';
  return a.hidden && !earned(s, a.id) ? `A hidden achievement: ${a.hint}` : `${a.name}: ${a.rule}`;
}

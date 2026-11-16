// Run cards (docs/director.md section 4, GAME_RULES.md "Run cards"): the director deals at most one into a run on a
// traced server (events.mjs runCardRoll, through netrooms.mjs WORLD.runcard). Pure like floorplan.mjs, which calls these
// from its moves and fights (R.visit.card). Missing one costs nothing.
//
//   surge    One fight room lights up. Walk in and waves keep coming, one fight after another; each kill fills the bar
//            and drops a slice of a cache into your pack. At 100% a guardian (an elite) spawns; beat it and the surge
//            ends. Step back between fights and keep what you've earned.
//   escort   A courier crosses the server from the entry to a far room, one room each time you move, never into a room
//            something still holds. In a fight in its room or the one it's waiting to walk into, it's with you: the
//            virus's damage attacks hit it on even cycles (objectives.mjs Backup, its Integrity carried fight to fight).
//            At the far room it pays; at 0 it's lost, and nothing more happens.
//   pack     A pack (an elite and two runners) walks the rooms toward you, a room for each of your moves, never into the
//            Core, the entry or a rest room. It never starts within two rooms of you. Beat it for an elite's loot.
//
// card: { kind, seed, state: 'on' | 'won' | 'lost' | 'gone', ... }; how it ended goes to the director's history.
import { emit, addItem, classOf } from './combat.mjs';
import { rollItem, seeded } from './gear.mjs';
import { distances, pathTo, neighbours, WORLD } from './floorplan.mjs';

export const RUNCARD = {
  surge: { waves: 3 }, // kills to fill the bar; then the guardian
  escort: { hp: 0.6, min: 3 }, // its Integrity, of your max Signal; its route at least this many steps
  pack: { brood: 2, min: 3 }, // its runners; it starts at least this many rooms from you
};
export const RUN_CARDS = {
  surge: { name: 'Surge room', icon: 'target', tip: 'Walk in and waves keep coming, one fight after another. Each kill fills the bar and drops a cache into your pack. At 100% a guardian spawns; beat it and the surge ends.', muted: 'Step back between fights and keep what you\'ve earned.' },
  escort: { name: 'Escort', icon: 'archive', tip: 'A courier crosses this server to the DROP room, a room each time you move. It waits outside any room something still holds. In a fight beside it, the virus hits it instead of you on even cycles.', muted: 'Clear the way. At the drop it pays credits and a protocol.' },
  pack: { name: 'Hunter pack', icon: 'den', tip: 'An elite and two runners walk toward you, a room for each of your moves. They never enter the Core, the entry or a rest room.', muted: 'Beat the pack for an elite\'s loot.' },
};
// A cache's worth of credits at a level: a courier's (events.mjs courierPay).
export const cardCredits = (L) => 40 + 12 * L;

const say = (s, text, type = 'rooms') => { const R = s.rooms; R.log.push(text); if (R.log.length > 60) R.log.shift(); return emit(s, type, text); };
const ask = (fn, ...a) => (WORLD[fn] ? WORLD[fn](...a) : undefined);
const levelOf = (s) => (s.rooms.world ? ask('level', s) ?? s.rooms.level : s.rooms.level);
const pick = (r, xs) => xs[Math.floor(r() * xs.length)];

// The card on this visit while it's live, or null.
export const cardOf = (s) => { const c = s.rooms?.visit?.card; return c && c.state === 'on' && s.rooms.at ? c : null; };
const live = (s, kind) => { const c = cardOf(s); return c?.kind === kind ? c : null; };

// ---------- dealing ----------
// Deal kind into this visit (you at the entry). null when the server has nowhere it fits.
export function dealCard(s, kind, seed) {
  const R = s.rooms, g = R.graph, r = seeded((seed >>> 0) || 1), from = R.at || g.entry, d = distances(g, from, (x) => x !== g.core);
  const rooms = Object.values(g.rooms).filter((x) => !x.concealed && x.id !== g.core && d[x.id] != null);
  let card = null;
  if (kind === 'surge') {
    const xs = rooms.filter((x) => x.kind === 'process' && x.family && d[x.id] >= 2);
    if (xs.length) card = { room: pick(r, xs.sort((a, b) => (a.id < b.id ? -1 : 1))).id, kills: 0, guardian: false };
  } else if (kind === 'escort') {
    const ok = rooms.filter((x) => x.kind !== 'den'), far = Math.max(0, ...ok.map((x) => d[x.id]));
    const xs = ok.filter((x) => d[x.id] === far && far >= RUNCARD.escort.min).sort((a, b) => (a.id < b.id ? -1 : 1));
    const dest = xs.length ? pick(r, xs).id : null, route = dest && pathTo(g, from, dest, (x) => x !== g.core);
    if (route) { const max = Math.max(1, Math.round(R.max * RUNCARD.escort.hp)); card = { at: from, dest, hp: max, max }; }
  } else if (kind === 'pack') {
    const can = packCan(s), starts = can(from) ? [from] : neighbours(g, from).filter(can), reach = new Set(starts.flatMap((n) => Object.keys(distances(g, n, can)))); // only where it can walk to you
    const xs = rooms.filter((x) => d[x.id] >= RUNCARD.pack.min && reach.has(x.id) && can(x.id)).sort((a, b) => (a.id < b.id ? -1 : 1));
    if (xs.length) card = { at: pick(r, xs).id, n: 1 + RUNCARD.pack.brood };
  }
  if (!card) return null;
  R.visit.card = { kind, seed: (seed >>> 0) || 1, state: 'on', ...card };
  reveal(s);
  say(s, `${RUN_CARDS[kind].name}: ${dealtLine(s, R.visit.card)}`, 'rooms-good');
  return R.visit.card;
}
// Its rooms show through the fog: the lit room, the courier's route and drop, the pack's room and way to you.
export function reveal(s) {
  const R = s.rooms, c = cardOf(s);
  if (!c) return;
  const ids = c.kind === 'surge' ? [c.room] : c.kind === 'escort' ? escortRoute(s, c) : packRoute(s, c);
  for (const id of ids) R.seen[id] ||= 'shape';
}
const pathOf = (s, id) => s.rooms.graph.rooms[id]?.path || id;
function dealtLine(s, c) {
  if (c.kind === 'surge') return `${pathOf(s, c.room)} is lit. Walk in and the waves start.`;
  if (c.kind === 'escort') return `a courier waits at the entry for ${pathOf(s, c.dest)}. Clear its way.`;
  return `a pack is out in ${pathOf(s, c.at)}, walking toward you.`;
}
// How it ended: its state and the director's history (netrooms.mjs WORLD.cardEnd).
function end(s, c, state, how) {
  c.state = state;
  ask('cardEnd', s, c, how);
}
// You leave the server: a card still live ends there (a surge you took part in counts as taken).
export function cardLeave(s) {
  const c = s.rooms?.visit?.card;
  if (!c || c.state !== 'on') return;
  end(s, c, 'gone', c.kind === 'surge' && c.kills ? 'taken' : 'missed');
}

// ---------- the surge ----------
export const surgeAt = (s, id) => live(s, 'surge')?.room === id ? live(s, 'surge') : null;
export const surgeFill = (c) => Math.min(1, c.kills / RUNCARD.surge.waves);
// Walk into the lit room (or win a wave there): the next wave holds it.
export function surgeScreen(s, room, opts = {}, name) {
  const c = surgeAt(s, room.id);
  if (!c) return false;
  s.rooms.screen = { kind: 'virus', room: room.id, name, as: 'surge', pause: !!opts.pause };
  say(s, c.guardian ? `The surge's guardian holds ${room.path}.` : `A surge wave holds ${room.path} (${c.kills + 1}/${RUNCARD.surge.waves}).`, 'intrusion');
  return true;
}
export function surgeFight(s, room) {
  const c = s.rooms.visit.card, level = levelOf(s), elite = !!c.guardian;
  const seed = ((c.seed + (c.kills + (elite ? 1 : 0)) * 7919) >>> 0) || 1;
  return { key: 'random', seed, opts: { mode: 'run', room: room.path, level, family: room.family, author: room.author, mutation: null, ...(elite ? { elite: true } : {}) }, size: elite ? 'elite' : 'process', name: null, level, family: room.family, author: room.author, elite };
}
// A wave down: a slice of the cache into your pack, the bar fills; the guardian down ends it. True: another holds the room.
export function surgeWon(s, room) {
  const R = s.rooms, c = R.visit.card;
  if (c.guardian) { end(s, c, 'won', 'won'); say(s, 'The surge is over. Its guardian is down.', 'rooms-good'); return false; }
  c.kills++;
  const credits = Math.round(cardCredits(levelOf(s)) / RUNCARD.surge.waves);
  if (R.world) s.run.pack.push({ path: `${room.path}/#surge-${s.serial}`, name: 'cache.dat', kind: 'credits', amount: credits });
  else { R.credits += credits; s.server.credits += credits; }
  emit(s, 'spoil', `Surge cache: +${credits} credits.`, { label: 'Credits', qty: `+${credits}`, kind: 'credits', sub: 'Surge cache', pack: true });
  if (c.kills >= RUNCARD.surge.waves) { c.guardian = true; say(s, 'The bar is full. A guardian spawns.', 'rooms-bad'); }
  return true;
}

// ---------- the escort ----------
export const escortOf = (s) => live(s, 'escort');
// Its route from where it is to the drop (the Core never on it), its room first.
export function escortRoute(s, c = escortOf(s)) {
  if (!c) return [];
  const g = s.rooms.graph;
  return pathTo(g, c.at, c.dest, (x) => x !== g.core) || [c.at];
}
// It's with you in a fight in its room, or in the room it waits to walk into.
export const escortWith = (s, room) => { const c = escortOf(s); return !!c && (c.at === room.id || escortRoute(s, c)[1] === room.id); };
// A step for each of your moves, when its next room holds nothing. isUp: floorplan.mjs's.
export function escortMove(s, isUp) {
  const R = s.rooms, c = escortOf(s);
  if (!c) return;
  const next = escortRoute(s, c)[1];
  if (!next || isUp(s, R.graph.rooms[next])) return;
  c.at = next;
  if (c.at === c.dest) escortDone(s, c);
  else reveal(s);
}
function escortDone(s, c) {
  const R = s.rooms, L = levelOf(s), credits = cardCredits(L), r = seeded((c.seed * 31 + 7) >>> 0);
  const it = addItem(s, rollItem(r, { level: L, rarity: r() < 0.15 ? 'custom' : 'tuned', cls: classOf(s) }), 'The courier: ');
  if (R.world) { s.run.pack.push({ path: `${pathOf(s, c.dest)}/#courier-${s.serial}`, name: 'drop.dat', kind: 'credits', amount: credits }); if (it) ask('packItem', s, it); }
  else { R.credits += credits; s.server.credits += credits; if (it) R.pack.push(it.id); }
  emit(s, 'spoil', `The courier's drop: +${credits} credits.`, { label: 'Credits', qty: `+${credits}`, kind: 'credits', sub: 'Courier drop', pack: true });
  end(s, c, 'won', 'won');
  say(s, `The courier reaches ${pathOf(s, c.dest)}. Its drop is in your pack.`, 'rooms-good');
}
// The fight starts with it beside you: a Backup (objectives.mjs) whose Integrity is the courier's.
export function escortArm(s, e, room, arm) {
  const c = escortOf(s);
  if (!c || !escortWith(s, room)) return;
  const o = arm(s, e, 'backup');
  o.hp = c.hp; o.n = c.max; o.courier = true;
  emit(s, 'status', `The courier is with you: ${c.hp}/${c.max}. The virus hits it instead of you on even cycles.`, { objective: 'backup' });
}
// The fight over: what the courier has left. At 0 it's lost.
export function escortAfter(s, e) {
  const c = escortOf(s), o = e?.objective;
  if (!c || !o?.courier) return;
  c.hp = Math.max(0, o.hp);
  if (c.hp > 0 && !o.failed) return;
  end(s, c, 'lost', 'gone');
  say(s, 'The courier is lost.', 'rooms-bad');
}

// ---------- the pack ----------
export const packOf = (s) => live(s, 'pack');
export const packAt = (s, id) => packOf(s)?.at === id;
const packCan = (s) => { const g = s.rooms.graph; return (x) => x !== g.core && x !== g.entry && g.rooms[x]?.kind !== 'rest'; };
// Its way to you, its room first (as far as it can walk: it stops outside the entry, a rest room or the Core).
export function packRoute(s, c = packOf(s)) {
  if (!c) return [];
  const R = s.rooms, g = R.graph, can = packCan(s);
  if (can(R.at)) return pathTo(g, c.at, R.at, can) || [c.at];
  const near = neighbours(g, R.at).filter(can), d = distances(g, c.at, can), best = near.filter((x) => d[x] != null).sort((a, b) => d[a] - d[b])[0];
  return best ? pathTo(g, c.at, best, can) || [c.at] : [c.at];
}
// A step for each of your moves. True when it walks into your room.
export function packMove(s) {
  const R = s.rooms, c = packOf(s);
  if (!c) return false;
  const next = packRoute(s, c)[1];
  if (next) c.at = next;
  reveal(s);
  return c.at === R.at;
}
export const packRooms = (s, c = packOf(s)) => Math.max(0, packRoute(s, c).length - 1);
export function packFight(s, room) {
  const c = s.rooms.visit.card, level = levelOf(s), fam = room.family || Object.values(s.rooms.graph.rooms).find((x) => x.family)?.family || 'worm';
  return { key: 'random', seed: c.seed, opts: { mode: 'run', room: room.path, level, family: fam, author: room.author || s.rooms.author, mutation: null, elite: true }, size: 'elite', name: null, level, family: fam, author: room.author || s.rooms.author, elite: true, brood: RUNCARD.pack.brood };
}
export function packWon(s) {
  const c = s.rooms.visit.card;
  end(s, c, 'won', 'won');
  say(s, 'The pack is down.', 'rooms-good');
}

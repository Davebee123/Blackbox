// The living network (docs/world.md 3, first slice W0): a world turn after each finished breach. The author whose
// server you took answers by digging in on its nearest open server, and wick's leads put dead drops on the map. It
// moves per breach, never on a clock: being away changes nothing. Pure like the engine: the campaign's state in, news
// out. Everything the world does to a breach goes through modsFor (the card's `world`), so WORLD.on = false leaves
// the campaign exactly as it was.
//
// State on s.camp.world:
//   turn     world turns so far (one per finished breach, from your second capture)
//   moves    { serverId: { kind: 'digin', author, gene, turn } }   pressure: at most WORLD.pressure servers, one each
//   watch    { serverId: author }   a move that waits on the clean-server rule (the board says who's watching)
//   events   [{ id, kind: 'drop', at, row, pips, turn, done }]      opportunities: a dead drop, for WORLD.pips breaches
//   news     [{ turn, text, at }]   the board's lines, the last WORLD.news
//   drops    dead drops pulled so far
import { seeded } from './gear.mjs';
import { hackerLevel } from './combat.mjs';
import { GENES } from './genes.mjs';
import { AUTHORS } from './authors.mjs';
import { SERVERS, SERVER, statusOf, held, outgrown, recOf } from './campaign.mjs';

// Tuning. pressure: servers under a move at once. chance: the event roll (a lead always lands). pips: how many breaches
// a dead drop waits. events: live events on the map. news: lines the board keeps. near: how far under your level a drop
// may sit. from: captures before the world turns (wick's first lead starts it).
export const WORLD = { on: true, pressure: 2, chance: 0.5, pips: 3, events: 3, news: 6, from: 2, near: 1 };
export const freshWorld = () => ({ turn: 0, moves: {}, watch: {}, events: [], news: [], drops: 0 });
const rngOf = (c, salt = 0) => seeded(((c.seed >>> 0) * 2654435761 ^ Math.imul(c.world.turn + 1, 40503) ^ salt) >>> 0 || 1);
const aName = (a) => AUTHORS[a]?.name || a;

// ---------- reading it ----------
// The servers you can breach and don't hold.
export const openServers = (s) => SERVERS.filter((x) => statusOf(s, x.id) === 'open');
export const moveOn = (s, id) => (WORLD.on && s.camp?.world?.moves?.[id]) || null;
export const eventOn = (s, id) => (WORLD.on && s.camp?.world?.events?.find((e) => e.at === id && !e.done)) || null;
export const watcherOf = (s, id) => (WORLD.on && s.camp?.world?.watch?.[id]) || null;
export const pressured = (s) => Object.keys(s.camp?.world?.moves || {}).length;
// The clean-server rule: an open server with no pressure on it, whenever there is an open server at all.
export const cleanOpen = (s) => openServers(s).filter((x) => !moveOn(s, x.id));
export const cleanRuleHolds = (s) => !openServers(s).length || cleanOpen(s).length > 0;
// Links between two servers (breadth first over the map's links).
export function distance(a, b) {
  if (a === b) return 0;
  let ring = [a], seen = new Set([a]);
  for (let d = 1; d <= SERVERS.length; d++) {
    const next = [];
    for (const id of ring) for (const l of SERVER[id].links) if (!seen.has(l)) { if (l === b) return d; seen.add(l); next.push(l); }
    ring = next;
  }
  return Infinity;
}
// The gene an author digs in with on a server: one of its signature genes that is a part for that server's body and
// opens at its level (Ward or Mutex lock for TOLLGATE, Twin for SWARMLINE, Mimic for NULL CHOIR, Decoy mirror for
// PALEMASK), else a mutation from its toolkit (Armored, Hasty…). null when it has none there.
export function digGene(author, srv, r = Math.random) {
  const A = AUTHORS[author];
  if (!A) return null;
  const parts = A.signature.filter((id) => GENES[id]?.parts?.[srv.family] && (GENES[id].parts[srv.family].from || 1) <= srv.level && GENES[id].opens <= srv.level);
  const pool = parts.length ? parts : A.toolkit.filter((id) => GENES[id]?.mutation && GENES[id].opens <= srv.level);
  return pool.length ? pool[Math.floor(r() * pool.length)] : null;
}

// ---------- the turn ----------
// d: the breach's debrief (room.mjs debriefOf): result, id, first (a first capture), lostOn. Returns the turn's news.
export function worldTurn(s, d) {
  const c = s.camp, w = (c.world ||= freshWorld());
  if (!WORLD.on) return { news: [], lead: null };
  w.turn++;
  // News, most important first: the answer, the lead, a move lifted, a drop gone cold, a hold you broke.
  const r = rngOf(c), news = [], say = (text, at, pri = 4) => news.push({ turn: w.turn, text, at, pri });
  // 1. Clear: drops you pulled go, and so do moves and watches on servers you now hold.
  w.events = w.events.filter((e) => !e.done);
  for (const [id, m] of Object.entries(w.moves)) if (held(s, id)) { delete w.moves[id]; say(`${aName(m.author)} is out of ${SERVER[id].name}.`, id, 4); }
  for (const id of Object.keys(w.watch)) if (statusOf(s, id) !== 'open') delete w.watch[id];
  // 2. Age: an opportunity loses a pip each breach, and goes cold at 0.
  for (const e of w.events) e.pips--;
  for (const e of w.events.filter((x) => x.pips <= 0)) say(`The drop on ${SERVER[e.at].name} went cold.`, e.at, 3);
  w.events = w.events.filter((e) => e.pips > 0);
  // 3. The answer: only to a capture, and only from the author you hit. After a loss or a jack-out, nobody moves.
  if (d.result === 'won' && d.first && !d.replay) answer(s, d, r, say);
  // A capture can close the last clean server: then the oldest move lifts, so there is always a clean way forward.
  while (!cleanRuleHolds(s)) {
    const [id, m] = Object.entries(w.moves).sort((a, b) => a[1].turn - b[1].turn)[0];
    delete w.moves[id];
    say(`${aName(m.author)} pulled out of ${SERVER[id].name}.`, id, 2);
  }
  // 6. The event roll: at most one new event, a lead from wick. The first turn always brings one.
  const lead = rollEvent(s, d, r, w.turn === 1);
  if (lead) say(`A dead drop on ${SERVER[lead.at].name}.`, lead.at, 1);
  const top = news.sort((a, b) => a.pri - b.pri).slice(0, 3).map(({ pri, ...x }) => x);
  w.news = [...w.news, ...top].slice(-WORLD.news);
  return { news: top, lead };
}
function answer(s, d, r, say) {
  const w = s.camp.world, X = SERVER[d.id]?.author, srv = SERVER[d.id];
  if (!X) return;
  for (const [id, a] of Object.entries(w.watch)) if (a === X) delete w.watch[id]; // its answer replaces its watch
  const own = openServers(s).filter((x) => x.author === X && !x.tutorial).sort((a, b) => distance(srv.id, a.id) - distance(srv.id, b.id) || a.level - b.level);
  const ok = own.filter((x) => !w.moves[x.id] && !recOf(s, x.id).checkpoint && x.id !== d.lostOn);
  const target = ok[0], gene = target && digGene(X, target, r);
  if (!target || !gene) { if (!own.length || !ok.length) say(`${aName(X)} has nowhere left to dig in.`, srv.id, 0); return; }
  // The pressure rules: at most WORLD.pressure servers, and a clean open server left after the move. Else it waits.
  const clean = openServers(s).filter((x) => !w.moves[x.id] && x.id !== target.id).length;
  if (Object.keys(w.moves).length >= WORLD.pressure || clean < 1) { w.watch[target.id] = X; say(`${aName(X)} is watching ${target.name}.`, target.id, 0); return; }
  w.moves[target.id] = { kind: 'digin', author: X, gene, turn: w.turn };
  delete w.watch[target.id];
  say(`${aName(X)} dug in at ${target.name}. Every elite and gate carries ${GENES[gene].name}.`, target.id, 0);
}
// A lead: a dead drop on a server you can breach or hold (never SPRAWL-00), close to your level (WORLD.near under it at
// most, so a lead is never a detour to a server that pays you nothing), in act 1, row 2 or 3. One on the map at a time,
// and at most WORLD.events events in all.
function rollEvent(s, d, r, first) {
  const w = s.camp.world;
  if (w.events.length >= WORLD.events || w.events.some((e) => e.kind === 'drop')) return null;
  if (!first && r() >= WORLD.chance) return null;
  const can = SERVERS.filter((x) => !x.tutorial && ['open', 'held'].includes(statusOf(s, x.id)) && !outgrown(s, x) && !w.events.some((e) => e.at === x.id));
  // Near your level, and away from pressure when it can be: a lead is a second way forward, not a push onto the dig in.
  const near = can.filter((x) => x.level >= hackerLevel(s) - WORLD.near), wide = near.length ? near : can;
  const calm = wide.filter((x) => !w.moves[x.id]), spots = calm.length ? calm : wide;
  if (!spots.length) return null;
  const at = spots[Math.floor(r() * spots.length)], row = 1 + Math.floor(r() * 2);
  const e = { id: `w${w.turn}`, kind: 'drop', at: at.id, row, pips: WORLD.pips, turn: w.turn };
  w.events.push(e);
  return e;
}

// ---------- what a breach carries ----------
// What a server's breach brings from the world, as the card's `world` (breach.mjs reads it): a dig in's gene on its
// elites and gates, and a dead drop in its first act. null when the world leaves it alone.
export function modsFor(s, id) {
  if (!WORLD.on || !s.camp?.world) return null;
  const m = moveOn(s, id), e = eventOn(s, id), out = {};
  if (m) out.digin = { author: m.author, gene: m.gene };
  if (e) out.drop = { id: e.id, row: e.row, card: null, frag: null }; // campaign.mjs fills in the card and the note
  return out.digin || out.drop ? out : null;
}

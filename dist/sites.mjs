// Quest sites (docs/sites.md): short-lived servers the director mounts on your floor, beside a server you've located.
// Built: the Settlement run and the Rack pull. Each pays its own thing on top of gear (docs/pays.md); either way it
// unmounts when it's done or its clock runs out, and if you're on it you're sent home with your pack banked, as at a jack
// out. Missing one costs nothing else.
//   Settlement run (rig): a crew (TOLLGATE, SWARMLINE or PALEMASK) locks a living institution's settlement run as it
//     passes that server. Its clock is the run's, SITE.rig.ms, waiting while you fight on the rig. Break the lock (an
//     elite in the rig's Core, open from the start): SITE.rig.exploits Exploits and +SITE.rig.rep with the institution's
//     faction. Run out the clock and the lock lands: its trades orphan, INIT's table +SITE.rig.table.
//   Rack pull (rack): Kestrel mounts one of Kessler's racks from cold storage for a cycle, SITE.rack.ms, before it
//     pulls it back. Open its cage (the vault; its guard post holds the key): SITE.rack.filters filters (the first
//     Tuned or better, Custom one time in four), SITE.rack.receipts receipts dated older than the floor, and Kestrel
//     +SITE.rack.rep. Its Core stays sealed: nothing to take over.
// One up at a time, SITE.everyMs of logged-on time apart, from level SITE.from, the kinds in turn, on dice of their own
// (never the director's, so the events deal as they did). Saved: s.sites = { up: [loc], next, last, r, n }. A site's
// server lives there, off s.locations, as a thread's temporary server does: no invasions, no tracing, no takeover. Its
// rooms come through netrooms.mjs (the rig's lock, the rack's cage); the map and card: sites-view.mjs.
import { hooks, emit, hackerLevel, findLocation, active, materialsOf } from './combat.mjs';
import { createLocation, floorFor, CONFIG } from './data.mjs';
import * as FP from './floorplan.mjs';
import { graphOf, floorOfSlot, holderOf } from './floors.mjs';
import { changeRep } from './factions.mjs';
import { moveTable } from './table.mjs';
import { AUTHORS } from './authors.mjs';
import { codeOf, seeded } from './gear.mjs';
import { receiptOf, receiptsOf } from './receipts.mjs';
import { rollFilter, addFilter } from './filters.mjs';

export const SITE = {
  from: 5, // class level the first site can mount at
  firstMs: [20 * 60000, 40 * 60000], // logged-on time to the first
  everyMs: [50 * 60000, 70 * 60000], // and from one's end to the next
  kinds: ['rig', 'rack'], // taken in turn
  rig: { ms: [18 * 60000, 20 * 60000], exploits: 3, rep: 12, table: 1, trades: [120, 480] },
  rack: { ms: [30 * 60000, 35 * 60000], filters: 2, custom: 0.25, receipts: 3, rep: 6 },
};
// The crews that lock runs, the rig's room kinds by crew (as a thread's temporary server's), and the living
// institutions by floor (lore.md 8.1) with the faction that stands behind each.
export const CREWS = ['tollgate', 'swarmline', 'palemask'];
const KIND_OF_CREW = { tollgate: 'Mailhub', swarmline: 'Relay', palemask: 'Mirror' };
const TEMPLATE_OF = { Mailhub: 'mailhub', Relay: 'relay', Mirror: 'mirror' };
export const RUNS = [
  { floor: 1, inst: 'Tenements Board', short: 'the Tenements Board', faction: 'halcyon' },
  { floor: 2, inst: 'Harrow Street Credit Union', short: 'Harrow Street', faction: 'lantern' },
  { floor: 3, inst: 'Corvid Exchange', short: 'Corvid Exchange', faction: 'kestrel' },
  { floor: 4, inst: 'City Treasury Office', short: "the Treasury's tax rolls", faction: 'halcyon' },
];
export const runOf = (floor) => RUNS.find((x) => x.floor === Math.min(4, floor)) || RUNS[0];

const sitesState = (s) => (s.sites ||= { up: [], next: null, n: 0 });
export const siteServers = (s) => s.sites?.up || [];
export const sitesOn = (s, floor) => siteServers(s).filter((l) => (l.depth || 1) === floor);
export const siteLive = (loc) => loc?.site?.state === 'up';
const onIt = (s, loc) => s.run?.loc === loc.id;
const minutes = (ms) => Math.max(1, Math.ceil(ms / 60000));

// Its own dice (mulberry32 on s.sites.r), seeded off the save.
function roll(s) {
  const d = sitesState(s);
  let t = (d.r = ((d.r ?? (((s.seed || 1) * 31) ^ 0x51735)) + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (s, [lo, hi]) => lo + Math.floor(roll(s) * (hi - lo));
const pick = (s, xs) => xs[Math.floor(roll(s) * xs.length)];

// Where a site can mount: beside a server you've located on your floor (never a rogue one, a member's or a lair), at
// your level + 2 or under and among the three nearest your level, else the floor's lowest. It takes that server's level.
function targets(s) {
  const L = hackerLevel(s), floor = floorFor(L);
  const mine = (s.locations || []).filter((l) => !l.rogue && !l.member && !l.lair && !l.farm && !l.zone && l.slot && (floorOfSlot(l.slot) || l.depth || 1) === floor);
  const near = mine.filter((l) => (l.level || 1) <= L + 2).sort((a, b) => Math.abs((a.level || 1) - L) - Math.abs((b.level || 1) - L)).slice(0, 3);
  return near.length ? near : mine.length ? [mine.reduce((a, b) => ((b.level || 1) < (a.level || 1) ? b : a))] : [];
}
// Its place on the floor map: beside that server, in the clearest spot a link's length off.
function spotBeside(s, host) {
  const n = host.depth || floorOfSlot(host.slot) || 1, g = graphOf(s, n), node = g.nodes[host.slot] || g.nodes[g.entry];
  const others = [...Object.values(g.nodes), ...(s.threads?.servers || []).map((l) => l.temp?.at), ...siteServers(s).map((l) => l.site.at)].filter(Boolean);
  let best = null;
  for (const rad of [110, 140, 170]) {
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8 + 0.2, p = { x: Math.round(node.x + Math.cos(a) * rad), y: Math.round(node.y + Math.sin(a) * rad) };
      const room = Math.min(...others.map((o) => Math.hypot(o.x - p.x, o.y - p.y)));
      if (!best || room > best.room) best = { ...p, room };
    }
    if (best.room >= 90) break;
  }
  return { x: best.x, y: best.y };
}
// A small server's rooms for a site, as a thread's temporary server's: no sockets, no puzzle rooms.
function mount(s, loc, { kind, level, floor, author, family, seed }) {
  const graph = FP.generate(seed, { size: 'small', kind, level, floor, author, sockets: 0 });
  graph.puzzles ??= 0;
  loc.floorplan = FP.newRooms(s, { world: true, loc: loc.id, name: loc.name, speed: 1, seed, size: 'small', kind, level, floor, author, graph, type: 'server', code: codeOf(family) || 'cipher' });
  loc.floorplan.programs = {};
  const d = sitesState(s);
  d.up.push(loc);
  d.n = (d.n || 0) + 1;
  d.last = loc.site.kind;
  return loc;
}
const freeName = (s, name, seed) => { while (findLocation(s, name(seed).toLowerCase())) seed++; return seed; };

// Mount a Settlement run. Returns its server, or null when nothing fits.
export function dealRig(s) {
  const spots = targets(s);
  if (!spots.length || siteServers(s).length) return null;
  const target = pick(s, spots), floor = floorOfSlot(target.slot) || target.depth || 1;
  const holder = holderOf(s, floor);
  const crew = CREWS.includes(holder) ? holder : pick(s, CREWS), A = AUTHORS[crew], family = A.crew, kind = KIND_OF_CREW[crew];
  const run = runOf(floor), level = Math.min(CONFIG.maxMobLevel, target.level || hackerLevel(s));
  const nameOf = (x) => `${A.name}-RIG-${String(10 + (x % 90))}`, seed = freeName(s, nameOf, between(s, [1000, 900000]));
  const total = between(s, SITE.rig.ms), trades = between(s, SITE.rig.trades) + 40 * floor;
  const loc = Object.assign(createLocation(family, seed, floor), { id: nameOf(seed).toLowerCase(), name: nameOf(seed), level, depth: floor, template: TEMPLATE_OF[kind], special: null, quirk: null, runs: 0,
    site: { kind: 'rig', state: 'up', crew, target: target.id, inst: run.inst, short: run.short, faction: run.faction, trades, left: total, total, at: spotBeside(s, target) } });
  mount(s, loc, { kind, level, floor, author: crew, family, seed });
  emit(s, 'site', `${A.name} is locking ${run.short}'s settlement run on floor ${floor}: ${loc.name}. ${minutes(total)} min.`, { location: loc.id, floor, kind: 'rig', phase: 'up', crew, faction: run.faction, trades, short: run.short, mins: minutes(total) });
  return loc;
}

// Mount a Rack pull: one of Kessler's racks, its trades from an older layer than the floor. Returns its server, or null.
export function dealRack(s) {
  const spots = targets(s);
  if (!spots.length || siteServers(s).length) return null;
  const host = pick(s, spots), floor = floorOfSlot(host.slot) || host.depth || 1, level = Math.min(CONFIG.maxMobLevel, host.level || hackerLevel(s));
  const nameOf = (x) => `KESSLER-RACK-${String(1 + (x % 19)).padStart(2, '0')}`, seed = freeName(s, nameOf, between(s, [1000, 900000]));
  const era = Math.min(8, floor + 2 + Math.floor(roll(s) * 2)), first = receiptOf({ seed: seed * 3, depth: era, id: 'rack', name: 'rack' });
  const total = between(s, SITE.rack.ms), family = host.family || 'worm', author = holderOf(s, floor);
  const loc = Object.assign(createLocation(family, seed, floor), { id: nameOf(seed).toLowerCase(), name: nameOf(seed), level, depth: floor, template: 'relay', special: null, quirk: null, runs: 0,
    site: { kind: 'rack', state: 'up', host: host.id, rack: 1 + (seed % 19), era, c: first.c, year: Number(first.date.slice(-4)), left: total, total, at: spotBeside(s, host) } });
  mount(s, loc, { kind: 'Relay', level, floor, author, family, seed });
  emit(s, 'site', `Kestrel mounts ${loc.name} on floor ${floor} for one cycle, then pulls it back to cold storage. ${minutes(total)} min.`, { location: loc.id, floor, kind: 'rack', phase: 'up', faction: 'kestrel', rack: loc.site.rack, mins: minutes(total) });
  return loc;
}
const DEAL = { rig: dealRig, rack: dealRack };
// The next kind in turn (the other one from the last), else whichever fits.
export function dealSite(s, kind = null) {
  if (kind) return DEAL[kind]?.(s) || null;
  const last = s.sites?.last, order = SITE.kinds.filter((k) => k !== last).concat(last && SITE.kinds.includes(last) ? [last] : []);
  for (const k of order) { const loc = DEAL[k](s); if (loc) return loc; }
  return null;
}

// The lock broken (netrooms.mjs, the rig's Core won): the run settles. Paid at once; the rig unmounts once you're out
// of the fight.
export function siteWon(s, loc) {
  const x = loc?.site;
  if (!x || x.kind !== 'rig' || x.state !== 'up') return;
  x.state = 'won';
  materialsOf(s).exploit = (materialsOf(s).exploit || 0) + SITE.rig.exploits;
  emit(s, 'site', `${x.short[0].toUpperCase()}${x.short.slice(1)} settles: ${x.trades} trades closed. The lock comes apart: +${SITE.rig.exploits} Exploits.`, { location: loc.id, kind: 'rig', phase: 'won', crew: x.crew, faction: x.faction, trades: x.trades, short: x.short, exploits: SITE.rig.exploits });
  changeRep(s, x.faction, SITE.rig.rep, `${x.inst}'s run settled`);
}
// The cage opened (netrooms.mjs, the rack's vault, after its usual files): the rack's own. Paid at once; the rack is
// pulled once you're out of the room.
export function siteVault(s, loc) {
  const x = loc?.site;
  if (!x || x.kind !== 'rack' || x.state !== 'up') return;
  x.state = 'won';
  const r = seeded(((loc.seed || 1) * 53 + 11) >>> 0);
  for (let i = 0; i < SITE.rack.filters; i++) {
    const rarity = i === 0 ? (r() < SITE.rack.custom ? 'custom' : 'tuned') : null; // the first Tuned or better; the rest as a vault's
    addFilter(s, rollFilter(r, { level: loc.level || 1, rarity }), 'The cage: ');
  }
  const R = receiptsOf(s), got = [];
  for (let i = 0; i < SITE.rack.receipts; i++) {
    const rc = { ...receiptOf({ seed: (loc.seed || 1) * 3 + i, depth: x.era, id: loc.id, name: loc.name }), loc: loc.id, server: loc.name };
    if (!R.kept.some((k) => k.id === rc.id)) { R.kept.push(rc); got.push(rc); }
  }
  emit(s, 'site', `The cage on ${loc.name}: ${SITE.rack.filters} filters and ${got.length} receipts from ${x.year}, kept for your commission.`, { location: loc.id, kind: 'rack', phase: 'won', faction: 'kestrel', receipts: got.map((k) => k.id) });
  changeRep(s, 'kestrel', SITE.rack.rep, `${loc.name}'s cage emptied`);
}
// The clock ran out: a rig's lock lands; a rack goes back to cold storage.
function ran(s, loc) {
  const x = loc.site;
  if (x.kind === 'rack') {
    x.state = 'closed';
    return emit(s, 'site', `Kestrel pulls ${loc.name} back to cold storage.`, { location: loc.id, kind: 'rack', phase: 'closed', faction: 'kestrel' });
  }
  x.state = 'landed';
  emit(s, 'site', `${AUTHORS[x.crew].name}'s lock landed on ${x.short}: ${x.trades} trades orphaned. Process table +${SITE.rig.table}.`, { location: loc.id, kind: 'rig', phase: 'landed', crew: x.crew, faction: x.faction, trades: x.trades, short: x.short });
  if (moveTable(s, SITE.rig.table)) emit(s, 'table-cancel', 'LANTERN runs a cancel round. The process table drops eight points.');
}

// Logged-on time passes (events.mjs tickEvents): the clocks run, an ended site unmounts (sending you home first), the
// next one is dealt.
export function tickSites(s, dt) {
  const d = sitesState(s);
  for (const loc of [...d.up]) {
    const x = loc.site, fighting = onIt(s, loc) && active(s);
    if (x.state === 'up' && !fighting) { x.left -= dt; if (x.left <= 0) ran(s, loc); }
    if (x.state === 'up' || fighting) continue;
    if (onIt(s, loc)) hooks.jackOut?.(s); // it unmounts under you: home, the pack banked
    if (onIt(s, loc)) continue; // couldn't leave yet
    d.up.splice(d.up.indexOf(loc), 1);
    emit(s, 'site-gone', `${loc.name} unmounts.`, { location: loc.id });
  }
  if (hackerLevel(s) < SITE.from || d.up.length) return;
  if (d.next == null) d.next = between(s, SITE.firstMs);
  d.next -= dt;
  if (d.next > 0) return;
  if (dealSite(s)) d.next = between(s, SITE.everyMs);
  else d.next = 5 * 60000; // nowhere to mount yet: look again in a while
}

// `developer site [rig|rack]`: mount one now.
export function developerSite(s, kind = null) {
  const loc = dealSite(s, kind);
  if (!loc) emit(s, 'info', 'Developer: no site fits (one is up, or no server of yours on your floor).');
}
// combat.mjs's command and events.mjs's tick reach this module through hooks: it loads with the rooms engine
// (netrooms.mjs), after combat.mjs, as threads.mjs does.
hooks.developerSite = developerSite;
hooks.tickSites = tickSites;

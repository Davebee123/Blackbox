// The event director: now and then something happens on the net, and you can act on it or let it
// pass. It deals one card at a time from a small deck, never the same card twice in a row, on the
// network clock (logged-on time, from tickNetwork). Missing an event costs nothing.
//
//   courier   LANTERN's courier is carrying a dead drop through one of your servers. Intercept it
//             (a fight from the server's map card) for its credit cache and a protocol.
//   bounty    A named virus, two levels up, is loose on one of your servers. Kill it for a bounty.
//   outbreak  One family surges for a while: its kills drop double code.
//   leak      Someone leaks the vault key of a server you've found but not taken.
//   darknet   A broker lists a native unique from another network (network.mjs) for credits and Exploits.
//   feud      Two rival factions (located hubs) clash over one of your servers. Pick a side: fight the other's runner.
//   hunt      A named elite that hops server to server every 5 minutes, a level tougher and better paid each hop.
//   shock     One hub's price for one ware jumps ×2.5 (or crashes ×0.4) for 15 minutes (market.mjs outsideMult).
//   scout     A scout probes your wall. Kill it at home and the next invasion comes weaker, its kind known (invasion.mjs).
//
// Your network's signature (network.mjs) leans the deck: its two favoured cards come up more often, and the
// families of couriers, bounties and outbreaks lean toward its own.
//
// Pure: state in, events out.
import { emit, warn, active, hackerLevel, selectEncounter, command, addItem, UNIQUES, giveUnique, setDrop, WORLD_SOURCES, hooks } from './combat.mjs';
import { FAMILIES, CONFIG } from './data.mjs';
import { LOOT, rollItem, seeded } from './gear.mjs';
import { changeStanding } from './mail.mjs';
import { openFarm } from './rogue.mjs';
import { eventMult, noteEvent, leanPick, darknetPick, darknetBuy, nameNative, homeName, NETWORK } from './network.mjs';
import { isPiece } from './sets.mjs';
import { FACTIONS, hubsOf, hostile, changeRep, hubFound, RIPPLE } from './factions.mjs';
import { FACTION_FAMILY } from './hubs.mjs';
import { addFilter, rollFilter } from './filters.mjs';
import { invasionsLive, scoutNext, SCOUTED } from './invasion.mjs';

export const DIRECTOR = {
  from: 3, // class level the director starts dealing at
  firstMs: [4 * 60000, 8 * 60000], // logged-on time to the first event
  everyMs: [15 * 60000, 30 * 60000], // and between events
  max: 2, // events up at once
  named: 20, // one courier in this many carries a unique you're missing, by name (it was 6: a fifth of all uniques on the long climb; uniques stay under one an hour)
  namedFrom: 10, // and only from this level: below it the storyline and the Resident's own two already give nearly one an hour
};
// Uniques you haven't found that drop out in the world at about your level (combat.mjs WORLD_SOURCES: not a boss's or a
// lair's, the farm's, a story's or a strain's trophy, nor a set piece): what a courier can be carrying.
const missing = (s) => Object.values(UNIQUES).filter((u) => !s.collection?.[u.id] && !isPiece(u.id) && u.level <= hackerLevel(s) + 2 && (u.sources || []).some((src) => WORLD_SOURCES.includes(src.kind))).map((u) => u.id); // a set piece drops off its own table (sets.mjs)
const FAMS = Object.keys(FAMILIES).filter((f) => ['ransomware', 'worm', 'ghostroot'].includes(f));
// The newer cards' numbers. FEUD: rep to your side, from level 8 (no loss: its rivals never mind, its allies warm a little). HUNT: a hop every hopMs, hops of them,
// a level a hop (up to your level + cap), pay × mult[hop]. SHOCK: a hub's ware ×up, or ×down one time in crash.
export const FEUD = { from: 8, rep: 4, ms: 20 * 60000 };
export const HUNT = { from: 6, hopMs: 5 * 60000, hops: 3, cap: 3, mult: [1, 1.3, 1.6, 2], rep: 2 };
export const SHOCK = { from: 5, ms: 15 * 60000, up: 2.5, down: 0.4, crash: 1 / 3, wares: ['cipher', 'worm', 'kernel', 'salvage'] }; // not Exploits: the wall's and the programs' currency stays steady
export const SCOUT_EVENT = { from: 6, ms: 10 * 60000 };
// A faction's runner in a feud: a name of its own.
const RUNNER = { halcyon: 'ADJUSTER', glassjaw: 'FACET', kestrel: 'TALON', lantern: 'BEACON', nullchoir: 'DISSONANCE' };
// Two located hubs that are rivals (factions.mjs), each pair once.
export const feuds = (s) => { const fs = hubsOf(s).map((h) => h.faction); return fs.flatMap((a, i) => fs.slice(i + 1).filter((b) => FACTIONS[a].rivals.includes(b)).map((b) => [a, b])); };
const markets = (s) => hubsOf(s).filter((h) => !hostile(s, h.faction) && (h.offlineUntil || 0) <= (hooks.now?.() ?? Date.now())).map((h) => h.faction); // hubs you can trade at
// What your side gives from its goods: a sealed item (Tuned, at your level), or LANTERN's bootleg filter (it sells no crate).
export const feudGood = (f) => (f === 'halcyon' || FACTIONS[f].shop.includes('crate') ? 'crate' : 'bootleg');
const NAMES = ['lapsejack', 'deductible', 'subrogate', 'rider', 'lossrun', 'waiver', 'binder', 'tallow', 'cinder', 'quarry'];

export const CARDS = {
  courier: {
    name: 'Courier', weight: 3, ms: 15 * 60000, fight: true,
    where: (s) => places(s),
    // About one courier in DIRECTOR.named carries a unique you haven't found, by name, from level DIRECTOR.namedFrom: a lucky shot.
    make: (s) => ({ family: fam(s), level: hackerLevel(s), name: `COURIER-${1000 + Math.floor(roll(s) * 9000)}`, ...(roll(s) * DIRECTOR.named < 1 && hackerLevel(s) >= DIRECTOR.namedFrom && missing(s).length ? { unique: pick(s, missing(s)) } : {}) }),
    text: (ev, where) => `LANTERN's courier ${ev.name} is carrying ${ev.unique ? `${UNIQUES[ev.unique].name}, a unique you haven't found,` : 'a dead drop'} through ${where}. Intercept it before it leaves to take ${ev.unique ? 'it' : 'the drop'}.`,
    reward: (ev) => `${credits(ev.level)} credits and ${ev.unique ? UNIQUES[ev.unique].name : 'a protocol'}`,
    won: (s, ev) => {
      s.server.credits += credits(ev.level);
      setDrop(s, { kind: 'courier' }, ev.level, ev.name); // Lantern Route's pieces (sets.mjs): one roll a courier intercepted
      if (ev.unique) { giveUnique(s, ev.unique, 'Dead drop: '); return `You took the dead drop: ${credits(ev.level)} credits and ${UNIQUES[ev.unique].name}.`; }
      const r = seeded(ev.seed), item = rollItem(r, { level: ev.level, rarity: r() < LOOT.minor ? 'tuned' : 'stock' }); // fixed by the event
      addItem(s, item, 'Dead drop: ');
      return `You took the dead drop: ${credits(ev.level)} credits and a protocol.`;
    },
  },
  bounty: {
    name: 'Bounty', weight: 2, ms: 25 * 60000, fight: true,
    where: (s) => places(s),
    // From level 8 the bounty is REPO MAN, a boss (BOSSES.repoman) at your level instead of a named virus two up.
    make: (s) => (hackerLevel(s) >= 8 ? { family: 'ransomware', level: hackerLevel(s), name: 'REPO MAN', boss: 'repoman' } : { family: fam(s), level: Math.min(CONFIG.maxMobLevel, hackerLevel(s) + 2), name: `${pick(s, NAMES)}-${1000 + Math.floor(roll(s) * 9000)}`, elite: true }),
    text: (ev, where) => (ev.boss ? `Halcyon posted a bounty on REPO MAN, a level ${ev.level} ransomware boss loose on ${where}. It re-arms at 60% and gets desperate at 30%. Kill it before it moves on.` : `Halcyon posted a bounty on ${ev.name}, a level ${ev.level} ${FAMILIES[ev.family].name.toLowerCase()} virus loose on ${where}. Kill it before it moves on.`),
    reward: (ev) => `${bountyPay(ev.level)} credits and Halcyon standing`,
    won: (s, ev) => {
      s.server.credits += bountyPay(ev.level);
      changeStanding(s, 'halcyon', 2, 'Bounty collected');
      return `Bounty collected on ${ev.name}: ${bountyPay(ev.level)} credits.`;
    },
  },
  choir: {
    name: 'Hollow Choir', weight: 1, ms: 25 * 60000, fight: true, from: 10,
    where: (s) => (hackerLevel(s) >= 10 ? places(s) : []),
    make: (s) => ({ family: 'ghostroot', level: hackerLevel(s), name: 'HOLLOW CHOIR', boss: 'choir' }),
    text: (ev, where) => `The HOLLOW CHOIR, a level ${ev.level} ghostroot boss, is singing through ${where}. It mirrors your commands, and at half Integrity its mirror bounces back harder. Silence it before it moves on.`,
    reward: (ev) => `${bountyPay(ev.level) * 2} credits and a protocol, Custom or better`,
    won: (s, ev) => {
      s.server.credits += bountyPay(ev.level) * 2;
      const r = seeded(ev.seed), item = rollItem(r, { level: ev.level, rarity: 'custom' });
      addItem(s, item, 'Hollow Choir: ');
      return `The Hollow Choir is silenced: ${bountyPay(ev.level) * 2} credits and a protocol.`;
    },
  },
  outbreak: {
    name: 'Outbreak', weight: 2, ms: 30 * 60000,
    where: () => [null],
    make: (s) => ({ family: fam(s) }),
    text: (ev) => `A ${FAMILIES[ev.family].name.toLowerCase()} outbreak is spreading. For the next 30 minutes, ${FAMILIES[ev.family].name.toLowerCase()} kills drop double code.`,
  },
  leak: {
    name: 'Leak', weight: 1, ms: 10 * 60000,
    where: (s) => (s.locations || []).filter((l) => !l.rogue && !l.takenOver && !l.passwordKnown && !l.member),
    make: () => ({}),
    start: (s, ev, loc) => { loc.passwordKnown = true; },
    text: (ev, where) => `Someone leaked the vault key of ${where}. Its vault opens without the password now.`,
  },
  // A native unique from another network, for sale (network.mjs): one of the slow ways to one that isn't yours.
  // It names the unique, so a Listening Post can tune to it after.
  darknet: {
    name: 'Darknet listing', weight: 0.5, ms: 20 * 60000, from: 8, // NETWORK.darknet.from
    where: (s) => (s.netSeed && hackerLevel(s) >= NETWORK.darknet.from && darknetPick(s, hackerLevel(s)) ? [null] : []),
    make: (s) => { const id = darknetPick(s, hackerLevel(s)); return { unique: id, level: hackerLevel(s), credits: NETWORK.darknet.credits(hackerLevel(s)), exploits: NETWORK.darknet.exploits, net: homeName(s, id).name }; },
    start: (s, ev) => nameNative(s, ev.unique),
    text: (ev) => `A broker on a darknet channel lists ${UNIQUES[ev.unique].name}, native to ${ev.net}, for ${ev.credits} credits and ${ev.exploits} Exploits. Type event buy ${ev.id} to buy it.`,
    reward: (ev) => UNIQUES[ev.unique].name,
  },
  // Two rival factions clash over one of your servers: one card, two sides. event fight <id> <faction> sides with
  // that faction, against the other's runner (an elite of its family, hubs.mjs FACTION_FAMILY, at your level).
  feud: {
    name: 'Feud', weight: 0.25, ms: FEUD.ms, fight: true, from: FEUD.from,
    where: (s) => (hackerLevel(s) >= FEUD.from && feuds(s).length ? places(s) : []),
    make: (s) => { const sides = pick(s, feuds(s)); return { sides, level: hackerLevel(s), name: sides.map((f) => FACTIONS[f].short).join(' vs '), runners: Object.fromEntries(sides.map((f) => [f, `${RUNNER[f]}-${1000 + Math.floor(roll(s) * 9000)}`])) }; },
    foe: (ev, f) => { const o = ev.sides.find((x) => x !== f); return { family: FACTION_FAMILY[o], name: ev.runners[o], elite: true }; },
    text: (ev, where) => `${FACTIONS[ev.sides[0]].short} and ${FACTIONS[ev.sides[1]].short} are fighting over ${where}. Pick a side.`,
    reward: (ev, f = ev.side) => `${bountyPay(ev.level)} credits, ${FACTIONS[f].short} +${FEUD.rep} and ${feudGood(f) === 'crate' ? 'a sealed item' : 'a bootleg filter'}`,
    gone: (ev, where) => `The feud over ${where} is over.`,
    won: (s, ev) => {
      const f = ev.side, r = seeded(ev.seed); // fixed by the event
      s.server.credits += bountyPay(ev.level);
      // Picking a side never costs you: no ripple onto its rivals (the other side's rep stays put), its allies' quarter only.
      changeRep(s, f, FEUD.rep, `You won the feud for ${FACTIONS[f].short}`, { ripple: false });
      for (const a of FACTIONS[f].allies) changeRep(s, a, Math.round(FEUD.rep * RIPPLE.ally), `${FACTIONS[f].short}'s ally noticed`, { ripple: false });
      if (feudGood(f) === 'crate') addItem(s, rollItem(r, { level: ev.level, rarity: 'tuned' }), `${FACTIONS[f].short}: `);
      else addFilter(s, rollFilter(r, { level: ev.level, rarity: r() < 0.7 ? 'stock' : 'tuned' }), `${FACTIONS[f].short}: `);
      return `You won the feud for ${FACTIONS[f].short}: ${bountyPay(ev.level)} credits and ${feudGood(f) === 'crate' ? 'a sealed item' : 'a bootleg filter'}.`;
    },
  },
  // A named elite that moves: every HUNT.hopMs it hops to another of your servers (its path is set when it's dealt, so
  // the map shows where it goes next), a level up each time and better paid. Kestrel are the hunters.
  hunt: {
    name: 'Bounty hunt', weight: 0.25, ms: (HUNT.hops + 1) * HUNT.hopMs, fight: true, from: HUNT.from,
    where: (s) => (hackerLevel(s) >= HUNT.from && places(s).length >= 2 ? places(s) : []),
    make: (s, loc) => {
      const path = [loc.id];
      for (let i = 0; i < HUNT.hops; i++) path.push(pick(s, places(s).filter((l) => l.id !== path.at(-1))).id);
      return { family: fam(s), base: hackerLevel(s), level: hackerLevel(s), hop: 0, path, next: path[1], name: `${pick(s, NAMES)}-${1000 + Math.floor(roll(s) * 9000)}`, elite: true, hunter: hunters(s) };
    },
    text: (ev, where) => `${FACTIONS[ev.hunter].short} is hunting ${ev.name}, a level ${ev.level} ${FAMILIES[ev.family].name.toLowerCase()} virus, on ${where}. It moves every ${HUNT.hopMs / 60000} minutes, tougher and better paid each time.`,
    reward: (ev) => `${huntPay(ev)} credits and ${FACTIONS[ev.hunter].short} +${HUNT.rep}`,
    gone: (ev) => `${ev.name} got away.`,
    // A hop: on to the next server on its path, a level up (to your level + HUNT.cap at most). Not while you fight it.
    tick: (s, ev) => {
      const want = Math.min(HUNT.hops, Math.floor((CARDS.hunt.ms - ev.left) / HUNT.hopMs));
      while (ev.hop < want) {
        ev.hop++;
        if ((s.locations || []).some((l) => l.id === ev.path[ev.hop])) ev.loc = ev.path[ev.hop]; // a server that's gone: it stays put
        ev.next = ev.hop < HUNT.hops ? ev.path[ev.hop + 1] : null;
        ev.level = Math.min(CONFIG.maxMobLevel, ev.base + ev.hop, hackerLevel(s) + HUNT.cap);
        emit(s, 'world-event-hop', `${ev.name} moved to ${placeName(s, ev.loc)}: level ${ev.level}.`, { card: 'hunt', event: ev.id, location: ev.loc, from: FACTIONS[ev.hunter].short });
      }
    },
    won: (s, ev) => {
      s.server.credits += huntPay(ev);
      if (ev.hunter === 'halcyon') changeStanding(s, 'halcyon', HUNT.rep, 'Bounty collected');
      else changeRep(s, ev.hunter, HUNT.rep, 'Bounty collected');
      return `Bounty collected on ${ev.name}: ${huntPay(ev)} credits.`;
    },
  },
  // A price spike (or crash) at one hub for one ware: market.mjs multiplies it in (shockMult). No fight.
  shock: {
    name: 'Market shock', weight: 0.25, ms: SHOCK.ms, from: SHOCK.from,
    where: (s) => (hackerLevel(s) >= SHOCK.from && markets(s).length ? [null] : []),
    make: (s) => { const hub = pick(s, markets(s)), ware = pick(s, SHOCK.wares), down = roll(s) < SHOCK.crash; return { hub, ware, mult: down ? SHOCK.down : SHOCK.up }; },
    text: (ev) => (ev.mult > 1 ? `${FACTIONS[ev.hub].short} pays ${ev.mult} times the usual for ${WARE_NAME[ev.ware]} for the next ${SHOCK.ms / 60000} minutes.` : `${cap(WARE_NAME[ev.ware])} sells at ${FACTIONS[ev.hub].short} for ${Math.round(ev.mult * 100)}% of the usual for the next ${SHOCK.ms / 60000} minutes.`),
    gone: (ev) => `${FACTIONS[ev.hub].short}'s price for ${WARE_NAME[ev.ware]} is back to normal.`,
  },
  // A scout virus probing your wall: a quick fight at home. Win and the next invasion comes SCOUTED.levels weaker, and
  // you know where from and what kind (invasion.mjs scoutNext). Let it go and nothing changes.
  scout: {
    name: 'Scout', weight: 0.25, ms: SCOUT_EVENT.ms, fight: true, from: SCOUT_EVENT.from, home: true,
    where: (s) => (hackerLevel(s) >= SCOUT_EVENT.from && invasionsLive(s) && !s.net?.scouted && !s.degraded ? [null] : []),
    make: (s) => ({ family: fam(s), level: hackerLevel(s), name: `SCOUT-${1000 + Math.floor(roll(s) * 9000)}` }),
    text: (ev) => `A scout, ${ev.name}, is probing your wall. Kill it and the next invasion comes ${SCOUTED.levels} levels weaker.`,
    reward: () => `the next invasion −${SCOUTED.levels} levels, and its kind`,
    gone: (ev) => `${ev.name} left your wall.`,
    won: (s, ev) => {
      const next = scoutNext(s, seeded(ev.seed)); // on the event's own dice
      return `${ev.name} is down. The next invasion${next ? `, a ${next.name.toLowerCase()} from ${next.from},` : ''} comes ${SCOUTED.levels} levels weaker.`;
    },
  },
};
const WARE_NAME = { cipher: 'Cipher code', worm: 'Worm code', kernel: 'Kernel code', salvage: 'components', exploit: 'Exploits' };
const cap = (x) => x[0].toUpperCase() + x.slice(1);
// Kestrel are the hunters; until you've located their hub, Halcyon posts it.
const hunters = (s) => (hubFound(s, 'kestrel') && hubsOf(s).length ? 'kestrel' : 'halcyon');
export const huntPay = (ev) => Math.round(bountyPay(ev.level) * HUNT.mult[ev.hop || 0]);
const placeName = (s, id) => (s.locations || []).find((l) => l.id === id)?.name || 'the net';
// A family for an event on your network: its lean (network.mjs), on the director's own dice.
const fam = (s) => leanPick(s, 'you', roll(s));
const credits = (level) => 40 + 12 * level; // about two ordinary caches
const bountyPay = (level) => 80 + 15 * level;
// The director rolls its own dice (mulberry32 on the save), so dealing an event never shifts the
// rest of the game's rolls.
function roll(s) {
  const d = (s.director ||= { next: null, n: 0, last: null });
  let t = (d.r = ((d.r ?? ((s.seed || 1) ^ 0x6d2b79f5)) + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (s, xs) => xs[Math.floor(roll(s) * xs.length)];
const between = (s, [lo, hi]) => lo + Math.floor(roll(s) * (hi - lo));
// Where a fight event can turn up: a server you've traced (never a rogue one), else none.
const places = (s) => (s.locations || []).filter((l) => !l.rogue && !l.member);

export const eventsOf = (s) => (s.events ||= []);
export const eventsAt = (s, id) => eventsOf(s).filter((e) => e.loc === id);
export const eventById = (s, id) => eventsOf(s).find((e) => e.id === Number(id));
export const eventText = (s, ev) => CARDS[ev.card].text(ev, placeName(s, ev.loc));
export const eventMinutes = (ev) => Math.max(1, Math.ceil(ev.left / 60000));
// Kills of a family in an outbreak drop this much more code.
export const outbreakMult = (s, family) => (eventsOf(s).some((e) => e.card === 'outbreak' && e.family === family) ? 2 : 1);
// A market shock on this hub's ware (market.mjs outsideMult): ×SHOCK.up, ×SHOCK.down, or 1.
export const shockMult = (s, f, w) => (s.events || []).find((e) => e.card === 'shock' && e.hub === f && e.ware === w)?.mult ?? 1;
export const shockOf = (s, f) => (s.events || []).find((e) => e.card === 'shock' && e.hub === f) || null;

export function tickEvents(s, dt) {
  openFarm(s); // KESSLER-FARM-00 turns up at level 7 (rogue.mjs)
  const d = (s.director ||= { next: null, n: 0, last: null });
  for (const ev of [...eventsOf(s)]) {
    if (s.encounter?.event === ev.id && active(s)) continue; // the one you're fighting waits for you
    ev.left -= dt;
    const c = CARDS[ev.card];
    if (ev.left > 0) c.tick?.(s, ev); // a hunt hops
    else end(s, ev, c.gone ? c.gone(ev, placeName(s, ev.loc)) : c.fight ? `${ev.name} left ${placeName(s, ev.loc)}.` : null);
  }
  if (hackerLevel(s) < DIRECTOR.from) return;
  if (d.next == null) d.next = between(s, DIRECTOR.firstMs);
  d.next -= dt;
  if (d.next > 0) return;
  d.next = between(s, DIRECTOR.everyMs);
  if (eventsOf(s).length < DIRECTOR.max) deal(s);
}

// Deal a card (or the one asked for). Returns the event, or null when nothing fits.
export function deal(s, card = null) {
  const d = (s.director ||= { next: null, n: 0, last: null });
  const up = new Set(eventsOf(s).map((e) => e.card));
  const ids = (card ? [card] : Object.keys(CARDS).filter((k) => k !== d.last)).filter((k) => CARDS[k] && !up.has(k) && CARDS[k].where(s).length);
  if (!ids.length) return null;
  const w = (k) => CARDS[k].weight * eventMult(s, k); // your network's favoured cards (network.mjs)
  let r = roll(s) * ids.reduce((n, k) => n + w(k), 0), id = ids[0];
  for (const k of ids) { r -= w(k); if (r < 0) { id = k; break; } }
  const c = CARDS[id], spots = c.where(s).filter((l) => !l || !eventsAt(s, l.id).length);
  if (!spots.length) return null;
  const loc = pick(s, spots);
  const ev = { id: ++d.n, card: id, loc: loc?.id || null, left: c.ms, seed: (d.n * 7919 + (loc?.seed || 1) * 31) >>> 0, ...c.make(s, loc) };
  c.start?.(s, ev, loc);
  d.last = id;
  noteEvent(s, id); // your network's favoured cards show on its card once each has come up twice (network.mjs)
  if (c.ms && id !== 'leak') eventsOf(s).push(ev);
  emit(s, 'world-event', eventText(s, ev), { card: id, event: c.ms && id !== 'leak' ? ev.id : null, location: ev.loc, ...(ev.hub ? { hub: ev.hub, from: FACTIONS[ev.hub].short } : {}), ...(ev.hunter ? { from: FACTIONS[ev.hunter].short } : {}) });
  return ev;
}

function end(s, ev, message) {
  s.events = eventsOf(s).filter((e) => e !== ev);
  if (message) emit(s, 'world-event-end', message, { card: ev.card, location: ev.loc });
}

// event fight <id>: go after a courier or a bounty, from its server's map card. event fight <id> <faction>: a feud's side.
export function eventCommand(s, text) {
  const b = text.match(/^event buy (\d+)$/);
  if (b) { // a darknet listing (network.mjs)
    const ev = eventById(s, b[1]);
    if (!ev || ev.card !== 'darknet') return warn(s, 'That listing is gone.');
    if (darknetBuy(s, ev)) end(s, ev, null);
    return;
  }
  const m = text.match(/^event fight (\d+)(?: (\w+))?$/);
  if (!m) return warn(s, 'usage: event fight <id> [faction], or event buy <id>');
  const ev = eventById(s, m[1]), c = ev && CARDS[ev.card];
  if (!ev || !c.fight) return warn(s, 'That event is over.');
  if (c.foe && !ev.sides.includes(m[2])) return warn(s, `Pick a side: event fight ${ev.id} ${ev.sides.join('|')}.`);
  if (s.run) return warn(s, 'Jack out first.');
  if (active(s)) return warn(s, 'Finish the fight first.');
  const foe = c.foe ? c.foe(ev, m[2]) : { family: ev.family, name: ev.name, elite: !!ev.elite, boss: ev.boss };
  const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
  selectEncounter(s, 'random', (ev.seed + (c.foe ? ev.sides.indexOf(m[2]) * 7919 : 0)) >>> 0, { level: ev.level, family: foe.family, name: foe.name, elite: !!foe.elite, ...(foe.boss ? { boss: foe.boss } : {}), mutation: null, quiet: true });
  if (!s.encounter || s.encounter.phase === 'active') return;
  if (c.foe) ev.side = m[2]; // the side you fight for (the last one you picked)
  s.gate = gate && gate !== s.encounter ? gate : null;
  s.encounter.event = ev.id;
  emit(s, 'jack-in', `Intercepting ${foe.name}.`, { location: ev.loc });
  command(s, 'engage');
}

// Called from finish() when an event fight is won.
export function eventWon(s, e) {
  const ev = eventById(s, e.event);
  if (!ev) return;
  const said = CARDS[ev.card].won?.(s, ev);
  end(s, ev, null);
  if (said) emit(s, 'world-event-won', said, { card: ev.card, location: ev.loc });
}

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
//   feud      Two rival factions (located hubs) clash over one of your servers: a tug-of-war bar that drifts on its own.
//             Pick a side and beat the other's runners, each win a push; take the bar to 100% (or lead at the end) for the bonus.
//   hunt      A named elite that hops server to server every 5 minutes, a level tougher and better paid each hop.
//   shock     One hub's price for one ware jumps ×2.5 (or crashes ×0.4) for 15 minutes (market.mjs outsideMult).
//   spotter   A spotter watches your wall. Kill it at home and the next invasion comes weaker, its kind known (invasion.mjs).
//
// Chains (docs/director.md section 2): what you did with one card deals the next, a follow-up with a link to its cause.
//   counter   after a feud you won a fight in: the side you fought sends a runner at a server you hold.
//   returning a bounty hunt that got away comes back once, the same name, level and pay: a second chance, never a bonus.
//   lantern   after 3 couriers you intercepted: LANTERN's own courier (an Escort in D3).
//   zero      15 kills of an outbreak's family during it: its source, an elite; kill it and the outbreak ends.
//
// Your network's signature (network.mjs) leans the deck: its two favoured cards come up more often, and the
// families of couriers, bounties and outbreaks lean toward its own.
//
// Pure: state in, events out.
import { emit, warn, active, hackerLevel, selectEncounter, command, addItem, UNIQUES, giveUnique, setDrop, WORLD_SOURCES, hooks, gainCode } from './combat.mjs';
import { FAMILIES, CONFIG } from './data.mjs';
import { LOOT, rollItem, seeded, codeOf, vaultCode, MATERIALS } from './gear.mjs';
import { changeStanding } from './mail.mjs';
import { openFarm } from './rogue.mjs';
import { eventMult, noteEvent, leanPick, darknetPick, darknetBuy, nameNative, homeName, NETWORK } from './network.mjs';
import { isPiece } from './sets.mjs';
import { FACTIONS, hubsOf, hostile, changeRep, hubFound, RIPPLE } from './factions.mjs';
import { FACTION_FAMILY } from './hubs.mjs';
import { addFilter, rollFilter } from './filters.mjs';
import { invasionsLive, scoutNext, SCOUTED } from './invasion.mjs';
import { gainPart, pieceOf } from './faction-gear.mjs';

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
export const missing = (s) => Object.values(UNIQUES).filter((u) => !s.collection?.[u.id] && !isPiece(u.id) && u.level <= hackerLevel(s) + 2 && (u.sources || []).some((src) => WORLD_SOURCES.includes(src.kind))).map((u) => u.id); // a set piece drops off its own table (sets.mjs)
const FAMS = Object.keys(FAMILIES).filter((f) => ['ransomware', 'worm', 'ghostroot'].includes(f));
// The newer cards' numbers. FEUD, from level 8: a bar (sides[0]'s share) that starts within ±start of even and drifts a step of
// drift every driftMs on the director's dice, never past hold on its own; each runner you beat pushes your side by push and pays
// pay × a bounty's credits and +rep; 100%, or the lead when time's up, wins the feud: your side's good and +bonusRep (its allies a
// quarter of a win and the bonus). Never a loss with anyone. Each runner also drops a protocol at your level with your side's
// implicit, and the win gives a part of its piece (faction-gear.mjs) and its good with the implicit. A runner is sized for one (hp: invasion.mjs CHAMPION's). HUNT: a hop every hopMs, hops of them,
// a level a hop (up to your level + cap), pay × mult[hop]. SHOCK: a hub's ware ×up, or ×down one time in crash.
export const FEUD = { from: 8, ms: 20 * 60000, start: 0.05, driftMs: 60000, drift: [0.02, 0.05], hold: [0.2, 0.8], push: 0.25, pay: 0.5, rep: 4, bonusRep: 6, hp: 1.5 };
export const HUNT = { from: 6, hopMs: 5 * 60000, hops: 3, cap: 3, mult: [1, 1.3, 1.6, 2], rep: 2 };
export const SHOCK = { from: 5, ms: 15 * 60000, up: 2.5, down: 0.4, crash: 1 / 3, wares: ['cipher', 'worm', 'kernel', 'salvage'] }; // not Exploits: the wall's and the programs' currency stays steady
export const SCOUT_EVENT = { from: 6, ms: 10 * 60000 };
// Chains: at most max follow-ups pending, one per kind, each dropped quietly if it isn't dealt within expireMs of logged-on
// time. COUNTER: delay after the feud, a runner sized like a feud's, pay × a bounty's credits, +rep with your side. RETURNING:
// delay after the escape; it comes back once, at the level and pay it had when it got away (letting one go never pays). LANTERN: after `at` couriers, +rep. ZERO:
// after `at` kills of the family in its outbreak; pays a vault's code cache of the family (gear.mjs vaultCode).
export const CHAIN = {
  max: 3, expireMs: 3 * 3600000,
  counter: { delay: [20 * 60000, 40 * 60000], ms: 15 * 60000, pay: 0.5, rep: 2 },
  returning: { delay: [30 * 60000, 60 * 60000], ms: 20 * 60000, rep: 2 },
  lantern: { at: 3, ms: 15 * 60000, rep: 5 },
  zero: { at: 15, ms: 15 * 60000 },
};
// A faction's runner in a feud: a name of its own.
const RUNNER = { halcyon: 'ADJUSTER', glassjaw: 'FACET', kestrel: 'TALON', lantern: 'BEACON', nullchoir: 'DISSONANCE' };
// How much of a feud's bar is this side's (0–1), and its pay a win.
export const feudShare = (ev, f) => (f === ev.sides[0] ? ev.bar ?? 0.5 : 1 - (ev.bar ?? 0.5));
export const feudPay = (level) => Math.round(bountyPay(level) * FEUD.pay);
const rival = (ev, f) => ev.sides.find((x) => x !== f);
const runnerName = (s, f) => `${RUNNER[f]}-${1000 + Math.floor(roll(s) * 9000)}`;
// The feud won for your side: a part of its piece (faction-gear.mjs), its good (fixed by the event; a sealed item carries its
// implicit), +bonusRep, its allies a quarter of a win and the bonus. No ripple.
function feudBonus(s, ev) {
  const f = ev.side, r = seeded(ev.seed), good = feudGood(f) === 'crate' ? 'a sealed item' : 'a bootleg filter';
  const part = gainPart(s, f);
  changeRep(s, f, FEUD.bonusRep, `You won the feud for ${FACTIONS[f].short}`, { ripple: false });
  for (const a of FACTIONS[f].allies) changeRep(s, a, Math.round((FEUD.rep + FEUD.bonusRep) * RIPPLE.ally), `${FACTIONS[f].short}'s ally noticed`, { ripple: false });
  if (feudGood(f) === 'crate') addItem(s, rollItem(r, { level: ev.level, rarity: 'tuned', faction: f }), `${FACTIONS[f].short}: `);
  else addFilter(s, rollFilter(r, { level: ev.level, rarity: r() < 0.7 ? 'stock' : 'tuned' }), `${FACTIONS[f].short}: `);
  return part ? `${part} and ${good}` : good;
}
// A runner beaten: a protocol at your level with your side's implicit, Stock or Tuned as a courier's (fixed by the event and the win).
function runnerDrop(s, ev, f) {
  const r = seeded((ev.seed + 7919 * (ev.wins || 0)) >>> 0);
  return addItem(s, rollItem(r, { level: hackerLevel(s), rarity: r() < LOOT.minor ? 'tuned' : 'stock', faction: f }), `${ev.runners[rival(ev, f)]} dropped: `);
}
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
    start: (s, ev, loc) => { loc.passwordKnown = true; loc.leaked = true; }, // leaked: its card shows the key as a tile until the vault's open
    text: (ev, where) => `Someone leaked the vault key of ${where}. You start your next visit there holding it.`,
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
  // Two rival factions clash over one of your servers: one card, two sides, a tug-of-war bar (ev.bar, sides[0]'s share). event
  // fight <id> <faction> sides with that faction against the other's runner (an elite of its family, hubs.mjs FACTION_FAMILY, at
  // your level, sized for one); your side locks with your first fight. Each win pushes it, pays, and brings a fresh runner.
  feud: {
    name: 'Feud', weight: 1, ms: FEUD.ms, fight: true, again: true, from: FEUD.from,
    where: (s) => (hackerLevel(s) >= FEUD.from && feuds(s).length ? places(s) : []),
    make: (s) => { const sides = pick(s, feuds(s)); return { sides, level: hackerLevel(s), name: sides.map((f) => FACTIONS[f].short).join(' vs '), bar: Math.round((0.5 + (roll(s) * 2 - 1) * FEUD.start) * 100) / 100, steps: 0, wins: 0, runners: Object.fromEntries(sides.map((f) => [f, runnerName(s, f)])) }; },
    foe: (ev, f) => { const o = rival(ev, f); return { family: FACTION_FAMILY[o], name: ev.runners[o], elite: true, eliteHp: FEUD.hp }; },
    text: (ev, where) => `${FACTIONS[ev.sides[0]].short} and ${FACTIONS[ev.sides[1]].short} are fighting over ${where}. Pick a side and push its bar to 100%.`,
    reward: (ev, f = ev.side) => `Each win pays ${feudPay(ev.level)} credits, a protocol with ${FACTIONS[f].short}'s mark and ${FACTIONS[f].short} +${FEUD.rep}. Winning the feud adds a part of ${pieceOf(f)?.name || 'its piece'}, ${feudGood(f) === 'crate' ? 'a sealed item' : 'a bootleg filter'} and ${FACTIONS[f].short} +${FEUD.bonusRep}`,
    gone: (ev, where) => `The feud over ${where} is over.`,
    // The world moves without you: a step every driftMs, on the director's dice. Outward only inside hold; inward always.
    tick: (s, ev) => {
      ev.bar ??= 0.5; ev.steps ??= 0;
      const want = Math.floor((FEUD.ms - ev.left) / FEUD.driftMs), [lo, hi] = FEUD.hold;
      while (ev.steps < want) {
        ev.steps++;
        const d = (FEUD.drift[0] + roll(s) * (FEUD.drift[1] - FEUD.drift[0])) * (roll(s) < 0.5 ? -1 : 1), nb = Math.round((ev.bar + d) * 1000) / 1000;
        if ((nb >= lo && nb <= hi) || Math.abs(nb - 0.5) < Math.abs(ev.bar - 0.5)) { ev.bar = nb; ev.trend = Math.sign(d); } // trend: which way sides[0]'s share last moved (the card's arrow)
      }
    },
    // Time's up with your side ahead: the feud is yours.
    timeout: (s, ev, where) => (ev.side && feudShare(ev, ev.side) > 0.5 ? `${FACTIONS[ev.side].short} held ${where}. You won the feud: ${feudBonus(s, ev)}.` : null),
    won: (s, ev) => {
      const f = ev.side, o = rival(ev, f), beat = ev.runners[o];
      s.server.credits += feudPay(ev.level);
      // Picking a side never costs you: no ripple onto its rivals (the other side's rep stays put).
      changeRep(s, f, FEUD.rep, `You beat ${beat} for ${FACTIONS[f].short}`, { ripple: false });
      runnerDrop(s, ev, f);
      ev.wins = (ev.wins || 0) + 1;
      ev.trend = f === ev.sides[0] ? 1 : -1;
      ev.bar = Math.max(0, Math.min(1, Math.round(((ev.bar ?? 0.5) + ev.trend * FEUD.push) * 1000) / 1000));
      ev.runners[o] = runnerName(s, o); // a fresh runner
      if (feudShare(ev, f) >= 1) { ev.over = true; return `You beat ${beat} and won the feud for ${FACTIONS[f].short}: ${feudPay(ev.level)} credits, a protocol, ${feudBonus(s, ev)}.`; }
      return `You beat ${beat}: ${feudPay(ev.level)} credits and a protocol. ${FACTIONS[f].short} holds ${Math.round(feudShare(ev, f) * 100)}%.`;
    },
  },
  // A named elite that moves: every HUNT.hopMs it hops to another of your servers (its path is set when it's dealt, so
  // the map shows where it goes next), a level up each time and better paid. Kestrel are the hunters.
  hunt: {
    name: 'Bounty hunt', weight: 1.5, ms: (HUNT.hops + 1) * HUNT.hopMs, fight: true, from: HUNT.from,
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
    name: 'Market shock', weight: 1, ms: SHOCK.ms, from: SHOCK.from,
    where: (s) => (hackerLevel(s) >= SHOCK.from && markets(s).length ? [null] : []),
    make: (s) => { const hub = pick(s, markets(s)), ware = pick(s, SHOCK.wares), down = roll(s) < SHOCK.crash; return { hub, ware, mult: down ? SHOCK.down : SHOCK.up }; },
    text: (ev) => (ev.mult > 1 ? `${FACTIONS[ev.hub].short} pays ${ev.mult} times the usual for ${WARE_NAME[ev.ware]} for the next ${SHOCK.ms / 60000} minutes.` : `${cap(WARE_NAME[ev.ware])} sells at ${FACTIONS[ev.hub].short} for ${Math.round(ev.mult * 100)}% of the usual for the next ${SHOCK.ms / 60000} minutes.`),
    gone: (ev) => `${FACTIONS[ev.hub].short}'s price for ${WARE_NAME[ev.ware]} is back to normal.`,
  },
  // A spotter watching your wall (not the invasion kind Scout, invasion.mjs): a quick fight at home. Win and the next invasion comes SCOUTED.levels weaker, and
  // you know where from and what kind (invasion.mjs scoutNext). Let it go and nothing changes.
  spotter: {
    name: 'Spotter', weight: 1, ms: SCOUT_EVENT.ms, fight: true, from: SCOUT_EVENT.from, home: true,
    where: (s) => (hackerLevel(s) >= SCOUT_EVENT.from && invasionsLive(s) && !s.net?.scouted && !s.degraded ? [null] : []),
    make: (s) => ({ family: fam(s), level: hackerLevel(s), name: `SPOTTER-${1000 + Math.floor(roll(s) * 9000)}` }),
    text: (ev) => `A spotter, ${ev.name}, is watching your wall. Kill it and the next invasion comes ${SCOUTED.levels} levels weaker.`,
    reward: () => `the next invasion −${SCOUTED.levels} levels, and its kind`,
    gone: (ev) => `${ev.name} left your wall.`,
    won: (s, ev) => {
      const next = scoutNext(s, seeded(ev.seed)); // on the event's own dice
      return `${ev.name} is down. The next invasion${next ? `, a ${next.name.toLowerCase()} from ${next.from},` : ''} comes ${SCOUTED.levels} levels weaker.`;
    },
  },
  // ---------- follow-ups (chains): dealt only from the follow-up list (tickChains), never from the deck ----------
  // Counter-raid: the side you fought in a feud sends a runner at a server you hold (home if you hold none). Ignore it
  // and it leaves; nobody's rep moves. Beat it: credits and your side +rep, no ripple.
  counter: {
    name: 'Counter-raid', chain: true, weight: 0, ms: CHAIN.counter.ms, fight: true, where: () => [],
    spots: (s) => { const held = places(s).filter((l) => (l.runs || 0) > 0 || l.takenOver); return held.length ? held : [null]; },
    make: (s, loc, f) => ({ side: f.data.side, foe: f.data.foe, family: FACTION_FAMILY[f.data.foe], level: hackerLevel(s), name: runnerName(s, f.data.foe), elite: true, eliteHp: FEUD.hp }),
    from: (ev) => FACTIONS[ev.foe].short,
    text: (ev, where) => `${FACTIONS[ev.foe].short} sends ${ev.name} at ${ev.loc ? where : 'your server'} for the feud you fought for ${FACTIONS[ev.side].short}. Beat it before it leaves.`,
    reward: (ev) => `${counterPay(ev.level)} credits and ${FACTIONS[ev.side].short} +${CHAIN.counter.rep}`,
    gone: (ev) => `${ev.name} pulled back.`,
    won: (s, ev) => {
      s.server.credits += counterPay(ev.level);
      changeRep(s, ev.side, CHAIN.counter.rep, `You beat ${FACTIONS[ev.foe].short}'s counter-raid`, { ripple: false }); // never a loss with anyone
      return `You beat ${ev.name}: ${counterPay(ev.level)} credits. The feud is settled.`;
    },
  },
  // Returning bounty: a hunt that got away, back once with the same name, level and pay: a second chance. Never more
  // than the hunt would have paid, and it never comes back again, so letting a hunt go is never worth it.
  returning: {
    name: 'Returning bounty', chain: true, weight: 0, ms: CHAIN.returning.ms, fight: true, where: () => [],
    spots: (s) => places(s),
    make: (s, loc, f) => { const d = f.data; return { family: d.family, name: d.name, hunter: d.hunter, elite: true, level: d.level, pay: d.pay }; },
    from: (ev) => FACTIONS[ev.hunter].short,
    text: (ev, where) => `${ev.name} is back on ${where}, the level ${ev.level} ${FAMILIES[ev.family].name.toLowerCase()} virus that got away. This is the last chance at it.`,
    reward: (ev) => `${returnPay(ev)} credits and ${FACTIONS[ev.hunter].short} +${CHAIN.returning.rep}`,
    gone: (ev) => `${ev.name} got away for good.`,
    won: (s, ev) => {
      s.server.credits += returnPay(ev);
      changeRep(s, ev.hunter, CHAIN.returning.rep, 'Bounty collected', { ripple: false });
      return `Bounty collected on ${ev.name}: ${returnPay(ev)} credits.`;
    },
  },
  // LANTERN's offer: after CHAIN.lantern.at couriers you intercepted, LANTERN's own courier crosses one of your servers.
  // A stand-in: it becomes an Escort (docs/director.md section 4) in D3; until then a fight like a courier's.
  lantern: {
    name: "LANTERN's offer", chain: true, weight: 0, ms: CHAIN.lantern.ms, fight: true, where: () => [],
    spots: (s) => places(s),
    make: (s) => ({ family: FACTION_FAMILY.lantern, level: hackerLevel(s), name: `${RUNNER.lantern}-${1000 + Math.floor(roll(s) * 9000)}`, ally: hubFound(s, 'lantern') ? 'lantern' : 'halcyon' }),
    from: () => 'LANTERN',
    text: (ev, where) => `LANTERN noticed the couriers you took. Its own courier ${ev.name} crosses ${where}: intercept it for a Custom protocol.`,
    reward: (ev) => `a Custom protocol and ${FACTIONS[ev.ally].short} +${CHAIN.lantern.rep}`,
    won: (s, ev) => {
      addItem(s, rollItem(seeded(ev.seed), { level: ev.level, rarity: 'custom' }), "LANTERN's offer: ");
      changeRep(s, ev.ally, CHAIN.lantern.rep, "LANTERN's offer", { ripple: false });
      return `You took ${ev.name}'s package: a Custom protocol.`;
    },
  },
  // Patient zero: CHAIN.zero.at kills of the family during its outbreak deal the outbreak's source, an elite of that
  // family on one of your servers. Kill it and the outbreak ends early.
  zero: {
    name: 'Patient zero', chain: true, weight: 0, ms: CHAIN.zero.ms, fight: true, where: () => [],
    spots: (s) => places(s),
    make: (s, loc, f) => ({ family: f.data.family, outbreak: f.data.outbreak, level: hackerLevel(s), name: `${FAMILIES[f.data.family].name.toUpperCase()}-0`, elite: true }),
    from: () => 'Network',
    text: (ev, where) => `The ${FAMILIES[ev.family].name.toLowerCase()} outbreak's source, ${ev.name}, is on ${where}. Kill it and the outbreak ends.`,
    reward: (ev) => `${zeroCode(ev)} ${MATERIALS[codeOf(ev.family)]?.name || 'code'} and an elite's loot`,
    gone: (ev) => `${ev.name} went quiet.`,
    won: (s, ev) => {
      const k = codeOf(ev.family);
      if (k) gainCode(s, { [k]: zeroCode(ev) }, `${ev.name}'s cache: `);
      const ob = eventsOf(s).find((e) => e.card === 'outbreak' && e.id === ev.outbreak);
      if (ob) end(s, ob, `The ${FAMILIES[ob.family].name.toLowerCase()} outbreak is over: its source is down.`);
      return `${ev.name} is down.`;
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
export const courierPay = credits;
export const bountyPay = (level) => 80 + 15 * level;
// A hunt's time to its next hop (or to leaving, after the last).
export const hopLeft = (ev) => Math.max(0, ev.left - (HUNT.hops - ev.hop) * HUNT.hopMs);
// A counter-raid's pay: part of a bounty's credits (a feud runner's). A returning bounty's pay: what the hunt paid when it got away. Patient zero's cache: a vault's code.
export const counterPay = (level) => Math.round(bountyPay(level) * CHAIN.counter.pay);
export const returnPay = (ev) => ev.pay ?? bountyPay(ev.level);
export const zeroCode = (ev) => vaultCode(ev.level);
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
  tickChains(s, dt); // before the cards end: a follow-up one of them schedules now starts its delay from here
  for (const ev of [...eventsOf(s)]) {
    if (s.encounter?.event === ev.id && active(s)) continue; // the one you're fighting waits for you
    ev.left -= dt;
    const c = CARDS[ev.card];
    if (ev.left > 0) c.tick?.(s, ev); // a hunt hops
    else { const won = c.timeout?.(s, ev, placeName(s, ev.loc)); end(s, ev, won || (c.gone ? c.gone(ev, placeName(s, ev.loc)) : c.fight ? `${ev.name} left ${placeName(s, ev.loc)}.` : null), won ? 'world-event-won' : 'world-event-end'); }
  }
  dealDue(s); // and into the slots the cards just freed
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

// What an ended card was, for the public channel (channel.mjs): its name and kind, and a feud's winner (the side
// holding more of the bar, none if even).
const wire = (ev) => ({ name: ev.name, ...(ev.family ? { family: ev.family } : {}), ...(ev.hub ? { hub: ev.hub, ware: ev.ware } : {}), ...(ev.card === 'feud' ? { sides: ev.sides, winner: (ev.bar ?? 0.5) > 0.5 ? ev.sides[0] : (ev.bar ?? 0.5) < 0.5 ? ev.sides[1] : null } : {}) });
function end(s, ev, message, type = 'world-event-end', how = 'gone') {
  s.events = eventsOf(s).filter((e) => e !== ev);
  if (message) emit(s, type, message, { card: ev.card, location: ev.loc, ...wire(ev) });
  chainAfter(s, ev, how);
}

// ---------- chains (docs/director.md section 2) ----------
// The follow-up list: { kind, cause, dueIn, expiresIn, data } on s.director.chain (an older save just starts empty). cause
// names what happened and where (its card, name, server), for the card's link mark and the pager.
export const chainOf = (s) => ((s.director ||= { next: null, n: 0, last: null }).chain ||= []);
// Schedule a follow-up. A kind already pending doesn't stack, and the list holds CHAIN.max at most. The delay is on the
// director's dice (none for one that's dealt at once).
export function schedule(s, kind, cause, data, delay = CHAIN[kind].delay) {
  const list = chainOf(s);
  if (list.length >= CHAIN.max || list.some((f) => f.kind === kind) || eventsOf(s).some((e) => e.card === kind)) return null;
  const f = { kind, cause, dueIn: delay ? between(s, delay) : 0, expiresIn: CHAIN.expireMs, data };
  list.push(f);
  return f;
}
// What an ended card schedules. Only from what you did: a feud you won a fight in, a hunt you let go after a fight (or that
// finished its hops while you ran on its floor), couriers you took, kills in an outbreak. Ignoring a card starts nothing.
function chainAfter(s, ev, how) {
  const cause = { card: ev.card, id: ev.id, name: ev.name, loc: ev.loc || null };
  if (ev.card === 'feud' && ev.wins > 0 && ev.side) schedule(s, 'counter', { ...cause, side: ev.side }, { side: ev.side, foe: rival(ev, ev.side) });
  if (ev.card === 'hunt' && how === 'gone' && gotAway(s, ev)) schedule(s, 'returning', cause, { family: ev.family, name: ev.name, hunter: ev.hunter, level: ev.level, pay: huntPay(ev) });
  if (ev.card === 'courier' && how === 'won') {
    const d = s.director;
    d.couriers = (d.couriers || 0) + 1;
    if (d.couriers >= CHAIN.lantern.at) schedule(s, 'lantern', { card: 'courier', id: ev.id, name: ev.name, loc: ev.loc || null, count: d.couriers }, {}, null);
  }
}
// A hunt got away if you fought it and it left, or it made all its hops while you were on a run on its floor.
const floorOf = (s, id) => (s.locations || []).find((l) => l.id === id)?.depth || 1;
const gotAway = (s, ev) => !!ev.fought || (ev.hop >= HUNT.hops && !!s.run && floorOf(s, s.run.loc) === floorOf(s, ev.loc));
// A kill of a family (combat.mjs, every kill): it counts toward an outbreak's source. Kills only, nothing else read.
export function eventKill(s, family) {
  for (const ob of eventsOf(s).filter((e) => e.card === 'outbreak' && e.family === family && !e.zero)) {
    ob.kills = (ob.kills || 0) + 1;
    if (ob.kills >= CHAIN.zero.at) { ob.zero = true; schedule(s, 'zero', { card: 'outbreak', id: ob.id, name: FAMILIES[family].name, loc: null, kills: ob.kills }, { family, outbreak: ob.id }, null); }
  }
}
// The list on logged-on time only: its delays and expiries run down, an expired one goes without a word.
function tickChains(s, dt) {
  for (const f of chainOf(s)) { f.dueIn -= dt; f.expiresIn -= dt; }
  s.director.chain = chainOf(s).filter((f) => f.expiresIn > 0);
}
// Due: dealt into a free slot, else it waits (its expiry still running). Patient zero waits only while its outbreak is up.
function dealDue(s) {
  for (const f of [...chainOf(s)]) {
    if (f.kind === 'zero' && !eventsOf(s).some((e) => e.id === f.data.outbreak)) { s.director.chain = chainOf(s).filter((x) => x !== f); continue; }
    if (f.dueIn > 0 || eventsOf(s).length >= DIRECTOR.max || eventsOf(s).some((e) => e.card === f.kind)) continue;
    if (dealChain(s, f)) s.director.chain = chainOf(s).filter((x) => x !== f);
  }
}
// Deal a follow-up as a card (its cause on it, for the link). Returns the event, or null when it has nowhere to go yet.
export function dealChain(s, f) {
  const d = s.director, c = CARDS[f.kind], spots = c.spots(s, f).filter((l) => !l || !eventsAt(s, l.id).length);
  if (!spots.length) return null;
  const loc = pick(s, spots);
  const ev = { id: ++d.n, card: f.kind, loc: loc?.id || null, left: c.ms, seed: (d.n * 7919 + (loc?.seed || 1) * 31) >>> 0, cause: f.cause, ...c.make(s, loc, f) };
  if (f.kind === 'lantern') d.couriers = 0; // the count starts over once LANTERN's offer is dealt
  eventsOf(s).push(ev);
  emit(s, 'world-event', eventText(s, ev), { card: f.kind, event: ev.id, location: ev.loc, from: c.from(ev), chain: causeText(s, f.cause) });
  return ev;
}
// developer chain [counter|returning|lantern|zero]: a follow-up now, with a made-up cause (for tests and screenshots).
export function developerChain(s, kind) {
  const L = hackerLevel(s), at = places(s)[0]?.id || null, ob = eventsOf(s).find((e) => e.card === 'outbreak');
  const sides = feuds(s)[0] || ['halcyon', 'glassjaw'], family = ob?.family || fam(s);
  const fake = {
    counter: () => ({ cause: { card: 'feud', id: 0, name: sides.map((f) => FACTIONS[f].short).join(' vs '), loc: at, side: sides[0] }, data: { side: sides[0], foe: sides[1] } }),
    returning: () => ({ cause: { card: 'hunt', id: 0, name: `${pick(s, NAMES)}-${1000 + Math.floor(roll(s) * 9000)}`, loc: at }, data: { family, hunter: hunters(s), level: L, pay: bountyPay(L) } }),
    lantern: () => ({ cause: { card: 'courier', id: 0, name: `COURIER-${1000 + Math.floor(roll(s) * 9000)}`, loc: at, count: CHAIN.lantern.at }, data: {} }),
    zero: () => ({ cause: { card: 'outbreak', id: ob?.id || 0, name: FAMILIES[family].name, loc: null, kills: CHAIN.zero.at }, data: { family, outbreak: ob?.id || 0 } }),
  };
  if (!fake[kind]) return warn(s, `developer chain [${Object.keys(fake).join('|')}]`);
  const f = fake[kind](), k = kind;
  if (f.data.name == null && k === 'returning') f.data.name = f.cause.name;
  if (eventsOf(s).some((e) => e.card === k)) return warn(s, `A ${CARDS[k].name.toLowerCase()} is up already.`);
  if (!dealChain(s, { kind: k, ...f })) warn(s, `No ${CARDS[k].name.toLowerCase()} fits now: it needs a traced server.`);
}
// The cause, as a sentence for the link mark's tooltip and the pager.
export function causeText(s, c) {
  if (!c) return '';
  const where = c.loc ? ` on ${placeName(s, c.loc)}` : '';
  if (c.card === 'feud') return `Follows the feud ${c.name}${where}, where you fought for ${FACTIONS[c.side]?.short || 'a side'}.`;
  if (c.card === 'hunt') return `Follows ${c.name}'s escape${where}.`;
  if (c.card === 'courier') return `Follows the ${c.count || CHAIN.lantern.at} couriers you intercepted, the last ${c.name}${where}.`;
  if (c.card === 'outbreak') return `Follows the ${c.name.toLowerCase()} outbreak: you made ${c.kills || CHAIN.zero.at} kills of it.`;
  return `Follows ${c.name || 'an event'}${where}.`;
}

// event fight <id>: go after a courier or a bounty, from its server's map card. event fight <id> <faction>: a feud's side
// (it locks with your first fight; after that the faction can be left off).
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
  const f = c.foe ? m[2] || ev.side : null;
  if (c.foe && !ev.sides.includes(f)) return warn(s, `Pick a side: event fight ${ev.id} ${ev.sides.join('|')}.`);
  if (c.foe && ev.side && f !== ev.side) return warn(s, `You fight for ${FACTIONS[ev.side].short} in this feud.`);
  if (s.run) return warn(s, 'Jack out first.');
  if (active(s)) return warn(s, 'Finish the fight first.');
  const foe = c.foe ? c.foe(ev, f) : { family: ev.family, name: ev.name, elite: !!ev.elite, boss: ev.boss, eliteHp: ev.eliteHp };
  const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
  selectEncounter(s, 'random', (ev.seed + (c.foe ? ev.sides.indexOf(f) * 7919 + (ev.wins || 0) * 104729 : 0)) >>> 0, { level: ev.level, family: foe.family, name: foe.name, elite: !!foe.elite, ...(foe.eliteHp ? { eliteHp: foe.eliteHp } : {}), ...(foe.boss ? { boss: foe.boss } : {}), mutation: ev.mutation ?? null, quiet: true });
  if (!s.encounter || s.encounter.phase === 'active') return;
  if (c.foe) ev.side = f; // the side you fight for: locked from here
  ev.fought = true; // a hunt you fought and let go got away (chains)
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
  if (!CARDS[ev.card].again || ev.over) end(s, ev, null, 'world-event-end', 'won'); // a feud stays up for the next runner until it's won
  if (said) emit(s, 'world-event-won', said, { card: ev.card, location: ev.loc, ...(CARDS[ev.card].again && !ev.over ? { name: ev.name } : wire(ev)) });
}

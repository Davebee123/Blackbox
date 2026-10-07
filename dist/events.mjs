// The event director: now and then something happens on the net, and you can act on it or let it
// pass. It deals one card at a time from a small deck, never the same card twice in a row, on the
// network clock (logged-on time, from tickNetwork). Missing an event costs nothing.
//
//   courier   LANTERN's courier is carrying a dead drop through one of your servers. Intercept it
//             (a fight from the server's map card) for its credit cache and a protocol.
//   bounty    A named virus, two levels up, is loose on one of your servers. Kill it for a bounty.
//   outbreak  One family surges for a while: its kills drop double code.
//   leak      Someone leaks the vault key of a server you've found but not taken.
//
// Pure: state in, events out.
import { emit, warn, active, hackerLevel, selectEncounter, command, addItem, UNIQUES, giveUnique } from './combat.mjs';
import { FAMILIES, CONFIG } from './data.mjs';
import { rollItem, seeded } from './gear.mjs';
import { changeStanding } from './mail.mjs';
import { openFarm } from './rogue.mjs';

export const DIRECTOR = {
  from: 3, // class level the director starts dealing at
  firstMs: [4 * 60000, 8 * 60000], // logged-on time to the first event
  everyMs: [15 * 60000, 30 * 60000], // and between events
  max: 2, // events up at once
  named: 6, // one courier in this many carries a unique you're missing, by name
};
// Uniques you haven't found that drop out in the world at about your level (not a boss's, the farm's,
// a story's or a strain's trophy): what a courier can be carrying.
const WORLD = ['sprawl', 'vault', 'guard', 'rogue'];
const missing = (s) => Object.values(UNIQUES).filter((u) => !s.collection?.[u.id] && u.level <= hackerLevel(s) + 2 && (u.sources || []).some((src) => WORLD.includes(src.kind))).map((u) => u.id);
const FAMS = Object.keys(FAMILIES).filter((f) => ['ransomware', 'worm', 'ghostroot'].includes(f));
const NAMES = ['lapsejack', 'deductible', 'subrogate', 'rider', 'lossrun', 'waiver', 'binder', 'tallow', 'cinder', 'quarry'];

export const CARDS = {
  courier: {
    name: 'Courier', weight: 3, ms: 15 * 60000, fight: true,
    where: (s) => places(s),
    // About one courier in DIRECTOR.named carries a unique you haven't found, by name: a lucky shot.
    make: (s) => ({ family: pick(s, FAMS), level: hackerLevel(s), name: `COURIER-${1000 + Math.floor(roll(s) * 9000)}`, ...(roll(s) * DIRECTOR.named < 1 && missing(s).length ? { unique: pick(s, missing(s)) } : {}) }),
    text: (ev, where) => `LANTERN's courier ${ev.name} is carrying ${ev.unique ? `${UNIQUES[ev.unique].name}, a unique you haven't found,` : 'a dead drop'} through ${where}. Intercept it before it leaves to take ${ev.unique ? 'it' : 'the drop'}.`,
    reward: (ev) => `${credits(ev.level)} credits and ${ev.unique ? UNIQUES[ev.unique].name : 'a protocol'}`,
    won: (s, ev) => {
      s.server.credits += credits(ev.level);
      if (ev.unique) { giveUnique(s, ev.unique, 'Dead drop: '); return `You took the dead drop: ${credits(ev.level)} credits and ${UNIQUES[ev.unique].name}.`; }
      const r = seeded(ev.seed), item = rollItem(r, { level: ev.level, rarity: r() < 0.15 ? 'custom' : 'tuned' }); // fixed by the event
      addItem(s, item, 'Dead drop: ');
      return `You took the dead drop: ${credits(ev.level)} credits and a protocol.`;
    },
  },
  bounty: {
    name: 'Bounty', weight: 2, ms: 25 * 60000, fight: true,
    where: (s) => places(s),
    // From level 8 the bounty is REPO MAN, a boss (BOSSES.repoman) at your level instead of a named virus two up.
    make: (s) => (hackerLevel(s) >= 8 ? { family: 'ransomware', level: hackerLevel(s), name: 'REPO MAN', boss: 'repoman' } : { family: pick(s, FAMS), level: Math.min(CONFIG.maxMobLevel, hackerLevel(s) + 2), name: `${pick(s, NAMES)}-${1000 + Math.floor(roll(s) * 9000)}`, elite: true }),
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
    text: (ev, where) => `The HOLLOW CHOIR, a level ${ev.level} ghostroot boss, is singing through ${where}. It mirrors your commands, and at half it splits off a second Decoy. Silence it before it moves on.`,
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
    make: (s) => ({ family: pick(s, FAMS) }),
    text: (ev) => `A ${FAMILIES[ev.family].name.toLowerCase()} outbreak is spreading. For the next 30 minutes, ${FAMILIES[ev.family].name.toLowerCase()} kills drop double code.`,
  },
  leak: {
    name: 'Leak', weight: 1, ms: 10 * 60000,
    where: (s) => (s.locations || []).filter((l) => !l.rogue && !l.takenOver && !l.passwordKnown && !l.member),
    make: () => ({}),
    start: (s, ev, loc) => { loc.passwordKnown = true; },
    text: (ev, where) => `Someone leaked the vault key of ${where}. Its vault opens without the password now.`,
  },
};
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
export const eventText = (s, ev) => CARDS[ev.card].text(ev, (s.locations || []).find((l) => l.id === ev.loc)?.name || 'the net');
export const eventMinutes = (ev) => Math.max(1, Math.ceil(ev.left / 60000));
// Kills of a family in an outbreak drop this much more code.
export const outbreakMult = (s, family) => (eventsOf(s).some((e) => e.card === 'outbreak' && e.family === family) ? 2 : 1);

export function tickEvents(s, dt) {
  openFarm(s); // KESSLER-FARM-00 turns up at level 7 (rogue.mjs)
  const d = (s.director ||= { next: null, n: 0, last: null });
  for (const ev of [...eventsOf(s)]) {
    if (s.encounter?.event === ev.id && active(s)) continue; // the one you're fighting waits for you
    ev.left -= dt;
    if (ev.left <= 0) end(s, ev, CARDS[ev.card].fight ? `${ev.name} left ${(s.locations || []).find((l) => l.id === ev.loc)?.name || 'the net'}.` : null);
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
  let r = roll(s) * ids.reduce((n, k) => n + CARDS[k].weight, 0), id = ids[0];
  for (const k of ids) { r -= CARDS[k].weight; if (r < 0) { id = k; break; } }
  const c = CARDS[id], spots = c.where(s).filter((l) => !l || !eventsAt(s, l.id).length);
  if (!spots.length) return null;
  const loc = pick(s, spots);
  const ev = { id: ++d.n, card: id, loc: loc?.id || null, left: c.ms, seed: (d.n * 7919 + (loc?.seed || 1) * 31) >>> 0, ...c.make(s, loc) };
  c.start?.(s, ev, loc);
  d.last = id;
  if (c.ms && id !== 'leak') eventsOf(s).push(ev);
  emit(s, 'world-event', eventText(s, ev), { card: id, event: c.ms && id !== 'leak' ? ev.id : null, location: ev.loc });
  return ev;
}

function end(s, ev, message) {
  s.events = eventsOf(s).filter((e) => e !== ev);
  if (message) emit(s, 'world-event-end', message, { card: ev.card, location: ev.loc });
}

// event fight <id>: go after a courier or a bounty, from its server's map card.
export function eventCommand(s, text) {
  const m = text.match(/^event fight (\d+)$/);
  if (!m) return warn(s, 'usage: event fight <id>');
  const ev = eventById(s, m[1]);
  if (!ev || !CARDS[ev.card].fight) return warn(s, 'That event is over.');
  if (s.run) return warn(s, 'Jack out first.');
  if (active(s)) return warn(s, 'Finish the fight first.');
  const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
  selectEncounter(s, 'random', ev.seed, { level: ev.level, family: ev.family, name: ev.name, elite: !!ev.elite, ...(ev.boss ? { boss: ev.boss } : {}), mutation: null, quiet: true });
  if (!s.encounter || s.encounter.phase === 'active') return;
  s.gate = gate && gate !== s.encounter ? gate : null;
  s.encounter.event = ev.id;
  emit(s, 'jack-in', `Intercepting ${ev.name}.`, { location: ev.loc });
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

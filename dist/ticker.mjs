// The ticker (docs/ticker.md): market cards. Every 20–40 minutes of logged-on time a hub's owner (or the City Treasury,
// or Pellucid Payroll) moves prices for a while and says why in its own voice. Three at most run at once; nothing moves
// while you're logged off. market.mjs multiplies tickerMult into every price (and runners read it); view.mjs shows a
// card as the market window's tag and on the hub's map chip; its line goes to the Log (comms.mjs 'ticker').
//
// Seeded per network (s.netSeed): two favoured cards come up 2.5 times as often, a style weights the modifiers, and
// two of the five rare cards are the network's, each dealt once a playthrough. Two cards in five carry a modifier:
// Rushed (half as long, half again as big), Lingering (twice as long, half as big), Wide (a second hub posts it too),
// Leaked (GLASSJAW's early word puts it on the Log five minutes ahead) or Quiet (no Log line; only the hub's tag).
// Big is the distance from ×1. A hub's ware stays within ×0.4 and ×2.5 however many cards stack on it.
// Three price cards in ten carry a bulk order: it holds the card's price until it's filled (market.mjs: a unit sold
// into it presses nothing). Besides the hubs' own cards: two buyers (rival hubs bidding for one ware), a runner's
// corner (on #net, channel.mjs), and a crew's run, read off the director's Outbreak (events.mjs; never dealt here).
//
// Its own dice (mulberry32 on s.ticker.r), so the director's events and sites deal as before. Saved: s.ticker =
// { live, next, n, last, r, rare }, made once the hubs open; rare (the network's rare cards not yet dealt) on first use.
// events.mjs tickEvents ticks it on logged-on time.
// Light imports only: events.mjs loads it early, before combat.mjs has run (nothing here runs at load).
import { emit, warn } from './combat.mjs';
import { FACTIONS, hubsOf } from './factions.mjs';
import { castOf } from './runners.mjs';
import { codeOf } from './gear.mjs';
import { crewOf } from './authors.mjs';

export const TICK = {
  everyMs: [20 * 60000, 40 * 60000], // logged-on time between cards
  ms: 20 * 60000, // a card's minutes, unless it says otherwise
  favoured: 2.5, // a network's two favoured cards come up this much more often
  modChance: 0.4, // two cards in five carry a modifier
  clamp: [0.4, 2.5], // the ticker's combined multiplier on a hub's ware
  early: { n: 3, up: 1.3, down: 0.75 }, // GLASSJAW's early word: three flickers across the hubs
  order: { chance: 0.3, code: [20, 61], salvage: [40, 121], exploit: [2, 7] }, // a bulk order: three price cards in ten, its size by ware
  rivals: 1.4, // two buyers: each bids this for the ware
  corner: { mult: 1.4, ms: 10 * 60000 }, // a runner's corner on one code at their hub
  rare: 0.1, // while the network holds a rare card, one deal in ten is one
  leakMs: 5 * 60000, // Leaked: on the Log this long before it moves anything
  max: 3, // cards up on the net at once, a crew's run among them: a card due while it's full waits for a free slot
};
// A modifier: its minutes ×ms and its distance from ×1 ×big.
export const MODS = {
  rushed: { name: 'Rushed', ms: 0.5, big: 1.5 },
  lingering: { name: 'Lingering', ms: 2, big: 0.5 },
  wide: { name: 'Wide', ms: 1, big: 1 },
  leaked: { name: 'Leaked', ms: 1, big: 1 },
  quiet: { name: 'Quiet', ms: 1, big: 1 },
};
// A network's style: how its modifiers lean.
export const STYLES = {
  brisk: { rushed: 3, lingering: 1, wide: 1, leaked: 2, quiet: 1 },
  patient: { rushed: 1, lingering: 3, wide: 1, leaked: 1, quiet: 2 },
  loud: { rushed: 1, lingering: 1, wide: 3, leaked: 2, quiet: 0.5 },
  even: { rushed: 1, lingering: 1, wide: 1, leaked: 1, quiet: 1 },
};
const CODES = ['cipher', 'worm', 'kernel'];
const WARE_NAME = { cipher: 'Cipher code', worm: 'Worm code', kernel: 'Kernel code', exploit: 'Exploits', salvage: 'components' };
const ALL = Object.keys(WARE_NAME);

// The cards. by: the faction that posts it (its hub must be found), or null; owner: who speaks, when it isn't a hub;
// at: where it moves prices (its own hub, or '*' for every hub); ware: one ware, 'code' (one code, picked on the deal)
// or '*' (everything).
const card = (name, by, ware, mult, line, more = {}) => ({ name, by, at: by, ware, mult, line, ...more });
export const TICKER_CARDS = {
  premium: card('Premium review', 'halcyon', 'code', 1.6, 'ACTUARY is repricing. Live code is wanted for the model.'),
  rent: card('Rent day', 'halcyon', 'cipher', 1.4, 'Rent day. Every lease is Halcyon-guaranteed.'),
  smallprint: card('Small print', 'halcyon', 'cipher', 0.7, 'Claims arising from failure of the underlying system are excluded.'),
  rack: card('Rack closure', 'kestrel', 'salvage', 1.6, 'Rack 4 will close at the end of this cycle. Please collect your belongings.'),
  thermal: card('Thermal alarm', 'kestrel', 'kernel', 1.6, 'The north aisle is running warm. Kernel code is wanted for the tuning.'),
  insured: card('Insured lots', 'kestrel', 'code', 1.5, 'Corvid Exchange lists insured lots. Settlement guaranteed.', { ms: 30 * 60000 }),
  census: card('Census', 'lantern', 'worm', 1.5, 'Four. Nine. Nine. Census tonight. Worm carries the count.', { ms: 25 * 60000 }),
  beacon: card('Beacon repair', 'lantern', 'salvage', 1.5, 'The Bedrock beacon is quiet. Parts, please.'),
  openmic: card('Open mic', 'nullchoir', 'kernel', 1.5, 'Bring us anything. We pay fair, which is more than they do.'),
  rehearsal: card('Rehearsal', 'nullchoir', 'cipher', 1.5, "Send us TOLLGATE's code. We're learning the words."),
  rollback: card('Rollback night', 'nullchoir', 'salvage', 0.7, "Everyone's dead and still paying. Funny, isn't it? Let it roll back.", { at: '*', ms: 30 * 60000 }),
  auction: card('Report auction', 'glassjaw', 'exploit', 1.8, "Today's count, signed by INIT. Bids open."),
  sink: card('Sink clearance', 'glassjaw', 'kernel', 1.5, 'Whatever falls to the Sink, I buy. Kernel first.'),
  early: card('Early word', 'glassjaw', null, null, 'Three prices move in the next twenty minutes. I know which.', { flickers: true }), // its line names its minutes: no modifier
  claims: card('Claim files', 'glassjaw', 'exploit', 1.5, "Annick Life's claim files are moving to the Sink.", { ms: 25 * 60000 }),
  tax: card('Tax run', null, '*', 1.15, 'Tax rolls clearing. Expect delays on all other accounts.', { owner: 'City Treasury', at: '*' }),
  wage: card('Wage run', null, 'worm', 0.8, "A month of the city's wages, still settling.", { owner: 'Pellucid Payroll', at: '*', ms: 30 * 60000 }),
};
// Dealt like the hubs' cards (never favoured): two rival hubs bid for one ware (Corvid Exchange, the Stacks'
// commodities exchange, posts it), and a runner corners one code at their hub (their #net line, channel.mjs).
export const RIVALS = [['halcyon', 'glassjaw'], ['glassjaw', 'lantern'], ['kestrel', 'nullchoir'], ['halcyon', 'nullchoir']];
export const MORE_CARDS = {
  rivals: card('Two buyers', null, null, TICK.rivals, null, { owner: 'Corvid Exchange', rivals: true }),
  corner: card('Corner', null, 'code', TICK.corner.mult, null, { corner: true, ms: TICK.corner.ms }),
};
// Rare cards (market.md 5): each network holds two of the five, each dealt once a playthrough. moves: [hub, ware, mult]
// ('*' every hub).
export const RARE_CARDS = {
  original: card('The original', 'glassjaw', null, null, 'Ninety-one percent, the day before. I have the original. Make an offer.', { rare: [['glassjaw', 'exploit', 3]], ms: 10 * 60000 }),
  rackzero: card('Rack zero', 'kestrel', null, null, 'Rack 0 is open for inspection. It has not been opened since 2041.', { rare: [['kestrel', 'salvage', 1.5], ['*', 'kernel', 0.6]], ms: 30 * 60000 }),
  everyname: card('Every name', 'lantern', null, null, 'Four. Nine. Nine. Tonight we read every name.', { rare: [['lantern', 'worm', 1.5]], ms: 30 * 60000 }),
  longrollback: card('The long rollback', 'nullchoir', null, null, 'One whole floor of debts. We sang it back to nothing.', { rare: [['*', 'salvage', 0.6]], ms: 30 * 60000 }),
  guarantee: card('The Guarantee, renewed', 'halcyon', null, null, 'The Halcyon Guarantee is renewed for a further thirty years.', { rare: [['halcyon', 'cipher', 1.5]], ms: 30 * 60000 }),
};
// A crew's run: the director's Outbreak (events.mjs) of a family a crew writes. Its code goes ×0.8 everywhere while it
// runs, and the crew says so on #net (channel.mjs). Read off the outbreak, never saved here.
export const CREW_RUNS = {
  tollgate: { name: "TOLLGATE's run", owner: 'TOLLGATE', line: 'Twelve trades locked since midnight. The keys are for sale at the usual rate.' },
  swarmline: { name: "SWARMLINE's rental", owner: 'SWARMLINE', line: 'Botnet for rent by the hour. Bring your own target.' },
  palemask: { name: "PALEMASK's harvest", owner: 'PALEMASK', line: 'Harvest night. Whatever you left open, we kept a copy.' },
};
export const CREW_MULT = 0.8;
export const crewRun = (family) => CREW_RUNS[crewOf(family)] ? { id: crewOf(family), ...CREW_RUNS[crewOf(family)], ware: codeOf(family) } : null;
const defOf = (k) => TICKER_CARDS[k] || MORE_CARDS[k] || RARE_CARDS[k] || null;
// Who speaks a live card (a corner's runner, its own) and its line.
const ownerOf = (c) => c.who || defOf(c.card)?.owner || FACTIONS[defOf(c.card)?.by]?.short || '';
const lineOf = (c) => c.line || defOf(c.card)?.line || '';

// ---------- the network's leaning ----------
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    let t = (a = (a + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SIG = new Map();
// A network seed's ticker: its two favoured cards and its style. The seed alone decides it.
export function tickerSig(seed) {
  seed = (seed >>> 0) || 1;
  if (SIG.has(seed)) return SIG.get(seed);
  const r = mulberry(seed ^ 0x7c1e4b29), ids = Object.keys(TICKER_CARDS), favoured = [];
  for (let i = 0; i < 2; i++) favoured.push(ids.splice(Math.floor(r() * ids.length), 1)[0]);
  const styles = Object.keys(STYLES), sig = { favoured, style: styles[Math.floor(r() * styles.length)] };
  const rare = Object.keys(RARE_CARDS);
  sig.rare = [0, 1].map(() => rare.splice(Math.floor(r() * rare.length), 1)[0]);
  SIG.set(seed, sig);
  return sig;
}
const netSeed = (s) => (s.netSeed >>> 0) || 0;
export const sigFor = (s) => tickerSig(netSeed(s) || s.seed || 1);

// ---------- state and dice ----------
export const tickerOf = (s) => (s.ticker ||= { live: [], next: null, n: 0, last: null });
export const liveCards = (s) => s.ticker?.live || []; // reads the save without writing to it
// The network's rare cards not yet dealt (made on first use).
export const raresLeft = (s) => (tickerOf(s).rare ||= [...sigFor(s).rare]);
function roll(s) {
  const d = tickerOf(s);
  let t = (d.r = ((d.r ?? (((netSeed(s) || s.seed || 1) * 37) ^ 0x7ac3e1)) + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (s, [lo, hi]) => lo + Math.floor(roll(s) * (hi - lo));
const pick = (s, xs) => xs[Math.floor(roll(s) * xs.length)];
const wpick = (s, xs, w) => { let x = roll(s) * xs.reduce((n, k) => n + w(k), 0); for (const k of xs) { x -= w(k); if (x < 0) return k; } return xs.at(-1); };
const round = (x) => Math.round(x * 100) / 100;
const markets = (s) => hubsOf(s).map((h) => h.faction);

// ---------- the clock ----------
// Logged-on time only (events.mjs tickEvents): the live cards run down, and a card is dealt when one is due.
export function tickTicker(s, dt) {
  if (!s.ticker && !markets(s).length) return; // nothing before the hubs open
  const d = tickerOf(s);
  for (const c of [...d.live]) {
    let t = dt;
    if (c.wait > 0) { c.wait -= t; if (c.wait > 0) continue; t = -c.wait; c.wait = 0; } // a leaked card: on the Log, not moving yet
    c.left -= t;
    if (c.left <= 0) d.live.splice(d.live.indexOf(c), 1);
  }
  if (!markets(s).length) return;
  if (d.next == null) d.next = between(s, TICK.everyMs);
  d.next -= dt;
  if (d.next > 0 || upCount(s) >= TICK.max) return; // due, and waiting for a free slot
  d.next = between(s, TICK.everyMs);
  dealTicker(s);
}

// Where a card could go now: two buyers' rival pairs with both hubs found; a corner's runners on the net whose hub is.
const pairs = (hubs) => RIVALS.filter((p) => p.every((f) => hubs.includes(f)));
const cornerers = (s, hubs) => castOf(s).filter((r) => hubs.includes(r.faction));
// Cards up on the net now: the live ones (a leaked one waiting too) and a crew's run.
const upCount = (s) => liveCards(s).length + (s.events || []).filter((e) => e.card === 'outbreak' && crewRun(e.family)?.ware).length;
// A card that can be dealt now: not up already, and its poster's hub found (a rare card: the network's, not dealt yet).
function fits(s, k, hubs) {
  const def = defOf(k);
  if (!def || liveCards(s).some((c) => c.card === k)) return false;
  if (def.by && !hubs.includes(def.by)) return false;
  if (def.flickers) return hubs.length > 1;
  if (def.rivals) return pairs(hubs).length > 0;
  if (def.corner) return cornerers(s, hubs).length > 0;
  return true;
}
const SHORT_WARE = { cipher: 'cipher', worm: 'worm', kernel: 'kernel' };
// Deal a card (or the one asked for). mod: undefined rolls one (two cards in five), null deals it plain, or a modifier's
// id. Returns the live card, or null when nothing fits.
export function dealTicker(s, id = null, mod = undefined) {
  const hubs = markets(s);
  if (!hubs.length) return null;
  const d = tickerOf(s), sig = sigFor(s);
  let k = id && fits(s, id, hubs) ? id : null;
  if (id && !k) return null;
  if (!k) { // one deal in ten is a rare card, while the network holds one that fits
    const rares = raresLeft(s).filter((x) => fits(s, x, hubs));
    if (rares.length && roll(s) < TICK.rare) k = pick(s, rares);
  }
  if (!k) {
    const ids = [...Object.keys(TICKER_CARDS), ...Object.keys(MORE_CARDS)].filter((x) => x !== d.last && fits(s, x, hubs));
    if (!ids.length) return null;
    k = ids.length === 1 ? ids[0] : wpick(s, ids, (x) => (sig.favoured.includes(x) ? TICK.favoured : 1));
  }
  const def = defOf(k), c = { id: ++d.n, card: k };
  if (RARE_CARDS[k]) d.rare = raresLeft(s).filter((x) => x !== k); // once a playthrough
  let moves;
  if (def.flickers) {
    const spots = hubs.flatMap((hub) => ALL.map((ware) => ({ hub, ware })));
    moves = [];
    for (let i = 0; i < TICK.early.n && spots.length; i++) moves.push({ ...spots.splice(Math.floor(roll(s) * spots.length), 1)[0], mult: roll(s) < 0.5 ? TICK.early.up : TICK.early.down });
  } else if (def.rare) moves = def.rare.map(([hub, ware, mult]) => ({ hub, ware, mult }));
  else if (def.rivals) {
    const pair = pick(s, pairs(hubs)), ware = pick(s, ALL);
    moves = pair.map((hub) => ({ hub, ware, mult: def.mult }));
    c.line = `${FACTIONS[pair[0]].short} and ${FACTIONS[pair[1]].short} are bidding against each other for ${WARE_NAME[ware]}.`;
  } else if (def.corner) {
    const r = pick(s, cornerers(s, hubs)), ware = pick(s, CODES);
    moves = [{ hub: r.faction, ware, mult: def.mult }];
    c.who = r.handle;
    c.line = `buying every ${SHORT_WARE[ware]} lot at ${FACTIONS[r.faction].short.toLowerCase()}. sell me yours`;
  } else moves = [{ hub: def.at, ware: def.ware === 'code' ? pick(s, CODES) : def.ware, mult: def.mult }];
  // Its modifier. None on GLASSJAW's early word (its line names its minutes), a corner or a rare card. Wide only for a
  // card at one hub, with another hub found to post it too; Leaked only with GLASSJAW found, on another's card.
  const one = moves.length === 1 && moves[0].hub !== '*', others = one ? hubs.filter((h) => h !== moves[0].hub) : [];
  const can = def.flickers || def.corner || def.rare ? [] : ['rushed', 'lingering', ...(others.length ? ['wide'] : []), ...(hubs.includes('glassjaw') && def.by !== 'glassjaw' ? ['leaked'] : []), 'quiet'];
  const style = STYLES[sig.style];
  const m = mod === undefined ? (can.length && roll(s) < TICK.modChance ? wpick(s, can, (x) => style[x]) : null) : can.includes(mod) ? mod : null;
  let ms = def.ms || TICK.ms;
  if (m) {
    ms *= MODS[m].ms;
    moves = moves.map((x) => ({ ...x, mult: round(1 + (x.mult - 1) * MODS[m].big) }));
    if (m === 'wide') moves = [...moves, ...moves.map((x) => ({ ...x, hub: pick(s, others) }))];
  }
  // A bulk order: on three price cards in ten that raise one ware's price at a hub, the first such hub's.
  const want = moves.find((x) => x.hub !== '*' && x.ware !== '*' && x.mult > 1);
  if (want && !def.flickers && roll(s) < TICK.order.chance) {
    const n = between(s, TICK.order[CODES.includes(want.ware) ? 'code' : want.ware]);
    c.order = { hub: want.hub, ware: want.ware, n, left: n };
  }
  Object.assign(c, { left: ms, ms, moves, ...(m ? { mod: m } : {}), ...(m === 'leaked' ? { wait: TICK.leakMs } : {}) });
  d.live.push(c);
  d.last = k;
  const hub = moves.find((x) => x.hub !== '*')?.hub || def.by; // where its Log line opens: its hub's market (none for the city's)
  const owner = ownerOf(c), line = lineOf(c);
  if (m === 'leaked') emit(s, 'ticker', `GLASSJAW: In five minutes, ${owner} posts this: “${line}”`, { tk: c.id, name: def.name, owner: 'GLASSJAW', line: `In five minutes, ${owner} posts this: “${line}”`, ...(hub ? { hub } : {}) });
  else if (m !== 'quiet') emit(s, 'ticker', `${owner}: ${line}`, { tk: c.id, name: def.name, owner, line, ...(hub ? { hub } : {}), ...(c.who ? { runner: c.who } : {}) });
  return c;
}

// ---------- what moves a price ----------
// The cards moving prices now: the live ones (not a leaked one still waiting) and a crew's run off each outbreak.
function moving(s) {
  const out = liveCards(s).filter((c) => !(c.wait > 0));
  for (const ev of s.events || []) {
    const run = ev.card === 'outbreak' && crewRun(ev.family);
    if (run?.ware) out.push({ id: `ob${ev.id}`, card: 'crew', crew: run.id, left: ev.left, ms: 30 * 60000, moves: [{ hub: '*', ware: run.ware, mult: CREW_MULT }] });
  }
  return out;
}
const hits = (x, f, w) => (x.hub === '*' || x.hub === f) && (!w || x.ware === '*' || x.ware === w);
// The ticker's multiplier on a hub's ware (market.mjs outsideMult and marketRead): every live card's, within the clamp.
export function tickerMult(s, f, w) {
  let m = 1;
  for (const c of moving(s)) for (const x of c.moves) if (hits(x, f, w)) m *= x.mult;
  return Math.min(TICK.clamp[1], Math.max(TICK.clamp[0], m));
}
// A live bulk order for a hub's ware: how many units it still wants (market.mjs: those press nothing). 0 for none.
export const orderLeft = (s, f, w) => liveCards(s).filter((c) => !(c.wait > 0) && c.order?.hub === f && c.order.ware === w).reduce((n, c) => n + c.order.left, 0);
// Units sold into it (market.mjs trade): the oldest order first.
export function fillOrder(s, f, w, n) {
  for (const c of liveCards(s)) {
    if (n <= 0) break;
    if (c.wait > 0 || c.order?.hub !== f || c.order.ware !== w) continue;
    const k = Math.min(n, c.order.left);
    c.order.left -= k; n -= k;
  }
}
// The live cards that move a hub's prices (or one ware's there), strongest first: { id, card, name, owner, line, mult,
// ware, left, ms, mod, moves, rare, crew (a crew's run: the crew's id), order }. mult and ware are its strongest move
// there; order its bulk order here.
export function tickerAt(s, f, w = null) {
  const out = [];
  for (const c of moving(s)) {
    const xs = c.moves.filter((x) => hits(x, f, w));
    if (!xs.length) continue;
    const top = xs.reduce((a, b) => (Math.abs(Math.log(b.mult)) > Math.abs(Math.log(a.mult)) ? b : a));
    const run = c.crew ? CREW_RUNS[c.crew] : null, order = c.order?.hub === f && c.order.left > 0 && (!w || c.order.ware === w) ? c.order : null;
    out.push({ id: c.id, card: c.card, name: run?.name || defOf(c.card).name, owner: run?.owner || ownerOf(c), line: run?.line || lineOf(c), mult: top.mult, ware: top.ware, left: c.left, ms: c.ms, mod: c.mod || null, moves: xs, rare: !!RARE_CARDS[c.card], crew: run ? c.crew : null, order });
  }
  return out.sort((a, b) => Math.abs(Math.log(b.mult)) - Math.abs(Math.log(a.mult)));
}
// The card driving a hub's ware hardest (runners.mjs: why they took a job), or null.
export const tickerName = (s, f, w) => tickerAt(s, f, w)[0]?.name || null;
export const minutesLeft = (c) => Math.max(1, Math.ceil(c.left / 60000));
// Its tooltip, WoW grammar: the name, what it does here and when it ends, then its owner's line. Its kind line is
// tickerKind.
const does = (x) => (x.ware === '*' ? `Multiplies every price here by ${x.mult}.` : `Multiplies the price of ${WARE_NAME[x.ware]} here by ${x.mult}.`);
const wants = (o) => (o ? ` Wants ${o.left} more ${WARE_NAME[o.ware]}; selling into the order doesn't lower the price.` : '');
export const tickerTip = (c) => `${c.name}: ${c.moves.map(does).join(' ')}${wants(c.order)} Ends in ${minutesLeft(c)} minute${minutesLeft(c) > 1 ? 's' : ''}.\n“${c.line}”`;
export const tickerKind = (c) => [c.owner, c.crew ? 'Crew run' : c.rare ? 'Rare market card' : 'Market card', c.mod && MODS[c.mod].name].filter(Boolean).join(' · ');
// A bulk order's tooltip (the chip on its ware's price): its name, kind, what it does.
export const orderTip = (c) => `Bulk order: ${FACTIONS[c.order.hub]?.short} buys ${c.order.left} more ${WARE_NAME[c.order.ware]} at this price. Selling into it doesn't lower the price. Ends with ${c.name} in ${minutesLeft(c)} minute${minutesLeft(c) > 1 ? 's' : ''}.`;

// `developer ticker [card] [modifier]`: a card now (a rare card too, whether the network holds it or not).
export function developerTicker(s, text) {
  const [, , id = null, mod] = text.split(' ');
  const ids = [...Object.keys(TICKER_CARDS), ...Object.keys(MORE_CARDS), ...Object.keys(RARE_CARDS)];
  if ((id && !defOf(id)) || (mod && !MODS[mod])) return warn(s, `developer ticker [${ids.join('|')}] [${Object.keys(MODS).join('|')}]`);
  if (!dealTicker(s, id, mod || undefined)) warn(s, id ? `${defOf(id).name} doesn't fit now (its hub not found, or it's up already).` : 'No market card fits now (the hubs open with the board).');
}

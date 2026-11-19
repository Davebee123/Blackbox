// The ticker (docs/ticker.md): market cards. Every 20–40 minutes of logged-on time a hub's owner (or the City Treasury,
// or Pellucid Payroll) moves prices for a while and says why in its own voice. Several can run at once; nothing moves
// while you're logged off. market.mjs multiplies tickerMult into every price (and runners read it); view.mjs shows a
// card as the market window's tag and on the hub's map chip; its line goes to the Log (comms.mjs 'ticker').
//
// Seeded per network (s.netSeed): two favoured cards come up 2.5 times as often, and a style weights the modifiers.
// Two cards in five carry a modifier: Rushed (half as long, half again as big), Lingering (twice as long, half as big)
// or Wide (a second hub posts it too). Big is the distance from ×1. A hub's ware stays within ×0.4 and ×2.5 however
// many cards stack on it.
//
// Its own dice (mulberry32 on s.ticker.r), so the director's events and sites deal as before. Saved: s.ticker =
// { live, next, n, last, r }, made once the hubs open. events.mjs tickEvents ticks it on logged-on time.
// Light imports only: events.mjs loads it early, before combat.mjs has run (nothing here runs at load).
import { emit, warn } from './combat.mjs';
import { FACTIONS, hubsOf } from './factions.mjs';

export const TICK = {
  everyMs: [20 * 60000, 40 * 60000], // logged-on time between cards
  ms: 20 * 60000, // a card's minutes, unless it says otherwise
  favoured: 2.5, // a network's two favoured cards come up this much more often
  modChance: 0.4, // two cards in five carry a modifier
  clamp: [0.4, 2.5], // the ticker's combined multiplier on a hub's ware
  early: { n: 3, up: 1.3, down: 0.75 }, // GLASSJAW's early word: three flickers across the hubs
};
// A modifier: its minutes ×ms and its distance from ×1 ×big.
export const MODS = {
  rushed: { name: 'Rushed', ms: 0.5, big: 1.5 },
  lingering: { name: 'Lingering', ms: 2, big: 0.5 },
  wide: { name: 'Wide', ms: 1, big: 1 },
};
// A network's style: how its modifiers lean.
export const STYLES = {
  brisk: { rushed: 3, lingering: 1, wide: 1 },
  patient: { rushed: 1, lingering: 3, wide: 1 },
  loud: { rushed: 1, lingering: 1, wide: 3 },
  even: { rushed: 1, lingering: 1, wide: 1 },
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
export const ownerOf = (k) => TICKER_CARDS[k].owner || FACTIONS[TICKER_CARDS[k].by]?.short || '';

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
  SIG.set(seed, sig);
  return sig;
}
const netSeed = (s) => (s.netSeed >>> 0) || 0;
export const sigFor = (s) => tickerSig(netSeed(s) || s.seed || 1);

// ---------- state and dice ----------
export const tickerOf = (s) => (s.ticker ||= { live: [], next: null, n: 0, last: null });
export const liveCards = (s) => s.ticker?.live || []; // reads the save without writing to it
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
  for (const c of [...d.live]) { c.left -= dt; if (c.left <= 0) d.live.splice(d.live.indexOf(c), 1); }
  if (!markets(s).length) return;
  if (d.next == null) d.next = between(s, TICK.everyMs);
  d.next -= dt;
  if (d.next > 0) return;
  d.next = between(s, TICK.everyMs);
  dealTicker(s);
}

// A card that can be dealt now: not up already, and its poster's hub found.
const fits = (s, k, hubs) => !liveCards(s).some((c) => c.card === k) && (!TICKER_CARDS[k].by || hubs.includes(TICKER_CARDS[k].by)) && (!TICKER_CARDS[k].flickers || hubs.length > 1);
// Deal a card (or the one asked for). mod: undefined rolls one (two cards in five), null deals it plain, or a modifier's
// id. Returns the live card, or null when nothing fits.
export function dealTicker(s, id = null, mod = undefined) {
  const hubs = markets(s);
  if (!hubs.length) return null;
  const d = tickerOf(s), sig = sigFor(s);
  const ids = (id ? [id] : Object.keys(TICKER_CARDS).filter((k) => k !== d.last)).filter((k) => TICKER_CARDS[k] && fits(s, k, hubs));
  if (!ids.length) return null;
  const k = ids.length === 1 ? ids[0] : wpick(s, ids, (x) => (sig.favoured.includes(x) ? TICK.favoured : 1)), def = TICKER_CARDS[k];
  let moves;
  if (def.flickers) {
    const spots = hubs.flatMap((hub) => ALL.map((ware) => ({ hub, ware })));
    moves = [];
    for (let i = 0; i < TICK.early.n && spots.length; i++) moves.push({ ...spots.splice(Math.floor(roll(s) * spots.length), 1)[0], mult: roll(s) < 0.5 ? TICK.early.up : TICK.early.down });
  } else moves = [{ hub: def.at, ware: def.ware === 'code' ? pick(s, CODES) : def.ware, mult: def.mult }];
  // Its modifier: Wide only for a card at one hub, with another hub found to post it too.
  const others = def.at === '*' || def.flickers ? [] : hubs.filter((h) => h !== def.at);
  const can = def.flickers ? [] : ['rushed', 'lingering', ...(others.length ? ['wide'] : [])];
  const style = STYLES[sig.style];
  const m = mod === undefined ? (can.length && roll(s) < TICK.modChance ? wpick(s, can, (x) => style[x]) : null) : can.includes(mod) ? mod : null;
  let ms = def.ms || TICK.ms;
  if (m) {
    ms *= MODS[m].ms;
    moves = moves.map((x) => ({ ...x, mult: round(1 + (x.mult - 1) * MODS[m].big) }));
    if (m === 'wide') moves = [...moves, ...moves.map((x) => ({ ...x, hub: pick(s, others) }))];
  }
  const c = { id: ++d.n, card: k, left: ms, ms, moves, ...(m ? { mod: m } : {}) };
  d.live.push(c);
  d.last = k;
  const hub = moves.find((x) => x.hub !== '*')?.hub || def.by; // where its Log line opens: its hub's market (none for the city's)
  emit(s, 'ticker', `${ownerOf(k)}: ${def.line}`, { tk: c.id, name: def.name, owner: ownerOf(k), line: def.line, ...(hub ? { hub } : {}) });
  return c;
}

// ---------- what moves a price ----------
const hits = (x, f, w) => (x.hub === '*' || x.hub === f) && (!w || x.ware === '*' || x.ware === w);
// The ticker's multiplier on a hub's ware (market.mjs outsideMult and marketRead): every live card's, within the clamp.
export function tickerMult(s, f, w) {
  let m = 1;
  for (const c of liveCards(s)) for (const x of c.moves) if (hits(x, f, w)) m *= x.mult;
  return Math.min(TICK.clamp[1], Math.max(TICK.clamp[0], m));
}
// The live cards that move a hub's prices (or one ware's there), strongest first: { id, card, name, owner, line, mult,
// ware, left, mod, moves }. mult and ware are its strongest move there.
export function tickerAt(s, f, w = null) {
  const out = [];
  for (const c of liveCards(s)) {
    const xs = c.moves.filter((x) => hits(x, f, w));
    if (!xs.length) continue;
    const top = xs.reduce((a, b) => (Math.abs(Math.log(b.mult)) > Math.abs(Math.log(a.mult)) ? b : a));
    const def = TICKER_CARDS[c.card];
    out.push({ id: c.id, card: c.card, name: def.name, owner: ownerOf(c.card), line: def.line, mult: top.mult, ware: top.ware, left: c.left, mod: c.mod || null, moves: xs });
  }
  return out.sort((a, b) => Math.abs(Math.log(b.mult)) - Math.abs(Math.log(a.mult)));
}
// The card driving a hub's ware hardest (runners.mjs: why they took a job), or null.
export const tickerName = (s, f, w) => tickerAt(s, f, w)[0]?.name || null;
export const minutesLeft = (c) => Math.max(1, Math.ceil(c.left / 60000));
// Its tooltip, WoW grammar: the name, what it does here and when it ends, then its owner's line. Its kind line is
// tickerKind.
const does = (x) => (x.ware === '*' ? `Multiplies every price here by ${x.mult}.` : `Multiplies the price of ${WARE_NAME[x.ware]} here by ${x.mult}.`);
export const tickerTip = (c) => `${c.name}: ${c.moves.map(does).join(' ')} Ends in ${minutesLeft(c)} minute${minutesLeft(c) > 1 ? 's' : ''}.\n“${c.line}”`;
export const tickerKind = (c) => [c.owner, 'Market card', c.mod && MODS[c.mod].name].filter(Boolean).join(' · ');

// `developer ticker [card] [rushed|lingering|wide]`: a card now.
export function developerTicker(s, text) {
  const [, , id = null, mod] = text.split(' ');
  if ((id && !TICKER_CARDS[id]) || (mod && !MODS[mod])) return warn(s, `developer ticker [${Object.keys(TICKER_CARDS).join('|')}] [${Object.keys(MODS).join('|')}]`);
  if (!dealTicker(s, id, mod || undefined)) warn(s, id ? `${TICKER_CARDS[id].name} doesn't fit now (its hub not found, or it's up already).` : 'No market card fits now (the hubs open with the board).');
}

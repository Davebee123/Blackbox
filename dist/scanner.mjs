// The scanner (GAME_RULES.md "The scanner"): the Listening Post's radio, the calm side activity with no risk.
// One station is on the air at a time, for 2–3 minutes, then 15–30 minutes of quiet. Tune the dial to it by the
// S-meter and the static clearing (the dial never shows where an unlogged one is). Close in and it bites: the dial
// zooms in, the carrier moves its kind's way, and holding it in the hold zone round the needle fills the lock. A full
// lock logs it, and it signs off. A numbers station pays once; a pirate or a distress call pays each time it's caught:
//   numbers   a line of lore, kept in the log (LANTERN's voice: the coordinates wait for off-map servers)
//   pirate    a tip: one hub's price for one ware moves for a while (market.mjs outsideMult, tipMult)
//   distress  a thread starts on the server it names (threads.mjs pinDistress)
// Radio traffic sits across the band too: transmissions you run into while sweeping, nothing to catch.
// The post records each broadcast: the tape holds the last one until the next starts, and Play back puts it back on
// the air once, so the trip to the post never costs you a broadcast.
//
// State: s.scanner (scannerOf, made on first use: the save keys on the field). The needle, the bite and the lock are
// the view's (scanner-view.mjs), worked by tuneStep here. Times in the save are ms; the rules' clock t is seconds.
import { emit, hooks, hackerLevel } from './combat.mjs';
import { seeded } from './gear.mjs';
import { FACTIONS, hubsOf } from './factions.mjs';
import { WARES, tipMult } from './market.mjs';
import { eligible, chainDef, pinDistress } from './threads.mjs';
import { floorsOf } from './floors.mjs';

export const SCANNER = {
  band: [3, 12], // MHz
  reach: 0.15, // a station is heard within this of its carrier
  bite: { d: 0.04, s: 0.3 }, // closer than this, at a strength over this, it bites
  fine: 0.8, // the dial's window once it bites
  hold: 0.025, // the hold zone either side of the needle
  fill: 5, drain: 8, // seconds for the lock to fill in the zone, and to drain out of it
  faded: 0.3, // a carrier fainter than this (a distress call fading) pauses the lock
  on: [120, 180], quiet: [900, 1800], first: 300, signoff: 8, ramp: 4, // seconds
  traffic: 0.06, // radio traffic is heard within this
};

// The stations. A pirate's tip lands on a hub you've found ({hub}); a distress call names a server of yours ({server}).
export const STATIONS = [
  { id: 'sparrow', kind: 'numbers', f: 6.815, name: 'SPARROW-9', text: '47190 22816 03375 · 47190 22816 03375 · end',
    lore: { title: 'Retired', line: 'Old viruses never die. Someone keeps them, out past the floors you can trace.' } },
  { id: 'kite', kind: 'numbers', f: 11.140, name: 'KITE-4', text: 'achtung. 3 3 1. 3 3 1. null null 7 2. ende',
    lore: { title: 'Debug build', line: 'A dev box was left running somewhere below. Every number on it shows.' } },
  { id: 'wren', kind: 'numbers', f: 8.215, name: 'WREN-2', text: '00412 00412 · 9 9 1 4 0 · 00412 · repeat',
    lore: { title: 'Last log', line: 'A crashed session keeps its last log. Its runner wrote down what killed them.' } },
  { id: 'owl', kind: 'numbers', f: 5.235, name: 'OWL-7', text: 'the floor under bedrock is not empty. repeat. not empty',
    lore: { title: 'Under Bedrock', line: 'Bedrock is the last floor on the map. It is not the last floor.' } },
  { id: 'tarbeach', kind: 'pirate', f: 9.355, name: 'TAR BEACH FM', text: 'kernel moves at {hub}. twenty minutes. you never heard it here',
    tip: { ware: 'kernel', mult: 1.3, mins: 20 } },
  { id: 'nullhour', kind: 'pirate', f: 7.640, name: 'NULL HOUR', text: 'cipher is cheap at {hub} till the hour turns. buy, buy',
    tip: { ware: 'cipher', mult: 0.75, mins: 60 } },
  { id: 'church', kind: 'pirate', f: 10.420, name: 'STATIC CHURCH', text: 'worm code, brothers. {hub} pays half again till the bell',
    tip: { ware: 'worm', mult: 1.5, mins: 40 } },
  { id: 'kade', kind: 'distress', f: 4.625, name: 'MAYDAY · KADE', text: 'this is m.kade. still on {server}. session is open. somebody tell rho',
    chain: 'tpl:talk:0' },
  { id: 'homing', kind: 'distress', f: 5.770, name: 'SOS · HOMING', text: 'homing.bin, three hops out on {server}. cannot see the way. clear it',
    chain: 'tpl:escort:1' },
  { id: 'loop', kind: 'distress', f: 11.705, name: 'DEAD LOOP', text: 'if this is playing i am gone. {server}. it is still building. stop it',
    chain: 'tpl:temp:1' },
];
export const KINDS = {
  numbers: { name: 'Numbers station', does: 'Reads out groups of digits. They decode to a line of lore.' },
  pirate: { name: 'Pirate broadcast', does: 'Reads out a market tip for a hub. Catching it moves that price for a while. Works every time it is caught.' },
  distress: { name: 'Distress call', does: 'Repeats a call for help from one of your servers. Catching it starts a thread there. Works every time it is caught.' },
};
// Radio traffic: other people's transmissions across the band, on in bursts. Nothing to catch.
export const TRAFFIC = [
  { f: 3.330, type: 'time', name: 'TIME SIGNAL', text: 'beep · beep · beep · at the tone, zero three fourteen coordinated' },
  { f: 3.860, type: 'voice', name: 'HAM NET', text: 'cq cq cq, this is kilo seven delta, anyone on frequency' },
  { f: 4.300, type: 'morse', name: 'MORSE', text: 'de rk9 qth sprawl rst 579 tu', unit: 0.06 },
  { f: 4.950, type: 'data', name: 'DATA', text: '▮▯▮▮▯▮▯▯▮▮▯▮ 75 bd ▮▯▮▮▯▮▯▯▮' },
  { f: 6.100, type: 'music', name: 'BROADCAST', text: '♪ the same song it played yesterday ♪' },
  { f: 6.400, type: 'voice', name: 'WEATHER', text: 'backhaul. wind two four zero. visibility poor. rain' },
  { f: 7.150, type: 'morse', name: 'MORSE', text: 'qrl? qrl? qrl?', unit: 0.11 },
  { f: 7.980, type: 'data', name: 'DATA', text: '▯▮▮▯▮▯▮▮▮▯ sync ▯▮▮▯▮▯▮▮▮▯' },
  { f: 8.700, type: 'voice', name: 'DISPATCH', text: 'car forty to base, i lost the fare at the yards' },
  { f: 9.000, type: 'music', name: 'BROADCAST', text: '♪ organ music, slow, under a lot of hiss ♪' },
  { f: 9.800, type: 'time', name: 'TIME SIGNAL', text: 'tick · tick · tick · tick · tick' },
  { f: 10.050, type: 'voice', name: 'RELAY', text: 'ground relay, say again, you are breaking up' },
  { f: 10.900, type: 'morse', name: 'MORSE', text: 'cq cq de vx3 k', unit: 0.07 },
  { f: 11.450, type: 'data', name: 'DATA', text: '▮▮▯▯▮▯▮▯▮▮▯▯ ack ▮▮▯▯' },
  { f: 11.950, type: 'voice', name: 'HAM NET', text: 'roger roger, five by five, see you on the forty' },
];

const now = () => hooks.now?.() ?? Date.now();
export const stationById = (id) => STATIONS.find((x) => x.id === id) || null;
export function scannerOf(s) {
  const S = (s.scanner ||= {});
  S.log ||= {}; S.tips ||= []; S.n ||= 0;
  if (S.air === undefined) S.air = null;
  if (S.next == null) S.next = now() + SCANNER.first * 1000;
  return S;
}
export const logged = (s, id) => !!s.scanner?.log?.[id];
// A numbers station pays once; a pirate or a distress call pays each time, once a broadcast.
export const repeats = (st) => st.kind !== 'numbers';
export const catchable = (s, st) => { const a = s.scanner?.air; return a?.id === st.id && !a.caught && (repeats(st) || !logged(s, st.id)); };
const roll = (S) => seeded(Math.imul((S.n = (S.n || 0) + 1), 2654435761) ^ 0x5ca7);
const between = (r, [lo, hi]) => lo + r() * (hi - lo);

// ---------- what can go on the air ----------
// A distress call names a traced server of yours with no thread on it, near your level.
export function distressTargets(s) {
  const L = hackerLevel(s), reached = floorsOf(s).reached || 1, T = s.threads?.starts || {};
  return (s.locations || []).filter((l) => eligible(l) && l.slot && !T[l.id] && (l.depth || 1) <= reached && (l.level || 1) <= L + 3)
    .sort((a, b) => Math.abs((a.level || 1) - L) - Math.abs((b.level || 1) - L) || (a.id < b.id ? -1 : 1));
}
const possible = (s, st) => st.kind === 'numbers' || (st.kind === 'pirate' ? hubsOf(s).length > 0 : distressTargets(s).length > 0);
// Stations not yet logged come up first; then the ones that still pay.
export function pool(s) {
  const all = STATIONS.filter((st) => possible(s, st)), fresh = all.filter((st) => !logged(s, st.id)), paying = all.filter(repeats);
  return fresh.length ? fresh : paying.length ? paying : all;
}
export function startBroadcast(s, at = now(), id = null) {
  const S = scannerOf(s), r = roll(S), from = pool(s);
  const st = (id && stationById(id)) || from[Math.floor(r() * from.length)];
  const air = { id: st.id, start: at, end: at + Math.round(between(r, SCANNER.on) * 1000) };
  if (st.kind === 'pirate') { const hubs = hubsOf(s); if (hubs.length) air.hub = hubs[Math.floor(r() * hubs.length)].faction; }
  if (st.kind === 'distress') { const xs = distressTargets(s).slice(0, 3); if (xs.length) air.loc = xs[Math.floor(r() * xs.length)].id; }
  S.air = air;
  S.tape = { ...air }; // the post records it, over the last one
  return air;
}
// ---------- the tape ----------
// The last broadcast, or null. Play back needs it uncaught, not yet played, and nothing on the air.
export const tapeOf = (s) => s.scanner?.tape || null;
export function playable(s, at = now()) {
  const T = tapeOf(s);
  if (!T) return 'Nothing on tape.';
  if (T.caught) return 'Already logged.';
  if (onAir(s, at)) return 'Something is on the air.';
  if (T.played) return 'Already played back.';
  return '';
}
// Puts the tape back on the air, as long as it ran, once. The schedule's next broadcast keeps its time.
export function playBack(s, at = now()) {
  if (playable(s, at)) return null;
  const S = scannerOf(s), T = S.tape;
  T.played = true;
  S.air = { id: T.id, start: at, end: at + (T.end - T.start), tape: true, ...(T.hub ? { hub: T.hub } : {}), ...(T.loc ? { loc: T.loc } : {}) };
  return S.air;
}
// The schedule, on the wall clock: a broadcast ends, the quiet rolls, the next one starts. 'start' or 'end' or null.
export function tickScanner(s, at = now()) {
  const S = scannerOf(s);
  let out = null;
  if (S.tips.some((x) => x.until <= at)) S.tips = S.tips.filter((x) => x.until > at);
  if (S.air && at >= S.air.end) { if (!S.air.tape) S.next = at + Math.round(between(roll(S), SCANNER.quiet) * 1000); S.air = null; out = 'end'; }
  if (!S.air && at >= S.next) { startBroadcast(s, at); out = 'start'; }
  return out;
}
export const onAir = (s, at = now()) => { const a = s.scanner?.air; return a && at < a.end ? a : null; };

// The station's words, with its hub or server filled in.
export function textOf(s, st, air = s.scanner?.air) {
  const a = air?.id === st.id ? air : s.scanner?.log?.[st.id] || {};
  const loc = a.loc && (s.locations || []).find((l) => l.id === a.loc);
  return st.text.replace('{hub}', (FACTIONS[a.hub]?.short || 'the hub').toLowerCase()).replace('{server}', (loc?.name || 'a server').toLowerCase());
}

// ---------- the signal ----------
// How strongly a station is on the air at t (seconds): it fades in and out over SCANNER.ramp, and swells a little.
export function presence(s, st, t) {
  const a = s.scanner?.air;
  if (!a || a.id !== st.id) return 0;
  const p = t - a.start / 1000, dur = (a.end - a.start) / 1000;
  if (p < 0 || p >= dur) return 0;
  return Math.min(1, p / SCANNER.ramp, (dur - p) / SCANNER.ramp) * (0.75 + 0.25 * Math.sin(t / 7 + st.f * 3));
}
// On the line, each kind moves its own way: a numbers station sways, a pirate hops (never back where it bit), a
// distress call wanders and fades. Off the line, a carrier barely drifts.
const hop = (n) => { if (n <= 0) return 0; const r = seeded(n * 7919 + 13); return (r() < 0.5 ? -1 : 1) * (0.035 + r() * 0.045); };
export function wander(st, t, hook = null) {
  if (hook?.id !== st.id) return 0.006 * Math.sin(t / 9 + st.f);
  const u = t - hook.t0;
  if (st.kind === 'numbers') return 0.07 * Math.sin(u * 0.9);
  if (st.kind === 'pirate') { const n = Math.floor(u / 1.7), k = Math.min(1, (u - n * 1.7) / 0.25); return hop(n - 1) + (hop(n) - hop(n - 1)) * (k * k * (3 - 2 * k)); }
  return 0.06 * Math.sin(u * 0.55) + 0.025 * Math.sin(u * 1.9);
}
export const fade = (st, t, hook = null) => (hook?.id === st.id && st.kind === 'distress' ? 1 - 0.9 * Math.max(0, Math.sin((t - hook.t0) * 1.2)) ** 6 : 1);
export const carrier = (st, t, hook = null) => st.f + wander(st, t, hook);
export const level = (s, st, t, hook = null) => presence(s, st, t) * fade(st, t, hook);
// What the needle hears at f: { st, d (MHz off the carrier), s (strength 0–1) }. Hooked, only its station.
export function heard(s, tune, t) {
  const { f, hook } = tune;
  if (hook) { const st = stationById(hook.id), d = Math.abs(f - carrier(st, t, hook)); return { st, d, s: Math.max(0, 1 - d / 0.4) * level(s, st, t, hook) }; }
  let best = { st: null, d: 9, s: 0 };
  for (const st of STATIONS) {
    const p = level(s, st, t);
    if (!p) continue;
    const d = Math.abs(f - carrier(st, t)), v = Math.max(0, 1 - d / SCANNER.reach) ** 1.6 * p;
    if (v > best.s) best = { st, d, s: v };
  }
  return best;
}
// Traffic is on in bursts: about 70% of a cycle of 9 s plus its frequency.
export function trafficLevel(tr, t) { const ph = (t / (9 + tr.f) + tr.f * 1.7) % 1; return ph < 0.7 ? Math.min(1, ph / 0.05, (0.7 - ph) / 0.05) : 0; }
export function trafficHeard(f, t) {
  let best = { tr: null, s: 0 };
  for (const tr of TRAFFIC) { const d = Math.abs(f - tr.f); if (d >= SCANNER.traffic) continue; const v = (1 - d / SCANNER.traffic) * 0.7 * trafficLevel(tr, t); if (v > best.s) best = { tr, s: v }; }
  return best;
}

// ---------- the reel ----------
// tune: { f, hook: { id, c, t0 } | null, lock } (the view's). Moving the needle out of the fine window lets go.
export function setFreq(tune, f) {
  const [lo, hi] = SCANNER.band;
  tune.f = Math.min(hi, Math.max(lo, Math.round(f * 10000) / 10000));
  if (tune.hook && Math.abs(tune.f - tune.hook.c) > SCANNER.fine / 2) { tune.hook = null; tune.lock = 0; }
  return tune;
}
// One step of dt seconds at t: 'bite', 'lost' (it went off the air), 'catch' (the lock is full: catchStation next), or null.
export function tuneStep(s, tune, dt, t) {
  const air = s.scanner?.air;
  if (tune.hook && (!air || air.id !== tune.hook.id || !presence(s, stationById(tune.hook.id), t))) { tune.hook = null; tune.lock = 0; return 'lost'; }
  const h = heard(s, tune, t);
  if (!tune.hook) {
    tune.lock = 0;
    if (h.st && catchable(s, h.st) && h.d < SCANNER.bite.d && h.s > SCANNER.bite.s) { tune.hook = { id: h.st.id, c: h.st.f, t0: t }; return 'bite'; }
    return null;
  }
  const st = stationById(tune.hook.id);
  if (level(s, st, t, tune.hook) > SCANNER.faded) {
    const inside = Math.abs(tune.f - carrier(st, t, tune.hook)) < SCANNER.hold;
    tune.lock = Math.max(0, Math.min(1, tune.lock + (inside ? dt / SCANNER.fill : -dt / SCANNER.drain)));
  }
  return tune.lock >= 1 ? 'catch' : null;
}

// ---------- logging one ----------
// Logs the station, pays it, and it signs off SCANNER.signoff seconds later. The log keeps the last catch's payoff.
export function catchStation(s, id, at = now()) {
  const S = scannerOf(s), st = stationById(id), air = S.air?.id === id ? S.air : {};
  if (!st || !catchable(s, st)) return null;
  const entry = (S.log[id] = { at, n: (S.log[id]?.n || 0) + 1 });
  S.air.caught = true;
  if (S.tape) S.tape.caught = true; // the tape is this broadcast (live or played back): nothing left on it
  if (st.kind === 'pirate' && air.hub) {
    entry.hub = air.hub;
    S.tips = S.tips.filter((x) => !(x.hub === air.hub && x.ware === st.tip.ware));
    S.tips.push({ id, hub: air.hub, ware: st.tip.ware, mult: st.tip.mult, until: at + st.tip.mins * 60000 });
  }
  if (st.kind === 'distress') {
    const loc = distressTargets(s).find((l) => l.id === air.loc) || distressTargets(s)[0];
    if (loc && pinDistress(s, loc, st.chain)) { entry.loc = loc.id; air.loc = loc.id; }
  }
  if (S.air?.id === id) S.air.end = Math.min(S.air.end, at + SCANNER.signoff * 1000);
  emit(s, 'info', `Logged ${st.name}. ${payText(s, st)}`, { scanner: id });
  return entry;
}
// What a logged station paid, as a sentence (the log line and the payoff chip's tooltip).
export function payText(s, st) {
  const e = s.scanner?.log?.[st.id] || {};
  if (st.kind === 'numbers') return st.lore.line;
  if (st.kind === 'pirate') return e.hub ? `${FACTIONS[e.hub].short} ${st.tip.mult > 1 ? 'pays' : 'charges'} ${Math.round(st.tip.mult * 100)}% of the usual for ${WARES[st.tip.ware].name} for ${st.tip.mins} minutes.` : 'The tip was for no hub you know.';
  const loc = e.loc && (s.locations || []).find((l) => l.id === e.loc);
  return loc ? `${chainDef(st.chain)?.title || 'A thread'} starts on ${loc.name}.` : 'Nobody answered.';
}

// ---------- tips in the market ----------
export const tipOf = (s, f) => (s.scanner?.tips || []).find((x) => x.hub === f && x.until > now()) || null;
export { tipMult };

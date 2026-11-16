// The scanner (GAME_RULES.md "The scanner"): the Listening Post's receiver, the calm side activity with no risk.
// One station is on the air at a time, for 2–3 minutes, then 15–30 minutes of quiet. In Tune, lantern-rx scans the band
// by itself and the catch is a pad (see "Tune: the pad"): find the station's cloud with your light, hold the lock,
// catch the symbols. A catch logs it, and it signs off. A numbers station pays once; a pirate or a distress call pays
// each time it's caught:
//   numbers   a line of lore, kept in the log: LANTERN's decode of a hit schedule read out to the crews
//   pirate    a tip: one hub's price for one ware moves for a while (market.mjs outsideMult, tipMult)
//   distress  a thread starts on the server it names (threads.mjs pinDistress)
// The post records each broadcast: the tape holds the last one until the next starts, and Play back puts it back on
// the air once, so a lost catch or the trip to the post never costs you a broadcast. It's found from a clue: the first
// broadcast on the air outside a fight breaks into the radio chatter as numbers, and starts the thread Nine Days Deaf
// on a server of yours; finishing it shows the post on the map (S.found).
//
// State: s.scanner (scannerOf, made on first use: the save keys on the field). An attempt at a catch is the view's
// (scanner-view.mjs), worked by padStep here. Times in the save are ms; the rules' clock t is seconds.
import { emit, hooks, hackerLevel } from './combat.mjs';
import { seeded } from './gear.mjs';
import { FACTIONS, hubsOf } from './factions.mjs';
import { WARES, tipMult } from './market.mjs';
import { eligible, chainDef, pinDistress } from './threads.mjs';
import { floorsOf } from './floors.mjs';

export const SCANNER = {
  on: [120, 180], quiet: [900, 1800], first: 300, signoff: 8, // seconds
};

// The stations. A pirate's tip lands on a hub you've found ({hub}); a distress call names a server of yours ({server}).
export const STATIONS = [
  { id: 'sparrow', kind: 'numbers', f: 6.815, name: 'SPARROW-9', text: '58331 · 0300 · 58331 · 0300 · 22816 · end',
    lore: { title: 'Orders', line: 'A server, an hour, a crew. TOLLGATE hit that server at 0300, to the minute.' } },
  { id: 'kite', kind: 'numbers', f: 11.140, name: 'KITE-4', text: 'achtung. 7 7 2. 7 7 2. 0 6 0 0. 2 2 8 1 6. ende',
    lore: { title: 'One voice', line: "SWARMLINE's targets, read in the same voice as TOLLGATE's." } },
  { id: 'wren', kind: 'numbers', f: 8.215, name: 'WREN-2', text: '00412 00412 · 9 9 1 4 0 · 00412 · 22816 · repeat',
    lore: { title: 'Page 0412', line: '00412 is a page number. Someone reads out a schedule of hits, a page a night. LANTERN wants the whole thing.' } },
  { id: 'owl', kind: 'numbers', f: 5.235, name: 'OWL-7', text: '22816 · 22816 · 22816 · 0 · 22816 · end',
    lore: { title: 'Sign-off', line: 'Every broadcast signs off with 22816. LANTERN has never heard it anywhere else.' } },
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
  numbers: { name: 'Numbers station', does: 'Reads out groups of digits. LANTERN decodes them.' },
  pirate: { name: 'Pirate broadcast', does: 'Reads out a market tip for a hub. Catching it moves that price for a while. Works every time it is caught.' },
  distress: { name: 'Distress call', does: 'Repeats a call for help from one of your servers. Catching it starts a thread there. Works every time it is caught.' },
};
const now = () => hooks.now?.() ?? Date.now();
export const stationById = (id) => STATIONS.find((x) => x.id === id) || null;
export function scannerOf(s) {
  const S = (s.scanner ||= {});
  S.log ||= {}; S.tips ||= []; S.n ||= 0;
  if (S.air === undefined) S.air = null;
  if (S.next == null) S.next = now() + SCANNER.first * 1000;
  if (S.found == null) S.found = S.n > 0; // a save that had the old top-bar radio already knows it
  return S;
}
// ---------- the Listening Post, found ----------
// The clue: the first broadcast on the air outside a fight breaks into the chatter, rebroadcast by a LANTERN repeater
// on a server of yours (distressTargets' first: traced, no thread, nearest your level). It pins the thread Nine Days Deaf
// there (threads.mjs); its end finds the post. With no such server yet it waits for a later broadcast. A pinned clue
// whose start went (its server gone) is heard again.
export const CLUE = 'listening-post';
export const postFound = (s) => !!s.scanner?.found;
const clueLive = (s, S) => (s.threads?.list || []).some((t) => t.chain === CLUE) || s.threads?.starts?.[S.clue]?.chain === CLUE;
// The server the clue pinned Nine Days Deaf on, once (the view calls it outside a fight), else null.
export function findPost(s, at = now()) {
  const S = scannerOf(s);
  if (S.found || (S.clue && clueLive(s, S)) || !onAir(s, at)) return null;
  const loc = distressTargets(s).find((l) => pinDistress(s, l, CLUE));
  if (!loc) return null;
  S.clue = loc.id;
  return loc;
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

// ---------- Tune: the pad ----------
// lantern-rx scans the band by itself; Tune is a pad (rate × phase) in pad units, 900 × 562. An attempt (the view's,
// made by attempt() when the search starts) runs search → lock → sym → logged, or lost:
//   search  carry your light (PAD.light) over the dark; the station is found when its cloud's centre is within
//           PAD.find × the light and it isn't faded.
//   lock    keep your dot's hold ring (PAD.hold) in the cloud: the lock fills in PAD.fill s and drains at
//           1/PAD.drain a second outside, at half speed on the wrong decoder; a faded distress call pauses it.
//   sym     the cloud syncs into 8 positions; symbols light there, each with its own time. Catch them all to log it;
//           too many misses lose the frame.
//   lost    the air window ran out before sync, or the frame took too many misses: the station signs off, on tape.
// t is seconds. Closing Tune drops the attempt (no loss); the next search gets a fresh air window.
export const PAD = { w: 900, h: 562, light: 100, find: 0.9, hold: 30, reach: 480, fill: 5, drain: 8, wrong: 0.5, faded: 0.3, rad: 96, hit: 20, sync: 1.05, last: 10 };
export const DECODERS = {
  vox: { name: 'VOX', kind: 'numbers', does: 'Reads numbers stations.' },
  data: { name: 'DATA', kind: 'pirate', does: 'Reads pirate broadcasts.' },
  cw: { name: 'CW', kind: 'distress', does: 'Reads distress calls.' },
};
// Each kind: its decoder, its symbols (need, or a pattern: '.' a click, '-' a hold of `hold` s), a new one every
// `every` s (a burst of `burst`, `gap` s apart), each lit for `life` s, the misses it allows, and its air window (s).
export const PLAY = {
  numbers: { decoder: 'vox', need: 8, every: 0.62, burst: 1, life: [0.9, 1.9], strikes: 3, air: 45 },
  pirate: { decoder: 'data', need: 9, every: 1.3, burst: 3, gap: 0.16, life: [0.55, 1.1], strikes: 4, air: 40, hop: 1.7, glide: 0.22 },
  distress: { decoder: 'cw', pattern: '...---...', every: 0.35, burst: 1, life: [1.5, 3], hold: 0.5, strikes: 2, air: 50 },
};
export const needOf = (kind) => PLAY[kind].pattern?.length ?? PLAY[kind].need;
const H01 = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
const easeOut = (u) => 1 - (1 - Math.max(0, Math.min(1, u))) ** 3;
// Where the station's cloud is u seconds into the search: a numbers station sways, a pirate hops every PLAY.pirate.hop
// s (a glide of PLAY.pirate.glide s), a distress call wanders.
const hopAt = (k) => [70 + H01(k * 3.17 + 11) * (PAD.w - 140), 50 + H01(k * 7.73 + 5) * (PAD.h - 100)];
export function cloudAt(kind, u) {
  const { w: W, h: H } = PAD;
  if (kind === 'pirate') { const P = PLAY.pirate, k = Math.floor(u / P.hop), e = easeOut((u - k * P.hop) / P.glide), a = hopAt(k - 1), b = hopAt(k); return [a[0] + (b[0] - a[0]) * e + 5 * Math.sin(u * 5), a[1] + (b[1] - a[1]) * e + 4 * Math.sin(u * 6.3)]; }
  if (kind === 'distress') return [W / 2 + W * 0.34 * Math.sin(0.23 * u + 0.4) + W * 0.05 * Math.sin(0.9 * u), H / 2 + H * 0.23 * Math.sin(0.31 * u + 1.7) + H * 0.04 * Math.sin(1.1 * u)];
  return [W / 2 + W * 0.3 * Math.sin(0.45 * u + 0.6) + W * 0.06 * Math.sin(1.3 * u), H / 2 + H * 0.21 * Math.sin(0.62 * u + 1.1) + H * 0.045 * Math.sin(1.7 * u)];
}
// How visible it is (0–1): a distress call fades in and out; the others hold steady.
export const cloudVis = (kind, u) => (kind === 'distress' ? 0.5 + 0.5 * Math.sin(0.9 * u + 1.2) : 1);

// A new attempt on the broadcast on the air, or null when there's nothing to catch. me: where your light starts.
export function attempt(s, t, { me = [PAD.w * 0.2, PAD.h * 0.8], decoder = 'vox' } = {}) {
  const a = onAir(s, t * 1000), st = a && stationById(a.id);
  if (!st || !catchable(s, st)) return null;
  return { id: st.id, kind: st.kind, air: a.start, t0: t, stage: 'search', lock: 0, me: [...me], decoder, dec: null, out: null, rng: seeded(Math.floor(a.start / 1000) ^ Math.floor(t * 10)) };
}
const stOf = (A) => stationById(A.id);
const live = (s, A, t) => { const a = s.scanner?.air; return a && a.id === A.id && a.start === A.air && !a.caught && t * 1000 < a.end; };
export const cloudOf = (A, t) => cloudAt(A.kind, t - A.t0);
export const visOf = (A, t) => cloudVis(A.kind, t - A.t0);
export const distOf = (A, t) => { const p = cloudOf(A, t); return Math.hypot(p[0] - A.me[0], p[1] - A.me[1]); };
export const fadedNow = (A, t) => A.stage === 'lock' && visOf(A, t) < PAD.faded;
export const inHold = (A, t) => A.stage === 'lock' && distOf(A, t) <= PAD.hold && !fadedNow(A, t);
// Seconds left on the air bar: the lesser of the kind's window (from the search's start) and the broadcast's own time.
export function airLeft(s, A, t) {
  const a = s.scanner?.air;
  if (!a || a.id !== A.id || a.start !== A.air) return 0;
  return Math.max(0, Math.min(PLAY[A.kind].air - (t - A.t0), a.end / 1000 - t));
}
// Signal strength (0–1): how near your light is to the cloud, while you search and lock; full once synced.
export function signalOf(A, t) {
  if (!A) return 0;
  if (A.stage === 'sym' || A.stage === 'logged') return 1;
  if (A.stage === 'lost') return 0;
  return Math.max(0, 1 - distOf(A, t) / PAD.reach) ** 1.6 * (0.3 + 0.7 * visOf(A, t));
}
// The 8 positions round the synced cloud.
export const slotXY = (dec, i) => [dec.c[0] + PAD.rad * Math.cos(i / 8 * 2 * Math.PI - Math.PI / 2), dec.c[1] + PAD.rad * 0.92 * Math.sin(i / 8 * 2 * Math.PI - Math.PI / 2)];
export const symLive = (dot, t) => !dot.done && t >= dot.born && t - dot.born < dot.life;

// The station signs off (a loss): its broadcast ends now, so the tape can play it back.
export function signOff(s, id, at = now()) {
  const a = s.scanner?.air;
  if (a && a.id === id && !a.caught && at < a.end) a.end = at;
}
function lose(s, A, t, why, ev) {
  A.stage = 'lost'; A.out = { why, t, at: A.dec ? A.dec.c : cloudOf(A, t) };
  if (A.dec) A.dec.hold = null;
  signOff(s, A.id, t * 1000);
  ev.push({ e: 'lost', why });
}
function spawn(A, t, ev) {
  const K = PLAY[A.kind], d = A.dec, used = new Set();
  for (let j = 0; j < K.burst; j++) {
    let i; do { i = Math.floor(A.rng() * 8); } while (i === d.last || used.has(i));
    used.add(i); d.last = i;
    const [x, y] = slotXY(d, i), born = t + j * (K.gap || 0);
    d.dots.push({ x, y, i, born, life: K.life[0] + A.rng() * (K.life[1] - K.life[0]), dash: K.pattern ? K.pattern[d.got] === '-' : false, done: null });
    ev.push({ e: 'sym', i, delay: born - t });
  }
}
function take(s, A, dot, t, ev) {
  const d = A.dec;
  dot.done = 'hit'; d.got++; d.hold = null;
  ev.push({ e: 'take', i: dot.i, x: dot.x, y: dot.y });
  if (d.got < needOf(A.kind)) return;
  if (!catchStation(s, A.id, t * 1000)) return lose(s, A, t, 'air', ev);
  A.stage = 'logged'; A.out = { t };
  ev.push({ e: 'logged' });
}
// One step of dt seconds at t, with your dot at A.me. Returns the events: found, sync, sym {i, delay}, take {i}, miss,
// logged (catchStation has paid it), lost {why: 'air' | 'frame'}.
export function padStep(s, A, dt, t) {
  const ev = [];
  if (!A || A.stage === 'logged' || A.stage === 'lost') return ev;
  if (A.stage === 'search' || A.stage === 'lock') {
    if (airLeft(s, A, t) <= 0) { lose(s, A, t, 'air', ev); return ev; }
    if (A.stage === 'search') {
      if (distOf(A, t) <= PAD.light * PAD.find && visOf(A, t) >= PAD.faded) { A.stage = 'lock'; A.found = t; ev.push({ e: 'found' }); }
      return ev;
    }
    if (!fadedNow(A, t)) {
      const rate = A.decoder === PLAY[A.kind].decoder ? 1 : PAD.wrong;
      A.lock = Math.max(0, Math.min(1, A.lock + (inHold(A, t) ? dt / PAD.fill * rate : -dt / PAD.drain)));
    }
    if (A.lock >= 1) {
      const p = cloudOf(A, t), R = PAD.rad;
      A.stage = 'sym';
      A.dec = { t0: t, from: p, c: [Math.max(R + 18, Math.min(PAD.w - R - 18, p[0])), Math.max(R + 16, Math.min(PAD.h - R - 16, p[1]))], dots: [], got: 0, miss: 0, next: t + PAD.sync, last: -1, hold: null };
      ev.push({ e: 'sync' });
    }
    return ev;
  }
  // sym
  const K = PLAY[A.kind], d = A.dec;
  if (!live(s, A, t)) { lose(s, A, t, 'air', ev); return ev; }
  if (t >= d.next) {
    if (K.pattern) { if (!d.dots.some((x) => !x.done)) { spawn(A, t, ev); d.next = t + d.dots.at(-1).life + K.every; } else d.next = t + 0.05; }
    else { spawn(A, t, ev); d.next = t + K.every; }
  }
  for (const dot of d.dots) {
    if (dot.done || t - dot.born < dot.life) continue;
    dot.done = 'miss'; d.miss++;
    if (d.hold?.dot === dot) d.hold = null;
    if (K.pattern) d.next = Math.min(d.next, t + K.every); // a missed one comes back
    ev.push({ e: 'miss' });
    if (d.miss >= K.strikes) { lose(s, A, t, 'frame', ev); return ev; }
  }
  if (d.hold && symLive(d.hold.dot, t) && t - d.hold.start >= K.hold) take(s, A, d.hold.dot, t, ev);
  d.dots = d.dots.filter((x) => t - x.born < x.life + 0.5);
  return ev;
}
// A tap (a click, or a press for a long one) at [x, y] once synced: catches the symbol there, or starts holding a long
// one. Returns the events, with 'hold' when a hold starts; release() lets a hold go.
export function tap(s, A, [x, y], t) {
  const ev = [];
  if (A?.stage !== 'sym') return ev;
  const d = A.dec, dot = d.dots.find((q) => symLive(q, t) && (q.dash ? Math.abs(q.x - x) <= 22 && Math.abs(q.y - y) <= 16 : Math.hypot(q.x - x, q.y - y) <= PAD.hit));
  if (!dot) return ev;
  if (dot.dash) { d.hold = { dot, start: t }; ev.push({ e: 'hold', i: dot.i }); } else take(s, A, dot, t, ev);
  return ev;
}
export const release = (A) => { if (A?.dec) A.dec.hold = null; };

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

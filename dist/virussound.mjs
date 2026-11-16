// Virus attack sounds, the style round (docs/ability-sounds-plan.md, "Virus attacks"): four attacks in three styles for
// the designer to hear against today's hurt before any of it goes into a fight.
//   a  Body     a blow to the body: today's hurt in pieces (the soft blow, the punch, the crushed growl), air and thuds.
//   b  Corrupt  your signal breaking up: a crushed drop, a stuck buffer sagging, the carrier cutting out, static.
//   c  Chassis  your machine taking it: the rack struck, the power sagging, relays tripping, the case rattling on.
// The designer picked Corrupt, and heard its Encrypt (a modem's tones, seven square steps down) as too on the nose.
// Round 1b, Corrupt with two takes on Encrypt that have no tones:
//   b1 Latch    static drawing in, seven crushed latches, each a stuck slice sagging lower.
//   b2 Choke    your carrier's hum pinched shut a notch at a time, duller each notch, then cut.
// Yours is bright and rings out (abilitysound.mjs); theirs is dull and falls: no crack on top, the echoes dark.
// Each sound is timed to its chip's strike (chipfx.mjs STRIKE_PLAN) in four layers:
//   launch  as the chip goes off (the bolt's snap, the padlocks lifting, the fire catching, the hand winding)
//   travel  for as long as it flies (the fireball's roar, the locks coming over, the hand shooting out)
//   contact on your bar, the number's beat: by result (a hit by its size, a crit, blocked: a glance off your wall with
//           no weight, evaded: nothing, the travel passes on)
//   tail    what the strike leaves on your bar (sparks, the last hasps, flames dying down, ticks ratcheting out)
// Round 2, every attack in the pick (virussound-all.mjs builds them from the pick's voices here; their levels are
// measured into virussound-levels.mjs): each other chip theme's strike, the lash, and Scramble, Replicate and Patch.
// Round 3, charges and bosses, in the pick: a charge landing and a boss's beat are layers over the attack's own sound
// (HEAVY; virussound-all.mjs layers), and a cast compiling and a seal landing have a sound each.
// Round 4: a fight plays the pick (virusvoice.mjs picks each batch's voices; app.js attackVoices plays them). The
// ability effects playtest (?playtest=fx) and renderBoard() play any.

import { kit } from './abilitysound.mjs';
import { every, layers } from './virussound-all.mjs';
import { LEVELS, LAYERS } from './virussound-levels.mjs';

export const STYLES = { a: 'Body', b: 'Corrupt', c: 'Chassis', b1: 'Corrupt, latch', b2: 'Corrupt, choke' };
// Every attack with a sound: its name, a part that makes it and its chip theme (chipfx.mjs).
export const ATTACKS = {
  // The style round's four (STYLE_KEYS: every style has them), picked for four shapes: at once, one after another, a
  // lob and a wind-up.
  surge: { name: 'Surge', part: 'Pulse Node', theme: 'zap' },
  encrypt: { name: 'Encrypt', part: 'Encryptor', theme: 'lock' },
  hash: { name: 'Hash', part: 'Rig', theme: 'heat' },
  discharge: { name: 'Discharge', part: 'Accumulator', theme: 'clock' },
  // Round 2, in the pick only: every other theme's strike, under its theme's name.
  cipher: { name: 'Cipher', part: 'Cipher Block', theme: 'cipher' },
  ring: { name: 'Beacon', part: 'C2 Node', theme: 'ring' },
  frost: { name: 'Chill', part: 'Cold Store', theme: 'frost' },
  erase: { name: 'Zero', part: 'Eraser', theme: 'erase' },
  crumble: { name: 'Bad Write', part: 'Bad Block', theme: 'crumble' },
  scramble: { name: 'Spread', part: 'Prism', theme: 'scramble' },
  thorn: { name: 'Prick', part: 'Thorns', theme: 'thorn' },
  strobe: { name: 'Tick', part: 'Strobe', theme: 'strobe' },
  copy: { name: 'Splice', part: 'Mirror', theme: 'copy' },
  scan: { name: 'Scrape', part: 'Scraper', theme: 'scan' },
  plate: { name: 'Ping', part: 'Limiter', theme: 'plate' },
  ledger: { name: 'Ledger', part: 'Buffer', theme: 'ledger' },
  mask: { name: 'Turn', part: 'Turncoat', theme: 'mask' },
  byte: { name: 'Gnaw', part: 'Fragment', theme: 'byte' },
  // A part with no theme lashes at you (lash.mjs).
  lash: { name: 'Lash', part: 'no theme', theme: null },
  // What isn't a hit on you (does: its one form, whatever Lands says). Scramble: the Scrambler's strike, and your
  // timers go dark. Replicate: the copies land on the fragment they make. Patch: a part seals itself, on its own row.
  blind: { name: 'Scramble', part: 'Scrambler', theme: 'scramble', does: 'scrambles you' },
  replicate: { name: 'Replicate', part: 'Replicator', theme: 'copy', does: 'spawns a fragment' },
  patch: { name: 'Patch', part: 'its own row', theme: null, does: 'patches itself' },
  // Round 3, the tells that land on the virus (tells.mjs): a cast compiles its buff; a seal gives every part ◆ back.
  cast: { name: 'Cast', part: 'its own row', theme: null, does: 'compiles a buff' },
  seal: { name: 'Seal', part: 'every part', theme: null, does: 'seals ◆ on every part' },
};
export const STYLE_KEYS = ['surge', 'encrypt', 'hash', 'discharge'];
export const PICKED = 'b1'; // the style round's pick: Corrupt, with Latch for its Encrypt
export const RESULTS = ['hit', 'crit', 'blocked', 'evaded'];
// Round 3: two more ways a hit lands, each the attack's own sound with a layer over it (the pick only). A charge (a
// tell landing: the wind-up let go, the floor going under the hit, and what it knocks out after) and a boss's beat (its
// signature part's attack: the act break's tritone tolling under the hit).
export const HEAVY = { charge: 'a charge', beat: "a boss's beat" };
// What has no chip strike to time it: the lash's tip reaches you (lash.mjs; app.js LASH_TRAVEL) and its 1s and 0s fall;
// a patch chip swells and clamps shut where it is (app.js fire).
export const OWN_PLAN = { lash: { impact: 140, post: { fall: 500 } }, patch: { impact: 140 }, cast: { impact: 140 }, seal: { impact: 140, step: 70, n: 4 } };
// The sound of a theme's strike ('lash' for a part with none).
export const attackOf = (theme) => Object.keys(ATTACKS).find((k) => ATTACKS[k].theme === theme && !ATTACKS[k].does) || 'lash';
// Levels (dB), so every style is heard at today's loudness, measured through renderBoard(): a medium hit at today's
// hurt (−17 LUFS, momentary max), a crit a little under today's (−13: today's clips), blocked near −25 and evaded
// near −26. level: the whole sound; crit, blocked, evaded: its contact on top (evaded: all of it, the travel passing
// on is the sound).
export const TRIM = {
  a: { surge: { level: 3.1, crit: -4.4, blocked: -0.7, evaded: 11.5 }, encrypt: { level: -0.9, crit: -1.9, blocked: 3.2, evaded: 8.2 }, hash: { level: 1.4, crit: -3.8, blocked: 2.6, evaded: 8.3 }, discharge: { level: 1.2, crit: -3.1, blocked: -2, evaded: 1.1 } },
  b: { surge: { level: -0.3, crit: -2, blocked: 2.4, evaded: 7.7 }, encrypt: { level: 0.6, crit: -1.4, blocked: -10.9, evaded: -2.6 }, hash: { level: -1.1, crit: -1.2, blocked: -1.2, evaded: 0.7 }, discharge: { level: -1.2, crit: -0.8, blocked: 3.8, evaded: 3.4 } },
  b1: { surge: { level: -0.3, crit: -2, blocked: 1.6, evaded: 12 }, encrypt: { level: -0.3, crit: -0.6, blocked: -5.8, evaded: 3.7 }, hash: { level: -0.8, crit: -1.6, blocked: -1.7, evaded: 0.4 }, discharge: { level: -1.1, crit: -1, blocked: 3.1, evaded: 3.3 } },
  b2: { surge: { level: -0.3, crit: -2, blocked: 2.4, evaded: 12 }, encrypt: { level: 1.1, crit: -1.7, blocked: -4, evaded: 2.3 }, hash: { level: -1.1, crit: -1.2, blocked: -1.2, evaded: 0.7 }, discharge: { level: -1.2, crit: -0.8, blocked: 3.2, evaded: 3.4 } },
  c: { surge: { level: 1.5, crit: -2.9, blocked: 0.2, evaded: 5.1 }, encrypt: { level: 0, crit: -1.9, blocked: 2.8, evaded: 4.2 }, hash: { level: 1.1, crit: -2.4, blocked: -6.4, evaded: -1.2 }, discharge: { level: 0, crit: -1.2, blocked: -2.3, evaded: -1 } },
};

const side = () => Math.random() * 1.4 - 0.7;
// An echo that darkens fast, with a far repeat ringing into the room.
const bus = (K, o, { time = 0.11, fb = 0.4, wet = 0.4, lp = 1700, far = 0.35 } = {}) => {
  const fx = K.echo(o.dry, { time, fb, wet, lp });
  if (far) fx.connect(K.echo(K.g(far, o.room), { time: time * 2.6, fb: 0.45, wet: 1, lp: 1200 }));
  return fx;
};
// The weight under every hit that lands: a boom lower than yours, the floor dropping on a big one.
const weight = (K, o, t, big, crit) => {
  K.boom(K.g(0.9, o.dry), t, { f0: 84, f1: 26, glide: 0.16, d: 0.32 * (1 + 0.6 * big), peak: 0.5 + 0.4 * big, body: 0.5 });
  if (crit || big > 0.45) K.S(o.dry, t + 0.004, 'subdrop', { gain: crit ? 0.8 : 0.2 + 0.35 * (big - 0.45), rate: 0.85, jitter: 0 });
};
// Your wall took it: steel struck and ringing off, the shield holding under it. No weight goes in.
const glance = (K, o, t) => {
  K.S(o.dry, t, 'metal-h', { gain: 0.5, rate: 0.8 });
  K.S(o.dry, t, 'plate-h', { gain: 0.35, rate: 1.1, lp: 5000 });
  K.modes(o.room, t, [[620, 1, 0.35], [1480, 0.6, 0.25], [2310, 0.3, 0.14]], { peak: 0.12 });
  K.tone(o.dry, t, { type: 'triangle', f0: 220, f1: 330, glide: 0.2, a: 0.01, d: 0.25, peak: 0.08 });
  K.kick(o.dry, t, { f0: 110, f1: 60, d: 0.07, peak: 0.15, click: 0 });
};
// It missed you: a light tick as you step aside (what flew goes on past by itself).
const aside = (K, o, t) => K.S(o.dry, t + 0.09, 'tick', { gain: 0.25 });
// How an attack landed, read once.
const read = (T) => ({ ...T, crit: T.result === 'crit', gone: T.result === 'evaded', wall: T.result === 'blocked' });
// n things one after another from t0 to t1, coming faster (a ratchet winding up): fn(time, 0–1, i).
const wound = (t0, t1, n, fn) => { for (let i = 0; i < n; i++) { const u = i / (n - 1); fn(t0 + (t1 - t0) * (1 - Math.pow(1 - u, 1.6)), u, i); } };

// ---------- the sounds ----------
// Each: (K, out, T) with out { dry, room } and T the timing (attackTiming; seconds on the context's clock):
//   t the chip goes off · hit it lands on your bar (the number's beat) · lift (heat) it catches · wind (clock) [from, to]
//   its hand winds · again (zap) the bolt's later strobes · step, n (lock) the padlocks, a step apart · stop (clock) it
//   stops · tail (heat) how long its flames run (s) · result · k (how big: 0–1) · flies (the strike is drawn: false when
//   there's none to time it, so it's contact and tail on the beat) · pre, post (round 2: the strike's other marks, before
//   the hit and after it).

// ===== a  Body =====
function body() {
  // Today's hurt (sound.mjs RECIPES.hurt) in pieces: the soft blow, the punch under it, the driven growl, a glitch tick.
  const blow = (K, o, t, k, crit) => {
    const big = crit ? 1 : k;
    K.S(o.dry, t, 'soft-h', { gain: 0.85 + 0.25 * big, rate: 0.9 - 0.1 * big });
    K.S(o.dry, t, 'punch-h', { gain: 0.5 + 0.3 * big, rate: 0.72 - 0.08 * big, lp: 1400 });
    K.S(o.dry, t + 0.03, 'glitch', { gain: 0.12 + 0.15 * big, lp: 3000 });
    K.tone(K.drive(K.f('lowpass', 700, 0.7, K.g(0.3 + 0.15 * big, o.dry)), 8, 1), t, { type: 'sawtooth', f0: 90, f1: 42, glide: 0.2, a: 0.004, d: 0.26 + 0.1 * big, peak: 0.6 });
    if (crit) K.S(o.dry, t + 0.02, 'metal-h', { gain: 0.45, rate: 0.6, lp: 1800 });
    weight(K, o, t, big * 0.7, crit); // (the punch is weight already)
  };
  return {
    // The bolt: a snap off the chip, the blow at once, the strobes spitting after it.
    surge(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), fx = bus(K, o, { time: 0.08, fb: 0.3, wet: 0.3 });
      if (T.flies) { K.zap(fx, t, { f0: 5200, f1: 500, d: 0.05, peak: 0.3 }); K.thwack(o.dry, t, { f: 900, d: 0.03, peak: 0.12, tone: 0 }); }
      if (gone) { K.swoosh(o.dry, t, hit + 0.02, { lo: [300, 160], hi: [2400, 900], peak: 0.2, pass: true, tail: 0.25 }); return aside(K, o, hit); }
      if (wall) { K.zap(fx, hit, { f0: 6000, f1: 1500, d: 0.04, peak: 0.2 }); return glance(K, o, hit); }
      blow(K, o, hit, k, crit);
      K.zap(fx, hit, { f0: 3000, f1: 300, d: 0.07, peak: 0.25 });
      T.again.forEach((x, i) => K.zap(K.pan(fx, side()), x, { f0: 4200 - 600 * i, f1: 400, d: 0.04, peak: 0.16 - 0.04 * i }));
      K.crackle(fx, hit + 0.02, hit + 0.22 + 0.1 * k, { f: 2400, peak: 0.14, rise: false });
    },
    // The padlocks: each lifts off, they come over, and a grip closes on you a notch at a time; the last drives home.
    encrypt(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), fx = bus(K, o, { time: 0.12, fb: 0.4, wet: 0.4 }), end = hit + (T.n - 1) * T.step;
      if (T.flies) {
        for (let i = 0; i < T.n; i++) K.thwack(K.pan(o.dry, side()), t + i * T.step, { f: 1100 + 60 * i, d: 0.02, peak: 0.1, tone: 0 });
        K.swoosh(o.dry, t + 0.1, hit, { lo: [120, 260], hi: [400, 1100], peak: 0.14, pass: gone, tail: 0.25 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { glance(K, o, hit); for (let i = 1; i < T.n; i++) K.S(K.pan(o.dry, side()), hit + i * T.step, 'tin', { gain: 0.16 * (1 - i / (T.n + 2)), rate: 1.2 + 0.05 * i }); return; }
      for (let i = 0; i < T.n; i++) {
        const x = hit + i * T.step;
        K.S(o.dry, x, 'soft-m', { gain: 0.4 + 0.05 * i, rate: 0.8 + 0.07 * i, lp: 1600 }); // tighter each notch
        K.thwack(fx, x, { f: 500 + 40 * i, d: 0.03, peak: 0.1, tone: 150 + 12 * i });
      }
      blow(K, o, end, 0.25 + 0.5 * k, crit);
      K.tone(o.room, end, { type: 'triangle', f0: 196, f1: 98, glide: 0.4, a: 0.01, d: 0.45, peak: 0.06 }); // and holds
    },
    // The fireball: it catches, roars over, bursts on you, and its flames die down along your bar.
    hash(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), fx = bus(K, o, { time: 0.1, fb: 0.35, wet: 0.35 });
      if (T.flies) {
        K.thwack(o.dry, t, { f: 700, d: 0.03, peak: 0.1, tone: 0 });
        K.hiss(o.dry, T.lift, { type: 'bandpass', f0: 500, f1: 1800, q: 0.9, glide: 0.08, a: 0.01, d: 0.09, peak: 0.2, color: 'pink' });
        K.swoosh(o.dry, T.lift, hit, { lo: [110, 300], hi: [500, 1500], peak: 0.26, pass: gone, tail: 0.3 });
        K.crackle(fx, T.lift, hit, { f: 1800, peak: 0.12 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { K.hiss(fx, hit, { type: 'lowpass', f0: 2200, f1: 600, glide: 0.15, a: 0.004, d: 0.16, peak: 0.16, color: 'pink' }); return glance(K, o, hit); }
      blow(K, o, hit, k, crit);
      K.hiss(fx, hit, { type: 'lowpass', f0: 2400, f1: 500, glide: 0.2, a: 0.004, d: 0.22, peak: 0.25, color: 'pink' });
      K.crackle(fx, hit + 0.05, hit + Math.max(0.3, T.tail * 0.6), { f: 1500, q: 0.7, peak: 0.12, rise: false });
      K.hiss(o.room, hit + 0.04, { type: 'bandpass', f0: 700, f1: 300, q: 0.6, glide: 0.5, a: 0.03, d: 0.5, peak: 0.07, color: 'brown' });
    },
    // The clock: its hand ratchets round a turn, shoots out and strikes like a bell; ticks run out along your bar, and it stops.
    discharge(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), fx = bus(K, o, { time: 0.13, fb: 0.45, wet: 0.45 });
      if (T.flies) {
        K.thwack(o.dry, t, { f: 800, d: 0.03, peak: 0.1, tone: 0 });
        wound(T.wind[0], T.wind[1], 9, (x, u) => K.S(o.dry, x, 'tick', { gain: 0.16 + 0.14 * u, rate: 0.7 + 0.5 * u, jitter: 0.01 }));
        K.flight(o.dry, T.wind[1], hit, { f0: 500, f1: 2600, q: 1.5, peak: 0.2, pass: gone, tail: 0.2 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { K.S(fx, hit, 'bell', { gain: 0.14, rate: 0.75, lp: 3000 }); return glance(K, o, hit); }
      blow(K, o, hit, Math.min(1, k + 0.15), crit);
      K.S(fx, hit, 'bell', { gain: 0.3, rate: 0.5, lp: 2600 });
      for (let i = 1; i <= 6; i++) K.S(K.pan(fx, ((i % 2 ? 1 : -1) * i) / 8), hit + 0.036 * i, 'tick', { gain: 0.2 * (1 - i / 8), rate: 1.1 - 0.04 * i });
      K.thwack(o.dry, T.stop, { f: 400, d: 0.05, peak: 0.16, tone: 120 });
      K.modes(o.room, T.stop, [[392, 1, 0.5], [784, 0.4, 0.3]], { peak: 0.06 });
    },
  };
}

// ===== b  Corrupt =====
// Everything crushed, then dulled: static with the top taken off (yours keeps its top).
const crushed = (K, o, e) => { const fx = bus(K, o, e); return { fx, b: K.crush(K.f('lowpass', 2600, 0.7, fx), 10, 2.8, 0.5) }; };
// A stuck buffer: one slice of a sample again and again, slower and lower each time.
const stuck = (K, dest, t, n, gap, name, { rate = 0.6, gain = 0.45, lp = 2200 } = {}) => { for (let i = 0; i <= n; i++) K.S(dest, t + i * gap * (1 + 0.12 * i), name, { gain: gain * (1 - i / (n + 2)), rate: rate * Math.pow(0.88, i), jitter: 0, off: 0.02, dur: gap * 0.8, fade: 0.002, lp }); };
// Your carrier cutting out: a hum sagging, chopped into pieces.
const dropout = (K, dest, t, d, { f = 110, peak = 0.12 } = {}) => {
  const g = K.g(0, dest);
  let on = true;
  for (let x = t; x < t + d; x += 0.012 + Math.random() * 0.035) { g.gain.setValueAtTime(on ? 1 : 0, x); on = !on; }
  g.gain.setValueAtTime(0, t + d);
  K.hum(g, t, { f, f1: f * 0.6, d, peak, bright: 1100, a: 0.002 });
};
// The hit: it draws in, a dull crushed thump, a growl falling, the buffer sticking, blips draining away low.
const rot = (K, o, fx, b, t, k, crit, from) => {
  const big = crit ? 1 : k;
  if (from < t - 0.05) K.S(fx, 0, 'scratch', { reverse: true, end: t, dur: Math.min(0.14, t - from), gain: 0.3, rate: 0.55 });
  K.hiss(b, t, { type: 'lowpass', f0: 1800, a: 0.0005, d: 0.02, peak: 0.4 });
  K.tone(b, t, { type: 'square', f0: 96, f1: 30, glide: 0.09, a: 0.001, d: 0.12 + 0.06 * big, peak: 0.3 + 0.16 * big });
  K.fm(b, t + 0.012, { fc: 150, f1: 32, ratio: 1.41, i0: 9, i1: 0.4, dur: 0.22 + 0.14 * big, peak: 0.36 });
  stuck(K, b, t + 0.04, 2 + Math.round(2 * big) + (crit ? 2 : 0), 0.042, 'glitch');
  K.cascade(K.g(0.45, b), t + 0.03, 5 + Math.round(7 * big), { top: 1900, step: 0.013, peak: 0.08 });
  dropout(K, fx, t + 0.05, 0.18 + 0.2 * big);
  weight(K, o, t, big, crit);
};
// E: its Encrypt (0 the round's, 1 Latch, 2 Choke).
function corrupt(E = 0) {
  // Encrypt with no tones (round 1b). Latch: seven crushed latches, a stuck slice sagging lower under each. Choke: the
  // carrier's hum let through a notch at a time, lower and duller each notch.
  const encrypt = (K, o, T) => {
    const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.12, fb: 0.45, wet: 0.45 }), end = hit + (T.n - 1) * T.step;
    if (T.flies) {
      K.stat(b, t, { d: 0.03, peak: 0.18 });
      K.flight(b, t + 0.05, hit, { f0: 180, f1: 700, q: 0.8, peak: 0.07, color: 'sah', pass: gone, tail: 0.25 });
      if (E === 2) K.hum(fx, t + 0.05, { f: 104, f1: 116, d: Math.max(0.05, hit - t - 0.1), peak: 0.05, bright: 900, a: 0.08 });
      if (!gone && hit - t > 0.2) K.S(fx, 0, 'scratch', { reverse: true, end: hit, dur: 0.16, gain: 0.25, rate: 0.5 });
    }
    if (gone) return aside(K, o, hit);
    if (wall) { glance(K, o, hit); for (let i = 1; i < T.n; i++) K.S(K.pan(b, side()), hit + i * T.step, 'glitch', { gain: 0.2 * (1 - i / (T.n + 2)), rate: 1.4, off: 0.02, dur: 0.015, fade: 0.002 }); return; }
    for (let i = 0; i < T.n; i++) {
      const x = hit + i * T.step, gap = Math.max(0.02, T.step);
      if (E === 2) {
        K.hum(fx, x, { f: 110 * Math.pow(0.97, i), d: gap * 0.6, peak: 0.16, bright: 1500 * Math.pow(0.78, i), a: 0.002 });
        K.S(b, x, 'click', { gain: 0.22, rate: 0.7 - 0.03 * i, lp: 2000 });
      } else {
        K.S(b, x, 'relay', { gain: 0.34, rate: 0.75 - 0.03 * i });
        K.S(b, x + 0.004, 'glitch', { gain: 0.3, rate: 0.7 * Math.pow(0.92, i), jitter: 0, off: 0.02, dur: gap * 0.75, fade: 0.002, lp: 2200 });
        K.tone(b, x, { f0: 120 - 8 * i, f1: 60, glide: 0.03, a: 0.001, d: 0.03, peak: 0.12 });
      }
    }
    K.S(b, end, 'plate-h', { gain: 0.5, rate: 0.6 });
    K.fm(b, end, { fc: 150, f1: 38, ratio: 1.41, i0: 7, i1: 0.4, dur: 0.3, peak: 0.3 });
    dropout(K, fx, end + 0.04, (E === 2 ? 0.32 : 0.2) + 0.2 * k, { f: 98 });
    weight(K, o, end, 0.25 + 0.5 * k, crit);
  };
  return {
    // The bolt: a chopped zap off the chip, the drop at once, the strobes as bursts of static.
    surge(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.085, fb: 0.4, wet: 0.4 });
      if (T.flies) K.buzz(b, t, { d: 0.045, peak: 0.4, f0: 5200, f1: 700 });
      if (gone) { K.buzz(K.pan(b, 0.5), hit + 0.02, { d: 0.12, peak: 0.2, f0: 2400, f1: 300 }); return aside(K, o, hit); }
      if (wall) { K.stat(b, hit, { d: 0.05, peak: 0.2 }); return glance(K, o, hit); }
      rot(K, o, fx, b, hit, k, crit, t);
      T.again.forEach((x, i) => { K.buzz(b, x, { d: 0.03, peak: 0.22 - 0.05 * i, f0: 3600, f1: 600 }); K.stat(b, x, { d: 0.02, peak: 0.12 }); });
      K.stat(fx, hit + 0.03, { d: 0.14 + 0.1 * k, peak: 0.1, hp: 1200 });
    },
    // The padlocks: a modem's two tones sagging as they come over, seven steps down as they shut, a crushed latch and a drop.
    encrypt(K, o, T) {
      if (E) return encrypt(K, o, T);
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.12, fb: 0.45, wet: 0.45 }), end = hit + (T.n - 1) * T.step;
      if (T.flies) {
        K.stat(b, t, { d: 0.03, peak: 0.18 });
        K.stream(fx, t + 0.02, gone ? hit + 0.2 : hit, { lo: 700, hi: 1000, baud: 70, rise: 0.55, peak: 0.07 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { glance(K, o, hit); for (let i = 1; i < T.n; i++) K.tone(b, hit + i * T.step, { type: 'square', f0: 1800 + 120 * i, a: 0.001, d: 0.012, peak: 0.05 * (1 - i / (T.n + 2)) }); return; }
      const lp = K.f('lowpass', 1500, 0.7, fx), steps = [392, 349, 311, 277, 247, 220, 196];
      for (let i = 0; i < T.n; i++) {
        const x = hit + i * T.step;
        K.tone(lp, x, { type: 'square', f0: steps[i % steps.length], a: 0.002, d: Math.max(0.02, T.step * 1.4), peak: 0.11 });
        K.S(b, x, 'relay', { gain: 0.3, rate: 0.75 - 0.03 * i });
      }
      K.S(b, end, 'plate-h', { gain: 0.5, rate: 0.6 });
      K.fm(b, end, { fc: 196, f1: 49, ratio: 2, i0: 6, i1: 0.5, dur: 0.3, peak: 0.3 });
      dropout(K, fx, end + 0.04, 0.2 + 0.2 * k, { f: 98 });
      weight(K, o, end, 0.25 + 0.5 * k, crit);
    },
    // The fireball: a roar of static coming with a fan spinning up under it, the drop, static burning off after.
    hash(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.1, fb: 0.4, wet: 0.4 });
      if (T.flies) {
        K.stat(b, t, { d: 0.03, peak: 0.2 });
        K.flight(b, T.lift, hit, { f0: 300, f1: 1500, q: 0.9, peak: 0.12, color: 'sah', pass: gone, tail: 0.25 });
        K.whine(fx, T.lift, hit, { f0: 90, f1: 260, peak: 0.06, lp: 900 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { K.stat(b, hit, { d: 0.1, peak: 0.2, hp: 500 }); return glance(K, o, hit); }
      rot(K, o, fx, b, hit, k, crit, T.lift);
      K.stat(b, hit, { d: 0.12, peak: 0.3, hp: 400 });
      K.crackle(fx, hit + 0.05, hit + Math.max(0.3, T.tail * 0.55), { f: 2200, peak: 0.12, rise: false });
    },
    // The clock: a counter stepping up faster and faster, a whine as it lets go, the drop under a bell gone wrong, blips
    // running out, and a tape stopping.
    discharge(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.13, fb: 0.5, wet: 0.45 });
      if (T.flies) {
        K.stat(b, t, { d: 0.03, peak: 0.18 });
        wound(T.wind[0], T.wind[1], 9, (x, u, i) => K.tone(b, x, { type: 'square', f0: 220 * Math.pow(2, i / 8), a: 0.001, d: 0.02, peak: 0.07 + 0.05 * u }));
        K.whine(fx, T.wind[1], gone ? hit + 0.15 : hit, { f0: 500, f1: 1800, peak: 0.08, type: 'square', lp: 2600 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { K.ring(fx, hit, { fc: 784, fmod: 61, d: 0.2, peak: 0.05, type: 'triangle' }); return glance(K, o, hit); }
      rot(K, o, fx, b, hit, Math.min(1, k + 0.15), crit, T.wind[1]);
      K.ring(fx, hit, { fc: 392, fmod: 61, d: 0.5, peak: 0.1, type: 'triangle' });
      for (let i = 1; i <= 6; i++) K.tone(K.pan(b, ((i % 2 ? 1 : -1) * i) / 8), hit + 0.036 * i, { type: 'square', f0: 1400 * Math.pow(0.9, i), a: 0.001, d: 0.012, peak: 0.07 * (1 - i / 8) });
      K.surge(b, T.stop, { f0: 300, f1: 34, d: 0.22, peak: 0.16, drive: 4, bright: 2400 });
    },
  };
}

// ===== c  Chassis =====
function chassis() {
  // The hit: the rack struck, the power sagging, relays tripping one after another, the case rattling on.
  const knock = (K, o, fx, t, k, crit) => {
    const big = crit ? 1 : k, n = 2 + Math.round(3 * big) + (crit ? 2 : 0);
    K.S(o.dry, t, 'plate-l', { gain: 0.75, rate: 0.5 - 0.06 * big, lp: 1700, jitter: 0.02 });
    K.S(o.dry, t, 'punch-m', { gain: 0.45 + 0.25 * big, rate: 0.62, lp: 1100 });
    K.hum(o.dry, t, { f: 120, f1: 58, d: 0.3 + 0.3 * big, peak: 0.14 + 0.1 * big, bright: 800, a: 0.003 });
    for (let i = 0; i < n; i++) K.S(K.pan(fx, side()), t + 0.05 + 0.045 * i * (1 + 0.5 * Math.random()), 'relay', { gain: 0.32 * (1 - i / (n + 2)), rate: 0.75 + Math.random() * 0.35 });
    K.S(fx, t + 0.03, 'metal-l', { gain: 0.25 + 0.2 * big, rate: 0.55, lp: 2200 });
    K.rumble(o.dry, t + 0.02, { f: 110, d: 0.3 + 0.25 * big, peak: 0.18 });
    if (crit) { K.S(fx, t + 0.02, 'metal-h', { gain: 0.45, rate: 0.6, lp: 1800 }); K.S(fx, t + 0.12, 'glass-l', { gain: 0.3, rate: 0.7 }); }
    weight(K, o, t, big, crit);
  };
  return {
    // The bolt: an arc snapping off a contact, the knock at once, a bass discharge, sparks running off the case.
    surge(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), fx = bus(K, o, { time: 0.08, fb: 0.3, wet: 0.3 });
      if (T.flies) { K.S(o.dry, t, 'click', { gain: 0.4, rate: 0.7 }); K.zap(fx, t, { f0: 7000, f1: 900, d: 0.04, peak: 0.25 }); }
      if (gone) { K.crackle(K.pan(fx, 0.5), hit, hit + 0.2, { f: 4000, peak: 0.16, rise: false }); return aside(K, o, hit); }
      if (wall) { K.crackle(fx, hit, hit + 0.12, { f: 5000, peak: 0.14, rise: false }); return glance(K, o, hit); }
      knock(K, o, fx, hit, k, crit);
      K.surge(o.dry, hit, { f0: 130, f1: 40, d: 0.12 + 0.06 * k, peak: 0.2, drive: 4, bright: 2600 });
      T.again.forEach((x, i) => K.S(K.pan(fx, side()), x, 'click', { gain: 0.3 - 0.07 * i, rate: 1.2 + 0.2 * i }));
      K.crackle(K.pan(fx, 0.3), hit + 0.02, hit + 0.25 + 0.1 * k, { f: 3200, peak: 0.16, rise: false });
    },
    // The padlocks: keys clattering as they lift, a servo carrying them over, seven deadbolts thrown, the last one heavy;
    // the drive spins down.
    encrypt(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), fx = bus(K, o, { time: 0.12, fb: 0.4, wet: 0.4 }), end = hit + (T.n - 1) * T.step;
      if (T.flies) {
        for (let i = 0; i < T.n; i++) K.S(K.pan(o.dry, side()), t + i * T.step, 'key', { gain: 0.3, rate: 0.8 + 0.04 * i });
        K.whine(o.dry, t + 0.1, gone ? hit + 0.15 : hit, { f0: 180, f1: 420, peak: 0.05, lp: 1200 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { glance(K, o, hit); for (let i = 1; i < T.n; i++) K.S(K.pan(o.dry, side()), hit + i * T.step, 'tin', { gain: 0.16 * (1 - i / (T.n + 2)), rate: 1.2 + 0.05 * i }); return; }
      for (let i = 0; i < T.n; i++) {
        const x = hit + i * T.step;
        K.S(o.dry, x, 'relay', { gain: 0.4, rate: 0.9 - 0.04 * i });
        K.S(fx, x, 'plate-h', { gain: 0.22 + 0.04 * i, rate: 1 - 0.05 * i, lp: 3200 });
      }
      knock(K, o, fx, end, 0.25 + 0.5 * k, crit);
      K.tone(o.dry, end + 0.03, { type: 'triangle', f0: 300, f1: 80, glide: 0.5, a: 0.02, d: 0.5, peak: 0.05 });
    },
    // The fireball: a pilot light catching, the roar over, the knock, the fans straining and the case ticking as it cools.
    hash(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), fx = bus(K, o, { time: 0.1, fb: 0.35, wet: 0.35 });
      if (T.flies) {
        K.S(o.dry, t, 'click', { gain: 0.35, rate: 0.6 });
        K.S(o.dry, T.lift, 'whoosh', { gain: 0.3, rate: 0.9, lp: 2600 });
        K.swoosh(o.dry, T.lift, hit, { lo: [100, 260], hi: [400, 1200], peak: 0.2, pass: gone, tail: 0.3 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { K.hiss(fx, hit, { type: 'lowpass', f0: 2200, f1: 600, glide: 0.15, a: 0.004, d: 0.16, peak: 0.16, color: 'pink' }); return glance(K, o, hit); }
      knock(K, o, fx, hit, k, crit);
      K.hiss(fx, hit, { type: 'lowpass', f0: 2000, f1: 450, glide: 0.2, a: 0.004, d: 0.2, peak: 0.2, color: 'pink' });
      K.whine(o.dry, hit + 0.03, hit + 0.3, { f0: 150, f1: 210, peak: 0.04, lp: 700 });
      for (let i = 0; i < 4; i++) K.S(K.pan(fx, side()), hit + 0.18 + 0.11 * i * (1 + 0.4 * Math.random()), 'tin', { gain: 0.14 * (1 - i / 6), rate: 1.3 + 0.2 * Math.random() });
    },
    // The clock: a ratchet winding, heavy and slow then fast, the arm thrown, the knock under an alarm bell, the
    // escapement running down, and a breaker dropping.
    discharge(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), fx = bus(K, o, { time: 0.13, fb: 0.45, wet: 0.45 });
      if (T.flies) {
        K.S(o.dry, t, 'click', { gain: 0.35, rate: 0.6 });
        wound(T.wind[0], T.wind[1], 9, (x, u) => K.S(o.dry, x, 'relay', { gain: 0.2 + 0.14 * u, rate: 0.6 + 0.5 * u, jitter: 0.01 }));
        K.S(o.dry, T.wind[1], 'whoosh', { gain: 0.3, rate: 1.7, lp: 5000 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { K.S(fx, hit, 'bell', { gain: 0.14, rate: 0.75, lp: 3000 }); return glance(K, o, hit); }
      knock(K, o, fx, hit, Math.min(1, k + 0.15), crit);
      K.S(fx, hit, 'bell', { gain: 0.34, rate: 0.5, lp: 2600 });
      K.S(fx, hit + 0.004, 'bong', { gain: 0.2, rate: 0.5, lp: 1800 });
      for (let i = 1; i <= 6; i++) K.S(K.pan(fx, ((i % 2 ? 1 : -1) * i) / 8), hit + 0.036 * i, 'click', { gain: 0.22 * (1 - i / 8), rate: 1.1 - 0.05 * i });
      K.S(o.dry, T.stop, 'relay', { gain: 0.45, rate: 0.55 });
      K.S(fx, T.stop, 'tin', { gain: 0.18, rate: 0.7 });
    },
  };
}

const SOUNDS = { a: body(), b: corrupt(), c: chassis(), b1: corrupt(1), b2: corrupt(2) };
// Round 2: every other attack, in the pick, from the pick's own voices.
Object.assign(SOUNDS[PICKED], every({ bus, weight, glance, aside, read, wound, side, crushed, stuck, dropout, rot }));
Object.assign(TRIM[PICKED], LEVELS);
const LAYER = layers({ bus, weight, glance, aside, read, wound, side, crushed, stuck, dropout, rot });

// How the hit's size and result read. plan: the strike's timing in ms (chipfx.mjs STRIKE_PLAN); drawn: false when no
// strike is drawn to time it (Screen effects off, Motion off), so it lands at once: contact and tail on the beat.
// pre: what the strike does before it lands, post: what it leaves after, each mark a time or a list of them.
export function attackTiming(t, plan, { result = 'hit', power = 0.3, gain = 1 } = {}, drawn = true) {
  const p = plan || {}, s = (ms) => (drawn ? Math.max(0, ms || 0) / 1000 : 0), hit = t + s(p.impact);
  const marks = (o, at) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, Array.isArray(v) ? v.map(at) : at(v)]));
  return {
    pre: marks(p.pre, (ms) => t + s(ms)), post: marks(p.post, (ms) => hit + Math.max(0, ms) / 1000),
    t, hit, lift: t + s(p.lift), wind: (p.wind || [0, 0]).map((x) => t + s(x)), again: drawn ? (p.again || []).map((x) => t + s(x)) : [],
    step: Math.max(0, p.step || 0) / 1000, n: p.n || 1, stop: hit + Math.max(0, p.stop || 0) / 1000, tail: Math.max(0, p.tail || 0) / 1000,
    // A charge and a boss's beat land as the attack's hit at its size; heavy: which layer goes over it.
    result: HEAVY[result] ? 'hit' : result, heavy: HEAVY[result] ? result : null,
    k: Math.max(0, Math.min(1, power)), flies: s(p.impact) > 0.02, gain,
  };
}

// Play an attack's sound in `style` into out ({ dry, room }: a dry bus and a send to the room) with T (attackTiming).
// buf(name): a take of a sample (sound.mjs). False if there is none for it.
export function playAttack(ctx, out, style, key, T, buf) {
  const fn = SOUNDS[style]?.[key];
  if (!fn) return false;
  if (T.result === 'evaded' && !T.flies) return false; // nothing flew to pass on: the result's own voice
  const tr = TRIM[style]?.[key] || {}, db = (x) => Math.pow(10, (x || 0) / 20), r = T.result;
  const base = db(tr.level) * (T.gain ?? 1), hit = base * (r === 'crit' ? db(tr.crit) : r === 'blocked' ? db(tr.blocked) : r === 'evaded' ? db(tr.evaded) : 0.74 + 0.2 * T.k);
  // Its level steps to the contact's at the hit (an evaded one is at its own all along).
  const bus = (dest) => {
    const g = ctx.createGain(), p = g.gain;
    g.connect(dest);
    const first = r === 'evaded' || !T.flies ? hit : base;
    p.value = first; p.setValueAtTime(first, T.t);
    if (first !== hit) { p.setValueAtTime(base, Math.max(T.t, T.hit - 0.004)); p.linearRampToValueAtTime(hit, Math.max(T.t + 0.001, T.hit - 0.0005)); }
    return g;
  };
  const K = kit(ctx, buf);
  fn(K, { dry: bus(out.dry), room: bus(out.room) }, T);
  if (T.heavy && style === PICKED && !ATTACKS[key]?.does) { // its layer, at a level of its own
    const g = base * db(LAYERS[T.heavy]), on = (dest) => { const n = ctx.createGain(); n.gain.value = g; n.connect(dest); return n; };
    LAYER[T.heavy](K, { dry: on(out.dry), room: on(out.room) }, T);
  }
  return true;
}
export const hasAttack = (style, key) => !!SOUNDS[style]?.[key];

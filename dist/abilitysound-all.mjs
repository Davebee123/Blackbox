// Ability sounds, round 2 (docs/ability-sounds-plan.md): every ability's sound in the picked style, built from its row
// in the effects table (abilityfx-table.mjs) the way its effect is: by motion, by what it throws and by class.
//   launch   as it leaves the key: its class's
//   travel   its motion's, for as long as it flies
//   contact  what it is: a strike (it lands with weight, by how much it throws and deals), a sign (a status or an
//            attack cut: a latch and two notes), yours (a shield closing, a heal rising, a buff stamped), a helper
//            (steps, then a chirp as it arrives), a fire catching
//   tail     its particles, in its class's rhythm (the Bastion's rings on, the Infiltrator's comes late, the Operator's
//            answers in three beats)
// Each ability sits at its own pitch (its class's register, then its name's). SIGNATURE adds what only that one has.
// abilitysound.mjs core() hands in the style's own voices (H) and keeps each class's key 1 as it was made by hand.
import { ABILITIES } from './data.mjs';
import { RECIPES } from './abilityfx-table.mjs';

const PULSE = 0.09; // s between the Operator's beats (abilityfx.mjs PULSE)
const NOTE = { breaker: 1, bastion: 0.84, infiltrator: 1.26, operator: 1.12 };
const ECHO = {
  breaker: { time: 0.1, fb: 0.48, wet: 0.5 }, bastion: { time: 0.11, fb: 0.55, wet: 0.5 },
  infiltrator: { time: 0.07, fb: 0.5, wet: 0.5, lp: 3600 }, operator: { time: PULSE, fb: 0.45, wet: 0.45 },
};
const hashOf = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };

// What an ability's sound is, from its row: 'strike' | 'sign' | 'self' | 'helper' | 'ignite'.
export function kindOf(key) {
  const R = RECIPES[key];
  if (!R) return null;
  if (R.on === 'you') return 'self';
  if (R.motion === 'walk') return 'helper';
  if (R.motion === 'none') return 'ignite';
  if (R.motion === 'mark' || R.motion === 'slash' || R.at === 'chip' || (R.motion === 'clamp' && !ABILITIES[key]?.damage)) return 'sign';
  return 'strike';
}
// How heavy it lands (0–1): what it throws and what it deals.
export function massOf(key) {
  const n = (s) => (RECIPES[key]?.burst || []).find((x) => x.style === s)?.n || 0;
  return Math.min(1, (n('shock') + n('bits') * 0.5 + n('splash') * 0.5 + (n('flash') ? 6 : 0) + (ABILITIES[key]?.damage || 0) * 0.15) / 22);
}
// The rows that get a sound: every ability's (a burn's later ticks keep today's small voice).
export const SOUND_KEYS = Object.keys(RECIPES).filter((k) => !k.includes(':'));

// What only that ability has, on top of its generic sound. X: { fx, b (the crushed bus), p, big, crit, late, cls }.
const SIGNATURE = {
  // An arc: a second crack, a discharge, arcing on after.
  overload(K, o, T, X) {
    K.crack(X.b, T.hit + 0.035, { peak: 0.3, f: 6000 });
    K.surge(X.fx, T.hit, { f0: 180, f1: 40, d: 0.22 + 0.1 * X.big, peak: 0.3, drive: 5, bright: 4500 });
    K.crackle(X.fx, T.hit + 0.04, T.hit + 0.5, { f: 3800, peak: 0.2, rise: false, pan: 0.3 });
    K.S(o.dry, T.hit, 'subdrop', { gain: 0.35, rate: 0.9, jitter: 0 });
  },
  // Air pulled in, then two booms and a long rumble.
  detonate(K, o, T, X) {
    if (T.flies) K.S(X.fx, 0, 'whoosh', { reverse: true, end: T.hit, dur: Math.min(0.25, T.hit - T.t), gain: 0.4, rate: 0.7 });
    K.boom(K.g(0.9, o.dry), T.hit + 0.1, { f0: 70, f1: 24, glide: 0.2, d: 0.5, peak: 0.6 });
    K.rumble(o.dry, T.hit + 0.03, { f: 130, d: 0.7, peak: 0.3 });
    K.S(o.dry, T.hit, 'subdrop', { gain: 0.5, rate: 0.8, jitter: 0 });
  },
  // Bricks going up, then the fire humming on.
  firewall(K, o, T, X) {
    for (let i = 0; i < 6; i++) K.S(K.pan(X.fx, -0.5 + i * 0.2), T.hit + i * 0.045, 'plate-l', { gain: 0.3, rate: 0.5 + i * 0.05, lp: 1800, dur: 0.06, fade: 0.003, jitter: 0 });
    K.hum(o.room, T.hit + 0.25, { f: 55, d: 0.9, peak: 0.1 });
    K.rumble(o.dry, T.hit + 0.2, { f: 160, d: 0.6, peak: 0.22 });
  },
  // A clean sweep up through the fire, and what it draws back.
  purge(K, o, T, X) {
    K.hiss(X.fx, T.hit, { type: 'highpass', f0: 1200, f1: 7000, glide: 0.45, a: 0.06, d: 0.4, peak: 0.12, color: 'pink' });
    K.modes(o.room, T.hit + 0.3, [[784, 1, 0.5], [1175, 0.6, 0.4], [1568, 0.4, 0.3]], { peak: 0.08 });
  },
  // Steel cracking: struck metal, glass, a ring in the room.
  crack(K, o, T, X) {
    K.S(X.fx, T.hit, 'metal-h', { gain: 0.5, rate: 0.9 });
    K.S(K.pan(X.fx, 0.3), T.hit + 0.02, 'glass-l', { gain: 0.35, rate: 0.8 });
    K.modes(o.room, T.hit, [[1480, 1, 0.35], [3620, 0.5, 0.22]], { peak: 0.09 });
    K.boom(K.g(0.6, o.dry), T.hit, { f0: 110, f1: 45, d: 0.18, peak: 0.5 });
  },
  // Two walls closing, a slam, a lock turning after.
  quarantine(K, o, T, X) {
    K.S(X.fx, T.hit, 'plate-l', { gain: 0.55, rate: 0.4, lp: 1600, jitter: 0 });
    K.boom(K.g(0.9, o.dry), T.hit, { f0: 85, f1: 28, glide: 0.16, d: 0.4, peak: 0.6 });
    K.S(X.fx, T.hit + 0.14, 'relay', { gain: 0.45, rate: 0.7 });
    K.hum(o.room, T.hit + 0.05, { f: 82, d: 0.7, peak: 0.09 });
  },
  // A helper boots: two notes up as it sets off.
  deploy(K, o, T, X) { K.modes(X.fx, T.t + 0.02, [[660 * X.p, 1, 0.1]], { peak: 0.06 }); K.modes(X.fx, T.t + 0.09, [[990 * X.p, 1, 0.12]], { peak: 0.06 }); },
  // The swarm: three boots, and three answers stepping up across the room.
  botnet(K, o, T, X) {
    for (let i = 0; i < 3; i++) {
      K.modes(K.pan(X.fx, -0.6 + 0.6 * i), T.t + 0.02 + i * 0.05, [[(587 + 110 * i) * X.p, 1, 0.1]], { peak: 0.05 });
      K.modes(K.pan(X.fx, -0.6 + 0.6 * i), T.hit + 0.12 + i * PULSE, [[(880 + 220 * i) * X.p, 1, 0.16]], { peak: 0.06 });
    }
    K.boom(K.g(0.6, o.dry), T.hit, { f0: 100, f1: 40, d: 0.2, peak: 0.5 });
  },
  // The needle in, then the fire taking hold and burning on.
  inject(K, o, T, X) {
    K.buzz(X.b, T.t, { d: 0.04, peak: 0.25, f0: 8000, f1: 2500 });
    K.hiss(X.fx, T.hit, { type: 'highpass', f0: 5000, a: 0.0005, d: 0.012, peak: 0.4 });
    K.crackle(K.pan(X.fx, -0.3), T.hit + 0.2, T.hit + 0.9, { f: 4200, peak: 0.16, rise: false });
    K.rumble(o.dry, T.hit + 0.05, { f: 180, d: 0.7, peak: 0.22 });
  },
  // Water coming: a swell behind the wave, and it breaking.
  flood(K, o, T, X) {
    if (T.flies) K.hiss(o.dry, T.t, { type: 'lowpass', f0: 300, f1: 1800, glide: T.hit - T.t, a: Math.max(0.03, T.hit - T.t - 0.02), d: 0.03, peak: 0.3, color: 'pink' });
    K.hiss(K.pan(X.fx, -0.5), T.hit, { type: 'bandpass', f0: 5000, f1: 700, glide: 0.5, q: 0.5, a: 0.004, d: 0.5, peak: 0.22, color: 'pink' });
    K.hiss(K.pan(X.fx, 0.5), T.hit + 0.04, { type: 'bandpass', f0: 4000, f1: 500, glide: 0.5, q: 0.5, a: 0.004, d: 0.55, peak: 0.2, color: 'pink' });
  },
  // Steel and glass going to pieces, wide.
  shatter(K, o, T, X) {
    K.S(X.fx, T.hit, 'metal-h', { gain: 0.45, rate: 1.1 });
    for (let i = 0; i < 4; i++) K.S(K.pan(X.fx, [-0.7, 0.6, -0.3, 0.8][i]), T.hit + 0.02 + i * 0.045, i % 2 ? 'glass-l' : 'glass-h', { gain: 0.4 - i * 0.06, rate: 1.2 - i * 0.12 });
    K.modes(o.room, T.hit, [[2100, 1, 0.3], [4300, 0.5, 0.2]], { peak: 0.07 });
  },
  // Everything rolling back: air pulled in to each part, a falling line after.
  failover(K, o, T, X) {
    if (T.flies) K.S(X.fx, 0, 'whoosh', { reverse: true, end: T.hit, dur: Math.min(0.2, T.hit - T.t), gain: 0.35, rate: 1.2 });
    K.whine(X.fx, T.hit, T.hit + 0.22, { f0: 900 * X.p, f1: 220 * X.p, peak: 0.05, lp: 2600 });
  },
};
export const SIGNATURES = Object.keys(SIGNATURE);

// H: the style's voices (abilitysound.mjs core()): bus, weight, stutter, snap, pings, low (its pitch), Q (its blips' level).
export function generic(H) {
  const { bus, weight, stutter, snap, pings, low, Q } = H;
  const soft = (dest, x = 1.5) => (K) => K.g(Math.min(1, Q * x), dest); // the blips' own level
  const make = (key) => {
    const R = RECIPES[key], A = ABILITIES[key] || {}, cls = A.cls || null, kind = kindOf(key);
    const p = (NOTE[cls] || 1) * (0.88 + 0.26 * hashOf(key));
    const n = (s) => (R.burst || []).find((x) => x.style === s)?.n || 0;
    const steel = R.tone === 'steel' || (R.burst || []).some((x) => x.steel);
    const mass = massOf(key);
    const heals = R.heals || A.heal || (R.burst || []).some((x) => x.style === 'rise' && x.chars === '+');
    const shield = R.motion === 'shell' || R.motion === 'wall' || steel;
    return (K, o, T) => {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      const { fx, b } = bus(K, o, ECHO[cls] || ECHO.operator);
      const big = crit ? 1 : k, late = cls === 'infiltrator' ? hit + stop + 0.05 : hit + stop;
      const blip = soft(fx)(K), X = { fx, b, p, big, crit, late, cls };
      const air = (f0, f1, peak, q = 0.8, tail = 0.25, end = arrive) => K.flight(o.dry, t, end, { f0, f1, q, peak, color: 'brown', pass: miss, tail });
      const note = (x, f, pan = 0, g = 0.06) => K.modes(pan ? K.pan(fx, pan) : fx, x, [[f, 1, 0.16], [f * 2.01, 0.3, 0.08]], { peak: g });

      // ---- launch and travel ----
      if (T.flies) {
        if (cls === 'breaker') K.tone(b, t, { type: 'square', f0: 90 * p, f1: 180 * p, glide: 0.04, d: 0.05, peak: 0.16 * Q });
        else if (cls === 'bastion') K.tone(b, t, { type: 'square', f0: 70 * p, f1: 110 * p, glide: 0.06, d: 0.07, peak: 0.16 * Q });
        else if (cls === 'infiltrator') K.buzz(b, t, { d: 0.03, peak: 0.2, f0: 7000, f1: 2500 });
        else { K.tone(b, t, { type: 'square', f0: 80, f1: 60, glide: 0.05, d: 0.06, peak: 0.16 * Q }); note(t, 1568 * p / 1.12, 0, 0.05); }
        const m = R.motion;
        if (m === 'punch') { K.stream(b, t, arrive, { lo: 260 * p, hi: 390 * p, baud: 110, rise: 1.7, peak: 0.05 * Q }); air(70, 320, 0.3, 0.7, 0.3); }
        else if (m === 'swing') { K.fm(b, t, { fc: 45 * p, f1: 120 * p, ratio: 2, i0: 1.5, i1: 5, dur: Math.max(0.05, (crit ? arrive : hit) - t), peak: 0.09 }); air(55, 240, 0.34, 0.6, 0.34, crit ? arrive : hit); }
        else if (m === 'dart') { K.stream(b, t, arrive, { lo: 900 * p, hi: 1350 * p, baud: 200, rise: 2, peak: 0.035 * Q }); air(160, 900, 0.2, 0.9, R.through ? 0.32 : 0.18); }
        else if (m === 'wave') { K.whine(fx, t, arrive, { f0: 196 * p, f1: 784 * p, peak: 0.04, lp: 2600 }); air(90, 420, 0.2, 0.8, 0.28); }
        else if (m === 'bolt') { K.zap(b, t, { f0: 5000, f1: 900, d: 0.05, peak: 0.25 }); K.crackle(fx, t, arrive, { f: 3200, peak: 0.16 }); air(120, 700, 0.18); }
        else if (m === 'walk') {
          // Steps: a patter up the line, one line a helper.
          const count = Math.min(5, R.count || 1), gap = 0.07;
          for (let h = 0; h < count; h++) for (let i = 0, x = t + 0.03 + h * 0.02; x < arrive - 0.01; i++, x += gap) K.S(K.pan(fx, count > 1 ? -0.5 + h / (count - 1) : 0), x, 'tick', { gain: 0.22, rate: (i % 2 ? 1.25 : 1) * p, jitter: 0.05 });
          air(200, 500, 0.08);
        }
        else if (m === 'all') { air(100, 600, 0.22, 0.7, 0.25); K.whine(fx, t, arrive, { f0: 300 * p, f1: 900 * p, peak: 0.03, lp: 2400 }); }
        else { air(kind === 'self' ? 140 : 110, kind === 'self' ? 480 : 520, kind === 'self' ? 0.14 : 0.22); if (R.spin) K.whine(fx, t, arrive, { f0: 220 * p, f1: 220 * p * (1 + R.spin / 360), peak: 0.03, lp: 2600 }); }
        if (kind === 'strike' && !miss && hit - arrive > 0.03) K.fm(b, arrive, { fc: 55 * p, f1: 190 * p, ratio: 2, i0: 2, i1: 7, dur: hit - arrive, peak: crit ? 0.2 : 0.12 }); // a wind-up
      }
      if (miss && kind !== 'self') return;
      if (result === 'chit' && kind !== 'self') return snap(K, o, hit, p);

      // ---- contact ----
      const land = (x, w = 1, pp = 1, m = mass) => {
        K.impact(K.g(w, b), x, big * (0.4 + 0.6 * m), crit && w === 1, pp * p * low * (1.15 - 0.4 * m));
        weight(K, o, x, big * w * (0.35 + 0.65 * m), crit && m > 0.5 && w === 1, { f0: 105 * pp * p, f1: 30 + 14 * (1 - m), d: 0.14 + 0.2 * m, drop: m > 0.6 ? 0.4 : m > 0.35 ? 0.8 : 2 });
      };
      if (kind === 'strike') {
        const m = R.motion;
        if (m === 'wave') [1, 0.8, 0.65].forEach((w, i) => land(hit + i * PULSE, w, [1.15, 0.95, 0.78][i]));
        else if (m === 'dart') {
          K.hiss(b, hit, { type: 'highpass', f0: 4500, a: 0.0005, d: 0.01, peak: 0.45 });
          K.buzz(b, hit, { d: 0.03, peak: 0.35, f0: 7000, f1: 1200 });
          K.tone(b, hit, { type: 'square', f0: 150 * p * low, f1: 48 * p * low, glide: 0.045, a: 0.001, peak: 0.3 + 0.18 * big, d: 0.07 + 0.03 * big });
          weight(K, o, hit, big * (0.5 + 0.5 * mass), crit && mass > 0.5, { f0: 130 * p, f1: 42, d: 0.16, drop: 2 });
        }
        else if (m === 'bolt') { K.crack(b, hit, { peak: 0.4, f: 5600 }); land(hit); if (R.twice) land(hit + 0.08, 0.8, 0.9); }
        else if (m === 'all') { land(hit, 0.8); [-0.7, 0.7].forEach((pan, i) => K.impact(K.g(0.4, K.pan(b, pan)), hit + 0.03 * (i + 1), big * 0.4, false, p * low * (1.1 + 0.15 * i))); }
        else if (m === 'blast') { land(hit, 1, 0.85, Math.max(mass, 0.8)); K.buzz(b, hit, { d: 0.14, peak: 0.3, f0: 5000, f1: 500 }); }
        else if (m === 'clamp') { [-0.6, 0.6].forEach((pan, i) => K.S(K.pan(fx, pan), Math.max(t, hit - 0.07 + i * 0.03), 'relay', { gain: 0.4, rate: 0.8 - 0.05 * i })); land(hit, 1, 0.85); }
        else land(hit);
      } else if (kind === 'sign') {
        // A latch: a click and a short low thunk; a clamp's two halves first; an attack cut drops out like a tape stopping.
        if (R.motion === 'clamp') [-0.6, 0.6].forEach((pan, i) => K.S(K.pan(fx, pan), Math.max(t, hit - 0.07 + i * 0.03), 'relay', { gain: 0.4, rate: 0.8 - 0.05 * i }));
        if (R.drop && hit - t > 0.1) K.whine(fx, hit - 0.09, hit, { f0: 900 * p, f1: 240 * p, peak: 0.04, lp: 3000 });
        K.hiss(b, hit, { type: 'highpass', f0: 4500, a: 0.0005, d: 0.01, peak: 0.4 });
        K.tone(b, hit, { type: 'square', f0: 130 * p * low, f1: 62 * p * low, glide: 0.04, a: 0.001, d: 0.06 + 0.03 * big, peak: 0.26 });
        K.boom(K.g(0.5 + 0.4 * mass, o.dry), hit, { f0: 110 * p, f1: 42, d: 0.14 + 0.12 * mass, peak: 0.4 + 0.3 * big });
        if (R.cuts) { K.surge(fx, hit, { f0: 520 * p, f1: 40, d: 0.22, peak: 0.16, drive: 4, bright: 3000 }); K.buzz(b, hit, { d: 0.06, peak: 0.3, f0: 5000, f1: 600 }); }
        else if (R.collapse) K.fm(b, hit, { fc: 400 * p, f1: 40, ratio: 1.5, i0: 6, i1: 1, dur: 0.3, peak: 0.2 });
        else if (R.motion === 'slash') K.zap(b, hit, { f0: 8000, f1: 700, d: 0.07, peak: 0.3 });
        const up = R.at === 'chip' ? [784, 587] : [784, 1175]; // on an attack: two notes down; a status: two up
        up.forEach((f, i) => note(late + 0.05 + i * 0.07, f * p, i ? 0.3 : -0.3));
      } else if (kind === 'helper') {
        // It arrives: a small thump and its chirp (each helper its own, across the room).
        const count = Math.min(5, R.count || 1);
        K.boom(K.g(0.45, o.dry), hit, { f0: 120 * p, f1: 55, d: 0.1, peak: 0.4 });
        K.hiss(b, hit, { type: 'highpass', f0: 4500, a: 0.0005, d: 0.008, peak: 0.25 });
        for (let h = 0; h < count; h++) { const x = hit + 0.03 + h * 0.05, pan = count > 1 ? -0.5 + h / (count - 1) : 0; note(x, 1319 * p, pan, 0.05); note(x + 0.06, 1760 * p, pan, 0.05); }
      } else if (kind === 'ignite') {
        // A fire catching: a small thump, a roar rising, the crackle after.
        const f = n('flame') || 10;
        K.boom(K.g(0.6, o.dry), hit, { f0: 95 * p, f1: 40, d: 0.18, peak: 0.45 + 0.2 * big });
        K.hiss(o.dry, hit, { type: 'lowpass', f0: 300, f1: 1500, glide: 0.3, a: 0.04, d: 0.35 + f * 0.006, peak: 0.3, color: 'brown' });
        K.buzz(b, hit, { d: 0.05, peak: 0.25, f0: 4000, f1: 900 });
        if (R.grow) K.whine(fx, hit, hit + 0.4, { f0: 180 * p, f1: 540 * p, peak: 0.04, lp: 2400 });
      } else {
        // Yours. A shield: its halves close and it locks, humming. A heal: notes rising. A sweep: a wash across. A buff: stamped.
        if (shield) {
          [-0.6, 0.6].forEach((pan, i) => K.S(K.pan(fx, pan), Math.max(t, hit - 0.08 + i * 0.03), 'relay', { gain: 0.35, rate: 0.85 - 0.06 * i }));
          K.S(fx, hit, steel ? 'metal-l' : 'plate-l', { gain: 0.35, rate: 0.6 * p, lp: 2400 });
          K.boom(K.g(0.5, o.dry), hit, { f0: 100 * p, f1: 45, d: 0.2, peak: 0.5 });
          K.hum(o.room, hit + 0.02, { f: 110 * p, d: 0.5, peak: 0.07 });
          if (R.motion === 'wall') for (let i = 0; i < 5; i++) K.S(K.pan(fx, -0.4 + i * 0.2), hit + 0.04 + i * 0.05, 'tick', { gain: 0.3, rate: 0.6 + i * 0.08 });
        } else if (R.motion === 'sweep') {
          const d = R.reverse ? -1 : 1;
          K.flight(K.pan(o.dry, -0.6 * d), hit, hit + 0.16, { f0: 300, f1: 1400, q: 0.8, peak: 0.2, color: 'pink', tail: 0.08 });
          K.flight(K.pan(o.dry, 0.6 * d), hit + 0.12, hit + 0.3, { f0: 1400, f1: 2600, q: 0.8, peak: 0.16, color: 'pink', tail: 0.12 });
          K.whine(fx, hit, hit + 0.3, R.reverse ? { f0: 660 * p, f1: 330 * p, peak: 0.04, lp: 2600 } : { f0: 330 * p, f1: 660 * p, peak: 0.04, lp: 2600 });
        } else if (R.motion === 'none') {
          K.hiss(fx, hit, { type: 'bandpass', f0: 800, f1: 3200, glide: 0.4, a: 0.05, d: 0.45, peak: 0.14, color: 'pink' });
        } else {
          K.hiss(b, hit, { type: 'highpass', f0: 4500, a: 0.0005, d: 0.01, peak: 0.3 });
          K.boom(K.g(0.5, o.dry), hit, { f0: 120 * p, f1: 50, d: 0.16, peak: 0.5 });
          if (R.spin) K.whine(fx, hit, hit + 0.18, { f0: 300 * p, f1: 600 * p, peak: 0.04, lp: 2600 });
        }
        if (heals) [523, 659, 784, 1047].forEach((f, i) => note(hit + 0.06 + i * 0.06, f * p, i % 2 ? 0.3 : -0.3, 0.055));
        else if (!shield) [659, 988].forEach((f, i) => note(late + 0.06 + i * 0.07, f * p, 0, 0.05));
      }

      // ---- tail: what it throws ----
      const at = late;
      if (n('bits')) {
        const w = K.cascade(cls === 'infiltrator' ? K.pan(b, -0.4) : b, at + 0.015, Math.min(26, Math.round((crit ? 1.6 : 1) * (3 + n('bits') * (0.3 + 0.4 * k)))), { top: (cls === 'bastion' ? 3600 : cls === 'infiltrator' ? 6500 : 4800) * p, step: cls === 'bastion' ? 0.013 : 0.0105, peak: 0.1 * Q });
        if (kind === 'strike') K.fm(b, at + 0.015 + w, { fc: 110 * p * low, f1: 36 * low, ratio: 1.5, i0: 8, i1: 0.5, dur: 0.12 + 0.14 * big * mass, peak: 0.14 + 0.26 * mass });
      } else if (kind === 'strike') K.fm(b, at + 0.02, { fc: 110 * p * low, f1: 36 * low, ratio: 1.5, i0: 8, i1: 0.5, dur: 0.1 + 0.12 * big * mass, peak: 0.1 + 0.24 * mass });
      if (n('glitch')) { stutter(K, soft(b, 1.6)(K), at, 2 + Math.round(n('glitch') / 5), 0.04, p * low); for (let i = 0; i < 3; i++) K.S(K.pan(fx, [-0.5, 0.5, 0][i]), at + 0.02 + i * 0.05, 'glitch', { gain: 0.35, rate: 0.7 + 0.4 * i }); }
      if (n('spark')) K.shards(blip, at + 0.02, { n: Math.min(8, n('spark')), span: 0.12, peak: 0.07 });
      if (n('shards')) { K.shards(blip, at + 0.006, { n: Math.min(12, n('shards')), lo: 2600, hi: 8000 }); K.S(fx, at, steel ? 'metal-h' : 'glass-h', { gain: 0.28, rate: (steel ? 1.1 : 1) * p }); }
      if (n('flash')) K.hiss(fx, hit, { type: 'highpass', f0: 3000, a: 0.001, d: 0.09, peak: 0.28 });
      if (n('ring')) K.ring(fx, at + 0.03, { fc: 1200 * p, fmod: 170, d: 0.12 + 0.04 * n('ring'), peak: 0.06, type: 'sine' });
      if (n('flame')) { const f = n('flame'); K.crackle(fx, at, at + 0.25 + f * 0.008, { f: 3500, peak: Math.min(0.26, 0.1 + 0.004 * f), rise: false }); if (kind !== 'ignite') K.hiss(o.dry, at, { type: 'lowpass', f0: 900, f1: 250, glide: 0.3, a: 0.01, d: 0.2 + f * 0.006, peak: Math.min(0.28, 0.1 + 0.004 * f), color: 'brown' }); }
      if (n('ember')) K.crackle(K.pan(fx, 0.4), at + 0.15, at + 0.5, { f: 5000, peak: 0.08, rise: false });
      if (n('dust')) K.hiss(fx, at, { type: 'bandpass', f0: 2400, f1: 900, glide: 0.25, q: 0.7, a: 0.01, d: 0.22, peak: 0.1, color: 'pink' });
      if (n('splash')) K.hiss(o.dry, at, { type: 'bandpass', f0: 3000, f1: 400, glide: 0.35, q: 0.6, a: 0.005, d: 0.4, peak: 0.3, color: 'pink' });
      if (n('drip')) for (let i = 0; i < 3; i++) K.tone(fx, at + 0.06 + i * 0.07, { f0: (900 - 180 * i) * p, f1: (500 - 100 * i) * p, glide: 0.05, d: 0.05, peak: 0.06 });
      if (n('siphon')) [523, 784, 1047].forEach((f, i) => note(at + 0.1 + i * 0.06, f * p, (i - 1) * 0.5, 0.05)); // drawn back to you
      if (n('rise') && !heals) [587, 880].forEach((f, i) => note(at + 0.08 + i * 0.07, f * p, 0, 0.045));
      // The class's rhythm: the Bastion's heavy ones ring on; the Operator's strikes answer in three beats.
      if (cls === 'bastion' && kind === 'strike' && mass > 0.4) for (const [f, g] of [[950, 0.04], [1425, 0.026]]) K.tone(o.room, at + 0.05, { f0: f * p, f1: f * p * 0.97, glide: 0.7, a: 0.002, peak: g, d: 0.6 + 0.3 * big });
      if (cls === 'operator' && kind === 'strike') pings(K, soft(fx, 1)(K), at + PULSE, [2093 * p / 1.12, 1568 * p / 1.12, 1047 * p / 1.12], PULSE, 0.4);
      SIGNATURE[key]?.(K, o, T, X);
    };
  };
  return Object.fromEntries(SOUND_KEYS.map((key) => [key, make(key)]));
}

// Round 4 of the preview pack: the victory sounds, built like the bodies' breaks in clips3.js (a physical event in a
// room, layered CC0 samples from dist/sfx and synthesis). The designer picked each from an audition.
//   FORMAT=ogg SET=4 node tools/sound-preview/render.mjs dist/sfx
import { rnd, NOTE } from './lib.js';

const ramp = (param, a, b, t, d, kind = 'linear') => { param.setValueAtTime(a, t); param[`${kind}RampToValueAtTime`](b, t + d); };
function snap(K, dest, t, { peak = 0.4, hp = 3000, d = 0.015 } = {}) {
  K.burst(dest, t, { type: 'highpass', f0: hp, a: 0.0005, d, peak });
  K.burst(dest, t, { type: 'bandpass', f0: 1400, q: 0.8, a: 0.0005, d: 0.04, peak: peak * 0.4 });
}
// Noise through a filter, amplitude-chopped at `rate` (a fan's blades); rate and band can glide.
function chopped(K, dest, t, dur, { rate = 40, rate1 = rate, f0 = 1500, f1 = f0, q = 1, depth = 0.45, peak = 0.1, a = 0.01, color = 'pink', pan = 0, type = 'bandpass' } = {}) {
  const s = K.ctx.createBufferSource(), f = K.filt(type, f0, q), am = K.gain(1 - depth), g = K.gain(0), o = K.ctx.createOscillator();
  s.buffer = K.noiseBuf(color); o.frequency.setValueAtTime(rate, t); if (rate1 !== rate) o.frequency.exponentialRampToValueAtTime(rate1, t + dur);
  const od = K.gain(depth); o.connect(od).connect(am.gain);
  if (f1 !== f0) ramp(f.frequency, f0, f1, t, dur, 'exponential');
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + Math.max(a, dur * 0.55)); g.gain.linearRampToValueAtTime(0, t + dur);
  K.chain(s, f, am, g, K.pan(pan), dest); s.start(t, rnd(0, 1)); o.start(t); s.stop(t + dur + 0.02); o.stop(t + dur + 0.02);
}
// Mains hum through a little drive: [f, peak] partials, held `hold` seconds from t, then sinking (or rising) to ×to.
function hum(K, dest, t, parts, { hold = 0, to = 0.3, glide = 0.9, d = 0.9, lp = 800, a = 0.01 } = {}) {
  const h = K.gain(1); K.chain(h, K.shaper(2), K.filt('lowpass', lp), dest);
  for (const [f, p] of parts) { if (hold) K.blip(h, t, { f0: f, a, hold, d: 0.04, peak: p }); K.blip(h, t + hold, { f0: f, f1: f * to, glide, a: hold ? 0.004 : a, d, peak: p }); }
}
// A soft horn: a hum held on a note, the buzz taken off.
function soft(K, dest, t, midi, dur, { peak = 0.14, pan = 0, a = 0.06 } = {}) {
  const f = NOTE(midi), h = K.gain(1); K.chain(h, K.shaper(1.5), K.filt('lowpass', Math.min(1400, f * 4)), K.pan(pan), dest);
  for (const det of [-6, 6]) K.blip(h, t, { type: 'sawtooth', f0: f, a, hold: Math.max(0.01, dur - a - 0.3), d: 0.3, peak, detune: det });
  K.blip(h, t, { type: 'sine', f0: f / 2, a, hold: Math.max(0.01, dur - a - 0.3), d: 0.3, peak: peak * 0.8 });
}
const breaker = (K, dest, t, k = 1, pan = 0, rate = 0.55) => { snap(K, dest, t, { peak: 0.4 * k, hp: 2200 }); K.S(dest, t, 'relay', { gain: 0.65 * k, rate, pan }); K.S(dest, t, 'punch-m', { gain: 0.6 * k, rate: rate + 0.2, pan }); K.sub(dest, t, { f0: 90, f1: 40, d: 0.25, peak: 0.5 * k }); };

const wins = [
  { id: 'win-power-cut', shot: true, len: 1.8, desc: 'A fight won, the power cut: a breaker drops, the hum sinks, a fan winds down, and the metal ticks as it cools.', build(K) {
    const out = K.space(K.out, { secs: 1.2, decay: 2.5, damp: 0.5, wet: 0.24 });
    snap(K, out, 0, { peak: 0.5, hp: 2200 }); K.S(out, 0, 'relay', { gain: 0.7, rate: 0.5 }); K.S(out, 0, 'punch-m', { gain: 0.7, rate: 0.8 }); K.sub(out, 0, { f0: 90, f1: 32, d: 0.4, peak: 0.7 });
    hum(K, out, 0, [[100, 0.2], [200, 0.1], [300, 0.05]], { to: 0.3, glide: 1, d: 1 });
    chopped(K, out, 0.02, 1.05, { rate: 70, rate1: 5, f0: 1800, f1: 450, peak: 0.13, depth: 0.5 });
    for (const t of [0.75, 1.0, 1.22]) K.grain(out, t, 'tin', { dur: 0.03, rate: rnd(0.5, 0.65), gain: 0.25, hp: 700, pan: rnd(-0.6, 0.6) });
  } },
  { id: 'win-blackout', shot: true, len: 3.4, desc: 'A boss down or a server taken over, the blackout: four breakers from left to right, each taking a hum with it, then the fans wind down and the metal ticks.', build(K) {
    const out = K.space(K.out, { secs: 2.4, decay: 2.2, damp: 0.5, wet: 0.33 });
    [[0, -0.7, 200, 0.07], [0.35, -0.25, 150, 0.09], [0.7, 0.25, 100, 0.16], [1.05, 0.7, 50, 0.22]].forEach(([t, pan, f, p], i) => {
      snap(K, out, t, { peak: 0.4, hp: 2200 }); K.S(out, t, 'relay', { gain: 0.65, rate: 0.55, pan }); K.S(out, t, 'punch-m', { gain: 0.6 + i * 0.1, rate: 0.7, pan });
      hum(K, out, 0, [[f, p]], { hold: t + 0.01, to: 0.3, glide: 0.8, d: 0.9, a: 0.02 });
    });
    K.sub(out, 1.05, { f0: 80, f1: 25, d: 0.9, peak: 0.8 }); K.S(out, 1.05, 'subdrop', { gain: 0.6, rate: 0.8 });
    chopped(K, out, 1.06, 1.6, { rate: 62, rate1: 4, f0: 1700, f1: 400, peak: 0.13, depth: 0.5, pan: -0.2 });
    chopped(K, out, 1.06, 1.3, { rate: 48, rate1: 4, f0: 1100, f1: 350, peak: 0.1, depth: 0.5, pan: 0.4 });
    for (const t of [2.35, 2.75]) K.grain(out, t, 'tin', { dur: 0.03, rate: rnd(0.5, 0.65), gain: 0.22, hp: 700, pan: rnd(-0.6, 0.6) });
  } },
  // The power cut backwards. The card (dist/levelup.css) moves to it: the breaker at 0, the climb, the lock at 0.72 s.
  { id: 'levelup-lift', shot: true, len: 2.2, desc: 'A level gained, the lift: a breaker, the hum climbing to one held note, a relay as it locks, and the fan spinning up.', build(K) {
    const out = K.space(K.out, { secs: 1.4, decay: 2.4, damp: 0.5, wet: 0.26 });
    breaker(K, out, 0, 1);
    hum(K, out, 0.01, [[49, 0.2], [98, 0.11], [147, 0.05]], { to: 2, glide: 0.7, d: 0.72, a: 0.45, lp: 900 });
    soft(K, out, 0.66, 55, 1.1, { a: 0.1, peak: 0.13 }); soft(K, out, 0.7, 62, 1.0, { a: 0.14, peak: 0.07 });
    chopped(K, out, 0.02, 1.5, { rate: 6, rate1: 68, f0: 450, f1: 1700, peak: 0.11, depth: 0.5, a: 0.5 });
    K.S(out, 0.72, 'relay', { gain: 0.45, rate: 0.95, pan: 0.3 });
  } },
];

export const GROUPS4 = { wins };

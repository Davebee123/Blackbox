// Round 3 of the preview pack: dedicated sets for the bodies that had none, so every fight on a Ransomware or Worm
// server carries its own sound. Six bodies (Trojan, Cryptominer, Wiper, Exfil, Crawler, and one shared set for every
// guard and hunter, ICE), two candidates each, and each candidate an idle loop (6 s), an attack (under 1 s) and a
// part break (under 1.5 s). Same world as the three family sets in clips2.js: layered CC0 samples from dist/sfx and
// synthesis, dark and analogue, never cartoonish.
//   SET=3 node tools/sound-preview/render.mjs <outDir>   then   node tools/sound-preview/demo.mjs <results.json> <outDir>
import { rnd, pick } from './lib.js';

// ---------------- shared pieces ----------------
const ramp = (param, a, b, t, d, kind = 'linear') => { param.setValueAtTime(a, t); param[`${kind}RampToValueAtTime`](b, t + d); };
// A short hard transient at the front of a hit (lighter than round 2's crushed crack).
function snap(K, dest, t, { peak = 0.4, hp = 3000, d = 0.015 } = {}) {
  K.burst(dest, t, { type: 'highpass', f0: hp, a: 0.0005, d, peak });
  K.burst(dest, t, { type: 'bandpass', f0: 1400, q: 0.8, a: 0.0005, d: 0.04, peak: peak * 0.4 });
}
// A tiny dry tap: a foot, a leg. A short band of noise with a click of tone under it.
function tap(K, dest, t, { f = 1800, peak = 0.1, pan = 0, d = 0.012 } = {}) {
  K.burst(dest, t, { type: 'bandpass', f0: f, q: 2.5, a: 0.0006, d, peak, pan });
  K.blip(dest, t, { type: 'sine', f0: f * 0.4, f1: f * 0.3, glide: 0.01, a: 0.0006, d: d * 0.8, peak: peak * 0.4, pan });
}
// Events at a slowing (or quickening) pace: dt grows by `grow` each step.
function pace(t0, n, dt, grow, fn) { let t = t0; for (let i = 0; i < n; i++) { fn(t, i); t += dt; dt *= grow; } }
// Noise through a filter, amplitude-chopped at `rate` (a fan's blades, a shredder's teeth); rate and band can glide.
function chopped(K, dest, t, dur, { rate = 40, rate1 = rate, f0 = 1500, f1 = f0, q = 1, depth = 0.45, peak = 0.1, a = 0.01, color = 'pink', pan = 0, type = 'bandpass' } = {}) {
  if (t < 0 || t > K.end) return;
  const s = K.ctx.createBufferSource(), f = K.filt(type, f0, q), am = K.gain(1 - depth), g = K.gain(0), o = K.ctx.createOscillator();
  s.buffer = K.noiseBuf(color); o.frequency.setValueAtTime(rate, t); if (rate1 !== rate) o.frequency.exponentialRampToValueAtTime(rate1, t + dur);
  const od = K.gain(depth); o.connect(od).connect(am.gain);
  if (f1 !== f0) ramp(f.frequency, f0, f1, t, dur, 'exponential');
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + Math.max(a, dur * 0.55)); g.gain.linearRampToValueAtTime(0, t + dur);
  K.chain(s, f, am, g, K.pan(pan), dest); s.start(t, rnd(0, 1)); o.start(t); s.stop(t + dur + 0.02); o.stop(t + dur + 0.02);
}
// A small DC motor (a camera servo, a tape reel): a buzzy tone whose pitch glides, through a narrow body.
function motor(K, dest, t, dur, { f0 = 180, f1 = 260, peak = 0.04, pan = 0, bp = 900, q = 1.5, a = 0.03 } = {}) {
  if (t < 0 || t > K.end) return;
  const o = K.ctx.createOscillator(), o2 = K.ctx.createOscillator(), g = K.gain(0), mix = K.gain(1);
  o.type = 'sawtooth'; o2.type = 'square';
  ramp(o.frequency, f0, f1, t, dur, 'exponential'); ramp(o2.frequency, f0 * 2.01, f1 * 2.01, t, dur, 'exponential');
  o.connect(mix); o2.connect(K.gain(0.3)).connect(mix);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + Math.max(a, dur - 0.04)); g.gain.linearRampToValueAtTime(0, t + dur);
  K.chain(mix, K.shaper(2), K.filt('bandpass', bp, q), K.filt('lowpass', 2500), g, K.pan(pan), dest);
  for (const x of [o, o2]) { x.start(t); x.stop(t + dur + 0.02); }
}
// A scanning raster line: a 120 Hz pulse train heard through a narrow band that sweeps up while it crosses the room.
function raster(K, dest, t, dur, { f = 120, b0 = 1800, b1 = 3600, q = 5, peak = 0.05, p0 = -0.8, p1 = 0.8 } = {}) {
  if (t < 0 || t > K.end) return;
  const o = K.ctx.createOscillator(), bp = K.filt('bandpass', b0, q), g = K.gain(0), p = K.pan(p0);
  o.type = 'sawtooth'; o.frequency.value = f;
  ramp(bp.frequency, b0, b1, t, dur, 'exponential'); ramp(p.pan, p0, p1, t, dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + dur * 0.3); g.gain.setValueAtTime(peak, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur);
  K.chain(o, K.filt('highpass', 1200), bp, g, p, dest); o.start(t); o.stop(t + dur + 0.02);
}
// A buzzing mains coil (60 Hz, saturated), its level and pitch shaped by the caller: { o, g }.
function coil(K, dest, t, dur, { f0 = 60, f1 = f0, peak = 0.1, drive = 3, lp = 700, a = 0.005, pan = 0 } = {}) {
  const o = K.ctx.createOscillator(), o2 = K.ctx.createOscillator(), g = K.gain(0); o.type = 'sawtooth'; o2.type = 'sine';
  ramp(o.frequency, f0, f1, t, dur, 'exponential'); ramp(o2.frequency, f0 / 2, f1 / 2, t, dur, 'exponential');
  const mix = K.gain(1); o.connect(mix); o2.connect(K.gain(0.8)).connect(mix);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  K.chain(mix, K.shaper(drive), K.filt('lowpass', lp), g, K.pan(pan), dest);
  for (const x of [o, o2]) { x.start(t); x.stop(t + dur + 0.02); }
}
// A skittering run: a four-beat gallop of taps, crossing the stereo field.
function scurry(K, dest, t0, dur, { p0 = -0.7, p1 = 0.7, peak = 0.08, f = 2200, period = 0.17, fade = false } = {}) {
  for (let t = t0; t < t0 + dur; t += period * rnd(0.9, 1.1)) {
    const x = (t - t0) / dur, pan = p0 + (p1 - p0) * x, k = fade ? 1 - x : 1;
    for (const dt of [0, 0.028, 0.066, 0.092]) tap(K, dest, t + dt + rnd(0, 0.006), { f: f * rnd(0.85, 1.15), peak: peak * k * rnd(0.6, 1), pan, d: 0.01 });
  }
}

// A compressor that holds a rattle's first grains level with the rest.
function squash(K, { threshold = -36, ratio = 6 } = {}) { const c = K.ctx.createDynamicsCompressor(); c.threshold.value = threshold; c.ratio.value = ratio; c.knee.value = 6; c.attack.value = 0.002; c.release.value = 0.12; return c; }

const body = (id, desc, build, extra = {}) => ({ id, desc, build, ...extra });
const LOOP = { len: 6, pre: 6, xfade: 1 }, CYCLE = { len: 6, pre: 6, xfade: 0.05 }, HIT = { len: 0.9, shot: true }, BREAK = { len: 1.4, shot: true };

const bodies = [
  // ---------- Trojan: a courier. Packages that unpack into Droppers. ----------
  // A: the parcel in transit. A hand truck rolling, and the parcel's contents rattling, muffled, in their box.
  body('trojan-a-idle', 'Trojan A (the parcel), idle: a hand truck rolling over an uneven floor, and inside the parcel on it something loose rattling, muffled by the box, with a strap creaking now and then.', (K) => {
    const out = K.space(K.out, { secs: 1.2, decay: 2.5, damp: 0.6, wet: 0.2 });
    const roll = K.gain(1); K.lfo(roll.gain, 1.5, 0.35); K.chain(roll, out);
    K.bed(roll, { color: 'brown', gain: 0.08, nodes: [K.filt('lowpass', 220)] });
    const box = K.gain(1); K.chain(box, K.filt('bandpass', 650, 2.5), K.filt('lowpass', 1400), squash(K), K.gain(1.2), out);
    K.every(0.45, 1.3, (t) => {
      K.S(out, t, 'soft-m', { gain: 0.18, rate: 0.6, lp: 500 }); K.blip(out, t, { f0: 95, f1: 55, glide: 0.06, d: 0.1, peak: 0.08 });
      K.cloud(box, t + 0.01, t + rnd(0.15, 0.3), ['pluck', 'key', 'tin'], { density: (x) => 70 * (1 - x) + 5, dur: [0.015, 0.04], rate: [0.7, 1.1], gain: 0.35, pan: [-0.3, 0.3] });
    });
    K.every(1.5, 3.5, (t) => K.growl(K.chain(K.filt('bandpass', 900, 6), out), t, { f0: rnd(22, 32), f1: rnd(18, 26), dur: rnd(0.25, 0.4), vowels: ['u', 'o'], drive: 2, peak: 0.12, a: 0.05, pan: rnd(-0.4, 0.4) }));
  }, LOOP),
  body('trojan-a-attack', 'Trojan A (the parcel), attack: a package thrown down hard: a short rush of air, a heavy dull thud of cardboard and weight, and its contents settling with a muffled rattle.', (K) => {
    const out = K.space(K.out, { secs: 1, decay: 2.5, damp: 0.6, wet: 0.2 });
    K.burst(out, 0, { type: 'bandpass', f0: 500, f1: 1800, q: 0.9, glide: 0.1, a: 0.08, d: 0.03, peak: 0.25 });
    const h = 0.1; K.S(out, h, 'soft-h', { gain: 0.9, rate: 0.5 }); K.S(out, h, 'punch-m', { gain: 0.6, rate: 0.55, lp: 1500 }); K.sub(out, h, { f0: 90, f1: 35, d: 0.35, peak: 0.8 });
    K.burst(out, h, { type: 'lowpass', f0: 1200, f1: 200, glide: 0.15, a: 0.002, d: 0.18, peak: 0.35 });
    const box = K.gain(1); K.chain(box, K.filt('bandpass', 700, 2), K.filt('lowpass', 1600), K.gain(3), out);
    K.cloud(box, h + 0.02, h + 0.4, ['pluck', 'key', 'tin'], { density: (x) => 90 * (1 - x) + 4, dur: [0.015, 0.04], rate: [0.7, 1.1], gain: 0.45, pan: [-0.4, 0.4] });
  }, HIT),
  body('trojan-a-break', 'Trojan A (the parcel), part break: the crate splits with a splintering crack, a strap tears, and what it carried spills out across the floor, no longer muffled, bouncing to a stop.', (K) => {
    const out = K.space(K.out, { secs: 1.4, decay: 2.5, damp: 0.55, wet: 0.25 });
    snap(K, out, 0, { peak: 0.5, hp: 2000 }); K.S(out, 0, 'plate-l', { gain: 0.6, rate: 0.85 }); K.S(out, 0, 'punch-h', { gain: 0.8, rate: 0.6 }); K.sub(out, 0, { f0: 85, f1: 30, d: 0.5, peak: 0.8 });
    K.cloud(out, 0.005, 0.12, ['scratch'], { density: 120, dur: [0.01, 0.03], rate: [0.5, 0.8], gain: 0.4, bp: 1800, q: 1.5, pan: [-0.3, 0.3] });
    chopped(K, out, 0.06, 0.2, { rate: 70, f0: 1500, f1: 4000, q: 1.2, peak: 0.2, depth: 0.5, color: 'white' });
    K.cloud(out, 0.1, 1.3, ['pluck', 'key', 'tin'], { density: (x) => 45 * Math.pow(1 - x, 1.5) + 2, dur: [0.02, 0.06], rate: [0.7, 1.2], gain: (x) => 0.35 * (1 - 0.8 * x), lp: 5000, pan: [-0.9, 0.9] });
    pace(0.25, 5, 0.2, 0.7, (t, i) => K.S(out, t, 'soft-m', { gain: 0.35 * Math.pow(0.7, i), rate: 0.9, lp: 1200, pan: 0.4 }));
  }, BREAK),
  // B: the sealed case. It sits still; something inside it knocks, and its latches answer.
  body('trojan-b-idle', 'Trojan B (the sealed case), idle: a closed case sitting still in a dull room; something inside knocks, once or a few times, muffled through the lid, and its loose latches rattle after.', (K) => {
    const out = K.space(K.out, { secs: 1.4, decay: 2.5, damp: 0.6, wet: 0.25 });
    K.bed(out, { color: 'brown', gain: 0.04, nodes: [K.filt('lowpass', 260)] });
    K.bed(out, { color: 'pink', gain: 0.008, nodes: [K.filt('bandpass', 500, 1.5)] });
    const lid = K.gain(1); K.chain(lid, K.filt('lowpass', 1500), K.gain(2), out);
    K.every(0.9, 2.2, (t) => {
      const n = pick([1, 2, 2, 3]); for (let i = 0; i < n; i++) { const k = t + i * rnd(0.13, 0.2); K.S(lid, k, pick(['soft-m', 'soft-h']), { gain: 0.6, rate: rnd(0.8, 1) }); K.blip(lid, k, { f0: 120, f1: 70, glide: 0.04, d: 0.08, peak: 0.08 }); }
      if (Math.random() < 0.7) K.cloud(out, t + 0.05, t + 0.15, ['tin', 'metal-h'], { density: 50, dur: [0.01, 0.03], rate: [0.9, 1.3], gain: 0.22, lp: 3500, hp: 500, pan: [0.1, 0.5] });
    });
  }, LOOP),
  body('trojan-b-attack', 'Trojan B (the sealed case), attack: two latches snap open, the lid flies back, and what was inside strikes: a heavy blow with a short metallic ring.', (K) => {
    const out = K.space(K.out, { secs: 1, decay: 2.5, damp: 0.55, wet: 0.22 });
    K.S(out, 0, 'relay', { gain: 0.5, rate: 0.75, hp: 300, idx: 1 }); K.S(out, 0.045, 'relay', { gain: 0.5, rate: 0.7, hp: 300, idx: 3 });
    K.burst(out, 0.06, { type: 'bandpass', f0: 400, f1: 2500, q: 0.8, glide: 0.06, a: 0.03, d: 0.03, peak: 0.2 });
    const h = 0.11; snap(K, out, h, { peak: 0.35 }); K.S(out, h, 'punch-h', { gain: 0.8, rate: 0.7 }); K.S(out, h, 'plate-h', { gain: 0.35, rate: 0.6, lp: 3000 }); K.sub(out, h, { f0: 100, f1: 38, d: 0.35, peak: 0.75 });
  }, HIT),
  body('trojan-b-break', 'Trojan B (the sealed case), part break: the case bursts its latches with a heavy thump and a breath of trapped air, its lid clatters down, and something small scrabbles out and away.', (K) => {
    const out = K.space(K.out, { secs: 1.4, decay: 2.5, damp: 0.55, wet: 0.25 });
    K.S(out, 0, 'relay', { gain: 0.5, rate: 0.6, idx: 0 }); K.S(out, 0.025, 'relay', { gain: 0.5, rate: 0.55, idx: 2 });
    const h = 0.04; K.S(out, h, 'punch-h', { gain: 0.9, rate: 0.5 }); K.S(out, h, 'soft-h', { gain: 0.6, rate: 0.6 }); K.sub(out, h, { f0: 80, f1: 28, d: 0.6, peak: 0.85 });
    K.burst(out, h, { type: 'highpass', f0: 2500, f1: 1200, glide: 0.5, a: 0.01, d: 0.6, peak: 0.16 });
    pace(0.25, 5, 0.17, 0.72, (t, i) => K.S(out, t, 'plate-h', { gain: 0.4 * Math.pow(0.68, i), rate: 0.55, lp: 2500, pan: -0.3 }));
    K.cloud(out, 0.3, 1.2, ['scratch'], { density: (x) => 30 * (1 - x) + 3, dur: [0.01, 0.03], rate: [1.2, 1.8], gain: (x) => 0.2 * (1 - x), bp: 2000, q: 1.5, pan: [0.2, 0.9] });
  }, BREAK),

  // ---------- Cryptominer: a Rig and its Cooler. Hashing hardware, heat. ----------
  // A: the fans. Two case fans at different speeds, and coil whine chattering with the hash load.
  body('cryptominer-a-idle', 'Cryptominer A (the fans), idle: two case fans at slightly different speeds beating against each other, a low airflow, and coil whine chattering faintly in bursts as the rig hashes.', (K) => {
    const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.5, wet: 0.15 });
    for (const [bpf, f, gain, pan] of [[156, 700, 0.12, -0.4], [203, 1100, 0.09, 0.45]]) {
      const am = K.gain(0.6), o = K.lfo(am.gain, bpf, 0.4); K.wander(o.frequency, bpf, bpf * 0.015, 0.1);
      K.bed(am, { color: 'pink', gain, nodes: [K.filt('bandpass', f, 0.7)] }); K.chain(am, K.filt('lowpass', 3500), K.pan(pan), out);
      const t = K.tone(out, { type: 'triangle', f: bpf, gain: gain * 0.08, pan }); K.wander(t.o.frequency, bpf, bpf * 0.015, 0.1);
    }
    K.bed(out, { color: 'pink', gain: 0.02, nodes: [K.filt('lowpass', 400)] });
    K.tone(out, { f: 100, gain: 0.008 });
    const w = K.tone(K.chain(K.filt('bandpass', 3300, 4), out), { f: 3300, gain: 0, pan: 0.15 });
    for (let t = 0; t < K.end;) {
      const on = rnd(0.15, 0.7); w.o.frequency.setValueAtTime(pick([3150, 3320, 3480]), t); w.g.gain.setTargetAtTime(rnd(0.003, 0.006), t, 0.004);
      for (let x = 0.03; x < on; x += rnd(0.03, 0.09)) w.g.gain.setTargetAtTime(Math.random() < 0.3 ? 0 : rnd(0.003, 0.006), t + x, 0.003);
      t += on; w.g.gain.setTargetAtTime(0, t, 0.004); t += rnd(0.1, 0.6);
    }
  }, LOOP),
  body('cryptominer-a-attack', 'Cryptominer A (the fans), attack: the fans surge to full speed in a rush of air while the coil whine stutters upward, then a hard metallic knock lands.', (K) => {
    const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.5, wet: 0.15 });
    chopped(K, out, 0, 0.3, { rate: 120, rate1: 320, f0: 600, f1: 2400, q: 0.8, peak: 0.3, depth: 0.4, a: 0.12 });
    for (let i = 0; i < 6; i++) K.blip(out, i * 0.022, { f0: 2600 + i * 300, f1: 2800 + i * 300, glide: 0.015, a: 0.002, d: 0.015, peak: 0.03, pan: 0.15 });
    const h = 0.15; snap(K, out, h, { peak: 0.4 }); K.S(out, h, 'punch-m', { gain: 0.8, rate: 0.8 }); K.S(out, h, 'metal-h', { gain: 0.4, rate: 0.5, lp: 2800 }); K.sub(out, h, { f0: 110, f1: 40, d: 0.3, peak: 0.75 });
  }, HIT),
  body('cryptominer-a-break', 'Cryptominer A (the fans), part break: a fan seizes: a hard knock, its blades clattering against the guard slower and slower, and its rush of air winding down to nothing.', (K) => {
    const out = K.space(K.out, { secs: 1, decay: 3, damp: 0.5, wet: 0.2 });
    snap(K, out, 0, { peak: 0.5 }); K.S(out, 0, 'punch-h', { gain: 0.85, rate: 0.65 }); K.S(out, 0, 'metal-l', { gain: 0.5, rate: 0.6 }); K.sub(out, 0, { f0: 95, f1: 30, d: 0.5, peak: 0.8 });
    chopped(K, out, 0, 1.3, { rate: 200, rate1: 12, f0: 1400, f1: 250, q: 0.8, peak: 0.22, depth: 0.5, a: 0.01 });
    pace(0.03, 16, 0.025, 1.17, (t, i) => K.grain(out, t, pick(['metal-h', 'tin']), { dur: 0.025, rate: 0.75 - i * 0.02, gain: 0.35 * (1 - i / 18), hp: 500, pan: 0.2 }));
  }, BREAK),
  // B: the heat. A hot transformer hum, metal ticking as it expands, the liquid cooler's pump and bubbles.
  body('cryptominer-b-idle', 'Cryptominer B (the heat), idle: a hot, saturated transformer hum that swells and sags with the load, metal ticking as it expands, the liquid cooler\'s pump pulsing, and the odd bubble in its loop.', (K) => {
    const out = K.space(K.out, { secs: 1.2, decay: 2.5, damp: 0.55, wet: 0.2 });
    const hum = K.gain(1); K.wander(hum.gain, 0.8, 0.2, 0.25); K.chain(hum, K.shaper(1.6), K.filt('lowpass', 900), out);
    for (const [f, g] of [[100, 0.035], [200, 0.03], [300, 0.02], [500, 0.01], [700, 0.005]]) K.tone(hum, { f, gain: g, detune: rnd(-4, 4) });
    const sh = K.filt('bandpass', 2400, 0.9); K.wander(sh.frequency, 2200, 700, 0.5);
    K.bed(out, { color: 'pink', gain: 0.02, nodes: [sh] });
    const pump = K.gain(0.6); K.lfo(pump.gain, 7, 0.4); K.chain(pump, out);
    K.bed(pump, { color: 'brown', gain: 0.08, nodes: [K.filt('lowpass', 250)] });
    K.every(0.25, 1, (t) => { const f = rnd(260, 480); K.blip(K.chain(K.filt('lowpass', 1300), out), t, { f0: f, f1: f * 1.6, glide: 0.035, a: 0.003, d: 0.045, peak: rnd(0.06, 0.12), pan: rnd(-0.3, 0.3) }); });
    K.every(0.35, 1.5, (t) => K.grain(out, t, 'tin', { dur: 0.03, rate: rnd(0.5, 0.7), gain: rnd(0.15, 0.3), hp: 700, pan: rnd(-0.7, 0.7) }));
  }, LOOP),
  body('cryptominer-b-attack', 'Cryptominer B (the heat), attack: the hum swells and climbs under the load, then arcs: a crackling electric snap and a hot buzz that dies away fast.', (K) => {
    const out = K.space(K.out, { secs: 0.9, decay: 2.5, damp: 0.5, wet: 0.18 });
    coil(K, out, 0, 0.12, { f0: 100, f1: 140, peak: 0.12, drive: 4, lp: 1200, a: 0.1 });
    const h = 0.12; snap(K, out, h, { peak: 0.45, hp: 2500 }); K.S(out, h, 'punch-h', { gain: 0.75, rate: 0.7 }); K.sub(out, h, { f0: 100, f1: 35, d: 0.3, peak: 0.75 });
    const zap = K.gain(1); K.chain(zap, K.gain(6), K.crush(5), K.gain(0.12), K.filt('highpass', 1200), out);
    for (let x = 0; x < 0.2; x += rnd(0.008, 0.03)) K.burst(zap, h + x, { type: 'highpass', f0: 1800, a: 0.0005, d: rnd(0.004, 0.015), peak: rnd(0.3, 1) * (1 - x * 4) });
    coil(K, out, h, 0.35, { f0: 140, f1: 90, peak: 0.25, drive: 5, lp: 1800 });
  }, HIT),
  body('cryptominer-b-break', 'Cryptominer B (the heat), part break: a capacitor bursts with a sharp pop, steam vents in a long hiss, the hum sinks in pitch as the power fails, and the metal ticks as it cools.', (K) => {
    const out = K.space(K.out, { secs: 1.2, decay: 2.5, damp: 0.5, wet: 0.22 });
    snap(K, out, 0, { peak: 0.6, hp: 2000, d: 0.02 }); K.S(out, 0, 'punch-m', { gain: 0.8, rate: 1.1 }); K.S(out, 0, 'punch-h', { gain: 0.6, rate: 0.55 }); K.sub(out, 0, { f0: 90, f1: 28, d: 0.6, peak: 0.85 });
    K.burst(out, 0.01, { type: 'highpass', f0: 3500, f1: 1400, glide: 1, a: 0.01, d: 1.1, peak: 0.16 });
    const hum = K.gain(1); K.chain(hum, K.shaper(2), K.filt('lowpass', 800), out);
    for (const [f, p] of [[100, 0.18], [200, 0.09], [300, 0.05]]) K.blip(hum, 0, { f0: f, f1: f * 0.35, glide: 1.1, a: 0.01, hold: 0.3, d: 0.9, peak: p });
    for (const t of [0.55, 0.8, 1.02, 1.2]) K.grain(out, t, 'tin', { dur: 0.03, rate: rnd(0.5, 0.65), gain: 0.25, hp: 700, pan: rnd(-0.6, 0.6) });
  }, BREAK),

  // ---------- Wiper: destroys data. ----------
  // A: the degausser. A mains coil swelling past in slow sweeps, magnetic crackle, a deep metallic bloom.
  body('wiper-a-idle', 'Wiper A (the degausser), idle: a big mains coil swelling past in slow sweeps from one side to the other, beating as it goes, with a faint magnetic crackle and a deep metal bloom at each pass.', (K) => {
    const out = K.space(K.out, { secs: 1.6, decay: 2.5, damp: 0.5, wet: 0.28 });
    const sweep = K.gain(0.5), p = K.pan(0); K.lfo(sweep.gain, 1 / 3, 0.45); K.lfo(p.pan, 1 / 6, 0.7);
    K.chain(sweep, K.shaper(2.5), K.filt('lowpass', 1100), K.gain(0.5), p, out);
    for (const [f, g] of [[60, 0.06], [60.5, 0.05], [120, 0.02]]) K.tone(sweep, { type: 'sawtooth', f, gain: g });
    K.tone(out, { f: 30, gain: 0.01 });
    K.every(0.04, 0.35, (t) => K.burst(out, t, { type: 'highpass', f0: 3500, a: 0.0005, d: rnd(0.002, 0.006), peak: rnd(0.03, 0.09), pan: rnd(-0.8, 0.8) }));
    for (let t = 0.75; t < K.end; t += 3) K.S(out, t, 'plate-l', { gain: 0.25, rate: 0.3, lp: 700, idx: 1 });
  }, { len: 6, pre: 6, xfade: 0.5 }),
  body('wiper-a-attack', 'Wiper A (the degausser), attack: the coil fires like an old monitor degaussing: a deep "thoom" with a buzzing ring that wobbles and dies, and a low steel bloom.', (K) => {
    const out = K.space(K.out, { secs: 1.2, decay: 2.5, damp: 0.5, wet: 0.25 });
    const h = 0.03; K.burst(out, 0, { type: 'bandpass', f0: 300, f1: 900, q: 1, glide: 0.03, a: 0.025, d: 0.02, peak: 0.15 });
    const wob = K.gain(1); K.lfo(wob.gain, 11, 0.35); K.chain(wob, out);
    coil(K, wob, h, 0.75, { f0: 64, f1: 56, peak: 0.45, drive: 4, lp: 900 });
    K.S(out, h, 'punch-h', { gain: 0.7, rate: 0.55, lp: 1500 }); K.S(out, h, 'plate-h', { gain: 0.4, rate: 0.35, lp: 1800 }); K.sub(out, h, { f0: 75, f1: 32, d: 0.45, peak: 0.85 });
  }, HIT),
  body('wiper-a-break', 'Wiper A (the degausser), part break: the coil collapses: its buzz drops away in pitch through a burst of magnetic crackle, a falling zip of static, and a sub sinking out.', (K) => {
    const out = K.space(K.out, { secs: 1.4, decay: 2.5, damp: 0.5, wet: 0.3 });
    snap(K, out, 0, { peak: 0.45 }); K.S(out, 0, 'punch-h', { gain: 0.8, rate: 0.5 }); K.S(out, 0, 'subdrop', { gain: 0.6, rate: 0.85 }); K.sub(out, 0, { f0: 80, f1: 25, d: 0.7, peak: 0.8 });
    coil(K, out, 0, 1.2, { f0: 62, f1: 22, peak: 0.3, drive: 5, lp: 800 });
    K.burst(out, 0.01, { type: 'bandpass', f0: 4500, f1: 200, q: 2, glide: 0.6, a: 0.005, d: 0.6, peak: 0.25 });
    for (let x = 0; x < 1; x += rnd(0.006, 0.05) * (1 + 4 * x)) K.burst(out, x, { type: 'highpass', f0: 3000, a: 0.0005, d: rnd(0.002, 0.008), peak: rnd(0.08, 0.2) * (1 - x), pan: rnd(-0.9, 0.9) });
  }, BREAK),
  // B: the shredder. A soft hiss, and passes of a grinding cross-cut shredder chewing through the media.
  body('wiper-b-idle', 'Wiper B (the shredder), idle: a low airy hiss, and every few seconds a soft grinding pass of a cross-cut shredder chewing through media, its teeth rasping, the scraps crunching, drifting from side to side.', (K) => {
    const out = K.space(K.out, { secs: 1, decay: 3, damp: 0.5, wet: 0.16 });
    K.bed(out, { color: 'pink', gain: 0.03, nodes: [K.filt('bandpass', 3000, 0.5)] });
    K.bed(out, { color: 'brown', gain: 0.02, nodes: [K.filt('lowpass', 300)] });
    for (let c = 0; c < K.end; c += 6) for (const [s, d, pan] of [[0.4, 1.9, -0.45], [3.3, 2.2, 0.45]]) {
      chopped(K, out, c + s, d, { rate: 38, f0: 1600, f1: 2100, q: 1.3, peak: 0.2, depth: 0.5, a: 0.25, pan });
      K.cloud(out, c + s + 0.1, c + s + d - 0.2, ['scratch'], { density: 40, dur: [0.02, 0.05], rate: [0.8, 1.3], gain: 0.25, bp: 2500, q: 1.2, pan: [pan - 0.3, pan + 0.3] });
    }
  }, CYCLE),
  body('wiper-b-attack', 'Wiper B (the shredder), attack: a fast tearing rip down through the hiss, a dull blow, and then nothing: the sound cut off clean, as if erased.', (K) => {
    const out = K.space(K.out, { secs: 0.7, decay: 3, damp: 0.5, wet: 0.12 });
    chopped(K, out, 0, 0.17, { rate: 60, f0: 6000, f1: 500, q: 1, peak: 0.35, depth: 0.5, a: 0.01, color: 'white' });
    K.cloud(out, 0, 0.16, ['scratch'], { density: 150, dur: [0.01, 0.03], rate: [0.9, 1.4], gain: 0.3, bp: 2500, q: 1, pan: [-0.3, 0.3] });
    const h = 0.17; K.S(out, h, 'soft-h', { gain: 0.9, rate: 0.6 }); K.S(out, h, 'punch-m', { gain: 0.5, rate: 0.65, lp: 1400 }); K.sub(out, h, { f0: 95, f1: 35, d: 0.3, peak: 0.8 });
  }, HIT),
  body('wiper-b-break', 'Wiper B (the shredder), part break: the shredder jams: its teeth grind slower against something they can\'t cut, a hard crunch, a spray of scraps, and the motor cuts out.', (K) => {
    const out = K.space(K.out, { secs: 1.2, decay: 3, damp: 0.5, wet: 0.2 });
    snap(K, out, 0, { peak: 0.5 }); K.S(out, 0, 'mining', { gain: 0.65, rate: 0.6 }); K.S(out, 0, 'punch-h', { gain: 0.75, rate: 0.6 }); K.sub(out, 0, { f0: 90, f1: 28, d: 0.55, peak: 0.85 });
    chopped(K, out, 0, 0.8, { rate: 40, rate1: 7, f0: 2000, f1: 600, q: 1.2, peak: 0.25, depth: 0.55, a: 0.005 });
    K.cloud(out, 0.02, 1.2, ['scratch', 'tin'], { density: (x) => 70 * Math.pow(1 - x, 2) + 2, dur: [0.01, 0.04], rate: [0.7, 1.3], gain: (x) => 0.3 * (1 - x), bp: 3000, q: 0.8, pan: [-0.9, 0.9] });
  }, BREAK),

  // ---------- Exfil: a runner smuggling an archive out. ----------
  // A: the courier on foot. Quick skittering runs across the room, and upload chirps squirting out down a line.
  body('exfil-a-idle', 'Exfil A (the runner), idle: quick, light skittering runs darting across the room and stopping, and short upload chirps squirting out down a narrow phone-line band, as if it\'s sending while it runs.', (K) => {
    const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.45, wet: 0.15 });
    K.bed(out, { color: 'white', gain: 0.0015, nodes: [K.filt('bandpass', 2000, 0.6)] });
    const line = K.gain(1); K.chain(line, K.filt('highpass', 400), K.filt('lowpass', 3200), K.gain(10), K.crush(24), K.gain(0.1), out);
    for (let t = rnd(0, 0.5); t < K.end;) { const d = rnd(0.5, 1.4), p = rnd(-0.8, 0.8); scurry(K, out, t, d, { p0: p, p1: Math.max(-0.9, Math.min(0.9, -p + rnd(-0.2, 0.2))), peak: 0.05 }); t += d + rnd(0.3, 0.9); }
    K.every(0.6, 1.5, (t) => { const n = Math.floor(rnd(3, 7)), base = rnd(1000, 1400); for (let i = 0; i < n; i++) { const f = base * pick([1, 1.25, 1.5, 1.75, 2]); K.blip(line, t + i * 0.03, { type: 'triangle', f0: f, f1: f * 1.15, glide: 0.022, a: 0.002, d: 0.022, peak: 0.03, pan: rnd(-0.3, 0.3) }); } });
  }, LOOP),
  body('exfil-a-attack', 'Exfil A (the runner), attack: a quick volley of chirps climbing up the line and a light, snappy hit, fast in and gone.', (K) => {
    const out = K.space(K.out, { secs: 0.7, decay: 3, damp: 0.45, wet: 0.14 });
    const line = K.gain(1); K.chain(line, K.filt('highpass', 400), K.filt('lowpass', 3400), K.gain(4), K.crush(24), K.gain(0.25), out);
    for (let i = 0; i < 7; i++) K.blip(line, i * 0.017, { type: 'triangle', f0: 900 * Math.pow(1.17, i), f1: 1000 * Math.pow(1.17, i), glide: 0.014, a: 0.001, d: 0.016, peak: 0.12 });
    const h = 0.12; snap(K, out, h, { peak: 0.4, hp: 3500 }); K.S(out, h, 'punch-m', { gain: 0.75, rate: 1.05 }); K.S(out, h, 'click', { gain: 0.4, rate: 0.8 }); K.sub(out, h, { f0: 130, f1: 50, d: 0.2, peak: 0.65 });
    scurry(K, out, h + 0.05, 0.25, { p0: 0, p1: 0.8, peak: 0.08, fade: true });
  }, HIT),
  body('exfil-a-break', 'Exfil A (the runner), part break: the line drops: a chirp falls away through crushed static that cuts out, a hit, and the runner\'s feet scattering off into the corners.', (K) => {
    const out = K.space(K.out, { secs: 1, decay: 3, damp: 0.45, wet: 0.2 });
    const line = K.gain(1); K.chain(line, K.filt('highpass', 300), K.filt('lowpass', 3400), K.gain(4), K.crush(10), K.gain(0.25), out);
    K.blip(line, 0, { type: 'triangle', f0: 2400, f1: 250, glide: 0.45, a: 0.002, hold: 0.2, d: 0.25, peak: 0.12 });
    K.burst(line, 0.01, { type: 'bandpass', f0: 2000, q: 0.5, a: 0.002, hold: 0.22, d: 0.01, peak: 0.25, color: 'white' });
    snap(K, out, 0, { peak: 0.45 }); K.S(out, 0, 'punch-m', { gain: 0.8, rate: 0.8 }); K.S(out, 0, 'glass-l', { gain: 0.35, rate: 0.9 }); K.sub(out, 0, { f0: 100, f1: 35, d: 0.4, peak: 0.8 });
    scurry(K, out, 0.25, 0.9, { p0: -0.2, p1: -0.95, peak: 0.07, period: 0.13, fade: true });
    scurry(K, out, 0.3, 0.9, { p0: 0.2, p1: 0.95, peak: 0.06, period: 0.15, fade: true });
  }, BREAK),
  // B: the reel. Tape spooling out at fast-forward, its chatter squealing, the runner darting past in a doppler rush.
  body('exfil-b-idle', 'Exfil B (the spool), idle: a tape reel running at fast-forward, its motor whirring and fluttering, the sped-up data squealing faintly off the heads, and something darting past in a quick rush every few seconds.', (K) => {
    const out = K.space(K.out, { secs: 1, decay: 3, damp: 0.5, wet: 0.2 });
    const fl = K.gain(0.7); K.lfo(fl.gain, 11, 0.25); K.chain(fl, out);
    K.bed(fl, { color: 'pink', gain: 0.06, nodes: [K.filt('highpass', 700), K.filt('bandpass', 1500, 2)] });
    const m = K.tone(K.chain(K.filt('lowpass', 900), fl), { type: 'triangle', f: 220, gain: 0.02 }); K.wander(m.o.frequency, 225, 12, 0.3); K.lfo(m.o.detune, 9, 15);
    const sq = K.gain(1); K.chain(sq, K.filt('bandpass', 1800, 1.5), out);
    for (let t = 0; t < K.end;) { const d = rnd(0.4, 1.2); K.cloud(sq, t, t + d, ['glitch', 'key'], { density: 35, dur: [0.02, 0.05], rate: [2.2, 3.4], gain: 0.12, pan: [-0.3, 0.3] }); t += d + rnd(0.2, 1); }
    for (let c = 0; c < K.end; c += 6) for (const [s, dir] of [[1.2, 1], [4.1, -1]]) {
      const t = c + s, p = K.pan(-0.85 * dir); ramp(p.pan, -0.85 * dir, 0.85 * dir, t, 0.35); K.chain(p, out);
      K.burst(p, t, { type: 'bandpass', f0: 500, f1: 2200, q: 1, glide: 0.2, a: 0.15, d: 0.2, peak: 0.1 });
    }
  }, { len: 6, pre: 6, xfade: 0.6 }),
  body('exfil-b-attack', 'Exfil B (the spool), attack: a whip-fast rush past you from one side to the other, a snap, and a squeal of tape chatter trailing off.', (K) => {
    const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.5, wet: 0.16 });
    const p = K.pan(-0.85); ramp(p.pan, -0.85, 0.6, 0, 0.14); K.chain(p, out);
    K.burst(p, 0, { type: 'bandpass', f0: 500, f1: 3000, q: 0.9, glide: 0.13, a: 0.11, d: 0.03, peak: 0.3 });
    const h = 0.13; snap(K, out, h, { peak: 0.45, hp: 3500 }); K.S(out, h, 'punch-m', { gain: 0.75, rate: 1.2 }); K.S(out, h, 'tick', { gain: 0.4, rate: 0.8 }); K.sub(out, h, { f0: 120, f1: 45, d: 0.22, peak: 0.65 });
    K.cloud(K.chain(K.filt('bandpass', 1900, 1.5), out), h + 0.01, h + 0.3, ['glitch'], { density: 60, dur: [0.02, 0.04], rate: [2.6, 3.6], gain: (x) => 0.3 * (1 - x), pan: [0.3, 0.8] });
  }, HIT),
  body('exfil-b-break', 'Exfil B (the spool), part break: the tape snaps with a crack, and its loose end slaps against the spinning reel, slower and slower, while the motor winds down.', (K) => {
    const out = K.space(K.out, { secs: 1, decay: 3, damp: 0.5, wet: 0.2 });
    snap(K, out, 0, { peak: 0.55, hp: 2500 }); K.S(out, 0, 'punch-m', { gain: 0.8, rate: 0.9 }); K.S(out, 0, 'soft-h', { gain: 0.5, rate: 0.9 }); K.sub(out, 0, { f0: 110, f1: 35, d: 0.35, peak: 0.75 });
    K.burst(out, 0.01, { type: 'bandpass', f0: 1200, f1: 4000, q: 1.2, glide: 0.07, a: 0.003, d: 0.06, peak: 0.25 });
    pace(0.08, 22, 0.028, 1.09, (t, i) => { const k = 1 - i / 24; K.burst(out, t, { type: 'lowpass', f0: 2600, a: 0.0006, d: 0.014, peak: 0.28 * k, pan: 0.25 }); K.blip(out, t, { f0: 320, f1: 200, glide: 0.012, a: 0.0006, d: 0.018, peak: 0.12 * k, pan: 0.25 }); });
    motor(K, out, 0, 1.3, { f0: 230, f1: 45, peak: 0.07, bp: 700, q: 1, a: 0.01 });
  }, BREAK),

  // ---------- Crawler: a brood mother and her fragments. ----------
  // A: the brood. A wet, breathing body, a sac pulsing, a soft rustle of many small legs, a membrane creaking.
  body('crawler-a-idle', 'Crawler A (the brood), idle: a big soft body breathing in a dark wet room, an egg sac pulsing with a slow double beat, a soft rustle of many small legs moving over it, and its membrane creaking as it stretches.', (K) => {
    const out = K.space(K.out, { secs: 1.8, decay: 2.5, damp: 0.65, wet: 0.32 });
    const br = K.gain(0.5); K.lfo(br.gain, 1 / 3, 0.4); K.chain(br, out);
    K.bed(br, { color: 'brown', gain: 0.06, nodes: [K.filt('lowpass', 380)] });
    for (let t = 0.2; t < K.end; t += 1.5) for (const [dt, g] of [[0, 0.3], [0.22, 0.2]]) { K.S(out, t + dt, 'soft-m', { gain: g, rate: 0.45, lp: 380, jitter: 0 }); K.blip(out, t + dt, { f0: 70, f1: 42, glide: 0.08, d: 0.14, peak: g * 0.2 }); }
    const legs = K.gain(0.5); K.lfo(legs.gain, 1 / 2, 0.4); K.chain(legs, K.filt('lowpass', 2600), out);
    K.cloud(legs, 0, K.end, ['scratch', 'soft-m'], { density: 70, dur: [0.008, 0.025], rate: [1.5, 2.5], gain: 0.6, pan: [-0.8, 0.8] });
    K.every(1.2, 2.8, (t) => K.growl(K.chain(K.filt('bandpass', 650, 5), out), t, { f0: rnd(24, 34), f1: rnd(20, 28), dur: rnd(0.3, 0.55), vowels: ['u', 'o', 'u'], drive: 2, peak: 0.1, a: 0.08, pan: rnd(-0.5, 0.5) }));
  }, LOOP),
  body('crawler-a-attack', 'Crawler A (the brood), attack: a sharp breathy hiss, then a heavy, wet, low stab with a sticky tail.', (K) => {
    const out = K.space(K.out, { secs: 1.2, decay: 2.5, damp: 0.6, wet: 0.25 });
    K.burst(out, 0, { type: 'highpass', f0: 2800, f1: 3800, glide: 0.12, a: 0.09, d: 0.03, peak: 0.22, color: 'pink' });
    K.cloud(K.chain(K.filt('lowpass', 2000), out), 0, 0.13, ['scratch'], { density: (x) => 60 + 200 * x, dur: [0.008, 0.02], rate: [1.6, 2.4], gain: 0.25, pan: [-0.5, 0.5] });
    const h = 0.12; K.S(out, h, 'punch-h', { gain: 0.9, rate: 0.45 }); K.S(out, h, 'soft-m', { gain: 0.7, rate: 0.5 }); K.sub(out, h, { f0: 70, f1: 30, d: 0.4, peak: 0.85 });
    K.burst(out, h + 0.01, { type: 'bandpass', f0: 260, f1: 180, q: 3, glide: 0.3, a: 0.01, d: 0.32, peak: 0.4 });
  }, HIT),
  body('crawler-a-break', 'Crawler A (the brood), part break: an egg sac bursts with a wet pop, its membrane tears, and a brood of tiny legs pours out and scatters to both sides.', (K) => {
    const out = K.space(K.out, { secs: 1.4, decay: 2.5, damp: 0.6, wet: 0.3 });
    K.blip(out, 0, { f0: 190, f1: 55, glide: 0.06, a: 0.002, d: 0.12, peak: 0.6 }); K.S(out, 0, 'soft-h', { gain: 0.8, rate: 0.8 }); K.S(out, 0, 'punch-h', { gain: 0.55, rate: 0.5 }); K.sub(out, 0, { f0: 80, f1: 28, d: 0.55, peak: 0.8 });
    K.burst(out, 0, { type: 'lowpass', f0: 1400, f1: 300, glide: 0.1, a: 0.002, d: 0.12, peak: 0.45 });
    chopped(K, out, 0.04, 0.28, { rate: 45, f0: 400, f1: 1600, q: 2, peak: 0.25, depth: 0.5, a: 0.01 });
    for (const [p0, p1, s] of [[-0.1, -0.9, 0.2], [0.1, 0.9, 0.24], [0, -0.6, 0.32], [0, 0.6, 0.36]]) scurry(K, K.chain(K.filt('lowpass', 2600), out), s, 0.9, { p0, p1, peak: 0.08, f: 1500, period: 0.12, fade: true });
  }, BREAK),
  // B: in the duct. Many small metal legs walking a hollow steel duct in gait groups, an eggshell ticking.
  body('crawler-b-idle', 'Crawler B (in the duct), idle: something with many small metal legs walking a hollow steel duct, its steps landing in quick ripples that ring the metal, wandering, pausing, moving on, with the odd tick of a shell.', (K) => {
    const out = K.space(K.out, { secs: 1.2, decay: 2.5, damp: 0.5, wet: 0.2 });
    const duct = K.delay(out, { time: 0.0061, fb: 0.62, wet: 0.6, lp: 3200 });
    K.bed(out, { color: 'pink', gain: 0.008, nodes: [K.filt('lowpass', 500)] });
    const walk = K.pan(0); K.wander(walk.pan, 0, 0.75, 0.3); K.chain(walk, duct);
    for (let t = rnd(0, 0.4); t < K.end;) {
      const d = rnd(1, 2.4); for (let s = t; s < t + d; s += rnd(0.1, 0.17)) for (let i = 0; i < 4; i++) K.grain(walk, s + i * rnd(0.012, 0.022), pick(['tin', 'metal-h']), { dur: 0.02, rate: rnd(1, 1.5), gain: rnd(0.15, 0.3), hp: 600 });
      t += d + rnd(0.3, 1.1);
    }
    K.every(1, 2.5, (t) => K.grain(duct, t, 'glass-l', { dur: 0.03, rate: rnd(0.6, 0.8), gain: 0.1, pan: rnd(-0.6, 0.6) }));
  }, LOOP),
  body('crawler-b-attack', 'Crawler B (in the duct), attack: a scuttling rush along the duct towards you, and a hollow metallic boom as it strikes.', (K) => {
    const out = K.space(K.out, { secs: 1, decay: 2.5, damp: 0.5, wet: 0.2 });
    const duct = K.delay(out, { time: 0.0061, fb: 0.62, wet: 0.6, lp: 3200 });
    const p = K.pan(-0.8); ramp(p.pan, -0.8, 0, 0, 0.14); K.chain(p, duct);
    for (let s = 0; s < 0.14; s += 0.035) for (let i = 0; i < 4; i++) K.grain(p, s + i * 0.008, pick(['tin', 'metal-h']), { dur: 0.018, rate: rnd(1, 1.4), gain: 0.25 * (0.5 + s * 4), hp: 600 });
    const h = 0.15; K.S(duct, h, 'plate-l', { gain: 0.5, rate: 0.5 }); K.S(out, h, 'punch-h', { gain: 0.8, rate: 0.7 }); K.sub(out, h, { f0: 105, f1: 38, d: 0.35, peak: 0.8 }); snap(K, out, h, { peak: 0.3 });
  }, HIT),
  body('crawler-b-break', 'Crawler B (in the duct), part break: a shell cracks open against the steel, and a dozen small fragments scuttle out of it in every direction, ringing the duct as they go.', (K) => {
    const out = K.space(K.out, { secs: 1.2, decay: 2.5, damp: 0.5, wet: 0.24 });
    const duct = K.delay(out, { time: 0.0061, fb: 0.6, wet: 0.55, lp: 3200 });
    snap(K, out, 0, { peak: 0.5 }); K.S(out, 0, 'glass-l', { gain: 0.6, rate: 0.6 }); K.S(out, 0, 'punch-m', { gain: 0.7, rate: 0.7 }); K.S(duct, 0, 'plate-h', { gain: 0.4, rate: 0.5 }); K.sub(out, 0, { f0: 90, f1: 30, d: 0.5, peak: 0.8 });
    for (let k = 0; k < 6; k++) {
      const p0 = rnd(-0.2, 0.2), p1 = (k % 2 ? 1 : -1) * rnd(0.5, 1), s0 = 0.12 + k * 0.05, p = K.pan(p0); ramp(p.pan, p0, p1, s0, 0.8); K.chain(p, duct);
      for (let s = s0; s < s0 + 0.8; s += rnd(0.08, 0.13)) for (let i = 0; i < 3; i++) K.grain(p, s + i * 0.012, pick(['tin', 'metal-h']), { dur: 0.018, rate: rnd(1.2, 1.7), gain: 0.18 * (1 - (s - s0) / 0.85), hp: 700 });
    }
  }, BREAK),

  // ---------- ICE: every guard and hunter, one shared set. Corporate security: cold, authoritative, scanning. ----------
  // A: the scanner. A raster line sweeping across the room, back and forth, over a cold low air.
  body('ice-a-idle', 'ICE A (the scanner), idle: a fine scanning raster line sweeping across the room, left to right and back, each pass ending in a small precise tick, over a cold, still air and a deep, steady sub.', (K) => {
    const out = K.space(K.out, { secs: 3, decay: 2, damp: 0.3, wet: 0.32 });
    K.tone(out, { f: 41.2, gain: 0.005 });
    K.bed(out, { color: 'pink', gain: 0.012, nodes: [K.filt('highpass', 4500)] });
    K.bed(out, { color: 'pink', gain: 0.02, nodes: [K.filt('bandpass', 190, 9)] });
    for (let c = 0; c < K.end; c += 6) for (const [s, dir] of [[0.4, 1], [3.4, -1]]) {
      raster(K, out, c + s, 1.6, { p0: -0.8 * dir, p1: 0.8 * dir, peak: 0.16 });
      K.S(out, c + s + 1.6, 'tick', { gain: 0.06, rate: 0.7, hp: 800, pan: 0.8 * dir, jitter: 0 });
    }
  }, CYCLE),
  body('ice-a-attack', 'ICE A (the scanner), attack: a quick raster sweep locks on, and a magnetic lock slams: a hard, clean steel strike with a cold ring in a big room.', (K) => {
    const out = K.space(K.out, { secs: 1.6, decay: 2, damp: 0.3, wet: 0.28 });
    raster(K, out, 0, 0.14, { b0: 1500, b1: 4500, p0: -0.3, p1: 0.3, peak: 0.2, q: 4 });
    const h = 0.13; K.S(out, h, 'relay', { gain: 0.6, rate: 0.5, idx: 4 }); K.S(out, h, 'punch-h', { gain: 0.8, rate: 0.8 }); K.S(out, h, 'plate-h', { gain: 0.4, rate: 0.75, lp: 4000 }); K.sub(out, h, { f0: 110, f1: 40, d: 0.3, peak: 0.75 });
    K.blip(out, h, { f0: 1318, a: 0.002, d: 0.5, peak: 0.03 });
  }, HIT),
  body('ice-a-break', 'ICE A (the scanner), part break: the scanner fails: its raster stutters into crushed steps falling in pitch, a lens cracks, and the low sub drops out.', (K) => {
    const out = K.space(K.out, { secs: 1.6, decay: 2, damp: 0.3, wet: 0.3 });
    snap(K, out, 0, { peak: 0.45 }); K.S(out, 0, 'glass-l', { gain: 0.55, rate: 0.8 }); K.S(out, 0, 'punch-h', { gain: 0.75, rate: 0.7 }); K.sub(out, 0, { f0: 85, f1: 26, d: 0.6, peak: 0.8 });
    const cr = K.gain(1); K.chain(cr, K.gain(5), K.crush(6), K.gain(0.2), out);
    for (let i = 0; i < 7; i++) raster(K, cr, 0.05 + i * 0.1, 0.07, { f: 120 * Math.pow(0.85, i), b0: 3000 * Math.pow(0.8, i), b1: 2600 * Math.pow(0.8, i), q: 3, peak: 0.18 * (1 - i / 9), p0: 0, p1: 0 });
    K.blip(out, 0, { f0: 82, f1: 30, glide: 0.8, a: 0.005, d: 0.9, peak: 0.2 });
  }, BREAK),
  // B: the cameras. Surveillance servos turning, a cold read chirp, and a slow, deep security pulse.
  body('ice-b-idle', 'ICE B (the cameras), idle: surveillance cameras turning on their servos around the room, each stopping with a small click, a cold short read chirp now and then with a faint echo, and a slow, deep pulse under it all.', (K) => {
    const out = K.space(K.out, { secs: 2.2, decay: 2.2, damp: 0.35, wet: 0.3 });
    const pulse = K.gain(0.5); K.lfo(pulse.gain, 2 / 3, 0.45); K.chain(pulse, out);
    K.tone(pulse, { f: 45, gain: 0.012 }); K.tone(pulse, { f: 90, gain: 0.006 });
    K.bed(out, { color: 'pink', gain: 0.01, nodes: [K.filt('highpass', 5000)] });
    K.every(1, 2.4, (t) => { const d = rnd(0.25, 0.55), pan = rnd(-0.8, 0.8), f = rnd(160, 220); motor(K, out, t, d, { f0: f, f1: f * rnd(1.2, 1.5), peak: 0.04, pan, bp: rnd(800, 1100) }); K.S(out, t + d, 'tick', { gain: 0.1, rate: 1.2, hp: 1000, pan }); });
    const echo = K.delay(out, { time: 0.31, fb: 0.35, wet: 0.5, lp: 3000 });
    K.every(2.2, 3.6, (t) => K.blip(echo, t, { f0: 2400, f1: 1600, glide: 0.07, a: 0.002, d: 0.08, peak: 0.012, pan: rnd(-0.5, 0.5) }));
  }, LOOP),
  body('ice-b-attack', 'ICE B (the cameras), attack: a camera whips round on its servo and stops dead, and a heavy strike lands under a short, cold, dissonant sting.', (K) => {
    const out = K.space(K.out, { secs: 1.4, decay: 2.2, damp: 0.35, wet: 0.25 });
    motor(K, out, 0, 0.11, { f0: 200, f1: 420, peak: 0.12, bp: 1100, a: 0.01 });
    const h = 0.11; K.S(out, h, 'tick', { gain: 0.5, rate: 1, hp: 800 }); K.S(out, h, 'punch-h', { gain: 0.85, rate: 0.65 }); K.S(out, h, 'metal-l', { gain: 0.45, rate: 0.7 }); K.sub(out, h, { f0: 100, f1: 36, d: 0.35, peak: 0.8 });
    const st = K.gain(1); K.chain(st, K.filt('lowpass', 2200), out);
    for (const f of [440, 466.2]) K.blip(st, h, { type: 'square', f0: f, a: 0.003, hold: 0.05, d: 0.25, peak: 0.025 });
  }, HIT),
  body('ice-b-break', 'ICE B (the cameras), part break: a camera\'s servo grinds and stutters down, its lens cracks, and a few sparks scatter off the housing.', (K) => {
    const out = K.space(K.out, { secs: 1.4, decay: 2.2, damp: 0.35, wet: 0.28 });
    snap(K, out, 0, { peak: 0.5 }); K.S(out, 0, 'glass-h', { gain: 0.5, rate: 0.7 }); K.S(out, 0, 'punch-m', { gain: 0.8, rate: 0.75 }); K.sub(out, 0, { f0: 95, f1: 30, d: 0.5, peak: 0.8 });
    const gate = K.gain(1); K.chain(gate, out); for (let x = 0.05; x < 1; x += rnd(0.04, 0.09)) { gate.gain.setValueAtTime(Math.random() < 0.35 ? 0.1 : 1, x); }
    motor(K, gate, 0.02, 1.1, { f0: 260, f1: 50, peak: 0.1, bp: 800, q: 1, a: 0.01 });
    K.cloud(out, 0.05, 0.7, ['tin', 'glass-h'], { density: (x) => 30 * (1 - x) + 2, dur: [0.01, 0.03], rate: [1, 1.5], gain: 0.2, hp: 1500, pan: [-0.9, 0.9] });
  }, BREAK),
];

export const GROUPS3 = { bodies };

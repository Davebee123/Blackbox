// The clips in the preview pack. Each one: where it goes, loop or one-shot, its length, what it
// is meant to evoke (the README line), and a build(K) that schedules everything into K.out.
// Loops render with a pre-roll (so reverbs and beds are full) and a tail that is folded back over
// the head, so the clip loops without a seam.
import { rnd, pick, NOTE, SAMPLES } from './lib.js';

const VOW = { a: [730, 1090, 2440], o: [570, 840, 2410], u: [300, 870, 2240], e: [530, 1840, 2480], i: [270, 2290, 3010] };

// ---------------- shared pieces ----------------
function rain(K, out, { gain = 1, drops = 1, dark = 0 } = {}) {
  const lp = K.filt('lowpass', 5200 - 2500 * dark, 0.5), hp = K.filt('highpass', 300);
  K.bed(out, { color: 'pink', gain: 0.22 * gain, nodes: [hp, lp] });
  K.bed(out, { color: 'white', gain: 0.025 * gain, nodes: [K.filt('bandpass', 7000 - 2000 * dark, 0.6)] });
  // drops on the glass: tiny bright ticks, and the odd fat one
  for (let t = 0; t < K.end; t += rnd(0.006, 0.05) / drops) K.burst(out, t, { type: 'bandpass', f0: rnd(2500, 7500) * (1 - 0.4 * dark), q: rnd(2, 6), a: 0.0006, d: rnd(0.004, 0.02), peak: rnd(0.02, 0.09) * gain, pan: rnd(-0.9, 0.9) });
  for (let t = rnd(0, 1); t < K.end; t += rnd(0.3, 1.4)) K.blip(out, t, { type: 'sine', f0: rnd(900, 1600), f1: rnd(1800, 2600), glide: 0.012, a: 0.001, d: 0.025, peak: 0.035 * gain, pan: rnd(-0.8, 0.8) });
}
// A siren far off down the street (the same shape as soundtrack.mjs, simpler).
function farSiren(K, out, t0, dur, { pan = -0.3, level = 0.03 } = {}) {
  const lp1 = K.filt('lowpass', 800, 0.4), lp2 = K.filt('lowpass', 800, 0.4), env = K.gain(0), p = K.pan(pan);
  K.chain(env, lp1, lp2, p, K.delay(out, { time: 0.23, fb: 0.35, wet: 0.5, lp: 900 }));
  env.gain.setValueAtTime(0.0001, t0); env.gain.exponentialRampToValueAtTime(level, t0 + dur * 0.45); env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  for (const [type, det, lvl] of [['square', 1, 0.5], ['sawtooth', 1.004, 0.35]]) {
    const o = K.ctx.createOscillator(), g = K.gain(lvl); o.type = type;
    o.frequency.setValueAtTime(620 * det, t0);
    for (let x = 0; x < dur; x += 3.4) { o.frequency.linearRampToValueAtTime(1300 * det, t0 + x + 1.5); o.frequency.linearRampToValueAtTime(620 * det, t0 + x + 3.4); }
    o.connect(g).connect(env); o.start(t0); o.stop(t0 + dur + 0.1);
  }
}
function fsk(K, out, t, { dur = 0.4, lo = 1070, hi = 1270, baud = 110, peak = 0.05, pan = 0 } = {}) {
  const o = K.ctx.createOscillator(), bp = K.filt('bandpass', (lo + hi) / 2, 1.4), g = K.gain(0); o.type = 'square';
  const n = Math.round(dur * baud); for (let i = 0; i < n; i++) o.frequency.setValueAtTime(Math.random() < 0.5 ? lo : hi, t + (i * dur) / n);
  K.env(g, t, { a: 0.01, peak, d: 0.03, hold: dur }); K.chain(o, bp, g, K.pan(pan), out); o.start(t); o.stop(t + dur + 0.1);
}
function drip(K, out, t, { f = 1100, peak = 0.25, pan = 0 } = {}) {
  K.blip(out, t, { type: 'sine', f0: f, f1: f * 1.9, glide: 0.018, a: 0.001, d: 0.05, peak, pan });
  K.blip(out, t + 0.012, { type: 'sine', f0: f * 1.9, f1: f * 2.3, glide: 0.04, a: 0.002, d: 0.08, peak: peak * 0.35, pan });
  K.burst(out, t, { type: 'highpass', f0: 5000, a: 0.0005, d: 0.006, peak: peak * 0.3, pan });
}
function chime(K, out, t, midi, { d = 0.9, peak = 0.12, pan = 0 } = {}) {
  K.blip(out, t, { type: 'sine', f0: NOTE(midi), a: 0.004, d, peak, pan });
  K.blip(out, t, { type: 'triangle', f0: NOTE(midi + 12), a: 0.004, d: d * 0.5, peak: peak * 0.2, pan, detune: 4 });
}
// Static: sample-and-hold noise gated into crackles.
function crackle(K, out, t, { dur = 0.3, peak = 0.1, hold = 5, hp = 1200, pan = 0 } = {}) {
  const s = K.ctx.createBufferSource(); s.buffer = K.noiseBuf('white', hold);
  const g = K.gain(0), f = K.filt('highpass', hp);
  g.gain.setValueAtTime(0, t); for (let x = 0; x < dur; x += rnd(0.004, 0.03)) g.gain.setValueAtTime(Math.random() < 0.45 ? peak * rnd(0.3, 1) : 0, t + x);
  g.gain.setValueAtTime(0, t + dur);
  K.chain(s, f, g, K.pan(pan), out); s.start(t, rnd(0, 1)); s.stop(t + dur + 0.05);
}

// ---------------- 1. floors ----------------
const floors = [
  { id: 'floor-1-sprawl-a', len: 20, desc: 'The Sprawl, recorded street: the real city bed (felix.blume, CC0) muffled through glass, synthesized rain on the window, a far horn and a siren passing a few blocks away.',
    build(K) {
      const out = K.space(K.out, { secs: 1.2, decay: 4, damp: 0.5, wet: 0.15 });
      const s = K.ctx.createBufferSource(); s.buffer = SAMPLES.get('city')[0];
      K.chain(s, K.filt('highpass', 90), K.filt('lowpass', 900, 0.4), K.gain(0.9), out); s.start(0, 74);
      rain(K, out, { gain: 0.5 });
      K.S(out, 6.5, 'horn', { gain: 0.25, rate: 0.9, lp: 600, hp: 150, pan: 0.4 });
      farSiren(K, out, 9, 13, { pan: -0.35, level: 0.035 });
    } },
  { id: 'floor-1-sprawl-b', len: 20, desc: 'The Sprawl, all synthesized: heavier rain on glass and gutters, traffic as a low swell of tyres on wet road, a siren far off. Closer and wetter than (a).',
    build(K) {
      const out = K.space(K.out, { secs: 1.5, decay: 4, damp: 0.5, wet: 0.2 });
      rain(K, out, { gain: 1.2, drops: 1.4 });
      // gutter trickle
      const tr = K.bed(out, { color: 'white', gain: 0.03, nodes: [K.filt('bandpass', 1800, 3)] }); K.wander(tr.gain, 0.03, 0.02, 3);
      // cars: brown noise swells, each a tyre hiss passing
      const road = K.bed(out, { color: 'brown', gain: 0.25, nodes: [K.filt('lowpass', 220)] }); K.wander(road.gain, 0.25, 0.1, 0.3);
      K.every(3, 6, (t) => { K.burst(out, t, { type: 'bandpass', f0: 500, f1: 1400, q: 0.8, glide: 1.4, a: 1.2, d: 1.6, peak: 0.07, pan: rnd(-0.7, 0.7), color: 'pink' }); });
      farSiren(K, out, 4, 16, { pan: 0.3, level: 0.03 });
    } },
  { id: 'floor-2-backhaul', len: 20, desc: 'Backhaul: the long cable run. Mains hum and transformer buzz down a concrete duct, banks of relays clicking in bursts up and down the line, faint modem crosstalk bleeding through.',
    build(K) {
      const out = K.space(K.out, { secs: 1.8, decay: 3, damp: 0.45, wet: 0.35, pre: 0.02 });
      const hum = K.gain(1); K.chain(hum, K.filt('lowpass', 600), out);
      for (const [f, g] of [[60, 0.05], [120, 0.04], [180, 0.025], [240, 0.012], [300, 0.008]]) K.tone(hum, { type: 'sine', f, gain: g });
      const buzz = K.tone(K.chain(K.filt('bandpass', 900, 1.5), out), { type: 'sawtooth', f: 120, gain: 0.03 }); K.lfo(buzz.g.gain, 0.15, 0.012);
      K.bed(out, { color: 'pink', gain: 0.03, nodes: [K.filt('bandpass', 1200, 0.8)] });
      K.every(1.2, 2.8, (t) => { const n = 2 + Math.floor(rnd(0, 6)), p = rnd(-0.9, 0.9), r = rnd(0.7, 1.3); for (let i = 0; i < n; i++) K.S(out, t + i * rnd(0.05, 0.13), 'relay', { gain: rnd(0.25, 0.55), rate: r, pan: p + rnd(-0.1, 0.1) }); });
      K.every(5, 9, (t) => fsk(K, K.chain(K.filt('highpass', 600), out), t, { dur: rnd(0.3, 0.8), peak: 0.012, pan: rnd(-0.6, 0.6) }), 3);
    } },
  { id: 'floor-3-stacks', len: 20, desc: 'The Stacks: a warehouse of racks. Fans beating against each other, the thin whine of spinning drives, heads seeking in clusters, and now and then a steel shelf ringing somewhere far down an aisle.',
    build(K) {
      const out = K.space(K.out, { secs: 2.8, decay: 2.5, damp: 0.35, wet: 0.35, pre: 0.03 });
      K.bed(out, { color: 'brown', gain: 0.35, nodes: [K.filt('lowpass', 500)] });
      const air = K.bed(out, { color: 'pink', gain: 0.07, nodes: [K.filt('bandpass', 700, 0.7)] }); K.lfo(air.gain, 0.4, 0.015);
      for (const [f, p] of [[118, -0.5], [121, 0.4], [133, 0]]) K.tone(K.chain(K.filt('lowpass', 400), out), { type: 'triangle', f, gain: 0.025, pan: p });
      K.tone(out, { type: 'sine', f: 6800, gain: 0.0035, pan: -0.3 }); K.tone(out, { type: 'sine', f: 9120, gain: 0.002, pan: 0.4 });
      K.every(0.6, 2.2, (t) => { const n = 2 + Math.floor(rnd(0, 6)), p = rnd(-0.8, 0.8); for (let i = 0; i < n; i++) K.S(out, t + i * rnd(0.03, 0.09), 'click', { gain: 0.16, rate: rnd(0.5, 0.7), lp: 2600, pan: p }); });
      for (const t of [4.5, 13]) { K.S(out, t, 'metal-l', { gain: 0.22, rate: 0.5, lp: 1500, pan: rnd(-0.8, 0.8) }); K.S(out, t + 0.05, 'plate-l', { gain: 0.12, rate: 0.45, lp: 1200 }); }
    } },
  { id: 'floor-4-coldline-a', len: 20, desc: 'Coldline, outside: a thin wind that gusts and howls through grating, metal ticking as it contracts in the cold, and a fine crackle of frost forming.',
    build(K) {
      const out = K.space(K.out, { secs: 2.5, decay: 3, damp: 0.2, wet: 0.3 });
      const w1 = K.filt('bandpass', 500, 1.5), w2 = K.filt('bandpass', 1400, 5), howl = K.filt('bandpass', 880, 25);
      const g1 = K.bed(out, { color: 'pink', gain: 0.35, nodes: [w1] }), g2 = K.bed(out, { color: 'pink', gain: 0.18, nodes: [w2] }), g3 = K.bed(out, { color: 'white', gain: 0.22, nodes: [howl] });
      K.wander(w1.frequency, 520, 180, 0.12); K.wander(w2.frequency, 1500, 500, 0.2); K.wander(howl.frequency, 900, 160, 0.1);
      K.wander(g1.gain, 0.3, 0.2, 0.15); K.wander(g2.gain, 0.15, 0.12, 0.2); K.wander(g3.gain, 0.15, 0.14, 0.1);
      K.every(0.8, 3.5, (t) => { const n = Math.random() < 0.4 ? 2 : 1; for (let i = 0; i < n; i++) K.S(out, t + i * rnd(0.15, 0.4), pick(['tin', 'metal-h']), { gain: rnd(0.05, 0.12), rate: rnd(1.6, 2.4), hp: 1500, pan: rnd(-0.8, 0.8) }); });
      K.every(0.7, 2.5, (t) => { const n = 4 + Math.floor(rnd(0, 12)), p = rnd(-0.9, 0.9); for (let i = 0; i < n; i++) K.burst(out, t + rnd(0, 0.35), { type: 'highpass', f0: rnd(5000, 9000), a: 0.0004, d: rnd(0.002, 0.006), peak: rnd(0.03, 0.09), pan: p }); });
    } },
  { id: 'floor-4-coldline-b', len: 20, desc: 'Coldline, inside cold storage: a refrigeration compressor droning, wind forced through a narrow vent, ice creaking slowly and the frame groaning under it. More enclosed than (a).',
    build(K) {
      const out = K.space(K.out, { secs: 3, decay: 2.5, damp: 0.3, wet: 0.4, pre: 0.02 });
      const comp = K.gain(1); K.chain(comp, K.filt('lowpass', 350), out);
      K.tone(comp, { type: 'sawtooth', f: 49, gain: 0.06 }); K.tone(comp, { type: 'sine', f: 98, gain: 0.05 }); K.tone(comp, { type: 'sine', f: 147.3, gain: 0.02 });
      const vent = K.filt('bandpass', 2200, 8); const vg = K.bed(out, { color: 'white', gain: 0.12, nodes: [vent] }); K.wander(vent.frequency, 2300, 400, 0.15); K.wander(vg.gain, 0.09, 0.07, 0.2);
      K.bed(out, { color: 'pink', gain: 0.06, nodes: [K.filt('lowpass', 900)] });
      K.every(2.5, 5, (t) => K.S(out, t, 'scratch', { gain: 0.18, rate: rnd(0.25, 0.4), lp: 2200, pan: rnd(-0.7, 0.7) }), 1);
      for (const t of [6, 15.5]) K.S(out, t, 'metal-l', { gain: 0.25, rate: 0.3, lp: 900 });
      K.every(1.5, 4, (t) => K.S(out, t, 'tin', { gain: 0.05, rate: rnd(2, 2.6), hp: 2000, pan: rnd(-0.8, 0.8) }));
    } },
  { id: 'floor-5-deep-core', len: 20, desc: 'Deep Core: heat and magnetism. A low furnace rumble, heat-haze shimmer in the highs, a thick detuned magnetic drone that pulses and bends, and electrical arcing now and then.',
    build(K) {
      const out = K.space(K.out, { secs: 3.5, decay: 2.2, damp: 0.5, wet: 0.35, pre: 0.03 });
      K.bed(out, { color: 'brown', gain: 0.6, nodes: [K.filt('lowpass', 140)] });
      const sh = K.bed(out, { color: 'pink', gain: 0.05, nodes: [K.filt('bandpass', 3200, 1.2)] }); K.lfo(sh.gain, 7, 0.02); K.lfo(sh.gain, 11.3, 0.015);
      const mag = K.filt('lowpass', 320, 4), mg = K.gain(1); K.chain(mg, K.shaper(2), mag, K.gain(0.8), out); K.wander(mag.frequency, 320, 140, 0.15);
      for (const det of [-9, 0, 8]) K.tone(mg, { type: 'sawtooth', f: 36.71, detune: det, gain: 0.08 });
      const pulse = K.tone(out, { type: 'sine', f: 73.4, gain: 0.08 }); K.lfo(pulse.g.gain, 0.25, 0.07);
      const ring = K.tone(K.chain(K.filt('bandpass', 440, 2), out), { type: 'square', f: 220, gain: 0.0 }); K.lfo(ring.g.gain, 60, 0.02);
      K.every(3, 7, (t) => { const o = K.ctx.createOscillator(), g = K.gain(0); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(92, t + 2.2); K.env(g, t, { a: 0.8, peak: 0.05, d: 1.6 }); K.chain(o, K.filt('lowpass', 500), g, out); o.start(t); o.stop(t + 2.6); }, 1.5);
      K.every(4, 8, (t) => crackle(K, out, t, { dur: rnd(0.08, 0.25), peak: 0.06, hold: 3, hp: 2500, pan: rnd(-0.8, 0.8) }), 2.5);
    } },
  { id: 'floor-6-kernel-space-a', len: 20, desc: 'Kernel Space, scattered tones: almost nothing. A trace of clean air and a few pure sine notes, far apart, ringing out in a bright empty space. Deliberately mixed quieter than the others.',
    build(K) {
      const out = K.space(K.out, { secs: 4.5, decay: 2, damp: 0.05, wet: 0.5, pre: 0.04 });
      K.bed(out, { color: 'pink', gain: 0.004, nodes: [K.filt('highpass', 2000)] });
      for (const [t, m, p] of [[0.5, 84, -0.4], [4.2, 91, 0.5], [8.6, 86, 0], [12.1, 79, -0.6], [15.8, 96, 0.3], [20.5, 84, -0.4]]) K.blip(out, t, { type: 'sine', f0: NOTE(m), a: 0.25, hold: 0.4, d: 2.5, peak: 0.08, pan: p });
    } },
  { id: 'floor-6-kernel-space-b', len: 20, desc: 'Kernel Space, held tone: one clean sine held like a test signal, a pure fifth fading in and out above it, and a precise tick every two seconds. Sterile and exact.',
    build(K) {
      const out = K.space(K.out, { secs: 3, decay: 2.5, damp: 0.05, wet: 0.3, pre: 0.03 });
      K.tone(out, { type: 'sine', f: 440, gain: 0.05 });
      const fifth = K.tone(out, { type: 'sine', f: 660, gain: 0.02 }); K.lfo(fifth.g.gain, 0.1, 0.02);
      const oct = K.tone(out, { type: 'sine', f: 1760, gain: 0.004, pan: 0.3 }); K.lfo(oct.g.gain, 0.05, 0.004);
      for (let t = 0; t < K.end; t += 2) K.blip(out, t, { type: 'sine', f0: 4000, a: 0.0005, d: 0.006, peak: 0.12 });
    } },
  { id: 'floor-7-the-sink', len: 20, desc: 'The Sink: slow drips into a deep, dark cistern, each with a long echo, two leaks keeping their own time, a faint trickle, and a deep red drone under it all.',
    build(K) {
      const cave = K.space(K.out, { secs: 5, decay: 2.2, damp: 0.6, wet: 0.7, pre: 0.06 }), out = K.delay(cave, { time: 0.41, fb: 0.35, wet: 0.3, lp: 1800 });
      const pad = K.gain(1), lp = K.filt('lowpass', 180, 2); K.chain(pad, lp, K.gain(1), K.out); K.wander(lp.frequency, 190, 70, 0.08);
      for (const [f, g] of [[41.2, 0.09], [61.74, 0.06], [98, 0.04]]) { K.tone(pad, { type: 'sawtooth', f, gain: g, detune: -5 }); K.tone(pad, { type: 'sawtooth', f, gain: g * 0.7, detune: 6 }); }
      const tr = K.bed(cave, { color: 'white', gain: 0.012, nodes: [K.filt('bandpass', 1300, 4)] }); K.wander(tr.gain, 0.012, 0.01, 4);
      for (let t = 0.7; t < K.end; t += 2.6) drip(K, out, t + rnd(-0.03, 0.03), { f: 980, peak: 0.16, pan: -0.4 });
      for (let t = 1.9; t < K.end; t += 3.9) drip(K, out, t, { f: 1350, peak: 0.12, pan: 0.5 });
      K.every(4, 9, (t) => drip(K, out, t, { f: rnd(600, 800), peak: 0.15, pan: rnd(-0.3, 0.3) }));
    } },
  { id: 'floor-8-bedrock-a', len: 20, desc: 'Bedrock, the weight: a huge low drone, crushed so it reads even on a phone, with static crackling through it, radio hiss swelling and the rock settling with a deep thud.',
    build(K) {
      const out = K.space(K.out, { secs: 4, decay: 2, damp: 0.7, wet: 0.4 });
      const dr = K.gain(1), lp = K.filt('lowpass', 260, 3); K.chain(dr, K.shaper(4), lp, K.gain(0.5), out); K.wander(lp.frequency, 260, 80, 0.1);
      for (const [f, det] of [[27.5, 0], [27.5, 11], [55, -7], [82.4, 4]]) K.tone(dr, { type: 'sawtooth', f, detune: det, gain: 0.12 });
      K.tone(out, { type: 'sine', f: 55, gain: 0.08 });
      const hiss = K.bed(out, { color: 'white', gain: 0.03, hold: 2, nodes: [K.filt('bandpass', 2400, 0.8)] }); K.wander(hiss.gain, 0.03, 0.025, 0.25);
      K.every(0.5, 2, (t) => crackle(K, out, t, { dur: rnd(0.05, 0.4), peak: rnd(0.04, 0.1), hold: pick([3, 5, 8]), hp: 1500, pan: rnd(-0.8, 0.8) }));
      for (const t of [5, 15]) { K.S(out, t, 'soft-h', { gain: 0.6, rate: 0.4, lp: 400 }); K.S(out, t, 'subdrop', { gain: 0.5, rate: 0.8 }); }
    } },
  { id: 'floor-8-bedrock-b', len: 20, desc: 'Bedrock, the breathing machine: the drone slowly swells and recedes like something enormous breathing, pitch sagging on each breath, while interference stutters through as if a signal is trying to reach you.',
    build(K) {
      const out = K.space(K.out, { secs: 4.5, decay: 2, damp: 0.7, wet: 0.45 });
      const dr = K.gain(1), lp = K.filt('lowpass', 200, 5), br = K.gain(0.6); K.chain(dr, K.shaper(5), lp, br, out);
      K.lfo(br.gain, 0.1, 0.35); K.lfo(lp.frequency, 0.1, 120);
      for (const [f, det] of [[30.87, 0], [30.87, -14], [46.25, 6], [61.74, 9]]) { const o = K.tone(dr, { type: 'sawtooth', f, detune: det, gain: 0.12 }); K.lfo(o.o.detune, 0.1, 25); }
      K.every(1.5, 4, (t) => { const n = 3 + Math.floor(rnd(0, 8)), p = rnd(-0.7, 0.7), f = rnd(800, 2500); for (let i = 0; i < n; i++) { const at = t + i * rnd(0.04, 0.09); crackle(K, out, at, { dur: rnd(0.02, 0.06), peak: 0.1, hold: 4, hp: 900, pan: p }); if (Math.random() < 0.3) K.blip(out, at, { type: 'square', f0: f, a: 0.001, d: 0.03, peak: 0.015, pan: p }); } });
      K.bed(out, { color: 'white', gain: 0.012, hold: 3, nodes: [K.filt('bandpass', 3000, 1)] });
    } },
];

// ---------------- 2. families ----------------
// A Shepard tone: partials an octave apart sweeping up forever, each fading in at the bottom and out at the top.
function shepard(K, out, { base = 55, oct = 7, period = 6, peak = 0.06, type = 'triangle' } = {}) {
  const D = oct * period, n = 512;
  for (let k = -oct; k * period < K.end; k++) {
    const t0 = k * period, a = Math.max(0, t0), b = Math.min(K.end, t0 + D); if (b - a < 0.05) continue;
    const o = K.ctx.createOscillator(), g = K.gain(0), fc = new Float32Array(n), gc = new Float32Array(n); o.type = type;
    for (let i = 0; i < n; i++) { const x = ((a + ((b - a) * i) / (n - 1)) - t0) / D; fc[i] = base * Math.pow(2, x * oct); gc[i] = peak * Math.exp(-Math.pow((x - 0.5) / 0.18, 2)); }
    o.frequency.setValueCurveAtTime(fc, a, b - a); g.gain.setValueCurveAtTime(gc, a, b - a);
    K.chain(o, g, out); o.start(a); o.stop(b);
  }
}
const families = [
  { id: 'ransomware-loop-a-endless', len: 6, xfade: 1, desc: 'Ransomware, endless rise: a Shepard tone that climbs forever without arriving, pulsing at a tight 6 Hz, with a ticking clock under it. The snowball as a feeling.',
    build(K) {
      const out = K.space(K.out, { secs: 1.2, decay: 3, damp: 0.4, wet: 0.2 });
      const trem = K.gain(0.6); K.lfo(trem.gain, 6, 0.4, { type: 'square' }); K.chain(trem, K.filt('lowpass', 3500), out);
      shepard(K, trem, { base: 55, oct: 7, period: 6, peak: 0.07 });
      for (let t = 0; t < K.end; t += 0.5) K.S(out, t, 'tick', { gain: 0.18, rate: 0.8, jitter: 0 });
    } },
  { id: 'ransomware-loop-b-ramp', len: 6, xfade: 0.08, desc: 'Ransomware, one ramp building: a tone steps up a minor third every 1.5 s while its pulse tightens 2, 4, 6, 8 per second and the filter opens; the loop restarts the ramp. Each stack of the ramp would be one step.',
    build(K) {
      const out = K.space(K.out, { secs: 1, decay: 3, damp: 0.4, wet: 0.18 });
      const cyc = (t0) => {
        const o = K.ctx.createOscillator(), o2 = K.ctx.createOscillator(), lp = K.filt('lowpass', 600, 6), g = K.gain(0); o.type = 'sawtooth'; o2.type = 'square';
        const steps = [[0, 110, 2, 600], [1.5, 130.8, 4, 1100], [3, 155.6, 6, 1900], [4.5, 185, 8, 3200]];
        for (const [dt, f, rate, cut] of steps) {
          o.frequency.setValueAtTime(f, t0 + dt); o2.frequency.setValueAtTime(f * 2.005, t0 + dt); lp.frequency.setValueAtTime(cut, t0 + dt);
          for (let x = 0; x < 1.5; x += 1 / rate) { const at = t0 + dt + x, pk = 0.12 + dt * 0.02; g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(pk, at + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, at + Math.min(0.9 / rate, 0.3)); }
          K.S(out, t0 + dt, 'relay', { gain: 0.4, rate: 0.7 + dt * 0.08 });
        }
        K.chain(o, lp, g, out); o2.connect(lp); o.start(t0); o2.start(t0); o.stop(t0 + 6); o2.stop(t0 + 6);
      };
      for (let t = 0; t < K.end; t += 6) cyc(t);
    } },
  { id: 'ransomware-stack', len: 1.2, shot: true, desc: 'Ransomware one-shot, the ramp stacks: a quick rising whoop that locks with a heavy latch and a tightening buzz.',
    build(K) {
      const out = K.space(K.out, { secs: 1, decay: 3, damp: 0.4, wet: 0.2 });
      K.blip(K.chain(K.filt('lowpass', 2500, 4), out), 0, { type: 'sawtooth', f0: 110, f1: 440, glide: 0.28, a: 0.02, d: 0.3, peak: 0.3 });
      K.S(out, 0.28, 'plate-h', { gain: 0.6, rate: 0.7 }); K.S(out, 0.28, 'relay', { gain: 0.5, rate: 0.7 });
      const g = K.gain(0), o = K.ctx.createOscillator(); o.type = 'square'; o.frequency.value = 220; K.chain(o, K.filt('bandpass', 900, 3), g, out);
      for (let i = 0; i < 10; i++) { const at = 0.32 + i * (0.06 - i * 0.004); g.gain.setValueAtTime(0.12, at); g.gain.setValueAtTime(0, at + 0.012); }
      o.start(0.3); o.stop(1);
    } },
  { id: 'worm-loop-a-multiplying', len: 6, xfade: 0.08, desc: 'Worm, multiplying: one skittering click-stream splits into 2, 4, then 8 fragments, each its own pitch and place in the stereo field, before collapsing back to one as the loop restarts.',
    build(K) {
      const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.3, wet: 0.2 });
      const stream = (t0, t1, pan, f, rate) => { for (let t = t0; t < t1; t += rnd(0.5, 1.5) / rate) { K.blip(out, t, { type: 'square', f0: f * rnd(0.9, 1.1), f1: f * 0.7, glide: 0.01, a: 0.0005, d: 0.008, peak: 0.07, pan }); if (Math.random() < 0.5) K.S(out, t, 'click', { gain: 0.12, rate: rnd(1.6, 2.4), pan }); } };
      for (let c = 0; c < K.end; c += 6) {
        const frags = [[0, 0]]; let gen = 0;
        for (const ts of [1.5, 3, 4.5]) { gen++; const add = frags.map(([p]) => [Math.max(-0.95, Math.min(0.95, p + rnd(-0.6, 0.6))), ts]); frags.push(...add); K.blip(out, c + ts, { type: 'sawtooth', f0: 300, f1: 1400, glide: 0.08, a: 0.005, d: 0.1, peak: 0.05 }); }
        frags.forEach(([p, ts], i) => stream(c + ts, c + 6, p, 1800 + i * 260, 9 + i));
      }
    } },
  { id: 'worm-loop-b-swarm', len: 6, xfade: 1, desc: 'Worm, steady swarm: a constant scatter of dry insect-like clicks and wet little slithers all around you, as a whole infestation rather than a build.',
    build(K) {
      const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.3, wet: 0.2 });
      for (let i = 0; i < 7; i++) { const p = rnd(-0.9, 0.9), f = rnd(1500, 4200); for (let t = rnd(0, 0.3); t < K.end; t += rnd(0.04, 0.22)) { K.blip(out, t, { type: 'square', f0: f, f1: f * 0.6, glide: 0.008, a: 0.0005, d: 0.006, peak: 0.05, pan: p }); if (Math.random() < 0.3) K.S(out, t, 'key', { gain: 0.1, rate: rnd(1.8, 2.6), pan: p }); } }
      K.every(0.6, 1.6, (t) => K.burst(out, t, { type: 'bandpass', f0: 600, f1: 2400, q: 4, glide: 0.15, a: 0.01, d: 0.15, peak: 0.08, pan: rnd(-0.8, 0.8) }));
    } },
  { id: 'worm-spawn', len: 0.9, shot: true, desc: 'Worm one-shot, a fragment spawns: a wet slither, then one click splits into two, then four, flying apart left and right.',
    build(K) {
      const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.3, wet: 0.2 });
      K.burst(out, 0, { type: 'bandpass', f0: 500, f1: 2600, q: 3, glide: 0.16, a: 0.01, d: 0.16, peak: 0.3 }); K.S(out, 0, 'scratch', { gain: 0.3, rate: 0.8, lp: 3000 });
      [[0.16, [0]], [0.26, [-0.4, 0.4]], [0.36, [-0.8, -0.3, 0.3, 0.8]], [0.44, [-0.9, -0.5, 0.5, 0.9]]].forEach(([t, ps], g) => ps.forEach((p, i) => { K.blip(out, t + i * 0.008, { type: 'square', f0: 1600 + g * 500 + i * 120, f1: 1200, glide: 0.01, a: 0.0005, d: 0.012, peak: 0.12, pan: p }); K.S(out, t, 'click', { gain: 0.25, rate: 1.8 + g * 0.2, pan: p }); }));
    } },
  { id: 'ghostroot-loop', len: 6, xfade: 1.5, desc: 'Ghostroot, present: a cold minor pad of detuned voices drifting against each other, swept by a slow phaser, so it never quite sits still.',
    build(K) { ghost(K, false); } },
  { id: 'ghostroot-loop-veiled', len: 6, xfade: 1.5, desc: 'Ghostroot, veiled: the same pad pulled behind a curtain: muffled, detuned further apart, a whispering breath over it. Toggle against the plain loop to hear the shift.',
    build(K) { ghost(K, true); } },
  { id: 'ghostroot-veil', len: 1.4, shot: true, desc: 'Ghostroot one-shot, it veils: a reversed swell that phases inward and is swallowed into a muffled drop.',
    build(K) {
      const out = K.space(K.out, { secs: 1.5, decay: 2.5, damp: 0.5, wet: 0.4 });
      const lp = K.filt('lowpass', 4000, 3); lp.frequency.setValueAtTime(4000, 0.55); lp.frequency.exponentialRampToValueAtTime(350, 0.75); K.chain(lp, out);
      for (const [f, det] of [[293.7, -20], [293.7, 22], [349.2, -12], [440, 15]]) { const o = K.ctx.createOscillator(), g = K.gain(0); o.type = 'sawtooth'; o.frequency.value = f; o.detune.setValueAtTime(det, 0); o.detune.linearRampToValueAtTime(det * 3, 0.7); g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(0.07, 0.55); g.gain.exponentialRampToValueAtTime(0.0001, 1.2); K.chain(o, g, lp); o.start(0); o.stop(1.3); }
      K.burst(out, 0, { type: 'bandpass', f0: 3000, f1: 800, q: 2, glide: 0.6, a: 0.5, d: 0.5, peak: 0.12, color: 'pink' });
      K.blip(out, 0.56, { type: 'sine', f0: 140, f1: 60, glide: 0.3, a: 0.005, d: 0.5, peak: 0.25 });
    } },
];
function ghost(K, veiled) {
  const out = K.space(K.out, { secs: 3, decay: 2.5, damp: veiled ? 0.6 : 0.3, wet: 0.45 });
  const lp = K.filt('lowpass', veiled ? 650 : 3500, 0.7), bus = K.gain(1);
  // a phaser: four allpasses swept together
  let node = bus; const aps = [];
  for (let i = 0; i < 4; i++) { const ap = K.filt('allpass', 600 * (i + 1), 2); node.connect(ap); node = ap; aps.push(ap); }
  const mix = K.gain(1); bus.connect(mix); node.connect(mix); K.chain(mix, lp, out);
  // sweep rate 1/3 Hz: two full sweeps per 6 s loop
  for (const [i, ap] of aps.entries()) K.lfo(ap.frequency, 1 / 3, 400 * (i + 1));
  const spread = veiled ? 28 : 9;
  for (const [f, p] of [[146.8, -0.4], [174.6, 0.4], [220, -0.1], [261.6, 0.3]]) for (const s of [-1, 1]) { const o = K.tone(bus, { type: veiled ? 'triangle' : 'sawtooth', f, detune: s * spread, gain: veiled ? 0.05 : 0.025, pan: p * s }); K.lfo(o.o.detune, 1 / 6, spread * 0.6); }
  if (veiled) { const w = K.filt('bandpass', 1200, 3), wg = K.bed(out, { color: 'pink', gain: 0.05, nodes: [w] }); K.lfo(w.frequency, 1 / 3, 500); K.lfo(wg.gain, 1 / 2, 0.035); }
  else K.tone(out, { type: 'sine', f: 1174.7, gain: 0.008, pan: 0.5 });
}

// ---------------- 3. tells ----------------
const tells = [
  { id: 'tell-charge-a-overcharge', len: 1.3, shot: true, desc: 'Charge (Overcharge), capacitor: a whine climbing as a capacitor charges, tremolo speeding up, sparks crackling at the top. Hear it and brace.',
    build(K) {
      const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.3, wet: 0.15 });
      const o = K.ctx.createOscillator(), g = K.gain(0), tr = K.gain(1); o.type = 'triangle';
      o.frequency.setValueAtTime(300, 0); o.frequency.exponentialRampToValueAtTime(3400, 1.0);
      g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(0.22, 0.95); g.gain.setValueAtTime(0.22, 1.02); g.gain.exponentialRampToValueAtTime(0.0001, 1.12);
      const l = K.ctx.createOscillator(), ld = K.gain(0.5); l.frequency.setValueAtTime(6, 0); l.frequency.exponentialRampToValueAtTime(40, 1.0); l.connect(ld).connect(tr.gain); l.start(0); l.stop(1.2);
      K.chain(o, tr, g, out); o.start(0); o.stop(1.2);
      K.blip(out, 0, { type: 'sine', f0: 600, f1: 6800, glide: 1.0, a: 0.6, d: 0.45, peak: 0.03 });
      crackle(K, out, 0.7, { dur: 0.35, peak: 0.12, hold: 3, hp: 3000 });
    } },
  { id: 'tell-charge-b-full-disk', len: 1.4, shot: true, desc: 'Charge (Full Disk), spin-up: a drive motor whirring up with grinding, head seeks accelerating into a stuck, buzzing hold. Heavier and more mechanical than (a).',
    build(K) {
      const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.3, wet: 0.15 });
      const o = K.ctx.createOscillator(), g = K.gain(0); o.type = 'sawtooth'; o.frequency.setValueAtTime(40, 0); o.frequency.exponentialRampToValueAtTime(240, 1.0);
      g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(0.2, 0.9); g.gain.setValueAtTime(0.2, 1.15); g.gain.exponentialRampToValueAtTime(0.0001, 1.3);
      K.chain(o, K.shaper(4), K.filt('lowpass', 1800, 2), g, out); o.start(0); o.stop(1.35);
      let t = 0.05; for (let i = 0; i < 16 && t < 1.0; i++) { K.S(out, t, 'click', { gain: 0.3, rate: 0.6 + i * 0.03, lp: 3000 }); t += 0.12 * Math.pow(0.85, i); }
      for (let i = 0; i < 4; i++) K.blip(out, 1.0 + i * 0.06, { type: 'square', f0: 1200, a: 0.001, d: 0.03, peak: 0.06 });
    } },
  { id: 'tell-seal-a-latch', len: 1.1, shot: true, desc: 'Seal, airlock latch: a heavy steel clamp slamming shut, a relay catching, and pressure hissing off. Final, physical.',
    build(K) {
      const out = K.space(K.out, { secs: 1.4, decay: 3, damp: 0.4, wet: 0.3 });
      K.blip(out, 0, { type: 'sine', f0: 140, f1: 38, glide: 0.18, a: 0.002, d: 0.3, peak: 0.6 });
      K.S(out, 0, 'plate-l', { gain: 0.8, rate: 0.6 }); K.S(out, 0.005, 'metal-l', { gain: 0.4, rate: 0.7, lp: 2500 }); K.S(out, 0.03, 'relay', { gain: 0.6, rate: 0.65 });
      K.burst(out, 0.08, { type: 'highpass', f0: 5000, f1: 1500, glide: 0.8, a: 0.01, d: 0.7, peak: 0.05, color: 'white' });
    } },
  { id: 'tell-seal-b-magnetic', len: 0.9, shot: true, desc: 'Seal, magnetic clamp: an electric buzz that pinches shut, falling in pitch until it snaps into silence with a clean click. More electronic than (a).',
    build(K) {
      const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.3, wet: 0.2 });
      const c = K.ctx.createOscillator(), m = K.ctx.createOscillator(), mg = K.gain(0), e = K.gain(0); c.type = 'square'; c.frequency.setValueAtTime(900, 0); c.frequency.exponentialRampToValueAtTime(180, 0.45);
      m.frequency.setValueAtTime(140, 0); m.frequency.exponentialRampToValueAtTime(20, 0.45); m.connect(mg.gain);
      e.gain.setValueAtTime(0.0001, 0); e.gain.exponentialRampToValueAtTime(0.25, 0.03); e.gain.setValueAtTime(0.25, 0.44); e.gain.linearRampToValueAtTime(0, 0.455);
      K.chain(c, mg, K.filt('lowpass', 2500), e, out); c.start(0); m.start(0); c.stop(0.5); m.stop(0.5);
      K.blip(out, 0.455, { type: 'sine', f0: 2600, a: 0.0005, d: 0.02, peak: 0.25 }); K.S(out, 0.455, 'tick', { gain: 0.5, rate: 1.2 });
      K.blip(out, 0.455, { type: 'sine', f0: 90, f1: 50, glide: 0.1, a: 0.002, d: 0.18, peak: 0.4 });
    } },
  { id: 'tell-mimic-a-mirror', len: 1.0, shot: true, desc: 'Mimic beat, mirror: a bright two-note chime, answered a beat later by the same notes played back wrong: flattened, ring-modulated, a little reversed. Something is copying you.',
    build(K) {
      const out = K.space(K.out, { secs: 1, decay: 3, damp: 0.3, wet: 0.3 });
      chime(K, out, 0, 81, { d: 0.25, peak: 0.25, pan: -0.3 }); chime(K, out, 0.08, 88, { d: 0.3, peak: 0.22, pan: -0.3 });
      const rm = K.gain(0); const m = K.ctx.createOscillator(); m.frequency.value = 170; m.connect(rm.gain); m.start(0.3); m.stop(1);
      K.chain(rm, K.filt('lowpass', 3000), K.gain(1.6), out);
      for (const [t, mid] of [[0.34, 88], [0.42, 81]]) K.blip(rm, t, { type: 'triangle', f0: NOTE(mid - 0.5), a: 0.12, d: 0.05, peak: 0.3, pan: 0.3 });
    } },
  { id: 'tell-mimic-b-tape-copy', len: 1.1, shot: true, desc: 'Mimic beat, degrading copy: one clean blip repeated three times, each copy lower, more crushed and further away, like a tape dubbed of a dub.',
    build(K) {
      const out = K.space(K.out, { secs: 1, decay: 3, damp: 0.4, wet: 0.25 });
      [[0, 0, 64], [0.22, -1, 10], [0.44, -2, 5], [0.66, -3, 3]].forEach(([t, st, lv], i) => {
        const cr = K.crush(lv), lp = K.filt('lowpass', 6000 / (i + 1)); K.chain(cr, lp, K.gain(1 - i * 0.18), out);
        K.blip(cr, t, { type: 'square', f0: 1320 * Math.pow(2, st / 12), f1: 1250 * Math.pow(2, st / 12), glide: 0.1, a: 0.002, d: 0.12, peak: 0.5, pan: i % 2 ? 0.4 : -0.4 });
      });
    } },
  { id: 'tell-compile-a-keys', len: 1.0, shot: true, desc: 'Compile (cast), keystrokes: mechanical keys accelerating into a rising run of square blips that lands on a bright confirming ping. Your program assembling, then firing.',
    build(K) {
      const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.3, wet: 0.2 });
      let t = 0; for (let i = 0; i < 9; i++) { K.S(out, t, 'key', { gain: 0.45 }); t += 0.09 * Math.pow(0.82, i); }
      [523, 659, 784, 1047, 1319].forEach((f, i) => K.blip(K.chain(K.filt('lowpass', 4000), out), 0.3 + i * 0.04, { type: 'square', f0: f, a: 0.001, d: 0.035, peak: 0.08 }));
      K.blip(out, 0.52, { type: 'sine', f0: 2093, a: 0.002, d: 0.35, peak: 0.2 }); K.S(out, 0.52, 'glassui', { gain: 0.35, rate: 1.2 });
    } },
  { id: 'tell-compile-b-link', len: 1.0, shot: true, desc: 'Compile (cast), linker: a compressed burst of modem chatter (the code streaming), a relay clunk as it links, and a short rising blip as it runs.',
    build(K) {
      const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.3, wet: 0.2 });
      fsk(K, out, 0, { dur: 0.32, lo: 1200, hi: 2200, baud: 180, peak: 0.12 });
      K.S(out, 0.36, 'relay', { gain: 0.7, rate: 0.75 }); K.blip(out, 0.36, { type: 'sine', f0: 120, f1: 60, glide: 0.08, a: 0.002, d: 0.12, peak: 0.3 });
      K.blip(out, 0.42, { type: 'triangle', f0: 660, f1: 1980, glide: 0.12, a: 0.003, d: 0.18, peak: 0.18 });
    } },
  { id: 'tell-prewarn-existing', board: 'prewarn', desc: 'Existing prewarn (RECIPES.prewarn, from the game), for comparison: the soft two-tone tick before something lands.' },
  { id: 'tell-escalate-existing', board: 'escalate', desc: 'Existing escalate (RECIPES.escalate, from the game), for comparison: the low growl when the virus adapts.' },
];

// ---------------- 4. hubs ----------------
const hubs = [
  { id: 'hub-halcyon', len: 15, desc: 'Halcyon: a clean corporate office. Air handling, a faint fluorescent buzz that flickers, distant typing, and a soft two-note chime like a notification down the hall.',
    build(K) {
      const out = K.space(K.out, { secs: 1.6, decay: 3, damp: 0.3, wet: 0.25 });
      K.bed(out, { color: 'pink', gain: 0.12, nodes: [K.filt('lowpass', 900), K.filt('highpass', 80)] });
      const fl = K.tone(K.chain(K.filt('bandpass', 1500, 1), out), { type: 'sawtooth', f: 120, gain: 0.012 }); K.wander(fl.g.gain, 0.012, 0.006, 2);
      K.every(2, 4, (t) => { for (let i = 0, x = t; i < 6 + rnd(0, 10); i++, x += rnd(0.08, 0.2)) K.S(out, x, 'key', { gain: 0.06, lp: 2500, pan: 0.5 }); });
      for (const t of [2.5, 10]) { chime(K, out, t, 88, { d: 1.2, peak: 0.07 }); chime(K, out, t + 0.22, 83, { d: 1.6, peak: 0.07 }); }
    } },
  { id: 'hub-glassjaw', len: 15, desc: 'GLASSJAW: cold and digital. A precise tick every second with a higher one on the off-beat, a thin clean air, a faint sub, and glass pinging in a hard empty room.',
    build(K) {
      const out = K.space(K.out, { secs: 2.5, decay: 2, damp: 0.05, wet: 0.3 });
      K.bed(out, { color: 'white', gain: 0.0015, nodes: [K.filt('highpass', 7000)] }); K.tone(out, { type: 'sine', f: 55, gain: 0.05 });
      for (let t = 0; t < K.end; t += 1) { K.blip(out, t, { type: 'sine', f0: 2000, a: 0.0005, d: 0.01, peak: 0.25 }); if (Math.round(t) % 2 === 0) K.blip(out, t + 0.5, { type: 'sine', f0: 3200, a: 0.0005, d: 0.006, peak: 0.06, pan: 0.5 }); }
      for (const t of [3.25, 9.75]) K.S(out, t, 'glassui', { gain: 0.15, rate: 1.6, pan: -0.5 });
    } },
  { id: 'hub-kestrel', len: 15, desc: 'Kestrel: a quiet operations room. A radar sweep swishing across the stereo field every five seconds, a soft return ping after each, and a low equipment hum.',
    build(K) {
      const out = K.space(K.out, { secs: 2, decay: 3, damp: 0.4, wet: 0.25 });
      K.tone(K.chain(K.filt('lowpass', 300), out), { type: 'sawtooth', f: 50, gain: 0.03 }); K.bed(out, { color: 'pink', gain: 0.03, nodes: [K.filt('lowpass', 700)] });
      for (let t = 0; t < K.end; t += 5) {
        const s = K.ctx.createBufferSource(), f = K.filt('bandpass', 800, 2), g = K.gain(0), p = K.pan(-1); s.buffer = K.noiseBuf('pink');
        f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2500, t + 1.2); f.frequency.exponentialRampToValueAtTime(400, t + 2.4);
        p.pan.setValueAtTime(-0.9, t); p.pan.linearRampToValueAtTime(0.9, t + 2.4);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        K.chain(s, f, g, p, out); s.start(t, rnd(0, 1)); s.stop(t + 2.5);
        K.blip(out, t + 1.6, { type: 'sine', f0: 1180, f1: 1160, glide: 0.3, a: 0.004, d: 0.5, peak: 0.06, pan: 0.3 });
      }
    } },
  { id: 'hub-lantern', len: 15, desc: 'LANTERN: a radio room. Static hiss, the dial being tuned with heterodyne whistles sliding past, squelch opening and closing, and a numbers station (from soundtrack.mjs) breaking through.',
    async build(K, mod) {
      const out = K.space(K.out, { secs: 1, decay: 3, damp: 0.4, wet: 0.15 });
      const radio = K.gain(1); K.chain(radio, K.filt('highpass', 300), K.filt('lowpass', 3200, 1.5), K.shaper(2.5), out);
      const st = K.bed(radio, { color: 'white', gain: 0.12, hold: 2, nodes: [K.filt('bandpass', 2000, 0.6)] }); K.wander(st.gain, 0.1, 0.06, 0.6);
      const wh = K.ctx.createOscillator(), wg = K.gain(0.02); wh.type = 'sine'; K.wander(wh.frequency, 1400, 1100, 0.35); K.chain(wh, wg, radio); wh.start(0);
      K.wander(wg.gain, 0.025, 0.025, 0.5);
      K.every(2, 4, (t) => K.burst(radio, t, { type: 'bandpass', f0: 2600, q: 0.6, a: 0.005, d: 0.06, hold: rnd(0.05, 0.15), peak: 0.35 }));
      // the game's own numbers station, delayed into place
      for (const at of [5]) { const d = K.ctx.createDelay(20); d.delayTime.value = at; d.connect(out); mod.transmission(K.ctx, d, { level: 0.6, kind: 'numbers' }); }
    } },
  { id: 'hub-null-choir-a', len: 15, desc: 'NULL CHOIR, sung chord: a slow choral pad of formant voices on a minor-ninth chord, breathing on "ah" and "oo", in a large stone room.',
    build(K) { choir(K, false); } },
  { id: 'hub-null-choir-b', len: 15, desc: 'NULL CHOIR, chant: a lower, darker cluster of voices on one held drone, the vowel slowly turning; more like monks in a machine than a choir.',
    build(K) { choir(K, true); } },
];
function choir(K, chant) {
  const out = K.space(K.out, { secs: 5, decay: 2, damp: 0.45, wet: 0.6, pre: 0.05 });
  const notes = chant ? [45, 45, 52, 57, 57, 58] : [50, 57, 60, 62, 64, 65];
  notes.flatMap((m) => [m, m]).forEach((m, i) => {
    const v = K.sung(out, { f: NOTE(m), vowel: VOW.a, gain: chant ? 0.07 : 0.05, pan: ((i % 6) / 5) * 1.4 - 0.7, detune: (i % 2 ? 1 : -1) * rnd(5, 12), vib: rnd(4.5, 5.5), vibDepth: 0.008 });
    const seq = chant ? ['a', 'o', 'u', 'o', 'a'] : ['a', 'a', 'o', 'u', 'a'];
    v.fs.forEach((f, k) => { f.frequency.setValueAtTime(VOW[seq[0]][k], 0); seq.forEach((s, j) => f.frequency.setTargetAtTime(VOW[s][k], (j * K.end) / seq.length + i * 0.3, 1.2)); });
    v.sum.gain.setValueAtTime(0.0001, 0); v.sum.gain.exponentialRampToValueAtTime(chant ? 0.07 : 0.05, 1.5);
    K.lfo(v.sum.gain, 1 / 7.5, 0.015);
  });
  K.bed(out, { color: 'pink', gain: 0.004, nodes: [K.filt('bandpass', 4000, 0.8)] });
}

export const GROUPS = { floors, families, tells, hubs };

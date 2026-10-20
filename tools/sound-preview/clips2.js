// Round 2 of the preview pack, after the designer's notes: the Sprawl as a place rather than a
// hiss, the Stacks without the whine, a Backhaul of its own, and new family, tell and combat sounds
// with weight: layered impacts, sub thumps, resampled and pitch-dropped metal, granular textures,
// formant growls and whispers instead of synth bleeps.
import { rnd, pick } from './lib.js';

// ---------------- shared pieces ----------------
// A sample played backwards so that its (original) attack lands exactly at tHit.
function revInto(K, dest, tHit, name, { rate = 1, gain = 0.5, lp, hp, pan = 0 } = {}) {
  const b = K.rev(K.bufOf(name)), s = K.ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
  const n = [s]; if (lp) n.push(K.filt('lowpass', lp, 0.6)); if (hp) n.push(K.filt('highpass', hp, 0.6));
  n.push(K.gain(gain), K.pan(pan), dest); K.chain(...n);
  const start = tHit - b.duration / rate; if (start >= 0) s.start(start); else s.start(0, -start * rate);
}
// A noise swell that rises into tHit (a reversed whoosh), band sweeping up.
function suck(K, dest, tHit, { len = 0.5, f0 = 300, f1 = 3000, peak = 0.3, color = 'pink', q = 0.8 } = {}) {
  const t = Math.max(0, tHit - len), s = K.ctx.createBufferSource(), f = K.filt('bandpass', f0, q), g = K.gain(0); s.buffer = K.noiseBuf(color);
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, tHit);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, tHit - 0.005); g.gain.linearRampToValueAtTime(0, tHit + 0.01);
  K.chain(s, f, g, dest); s.start(t, rnd(0, 1)); s.stop(tHit + 0.05);
}
// A crushed transient: the click at the front of every heavy hit.
function crack(K, dest, t, { peak = 0.6, hp = 2500, d = 0.02 } = {}) {
  const c = K.crush(6), g = K.gain(1); K.chain(c, g, dest);
  K.burst(c, t, { type: 'highpass', f0: hp, a: 0.0005, d, peak });
  K.burst(dest, t, { type: 'bandpass', f0: 1200, q: 0.7, a: 0.0005, d: 0.05, peak: peak * 0.5 });
}
// Debris: short bright grains of metal and glass bouncing away and thinning out.
function debris(K, dest, t, { len = 0.6, names = ['tin', 'glass-h', 'metal-h'], rate = [0.5, 0.9], gain = 0.25, lp = 5000 } = {}) {
  K.cloud(dest, t, t + len, names, { density: (x) => 40 * (1 - x) + 3, dur: [0.02, 0.07], rate, gain: (x) => gain * (1 - 0.8 * x), lp, pan: [-0.9, 0.9] });
}
function drip(K, out, t, { f = 1100, peak = 0.2, pan = 0 } = {}) {
  K.blip(out, t, { type: 'sine', f0: f, f1: f * 1.9, glide: 0.018, a: 0.001, d: 0.05, peak, pan });
  K.blip(out, t + 0.012, { type: 'sine', f0: f * 1.9, f1: f * 2.3, glide: 0.04, a: 0.002, d: 0.08, peak: peak * 0.3, pan });
}
// A footstep in a puddle: a soft heel, a wet slap and a few droplets.
function puddleStep(K, out, t, { pan = 0, peak = 0.3 } = {}) {
  K.blip(out, t, { type: 'sine', f0: 140, f1: 60, glide: 0.05, a: 0.002, d: 0.08, peak: peak * 0.8, pan });
  K.burst(out, t + 0.01, { type: 'bandpass', f0: 900, f1: 1500, q: 1.2, glide: 0.08, a: 0.004, d: 0.12, peak, pan });
  for (let i = 0; i < 3; i++) K.blip(out, t + 0.04 + rnd(0, 0.12), { type: 'sine', f0: rnd(900, 1500), f1: rnd(1800, 2400), glide: 0.015, a: 0.001, d: 0.03, peak: peak * 0.15, pan });
}
// A neon sign: a low 120 Hz buzz that flickers in and out (no high whine).
function sign(K, out, { pan = 0.5, level = 0.01 } = {}) {
  const o = K.tone(K.chain(K.filt('bandpass', 240, 3), K.filt('lowpass', 700), out), { type: 'sawtooth', f: 120, gain: 0, pan });
  const g = o.g.gain; g.setValueAtTime(0, 0);
  for (let t = 0; t < K.end;) { const on = rnd(1.5, 5); g.setValueAtTime(level, t); for (let x = 0; x < on; x += rnd(0.05, 0.6)) if (Math.random() < 0.15) { g.setValueAtTime(0, t + x); g.setValueAtTime(level, t + x + rnd(0.02, 0.08)); } t += on; g.setValueAtTime(0, t); t += rnd(1, 4); }
}
// A train far off: a rumble swells and fades, wheels clacking over joints, and its horn once.
function farTrain(K, out, t0, dur, { horn = t0 + dur * 0.45, pan = -0.4 } = {}) {
  const lp = K.filt('lowpass', 260), g = K.gain(0), p = K.pan(pan); K.chain(lp, g, p, out);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(1, t0 + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  K.bed(lp, { color: 'brown', gain: 0.5 });
  for (let t = t0; t < t0 + dur; t += 0.95) for (const dt of [0, 0.17]) { K.blip(lp, t + dt, { type: 'sine', f0: 80, f1: 50, glide: 0.04, a: 0.002, d: 0.08, peak: 0.25 }); K.burst(lp, t + dt, { type: 'lowpass', f0: 500, a: 0.001, d: 0.05, peak: 0.2 }); }
  const hl = K.filt('lowpass', 650), hg = K.gain(0); K.chain(hl, hg, K.pan(pan), K.delay(out, { time: 0.33, fb: 0.35, wet: 0.5, lp: 600 }));
  hg.gain.setValueAtTime(0.0001, horn); hg.gain.exponentialRampToValueAtTime(0.025, horn + 0.15); hg.gain.setValueAtTime(0.025, horn + 1.4); hg.gain.exponentialRampToValueAtTime(0.0001, horn + 2);
  for (const f of [311, 370, 466]) { const o = K.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * 0.995; o.connect(hl); o.start(horn); o.stop(horn + 2.1); }
}

// ---------------- floors ----------------
const floors = [
  { id: 'floor-1-sprawl-r2-a', len: 20, desc: 'The Sprawl, back street at night: a club\'s bass thumping through a wall, a neon sign buzzing on and off, someone splashing past through puddles, a far train with its horn, and the city only as a low murmur. Calm and low-passed.',
    build(K) {
      const out = K.space(K.chain(K.filt('lowpass', 3000, 0.5), K.out), { secs: 1.8, decay: 3, damp: 0.5, wet: 0.25 });
      const s = K.ctx.createBufferSource(); s.buffer = K.bufOf('city', 0); K.chain(s, K.filt('lowpass', 320, 0.5), K.gain(0.45), out); s.start(0, 140);
      // the club: four-on-the-floor kick and a bassline, through a wall, door opening a little now and then
      const club = K.gain(0.5), wall = K.filt('lowpass', 150, 0.7); K.chain(club, wall, K.pan(-0.55), out); K.wander(club.gain, 0.45, 0.25, 0.1);
      const bass = [41.2, 41.2, 49, 36.7];
      for (let t = 0, i = 0; t < K.end; t += 0.48, i++) { K.blip(club, t, { type: 'sine', f0: 120, f1: 45, glide: 0.05, a: 0.002, d: 0.22, peak: 0.6 }); if (i % 2) K.blip(club, t, { type: 'sawtooth', f0: bass[Math.floor(i / 8) % 4] * 2, a: 0.01, d: 0.2, peak: 0.25 }); }
      sign(K, out, { pan: 0.55, level: 0.008 });
      for (let i = 0; i < 9; i++) puddleStep(K, out, 3 + i * 0.55, { pan: -0.8 + i * 0.2, peak: 0.12 + 0.08 * Math.sin((i / 8) * Math.PI) });
      farTrain(K, out, 8, 12, { horn: 12.5, pan: 0.35 });
      K.every(2, 5, (t) => drip(K, out, t, { f: rnd(800, 1300), peak: 0.08, pan: rnd(-0.6, 0.6) }));
    } },
  { id: 'floor-1-sprawl-r2-b', len: 20, desc: 'The Sprawl, under the overpass: cars thudding over the expansion joints above, water dripping off the concrete, a muffled radio playing in a window, a vending machine humming low, a far train horn.',
    build(K) {
      const out = K.space(K.chain(K.filt('lowpass', 2800, 0.5), K.out), { secs: 2.6, decay: 2.6, damp: 0.5, wet: 0.35, pre: 0.03 });
      K.tone(out, { type: 'sine', f: 60, gain: 0.03 }); K.tone(out, { type: 'sine', f: 120, gain: 0.012 });
      // cars overhead: ka-thunk, ka-thunk, and a dark whoosh
      for (const t of [1.5, 7.2, 11, 16.4]) {
        for (const dt of [0, 0.13, 0.55, 0.68]) { K.S(out, t + dt, 'soft-h', { gain: 0.35, rate: 0.5, lp: 500 }); K.sub(out, t + dt, { f0: 70, f1: 40, d: 0.15, peak: 0.25 }); }
        K.burst(out, t - 0.6, { type: 'lowpass', f0: 300, f1: 700, glide: 0.8, a: 0.7, d: 1.4, peak: 0.12, color: 'pink' });
        K.blip(K.chain(K.filt('lowpass', 300), out), t - 0.6, { type: 'sawtooth', f0: 75, f1: 58, glide: 2, a: 0.6, d: 1.4, peak: 0.08 });
      }
      // dripping off the overpass, two steady leaks and odd ones
      const wet = K.delay(out, { time: 0.29, fb: 0.3, wet: 0.35, lp: 1800 });
      for (let t = 0.4; t < K.end; t += 1.9) drip(K, wet, t, { f: 1050, peak: 0.1, pan: 0.3 });
      K.every(2.5, 6, (t) => drip(K, wet, t, { f: rnd(700, 1400), peak: 0.08, pan: rnd(-0.7, 0.7) }));
      // a radio in a window: a slow minor progression, through the glass
      const radio = K.gain(0.03), rl = K.filt('lowpass', 520, 1); K.chain(radio, rl, K.filt('highpass', 180), K.pan(0.55), out);
      const chords = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]];
      for (let t = 0, i = 0; t < K.end; t += 2.5, i++) chords[i % 4].forEach((m) => K.blip(radio, t, { type: 'triangle', f0: 440 * Math.pow(2, (m - 69) / 12), a: 0.05, hold: 2.1, d: 0.35, peak: 0.3 }));
      farTrain(K, out, 9, 10, { horn: 12, pan: -0.5 });
    } },
  { id: 'floor-2-backhaul-r2', len: 20, desc: 'Backhaul, its own sound: a deep cable-duct hum that beats slowly, and big slow relay banks (synthesized latches, not the game\'s relay sample) clunking in the distance, echoing down a long concrete duct. No constant buzz.',
    build(K) {
      const out = K.space(K.out, { secs: 3.5, decay: 2.2, damp: 0.55, wet: 0.45, pre: 0.04 }), duct = K.delay(out, { time: 0.37, fb: 0.4, wet: 0.35, lp: 900 });
      for (const [f, g] of [[50, 0.06], [50.4, 0.05], [100, 0.025], [150, 0.008]]) K.tone(K.chain(K.filt('lowpass', 220), out), { type: 'sine', f, gain: g });
      K.bed(out, { color: 'brown', gain: 0.15, nodes: [K.filt('lowpass', 180)] });
      const latch = (t, p, r) => { K.burst(duct, t, { type: 'bandpass', f0: 1100 * r, q: 3, a: 0.0005, d: 0.02, peak: 0.25, pan: p }); K.blip(duct, t, { type: 'sine', f0: 140 * r, f1: 55, glide: 0.06, a: 0.001, d: 0.12, peak: 0.35, pan: p }); K.S(duct, t + 0.005, 'metal-l', { gain: 0.12, rate: 0.35 * r, lp: 900, pan: p }); };
      K.every(2.5, 5, (t) => { const n = 2 + Math.floor(rnd(0, 3)), p = rnd(-0.8, 0.8), r = rnd(0.8, 1.2); for (let i = 0; i < n; i++) latch(t + i * rnd(0.22, 0.4), p, r); });
      K.every(6, 9, (t) => K.blip(K.chain(K.filt('lowpass', 200), out), t, { type: 'sine', f0: 45, f1: 38, glide: 1.5, a: 0.5, d: 1.5, peak: 0.12 }), 3);
    } },
  { id: 'floor-3-stacks-r2-a', len: 20, desc: 'The Stacks, quiet aisles: only a low, soft fan wash that breathes a little, a drive seeking now and then, and shelves creaking under their load. No whine, nothing constant above the low end.',
    build(K) {
      const out = K.space(K.chain(K.filt('lowpass', 2500, 0.5), K.out), { secs: 2.6, decay: 2.5, damp: 0.5, wet: 0.35, pre: 0.03 });
      const w1 = K.bed(out, { color: 'brown', gain: 0.4, nodes: [K.filt('lowpass', 300)] }); K.wander(w1.gain, 0.4, 0.08, 0.15);
      const w2 = K.bed(out, { color: 'pink', gain: 0.04, nodes: [K.filt('lowpass', 650)] }); K.wander(w2.gain, 0.04, 0.015, 0.1);
      K.every(2.5, 5, (t) => { const n = 2 + Math.floor(rnd(0, 4)), p = rnd(-0.7, 0.7); for (let i = 0; i < n; i++) K.S(out, t + i * rnd(0.04, 0.1), 'click', { gain: 0.12, rate: rnd(0.45, 0.6), lp: 1600, pan: p }); });
      for (const t of [4, 9.5, 15]) K.S(out, t, 'scratch', { gain: 0.22, rate: rnd(0.2, 0.3), lp: 1100, pan: rnd(-0.7, 0.7) });
      for (const t of [6.5, 17]) K.S(out, t, 'metal-l', { gain: 0.14, rate: 0.35, lp: 700, pan: rnd(-0.6, 0.6) });
    } },
  { id: 'floor-3-stacks-r2-b', len: 20, desc: 'The Stacks, the tape library: a deeper fan wash, a robot arm whirring along its rail to fetch a cartridge and clunking it home, drives seeking, and the odd creak. Mechanical but soft.',
    build(K) {
      const out = K.space(K.chain(K.filt('lowpass', 2200, 0.5), K.out), { secs: 3, decay: 2.4, damp: 0.5, wet: 0.4, pre: 0.03 });
      const w = K.bed(out, { color: 'brown', gain: 0.5, nodes: [K.filt('lowpass', 220)] }); K.wander(w.gain, 0.5, 0.1, 0.1);
      K.bed(out, { color: 'pink', gain: 0.03, nodes: [K.filt('lowpass', 500)] });
      for (const t of [2, 11.5]) {
        const o = K.ctx.createOscillator(), g = K.gain(0), lp = K.filt('lowpass', 420, 2), p = K.pan(-0.6); o.type = 'sawtooth';
        o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(115, t + 0.5); o.frequency.setValueAtTime(115, t + 2.4); o.frequency.linearRampToValueAtTime(70, t + 2.9);
        p.pan.setValueAtTime(-0.6, t); p.pan.linearRampToValueAtTime(0.6, t + 2.9);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.3); g.gain.setValueAtTime(0.07, t + 2.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
        K.chain(o, lp, g, p, out); o.start(t); o.stop(t + 3.1);
        K.S(out, t + 3.2, 'plate-l', { gain: 0.3, rate: 0.5, lp: 900, pan: 0.6 }); K.sub(out, t + 3.2, { f0: 90, f1: 45, d: 0.2, peak: 0.25 }); K.S(out, t + 3.6, 'click', { gain: 0.2, rate: 0.5, lp: 1500, pan: 0.6 });
      }
      K.every(2, 4.5, (t) => { const n = 2 + Math.floor(rnd(0, 4)), p = rnd(-0.7, 0.7); for (let i = 0; i < n; i++) K.S(out, t + i * rnd(0.04, 0.1), 'click', { gain: 0.1, rate: rnd(0.45, 0.6), lp: 1500, pan: p }); });
      for (const t of [8, 18]) K.S(out, t, 'scratch', { gain: 0.18, rate: 0.22, lp: 1000, pan: rnd(-0.6, 0.6) });
    } },
];

// ---------------- families: idle loop, attack, part break; two variants each ----------------
const fam = (id, desc, build, extra = {}) => ({ id, desc, build, ...extra });
const families = [
  // Ransomware A: a vault mechanism. Servo grind, ratchets tightening, a lock clunking home.
  fam('ransomware-a-vault-idle', 'Ransomware A (vault), idle: a servo grinding under load, pitch-dropped metal grains turning over, and a ratchet that clicks faster and faster through the loop until a heavy bolt shoots home.', (K) => {
    const out = K.space(K.out, { secs: 1.6, decay: 2.5, damp: 0.5, wet: 0.3 });
    for (let c = 0; c < K.end; c += 6) {
      const o = K.ctx.createOscillator(), g = K.gain(0.07), lp = K.filt('lowpass', 500, 4); o.type = 'sawtooth';
      o.frequency.setValueAtTime(48, c); o.frequency.linearRampToValueAtTime(62, c + 5.6); lp.frequency.setValueAtTime(350, c); lp.frequency.linearRampToValueAtTime(900, c + 5.6);
      K.chain(o, K.shaper(3), lp, g, out); o.start(c); o.stop(c + 6);
      K.cloud(out, c, c + 5.7, ['metal-l', 'metal-h'], { density: (x) => 10 + 30 * x, dur: [0.04, 0.12], rate: [0.25, 0.4], gain: 0.25, lp: 1500, pan: [-0.5, 0.5] });
      let t = c + 0.2; for (let i = 0; t < c + 5.4; i++) { K.S(out, t, 'plate-h', { gain: 0.25, rate: 0.55, lp: 2500 }); K.sub(out, t, { f0: 110, f1: 60, d: 0.06, peak: 0.15 }); t += Math.max(0.07, 0.6 * Math.pow(0.82, i)); }
      K.S(out, c + 5.6, 'punch-h', { gain: 0.7, rate: 0.55, lp: 1800 }); K.S(out, c + 5.6, 'metal-h', { gain: 0.35, rate: 0.4 }); K.sub(out, c + 5.6, { peak: 0.6 });
    }
  }, { len: 6, xfade: 0.05 }),
  fam('ransomware-a-vault-attack', 'Ransomware A (vault), attack: the servo winds up with a grinding whine, then a massive clamp slams shut: crushed crack, sub thump, steel ringing low.', (K) => {
    const out = K.space(K.out, { secs: 1.4, decay: 2.5, damp: 0.45, wet: 0.3 });
    K.growl(out, 0, { f0: 45, f1: 110, dur: 0.45, vowels: ['u', 'o', 'a'], drive: 6, peak: 0.25, jitter: 0.04 });
    K.cloud(out, 0, 0.42, ['metal-h'], { density: (x) => 20 + 80 * x, dur: [0.02, 0.05], rate: [0.4, 0.7], gain: 0.2, lp: 2500 });
    crack(K, out, 0.45, { peak: 0.6 }); K.S(out, 0.45, 'punch-h', { gain: 0.9, rate: 0.5 }); K.S(out, 0.45, 'plate-l', { gain: 0.6, rate: 0.5 }); K.S(out, 0.46, 'metal-h', { gain: 0.45, rate: 0.3, lp: 2000 }); K.sub(out, 0.45, { f0: 100, f1: 30, d: 0.5, peak: 0.9 });
  }, { len: 1.3, shot: true }),
  fam('ransomware-a-vault-break', 'Ransomware A (vault), part break: the mechanism fails: a heavy crunch, springs and gears spraying out as pitched-down metal debris, and the sub dropping away.', (K) => {
    const out = K.space(K.out, { secs: 1.6, decay: 2.5, damp: 0.45, wet: 0.35 });
    crack(K, out, 0, { peak: 0.7 }); K.S(out, 0, 'punch-h', { gain: 0.9, rate: 0.45 }); K.S(out, 0, 'mining', { gain: 0.6, rate: 0.5 }); K.S(out, 0.01, 'plate-h', { gain: 0.5, rate: 0.4 });
    K.S(out, 0, 'subdrop', { gain: 0.7, rate: 0.8 }); K.sub(out, 0, { f0: 80, f1: 25, d: 0.8, peak: 0.8 });
    debris(K, out, 0.04, { len: 0.9, names: ['metal-h', 'tin', 'metal-l'], rate: [0.35, 0.7], gain: 0.35, lp: 3500 });
    for (let i = 0; i < 3; i++) K.S(out, 0.25 + i * 0.18 + rnd(0, 0.05), 'tin', { gain: 0.3 - i * 0.07, rate: rnd(0.5, 0.7), pan: rnd(-0.7, 0.7) });
  }, { len: 1.6, shot: true }),
  // Ransomware B: a hydraulic press. Pressure builds, a motor labours, chains clank, then it vents.
  fam('ransomware-b-press-idle', 'Ransomware B (hydraulic press), idle: a labouring motor and pressure building over the loop, chains clanking in time, hydraulics hissing, venting with a heavy thud at the top before it builds again.', (K) => {
    const out = K.space(K.out, { secs: 1.8, decay: 2.5, damp: 0.5, wet: 0.3 });
    for (let c = 0; c < K.end; c += 6) {
      const o = K.ctx.createOscillator(), g = K.gain(0.08), lp = K.filt('lowpass', 200, 6); o.type = 'sawtooth';
      o.frequency.setValueAtTime(36, c); o.frequency.exponentialRampToValueAtTime(52, c + 5.5); lp.frequency.setValueAtTime(180, c); lp.frequency.exponentialRampToValueAtTime(800, c + 5.5);
      K.chain(o, K.shaper(5), lp, g, out); o.start(c); o.stop(c + 6);
      K.burst(out, c, { type: 'bandpass', f0: 1500, f1: 4500, q: 1.2, glide: 5.5, a: 5, d: 0.2, peak: 0.08 });
      for (let t = c + 0.3; t < c + 5.5; t += 0.75) K.cloud(out, t, t + 0.12, ['tin', 'metal-l'], { density: 60, dur: [0.03, 0.08], rate: [0.4, 0.6], gain: 0.3, lp: 2200, pan: [-0.3, 0.3] });
      K.burst(out, c + 5.55, { type: 'highpass', f0: 2500, f1: 900, glide: 0.4, a: 0.005, d: 0.4, peak: 0.25 });
      K.S(out, c + 5.55, 'punch-h', { gain: 0.6, rate: 0.5, lp: 1500 }); K.sub(out, c + 5.55, { f0: 85, f1: 32, d: 0.4, peak: 0.6 });
    }
  }, { len: 6, xfade: 0.05 }),
  fam('ransomware-b-press-attack', 'Ransomware B (hydraulic press), attack: a pneumatic rush of air and a bolt driven home: crack, metal slam, sub, the hiss venting after.', (K) => {
    const out = K.space(K.out, { secs: 1.3, decay: 2.5, damp: 0.45, wet: 0.28 });
    suck(K, out, 0.25, { len: 0.25, f0: 600, f1: 4000, peak: 0.35, color: 'white' });
    crack(K, out, 0.25, { peak: 0.6 }); K.S(out, 0.25, 'punch-m', { gain: 0.9, rate: 0.5 }); K.S(out, 0.25, 'plate-l', { gain: 0.6, rate: 0.55 }); K.sub(out, 0.25, { f0: 110, f1: 32, d: 0.45, peak: 0.9 });
    K.burst(out, 0.3, { type: 'highpass', f0: 3000, f1: 1200, glide: 0.5, a: 0.01, d: 0.55, peak: 0.12 });
  }, { len: 1.2, shot: true }),
  fam('ransomware-b-press-break', 'Ransomware B (hydraulic press), part break: a pressure line bursts: a huge cracking report, a spray of venting gas, and metal parts clattering down in slowing bounces.', (K) => {
    const out = K.space(K.out, { secs: 1.8, decay: 2.5, damp: 0.45, wet: 0.35 });
    crack(K, out, 0, { peak: 0.8, d: 0.04 }); K.S(out, 0, 'punch-h', { gain: 0.9, rate: 0.6 }); K.S(out, 0, 'glass-l', { gain: 0.4, rate: 0.5 }); K.sub(out, 0, { f0: 90, f1: 28, d: 0.7, peak: 0.9 });
    K.burst(out, 0.02, { type: 'bandpass', f0: 5000, f1: 1500, q: 0.7, glide: 0.9, a: 0.005, d: 0.9, peak: 0.25 });
    let t = 0.2; for (let i = 0; i < 6; i++) { K.S(out, t, 'metal-l', { gain: 0.45 * Math.pow(0.75, i), rate: rnd(0.5, 0.7), pan: 0.3 }); t += 0.25 * Math.pow(0.7, i); }
  }, { len: 1.6, shot: true }),
  // Worm A: insectoid. Chitin clicks, wet mandibles, a buzzing purr.
  fam('worm-a-insect-idle', 'Worm A (insectoid), idle: a swarm of dry chitin clicks and wet mandible ticks moving around you, a low buzzing purr like wings under a carapace, and the odd squelch.', (K) => {
    const out = K.space(K.out, { secs: 1, decay: 3, damp: 0.4, wet: 0.2 });
    K.cloud(out, 0, K.end, ['key', 'click'], { density: 45, dur: [0.01, 0.03], rate: [1.6, 3], gain: 0.25, bp: 2500, q: 2, pan: [-0.9, 0.9] });
    K.cloud(out, 0, K.end, ['scratch'], { density: 12, dur: [0.02, 0.05], rate: [1.2, 2], gain: 0.15, bp: 1400, q: 3, pan: [-0.9, 0.9] });
    const purr = K.gain(0.5); K.lfo(purr.gain, 18, 0.45); K.chain(purr, out);
    for (let t = 0; t < K.end; t += 1.5) K.growl(purr, t, { f0: rnd(60, 75), dur: 1.6, vowels: ['u', 'o', 'u'], drive: 3, peak: 0.12, a: 0.3 });
    K.every(0.8, 2, (t) => K.burst(out, t, { type: 'bandpass', f0: 400, f1: 1200, q: 5, glide: 0.1, a: 0.01, d: 0.12, peak: 0.2, pan: rnd(-0.7, 0.7) }));
  }, { len: 6, xfade: 1 }),
  fam('worm-a-insect-attack', 'Worm A (insectoid), attack: a scraping lunge, a chattering burst of mandibles and a wet, heavy bite.', (K) => {
    const out = K.space(K.out, { secs: 1, decay: 3, damp: 0.4, wet: 0.2 });
    K.burst(out, 0, { type: 'bandpass', f0: 500, f1: 3000, q: 2, glide: 0.25, a: 0.2, d: 0.08, peak: 0.25 });
    for (let i = 0; i < 12; i++) K.grain(out, 0.15 + i * 0.022, 'key', { dur: 0.02, rate: 2.2, gain: 0.5, bp: 2200, q: 2, pan: rnd(-0.3, 0.3) });
    crack(K, out, 0.42, { peak: 0.4 }); K.S(out, 0.42, 'soft-h', { gain: 0.8, rate: 0.75 }); K.S(out, 0.42, 'punch-m', { gain: 0.5, rate: 0.7 }); K.sub(out, 0.42, { f0: 120, f1: 45, d: 0.3, peak: 0.6 });
    K.burst(out, 0.44, { type: 'lowpass', f0: 1800, f1: 300, glide: 0.2, a: 0.005, d: 0.25, peak: 0.3 });
    K.growl(out, 0.4, { f0: 90, f1: 60, dur: 0.4, vowels: ['a', 'u'], drive: 5, peak: 0.2 });
  }, { len: 1.1, shot: true }),
  fam('worm-a-insect-break', 'Worm A (insectoid), part break: a carapace cracking open with a glassy crunch, a wet burst, and the swarm scattering away into the corners.', (K) => {
    const out = K.space(K.out, { secs: 1.4, decay: 3, damp: 0.4, wet: 0.28 });
    crack(K, out, 0, { peak: 0.6 }); K.S(out, 0, 'glass-l', { gain: 0.6, rate: 0.55 }); K.S(out, 0, 'punch-h', { gain: 0.6, rate: 0.7 }); K.sub(out, 0, { f0: 100, f1: 35, d: 0.45, peak: 0.7 });
    K.burst(out, 0.01, { type: 'bandpass', f0: 700, f1: 250, q: 3, glide: 0.25, a: 0.004, d: 0.3, peak: 0.35 });
    K.cloud(out, 0.05, 1.2, ['key', 'click'], { density: (x) => 80 * (1 - x) + 2, dur: [0.01, 0.03], rate: [1.8, 3], gain: (x) => 0.35 * (1 - x), bp: 2500, q: 2, pan: [-1, 1] });
  }, { len: 1.5, shot: true }),
  // Worm B: a nanite mass. Metal sand, grinding, a slurping body.
  fam('worm-b-nanite-idle', 'Worm B (nanite mass), idle: a shifting heap of tiny metal legs, like sand made of machinery, grinding over itself with a slow, wet, slurping body underneath.', (K) => {
    const out = K.space(K.out, { secs: 1.2, decay: 3, damp: 0.4, wet: 0.25 });
    K.cloud(out, 0, K.end, ['tin', 'glass-h', 'metal-h'], { density: 120, dur: [0.008, 0.025], rate: [0.6, 1.1], gain: 0.12, lp: 4500, pan: [-0.9, 0.9] });
    const sw = K.filt('bandpass', 1000, 2); K.chain(sw, out); K.lfo(sw.frequency, 1 / 3, 500);
    K.cloud(sw, 0, K.end, ['scratch', 'mining'], { density: 25, dur: [0.04, 0.1], rate: [0.4, 0.7], gain: 0.35, pan: [-0.6, 0.6] });
    for (let t = 0; t < K.end; t += 2) K.growl(out, t, { f0: 55, f1: 48, dur: 2.1, vowels: ['u', 'o', 'u'], drive: 2, peak: 0.08, a: 0.6, jitter: 0.15 });
  }, { len: 6, xfade: 1 }),
  fam('worm-b-nanite-attack', 'Worm B (nanite mass), attack: the swarm surges from one side to the other in a rising metallic roar and strikes with a crunching impact.', (K) => {
    const out = K.space(K.out, { secs: 1, decay: 3, damp: 0.4, wet: 0.25 });
    const p = K.pan(-0.9), bus = K.gain(1); p.pan.setValueAtTime(-0.9, 0); p.pan.linearRampToValueAtTime(0.3, 0.45); K.chain(bus, p, out);
    K.cloud(bus, 0, 0.45, ['tin', 'glass-h', 'metal-h'], { density: (x) => 60 + 300 * x, dur: [0.008, 0.025], rate: [0.6, 1.2], gain: (x) => 0.1 + 0.3 * x, lp: 5000, pan: [-0.2, 0.2] });
    suck(K, out, 0.45, { len: 0.4, f0: 400, f1: 3500, peak: 0.2 });
    crack(K, out, 0.45, { peak: 0.6 }); K.S(out, 0.45, 'punch-h', { gain: 0.8, rate: 0.7 }); K.S(out, 0.45, 'mining', { gain: 0.5, rate: 0.6 }); K.sub(out, 0.45, { f0: 110, f1: 40, d: 0.35, peak: 0.7 });
  }, { len: 1.1, shot: true }),
  fam('worm-b-nanite-break', 'Worm B (nanite mass), part break: a crunching blow that blasts the mass apart; the metal sand sprays outward and thins to nothing across the stereo field.', (K) => {
    const out = K.space(K.out, { secs: 1.4, decay: 3, damp: 0.4, wet: 0.3 });
    crack(K, out, 0, { peak: 0.7 }); K.S(out, 0, 'mining', { gain: 0.7, rate: 0.5 }); K.S(out, 0, 'punch-h', { gain: 0.7, rate: 0.55 }); K.sub(out, 0, { f0: 90, f1: 28, d: 0.6, peak: 0.8 });
    K.cloud(out, 0.02, 1.3, ['tin', 'glass-h', 'metal-h'], { density: (x) => 400 * Math.pow(1 - x, 2) + 4, dur: [0.008, 0.03], rate: [0.5, 1.3], gain: (x) => 0.3 * (1 - x), lp: 6000, pan: [-1, 1] });
  }, { len: 1.5, shot: true }),
  // Ghostroot A: whispers, reversed glass, a smeared drone.
  fam('ghostroot-a-whisper-idle', 'Ghostroot A (whisper), idle: unintelligible whispering drifting between the speakers, reversed glass ringing into nothing, and a smeared low drone that never settles.', (K) => {
    const out = K.space(K.out, { secs: 4, decay: 1.8, damp: 0.4, wet: 0.6, pre: 0.04 });
    const d = K.gain(1); K.chain(d, K.filt('lowpass', 500), out);
    for (const [f, det] of [[73.4, -15], [73.4, 17], [110, 9]]) { const o = K.tone(d, { type: 'sawtooth', f, detune: det, gain: 0.03 }); K.lfo(o.o.detune, 1 / 6, 20); }
    for (let c = 0; c < K.end; c += 6) { K.whisper(out, c + 0.2, 2.4, { peak: 0.35, pan: -0.5 }); K.whisper(out, c + 3.1, 2.6, { peak: 0.3, pan: 0.5 }); }
    for (let t = 1.5; t < K.end; t += 3) revInto(K, out, t, pick(['glass-h', 'shimmer', 'bell']), { rate: 0.6, gain: 0.3, pan: rnd(-0.6, 0.6) });
  }, { len: 6, xfade: 1.5 }),
  fam('ghostroot-a-whisper-attack', 'Ghostroot A (whisper), attack: a reversed impact sucks inward with a rising breath and hits as a sharp exhaled "hhah" over a dull sub, then smears away.', (K) => {
    const out = K.space(K.out, { secs: 2, decay: 2, damp: 0.4, wet: 0.45 });
    revInto(K, out, 0.5, 'punch-h', { rate: 0.6, gain: 0.7 }); suck(K, out, 0.5, { len: 0.5, f0: 300, f1: 2500, peak: 0.25 });
    K.whisper(out, 0.5, 0.3, { peak: 0.6, rate: 4 }); K.burst(out, 0.5, { type: 'bandpass', f0: 1200, f1: 600, q: 2, glide: 0.3, a: 0.003, d: 0.35, peak: 0.45 });
    K.sub(out, 0.5, { f0: 80, f1: 35, d: 0.4, peak: 0.6 }); crack(K, out, 0.5, { peak: 0.3, hp: 4000 });
  }, { len: 1.3, shot: true }),
  fam('ghostroot-a-whisper-break', 'Ghostroot A (whisper), part break: a cold shattering of glass, slowed and dropped in pitch, the shards played backwards into a long smeared tail.', (K) => {
    const out = K.space(K.out, { secs: 2.5, decay: 1.8, damp: 0.35, wet: 0.6 });
    crack(K, out, 0, { peak: 0.5 }); K.S(out, 0, 'glass-l', { gain: 0.7, rate: 0.45 }); K.sub(out, 0, { f0: 90, f1: 30, d: 0.6, peak: 0.7 });
    K.cloud(out, 0.05, 1.2, ['glass-h', 'glass-l'], { density: (x) => 40 * (1 - x) + 4, dur: [0.05, 0.2], rate: [0.3, 0.6], gain: 0.25, reverse: 0.7, pan: [-1, 1] });
    K.whisper(out, 0.2, 0.9, { peak: 0.15 });
  }, { len: 1.7, shot: true }),
  // Ghostroot B: a voice in the static. Formant moans, reversed tape, warble.
  fam('ghostroot-b-revenant-idle', 'Ghostroot B (revenant), idle: a voice-like moan through a radio band, warbling like stretched tape, answered by reversed fragments of itself.', (K) => {
    const out = K.space(K.out, { secs: 3.5, decay: 1.8, damp: 0.4, wet: 0.55, pre: 0.04 });
    const band = K.gain(1); K.chain(band, K.filt('highpass', 300), K.filt('lowpass', 2800, 1.2), K.shaper(2), K.gain(0.6), out);
    for (let c = 0; c < K.end; c += 6) {
      K.growl(band, c + 0.3, { f0: 165, f1: 140, dur: 2.2, vowels: ['o', 'u', 'a', 'o'], drive: 1.5, peak: 0.18, a: 0.5, jitter: 0.03 });
      K.growl(band, c + 3.2, { f0: 130, f1: 155, dur: 2.2, vowels: ['a', 'e', 'o'], drive: 1.5, peak: 0.14, a: 0.6, jitter: 0.03 });
      revInto(K, out, c + 2.9, 'shimmer', { rate: 0.5, gain: 0.25 });
    }
    K.bed(band, { color: 'white', gain: 0.02, hold: 3 });
  }, { len: 6, xfade: 1.5 }),
  fam('ghostroot-b-revenant-attack', 'Ghostroot B (revenant), attack: a strangled voice rising to a shriek over a reversed swell, cut off by a hard hit.', (K) => {
    const out = K.space(K.out, { secs: 1.6, decay: 2, damp: 0.4, wet: 0.4 });
    K.growl(K.chain(K.filt('highpass', 250), out), 0, { f0: 140, f1: 520, dur: 0.55, vowels: ['o', 'a', 'i'], drive: 3, peak: 0.25, a: 0.25, jitter: 0.05 });
    suck(K, out, 0.55, { len: 0.55, f0: 500, f1: 6000, peak: 0.2, color: 'white' });
    crack(K, out, 0.55, { peak: 0.6 }); K.S(out, 0.55, 'punch-h', { gain: 0.8, rate: 0.6 }); K.sub(out, 0.55, { f0: 100, f1: 35, d: 0.4, peak: 0.7 });
  }, { len: 1.2, shot: true }),
  fam('ghostroot-b-revenant-break', 'Ghostroot B (revenant), part break: the voice tears: it freezes into a stutter of grains, drops an octave and sinks into the static.', (K) => {
    const out = K.space(K.out, { secs: 2, decay: 2, damp: 0.4, wet: 0.5 });
    crack(K, out, 0, { peak: 0.6 }); K.S(out, 0, 'punch-h', { gain: 0.7, rate: 0.5 }); K.sub(out, 0, { f0: 85, f1: 28, d: 0.7, peak: 0.8 });
    for (let i = 0; i < 9; i++) K.growl(K.chain(K.filt('highpass', 250), out), 0.03 + i * 0.07, { f0: 300 * Math.pow(0.92, i), dur: 0.06, vowels: ['a'], drive: 4, peak: 0.25 * (1 - i / 12), a: 0.005 });
    K.growl(out, 0.7, { f0: 75, f1: 55, dur: 0.8, vowels: ['o', 'u'], drive: 2, peak: 0.15, a: 0.1 });
    K.burst(out, 0.6, { type: 'bandpass', f0: 2000, q: 0.6, a: 0.2, d: 0.6, peak: 0.08, color: 'white' });
  }, { len: 1.6, shot: true }),
];

// ---------------- tells: weight first (≤1.2 s) ----------------
const tells = [
  { id: 'tell-r2-charge-a-reverse', len: 1.2, shot: true, desc: 'Charge A: a reversed impact and a rising roar sucked inward for most of a second, then a hard locking hit with a sub thump. Something gathering, then ready.',
    build(K) { const out = K.space(K.out, { secs: 1, decay: 2.5, damp: 0.45, wet: 0.25 });
      revInto(K, out, 0.75, 'punch-h', { rate: 0.5, gain: 0.7 }); revInto(K, out, 0.75, 'metal-h', { rate: 0.4, gain: 0.35, lp: 2500 }); suck(K, out, 0.75, { len: 0.7, f0: 150, f1: 2500, peak: 0.3 });
      crack(K, out, 0.75, { peak: 0.6 }); K.S(out, 0.75, 'punch-m', { gain: 0.8, rate: 0.6 }); K.sub(out, 0.75, { f0: 110, f1: 40, d: 0.35, peak: 0.8 }); } },
  { id: 'tell-r2-charge-b-spool', len: 1.2, shot: true, desc: 'Charge B: a turbine spooling up, a growling motor climbing under a grinding granular rush that speeds up, then clamping hard with a sub hit.',
    build(K) { const out = K.space(K.out, { secs: 1, decay: 2.5, damp: 0.45, wet: 0.25 });
      K.growl(out, 0, { f0: 40, f1: 140, dur: 0.8, vowels: ['u', 'o', 'a'], drive: 6, peak: 0.3, a: 0.4, jitter: 0.03 });
      K.cloud(out, 0, 0.78, ['mining', 'metal-h'], { density: (x) => 15 + 150 * x, dur: [0.015, 0.04], rate: (x) => [0.4 + x, 0.6 + x], gain: (x) => 0.1 + 0.25 * x, lp: 3000 });
      crack(K, out, 0.8, { peak: 0.6 }); K.S(out, 0.8, 'plate-l', { gain: 0.7, rate: 0.6 }); K.sub(out, 0.8, { f0: 100, f1: 35, d: 0.35, peak: 0.8 }); } },
  { id: 'tell-r2-seal-a-blastdoor', len: 1.2, shot: true, desc: 'Seal A: a blast door slamming: crack, a huge low thump, a steel plate booming pitched down, dust falling after.',
    build(K) { const out = K.space(K.out, { secs: 1.5, decay: 2.5, damp: 0.5, wet: 0.35 });
      crack(K, out, 0, { peak: 0.6 }); K.S(out, 0, 'punch-h', { gain: 0.9, rate: 0.45 }); K.S(out, 0, 'plate-l', { gain: 0.8, rate: 0.42 }); K.S(out, 0.01, 'metal-h', { gain: 0.4, rate: 0.3, lp: 1500 });
      K.sub(out, 0, { f0: 80, f1: 28, d: 0.7, peak: 1 }); K.burst(out, 0.05, { type: 'lowpass', f0: 1200, f1: 300, glide: 0.8, a: 0.05, d: 0.8, peak: 0.12, color: 'pink' }); } },
  { id: 'tell-r2-seal-b-vacuum', len: 1.2, shot: true, desc: 'Seal B: air sucked out through a closing gap, then a heavy airtight thunk and a low pressure "whump" settling.',
    build(K) { const out = K.space(K.out, { secs: 1, decay: 2.5, damp: 0.5, wet: 0.25 });
      suck(K, out, 0.35, { len: 0.35, f0: 2500, f1: 400, peak: 0.35, color: 'white', q: 1.5 });
      crack(K, out, 0.35, { peak: 0.45, hp: 1500 }); K.S(out, 0.35, 'soft-h', { gain: 0.9, rate: 0.55 }); K.S(out, 0.35, 'plate-h', { gain: 0.4, rate: 0.5, lp: 1500 }); K.sub(out, 0.35, { f0: 70, f1: 30, d: 0.6, peak: 1 });
      K.blip(K.chain(K.filt('lowpass', 200), out), 0.45, { type: 'sawtooth', f0: 60, f1: 35, glide: 0.4, a: 0.05, d: 0.5, peak: 0.25 }); } },
  { id: 'tell-r2-mimic-a-mirror', len: 1.2, shot: true, desc: 'Mimic A: an impact, then the same impact answering back from the other side, reversed and pitched down, as if the room hit you with your own blow.',
    build(K) { const out = K.space(K.out, { secs: 1, decay: 2.5, damp: 0.45, wet: 0.3 });
      crack(K, out, 0, { peak: 0.4 }); K.S(out, 0, 'punch-m', { gain: 0.7, rate: 0.8, idx: 2, pan: -0.5 }); K.sub(out, 0, { f0: 120, f1: 50, d: 0.2, peak: 0.5 });
      revInto(K, out, 0.55, 'punch-m', { rate: 0.6, gain: 0.8, pan: 0.5 }); suck(K, out, 0.55, { len: 0.3, f0: 500, f1: 2000, peak: 0.15 });
      crack(K, out, 0.55, { peak: 0.5 }); K.S(out, 0.55, 'punch-h', { gain: 0.8, rate: 0.55, pan: 0.5 }); K.sub(out, 0.55, { f0: 90, f1: 32, d: 0.4, peak: 0.8 }); } },
  { id: 'tell-r2-mimic-b-stutter', len: 1.2, shot: true, desc: 'Mimic B: a heavy hit caught and copied: it stutters back three times, each copy crushed harder and dropped lower, ending in a deeper hit of its own.',
    build(K) { const out = K.space(K.out, { secs: 1, decay: 2.5, damp: 0.45, wet: 0.25 });
      [[0, 1, 64], [0.16, 0.85, 8], [0.28, 0.72, 5], [0.38, 0.6, 3]].forEach(([t, r, lv], i) => { const c = K.crush(lv), g = K.gain(1); K.chain(c, K.filt('lowpass', 5000 - i * 1000), g, out); K.S(c, t, 'punch-m', { gain: 0.8, rate: r, idx: 1, jitter: 0 }); });
      crack(K, out, 0.55, { peak: 0.5 }); K.S(out, 0.55, 'punch-h', { gain: 0.9, rate: 0.5 }); K.sub(out, 0.55, { f0: 90, f1: 30, d: 0.45, peak: 0.9 }); } },
  { id: 'tell-r2-compile-a-assemble', len: 1.2, shot: true, desc: 'Compile A: a dense rattle of keys and relays accelerating into a crushed roar, then executing as one heavy punch with a sub drop.',
    build(K) { const out = K.space(K.out, { secs: 1, decay: 2.5, damp: 0.45, wet: 0.25 });
      K.cloud(out, 0, 0.6, ['key', 'relay'], { density: (x) => 15 + 120 * x, dur: [0.02, 0.05], rate: [0.7, 1.1], gain: 0.35, pan: [-0.5, 0.5] });
      const c = K.crush(5); K.chain(c, K.gain(0.6), out); suck(K, c, 0.62, { len: 0.4, f0: 300, f1: 3000, peak: 0.4, color: 'white' });
      crack(K, out, 0.62, { peak: 0.6 }); K.S(out, 0.62, 'punch-h', { gain: 0.9, rate: 0.6 }); K.S(out, 0.62, 'subdrop', { gain: 0.6 }); K.sub(out, 0.62, { f0: 100, f1: 30, d: 0.45, peak: 0.8 }); } },
  { id: 'tell-r2-compile-b-surge', len: 1.2, shot: true, desc: 'Compile B: a surge of data as a rising, filtered roar with grinding underneath, slammed shut by a metal impact; heavier and darker than (a).',
    build(K) { const out = K.space(K.out, { secs: 1.2, decay: 2.5, damp: 0.5, wet: 0.3 });
      suck(K, out, 0.6, { len: 0.6, f0: 200, f1: 4000, peak: 0.3, q: 2 });
      K.growl(out, 0.05, { f0: 55, f1: 90, dur: 0.55, vowels: ['u', 'a'], drive: 6, peak: 0.2, a: 0.3 });
      K.cloud(out, 0.1, 0.6, ['scratch', 'mining'], { density: 60, dur: [0.02, 0.06], rate: [0.5, 0.8], gain: 0.2, lp: 2500 });
      crack(K, out, 0.6, { peak: 0.6 }); K.S(out, 0.6, 'plate-l', { gain: 0.8, rate: 0.5 }); K.S(out, 0.6, 'punch-m', { gain: 0.7, rate: 0.55 }); K.sub(out, 0.6, { f0: 90, f1: 30, d: 0.5, peak: 0.9 }); } },
];

// ---------------- combat re-takes: what sound.mjs plays for hurt, hurtcrit, hit and break ----------------
const combat = [
  { id: 'combat-hit-a-punch', len: 0.9, shot: true, desc: 'You hit a part (RECIPES.hit) A: a punch with a crushed transient, a short sub, and a gritty digital crunch tail. Physical first, digital second.',
    build(K) { const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.45, wet: 0.2 });
      crack(K, out, 0, { peak: 0.5 }); K.S(out, 0, 'punch-m', { gain: 0.9, rate: 0.85 }); K.sub(out, 0, { f0: 140, f1: 50, d: 0.18, peak: 0.6 });
      const c = K.crush(4); K.chain(c, K.filt('lowpass', 3000), K.gain(0.5), out); K.cloud(c, 0.02, 0.18, ['glitch'], { density: 60, dur: [0.01, 0.03], rate: [0.6, 1], gain: 0.4 }); } },
  { id: 'combat-hit-b-metal', len: 0.9, shot: true, desc: 'You hit a part (RECIPES.hit) B: harder and more metallic: punch plus a struck steel plate pitched down, a sub thump, a quick ring.',
    build(K) { const out = K.space(K.out, { secs: 0.9, decay: 3, damp: 0.45, wet: 0.22 });
      crack(K, out, 0, { peak: 0.55 }); K.S(out, 0, 'punch-h', { gain: 0.8, rate: 0.8 }); K.S(out, 0, 'plate-h', { gain: 0.55, rate: 0.65 }); K.sub(out, 0, { f0: 130, f1: 45, d: 0.22, peak: 0.7 }); } },
  { id: 'combat-break-a-crunch', len: 1.4, shot: true, desc: 'A part breaks (RECIPES.break) A: a big crunch of punch and pitch-dropped metal, glass and debris spraying out, and a sub drop beneath it.',
    build(K) { const out = K.space(K.out, { secs: 1.3, decay: 2.5, damp: 0.45, wet: 0.3 });
      crack(K, out, 0, { peak: 0.7, d: 0.03 }); K.S(out, 0, 'punch-h', { gain: 0.9, rate: 0.6 }); K.S(out, 0, 'metal-l', { gain: 0.6, rate: 0.5 }); K.S(out, 0.01, 'glass-l', { gain: 0.45, rate: 0.6 });
      K.S(out, 0, 'subdrop', { gain: 0.7 }); K.sub(out, 0, { f0: 90, f1: 28, d: 0.6, peak: 0.9 }); debris(K, out, 0.04, { len: 0.8, gain: 0.3 }); } },
  { id: 'combat-break-b-shatter', len: 1.4, shot: true, desc: 'A part breaks (RECIPES.break) B: a digital shatter with weight: a crushed impact, a burst of glassy granular shards and a falling FM-like growl.',
    build(K) { const out = K.space(K.out, { secs: 1.3, decay: 2.5, damp: 0.4, wet: 0.3 });
      const c = K.crush(6); K.chain(c, K.gain(0.7), out);
      crack(K, out, 0, { peak: 0.7 }); K.S(c, 0, 'punch-h', { gain: 0.9, rate: 0.7 }); K.S(out, 0, 'glass-l', { gain: 0.6, rate: 0.7 }); K.sub(out, 0, { f0: 100, f1: 30, d: 0.6, peak: 0.9 });
      K.cloud(out, 0.02, 0.6, ['glass-h', 'glitch'], { density: (x) => 120 * (1 - x) + 5, dur: [0.01, 0.04], rate: [0.7, 1.3], gain: 0.3, pan: [-1, 1] });
      K.growl(c, 0.05, { f0: 140, f1: 40, dur: 0.6, vowels: ['a', 'o', 'u'], drive: 8, peak: 0.2, a: 0.01 }); } },
  { id: 'combat-hurt-a-body', len: 1, shot: true, desc: 'A virus hits you (RECIPES.hurt) A: a heavy, dull body blow: low punch, soft impact, sub, and a distorted growl that feels bad rather than shrill.',
    build(K) { const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.6, wet: 0.2 });
      crack(K, out, 0, { peak: 0.35, hp: 1500 }); K.S(out, 0, 'punch-h', { gain: 0.9, rate: 0.65, lp: 2000 }); K.S(out, 0, 'soft-h', { gain: 0.9, rate: 0.75 }); K.sub(out, 0, { f0: 90, f1: 32, d: 0.4, peak: 1 });
      K.growl(K.chain(K.filt('lowpass', 900), out), 0.01, { f0: 80, f1: 45, dur: 0.35, vowels: ['a', 'u'], drive: 8, peak: 0.25, a: 0.005 }); } },
  { id: 'combat-hurt-b-static', len: 1, shot: true, desc: 'A virus hits you (RECIPES.hurt) B: the impact plus your screen taking it: a body blow torn by a burst of crushed static that drops out.',
    build(K) { const out = K.space(K.out, { secs: 0.8, decay: 3, damp: 0.6, wet: 0.2 });
      crack(K, out, 0, { peak: 0.4 }); K.S(out, 0, 'punch-h', { gain: 0.8, rate: 0.7 }); K.S(out, 0, 'soft-h', { gain: 0.7, rate: 0.8 }); K.sub(out, 0, { f0: 100, f1: 35, d: 0.35, peak: 0.9 });
      const c = K.crush(3); K.chain(c, K.filt('bandpass', 1500, 0.6), K.gain(0.6), out); K.burst(c, 0.01, { type: 'lowpass', f0: 6000, f1: 500, glide: 0.3, a: 0.002, d: 0.3, peak: 0.6 }); } },
  { id: 'combat-hurtcrit-a-buckle', len: 1.4, shot: true, desc: 'A virus crits you (RECIPES.hurtcrit) A: the body blow, then the floor dropping and metal buckling under you: long sub, pitched-down steel groan.',
    build(K) { const out = K.space(K.out, { secs: 1.3, decay: 2.5, damp: 0.55, wet: 0.3 });
      crack(K, out, 0, { peak: 0.5 }); K.S(out, 0, 'punch-h', { gain: 0.9, rate: 0.55 }); K.S(out, 0, 'soft-h', { gain: 0.8, rate: 0.65 }); K.S(out, 0.01, 'subdrop', { gain: 0.8 }); K.sub(out, 0, { f0: 80, f1: 25, d: 0.8, peak: 1 });
      K.S(out, 0.05, 'metal-l', { gain: 0.6, rate: 0.3, lp: 1500 }); K.S(out, 0.1, 'scratch', { gain: 0.35, rate: 0.3, lp: 1200 });
      K.growl(K.chain(K.filt('lowpass', 800), out), 0.02, { f0: 70, f1: 35, dur: 0.7, vowels: ['a', 'o', 'u'], drive: 8, peak: 0.25, a: 0.005 }); } },
  { id: 'combat-hurtcrit-b-rupture', len: 1.4, shot: true, desc: 'A virus crits you (RECIPES.hurtcrit) B: a double blow, the second harder, with a crushed static rupture and a sub that keeps falling.',
    build(K) { const out = K.space(K.out, { secs: 1.3, decay: 2.5, damp: 0.55, wet: 0.28 });
      crack(K, out, 0, { peak: 0.4 }); K.S(out, 0, 'punch-m', { gain: 0.7, rate: 0.7 }); K.sub(out, 0, { f0: 110, f1: 50, d: 0.12, peak: 0.6 });
      crack(K, out, 0.12, { peak: 0.6 }); K.S(out, 0.12, 'punch-h', { gain: 1, rate: 0.5 }); K.S(out, 0.12, 'mining', { gain: 0.5, rate: 0.45 }); K.sub(out, 0.12, { f0: 90, f1: 22, glide: 0.6, d: 0.8, peak: 1 });
      const c = K.crush(3); K.chain(c, K.filt('lowpass', 3000), K.gain(0.5), out); K.burst(c, 0.13, { type: 'bandpass', f0: 3000, f1: 300, q: 0.8, glide: 0.5, a: 0.002, d: 0.5, peak: 0.6 }); } },
];

export const GROUPS2 = { floors, families, tells, combat };

// BLACKBOX sound. Two layers of voices:
//   RECIPES  real recorded CC0 samples (dist/sfx, see CREDITS.md), layered and pitched a little
//            differently every time, played through a small room so they sit in one space.
//            The palette is old hardware: thumps and metal for hits, relays for the clock,
//            mechanical keys for the prompt, a modem for daemons, a CRT humming underneath.
//   VOICES   small synthesized voices. They fill in whatever the samples lack (sub weight,
//            digital blips, chimes) and stand in for everything until the samples have loaded.
// Voices take any AudioContext and a start time, which is how `renderBoard()` bounces them to a
// WAV for listening offline.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note → Hz

// ---------- building blocks ----------
function env(g, t, { a = 0.003, peak = 1, d = 0.2, sustain = 0.0001 }) {
  g.gain.value = 0; // silent until the envelope starts, or a sample of rounding lets a full-volume click through
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t + a + d);
}
function osc(ctx, out, t, { type = 'sine', f0, f1 = f0, glide = 0.1, a, peak, d, detune = 0 }) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.detune.value = detune;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
  env(g, t, { a, peak, d });
  o.connect(g).connect(out);
  o.start(t); o.stop(t + (a || 0.003) + d + 0.05);
}
let noiseCache = new WeakMap();
function noiseBuf(ctx) {
  if (!noiseCache.has(ctx)) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate);
    const ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, b);
  }
  return noiseCache.get(ctx);
}
function noise(ctx, out, t, { type = 'bandpass', f0 = 2000, f1 = f0, q = 1, glide = 0.1, a = 0.002, peak = 0.5, d = 0.08 }) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf(ctx);
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + glide);
  env(g, t, { a, peak, d });
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5); src.stop(t + a + d + 0.05);
}
function crusher(ctx, amount = 12) {
  const w = ctx.createWaveShaper(), n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * amount) / Math.tanh(amount); }
  w.curve = curve;
  return w;
}
// A short echo for chimes: they ring a little, like a terminal bell in a room.
function echo(ctx, out, { time = 0.13, feedback = 0.28, wet = 0.35 }) {
  const input = ctx.createGain(), d = ctx.createDelay(1), fb = ctx.createGain(), w = ctx.createGain(), lp = ctx.createBiquadFilter();
  d.delayTime.value = time; fb.gain.value = feedback; w.gain.value = wet; lp.type = 'lowpass'; lp.frequency.value = 3200;
  input.connect(out);
  input.connect(d); d.connect(lp).connect(fb).connect(d); lp.connect(w).connect(out);
  // A live context would keep the loop around forever: cut it once the ring has died.
  if (typeof OfflineAudioContext === 'undefined' || !(ctx instanceof OfflineAudioContext)) setTimeout(() => { for (const n of [input, d, fb, w, lp]) n.disconnect(); }, 3000);
  return input;
}
// One chime note: a sine with a soft triangle an octave up and a tiny attack click.
function chime(ctx, out, t, midi, { d = 0.5, peak = 0.32 } = {}) {
  osc(ctx, out, t, { type: 'sine', f0: NOTE(midi), a: 0.004, peak, d });
  osc(ctx, out, t, { type: 'triangle', f0: NOTE(midi + 12), a: 0.004, peak: peak * 0.22, d: d * 0.6, detune: 4 });
  noise(ctx, out, t, { type: 'highpass', f0: 6000, a: 0.001, peak: 0.05, d: 0.015 });
}

// ---------- the voices ----------
export const VOICES = {
  // Fired inside the Sync Window: a quick bright lock-on chirp.
  sync(ctx, out, t) {
    osc(ctx, out, t, { type: 'triangle', f0: 1320, f1: 1760, glide: 0.05, a: 0.002, peak: 0.16, d: 0.1 });
    osc(ctx, out, t + 0.05, { type: 'sine', f0: 2640, f1: 2640, glide: 0, a: 0.002, peak: 0.08, d: 0.08 });
  },
  // You hit a part. Deeper and heavier the more damage it did (amount ~10–80).
  hit(ctx, out, t, { amount = 25 } = {}) {
    const k = Math.min(1, Math.max(0, (amount - 10) / 60));
    osc(ctx, out, t, { type: 'sine', f0: 260 - 90 * k, f1: 70, glide: 0.09, a: 0.002, peak: 0.38 + 0.3 * k, d: 0.13 + 0.08 * k });
    // the digital bite, so it reads on laptop speakers too
    const bite = crusher(ctx, 5), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 2600; g.gain.value = 0.5;
    bite.connect(lp).connect(g).connect(out);
    osc(ctx, bite, t, { type: 'square', f0: 520 - 160 * k, f1: 180, glide: 0.05, a: 0.001, peak: 0.22, d: 0.06 });
    noise(ctx, out, t, { type: 'bandpass', f0: 3200, f1: 1200, q: 0.9, glide: 0.05, peak: 0.28 + 0.2 * k, d: 0.045 });
  },
  // Your skill missed: an empty whiff of air, nothing lands.
  miss(ctx, out, t) {
    noise(ctx, out, t, { type: 'bandpass', f0: 2600, f1: 700, q: 1.2, glide: 0.18, a: 0.02, peak: 0.28, d: 0.18 });
  },
  // An attack missed you: a quick sidestep whoosh with a light tick.
  evade(ctx, out, t) {
    noise(ctx, out, t, { type: 'bandpass', f0: 700, f1: 3200, q: 1.5, glide: 0.14, a: 0.015, peak: 0.3, d: 0.14 });
    osc(ctx, out, t + 0.12, { type: 'sine', f0: 1500, a: 0.002, peak: 0.12, d: 0.05 });
  },
  // Your hit crit: the heaviest hit, plus a bright ringing snap on top.
  crit(ctx, out, t, { amount = 50 } = {}) {
    VOICES.hit(ctx, out, t, { amount: Math.max(amount, 70) });
    osc(ctx, out, t + 0.01, { type: 'triangle', f0: 1760, f1: 1320, glide: 0.08, a: 0.001, peak: 0.2, d: 0.16 });
    osc(ctx, out, t + 0.01, { type: 'sine', f0: 2640, a: 0.001, peak: 0.1, d: 0.12, detune: 8 });
    noise(ctx, out, t, { type: 'highpass', f0: 5000, a: 0.001, peak: 0.16, d: 0.05 });
  },
  // An enemy crit you: the hurt, with a lower, longer crunch under it.
  hurtcrit(ctx, out, t) {
    VOICES.hurt(ctx, out, t);
    const dirt = crusher(ctx, 14), g = ctx.createGain(); g.gain.value = 0.4; dirt.connect(g).connect(out);
    osc(ctx, dirt, t + 0.02, { type: 'sawtooth', f0: 60, f1: 30, glide: 0.35, a: 0.004, peak: 0.6, d: 0.42 });
  },
  // A part broke: a crunchy collapse with a glassy scatter on top.
  break(ctx, out, t) {
    osc(ctx, out, t, { type: 'sine', f0: 140, f1: 38, glide: 0.35, a: 0.003, peak: 0.7, d: 0.42 });
    const dirt = crusher(ctx, 6); const g = ctx.createGain(); g.gain.value = 0.5; dirt.connect(g).connect(out);
    noise(ctx, dirt, t, { type: 'lowpass', f0: 7000, f1: 300, q: 2, glide: 0.35, a: 0.002, peak: 0.5, d: 0.4 });
    [0.03, 0.07, 0.12].forEach((dt, i) => osc(ctx, out, t + dt, { type: 'sine', f0: NOTE(96 - i * 5 + Math.floor(Math.random() * 3)), a: 0.001, peak: 0.07, d: 0.18 }));
  },
  // Something hit YOU: a dull, distorted impact. It should feel bad, not shrill.
  hurt(ctx, out, t) {
    const dirt = crusher(ctx, 9), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 900; g.gain.value = 0.55;
    dirt.connect(lp).connect(g).connect(out);
    osc(ctx, dirt, t, { type: 'sawtooth', f0: 96, f1: 44, glide: 0.22, a: 0.004, peak: 0.6, d: 0.3 });
    osc(ctx, out, t, { type: 'sine', f0: 70, f1: 40, glide: 0.2, a: 0.003, peak: 0.5, d: 0.3 });
    noise(ctx, out, t, { type: 'lowpass', f0: 1400, f1: 200, glide: 0.2, peak: 0.3, d: 0.18 });
  },
  // The Encryptor locked more of you: three falling digital steps and a heavy latch.
  encrypt(ctx, out, t) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.connect(out);
    [0, 0.07, 0.14].forEach((dt, i) => osc(ctx, lp, t + dt, { type: 'square', f0: [392, 311, 233][i], a: 0.003, peak: 0.16, d: 0.06 }));
    osc(ctx, out, t + 0.21, { type: 'sine', f0: 90, f1: 45, glide: 0.15, a: 0.003, peak: 0.5, d: 0.22 });
    noise(ctx, out, t + 0.21, { type: 'bandpass', f0: 900, q: 3, a: 0.001, peak: 0.2, d: 0.05 });
  },
  // Encryption eating you this cycle: a small muffled thud, much softer than a hit.
  drain(ctx, out, t) {
    osc(ctx, out, t, { type: 'sine', f0: 80, f1: 50, glide: 0.1, a: 0.004, peak: 0.3, d: 0.14 });
    noise(ctx, out, t, { type: 'lowpass', f0: 700, f1: 200, glide: 0.1, peak: 0.12, d: 0.08 });
  },
  // Your sensors got scrambled: a burst of static that sweeps down.
  blind(ctx, out, t) {
    const dirt = crusher(ctx, 4); const g = ctx.createGain(); g.gain.value = 0.4; dirt.connect(g).connect(out);
    noise(ctx, dirt, t, { type: 'bandpass', f0: 5000, f1: 400, q: 1.5, glide: 0.3, a: 0.01, peak: 0.5, d: 0.32 });
    osc(ctx, out, t, { type: 'square', f0: 1400, f1: 300, glide: 0.25, a: 0.003, peak: 0.05, d: 0.25 });
  },
  // An armor chit broke: a bright metallic clink, lighter than a hit.
  chit(ctx, out, t) {
    osc(ctx, out, t, { type: 'triangle', f0: 2200, f1: 1500, glide: 0.05, a: 0.001, peak: 0.22, d: 0.12 });
    osc(ctx, out, t, { type: 'sine', f0: 3300, a: 0.001, peak: 0.1, d: 0.09, detune: 12 });
    noise(ctx, out, t, { type: 'bandpass', f0: 5000, q: 3, a: 0.001, peak: 0.18, d: 0.03 });
  },
  // A bare part patched itself: a quick rising re-lock, a little ominous.
  patch(ctx, out, t) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.connect(out);
    osc(ctx, lp, t, { type: 'square', f0: 220, a: 0.004, peak: 0.12, d: 0.07 });
    osc(ctx, lp, t + 0.07, { type: 'square', f0: 330, a: 0.004, peak: 0.12, d: 0.1 });
    noise(ctx, out, t + 0.07, { type: 'bandpass', f0: 1600, q: 5, a: 0.001, peak: 0.1, d: 0.03 });
  },
  // You pushed an attack back: a quick upward swipe and a pop.
  interrupt(ctx, out, t) {
    noise(ctx, out, t, { type: 'bandpass', f0: 500, f1: 4000, q: 2.5, glide: 0.12, a: 0.02, peak: 0.4, d: 0.12 });
    osc(ctx, out, t + 0.1, { type: 'sine', f0: 1200, f1: 700, glide: 0.05, a: 0.002, peak: 0.28, d: 0.08 });
  },
  // The virus adapted: a low growl that swells.
  escalate(ctx, out, t) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6;
    lp.frequency.setValueAtTime(150, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.35);
    const g = ctx.createGain(); g.gain.value = 0.5; lp.connect(g).connect(out);
    osc(ctx, lp, t, { type: 'sawtooth', f0: 55, a: 0.12, peak: 0.5, d: 0.35 });
    osc(ctx, lp, t, { type: 'sawtooth', f0: 55, a: 0.12, peak: 0.5, d: 0.35, detune: 18 });
  },
  // Your command was refused: two soft low blips.
  nope(ctx, out, t) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200; lp.connect(out);
    osc(ctx, lp, t, { type: 'square', f0: 196, a: 0.003, peak: 0.2, d: 0.06 });
    osc(ctx, lp, t + 0.09, { type: 'square', f0: 165, a: 0.003, peak: 0.2, d: 0.08 });
  },
  // Time's nearly up and something lands: a soft two-tone tick.
  prewarn(ctx, out, t) {
    osc(ctx, out, t, { type: 'sine', f0: 988, a: 0.002, peak: 0.22, d: 0.07 });
    osc(ctx, out, t + 0.12, { type: 'sine', f0: 988, a: 0.002, peak: 0.17, d: 0.07 });
  },
  // You switched screens: an old TV changing channel. The tuner clunks, a burst of static
  // sweeps through the dial, and the tube's thin whine settles as the picture locks.
  channel(ctx, out, t) {
    noise(ctx, out, t, { type: 'lowpass', f0: 900, a: 0.001, peak: 0.28, d: 0.03 }); // the knob's clunk
    osc(ctx, out, t, { type: 'square', f0: 140, f1: 70, glide: 0.03, a: 0.001, peak: 0.08, d: 0.04 });
    noise(ctx, out, t + 0.02, { type: 'bandpass', f0: 700, f1: 5200, q: 0.8, glide: 0.16, a: 0.006, peak: 0.16, d: 0.17 }); // static sweeping the dial
    noise(ctx, out, t + 0.05, { type: 'highpass', f0: 7000, a: 0.004, peak: 0.05, d: 0.12 });
    osc(ctx, out, t + 0.16, { type: 'sine', f0: 9400, f1: 9800, glide: 0.2, a: 0.02, peak: 0.018, d: 0.26 }); // the flyback whine
  },
  // The pager: a piezo beeper's two quick chirps (three, higher, for an alert).
  pager(ctx, out, t, { alert = false } = {}) {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = alert ? 3300 : 2900; bp.Q.value = 3; bp.connect(out);
    (alert ? [0, 0.1, 0.2] : [0, 0.11]).forEach((dt) => osc(ctx, bp, t + dt, { type: 'square', f0: alert ? 3300 : 2900, a: 0.002, peak: 0.07, d: 0.06 }));
  },
  // A cycle resolved: a barely-there relay click.
  cycle(ctx, out, t) { noise(ctx, out, t, { type: 'highpass', f0: 3500, a: 0.001, peak: 0.02, d: 0.012 }); },
  // A daemon acted for you: a soft blip, a little like a modem chirp.
  daemon(ctx, out, t) { osc(ctx, out, t, { type: 'triangle', f0: 740, f1: 1100, glide: 0.06, a: 0.004, peak: 0.2, d: 0.08 }); },
  // Small good news (trace, scan, a lead, equipping): one warm note.
  good(ctx, out, t) { const e = echo(ctx, out, {}); chime(ctx, e, t, 81, { d: 0.35, peak: 0.36 }); },
  // Unlocking (a vault, a door, an upgrade) and loot: a rising pair that resolves.
  unlock(ctx, out, t) {
    const e = echo(ctx, out, {});
    noise(ctx, out, t, { type: 'bandpass', f0: 1800, q: 4, a: 0.001, peak: 0.12, d: 0.03 }); // the latch
    chime(ctx, e, t + 0.04, 76, { d: 0.35, peak: 0.42 });
    chime(ctx, e, t + 0.13, 83, { d: 0.6, peak: 0.46 });
  },
  // You took something: a quick bright pickup.
  pickup(ctx, out, t) {
    const e = echo(ctx, out, { wet: 0.25 });
    chime(ctx, e, t, 84, { d: 0.18, peak: 0.38 });
    chime(ctx, e, t + 0.06, 88, { d: 0.3, peak: 0.38 });
  },
  // A fight won or a level gained: a major arpeggio with a shimmer.
  win(ctx, out, t) {
    const e = echo(ctx, out, { feedback: 0.35, wet: 0.4 });
    [72, 76, 79, 84].forEach((m, i) => chime(ctx, e, t + i * 0.09, m, { d: i === 3 ? 1.0 : 0.4, peak: 0.5 }));
    noise(ctx, e, t + 0.27, { type: 'highpass', f0: 7000, a: 0.08, peak: 0.05, d: 0.6 });
  },
  // Crash or disconnect: the screen powering down.
  lose(ctx, out, t) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, t); lp.frequency.exponentialRampToValueAtTime(120, t + 0.8);
    lp.connect(out);
    osc(ctx, lp, t, { type: 'sawtooth', f0: 330, f1: 30, glide: 0.8, a: 0.005, peak: 0.45, d: 0.85 });
    noise(ctx, lp, t, { type: 'lowpass', f0: 4000, a: 0.005, peak: 0.2, d: 0.7 });
  },
};

// ---------- the samples ----------
// How many takes of each sound ship in dist/sfx (<name>-<n>.wav).
export const BANK = {
  'punch-m': 5, 'punch-h': 5, 'soft-h': 4, 'soft-m': 3, 'metal-h': 4, 'metal-l': 3, 'plate-l': 4, 'plate-h': 3,
  'glass-l': 4, 'glass-h': 3, mining: 3, tin: 3, bell: 1, whoosh: 3, subdrop: 1, shimmer: 1, glitch: 4, scratch: 3,
  error: 2, tick: 3, confirm: 2, drop: 2, pluck: 2, glassui: 3, bong: 1, relay: 6, click: 4, key: 12, 'key-enter': 1, 'key-back': 1,
};
const banks = new WeakMap(); // AudioContext → { ready, buffers: Map(name → AudioBuffer[]) }
function loadBank(ctx, base = new URL('./sfx/', import.meta.url)) {
  if (banks.has(ctx)) return banks.get(ctx).loading;
  const bank = { ready: false, buffers: new Map() };
  bank.loading = Promise.all(Object.entries(BANK).flatMap(([name, n]) => Array.from({ length: n }, async (_, i) => {
    try {
      const res = await fetch(new URL(`${name}-${i}.wav`, base));
      if (!res.ok) return;
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      const list = bank.buffers.get(name) || [];
      list[i] = buf;
      bank.buffers.set(name, list);
    } catch { /* that take stays missing */ }
  }))).then(() => { bank.ready = bank.buffers.size > 0; return bank; });
  banks.set(ctx, bank);
  return bank.loading;
}
const last = {}; // the take each sound used last, so repeats never play the same one twice in a row
function take(list, name) {
  const ok = list.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
  if (!ok.length) return null;
  let i = ok[Math.floor(Math.random() * ok.length)];
  if (ok.length > 1 && i === last[name]) i = ok[(ok.indexOf(i) + 1) % ok.length];
  last[name] = i;
  return list[i];
}
// One sample into `out`: gain, pitch (rate, with a little jitter so no two plays are identical),
// optional filters, and an offset `at` seconds after t.
function sample(ctx, out, t, name, { gain = 1, rate = 1, jitter = 0.04, lp, hp, at = 0 } = {}) {
  const list = banks.get(ctx)?.buffers.get(name);
  const buf = list && take(list, name);
  if (!buf) return;
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buf;
  src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * jitter);
  g.gain.value = gain;
  let node = src;
  for (const [type, f] of [['lowpass', lp], ['highpass', hp]]) {
    if (!f) continue;
    const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = 0.5;
    node.connect(b); node = b;
  }
  node.connect(g).connect(out);
  src.start(t + at);
}

// A modem talking: frequency-shift chatter between two tones, band-limited like a phone line.
function modem(ctx, out, t, { dur = 0.1, lo = 1070, hi = 1270, baud = 90, peak = 0.12 } = {}) {
  const o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'square'; bp.type = 'bandpass'; bp.frequency.value = (lo + hi) / 2; bp.Q.value = 1.2;
  const steps = Math.max(2, Math.round(dur * baud));
  for (let i = 0; i < steps; i++) o.frequency.setValueAtTime(Math.random() < 0.5 ? lo : hi, t + (i * dur) / steps);
  env(g, t, { a: 0.004, peak, d: dur, sustain: peak * 0.6 });
  o.connect(bp).connect(g).connect(out);
  o.start(t); o.stop(t + dur + 0.06);
}

// ---------- the recipes: what each event sounds like with the samples in ----------
// room: how much of the voice goes to the reverb. Each play(ctx, out, t, opts, S) layers samples
// (S(name, at, opts)) and synth building blocks into `out`.
const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const RECIPES = {
  // Fired inside the Sync Window: a tight, bright lock-on over the hit.
  sync: { room: 0.14, play(ctx, out, t, o, S) {
    S('glassui', 0, { gain: 0.5, rate: 1.3 });
    S('tick', 0.01, { gain: 0.4, rate: 1.6 });
    osc(ctx, out, t, { type: 'triangle', f0: 1320, f1: 1760, glide: 0.06, a: 0.002, peak: 0.12, d: 0.12 });
  } },
  // You hit a part: a punch with a sub thump under it. Bigger hits land lower and heavier.
  // Your hit landed: all synthesized and bit-crushed, so it sounds like something inside a machine.
  // An impact, a falling cascade of data blips, an FM growl, then digital pings through crushed
  // echoes. Bigger hits are longer and heavier. A crit is the fullest version.
  hit: { room: 0.1, play(ctx, out, t, { amount = 12 } = {}) {
    digitalHit(ctx, out, t, clamp01(Math.log(Math.max(1, amount) / 4) / Math.log(12)), false);
  } },
  crit: { room: 0.1, play(ctx, out, t) { digitalHit(ctx, out, t, 1, true); } },
  // An armor chit broke: a plate cracks and glass shatters off it, with a bright snap on top.
  chit: { room: 0.16, play(ctx, out, t, o, S) {
    S('plate-h', 0, { gain: 0.9, rate: 1.15 });
    S('glass-l', 0.008, { gain: 0.6, rate: 1.25 });
    S('tin', 0.02, { gain: 0.3, rate: 1.4, lp: 9000 });
    S('metal-l', 0.004, { gain: 0.35, rate: 1.5 });
    osc(ctx, out, t, { type: 'square', f0: 2400, f1: 900, glide: 0.05, a: 0.001, peak: 0.08, d: 0.06 });
  } },
  // A part broke: metal gives, glass scatters, the floor drops out, a burst of bad data.
  break: { room: 0.26, play(ctx, out, t, o, S) {
    S('metal-h', 0, { gain: 0.85, rate: 0.8 });
    S('glass-h', 0.012, { gain: 0.6 });
    S('mining', 0.02, { gain: 0.4, rate: 0.9 });
    S('subdrop', 0, { gain: 0.65 });
    S('glitch', 0.06, { gain: 0.35 }); S('glitch', 0.1, { gain: 0.25, rate: 0.8 });
  } },
  // Something hit YOU: a heavy, dull body blow. It should feel bad, and worse the bigger it is.
  hurt: { room: 0.1, play(ctx, out, t, { frac = 0.08 } = {}, S) {
    const k = clamp01(frac * 5);
    S('soft-h', 0, { gain: 1, rate: 0.9 - 0.1 * k });
    S('punch-h', 0, { gain: 0.5 + 0.3 * k, rate: 0.72 - 0.08 * k, lp: 1400 });
    if (k > 0.4) S('subdrop', 0.005, { gain: 0.3 + 0.4 * (k - 0.4) });
    S('glitch', 0.03, { gain: 0.12 + 0.15 * k, lp: 3000 });
    const dirt = crusher(ctx, 8), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 700; g.gain.value = 0.3 + 0.15 * k;
    dirt.connect(lp).connect(g).connect(out);
    osc(ctx, dirt, t, { type: 'sawtooth', f0: 90, f1: 42, glide: 0.2, a: 0.004, peak: 0.6, d: 0.26 + 0.1 * k });
  } },
  // An enemy crit you: the hurt, plus the floor dropping and metal buckling.
  hurtcrit: { room: 0.2, play(ctx, out, t, o, S) {
    RECIPES.hurt.play(ctx, out, t, o, S);
    S('subdrop', 0.01, { gain: 0.8 });
    S('metal-h', 0.02, { gain: 0.45, rate: 0.6, lp: 1800 });
  } },
  // Your skill missed: air.
  miss: { room: 0.08, play(ctx, out, t, o, S) { S('whoosh', 0, { gain: 0.4, rate: 0.9, lp: 6000 }); } },
  // An attack missed you: a fast sidestep and a light tick.
  evade: { room: 0.08, play(ctx, out, t, o, S) {
    S('whoosh', 0, { gain: 0.45, rate: 1.35, lp: 7000 });
    S('tick', 0.1, { gain: 0.3 });
  } },
  // The Encryptor locked more of you: three falling digital steps, then a heavy latch.
  encrypt: { room: 0.16, play(ctx, out, t, o, S) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.connect(out);
    [0, 0.07, 0.14].forEach((dt, i) => osc(ctx, lp, t + dt, { type: 'square', f0: [392, 311, 233][i], a: 0.003, peak: 0.12, d: 0.06 }));
    S('plate-h', 0.21, { gain: 0.7, rate: 0.75 });
    S('relay', 0.2, { gain: 0.45, rate: 0.7 });
  } },
  // Encryption eating you this cycle: a small muffled thud, much softer than a hit.
  drain: { room: 0.06, play(ctx, out, t, o, S) { S('soft-m', 0, { gain: 0.5, rate: 0.8, lp: 900 }); } },
  // Your sensors got scrambled: static tearing through, broken data spitting out.
  blind: { room: 0.14, play(ctx, out, t, o, S) {
    S('scratch', 0, { gain: 0.45, rate: 0.8 });
    [0.03, 0.09, 0.16, 0.22].forEach((at, i) => S('glitch', at, { gain: 0.35 - i * 0.05, rate: 1 - i * 0.1 }));
    const dirt = crusher(ctx, 4), g = ctx.createGain(); g.gain.value = 0.3; dirt.connect(g).connect(out);
    noise(ctx, dirt, t, { type: 'bandpass', f0: 5000, f1: 400, q: 1.5, glide: 0.3, a: 0.01, peak: 0.5, d: 0.32 });
  } },
  // A bare part patched itself: a rising re-lock and a tin clack. A little ominous.
  patch: { room: 0.12, play(ctx, out, t, o, S) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.connect(out);
    osc(ctx, lp, t, { type: 'square', f0: 220, a: 0.004, peak: 0.09, d: 0.07 });
    osc(ctx, lp, t + 0.07, { type: 'square', f0: 330, a: 0.004, peak: 0.09, d: 0.1 });
    S('tin', 0.07, { gain: 0.75, rate: 1.1 });
  } },
  // You pushed an attack back (or blocked it): a swing and a clang as it glances off.
  interrupt: { room: 0.16, play(ctx, out, t, o, S) {
    S('whoosh', 0, { gain: 0.3, rate: 1.5, lp: 6000 });
    S('metal-l', 0.07, { gain: 0.5, rate: 0.95 });
    S('relay', 0.07, { gain: 0.25 });
  } },
  // The virus adapted: a low growl that swells, and something heavy shifting.
  escalate: { room: 0.22, play(ctx, out, t, o, S) {
    VOICES.escalate(ctx, out, t);
    S('mining', 0.05, { gain: 0.35, rate: 0.55, lp: 1200 });
  } },
  // Your command was refused: a dull error and a relay that won't catch.
  nope: { room: 0.05, play(ctx, out, t, o, S) {
    S('error', 0, { gain: 0.6, rate: 0.85 });
    S('relay', 0, { gain: 0.3, rate: 0.6 });
  } },
  // Time's nearly up and something lands: a two-tone tick, clear on any speaker.
  prewarn: { room: 0.05, play(ctx, out, t, o, S) {
    osc(ctx, out, t, { type: 'sine', f0: 988, a: 0.002, peak: 0.16, d: 0.07 });
    osc(ctx, out, t + 0.12, { type: 'sine', f0: 988, a: 0.002, peak: 0.12, d: 0.07 });
    S('tick', 0, { gain: 0.35 }); S('tick', 0.12, { gain: 0.28 });
  } },
  // You switched screens: an old TV changing channel. The tuner clunks, static sweeps the dial,
  // and the tube's thin whine settles as the picture locks.
  channel: { room: 0.1, play(ctx, out, t, o, S) {
    S('relay', 0, { gain: 0.6, rate: 0.65 });
    noise(ctx, out, t + 0.02, { type: 'bandpass', f0: 700, f1: 5200, q: 0.8, glide: 0.16, a: 0.006, peak: 0.13, d: 0.17 });
    noise(ctx, out, t + 0.05, { type: 'highpass', f0: 7000, a: 0.004, peak: 0.04, d: 0.12 });
    osc(ctx, out, t + 0.16, { type: 'sine', f0: 9400, f1: 9800, glide: 0.2, a: 0.02, peak: 0.014, d: 0.26 });
  } },
  // The pager went off: the piezo chirps, and the plastic case rattles on the desk.
  pager: { room: 0.06, play(ctx, out, t, o, S) {
    VOICES.pager(ctx, out, t, o);
    S('click', 0, { gain: 0.12, rate: 1.6, lp: 5000 });
  } },
  // A cycle resolved: the clock relay ticks over. Felt more than heard.
  cycle: { room: 0.04, play(ctx, out, t, o, S) { S('relay', 0, { gain: 0.16, rate: 0.85, lp: 6000 }); } },
  // A daemon acted for you: a short burst of modem chatter and a pluck.
  daemon: { room: 0.1, play(ctx, out, t, o, S) {
    modem(ctx, out, t, { dur: 0.09, peak: 0.08 });
    S('pluck', 0.08, { gain: 0.35, rate: 0.9 });
  } },
  // You jacked in: the modem handshake (answer tone, chatter), a relay, and it's open.
  jackin: { room: 0.14, play(ctx, out, t, o, S) {
    osc(ctx, out, t, { type: 'sine', f0: 2100, a: 0.01, peak: 0.07, d: 0.16 });
    modem(ctx, out, t + 0.18, { dur: 0.22, lo: 980, hi: 1650, baud: 140, peak: 0.08 });
    noise(ctx, out, t + 0.18, { type: 'bandpass', f0: 1800, q: 0.7, a: 0.01, peak: 0.05, d: 0.22 });
    S('relay', 0.42, { gain: 0.55, rate: 0.7 });
    RECIPES.unlock.play(ctx, out, t + 0.46, o, S);
  } },
  // You jacked out: the line drops, a relay lets go, the carrier dies away.
  hangup: { room: 0.12, play(ctx, out, t, o, S) {
    S('relay', 0, { gain: 0.55, rate: 0.6 });
    osc(ctx, out, t + 0.03, { type: 'sine', f0: 2100, f1: 900, glide: 0.25, a: 0.004, peak: 0.05, d: 0.25 });
    noise(ctx, out, t + 0.03, { type: 'bandpass', f0: 1800, f1: 500, q: 0.8, glide: 0.25, a: 0.004, peak: 0.05, d: 0.25 });
  } },
  // Small good news (a trace, a lead, equipping, a proc): one warm note on glass.
  good: { room: 0.22, play(ctx, out, t, o, S) {
    S('glassui', 0, { gain: 0.55 });
    chime(ctx, out, t, 81, { d: 0.35, peak: 0.2 });
  } },
  // Unlocking (a vault, a door, an upgrade) and loot: the latch gives, then a rising pair.
  unlock: { room: 0.24, play(ctx, out, t, o, S) {
    S('relay', 0, { gain: 0.5, rate: 0.8 });
    S('bong', 0.02, { gain: 0.35 });
    chime(ctx, out, t + 0.04, 76, { d: 0.35, peak: 0.3 });
    chime(ctx, out, t + 0.13, 83, { d: 0.6, peak: 0.32 });
  } },
  // You took something: it drops into your pack.
  pickup: { room: 0.16, play(ctx, out, t, o, S) {
    S('drop', 0, { gain: 0.6 });
    S('glassui', 0.05, { gain: 0.3, rate: 1.2 });
  } },
  // A fight won or a level gained: a major arpeggio, a shimmer, a bell far off.
  win: { room: 0.3, play(ctx, out, t, o, S) {
    [72, 76, 79, 84].forEach((m, i) => chime(ctx, out, t + i * 0.09, m, { d: i === 3 ? 1.0 : 0.4, peak: 0.36 }));
    S('confirm', 0, { gain: 0.35 });
    S('shimmer', 0.2, { gain: 0.3 });
    S('bell', 0.27, { gain: 0.16, rate: 2, jitter: 0 });
  } },
  // Crash or disconnect: the set powering down hard.
  lose: { room: 0.3, play(ctx, out, t, o, S) {
    VOICES.lose(ctx, out, t);
    S('metal-h', 0, { gain: 0.5, rate: 0.55 });
    S('subdrop', 0, { gain: 0.8 });
    S('glitch', 0.05, { gain: 0.3 });
  } },
};

// Keys on the prompt: a mechanical board, and a heavier Enter.
const KEYS = {
  char: (S) => S('key', 0, { gain: 0.3, jitter: 0.06 }),
  enter: (S) => { S('key-enter', 0, { gain: 0.42 }); S('key', 0, { gain: 0.12, rate: 0.75 }); },
  back: (S) => S('key-back', 0, { gain: 0.3 }),
  click: (S) => S('click', 0, { gain: 0.2, rate: 0.85 }), // a button pressed
};

// ---------- the room ----------
// A small, hard room: a few early reflections and a short dark tail, so layers share one space.
function roomIR(ctx, seconds = 0.5) {
  const sr = ctx.sampleRate, n = Math.floor(sr * seconds), b = ctx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      lp += 0.35 * ((Math.random() * 2 - 1) - lp); // darker than white noise
      d[i] = lp * Math.pow(1 - i / n, 2.6) * Math.exp(-i / (sr * 0.12));
    }
    for (const [ms, g] of [[7, 0.5], [13, 0.35], [19 + c * 3, 0.28], [29, 0.2]]) d[Math.floor((sr * ms) / 1000)] += g * (c ? -1 : 1);
  }
  return b;
}

// An electrical zap: noise through a falling band-pass, chopped by a 120 Hz buzz.
function zap(ctx, out, t, { dur = 0.1, peak = 0.3, f0 = 3800, f1 = 800 } = {}) {
  const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), chop = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
  src.buffer = noiseBuf(ctx);
  bp.type = 'bandpass'; bp.Q.value = 2.5;
  bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(Math.max(80, f1), t + dur);
  lfo.type = 'square'; lfo.frequency.value = 120; depth.gain.value = 0.5; chop.gain.value = 0.5;
  lfo.connect(depth).connect(chop.gain);
  env(g, t, { a: 0.002, peak, d: dur });
  src.connect(bp).connect(chop).connect(g).connect(out);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  lfo.start(t); lfo.stop(t + dur + 0.05);
}
// A stutter of short square blips falling in pitch, like data spilling out.
function chirps(ctx, out, t, { n = 4, from = 2600, to = 500, peak = 0.06, step = 0.019 } = {}) {
  for (let i = 0; i < n; i++) {
    const f = from * Math.pow(to / from, n > 1 ? i / (n - 1) : 0) * (0.94 + Math.random() * 0.12);
    osc(ctx, out, t + i * step, { type: 'square', f0: f, f1: f * 0.92, glide: 0.012, a: 0.001, peak: peak * (1 - i / (n * 1.6)), d: 0.014 });
  }
}

// ---- the digital hit (voiced in RECIPES.hit / RECIPES.crit): nothing recorded, all synthesized and quantized ----
const curves = new Map(), sahCache = new WeakMap();
// A bit-crusher: a staircase transfer curve, so whatever goes through it is coarse and grainy.
function crushBus(ctx, out, levels = 16, pre = 2.5, post = 0.5) {
  const g = ctx.createGain(), ws = ctx.createWaveShaper(), o = ctx.createGain();
  if (!curves.has(levels)) { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = Math.round(Math.max(-1, Math.min(1, (i / (n - 1)) * 2 - 1)) * levels) / levels; curves.set(levels, c); }
  ws.curve = curves.get(levels); g.gain.value = pre; o.gain.value = post; g.connect(ws).connect(o).connect(out);
  return g;
}
// Sample-and-hold static: a new random value every `hold` samples, so it buzzes like digital noise.
function sahBuf(ctx, hold) {
  let m = sahCache.get(ctx); if (!m) sahCache.set(ctx, (m = new Map()));
  if (!m.has(hold)) { const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0); let v = 0; for (let i = 0; i < d.length; i++) { if (i % hold === 0) v = Math.random() * 2 - 1; d[i] = v; } m.set(hold, b); }
  return m.get(hold);
}
function stat(ctx, out, t, { hold = 6, dur = 0.08, peak = 0.3, hp = 600 } = {}) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = sahBuf(ctx, hold); f.type = 'highpass'; f.frequency.value = hp; env(g, t, { a: 0.001, peak, d: dur });
  src.connect(f).connect(g).connect(out); src.start(t); src.stop(t + dur + 0.05);
}
// Two-operator FM: a crunchy digital growl that sweeps down.
function fm(ctx, out, t, { fc = 220, f1 = fc, ratio = 2, i0 = 8, i1 = 0.5, dur = 0.14, peak = 0.3 } = {}) {
  const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
  c.frequency.setValueAtTime(fc, t); if (f1 !== fc) c.frequency.exponentialRampToValueAtTime(f1, t + dur);
  m.frequency.setValueAtTime(fc * ratio, t); if (f1 !== fc) m.frequency.exponentialRampToValueAtTime(f1 * ratio, t + dur);
  mg.gain.setValueAtTime(fc * i0, t); mg.gain.exponentialRampToValueAtTime(Math.max(1, fc * i1), t + dur);
  m.connect(mg).connect(c.frequency); env(g, t, { a: 0.001, peak, d: dur });
  c.connect(g).connect(out); c.start(t); m.start(t); c.stop(t + dur + 0.05); m.stop(t + dur + 0.05);
}
// A dark, repeating echo: everything sent in gets a crushed tail.
function echoBus(ctx, out, { time = 0.085, fb = 0.5, wet = 0.5, lp = 2600 } = {}) {
  const input = ctx.createGain(), d = ctx.createDelay(1), f = ctx.createGain(), l = ctx.createBiquadFilter(), w = ctx.createGain();
  d.delayTime.value = time; f.gain.value = fb; l.type = 'lowpass'; l.frequency.value = lp; w.gain.value = wet;
  input.connect(out); input.connect(d); d.connect(l).connect(f).connect(d); l.connect(w).connect(out);
  return input;
}
// Ring modulation: a carrier multiplied by a low tone, the metallic buzz of old electronics.
function ringmod(ctx, out, t, { fc = 900, fmod = 120, dur = 0.2, peak = 0.2, type = 'square' } = {}) {
  const c = ctx.createOscillator(), m = ctx.createOscillator(), g = ctx.createGain(), e = ctx.createGain();
  c.type = type; c.frequency.value = fc; m.type = 'sine'; m.frequency.value = fmod; g.gain.value = 0;
  m.connect(g.gain); env(e, t, { a: 0.001, peak, d: dur });
  c.connect(g).connect(e).connect(out); c.start(t); m.start(t); c.stop(t + dur + 0.05); m.stop(t + dur + 0.05);
}
// The body: a run of blips falling in pitch over static, like a signal draining. Returns its length.
function cascade(ctx, b, t, n, top = 4800) {
  for (let i = 0; i < n; i++) osc(ctx, b, t + i * 0.0105, { type: i % 2 ? 'square' : 'sawtooth', f0: top * Math.pow(0.12, i / n) * (0.9 + Math.random() * 0.2), a: 0.001, peak: 0.1, d: 0.009 });
  stat(ctx, b, t, { hold: 5, dur: n * 0.0105 + 0.05, peak: 0.16, hp: 1500 });
  return n * 0.0105;
}
// The impact: a hard click, a short electrical zap and a crushed thump, all at once.
function impact(ctx, b, t, k, c) {
  noise(ctx, b, t, { type: 'highpass', f0: 4500, a: 0.0005, peak: 0.45, d: 0.012 });
  zap(ctx, b, t, { dur: 0.05 + 0.04 * k, peak: 0.4, f0: 6000, f1: 900 });
  osc(ctx, b, t, { type: 'square', f0: 110, f1: 36, glide: 0.06, a: 0.001, peak: 0.28 + 0.18 * k, d: 0.1 + 0.05 * k });
  if (c) { zap(ctx, b, t + 0.045, { dur: 0.07, peak: 0.3, f0: 7000, f1: 1500 }); osc(ctx, b, t, { type: 'sawtooth', f0: 220, f1: 60, glide: 0.08, a: 0.001, peak: 0.2, d: 0.14 }); }
}
// Impact, then the falling cascade into an FM growl, then digital pings (a console rejecting the packet)
// over a ringing tail through crushed echoes. k is how big the hit is (0–1); c is a crit.
function digitalHit(ctx, out, t, k, c) {
  const fx = echoBus(ctx, out, { time: 0.09, fb: 0.55, wet: 0.5 }), b = crushBus(ctx, fx, 12, 2.8);
  impact(ctx, b, t, k, c);
  const w = cascade(ctx, b, t + 0.015, c ? 28 : 12 + Math.round(10 * k));
  const t0 = t + 0.015 + w;
  fm(ctx, b, t0, { fc: 110, f1: 40, ratio: 1.5, i0: 8, i1: 0.5, dur: 0.2 + 0.1 * k, peak: 0.38 });
  [2093, 1568, 1047, 784].forEach((f, i) => {
    osc(ctx, crushBus(ctx, fx, 8), t0 + 0.09 + i * 0.06, { type: 'square', f0: f, a: 0.001, peak: 0.1, d: 0.05 });
    ringmod(ctx, fx, t0 + 0.09 + i * 0.06, { fc: f * 1.5, fmod: 150, dur: 0.06, peak: 0.05 });
  });
  for (const [f, g] of [[1900, 0.04], [2850, 0.03]]) osc(ctx, fx, t0 + 0.05, { type: 'sine', f0: f, f1: f * 0.97, glide: 0.5, a: 0.002, peak: g, d: 0.5 + 0.2 * k });
}

// ---- candidates for chit / break / patch / interrupt, in the digital hit's language (A and B each) ----
// Glass-like data shards: fast random high blips, each a little lower and quieter.
function shards(ctx, out, t, { n = 7, hi = 7000, lo = 2200, peak = 0.09, span = 0.12 } = {}) {
  for (let i = 0; i < n; i++) { const f = lo + Math.random() * (hi - lo); osc(ctx, out, t + Math.random() * span * (i / n + 0.15), { type: 'square', f0: f, f1: f * 0.85, glide: 0.02, a: 0.0005, peak: peak * (1 - i / (n * 1.4)), d: 0.012 + Math.random() * 0.02 }); }
}
export const CANDIDATES = {
  // Chit A: a crushed snap and a spray of glassy data shards, with a ringing ping.
  'chit-a'(ctx, out, t) {
    const fx = echoBus(ctx, out, { time: 0.06, fb: 0.35, wet: 0.35, lp: 5000 }), b = crushBus(ctx, fx, 10, 2.4);
    noise(ctx, b, t, { type: 'highpass', f0: 6000, a: 0.0005, peak: 0.4, d: 0.01 });
    zap(ctx, b, t, { dur: 0.035, peak: 0.35, f0: 8000, f1: 2500 });
    shards(ctx, b, t + 0.006, { n: 9 });
    ringmod(ctx, fx, t + 0.02, { fc: 3200, fmod: 230, dur: 0.12, peak: 0.07, type: 'sine' });
  },
  // Chit B: a bit flipping off: a click, then a two-step falling ping, crushed, with a tiny static puff.
  'chit-b'(ctx, out, t) {
    const fx = echoBus(ctx, out, { time: 0.07, fb: 0.3, wet: 0.3 }), b = crushBus(ctx, fx, 8, 2.2);
    noise(ctx, b, t, { type: 'highpass', f0: 5000, a: 0.0005, peak: 0.35, d: 0.008 });
    osc(ctx, b, t, { type: 'square', f0: 2637, a: 0.001, peak: 0.16, d: 0.035 });
    osc(ctx, b, t + 0.035, { type: 'square', f0: 1760, f1: 1700, glide: 0.05, a: 0.001, peak: 0.13, d: 0.07 });
    stat(ctx, b, t, { hold: 3, dur: 0.05, peak: 0.12, hp: 3000 });
  },
  // Break A: the big digital hit's impact, a long cascade into a falling FM drop, shards flying, a crushed sub.
  'break-a'(ctx, out, t) {
    const fx = echoBus(ctx, out, { time: 0.11, fb: 0.55, wet: 0.55, lp: 2200 }), b = crushBus(ctx, fx, 10, 3);
    impact(ctx, b, t, 1, true);
    const w = cascade(ctx, b, t + 0.01, 30, 6000);
    fm(ctx, b, t + 0.02 + w, { fc: 90, f1: 28, ratio: 1.41, i0: 10, i1: 0.3, dur: 0.45, peak: 0.42 });
    shards(ctx, fx, t + 0.04, { n: 12, hi: 6000, lo: 900, peak: 0.07, span: 0.3 });
    osc(ctx, b, t + 0.02, { type: 'sine', f0: 70, f1: 30, glide: 0.4, a: 0.002, peak: 0.5, d: 0.5 });
  },
  // Break B: a power-down: impact, a falling CRT whine through the crusher, a static burst that fades, a final thunk.
  'break-b'(ctx, out, t) {
    const fx = echoBus(ctx, out, { time: 0.09, fb: 0.45, wet: 0.4 }), b = crushBus(ctx, fx, 12, 2.8);
    impact(ctx, b, t, 0.8, false);
    osc(ctx, b, t + 0.01, { type: 'sawtooth', f0: 2400, f1: 60, glide: 0.55, a: 0.002, peak: 0.22, d: 0.6 });
    ringmod(ctx, b, t + 0.01, { fc: 600, fmod: 47, dur: 0.5, peak: 0.12 });
    stat(ctx, b, t + 0.02, { hold: 8, dur: 0.45, peak: 0.22, hp: 400 });
    osc(ctx, b, t + 0.55, { type: 'square', f0: 80, f1: 40, glide: 0.05, a: 0.001, peak: 0.35, d: 0.12 });
    noise(ctx, b, t + 0.55, { type: 'lowpass', f0: 900, a: 0.001, peak: 0.25, d: 0.05 });
  },
  // Patch A: three rising crushed notes in a minor key, then a latch clicks shut and hums.
  'patch-a'(ctx, out, t) {
    const fx = echoBus(ctx, out, { time: 0.08, fb: 0.35, wet: 0.35, lp: 1800 }), b = crushBus(ctx, fx, 8, 2.2);
    [220, 262, 330].forEach((f, i) => osc(ctx, b, t + i * 0.06, { type: 'square', f0: f, a: 0.002, peak: 0.13, d: 0.055 }));
    noise(ctx, b, t + 0.19, { type: 'highpass', f0: 3000, a: 0.0005, peak: 0.3, d: 0.01 });
    osc(ctx, b, t + 0.19, { type: 'square', f0: 110, f1: 70, glide: 0.04, a: 0.001, peak: 0.25, d: 0.07 });
    ringmod(ctx, fx, t + 0.2, { fc: 330, fmod: 60, dur: 0.3, peak: 0.07, type: 'sawtooth' });
  },
  // Patch B: static swells in reverse and snaps into a lock; an FM tone rises under it.
  'patch-b'(ctx, out, t) {
    const fx = echoBus(ctx, out, { time: 0.07, fb: 0.3, wet: 0.3, lp: 2400 }), b = crushBus(ctx, fx, 10, 2.4);
    const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    src.buffer = sahBuf(ctx, 6); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3500, t + 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.28, t + 0.22); g.gain.setValueAtTime(0.0001, t + 0.225);
    src.connect(f).connect(g).connect(b); src.start(t); src.stop(t + 0.3);
    fm(ctx, b, t, { fc: 110, f1: 220, ratio: 2, i0: 2, i1: 6, dur: 0.23, peak: 0.16 });
    noise(ctx, b, t + 0.225, { type: 'highpass', f0: 4000, a: 0.0005, peak: 0.35, d: 0.012 });
    osc(ctx, b, t + 0.225, { type: 'square', f0: 165, f1: 120, glide: 0.03, a: 0.001, peak: 0.22, d: 0.06 });
  },
  // Interrupt A: a deflection: a rising zap, a ringing metallic clang, bouncing echoes.
  'interrupt-a'(ctx, out, t) {
    const fx = echoBus(ctx, out, { time: 0.1, fb: 0.45, wet: 0.5, lp: 3500 }), b = crushBus(ctx, fx, 12, 2.4);
    zap(ctx, b, t, { dur: 0.07, peak: 0.3, f0: 900, f1: 5000 });
    ringmod(ctx, fx, t + 0.05, { fc: 1400, fmod: 333, dur: 0.25, peak: 0.12, type: 'triangle' });
    ringmod(ctx, fx, t + 0.05, { fc: 2100, fmod: 177, dur: 0.18, peak: 0.07, type: 'square' });
    noise(ctx, b, t + 0.05, { type: 'highpass', f0: 5000, a: 0.0005, peak: 0.3, d: 0.01 });
  },
  // Interrupt B: a packet rejected: a hard double click, a pitched-down blip-bloop, a puff of static.
  'interrupt-b'(ctx, out, t) {
    const fx = echoBus(ctx, out, { time: 0.06, fb: 0.3, wet: 0.3 }), b = crushBus(ctx, fx, 8, 2.4);
    noise(ctx, b, t, { type: 'highpass', f0: 4500, a: 0.0005, peak: 0.4, d: 0.008 });
    noise(ctx, b, t + 0.03, { type: 'highpass', f0: 4500, a: 0.0005, peak: 0.35, d: 0.008 });
    osc(ctx, b, t + 0.03, { type: 'square', f0: 1320, f1: 990, glide: 0.04, a: 0.001, peak: 0.14, d: 0.05 });
    osc(ctx, b, t + 0.09, { type: 'square', f0: 660, f1: 330, glide: 0.08, a: 0.001, peak: 0.16, d: 0.1 });
    stat(ctx, b, t + 0.03, { hold: 4, dur: 0.07, peak: 0.12, hp: 1500 });
  },
};

// The chain everything plays into: a little headroom and a gentle compressor, with the room beside it.
function chain(ctx) {
  const g = ctx.createGain(), c = ctx.createDynamicsCompressor();
  g.gain.value = 0.55;
  c.threshold.value = -18; c.ratio.value = 4; c.attack.value = 0.003; c.release.value = 0.15;
  g.connect(c).connect(ctx.destination);
  const room = ctx.createConvolver(), wet = ctx.createGain();
  room.buffer = roomIR(ctx); wet.gain.value = 0.9;
  room.connect(wet).connect(g);
  return { master: g, room };
}

// Play one recipe (or its synth stand-in) at time t.
function voiceAt(ctx, ch, name, t, opts = {}) {
  const r = RECIPES[name], ready = banks.get(ctx)?.ready;
  const v = ctx.createGain();
  v.connect(ch.master);
  if (CANDIDATES[name]) { const send = ctx.createGain(), lift = ctx.createGain(); send.gain.value = 0.12; lift.gain.value = /^(chit|interrupt)/.test(name) ? 2.4 : 1.2; lift.connect(v); v.connect(send).connect(ch.room); CANDIDATES[name](ctx, lift, t, opts); }
  else if (r && ready) {
    const send = ctx.createGain(); send.gain.value = r.room; v.connect(send).connect(ch.room);
    r.play(ctx, v, t, opts, (n, at, o) => sample(ctx, v, t, n, { ...o, at }));
  } else if (VOICES[name]) VOICES[name](ctx, v, t, opts);
  else if (name === 'jackin') VOICES.unlock(ctx, v, t, opts);
}

// ---------- the room tone: a CRT humming, a fan, a drive seeking now and then ----------
function ambience(ctx, dest, { seeks = true } = {}) {
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, ctx.currentTime);
  bus.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2.5);
  bus.connect(dest);
  const nodes = [];
  // mains hum: 60 Hz and its overtones, drifting very slightly
  for (const [f, g] of [[60, 0.008], [120, 0.0055], [180, 0.003], [240, 0.0012]]) {
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.frequency.value = f; a.gain.value = g;
    o.connect(a).connect(bus); o.start(); nodes.push(o);
  }
  const lfo = ctx.createOscillator(), depth = ctx.createGain();
  lfo.frequency.value = 0.13; depth.gain.value = 0.3;
  const wob = ctx.createGain(); wob.gain.value = 1;
  // the fan: brown noise, low and wide
  const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < len; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.5; }
  const fan = ctx.createBufferSource(), flp = ctx.createBiquadFilter(), fg = ctx.createGain();
  fan.buffer = buf; fan.loop = true; flp.type = 'lowpass'; flp.frequency.value = 420; fg.gain.value = 0.032;
  fan.connect(flp).connect(wob).connect(fg).connect(bus); fan.start(); nodes.push(fan);
  lfo.connect(depth).connect(wob.gain); lfo.start(); nodes.push(lfo);
  // the flyback whine: right at the edge of hearing, as on a real set
  const fly = ctx.createOscillator(), flyg = ctx.createGain();
  fly.frequency.value = 15734; flyg.gain.value = 0.0004;
  fly.connect(flyg).connect(bus); fly.start(); nodes.push(fly);
  // a hard drive seeking: a few soft ticks every 10–30 seconds
  let timer = null;
  const seek = () => {
    const t = ctx.currentTime + 0.05, n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) sample(ctx, bus, t, 'click', { gain: 0.05, rate: 0.55, lp: 2500, at: i * (0.05 + Math.random() * 0.07) });
    timer = setTimeout(seek, 10000 + Math.random() * 20000);
  };
  if (seeks) timer = setTimeout(seek, 6000);
  return () => {
    clearTimeout(timer);
    const t = ctx.currentTime;
    bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value || 0.0001, t); bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    setTimeout(() => { for (const n of nodes) try { n.stop(); } catch { /* already */ } bus.disconnect(); }, 500);
  };
}

// One sound system per page (the feel layer and the prompt share it).
let shared = null;
export function createSound() {
  if (shared) return shared;
  let ctx = null, ch = null, stopHum = null, wantHum = false, hum = null;
  const vol = { sfx: 0.8, ambience: 0.8 };
  // Sliders: effects scale the whole game-sound chain (its own 0.55 headroom stays), ambience the room tone.
  const applyVol = () => {
    if (ch) ch.master.gain.value = 0.55 * vol.sfx / 0.8;
    if (hum) hum.gain.value = vol.ambience / 0.8;
  };
  function ready() {
    try {
      ctx ||= new AudioContext();
      if (!ch) { ch = chain(ctx); hum = ctx.createGain(); hum.connect(ctx.destination); applyVol(); }
      if (ctx.state === 'suspended') ctx.resume();
      loadBank(ctx);
      if (wantHum && !stopHum) stopHum = ambience(ctx, hum);
      return true;
    } catch { return false; }
  }
  if (typeof document !== 'undefined') {
    // Audio can only start from a click or a key, so the first one wakes it (if Sound is on).
    const wake = () => { if (wantHum) ready(); };
    document.addEventListener('pointerdown', wake, true);
    document.addEventListener('keydown', wake, true);
    // Quiet when the tab is hidden.
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else if (wantHum) ctx.resume();
    });
  }
  shared = {
    play(name, opts = {}) {
      if (!ready()) return;
      try { voiceAt(ctx, ch, name, ctx.currentTime + 0.005, opts); } catch { /* no audio */ }
    },
    // A key on the prompt: 'char', 'enter', 'back', or a button 'click'.
    key(kind = 'char') {
      if (!ready()) return;
      try {
        const t = ctx.currentTime + 0.002;
        if (!banks.get(ctx)?.ready) { noise(ctx, ch.master, t, { type: 'bandpass', f0: 2400 + Math.random() * 1200, q: 1.4, a: 0.001, peak: kind === 'enter' ? 0.12 : 0.07, d: 0.018 }); return; }
        (KEYS[kind] || KEYS.char)((n, at, o) => sample(ctx, ch.master, t, n, { ...o, at }));
      } catch { /* no audio */ }
    },
    // Volume sliders (0–1; 0.8 is the level the game was mixed at).
    volumes(v = {}) { if (v.sfx != null) vol.sfx = v.sfx; if (v.ambience != null) vol.ambience = v.ambience; applyVol(); },
    // The shared context, for the soundtrack (null if audio can't start).
    context() { return ready() ? ctx : null; },
    // The room tone runs while Sound is on.
    ambience(on) {
      wantHum = !!on;
      if (!on && stopHum) { stopHum(); stopHum = null; }
      if (on && ctx && ctx.state !== 'closed' && !stopHum) ready();
    },
  };
  return shared;
}

// Bounce voices, one after another, into a WAV (for listening outside the game).
// Pass { synth: true } to hear the synthesized stand-ins instead of the samples.
export async function renderBoard(names = Object.keys(RECIPES), gap = 1.3, { synth = false, base, hum = false } = {}) {
  // Each entry is a name (played `gap` seconds after the last) or [name, seconds, opts] for a scene.
  const cues = names.map((n, i) => (Array.isArray(n) ? n : [n, 0.3 + i * gap, n === 'hit' ? { amount: 12 } : {}]));
  const sr = 44100, ctx = new OfflineAudioContext(1, Math.ceil(sr * (Math.max(...cues.map((c) => c[1])) + 2)), sr);
  if (!synth) await loadBank(ctx, base);
  const ch = chain(ctx);
  if (hum) ambience(ctx, ctx.destination, { seeks: false });
  for (const [n, t, o = {}] of cues) {
    if (n.startsWith('key:')) (KEYS[n.slice(4)] || KEYS.char)((s, at, x) => sample(ctx, ch.master, t, s, { ...x, at }));
    else voiceAt(ctx, ch, n, t, o);
  }
  const buf = await ctx.startRendering();
  const data = buf.getChannelData(0), bytes = new DataView(new ArrayBuffer(44 + data.length * 2));
  const str = (o, s) => [...s].forEach((c, i) => bytes.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); bytes.setUint32(4, 36 + data.length * 2, true); str(8, 'WAVEfmt ');
  bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 1, true);
  bytes.setUint32(24, sr, true); bytes.setUint32(28, sr * 2, true); bytes.setUint16(32, 2, true); bytes.setUint16(34, 16, true);
  str(36, 'data'); bytes.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) bytes.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true);
  return new Uint8Array(bytes.buffer);
}

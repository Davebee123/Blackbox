// Sound preview pack: shared synthesis helpers, run in Chromium against an OfflineAudioContext.
// Nothing here is used by the game; it renders candidate sounds for the designer to audition.
export const SR = 44100;

// Seeded random, so a re-render gives the same clip.
export function seed(s) {
  let a = s >>> 0;
  Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

// ---- the CC0 samples already shipped in dist/sfx (see dist/sfx/CREDITS.md) ----
const BANK = {
  'punch-m': 5, 'punch-h': 5, 'soft-h': 4, 'soft-m': 3, 'metal-h': 4, 'metal-l': 3, 'plate-l': 4, 'plate-h': 3,
  'glass-l': 4, 'glass-h': 3, mining: 3, tin: 3, bell: 1, whoosh: 3, subdrop: 1, shimmer: 1, glitch: 4, scratch: 3,
  error: 2, tick: 3, confirm: 2, drop: 2, pluck: 2, glassui: 3, bong: 1, relay: 6, click: 4, key: 12, 'key-enter': 1, 'key-back': 1,
};
export const SAMPLES = new Map();
export const USED = new Set(); // sample names a clip touched, for the README
export async function loadSamples() {
  const dec = new OfflineAudioContext(2, 1, SR);
  const get = async (url) => dec.decodeAudioData(await (await fetch(url)).arrayBuffer());
  await Promise.all(Object.entries(BANK).flatMap(([n, k]) => Array.from({ length: k }, async (_, i) => {
    const b = await get(`/dist/sfx/${n}-${i}.wav`); const l = SAMPLES.get(n) || []; l[i] = b; SAMPLES.set(n, l);
  })));
  SAMPLES.set('city', [await get('/dist/sfx/city/city-ambience.mp3')]);
  SAMPLES.set('horn', [await get('/dist/sfx/city/horn-double.mp3')]);
}

// ---- one toolkit per context ----
export function kit(ctx) {
  const end = ctx.length / ctx.sampleRate;
  const K = { ctx, end };
  K.gain = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  K.filt = (type, f, q = 0.707) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  K.pan = (p = 0) => { const s = ctx.createStereoPanner(); s.pan.value = p; return s; };
  K.chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[0]; };
  K.shaper = (amount = 3) => { const w = ctx.createWaveShaper(), n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * amount) / Math.tanh(amount); } w.curve = c; return w; };
  K.crush = (levels = 12) => { const w = ctx.createWaveShaper(), n = 4096, c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = Math.round(((i / (n - 1)) * 2 - 1) * levels) / levels; w.curve = c; return w; };
  // Noise buffers the whole length of the render, stereo, decorrelated.
  const nb = {};
  K.noiseBuf = (color = 'white', hold = 1) => {
    const key = color + hold; if (nb[key]) return nb[key];
    const b = ctx.createBuffer(2, ctx.length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let b0 = 0, b1 = 0, b2 = 0, br = 0, v = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        if (color === 'white') { if (i % hold === 0) v = w; d[i] = v; }
        else if (color === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18; }
        else { br = (br + 0.02 * w) / 1.02; d[i] = br * 3.5; }
      }
    }
    return (nb[key] = b);
  };
  // A noise bed running the whole render.
  K.bed = (dest, { color = 'pink', hold = 1, gain = 0.1, nodes = [] } = {}) => {
    const s = ctx.createBufferSource(); s.buffer = K.noiseBuf(color, hold);
    const g = K.gain(gain); K.chain(s, ...nodes, g, dest); s.start(0); return g;
  };
  // A sustained oscillator running the whole render.
  K.tone = (dest, { type = 'sine', f = 220, detune = 0, gain = 0.1, pan = 0 } = {}) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
    const g = K.gain(gain); K.chain(o, g, K.pan(pan), dest); o.start(0); return { o, g };
  };
  K.lfo = (param, rate, depth, { type = 'sine' } = {}) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = rate;
    const g = K.gain(depth); o.connect(g).connect(param); o.start(0); return o;
  };
  // A random slow curve (smoothed), for gusts, drift, flicker: a param that wanders `base ± depth`.
  K.wander = (param, base, depth, rate = 0.2) => {
    const n = Math.ceil(end * rate * 8) + 2, c = new Float32Array(n); let v = 0, tgt = 0;
    for (let i = 0; i < n; i++) { if (i % 8 === 0) tgt = Math.random() * 2 - 1; v += (tgt - v) * 0.25; c[i] = base + depth * v; }
    param.setValueCurveAtTime(c, 0, end);
  };
  K.env = (g, t, { a = 0.003, peak = 1, d = 0.2, hold = 0 }) => {
    g.gain.value = 0; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
    if (hold) g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + d);
  };
  K.blip = (dest, t, { type = 'sine', f0 = 440, f1 = f0, glide = 0.1, a = 0.003, d = 0.2, hold = 0, peak = 0.2, pan = 0, detune = 0 } = {}) => {
    if (t < 0 || t > end) return;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
    K.env(g, t, { a, peak, d, hold }); K.chain(o, g, K.pan(pan), dest); o.start(t); o.stop(t + a + hold + d + 0.05);
  };
  K.burst = (dest, t, { type = 'bandpass', f0 = 2000, f1 = f0, q = 1, glide = 0.1, a = 0.002, d = 0.08, hold = 0, peak = 0.3, pan = 0, color = 'white' } = {}) => {
    if (t < 0 || t > end) return;
    const s = ctx.createBufferSource(), f = K.filt(type, f0, q), g = ctx.createGain(); s.buffer = K.noiseBuf(color);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + glide);
    K.env(g, t, { a, peak, d, hold }); K.chain(s, f, g, K.pan(pan), dest);
    s.start(t, Math.min(Math.random() * 2, Math.max(0, end - t - 1))); s.stop(t + a + hold + d + 0.05);
  };
  // A recorded sample from dist/sfx.
  K.S = (dest, t, name, { gain = 1, rate = 1, jitter = 0.03, pan = 0, lp, hp, idx, reverse = false } = {}) => {
    const l = SAMPLES.get(name); if (!l || t < 0 || t > end) return; USED.add(name);
    let buf = idx != null ? l[idx % l.length] : pick(l.filter(Boolean)); if (reverse) buf = K.rev(buf);
    const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * jitter);
    const nodes = [s];
    if (lp) nodes.push(K.filt('lowpass', lp, 0.5)); if (hp) nodes.push(K.filt('highpass', hp, 0.5));
    nodes.push(K.gain(gain), K.pan(pan), dest); K.chain(...nodes); s.start(t);
  };
  // A generated reverb: `secs` long, `damp` how dark the tail gets, `pre` predelay.
  K.reverb = (dest, { secs = 2, decay = 3, damp = 0.4, wet = 0.4, pre = 0.01 } = {}) => {
    const n = Math.floor(SR * secs), b = ctx.createBuffer(2, n, SR);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; const k = 1 - damp; for (let i = 0; i < n; i++) { const x = i / n; lp += (k * (1 - 0.8 * x) + 0.05) * ((Math.random() * 2 - 1) - lp); d[i] = (i < pre * SR ? 0 : lp) * Math.pow(1 - x, decay); } }
    const cv = ctx.createConvolver(); cv.buffer = b; const w = K.gain(wet); cv.connect(w).connect(dest);
    return cv;
  };
  // A bus with a dry path and a reverb send.
  K.space = (dest, opts) => { const inp = K.gain(1), rv = K.reverb(dest, opts); inp.connect(dest); inp.connect(rv); return inp; };
  K.delay = (dest, { time = 0.3, fb = 0.4, wet = 0.4, lp = 2500 } = {}) => {
    const inp = K.gain(1), d = ctx.createDelay(5), f = K.gain(fb), l = K.filt('lowpass', lp), w = K.gain(wet);
    d.delayTime.value = time; inp.connect(dest); inp.connect(d); d.connect(l).connect(f).connect(d); l.connect(w).connect(dest); return inp;
  };
  // Events spread across the render at irregular intervals.
  K.every = (lo, hi, fn, start = rnd(0, lo)) => { for (let t = start; t < end; t += rnd(lo, hi)) fn(t); };
  // A sustained voice with three formant filters (a sung vowel), for the choir.
  K.sung = (dest, { f = 220, vowel = [730, 1090, 2440], gain = 0.1, pan = 0, vib = 5, vibDepth = 0.012, detune = 0 } = {}) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = detune;
    K.lfo(o.frequency, vib * rnd(0.9, 1.1), f * vibDepth);
    const sum = K.gain(gain), p = K.pan(pan); sum.connect(p).connect(dest);
    const fs = vowel.map((v, i) => { const b = K.filt('bandpass', v, [5, 7, 9][i]); const g = K.gain([1, 0.55, 0.3][i]); o.connect(b).connect(g).connect(sum); return b; });
    o.start(0); return { o, fs, sum };
  };
  // ---- round 2: textures with weight ----
  // A sample backwards.
  K.rev = (buf) => {
    if (REV.has(buf)) return REV.get(buf);
    const b = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let c = 0; c < buf.numberOfChannels; c++) { const s = buf.getChannelData(c), d = b.getChannelData(c); for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i]; }
    REV.set(buf, b); return b;
  };
  K.bufOf = (name, idx) => { const l = SAMPLES.get(name).filter(Boolean); USED.add(name); return idx != null ? l[idx % l.length] : pick(l); };
  // One grain: a short windowed slice of a sample (offset is 0..1 of its length).
  K.grain = (dest, t, name, { offset = Math.random(), dur = 0.06, rate = 1, gain = 0.3, pan = 0, lp, hp, bp, q = 1, reverse = false, idx } = {}) => {
    if (t < 0 || t > end) return;
    let buf = K.bufOf(name, idx); if (reverse) buf = K.rev(buf);
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; s.playbackRate.value = rate;
    const len = Math.min(dur, buf.duration / rate), off = Math.max(0, Math.min(buf.duration - len * rate, offset * buf.duration));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + len * 0.3); g.gain.linearRampToValueAtTime(0, t + len);
    const n = [s]; if (lp) n.push(K.filt('lowpass', lp, 0.6)); if (hp) n.push(K.filt('highpass', hp, 0.6)); if (bp) n.push(K.filt('bandpass', bp, q));
    n.push(g, K.pan(pan), dest); K.chain(...n); s.start(t, off, len * rate + 0.01);
  };
  // A cloud of grains from t0 to t1. density/gain can be functions of x (0..1 through the cloud).
  K.cloud = (dest, t0, t1, names, { density = 30, dur = [0.02, 0.08], rate = [0.8, 1.2], gain = 0.2, pan = [-0.8, 0.8], lp, hp, bp, q, reverse = 0 } = {}) => {
    const f = (v, x) => (typeof v === 'function' ? v(x) : v);
    for (let t = t0; t < t1;) { const x = (t - t0) / (t1 - t0); K.grain(dest, t, pick([].concat(names)), { dur: rnd(...dur), rate: rnd(...[].concat(f(rate, x))), gain: f(gain, x) * rnd(0.5, 1), pan: rnd(...pan), lp, hp, bp, q, reverse: Math.random() < reverse }); t += rnd(0.3, 1.7) / Math.max(0.5, f(density, x)); }
  };
  // A sub thump.
  K.sub = (dest, t, { f0 = 95, f1 = 34, glide = 0.18, d = 0.35, peak = 0.8 } = {}) => K.blip(dest, t, { type: 'sine', f0, f1, glide, a: 0.002, d, peak });
  // A formant growl: a gritty buzz with a sub-octave, through moving vowel formants and a shaper.
  K.growl = (dest, t, { f0 = 70, f1 = f0, dur = 0.6, vowels = ['o', 'a'], drive = 4, peak = 0.3, jitter = 0.08, a = 0.04, pan = 0 } = {}) => {
    if (t < 0 || t > end) return;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), j = ctx.createBufferSource(), jg = K.gain(f0 * jitter), mix = K.gain(1), sh = K.shaper(drive), g = ctx.createGain(), sum = K.gain(1);
    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); o2.frequency.setValueAtTime(f0 / 2, t); o2.frequency.exponentialRampToValueAtTime(f1 / 2, t + dur);
    j.buffer = K.noiseBuf('white', 400); j.connect(K.filt('lowpass', 40)).connect(jg); jg.connect(o.frequency); jg.connect(o2.frequency);
    o.connect(mix); const h = K.gain(0.6); o2.connect(h).connect(mix); mix.connect(sh);
    const fs = [0, 1, 2].map((k) => { const b = K.filt('bandpass', VOWEL[vowels[0]][k], [4, 6, 8][k]); const bg = K.gain([1, 0.6, 0.3][k]); sh.connect(b).connect(bg).connect(sum); vowels.forEach((v, i) => b.frequency.linearRampToValueAtTime(VOWEL[v][k], t + (dur * i) / Math.max(1, vowels.length - 1))); return b; });
    void fs;
    const low = K.filt('lowpass', 300); sh.connect(low).connect(K.gain(0.5)).connect(sum);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + Math.max(a, dur * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    K.chain(sum, g, K.pan(pan), dest); for (const x of [o, o2, j]) { x.start(t); x.stop(t + dur + 0.05); }
  };
  // Whispering: noise through vowel formants, gated into syllables.
  K.whisper = (dest, t, dur, { peak = 0.3, pan = 0, rate = 6 } = {}) => {
    const s = ctx.createBufferSource(), g = K.gain(0), sum = K.gain(1); s.buffer = K.noiseBuf('pink');
    const fs = [0, 1, 2].map((k) => { const b = K.filt('bandpass', 800, [6, 9, 12][k]); s.connect(b).connect(K.gain([1, 0.7, 0.5][k])).connect(sum); return b; });
    for (let x = 0; x < dur; x += rnd(0.6, 1.4) / rate) { const v = VOWEL[pick(Object.keys(VOWEL))]; fs.forEach((f, k) => f.frequency.setTargetAtTime(v[k] * rnd(0.9, 1.15), t + x, 0.02)); g.gain.setTargetAtTime(Math.random() < 0.8 ? peak * rnd(0.4, 1) : 0, t + x, 0.025); }
    g.gain.setTargetAtTime(0, t + dur, 0.05);
    K.chain(sum, K.filt('highpass', 400), g, K.pan(pan), dest); s.start(t, rnd(0, 1)); s.stop(t + dur + 0.4);
  };
  return K;
}
const REV = new WeakMap();
export const VOWEL = { a: [730, 1090, 2440], o: [570, 840, 2410], u: [300, 870, 2240], e: [530, 1840, 2480], i: [270, 2290, 3010] };

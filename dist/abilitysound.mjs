// Ability sounds, the style round (docs/ability-sounds-plan.md): each class's key 1 (Bash, Ban, Poke, Ping) in three
// styles for the designer to hear against today's sounds before any of it goes into a fight.
//   a  Hardware  the machine room: relays, pistons, metal, tin, a modem. Recorded samples, lightly handled.
//   b  Weighty   big whooshes, sub thumps, a hard transient, a bright tail in a bigger space.
//   c  Digital   today's hit language per ability: bit-crushed FM, square blips, data streams, crushed echoes.
// Each sound is timed to its effect (abilityfx.mjs play() returns the plan) in four layers:
//   launch  as it leaves the key (its class: the Breaker's solenoid, the Bastion's latch, the Infiltrator's keystroke,
//           the Operator's chirp)
//   travel  for as long as it flies (its motion: the ram's air, the hammer's swing, the needle's zip, the ping's sweep);
//           a crit's draw-back (the plan's hold) winds up before it lands
//   contact on the impact, the number's beat: by result (a light hit, a big one, a crit, on ◆ a glance in steel, a
//           miss nothing: the travel passes on and fades)
//   tail    what it throws, after the hit-stop (shock: a thump, bits: chatter, dust: hiss, ring: a ring), in its class's
//           rhythm: the Breaker cuts dead, the Bastion rings on, the Infiltrator's spreads out late, the Operator's comes
//           in three small beats.
// Nothing here is in a fight yet: the ability effects playtest (?playtest=fx) plays it, and renderBoard() bounces it.

export const STYLES = { a: 'Hardware', b: 'Weighty', c: 'Digital' };
export const KEYS = ['bash', 'ban', 'poke', 'ping'];
// Levels (dB), so every style is heard at today's loudness: a medium hit at about −24 LUFS (momentary max), a crit
// about 2 dB over it, a hit on ◆ near −27.5 and a miss near −29.5 (today's hit plays at about −23). level: the whole
// sound; crit, chit, miss: its contact on top (a miss: all of it, the travel passing on is the sound). A plain hit's
// contact scales with its size (0.78 + 0.1 × k, on top of its own layers').
export const TRIM = {
  a: { bash: { level: 0.7, crit: -4.3, chit: 3.5, miss: 2 }, ban: { level: 2.7, crit: -4, chit: 3, miss: 2 }, poke: { level: 7.2, crit: 0, chit: -1.4, miss: 3 }, ping: { level: 10.7, crit: 1.8, chit: -4.3, miss: -2.5 } },
  b: { bash: { level: -5.5, crit: -1.5, chit: 9.7, miss: 8.5 }, ban: { level: -4.6, crit: -2.5, chit: 12.7, miss: 10 }, poke: { level: 5.5, crit: -1.5, chit: 5.4, miss: 4.5 }, ping: { level: 3.7, crit: -4.6, chit: 2.6, miss: 0 } },
  c: { bash: { level: 4.8, crit: -0.4, chit: 2.3, miss: 1 }, ban: { level: 3.3, crit: 0, chit: 4.3, miss: 2 }, poke: { level: 10.2, crit: -2.1, chit: 0.6, miss: -1 }, ping: { level: 10.4, crit: -0.7, chit: -0.9, miss: -2 } },
};
// Each key 1's class: the Breaker's sound is cut dead after its hit-stop (GATE s after it).
const CLASS = { bash: 'breaker', ban: 'bastion', poke: 'infiltrator', ping: 'operator' };
const GATE = 0.24;
const PULSE = 0.09; // s between the Operator's beats (abilityfx.mjs PULSE)

// ---------- building blocks (any AudioContext; mono) ----------
const noiseBufs = new WeakMap(), revBufs = new WeakMap(), curves = new Map();
function noiseOf(ctx, color = 'white') {
  let m = noiseBufs.get(ctx);
  if (!m) noiseBufs.set(ctx, (m = {}));
  if (!m[color]) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, br = 0, v = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (color === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      else if (color === 'brown') { br = (br + 0.02 * w) / 1.02; d[i] = br * 3.5; }
      else if (color === 'sah') { if (i % 6 === 0) v = w; d[i] = v; } // sample-and-hold static
      else d[i] = w;
    }
    m[color] = b;
  }
  return m[color];
}
function curve(key, fn) {
  if (!curves.has(key)) { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = fn((i / (n - 1)) * 2 - 1); curves.set(key, c); }
  return curves.get(key);
}

function kit(ctx, buf) {
  const K = {};
  K.g = (v = 1, dest) => { const g = ctx.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; };
  K.f = (type, freq, q = 0.707, dest) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = freq; b.Q.value = q; if (dest) b.connect(dest); return b; };
  // Saturation (tanh) and a bit-crusher (a staircase), each a bus in front of dest.
  K.drive = (dest, amount = 3, pre = 1) => { const i = K.g(pre), w = ctx.createWaveShaper(); w.curve = curve('d' + amount, (x) => Math.tanh(x * amount) / Math.tanh(amount)); i.connect(w).connect(dest); return i; };
  K.crush = (dest, levels = 12, pre = 2.5, post = 0.45) => { const i = K.g(pre), w = ctx.createWaveShaper(), o = K.g(post, dest); w.curve = curve('c' + levels, (x) => Math.round(x * levels) / levels); i.connect(w).connect(o); return i; };
  // A repeating echo, darkened each time round.
  K.echo = (dest, { time = 0.09, fb = 0.4, wet = 0.4, lp = 2600 } = {}) => {
    const i = K.g(1, dest), d = ctx.createDelay(1), f = K.g(fb), l = K.f('lowpass', lp), w = K.g(wet, dest);
    d.delayTime.value = time; i.connect(d); d.connect(l).connect(f).connect(d); l.connect(w);
    return i;
  };
  K.env = (p, t, { a = 0.002, peak = 1, hold = 0, d = 0.2 } = {}) => {
    p.value = 0; p.setValueAtTime(0.0001, t); p.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    if (hold) p.setValueAtTime(Math.max(0.0002, peak), t + a + hold);
    p.exponentialRampToValueAtTime(0.0001, t + a + hold + d);
  };
  // An oscillator with a pitch glide and an envelope.
  K.tone = (dest, t, { type = 'sine', f0 = 440, f1 = f0, glide = 0.1, a = 0.002, hold = 0, d = 0.15, peak = 0.2, detune = 0 } = {}) => {
    const o = ctx.createOscillator(), g = K.g(0, dest);
    o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
    K.env(g.gain, t, { a, peak, hold, d }); o.connect(g); o.start(t); o.stop(t + a + hold + d + 0.03);
  };
  // A sub thump: a sine falling fast.
  K.sub = (dest, t, { f0 = 90, f1 = 34, glide = 0.12, d = 0.25, peak = 0.5 } = {}) => K.tone(dest, t, { f0, f1, glide, d, peak, a: 0.001 });
  // Filtered noise with a sweep and an envelope.
  K.hiss = (dest, t, { type = 'bandpass', f0 = 2000, f1 = f0, q = 1, glide = 0.1, a = 0.002, hold = 0, d = 0.08, peak = 0.3, color = 'white' } = {}) => {
    const s = ctx.createBufferSource(), fl = K.f(type, f0, q), g = K.g(0, dest);
    s.buffer = noiseOf(ctx, color);
    if (f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, t + glide);
    K.env(g.gain, t, { a, peak, hold, d }); s.connect(fl).connect(g);
    s.start(t, Math.random() * 0.8); s.stop(t + a + hold + d + 0.03);
  };
  // Something flying from t0 to t1: noise swelling as it comes, its band rising (f0 → f1). It stops where it lands, or
  // (pass: a miss) goes on through, falling away (the band dropping, as a thing going past does).
  K.flight = (dest, t0, t1, { f0 = 600, f1 = 2400, q = 1, peak = 0.2, color = 'pink', pass = false, tail = 0.2, type = 'bandpass' } = {}) => {
    const s = ctx.createBufferSource(), fl = K.f(type, f0, q), g = K.g(0, dest), dur = Math.max(0.03, t1 - t0);
    s.buffer = noiseOf(ctx, color);
    fl.frequency.setValueAtTime(f0, t0); fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak * 0.35, t0 + dur * 0.4); g.gain.exponentialRampToValueAtTime(peak, t0 + dur);
    if (pass) { fl.frequency.exponentialRampToValueAtTime(f0 * 0.6, t0 + dur + tail); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + tail); }
    else g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.025);
    s.connect(fl).connect(g); s.start(t0, Math.random() * 0.8); s.stop(t0 + dur + (pass ? tail : 0.03) + 0.03);
  };
  // A recorded sample (dist/sfx): pitch with a little jitter, filters, reversed, or a window of it (off: 0–1 into it).
  // end: it ends then (its last `dur` s, at most), for a reversed take swelling into a hit.
  K.S = (dest, t, name, { gain = 1, rate = 1, jitter = 0.03, lp, hp, bp, q = 1, reverse = false, off = 0, dur = 0, fade = 0.01, end = null } = {}) => {
    let b = buf(name);
    if (!b) return;
    if (reverse) b = rev(ctx, b);
    const s = ctx.createBufferSource(), g = K.g(gain);
    s.buffer = b; s.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * jitter);
    if (end != null) { const r = s.playbackRate.value, len = Math.min(dur || Infinity, b.duration / r); t = end - len; dur = len; off = 1 - (len * r) / b.duration; fade = Math.max(fade, len * 0.6); }
    let n = s;
    for (const [type, fr] of [['lowpass', lp], ['highpass', hp], ['bandpass', bp]]) if (fr) { const x = K.f(type, fr, type === 'bandpass' ? q : 0.5); n.connect(x); n = x; }
    n.connect(g).connect(dest);
    const at = Math.min(b.duration * 0.95, off * b.duration);
    if (dur) {
      const fin = end != null ? 0.004 : fade; // a swell into a hit cuts off at it
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(fade, dur * (end != null ? 0.8 : 1 / 3)));
      g.gain.setValueAtTime(gain, t + Math.max(0, dur - fin)); g.gain.linearRampToValueAtTime(0, t + dur);
      s.start(t, at, dur * s.playbackRate.value + 0.02);
    } else s.start(t, at);
  };
  // A frequency-shift data stream (a modem talking) from t0 to t1, its two tones drifting up by `rise`.
  K.stream = (dest, t0, t1, { lo = 900, hi = 1300, baud = 110, rise = 1.4, peak = 0.08, type = 'square' } = {}) => {
    const o = ctx.createOscillator(), bp = K.f('bandpass', (lo + hi) / 2, 1.1), g = K.g(0, dest), dur = Math.max(0.03, t1 - t0), n = Math.max(2, Math.round(dur * baud));
    o.type = type;
    for (let i = 0; i < n; i++) { const k = Math.pow(rise, i / n); o.frequency.setValueAtTime((Math.random() < 0.5 ? lo : hi) * k, t0 + (i * dur) / n); }
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.02, dur / 3)); g.gain.setValueAtTime(peak, t1 - 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.012);
    o.connect(bp).connect(g); o.start(t0); o.stop(t1 + 0.04);
  };
  // Two-operator FM: a crunchy tone sweeping fc → f1, its brightness i0 → i1.
  K.fm = (dest, t, { fc = 110, f1 = fc, ratio = 1.5, i0 = 8, i1 = 0.5, dur = 0.16, peak = 0.3 } = {}) => {
    const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = K.g(0), g = K.g(0, dest);
    c.frequency.setValueAtTime(fc, t); m.frequency.setValueAtTime(fc * ratio, t);
    if (f1 !== fc) { c.frequency.exponentialRampToValueAtTime(f1, t + dur); m.frequency.exponentialRampToValueAtTime(f1 * ratio, t + dur); }
    mg.gain.setValueAtTime(fc * i0, t); mg.gain.exponentialRampToValueAtTime(Math.max(1, fc * i1), t + dur);
    m.connect(mg).connect(c.frequency); K.env(g.gain, t, { a: 0.001, peak, d: dur }); c.connect(g);
    for (const x of [c, m]) { x.start(t); x.stop(t + dur + 0.04); }
  };
  // Ring modulation: the metallic buzz of old electronics.
  K.ring = (dest, t, { fc = 900, fmod = 120, d = 0.2, peak = 0.15, type = 'square' } = {}) => {
    const c = ctx.createOscillator(), m = ctx.createOscillator(), rg = K.g(0), g = K.g(0, dest);
    c.type = type; c.frequency.value = fc; m.frequency.value = fmod; m.connect(rg.gain);
    K.env(g.gain, t, { a: 0.001, peak, d }); c.connect(rg).connect(g);
    for (const x of [c, m]) { x.start(t); x.stop(t + d + 0.04); }
  };
  // Many small things: n of fn(t, i), spread over `span` s (later ones sparser: a spray settling).
  K.spray = (t, n, span, fn) => { for (let i = 0; i < n; i++) fn(t + span * Math.pow(i / Math.max(1, n), 1.4) * (0.85 + Math.random() * 0.3), i); };
  return K;
}
function rev(ctx, b) {
  let m = revBufs.get(ctx);
  if (!m) revBufs.set(ctx, (m = new WeakMap()));
  if (!m.has(b)) {
    const r = ctx.createBuffer(b.numberOfChannels, b.length, b.sampleRate);
    for (let c = 0; c < b.numberOfChannels; c++) { const s = b.getChannelData(c), d = r.getChannelData(c); for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i]; }
    m.set(b, r);
  }
  return m.get(b);
}

// ---------- the sounds ----------
// Each: (K, out, T) with out { dry, room } and T the timing (seconds, on the context's clock):
//   t launch · arrive (it gets there) · hold (a crit's draw-back, or the Breaker's) · strike (the last move into contact
//   starts: arrive + hold) · hit (contact, the number's beat) ·
//   stop (the hit-stop: what it throws flies after) · result ('hit' | 'crit' | 'chit' | 'miss') · k (how big: 0–1) ·
//   flies (it travelled: false when there's no effect to time it, so it's contact and tail on the beat).
const SOUNDS = {
  // ===== A: Hardware =====
  a: {
    // The Breaker's ram: a solenoid fires, air rushes, the piston cocks, a slam, the frame shudders, relays chatter. Stops dead.
    bash(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit';
      if (T.flies) {
        K.S(o.dry, t, 'relay', { gain: 0.5, rate: 0.62 });
        K.S(o.dry, t + 0.004, 'click', { gain: 0.25, rate: 0.55, lp: 2500 });
        K.flight(o.dry, t, arrive, { f0: 500, f1: 1700, q: 0.9, peak: 0.16, pass: result === 'miss', tail: 0.22 });
        // The piston cocks: a ratchet in the draw-back (a crit's is longer, faster and hisses with pressure).
        const n = crit ? 4 : 2;
        for (let i = 0; i < n; i++) K.S(o.dry, arrive + (T.hold * i) / n, 'relay', { gain: 0.3 + 0.08 * i, rate: 0.75 + 0.1 * i, jitter: 0.02 });
        if (crit) K.hiss(o.dry, arrive, { f0: 700, f1: 3200, glide: T.hold + 0.04, a: T.hold, d: 0.04, peak: 0.12, q: 1.4 });
        if (result !== 'miss') K.flight(o.dry, T.strike, hit, { f0: 900, f1: 3000, q: 1.2, peak: 0.12 }); // the thrust
      }
      if (result === 'miss') { K.S(o.dry, hit + 0.02, 'relay', { gain: 0.18, rate: 0.5, lp: 1500 }); return; } // the piston bottoms out in the air
      if (result === 'chit') {
        K.S(o.dry, hit, 'metal-h', { gain: 0.55, rate: 1.05 });
        K.S(o.dry, hit + 0.006, 'tin', { gain: 0.3, rate: 1.25 });
        K.S(o.room, hit + 0.04, 'tin', { gain: 0.12, rate: 0.95, lp: 3000 });
        return;
      }
      const big = crit ? 1 : k;
      K.S(o.dry, hit, 'punch-h', { gain: 0.55 + 0.45 * big, rate: 0.9 - 0.15 * big });
      K.S(o.dry, hit + 0.003, 'plate-l', { gain: 0.25 + 0.35 * big, rate: 0.85 - 0.1 * big, lp: 3500 });
      K.sub(o.dry, hit, { f0: 80, f1: 32, d: 0.16 + 0.12 * big, peak: 0.25 + 0.4 * big });
      if (crit) { K.S(o.dry, hit + 0.002, 'mining', { gain: 0.45, rate: 0.75 }); K.S(o.dry, hit, 'subdrop', { gain: 0.45 }); }
      // After the stop: the frame shudders, relays chatter (bits), cut dead.
      const after = hit + stop;
      K.S(o.dry, after, 'metal-l', { gain: 0.14 + 0.16 * big, rate: 0.6, lp: 1400, dur: 0.16 });
      K.spray(after + 0.01, crit ? 7 : 3 + Math.round(3 * k), 0.12, (x, i) => K.S(o.dry, x, 'relay', { gain: 0.13 - 0.01 * i, rate: 1.3 + Math.random() * 0.5, lp: 6000 }));
    },
    // The Bastion's hammer: a latch lets go, a heavy swing, an anvil strike that rings on, the dust settling.
    ban(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit';
      if (T.flies) {
        K.S(o.dry, t, 'metal-l', { gain: 0.22, rate: 0.55, lp: 1800 });
        K.S(o.dry, t + 0.01, 'relay', { gain: 0.3, rate: 0.48 });
        if (!crit) K.flight(o.dry, t, hit, { f0: 280, f1: 1100, q: 0.8, peak: 0.2, pass: result === 'miss', tail: 0.26, color: 'pink' });
        else { // drawn back: the swing goes up, a creak, then it comes down
          K.flight(o.dry, t, arrive, { f0: 280, f1: 800, q: 0.8, peak: 0.12, color: 'pink' });
          K.S(o.dry, arrive, 'metal-l', { gain: 0.25, rate: 0.38, lp: 900, dur: T.hold + 0.04 });
          K.flight(o.dry, T.strike, hit, { f0: 220, f1: 1200, q: 0.8, peak: 0.26, color: 'pink' });
        }
      }
      if (result === 'miss') return;
      if (result === 'chit') {
        K.S(o.dry, hit, 'metal-h', { gain: 0.5, rate: 1.2 });
        K.S(o.dry, hit + 0.004, 'bell', { gain: 0.14, rate: 1.5, lp: 6000, dur: 0.35, fade: 0.08 });
        K.S(o.room, hit, 'tin', { gain: 0.2, rate: 1.1 });
        return;
      }
      const big = crit ? 1 : k;
      K.S(o.dry, hit, 'metal-h', { gain: 0.4 + 0.3 * big, rate: 0.82 - 0.12 * big });
      K.S(o.dry, hit + 0.002, 'plate-h', { gain: 0.3 + 0.3 * big, rate: 0.75 - 0.1 * big });
      K.S(o.dry, hit, 'punch-m', { gain: 0.35 + 0.3 * big, rate: 0.8 });
      K.sub(o.dry, hit, { f0: 70, f1: 30, d: 0.22 + 0.14 * big, peak: 0.25 + 0.35 * big });
      // It rings on (the Bastion's piece stays up a beat): the anvil's ring into the room.
      K.S(o.room, hit + 0.01, 'bell', { gain: 0.1 + 0.12 * big, rate: crit ? 0.42 : 0.5, lp: 2600, dur: 0.6 + 0.3 * big, fade: 0.2 });
      if (crit) { K.S(o.dry, hit, 'subdrop', { gain: 0.4 }); K.S(o.room, hit + 0.003, 'metal-l', { gain: 0.35, rate: 0.6 }); }
      K.S(o.dry, hit + stop + 0.03, 'scratch', { gain: 0.08 + 0.06 * big, rate: 0.55, lp: 2200 }); // the dust
    },
    // The Infiltrator's needle: one keystroke, a thin zip, a prick, and a crack spreading through after it.
    poke(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit';
      if (T.flies) {
        K.S(o.dry, t, 'key', { gain: 0.4, rate: 1.15 });
        K.flight(o.dry, t, arrive, { f0: 3200, f1: 7500, q: 3, peak: 0.07, pass: result === 'miss', tail: 0.12, color: 'white' });
      }
      if (result === 'miss') return;
      if (result === 'chit') { K.S(o.dry, hit, 'tin', { gain: 0.35, rate: 1.7 }); K.S(o.dry, hit + 0.003, 'glassui', { gain: 0.2, rate: 1.6 }); return; }
      const big = crit ? 1 : k;
      K.S(o.dry, hit, 'tick', { gain: 0.45, rate: 1.4 });
      K.S(o.dry, hit + 0.002, 'glass-h', { gain: 0.12 + 0.12 * big, rate: 1.7, hp: 1800 });
      K.S(o.dry, hit, 'punch-m', { gain: 0.15 + 0.25 * big, rate: 1.5, hp: 300 });
      if (crit) K.S(o.dry, hit + 0.004, 'tin', { gain: 0.3, rate: 1.9 });
      // The bloom: a crack running out through the part a beat later (small clicks spreading, then a scrape).
      const at = hit + stop + 0.05;
      K.spray(at, crit ? 10 : 4 + Math.round(4 * k), crit ? 0.2 : 0.13, (x, i) => K.S(o.dry, x, i % 3 ? 'click' : 'key', { gain: 0.16 - 0.012 * i, rate: 1.7 + Math.random() * 0.8, hp: 1200 }));
      K.S(o.room, at, 'scratch', { gain: 0.06 + 0.05 * big, rate: 1.6, hp: 2500, dur: 0.14 });
    },
    // The Operator's ping: a relay and a modem chirp, a struck tin swept out, and its return in three small beats.
    ping(K, o, T) {
      const { t, arrive, hit, k, result } = T, crit = result === 'crit';
      if (T.flies) {
        K.S(o.dry, t, 'relay', { gain: 0.25, rate: 1.1 });
        K.stream(o.dry, t + 0.005, t + 0.05, { lo: 1070, hi: 1270, baud: 160, rise: 1, peak: 0.05 });
        K.S(o.room, t + 0.01, 'glassui', { gain: 0.22, rate: 1.1, bp: 2400, q: 2 });
        K.flight(o.dry, t, arrive, { f0: 1400, f1: 2600, q: 6, peak: 0.05, pass: result === 'miss', tail: 0.3 });
      }
      if (result === 'miss') { K.S(o.room, hit + 0.14, 'glassui', { gain: 0.06, rate: 0.9, lp: 2500 }); return; } // the ping comes back with nothing
      if (result === 'chit') { K.S(o.dry, hit, 'metal-h', { gain: 0.3, rate: 1.6 }); K.S(o.dry, hit + PULSE, 'tin', { gain: 0.16, rate: 1.8 }); return; }
      const big = crit ? 1 : k;
      for (let i = 0; i < 3; i++) {
        K.S(o.dry, hit + i * PULSE, 'tin', { gain: (0.32 + 0.2 * big) * [1, 0.72, 0.5][i], rate: [1.45, 1.36, 1.27][i] - 0.1 * big });
        K.S(o.dry, hit + i * PULSE, 'click', { gain: 0.12 * [1, 0.7, 0.5][i], rate: 1.2 });
      }
      K.S(o.room, hit + 0.02, 'bell', { gain: 0.05 + 0.06 * big, rate: 1.2, lp: 4000, dur: 0.4, fade: 0.15 }); // the ring
      if (crit) K.S(o.room, hit + 3 * PULSE, 'bong', { gain: 0.3, rate: 1.15 });
    },
  },

  // ===== B: Weighty =====
  b: {
    // A charge, a big rush of air, a reversed swell into the slam, a sub drop, debris. Stops dead.
    bash(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit';
      if (T.flies) {
        K.S(o.dry, t, 'soft-h', { gain: 0.35, rate: 0.6, lp: 1200 });
        K.flight(o.dry, t, arrive, { f0: 300, f1: 2200, q: 0.7, peak: 0.3, pass: result === 'miss', tail: 0.3 });
        if (result !== 'miss') K.S(o.dry, 0, 'punch-h', { reverse: true, end: hit, dur: Math.max(0.06, hit - arrive), gain: crit ? 0.5 : 0.25, rate: 0.8, lp: 3500 }); // a reversed swell into the slam
      }
      if (result === 'miss') return;
      if (result === 'chit') { // a heavy clang, and it whizzes off
        K.S(o.dry, hit, 'metal-h', { gain: 0.6, rate: 0.9 });
        K.S(o.dry, hit + 0.003, 'plate-h', { gain: 0.35, rate: 1 });
        K.tone(o.dry, hit + 0.02, { type: 'sine', f0: 3400, f1: 1300, glide: 0.18, d: 0.18, peak: 0.05 });
        K.hiss(o.dry, hit + 0.02, { f0: 4000, f1: 1500, glide: 0.16, d: 0.16, peak: 0.08, q: 3 });
        return;
      }
      const big = crit ? 1 : k, d = K.drive(o.dry, 2.5, 1);
      K.hiss(o.dry, hit, { type: 'highpass', f0: 3500, a: 0.0005, d: 0.012, peak: 0.5 });
      K.S(d, hit, 'punch-h', { gain: 0.6 + 0.4 * big, rate: 0.78 - 0.1 * big });
      K.S(d, hit + 0.002, 'soft-h', { gain: 0.4 + 0.3 * big, rate: 0.7 });
      K.sub(o.dry, hit, { f0: 95, f1: 30, glide: 0.14, d: 0.25 + 0.15 * big, peak: 0.45 + 0.35 * big });
      if (crit || big > 0.6) K.S(o.dry, hit, 'subdrop', { gain: crit ? 0.7 : 0.35 });
      K.spray(hit + stop + 0.01, crit ? 8 : 3 + Math.round(4 * k), 0.14, (x, i) => K.S(o.dry, x, 'mining', { gain: 0.1 - 0.008 * i, rate: 1.4 + Math.random() * 0.6, off: 0.05, dur: 0.05, hp: 900 }));
    },
    // A deep swing, a reversed rush on a crit, an enormous strike that blooms into a hall, debris settling.
    ban(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit';
      if (T.flies) {
        K.S(o.dry, t, 'soft-m', { gain: 0.25, rate: 0.6, lp: 1000 });
        K.flight(o.dry, t, crit ? arrive : hit, { f0: 180, f1: 900, q: 0.6, peak: 0.34, pass: result === 'miss', tail: 0.34, color: 'pink' });
        if (crit) K.S(o.dry, 0, 'punch-h', { reverse: true, end: hit, dur: hit - arrive, gain: 0.55, rate: 0.6, lp: 3000 }); // drawn back: a reversed rush into it
      }
      if (result === 'miss') return;
      if (result === 'chit') {
        K.S(o.dry, hit, 'metal-h', { gain: 0.55, rate: 1.05 });
        K.S(o.room, hit + 0.003, 'bell', { gain: 0.2, rate: 1.3, dur: 0.5, fade: 0.2 });
        K.tone(o.dry, hit + 0.03, { type: 'sine', f0: 2800, f1: 1100, glide: 0.2, d: 0.2, peak: 0.05 });
        return;
      }
      const big = crit ? 1 : k, d = K.drive(o.dry, 2.2, 1);
      K.hiss(o.dry, hit, { type: 'highpass', f0: 3000, a: 0.0005, d: 0.015, peak: 0.45 });
      K.S(d, hit, 'punch-h', { gain: 0.55 + 0.35 * big, rate: 0.65 - 0.07 * big });
      K.S(d, hit + 0.003, 'plate-l', { gain: 0.35 + 0.3 * big, rate: 0.6 });
      K.S(o.room, hit + 0.002, 'metal-l', { gain: 0.3 + 0.3 * big, rate: 0.55 });
      K.sub(o.dry, hit, { f0: 75, f1: 26, glide: 0.2, d: 0.4 + 0.2 * big, peak: 0.5 + 0.3 * big });
      if (crit || big > 0.5) K.S(o.dry, hit, 'subdrop', { gain: crit ? 0.75 : 0.4 });
      K.hiss(o.room, hit + stop + 0.02, { type: 'lowpass', f0: 1800, f1: 500, glide: 0.5, a: 0.02, d: 0.5, peak: 0.06 + 0.05 * big, color: 'pink' }); // debris settling
    },
    // A fast zip, a sharp crack with a kick under it, and a sparkle widening out after.
    poke(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit';
      if (T.flies) {
        K.hiss(o.dry, t, { type: 'highpass', f0: 5000, a: 0.0005, d: 0.01, peak: 0.15 });
        K.flight(o.dry, t, arrive, { f0: 1800, f1: 8000, q: 2.5, peak: 0.16, pass: result === 'miss', tail: 0.18, color: 'white' });
      }
      if (result === 'miss') return;
      if (result === 'chit') { K.S(o.dry, hit, 'metal-h', { gain: 0.4, rate: 1.5 }); K.tone(o.dry, hit + 0.01, { f0: 4200, f1: 1800, glide: 0.12, d: 0.12, peak: 0.05 }); return; }
      const big = crit ? 1 : k;
      K.hiss(o.dry, hit, { type: 'highpass', f0: 4000, a: 0.0005, d: 0.01, peak: 0.5 });
      K.S(o.dry, hit, 'punch-m', { gain: 0.4 + 0.35 * big, rate: 1.25 });
      K.S(o.dry, hit + 0.002, 'glass-h', { gain: 0.2 + 0.15 * big, rate: 1.5 });
      K.sub(o.dry, hit, { f0: 120, f1: 45, glide: 0.07, d: 0.1 + 0.1 * big, peak: 0.25 + 0.35 * big });
      const at = hit + stop + 0.05; // the bloom
      K.S(o.room, at, 'shimmer', { gain: 0.1 + 0.12 * big, rate: crit ? 1.3 : 1.5, off: 0.3, dur: 0.35, fade: 0.12, hp: 1500 });
      K.spray(at, crit ? 8 : 3 + Math.round(3 * k), 0.18, (x, i) => K.S(o.dry, x, 'glass-l', { gain: 0.1 - 0.008 * i, rate: 1.6 + Math.random() * 0.6, hp: 2000 }));
    },
    // A deep sonar pulse out, a rising sweep, three heavy thumps of the return, a shimmer.
    ping(K, o, T) {
      const { t, arrive, hit, k, result } = T, crit = result === 'crit';
      if (T.flies) {
        K.S(o.room, t, 'bong', { gain: 0.25, rate: 0.8 });
        K.tone(o.dry, t, { type: 'sine', f0: 300, f1: 900, glide: Math.max(0.05, arrive - t), a: 0.01, hold: Math.max(0, arrive - t - 0.03), d: 0.05, peak: 0.08 });
        K.flight(o.dry, t, arrive, { f0: 600, f1: 2400, q: 1.5, peak: 0.12, pass: result === 'miss', tail: 0.28 });
      }
      if (result === 'miss') { K.S(o.room, hit + 0.16, 'bong', { gain: 0.06, rate: 0.75, lp: 1500 }); return; }
      if (result === 'chit') { K.S(o.dry, hit, 'metal-h', { gain: 0.35, rate: 1.3 }); K.S(o.room, hit + PULSE, 'glass-h', { gain: 0.12, rate: 1.4 }); return; }
      const big = crit ? 1 : k;
      for (let i = 0; i < 3; i++) {
        const x = hit + i * PULSE, w = [1, 0.75, 0.55][i];
        K.sub(o.dry, x, { f0: 140, f1: 50, glide: 0.06, d: 0.12, peak: (0.3 + 0.3 * big) * w });
        K.S(o.dry, x, 'soft-h', { gain: (0.3 + 0.2 * big) * w, rate: 1.1 });
        K.S(o.dry, x, 'glass-h', { gain: 0.08 * w, rate: 1.8 - 0.1 * i });
      }
      K.S(o.room, hit + 0.05, 'shimmer', { gain: 0.08 + 0.1 * big, rate: 1.2, off: 0.25, dur: 0.45, fade: 0.15 });
      if (crit) K.S(o.dry, hit + 2 * PULSE, 'subdrop', { gain: 0.5 });
    },
  },

  // ===== C: Digital =====
  c: {
    // Data streaming up the line, an FM charge in the draw-back, a crushed slam and a growl, chirps spilling. Cut dead.
    bash(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', b = K.crush(o.dry, 12);
      if (T.flies) {
        K.tone(b, t, { type: 'square', f0: 110, f1: 220, glide: 0.04, d: 0.05, peak: 0.12 });
        K.stream(o.dry, t, arrive, { lo: 500, hi: 760, baud: 120, rise: 1.6, peak: 0.07 });
        if (T.hold > 0.01) K.fm(b, arrive, { fc: 80, f1: 300, ratio: 2, i0: 2, i1: 7, dur: hit - arrive, peak: crit ? 0.18 : 0.1 }); // charging through the draw-back and the thrust
      }
      if (result === 'miss') { K.tone(b, hit, { type: 'square', f0: 330, f1: 160, glide: 0.08, d: 0.08, peak: 0.06 }); return; }
      if (result === 'chit') {
        K.hiss(b, hit, { type: 'highpass', f0: 6000, a: 0.0005, d: 0.01, peak: 0.35 });
        K.ring(o.dry, hit, { fc: 2600, fmod: 310, d: 0.14, peak: 0.1, type: 'triangle' });
        K.spray(hit + 0.006, 6, 0.09, (x) => K.tone(b, x, { type: 'square', f0: 2500 + Math.random() * 4000, d: 0.012, peak: 0.06 }));
        return;
      }
      const big = crit ? 1 : k;
      K.hiss(b, hit, { type: 'highpass', f0: 4500, a: 0.0005, d: 0.012, peak: 0.45 });
      K.tone(b, hit, { type: 'square', f0: 120, f1: 34, glide: 0.07, d: 0.12 + 0.08 * big, peak: 0.3 + 0.2 * big });
      K.fm(b, hit + 0.01, { fc: 95, f1: 30, ratio: 1.41, i0: 10, i1: 0.4, dur: 0.18 + 0.12 * big, peak: 0.32 });
      if (crit) K.hiss(b, hit + 0.03, { f0: 7000, f1: 1200, glide: 0.07, d: 0.08, peak: 0.3, q: 2.5 });
      const after = hit + stop;
      K.spray(after, crit ? 9 : 4 + Math.round(4 * k), 0.1, (x, i) => K.tone(b, x, { type: 'square', f0: 2600 * Math.pow(0.4, i / 8) * (0.9 + Math.random() * 0.2), d: 0.014, peak: 0.07 }));
    },
    // A falling square swing, a crushed FM anvil with a ring-mod clang, crushed echoes ringing on, static settling.
    ban(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', e = K.echo(o.dry, { time: 0.11, fb: 0.45, wet: 0.45, lp: 2200 }), b = K.crush(e, 10);
      if (T.flies) {
        K.tone(b, t, { type: 'square', f0: 70, f1: 140, glide: 0.05, d: 0.06, peak: 0.1 });
        K.tone(K.crush(o.dry, 8), t, { type: 'sawtooth', f0: 900, f1: 260, glide: Math.max(0.05, (crit ? arrive : hit) - t), hold: Math.max(0, (crit ? arrive : hit) - t - 0.02), d: 0.03, peak: 0.05 });
        if (crit) K.fm(b, arrive, { fc: 60, f1: 180, ratio: 2, i0: 2, i1: 6, dur: T.hold + 0.03, peak: 0.14 });
      }
      if (result === 'miss') return;
      if (result === 'chit') { K.ring(e, hit, { fc: 2100, fmod: 233, d: 0.2, peak: 0.12, type: 'triangle' }); K.hiss(b, hit, { type: 'highpass', f0: 5000, a: 0.0005, d: 0.012, peak: 0.3 }); return; }
      const big = crit ? 1 : k;
      K.hiss(b, hit, { type: 'highpass', f0: 4000, a: 0.0005, d: 0.014, peak: 0.45 });
      K.fm(b, hit, { fc: 75, f1: 26, ratio: 1.41, i0: 10, i1: 0.3, dur: 0.3 + 0.15 * big, peak: 0.36 });
      K.ring(e, hit + 0.005, { fc: 620, fmod: 133, d: 0.28 + 0.15 * big, peak: 0.08 + 0.05 * big, type: 'square' });
      K.tone(o.dry, hit, { f0: 70, f1: 30, glide: 0.3, d: 0.35, peak: 0.25 + 0.2 * big });
      [1568, 1175, 784].slice(0, crit ? 3 : 2).forEach((f, i) => K.tone(K.crush(e, 8), hit + 0.12 + i * 0.09, { type: 'square', f0: f, d: 0.05, peak: 0.07 }));
      K.hiss(b, hit + stop + 0.03, { type: 'highpass', f0: 2500, a: 0.01, d: 0.25, peak: 0.05 + 0.04 * big, color: 'sah' }); // static settling
    },
    // A thin bit-stream, a crushed tick and a high ping, data shards spreading through after.
    poke(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', b = K.crush(o.dry, 10);
      if (T.flies) {
        K.tone(b, t, { type: 'square', f0: 2200, d: 0.015, peak: 0.08 });
        K.stream(o.dry, t, arrive, { lo: 2600, hi: 3400, baud: 220, rise: 1.5, peak: 0.035 });
      }
      if (result === 'miss') return;
      if (result === 'chit') { K.ring(o.dry, hit, { fc: 4200, fmod: 410, d: 0.08, peak: 0.08, type: 'sine' }); K.tone(b, hit, { type: 'square', f0: 5200, d: 0.02, peak: 0.08 }); return; }
      const big = crit ? 1 : k;
      K.hiss(b, hit, { type: 'highpass', f0: 6000, a: 0.0005, d: 0.008, peak: 0.45 });
      K.tone(b, hit, { type: 'square', f0: 3800, f1: 3400, glide: 0.04, d: 0.05, peak: 0.1 });
      K.tone(b, hit, { type: 'square', f0: 220, f1: 70, glide: 0.04, d: 0.06 + 0.05 * big, peak: 0.15 + 0.2 * big });
      if (crit) K.fm(b, hit + 0.005, { fc: 180, f1: 60, ratio: 2.5, i0: 6, dur: 0.12, peak: 0.25 });
      const at = hit + stop + 0.05; // the bloom: shards spreading
      K.spray(at, crit ? 12 : 5 + Math.round(4 * k), crit ? 0.22 : 0.15, (x) => K.tone(b, x, { type: 'square', f0: 2200 + Math.random() * 5000, f1: 1800, glide: 0.02, d: 0.012 + Math.random() * 0.015, peak: 0.06 }));
    },
    // A sine ping with a crushed echo, a rising carrier, three square pings on the beats, a ring-mod tail.
    ping(K, o, T) {
      const { t, arrive, hit, k, result } = T, crit = result === 'crit', e = K.echo(o.dry, { time: 0.075, fb: 0.4, wet: 0.35, lp: 3500 });
      if (T.flies) {
        K.tone(K.crush(e, 10), t, { type: 'sine', f0: 1760, d: 0.08, peak: 0.12 });
        K.tone(o.dry, t, { type: 'triangle', f0: 880, f1: 1320, glide: Math.max(0.05, arrive - t), hold: Math.max(0, arrive - t - 0.02), d: 0.03, peak: 0.04 });
      }
      if (result === 'miss') { K.tone(K.crush(e, 8), hit + 0.12, { type: 'sine', f0: 1760, d: 0.06, peak: 0.03 }); return; }
      if (result === 'chit') { K.ring(e, hit, { fc: 3100, fmod: 270, d: 0.1, peak: 0.08, type: 'triangle' }); K.ring(e, hit + PULSE, { fc: 3100, fmod: 270, d: 0.08, peak: 0.04, type: 'triangle' }); return; }
      const big = crit ? 1 : k;
      [2093, 1568, 1047].forEach((f, i) => {
        const x = hit + i * PULSE, w = [1, 0.75, 0.55][i], b = K.crush(e, 8);
        K.tone(b, x, { type: 'square', f0: f, d: 0.05, peak: (0.1 + 0.05 * big) * w });
        K.tone(b, x, { type: 'square', f0: 140, f1: 60, glide: 0.04, d: 0.05, peak: (0.12 + 0.12 * big) * w });
      });
      K.ring(e, hit + 0.02, { fc: 2850, fmod: 150, d: 0.3, peak: 0.03 + 0.03 * big, type: 'sine' });
      if (crit) K.fm(K.crush(e, 10), hit + 3 * PULSE, { fc: 523, f1: 262, ratio: 3, i0: 4, i1: 0.5, dur: 0.2, peak: 0.12 });
    },
  },
};

// How the hit's size and result read (plan: the effect's timing in ms, from abilityfx.mjs play()).
export function timingOf(t, plan, { result = 'hit', power = 0.3 } = {}) {
  const { travel = 0, hold = 0, impact = 0, stop = 0 } = plan || {}, s = (ms) => Math.max(0, ms || 0) / 1000;
  const arrive = t + s(travel), hit = Math.max(arrive, t + s(impact));
  // strike: when the last move into contact starts (after the draw-back: the ram's thrust, the hammer coming down).
  return { t, arrive, hold: s(hold), strike: Math.min(hit, arrive + s(hold)), hit, stop: s(stop), result, k: Math.max(0, Math.min(1, power)), flies: s(travel) > 0.02 };
}

// Play key's sound in `style` into out ({ dry, room }: a dry bus and a send to the room) with T (timingOf). buf(name):
// a take of a sample (sound.mjs). False if there is none for it.
export function playAbility(ctx, out, style, key, T, buf) {
  const fn = SOUNDS[style]?.[key];
  if (!fn) return false;
  const tr = TRIM[style]?.[key] || {}, db = (x) => Math.pow(10, (x || 0) / 20), r = T.result;
  const base = db(tr.level), hit = base * (r === 'crit' ? db(tr.crit) * 1.06 : r === 'chit' ? db(tr.chit) : r === 'miss' ? db(tr.miss) : 0.78 + 0.1 * T.k);
  // Its level steps to the contact's at the hit (a miss is at its own all along); the Breaker's is cut after its stop.
  const bus = (dest) => {
    const g = ctx.createGain(), p = g.gain;
    g.connect(dest);
    const first = r === 'miss' || !T.flies ? hit : base;
    p.value = first; p.setValueAtTime(first, T.t);
    if (first !== hit) { p.setValueAtTime(base, Math.max(T.t, T.hit - 0.004)); p.linearRampToValueAtTime(hit, Math.max(T.t + 0.001, T.hit - 0.0005)); }
    if (CLASS[key] === 'breaker' && r !== 'miss') { const end = T.hit + T.stop + GATE; p.setValueAtTime(hit, end); p.linearRampToValueAtTime(0, end + 0.03); }
    return g;
  };
  fn(kit(ctx, buf), { dry: bus(out.dry), room: bus(out.room) }, T);
  return true;
}
export const hasSound = (style, key) => !!SOUNDS[style]?.[key];

// Ability sounds, the style round (docs/ability-sounds-plan.md): each class's key 1 (Bash, Ban, Poke, Ping) in three
// styles for the designer to hear against today's sounds before any of it goes into a fight.
//   a  Hardware  the machine room: relays, pistons, metal, tin, a modem. Recorded samples, lightly handled.
//   b  Weighty   big whooshes, sub thumps, a hard transient, a bright tail in a bigger space.
//   c  Digital   today's hit language per ability: bit-crushed FM, square blips, data streams, crushed echoes.
// The designer liked b's weight but heard it as being hit (it shared the hurt's punch and sub-drop samples) and as thin
// (plain hissing flights, stock punches). Round 1b, two takes on Weighty that use none of the hurt's samples:
//   b1 Cinematic  a bright crack on top of each hit (dealing the blow), a short tuned kick for weight, struck metal ringing
//                 into a hall, flights of low air, high air and a tonal swish.
//   b2 Electric   bright distorted bass discharges, arcs crackling, a breaker tripping, a transformer humming on.
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

export const STYLES = { a: 'Hardware', b: 'Weighty', c: 'Digital', b1: 'Cinematic', b2: 'Electric', b3: 'Heavy', b4: 'Seismic', b5: 'Machine', b6: 'Glitch', b7: 'Echo', b8: 'Cavern', b9: 'Soft echo' };
export const KEYS = ['bash', 'ban', 'poke', 'ping'];
// Levels (dB), so every style is heard at today's loudness: a medium hit at about −24 LUFS (momentary max), a crit
// about 2 dB over it, a hit on ◆ near −27.5 and a miss near −29.5 (today's hit plays at about −23). level: the whole
// sound; crit, chit, miss: its contact on top (a miss: all of it, the travel passing on is the sound). A plain hit's
// contact scales with its size (0.78 + 0.1 × k, on top of its own layers').
export const TRIM = {
  a: { bash: { level: 0.7, crit: -4.3, chit: 3.5, miss: 2 }, ban: { level: 2.7, crit: -4, chit: 3, miss: 2 }, poke: { level: 7.2, crit: 0, chit: -1.4, miss: 3 }, ping: { level: 10.7, crit: 1.8, chit: -4.3, miss: -2.5 } },
  b: { bash: { level: -5.5, crit: -1.5, chit: 9.7, miss: 8.5 }, ban: { level: -4.6, crit: -2.5, chit: 12.7, miss: 10 }, poke: { level: 5.5, crit: -1.5, chit: 5.4, miss: 4.5 }, ping: { level: 3.7, crit: -4.6, chit: 2.6, miss: 0 } },
  b1: { bash: { level: -0.5, crit: -2.3, chit: 2.9, miss: 4.3 }, ban: { level: 0.4, crit: -1.8, chit: 5.3, miss: 7.8 }, poke: { level: 7, crit: -1.7, chit: -1.2, miss: 4.8 }, ping: { level: 5.9, crit: -1.5, chit: -2.4, miss: 1 } },
  b2: { bash: { level: 3.2, crit: -1.9, chit: 2.4, miss: 4.3 }, ban: { level: 3.8, crit: -1.1, chit: 2.6, miss: 2.2 }, poke: { level: 13.6, crit: -2.6, chit: -3.1, miss: 8.3 }, ping: { level: 9.9, crit: -3.3, chit: -4.8, miss: -0.4 } },
  b3: { bash: { level: -10.6, crit: -1.9, chit: 7.1, miss: 10.4 }, ban: { level: -10.9, crit: -2.3, chit: 6.4, miss: 15.8 }, poke: { level: -3.6, crit: -4.6, chit: 0.5, miss: 7.7 }, ping: { level: -6.1, crit: -4.1, chit: 1.6, miss: 2.5 } },
  b4: { bash: { level: -11, crit: -2.3, chit: 5.8, miss: 10 }, ban: { level: -11.8, crit: -2.3, chit: 5.9, miss: 17 }, poke: { level: -6.8, crit: -2.3, chit: 2.8, miss: 10.9 }, ping: { level: -8.4, crit: -1.9, chit: 3.7, miss: 4.4 } },
  b5: { bash: { level: 0.9, crit: -3.3, chit: 2, miss: 3.4 }, ban: { level: -0.7, crit: -2.1, chit: 5.1, miss: 7.7 }, poke: { level: 3, crit: -4.8, chit: 1.1, miss: 3.5 }, ping: { level: -1.5, crit: -2.2, chit: 5, miss: 5 } },
  b6: { bash: { level: -0.4, crit: -5, chit: 3.9, miss: 4.5 }, ban: { level: -2.3, crit: -3.4, chit: 7.4, miss: 9.7 }, poke: { level: 0.9, crit: -5.9, chit: 2.9, miss: 5.6 }, ping: { level: -3.2, crit: -2.9, chit: 7.4, miss: 6.7 } },
  b7: { bash: { level: -3.7, crit: -2.7, chit: 0.5, miss: 2.8 }, ban: { level: -5.6, crit: -1.2, chit: 4, miss: 8.3 }, poke: { level: -2.8, crit: -3.1, chit: 1.1, miss: 3.5 }, ping: { level: -5.3, crit: -1.9, chit: 3.5, miss: 3.7 } },
  b8: { bash: { level: -5.9, crit: -2.2, chit: 0.7, miss: 2.4 }, ban: { level: -8.7, crit: 0.9, chit: -1.6, miss: 8.3 }, poke: { level: -5.7, crit: -1.8, chit: 0.3, miss: 3.4 }, ping: { level: -8.3, crit: -0.3, chit: 2.7, miss: 3.7 } },
  b9: { bash: { level: -2.6, crit: -3.5, chit: 1.6, miss: 2.9 }, ban: { level: -4.5, crit: -1.7, chit: 5.4, miss: 8.8 }, poke: { level: -1.5, crit: -4, chit: 1.2, miss: 3.7 }, ping: { level: -4.8, crit: -2.1, chit: 4.5, miss: 4.4 } },
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
      else if (color === 'crackle') { if (v <= 0 && Math.random() < 0.0025) { v = 20 + Math.random() * 180; b0 = 0.3 + Math.random() * 0.7; } d[i] = v > 0 ? w * b0 * (v-- / 200) : 0; } // sparse ticks: arcing
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
  // ---- round 1b ----
  // A place in the stereo field (-1 left … 1 right): a panner in front of dest.
  K.pan = (dest, p = 0) => { if (!ctx.createStereoPanner) return dest; const s = ctx.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p)); s.connect(dest); return s; };
  // A tuned kick: a sine dropping fast, softly clipped, with a click on top. Weight that stops, where a sub-drop rumbles.
  K.kick = (dest, t, { f0 = 150, f1 = 46, drop = 0.04, d = 0.2, peak = 0.5, click = 0.25 } = {}) => {
    K.tone(K.drive(dest, 2, 1), t, { f0, f1, glide: drop, a: 0.001, d, peak });
    if (click) K.hiss(dest, t, { type: 'highpass', f0: 2500, a: 0.0005, d: 0.006, peak: click });
  };
  // A crack: the bright, hard edge of a blow landing on something (dealing it; taking one is dull and low).
  K.crack = (dest, t, { peak = 0.4, f = 5000, d = 0.018 } = {}) => {
    K.hiss(dest, t, { type: 'highpass', f0: 3500, a: 0.0003, d: 0.005, peak });
    K.hiss(dest, t + 0.001, { type: 'bandpass', f0: f, f1: f * 0.6, glide: d, q: 1.2, a: 0.0005, d, peak: peak * 0.7 });
  };
  // A body: a band of noise and a tuned knock in the mids, what gives a hit its size.
  K.thwack = (dest, t, { f = 600, d = 0.08, peak = 0.3, tone = 180 } = {}) => {
    K.hiss(dest, t, { type: 'bandpass', f0: f * 1.6, f1: f, glide: d * 0.6, q: 1.1, a: 0.001, d, peak, color: 'pink' });
    if (tone) K.tone(dest, t, { type: 'triangle', f0: tone, f1: tone * 0.55, glide: d, a: 0.001, d: d * 1.4, peak: peak * 0.6 });
  };
  // Struck metal: partials [f, amp, decay s] as sines, each against a twin a hair off so it beats (an anvil, a bar, glass).
  K.modes = (dest, t, partials, { peak = 0.2, a = 0.001 } = {}) => {
    for (const [f, amp, d] of partials) for (const det of [-2, 2]) K.tone(dest, t, { f0: f, a, d, peak: peak * amp * 0.5, detune: det });
  };
  // Something heavy flying: low air, high air and (tone [f0, f1]) a swish riding the high band, all rising as it comes.
  K.swoosh = (dest, t0, t1, { lo = [140, 420], hi = [700, 2600], tone = null, peak = 0.25, pass = false, tail = 0.25 } = {}) => {
    K.flight(dest, t0, t1, { f0: lo[0], f1: lo[1], q: 0.7, peak: peak * 0.9, color: 'brown', pass, tail });
    K.flight(dest, t0, t1, { f0: hi[0], f1: hi[1], q: 1.3, peak: peak * 0.55, color: 'pink', pass, tail });
    if (!tone) return;
    const dur = Math.max(0.03, t1 - t0), o = ctx.createOscillator(), bp = K.f('bandpass', tone[0] * 3, 6), g = K.g(0, dest), end = t0 + dur + (pass ? tail : 0.02);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(tone[0], t0); o.frequency.exponentialRampToValueAtTime(tone[1], t0 + dur);
    bp.frequency.setValueAtTime(tone[0] * 3, t0); bp.frequency.exponentialRampToValueAtTime(tone[1] * 3, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak * 0.25, t0 + dur);
    if (pass) o.frequency.exponentialRampToValueAtTime(tone[0], end);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    o.connect(bp).connect(g); o.start(t0); o.stop(end + 0.03);
  };
  // Arcing: sparse sharp ticks through a band, swelling from t0 into t1 (rise) or dying away from t0 to t1.
  K.crackle = (dest, t0, t1, { f = 3000, q = 0.8, peak = 0.2, rise = true, pan = 0 } = {}) => {
    const s = ctx.createBufferSource(), fl = K.f('bandpass', f, q), g = K.g(0, K.pan(dest, pan)), end = Math.max(t0 + 0.02, t1);
    s.buffer = noiseOf(ctx, 'crackle');
    if (rise) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, end); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.02); }
    else { g.gain.setValueAtTime(peak, t0); g.gain.exponentialRampToValueAtTime(0.0001, end); }
    s.connect(fl).connect(g); s.start(t0, Math.random() * 1.2); s.stop(end + 0.04);
  };
  // Mains hum: a buzz and its harmonics, current through a transformer; f → f1 as it sags.
  K.hum = (dest, t, { f = 60, f1 = f, d = 0.5, peak = 0.12, a = 0.005, bright = 1400 } = {}) => {
    const o = ctx.createOscillator(), lp = K.f('lowpass', bright, 0.9), g = K.g(0, dest);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); if (f1 !== f) o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    K.env(g.gain, t, { a, peak, d }); o.connect(lp).connect(g); o.start(t); o.stop(t + a + d + 0.03);
  };
  // A discharge: a distorted bass hit (a saw and a square an octave under) whose brightness drains fast.
  K.surge = (dest, t, { f0 = 150, f1 = 42, d = 0.2, peak = 0.4, drive = 5, bright = 5000 } = {}) => {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = K.f('lowpass', bright, 1.5), g = K.g(0, dest), sat = K.drive(lp, drive, 1), sub = K.g(0.6, sat);
    o.type = 'sawtooth'; o2.type = 'square';
    for (const [x, m] of [[o, 1], [o2, 0.5]]) { x.frequency.setValueAtTime(f0 * m, t); x.frequency.exponentialRampToValueAtTime(f1 * m, t + d * 0.6); }
    lp.frequency.setValueAtTime(bright, t); lp.frequency.exponentialRampToValueAtTime(300, t + d * 0.7);
    lp.connect(g); K.env(g.gain, t, { a: 0.001, peak, d });
    o.connect(sat); o2.connect(sub);
    for (const x of [o, o2]) { x.start(t); x.stop(t + d + 0.04); }
  };
  // A spark jumping: noise through a band sweeping down fast.
  K.zap = (dest, t, { f0 = 7000, f1 = 600, d = 0.06, peak = 0.3, q = 2.5 } = {}) => K.hiss(dest, t, { type: 'bandpass', f0, f1, glide: d, q, a: 0.0005, d, peak });
  // A whine: a tone climbing from t0 to t1 as something charges, cut when it lets go.
  K.whine = (dest, t0, t1, { f0 = 400, f1 = 1600, peak = 0.06, type = 'sawtooth', lp = 3000 } = {}) => {
    const end = Math.max(t0 + 0.03, t1), o = ctx.createOscillator(), l = K.f('lowpass', lp, 1), g = K.g(0, dest);
    o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, end);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, end); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.015);
    o.connect(l).connect(g); o.start(t0); o.stop(end + 0.04);
  };
  // ---- round 1c ----
  // A boom: a sub falling, clipped so it grows harmonics (it reads on small speakers too), a triangle an octave up for body.
  K.boom = (dest, t, { f0 = 100, f1 = 30, glide = 0.14, d = 0.35, peak = 0.7, body = 0.35 } = {}) => {
    K.tone(K.drive(dest, 1.6, 1), t, { f0, f1, glide, a: 0.001, d, peak });
    if (body) K.tone(dest, t, { type: 'triangle', f0: f0 * 2, f1: f1 * 2, glide, a: 0.001, d: d * 0.6, peak: peak * body });
  };
  // A rumble: low noise rolling on after something heavy lands.
  K.rumble = (dest, t, { f = 140, d = 0.6, peak = 0.3, a = 0.015 } = {}) => K.hiss(dest, t, { type: 'lowpass', f0: f, f1: f * 0.45, glide: d, q: 0.9, a, d, peak, color: 'brown' });
  // ---- round 1d: today's digital hit (sound.mjs digitalHit), in pieces ----
  // A chopped zap: noise through a falling band, gated at 120 Hz.
  K.buzz = (dest, t, { d = 0.1, peak = 0.3, f0 = 3800, f1 = 800 } = {}) => {
    const s = ctx.createBufferSource(), bp = K.f('bandpass', f0, 2.5), chop = K.g(0.5), g = K.g(0, dest), lfo = ctx.createOscillator(), depth = K.g(0.5);
    s.buffer = noiseOf(ctx); bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(Math.max(80, f1), t + d);
    lfo.type = 'square'; lfo.frequency.value = 120; lfo.connect(depth).connect(chop.gain);
    K.env(g.gain, t, { a: 0.002, peak, d }); s.connect(bp).connect(chop).connect(g);
    s.start(t, Math.random()); s.stop(t + d + 0.05); lfo.start(t); lfo.stop(t + d + 0.05);
  };
  // Sample-and-hold static.
  K.stat = (dest, t, { d = 0.08, peak = 0.3, hp = 600 } = {}) => K.hiss(dest, t, { type: 'highpass', f0: hp, a: 0.001, d, peak, color: 'sah' });
  // A run of blips falling in pitch over static: a signal draining. Returns its length.
  K.cascade = (dest, t, n, { top = 4800, step = 0.0105, peak = 0.1 } = {}) => {
    for (let i = 0; i < n; i++) K.tone(dest, t + i * step, { type: i % 2 ? 'square' : 'sawtooth', f0: top * Math.pow(0.12, i / n) * (0.9 + Math.random() * 0.2), a: 0.001, peak, d: step * 0.86 });
    K.stat(dest, t, { d: n * step + 0.05, peak: peak * 1.6, hp: 1500 });
    return n * step;
  };
  // The impact: a hard click, a zap and a square thump at once (p: its pitch).
  K.impact = (dest, t, k, c, p = 1) => {
    K.hiss(dest, t, { type: 'highpass', f0: 4500, a: 0.0005, d: 0.012, peak: 0.45 });
    K.buzz(dest, t, { d: 0.05 + 0.04 * k, peak: 0.4, f0: 6000, f1: 900 });
    K.tone(dest, t, { type: 'square', f0: 110 * p, f1: 36 * p, glide: 0.06, a: 0.001, peak: 0.28 + 0.18 * k, d: 0.1 + 0.05 * k });
    if (c) { K.buzz(dest, t + 0.045, { d: 0.07, peak: 0.3, f0: 7000, f1: 1500 }); K.tone(dest, t, { type: 'sawtooth', f0: 220 * p, f1: 60 * p, glide: 0.08, a: 0.001, peak: 0.2, d: 0.14 }); }
  };
  // Data shards: fast random high blips, each quieter.
  K.shards = (dest, t, { n = 7, hi = 7000, lo = 2200, peak = 0.09, span = 0.12 } = {}) => {
    for (let i = 0; i < n; i++) { const f = lo + Math.random() * (hi - lo); K.tone(dest, t + Math.random() * span * (i / n + 0.15), { type: 'square', f0: f, f1: f * 0.85, glide: 0.02, a: 0.0005, peak: peak * (1 - i / (n * 1.4)), d: 0.012 + Math.random() * 0.02 }); }
  };
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

// A hit spent on ◆ (Cinematic): steel struck, ringing high, the blow glancing off it. No weight goes in.
function glance(K, o, t, { rate = 1, heavy = false } = {}) {
  K.crack(o.dry, t, { peak: 0.3, f: 6500 });
  K.S(o.dry, t, 'metal-h', { gain: 0.5, rate: 1.05 * rate });
  K.modes(o.room, t, [[1480 * rate, 1, 0.3], [3620 * rate, 0.5, 0.2], [5960 * rate, 0.3, 0.12]], { peak: 0.1 });
  K.tone(K.pan(o.dry, 0.4), t + 0.015, { f0: 3600, f1: 1400, glide: 0.2, a: 0.01, d: 0.2, peak: 0.04 });
  if (heavy) K.kick(o.dry, t, { f0: 120, f1: 70, d: 0.06, peak: 0.12, click: 0 });
}
// A hit spent on ◆ (Electric): an arc snapping on steel, sparks running off.
function spark(K, o, t, rate = 1) {
  K.crack(o.dry, t, { peak: 0.35, f: 7000, d: 0.01 });
  K.zap(o.dry, t, { f0: 9000 * rate, f1: 2500 * rate, d: 0.04, peak: 0.3 });
  K.S(o.dry, t + 0.002, 'metal-h', { gain: 0.35, rate: 1.1 * rate });
  K.crackle(o.dry, t + 0.01, t + 0.16, { f: 6000, q: 1, peak: 0.22, rise: false, pan: 0.3 });
  K.modes(o.room, t, [[1900 * rate, 1, 0.18], [4300 * rate, 0.5, 0.1]], { peak: 0.06 });
}
const side = () => Math.random() * 1.4 - 0.7;

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

  // ===== B1: Weighty, Cinematic =====
  b1: {
    // The ram: a lock lets go, a mass of air, the piston cocks and thrusts, a crack and a tuned slam into plate, debris. Cut dead.
    bash(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      if (T.flies) {
        K.kick(o.dry, t, { f0: 95, f1: 60, d: 0.07, peak: 0.18, click: 0.1 });
        K.S(o.dry, t + 0.003, 'metal-l', { gain: 0.2, rate: 0.5, lp: 2200 });
        K.swoosh(o.dry, t, arrive, { lo: [120, 380], hi: [600, 2200], tone: [70, 140], peak: 0.26, pass: miss, tail: 0.3 });
        if (!miss) {
          if (T.hold > 0.01) K.S(o.dry, arrive, 'metal-l', { gain: crit ? 0.3 : 0.18, rate: 0.35, lp: 1200, dur: T.hold + 0.02 }); // it cocks
          if (crit) K.whine(o.dry, arrive, hit, { f0: 60, f1: 190, peak: 0.12, lp: 900 }); // power gathering
          K.flight(o.dry, T.strike, hit, { f0: 500, f1: 3500, q: 1, peak: crit ? 0.3 : 0.18 }); // the thrust
        }
      }
      if (miss) return;
      if (result === 'chit') { glance(K, o, hit, { heavy: true }); return; }
      const big = crit ? 1 : k, body = K.drive(o.dry, 2.4, 1);
      K.crack(o.dry, hit, { peak: 0.6 + 0.25 * big });
      K.kick(o.dry, hit, { f0: 150, f1: 44, d: 0.16 + 0.1 * big, peak: 0.28 + 0.22 * big });
      K.thwack(body, hit, { f: 620, d: 0.08 + 0.04 * big, peak: 0.3 + 0.2 * big, tone: 170 });
      K.S(body, hit + 0.002, 'plate-l', { gain: 0.4 + 0.3 * big, rate: 0.62 });
      K.S(o.room, hit + 0.002, 'metal-l', { gain: 0.25 + 0.2 * big, rate: 0.62 });
      if (crit) { K.S(body, hit + 0.004, 'mining', { gain: 0.4, rate: 0.62 }); K.modes(o.room, hit, [[185, 1, 0.35], [497, 0.6, 0.25], [973, 0.35, 0.18]], { peak: 0.14 }); }
      K.spray(hit + stop + 0.01, crit ? 7 : 3 + Math.round(3 * k), 0.16, (x) => K.S(K.pan(o.dry, side()), x, Math.random() < 0.5 ? 'tin' : 'glass-l', { gain: 0.07, rate: 1.4 + Math.random() * 0.8, hp: 1800 })); // debris
    },
    // The hammer: a big swing, a crack and a tuned blow, and the anvil ringing on into the hall; dust settling.
    ban(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      if (T.flies) {
        K.kick(o.dry, t, { f0: 80, f1: 55, d: 0.06, peak: 0.14, click: 0.06 });
        if (!crit) K.swoosh(o.dry, t, hit, { lo: [100, 330], hi: [450, 1900], tone: [55, 120], peak: 0.3, pass: miss, tail: 0.34 });
        else { // up, a creak at the top, then down
          K.swoosh(o.dry, t, arrive, { lo: [100, 260], hi: [450, 1200], peak: 0.18 });
          K.S(o.dry, arrive, 'metal-l', { gain: 0.22, rate: 0.32, lp: 900, dur: T.hold + 0.03 });
          K.swoosh(o.dry, T.strike, hit, { lo: [150, 420], hi: [700, 2600], tone: [80, 170], peak: 0.36 });
        }
      }
      if (miss) return;
      if (result === 'chit') { glance(K, o, hit, { rate: 0.85 }); return; }
      const big = crit ? 1 : k, body = K.drive(o.dry, 2.2, 1), r = crit ? 0.85 : 1;
      K.crack(o.dry, hit, { peak: 0.65 + 0.25 * big, f: 5000 });
      K.kick(o.dry, hit, { f0: 130, f1: 40, d: 0.16 + 0.1 * big, peak: 0.28 + 0.2 * big });
      K.thwack(body, hit, { f: 520, d: 0.1, peak: 0.25 + 0.2 * big, tone: 140 });
      K.S(body, hit + 0.002, 'plate-h', { gain: 0.35 + 0.25 * big, rate: 0.75 });
      K.modes(o.room, hit, [[220 * r, 1, 0.9 + 0.5 * big], [563 * r, 0.6, 0.7], [1071 * r, 0.42, 0.5], [1752 * r, 0.3, 0.35], [2598 * r, 0.26, 0.25], [3650 * r, 0.2, 0.18], [4890 * r, 0.14, 0.12]], { peak: 0.1 + 0.08 * big }); // the anvil
      K.S(o.dry, hit + 0.001, 'metal-h', { gain: 0.2 + 0.15 * big, rate: 0.8 });
      if (crit) K.kick(o.room, hit + 0.07, { f0: 90, f1: 38, d: 0.3, peak: 0.3, click: 0 }); // a second shock through the floor
      K.hiss(o.room, hit + stop + 0.03, { f0: 3200, f1: 1300, q: 0.7, glide: 0.4, a: 0.03, d: 0.35, peak: 0.025 + 0.02 * big, color: 'pink' }); // dust
      K.spray(hit + stop + 0.05, 3 + Math.round(3 * big), 0.25, (x) => K.S(K.pan(o.dry, side()), x, 'glass-l', { gain: 0.05, rate: 1.3 + Math.random() * 0.6, hp: 2200 }));
    },
    // The needle: a crisp tick, a zip with a whistle in it, a bright crack with a small kick under it, a shimmer widening late.
    poke(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      if (T.flies) {
        K.crack(o.dry, t, { peak: 0.14, f: 7000, d: 0.01 });
        K.flight(o.dry, t, arrive, { f0: 2500, f1: 9000, q: 2.5, peak: 0.12, color: 'white', pass: miss, tail: 0.15 });
        K.whine(o.dry, t, arrive, { f0: 1800, f1: 4200, peak: 0.025, type: 'sine', lp: 8000 });
      }
      if (miss) return;
      if (result === 'chit') { glance(K, o, hit, { rate: 1.35 }); return; }
      const big = crit ? 1 : k;
      K.crack(o.dry, hit, { peak: 0.5 + 0.15 * big, f: 6500, d: 0.012 });
      K.kick(o.dry, hit, { f0: 210, f1: 70, drop: 0.025, d: 0.08 + 0.06 * big, peak: 0.25 + 0.25 * big, click: 0 });
      K.thwack(o.dry, hit, { f: 1400, d: 0.04, peak: 0.15 + 0.1 * big, tone: 0 });
      K.S(o.dry, hit + 0.001, 'glass-h', { gain: 0.18 + 0.1 * big, rate: 1.6, hp: 2000 });
      K.modes(o.room, hit, [[2420, 1, 0.25], [3730, 0.6, 0.18], [6080, 0.35, 0.12]], { peak: 0.05 + 0.04 * big });
      const at = hit + stop + 0.05, n = crit ? 9 : 4 + Math.round(4 * k); // the bloom: a shimmer opening out to both sides
      for (let i = 0; i < n; i++) K.tone(K.pan(o.room, (i % 2 ? 1 : -1) * Math.min(0.9, 0.15 + i * 0.12)), at + i * (crit ? 0.025 : 0.03) * (0.8 + Math.random() * 0.4), { f0: 3200 + Math.random() * 3200, a: 0.004, d: 0.12 + Math.random() * 0.1, peak: 0.03 * (1 - i / (n * 1.3)) });
      K.hiss(o.room, at, { type: 'highpass', f0: 5000, a: 0.03, d: 0.22, peak: 0.03 + 0.03 * big });
    },
    // The pulse: a deep sonar thoom goes out, a band of air rising, the return in three tuned beats with glass on top, a ring.
    ping(K, o, T) {
      const { t, arrive, hit, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      if (T.flies) {
        K.tone(o.room, t, { f0: 92, f1: 58, glide: 0.18, a: 0.008, d: 0.2, peak: 0.2 });
        K.modes(o.room, t + 0.004, [[880, 1, 0.3], [1762, 0.4, 0.2]], { peak: 0.06 });
        K.flight(o.dry, t, arrive, { f0: 500, f1: 1800, q: 1.4, peak: 0.12, pass: miss, tail: 0.3 });
      }
      if (miss) { K.modes(o.room, hit + 0.16, [[880, 1, 0.2]], { peak: 0.02 }); return; } // it comes back with nothing
      if (result === 'chit') { glance(K, o, hit, { rate: 1.15 }); K.S(o.room, hit + PULSE, 'tin', { gain: 0.1, rate: 1.6 }); return; }
      const big = crit ? 1 : k;
      for (let i = 0; i < 3; i++) {
        const x = hit + i * PULSE, w = [1, 0.75, 0.55][i] * (crit && i === 2 ? 1.5 : 1), f = [1, 0.94, 0.89][i];
        K.crack(o.dry, x, { peak: 0.4 * w, f: 5000, d: 0.01 });
        K.kick(o.dry, x, { f0: 120, f1: 52, d: 0.11, peak: (0.18 + 0.15 * big) * w, click: 0 });
        K.modes(K.pan(o.dry, [0, -0.35, 0.35][i]), x, [[1318 * f, 1, 0.14], [2637 * f, 0.5, 0.1], [5274 * f, 0.3, 0.06]], { peak: 0.13 * w });
      }
      K.modes(o.room, hit + 0.01, [[659, 1, 0.6], [1320, 0.5, 0.45], [1980, 0.3, 0.3]], { peak: 0.03 + 0.03 * big }); // the ring
      if (crit) K.tone(o.room, hit + 2 * PULSE, { f0: 70, f1: 45, glide: 0.3, a: 0.01, d: 0.45, peak: 0.3 });
    },
  },

  // ===== B2: Weighty, Electric =====
  b2: {
    // A breaker arms, an arc runs out and charges in the draw-back, a discharge slams in as the breaker trips; sparks. Cut dead.
    bash(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      if (T.flies) {
        K.S(o.dry, t, 'relay', { gain: 0.4, rate: 0.5 });
        K.whine(o.dry, t, arrive, { f0: 110, f1: 220, peak: 0.1, lp: 1800 }); // current building
        K.crackle(o.dry, t, arrive, { f: 2800, q: 0.7, peak: 0.3 });
        if (!miss) {
          K.whine(o.dry, arrive, hit, { f0: 500, f1: crit ? 2600 : 1500, peak: crit ? 0.07 : 0.04, type: 'sine', lp: 6000 }); // charging
          K.crackle(o.dry, arrive, hit, { f: 4000, q: 0.8, peak: crit ? 0.4 : 0.25 });
        }
      }
      if (miss) { K.zap(o.dry, hit, { f0: 3000, f1: 400, d: 0.12, peak: 0.08 }); K.crackle(o.dry, hit, hit + 0.2, { f: 2000, peak: 0.12, rise: false }); return; } // spent on the air
      if (result === 'chit') { spark(K, o, hit, 1); return; }
      const big = crit ? 1 : k;
      K.crack(o.dry, hit, { peak: 0.45 + 0.2 * big });
      K.zap(o.dry, hit, { f0: 8000, f1: 500, d: 0.07 + 0.03 * big, peak: 0.35 });
      K.surge(o.dry, hit, { f0: 170, f1: 44, d: 0.18 + 0.1 * big, peak: 0.32 + 0.22 * big, drive: 5 });
      K.S(o.dry, hit + 0.004, 'relay', { gain: 0.55, rate: 0.42 }); // the breaker trips
      K.S(o.dry, hit + 0.006, 'metal-l', { gain: 0.25 + 0.2 * big, rate: 0.55, lp: 3000 });
      if (crit) { K.surge(o.dry, hit + 0.05, { f0: 120, f1: 36, d: 0.22, peak: 0.3, drive: 6, bright: 3000 }); K.zap(o.dry, hit + 0.05, { f0: 6000, f1: 300, d: 0.1, peak: 0.25 }); }
      for (const p of [-0.5, 0.5]) K.crackle(o.dry, hit + stop + (p > 0 ? 0.02 : 0), hit + stop + 0.14 + 0.06 * big, { f: 5000, q: 1, peak: 0.25, rise: false, pan: p }); // sparks
    },
    // A contactor closes, an arc swings over, an arc-welder strike with a heavy discharge, the transformer humming on, sagging.
    ban(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', miss = result === 'miss', end = crit ? arrive : hit;
      if (T.flies) {
        K.S(o.dry, t, 'relay', { gain: 0.35, rate: 0.42 });
        K.kick(o.dry, t, { f0: 70, f1: 50, d: 0.06, peak: 0.12, click: 0 });
        K.whine(o.dry, t, end, { f0: 60, f1: 120, peak: 0.12, lp: 1200 });
        K.crackle(o.dry, t, end, { f: 2200, peak: 0.28 });
        K.flight(o.dry, t, end, { f0: 300, f1: 1200, q: 0.8, peak: 0.1, color: 'pink', pass: miss, tail: 0.3 });
        if (crit) { K.whine(o.dry, arrive, hit, { f0: 300, f1: 2000, peak: 0.06, type: 'sine', lp: 5000 }); K.crackle(o.dry, arrive, hit, { f: 3500, peak: 0.4 }); }
      }
      if (miss) { K.crackle(o.dry, hit, hit + 0.25, { f: 1800, peak: 0.1, rise: false }); return; }
      if (result === 'chit') { spark(K, o, hit, 0.85); K.hum(o.room, hit, { f: 120, f1: 110, d: 0.25, peak: 0.04 }); return; }
      const big = crit ? 1 : k;
      K.crack(o.dry, hit, { peak: 0.6 + 0.2 * big, f: 5000 });
      K.zap(o.dry, hit, { f0: 8000, f1: 500, d: 0.09, peak: 0.45 });
      K.surge(o.dry, hit, { f0: 140, f1: 36, d: 0.3 + 0.12 * big, peak: 0.27 + 0.16 * big, drive: 5, bright: 7000 });
      K.S(o.dry, hit + 0.003, 'plate-h', { gain: 0.25 + 0.2 * big, rate: 0.55 });
      K.crackle(o.dry, hit, hit + 0.12, { f: 5500, q: 1, peak: 0.3, rise: false }); // sparks off the strike
      if (crit) K.surge(o.room, hit + 0.08, { f0: 100, f1: 32, d: 0.3, peak: 0.28, drive: 6, bright: 2500 });
      // It rings on: the transformer hums, sagging, with crackle dying away.
      K.hum(o.room, hit + 0.01, { f: 120, f1: 104, d: 0.6 + 0.4 * big, a: 0.01, peak: 0.07 + 0.05 * big, bright: 1600 });
      K.hum(o.room, hit + 0.01, { f: 60, f1: 52, d: 0.7 + 0.4 * big, a: 0.01, peak: 0.04, bright: 600 });
      K.crackle(o.room, hit + stop, hit + stop + 0.5 + 0.3 * big, { f: 3000, peak: 0.12, rise: false });
    },
    // A static snap, a thin arc whining in, a hard spark with a small thump, and the current crawling out through it late.
    poke(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      if (T.flies) {
        K.zap(o.dry, t, { f0: 9000, f1: 3000, d: 0.015, peak: 0.15 });
        K.crackle(o.dry, t, arrive, { f: 6000, q: 1.2, peak: 0.18 });
        K.whine(o.dry, t, arrive, { f0: 2500, f1: 5500, peak: 0.02, type: 'sine', lp: 9000 });
      }
      if (miss) { K.crackle(o.dry, hit, hit + 0.12, { f: 5000, peak: 0.08, rise: false }); return; }
      if (result === 'chit') { spark(K, o, hit, 1.3); return; }
      const big = crit ? 1 : k;
      K.crack(o.dry, hit, { peak: 0.5, f: 7000, d: 0.012 });
      K.zap(o.dry, hit, { f0: 8500, f1: 1800, d: 0.035, peak: 0.35 });
      K.surge(o.dry, hit, { f0: 240, f1: 80, d: 0.07 + 0.05 * big, peak: 0.2 + 0.2 * big, drive: 4, bright: 7000 });
      const at = hit + stop + 0.05, n = crit ? 8 : 3 + Math.round(4 * k); // the bloom: current crawling out to both sides
      K.crackle(o.dry, at, at + 0.18 + 0.1 * big, { f: 4500, peak: 0.22, rise: false, pan: -0.6 });
      K.crackle(o.dry, at + 0.03, at + 0.2 + 0.1 * big, { f: 5200, peak: 0.2, rise: false, pan: 0.6 });
      K.spray(at, n, 0.2, (x) => K.zap(K.pan(o.dry, side()), x, { f0: 7000 + Math.random() * 3000, f1: 3000, d: 0.012, peak: 0.08 }));
    },
    // An EM pulse: a charge whines up, the pulse throbs out, three discharges land, the hum fades with a last crackle.
    ping(K, o, T) {
      const { t, arrive, hit, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      if (T.flies) {
        K.S(o.dry, t, 'relay', { gain: 0.3, rate: 0.7 });
        K.whine(o.dry, t, t + 0.06, { f0: 300, f1: 900, peak: 0.06 });
        K.whine(o.dry, t, arrive, { f0: 90, f1: 140, peak: 0.08, type: 'square', lp: 2400 });
        K.crackle(o.dry, t, arrive, { f: 3000, peak: 0.18 });
      }
      if (miss) { K.crackle(o.room, hit + 0.1, hit + 0.3, { f: 3000, peak: 0.05, rise: false }); return; }
      if (result === 'chit') { spark(K, o, hit, 1.15); spark(K, { dry: K.g(0.5, o.dry), room: K.g(0.5, o.room) }, hit + PULSE, 1.2); return; }
      const big = crit ? 1 : k;
      for (let i = 0; i < 3; i++) {
        const x = hit + i * PULSE, w = [1, 0.75, 0.55][i];
        K.surge(o.dry, x, { f0: 130 - 8 * i, f1: 55, d: 0.09, peak: (0.2 + 0.16 * big) * w, drive: 4, bright: 6500 });
        K.zap(o.dry, x, { f0: 7000, f1: 1500, d: 0.03, peak: 0.32 * w });
        K.crackle(o.dry, x, x + 0.07, { f: 5000, peak: 0.25 * w, rise: false, pan: [0, -0.4, 0.4][i] });
      }
      K.hum(o.room, hit + 0.01, { f: 120, f1: 110, d: 0.45, a: 0.01, peak: 0.04 + 0.03 * big, bright: 1400 });
      if (crit) { K.surge(o.dry, hit + 3 * PULSE, { f0: 110, f1: 34, d: 0.25, peak: 0.35, drive: 6 }); K.zap(o.dry, hit + 3 * PULSE, { f0: 6000, f1: 300, d: 0.12, peak: 0.25 }); }
    },
  },
};

// ===== Heavy and Seismic (round 1c): round 1's Weighty with far more low end. Every layer is tuned down, a boom and
// the sub-drop sit under every hit, the flights carry low air. L 0: Heavy, a deep slam that stops. L 1: Seismic, lower
// still, its booms rolling on into a rumble. =====
function heavy(L) {
  const far = 1 + 0.8 * L, low = 1 - 0.14 * L;
  const lo = (K, dest) => K.g(2.2, dest); // the low end leads: booms, the sub-drop and rumbles, well over the rest
  const clang = (K, o, t, rate, g = 1) => { // on ◆: a heavy clang, a thunk under it, and it whizzes off
    K.S(o.dry, t, 'metal-h', { gain: 0.55 * g, rate: 0.85 * rate });
    K.S(o.dry, t + 0.003, 'metal-l', { gain: 0.45 * g, rate: 0.7 * rate * low });
    K.boom(lo(K, o.dry), t, { f0: 110, f1: 55 * low, glide: 0.05, d: 0.09 * far, peak: 0.3 * g, body: 0.5 });
    K.tone(o.dry, t + 0.02, { f0: 3000 * rate, f1: 1200 * rate, glide: 0.18, d: 0.18, peak: 0.04 });
  };
  return {
    // A charge, low air rushing in, a reversed swell, the slam with a boom and the sub-drop under it, rubble. Stops dead.
    bash(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      if (T.flies) {
        K.S(o.dry, t, 'soft-h', { gain: 0.4, rate: 0.5 * low, lp: 900 });
        K.boom(lo(K, o.dry), t, { f0: 80, f1: 45, glide: 0.05, d: 0.09, peak: 0.2 });
        K.swoosh(o.dry, t, arrive, { lo: [60, 240], hi: [280, 1700], peak: 0.42, pass: miss, tail: 0.3 });
        if (!miss) K.S(o.dry, 0, 'punch-h', { reverse: true, end: hit, dur: Math.max(0.06, hit - arrive), gain: crit ? 0.55 : 0.3, rate: 0.6 * low, lp: 2500 });
      }
      if (miss) return;
      if (result === 'chit') return clang(K, o, hit, 1);
      const big = crit ? 1 : k, d = K.drive(o.dry, 2.5, 1);
      K.crack(o.dry, hit, { peak: 0.42, f: 3200 });
      K.S(d, hit, 'punch-h', { gain: 0.7 + 0.4 * big, rate: (0.62 - 0.08 * big) * low });
      K.S(d, hit + 0.002, 'soft-h', { gain: 0.5 + 0.3 * big, rate: 0.55 * low });
      K.thwack(o.dry, hit, { f: 240, d: 0.09, peak: 0.3 + 0.2 * big, tone: 110 * low });
      K.boom(lo(K, o.dry), hit, { f0: 105, f1: 30 * low, glide: 0.14, d: (0.3 + 0.18 * big) * far, peak: 0.75 + 0.4 * big });
      K.S(lo(K, o.dry), hit, 'subdrop', { gain: (0.4 + 0.4 * big) * (crit ? 1.2 : 1), rate: low, jitter: 0 });
      if (L) K.rumble(lo(K, o.dry), hit + 0.01, { d: 0.3, peak: 0.25 + 0.2 * big });
      K.spray(hit + stop + 0.01, crit ? 8 : 3 + Math.round(4 * k), 0.14, (x, i) => K.S(o.dry, x, 'mining', { gain: 0.1 - 0.008 * i, rate: 0.9 + Math.random() * 0.5, off: 0.05, dur: 0.07, hp: 500 }));
    },
    // A deep swing, an enormous strike: low plate and a long boom into the hall, the ground rolling on after.
    ban(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      if (T.flies) {
        K.S(o.dry, t, 'soft-m', { gain: 0.3, rate: 0.5 * low, lp: 800 });
        K.swoosh(o.dry, t, crit ? arrive : hit, { lo: [50, 200], hi: [160, 800], peak: 0.45, pass: miss, tail: 0.34 });
        if (crit) K.S(o.dry, 0, 'punch-h', { reverse: true, end: hit, dur: hit - arrive, gain: 0.6, rate: 0.5 * low, lp: 2200 });
      }
      if (miss) return;
      if (result === 'chit') { clang(K, o, hit, 0.9); K.S(o.room, hit + 0.003, 'bell', { gain: 0.15, rate: 0.9, dur: 0.5, fade: 0.2 }); return; }
      const big = crit ? 1 : k, d = K.drive(o.dry, 2.2, 1);
      K.crack(o.dry, hit, { peak: 0.38, f: 2800 });
      K.S(d, hit, 'punch-h', { gain: 0.65 + 0.35 * big, rate: (0.52 - 0.06 * big) * low });
      K.S(d, hit + 0.003, 'plate-l', { gain: 0.45 + 0.3 * big, rate: 0.5 * low });
      K.S(o.room, hit + 0.002, 'metal-l', { gain: 0.35 + 0.3 * big, rate: 0.45 * low });
      K.thwack(o.dry, hit, { f: 200, d: 0.12, peak: 0.3 + 0.2 * big, tone: 90 * low });
      K.boom(lo(K, o.dry), hit, { f0: 85, f1: 26 * low, glide: 0.2, d: (0.5 + 0.25 * big) * far, peak: 0.8 + 0.35 * big });
      K.S(lo(K, o.dry), hit, 'subdrop', { gain: (0.45 + 0.4 * big) * (crit ? 1.2 : 1), rate: 0.9 * low, jitter: 0 });
      K.rumble(lo(K, o.room), hit + stop + 0.02, { f: 160, d: 0.6 * far, peak: 0.25 + 0.25 * big });
      K.rumble(lo(K, o.dry), hit + 0.01, { f: 110, d: 0.4 * far, peak: (0.15 + 0.15 * big) * (0.6 + L) });
    },
    // A quick low dart, a thick stab with a short boom, a dark bloom after.
    poke(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      if (T.flies) {
        K.boom(lo(K, o.dry), t, { f0: 140, f1: 70, glide: 0.03, d: 0.05, peak: 0.18 });
        K.swoosh(o.dry, t, arrive, { lo: [160, 600], hi: [900, 4200], peak: 0.3, pass: miss, tail: 0.18 });
      }
      if (miss) return;
      if (result === 'chit') return clang(K, o, hit, 1.35, 0.8);
      const big = crit ? 1 : k, d = K.drive(o.dry, 2, 1);
      K.crack(o.dry, hit, { peak: 0.45, f: 4200 });
      K.S(d, hit, 'punch-m', { gain: 0.55 + 0.35 * big, rate: 0.85 * low });
      K.S(d, hit + 0.002, 'soft-h', { gain: 0.35 + 0.2 * big, rate: 0.75 * low });
      K.boom(lo(K, o.dry), hit, { f0: 130, f1: 40 * low, glide: 0.07, d: (0.16 + 0.1 * big) * far, peak: 0.6 + 0.35 * big });
      if (crit || L) K.S(lo(K, o.dry), hit, 'subdrop', { gain: crit ? 0.6 : 0.25 + 0.3 * big, rate: 1.1 * low, jitter: 0 });
      const at = hit + stop + 0.05; // the bloom
      K.rumble(lo(K, o.room), at, { f: 220, d: 0.3 * far, peak: 0.2 + 0.2 * big, a: 0.04 });
      K.S(o.room, at, 'shimmer', { gain: 0.06 + 0.08 * big, rate: 0.9, off: 0.3, dur: 0.35, fade: 0.12 });
      K.spray(at, crit ? 7 : 3 + Math.round(3 * k), 0.18, (x, i) => K.S(o.dry, x, 'glass-l', { gain: 0.08 - 0.007 * i, rate: 0.9 + Math.random() * 0.4 }));
    },
    // A deep sonar pulse out, a low sweep, the return as three booms, each lower.
    ping(K, o, T) {
      const { t, arrive, hit, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      if (T.flies) {
        K.S(o.room, t, 'bong', { gain: 0.3, rate: 0.55 * low });
        K.boom(lo(K, o.dry), t, { f0: 90, f1: 50, glide: 0.06, d: 0.12, peak: 0.25 });
        K.tone(o.dry, t, { f0: 110, f1: 330, glide: Math.max(0.05, arrive - t), a: 0.01, hold: Math.max(0, arrive - t - 0.03), d: 0.05, peak: 0.12 });
        K.swoosh(o.dry, t, arrive, { lo: [90, 320], hi: [400, 1600], peak: 0.22, pass: miss, tail: 0.28 });
      }
      if (miss) { K.S(o.room, hit + 0.16, 'bong', { gain: 0.07, rate: 0.5, lp: 1200 }); return; }
      if (result === 'chit') { clang(K, o, hit, 1.2, 0.8); return; }
      const big = crit ? 1 : k, d = K.drive(o.dry, 2, 1);
      for (let i = 0; i < 3; i++) {
        const x = hit + i * PULSE, w = [1, 0.8, 0.65][i], dn = 1 - 0.1 * i;
        K.boom(lo(K, o.dry), x, { f0: 125 * dn, f1: 40 * dn * low, glide: 0.06, d: 0.13 * (i === 2 ? far * 1.6 : 1), peak: (0.6 + 0.35 * big) * w });
        K.S(d, x, 'soft-h', { gain: (0.4 + 0.25 * big) * w, rate: 0.8 * dn * low });
        K.S(d, x, 'punch-m', { gain: (0.25 + 0.2 * big) * w, rate: 0.75 * dn * low });
        K.hiss(o.dry, x, { type: 'highpass', f0: 3000, a: 0.0005, d: 0.006, peak: 0.32 * w });
      }
      K.S(o.room, hit, 'bong', { gain: 0.1 + 0.1 * big, rate: 0.4 * low });
      if (crit || big > 0.5 || L) K.S(lo(K, o.dry), hit + 2 * PULSE, 'subdrop', { gain: crit ? 0.7 : 0.25 + 0.3 * big, rate: low, jitter: 0 });
      if (L) K.rumble(lo(K, o.room), hit + 2 * PULSE, { d: 0.5, peak: 0.2 + 0.2 * big });
    },
  };
}
SOUNDS.b3 = heavy(0);
SOUNDS.b4 = heavy(1);

// ===== Machine and Glitch (round 1d): today's hit (sound.mjs digitalHit: a crushed impact, a cascade of blips, an FM
// growl, pings through crushed echoes) taken apart and timed to each effect, with a boom under it. L 0: Machine.
// L 1: Glitch, the hit stuttering like a stuck buffer, lower and heavier. =====
// L: lower and stuttering (Glitch). W: wetter, its echoes longer and louder with a far repeat ringing into the room.
function core(L, W = 0) {
  const low = 1 - 0.15 * L;
  const bus = (K, o, e) => {
    const { time = 0.09, fb = 0.4, wet = 0.4, lp = 2600 } = e;
    const fx = K.echo(o.dry, { time: time * (1 + 0.2 * W), fb: Math.min(0.8, fb + 0.12 * W), wet: wet + 0.3 * W, lp });
    if (W) fx.connect(K.echo(K.g(0.4 * W, o.room), { time: time * 2.6, fb: 0.4 + 0.1 * W, wet: 1, lp: 1700 })); // the far repeat
    return { fx, b: K.crush(fx, 12, 2.8, 0.5) };
  };
  const weight = (K, o, t, big, crit, { f0 = 105, f1 = 30, d = 0.3, drop = 0.5 } = {}) => {
    K.boom(K.g(0.55 + 0.3 * L, o.dry), t, { f0, f1: f1 * low, glide: d * 0.45, d: d * (1 + 0.5 * big), peak: 0.6 + 0.4 * big });
    if (crit || big > drop) K.S(o.dry, t, 'subdrop', { gain: (crit ? 0.55 : 0.3) * (1 + 0.5 * L), rate: low, jitter: 0 });
  };
  // A stuck buffer: the thump's first few ms again and again, with static and a glitch tick.
  const stutter = (K, b, t, n, gap, p = 1) => { for (let i = 1; i <= n; i++) {
    const x = t + i * gap, w = 1 - i / (n + 1.5);
    K.tone(b, x, { type: 'square', f0: 72 * p, a: 0.0005, d: gap * 0.45, peak: 0.34 * w });
    K.stat(b, x, { d: gap * 0.4, peak: 0.22 * w, hp: 1800 });
    K.S(b, x, 'glitch', { gain: 0.5 * w, rate: 0.7 + Math.random() * 0.8 });
  } };
  const snap = (K, o, t, p = 1) => { // on ◆: today's shatter, a crushed snap, shards and a ringing ping, with a thunk
    const { fx, b } = bus(K, o, { time: 0.06, fb: 0.35, wet: 0.35, lp: 5000 });
    K.hiss(b, t, { type: 'highpass', f0: 6000, a: 0.0005, d: 0.01, peak: 0.4 });
    K.buzz(b, t, { d: 0.035, peak: 0.35, f0: 8000, f1: 2500 });
    K.shards(b, t + 0.006, { n: 9 });
    K.ring(fx, t + 0.02, { fc: 3200 * p, fmod: 230, d: 0.12, peak: 0.07, type: 'sine' });
    K.tone(b, t, { type: 'square', f0: 130 * p, f1: 70 * p, glide: 0.04, a: 0.001, d: 0.05, peak: 0.2 });
  };
  const pings = (K, fx, t, notes, gap, pan = 0) => notes.forEach((f, i) => {
    const x = t + i * gap, d = pan ? K.pan(fx, (i % 2 ? 1 : -1) * pan) : fx;
    K.tone(K.crush(d, 8), x, { type: 'square', f0: f, a: 0.001, peak: 0.1, d: 0.05 });
    K.ring(d, x, { fc: f * 1.5, fmod: 150, d: 0.06, peak: 0.05 });
  });
  return {
    // Data running up the line with low air under it, an FM charge in the draw-back, the impact, a short cascade and growl. Cut dead.
    bash(K, o, T) {
      const { t, arrive, hit, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      const { b } = bus(K, o, { time: 0.09, fb: 0.3, wet: 0.35 });
      if (T.flies) {
        K.tone(b, t, { type: 'square', f0: 90, f1: 180, glide: 0.04, d: 0.05, peak: 0.16 });
        K.stream(b, t, arrive, { lo: 260, hi: 390, baud: 110, rise: 1.7, peak: 0.05 });
        K.flight(o.dry, t, arrive, { f0: 70, f1: 320, q: 0.7, peak: 0.3, color: 'brown', pass: miss, tail: 0.3 });
        if (!miss && hit - arrive > 0.03) K.fm(b, arrive, { fc: 55, f1: 190, ratio: 2, i0: 2, i1: 7, dur: hit - arrive, peak: crit ? 0.2 : 0.12 });
      }
      if (miss) return;
      if (result === 'chit') return snap(K, o, hit, 0.9);
      const big = crit ? 1 : k;
      K.impact(b, hit, big, crit, 0.9 * low);
      const w = K.cascade(b, hit + 0.015, crit ? 14 : 7 + Math.round(5 * k));
      K.fm(b, hit + 0.015 + w, { fc: 110 * low, f1: 36 * low, ratio: 1.5, i0: 8, i1: 0.5, dur: 0.16 + 0.08 * big, peak: 0.4 });
      weight(K, o, hit, big, crit, { d: 0.26 });
      stutter(K, b, hit, (L ? 3 : 1) + (crit ? 1 : 0), 0.042, 0.9 * low);
    },
    // A low carrier swinging in, the impact lower, a long slow cascade into a long growl, pings and a tone ringing on.
    ban(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      const { fx, b } = bus(K, o, { time: 0.11, fb: 0.55, wet: 0.5 });
      if (T.flies) {
        K.tone(b, t, { type: 'square', f0: 70, f1: 110, glide: 0.06, d: 0.07, peak: 0.16 });
        K.fm(b, t, { fc: 45, f1: 120, ratio: 2, i0: 1.5, i1: 5, dur: Math.max(0.05, (crit ? arrive : hit) - t), peak: 0.09 });
        K.flight(o.dry, t, crit ? arrive : hit, { f0: 55, f1: 240, q: 0.6, peak: 0.34, color: 'brown', pass: miss, tail: 0.34 });
        if (crit) K.stream(b, arrive, hit, { lo: 200, hi: 300, baud: 90, rise: 2, peak: 0.06 });
      }
      if (miss) return;
      if (result === 'chit') return snap(K, o, hit, 0.75);
      const big = crit ? 1 : k;
      K.impact(b, hit, big, crit, 0.72 * low);
      const w = K.cascade(b, hit + 0.015, crit ? 26 : 13 + Math.round(9 * k), { top: 3600, step: 0.013 });
      const t0 = hit + 0.015 + w;
      K.fm(b, t0, { fc: 90 * low, f1: 30 * low, ratio: 1.5, i0: 8, i1: 0.5, dur: 0.34 + 0.16 * big, peak: 0.4 });
      pings(K, fx, t0 + 0.1, [1047, 784, 523, 392], 0.08);
      for (const [f, g] of [[950, 0.045], [1425, 0.03]]) K.tone(o.room, t0 + 0.05, { f0: f, f1: f * 0.97, glide: 0.7, a: 0.002, peak: g, d: 0.7 + 0.3 * big });
      weight(K, o, hit, big, crit, { f0: 85, f1: 26, d: 0.45, drop: 0.4 });
      stutter(K, b, hit + stop, (L ? 3 : 1) + (crit ? 1 : 0), 0.06, 0.72 * low);
    },
    // A quick zap in, a tight crushed stab, then the cascade and pings spilling out wide after.
    poke(K, o, T) {
      const { t, arrive, hit, stop, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      const { fx, b } = bus(K, o, { time: 0.07, fb: 0.5, wet: 0.5, lp: 3600 });
      if (T.flies) {
        K.buzz(b, t, { d: 0.03, peak: 0.2, f0: 7000, f1: 2500 });
        K.stream(b, t, arrive, { lo: 900, hi: 1350, baud: 200, rise: 2, peak: 0.035 });
        K.flight(o.dry, t, arrive, { f0: 160, f1: 900, q: 0.9, peak: 0.2, color: 'brown', pass: miss, tail: 0.18 });
      }
      if (miss) return;
      if (result === 'chit') return snap(K, o, hit, 1.25);
      const big = crit ? 1 : k;
      K.hiss(b, hit, { type: 'highpass', f0: 4500, a: 0.0005, d: 0.01, peak: 0.45 });
      K.buzz(b, hit, { d: 0.03, peak: 0.35, f0: 7000, f1: 1200 });
      K.tone(b, hit, { type: 'square', f0: 150 * low, f1: 48 * low, glide: 0.045, a: 0.001, peak: 0.3 + 0.18 * big, d: 0.07 + 0.03 * big });
      weight(K, o, hit, big * 0.8, crit, { f0: 130, f1: 42, d: 0.16, drop: 2 });
      if (L) stutter(K, b, hit, 2, 0.03, 1.3 * low);
      const at = hit + stop + 0.05, w = K.cascade(K.pan(b, -0.4), at, crit ? 18 : 8 + Math.round(8 * k), { top: 6500, step: 0.009, peak: 0.08 }); // the bloom
      K.fm(b, at, { fc: 140 * low, f1: 50 * low, ratio: 1.5, i0: 6, i1: 0.5, dur: 0.12 + 0.06 * big, peak: 0.22 });
      K.shards(K.pan(fx, 0.5), at + 0.02, { n: crit ? 10 : 4 + Math.round(4 * k), span: 0.2, peak: 0.07 });
      pings(K, fx, at + w, [2093, 1568], 0.06, 0.6);
    },
    // A crushed ping out, a carrier climbing, the return as three impacts stepping down, a growl after the third, pings back.
    ping(K, o, T) {
      const { t, arrive, hit, k, result } = T, crit = result === 'crit', miss = result === 'miss';
      const { fx, b } = bus(K, o, { time: PULSE, fb: 0.45, wet: 0.45 });
      if (T.flies) {
        pings(K, fx, t, [1568], 0);
        K.tone(b, t, { type: 'square', f0: 80, f1: 60, glide: 0.05, d: 0.06, peak: 0.16 });
        K.tone(b, t, { type: 'square', f0: 196, f1: 784, glide: Math.max(0.05, arrive - t), a: 0.01, hold: Math.max(0, arrive - t - 0.03), d: 0.03, peak: 0.035 });
        K.flight(o.dry, t, arrive, { f0: 90, f1: 420, q: 0.8, peak: 0.2, color: 'brown', pass: miss, tail: 0.28 });
      }
      if (miss) { pings(K, fx, hit + 0.16, [392], 0); return; }
      if (result === 'chit') return snap(K, o, hit, 1.1);
      const big = crit ? 1 : k;
      for (let i = 0; i < 3; i++) {
        const x = hit + i * PULSE, w = [1, 0.8, 0.65][i], p = [1.15, 0.95, 0.78][i] * low;
        K.impact(K.g(w, b), x, big, crit && i === 2, p);
        weight(K, o, x, big * w, false, { f0: 120 * p, f1: 40 * p, d: i === 2 ? 0.24 : 0.12, drop: 2 });
      }
      const t0 = hit + 2 * PULSE + 0.02;
      if (crit || big > 0.5) K.S(o.dry, hit + 2 * PULSE, 'subdrop', { gain: (crit ? 0.5 : 0.28) * (1 + 0.5 * L), rate: low, jitter: 0 });
      const w = crit ? K.cascade(b, t0, 12) : 0;
      K.fm(b, t0 + w, { fc: 100 * low, f1: 36 * low, ratio: 1.5, i0: 8, i1: 0.5, dur: 0.16 + 0.1 * big, peak: 0.32 });
      pings(K, fx, t0 + w + PULSE, [2093, 1568, 1047], PULSE, 0.4);
      if (L) stutter(K, b, hit + 2 * PULSE, 2 + (crit ? 1 : 0), PULSE / 3, low);
    },
  };
}
SOUNDS.b5 = core(0);
SOUNDS.b6 = core(1);
SOUNDS.b7 = core(1, 1.5);
SOUNDS.b8 = core(1, 2.5);
SOUNDS.b9 = core(1, 1.05);

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

// Virus attack sounds, round 2 (docs/ability-sounds-plan.md, "Virus attacks"): every other attack in the picked style
// (virussound.mjs PICKED: Corrupt), each built from its chip theme's strike (chipfx.mjs STRIKE_PLAN) in the round's
// four layers:
//   launch   as its chip goes off, its theme's (ice breaking, a lamp sweeping, plates clanging shut, reels locking)
//   travel   what flies, for as long as it does (hex streaming, shards falling, copies coming over one by one)
//   contact  on your bar, the number's beat: the pick's hit (H.rot: a crushed thump, a growl falling, the buffer
//            sticking), a glance off your wall, or nothing as it goes past
//   tail     what the strike leaves on your bar (streams still landing, the wipe running out, thorns quivering)
// Then the lash (a part with no theme), and three that aren't a hit on you: Scramble (your timers go dark), Replicate
// (the copies land on a new fragment, and it boots) and Patch (a part seals itself).
// virussound.mjs hands in the pick's own voices (H) and plays these with the round's four.

// Each sound: (K, out, T) as virussound.mjs describes; T.pre and T.post are the strike's other marks (s).
export function every(H) {
  const { bus, weight, glance, aside, read, side, crushed, stuck, dropout, rot } = H;
  // One short slice of a sample, dulled.
  const grain = (K, dest, t, name, { rate = 1, gain = 0.3, dur = 0.03, lp = 2400, pan = 0, off = 0.02 } = {}) => K.S(pan ? K.pan(dest, pan) : dest, t, name, { gain, rate, jitter: 0, off, dur, fade: 0.002, lp });
  // n slices from t0 to t1, each somewhere of its own; rate and gain run from their first value to their last, and
  // ease bunches them toward the end (over 1) or the start (under 1).
  const chatter = (K, dest, t0, t1, name, { n = 8, rate = [1, 1], gain = [0.1, 0.3], dur = 0.022, lp = 2400, ease = 1 } = {}) => {
    for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 1; grain(K, dest, t0 + Math.max(0, t1 - t0) * Math.pow(u, ease), name, { rate: rate[0] + (rate[1] - rate[0]) * u, gain: gain[0] + (gain[1] - gain[0]) * u, dur, lp, pan: side() }); }
  };
  // A crushed bus with no echo, for what has to stop dead.
  const dead = (K, o) => K.crush(K.f('lowpass', 2600, 0.7, o.dry), 10, 2.8, 0.5);
  // Static held from t0 to t1 and cut: its band moving f0 → f1.
  const held = (K, dest, t0, t1, { type = 'bandpass', f0 = 800, f1 = 2400, q = 1.5, peak = 0.1, a = 0.02 } = {}) => { const d = Math.max(0.04, t1 - t0); K.hiss(dest, t0, { type, f0, f1, q, glide: d, a: Math.min(a, d / 3), hold: Math.max(0.005, d - Math.min(a, d / 3) - 0.015), d: 0.015, peak, color: 'sah' }); };

  // The scramble strike before it lands: a decoding wave crosses the chip, its glyphs swarm over and settle, churning.
  const swarm = (K, b, T, gone) => {
    const { t, hit } = T, [l0, l1] = T.pre.land;
    K.buzz(b, t, { d: 0.13, peak: 0.24, f0: 700, f1: 3400 });
    for (let i = 0; i < 14; i++) { const u = i / 13; grain(K, b, t + 0.07 + (l1 - t - 0.07) * Math.pow(u, 0.8), 'glitch', { rate: 0.6 + Math.random() * 1.1, gain: 0.08 + 0.12 * u, dur: 0.018, off: Math.random() * 0.5, pan: side() }); }
    K.flight(b, t + 0.06, l0, { f0: 400, f1: 1600, q: 1, peak: 0.07, color: 'sah', pass: gone, tail: 0.25 });
    if (!gone) for (let x = l1 + 0.02; x < hit - 0.01; x += 0.024) grain(K, b, x, 'glitch', { rate: 0.7 + Math.random() * 0.9, gain: 0.14, dur: 0.014, off: Math.random() * 0.5, pan: side() });
  };
  // The band over your bar tears sideways, row against row, and falls apart.
  const torn = (K, b, T) => {
    const [x0, x1] = T.post.tear;
    for (let x = x0, i = 0; x < x1 - 0.01; x += 0.07, i++) grain(K, b, x, 'scratch', { rate: 0.6 - 0.05 * i, gain: 0.3, dur: 0.035, lp: 2200, pan: i % 2 ? 0.7 : -0.7, off: 0.1 });
    K.cascade(K.g(0.4, b), x1, 6, { top: 1100, step: 0.03, peak: 0.06 });
  };
  // The copy strike before it lands: the copier's lamp crosses the chip, and each copy comes over and snaps onto the
  // stack (gone: they go past). The same slice each time, a generation worse.
  const copies = (K, b, fx, T, gone) => {
    const { t } = T, { sweep, snaps } = T.pre;
    K.stat(b, t, { d: 0.02, peak: 0.12 });
    K.hum(fx, t, { f: 100, f1: 150, d: Math.max(0.04, sweep - t), peak: 0.08, bright: 1200, a: 0.02 });
    held(K, b, t, sweep, { f0: 800, f1: 2400, peak: 0.1 });
    snaps.forEach((x, i) => {
      K.flight(K.pan(b, side()), Math.max(t, x - 0.2), x, { f0: 400, f1: 1100, q: 1, peak: 0.05, color: 'sah', pass: gone, tail: 0.15 });
      if (gone) return;
      K.S(b, x, 'relay', { gain: 0.26 + 0.04 * i, rate: 0.9 - 0.06 * i, lp: 3000 - 500 * i });
      K.S(b, x + 0.004, 'glitch', { gain: 0.22 + 0.04 * i, rate: 0.8 * Math.pow(0.9, i), jitter: 0, off: 0.02, dur: 0.05, fade: 0.002, lp: 2600 - 450 * i });
    });
  };

  return {
    // Hex streams: a data burst rattling out as they leave, one a step, in two pitches; a rush of static over, the drop,
    // and the last of them still landing and scattering.
    cipher(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.09, fb: 0.4, wet: 0.4 });
      if (T.flies) {
        K.stat(b, t, { d: 0.03, peak: 0.18 });
        for (let i = 1; i < T.n && t + i * T.step < hit - 0.02; i++) grain(K, b, t + i * T.step, 'glitch', { rate: Math.random() < 0.5 ? 1.5 : 1.1, gain: 0.1 + 0.1 * (i / T.n), dur: 0.014, off: 0.1, pan: side() });
        K.flight(b, t + 0.03, hit, { f0: 500, f1: 2000, q: 1.2, peak: 0.1, color: 'sah', pass: gone, tail: 0.3 });
      }
      if (gone) return aside(K, o, hit);
      const rain = (g) => { for (let x = hit + 2 * T.step, i = 0; x < T.post.rain; x += T.step * (1.4 + Math.random()), i++) grain(K, fx, x, 'glitch', { rate: (Math.random() < 0.5 ? 1.5 : 1.1) * Math.pow(0.96, i), gain: g * (1 - (x - hit) / (T.post.rain - hit + 0.05)), dur: 0.014, off: 0.1, pan: side() }); };
      if (wall) { K.stat(b, hit, { d: 0.05, peak: 0.18 }); glance(K, o, hit); return rain(0.12); }
      rot(K, o, fx, b, hit, k, crit, t);
      rain(0.2);
    },
    // The beacon: a dull ping off its icon, the beam humming on you, brackets whining in and locking, the drop, and the
    // ping coming back lower.
    ring(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.14, fb: 0.5, wet: 0.45 }), lock = T.pre.lock;
      if (T.flies) {
        K.ring(fx, t, { fc: 660, fmod: 87, d: 0.22, peak: 0.08, type: 'triangle' });
        K.stat(b, t, { d: 0.03, peak: 0.16 });
        K.hum(fx, t + 0.02, { f: 82, f1: 110, d: Math.max(0.05, hit - t - 0.04), peak: 0.07, bright: 900, a: 0.05 });
        K.whine(b, lock, gone ? hit + 0.12 : hit - 0.02, { f0: 240, f1: 620, peak: 0.07, type: 'square', lp: 1800 });
        if (!gone) { K.S(K.pan(b, -0.5), hit - 0.034, 'relay', { gain: 0.3, rate: 0.9 }); K.S(K.pan(b, 0.5), hit - 0.02, 'relay', { gain: 0.3, rate: 0.85 }); }
      }
      if (gone) return aside(K, o, hit);
      if (wall) { K.ring(fx, hit, { fc: 660, fmod: 87, d: 0.16, peak: 0.05, type: 'triangle' }); return glance(K, o, hit); }
      rot(K, o, fx, b, hit, k, crit, lock);
      K.ring(o.room, hit + 0.02, { fc: 330, fmod: 87, d: 0.5, peak: 0.08, type: 'triangle' });
    },
    // Frost: ice breaking on its chip, slivers ticking down, thin cold air over, the drop, and your signal frozen: one
    // slice held, the same again and again, then ice settling.
    frost(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.11, fb: 0.45, wet: 0.4 }), big = crit ? 1 : k;
      if (T.flies) {
        K.S(b, t, 'glass-l', { gain: 0.24, rate: 0.7, lp: 3000 });
        K.stat(b, t, { d: 0.04, peak: 0.12, hp: 1500 });
        for (let i = 0; i < 6; i++) grain(K, b, t + 0.04 + 0.05 * i * (0.8 + 0.4 * Math.random()), 'glass-h', { rate: 0.9 + 0.5 * Math.random(), gain: 0.12 * (1 - i / 8), dur: 0.03, lp: 3200, pan: side() });
        K.flight(b, t + 0.08, hit, { f0: 2600, f1: 900, q: 1.4, peak: 0.08, color: 'sah', pass: gone, tail: 0.3 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { grain(K, b, hit, 'glass-h', { rate: 0.8, gain: 0.25, dur: 0.05, lp: 3200 }); return glance(K, o, hit); }
      rot(K, o, fx, b, hit, k, crit, t + 0.08);
      for (let i = 0, n = 5 + Math.round(3 * big); i < n; i++) K.S(b, hit + 0.07 + 0.032 * i, 'glitch', { gain: 0.24, rate: 0.5, jitter: 0, off: 0.3, dur: 0.026, fade: 0.002, lp: 1800 });
      K.crackle(fx, hit + 0.12, hit + 0.55, { f: 3200, q: 1.2, peak: 0.1, rise: false });
    },
    // The wipe: pixels flaking off its chip, more and more; the drop as the edge reaches your bar; then static thinning
    // out as it crosses, and cut to nothing.
    erase(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.1, fb: 0.35, wet: 0.35 }), end = T.post.sweep;
      if (T.flies) {
        K.stat(b, t, { d: 0.03, peak: 0.18 });
        K.crackle(b, t + 0.02, hit, { f: 2600, q: 0.9, peak: 0.24 });
        K.flight(b, t + 0.05, hit, { f0: 900, f1: 1800, q: 0.8, peak: 0.07, color: 'sah', pass: gone, tail: 0.25 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { K.stat(b, hit, { d: 0.08, peak: 0.18 }); return glance(K, o, hit); }
      rot(K, o, fx, b, hit, k * 0.8, crit, t);
      held(K, dead(K, o), hit + 0.02, end, { type: 'lowpass', f0: 3000, f1: 240, q: 0.7, peak: 0.2 });
      K.S(o.dry, end, 'click', { gain: 0.3, rate: 0.6, lp: 2400 });
    },
    // Crumble: cracks racing through its chip, it shatters, the shards fall; the drop as the first lands, the rest
    // breaking up after it, grit, and your bar cracking.
    crumble(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.12, fb: 0.4, wet: 0.4 }), big = crit ? 1 : k, crack = T.pre.crack;
      if (T.flies) {
        K.stat(b, t, { d: 0.02, peak: 0.14 });
        K.crackle(b, t, crack, { f: 1800, q: 0.8, peak: 0.2 });
        K.S(b, crack, 'glass-l', { gain: 0.2, rate: 0.55, lp: 2600 });
        K.S(b, crack, 'mining', { gain: 0.14, rate: 0.8, lp: 2200 });
        K.flight(o.dry, crack + 0.05, hit, { f0: 320, f1: 140, q: 0.7, peak: 0.1, color: 'brown', pass: gone, tail: 0.25 });
      }
      if (gone) return aside(K, o, hit);
      const rest = (n, g) => { for (let i = 0; i < n; i++) grain(K, b, hit + (T.post.land - hit) * ((i + 1) / n) * (0.8 + 0.4 * Math.random()), 'mining', { rate: 0.7 + 0.5 * Math.random(), gain: g * (1 - i / (n + 2)), dur: 0.05, lp: 2000, pan: side() }); };
      if (wall) { glance(K, o, hit); for (let i = 1; i < 4; i++) K.S(K.pan(b, side()), hit + 0.04 * i, 'tin', { gain: 0.16 * (1 - i / 5), rate: 1.1 + 0.1 * i, lp: 3200 }); return; }
      rot(K, o, fx, b, hit, k, crit, crack + 0.1);
      K.S(b, hit, 'mining', { gain: 0.5, rate: 0.6, lp: 1800 });
      rest(3 + Math.round(3 * big), 0.3);
      K.crackle(fx, hit + 0.1, hit + 0.45, { f: 1400, q: 0.7, peak: 0.14, rise: false });
    },
    // A scramble theme's hit (Spread, Contain…): the glyphs swarm over and churn, the drop as the wave decodes them, the
    // band tearing row against row, and falling apart.
    scramble(K, o, T) {
      const { hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.1, fb: 0.4, wet: 0.4 });
      if (T.flies) swarm(K, b, T, gone);
      if (gone) return aside(K, o, hit);
      if (wall) { K.stat(b, hit, { d: 0.08, peak: 0.2 }); return glance(K, o, hit); }
      rot(K, o, fx, b, hit, k, crit, T.flies ? T.pre.land[1] : hit);
      held(K, b, hit, T.post.wave, { f0: 500, f1: 2600, q: 2, peak: 0.14 });
      torn(K, b, T);
    },
    // Thorns: each leaves with a thwip, the first drives in with the drop, the rest puncture after it one by one, and
    // they stand there quivering.
    thorn(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.07, fb: 0.35, wet: 0.35 }), n = T.n, end = hit + (n - 1) * T.step;
      if (T.flies) {
        for (let i = 0; i < n; i++) K.zap(K.pan(b, side()), t + i * T.step, { f0: 1400, f1: 3600, d: 0.05, peak: 0.16, q: 3 });
        K.flight(b, t + 0.02, hit, { f0: 700, f1: 2600, q: 1.6, peak: 0.1, color: 'sah', pass: gone, tail: 0.25 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { glance(K, o, hit); for (let i = 1; i < n; i++) K.S(K.pan(b, side()), hit + i * T.step, 'tin', { gain: 0.16 * (1 - i / (n + 2)), rate: 1.3 + 0.05 * i, lp: 3500 }); return; }
      rot(K, o, fx, b, hit, k, crit, t);
      for (let i = 1; i < n; i++) {
        const x = hit + i * T.step;
        K.S(K.pan(b, side()), x, 'click', { gain: 0.34, rate: 0.6 - 0.015 * i, lp: 2000 });
        K.tone(b, x, { f0: 130 - 6 * i, f1: 55, glide: 0.03, a: 0.001, d: 0.035, peak: 0.16 });
      }
      K.fm(fx, end + 0.02, { fc: 82, f1: 78, ratio: 3.01, i0: 2.5, i1: 0.2, dur: 0.3, peak: 0.12 });
      K.crackle(fx, hit, end + 0.15, { f: 2800, peak: 0.1, rise: false });
    },
    // The strobe: a flash tube firing left, then right, charging again between, and the big one in the middle with the
    // drop; then your signal cutting in and out, evenly.
    strobe(K, o, T) {
      const { hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.065, fb: 0.3, wet: 0.3 });
      const pop = (x, s, p) => {
        K.buzz(K.pan(b, p), x, { d: 0.03 + 0.02 * s, peak: 0.3 * s, f0: 4200, f1: 600 });
        K.S(K.pan(b, p), x, 'relay', { gain: 0.3 * s, rate: 1.1 });
        K.tone(b, x, { type: 'square', f0: 140, f1: 60, glide: 0.03, a: 0.001, d: 0.04, peak: 0.14 * s });
      };
      if (T.flies) {
        const [p0, p1] = T.pre.pulses;
        pop(p0, 0.8, -0.5); pop(p1, 0.85, 0.5);
        K.whine(fx, p0 + 0.02, p1, { f0: 900, f1: 2200, peak: 0.035, lp: 2600 });
        K.whine(fx, p1 + 0.02, hit, { f0: 900, f1: 2600, peak: 0.045, lp: 2600 });
      }
      if (gone) { pop(hit, 0.6, 0.7); return aside(K, o, hit); }
      if (wall) { pop(hit, 0.7, 0); return glance(K, o, hit); }
      pop(hit, 1.25, 0);
      rot(K, o, fx, b, hit, k, crit, hit);
      const [f0, f1] = T.post.flicker;
      for (let x = f0; x < f1 - 0.01; x += 0.09) { const u = 1 - (x - f0) / (f1 - f0); K.stat(b, x, { d: 0.04, peak: 0.2 * u, hp: 800 }); K.hum(fx, x, { f: 104, d: 0.04, peak: 0.08 * u, bright: 1000, a: 0.002 }); }
    },
    // A copy theme's hit (Splice, Pass…): the lamp sweeps, four copies snap onto the stack, it collapses into your bar
    // with the drop, and a copy of the thump slides off, duller each time.
    copy(K, o, T) {
      const { hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.1, fb: 0.4, wet: 0.4 });
      if (T.flies) copies(K, b, fx, T, gone);
      if (gone) return aside(K, o, hit);
      if (wall) { K.stat(b, hit, { d: 0.05, peak: 0.18 }); return glance(K, o, hit); }
      rot(K, o, fx, b, hit, k, crit, T.flies ? T.pre.snaps.at(-1) : hit);
      for (const i of [1, 2]) K.tone(K.f('lowpass', 900 / i, 0.7, fx), hit + 0.16 * i, { type: 'square', f0: 90, f1: 34, glide: 0.09, a: 0.002, d: 0.1, peak: 0.2 / i });
    },
    // The scan: its emitter clicks on, the laser buzzes along your bar, climbing, data ticking off it; brackets snap on
    // what it found, with the drop.
    scan(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.1, fb: 0.4, wet: 0.4 }), rake = T.pre.rake;
      if (T.flies) {
        K.S(b, t, 'click', { gain: 0.3, rate: 0.8, lp: 2400 });
        K.stat(b, t, { d: 0.02, peak: 0.12 });
        K.whine(b, rake, gone ? hit + 0.15 : hit, { f0: 150, f1: 300, peak: 0.12, lp: 1500 });
        K.flight(b, rake, hit, { f0: 1200, f1: 2600, q: 3, peak: 0.07, color: 'sah', pass: gone, tail: 0.2 });
        if (!gone) chatter(K, fx, rake + 0.06, hit - 0.04, 'tick', { n: 8, rate: [0.9, 1.5], gain: [0.1, 0.2], dur: 0.02, lp: 3000 });
      }
      if (gone) return aside(K, o, hit);
      K.S(K.pan(b, -0.4), hit, 'relay', { gain: 0.36, rate: 0.95 });
      K.S(K.pan(b, 0.4), hit + 0.012, 'relay', { gain: 0.36, rate: 0.9 });
      if (wall) return glance(K, o, hit);
      rot(K, o, fx, b, hit, k, crit, rake);
      K.stat(fx, hit + 0.04, { d: 0.2 + 0.1 * k, peak: 0.08, hp: 1000 });
    },
    // The plate: its halves slide in and clang shut, it lifts over and comes down; the drop under steel, the shield over
    // your bar ringing low, a rumble along it.
    plate(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.13, fb: 0.45, wet: 0.4 }), { shut, lift } = T.pre;
      if (T.flies) {
        K.stat(b, t, { d: 0.02, peak: 0.12 });
        K.flight(b, t, shut, { f0: 300, f1: 900, q: 0.9, peak: 0.1, color: 'sah' });
        K.S(b, shut, 'plate-h', { gain: 0.28, rate: 0.7, lp: 2600 });
        K.S(b, shut, 'relay', { gain: 0.2, rate: 0.6 });
        K.flight(o.dry, lift[0], lift[1], { f0: 120, f1: 320, q: 0.7, peak: 0.1, color: 'brown' });
        K.flight(o.dry, lift[1], hit, { f0: 500, f1: 180, q: 0.8, peak: 0.16, color: 'brown', pass: gone, tail: 0.25 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { K.S(b, hit, 'metal-l', { gain: 0.3, rate: 0.7, lp: 2400 }); return glance(K, o, hit); }
      rot(K, o, fx, b, hit, Math.min(1, k + 0.1), crit, T.flies ? lift[1] : hit);
      K.S(b, hit, 'metal-l', { gain: 0.5, rate: 0.5, lp: 2200 });
      K.S(o.dry, hit, 'plate-l', { gain: 0.4, rate: 0.45, lp: 1400 });
      K.modes(o.room, hit, [[147, 1, 0.5], [349, 0.5, 0.3], [588, 0.25, 0.2]], { peak: 0.08 });
      K.rumble(o.dry, hit + 0.02, { f: 100, d: 0.3, peak: 0.12 });
    },
    // The ledger: reels ticking round and clunking into place one by one, the number flying over, the drop; then it
    // counts you down, tick by tick and lower, and a line is struck through.
    ledger(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.1, fb: 0.4, wet: 0.35 }), { locks, fly } = T.pre;
      if (T.flies) {
        K.stat(b, t, { d: 0.02, peak: 0.12 });
        for (let x = t + 0.012; x < locks.at(-1); x += 0.035) K.S(b, x, 'tick', { gain: 0.12, rate: 1.3, lp: 3000 });
        locks.forEach((x, i) => { K.S(b, x, 'relay', { gain: 0.3, rate: 0.8 - 0.05 * i }); K.tone(b, x, { f0: 120 - 8 * i, f1: 60, glide: 0.03, a: 0.001, d: 0.03, peak: 0.1 }); });
        K.flight(b, fly, hit, { f0: 400, f1: 1500, q: 1, peak: 0.09, color: 'sah', pass: gone, tail: 0.25 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { K.S(b, hit, 'tick', { gain: 0.2, rate: 0.8, lp: 2600 }); return glance(K, o, hit); }
      rot(K, o, fx, b, hit, k, crit, T.flies ? fly : hit);
      const [r0, r1] = T.post.roll, [n0, n1] = T.post.line;
      for (let i = 0; i < 10; i++) K.S(b, r0 + (r1 - r0) * (i / 10), 'tick', { gain: 0.24 * (1 - i / 16), rate: 1.2 - 0.06 * i, lp: 2600 });
      K.S(b, n0, 'scratch', { gain: 0.3, rate: 0.7, dur: n1 - n0, lp: 2400 });
      K.S(b, n1, 'click', { gain: 0.3, rate: 0.55, lp: 2000 });
      K.tone(b, n1, { type: 'square', f0: 80, f1: 44, glide: 0.04, a: 0.001, d: 0.06, peak: 0.16 });
    },
    // The mask: a hum as it lifts out, two voices in turn as it turns over; it lands hollow with the drop, its eyes spit
    // left and right, and it tears in two, the halves sliding apart out of tune.
    mask(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.12, fb: 0.45, wet: 0.45 }), lift = T.pre.lift;
      if (T.flies) {
        K.stat(b, t, { d: 0.02, peak: 0.12 });
        K.hum(fx, t, { f: 73, f1: 98, d: Math.max(0.05, lift - t + 0.1), peak: 0.09, bright: 800, a: 0.04 });
        for (let i = 0; i < 5; i++) { const x = lift + (hit - lift) * (0.08 + 0.19 * i); K.hiss(K.pan(b, i % 2 ? 0.4 : -0.4), x, { type: 'bandpass', f0: i % 2 ? 520 : 840, f1: i % 2 ? 420 : 700, q: 2.2, glide: 0.07, a: 0.02, d: 0.06, peak: 0.1 + 0.02 * i, color: 'pink' }); }
        if (gone) K.flight(b, lift, hit, { f0: 400, f1: 900, q: 1, peak: 0.06, color: 'sah', pass: true, tail: 0.25 });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { K.S(b, hit, 'bong', { gain: 0.16, rate: 0.7, lp: 1800 }); return glance(K, o, hit); }
      rot(K, o, fx, b, hit, k, crit, T.flies ? lift : hit);
      K.S(b, hit, 'bong', { gain: 0.3, rate: 0.5, lp: 1500 });
      K.buzz(K.pan(b, -0.6), hit + 0.02, { d: 0.1, peak: 0.18, f0: 2400, f1: 500 });
      K.buzz(K.pan(b, 0.6), hit + 0.035, { d: 0.1, peak: 0.18, f0: 2400, f1: 500 });
      const [s0, s1] = T.post.split;
      K.S(b, s0, 'scratch', { gain: 0.28, rate: 0.5, dur: Math.min(0.22, s1 - s0), lp: 2200 });
      K.tone(K.pan(fx, -0.6), s0, { type: 'triangle', f0: 147, f1: 137, glide: s1 - s0, a: 0.02, d: s1 - s0, peak: 0.06 });
      K.tone(K.pan(fx, 0.6), s0, { type: 'triangle', f0: 147, f1: 158, glide: s1 - s0, a: 0.02, d: s1 - s0, peak: 0.06 });
    },
    // The byte (a Gnaw, every cycle: the shortest and driest): it flits over, brackets clamp on, and a chunk tears out:
    // a small thump, a tear, the buffer sticking once, a few blips falling.
    byte(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.06, fb: 0.25, wet: 0.25 }), big = crit ? 1 : k, clamp = T.pre.clamp;
      if (T.flies) {
        K.stat(b, t, { d: 0.02, peak: 0.12 });
        K.flight(b, t + 0.02, clamp, { f0: 600, f1: 1800, q: 1.5, peak: 0.06, color: 'sah', pass: gone, tail: 0.2 });
        if (!gone) { K.S(b, clamp, 'relay', { gain: 0.3, rate: 1.1 }); K.S(b, clamp + 0.014, 'click', { gain: 0.2, rate: 0.9, lp: 2600 }); }
      }
      if (gone) return aside(K, o, hit);
      if (wall) return glance(K, o, hit);
      K.hiss(b, hit, { type: 'lowpass', f0: 1800, a: 0.0005, d: 0.02, peak: 0.4 });
      K.tone(b, hit, { type: 'square', f0: 110, f1: 40, glide: 0.06, a: 0.001, d: 0.08 + 0.04 * big, peak: 0.3 + 0.1 * big });
      K.S(b, hit + 0.006, 'scratch', { gain: 0.3, rate: 0.9, dur: 0.07, lp: 2400 });
      stuck(K, b, hit + 0.03, 1 + Math.round(big) + (crit ? 2 : 0), 0.036, 'glitch', { gain: 0.35 });
      K.cascade(K.g(0.35, b), hit + 0.07, 4 + Math.round(3 * big), { top: 1400, step: 0.02, peak: 0.07 });
      weight(K, o, hit, big * 0.5, crit);
    },
    // The lash (a part with no theme): static tearing across as the whip comes, a second strand on a crit; the drop, and
    // 1s and 0s ticking away off your bar.
    lash(K, o, T) {
      const { t, hit, k, crit, gone, wall } = read(T), { fx, b } = crushed(K, o, { time: 0.085, fb: 0.4, wet: 0.4 }), big = crit ? 1 : k;
      if (T.flies) {
        K.buzz(b, t, { d: Math.max(0.04, hit - t), peak: 0.22, f0: 700, f1: 3800 });
        K.flight(b, t, hit, { f0: 500, f1: 3000, q: 1.2, peak: 0.16, color: 'sah', pass: gone, tail: 0.22 });
        if (crit) K.flight(K.pan(b, 0.4), t + 0.025, hit + 0.02, { f0: 400, f1: 2400, q: 1.2, peak: 0.12, color: 'sah' });
      }
      if (gone) return aside(K, o, hit);
      if (wall) { K.stat(b, hit, { d: 0.05, peak: 0.2 }); return glance(K, o, hit); }
      rot(K, o, fx, b, hit, k, crit, t);
      for (let i = 0, n = 4 + Math.round(5 * big); i < n; i++) grain(K, fx, hit + 0.08 + (T.post.fall - hit - 0.08) * Math.pow(i / n, 1.3), 'tick', { rate: 1.2 * Math.pow(0.9, i), gain: 0.16 * (1 - i / (n + 2)), dur: 0.02, lp: 2600, pan: side() });
    },
    // Scramble: the Scrambler's strike, and no weight: a tear, your carrier chopped up for a long moment, slices of it
    // out of order, the band tearing and falling apart.
    blind(K, o, T) {
      const { hit } = T, { fx, b } = crushed(K, o, { time: 0.1, fb: 0.45, wet: 0.45 });
      if (T.flies) { swarm(K, b, T, false); K.S(fx, 0, 'scratch', { reverse: true, end: hit, dur: 0.14, gain: 0.3, rate: 0.55 }); }
      K.S(b, hit, 'scratch', { gain: 0.6, rate: 0.7, lp: 2600 });
      K.hiss(b, hit, { type: 'lowpass', f0: 1800, a: 0.0005, d: 0.02, peak: 0.4 });
      K.tone(b, hit, { type: 'square', f0: 96, f1: 40, glide: 0.08, a: 0.001, d: 0.1, peak: 0.34 });
      dropout(K, fx, hit + 0.03, 0.55, { f: 110, peak: 0.22 });
      for (let i = 0; i < 9; i++) grain(K, b, hit + 0.04 + 0.05 * i * (0.7 + 0.6 * Math.random()), 'glitch', { rate: [0.5, 1.5, 0.75, 1.2, 0.62, 1.7, 0.9, 0.55, 1.3][i], gain: 0.32 * (1 - i / 12), dur: 0.03, off: Math.random() * 0.6, pan: side() });
      torn(K, b, T);
    },
    // Replicate: the copies stack on a fragment that wasn't there, and it boots: a latch, the growl rising where a hit's
    // falls, and a slice chattering faster as it starts to gnaw.
    replicate(K, o, T) {
      const { hit } = T, { fx, b } = crushed(K, o, { time: 0.1, fb: 0.4, wet: 0.4 });
      if (T.flies) { copies(K, b, fx, T, false); K.S(fx, 0, 'scratch', { reverse: true, end: hit, dur: 0.12, gain: 0.22, rate: 0.6 }); }
      K.S(b, hit, 'relay', { gain: 0.55, rate: 0.7 });
      K.hiss(b, hit, { type: 'lowpass', f0: 1600, a: 0.0005, d: 0.02, peak: 0.4 });
      K.fm(b, hit, { fc: 46, f1: 120, ratio: 1.41, i0: 1, i1: 7, dur: 0.24, peak: 0.6 });
      K.tone(b, hit, { type: 'square', f0: 60, f1: 110, glide: 0.08, a: 0.001, d: 0.12, peak: 0.34 });
      K.kick(o.dry, hit, { f0: 90, f1: 50, d: 0.12, peak: 0.6, click: 0 });
      for (let i = 0; i < 6; i++) grain(K, b, hit + 0.12 + 0.3 * (1 - Math.pow(1 - i / 5, 1.6)), 'glitch', { rate: 0.7 * Math.pow(1.1, i), gain: 0.14 + 0.02 * i, dur: 0.02, pan: side() });
    },
    // Patch: static draws in to the part, a latch is thrown, steel closes over it, and its hum comes back a notch up.
    patch(K, o, T) {
      const { t, hit } = T, { fx, b } = crushed(K, o, { time: 0.09, fb: 0.35, wet: 0.35 });
      if (T.flies) {
        K.stat(b, t, { d: 0.02, peak: 0.1 });
        K.S(fx, 0, 'scratch', { reverse: true, end: hit, dur: Math.min(0.14, hit - t), gain: 0.28, rate: 0.6 });
        K.flight(b, t, hit, { f0: 300, f1: 1400, q: 1, peak: 0.1, color: 'sah' });
      }
      K.S(b, hit, 'relay', { gain: 0.4, rate: 0.7 });
      K.S(b, hit + 0.004, 'plate-h', { gain: 0.4, rate: 0.65, lp: 2400 });
      K.tone(b, hit, { type: 'square', f0: 70, f1: 110, glide: 0.06, a: 0.001, d: 0.09, peak: 0.2 });
      K.fm(b, hit + 0.01, { fc: 62, f1: 92, ratio: 2, i0: 1.5, i1: 5, dur: 0.22, peak: 0.2 });
      K.modes(o.room, hit, [[196, 1, 0.3], [466, 0.4, 0.2]], { peak: 0.05 });
      K.hum(fx, hit + 0.05, { f: 92, f1: 98, d: 0.25, peak: 0.06, bright: 900, a: 0.02 });
    },
  };
}

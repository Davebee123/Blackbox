// The soundtrack: music under the game and radio chatter drifting past, both behind Sound.
//
// MUSIC plays files from dist/music/ (CC0 tracks, see music/CREDITS.md). Each mood has a track:
// home (your server), run (tapped into someone else's), fight. A mood with no file of its own
// plays the home track, so one file covers the whole game; with none the game is just quiet.
// When two moods land on the same file it keeps playing through and only the level changes.
//
// RADIO is synthesized, so it needs no files and no licence: now and then a transmission breaks
// through the static on one side of the room. A squelch, a voice you can't quite make out (a
// buzzing vocal cord through shifting vowel formants, crushed into a 3 kHz radio band), a roger
// beep, a reply. Sometimes a numbers station, sometimes a modem burst. It never says anything,
// on purpose: it's texture, not information.
const HOME = ['music/home.ogg', 'music/home.mp3'];
export const MUSIC = {
  home: HOME,
  run: ['music/run.ogg', 'music/run.mp3', ...HOME],
  fight: ['music/fight.ogg', 'music/fight.mp3', ...HOME],
};
export const MUSIC_VOLUME = { home: 0.32, run: 0.28, fight: 0.3 };
export const RADIO_EVERY = { home: [22, 55], run: [14, 38], fight: [40, 90] }; // seconds between transmissions
const FADE = 2.2;

// ---------- radio ----------
const VOWELS = [[730, 1090, 2440], [270, 2290, 3010], [530, 1840, 2480], [570, 840, 2410], [300, 870, 2240], [640, 1190, 2390], [490, 1350, 1690]];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const between = (lo, hi) => lo + Math.random() * (hi - lo);

function noiseBuffer(ctx, secs = 2) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * secs), ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function crushCurve(k = 6) {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
  return c;
}

// The radio's own chain: a narrow band, some crunch, panned to one side.
function band(ctx, dest, pan) {
  const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), sh = ctx.createWaveShaper(), g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  hp.type = 'highpass'; hp.frequency.value = 420; lp.type = 'lowpass'; lp.frequency.value = 2900; lp.Q.value = 2;
  sh.curve = crushCurve(4); g.gain.value = 1;
  hp.connect(lp).connect(sh).connect(g);
  if (p) { p.pan.value = pan; g.connect(p).connect(dest); } else g.connect(dest);
  return { input: hp, nodes: [hp, lp, sh, g, p].filter(Boolean) };
}

function hiss(ctx, out, buf, t, dur, peak, f = 2600) {
  const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf; s.loop = true; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 0.6;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
  g.gain.setValueAtTime(peak, t + Math.max(0.02, dur - 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bp).connect(g).connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
function beep(ctx, out, t, f, dur, peak = 0.08, type = 'sine') {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
  g.gain.setValueAtTime(peak, t + dur - 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
}

// A voice: a buzz at speaking pitch, through three formant filters that jump vowel to vowel,
// gated into syllables and words. Returns when it ends.
function voice(ctx, out, t, { pitch = 120, secs = 2.4, peak = 0.5 } = {}) {
  const src = ctx.createOscillator(), vib = ctx.createOscillator(), vibg = ctx.createGain(), gate = ctx.createGain(), sum = ctx.createGain();
  src.type = 'sawtooth'; src.frequency.setValueAtTime(pitch, t);
  vib.frequency.value = between(4.5, 6.5); vibg.gain.value = pitch * 0.025;
  vib.connect(vibg).connect(src.frequency);
  const fs = [0, 1, 2].map((i) => { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = [9, 12, 14][i]; const g = ctx.createGain(); g.gain.value = [1, 0.6, 0.35][i]; src.connect(f).connect(g).connect(sum); return f; });
  sum.connect(gate).connect(out);
  gate.gain.setValueAtTime(0.0001, t);
  let at = t;
  const end = t + secs;
  while (at < end - 0.1) {
    const syllables = 1 + Math.floor(Math.random() * 4);
    for (let i = 0; i < syllables && at < end - 0.1; i++) {
      const len = between(0.08, 0.2), v = pick(VOWELS);
      fs.forEach((f, k) => f.frequency.setTargetAtTime(v[k] * between(0.92, 1.08), at, 0.015));
      src.frequency.setTargetAtTime(pitch * between(0.85, 1.25), at, 0.04); // intonation
      gate.gain.setTargetAtTime(peak * between(0.6, 1), at, 0.012);
      gate.gain.setTargetAtTime(peak * 0.08, at + len * 0.8, 0.02); // consonant dip
      at += len;
    }
    gate.gain.setTargetAtTime(0.0001, at, 0.02);
    at += between(0.06, 0.28); // between words
  }
  gate.gain.setTargetAtTime(0.0001, end, 0.03);
  src.start(t); vib.start(t); src.stop(end + 0.3); vib.stop(end + 0.3);
  return end;
}

const KINDS = ['exchange', 'exchange', 'exchange', 'call', 'numbers', 'modem'];
// One transmission, start to finish. `level` is the overall loudness.
export function transmission(ctx, dest, { level = 0.05, kind = pick(KINDS) } = {}) {
  const bus = ctx.createGain(); bus.gain.value = level; bus.connect(dest);
  const { input, nodes } = band(ctx, bus, (Math.random() < 0.5 ? -1 : 1) * between(0.35, 0.85));
  const buf = noiseBuffer(ctx);
  let t = ctx.currentTime + 0.05;
  const squelch = (d = between(0.08, 0.16)) => { hiss(ctx, input, buf, t, d, 0.5); t += d; };
  const bed = (d) => hiss(ctx, input, buf, t, d, 0.07, 1800);
  const roger = () => { beep(ctx, input, t, pick([1000, 1200, 1500]), 0.09, 0.25); t += 0.1; };
  const speak = (pitch) => { const secs = between(1.2, 3.2); bed(secs + 0.1); t = voice(ctx, input, t, { pitch, secs }) + 0.05; };
  if (kind === 'numbers') {
    squelch(0.12);
    const tone = pick([660, 880, 740]);
    const n = 4 + Math.floor(Math.random() * 5);
    bed(n * 0.55 + 0.4);
    for (let i = 0; i < n; i++) { beep(ctx, input, t, tone, 0.18, 0.2); if (Math.random() < 0.35) beep(ctx, input, t + 0.22, tone * 1.5, 0.12, 0.14); t += 0.55; }
    squelch(0.2);
  } else if (kind === 'modem') {
    squelch(0.08);
    const n = 10 + Math.floor(Math.random() * 14);
    for (let i = 0; i < n; i++) { beep(ctx, input, t, pick([1070, 1270, 2025, 2225]), 0.035, 0.16, 'square'); t += 0.036; }
    hiss(ctx, input, buf, t, 0.35, 0.3, 2200); t += 0.35;
  } else {
    const a = between(95, 150), b = Math.random() < 0.4 ? between(170, 230) : between(90, 140);
    squelch(); speak(a); if (Math.random() < 0.6) roger(); squelch(between(0.1, 0.22));
    if (kind === 'exchange') { t += between(0.6, 1.6); squelch(); speak(b); if (Math.random() < 0.5) roger(); squelch(between(0.1, 0.2)); }
  }
  const ms = (t - ctx.currentTime + 0.6) * 1000;
  setTimeout(() => { for (const n of nodes) n.disconnect(); bus.disconnect(); }, ms);
  return ms;
}

// ---------- the player ----------
export function createSoundtrack(getCtx) {
  let want = { on: false, music: true, radio: true, mood: 'home' };
  let ctx = null, out = null, mus = null, playing = null, radioTimer = null;
  const vol = { music: 0.8, ambience: 0.8 }; // sliders; 0.8 is the level it was mixed at
  const applyVol = () => { if (out) out.gain.value = vol.ambience / 0.8; if (mus) mus.gain.value = vol.music / 0.8; };
  const missing = new Set();

  // Which files exist, checked once up front so a mood can fall back without a false start.
  let probed = null, known = false;
  const probe = () => (probed ||= Promise.all([...new Set(Object.values(MUSIC).flat())].map((f) =>
    fetch(f, { method: 'HEAD' }).then((r) => { if (!r.ok) missing.add(f); }).catch(() => missing.add(f)))).then(() => { known = true; }));
  const fileFor = (mood) => (MUSIC[mood] || []).find((f) => !missing.has(f)) || null;
  function setup() {
    ctx = getCtx();
    if (!ctx) return false;
    // Two buses: music, and everything else here (radio, rain, thunder, the street).
    if (!out) { out = ctx.createGain(); out.connect(ctx.destination); mus = ctx.createGain(); mus.connect(ctx.destination); applyVol(); }
    return true;
  }
  function fadeOut(p) {
    if (!p) return;
    const t = ctx.currentTime;
    p.gain.gain.cancelScheduledValues(t); p.gain.gain.setValueAtTime(p.gain.gain.value, t); p.gain.gain.linearRampToValueAtTime(0, t + FADE);
    setTimeout(() => { p.el.pause(); p.el.removeAttribute('src'); p.el.load(); p.gain.disconnect(); }, FADE * 1000 + 100);
  }
  function start(mood) {
    const files = (MUSIC[mood] || []).filter((f) => !missing.has(f));
    if (!files.length) return null;
    const el = new Audio(), gain = ctx.createGain();
    el.loop = true; el.preload = 'auto'; el.crossOrigin = 'anonymous';
    const p = { mood, el, gain, files, i: 0 };
    const tryNext = () => {
      if (p.i >= p.files.length) { if (playing === p) playing = null; return; }
      el.src = p.files[p.i];
      el.play().catch(() => {});
    };
    el.addEventListener('error', () => { missing.add(p.files[p.i]); p.i++; tryNext(); });
    try { ctx.createMediaElementSource(el).connect(gain); } catch { return null; }
    gain.gain.value = 0; gain.connect(mus);
    gain.gain.linearRampToValueAtTime(MUSIC_VOLUME[mood] ?? 0.3, ctx.currentTime + FADE);
    tryNext();
    return p;
  }
  function music() {
    const should = want.on && want.music;
    if (!should) { fadeOut(playing); playing = null; return; }
    if (!known) { probe().then(() => music()); return; }
    const mood = want.mood;
    if (playing && (playing.mood === mood || playing.files[playing.i] === fileFor(mood))) {
      if (playing.mood !== mood) { // same file, new mood: keep playing, just move the level
        playing.mood = mood;
        const t = ctx.currentTime, g = playing.gain.gain;
        g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(MUSIC_VOLUME[mood] ?? 0.3, t + FADE);
      }
      if (playing.el.paused && playing.el.src) playing.el.play().catch(() => {});
      return;
    }
    fadeOut(playing);
    playing = start(mood);
  }
  function radio() {
    const should = want.on && want.radio;
    if (!should) { clearTimeout(radioTimer); radioTimer = null; return; }
    if (radioTimer) return;
    const next = () => {
      const [lo, hi] = RADIO_EVERY[want.mood] || RADIO_EVERY.home;
      radioTimer = setTimeout(() => {
        radioTimer = null;
        if (!want.on || !want.radio) return;
        if (ctx?.state === 'running' && !(typeof document !== 'undefined' && document.hidden)) transmission(ctx, out, { level: want.mood === 'fight' ? 0.035 : 0.05 });
        next();
      }, between(lo, hi) * 1000);
    };
    next();
  }
  // Weather through the glass: rain as a muffled hiss, thunder a while after the flash.
  let rainBus = null, rainLevel = 0;
  function rainBed() {
    if (rainBus || !ctx) return;
    const len = ctx.sampleRate * 3, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let p = 0; for (let i = 0; i < len; i++) { p = p * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = p + (Math.random() < 0.0008 ? (Math.random() - 0.5) * 3 : 0); } } // hiss plus the odd fat drop
    const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = b; src.loop = true; lp.type = 'lowpass'; lp.frequency.value = 1400; hp.type = 'highpass'; hp.frequency.value = 180;
    gain.gain.value = 0; src.connect(hp).connect(lp).connect(gain).connect(out); src.start();
    rainBus = gain;
  }
  function weatherLevel() {
    if (!ctx || !out) return;
    const level = want.on ? rainLevel : 0;
    if (level > 0) rainBed();
    if (rainBus) { const t = ctx.currentTime; rainBus.gain.cancelScheduledValues(t); rainBus.gain.setValueAtTime(rainBus.gain.value, t); rainBus.gain.linearRampToValueAtTime(level * 0.05, t + 8); }
  }
  // The street below the window, ten floors down: a muffled city bed, a horn now and then, and
  // once in a while a siren going past. Everything from the street goes through the same muffle:
  // highs gone (distance and the glass), a little low end trimmed, and slaps off the buildings.
  const STREET = { bed: 'sfx/city/city-ambience.mp3', horns: ['sfx/city/horn-double.mp3'], level: 0.2, every: [25, 70], sirenEvery: [100, 260] };
  let streetOn = false, street = null, hornBufs = null, hornTimer = null, sirenTimer = null;
  function streetLevel() {
    if (!street) return;
    const t = ctx.currentTime, on = want.on && streetOn, rain = rainLevel;
    const g = street.gain.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(on ? STREET.level * (1 - 0.45 * rain) : 0, t + 3);
    street.lp.frequency.setTargetAtTime(700 - 300 * rain, t, 2); // rain on the glass muffles it more
    if (on && street.el.paused) street.el.play().catch(() => {});
    if (!on) setTimeout(() => { if (!(want.on && streetOn)) street.el.pause(); }, 3200);
  }
  function startStreet() {
    if (street || !setup()) return;
    const el = new Audio(STREET.bed); el.loop = true; el.crossOrigin = 'anonymous';
    const lp = ctx.createBiquadFilter(), gain = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.5; gain.gain.value = 0;
    try { ctx.createMediaElementSource(el).connect(lp).connect(gain).connect(out); } catch { return; }
    street = { el, lp, gain };
    hornBufs = Promise.all(STREET.horns.map((f) => fetch(f).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).catch(() => null)));
  }
  // The far-away chain: returns the input node, and a cleanup for when the sound is done.
  function faraway({ cut = 520, gain = 0.06, pan = 0 } = {}) {
    const nodes = [];
    const mk = (n) => (nodes.push(n), n);
    const hp = mk(ctx.createBiquadFilter()), lp1 = mk(ctx.createBiquadFilter()), lp2 = mk(ctx.createBiquadFilter()), g = mk(ctx.createGain());
    hp.type = 'highpass'; hp.frequency.value = 140;
    lp1.type = lp2.type = 'lowpass'; lp1.frequency.value = lp2.frequency.value = cut - rainLevel * 150; lp1.Q.value = lp2.Q.value = 0.4; // two in a row: steep, like through a wall
    g.gain.value = gain * (1 - 0.4 * rainLevel);
    const p = ctx.createStereoPanner ? mk(ctx.createStereoPanner()) : null;
    if (p) p.pan.value = pan;
    const tail = p || out;
    hp.connect(lp1).connect(lp2).connect(g);
    g.connect(tail);
    // the street canyon: a few late, soft reflections, so it sounds far off rather than just quiet
    for (const [dt, lvl] of [[0.11, 0.5], [0.23, 0.38], [0.41, 0.26], [0.67, 0.16]]) {
      const d = mk(ctx.createDelay(1)), dg = mk(ctx.createGain());
      d.delayTime.value = dt * (0.85 + Math.random() * 0.3); dg.gain.value = lvl;
      g.connect(d).connect(dg).connect(tail);
    }
    if (p) p.connect(out);
    return { input: hp, done: (sec) => setTimeout(() => { for (const n of nodes) n.disconnect(); }, (sec + 1.5) * 1000) };
  }
  async function horn() {
    const bufs = (await hornBufs)?.filter(Boolean);
    if (!bufs?.length || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.05, src = ctx.createBufferSource();
    src.buffer = bufs[Math.floor(Math.random() * bufs.length)];
    src.playbackRate.value = 0.85 + Math.random() * 0.25; // a different car each time
    const far = Math.random(); // how far down the street
    const chain = faraway({ cut: 650 - 250 * far, gain: 0.07 - 0.04 * far, pan: (Math.random() - 0.5) * 0.7 });
    src.connect(chain.input);
    src.start(t);
    chain.done(src.buffer.duration / src.playbackRate.value);
  }
  // A siren going past down on the street: wail, yelp or hi-lo, coming closer and fading away,
  // the pitch sagging a little as it goes by.
  function siren() {
    if (!want.on || !setup() || ctx.state !== 'running') return;
    const kind = ['wail', 'wail', 'yelp', 'hilo'][Math.floor(Math.random() * 4)];
    const t0 = ctx.currentTime + 0.05, dur = 14 + Math.random() * 10, pass = 0.35 + Math.random() * 0.25; // when it's closest
    const base = 0.92 + Math.random() * 0.16;
    const pts = [];
    const doppler = (u) => 1 + 0.035 * Math.tanh((pass - u) * 6); // a touch higher coming, lower going
    if (kind === 'wail') {
      for (let x = 0; x < dur;) { const up = 1.4 + Math.random() * 0.4, down = 1.8 + Math.random() * 0.6; pts.push([x, 620]); pts.push([x + up, 1350]); x += up + down; }
    } else if (kind === 'yelp') {
      for (let x = 0; x < dur; x += 0.32) { pts.push([x, 650]); pts.push([x + 0.3, 1400]); }
    } else {
      for (let x = 0, hi = true; x < dur; x += 0.62, hi = !hi) { pts.push([x, hi ? 960 : 720]); pts.push([x + 0.6, hi ? 960 : 720]); }
    }
    const chain = faraway({ cut: 900, gain: 0.05, pan: (Math.random() < 0.5 ? -1 : 1) * 0.25 });
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(1, t0 + dur * pass);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    env.connect(chain.input);
    const oscs = [['square', 1, 0.5], ['sawtooth', 1.004, 0.35]].map(([type, det, lvl]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; g.gain.value = lvl;
      o.frequency.setValueAtTime(pts[0][1] * base * det, t0);
      for (const [x, f] of pts) if (x <= dur) o.frequency.linearRampToValueAtTime(f * base * det * doppler(x / dur), t0 + x);
      o.connect(g).connect(env); o.start(t0); o.stop(t0 + dur + 0.1);
      return [o, g];
    });
    setTimeout(() => { for (const [o, g] of oscs) { o.disconnect(); g.disconnect(); } env.disconnect(); }, (dur + 2) * 1000);
    chain.done(dur);
  }
  function horns() {
    clearTimeout(hornTimer); hornTimer = null;
    clearTimeout(sirenTimer); sirenTimer = null;
    if (!(want.on && streetOn)) return;
    const wait = ([lo, hi]) => (lo + Math.random() * (hi - lo)) * 1000;
    const nextHorn = () => { hornTimer = setTimeout(() => { if (!document.hidden) horn(); nextHorn(); }, wait(STREET.every)); };
    const nextSiren = () => { sirenTimer = setTimeout(() => { if (!document.hidden) siren(); nextSiren(); }, wait(STREET.sirenEvery)); };
    nextHorn(); nextSiren();
  }
  function applyStreet() {
    if (want.on && streetOn) startStreet();
    streetLevel();
    if (!hornTimer || !(want.on && streetOn)) horns();
  }

  function thunder(delay) {
    if (!want.on || !setup() || ctx.state !== 'running') return;
    const t = ctx.currentTime + delay, dur = 3 + Math.random() * 3, far = Math.min(1, delay / 3.4);
    const len = Math.ceil(ctx.sampleRate * dur), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let br = 0;
    for (let i = 0; i < len; i++) { br = (br + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = br * 3.5 * (1 + 0.6 * Math.sin(i / ctx.sampleRate * (2 + Math.random()) * 6.28)); }
    const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = b; lp.type = 'lowpass'; lp.frequency.value = 320 - far * 180;
    const peak = 0.22 * (1 - far * 0.6);
    gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(peak, t + 0.08 + far * 0.5);
    gain.gain.setTargetAtTime(peak * 0.5, t + 0.6, 0.4); gain.gain.setTargetAtTime(0.0001, t + dur * 0.5, dur * 0.2);
    src.connect(lp).connect(gain).connect(out); src.start(t); src.stop(t + dur + 0.1);
  }

  if (typeof document !== 'undefined') {
    // Browsers hold play() until a click or key, so the first one after that starts the music.
    const wake = () => { if (want.on && setup()) { music(); radio(); weatherLevel(); applyStreet(); } };
    document.addEventListener('pointerdown', wake, true);
    document.addEventListener('keydown', wake, true);
    document.addEventListener('visibilitychange', () => { if (!playing) return; if (document.hidden) playing.el.pause(); else if (want.on && want.music) playing.el.play().catch(() => {}); });
  }
  return {
    // { on, music, radio, mood }: call whenever any of them might have changed; it's cheap.
    set(next) {
      const changed = Object.keys(next).some((k) => next[k] !== want[k]);
      want = { ...want, ...next };
      if (!want.on && !playing && !radioTimer) { if (rainBus) weatherLevel(); if (street) applyStreet(); return; }
      if (!changed && (playing || !want.music) && (radioTimer || !want.radio)) return;
      if (!setup()) return;
      music(); radio(); weatherLevel(); applyStreet();
    },
    // The window's weather: how hard it's raining (0–1), and a lightning strike `delay` seconds away.
    rain(level) { rainLevel = level; if (setup()) { weatherLevel(); streetLevel(); } },
    // The city outside the window (on while the window shows).
    street(on) { if (!!on === streetOn && (street || !on)) return; streetOn = !!on; if (setup()) applyStreet(); },
    thunder,
    volumes(v = {}) { if (v.music != null) vol.music = v.music; if (v.ambience != null) vol.ambience = v.ambience; applyVol(); },
    test() { if (setup()) transmission(ctx, out, { level: 0.08 }); },
    // LANTERN's courier broadcast (events.mjs): a numbers transmission, a little louder.
    numbers() { if (want.on && setup()) transmission(ctx, out, { level: 0.09, kind: 'numbers' }); },
  };
}

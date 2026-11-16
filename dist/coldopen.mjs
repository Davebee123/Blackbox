// The cold open: a new game only, between the start screen and the login (app.js). KESSLER's settlement clearing house
// over fifty years: its process table fills until the frame sticks and the network goes down; years later a colder
// machine recovers. Any key or tap skips it. With motion off it doesn't play.
//
// coldOpen({ audio, reducedMotion }) → Promise that resolves when it ends or is skipped.
//   audio() → { ctx, out } or null: feel.scene(), an output at the effects volume (null with Sound off).
// SCRIPT: the steps with when each starts (ms), TOTAL and the sound cues (for tests).

// ---------- the skyline: three banks at street level; later the city grows up behind and on top of them ----------
const BANK = [
  '      ___      ',
  '   __/ $ \\__   ',
  ' _/_________\\_ ',
  '/_____________\\',
  ' |  |  |  |  | ',
  ' |  |  |  |  | ',
  ' |  |  |  |  | ',
  ' |  |  |  |  | ',
  '_|__|__|__|__|_',
];
function tower(w, h, top = 'flat') {
  const win = (i) => '|' + Array.from({ length: w - 2 }, (_, j) => (i % 2 === 0 && j % 2 === 1 ? '.' : ' ')).join('') + '|';
  const roof = top === 'mast' ? [' '.repeat(w >> 1) + '|', ' '.repeat(w >> 1) + '|', ' '.repeat((w >> 1) - 1) + '_|_']
    : top === 'step' ? [' '.repeat(2) + '_'.repeat(w - 4), ' |' + ' '.repeat(w - 4) + '|'] : [];
  return [...roof, ' ' + '_'.repeat(w - 2) + ' ', ...Array.from({ length: h }, (_, i) => win(i))];
}
// Every building is opaque: each row of a sprite overwrites from its first to its last mark.
function scene(towers, stacks, W = 60, H = 40) {
  const g = Array.from({ length: H }, () => Array(W).fill(' '));
  const draw = (sp, x, bottom) => sp.forEach((row, i) => {
    const y = bottom - sp.length + 1 + i, a = row.search(/\S/), b = row.length - [...row].reverse().join('').search(/\S/);
    if (y < 0 || a < 0) return;
    for (let j = a; j < b; j++) if (x + j >= 0 && x + j < W) g[y][x + j] = row[j];
  });
  const base = H - 2;
  for (const [x, w, h, top] of towers) draw(tower(w, h, top), x, base);
  for (const [x, w, h, top, on] of stacks) draw(tower(w, h, top), x, base - BANK.length + (on ?? 0));
  for (const x of [2, 22, 42]) draw(BANK, x, base);
  g[H - 1] = [...'‾'.repeat(W)];
  return g.map((r) => r.join('').replace(/\s+$/, '')).join('\n');
}
const ART = [
  scene([], []),
  scene(
    [[25, 11, 30, 'mast'], [6, 9, 24, 'step'], [46, 10, 26, 'step'], [15, 8, 19], [35, 9, 21], [0, 7, 14], [54, 6, 16], [18, 6, 13], [38, 7, 13]],
    [[5, 9, 4, 'flat', 0], [25, 9, 5, 'flat', 0], [45, 9, 3, 'flat', 0]],
  ),
];

// ---------- the sound: its own mix, through feel.scene() ----------
function env(g, t, { a = 0.003, peak = 1, d = 0.2, sustain = 0.0001 }) {
  g.gain.value = 0; g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t + a + d);
}
function osc(ctx, out, t, { type = 'sine', f0, f1 = f0, glide = 0.1, a, peak, d }) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
  env(g, t, { a, peak, d }); o.connect(g).connect(out);
  o.start(t); o.stop(t + (a || 0.003) + d + 0.05);
}
const noiseCache = new WeakMap();
function noiseBuf(ctx) {
  if (!noiseCache.has(ctx)) { const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate), ch = b.getChannelData(0); let s = 7; for (let i = 0; i < ch.length; i++) { s = (s * 16807) % 2147483647; ch[i] = (s / 2147483647) * 2 - 1; } noiseCache.set(ctx, b); }
  return noiseCache.get(ctx);
}
function noise(ctx, out, t, { type = 'bandpass', f0 = 2000, q = 1, a = 0.002, peak = 0.5, d = 0.08 }) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf(ctx); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t);
  env(g, t, { a, peak, d }); src.connect(f).connect(g).connect(out);
  src.start(t, 0.1); src.stop(t + a + d + 0.05);
}
function loopNoise(ctx, out, { type = 'bandpass', f = 500, q = 0.7 } = {}) {
  const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter();
  src.buffer = noiseBuf(ctx); src.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  src.connect(fl).connect(out); return src;
}
function voice(ctx, out, type, f, peak) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.value = peak; o.connect(g).connect(out); return o;
}
function master(ctx, dest) {
  const comp = ctx.createDynamicsCompressor(), g = ctx.createGain();
  comp.threshold.value = -16; comp.ratio.value = 2.5; g.gain.value = 1.6; g.connect(comp).connect(dest);
  return g;
}
// A stuck buffer: the same slice again and again, faster, until it dies. [time, period] pairs from t0 to t1.
export function chopTimes(t0, t1) { const out = []; for (let x = t0, per = 0.12; x < t1; x += per, per = Math.max(0.028, per * 0.9)) out.push([x, Math.min(per, t1 - x)]); return out; }
const CROWD = 0.12; // the crowd's level in the hall: well under the hum
const SFX = new URL('./sfx/', import.meta.url);
// The samples: the game's keys and relays, the sub drop, and the crowd (sfx/coldopen/crowd.mp3, CREDITS.md).
async function load(ctx) {
  const get = async (f) => { try { const r = await fetch(new URL(f, SFX)); return r.ok ? await ctx.decodeAudioData(await r.arrayBuffer()) : null; } catch { return null; } };
  const [subdrop, relay, relay2, crowd, ...keys] = await Promise.all(['subdrop-0.wav', 'relay-0.wav', 'relay-3.wav', 'coldopen/crowd.mp3', ...Array.from({ length: 12 }, (_, i) => `key-${i}.wav`)].map(get));
  return { subdrop, relay, relay2, crowd, keys: keys.filter(Boolean) };
}
const SOUNDS = {
  // NETWORK OFFLINE: the power goes. A breaker's relay clunks, the sub drops away under it.
  slam(ctx, out, t, k, S) {
    const play = (b, at, gain, rate, lp) => { if (!b) return; const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = gain; let n = s; if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; n.connect(f); n = f; } n.connect(g).connect(out); s.start(at); };
    play(S.relay, t, 0.9, 0.7, 2500);
    play(S.relay2, t + 0.012, 0.6, 0.55, 1800);
    play(S.subdrop, t + 0.02, 1.1, 0.85);
  },
  // The bank floor, far off down a hall: a real crowd, old bell phones, a teller's printer, a stamp coming down. Calm,
  // busier once the members grow, uneasy through the climb; it sticks with the frame and dies with it. k's times are
  // from this cue, in seconds.
  bank(ctx, out, t, { start, busy, climb, cut, peak = cut, stutter }, S) {
    let sd = 4242; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const at = (x) => t + x, end = at(cut);
    const hall = ctx.createGain(), lp = ctx.createBiquadFilter(), cv = ctx.createConvolver(), wet = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 2400;
    { const len = Math.floor(ctx.sampleRate * 2.2), b = ctx.createBuffer(1, len, ctx.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 2.5); cv.buffer = b; }
    wet.gain.value = 0.5;
    hall.gain.setValueAtTime(0, at(start)); hall.gain.linearRampToValueAtTime(1.1, at(start) + 2.5);
    hall.gain.setValueAtTime(1.1, at(climb)); hall.gain.linearRampToValueAtTime(1.8, at(peak));
    hall.gain.setValueAtTime(1.8, end); hall.gain.linearRampToValueAtTime(0, end + 0.012);
    const gate = ctx.createGain(); gate.gain.setValueAtTime(1, end); gate.gain.linearRampToValueAtTime(0, end + 0.012); // the room's tail goes with it
    const fin = ctx.createGain(); fin.connect(out); // the stuck buffer chops here
    for (const [x, per] of chopTimes(at(stutter), end)) { fin.gain.setValueAtTime(1, x); fin.gain.setValueAtTime(0, x + per * 0.6); }
    hall.connect(lp); lp.connect(fin); lp.connect(cv).connect(wet).connect(gate).connect(fin);
    const busyAt = (x) => (x < busy ? 0.25 : x < climb ? 0.5 : 0.5 + 0.5 * ((x - climb) / (cut - climb)));
    // The people: a second pass of the take (from its middle) joins at 412 members, so the floor fills rather than
    // just getting louder. Each pass loops with a crossfade.
    const crowd = S.crowd;
    if (crowd) {
      const hp = ctx.createBiquadFilter(), X = 1.5, len = crowd.duration, srcs = [];
      hp.type = 'highpass'; hp.frequency.value = 160; hp.connect(hall);
      const pass = (from, off, level, fade) => {
        const g = ctx.createGain(); g.connect(hp);
        g.gain.setValueAtTime(0, at(from)); g.gain.linearRampToValueAtTime(level, at(from) + fade);
        for (let s0 = from, o = off; s0 < cut; s0 += len - o - X, o = 0) {
          const src = ctx.createBufferSource(), xg = ctx.createGain(), e = s0 + len - o;
          src.buffer = crowd; src.connect(xg).connect(g); srcs.push(src);
          if (s0 > from) { xg.gain.setValueAtTime(0, at(s0)); xg.gain.linearRampToValueAtTime(1, at(s0 + X)); }
          if (e < cut) { xg.gain.setValueAtTime(1, at(e - X)); xg.gain.linearRampToValueAtTime(0, at(e)); }
          src.start(at(s0), o); src.stop(Math.min(at(e), end + 0.05));
        }
      };
      pass(start, 0, CROWD, 0.1);
      pass(busy, len / 2, CROWD * 0.7, 3);
      // the stuck buffer: the crowd's last slice repeated
      const pos = (stutter - start) % len;
      for (const [x, per] of chopTimes(at(stutter), end)) {
        const g = ctx.createBufferSource(), gg = ctx.createGain(); g.buffer = crowd; gg.gain.value = CROWD * 1.4; g.connect(gg).connect(hp);
        g.start(x, pos, Math.min(0.06, per * 0.6));
      }
      for (const s of srcs) s.stop(at(stutter) + 0.002);
    }
    const phone = (x) => { // an electromechanical bell: two or three rings, then someone picks up
      const rings = 2 + Math.floor(r() * 2), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), am = ctx.createGain();
      lfo.type = 'square'; lfo.frequency.value = 18 + r() * 4; lg.gain.value = 0.5; am.gain.value = 0.5;
      lfo.connect(lg).connect(am.gain); am.connect(g); g.connect(hall); g.gain.value = 0;
      const pk = 0.03 + r() * 0.02, f = 0.9 + r() * 0.2, srcs = [lfo];
      for (const [h, a] of [[1260, 1], [1890, 0.6], [2950, 0.35]]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = h * f; og.gain.value = a; o.connect(og).connect(am); srcs.push(o); }
      for (let i = 0; i < rings; i++) { const s0 = at(x + i * 2.4); g.gain.setValueAtTime(0, s0); g.gain.linearRampToValueAtTime(pk, s0 + 0.01); g.gain.setValueAtTime(pk, s0 + 1); g.gain.linearRampToValueAtTime(0, s0 + 1.05); }
      for (const s of srcs) { s.start(at(x)); s.stop(Math.min(end, at(x + rings * 2.4))); }
    };
    const printer = (x) => { // a dot-matrix line: a gated rasp sliding across
      const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), gt = ctx.createOscillator(), gg = ctx.createGain(), am = ctx.createGain();
      src.buffer = noiseBuf(ctx); src.loop = true; bp.type = 'bandpass'; bp.Q.value = 3;
      bp.frequency.setValueAtTime(1300, at(x)); bp.frequency.linearRampToValueAtTime(1800, at(x + 0.7));
      gt.type = 'square'; gt.frequency.value = 55; gg.gain.value = 0.5; am.gain.value = 0.5; gt.connect(gg).connect(am.gain);
      g.gain.setValueAtTime(0, at(x)); g.gain.linearRampToValueAtTime(0.05, at(x) + 0.01); g.gain.setValueAtTime(0.05, at(x + 0.7)); g.gain.linearRampToValueAtTime(0, at(x + 0.72));
      src.connect(bp).connect(am).connect(g).connect(hall);
      src.start(at(x)); gt.start(at(x)); src.stop(Math.min(end, at(x + 0.75))); gt.stop(Math.min(end, at(x + 0.75)));
    };
    const stamp = (x) => { // a rubber stamp or a drawer: a dull thunk
      osc(ctx, hall, at(x), { type: 'sine', f0: 190, f1: 80, glide: 0.05, a: 0.002, peak: 0.12, d: 0.09 });
      noise(ctx, hall, at(x), { type: 'bandpass', f0: 900, q: 1, a: 0.001, peak: 0.05, d: 0.03 });
    };
    for (let x = start + 1.5; x < cut - 0.3;) {
      const b = busyAt(x), roll = r();
      if (roll < 0.25 + 0.3 * b) phone(x); else if (roll < 0.55) printer(x); else { stamp(x); if (r() < 0.5) stamp(x + 0.35); }
      x += (1.6 + r() * 2.6) * (1.25 - b);
    }
  },
  // One key: a different take each time, a touch of pitch drift. After the dark, quieter and muffled.
  key(ctx, out, t, { i, cold }, S) {
    if (!S.keys.length) return;
    const src = ctx.createBufferSource(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    src.buffer = S.keys[(i * 7 + 3) % S.keys.length];
    src.playbackRate.value = 1 + (((i * 37) % 11) - 5) * 0.012;
    lp.type = 'lowpass'; lp.frequency.value = cold ? 1800 : 9000;
    g.gain.value = cold ? 0.05 : 0.11;
    src.connect(lp).connect(g).connect(out); src.start(t);
  },
  // The machine room under it all: mains hum and fan air from the load; from 74% the strain (low saws drifting apart
  // under an opening filter, a high whine of hardware under load); chopped by the stuck frame, then cut dead. After the
  // dark a thinner, colder hum. k's times are from the start, in seconds.
  bed(ctx, out, t, { climb, cut, peak = cut, stutter, cold, end }) {
    const at = (x) => t + x, srcs = [];
    const bus = ctx.createGain(); bus.connect(out);
    for (const [x, per] of chopTimes(at(stutter), at(cut))) { bus.gain.setValueAtTime(1, x); bus.gain.setValueAtTime(0, x + per * 0.6); }
    const room = ctx.createGain();
    room.gain.setValueAtTime(0, t); room.gain.linearRampToValueAtTime(0.55, at(3));
    room.gain.setValueAtTime(0.55, at(climb)); room.gain.linearRampToValueAtTime(1, at(peak));
    room.gain.setValueAtTime(1, at(cut)); room.gain.linearRampToValueAtTime(0, at(cut) + 0.012);
    room.connect(bus);
    for (const [f, p] of [[50, 0.12], [100, 0.05], [150, 0.025]]) srcs.push(voice(ctx, room, 'sine', f, p));
    const fan = ctx.createGain(); fan.gain.value = 0.06; fan.connect(room);
    srcs.push(loopNoise(ctx, fan, { f: 450, q: 0.6 }));
    const strain = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2.5;
    lp.frequency.setValueAtTime(110, at(climb)); lp.frequency.exponentialRampToValueAtTime(1300, at(peak));
    strain.gain.setValueAtTime(0, t); strain.gain.setValueAtTime(0.0001, at(climb)); strain.gain.exponentialRampToValueAtTime(0.32, at(peak) - 0.05);
    strain.gain.setValueAtTime(0.32, at(cut)); strain.gain.linearRampToValueAtTime(0, at(cut) + 0.012);
    lp.connect(strain).connect(bus);
    for (const [f, spread] of [[55, 0], [55, 38], [55, -31], [82.4, 22], [41.2, -14]]) {
      const o = voice(ctx, lp, 'sawtooth', f, 0.2);
      o.detune.setValueAtTime(0, at(climb)); o.detune.linearRampToValueAtTime(spread, at(peak)); // the beating quickens
      o.frequency.setValueAtTime(f, at(climb)); o.frequency.exponentialRampToValueAtTime(f * 1.12, at(peak));
      srcs.push(o);
    }
    const whine = ctx.createGain(); whine.gain.setValueAtTime(0, t); whine.gain.setValueAtTime(0, at(climb + (peak - climb) * 0.5));
    whine.gain.linearRampToValueAtTime(0.018, at(peak)); whine.gain.setValueAtTime(0.018, at(cut)); whine.gain.linearRampToValueAtTime(0, at(cut) + 0.012);
    whine.connect(bus); srcs.push(voice(ctx, whine, 'sine', 3136, 1));
    for (const s of srcs) { s.start(t); s.stop(at(cut) + 0.05); }
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0, at(cold)); cg.gain.linearRampToValueAtTime(0.5, at(cold) + 2.5); cg.gain.setValueAtTime(0.5, at(end) - 1.5); cg.gain.linearRampToValueAtTime(0, at(end));
    cg.connect(out);
    const cs = [voice(ctx, cg, 'sine', 120, 0.05), voice(ctx, cg, 'sine', 360, 0.012)];
    const ng = ctx.createGain(); ng.gain.value = 0.025; ng.connect(cg); cs.push(loopNoise(ctx, ng, { type: 'highpass', f: 2500, q: 0.5 }));
    for (const s of cs) { s.start(at(cold)); s.stop(at(end) + 0.05); }
  },
};

// ---------- the script ----------
const NOISE = '#%&$@!?▒░';
const garble = (t) => [...t].map((ch, i) => (ch !== ' ' && ch !== '.' && (i * 7 + t.length) % 3 === 0 ? NOISE[(i * 5 + t.length) % NOISE.length] : ch)).join('');
const P = 'init: process table at ';
// The warnings, faster and higher as the table fills: [text, ms, warning, year].
const CLIMB = [
  ['warn: 412 trades awaiting counterparty', 1500, 1, 18], [P + '81%', 1250, 0, 18], ['warn: settlement queue stalled', 1050, 1, 18],
  [P + '86%', 950, 0, 19], ['warn: 3,180 trades awaiting counterparty', 800, 1, 19], ['warn: process table at 91%', 680, 1, 19],
  ['warn: settlement queue stalled', 560, 1, 19], ['warn: 11,902 trades awaiting counterparty', 460, 1, 20], ['warn: process table at 95%', 380, 1, 20],
  ['warn: 48,377 trades awaiting counterparty', 320, 1, 20], ['warn: process table at 97%', 270, 1, 20], ['warn: 210,664 trades awaiting counterparty', 230, 1, 20],
  ['warn: process table at 98%', 210, 1, 20],
].map(([t, ms, hot, y]) => ({ t, ms, y, c: hot ? 'h' : '' }));
const stutter = (t, n) => Array.from({ length: n }, (_, i) => [{ t: garble(t), same: true, c: 'gl', ms: 70 + i * 25 }, { t, same: true, c: 'h', ms: 60 }]).flat();
// NETWORK OFFLINE: on, one blink, on, off ([ms after it shows, on]).
export const BLINK = [[2200, 0], [2450, 1], [4400, 0]];
// The easter egg: one frame of the stuck screen shows the process beside init.
export const EGG = 'pid 2: wick';
const floors = [8, 7, 6, 5, 4, 3, 2, 1], floorYears = [21, 25, 29, 33, 37, 41, 45, 49];
const steps = [
  { snd: 'bed', ms: 800 },
  { snd: 'bank', ms: 0 },
  // the program loads: it's a bank
  { t: 'KESSLER SYSTEMS · SETTLEMENT CLEARING HOUSE', c: 'b', y: 0, art: 0, ms: 1000 },
  { t: 'loading clearing.sys', y: 0, ms: 600 },
  { t: 'loading clearing.sys ......', y: 0, same: true, ms: 400 },
  { t: 'loading clearing.sys ............. ok', y: 0, same: true, ms: 450 },
  { t: 'members: 40', y: 0, ms: 400 },
  { t: 'settlement: instant', y: 0, ms: 400 },
  { t: 'pid 1: init', y: 0, ms: 2200 },
  // the years
  { t: '', ms: 500 },
  { id: 'm412', t: 'members: 412 · banks, insurers, exchanges, payroll, city accounts', y: 9, art: 1, ms: 1900 },
  { t: 'settlement finality: on · timeout: off', y: 10, ms: 2200 },
  { t: P + '38%', y: 14, ms: 1500 },
  { id: 's74', t: P + '74%', y: 17, ms: 1900 },
  // the climb
  ...CLIMB,
  // 99%: the lines stutter
  { t: P + '99%', c: 'h', y: 20, art: 2, ms: 420 },
  ...stutter(P + '99%', 3),
  { t: garble('warn: settlement queue stalled'), c: 'gl', y: 20, ms: 160 },
  { t: garble('warn: process table at 99%'), c: 'gl', y: 20, ms: 140 },
  { t: 'init: proc', c: 'h', y: 20, ms: 220 },
  // the crash: the table fills, the frame sticks and stutters in bands, then the power goes
  { id: 'full', t: 'init: process table full', c: 'h', y: 20, ms: 250, hang: true },
  { id: 'stuck', fx: ['blackout', 'stuck'], ms: 1700 },
  { id: 'dead', fx: 'black', ms: 900 },
  { id: 'offline', fx: 'offline', snd: 'slam', ms: 4400 },
  { fx: 'gone', ms: 1400 },
  // after the dark: a colder machine
  { fx: 'cold', ms: 900 },
  { id: 'cold', t: 'recovery: 1,204,551 uninsured trades cancelled', y: 20, ms: 2600 },
  ...floors.map((f, i) => ({ t: `recovery: floor ${f} mounted`, y: floorYears[i], ms: 520 })),
  { t: '', ms: 700 },
  { t: P, count: 81, unit: '%', c: 'h', y: 50, ms: 2600 },
];
// Typing: each line types itself out, a key every couple of letters. A line that only grows (the loading dots) types
// its new part. Garbled lines and the count land whole. Outside the climb a line takes its typing time plus half its
// old pause; in the climb typing squeezes into the time the line has.
const CHAR = 30;
{ let prev = '', k = 0, cold = false, climb = false;
  for (const s of steps) {
    if (s.fx === 'cold') cold = true;
    if (s.id === 's74') climb = true;
    if (s.t === P + '99%' && !s.same) climb = false;
    if (!s.t || s.c === 'gl' || s.count != null) { if (s.t) prev = s.t; continue; }
    const from = s.same && s.t.startsWith(prev) ? prev.length : 0, n = s.t.length - from;
    let dur = n * CHAR;
    if (climb) dur = Math.min(dur, s.ms * 0.7); else s.ms = Math.round(dur + s.ms * 0.5);
    const keys = Math.max(1, Math.round(n / 2));
    s.type = { from, dur, cold, keys: Array.from({ length: keys }, (_, i) => ({ off: Math.round((i * dur) / keys), i: k++ })) };
    prev = s.t;
  }
}
let T = 0; for (const s of steps) { s.at = T; T += s.ms; }
const TOTAL = T + 2600;
{ const id = (k) => steps.find((s) => s.id === k).at / 1000;
  const peak = id('full'), cut = id('dead'), st = id('stuck'), b0 = steps[1].at / 1000; // the bank's times are from its own cue
  steps[0].k = { climb: id('s74'), peak, cut, stutter: st, cold: id('cold') - 0.9, end: TOTAL / 1000 };
  steps[1].k = { start: 0, busy: id('m412') - b0, climb: id('s74') - b0, peak: peak - b0, cut: cut - b0, stutter: st - b0 }; }
export const SCRIPT = { steps, TOTAL, cues: steps.filter((s) => s.snd).map((s) => [s.snd, s.at / 1000, s.k]) };

// ---------- playing it ----------
const esc = (s) => (s || ' ').replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function coldOpen({ audio = () => null, reducedMotion = () => false } = {}) {
  if (reducedMotion() || typeof document === 'undefined') return Promise.resolve();
  const tap = matchMedia('(pointer: coarse)').matches;
  const el = document.createElement('div');
  el.className = 'coldopen';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'KESSLER clearing house');
  el.innerHTML = `<div class="co-screen"><div class="co-log"><pre></pre></div><pre class="co-art"></pre></div>
    <div class="co-offline" hidden>NETWORK OFFLINE</div><small class="co-skip">${tap ? 'tap' : 'any key'} to skip</small>`;
  document.body.appendChild(el);
  const log = el.querySelector('.co-log'), pre = log.querySelector('pre'), art = el.querySelector('.co-art');
  const off = el.querySelector('.co-offline'), screen = el.querySelector('.co-screen');
  const a = audio(), ctx = a?.ctx, bus = a ? master(ctx, a.out) : null;
  let S = { keys: [] }, timers = [], lastY = null;
  const later = (f, ms) => timers.push(setTimeout(f, ms));
  const sound = (name, at, k) => { if (bus) try { SOUNDS[name](ctx, bus, ctx.currentTime + at + 0.02, k, S); } catch { /* no audio */ } };
  const row = (l, text) => (l.t ? `<span class="co-ts">${l.ts}</span>` : '') + esc(text);
  function fx(kind) {
    if (kind === 'blackout') { // the windows go out across the city in four sweeps, then the buildings dim
      const txt = art.textContent;
      for (let f = 1; f <= 4; f++) later(() => { art.textContent = [...txt].map((ch, i) => (ch !== ' ' && ch !== '\n' && ch !== '|' && ch !== '_' && ((i * 13) % 4) < f ? ' ' : ch)).join(''); }, f * 120);
      later(() => art.classList.add('dark'), 520);
    }
    if (kind === 'stuck') { // the frame freezes into bands that slip sideways and show the wrong rows, faster and faster
      const N = 9, bands = []; let sd = 99; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      for (let b = 0; b < N; b++) {
        const d = document.createElement('div'); d.className = 'co-band';
        d.style.clipPath = `inset(${(b * 100) / N}% 0 ${100 - ((b + 1) * 100) / N}% 0)`;
        d.appendChild(screen.cloneNode(true)); el.appendChild(d); bands.push(d);
        d.querySelector('.co-log').scrollTop = log.scrollTop; // the frame as it froze
      }
      screen.style.visibility = 'hidden';
      const egg = bands[4], sign = document.createElement('div');
      sign.className = 'co-egg'; sign.innerHTML = `<span>${EGG}</span>`;
      let x = 0, per = 120, n = 0;
      const tick = () => {
        // one frame, as it starts to warp: the middle band shows the egg instead of the screen
        if (n === 1) { egg.classList.add('egged'); egg.appendChild(sign); } else if (n === 2) { egg.classList.remove('egged'); sign.remove(); }
        n++;
        for (const d of bands) {
          if (d === egg && n === 2) { d.style.transform = d.style.filter = ''; continue; }
          if (r() < 0.45) continue;
          d.style.transform = `translateX(${Math.round((r() - 0.5) * 90 * (1 + x / 800))}px)`;
          d.firstChild.style.transform = r() < 0.5 ? `translateY(${Math.round((r() - 0.5) * 30) * 4}px)` : '';
          d.style.filter = r() < 0.12 ? 'brightness(2.4)' : r() < 0.1 ? 'opacity(0)' : '';
        }
        x += per; per = Math.max(28, per * 0.9);
        if (x < 1700) later(tick, per);
      };
      later(tick, 0);
    }
    if (kind === 'black') { screen.style.visibility = 'hidden'; el.querySelectorAll('.co-band').forEach((b) => b.remove()); }
    if (kind === 'offline') { // grey, small, centred; one blink and it's gone
      off.hidden = false;
      for (const [ms, on] of BLINK) later(() => off.classList.toggle('off', !on), ms);
    }
    if (kind === 'gone') off.hidden = true;
    if (kind === 'cold') { el.classList.add('cold'); pre.innerHTML = ''; art.textContent = ''; art.classList.remove('gl', 'dark'); lastY = null; screen.style.visibility = ''; }
  }
  function put(l) {
    if (l.art != null) { art.textContent = l.art === 2 ? ART[1].split('\n').map((r) => garble(r).replace(/[▒░]/g, '#')).join('\n') : ART[l.art]; art.classList.toggle('gl', l.art === 2); }
    if (l.fx) [].concat(l.fx).forEach(fx);
    if (l.snd) sound(l.snd, 0, l.k);
    if (l.t == null) return;
    const div = l.same && pre.lastElementChild ? pre.lastElementChild : pre.appendChild(document.createElement('div'));
    div.className = l.c || '';
    // the year shows when it changes (or stays on a line that grows)
    const show = l.y != null && (l.y !== lastY || (l.same && div.dataset.ts));
    if (l.y != null) lastY = l.y;
    l.ts = show ? l.y + 'y' : ''; div.dataset.ts = l.ts;
    pre.classList.toggle('hung', !!l.hang);
    if (l.type) {
      const { from, dur } = l.type, frames = Math.max(1, Math.round(dur / 16));
      div.innerHTML = row(l, l.t.slice(0, from));
      for (let f = 1; f <= frames; f++) later(() => { div.innerHTML = row(l, l.t.slice(0, from + Math.round(((l.t.length - from) * f) / frames))); }, (f * dur) / frames);
      for (const k of l.type.keys) sound('key', k.off / 1000, { i: k.i, cold: l.type.cold });
    } else if (l.count == null) div.innerHTML = row(l, l.t);
    else {
      const frames = 26; let k = 0;
      const tick = () => { k++; div.innerHTML = row(l, `${l.t}${Math.round(l.count * (1 - Math.pow(1 - k / frames, 2.2)))}${l.unit}`); if (k < frames) later(tick, 1700 / frames); };
      tick();
    }
    log.scrollTop = log.scrollHeight;
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      removeEventListener('keydown', skip, true);
      removeEventListener('pointerdown', skip, true);
      if (bus) { bus.gain.setTargetAtTime(0, ctx.currentTime, 0.05); setTimeout(() => bus.disconnect(), 600); }
      el.classList.add('out');
      setTimeout(() => { el.remove(); resolve(); }, 360);
    };
    const skip = (e) => {
      if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation(); finish();
    };
    setTimeout(() => { addEventListener('keydown', skip, true); addEventListener('pointerdown', skip, true); });
    // the samples first (a few seconds at most: it plays without what hasn't come)
    const ready = ctx ? Promise.race([load(ctx).then((s) => { S = s; }), new Promise((r) => setTimeout(r, 3000))]) : Promise.resolve();
    ready.then(() => {
      if (done) return;
      for (const l of steps) later(() => put(l), l.at);
      later(finish, TOTAL);
    });
  });
}

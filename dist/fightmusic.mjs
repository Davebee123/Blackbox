// Fight music: each virus family has its own theme, synthesized live like the radio (soundtrack.mjs), so there are
// no files and no licences. Dark, gritty industrial synthwave (the designer's round 4): everything through hard
// overdrive with a bit-crushed copy under it, shredded drums, a stamping press, overdriven basses, supersaw pads that
// duck under the kick, tape hiss and a factory rumble. Heat (0-1, how far the fight has gone) brings layers in.
// soundtrack.mjs fades a theme in when a fight starts and out when it ends.
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
let noiseBuf = null;
const noiseOf = (ctx) => {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (noiseBuf = b);
};
const curve = (k) => { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; };

// A theme's chain: dry and pumped (ducked by the kick) into a hard overdrive with a loud bit-crushed copy under it and a presence lift, plus reverb and a filtered feedback
// delay, into its fader. A faint tape hiss and a low factory rumble run under it all.
function makeBus(ctx, dest, delayTime, fb = 0.4) {
  const fader = ctx.createGain(), dry = ctx.createGain(), pump = ctx.createGain(), rev = ctx.createGain(), del = ctx.createGain();
  const drive = ctx.createWaveShaper(), tape = ctx.createBiquadFilter();
  drive.curve = curve(7); drive.oversample = '2x'; tape.type = 'lowpass'; tape.frequency.value = 9000;
  const conv = ctx.createConvolver(), len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.5; }
  conv.buffer = ir;
  const dl = ctx.createDelay(2), fbk = ctx.createGain(), lp = ctx.createBiquadFilter();
  dl.delayTime.value = delayTime; fbk.gain.value = fb; lp.type = 'lowpass'; lp.frequency.value = 2200;
  del.connect(dl).connect(lp).connect(fbk).connect(dl); lp.connect(drive); lp.connect(rev);
  rev.gain.value = 1; rev.connect(conv).connect(drive);
  dry.connect(drive); pump.connect(drive); const pres = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2600; pres.gain.value = 5; pres.Q.value = 0.8; hp.type = 'highpass'; hp.frequency.value = 35;
  drive.connect(tape).connect(pres).connect(hp).connect(fader); fader.connect(dest);
  const cr = ctx.createWaveShaper(), cg = ctx.createGain(); cr.curve = crush(5); cg.gain.value = 0.5; drive.connect(cr).connect(cg).connect(tape); // a bit-crushed copy under it all
  const bus = { ctx, fader, dry, pump, rev, del, held: [] };
  const h = ctx.createBufferSource(), hb = ctx.createBiquadFilter(), hg = ctx.createGain();
  h.buffer = noiseOf(ctx); h.loop = true; hb.type = 'bandpass'; hb.frequency.value = 5200; hb.Q.value = 0.4; hg.gain.value = 0.006;
  h.connect(hb).connect(hg).connect(fader); hold(bus, h);
  const r = ctx.createBufferSource(), rb = ctx.createBiquadFilter(), rg = ctx.createGain(); // the factory floor: a low rumble
  r.buffer = noiseOf(ctx); r.loop = true; rb.type = 'lowpass'; rb.frequency.value = 90; rb.Q.value = 3; rg.gain.value = 0.05;
  r.connect(rb).connect(rg).connect(fader); hold(bus, r);
  return bus;
}
function out(bus, node, { rev = 0, del = 0, pan = 0, pumped = false } = {}) {
  const { ctx } = bus; let n = node;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; }
  n.connect(pumped ? bus.pump : bus.dry);
  if (rev) { const g = ctx.createGain(); g.gain.value = rev; n.connect(g).connect(bus.rev); }
  if (del) { const g = ctx.createGain(); g.gain.value = del; n.connect(g).connect(bus.del); }
}
const crush = (n) => { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; c[i] = Math.round(x * n) / n; } return c; };
// A note: an oscillator through an optional (enveloped) filter and shaper, with an attack/decay envelope.
function tone(bus, t, f, dur, { type = 'sine', peak = 0.1, a = 0.004, cut = 0, cutTo = 0, q = 1, shape = 0, bits = 0, glideTo = 0, glideFrom = 0, detune = 0, ...send } = {}) {
  const { ctx } = bus, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.detune.value = detune;
  if (glideFrom) { o.frequency.setValueAtTime(glideFrom, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08); } else o.frequency.setValueAtTime(f, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  let n = o;
  if (cut) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(cut, t); fl.Q.value = q; if (cutTo) fl.frequency.exponentialRampToValueAtTime(cutTo, t + dur * 0.8); n.connect(fl); n = fl; }
  if (shape) { const s = ctx.createWaveShaper(); s.curve = curve(shape); n.connect(s); n = s; }
  if (bits) { const s = ctx.createWaveShaper(); s.curve = crush(bits); n.connect(s); n = s; }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(g); out(bus, g, send); o.start(t); o.stop(t + dur + 0.05);
}
// A supersaw chord: three detuned saws a note, one swelling filter, held then released. The synthwave pad.
function pad(bus, t, notes, dur, { peak = 0.03, a = 0.5, cut = 900, cutTo = 0, q = 2, spread = 14, ...send } = {}) {
  const { ctx } = bus, fl = ctx.createBiquadFilter(), g = ctx.createGain();
  fl.type = 'lowpass'; fl.Q.value = q; fl.frequency.setValueAtTime(cut, t); if (cutTo) fl.frequency.linearRampToValueAtTime(cutTo, t + dur);
  const rel = Math.min(0.25, dur * 0.3), at = Math.min(a, dur - rel); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + at); g.gain.setValueAtTime(peak, t + dur - rel); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  notes.forEach((m) => [-spread, 0, spread].forEach((d) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = d + rnd(-3, 3); o.connect(fl); o.start(t); o.stop(t + dur + 0.05); }));
  fl.connect(g); out(bus, g, send);
}
// A lead: two detuned saws with vibrato, sliding in from the last note.
function lead(bus, t, f, dur, { peak = 0.035, cut = 2400, from = 0, ...send } = {}) {
  const { ctx } = bus, fl = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  fl.type = 'lowpass'; fl.frequency.value = cut; fl.Q.value = 3; lfo.frequency.value = 5.2; lg.gain.value = 9; lfo.connect(lg);
  [-8, 8].forEach((d) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.detune.value = d; if (from) { o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); } else o.frequency.setValueAtTime(f, t); lg.connect(o.detune); o.connect(fl); o.start(t); o.stop(t + dur + 0.05); });
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.05); g.gain.setValueAtTime(peak, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  fl.connect(g); out(bus, g, send); lfo.start(t); lfo.stop(t + dur + 0.05);
}
function noise(bus, t, dur, { peak = 0.05, type = 'highpass', f = 6000, q = 0.7, a = 0.002, sweepTo = 0, ...send } = {}) {
  const { ctx } = bus, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseOf(ctx); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g); out(bus, g, send); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}
// A kick, driven; `duck` pumps everything routed through the bus's pump (pads, bass) out of its way.
function kick(bus, t, { peak = 0.3, f0 = 120, f1 = 42, dur = 0.34, drive = 10, duck = true, ...send } = {}) {
  const { ctx } = bus, o = ctx.createOscillator(), g = ctx.createGain(), sh = ctx.createWaveShaper();
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.5); sh.curve = curve(drive);
  g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(sh).connect(g); out(bus, g, send); o.start(t); o.stop(t + dur + 0.05);
  noise(bus, t, 0.02, { peak: peak * 0.5, type: 'bandpass', f: 3000, q: 0.8 });
  if (duck) { const p = bus.pump.gain; p.cancelScheduledValues(t); p.setValueAtTime(0.22, t); p.linearRampToValueAtTime(1, t + 0.3); }
}
// The snare: a body thump and a burst of driven, crushed noise into a big room, the tail cut short.
function snare(bus, t, { peak = 0.12, rev = 0.9, gate = 0.22, grit = 8, bits = 4, ...send } = {}) {
  tone(bus, t, 190, 0.12, { peak: peak * 0.8, glideTo: 140, ...send });
  const { ctx } = bus, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseOf(ctx); fl.type = 'highpass'; fl.frequency.value = 900;
  g.gain.setValueAtTime(peak, t); g.gain.setValueAtTime(peak * 0.55, t + gate * 0.6); g.gain.linearRampToValueAtTime(0.0001, t + gate);
  const sh = ctx.createWaveShaper(), cr = ctx.createWaveShaper(); sh.curve = curve(grit); cr.curve = crush(bits);
  s.connect(fl).connect(sh).connect(cr).connect(g); out(bus, g, { rev, ...send }); s.start(t, Math.random()); s.stop(t + gate + 0.05);
}
function bell(bus, t, f, dur, { peak = 0.06, ratio = 1.41, index = 2.5, ...send } = {}) {
  const { ctx } = bus, c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
  c.frequency.value = f; m.frequency.value = f * ratio;
  mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(1, t + dur);
  m.connect(mg).connect(c.frequency);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  c.connect(g); out(bus, g, send); c.start(t); m.start(t); c.stop(t + dur + 0.05); m.stop(t + dur + 0.05);
}
// Metal: four detuned square partials through a band, struck and ringing out (a clang, a rivet, a door).
function metal(bus, t, { f = 540, peak = 0.04, dur = 0.18, cut = 4200, ...send } = {}) {
  const { ctx } = bus, bp = ctx.createBiquadFilter(), g = ctx.createGain();
  bp.type = 'bandpass'; bp.frequency.value = cut; bp.Q.value = 1.2;
  [1, 1.47, 2.09, 2.76].forEach((r) => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f * r; o.connect(bp); o.start(t); o.stop(t + dur + 0.05); });
  g.gain.setValueAtTime(peak * 2.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  bp.connect(g); out(bus, g, send);
}
// A hydraulic piston letting go: a hiss sweeping down.
const piston = (bus, t, dur, { peak = 0.05, ...send } = {}) => noise(bus, t, dur, { peak: peak * 2, type: 'bandpass', f: 6500, sweepTo: 700, q: 1.5, a: 0.01, ...send });
// A stamping press: a low metal slam, a thud and a burst of grit. Every theme runs one on its own pattern.
function press(bus, t, { peak = 0.08, f = 150, ...send } = {}) {
  metal(bus, t, { f, peak: peak * 0.5, dur: 0.3, cut: 1600, ...send });
  kick(bus, t, { peak: peak * 2, f0: 90, f1: 50, dur: 0.18, drive: 12, duck: false, ...send });
  noise(bus, t, 0.09, { peak: peak * 0.8, type: 'bandpass', f: 1200, q: 0.7, ...send });
}
// A held sound for the theme's whole life (a drone, a fan): started now, stopped with the theme.
function hold(bus, node) { bus.held.push(node); node.start(); return node; }

export const THEMES = [
  {
    id: 'ransomware', name: 'Ransomware', stem: 'CRYPTJACK', bpm: 100, gain: 0.07,
    feel: 'Darksynth in D minor: an octave-pumping driven bass under a ducking supersaw, a clock that never stops ticking and metal on the offbeats. Heat adds four on the floor, an arpeggio, a gated snare and a sliding lead.',
    delay: 3, step(b, i, t, s, I) {
      const k = i % 16, bar = Math.floor(i / 16) % 4;
      const roots = [38, 34, 31, 33], chords = [[50, 53, 57, 62], [46, 50, 53, 58], [43, 46, 50, 55], [45, 49, 52, 57]];
      if (k === 0) pad(b, t, chords[bar], s * 16, { peak: 0.016, a: 0.6, cut: 800 + I * 1400, rev: 0.4, pumped: true });
      if (k % 2 === 0) tone(b, t, mtof(roots[bar] - (k % 4 === 0 ? 12 : 0)), s * 1.7, { type: 'sawtooth', peak: 0.085, cut: 420 + I * 900, cutTo: 160, q: 7, shape: 9, pumped: true });
      if (k % 2 === 0) { noise(b, t, 0.02, { peak: k % 4 === 0 ? 0.05 : 0.03, f: 8000, pan: k % 4 === 0 ? -0.35 : 0.35 }); tone(b, t, k % 4 === 0 ? 2100 : 1500, 0.025, { peak: 0.018, type: 'square', cut: 3000, pan: k % 4 === 0 ? -0.35 : 0.35 }); }
      if (I > 0.25 ? k % 4 === 0 : k === 0) kick(b, t, { peak: 0.3 });
      if (k % 4 === 2) metal(b, t, { f: 420, peak: 0.018 + 0.02 * I, dur: 0.09, pan: 0.4 });
      if (k === 14 && bar % 2 === 1) piston(b, t, 0.35, { peak: 0.04, pan: -0.4 });
      if (k === 10 || (I > 0.5 && k === 3)) press(b, t, { peak: 0.07, pan: 0.2 });
      if (I > 0.4) tone(b, t, mtof(chords[bar][k % 4] + 12), s * 0.9, { type: 'square', peak: 0.022, cut: 2400, cutTo: 600, del: 0.3, pan: 0.25 });
      if (I > 0.5 && (k === 4 || k === 12)) snare(b, t, { peak: 0.11 });
      if (I > 0.7 && k === 0) { const mel = [74, 70, 67, 69]; lead(b, t, mtof(mel[bar]), s * 14, { peak: 0.03, from: mtof(mel[(bar + 3) % 4]), del: 0.25, rev: 0.3 }); }
    },
  },
  {
    id: 'worm', name: 'Worm', stem: 'SPLINTER', bpm: 112, gain: 0.07,
    feel: 'Melodic: a rolling octave bass and a ducking supersaw in E minor under a four-note pluck motif. Heat adds copies of the motif, each entering late and higher, until it plays as a canon.',
    delay: 3, step(b, i, t, s, I) {
      const k = i % 16, bar = Math.floor(i / 16) % 4;
      const roots = [28, 24, 21, 23], chords = [[52, 55, 59], [48, 52, 55], [45, 48, 52], [47, 51, 54]];
      const mot = [[64, 67, 71, 67], [64, 67, 72, 67], [64, 69, 72, 69], [63, 66, 71, 66]][bar], at = [0, 3, 6, 10];
      if (k === 0) pad(b, t, chords[bar], s * 16, { peak: 0.014, a: 0.5, cut: 700 + I * 1000, rev: 0.4, pumped: true });
      if (k % 2 === 0) tone(b, t, mtof(roots[bar] + (k % 4 === 2 ? 12 : 0)), s * 1.6, { type: 'sawtooth', peak: 0.075, cut: 500 + I * 600, cutTo: 180, q: 5, shape: 6, pumped: true });
      const voices = [[0, 0, 0.034, 0]].concat(I > 0.3 ? [[3, 12, 0.022, 0.45]] : [], I > 0.6 ? [[6, 7, 0.018, -0.45]] : []);
      voices.forEach(([lag, up, peak, pan]) => { const j = at.indexOf((k - lag + 16) % 16); if (j >= 0) tone(b, t, mtof(mot[j] + up), s * 2.5, { type: 'square', peak, cut: 2600, cutTo: 500, q: 3, del: 0.3, rev: 0.2, pan }); });
      if (k === 0 || k === 8 || (I > 0.4 && k % 4 === 0)) kick(b, t, { peak: 0.28 });
      if (k % 4 === 2) noise(b, t, 0.03, { peak: 0.03, f: 8000, pan: 0.3 });
      if (I > 0.5 && (k === 4 || k === 12)) snare(b, t, { peak: 0.1 });
      if (k === 14 && bar === 3) press(b, t, { peak: 0.06, f: 160 });
    },
  },
  {
    id: 'ghostroot', name: 'Ghostroot', stem: 'GHOSTROOT', bpm: 76, gain: 0.125,
    feel: 'Dark industrial ambient: a grinding supersaw drone breathing through its filter, low glass bells on a whole-tone scale, swells that play backwards, whispers and slow metal scrapes. Heat brings a heartbeat, a distant gated snare and scrambled blips.',
    delay: 4, fb: 0.5, start(b) {
      const { ctx } = b, lfo = ctx.createOscillator(), lg = ctx.createGain(), cl = ctx.createOscillator(), cg = ctx.createGain(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 4; g.gain.value = 0.012;
      lfo.frequency.value = 0.09; lg.gain.value = 18; lfo.connect(lg); cl.frequency.value = 0.06; cg.gain.value = 320; cl.connect(cg).connect(lp.frequency);
      [36, 42, 48].forEach((m) => [-16, 0, 16].forEach((d) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = d; lg.connect(o.detune); o.connect(lp); hold(b, o); }));
      const grind = ctx.createWaveShaper(); grind.curve = curve(6); // the drone grinds
      lp.connect(grind).connect(g); out(b, g, { rev: 0.6, pumped: true }); hold(b, lfo); hold(b, cl);
    },
    step(b, i, t, s, I) {
      const k = i % 16, bar = Math.floor(i / 16), WT = [0, 2, 4, 6, 8, 10];
      if (k % 2 === 0 && Math.random() < 0.16) bell(b, t, mtof(60 + pick(WT) + 12 * (Math.random() < 0.3)), 2.4, { peak: 0.035, ratio: 3.5, index: 1.6, rev: 0.8, del: 0.3, pan: rnd(-0.5, 0.5) });
      if (k === 0 && bar % 2 === 0) tone(b, t, mtof(48 + pick(WT)), s * 8, { type: 'sawtooth', peak: 0.04, a: s * 7.6, cut: 900, rev: 0.6 });
      if (Math.random() < 0.05) noise(b, t, 0.7, { peak: 0.03, type: 'bandpass', f: rnd(600, 2600), q: 9, a: 0.25, sweepTo: rnd(500, 2800), rev: 0.7, pan: rnd(-0.8, 0.8) });
      if (I > 0.25 && (k === 0 || k === 3)) kick(b, t, { peak: 0.12 + 0.16 * I, f0: 70, f1: 32, dur: 0.45, drive: 2 });
      if (I > 0.55 && k === 8) snare(b, t, { peak: 0.06, rev: 1.4, gate: 0.3 });
      if (k === 0 && bar % 4 === 2) noise(b, t, s * 12, { peak: 0.028, type: 'bandpass', f: 300, sweepTo: 2400, q: 18, a: s * 4, rev: 0.8, pan: rnd(-0.6, 0.6) });
      if (k === 0 && bar % 2 === 1) press(b, t, { peak: 0.06, f: 110, rev: 0.9 });
      if (I > 0.4 && k === 12 && bar % 2 === 1) metal(b, t, { f: 180, peak: 0.03, dur: 0.7, cut: 2000, rev: 0.9, pan: rnd(-0.5, 0.5) });
      if (I > 0.65 && Math.random() < 0.08) tone(b, t, rnd(900, 3200), 0.05, { type: 'square', peak: 0.016, bits: 4, del: 0.4, pan: rnd(-0.8, 0.8) });
    },
  },
  {
    id: 'trojan', name: 'Trojan', stem: 'TROJAN', bpm: 92, gain: 0.08,
    feel: 'A music box gone wrong: a minor bell arpeggio over a supersaw, and a bass that lands a tritone wrong at the end of every bar. Two knocks on a metal door every other bar. Heat brings half-time drums, and the wrong note takes over the bar.',
    delay: 2, step(b, i, t, s, I) {
      const k = i % 16, bar = Math.floor(i / 16), c = bar % 4;
      const roots = [33, 29, 26, 28], chords = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
      if (k === 0) pad(b, t, chords[c].map((m) => m - 12), s * 16, { peak: 0.014, a: 0.5, cut: 700 + I * 700, rev: 0.4, pumped: true });
      if (k % 2 === 0) { const arp = [0, 1, 2, 1, 0, 1, 2, 2], j = arp[(k / 2) % 8], m = chords[c][j] + 12 + (k === 14 ? 12 : 0); bell(b, t, mtof(m), 0.9, { peak: 0.04, ratio: 2, index: 1.4, rev: 0.45, del: 0.2 }); }
      const wrong = I > 0.75 || k === 12 || (I > 0.5 && k === 6);
      if (k === 0 || k === 12 || (I > 0.5 && k === 6)) tone(b, t, mtof(roots[c] + (wrong ? 6 : 0)), s * (k === 0 ? 6 : 4), { type: 'sawtooth', peak: 0.1, cut: 360, q: 4, shape: 8, pumped: true });
      if (bar % 2 === 1 && (k === 12 || k === 14)) { kick(b, t, { peak: 0.18, f0: 160, f1: 70, dur: 0.12, drive: 2, duck: false, rev: 0.15 }); metal(b, t, { f: 140, peak: 0.05, dur: 0.16, cut: 1200, rev: 0.25 }); }
      if (I > 0.3 && k === 0) kick(b, t, { peak: 0.28, f0: 100 });
      if (I > 0.3 && k === 8) snare(b, t, { peak: 0.1 });
      if (k === 4 || (I > 0.6 && k === 10)) press(b, t, { peak: 0.06, f: 130 });
      if (I > 0.45 && k % 2 === 0) metal(b, t, { f: 800, peak: 0.012, dur: 0.04, cut: 7000 });
      if (I > 0.55 && bar % 2 === 0 && k === 8) [-0.6, 0.6].forEach((p, j) => tone(b, t + j * s, 1300, 0.14, { type: 'square', peak: 0.025, glideTo: 220, cut: 3000, bits: 6, pan: p, del: 0.2 }));
    },
  },
  {
    id: 'cryptominer', name: 'Cryptominer', stem: 'XMRIG', bpm: 118, gain: 0.059,
    feel: 'An industrial darksynth machine room: fan hum, pistons, a distorted four-on-the-floor kick and a rolling 16th bass whose filter and drive open over eight bars as the rig heats, then vent. The hash ping climbs a step every bar.',
    delay: 3, start(b) {
      const { ctx } = b, s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseOf(ctx); s.loop = true; bp.type = 'bandpass'; bp.frequency.value = 300; bp.Q.value = 0.6; g.gain.value = 0.045;
      s.connect(bp).connect(g); out(b, g); hold(b, s);
      const h = ctx.createOscillator(), hg = ctx.createGain(); h.frequency.value = 55; hg.gain.value = 0.03; h.connect(hg); out(b, hg); hold(b, h);
    },
    step(b, i, t, s, I) {
      const k = i % 16, bar = Math.floor(i / 16) % 8, heat = (bar + k / 16) / 8, cut = 260 + 2400 * heat * (0.35 + 0.65 * I);
      if (k % 4 === 0) kick(b, t, { peak: 0.3, f0: 110, f1: 44, dur: 0.26, drive: 5 });
      tone(b, t, mtof(33 + [0, 0, 12, 0][k % 4] + (bar >= 4 && k >= 8 ? -2 : 0)), s * 0.95, { type: 'sawtooth', peak: 0.07, cut, q: 8, shape: 5 + 8 * heat * I, bits: heat * I > 0.45 ? 6 : 0, pumped: true });
      if (k === 0 && bar % 2 === 0) pad(b, t, bar < 4 ? [57, 60, 64] : [55, 59, 62], s * 32, { peak: 0.011, a: 0.3, cut: 600 + 1200 * heat, rev: 0.3, pumped: true });
      if (k % 8 === 4) bell(b, t, mtof(81 + bar), 0.3, { peak: 0.035, ratio: 1.41, index: 3, del: 0.3, pan: 0.3 });
      if (I > 0.3 && k % 4 === 2) metal(b, t, { f: 600, peak: 0.015 + 0.02 * I, dur: 0.05, cut: 6000 });
      if (k === 2 || k === 10) press(b, t, { peak: 0.06, f: 170, pan: k === 2 ? -0.3 : 0.3 });
      if (k === 10) piston(b, t, 0.3, { peak: 0.025 + 0.03 * heat, pan: 0.35 });
      if (I > 0.45 && (k === 4 || k === 12)) snare(b, t, { peak: 0.1 });
      if (bar === 7 && k === 8) noise(b, t, s * 8, { peak: 0.05, type: 'bandpass', f: 400, sweepTo: 5000, q: 2, a: s * 7 });
      if (bar === 0 && k === 0) noise(b, t, 1.2, { peak: 0.06, type: 'lowpass', f: 5000, sweepTo: 300, rev: 0.3 });
    },
  },
  {
    id: 'wiper', name: 'Wiper', stem: 'SHAMOON', bpm: 108, gain: 0.065,
    feel: 'The harshest: a bitcrushed Locrian bass, a diminished supersaw that loses random steps, a broken kick, gated snares and a CRT degauss thoom every four bars, pistons and stray clangs. Heat adds tape stops.',
    delay: 3, step(b, i, t, s, I) {
      const k = i % 16, bar = Math.floor(i / 16);
      const pat = [0, null, 0, 12, null, 0, 1, null, 0, null, null, 13, 0, null, 6, null];
      if (pat[k] != null) tone(b, t, mtof(34 + pat[k]), s * 0.9, { type: 'sawtooth', peak: 0.06, cut: 1000, cutTo: 300, q: 4, shape: 12, bits: 3, pumped: true });
      if (k === 0) b.wiped = new Set([pick([1, 3, 5, 7]), pick([9, 11, 13, 15]), Math.floor(rnd(0, 16))]);
      if (!b.wiped?.has(k)) pad(b, t, [58, 61, 64], s * 0.75, { peak: 0.012, a: 0.005, cut: 1600, spread: 20 });
      if (k === 0 && bar % 4 === 0) { tone(b, t, 60, 1.3, { peak: 0.2, glideTo: 48, a: 0.01, rev: 0.2 }); tone(b, t, 120, 1.1, { type: 'sawtooth', peak: 0.04, cut: 500, glideTo: 96 }); noise(b, t, 0.9, { peak: 0.05, type: 'lowpass', f: 220 }); }
      if ([0, 6, 10].includes(k)) kick(b, t, { peak: 0.3, f0: 100, drive: 6 });
      if (I > 0.35 && (k === 4 || k === 12)) snare(b, t, { peak: 0.11, gate: 0.18, grit: 6, bits: 4 });
      if (I > 0.5 && bar % 4 === 3 && k === 12) tone(b, t, mtof(58), s * 4, { type: 'sawtooth', peak: 0.06, cut: 1200, glideTo: 22, a: 0.01, shape: 3 });
      if (Math.random() < 0.05) noise(b, t, 0.05, { peak: 0.03, f: 3000, pan: rnd(-0.8, 0.8) });
      if (k === 8 && bar % 2 === 1) piston(b, t, 0.4, { peak: 0.045, pan: -0.3 });
      if (k === 3 || k === 13 || Math.random() < 0.06) press(b, t, { peak: 0.07, f: rnd(110, 200), pan: rnd(-0.5, 0.5) });
      if (Math.random() < 0.04) metal(b, t, { f: rnd(200, 700), peak: 0.025, dur: 0.12, cut: rnd(2000, 6000), pan: rnd(-0.8, 0.8) });
    },
  },
];

export const FIGHT_THEMES = Object.fromEntries(THEMES.map((t) => [t.id, t]));
const AHEAD = 0.15; // seconds of notes scheduled ahead

// Play a family's theme into dest, fading in over fadeIn seconds. Returns { id, setHeat(0-1), stop(fade) }, or null
// for a family with no theme. While the page is hidden nothing new is scheduled (timers there run late).
export function playTheme(ctx, dest, id, { level = 1, fadeIn = 3, heat = 0.2 } = {}) {
  const th = FIGHT_THEMES[id];
  if (!th) return null;
  const s = 60 / th.bpm / 4, bus = makeBus(ctx, dest, s * (th.delay || 3), th.fb ?? 0.4), g = bus.fader.gain, t0 = ctx.currentTime;
  g.setValueAtTime(0, t0); g.linearRampToValueAtTime(th.gain * level, t0 + fadeIn);
  th.start?.(bus);
  let i = 0, next = t0 + 0.05, stopped = false;
  const tick = () => {
    if (typeof document !== 'undefined' && document.hidden) { next = ctx.currentTime + 0.05; return; }
    if (next < ctx.currentTime) next = ctx.currentTime + 0.02;
    while (next < ctx.currentTime + AHEAD) { th.step(bus, i++, next, s, heat); next += s; }
  };
  const timer = setInterval(tick, 25);
  tick();
  return {
    id,
    setHeat(h) { heat = Math.max(0, Math.min(1, h)); },
    stop(fade = 3) {
      if (stopped) return;
      stopped = true;
      const t = ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + fade);
      setTimeout(() => { clearInterval(timer); bus.held.forEach((n) => { try { n.stop(); } catch {} }); bus.fader.disconnect(); }, (fade + 0.3) * 1000);
    },
  };
}

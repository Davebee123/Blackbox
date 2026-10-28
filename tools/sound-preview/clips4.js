// Round 4 of the preview pack: a step between rooms on a server's room map (travelfx.mjs plays its look). Three
// candidates, each one short shot timed to the travel (about 0.55 s along the trace, then the scan line down the room
// you walked into). Quiet and dry: you take hundreds of steps, so none of them may tire. Same world as rounds 2 and 3:
// layered CC0 samples from dist/sfx and synthesis.
//   SET=4 node tools/sound-preview/render.mjs <outDir>
import { rnd } from './lib.js';

const step = (id, desc, build) => ({ id, desc, build, len: 0.9, shot: true });

const steps = [
  step('step-a-relay', 'Step A, the relay: a soft relay clicks as you leave the room, a faint run of current ticks along the trace, and a second, lower relay latches as you arrive.', (K) => {
    const out = K.space(K.out, { secs: 0.6, decay: 3, damp: 0.5, wet: 0.12 });
    K.S(out, 0, 'relay', { gain: 0.45, rate: 1.15, hp: 400, pan: -0.25 });
    for (let t = 0.06; t < 0.46; t += rnd(0.035, 0.06)) K.burst(out, t, { type: 'bandpass', f0: rnd(3200, 4600), q: 3, a: 0.0005, d: 0.006, peak: 0.035, pan: -0.25 + t });
    K.S(out, 0.5, 'relay', { gain: 0.55, rate: 0.9, hp: 300, pan: 0.25 });
    K.blip(out, 0.5, { type: 'sine', f0: 180, f1: 120, glide: 0.04, a: 0.001, d: 0.06, peak: 0.08, pan: 0.25 });
  }),
  step('step-b-chirp', 'Step B, the data chirp: a short modem-like warble rises as your code runs down the trace, and settles on a clean two-note handshake as you load into the room.', (K) => {
    const out = K.space(K.out, { secs: 0.8, decay: 2.6, damp: 0.45, wet: 0.16 });
    const g = K.gain(1); K.chain(g, K.filt('lowpass', 3800), out);
    // the warble: a square tone hopping between two frequencies (FSK), climbing as it travels
    for (let t = 0, i = 0; t < 0.44; t += 0.022, i++) K.blip(g, t, { type: 'square', f0: (i % 2 ? 1250 : 1050) * (1 + t * 0.9), a: 0.002, hold: 0.012, d: 0.008, peak: 0.018, pan: -0.3 + t * 1.2 });
    K.blip(out, 0.5, { type: 'sine', f0: 1320, a: 0.002, hold: 0.03, d: 0.08, peak: 0.07, pan: 0.2 });
    K.blip(out, 0.56, { type: 'sine', f0: 1760, a: 0.002, hold: 0.03, d: 0.14, peak: 0.06, pan: 0.2 });
  }),
  step('step-c-bits', 'Step C, the bit train: a quick run of tiny dry ticks, like the 1s and 0s riding the trace, ending in a soft muted thud as the room takes you in.', (K) => {
    const out = K.space(K.out, { secs: 0.5, decay: 3, damp: 0.6, wet: 0.08 });
    for (let t = 0, i = 0; t < 0.42; t += 0.045, i++) {
      const f = Math.random() < 0.5 ? 2400 : 3100;
      K.burst(out, t, { type: 'bandpass', f0: f, q: 4, a: 0.0005, d: 0.01, peak: 0.07 * (0.6 + i / 16), pan: -0.4 + t * 1.6 });
      K.blip(out, t, { type: 'sine', f0: f / 2, a: 0.0005, d: 0.008, peak: 0.02, pan: -0.4 + t * 1.6 });
    }
    K.S(out, 0.48, 'soft-m', { gain: 0.35, rate: 1.3, lp: 1800, pan: 0.3 });
    K.sub(out, 0.48, { f0: 110, f1: 60, glide: 0.08, d: 0.14, peak: 0.25 });
  }),
];

export const GROUPS4 = { steps };

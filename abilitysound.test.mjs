// Ability sounds, the style round (dist/abilitysound.mjs): each class's key 1 in each style, timed to its effect.
// Played against a stand-in AudioContext that records when each sound source starts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STYLES, KEYS, TRIM, timingOf, playAbility, hasSound } from './dist/abilitysound.mjs';
import { SPIKE } from './dist/data.mjs';
import { RECIPES } from './dist/abilityfx-table.mjs';

function fakeContext() {
  const starts = [];
  const param = () => { const p = { value: 0 }; for (const k of ['setValueAtTime', 'exponentialRampToValueAtTime', 'linearRampToValueAtTime', 'setTargetAtTime']) p[k] = (v, t) => { assert.ok(Number.isFinite(v) && Number.isFinite(t) && t >= 0, `${k}(${v}, ${t})`); return p; }; return p; };
  const node = (extra = {}) => ({ connect: (d) => d, disconnect() {}, ...extra });
  const buffer = (ch, len, sr) => ({ numberOfChannels: ch, length: len, sampleRate: sr, duration: len / sr, getChannelData: () => new Float32Array(len) });
  const source = (kind) => node({ kind, start: (t) => { assert.ok(Number.isFinite(t), 'start time'); starts.push({ kind, t }); }, stop() {} });
  const ctx = {
    sampleRate: 44100, starts,
    createGain: () => node({ gain: param() }),
    createBiquadFilter: () => node({ frequency: param(), Q: param() }),
    createWaveShaper: () => node({}),
    createDelay: () => node({ delayTime: param() }),
    createStereoPanner: () => node({ pan: param() }),
    createOscillator: () => ({ ...source('osc'), frequency: param(), detune: param() }),
    createBufferSource: () => ({ ...source('buf'), playbackRate: param() }),
    createBuffer: buffer,
  };
  const sample = () => buffer(1, 22050, 44100);
  return { ctx, sample };
}
const PLAN = { travel: 180, hold: 33, impact: 287, stop: 50 };
const RESULTS = ['hit', 'crit', 'chit', 'miss'];

test('every style has a sound and levels for each class\'s key 1', () => {
  assert.deepEqual(KEYS, Object.values(SPIKE).map((s) => s.word));
  for (const style of Object.keys(STYLES)) for (const key of KEYS) {
    assert.ok(hasSound(style, key), `${style} ${key}`);
    assert.ok(RECIPES[key], `${key} has an effect`);
    for (const k of ['level', 'crit', 'chit', 'miss']) assert.equal(typeof TRIM[style][key][k], 'number', `${style} ${key} ${k}`);
  }
});

test('the timing follows the effect: it leaves, arrives, draws back, strikes and lands on the number\'s beat', () => {
  const T = timingOf(10, PLAN, { result: 'crit', power: 0.4 });
  assert.equal(T.t, 10);
  assert.ok(Math.abs(T.arrive - 10.18) < 1e-9 && Math.abs(T.strike - 10.213) < 1e-9 && Math.abs(T.hit - 10.287) < 1e-9);
  assert.ok(T.flies);
  const still = timingOf(5, null, { result: 'hit' }); // no effect to time it (Screen effects off): contact at once
  assert.equal(still.hit, 5);
  assert.equal(still.flies, false);
});

test('each sound starts as its effect leaves the key and lands on the hit, and is done within a second and a half', () => {
  for (const style of Object.keys(STYLES)) for (const key of KEYS) for (const result of RESULTS) {
    const { ctx, sample } = fakeContext(), T = timingOf(1, PLAN, { result, power: 0.4 });
    assert.ok(playAbility(ctx, { dry: ctx.createGain(), room: ctx.createGain() }, style, key, T, sample));
    const at = ctx.starts.map((s) => s.t), id = `${style} ${key} ${result}`;
    assert.ok(at.length > 0, id);
    assert.ok(Math.min(...at) >= T.t - 1e-6, `${id}: nothing before it leaves`);
    assert.ok(at.some((t) => Math.abs(t - T.t) < 0.006), `${id}: it sounds as it leaves the key`);
    if (result !== 'miss') assert.ok(at.some((t) => Math.abs(t - T.hit) < 0.001), `${id}: it lands on the hit`);
    assert.ok(Math.max(...at) < T.hit + 1.5, `${id}: done in time`);
  }
});

test('with no effect to time it, only the contact and what follows play, from the beat', () => {
  for (const style of Object.keys(STYLES)) for (const key of KEYS) {
    const { ctx, sample } = fakeContext(), T = timingOf(2, null, { result: 'hit', power: 0.4 });
    playAbility(ctx, { dry: ctx.createGain(), room: ctx.createGain() }, style, key, T, sample);
    assert.ok(Math.min(...ctx.starts.map((s) => s.t)) >= 2 - 1e-6, `${style} ${key}`);
  }
});

test('the ability effects playtest offers today\'s sound and every style', () => {
  const src = fs.readFileSync('dist/abilityfx-playtest.mjs', 'utf8');
  assert.match(src, /seg\('Sound', \[\['off', 'off'\], \['today', 'today'\], \.\.\.Object\.entries\(STYLES\)/);
});

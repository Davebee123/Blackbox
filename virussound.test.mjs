// Virus attack sounds, the style round (dist/virussound.mjs): four attacks in each style, timed to their chips' strikes
// (dist/chipfx.mjs STRIKE_PLAN). Played against a stand-in AudioContext that records when each sound source starts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STYLES, ATTACKS, RESULTS, TRIM, attackTiming, playAttack, hasAttack } from './dist/virussound.mjs';
import { STRIKE_PLAN, STRIKES, CHIP_THEMES } from './dist/chipfx.mjs';
import { BANK } from './dist/sound.mjs';

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
  const asked = new Set(), sample = (name) => { asked.add(name); return buffer(1, 22050, 44100); };
  return { ctx, sample, asked };
}
const planOf = (key) => STRIKE_PLAN[ATTACKS[key].theme];
const play = (style, key, hit, drawn = true) => {
  const { ctx, sample, asked } = fakeContext(), T = attackTiming(1, planOf(key), hit, drawn);
  return { ok: playAttack(ctx, { dry: ctx.createGain(), room: ctx.createGain() }, style, key, T, sample), at: ctx.starts.map((s) => s.t), T, asked };
};

test('every style has a sound and levels for each of the round\'s attacks, on a part whose chip strikes', () => {
  for (const [key, a] of Object.entries(ATTACKS)) {
    assert.equal(CHIP_THEMES[a.part], a.theme, `${a.part} wears ${a.theme}`);
    assert.ok(STRIKES.has(a.theme) && STRIKE_PLAN[a.theme]?.impact > 0, `${a.theme} has a strike and its plan`);
    for (const style of Object.keys(STYLES)) {
      assert.ok(hasAttack(style, key), `${style} ${key}`);
      for (const k of ['level', 'crit', 'blocked', 'evaded']) assert.equal(typeof TRIM[style][key][k], 'number', `${style} ${key} ${k}`);
    }
  }
});

test('the timing follows the strike: the chip goes off, and it lands on your bar on the plan\'s impact', () => {
  const T = attackTiming(10, STRIKE_PLAN.clock, { result: 'crit', power: 0.4 });
  assert.equal(T.t, 10);
  assert.ok(Math.abs(T.wind[0] - 10.07) < 1e-9 && Math.abs(T.wind[1] - 10.33) < 1e-9 && Math.abs(T.hit - 10.45) < 1e-9 && Math.abs(T.stop - 10.7) < 1e-9);
  assert.ok(T.flies);
  const locks = attackTiming(0, STRIKE_PLAN.lock, {});
  assert.deepEqual([locks.n, locks.step], [7, 0.035]);
  // No strike drawn (Screen effects off, Motion off): it lands at once, and what follows the hit keeps its timing.
  const still = attackTiming(5, STRIKE_PLAN.zap, { result: 'hit' }, false);
  assert.deepEqual([still.hit, still.flies, still.again.length], [5, false, 0]);
  assert.equal(attackTiming(5, STRIKE_PLAN.lock, {}, false).n, 7);
});

test('each sound starts as its chip goes off and lands on the hit, and is done within a second and a half', () => {
  for (const style of Object.keys(STYLES)) for (const key of Object.keys(ATTACKS)) for (const result of RESULTS) {
    const { ok, at, T } = play(style, key, { result, power: 0.4 }), id = `${style} ${key} ${result}`;
    assert.ok(ok && at.length > 0, id);
    assert.ok(Math.min(...at) >= T.t - 1e-6, `${id}: nothing before the chip goes off`);
    assert.ok(at.some((t) => Math.abs(t - T.t) < 0.006), `${id}: it sounds as the chip goes off`);
    if (result !== 'evaded') assert.ok(at.some((t) => Math.abs(t - T.hit) < 0.001), `${id}: it lands on the hit`);
    assert.ok(Math.max(...at) < T.hit + 1.5, `${id}: done in time`);
  }
});

test('with no strike to time it, only the contact and what follows play, from the beat; an evaded one has nothing to play', () => {
  for (const style of Object.keys(STYLES)) for (const key of Object.keys(ATTACKS)) {
    const { ok, at, T } = play(style, key, { result: 'hit', power: 0.4 }, false);
    assert.ok(ok && Math.min(...at) >= T.t - 1e-6 && at.some((t) => Math.abs(t - T.t) < 0.001), `${style} ${key}`);
    assert.equal(play(style, key, { result: 'evaded' }, false).ok, false, `${style} ${key} evaded`);
  }
});

test('a crit plays more than a small hit, an evaded one less; a blocked one carries no weight; every sample asked for ships', () => {
  for (const style of Object.keys(STYLES)) for (const key of Object.keys(ATTACKS)) {
    const n = (hit) => play(style, key, hit).at.length, id = `${style} ${key}`;
    assert.ok(n({ result: 'crit', power: 0.6 }) > n({ result: 'hit', power: 0.1 }), `${id}: a crit over a small hit`);
    assert.ok(n({ result: 'evaded' }) < n({ result: 'hit', power: 0.4 }), `${id}: less when it misses`);
    for (const name of ['subdrop', 'soft-h', 'punch-h', 'punch-m', 'plate-l']) assert.ok(!play(style, key, { result: 'blocked', power: 0.9 }).asked.has(name), `${id}: blocked, no ${name}`);
    for (const result of RESULTS) for (const name of play(style, key, { result, power: 0.9 }).asked) assert.ok(BANK[name], `${id}: ${name} is in the bank`);
  }
});

test('nothing in a fight plays them yet: only the effects playtest and the sound system load the module', () => {
  const src = fs.readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.equal(src.match(/feel\.attack\w*\(/g)?.length, 1, 'one call: the playtest\'s preview');
  assert.match(src, /attack: \(key, id, \{ result, power, sound = 'off' \}\) => \{[^]*?feel\.attackPreview\(/);
});

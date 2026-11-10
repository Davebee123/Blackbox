// Ability sounds (dist/abilitysound.mjs): each class's key 1 in each style of the style round, and every ability in
// the picked one (dist/abilitysound-all.mjs), timed to its effect.
// Played against a stand-in AudioContext that records when each sound source starts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STYLES, KEYS, TRIM, PICKED, timingOf, playAbility, hasSound } from './dist/abilitysound.mjs';
import { SOUND_KEYS, SIGNATURES, TRAITS, TRAIT_NAMES, TIER_SOUNDS, FINISHER_KEYS, finisherKey, kindOf, massOf } from './dist/abilitysound-all.mjs';
import { LEVELS } from './dist/abilitysound-levels.mjs';
import { SPIKE, ABILITIES } from './dist/data.mjs';
import { RECIPES, TIERS, FINISHERS, SUB_FINISHERS } from './dist/abilityfx-table.mjs';

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

// ---------- round 2: every ability, in the picked style ----------
test('every ability in the effects table has a sound in the picked style, a kind and a level', () => {
  assert.ok(STYLES[PICKED]);
  assert.deepEqual(SOUND_KEYS, Object.keys(RECIPES).filter((k) => !k.includes(':')));
  for (const key of SOUND_KEYS) {
    assert.ok(hasSound(PICKED, key), key);
    assert.ok(['strike', 'sign', 'self', 'helper', 'ignite'].includes(kindOf(key)), `${key}: ${kindOf(key)}`);
    assert.ok(massOf(key) >= 0 && massOf(key) <= 1, key);
    const L = KEYS.includes(key) ? TRIM[PICKED][key] : LEVELS[key];
    for (const k of ['level', 'crit', 'chit', 'miss']) assert.equal(typeof L?.[k], 'number', `${key} ${k}`);
  }
  assert.equal(kindOf('patch'), 'self');
  assert.equal(kindOf('deploy'), 'helper');
  assert.equal(kindOf('inject'), 'ignite');
  assert.equal(kindOf('tag'), 'sign');
  assert.equal(kindOf('overload'), 'strike');
  assert.ok(massOf('zero-day') > massOf('spike'));
});

test('the signature abilities are the plan\'s twelve and the long-cooldown ones, each a real one', () => {
  for (const key of ['botnet', 'crack', 'deploy', 'detonate', 'failover', 'firewall', 'flood', 'inject', 'overload', 'purge', 'quarantine', 'shatter']) assert.ok(SIGNATURES.includes(key), key);
  for (const key of SIGNATURES) assert.ok(ABILITIES[key] && RECIPES[key], key);
  for (const key of ['zero-day', 'logic-bomb', 'kill-switch', 'takeover', 'outbreak', 'turbo-boost', 'vanish', 'circuit-breaker', 'opening', 'hot-standby']) assert.ok(SIGNATURES.includes(key), key);
});

test('a trait is a voice that exists, on an ability that exists', () => {
  for (const [key, list] of Object.entries(TRAITS)) {
    assert.ok(RECIPES[key] && (ABILITIES[key] || key === 'sigint'), key);
    assert.ok(list.length && list.every((t) => TRAIT_NAMES.includes(t)), `${key}: ${list}`);
  }
});

test('every ability\'s sound starts as it leaves the key, lands on the hit and is done in time', () => {
  for (const key of SOUND_KEYS) for (const result of RESULTS) {
    const { ctx, sample } = fakeContext(), T = timingOf(1, { travel: 180, hold: 0, impact: 180 + (RECIPES[key].land || 0), stop: 40 }, { result, power: 0.4 });
    assert.ok(playAbility(ctx, { dry: ctx.createGain(), room: ctx.createGain() }, PICKED, key, T, sample), `${key} ${result}`);
    const at = ctx.starts.map((s) => s.t), id = `${key} ${result}`;
    assert.ok(at.length > 0, id);
    assert.ok(Math.min(...at) >= T.t - 1e-6, `${id}: nothing before it leaves`);
    assert.ok(at.some((t) => Math.abs(t - T.t) < 0.006), `${id}: it sounds as it leaves the key`);
    if (result === 'hit' || result === 'crit') assert.ok(at.some((t) => Math.abs(t - T.hit) < 0.001), `${id}: it lands on the hit`);
    assert.ok(Math.max(...at) < T.hit + 1.5, `${id}: done in time`);
  }
});

test('a miss with nothing flying leaves the result its own voice', () => {
  for (const key of ['bash', 'overload', 'tag']) {
    const { ctx, sample } = fakeContext();
    assert.equal(playAbility(ctx, { dry: ctx.createGain(), room: ctx.createGain() }, PICKED, key, timingOf(1, null, { result: 'miss' }), sample), false, key);
  }
});

// ---------- round 3: mastery tiers and break finishers ----------
test('a mastered ability plays its sound with more on top, and every hand-made tier has a layer of its own', () => {
  assert.deepEqual([...TIER_SOUNDS].sort(), Object.keys(TIERS).filter((k) => !k.includes(':')).sort());
  assert.equal(timingOf(0, null, {}).tier, 1);
  for (const key of SOUND_KEYS) {
    const n = [1, 2, 3].map((tier) => {
      const { ctx, sample } = fakeContext(), T = timingOf(1, PLAN, { result: 'hit', power: 0.4, tier });
      assert.ok(playAbility(ctx, { dry: ctx.createGain(), room: ctx.createGain() }, PICKED, key, T, sample), `${key} tier ${tier}`);
      const at = ctx.starts.map((s) => s.t);
      assert.ok(Math.min(...at) >= T.t - 1e-6 && Math.max(...at) < T.hit + 1.5, `${key} tier ${tier}: in time`);
      return at.length;
    });
    assert.ok(n[0] < n[1] && n[1] < n[2], `${key}: ${n}`);
  }
  // On a miss or on ◆ the tier adds nothing.
  for (const result of ['miss', 'chit']) {
    const n = [1, 3].map((tier) => { const { ctx, sample } = fakeContext(); playAbility(ctx, { dry: ctx.createGain(), room: ctx.createGain() }, PICKED, 'overload', timingOf(1, PLAN, { result, tier }), sample); return ctx.starts.length; });
    assert.equal(n[0], n[1], result);
  }
});

test('every break finisher has a sound and a level, starts with the break and is done within its 900 ms', () => {
  assert.equal(FINISHER_KEYS.length, Object.keys(FINISHERS).length + Object.keys(SUB_FINISHERS).length);
  assert.equal(finisherKey('bastion', 'warden'), 'fin~bastion~warden');
  assert.equal(finisherKey('bastion', 'phantom'), 'fin~bastion'); // another class's subclass changes nothing
  assert.equal(finisherKey('operator'), 'fin~operator');
  for (const key of FINISHER_KEYS) {
    const cls = key.split('~')[1];
    assert.ok(hasSound(PICKED, key), key);
    assert.equal(typeof LEVELS[key]?.level, 'number', key);
    const { ctx, sample } = fakeContext(), T = timingOf(1, { travel: 0, impact: FINISHERS[cls].land }, {});
    assert.ok(playAbility(ctx, { dry: ctx.createGain(), room: ctx.createGain() }, PICKED, key, T, sample), key);
    const at = ctx.starts.map((s) => s.t);
    assert.ok(Math.min(...at) >= T.t - 1e-6 && Math.min(...at) < T.t + 0.03, `${key}: it starts with the break`);
    assert.ok(Math.max(...at) < T.t + 0.9, `${key}: its last voice starts within the finisher (${Math.max(...at) - T.t})`);
  }
});

test('the playtest plays a finisher\'s sound over the break\'s, and a tier\'s with its effect', () => {
  const app = fs.readFileSync('dist/app.js', 'utf8');
  assert.match(app, /feel\.preview\('break'\); if \(sound !== 'today'\) feel\.abilityPreview\(sound, finisherKey\(cls, sub \|\| null\)/);
  assert.match(app, /feel\.abilityPreview\(sound, key, t, \{ result, power, tier: who \? 1 : tier \}\)/);
});

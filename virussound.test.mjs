// Virus attack sounds (dist/virussound.mjs): the style round's four attacks in each style and, in the pick, every chip
// theme's strike, the lash, Scramble, Replicate and Patch (dist/virussound-all.mjs), timed to their strikes
// (dist/chipfx.mjs STRIKE_PLAN). Played against a stand-in AudioContext that records when each sound source starts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STYLES, ATTACKS, STYLE_KEYS, OWN_PLAN, RESULTS, HEAVY, TRIM, PICKED, attackTiming, attackOf, playAttack, hasAttack } from './dist/virussound.mjs';
import { LEVELS, LAYERS } from './dist/virussound-levels.mjs';
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
const planOf = (key) => OWN_PLAN[key] || STRIKE_PLAN[ATTACKS[key].theme];
// Every sound to try: each style's four, and everything else in the pick; what isn't a hit on you lands one way.
const EVERY = [...Object.keys(STYLES).flatMap((style) => STYLE_KEYS.map((key) => [style, key])), ...Object.keys(ATTACKS).filter((k) => !STYLE_KEYS.includes(k)).map((key) => [PICKED, key])];
const resultsOf = (key) => (ATTACKS[key].does ? ['hit'] : RESULTS);
const play = (style, key, hit, drawn = true) => {
  const { ctx, sample, asked } = fakeContext(), T = attackTiming(1, planOf(key), hit, drawn);
  return { ok: playAttack(ctx, { dry: ctx.createGain(), room: ctx.createGain() }, style, key, T, sample), at: ctx.starts.map((s) => s.t), T, asked };
};

test('every style has a sound and levels for each of the round\'s attacks, on a part whose chip strikes', () => {
  for (const key of STYLE_KEYS) {
    const a = ATTACKS[key];
    assert.equal(CHIP_THEMES[a.part], a.theme, `${a.part} wears ${a.theme}`);
    assert.ok(STRIKES.has(a.theme) && STRIKE_PLAN[a.theme]?.impact > 0, `${a.theme} has a strike and its plan`);
    for (const style of Object.keys(STYLES)) {
      assert.ok(hasAttack(style, key), `${style} ${key}`);
      for (const k of ['level', 'crit', 'blocked', 'evaded']) assert.equal(typeof TRIM[style][key][k], 'number', `${style} ${key} ${k}`);
    }
  }
});

test('the pick has a sound and measured levels for every attack: each theme\'s strike, the lash, and what isn\'t a hit on you', () => {
  for (const th of STRIKES) {
    const key = attackOf(th), a = ATTACKS[key];
    assert.ok(a && a.theme === th && !a.does, `${th} has an attack of its own`);
    assert.ok(STRIKE_PLAN[th]?.impact > 0, `${th} has a plan`);
    if (a.part !== 'Fragment') assert.equal(CHIP_THEMES[a.part], th, `${a.part} wears ${th}`);
  }
  assert.equal(attackOf(null), 'lash');
  assert.equal(Object.keys(ATTACKS).length, STRIKES.size + 1 + 5);
  assert.deepEqual(Object.keys(ATTACKS).filter((k) => ATTACKS[k].does), ['blind', 'replicate', 'patch', 'cast', 'seal']);
  assert.deepEqual([ATTACKS.blind.theme, ATTACKS.replicate.theme], ['scramble', 'copy'], 'a Scramble and a Replicate ride their themes\' strikes');
  for (const [key, a] of Object.entries(ATTACKS)) {
    assert.ok(hasAttack(PICKED, key), key);
    assert.ok(planOf(key)?.impact > 0, `${key} has a plan`);
    for (const k of a.does ? ['level'] : ['level', 'crit', 'blocked', 'evaded']) assert.equal(typeof TRIM[PICKED][key][k], 'number', `${key} ${k}`);
    if (!STYLE_KEYS.includes(key)) { assert.ok(LEVELS[key], `${key} is measured`); for (const style of Object.keys(STYLES)) if (style !== PICKED) assert.ok(!hasAttack(style, key), `${style} has no ${key}`); }
  }
});

test('a strike\'s other marks: what it does before it lands follows the chip, what it leaves follows the hit', () => {
  const T = attackTiming(2, STRIKE_PLAN.ledger, {}), near = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(near(T.hit, 2.56) && near(T.pre.fly, 2.26) && near(T.pre.locks[3], 2.34) && near(T.post.roll[0], 2.6) && near(T.post.line[1], 2.98));
  // No strike drawn: it lands at once, what came before with it; what follows keeps its timing.
  const still = attackTiming(2, STRIKE_PLAN.ledger, {}, false);
  assert.ok(near(still.hit, 2) && near(still.pre.fly, 2) && near(still.post.line[1], 2.42) && !still.flies);
  assert.deepEqual(attackTiming(0, STRIKE_PLAN.zap, {}).pre, {});
});

test('the pick is one of the styles', () => { assert.equal(STYLES[PICKED], 'Corrupt, latch'); });

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
  for (const [style, key] of EVERY) for (const result of resultsOf(key)) {
    const { ok, at, T } = play(style, key, { result, power: 0.4 }), id = `${style} ${key} ${result}`;
    assert.ok(ok && at.length > 0, id);
    assert.ok(Math.min(...at) >= T.t - 1e-6, `${id}: nothing before the chip goes off`);
    assert.ok(at.some((t) => Math.abs(t - T.t) < 0.006), `${id}: it sounds as the chip goes off`);
    if (result !== 'evaded') assert.ok(at.some((t) => Math.abs(t - T.hit) < 0.001), `${id}: it lands on the hit`);
    assert.ok(Math.max(...at) < T.hit + 1.5, `${id}: done in time`);
  }
});

test('with no strike to time it, only the contact and what follows play, from the beat; an evaded one has nothing to play', () => {
  for (const [style, key] of EVERY) {
    const { ok, at, T } = play(style, key, { result: 'hit', power: 0.4 }, false);
    assert.ok(ok && Math.min(...at) >= T.t - 1e-6 && at.some((t) => Math.abs(t - T.t) < 0.001), `${style} ${key}`);
    assert.ok(at.length < play(style, key, { result: 'hit', power: 0.4 }).at.length, `${style} ${key}: less with nothing flying`);
    assert.equal(play(style, key, { result: 'evaded' }, false).ok, false, `${style} ${key} evaded`);
  }
});

test('a crit plays more than a small hit, an evaded one less; a blocked one carries no weight; every sample asked for ships', () => {
  for (const [style, key] of EVERY) {
    const id = `${style} ${key}`;
    for (const result of resultsOf(key)) for (const name of play(style, key, { result, power: 0.9 }).asked) assert.ok(BANK[name], `${id}: ${name} is in the bank`);
    if (ATTACKS[key].does) continue;
    const n = (hit) => play(style, key, hit).at.length;
    assert.ok(n({ result: 'crit', power: 0.6 }) > n({ result: 'hit', power: 0.1 }), `${id}: a crit over a small hit`);
    assert.ok(n({ result: 'evaded' }) < n({ result: 'hit', power: 0.4 }), `${id}: less when it misses`);
    for (const name of ['subdrop', 'soft-h', 'punch-h', 'punch-m', 'plate-l']) assert.ok(!play(style, key, { result: 'blocked', power: 0.9 }).asked.has(name), `${id}: blocked, no ${name}`);
  }
});

test('a charge and a boss\'s beat are the attack\'s own hit with a layer over it, in the pick only', () => {
  assert.deepEqual(Object.keys(HEAVY), ['charge', 'beat']);
  for (const h of Object.keys(HEAVY)) {
    assert.equal(typeof LAYERS[h], 'number', `${h} is measured`);
    const T = attackTiming(1, STRIKE_PLAN.heat, { result: h, power: 0.9 });
    assert.deepEqual([T.result, T.heavy], ['hit', h]);
    for (const key of Object.keys(ATTACKS).filter((k) => !ATTACKS[k].does)) for (const drawn of [true, false]) {
      const plain = play(PICKED, key, { result: 'hit', power: 0.9 }, drawn), heavy = play(PICKED, key, { result: h, power: 0.9 }, drawn), id = `${key} ${h}${drawn ? '' : ', not drawn'}`;
      assert.ok(heavy.ok && heavy.at.length >= plain.at.length + 4 - 2, `${id}: more than the hit`); // (a hit's own count wobbles by a slice or two)
      assert.ok(Math.min(...heavy.at) >= heavy.T.t - 1e-6 && Math.max(...heavy.at) < heavy.T.hit + 1.5, `${id}: in time`);
      for (const name of heavy.asked) assert.ok(BANK[name], `${id}: ${name} is in the bank`);
    }
  }
  assert.equal(attackTiming(1, STRIKE_PLAN.heat, { result: 'crit' }).heavy, null);
  // What isn't a hit on you has one form: no layer.
  assert.equal(play(PICKED, 'patch', { result: 'charge' }).at.length, play(PICKED, 'patch', { result: 'hit' }).at.length);
});

test('what isn\'t a hit on you carries no weight: no boom\'s sub-drop, no punch', () => {
  for (const key of Object.keys(ATTACKS).filter((k) => ATTACKS[k].does)) for (const name of ['subdrop', 'soft-h', 'punch-h', 'punch-m']) assert.ok(!play(PICKED, key, { power: 0.9 }).asked.has(name), `${key}: no ${name}`);
});

test('a fight plays the pick through one door (virusvoice.test.mjs): attackSound in a fight, the preview in the playtest', () => {
  const src = fs.readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.deepEqual(src.match(/feel\.attack\w*\(/g), ['feel.attack(', 'feel.attackPreview(']);
  assert.match(src, /attack: \(key, id, \{ result, power, sound = 'off' \}\) => \{[^]*?feel\.attackPreview\(/);
});

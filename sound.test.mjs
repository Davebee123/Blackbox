import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BANK, RECIPES, VOICES, outputOf } from './dist/sound.mjs';

test('every sample the sound bank lists ships in dist/sfx, and nothing extra', () => {
  const want = Object.entries(BANK).flatMap(([n, k]) => Array.from({ length: k }, (_, i) => `${n}-${i}.wav`)).sort();
  const have = fs.readdirSync('dist/sfx').filter((f) => f.endsWith('.wav')).sort();
  assert.deepEqual(have, want);
});

test('every voice the feedback layer uses has a sample recipe and a synth stand-in', () => {
  const src = fs.readFileSync('dist/feel.mjs', 'utf8');
  const voices = [...new Set([...src.matchAll(/voice: '([a-z]+)'/g)].map((m) => m[1]))];
  assert.ok(voices.length > 20);
  for (const v of voices) {
    assert.ok(RECIPES[v], `recipe for ${v}`);
    assert.ok(VOICES[v] || ['jackin', 'hangup'].includes(v), `synth stand-in for ${v}`);
  }
});

test('the samples are credited', () => {
  const credits = fs.readFileSync('dist/sfx/CREDITS.md', 'utf8');
  for (const n of Object.keys(BANK)) assert.match(credits, new RegExp(`\\b${n}\\b`), n);
});

// A stand-in AudioContext that records its delay lines and lets the test end every scheduled source.
function fakeCtx() {
  const delays = [], sources = [];
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = (extra = {}) => {
    const n = { out: new Set(), connect(m) { n.out.add(m); return m; }, disconnect() { n.out.clear(); }, gain: param(), frequency: param(), detune: param(), Q: param(), delayTime: param(), playbackRate: param(), offset: param(), ...extra };
    return n;
  };
  const source = () => { const s = node({ start() {}, stop() {} }); sources.push(s); return s; };
  const ctx = {
    sampleRate: 8000, currentTime: 0, destination: node(),
    createGain: () => node(), createBiquadFilter: () => node(), createWaveShaper: () => node(), createConvolver: () => node(),
    createDynamicsCompressor: () => node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
    createDelay: () => { const d = node(); delays.push(d); return d; },
    createOscillator: source, createBufferSource: source, createConstantSource: source,
    createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }),
  };
  return { ctx, delays, sources, endAll: () => sources.forEach((s) => s.onended?.()) };
}

test('every echo loop a voice builds is cut once its sound has ended', () => {
  const echoing = [...['hit', 'crit', 'break', 'chit', 'patch', 'interrupt'].map((n) => [n, RECIPES[n].play]), ...['good', 'unlock', 'pickup', 'win'].map((n) => [n, VOICES[n]])];
  for (const [name, play] of echoing) {
    const F = fakeCtx();
    play(F.ctx, F.ctx.destination, 0, { amount: 40 }, () => {});
    assert.ok(F.delays.length, `${name} has an echo`);
    assert.ok(F.delays.every((d) => d.out.size), `${name} rings while it plays`);
    F.endAll();
    assert.ok(F.delays.every((d) => !d.out.size), `${name}: its feedback loop is disconnected afterwards`);
  }
});

test('the music, place beds and effects all reach the speakers through one limiter', () => {
  const F = fakeCtx();
  const out = outputOf(F.ctx);
  assert.equal(outputOf(F.ctx), out, 'one per context');
  assert.notEqual(out, F.ctx.destination);
  for (const f of ['dist/sound.mjs', 'dist/soundtrack.mjs', 'dist/places.mjs']) {
    const uses = fs.readFileSync(f, 'utf8').match(/\.connect\(ctx\.destination\)/g) || [];
    assert.equal(uses.length, f === 'dist/sound.mjs' ? 1 : 0, `${f} connects straight to the speakers only inside outputOf`);
  }
});

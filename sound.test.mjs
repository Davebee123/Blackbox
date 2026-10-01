import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BANK, RECIPES, VOICES } from './dist/sound.mjs';

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

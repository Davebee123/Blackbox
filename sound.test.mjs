import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BANK, CLIPS, RECIPES, VOICES } from './dist/sound.mjs';

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

test('the victory clips ship, are credited, and play for a fight, a boss and a takeover; a level keeps its own sound', () => {
  for (const [name, file] of Object.entries(CLIPS)) { assert.ok(fs.existsSync(`dist/sfx/${file}`), file); assert.match(fs.readFileSync('dist/sfx/CREDITS.md', 'utf8'), new RegExp(name), name); }
  const src = fs.readFileSync('dist/sound.mjs', 'utf8');
  assert.match(src, /win: \{ room: 0, play\(ctx, out, t, o, S, C\) \{ if \(!C\('win-power-cut'\)\)/);
  assert.match(src, /bosswin: \{ room: 0, play\(ctx, out, t, o, S, C\) \{ if \(!C\('win-blackout'\)\)/);
  const app = fs.readFileSync('dist/app.js', 'utf8');
  assert.match(app, /feel\.add\(campaign\.encounter\?\.virus\?\.boss \? 'bosswin' : 'win', '\.hud'\)/);
  assert.match(app, /case 'takeover': flash\('TAKEN OVER'\); feel\.add\('bosswin', null\)/);
  assert.match(fs.readFileSync('dist/levelup-ui.mjs', 'utf8'), /feel\.add\('levelup', null\)/);
});

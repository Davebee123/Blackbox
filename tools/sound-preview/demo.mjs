// Mixes an 8-second demo for each body set that render.mjs rendered (an <x>-idle, <x>-attack and <x>-break): the
// idle loop under a floor bed, the attack at 2 s and 5 s and the break at 6.5 s, at the game's levels and ducking
// (dist/places.mjs LEVEL and DUCK), then raised as a whole by GAIN dB into a limiter at -1.5 dBFS, as MP3.
//   node tools/sound-preview/demo.mjs <results.json from render.mjs> <outDir>   (FLOOR=floors/<file>.ogg picks the bed)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LEVEL, DUCK, LOOP_PAD } from '../../dist/places.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [resultsPath, outDir] = process.argv.slice(2);
const FLOOR = process.env.FLOOR || 'floors/floor-1-sprawl-r2-a.ogg';
const GAIN = Number(process.env.GAIN ?? 6); // dB on the whole mix: brings the one-shots back to about -16 LUFS
const SR = 44100, LEN = 8, N = LEN * SR, AT = { attack: [2, 5], break: [6.5] };
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const readRaw = (f) => { const b = fs.readFileSync(f); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bbdemo-'));
const bedRaw = path.join(tmp, 'bed.f32');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(LOOP_PAD), '-t', String(LEN), '-i', path.join(ROOT, 'dist/sfx', FLOOR), '-f', 'f32le', '-ac', '2', '-ar', String(SR), bedRaw]);
const bed = readRaw(bedRaw);
// A duck: down to `to` in 30 ms at each one-shot, back to 1 over DUCK.back (the deepest of overlapping ducks wins).
const shots = [...AT.attack, ...AT.break];
const duck = (i, to) => { const t = i / SR; let k = 1; for (const s of shots) { const x = t - s; if (x < 0) continue; const v = x < 0.03 ? 1 - (1 - to) * (x / 0.03) : x < 0.03 + DUCK.back ? to + (1 - to) * ((x - 0.03) / DUCK.back) : 1; k = Math.min(k, v); } return k; };

fs.mkdirSync(outDir, { recursive: true });
for (const idle of results.filter((r) => r.id.endsWith('-idle'))) {
  const base = idle.id.slice(0, -5), get = (k) => results.find((r) => r.id === `${base}-${k}`);
  if (!get('attack') || !get('break')) continue;
  const loop = readRaw(idle.raw), n = loop.length / 2, mix = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const j = i % n, db = duck(i, DUCK.bed), df = duck(i, DUCK.family);
    for (let c = 0; c < 2; c++) mix[i * 2 + c] = (bed[i * 2 + c] || 0) * LEVEL.floor * db + loop[j * 2 + c] * LEVEL.family * df;
  }
  for (const kind of ['attack', 'break']) {
    const s = readRaw(get(kind).raw);
    for (const t of AT[kind]) { const o = Math.round(t * SR) * 2; for (let i = 0; i < s.length && o + i < mix.length; i++) mix[o + i] += s[i] * LEVEL.shot; }
  }
  const raw = path.join(tmp, `${base}.f32`); fs.writeFileSync(raw, Buffer.from(mix.buffer));
  const mp3 = path.join(outDir, `demo-${base}.mp3`);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-i', raw, '-af', `volume=${GAIN}dB,alimiter=limit=0.841:attack=1:release=40:level=disabled`, '-c:a', 'libmp3lame', '-q:a', '4', mp3]);
  console.log(mp3);
}
fs.rmSync(tmp, { recursive: true, force: true });

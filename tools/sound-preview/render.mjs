// Renders the BLACKBOX sound preview pack (see clips.js) to MP3s, loudness-matched.
//   node tools/sound-preview/render.mjs [outDir] [clipId...]
//   SET=2 node tools/sound-preview/render.mjs /home/user/Blackbox/sound-preview/round2   (round 2)
//   SET=3 node tools/sound-preview/render.mjs <outDir>   (round 3: the bodies without a set; demo.mjs mixes their demos)
//   SET=4 node tools/sound-preview/render.mjs <outDir>   (round 4: a step between rooms, clips4.js)
// FORMAT=ogg encodes Ogg Vorbis instead, for the game (dist/sfx): the chosen clips, rendered again
// with the same levels. A loop's sample count is kept exactly, so it repeats without a gap.
//   FORMAT=ogg node tools/sound-preview/render.mjs dist/sfx floor-4-coldline-b hub-halcyon ...
//   FORMAT=ogg SET=2 node tools/sound-preview/render.mjs dist/sfx floor-1-sprawl-r2-a ...
// Serves the repo over localhost, renders each clip in headless Chromium (OfflineAudioContext),
// then measures loudness with ffmpeg (EBU R128) and encodes MP3.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.argv[2] || '/home/user/Blackbox/sound-preview');
const ONLY = process.argv.slice(3);
const TARGET = { loop: -23, shot: -16 }; // LUFS: integrated for loops, momentary max for one-shots
// Peak ceiling, dBFS: half a dB under -1, since the limiter holds sample peaks and the encoder's true peaks
// land a little higher.
const CEIL = -1.5;
const QUIET = { 'floor-6-kernel-space-a': -31, 'floor-6-kernel-space-b': -28 }; // near-silence on purpose
const FORMAT = process.env.FORMAT === 'ogg' ? 'ogg' : 'mp3';
// Vorbis quality: loops sit far under the music, so they can go lean; one-shots get a little more.
const OGG_Q = { loop: '0', shot: '3' };
// An Ogg loop carries LOOP_PAD seconds of wrap-around on each side: the loop's own tail before its start,
// its head after its end. The encoder smears a file's first and last few milliseconds, so the game loops
// between the pads (dist/places.mjs LOOP_PAD) and never plays a smeared edge.
const LOOP_PAD = 0.05;
function padLoop(wavBuf) { // 32-bit float stereo WAV, 44-byte header (runner.js)
  const data = wavBuf.subarray(44), pad = Math.round(LOOP_PAD * 44100) * 8;
  const body = Buffer.concat([data.subarray(data.length - pad), data, data.subarray(0, pad)]);
  const head = Buffer.from(wavBuf.subarray(0, 44)); head.writeUInt32LE(36 + body.length, 4); head.writeUInt32LE(body.length, 40);
  return Buffer.concat([head, body]);
}
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.html': 'text/html' };

const server = http.createServer((req, res) => {
  if (req.url === '/__index') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>render</title>'); return; }
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page:', e.message));
await page.goto(`${base}/__index`);
await page.evaluate(async (b) => { window.R = await import(`${b}/tools/sound-preview/runner.js`); }, base);

const SET = Number(process.env.SET || 1); // 1: the first pack, 2: round 2 (into <outDir>, e.g. sound-preview/round2), 3: round 3, 4: round 4
const clips = (await page.evaluate((set) => window.R.list(set), SET)).filter((c) => !ONLY.length || ONLY.includes(c.id));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bbsp-'));
const results = [];
for (const c of clips) {
  const t0 = Date.now();
  const { wav, used } = await page.evaluate((id) => window.R.render(id), c.id);
  const w = path.join(tmp, `${c.id}.wav`); fs.writeFileSync(w, Buffer.from(wav, 'base64'));
  const res = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${w}" -af apad=pad_dur=0.5,ebur128=peak=true -f null - 2>&1`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const sum = res.slice(res.lastIndexOf('Summary:'));
  const TP = parseFloat(/Peak:\s+(-?[\d.]+) dBFS/.exec(sum)?.[1]);
  // Loops: integrated loudness. One-shots: the loudest 400 ms (momentary max), since integrated
  // loudness gates most of a short sound away.
  const I = c.shot ? Math.max(...[...res.matchAll(/ M:\s*(-?[\d.]+)/g)].map((m) => parseFloat(m[1]))) : parseFloat(/I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1]);
  const target = QUIET[c.id] ?? (c.shot ? TARGET.shot : TARGET.loop);
  // Gain to the target, but never more than 4 dB into a brickwall limiter at CEIL.
  const gain = Math.min(target - I, CEIL - TP + (c.shot ? 4 : 0));
  const limit = gain > CEIL - TP;
  const dir = path.join(OUT, c.group); fs.mkdirSync(dir, { recursive: true });
  const mp3 = path.join(dir, `${c.id}.${FORMAT}`);
  if (FORMAT === 'ogg' && !c.shot) fs.writeFileSync(w, padLoop(fs.readFileSync(w)));
  const codec = FORMAT === 'ogg' ? ['-c:a', 'libvorbis', '-q:a', OGG_Q[c.shot ? 'shot' : 'loop']] : ['-c:a', 'libmp3lame', '-q:a', '4'];
  const af = `volume=${gain.toFixed(2)}dB${limit ? `,alimiter=limit=${(10 ** (CEIL / 20)).toFixed(3)}:attack=1:release=40:level=disabled` : ''}`;
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', w, '-af', af, ...codec, mp3]);
  // The levelled clip as raw 32-bit float stereo too, for demo.mjs to mix and for checking a loop's seam.
  const raw = path.join(tmp, `${c.id}.f32`);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', w, '-af', af, '-f', 'f32le', '-ac', '2', '-ar', '44100', raw]);
  const kb = Math.round(fs.statSync(mp3).size / 1024);
  results.push({ ...c, used, I, TP, gain, kb, target, file: mp3, raw });
  console.log(`${c.group}/${c.id}.${FORMAT}  ${kb} KB  measured ${I} LUFS / ${TP} dBTP  -> ${gain.toFixed(1)} dB (target ${target}${gain < target - I - 0.05 ? ', peak-capped' : ''}${limit ? ', limited' : ''})  ${((Date.now() - t0) / 1000).toFixed(1)}s  [${used.join(' ')}]`);
}
fs.writeFileSync(path.join(tmp, 'results.json'), JSON.stringify(results, null, 1));
console.log('results:', path.join(tmp, 'results.json'));
await browser.close(); server.close();

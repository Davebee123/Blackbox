// Runs in the page: renders one clip by id and hands back a 32-bit float stereo WAV (base64).
import { SR, seed, kit, loadSamples, USED } from './lib.js';
import { GROUPS } from './clips.js';
import { GROUPS2 } from './clips2.js';
import { GROUPS3 } from './clips3.js';
import { renderBoard } from '/dist/sound.mjs';
import * as soundtrack from '/dist/soundtrack.mjs';

const ALL = [[1, GROUPS], [2, GROUPS2], [3, GROUPS3]].flatMap(([set, G]) => Object.entries(G).flatMap(([g, l]) => l.map((c) => ({ ...c, group: g, set }))));
// Offline rendering must not have nodes torn down by the live-game cleanup timers.
window.setTimeout = () => 0;

function wav(L, R) {
  const n = L.length, dv = new DataView(new ArrayBuffer(44 + n * 8));
  const s = (o, t) => [...t].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  s(0, 'RIFF'); dv.setUint32(4, 36 + n * 8, true); s(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 3, true); dv.setUint16(22, 2, true);
  dv.setUint32(24, SR, true); dv.setUint32(28, SR * 8, true); dv.setUint16(32, 8, true); dv.setUint16(34, 32, true); s(36, 'data'); dv.setUint32(40, n * 8, true);
  for (let i = 0; i < n; i++) { dv.setFloat32(44 + i * 8, L[i], true); dv.setFloat32(48 + i * 8, R[i], true); }
  const u = new Uint8Array(dv.buffer); let bin = ''; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(bin);
}
// Trim a one-shot's silent tail and fade its last few ms.
function trimShot(L, R, cap) {
  let peak = 0; for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const floor = peak * 0.003; let n = Math.min(L.length, Math.floor(cap * SR));
  while (n > 1 && Math.abs(L[n - 1]) < floor && Math.abs(R[n - 1]) < floor) n--;
  n = Math.min(Math.floor(cap * SR), n + Math.floor(0.03 * SR));
  L = L.slice(0, n); R = R.slice(0, n); const f = Math.floor(0.03 * SR);
  for (let i = 0; i < f; i++) { const k = i / f; L[n - 1 - i] *= k; R[n - 1 - i] *= k; }
  return [L, R];
}

export const list = (set = 1) => ALL.filter((c) => c.set === set).map(({ id, group, desc, shot, board, len }) => ({ id, group, desc, shot: !!(shot || board), board: board || null, len: len || null }));
let loaded = null;
export async function render(id) {
  loaded ||= loadSamples();
  await loaded;
  const c = ALL.find((x) => x.id === id);
  seed([...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7));
  USED.clear();
  if (c.board) {
    const bytes = await renderBoard([c.board], 1.3, { base: new URL('/dist/sfx/', location.href) });
    const buf = await new OfflineAudioContext(1, 1, SR).decodeAudioData(bytes.buffer);
    const d = buf.getChannelData(0).slice(Math.floor(0.29 * SR));
    const [L, R] = trimShot(d, d.slice(), 1.5);
    return { wav: wav(L, R), used: ['(game recipe)'] };
  }
  const P = c.shot ? 0 : (c.pre ?? (c.group === 'families' ? 6 : 2)), X = c.shot ? 0 : (c.xfade ?? 2), T = c.shot ? c.len + 1.5 : P + c.len + X + 0.05;
  const ctx = new OfflineAudioContext(2, Math.ceil(T * SR), SR);
  const K = kit(ctx);
  const master = ctx.createGain(); master.connect(ctx.destination); K.out = master;
  await c.build(K, soundtrack);
  const out = await ctx.startRendering();
  let L = out.getChannelData(0), R = out.getChannelData(1);
  if (c.shot) [L, R] = trimShot(L, R, c.set >= 2 ? c.len : c.group === 'tells' ? 1.5 : c.len + 0.6);
  else {
    // fold the tail over the head: equal-power crossfade, so the end runs straight into the start
    const p = Math.floor(P * SR), n = Math.floor(c.len * SR), x = Math.floor(X * SR);
    const fold = (a) => { const o = a.slice(p, p + n); for (let i = 0; i < x; i++) { const w = (i / x) * Math.PI / 2; o[i] = a[p + i] * Math.sin(w) + a[p + n + i] * Math.cos(w); } return o; };
    L = fold(L); R = fold(R);
  }
  return { wav: wav(L, R), used: [...USED] };
}

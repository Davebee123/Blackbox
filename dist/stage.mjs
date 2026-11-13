// The stage (docs/ui.md "The stage"): each floor's place, drawn in characters behind the virus inside its own picture
// (#virus-canvas, virus-art.mjs), in the floor's structure colour. The place acts on the virus: its light shades it
// (brightness only, never a new colour), a camera frames it, it enters its own way, and a broken part's bits follow
// the floor's physics. The board, the chips and every telegraph stay as they are on every floor.
//   floor      the fight's floor (screenfx floorOf: a fight on a server's floor; null at home, with Floor colour or
//              Screen effects off), read every frame.
//   back       the scene, under the virus (its still part cached once per size and floor).
//   light      the scene's light on the virus: (lum, normal) -> lum.
//   cam        { pitch, dist, zoom, dx, dy }: the floor's camera; dx/dy carry its entrance.
//   reveal     how the virus enters: per character -> null (hidden) | { ch, a, color }.
//   post       after the virus: its reflection, where the floor has water.
//   bit        a broken part's dissolving bit: true when the floor moved and drew it.
// Motion off: the scene stands still, no entrance, steady light. Reads state; never changes it.

import { hourOf, weatherAt } from './window.mjs';

const ease = (u) => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3;
const nrm = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
const dot = (L, nx, ny, nz) => Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
const hashOf = (n) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1;
function rng(seed) { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------- the places ----------
// Each: still(put, C, R) once, live(put, C, R, t) every frame, in cells of the virus's own grid. put(x, y, ch, a).
// light(t, sx, W): { L, k, base } (the scene's light: its direction, strength now, and how much of the default stays).
// cam, enter (ms), reveal(u, c, ch, H, t), ground (where bits land, share of height), mirror (a reflection).
const SIGN_ON = (t) => Math.sin(t * 0.9) > -0.92 || Math.floor(t * 20) % 2 === 0; // the Sprawl's sign, now and then flickering
const BEAM = (t) => t * 0.45 + 2.2; // Coldline's lighthouse, turning
const TRAIN = (t) => ((t % 16) - 3) / 7; // Backhaul's train: -1 entering left .. 1 gone right, every 16 s
export const PLACES = {
  1: { tag: 'sprawl', sky: 0.56, // The Sprawl: a street at night. Towers at the edges, one vertical sign, kerbs to a vanishing point, a wet road.
    name: 'a street at night',
    still(put, C, R) {
      const r = rng(11), hr = Math.round(R * 0.56);
      for (const [x0, x1, top] of [[0, 7, 3], [8, 13, 7], [C - 7, C, 2], [C - 13, C - 8, 6]]) for (let y = top; y < hr; y++) for (let x = x0; x <= x1; x++) {
        if (x === x0 || x === x1) put(x, y, '|', 0.1); else if (y === top) put(x, y, '_', 0.1);
        else if ((x - x0) % 2 === 0 && (y - top) % 2 === 1) { const lit = r() < 0.18; put(x, y, lit ? '▪' : '.', lit ? 0.32 : 0.1); }
      }
      const vx = C / 2;
      for (let x = 0; x < C; x++) put(x, hr, '_', 0.16);
      for (let y = hr + 1; y < R; y++) {
        const k = (y - hr) / (R - hr);
        put(Math.round(vx - k * C * 0.62), y, '/', 0.28); put(Math.round(vx + k * C * 0.62), y, '\\', 0.28);
        for (let x = 0; x < C; x++) if ((x * 13 + y * 7) % 23 === 0 && Math.abs(x - vx) > k * C * 0.62) put(x, y, '.', 0.08 + k * 0.1);
      }
    },
    live(put, C, R, t) {
      const on = SIGN_ON(t), hr = Math.round(R * 0.56);
      [...'HOTEL'].forEach((ch, i) => put(5, 5 + i, ch, on ? 0.6 : 0.2, true));
      for (let y = hr + 1; y < R; y++) put(5 + ((y * 7) % 3) - 1, y, '¦', (on ? 1 : 0.4) * (0.1 * (1 - (y - hr) / (R - hr)) + 0.04));
    },
    light: (t) => ({ L: nrm([-1, -0.15, 0.45]), k: SIGN_ON(t) ? 1.05 : 0.08, base: 0.58 }),
    cam: { pitch: 0.2 },
    enter: 1400,
    reveal(u) { const on = [[0.05, 0.09], [0.2, 0.24], [0.29, 0.32], [0.44, 0.6], [0.7, 9]].some(([a, b]) => u >= a && u < b); return on ? { a: u < 0.7 ? 0.6 : 1 } : null; },
    ground: 0.86,
    mirror: { a: 0.1, wave: 1, squash: 0.5 },
  },
  2: { tag: 'backhaul', sky: 0.55, // Backhaul: the rail yards. Rails to the horizon, a signal gantry, a floodlight mast, a slow train behind.
    name: 'the rail yards',
    still(put, C, R) {
      const hr = Math.round(R * 0.55), vx = C / 2;
      for (let x = 0; x < C; x++) put(x, hr, '_', 0.14);
      for (let y = hr + 1; y < R; y++) {
        const k = (y - hr) / (R - hr);
        for (const off of [-0.5, -0.32, 0.32, 0.5]) put(Math.round(vx + off * k * C), y, off < 0 ? '/' : '\\', 0.24);
        if (Math.round(k * k * 40) % 3 === 0) for (const [a, b] of [[-0.5, -0.32], [0.32, 0.5]]) for (let x = Math.round(vx + a * k * C) + 1; x < Math.round(vx + b * k * C); x++) put(x, y, '=', 0.12);
      }
      for (let y = Math.round(R * 0.12); y < hr; y++) put(6, y, '│', 0.16);
      for (let x = 6; x <= 15; x++) put(x, Math.round(R * 0.12), '─', 0.16);
      for (let y = Math.round(R * 0.05); y < hr; y++) put(C - 6, y, '│', 0.14);
      put(C - 7, Math.round(R * 0.05), '▀', 0.3); put(C - 6, Math.round(R * 0.05), '▀', 0.3); put(C - 5, Math.round(R * 0.05), '▀', 0.3);
      for (let d = 1; d < 6; d++) for (let w = -d; w <= d; w += 2) put(C - 6 + w, Math.round(R * 0.05) + d, '.', 0.07);
    },
    live(put, C, R, t) {
      const hr = Math.round(R * 0.55);
      [9, 13].forEach((x, i) => put(x, Math.round(R * 0.12) + 1, 'o', (Math.floor(t * 0.7) + i) % 2 ? 0.55 : 0.12, true));
      const at = TRAIN(t);
      if (at > -1.2 && at < 1.2) {
        const head = Math.round((at + 1) / 2 * (C + 34)) - 4;
        for (let x = head - 30; x <= head; x++) {
          if (x < 0 || x >= C) continue;
          put(x, hr - 1, (x - head) % 8 === 0 ? ' ' : '▄', 0.18);
          if ((x - head) % 8 !== 0 && (x - head) % 2 === 0) put(x, hr - 2, '▪', 0.3);
        }
      }
    },
    light: (t) => { const at = TRAIN(t); return { L: nrm([at > 0 ? 0.6 : -0.6, -0.1, 0.7]), k: Math.max(0, 1 - Math.abs(at) * 1.6) * 0.9, base: 0.66 }; },
    cam: { pitch: 0.12 },
    enter: 1600,
    camAt: (u) => ({ dx: -0.75 * (1 - ease(u)) }), // it rolls in along the rails
    reveal: () => ({}),
    ground: 0.86,
  },
  3: { tag: 'stacks', // The Stacks: an aisle between server towers. Racks either side, their status lights, cable trays overhead.
    name: 'an aisle of server racks',
    still(put, C, R) {
      for (let x = 0; x < C; x++) put(x, 1, '─', 0.12);
      for (const [x0, x1] of [[0, 9], [C - 10, C - 1]]) for (let y = 3; y < R - 2; y++) {
        put(x0, y, '│', 0.12); put(x1, y, '│', 0.12);
        if (y % 2) for (let x = x0 + 1; x < x1; x++) put(x, y, '═', 0.08);
      }
      const hr = Math.round(R * 0.6), vx = C / 2;
      for (let y = hr; y < R; y++) { const k = (y - hr) / (R - hr); put(Math.round(vx - (0.12 + k * 0.28) * C), y, '/', 0.2); put(Math.round(vx + (0.12 + k * 0.28) * C), y, '\\', 0.2); }
    },
    live(put, C, R, t) {
      for (const [x0, x1] of [[1, 8], [C - 9, C - 2]]) for (let y = 4; y < R - 2; y += 2) for (let x = x0 + 1; x < x1; x += 3) {
        const h = hashOf(x * 31 + y * 7), on = Math.sin(t * (1 + h * 3) + h * 20) > 0.2;
        if (h > 0.35) put(x, y, '▪', on ? 0.45 : 0.1, on);
      }
    },
    light: (t) => ({ L: nrm([0.8, -0.3, -0.2]), k: 0.45 + 0.08 * Math.sin(t * 7) * Math.sin(t * 2.3), base: 0.7 }),
    cam: { pitch: 0.34 },
    enter: 1200,
    reveal(u, c, ch, H) { const front = ease(u) * H * 1.1; return c.y > front ? null : c.y > front - H * 0.05 ? { ch: '▒', a: 0.8 } : {}; }, // scanned in, top down
    ground: 0.86,
  },
  4: { tag: 'coldline', sky: 0.52, // Coldline: the harbour. Cranes and containers on the far shore, a lighthouse turning, black water.
    name: 'the harbour',
    still(put, C, R) {
      const hr = Math.round(R * 0.52);
      for (let x = 0; x < C * 0.42; x++) { put(x, hr - 1, x % 4 === 3 ? ' ' : '▄', 0.16); if (x % 9 < 5) put(x, hr - 2, '▄', 0.11); }
      for (const [a, h] of [[4, 10], [16, 8]]) {
        for (let y = hr - h; y < hr - 1; y++) { put(a, y, '│', 0.2); put(a + 4, y, '│', 0.2); }
        for (let x = a - 3; x <= a + 13; x++) put(x, hr - h, '─', 0.2);
        for (let y = hr - h + 1; y < hr - h + 4; y++) put(a + 9, y, '¦', 0.14);
      }
      for (let y = hr - 5; y < hr; y++) put(C - 7, y, '█', 0.16);
      for (let x = 0; x < C; x++) put(x, hr, '─', 0.22);
    },
    live(put, C, R, t) {
      const hr = Math.round(R * 0.52), ly = hr - 6, lx = C - 7, ph = BEAM(t), dir = Math.cos(ph), toward = Math.max(0, Math.sin(ph));
      put(lx, ly, '*', 0.4 + toward ** 4 * 0.6, true);
      const len = Math.round(Math.abs(dir) * 40), sgn = Math.sign(dir) || 1;
      for (let d = 2; d < len; d++) { const fade = 1 - d / (len + 1), spread = Math.floor(d / 14); for (let w = -spread; w <= spread; w++) put(lx + sgn * d, ly + w, d % 2 ? '-' : '=', 0.2 * fade * (w ? 0.5 : 1)); }
      for (let y = hr + 1; y < R; y++) {
        const k = (y - hr) / (R - hr), sh = t * (0.6 + k * 1.6);
        for (let x = 0; x < C; x++) { const w = Math.sin(x * (0.35 - k * 0.2) + sh + y * 1.7) + Math.sin(x * 0.11 - sh * 0.7 + y); if (w > 1.25 - k * 0.6) put(x, y, w > 1.6 ? '~' : '-', 0.07 + k * 0.13); }
      }
    },
    light: (t) => ({ L: nrm([1, -0.1, -0.15]), k: Math.max(0, -Math.cos(BEAM(t))) ** 6 * 1.1, base: 0.62 }),
    cam: { pitch: 0, zoom: 0.95, dy: 0.07 },
    enter: 2100,
    camAt: (u) => ({ dy: 0.07 + 0.55 * (1 - ease(u)) }), // it surfaces
    waterline: 0.84,
    reveal(u, c, ch, H, t) {
      if (c.y > H * 0.84 + 2) return null; // under the water
      if (u < 1.15 && c.y > H * 0.79) return { ch: (c.i + Math.floor(t * 11)) % 3 ? '~' : ':', a: 0.75 }; // water running off it
      return {};
    },
    ground: 0.84,
    mirror: { a: 0.3, wave: 3.5, squash: 0.6, at: 0.84 },
    bits: 'freeze',
  },
  5: { tag: 'deepcore', // Deep Core: the furnace floor. A grating over the heat, pipes up the sides, heat rising.
    name: 'the furnace floor',
    still(put, C, R) {
      const fl = Math.round(R * 0.78);
      for (let y = fl; y < R; y++) for (let x = 0; x < C; x++) if ((x + (y % 2) * 2) % 4 === 0) put(x, y, '+', 0.06 + (y - fl) / (R - fl) * 0.1);
      for (const x of [2, 4, C - 3, C - 5]) for (let y = 0; y < fl; y++) put(x, y, y % 9 === 4 ? '╬' : '║', 0.12);
    },
    live(put, C, R, t) {
      const fl = Math.round(R * 0.78);
      for (let x = 0; x < C; x++) put(x, fl - 1, '▁', 0.18 + 0.1 * Math.sin(t * 3 + x * 0.4));
      for (const x0 of [9, 20, C - 20, C - 9]) for (let k = 0; k < 5; k++) { const y = fl - 2 - ((t * 3 + k * 3 + x0) % 15); if (y >= 0) put(x0 + Math.round(Math.sin(t * 2 + k + y) * 1.2), y, '~', Math.max(0, 0.12 * (1 - (fl - y) / 16))); }
    },
    light: (t) => ({ L: nrm([0, 1, -0.3]), k: 0.55 + 0.18 * Math.sin(t * 1.1), base: 0.55 }),
    cam: { pitch: 0.15, zoom: 1.05 },
    enter: 1600,
    reveal(u, c, ch, H, t) { if (u >= 1) return {}; const h = hashOf(c.i * 7 + Math.floor(t * 12)); return h > u * 1.2 ? null : u < 0.6 && h > u ? { ch: '~', a: 0.5 } : { a: Math.min(1, u * 1.5) }; }, // out of the heat
    ground: 0.78,
  },
  6: { tag: 'kernel', // Kernel Space: nothing but the plane. A dot grid running to the horizon, flat light, almost no perspective.
    name: 'the bare plane',
    still(put, C, R) {
      const hr = Math.round(R * 0.5), vx = C / 2;
      for (let y = hr; y < R; y++) { const k = (y - hr + 1) / (R - hr), step = Math.max(1, Math.round(6 * k)); if ((y - hr) % Math.max(1, Math.round(3 * k)) === 0) for (let x = 0; x < C; x++) if (Math.round(x - vx) % step === 0) put(x, y, '.', 0.08 + k * 0.14); }
    },
    live(put, C, R, t) { put(C - 3, R - 2, '_', Math.floor(t * 1.6) % 2 ? 0.5 : 0, true); },
    light: () => ({ L: [0, 0, -1], k: 0.35, base: 0.45 }),
    cam: { pitch: 0.25, dist: 2400 },
    enter: 1400,
    reveal(u, c) { return hashOf(c.i * 3.7) < u * 1.05 ? {} : null; }, // plotted, point by point
    ground: 0.86,
  },
  7: { tag: 'sink', // The Sink: the bottom of the drain. A still pool, drips falling into it, light from the surface above.
    name: 'the bottom of the drain',
    still(put, C, R) {
      const pl = Math.round(R * 0.8);
      for (let x = 0; x < C; x++) put(x, pl, '─', 0.2);
      for (let y = pl + 1; y < R; y++) for (let x = 0; x < C; x++) if ((x * 17 + y * 5) % 13 === 0) put(x, y, (x + y) % 2 ? '.' : ',', 0.08);
      for (const x of [6, 18, C - 15, C - 5]) for (let y = 0; y < 3 + (x % 4); y++) put(x, y, ':', 0.14);
    },
    live(put, C, R, t) {
      const pl = Math.round(R * 0.8);
      [6, 18, C - 15, C - 5].forEach((x, i) => {
        const per = 3 + i * 0.7, ph = ((t + i * 1.3) % per) / per, y = Math.round(3 + ph * ph * (pl - 3));
        if (ph < 0.92) put(x, y, '.', 0.4); else { const r = Math.round((ph - 0.92) * 60); put(x - r, pl, '~', 0.3); put(x + r, pl, '~', 0.3); }
      });
    },
    light: (t) => ({ L: nrm([0, -1, -0.2]), k: 0.4 + 0.15 * Math.sin(t * 1.3), base: 0.62 }),
    cam: { pitch: 0.45, dy: -0.02 },
    enter: 2000,
    camAt: (u) => ({ dy: -0.02 - 0.7 * (1 - ease(u)) }), // it sinks into view
    reveal: () => ({}),
    ground: 0.8,
    mirror: { a: 0.16, wave: 2, squash: 0.45, at: 0.8 },
    bits: 'sink',
  },
  8: { tag: 'bedrock', // Bedrock: the first clearing house, frozen. Stone above and below, its ledger's figures set in the rock.
    name: 'the stone under everything',
    still(put, C, R) {
      const r = rng(41), fl = Math.round(R * 0.8);
      const band = (y, ch, a, gap) => { for (let x = 0; x < C; x++) if ((x * 31 + y * 17) % gap !== 0) put(x, y + Math.round(Math.sin(x * 0.07 + y) * 0.45), ch, a); };
      for (let x = 0; x < C; x++) put(x, fl - 1, '_', 0.2);
      band(fl, '▒', 0.1, 9); band(fl + 2, '░', 0.08, 7); band(fl + 4, '▒', 0.12, 9); band(fl + 6, '▓', 0.12, 11);
      band(0, '▓', 0.1, 11); band(1, '░', 0.07, 7); for (let x = 0; x < C; x++) put(x, 2, '‾', 0.14);
      const entry = () => String(Math.floor(r() * 9000) + 1000) + ' ' + (Math.floor(r() * 990000) / 100).toFixed(2).padStart(9, ' ');
      for (const y of [fl + 1, fl + 3, fl + 5]) { let s = ''; while (s.length < C + 20) s += entry() + '    '; for (let x = 0; x < C; x++) if (s[x] !== ' ' && (x * 7 + y * 3) % 13 > 2) put(x, y, s[x], 0.13); }
      for (const [x0, k] of [[9, 0.5], [C - 12, -0.45]]) for (let y = fl; y < R; y++) put(Math.round(x0 + (y - fl) * k), y, k > 0 ? '\\' : '/', 0.16);
    },
    live() {},
    light: (t) => { const ph = t % 1.25; return { L: nrm([0.1, 1, -0.35]), k: 0.2 + 0.7 * Math.exp(-ph / 0.22), base: 0.5 }; },
    cam: { pitch: -0.3, dist: 190, zoom: 1, dy: -0.05 },
    enter: 2300,
    reveal(u, c, ch, H, t) {
      const front = -0.05 * H + ease(u) * 1.1 * H; // dug out, top down
      if (c.y < front - H * 0.04) return {};
      if (c.y < front) return { ch: (c.i + Math.floor(t * 14)) % 2 ? '.' : ':', a: 0.9 };
      return { ch: '░▒▓'[Math.min(2, Math.floor(c.lum * 3))], a: 0.55, rock: true };
    },
    ground: 0.79,
    bits: 'crumble',
  },
};

// The virus's tint: every floor but these (the Sink's rose sits near a strike's red, Deep Core's magenta is the elite's).
export const TINT_SKIP = new Set([5, 7]);
const mixHex = (a, b, t) => { const h = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16)); const A = h(a), B = h(b); return '#' + A.map((v, i) => Math.round(v * (1 - t) + B[i] * t).toString(16).padStart(2, '0')).join(''); };
// A visit's sky, from the window's clock and weather: fog, a low sun (dawn and dusk), or night (day and rain too: there
// is never rain on the screen). Fixed when a virus enters, so it never turns mid-fight.
export function skyOf(ms) {
  if (weatherAt(ms) === 'fog') return 'fog';
  const h = hourOf(new Date(ms));
  return h === 'dawn' || h === 'dusk' ? 'dawn' : 'night';
}
// What a sky adds over a place with one (P.sky: its horizon, a share of the height): the low sun and its light along
// the horizon, or a bank of fog over the far side. Lamps dim by day; fog mutes the scene.
function skyLive(cond, put, C, R, t, horizon) {
  const hr = Math.round(R * horizon);
  if (cond === 'dawn') {
    for (let k = 1; k <= 8; k++) for (let x = 0; x < C; x++) if ((x * 7 + k * 13) % Math.ceil(k / 2 + 0.5) === 0) put(x, hr - k, k < 3 ? '▁' : k < 5 ? '-' : '.', 0.3 - k * 0.032);
    const sx = Math.round(C * 0.9);
    for (let w = -3; w <= 3; w++) put(sx + w, hr - 1, '▄', 0.6 - Math.abs(w) * 0.06, true);
    for (let w = -2; w <= 2; w++) put(sx + w, hr - 2, '▄', 0.5, true);
  }
  if (cond === 'fog') for (let y = hr - 12; y <= hr + 5; y++) for (let x = 0; x < C; x++) {
    const n = Math.sin(x * 0.21 + t * 0.35 + y * 0.9) + Math.sin(x * 0.07 - t * 0.2 + y * 0.4);
    if (n > 0.1) put(x, y, n > 0.9 ? '▒' : '░', 0.09 + 0.08 * Math.max(0, 1 - Math.abs(y - hr + 3) / 9));
  }
}
const SKY_LIGHT = { dawn: () => ({ L: nrm([-0.55, 0.15, -0.82]), k: 0.45, base: 0.8 }) }; // the low sun, from in front

// ---------- the stage ----------
export function createStage({ getFloor, canMove = () => true, doc = typeof document !== 'undefined' ? document : null }) {
  let floor = null, P = null, col = '#f4b437', bright = '#fff2c8', dim = '#9e814f', t0 = 0, enterAt = -1e9, stillKey = '', tint = null, sky = 'night';
  let base = null, baseAt = 0;
  const off = doc ? doc.createElement('canvas') : null, ox = off?.getContext('2d');
  const clock = (now) => (now - t0) / 1000;
  const api = {
    // Called every frame: is a stage up, and which.
    update(now) {
      const f = getFloor?.() || null;
      if (f !== floor) {
        floor = f; P = PLACES[f] || null; t0 = now; stillKey = ''; base = null;
        if (P && doc) { const cs = getComputedStyle(doc.documentElement), bg = cs.getPropertyValue('--bg').trim() || '#000000'; col = cs.getPropertyValue('--amber').trim() || col; bright = cs.getPropertyValue('--bright').trim() || bright; dim = cs.getPropertyValue('--dim').trim() || dim; tint = TINT_SKIP.has(f) ? null : { amber: col, bright, deep: mixHex(col, bg, 0.38), dim: mixHex(col, bg, 0.6) }; }
        else tint = null;
      }
      return !!P;
    },
    get place() { return P; },
    // The virus's body in the floor's colour (not where the floor's colour sits near a strike's red or an elite's magenta).
    colors: () => tint,
    sky: () => sky,
    tagOf: (f) => (PLACES[f] ? `${PLACES[f].tag}/render` : 'render'),
    // A new virus on this floor: it enters the floor's way (not with Motion off).
    enter(now) { enterAt = canMove() ? now : -1e9; sky = skyOf(Date.now()); },
    progress(now) { return P && canMove() ? (now - enterAt) / P.enter : 9; },
    cam(now) {
      if (!P) return null;
      const u = api.progress(now);
      return { pitch: 0.2, dist: 0, zoom: 1, dx: 0, dy: 0, ...P.cam, ...(P.camAt && u < 1 ? P.camAt(u) : {}) };
    },
    // The scene: its still part from the cache, its live part drawn now.
    back(ctx, m) {
      const { width: W, height: H, gx, gy, glyph, now } = m, C = Math.ceil(W / gx), R = Math.ceil(H / gy), t = canMove() ? clock(now) : 0;
      ctx.save();
      ctx.font = `600 ${glyph}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const key = `${floor}:${Math.round(W)}x${Math.round(H)}:${m.dpr}:${col}`;
      if (key !== stillKey && off) {
        stillKey = key; off.width = Math.round(W * m.dpr); off.height = Math.round(H * m.dpr);
        ox.setTransform(m.dpr, 0, 0, m.dpr, 0, 0); ox.clearRect(0, 0, W, H);
        ox.font = ctx.font; ox.textAlign = 'center'; ox.textBaseline = 'middle'; ox.fillStyle = col;
        P.still((x, y, ch, a) => { ox.globalAlpha = a; ox.fillText(ch, x * gx, y * gy); }, C, R);
        ox.globalAlpha = 1;
      }
      if (off) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(off, 0, 0); ctx.setTransform(m.dpr, 0, 0, m.dpr, 0, 0); }
      ctx.fillStyle = col;
      const cond = P.sky ? sky : 'night', hr = P.sky ? Math.round(R * P.sky) : 0;
      const draw = (x, y, ch, a, glow) => { ctx.globalAlpha = a; if (glow) { ctx.shadowColor = col; ctx.shadowBlur = 8; } ctx.fillText(ch, x * gx, y * gy); if (glow) ctx.shadowBlur = 0; };
      P.live((x, y, ch, a, glow) => draw(x, y, ch, cond === 'fog' ? a * (y < hr + 2 ? 0.3 : 0.6) : cond === 'dawn' && glow ? a * 0.35 : a, glow), C, R, t);
      if (cond !== 'night') skyLive(cond, draw, C, R, t, P.sky);
      ctx.restore();
    },
    light(lum, nx, ny, nz, now) {
      if (!P) return lum;
      const t = canMove() ? clock(now) : 0, cond = P.sky ? sky : 'night';
      let L = cond === 'dawn' ? SKY_LIGHT.dawn() : P.light(t);
      if (cond === 'fog') L = { ...L, k: L.k * 0.6, base: L.base + 0.08 };
      return Math.min(1, lum * L.base + L.k * dot(L.L, nx, ny, nz));
    },
    reveal(c, ch, now, W, H) {
      if (!P) return {};
      const u = api.progress(now);
      if (u >= 1 && !P.waterline) return {};
      const r = P.reveal(u, c, ch, H, clock(now));
      if (r?.rock) return { ch: r.ch, a: r.a, color: dim };
      return r;
    },
    // After the virus: its reflection, where the floor has water (the line just under the lowest thing drawn).
    post(ctx, canvas, m) {
      const M = P?.mirror; if (!M || !off) return;
      const dpr = canvas.width / m.width;
      if (M.at) base = m.height * M.at;
      else if (!base || m.now - baseAt > 500) {
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data, Wd = canvas.width;
        let low = 0;
        for (let y = canvas.height - 1; y > 0 && !low; y -= 2) { let n = 0; for (let x = 0; x < Wd; x += 3) if (img[(y * Wd + x) * 4 + 3] > 90) n++; if (n > 6) low = y; }
        base = low ? Math.min(low / dpr + m.gy * 0.4, m.height * 0.9) : m.height * 0.84; baseAt = m.now;
      }
      const mc = api.mirrorCanvas ||= doc.createElement('canvas'), mx = mc.getContext('2d');
      mc.width = canvas.width; mc.height = canvas.height; mx.drawImage(canvas, 0, 0);
      const y0 = Math.round(base * dpr), h = canvas.height - y0, band = Math.max(2, Math.round(3 * dpr));
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let y = 0; y < h; y += band) {
        const srcY = y0 - y / M.squash; if (srcY < 0) break;
        const dx = canMove() ? Math.sin(y / (6 * dpr) + m.now / 420) * M.wave * dpr : 0;
        ctx.globalAlpha = M.a * (1 - y / h) * (Math.floor(y / band) % 3 === 2 && M.wave > 2 ? 0.35 : 1);
        ctx.drawImage(mc, 0, srcY - band / M.squash, canvas.width, band / M.squash, dx, y0 + y, canvas.width, band);
      }
      ctx.restore();
    },
    // A broken part's bit, the floor's way: frozen and sunk at the waterline, sunk slowly into the pool, or fallen to rubble.
    bit(ctx, d, delta, m) {
      const kind = P?.bits; if (!kind) return false;
      const ground = m.height * P.ground;
      if (!d.init) { d.init = 1; d.life = d.max = 2400; d.age = 0; }
      d.age += delta;
      let ch = d.c, a = 0.9, colr = bright;
      if (kind === 'freeze') {
        if (d.age < 260 + (d.ph % 1) * 260) ch = d.ph > 3 ? '*' : '+';
        else if (!d.sunk) { d.fv = (d.fv || 0) + 0.035 * delta; d.y += d.fv * delta / 16; ch = '*'; colr = col; if (d.y >= ground) { d.sunk = d.age; d.y = ground; d.life = Math.min(d.life, 420); d.max = 420; } }
        else { ch = d.age - d.sunk < 160 ? '~' : '-'; colr = col; a = d.life / 420; }
      } else if (kind === 'sink') {
        d.fv = (d.fv ?? -0.3) + 0.012 * delta; d.fv = Math.min(d.fv, 0.6); d.y += d.fv * delta / 16; d.x += d.vx * 0.3 * delta / 16;
        if (d.y >= ground) { d.life = Math.min(d.life, 300); a = d.life / 300; ch = '.'; colr = col; }
      } else {
        if (!d.rest) {
          d.fv = (d.fv ?? -0.6) + 0.05 * delta; d.y += d.fv * delta / 16; d.x += d.vx * 0.5 * delta / 16;
          const land = ground - (d.ph % 1) * m.gy * 1.5;
          if (d.y >= land) { d.rest = true; d.y = land; d.life = 1600 + (d.ph % 1) * 600; d.max = d.life; }
        } else { ch = '.,:_'[Math.floor(d.ph) % 4]; colr = col; a = Math.min(0.85, d.life / 500); }
      }
      ctx.globalAlpha = a; ctx.fillStyle = colr;
      ctx.fillText(ch, Math.round(d.x / m.gx) * m.gx, Math.round(d.y / m.gy) * m.gy);
      return true;
    },
  };
  return api;
}

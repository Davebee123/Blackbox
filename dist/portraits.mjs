// Portraits (quest-view.mjs): who's talking, as an ASCII silhouette beside their lines, like a JRPG's dialogue box.
// Backlit: the speaker is a void with a lit rim, an amber glow behind them; eyes, a mic or a lens catch the light.
// A bust is built from signed distance fields (a head, a neck, shoulders, and its features: hair, a hat or a hood, a
// headset, a collar, the lines of a coat) and drawn into a grid of characters, an edge's character following its
// slope (| / - \). The named cast have their own features; anyone else gets features picked from their name, so the
// same speaker always looks the same. A file is a dog-eared page, a log a ruled sheet. Plain ASCII only.
//
// faceOf(who, icon) → the features; portrait(who, icon) → { rows: [[cls, text], ...][] }; portraitMarkup → <pre>.

export const FACE = { w: 34, h: 19, top: 0.32, span: 1.72 }; // cells; the crop runs from y = top down `span` units

// ---------- shapes ----------
const len = Math.hypot;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smin = (a, b, k) => { const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1); return b * (1 - h) + a * h - k * h * (1 - h); };
const ell = (x, y, cx, cy, rx, ry) => (len((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
const box = (x, y, cx, cy, hx, hy, r = 0) => { const qx = Math.abs(x - cx) - hx + r, qy = Math.abs(y - cy) - hy + r; return len(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
const seg = (x, y, ax, ay, bx, by, t = 0) => { const px = x - ax, py = y - ay, dx = bx - ax, dy = by - ay, h = clamp((px * dx + py * dy) / (dx * dx + dy * dy), 0, 1); return len(px - dx * h, py - dy * h) - t; };
const side = (x, y, a, b) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
const tri = (x, y, a, b, c) => { const d1 = side(x, y, a, b), d2 = side(x, y, b, c), d3 = side(x, y, c, a), inside = !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); return Math.min(seg(x, y, ...a, ...b), seg(x, y, ...b, ...c), seg(x, y, ...c, ...a)) * (inside ? -1 : 1); };

// Each feature: what it adds to the silhouette (add), what it draws inside it (line), where it catches the light.
const HAIR = {
  none: null,
  short: (x, y) => ell(x, y, 0, 0.64, 0.3, 0.24),
  bun: (x, y) => smin(ell(x, y, 0, 0.62, 0.3, 0.26), ell(x, y, 0.02, 0.42, 0.17, 0.14), 0.06),
  long: (x, y) => smin(ell(x, y, 0, 0.66, 0.31, 0.26), ell(x, y, 0, 1.02, 0.36, 0.42), 0.1),
  parted: (x, y) => ell(x, y, 0.03, 0.6, 0.28, 0.18),
  crest: (x, y) => box(x, y, 0, 0.42, 0.06, 0.16, 0.05),
};
const TOP = {
  none: null,
  hat: (x, y) => Math.min(ell(x, y, 0, 0.56, 0.62, 0.065), box(x, y, 0, 0.4, 0.25, 0.16, 0.08)),
  hood: (x, y) => ell(x, y, 0, 0.78, 0.4, 0.5),
};
const GEAR = {
  none: null,
  headset: (x, y) => Math.min(ell(x, y, -0.29, 0.86, 0.075, 0.12), Math.max(Math.abs(len(x, y - 0.82) - 0.34) - 0.025, y - 0.84), seg(x, y, -0.3, 0.95, -0.1, 1.07, 0.018)),
};
const COLLAR = {
  none: null,
  up: (x, y) => Math.min(tri(x, y, [-0.14, 1.06], [-0.4, 1.5], [-0.05, 1.55]), tri(x, y, [0.14, 1.06], [0.4, 1.5], [0.05, 1.55])),
  round: (x, y) => ell(x, y, 0, 1.38, 0.3, 0.12),
};
const LINES = {
  none: () => 9,
  cardigan: (x, y) => Math.min(seg(x, y, -0.3, 1.5, -0.14, 2.1), seg(x, y, 0.3, 1.5, 0.14, 2.1)),
  suit: (x, y) => Math.min(seg(x, y, -0.16, 1.38, 0, 1.8), seg(x, y, 0.16, 1.38, 0, 1.8), seg(x, y, -0.32, 1.4, -0.1, 2.2), seg(x, y, 0.32, 1.4, 0.1, 2.2)),
  coat: (x, y) => seg(x, y, 0, 1.55, 0, 2.2),
  zip: (x, y) => seg(x, y, 0, 1.4, 0, 2.2),
  hood: (x, y) => Math.abs(ell(x, y, 0, 0.86, 0.22, 0.3)),
  brim: (x, y) => Math.min(seg(x, y, -0.62, 0.56, 0.62, 0.56), seg(x, y, 0, 1.55, 0, 2.2)),
  glasses: (x, y) => seg(x, y, -0.13, 0.82, 0.13, 0.82),
};
const EYES = { none: [], eyes: [[-0.09, 0.84], [0.09, 0.84]], glasses: [[-0.1, 0.82], [0.1, 0.82]], one: [[0.11, 0.86]], mic: [[-0.1, 1.07]], ear: [[0.26, 0.92]] };

// The named cast (matched in who's talking); the hub contacts are here for when their sessions get faces.
export const CAST = {
  okafor: { re: /okafor|ops-night/i, hair: 'bun', gear: 'headset', lines: 'cardigan', eyes: 'mic', hw: 0.27 },
  quill: { re: /quill/i, top: 'hat', collar: 'up', lines: 'brim', eyes: 'one', sw: 0.84 },
  vesper: { re: /vesper|nullchoir/i, top: 'hood', lines: 'hood', eyes: 'eyes', sw: 0.74, sr: 0.42 },
  concierge: { re: /concierge|halcyon/i, hair: 'parted', lines: 'suit', eyes: 'glasses', sw: 0.86, sr: 0.14 },
  glassjaw: { re: /glassjaw/i, hair: 'crest', collar: 'round', lines: 'zip', eyes: 'ear', sw: 0.78 },
};
const hashOf = (t) => { let h = 2166136261; for (const ch of String(t)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const pick = (list, h, k) => list[(h >>> k) % list.length];

// Who's talking, as features: a page for a file, a sheet for a log, else one of the cast or a face from their name.
export function faceOf(who = '', icon = 'npc') {
  if (icon === 'file' || icon === 'log') return { kind: icon };
  for (const [id, c] of Object.entries(CAST)) if (c.re.test(who)) return { kind: 'bust', id, ...c };
  const h = hashOf(who), top = pick(['none', 'none', 'none', 'hat', 'hood'], h, 3);
  return { kind: 'bust', id: null, top, hair: top === 'none' ? pick(['short', 'long', 'parted', 'crest', 'bun', 'none'], h, 0) : 'none',
    gear: top === 'hood' ? 'none' : pick(['none', 'none', 'headset'], h, 7), collar: pick(['none', 'none', 'up', 'round'], h, 11),
    lines: top === 'hood' ? 'hood' : pick(['cardigan', 'suit', 'coat', 'zip'], h, 15), eyes: top === 'hood' ? 'eyes' : pick(['none', 'eyes', 'glasses', 'one'], h, 19),
    sw: 0.74 + ((h >>> 23) % 5) * 0.03, sr: 0.14 + ((h >>> 26) % 4) * 0.09 };
}

// A face's silhouette (d < 0 inside), what it draws inside, its glints.
function shapeOf(f) {
  if (f.kind === 'file' || f.kind === 'log') {
    const ear = f.kind === 'file';
    const rows = ear ? [0.95, 1.15, 1.35, 1.55] : [0.6, 0.8, 1.0, 1.2, 1.4, 1.6];
    return {
      d: (x, y) => { const page = box(x, y, 0, 1.12, 0.5, 0.78, 0.02); return ear ? Math.max(page, -tri(x, y, [0.22, 0.32], [0.6, 0.32], [0.6, 0.72])) : page; },
      line: (x, y) => Math.min(ear ? Math.min(seg(x, y, 0.22, 0.34, 0.22, 0.7), seg(x, y, 0.22, 0.7, 0.5, 0.7)) : 9, ...rows.map((v, i) => seg(x, y, -0.32, v, i % 2 ? 0.12 : 0.3, v))),
      glints: [],
    };
  }
  const parts = [HAIR[f.hair || 'none'], TOP[f.top || 'none'], GEAR[f.gear || 'none'], COLLAR[f.collar || 'none']].filter(Boolean);
  const hood = f.top === 'hood', glasses = f.eyes === 'glasses';
  return {
    d: (x, y) => {
      let d = Math.min(ell(x, y, 0, 0.8, f.hw || 0.28, 0.36), smin(box(x, y, 0, 1.18, 0.11, 0.12, 0.02), box(x, y, 0, 1.84, f.sw || 0.8, 0.52, f.sr ?? 0.34), 0.14));
      for (const p of parts) d = hood && p === TOP.hood ? smin(d, p(x, y), 0.18) : f.top === 'hat' && p === TOP.hat ? Math.min(d, p(x, y)) : smin(d, p(x, y), 0.04);
      return d;
    },
    line: (x, y) => Math.min(LINES[f.lines || 'none'](x, y), glasses ? LINES.glasses(x, y) : 9),
    glints: EYES[f.eyes || 'none'],
  };
}

// The grid: [[cls, text], ...] per row, runs of one class merged. Classes: g0–g2 the glow (faint to near), e1 an edge
// in shadow, e2 an edge facing the light, in a line inside, gl a glint.
const rnd = (a, b, s) => { let h = Math.imul(a ^ 0x9e3779b9 ^ s, 2654435761) ^ Math.imul(b + 7, 2246822519); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
const slope = (gx, gy) => { const a = ((Math.atan2(gy, gx) * 180) / Math.PI + 360) % 180; return a < 22.5 || a >= 157.5 ? '|' : a < 67.5 ? '\\' : a < 112.5 ? '-' : '/'; };
const cache = new Map();
export function portrait(who = '', icon = 'npc') {
  const key = `${icon}|${who}`;
  if (cache.has(key)) return cache.get(key);
  const f = faceOf(who, icon), S = shapeOf(f), z = FACE.h / FACE.span, e = 0.012, seed = hashOf(who), rows = [];
  for (let r = 0; r < FACE.h; r++) {
    const row = [];
    const put = (cls, ch) => { const last = row.at(-1); if (last && last[0] === cls) last[1] += ch; else row.push([cls, ch]); };
    for (let c = 0; c < FACE.w; c++) {
      const x = ((c + 0.5) * 0.6 - FACE.w * 0.3) / z, y = FACE.top + (r + 0.5) / z, d = S.d(x, y);
      if (d > 0.03) {
        const g = 0.55 * Math.exp(-(d - 0.03) * 5) + 0.35 * Math.exp(-(len(x - 0.2, y - 0.7) ** 2) * 1.2);
        const dot = rnd(c, r, seed) < g * 0.5;
        if (g > 0.62) put('g2', ':'); else if (g > 0.42) put('g1', '.'); else put(dot ? 'g0' : '', dot ? '.' : ' ');
      } else if (d > -0.025) {
        const gx = S.d(x + e, y) - S.d(x - e, y), gy = S.d(x, y + e) - S.d(x, y - e), gl = len(gx, gy) || 1;
        put(gx / gl > 0.2 ? 'e2' : 'e1', slope(gx, gy));
      } else if (S.glints.some(([u, v]) => Math.abs(u - x) < 0.04 && Math.abs(v - y) < 0.04)) put('gl', 'o');
      else if (S.line(x, y) < 0.03) put('in', '.');
      else put('', ' ');
    }
    rows.push(row);
  }
  const out = { face: f, rows };
  cache.set(key, out);
  return out;
}

// The markup: a <pre>, one span a row (--r: its row, for the scan-in), hidden from screen readers (the name is in the
// window's header).
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function portraitMarkup(who, icon) {
  const p = portrait(who, icon);
  return `<pre class="q-face f-${p.face.kind}" aria-hidden="true">${p.rows.map((row, r) => `<span class="qf-r" style="--r:${r}">${row.map(([cls, t]) => (cls ? `<i class="${cls}">${esc(t)}</i>` : t)).join('')}</span>`).join('')}</pre>`;
}

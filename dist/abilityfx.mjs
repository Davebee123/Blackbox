// Ability effects on the fight board (the designer: "when an ability fires, something relevant animates toward or on
// the target part"). Ban swings a hammer down onto the part, Inject burns 1s and 0s on it for about a second, Ping
// sends a wave from your row down to it. One table (RECIPES) says what each ability's effect is made of: the piece
// (ASCII art, one frame or several), how it moves (MOTIONS), what flies off it where it lands (PARTICLES), when it
// lands and how long it plays. An ability with no row keeps the plain hit effect (hitfx.mjs). Adding one is a row.
//
// Where they play: on the part itself, its name cell (the designer: "as long as the effect is short, it's ok to put
// it over the component name; next to it isn't as immersive"). The hammer lands on its name and bar, the fire burns
// on its name cell, the ram, the needle, the wave, the bolt and the helper travel to it (from your Now cell, where
// your command sits, or in from the right), the blast goes off on it. A shield plays on your side, in the gap between
// your row and the parts, and stays off every name line. Every piece is short and gone within its effect (CAP, 1 s at
// most) and nothing stays behind: whatever crosses a part's name, ◆ or Integrity is there only for that moment.
// Nothing has a background, nothing dims the board, and the board never moves; the part's name brightens as the hit
// lands (hitfx.mjs jolt). Teal: you. A crit goes gold-white and a hit on ◆ throws steel; a crewmate's in violet,
// as hitfx.mjs does.
//
// Screen effects bold: the whole thing. Subtle and medium (calm): the piece, half the characters, no flourishes.
// Off (minimal) or Motion off: none, and the plain hit effect's own rules apply. Pure but for createAbilityFx (the
// layer on the page). Look only.

import { SPIKE, ABILITIES } from './data.mjs';

// Font metrics of the layer (style.css .afx): a monospace character is 0.6 of its size wide, a line 1.05 of it tall.
export const CW = 0.6, LH = 1.05;
// The longest any piece of an effect stays on the board (ms): nothing outlasts it.
export const CAP = 1000;

// ---------- the pieces ----------
// Each is lines of plain ASCII, read at board size (10 to 14 px).
const HAMMER = [
  ' ___',
  '|###|',
  '|###|==========o',
  '|___|',
];
const RAM = [
  ' ┌──────┐',
  '<┤██████├═══',
  ' └──────┘',
];
const NEEDLE = ['──────────>'];
const PING = [')))'];
const BOT = [
  ['[o_o]', "/' '\\"],
  ['[o_o]', ' | | '],
];
const BLAST = [
  ['       ', '   *   ', '       '],
  [' \\ | / ', '-- # --', ' / | \\ '],
  [" .  :  . ", "-- ### --", " '  :  ' "],
];

// ---------- the table ----------
// key: the ability's id; key 1 (id `spike`) by the class's own word for it (data.mjs SPIKE: bash, ban, poke, ping),
// and `<id>:tick` for a burn's later ticks.
//   label   what the playtest page (?playtest=fx) calls it
//   on      'part' (on the target's name cell) | 'you' (your side: a shield)
//   motion  how the piece moves (MOTIONS): swing · punch · dart · wave · bolt · walk · blast · wall · none
//   art     the piece: lines of ASCII; frames: several, in turn every fms ms (loop: over and over)
//   size    its font size (px)
//   impact  ms from the start to when it lands (app.js starts it this long before the hit's number shows)
//   dur     ms, all of it (no piece outlasts CAP)
//   burst   what flies where it lands: { style (PARTICLES), n (how many), per (more per the hit's share of the
//           part's max), full (bold only) }
export const RECIPES = {
  ban: { label: 'Ban', motion: 'swing', art: HAMMER, size: 12, impact: 300, dur: 760,
    burst: [{ style: 'shock', n: 10, per: 8 }, { style: 'dust', n: 5, per: 4 }, { style: 'flash', n: 1, full: true }] },
  bash: { label: 'Bash', motion: 'punch', art: RAM, size: 13, impact: 210, dur: 640,
    burst: [{ style: 'shock', n: 8, per: 8 }, { style: 'bits', n: 7, per: 10 }] },
  poke: { label: 'Poke', motion: 'dart', art: NEEDLE, size: 12, impact: 200, dur: 600,
    burst: [{ style: 'spark', n: 4, per: 3 }, { style: 'shock', n: 3, per: 2, full: true }] },
  ping: { label: 'Ping', motion: 'wave', art: PING, size: 18, impact: 360, dur: 820,
    burst: [{ style: 'ring', n: 3, per: 1 }, { style: 'shock', n: 4, per: 4, full: true }] },
  inject: { label: 'Inject', motion: 'none', size: 14, impact: 0, dur: 1000,
    burst: [{ style: 'flame', n: 60, per: 0 }, { style: 'ember', n: 10, per: 0 }] },
  'inject:tick': { label: 'Inject tick', motion: 'none', size: 11, impact: 0, dur: 420,
    burst: [{ style: 'flame', n: 7, per: 6 }, { style: 'ember', n: 2, per: 2 }] },
  overload: { label: 'Overload', motion: 'bolt', size: 15, impact: 170, dur: 800,
    burst: [{ style: 'bits', n: 14, per: 18 }, { style: 'shock', n: 8, per: 8 }, { style: 'flash', n: 1, full: true }] },
  firewall: { label: 'Firewall', on: 'you', motion: 'wall', size: 11, impact: 0, dur: 1000,
    burst: [{ style: 'flame', n: 30, per: 0 }] },
  deploy: { label: 'Deploy', motion: 'walk', frames: BOT, fms: 110, loop: true, size: 13, impact: 560, dur: 1000,
    burst: [{ style: 'spark', n: 4, per: 0 }] },
  detonate: { label: 'Detonate', motion: 'blast', frames: BLAST, fms: 100, size: 15, impact: 0, dur: 820,
    burst: [{ style: 'bits', n: 18, per: 22 }, { style: 'shock', n: 10, per: 8 }, { style: 'flame', n: 12, per: 0, full: true }] },
};

// ---------- which row ----------
// The ability an id or a name stands for (a burn's tick names it: "Inject", "Inject (Surprise)").
const BY_NAME = Object.fromEntries(Object.entries(ABILITIES).map(([id, a]) => [a.name.toLowerCase(), id]));
export const idOfName = (name) => BY_NAME[String(name || '').replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase()] || null;
// The table's key for an ability fired by a class: key 1 is its class's word for it.
export function keyFor(id, cls) {
  if (!id) return null;
  if (id === 'spike') return SPIKE[cls]?.word || null;
  return id;
}
// An event → the table's key for its effect, or null (cls: the shooter's class).
//   your command's hit: damage with its skill; a hit your ◆-absorbed command spent (armor, absorbed)
//   a burn's tick: damage from a burn (via its name) → '<id>:tick'
//   a hit that names its skill instead (Detonate): damage via a skill's name
//   a cast with no hit of its own: a burn, a helper or a shield going up (status with its ability)
export function keyOf(e, cls) {
  if (!e) return null;
  if (e.type === 'damage') {
    if (e.skill) return keyFor(e.skill, cls);
    if (e.src === 'burn' && e.via) { const id = idOfName(e.via); return id ? id + ':tick' : null; }
    if (!e.src && e.via) return keyFor(idOfName(e.via), cls);
    return null;
  }
  if (e.type === 'armor' && e.absorbed && e.ability) return keyFor(e.ability, cls);
  if (e.type === 'status' && e.ability && ['burn', 'helper', 'shield'].includes(e.mark)) return keyFor(e.ability, cls);
  return null;
}
// The recipe for a key, or null (the plain hit effect then).
export const recipeOf = (key) => (key && Object.hasOwn(RECIPES, key) ? RECIPES[key] : null);

// ---------- how much ----------
// The board's effects level (app.js fxLevel: full, calm or minimal) and Motion → 'full' | 'calm' | null (none).
export function levelOf({ level = 'full', motion = true } = {}) {
  if (!motion) return null;
  return level === 'full' ? 'full' : level === 'calm' ? 'calm' : null;
}
// How many of a burst entry: more for a bigger hit (power: its share of the part's max, 0–1), a crit, bold.
export function countOf(b, { lvl = 'full', power = 0.3, crit = false } = {}) {
  if (!lvl || (b.full && lvl !== 'full')) return 0;
  const p = Math.max(0, Math.min(1, power));
  return Math.max(b.n ? 1 : 0, Math.round(((b.n || 0) + (b.per || 0) * p) * (crit ? 1.4 : 1) * (lvl === 'full' ? 1 : 0.5)));
}

// ---------- geometry ----------
// Rects are { l, t, r, b } in the layer's own pixels (the board's, unscaled).
export const rect = (l, t, w, h) => ({ l, t, r: l + w, b: t + h });
export const overlaps = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
const textSize = (lines, size) => ({ w: Math.max(...lines.map((l) => l.length)) * size * CW, h: lines.length * size * LH });
// The box a piece covers at one key of its motion: its own box, scaled and turned about its origin, then moved.
export function boxAt(el, k) {
  const s = k.s ?? 1, a = ((k.r || 0) * Math.PI) / 180, c = Math.cos(a), n = Math.sin(a);
  const ox = el.ox ?? el.w / 2, oy = el.oy ?? el.h / 2;
  const xs = [], ys = [];
  for (const [px, py] of [[0, 0], [el.w, 0], [0, el.h], [el.w, el.h]]) {
    const dx = (px - ox) * s, dy = (py - oy) * s;
    xs.push(k.x + ox + dx * c - dy * n); ys.push(k.y + oy + dx * n + dy * c);
  }
  return { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) };
}
// The key at a time between two keys (straight lines between them, as the page plays them).
const lerp = (a, b, f) => a + (b - a) * f;
export function keyAt(el, at) {
  const ks = el.keys;
  if (at <= ks[0].at) return ks[0];
  for (let i = 1; i < ks.length; i++) {
    if (at <= ks[i].at) {
      const a = ks[i - 1], b = ks[i], f = (at - a.at) / (b.at - a.at || 1);
      return { at, x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), r: lerp(a.r || 0, b.r || 0, f), s: lerp(a.s ?? 1, b.s ?? 1, f), o: lerp(a.o ?? 1, b.o ?? 1, f) };
    }
  }
  return ks[ks.length - 1];
}
// Every key filled in from the one before it (a key names only what changes).
function fill(el) {
  let prev = { x: el.x, y: el.y, r: 0, s: 1, o: 1 };
  el.keys = el.keys.map((k) => (prev = { ...prev, e: undefined, ...k }));
  el.keys.forEach((k) => { if (k.e === undefined) delete k.e; });
  return el;
}
// Keep a piece off every name line (your side's effects, which have no part to land on): a key that would cover one
// moves right of it (or below it, along a bar).
function clear(el, keep) {
  for (const k of el.keys) {
    for (let pass = 0; pass < 4; pass++) {
      const b = boxAt(el, k), hit = keep.find((q) => overlaps(b, q));
      if (!hit) break;
      // Along a bar (a small piece under the name line): below it; else right of it.
      if (el.h <= 11 && b.b - hit.b < el.h && b.t > hit.t + (hit.b - hit.t) * 0.5) k.y += hit.b - b.t + 0.5;
      else k.x += hit.r - b.l + 0.5;
    }
  }
  return el;
}

// The points every motion works from. geo (layer pixels, from the page: createAbilityFx measure()):
//   part  { row, cell (its name cell), name (its name line: name, ◆, Integrity), bar }   (on 'part')
//   you   { row, cell, now (your Now cell, where your command sits), label (You) }
//   keep  every name line on the board, every part's tags and your label (your side's effects stay off them)
//   first the first part's name line (your side: the gap between your row and it)
export function pointsOf(geo) {
  const { part, you } = geo;
  if (!part) return null;
  const { row, cell, bar, name } = part;
  const S = { x: (name.l + name.r) / 2, y: (bar.t + bar.b) / 2 }; // where it lands: the bar's line under the middle of the name cell
  const M = { x: S.x, y: ((name.t + name.b) / 2 + S.y) / 2 }; // the middle of the name cell, between its name line and its bar
  const lane = { l: cell.r + 3, r: Math.max(cell.r + 60, Math.min(row.r - 4, cell.r + 230)), t: row.t + 1, b: row.b - 1 }; // the row right of it (a ram comes in from there)
  const floor = name.b + 1;
  const O = you?.now ? { x: you.now.l + (you.now.r - you.now.l) * 0.45, y: (you.now.t + you.now.b) / 2 } : { x: cell.r + 70, y: row.t - 50 };
  return { S, M, lane, floor, O, bar, row, cell, name };
}

// ---------- the motions ----------
// Each: (recipe, points, ctx) → its pieces. A piece: { cls, text, size, w, h, ox, oy, x, y, keys, delay, dur,
// frames, fms, loop }; keys: [{ at (0–1 of dur), x, y (its box's top left), r (deg), s, o, e (easing to the next) }].
const IN = 'cubic-bezier(.55,0,1,.45)', OUT = 'cubic-bezier(0,.55,.45,1)';
const piece = (cls, lines, size, extra) => ({ cls, text: lines.join('\n'), size, ...textSize(lines, size), ...extra });
const at = (ms, dur) => Math.max(0, Math.min(1, ms / dur));

export const MOTIONS = {
  none: () => [],
  // A hammer swung down about its handle's end: its head lands on the part's name and bar, bounces, and is gone.
  swing(R, P, c) {
    const el = piece('art', R.art, R.size * c.grow, {});
    el.ox = el.w; el.oy = el.h * 0.5; // the handle's end
    const x = P.S.x - 2.5 * R.size * c.grow * CW, y = P.S.y + 2 - el.h; // the head (its first 5 columns) over the middle of the name cell
    const I = at(R.impact, R.dur);
    el.keys = [{ at: 0, x, y, r: 52, o: 0, e: IN }, { at: I * 0.25, r: 46, o: 1, e: IN }, { at: I, r: 0, e: OUT }, { at: I + at(60, R.dur), r: -5 }, { at: I + at(130, R.dur), r: 0 }, { at: I + at(220, R.dur), o: 1 }, { at: 1, o: 0, y: y + 3 }];
    return [el];
  },
  // A ram punched in from the right along the part's row: its head hits the middle of the name cell, recoils, fades.
  punch(R, P, c) {
    const el = piece('art', R.art, R.size * c.grow, {});
    const x = P.S.x - 3 * R.size * CW, y = P.M.y - el.h / 2, I = at(R.impact, R.dur), far = Math.max(140, P.lane.r - x - el.w * 0.5);
    el.keys = [{ at: 0, x: x + far, y, o: 0, e: IN }, { at: I * 0.3, x: x + far * 0.78, o: 1, e: IN }, { at: I, x, e: OUT }, { at: I + at(50, R.dur), x: x + 8 }, { at: I + at(140, R.dur), x: x + 3 }, { at: I + at(200, R.dur), o: 1 }, { at: 1, x: x + 14, o: 0 }];
    return [el];
  },
  // A needle darted from your Now cell into the part's name cell: its tip sticks, quivers, pulls out.
  dart(R, P, c) {
    const el = piece('art', R.art, R.size, {});
    const T = P.M, a = Math.atan2(T.y - P.O.y, T.x - P.O.x), r = (a * 180) / Math.PI;
    const ux = Math.cos(a), uy = Math.sin(a);
    el.ox = el.w; el.oy = el.h / 2; // the tip
    const tip = (p) => ({ x: p.x - el.ox, y: p.y - el.oy });
    const from = tip({ x: P.O.x - ux * 24, y: P.O.y - uy * 24 }), to = tip(T), back = tip({ x: T.x - ux * 12, y: T.y - uy * 12 }), I = at(R.impact, R.dur);
    el.keys = [{ at: 0, ...from, r, o: 0, e: IN }, { at: I * 0.2, o: 1, e: IN }, { at: I, ...to, e: OUT }, { at: I + at(50, R.dur), r: r - 4 }, { at: I + at(100, R.dur), r: r + 3 }, { at: I + at(150, R.dur), r }, { at: 0.75, o: 1 }, { at: 1, ...back, o: 0 }];
    return [el];
  },
  // A wave sent from your Now cell down to the part: a few echoes of it, a beat apart, growing as they go.
  wave(R, P, c) {
    const out = [];
    const n = c.lvl === 'full' ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const el = piece('art', R.art, R.size, {});
      const T = P.M, a = Math.atan2(T.y - P.O.y, T.x - P.O.x), r = (a * 180) / Math.PI;
      const ctr = (p) => ({ x: p.x - el.w / 2, y: p.y - el.h / 2 });
      const travel = R.impact, dur = travel + 220;
      el.delay = i * 80; el.dur = dur;
      el.keys = [{ at: 0, ...ctr(P.O), r, s: 0.6, o: 0 }, { at: 0.12, o: 1 - i * 0.2 }, { at: at(travel, dur), ...ctr(T), s: 1.25, o: 0.95 - i * 0.2, e: OUT }, { at: 1, s: 1.5, o: 0 }];
      if (i) el.cls += ' echo';
      out.push(el);
    }
    return out;
  },
  // A bolt from your Now cell into the part's name cell: characters along a jagged line, lit tip-first, flickering out.
  bolt(R, P, c) {
    const out = [];
    const T = P.M;
    const branches = c.lvl === 'full' ? 2 : 1;
    for (let k = 0; k < branches; k++) {
      const from = k ? { x: P.O.x + 26, y: P.O.y + 4 } : P.O;
      const dx = T.x - from.x, dy = T.y - from.y, dist = Math.hypot(dx, dy) || 1, nx = -dy / dist, ny = dx / dist;
      const steps = Math.max(5, Math.round(dist / (R.size * 0.95)));
      let prev = from;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, side = i === steps ? 0 : (i % 2 ? 1 : -1) * (4 + c.rnd() * 6);
        const p = { x: from.x + dx * t + nx * side, y: from.y + dy * t + ny * side };
        const sx = p.x - prev.x, sy = p.y - prev.y;
        const ch = Math.abs(sx) < Math.abs(sy) * 0.4 ? '|' : Math.abs(sy) < Math.abs(sx) * 0.4 ? '-' : (sx > 0) === (sy > 0) ? '\\' : '/';
        const el = piece('art bolt' + (k ? ' echo' : ''), [ch], R.size, {});
        const x = (p.x + prev.x) / 2 - el.w / 2, y = (p.y + prev.y) / 2 - el.h / 2;
        const lit = Math.round(t * R.impact * 0.85) + k * 40;
        el.delay = lit; el.dur = R.dur - lit - 60;
        el.keys = [{ at: 0, x, y, o: 0 }, { at: 0.05, o: 1 }, { at: 0.3, o: 0.35 }, { at: 0.42, o: 1 }, { at: 0.6, o: 0.5 }, { at: 0.72, o: 0.9 }, { at: 1, o: 0 }];
        out.push(el);
        prev = p;
      }
    }
    return out;
  },
  // A helper scuttling from your Now cell down to the part: it walks onto its name cell, settles, blinks out.
  walk(R, P, c) {
    const el = piece('art', R.frames[0], R.size, { frames: R.frames.map((f) => f.join('\n')), fms: R.fms, loop: R.loop });
    const ctr = (p) => ({ x: p.x - el.w / 2, y: p.y - el.h / 2 });
    const T = { x: P.S.x + el.w * 0.6, y: P.M.y };
    const a = ctr(P.O), b = ctr(T), I = at(R.impact, R.dur), keys = [{ at: 0, ...a, o: 0 }];
    for (let i = 1; i <= 6; i++) { const f = i / 6; keys.push({ at: I * f, x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) - (i % 2 ? 3 : 0), o: 1 }); }
    keys.push({ at: I + at(80, R.dur), y: b.y - 2 }, { at: I + at(160, R.dur), y: b.y }, { at: 0.82, o: 1 }, { at: 1, o: 0 });
    el.keys = keys;
    return [el];
  },
  // A blast where the part's burns went off: it grows through its frames on the name cell and is gone.
  blast(R, P, c) {
    const el = piece('art', R.frames[R.frames.length - 1], R.size * c.grow, { frames: R.frames.map((f) => f.join('\n')), fms: R.fms });
    const x = P.M.x - el.w / 2, y = P.M.y - el.h / 2;
    el.keys = [{ at: 0, x, y, s: 0.7, o: 0 }, { at: 0.05, o: 1 }, { at: 0.35, s: 1.1 }, { at: 0.6, s: 1.25, o: 0.9 }, { at: 1, s: 1.35, o: 0 }];
    return [el];
  },
  // A firewall on your side: courses of bricks laid bottom-up (each settles onto the one under it) in the gap between
  // your row and the parts.
  wall(R, P, c) {
    const out = [];
    const cols = Math.max(12, Math.floor((P.wall.r - P.wall.l) / (R.size * CW)));
    const course = (k) => Array.from({ length: cols }, (_, i) => ((i + k * 2) % 4 === 0 ? '|' : '_')).join('');
    const lines = c.lvl === 'full' ? 2 : 1;
    for (let k = 0; k < lines; k++) {
      const el = piece('art wall', [course(k)], R.size, {});
      const y = P.wall.b - (k + 1) * el.h;
      el.delay = k * 120; el.dur = R.dur - k * 120;
      el.keys = [{ at: 0, x: P.wall.l, y: y - 4, o: 0, e: OUT }, { at: 0.14, y, o: 1 }, { at: 0.8, o: 1 }, { at: 1, o: 0 }];
      out.push(el);
    }
    P.top = P.wall.b - lines * R.size * LH; // where its flames rise from
    return out;
  },
};

// ---------- the particles ----------
// Each: (n, recipe, points, ctx) → pieces, from where the piece lands (ctx.t0: when, in ms).
const bit = (rnd) => (rnd() < 0.5 ? '0' : '1');
const pick = (s, rnd) => s[Math.floor(rnd() * s.length)];
const mote = (cls, ch, size, x, y, delay, dur, keys) => fill({ cls, text: ch, size, w: size * CW, h: size * LH, x, y, delay, dur, keys: keys.map((k) => ({ ...k })) });

export const PARTICLES = {
  // The shock where it lands: dashes skid away both ways along the part's bar.
  shock(n, R, P, c) {
    const out = [], size = 9;
    for (let i = 0; i < n; i++) {
      const left = i % 2 === 0, d = 260 + c.rnd() * 140;
      const y0 = P.S.y - (size * LH) / 2 + (c.rnd() - 0.5) * 4;
      const x0 = left ? P.S.x - 8 : P.S.x + 4;
      const x1 = left ? Math.max(P.bar.l - 10, x0 - 30 - c.rnd() * 90) : x0 + 30 + c.rnd() * 90;
      out.push(mote('p shock', pick('-=~-', c.rnd), size, x0, y0, c.t0 + c.rnd() * 40, d, [{ at: 0, x: x0, y: y0, o: 1, s: 1.2, e: OUT }, { at: 1, x: x1, y: y0, o: 0, s: 0.8 }]));
    }
    return out;
  },
  // Dust kicked up off the bar's line, either side of where it landed.
  dust(n, R, P, c) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, x0 = P.S.x + side * (6 + c.rnd() * 30), y0 = P.S.y - 6, d = 380 + c.rnd() * 220;
      out.push(mote('p', pick("'.,`", c.rnd), 11, x0, y0, c.t0 + c.rnd() * 60, d, [{ at: 0, x: x0, y: y0, o: 1, e: OUT }, { at: 1, x: x0 + side * (6 + c.rnd() * 30), y: y0 - 10 - c.rnd() * 24, o: 0 }]));
    }
    return out;
  },
  // 1s and 0s thrown out of the part every way.
  bits(n, R, P, c) {
    const out = [], reach = 40 + c.power * 60 + (c.crit ? 30 : 0);
    for (let i = 0; i < n; i++) {
      const a = c.rnd() * Math.PI * 2, d = 18 + c.rnd() * reach, size = 11 + Math.round(c.rnd() * 4);
      const x0 = P.M.x - (size * CW) / 2, y0 = P.M.y - (size * LH) / 2;
      out.push(mote('p', bit(c.rnd), size, x0, y0, c.t0 + c.rnd() * 50, 450 + c.rnd() * 300, [{ at: 0, x: x0, y: y0, o: 1, s: 0.7, e: OUT }, { at: 0.6, o: 1 }, { at: 1, x: x0 + Math.cos(a) * d, y: y0 + Math.sin(a) * d * 0.7, o: 0, s: 1, r: (c.rnd() - 0.5) * 90 }]));
    }
    return out;
  },
  // A few sparks right where the tip went in.
  spark(n, R, P, c) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const x0 = P.M.x - 3, y0 = P.M.y - 5, d = 220 + c.rnd() * 160, a = c.rnd() * Math.PI * 2;
      out.push(mote('p', pick("*'+.", c.rnd), 10, x0, y0, c.t0 + c.rnd() * 40, d, [{ at: 0, x: x0, y: y0, o: 1, e: OUT }, { at: 1, x: x0 + Math.cos(a) * (8 + c.rnd() * 16), y: y0 + Math.sin(a) * (6 + c.rnd() * 10), o: 0 }]));
    }
    return out;
  },
  // The echo coming back: arcs spreading out both ways from where the wave landed, ( on the left and ) on the right.
  ring(n, R, P, c) {
    const out = [];
    for (let i = 0; i < n; i++) {
      for (const side of [-1, 1]) {
        const size = 14 + i * 5, w = size * CW, h = size * LH, x0 = P.M.x - w / 2 + side * 6, y0 = P.M.y - h / 2;
        out.push(mote('p ring', side < 0 ? '(' : ')', size, x0, y0, c.t0 + i * 70, 380, [{ at: 0, x: x0, y: y0, o: 0.95, s: 0.7, e: OUT }, { at: 1, x: x0 + side * (16 + i * 18), y: y0, o: 0, s: 1.1 }]));
      }
    }
    return out;
  },
  // Flames of 1s and 0s: they rise off the part's bar up over its name (your side: off the wall's top) and go out.
  flame(n, R, P, c) {
    const out = [];
    const you = R.on === 'you';
    // A fire's shape: most of it in the middle, tallest there; on a part it spans its name cell and climbs to about
    // its row's top.
    const l = you ? P.wall.l : P.bar.l, w = you ? P.wall.r - P.wall.l : P.bar.r - P.bar.l;
    const base = you ? P.top : P.S.y + 4;
    const rise = you ? 18 : Math.max(18, base - P.row.t - 6) * (c.lvl === 'full' ? 1 : 0.7);
    const spread = Math.max(0, R.dur - c.t0 - 460);
    for (let i = 0; i < n; i++) {
      const u = you ? c.rnd() : (c.rnd() + c.rnd()) / 2, mid = 1 - Math.abs(u - 0.5) * 2;
      const size = Math.round((you ? 10 : R.size) * (0.75 + mid * 0.4));
      const h = size * LH, x0 = Math.max(l, l + u * w - (size * CW) / 2), y0 = base - h, life = 300 + c.rnd() * 220;
      const hot = c.rnd() < 0.25 + mid * 0.2 ? ' hot' : '';
      const up = rise * (you ? 0.6 + c.rnd() * 0.6 : 0.35 + mid * 0.65) * (0.75 + c.rnd() * 0.25), lean = (0.5 - u) * 8;
      out.push(mote('p flame' + hot, bit(c.rnd), size, x0, y0, c.t0 + c.rnd() * spread, life, [{ at: 0, x: x0, y: y0, o: 0, s: 1 }, { at: 0.15, o: 1 }, { at: 0.55, o: 0.85, x: x0 + lean * 0.5 + (c.rnd() - 0.5) * 4, y: y0 - up * 0.5 }, { at: 1, x: x0 + lean + (c.rnd() - 0.5) * 6, y: y0 - up, o: 0, s: 0.55 }]));
    }
    return out;
  },
  // Embers on the part's bar: small 1s and 0s that flicker where they sit.
  ember(n, R, P, c) {
    const out = [], size = 8;
    const spread = Math.max(0, R.dur - c.t0 - 500);
    for (let i = 0; i < n; i++) {
      const x0 = P.bar.l + (P.bar.r - P.bar.l) * (0.15 + c.rnd() * 0.8) - size * CW, y0 = Math.max(P.floor, P.S.y - (size * LH) / 2);
      out.push(mote('p ember', bit(c.rnd), size, x0, y0, c.t0 + c.rnd() * spread, 360 + c.rnd() * 240, [{ at: 0, x: x0, y: y0, o: 0 }, { at: 0.15, o: 1 }, { at: 0.4, o: 0.3 }, { at: 0.6, o: 0.9 }, { at: 1, o: 0 }]));
    }
    return out;
  },
  // A flash of light where it lands.
  flash(n, R, P, c) {
    const size = 22, h = size * LH, x0 = P.M.x - (size * CW) / 2, y0 = P.M.y - h / 2;
    return [mote('p flash', '+', size, x0, y0, c.t0, 240, [{ at: 0, x: x0, y: y0, o: 1, s: 0.5, e: OUT }, { at: 1, o: 0, s: 1.6 }])];
  },
};

// ---------- the layout ----------
// A recipe on a board → its pieces, or null if it can't play there (no part on the board, no row for you).
// opts: lvl ('full' | 'calm'), power (0–1), crit, result ('hit' | 'crit' | 'chit'), kind ('you' | 'crew'), rnd.
export function layout(R, geo, { lvl = 'full', power = 0.3, crit = false, result = 'hit', kind = 'you', rnd = Math.random } = {}) {
  if (!R || !lvl || !geo) return null;
  let P;
  if (R.on === 'you') {
    const you = geo.you;
    if (!you?.row) return null;
    // The gap between your row and the first part: the wall stands there, under your row's text and over theirs.
    const b = Math.min(geo.first ? geo.first.t - 2 : you.row.b + 14, you.row.b + 16);
    const l = you.cell.l, r = Math.min(you.row.r - 4, you.cell.r + 240);
    P = { wall: { l, r, b }, S: { x: you.cell.r + 6, y: b }, M: { x: you.cell.r + 6, y: b }, lane: { l: you.cell.r + 3, r, t: you.row.t, b }, floor: b, bar: { l, r, t: b, b }, row: you.row, cell: you.cell, O: { x: l, y: b } };
  } else {
    P = pointsOf(geo);
    if (!P) return null;
  }
  const c = { lvl, power: Math.max(0, Math.min(1, power)), crit, rnd, t0: R.impact, grow: 1 + Math.min(1, power) * 0.12 };
  const tint = kind === 'crew' ? ' crew' : crit ? ' crit' : '';
  const els = (MOTIONS[R.motion] || MOTIONS.none)(R, P, c).map((el) => {
    el.cls += tint;
    el.delay ??= 0; el.dur ??= R.dur;
    if (el.x === undefined) { el.x = el.keys[0].x; el.y = el.keys[0].y; }
    return fill(el);
  });
  for (const b of R.burst || []) {
    const n = countOf(b, { lvl, power, crit });
    if (!n) continue;
    for (const el of PARTICLES[b.style](n, R, P, c)) {
      el.cls += kind === 'crew' ? ' crew' : result === 'chit' && b.style !== 'flame' ? ' chit' : crit ? ' crit' : '';
      els.push(el);
    }
  }
  // Every piece is gone by CAP, and ends unseen: nothing stays behind on a name.
  for (const el of els) {
    if (el.delay + el.dur > CAP) el.dur = Math.max(1, CAP - el.delay);
    el.keys[el.keys.length - 1].o = 0;
  }
  // Your side's effects have no part to land on: they stay off every name line.
  if (R.on === 'you') for (const el of els) clear(el, geo.keep || []);
  return { els, impact: R.impact, dur: Math.max(R.dur, ...els.map((e) => e.delay + e.dur)) };
}

// ---------- on the page ----------
// The layer beside #board (as hitfx.mjs: the board redraws every step of a cycle), and play(): an effect on a part's
// row (or on your row) → true if it played (the plain hit effect then sits out), false if it didn't.
export function createAbilityFx(board, { canMove = () => true, level = () => 'full' } = {}) {
  const layer = document.createElement('div');
  layer.id = 'abilityfx';
  layer.setAttribute('aria-hidden', 'true');
  board.parentElement.appendChild(layer);

  function frame() {
    const scale = board.getBoundingClientRect().width / (board.offsetWidth || 1) || 1;
    Object.assign(layer.style, { left: board.offsetLeft + 'px', top: board.offsetTop + 'px', width: board.offsetWidth + 'px', height: board.offsetHeight + 'px' });
    return { box: layer.getBoundingClientRect(), scale };
  }
  const local = (f, el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return rect((r.left - f.box.left) / f.scale, (r.top - f.box.top) / f.scale, r.width / f.scale, r.height / f.scale);
  };
  const pad = (q) => q && { l: q.l - 1, t: q.t - 1, r: q.r + 1, b: q.b + 1 };
  // The board as layout() reads it.
  function measure(row) {
    const f = frame(), you = board.querySelector('.brow.byou'), parts = [...board.querySelectorAll('.bpart')];
    const label = you?.querySelector('.bname b');
    // Every part's name line (name, ◆, Integrity) and its tags under the bar, and your own label: never covered.
    const keep = [...parts.flatMap((p) => [pad(local(f, p.querySelector('.part-top'))), pad(local(f, p.querySelector('.part-tags')))]), pad(local(f, label))].filter(Boolean);
    const geo = {
      keep,
      first: parts[0] ? local(f, parts[0].querySelector('.part-top')) : null,
      you: you ? { row: local(f, you), cell: local(f, you.querySelector('.bname')), now: local(f, you.querySelector('.bcell:nth-child(2)')) } : null,
      part: null,
    };
    if (row) {
      const p = { row: local(f, row), cell: local(f, row.querySelector('.bname')), name: local(f, row.querySelector('.part-top')), bar: local(f, row.querySelector('.part-bar')) };
      if (p.row && p.cell && p.name && p.bar) geo.part = p;
    }
    return geo;
  }
  const ON = { full: 'full', calm: 'calm' };
  function place(el) {
    const span = document.createElement('span');
    span.className = 'afx ' + el.cls;
    span.style.fontSize = el.size + 'px';
    span.style.width = el.w.toFixed(1) + 'px';
    span.style.height = el.h.toFixed(1) + 'px';
    span.style.transformOrigin = `${(el.ox ?? el.w / 2).toFixed(1)}px ${(el.oy ?? el.h / 2).toFixed(1)}px`;
    layer.appendChild(span);
    const keys = el.keys.map((k) => ({ offset: k.at, opacity: k.o, transform: `translate(${k.x.toFixed(1)}px, ${k.y.toFixed(1)}px) rotate(${(k.r || 0).toFixed(1)}deg) scale(${(k.s ?? 1).toFixed(3)})`, ...(k.e ? { easing: k.e } : {}) }));
    try {
      span.animate(keys, { duration: el.dur, delay: el.delay, fill: 'forwards' }); // hidden (style.css .afx) until it starts
      // Frames: one copy each, stacked, shown in turn (every fms ms; over and over if it loops, else the last stays).
      const frames = el.frames?.length > 1 ? el.frames : [el.text];
      const n = frames.length;
      frames.forEach((text, i) => {
        const f = document.createElement('i');
        f.textContent = text;
        span.appendChild(f);
        if (n < 2) return;
        const after = el.loop || i < n - 1 ? 0 : 1, before = i === 0 ? 1 : 0;
        f.animate([{ offset: 0, opacity: before }, { offset: i / n, opacity: before }, { offset: i / n, opacity: 1 }, { offset: (i + 1) / n, opacity: 1 }, { offset: (i + 1) / n, opacity: after }, { offset: 1, opacity: after }],
          { duration: el.fms * n, delay: el.delay, iterations: el.loop ? Math.ceil(el.dur / (el.fms * n)) : 1, fill: 'both' });
      });
    } catch { span.remove(); return; }
    setTimeout(() => span.remove(), el.delay + el.dur + 60);
  }
  // key: the table's; row: the part's board row (null for your side); opts: power, crit, result, kind, onImpact.
  function play(key, row, { power = 0.3, crit = false, result = 'hit', kind = 'you', onImpact = null, lvl: force } = {}) {
    const R = recipeOf(key);
    const lvl = force || levelOf({ level: level(), motion: canMove() });
    if (!R || !lvl || !ON[lvl]) return false;
    if (R.on !== 'you' && !row?.isConnected) return false;
    const plan = layout(R, measure(R.on === 'you' ? null : row), { lvl, power, crit, result, kind });
    if (!plan) return false;
    for (const el of plan.els) place(el);
    if (onImpact) setTimeout(onImpact, plan.impact);
    return true;
  }
  return { play, measure, layer };
}

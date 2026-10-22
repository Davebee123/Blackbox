// Ability effects on the fight board (the designer: "when an ability fires, something relevant animates toward or on
// the target part"). Every ability a player can fire has one (abilityfx-table.mjs RECIPES): a hit travels from where
// you fired it to the part and lands on its name cell (Ban's hammer, Bash's ram, Poke's needle, Ping's waves), a mark
// lands on it (Crack shatters its ◆, Exploit a crosshair, Throttle a clamp on its attack chip), a heal, a shield or a
// buff plays on your own bar (Firewall's bricks), a helper walks out to it, SIGINT cuts its attack chip. The table says
// what each is made of: the piece (ASCII art, one frame or several), how it moves (MOTIONS), what flies where it lands
// (PARTICLES), when it lands and how long it plays. Adding one is a row; DELIBERATE lists what stays on the plain strike.
//
// Where it comes from (originOf; the designer: "all ability effects need to come from their ability window"): from the
// ability's key in the tray, however it was fired (a click, its number key, typed, a routine, the timer's auto-repeat,
// a daemon). Only when that key isn't on screen (the ability isn't on your bar, or the tray is folded away on a phone)
// does it start at your bar (your Signal; at home your server's Integrity). It travels from there to the part (TRAVEL:
// by distance), and an effect that plays where it lands (a burn, a blast, a mark, or on your bar a heal, a shield, a
// buff) is taken there by a short streak first. A burn's later tick plays where it burns. Its impact still lands with
// its number: the page starts it early by its travel.
//
// What it may cross: on its way it may pass over anything for a moment (it's in flight), but it never stops over a key
// label in the tray or your bar's numbers; where it lands it may cover the part's name, ◆ and Integrity, but only for its
// own moment. Every piece is gone within CAP (1.2 s, travel included; most are under 1 s) and ends unseen: nothing stays
// behind. Nothing has a background, nothing dims the page, and nothing on the page moves; the part's name brightens as
// the hit lands (hitfx.mjs jolt). Teal: you. A crit goes gold-white and a hit on ◆ throws steel; a crewmate's in violet,
// as hitfx.mjs does.
//
// Screen effects bold: the whole thing. Subtle and medium (calm): the piece, half the characters, no flourishes.
// Off (minimal) or Motion off: none, and the plain hit effect's own rules apply. Pure but for createAbilityFx (the
// layer on the page). Look only.

import { SPIKE, ABILITIES } from './data.mjs';
import { RECIPES } from './abilityfx-table.mjs';
export { RECIPES } from './abilityfx-table.mjs';

// Font metrics of the layer (style.css .afx): a monospace character is 0.6 of its size wide, a line 1.05 of it tall.
export const CW = 0.6, LH = 1.05;
// The longest any piece of an effect stays on the page (ms), its travel included: nothing outlasts it.
export const CAP = 1200;
// The travel from where you fired it to where it plays: ms by distance (px), never under or over these.
export const TRAVEL = { perPx: 0.75, min: 160, max: 340, near: 24 };
export const travelOf = (a, b) => { const d = Math.hypot(b.x - a.x, b.y - a.y); return d < TRAVEL.near ? 0 : Math.round(Math.max(TRAVEL.min, Math.min(TRAVEL.max, d * TRAVEL.perPx))); };

// What fires from the tray but stays on the plain strike (hitfx.mjs), and why. Run skills (the Phantom's Spoof and Tap)
// are typed on runs and never fire in a fight; hold and flee are no ability; a breach's scripts are scripts, not skills.
export const DELIBERATE = {};

// ---------- which row ----------
// The ability an id or a name stands for (a burn's tick names it: "Inject", "Inject (Surprise)").
const BY_NAME = Object.fromEntries(Object.entries(ABILITIES).map(([id, a]) => [a.name.toLowerCase(), id]));
export const idOfName = (name) => BY_NAME[String(name || '').replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase()] || null;
// The table's key for an ability fired by a class: key 1 is its class's word for it (an unknown class: spike).
export function keyFor(id, cls) {
  if (!id) return null;
  if (id === 'spike') return SPIKE[cls]?.word || 'spike';
  return id;
}
// A burn's tick (damage from a burn, via its name) → its own row, or any burn's.
export function tickKey(e) {
  if (e?.type !== 'damage' || e.src !== 'burn' || !e.via) return null;
  const id = idOfName(e.via);
  if (!id) return null;
  return recipeOf(id + ':tick') ? id + ':tick' : ABILITIES[id]?.verb === 'burn' ? 'burn:tick' : null;
}
// An event → the table's key for its effect, or null (cls: the shooter's class). A command fired (resolved, every
// one: typed, from the tray, the timer's, a routine's, a daemon's, a crewmate's) by its ability; a burn's tick.
export function keyOf(e, cls) {
  if (!e) return null;
  if (e.type === 'resolved' && e.ability) return keyFor(e.ability, cls);
  return tickKey(e);
}
// The recipe for a key, or null (the plain hit effect then).
export const recipeOf = (key) => (key && Object.hasOwn(RECIPES, key) ? RECIPES[key] : null);
// Where it starts: the ability's key in the tray, whoever or whatever fired it (layout() falls back to your bar when
// that key isn't on screen); a burn's tick where it burns.
export function originOf(e) {
  return tickKey(e) ? 'here' : 'key';
}

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
const mid = (q) => ({ x: (q.l + q.r) / 2, y: (q.t + q.b) / 2 });
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
// A piece's keys in ms from its start (t) → its delay, its length and its keys in 0–1 of it. A key that leaves a value
// out takes it on the way between the keys either side that name it (so a piece fading in is already moving: it never
// rests where it starts), or keeps the last one named.
const PROPS = ['x', 'y', 'r', 's', 'o'];
function between(ks, tk = 't') {
  for (const p of PROPS) {
    for (let i = 0; i < ks.length; i++) {
      if (ks[i][p] !== undefined) continue;
      let a = i - 1; while (a >= 0 && ks[a][p] === undefined) a--;
      let b = i + 1; while (b < ks.length && ks[b][p] === undefined) b++;
      if (a < 0 || b >= ks.length) continue; // none before (fill's default) or none after (the last one named)
      const f = (ks[i][tk] - ks[a][tk]) / (ks[b][tk] - ks[a][tk] || 1);
      ks[i][p] = ks[a][p] + (ks[b][p] - ks[a][p]) * f;
    }
  }
  return ks;
}
function track(el, start, ks) {
  ks = between(ks.map((k) => ({ ...k })));
  const end = Math.max(1, ks[ks.length - 1].t);
  el.delay = start; el.dur = end;
  el.keys = ks.map(({ t, ...k }) => ({ at: Math.max(0, Math.min(1, t / end)), ...k }));
  el.x ??= el.keys[0].x; el.y ??= el.keys[0].y;
  return fill(el);
}

// The points every motion works from. geo (layer pixels, from the page: createAbilityFx measure()):
//   part   { row, cell (its name cell), name (its name line: name, ◆, Integrity), bar, chip (its attack chip) }
//   parts  every part on the board, the same way (an effect on all of them)
//   mine   { bar, nums }: your own bar in the HUD and its numbers
//   key    the ability's key in the tray, when it's on screen
//   keep   every name line on the board, every part's tags and your label; originKeep: every key's label and your
//          bar's numbers (nothing stops over them)
// opts.origin: 'key' (the ability's key; your bar when geo.key is null: not on screen) | 'bar' | 'here' (a burn's tick:
// it starts where it plays).
function pointsOf(R, geo, origin) {
  const ybar = geo.mine?.bar || null, Y = ybar ? mid(ybar) : null;
  let P;
  if (R.on === 'you') {
    if (!ybar || ybar.r - ybar.l < 20) return null;
    // Your bar: the wall stands on it, its bottom course over the bar itself, the flames off its top.
    const { l, r } = ybar, b = ybar.b + 1;
    P = { wall: { l, r, b }, S: Y, M: Y, D: Y, lane: { l, r, t: ybar.t - 30, b }, floor: b, bar: ybar, row: { l, r, t: ybar.t - 30, b }, cell: ybar, name: ybar };
  } else {
    const part = geo.part;
    if (!part) return null;
    const { row, cell, bar, name } = part;
    let S = { x: (name.l + name.r) / 2, y: (bar.t + bar.b) / 2 }; // the bar's line under the middle of the name cell
    let M = { x: S.x, y: ((name.t + name.b) / 2 + S.y) / 2 }; // the middle of the name cell
    if (R.at === 'chip' && part.chip) { M = mid(part.chip); S = M; } // its attack chip, when it shows one
    const lane = { l: cell.r + 3, r: Math.max(cell.r + 60, Math.min(row.r - 4, cell.r + 230)), t: row.t + 1, b: row.b - 1 };
    P = { S, M, D: M, lane, floor: name.b + 1, bar, row, cell, name, chip: part.chip || null };
  }
  P.ybar = ybar; P.Y = Y || P.M;
  // Where it starts: its key, else your bar, else (neither on screen) above the part.
  const O = origin === 'here' ? P.D : origin === 'key' && geo.key ? { x: (geo.key.l + geo.key.r) / 2, y: geo.key.t + (geo.key.b - geo.key.t) * 0.35 } : Y || { x: P.D.x + 60, y: P.D.y - 120 };
  P.O = O; P.from = origin === 'here' ? 'here' : origin === 'key' && geo.key ? 'key' : 'bar';
  P.okeep = geo.originKeep || []; // the keys' labels and your bar's numbers: a piece that rests never rests on them
  P.T = travelOf(O, P.D);
  P.parts = (geo.parts || []).map((p) => { const S2 = { x: (p.name.l + p.name.r) / 2, y: (p.bar.t + p.bar.b) / 2 }; return { ...p, S: S2, M: { x: S2.x, y: ((p.name.t + p.name.b) / 2 + S2.y) / 2 } }; });
  return P;
}

// ---------- the motions ----------
// Each: (recipe, points, ctx) → its pieces. A piece: { cls, text, size, w, h, ox, oy, x, y, keys, delay, dur, frames,
// fms, loop }; keys: [{ at (0–1 of dur), x, y (its box's top left), r (deg), s, o, e (easing to the next) }]. A motion
// that travels (TRAVELS) takes P.T to arrive and lands R.land after; one that plays where it lands is taken there by a
// streak, and its times start when it arrives.
const IN = 'cubic-bezier(.55,0,1,.45)', OUT = 'cubic-bezier(0,.55,.45,1)', GO = 'cubic-bezier(.3,0,.6,1)';
const piece = (cls, lines, size, extra) => ({ cls, text: lines.join('\n'), size, ...textSize(lines, size), ...extra });
const framed = (cls, R, size) => piece(cls, R.frames[0], size, { frames: R.frames.map((f) => f.join('\n')), fms: R.fms, loop: R.loop, ...textSize(R.frames.flat(), size), h: Math.max(...R.frames.map((f) => f.length)) * size * LH });
const pieceOf = (cls, R, size) => (R.frames ? framed(cls, R, size) : piece(cls, R.art, size, {}));
const ctrAt = (el, p) => ({ x: p.x - el.w / 2, y: p.y - el.h / 2 });
const angle = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
export const TRAVELS = new Set(['swing', 'punch', 'dart', 'wave', 'bolt', 'walk', 'fly', 'all']);

export const MOTIONS = {
  none: () => [],
  // A hammer: it flies in from where you fired it, raised over the part, and swings down about its handle's end onto
  // the part's name and bar, bounces, and is gone.
  swing(R, P, c) {
    const el = piece('art', R.art, R.size * c.grow, {});
    el.ox = el.w; el.oy = el.h * 0.5; // the handle's end
    const x = P.S.x - 2.5 * R.size * c.grow * CW, y = P.S.y + 2 - el.h, T = Math.max(1, P.T), L = R.land, o = { x: P.O.x - el.w * 0.7, y: P.O.y - el.h / 2 }; // scaled 0.6 about its handle's end, centred on where it starts
    return [track(el, 0, [{ t: 0, x: o.x, y: o.y, r: 0, s: 0.6, o: 0, e: GO }, { t: T * 0.2, o: 1 }, { t: T, x, y, r: 52, s: 1, e: IN }, { t: T + L, r: 0, e: OUT }, { t: T + L + 60, r: -5 }, { t: T + L + 130, r: 0 }, { t: T + L + 220, o: 1 }, { t: T + R.dur, o: 0, y: y + 3 }])];
  },
  // A ram: it flies in beside the part and punches into its name cell, recoils, fades.
  punch(R, P, c) {
    const el = piece('art', R.art, R.size * c.grow, {});
    const x = P.S.x - 3 * R.size * CW, y = P.M.y - el.h / 2, T = Math.max(1, P.T), L = R.land, o = ctrAt(el, P.O);
    return [track(el, 0, [{ t: 0, x: o.x, y: o.y, s: 0.6, o: 0, e: GO }, { t: T * 0.25, o: 1 }, { t: T, x: x + 110, y, s: 1, e: IN }, { t: T + L, x, e: OUT }, { t: T + L + 50, x: x + 8 }, { t: T + L + 140, x: x + 3 }, { t: T + L + 200, o: 1 }, { t: T + R.dur, x: x + 14, o: 0 }])];
  },
  // A needle (or any thin piece) darted straight into the part's name cell: its tip sticks, quivers, pulls out (or
  // goes on through, past it).
  dart(R, P, c) {
    const el = piece('art', R.art, R.size, {});
    const T = Math.max(1, P.T), r = angle(P.O, P.M), u = { x: Math.cos((r * Math.PI) / 180), y: Math.sin((r * Math.PI) / 180) };
    el.ox = el.w; el.oy = el.h / 2; // the tip
    const tip = (p) => ({ x: p.x - el.ox, y: p.y - el.oy });
    const from = tip({ x: P.O.x - u.x * 10, y: P.O.y - u.y * 10 }), to = tip(P.M);
    const last = R.through ? tip({ x: P.M.x + u.x * 46, y: P.M.y + u.y * 46 }) : tip({ x: P.M.x - u.x * 12, y: P.M.y - u.y * 12 });
    return [track(el, 0, [{ t: 0, ...from, r, o: 0, e: GO }, { t: T * 0.2, o: 1 }, { t: T, ...to, e: OUT }, { t: T + 50, r: r - 4 }, { t: T + 100, r: r + 3 }, { t: T + 150, r }, { t: T + R.dur * 0.7, o: 1 }, { t: T + R.dur, ...last, o: 0 }])];
  },
  // A wave: a few echoes of it, a beat apart, growing as they go.
  wave(R, P, c) {
    const out = [], n = c.lvl === 'full' ? 3 : 2, T = Math.max(1, P.T);
    for (let i = 0; i < n; i++) {
      const el = piece('art' + (i ? ' echo' : ''), R.art, R.size, {}), r = angle(P.O, P.M);
      out.push(track(el, i * 70, [{ t: 0, ...ctrAt(el, P.O), r, s: 0.6, o: 0 }, { t: T * 0.15, o: 1 - i * 0.2 }, { t: T, ...ctrAt(el, P.M), s: 1.25, o: 0.95 - i * 0.2, e: OUT }, { t: T + 220, s: 1.5, o: 0 }]));
    }
    return out;
  },
  // A bolt: characters along a jagged line, lit tip-first, flickering out (twice: a second bolt a beat behind).
  bolt(R, P, c) {
    const out = [], T = Math.max(1, P.T);
    const runs = R.twice ? [[P.O, 0, ''], [P.O, 150, ' echo']] : c.lvl === 'full' ? [[P.O, 0, ''], [{ x: P.O.x + 26, y: P.O.y + 4 }, 40, ' echo']] : [[P.O, 0, '']];
    for (const [from, lag, cls] of runs) {
      const dx = P.M.x - from.x, dy = P.M.y - from.y, dist = Math.hypot(dx, dy) || 1, nx = -dy / dist, ny = dx / dist;
      const steps = Math.max(5, Math.round(dist / (R.size * 0.95)));
      let prev = from;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, side = i === steps ? 0 : (i % 2 ? 1 : -1) * (4 + c.rnd() * 6);
        const p = { x: from.x + dx * t + nx * side, y: from.y + dy * t + ny * side };
        const sx = p.x - prev.x, sy = p.y - prev.y;
        const ch = Math.abs(sx) < Math.abs(sy) * 0.4 ? '|' : Math.abs(sy) < Math.abs(sx) * 0.4 ? '-' : (sx > 0) === (sy > 0) ? '\\' : '/';
        const el = piece('art bolt' + cls, [ch], R.size, {});
        const x = (p.x + prev.x) / 2 - el.w / 2, y = (p.y + prev.y) / 2 - el.h / 2, lit = Math.round(t * T * 0.85) + lag, life = Math.max(120, T + R.dur - lit - 60);
        // A bolt's characters stay where they're drawn: it comes out from the key's (or the bar's) edge, never over a
        // key's label or your bar's numbers.
        if (P.okeep.some((q) => overlaps({ l: x, t: y, r: x + el.w, b: y + el.h }, q))) { prev = p; continue; }
        out.push(track(el, lit, [{ t: 0, x, y, o: 0 }, { t: life * 0.05, o: 1 }, { t: life * 0.3, o: 0.35 }, { t: life * 0.42, o: 1 }, { t: life * 0.6, o: 0.5 }, { t: life * 0.72, o: 0.9 }, { t: life, o: 0 }]));
        prev = p;
      }
    }
    return out;
  },
  // Helpers scuttling out to the part (count of them): they walk onto its name cell, settle, blink out.
  walk(R, P, c) {
    const out = [], n = R.count || 1, T = Math.max(1, P.T);
    for (let k = 0; k < n; k++) {
      const el = pieceOf('art', R, R.size), off = (k - (n - 1) / 2) * el.w * 1.15;
      const a = ctrAt(el, P.O), b = ctrAt(el, { x: P.S.x + el.w * 0.6 + off, y: P.M.y }), ks = [{ t: 0, ...a, o: 0 }];
      for (let i = 1; i <= 6; i++) { const f = i / 6; ks.push({ t: T * f, x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) - (i % 2 ? 3 : 0), o: 1 }); }
      ks.push({ t: T + 80, y: b.y - 2 }, { t: T + 160, y: b.y }, { t: T + R.dur * 0.8, o: 1 }, { t: T + R.dur, o: 0 });
      out.push(track(el, k * 60, ks));
    }
    return out;
  },
  // Any piece flown to the part (spinning, or turned along its way), landing with a pop on its name cell.
  fly(R, P, c) {
    const el = pieceOf('art', R, R.size * c.grow), T = Math.max(1, P.T), r = R.turn ? angle(P.O, P.M) : 0, spin = R.spin || 0;
    const a = ctrAt(el, P.O), b = ctrAt(el, P.M), land = T + (R.land || 0);
    return [track(el, 0, [{ t: 0, ...a, r: r + spin, s: 0.6, o: 0, e: GO }, { t: T * 0.2, o: 1 }, { t: T, ...b, r, s: 1.25, e: OUT }, { t: T + 90, s: 1 }, { t: land + 160, o: 1 }, { t: T + R.dur, s: 1.1, o: 0 }])];
  },
  // A copy to every part on the board, a beat apart.
  all(R, P, c) {
    const out = [];
    P.parts.slice(0, 6).forEach((q, i) => {
      const el = pieceOf('art', R, R.size), T = Math.max(1, travelOf(P.O, q.M)), spin = R.spin || 0;
      out.push(track(el, i * 40, [{ t: 0, ...ctrAt(el, P.O), r: spin, s: 0.6, o: 0, e: GO }, { t: T * 0.2, o: 1 }, { t: T, ...ctrAt(el, q.M), r: 0, s: 1.2, e: OUT }, { t: T + 90, s: 1 }, { t: T + (R.land || 0) + 160, o: 1 }, { t: T + R.dur, o: 0 }]));
    });
    return out;
  },
  // --- these play where they land (a streak brings them; times from its arrival) ---
  // A blast where the part's burns went off: it grows through its frames on the name cell and is gone.
  blast(R, P, c) {
    const el = framed('art', R, R.size * c.grow), at = ctrAt(el, P.M);
    return [track(el, 0, [{ t: 0, ...at, s: 0.7, o: 0 }, { t: R.dur * 0.05, o: 1 }, { t: R.dur * 0.35, s: 1.1 }, { t: R.dur * 0.6, s: 1.25, o: 0.9 }, { t: R.dur, s: 1.35, o: 0 }])];
  },
  // A sign on the part (or its attack chip): it pops on (or drops on from above, or spins on), holds, and is gone (or
  // collapses to nothing).
  mark(R, P, c) {
    const el = pieceOf('art', R, R.size), at = ctrAt(el, P.M), D = R.dur, spin = R.spin || 0;
    const on = R.drop ? { t: 0, x: at.x, y: at.y - 30, o: 0, e: IN } : { t: 0, ...at, s: 1.6, r: spin, o: 0, e: OUT };
    return [track(el, 0, [on, { t: R.land, ...at, s: 1, r: 0, o: 1 }, { t: R.land + 60, s: R.drop ? 1.08 : 1 }, { t: R.land + 120, s: 1 }, { t: D - 180, o: 1, s: 1 }, { t: D, o: 0, s: R.collapse ? 0.1 : 1.05, r: R.collapse ? 180 : 0 }])];
  },
  // A cut across the part's attack chip (or its name cell): a line of slashes drawn through it, its sign over it.
  slash(R, P, c) {
    const out = [], n = 7, w = (P.chip ? P.chip.r - P.chip.l : 60) * 0.5 + 6;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1), el = piece('art cut', ['/'], R.size + 2, {});
      const p = { x: P.M.x - w + 2 * w * f, y: P.M.y + 10 - 20 * f };
      out.push(track(el, i * 14, [{ t: 0, ...ctrAt(el, p), o: 0, s: 1.4 }, { t: 40, o: 1, s: 1 }, { t: R.dur - 160 - i * 14, o: 1 }, { t: R.dur - i * 14, o: 0 }]));
    }
    if (R.art) {
      const el = piece('art', R.art, R.size, {}), at = ctrAt(el, { x: P.M.x, y: P.M.y - 20 });
      out.push(track(el, 0, [{ t: 0, ...at, s: 1.6, o: 0, e: OUT }, { t: R.land, s: 1, o: 1 }, { t: R.dur - 160, o: 1 }, { t: R.dur, o: 0 }]));
    }
    return out;
  },
  // Two halves closing in on the part from either side (wide: round its whole name cell), a bump as they meet.
  clamp(R, P, c) {
    const gap = R.wide ? (P.name.r - P.name.l) / 2 + 2 : 2, out = [];
    [[R.art[0], -1], [R.art[1], 1]].forEach(([art, side]) => {
      const el = piece('art', [art], R.size, {}), y = P.M.y - el.h / 2;
      const x = side < 0 ? P.M.x - gap - el.w : P.M.x + gap;
      out.push(track(el, 0, [{ t: 0, x: x + side * 50, y, o: 0, e: IN }, { t: R.land, x, o: 1, e: OUT }, { t: R.land + 50, x: x + side * 3 }, { t: R.land + 120, x }, { t: R.dur - 160, o: 1 }, { t: R.dur, o: 0 }]));
    });
    return out;
  },
  // A sign on your bar: it pops on over its middle (or spins on), holds, and is gone.
  stamp(R, P, c) { return MOTIONS.mark({ ...R, drop: false }, P, c); },
  // Brackets closing round your bar from either end.
  shell(R, P, c) {
    const out = [];
    [[R.art[0], -1], [R.art[1], 1]].forEach(([art, side]) => {
      const el = piece('art', [art], R.size, {}), y = P.M.y - el.h / 2, x = side < 0 ? P.bar.l - el.w - 1 : P.bar.r + 1;
      out.push(track(el, 0, [{ t: 0, x: x + side * 36, y, o: 0, e: IN }, { t: R.land, x, o: 1, e: OUT }, { t: R.land + 50, x: x - side * 3 }, { t: R.land + 120, x }, { t: R.dur - 160, o: 1 }, { t: R.dur, o: 0 }]));
    });
    return out;
  },
  // A piece running the length of your bar (reverse: right to left).
  sweep(R, P, c) {
    const el = piece('art', R.art, R.size, {}), y = P.M.y - el.h / 2, a = P.bar.l, b = P.bar.r - el.w;
    const [x0, x1] = R.reverse ? [b, a] : [a, b];
    return [track(el, 0, [{ t: 0, x: x0, y, o: 0 }, { t: 60, o: 1 }, { t: R.dur * 0.8, x: x1, o: 1 }, { t: R.dur, x: x1, o: 0 }])];
  },
  // A firewall on your bar: courses of bricks laid bottom-up over it (each settles onto the one under it).
  wall(R, P, c) {
    const out = [];
    const cols = Math.max(12, Math.floor((P.wall.r - P.wall.l) / (R.size * CW)));
    const course = (k) => Array.from({ length: cols }, (_, i) => ((i + k * 2) % 4 === 0 ? '|' : '_')).join('');
    const lines = c.lvl === 'full' ? 2 : 1, h = R.size * LH;
    // Its top course stops under your bar's numbers (they sit just over the bar): the wall reaches down past the bar
    // instead.
    const ceil = Math.max(-Infinity, ...P.okeep.filter((q) => q.l < P.bar.r && q.r > P.bar.l && q.b <= P.bar.t + 2).map((q) => q.b));
    const base = Math.max(P.wall.b, ceil + lines * h + 0.5);
    for (let k = 0; k < lines; k++) {
      const el = piece('art wall', [course(k)], R.size, {}), y = base - (k + 1) * el.h, D = R.dur - k * 120;
      out.push(track(el, k * 120, [{ t: 0, x: P.wall.l, y: y - 4, o: 0, e: OUT }, { t: D * 0.14, y, o: 1 }, { t: D * 0.8, o: 1 }, { t: D, o: 0 }]));
    }
    P.top = base - lines * h; // where its flames rise from
    return out;
  },
};

// The streak that takes an effect from where you fired it to where it plays: a bright head and a short trail.
function streak(P, c) {
  const out = [], T = P.T;
  [['*', 13, 0, ''], ['·', 11, 28, ' echo'], ['·', 10, 56, ' echo'], ['·', 9, 84, ' echo']].forEach(([ch, size, lag, cls]) => {
    const el = piece('art streak' + cls, [ch], size, {});
    out.push(track(el, lag, [{ t: 0, ...ctrAt(el, P.O), o: 0, e: GO }, { t: T * 0.15, o: 1 }, { t: Math.max(T * 0.86, 1), o: 1 }, { t: T, ...ctrAt(el, P.D), o: 0 }]));
  });
  return out;
}

// ---------- the particles ----------
// Each: (n, recipe, points, ctx, entry) → pieces, from where the piece lands (ctx.t0: when, in ms).
const bit = (rnd) => (rnd() < 0.5 ? '0' : '1');
const pick = (s, rnd) => s[Math.floor(rnd() * s.length)];
const mote = (cls, ch, size, x, y, delay, dur, keys) => fill({ cls, text: ch, size, w: size * CW, h: size * LH, x, y, delay, dur, keys: between(keys.map((k) => ({ ...k })), 'at') });

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
      out.push(mote('p', bit(c.rnd), size, x0, y0, c.t0 + c.rnd() * 50, 450 + c.rnd() * 250, [{ at: 0, x: x0, y: y0, o: 1, s: 0.7, e: OUT }, { at: 0.6, o: 1 }, { at: 1, x: x0 + Math.cos(a) * d, y: y0 + Math.sin(a) * d * 0.7, o: 0, s: 1, r: (c.rnd() - 0.5) * 90 }]));
    }
    return out;
  },
  // Water off a wave: ~ and , thrown up and falling back.
  splash(n, R, P, c) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.1 + c.rnd() * 0.8), d = 16 + c.rnd() * 40, x0 = P.M.x - 4, y0 = P.M.y - 6;
      const x1 = x0 + Math.cos(a) * d, y1 = y0 + Math.sin(a) * d * 0.7;
      out.push(mote('p', pick('~,.~', c.rnd), 12, x0, y0, c.t0 + c.rnd() * 40, 460 + c.rnd() * 160, [{ at: 0, x: x0, y: y0, o: 1, e: OUT }, { at: 0.5, x: x1, y: y1, o: 1 }, { at: 1, x: x1 + Math.cos(a) * 6, y: y1 + 22, o: 0 }]));
    }
    return out;
  },
  // Shards: ◇ and its splinters flying out spinning (steel: armor breaking).
  shards(n, R, P, c, b) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = c.rnd() * Math.PI * 2, d = 24 + c.rnd() * 50, size = 11 + Math.round(c.rnd() * 4), x0 = P.M.x - 4, y0 = P.M.y - 6;
      out.push(mote('p shard' + (b?.steel ? ' chit' : ''), pick('◇<>/\\◇', c.rnd), size, x0, y0, c.t0 + c.rnd() * 30, 420 + c.rnd() * 200, [{ at: 0, x: x0, y: y0, o: 1, s: 0.8, e: OUT }, { at: 1, x: x0 + Math.cos(a) * d, y: y0 + Math.sin(a) * d * 0.7 + 8, o: 0, r: (c.rnd() - 0.5) * 360 }]));
    }
    return out;
  },
  // Garbage flickering over the part: symbols that blink on and off where they are.
  glitch(n, R, P, c) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const x0 = P.M.x - 40 + c.rnd() * 80, y0 = P.M.y - 12 + c.rnd() * 16, d = 300 + c.rnd() * 200;
      out.push(mote('p', pick('#%&$@!?;', c.rnd), 12, x0, y0, c.t0 + c.rnd() * 120, d, [{ at: 0, x: x0, y: y0, o: 0 }, { at: 0.15, o: 1 }, { at: 0.35, o: 0.1, x: x0 + 3 }, { at: 0.55, o: 1, x: x0 - 2 }, { at: 0.8, o: 0.4 }, { at: 1, o: 0 }]));
    }
    return out;
  },
  // Drops falling off the part (rot, poison).
  drip(n, R, P, c) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const x0 = P.M.x - 30 + c.rnd() * 60, y0 = P.M.y, d = 420 + c.rnd() * 200;
      out.push(mote('p', pick('.:', c.rnd), 12, x0, y0, c.t0 + c.rnd() * 160, d, [{ at: 0, x: x0, y: y0, o: 0 }, { at: 0.2, o: 1 }, { at: 1, y: y0 + 16 + c.rnd() * 18, o: 0 }]));
    }
    return out;
  },
  // What it drains: + flowing off the part to your bar.
  siphon(n, R, P, c) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const x0 = P.M.x - 4 + (c.rnd() - 0.5) * 20, y0 = P.M.y - 6, d = 380 + c.rnd() * 140;
      out.push(mote('p', '+', 12, x0, y0, c.t0 + 60 + i * 40, d, [{ at: 0, x: x0, y: y0, o: 0, e: GO }, { at: 0.2, o: 1 }, { at: 0.85, o: 1 }, { at: 1, x: P.Y.x - 4 + (c.rnd() - 0.5) * 60, y: P.Y.y - 6, o: 0 }]));
    }
    return out;
  },
  // Rising off your bar: + for a heal (or what the row says: ~ for Vent's steam, x for what OOM Kill ends).
  rise(n, R, P, c, b) {
    const out = [], bar = P.ybar || P.bar, chars = b?.chars || R.chars || '+';
    for (let i = 0; i < n; i++) {
      const x0 = bar.l + (bar.r - bar.l) * c.rnd() - 4, y0 = bar.t - 4, d = 420 + c.rnd() * 220;
      out.push(mote('p rise', pick(chars, c.rnd), 12 + Math.round(c.rnd() * 3), x0, y0, c.t0 + c.rnd() * 220, d, [{ at: 0, x: x0, y: y0, o: 0 }, { at: 0.2, o: 1 }, { at: 1, x: x0 + (c.rnd() - 0.5) * 8, y: y0 - 16 - c.rnd() * 18, o: 0 }]));
    }
    return out;
  },
  // A few sparks right where it went in.
  spark(n, R, P, c) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const x0 = P.M.x - 3, y0 = P.M.y - 5, d = 220 + c.rnd() * 160, a = c.rnd() * Math.PI * 2;
      out.push(mote('p', pick("*'+.", c.rnd), 10, x0, y0, c.t0 + c.rnd() * 40, d, [{ at: 0, x: x0, y: y0, o: 1, e: OUT }, { at: 1, x: x0 + Math.cos(a) * (8 + c.rnd() * 16), y: y0 + Math.sin(a) * (6 + c.rnd() * 10), o: 0 }]));
    }
    return out;
  },
  // The echo coming back: arcs spreading out both ways from where it landed, ( on the left and ) on the right.
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
  // Flames (1s and 0s, or the row's characters): they rise off the part's bar up over its name (your bar: off the
  // wall's top) and go out. Thermal Runaway's grow as it burns.
  flame(n, R, P, c) {
    const out = [];
    const you = R.on === 'you';
    // A fire's shape: most of it in the middle, tallest there; on a part it spans its name cell and climbs to about
    // its row's top.
    const l = you ? P.wall.l : P.bar.l, w = you ? P.wall.r - P.wall.l : P.bar.r - P.bar.l;
    const base = you ? P.top : P.S.y + 4;
    const rise = you ? 18 : Math.max(18, base - P.row.t - 6) * (c.lvl === 'full' ? 1 : 0.7);
    const spread = Math.max(0, R.dur - (c.t0 - c.arrive) - 460);
    for (let i = 0; i < n; i++) {
      const u = you ? c.rnd() : (c.rnd() + c.rnd()) / 2, mid1 = 1 - Math.abs(u - 0.5) * 2, when = c.rnd();
      const size = Math.round((you ? 10 : R.size) * (0.75 + mid1 * 0.4) * (R.grow ? 0.7 + when * 0.6 : 1));
      const h = size * LH, x0 = Math.max(l, l + u * w - (size * CW) / 2), y0 = base - h, life = 300 + c.rnd() * 220;
      const hot = c.rnd() < 0.25 + mid1 * 0.2 ? ' hot' : '';
      const up = rise * (you ? 0.6 + c.rnd() * 0.6 : 0.35 + mid1 * 0.65) * (0.75 + c.rnd() * 0.25), lean = (0.5 - u) * 8;
      const ch = R.chars ? pick(R.chars, c.rnd) : bit(c.rnd);
      out.push(mote('p flame' + hot, ch, size, x0, y0, c.t0 + when * spread, life, [{ at: 0, x: x0, y: y0, o: 0, s: 1 }, { at: 0.15, o: 1 }, { at: 0.55, o: 0.85, x: x0 + lean * 0.5 + (c.rnd() - 0.5) * 4, y: y0 - up * 0.5 }, { at: 1, x: x0 + lean + (c.rnd() - 0.5) * 6, y: y0 - up, o: 0, s: 0.55 }]));
    }
    return out;
  },
  // Embers on the part's bar: small 1s and 0s that flicker where they sit.
  ember(n, R, P, c) {
    const out = [], size = 8;
    const spread = Math.max(0, R.dur - (c.t0 - c.arrive) - 500);
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
// A recipe on a board → { els, impact, dur, travel, from }, or null if it can't play there (no part, no bar of yours).
// opts: lvl ('full' | 'calm'), power (0–1), crit, result ('hit' | 'crit' | 'chit'), kind ('you' | 'crew'), rnd,
// origin ('key' | 'bar' | 'here').
export function layout(R, geo, { lvl = 'full', power = 0.3, crit = false, result = 'hit', kind = 'you', rnd = Math.random, origin = 'bar' } = {}) {
  if (!R || !lvl || !geo) return null;
  const P = pointsOf(R, geo, origin);
  if (!P) return null;
  const travels = TRAVELS.has(R.motion), T = P.T;
  // A hit that travels lands land ms after it arrives; one that plays where it lands starts when the streak gets there.
  const arrive = T, impact = T + (R.land || 0);
  const c = { lvl, power: Math.max(0, Math.min(1, power)), crit, rnd, t0: impact, arrive, grow: 1 + Math.min(1, power) * 0.12 };
  const tint = kind === 'crew' ? ' crew' : crit ? ' crit' : R.tone === 'steel' ? ' chit' : '';
  let els = (MOTIONS[R.motion] || MOTIONS.none)(R, P, c);
  if (!travels) {
    for (const el of els) el.delay += arrive;
    if (T > 0) els = [...streak(P, c), ...els];
  }
  els.forEach((el) => { el.cls += tint; });
  for (const b of R.burst || []) {
    const n = countOf(b, { lvl, power, crit });
    if (!n) continue;
    // On every part (all): a share of it each, when its copy arrives.
    const spots = R.motion === 'all' && P.parts.length ? P.parts.slice(0, 6).map((q, i) => ({ P: { ...P, S: q.S, M: q.M, bar: q.bar, row: q.row, floor: q.name.b + 1 }, t0: i * 40 + Math.max(1, travelOf(P.O, q.M)) + (R.land || 0), n: Math.max(1, Math.round(n / 2)) })) : [{ P, t0: impact, n }];
    for (const s of spots) {
      for (const el of PARTICLES[b.style](s.n, R, s.P, { ...c, t0: s.t0 }, b)) {
        el.cls += kind === 'crew' ? ' crew' : result === 'chit' && !/\bflame\b|\brise\b/.test(el.cls) ? ' chit' : crit ? ' crit' : R.tone === 'steel' ? ' chit' : '';
        els.push(el);
      }
    }
  }
  // Every piece is gone by CAP and ends unseen: nothing stays behind.
  for (const el of els) {
    if (el.delay + el.dur > CAP) el.dur = Math.max(1, CAP - el.delay);
    el.keys[el.keys.length - 1].o = 0;
  }
  return { els, impact, travel: T, from: P.from, dur: Math.max(...els.map((e) => e.delay + e.dur)) };
}

// ---------- on the page ----------
// One layer over the whole page, fixed on <body> (as lash.mjs's is), placed at the board's corner and scaled with it,
// so its pixels are the board's: it reaches the parts, your bar in the HUD and the tray alike. play(): an effect →
// its plan if it played (the plain hit effect then sits out), false if it didn't.
//   keyEl(id): the ability's key in the tray (default: #tray's button for it), when it's on screen (no key, or a key
//   that isn't on screen: it starts at your bar).
export function createAbilityFx(board, { canMove = () => true, level = () => 'full', mineBar = () => document.querySelector('.hud-bar.mine .bigbar'), mineNums = () => document.querySelector('.hud-bar.mine .bar-top'), keyEl = (id) => document.querySelector(`#tray .ability[data-ability="${id}"]`), keys = () => [...document.querySelectorAll('#tray .ability')] } = {}) {
  let layer = null;
  const ground = (f) => {
    if (!layer?.isConnected) { layer = document.createElement('div'); layer.id = 'abilityfx'; layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(layer); }
    Object.assign(layer.style, { left: f.box.left + 'px', top: f.box.top + 'px', transform: `scale(${f.scale})` });
    return layer;
  };
  const frame = () => { const box = board.getBoundingClientRect(); return { box, scale: box.width / (board.offsetWidth || 1) || 1 }; };
  const local = (f, el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return rect((r.left - f.box.left) / f.scale, (r.top - f.box.top) / f.scale, r.width / f.scale, r.height / f.scale);
  };
  const shows = (el) => { const r = el?.getBoundingClientRect(); return !!r && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < (globalThis.innerHeight ?? Infinity); };
  const pad = (q) => q && { l: q.l - 1, t: q.t - 1, r: q.r + 1, b: q.b + 1 };
  const rowGeo = (f, row) => {
    const p = { row: local(f, row), cell: local(f, row.querySelector('.bname')), name: local(f, row.querySelector('.part-top')), bar: local(f, row.querySelector('.part-bar')) };
    if (!(p.row && p.cell && p.name && p.bar)) return null;
    // Its attack chip: an attack (its icon) or a tell, not a routine's cue, your command, a cut, a patch or a lock.
    const chip = [...row.querySelectorAll('.intent')].find((x) => (x.classList?.contains('tell') || x.querySelector?.('.ico')) && shows(x));
    p.chip = chip ? local(f, chip) : null;
    return p;
  };
  // The page as layout() reads it.
  function measure(row, { ability = null, key = null, noKey = false } = {}) {
    const f = frame(), you = board.querySelector('.brow.byou'), rows = [...board.querySelectorAll('.bpart')];
    const label = you?.querySelector('.bname b');
    const keep = [...rows.flatMap((p) => [pad(local(f, p.querySelector('.part-top'))), pad(local(f, p.querySelector('.part-tags')))]), pad(local(f, label))].filter(Boolean);
    const bar = mineBar(), nums = mineNums(), k = key || (ability ? keyEl(ability) : null);
    const geo = {
      f, keep,
      originKeep: [pad(local(f, nums)), ...keys().filter(shows).map((x) => pad(local(f, x)))].filter(Boolean),
      mine: bar && shows(bar) ? { bar: local(f, bar), nums: nums ? local(f, nums) : null } : null,
      key: !noKey && k && shows(k) ? local(f, k) : null,
      parts: rows.filter((x) => !x.classList?.contains('dying')).map((x) => rowGeo(f, x)).filter(Boolean),
      part: row ? rowGeo(f, row) : null,
    };
    return geo;
  }
  function place(el, onto, shift) {
    const span = document.createElement('span');
    span.className = 'afx ' + el.cls;
    span.style.fontSize = el.size + 'px';
    span.style.width = el.w.toFixed(1) + 'px';
    span.style.height = el.h.toFixed(1) + 'px';
    span.style.transformOrigin = `${(el.ox ?? el.w / 2).toFixed(1)}px ${(el.oy ?? el.h / 2).toFixed(1)}px`;
    onto.appendChild(span);
    const delay = el.delay + shift;
    const keys = el.keys.map((k) => ({ offset: k.at, opacity: k.o, transform: `translate(${k.x.toFixed(1)}px, ${k.y.toFixed(1)}px) rotate(${(k.r || 0).toFixed(1)}deg) scale(${(k.s ?? 1).toFixed(3)})`, ...(k.e ? { easing: k.e } : {}) }));
    try {
      span.animate(keys, { duration: el.dur, delay, fill: 'forwards' }); // hidden (style.css .afx) until it starts
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
          { duration: el.fms * n, delay, iterations: el.loop ? Math.ceil(el.dur / (el.fms * n)) : 1, fill: 'both' });
      });
    } catch { span.remove(); return; }
    setTimeout(() => span.remove(), Math.max(0, delay + el.dur) + 60);
  }
  // key: the table's; row: the part's board row (null for your bar); opts: power, crit, result, kind, origin ('key' |
  // 'bar' | 'here'), ability (its key in the tray), keyEl (a key to start from instead), noKey (as if its key weren't on
  // screen: the playtest's preview of the fallback), landIn (ms from now its number shows: it lands then), onImpact.
  // Its plan (layout) on the page as it is now, without playing it: when it would land (app.js waits its numbers for it).
  function plan(key, row, { power = 0.3, crit = false, result = 'hit', kind = 'you', origin = 'key', ability = null, keyEl: kEl = null, noKey = false, lvl: force } = {}) {
    const R = recipeOf(key);
    const lvl = force || levelOf({ level: level(), motion: canMove() });
    if (!R || !lvl) return null;
    if (R.on !== 'you' && !row?.isConnected) return null;
    const geo = measure(R.on === 'you' ? null : row, { ability, key: kEl, noKey });
    const out = layout(R, geo, { lvl, power, crit, result, kind, origin });
    return out && Object.assign(out, { geo });
  }
  function play(key, row, { landIn = null, onImpact = null, ...opts } = {}) {
    const p = plan(key, row, opts);
    if (!p) return false;
    // It lands with its number: started early by its travel (app.js waits the numbers for it: afxLead), or partly
    // through if the number is due sooner.
    const shift = landIn == null ? 0 : landIn - p.impact;
    const onto = ground(p.geo.f);
    for (const el of p.els) place(el, onto, shift);
    if (onImpact) setTimeout(onImpact, Math.max(0, p.impact + shift));
    return p;
  }
  return { play, plan, measure, layer: () => layer };
}

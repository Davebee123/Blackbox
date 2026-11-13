// Presentation only: each virus is ASCII art, built as a cloud of 3D points tagged by part and
// drawn as terminal characters on a fixed grid. Every point has a surface normal, so the lit side
// draws in dense characters (#%@) and the far side in light ones (.:-), with 0/1 flickering
// through it. Parts animate (serpents undulate, tendrils sway, rings orbit, blades spin, cores
// breathe), light up when hit, pulse red when their attack lands this cycle, and dissipate into
// drifting 1s and 0s when broken. An attacking part lunges at you: it pulls back, then strikes out of
// its window, drawn bigger and nearer on a layer over the page (#art-out), and snaps back. Reads
// state; never changes it.

import { bossShape, bossKit, BOSS_BUILD, BOSS_STRIKES } from './boss-art.mjs';

const COLORS = { amber: '#f1b92f', bright: '#fff2c8', hot: '#ff5b3d', dim: '#7e5311', gold: '#ffd85c', deep: '#a8741c' };
const BASE = { ...COLORS }; // a floor's stage tints the body (stage.mjs colors); hot, a strike, stays red
const RAMP = ' .,:-=+*#%@'; // dark → lit
const SHARDS = '#*+=:.01';
const BITS = '0101010#*';
const SPARKS = '*+/-x1010';
const PACKETS = '[]#=01010110';

// Which shape a virus wears: a boss its own (boss-art.mjs), then its strain's, a guard's or a room body's own kind, its family's.
const STRAIN_SHAPE = { keylogger: 'eye', hashrat: 'cube', floodgate: 'fountain', leech: 'tick', sleeper: 'cocoon', patchwork: 'crab', flicker: 'wraith', extortion: 'padlock', echo: 'rings', bricker: 'block', overrun: 'hive' };
const OWN_SHAPE = { watchdog: 'hound', sentinel: 'eye', crawler: 'spider', shredder: 'blades', bouncer: 'block', tracer: 'dish', trojan: 'horse', cryptominer: 'boiler', wiper: 'magnet', botnet: 'mast', logicbomb: 'bomb' };
const FAMILY_SHAPE = { ransomware: 'crab', worm: 'serpent', ghostroot: 'wraith', watchdog: 'hound' };
export const shapeOf = (v) => bossShape(v) || STRAIN_SHAPE[v.strain] || OWN_SHAPE[v.family] || FAMILY_SHAPE[v.art] || FAMILY_SHAPE[v.family] || 'crab';

// A small seeded random, so each virus keeps its own variation.
function rng(seed) { let x = (seed >>> 0) || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const BREAK_MS = 1500; // a broken part dissolving
const BOSS_SWING = 0.45; // how far a boss turns to either side (radians): it never turns away

// The lunge's reach, 0–1, at a share of its time: a short pull back (negative), a fast strike, a hold, an ease home.
export function lungeAt(u) {
  if (u <= 0 || u >= 1) return 0;
  if (u < 0.16) return -0.18 * Math.sin((u / 0.16) * Math.PI / 2);
  if (u < 0.34) { const k = (u - 0.16) / 0.18; return -0.18 + 1.18 * (1 - (1 - k) ** 3); }
  if (u < 0.46) return 1;
  const k = (u - 0.46) / 0.54; return (1 - k) ** 2 * (1 + 2 * k) * 1; // smooth back to rest
}
// How each body attacks: the move its part makes coming out of the window, and how long it takes (ms).
//   snap: two quick jabs, the pincers closing on each;   strike: darts down at you, whipping side to side;
//   phase: blinks out, reappears at the glass, smeared;   stab: its limbs jab out one after another;
//   shock: the part stays, rears and throws rings of characters that swell out past the window at you;
//   grind: the part spins up where it is and sprays sparks that fly out at the glass;
//   rake: legs swipe out at the glass and drag down it, one after another;
//   headbutt: rears up, then slams its head out at you;  spill: a hatch bursts and pours bits out over the page.
//   pulse: swells out at you in a double heartbeat;      lash: whips across the glass, its far end trailing;
//   swarm: its pieces fly out at you each its own way and come home;
//   volley: recoils three times, each throwing a clump of characters straight at you;
//   beam: shudders and pours a stream of characters that sweeps across the glass.
// Every body moves its core and its limbs (the special part) differently: { core, limb }.
// The body never leaves: only the attacking part comes out, or what it throws.
export const STRIKES = { snap: 700, strike: 520, phase: 680, stab: 780, shock: 760, grind: 720, rake: 760, headbutt: 640, spill: 780, pulse: 700, lash: 640, swarm: 820, volley: 760, beam: 760, lunge: 560 };
const STRIKE_OF = {
  crab: { core: 'pulse', limb: 'snap' }, // the lock face throbs; the claws snap
  padlock: { core: 'volley', limb: 'lash' }, // the face spits; the shackle swings
  serpent: { core: 'strike', limb: 'lash' }, // the head darts; the tail whips
  wraith: { core: 'phase', limb: 'stab' }, // the node blinks to the glass; the roots spear out
  hound: { core: 'shock', limb: 'rake' }, // barks; rakes
  eye: { core: 'beam', limb: 'shock' }, // a gaze sweeps you; the watcher rings ripple out
  spider: { core: 'volley', limb: 'stab' }, // spits; legs jab
  tick: { core: 'pulse', limb: 'strike' }, // swells; the mouthparts dart
  blades: { core: 'shock', limb: 'grind' }, // the hub thumps; the discs grind
  block: { core: 'shock', limb: 'grind' }, gate: { core: 'shock', limb: 'grind' }, // the wall booms; the ring spins up
  dish: { core: 'shock', limb: 'beam' }, // the base hums; the coil beams
  cube: { core: 'volley', limb: 'grind' }, // the core spits; the cube grinds
  fountain: { core: 'spill', limb: 'strike' }, // the column floods; the streams dart
  cocoon: { core: 'volley', limb: 'phase' }, // the thread spits; the cell blinks
  rings: { core: 'pulse', limb: 'shock' }, // the core throbs; the rings ripple out
  hive: { core: 'pulse', limb: 'swarm' }, // the queen cell throbs; the cells swarm
  horse: { core: 'spill', limb: 'headbutt' }, // the hatch spills; the head slams
  boiler: { core: 'pulse', limb: 'spill' }, // the coil throbs; the tank vents
  magnet: { core: 'grind', limb: 'snap' }, // the drive spins up; the arms snap
  mast: { core: 'shock', limb: 'beam' }, // the housing booms; the dish beams
  bomb: { core: 'pulse', limb: 'shock' }, // the clock throbs; the bomb blasts rings
};
export const strikeOf = (shape, limb = false) => { const s = STRIKE_OF[shape] || BOSS_STRIKES[shape] || 'lunge'; return typeof s === 'string' ? s : limb ? s.limb : s.core; };
const clamp01 = (u) => Math.max(0, Math.min(1, u));

// One point of an attacking part at u (0–1) of its strike: reach (how near it comes, 0–1, negative pulls back),
// dx/dy (how far it moves across, in model units; c is the part's middle on screen), hide (gone this frame) and
// glitch (drawn as 1s and 0s).
export function strikeAt(style, u, i, x, y, c) {
  const ox = x - c.x, oy = y - c.y;
  switch (style) {
    case 'snap': { // two jabs, the second harder; the claw closes as it lands
      const r = u < 0.45 ? lungeAt(u / 0.45) * 0.7 : lungeAt((u - 0.45) / 0.55);
      const close = Math.max(0, r) * 0.4;
      return { reach: r, dx: -ox * close, dy: -oy * close * 0.3 };
    }
    case 'strike': { // darts at you and down toward your bar, whipping across as it goes
      const r = lungeAt(u), w = Math.max(0, r);
      return { reach: r * 1.1, dx: Math.sin(oy * 0.09 + u * 22) * 16 * w, dy: w * 26 };
    }
    case 'phase': { // gone, then at the glass all at once, each point a little late (a smear), then back
      const v = (u - (i % 9) * 0.02) / 0.84; // the smear's lag fits inside the strike
      if (v > 0.1 && v < 0.28) return { reach: 0, dx: 0, dy: 0, hide: true };
      if (v <= 0.1) return { reach: -0.15 * Math.sin((clamp01(v / 0.1)) * Math.PI / 2), dx: 0, dy: 0, glitch: v > 0.06 };
      const r = v < 0.5 ? 1 : lungeAt(0.46 + ((v - 0.5) / 0.5) * 0.54);
      return { reach: r, dx: v < 0.36 ? ((i * 7) % 11 - 5) * 1.6 : 0, dy: 0, glitch: v < 0.36 };
    }
    case 'shock': { // breathes in, then shudders in place as each ring goes, and settles
      if (u < 0.18) return { reach: -0.25 * Math.sin((u / 0.18) * Math.PI / 2), dx: 0, dy: 0 };
      const k = (u - 0.18) / 0.82, shake = u < 0.6 ? 1.8 : 0;
      return { reach: -0.25 * (1 - k) ** 2 + 0.2 * Math.sin(Math.PI * k), dx: ((i * 13) % 7 - 3) * shake * Math.sin(u * 90), dy: 0 };
    }
    case 'rake': { // each leg in turn swipes out at the glass and drags down it, raking inward
      const a = (Math.atan2(oy, ox) / (Math.PI * 2) + 0.5) % 1, r = lungeAt(clamp01((u - a * 0.3) / 0.7)), w = Math.max(0, r);
      return { reach: r * 0.9, dx: -Math.sign(ox) * w * 10, dy: w * w * 26 };
    }
    case 'headbutt': { // rears up, slams out and down at you, comes home
      if (u < 0.25) { const k = u / 0.25; return { reach: -0.2 * k, dx: 0, dy: -16 * Math.sin((k * Math.PI) / 2) }; }
      if (u < 0.45) { const k = (u - 0.25) / 0.2; return { reach: -0.2 + 1.2 * (1 - (1 - k) ** 3), dx: 0, dy: -16 + 34 * k }; }
      const k = (u - 0.45) / 0.55, e = (1 - k) ** 2 * (1 + 2 * k);
      return { reach: e, dx: 0, dy: 18 * e };
    }
    case 'spill': { // swells as the hatch bursts, then shudders while it pours
      const w = Math.sin(Math.PI * u);
      return { reach: w * 0.15, dx: u > 0.15 && u < 0.75 ? ((i * 13) % 7 - 3) * 0.8 * Math.sin(u * 80) : 0, dy: 0 };
    }
    case 'pulse': { // a double heartbeat: a small swell, then a big one at you
      const b = u < 0.35 ? 0.5 * Math.sin((u / 0.35) * Math.PI) : u < 0.85 ? 0.95 * Math.sin(((u - 0.35) / 0.5) * Math.PI) : 0;
      return { reach: b * 0.6, dx: ox * b * 0.5, dy: oy * b * 0.5 };
    }
    case 'lash': { // whips across the glass; the far end trails behind
      const lag = Math.min(0.15, Math.hypot(ox, oy) / 400), v = clamp01((u - lag) / 0.85), w = Math.max(0, lungeAt(v));
      return { reach: lungeAt(v) * 0.9, dx: w * 34 * Math.cos(Math.PI * v), dy: w * 8 };
    }
    case 'swarm': { // each piece flies out its own way, a little after the last, and back
      const ang = i * 2.39996, v = clamp01((u - (i % 11) * 0.022) / 0.75), r = lungeAt(v), w = Math.max(0, r);
      return { reach: r * 0.55, dx: Math.cos(ang) * w * 20, dy: Math.sin(ang) * w * 14 };
    }
    case 'volley': { // three recoils, one per clump it throws
      return { reach: u < 0.75 ? -0.15 * Math.abs(Math.sin(u * 4 * Math.PI)) : 0, dx: 0, dy: 0 };
    }
    case 'beam': { // leans in and shudders while it pours
      const w = Math.sin(Math.PI * u);
      return { reach: w * 0.12, dx: u > 0.15 && u < 0.8 ? ((i * 13) % 7 - 3) * 0.6 * Math.sin(u * 90) : 0, dy: 0 };
    }
    case 'grind': { // spins up where it is, leaning in a little, and spins down
      const w = Math.sin(Math.PI * u), a = Math.PI * 8 * (u - Math.sin(2 * Math.PI * u) / (2 * Math.PI)); // whole turns: it ends where it began
      return { reach: w * 0.18, dx: ox * Math.cos(a) - oy * Math.sin(a) - ox, dy: ox * Math.sin(a) + oy * Math.cos(a) - oy };
    }
    default: return { reach: lungeAt(u), dx: 0, dy: 0 };
  }
}

// What a part throws while it strikes: the moments its rings go (shock), how hard it sprays (grind, 0–1).
export const SHOCK_RINGS = [0.2, 0.34, 0.48];
export const VOLLEYS = [0.125, 0.375, 0.625]; // when a volley's clumps go: at the bottom of each recoil
export const sprayAt = (u) => (u > 0.15 && u < 0.75 ? Math.sin(((u - 0.15) / 0.6) * Math.PI) : 0);

// When a broken part's point lets go, 0–1 of the dissolve: stable per point, so it crumbles in a scatter.
export const releaseOf = (i) => ((i * 0.6180339887) % 1) * 0.8;

export function createArt({ getState, canMove, getSelected, getNowSources, breakout = () => true, stage = null }) {
  let canvas = null, ctx = null, previous = 0, angle = 0, clock = 0;
  let builtFor = '', points = [], anims = [], radius = 1, rx = 1, ry = 1, style = { core: 'lunge', limb: 'lunge' };
  let enteredFor = null, camBase = 300;
  let cam = 300, facing = false, midX = 0, midY = 0; // a boss: seen from further off, facing you, fitted to the window
  const hits = new Map();
  let shake = null, glitch = 0;
  const shards = [];
  const flung = []; // characters a strike throws out over the page (shock rings, grind sparks)
  const rain = [];
  // The layer an attacking part strikes out onto: fixed over the page, takes no input, made on first use.
  let out = null, octx = null, outDirty = false;
  const outLayer = () => {
    if (!out?.isConnected) { out = document.createElement('canvas'); out.id = 'art-out'; out.setAttribute('aria-hidden', 'true'); document.body.appendChild(out); octx = out.getContext('2d'); }
    return octx;
  };

  // ---------- building: primitives with normals ----------
  const add = (x, y, z, nx, ny, nz, region, a = 0) => { const l = Math.hypot(nx, ny, nz) || 1; points.push({ x, y, z, nx: nx / l, ny: ny / l, nz: nz / l, region, a }); };
  const anim = (spec) => anims.push(spec) - 1;
  function orb(cx, cy, cz, rx, ry, rz, region, a = 0, step = 0.2) {
    for (let u = 0; u < Math.PI * 2; u += step) for (let w = 0.12; w < Math.PI; w += step) {
      const ex = Math.cos(u) * Math.sin(w), ey = Math.cos(w), ez = Math.sin(u) * Math.sin(w);
      add(cx + rx * ex, cy + ry * ey, cz + rz * ez, ex / rx, ey / ry, ez / rz, region, a);
    }
  }
  // A tube from one point to another (limbs, tendrils, spikes when r1 → 0).
  function tube(p, q, r0, r1, region, a = 0, step = 0.06) {
    const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], len = Math.hypot(...d) || 1, dir = d.map((v) => v / len);
    const up = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = [dir[1] * up[2] - dir[2] * up[1], dir[2] * up[0] - dir[0] * up[2], dir[0] * up[1] - dir[1] * up[0]];
    const ul = Math.hypot(...u); u.forEach((v, i) => (u[i] = v / ul));
    const w = [dir[1] * u[2] - dir[2] * u[1], dir[2] * u[0] - dir[0] * u[2], dir[0] * u[1] - dir[1] * u[0]];
    for (let t = 0; t <= 1; t += step / Math.max(0.5, len / 40)) {
      const r = r0 + (r1 - r0) * t, n = Math.max(3, Math.round(r * 1.2));
      for (let k = 0; k < n; k++) {
        const th = (k / n) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
        const nx = u[0] * c + w[0] * s, ny = u[1] * c + w[1] * s, nz = u[2] * c + w[2] * s;
        add(p[0] + d[0] * t + nx * r, p[1] + d[1] * t + ny * r, p[2] + d[2] * t + nz * r, nx, ny, nz, region, a);
      }
    }
  }
  // A flat ring (torus-ish band) around the y axis, tilted.
  function ring(cx, cy, cz, r, thick, region, a = 0, tilt = 0) {
    const bands = thick >= 2 ? 3 : 1;
    for (let th = 0; th < Math.PI * 2; th += 0.11) for (let k = 0; k < bands; k++) {
      const rr = r + (bands > 1 ? (k - 1) * thick : 0), x = Math.cos(th) * rr, z = Math.sin(th) * rr;
      const y = z * Math.sin(tilt), z2 = z * Math.cos(tilt);
      add(cx + x, cy + y, cz + z2, Math.cos(th), 0.4 * (k - 1), Math.sin(th), region, a);
    }
  }
  function box(cx, cy, cz, sx, sy, sz, region, a = 0, step = 4) {
    for (const [ax, sign] of [[0, -1], [0, 1], [1, -1], [1, 1], [2, -1], [2, 1]]) {
      const size = [sx, sy, sz];
      const [i, j] = [0, 1, 2].filter((k) => k !== ax);
      for (let p = -size[i]; p <= size[i]; p += step) for (let q = -size[j]; q <= size[j]; q += step) {
        const v = [0, 0, 0], n = [0, 0, 0];
        v[ax] = sign * size[ax]; v[i] = p; v[j] = q; n[ax] = sign;
        add(cx + v[0], cy + v[1], cz + v[2], n[0], n[1], n[2], region, a);
      }
    }
  }
  function disc(cx, cy, cz, r, region, a = 0, teeth = 0) {
    for (let rr = 4; rr <= r; rr += 3.2) for (let th = 0; th < Math.PI * 2; th += 2.6 / rr) {
      const tr = teeth && rr > r - 4 && Math.floor((th / (Math.PI * 2)) * teeth * 2) % 2 ? rr + 5 : rr;
      add(cx + Math.cos(th) * tr, cy + Math.sin(th) * tr, cz, 0.15 * Math.cos(th), 0.15 * Math.sin(th), -1, region, a);
    }
  }

  // ---------- shapes ----------
  // Roles: B = the basic part, S = the special part (Redundant pairs map @L/@R to a/b), body = the
  // armor shell (bright while chits remain), frag1..3 = fragment slots.
  function build(v) {
    points = []; anims = [0].map(() => ({ k: 'none' }));
    const r = rng(hash(v.id)), jit = (x, f = 0.15) => x * (1 - f + r() * f * 2);
    const B = (v.parts.find((p) => !p.special && p.kind !== 'fragment') || v.parts[0])?.id || 'pulse';
    const specialBase = v.parts.find((p) => p.special)?.id.replace(/[ab]$/, '') || B;
    const S = (side = 1) => `${specialBase}@${side < 0 ? 'L' : 'R'}`;
    const breathe = anim({ k: 'breathe', c: [0, 0, 0], amp: 0.06, speed: 2.2 });
    const shape = shapeOf(v);
    style = { core: strikeOf(shape), limb: strikeOf(shape, true) };
    const sway = (anchor, amp = 0.25, speed = 1.4, phase = r() * 6) => anim({ k: 'sway', c: anchor, amp, speed, phase });
    const orbit = (c, speed, tilt = 0) => anim({ k: 'orbit', c, speed, tilt });
    const spin = (c, speed, axis = 'z') => anim({ k: 'spin', c, speed, axis });

    if (BOSS_BUILD[shape]) {
      BOSS_BUILD[shape](bossKit({ add, orb, tube, ring, box, disc, anim, sway, orbit, spin, B, S, r, jit, v }));
    } else if (shape === 'crab') {
      // Ransomware: an armored shell, a padlock shackle on top, claws, and a ring of legs.
      const w = jit(44), h = jit(30);
      orb(0, 0, 0, w, h, jit(30), 'body');
      orb(0, -2, -h + 2, 15, 13, 8, B, anim({ k: 'breathe', c: [0, -2, -h], amp: 0.12, speed: 3 }));
      tube([-14, -h + 4, 0], [-14, -h - 18, 0], 3, 3, 'body'); tube([14, -h + 4, 0], [14, -h - 18, 0], 3, 3, 'body');
      tube([-14, -h - 18, 0], [14, -h - 18, 0], 3, 3, 'body');
      const legs = 2 + Math.floor(r() * 3);
      for (const side of [-1, 1]) {
        for (let i = 0; i < legs; i++) {
          const y = -6 + i * (28 / legs), a = sway([side * w * 0.7, y, 0], 0.18, 2.4, i + side);
          tube([side * w * 0.7, y, 0], [side * (w + 22), y - 10, 8], 3, 2, 'body', a);
          tube([side * (w + 22), y - 10, 8], [side * (w + 30), y + 22, 2], 2, 1, 'body', a);
        }
        const c = sway([side * w * 0.6, -10, -6], 0.2, 1.2, side);
        tube([side * w * 0.6, -10, -6], [side * (w + 18), -h - 14, -10], 4, 4, S(side), c);
        orb(side * (w + 24), -h - 18, -12, 9, 7, 6, S(side), c);
        tube([side * (w + 24), -h - 18, -12], [side * (w + 38), -h - 6, -14], 3, 0.5, S(side), c);
      }
      if (r() < 0.5) for (let i = 0; i < 6; i++) { const th = (i / 6) * Math.PI; tube([Math.cos(th) * w * 0.8, -Math.sin(th) * h * 0.8, 6], [Math.cos(th) * (w + 10), -Math.sin(th) * (h + 12), 6], 3, 0, 'body'); }
    } else if (shape === 'padlock') {
      box(0, 10, 0, 34, 26, 14, 'body');
      orb(0, 10, -15, 8, 8, 3, B, breathe);
      const sh = sway([0, -16, 0], 0.08, 1);
      for (let th = 0; th <= Math.PI; th += 0.08) tube([Math.cos(th) * 22, -16 - Math.sin(th) * 26, 0], [Math.cos(th + 0.08) * 22, -16 - Math.sin(th + 0.08) * 26, 0], 5, 5, S(th < 1.6 ? -1 : 1), sh, 0.5);
    } else if (shape === 'serpent') {
      // Worm: a segmented body that undulates, a head with mandibles, fragment pods in orbit.
      const segs = 8 + Math.floor(r() * 4), wave = anim({ k: 'wave', amp: 9, freq: 0.07, speed: 2.6 });
      for (let i = 0; i < segs; i++) {
        const x = -60 + i * (120 / segs), rr = jit(14 - i * 0.5, 0.05);
        orb(x, Math.sin(i * 0.7) * 10, 0, rr, rr * 0.9, rr, i < segs / 2 ? B : S(i % 2 ? -1 : 1), wave, 0.32);
        if (i % 2 === 0) for (const side of [-1, 1]) tube([x, 6, side * rr * 0.7], [x - 4, 20, side * (rr + 10)], 1.5, 0.5, 'body', wave);
      }
      orb(-70, -4, 0, 16, 13, 14, 'body', wave);
      for (const side of [-1, 1]) tube([-80, 0, side * 6], [-98, 10, side * 14], 3, 0.5, B, sway([-80, 0, 0], 0.3, 3, side));
      for (let k = 1; k <= 3; k++) orb(20 + k * 6, 0, 0, 7, 6, 6, 'frag' + k, orbit([0, 0, 0], 0.5 + k * 0.15, 0.4 * k), 0.5);
      for (let k = 1; k <= 3; k++) points.filter((p) => p.region === 'frag' + k).forEach((p) => { p.x += 22 + k * 6; p.y += 26; });
    } else if (shape === 'wraith') {
      // Ghostroot: no face. A tall, crooked shard of a core hanging in the dark, a faint node deep
      // inside it, and a root system branching down out of it, forking and thinning like something
      // grown into the machine. A little debris drifts around the core.
      const bob = anim({ k: 'bob', amp: 3, speed: 0.9 });
      const lean = (r() - 0.5) * 10, ch = jit(26);
      orb(lean * 0.3, -22, 0, jit(20), ch, 13, 'body', bob);
      orb(lean * 0.3 + 8, -30, 5, 10, 12, 8, 'body', bob); // a second facet, off-axis
      // Threads it hangs from, up into the dark.
      for (let i = 0; i < 3; i++) { const x = lean * 0.3 + (i - 1) * 9 + (r() - 0.5) * 6; tube([x, -40, 0], [x + (r() - 0.5) * 14, -96, (r() - 0.5) * 10], 0.9, 0.4, 'body', sway([x, -96, 0], 0.05, 0.5, i)); }
      orb(lean * 0.2, -22, -2, 5, 6, 4, B, bob);
      // Roots: a few main ones from the base of the core, each forking twice, every fork thinner and
      // a little more crooked. Left-side roots are one special part, right-side the other.
      const grow = (from, ang, len, thick, depth, side, a) => {
        const to = [from[0] + Math.sin(ang) * len, from[1] + Math.cos(ang) * len, from[2] + (r() - 0.5) * 10];
        tube(from, to, thick, Math.max(0.3, thick * 0.6), S(side), a);
        if (depth <= 0) return;
        const forks = 1 + (r() < 0.65 ? 1 : 0);
        for (let k = 0; k < forks; k++) grow(to, ang + (k ? 1 : -1) * (0.25 + r() * 0.45) * (forks > 1 ? 1 : (r() < 0.5 ? -1 : 1)), len * (0.62 + r() * 0.18), thick * 0.62, depth - 1, side, a);
      };
      const n = 5 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1) - 0.5, side = f < 0 ? -1 : 1, x = lean * 0.3 + f * 26;
        const a = sway([x, 2, 0], 0.1, 0.6 + r() * 0.5, i * 1.7);
        grow([x, 2, (r() - 0.5) * 8], f * 2.3 + (r() - 0.5) * 0.25, jit(26), 2.8, 2, side, a);
      }
      // Debris: splinters off the core, slowly circling.
      for (let i = 0; i < 6; i++) { const th = r() * Math.PI * 2, rad = 26 + r() * 16; orb(Math.cos(th) * rad, -34 + Math.sin(th) * 22, (r() - 0.5) * 20, 2, 3, 2, 'frag' + (1 + (i % 3)), orbit([0, -30, 0], 0.18 + r() * 0.12, 0.4), 0.6); }
    } else if (shape === 'hound') {
      orb(0, -6, 6, 30, 20, 34, 'body');
      ring(0, -14, 0, 44, 2, 'body', orbit([0, -14, 0], 0.8, 0.25));
      orb(0, -20, -38, 15, 12, 12, B, breathe);
      orb(-6, -24, -48, 3, 3, 2, B); orb(6, -24, -48, 3, 3, 2, B);
      for (const side of [-1, 1]) for (const z of [-18, 26]) {
        const a = sway([side * 18, 6, z], 0.22, 3, z + side);
        tube([side * 18, 6, z], [side * 26, 40, z - 4], 4, 2, S(side), a);
      }
      tube([0, -14, 38], [0, -40, 62], 3, 0.5, B, sway([0, -14, 38], 0.4, 4));
    } else if (shape === 'eye') {
      // Sentinel, Keylogger: a single great eye, an iris that breathes, rings of watchers in orbit.
      orb(0, 0, 0, 34, 34, 34, 'body');
      orb(0, 0, -30, 16, 16, 6, B, anim({ k: 'breathe', c: [0, 0, -30], amp: 0.18, speed: 1.8 }));
      orb(0, 0, -36, 6, 6, 2, B);
      const rings = 2 + Math.floor(r() * 2);
      for (let i = 0; i < rings; i++) ring(0, 0, 0, 56 + i * 14, 1, S(i % 2 ? -1 : 1), orbit([0, 0, 0], (i % 2 ? -1 : 1) * (0.5 + i * 0.25), 1.25 - i * 0.2), 1.25 - i * 0.2);
      for (const side of [-1, 1]) tube([side * 26, -22, -18], [side * 34, -34, -26], 2.5, 0.5, 'body'); // brow ridges
    } else if (shape === 'spider') {
      orb(0, 0, 10, 26, 18, 30, 'body');
      orb(0, -4, -26, 16, 12, 14, B, breathe);
      for (let i = 0; i < 4; i++) orb(-8 + (i % 2) * 16, -8 - Math.floor(i / 2) * 6, -40, 3, 3, 2, B);
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
        const z = -16 + i * 12, a = sway([side * 18, 0, z], 0.2, 3.5, i * 1.7 + side);
        tube([side * 18, 0, z], [side * 48, -26, z - 6], 3, 2, S(side), a);
        tube([side * 48, -26, z - 6], [side * 64, 30, z - 10], 2, 0.5, S(side), a);
      }
    } else if (shape === 'tick') {
      orb(0, 4, 0, 34, 24, 30, 'body', breathe);
      orb(0, -16, -26, 13, 10, 10, B);
      for (const side of [-1, 1]) {
        tube([side * 6, -18, -34], [side * 4, -14, -54], 3, 0.3, S(side), sway([side * 6, -18, -34], 0.3, 5, side));
        for (let i = 0; i < 3; i++) tube([side * 26, 4 + i * 6, -10 + i * 10], [side * 50, 26, -14 + i * 14], 2.5, 1, 'body', sway([side * 26, 4, 0], 0.2, 3, i));
      }
    } else if (shape === 'blades') {
      // Shredder: two toothed discs spinning opposite ways on a hub.
      orb(0, 0, 0, 16, 16, 16, B, breathe);
      disc(0, 0, -14, 52, S(-1), spin([0, 0, 0], 2.4), 10);
      disc(0, 0, 14, 44, S(1), spin([0, 0, 0], -3), 8);
      tube([0, 0, -20], [0, 0, 20], 6, 6, 'body');
    } else if (shape === 'block' || shape === 'gate') {
      // Bouncer, Bricker: a wall of bricks; the lock in the middle; the keyring spinning in front.
      const rows = 4, cols = 4;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) box(-48 + x * 32 + (y % 2) * 12, -36 + y * 22, 0, 13, 9, 10, 'body', 0, 4);
      box(0, -2, -14, 12, 12, 4, B, breathe, 3);
      ring(0, -2, -30, 18, 2, S(1), spin([0, -2, -30], 1.6, 'y'), 1.2);
    } else if (shape === 'dish') {
      // Tracer: a satellite dish sweeping, the tracker coil at its focus.
      const sweep = anim({ k: 'sweep', c: [0, -10, 0], amp: 0.6, speed: 0.7 });
      for (let rr = 6; rr <= 50; rr += 4) for (let th = 0; th < Math.PI * 2; th += 3 / rr) add(Math.cos(th) * rr, -10 + Math.sin(th) * rr, -rr * rr / 90, -Math.cos(th) * rr / 45, -Math.sin(th) * rr / 45, -1, 'body', sweep);
      tube([0, -10, 0], [0, -10, -38], 2, 2, S(1), sweep);
      orb(0, -10, -42, 7, 7, 7, S(1), sweep);
      tube([0, 10, 10], [0, 50, 10], 6, 8, B);
      box(0, 54, 10, 22, 6, 18, B);
    } else if (shape === 'cube') {
      // Hashrat: a mining cube spinning on a pylon, the core glowing inside.
      box(0, -10, 0, 26, 26, 26, S(1), spin([0, -10, 0], 0.9, 'y'), 5);
      orb(0, -10, 0, 12, 12, 12, B, breathe);
      tube([0, 18, 0], [0, 54, 0], 5, 9, 'body');
      ring(0, 56, 0, 24, 2, 'body');
    } else if (shape === 'fountain') {
      // Floodgate: a basin and a column of data that spills over and down.
      orb(0, 34, 0, 44, 10, 30, 'body');
      tube([0, 30, 0], [0, -40, 0], 7, 4, B, anim({ k: 'wave', amp: 3, freq: 0.2, speed: 4 }));
      for (let i = 0; i < 10; i++) { const th = (i / 10) * Math.PI * 2; tube([0, -40, 0], [Math.cos(th) * 36, 20, Math.sin(th) * 24], 1.5, 1, S(i % 2 ? -1 : 1), anim({ k: 'wave', amp: 4, freq: 0.15, speed: 5 })); }
    } else if (shape === 'cocoon') {
      // Sleeper: a cocoon on a thread, breathing slowly, its cell glowing faintly inside.
      orb(0, 6, 0, 28, 44, 28, 'body', anim({ k: 'breathe', c: [0, 6, 0], amp: 0.05, speed: 0.8 }));
      orb(0, 6, -20, 10, 14, 6, S(1), anim({ k: 'breathe', c: [0, 6, -20], amp: 0.2, speed: 0.8 }));
      for (let i = 0; i < 7; i++) ring(0, -30 + i * 12, 0, 22 + Math.sin(i) * 8, 0.6, 'body', 0, 0.2 * (i % 3));
      tube([0, -38, 0], [0, -70, 0], 1, 1, B, sway([0, -70, 0], 0.08, 0.6));
    } else if (shape === 'rings') {
      // Echo: a core with rings that ripple outward and back.
      orb(0, 0, 0, 16, 16, 16, B, breathe);
      for (let i = 0; i < 4; i++) ring(0, 0, 0, 26 + i * 12, 1.2, i % 2 ? S(1) : 'body', anim({ k: 'ripple', c: [0, 0, 0], amp: 0.12, speed: 2, phase: i * 0.8 }), 0.9);
    } else if (shape === 'hive') {
      // Overrun: a cluster of cells, a swarm of drones circling it.
      for (let i = 0; i < 7; i++) { const th = (i / 6) * Math.PI * 2, rr = i ? 26 : 0; orb(Math.cos(th) * rr, Math.sin(th) * rr * 0.8, 0, 14, 12, 14, i ? S(i % 2 ? -1 : 1) : B, i ? 0 : breathe, 0.3); }
      for (let i = 0; i < 18; i++) orb(Math.cos(i) * 60, Math.sin(i * 1.7) * 30, Math.sin(i) * 40, 2, 2, 2, 'frag' + (1 + (i % 3)), orbit([0, 0, 0], 0.8 + (i % 4) * 0.2, 0.3 * (i % 3)), 1.2);
    } else if (shape === 'horse') {
      // Trojan: a wooden horse on a wheeled cart. Its head and neck are the Courier, nodding; the hatch in its flank
      // the Loader; Packages and Droppers are the crates on the cart's tail.
      box(0, 0, 0, 38, 15, 15, 'body', 0, 4);
      for (const x of [-26, 26]) for (const z of [-9, 9]) tube([x, 12, z], [x + Math.sign(x) * 3, 44, z], 4, 3.5, 'body');
      box(0, 50, 0, 50, 3, 18, 'body', 0, 4);
      for (const x of [-36, 36]) disc(x, 58, -20, 10, 'body', spin([x, 58, -20], 1.2));
      const nod = sway([-34, -8, 0], 0.12, 1.1);
      tube([-30, -8, 0], [-46, -44, 0], 8, 6, S(), nod);
      tube([-46, -46, 0], [-70, -34, 0], 8, 5, S(), nod);
      for (const z of [-4, 4]) tube([-44, -50, z], [-40, -64, z * 1.4], 2.5, 0.4, S(), nod); // ears
      for (let i = 0; i < 4; i++) tube([-40 + i * 3, -48 + i * 4, 0], [-30 + i * 4, -54 + i * 6, 0], 2, 0.5, S(), nod); // mane
      orb(-56, -46, -7, 2, 2, 1, S(), nod);
      box(4, 0, -16, 13, 8, 2, B, breathe, 3);
      orb(4, 0, -12, 8, 5, 3, B, breathe);
      tube([38, -6, 0], [56, 22, 0], 3, 0.5, 'body', sway([38, -6, 0], 0.3, 1.6));
      for (const [k, x, y] of [[1, 44, 40], [2, 58, 40], [3, 51, 27]]) box(x, y, -6, 6, 6, 6, 'frag' + k, anim({ k: 'bob', amp: 1.2, speed: 1.5 + k * 0.3 }), 3);
    } else if (shape === 'boiler') {
      // Cryptominer: a boiler building pressure. The tank is the Rig, swelling; the coil wrapped round it the
      // Cooler; heat comes off the stack, and the gauge's needle twitches.
      const swell = anim({ k: 'breathe', c: [0, 8, 0], amp: 0.04, speed: 2 });
      orb(0, 8, 0, 44, 44, 40, S(), swell);
      for (let i = 0; i < 6; i++) { const y = -18 + i * 10; ring(0, y, 0, Math.sqrt(1 - ((y - 8) / 46) ** 2) * 44 + 4, 1, B, swell, 0.1); }
      disc(0, 0, -42, 12, 'body');
      tube([0, 0, -44], [8, -9, -45], 1.8, 0.6, S(-1), sway([0, 0, -44], 0.6, 2.4)); // the needle
      tube([14, -30, 0], [16, -52, 0], 7, 7, 'body');
      for (let i = 0; i < 4; i++) tube([10 + i * 4, -54, 0], [8 + i * 5 + (r() - 0.5) * 8, -74, 0], 1.2, 0.3, S(i % 2 ? -1 : 1), anim({ k: 'wave', amp: 4, freq: 0.25, speed: 3 + i * 0.5 }));
      tube([-40, 18, 0], [-62, 18, 0], 4, 4, 'body');
      ring(-64, 18, 0, 11, 1, 'body', spin([-64, 18, 0], 0.8), Math.PI / 2); // a valve wheel
      for (const [x, z] of [[-24, -18], [24, -18], [0, 26]]) tube([x, 46, z], [x * 1.3, 66, z * 1.3], 5, 4, 'body');
    } else if (shape === 'magnet') {
      // Wiper: a great horseshoe magnet, the Degausser (an arm a side), hanging over a drive, the Eraser, with field
      // lines pulsing between its poles.
      const hang = sway([0, -70, 0], 0.05, 0.7);
      for (let th = 0; th <= Math.PI; th += 0.07) tube([Math.cos(th) * 34, -20 - Math.sin(th) * 40, 0], [Math.cos(th + 0.07) * 34, -20 - Math.sin(th + 0.07) * 40, 0], 9, 9, S(th < Math.PI / 2 ? 1 : -1), hang, 0.4);
      for (const side of [-1, 1]) { tube([side * 34, -20, 0], [side * 34, 6, 0], 9, 9, S(side), hang); box(side * 34, 12, 0, 10, 5, 10, S(side), hang, 3); }
      tube([0, -60, 0], [0, -84, 0], 1.2, 1.2, 'body', hang);
      for (let i = 0; i < 4; i++) {
        const rr = 22 + i * 8, field = anim({ k: 'ripple', c: [0, 16, 0], amp: 0.1, speed: 3, phase: i * 0.9 });
        for (let th = 0.3; th < Math.PI - 0.3; th += 0.1) tube([Math.cos(th) * rr * 1.5, 16 + Math.sin(th) * rr * 0.9, 0], [Math.cos(th + 0.1) * rr * 1.5, 16 + Math.sin(th + 0.1) * rr * 0.9, 0], 1, 1, 'body', field, 0.5);
      }
      box(0, 58, 0, 30, 6, 20, B, spin([0, 58, 0], 0.6, 'y'), 3);
      orb(0, 50, -12, 6, 3, 3, B, breathe);
    } else if (shape === 'mast') {
      // Botnet: a C&C mast on its housing (the basic), its dish sweeping the field, and a ring of Zombie boxes on the
      // ground, each tied to the mast by a thin beam. A broken Zombie goes dark in its place.
      box(0, 44, 0, 24, 8, 24, B, breathe, 4);
      tube([0, 36, 0], [0, -46, 0], 4, 2, S(), sway([0, 36, 0], 0.04, 0.9));
      for (const [y, rr] of [[18, 10], [-2, 8], [-22, 6]]) ring(0, y, 0, rr, 0.8, S(), spin([0, y, 0], 0.4, 'y'));
      disc(0, -52, -4, 16, S(-1), anim({ k: 'sweep', c: [0, -52, 0], amp: 0.7, speed: 0.8 }));
      tube([0, -52, -4], [0, -52, -16], 1.5, 0.4, S(-1), anim({ k: 'sweep', c: [0, -52, 0], amp: 0.7, speed: 0.8 }));
      const zs = v.parts.filter((p) => p.zombie);
      zs.forEach((z, i) => {
        const th = (i / zs.length) * Math.PI * 2, x = Math.cos(th) * 66, zz = Math.sin(th) * 44, bob = anim({ k: 'bob', amp: 1.5, speed: 1.6 + (i % 3) * 0.4 });
        box(x, 50, zz, 7, 7, 7, z.id, bob, 3.5);
        tube([x, 42, zz], [0, -30, 0], 0.5, 0.5, z.id, 0, 0.12);
      });
    } else if (shape === 'bomb') {
      // Logic Bomb: a round bomb, the Payload, with a lit wick curling off its cap; strapped to its belly a clock face,
      // the Trigger, its hand ticking round.
      orb(0, 4, 0, 46, 44, 44, S(), anim({ k: 'breathe', c: [0, 4, 0], amp: 0.03, speed: 1.4 }));
      ring(0, -36, 0, 14, 2, 'body');
      tube([0, -40, 0], [6, -52, 0], 5, 5, 'body');
      for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 1) / 6; tube([6 + Math.sin(t0 * 5) * 10, -52 - t0 * 26, Math.cos(t0 * 5) * 4], [6 + Math.sin(t1 * 5) * 10, -52 - t1 * 26, Math.cos(t1 * 5) * 4], 1.5, 1.4, S(-1), sway([6, -52, 0], 0.18, 2.2)); }
      for (let i = 0; i < 5; i++) orb(6 + Math.sin(5) * 10 + (r() - 0.5) * 8, -80 - r() * 8, (r() - 0.5) * 6, 1.5, 1.5, 1.5, S(-1), anim({ k: 'wave', amp: 3, freq: 0.4, speed: 6 + i }), 0.6); // sparks
      for (const y of [-12, 22]) ring(0, y, 0, 46 - Math.abs(y) * 0.18, 1, 'body');
      disc(0, 8, -46, 18, B, 0, 12);
      tube([0, 8, -48], [0, -6, -49], 1.6, 0.6, B, spin([0, 8, -48], 1.4));
    }
    // Decorations by seed: antennae or an orbiting halo now and then. A boss wears only its own.
    const plain = !BOSS_BUILD[shape];
    if (plain && r() < 0.35 && !['blades', 'block', 'gate', 'dish', 'fountain', 'horse', 'boiler', 'magnet', 'mast', 'bomb'].includes(shape)) for (const side of [-1, 1]) tube([side * 10, -38, -6], [side * 22, -66, -14], 1.5, 0.3, 'body', sway([side * 10, -38, -6], 0.25, 2, side));
    if (plain && r() < 0.25 && !['eye', 'rings', 'hive', 'horse', 'boiler', 'magnet', 'mast', 'bomb'].includes(shape)) ring(0, 0, 0, 70, 0.8, 'body', orbit([0, 0, 0], 0.4, 1.1), 1.1);
    radius = Math.max(40, ...points.map((p) => Math.hypot(p.x, p.y, p.z)));
    rx = Math.max(40, ...points.map((p) => Math.hypot(p.x, p.z))); // it turns: its widest is any horizontal reach
    ry = Math.max(40, ...points.map((p) => Math.abs(p.y) + 8));
    // A boss is wide, and faces you: it swings side to side without turning away, from far enough off that its near
    // end doesn't swell, and it is fitted to the window as it is drawn at the ends of its swing.
    facing = !plain; cam = camBase = plain ? 300 : 300 * Math.max(1, radius / 70); midX = midY = 0;
    if (facing) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const yaw of [-BOSS_SWING, 0, BOSS_SWING]) for (const pitch of [0.14, 0.26]) {
        const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
        for (const p of points) {
          const X = p.x * cy + p.z * sy, Z = -p.x * sy + p.z * cy, k = cam / (cam + p.y * sp + Z * cp);
          const px = X * k, py = (p.y * cp - Z * sp) * k;
          if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
        }
      }
      midX = (x0 + x1) / 2; midY = (y0 + y1) / 2; rx = Math.max(40, (x1 - x0) / 2 + 3); ry = Math.max(30, (y1 - y0) / 2 + 4);
    }
  }

  // ---------- parts ----------
  // The body isn't a part: it shows the virus's armor, bright while chits remain, dim once stripped.
  function body(v) {
    const max = v.parts.reduce((n, p) => n + (p.maxArmor || 0), 0);
    const left = v.parts.reduce((n, p) => n + (p.integrity > 0 ? p.armor || 0 : 0), 0);
    return { id: 'body', integrity: max ? Math.max(0.2, left) : 1, max: max || 1 };
  }
  const resolvePartById = (v, id) => v.parts.find((p) => p.id === id);
  function resolvePart(v, region) {
    if (region === 'body') return body(v);
    if (region.startsWith('frag')) {
      const living = v.parts.filter((p) => p.kind === 'fragment' && p.integrity > 0);
      return living[Number(region.slice(4)) - 1] || { integrity: 0, max: 1, ghost: true };
    }
    if (region[0] === '#') { // '#camera2': the second living part of that role
      const [, role, n] = region.match(/^#(\D+)(\d+)$/);
      return v.parts.filter((p) => p.role === role && p.integrity > 0)[n - 1] || null;
    }
    if (!region.includes('@')) return v.parts.find((p) => p.id === region);
    const [base, side] = region.split('@');
    return v.parts.find((p) => p.id === base) || v.parts.find((p) => p.id === base + (side === 'L' ? 'a' : 'b'));
  }

  // ---------- animation ----------
  const rotY = (x, z, a) => [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];
  const rotZ = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  function animate(p, t) {
    const A = anims[p.a];
    let { x, y, z, nx, ny, nz } = p;
    if (!A || A.k === 'none') return { x, y, z, nx, ny, nz };
    const [cx, cy, cz] = A.c || [0, 0, 0];
    switch (A.k) {
      case 'breathe': { const k = 1 + Math.sin(t * A.speed + (A.phase || 0)) * A.amp; x = cx + (x - cx) * k; y = cy + (y - cy) * k; z = cz + (z - cz) * k; break; }
      case 'ripple': { const k = 1 + Math.sin(t * A.speed - A.phase) * A.amp; x = cx + (x - cx) * k; z = cz + (z - cz) * k; break; }
      case 'wave': y += Math.sin(t * A.speed + x * A.freq) * A.amp; z += Math.cos(t * A.speed * 0.7 + x * A.freq) * A.amp * 0.5; break;
      case 'bob': y += Math.sin(t * A.speed + (A.phase || 0)) * A.amp; break;
      case 'slide': x += Math.sin(t * A.speed + (A.phase || 0)) * A.amp; break;
      case 'rise': x += Math.sin(t * A.speed - y * A.freq + (A.phase || 0)) * A.amp; break; // heat off a surface: a wobble that climbs
      case 'swing': { const a = Math.sin(t * A.speed + (A.phase || 0)) * A.amp; [x, y] = rotZ(x - cx, y - cy, a); x += cx; y += cy; [nx, ny] = rotZ(nx, ny, a); break; } // rigid, about its pivot
      case 'sway': { const a = Math.sin(t * A.speed + A.phase) * A.amp; const d = Math.hypot(x - cx, y - cy, z - cz) / 40; [x, y] = rotZ(x - cx, y - cy, a * d); x += cx; y += cy; [nx, ny] = rotZ(nx, ny, a * d); break; }
      case 'sweep': { const a = Math.sin(t * A.speed) * A.amp; [x, z] = rotY(x - cx, z - cz, a); x += cx; z += cz; [nx, nz] = rotY(nx, nz, a); break; }
      case 'orbit': { const a = t * A.speed; [x, z] = rotY(x - cx, z - cz, a); x += cx; z += cz; [nx, nz] = rotY(nx, nz, a); break; }
      case 'spin': { const a = t * A.speed; if (A.axis === 'y') { [x, z] = rotY(x - cx, z - cz, a); x += cx; z += cz; [nx, nz] = rotY(nx, nz, a); } else { [x, y] = rotZ(x - cx, y - cy, a); x += cx; y += cy; [nx, ny] = rotZ(nx, ny, a); } break; }
    }
    return { x, y, z, nx, ny, nz };
  }

  // ---------- drawing ----------
  const LIGHT = (() => { const l = [-0.45, -0.6, -0.66], n = Math.hypot(...l); return l.map((v) => v / n); })();
  function draw(now) {
    requestAnimationFrame(draw);
    if (!canvas?.isConnected || now - previous < 40) return;
    const delta = Math.min(100, now - previous);
    previous = now;
    const s = getState();
    const v = s?.encounter?.virus;
    if (!v) return;
    const key = v.id + v.parts.length;
    if (key !== builtFor) { builtFor = key; build(v); shards.length = 0; }
    // The floor's stage (stage.mjs): its place behind the virus, its light, its camera, and a new virus's entrance.
    const S = stage?.update(now) ? stage : null;
    if (S && v.id !== enteredFor) { enteredFor = v.id; S.enter(now); }
    const shot = S?.cam(now);
    Object.assign(COLORS, S?.colors() || BASE);
    cam = shot?.dist && !facing ? shot.dist : camBase; // a boss keeps its own distance, fitted to the window
    const motion = canMove();
    const moving = motion && s.encounter.phase === 'active' && !s.encounter.paused;
    if (moving) angle += delta * 0.00016;
    if (motion) clock += delta / 1000;

    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const glyph = Math.max(8, Math.min(13, width / 44)), gx = glyph * 0.62, gy = glyph * 0.86;
    ctx.font = `600 ${glyph}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Behind it: the floor's place, or else a faint data rain.
    if (S) S.back(ctx, { width, height, glyph, gx, gy, now, dpr });
    else if (motion) {
      while (rain.length < Math.floor(width / 26)) rain.push({ x: Math.random() * width, y: Math.random() * height, v: 30 + Math.random() * 60, c: Math.random() < 0.5 ? '0' : '1' });
      ctx.fillStyle = COLORS.dim;
      for (const d of rain) {
        d.y += (d.v * delta) / 1000;
        if (d.y > height) { d.y = -10; d.x = Math.random() * width; }
        if (Math.random() < 0.05) d.c = Math.random() < 0.5 ? '0' : '1';
        ctx.globalAlpha = 0.13;
        ctx.fillText(d.c, Math.round(d.x / gx) * gx, Math.round(d.y / gy) * gy);
      }
    }

    const yaw = facing ? Math.sin(angle) * BOSS_SWING : Math.sin(angle) * 0.9 + angle * 0.15, pitch = (shot?.pitch ?? 0.2) + Math.sin(clock * 0.4) * 0.06;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    for (const [id, h] of hits) if (now - h.time > (h.kind === 'break' ? BREAK_MS : 900)) hits.delete(id);
    const striking = motion && breakout();
    const quake = motion && shake && now - shake.time < 350 ? (1 - (now - shake.time) / 350) ** 2 * shake.power : 0;
    const qx = quake ? (Math.random() - 0.5) * quake : 0, qy = quake ? (Math.random() - 0.5) * quake : 0;
    const tearing = motion && now < glitch; // a hit tears a few rows sideways
    const tearRows = tearing ? new Set(Array.from({ length: 4 }, () => Math.floor(Math.random() * (height / gy)))) : null;
    const selected = getSelected(), nowSources = getNowSources();
    const scale = (facing ? Math.min((width * 0.48) / rx, (height * 0.47) / ry) : Math.min((width * 0.47) / rx, (height * 0.42) / ry)) * (shot?.zoom || 1);
    const pulse = 0.55 + 0.45 * Math.sin(now / 160); // parts about to attack throb
    const phased = s.encounter.cycle % 2 === 1;

    // Strikes under way: each attacking part's time through its move, and its middle on screen (the move bends
    // around it).
    const strikes = new Map();
    if (motion) for (const [id, h] of hits) {
      const who = resolvePartById(v, id), how = who?.special ? style.limb : style.core;
      const u = h.kind === 'attack' ? (now - h.time) / STRIKES[how] : 1;
      if (u > 0 && u < 1 && who?.integrity > 0) strikes.set(id, { u, h, how, c: { x: 0, y: 0 }, n: 0 });
    }
    if (strikes.size) for (const p of points) {
      const part = resolvePart(v, p.region), st = part?.id && strikes.get(part.id);
      if (!st) continue;
      const q = animate(p, clock), [x1, z1] = rotY(q.x, q.z, yaw);
      st.c.x += x1; st.c.y += q.y * cp - z1 * sp; st.n++;
    }
    for (const st of strikes.values()) if (st.n) { st.c.x /= st.n; st.c.y /= st.n; }

    // Project every point; keep the nearest one per grid cell.
    const cells = new Map();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const part = resolvePart(v, p.region);
      if (!part) continue;
      const h = part.id ? hits.get(part.id) : null;
      if (part.integrity === 0) { if (!(h?.kind === 'break' && motion)) continue; }
      if (part.ghost) continue;
      if (p.region !== 'body' && part.phase && phased && i % 3) continue; // Flicker: the Shade is half gone on odd cycles
      const q = animate(p, clock);
      let [x1, z1] = rotY(q.x, q.z, yaw);
      const y1 = q.y * cp - z1 * sp; z1 = q.y * sp + z1 * cp;
      let [nx1, nz1] = rotY(q.nx, q.nz, yaw);
      const ny1 = q.ny * cp - nz1 * sp; nz1 = q.ny * sp + nz1 * cp;
      const age = h ? (now - h.time) / 900 : 0;
      const fresh = h && part.integrity > 0 && motion ? (1 - age) ** 2 : 0;
      // The strike: the attacking part comes at you its own way (nearer, so bigger and spread from the middle), past its frame.
      const st = strikes.size && part.id && part.integrity > 0 ? strikes.get(part.id) : null;
      const m = st ? strikeAt(st.how, st.u, i, x1, y1, st.c) : null;
      if (m?.hide) continue;
      const reach = m ? m.reach : 0;
      const k0 = cam / (cam + z1);
      if (reach) z1 -= reach * 175 * (cam / 300);
      const k = reach > 0 ? Math.min(k0 * 3, cam / (cam + Math.max(-205 * (cam / 300), z1))) : cam / (cam + z1);
      const grow = k / k0; // how much nearer than at rest: the size its characters draw at
      const jolt = fresh * (h?.kind === 'crit' ? 12 : h?.kind === 'attack' ? 0 : h?.kind === 'chit' ? 4 : 7);
      // A boss's parts stand well off its middle: one that strikes swells out from where it stands, not from the middle.
      const ax = facing && m ? st.c.x : 0, ay = facing && m ? st.c.y : 0, kc = k0 + (k - k0) * 0.2;
      let sx = width * (0.5 + (shot?.dx || 0)) + qx + (ax * kc + (x1 + (m?.dx || 0) - ax) * k - midX) * scale + Math.sin(i * 7.3) * jolt;
      let sy = height * (0.5 + (shot?.dy || 0)) + qy + (ay * kc + (y1 + (m?.dy || 0) - ay) * k - midY) * scale + Math.cos(i * 3.1) * jolt;
      const lunging = striking && grow > 1.12;
      const step = lunging ? Math.round(grow * 4) / 4 : 1; // near characters sit on a coarser grid, bigger
      const row = Math.round(sy / (gy * step));
      if (tearRows?.has(row) && !lunging) sx += (Math.random() < 0.5 ? -1 : 1) * gx * 3;
      const cx = Math.round(sx / (gx * step)), cyc = row;
      const cell = lunging ? -(step * 4 * 1e8 + cx * 10000 + cyc) : cx * 10000 + cyc;
      const was = cells.get(cell);
      if (was && was.z <= z1) continue;
      let lum = Math.max(0, nx1 * LIGHT[0] + ny1 * LIGHT[1] + nz1 * LIGHT[2]);
      if (S) lum = S.light(lum, nx1, ny1, nz1, now);
      cells.set(cell, { x: cx * gx * step, y: cyc * gy * step, z: z1, lum, part, h, fresh, i, region: p.region, step: lunging ? step : 0, glitch: m?.glitch });
    }

    // An attacking part's cells draw last, on the layer over the page; the rest on the panel.
    const near = [];
    for (const c of cells.values()) {
      const { part, h, fresh } = c;
      if (c.step) { near.push(c); continue; }
      const broken = part.integrity === 0;
      // Broken: each point turns to a bit, then lets go as a drifting 1 or 0 (shards below).
      const done = broken && h ? (now - h.time) / BREAK_MS : 0;
      if (broken && h) {
        const at = releaseOf(c.i);
        if (done > at) { if (motion && !h.gone.has(c.i)) { h.gone.add(c.i); drift(c.x, c.y, h); } continue; }
      }
      const ratio = part.integrity / part.max;
      const depth = Math.max(0.35, Math.min(1, 0.95 - c.z / (radius * 2.2)));
      const faded = selected && part.id !== selected && c.region !== 'body' ? 0.55 : 1;
      const lit = 0.18 + c.lum * 0.82;
      let ch = RAMP[Math.max(1, Math.min(RAMP.length - 1, Math.round(lit * (RAMP.length - 1))))];
      // The digital grain: 0s and 1s flicker through the dimmer side; a badly hurt part corrupts.
      if (lit < 0.55 && (c.i + Math.floor(clock * 3)) % 7 === 0) ch = (c.i + Math.floor(clock * 2)) % 2 ? '1' : '0';
      if (ratio < 0.35 && !broken && Math.random() < 0.12) ch = '%&$?!'[Math.floor(Math.random() * 5)];
      if (h?.kind === 'chit' && fresh > 0.3 && c.i % 5 === 0) ch = '*';
      if (h?.kind === 'crit' && fresh > 0.4 && c.i % 3 === 0) ch = '#';
      if (c.glitch) ch = (c.i + Math.floor(now / 50)) % 2 ? '1' : '0';
      if (broken && done > releaseOf(c.i) * 0.5) ch = (c.i + Math.floor(now / 70)) % 2 ? '1' : '0';
      const flare = h ? (broken ? COLORS.bright : h.kind === 'attack' ? COLORS.hot : h.kind === 'crit' ? COLORS.gold : COLORS.bright) : null;
      const attacking = part.id && nowSources.has(part.id);
      ctx.fillStyle = flare || (attacking ? COLORS.hot : part.id === selected ? COLORS.gold : c.region === 'body' ? (ratio < 0.4 ? COLORS.dim : COLORS.deep) : ratio < 0.4 ? COLORS.dim : lit > 0.7 ? COLORS.bright : COLORS.amber);
      const age = h ? (now - h.time) / 900 : 0;
      ctx.globalAlpha = Math.min(1, depth * faded * (attacking && !flare ? pulse + 0.25 : 1) * (broken ? 1 - done * 0.4 : 1) * (0.55 + lit * 0.6));
      if (S) { const rv = S.reveal(c, ch, now, width, height); if (!rv) continue; if (rv.ch) ch = rv.ch; if (rv.a != null) ctx.globalAlpha *= rv.a; if (rv.color) ctx.fillStyle = rv.color; }
      ctx.fillText(ch, c.x, c.y);
      c.ch = ch;
    }

    // What strikes throw: shock rings and grind sparks, from the part's middle on the panel, out over the page.
    if (striking) for (const [id, st] of strikes) {
      if (!['shock', 'grind', 'spill', 'volley', 'beam'].includes(st.how)) continue;
      const mine = [...cells.values()].filter((c) => c.part?.id === id);
      if (!mine.length) continue;
      const mx = mine.reduce((a, c) => a + c.x, 0) / mine.length, my = mine.reduce((a, c) => a + c.y, 0) / mine.length;
      const ext = Math.max(12, Math.sqrt(mine.reduce((a, c) => a + (c.x - mx) ** 2 + (c.y - my) ** 2, 0) / mine.length));
      const chars = mine.map((c) => c.ch).filter((ch) => ch && ch.trim());
      if (st.how === 'volley') { // a tight clump that swells fast: it comes straight at you
        st.h.shots ??= 0;
        while (st.h.shots < VOLLEYS.length && st.u >= VOLLEYS[st.h.shots]) {
          for (let k = 0; k < 12; k++) {
            const a = Math.random() * Math.PI * 2, sp = 0.4 + Math.random() * 1.1;
            flung.push({ x: mx + Math.cos(a) * ext * 0.3, y: my + Math.sin(a) * ext * 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 0.6, grow: 4.5, life: 460, max: 460, c: chars[k % (chars.length || 1)] || '#' });
          }
          st.h.shots++;
        }
      } else if (st.how === 'beam') { // a stream that sweeps from one side of the glass to the other
        if (sprayAt(st.u) > 0) {
          const a = Math.PI / 2 + Math.cos(Math.PI * clamp01((st.u - 0.15) / 0.6)) * 0.9;
          for (let k = 0; k < 5; k++) {
            const sp = 6 + Math.random() * 2, j = (Math.random() - 0.5) * 0.08;
            flung.push({ x: mx, y: my, vx: Math.cos(a + j) * sp, vy: Math.sin(a + j) * sp, grow: 2.2, life: 420, max: 420, c: Math.random() < 0.5 ? '1' : '0' });
          }
        }
      } else if (st.how === 'spill') { // bits and packets pour up out of the hatch and arc over at you
        const want = Math.round(sprayAt(st.u) * 9);
        for (let k = 0; k < want; k++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, sp = 3 + Math.random() * 4;
          flung.push({ x: mx + (Math.random() - 0.5) * ext, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.32, grow: 2.6, life: 600 + Math.random() * 300, max: 900, keep: true, c: PACKETS[Math.floor(Math.random() * PACKETS.length)] });
        }
      } else if (st.how === 'shock') {
        st.h.rings ??= 0;
        while (st.h.rings < SHOCK_RINGS.length && st.u >= SHOCK_RINGS[st.h.rings]) {
          const n = 30 + st.h.rings * 6, tilt = 0.5 + Math.random() * 0.15, spin = Math.random() * 6;
          for (let k = 0; k < n; k++) {
            const a = spin + (k / n) * Math.PI * 2, sp = 4.2 + st.h.rings * 0.8;
            flung.push({ x: mx + Math.cos(a) * ext, y: my + Math.sin(a) * ext * tilt, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * tilt, grow: 2.4, life: 620, max: 620, c: k % 3 ? (k % 2 ? '1' : '0') : chars[k % (chars.length || 1)] || '#', ring: true });
          }
          st.h.rings++;
        }
      } else {
        const want = Math.round(sprayAt(st.u) * 7);
        for (let k = 0; k < want; k++) {
          const from = mine[Math.floor(Math.random() * mine.length)], a = Math.atan2(from.y - my, from.x - mx) + Math.PI / 2 * (Math.random() < 0.8 ? 1 : -1) * 0.7;
          const sp = 3 + Math.random() * 5;
          flung.push({ x: from.x, y: from.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grow: 2.8, life: 380 + Math.random() * 260, max: 640, c: SPARKS[Math.floor(Math.random() * SPARKS.length)] });
        }
      }
    }

    // The strike: the lunging part on the layer over the page, so it breaks past its window's edge.
    if (near.length || outDirty || flung.length) {
      const o = outLayer(), r = canvas.getBoundingClientRect();
      const W = innerWidth, H = innerHeight;
      if (out.width !== Math.round(W * dpr) || out.height !== Math.round(H * dpr)) { out.width = Math.round(W * dpr); out.height = Math.round(H * dpr); }
      o.setTransform(dpr, 0, 0, dpr, 0, 0);
      o.clearRect(0, 0, W, H);
      outDirty = near.length > 0 || flung.length > 0;
      const fx = r.width / width, fy = r.height / height;
      o.textAlign = 'center'; o.textBaseline = 'middle';
      // Thrown characters come at you: they grow as they go, and fade.
      for (let k = flung.length - 1; k >= 0; k--) {
        const d = flung[k];
        d.life -= delta;
        if (d.life <= 0 || !motion) { flung.splice(k, 1); continue; }
        const age = 1 - d.life / d.max, size = 1 + age * d.grow;
        if (d.g) d.vy += d.g * delta / 16;
        d.x += d.vx * size * delta / 16; d.y += d.vy * size * delta / 16;
        if (!d.ring && !d.keep && Math.random() < 0.1) d.c = Math.random() < 0.5 ? '1' : '0';
        o.font = `700 ${glyph * size * fx}px "IBM Plex Mono", monospace`;
        o.fillStyle = age < 0.3 ? COLORS.bright : COLORS.hot;
        o.shadowColor = COLORS.hot; o.shadowBlur = 5 * size;
        o.globalAlpha = Math.min(1, (d.life / d.max) * 1.6) * 0.9;
        o.fillText(d.c, r.left + d.x * fx, r.top + d.y * fy);
      }
      near.sort((a, b) => a.step - b.step || b.z - a.z);
      for (const c of near) {
        const lit = 0.18 + c.lum * 0.82;
        const ch = c.glitch || (c.i + Math.floor(now / 60)) % 9 === 0 ? (c.i % 2 ? '1' : '0') : RAMP[Math.max(2, Math.min(RAMP.length - 1, Math.round(lit * (RAMP.length - 1))))];
        o.font = `700 ${glyph * c.step * fx}px "IBM Plex Mono", monospace`;
        o.fillStyle = lit > 0.75 ? COLORS.bright : COLORS.hot;
        o.shadowColor = COLORS.hot; o.shadowBlur = 6 * c.step;
        o.globalAlpha = Math.min(1, 0.6 + lit * 0.5);
        o.fillText(ch, r.left + c.x * fx, r.top + c.y * fy);
        c.ch = ch;
      }
      o.shadowBlur = 0; o.globalAlpha = 1;
    }

    // Shards: characters thrown off a broken part, falling away.
    if (motion && shards.length) {
      ctx.fillStyle = COLORS.bright;
      for (let i = shards.length - 1; i >= 0; i--) {
        const d = shards[i];
        d.life -= delta;
        if (d.life <= 0) { shards.splice(i, 1); continue; }
        if (d.bit && S?.bit(ctx, d, delta, { width, height, gx, gy })) continue;
        if (d.bit) { // a dissolving point: drifts up and out, wavering, flipping between 1 and 0, dimming
          d.t += delta;
          d.x += (d.vx + Math.sin(d.t / 140 + d.ph) * 0.35) * delta / 16; d.y += d.vy * delta / 16; d.vy *= 0.995;
          if (Math.random() < 0.08) d.c = d.c === '1' ? '0' : '1';
          const f = d.life / d.max;
          ctx.globalAlpha = Math.min(1, f * 1.4) * 0.9;
          ctx.fillStyle = f > 0.7 ? COLORS.bright : f > 0.35 ? COLORS.amber : COLORS.deep;
        } else {
          d.vy += 0.00025 * delta * 60; d.x += d.vx * delta / 16; d.y += d.vy * delta / 16;
          ctx.globalAlpha = Math.min(1, d.life / 500);
          ctx.fillStyle = d.life > 600 ? COLORS.bright : COLORS.amber;
        }
        ctx.fillText(d.c, Math.round(d.x / gx) * gx, Math.round(d.y / gy) * gy);
      }
    }
    ctx.globalAlpha = 1;
    S?.post(ctx, canvas, { width, height, gy, now });
    lastFrame = { cells, width, height };
  }
  let lastFrame = null;
  // A broken part's point letting go: a bit that drifts up and away from the part's middle.
  function drift(x, y, h) {
    const dx = x - h.cx, dy = y - h.cy, d = Math.hypot(dx, dy) || 1, max = 700 + Math.random() * 700;
    shards.push({ bit: true, x, y, vx: (dx / d) * (0.2 + Math.random() * 0.6), vy: -(0.5 + Math.random() * 1.1), c: Math.random() < 0.5 ? '1' : '0', life: max, max, t: 0, ph: Math.random() * 6 });
  }
  // Throw a burst of characters from where a part was drawn.
  function burst(id, n = 46, set = SHARDS) {
    if (!lastFrame || !canMove()) return;
    const mine = [...lastFrame.cells.values()].filter((c) => c.part?.id === id);
    const cx = mine.length ? mine.reduce((a, c) => a + c.x, 0) / mine.length : lastFrame.width / 2;
    const cy = mine.length ? mine.reduce((a, c) => a + c.y, 0) / mine.length : lastFrame.height / 2;
    for (let i = 0; i < n; i++) {
      const from = mine.length ? mine[Math.floor(Math.random() * mine.length)] : { x: cx, y: cy };
      const a = Math.atan2(from.y - cy, from.x - cx) + (Math.random() - 0.5) * 1.2, sp = 1.5 + Math.random() * 4;
      shards.push({ x: from.x, y: from.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, c: set[Math.floor(Math.random() * set.length)], life: 700 + Math.random() * 500 });
    }
  }
  requestAnimationFrame(draw);

  return {
    attach(el) { if (canvas !== el) { canvas = el; ctx = el.getContext('2d'); } },
    // Where a part is drawn right now, on the page: { x, y } (its centre, in viewport px) and some of the
    // characters it is drawn in (lash.mjs throws them at you). null when the render is off screen.
    anchor(id) {
      if (!lastFrame || !canvas?.isConnected) return null;
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return null;
      const mine = [...lastFrame.cells.values()].filter((c) => c.part?.id === id && c.ch && c.ch !== ' ');
      if (!mine.length) return null;
      const sx = r.width / (lastFrame.width || r.width), sy = r.height / (lastFrame.height || r.height);
      const x = mine.reduce((a, c) => a + c.x, 0) / mine.length, y = mine.reduce((a, c) => a + c.y, 0) / mine.length;
      const chars = mine.filter((_, i) => i % Math.max(1, Math.floor(mine.length / 24)) === 0).map((c) => c.ch).join('');
      return { x: r.left + x * sx, y: r.top + y * sy, chars };
    },
    // kind: 'hit' (you hit it), 'crit', 'chit' (an armor chit broke), 'attack' (its attack landed on you), 'break'.
    hit(id, kind = 'hit') {
      const t = performance.now();
      const h = { time: t, kind };
      if (kind === 'break') { // where it dissolves from: its middle on the last frame
        const mine = lastFrame ? [...lastFrame.cells.values()].filter((c) => c.part?.id === id) : [];
        h.gone = new Set();
        h.cx = mine.length ? mine.reduce((a, c) => a + c.x, 0) / mine.length : (lastFrame?.width || 0) / 2;
        h.cy = mine.length ? mine.reduce((a, c) => a + c.y, 0) / mine.length : (lastFrame?.height || 0) / 2;
      }
      hits.set(id, h);
      if (kind === 'crit' || kind === 'attack' || kind === 'break') shake = { time: t, power: kind === 'attack' ? 9 : kind === 'break' ? 12 : 7 };
      if (kind !== 'chit') glitch = t + (kind === 'break' || kind === 'crit' ? 220 : 130);
      if (kind === 'break') burst(id, 14, BITS);
      if (kind === 'chit') burst(id, 10);
    },
  };
}

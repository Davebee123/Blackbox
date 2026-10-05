// Presentation only: each virus is ASCII art, built as a cloud of 3D points tagged by part and
// drawn as terminal characters on a fixed grid. Every point has a surface normal, so the lit side
// draws in dense characters (#%@) and the far side in light ones (.:-), with 0/1 flickering
// through it. Parts animate (serpents undulate, tendrils sway, rings orbit, blades spin, cores
// breathe), light up when hit, pulse red when their attack lands this cycle, and burst into
// flying characters when broken. Reads state; never changes it.

const COLORS = { amber: '#f1b92f', bright: '#fff2c8', hot: '#ff5b3d', dim: '#7e5311', gold: '#ffd85c', deep: '#a8741c' };
const RAMP = ' .,:-=+*#%@'; // dark → lit
const SHARDS = '#*+=:.01';

// Which shape a virus wears: its strain first, then a guard's own kind, then its family's.
const STRAIN_SHAPE = { keylogger: 'eye', hashrat: 'cube', floodgate: 'fountain', leech: 'tick', sleeper: 'cocoon', patchwork: 'crab', flicker: 'wraith', extortion: 'padlock', echo: 'rings', bricker: 'block', overrun: 'hive' };
const GUARD_SHAPE = { watchdog: 'hound', sentinel: 'eye', crawler: 'spider', shredder: 'blades', bouncer: 'block', tracer: 'dish' };
const FAMILY_SHAPE = { ransomware: 'crab', worm: 'serpent', ghostroot: 'wraith', watchdog: 'hound' };
export const shapeOf = (v) => STRAIN_SHAPE[v.strain] || GUARD_SHAPE[v.family] || FAMILY_SHAPE[v.art] || FAMILY_SHAPE[v.family] || 'crab';

// A small seeded random, so each virus keeps its own variation.
function rng(seed) { let x = (seed >>> 0) || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function createArt({ getState, canMove, getSelected, getNowSources }) {
  let canvas = null, ctx = null, previous = 0, angle = 0, clock = 0;
  let builtFor = '', points = [], anims = [], radius = 1, rx = 1, ry = 1;
  const hits = new Map();
  let shake = null, glitch = 0;
  const shards = [];
  const rain = [];

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
    const sway = (anchor, amp = 0.25, speed = 1.4, phase = r() * 6) => anim({ k: 'sway', c: anchor, amp, speed, phase });
    const orbit = (c, speed, tilt = 0) => anim({ k: 'orbit', c, speed, tilt });
    const spin = (c, speed, axis = 'z') => anim({ k: 'spin', c, speed, axis });

    if (shape === 'crab') {
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
    }
    // Decorations by seed: antennae or an orbiting halo now and then.
    if (r() < 0.35 && !['blades', 'block', 'gate', 'dish', 'fountain'].includes(shape)) for (const side of [-1, 1]) tube([side * 10, -38, -6], [side * 22, -66, -14], 1.5, 0.3, 'body', sway([side * 10, -38, -6], 0.25, 2, side));
    if (r() < 0.25 && !['eye', 'rings', 'hive'].includes(shape)) ring(0, 0, 0, 70, 0.8, 'body', orbit([0, 0, 0], 0.4, 1.1), 1.1);
    radius = Math.max(40, ...points.map((p) => Math.hypot(p.x, p.y, p.z)));
    rx = Math.max(40, ...points.map((p) => Math.hypot(p.x, p.z))); // it turns: its widest is any horizontal reach
    ry = Math.max(40, ...points.map((p) => Math.abs(p.y) + 8));
  }

  // ---------- parts ----------
  // The body isn't a part: it shows the virus's armor, bright while chits remain, dim once stripped.
  function body(v) {
    const max = v.parts.reduce((n, p) => n + (p.maxArmor || 0), 0);
    const left = v.parts.reduce((n, p) => n + (p.integrity > 0 ? p.armor || 0 : 0), 0);
    return { id: 'body', integrity: max ? Math.max(0.2, left) : 1, max: max || 1 };
  }
  function resolvePart(v, region) {
    if (region === 'body') return body(v);
    if (region.startsWith('frag')) {
      const living = v.parts.filter((p) => p.kind === 'fragment' && p.integrity > 0);
      return living[Number(region.slice(4)) - 1] || { integrity: 0, max: 1, ghost: true };
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
      case 'breathe': { const k = 1 + Math.sin(t * A.speed) * A.amp; x = cx + (x - cx) * k; y = cy + (y - cy) * k; z = cz + (z - cz) * k; break; }
      case 'ripple': { const k = 1 + Math.sin(t * A.speed - A.phase) * A.amp; x = cx + (x - cx) * k; z = cz + (z - cz) * k; break; }
      case 'wave': y += Math.sin(t * A.speed + x * A.freq) * A.amp; z += Math.cos(t * A.speed * 0.7 + x * A.freq) * A.amp * 0.5; break;
      case 'bob': y += Math.sin(t * A.speed) * A.amp; break;
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

    // Behind it: a faint data rain.
    if (motion) {
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

    const yaw = Math.sin(angle) * 0.9 + angle * 0.15, pitch = 0.2 + Math.sin(clock * 0.4) * 0.06;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    for (const [id, h] of hits) if (now - h.time > 900) hits.delete(id);
    const quake = motion && shake && now - shake.time < 350 ? (1 - (now - shake.time) / 350) ** 2 * shake.power : 0;
    const qx = quake ? (Math.random() - 0.5) * quake : 0, qy = quake ? (Math.random() - 0.5) * quake : 0;
    const tearing = motion && now < glitch; // a hit tears a few rows sideways
    const tearRows = tearing ? new Set(Array.from({ length: 4 }, () => Math.floor(Math.random() * (height / gy)))) : null;
    const selected = getSelected(), nowSources = getNowSources();
    const scale = Math.min((width * 0.47) / rx, (height * 0.42) / ry);
    const pulse = 0.55 + 0.45 * Math.sin(now / 160); // parts about to attack throb
    const phased = s.encounter.cycle % 2 === 1;

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
      const k = 300 / (300 + z1);
      const age = h ? (now - h.time) / 900 : 0;
      const fresh = h && part.integrity > 0 && motion ? (1 - age) ** 2 : 0;
      const jolt = fresh * (h?.kind === 'crit' ? 12 : h?.kind === 'attack' ? 0 : h?.kind === 'chit' ? 4 : 7);
      const lunge = h?.kind === 'attack' ? fresh * 14 : 0;
      let sx = width / 2 + qx + x1 * k * scale * (1 + lunge / 200) + Math.sin(i * 7.3) * jolt;
      let sy = height / 2 + qy + y1 * k * scale * (1 + lunge / 200) + lunge + Math.cos(i * 3.1) * jolt;
      const row = Math.round(sy / gy);
      if (tearRows?.has(row)) sx += (Math.random() < 0.5 ? -1 : 1) * gx * 3;
      const cx = Math.round(sx / gx), cyc = row;
      const cell = cx * 10000 + cyc;
      const was = cells.get(cell);
      if (was && was.z <= z1) continue;
      const lum = Math.max(0, nx1 * LIGHT[0] + ny1 * LIGHT[1] + nz1 * LIGHT[2]);
      cells.set(cell, { x: cx * gx, y: cyc * gy, z: z1, lum, part, h, fresh, i, region: p.region });
    }

    for (const c of cells.values()) {
      const { part, h, fresh } = c;
      const broken = part.integrity === 0;
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
      const flare = h && !broken ? (h.kind === 'attack' ? COLORS.hot : h.kind === 'crit' ? COLORS.gold : COLORS.bright) : null;
      const attacking = part.id && nowSources.has(part.id);
      ctx.fillStyle = flare || (attacking ? COLORS.hot : part.id === selected ? COLORS.gold : c.region === 'body' ? (ratio < 0.4 ? COLORS.dim : COLORS.deep) : ratio < 0.4 ? COLORS.dim : lit > 0.7 ? COLORS.bright : COLORS.amber);
      const age = h ? (now - h.time) / 900 : 0;
      ctx.globalAlpha = Math.min(1, depth * faded * (attacking && !flare ? pulse + 0.25 : 1) * (broken ? Math.max(0, 1 - age * 1.6) : 1) * (0.55 + lit * 0.6));
      ctx.fillText(ch, c.x, c.y);
    }

    // Shards: characters thrown off a broken part, falling away.
    if (motion && shards.length) {
      ctx.fillStyle = COLORS.bright;
      for (let i = shards.length - 1; i >= 0; i--) {
        const d = shards[i];
        d.life -= delta;
        if (d.life <= 0) { shards.splice(i, 1); continue; }
        d.vy += 0.00025 * delta * 60; d.x += d.vx * delta / 16; d.y += d.vy * delta / 16;
        ctx.globalAlpha = Math.min(1, d.life / 500);
        ctx.fillStyle = d.life > 600 ? COLORS.bright : COLORS.amber;
        ctx.fillText(d.c, Math.round(d.x / gx) * gx, Math.round(d.y / gy) * gy);
      }
    }
    ctx.globalAlpha = 1;
    lastFrame = { cells, width, height };
  }
  let lastFrame = null;
  // Throw a burst of characters from where a part was drawn.
  function burst(id, n = 46) {
    if (!lastFrame || !canMove()) return;
    const mine = [...lastFrame.cells.values()].filter((c) => c.part?.id === id);
    const cx = mine.length ? mine.reduce((a, c) => a + c.x, 0) / mine.length : lastFrame.width / 2;
    const cy = mine.length ? mine.reduce((a, c) => a + c.y, 0) / mine.length : lastFrame.height / 2;
    for (let i = 0; i < n; i++) {
      const from = mine.length ? mine[Math.floor(Math.random() * mine.length)] : { x: cx, y: cy };
      const a = Math.atan2(from.y - cy, from.x - cx) + (Math.random() - 0.5) * 1.2, sp = 1.5 + Math.random() * 4;
      shards.push({ x: from.x, y: from.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, c: SHARDS[Math.floor(Math.random() * SHARDS.length)], life: 700 + Math.random() * 500 });
    }
  }
  requestAnimationFrame(draw);

  return {
    attach(el) { if (canvas !== el) { canvas = el; ctx = el.getContext('2d'); } },
    // kind: 'hit' (you hit it), 'crit', 'chit' (an armor chit broke), 'attack' (its attack landed on you), 'break'.
    hit(id, kind = 'hit') {
      const t = performance.now();
      hits.set(id, { time: t, kind });
      if (kind === 'crit' || kind === 'attack' || kind === 'break') shake = { time: t, power: kind === 'attack' ? 9 : kind === 'break' ? 12 : 7 };
      if (kind !== 'chit') glitch = t + (kind === 'break' || kind === 'crit' ? 220 : 130);
      if (kind === 'break') burst(id);
      if (kind === 'chit') burst(id, 10);
    },
  };
}

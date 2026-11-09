// Light for ability effects (abilityfx.mjs; docs/ui.md "Ability effects"): what an ability does where it lands, drawn in
// light the way the threat's telegraphs are (chipfx.mjs), in the shooter's colour. The ASCII piece is still what you
// throw; this is the flash, the shock ring rolling along the bar, the cracks, the spark streaks, the flames, the comet
// that carries an effect to where it plays, the fan a swing leaves, and a status cashing in (a crosshair closing, brackets
// snapping on, a line pulling tight).
//
// Pure: a list of light items and a time (ms from the effect's start) → SVG markup. Every item works out where it is at
// any time from where it started (particles are thrown with a velocity, drag and gravity), so a frame never depends on
// the one before. Each is drawn in three layers: a bloom halo, the body, a white-hot core.
//
// An item: { kind, tone?, ...its own }. tone picks another colour than the effect's: 'steel' (a hit on ◆), 'crit'.
//   flash    { x, y, t0, R, dur }                  a bloom that opens and goes, a white core
//   ring     { x, y, t0, rx, ry, dur, w }          a shock ring rolling out flat (or round)
//   glint    { x, y, t0, s, dur }                  a four-point glint
//   sparks   { list, w }                           streaks, each drawn back to where it was 30 ms ago
//   embers   { list }                              points of light, white then the colour
//   puffs    { list }                              soft dust
//   cracks   { net, t0, grow, life }               fractal lines growing out, glowing, fading
//   fire     { x0, w, base, n, from, run, H, ph, t0, rise, fall }   flame tongues running out from `from`
//   comet    { a, b, lift, t1, t2, R0 }            a head of light and its tail, from a to b over t1–t2
//   smear    { cx, cy, r0, r1, a1, a2, t1, t2 }     the fan a swing leaves (angles in degrees, eased in)
//   cross    { from, to, t0, t1, t2 }              a crosshair flying from a status mark, closing on to at t1
//   brackets { box, t0, dur }                      four corner brackets snapping onto a box
//   tether   { from, to, t0, dur }                 a line of light pulled tight, a flash where it bites
//   halo     { box, t0, dur }                      a glow round a status mark (its flare; the mark itself is untouched)
// A particle (sparks, embers, puffs): { x, y, vx, vy (px/s), g (px/s²), drag (/s), t0, life (ms), r (0–1) }.

export const NS = 'http://www.w3.org/2000/svg';
export const TONES = {
  you: { c: '#7fd1c7', hot: '#e4fffb' },
  crit: { c: '#ffd85c', hot: '#fff6dc' },
  crew: { c: '#c3a6ff', hot: '#f4efff' },
  steel: { c: '#86b6c6', hot: '#e6f6fb' },
};
// The filters the layer's drawings use, put on the page once.
export const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" id="afx-defs"><defs>
<filter id="afx-bloom" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter>
<filter id="afx-bloom2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="afx-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs></svg>`;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, f) => a + (b - a) * f;
const f1 = (v) => (+v).toFixed(1);
export const EASE = {
  in: (f) => f * f * f,
  out: (f) => 1 - (1 - f) ** 3,
  go: (f) => (f < 0.5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2),
};
const noise = (x) => Math.sin(x) * 0.5 + Math.sin(x * 2.17 + 1.3) * 0.3 + Math.sin(x * 4.73 + 2.1) * 0.2;
const pts = (a) => a.map((q) => `${f1(q[0])},${f1(q[1])}`).join(' ');

// ---------- making items ----------
// n particles thrown from at (time t0, jittered up to jit ms) in a fan of `spread` round angle a0.
export function throwN(rnd, n, at, t0, { a0 = -Math.PI / 2, spread = Math.PI, v = [120, 320], g = 900, drag = 3, life = [260, 440], jit = 30, xs = 0, ys = 0 } = {}) {
  return Array.from({ length: Math.max(0, n) }, () => {
    const a = a0 - spread / 2 + rnd() * spread, s = lerp(v[0], v[1], rnd());
    return { x: at.x + (rnd() - 0.5) * xs, y: at.y + (rnd() - 0.5) * ys, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g, drag, t0: t0 + rnd() * jit, life: lerp(life[0], life[1], rnd()), r: rnd() };
  });
}
// Midpoint displacement: a fractal line from a to b.
function fractal(rnd, a, b, depth, rough) {
  let line = [a, b];
  for (let d = 0; d < depth; d++) {
    const next = [line[0]];
    for (let i = 0; i < line.length - 1; i++) {
      const p = line[i], q = line[i + 1], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1, o = (rnd() * 2 - 1) * len * rough;
      next.push([(p[0] + q[0]) / 2 - (dy / len) * o, (p[1] + q[1]) / 2 + (dx / len) * o], q);
    }
    line = next;
  }
  return line;
}
// A crack network from (x, y): mains at [angle, length], each branching once, short and toward the name (up).
export function crackNet(rnd, x, y, mains) {
  const segs = [];
  for (const [ang, len] of mains) {
    const end = [x + Math.cos(ang) * len, y + Math.sin(ang) * len], line = fractal(rnd, [x, y], end, len > 60 ? 4 : 3, 0.22 * Math.min(1, 50 / len));
    segs.push({ line, s: 0, p: 0.65, w: 1 });
    const j = 2 + Math.floor(rnd() * (line.length - 3)), q = line[j], up = Math.sin(ang + 0.4) < Math.sin(ang - 0.4) ? 1 : -1;
    const ba = ang + up * (0.25 + rnd() * 0.3), bl = Math.min(22, len * (0.25 + rnd() * 0.2));
    segs.push({ line: fractal(rnd, q, [q[0] + Math.cos(ba) * bl, q[1] + Math.sin(ba) * bl], 2, 0.25), s: 0.35 * j / line.length + 0.25, p: 0.5, w: 0.7 });
  }
  return segs;
}
// A fire's flicker phases.
export const firePhases = (rnd, n) => Array.from({ length: 2 * n + 2 }, () => rnd() * 60);

// ---------- time ----------
// When an item is over (ms).
export function endOf(it) {
  if (it.list) return Math.max(0, ...it.list.map((p) => p.t0 + p.life));
  if (it.kind === 'cracks') return it.t0 + it.life;
  if (it.kind === 'fire') return it.t0 + it.rise + it.fall;
  if (it.kind === 'comet') return it.t2 + 20;
  if (it.kind === 'smear') return it.t2 + 25;
  if (it.kind === 'cross') return it.t2;
  return it.t0 + (it.dur || 0);
}
// When it starts showing (ms).
export function startOf(it) {
  if (it.list) return Math.min(...it.list.map((p) => p.t0));
  if (it.kind === 'comet' || it.kind === 'smear') return it.t1;
  return it.t0;
}
// An item played k times as fast (abilityfx.mjs SPEED): its times shrink, its velocities and gravity grow to match.
export function hasten(it, k) {
  const o = { ...it };
  for (const f of ['t0', 't1', 't2', 'dur', 'grow', 'life', 'rise', 'fall']) if (typeof o[f] === 'number') o[f] /= k;
  if (typeof o.run === 'number') o.run *= k;
  if (o.list) o.list = o.list.map((p) => ({ ...p, t0: p.t0 / k, life: p.life / k, vx: p.vx * k, vy: p.vy * k, g: (p.g || 0) * k * k, drag: (p.drag || 0) * k }));
  return o;
}
// An item moved later by ms.
export function later(it, ms) {
  if (!ms) return it;
  const o = { ...it };
  for (const f of ['t0', 't1', 't2']) if (typeof o[f] === 'number') o[f] += ms;
  if (o.list) o.list = o.list.map((p) => ({ ...p, t0: p.t0 + ms }));
  return o;
}
// An item cut to end by cap (ms): particles that would outlive it are cut short; null if nothing of it is left.
export function capped(it, cap) {
  if (startOf(it) >= cap - 1) return null;
  if (endOf(it) <= cap) return it;
  const o = { ...it };
  if (o.list) { o.list = o.list.filter((p) => p.t0 < cap - 1).map((p) => ({ ...p, life: Math.min(p.life, cap - p.t0) })); return o.list.length ? o : null; }
  if (o.kind === 'cracks') o.life = cap - o.t0;
  else if (o.kind === 'fire') o.fall = Math.max(1, cap - o.t0 - o.rise);
  else if (o.kind === 'comet' || o.kind === 'smear') o.t2 = Math.min(o.t2, cap - 25);
  else if (o.kind === 'cross') o.t2 = cap;
  else o.dur = cap - o.t0;
  return o;
}

// ---------- drawing ----------
// A stroke in three layers: a bloom halo, the body, a white-hot core.
function lit(d, w, k, { op = 1, heat = 0.7, halo = 0.6, cap = 'round' } = {}) {
  if (op <= 0.01) return '';
  return `<g opacity="${f1(op)}" fill="none" stroke-linecap="${cap}" stroke-linejoin="round">`
    + `<path d="${d}" stroke="${k.c}" stroke-width="${f1(w * 3)}" opacity="${f1(halo)}" filter="url(#afx-bloom)"/>`
    + `<path d="${d}" stroke="${k.c}" stroke-width="${f1(w)}"/>`
    + (heat > 0.02 ? `<path d="${d}" stroke="${k.hot}" stroke-width="${f1(Math.max(0.5, w * 0.42))}" opacity="${f1(heat)}"/>` : '')
    + '</g>';
}
const ellipse = (x, y, rx, ry) => `M${f1(x - rx)},${f1(y)} a${f1(rx)},${f1(ry)} 0 1,0 ${f1(2 * rx)},0 a${f1(rx)},${f1(ry)} 0 1,0 ${f1(-2 * rx)},0`;
function body(p, tau) {
  const dk = p.drag || 0.0001, f = (1 - Math.exp(-dk * tau)) / dk;
  return [p.x + p.vx * f, p.y + p.vy * f + 0.5 * (p.g || 0) * tau * tau];
}
// The ms of a particle's own life at t, or null when it isn't showing.
const age = (p, t) => { const a = t - p.t0; return a > 0 && a < p.life ? a : null; };

const DRAW = {
  flash(it, t, k) {
    const f = (t - it.t0) / it.dur;
    if (f < 0 || f > 1) return '';
    const g = EASE.out(f);
    return `<circle cx="${f1(it.x)}" cy="${f1(it.y)}" r="${f1(it.R * (0.35 + 0.9 * g))}" fill="${k.c}" opacity="${f1(0.75 * (1 - f))}" filter="url(#afx-bloom2)"/>`
      + `<circle cx="${f1(it.x)}" cy="${f1(it.y)}" r="${f1(it.R * 0.32 * (1 - f * 0.7))}" fill="${k.hot}" opacity="${f1(1 - f)}" filter="url(#afx-soft)"/>`;
  },
  ring(it, t, k) {
    const f = (t - it.t0) / it.dur;
    if (f < 0 || f > 1) return '';
    const g = 0.08 + 0.92 * EASE.out(f);
    return lit(ellipse(it.x, it.y, it.rx * g, it.ry * (0.15 + 0.85 * EASE.out(f))), (it.w || 2) * (1 - f * 0.7), k, { op: (1 - f) ** 1.3, heat: 0.6 * (1 - f) });
  },
  glint(it, t, k) {
    const f = (t - it.t0) / it.dur;
    if (f < 0 || f > 1) return '';
    const q = Math.sin(f * Math.PI) * it.s, w = q * 0.16, x = it.x, y = it.y;
    const d = `M${f1(x)},${f1(y - q)} L${f1(x + w)},${f1(y - w)} L${f1(x + q)},${f1(y)} L${f1(x + w)},${f1(y + w)} L${f1(x)},${f1(y + q)} L${f1(x - w)},${f1(y + w)} L${f1(x - q)},${f1(y)} L${f1(x - w)},${f1(y - w)}Z`;
    return `<path d="${d}" fill="${k.c}" filter="url(#afx-bloom)" opacity=".8"/><path d="${d}" fill="${k.hot}"/>`;
  },
  sparks(it, t, k) {
    let s = '';
    for (const p of it.list) {
      const a = age(p, t);
      if (a == null) continue;
      const tau = a / 1000, [x, y] = body(p, tau), [x0, y0] = body(p, Math.max(0, tau - 0.03)), o = 1 - (a / p.life) ** 1.6;
      s += lit(`M${f1(x0)},${f1(y0)} L${f1(x)},${f1(y)}`, it.w || 1.1, k, { op: o, heat: 0.9 * o, halo: 0.5 });
    }
    return s;
  },
  embers(it, t, k) {
    let s = '';
    for (const p of it.list) {
      const a = age(p, t);
      if (a == null) continue;
      const tau = a / 1000, f = a / p.life;
      let [x, y] = body(p, tau);
      x += Math.sin(tau * 9 + p.r * 20) * 3 * tau;
      const o = (1 - f ** 2) * (0.7 + 0.3 * Math.sin(tau * 40 + p.r * 9)), r = 0.9 + p.r * 0.9;
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 2.6)}" fill="${k.c}" opacity="${f1(o * 0.6)}" filter="url(#afx-bloom)"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${f < 0.5 ? k.hot : k.c}" opacity="${f1(o)}"/>`;
    }
    return s;
  },
  puffs(it, t, k) {
    let s = '';
    for (const p of it.list) {
      const a = age(p, t);
      if (a == null) continue;
      const [x, y] = body(p, a / 1000), f = a / p.life;
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(3 + 9 * EASE.out(f))}" fill="${k.c}" opacity="${f1(0.28 * (1 - f))}" filter="url(#afx-bloom)"/>`;
    }
    return s;
  },
  cracks(it, t, k) {
    const a = t - it.t0;
    if (a < 0 || a > it.life) return '';
    const g = a / it.grow, o = clamp(1 - (a - it.life * 0.45) / (it.life * 0.55));
    return `<g opacity="${f1(o)}">` + it.net.map((sg) => {
      const f = clamp((g - sg.s) / sg.p);
      if (f <= 0) return '';
      const P = pts(sg.line);
      return `<polyline points="${P}" pathLength="1" fill="none" stroke="${k.c}" stroke-width="${f1(2.6 * sg.w)}" stroke-dasharray="1 1" stroke-dashoffset="${f1(1 - f)}" opacity=".7" filter="url(#afx-bloom)"/>`
        + `<polyline points="${P}" pathLength="1" fill="none" stroke="${k.hot}" stroke-width="${f1(0.9 * sg.w)}" stroke-linecap="round" stroke-dasharray="1 1" stroke-dashoffset="${f1(1 - f)}"/>`;
    }).join('') + '</g>';
  },
  fire(it, t, k) {
    const a = t - it.t0;
    if (a < 0 || a > it.rise + it.fall) return '';
    const env = a < it.rise ? EASE.out(a / it.rise) : clamp(1 - (a - it.rise) / it.fall) ** 1.4;
    if (env <= 0.01) return '';
    const { x0, w, base, n, from, ph, H } = it, sec = a / 1000, front = it.run * sec, hs = [], hb = [], hc = [], sw = [], sb = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + 0.5) * w / n, d = Math.abs(x - from), f = 0.5 + 0.5 * noise(sec * 9 + ph[i]), g = 0.5 + 0.5 * noise(sec * 7 + ph[n + i]);
      const reach = d > front ? 0 : env * (1 - 0.45 * d / (w / 2 + 1)) * clamp((front - d) / 14);
      hs.push(H * reach * (0.5 + 0.7 * f)); hb.push(H * 1.3 * reach * (0.45 + 0.7 * g)); hc.push(H * reach * (0.5 + 0.7 * f) * (0.32 + 0.2 * f));
      sw.push(noise(sec * 5 + ph[i + 1]) * 3.5); sb.push(noise(sec * 4 + ph[n + i + 1]) * 4.5);
    }
    const lo = Math.max(x0, from - front), hi = Math.min(x0 + w, from + front);
    const back = flameD(x0 + w / n / 2, w - w / n, base, hb.slice(0, n - 1), sb.slice(0, n - 1)), d1 = flameD(x0, w, base, hs, sw), d2 = flameD(x0, w, base, hc, sw);
    return `<rect x="${f1(lo)}" y="${f1(base - 2.5)}" width="${f1(Math.max(0, hi - lo))}" height="5" fill="${k.c}" opacity="${f1(0.75 * env)}" filter="url(#afx-bloom)"/>`
      + `<path d="${back}" fill="${k.c}" opacity=".3" filter="url(#afx-bloom)"/>`
      + `<path d="${d1}" fill="${k.c}" opacity=".55" filter="url(#afx-bloom)"/><path d="${d1}" fill="${k.c}" opacity=".38"/><path d="${d2}" fill="${k.hot}" opacity=".8" filter="url(#afx-soft)"/>`;
  },
  comet(it, t, k) {
    if (t < it.t1 || t > it.t2 + 20) return '';
    const pos = (tt) => { const f = EASE.go(clamp((tt - it.t1) / (it.t2 - it.t1 || 1))); return [lerp(it.a.x, it.b.x, f), lerp(it.a.y, it.b.y, f) - Math.sin(f * Math.PI) * (it.lift || 0)]; };
    const now = Math.min(t, it.t2), o = t > it.t2 ? 1 - (t - it.t2) / 20 : clamp((t - it.t1) / 30), N = 14, P = [], R0 = it.R0 || 4;
    for (let j = N; j >= 0; j--) P.push(pos(Math.max(it.t1, now - j * 6)));
    let tail = '';
    for (let j = 0; j < N; j++) { // thin and faint at its end, as wide as the head at the head
      const f = (j + 1) / N, d = `M${f1(P[j][0])},${f1(P[j][1])} L${f1(P[j + 1][0])},${f1(P[j + 1][1])}`;
      tail += `<path d="${d}" stroke="${k.c}" stroke-width="${f1(R0 * 2.2 * f)}" opacity="${f1(0.35 * f)}" filter="url(#afx-bloom)"/><path d="${d}" stroke="${f > 0.6 ? k.hot : k.c}" stroke-width="${f1(0.4 + R0 * 0.9 * f)}" opacity="${f1(f)}"/>`;
    }
    const [x, y] = P[N];
    return `<g opacity="${f1(o)}" fill="none" stroke-linecap="round">${tail}</g><g opacity="${f1(o)}"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R0 * 1.8)}" fill="${k.c}" opacity=".5" filter="url(#afx-bloom)"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R0 * 0.75)}" fill="${k.hot}" filter="url(#afx-soft)"/></g>`;
  },
  smear(it, t, k) {
    if (t < it.t1 + 10 || t > it.t2 + 25) return '';
    const ang = (tt) => lerp(it.a1, it.a2, EASE.in(clamp((tt - it.t1) / (it.t2 - it.t1 || 1))));
    const a1 = ang(t), a0 = ang(Math.max(it.t1, t - 45));
    if (Math.abs(a0 - a1) < 1) return '';
    const P = (r, a) => [it.cx + r * Math.cos(a * Math.PI / 180), it.cy + r * Math.sin(a * Math.PI / 180)], sweep = a1 < a0 ? 0 : 1, o = t > it.t2 ? 1 - (t - it.t2) / 25 : 1;
    let s = '';
    [[a0, 0.12], [lerp(a0, a1, 0.5), 0.18], [lerp(a0, a1, 0.8), 0.26]].forEach(([b0, op]) => {
      const [x0, y0] = P(it.r1, b0), [x1, y1] = P(it.r1, a1), [x2, y2] = P(it.r0, a1), [x3, y3] = P(it.r0, b0);
      s += `<path d="M${f1(x0)},${f1(y0)} A${f1(it.r1)},${f1(it.r1)} 0 0,${sweep} ${f1(x1)},${f1(y1)} L${f1(x2)},${f1(y2)} A${f1(it.r0)},${f1(it.r0)} 0 0,${1 - sweep} ${f1(x3)},${f1(y3)}Z" fill="${k.c}" opacity="${f1(op * o)}" filter="url(#afx-soft)"/>`;
    });
    return s;
  },
  cross(it, t, k) {
    const a = t - it.t0;
    if (a < 0 || t > it.t2) return '';
    const f = clamp(a / (it.t1 - it.t0 || 1)), g = EASE.go(f), c = { x: lerp(it.from.x, it.to.x, g), y: lerp(it.from.y, it.to.y, g) };
    const gap = lerp(18, 3, EASE.in(f)), arm = 7, o = t < it.t1 ? clamp(a / 60) : clamp(1 - (t - it.t1) / (it.t2 - it.t1 || 1));
    const d = `M${f1(c.x - gap - arm)},${f1(c.y)} h${arm} M${f1(c.x + gap)},${f1(c.y)} h${arm} M${f1(c.x)},${f1(c.y - gap - arm)} v${arm} M${f1(c.x)},${f1(c.y + gap)} v${arm}`;
    return lit(d, 1.4, k, { op: o, heat: 0.8 }) + lit(ellipse(c.x, c.y, gap + 2, gap + 2), 0.9, k, { op: o * 0.6, heat: 0.4 });
  },
  brackets(it, t, k) {
    const f = (t - it.t0) / it.dur;
    if (f < 0 || f > 1) return '';
    const s = 1 - EASE.out(clamp(f / 0.3)), out = 10 * s, L = 6, b = it.box, o = f < 0.6 ? 1 : 1 - (f - 0.6) / 0.4;
    const l = b.l - 3 - out, r = b.r + 3 + out, tp = b.t - 2 - out * 0.5, bt = b.b + 2 + out * 0.5;
    const d = `M${f1(l)},${f1(tp + L)} V${f1(tp)} H${f1(l + L)} M${f1(r - L)},${f1(tp)} H${f1(r)} V${f1(tp + L)} M${f1(r)},${f1(bt - L)} V${f1(bt)} H${f1(r - L)} M${f1(l + L)},${f1(bt)} H${f1(l)} V${f1(bt - L)}`;
    return lit(d, 1.5, k, { op: o, heat: 0.7 * o, cap: 'square' });
  },
  tether(it, t, k) {
    const f = (t - it.t0) / it.dur;
    if (f < 0 || f > 1) return '';
    const sag = 14 * (1 - EASE.out(clamp(f / 0.35))), mx = (it.from.x + it.to.x) / 2, my = (it.from.y + it.to.y) / 2 + sag, o = f < 0.55 ? 1 : 1 - (f - 0.55) / 0.45;
    return lit(`M${f1(it.from.x)},${f1(it.from.y)} Q${f1(mx)},${f1(my)} ${f1(it.to.x)},${f1(it.to.y)}`, 1.1, k, { op: o, heat: 0.8 * o })
      + (f > 0.3 && f < 0.75 ? DRAW.glint({ x: it.to.x, y: it.to.y, t0: 0.3, s: 8, dur: 0.45 }, f, k) : '');
  },
  halo(it, t, k) {
    const f = (t - it.t0) / it.dur;
    if (f < 0 || f > 1) return '';
    const b = it.box, o = Math.sin(f * Math.PI);
    return `<rect x="${f1(b.l - 3)}" y="${f1(b.t - 3)}" width="${f1(b.r - b.l + 6)}" height="${f1(b.b - b.t + 6)}" rx="3" fill="${k.c}" opacity="${f1(0.45 * o)}" filter="url(#afx-bloom)"/>`;
  },
};
export const KINDS = Object.keys(DRAW);
// Flame tongues standing on y = base from x0 across w (hs: each tongue's height, sw: its sway). chipfx.mjs's.
function flameD(x0, w, base, hs, sw) {
  const n = hs.length, cw = w / n;
  let d = `M${f1(x0)},${f1(base)} L${f1(x0)},${f1(base - hs[0] * 0.15)}`;
  for (let i = 0; i < n; i++) {
    const xl = x0 + i * cw, xr = xl + cw, tx = xl + cw / 2 + sw[i], ty = base - hs[i];
    const yl = base - Math.min(hs[i], hs[i - 1] ?? hs[i]) * 0.15, yr = base - Math.min(hs[i], hs[i + 1] ?? hs[i]) * 0.15;
    d += ` C${f1(xl + (tx - xl) * 0.45)},${f1(yl - (yl - ty) * 0.4)} ${f1(tx - (tx - xl) * 0.12)},${f1(ty + (yl - ty) * 0.38)} ${f1(tx)},${f1(ty)} C${f1(tx + (xr - tx) * 0.12)},${f1(ty + (yr - ty) * 0.38)} ${f1(xr - (xr - tx) * 0.45)},${f1(yr - (yr - ty) * 0.4)} ${f1(xr)},${f1(yr)}`;
  }
  return d + ` L${f1(x0 + w)},${f1(base)} Z`;
}

// Every item at t (ms from the effect's start) → SVG markup, in tone (the effect's colour: TONES key) unless an item
// names its own.
export function drawLight(items, t, tone = 'you') {
  let s = '';
  for (const it of items) s += DRAW[it.kind]?.(it, t, TONES[it.tone || tone] || TONES.you) || '';
  return s;
}

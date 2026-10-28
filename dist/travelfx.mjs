// A step between rooms (app.js, on the rooms page): you travel the trace as code. It runs from the edge of the room you
// left to the edge of the one you walked into, then a scan line runs down that room's chip as you load into it. Teal,
// since it's you; short, and it never holds up a click. Three looks while the designer picks one (?travel=):
//   bits     a train of 1s and 0s rides the trace, its head bright, its tail fading, flickering as it goes (the default);
//   pulse    the trace lights teal behind a bright head, then fades back;
//   scatter  the room you left breaks into bits that gather on its edge, stream down the trace and spread over the
//            next room's chip.
// The hunter's step, when you see it (in sight before or after it), plays the same way in red (hunt): a glitching red
// head drags a lit trace behind it, with no scan line. Yours and the hunter's play at once (a key each).
// The effect is drawn into the map's svg (both of them: the wide and the tall map) and put back if a redraw replaces
// the svg midway. Screen effects off, Motion off or reduced motion: none (app.js doesn't call it).
const NS = 'http://www.w3.org/2000/svg';
export const LOOKS = ['bits', 'pulse', 'scatter'];
const DUR = { bits: 560, pulse: 520, scatter: 820, hunt: 620 }; // the travel, in ms; the scan line takes SCAN after it
const SCAN = 260;
const runs = {};

export const el = (tag, attrs = {}, text) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
};
export const ease = (u) => 1 - (1 - u) ** 2;
export const clamp = (u) => Math.max(0, Math.min(1, u));
const bit = () => (Math.random() < 0.5 ? '0' : '1');
const inside = (p, c, hw, hh) => Math.abs(p.x - c.x) <= hw && Math.abs(p.y - c.y) <= hh;

// Measure a path: where it leaves the first chip and enters the second (s0, s1, along its length), and a point at any
// length, walked in the step's direction.
export function measure(path) {
  const m = el('path', { d: path.d }), probe = el('svg', { width: 0, height: 0, style: 'position:absolute' });
  probe.append(m); document.body.append(probe);
  const L = m.getTotalLength(), pt = (len) => { const q = m.getPointAtLength(path.rev ? L - len : len); return { x: q.x, y: q.y }; };
  const pts = Array.from({ length: 121 }, (_, i) => pt((L * i) / 120));
  probe.remove();
  let i0 = pts.findIndex((p) => !inside(p, path.a, path.hw, path.hh)), i1 = pts.findLastIndex((p) => !inside(p, path.b, path.hw, path.hh));
  if (i0 < 0 || i1 < i0) { i0 = 40; i1 = 80; }
  const at = (len) => { const f = clamp(len / L) * 120, i = Math.min(119, Math.floor(f)), t = f - i; return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t }; };
  return { L, s0: (L * i0) / 120, s1: (L * i1) / 120, at, pts: pts.slice(i0, i1 + 1) };
}
// A point on a chip's outline, from an angle.
const rim = (c, hw, hh, a) => { const k = Math.min(hw / Math.max(1e-3, Math.abs(Math.cos(a))), hh / Math.max(1e-3, Math.abs(Math.sin(a)))); return { x: c.x + Math.cos(a) * k, y: c.y + Math.sin(a) * k }; };

// Build one map's effect: its elements, and a draw(t) that places them at t ms.
function build(look, path) {
  const M = measure(path), span = M.s1 - M.s0, dur = DUR[look], g = el('g', { class: `fp-travel ${look}`, 'aria-hidden': 'true' });
  const scan = el('line', { class: 'fp-travel-scan' }), top = el('g', { class: `fp-travel ${look}`, 'aria-hidden': 'true' });
  top.append(scan);
  let draw;
  if (look === 'pulse' || look === 'hunt') {
    const hunt = look === 'hunt', lit = el('polyline', { class: 'fp-travel-lit', points: M.pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') }), head = hunt ? el('rect', { class: 'fp-travel-head', width: 5, height: 5 }) : el('circle', { class: 'fp-travel-head', r: 2.6 });
    lit.style.strokeDasharray = `${span} ${span + 1}`;
    g.append(lit, head);
    draw = (t) => {
      const u = clamp(t / dur), s = span * ease(u), p = M.at(M.s0 + s);
      lit.style.strokeDashoffset = `${span - s}`;
      lit.style.opacity = t < dur ? 1 : Math.max(0, 1 - (t - dur) / 300);
      if (hunt) { const j = () => (Math.random() < 0.3 ? (Math.random() - 0.5) * 3 : 0); head.setAttribute('x', (p.x - 2.5 + j()).toFixed(1)); head.setAttribute('y', (p.y - 2.5 + j()).toFixed(1)); } // it glitches as it goes
      else { head.setAttribute('cx', p.x.toFixed(1)); head.setAttribute('cy', p.y.toFixed(1)); }
      head.style.opacity = t < dur ? 1 : 0;
    };
  } else if (look === 'scatter') {
    const N = 12, LAG = 0.4, parts = Array.from({ length: N }, (_, i) => ({ e: el('text', { 'text-anchor': 'middle' }, bit()), from: rim(path.a, path.hw, path.hh, Math.random() * Math.PI * 2), to: rim(path.b, path.hw, path.hh, Math.random() * Math.PI * 2), lag: (i / N) * LAG }));
    for (const q of parts) top.append(q.e);
    const P0 = M.at(M.s0), P1 = M.at(M.s1);
    draw = (t) => {
      for (const q of parts) {
        const u = clamp((t / dur - q.lag) / (1 - LAG));
        let p, o;
        if (u < 0.3) { const k = ease(u / 0.3); p = { x: q.from.x + (P0.x - q.from.x) * k, y: q.from.y + (P0.y - q.from.y) * k }; o = 0.35 + 0.65 * k; }
        else if (u < 0.7) { p = M.at(M.s0 + span * ((u - 0.3) / 0.4)); o = 1; }
        else { const k = ease((u - 0.7) / 0.3); p = { x: P1.x + (q.to.x - P1.x) * k, y: P1.y + (q.to.y - P1.y) * k }; o = 1 - k; }
        if (t / dur <= q.lag || u >= 1) o = 0;
        q.e.setAttribute('x', p.x.toFixed(1)); q.e.setAttribute('y', (p.y + 3).toFixed(1));
        q.e.style.opacity = o.toFixed(2);
        if (Math.random() < 0.18) q.e.textContent = bit();
      }
    };
  } else {
    const N = 9, gap = 6.5, chars = Array.from({ length: N }, () => el('text', { 'text-anchor': 'middle' }, bit()));
    g.append(...chars);
    draw = (t) => {
      const head = (span + N * gap) * ease(clamp(t / dur));
      chars.forEach((c, i) => {
        const s = head - i * gap, p = M.at(M.s0 + s);
        c.setAttribute('x', p.x.toFixed(1)); c.setAttribute('y', (p.y + 3).toFixed(1));
        c.style.opacity = s < 0 || s > span ? 0 : (1 - i / N).toFixed(2);
        if (Math.random() < 0.2) c.textContent = bit();
      });
    };
  }
  // The scan line: down the chip you walked into, once the code reaches it.
  const scanAt = look === 'scatter' ? dur * 0.6 : dur * 0.82;
  const drawScan = (t) => {
    const u = (t - scanAt) / SCAN, y = path.b.y - path.hh + 2 * path.hh * ease(clamp(u));
    scan.setAttribute('x1', (path.b.x - path.hw + 3).toFixed(1)); scan.setAttribute('x2', (path.b.x + path.hw - 3).toFixed(1));
    scan.setAttribute('y1', y.toFixed(1)); scan.setAttribute('y2', y.toFixed(1));
    scan.style.opacity = u < 0 || u > 1 ? 0 : (0.9 * (1 - u * u)).toFixed(2);
  };
  if (look === 'hunt') return { g, top, draw, end: dur + 300 };
  return { g, top, draw: (t) => { draw(t); drawScan(t); }, end: Math.max(dur + 300, scanAt + SCAN) };
}

// Walk the trace from one room into the next: paths is { wide, tall }, each stepPath's result for that map (or null).
// key: whose step (you, the hunter); a new step of theirs replaces the one still playing.
export function playTravel(paths, look = 'bits', key = 'you') {
  stopTravel(key);
  if (!LOOKS.includes(look) && look !== 'hunt') look = 'bits';
  const fx = {};
  for (const k of ['wide', 'tall']) if (paths[k]) fx[k] = build(look, paths[k]);
  const end = Math.max(0, ...Object.values(fx).map((f) => f.end)), t0 = performance.now();
  const me = (runs[key] = { raf: 0, fx });
  const tick = () => {
    if (runs[key] !== me) return;
    const t = performance.now() - t0;
    if (t > end) return stopTravel(key);
    for (const k of Object.keys(fx)) {
      const svg = document.querySelector(`#page-view .fp-svg.${k}`), f = fx[k];
      if (!svg) continue;
      // Under the chips (the code goes into them) and over the traces; the scan line and the scatter over everything.
      if (f.g.parentNode !== svg) svg.insertBefore(f.g, svg.querySelector('.fp-room'));
      if (f.top.parentNode !== svg) svg.append(f.top);
      f.draw(t);
    }
    me.raf = requestAnimationFrame(tick);
  };
  me.raf = requestAnimationFrame(tick);
}
export function stopTravel(key = 'you') {
  const run = runs[key];
  if (!run) return;
  cancelAnimationFrame(run.raf);
  for (const f of Object.values(run.fx)) { f.g.remove(); f.top.remove(); }
  delete runs[key];
}

// Files and runners moving on the map (view.mjs trafficMarkup, runners-view.mjs), run by the graphics card: each dot gets transform and opacity
// animations when the map is drawn, its clock read from the time, so nothing runs every frame. Hub-to-hub dots loop:
// each lap carries the route's next shipment, from where it's cheap to where it pays, in the colour of the hub it left.
// Your transfers run once, home ↔ the hub, and stop at the end. A container's .no-ambient holds them still.
import { settle } from './flowfx.mjs';

const N = 48; // points along a route

const angle = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
function along(path) {
  const L = path.getTotalLength();
  return Array.from({ length: N + 1 }, (_, i) => { const q = path.getPointAtLength((L * i) / N); return { x: q.x, y: q.y }; });
}
const at = (p) => `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
// The heading at each point, unwrapped so the arrow never spins the long way round.
function headings(pts) {
  let last = null;
  return pts.map((p, i) => {
    let a = i < pts.length - 1 ? angle(p, pts[i + 1]) : angle(pts[i - 1], p);
    if (last != null) while (a - last > 180) a -= 360;
    if (last != null) while (last - a > 180) a += 360;
    return (last = a);
  });
}

// The hub-to-hub dot's laps: which way each runs (the shipment's way, else every other lap back).
function laps(d) {
  const ships = (d._ships ||= JSON.parse(d.dataset.ships || '[]'));
  const n = ships.length || 2;
  return { ships, n, back: Array.from({ length: n }, (_, j) => (ships.length ? !!ships[j].back : j % 2 === 1)) };
}
// What a hub-to-hub dot carries right now (its tooltip).
export function shipOf(d, now = Date.now()) {
  if (!d.dataset.period) return null;
  const { ships } = laps(d), lap = Math.floor(now / +d.dataset.period + +d.dataset.phase), sh = ships.length ? ships[lap % ships.length] : null;
  return sh && { ...sh, n: 4 + ((lap * 7 + ships.indexOf(sh) * 13) % 17) };
}

function backbone(d, pts, now) {
  const P = +d.dataset.period, { n, back } = laps(d), cycle = n * P;
  const t = { duration: cycle, iterations: Infinity };
  const cur = (((now / P + +d.dataset.phase) % n) + n) % n * P;
  const move = [], turn = [], fwd = headings(pts), rev = headings(pts.slice().reverse());
  back.forEach((b, j) => pts.forEach((_, i) => {
    const offset = (j + i / N) / n;
    move.push({ offset, transform: at(b ? pts[N - i] : pts[i]) });
    turn.push({ offset, transform: `rotate(${(b ? rev[i] : fwd[i]).toFixed(1)}deg)` });
  }));
  const shown = (want) => [...back.map((b, j) => ({ offset: j / n, opacity: b === want ? 1 : 0, easing: 'steps(1, end)' })), { offset: 1, opacity: back[n - 1] === want ? 1 : 0 }];
  const go = (el, keys) => { if (el) el.animate(keys, t).currentTime = cur; };
  go(d, move);
  go(d.querySelector('.pk-a'), shown(false)); go(d.querySelector('.pk-b'), shown(true));
  for (const a of d.querySelectorAll('.pk-dir')) go(a, turn);
}
function transfer(d, pts, now) {
  const t0 = +d.dataset.t0, t1 = +d.dataset.t1, way = d.dataset.rev ? pts.slice().reverse() : pts;
  const a = d.animate(way.map((p, i) => ({ offset: i / N, transform: at(p) })), { duration: Math.max(1, t1 - t0), fill: 'both' });
  a.currentTime = Math.max(0, Math.min(t1 - t0, now - t0));
  d.querySelector('.pk-dir')?.setAttribute('transform', `rotate(${angle(way[0], way[N]).toFixed(0)})`);
}
// Start every dot on the map that isn't running yet: at once, so it's drawn in place in the first frame, and settled
// (flowfx.mjs) once the map is laid out.
export function runPackets(root = document) {
  const now = Date.now(), fresh = [];
  for (const d of root.querySelectorAll('.map-svg .mpkt')) {
    if (d._run) continue;
    const path = d.ownerSVGElement?.querySelector(`[data-rid="${d.dataset.route}"]`);
    if (!path) continue;
    d._run = true;
    const pts = along(path);
    if (d.dataset.period) backbone(d, pts, now); else transfer(d, pts, now);
    fresh.push(...d.getAnimations({ subtree: true }));
    if (d.closest('.no-ambient')) for (const a of d.getAnimations({ subtree: true })) a.pause();
  }
  settle(fresh);
}
// Runners on a road (runners-view.mjs data-glide: from, to, ms to the road's end, the wall time the clock was read):
// each diamond slides on toward the road's end from when it was drawn, so it moves smoothly between ticks, and stops
// there until the next redraw moves it on.
export function runRunners(root = document) {
  const now = Date.now(), fresh = [];
  for (const d of root.querySelectorAll('.map-svg [data-glide]')) {
    if (d._run) continue;
    d._run = true;
    const [ax, ay, bx, by, ms, t0] = d.dataset.glide.split(' ').map(Number);
    if (!(ms > 0)) continue;
    const a = d.animate([{ transform: at({ x: ax, y: ay }) }, { transform: at({ x: bx, y: by }) }], { duration: ms, fill: 'forwards' });
    a.currentTime = Math.max(0, Math.min(ms, t0 ? now - t0 : 0));
    if (d.closest('.no-ambient')) a.pause();
    fresh.push(a);
  }
  settle(fresh);
}
// Watch the page: a dot or a runner drawn anywhere in it starts before it's painted.
export function watchPackets(page) {
  new MutationObserver(() => { if (page.querySelector('.map-svg .mpkt')) runPackets(page); if (page.querySelector('.map-svg [data-glide]')) runRunners(page); }).observe(page, { childList: true, subtree: true });
}

// The server's own traffic on the room map (app.js runs it on the rooms page): now and then a faint gray packet
// crosses a trace between two rooms you've discovered, never one out of your room (those already run amber). It picks
// traces near the Core more often, and never more than MAX at once. Pure ambience: it means nothing and never takes
// input. Each kind of server moves its own way:
//   Mailhub      the packets are small envelopes;
//   Archive      slow, heavy packets;
//   Name server  a packet on a hop (its curved link) skips along it in jumps, jittering off the curve;
//   Mirror       each packet has an echo a beat behind it.
// Drawn under the chips, into whichever map svg is showing, and put back if a redraw replaces it. Screen effects off,
// Motion off or reduced motion: none (app.js passes no server).
import { el, measure, clamp } from './travelfx.mjs';
import { stepPath } from './floorplan-view.mjs';
import { linksOf, neighbours, seenOf, known } from './floorplan.mjs';

export const TRAFFIC = { gap: [1400, 3200], max: 3, speed: 110, slow: 45 }; // ms between packets, at once, svg units a second
const live = [];
let next = 0, raf = 0;

const distTo = (g, from, to) => { const d = { [from]: 0 }, q = [from]; while (q.length) { const x = q.shift(); if (x === to) return d[x]; for (const y of neighbours(g, x)) if (!(y in d)) { d[y] = d[x] + 1; q.push(y); } } return 9; };
// The traces it can use: both rooms discovered, neither yours. Weighted toward the Core.
function lanes(s) {
  const R = s.rooms, g = R.graph, here = R.at;
  return linksOf(g).filter(([a, b]) => a !== here && b !== here && seenOf(s, a) && seenOf(s, b) && known(s, a) && known(s, b))
    .map(([a, b]) => ({ a, b, w: 1 + 3 / (1 + Math.min(distTo(g, a, g.core), distTo(g, b, g.core))), hop: (g.hops || []).some(([x, y]) => (x === a && y === b) || (x === b && y === a)) }));
}
function pick(list) {
  let r = Math.random() * list.reduce((n, x) => n + x.w, 0);
  for (const x of list) if ((r -= x.w) <= 0) return x;
  return list[list.length - 1];
}
function spawn(s, svg, t) {
  const list = lanes(s);
  if (!list.length) return;
  const lane = pick(list), back = Math.random() < 0.5, tall = svg.classList.contains('tall');
  const path = stepPath(s, back ? lane.b : lane.a, back ? lane.a : lane.b, tall);
  if (!path) return;
  const kind = s.rooms.kind, M = measure(path), span = M.s1 - M.s0;
  const dur = (span / (kind === 'Archive' ? TRAFFIC.slow : TRAFFIC.speed)) * 1000;
  const mk = () => (kind === 'Mailhub'
    ? el('g', { class: 'fp-pkt mail' }, null)
    : el('rect', { class: `fp-pkt${kind === 'Archive' ? ' heavy' : ''}`, width: kind === 'Archive' ? 6 : 4, height: kind === 'Archive' ? 6 : 4 }));
  const bodies = [mk(), ...(kind === 'Mirror' ? [mk()] : [])];
  for (const b of bodies) if (b.tagName === 'g') b.append(el('rect', { x: -4.5, y: -3, width: 9, height: 6 }), el('path', { d: 'M-4.5 -3 0 0.6 4.5 -3' }));
  live.push({ bodies, M, span, dur, t0: t, jumpy: kind === 'Relay' && lane.hop, tall });
}
function place(pk, t) {
  pk.bodies.forEach((b, i) => {
    let u = clamp((t - pk.t0 - i * 260) / pk.dur);
    if (pk.jumpy) u = Math.floor(u * 7) / 7; // a hop's packet skips along in jumps
    const p = pk.M.at(pk.M.s0 + pk.span * u), j = pk.jumpy ? (Math.random() - 0.5) * 4 : 0, half = b.tagName === 'g' ? 0 : +b.getAttribute('width') / 2;
    if (b.tagName === 'g') b.setAttribute('transform', `translate(${(p.x + j).toFixed(1)} ${(p.y + j).toFixed(1)})`);
    else { b.setAttribute('x', (p.x - half + j).toFixed(1)); b.setAttribute('y', (p.y - half + j).toFixed(1)); }
    // In from the chip it leaves, out into the one it reaches; an echo fainter.
    b.style.opacity = (Math.min(1, u * 6, (1 - u) * 6) * (i ? 0.45 : 1)).toFixed(2);
  });
}
const clear = () => { for (const pk of live.splice(0)) for (const b of pk.bodies) b.remove(); };

// Run it: server() gives the campaign while the traffic should run (the rooms page, on a server, effects on), else null.
export function startTraffic(server) {
  cancelAnimationFrame(raf);
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const s = server(), t = performance.now();
    const svg = s?.rooms?.at && [...document.querySelectorAll('#page-view .fp-svg')].find((x) => x.getBoundingClientRect().width > 0);
    if (!svg) { clear(); next = t + 600; return; }
    for (let i = live.length - 1; i >= 0; i--) {
      const pk = live[i];
      if (pk.tall !== svg.classList.contains('tall') || t - pk.t0 > pk.dur + 260 * (pk.bodies.length - 1)) { for (const b of pk.bodies) b.remove(); live.splice(i, 1); }
    }
    if (t >= next) { if (live.length < TRAFFIC.max) spawn(s, svg, t); next = t + TRAFFIC.gap[0] + Math.random() * (TRAFFIC.gap[1] - TRAFFIC.gap[0]); }
    const under = svg.querySelector('.fp-room');
    for (const pk of live) { for (const b of pk.bodies) if (b.parentNode !== svg) svg.insertBefore(b, under); place(pk, t); }
  };
  raf = requestAnimationFrame(tick);
}

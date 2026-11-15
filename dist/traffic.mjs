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
import { el, measure } from './travelfx.mjs';
import { settle } from './flowfx.mjs';
import { stepPath } from './floorplan-view.mjs';
import { linksOf, neighbours, seenOf, known } from './floorplan.mjs';

export const TRAFFIC = { gap: [1400, 3200], max: 3, speed: 110, slow: 45 }; // ms between packets, at once, svg units a second
// Each packet is a transform and opacity animation (the graphics card runs it); a timer spawns the next. Nothing runs
// every frame. A redraw of the map leaves the packets behind: put back into the new map, they carry on where they were.
const live = [];
let timer = 0, server = () => null, watch = null;

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
const showing = () => [...document.querySelectorAll('#page-view .fp-svg')].find((x) => x.getBoundingClientRect().width > 0);
function spawn(s, svg) {
  const list = lanes(s);
  if (!list.length) return;
  const lane = pick(list), back = Math.random() < 0.5, tall = svg.classList.contains('tall');
  const path = stepPath(s, back ? lane.b : lane.a, back ? lane.a : lane.b, tall);
  if (!path) return;
  const kind = s.rooms.kind, M = measure(path), span = M.s1 - M.s0, jumpy = kind === 'Relay' && lane.hop;
  const dur = (span / (kind === 'Archive' ? TRAFFIC.slow : TRAFFIC.speed)) * 1000, size = kind === 'Archive' ? 6 : 4;
  const shape = () => {
    if (kind !== 'Mailhub') return el('rect', { class: `fp-pkt${kind === 'Archive' ? ' heavy' : ''}`, x: -size / 2, y: -size / 2, width: size, height: size });
    const g = el('g', { class: 'fp-pkt mail' });
    g.append(el('rect', { x: -4.5, y: -3, width: 9, height: 6 }), el('path', { d: 'M-4.5 -3 0 0.6 4.5 -3' }));
    return g;
  };
  // Its way along the trace: evenly sampled, or seven jumps on a hop, jittering off the curve as it skips.
  const n = jumpy ? 7 : Math.max(4, Math.min(40, Math.round(span / 8)));
  const at = (u) => { const p = M.at(M.s0 + span * u); return `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`; };
  const way = Array.from({ length: n + 1 }, (_, i) => ({ offset: i / n, transform: at(i / n), ...(jumpy ? { easing: 'steps(1, end)' } : {}) }));
  // In from the chip it leaves, out into the one it reaches; an echo a beat behind, fainter.
  const fade = (k) => [{ offset: 0, opacity: 0 }, { offset: 1 / 6, opacity: k }, { offset: 5 / 6, opacity: k }, { offset: 1, opacity: 0 }];
  const pk = { bodies: [], tall };
  (kind === 'Mirror' ? [0, 1] : [0]).forEach((i) => {
    const b = el('g', { class: 'fp-pkt-run' }), body = shape();
    b.style.opacity = 0;
    if (jumpy) { const j = el('g', { class: 'fp-pkt-jit' }); j.append(body); b.append(j); } else b.append(body);
    pk.bodies.push(b);
    insert(svg, b);
    const t = { duration: dur, delay: i * 260, fill: 'both' };
    b.animate(way, t);
    const a = b.animate(fade(i ? 0.45 : 1), t);
    a.onfinish = () => { b.remove(); pk.bodies = pk.bodies.filter((x) => x !== b); if (!pk.bodies.length) live.splice(live.indexOf(pk) >>> 0, 1); };
  });
  live.push(pk);
}
const insert = (svg, b) => svg.insertBefore(b, svg.querySelector('.fp-room'));
const clear = () => { for (const pk of live.splice(0)) for (const b of pk.bodies) { b.getAnimations().forEach((a) => a.cancel()); b.remove(); } };
// A redraw replaced the map: the packets go into the new one (a packet drawn for the other layout is dropped).
function reattach() {
  if (!live.some((pk) => pk.bodies.some((b) => !b.isConnected))) return;
  const svg = server() && showing();
  if (!svg) return clear();
  const tall = svg.classList.contains('tall');
  for (let i = live.length - 1; i >= 0; i--) {
    const pk = live[i];
    if (pk.tall !== tall) { for (const b of pk.bodies) b.remove(); live.splice(i, 1); continue; }
    for (const b of pk.bodies) if (b.parentNode !== svg) { insert(svg, b); settle(b.getAnimations()); }
  }
}

// Run it: server() gives the campaign while the traffic should run (the rooms page, on a server, effects on), else null.
export function startTraffic(fn) {
  server = fn; clearTimeout(timer);
  const page = document.getElementById('page-view');
  if (!watch && page) { watch = new MutationObserver(reattach); watch.observe(page, { childList: true, subtree: true }); }
  const tick = () => {
    const s = server(), svg = s?.rooms?.at && showing();
    // No room map showing: look again in a quarter second.
    if (!svg) { clear(); timer = setTimeout(tick, 250); return; }
    reattach();
    if (live.length < TRAFFIC.max && !svg.closest('.no-ambient')) spawn(s, svg);
    timer = setTimeout(tick, TRAFFIC.gap[0] + Math.random() * (TRAFFIC.gap[1] - TRAFFIC.gap[0]));
  };
  timer = setTimeout(tick, 250);
}

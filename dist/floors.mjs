// Floors (docs/servers.md 5, R3): the network is a stack of eight floors going down (FLOORS in data.mjs: a level band
// of about six levels each, a shape, a size). Each floor is its own diagram, generated from your network's seed
// (floorGraph: the same seed always draws the same floors):
//   servers  slots for servers (FLOORS servers a floor), linked to their neighbours. A slot's level is fixed by its
//            place on the floor: the entry's side at the band's floor, the exit's neighbours at its top. Its family
//            leans the network's way (network.mjs), its kind by floor (Mailhubs and Relays near the top, Archives and
//            Labs deeper). Rogue servers and faction servers are rolled when a slot is located, as before.
//   entry    floor 1's is SPRAWL-00. Every other floor's is an up-link (▲) to the floor above, beside its landing server.
//   exits    one a floor (two from floor 4, none on Bedrock), a ▼ on the far side, hanging off one or two servers. It is
//            always drawn, through the fog. Locate a server next to it and `descend` (its card's Go down) opens the
//            floor below: no fight, no key. The floor below is its own warning: its band, on the exit's card.
//   hubs     Halcyon's and Kestrel's on floor 1, LANTERN's and GLASSJAW's on floor 2, NULL CHOIR's on floor 3, each
//            off a server near its level (factions.mjs still traces them).
//   lairs    one a floor from floor 2: a server slot whose Core holds the network's native boss (network.mjs makeLair).
//   the farm KESSLER-FARM-00 hangs off floor 1 (rogue.mjs openFarm, from level 7).
// Tracing runs along a floor's links (hidden.mjs): an unknown server linked to one you've found (or to an entry you've
// reached) shows as ?, and fills to 100% to locate it. Going deeper is taking an exit. Home sits above the stack: every
// connection starts there, and the floor panel takes you to any floor you've reached.
// The state: s.floors = { seed, reached, at, land } (reached: the deepest floor you've opened, every floor down to it a
// waypoint; at: the one the map shows; land: each floor's landing server, its waypoint).
// A location on a floor: loc.depth is its floor, loc.slot its slot's id. v41 moves an older save's layers onto floors
// (floorsRestore).
import { FLOORS, SERVER, CONFIG, TEMPLATES, FAMILIES, bandOf, BOSSES } from './data.mjs';
import { seeded } from './gear.mjs';
import { emit, warn, hackerLevel, addLocation, active } from './combat.mjs';
import { signature, makeLair, lairBoss, leanOf } from './network.mjs';

export const FLOOR = {
  hubs: { halcyon: 1, kestrel: 1, lantern: 2, glassjaw: 2, nullchoir: 3 }, // which floor each faction's hub stands on
  lairFrom: 2, // a lair on every floor from this one
  gap: 132, // map units between neighbours
  curve: 0.5, // how a floor's levels bunch toward the top of its band
};
const SHAPES = { star, trunk, lattice, ring, bridge, tree, funnel, islands };
const jit = (r, a) => (r() - 0.5) * 2 * a;
const shuffle = (r, xs) => xs.map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ---------- the shapes ----------
// Each returns its servers' points (pts), their links (index pairs), the entry ({ x, y, to: indexes }) and the far
// side (far: indexes the exits hang off, each a list of one or two), in map units.
function star(r, N) { // floor 1: arms around SPRAWL-00
  const arms = 5, lens = Array(arms).fill(1);
  for (let k = arms; k < N;) { const a = Math.floor(r() * arms); if (lens[a] < 3) { lens[a]++; k++; } }
  const pts = [], links = [], to = [], ends = [], rot = jit(r, 9);
  lens.forEach((len, a) => {
    let prev = null;
    for (let j = 0; j < len; j++) {
      const ang = ((-54 + a * 72 + rot + jit(r, 7)) * Math.PI) / 180, rad = 150 + j * 132 + jit(r, 10);
      pts.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad });
      const i = pts.length - 1;
      if (prev == null) to.push(i); else links.push([prev, i]);
      prev = i;
    }
    ends.push({ i: prev, len });
  });
  const far = ends.filter((e) => e.len === Math.max(...lens)).map((e) => e.i);
  return { pts, links, entry: { x: 0, y: 0, to }, far: [[far[Math.floor(r() * far.length)]]] };
}
function trunk(r, N) { // floor 2: a trunk with spurs
  const T = 5, pts = [], links = [];
  for (let k = 0; k < T; k++) { pts.push({ x: -300 + k * 150, y: jit(r, 22) }); if (k) links.push([k - 1, k]); }
  const spur = {};
  for (let guard = 0; pts.length < N && guard < 400; guard++) {
    const p = Math.floor(r() * (T - 1)), side = r() < 0.5 ? -1 : 1, key = `${p}${side}`, d = spur[key] || 0;
    if (d >= 2 || (spur[`${p - 1}${side}`] > d && spur[`${p + 1}${side}`] > d)) continue;
    const from = d ? pts.findIndex((q, i) => i >= T && q.k === key && q.d === d - 1) : p;
    pts.push({ x: pts[p].x + jit(r, 16), y: pts[p].y + side * 126 * (d + 1), k: key, d });
    links.push([from, pts.length - 1]);
    spur[key] = d + 1;
  }
  return { pts, links, entry: { x: -450, y: pts[0].y, to: [0] }, far: [[T - 1]] };
}
function connected(n, links, gone = new Set()) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of links) { adj[a].push(b); adj[b].push(a); }
  const alive = [...Array(n).keys()].filter((i) => !gone.has(i));
  if (!alive.length) return true;
  const seen = new Set([alive[0]]), q = [alive[0]];
  while (q.length) for (const j of adj[q.shift()]) if (!gone.has(j) && !seen.has(j)) { seen.add(j); q.push(j); }
  return seen.size === alive.length;
}
function lattice(r, N) { // floor 3: a lattice with holes
  const C = 4, R = 4, cells = [];
  for (let c = 0; c < C; c++) for (let w = 0; w < R; w++) cells.push({ c, w, x: (c - (C - 1) / 2) * 150 + jit(r, 10), y: (w - (R - 1) / 2) * 126 + jit(r, 10) });
  const nb = (a, b) => Math.abs(a.c - b.c) + Math.abs(a.w - b.w) === 1;
  const all = [];
  cells.forEach((a, i) => cells.forEach((b, j) => { if (j > i && nb(a, b)) all.push([i, j]); }));
  const gone = new Set();
  for (const i of [...shuffle(r, [...cells.keys()]), ...shuffle(r, [...cells.keys()])]) {
    if (cells.length - gone.size <= N) break;
    if (gone.has(i)) continue;
    const col = cells[i].c, left = cells.filter((x, j) => x.c === col && !gone.has(j) && j !== i).length;
    if ((col === 0 || col === C - 1) && left < 2) continue;
    gone.add(i);
    if (!connected(cells.length, all, gone)) gone.delete(i);
  }
  const keep = cells.map((_, i) => i).filter((i) => !gone.has(i)), at = new Map(keep.map((i, k) => [i, k]));
  let links = all.filter(([a, b]) => !gone.has(a) && !gone.has(b)).map(([a, b]) => [at.get(a), at.get(b)]);
  for (const l of shuffle(r, [...links])) { if (r() > 0.3) continue; const rest = links.filter((x) => x !== l); if (connected(keep.length, rest)) links = rest; }
  const pts = keep.map((i) => cells[i]);
  const col = (c) => pts.map((p, i) => [p, i]).filter(([p]) => p.c === c).sort((a, b) => Math.abs(a[0].y) - Math.abs(b[0].y)).map((x) => x[1]);
  const first = col(0).slice(0, 2), last = col(C - 1);
  return { pts, links, entry: { x: -400, y: Math.round((pts[first[0]].y + pts[first.at(-1)].y) / 2), to: first }, far: [[last[0]]] };
}
function ring(r, N) { // floor 4: a ring round a dead centre
  const K = 8, pts = [], links = [];
  for (let k = 0; k < K; k++) { const a = Math.PI + (k * 2 * Math.PI) / K; pts.push({ x: Math.cos(a) * 290 + jit(r, 8), y: Math.sin(a) * 200 + jit(r, 8), a }); links.push([k, (k + 1) % K]); }
  // Spokes out from the ring's upper and lower arcs, never on the entry's side or the exits'.
  const out = [];
  for (const k of [1, 2, 6, 7]) { const a = pts[k].a; pts.push({ x: Math.cos(a) * 440, y: Math.sin(a) * 320 }); links.push([k, pts.length - 1]); out.push(pts.length - 1); }
  for (const o of shuffle(r, out)) { if (pts.length >= N) break; const p = pts[o], a = Math.atan2(p.y, p.x) + (r() < 0.5 ? -0.32 : 0.32); pts.push({ x: Math.cos(a) * 520, y: Math.sin(a) * 360 }); links.push([o, pts.length - 1]); }
  return { pts, links, entry: { x: -440, y: pts[0].y, to: [0] }, far: [[3, 4], [4, 5]] };
}
function bridge(r, N) { // floor 5: two halves joined by one bridge
  // Each half two columns of four, a spanning tree on the grid and a loop or two.
  const half = (cx) => { const cells = []; for (let c = 0; c < 2; c++) for (let w = 0; w < 4; w++) cells.push({ c, w, x: cx + (c - 0.5) * 140 + jit(r, 9), y: (w - 1.5) * 118 + jit(r, 9) }); return cells; };
  const L = half(-300), R = half(300), pts = [...L, ...R].slice(0, N), links = [];
  const grid = (a, b) => Math.abs(pts[a].c - pts[b].c) + Math.abs(pts[a].w - pts[b].w) === 1;
  const tie = (list, off) => {
    const ids = list.map((_, i) => i + off), inTree = new Set([ids[Math.floor(r() * ids.length)]]);
    while (inTree.size < ids.length) {
      const edges = [...inTree].flatMap((a) => ids.filter((b) => !inTree.has(b) && grid(a, b)).map((b) => [a, b]));
      if (!edges.length) break;
      const e = edges[Math.floor(r() * edges.length)];
      links.push(e); inTree.add(e[1]);
    }
    const extra = ids.flatMap((a) => ids.filter((b) => b > a && grid(a, b) && !links.some(([x, y]) => (x === a && y === b) || (x === b && y === a))).map((b) => [a, b]));
    for (const l of shuffle(r, extra).slice(0, 2)) links.push(l);
  };
  tie(L, 0); tie(R, L.length);
  const at = (list, off, c, w) => off + list.findIndex((x) => x.c === c && x.w === w);
  const row = 1 + Math.floor(r() * 2);
  links.push([at(L, 0, 1, row), at(R, L.length, 0, row)]); // the bridge
  const rightCol = R.map((x, i) => [x, i + L.length]).filter(([x]) => x.c === 1).map((x) => x[1]);
  return { pts, links, entry: { x: -500, y: 0, to: [at(L, 0, 0, 1), at(L, 0, 0, 2)] }, far: [[rightCol[0], rightCol[1]], [rightCol[2], rightCol[3]]] };
}
function tree(r, N) { // floor 6: a deep tree
  const nodes = [{ p: -1, d: 0, kids: [] }];
  for (let i = 0; nodes.length < N && i < 500; i++) {
    // Deeper parents with few children first, so it grows down more than out.
    const open = nodes.filter((n) => n.kids.length < (n.d === 0 ? 2 : 3) && n.d < 4), w = (x) => (x.d + 1) / (1 + x.kids.length * 1.5);
    let t = r() * open.reduce((a, x) => a + w(x), 0), pick = open.at(-1);
    for (const x of open) { t -= w(x); if (t < 0) { pick = x; break; } }
    const k = { p: nodes.indexOf(pick), d: pick.d + 1, kids: [] };
    nodes.push(k); nodes[k.p].kids.push(nodes.length - 1);
  }
  let leaf = 0;
  const place = (i) => { const n = nodes[i]; if (!n.kids.length) { n.x = leaf++ * 108; return n.x; } const xs = n.kids.map(place); n.x = (xs[0] + xs.at(-1)) / 2; return n.x; };
  place(0);
  const mid = (leaf - 1) * 54;
  const pts = nodes.map((n) => ({ x: n.x - mid, y: -200 + n.d * 118 + jit(r, 6) })), links = nodes.slice(1).map((n, i) => [n.p, i + 1]);
  const deepest = nodes.map((n, i) => [n, i]).filter(([n]) => !n.kids.length).sort((a, b) => b[0].d - a[0].d || a[0].x - b[0].x);
  const a = deepest[0][1], b = (deepest.find(([n, i]) => i !== a && Math.abs(n.x - nodes[a].x) > 200) || deepest[1])[1];
  return { pts, links, entry: { x: pts[0].x, y: pts[0].y - 122, to: [0] }, far: [[a], [b]] };
}
function funnel(r, N) { // floor 7: wide at the top, narrow at the exits
  const rows = [6, 5, 4, 3], pts = [], links = [], idx = [];
  rows.forEach((w, k) => { idx.push([]); for (let j = 0; j < w; j++) { pts.push({ x: (j - (w - 1) / 2) * 128 + jit(r, 9), y: -200 + k * 120, k }); idx[k].push(pts.length - 1); } });
  for (let k = 1; k < rows.length; k++) {
    for (const i of idx[k]) { const up = [...idx[k - 1]].sort((a, b) => dist(pts[a], pts[i]) - dist(pts[b], pts[i])); links.push([up[0], i]); if (r() < 0.45 && up[1] != null) links.push([up[1], i]); }
    for (const u of idx[k - 1]) if (!links.some(([a, b]) => a === u && idx[k].includes(b))) { const dn = [...idx[k]].sort((a, b) => dist(pts[a], pts[u]) - dist(pts[b], pts[u]))[0]; links.push([u, dn]); }
  }
  for (const row of idx) for (let j = 1; j < row.length; j++) if (r() < 0.3) links.push([row[j - 1], row[j]]);
  const top = [...idx[0]].sort((a, b) => Math.abs(pts[a].x) - Math.abs(pts[b].x)).slice(0, 2);
  const low = idx.at(-1);
  return { pts, links, entry: { x: 0, y: -320, to: top }, far: [[low[0], low[1]], [low[2]]] };
}
function islands(r, N) { // floor 8: scattered islands
  const sizes = [4, 5, 4, 5], pts = [], links = [], isl = [];
  sizes.forEach((n, k) => {
    const cx = -420 + k * 280, cy = (k % 2 ? 95 : -95) + jit(r, 20), ids = [];
    pts.push({ x: cx, y: cy }); ids.push(pts.length - 1);
    const rot = r() * Math.PI * 2;
    for (let j = 1; j < n; j++) { const a = rot + (j * 2 * Math.PI) / (n - 1); pts.push({ x: cx + Math.cos(a) * 96, y: cy + Math.sin(a) * 88 }); ids.push(pts.length - 1); links.push([ids[0], pts.length - 1]); }
    links.push([ids[1], ids[2]]);
    isl.push(ids);
  });
  for (let k = 1; k < isl.length; k++) {
    const a = [...isl[k - 1]].sort((x, y) => dist(pts[x], pts[isl[k][0]]) - dist(pts[y], pts[isl[k][0]]))[0];
    const b = [...isl[k]].sort((x, y) => dist(pts[x], pts[a]) - dist(pts[y], pts[a]))[0];
    links.push([a, b]);
  }
  const first = [...isl[0]].sort((x, y) => pts[x].x - pts[y].x)[0];
  return { pts: pts.slice(0, N), links, entry: { x: pts[first].x - 140, y: pts[first].y, to: [first] }, far: [] };
}

// ---------- the generator ----------
// A floor's diagram: { n, nodes: { id: node }, links: [[id, id]], entry, exits: [id], hubs: { faction: id }, lair, farm }.
// A node: { id, kind: 'server' | 'lair' | 'entry' | 'exit' | 'hub' | 'farm', x, y, d (links from the entry), place
// (0–1), level, family, template, hub }. Server slots are f<n>-<i>, exits f<n>x<k>, the entry f<n>e.
const CACHE = new Map();
const kindWeights = (n) => ({ relay: Math.max(0.4, 3 - 0.35 * (n - 1)), mailhub: Math.max(0.4, 3 - 0.35 * (n - 1)), mirror: 2, archive: 1 + 0.35 * (n - 1), lab: 1 + 0.35 * (n - 1) });
const wpick = (r, ws) => { let x = r() * Object.values(ws).reduce((a, b) => a + b, 0); for (const [k, w] of Object.entries(ws)) { x -= w; if (x < 0) return k; } return Object.keys(ws).at(-1); };
export function floorGraph(seed, n) {
  n = Math.min(FLOORS.length, Math.max(1, n | 0 || 1));
  const key = `${seed >>> 0}:${n}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const F = FLOORS[n - 1], r = seeded(((seed >>> 0) * 2654435761 + n * 97 + 13) >>> 0 || 1);
  const shape = SHAPES[F.shape](r, F.servers), U = FLOOR.gap / 132;
  const nodes = {}, links = [], sid = (i) => `f${n}-${i}`;
  shape.pts.forEach((p, i) => { nodes[sid(i)] = { id: sid(i), kind: 'server', x: Math.round(p.x * U), y: Math.round(p.y * U) }; });
  for (const [a, b] of shape.links) if (a !== b && nodes[sid(a)] && nodes[sid(b)] && !links.some(([x, y]) => (x === sid(a) && y === sid(b)) || (x === sid(b) && y === sid(a)))) links.push([sid(a), sid(b)]);
  const entry = `f${n}e`;
  nodes[entry] = { id: entry, kind: 'entry', x: Math.round(shape.entry.x * U), y: Math.round(shape.entry.y * U), zone: n === 1 };
  for (const i of shape.entry.to) links.push([entry, sid(i)]);
  // Distance from the entry, then the place: by distance, ties broken by the seed, so levels rise away from the entry.
  const adj = (id) => links.filter((l) => l.includes(id)).map((l) => (l[0] === id ? l[1] : l[0]));
  const d = { [entry]: 0 }, q = [entry];
  while (q.length) { const x = q.shift(); for (const y of adj(x)) if (d[y] == null) { d[y] = d[x] + 1; q.push(y); } }
  const servers = Object.values(nodes).filter((x) => x.kind === 'server');
  for (const x of servers) x.d = d[x.id] ?? 9;
  const far = new Set(shape.far.slice(0, F.exits).flat().map(sid)); // the exits' servers: the top of the band
  const ranked = servers.map((x) => [far.has(x.id) ? 1 : 0, x.d, r(), x]).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]).map((x) => x[3]);
  // Places bunch toward the top of the band (place = rank^FLOOR.curve): a level takes longer than the one before, so a
  // floor has more servers where you spend more time.
  ranked.forEach((x, k) => { x.place = ranked.length > 1 ? Math.pow(k / (ranked.length - 1), FLOOR.curve) : 0; x.level = SERVER.locationLevel(n, x.place); });
  // Families lean the network's way; kinds lean by floor, never the same kind twice in a row along a link.
  const lean = signature(seed)?.lean;
  for (const x of ranked) {
    x.family = leanOf(lean, r(), { level: x.level, floor: n }); // the later families once the floor and level allow
    const near = adj(x.id).map((y) => nodes[y].template).filter(Boolean);
    x.template = wpick(r, kindWeights(n));
    if (near.includes(x.template)) x.template = wpick(r, kindWeights(n));
  }
  // Exits: on the far side, hanging off one or two servers.
  const exits = [];
  shape.far.slice(0, F.exits).forEach((from, k) => {
    const ids = from.map(sid).filter((id) => nodes[id]);
    if (!ids.length) return;
    const cx = ids.reduce((a, id) => a + nodes[id].x, 0) / ids.length, cy = ids.reduce((a, id) => a + nodes[id].y, 0) / ids.length;
    const ex = nodes[entry].x, ey = nodes[entry].y, len = Math.hypot(cx - ex, cy - ey) || 1;
    const at = free(nodes, { x: cx + ((cx - ex) / len) * 118, y: cy + ((cy - ey) / len) * 118 }, ids.map((id) => nodes[id]));
    const id = `f${n}x${k}`;
    nodes[id] = { id, kind: 'exit', x: at.x, y: at.y, to: n + 1 };
    for (const s of ids) links.push([s, id]);
    exits.push(id);
  });
  // The main road: the shortest way from the entry to each exit (to the far end on Bedrock). Its servers are never
  // rogue servers or the lair, so a floor can always be crossed by mapping servers.
  const prev = {}, seen = new Set([entry]), bq = [entry];
  while (bq.length) { const x = bq.shift(); for (const y of adj(x)) if (!seen.has(y)) { seen.add(y); prev[y] = x; bq.push(y); } }
  const ends = exits.length ? exits : [ranked.at(-1)?.id].filter(Boolean);
  for (const e of ends) for (let x = prev[e]; x && x !== entry; x = prev[x]) if (nodes[x].kind === 'server') nodes[x].main = true;
  // The lair: a server slot most of the way across, off the main road, from floor 2.
  let lair = null;
  if (n >= FLOOR.lairFrom) {
    const nearExit = new Set(exits.flatMap(adj));
    const pool = ranked.filter((x) => x.d >= 2 && !nearExit.has(x.id) && !x.main);
    const pick = (pool.length ? pool : ranked).slice().sort((a, b) => Math.abs(a.place - 0.72) - Math.abs(b.place - 0.72))[0];
    if (pick) { pick.kind = 'lair'; lair = pick.id; }
  }
  // Hubs and the farm hang off a server near their level.
  const hang = (id, kind, level, extra = {}) => {
    const host = ranked.filter((x) => x.kind === 'server' && !adj(x.id).some((y) => ['hub', 'farm', 'exit'].includes(nodes[y].kind))).sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || a.d - b.d)[0] || ranked[0];
    const at = free(nodes, null, [host]);
    nodes[id] = { id, kind, x: at.x, y: at.y, level: host.level, ...extra };
    links.push([host.id, id]);
    return id;
  };
  const hubs = {};
  for (const [f, fl] of Object.entries(FLOOR.hubs)) if (fl === n) hubs[f] = hang(`f${n}h-${f}`, 'hub', HUB_LEVEL[f] || n, { hub: f });
  const farm = n === 1 ? hang('f1farm', 'farm', 7) : null;
  const g = { n, seed: seed >>> 0, nodes, links, entry, exits, hubs, lair, farm, order: ranked.map((x) => x.id) };
  CACHE.set(key, g);
  return g;
}
const HUB_LEVEL = { halcyon: 2, kestrel: 4, lantern: 9, glassjaw: 11, nullchoir: 15 };
// A free spot: the point asked for if nothing crowds it, else the candidate around it (or around the host, a link's
// length off) farthest from everything already on the floor.
function free(nodes, near, hosts) {
  const all = Object.values(nodes), room = (p) => Math.min(...all.map((x) => dist(x, p)));
  if (near && room(near) > 80) return { x: Math.round(near.x), y: Math.round(near.y) };
  const base = near || hosts[0], rad = near ? 60 : 116, out = [];
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8, p = { x: Math.round(base.x + Math.cos(a) * rad), y: Math.round(base.y + Math.sin(a) * rad) };
    out.push([room(p), p]);
  }
  return out.sort((a, b) => b[0] - a[0])[0][1];
}

// ---------- the save's floors ----------
export const floorSeed = (s) => (s.netSeed >>> 0) || ((s.seed || 1) >>> 0) || 1;
// The floors follow the network's seed. A save whose seed changes before anything on its floors is found or traced
// (a new save given its network) draws its floors again.
export function floorsOf(s) {
  const want = floorSeed(s), F = s.floors;
  if (F?.seed && (F.seed === want || (s.locations || []).some((l) => l.slot) || (s.hidden || []).some((h) => h.slot && h.lead > 0))) return F;
  s.hidden = (s.hidden || []).filter((h) => !h.slot);
  s.floors = { seed: want, reached: 1, at: 1 };
  openEntry(s, 1);
  return s.floors;
}
export const graphOf = (s, n) => floorGraph(floorsOf(s).seed, n);
export const floorOfSlot = (id) => Number(String(id || '').match(/^f(\d+)/)?.[1]) || null;
export const slotNode = (s, id) => (floorOfSlot(id) ? graphOf(s, floorOfSlot(id)).nodes[id] || null : null);
export const neighbours = (s, id) => { const n = floorOfSlot(id); if (!n) return []; return graphOf(s, n).links.filter((l) => l.includes(id)).map((l) => (l[0] === id ? l[1] : l[0])); };
// The slot a place stands on: a located server's, SPRAWL-00 (floor 1's entry), the farm's.
export const slotOf = (loc) => (!loc ? null : loc.zone || loc.id === CONFIG.zone.id ? 'f1e' : loc.slot || null);
export const locAt = (s, id) => (id === 'f1e' ? s.zone || null : (s.locations || []).find((l) => l.slot === id && !l.member) || null);
export const hiddenAt = (s, id) => (s.hidden || []).find((h) => h.slot === id) || null;
export const reached = (s) => floorsOf(s).reached;
export const floorName = (n) => FLOORS[n - 1]?.name || '';
// A slot that can hold a located server (not an entry, an exit, a hub or the farm).
export const serverSlot = (node) => !!node && (node.kind === 'server' || node.kind === 'lair');
// An exit is yours to take once a server it hangs off is located.
export const exitOpen = (s, id) => neighbours(s, id).some((x) => locAt(s, x));
export const canDescend = (s) => { const f = reached(s); return f < FLOORS.length && graphOf(s, f).exits.some((x) => exitOpen(s, x)); };

// A floor's entry, once you've reached it: its neighbours show as ?. Floor 1's are SPRAWL-00's: traced by its strays.
function openEntry(s, n, via = n === 1 ? CONFIG.zone.id : null) {
  const g = graphOf(s, n);
  for (const id of neighbours(s, g.entry)) addHidden(s, g.nodes[id], via);
}
// An unknown server at a slot: on the map as ?, traced to 100% to locate it (hidden.mjs).
export function addHidden(s, node, via) {
  if (!serverSlot(node) || locAt(s, node.id) || hiddenAt(s, node.id)) return null;
  s.hiddenSeq = (s.hiddenSeq || 0) + 1;
  const sig = (((s.floors?.seed || 1) ^ (node.x * 31 + node.y * 17)) >>> 0) % 5;
  const h = { id: 'h' + s.hiddenSeq, slot: node.id, family: node.family, via, depth: floorOfSlot(node.id), level: node.level, lead: 0, pinged: false, signal: 1 + sig };
  (s.hidden ||= []).push(h);
  return h;
}
// The unknown servers linked to a place (its slot's neighbours that show as ?). For tracing, a floor's entry is a
// junction: a server beside it is linked through it to the others beside it (so SPRAWL-00's arms never stall once you've
// outgrown it). junction: false, its own links only (what a relay pings).
export function hiddenNear(s, loc, { junction = true } = {}) {
  const id = slotOf(loc);
  if (!id) return [];
  const near = new Set(neighbours(s, id));
  if (junction) for (const x of [...near]) if (slotNode(s, x)?.kind === 'entry') for (const y of neighbours(s, x)) near.add(y);
  near.delete(id);
  return [...near].map((x) => hiddenAt(s, x)).filter(Boolean);
}

// Where a server you trace with no slot named goes (a developer find, a story's server, an older caller): an unlocated
// slot on that floor, a ? of its family first (the next hop out), then any ?, then any free slot; the nearest level to
// yours. A full floor spills to the nearest floor with room.
export function pickSlot(s, floor, family = null) {
  const L = hackerLevel(s);
  const tiers = (n) => {
    const free = Object.values(graphOf(s, n).nodes).filter((x) => x.kind === 'server' && !locAt(s, x.id));
    const hid = free.filter((x) => hiddenAt(s, x.id));
    return [hid.filter((x) => x.family === family), hid, free.filter((x) => x.family === family), free];
  };
  const order = [floor, ...Array.from({ length: FLOORS.length }, (_, k) => [floor + k + 1, floor - k - 1]).flat()].filter((n) => n >= 1 && n <= FLOORS.length);
  for (const n of order) for (const t of tiers(n)) if (t.length) return t.sort((a, b) => Math.abs(a.level - L) - Math.abs(b.level - L) || a.d - b.d)[0];
  return null;
}

// A lair located: the network's native boss in its Core, at its slot's level (network.mjs makeLair).
export function lairAt(s, node, parent = null) {
  const boss = lairBoss(s, 'you');
  if (!boss) return null;
  const n = floorOfSlot(node.id), id = (s.locations || []).some((l) => l.id === 'lair') ? `lair-${n}` : 'lair';
  const name = `${BOSSES[boss].lair}-${String(n).padStart(2, '0')}`;
  const loc = makeLair(s, 'you', node.level, id, name);
  Object.assign(loc, { depth: n, slot: node.id, ...(parent ? { parent } : {}) });
  return loc;
}

// ---------- waypoints ----------
// Every floor you've reached is a waypoint: you can start there again, for free, earned by getting there (nothing is
// bought). A floor's waypoint is its landing server (the one beside its entry you arrived at; floor 1's is SPRAWL-00):
// the floor panel offers only floors you've reached, and a floor's ▲ card connects you to its waypoint.
export function waypointOf(s, n) {
  const F = floorsOf(s);
  if (!(n >= 1 && n <= F.reached)) return null;
  if (n === 1) return s.zone || { id: CONFIG.zone.id, name: CONFIG.zone.name, zone: true };
  const id = F.land?.[n], l = id ? (s.locations || []).find((x) => x.id === id && x.depth === n) : null;
  if (l) return l;
  const g = graphOf(s, n);
  return neighbours(s, g.entry).map((x) => locAt(s, x)).filter((x) => x && !x.rogue).sort((a, b) => (a.level || 1) - (b.level || 1))[0] || null;
}
export const waypoints = (s) => Array.from({ length: reached(s) }, (_, i) => i + 1);

// ---------- taking an exit ----------
// descend: the floor below opens. Its landing server (beside its entry) is located; the rest of the entry's neighbours
// show as ?. From then on the floor panel takes you between the floors you've reached, and back up is always open.
export function descend(s) {
  const F = floorsOf(s), f = F.reached;
  if (active(s)) return warn(s, 'Finish the fight first.');
  if (f >= FLOORS.length) return warn(s, `${floorName(f)}. Nothing below.`);
  if (!canDescend(s)) return warn(s, `No way down yet. The exit on floor ${f} hangs off a server you haven't located.`);
  F.reached = f + 1; F.at = f + 1;
  const g = graphOf(s, f + 1), [lo, hi] = bandOf(f + 1);
  const land = neighbours(s, g.entry).map((id) => g.nodes[id]).filter(serverSlot).sort((a, b) => a.place - b.place)[0];
  emit(s, 'floor', `FLOOR ${f + 1} · ${floorName(f + 1).toUpperCase()} · lv ${lo}–${hi}.`, { floor: f + 1, band: [lo, hi] });
  const loc = land ? addLocation(s, land.family, f + 1, null, land.id) : null;
  if (loc) (F.land ||= {})[f + 1] = loc.id; // the floor's waypoint: where you start it again
  openEntry(s, f + 1, loc?.id || null);
  return loc;
}
// floor: the floors you've reached, a line each. floor <n>: the map shows that floor. descend: the way down.
export function floorCommand(s, text) {
  const F = floorsOf(s), arg = text.replace(/^(floors?|descend)\s*/, '').trim();
  if (/^descend/.test(text) || arg === 'down') return descend(s);
  if (arg === 'up') return floorCommand(s, `floor ${Math.max(1, F.at - 1)}`);
  if (/^\d+$/.test(arg)) {
    const n = Number(arg);
    if (n < 1 || n > FLOORS.length) return warn(s, `Floors run 1 to ${FLOORS.length}.`);
    if (n > F.reached) return warn(s, `Floor ${n} isn't open to you yet.`);
    F.at = n;
    const [lo, hi] = bandOf(n), wp = waypointOf(s, n);
    return emit(s, 'info', `Floor ${n} · ${floorName(n)} · lv ${lo}–${hi}.${wp ? ` Waypoint: ${wp.name}.` : ''}`, { floor: n });
  }
  const lines = FLOORS.slice(0, Math.min(FLOORS.length, F.reached + 1)).map((fl, i) => {
    const n = i + 1, [lo, hi] = fl.band;
    if (n > F.reached) return `${n}  ???  lv ${lo}–${hi}`;
    const here = (s.locations || []).filter((l) => l.depth === n && l.slot && !l.member).length, total = fl.servers;
    const ex = graphOf(s, n).exits;
    const wp = waypointOf(s, n);
    return `${n}  ${fl.name}  lv ${lo}–${hi}  ${here}/${total} found${wp ? `  ◇ ${wp.name}` : ''}${ex.length ? ex.some((x) => exitOpen(s, x)) ? '  ▼ open' : '  ▼' : ''}${n === F.at ? '  <- map' : ''}`;
  });
  return emit(s, 'info', lines.join('\n'), { floors: true });
}

// ---------- the save (v41) ----------
// Layers become floors. Every server you'd found keeps its level, its progress, its rooms and its programs, and goes to
// the floor whose band holds its level (of two, the one nearer its old layer's band), on the free slot nearest its
// level; a full floor spills to the next. Held servers stay held. The deepest floor you have a server on is reached.
// Old unknown servers move to a free ? beside the server they hung off (their trace and their contracts with them); a
// family lead becomes trace on a ? of that family. One letter from wick says so.
const OLD_BANDS = [[1, 9], [7, 18], [16, 28], [26, 40], [38, 50]];
export function floorFit(level, layer = 1) {
  const fits = FLOORS.map((f, i) => i + 1).filter((n) => level >= bandOf(n)[0] && level <= bandOf(n)[1]);
  if (!fits.length) return level < 1 ? 1 : FLOORS.length;
  const ob = OLD_BANDS[Math.min(OLD_BANDS.length, Math.max(1, layer)) - 1], mid = (ob[0] + ob[1]) / 2;
  return fits.sort((a, b) => Math.abs((bandOf(a)[0] + bandOf(a)[1]) / 2 - mid) - Math.abs((bandOf(b)[0] + bandOf(b)[1]) / 2 - mid))[0];
}
export function floorsRestore(s, was) {
  if (was >= 41 && s.floors?.seed) return null;
  const keepHidden = [...(s.hidden || [])];
  s.hidden = [];
  s.floors = { seed: floorSeed(s), reached: 1, at: 1 };
  const mine = (s.locations || []).filter((l) => !l.member && !l.zone);
  const taken = new Set();
  const want = new Map(mine.map((l) => [l, floorFit(l.level || 1, l.depth || 1)]));
  // The farm and a lair first: their own slots.
  for (const l of mine.filter((x) => x.farm)) { Object.assign(l, { depth: 1, slot: 'f1farm' }); taken.add('f1farm'); }
  for (const l of mine.filter((x) => x.lair && !x.farm)) {
    let n = Math.max(FLOOR.lairFrom, want.get(l));
    while (n <= FLOORS.length && taken.has(graphOf(s, n).lair)) n++;
    const id = n <= FLOORS.length ? graphOf(s, n).lair : null;
    if (id) { taken.add(id); Object.assign(l, { depth: n, slot: id }); }
  }
  // The rest by floor, spilling to the next floor when one is full, then the floor before.
  const rest = mine.filter((x) => !x.slot).sort((a, b) => (a.level || 1) - (b.level || 1));
  const room = (n) => Object.values(graphOf(s, n).nodes).filter((x) => x.kind === 'server' && !taken.has(x.id));
  for (const l of rest) {
    const n0 = want.get(l), order = [n0, ...Array.from({ length: FLOORS.length }, (_, k) => [n0 + k + 1, n0 - k - 1]).flat()].filter((n) => n >= 1 && n <= FLOORS.length);
    const n = order.find((x) => room(x).length);
    if (!n) { l.depth = n0; l.slot = null; continue; }
    const off = (x) => (l.rogue && (x.main || x.d <= 1) ? 1 : 0); // a rogue server off the main road and the entry, as a new one would be (it keeps up with you, so its slot's level matters less)
    const slot = room(n).sort((a, b) => off(a) - off(b) || Math.abs(a.level - (l.level || 1)) - Math.abs(b.level - (l.level || 1)) || a.d - b.d)[0];
    taken.add(slot.id);
    Object.assign(l, { depth: n, slot: slot.id });
    if (!l.template) l.template = slot.template;
  }
  s.floors.reached = Math.max(1, ...mine.filter((l) => l.slot).map((l) => l.depth));
  s.floors.at = s.floors.reached;
  // Unknown servers: each old one to a free slot beside the server it hung off (or any ? on that floor), keeping its id.
  openEntry(s, 1);
  for (const l of mine) if (l.slot) for (const id of neighbours(s, l.slot)) addHidden(s, slotNode(s, id), l.id);
  for (let n = 2; n <= s.floors.reached; n++) { const g = graphOf(s, n), land = mine.find((l) => l.depth === n && l.slot); for (const id of neighbours(s, g.entry)) addHidden(s, g.nodes[id], land?.id || null); }
  // Every floor down to the deepest is a waypoint: its landing server beside its entry, located now if none was there
  // (as taking its exit would have), so no floor you've reached is a dead end.
  for (let n = 2; n <= s.floors.reached; n++) {
    const g = graphOf(s, n), near = neighbours(s, g.entry).map((id) => g.nodes[id]).filter(serverSlot);
    let land = near.map((x) => locAt(s, x.id)).filter((l) => l && !l.rogue).sort((a, b) => (a.level || 1) - (b.level || 1))[0];
    if (!land) { const slot = near.filter((x) => !locAt(s, x.id) && x.kind === 'server').sort((a, b) => a.place - b.place)[0]; if (slot) land = addLocation(s, slot.family, n, null, slot.id); }
    if (land) (s.floors.land ||= {})[n] = land.id;
  }
  const claimed = new Set();
  for (const h of keepHidden) {
    const via = mine.find((l) => l.id === h.via), pool = (s.hidden || []).filter((x) => !claimed.has(x.id) && (!via || x.via === via.id));
    const to = pool.find((x) => x.family === h.family) || pool[0] || (s.hidden || []).find((x) => !claimed.has(x.id) && x.depth === (via?.depth || 1));
    if (!to) continue;
    claimed.add(to.id);
    Object.assign(to, { id: h.id, lead: Math.min(99, h.lead || 0), pinged: !!h.pinged, seen: !!h.seen, routed: !!h.routed, signal: h.signal || to.signal, family: h.pinged || h.seen ? h.family : to.family });
  }
  for (const [f, n] of Object.entries(s.leadProgress || {})) {
    if (!(n > 0) || !FAMILIES[f]) continue;
    const to = (s.hidden || []).filter((x) => x.family === f).sort((a, b) => b.lead - a.lead)[0] || (s.hidden || []).sort((a, b) => b.lead - a.lead)[0];
    if (to) to.lead = Math.min(99, to.lead + Math.round(n));
    s.leadProgress[f] = 0;
  }
  return mine.length ? { floors: s.floors.reached } : null;
}
export const floorsLetter = (back) => (!back ? null : {
  from: 'wick', subject: 'The net goes down now.',
  body: [`Floors. Eight of them, one under the other, each its own map. Your servers are where their levels put them${back.floors > 1 ? `, as deep as floor ${back.floors}` : ''}. Each floor has a way down, and nothing stops you taking it. Mind your level. A floor you've reached, you can start from again.`, '— wick'],
});

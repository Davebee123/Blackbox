// Puzzle rooms (GAME_RULES.md "Puzzle rooms"): seven rooms that aren't fights. Pure: a seed in, a board out, a move in, what
// happened out. The rooms engine (floorplan.mjs) keeps each room's board on the server (R.puzzles) and pays the end;
// the page (puzzle-view.mjs) draws it. Every board here is JSON (a save holds it as it is).
//   quarantine  "Wall it in": a 7×9 node grid with a Worm outbreak. Firewall a node; the worm then copies into ONE
//               open node: the open frontier node with the most open neighbours (ties in reading order), marked in
//               advance. It ends when the worm can't spread. Every node it never reached pays (a ★ data node three).
//               Deeper (floor 4+): two outbreaks, or a worm that copies twice a turn.
//   chase       "Reach the door": a 5×5 den with walls on edges. You move a room or wait; the Tracker then takes two
//               steps, each across toward you if open, else up or down toward you if open, else it stands. It never
//               goes around a wall. Caught if it lands on you on either step. Every den is searched first: winnable,
//               the fewest moves 5 to 12, and walking straight at the door loses.
//   cascade     "Bring it all down": a 5×5 rack, nodes charged 1 to 3. A tap discharges a node: it's gone and every node
//               beside it gains 1; one pushed past 3 discharges too, wave by wave. Clear the rack within the fewest
//               taps (found by search) + 1.
//   sweep       "Find the cache": a 7×7 dark room, a cache hidden in one cell. A ping reads the steps (across plus down)
//               to the cache; a dig digs. Pings and digs share a budget of 5. Deeper: two caches (a budget of 8), or
//               noisy cells (marked) whose ping reads one off.
//   routing     "Get it through": 7×5 tiles (straight, elbow, tee, empty). A turn turns one a quarter, either way. Join
//               the source to the sink within the fewest turns (found by search) + 2.
//   deadlock    "Let them all finish": six processes, each needing 2–3 locks (A–D) and holding some, around a pool of
//               free ones. Give one a free lock it needs; one holding all it needs finishes and returns its locks.
//               Lost when none can finish from the pool.
//   cryptogram  "Read wick's note": a note in the player's own substitution key. Name a cipher letter's plain one: right
//               fills it everywhere and stays in the key; wrong is a strike, three lose.
//   terminal    "Name it" (floor 2+): the log sweep (logsweep.mjs), an incident file, a question and three suspects. Name
//               one: right wins; a second wrong answer loses. Its trick deepens by floor (2, 3, 4+).
//   Deeper (floor 3+): the chase has a second Tracker in the den; the cascade has two racks side by side, where a node
//               discharging on its rack's edge charges the same slot on the other rack.
import { seeded } from './gear.mjs';
import { sweepFor } from './logsweep.mjs';

export const PUZZLE_KINDS = ['quarantine', 'chase', 'cascade', 'sweep', 'routing', 'deadlock', 'cryptogram', 'terminal'];
// Each one's name, its title (what you do), its rule (one line) and how deep its harder boards start.
export const PUZZLES = {
  quarantine: { name: 'Quarantine', title: 'Wall it in', rule: 'Firewall a node. The worm copies into the marked one. Every node it never reaches pays.', deep: 4 },
  chase: { name: 'Hunter chase', title: 'Reach the door', rule: 'Move a room or wait. The Tracker takes two steps: across first, then up or down. Walls stop it.', deep: 3 },
  cascade: { name: 'Cascade', title: 'Bring it all down', rule: 'Tap to discharge. Every node beside it gains 1; past 3, it goes too.', deep: 3 },
  sweep: { name: 'Ping sweep', title: 'Find the cache', rule: 'A ping reads the steps to the cache. Pings and digs share the budget.', deep: 4 },
  routing: { name: 'Packet routing', title: 'Get it through', rule: 'Click turns a tile clockwise, right-click turns it back. Join the source to the sink.', deep: 99 },
  deadlock: { name: 'Deadlock', title: 'Let them all finish', rule: 'Give a process a free lock. One holding all it needs finishes and returns its locks.', deep: 99 },
  cryptogram: { name: 'Cryptogram', title: "Read wick's note", rule: 'Each letter stands for another, the same in every note. A wrong letter costs a strike.', deep: 99 },
  terminal: { name: 'Log sweep', title: 'Name it', rule: 'Click a line to light every line that shares its value. A second wrong answer loses.', from: 2, deep: 3 },
};
export const isPuzzle = (kind) => PUZZLE_KINDS.includes(kind);
const mix = (seed, salt) => ((((seed >>> 0) ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0) || 1);

// ---------- quarantine ----------
export const Q = { rows: 7, cols: 9, dead: 7, data: 6, OPEN: 0, INF: 1, WALL: 2, DEAD: 3, win: 0.5 };
export const qNeighbours = (i, R = Q.rows, C = Q.cols) => { const r = Math.floor(i / C), c = i % C, out = []; if (r > 0) out.push(i - C); if (c < C - 1) out.push(i + 1); if (r < R - 1) out.push(i + C); if (c > 0) out.push(i - 1); return out; };
// The open node the worm copies into next: on its frontier, the one with the most open neighbours (ties: the first in
// reading order, so it's always the same). -1: it can't spread.
export function qTarget(cells) {
  let best = -1, bestScore = -1;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== Q.OPEN) continue;
    const ns = qNeighbours(i);
    if (!ns.some((j) => cells[j] === Q.INF)) continue;
    const score = ns.filter((j) => cells[j] === Q.OPEN).length;
    if (score > bestScore) { best = i; bestScore = score; }
  }
  return best;
}
// Where it goes this turn, in order (a worm that copies twice marks both): a list of { to, from }.
export function qTargets(st, cells = st.cells) {
  const c = cells.slice(), out = [];
  for (let k = 0; k < st.spread; k++) {
    const t = qTarget(c);
    if (t < 0) break;
    out.push({ to: t, from: qNeighbours(t).find((j) => c[j] === Q.INF) });
    c[t] = Q.INF;
  }
  return out;
}
export const qValue = (st, cells = st.cells) => cells.reduce((n, v, i) => n + (v === Q.OPEN ? (st.data.includes(i) ? 3 : 1) : 0), 0);
function qBoard(seed, variant) {
  const r = seeded(mix(seed, 1)), cells = Array(Q.rows * Q.cols).fill(Q.OPEN), data = [];
  for (let k = 0; k < Q.dead; k++) cells[Math.floor(r() * cells.length)] = Q.DEAD;
  while (data.length < Q.data) { const i = Math.floor(r() * cells.length); if (cells[i] === Q.OPEN && !data.includes(i)) data.push(i); }
  const inner = () => (1 + Math.floor(r() * (Q.rows - 2))) * Q.cols + 2 + Math.floor(r() * (Q.cols - 4));
  const starts = [];
  for (let n = variant === 'twin' ? 2 : 1, g = 0; starts.length < n && g < 400; g++) {
    const i = inner();
    if (cells[i] !== Q.OPEN || data.includes(i)) continue;
    if (starts.some((j) => Math.abs(Math.floor(i / Q.cols) - Math.floor(j / Q.cols)) + Math.abs((i % Q.cols) - (j % Q.cols)) < 4)) continue;
    starts.push(i);
  }
  for (const i of starts) cells[i] = Q.INF;
  const st = { kind: 'quarantine', seed, variant, spread: variant === 'fast' ? 2 : 1, cells, data, starts, turn: 0, walls: 0, done: null, last: null };
  st.total = qValue(st);
  return st;
}
// The bot's play (and the generator's check): wall the best of the open nodes near the worm, by playing each out with
// "wall where it goes next" after it. Returns a node, or -1.
export function qBest(st) {
  if (st.done) return -1;
  const near = new Set();
  st.cells.forEach((v, i) => { if (v === Q.INF) for (const j of qNeighbours(i)) for (const k of [j, ...qNeighbours(j)]) if (st.cells[k] === Q.OPEN) near.add(k); });
  let best = -1, score = -1;
  for (const i of [...near].sort((a, b) => a - b)) { const v = qRollout(st, i); if (v > score) { score = v; best = i; } }
  return best;
}
// The value left after walling i and then always walling the worm's next node.
function qRollout(st, i) {
  const t = { ...st, cells: st.cells.slice(), done: null };
  qWall(t, i);
  for (let g = 0; !t.done && g < 80; g++) { const n = qTargets(t)[0]; if (!n) break; qWall(t, n.to); }
  return qValue(t);
}
function qWall(st, i) {
  if (st.done || st.cells[i] !== Q.OPEN) return null;
  st.cells[i] = Q.WALL; st.walls++; st.turn++;
  const spread = [];
  for (let k = 0; k < st.spread; k++) {
    const t = qTarget(st.cells);
    if (t < 0) break;
    spread.push({ to: t, from: qNeighbours(t).find((j) => st.cells[j] === Q.INF) });
    st.cells[t] = Q.INF;
  }
  if (qTarget(st.cells) < 0) st.done = qValue(st) >= st.total * Q.win ? 'won' : 'lost';
  st.last = { wall: i, spread };
  return st.last;
}
// A board the bot's play holds to at least half (so every board can be won), from the seed.
export function newQuarantine(seed, { floor = 1 } = {}) {
  const variant = floor >= PUZZLES.quarantine.deep ? (seeded(mix(seed, 9))() < 0.5 ? 'twin' : 'fast') : 'one';
  let first = null;
  for (let a = 0; a < 40; a++) {
    const st = qBoard(mix(seed, 100 + a), variant);
    first ||= st;
    if (st.starts.length < (variant === 'twin' ? 2 : 1)) continue;
    const t = { ...st, cells: st.cells.slice() };
    for (let g = 0; !t.done && g < 80; g++) { const i = qBest(t); if (i < 0) break; qWall(t, i); }
    if (t.done === 'won') return { ...st, seed };
  }
  return { ...first, seed };
}

// ---------- the chase ----------
export const H = { rows: 5, cols: 5, walls: [6, 10], best: [5, 12], attempts: 4000 };
const ekey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const MOVES = [[0, 0], [-1, 0], [0, 1], [1, 0], [0, -1]];
export const DIRS = { wait: [0, 0], up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] };
function hStep(walls, from, dr, dc) {
  const r = Math.floor(from / H.cols) + dr, c = (from % H.cols) + dc;
  if (r < 0 || r >= H.rows || c < 0 || c >= H.cols) return -1;
  const to = r * H.cols + c;
  return walls.has(ekey(from, to)) ? -1 : to;
}
// One Tracker step: across toward you if that's open, else up or down toward you if that's open, else it stands.
function trackerStep(walls, h, p) {
  const hc = h % H.cols, pc = p % H.cols, hr = Math.floor(h / H.cols), pr = Math.floor(p / H.cols);
  if (hc !== pc) { const t = hStep(walls, h, 0, pc > hc ? 1 : -1); if (t >= 0) return t; }
  if (hr !== pr) { const t = hStep(walls, h, pr > hr ? 1 : -1, 0); if (t >= 0) return t; }
  return h;
}
// The Tracker's turn: its two steps, and whether it caught you on either.
export function trackerTurn(walls, h, p) {
  const W = walls instanceof Set ? walls : new Set(walls), path = [h];
  for (let k = 0; k < 2; k++) { h = trackerStep(W, h, p); path.push(h); if (h === p) return { h, caught: true, path }; }
  return { h, caught: false, path };
}
// Both Trackers' turns (h2 null: a den with one): where each ends, and whether either caught you.
function trackersTurn(walls, h, h2, p) {
  const a = trackerTurn(walls, h, p), b = h2 == null ? null : trackerTurn(walls, h2, p);
  return { h: a.h, h2: b ? b.h : null, caught: a.caught || !!b?.caught, path: a.path, path2: b?.path || null };
}
// The fewest moves to the door (0: none), and the moves themselves. h2: a second Tracker (a deeper den), or null.
export function chaseSolve(wallsIn, p0, h0, exit, h20 = null) {
  const walls = wallsIn instanceof Set ? wallsIn : new Set(wallsIn), K = (p, h, h2) => (p * 64 + h) * 64 + (h2 ?? 63);
  const seen = new Map([[K(p0, h0, h20), null]]), q = [[p0, h0, h20]];
  while (q.length) {
    const [p, h, h2] = q.shift();
    for (const [dr, dc] of MOVES) {
      const np = dr || dc ? hStep(walls, p, dr, dc) : p;
      if (np < 0 || np === h || np === h2) continue;
      const dir = Object.keys(DIRS).find((k) => DIRS[k][0] === dr && DIRS[k][1] === dc);
      if (np === exit) {
        const moves = [dir];
        for (let k = K(p, h, h2); seen.get(k); k = seen.get(k).from) moves.unshift(seen.get(k).dir);
        return { best: moves.length, moves };
      }
      const t = trackersTurn(walls, h, h2, np);
      if (t.caught) continue;
      const k = K(np, t.h, t.h2);
      if (!seen.has(k)) { seen.set(k, { from: K(p, h, h2), dir }); q.push([np, t.h, t.h2]); }
    }
  }
  return { best: 0, moves: [] };
}
// Walking the shortest way to the door, never minding the Trackers: true if it gets there.
export function chaseStraight(wallsIn, p, h, exit, h2 = null) {
  const walls = wallsIn instanceof Set ? wallsIn : new Set(wallsIn);
  for (let n = 0; n < 40; n++) {
    const prev = new Map([[exit, -1]]), q = [exit];
    while (q.length) { const x = q.shift(); for (const [dr, dc] of MOVES.slice(1)) { const y = hStep(walls, x, dr, dc); if (y >= 0 && !prev.has(y)) { prev.set(y, x); q.push(y); } } }
    const np = prev.get(p);
    if (np === undefined || np < 0 || np === h || np === h2) return false;
    if (np === exit) return true;
    const t = trackersTurn(walls, h, h2, np);
    if (t.caught) return false;
    p = np; h = t.h; h2 = t.h2;
  }
  return false;
}
const hDist = (a, b) => Math.abs(Math.floor(a / H.cols) - Math.floor(b / H.cols)) + Math.abs((a % H.cols) - (b % H.cols));
export function newChase(seed, { floor = 1 } = {}) {
  const two = floor >= PUZZLES.chase.deep;
  for (let salt = 0; ; salt++) {
    for (let attempt = 0; attempt < H.attempts; attempt++) {
      const r = seeded(mix(seed, 7919 + salt * 104729 + attempt)), walls = new Set();
      const n = H.walls[0] + Math.floor(r() * (H.walls[1] - H.walls[0] + 1));
      while (walls.size < n) {
        const a = Math.floor(r() * H.rows * H.cols), horiz = r() < 0.5, b = horiz ? (a % H.cols < H.cols - 1 ? a + 1 : -1) : (a + H.cols < H.rows * H.cols ? a + H.cols : -1);
        if (b >= 0) walls.add(ekey(a, b));
      }
      const exitSide = Math.floor(r() * 4), along = Math.floor(r() * H.cols);
      const exit = exitSide === 0 ? along : exitSide === 1 ? along * H.cols + H.cols - 1 : exitSide === 2 ? (H.rows - 1) * H.cols + along : along * H.cols;
      const p0 = Math.floor(r() * H.rows * H.cols), h0 = Math.floor(r() * H.rows * H.cols), h20 = two ? Math.floor(r() * H.rows * H.cols) : null;
      if (p0 === h0 || p0 === exit || h0 === exit || hDist(p0, exit) < 4 || hDist(p0, h0) < 3) continue;
      if (two && (h20 === h0 || h20 === exit || hDist(p0, h20) < 3)) continue;
      const { best } = chaseSolve(walls, p0, h0, exit, h20);
      if (best < H.best[0] || best > H.best[1] || chaseStraight(walls, p0, h0, exit, h20)) continue;
      return { kind: 'chase', seed, walls: [...walls].sort(), exit, exitSide, p: p0, h: h0, p0, h0, ...(two ? { variant: 'twin', h2: h20, h20 } : {}), best, moves: 0, hist: [], last: null, done: null };
    }
  }
}
// A move: up, down, left, right or wait (or a room next to you by its number), undo, restart.
function chaseMove(st, dir) {
  if (st.done) return null;
  const d = DIRS[dir];
  if (!d) return null;
  const walls = new Set(st.walls), np = d[0] || d[1] ? hStep(walls, st.p, d[0], d[1]) : st.p;
  if (np < 0) return null;
  const from = st.p, h2 = st.h2 ?? null;
  st.hist.push([st.p, st.h, st.moves, h2]);
  st.moves++;
  st.p = np;
  if (np === st.h || np === h2) { st.done = 'lost'; st.last = { from, path: [np], caught: true }; return st.last; }
  if (np === st.exit) { st.done = 'won'; st.last = { from, path: null }; return st.last; }
  const t = trackersTurn(walls, st.h, h2, np);
  st.h = t.h;
  if (h2 != null) st.h2 = t.h2;
  st.last = { from, path: t.path, ...(t.path2 ? { path2: t.path2 } : {}), caught: t.caught };
  if (t.caught) st.done = 'lost';
  return st.last;
}
export const chaseReach = (st) => { const walls = new Set(st.walls), out = {}; for (const [k, [dr, dc]] of Object.entries(DIRS)) { if (k === 'wait') continue; const t = hStep(walls, st.p, dr, dc); if (t >= 0) out[t] = k; } return out; };
// Rooms you could step into where it would catch you (the board shows them red).
export const chaseDanger = (st, to) => to !== st.exit && (to === st.h || to === st.h2 || trackersTurn(st.walls, st.h, st.h2 ?? null, to).caught);

// ---------- the cascade ----------
export const C = { rows: 5, cols: 5, nodes: [12, 18], fewest: 3, cap: 5, attempts: 400, twin: { rows: 4, cols: 4, nodes: [16, 22], fill: 0.62 } };
const cNeighbours = (i) => qNeighbours(i, C.rows, C.cols);
// Two racks (a deeper cascade): one grid T.rows × 2·T.cols, the left rack and the right. A slot's neighbours are in its
// own rack; a slot on its rack's edge also touches the same slot on the other rack.
const T = C.twin;
export const cTwin = (b) => b.length === 2 * T.rows * T.cols;
const onEdge = (r, c) => r === 0 || r === T.rows - 1 || c === 0 || c === T.cols - 1;
export function twinNeighbours(i) {
  const W = 2 * T.cols, r = Math.floor(i / W), c = i % W, rack = c >= T.cols ? 1 : 0, lc = c - rack * T.cols, out = [];
  for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) { const nr = r + dr, nc = lc + dc; if (nr >= 0 && nr < T.rows && nc >= 0 && nc < T.cols) out.push(nr * W + nc + rack * T.cols); }
  if (onEdge(r, lc)) out.push(r * W + lc + (1 - rack) * T.cols);
  return out;
}
export const twinEdge = (i) => { const W = 2 * T.cols; return onEdge(Math.floor(i / W), (i % W) % T.cols); };
export const rackOf = (i) => (i % (2 * T.cols) >= T.cols ? 1 : 0);
// One discharge and everything it sets off, wave by wave: a snapshot of the rack after each wave (for the animation).
// Changes b in place.
export function discharge(b, i) {
  const frames = [], gone = new Set(), nb = cTwin(b) ? twinNeighbours : cNeighbours;
  let wave = [i];
  while (wave.length) {
    for (const x of wave) { gone.add(x); b[x] = 0; }
    const next = [];
    for (const x of wave) for (const y of nb(x)) { if (!b[y] || gone.has(y)) continue; b[y]++; if (b[y] > 3 && !next.includes(y)) next.push(y); }
    frames.push({ board: b.slice(), wave });
    wave = next;
  }
  return frames;
}
// Iterative deepening: the fewest taps that clear the rack (0 if none within cap), and the taps.
export function cascadeSolve(board, cap = C.cap) {
  for (let d = 1; d <= cap; d++) {
    const seen = new Set(), path = [];
    const go = (b, left) => {
      if (b.every((v) => !v)) return true;
      if (!left) return false;
      const k = b.join('') + left;
      if (seen.has(k)) return false;
      seen.add(k);
      for (let i = 0; i < b.length; i++) if (b[i]) { const nb = b.slice(); discharge(nb, i); path.push(i); if (go(nb, left - 1)) return true; path.pop(); }
      return false;
    };
    if (go(board, d)) return { best: d, taps: path };
  }
  return { best: 0, taps: [] };
}
export function newCascade(seed, { floor = 1 } = {}) {
  const two = floor >= PUZZLES.cascade.deep, nodes = two ? C.twin.nodes : C.nodes, fill = two ? C.twin.fill : 0.62;
  for (let salt = 0; ; salt++) {
    for (let a = 0; a < C.attempts; a++) {
      const r = seeded(mix(seed, (two ? 5113 : 4099) + salt * 7717 + a)), b = Array(two ? 2 * T.rows * T.cols : C.rows * C.cols).fill(0);
      for (let i = 0; i < b.length; i++) if (r() < fill) { const x = r(); b[i] = x < 0.25 ? 1 : x < 0.55 ? 2 : 3; }
      const n = b.filter(Boolean).length;
      if (n < nodes[0] || n > nodes[1]) continue;
      if (two && [0, 1].some((k) => !b.some((v, i) => v && rackOf(i) === k))) continue; // both racks charged
      const { best } = cascadeSolve(b);
      if (best < C.fewest) continue;
      return { kind: 'cascade', seed, ...(two ? { variant: 'twin' } : {}), start: b.slice(), b, best, taps: best + 1, used: 0, done: null, last: null };
    }
  }
}
function cascadeTap(st, i) {
  if (st.done || !st.b[i]) return null;
  st.used++;
  const frames = discharge(st.b, i);
  if (!st.b.some(Boolean)) st.done = 'won';
  else if (st.used >= st.taps) st.done = 'lost';
  st.last = { tap: i, frames, gone: frames.reduce((n, f) => n + f.wave.length, 0) };
  return st.last;
}

// ---------- the ping sweep ----------
export const P = { rows: 7, cols: 7, budget: 5, twinBudget: 8, noisy: 4 };
export const pDist = (a, b) => Math.abs(Math.floor(a / P.cols) - Math.floor(b / P.cols)) + Math.abs((a % P.cols) - (b % P.cols));
export function newSweep(seed, { floor = 1 } = {}) {
  const r = seeded(mix(seed, 613)), n = P.rows * P.cols;
  const variant = floor >= PUZZLES.sweep.deep ? (r() < 0.5 ? 'twin' : 'noisy') : 'one';
  const caches = [Math.floor(r() * n)];
  while (variant === 'twin' && caches.length < 2) { const i = Math.floor(r() * n); if (pDist(i, caches[0]) >= 3) caches.push(i); }
  const noise = {};
  while (variant === 'noisy' && Object.keys(noise).length < P.noisy) { const i = Math.floor(r() * n); if (!(i in noise)) noise[i] = r() < 0.5 ? 1 : -1; }
  return { kind: 'sweep', seed, variant, caches, noise, budget: variant === 'twin' ? P.twinBudget : P.budget, pings: [], digs: [], found: [], done: null, last: null };
}
// What a ping on cell i reads: the steps to the nearest cache still buried (a noisy cell one off, never under 0).
export function sweepRead(st, i) {
  const left = st.caches.filter((c) => !st.found.includes(c)), d = Math.min(...(left.length ? left : st.caches).map((c) => pDist(i, c)));
  if (!(i in st.noise)) return d;
  const off = d === 0 ? 1 : st.noise[i];
  return Math.max(0, d + off);
}
export const sweepLeft = (st) => st.budget - st.pings.length - st.digs.length;
function sweepAct(st, mode, i) {
  if (st.done || i < 0 || i >= P.rows * P.cols || st.digs.includes(i) || (mode === 'ping' && st.pings.some((p) => p.at === i))) return null; // a pinged cell can still be dug
  let hit = false;
  if (mode === 'ping') st.pings.push({ at: i, read: sweepRead(st, i) });
  else { st.digs.push(i); if (st.caches.includes(i) && !st.found.includes(i)) { st.found.push(i); hit = true; } }
  if (st.found.length === st.caches.length) st.done = 'won';
  else if (sweepLeft(st) <= 0) st.done = 'lost';
  st.last = { mode, at: i, hit, read: mode === 'ping' ? st.pings[st.pings.length - 1].read : null };
  return st.last;
}
// The cells a cache could still be in, by what the pings read (a noisy one reads one off).
export function sweepCandidates(st) {
  const n = P.rows * P.cols, all = Array.from({ length: n }, (_, i) => i).filter((i) => !st.digs.includes(i));
  const fits = (set) => st.pings.every(({ at, read }) => { const d = Math.min(...set.map((c) => pDist(at, c))); return at in st.noise ? Math.abs(d - read) === 1 || (d === 0 && read === 1) : d === read; });
  if (st.caches.length === 1) return all.filter((c) => fits([c]));
  const found = st.found, out = new Set();
  for (const a of [...found, ...all]) for (const b of all) if (a !== b && fits([a, b]) && (found.length ? found.includes(a) || found.includes(b) : true)) { if (!found.includes(a)) out.add(a); if (!found.includes(b)) out.add(b); }
  return [...out].sort((a, b) => a - b);
}
// The bot's play: dig when it knows (or is out of pings), else ping the cell that splits what's left best.
export function sweepBest(st) {
  const cand = sweepCandidates(st), left = sweepLeft(st), need = st.caches.length - st.found.length;
  if (cand.length <= need || left <= need) return { mode: 'dig', at: cand[0] ?? 0 };
  let best = null;
  for (let i = 0; i < P.rows * P.cols; i++) {
    if (st.pings.some((p) => p.at === i) || st.digs.includes(i) || i in st.noise) continue;
    const buckets = {};
    for (const c of cand) { const d = pDist(i, c); buckets[d] = (buckets[d] || 0) + 1; }
    const worst = Object.values(buckets).reduce((a, n) => a + n * n, 0); // the expected count left, times the candidates
    if (!best || worst < best.worst) best = { worst, at: i };
  }
  return { mode: 'ping', at: best?.at ?? cand[0] };
}

// ---------- packet routing ----------
// Tiles: { t: 'I' | 'L' | 'T' | '' (empty), r: quarter turns clockwise }. Sides N E S W are bits 1 2 4 8. The source
// feeds the left edge of row src, the sink takes the right edge of row snk.
export const RT = { rows: 5, cols: 7, slack: 2, path: [13, 21], best: [9, 14] };
const RT_BASE = { I: 0b0101, L: 0b0011, T: 0b0111, '': 0 };
const RDR = [-1, 0, 1, 0], RDC = [0, 1, 0, -1], opp = (d) => (d + 2) % 4, bit = (d) => 1 << d;
const rot = (m, r) => ((m << r) | (m >> (4 - r))) & 15;
export const rtMask = (t) => rot(RT_BASE[t.t], t.r);
// The fewest quarter turns (either way round) that open every side in need.
export function rtCost(t, need) {
  let best = Infinity;
  for (let k = 0; k < 4; k++) if ((rot(RT_BASE[t.t], (t.r + k) % 4) & need) === need) best = Math.min(best, k, 4 - k);
  return best;
}
const rtStep = (i, d) => { const r = Math.floor(i / RT.cols) + RDR[d], c = (i % RT.cols) + RDC[d]; return r < 0 || r >= RT.rows || c < 0 || c >= RT.cols ? -1 : r * RT.cols + c; };
// Every lit tile (joined to the source), and whether the sink is lit.
export function routeLit(st) {
  const on = new Set(), q = [], s0 = st.src * RT.cols, end = st.snk * RT.cols + RT.cols - 1;
  if (rtMask(st.tiles[s0]) & bit(3)) { on.add(s0); q.push(s0); }
  while (q.length) {
    const i = q.shift(), m = rtMask(st.tiles[i]);
    for (let d = 0; d < 4; d++) {
      const j = m & bit(d) ? rtStep(i, d) : -1;
      if (j >= 0 && !on.has(j) && rtMask(st.tiles[j]) & bit(opp(d))) { on.add(j); q.push(j); }
    }
  }
  return { on, won: on.has(end) && !!(rtMask(st.tiles[end]) & bit(1)) };
}
// The fewest turns that join the source to the sink, and one route that does it ([tile, sides it needs] a step): a DFS
// over simple routes, pruned by a lower bound from (tile, entry side) that ignores a route crossing itself.
export function routeSolve(st) {
  const n = RT.rows * RT.cols, end = st.snk * RT.cols + RT.cols - 1, LB = Array.from({ length: n }, () => [Infinity, Infinity, Infinity, Infinity]);
  for (let moved = true, pass = 0; moved && pass < 200; pass++) {
    moved = false;
    for (let i = 0; i < n; i++) for (let e = 0; e < 4; e++) {
      let best = i === end ? rtCost(st.tiles[i], bit(e) | bit(1)) : Infinity;
      for (let x = 0; x < 4; x++) {
        const j = x === e ? -1 : rtStep(i, x), k = j < 0 ? Infinity : rtCost(st.tiles[i], bit(e) | bit(x));
        if (k < Infinity) best = Math.min(best, k + LB[j][opp(x)]);
      }
      if (best < LB[i][e]) { LB[i][e] = best; moved = true; }
    }
  }
  let bestCost = Infinity, bestRoute = [];
  const seen = new Set(), route = [];
  const dfs = (i, e, cost) => {
    if (cost + LB[i][e] >= bestCost) return;
    seen.add(i);
    if (i === end) { const k = rtCost(st.tiles[i], bit(e) | bit(1)); if (cost + k < bestCost) { bestCost = cost + k; bestRoute = [...route, [i, bit(e) | bit(1)]]; } }
    for (let x = 0; x < 4; x++) {
      const j = x === e ? -1 : rtStep(i, x);
      if (j < 0 || seen.has(j)) continue;
      const k = rtCost(st.tiles[i], bit(e) | bit(x));
      if (k === Infinity) continue;
      route.push([i, bit(e) | bit(x)]); dfs(j, opp(x), cost + k); route.pop();
    }
    seen.delete(i);
  };
  dfs(st.src * RT.cols, 3, 0);
  return { best: bestCost, route: bestRoute };
}
// A winding route (a self-avoiding walk of 13–21 tiles, a fifth of it tees) under random tiles, every tile turned at
// random; kept when the fewest turns is 9 to 14. Turns: the fewest + 2.
export function newRouting(seed) {
  const { rows, cols } = RT;
  for (let a = 0; ; a++) {
    const r = seeded(mix(seed, 1301 + a)), src = Math.floor(r() * rows), snk = Math.floor(r() * rows), end = snk * cols + cols - 1;
    const path = [src * cols], used = new Set(path);
    let ok = false;
    for (let step = 0; step < 60; step++) {
      const i = path[path.length - 1];
      if (i === end && path.length >= RT.path[0]) { ok = true; break; }
      const dirs = [0, 1, 2, 3];
      for (let k = 3; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [dirs[k], dirs[j]] = [dirs[j], dirs[k]]; }
      const opts = dirs.map((d) => [d, rtStep(i, d)]).filter(([, j]) => j >= 0 && !used.has(j));
      if (!opts.length) break;
      const [, j] = opts.find(([d]) => d !== 1 || r() < 0.45) || opts[0];
      path.push(j); used.add(j);
    }
    if (!ok || path.length > RT.path[1]) continue;
    const tiles = Array.from({ length: rows * cols }, () => ({ t: ['L', 'L', 'L', 'I', 'I', 'T', 'T', ''][Math.floor(r() * 8)], r: 0 }));
    const side = (x, y) => RDR.findIndex((dr, d) => Math.floor(y / cols) - Math.floor(x / cols) === dr && (y % cols) - (x % cols) === RDC[d]);
    path.forEach((i, k) => {
      const e = k === 0 ? 3 : opp(side(path[k - 1], i)), x = k === path.length - 1 ? 1 : side(i, path[k + 1]);
      tiles[i] = { t: opp(e) === x ? 'I' : 'L', r: 0 };
      if (r() < 0.2) tiles[i].t = 'T';
    });
    for (const t of tiles) t.r = Math.floor(r() * 4);
    const st = { kind: 'routing', seed, src, snk, tiles, turns: 0, done: null, last: null };
    if (routeLit(st).won) continue;
    const { best, route } = routeSolve(st);
    if (best < RT.best[0] || best > RT.best[1]) continue;
    return { ...st, best, budget: best + RT.slack, solution: route };
  }
}
function routeTurn(st, i, dir) {
  if (st.done || !st.tiles[i]?.t) return null;
  st.tiles[i].r = (st.tiles[i].r + (dir > 0 ? 1 : 3)) % 4;
  st.turns++;
  if (routeLit(st).won) st.done = 'won';
  else if (st.turns >= st.budget) st.done = 'lost';
  st.last = { at: i, dir };
  return st.last;
}

// ---------- deadlock ----------
// Six processes around a pool of free locks (kinds A–D, as numbers). need[p]: every lock p must hold to finish; held[p]:
// what it holds. Give a free lock to a process that still needs it; one holding all it needs finishes and returns its
// locks to the pool. Deadlocked: none can finish from the pool.
export const DL = { n: 6, kinds: 4, rate: [0.04, 0.3], tries: 300 };
export const PROCS = ['cron', 'sshd', 'dbus', 'httpd', 'rsync', 'syslog'];
export const LOCKS = 'ABCD';
const minus = (a, b) => { const out = [...a]; for (const x of b) { const i = out.indexOf(x); if (i >= 0) out.splice(i, 1); } return out; };
const covers = (pool, want) => minus(want, pool).length === 0;
export const lockLeft = (st, p) => minus(st.need[p], st.held[p]);
export const canFinish = (st, p) => !st.fin[p] && covers(st.pool, lockLeft(st, p));
const finishable = (st) => PROCS.slice(0, st.n).map((_, p) => p).filter((p) => canFinish(st, p));
// A give, on a copy: the new board, or null when it can't go.
export function lockGive(st, p, l) {
  if (st.done || st.fin[p] || !st.pool.includes(l) || !lockLeft(st, p).includes(l)) return null;
  const held = st.held.map((h, q) => (q === p ? [...h, l] : h)), fin = [...st.fin];
  let pool = minus(st.pool, [l]), back = [];
  if (!minus(st.need[p], held[p]).length) { fin[p] = true; back = held[p]; pool = [...pool, ...back].sort(); held[p] = []; }
  const nb = { ...st, held, pool, fin, gives: st.gives + 1, last: { p, l, finished: back.length > 0, back } };
  nb.done = fin.every(Boolean) ? 'won' : finishable(nb).length ? null : 'lost';
  return nb;
}
// Solvable when finishing whatever can finish, in any order, finishes everyone (a finish only frees locks). steps: how
// many could finish at each point of that walk.
export function lockSolve(st) {
  let pool = [...st.pool];
  const fin = [...st.fin], steps = [], order = [];
  for (;;) {
    const can = fin.map((_, p) => p).filter((p) => !fin[p] && covers(pool, minus(st.need[p], st.held[p])));
    if (!can.length) break;
    steps.push(can.length);
    const p = can[0];
    fin[p] = true; pool = [...minus(pool, minus(st.need[p], st.held[p])), ...st.need[p]]; order.push(p);
  }
  return { ok: fin.every(Boolean), steps, order };
}
// How often random gives win it.
export function lockRandomRate(st, tries = DL.tries, r = seeded(5)) {
  let wins = 0;
  for (let t = 0; t < tries; t++) {
    let x = st;
    while (!x.done) {
      const opts = [];
      for (let p = 0; p < x.n; p++) if (!x.fin[p]) for (const l of new Set(lockLeft(x, p))) if (x.pool.includes(l)) opts.push([p, l]);
      if (!opts.length) break;
      const [p, l] = opts[Math.floor(r() * opts.length)];
      x = lockGive(x, p, l);
    }
    if (x.done === 'won') wins++;
  }
  return wins / tries;
}
// Kept: exactly one can finish at the start, at most two at any point of the finish chain, three or more decoys (a lock
// you could give but that finishes nothing), and random gives win 4–30% of the time.
export function newDeadlock(seed) {
  const { n, kinds } = DL;
  for (let a = 0; ; a++) {
    const r = seeded(mix(seed, 2203 + a)), shuf = (xs) => { for (let k = xs.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [xs[k], xs[j]] = [xs[j], xs[k]]; } return xs; };
    const need = Array.from({ length: n }, () => Array.from({ length: r() < 0.5 ? 2 : 3 }, () => Math.floor(r() * kinds)).sort());
    const held = need.map((nd) => shuf([...nd]).slice(0, Math.floor(r() * nd.length)).sort());
    const pool = Array.from({ length: 2 + Math.floor(r() * 2) }, () => Math.floor(r() * kinds)).sort();
    const st = { kind: 'deadlock', seed, n, need, held, pool, fin: Array(n).fill(false), gives: 0, done: null, last: null };
    if (finishable(st).length !== 1) continue;
    const sol = lockSolve(st);
    if (!sol.ok || Math.max(...sol.steps) > 2) continue;
    const decoys = need.map((_, p) => p).filter((p) => !canFinish(st, p) && lockLeft(st, p).some((l) => pool.includes(l))).length;
    if (decoys < 3) continue;
    const rate = lockRandomRate(st);
    if (rate < DL.rate[0] || rate > DL.rate[1]) continue;
    return { ...st, order: sol.order };
  }
}
function deadlockGive(st, p, l) {
  const nb = lockGive(st, p, l);
  if (!nb) return null;
  Object.assign(st, nb);
  return st.last;
}

// ---------- cryptogram ----------
// wick's notes in one substitution key, the player's (s.cipher: its seed and the plain letters solved, made on first
// use), so a solved letter stays solved on every later note, won or lost. Once no note has three letters left to
// solve, wick changes the key.
export const CG = { strikes: 3, fresh: 3 };
export const NOTES = [
  'dont trust the quiet ones. the loud ones tell you what they want.',
  'there is a box off the map. old builds still run on it. tune the scanner to 81.3 after dark and wait for the numbers.',
  'the runner you met on four keeps a log. read it before you go back down. they never wipe it.',
  'quiet week. the market on two pays double for coolant. dont ask me why. sell before friday.',
  'halcyon reads your mail. so do i. only one of us minds.',
  'every vault has a guard who wants to go home. find the guard first.',
  'if the tracker wakes, walk. never run. it counts your steps, not your speed.',
  'burn this. or dont. nobody but you has the key.',
];
export const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
const lettersOf = (text) => [...new Set(text.replace(/[^a-z]/g, ''))];
// The player's key, made on first use (the save keys on the field).
export function cipherOf(s) {
  if (!s.cipher || !Array.isArray(s.cipher.solved)) s.cipher = { seed: Math.floor(Math.random() * 2 ** 31) || 1, solved: [] };
  return s.cipher;
}
// A key from its seed: plain letter → cipher letter (capital), none to itself.
export function wickKey(seed) {
  const r = seeded(mix(seed, 3307));
  for (;;) {
    const sh = [...ALPHA];
    for (let k = sh.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [sh[k], sh[j]] = [sh[j], sh[k]]; }
    if (sh.every((c, i) => c !== ALPHA[i])) return Object.fromEntries([...ALPHA].map((c, i) => [c, sh[i].toUpperCase()]));
  }
}
// A note with three or more letters still to solve, from the seed (none left: a new key, and it changes cipher).
export function newCryptogram(seed, cipher = { seed: 1, solved: [] }) {
  const open = (t) => lettersOf(t).filter((c) => !cipher.solved.includes(c)).length >= CG.fresh;
  if (!NOTES.some(open)) { cipher.seed = (mix(cipher.seed, 17) % 2 ** 31) || 1; cipher.solved = []; }
  const notes = NOTES.map((t, i) => i).filter((i) => open(NOTES[i])), note = notes[Math.floor(seeded(mix(seed, 3301))() * notes.length)];
  return { kind: 'cryptogram', seed, note, text: NOTES[note], kseed: cipher.seed, key: wickKey(cipher.seed), carried: lettersOf(NOTES[note]).filter((c) => cipher.solved.includes(c)).sort(), solved: [], strikes: CG.strikes, misses: 0, wrong: [], done: null, last: null };
}
export const cgPlain = (st, C) => Object.keys(st.key).find((p) => st.key[p] === C);
export const cgKnown = (st, p) => st.carried.includes(p) || st.solved.includes(p);
export const cgOpen = (st) => lettersOf(st.text).filter((p) => !cgKnown(st, p));
// A guess: cipher letter C stands for plain p. Right fills it everywhere; wrong costs a strike.
function cgGuess(st, C, p) {
  const truth = cgPlain(st, C);
  if (st.done || !truth || !ALPHA.includes(p) || !st.text.includes(truth) || cgKnown(st, truth) || st.wrong.includes(`${C}${p}`)) return null;
  if (truth === p) {
    st.solved.push(p);
    st.last = { C, p, ok: true };
    if (!cgOpen(st).length) st.done = 'won';
    return st.last;
  }
  st.misses++;
  st.wrong.push(`${C}${p}`);
  st.last = { C, p, ok: false };
  if (st.misses >= st.strikes) st.done = 'lost';
  return st.last;
}

// ---------- the terminal: the log sweep ----------
// An incident file from the room's seed: its kind (two breach logs in four, a transfer log, a process list) and its
// trick by floor (2: the obvious one, 3: a decoy, 4+: the note). The answer stays on the board; the page never shows it.
export const LS = { strikes: 2, kinds: ['auth', 'auth', 'exfil', 'proc'] };
export function newTerminal(seed, { floor = 2 } = {}) {
  const r = seeded(mix(seed, 2203)), kind = LS.kinds[Math.floor(r() * LS.kinds.length)];
  const p = sweepFor({ seed: Math.floor(r() * 2 ** 31) + 1, depth: Math.max(1, floor - 1) }, kind);
  return { kind: 'terminal', seed, log: p.kind, tier: p.tier, file: p.file, question: p.question, note: p.note, cols: p.cols, rows: p.rows, filters: p.filters, toneCol: p.toneCol, suspects: p.suspects, answer: p.answer, misses: 0, strikes: LS.strikes, wrong: [], done: null, last: null };
}
function terminalName(st, a) {
  if (!st.suspects.includes(a) || st.wrong.includes(a)) return null;
  const ok = a === st.answer;
  if (ok) st.done = 'won';
  else { st.wrong.push(a); st.misses++; if (st.misses >= st.strikes) st.done = 'lost'; }
  st.last = { name: a, ok };
  return st.last;
}

// ---------- one entry point ----------
// A new board for a room: its kind, its seed (the server's, the room's and how many times it has refilled), its floor.
// A cryptogram takes the player's key (cipherOf) and may change it (a new key once every note reads).
export function newPuzzle(kind, seed, { floor = 1, cipher } = {}) {
  if (kind === 'quarantine') return newQuarantine(seed, { floor });
  if (kind === 'chase') return newChase(seed, { floor });
  if (kind === 'cascade') return newCascade(seed, { floor });
  if (kind === 'sweep') return newSweep(seed, { floor });
  if (kind === 'routing') return newRouting(seed);
  if (kind === 'deadlock') return newDeadlock(seed);
  if (kind === 'cryptogram') return newCryptogram(seed, cipher);
  if (kind === 'terminal') return newTerminal(seed, { floor });
  return null;
}
// A move on a board, in words (the card's verbs and the terminal's): quarantine "wall 23"; chase "up", "down", "left",
// "right", "wait", "go 12", "undo", "restart"; cascade "tap 7"; sweep "ping 12", "dig 30"; routing "turn 12", "back 12"
// (anticlockwise); deadlock "give cron a"; cryptogram "guess q e" (Q stands for e); terminal "name 10.4.2.17". Returns what happened, or
// null when the move doesn't go (the board stays as it was).
export function puzzleMove(st, text) {
  const [verb, arg] = String(text || '').trim().toLowerCase().split(/\s+/), i = Number(arg);
  if (!st || st.done) return null;
  if (st.kind === 'quarantine') return verb === 'wall' && Number.isInteger(i) ? qWall(st, i) : null;
  if (st.kind === 'cascade') return verb === 'tap' && Number.isInteger(i) ? cascadeTap(st, i) : null;
  if (st.kind === 'sweep') return (verb === 'ping' || verb === 'dig') && Number.isInteger(i) ? sweepAct(st, verb, i) : null;
  if (st.kind === 'routing') return (verb === 'turn' || verb === 'back') && Number.isInteger(i) ? routeTurn(st, i, verb === 'turn' ? 1 : -1) : null;
  const third = String(text || '').trim().toLowerCase().split(/\s+/)[2];
  if (st.kind === 'deadlock') { const p = /^\d+$/.test(arg) ? Number(arg) : PROCS.indexOf(arg), l = LOCKS.indexOf((third || '').toUpperCase()); return verb === 'give' && p >= 0 && p < st.n && l >= 0 ? deadlockGive(st, p, l) : null; }
  if (st.kind === 'cryptogram') return verb === 'guess' && arg?.length === 1 && third?.length === 1 ? cgGuess(st, arg.toUpperCase(), third) : null;
  if (st.kind === 'terminal') return (verb === 'name' || verb === 'sweep') && arg ? terminalName(st, arg) : null;
  if (st.kind === 'chase') {
    if (verb === 'undo') { const h = st.hist.pop(); if (!h) return null; [st.p, st.h, st.moves] = h; if (st.h20 != null) st.h2 = h[3]; st.last = { undo: true }; return st.last; }
    if (verb === 'restart') { if (!st.hist.length) return null; st.p = st.p0; st.h = st.h0; if (st.h20 != null) st.h2 = st.h20; st.moves = 0; st.hist = []; st.last = { restart: true }; return st.last; }
    if (verb === 'go' && Number.isInteger(i)) { const dir = i === st.p ? 'wait' : chaseReach(st)[i]; return dir ? chaseMove(st, dir) : null; }
    return chaseMove(st, verb);
  }
  return null;
}
// The move the bot makes next (its solver's or its heuristic's), as puzzleMove takes it.
export function botMove(st) {
  if (!st || st.done) return null;
  if (st.kind === 'quarantine') { const i = qBest(st); return i >= 0 ? `wall ${i}` : null; }
  if (st.kind === 'cascade') { const { taps } = cascadeSolve(st.b, Math.max(1, st.taps - st.used)); return `tap ${taps[0] ?? st.b.findIndex(Boolean)}`; }
  if (st.kind === 'sweep') { const m = sweepBest(st); return `${m.mode} ${m.at}`; }
  if (st.kind === 'chase') { const { moves } = chaseSolve(st.walls, st.p, st.h, st.exit, st.h2 ?? null); return moves[0] || 'wait'; }
  if (st.kind === 'terminal') return `name ${st.answer}`;
  if (st.kind === 'routing') {
    const step = routeSolve(st).route.find(([i, need]) => (rtMask(st.tiles[i]) & need) !== need);
    if (!step) return null;
    const [i, need] = step, t = st.tiles[i];
    return `${rtCost({ ...t, r: (t.r + 1) % 4 }, need) < rtCost(t, need) ? 'turn' : 'back'} ${i}`;
  }
  if (st.kind === 'deadlock') { const p = lockSolve(st).order[0] ?? st.fin.indexOf(false), l = lockLeft(st, p).find((x) => st.pool.includes(x)); return l == null ? null : `give ${PROCS[p]} ${LOCKS[l].toLowerCase()}`; }
  if (st.kind === 'cryptogram') { const p = cgOpen(st)[0]; return p ? `guess ${st.key[p].toLowerCase()} ${p}` : null; }
  return null;
}
// How the board went: its score as the room pays it. quarantine: the value saved of the total; cascade: the taps
// left over; sweep: the caches found and the budget left; chase: the moves.
export function puzzleScore(st) {
  if (st.kind === 'quarantine') return { saved: qValue(st), total: st.total, walls: st.walls };
  if (st.kind === 'cascade') return { spare: Math.max(0, st.taps - st.used), used: st.used, best: st.best, left: st.b.filter(Boolean).length };
  if (st.kind === 'sweep') return { found: st.found.length, caches: st.caches.length, left: sweepLeft(st) };
  if (st.kind === 'chase') return { moves: st.moves, best: st.best };
  if (st.kind === 'routing') return { turns: st.turns, best: st.best, left: st.budget - st.turns };
  if (st.kind === 'deadlock') return { fin: st.fin.filter(Boolean).length, n: st.n };
  if (st.kind === 'cryptogram') return { solved: st.solved.length, misses: st.misses, note: st.note };
  if (st.kind === 'terminal') return { misses: st.misses, strikes: st.strikes };
  return {};
}

// ---------- words (the terminal) ----------
// A board's size, and a cell by its address as the board labels it (columns A…, rows 1…: c4), or by its number.
export const dimsOf = (st) => (st.kind === 'quarantine' ? [Q.rows, Q.cols] : st.kind === 'sweep' ? [P.rows, P.cols] : st.kind === 'routing' ? [RT.rows, RT.cols] : st.kind === 'terminal' ? [0, 0] : st.kind === 'cascade' && cTwin(st.b) ? [T.rows, 2 * T.cols] : [5, 5]);
const colName = (c) => String.fromCharCode(65 + c);
export const cellName = (st, i) => { const [, cols] = dimsOf(st); return `${colName(i % cols)}${Math.floor(i / cols) + 1}`; };
export function cellOf(st, text) {
  const [rows, cols] = dimsOf(st), t = String(text || '').trim().toLowerCase(), m = t.match(/^([a-z])(\d+)$/);
  if (m) { const c = m[1].charCodeAt(0) - 97, r = Number(m[2]) - 1; return c >= 0 && c < cols && r >= 0 && r < rows ? r * cols + c : null; }
  return /^\d+$/.test(t) && Number(t) < rows * cols ? Number(t) : null;
}
// Whether you've made a move on it yet.
const STARTED = { quarantine: (st) => st.turn > 0, chase: (st) => st.moves > 0, cascade: (st) => st.used > 0, sweep: (st) => st.pings.length + st.digs.length > 0, routing: (st) => st.turns > 0, deadlock: (st) => st.gives > 0, cryptogram: (st) => st.solved.length + st.misses > 0, terminal: (st) => st.misses > 0 };
export const puzzleStarted = (st) => !!st && !!STARTED[st.kind]?.(st);
// The board as text: a header of columns and a row a line.
const PIPE = { 0: ' ', 1: '╵', 2: '╶', 4: '╷', 8: '╴', 5: '│', 10: '─', 3: '└', 6: '┌', 12: '┐', 9: '┘', 7: '├', 14: '┬', 13: '┤', 11: '┴', 15: '┼' };
export function boardLines(st) {
  if (st.kind === 'deadlock') return [...st.need.map((_, p) => `${PROCS[p].padEnd(7)}${st.fin[p] ? 'exit 0' : `holds ${st.held[p].map((l) => LOCKS[l]).join(' ') || '-'} · needs ${lockLeft(st, p).map((l) => LOCKS[l]).join(' ')}`}`), `Free: ${st.pool.map((l) => LOCKS[l]).join(' ') || '-'} · give cron a`];
  if (st.kind === 'cryptogram') return [st.text.replace(/[a-z]/g, (c) => st.key[c]), st.text.replace(/[a-z]/g, (c) => (cgKnown(st, c) ? c : '_')), `Strikes ${st.misses}/${st.strikes} · guess q e: Q stands for e`];
  if (st.kind === 'terminal') return [`${st.file}: ${st.question}`, ...(st.note ? [st.note] : []), st.cols.join('  '), ...st.rows.map((x) => x.cells.join('  ')), `Suspects: ${st.suspects.map((a) => (st.wrong.includes(a) ? `${a} (no)` : a)).join(', ')} · strikes ${st.misses}/${st.strikes} · name <answer>`];
  const [rows, cols] = dimsOf(st), out = ['    ' + Array.from({ length: cols }, (_, c) => colName(c)).join(' ')];
  const next = st.kind === 'quarantine' && !st.done ? new Set(qTargets(st).map((t) => t.to)) : new Set();
  for (let r = 0; r < rows; r++) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (st.kind === 'quarantine') cells.push(next.has(i) ? '!' : st.cells[i] === Q.INF ? 'X' : st.cells[i] === Q.WALL ? '#' : st.cells[i] === Q.DEAD ? ' ' : st.data.includes(i) ? '*' : '.');
      else if (st.kind === 'cascade') cells.push(st.b[i] ? String(st.b[i]) : '.');
      else if (st.kind === 'routing') cells.push(PIPE[rtMask(st.tiles[i])] ?? '?');
      else if (st.kind === 'sweep') { const p = st.pings.find((x) => x.at === i); cells.push(st.found.includes(i) ? '$' : st.digs.includes(i) ? 'x' : p ? String(Math.min(9, p.read)) : i in st.noise ? '~' : '.'); }
      else cells.push(i === st.p ? '@' : i === st.h || i === st.h2 ? 'T' : i === st.exit ? 'D' : '.');
    }
    out.push(`${st.kind === 'routing' && r === st.src ? '>' : ' '}${String(r + 1).padStart(2)} ${cells.join(st.kind === 'routing' ? '' : ' ')}${st.kind === 'routing' && r === st.snk ? ' >' : ''}`);
  }
  if (st.kind === 'quarantine') out.push(`Safe ${qValue(st)}/${st.total} · firewalls ${st.walls} · X the worm, ! where it goes next, * a data node (3)`);
  if (st.kind === 'routing') { out[0] = '    ' + Array.from({ length: cols }, (_, c) => colName(c)).join(''); out.push(`Turns left ${st.budget - st.turns} · fewest ${st.best} · turn c3, back c3`); }
  if (st.kind === 'cascade') out.push(`Taps left ${st.taps - st.used} · fewest ${st.best}${cTwin(st.b) ? ` · two racks (A–${colName(T.cols - 1)}, ${colName(T.cols)}–${colName(2 * T.cols - 1)}): an edge node charges its twin` : ''}`);
  if (st.kind === 'sweep') out.push(`Budget ${sweepLeft(st)}/${st.budget}${Object.keys(st.noise).length ? ' · ~ a noisy cell reads one off' : ''}${st.caches.length > 1 ? ' · two caches' : ''}`);
  if (st.kind === 'chase') { out.push(`Moves ${st.moves} · fewest ${st.best} · @ you, T the Tracker, D the door`); out.push(`Walls: ${st.walls.map((k) => k.split('-').map((x) => cellName(st, Number(x))).join('|')).join(' ')}`); }
  return out;
}
// One move in words.
export function moveLine(st, did) {
  const at = (i) => cellName(st, i);
  if (st.kind === 'quarantine') return `Firewall on ${at(did.wall)}.${did.spread.length ? ` The worm copies into ${did.spread.map((x) => at(x.to)).join(' and ')}.` : ''}${st.done ? ' It can\'t spread.' : ''}`;
  if (st.kind === 'cascade') return `${at(did.tap)} discharges: ${did.gone} ${did.gone === 1 ? 'node goes' : 'nodes go'}.`;
  if (st.kind === 'routing') return `${at(did.at)} turns ${did.dir > 0 ? 'clockwise' : 'back'}.${st.done === 'won' ? ' The sink lights.' : ''}`;
  if (st.kind === 'deadlock') return `${PROCS[did.p]} takes ${LOCKS[did.l]}.${did.finished ? ` It finishes and returns ${st.need[did.p].map((l) => LOCKS[l]).join(' ')}.` : ''}${st.done === 'lost' ? ' Deadlock.' : ''}`;
  if (st.kind === 'cryptogram') return did.ok ? `${did.C} is ${did.p}.` : `${did.C} isn't ${did.p}.`;
  if (st.kind === 'terminal') return did.ok ? `${did.name}: it fits.` : `${did.name}: it doesn't fit.${st.done === 'lost' ? ' The log rotates.' : ''}`;
  if (st.kind === 'sweep') return did.mode === 'ping' ? `Ping ${at(did.at)}: ${did.read} ${did.read === 1 ? 'step' : 'steps'}.` : `Dig ${at(did.at)}: ${did.hit ? 'a cache.' : 'nothing.'}`;
  if (did.undo) return 'Undone.';
  if (did.restart) return 'Back to the start.';
  return did.path ? `You: ${at(did.from)} → ${at(st.p)}. The Tracker: ${did.path.map(at).join(' → ')}.${did.path2 ? ` The second: ${did.path2.map(at).join(' → ')}.` : ''}${did.caught ? ' It has you.' : ''}` : st.done === 'won' ? 'Through the door.' : 'You walk into it.';
}

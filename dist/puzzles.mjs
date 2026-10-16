// Puzzle rooms (docs/servers.md 9.11): four rooms that aren't fights. Pure: a seed in, a board out, a move in, what
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
import { seeded } from './gear.mjs';

export const PUZZLE_KINDS = ['quarantine', 'chase', 'cascade', 'sweep'];
// Each one's name, its title (what you do), its rule (one line) and how deep its harder boards start.
export const PUZZLES = {
  quarantine: { name: 'Quarantine', title: 'Wall it in', rule: 'Firewall a node. The worm copies into the marked one. Every node it never reaches pays.', deep: 4 },
  chase: { name: 'Hunter chase', title: 'Reach the door', rule: 'Move a room or wait. The Tracker takes two steps: across first, then up or down. Walls stop it.', deep: 99 },
  cascade: { name: 'Cascade', title: 'Bring it all down', rule: 'Tap to discharge. Every node beside it gains 1; past 3, it goes too.', deep: 99 },
  sweep: { name: 'Ping sweep', title: 'Find the cache', rule: 'A ping reads the steps to the cache. Pings and digs share the budget.', deep: 4 },
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
// The fewest moves to the door (0: none), and the moves themselves.
export function chaseSolve(wallsIn, p0, h0, exit) {
  const walls = wallsIn instanceof Set ? wallsIn : new Set(wallsIn);
  const seen = new Map([[p0 * 64 + h0, null]]), q = [[p0, h0]];
  while (q.length) {
    const [p, h] = q.shift();
    for (const [dr, dc] of MOVES) {
      const np = dr || dc ? hStep(walls, p, dr, dc) : p;
      if (np < 0 || np === h) continue;
      const dir = Object.keys(DIRS).find((k) => DIRS[k][0] === dr && DIRS[k][1] === dc);
      if (np === exit) {
        const moves = [dir];
        for (let k = p * 64 + h; seen.get(k); k = seen.get(k).from) moves.unshift(seen.get(k).dir);
        return { best: moves.length, moves };
      }
      const t = trackerTurn(walls, h, np);
      if (t.caught) continue;
      const k = np * 64 + t.h;
      if (!seen.has(k)) { seen.set(k, { from: p * 64 + h, dir }); q.push([np, t.h]); }
    }
  }
  return { best: 0, moves: [] };
}
// Walking the shortest way to the door, never minding the Tracker: true if it gets there.
export function chaseStraight(wallsIn, p, h, exit) {
  const walls = wallsIn instanceof Set ? wallsIn : new Set(wallsIn);
  for (let n = 0; n < 40; n++) {
    const prev = new Map([[exit, -1]]), q = [exit];
    while (q.length) { const x = q.shift(); for (const [dr, dc] of MOVES.slice(1)) { const y = hStep(walls, x, dr, dc); if (y >= 0 && !prev.has(y)) { prev.set(y, x); q.push(y); } } }
    const np = prev.get(p);
    if (np === undefined || np < 0 || np === h) return false;
    if (np === exit) return true;
    const t = trackerTurn(walls, h, np);
    if (t.caught) return false;
    p = np; h = t.h;
  }
  return false;
}
const hDist = (a, b) => Math.abs(Math.floor(a / H.cols) - Math.floor(b / H.cols)) + Math.abs((a % H.cols) - (b % H.cols));
export function newChase(seed) {
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
      const p0 = Math.floor(r() * H.rows * H.cols), h0 = Math.floor(r() * H.rows * H.cols);
      if (p0 === h0 || p0 === exit || h0 === exit || hDist(p0, exit) < 4 || hDist(p0, h0) < 3) continue;
      const { best } = chaseSolve(walls, p0, h0, exit);
      if (best < H.best[0] || best > H.best[1] || chaseStraight(walls, p0, h0, exit)) continue;
      return { kind: 'chase', seed, walls: [...walls].sort(), exit, exitSide, p: p0, h: h0, p0, h0, best, moves: 0, hist: [], last: null, done: null };
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
  const from = st.p;
  st.hist.push([st.p, st.h, st.moves]);
  st.moves++;
  st.p = np;
  if (np === st.h) { st.done = 'lost'; st.last = { from, path: [st.h], caught: true }; return st.last; }
  if (np === st.exit) { st.done = 'won'; st.last = { from, path: null }; return st.last; }
  const t = trackerTurn(walls, st.h, np);
  st.h = t.h;
  st.last = { from, path: t.path, caught: t.caught };
  if (t.caught) st.done = 'lost';
  return st.last;
}
export const chaseReach = (st) => { const walls = new Set(st.walls), out = {}; for (const [k, [dr, dc]] of Object.entries(DIRS)) { if (k === 'wait') continue; const t = hStep(walls, st.p, dr, dc); if (t >= 0) out[t] = k; } return out; };
// Rooms you could step into where it would catch you (the board shows them red).
export const chaseDanger = (st, to) => to !== st.exit && (to === st.h || trackerTurn(st.walls, st.h, to).caught);

// ---------- the cascade ----------
export const C = { rows: 5, cols: 5, nodes: [12, 18], fewest: 3, cap: 5, attempts: 400 };
const cNeighbours = (i) => qNeighbours(i, C.rows, C.cols);
// One discharge and everything it sets off, wave by wave: a snapshot of the rack after each wave (for the animation).
// Changes b in place.
export function discharge(b, i) {
  const frames = [], gone = new Set();
  let wave = [i];
  while (wave.length) {
    for (const x of wave) { gone.add(x); b[x] = 0; }
    const next = [];
    for (const x of wave) for (const y of cNeighbours(x)) { if (!b[y] || gone.has(y)) continue; b[y]++; if (b[y] > 3 && !next.includes(y)) next.push(y); }
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
export function newCascade(seed) {
  for (let salt = 0; ; salt++) {
    for (let a = 0; a < C.attempts; a++) {
      const r = seeded(mix(seed, 4099 + salt * 7717 + a)), b = Array(C.rows * C.cols).fill(0);
      for (let i = 0; i < b.length; i++) if (r() < 0.62) { const x = r(); b[i] = x < 0.25 ? 1 : x < 0.55 ? 2 : 3; }
      const n = b.filter(Boolean).length;
      if (n < C.nodes[0] || n > C.nodes[1]) continue;
      const { best } = cascadeSolve(b);
      if (best < C.fewest) continue;
      return { kind: 'cascade', seed, start: b.slice(), b, best, taps: best + 1, used: 0, done: null, last: null };
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

// ---------- one entry point ----------
// A new board for a room: its kind, its seed (the server's, the room's and how many times it has refilled), its floor.
export function newPuzzle(kind, seed, { floor = 1 } = {}) {
  if (kind === 'quarantine') return newQuarantine(seed, { floor });
  if (kind === 'chase') return newChase(seed);
  if (kind === 'cascade') return newCascade(seed);
  if (kind === 'sweep') return newSweep(seed, { floor });
  return null;
}
// A move on a board, in words (the card's verbs and the terminal's): quarantine "wall 23"; chase "up", "down", "left",
// "right", "wait", "go 12", "undo", "restart"; cascade "tap 7"; sweep "ping 12", "dig 30". Returns what happened, or
// null when the move doesn't go (the board stays as it was).
export function puzzleMove(st, text) {
  const [verb, arg] = String(text || '').trim().toLowerCase().split(/\s+/), i = Number(arg);
  if (!st || st.done) return null;
  if (st.kind === 'quarantine') return verb === 'wall' && Number.isInteger(i) ? qWall(st, i) : null;
  if (st.kind === 'cascade') return verb === 'tap' && Number.isInteger(i) ? cascadeTap(st, i) : null;
  if (st.kind === 'sweep') return (verb === 'ping' || verb === 'dig') && Number.isInteger(i) ? sweepAct(st, verb, i) : null;
  if (st.kind === 'chase') {
    if (verb === 'undo') { const h = st.hist.pop(); if (!h) return null; [st.p, st.h, st.moves] = h; st.last = { undo: true }; return st.last; }
    if (verb === 'restart') { if (!st.hist.length) return null; st.p = st.p0; st.h = st.h0; st.moves = 0; st.hist = []; st.last = { restart: true }; return st.last; }
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
  if (st.kind === 'chase') { const { moves } = chaseSolve(st.walls, st.p, st.h, st.exit); return moves[0] || 'wait'; }
  return null;
}
// How the board went: its score as the room pays it. quarantine: the value saved of the total; cascade: the taps
// left over; sweep: the caches found and the budget left; chase: the moves.
export function puzzleScore(st) {
  if (st.kind === 'quarantine') return { saved: qValue(st), total: st.total, walls: st.walls };
  if (st.kind === 'cascade') return { spare: Math.max(0, st.taps - st.used), used: st.used, best: st.best, left: st.b.filter(Boolean).length };
  if (st.kind === 'sweep') return { found: st.found.length, caches: st.caches.length, left: sweepLeft(st) };
  if (st.kind === 'chase') return { moves: st.moves, best: st.best };
  return {};
}

// ---------- words (the terminal) ----------
// A board's size, and a cell by its address as the board labels it (columns A…, rows 1…: c4), or by its number.
export const dimsOf = (st) => (st.kind === 'quarantine' ? [Q.rows, Q.cols] : st.kind === 'sweep' ? [P.rows, P.cols] : [5, 5]);
const colName = (c) => String.fromCharCode(65 + c);
export const cellName = (st, i) => { const [, cols] = dimsOf(st); return `${colName(i % cols)}${Math.floor(i / cols) + 1}`; };
export function cellOf(st, text) {
  const [rows, cols] = dimsOf(st), t = String(text || '').trim().toLowerCase(), m = t.match(/^([a-z])(\d+)$/);
  if (m) { const c = m[1].charCodeAt(0) - 97, r = Number(m[2]) - 1; return c >= 0 && c < cols && r >= 0 && r < rows ? r * cols + c : null; }
  return /^\d+$/.test(t) && Number(t) < rows * cols ? Number(t) : null;
}
// Whether you've made a move on it yet.
export const puzzleStarted = (st) => !!st && (st.kind === 'quarantine' ? st.turn > 0 : st.kind === 'chase' ? st.moves > 0 : st.kind === 'cascade' ? st.used > 0 : st.pings.length + st.digs.length > 0);
// The board as text: a header of columns and a row a line.
export function boardLines(st) {
  const [rows, cols] = dimsOf(st), out = ['    ' + Array.from({ length: cols }, (_, c) => colName(c)).join(' ')];
  const next = st.kind === 'quarantine' && !st.done ? new Set(qTargets(st).map((t) => t.to)) : new Set();
  for (let r = 0; r < rows; r++) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (st.kind === 'quarantine') cells.push(next.has(i) ? '!' : st.cells[i] === Q.INF ? 'X' : st.cells[i] === Q.WALL ? '#' : st.cells[i] === Q.DEAD ? ' ' : st.data.includes(i) ? '*' : '.');
      else if (st.kind === 'cascade') cells.push(st.b[i] ? String(st.b[i]) : '.');
      else if (st.kind === 'sweep') { const p = st.pings.find((x) => x.at === i); cells.push(st.found.includes(i) ? '$' : st.digs.includes(i) ? 'x' : p ? String(Math.min(9, p.read)) : i in st.noise ? '~' : '.'); }
      else cells.push(i === st.p ? '@' : i === st.h ? 'T' : i === st.exit ? 'D' : '.');
    }
    out.push(`${String(r + 1).padStart(2)}  ${cells.join(' ')}`);
  }
  if (st.kind === 'quarantine') out.push(`Safe ${qValue(st)}/${st.total} · firewalls ${st.walls} · X the worm, ! where it goes next, * a data node (3)`);
  if (st.kind === 'cascade') out.push(`Taps left ${st.taps - st.used} · fewest ${st.best}`);
  if (st.kind === 'sweep') out.push(`Budget ${sweepLeft(st)}/${st.budget}${Object.keys(st.noise).length ? ' · ~ a noisy cell reads one off' : ''}${st.caches.length > 1 ? ' · two caches' : ''}`);
  if (st.kind === 'chase') { out.push(`Moves ${st.moves} · fewest ${st.best} · @ you, T the Tracker, D the door`); out.push(`Walls: ${st.walls.map((k) => k.split('-').map((x) => cellName(st, Number(x))).join('|')).join(' ')}`); }
  return out;
}
// One move in words.
export function moveLine(st, did) {
  const at = (i) => cellName(st, i);
  if (st.kind === 'quarantine') return `Firewall on ${at(did.wall)}.${did.spread.length ? ` The worm copies into ${did.spread.map((x) => at(x.to)).join(' and ')}.` : ''}${st.done ? ' It can\'t spread.' : ''}`;
  if (st.kind === 'cascade') return `${at(did.tap)} discharges: ${did.gone} ${did.gone === 1 ? 'node goes' : 'nodes go'}.`;
  if (st.kind === 'sweep') return did.mode === 'ping' ? `Ping ${at(did.at)}: ${did.read} ${did.read === 1 ? 'step' : 'steps'}.` : `Dig ${at(did.at)}: ${did.hit ? 'a cache.' : 'nothing.'}`;
  if (did.undo) return 'Undone.';
  if (did.restart) return 'Back to the start.';
  return did.path ? `You: ${at(did.from)} → ${at(st.p)}. The Tracker: ${did.path.map(at).join(' → ')}.${did.caught ? ' It has you.' : ''}` : st.done === 'won' ? 'Through the door.' : 'You walk into it.';
}

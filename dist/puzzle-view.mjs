// The puzzle rooms' panel (puzzles.mjs, floorplan.mjs boardOf): walking into a puzzle room opens its board over the
// room map, drawn as the map is (Schematic HD: chips with cut corners, traces with a dark bed, the dot-grid well).
// Colour as everywhere: amber is structure and what you can use, red what bites (the worm, the Tracker, a charge about
// to blow, a dig that missed), steel what protects (a firewall), gold what you're after (a cache, a reading), teal only
// ever you (your room in the chase). One rule line under the title; the rest is on the board.
//
// The markup is always the board as it stands. What just happened plays on top of it (createPuzzleFx, after the
// render): the board drawing in with a boot line, the worm running down a trace into its next node, a firewall going up,
// the cascade's waves with sparks, a ping's ring opening out, a dig, the Tracker's two steps. Motion off or reduced
// motion: none of it, the board just changes.
import { esc } from './view.mjs';
import { PUZZLES, Q, H, P, C, isPuzzle, qTargets, qValue, chaseReach, chaseDanger, trackerTurn, sweepLeft, cellName, dimsOf } from './puzzles.mjs';
import { hereOf, boardOf, puzzleState, refillAt, addrOf, known } from './floorplan.mjs';
import { active } from './combat.mjs';

// The panel's view state (never saved): the stand you closed it on, and the sweep's mode.
export const pzUi = { closed: null, mode: 'ping' };
const n1 = (v) => +v.toFixed(1);
const chip = (x, y, hw, hh, c) => [[x - hw + c, y - hh], [x + hw - c, y - hh], [x + hw, y - hh + c], [x + hw, y + hh - c], [x + hw - c, y + hh], [x - hw + c, y + hh], [x - hw, y + hh - c], [x - hw, y - hh + c]].map(([a, b]) => `${n1(a)},${n1(b)}`).join(' ');
const VARIANT = { twin: { quarantine: 'Two outbreaks', sweep: 'Two caches' }, fast: { quarantine: 'It copies twice' }, noisy: { sweep: 'Noisy cells' } };
const BOOT = { quarantine: (b) => `isolate /dev/seg0 · ${b.starts.length > 1 ? 'two outbreaks' : b.spread > 1 ? 'worm, fast' : 'worm loose'}`, chase: () => 'open /den · tracker inside', cascade: (b) => `mount /rack0 · ${b.b.filter(Boolean).length} charged`, sweep: (b) => `listen /dark0 · ${b.caches.length > 1 ? 'two caches' : 'one cache'}${Object.keys(b.noise).length ? ' · noise' : ''}` };

// ---------- which board, when ----------
// The stand you're on: a step in resets it, so walking out and back opens a closed panel again.
const keyOf = (s, room) => `${s.rooms.visits}:${room.id}:${s.rooms.inSince}`;
// The puzzle room you stand in, when its panel is up: a fresh or live board, or one you finished on this stand (it stays
// up, with how it went, until you close it or walk on).
export function panelRoom(s, ui = pzUi) {
  const R = s.rooms;
  if (!R?.at || active(s) || R.screen) return null;
  const room = hereOf(s);
  if (!room || !isPuzzle(room.kind) || !known(s, room.id)) return null;
  const st = puzzleState(s, room), had = R.puzzles?.[room.id];
  if (st !== 'ready' && st !== 'live' && !(had?.at >= (R.inSince ?? 0))) return null;
  return ui.closed === keyOf(s, room) ? null : room;
}
export const closePanel = (s, ui = pzUi) => { const room = hereOf(s); if (room) ui.closed = keyOf(s, room); };
export const openPanel = (ui = pzUi) => { ui.closed = null; };
// Whether the panel is up (the map's pop-up stands aside for it).
export const panelOn = (s, ui = pzUi) => !!panelRoom(s, ui);

// ---------- the boards ----------
const act = (arg, label, live = true) => (live ? ` data-rooms="play" data-arg="${esc(arg)}" tabindex="0" role="button" aria-label="${esc(label)}"` : '');
// Quarantine: the nodes on a trace grid, the worm red, firewalls steel, ★ data nodes amber, where it goes next marked.
// tall: the grid on its side (a phone's: bigger nodes).
export function quarantineSvg(b, tall = false) {
  const S = 56, PAD = 32, cols = tall ? Q.rows : Q.cols, rows = tall ? Q.cols : Q.rows, W = PAD * 2 + S * (cols - 1), Ht = PAD * 2 + S * (rows - 1);
  const xy = (i) => { const r = Math.floor(i / Q.cols), c = i % Q.cols; return tall ? [PAD + r * S, PAD + c * S] : [PAD + c * S, PAD + r * S]; };
  const next = b.done ? [] : qTargets(b), live = !b.done, cells = b.cells;
  let traces = '', nodes = '', marks = '';
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === Q.DEAD) continue;
    for (const j of [i + 1, i + Q.cols]) {
      if (j >= cells.length || (j === i + 1 && i % Q.cols === Q.cols - 1) || cells[j] === Q.DEAD) continue;
      const [x1, y1] = xy(i), [x2, y2] = xy(j), hot = cells[i] === Q.INF && cells[j] === Q.INF, cut = cells[i] === Q.WALL || cells[j] === Q.WALL;
      const seg = (cls) => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
      traces += seg(`pz-bed${hot ? ' hot' : ''}`) + seg(`pz-trace${hot ? ' hot' : cut ? ' cut' : ''}`);
    }
  }
  cells.forEach((v, i) => {
    const [x, y] = xy(i), data = b.data.includes(i), name = cellName(b, i);
    if (v === Q.DEAD) { nodes += `<g class="pz-n s-dead" data-pz-i="${i}"><polygon class="pz-chip" points="${chip(x, y, 13, 13, 4)}"/></g>`; return; }
    const st = v === Q.INF ? 'inf' : v === Q.WALL ? 'wall' : 'open';
    const can = live && v === Q.OPEN;
    nodes += `<g class="pz-n s-${st}${data ? ' data' : ''}" data-pz-i="${i}"${act(`wall ${i}`, `${name}${data ? ', a data node' : ''}: firewall it`, can)}>`
      + `<rect class="pz-hit" x="${x - S / 2}" y="${y - S / 2}" width="${S}" height="${S}"/><polygon class="pz-chip" points="${chip(x, y, 19, 19, 6)}"/><polygon class="pz-hair" points="${chip(x, y, 15, 15, 4.5)}"/>`;
    if (v === Q.WALL) nodes += `<path class="pz-brick" d="M${x - 10} ${y - 6.5}H${x + 10}M${x - 10} ${y}H${x + 10}M${x - 10} ${y + 6.5}H${x + 10}M${x - 3.5} ${y - 6.5}V${y}M${x + 4} ${y}V${y + 6.5}M${x - 8} ${y - 12}V${y - 6.5}M${x + 6} ${y - 12}V${y - 6.5}"/>`;
    if (data && v !== Q.WALL) nodes += `<path class="pz-star" d="M${x} ${y - 8}l2.3 5 5.5.6-4.1 3.7 1.2 5.4-4.9-2.8-4.9 2.8 1.2-5.4-4.1-3.7 5.5-.6Z"/>`;
    if (v === Q.INF) nodes += `<circle class="pz-core${b.starts.includes(i) ? ' seed' : ''}" cx="${x}" cy="${y}" r="${b.starts.includes(i) ? 6 : 4.5}"/><circle class="pz-halo" cx="${x}" cy="${y}" r="12"/>`;
    nodes += '</g>';
  });
  next.forEach((t, k) => { const [x, y] = xy(t.to); marks += `<g class="pz-next" data-pz-next="${t.to}"><polygon points="${chip(x, y, 25, 25, 8)}"/>${next.length > 1 ? `<text x="${x + 21}" y="${y - 17}">${k + 1}</text>` : ''}</g>`; });
  return `<svg class="pz-svg pz-q ${tall ? 'tall' : 'wide'}" viewBox="0 0 ${W} ${Ht}" data-pz-board data-tall="${tall ? 1 : 0}" role="group" aria-label="Quarantine board"><g class="pz-traces">${traces}</g><g class="pz-nodes">${nodes}</g><g class="pz-marks">${marks}</g><g class="pz-fx"></g></svg>`;
}
const qXY = (i, tall) => { const S = 56, PAD = 32, r = Math.floor(i / Q.cols), c = i % Q.cols; return tall ? [PAD + r * S, PAD + c * S] : [PAD + c * S, PAD + r * S]; };

// The chase: the den's 5×5 rooms, its walls, the door, you (teal) and the Tracker (the map's red skull). Rooms you could
// step into are lit; one where it would catch you is red. Each carries where the Tracker would end up (the hover's
// ghost: createPuzzleFx).
const SKULL = ['..1111111..', '.111111111.', '11111111111', '11...1...11', '11...1...11', '11111111111', '.1111.1111.', '..1111111..', '..1.1.1.1..'];
const skullPath = (px) => { let d = ''; SKULL.forEach((row, j) => [...row].forEach((c, i) => { if (c === '1') d += `M${n1(i * px)} ${n1(j * px)}h${px}v${px}h-${px}z`; })); return d; };
export const chaseGeo = { S: 76, PAD: 30 };
export function chaseSvg(b) {
  const { S, PAD } = chaseGeo, W = PAD * 2 + S * H.cols, Ht = PAD * 2 + S * H.rows;
  const cx = (i) => PAD + (i % H.cols) * S + S / 2, cy = (i) => PAD + Math.floor(i / H.cols) * S + S / 2;
  const reach = b.done ? {} : chaseReach(b);
  let tiles = '', walls = '';
  for (let i = 0; i < H.rows * H.cols; i++) {
    const can = reach[i] != null, danger = can && chaseDanger(b, i), x = cx(i), y = cy(i);
    const t = can && i !== b.exit && i !== b.h ? trackerTurn(b.walls, b.h, i) : null;
    tiles += `<g class="pz-n pz-room${can ? ' reach' : ''}${danger ? ' danger' : ''}" data-pz-i="${i}"${t ? ` data-ghost="${t.path.join(',')}"${t.caught ? ' data-caught="1"' : ''}` : ''}${act(`go ${i}`, `${cellName(b, i)}: move ${reach[i]}${danger ? ' (it catches you there)' : ''}`, can)}>`
      + `<polygon class="pz-chip" points="${chip(x, y, S / 2 - 4, S / 2 - 4, 7)}"/></g>`;
  }
  if (!b.done && b.p !== b.exit) { const t = trackerTurn(b.walls, b.h, b.p); tiles = tiles.replace(`data-pz-i="${b.p}"`, `data-pz-i="${b.p}" data-ghost="${t.path.join(',')}"${t.caught ? ' data-caught="1"' : ''}`); }
  for (const k of b.walls) {
    const [a, c] = k.split('-').map(Number), ax = PAD + (a % H.cols) * S, ay = PAD + Math.floor(a / H.cols) * S;
    const [x1, y1, x2, y2] = c === a + 1 ? [ax + S, ay - 2, ax + S, ay + S + 2] : [ax - 2, ay + S, ax + S + 2, ay + S];
    walls += `<line class="pz-wallglow" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="pz-wall" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; // (a glow of its own: a filter on a straight line has no area)
  }
  // The door: a gap in the frame, its dashes, its word.
  const ex = cx(b.exit), ey = cy(b.exit), half = S / 2, gap = half - 12;
  const [g1, g2, g3, g4] = [[ex - gap, ey - half, ex + gap, ey - half], [ex + half, ey - gap, ex + half, ey + gap], [ex - gap, ey + half, ex + gap, ey + half], [ex - half, ey - gap, ex - half, ey + gap]][b.exitSide];
  const door = `<polygon class="pz-doorway" points="${chip(ex, ey, half - 9, half - 9, 5)}"/><line class="pz-gap" x1="${g1}" y1="${g2}" x2="${g3}" y2="${g4}"/><line class="pz-door" x1="${g1}" y1="${g2}" x2="${g3}" y2="${g4}"/><text class="pz-doorword" x="${ex}" y="${ey + 4}" text-anchor="middle">DOOR</text>`;
  const you = `<g class="pz-you" id="pz-you" data-pos="${b.p}"><circle class="ring" cx="${cx(b.p)}" cy="${cy(b.p)}" r="29"/><polygon class="body" points="${chip(cx(b.p), cy(b.p), 22, 16, 5)}"/><text x="${cx(b.p)}" y="${cy(b.p) + 4.5}" text-anchor="middle">YOU</text></g>`;
  const px = 2.6, trk = `<g class="pz-trk${b.done === 'lost' ? ' caught' : ''}" id="pz-trk" data-pos="${b.h}"><g transform="translate(${n1(cx(b.h) - 5.5 * px)} ${n1(cy(b.h) - 4.5 * px)})"><rect class="bg" x="-5" y="-5" width="${n1(11 * px + 10)}" height="${n1(9 * px + 10)}" rx="2"/><path class="px" d="${skullPath(px)}"/></g></g>`;
  const last = b.last?.path && b.last.path.length > 1 && !b.done ? `<polyline class="pz-trail" points="${b.last.path.map((i) => `${cx(i)},${cy(i)}`).join(' ')}"/>` : '';
  return `<svg class="pz-svg pz-h" viewBox="0 0 ${W} ${Ht}" data-pz-board role="group" aria-label="The den"><rect class="pz-frame" x="${PAD}" y="${PAD}" width="${S * H.cols}" height="${S * H.rows}"/><g class="pz-nodes">${tiles}</g>${door}<g class="pz-walls">${walls}</g>${last}<g class="pz-ghost"></g>${b.done === 'won' ? '' : trk}${you}<g class="pz-fx"></g></svg>`;
}
export const chaseXY = (i) => { const { S, PAD } = chaseGeo; return [PAD + (i % H.cols) * S + S / 2, PAD + Math.floor(i / H.cols) * S + S / 2]; };

// The cascade: the rack's slots, each node's charge as its number and three pips (3, about to go, red).
export const cascadeGeo = { S: 80, PAD: 40 };
export function cascadeNodes(board, live = true, done = false) {
  const { S, PAD } = cascadeGeo, xy = (i) => [PAD + (i % C.cols) * S, PAD + Math.floor(i / C.cols) * S];
  let traces = '', nodes = '';
  for (let i = 0; i < board.length; i++) {
    if (!board[i]) continue;
    for (const j of [i + 1, i + C.cols]) {
      if (j >= board.length || (j === i + 1 && i % C.cols === C.cols - 1) || !board[j]) continue;
      const [x1, y1] = xy(i), [x2, y2] = xy(j);
      traces += `<line class="pz-bed" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="pz-trace" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }
  }
  for (let i = 0; i < board.length; i++) {
    const [x, y] = xy(i), v = board[i];
    if (!v) { nodes += `<g class="pz-n s-empty" data-pz-i="${i}"><rect class="pz-slot" x="${x - 9}" y="${y - 4}" width="18" height="8" rx="1.5"/></g>`; continue; }
    nodes += `<g class="pz-n v${v}" data-pz-i="${i}"${act(`tap ${i}`, `Charge ${v}: discharge it`, live && !done)}><rect class="pz-hit" x="${x - S / 2}" y="${y - S / 2}" width="${S}" height="${S}"/><polygon class="pz-chip" points="${chip(x, y, 27, 27, 8)}"/><polygon class="pz-hair" points="${chip(x, y, 22, 22, 6)}"/>`
      + `<text class="pz-num" x="${x}" y="${y + 5}" text-anchor="middle">${v}</text>`
      + [0, 1, 2].map((k) => `<rect class="pz-pip${k < v ? ' on' : ''}" x="${x - 14 + k * 10}" y="${y + 13}" width="8" height="4" rx="1"/>`).join('') + '</g>';
  }
  return `<g class="pz-traces">${traces}</g><g class="pz-nodes">${nodes}</g>`;
}
export const cascadeXY = (i) => { const { S, PAD } = cascadeGeo; return [PAD + (i % C.cols) * S, PAD + Math.floor(i / C.cols) * S]; };
export function cascadeSvg(b) {
  const { S, PAD } = cascadeGeo, W = PAD * 2 + S * (C.cols - 1);
  return `<svg class="pz-svg pz-c" viewBox="0 0 ${W} ${W}" data-pz-board role="group" aria-label="The rack"><g class="pz-rack">${cascadeNodes(b.b, true, !!b.done)}</g><g class="pz-fx"></g></svg>`;
}

// The sweep: a dark 7×7 room. A ping's reading in gold on its cell, the ring of cells at that distance faint; a dig
// that missed, a red cross; a cache, gold. A noisy cell wears static.
export const sweepGeo = { S: 62, PAD: 10 };
export function sweepSvg(b, mode = 'ping') {
  const { S, PAD } = sweepGeo, W = PAD * 2 + S * P.cols, live = !b.done;
  const x0 = (i) => PAD + (i % P.cols) * S, y0 = (i) => PAD + Math.floor(i / P.cols) * S, dist = (a, c) => Math.abs(Math.floor(a / P.cols) - Math.floor(c / P.cols)) + Math.abs((a % P.cols) - (c % P.cols));
  const lastPing = [...b.pings].reverse()[0]?.at;
  let cells = '', rings = '', top = '';
  for (let i = 0; i < P.rows * P.cols; i++) {
    const pinged = b.pings.some((p) => p.at === i), dug = b.digs.includes(i), can = live && !dug && !(mode === 'ping' && pinged);
    cells += `<g class="pz-n pz-cell${i in b.noise ? ' noisy' : ''}" data-pz-i="${i}"${act(`${mode} ${i}`, `${cellName(b, i)}: ${mode}`, can)}><rect class="pz-chip" x="${x0(i) + 3}" y="${y0(i) + 3}" width="${S - 6}" height="${S - 6}" rx="3"/>`
      + (i in b.noise ? `<path class="pz-static" d="M${x0(i) + 14} ${y0(i) + 20}h6M${x0(i) + 30} ${y0(i) + 16}h9M${x0(i) + 20} ${y0(i) + 31}h12M${x0(i) + 12} ${y0(i) + 43}h7M${x0(i) + 34} ${y0(i) + 45}h10"/>` : '') + '</g>';
  }
  // Each ping's ring: every cell at its reading (a noisy one's: one either side), faintly; where rings cross is where to dig.
  for (const p of b.pings) {
    const ds = p.at in b.noise ? [p.read - 1, p.read + 1] : [p.read];
    for (let i = 0; i < P.rows * P.cols; i++) if (i !== p.at && ds.includes(dist(p.at, i))) rings += `<rect class="pz-ring${p.at === lastPing ? ' last' : ''}" data-ring-of="${p.at}" data-d="${dist(p.at, i)}" x="${x0(i) + 3}" y="${y0(i) + 3}" width="${S - 6}" height="${S - 6}" rx="3"/>`;
  }
  for (const p of b.pings) top += `<g class="pz-ping" data-pz-ping="${p.at}"><rect x="${x0(p.at) + 6}" y="${y0(p.at) + 6}" width="${S - 12}" height="${S - 12}" rx="3"/><text x="${x0(p.at) + S / 2}" y="${y0(p.at) + S / 2 + 8}" text-anchor="middle">${p.read}</text></g>`;
  for (const d of b.digs) {
    const cx = x0(d) + S / 2, cy = y0(d) + S / 2;
    if (b.found.includes(d)) top += `<g class="pz-cache" data-pz-dig="${d}"><rect class="glow" x="${cx - 19}" y="${cy - 14}" width="38" height="28" rx="2"/><path d="M${cx - 15} ${cy - 5}h30v14h-30Z M${cx - 16} ${cy - 11}h32v6h-32Z M${cx - 4} ${cy + 1}h8"/></g>`;
    else top += `<g class="pz-dug" data-pz-dig="${d}"><rect x="${x0(d) + 6}" y="${y0(d) + 6}" width="${S - 12}" height="${S - 12}" rx="3"/><path d="M${cx - 9} ${cy - 9}L${cx + 9} ${cy + 9}M${cx + 9} ${cy - 9}L${cx - 9} ${cy + 9}"/></g>`;
  }
  // Out of budget: where it was.
  if (b.done === 'lost') for (const c of b.caches.filter((x) => !b.found.includes(x))) { const cx = x0(c) + S / 2, cy = y0(c) + S / 2; top += `<g class="pz-cache missed"><path d="M${cx - 15} ${cy - 5}h30v14h-30Z M${cx - 16} ${cy - 11}h32v6h-32Z"/></g>`; }
  return `<svg class="pz-svg pz-p" viewBox="0 0 ${W} ${W}" data-pz-board role="group" aria-label="The dark room"><g class="pz-nodes">${cells}</g><g class="pz-rings">${rings}</g><g class="pz-top">${top}</g><g class="pz-fx"></g></svg>`;
}
export const sweepXY = (i) => { const { S, PAD } = sweepGeo; return [PAD + (i % P.cols) * S + S / 2, PAD + Math.floor(i / P.cols) * S + S / 2]; };

// ---------- the panel ----------
const pips = (n, on, cls = '') => `<span class="pz-pips${cls ? ' ' + cls : ''}" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<i class="${k < on ? 'on' : ''}"></i>`).join('')}</span>`;
const stat = (label, value, cls = '', tip = '') => `<span class="pz-stat${cls ? ' ' + cls : ''}"${tip ? ` title="${esc(tip)}"` : ''}><span class="lbl">${esc(label)}</span><b>${value}</b></span>`;
const btn = (verb, label, { arg = null, disabled = false, tip = '', cls = '' } = {}) => `<button type="button" class="btn small${cls ? ' ' + cls : ''}" data-rooms="${verb}"${arg != null ? ` data-arg="${esc(arg)}"` : ''}${disabled ? ' disabled' : ''}${tip ? ` title="${esc(tip)}"` : ''}>${esc(label)}</button>`;
function statsOf(b, ui) {
  if (b.kind === 'quarantine') {
    const saved = qValue(b), f = saved / Math.max(1, b.total);
    return stat('Turn', b.turn) + `<span class="pz-stat pz-safe${f < Q.win ? ' low' : ''}" title="${esc(`Safe: every node it never reaches pays, a data node three. Half or more and it's contained.`)}"><span class="lbl">Safe</span><span class="pz-bar"><span style="width:${(f * 100).toFixed(1)}%"></span><i style="left:${Q.win * 100}%"></i></span><b>${saved}<small>/${b.total}</small></b></span>` + stat('Firewalls', b.walls, 'steel');
  }
  if (b.kind === 'chase') {
    const live = !b.done;
    return stat('Moves', b.moves) + stat('Fewest', b.best, 'dim', 'The fewest moves this den can be crossed in.')
      + `<span class="pz-ctrls">${btn('play', 'Wait', { arg: 'wait', disabled: !live, tip: 'Wait (space): stay put; the Tracker still steps.' })}${btn('play', 'Undo', { arg: 'undo', disabled: !live || !b.hist.length, tip: 'Undo your last move.' })}${btn('play', 'Restart', { arg: 'restart', disabled: !live || !b.hist.length })}</span>`;
  }
  if (b.kind === 'cascade') return `<span class="pz-stat" title="Taps: clear the rack within these."><span class="lbl">Taps</span>${pips(b.taps, b.taps - b.used, b.taps - b.used <= 1 && !b.done ? 'hot' : '')}<b>${b.taps - b.used}</b></span>` + stat('Nodes', b.b.filter(Boolean).length) + stat('Fewest', b.best, 'dim');
  if (b.kind === 'sweep') {
    const left = sweepLeft(b), live = !b.done;
    const seg = `<span class="pz-seg" role="group" aria-label="Ping or dig">${['ping', 'dig'].map((m) => `<button type="button" class="btn small${ui.mode === m ? ' on' : ''}" data-pz-mode="${m}" aria-pressed="${ui.mode === m}"${live ? '' : ' disabled'} title="${m === 'ping' ? 'Ping: reads the steps to the cache.' : 'Dig: digs the cell.'}">${m === 'ping' ? 'Ping' : 'Dig'}</button>`).join('')}</span>`;
    return seg + `<span class="pz-stat" title="Pings and digs share the budget."><span class="lbl">Budget</span>${pips(b.budget, left, left <= 1 && live ? 'hot' : '')}<b>${left}</b></span>` + (b.caches.length > 1 ? stat('Found', `${b.found.length}/${b.caches.length}`) : '');
  }
  return '';
}
const clock = (at) => `<span class="fp-clock" data-at="${at}"></span>`;
function resultOf(s, room, b) {
  if (!b.done) return b.kind === 'chase' ? '<p class="pz-keys"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> move · <kbd>space</kbd> wait</p>' : '';
  const won = b.done === 'won', head = { quarantine: won ? 'Contained' : 'Overrun', cascade: won ? 'Rack down' : 'Out of taps', sweep: won ? 'Cache found' : 'Out of budget', chase: won ? 'Through the door' : 'Caught' }[b.kind];
  const at = refillAt(s, room);
  return `<div class="pz-result ${won ? 'win' : 'lose'}" role="status"><b>${esc(head)}</b>${at ? `<span>Fresh board ↻ ${clock(at)}</span>` : ''}<button type="button" class="btn small" data-pz-close>Close</button></div>`;
}
// The panel over the map: the room's address and kind, its title, its one rule, the board, its numbers and verbs.
export function puzzlePanel(s, ui = pzUi) {
  const room = panelRoom(s, ui);
  if (!room) return '';
  const b = boardOf(s, room), M = PUZZLES[room.kind], v = VARIANT[b.variant]?.[room.kind];
  const board = b.kind === 'quarantine' ? quarantineSvg(b, false) + quarantineSvg(b, true) : b.kind === 'chase' ? chaseSvg(b) : b.kind === 'cascade' ? cascadeSvg(b) : sweepSvg(b, ui.mode);
  const [rows, cols] = dimsOf(b);
  return `<div class="pz-panel k-${b.kind}${b.done ? ` done ${b.done}` : ''}" id="pz-panel" data-pz-key="${esc(keyOf(s, room))}:${s.rooms.puzzles?.[room.id]?.n ?? 0}" data-pz-kind="${b.kind}" role="dialog" aria-label="${esc(`${M.name}: ${M.title}`)}">
    <section class="pz-card"><i class="sp-corner tl"></i><i class="sp-corner tr"></i><i class="sp-corner bl"></i><i class="sp-corner br"></i>
      <header class="pz-head"><p class="pz-kick"><span class="pz-at">${esc(addrOf(s, room.id))}</span> · ${esc(M.name)}${v ? ` · <span class="pz-var">${esc(v)}</span>` : ''}</p><h1>${esc(M.title)}</h1><p class="pz-rule">${esc(M.rule)}</p>
        <button type="button" class="btn small pz-x" data-pz-close title="Close (Esc). Walk out and back, or Play on its card, to come back to it." aria-label="Close">×</button></header>
      <p class="pz-boot ok" aria-hidden="true" data-boot="${esc(`> ${BOOT[b.kind](b)} · ${cols}×${rows}`)}">${esc(`> ${BOOT[b.kind](b)} · ${cols}×${rows}`)}</p>
      <div class="pz-stats">${statsOf(b, ui)}</div>
      <div class="pz-well">${board}</div>
      ${resultOf(s, room, b)}
    </section></div>`;
}

// ---------- what just happened, played over the board ----------
// app.js: fx.move(event) after a move renders, fx.mounted() after every render (the board drawing in when a panel first
// opens, the chase's hover ghost). sound(sign, delay): the feel layer's signs.
export function createPuzzleFx({ canMove = () => true, sound = () => {} } = {}) {
  let lastKey = null, busy = 0;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const x = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) x.setAttribute(k, v); parent?.appendChild(x); return x; };
  const panel = () => document.getElementById('pz-panel');
  const boards = () => [...(panel()?.querySelectorAll('[data-pz-board]') || [])].filter((x) => x.getBoundingClientRect().width > 0);
  const anim = (node, frames, opts) => { try { return node.animate(frames, { fill: 'both', easing: 'ease-out', ...opts }); } catch { return null; } };
  const hold = (ms) => { const p = panel(); if (!p) return; p.classList.add('pz-busy'); clearTimeout(busy); busy = setTimeout(() => panel()?.classList.remove('pz-busy'), ms); };
  // A burst ring and a few sparks off a point, in a colour class.
  function burst(fx, x, y, cls, { r = 26, sparks = 6, delay = 0 } = {}) {
    const ring = el('circle', { cx: x, cy: y, r, class: `pz-burst ${cls}` }, fx);
    anim(ring, [{ opacity: 0.95, transform: 'scale(0.5)' }, { opacity: 0, transform: 'scale(1.7)' }], { duration: 460, delay });
    for (let k = 0; k < sparks; k++) {
      const a = (k / sparks) * Math.PI * 2 + 0.4, d = r + 10 + (k % 2) * 8;
      const sp = el('line', { x1: x, y1: y, x2: n1(x + Math.cos(a) * 7), y2: n1(y + Math.sin(a) * 7), class: `pz-spark ${cls}` }, fx);
      anim(sp, [{ opacity: 1, transform: 'translate(0,0)' }, { opacity: 0, transform: `translate(${n1(Math.cos(a) * d)}px,${n1(Math.sin(a) * d)}px)` }], { duration: 420, delay });
    }
    setTimeout(() => { ring.remove(); fx.querySelectorAll('.pz-spark').forEach((x) => x.remove()); }, 520 + delay);
  }
  const node = (svg, i) => svg.querySelector(`[data-pz-i="${i}"]`);
  // The board drawing in: the boot line types, the traces and nodes come up from the middle out.
  function enter(p) {
    const boot = p.querySelector('.pz-boot');
    if (boot) { const text = boot.dataset.boot; let n = 0; boot.textContent = ''; boot.classList.remove('ok'); const step = () => { if (!boot.isConnected) return; boot.textContent = text.slice(0, n += 2); if (n < text.length) setTimeout(step, 18); else boot.classList.add('ok'); }; step(); }
    for (const svg of boards()) {
      const vb = svg.viewBox.baseVal, mx = vb.width / 2, my = vb.height / 2;
      for (const t of svg.querySelectorAll('.pz-traces, .pz-walls, .pz-frame')) anim(t, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 120 });
      for (const g of svg.querySelectorAll('[data-pz-i]')) {
        const box = g.getBBox(), d = Math.hypot(box.x + box.width / 2 - mx, box.y + box.height / 2 - my);
        anim(g, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320, delay: 80 + d * 1.1 });
      }
      for (const m of svg.querySelectorAll('.pz-next, #pz-you, #pz-trk, .pz-top > *')) anim(m, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 520 });
    }
    hold(700);
  }
  // The chase's ghost: hovering (or focusing) a room you could step into draws where the Tracker would end up.
  function ghost(target) {
    const svg = target?.closest?.('.pz-h'), g = svg?.querySelector('.pz-ghost');
    if (!g) return;
    g.innerHTML = '';
    const path = target.dataset.ghost?.split(',').map(Number);
    if (!path) return;
    const pts = path.map((i) => chaseXY(i).join(',')).join(' '), [x, y] = chaseXY(path[path.length - 1]);
    el('polyline', { points: pts, class: 'pz-ghostpath' }, g);
    el('polygon', { points: chip(x, y, 19, 19, 5), class: `pz-ghostbox${target.dataset.caught ? ' caught' : ''}` }, g);
  }
  document.addEventListener('pointerover', (e) => { const t = e.target.closest?.('.pz-h [data-pz-i]'); if (t) ghost(t); });
  document.addEventListener('pointerout', (e) => { const t = e.target.closest?.('.pz-h [data-pz-i]'); if (t && !t.contains(e.relatedTarget)) { const g = t.closest('.pz-h')?.querySelector('.pz-ghost'); if (g) g.innerHTML = ''; } });
  document.addEventListener('focusin', (e) => { const t = e.target.closest?.('.pz-h [data-pz-i]'); if (t) ghost(t); });

  return {
    // After every render: a panel that wasn't up (or a new board) draws in.
    mounted() {
      const p = panel(), key = p?.dataset.pzKey || null;
      if (key && key !== lastKey && canMove()) enter(p);
      lastKey = key;
    },
    // A move on the board (the 'puzzle' event), after it renders.
    move(e) {
      const did = e.last, kind = e.kind;
      if (!did) return 0;
      if (kind === 'quarantine') {
        sound('pzwall', 0);
        did.spread.forEach((_, k) => sound('pzspread', 300 + k * 340));
      } else if (kind === 'cascade') did.frames.forEach((f, k) => sound('pzzap', k * 190));
      else if (kind === 'sweep') sound(did.mode === 'ping' ? 'pzping' : 'pzdig', 0);
      else if (kind === 'chase' && did.path) did.path.slice(1).forEach((_, k) => sound('pzstep', 200 + k * 210));
      if (!canMove()) return 0;
      let total = 0;
      for (const svg of boards()) {
        const fx = svg.querySelector('.pz-fx');
        if (kind === 'quarantine') {
          const tall = svg.dataset.tall === '1', w = node(svg, did.wall);
          if (w) { anim(w, [{ transform: 'scale(1.25)', filter: 'brightness(2)' }, { transform: 'scale(1)', filter: 'none' }], { duration: 380 }); const [x, y] = qXY(did.wall, tall); burst(fx, x, y, 'steel', { r: 22, sparks: 4 }); }
          const marks = svg.querySelectorAll('.pz-next');
          marks.forEach((m) => anim(m, [{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }], { duration: 300 + did.spread.length * 340 + 200 }));
          did.spread.forEach((sp, k) => {
            const delay = 220 + k * 340, [x1, y1] = qXY(sp.from, tall), [x2, y2] = qXY(sp.to, tall), n = node(svg, sp.to);
            const dot = el('circle', { cx: x1, cy: y1, r: 5, class: 'pz-runner' }, fx);
            anim(dot, [{ opacity: 0, transform: 'translate(0,0)' }, { opacity: 1, offset: 0.15 }, { opacity: 1, transform: `translate(${x2 - x1}px,${y2 - y1}px)` }], { duration: 280, delay, easing: 'ease-in' });
            setTimeout(() => dot.remove(), delay + 320);
            for (const part of n?.querySelectorAll('.pz-core, .pz-halo') || []) anim(part, [{ opacity: 0 }, { opacity: 0, offset: 0.99 }, { opacity: 1 }], { duration: delay + 280 });
            if (n) anim(n.querySelector('.pz-chip'), [{ fill: '#140d06', stroke: '#6a5224' }, { fill: '#140d06', stroke: '#6a5224', offset: 0.99 }, { fill: '#3a120a', stroke: '#ff5b3d' }], { duration: delay + 280 });
            burst(fx, x2, y2, 'hot', { r: 20, sparks: 5, delay: delay + 260 });
            total = Math.max(total, delay + 600);
          });
        } else if (kind === 'cascade') {
          const rack = svg.querySelector('.pz-rack'), final = rack.innerHTML;
          did.frames.forEach((f, k) => {
            setTimeout(() => {
              if (!rack.isConnected) return;
              rack.innerHTML = cascadeNodes(f.board, false);
              for (const i of f.wave) { const [x, y] = cascadeXY(i); burst(fx, x, y, k ? 'hot' : 'amber', { r: 30, sparks: 7 }); }
            }, k * 190);
          });
          setTimeout(() => { if (rack.isConnected) rack.innerHTML = final; }, did.frames.length * 190 + 60);
          total = did.frames.length * 190 + 120;
        } else if (kind === 'sweep') {
          const [x, y] = sweepXY(did.at);
          if (did.mode === 'ping') {
            const S = sweepGeo.S, d = Math.max(0.6, did.read), ring = el('polygon', { points: `${x},${y - S} ${x + S},${y} ${x},${y + S} ${x - S},${y}`, class: 'pz-wave' }, fx);
            ring.style.transformOrigin = `${x}px ${y}px`;
            anim(ring, [{ opacity: 0.9, transform: 'scale(0.1)' }, { opacity: 0, transform: `scale(${d + 0.5})` }], { duration: 300 + d * 90, easing: 'ease-out' });
            setTimeout(() => ring.remove(), 420 + d * 90);
            for (const r of svg.querySelectorAll(`.pz-ring[data-ring-of="${did.at}"]`)) anim(r, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 80 + Number(r.dataset.d) * 80 });
            const p = svg.querySelector(`[data-pz-ping="${did.at}"]`);
            if (p) anim(p, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260 });
            total = 360 + d * 90;
          } else {
            const c = node(svg, did.at), mark = svg.querySelector(`[data-pz-dig="${did.at}"]`);
            if (c) anim(c, [{ transform: 'translate(0,0)' }, { transform: 'translate(-3px,1px)' }, { transform: 'translate(3px,-1px)' }, { transform: 'translate(-2px,0)' }, { transform: 'translate(0,0)' }], { duration: 260 });
            if (mark) anim(mark, [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1.15)', offset: 0.7 }, { opacity: 1, transform: 'scale(1)' }], { duration: 360, delay: 220 });
            burst(fx, x, y, did.hit ? 'gold' : 'hot', { r: did.hit ? 30 : 18, sparks: did.hit ? 8 : 3, delay: 240 });
            total = 620;
          }
        } else if (kind === 'chase' && (did.path || did.from != null)) {
          const you = svg.querySelector('#pz-you'), trk = svg.querySelector('#pz-trk');
          if (you && did.from != null) { const [fx0, fy0] = chaseXY(did.from), [x, y] = chaseXY(Number(you.dataset.pos)); anim(you, [{ transform: `translate(${fx0 - x}px,${fy0 - y}px)` }, { transform: 'translate(0,0)' }], { duration: 170, easing: 'ease-in-out' }); }
          if (trk && did.path?.length > 1) {
            const end = chaseXY(Number(trk.dataset.pos)), off = (i) => { const [x, y] = chaseXY(i); return `translate(${x - end[0]}px,${y - end[1]}px)`; };
            anim(trk, [{ transform: off(did.path[0]) }, { transform: off(did.path[0]), offset: 0.3 }, { transform: off(did.path[1]), offset: 0.62 }, { transform: off(did.path[did.path.length - 1]) }], { duration: 620, easing: 'linear' });
            if (did.caught) { const [x, y] = end; burst(svg.querySelector('.pz-fx'), x, y, 'hot', { r: 34, sparks: 8, delay: 600 }); }
          }
          total = 680;
        }
      }
      if (total) hold(total);
      return total;
    },
  };
}

// Rig → House (house.mjs): the cutaway and the furniture picker. Pure functions of state and the page's ui
// ({ held: a piece in hand, hover: { floor, x } where it would go }); app.js does the clicks.
// The structure is drawn dim, a <pre> a floor; each piece is its own <pre> over it, placed in ch and lines.
import { FURNITURE, FURNITURE_IDS } from './content/furniture.mjs';
import { W, H, YW, LADDER, WINDOW, SHACK, floorById, floorsOpen, nextFloor, placedOf, owns, ownedIds, boxOf, fits, sourceOf } from './house.mjs';
import { achById } from './achievements.mjs';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const FENCE = 2; // the lot's chain-link fence, west of it
export const M = FENCE + YW, MR = 10; // west of the walls: the fence and the lot; east: the pavement and its lamp
const TW = M + W + 2 + MR;
const IN = M + 1; // the first column inside the walls

const grid = (rows) => Array.from({ length: rows }, () => Array(TW).fill(' '));
const put = (g, r, c, str) => { for (let i = 0; i < str.length; i++) if (str[i] !== ' ' && c + i >= 0 && c + i < TW) g[r][c + i] = str[i]; };
const text = (g) => g.map((r) => r.join('').replace(/\s+$/, '')).join('\n');

// The roof over the top floor: an antenna and a dish, a hatch for the ladder. On the Shack, the roof is the shack's.
function roofLines(shack) {
  const g = grid(3), end = shack ? IN + SHACK : IN + W;
  for (let c = M; c <= end; c++) g[2][c] = '_';
  put(g, 0, IN + 2, '\\|/'); put(g, 1, IN + 3, '|'); put(g, 2, IN + 3, '|');
  put(g, 0, IN + 16, ' __ '); put(g, 1, IN + 16, '(__)'); put(g, 2, IN + 17, '||');
  if (!shack) put(g, 2, IN + LADDER.x, '[_]');
  return text(g);
}
// A floor's walls, its window, the ladder, what hangs from its ceiling and the slab under it.
function floorLines(id, lowest) {
  const f = floorById(id), g = grid(H + 1);
  for (let r = 0; r < H; r++) {
    g[r][M] = '|';
    if (id !== 'shack') g[r][IN + W] = '|';
    else if (r >= 3) g[r][IN + W] = '|';
    if (id === 'shack') g[r][IN + SHACK] = '|';
    if (id !== 'shack' || r >= H - 2) put(g, r, IN + LADDER.x, '|-|');
  }
  if (id === 'shack') g[2][IN + W] = '.';
  if (f.above) { put(g, WINDOW.y, IN + WINDOW.x, '.------.'); put(g, WINDOW.y + 1, IN + WINDOW.x, '|  ||  |'); put(g, WINDOW.y + 2, IN + WINDOW.x, "'------'"); }
  if (id === 'cellar') put(g, 0, IN + 12, 'o==============o');
  if (id === 'bunker') { put(g, 0, IN + 10, '\\_/'); put(g, 0, IN + 26, '\\_/'); }
  if (id === 'subnet') for (let i = 0; i < 4; i++) put(g, 0, IN + 8 + i * 6, '[: :]');
  for (let c = M; c <= IN + W; c++) g[H][c] = '=';
  if (!lowest) g[H].splice(IN + LADDER.x, 3, '|', ' ', '|'); // the ladder's hole down
  if (id === 'street') {
    put(g, H, 0, '.:'.repeat(M).slice(0, M)); // the lot's gravel
    put(g, 1, 0, '.'); for (let r = 2; r < H; r++) put(g, r, 0, r % 2 ? '|/' : '|\\'); // its fence
    put(g, H, IN + W + 1, '_'.repeat(MR)); // the pavement, and a street lamp on it
    const lx = IN + W + 5; put(g, 0, lx - 1, '.-.'); put(g, 1, lx - 1, "'-'"); for (let r = 2; r < H; r++) put(g, r, lx, '|'); put(g, H - 1, lx - 1, '_|_');
  }
  return text(g);
}

const tipOf = (s, id) => `${FURNITURE[id].name}: ${FURNITURE[id].flavour}\n▸ ${sourceOf(s, id)}`;
const kindOf = (id) => (FURNITURE[id].wall ? 'Furniture, wall' : FURNITURE[id].yard ? 'Furniture, yard' : 'Furniture');
const art = (id) => esc(FURNITURE[id].art.join('\n'));
const at = (b) => `--x:${b.x};--y:${b.y}`;

function pieceMarkup(s, id, x, held) {
  return `<pre class="hs-piece${held ? ' held' : ''}" data-hs-piece="${id}" style="${at(boxOf(id, x))}" title="${esc(tipOf(s, id))}" data-tt-kind="${kindOf(id)}">${art(id)}</pre>`;
}
// Where pieces go on a floor (or the lot): its pieces, and the one in hand where it would land.
function spotMarkup(s, id, left, width, ui) {
  const here = Object.entries(placedOf(s)).filter(([p, [f]]) => f === id && FURNITURE[p]);
  const pieces = here.map(([p, [, x]]) => pieceMarkup(s, p, x, ui.held === p)).join('');
  const h = ui.held && ui.hover?.floor === id ? ui.hover : null;
  const ghost = h ? `<pre class="hs-piece hs-ghost${fits(s, ui.held, id, h.x) ? '' : ' no'}" style="${at(boxOf(ui.held, h.x))}" aria-hidden="true">${art(ui.held)}</pre>` : '';
  return `<div class="hs-in${ui.held ? ' hs-aim' : ''}" data-hs-floor="${id}" style="left:${left}ch;width:${width}ch" aria-label="${esc(floorById(id).name)}">${pieces}${ghost}</div>`;
}
function floorMarkup(s, id, lowest, ui) {
  const yard = id === 'street' ? spotMarkup(s, 'west', FENCE, YW, ui) : '';
  return `<div class="hs-floor" data-floor="${id}"><pre class="hs-shell" aria-hidden="true">${esc(floorLines(id, lowest))}</pre>${spotMarkup(s, id, IN, W, ui)}${yard}</div>`;
}
const nextMarkup = (f) => `<div class="hs-next" style="margin-left:${M}ch;width:${W + 2}ch" title="${esc(`???: \n▸ Earn ${f.at.toLocaleString('en-US')} achievement points.`)}" data-tt-kind="Floor"></div>`;

// The cutaway, top to bottom: the Shack (or the bare roof), the Loft, the street floor, then underground. The next
// floor to open shows as a dotted outline where it will go.
export function houseMarkup(s, ui = {}) {
  const open = new Set(floorsOpen(s).map((f) => f.id)), next = nextFloor(s);
  const below = ['cellar', 'bunker', 'subnet'].filter((id) => open.has(id)), lowest = below.at(-1) || 'street';
  const out = [];
  if (next?.id === 'shack') out.push(nextMarkup(next));
  out.push(`<pre class="hs-shell hs-roof" aria-hidden="true">${esc(roofLines(open.has('shack')))}</pre>`);
  if (open.has('shack')) out.push(floorMarkup(s, 'shack', false, ui));
  if (open.has('loft')) out.push(floorMarkup(s, 'loft', false, ui));
  else if (next?.id === 'loft') out.push(nextMarkup(next));
  out.push(floorMarkup(s, 'street', lowest === 'street', ui));
  for (const id of ['cellar', 'bunker', 'subnet']) {
    if (open.has(id)) out.push(floorMarkup(s, id, lowest === id, ui));
    else if (next?.id === id) out.push(nextMarkup(next));
  }
  return `<div class="hs-house" style="width:${TW}ch">${out.join('')}</div>`;
}

// The picker: a tile a piece. Yours by name (muted once out); the rest as solid blocks, ???, and what brings them.
const blocks = (id) => esc(FURNITURE[id].art.map((l) => l.replace(/[^ ]/g, '█')).join('\n'));
function tileMarkup(s, id, ui) {
  if (owns(s, id)) {
    const out = !!placedOf(s)[id];
    return `<button type="button" class="hs-tile${out ? ' out' : ''}" data-hs-pick="${id}" aria-pressed="${ui.held === id}" title="${esc(tipOf(s, id))}" data-tt-kind="${kindOf(id)}"><pre class="hs-mini" aria-hidden="true">${art(id)}</pre><span class="hs-name">${esc(FURNITURE[id].name)}</span></button>`;
  }
  const a = achById(FURNITURE[id].from), line = a?.hidden ? a.hint : a?.rule || '';
  return `<span class="hs-tile locked" title="${esc(`???: \n▸ ${sourceOf(s, id)}`)}" data-tt-kind="${kindOf(id)}"><pre class="hs-mini" aria-hidden="true">${blocks(id)}</pre><span class="hs-name">???</span><small>${esc(line)}</small></span>`;
}
export function housePageMarkup(s, ui = {}) {
  const tiles = FURNITURE_IDS.map((id) => tileMarkup(s, id, ui)).join('');
  return `<div class="hs-page"><section class="card hs-card"><div class="hs-scroll">${houseMarkup(s, ui)}</div></section>
    <section class="card hs-pick"><h2>Furniture <small class="hs-count">${ownedIds(s).length}/${FURNITURE_IDS.length}</small></h2><div class="hs-tiles">${tiles}</div></section></div>`;
}

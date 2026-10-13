// The rooms page (floorplan.mjs, docs/servers.md R0): a strip of the server across the top, the room map as a
// drawing, and beside it the room you're in (or home) with its verbs and its exits, and a short tty under it.
// docs/ui.md tokens: amber is structure and what you can click, teal is you, hot is what bites (a live virus, the
// hunter), gray is down or out of sight. The map is the main screen; the prompt still takes every verb.
//
// A tile says what a room is by its icon and shape (a chip for a process, a cut-corner chip for an elite, a shield
// plate for a guard post, a double frame for the Core, a pill for the rest room, a dot for a junction) and its
// colour by role (a fight hot, an interactable amber, the rest room teal). Its state is one language of marks:
//   ring          teal: you are here. Dashed hot: the hunter steps in next. An amber border: you can walk in.
//   top centre    the hunter's token (hot), or YOU.
//   top right     one badge: a key, a lock, an open lock, ★ (rare spawn), or an eye (walking in wakes the Tracker).
//   top left      ✓: cleared at least once (progress).
//   bottom        ↻ and its countdown on the left (a fight down, a cache empty); the Signal a first step costs on
//                 the right.
// Countdowns are empty <… data-at> slots that fillClocks writes every second (app.js), so the markup only changes
// when the server does and a hovered tile keeps its tooltip.
import { esc } from './view.mjs';
import { GUARDS, BOSSES } from './data.mjs';
import { itemLabel, statLine } from './gear.mjs';
import { stashItem, active, classOf } from './combat.mjs';
import { AUTHORS } from './authors.mjs';
import { SCRIPTS, TIER, scriptsOf, slotsOf, scriptTip } from './scripts.mjs';
import { BOSS_RULES } from './interrupt.mjs';
import { familyName, setName } from './families.mjs';
import { ROOMS, KINDS, HUNTERS, RESIDENT, roomList, hereOf, neighbours, linksOf, seenOf, isUp, backAt, cacheFull, refillAt, isBait, coreOpen, signalNow, progressOf, fmtLeft, hunterOf, hunterNext, paceOf, moveCost, fightOf, exits, hunterLine, xpEarned } from './floorplan.mjs';

export const fpUi = { log: false };
const icon = (name) => `style="--icon:url('ui/icons/${name}.svg')"`;
const now = () => Date.now();
const fightKind = (room) => ['process', 'elite', 'guard', 'core'].includes(room.kind);
const pctOf = (s, x) => Math.max(1, Math.round(s.rooms.max * x));
const restGain = (s) => Math.min(s.rooms.max - s.rooms.signal, Math.round(s.rooms.max * ROOMS.rest));

// ---------- countdowns ----------
// A tile's short form: m:ss under an hour, then 1h59.
const short = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return t >= 3600 ? `${Math.floor(t / 3600)}h${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}` : fmtLeft(ms); };
const clock = (at) => `<span class="fp-clock" data-at="${at}"></span>`;
export function fillClocks(root, t = now()) {
  for (const el of root.querySelectorAll('[data-at]')) { const ms = Number(el.dataset.at) - t; el.textContent = el.dataset.fmt === 's' ? short(ms) : fmtLeft(ms); }
}

// ---------- icons ----------
// One sprite of 20×20 line icons; the map and the side column <use> them, coloured by `color`.
const ICONS = {
  process: '<rect x="6" y="6" width="8" height="8"/><path d="M8 3v3M12 3v3M8 14v3M12 14v3M3 8h3M3 12h3M14 8h3M14 12h3"/>',
  elite: '<rect x="5.5" y="5.5" width="9" height="9"/><path d="M8 2.5v3M12 2.5v3M8 14.5v3M12 14.5v3M2.5 8h3M2.5 12h3M14.5 8h3M14.5 12h3"/><path class="f" d="M10 7.3l2.7 2.7-2.7 2.7-2.7-2.7z"/>',
  guard: '<path d="M10 2.5l6.5 2.4v5.2c0 4-2.9 6.4-6.5 7.6-3.6-1.2-6.5-3.6-6.5-7.6V4.9z"/><path d="M10 6.5v7M7 9.5h6"/>',
  core: '<path d="M3 16h14M3.7 13.4L2.6 6l4.5 3.5L10 3.8l2.9 5.7L17.4 6l-1.1 7.4z"/>',
  den: '<path d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5S2 10 2 10z"/><circle class="f" cx="10" cy="10" r="2.4"/>',
  cache: '<path d="M3 6.8l7-3.6 7 3.6v6.6l-7 3.6-7-3.6z"/><path d="M3 6.8l7 3.6 7-3.6M10 10.4v6.6"/>',
  mirror: '<path d="M7.5 3.5L12 10l-4.5 6.5L3 10z"/><path d="M12.5 3.5L17 10l-4.5 6.5"/>',
  vault: '<rect x="3" y="3" width="14" height="14" rx="1"/><circle cx="10" cy="10" r="3.6"/><path d="M10 6.4V8M10 12v1.6M6.4 10H8M12 10h1.6"/>',
  rest: '<path d="M15 13.2A6.3 6.3 0 0 1 7.8 3.6a6.6 6.6 0 1 0 7.2 9.6z"/>',
  entry: '<path d="M9 3.5h7.5v13H9"/><path d="M2.5 10H12M9 7l3 3-3 3"/>',
  junction: '<circle class="f" cx="10" cy="10" r="3"/>',
  key: '<circle cx="6.5" cy="10" r="3.2"/><path d="M9.7 10h7.8M14.6 10v3M17.2 10v2.2"/>',
  lock: '<rect x="4.5" y="9" width="11" height="8" rx="1"/><path d="M7 9V6.8a3 3 0 0 1 6 0V9"/>',
  unlock: '<rect x="4.5" y="9" width="11" height="8" rx="1"/><path d="M7 9V6.8a3 3 0 0 1 5.8-1.1"/>',
  star: '<path class="f" d="M10 2.8l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.5-4.5 2.5 1-5L2.8 8l5-.6z"/>',
  check: '<path d="M4 10.5l4 4 8-9"/>',
};
const sprite = () => `<svg class="fp-sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>`
  + Object.entries(ICONS).map(([k, b]) => `<symbol id="fp-i-${k}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${b.replace(/class="f"/g, 'fill="currentColor" stroke="none"')}</symbol>`).join('')
  + '<pattern id="fp-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="6" class="fp-hatch"/></pattern>'
  + '<marker id="fp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="fp-arrowhead"/></marker>'
  + '</defs></svg>';
const iconOf = (s, room) => (seenOf(s, room.id) !== 'kind' ? null : room.mirror ? 'mirror' : room.kind);
// An icon in the side column (an exit, the room card).
const ic = (name, cls = '') => `<svg class="fp-ic${cls ? ' ' + cls : ''}" viewBox="0 0 20 20" aria-hidden="true">${name ? `<use href="#fp-i-${name}"/>` : '<text x="10" y="15" text-anchor="middle">?</text>'}</svg>`;

// ---------- what a room holds ----------
// Its virus in one line: "Level 10 Wiper · TOLLGATE · Lockout set" (the set once you've fought it).
function whoOf(s, room) {
  const R = s.rooms, f = fightOf(s, room, room.mirror ? 'mirror' : null);
  if (room.kind === 'guard') { const G = GUARDS[room.guard]; return { short: G.name, fam: G.name, sub: `${G.ice ? 'Kestrel ICE' : 'Guard'} · lv ${f.level}`, line: `Level ${f.level} ${G.name}${G.ice ? ' · Kestrel ICE' : ''}` }; }
  if (room.kind === 'core') return { short: BOSSES[RESIDENT].name, fam: BOSSES[RESIDENT].name, sub: `The Resident · lv ${f.level}`, line: `Level ${f.level} ${BOSSES[RESIDENT].name} · the Resident` };
  const set = room.set ? (R.codex[`${room.family}:${room.set}`] ? setName(room.family, room.set) : '???') : '';
  const elite = room.kind === 'elite' || room.mirror;
  const by = (AUTHORS[room.author]?.name || '?').toUpperCase(), short = `${elite ? 'Elite ' : ''}${familyName(room.family)}`;
  return { short, sub: `${by} · lv ${f.level}${set ? ` · ${set} set` : ''}`, line: `Level ${f.level} ${familyName(room.family)} · ${by}${set && set !== '???' ? ` · ${set} set` : ''}`, fam: familyName(room.family), unknown: set === '???' };
}
const mirrorLine = (s, room) => `A mirror. A level ${fightOf(s, room, 'mirror').level} elite ${familyName(room.family)} waits behind it.`;
const guardOf = (s, vaultId) => roomList(s).find((x) => x.key === vaultId);
const huntName = (h) => HUNTERS[h.kind].name;
// A tile's tooltip: the room's name, what it holds (when the tile can't show it), and one rule.
function tileTip(s, room) {
  const R = s.rooms, g = R.graph, seen = seenOf(s, room.id), h = hunterOf(s);
  const hunted = h && !h.down && h.at === room.id;
  if (seen !== 'kind') return hunted ? `Unseen: the ${huntName(h)} is here.` : 'Unseen';
  let who = '';
  if (fightKind(room) || room.mirror) who = room.mirror ? mirrorLine(s, room) : whoOf(s, room).line;
  else if (room.kind === 'den') who = g.hunter === 'track' ? 'The Tracker sleeps here.' : 'The Patroller walks its loop from here.';
  else if (room.kind === 'cache') who = 'Credits and code, sometimes a script.';
  else if (room.kind === 'vault' && !R.opened[room.id]) who = R.visit?.keys.includes(room.id) ? 'Your key fits.' : `Its key is in ${guardOf(s, room.id)?.path || 'a guard post'}.`;
  else if (room.kind === 'rest') who = `Restores ${Math.round(R.max * ROOMS.rest)} Signal, once a visit.`;
  const denEdge = g.hunter === 'track' && g.den && neighbours(g, g.den).includes(room.id) && h && !h.awake && !h.down;
  const rule = hunted ? `The ${huntName(h)} is here: walk in and you fight it.`
    : denEdge ? 'Walking in wakes the Tracker.'
      : R.rare[room.id] && isUp(s, room) ? `Rare spawn: ${ROOMS.rareLevel} levels up, ${ROOMS.rareRolls} loot rolls.`
        : room.kind === 'guard' && room.key && !R.opened[room.key] ? `Carries the ${g.rooms[room.key].path} key.`
          : room.queue && R.kind === 'Mailhub' && fightKind(room) ? 'A Spam Flood joins its fights.'
            : room.kind === 'elite' ? 'Enrages from cycle 9. Drops a blue or better.'
              : room.kind === 'core' && !coreOpen(s) ? `Sealed until you open the ${g.rooms[g.vaults[0]].path}.`
                : room.kind === 'cache' && !room.mirror ? 'One in four is bait: read it first.'
                  : room.kind === 'vault' && room.id === g.vaults[0] && !R.opened[room.id] ? 'Opening it unseals the Core.'
                    : ['rest', 'entry'].includes(room.kind) ? 'The hunter never comes in.' : '';
  const body = [who, rule].filter(Boolean).join('\n');
  return body ? `${room.path}: ${body}` : room.path;
}
// A room's state in a word or two (the card's kicker, an exit's line): a countdown, or a word.
function stateOf(s, room) {
  const R = s.rooms, kind = seenOf(s, room.id) === 'kind';
  if (!kind) return { word: 'unseen', cls: 'dim' };
  if (room.kind === 'core' && !coreOpen(s)) return { word: 'sealed', cls: 'dim' };
  if (fightKind(room)) return isUp(s, room) ? { word: R.rare[room.id] ? '★ rare' : 'live', cls: R.rare[room.id] ? 'next' : 'hot' } : { word: 'cleared', cls: 'you', at: backAt(s, room) };
  if (room.kind === 'cache') return cacheFull(s, room) ? (room.mirror ? { word: 'mirror', cls: 'hot' } : { word: 'stocked', cls: '' }) : { word: 'empty', cls: 'dim', at: refillAt(s, room) };
  if (room.kind === 'vault') return R.opened[room.id] ? { word: 'open', cls: 'you' } : R.visit?.keys.includes(room.id) ? { word: 'key fits', cls: 'you' } : { word: 'locked', cls: '' };
  if (room.kind === 'rest') return R.visit?.rested ? { word: 'rested', cls: 'dim' } : { word: '', cls: '' };
  return { word: '', cls: '' };
}

// ---------- the map ----------
const CELLS = { wide: { w: 120, h: 98, bw: 84, bh: 60, label: 13 }, tall: { w: 94, h: 102, bw: 80, bh: 60, label: 11 } };
// Grid to pixels: wide (the spine runs left to right) or tall (top to bottom, for phones).
function frame(s, tall) {
  const C = CELLS[tall ? 'tall' : 'wide'], rooms = roomList(s), xs = rooms.map((r) => (tall ? -r.y : r.x)), ys = rooms.map((r) => (tall ? r.x : r.y));
  const x0 = Math.min(...xs), y0 = Math.min(...ys), cols = Math.max(...xs) - x0 + 1, rows = Math.max(...ys) - y0 + 1;
  const at = (r) => ({ x: ((tall ? -r.y : r.x) - x0) * C.w + C.w / 2, y: ((tall ? r.x : r.y) - y0) * C.h + C.h / 2 });
  return { at, C, width: cols * C.w, height: rows * C.h };
}
const distOf = (g, a, b) => { const d = { [a]: 0 }, q = [a]; while (q.length) { const x = q.shift(); if (x === b) return d[x]; for (const y of neighbours(g, x)) if (!(y in d)) { d[y] = d[x] + 1; q.push(y); } } return null; };
// The hunter's next room, when you can see it go there.
function huntStep(s) {
  const R = s.rooms, h = hunterOf(s), here = R.at;
  if (!h || h.down || !here) return null;
  const next = hunterNext(s, h), near = h.at === here || seenOf(s, h.at);
  return next && near && (seenOf(s, next) || classOf(s) === 'infiltrator') ? next : null;
}
function mapSvg(s, tall) {
  const R = s.rooms, g = R.graph, { at, C, width, height } = frame(s, tall), here = R.at, h = hunterOf(s);
  const reach = new Set(exits(s).map((x) => x.id)), walked = R.visit?.walked || {};
  const shown = (id) => !!seenOf(s, id);
  // Links: a line between two rooms you've seen at least the shape of. A hop (a Relay's) bows out.
  const lines = linksOf(g).filter(([a, b]) => shown(a) && shown(b)).map(([a, b]) => {
    const p = at(g.rooms[a]), q = at(g.rooms[b]), hop = (g.hops || []).some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    const live = here && ((a === here && reach.has(b)) || (b === here && reach.has(a))), trod = R.at && walked[a] && walked[b];
    const cls = `fp-link${live ? ' live' : trod ? ' walked' : seenOf(s, a) === 'kind' && seenOf(s, b) === 'kind' ? ' seen' : ' fog'}${hop ? ' hop' : ''}`;
    if (hop) { const mx = (p.x + q.x) / 2 + (q.y - p.y) * 0.35, my = (p.y + q.y) / 2 - (q.x - p.x) * 0.35; return `<path class="${cls}" d="M${p.x} ${p.y} Q${mx} ${my} ${q.x} ${q.y}"/>`; }
    return `<line class="${cls}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`;
  }).join('');
  // A Patroller's loop, dashed red, once you've seen any room of it (an Infiltrator sees all of it).
  let loop = '';
  if (g.route && (classOf(s) === 'infiltrator' || g.route.some((id) => seenOf(s, id) === 'kind'))) {
    const all = classOf(s) === 'infiltrator', ids = g.ping ? g.route : [...g.route, g.route[0]], segs = [];
    for (let i = 1; i < ids.length; i++) if (all || (shown(ids[i - 1]) && shown(ids[i]))) { const p = at(g.rooms[ids[i - 1]]), q = at(g.rooms[ids[i]]); segs.push(`M${p.x + 7} ${p.y + 7} L${q.x + 7} ${q.y + 7}`); }
    if (segs.length) loop = `<path class="fp-loop" d="${segs.join(' ')}" title="The Patroller's loop"/>`;
  }
  // The hunter's next step: a red arrow, edge to edge.
  const next = huntStep(s);
  let arrow = '';
  if (next) {
    const p = at(g.rooms[h.at]), q = at(g.rooms[next]), dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1, trim = Math.abs(dx) > Math.abs(dy) ? C.bw / 2 + 10 : C.bh / 2 + 15, k = trim / d;
    arrow = `<line class="fp-hunt-arrow" x1="${p.x + dx * k}" y1="${p.y + dy * k}" x2="${q.x - dx * k}" y2="${q.y - dy * k}" marker-end="url(#fp-arrow)"/>`;
  }
  const rooms = roomList(s).filter((r) => shown(r.id)).map((room) => roomSvg(s, room, at(room), C, reach, next)).join('');
  // Out of sight but within two rooms: a red pulse at the edge of your fog.
  let pulse = '';
  if (h && !h.down && here && !seenOf(s, h.at)) {
    const d = distOf(g, here, h.at);
    if (d != null && d <= 2) { const edge = neighbours(g, h.at).find((x) => seenOf(s, x)); if (edge) { const p = at(g.rooms[edge]); pulse = `<circle class="fp-pulse" cx="${p.x}" cy="${p.y}" r="${C.bw / 2 + 10}" title="${esc(`${huntName(h)}: just out of sight.`)}"/>`; } }
  }
  return `<svg class="fp-svg ${tall ? 'tall' : 'wide'}" viewBox="-6 -10 ${width + 12} ${height + 20}" width="${width + 12}" height="${height + 20}" style="--w:${width}px;--h:${height}px" role="group" aria-label="Room map of ${esc(R.name)}">${lines}${loop}${pulse}${rooms}${arrow}</svg>`;
}
// A tile's outline by kind.
function bodyOf(kind, x, y, w, h, p) {
  const c = 11;
  if (kind === 'junction') return `<circle class="fp-body" cx="${p.x}" cy="${p.y}" r="15"/>`;
  if (kind === 'elite') return `<path class="fp-body" d="M${x + c} ${y}H${x + w - c}L${x + w} ${y + c}V${y + h - c}L${x + w - c} ${y + h}H${x + c}L${x} ${y + h - c}V${y + c}Z"/>`;
  if (kind === 'guard') return `<path class="fp-body" d="M${x + 9} ${y}H${x + w - 9}L${x + w} ${y + h / 2}L${x + w - 9} ${y + h}H${x + 9}L${x} ${y + h / 2}Z"/>`;
  if (kind === 'rest') return `<rect class="fp-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`;
  if (kind === 'core') return `<rect class="fp-frame" x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${h + 10}" rx="6"/><rect class="fp-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`;
  if (kind === 'vault') return `<rect class="fp-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/><rect class="fp-inner" x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="2"/>`;
  if (kind === 'den') return `<rect class="fp-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/><rect class="fp-hatched" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>`;
  return `<rect class="fp-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>`;
}
const badge = (cx, cy, name, cls) => `<g class="fp-badge ${cls}"><circle cx="${cx}" cy="${cy}" r="9"/><use href="#fp-i-${name}" x="${cx - 6}" y="${cy - 6}" width="12" height="12"/></g>`;
const pill = (x, y, w, inner, cls) => `<g class="fp-pill ${cls}"><rect x="${x}" y="${y - 8}" width="${w}" height="16" rx="2"/><text x="${x + w / 2}" y="${y + 3.5}" text-anchor="middle">${inner}</text></g>`;
function roomSvg(s, room, p, C, reach, next) {
  const R = s.rooms, g = R.graph, seen = seenOf(s, room.id), kind = seen === 'kind', h = hunterOf(s);
  const here = R.at === room.id, can = reach.has(room.id), up = kind && fightKind(room) && isUp(s, room);
  const hunted = h && !h.down && h.at === room.id;
  const sealed = kind && room.kind === 'core' && !coreOpen(s);
  const empty = kind && room.kind === 'cache' && !cacheFull(s, room);
  const used = empty || (kind && room.kind === 'rest' && R.visit?.rested);
  const denEdge = kind && g.hunter === 'track' && g.den && neighbours(g, g.den).includes(room.id) && h && !h.awake && !h.down;
  const big = kind && room.kind === 'core' ? 8 : 0, w = (kind ? C.bw : C.bw - 14) + big, ht = (kind ? C.bh : C.bh - 12) + big;
  const x = p.x - w / 2, y = p.y - ht / 2;
  const cls = ['fp-room', `k-${kind ? room.kind : 'fog'}`, here ? 'here' : can ? 'reach' : kind ? 'seen' : 'shape', up ? 'up' : '', kind && fightKind(room) && !up && !sealed ? 'down' : '', used ? 'used' : '', room.mirror && kind ? 'mirror' : '', sealed ? 'sealed' : '', hunted ? 'hunted' : '', next === room.id ? 'hunt-next' : ''].filter(Boolean).join(' ');
  const attrs = can ? ` data-rooms="go" data-arg="${esc(room.id)}" tabindex="0" role="button"` : '';
  const jn = kind && room.kind === 'junction';
  let out = `<g class="${cls}" data-room="${esc(room.id)}"${attrs} title="${esc(tileTip(s, room))}" aria-label="${esc(kind ? room.path : 'Unseen room')}">`;
  // Rings: you (teal), the hunter's next room (dashed hot).
  if (here || next === room.id) out += jn ? `<circle class="fp-ring" cx="${p.x}" cy="${p.y}" r="21"/>` : `<rect class="fp-ring" x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${ht + 12}" rx="${room.kind === 'rest' && kind ? 20 : 7}"/>`;
  out += bodyOf(kind ? room.kind : 'fog', x, y, w, ht, p);
  const name = iconOf(s, room);
  if (!kind) out += `<text class="fp-q" x="${p.x}" y="${p.y + 6}" text-anchor="middle">?</text>`;
  else if (jn) out += `<circle class="fp-dot" cx="${p.x}" cy="${p.y}" r="3.5"/>`;
  else {
    const label = room.path.length > C.label ? room.path.slice(0, C.label - 1) + '…' : room.path;
    out += `<use class="fp-glyph" href="#fp-i-${name}" x="${p.x - 12}" y="${p.y - 24}" width="24" height="24"/>`;
    out += `<text class="fp-label" x="${p.x}" y="${y + ht - 13}" text-anchor="middle">${esc(label)}</text>`;
  }
  if (kind && R.cleared[room.id] && !jn) out += `<use class="fp-check" href="#fp-i-check" x="${x + 4}" y="${y + 4}" width="11" height="11"/>`;
  // Top right: one badge.
  let b = null;
  if (kind && !jn) {
    if (denEdge) b = ['den', 'hot'];
    else if (up && R.rare[room.id]) b = ['star', 'next'];
    else if (room.kind === 'guard' && room.key && !R.opened[room.key] && !R.visit?.keys.includes(room.key)) b = ['key', 'amber'];
    else if (room.kind === 'vault') b = R.opened[room.id] ? ['unlock', 'you'] : R.visit?.keys.includes(room.id) ? ['key', 'you'] : ['lock', 'dim'];
    else if (sealed) b = ['lock', 'hot'];
  }
  if (b) out += badge(x + w - 2, y + 2, b[0], b[1]);
  // Top centre: the hunter's token, or YOU.
  if (hunted) out += `<g class="fp-token"><circle cx="${p.x}" cy="${y}" r="10"/><use href="#fp-i-den" x="${p.x - 7}" y="${y - 7}" width="14" height="14"/></g>`;
  else if (here) out += `<g class="fp-you-tag"><rect x="${p.x - 15}" y="${(jn ? p.y - 15 : y) - 7}" width="30" height="14" rx="2"/><text x="${p.x}" y="${(jn ? p.y - 15 : y) + 3.5}" text-anchor="middle">YOU</text></g>`;
  // Bottom: a countdown on the left, a first step's cost on the right.
  const at = kind && fightKind(room) && !up && !sealed && R.down[room.id] != null ? backAt(s, room) : empty ? refillAt(s, room) : null;
  if (at != null) out += pill(x - 3, y + ht, 46, `↻ <tspan data-at="${at}" data-fmt="s"></tspan>`, 'clock');
  const cost = can ? moveCost(s, room) : 0;
  if (cost) { const cw = 14 + String(cost).length * 6.4; out += pill(x + w + 3 - cw, y + ht, cw, `−${cost}`, 'cost'); }
  return out + '</g>';
}

// ---------- the strip ----------
function hudMarkup(s) {
  const R = s.rooms, sig = signalNow(s), max = R.max, f = max ? sig / max : 0, lvl = f <= 0.3 ? 'low' : f <= 0.6 ? 'mid' : 'ok';
  const prog = progressOf(s), h = hunterOf(s), K = KINDS[R.kind], bag = scriptsOf(s), author = (AUTHORS[R.author]?.name || R.author).toUpperCase();
  const step = pctOf(s, R.floor >= 5 ? ROOMS.moveDeep : ROOMS.move);
  const scripts = bag.map((id) => `<li class="fp-perk r-${TIER[SCRIPTS[id].rarity]}" title="${esc(scriptTip(id))}">${esc(SCRIPTS[id].name)}</li>`).join('');
  const hunt = R.at && h ? `<span class="fp-stat fp-hunt${h.down ? ' out' : ''}" title="${esc(`${huntName(h)}: ${HUNTERS[h.kind].text} It moves only when you walk or wait.`)}">${ic('den')}<span class="lbl">${esc(huntName(h))}</span><b>${h.down ? 'down' : h.kind === 'track' && !h.awake && !h.returning ? 'asleep' : `moves in ${paceOf(s) - h.count}`}</b></span>` : '';
  const keys = R.at && R.visit?.keys.length ? `<span class="fp-stat fp-keys" title="Keys: each opens its vault, this visit only. Jack out and it goes back to its guard post.">${ic('key')}<b>${R.visit.keys.length}</b></span>` : '';
  const pack = R.pack.length ? `<span class="fp-stat" title="${esc(`Pack: ${R.pack.map((id) => itemLabel(stashItem(s, id) || { name: '?' })).join(', ')}.\nBanks when you jack out. Lost if your Signal hits 0.`)}"><span class="lbl">Pack</span><b>${R.pack.length}</b></span>` : '';
  const rule = ['a', 'b', 'c'].map((k) => `<button type="button" class="fp-rule${R.bossRule === k ? ' on' : ''}" data-rooms="bossrule" data-arg="${k}" aria-pressed="${R.bossRule === k}" title="${esc(`Boss rule ${k}: ${BOSS_RULES[k].name}.\n${BOSS_RULES[k].text}`)}">${k}</button>`).join('');
  return `<header class="fp-hud" aria-label="The server">
    <span class="fp-id" title="${esc(`${R.name}: ${author} ${R.kind}, level ${R.level}, floor ${R.floor}.\n${K.rule}: ${K.text}`)}"><span class="ico" ${icon('server')}></span><b>${esc(R.name)}</b><small>${esc(`${R.kind} · lv ${R.level} · ${K.rule}`)}</small></span>
    <div class="fp-sig ${lvl}" title="${esc(`Signal: carries from fight to fight and rests back at home.\nA room's first step each visit costs ${step}.`)}"><span class="lbl">Signal</span><span class="sigbar"><span style="width:${(f * 100).toFixed(1)}%"></span></span><strong>${sig}</strong><small>/${max}</small></div>
    <div class="fp-prog" title="${esc(`Rooms cleared for good: at ${Math.ceil(prog.total / 2)} the whole map is drawn, at ${prog.total} the server is Mapped.`)}"><span class="lbl">Rooms</span><span class="pbar"><span style="width:${(prog.done / prog.total) * 100}%"></span><i style="left:50%"></i></span><b>${prog.done}/${prog.total}</b>${R.mapped ? '<small class="fp-mapped">MAPPED</small>' : ''}</div>
    ${keys}${hunt}${pack}
    <span class="fp-tools"><span class="fp-rules" role="group" aria-label="Boss rule"><span class="lbl" title="${esc(`Boss rule: how ${BOSSES[RESIDENT].name}'s ticks work. It applies to your next fight with it.`)}">Boss</span>${rule}</span>
    <ul class="fp-perks" aria-label="Scripts"><li class="lbl" title="Scripts: run one a fight, from the fight's tray. It takes no cycle.">Scripts ${bag.length}/${slotsOf(s)}</li>${scripts}</ul></span>
  </header>`;
}

// ---------- the room you're in ----------
const btn = (verb, label, { arg = null, primary = false, hot = false, disabled = false, note = '', tip = '' } = {}) => `<button type="button" class="btn${primary ? ' primary' : ''}${hot ? ' hot-btn' : ''}" data-rooms="${verb}"${arg != null ? ` data-arg="${esc(arg)}"` : ''}${disabled ? ' disabled' : ''}${tip ? ` title="${esc(tip)}"` : ''}>${esc(label)}${note ? `<small>${esc(note)}</small>` : ''}</button>`;
const note = (html, cls = '') => `<p class="fp-note${cls ? ' ' + cls : ''}">${html}</p>`;
// What holds the room: its icon, its name, and its line.
const holder = (name, title, sub, tip = '', cls = 'hot') => `<div class="fp-virus ${cls}"${tip ? ` title="${esc(tip)}"` : ''}>${ic(name)}<span><b>${esc(title)}</b><small>${esc(sub)}</small></span></div>`;
const kicker = (st) => (st.word || st.at != null ? `<h2 class="fp-kick ${st.cls}">${esc(st.word)}${st.at != null ? ` · ↻ ${clock(st.at)}` : ''}</h2>` : '');
function roomCard(s) {
  const R = s.rooms, g = R.graph, room = hereOf(s), sc = R.screen, h = hunterOf(s);
  let st = stateOf(s, room), body = '', acts = '';
  if (sc?.kind === 'hunter') {
    st = { word: 'caught', cls: 'hot' };
    body = holder('den', `${huntName(h).toUpperCase()} ICE`, `Level ${R.level + ROOMS.hunter.level} hunter`) + note('Beat it for a script. It stays down the rest of the visit.');
    acts = btn('engage', 'Fight it', { primary: true }) + btn('slip', 'Slip past', { tip: 'Slip past: once a visit.' });
  } else if (sc?.kind === 'virus') {
    const k = whoOf(s, room), G = room.kind === 'guard' ? GUARDS[room.guard] : null;
    const tip = G ? `${G.name}: ${G.summary.split('. ').slice(1).join('. ') || G.summary}` : room.kind === 'core' ? `${BOSSES[RESIDENT].name}: ${BOSSES[RESIDENT].about}` : k.unknown ? '??? set: you learn it by fighting it.' : '';
    body = holder(iconOf(s, room), sc.name, fightKind(room) && !['guard', 'core'].includes(room.kind) ? `${k.short} · ${k.sub}` : k.sub, tip);
    const notes = [];
    if (R.rare[room.id]) notes.push(`<span class="fp-tag-inline next">★ rare</span> ${ROOMS.rareLevel} levels up, ${ROOMS.rareRolls} loot rolls.`);
    if (room.queue && R.kind === 'Mailhub') notes.push('A Spam Flood joins the fight.');
    if (room.kind === 'guard' && room.key && !R.opened[room.key]) notes.push(esc(`Carries the ${g.rooms[room.key].path} key.`));
    if (room.kind === 'elite') notes.push('Enrages from cycle 9. Drops a blue or better.');
    if (room.kind === 'core') notes.push(esc(`Boss rule ${R.bossRule}: ${BOSS_RULES[R.bossRule].name}.`));
    body += notes.map((n) => note(n)).join('');
    acts = btn('engage', 'Engage', { primary: true }) + (R.visit.back ? btn('back', 'Step back', { tip: `Step back: to ${g.rooms[R.visit.back].path}. The move in stays spent.` }) : '');
  } else if (fightKind(room)) {
    const k = whoOf(s, room);
    body = holder(iconOf(s, room), k.short, k.sub, '', 'down') + (R.down[room.id] != null ? note('Never respawns while you stand in it.', 'dim') : '');
  } else if (room.kind === 'cache') {
    const full = cacheFull(s, room), read = R.read?.[room.id] === (R.spawns[room.id] || 0), bait = read && isBait(s, room), lose = pctOf(s, ROOMS.bait);
    if (full) {
      body = note(esc(!read ? (room.mirror ? 'Unread.' : 'Unread. One cache in four is bait.') : room.mirror ? mirrorLine(s, room) : bait ? `Bait. Taking it costs ${lose} Signal.` : 'Clean: credits and code.'), bait || (read && room.mirror) ? 'hot' : '');
      acts = btn('cat', 'Read', { disabled: read }) + btn('pull', room.mirror && read ? 'Break the mirror' : 'Take', { hot: true, note: bait ? `−${lose} Signal` : '' });
    } else body = note('Credits and code, sometimes a script.', 'dim');
  } else if (room.kind === 'vault') {
    const open = !!R.opened[room.id], has = R.visit.keys.includes(room.id), main = room.id === g.vaults[0], force = pctOf(s, ROOMS.force);
    body = open ? (main ? note('The Core is unsealed.') : '') : note(esc(has ? `Your key fits.${main ? ' Opening it unseals the Core.' : ''}` : `Its key is in ${guardOf(s, room.id)?.path || 'a guard post'}.${main ? ' Opening it unseals the Core.' : ''}`));
    acts = open ? '' : btn('open', 'Open', { primary: true, disabled: !has, note: has ? 'your key' : 'no key' }) + btn('force', 'Force it', { hot: true, note: `−${force} Signal` });
  } else if (room.kind === 'rest') {
    body = note('The hunter never comes in.', 'dim');
    acts = btn('rest', R.visit.rested ? 'Rested' : 'Rest', { primary: !R.visit.rested && restGain(s) > 0, disabled: R.visit.rested || !restGain(s), note: R.visit.rested ? 'once a visit' : restGain(s) ? `+${restGain(s)} Signal` : 'Signal full' });
  } else if (room.kind === 'entry') body = note('The hunter never comes in.', 'dim');
  else if (room.kind === 'den') body = note(g.hunter === 'track' ? 'The Tracker sleeps here.' : 'The Patroller walks its loop from here.', 'dim');
  const line = hunterLine(s);
  const card = `<section class="card fp-screen${sc ? ' focus' : ''}">${kicker(st)}<h1>${esc(room.path)}</h1>${body}${acts ? `<div class="row acts">${acts}</div>` : ''}${line ? `<p class="fp-hunter-line">${ic('den')}<span>${esc(line)}</span></p>` : ''}</section>`;
  return card + exitsMarkup(s);
}
// Where you can go from here: each exit as a row, the whole row the move. Its name and one word; its cost on the right.
function exitsMarkup(s) {
  const R = s.rooms, g = R.graph, list = neighbours(g, R.at).map((id) => g.rooms[id]), h = hunterOf(s), open = new Set(exits(s).map((x) => x.id)), next = h && !h.down ? hunterNext(s, h) : null;
  const rows = list.map((room) => {
    const kind = seenOf(s, room.id) === 'kind', cost = moveCost(s, room), st = stateOf(s, room), up = kind && fightKind(room) && isUp(s, room) && !(room.kind === 'core' && !coreOpen(s));
    const gain = room.kind === 'rest' && kind && !R.visit?.rested ? restGain(s) : 0;
    const what = up ? esc(whoOf(s, room).fam) : st.at != null ? `↻ ${clock(st.at)}` : gain ? `+${gain} Signal` : esc(st.word);
    const tag = h && !h.down ? (h.at === room.id ? 'hunter' : next === room.id ? 'hunter next' : '') : '';
    const can = open.has(room.id);
    return `<li><button type="button" class="fp-exit${up ? ' up' : ''}${tag ? ' hunted' : ''}" ${can ? `data-rooms="go" data-arg="${esc(room.id)}"` : 'disabled'}>${ic(iconOf(s, room), up || room.mirror ? 'hot' : '')}<span class="fp-exit-b"><b>${esc(kind ? room.path : 'Unseen')}</b>${what ? `<small class="${up ? 'hot' : gain ? 'you' : st.cls}">${what}</small>` : ''}</span><span class="fp-exit-c">${tag ? `<span class="fp-tag-inline hot">${tag}</span>` : ''}${!can ? '' : cost ? `−${cost}` : '<i>free</i>'}</span></button></li>`;
  }).join('');
  const more = `<div class="row acts">${btn('wait', 'Wait', { disabled: !!R.screen, tip: 'Wait: the hunter takes its step. Costs nothing.' })}${btn('jackout', 'Jack out', { hot: true, disabled: active(s), tip: 'Jack out: banks your pack. Signal rests at home.' })}</div>`;
  return `<section class="fp-exits"><h3 class="fp-sec">Exits</h3><ul>${rows}</ul>${more}</section>`;
}
// Home: Signal resting, the reconnect wait, what the last visit did, and Connect.
function homeCard(s) {
  const R = s.rooms, sig = signalNow(s), t = now(), full = t + Math.max(0, Math.ceil(((R.max - sig) / (R.max * 0.2 * R.speed)) * 60000)), wait = R.reconnectAt - t, need = Math.ceil(R.max * 0.25);
  const L = R.last;
  const last = L ? `<ul class="fp-lines">${L.result === 'lost' ? `<li class="hot"><span class="lbl">lost</span><span>${esc(`${L.why} ${L.lost?.length ? `${L.lost.length} unbanked ${L.lost.length === 1 ? 'item' : 'items'} lost: ${L.lost.join(', ')}.` : 'Nothing unbanked was lost.'}`)}</span></li>` : `<li><span class="lbl">banked</span><span>${L.banked} ${L.banked === 1 ? 'item' : 'items'}</span></li>`}<li><span class="lbl">xp</span><span>+${(L.xp || 0).toLocaleString('en-US')}</span></li></ul>` : '';
  const items = R.banked.map((id) => stashItem(s, id)).filter(Boolean);
  const loot = items.length ? `<h3 class="fp-sec">Banked <small>${items.length}</small></h3><ul class="fp-items">${items.slice(-6).map((it) => `<li data-ptip="${esc(it.id)}"><b class="iname r-${it.rarity}">${esc(itemLabel(it))}</b><small>${esc(statLine(it.stats))}</small></li>`).join('')}</ul>` : '';
  const can = wait <= 0 && sig >= need;
  const lines = [sig < R.max ? `Full in ${clock(full)}.` : '', wait > 0 ? `Reconnect in ${clock(R.reconnectAt)}.` : '', sig < need ? esc(`You need ${need} Signal to connect.`) : ''].filter(Boolean).join(' ');
  return `<section class="card fp-screen fp-home"><h2>${R.visits ? `Home · visit ${R.visits}` : 'Home'}</h2><h1>${R.visits ? (L?.result === 'lost' ? 'Disconnected' : 'Jacked out') : 'Ready to connect'}</h1>
    ${lines ? note(lines) : ''}${last}<div class="row acts">${btn('connect', 'Connect', { primary: true, disabled: !can, note: can ? '' : wait > 0 ? 'wait' : `${need} Signal` })}</div>
    <p class="fp-note dim">${esc(`This session: +${xpEarned(s).toLocaleString('en-US')} XP · fights won ${R.stats.won}/${R.stats.fights} · ${BOSSES[RESIDENT].name} ${R.stats.boss.won}/${R.stats.boss.tries}`)}</p>${loot}</section>`;
}
function logMarkup(s) {
  const all = s.rooms.log, lines = all.slice(fpUi.log ? -14 : -3);
  return `<section class="fp-log${fpUi.log ? ' open' : ''}"><button type="button" class="fp-log-k" data-fp-ui="log" aria-expanded="${fpUi.log}"><span>tty</span><span class="ico" ${icon(fpUi.log ? 'collapse' : 'expand')}></span></button><div class="fp-log-lines">${lines.map((l) => `<div${l.startsWith('→') ? ' class="you"' : ''}>${esc(l)}</div>`).join('')}</div></section>`;
}

export function roomsMarkup(s) {
  const R = s.rooms;
  if (!R) return '<section class="card"><h2>Rooms</h2><h1>No server</h1></section>';
  return `<div class="fp${R.at ? '' : ' home'}">
    ${sprite()}${hudMarkup(s)}
    <section class="panel fp-map" data-pane="map"><div class="fp-scroll">${mapSvg(s, false)}${mapSvg(s, true)}</div></section>
    <aside class="fp-side">${R.at ? roomCard(s) : homeCard(s)}${logMarkup(s)}</aside>
  </div>`;
}

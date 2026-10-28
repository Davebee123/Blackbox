// The rooms page (floorplan.mjs, docs/servers.md R0 and R1): a strip of the server across the top (with Wait and Jack
// out, or Connect at home on the playtest; on the network you connect from the network map), and the room map filling
// the rest. A pop-up card, like the network map's, sits beside a room:
// it opens by itself on the room you're in when something there wants a decision (a live virus, a stocked cache, a
// locked vault, the rest room, the Core, the hunter on you), and on any room on the map when you click it. A room you
// can walk into walks on one click; its cost is on its chip. There is no exits list (the lit traces are the exits)
// and no tty: what happens goes up as a notice, and the prompt still takes every verb.
//
// The map is "Schematic HD": the server drawn as a circuit. Each room is a chip (cut corners, a dark depth gradient,
// a drop shadow, an inner hairline) with its icon, the largest thing on it, over a fixed-width name plate. Colour:
// teal is only ever you (your chip, its pulsing ring, the YOU tab and the bits drifting off it); red is a live threat
// (a fight room with its virus up, the Core, a mirror with its elite behind it, the hunter); amber is loot, what you
// use and structure (a cache, the vault, the rest room, a room you haven't cleared); gray is cleared or used; a room
// you've never been in is unknown: a dashed ghost chip with a "?" (no icon, name, colour, tags, light or ring: only
// the cost badge, when you can walk in). Once you've been in it, it's discovered for good and shows everything from
// anywhere. Links are traces (a dark bed and a thin line): the ones out of your room run amber with a flowing current,
// other links to unknown rooms are dotted, and a Patroller's beat tints the bed red.
// State sits on a chip as badges:
//   top left      tags: KEY (the elite holding the vault's key), LOCKED or KEY FITS (a shut vault), SEALED (the
//                 Core), ★ (a rare spawn), WAKES (walking in wakes the Tracker).
//   top centre    YOU, and the hunter: a glitched red pixel skull on the room it's in; the Exfil: a gold archive
//                 with an upload arrow (its badge filled gold once it's cornered). Both show in your room, next to
//                 you and in a discovered room (floorplan.mjs inSight), never deeper in the fog.
//   top right     a red live light (inset), and the Signal a first step costs (−5) on a room you can walk into.
//   bottom right  a respawn ring that fills back up as the room comes back, its m:ss under it.
//   bottom left   the room's grid address (C2), a small dim plate on the edge, on every chip, an unknown one too (it says
//                 where, never what); amber with a contract's mark when a job points at the room (an Install's room, a
//                 heist's vault).
// One red dashed arrow curves from the hunter's room into the room it steps into next (an amber one from the Exfil's
// room to where it runs next). A rogue server's quiet rooms: Empty (a hollow mark) and Stash (a small cache). Just out of sight within two
// rooms, the room at the edge of your fog pulses red. The map zooms and pans (app.js): the wheel, a drag, a
// double-click or ⤢ to fit the server again.
// Sockets (R2): a socket room is a bus slot, red while its guard is up, amber once open; a program in it takes the chip
// (its icon, its name on the plate, a small slot badge bottom left), and a held server's Core shows the program it
// runs as that badge. A Tunnel's link to the entry is a dashed amber arc. Its pop-up card is the Build card: every
// codebase you know, what it costs here and what you hold, and Build.
// Countdowns are empty <… data-at> slots (and rings with data-ring-*) that fillClocks writes every second (app.js), so
// the markup only changes when the server does and a hovered chip keeps its tooltip.
import { esc, deathMark } from './view.mjs';
import { glyph } from './glyphs.mjs';
import { recapMarkup } from './recap.mjs';
import { GUARDS, BOSSES, CONFIG } from './data.mjs';
import { itemLabel, statLine } from './gear.mjs';
import { stashItem, active, classOf } from './combat.mjs';
import { AUTHORS } from './authors.mjs';
import { SCRIPTS, TIER, scriptsOf, slotsOf, scriptTip } from './scripts.mjs';
import { BOSS_RULES } from './interrupt.mjs';
import { familyName } from './families.mjs';
import { ROOMS, KINDS, kindName, HUNTERS, RESIDENT, WORLD, STOCKED, farmed, respawnMs, roomList, hereOf, neighbours, linksOf, seenOf, isUp, backAt, downAt, cacheFull, refillAt, isBait, coreOpen, opened, signalNow, sigOf, progressOf, fmtLeft, hunterOf, hunterNext, paceOf, moveCost, fightOf, exits, hunterLine, xpEarned, virusName, exfilOf, exfilNext, exfilSeen, exfilLine, known, nameOf, hunterSeen, isSocket, socketOpen, socketOff, programIn, roomRuns, tunnelOf, addrOf, PUZZLES, isPuzzle, puzzleState } from './floorplan.mjs';
import { puzzlePanel } from './puzzle-view.mjs';
import { PROGRAMS, SOCKET, programCost, buildBlock, codebasesOf, costLine as programCostLine } from './sockets.mjs';
import { materialsOf } from './combat.mjs';
import { MATERIALS } from './gear.mjs';
import { componentsOf } from './salvage.mjs';
import { TH_ICONS, roomMarksOf, nookIcon, nookLive, questSvg, fileSvg, filesHere, threadHud, threadCard, threadAsks, threadPanel, thUi } from './threads-view.mjs';
import { sweepBlock } from './view.mjs';

// The pop-up's state, a view (never saved): the room you clicked, and where you stood when you clicked it (a step
// or a wait drops it), and the decision you closed (it stays closed until a new one comes up).
export const fpUi = { sel: null, selAt: null, closed: null };
const icon = (name) => `style="--icon:url('ui/icons/${name}.svg')"`;
const now = () => Date.now();
const fightKind = (room) => ['process', 'elite', 'guard', 'core', 'socket', 'nest'].includes(room.kind);
// A room's name on its plate and its card: a live virus's own (the one in it now: each spawn rolls its own), anything
// else, a cleared room too, by its kind (Process 2, Cache 1). The Core keeps its name: the Resident is on its card.
export function labelOf(s, room) {
  if (!['process', 'elite', 'guard'].includes(room.kind) || room.mirror || !known(s, room.id) || !isUp(s, room)) return room.path;
  return virusName(s, room);
}
// The plate is narrow: a wild virus by its stem and tag (XMRIG-1516), its ELITE and its rolled adjective left to the
// chip, the card and the tooltip.
const plateOf = (s, room) => { const n = labelOf(s, room); return n.match(/\S+-\d{4}$/)?.[0] || n; };
const pctOf = (s, x) => Math.max(1, Math.round(s.rooms.max * x));
const restGain = (s) => Math.min(s.rooms.max - sigOf(s), Math.round(s.rooms.max * ROOMS.rest));
// The threads' marks on this server (threads-view.mjs): { roomId: { mark: '!' | '?', text } }. None on the playtest.
const R_th = (s) => (s.rooms?.world && s.threads ? roomMarksOf(s) : {});
// The network's words for a server and its rooms (netrooms.mjs fills WORLD.view; the playtest has none).
const net = (s, what, ...a) => (s.rooms?.world && WORLD.view?.[what] ? WORLD.view[what](s, ...a) : undefined);
// Why the Core is sealed, in one line.
const sealedLine = (s) => net(s, 'sealed') ?? `Sealed until you open the ${s.rooms.graph.rooms[s.rooms.graph.vaults[0]]?.path || 'vault'}.`;

// ---------- countdowns ----------
// A chip's short form: m:ss under an hour, then 1h59.
const short = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return t >= 3600 ? `${Math.floor(t / 3600)}h${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}` : fmtLeft(ms); };
const clock = (at) => `<span class="fp-clock" data-at="${at}"></span>`;
// The slots' text, and each respawn ring's arc (how far the room has come back, from 0 to the full circle).
export function fillClocks(root, t = now()) {
  for (const el of root.querySelectorAll('[data-at]')) { const ms = Number(el.dataset.at) - t; el.textContent = el.dataset.fmt === 's' ? short(ms) : fmtLeft(ms); }
  for (const el of root.querySelectorAll('[data-ring-at]')) {
    const from = Number(el.dataset.ringFrom), to = Number(el.dataset.ringAt), f = to > from ? Math.max(0, Math.min(1, (t - from) / (to - from))) : 1;
    el.style.strokeDashoffset = (100 * (1 - f)).toFixed(2);
  }
}

// ---------- icons ----------
// One sprite: the rooms' line icons (24×24, drawn for the map at full size) and the small marks (20×20: a key, a
// lock, a star, an eye for the hunter). The map, the strip and the pop-up <use> them, coloured by `color`.
const ROOM_ICONS = {
  entry: '<path d="M14 3h5v18h-5"/><path d="M3 12h11M10 8l4 4-4 4"/>',
  process: '<rect x="6" y="6" width="12" height="12" rx="1"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  elite: '<path d="M12 1.5 22.5 12 12 22.5 1.5 12Z"/><rect x="8.5" y="8.5" width="7" height="7"/><path d="M12 5v3.5M12 15.5V19M5 12h3.5M15.5 12H19"/>',
  guard: '<path d="M12 2 20 5v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5Z"/><path d="M12 8v8M8 12h8"/>',
  vault: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><circle cx="12" cy="12" r="4"/><path d="M12 8v1.5M12 14.5V16M8 12h1.5M14.5 12H16M5 20v2M19 20v2"/>',
  core: '<path d="M3 18 5 7l4.5 5L12 5l2.5 7L19 7l2 11Z"/><path d="M3 21h18"/>',
  cache: '<path d="M3 8h18v12H3Z"/><path d="M2 5h20v3H2Z"/><path d="M10 12h4"/>',
  rest: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.8 6.8 0 0 0 20 14.5Z"/>',
  den: '<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3.2"/>',
  mirror: '<path d="M9 3.5 14.5 12 9 20.5 3.5 12Z"/><path d="M15 3.5 20.5 12 15 20.5"/>',
  junction: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v6.5M12 15.5V22M2 12h6.5M15.5 12H22"/>',
  empty: '<rect x="5" y="5" width="14" height="14" rx="1.5" stroke-dasharray="3 3"/>',
  purse: '<path d="M5 10h14v9H5Z"/><path d="M4 7.5h16V10H4Z"/><path d="M10.5 13.5h3"/>',
  // The quirks' rooms: a nest (a hive cell, its brood inside), a hidden room (a cache behind a dashed wall).
  nest: '<path d="M12 2.5 20.5 7.3v9.4L12 21.5l-8.5-4.8V7.3Z"/><circle cx="9.3" cy="10.4" r="1.7"/><circle cx="14.7" cy="10.4" r="1.7"/><circle cx="12" cy="14.9" r="1.7"/>',
  secret: '<path d="M2.5 3.5h19v17h-19Z" stroke-dasharray="2.6 2.4"/><path d="M6.5 10h11v7h-11Z"/><path d="M6 8h12v2H6Z"/><path d="M10.5 13h3"/>',
  // A socket: a bus slot, its contacts.
  socket: '<rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 11v2M10 11v2M14 11v2M17 11v2"/><path d="M9 7V4.5h6V7"/>',
  // The programs (sockets.mjs).
  harvester: '<path d="M12 3v10M7.5 8.5 12 13l4.5-4.5"/><path d="M4 15v5h16v-5"/>',
  cron: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.8 1.8"/><path d="M9 2.5h6"/>',
  siphon: '<path d="M4 4h16l-6 7.5V18l-4 2.5v-9Z"/>',
  mill: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M5.6 18.4l2.5-2.5M15.9 8.1l2.5-2.5"/>',
  defrag: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><path d="M16.5 13.5v6M13.5 16.5h6"/>',
  tunnel: '<path d="M3 20v-8a9 9 0 0 1 18 0v8"/><path d="M8 20v-7a4 4 0 0 1 8 0v7"/><path d="M2 20h20"/>',
  snare: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 3.5v17M3.5 12h17"/>',
  post: '<path d="M12 12v9"/><circle cx="12" cy="10" r="1.8"/><path d="M8.3 6.3a5.2 5.2 0 0 0 0 7.4M15.7 6.3a5.2 5.2 0 0 1 0 7.4M5.4 3.4a9.4 9.4 0 0 0 0 13.2M18.6 3.4a9.4 9.4 0 0 1 0 13.2"/><path d="M9 21h6"/>',
  // The puzzle rooms (puzzles.mjs): a firewall's bricks walling a node in; a door and the way out; a charged node's
  // bolt; a ping's rings.
  quarantine: '<path d="M3 5h18v14H3Z"/><path d="M3 9.7h18M3 14.3h18M8 5v4.7M16 5v4.7M12 9.7v4.6M6 14.3V19M18 14.3V19"/>',
  chase: '<path d="M4 21V3h10v18"/><path d="M2.5 21h19"/><path d="M11 12.5h.01"/><path d="M14.5 9h7M18.5 6l3 3-3 3"/>',
  cascade: '<path d="M4 4h16v16H4Z"/><path d="M13.2 6.5 8.6 13.1h3.6l-1.3 4.4 4.6-6.6h-3.6Z"/>',
  sweep: '<circle cx="12" cy="12" r="1.8"/><path d="M12 6.5a5.5 5.5 0 0 1 5.5 5.5M12 2.5a9.5 9.5 0 0 1 9.5 9.5"/><path d="M6.5 12A5.5 5.5 0 0 0 12 17.5M2.5 12a9.5 9.5 0 0 0 9.5 9.5" stroke-dasharray="2 2.4"/>',
  // A thread's rooms (threads-view.mjs): someone waiting at a terminal, a file, a log.
  ...TH_ICONS,
};
const MARK_ICONS = {
  key: '<circle cx="6.5" cy="10" r="3.2"/><path d="M9.7 10h7.8M14.6 10v3M17.2 10v2.2"/>',
  lock: '<rect x="4.5" y="9" width="11" height="8" rx="1"/><path d="M7 9V6.8a3 3 0 0 1 6 0V9"/>',
  star: '<path class="f" d="M10 2.8l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.5-4.5 2.5 1-5L2.8 8l5-.6z"/>',
  // The Exfil's stolen archive: a file, its corner folded, an upload arrow through it.
  archive: '<path d="M4.5 2.5h7l4 4v11h-11Z"/><path d="M11.5 2.5v4h4"/><path d="M10 15.5v-6M7.4 12 10 9.4l2.6 2.6"/>',
  // A contract's mark (the mail's): a page with a tick, on a room a job points at.
  contract: '<path d="M4.5 2.5h7.5l3.5 3.5v11.5h-11Z"/><path d="M12 2.5V6h3.5"/><path d="M7 11.8l2 2 4-4.3"/>',
};
const symbol = (k, body, vb, sw) => `<symbol id="fp-i-${k}" viewBox="0 0 ${vb} ${vb}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body.replace(/class="f"/g, 'fill="currentColor" stroke="none"')}</symbol>`;
// The sprite also holds the map's paints: the chips' gradients, the glow, the drop shadow, the hunter's arrowhead.
const sprite = () => `<svg class="fp-sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>`
  + Object.entries(ROOM_ICONS).map(([k, b]) => symbol(k, b, 24, 1.6)).join('')
  + Object.entries(MARK_ICONS).map(([k, b]) => symbol(k, b, 20, 1.7)).join('')
  + '<linearGradient id="fp-g-node" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1408"/><stop offset="1" stop-color="#0d0904"/></linearGradient>'
  + '<linearGradient id="fp-g-here" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173a34"/><stop offset="1" stop-color="#0c1d1a"/></linearGradient>'
  + '<linearGradient id="fp-g-hot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0f09"/><stop offset="1" stop-color="#120705"/></linearGradient>'
  + '<filter id="fp-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
  + '<filter id="fp-shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".7"/></filter>'
  + '<marker id="fp-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10Z" class="fp-arrowhead"/></marker>'
  + '<marker id="fp-arrow-exfil" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10Z" class="fp-arrowhead exfil"/></marker>'
  + '</defs></svg>';
// A room's icon: what it is (a guard post is an elite to you; a mirrored cache shows its mirror), once you've seen it.
const iconOf = (s, room) => (!known(s, room.id) ? null : room.nook ? nookIcon(s, room) : room.kind === 'socket' && programIn(s, room.id) ? programIn(s, room.id) : room.mirror ? 'mirror' : room.kind === 'guard' ? 'elite' : room.kind === 'boss' ? 'core' : room.kind === 'stash' ? 'cache' : room.wild && room.kind === 'process' && net(s, 'elite', room) ? 'elite' : room.kind);
// The Exfil where you can see it, and the room it runs to next (when that room is on the map).
const exfilShown = (s) => { const m = exfilOf(s); return m && exfilSeen(s, m) ? m : null; };
const exfilStep = (s) => { const m = exfilShown(s), next = m && exfilNext(s, m); return next && seenOf(s, next) ? next : null; };
// An icon in the strip or the pop-up card.
const ic = (name, cls = '') => `<svg class="fp-ic${cls ? ' ' + cls : ''}" viewBox="0 0 20 20" aria-hidden="true">${name ? `<use href="#fp-i-${name}"/>` : '<text x="10" y="15" text-anchor="middle">?</text>'}</svg>`;

// ---------- what a room holds ----------
// Its virus in one line: "Level 10 Wiper · TOLLGATE · Lockout set" (the set once you've fought it).
function whoOf(s, room) {
  const R = s.rooms, f = fightOf(s, room, room.mirror ? 'mirror' : null);
  if (room.wild) {
    // A wild room's spawn (netrooms.mjs): the named ones by name (a boss, a bounty), the rest by family.
    const name = f.name || (f.boss ? BOSSES[f.boss]?.name : null), fam = familyName(f.family) || f.family || '?', by = f.author ? (AUTHORS[f.author]?.name || f.author).toUpperCase() : '';
    const short = name || `${f.elite ? 'Elite ' : ''}${fam}`;
    return { short, fam, sub: `${name ? `${f.boss ? 'Boss' : 'Elite'} · ` : by ? `${by} · ` : ''}lv ${f.level}`, line: `Level ${f.level} ${name || fam}${by && !name ? ` · ${by}` : ''}` };
  }
  if (room.kind === 'guard') { const G = GUARDS[room.guard]; return { short: G.name, fam: G.name, sub: `${G.ice ? 'Kestrel ICE' : 'Guard'} · lv ${f.level}`, line: `Level ${f.level} ${G.name}${G.ice ? ' · Kestrel ICE' : ''}` }; }
  if (room.kind === 'core') { const n = f.name || BOSSES[RESIDENT].name; return { short: n, fam: n, sub: `The Resident · lv ${f.level}`, line: `Level ${f.level} ${n} · the Resident` }; }
  if (room.kind === 'nest') return { short: 'Crawler and its brood', fam: 'Crawler', sub: `lv ${f.level}`, line: `Level ${f.level} Crawler and its brood` };
  const elite = room.kind === 'elite' || room.mirror;
  const by = (AUTHORS[room.author]?.name || '?').toUpperCase(), short = `${elite ? 'Elite ' : ''}${familyName(room.family)}`;
  // Never its attack set: you read that on the board once you engage (the Codex keeps the sets you've faced).
  return { short, sub: `${by} · lv ${f.level}`, line: `Level ${f.level} ${familyName(room.family)} · ${by}`, fam: familyName(room.family) };
}
const mirrorLine = (s, room) => `A mirror. A level ${fightOf(s, room, 'mirror').level} elite ${familyName(room.family)} waits behind it.`;
const guardOf = (s, vaultId) => roomList(s).find((x) => x.key === vaultId);
const huntName = (h) => HUNTERS[h.kind].name;
// A tile's tooltip: the room's name, what it holds (when the tile can't show it), and one rule.
function tileTip(s, room, marks = net(s, 'marks') || {}) {
  const h = hunterOf(s), hunted = hunterSeen(s) && h.at === room.id, x = exfilShown(s)?.at === room.id ? exfilShown(s) : null;
  const job = marks[room.id]; // the address is on the chip itself: the tooltip says the job, once
  if (!known(s, room.id)) {
    const cost = stepCost(s, room), th = R_th(s)[room.id];
    return ['Unknown room', job ? `Contract: ${job}.` : '', th ? `${th.mark} ${th.text}` : '', cost ? `A first step in costs ${cost} Signal.` : '', hunted ? `The ${huntName(h)} is here.` : '', x ? `${x.name}, an Exfil, is here.` : ''].filter(Boolean).join('\n');
  }
  const name = labelOf(s, room);
  if (x) return `${name}: ${x.name}, an Exfil uploading a stolen archive.\n${exfilNext(s) ? 'It runs from you. Corner it.' : 'Cornered: walk in and break its Uplink.'}`;
  const { who, rule } = aboutOf(s, room), th = R_th(s)[room.id];
  const body = [who, rule, job ? `Contract: ${job}.` : '', th ? `${th.mark} ${th.text}` : ''].filter(Boolean).join('\n');
  return body ? `${name}: ${body}` : name;
}
// What a room can cost you to walk into: its badge's −N, on a room you can walk into, else 0.
const stepCost = (s, room) => (exits(s).some((x) => x.id === room.id) ? moveCost(s, room) : 0);
// What a room you've discovered holds, and the one rule that matters about it (the tooltip and the pop-up say the same).
function aboutOf(s, room) {
  const R = s.rooms, g = R.graph, h = hunterOf(s);
  const hunted = hunterSeen(s) && h.at === room.id;
  let who = '';
  if (fightKind(room) || room.mirror) who = room.mirror ? mirrorLine(s, room) : whoOf(s, room).line;
  else if (room.kind === 'den') who = g.hunter === 'track' ? 'The Tracker sleeps here.' : 'The Patroller walks its loop from here.';
  else if (room.kind === 'cache') who = 'Credits and code, sometimes a script.';
  else if (room.kind === 'stash') who = 'The server\'s code, back every two hours.';
  else if (room.kind === 'secret') who = 'A stash: credits and code, now and then a script or a blue.';
  else if (room.kind === 'purse') who = cacheFull(s, room) ? `A few credits. Taken as you walk in.` : 'Taken. It fills again when the server reboots.';
  else if (room.nook) who = room.log ? 'A log. Read it.' : nookLive(s, room, R_th(s)) ? 'Someone, or something, waits here.' : 'Quiet now.';
  else if (room.kind === 'empty') who = 'Nothing here.';
  else if (room.kind === 'vault' && !opened(s, room)) who = room.farm ? 'Opens once the Foreman and the Heatsink are down.' : R.visit?.keys.includes(room.id) ? 'Your key fits.' : `Its key is in ${guardOf(s, room.id) ? labelOf(s, guardOf(s, room.id)) : 'an elite'}.`;
  else if (room.kind === 'rest') who = `Restores ${Math.round(R.max * ROOMS.rest)} Signal, once a visit.`;
  else if (isPuzzle(room.kind)) who = `${PUZZLES[room.kind].title}. ${PUZZLES[room.kind].rule}`;
  if (isSocket(s, room) && socketOpen(s, room)) { const p = programIn(s, room.id); who = p ? `${PROGRAMS[p].name}: ${PROGRAMS[p].rule}${socketOff(s, room) ? ' (offline)' : ''}` : room.kind === 'core' ? 'The core socket: build a program here.' : 'An open socket: build a program here.'; }
  const denEdge = g.hunter === 'track' && g.den && neighbours(g, g.den).includes(room.id) && h && !h.awake && !h.down;
  const rule = hunted ? `The ${huntName(h)} is here: walk in and you fight it.`
    : denEdge ? 'Walking in wakes the Tracker.'
      : R.rare[room.id] && isUp(s, room) ? `Rare spawn: ${ROOMS.rareLevel} levels up. It usually drops a blue or better.`
        : room.kind === 'guard' && room.key && !R.opened[room.key] ? `Carries the ${g.rooms[room.key].path} key.`
          : room.kind === 'boss' ? 'A crew boss: built for a crew.'
          : room.kind === 'nest' ? `Optional. A kill pays ${ROOMS.nest.parts} components.`
          : room.kind === 'secret' ? 'Optional. It fills again two hours after you take it.'
          : room.queue && R.kind === 'Mailhub' && fightKind(room) ? 'A Spam Flood joins its fights.'
            : room.kind === 'elite' ? 'Enrages from cycle 9. Drops a blue or better.'
              : room.kind === 'core' && !coreOpen(s) ? sealedLine(s)
                : room.kind === 'cache' && !room.mirror ? 'One in four is bait: you see which when you walk in.'
                  : room.kind === 'vault' && room.id === g.vaults[0] && !opened(s, room) ? 'Opening it unseals the Core.'
                    : ['rest', 'entry'].includes(room.kind) ? 'The hunter never comes in.' : '';
  return { who, rule };
}
// A room's state in a word or two (the pop-up card's state line): a countdown, or a word.
function stateOf(s, room) {
  const R = s.rooms, kind = known(s, room.id);
  if (!kind) return { word: 'unknown', cls: 'dim' };
  if (room.kind === 'core' && !coreOpen(s)) return { word: 'sealed', cls: 'dim' };
  if (isSocket(s, room) && socketOpen(s, room)) { const p = programIn(s, room.id); return p ? { word: socketOff(s, room) ? 'offline' : 'running', cls: socketOff(s, room) ? 'dim' : '' } : { word: room.kind === 'core' ? 'core socket' : 'open socket', cls: '' }; }
  if (isPuzzle(room.kind)) { const st = puzzleState(s, room); return st === 'ready' ? { word: 'ready', cls: '' } : st === 'live' ? { word: 'in play', cls: 'next' } : { word: st === 'won' ? 'solved' : 'failed', cls: st === 'won' ? 'dim' : 'hot', at: refillAt(s, room) }; }
  if (fightKind(room)) return isUp(s, room) ? { word: R.rare[room.id] ? '★ rare' : 'live', cls: R.rare[room.id] ? 'next' : 'hot' } : { word: 'cleared', cls: 'dim', at: backAt(s, room) };
  if (room.kind === 'cache' || room.kind === 'secret') return cacheFull(s, room) ? (room.mirror ? { word: 'mirror', cls: 'hot' } : { word: 'stocked', cls: '' }) : { word: 'empty', cls: 'dim', at: refillAt(s, room) };
  if (room.kind === 'vault') return opened(s, room) ? { word: 'open', cls: 'dim' } : R.visit?.keys.includes(room.id) ? { word: 'key fits', cls: 'next' } : { word: 'locked', cls: '' };
  if (room.kind === 'stash') return cacheFull(s, room) ? { word: 'stocked', cls: '' } : { word: 'empty', cls: 'dim', at: refillAt(s, room) };
  if (room.kind === 'purse') return cacheFull(s, room) ? { word: 'stocked', cls: '' } : { word: 'taken', cls: 'dim' };
  if (room.nook) return nookLive(s, room, R_th(s)) ? { word: room.log ? 'unread' : 'waiting', cls: 'next' } : { word: room.log ? 'read' : 'quiet', cls: 'dim' };
  if (room.kind === 'empty') return { word: s.rooms.cleared[room.id] ? 'empty' : '', cls: 'dim' };
  if (room.kind === 'rest') return R.visit?.rested ? { word: 'rested', cls: 'dim' } : { word: '', cls: '' };
  return { word: '', cls: '' };
}

// ---------- the map ----------
// A chip's geometry, wide (the spine runs left to right) or tall (top to bottom, for phones: smaller chips, closer):
// the grid cell (w, h), the chip and its cut corners (nw, nh, ch), the icon's scale and top (ic, icY), the name plate
// and its type (plW, plH, plY, fs, ls), the respawn ring's radius (rr) and the skull's pixel (px).
const GEO = {
  wide: { w: 168, h: 150, nw: 112, nh: 92, ch: 10, ic: 1.7, icY: 13, plW: 88, plH: 17, plY: 62, fs: 10, ls: 1.2, rr: 13, px: 2.8, afs: 13 },
  tall: { w: 112, h: 128, nw: 96, nh: 84, ch: 9, ic: 1.45, icY: 13, plW: 84, plH: 16, plY: 55, fs: 10, ls: 0.6, rr: 10, px: 2.4, afs: 16 },
};
const PAD = 24; // around the grid: room for the badges that sit on a chip's edge
// Grid to pixels.
function frame(s, tall) {
  const G = GEO[tall ? 'tall' : 'wide'], rooms = roomList(s), xs = rooms.map((r) => (tall ? -r.y : r.x)), ys = rooms.map((r) => (tall ? r.x : r.y));
  const x0 = Math.min(...xs), y0 = Math.min(...ys), cols = Math.max(...xs) - x0 + 1, rows = Math.max(...ys) - y0 + 1;
  const at = (r) => ({ x: ((tall ? -r.y : r.x) - x0) * G.w + G.w / 2, y: ((tall ? r.x : r.y) - y0) * G.h + G.h / 2 });
  return { at, G, width: cols * G.w, height: rows * G.h };
}
const distOf = (g, a, b) => { const d = { [a]: 0 }, q = [a]; while (q.length) { const x = q.shift(); if (x === b) return d[x]; for (const y of neighbours(g, x)) if (!(y in d)) { d[y] = d[x] + 1; q.push(y); } } return null; };
// The hunter's next room, when you can see it go there.
function huntStep(s) {
  const R = s.rooms, h = hunterOf(s), here = R.at;
  if (!h || h.down || !here) return null;
  const next = hunterNext(s, h), near = hunterSeen(s, h);
  return next && near && (seenOf(s, next) || classOf(s) === 'infiltrator') ? next : null;
}
const n1 = (v) => +v.toFixed(1);
// A chip's outline: a rectangle with its corners cut.
const chipPts = (x, y, hw, hh, c) => [[x - hw + c, y - hh], [x + hw - c, y - hh], [x + hw, y - hh + c], [x + hw, y + hh - c], [x + hw - c, y + hh], [x - hw + c, y + hh], [x - hw, y + hh - c], [x - hw, y - hh + c]].map(([a, b]) => `${n1(a)},${n1(b)}`).join(' ');
const hashOf = (str) => { let x = 7; for (const c of str) x = (x * 31 + c.charCodeAt(0)) % 233280; return x; };
function mapSvg(s, tall, pop = null) {
  const R = s.rooms, g = R.graph, { at, G, width, height } = frame(s, tall), here = R.at, h = hunterOf(s);
  const reach = new Set(exits(s).map((x) => x.id)), walked = R.visit?.walked || {};
  const shown = (id) => !!seenOf(s, id), found = (id) => known(s, id);
  // A Patroller's beat, once you've seen any room of it (an Infiltrator sees all of it): its traces' beds run red.
  const beat = new Set();
  if (g.route && (classOf(s) === 'infiltrator' || g.route.some(found))) {
    const ids = g.ping ? g.route : [...g.route, g.route[0]];
    for (let i = 1; i < ids.length; i++) beat.add([ids[i - 1], ids[i]].sort().join('|'));
  }
  // Traces: a dark bed and a thin line between two rooms on the map. Out of your room (an exit, known or not), amber
  // and flowing over a faint wider glow; any other link to an unknown room, dotted. A hop (a Relay's) bows out.
  const lines = linksOf(g).filter(([a, b]) => shown(a) && shown(b)).map(([a, b]) => {
    const p = at(g.rooms[a]), q = at(g.rooms[b]), hop = (g.hops || []).some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    const live = !!here && ((a === here && reach.has(b)) || (b === here && reach.has(a))), fog = !live && (!found(a) || !found(b)), trod = R.at && walked[a] && walked[b];
    const d = hop ? `M${p.x} ${p.y} Q${n1((p.x + q.x) / 2 + (q.y - p.y) * 0.35)} ${n1((p.y + q.y) / 2 - (q.x - p.x) * 0.35)} ${q.x} ${q.y}` : '';
    const shape = (cls) => (hop ? `<path class="${cls}" d="${d}"/>` : `<line class="${cls}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`);
    const out = shape(`fp-bed${beat.has([a, b].sort().join('|')) ? ' beat' : ''}`) + (live ? shape('fp-under') : '') + shape(`fp-link ${fog ? 'fog' : live ? 'live' : trod ? 'walked' : 'seen'}${hop ? ' hop' : ''}`);
    return revealing(s, a) || revealing(s, b) ? `<g class="reveal">${out}</g>` : out; // a hidden room's trace fades in with it
  }).join('');
  // A Tunnel's link to the entry (a program, R2): a dashed amber arc, yours to walk free; the hunter never takes it.
  const tun = tunnelOf(s), tg = tun && shown(tun) && shown(g.entry) ? [at(g.rooms[g.entry]), at(g.rooms[tun])] : null;
  const tunnel = tg ? `<path class="fp-tunnel" d="M${tg[0].x} ${tg[0].y} Q${n1((tg[0].x + tg[1].x) / 2 + (tg[1].y - tg[0].y) * 0.3)} ${n1((tg[0].y + tg[1].y) / 2 - (tg[1].x - tg[0].x) * 0.3)} ${tg[1].x} ${tg[1].y}"><title>Tunnel: a free step to the entry</title></path>` : '';
  // The hunter's next step: one red dashed arrow, bowed off the trace, from its room into the next; the Exfil's, amber.
  const next = huntStep(s), exfil = exfilShown(s), flee = exfilStep(s);
  let arrow = next ? routeSvg(at(g.rooms[h.at]), at(g.rooms[next]), G, '') : '';
  if (flee) arrow += routeSvg(at(g.rooms[exfil.at]), at(g.rooms[flee]), G, 'exfil');
  // A thread's file walking here (threads.mjs): an amber dashed arrow into the room it walks into next.
  const files = filesHere(s);
  for (const f of files) if (f.next && shown(f.at) && shown(f.next)) arrow += routeSvg(at(g.rooms[f.at]), at(g.rooms[f.next]), G, 'exfil');
  // Out of sight but within two rooms: the room at the edge of your fog pulses red (the one between, nearest you).
  let near = null;
  if (h && !h.down && here && !hunterSeen(s, h)) {
    const d = distOf(g, here, h.at);
    if (d != null && d <= 2) near = neighbours(g, h.at).filter((id) => shown(id) && id !== here).sort((a, b) => (distOf(g, here, a) ?? 9) - (distOf(g, here, b) ?? 9))[0] || null;
  }
  const ctx = { reach, next, pop, near, G, marks: net(s, 'marks') || {}, th: R_th(s), files };
  const rooms = roomList(s).filter((r) => shown(r.id)).map((room) => roomSvg(s, room, at(room), ctx)).join('');
  const bits = here ? bitsSvg(at(g.rooms[here]), G, here) : '';
  const vw = width + 2 * PAD, vh = height + 2 * PAD, vb = `${-PAD} ${-PAD} ${vw} ${vh}`;
  return `<svg class="fp-svg ${tall ? 'tall' : 'wide'}" viewBox="${vb}" data-vb="${vb}" width="${vw}" height="${vh}" preserveAspectRatio="xMidYMid meet" style="--w:${vw}px;--h:${vh}px" role="group" aria-label="Room map of ${esc(R.name)}">${lines}${tunnel}${rooms}${arrow}${bits}</svg>`;
}
// A dashed arrow, bowed off the trace, from one room into the next (the hunter's red, the Exfil's amber).
function routeSvg(p, q, G, kind) {
  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len, ny = dx / len;
  if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; } // over the top of a row, down the left of a column (the respawn ring is on the right)
  // It leaves the chip from the face on the bow's side (beside the skull) and lands on the same face of the next.
  const ux = dx / len, uy = dy / len, along = Math.abs(ux) > Math.abs(uy) ? G.nw / 2 : G.nh / 2, ext = Math.abs(ny) > Math.abs(nx) ? G.nh / 2 : G.nw / 2;
  const bow = Math.min(48, Math.max(28, len * 0.22)), cx = n1((p.x + q.x) / 2 + nx * (ext + bow)), cy = n1((p.y + q.y) / 2 + ny * (ext + bow));
  const a = { x: n1(p.x + ux * along * 0.45 + nx * (ext + 4)), y: n1(p.y + uy * along * 0.45 + ny * (ext + 4)) }, b = { x: n1(q.x - ux * along * 0.45 + nx * (ext + 7)), y: n1(q.y - uy * along * 0.45 + ny * (ext + 7)) };
  return `<path class="fp-route${kind ? ' ' + kind : ''}" d="M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}" marker-end="url(#fp-arrow${kind ? '-' + kind : ''})"/>`;
}
// The Exfil: a gold archive with an upload arrow in a small dark badge (filled gold once it's cornered).
const exfilSvg = (cx, cy, k, cornered) => `<g class="fp-exfil${cornered ? ' cornered' : ''}" transform="translate(${n1(cx - 10 * k)} ${n1(cy - 10 * k)}) scale(${k})"><rect class="bg" x="0" y="0" width="20" height="20" rx="2"/><use href="#fp-i-archive" x="1.5" y="1.5" width="17" height="17"/></g>`;
// The 1s and 0s drifting off the room you're in: they start just outside its edge and drift 14 to 32 out.
function bitsSvg(p, G, id) {
  let seed = hashOf(id);
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280, hw = G.nw / 2, hh = G.nh / 2;
  let out = '<g class="fp-bits" aria-hidden="true">';
  for (let i = 0; i < 12; i++) {
    const a = rnd() * Math.PI * 2, e = Math.min(hw / Math.max(1e-3, Math.abs(Math.cos(a))), hh / Math.max(1e-3, Math.abs(Math.sin(a)))) + 7, d = 14 + rnd() * 18;
    out += `<text x="${n1(p.x + Math.cos(a) * e)}" y="${n1(p.y + Math.sin(a) * e + 3)}" text-anchor="middle" style="--dx:${n1(Math.cos(a) * d)}px;--dy:${n1(Math.sin(a) * d)}px;--d:${(-rnd() * 2.6).toFixed(2)}s;--t:${(2.2 + rnd() * 1.2).toFixed(2)}s">${rnd() < 0.5 ? '0' : '1'}</text>`;
  }
  return out + '</g>';
}
// The hunter: a glitched red pixel skull (11×9: eye sockets, a nose gap, teeth; the jaw rows knocked sideways, a dark
// scanline through it, a couple of stray pixels) in a small dark badge.
const SKULL = ['..1111111..', '.111111111.', '11111111111', '11...1...11', '11...1...11', '11111111111', '.1111.1111.', '..1111111..', '..1.1.1.1..'];
const skulls = {};
function skullSvg(cx, cy, px, asleep) {
  if (!skulls[px]) {
    const shift = { 7: 1, 8: -1 };
    let d = '';
    SKULL.forEach((row, j) => [...row].forEach((c, i) => { if (c === '1') d += `M${n1((i + (shift[j] || 0)) * px)} ${n1(j * px)}h${px}v${px}h-${px}z`; }));
    skulls[px] = `<rect class="bg" x="-4" y="-4" width="${n1(11 * px + 8)}" height="${n1(9 * px + 8)}" rx="2"/><path class="px" d="${d}"/>`
      + `<rect x="-3" y="${n1(6.55 * px)}" width="${n1(11 * px + 6)}" height="1.4" fill="#140503"/><rect x="${n1(7.5 * px)}" y="${n1(0.4 * px)}" width="${n1(4 * px)}" height="${n1(0.5 * px)}" fill="#ffd2c8" opacity=".85"/><rect class="px" x="${n1(-1 * px)}" y="${n1(2.4 * px)}" width="${n1(2 * px)}" height="${n1(0.5 * px)}" opacity=".6"/>`;
  }
  return `<g class="fp-skull${asleep ? ' asleep' : ''}" transform="translate(${n1(cx - 5.5 * px)} ${n1(cy - 4.5 * px)})">${skulls[px]}</g>`;
}
// A name plate's type: its letter-spacing (then its size) gives way so a long name fits the plate.
function plateType(name, G) {
  const room = G.plW - 8, cw = 0.6, n = name.length;
  if (n * (G.fs * cw + G.ls) <= room) return { fs: G.fs, ls: G.ls };
  if (n * G.fs * cw <= room) return { fs: G.fs, ls: n1(room / n - G.fs * cw) };
  return { fs: n1(room / n / cw), ls: 0 };
}
const tagW = (t) => 18 + t.length * 6;
// A hidden room that just opened (floorplan.mjs revealSecret): its chip fades in the first time the map draws it this
// visit, and only then (a view's memory, never saved).
const REVEALED = new Map();
function revealing(s, id) {
  if (!s.rooms?.visit?.revealed?.includes(id)) return false;
  const k = `${s.rooms.id}:${s.rooms.visits}:${id}`, t = now();
  if (!REVEALED.has(k)) REVEALED.set(k, t);
  return t - REVEALED.get(k) < 1600;
}
function roomSvg(s, room, p, { reach, next, pop, near, G, marks, th = {}, files = [] }) {
  const R = s.rooms, g = R.graph, kind = known(s, room.id), h = hunterOf(s);
  const sock = kind && isSocket(s, room) && socketOpen(s, room), prog = sock ? programIn(s, room.id) : null; // an open socket (a held server's Core too) and what runs in it
  const here = R.at === room.id, can = reach.has(room.id), fight = kind && fightKind(room) && !sock, up = fight && isUp(s, room), down = fight && !up;
  const hunted = hunterSeen(s) && h.at === room.id;
  const sealed = kind && room.kind === 'core' && !coreOpen(s);
  const stocked = STOCKED.includes(room.kind);
  const exfil = exfilShown(s)?.at === room.id;
  const full = kind && stocked && cacheFull(s, room), empty = kind && stocked && !full;
  const used = empty || (kind && room.kind === 'rest' && !!R.visit?.rested) || (kind && room.kind === 'vault' && opened(s, room));
  const live = up || (full && !!room.mirror);
  const denEdge = kind && g.hunter === 'track' && g.den && neighbours(g, g.den).includes(room.id) && h && !h.awake && !h.down;
  // Its colour: you, a live threat, used up (or a plain room you've cleared), or something there for you.
  const tone = here ? 'you' : !kind ? 'fog' : room.nook ? (nookLive(s, room, th) ? 'amber' : 'gray') : live ? 'hot' : down || used || (['entry', 'junction', 'den', 'empty'].includes(room.kind) && R.cleared[room.id]) ? 'gray' : 'amber';
  const cls = ['fp-room', revealing(s, room.id) ? 'reveal' : '', `k-${kind ? room.kind : 'fog'}`, `t-${tone}`, prog ? `prog p-${prog}` : sock ? 'open' : '', prog && socketOff(s, room) ? 'off' : '', here ? 'here' : can ? 'reach' : kind ? 'seen' : 'shape', up ? 'up' : '', down ? 'down' : '', used ? 'used' : '', room.mirror && kind ? 'mirror' : '', sealed ? 'sealed' : '', hunted ? 'hunted' : '', pop === room.id ? 'sel' : ''].filter(Boolean).join(' ');
  // A room you can walk into walks on one click (Enter too); any other room on the map opens its pop-up.
  const attrs = can ? ` data-rooms="go" data-arg="${esc(room.id)}" tabindex="0" role="button"` : ` data-fp-sel="${esc(room.id)}" tabindex="0" role="button" aria-haspopup="dialog"`;
  const hw = G.nw / 2, hh = G.nh / 2, x0 = n1(p.x - hw), y0 = n1(p.y - hh), pts = chipPts(p.x, p.y, hw, hh, G.ch);
  let out = `<g class="${cls}" data-room="${esc(room.id)}"${attrs}${pop === room.id ? '' : ` title="${esc(tileTip(s, room, marks))}"`} aria-label="${esc(kind ? labelOf(s, room) : 'Unknown room')}">`;
  // You: a soft teal glow and a pulsing outline. The hunter just out of sight next door: a red pulse.
  if (here) out += `<polygon class="fp-you-glow" points="${pts}" filter="url(#fp-glow)"/><polygon class="fp-you-ring" points="${pts}"/>`;
  if (near === room.id) out += `<polygon class="fp-near" points="${pts}" title="${esc(`${huntName(h)}: just out of sight.`)}"/>`;
  if (!kind) out += `<polygon class="fp-body" points="${pts}"/><text class="fp-q" x="${p.x}" y="${n1(p.y + 8)}" text-anchor="middle">?</text>`;
  else {
    // The chip, its hairline, the icon (the largest thing on it) and the name plate under it, centred as one block.
    const sz = n1(24 * G.ic), name = (room.kind === 'socket' && prog ? PROGRAMS[prog].name : plateOf(s, room)).toUpperCase(), t = plateType(name, G);
    out += `<g filter="url(#fp-shadow)"><polygon class="fp-body" points="${pts}"/></g><polygon class="fp-hair" points="${chipPts(p.x, p.y, hw * 0.9, hh * 0.9, G.ch * 0.9)}"/>`;
    // A Stash is a minor thing: a smaller mark, lower on the chip.
    const isz = room.kind === 'purse' ? n1(sz * 0.62) : sz, iy = room.kind === 'purse' ? n1(y0 + G.icY + (sz - isz) * 0.7) : n1(y0 + G.icY);
    out += `<use class="fp-icon" href="#fp-i-${iconOf(s, room)}" x="${n1(p.x - isz / 2)}" y="${iy}" width="${isz}" height="${isz}"${tone === 'gray' || room.kind === 'empty' ? '' : ' filter="url(#fp-glow)"'}/>`;
    out += `<rect class="fp-plate" x="${n1(p.x - G.plW / 2)}" y="${n1(y0 + G.plY)}" width="${G.plW}" height="${G.plH}" rx="1"/><text class="fp-name" x="${p.x}" y="${n1(y0 + G.plY + G.plH / 2 + t.fs * 0.36)}" text-anchor="middle" font-size="${t.fs}" letter-spacing="${t.ls}">${esc(name)}</text>`;
  }
  // Top left: the tags.
  const tags = [];
  if (kind) {
    if (room.kind === 'guard' && room.key && !R.opened[room.key] && !R.visit?.keys.includes(room.key)) tags.push(['KEY', 'key']);
    if (room.kind === 'vault' && !opened(s, room)) tags.push(R.visit?.keys.includes(room.id) ? ['KEY FITS', 'key'] : ['LOCKED', 'lock']);
    if (sealed) tags.push(['SEALED', 'hot']);
    if (up && R.rare[room.id]) tags.push(['★', 'rare']);
    if (denEdge) tags.push(['WAKES', 'hot']);
    if (room.kind === 'nest') tags.push(['NEST', 'rare']);
    if (isPuzzle(room.kind)) { const st = puzzleState(s, room); if (st === 'live') tags.push(['IN PLAY', 'rare']); else if (st === 'won') tags.push(['SOLVED', 'done']); else if (st === 'lost') tags.push(['FAILED', 'hot']); }
  }
  let tx = x0 - 6;
  for (const [t, c] of tags) { const w = tagW(t); out += `<g class="fp-tag ${c}"><rect x="${n1(tx)}" y="${n1(y0 - 8)}" width="${w}" height="16" rx="2"/><text x="${n1(tx + w / 2)}" y="${n1(y0 + 3.5)}" text-anchor="middle">${t}</text></g>`; tx += w + 4; }
  // Top centre: YOU, and the hunter's skull (beside YOU when it's on you).
  if (here) { const ux = n1(Math.max(p.x, tx + 20)); out += `<g class="fp-you-tab"><rect x="${n1(ux - 20)}" y="${n1(y0 - 9)}" width="40" height="16" rx="2"/><text x="${ux}" y="${n1(y0 + 3)}" text-anchor="middle">YOU</text></g>`; tx = ux + 24; }
  if (hunted) { const half = 5.5 * G.px + 4; out += skullSvg(n1(Math.max(p.x, tx + half)), n1(y0 - 2), G.px, h.kind === 'track' && !h.awake && !h.returning); }
  if (exfil) { const k = G.px / 2.2, half = 10 * k; out += exfilSvg(n1(Math.max(p.x, tx + half + 2)), n1(y0 + 1), k, !exfilNext(s)); tx += 2 * half + 6; }
  // A thread's mark (threads.mjs): an amber ! where one starts, ? where the step you're on sends you.
  if (th[room.id]) out += questSvg(Math.max(p.x, tx + 12), y0 - 1, th[room.id]);
  // Top right: the live light, and what a first step in costs.
  if (live && !here) out += `<circle class="fp-live" cx="${n1(x0 + G.nw - 18)}" cy="${n1(y0 + 16)}" r="3.5" filter="url(#fp-glow)"/>`;
  const cost = can ? moveCost(s, room) : 0;
  if (cost) { const t = `−${cost}`, w = tagW(t) - 6, rx = n1(x0 + G.nw + 4 - w); out += `<g class="fp-cost"><rect x="${rx}" y="${n1(y0 - 8)}" width="${w}" height="16" rx="2"/><text x="${n1(rx + w / 2)}" y="${n1(y0 + 4)}" text-anchor="middle">${t}</text></g>`; }
  // Bottom left: a program's badge: the slot it sits in (a socket room's chip shows the program itself), or, on a held
  // server's Core, the program it runs.
  if (prog) { const k = 18, bx = n1(x0 - 4), by = n1(y0 + G.nh - k + 4); out += `<g class="fp-prog"><rect x="${bx}" y="${by}" width="${k}" height="${k}" rx="2"/><use href="#fp-i-${room.kind === 'socket' ? 'socket' : prog}" x="${n1(bx + 2)}" y="${n1(by + 2)}" width="${k - 4}" height="${k - 4}"/></g>`; }
  // Bottom left: its address (C2), a small plate on the chip's bottom edge (clear of a program's badge), dim; amber with
  // the contract's mark when a job points here.
  const addr = addrOf(s, room.id), job = marks[room.id];
  let addrEnd = x0; // where the address plate ends (SCAN keeps clear of it)
  if (addr) {
    const fs = G.afs, ph = fs + 4, mark = job ? fs + 1 : 0, pw = n1(addr.length * fs * 0.62 + 8 + (mark ? mark + 2 : 0)), px = n1(x0 + (prog ? 20 : 10)), py = n1(y0 + G.nh - ph / 2);
    addrEnd = px + pw;
    out += `<g class="fp-addr${job ? ' job' : ''}"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="2"/><text x="${n1(px + 4)}" y="${n1(py + ph / 2 + fs * 0.36)}" font-size="${fs}">${esc(addr)}</text>`
      + (mark ? `<use href="#fp-i-contract" x="${n1(px + pw - mark - 3)}" y="${n1(py + (ph - mark) / 2)}" width="${mark}" height="${mark}"/>` : '') + '</g>';
  }
  // Bottom right: the respawn ring (a fight down, a cache empty) fills back up, its countdown under it.
  const from = down && downAt(s, room) != null ? downAt(s, room) : empty ? R.taken[room.id] : null;
  const back = from == null ? null : down ? backAt(s, room) : refillAt(s, room);
  if (back != null) {
    const cx = n1(x0 + G.nw - 2), cy = n1(y0 + G.nh - 2), r = G.rr;
    out += `<g class="fp-respawn ${stocked && !room.mirror ? 'amber' : 'hot'}"><circle class="bg" cx="${cx}" cy="${cy}" r="${r + 3}"/><circle class="track" cx="${cx}" cy="${cy}" r="${r}"/>`
      + `<circle class="arc" cx="${cx}" cy="${cy}" r="${r}" pathLength="100" transform="rotate(-90 ${cx} ${cy})" data-ring-from="${from}" data-ring-at="${back}"/>`
      + `<text x="${cx}" y="${n1(cy + r + 13)}" text-anchor="middle"><tspan data-at="${back}" data-fmt="s"></tspan></text></g>`;
  }
  // Bottom right: SCAN on a room next to you that scan reads (run.mjs scanButton, through netrooms.mjs), shown on hover
  // or focus (always on a phone's map, floorplan.css). It runs scan <room>, as the prompt does. Its cost as the corner's
  // is, −1, or FREE for an Infiltrator. A room that's down has its ring there instead, so it never shows on one. Where
  // the address plate leaves no room on the edge (the tall map's bigger plate), it hangs just under the chip instead.
  const sc = can && kind && net(s, 'scan', room);
  if (sc) {
    const t = `SCAN ${sc.free ? 'FREE' : `−${sc.cost}`}`, w = tagW(t) - 4, bx = n1(x0 + G.nw + 4 - w), by = n1(y0 + G.nh + (bx < addrEnd + 3 ? 10 : -8));
    const tip = sc.short ? 'Not enough Signal to scan.' : `Scan: read its virus card before you walk in.\n${sc.free ? 'As an Infiltrator, you scan free and read deeper.' : `It costs ${sc.cost} Signal.`}`;
    out += `<g class="fp-scanbtn${sc.short ? ' off' : ''}" ${sc.short ? 'aria-disabled="true"' : `data-command="${esc(sc.cmd)}"`} role="button" tabindex="0" title="${esc(tip)}" aria-label="${esc(sc.short ? tip : `Scan ${labelOf(s, room)}`)}"><rect x="${bx}" y="${by}" width="${w}" height="16" rx="2"/><text x="${n1(bx + w / 2)}" y="${n1(by + 12)}" text-anchor="middle">${t}</text></g>`;
  }
  // A thread's file in this room: its badge and Integrity on the chip's bottom edge.
  for (const f of files) if (f.at === room.id) out += fileSvg(s, p.x + G.nw * 0.2, y0 + G.nh + 8, f.t, G.nw > 100 ? 1.25 : 1.1); // under the chip, clear of its plate
  return out + '</g>';
}

// ---------- the strip ----------
function hudMarkup(s) {
  const R = s.rooms, sig = signalNow(s), max = R.max, f = max ? sig / max : 0, lvl = f <= 0.3 ? 'low' : f <= 0.6 ? 'mid' : 'ok';
  const prog = progressOf(s), h = hunterOf(s), K = net(s, 'kind') || KINDS[R.kind], bag = scriptsOf(s), author = (AUTHORS[R.author]?.name || R.author).toUpperCase();
  const step = pctOf(s, R.floor >= 5 ? ROOMS.moveDeep : ROOMS.move), stepNew = pctOf(s, R.floor >= 5 ? ROOMS.moveNewDeep : ROOMS.moveNew);
  const scripts = bag.map((id) => `<li class="fp-perk r-${TIER[SCRIPTS[id].rarity]}" title="${esc(scriptTip(id))}">${esc(SCRIPTS[id].name)}</li>`).join('');
  const hunt = R.at && h ? `<span class="fp-stat fp-hunt${h.down ? ' out' : ''}" title="${esc(`${hunterLine(s)}\n${huntName(h)}: ${HUNTERS[h.kind].text} It moves only when you walk or wait.`)}">${ic('den')}<span class="lbl">${esc(huntName(h))}</span><b>${h.down ? 'down' : h.kind === 'track' && !h.awake && !h.returning ? 'asleep' : `moves in ${paceOf(s) - h.count}`}</b></span>` : '';
  const ml = R.at && exfilShown(s) ? `<span class="fp-stat fp-exfilstat" title="${esc(`${exfilLine(s)}\nAn Exfil is uploading a stolen archive off this server. It runs from you, a room for each of your moves. Corner it where it can't run, then walk in: its upload completes after ${CONFIG.exfil.escape} cycles.`)}">${ic('archive')}<span class="lbl">Exfil</span><b>${exfilNext(s) ? 'running' : 'cornered'}</b></span>` : '';
  const keys = R.at && R.visit?.keys.length ? `<span class="fp-stat fp-keys" title="Keys: each opens its vault, this visit only. Jack out and it goes back to the elite that held it.">${ic('key')}<b>${R.visit.keys.length}</b></span>` : '';
  const packed = R.world ? (s.run?.pack || []).map((f) => net(s, 'packLine', f)) : R.pack.map((id) => itemLabel(stashItem(s, id) || { name: '?' }));
  const pack = packed.length ? `<span class="fp-stat" title="${esc(`Pack: ${packed.join(', ')}.\nBanks when you jack out. Lost if your Signal hits 0.`)}"><span class="lbl">Pack</span><b>${packed.length}</b></span>` : '';
  // Contracts on this server, and how far along each is.
  const jobs = net(s, 'jobs') || [];
  const job = jobs.length ? `<span class="fp-stat fp-jobs${jobs.some((j) => j.ready) ? ' ready' : ''}" title="${esc(jobs.map((j) => `${j.title}: ${j.text}`).join('\n'))}">${ic('contract')}<span class="lbl">Contract${jobs.length > 1 ? 's' : ''}</span><b>${jobs.length > 1 ? jobs.length : esc(jobs[0].ready ? 'ready' : jobs[0].text.split('.')[0].slice(0, 28))}</b></span>` : '';
  const rule = ['a', 'b', 'c'].map((k) => `<button type="button" class="fp-rule${R.bossRule === k ? ' on' : ''}" data-rooms="bossrule" data-arg="${k}" aria-pressed="${R.bossRule === k}" title="${esc(`Boss rule ${k}: ${BOSS_RULES[k].name}.\n${BOSS_RULES[k].text}`)}">${k}</button>`).join('');
  // Wait and Jack out (Connect at home), always in reach at the strip's right.
  const c = connectOf(s);
  const acts = R.at
    ? btn('wait', 'Wait', { small: true, disabled: !!R.screen || active(s), tip: R.screen ? 'Wait: finish what is in front of you first.' : `Wait: the hunter takes its step${filesHere(s).length ? ', and the file you carry' : ''}. Costs nothing.` })
      + btn('jackout', 'Jack out', { small: true, hot: true, disabled: active(s), tip: 'Jack out: banks your pack. Signal rests at home.' })
    : btn('connect', 'Connect', { small: true, primary: true, disabled: !c.can, tip: c.can ? `Connect to ${R.name}.` : c.wait > 0 ? `${R.name} takes you back in ${fmtLeft(c.wait)}.` : `You need ${c.need} Signal to connect.` });
  return `<header class="fp-hud" aria-label="The server">
    <span class="fp-id" title="${esc(net(s, 'idTip') ?? `${R.name}: ${author} ${kindName(R.kind)}, level ${R.level}, floor ${R.floor}.\n${K.rule}: ${K.text}`)}"><span class="ico" ${icon('server')}></span><b>${esc(R.name)}</b><small>${esc(net(s, 'idLine') ?? `${kindName(R.kind)} · lv ${R.level} · ${K.rule}`)}</small></span>
    <div class="fp-sig ${lvl}" title="${esc(`Signal: carries from fight to fight and rests back at home.\nA room's first step each visit costs ${step}, or ${stepNew} into one you've never been in.`)}"><span class="lbl">Signal</span><span class="sigbar"><span style="width:${(f * 100).toFixed(1)}%"></span></span><strong>${sig}</strong><small>/${max}</small></div>
    <div class="fp-prog" title="${esc(`Rooms cleared for good: at ${Math.ceil(prog.total / 2)} the whole map is drawn, at ${prog.total} the server is Mapped.`)}"><span class="lbl">Rooms</span><span class="pbar"><span style="width:${(prog.done / prog.total) * 100}%"></span><i style="left:50%"></i></span><b>${prog.done}/${prog.total}</b>${R.mapped ? '<small class="fp-mapped">MAPPED</small>' : ''}</div>
    ${keys}${hunt}${ml}${pack}${job}${R.world && s.threads ? threadHud(s) : ''}
    <span class="fp-tools">${R.world ? '' : `<span class="fp-rules" role="group" aria-label="Boss rule"><span class="lbl" title="${esc(`Boss rule: how ${BOSSES[RESIDENT].name}'s ticks work. It applies to your next fight with it.`)}">Boss</span>${rule}</span>`}
    <ul class="fp-perks" aria-label="Scripts"><li class="lbl" title="Scripts: run one a fight, from the fight's tray. It takes no cycle.">Scripts ${bag.length}/${slotsOf(s)}</li>${scripts}</ul>
    <span class="fp-acts">${acts}</span></span>
  </header>`;
}
// Whether you can connect from home: Signal enough, and the reconnect wait over.
function connectOf(s) {
  const R = s.rooms, sig = signalNow(s), wait = R.reconnectAt - now(), need = Math.ceil(R.max * 0.25);
  return { sig, wait, need, can: wait <= 0 && sig >= need };
}

// ---------- the pop-up ----------
// Where you stand: a step, a wait, a fight, a visit. A room you clicked stays up until this changes.
const stampOf = (s) => `${s.rooms.visits}:${s.rooms.at || 'home'}:${s.rooms.visit?.moves ?? 0}:${s.rooms.stats.fights}`;
// The decision the room you're in (or home) puts in front of you, as a key, or null when there is none.
function needOf(s) {
  const R = s.rooms;
  if (!R) return null;
  if (!R.at) return `home:${R.visits}`;
  if (active(s)) return null;
  const room = hereOf(s), v = R.visit;
  const ask = !!R.screen || (isSocket(s, room) && socketOpen(s, room) && !programIn(s, room.id) && !socketOff(s, room)) || (roomRuns(s, room, 'defrag') && !v.bays?.[room.id] && sigOf(s) < R.max) || ((room.kind === 'cache' || room.kind === 'stash' || room.kind === 'secret' || isPuzzle(room.kind)) && cacheFull(s, room)) || (room.kind === 'vault' && (!opened(s, room) || (net(s, 'vaultLeft', room) || 0) > 0)) || (room.kind === 'rest' && !v.rested && restGain(s) > 0) || (room.kind === 'entry' && (net(s, 'entryFiles') || 0) > 0) || !!net(s, 'plantHere', room) || (R.world && !!s.threads && threadAsks(s, room));
  return ask ? `${stampOf(s)}:${R.screen?.kind || room.kind}` : null;
}
// The room the pop-up is on: the one you clicked, or the one you're in when it wants a decision you haven't closed.
// At home it sits on the entry.
export function popOf(s, ui = fpUi) {
  const R = s.rooms;
  if (!R || active(s)) return null;
  if (ui.sel && ui.selAt === stampOf(s) && R.graph.rooms[ui.sel] && (seenOf(s, ui.sel) || (!R.at && ui.sel === R.graph.entry))) return ui.sel;
  const need = needOf(s);
  return need && need !== ui.closed ? R.at || R.graph.entry : null;
}
// A click on a room on the map: its pop-up (a second click closes it).
export function pickRoom(s, id, ui = fpUi) {
  if (popOf(s, ui) === id) return closePop(s, ui);
  ui.sel = id; ui.selAt = stampOf(s);
}
// ×, Esc or the map's background: closed, and the decision in front of you stays closed until a new one.
export function closePop(s, ui = fpUi) {
  ui.sel = null; ui.selAt = null; ui.closed = needOf(s);
}

const btn = (verb, label, { arg = null, primary = false, hot = false, small = false, disabled = false, note = '', tip = '' } = {}) => `<button type="button" class="btn${small ? ' small' : ''}${primary ? ' primary' : ''}${hot ? ' hot-btn' : ''}" data-rooms="${verb}"${arg != null ? ` data-arg="${esc(arg)}"` : ''}${disabled ? ' disabled' : ''}${tip ? ` title="${esc(tip)}"` : ''}>${esc(label)}${note ? `<small>${esc(note)}</small>` : ''}</button>`;
const note = (html, cls = '') => `<p class="fp-note${cls ? ' ' + cls : ''}">${html}</p>`;
// What holds the room: its icon, its name, and its line.
const holder = (name, title, sub, tip = '', cls = 'hot') => `<div class="fp-virus ${cls}"${tip ? ` title="${esc(tip)}"` : ''}>${ic(name)}<span><b>${esc(title)}</b><small>${esc(sub)}</small></span></div>`;
// The card's one state line: the room's address (dim, first, like a number on a door), here, live, cleared ↻ 4:12,
// locked, stocked…
const kicker = (st, here = false, at = '') => {
  const words = [here ? 'you are here' : '', st.word].filter(Boolean).join(' · '), lead = at ? `<span class="fp-at">${esc(at)}</span>${words || st.at != null ? ' · ' : ''}` : '';
  return words || st.at != null || at ? `<h2 class="fp-kick ${st.cls}">${lead}${esc(words)}${st.at != null ? `${words ? ' · ' : ''}↻ ${clock(st.at)}` : ''}</h2>` : '';
};
const cardOf = (st, here, title, body, acts, focus = false, at = '') => `<section class="card fp-screen${focus ? ' focus' : ''}">${kicker(st, here, at)}<h1>${esc(title)}</h1>${body}${acts ? `<div class="row acts">${acts}</div>` : ''}</section>`;
// A contract that points at this room (an Install's room, a heist's vault): its line, with the mark.
const jobNote = (s, room) => { const job = (net(s, 'marks') || {})[room.id]; return job ? `<p class="fp-note fp-job">${ic('contract')}<span>${esc(job)}</span></p>` : ''; };
// The hunter, when it's about this room: in it, or stepping into it next.
function hunterNote(s, room) {
  const h = hunterOf(s);
  if (!h || h.down || !s.rooms.at) return '';
  if (h.at === room.id && room.id !== s.rooms.at) return '';
  return huntStep(s) === room.id ? note(esc(`The ${huntName(h)} steps in here next.`), 'hot') : '';
}
// The room you're in: what holds it and its verbs.
function hereCard(s) {
  const R = s.rooms, g = R.graph, room = hereOf(s), sc = R.screen, h = hunterOf(s);
  let st = stateOf(s, room), body = '', acts = '';
  if (sc?.kind === 'hunter') {
    st = { word: 'caught', cls: 'hot' };
    body = holder('den', `${huntName(h).toUpperCase()} ICE`, `Level ${fightOf(s, room, 'hunter').level} hunter`) + note('Beat it for a script. It stays down the rest of the visit.');
    acts = btn('engage', 'Fight it', { primary: true }) + btn('slip', 'Slip past', { tip: 'Slip past: once a visit.' });
  } else if (sc?.kind === 'virus') {
    const k = whoOf(s, room), G = room.kind === 'guard' ? GUARDS[room.guard] : null;
    const tip = G ? `${G.name}: ${G.summary.split('. ').slice(1).join('. ') || G.summary}` : room.kind === 'core' && !R.world ? `${BOSSES[RESIDENT].name}: ${BOSSES[RESIDENT].about}` : '';
    // A plain process or elite: the card's title is its name, so the holder says what it is (its family), as from afar.
    body = fightKind(room) && !['guard', 'core', 'boss'].includes(room.kind) && !room.wild && labelOf(s, room) === sc.name ? holder(iconOf(s, room), k.short, k.sub, tip)
      : holder(iconOf(s, room), sc.name, fightKind(room) && !['guard', 'core', 'boss'].includes(room.kind) && !room.wild ? `${k.short} · ${k.sub}` : k.sub, tip);
    const notes = [];
    if (R.rare[room.id]) notes.push(`<span class="fp-tag-inline next">★ rare</span> ${ROOMS.rareLevel} levels up, better loot.`);
    if (room.queue && R.kind === 'Mailhub') notes.push('A Spam Flood joins the fight.');
    if (room.kind === 'guard' && room.key && !R.opened[room.key]) notes.push(esc(`Carries the ${g.rooms[room.key].path} key.`));
    if (room.kind === 'elite') notes.push('Enrages from cycle 9. Drops a blue or better.');
    if (room.kind === 'nest') notes.push(esc(`Optional. A kill pays ${ROOMS.nest.parts} components.`));
    if (room.kind === 'core' && !R.world) notes.push(esc(`Boss rule ${R.bossRule}: ${BOSS_RULES[R.bossRule].name}.`));
    if (R.world) { const extra = net(s, 'fightNote', room); if (extra) notes.push(esc(extra)); }
    body += notes.map((n) => note(n)).join('');
    acts = btn('engage', 'Engage', { primary: true }) + (R.visit.back ? btn('back', 'Step back', { tip: `Step back: to ${g.rooms[R.visit.back].path}. The move in stays spent.` }) : '');
  } else if (isSocket(s, room) && socketOpen(s, room)) {
    ({ body, acts } = socketCard(s, room));
  } else if (fightKind(room)) {
    const k = whoOf(s, room);
    body = holder(iconOf(s, room), k.short, k.sub, '', 'down') + (R.down[room.id] != null ? note(esc(net(s, 'downNote', room) || `Back ${fmtLeft(respawnMs(s, room))} after it falls${farmed(s) ? ' (fast: this server is Mapped or yours)' : ', faster once the server is Mapped'}. Never while you stand in it.`), 'dim') : '');
  } else if (room.kind === 'cache') {
    // Standing in it, you see what it is: take it or leave it.
    const full = cacheFull(s, room), bait = !room.mirror && isBait(s, room), lose = pctOf(s, ROOMS.bait);
    if (full) {
      body = note(esc(room.mirror ? mirrorLine(s, room) : bait ? `Bait. Taking it costs ${lose} Signal.` : 'Clean: credits and code.'), bait || room.mirror ? 'hot' : '');
      acts = btn('pull', room.mirror ? 'Break the mirror' : 'Take it', { primary: !bait && !room.mirror, hot: bait || room.mirror, note: bait ? `−${lose} Signal` : '' }) + '<button type="button" class="btn" data-fp-pop-close>Leave it</button>';
    } else body = note('Credits and code, sometimes a script.', 'dim');
  } else if (room.kind === 'vault') {
    const open = opened(s, room), has = R.visit.keys.includes(room.id), main = room.id === g.vaults[0], force = pctOf(s, ROOMS.force);
    const left = open && R.world ? net(s, 'vaultLeft', room) || 0 : 0;
    if (room.farm) {
      body = note(esc(open ? 'The ledger is open. The Coldwallet waits past it.' : 'Opens on the Foreman\'s badge word and the Heatsink\'s cycle tag: beat them both.'));
      acts = open ? '' : btn('open', 'Open', { primary: true });
    } else {
      body = open ? (main ? note('The Core is unsealed.') : '') + (left ? note(esc(`${left} ${left === 1 ? 'file' : 'files'} still in it.`)) : '') : note(esc(has ? `Your key fits.${main ? ' Opening it unseals the Core.' : ''}` : `Its key is in ${guardOf(s, room.id) ? labelOf(s, guardOf(s, room.id)) : 'an elite'}.${main ? ' Opening it unseals the Core.' : ''}`));
      acts = open ? (left ? btn('pull', 'Take them', { primary: true }) : '') : btn('open', 'Open', { primary: true, disabled: !has, note: has ? 'your key' : 'no key' }) + btn('force', 'Force it', { hot: true, note: `−${force} Signal` });
    }
  } else if (room.kind === 'secret') {
    const full = cacheFull(s, room);
    body = note(full ? 'A stash: credits and code, now and then a script or a blue.' : 'Taken. It fills again in two hours.', full ? '' : 'dim');
    acts = full ? btn('pull', 'Take it', { primary: true }) + '<button type="button" class="btn" data-fp-pop-close>Leave it</button>' : '';
  } else if (room.kind === 'stash') {
    body = note(cacheFull(s, room) ? 'The server\'s code, kept for its owner.' : 'Empty. It fills again in two hours.', cacheFull(s, room) ? '' : 'dim');
    acts = cacheFull(s, room) ? btn('pull', 'Take it', { primary: true }) : '';
  } else if (room.kind === 'rest') {
    body = note('The hunter never comes in.', 'dim');
    acts = btn('rest', R.visit.rested ? 'Rested' : 'Rest', { primary: !R.visit.rested && restGain(s) > 0, disabled: R.visit.rested || !restGain(s), note: R.visit.rested ? 'once a visit' : restGain(s) ? `+${restGain(s)} Signal` : 'Signal full' });
  } else if (room.kind === 'entry') {
    const files = R.world ? net(s, 'entryFiles') || 0 : 0;
    body = files ? note(esc(`${files} ${files === 1 ? 'file' : 'files'} left here for you.`)) : note('The hunter never comes in.', 'dim');
    if (files) acts = btn('pull', 'Take', { primary: true });
  }
  else if (isPuzzle(room.kind)) {
    // A puzzle room: its board opens over the map as you walk in (puzzle-view.mjs); closed, Play opens it again.
    const pst = puzzleState(s, room), M = PUZZLES[room.kind];
    body = holder(room.kind, M.title, M.name, '', 'pz') + note(esc(M.rule), 'dim');
    acts = `<button type="button" class="btn${pst === 'ready' || pst === 'live' ? ' primary' : ''}" data-pz-open>${pst === 'live' ? 'Resume' : pst === 'ready' ? 'Play' : 'The board'}</button>`;
  }
  else if (room.kind === 'den') body = note(g.hunter === 'track' ? 'The Tracker sleeps here.' : 'The Patroller walks its loop from here.', 'dim');
  else if (room.kind === 'empty') body = note('Nothing here.', 'dim');
  else if (room.kind === 'purse') body = note(cacheFull(s, room) ? 'A few credits.' : 'Taken. It fills again when the server reboots.', 'dim');
  // A thread's business here (threads-view.mjs): who waits in it and Talk (Read, Take…), the file standing in it.
  if (R.world && s.threads && !sc) { const th = threadCard(s, room, true, holder, note, btn); if (th.body) body = th.body + (room.nook ? '' : body); acts = th.acts + acts; }
  // An Install job's item, carried for this room: Install it (nothing holds the room).
  const item = !sc && net(s, 'plantHere', room);
  if (item) acts = btn('install', 'Install', { primary: true, note: item, tip: `Install ${item} here. The contract is then ready to deliver.` }) + acts;
  return cardOf(st, true, labelOf(s, room), jobNote(s, room) + body + hunterNote(s, room), acts, !!sc, addrOf(s, room.id));
}
// A socket you stand in (sockets.mjs): what runs in it, or the Build card. Each codebase you know is a row: its icon and
// name, its rule in a line, what it costs here (each part lit when you hold it), and Build.
function socketCard(s, room) {
  const R = s.rooms, p = programIn(s, room.id);
  if (p) {
    const P = PROGRAMS[p], off = socketOff(s, room), bay = p === 'defrag' && !off;
    const body = holder(p, P.name, `Program · ${P.weight}${off ? ' · offline' : ''}`, '', 'prog') + note(esc(P.rule), off ? 'dim' : '') + (off ? note(esc(WORLD.view?.offNote?.(s, room) || 'Offline.'), 'hot') : '');
    const used = !!R.visit?.bays?.[room.id], gain = Math.min(R.max - sigOf(s), Math.round(R.max * SOCKET.rest));
    const acts = (bay ? btn('rest', used ? 'Rested' : 'Rest', { primary: !used && gain > 0, disabled: used || gain <= 0, note: used ? 'once a visit' : gain > 0 ? `+${gain} Signal` : 'Signal full' }) : '')
      + `<button type="button" class="btn small" data-rooms="uninstall" title="Uninstall: half its components and code come back.">Uninstall</button>`;
    return { body, acts };
  }
  if (socketOff(s, room)) return { body: note(esc(WORLD.view?.offNote?.(s, room) || 'Offline.'), 'hot'), acts: '' };
  const known = codebasesOf(s).filter((id) => PROGRAMS[id]);
  const m = materialsOf(s), comps = componentsOf(s);
  const rows = known.map((id) => {
    const P = PROGRAMS[id], c = programCost(R, id), why = buildBlock(s, R, room, id), total = c.components;
    const chip = (ok, label, tip) => `<span class="bc${ok ? ' ok' : ''}" title="${esc(tip)}">${label}</span>`;
    const chips = [chip(comps >= total, `${glyph('salvage')}${total}`, `${total} components (you hold ${comps})`),
      ...Object.entries(c.code).map(([k, n]) => chip((m[k] || 0) >= n, `${glyph(k)}${n}`, `${n} ${MATERIALS[k].name} (you hold ${m[k] || 0})`)),
      ...(c.exploit ? [chip((m.exploit || 0) >= c.exploit, `${glyph('exploit')}${c.exploit}`, `${c.exploit} Exploit (you hold ${m.exploit || 0})`)] : [])].join('');
    const blocked = why && !/costs/.test(why);
    return `<li class="bp-prog${why ? ' short' : ''}"><span class="bp-ic">${ic(id)}</span><span class="bp-txt"><b>${esc(P.name)}</b><small>${esc(P.rule)}</small><span class="bp-cost">${chips}</span></span><button type="button" class="btn small${why ? '' : ' primary'}" data-command="build ${id}" ${why ? `disabled title="${esc(blocked ? why : `Short: ${programCostLine(c)}`)}"` : `title="Build: inject it now. Choose which components pay."`}>Build</button></li>`;
  }).join('');
  return { body: `<ul class="bp-list">${rows || '<li class="quiet">You know no codebase yet.</li>'}</ul>`, acts: '' };
}
// A room you're not in: what holds it, its state and its one rule. Its verbs wait until you walk in.
function farCard(s, room) {
  if (!known(s, room.id)) return unknownCard(s, room);
  const st = stateOf(s, room), { who, rule } = aboutOf(s, room);
  let body = exfilNote(s, room);
  if (isSocket(s, room) && socketOpen(s, room)) {
    const p = programIn(s, room.id);
    body += p ? holder(p, PROGRAMS[p].name, `Program · ${PROGRAMS[p].weight}${socketOff(s, room) ? ' · offline' : ''}`, '', 'prog') + note(esc(PROGRAMS[p].rule), 'dim') : note(room.kind === 'core' ? 'The core socket. Walk in to build.' : 'An open socket. Walk in to build.');
    return cardOf(st, false, labelOf(s, room), jobNote(s, room) + body + hunterNote(s, room), '', false, addrOf(s, room.id));
  }
  if (fightKind(room) || room.mirror) {
    const k = whoOf(s, room), up = isUp(s, room) && !(room.kind === 'core' && !coreOpen(s)), f = room.mirror ? fightOf(s, room, 'mirror') : null;
    body += room.mirror ? holder('mirror', `Elite ${familyName(room.family)}`, `behind a mirror · lv ${f.level}`, '', cacheFull(s, room) ? 'hot' : 'down')
      : holder(iconOf(s, room), k.short, k.sub, '', up ? 'hot' : 'down');
  } else if (who) body += note(esc(who));
  if (rule) body += note(esc(rule), /hunter is here|wakes the Tracker/.test(rule) ? 'hot' : 'dim');
  if (s.rooms.world && s.threads) { const th = threadCard(s, room, false, holder, note, btn); if (th.body) body = room.nook ? th.body : body + th.body; }
  return cardOf(st, false, labelOf(s, room), jobNote(s, room) + body + hunterNote(s, room), '', false, addrOf(s, room.id));
}
// The Exfil, when it's in this room and you can see it: its name, running or cornered, and where it runs next.
function exfilNote(s, room) {
  const x = exfilShown(s);
  if (x?.at !== room.id) return '';
  const next = exfilNext(s);
  return holder('archive', x.name, `Exfil · ${next ? 'running' : 'cornered'}`, '', 'exfil') + note(esc(next ? `It runs to ${nameOf(s, next)} on your next move. Corner it.` : `Cornered. Walk in and break its Uplink within ${CONFIG.exfil.escape} cycles.`), next ? 'dim' : '');
}
// A room you've never been in: unknown. Its cost if you can walk in, and the hunter or the Exfil if you can see them
// there; nothing about what it is.
function unknownCard(s, room) {
  const h = hunterOf(s), cost = stepCost(s, room);
  let body = cost ? note(esc(`A first step in costs ${cost} Signal.`)) : '';
  body += exfilNote(s, room);
  if (hunterSeen(s) && h.at === room.id) body += note(esc(`The ${huntName(h)} is here: walk in and you fight it.`), 'hot');
  if (s.rooms.world && s.threads) body += threadCard(s, room, false, holder, note, btn).body;
  if (!body) body = note("You haven't been in it.", 'dim');
  return cardOf({ word: 'unknown', cls: 'dim' }, false, 'Unknown room', jobNote(s, room) + body + hunterNote(s, room), '', false, addrOf(s, room.id));
}
// Home: Signal resting, the reconnect wait, what the last visit did, and Connect.
function homeCard(s) {
  const R = s.rooms, t = now(), { sig, wait, need, can } = connectOf(s), full = t + Math.max(0, Math.ceil(((R.max - sig) / (R.max * 0.2 * R.speed)) * 60000));
  const L = R.last;
  const last = L ? `<ul class="fp-lines">${L.result === 'lost' ? `<li class="hot"><span class="lbl">lost</span><span>${esc(`${L.why} ${L.lost?.length ? `${L.lost.length} unbanked ${L.lost.length === 1 ? 'item' : 'items'} lost: ${L.lost.join(', ')}.` : 'Nothing unbanked was lost.'}`)}</span></li>` : `<li><span class="lbl">banked</span><span>${L.banked} ${L.banked === 1 ? 'item' : 'items'}</span></li>`}<li><span class="lbl">xp</span><span>+${(L.xp || 0).toLocaleString('en-US')}</span></li></ul>` : '';
  const items = R.banked.map((id) => stashItem(s, id)).filter(Boolean);
  const loot = items.length ? `<h3 class="fp-sec">Banked <small>${items.length}</small></h3><ul class="fp-items">${items.slice(-6).map((it) => `<li data-ptip="${esc(it.id)}"><b class="iname r-${it.rarity}">${esc(itemLabel(it))}</b><small class="fp-stats">${Object.keys(it.stats || {}).map((k) => statLine({ [k]: it.stats[k] })).filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('')}</small></li>`).join('')}</ul>` : '';
  const lines = [sig < R.max ? `Full in ${clock(full)}.` : '', wait > 0 ? `Reconnect in ${clock(R.reconnectAt)}. ${deathMark(R.deaths || 0)}` : '', sig < need ? esc(`You need ${need} Signal to connect.`) : ''].filter(Boolean).join(' ');
  return `<section class="card fp-screen fp-home"><h2>${R.visits ? `Home · visit ${R.visits}` : 'Home'}</h2><h1>${R.visits ? (L?.result === 'lost' ? 'Disconnected' : 'Jacked out') : 'Ready to connect'}</h1>
    ${lines ? note(lines) : ''}${L?.result === 'lost' ? recapMarkup(L.recap) : ''}${last}<div class="row acts">${btn('connect', 'Connect', { primary: true, disabled: !can, note: can ? '' : wait > 0 ? 'wait' : `${need} Signal` })}</div>
    <p class="fp-note dim">${esc(`This session: +${xpEarned(s).toLocaleString('en-US')} XP · fights won ${R.stats.won}/${R.stats.fights} · ${BOSSES[RESIDENT].name} ${R.stats.boss.won}/${R.stats.boss.tries}`)}</p>${loot}</section>`;
}
function popCard(s, id) {
  const R = s.rooms;
  if (!R.at) return id === R.graph.entry ? homeCard(s) : farCard(s, R.graph.rooms[id]);
  return id === R.at ? hereCard(s) : farCard(s, R.graph.rooms[id]);
}

export function roomsMarkup(s, ui = fpUi) {
  const R = s.rooms;
  if (!R) return '<section class="card"><h2>Rooms</h2><h1>No server</h1></section>';
  const pz = puzzlePanel(s) || (R.world && s.threads ? threadPanel(s, thUi, sweepBlock) : ''), id = pz ? null : popOf(s, ui); // a puzzle room's board, or a thread's dialogue, over the map: the pop-up stands aside
  // Placed beside its room by app.js (placeRoomsPop) once it's drawn: hidden until then.
  const pop = id ? `<div class="map-pop fp-pop" id="fp-pop" data-pop="${esc(id)}" role="dialog" aria-label="${esc(R.at || id !== R.graph.entry ? (known(s, id) ? labelOf(s, R.graph.rooms[id]) : 'Unknown room') : 'Home')}" style="visibility:hidden"><button type="button" class="btn small map-pop-x" data-fp-pop-close title="Close (Esc)" aria-label="Close">×</button>${popCard(s, id)}</div>` : '';
  return `<div class="fp${R.at ? '' : ' home'}">
    ${sprite()}${hudMarkup(s)}
    <section class="panel fp-map${pz ? ' pz-on' : ''}" data-pane="map"><div class="fp-scroll">${mapSvg(s, false, id)}${mapSvg(s, true, id)}</div><button type="button" class="btn small fp-zoom" data-fp-zoom title="Fit the server (double-click the map too). Scroll to zoom, drag to pan." aria-label="Fit the server">⤢</button>${pop}${pz}</section>
  </div>`;
}

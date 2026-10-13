// The rooms page (floorplan.mjs, docs/servers.md R0): a strip of the server across the top, the room map as a
// drawing, and beside it the room you're in (or home) with its verbs and its exits, and a short tty under it.
// docs/ui.md tokens: amber is structure and what you can click, teal is you, hot is what bites (a live virus, the
// hunter), gray is down or out of sight. The map is the main screen; the prompt still takes every verb.
import { esc } from './view.mjs';
import { GUARDS, BOSSES } from './data.mjs';
import { itemLabel, statLine } from './gear.mjs';
import { stashItem, active, classOf } from './combat.mjs';
import { AUTHORS } from './authors.mjs';
import { SCRIPTS, TIER, scriptsOf, slotsOf, scriptTip } from './scripts.mjs';
import { BOSS_RULES } from './interrupt.mjs';
import { familyName, setName, ATTACK_SETS } from './families.mjs';
import { ROOMS, KINDS, MARKS, HUNTERS, RESIDENT, roomList, hereOf, neighbours, linksOf, seenOf, isUp, backAt, cacheFull, refillAt, isBait, coreOpen, signalNow, soonest, progressOf, fmtLeft, hunterOf, hunterNext, paceOf, moveCost, fightOf, exits, hunterLine, xpEarned } from './floorplan.mjs';

export const fpUi = { log: false };
const icon = (name) => `style="--icon:url('ui/icons/${name}.svg')"`;
const now = () => Date.now();
const KIND = {
  entry: { name: 'Entry', word: 'Where every visit starts. The hunter never comes in.' },
  process: { name: 'Process', word: "A wild virus of the server's author, the same family and attack set every time it spawns. It comes back 15 minutes after it falls." },
  elite: { name: 'Elite', word: 'A bigger virus with an extra tell. It enrages from cycle 9. It comes back 45 minutes after it falls, and always drops a blue or better.' },
  guard: { name: 'Guard post', word: 'A guard or Kestrel ICE. While the vault is shut, it holds the vault\'s key. It comes back 20 minutes after it falls.' },
  core: { name: 'Core', word: "The Resident, the server's boss. Sealed until the vault is open." },
  den: { name: 'Den', word: "Where the server's hunter lives." },
  cache: { name: 'Cache', word: 'Credits and code, now and then a script. One in four is bait: read it first, or pulling it costs Signal. It refills 2 hours after you take it.' },
  vault: { name: 'Vault', word: 'Open it with its key, or force it. Gear a third of the time, or a script. Opening the vault on the way to /core unseals it.' },
  rest: { name: 'Rest room', word: 'Rest: restores 30% of your max Signal, once a visit. The hunter never comes in: it stops at the door.' },
  junction: { name: 'Junction', word: 'Nothing here but the walk, and the hunter walks it too.' },
};
const fightKind = (room) => ['process', 'elite', 'guard', 'core'].includes(room.kind);
const left = (at) => fmtLeft(at - now());
const pct = (x) => `${Math.round(x * 100)}%`;
// What you know of a room's virus: its family, author and level once it's next to you; its attack set once you've met
// it (the codex), ??? until then.
function virusKnow(s, room) {
  const R = s.rooms, f = fightOf(s, room);
  if (room.kind === 'guard') return { title: GUARDS[room.guard].name, sub: `${GUARDS[room.guard].ice ? 'Kestrel ICE' : 'guard'} · lv ${f.level}`, tip: GUARDS[room.guard].summary + (room.key && !R.opened[room.key] ? ` It holds the key to ${R.graph.rooms[room.key].path}.` : '') };
  if (room.kind === 'core') return { title: BOSSES[RESIDENT].name, sub: `the Resident · lv ${f.level}`, tip: BOSSES[RESIDENT].about };
  const set = room.set ? (R.codex[`${room.family}:${room.set}`] ? setName(room.family, room.set) : '???') : '';
  return { title: `${room.kind === 'elite' || room.mirror ? 'Elite ' : ''}${familyName(room.family)}`, sub: `${AUTHORS[room.author]?.name || ''} · lv ${f.level}${set ? ` · ${set} set` : ''}`, tip: `${familyName(room.family)}, written by ${AUTHORS[room.author]?.name || '?'}. Attack set: ${set || 'none'}.${set === '???' ? ' You learn its set by fighting it.' : ` ${setLine(room.family, room.set)}`}` };
}
function setLine(family, id) {
  const x = ATTACK_SETS[family]?.[id];
  if (!x) return '';
  return Object.entries(x.parts).map(([p, a]) => `${p}: every ${a.interval} from ${a.first}${a.deliver ? `, a Package every ${a.deliver.interval} from ${a.deliver.first}` : ''}`).join('. ') + '.';
}
// A room's state on the map: here, in reach, seen, shape only, or not drawn.
function roomTip(s, room) {
  const R = s.rooms, seen = seenOf(s, room.id), h = hunterOf(s);
  const hunt = h && !h.down && h.at === room.id ? ` The ${HUNTERS[h.kind].name} is here: walk in and you fight it.` : '';
  if (seen !== 'kind') return `Out of sight: a room you haven't seen yet.${hunt}`;
  const K = KIND[room.kind], parts = [`${room.path}: ${K.name}.`];
  if (fightKind(room)) {
    const k = virusKnow(s, room);
    parts.push(isUp(s, room) ? `${k.title}, ${k.sub}. ${k.tip}` : `Its virus fell. It comes back in ${left(backAt(s, room))}.`);
  } else parts.push(K.word);
  if (room.kind === 'cache') parts.push(cacheFull(s, room) ? (room.mirror ? 'A mirror: an elite waits behind it.' : 'Full.') : `Refills in ${left(refillAt(s, room))}.`);
  if (room.kind === 'vault') parts.push(R.opened[room.id] ? 'Open. It stays open.' : R.visit?.keys.includes(room.id) ? 'Your key fits it.' : 'Shut.');
  if (room.kind === 'core' && !coreOpen(s)) parts.push('Sealed.');
  if (R.graph.den && neighbours(R.graph, R.graph.den).includes(room.id) && R.graph.hunter === 'track') parts.push('Next to the den: walking in wakes the Tracker.');
  if (room.queue) parts.push('On the mail queue: its fights bring a Spam Flood.');
  if (R.cleared[room.id]) parts.push('Cleared.');
  return parts.join(' ') + hunt;
}

// ---------- the map ----------
const CELL = { w: 104, h: 84, bw: 70, bh: 52 };
// Grid to pixels: wide (the spine runs left to right) or tall (top to bottom, for phones).
function frame(s, tall) {
  const rooms = roomList(s), xs = rooms.map((r) => (tall ? -r.y : r.x)), ys = rooms.map((r) => (tall ? r.x : r.y));
  const x0 = Math.min(...xs), y0 = Math.min(...ys), cols = Math.max(...xs) - x0 + 1, rows = Math.max(...ys) - y0 + 1;
  const at = (r) => ({ x: ((tall ? -r.y : r.x) - x0) * CELL.w + CELL.w / 2, y: ((tall ? r.x : r.y) - y0) * CELL.h + CELL.h / 2 });
  return { at, width: cols * CELL.w, height: rows * CELL.h };
}
function mapSvg(s, tall) {
  const R = s.rooms, g = R.graph, { at, width, height } = frame(s, tall), here = R.at, h = hunterOf(s);
  const reach = new Set(exits(s).map((x) => x.id)), walked = R.visit?.walked || {};
  const shown = (id) => !!seenOf(s, id);
  // Links: a line between two rooms you've seen at least the shape of. A hop (a Relay's) bows out.
  const lines = linksOf(g).filter(([a, b]) => shown(a) && shown(b)).map(([a, b]) => {
    const p = at(g.rooms[a]), q = at(g.rooms[b]), hop = (g.hops || []).some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    const live = here && ((a === here && reach.has(b)) || (b === here && reach.has(a))), trod = walked[a] && walked[b] && R.at;
    const cls = `fp-link${live ? ' live' : trod ? ' walked' : seenOf(s, a) === 'kind' && seenOf(s, b) === 'kind' ? ' seen' : ' fog'}${hop ? ' hop' : ''}`;
    if (hop) { const mx = (p.x + q.x) / 2 + (q.y - p.y) * 0.35, my = (p.y + q.y) / 2 - (q.x - p.x) * 0.35; return `<path class="${cls}" d="M${p.x} ${p.y} Q${mx} ${my} ${q.x} ${q.y}"/>`; }
    return `<line class="${cls}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`;
  }).join('');
  // A Patroller's loop, dashed red, once you've seen any room of it (an Infiltrator sees all of it).
  let loop = '';
  if (g.route && (classOf(s) === 'infiltrator' || g.route.some((id) => seenOf(s, id) === 'kind'))) {
    const all = classOf(s) === 'infiltrator', ids = g.ping ? g.route : [...g.route, g.route[0]], segs = [];
    for (let i = 1; i < ids.length; i++) if (all || (shown(ids[i - 1]) && shown(ids[i]))) { const p = at(g.rooms[ids[i - 1]]), q = at(g.rooms[ids[i]]); segs.push(`M${p.x + 6} ${p.y + 6} L${q.x + 6} ${q.y + 6}`); }
    if (segs.length) loop = `<path class="fp-loop" d="${segs.join(' ')}"><title>The Patroller's loop: it walks it a room for every ${ROOMS.hunter.pace} of your moves.</title></path>`;
  }
  // The hunter's next step: a red arrow.
  let arrow = '';
  const next = h && !h.down ? hunterNext(s, h) : null;
  const near = h && !h.down && here ? (h.at === here || seenOf(s, h.at)) : false;
  if (next && near && (seenOf(s, next) || classOf(s) === 'infiltrator')) {
    const p = at(g.rooms[h.at]), q = at(g.rooms[next]), dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1, k = (CELL.bw / 2 + 4) / d;
    arrow = `<line class="fp-hunt-arrow" x1="${p.x + dx * k}" y1="${p.y + dy * k}" x2="${q.x - dx * k}" y2="${q.y - dy * k}" marker-end="url(#fp-arrow${tall ? '-t' : ''})"/>`;
  }
  const rooms = roomList(s).filter((r) => shown(r.id)).map((room) => roomSvg(s, room, at(room), reach)).join('');
  // Out of sight but within two rooms: a red pulse at the edge of your fog.
  let pulse = '';
  if (h && !h.down && here && !seenOf(s, h.at)) {
    const d = distOf(g, here, h.at);
    if (d != null && d <= 2) { const edge = neighbours(g, h.at).find((x) => seenOf(s, x)); if (edge) { const p = at(g.rooms[edge]); pulse = `<circle class="fp-pulse" cx="${p.x}" cy="${p.y}" r="${CELL.bw / 2 + 8}"><title>Something moves just past what you can see.</title></circle>`; } }
  }
  const id = `fp-arrow${tall ? '-t' : ''}`;
  return `<svg class="fp-svg ${tall ? 'tall' : 'wide'}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="--w:${width}px" role="group" aria-label="Room map of ${esc(R.name)}"><defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="fp-arrowhead"/></marker></defs>${lines}${loop}${pulse}${rooms}${arrow}</svg>`;
}
const distOf = (g, a, b) => { const d = { [a]: 0 }, q = [a]; while (q.length) { const x = q.shift(); if (x === b) return d[x]; for (const y of neighbours(g, x)) if (!(y in d)) { d[y] = d[x] + 1; q.push(y); } } return null; };
function roomSvg(s, room, p, reach) {
  const R = s.rooms, g = R.graph, seen = seenOf(s, room.id), kind = seen === 'kind', h = hunterOf(s);
  const here = R.at === room.id, can = reach.has(room.id), up = kind && fightKind(room) && isUp(s, room);
  const hunted = h && !h.down && h.at === room.id && (here || kind || seen);
  const denEdge = kind && g.hunter === 'track' && g.den && neighbours(g, g.den).includes(room.id) && !(h?.awake);
  const cls = ['fp-room', `k-${kind ? room.kind : 'fog'}`, here ? 'here' : can ? 'reach' : kind ? 'seen' : 'shape', up ? 'up' : '', kind && fightKind(room) && !up ? 'down' : '', R.cleared[room.id] ? 'cleared' : '', hunted ? 'hunted' : '', denEdge ? 'den-edge' : '', room.kind === 'core' && kind && !coreOpen(s) ? 'sealed' : '', room.queue && kind ? 'queue' : ''].filter(Boolean).join(' ');
  const x = p.x - CELL.bw / 2, y = p.y - CELL.bh / 2;
  const mark = kind ? (room.kind === 'cache' && room.mirror ? '◈' : MARKS[room.kind]) : '?';
  let sub = kind ? (room.kind === 'entry' ? '/' : room.dir) : '';
  let timer = '';
  if (kind && fightKind(room) && !up && R.down[room.id] != null) timer = `↻ ${left(backAt(s, room))}`;
  else if (kind && room.kind === 'cache' && !cacheFull(s, room)) timer = `↻ ${left(refillAt(s, room))}`;
  const tags = [];
  if (kind && room.kind === 'guard' && room.key && !R.opened[room.key] && !R.visit?.keys.includes(room.key)) tags.push(['key', 'fp-tag key', 'It holds a vault\'s key.']);
  if (kind && room.kind === 'vault') tags.push(R.opened[room.id] ? ['open', 'fp-tag you', 'Open.'] : R.visit?.keys.includes(room.id) ? ['key ✓', 'fp-tag you', 'Your key fits it.'] : ['shut', 'fp-tag', 'Shut.']);
  if (kind && room.kind === 'core') tags.push([BOSSES[RESIDENT].name, 'fp-tag hot', `${BOSSES[RESIDENT].name}, the Resident.`]);
  if (kind && R.rare[room.id] && up) tags.push(['★ rare', 'fp-tag next', 'A rare spawn: two levels up, three loot rolls. It waits until you kill it.']);
  if (kind && room.kind === 'rest' && R.visit?.rested) sub = 'rested';
  const attrs = can ? `data-rooms="go" data-arg="${esc(room.id)}" tabindex="0" role="button"` : '';
  const cost = can && moveCost(s, room) ? `<text class="fp-cost" x="${p.x + CELL.bw / 2 - 4}" y="${y - 4}" text-anchor="end">−${moveCost(s, room)}</text>` : '';
  const tagSvg = tags.map(([t, c], i) => `<text class="${c}" x="${p.x}" y="${y + CELL.bh + 13 + i * 12}" text-anchor="middle">${esc(t)}</text>`).join('');
  return `<g class="${cls}" ${attrs} title="${esc(roomTip(s, room))}" aria-label="${esc(kind ? `${KIND[room.kind].name} ${room.path}` : 'unknown room')}">`
    + `<rect x="${x}" y="${y}" width="${CELL.bw}" height="${CELL.bh}" rx="3"/>`
    + `<text class="fp-mark" x="${p.x}" y="${p.y + (sub || timer ? -2 : 6)}" text-anchor="middle">${esc(mark)}</text>`
    + (timer ? `<text class="fp-timer" x="${p.x}" y="${y + CELL.bh - 7}" text-anchor="middle">${esc(timer)}</text>` : sub ? `<text class="fp-dir" x="${p.x}" y="${y + CELL.bh - 7}" text-anchor="middle">${esc(sub.length > 9 ? sub.slice(0, 8) + '…' : sub)}</text>` : '')
    + (R.cleared[room.id] && kind ? `<text class="fp-check" x="${x + 6}" y="${y + 13}">✓</text>` : '')
    + (here ? `<text class="fp-you" x="${x + CELL.bw - 5}" y="${y + 13}" text-anchor="end">you</text>` : '')
    + (hunted ? `<text class="fp-hunter" x="${x + CELL.bw + 2}" y="${y + 4}" text-anchor="middle">⚠</text>` : '')
    + cost + tagSvg + '</g>';
}

// ---------- the strip ----------
function hudMarkup(s) {
  const R = s.rooms, sig = signalNow(s), max = R.max, f = max ? sig / max : 0, lvl = f <= 0.3 ? 'low' : f <= 0.6 ? 'mid' : 'ok';
  const prog = progressOf(s), h = hunterOf(s), soon = soonest(s), K = KINDS[R.kind];
  const bag = scriptsOf(s);
  const scripts = bag.map((id) => `<li class="fp-perk r-${TIER[SCRIPTS[id].rarity]}" title="${esc(`${scriptTip(id)} Run it in a fight: one a fight, and it takes no cycle.`)}">${esc(SCRIPTS[id].name)}</li>`).join('');
  const hunter = R.at && h ? `<span class="fp-stat fp-hunt${h.down ? ' out' : ''}" title="${esc(`${HUNTERS[h.kind].name}: ${HUNTERS[h.kind].text} It moves only when you walk or wait, never while you fight, loot or rest.`)}"><span class="lbl">${esc(HUNTERS[h.kind].name)}</span><b>${h.down ? 'down' : h.kind === 'track' && !h.awake && !h.returning ? 'asleep' : `moves in ${paceOf(s) - h.count}`}</b></span>` : '';
  const keys = R.at && R.visit ? `<span class="fp-stat${R.visit.keys.length ? '' : ' out'}" title="Keys: each opens its own vault, for this visit. Jack out with one and it goes back to its post, guard and all."><span class="lbl">Keys</span><b>${R.visit.keys.length}</b></span>` : '';
  const pack = R.pack.length ? `<span class="fp-stat" title="${esc(`Pack: ${R.pack.map((id) => itemLabel(stashItem(s, id) || { name: '?' })).join(', ')}. It banks when you jack out. If your Signal hits 0 first, it's lost.`)}"><span class="lbl">Pack</span><b>${R.pack.length}</b></span>` : '';
  const rule = ['a', 'b', 'c'].map((k) => `<button type="button" class="fp-rule${R.bossRule === k ? ' on' : ''}" data-rooms="bossrule" data-arg="${k}" aria-pressed="${R.bossRule === k}" title="${esc(`Boss rule (${k}): ${BOSS_RULES[k].name}. ${BOSS_RULES[k].text}`)}">${k}</button>`).join('');
  return `<header class="fp-hud" aria-label="The server">
    <span class="fp-id" title="${esc(`${R.name}: a ${R.author.toUpperCase()} ${R.kind}, level ${R.level}, floor ${R.floor}. ${K.rule}: ${K.text}`)}"><span class="ico" ${icon('server')}></span><b>${esc(R.name)}</b><small>${esc(R.kind)} · lv ${R.level} · ${esc((AUTHORS[R.author]?.name || R.author).toUpperCase())}</small></span>
    <div class="fp-sig ${lvl}" title="Signal: your health on the server. It carries from room to room and fight to fight. Walking into a room for the first time on a visit costs ${pct(ROOMS.move)} of your max. It rests back at home."><span class="lbl">Signal</span><span class="sigbar"><span style="width:${(f * 100).toFixed(1)}%"></span></span><strong>${sig}</strong><small>/${max}</small></div>
    <div class="fp-prog" title="Progress: rooms you've cleared at least once, for good. Respawns never take it away. At half the whole map is drawn; at 100% the server is Mapped."><span class="lbl">Rooms</span><span class="pbar"><span style="width:${(prog.done / prog.total) * 100}%"></span><i style="left:50%"></i></span><b>${prog.done}/${prog.total}</b>${R.mapped ? '<small class="fp-mapped">MAPPED</small>' : ''}</div>
    ${keys}${hunter}${pack}
    ${soon ? `<span class="fp-stat" title="${esc(`The next room to come back: ${soon.room.path}.`)}"><span class="lbl">Next ↻</span><b>${esc(left(soon.at))}</b><small>${esc(soon.room.path)}</small></span>` : ''}
    <span class="fp-stat fp-kind" title="${esc(`${R.kind}: ${K.text}`)}"><span class="lbl">${esc(R.kind)}</span><b>${esc(K.rule)}</b></span>
    <span class="fp-rules" role="group" aria-label="Boss rule"><span class="lbl" title="${esc(`How ${BOSSES[RESIDENT].name}'s ticks work, for the test. Switch it any time: it applies to the next fight with it.`)}">Boss rule</span>${rule}</span>
    <ul class="fp-perks" aria-label="Scripts" title="${esc(`Scripts: ${bag.length} of ${slotsOf(s)} slots.`)}"><li class="lbl">Scripts ${bag.length}/${slotsOf(s)}</li>${scripts}</ul>
  </header>`;
}

// ---------- the room you're in ----------
const btn = (verb, label, { arg = null, primary = false, hot = false, disabled = false, note = '', tip = '' } = {}) => `<button type="button" class="btn${primary ? ' primary' : ''}${hot ? ' hot-btn' : ''}" data-rooms="${verb}"${arg != null ? ` data-arg="${esc(arg)}"` : ''}${disabled ? ' disabled' : ''}${tip ? ` title="${esc(tip)}"` : ''}>${esc(label)}${note ? `<small>${esc(note)}</small>` : ''}</button>`;
const term = (lines) => `<pre class="fp-term">${lines.map((l) => (l.startsWith('$') ? `<span class="you">${esc(l)}</span>` : esc(l))).join('\n')}</pre>`;
function roomCard(s) {
  const R = s.rooms, room = hereOf(s), sc = R.screen, h = hunterOf(s);
  const K = KIND[room.kind];
  const kicker = `${esc(room.path)} · ${esc(K.name.toLowerCase())}${R.cleared[room.id] ? ' · cleared' : ''}`;
  let title = K.name, body = '', acts = '';
  if (sc?.kind === 'hunter') {
    title = `The ${HUNTERS[h.kind].name}`;
    body = `<p class="fp-note">${esc(`It's on you. ${HUNTERS[h.kind].text}`)}</p>`;
    acts = btn('engage', 'Fight it', { primary: true, tip: `A hunter ICE two levels over the server. Beat it and it drops a script, and it's down for the rest of this visit.` }) + btn('slip', 'Slip past', { tip: 'Infiltrator: walk past it without a fight, once a visit.' });
  } else if (sc?.kind === 'virus') {
    const k = virusKnow(s, room);
    title = esc(sc.name);
    body = `<div class="fp-virus" title="${esc(k.tip)}"><span class="fp-mk hot">${esc(room.mirror ? '◈' : MARKS[room.kind])}</span><span><b>${esc(k.title)}</b><small>${esc(k.sub)}</small></span></div>${R.rare[room.id] ? '<p class="fp-note"><span class="fp-tag-inline next">★ rare spawn</span> Two levels up, three loot rolls.</p>' : ''}${room.queue ? '<p class="fp-note">The mail queue: a Spam Flood joins the fight.</p>' : ''}${room.kind === 'guard' && room.key && !R.opened[room.key] ? `<p class="fp-note">${esc(`It holds the key to ${R.graph.rooms[room.key].path}.`)}</p>` : ''}${room.kind === 'core' ? `<p class="fp-note">${esc(`Boss rule (${R.bossRule}): ${BOSS_RULES[R.bossRule].name}. ${BOSS_RULES[R.bossRule].text}`)}</p>` : ''}`;
    acts = btn('engage', 'Engage', { primary: true }) + (R.visit.back ? btn('back', 'Step back', { tip: `Back to ${R.graph.rooms[R.visit.back].path}. The move in is spent.` }) : '');
  } else if (fightKind(room) && room.kind !== 'cache') {
    title = room.kind === 'core' ? BOSSES[RESIDENT].name : K.name;
    body = `<p class="fp-note">${esc(R.down[room.id] != null ? `Quiet. It comes back in ${left(backAt(s, room))}, once you've left the room.` : K.word)}</p>`;
  } else if (room.kind === 'cache') {
    const full = cacheFull(s, room), read = R.read?.[room.id] === (R.spawns[room.id] || 0);
    const lines = [`$ ls -l ${room.path}`, full ? '-rw-------  1 ops ops  48k  cache.dat' : '(empty)', ...(read && full ? ['$ cat cache.dat', room.mirror ? 'FILE IS A MIRROR. YOUR HANDLE, REVERSED.' : isBait(s, room) ? 'CANARY CANARY CANARY CANARY (every block)' : 'credits, code'] : [])];
    body = term(lines) + (full ? '' : `<p class="fp-note">${esc(`It refills in ${left(refillAt(s, room))}.`)}</p>`);
    acts = full ? btn('cat', 'cat cache.dat', { disabled: read, tip: 'Read it first: one cache in four is bait.' }) + btn('pull', room.mirror && read ? 'Break the mirror' : 'pull', { hot: true, note: read && isBait(s, room) ? `bait · −${pct(ROOMS.bait)}` : room.mirror && read ? 'an elite' : '', tip: 'Take what it holds.' }) : '';
  } else if (room.kind === 'vault') {
    const open = !!R.opened[room.id], has = R.visit.keys.includes(room.id);
    body = open ? `<p class="fp-note">The vault is open. It stays open.${room.id === R.graph.vaults[0] ? ' /core is unsealed.' : ''}</p>` : term([`$ ls ${room.path}`, 'ls: cannot open directory: Permission denied', `# badge reader: ${has ? 'key on you' : 'no key'}`]);
    acts = open ? '' : btn('open', 'Open', { primary: true, disabled: !has, note: has ? 'your key' : 'needs its key', tip: 'Its key sits in a guard post on another branch.' }) + btn('force', 'Force it', { hot: true, note: `−${pct(ROOMS.force)} Signal`, tip: `Force the door without its key, for ${pct(ROOMS.force)} of your max Signal.` });
  } else if (room.kind === 'rest') {
    const n = Math.min(R.max - R.signal, Math.round(R.max * ROOMS.rest));
    body = `<p class="fp-note">${esc(K.word)}</p>`;
    acts = btn('rest', R.visit.rested ? 'Rested' : 'Rest', { primary: !R.visit.rested, disabled: R.visit.rested, note: R.visit.rested ? 'once a visit' : `+${n} Signal` });
  } else body = `<p class="fp-note">${esc(K.word)}</p>`;
  const line = hunterLine(s);
  const card = `<section class="card fp-screen${sc ? ' focus' : ''}"><h2>${kicker}</h2><h1>${title}</h1>${body}${acts ? `<div class="row acts">${acts}</div>` : ''}${line ? `<p class="fp-hunter-line">${esc(line)}</p>` : ''}</section>`;
  return card + exitsMarkup(s);
}
// Where you can go from here: each exit as a row, the whole row the move.
function exitsMarkup(s) {
  const R = s.rooms, g = R.graph, list = neighbours(g, R.at).map((id) => g.rooms[id]), h = hunterOf(s), open = new Set(exits(s).map((x) => x.id));
  const rows = list.map((room) => {
    const kind = seenOf(s, room.id) === 'kind', cost = moveCost(s, room), up = kind && fightKind(room) && isUp(s, room);
    const what = !kind ? '??' : fightKind(room) && up ? `${KIND[room.kind].name} · ${virusKnow(s, room).title}` : fightKind(room) && R.down[room.id] != null ? `${KIND[room.kind].name} · ↻ ${left(backAt(s, room))}` : room.kind === 'core' && !coreOpen(s) ? 'Core · sealed' : KIND[room.kind].name;
    const hunted = h && !h.down && (h.at === room.id || hunterNext(s, h) === room.id);
    return `<li><button type="button" class="fp-exit${up ? ' up' : ''}${hunted ? ' hunted' : ''}" ${open.has(room.id) ? `data-rooms="go" data-arg="${esc(room.id)}"` : 'disabled'} title="${esc(roomTip(s, room))}"><span class="fp-mk">${esc(kind ? (room.mirror ? '◈' : MARKS[room.kind]) : '?')}</span><span class="fp-exit-b"><b>${esc(kind ? room.path : '??/')}</b><small>${esc(what)}</small></span><span class="fp-exit-c">${hunted ? '<span class="fp-tag-inline hot">hunter</span>' : ''}${cost ? `−${cost}` : 'walked'}</span></button></li>`;
  }).join('');
  const more = `<div class="row acts">${btn('wait', 'Wait', { disabled: !!R.screen, tip: 'Stay where you are for one move: the hunter takes its step, and you spend nothing.' })}${btn('jackout', 'Jack out', { hot: true, disabled: active(s), tip: 'Home, with your pack banked. Signal rests back there.' })}</div>`;
  return `<section class="fp-exits"><h3 class="fp-sec">Exits <small>${list.length}</small></h3><ul>${rows}</ul>${more}</section>`;
}
// Home: Signal resting, the reconnect wait, what the last visit did, and Connect.
function homeCard(s) {
  const R = s.rooms, sig = signalNow(s), full = Math.max(0, Math.ceil(((R.max - sig) / (R.max * 0.2 * R.speed)) * 60000)), wait = R.reconnectAt - now(), need = Math.ceil(R.max * 0.25);
  const L = R.last;
  const last = L ? `<ul class="fp-lines">${L.result === 'lost' ? `<li class="hot"><span class="lbl">lost</span><span>${esc(`${L.why} ${L.lost?.length ? `${L.lost.length} unbanked ${L.lost.length === 1 ? 'item' : 'items'} lost: ${L.lost.join(', ')}.` : 'Nothing unbanked was lost.'}`)}</span></li>` : `<li><span class="lbl">banked</span><span>${L.banked} ${L.banked === 1 ? 'item' : 'items'}</span></li>`}<li><span class="lbl">xp</span><span>+${(L.xp || 0).toLocaleString('en-US')} on visit ${L.visit}</span></li></ul>` : '';
  const items = R.banked.map((id) => stashItem(s, id)).filter(Boolean);
  const loot = items.length ? `<h3 class="fp-sec">Banked <small>${items.length}</small></h3><ul class="fp-items">${items.slice(-6).map((it) => `<li data-ptip="${esc(it.id)}"><b class="iname r-${it.rarity}">${esc(itemLabel(it))}</b><small>${esc(statLine(it.stats))}</small></li>`).join('')}</ul>` : '';
  const can = wait <= 0 && sig >= need;
  return `<section class="card fp-screen fp-home"><h2>home · ${esc(R.name)} ${R.visits ? `· ${R.visits} ${R.visits === 1 ? 'visit' : 'visits'}` : ''}</h2><h1>${R.visits ? (L?.result === 'lost' ? 'Disconnected' : 'Jacked out') : 'Ready to connect'}</h1>
    <p class="fp-note">${esc(sig < R.max ? `Signal ${sig}/${R.max}, resting. Full in ${fmtLeft(full)}.` : `Signal ${sig}/${R.max}. Full.`)}${wait > 0 ? ` ${esc(`${R.name} takes you back in ${fmtLeft(wait)}.`)}` : ''}${sig < need ? ` ${esc(`You need ${need} to connect.`)}` : ''}</p>
    ${last}<div class="row acts">${btn('connect', 'Connect', { primary: true, disabled: !can, note: can ? 'at the entry' : wait > 0 ? fmtLeft(wait) : `${need} Signal` })}</div>
    <p class="fp-note dim">XP this session: +${xpEarned(s).toLocaleString('en-US')}. Fights won ${R.stats.won}/${R.stats.fights}. ${BOSSES[RESIDENT].name} ${R.stats.boss.won}/${R.stats.boss.tries}.</p>${loot}</section>`;
}
function logMarkup(s) {
  const all = s.rooms.log, lines = all.slice(fpUi.log ? -14 : -3);
  return `<section class="fp-log${fpUi.log ? ' open' : ''}"><button type="button" class="fp-log-k" data-fp-ui="log" aria-expanded="${fpUi.log}"><span>tty · ${esc(s.rooms.id)}</span><span class="ico" ${icon(fpUi.log ? 'collapse' : 'expand')}></span></button><div class="fp-log-lines">${lines.map((l) => `<div${l.startsWith('cd ') ? ' class="you"' : ''}>${esc(l.startsWith('cd ') ? '$ ' + l : l)}</div>`).join('')}</div></section>`;
}
// The legend under the map: what each mark is.
const legend = () => `<ul class="fp-legend">${Object.entries(MARKS).filter(([k]) => k !== 'entry').map(([k, m]) => `<li title="${esc(`${KIND[k].name}: ${KIND[k].word}`)}"><span class="fp-mk">${esc(m)}</span>${esc(KIND[k].name)}</li>`).join('')}<li title="The hunter: it moves only when you walk or wait."><span class="fp-mk hot">⚠</span>hunter</li></ul>`;

export function roomsMarkup(s) {
  const R = s.rooms;
  if (!R) return '<section class="card"><h2>Rooms</h2><h1>No server</h1></section>';
  return `<div class="fp${R.at ? '' : ' home'}">
    ${hudMarkup(s)}
    <section class="panel fp-map" data-pane="map ${esc(R.id)}"><div class="fp-scroll">${mapSvg(s, false)}${mapSvg(s, true)}</div>${legend()}</section>
    <aside class="fp-side">${R.at ? roomCard(s) : homeCard(s)}${logMarkup(s)}</aside>
  </div>`;
}

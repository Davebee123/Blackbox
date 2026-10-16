// The threads' screens (threads.mjs, docs/threads.md): the marks on the room map (an amber ! where one starts, an amber
// ? where the step you're on sends you), a thread's room on its card (who's in it, Talk), the file walking the map
// (its badge and its Integrity), the strip's line for the thread you track, the dialogue over the map (its lines, a
// choice of two, a log's lines or its process log), the Threads list in Mail (its steps, the done ones struck), the
// reward card (pick one of three), and on the floor map a temporary server and a file in transit.
// Amber is every thread's colour: teal is only ever you.
import { esc } from './view.mjs';
import { statLine, itemLabel, SLOTS, RULES } from './gear.mjs';
import { findLocation } from './combat.mjs';
import { addrsOf } from './address.mjs';
import * as FP from './floorplan.mjs';
import { threadsOf, threadById, activeThreads, chainOf, chainDef, stepOf, stepsOf, objectiveOf, offerAt, verbOf, speakerOf, marksOn, serverMarks, escortsHere, escortNext, escortDest, tracked, tempsOn, transits, isDark, tempSweep, startHere } from './threads.mjs';

// The line icons (24×24, the room map's sprite): a terminal (someone waiting), a file, a log.
export const TH_ICONS = {
  npc: '<rect x="3" y="4" width="18" height="12.5" rx="1.5"/><path d="M7 8.5l2.6 2-2.6 2M12 12.5h5"/><path d="M9 20.5h6M12 16.5v4"/>',
  file: '<path d="M6 2.5h8l4.5 4.5v14.5H6Z"/><path d="M14 2.5V7h4.5"/><path d="M9 12h6M9 15h6M9 18h4"/>',
  log: '<path d="M4 3.5h16v17H4Z"/><path d="M7 7.5h2M11 7.5h6M7 11.5h2M11 11.5h6M7 15.5h2M11 15.5h4"/>',
};
const n1 = (v) => +v.toFixed(1);
const locHere = (s) => (s.rooms?.world ? findLocation(s, s.rooms.loc) : null);
const ic = (name, cls = '') => `<svg class="fp-ic${cls ? ' ' + cls : ''}" viewBox="0 0 20 20" aria-hidden="true"><use href="#fp-i-${name}"/></svg>`;
const pct = (e) => Math.round((e.hp / e.max) * 100);

// ---------- the room map ----------
// The marks on this server's rooms (marksOn), computed once a render.
export const roomMarksOf = (s) => { const loc = locHere(s); return loc ? marksOn(s, loc) : {}; };
// A thread's room: its icon once you've been in it (who or what waits there, a log), and whether it still has
// something for you (amber) or is done (gray).
export function nookIcon(s, room) {
  if (room.log) return 'log';
  const loc = locHere(s), o = loc && offerAt(s, loc, room);
  if (o) return speakerOf(s, o)?.icon || 'npc';
  const T = s.threads;
  for (const t of T?.list || []) for (const [k, p] of Object.entries(t.places || {})) if (p.loc === loc?.id && p.room === room.id) {
    const c = chainOf(t), st = c?.steps?.find((x) => x.kind === 'talk' && x.at === k) || c?.steps?.find((x) => x.at === k || x.to === k || x.from === k);
    return st?.kind === 'talk' ? st.icon || 'npc' : 'file';
  }
  const st = startHere(s, loc);
  if (st?.room === room.id) return chainDef(st.chain)?.steps?.[0]?.icon || 'npc';
  return 'empty';
}
// Something still for you there: a mark on it, or someone to start, answer or pick up again (a log once read is done).
const LIVE = ['start', 'talk', 'resume'];
export const nookLive = (s, room, marks) => !!marks[room.id] || LIVE.includes(locHere(s) && offerAt(s, locHere(s), room)?.kind);
// The ! or ? over a room: an amber badge, top centre (beside YOU and the hunter when they're there too).
export const questSvg = (cx, cy, m) => `<g class="fp-quest m-${m.mark === '!' ? 'start' : 'goal'}" transform="translate(${n1(cx)} ${n1(cy)})"><title>${esc(m.text)}</title><path class="bg" d="M0 -11 L9 -6 L9 6 L0 11 L-9 6 L-9 -6 Z"/><text y="4.5" text-anchor="middle">${m.mark}</text></g>`;
// A file walking: its badge (the file icon) on its room's bottom edge, its Integrity as a bar under it.
export function fileSvg(s, x, y, t, k = 1) {
  const e = t.esc, f = pct(e), waits = !escortNext(s, t) && e.at !== escortDest(s, t);
  return `<g class="fp-file${f <= 35 ? ' low' : ''}${waits ? ' waits' : ''}" transform="translate(${n1(x)} ${n1(y)}) scale(${k})"><title>${esc(`${e.name}: ${f}%. ${waits ? 'It waits: a live room is in its way.' : 'It walks a room for every 2 of your moves.'} Live rooms beside it bite unless you stand with it.`)}</title>`
    + '<rect class="bg" x="-12" y="-12" width="24" height="24" rx="2"/><use href="#fp-i-file" x="-9" y="-9" width="18" height="18"/>'
    + `<rect class="hpbg" x="-16" y="14" width="32" height="4" rx="1"/><rect class="hp" x="-16" y="14" width="${n1((32 * f) / 100)}" height="4" rx="1"/></g>`;
}
// The files on this server, by room, and where each walks next (its amber dashed arrow).
export const filesHere = (s) => escortsHere(s).map((t) => ({ t, at: t.esc.at, next: escortNext(s, t) }));

// ---------- the strip ----------
// The thread you track, in one line; a file walking here, its Integrity and how far it has to go.
export function threadHud(s) {
  const t = tracked(s), out = [], files = filesHere(s);
  if (t) {
    const obj = objectiveOf(s, t), first = obj.split(/(?<=\.)\s/)[0];
    out.push(`<span class="fp-stat fp-thread" title="${esc(`${chainOf(t).title}\n${obj}\nThreads are in Mail.`)}"><span class="fp-qmini">!</span><b>${esc(chainOf(t).title)}</b>${files.length ? '' : `<small>${esc(first.length > 34 ? first.slice(0, 33) + '…' : first)}</small>`}</span>`);
  }
  for (const { t, next } of files) {
    const e = t.esc, f = pct(e), dest = escortDest(s, t), g = s.rooms.graph, d = FP.distances(g, e.at)[dest];
    const word = e.at === dest ? 'in' : next ? `${d} to go` : `waits${e.blocked ? ` · ${addrsOf(g)[e.blocked] || ''}` : ''}`; // the room in its way by address: never a name you haven't seen
    out.push(`<span class="fp-stat fp-filestat${f <= 35 ? ' low' : ''}" title="${esc(`${e.name}: ${f}% Integrity. It walks a room for every 2 of your moves, never into a live room. Live rooms beside it bite unless you're in its room.`)}">${ic('file')}<span class="lbl">${esc(e.name)}</span><span class="fbar"><span style="width:${f}%"></span></span><b>${f}%</b><small>${esc(word)}</small></span>`);
  }
  return out.join('');
}

// ---------- the room's card ----------
// What a thread has in a room: who's there and the button (Talk, Read, Take…), the file if it's here, and the line a
// mark says. here: you're standing in it.
export function threadCard(s, room, here, holder, note, btn) {
  const loc = locHere(s);
  if (!loc) return { body: '', acts: '' };
  const marks = roomMarksOf(s), m = marks[room.id], known = FP.known(s, room.id);
  let body = '', acts = '';
  const o = known || here ? offerAt(s, loc, room) : null;
  if (o) {
    const sp = speakerOf(s, o), c = o.kind === 'start' ? chainDef(o.chain) : chainOf(o.t);
    body += holder(sp.icon, sp.who, o.kind === 'log' || o.kind === 'sweep' ? `${loc.name} · ${o.kind === 'log' ? 'who built it' : 'the builder\'s pid'}` : c?.title || '', '', 'th');
    if (here) acts += btn('talk', verbOf(s, o), { primary: o.kind !== 'again' });
  }
  if (m && !(o && m.mark === '!')) body += `<p class="fp-note th-note">${ic(m.mark === '!' ? 'npc' : 'file')}<span>${esc(m.text)}</span></p>`; // (a start's ! is the holder already)
  for (const { t } of filesHere(s)) if (t.esc.at === room.id) {
    const e = t.esc, f = pct(e), waits = !escortNext(s, t);
    body += holder('file', e.name, `${chainOf(t).title} · ${f}%${waits ? ' · waits' : ''}`, '', 'th');
    if (here) body += note(esc(waits && e.blocked ? `It waits for ${FP.nameOf(s, e.blocked)} (${addrsOf(s.rooms.graph)[e.blocked]}): clear it.` : 'You stand with it: nothing bites it here.'), 'dim');
  }
  return { body, acts };
}
// Whether the room you're in has something for you to start or say (the card opens by itself).
export const threadAsks = (s, room) => nookLive(s, room, roomMarksOf(s));

// ---------- the dialogue ----------
// What was said last (threads.mjs say), over the map while you stand in its room, until you close it.
export const thUi = { closed: null };
export function threadPanel(s, ui = thUi, sweepBlock = null) {
  const T = s.threads, d = T?.said, R = s.rooms;
  if (!d || !R?.at || d.room !== R.at || d.loc !== R.loc || ui.closed === d.n) return '';
  const loc = locHere(s), addr = addrsOf(R.graph)[d.room] || '';
  const sweep = d.kind === 'sweep' && loc?.temp ? tempSweep(loc) : null;
  const lines = d.lines.map((l, i) => `<p class="th-line${/^>/.test(l) ? ' sys' : /^"/.test(l) ? ' quote' : ''}" style="--i:${i}">${esc(l)}</p>`).join('');
  const choices = d.choices ? `<div class="th-choices">${d.choices.map((c, i) => `<button type="button" class="btn th-choice" data-rooms="talk" data-arg="${i + 1}"><kbd>${i + 1}</kbd><span>${esc(c)}</span></button>`).join('')}</div>` : '';
  const body = sweep && sweepBlock ? sweepBlock(sweep, { solved: loc.temp.sweep.solved, tries: loc.temp.sweep.tries, key: loc.id }) : `<div class="th-lines">${lines}</div>`;
  return `<div class="pz-panel th-panel k-${esc(d.kind)}" id="th-panel" data-th-n="${d.n}" role="dialog" aria-label="${esc(d.who)}">
    <section class="pz-card th-card"><i class="sp-corner tl"></i><i class="sp-corner tr"></i><i class="sp-corner bl"></i><i class="sp-corner br"></i>
      <header class="pz-head th-head"><p class="pz-kick"><span class="pz-at">${esc(addr)}</span>${d.title ? ` · <span class="th-title">${esc(d.title)}</span>` : ''}</p><h1>${ic(d.icon, 'th-who')}${esc(d.who)}</h1>
        <button type="button" class="btn small pz-x" data-th-close title="Close (Esc)" aria-label="Close">×</button></header>
      ${body}${choices || `<div class="row acts th-acts"><button type="button" class="btn" data-th-close>Close</button></div>`}
    </section></div>`;
}

// ---------- Mail: the Threads list ----------
const stateTag = (s, t) => (t.state === 'done' ? ['done', 'dim'] : t.state === 'abandoned' ? ['set aside', 'dim'] : s.threads?.track === t.id ? ['tracked', 'th-tag'] : ['', '']);
export function threadRows(s, open) {
  const T = s.threads, list = [...(T?.list || [])].sort((a, b) => (a.state === 'done') - (b.state === 'done') || (b.at || 0) - (a.at || 0));
  const rows = list.map((t) => { const c = chainOf(t), [tag, cls] = stateTag(s, t); return `<li><button type="button" class="mrow has-f th-row${t.state === 'done' ? ' done' : ''}${open === 't' + t.id.slice(1) || open === t.id ? ' open' : ''}" data-mail="${esc(t.id)}"><span class="mrow-f th-f" aria-hidden="true">${t.state === 'done' ? '✓' : '!'}</span><span class="mfrom">${esc(c?.giver || '')}</span><span class="msubj">${esc(c?.title || t.chain)}</span>${tag ? `<span class="tag ${cls}">${esc(tag)}</span>` : ''}</button></li>`; }).join('');
  const waiting = T?.offer ? '<span class="tag th-tag" title="A reward to pick">reward</span>' : '';
  return `<h2 title="Threads start in rooms: an amber ! once you've been in one.">Threads · ${(T?.list || []).filter((t) => t.state !== 'done').length} ${waiting}</h2>${rows ? `<ul class="mlist mthreads">${rows}</ul>` : '<p class="quiet" title="Threads start in rooms: an amber ! once you\'ve been in one.">None found.</p>'}`;
}
// One thread, read: who it's for and why, its steps (the done ones struck, the ones ahead ???), the lore line at its end.
export function threadReader(s, t) {
  const c = chainOf(t), T = s.threads, steps = stepsOf(s, t), active = t.state === 'active';
  const where = active ? (() => { const st = stepOf(t), k = st?.at || st?.to, p = k && t.places[k], id = st?.kind === 'temp' ? t.temps?.[st.server] : st?.kind === 'escort' && t.esc ? t.esc.loc : p?.loc; return id ? findLocation(s, id) : null; })() : null;
  const list = steps.map((x) => `<li class="th-step${x.done ? ' done' : ''}${x.now ? ' now' : ''}${x.text === '???' ? ' fog' : ''}"><span class="th-dot" aria-hidden="true"></span><span>${esc(x.now ? objectiveOf(s, t) : x.text)}</span></li>`).join('');
  const acts = [
    active ? `<button type="button" class="btn${T.track === t.id ? '' : ' primary'}" data-run="thread track ${esc(t.id)}">${T.track === t.id ? 'Untrack' : 'Track'}</button>` : '',
    active && where ? `<button type="button" class="btn" data-go="map:${esc(where.id)}">On map</button>` : '',
    active ? `<button type="button" class="btn small" data-run="thread abandon ${esc(t.id)}" title="Set it aside. Nothing is lost: pick it up again here, or where you found it.">Set aside</button>` : '',
    t.state === 'abandoned' ? `<button type="button" class="btn primary" data-run="thread resume ${esc(t.id)}">Pick it up</button>` : '',
    T.offer?.tid === t.id ? '<button type="button" class="btn primary" data-th-offer>Pick your reward</button>' : '',
  ].join('');
  return `<section class="card mread th-read"><h2>${esc(c?.giver || '')}${c?.short ? '' : ' · <span class="th-arc">chain</span>'}</h2><h1>${esc(c?.title || t.chain)}</h1>
    <p class="th-reason">${esc(c?.reason || '')}</p>
    <ol class="th-steps">${list}</ol>
    ${t.state === 'done' ? `<p class="th-lore">${esc(t.lore || c?.lore || '')}</p>${t.reward ? `<p class="svc-line"><span class="tag dim">took</span> ${esc(t.reward)}</p>` : ''}` : ''}
    ${acts ? `<div class="row acts">${acts}</div>` : ''}</section>`;
}

// ---------- the reward ----------
// Pick one of three (WoW's quest reward): each item's name in its rarity's colour, its slot and level, its stats.
export function offerMarkup(s) {
  const o = s.threads?.offer, t = o && threadById(s, o.tid);
  if (!o || !t) return '';
  const c = chainOf(t);
  const items = o.items.map((it, i) => `<button type="button" class="th-item r-${it.rarity}" data-run="thread take ${i + 1}" title="Take it"><span class="th-n">${i + 1}</span><b class="iname r-${it.rarity}">${esc(itemLabel(it))}</b><small>${esc(SLOTS[it.group]?.name || it.group)} · lv ${it.level}${i === 0 ? ' · <i>for you</i>' : ''}</small><span class="th-stats">${esc(statLine(it.stats))}</span>${it.rule && RULES[it.rule] ? `<span class="th-rule">${esc(RULES[it.rule].name)}</span>` : ''}<span class="th-take">Take</span></button>`).join('');
  return `<div class="sp-card th-offer-card" role="dialog" aria-label="${esc(`${c.title}: pick one`)}"><i class="sp-corner tl"></i><i class="sp-corner tr"></i><i class="sp-corner bl"></i><i class="sp-corner br"></i>
    <header class="sp-head"><span class="sp-kicker">Thread done</span><strong class="sp-name">${esc(c.title)}</strong></header>
    <p class="th-lore">${esc(t.lore || '')}</p><p class="th-pick">Pick one</p><div class="th-items">${items}</div>
    <button type="button" class="sp-go th-later" data-th-later>Later <small>it waits in Mail</small></button></div>`;
}

// ---------- the floor map ----------
// A temporary server: an amber ? with its name (dark and gray once it's shut down), linked to the server it grew from.
export const tempNodes = (s, floor) => tempsOn(s, floor).map((l) => ({ id: l.id, kind: 'temp', loc: l, x: l.temp.at.x, y: l.temp.at.y, host: l.temp.host }));
export function tempNodeSvg(s, n, sel, label) {
  const l = n.loc, dark = isDark(l), R = l.floorplan, rooms = R ? Object.values(R.graph.rooms).filter((x) => !x.nook) : [], done = rooms.filter((x) => R.cleared[x.id]).length;
  const sub = dark ? 'dark' : `temporary · ${done}/${rooms.length}${l.temp.grown ? ` · +${l.temp.grown}` : ''}`;
  return `<g class="mnode temp${dark ? ' dark' : ' f-target'}${sel}" data-select="${esc(l.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(`${l.name}, a temporary server${dark ? ', dark' : ''}`)}"><circle r="18" class="mhit"/><path class="tframe" d="M0 -12 L11 -5 L11 6 L0 12 L-11 6 L-11 -5 Z"/><text class="tq" text-anchor="middle" y="4.5">${dark ? '×' : '?'}</text>${label(n, 12, l.name, sub, dark ? 'dim' : 'th')}</g>`;
}
// A server a thread marks (a start you've found, the server a step sends you to): a small amber ! or ? beside it.
export function serverMarkSvg(s, id, marks = serverMarks(s)) {
  const m = marks[id];
  return m ? `<g class="mquest m-${m.mark === '!' ? 'start' : 'goal'}" transform="translate(13 -15) scale(1.35)"><title>${esc(m.text)}</title><path d="M0 -7 L6 -4 L6 4 L0 7 L-6 4 L-6 -4 Z"/><text y="3" text-anchor="middle">${m.mark}</text></g>` : '';
}
// A file in transit between two servers on this floor: its route along the floor's links (an amber dashed line) and
// the file moving down it (still, at its middle, with Motion off). byId: drawn nodes by id; idOf: a slot's node; g: the
// floor's diagram.
export function transitNodes(s, byId, idOf = {}, g = null) {
  return transits(s).map(({ t, from, to, name }) => {
    const a = byId[from], b = byId[to];
    if (!a || !b) return null;
    let pts = [a, b];
    const la = findLocation(s, from), lb = findLocation(s, to);
    if (g && la?.slot && lb?.slot) {
      const prev = { [la.slot]: null }, q = [la.slot];
      while (q.length) { const x = q.shift(); if (x === lb.slot) break; for (const [u, v] of g.links) { const y = u === x ? v : v === x ? u : null; if (y && !(y in prev)) { prev[y] = x; q.push(y); } } }
      if (lb.slot in prev) { const path = []; for (let x = lb.slot; x != null; x = prev[x]) path.unshift(x); const p2 = path.map((id) => byId[idOf[id]]).filter(Boolean); if (p2.length >= 2) pts = p2; }
    }
    const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y)), total = lens.reduce((x, y) => x + y, 0) || 1;
    let left = total / 2, mid = pts[0];
    for (let i = 0; i < lens.length; i++) { if (left <= lens[i]) { const f = left / (lens[i] || 1); mid = { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f }; break; } left -= lens[i]; }
    return { id: `transit-${t.id}`, kind: 'transit', t, name, x: Math.round(mid.x), y: Math.round(mid.y), route: 'M' + pts.map((p) => `${Math.round(p.x)} ${Math.round(p.y)}`).join(' L'), from, to };
  }).filter(Boolean);
}
export const transitSvg = (n, motion = true) => {
  const file = '<rect class="tbg" x="-9" y="-11" width="18" height="22" rx="2"/><path class="tfile" d="M-5 -7 H2 L5 -4 V7 H-5 Z M2 -7 V-4 H5"/>';
  return `<g class="mnode transit" aria-label="${esc(`${n.name} in transit`)}"><title>${esc(`${n.name}: in transit. Meet it at the entry of the server it's going to.`)}</title><path class="troute" d="${n.route}"/>`
    + (motion ? `<g class="tmover">${file}<animateMotion dur="6s" repeatCount="indefinite" path="${n.route}"/></g>` : `<g class="tmover" transform="translate(${n.x} ${n.y})">${file}</g>`) + '</g>';
};
// A temporary server's card: what it is, its rooms, the thread it belongs to, Connect (none once it's dark).
export function tempCard(s, l, { here = false, busy = false, relock = 0, btn = () => '' } = {}) {
  const dark = isDark(l), t = threadById(s, l.temp.thread), R = l.floorplan, rooms = R ? Object.values(R.graph.rooms).filter((x) => !x.nook) : [], done = rooms.filter((x) => R.cleared[x.id]).length;
  const host = findLocation(s, l.temp.host);
  return `<section class="card th-temp${dark ? ' dark' : ''}"><h2>Temporary server · floor ${l.depth || 1}</h2><h1>${esc(l.name)}</h1>
    <p class="tagline">${dark ? '<span class="tag dim">dark</span>' : `<span class="tag th-tag" title="It never goes on its own. Each visit it grows a room.">grows</span> lv ${l.level}`}${host ? ` · beside ${esc(host.name)}` : ''}</p>
    <div class="stats"><div class="stat"><span class="lbl">Rooms</span><b>${done}/${rooms.length}</b></div><div class="stat"><span class="lbl">Logs</span><b>${(l.temp.read?.build ? 1 : 0) + (l.temp.sweep?.solved ? 1 : 0)}/2</b></div><div class="stat"><span class="lbl">Kill switch</span><b>${dark ? 'thrown' : l.temp.kill ? 'open' : 'sealed'}</b></div></div>
    ${t ? `<p class="svc-line th-line-svc"><span class="fp-qmini">!</span> <b>${esc(chainOf(t).title)}</b>${t.state === 'active' ? ` · ${esc(objectiveOf(s, t))}` : t.state === 'done' ? ` · ${esc(t.lore || '')}` : ' · set aside'}</p>` : ''}
    <div class="row">${dark ? '' : here ? btn('net', 'Back to the run', true) : `<button type="button" class="btn primary" data-command="connect ${esc(l.id)}" ${busy ? 'disabled title="Finish what you are doing first"' : relock ? 'disabled title="Still tracing your last connection"' : ''}>${relock ? `Connect · ${relock}s` : 'Connect'}</button>`}</div></section>`;
}

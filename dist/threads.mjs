// Threads (docs/threads.md): quests you stumble on in server rooms. Never given, never timed: a thread starts in a room
// of its own on a server (a person or a thing waiting there), its amber ! showing once you've been in that room, and it
// sends you off to do other things: reach someone and talk, carry a file out, shut a temporary server down.
//
//   starts     seeded per server (startOn): at most one a server, from its seed, never on SPRAWL-00, the farm, a lair,
//              a rogue server, a member's or a temporary one. An authored chain (content/threads.mjs) lands on the first
//              servers of its floor you connect to (THREAD.authored, surely by the THREAD.pity'th), once you're at its
//              level; any other server holds a one-off (an escort, a talk, a temporary server) THREAD.template of the
//              time. The start is a room of its own (a nook: addNook), hung off a branch, named for what's in it.
//   places     a thread's other rooms, resolved when it starts (placeOf): on its own server, a server one or two links
//              off on the floor, or a server a floor up. Each a nook of its own, deep on its server: you fight to it.
//              A nook comes cleared, so it never holds up Rooms n/N or Mapped (and the bots never walk to one).
//   steps      talk (a person or a thing: lines, sometimes a choice of two), goto (reach a room), escort (a file that
//              walks the room graph to its destination: escortTick), temp (a temporary server: read its logs, beat its
//              kill switch). A step done pays deed XP (deedXpFor, THREAD.xp); the last pays more; the chain's end offers
//              three items, pick one (offerItems), and leaves a line of lore. A faction's standing moves where one is in it.
//   escort     the file is a slow process with its own Integrity: a room for every THREAD.escort.pace of your moves, along
//              the shortest way to its destination, never into a live room or the sealed Core (it waits there till you
//              clear the way). Viruses go for it, not you: every move you're not in its room, each live room beside it
//              bites. At 0 it's corrupted and a clean copy waits back where the leg began (no failure, no loss). Across
//              servers: leg one walks it to this server's entry, it's in transit along the floor's links, and leg two
//              meets you at the destination's entry.
//   temporary  a ? server raised beside the start's server on the floor map, named. It never goes on its own: while it
//              stands it grows a room each visit. Its two log rooms tell what built it and where its kill switch is
//              (a build log, and a process log: forensics.mjs's sweep). Beat its kill switch in the Core and it goes dark
//              for good, greyed on the map, a record.
// State: s.threads (threadsOf). The view: threads-view.mjs. The room engine calls in through netrooms.mjs's WORLD hooks
// (connect, moved, stood, verb, coreOpen, won); the save's v43 adds it (threadsRestore).
import { hooks, emit, warn, hackerLevel, classOf, subOf, addItem, gainXp, deedXpFor, findLocation, active, setDrop, floorUniques, floorUnique } from './combat.mjs';
import { SUBS, defaultSub, createLocation, bandOf, FLOORS, CONFIG, SERVER } from './data.mjs';
import { seeded, rollItem, itemLabel, LOOT, codeOf, uniqueItem } from './gear.mjs';
import * as FP from './floorplan.mjs';
import { addrsOf } from './address.mjs';
import { graphOf, floorsOf } from './floors.mjs';
import { changeRep, FACTIONS } from './factions.mjs';
import { sweepFor } from './forensics.mjs';
import { AUTHOR_FAMILIES } from './families.mjs';
import CONTENT from './content/threads.mjs';

export const THREAD = {
  on: true, // the sims can switch them off; the bots never start one anyway
  template: 0.35, // an eligible server holds a one-off thread this often (when no authored chain lands there)
  authored: 0.6, pity: 2, // an authored chain lands on an eligible server of its floor this often, surely on the second
  // Deed XP (deedXpFor shares: about 5 kills of your level a share at 10, 9 at 30): an authored chain's steps 2.5 each
  // (12 kills at 10), its last 4 (20); a one-off's 1.5 and 2.5. The opening talk pays nothing: it only starts it.
  xp: { step: 2.5, last: 4, shortStep: 1.5, shortLast: 2.5 },
  escort: { max: 100, pace: 2, bite: 0.1, elite: 0.15, inRoom: 0.2, hunter: 0.25 },
  temp: { grow: 6, level: 1 }, // a temporary server grows a room a visit, up to this many; a level over its host
  credits: (L, [base, per]) => base + per * L, // a choice that pays (selling the payroll): base + per × your level
  stats: ['damage', 'crit', 'signal', 'restore', 'clock', 'payload'], // what the three reward items lean to
};
export const CHAINS = CONTENT.chains;
export const TEMPLATES = CONTENT.templates;
const START_LABEL = { 'restore-point': 'Stalled job', 'night-operator': 'Ops room', mirror: 'Index', escort: 'Lost file', talk: 'Idle session', temp: 'Beacon' };

const nowOf = () => hooks.now?.() ?? Date.now();
const mix = (...xs) => xs.reduce((h, x) => (Math.imul(h ^ (typeof x === 'string' ? [...x].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261) : (x >>> 0)), 2654435761) + 0x9e3779b9) >>> 0, 0x7417) || 1;
const shuffled = (r, xs) => xs.map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const byId = (a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1));

// ---------- state ----------
export function threadsOf(s) {
  const T = (s.threads ||= {});
  T.v ||= 1; T.seq ||= 0; T.list ||= []; T.starts ||= {}; T.servers ||= []; T.pity ||= {};
  if (T.track === undefined) T.track = null;
  if (T.offer === undefined) T.offer = null;
  return T;
}
export const threadById = (s, id) => (s.threads?.list || []).find((t) => t.id === id) || null;
export const activeThreads = (s) => (s.threads?.list || []).filter((t) => t.state === 'active');
const locById = (s, id) => (!id ? null : id === CONFIG.zone.id ? s.zone : findLocation(s, id));
const roomsOf = (s, loc) => loc?.floorplan || hooks.roomsFor?.(s, loc) || null;
// Where a thread can start: a traced server of yours to find (never SPRAWL-00, the farm, a lair, a rogue server, a
// member's, a crashed home or a temporary server).
export const eligible = (loc) => !!loc && !loc.zone && !loc.rogue && !loc.farm && !loc.lair && !loc.member && !loc.trunk && !loc.temp && !loc.occupied && !loc.home && loc.id !== CONFIG.zone.id;
const located = (s) => (s.locations || []).filter((l) => eligible(l) && l.slot);

// ---------- chains ----------
// A chain by its id: an authored one, or a one-off built from its template and variant (tpl:<kind>:<n>).
const BUILT = new Map();
export function chainDef(id) {
  if (CHAINS[id]) return CHAINS[id];
  if (BUILT.has(id)) return BUILT.get(id);
  const [, kind, n] = String(id).split(':'), T = TEMPLATES[kind], v = T?.variants?.[Number(n)];
  if (!v) return null;
  const c = { title: v.title, giver: v.giver, reason: v.reason, lore: v.lore, short: true, kind, places: T.places || {}, temps: {} };
  if (kind === 'escort') c.steps = [
    { kind: 'talk', at: 'start', who: v.giver, icon: 'file', verb: 'Take', lines: v.lines, text: `Take ${v.file}.` },
    { kind: 'escort', from: 'start', to: 'to', name: v.file, text: `Walk ${v.file} to {to}.`, done: v.done },
  ];
  if (kind === 'talk') c.steps = [
    { kind: 'talk', at: 'start', who: v.giver, icon: 'npc', verb: 'Talk', lines: v.lines, text: 'Hear them out.' },
    { kind: 'talk', at: 'to', who: v.to, icon: 'npc', verb: 'Talk', lines: v.toLines, text: `Find ${v.to} on {to}.` },
  ];
  if (kind === 'temp') {
    c.temps = { site: { name: v.name, author: v.author, builder: v.builder, kill: 'logs' } };
    c.steps = [
      { kind: 'talk', at: 'start', who: v.giver, icon: 'file', verb: 'Read', spawn: 'site', lines: v.lines, text: `Read ${v.giver}.` },
      { kind: 'temp', server: 'site', goal: 'logs', text: "Read {site}'s logs." },
      { kind: 'temp', server: 'site', goal: 'kill', text: 'Shut {site} down: its Core.' },
    ];
  }
  BUILT.set(id, c);
  return c;
}
export const chainOf = (t) => chainDef(t?.chain);
export const stepOf = (t) => chainOf(t)?.steps?.[t.step] || null;
const placed = (T, chain) => Object.values(T.starts).some((x) => x && x.chain === chain);

// ---------- nooks: a thread's rooms ----------
// A room of its own on a server, hung off a branch (deep: the farthest room from the entry, so you fight to it; else a
// room two or more in, by the seed), on a free cell that never moves an address (address.mjs: never left of the leftmost
// room, above the top row or on the spine's row). It comes cleared, so it never holds up Rooms n/N or Mapped.
export function addNook(R, { label = 'Empty', seed = 1, deep = false, kind = 'empty', extra = {}, clear = true } = {}) {
  const g = R?.graph;
  if (!g) return null;
  const list = Object.values(g.rooms), taken = new Set(list.map((x) => `${x.x},${x.y}`));
  const x0 = Math.min(0, ...list.map((r) => r.x)), y0 = Math.min(...list.map((r) => r.y), ...(g.sockets != null ? [-1] : []));
  const spine = g.spine?.length || 0, bad = new Set([g.entry, g.core, g.den, ...(g.vaults || [])].filter(Boolean));
  const d = FP.distances(g, g.entry);
  const cells = (p) => [[1, 0], [0, 1], [0, -1], [-1, 0]].map(([dx, dy]) => [p.x + dx, p.y + dy]).filter(([x, y]) => !taken.has(`${x},${y}`) && x >= x0 && y >= y0 && !(y === 0 && x >= 0 && x < spine));
  const anchors = list.filter((x) => !bad.has(x.id) && !x.nook && !x.optional && x.kind !== 'socket' && !FP.isPuzzle(x.kind) && d[x.id] != null && cells(x).length).sort(byId);
  if (!anchors.length) return null;
  const r = seeded((seed >>> 0) || 1);
  let at;
  if (deep) at = [...anchors].sort((a, b) => d[b.id] - d[a.id] || FP.neighbours(g, a.id).length - FP.neighbours(g, b.id).length || byId(a, b))[0];
  else { const far = anchors.filter((x) => d[x.id] >= 2), pool = far.length ? far : anchors; at = pool[Math.floor(r() * pool.length)]; }
  const opts = cells(at), [cx, cy] = opts[Math.floor(r() * opts.length)];
  const id = `r${Math.max(...Object.keys(g.rooms).map((k) => Number(k.slice(1)))) + 1}`;
  g.rooms[id] = { id, kind, x: cx, y: cy, depth: (at.depth || 0) + 1, branch: at.branch || at.id, seed: Math.floor(r() * 2 ** 31), nook: true, label, ...extra };
  g.links.push([at.id, id]);
  FP.nameRooms(g);
  if (clear) R.cleared[id] ||= nowOf();
  if (R.drawn) R.seen[id] ||= 'shape';
  if (R.mapped) R.seen[id] = 'kind';
  return g.rooms[id];
}

// ---------- where a thread starts ----------
// This server's start, pinned the first time it's asked (on connect): { chain, room, tid } or null. An authored chain
// for the floor that's still to be placed comes first (it waits, unplaced, while you're under its level); else a
// one-off THREAD.template of the time; else none, for good.
export function startOn(s, loc) {
  const T = threadsOf(s);
  if (!THREAD.on || !eligible(loc) || !loc.slot) return null;
  if (Object.hasOwn(T.starts, loc.id)) return T.starts[loc.id] || null;
  const r = seeded(mix(loc.seed || 1, 'thread')), floor = loc.depth || 1, L = hackerLevel(s);
  const due = Object.keys(CHAINS).find((id) => CHAINS[id].floor === floor && !placed(T, id));
  const roll = r(), tpl = r(), kr = r(), vr = r();
  let chain = null;
  if (due) {
    const n = T.pity[due] || 0;
    if (roll < THREAD.authored || n + 1 >= THREAD.pity) { if (L < CHAINS[due].min) return null; chain = due; }
    else T.pity[due] = n + 1;
  }
  if (!chain && tpl < THREAD.template) {
    const kinds = Object.keys(TEMPLATES), kind = kinds[Math.floor(kr * kinds.length)];
    chain = `tpl:${kind}:${Math.floor(vr * TEMPLATES[kind].variants.length)}`;
  }
  if (!chain) { T.starts[loc.id] = 0; return null; }
  return pinStart(s, loc, chain);
}
function pinStart(s, loc, chain) {
  const T = threadsOf(s), R = roomsOf(s, loc), c = chainDef(chain);
  const room = R && c && addNook(R, { label: CHAINS[chain]?.places?.start?.label || START_LABEL[chain] || START_LABEL[c.kind] || 'Empty', seed: mix(loc.seed || 1, chain) });
  if (!room) { T.starts[loc.id] = 0; return null; }
  return (T.starts[loc.id] = { chain, room: room.id, at: nowOf() });
}
export const startHere = (s, loc) => (loc && s.threads?.starts?.[loc.id]) || null;

// ---------- places ----------
// Servers by links on their floor (the floor's diagram): a BFS from one slot.
function floorDist(s, from) {
  const n = from.depth || 1, g = graphOf(s, n), d = { [from.slot]: 0 }, q = [from.slot];
  while (q.length) { const x = q.shift(); for (const [a, b] of g.links) { const y = a === x ? b : b === x ? a : null; if (y && d[y] == null) { d[y] = d[x] + 1; q.push(y); } } }
  return d;
}
// A located server lo to hi links from base on its floor (the nearest to hi, then by the seed), else the nearest other.
function nearServer(s, base, [lo, hi], seed, apart = new Set()) {
  if (!base?.slot) return null;
  const d = floorDist(s, base), r = seeded(seed);
  const all = located(s).filter((l) => l.id !== base.id && (l.depth || 1) === (base.depth || 1) && d[l.slot] != null), away = all.filter((l) => !apart.has(l.id));
  const xs = (away.length ? away : all).map((l) => ({ l, d: d[l.slot], k: r() }));
  if (!xs.length) return null;
  const inside = (x) => x.d >= lo && x.d <= hi;
  return xs.sort((a, b) => inside(b) - inside(a) || Math.abs(a.d - hi) - Math.abs(b.d - hi) || a.k - b.k)[0].l;
}
// A located server delta floors off (a floor up for -1), on a floor you've reached; by the seed.
function floorServer(s, base, delta, seed) {
  const want = (base.depth || 1) + delta, reached = floorsOf(s).reached || 1, r = seeded(seed);
  const floors = [want, want - Math.sign(delta || 1), want + 2 * Math.sign(delta || 1)].filter((f) => f >= 1 && f <= reached && f !== (base.depth || 1));
  for (const f of floors) {
    const xs = located(s).filter((l) => (l.depth || 1) === f).sort(byIdLoc);
    if (xs.length) return xs[Math.floor(r() * xs.length)];
  }
  return null;
}
const byIdLoc = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
function resolvePlace(s, t, key) {
  const c = chainOf(t), spec = c.places?.[key] || {};
  const start = locById(s, t.places.start.loc), base = (spec.from && locById(s, t.places[spec.from]?.loc)) || start;
  const seed = mix(t.seed, key), apart = new Set(Object.values(t.places).map((p) => p.loc)); // a server none of its other places is on, where there's one
  let loc = base;
  if (spec.near) loc = nearServer(s, base, spec.near, seed, apart) || base;
  else if (spec.floor) loc = floorServer(s, base, spec.floor, seed) || nearServer(s, base, [1, 3], seed) || base;
  const R = roomsOf(s, loc), room = addNook(R, { label: spec.label || 'Empty', seed, deep: true, extra: { thread: t.id } });
  return (t.places[key] = { loc: loc.id, room: room?.id || R.graph.entry });
}
// A place, resolved again if its server went off the map.
export function placeOf(s, t, key) {
  const p = t.places?.[key];
  if (p && locById(s, p.loc)) return p;
  if (key === 'start') return p || null;
  return resolvePlace(s, t, key);
}

// ---------- text ----------
// {place} its server's name, {place.at} its room's address, {temp} a temporary server's name ({temp.rooms} its rooms).
export function fill(s, t, str) {
  return String(str || '').replace(/\{(\w+)(?:\.(\w+))?\}/g, (m, k, f) => {
    const tl = t.temps?.[k] && locById(s, t.temps[k]);
    if (tl) return f === 'rooms' ? String(Object.values(tl.floorplan?.graph.rooms || {}).filter((x) => !x.nook).length) : tl.name;
    if (k === 'builder') { const def = Object.values(chainOf(t)?.temps || {})[0]; return def?.builder || '?'; }
    const p = t.places?.[k], loc = p && locById(s, p.loc);
    if (!loc) return '?';
    return f === 'at' ? addrsOf(roomsOf(s, loc).graph)[p.room] || '?' : loc.name;
  });
}

// ---------- the steps, as the log shows them ----------
// Each step's line: done (struck), the current one, and the ones still ahead (??? until you get there).
export function stepsOf(s, t) {
  const c = chainOf(t);
  return (c?.steps || []).map((st, i) => ({ i, text: i <= t.step || t.state === 'done' ? fill(s, t, st.text) : '???', done: t.state === 'done' || i < t.step, now: t.state !== 'done' && i === t.step, kind: st.kind }));
}
// The thread's current objective in a line, with how far along it is (an escort's file, a temporary server's logs).
export function objectiveOf(s, t) {
  const st = stepOf(t);
  if (!st || t.state === 'done') return chainOf(t)?.lore || '';
  let line = fill(s, t, st.text);
  if (st.kind === 'escort' && t.esc) {
    const e = t.esc;
    line += e.state === 'transit' ? ` In transit to ${locById(s, e.loc)?.name || '?'}.` : ` ${e.name}: ${Math.round((e.hp / e.max) * 100)}%.`;
  }
  if (st.kind === 'temp' && st.goal === 'logs') { const tl = locById(s, t.temps?.[st.server]); if (tl) line += ` ${logsRead(tl)}/2.`; }
  return line;
}
const logsRead = (tl) => (tl.temp.read?.build ? 1 : 0) + (tl.temp.sweep?.solved ? 1 : 0);

// ---------- what a room offers ----------
// The thread business in a room: the start (talk to begin), a talk step, a log, the sweep. null when there's none.
export function offerAt(s, loc, room) {
  if (!loc || !room || !s.threads) return null;
  const T = s.threads, st = T.starts?.[loc.id];
  if (loc.temp) {
    const t = threadById(s, loc.temp.thread), L = loc.temp.logs || {};
    if (room.id === L.build) return { kind: 'log', t, loc };
    if (room.id === L.sweep) return { kind: 'sweep', t, loc };
  }
  for (const t of activeThreads(s)) {
    const step = stepOf(t);
    if (step?.kind === 'talk' && t.step > 0) { const p = t.places[step.at]; if (p?.loc === loc.id && p.room === room.id) return { kind: 'talk', t, step }; }
  }
  if (st && st.room === room.id) {
    const t = st.tid ? threadById(s, st.tid) : null;
    if (!t) return { kind: 'start', chain: st.chain, start: st };
    if (t.state === 'abandoned') return { kind: 'resume', t };
    return { kind: 'again', t };
  }
  return null;
}
// The button's word for it: Talk, Read, Take, Restore…
export function verbOf(s, o) {
  if (!o) return '';
  if (o.kind === 'log' || o.kind === 'sweep') return 'Read';
  if (o.kind === 'resume') return 'Pick it up';
  const c = o.kind === 'start' ? chainDef(o.chain) : chainOf(o.t), st = o.kind === 'talk' ? o.step : c?.steps?.[0];
  return st?.verb || 'Talk';
}
// Who's in the room (its card): the speaker's name and icon.
export function speakerOf(s, o) {
  if (!o) return null;
  if (o.kind === 'log') return { who: 'build.log', icon: 'log' };
  if (o.kind === 'sweep') return { who: 'ps.snapshot', icon: 'log' };
  const c = o.kind === 'start' ? chainDef(o.chain) : chainOf(o.t), st = o.kind === 'talk' ? o.step : c?.steps?.[0];
  return { who: st?.who || c?.giver || '?', icon: st?.icon || 'npc', title: c?.title };
}

// ---------- talking ----------
// talk (read, take) in a room with a thread in it; talk 1 / talk 2 picks a choice; sweep <answer> in a process log.
export function threadVerb(s, loc, room, verb, arg = null) {
  if (!['talk', 'read', 'take', 'sweep'].includes(verb)) return undefined;
  const o = offerAt(s, loc, room);
  if (verb === 'sweep') { if (o?.kind !== 'sweep') return undefined; return answer(s, o, arg); }
  if (!o) { warn(s, `${verb}: nobody here${verb === 'talk' ? ' to talk to' : ''}.`); return true; }
  if (o.kind === 'start') return begin(s, loc, room, o);
  if (o.kind === 'resume') { resume(s, o.t.id); return true; }
  if (o.kind === 'again') { const c = chainOf(o.t); say(s, o.t, { who: c.steps[0].who, icon: c.steps[0].icon, lines: [fill(s, o.t, c.steps[0].lines.at(-1))], room, loc }); return true; }
  if (o.kind === 'log') return readLog(s, o, room);
  if (o.kind === 'sweep') { showSweep(s, o, room); return true; }
  const t = o.t, st = o.step;
  if (st.choice) {
    const n = Number(String(arg || '').trim());
    if (!(n >= 1 && n <= st.choice.length)) { say(s, t, { who: st.who, icon: st.icon, lines: st.lines.map((x) => fill(s, t, x)), choices: st.choice.map((x) => x.label), room, loc }); return true; }
    return choose(s, t, st, st.choice[n - 1], room, loc);
  }
  say(s, t, { who: st.who, icon: st.icon, lines: st.lines.map((x) => fill(s, t, x)), room, loc });
  if (st.kill) killKnown(s, t, st.kill);
  complete(s, t);
  return true;
}
// What was said, for the dialogue panel (threads-view.mjs) and the terminal. Kept until the next thing said.
function say(s, t, { who, icon = 'npc', lines = [], choices = null, room, loc, kind = 'talk', sweep = null }) {
  const T = threadsOf(s);
  T.said = { n: (T.said?.n || 0) + 1, tid: t?.id || null, who, icon, lines, choices, room: room?.id || null, loc: loc?.id || null, kind, title: t ? chainOf(t)?.title : null };
  emit(s, 'thread-talk', [`${who}:`, ...lines, ...(choices ? choices.map((c, i) => `  talk ${i + 1}  ${c}`) : [])].join('\n'), { thread: t?.id || null, who, kind, sweep });
}
function begin(s, loc, room, o) {
  const T = threadsOf(s), c = chainDef(o.chain);
  const t = { id: `t${++T.seq}`, chain: o.chain, seed: mix(loc.seed || 1, T.seq, o.chain), state: 'active', step: 0, places: { start: { loc: loc.id, room: room.id } }, temps: {}, level: loc.level || hackerLevel(s), floor: loc.depth || 1, at: nowOf() };
  T.list.push(t);
  o.start.tid = t.id;
  T.track = t.id;
  for (const key of Object.keys(c.places || {})) placeOf(s, t, key);
  const first = c.steps[0];
  if (first.spawn) spawnTemp(s, t, first.spawn);
  say(s, t, { who: first.who, icon: first.icon, lines: first.lines.map((x) => fill(s, t, x)), room, loc });
  emit(s, 'thread-start', `THREAD: ${c.title}.`, { thread: t.id });
  complete(s, t);
  return true;
}
function choose(s, t, st, ch, room, loc) {
  t.choice = ch.id;
  say(s, t, { who: st.who, icon: st.icon, lines: ch.lines.map((x) => fill(s, t, x)), room, loc });
  for (const [f, n] of Object.entries(ch.rep || {})) if (FACTIONS[f]) changeRep(s, f, n, chainOf(t).title);
  if (ch.credits) { const c = THREAD.credits(hackerLevel(s), ch.credits); s.server.credits += c; emit(s, 'rooms-good', `+${c} credits.`, { credits: c }); }
  complete(s, t);
  return true;
}

// ---------- progress ----------
// A step done: its XP (the opening talk pays none), then the next step set up, or the end.
function complete(s, t) {
  const c = chainOf(t), steps = c.steps;
  if (t.step > 0) payStep(s, t, t.step === steps.length - 1);
  t.step++;
  t.esc = null;
  if (t.step >= steps.length) return finish(s, t);
  const st = steps[t.step];
  if (st.kind === 'escort') {
    const from = placeOf(s, t, st.from);
    t.esc = { loc: from.loc, at: from.room, hp: THREAD.escort.max, max: THREAD.escort.max, count: 0, leg: 1, state: 'walk', name: st.name };
  }
  if (st.kind === 'temp' && !t.temps?.[st.server]) spawnTemp(s, t, st.server);
  reveal(s, t);
  emit(s, 'thread', `${c.title}: ${fill(s, t, st.text)}`, { thread: t.id, step: t.step });
  if (st.kind === 'temp') checkLogs(s, t); // logs you'd already read count
}
// The room a step sends you to is drawn on its server's map (a ? chip, its amber mark on it) once the thread has told you
// where: you see where, never what, until you walk in.
export function reveal(s, t) {
  const st = stepOf(t), k = st?.kind === 'talk' || st?.kind === 'goto' ? st.at : st?.kind === 'escort' ? st.to : null, p = k && t.places?.[k];
  const R = p && roomsOf(s, locById(s, p.loc));
  if (R?.graph.rooms[p.room]) R.seen[p.room] ||= 'shape';
  if (st?.kind === 'temp') { const tl = locById(s, t.temps?.[st.server]); const T2 = tl?.floorplan; if (T2) for (const id of st.goal === 'logs' ? Object.values(tl.temp.logs || {}) : [T2.graph.core]) if (id) T2.seen[id] ||= 'shape'; }
}
function stepLevel(s, t, st) {
  const k = st?.at || st?.to || null, p = k && t.places?.[k], loc = p && locById(s, p.loc), tl = st?.server && locById(s, t.temps?.[st.server]);
  return Math.max(t.level || 1, (tl || loc)?.level || 1); // never under where it started: a chain's step pays as the chain
}
function payStep(s, t, last) {
  const c = chainOf(t), X = THREAD.xp, share = c.short ? (last ? X.shortLast : X.shortStep) : last ? X.last : X.step;
  const xp = Math.round(deedXpFor(s, stepLevel(s, t, c.steps[t.step]), share));
  if (xp > 0) gainXp(s, xp, c.title, 'intel');
}
// The end: the lore line, the reward offer (pick one of three), the next thread tracked.
function finish(s, t) {
  const T = threadsOf(s), c = chainOf(t);
  t.state = 'done'; t.doneAt = nowOf(); t.esc = null;
  const ch = (c.steps.at(-1).choice || []).find((x) => x.id === t.choice);
  t.lore = fill(s, t, ch?.lore || c.lore || '');
  T.offer = { tid: t.id, items: offerItems(s, t) };
  if (T.track === t.id) T.track = activeThreads(s).at(-1)?.id || null;
  emit(s, 'thread-done', `THREAD DONE: ${c.title}. ${t.lore}`, { thread: t.id });
  // Its set roll (sets.mjs: Night Shift's pieces), by the deepest floor it ran on, at the thread's level.
  const floors = Object.values(t.places || {}).map((p) => locById(s, p.loc)?.depth || 1), L = Math.max(1, Math.min(hackerLevel(s) + 1, t.level || hackerLevel(s)));
  setDrop(s, { kind: 'thread', floor: floors.length ? Math.max(...floors) : SERVER.floorFor(L) }, L, c.title);
}
// Three items to pick from, WoW's quest reward: one for your class and the stat your subclass chases, two leaning to
// other stats, each a different slot. A chain's are blues, one a yellow one time in ten (LOOT.quest); a one-off's blues
// half the time (LOOT.minor), else whites. At the thread's level, never over yours + 1. A thread that starts on a floor
// with uniques of its own (source kind 'thread': The Sink's, Bedrock's) offers one of them in the yellow's place, or
// the last item's, one time in ten too (LOOT.quest), one you lack first.
export function offerItems(s, t) {
  const r = seeded(mix(t.seed, 'reward')), c = chainOf(t), cls = classOf(s);
  const L = Math.max(1, Math.min(hackerLevel(s) + 1, Math.max(t.level || 1, ...Object.values(t.places || {}).map((p) => locById(s, p.loc)?.level || 1))));
  const sub = subOf(s) || defaultSub(cls), mine = SUBS[sub]?.chase?.[0] || 'damage';
  const stats = [mine, ...shuffled(r, THREAD.stats.filter((x) => x !== mine)).slice(0, 2)];
  const slots = shuffled(r, ['exploit', 'proxy', 'shell', 'script', ...(L >= 15 ? ['implant'] : [])]).slice(0, 3);
  const gold = !c.short && r() < LOOT.quest ? Math.floor(r() * 3) : -1;
  const items = stats.map((stat, i) => {
    const it = rollItem(r, { level: L, rarity: i === gold ? 'custom' : c.short ? (r() < LOOT.minor ? 'tuned' : 'stock') : 'tuned', stat, slot: slots[i], ...(i === 0 ? { cls } : {}) });
    it.name = it.name.replace(/\b(\w+) \1\b/g, '$1'); // an affix named like its base (Weaponized Weaponized Exploit) reads once
    return it;
  });
  const floor = locById(s, t.places?.start?.loc)?.depth;
  if (floor && floorUniques('thread', floor, L).length && r() < LOOT.quest) {
    const u = floorUnique(s, 'thread', floor, L, r);
    if (u) items[gold >= 0 ? gold : items.length - 1] = uniqueItem(u, L, r);
  }
  return items;
}
// thread take <n>: the item you picked, into your stash.
export function takeReward(s, n) {
  const T = threadsOf(s), o = T.offer;
  if (!o) return warn(s, 'No reward waiting.');
  const it = o.items[Number(n) - 1];
  if (!it) return warn(s, `Pick 1 to ${o.items.length}.`);
  const t = threadById(s, o.tid), got = addItem(s, it, `${chainOf(t)?.title || 'Thread'}: `);
  T.offer = null;
  if (t) t.reward = got ? itemLabel(got) : null;
  emit(s, 'thread-reward', `${chainOf(t)?.title || 'Thread'}: reward taken.`, { thread: o.tid, item: got?.id || null, name: got ? itemLabel(got) : '' });
  return got;
}

// ---------- goto: reaching a room ----------
// You stand in a room with nothing live in it (floorplan.mjs stood): a goto step there is done.
export function threadsStood(s, loc, room) {
  if (!loc || !room || !s.threads) return;
  for (const t of activeThreads(s)) {
    const st = stepOf(t);
    if (st?.kind !== 'goto') continue;
    const p = t.places[st.at];
    if (p?.loc !== loc.id || p.room !== room.id) continue;
    if (st.lines?.length) emit(s, 'rooms-good', st.lines.map((x) => fill(s, t, x)).join(' '), { thread: t.id });
    complete(s, t);
  }
}

// ---------- escort: the file walks ----------
const live = (s, room) => !!room && FP.FIGHTS.includes(room.kind) && FP.isUp(s, room) && !(room.kind === 'core' && !FP.coreOpen(s));
const blocked = (s, room) => !!room && (live(s, room) || (room.kind === 'core' && !FP.coreOpen(s)));
// Where this leg ends: the destination room on its own server, else this server's entry (then it's in transit).
export function escortDest(s, t) {
  const st = stepOf(t), e = t.esc;
  if (!e || st?.kind !== 'escort') return null;
  const to = placeOf(s, t, st.to);
  if (e.loc === to.loc) return to.room;
  const R = roomsOf(s, locById(s, e.loc));
  return R?.graph.entry || null;
}
// Its next room: a step along the shortest open way; null while it waits (blocked: the room in its way).
export function escortNext(s, t) {
  const e = t.esc, R = s.rooms, g = R?.graph, dest = escortDest(s, t);
  if (!e || e.state !== 'walk' || !g || e.loc !== R.loc || !dest || e.at === dest) return null;
  const open = FP.pathTo(g, e.at, dest, (id) => !blocked(s, g.rooms[id]));
  if (open?.[1] && !blocked(s, g.rooms[open[1]])) { e.blocked = null; return open[1]; }
  // No open way: along the shortest one as far as it's clear, then it waits at the first live room (or sealed Core).
  const any = FP.pathTo(g, e.at, dest) || [];
  e.blocked = any.slice(1).find((id) => blocked(s, g.rooms[id])) || null;
  return any[1] && !blocked(s, g.rooms[any[1]]) ? any[1] : null;
}
// The files walking on the server you're on.
export const escortsHere = (s) => (s.rooms?.world ? activeThreads(s).filter((t) => t.esc?.state === 'walk' && t.esc.loc === s.rooms.loc) : []);
// After each move of yours (a step or a wait, floorplan.mjs): the live rooms beside it bite unless you're in its room;
// then it steps on, a room every THREAD.escort.pace moves.
export function threadsMoved(s) {
  if (!s.threads?.list?.length) return;
  for (const t of escortsHere(s)) escortTick(s, t);
}
function escortTick(s, t) {
  const E = THREAD.escort, e = t.esc, R = s.rooms, g = R.graph;
  if (!g.rooms[e.at]) { e.at = g.entry; return; }
  if (R.at !== e.at) {
    let bite = live(s, g.rooms[e.at]) ? E.inRoom : 0;
    for (const id of FP.neighbours(g, e.at)) { const x = g.rooms[id]; if (live(s, x)) bite += x.kind === 'elite' || x.kind === 'guard' ? E.elite : E.bite; }
    const h = FP.hunterOf(s);
    if (h && !h.down && h.at === e.at) bite += E.hunter;
    if (bite) {
      e.hp = Math.max(0, e.hp - Math.max(1, Math.round(e.max * bite)));
      if (e.hp <= 0) return corrupt(s, t);
      emit(s, 'rooms-bad', `${e.name}: ${Math.round((e.hp / e.max) * 100)}%. Something next to it is eating it.`, { thread: t.id, file: true });
    }
  }
  e.count = Math.min(E.pace, e.count + 1);
  if (e.count < E.pace) return;
  const next = escortNext(s, t);
  if (!next) return;
  e.count = 0;
  e.at = next;
  arrived(s, t);
}
function arrived(s, t) {
  const e = t.esc, st = stepOf(t), to = placeOf(s, t, st.to);
  if (e.loc === to.loc && e.at === to.room) {
    emit(s, 'rooms-good', `${e.name} is in.${st.done ? ` ${st.done}` : ''}`, { thread: t.id });
    return complete(s, t);
  }
  const R = roomsOf(s, locById(s, e.loc));
  if (e.loc !== to.loc && e.at === R?.graph.entry) {
    e.state = 'transit'; e.from = e.loc; e.loc = to.loc; e.at = null; e.count = 0;
    emit(s, 'thread', `${e.name} is in transit to ${locById(s, to.loc)?.name || '?'}. Meet it at the entry.`, { thread: t.id });
  }
}
// At 0: corrupted. A clean copy waits where this leg began: the start room on leg one, the entry on leg two.
function corrupt(s, t) {
  const e = t.esc, st = stepOf(t), from = placeOf(s, t, st.from);
  e.hp = e.max; e.count = 0;
  if (e.leg === 1) { e.loc = from.loc; e.at = from.room; }
  else e.at = roomsOf(s, locById(s, e.loc))?.graph.entry || e.at;
  const R = roomsOf(s, locById(s, e.loc));
  emit(s, 'rooms-bad', `${e.name} is corrupted. A clean copy waits in ${R?.graph.rooms[e.at]?.path || 'the start'}.`, { thread: t.id, file: true });
}

// ---------- connecting ----------
// Every connect to a server's rooms (netrooms.mjs enterRooms, before you walk in): its start pinned, a file in transit
// meets you at its entry, a temporary server grows.
export function threadsConnect(s, loc) {
  if (!loc) return;
  if (eligible(loc)) startOn(s, loc);
  if (!s.threads) return;
  const R = roomsOf(s, loc);
  for (const t of activeThreads(s)) {
    const e = t.esc;
    if (e?.state === 'transit' && e.loc === loc.id && R) { e.state = 'walk'; e.leg = 2; e.at = R.graph.entry; e.count = 0; emit(s, 'rooms-good', `${e.name} came through. It waits at the entry.`, { thread: t.id }); }
  }
  if (loc.temp && !loc.temp.dark && R && R.visits >= 1 && (loc.temp.grown || 0) < THREAD.temp.grow && growRoom(s, loc)) {
    loc.temp.grown = (loc.temp.grown || 0) + 1;
    emit(s, 'rooms-bad', `${loc.name} grew a room since you were last here.`, { location: loc.id });
  }
}

// ---------- temporary servers ----------
export const tempServers = (s) => s.threads?.servers || [];
export const tempsOn = (s, floor) => tempServers(s).filter((l) => (l.depth || 1) === floor);
// Its place on the floor map: beside its host, in the clearest spot a link's length off (floor units).
function mapSpot(s, host) {
  const n = host.depth || 1, g = graphOf(s, n), node = g.nodes[host.slot] || g.nodes[g.entry];
  const others = [...Object.values(g.nodes), ...tempsOn(s, n).map((l) => l.temp.at)].filter(Boolean);
  let best = null;
  for (const rad of [104, 132, 160]) {
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8, p = { x: Math.round(node.x + Math.cos(a) * rad), y: Math.round(node.y + Math.sin(a) * rad) };
      const room = Math.min(...others.map((o) => Math.hypot(o.x - p.x, o.y - p.y)));
      if (!best || room > best.room) best = { ...p, room };
    }
    if (best.room >= 88) break;
  }
  return { x: best.x, y: best.y };
}
// Your ground, to copy (Mirror): the server you hold with the most rooms, else the one you've cleared most of.
function groundOf(s) {
  const xs = located(s).filter((l) => l.floorplan?.graph && l.floorplan.type === 'server');
  const cleared = (l) => Object.keys(l.floorplan.cleared || {}).length;
  return xs.sort((a, b) => (b.takenOver ? 1 : 0) - (a.takenOver ? 1 : 0) || cleared(b) - cleared(a) || byIdLoc(a, b))[0] || null;
}
// Its rooms copied from your ground: the same layout (so the same addresses), the fights its builder's, reseeded; your
// sockets, puzzle rooms and stash become fights, and no thread's rooms come along.
function copyGraph(s, seed, author) {
  const src = groundOf(s);
  if (!src) return null;
  const g = structuredClone(src.floorplan.graph), r = seeded(seed), fams = AUTHOR_FAMILIES[author] || AUTHOR_FAMILIES.tollgate;
  for (const x of Object.values(g.rooms)) if (x.nook) { delete g.rooms[x.id]; g.links = g.links.filter(([a, b]) => a !== x.id && b !== x.id); }
  for (const x of Object.values(g.rooms)) {
    for (const k of ['extra', 'open', 'farm', 'wild', 'path0', 'label', 'thread']) delete x[k];
    if (x.kind === 'socket' || x.kind === 'stash' || FP.isPuzzle(x.kind)) { x.kind = 'process'; delete x.board; }
    if (['process', 'elite'].includes(x.kind) || x.mirror) { x.author = author; if (!x.family) x.family = fams[Math.floor(r() * fams.length)]; }
    x.seed = Math.floor(r() * 2 ** 31);
    if (x.kind === 'cache') x.baitSeed = Math.floor(r() * 2 ** 31);
  }
  g.sockets = 0; g.puzzles = 0;
  g.copyOf = src.name;
  return FP.nameRooms(g);
}
const KIND_BY_AUTHOR = { palemask: 'Mirror', swarmline: 'Relay', tollgate: 'Mailhub', glassjaw: 'Archive', lantern: 'Lab' };
const TEMPLATE_OF = { Mirror: 'mirror', Relay: 'relay', Mailhub: 'mailhub', Archive: 'archive', Lab: 'lab' };
function spawnTemp(s, t, key) {
  const T = threadsOf(s), c = chainOf(t), def = c.temps?.[key] || {}, host = locById(s, t.places.start.loc);
  const floor = host?.depth || 1, author = def.author || 'tollgate', kind = KIND_BY_AUTHOR[author] || 'Relay';
  const level = Math.min(bandOf(floor)[1], (host?.level || hackerLevel(s)) + THREAD.temp.level);
  let seed = (mix(t.seed, key) % 900000) + 1000;
  const name = () => `${def.name || 'TEMP'}-${String(seed % 100).padStart(2, '0')}`;
  while (findLocation(s, name().toLowerCase())) seed++;
  const loc = createLocation(host?.family || 'worm', seed, floor);
  Object.assign(loc, { id: name().toLowerCase(), name: name(), level, template: TEMPLATE_OF[kind] || 'relay', trait: null, quirk: null, runs: 0,
    temp: { thread: t.id, key, host: host?.id || null, at: host ? mapSpot(s, host) : { x: 0, y: 0 }, builder: def.builder || 'nobody', copy: !!def.copy, logs: {}, read: {}, sweep: { tries: 0, solved: null }, grown: 0, dark: null, kill: false, by: def.kill || 'logs' } });
  const graph = (def.copy && copyGraph(s, seed, author)) || FP.generate(seed, { size: 'small', kind, level, floor, author, sockets: 0 });
  graph.puzzles ??= 0;
  const R = (loc.floorplan = FP.newRooms(s, { world: true, loc: loc.id, name: loc.name, speed: 1, seed, size: 'small', kind, level, floor, author, graph, type: 'server', code: codeOf(loc.family) || 'cipher' }));
  R.programs = {};
  const build = addNook(R, { label: 'Build log', seed: seed * 3 + 1, deep: true, extra: { log: 'build' } });
  const sweep = addNook(R, { label: 'Process log', seed: seed * 5 + 2, deep: true, extra: { log: 'sweep' } });
  loc.temp.logs = { build: build?.id || null, sweep: sweep?.id || null };
  T.servers.push(loc);
  (t.temps ||= {})[key] = loc.id;
  emit(s, 'thread-temp', `A server appears on floor ${floor}: ${loc.name}.`, { thread: t.id, location: loc.id, floor });
  return loc;
}
// One more fight room on a temporary server, hung off a branch (its builder's families).
function growRoom(s, loc) {
  const R = loc.floorplan, fights = Object.values(R.graph.rooms).filter((x) => x.family && ['process', 'elite'].includes(x.kind)), r = seeded(mix(loc.seed, 'grow', loc.temp.grown || 0));
  const like = fights.length ? fights[Math.floor(r() * fights.length)] : null;
  const room = addNook(R, { label: null, seed: mix(loc.seed, 'grow-at', loc.temp.grown || 0), deep: (loc.temp.grown || 0) % 2 === 0, kind: 'process', clear: false, extra: like ? { family: like.family, author: like.author, third: like.third || null } : { family: 'worm', author: R.author } });
  if (!room) return null;
  delete room.nook; delete room.label;
  FP.nameRooms(R.graph);
  return room;
}
// Its Core (the kill switch) opens once you know it: from its logs, or from its builder (Mirror).
export const tempCoreOpen = (loc) => !!loc?.temp?.kill;
function killKnown(s, t, key) {
  const tl = locById(s, t.temps?.[key]);
  if (tl && !tl.temp.kill) { tl.temp.kill = true; emit(s, 'rooms-good', `${tl.name}'s kill switch: its Core. It opens to you now.`, { location: tl.id }); }
}
// Its Core beaten: dark for good, a record on the map.
export function tempKilled(s, loc) {
  if (!loc?.temp || loc.temp.dark) return;
  loc.temp.dark = nowOf();
  emit(s, 'thread-dark', `${loc.name} goes dark.`, { location: loc.id });
  const t = threadById(s, loc.temp.thread), st = t && stepOf(t);
  if (t?.state === 'active' && st?.kind === 'temp' && st.goal === 'kill' && t.temps[st.server] === loc.id) complete(s, t);
}
export const isDark = (loc) => !!loc?.temp?.dark;
// The build log: who built it and how, in a few lines.
export function buildLog(s, loc) {
  const t = threadById(s, loc.temp.thread), host = locById(s, loc.temp.host), g = loc.floorplan.graph, A = addrsOf(g);
  const npc = t?.places?.npc && locById(s, t.places.npc.loc);
  return [`> build.log · ${loc.name}`,
    `03:12:44  init  host=${loc.name}  by=${loc.temp.builder}`,
    g.copyOf ? `03:12:45  copy  rooms of ${g.copyOf} · ${Object.values(g.rooms).filter((x) => !x.nook).length} of them` : `03:12:45  pull  traffic via ${host?.name || 'the floor'}`,
    '03:12:51  grow  +1 room a visit',
    loc.temp.by === 'talk' ? `03:13:02  kill  sealed · ask ${loc.temp.builder}${npc ? `, last seen on ${npc.name}` : ''}` : `03:13:02  kill  ${A[g.core] || '/core'} · keyed to the builder's pid: see the process log`];
}
function readLog(s, o, room) {
  const tl = o.loc;
  say(s, o.t, { who: 'build.log', icon: 'log', lines: buildLog(s, tl), room, loc: tl, kind: 'log' });
  if (!tl.temp.read.build) { tl.temp.read.build = nowOf(); if (o.t) checkLogs(s, o.t); }
  return true;
}
// The process log: forensics.mjs's sweep (a ps.snapshot): which pid is the builder's.
export const tempSweep = (loc) => ({ ...sweepFor(loc, 'proc'), question: 'Which pid built this server?' });
function showSweep(s, o, room) {
  const p = tempSweep(o.loc);
  say(s, o.t, { who: 'ps.snapshot', icon: 'log', lines: [p.question, ...(p.note ? [p.note] : []), `suspects: ${p.suspects.join(', ')} · sweep <pid>`], room, loc: o.loc, kind: 'sweep', sweep: { ...p, answer: o.loc.temp.sweep.solved ? p.answer : null, solved: o.loc.temp.sweep.solved, tries: o.loc.temp.sweep.tries } });
}
function answer(s, o, arg) {
  const tl = o.loc, p = tempSweep(tl), st = tl.temp.sweep, a = String(arg || '').trim();
  if (!a) { showSweep(s, o, FP.hereOf(s)); return true; }
  if (st.solved) { emit(s, 'rooms-out', `Already swept: ${st.solved}.`); return true; }
  if (!p.suspects.includes(a)) { warn(s, `sweep: ${a} isn't one of them (${p.suspects.join(', ')}).`); return true; }
  if (a !== p.answer) { st.tries++; emit(s, 'rooms-bad', `${a}: it doesn't fit. Look again.`); return true; }
  st.solved = a;
  emit(s, 'rooms-good', `SWEPT: ${a}. ${tl.temp.by === 'logs' ? `The builder's pid keys the kill switch: ${tl.name}'s Core.` : 'The builder ran it. The kill switch is sealed past it.'}`, { location: tl.id });
  if (o.t) checkLogs(s, o.t);
  return true;
}
// A logs step: both read (the build log, the sweep answered). A one-off's kill switch opens with them.
function checkLogs(s, t) {
  const st = stepOf(t);
  if (t.state !== 'active' || st?.kind !== 'temp' || st.goal !== 'logs') return;
  const tl = locById(s, t.temps?.[st.server]);
  if (!tl || logsRead(tl) < 2) return;
  if (tl.temp.by === 'logs') killKnown(s, t, st.server);
  complete(s, t);
}

// ---------- abandon, resume, track ----------
export function abandon(s, id) {
  const t = threadById(s, id);
  if (!t || t.state !== 'active') return warn(s, 'No such thread under way.');
  t.state = 'abandoned';
  const T = threadsOf(s);
  if (T.track === t.id) T.track = activeThreads(s).at(-1)?.id || null;
  return emit(s, 'thread', `${chainOf(t).title}: set aside. Pick it up again from Mail, or where you found it.`, { thread: t.id });
}
export function resume(s, id) {
  const t = threadById(s, id);
  if (!t || t.state !== 'abandoned') return warn(s, 'No such thread set aside.');
  t.state = 'active';
  threadsOf(s).track = t.id;
  return emit(s, 'thread', `${chainOf(t).title}: ${fill(s, t, stepOf(t)?.text)}`, { thread: t.id, step: t.step });
}
export function track(s, id) {
  const t = threadById(s, id), T = threadsOf(s);
  if (!t || t.state !== 'active') return warn(s, 'Track a thread under way.');
  T.track = T.track === t.id ? null : t.id;
  return emit(s, 'info', T.track ? `Tracking ${chainOf(t).title}.` : 'Tracking nothing.');
}
export const tracked = (s) => { const t = threadById(s, s.threads?.track); return t?.state === 'active' ? t : null; };

// ---------- the map's marks ----------
// The rooms a thread marks on this server: { roomId: { mark: '!' | '?', text, tid } }. A start once you've been in its
// room (! until it's begun); the room an active step sends you to, discovered or not (? once the thread told you where);
// a temporary server's logs until read and its Core while it's the step.
export function marksOn(s, loc) {
  const out = {};
  if (!loc || !s.threads) return out;
  const R = loc.floorplan, st = s.threads.starts?.[loc.id];
  if (st && R?.graph.rooms[st.room]) {
    const t = st.tid && threadById(s, st.tid);
    if (!t && R.seen[st.room] === 'kind') out[st.room] = { mark: '!', text: chainDef(st.chain)?.title || 'A thread', tid: null };
    if (t?.state === 'abandoned') out[st.room] = { mark: '!', text: `${chainOf(t).title}: set aside`, tid: t.id };
  }
  for (const t of activeThreads(s)) {
    const step = stepOf(t), title = chainOf(t).title;
    const put = (id, text) => { if (id && R?.graph.rooms[id]) out[id] = { mark: '?', text: `${title}: ${text}`, tid: t.id }; };
    if (step?.kind === 'talk' || step?.kind === 'goto') { const p = t.places[step.at]; if (p?.loc === loc.id) put(p.room, fill(s, t, step.text)); }
    if (step?.kind === 'escort' && t.esc) { const to = t.places[step.to]; if (to?.loc === loc.id && t.esc.loc === loc.id) put(to.room, fill(s, t, step.text)); }
    if (step?.kind === 'temp' && t.temps?.[step.server] === loc.id && loc.temp) {
      if (step.goal === 'logs') { if (!loc.temp.read.build) put(loc.temp.logs.build, 'read the build log'); if (!loc.temp.sweep.solved) put(loc.temp.logs.sweep, 'read the process log'); }
      else put(R.graph.core, 'beat the kill switch');
    }
  }
  return out;
}
// The servers a thread marks on the floor map: { locId: { mark, text } }: a start you've found, an active step's server.
export function serverMarks(s) {
  const out = {};
  if (!s.threads) return out;
  for (const [id, st] of Object.entries(s.threads.starts || {})) {
    const loc = st && locById(s, id), t = st?.tid && threadById(s, st.tid);
    if (loc && !t && loc.floorplan?.seen?.[st.room] === 'kind') out[id] = { mark: '!', text: chainDef(st.chain)?.title || 'A thread' };
  }
  for (const t of activeThreads(s)) {
    const step = stepOf(t), title = chainOf(t).title, text = `${title}: ${fill(s, t, step?.text)}`;
    const k = step?.at || step?.to;
    const loc = step?.kind === 'temp' ? t.temps?.[step.server] : step?.kind === 'escort' && t.esc ? (t.esc.state === 'transit' ? t.esc.loc : t.esc.loc) : k ? t.places[k]?.loc : null;
    if (loc) out[loc] = { mark: '?', text };
  }
  return out;
}
// A file in transit, for the floor map: between the server it left and the one it's going to.
export const transits = (s) => activeThreads(s).filter((t) => t.esc?.state === 'transit').map((t) => ({ t, from: t.esc.from, to: t.esc.loc, name: t.esc.name }));

// ---------- the terminal ----------
// threads, thread <id>, thread track|abandon|resume <id>, thread take <n>; developer thread <chain> pins a start here.
export function threadCommand(s, text) {
  const T = threadsOf(s), [, verb, arg] = text.trim().match(/^threads?\s*(\w+)?\s*(.*)$/) || [];
  const first = s.serial;
  if (!verb || verb === 'list') {
    const lines = T.list.map((t) => `${t.id.padEnd(4)} ${t.state === 'done' ? '✓' : t.state === 'abandoned' ? '·' : t.id === T.track ? '▸' : ' '} ${chainOf(t).title.padEnd(22)} ${t.state === 'done' ? t.lore || '' : t.state === 'abandoned' ? 'set aside' : objectiveOf(s, t)}`);
    emit(s, 'info', lines.length ? lines.join('\n') : 'No threads. They start in rooms: look for an amber !.');
  } else if (verb === 'track') track(s, arg);
  else if (verb === 'abandon' || verb === 'drop') abandon(s, arg);
  else if (verb === 'resume') resume(s, arg);
  else if (verb === 'take' || verb === 'pick') takeReward(s, arg);
  else { const t = threadById(s, verb); if (!t) warn(s, `thread: no ${verb}. Type threads.`); else emit(s, 'info', [`${chainOf(t).title} · ${chainOf(t).giver}`, chainOf(t).reason, ...stepsOf(s, t).map((x) => `${x.done ? '✓' : x.now ? '▸' : ' '} ${x.text}`)].join('\n')); }
  return s.logs.filter((e) => e.id > first);
}
// developer thread <chain>: its start pinned on the server you're on (a new room), whatever the dice said.
export function developerThread(s, chain) {
  const first = s.serial, loc = s.run?.rooms ? locById(s, s.run.loc) : null;
  const id = CHAINS[chain] ? chain : Object.keys(TEMPLATES).includes(chain) ? `tpl:${chain}:0` : null;
  if (!id) warn(s, `developer thread: ${[...Object.keys(CHAINS), ...Object.keys(TEMPLATES)].join(', ')}.`);
  else if (!loc || !eligible(loc) || active(s)) warn(s, 'developer thread: on a traced server, out of a fight.');
  else { const T = threadsOf(s); delete T.starts[loc.id]; const st = pinStart(s, loc, id); emit(s, st ? 'rooms-good' : 'warning', st ? `${chainDef(id).title} starts in ${loc.floorplan.graph.rooms[st.room].path} (${addrsOf(loc.floorplan.graph)[st.room]}).` : 'No room for it here.'); }
  return s.logs.filter((e) => e.id > first);
}

// ---------- the save (v43) ----------
// Threads arrive: an older save starts with none, its servers' starts pinned as you connect to them. Idempotent.
export function threadsRestore(s) {
  const T = threadsOf(s);
  for (const loc of T.servers) { loc.state ||= { cleared: {}, unlocked: {}, taken: {} }; if (loc.floorplan) FP.fogRestore(loc.floorplan); }
  for (const t of T.list) { t.places ||= {}; t.temps ||= {}; if (!chainOf(t)) t.state = 'done'; }
  if (T.offer && !threadById(s, T.offer.tid)) T.offer = null;
  return T;
}

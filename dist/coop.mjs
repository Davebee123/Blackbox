// Co-op sessions, peer to peer (docs/coop.md). The host's game runs the world; a guest's game sends commands and
// draws what the host sends. Pure like the engine: states and links in, messages and notes out. No DOM.
//   hostSession(s)        the host's side: add(link) for each guest that dials in, tick() every frame
//   guestSession(g, link) the guest's side: says hello with the guest's character, tick() every frame
// Messages (all plain JSON):
//   hello {v, name, char}       guest → host: who I am, my character
//   welcome {v, host, you, char, party}   host → guest: you're in (you: the name you go by in this session)
//   refuse {why}                host → guest: not this time
//   ping {at} / pong {at}       either way, every COOP.pingMs: latency, and a link that went quiet
//   leave {}                    either way: I'm going
import { characterOf, playerFrom } from './coop-char.mjs';
import { handleOf } from './profile.mjs';
import { hooks, active, command, emit, maxSignal, bindRooms, xpFor, gainXp, gainCode, codeFrom, rollDrop, addItem, rand, PARTY_XP } from './combat.mjs';
import { matesOf, mateUp, mateSignal } from './crew.mjs';
import { currentLocation } from './run.mjs';
import { ROOMS } from './floorplan.mjs';
import { XP, GUARDS, ELITE, layerOf } from './data.mjs';

export const COOP = {
  v: 1,
  pingMs: 2000,
  dropMs: 10000, // silent this long: gone
  max: 1, // guests a host seats (the prototype is two players)
};

const clock = () => Date.now();
const note = (X, type, message, extra = {}) => { const n = { type, message, at: X.now(), ...extra }; X.notes.push(n); X.onNote?.(n); return n; };

// ---------- the host ----------
export function hostSession(s, { now = clock, onNote = null, max = COOP.max } = {}) {
  const H = { role: 'host', s, name: handleOf(s), guests: [], notes: [], now, onNote, max, closed: false };
  H.add = (link) => addGuest(H, link);
  H.tick = () => hostTick(H);
  H.leave = () => hostLeave(H);
  H.roster = () => H.guests.filter((g) => g.joined).map((g) => ({ name: g.name, cls: g.char.cls, level: g.char.level, lat: g.lat }));
  return H;
}
function addGuest(H, link) {
  const g = { link, name: null, char: null, joined: false, lat: null, seen: H.now(), pinged: 0 };
  H.guests.push(g);
  link.onmessage = (m) => { g.seen = H.now(); hostHears(H, g, m); };
  link.onclose = () => dropGuest(H, g, 'closed');
  return g;
}
// A name for the session that is nobody else's here (two benches are both "bench").
function seatName(H, want) {
  const taken = new Set([H.name, ...(H.s.crewSim || []).map((x) => x.name), ...H.guests.filter((g) => g.joined).map((g) => g.name)]);
  let n = String(want || 'guest').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 16) || 'guest', k = 2;
  const base = n;
  while (taken.has(n)) n = `${base}${k++}`;
  return n;
}
function hostHears(H, g, m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'ping') return g.link.send({ t: 'pong', at: m.at });
  if (m.t === 'pong') { g.lat = Math.max(0, H.now() - m.at); return; }
  if (m.t === 'leave') return dropGuest(H, g, 'left');
  if (m.t === 'hello') {
    if (g.joined) return;
    const why = m.v !== COOP.v ? 'Your game is a different version. Reload it.' : !m.char?.cls ? 'No character came with your hello.' : H.guests.filter((x) => x.joined).length >= H.max ? 'The party is full.' : null;
    if (why) { g.link.send({ t: 'refuse', why }); g.link.close(); H.guests = H.guests.filter((x) => x !== g); return; }
    g.joined = true;
    g.char = m.char;
    g.name = seatName(H, m.char.name || m.name);
    g.link.send({ t: 'welcome', v: COOP.v, host: H.name, you: g.name, char: characterOf(H.s), party: H.roster() });
    note(H, 'joined', `${g.name} joins your party.`, { who: g.name });
    H.joined?.(g);
    return;
  }
  if (!g.joined) return;
  H.hears?.(g, m); // the session's game messages (commands, characters): hostGame
}
function dropGuest(H, g, why) {
  if (!H.guests.includes(g)) return;
  H.guests = H.guests.filter((x) => x !== g);
  if (g.link.open) g.link.close();
  if (!g.joined) return;
  note(H, why === 'left' ? 'left' : 'dropped', why === 'left' ? `${g.name} leaves your party.` : `${g.name} dropped.`, { who: g.name });
  H.dropped?.(g, why);
}
function hostTick(H) {
  const t = H.now();
  for (const g of [...H.guests]) {
    if (t - g.seen > COOP.dropMs) { dropGuest(H, g, 'silent'); continue; }
    if (t - g.pinged >= COOP.pingMs) { g.pinged = t; g.link.send({ t: 'ping', at: t }); }
  }
  H.ticked?.();
}
function hostLeave(H) {
  if (H.closed) return;
  H.closed = true;
  for (const g of [...H.guests]) { g.link.send({ t: 'leave' }); dropGuest(H, g, 'left'); }
  H.ended?.();
}

// ---------- the guest ----------
export function guestSession(save, link, { now = clock, onNote = null } = {}) {
  const G = { role: 'guest', save, link, host: null, you: null, hostChar: null, joined: false, lat: null, seen: now(), pinged: 0, notes: [], now, onNote, closed: false };
  G.tick = () => guestTick(G);
  G.leave = () => guestLeave(G, 'left');
  link.onmessage = (m) => { G.seen = G.now(); guestHears(G, m); };
  link.onclose = () => guestLeave(G, 'host-gone');
  link.send({ t: 'hello', v: COOP.v, name: handleOf(save), char: characterOf(save) });
  return G;
}
function guestHears(G, m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'ping') return G.link.send({ t: 'pong', at: m.at });
  if (m.t === 'pong') { G.lat = Math.max(0, G.now() - m.at); return; }
  if (m.t === 'refuse') { note(G, 'refused', m.why || 'The host said no.'); return guestLeave(G, 'refused'); }
  if (m.t === 'leave') return guestLeave(G, 'host-left');
  if (m.t === 'swap') return G.swapped ? G.swapped(m) : G.becomeHost?.(); // the host hands us the session (hostSwap)
  if (m.t === 'welcome') {
    G.joined = true; G.host = m.host; G.you = m.you; G.hostChar = m.char;
    note(G, 'joined', `You join ${m.host}'s party.`, { who: m.host });
    G.welcomed?.(m);
    return;
  }
  if (!G.joined) return;
  G.hears?.(m); // the session's game messages (snapshots, rewards): guestGame
}
function guestTick(G) {
  const t = G.now();
  if (G.closed) return;
  if (t - G.seen > COOP.dropMs) return guestLeave(G, 'host-gone');
  if (t - G.pinged >= COOP.pingMs) { G.pinged = t; G.link.send({ t: 'ping', at: t }); }
  G.ticked?.();
}
function guestLeave(G, why) {
  if (G.closed) return;
  G.closed = true;
  if (why === 'left' && G.link.open) G.link.send({ t: 'leave' });
  if (G.link.open) G.link.close();
  if (G.joined || why !== 'refused') note(G, why === 'left' ? 'left' : 'host-gone', why === 'left' ? 'You leave the party.' : why === 'host-left' ? `${G.host || 'The host'} ended the session. You're home.` : why === 'refused' ? 'Not joined.' : `${G.host || 'The host'} dropped. You're home.`, { why });
  G.ended?.(why);
}

// ---------- the game: the host's side ----------
// The host seats each guest as a crewmate (crew.mjs reads s._coop.seats, off the save), plays their commands on that
// crewmate, and sends every guest a snapshot of the run and the fight when something changes (COOP.snapMs at most).
//   cmd {text}       guest → host: a fight command for their crewmate
//   char {char}      guest → host: their character changed (out of a fight): re-seated before the next fight
//   snap {…}         host → guest: the world as it is now (see snapshot), with the guest's rewards since the last one
// A seat: { name, char, rev, signal, bot, rewards }. signal: their Signal between fights on this run (null: full).
// bot: they dropped mid-fight and the planner plays them out of it. rewards: owed to their game (coopEnd, cache).
COOP.snapMs = 100;
export const coopOf = (s) => s._coop || null;
const seats = (s) => s._coop?.seats || [];
const seatOf = (s, name) => seats(s).find((x) => x.name === name) || null;
const mateOf = (s, name) => matesOf(s).find((m) => m.seat && m.who === name) || null;
function sit(s, seat) {
  if (!s._coop) Object.defineProperty(s, '_coop', { value: { seats: [] }, enumerable: false, configurable: true, writable: true });
  s._coop.seats.push(seat);
}
function stand(s, name) {
  if (!s._coop) return;
  s._coop.seats = s._coop.seats.filter((x) => x.name !== name);
  if (!s._coop.seats.length) delete s._coop;
}
// Every human in the fight has a command in (the co-op rule: then the cycle turns; else the timer turns it).
export function humansReady(s) {
  return matesOf(s).filter((m) => m.seat && !m.seat.bot && mateUp(m)).every((m) => !!m.encounter.queue);
}
// A guest's command, on their crewmate. Out of a fight the host leads, so it's refused.
export function seatCommand(s, name, text) {
  const m = mateOf(s, name), first = s.serial;
  const out = () => s.logs.filter((e) => e.id > first);
  if (!m) return [];
  if (!active(s) || !m.encounter || !active(m)) { emit(m, 'warning', `${handleOf(s)} leads the party. You follow.`); return out(); }
  if (m.encounter.down) { emit(m, 'warning', "You're down for the rest of this fight."); return out(); }
  const word = String(text || '').trim().toLowerCase();
  if (/^(jack out|flee|pause|resume|speed\b|developer\b)/.test(word)) { emit(m, 'warning', `Only ${handleOf(s)} can do that in a shared fight.`); return out(); }
  if (word === 'now' || word === 'go') { emit(m, 'warning', 'The cycle turns when everyone has a command in, or when the timer runs out.'); return out(); }
  if (s.encounter.paused) { s.encounter.paused = false; s.encounter.autoPaused = false; emit(s, 'info', 'Resumed.'); } // any order resumes a paused fight, theirs too
  const was = m.encounter.queue;
  command(m, text);
  const warned = s.logs.some((e) => e.id > first && e.type === 'warning');
  // Everyone's in: the cycle turns now (else the host's own command, or the timer, turns it).
  if (!warned && m.encounter.queue && m.encounter.queue !== was && s.encounter.queue && humansReady(s)) command(s, 'now');
  return out();
}

// A won fight, owed to each player seated in it: what their own game needs to pay them at their own level.
hooks.coopEnd = (s, m, result) => {
  if (result !== 'victory') return;
  const e = s.encounter, v = e.virus, loc = s.run ? currentLocation(s) : null, depth = loc?.depth || 1;
  const base = e.rooms ? e.roomsXp || 1 : e.zone ? XP.home : e.mode === 'run' ? XP.guard : XP.home;
  const guard = !!GUARDS[e.key];
  m.seat.rewards.push({ kind: 'kill', host: handleOf(s), name: v.name, level: v.level, family: v.family || loc?.family || null, elite: !!v.elite, boss: v.boss || null, party: e.party || 2, base,
    ctx: { kind: guard ? 'guard' : 'home', id: e.key, layer: layerOf(depth), floor: depth, family: loc?.family || v.family, elite: !!v.elite, boss: v.boss || null, rare: !!v.rare } });
};

// What the host sends: the run (without the host's pack), the server it is on, the fight (the host's encounter: the
// virus and the clock), and each player: their Signal and their own encounter (their queue, cooldowns, buffs). Their
// characters go once, and again when one changes. The guest's game turns it into its own view (viewOf).
const KEEP_OUT = new Set(['xp', 'level-up', 'fresh', 'fast-kill', 'hot-kill', 'rested', 'behind', 'behind-on', 'set-xp', 'read-xp', 'drop', 'code', 'loot', 'gear',
  'jacked-out', 'contract-done', 'contract-taken', 'bought', 'crafted', 'world-event', 'rooms-good', 'rooms-bad', 'rooms-out', 'net-out', 'net-good', 'net-err', 'net-scan',
  'lead', 'located', 'takeover', 'root', 'streak', 'codex', 'research', 'mastered', 'puzzle', 'puzzle-end', 'thread', 'thread-talk', 'thread-start', 'thread-reward', 'rail', 'program']);
const shared = (e) => !KEEP_OUT.has(e.type) && !(e.type === 'info' && !e.who);
const omit = (o, k) => { if (!o) return o; const { [k]: _, ...rest } = o; return rest; };
const copy = (x) => (x == null ? null : JSON.parse(JSON.stringify(x)));
export function snapshot(s, g) {
  const e = s.encounter, loc = s.run ? currentLocation(s) : null;
  const party = matesOf(s).map((m) => {
    const enc = m.encounter || (m.ended && e && !active(s) ? m.ended : null);
    return { who: m.who, human: !!m.seat && !m.seat.bot, sig: mateSignal(s, m), max: maxSignal(m), enc: enc ? copy(omit(enc, 'virus')) : null, run: { integrity: m.run.integrity, max: m.run.max } };
  });
  return { host: handleOf(s), you: g.name, speed: s.settings?.speed || 'normal', run: s.run ? { ...copy(s.run), pack: [] } : null, loc: copy(loc), enc: copy(e), party };
}
export function hostGame(H) {
  const s = H.s;
  H.seq = 0;
  H.taken = {};
  H.joined = (g) => {
    sit(s, { name: g.name, char: g.char, rev: 1, signal: null, bot: false, rewards: [] });
    g.sent = { log: s.serial, chars: {}, body: null, at: 0 };
  };
  H.hears = (g, m) => {
    if (m.t === 'cmd') { const ev = seatCommand(s, g.name, m.text); H.played?.(g, ev); } // (an optional call would skip the command with no listener)
    else if (m.t === 'char' && m.char?.cls) { const seat = seatOf(s, g.name); if (seat) { seat.next = m.char; if (!active(s)) reseat(seat); } }
  };
  H.dropped = (g) => {
    const seat = seatOf(s, g.name);
    if (!seat) return;
    if (active(s) && mateOf(s, g.name)?.encounter) { seat.bot = true; seat.leaving = true; emit(s, 'status', `${g.name} dropped. The planner plays them out of this fight.`); }
    else stand(s, g.name);
  };
  H.ended = () => { for (const x of [...seats(s)]) stand(s, x.name); };
  H.ticked = () => {
    // Drops that waited out their fight leave now; a character sent mid-fight takes its seat now.
    for (const x of [...seats(s)]) { if (x.leaving && !active(s)) stand(s, x.name); else if (x.next && !active(s)) reseat(x); }
    roomShares(H);
    const t = H.now();
    for (const g of H.guests.filter((x) => x.joined && x.sent)) {
      if (t - g.sent.at < COOP.snapMs) continue;
      const seat = seatOf(s, g.name), snap = snapshot(s, g), body = JSON.stringify(snap);
      const logs = s.logs.filter((e) => e.id > g.sent.log && shared(e));
      const chars = {}, mine = JSON.stringify(characterOf(s));
      if (g.sent.chars[snap.host] !== mine) { chars[snap.host] = JSON.parse(mine); g.sent.chars[snap.host] = mine; }
      for (const m of matesOf(s)) if (m.who !== g.name) { const c = JSON.stringify(m.seat ? m.seat.char : characterOf(m)); if (g.sent.chars[m.who] !== c) { chars[m.who] = JSON.parse(c); g.sent.chars[m.who] = c; } }
      const owed = seat ? seat.rewards.length : 0;
      if (body === g.sent.body && !logs.length && !owed && !Object.keys(chars).length) continue;
      g.sent.log = s.serial; g.sent.body = body; g.sent.at = t;
      g.link.send({ t: 'snap', n: ++H.seq, ...snap, logs, rewards: seat ? seat.rewards.splice(0) : [], chars });
    }
  };
  return H;
}
function reseat(seat) { seat.char = seat.next; seat.next = null; seat.rev++; }
// Rooms on the host's run that pay the party: a cache or stash the host takes pays each guest a share of their own,
// rolled on their own dice; a rest heals each guest's Signal by the rest's share. A new run starts everyone full.
function roomShares(H) {
  const s = H.s, R = s.run ? s.rooms : null, key = s.run ? `${s.run.loc}:${R?.visits ?? 0}` : null;
  if (key !== H.runKey) {
    if (key && !String(H.runKey || '').startsWith(s.run.loc + ':')) for (const x of seats(s)) x.signal = null; // a new run: everyone full
    H.runKey = key; H.taken = { ...(R?.taken || {}) }; H.rested = !!R?.visit?.rested;
    return;
  }
  if (!R) return;
  for (const [id, at] of Object.entries(R.taken || {})) {
    if (H.taken[id] === at) continue;
    H.taken[id] = at;
    const room = R.graph.rooms[id];
    if (!['cache', 'stash', 'secret', 'purse'].includes(room?.kind)) continue;
    const fam = Object.values(R.graph.rooms).find((x) => x.family)?.family;
    const material = { ransomware: 'cipher', worm: 'worm', ghostroot: 'kernel', trojan: 'worm', cryptominer: 'cipher', wiper: 'cipher' }[fam] || 'cipher';
    for (const x of seats(s)) x.rewards.push({ kind: 'cache', room: room.kind, level: R.level || 1, material });
  }
  if (R.visit?.rested && !H.rested) {
    for (const m of matesOf(s).filter((x) => x.seat)) { const max = maxSignal(m), now = m.seat.signal == null ? max : m.seat.signal; m.seat.signal = Math.min(max, now + Math.round(max * ROOMS.rest)); if (m.seat.signal >= max) m.seat.signal = null; }
  }
  H.rested = !!R.visit?.rested;
}

// ---------- the game: the guest's side ----------
// Each snapshot becomes the guest's view (viewOf) and the new log lines in it (remapped: the guest's own are "you",
// the host's carry the host's name). Rewards are paid on the guest's own save first, and their lines join the view's.
export function guestGame(G) {
  G.log = []; G.serial = 0; G.players = {}; G.chars = {}; G.view = null;
  G.hears = (m) => {
    if (m.t !== 'snap') return;
    Object.assign(G.chars, m.chars || {});
    const paid = (m.rewards || []).flatMap((r) => payReward(G.save, r));
    const fresh = [...remap(m.logs || [], m.host, m.you), ...paid.map((e) => ({ ...e }))].map((e) => ({ ...e, id: ++G.serial }));
    G.log.push(...fresh);
    if (G.log.length > 600) G.log.splice(0, G.log.length - 600);
    G.snap = m;
    G.view = m.run ? viewOf(G, m) : null;
    G.updated?.(G.view, fresh, paid);
  };
  // The host swap, this side: our game hosts now, on the same link (the old host's hello comes next).
  G.becomeHost = (opts = {}) => {
    G.closed = true;
    const H = hostGame(hostSession(G.save, { now: G.now, onNote: opts.onNote ?? G.onNote }));
    H.add(G.link);
    G.became = H;
    return H;
  };
  G.command = (text) => { if (G.joined && !G.closed) G.link.send({ t: 'cmd', text }); };
  G.sendChar = () => { if (G.joined && !G.closed) G.link.send({ t: 'char', char: characterOf(G.save) }); };
  return G;
}
// Who did it, from the guest's side: the guest's lines lose their name (they are "you"), the host's player lines gain
// the host's. Another player's typo stays theirs.
const PLAYER_TYPES = new Set(['damage', 'miss', 'server-hit', 'evaded', 'blocked', 'heal', 'queued', 'hold', 'resolved', 'warning', 'warning-soft', 'encrypt', 'encrypted', 'scrambled', 'hung', 'regen', 'synced', 'read', 'proc', 'locked', 'armor', 'status', 'blind', 'fled']);
export function remap(events, host, you) {
  return events.map((e) => {
    if (e.who === you) { const { who: _, ...x } = e; return x; }
    // The fight's end is everyone's, but the Signal it quotes is the host's.
    if (!e.who && (e.type === 'victory' || e.type === 'crashed')) return { ...e, message: e.message.replace(/ Signal \d+\/\d+\.$/, '') };
    if (!e.who && PLAYER_TYPES.has(e.type)) return { ...e, who: host };
    return { ...e };
  }).filter((e) => !(['warning', 'warning-soft'].includes(e.type) && e.who));
}
// The fight's clock is the host's; everything else in the encounter is the guest's own crewmate's.
const CLOCK = ['cycle', 'phase', 'elapsedMs', 'paused', 'autoPaused', 'sync', 'steps', 'party', 'guests'];
const swapSteps = (st, host, you) => (st ? { ...st, order: (st.order || []).map((w) => (w === 'you' ? host : w === you ? 'you' : w)) } : st);
// The guest's view of the host's world: their own save (settings, stash, bar, handle) with the host's run, server and
// fight in, the guest as "you" and the host as a crewmate. Never saved (the page saves G.save).
export function viewOf(G, m) {
  const save = G.save, me = m.party.find((p) => p.who === m.you);
  const V = { ...save };
  V.settings = new Proxy(save.settings, { get: (t, k) => (k === 'speed' ? m.speed : t[k]) }); // the host's clock; a setting changed goes to the guest's own
  const mine = me?.enc ? me.run : { integrity: me ? me.sig : 0, max: me ? me.max : 0 };
  const crew = { [m.host]: { cwd: m.run.cwd, link: 'you' } };
  for (const p of m.party) if (p.who !== m.you) crew[p.who] = { cwd: m.run.crew?.[p.who]?.cwd ?? m.run.cwd, link: 'you' };
  V.run = { ...m.run, integrity: mine.integrity, max: mine.max, pack: [], crew };
  V.locations = m.loc && !m.loc.zone ? [m.loc] : [];
  if (m.loc?.zone) V.zone = m.loc;
  V.logs = G.log;
  V.serial = G.serial;
  V.encounter = null;
  if (m.enc && me?.enc) {
    V.encounter = { ...me.enc, virus: m.enc.virus };
    for (const k of CLOCK) V.encounter[k] = m.enc[k];
    V.encounter.steps = swapSteps(m.enc.steps, m.host, m.you);
  }
  delete V.rooms;
  bindRooms(V);
  // The other players, as crewmates: the host under their handle, then the rest (bots, other guests).
  const others = [{ who: m.host, enc: m.enc && omit(m.enc, 'virus'), run: m.run, sig: m.run.integrity, max: m.run.max }, ...m.party.filter((p) => p.who !== m.you)];
  const mates = others.filter((p) => G.chars[p.who]).map((p) => {
    let x = G.players[p.who];
    if (!x || x.char !== G.chars[p.who]) x = G.players[p.who] = { char: G.chars[p.who], st: playerFrom(G.chars[p.who]) };
    const st = x.st;
    st.who = p.who;
    Object.defineProperty(st, 'host', { value: V, enumerable: false, configurable: true });
    st.logs = V.logs;
    st.run = { loc: 'crew', cwd: m.run.cwd, integrity: p.enc ? p.run.integrity : p.sig, max: p.enc ? p.run.max : p.max, pack: [], visited: [] };
    st.encounter = p.enc && V.encounter ? { ...p.enc, virus: V.encounter.virus, cycle: m.enc.cycle, phase: m.enc.phase } : null;
    return st;
  });
  Object.defineProperty(V, '_coopMates', { value: mates, enumerable: false, configurable: true });
  Object.defineProperty(V, 'coopView', { value: { host: m.host, you: m.you, real: save }, enumerable: false, configurable: true });
  return V;
}
// A reward, paid by the guest's game on the guest's save: a kill at the guest's own level and on their own dice (the
// party's XP share; code and a drop straight into their bank and stash: they carry no pack on someone else's run), or
// a cache's share. Returns the lines it logged.
export function payReward(s, r) {
  const first = s.serial;
  if (r.kind === 'kill') {
    const n = Math.max(1, r.party || 2);
    const pool = xpFor(s, r.level, r.base || 1) * (r.elite ? ELITE.xp : 1) * (1 + PARTY_XP * (n - 1));
    gainXp(s, Math.max(1, Math.round(pool / n)), `${r.name} neutralized with ${r.host || 'your party'}`, 'fight');
    if (r.family) gainCode(s, codeFrom(s, r.family, r.level, 'home'), 'Code: ');
    const item = rollDrop(s, r.ctx || { kind: 'home', family: r.family }, r.level);
    if (item) addItem(s, item);
  } else if (r.kind === 'cache') {
    const C = ROOMS.cache, roll = (lo, hi) => lo + Math.floor(rand(s) * (hi - lo + 1));
    const credits = Math.round(roll(C.credits[0], C.credits[1]) * (1 + (r.level || 1) / 20)), code = roll(C.code[0], C.code[1]);
    s.server.credits += credits;
    emit(s, 'coop-share', `Your share of the ${r.room === 'cache' ? 'cache' : 'stash'}: ${credits} credits.`, { amount: credits });
    gainCode(s, { [r.material || 'cipher']: code }, 'Cache share: ');
  }
  return s.logs.filter((e) => e.id > first);
}

// ---------- the host swap ----------
// "Go to <guest>'s network": the host's game hands the session to its guest, on the same link, and says hello as their
// guest. Only out of a run (jack out first): a run is the host's, and it can't move to another world mid-way.
export function hostSwap(H, g = H.guests.find((x) => x.joined)) {
  const s = H.s;
  if (!g) return { error: 'Nobody to go to.' };
  if (active(s) || s.run) return { error: 'Jack out first. Then go to their network.' };
  for (const x of H.guests.filter((y) => y !== g)) { x.link.send({ t: 'leave' }); dropGuest(H, x, 'left'); }
  H.guests = [];
  stand(s, g.name);
  H.closed = true;
  g.link.send({ t: 'swap' });
  return guestGame(guestSession(s, g.link, { now: H.now, onNote: H.onNote }));
}

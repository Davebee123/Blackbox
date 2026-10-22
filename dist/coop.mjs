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
import { characterOf } from './coop-char.mjs';
import { handleOf } from './profile.mjs';

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


// Presence: who's online, where they are, and your friends list. On a save with a network, the people are its
// runners (runners.mjs): always on while you are, each where their loop has them, and your consortium's members
// beside them. A save with no network seed (a bare engine state in tests) keeps the old simulated pool behind
// `online sim`: hackers who log on and off over the day, worked out from the clock. The friends list lives on the save.
//
// SPRAWL-00 is the shared space: anyone online can be in one of its folders, and you see them
// there. Every other server is private (a run, a rogue server, someone's own box), so all you see
// is "on a run", except the consortium's ground (consortium.mjs), which its members share. When the server exists, `online()` reads it instead; nothing else changes.
import { hooks } from './combat.mjs';
import { ARCHETYPES } from './data.mjs';
import { zoneRooms } from './zone.mjs';
import { groundOf, isMember } from './consortium.mjs';
import { castOf, runnerOf, levelOf, placeOf as runnerPlace, hash as rhash } from './runners.mjs';

export const PRESENCE = {
  pool: ['nyx', 'kilo', 'vanta', 'sable', 'wisp', 'quill', 'rook', 'byte', 'ash', 'lumen', 'cipher_', 'zer0', 'echo9', 'grim', 'static', 'wren', 'halt', 'fen', 'oxide', 'marrow'],
  onlineShare: 0.55, // of the pool, at any time
  sessionMs: 20 * 60000, // how long a stretch online (or off) lasts
  moveMs: 75000, // how often someone moves on
};
const clock = () => hooks.now?.() ?? Date.now();
// A number in [0, 1) from a string and a counter: the same inputs always give the same answer.
function hash(text, n) {
  let h = 2166136261 ^ n;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const CLASSES = Object.keys(ARCHETYPES);
// A simulated hacker's fixed profile.
export function profileOf(handle, s = null) {
  const r = s && runnerOf(s, handle);
  if (r) return { handle, cls: r.cls, level: levelOf(s, r) };
  return { handle, cls: CLASSES[Math.floor(hash(handle, 1) * CLASSES.length)], level: 1 + Math.floor(hash(handle, 2) * 24) };
}
const offset = (h) => Math.floor(hash(h, 3) * PRESENCE.sessionMs);

export const simOn = (s) => !!s.onlineSim;
// Runners are on the net: a save with a network has its cast.
export const runnersOn = (s) => castOf(s).length > 0;
// Anyone about: runners, or the old pool with online sim.
export const peopleOn = (s, runnersOnly = false) => (runnersOnly ? runnersOn(s) : simOn(s) || runnersOn(s));
// Anyone you could name: a runner on your net, or one of the old pool (your consortium's members until R4).
export const isPerson = (s, h) => PRESENCE.pool.includes(h) || !!runnerOf(s, h);
export const friends = (s) => (s.friends ||= []);
export const isFriend = (s, h) => friends(s).includes(h);

// Where one simulated hacker is right now (null: offline).
function placeOf(h, now) {
  const session = Math.floor((now + offset(h)) / PRESENCE.sessionMs);
  if (hash(h, session * 7 + 11) >= PRESENCE.onlineShare) return null;
  const step = Math.floor((now + offset(h)) / PRESENCE.moveMs);
  const r = hash(h, step * 13 + 5), rooms = zoneRooms();
  if (r < 0.5) return { kind: 'sprawl', folder: rooms[Math.floor(hash(h, step * 17 + 9) * rooms.length)], fighting: hash(h, step * 19 + 3) < 0.35 };
  if (r < 0.75) return { kind: 'run' };
  if (r < 0.88) return { kind: 'rogue' };
  return { kind: 'home' };
}

// A consortium member online spends part of their time on its ground (consortium.mjs: members'
// servers, your outposts and rogue servers), in one of its folders, moving on like everyone else.
function groundPlace(s, h, now, place) {
  const land = groundOf(s);
  if (!place || !land.length || !isMember(s, h)) return place;
  const step = Math.floor((now + offset(h)) / PRESENCE.moveMs);
  if (hash(h, step * 23 + 1) >= 0.45) return place;
  const own = land.filter((l) => l.member === h), pick = own.length && hash(h, step * 37 + 2) < 0.5 ? own : land; // often on their own servers
  const t = pick[Math.floor(hash(h, step * 29 + 7) * pick.length)];
  const folders = hooks.foldersOf?.(t) || [];
  return { kind: 'consortium', loc: t.id, locName: t.name, folder: folders[Math.floor(hash(h, step * 31 + 3) * folders.length)] || '/', fighting: false };
}

// Everyone online now: friends and consortium members first, then by handle. On a network, the runners (where their
// loop has them, on logged-on time) and your consortium's members; else, with online sim, the old pool.
export function online(s, now = clock()) {
  const crew = (s.crewSim || []).map((x) => x.name);
  const cast = castOf(s);
  if (!cast.length && !simOn(s)) return [];
  const rooms = cast.length ? zoneRooms() : null;
  // A runner in SPRAWL-00 is in one of its rooms, the same one all their cycle (a new one the next).
  const runner = (h) => { const r = runnerOf(s, h), p = runnerPlace(s, r); return p.kind === 'sprawl' ? { ...p, folder: rooms[Math.floor(rhash(h, Math.floor(((s.runners?.ms || 0) + r.phase) / r.cycle)) * rooms.length)] } : p; };
  // Your crew is with you (on your run, or waiting for one), wherever they'd otherwise be.
  const where = (h) => (crew.includes(h) ? { kind: 'crew', folder: s.run?.crew?.[h]?.cwd || null } : groundPlace(s, h, now, runnerOf(s, h) ? runner(h) : placeOf(h, now)));
  const crewCls = (h) => (s.crewSim || []).find((x) => x.name === h)?.cls;
  const handles = cast.length ? [...new Set([...cast.map((r) => r.handle), ...(s.consortium?.members || []).filter((h) => PRESENCE.pool.includes(h))])] : PRESENCE.pool;
  return handles.map((h) => ({ ...profileOf(h, s), ...(crewCls(h) ? { cls: crewCls(h) } : {}), runner: !!runnerOf(s, h), place: where(h), friend: isFriend(s, h), member: isMember(s, h) }))
    .filter((x) => x.place)
    .sort((a, b) => b.friend - a.friend || b.member - a.member || a.handle.localeCompare(b.handle));
}
// The people panel's list: runners only once they're a friend, a member or your crew (the map shows the rest).
export const listed = (s, now = clock()) => { const crew = (s.crewSim || []).map((x) => x.name); return online(s, now).filter((x) => !x.runner || x.friend || x.member || crew.includes(x.handle)); };
// The shared places: SPRAWL-00 (key 'sprawl') and the consortium's ground (key: the server's id).
const placeKey = (p) => (p.kind === 'sprawl' ? 'sprawl' : p.kind === 'consortium' ? p.loc : null);
// Who's in a folder of a shared place (deep: or anywhere inside it, as ls shows next to a folder).
export const at = (s, key, folder, deep = false, now = clock()) => online(s, now).filter((x) => placeKey(x.place) === key && (x.place.folder === folder || (deep && x.place.folder.startsWith(folder + '/'))));
export const inFolder = (s, folder, now = clock()) => at(s, 'sprawl', folder, false, now);
export const under = (s, folder, now = clock()) => at(s, 'sprawl', folder, true, now);
export const inSprawl = (s, now = clock()) => online(s, now).filter((x) => x.place.kind === 'sprawl');
// Where someone is, in words: SPRAWL-00's room by its name (netrooms.mjs: rooms are named for what they are, Process 3,
// never by the folder they stand for); a member's server by its name.
const roomName = (folder) => hooks.sprawlRoomName?.(folder) ?? folder;
export const whereText = (p) => (p.kind === 'sprawl' ? `SPRAWL-00 · ${roomName(p.folder)}${p.fighting ? ' · fighting' : ''}` : p.kind === 'consortium' ? `${p.locName}` : p.kind === 'crew' ? 'in your crew'
  : p.kind === 'travel' ? `→ ${p.toName}` : p.kind === 'server' || p.kind === 'hub' ? `${p.name}${p.fighting ? ' · working' : ''}` : p.kind === 'run' ? 'on a run' : p.kind === 'rogue' ? 'on a rogue server' : 'at home');

// `online sim`, `online off`, `who`, `friends`, `friend add <handle>`, `friend remove <handle>`.
export function presenceCommand(s, word, rest, emit, warn) {
  if (word === 'online') {
    if (rest === 'sim') { s.onlineSim = true; return emit(s, 'info', `Online (simulated): ${online(s).length} hackers on. The people button on the top bar lists them.`); }
    if (rest === 'off') { s.onlineSim = false; return emit(s, 'info', 'Online off.'); }
    return warn(s, 'online sim, online off');
  }
  if (word === 'who') {
    const list = online(s);
    return emit(s, 'info', !simOn(s) && !runnersOn(s) ? 'Nobody online. Try online sim.' : list.length ? `Online: ${list.map((x) => `${x.friend ? '★' : ''}${x.handle} (${ARCHETYPES[x.cls].name} ${x.level}, ${whereText(x.place)})`).join(' · ')}.` : 'Nobody else is online.');
  }
  if (word === 'friends') return emit(s, 'info', friends(s).length ? `Friends: ${friends(s).join(', ')}.` : 'No friends yet. friend add <handle>');
  const [verb, handle] = rest.split(' ');
  if (!handle || !['add', 'remove'].includes(verb)) return warn(s, 'friend add <handle>, friend remove <handle>');
  if (verb === 'add') {
    if (!isPerson(s, handle)) return warn(s, `No hacker called ${handle}.`);
    if (isFriend(s, handle)) return warn(s, `${handle} is already a friend.`);
    friends(s).push(handle);
    return emit(s, 'info', `${handle} added to your friends.`);
  }
  if (!isFriend(s, handle)) return warn(s, `${handle} isn't on your friends list.`);
  s.friends = friends(s).filter((x) => x !== handle);
  return emit(s, 'info', `${handle} removed from your friends.`);
}

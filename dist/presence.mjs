// Presence: who's online, where they are, and your friends list. Until there's a server, the
// people are simulated (`online sim` turns them on, `online off` off): a pool of hackers who log on
// and off over the day and move around every minute or so, worked out from the clock (nothing to
// save, and the same answer everywhere). The friends list is real and lives on the save.
//
// SPRAWL-00 is the shared space: anyone online can be in one of its folders, and you see them
// there. Every other server is private (a run, a rogue server, someone's own box), so all you see
// is "on a run". When the server exists, `online()` reads it instead; nothing else changes.
import { hooks } from './combat.mjs';
import { ARCHETYPES } from './data.mjs';
import { zoneRooms } from './zone.mjs';

export const PRESENCE = {
  pool: ['nyx', 'kilo', 'vanta', 'sable', 'moth', 'quill', 'rook', 'byte', 'ash', 'lumen', 'cipher_', 'zer0', 'echo9', 'grim', 'static', 'wren', 'halt', 'fen', 'oxide', 'marrow'],
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
export function profileOf(handle) {
  return { handle, cls: CLASSES[Math.floor(hash(handle, 1) * CLASSES.length)], level: 1 + Math.floor(hash(handle, 2) * 24) };
}
const offset = (h) => Math.floor(hash(h, 3) * PRESENCE.sessionMs);

export const simOn = (s) => !!s.onlineSim;
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

// Everyone online now: friends first, then by handle.
export function online(s, now = clock()) {
  if (!simOn(s)) return [];
  return PRESENCE.pool.map((h) => ({ ...profileOf(h), place: placeOf(h, now), friend: isFriend(s, h) }))
    .filter((x) => x.place)
    .sort((a, b) => b.friend - a.friend || a.handle.localeCompare(b.handle));
}
// Who's in a SPRAWL-00 folder.
export const inFolder = (s, folder, now = clock()) => online(s, now).filter((x) => x.place.kind === 'sprawl' && x.place.folder === folder);
// Who's in a SPRAWL-00 folder or anywhere inside it (what ls shows next to a folder).
export const under = (s, folder, now = clock()) => online(s, now).filter((x) => x.place.kind === 'sprawl' && (x.place.folder === folder || x.place.folder.startsWith(folder + '/')));
export const inSprawl = (s, now = clock()) => online(s, now).filter((x) => x.place.kind === 'sprawl');
export const whereText = (p) => (p.kind === 'sprawl' ? `SPRAWL-00 ${p.folder}${p.fighting ? ' · fighting' : ''}` : p.kind === 'run' ? 'on a run' : p.kind === 'rogue' ? 'on a rogue server' : 'at home');

// `online sim`, `online off`, `who`, `friends`, `friend add <handle>`, `friend remove <handle>`.
export function presenceCommand(s, word, rest, emit, warn) {
  if (word === 'online') {
    if (rest === 'sim') { s.onlineSim = true; return emit(s, 'info', `Online (simulated): ${online(s).length} hackers on. The people button on the top bar lists them.`); }
    if (rest === 'off') { s.onlineSim = false; return emit(s, 'info', 'Online off.'); }
    return warn(s, 'online sim, online off');
  }
  if (word === 'who') {
    const list = online(s);
    return emit(s, 'info', !simOn(s) ? 'Nobody online (try: online sim).' : list.length ? `Online: ${list.map((x) => `${x.friend ? '★' : ''}${x.handle} (${ARCHETYPES[x.cls].name} ${x.level}, ${whereText(x.place)})`).join(' · ')}.` : 'Nobody else is online.');
  }
  if (word === 'friends') return emit(s, 'info', friends(s).length ? `Friends: ${friends(s).join(', ')}.` : 'No friends yet. friend add <handle>');
  const [verb, handle] = rest.split(' ');
  if (!handle || !['add', 'remove'].includes(verb)) return warn(s, 'friend add <handle>, friend remove <handle>');
  if (verb === 'add') {
    if (!PRESENCE.pool.includes(handle)) return warn(s, `No hacker called ${handle}.`);
    if (isFriend(s, handle)) return warn(s, `${handle} is already a friend.`);
    friends(s).push(handle);
    return emit(s, 'info', `${handle} added to your friends.`);
  }
  if (!isFriend(s, handle)) return warn(s, `${handle} isn't on your friends list.`);
  s.friends = friends(s).filter((x) => x !== handle);
  return emit(s, 'info', `${handle} removed from your friends.`);
}

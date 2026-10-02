// The numbers station: now and then LANTERN breaks into the radio and reads out a dead drop. The
// broadcast names a server in clear and spells the drop's password in numbers (01 = A, 02 = B, …).
// While it's up, that server has a locked /drop folder with a credit cache and a protocol (blue or
// better). It closes after a while; missing one costs nothing. Runs on the network clock (logged-on
// time), from tickNetwork. Pure: state in, events out.
import { emit, rand, hackerLevel } from './combat.mjs';
import { rollItem, seeded, itemLabel, statLine } from './gear.mjs';
import { CONFIG } from './data.mjs';
import { cutOffBy } from './outpost.mjs';

export const STATION = {
  name: 'LANTERN',
  from: 3, // hacker level the station starts broadcasting at
  firstMs: [4 * 60000, 8 * 60000], // logged-on time to the first broadcast
  everyMs: [20 * 60000, 35 * 60000], // and between broadcasts
  openMs: 15 * 60000, // how long a drop stays up
  dir: '/drop',
  files: ['cache.dat', 'kit.bin'],
  credits: (level) => 40 + 12 * level, // the cache: about two ordinary caches
  rarity: { tuned: 85, custom: 15 }, // the protocol
  words: ['ember', 'static', 'cipher', 'vesper', 'marrow', 'lantern', 'quarry', 'harbor', 'ashen', 'relic', 'cinder', 'hollow', 'signal', 'parish', 'tallow', 'needle', 'winter', 'copper'],
};

const between = (s, [lo, hi]) => lo + Math.floor(rand(s) * (hi - lo));
// The password, read out: two digits a letter.
export const spell = (word) => [...word].map((c) => String(c.charCodeAt(0) - 96).padStart(2, '0')).join(' ');
export const dropOf = (loc) => (loc && !loc.rogue ? loc.drop || null : null);
const places = (s) => [s.zone, ...(s.locations || [])].filter(Boolean);

// Where the next drop can go: a traced server you can reach (never a rogue one), else SPRAWL-00.
function spot(s) {
  const open = (s.locations || []).filter((l) => !l.rogue && !cutOffBy(s, l));
  return open.length ? open[Math.floor(rand(s) * open.length)] : s.zone;
}

export function tickStation(s, dt) {
  const first = s.serial;
  const st = (s.station ||= { next: null, n: 0 });
  // A drop runs down while you're logged on; one you're standing in waits until you leave.
  for (const loc of places(s)) {
    const d = loc.drop;
    if (!d) continue;
    d.left -= dt;
    if (d.left <= 0 && s.run?.loc !== loc.id) { loc.drop = null; emit(s, 'station-closed', `The dead drop on ${loc.name} is gone.`, { location: loc.id }); }
  }
  if (hackerLevel(s) < STATION.from || !s.zone) return s.logs.filter((e) => e.id > first);
  if (st.next == null) st.next = between(s, STATION.firstMs);
  st.next -= dt;
  if (st.next <= 0) {
    st.next = between(s, STATION.everyMs);
    broadcast(s);
  }
  return s.logs.filter((e) => e.id > first);
}

// Plant a drop and read it out.
export function broadcast(s, loc = spot(s)) {
  const st = (s.station ||= { next: null, n: 0 });
  for (const l of places(s)) if (l.drop && s.run?.loc !== l.id) l.drop = null; // one drop at a time
  if (loc.drop) return; // you're in the old one: the next broadcast can have this server
  const n = ++st.n;
  const word = STATION.words[Math.floor(rand(s) * STATION.words.length)];
  const pass = word + String(10 + Math.floor(rand(s) * 90));
  loc.drop = { n, pass, left: STATION.openMs, level: loc.level || hackerLevel(s), seed: (n * 7919 + (loc.seed || 1) * 31) >>> 0 };
  // A fresh drop: forget the last one's lock and what you took from it.
  delete loc.state.unlocked[STATION.dir];
  for (const f of STATION.files) delete loc.state.taken[STATION.dir + '/' + f];
  const text = `${STATION.name} ${STATION.name} · ${loc.name} · ${spell(word)} · ${pass.slice(-2)}`;
  st.last = { text, loc: loc.id, n };
  emit(s, 'station', text, { location: loc.id });
}

// The drop's files (fileInfo in run.mjs asks here first).
export function dropFile(loc, name) {
  const d = dropOf(loc);
  if (!d) return null;
  if (name === 'cache.dat') { const amount = STATION.credits(d.level); return { kind: 'credits', size: '8k', amount, text: [`binary: a courier's float, about ${amount} credits.`, 'pull it to take it.'] }; }
  if (name === 'kit.bin') {
    const item = dropItem(d);
    return { kind: 'gear', size: '32k', item, text: [`binary: ${itemLabel(item)}.`, `${statLine(item.stats)}.`, 'pull it to take it. load it at home.'] };
  }
  return null;
}
export function dropItem(d) {
  const r = seeded(d.seed), w = STATION.rarity, total = Object.values(w).reduce((a, b) => a + b, 0);
  let x = r() * total, rarity = 'tuned';
  for (const [k, v] of Object.entries(w)) if ((x -= v) < 0) { rarity = k; break; }
  return rollItem(r, { level: d.level, rarity });
}
export const dropMinutes = (loc) => Math.max(1, Math.ceil((dropOf(loc)?.left || 0) / 60000));
export const lastBroadcast = (s) => s.station?.last || null;

// Rogue servers: wild servers in the network where viruses gather and come back after you kill
// them, like SPRAWL-00 but deeper, at the server's own level and grade (with strains from layer 2).
// About 1 in 6 servers you trace is one, and never more than five in a row aren't. A rogue server
// has no vault, so it can't be taken over or harvested, and it never sends invaders: you go to it.
// Each has a kind:
//   Nest      one family, strains twice as often
//   Pit       mixed families, 2 levels above the server, a second roll for drops
//   Gauntlet  mixed families; clear every folder in one run for a bonus cache
import { emit, rand, gainCode, gainXp, xpFor, hooks, hackerLevel, giveUnique } from './combat.mjs';
import { FAMILIES, variantFor, STRAINS, CONFIG, ELITE, SERVER, BOSSES, createLocation } from './data.mjs';
import { seeded, codeOf } from './gear.mjs';
import { occupationCleared } from './consortium.mjs';

export const ROGUE = {
  share: 1 / 6, // of servers you trace
  pity: 5, // after this many in a row that aren't, the next one is
  firstTame: 2, // the first two servers you trace are never rogue
  kinds: { nest: { name: 'Nest', rule: 'One family only, and strains twice as often.' }, pit: { name: 'Pit', rule: 'Mixed families, 2 levels above the server, better drops.' }, gauntlet: { name: 'Gauntlet', rule: 'Clear every folder in one run for a bonus cache.' }, farm: { name: 'Crew dungeon', rule: 'Built for a crew. Three bosses, and the third behind a key the first two hold.' } }, // farm: KESSLER-FARM-00 only, never rolled
  rooms: ['hive', 'pit', 'spool', 'cells', 'drain', 'nursery', 'crypt', 'sump', 'rack', 'void'],
  respawnMs: [180000, 300000], // 3–5 minutes
  pitLevels: 2,
  relockMs: CONFIG.relockMs, // after you leave a wild server it won't take you back for 30 seconds
};
export const isRogue = (loc) => !!loc?.rogue;
export const isWild = (loc) => !!(loc?.zone || loc?.rogue);
// Which servers make you wait before reconnecting: every one but an outpost (one running a harvester).
export const relocks = (loc) => !!loc && !(loc.takenOver && loc.buildings?.length); // an outpost (outpost.mjs) has no relock
// Seconds until a wild server lets you reconnect (0 = now).
export const clock = () => hooks.now?.() ?? Date.now();
export const relockLeft = (loc, now = clock()) => Math.max(0, Math.ceil(((loc?.lockUntil || 0) - now) / 1000));

// Decide, when a server is traced, whether it's rogue (fixed by its seed, with the pity rule).
export function rollRogue(s, loc) {
  const net = (s.net ||= {});
  if ((s.locations || []).length < ROGUE.firstTame) return; // your first servers are always normal: the early jobs need one to take over
  const r = seeded((loc.seed || 1) * 61 + 7);
  // The first one past the tame pair is a Nest of the family that traced it (the one you've been killing).
  const early = !net.nested && !loc.parent && !(s.locations || []).some((l) => l.rogue); // not a server a contract traced
  const rogue = early || r() < ROGUE.share || (net.rogueDry || 0) >= ROGUE.pity;
  if (!rogue) { net.rogueDry = (net.rogueDry || 0) + 1; return; }
  net.rogueDry = 0;
  const kinds = Object.keys(ROGUE.kinds).filter((k) => k !== 'farm');
  loc.rogue = { kind: early ? 'nest' : kinds[Math.floor(r() * kinds.length)] };
  net.nested = true;
  loc.template = 'rogue';
  loc.quirk = null; // quirks and site traits are about vaults and harvesting: not here
  loc.trait = null;
  loc.spawns = {};
  loc.serial = 0;
}

// Its folders: 4–8 of them, one level deep, chosen by its seed.
// An occupied server (consortium.mjs) has its own folders.
export function rogueLayout(loc) {
  if (loc.farm) return FARM.layout;
  const r = seeded((loc.seed || 1) * 67 + 3);
  const n = 4 + Math.floor(r() * 5);
  const rooms = loc.rooms || ROGUE.rooms.map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]);
  const out = { '/': { dirs: rooms, files: ['motd.txt'] } };
  for (const room of rooms) out['/' + room] = { dirs: [], files: [] };
  return out;
}
export const rogueRooms = (loc) => (loc.farm ? Object.keys(FARM.rooms) : Object.keys(rogueLayout(loc)).filter((p) => p !== '/'));

export function rogueMotd(loc) {
  if (loc.farm) return ['KESSLER-FARM-00. a mining farm somebody stopped paying for. the rigs never stopped.', 'the foreman runs intake. the heatsink runs cooling. the cold wallet keeps the ledger.', 'nobody walks in here alone.'];
  if (loc.occupied) return [`${loc.name}. rebooting. something moved in while it was down.`, 'clear every folder and it comes back up.'];
  const k = ROGUE.kinds[loc.rogue.kind];
  const fam = FAMILIES[loc.family].name.toLowerCase();
  return {
    nest: [`${loc.name}. nobody has run this box in years. the ${fam} moved in.`, 'every folder is a nest. they come back. they always come back.'],
    pit: [`${loc.name}. abandoned exchange. whatever's down here is hungry.`, 'stronger than the box should hold. better pickings too.'],
    gauntlet: [`${loc.name}. somebody wired every folder with a live process.`, 'clear the lot in one go and the cache at the root opens.'],
  }[loc.rogue.kind] || [k.rule];
}

// Fill empty folders whose timer is up. Same as SPRAWL-00, but at the server's level and grade.
export function rogueSpawns(s, loc, now = clock()) {
  if (!loc.rogue) return {};
  if (loc.farm) return farmSpawns(s, loc, now);
  loc.spawns ||= {};
  // A rogue server keeps up with you inside its layer's band, then tops out (you've outgrown it).
  if (!loc.member && !loc.trunk) loc.level = Math.max(loc.level || 1, SERVER.locationLevel(hackerLevel(s), loc.depth || 1));
  const fams = Object.keys(FAMILIES);
  for (const room of rogueRooms(loc)) {
    const sp = loc.spawns[room];
    if (sp?.alive || (sp && (sp.respawnAt > now || loc.occupied))) continue; // an occupation doesn't come back
    const n = (loc.serial = (loc.serial || 0) + 1);
    const seed = ((loc.seed || 1) * 131 + n * 7919) >>> 0;
    const r = seeded(seed);
    const family = loc.rogue.kind === 'nest' ? loc.family : fams[Math.floor(r() * fams.length)];
    const level = (loc.level || 1) + (loc.rogue.kind === 'pit' ? ROGUE.pitLevels : 0);
    let { grade, strain } = variantFor(family, level, loc.depth || 1, seed);
    if (!strain && loc.rogue.kind === 'nest') strain = variantFor(family, level, loc.depth || 1, seed ^ 0x9e37).strain; // twice the chances
    const label = strain ? STRAINS[strain].name.toLowerCase() : FAMILIES[family].name.toLowerCase();
    const elite = loc.rogue.kind === 'pit' && seeded(seed ^ 0x51ed)() < ELITE.share; // group content
    loc.spawns[room] = { alive: true, family, level, seed, strain, grade, ...(elite ? { elite: true } : {}), name: `${elite ? 'elite ' : ''}${label}-${String(1000 + ((n * 7919) % 9000)).slice(-4)}` };
  }
  return loc.spawns;
}
export const liveRogue = (loc) => Object.values(loc.spawns || {}).filter((x) => x.alive).length;
export const rogueRespawn = (s) => ROGUE.respawnMs[0] + Math.floor(rand(s) * (ROGUE.respawnMs[1] - ROGUE.respawnMs[0]));

// After a kill on a rogue server: the folder goes quiet, the Pit rolls again for a drop, and a
// Gauntlet cleared in one run opens its cache.
export function rogueKill(s, loc, room, now, extraDrop) {
  const sp = loc.spawns?.[room];
  if (sp) { sp.alive = false; sp.respawnAt = now + (loc.farm ? (sp.boss ? FARM.bossMs : FARM.packMs) : rogueRespawn(s)); }
  if (loc.farm) farmKill(s, loc, sp);
  if (loc.occupied && !liveRogue(loc)) occupationCleared(s, loc);
  if (loc.rogue.kind === 'pit') extraDrop();
  if (loc.rogue.kind === 'gauntlet' && s.run) {
    const done = (s.run.gauntlet ||= []);
    if (!done.includes(room)) done.push(room);
    if (!s.run.gauntletPaid && rogueRooms(loc).every((r) => done.includes(r))) {
      s.run.gauntletPaid = true;
      const credits = 60 + 12 * (loc.level || 1), code = 4 + Math.floor((loc.level || 1) / 5);
      s.server.credits += credits;
      gainCode(s, { [codeOf(loc.family)]: code }, '');
      gainXp(s, xpFor(s, loc.level || 1, 1), 'gauntlet cleared', 'fight');
      emit(s, 'net-good', `GAUNTLET CLEARED. The cache at the root opens: +${credits} credits, +${code} code.`);
    }
  }
}

// ---------- KESSLER-FARM-00: the crew dungeon ----------
// A rogue server of its own kind, open from class level FARM.from, that you can only connect to with
// a crew. Elite packs guard the way; three bosses (BOSSES.foreman, heatsink, coldwallet) are built for
// a crew (elite, crew-sized). The ledger is locked: the Foreman's shift log holds the password's word,
// the Heatsink's temps log its digits. After each of the first two bosses the crew regroups: everyone
// back up to FARM.regroup of their Signal. A boss comes back FARM.bossMs after you beat it, a pack
// FARM.packMs. Every pack kill has a 1 in FARM.deadPool chance at Dead Pool; the nest's, at Hashboard.
export const FARM = {
  id: 'kessler', name: 'KESSLER-FARM-00', from: 7, regroup: 0.6,
  bossMs: 6 * 3600000, packMs: 30 * 60000,
  packHp: 2.9, // a pack's Integrity (× its level's), instead of an ordinary elite's
  deadPool: 40, hashboard: 20,
  layout: {
    '/': { dirs: ['intake', 'cooling', 'ledger'], files: ['motd.txt'] },
    '/intake': { dirs: ['racks'], files: ['manifest.txt'] },
    '/intake/racks': { dirs: [], files: ['shift.log'] },
    '/cooling': { dirs: ['nest', 'loop'], files: [] },
    '/cooling/nest': { dirs: [], files: [] },
    '/cooling/loop': { dirs: [], files: ['temps.log'] },
    '/ledger': { dirs: ['core'], files: ['ledger.db'], locked: true },
    '/ledger/core': { dirs: [], files: [] },
  },
  // Who's in each room: a pack (an elite of a family) or a boss.
  rooms: {
    '/intake': { family: 'worm', name: 'intake-pack' },
    '/intake/racks': { boss: 'foreman', name: 'THE FOREMAN' },
    '/cooling': { family: 'ghostroot', name: 'coolant-pack' },
    '/cooling/nest': { family: 'ransomware', name: 'nest-pack' },
    '/cooling/loop': { boss: 'heatsink', name: 'HEATSINK' },
    '/ledger/core': { boss: 'coldwallet', name: 'COLDWALLET' },
  },
  words: ['overtime', 'graveyard', 'nightshift', 'payroll', 'hashrate'],
};
export const FARM_UNIQUES = ['foremans-lanyard', 'overtime', 'thermal-paste', 'fan-curve', 'cold-wallet', 'air-gap', 'hashboard', 'dead-pool'];
export const farmOf = (s) => (s.locations || []).find((l) => l.farm) || null;
// From level FARM.from it's on your map, once.
export function openFarm(s) {
  if (farmOf(s) || hackerLevel(s) < FARM.from) return null;
  const seed = ((s.seed || 1) * 977 + 31) >>> 0, r = seeded(seed);
  const loc = Object.assign(createLocation('worm', seed, 1), { id: FARM.id, name: FARM.name, level: hackerLevel(s), farm: true, rogue: { kind: 'farm' }, template: 'rogue', quirk: null, trait: null,
    password: FARM.words[Math.floor(r() * FARM.words.length)] + String(10 + Math.floor(r() * 90)), state: { cleared: {}, unlocked: {}, taken: {} }, runs: 0, spawns: {}, serial: 0 });
  s.locations.push(loc);
  emit(s, 'located', `${FARM.name} is on your map: a crew dungeon. Bring a crew (crew sim <class>, or crew invite <friend>).`, { location: loc.id });
  return loc;
}
function farmSpawns(s, loc, now) {
  loc.level = Math.max(loc.level || 1, hackerLevel(s));
  for (const [room, d] of Object.entries(FARM.rooms)) {
    const sp = loc.spawns[room];
    if (sp?.alive || (sp && sp.respawnAt > now)) continue;
    const n = (loc.serial = (loc.serial || 0) + 1);
    const seed = ((loc.seed || 1) * 131 + n * 7919) >>> 0;
    if (d.boss === 'coldwallet') delete loc.state.unlocked['/ledger']; // the ledger locks again when its keeper is back
    loc.spawns[room] = d.boss
      ? { alive: true, family: BOSSES[d.boss].family, boss: d.boss, level: loc.level, seed, elite: true, eliteHp: 1, name: d.name }
      : { alive: true, family: d.family, level: loc.level, seed, elite: true, eliteHp: FARM.packHp, name: `elite ${d.name}-${String(1000 + ((n * 7919) % 9000)).slice(-4)}` };
  }
  return loc.spawns;
}
// A kill in the farm: a pack may drop its trophy; the first two bosses let the crew regroup.
function farmKill(s, loc, sp) {
  if (!sp) return;
  if (!sp.boss) {
    const id = sp.name.startsWith('elite nest') && rand(s) * FARM.hashboard < 1 ? 'hashboard' : rand(s) * FARM.deadPool < 1 ? 'dead-pool' : null;
    if (id) giveUnique(s, id, `${FARM.name}: `);
    return;
  }
  if (sp.boss === 'coldwallet' || !s.run) return;
  const up = (cur, max) => Math.max(cur, Math.round(max * FARM.regroup));
  s.run.integrity = up(s.run.integrity, s.run.max);
  for (const m of hooks.crewMates?.(s) || []) { const c = s.run.crew?.[m.who]; if (c) c.signal = up(c.signal ?? m.run.max, m.run.max); }
  emit(s, 'net-good', `Regroup: everyone is back up to at least ${Math.round(FARM.regroup * 100)}% Signal.`);
}
// Its files: the password's word with the Foreman, its digits with the Heatsink, readable once each falls.
export function farmFile(loc, path, name) {
  const word = loc.password.replace(/\d+$/, ''), digits = loc.password.match(/\d+$/)[0];
  const down = (room) => loc.spawns?.[room] && !loc.spawns[room].alive;
  const f = (text) => ({ kind: 'text', size: '1k', text });
  if (path === '/intake' && name === 'manifest.txt') return f(['intake: 412 rigs. 9 dead. 3 on fire.', 'the foreman holds the shift log in /intake/racks.']);
  if (path === '/intake/racks' && name === 'shift.log') return f(down('/intake/racks') ? ['== shift log ==', `ledger badge word: ${word}`, 'digits rotate with the cooling cycle. ask the heatsink.'] : ['== shift log ==', 'LOCKED by the foreman. it doesn\'t let go of anything while it runs.']);
  if (path === '/cooling/loop' && name === 'temps.log') return f(down('/cooling/loop') ? ['== cooling loop ==', `cycle tag: ${digits}`, 'the ledger badge is the shift word, then this.'] : ['== cooling loop ==', 'unreadable. the heatsink is writing over it every cycle.']);
  if (path === '/ledger' && name === 'ledger.db') return f(['every coin this farm ever mined.', 'the cold wallet in /ledger/core holds the keys.']);
  return null;
}

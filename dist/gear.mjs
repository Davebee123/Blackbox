// Protocols and services. Pure data and pure functions (no state), so the engine, the
// views, runs and the balance sim can all use it.
//
// You run PROTOCOLS: items with rolled stats in generic slots (any protocol in any slot),
// like Corepunk. Loot and salvage build you.
// Your server runs SERVICES on its ports: built with code materials, one install at a time,
// versions v1–v3, one rule each (Master of Orion 2 style). Code builds your base.
import { power } from './data.mjs';

// Slots by class level: 4 to start, 5 at 15, 6 at 30. Each slot takes one kind of item (SLOTS).
export const PROTOCOL_SLOTS = [{ level: 1, slots: 4 }, { level: 15, slots: 5 }, { level: 30, slots: 6 }];
export const SLOT_KINDS = ['exploit', 'proxy', 'shell', 'script', 'implant', 'implant'];
export const protocolSlots = (level) => PROTOCOL_SLOTS.filter((x) => level >= x.level).at(-1).slots;
// What goes in each slot. All software: you're on a remote box, so code, tools and access.
export const SLOTS = {
  exploit: { name: 'Exploit', like: 'weapon', about: 'The code you fire at a target.' },
  proxy: { name: 'Proxy', like: 'chest', about: 'The route your traffic hides behind.' },
  shell: { name: 'Shell', like: 'helm', about: 'The environment you work from.' },
  script: { name: 'Script', like: 'ring', about: 'A helper you run alongside.' },
  implant: { name: 'Implant', like: 'amulet', about: 'Malware you leave resident in your own rig.' },
};
// Old saves: the three category slots become the new ones.
export const OLD_SLOT = { offense: 'exploit', survival: 'proxy', utility: 'script' };

// Stats. Flat stats (most of them) are base × power(L) at item level L, so a better or
// higher-level protocol is a visibly bigger number. Chances (Crit, Evasion…) stay percentages:
// base × (1 + L/25). Then rarity and a ±15% roll.
// side: 'hacker' (rig only), 'server', or 'both'. A defense stat on both sides counts where
// that side is defending: a rig's on runs (your Signal), the server's at home (its Integrity).
// group: the protocol's category (its slot kind) and how the pages list stats.
export const STATS = {
  // Offense (rig, everywhere)
  damage: { side: 'hacker', group: 'offense', name: 'Damage', unit: '', base: 2, flat: true, about: 'Added to every skill hit you land.' },
  crit: { side: 'hacker', group: 'offense', name: 'Crit', unit: '%', base: 4, about: 'Chance a hit that does damage crits (everyone starts at 5%).' },
  critDamage: { side: 'hacker', group: 'offense', name: 'Crit Damage', unit: '', base: 6, flat: true, about: 'Added to every crit, on top of ×1.5.' },
  accuracy: { side: 'hacker', group: 'offense', name: 'Accuracy', unit: '%', base: 2.5, about: 'Cancels the enemy\'s evasion, so your damaging skills miss less. A miss still spends the cooldown.' },
  echo: { side: 'hacker', group: 'offense', name: 'Echo', unit: '%', base: 5, cap: 40, about: 'Chance a skill hit repeats for half damage. Against armor, the echo breaks another chit.' },
  payload: { side: 'hacker', group: 'offense', name: 'Payload', unit: '', base: 1, flat: true, about: 'Added to every burn tick and helper hit.' },
  // Defense (health on its side; the rest on both sides)
  signal: { side: 'hacker', group: 'survival', name: 'Signal', unit: '', base: 10, flat: true, about: 'More max Signal on runs.' },
  integrity: { side: 'server', group: 'survival', name: 'Integrity', unit: '', base: 20, flat: true, about: 'More max server Integrity.' },
  regen: { side: 'both', group: 'survival', name: 'Regen', unit: '', dp: 1, base: 0.5, flat: true, about: 'Heals this much per cycle in fights. Rig: on runs, also per move. Server: at home, and very slowly between fights (per minute).' },
  reduction: { side: 'both', group: 'survival', name: 'Block', unit: '', base: 1, flat: true, about: 'Taken off every hit (a hit never drops below half).' },
  evasion: { side: 'both', group: 'survival', name: 'Evasion', unit: '%', base: 2.5, cap: 20, about: 'Chance an enemy\'s damage attack misses (up to 20%).' },
  sanitize: { side: 'both', group: 'survival', name: 'Sanitize', unit: '%', base: 8, cap: 50, about: 'Chance an Encrypt, Blind or spawn fails (up to 50%).' },
  leech: { side: 'hacker', group: 'survival', name: 'Leech', unit: '', base: 1, flat: true, about: 'Heals you this much for every skill hit that does damage: your server at home, your Signal on runs.' },
  shield: { side: 'server', group: 'survival', name: 'Shield', unit: '', base: 10, flat: true, about: 'Start every home fight with a shield that soaks this much.' },
  countermeasures: { side: 'server', group: 'survival', name: 'Countermeasures', unit: '', base: 6, flat: true, about: 'When an attack lands on your server, the part that fired it takes this much. It\'s a hit: on armor, it breaks a chit.' },
  // Utility
  clock: { side: 'hacker', group: 'utility', name: 'Clock Speed', unit: '%', base: 8, about: 'Fills a meter every cycle. When it\'s full, all your cooldowns tick one extra cycle.' },
  stealth: { side: 'hacker', group: 'utility', name: 'Stealth', unit: '%', base: 8, cap: 60, about: 'Chance each enemy part\'s first attack comes a cycle later.' },
  sync: { side: 'hacker', group: 'utility', name: 'Sync', unit: '%', base: 4, cap: 50, about: 'Added to the 25% chance that a cycle opens a Sync Window.' },
  scavenge: { side: 'hacker', group: 'utility', name: 'Scavenge', unit: '%', base: 8, about: 'Better drops (more often, better rarity) and more credits from caches you bank.' },
  lead: { side: 'server', group: 'utility', name: 'Lead', unit: '', base: 5, flat: true, about: 'Every home or rogue-server kill fills its lead this much more.' },
};
export const GROUPS = { offense: 'Offense', survival: 'Defense', utility: 'Utility' };
// The stats a side can have: 'hacker' = what protocols roll (rig stats + the shared survival
// stats, which count for you on runs); 'server' = what services give.
export const sideStats = (side) => Object.keys(STATS).filter((k) => STATS[k].side === side || STATS[k].side === 'both');
export const PROTOCOL_STATS = sideStats('hacker');
export const PROTOCOL_GROUPS = ['offense', 'survival', 'utility'];
export const groupOf = (item) => { const g = item?.group || STATS[Object.keys(item?.stats || {})[0]]?.group || 'offense'; return OLD_SLOT[g] || g; };
// A protocol is named after its strongest stat.
export const PROTOCOL_NAMES = {
  damage: 'Overdrive', crit: 'Precision', critDamage: 'Amplifier', accuracy: 'Targeting', echo: 'Echo', payload: 'Injector',
  clock: 'Clockrate', leech: 'Leech', stealth: 'Cloak', signal: 'Relay', regen: 'Self-repair', reduction: 'Hardening',
  evasion: 'Jitter', sanitize: 'Sanitizer', scavenge: 'Scavenger', sync: 'Phaselock',
};

// Base items: five per slot, a tier every few levels. Primary stats at the tier's own level
// (Damage as a range), scaled by item level from there. See the items design doc.
export const BASES = {
  'proof-of-concept': { slot: 'exploit', name: 'Proof of Concept', level: 1, primary: { damage: [5, 7] }, flavour: 'Works on the third try.' },
  'weaponized-exploit': { slot: 'exploit', name: 'Weaponized Exploit', level: 5, primary: { damage: [9, 12] }, flavour: "Somebody else's research, your target." },
  'exploit-chain': { slot: 'exploit', name: 'Exploit Chain', level: 11, primary: { damage: [15, 19] }, flavour: 'Three bugs, one door.' },
  'zero-click': { slot: 'exploit', name: 'Zero-click', level: 18, primary: { damage: [22, 28] }, flavour: 'They never touch a thing.' },
  wormable: { slot: 'exploit', name: 'Wormable', level: 26, primary: { damage: [32, 40] }, flavour: 'Hit one box, hit them all.' },
  'open-proxy': { slot: 'proxy', name: 'Open Proxy', level: 1, primary: { signal: 25, reduction: 1 }, flavour: 'Left open by someone who should know better.' },
  'socks-tunnel': { slot: 'proxy', name: 'SOCKS Tunnel', level: 5, primary: { signal: 45, reduction: 1 }, flavour: 'Everything goes through one quiet hole.' },
  'vpn-cascade': { slot: 'proxy', name: 'VPN Cascade', level: 11, primary: { signal: 70, reduction: 2 }, flavour: "Three countries before you're anywhere." },
  'onion-circuit': { slot: 'proxy', name: 'Onion Circuit', level: 18, primary: { signal: 100, reduction: 3 }, flavour: 'Layer on layer. Nobody sees the middle.' },
  mixnet: { slot: 'proxy', name: 'Mixnet', level: 26, primary: { signal: 140, reduction: 4 }, flavour: 'Your packets, shuffled with ten thousand others.' },
  'reverse-shell': { slot: 'shell', name: 'Reverse Shell', level: 1, primary: { signal: 12, regen: 0.5 }, flavour: 'It called home. You answered.' },
  'tty-upgrade': { slot: 'shell', name: 'TTY Upgrade', level: 5, primary: { signal: 22, regen: 1 }, flavour: 'Tab completion. History. Civilisation.' },
  'root-shell': { slot: 'shell', name: 'Root Shell', level: 11, primary: { signal: 35, regen: 1.5 }, flavour: '#' },
  'restricted-shell-escape': { slot: 'shell', name: 'Restricted Shell Escape', level: 18, primary: { signal: 50, regen: 2 }, flavour: 'They boxed you in. Cute.' },
  'ghost-shell': { slot: 'shell', name: 'Ghost Shell', level: 26, primary: { signal: 70, regen: 3 }, flavour: 'No process name. No parent. No logs.' },
  'one-liner': { slot: 'script', name: 'One-liner', level: 1, primary: { damage: 2, signal: 10 }, flavour: 'Pipes all the way down.' },
  'cron-job': { slot: 'script', name: 'Cron Job', level: 5, primary: { damage: 4, signal: 18 }, flavour: "Runs at 3 a.m. whether you're awake or not." },
  dropper: { slot: 'script', name: 'Dropper', level: 11, primary: { damage: 6, signal: 28 }, flavour: 'Small, polite, carries something worse.' },
  loader: { slot: 'script', name: 'Loader', level: 18, primary: { damage: 9, signal: 40 }, flavour: 'Unpacks in memory. Leaves nothing on disk.' },
  'polymorphic-engine': { slot: 'script', name: 'Polymorphic Engine', level: 26, primary: { damage: 13, signal: 55 }, flavour: 'Never the same twice.' },
  implant: { slot: 'implant', name: 'Implant', level: 15, primary: { damage: 6, signal: 30 }, flavour: 'Resident. Quiet. Yours.', uniqueOnly: true },
};
export const PRIMARY_STATS = ['damage', 'signal', 'reduction', 'regen'];
// Every base's primaries × this (tuned with the monster pass, see friction.mjs).
export const ITEM_SCALE = { primary: 0.6 };
// The best base of a slot at an item level (the highest tier unlocked).
export const baseFor = (slot, level) => Object.entries(BASES).filter(([, b]) => b.slot === slot && !b.uniqueOnly && b.level <= Math.max(1, level)).sort((a, b) => b[1].level - a[1].level)[0]?.[0] || null;

// Affixes: secondaries. A prefix adds offense, a suffix defense or utility. Value at item level 1
// and 20 (linear between, on past 20). `from`: the item level it can first roll at.
export const AFFIXES = {
  weaponized: { kind: 'prefix', name: 'Weaponized', stat: 'damage', lo: 2, hi: 5, from: 1 },
  precise: { kind: 'prefix', name: 'Precise', stat: 'crit', lo: 3, hi: 5, from: 1 },
  calibrated: { kind: 'prefix', name: 'Calibrated', stat: 'accuracy', lo: 3, hi: 5, from: 1 },
  loaded: { kind: 'prefix', name: 'Loaded', stat: 'payload', lo: 1, hi: 3, from: 4 },
  multithreaded: { kind: 'prefix', name: 'Multithreaded', stat: 'clock', lo: 6, hi: 10, from: 6 },
  brutal: { kind: 'prefix', name: 'Brutal', stat: 'critDamage', lo: 4, hi: 10, from: 8 },
  recursive: { kind: 'prefix', name: 'Recursive', stat: 'echo', lo: 4, hi: 8, from: 10 },
  bunker: { kind: 'suffix', name: 'of the Bunker', stat: 'signal', lo: 10, hi: 30, from: 1 },
  mending: { kind: 'suffix', name: 'of Mending', stat: 'regen', lo: 0.3, hi: 1, from: 1 },
  scavenger: { kind: 'suffix', name: 'of the Scavenger', stat: 'scavenge', lo: 6, hi: 12, from: 1 },
  ghost: { kind: 'suffix', name: 'of the Ghost', stat: 'evasion', lo: 2, hi: 4, from: 3 },
  leeching: { kind: 'suffix', name: 'of Leeching', stat: 'leech', lo: 1, hi: 2, from: 5 },
  silence: { kind: 'suffix', name: 'of Silence', stat: 'stealth', lo: 6, hi: 10, from: 5 },
  beat: { kind: 'suffix', name: 'of the Beat', stat: 'sync', lo: 3, hi: 6, from: 7 },
  scrubbing: { kind: 'suffix', name: 'of Scrubbing', stat: 'sanitize', lo: 6, hi: 12, from: 8 },
  // Junk: only greys roll these.
  buggy: { kind: 'prefix', name: 'Buggy', stat: 'damage', lo: -1, hi: -2, from: 1, junk: true },
  leaky: { kind: 'suffix', name: 'that Leaks', stat: 'evasion', lo: -2, hi: -3, from: 1, junk: true },
};
export const affixValue = (id, level, roll = 0.5) => {
  const a = AFFIXES[id], t = Math.max(0, (Math.max(1, level) - 1) / 19);
  const v = (a.lo + (a.hi - a.lo) * t) * (0.85 + 0.3 * roll);
  return STATS[a.stat]?.dp || Math.abs(a.hi) < 2 ? Math.round(v * 10) / 10 : Math.round(v);
};
const NAME_A = ['Ghost', 'Null', 'Black', 'Silent', 'Hollow', 'Iron', 'Glass', 'Static', 'Dead', 'Pale', 'Burnt', 'Cold', 'Feral', 'Rust', 'Neon', 'Grey'];
const NAME_B = { exploit: ['Fang', 'Needle', 'Spike', 'Wedge', 'Payload', 'Lance'], proxy: ['Veil', 'Lattice', 'Bastion', 'Shroud', 'Bulwark', 'Mesh'], shell: ['Den', 'Cradle', 'Hollow', 'Burrow', 'Root', 'Nest'], script: ['Loop', 'Hook', 'Thread', 'Whisper', 'Daemon', 'Trick'], implant: ['Seed', 'Heart', 'Core', 'Tick', 'Ghost', 'Knot'] };

// Rarity: D2 colours. `mult` scales the base's primaries; `affixes`: [min, max].
export const RARITIES = {
  scrap: { name: 'Scrap', colour: 'grey', mult: 0.8, affixes: [0, 0], scrap: 1 },
  stock: { name: 'Stock', colour: 'white', mult: 1, affixes: [0, 0], scrap: 2 },
  tuned: { name: 'Tuned', colour: 'blue', mult: 1.1, affixes: [1, 2], scrap: 3 },
  custom: { name: 'Custom', colour: 'yellow', mult: 1.2, affixes: [3, 5], scrap: 5 },
  zeroday: { name: 'Zero-day', colour: 'gold', mult: 1.3, affixes: [0, 0], scrap: 10 },
  indemnified: { name: 'Indemnified', colour: 'orange', mult: 1.4, affixes: [2, 2], scrap: 10 },
};
export const RARITY_ORDER = ['scrap', 'stock', 'tuned', 'custom', 'zeroday', 'indemnified'];
// What deconstructing gives: salvage, code (the family it dropped from) and Exploits.
export const DECONSTRUCT = {
  scrap: { salvage: [1, 2], code: 0, exploit: 0 },
  stock: { salvage: [2, 3], code: 0, exploit: 0 },
  tuned: { salvage: [3, 3], code: 1, exploit: 0 },
  custom: { salvage: [5, 5], code: 2, exploit: 1 },
  zeroday: { salvage: [10, 10], code: 4, exploit: 3 },
  indemnified: { salvage: [10, 10], code: 4, exploit: 3 },
};

// Zero-day protocols: a Custom protocol plus one special effect. One of each per loadout.
// Found on runs (rarely ready-made, more often as source you bank and compile at home).
export const ZERO_DAYS = {
  rootkit: { name: 'Rootkit', effect: 'Your first hit each fight goes straight through armor.' },
  'race-condition': { name: 'Race Condition', effect: 'The first time each fight one of your skills misses, its cooldown comes straight back.' },
  'buffer-overflow': { name: 'Buffer Overflow', effect: 'Whenever you break a part, your next hit crits.' },
  // Sold only by Halcyon Mutual (chase items: never found, never compiled).
  deductible: { name: 'Deductible', effect: 'The first attack that lands on you each fight does nothing.', chase: true, group: 'survival' },
  subrogation: { name: 'Subrogation', effect: 'When a part hits you, your next skill hit on it deals double.', chase: true, group: 'offense' },
  'total-loss': { name: 'Total Loss', effect: 'When you break a part, every other part takes a quarter of its max Integrity (armor soaks it as usual). Breaks it causes do it again.', chase: true, group: 'offense' },
  actuarial: { name: 'Actuarial Model', effect: 'Veils can\'t hide attack timers from you.', chase: true, group: 'utility' },
};
export const FOUND_ZERO_DAYS = Object.keys(ZERO_DAYS).filter((z) => !ZERO_DAYS[z].chase);

// Drops: set in play time, then turned into odds per kill with the measured pace (kills an
// hour). A blue about every 25 minutes, a yellow every two hours, a gold about every 11 hours;
// most kills drop nothing. Grindy on purpose. See the items design doc.
export const LOOT = {
  killsPerHour: 60, // measured: what the scripted player averages (bot.mjs); the System page shows yours
  // Per kill (vaults and double rolls on guards add the rest, to land near the targets:
  // a blue every 20–30 min, a yellow about two hours, a gold every 10–12 hours).
  minutes: { tuned: 36, custom: 180, zeroday: 900 },
  common: 1 / 6, // share of kills that drop a grey or white
  greyShare: 0.35, // of those, greys
  trophy: 200, // a strain's own unique: 1 in this many kills of that strain
  vault: { stock: 80, tuned: 16, custom: 3.5, zeroday: 0.5 }, // a vault's protocol (kit.bin), white or better
  vaultKit: 0.5, // share of vaults holding a protocol (kit.bin)
  vaultBlueprint: 0.25, // share holding a blueprint (blueprint.bp)
  vaultSource: 0.25, // share of layer-2+ vaults holding source (.src)
  rolls: { home: 1, guard: 2, pit: 2, bounty: 2 },
  depthBonus: 0.1, // per layer past the first, on blue and yellow odds
};
// Odds per kill for each rarity, from the time targets and the pace.
export const lootOdds = (kph = LOOT.killsPerHour) => Object.fromEntries(Object.entries(LOOT.minutes).map(([r, m]) => [r, 60 / (m * kph)]));
// Scavenge is magic find, with diminishing returns: +50% Scavenge is +33% better odds.
export const magicFind = (scavenge) => { const x = Math.max(0, scavenge) / 100; return 1 + x / (1 + x); };
// Compiling at home: a blue with the stat you chose. A Zero-day needs its source first.
export const COMPILE = {
  cost: (level) => ({ credits: 60 + 15 * level, salvage: 8 }),
  zeroDayCost: (level) => ({ credits: 400 + 30 * level, salvage: 16 }),
};
export const STASH_CAP = 40;
export const CRIT = { multiplier: 1.5 };
export const ECHO = { share: 0.5 }; // an echo hits for half

// A seeded random source (for things that must come out the same every time, like a vault's kit).
export function seeded(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pickWeighted = (rand, weights) => {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  let r = rand() * entries.reduce((n, [, w]) => n + w, 0);
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries.at(-1)[0];
};
const pick = (rand, list) => list[Math.floor(rand() * list.length)];

export function statValue(stat, level, mult, rand) {
  const st = STATS[stat];
  const raw = st.base * (st.flat ? power(level) : 1 + level / 25) * mult * (0.85 + 0.3 * rand());
  return st.dp ? Math.max(0.1, Math.round(raw * 10) / 10) : Math.max(1, Math.round(raw));
}
const round = (stat, v) => (STATS[stat]?.dp ? Math.round(v * 10) / 10 : Math.round(v));
// A base's primaries at an item level, times a multiplier (rarity), each rolled ±10%.
export function primaries(baseId, level, mult, rand) {
  const b = BASES[baseId], k = (power(Math.max(1, level)) / power(b.level)) * ITEM_SCALE.primary, out = {};
  for (const [stat, v] of Object.entries(b.primary)) {
    const x = Array.isArray(v) ? v[0] + (v[1] - v[0]) * rand() : v * (0.9 + 0.2 * rand());
    out[stat] = round(stat, x * k * mult) || (STATS[stat]?.dp ? 0.1 : 1);
  }
  return out;
}
const addStats = (into, more) => { for (const [k, v] of Object.entries(more || {})) into[k] = round(k, (into[k] || 0) + v); return into; };

// Roll one item. opts: level, rarity (or source: 'compile'), slot (or legacy group), stat (an
// affix it must have), zeroDay (a found or Halcyon Zero-day).
export function rollItem(rand, opts = {}) {
  const level = Math.max(1, opts.level || 1);
  let zeroDay = opts.zeroDay || null;
  let rarity = opts.rarity || (opts.source === 'compile' ? 'tuned' : opts.source === 'vault' ? pickWeighted(rand, LOOT.vault) : 'stock');
  if (rarity === 'zeroday' && !zeroDay) rarity = 'custom'; // a random gold is a unique: see uniqueItem
  if (zeroDay) rarity = ZERO_DAYS[zeroDay].chase ? 'indemnified' : 'zeroday';
  const r = RARITIES[rarity];
  const zSlot = zeroDay ? OLD_SLOT[ZERO_DAYS[zeroDay].group] || 'script' : null;
  const slot = SLOTS[opts.slot] ? opts.slot : OLD_SLOT[opts.group] || (SLOTS[opts.group] ? opts.group : null) || zSlot || pick(rand, ['exploit', 'proxy', 'shell', 'script']);
  const base = baseFor(slot === 'implant' ? 'script' : slot, level) || 'proof-of-concept';
  const stats = primaries(base, level, r.mult, rand);
  // Affixes: at most one prefix and one suffix on a blue, up to three of each on a yellow.
  const affixes = [];
  const pool = Object.keys(AFFIXES).filter((k) => !AFFIXES[k].junk && AFFIXES[k].from <= level);
  const want = opts.stat ? AFFIX_FOR[opts.stat] : null;
  if (want && AFFIXES[want].from > level) pool.push(want);
  let n = r.affixes[0] + Math.floor(rand() * (r.affixes[1] - r.affixes[0] + 1));
  if (want && n < 1) n = 1;
  const cap = rarity === 'custom' ? 3 : 1;
  const count = { prefix: 0, suffix: 0 };
  const take = (id) => { affixes.push(id); count[AFFIXES[id].kind]++; addStats(stats, { [AFFIXES[id].stat]: affixValue(id, level, rand()) }); };
  if (want) take(want);
  while (affixes.length < n) {
    const ok = pool.filter((k) => !affixes.includes(k) && count[AFFIXES[k].kind] < cap);
    if (!ok.length) break;
    take(pick(rand, ok));
  }
  if (rarity === 'scrap' && rand() < 0.4) take(pick(rand, ['buggy', 'leaky']));
  const pre = affixes.map((a) => AFFIXES[a]).find((a) => a.kind === 'prefix'), suf = affixes.map((a) => AFFIXES[a]).find((a) => a.kind === 'suffix');
  const name = zeroDay ? ZERO_DAYS[zeroDay].name
    : rarity === 'custom' ? `${pick(rand, NAME_A)} ${pick(rand, NAME_B[slot] || NAME_B.script)}`
    : [pre?.name, BASES[base].name, suf?.name].filter(Boolean).join(' ');
  return { kind: 'protocol', side: 'hacker', group: slot, base, rarity, level, stats, affixes, zeroDay, unique: null, name };
}
// Which affix carries a stat (for compiling a chosen stat).
export const AFFIX_FOR = Object.fromEntries(Object.entries(AFFIXES).filter(([, a]) => !a.junk).map(([id, a]) => [a.stat, id]));

// A named unique (content/items.mjs) at an item level: its primaries and secondaries scale from
// its own level, its downside doesn't.
export function uniqueItem(u, level, rand) {
  const L = Math.max(u.level, level || u.level);
  const k = power(L) / power(u.level);
  const stats = {};
  for (const [stat, v] of Object.entries(u.primary || {})) stats[stat] = round(stat, (Array.isArray(v) ? v[0] + (v[1] - v[0]) * rand() : v) * k) || 1;
  for (const [stat, v] of Object.entries(u.secondary || {})) addStats(stats, { [stat]: Array.isArray(v) ? v[0] + (v[1] - v[0]) * rand() : v });
  addStats(stats, u.downside);
  const slot = BASES[u.base]?.slot || 'script';
  return { kind: 'protocol', side: 'hacker', group: slot, base: u.base, rarity: 'zeroday', level: L, stats, affixes: [], zeroDay: null, unique: u.id, name: u.name };
}

// "+6% Damage · +2% Crit"
export const fmtStat = (k, v) => `${STATS[k].dp ? Math.round(v * 10) / 10 : v}${STATS[k].unit}`;
export const statLine = (stats) => Object.entries(stats).filter(([k]) => STATS[k]).map(([k, v]) => `${v < 0 ? '−' + fmtStat(k, -v) : '+' + fmtStat(k, v)} ${STATS[k].name}`).join(' · ');
export const itemLabel = (item) => `${item.name} v${item.level}`;

// ---------- code materials ----------
// Each virus family's servers give their own code; Exploits are rare. Salvage stays generic.
export const MATERIALS = {
  cipher: { name: 'Cipher code', short: 'Cipher', family: 'ransomware' },
  worm: { name: 'Worm code', short: 'Worm', family: 'worm' },
  kernel: { name: 'Kernel code', short: 'Kernel', family: 'ghostroot' },
  exploit: { name: 'Exploits', short: 'Exploits', family: null },
};
export const codeOf = (family) => Object.keys(MATERIALS).find((k) => MATERIALS[k].family === family) || null;
// How much code a kill drops (1 at level 1, 6 at 50); guards give half again; vault caches more.
export const codeDrop = (level) => 1 + Math.floor(Math.max(1, level) / 10);
export const EXPLOIT_CHANCE = { home: 0.04, guard: 0.08 };
export const vaultCode = (level) => 12 + Math.floor(Math.max(1, level) / 2);

// ---------- services ----------
// Ports: 6 to start, one more every 8 server levels, 12 at level 41+.
export const ports = (serverLevel) => Math.min(12, 6 + Math.floor((Math.max(1, serverLevel) - 1) / 8));
// What each version costs and takes (real time: 15 minutes, an hour, four hours). v2 needs
// server level 10, v3 level 25. Salvage is any salvage (what deconstructing items gives).
// Economy pass: a v1 is about 10 minutes of income at level 5, a v2 about half an hour at 15.
export const VERSIONS = [
  { v: 1, code: 12, exploit: 0, credits: 120, salvage: 6, minutes: 15, needs: 1 },
  { v: 2, code: 40, exploit: 1, credits: 600, salvage: 15, minutes: 60, needs: 10 },
  { v: 3, code: 100, exploit: 3, credits: 2000, salvage: 40, minutes: 240, needs: 25 },
];
// One rule per service. `stat`/`values`: what it adds per version (see serviceValue).
// `code`: which code it's built from. `special`: needs its source (found in vaults) first.
export const SERVICES = {
  firewall: { name: 'Filter Bay', code: 'cipher', stat: 'firewall', values: [1, 2, 3], unit: ' filter slots', flat: true, about: 'Slots for filters on your firewall.' },
  raid: { name: 'RAID Array', code: 'worm', stat: 'integrity', values: [5, 10, 15], unit: '% max Integrity', about: 'More server Integrity.' },
  kernel: { name: 'Hardened Kernel', code: 'kernel', stat: 'reduction', values: [2, 4, 6], unit: ' Block', flat: true, about: 'Hits on your server do less.' },
  scrubber: { name: 'Scrubber', code: 'cipher', stat: 'shield', values: [4, 7, 10], unit: '% shield at the start of each home fight', about: 'Every home fight starts with a shield.' },
  hotpatch: { name: 'Hot-patcher', code: 'worm', stat: 'regen', values: [0.3, 0.6, 1], unit: ' Regen', flat: true, about: 'Slow self-repair: per cycle in home fights, per minute between fights.' },
  counter: { name: 'Counter-intrusion', code: 'worm', stat: 'countermeasures', values: [2, 4, 6], unit: ' back per hit', flat: true, about: 'Whatever hits your server takes a hit back (on armor, it breaks a chit).' },
  honeypot: { name: 'Honeypot', code: 'kernel', stat: 'evasion', values: [3, 5, 8], unit: '% Evasion', about: 'Some attacks on your server hit a decoy and miss.' },
  sandbox: { name: 'Sandbox', code: 'cipher', stat: 'sanitize', values: [15, 30, 45], unit: '% Sanitize', about: 'Encrypts, Blinds and spawns may fail on your server.' },
  uplink: { name: 'Route Logger', code: 'cipher', stat: 'lead', values: [5, 10, 15], unit: ' lead per kill', flat: true, about: 'Every kill fills its lead faster, so origins turn up sooner.' },
  buildfarm: { name: 'Build Farm', code: 'kernel', stat: 'compileDiscount', values: [15, 25, 35], unit: '% off compiling', about: 'Compiling protocols costs less.' },
  tarpit: { name: 'Tarpit', code: 'worm', stat: 'tarpit', values: [50, 100, 150], unit: '% slower invasions', about: 'Invasions crawl toward you: fewer of them, and more warning.' },
  router: { name: 'Edge Router', code: 'worm', stat: 'bandwidth', values: [1, 2, 3], unit: ' outpost slots', about: 'Run more outposts at once.' },
  scheduler: { name: 'Scheduler', code: 'kernel', stat: 'scheduler', values: [60, 30, 15], unit: '-minute collection', about: 'Collects every outpost on a timer, so you don\'t have to visit.' },
  cron: { name: 'Cron Job', code: ['worm', 'kernel'], special: true, stat: 'cron', values: [0.4, 0.6, 0.8], unit: '× cron hits', about: 'Home fights: every 3rd cycle your server hits the soonest attacker.' },
  snapshot: { name: 'Snapshot', code: ['cipher', 'kernel'], special: true, stat: 'snapshot', values: [8, 12, 16], unit: '% restore', about: 'Once per home fight, when a hit drops you below half, restore some Integrity.' },
};
export const SERVICE_SOURCES = Object.keys(SERVICES).filter((k) => SERVICES[k].special);
// What a version of a service costs, as { credits, cipher, worm, kernel, exploit }.
export function serviceCost(id, v) {
  const d = SERVICES[id], x = VERSIONS[v - 1];
  const cost = { credits: x.credits, exploit: x.exploit };
  const codes = Array.isArray(d.code) ? d.code : [d.code];
  for (const c of codes) cost[c] = Math.ceil(x.code / codes.length) + (codes.length > 1 ? Math.ceil(x.code / 4) : 0);
  return cost;
}
export const costLine = (cost) => Object.entries(cost).filter(([, n]) => n).map(([k, n]) => (k === 'credits' ? `${n}c` : k === 'salvage' ? `${n} salvage` : `${n} ${MATERIALS[k].short}`)).join(' + ');
export const serviceSalvage = (v) => VERSIONS[v - 1].salvage || 0;

// ---------- blueprints ----------
// Nothing is buildable at the start. Every regular service, and every protocol recipe (compile a
// protocol built around one stat), is a blueprint you find once: one waits in a quarter of the
// vaults (blueprint.bp, always in your first server's), and kills drop one rarely. The first you
// find is always the Firewall.
// Special services and Zero-days still come from source (.src) in deeper vaults.
export const recipeId = (stat) => 'recipe:' + stat;
export const recipeStat = (id) => (id?.startsWith('recipe:') ? id.slice(7) : null);
export const BLUEPRINTS = [...Object.keys(SERVICES).filter((k) => !SERVICES[k].special), ...PROTOCOL_STATS.map(recipeId)];
export const BLUEPRINT_CHANCE = { home: 0.008, guard: 0.02 }; // the pool is every kind of recipe (combat.mjs learnBlueprint)
export const blueprintName = (id) => (recipeStat(id) ? `${PROTOCOL_NAMES[recipeStat(id)]} recipe` : `${SERVICES[id]?.name || id} blueprint`);

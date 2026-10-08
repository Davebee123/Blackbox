// The virus builder as it stood before genes (docs/genome.md, phase 0), frozen for golden.test.mjs: the same seeds
// must build the same viruses through createVirus in dist/data.mjs, and fight the same. Shared knobs (CONFIG, GRADES,
// THREAT_STEPS, ELITE, SERVER, power) come from data.mjs, so tuning them moves both builders alike. The virus content
// below (families, strains, guards, mutations, fixtures, solo bosses) is a copy: change a part's numbers on purpose
// and change it here too, or retire the golden test.
import { CONFIG, GRADES, THREAT_STEPS, ELITE, SERVER, mobPower, runLate } from './dist/data.mjs';

const FAMILIES = {
  ransomware: {
    name: 'Ransomware',
    threatens: 'Integrity',
    summary: 'Encrypts your server: every Encrypt adds damage each cycle until you break the Encryptor, which holds the key.',
    parts: [
      { id: 'pulse', name: 'Pulse Node', integrity: 34, armor: 1, loot: 'Pulse Kernel', attack: { name: 'Surge', effect: 'damage', amount: 14, interval: 4, first: 3 } },
      { id: 'encryptor', name: 'Encryptor', integrity: 38, armor: 1, loot: 'Cipher Seed', special: true, attack: { name: 'Encrypt', effect: 'encrypt', amount: 4, interval: 5, first: 4 } },
      // A third part (pool 'third': a wild virus brings one of those open at its level, picked by its seed).
      // From level 3: the Lockbox wards the Encryptor (it can't lose more than a quarter of itself a cycle while the Lockbox lives).
      { id: 'lockbox', name: 'Lockbox', integrity: 16, armor: 0, loot: 'Lock Pin', ward: 'encryptor', from: 3, pool: 'third' },
      // From level 8: the Mutex holds a lock on the Encryptor, a shield that comes back while the Mutex lives.
      { id: 'mutex', name: 'Mutex', integrity: 18, armor: 1, loot: 'Mutex Handle', lock: 'encryptor', from: 8, pool: 'third' },
      // From level 20: the Tripwire. Break it while the others live and they go loud.
      { id: 'tripwire', name: 'Tripwire', integrity: 18, armor: 1, loot: 'Trip Coil', deadman: true, from: 20, pool: 'third', attack: { name: 'Ping', effect: 'damage', amount: 3, interval: 3, first: 3 } },
    ],
  },
  worm: {
    name: 'Worm',
    threatens: 'Integrity',
    summary: 'Spawns fragments that gnaw the server every cycle. The Replicator makes them.',
    parts: [
      { id: 'pulse', name: 'Pulse Node', integrity: 34, armor: 1, loot: 'Pulse Kernel', attack: { name: 'Surge', effect: 'damage', amount: 12, interval: 4, first: 4 } },
      { id: 'replicator', name: 'Replicator', integrity: 38, armor: 1, loot: 'Replication Seed', special: true, attack: { name: 'Replicate', effect: 'replicate', amount: 1, interval: 4, first: 3, hit: 4 } }, // a small Splice hit with each spawn
      // From level 3: the Mirror and the Replicator are twins. Break one while the other lives and it reboots.
      { id: 'mirror', name: 'Mirror', integrity: 18, armor: 1, loot: 'Mirror Shard', twin: 'replicator', from: 3, pool: 'third', attack: { name: 'Splice', effect: 'damage', amount: 3, interval: 4, first: 3 } },
      // From level 8: the C2 Node commands the fragments. They gnaw harder while it lives and drop when it breaks.
      { id: 'c2', name: 'C2 Node', integrity: 18, armor: 1, loot: 'C2 Beacon', command: true, from: 8, pool: 'third', attack: { name: 'Beacon', effect: 'damage', amount: 3, interval: 4, first: 3 } },
    ],
  },
  ghostroot: {
    name: 'Ghostroot',
    threatens: 'Integrity',
    summary: 'Veiled: its timers stay hidden while its parts are armored. The Scrambler hits you and scrambles you for 2 cycles: each of your attacks has a 25% chance to hit you instead, at half strength.',
    parts: [
      // The Scrambler carries the threat, not the Pulse: killing the Pulse first no longer halves the fight.
      { id: 'pulse', name: 'Pulse Node', integrity: 34, armor: 1, veiled: true, loot: 'Pulse Kernel', attack: { name: 'Surge', effect: 'damage', amount: 11, interval: 4, first: 3 } },
      { id: 'scrambler', name: 'Scrambler', integrity: 40, armor: 1, veiled: true, loot: 'Signal Key', special: true, attack: { name: 'Scramble', effect: 'scramble', amount: 2, hit: 9, interval: 4, first: 2 } },
      // From level 4: every 4th cycle the Decoy mirrors your commands. They do nothing, and some bounces back.
      { id: 'decoy', name: 'Decoy', integrity: 18, armor: 1, veiled: true, loot: 'Decoy Shell', reflect: 4, from: 4, pool: 'third' },
      // From level 8: the Mimic records your commands and plays the last one back at you on its beat (its MIMIC tell).
      { id: 'mimic', name: 'Mimic', integrity: 18, armor: 1, veiled: true, loot: 'Mimic Mask', mimic: true, from: 8, pool: 'third' },
    ],
  },
};
const PULSE = (amount, first) => ({ id: 'pulse', name: 'Pulse Node', integrity: 34, armor: 1, loot: 'Pulse Kernel', attack: { name: 'Surge', effect: 'damage', amount, interval: 4, first } });
const STRAINS = {
  keylogger: {
    lineage: 'ghostroot', from: 4, depth: 2, name: 'Keylogger', tell: { name: 'Keystorm' },
    rule: 'A Sync Window opens every cycle. The Logger only takes damage from commands fired inside it; every command fired outside it is logged, and 3 logs come back as an 18-damage Dump. It Dumps on its own every 6 cycles too.',
    parts: [PULSE(12, 3), { id: 'logger', name: 'Logger', integrity: 30, armor: 1, loot: 'Logger Spool', special: true, syncOnly: true, attack: { name: 'Dump', effect: 'damage', amount: 18, interval: 6, first: 6, dump: true } }],
  },
  hashrat: {
    lineage: 'ransomware', from: 5, depth: 2, name: 'Hashrat', tell: { name: 'Overcharge', part: 'basic' },
    rule: 'While the Miner lives, your cooldowns tick down only every other cycle. Left alone, it Overclocks: 4 damage every 2 cycles.',
    parts: [PULSE(12, 3), { id: 'miner', name: 'Miner', integrity: 30, armor: 0, loot: 'Miner Rig', special: true, tax: true, attack: { name: 'Overclock', effect: 'damage', amount: 4, interval: 2, first: 2, alone: true } }],
  },
  floodgate: {
    lineage: 'worm', from: 6, depth: 2, name: 'Floodgate', tell: { name: 'Deluge' },
    rule: 'The Flooder hits every cycle, one harder each time; any delay resets it.',
    parts: [PULSE(12, 4), { id: 'flooder', name: 'Flooder', integrity: 28, armor: 0, loot: 'Flood Valve', special: true, attack: { name: 'Flood', effect: 'damage', amount: 2, interval: 1, first: 2, ramp: 1 } }],
  },
  leech: {
    lineage: 'worm', from: 8, depth: 2, name: 'Leech', tell: { name: 'Gorge' },
    rule: 'The Tap heals its most damaged part by everything its bite deals, and clears one burn from it.',
    parts: [PULSE(12, 4), { id: 'tap', name: 'Tap', integrity: 28, armor: 1, loot: 'Tap Fang', special: true, attack: { name: 'Siphon', effect: 'damage', amount: 8, interval: 3, first: 3, siphon: true } }],
  },
  sleeper: {
    lineage: 'ghostroot', from: 10, depth: 2, name: 'Sleeper', tell: { name: 'Wake-up Call' }, dormant: 6,
    rule: 'Dormant until you deal damage or cycle 6. When it wakes, the Cell sounds a 14-damage Alarm and the Pulse Node attacks a cycle sooner.',
    parts: [PULSE(14, 3), { id: 'cell', name: 'Cell', integrity: 32, armor: 1, loot: 'Cell Key', special: true, attack: { name: 'Alarm', effect: 'damage', amount: 14, interval: 5, first: 999, alarm: true } }],
  },
  // Wave 1b: six more for the early climb (levels 3–11), all from layer 2.
  patchwork: {
    lineage: 'worm', from: 3, depth: 2, name: 'Patchwork', tell: { name: 'Hotfix' },
    rule: 'Every 3 cycles the Patcher heals the most damaged part by 12. Kill it first, or burst the other one down between patches.',
    parts: [PULSE(12, 4), { id: 'patcher', name: 'Patcher', integrity: 28, armor: 1, loot: 'Patch Kit', special: true, attack: { name: 'Patch', effect: 'heal', amount: 12, interval: 3, first: 3 } }],
  },
  flicker: {
    lineage: 'ghostroot', from: 4, depth: 2, name: 'Flicker', tell: { name: 'Blink' },
    rule: 'The Shade is only there on even cycles. On odd cycles your hits pass straight through it, and 15% of the hit bounces back at you. It strikes when it is there.',
    parts: [PULSE(13, 3), { id: 'shade', name: 'Shade', integrity: 22, armor: 1, loot: 'Shade Lens', special: true, phase: true, attack: { name: 'Fade', effect: 'damage', amount: 5, interval: 2, first: 2 } }],
  },
  extortion: {
    lineage: 'ransomware', from: 6, depth: 2, name: 'Extortion', tell: { name: 'Overcharge', part: 'basic' },
    rule: 'The Demand winds up a 26-damage Deadline. Deal it 14 damage in the 2 cycles before it lands and the Deadline is called off.',
    parts: [PULSE(12, 3), { id: 'demand', name: 'Demand', integrity: 40, armor: 0, loot: 'Ransom Note', special: true, attack: { name: 'Deadline', effect: 'damage', amount: 26, interval: 5, first: 4, windup: 14 } }],
  },
  echo: {
    lineage: 'ghostroot', from: 8, depth: 2, name: 'Echo', tell: { name: 'Feedback' },
    rule: 'While the Echo lives, every hit you take repeats a cycle later at half damage, and it Reverbs for 6 every 4 cycles.',
    parts: [PULSE(14, 3), { id: 'echo', name: 'Echo', integrity: 30, armor: 1, loot: 'Echo Chamber', special: true, echo: true, attack: { name: 'Reverb', effect: 'damage', amount: 6, interval: 4, first: 3 } }],
  },
  bricker: {
    lineage: 'ransomware', from: 9, depth: 2, name: 'Bricker', tell: { name: 'Brick Wall' }, enrage: true,
    rule: 'Each part hits 30% harder once it drops below half Integrity. Take parts from healthy to dead in one go.',
    parts: [PULSE(12, 3), { id: 'locker', name: 'Locker', integrity: 36, armor: 1, loot: 'Brick Key', special: true, attack: { name: 'Brick', effect: 'damage', amount: 10, interval: 3, first: 3 } }],
  },
  overrun: {
    lineage: 'worm', from: 11, depth: 2, name: 'Overrun', tell: { name: 'Swarm', spawn: 1 },
    rule: 'The Hive spawns fragments that bite one harder every cycle they live. Clear them young, or kill the Hive.',
    parts: [PULSE(10, 4), { id: 'hive', name: 'Hive', integrity: 34, armor: 1, loot: 'Hive Comb', special: true, overrun: true, attack: { name: 'Swarm', effect: 'replicate', amount: 1, interval: 4, first: 2 } }],
  },
};
const GUARDS = {
  watchdog: {
    name: 'Watchdog',
    threatens: 'Signal',
    guard: true,
    art: 'watchdog',
    summary: 'Security daemon guarding a directory. The Tracker winds up one big hit.',
    parts: [
      { id: 'sentry', name: 'Sentry', integrity: 24, armor: 0, loot: 'Sentry Lens', attack: { name: 'Sweep', effect: 'damage', amount: 6, interval: 3, first: 2 } },
      { id: 'tracker', name: 'Tracker', integrity: 28, armor: 1, loot: 'Tracker Core', special: true, attack: { name: 'Trace-back', effect: 'damage', amount: 16, interval: 5, first: 4 } },
    ],
  },
  // Part ids match the Ghostroot art regions, so it draws as a veiled root creature.
  sentinel: {
    name: 'Sentinel',
    threatens: 'Signal',
    guard: true,
    art: 'ghostroot',
    summary: 'Veiled security daemon: its timers stay hidden while its parts are armored.',
    parts: [
      { id: 'pulse', name: 'Lens', integrity: 24, armor: 1, veiled: true, loot: 'Sentinel Lens', attack: { name: 'Glare', effect: 'damage', amount: 10, interval: 4, first: 3 } },
      { id: 'scrambler', name: 'Lockout', integrity: 24, armor: 1, veiled: true, loot: 'Lockout Relay', special: true, attack: { name: 'Lockout', effect: 'damage', amount: 7, interval: 3, first: 2 } },
    ],
  },
  // Worm-shaped guard: its Brood spawns fragments that gnaw your Signal.
  crawler: {
    name: 'Crawler',
    threatens: 'Signal',
    guard: true,
    art: 'worm',
    summary: 'Nesting guard. The Brood spawns fragments that gnaw your Signal every cycle.',
    parts: [
      { id: 'pulse', name: 'Maw', integrity: 24, armor: 0, loot: 'Crawler Maw', attack: { name: 'Bite', effect: 'damage', amount: 7, interval: 3, first: 2 } },
      { id: 'replicator', name: 'Brood', integrity: 28, armor: 1, loot: 'Brood Seed', special: true, attack: { name: 'Brood', effect: 'replicate', amount: 1, interval: 4, first: 3 } },
    ],
  },
  // Ransomware-shaped guard: the Shredder winds up one heavy strike.
  shredder: {
    name: 'Shredder',
    threatens: 'Signal',
    guard: true,
    art: 'ransomware',
    summary: 'Archive guard. The Shredder winds up one heavy strike on your Signal.',
    parts: [
      { id: 'pulse', name: 'Grinder', integrity: 26, armor: 1, loot: 'Grinder Core', attack: { name: 'Grind', effect: 'damage', amount: 9, interval: 4, first: 3 } },
      { id: 'encryptor', name: 'Shredder', integrity: 26, armor: 1, loot: 'Shredder Blade', special: true, attack: { name: 'Shred', effect: 'damage', amount: 14, interval: 5, first: 4 } },
    ],
  },
  // ICE: countermeasures that replace a Watchdog or Sentinel on layer 2 and deeper, about half
  // the time. Each has one rule (shown as a tag in the fight header).
  // Ransomware-shaped: the Keyring re-arms the Gate to full armor every 4 cycles.
  bouncer: {
    name: 'Bouncer',
    threatens: 'Signal',
    guard: true,
    ice: true,
    art: 'ransomware',
    rule: 'Every 4 cycles the Keyring re-arms the Gate to full armor, three times, then it overheats. The Keyring has no attack. Kill the Gate between re-arms, and break the Keyring first only when the Gate\'s shell is too thick to get through in time.',
    summary: 'ICE on the door. The Keyring keeps re-arming the Gate.',
    parts: [
      { id: 'pulse', name: 'Gate', integrity: 30, armor: 3, loot: 'Gate Hinge', attack: { name: 'Ram', effect: 'damage', amount: 10, interval: 3, first: 2 } },
      { id: 'encryptor', name: 'Keyring', integrity: 22, armor: 1, loot: 'Keyring', special: true, rearm: 4 },
    ],
  },
  // Watchdog-shaped: the longer the fight, the harder the Trace-back.
  tracer: {
    name: 'Tracer',
    threatens: 'Signal',
    guard: true,
    ice: true,
    art: 'watchdog',
    rule: 'Its Trace-back grows every cycle the fight goes on. Race it.',
    summary: 'Trace ICE. Every cycle you spend, it gets closer.',
    parts: [
      { id: 'sentry', name: 'Probe', integrity: 22, armor: 0, loot: 'Probe Lens', attack: { name: 'Ping', effect: 'damage', amount: 4, interval: 2, first: 2 } },
      { id: 'tracker', name: 'Tracker', integrity: 28, armor: 1, loot: 'Trace Coil', special: true, attack: { name: 'Trace-back', effect: 'damage', amount: 6, interval: 3, first: 3, grow: 2 } },
    ],
  },
};
const MUTATIONS = {
  armored: { name: 'Armored', rule: 'Every part has one more ◆.' },
  regenerative: { name: 'Regenerative', rule: 'A stripped part patches its armor a cycle sooner, so strip it only when you can finish it.' },
  hasty: { name: 'Hasty', rule: 'Every attack comes a cycle sooner and repeats a cycle faster, but its parts have 10% less Integrity, so kill it fast.' },
  rerouting: { name: 'Rerouting', rule: 'When a part breaks, a third of its attack damage reroutes to the surviving part that attacks next.', retired: true }, // every v2+ virus is Linked now (combat.mjs)
  adaptive: { name: 'Adaptive', rule: 'A part your commands hit three cycles in a row adapts: it gains a ◆ at the end of that cycle.' },
};

// The mutations a virus can roll (a retired one only lingers on old saves' viruses).
const ROLLED_MUTATIONS = Object.keys(MUTATIONS).filter((k) => !MUTATIONS[k].retired);
const FIXTURES = {
  cryptjack: { name: 'CRYPTJACK', family: 'ransomware', mutation: null, threat: 15 },
  splinter: { name: 'SPLINTER', family: 'worm', mutation: 'regenerative', threat: 14 },
  ghostroot: { name: 'GHOSTROOT', family: 'ghostroot', mutation: 'hasty', threat: 15 },
  watchdog: { name: 'WATCHDOG', family: 'watchdog', mutation: null, threat: 13 },
  sentinel: { name: 'SENTINEL', family: 'sentinel', mutation: null, threat: 13 },
  crawler: { name: 'CRAWLER', family: 'crawler', mutation: null, threat: 13 },
  shredder: { name: 'SHREDDER', family: 'shredder', mutation: null, threat: 13 },
  bouncer: { name: 'BOUNCER', family: 'bouncer', mutation: null, threat: 13 },
  tracer: { name: 'TRACER', family: 'tracer', mutation: null, threat: 13 },
};

const familyOf = (id) => FAMILIES[id] || GUARDS[id];
function rng(seed) {
  let state = (seed ^ 0x9e3779b9) >>> 0;
  state = Math.imul(state ^ (state >>> 16), 0x21f0aaad) >>> 0;
  state = Math.imul(state ^ (state >>> 15), 0x735a2d97) >>> 0;
  return () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
}

function makePart(spec, kind, scale, extraArmor = 0) {
  const max = Math.max(1, Math.round(spec.integrity * scale * (kind === 'fragment' ? 1 : CONFIG.partToughness)));
  const worn = (spec.armor || 0) + extraArmor;
  const armor = worn >= 2 ? Math.round(worn * CONFIG.armorScale) : worn; // 2 → 3, 3 → 5, 4 → 6
  return {
    id: spec.id,
    name: spec.name,
    kind,
    integrity: max,
    max,
    armor,
    maxArmor: armor,
    patchAt: null,
    veiled: !!spec.veiled,
    loot: spec.loot || null,
    special: !!spec.special,
    syncOnly: !!spec.syncOnly, // Keylogger's Logger: only commands fired in a Sync Window hurt it
    tax: !!spec.tax, // Hashrat's Miner: your cooldowns run at half speed while it lives
    phase: !!spec.phase, // Flicker's Shade: only there on even cycles
    echo: !!spec.echo, // Echo: every hit you take repeats next cycle at half
    overrun: !!spec.overrun, // Overrun's Hive: its fragments bite harder every cycle
    rearm: spec.rearm || 0, // Bouncer's Keyring: re-arms the other part every N cycles
    ward: spec.ward || null, // Lockbox: the part it wards loses at most CONFIG.ward of its max a cycle
    twin: spec.twin || null, // Mirror: its twin; break one while the other lives and it reboots
    reflect: spec.reflect || 0, // Decoy: every Nth cycle your commands are mirrored
    lock: spec.lock || null, // Mutex: the part it holds a lock (a shield) on
    deadman: !!spec.deadman, // Tripwire: break it while the others live and they go loud
    command: !!spec.command, // C2 Node: fragments gnaw harder while it lives, and drop when it breaks
    mimic: !!spec.mimic, // Mimic: plays your last command back at you (its tell)
    attack: spec.attack ? { ...spec.attack, due: spec.attack.first, amount: spec.attack.amount } : null,
    exposedUntil: 0,
    lastDamaged: 0,
    boosted: false,
  };
}
const STRAIN_BOSS_LATE = [[8, 1], [10, 0.8], [18, 1.1], [30, 1.45]];
const BOSSES = {
  // The Resident (run.mjs /core): about two wins in three for a geared player at its level.
  resident: { name: 'Resident', hp: 1.4, dmg: 1, enrageAt: 18, phases: [{ at: 0.5, do: ['rearm'], say: 'The Resident re-arms every part.' }] },
  // RELAY-KING (run.mjs): a worm boss in SPRAWL-00's /net from level 3, back every half hour.
  relayking: { name: 'RELAY-KING', family: 'worm', hp: 1.6, dmg: 1, enrageAt: 16, phases: [{ at: 0.5, do: ['faster'], say: 'RELAY-KING speeds up. Every attack comes a cycle sooner.' }] },
  // REPO MAN (events.mjs): the bounty from level 8.
  repoman: { name: 'REPO MAN', family: 'ransomware', hp: 1.6, dmg: 1, enrageAt: 18, phases: [{ at: 0.6, do: ['rearm'], say: 'REPO MAN re-arms every part.' }, { at: 0.3, do: ['faster'], say: 'REPO MAN gets desperate. Every attack comes a cycle sooner.' }] },
  // HOLLOW CHOIR (events.mjs): a ghostroot boss from level 10. At half it splits off a second Decoy, on the off-beat.
  choir: { name: 'HOLLOW CHOIR', family: 'ghostroot', hp: 1.6, dmg: 1, enrageAt: 16, phases: [{ at: 0.5, do: ['spawn:decoy'], say: 'The Hollow Choir splits off a second Decoy, on the off-beat: now it mirrors you two cycles in four.' }] },
  // Native bosses (network.mjs): each network rolls one of these for its lair, a rogue server of its own. Solo bosses
  // on the tells framework: every tell open at their level, a signature charge of their own (TELLS, TELL_SETS by id;
  // a strain boss renames its strain's charge), a third part they always bring (third), and phases. Their drops are
  // their network's native uniques (BOSS_LOOT odds and pity).
  'nb-deadbolt': { name: 'DEADBOLT', family: 'ransomware', third: 'mutex', native: true, lair: 'DEADBOLT-VAULT', hp: 1.25, dmg: 1, enrageAt: 18, about: 'A Mutex locks its Encryptor. At 60% it re-arms, and at 30% a second Mutex throws a fresh lock.', phases: [{ at: 0.6, do: ['rearm'], say: 'DEADBOLT re-arms every part.' }, { at: 0.3, do: ['spawn:mutex'], say: 'DEADBOLT throws a second Mutex. The Encryptor is locked again.' }] },
  'nb-tripmine': { name: 'TRIPMINE', family: 'ransomware', third: 'tripwire', native: true, lair: 'TRIPMINE-YARD', hp: 1.6, dmg: 1, enrageAt: 18, about: 'Its Tripwire (a Lockbox below level 20) sends the rest loud if it breaks first. At half every attack comes a cycle sooner.', phases: [{ at: 0.5, do: ['faster'], say: 'TRIPMINE arms the yard. Every attack comes a cycle sooner.' }] },
  'nb-hashlord': { name: 'HASHLORD', family: 'ransomware', strain: 'hashrat', native: true, lair: 'HASHLORD-RIG', charge: 'Difficulty Bomb', hp: 2.5, dmg: 1.3, healerDmg: STRAIN_BOSS_LATE, enrageAt: 18, about: 'A Hashrat boss: while its Miner lives your cooldowns tick every other cycle. At 60% it re-arms, at 30% every attack comes a cycle sooner.', phases: [{ at: 0.6, do: ['rearm'], say: 'HASHLORD re-arms every part.' }, { at: 0.3, do: ['faster'], say: 'HASHLORD overclocks: every attack comes a cycle sooner.' }] },
  'nb-backorifice': { name: 'BACK ORIFICE', family: 'worm', third: 'c2', native: true, lair: 'BACKORIFICE-C2', hp: 1.3, dmg: 0.95, enrageAt: 17, about: 'A C2 Node commands its fragments. At half every attack comes a cycle sooner, and at 25% a Mirror twins the Replicator.', phases: [{ at: 0.5, do: ['faster'], say: 'BACK ORIFICE opens every port. Every attack comes a cycle sooner.' }, { at: 0.25, do: ['spawn:mirror'], say: 'BACK ORIFICE spins up a Mirror. Break it and the Replicator together.' }] },
  'nb-patchday': { name: 'PATCH TUESDAY', family: 'worm', strain: 'patchwork', native: true, lair: 'PATCHDAY-WSUS', charge: 'Rollup', hp: 2.2, dmg: 1.45, healerDmg: STRAIN_BOSS_LATE, enrageAt: 18, about: 'A Patchwork boss: its Patcher heals the most damaged part. At 60% it re-arms, at 30% every attack comes a cycle sooner.', phases: [{ at: 0.6, do: ['rearm'], say: 'PATCH TUESDAY re-arms every part.' }, { at: 0.3, do: ['faster'], say: 'PATCH TUESDAY forces a reboot. Every attack comes a cycle sooner.' }] },
  'nb-floodwall': { name: 'FLOODWALL', family: 'worm', strain: 'floodgate', native: true, lair: 'FLOODWALL-SLUICE', charge: 'Storm Surge', hp: 1.6, dmg: 0.95, healerDmg: STRAIN_BOSS_LATE, enrageAt: 18, about: 'A Floodgate boss: its Flooder hits every cycle, harder each time, and a delay resets it. At half it re-arms.', phases: [{ at: 0.5, do: ['rearm'], say: 'FLOODWALL re-arms every part.' }] },
  'nb-mirrorshade': { name: 'MIRRORSHADE', family: 'ghostroot', third: 'mimic', native: true, lair: 'MIRRORSHADE-HALL', hp: 1.5, dmg: 1.1, enrageAt: 17, about: 'A Mimic plays your commands back on its beat. At half it splits off a Decoy that mirrors you on the off-beat.', phases: [{ at: 0.5, do: ['spawn:decoy'], say: 'MIRRORSHADE splits off a Decoy: it mirrors you on the off-beat.' }] },
  'nb-sleepwalker': { name: 'SLEEPWALKER', family: 'ghostroot', strain: 'sleeper', native: true, lair: 'SLEEPWALKER-WARD', charge: 'Night Terror', hp: 1.5, dmg: 1, healerDmg: STRAIN_BOSS_LATE, enrageAt: 18, about: 'A Sleeper boss: dormant until you hit it, then its Cell sounds the Alarm. At half it re-arms.', phases: [{ at: 0.5, do: ['rearm'], say: 'SLEEPWALKER wakes all the way. Every part re-arms.' }] },
  'nb-echolalia': { name: 'ECHOLALIA', family: 'ghostroot', strain: 'echo', native: true, lair: 'ECHOLALIA-CHAMBER', charge: 'Last Word', hp: 1.6, dmg: 1, healerDmg: STRAIN_BOSS_LATE, enrageAt: 18, about: 'An Echo boss: every hit that gets through repeats a cycle later at half. At 60% it re-arms, at 30% every attack comes a cycle sooner.', phases: [{ at: 0.6, do: ['rearm'], say: 'ECHOLALIA re-arms every part.' }, { at: 0.3, do: ['faster'], say: 'ECHOLALIA starts talking over you. Every attack comes a cycle sooner.' }] },
};
export function createVirus(key = 'cryptjack', seed = 1, overrides = {}) {
  const next = rng(seed);
  const random = key === 'random';
  const fixture = FIXTURES[key];
  const forced = STRAINS[key] ? key : null;
  if (!random && !fixture && !forced) throw new Error('Unknown fixture ' + key);
  const homeFamilies = Object.keys(FAMILIES);
  const familyId = overrides.family || BOSSES[overrides.boss]?.family || (forced ? STRAINS[forced].lineage : random ? homeFamilies[Math.floor(next() * homeFamilies.length)] : fixture.family);
  const family = familyOf(familyId);
  const mutationIds = ROLLED_MUTATIONS;
  const rolled = random ? mutationIds[Math.floor(next() * mutationIds.length)] : forced ? null : fixture.mutation;
  const mutation = overrides.mutation !== undefined ? overrides.mutation : rolled;
  const threat = overrides.threat ?? (random ? 12 + Math.floor(next() * 9) : forced ? 13 : fixture.threat);
  const level = Math.max(1, threat - 9);
  // A strain (forced by key, or chosen by variantFor for deeper servers) and a grade.
  const strainId = forced || overrides.strain || null;
  const strain = strainId ? STRAINS[strainId] : null;
  const grade = GRADES[overrides.grade] ? overrides.grade : 1, g = GRADES[grade];
  const scale = mobPower(level) * (mutation === 'hasty' ? 0.9 : 1) * (overrides.run ? CONFIG.runHp : 1);

  // Tougher viruses wear more armor and strike sooner (see THREAT_STEPS).
  const extra = (spec) => (mutation === 'armored' ? 1 : 0) + THREAT_STEPS.armor.filter((x) => threat >= x.threat && (x.part === 'any' || (x.part === 'special') === !!spec.special)).length;
  // A family's third part joins wild viruses from its level (named fixtures stay as they are); the others give up some Integrity for it.
  const open = (strain ? strain.parts : family.parts).filter((spec) => !spec.from || ((random || overrides.family) && level >= spec.from));
  // The third part: one of those open at its level (FAMILIES, pool 'third'), picked by its own hash of the
  // seed so it never moves the virus's other rolls. A boss keeps its family's first (the classic one).
  const pool = open.filter((spec) => spec.pool === 'third');
  const own = overrides.boss && pool.find((spec) => spec.id === BOSSES[overrides.boss]?.third); // a native boss brings its own (data BOSSES nb-*)
  const third = pool.length ? own || pool[overrides.boss ? 0 : (Math.imul((seed >>> 0) ^ 0x7f4a7c15, 2246822519) >>> 0) % pool.length] : null;
  const specs = open.filter((spec) => spec.pool !== 'third' || spec === third);
  const trim = specs.some((spec) => spec.from) ? CONFIG.thirdTrim : 1;
  const parts = specs.map((spec) => makePart(spec, 'system', scale * g.hp * (spec.from ? 1 : trim), extra(spec) + (spec.special ? 0 : g.armor)));
  const step = overrides.run ? (CONFIG.runEarly[level - 1] ?? 1) * (overrides.boss || overrides.elite ? 1 : runLate(level)) : 1;
  const dmgScale = mobPower(level) * (1 + CONFIG.enemyRamp * (level - 1)) * g.dmg * (overrides.run ? CONFIG.runDamage * step : 1);
  // Encryption stacks, so it skips the early-game and late steps (they would compound).
  for (const p of parts) if (p.attack && ['damage', 'encrypt'].includes(p.attack.effect)) p.attack.amount = Math.max(1, Math.round(p.attack.amount * dmgScale / (p.attack.effect === 'encrypt' ? step : 1)));
  for (const p of parts) if (p.attack?.effect === 'heal') p.attack.amount = Math.max(1, Math.round(p.attack.amount * scale * g.hp));
  for (const p of parts) if (p.attack?.hit) p.attack.hit = Math.max(1, Math.round(p.attack.hit * dmgScale)); // a special that also hits (the Scrambler)
  for (const p of parts) if (p.attack?.grow) p.attack.grow = Math.max(1, Math.round(p.attack.grow * dmgScale));
  for (const p of parts) if (p.attack?.windup) p.attack.windup = Math.max(1, Math.round(p.attack.windup * scale * g.hp));
  if (strain?.enrage) for (const p of parts) p.enrage = true;
  for (const p of parts) if (p.attack?.ramp) { p.attack.rampBy = Math.max(1, Math.round(p.attack.ramp * dmgScale)); p.attack.step = 0; }
  const sooner = (mutation === 'hasty' ? 1 : 0) + (threat >= THREAT_STEPS.sooner ? 1 : 0);
  for (const p of parts) if (p.attack && p.attack.due < 900) p.attack.due = Math.max(2, p.attack.due - sooner); // never on cycle 1: you always get a move first
  // Hasty also repeats faster (at least every 2 cycles), so it stays a pressure mutation at every level.
  if (mutation === 'hasty') for (const p of parts) if (p.attack?.interval) p.attack.interval = Math.max(2, p.attack.interval - 1);
  // A dormant strain's attacks wait off the timeline until it wakes.
  if (strain?.dormant) for (const p of parts) if (p.attack) { p.attack.wake = Math.max(1, p.attack.due - 1); p.attack.due = 999; }

  if (overrides.elite) for (const p of parts) {
    p.max = p.integrity = Math.round(p.max * (overrides.eliteHp ?? ELITE.hp));
    p.armor = p.maxArmor = p.maxArmor + ELITE.armor;
    if (p.attack && ['damage', 'encrypt'].includes(p.attack.effect)) p.attack.amount = Math.max(1, Math.round(p.attack.amount * ELITE.dmg));
    if (p.attack?.hit) p.attack.hit = Math.max(1, Math.round(p.attack.hit * ELITE.dmg));
    if (p.attack?.rampBy) p.attack.rampBy = Math.max(1, Math.round(p.attack.rampBy * ELITE.dmg));
  }
  // A boss (BOSSES): bigger and a little harder; its phases and enrage timer ride on the virus.
  const boss = BOSSES[overrides.boss] || null;
  if (boss) for (const p of parts) {
    p.max = p.integrity = Math.round(p.max * (overrides.bossHp ?? boss.hp));
    const dmg = boss.dmg * (boss.healerDmg ? runLate(level, boss.healerDmg) : 1);
    for (const k of ['amount', 'hit', 'rampBy']) if (p.attack?.[k] && (k !== 'amount' || ['damage', 'encrypt'].includes(p.attack.effect))) p.attack[k] = Math.max(1, Math.round(p.attack[k] * dmg));
  }
  const weakPoint = parts[Math.floor(next() * parts.length)].id;
  const tagNo = String(seed >>> 0).slice(-4).padStart(4, '0');
  const name = (overrides.elite ? 'ELITE ' : '') + (strain ? strain.name.toUpperCase() + '-' + tagNo : random ? family.name.toUpperCase() + '-' + tagNo : fixture.name) + (grade > 1 ? ` v${grade}` : '');
  // Enemy damage can crit, from level 3 (like mutations).
  const crit = level >= SERVER.mutationsFrom ? CONFIG.enemyCrit : 0;
  return { id: familyId + '-' + seed, name, family: familyId, strain: strainId, grade, dormant: strain?.dormant ? true : false, art: family.art || familyId, mutation, threat, level, power: dmgScale * (overrides.elite ? ELITE.dmg : 1), hpPower: scale, crit, threatens: family.threatens, parts, weakPoint, weakKnown: false, ...(overrides.elite ? { elite: true } : {}), ...(boss ? { boss: overrides.boss, phases: boss.phases.map((x) => ({ ...x, done: false })), enrageAt: boss.enrageAt } : {}) };
}

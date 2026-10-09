// Protocols and services. Pure data and pure functions (no state), so the engine, the
// views, runs and the balance sim can all use it.
//
// You run PROTOCOLS: items with rolled stats in generic slots (any protocol in any slot),
// like Corepunk. Loot and salvage build you.
// Your server runs SERVICES: built with code materials, one install at a time, versions v1–v3,
// one rule each (Master of Orion 2 style). Four of them, all for the network around you: the home
// fight is the firewall's job (filters, tiers) and the daemons'. Code builds your base.
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
  script: { name: 'Script', like: 'ring', about: 'A script you run alongside your skills.' },
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
  damage: { side: 'hacker', group: 'offense', name: 'Damage', unit: '', base: 2, flat: true, about: 'Adds this much damage to every skill hit you land.' },
  crit: { side: 'hacker', group: 'offense', name: 'Crit', unit: '%', base: 4, about: 'Increases the chance that a damaging hit is a critical strike. Everyone starts at 5%.' },
  critDamage: { side: 'hacker', group: 'offense', name: 'Crit Damage', unit: '', base: 6, flat: true, about: 'Adds this much damage to every critical strike, on top of ×1.5.' },
  accuracy: { side: 'hacker', group: 'offense', name: 'Accuracy', unit: '%', base: 2.5, about: 'Offsets the enemy\'s evasion, so your damaging skills miss less often. A miss still spends the cooldown.' },
  echo: { side: 'hacker', group: 'offense', name: 'Echo', unit: '%', base: 5, cap: 40, about: 'Gives each skill hit a chance to repeat for half damage. Against an armored part, the echo breaks another ◆.' },
  payload: { side: 'hacker', group: 'offense', name: 'Payload', unit: '%', base: 6, about: 'Increases the damage of your burns and helpers by this percentage.' }, // Damage over time keeps only part of the level growth (CONFIG.dotLevel), and Payload makes up the rest.
  // Defense (health on its side; the rest on both sides)
  signal: { side: 'hacker', group: 'survival', name: 'Signal', unit: '', base: 10, flat: true, about: 'Increases your max Signal on runs.' },
  integrity: { side: 'server', group: 'survival', name: 'Integrity', unit: '', base: 20, flat: true, about: 'Increases your server\'s max Integrity.' },
  regen: { side: 'both', group: 'survival', name: 'Regen', unit: '', dp: 1, base: 0.5, flat: true, about: 'Heals this much every cycle in a fight. On your rig, it also heals you on every move during a run. On your server, it also heals slowly between fights, every minute.' },
  reduction: { side: 'both', group: 'survival', name: 'Block', unit: '', base: 1, flat: true, about: 'Reduces the damage of every hit against you by this much, but never below half.' },
  evasion: { side: 'both', group: 'survival', name: 'Evasion', unit: '%', base: 2.5, cap: 20, about: 'Gives each enemy damage attack a chance to miss you, up to 20%.' },
  sanitize: { side: 'both', group: 'survival', name: 'Sanitize', unit: '%', base: 8, cap: 50, about: 'Gives each Encrypt, Scramble or Replicate against you a chance to fail, up to 50%.' },
  restore: { side: 'hacker', group: 'survival', name: 'Restore', unit: '%', base: 6, about: 'Increases every heal you cast, on yourself or a crewmate, by this percentage.' }, // Heals keep only part of the level growth (CONFIG.healLevel), and Restore makes up the rest.
  leech: { side: 'hacker', group: 'survival', name: 'Leech', unit: '', base: 1, flat: true, about: 'Heals you this much for every skill hit that deals damage. It heals your server at home and your Signal on runs.' },
  shield: { side: 'server', group: 'survival', name: 'Shield', unit: '', base: 10, flat: true, about: 'Shields your server for this much at the start of every home fight.' },
  countermeasures: { side: 'server', group: 'survival', name: 'Countermeasures', unit: '', base: 6, flat: true, about: 'Deals this much damage to a part when its attack lands on your server. It counts as a hit, so against an armored part it breaks a ◆.' },
  // Utility
  clock: { side: 'hacker', group: 'utility', name: 'Clock Speed', unit: '%', base: 8, about: 'Fills a meter every cycle. When the meter is full, all your cooldowns tick down 1 extra cycle.' },
  stealth: { side: 'hacker', group: 'utility', name: 'Stealth', unit: '%', base: 8, cap: 60, about: 'Gives each enemy part\'s first attack a chance to come 1 cycle later.' },
  sync: { side: 'hacker', group: 'utility', name: 'Sync', unit: '%', base: 4, cap: 50, about: 'Adds to the 25% chance that a cycle opens a Sync Window.' },
  scavenge: { side: 'hacker', group: 'utility', name: 'Scavenge', unit: '%', base: 8, about: 'Makes items drop more often and at better rarity, and increases the credits from caches you bank.' },
  lead: { side: 'server', group: 'utility', name: 'Lead', unit: '', base: 5, flat: true, about: 'Increases the lead every home or rogue-server kill gives by this much.' },
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
  clock: 'Clockrate', leech: 'Leech', stealth: 'Cloak', signal: 'Relay', regen: 'Self-repair', restore: 'Restore Point', reduction: 'Hardening',
  evasion: 'Jitter', sanitize: 'Sanitizer', scavenge: 'Scavenger', sync: 'Phaselock',
};

// Base items: seven per slot (the Implant three), a tier every few levels. The last two, at 34 and 42,
// each give about 1.4 times what the tier before gives at their level, so a new base is a moment. Primary stats at the tier's own level
// (Damage as a range), scaled by item level from there. See the items design doc.
export const BASES = {
  'proof-of-concept': { slot: 'exploit', name: 'Proof of Concept', level: 1, primary: { damage: [5, 7] }, flavour: 'Works on the third try.' },
  'weaponized-exploit': { slot: 'exploit', name: 'Weaponized Exploit', level: 5, primary: { damage: [9, 12] }, flavour: "Somebody else's research, your target." },
  'exploit-chain': { slot: 'exploit', name: 'Exploit Chain', level: 11, primary: { damage: [15, 19] }, flavour: 'Three bugs, one door.' },
  'zero-click': { slot: 'exploit', name: 'Zero-click', level: 18, primary: { damage: [22, 28] }, flavour: 'They never touch a thing.' },
  wormable: { slot: 'exploit', name: 'Wormable', level: 26, primary: { damage: [32, 40] }, flavour: 'Hit one box, hit them all.' },
  'sandbox-escape': { slot: 'exploit', name: 'Sandbox Escape', level: 34, primary: { damage: [52, 65] }, flavour: 'The walls were only ever a suggestion.' },
  'hypervisor-escape': { slot: 'exploit', name: 'Hypervisor Escape', level: 42, primary: { damage: [83, 104] }, flavour: 'Out of the guest. Into the host. Into all of them.' },
  'open-proxy': { slot: 'proxy', name: 'Open Proxy', level: 1, primary: { signal: 25, reduction: 1 }, flavour: 'Left open by someone who should know better.' },
  'socks-tunnel': { slot: 'proxy', name: 'SOCKS Tunnel', level: 5, primary: { signal: 45, reduction: 1 }, flavour: 'Everything goes through one quiet hole.' },
  'vpn-cascade': { slot: 'proxy', name: 'VPN Cascade', level: 11, primary: { signal: 70, reduction: 2 }, flavour: "Three countries before you're anywhere." },
  'onion-circuit': { slot: 'proxy', name: 'Onion Circuit', level: 18, primary: { signal: 100, reduction: 3 }, flavour: 'Layer on layer. Nobody sees the middle.' },
  mixnet: { slot: 'proxy', name: 'Mixnet', level: 26, primary: { signal: 140, reduction: 4 }, flavour: 'Your packets, shuffled with ten thousand others.' },
  'domain-front': { slot: 'proxy', name: 'Domain Front', level: 34, primary: { signal: 227, reduction: 6 }, flavour: 'Every request looks like it went to someone too big to block.' },
  'covert-channel': { slot: 'proxy', name: 'Covert Channel', level: 42, primary: { signal: 362, reduction: 10 }, flavour: 'Hidden in the timing between packets nobody reads.' },
  'reverse-shell': { slot: 'shell', name: 'Reverse Shell', level: 1, primary: { signal: 12, regen: 0.5, restore: 12 }, flavour: 'It called home. You answered.' },
  'tty-upgrade': { slot: 'shell', name: 'TTY Upgrade', level: 5, primary: { signal: 22, regen: 1, restore: 16 }, flavour: 'Tab completion. History. Civilisation.' },
  'root-shell': { slot: 'shell', name: 'Root Shell', level: 11, primary: { signal: 35, regen: 1.5, restore: 20 }, flavour: '#' },
  'restricted-shell-escape': { slot: 'shell', name: 'Restricted Shell Escape', level: 18, primary: { signal: 50, regen: 2, restore: 24 }, flavour: 'They boxed you in. Cute.' },
  'ghost-shell': { slot: 'shell', name: 'Ghost Shell', level: 26, primary: { signal: 70, regen: 3, restore: 30 }, flavour: 'No process name. No parent. No logs.' },
  'ring-zero-shell': { slot: 'shell', name: 'Ring 0 Shell', level: 34, primary: { signal: 114, regen: 4.9, restore: 49 }, flavour: 'Below the kernel, nothing asks who you are.' },
  'firmware-shell': { slot: 'shell', name: 'Firmware Shell', level: 42, primary: { signal: 181, regen: 7.8, restore: 78 }, flavour: 'Reinstall the OS. It is still there.' },
  'one-liner': { slot: 'script', name: 'One-liner', level: 1, primary: { damage: 2, signal: 10, payload: 12 }, flavour: 'Pipes all the way down.' },
  'cron-job': { slot: 'script', name: 'Cron Job', level: 5, primary: { damage: 4, signal: 18, payload: 16 }, flavour: "Runs at 3 a.m. whether you're awake or not." },
  dropper: { slot: 'script', name: 'Dropper', level: 11, primary: { damage: 6, signal: 28, payload: 20 }, flavour: 'Small, polite, carries something worse.' },
  loader: { slot: 'script', name: 'Loader', level: 18, primary: { damage: 9, signal: 40, payload: 24 }, flavour: 'Unpacks in memory. Leaves nothing on disk.' },
  'polymorphic-engine': { slot: 'script', name: 'Polymorphic Engine', level: 26, primary: { damage: 13, signal: 55, payload: 30 }, flavour: 'Never the same twice.' },
  'living-off-the-land': { slot: 'script', name: 'Living off the Land', level: 34, primary: { damage: 21, signal: 89, payload: 49 }, flavour: 'Every tool it needs was already installed.' },
  'metamorphic-engine': { slot: 'script', name: 'Metamorphic Engine', level: 42, primary: { damage: 34, signal: 142, payload: 78 }, flavour: 'It rewrites itself, and the rewrite rewrites itself.' },
  implant: { slot: 'implant', name: 'Implant', level: 15, primary: { damage: 6, signal: 30 }, flavour: 'Resident. Quiet. Yours.' }, // drops and compiles from item level 15 (the first Implant slot)
  bootkit: { slot: 'implant', name: 'Bootkit', level: 34, primary: { damage: 12.5, signal: 62 }, flavour: 'Loads before anything that could notice it.' },
  'firmware-rootkit': { slot: 'implant', name: 'Firmware Rootkit', level: 42, primary: { damage: 20, signal: 100 }, flavour: 'Lives in the chip. Survives the disk.' },
};
export const PRIMARY_STATS = ['damage', 'signal', 'reduction', 'regen', 'restore', 'payload'];
// Every base's primaries × this (tuned with the monster pass, see friction.mjs).
// unique: a named unique's own listed stats (not its downside). uniqueBase: a unique's primaries are also
// the best base of its slot at its item level times this (a yellow's), and it keeps whichever is higher.
export const ITEM_SCALE = { primary: 0.42, unique: 0.5, uniqueBase: 1.2 };
// The best base of a slot at an item level (the highest tier unlocked).
export const baseFor = (slot, level) => Object.entries(BASES).filter(([, b]) => b.slot === slot && !b.uniqueOnly && b.level <= Math.max(1, level)).sort((a, b) => b[1].level - a[1].level)[0]?.[0] || null;

// Affixes: secondaries. A prefix adds offense, a suffix defense or utility. Value at item level 1
// and 20 (linear between, on past 20). `from`: the item level it can first roll at.
export const AFFIXES = {
  weaponized: { kind: 'prefix', name: 'Weaponized', stat: 'damage', lo: 1, hi: 4, from: 1 },
  precise: { kind: 'prefix', name: 'Precise', stat: 'crit', lo: 3, hi: 5, from: 1 },
  calibrated: { kind: 'prefix', name: 'Calibrated', stat: 'accuracy', lo: 3, hi: 5, from: 1 },
  loaded: { kind: 'prefix', name: 'Loaded', stat: 'payload', lo: 4, hi: 10, from: 3 }, // Payload is a percentage. It lands on every helper hit and burn tick.
  multithreaded: { kind: 'prefix', name: 'Multithreaded', stat: 'clock', lo: 6, hi: 10, from: 6 },
  brutal: { kind: 'prefix', name: 'Brutal', stat: 'critDamage', lo: 4, hi: 10, from: 8 },
  recursive: { kind: 'prefix', name: 'Recursive', stat: 'echo', lo: 4, hi: 8, from: 10 },
  bunker: { kind: 'suffix', name: 'of the Bunker', stat: 'signal', lo: 6, hi: 20, from: 1 },
  mending: { kind: 'suffix', name: 'of Mending', stat: 'regen', lo: 0.3, hi: 1, from: 1 },
  restoration: { kind: 'suffix', name: 'of Restoration', stat: 'restore', lo: 4, hi: 10, from: 3 }, // Restore is a percentage. It lands on every heal you cast.
  scavenger: { kind: 'suffix', name: 'of the Scavenger', stat: 'scavenge', lo: 6, hi: 12, from: 1 },
  ghost: { kind: 'suffix', name: 'of the Ghost', stat: 'evasion', lo: 2, hi: 4, from: 3 },
  leeching: { kind: 'suffix', name: 'of Leeching', stat: 'leech', lo: 1, hi: 2, from: 5 },
  silence: { kind: 'suffix', name: 'of Silence', stat: 'stealth', lo: 6, hi: 10, from: 5 },
  beat: { kind: 'suffix', name: 'of the Beat', stat: 'sync', lo: 3, hi: 6, from: 7 },
  scrubbing: { kind: 'suffix', name: 'of Scrubbing', stat: 'sanitize', lo: 6, hi: 12, from: 8 },
};
// Rule affixes: every blue carries one minor rule and every yellow one major rule, written in the effect
// blocks uniques use (combat.mjs fxFire; content.mjs FX_WHEN, FX_IF, FX_DO). Each changes what a fight asks
// of you, most of them through the tells and the parts. value: [at item level 1, at 40], growing up to a
// quarter more past 40. of: the blue's name when it has no numeric suffix. The same rule twice in a
// loadout counts once, at its best value.
export const RULES = {
  // Minor (blues)
  'interrupt-handler': { tier: 'minor', name: 'Interrupt Handler', of: 'of Interrupts', fx: { when: 'hit', if: 'target-telling', do: 'damage%' }, value: [15, 25] },
  'signature-scan': { tier: 'minor', name: 'Signature Scan', of: 'of Signatures', fx: { when: 'hit', if: 'target-signature', do: 'damage%' }, value: [10, 20] },
  'null-deref': { tier: 'minor', name: 'Null Deref', of: 'of Pointers', fx: { when: 'hit', if: 'target-bare', do: 'damage+' }, value: [1, 6] },
  'safe-mode': { tier: 'minor', name: 'Safe Mode', of: 'of Safe Mode', fx: { when: 'struck', if: 'below-half', do: 'restore%', limit: 'fight' }, value: [3, 5] },
  'stack-canary': { tier: 'minor', name: 'Stack Canary', of: 'of Canaries', fx: { when: 'start', do: 'shield' }, value: [1, 6] },
  'exception-handler': { tier: 'minor', name: 'Exception Handler', of: 'of Exceptions', fx: { when: 'answer', do: 'shield' }, value: [1, 6] },
  'sticky-bit': { tier: 'minor', name: 'Sticky Bit', of: 'of Sticky Bits', fx: { when: 'custom', do: 'patch-slow' }, value: [1, 2] },
  'clock-skew': { tier: 'minor', name: 'Clock Skew', of: 'of Skew', fx: { when: 'hit', if: 'odd-cycle', do: 'crit%' }, value: [5, 10] },
  // Major (yellows)
  'abort-handler': { tier: 'major', name: 'Abort Handler', fx: { when: 'answer', do: 'heal' }, value: [4, 14] },
  'double-tap': { tier: 'major', name: 'Double Tap', fx: { when: 'always', do: 'tell-hits' } },
  'fork-on-break': { tier: 'major', name: 'Fork on Break', fx: { when: 'break', do: 'refund' }, value: [1, 2] },
  'daisy-chain': { tier: 'major', name: 'Daisy Chain', fx: { when: 'break', do: 'break-hit' }, value: [6, 16] },
  'read-only-mount': { tier: 'major', name: 'Read-only Mount', fx: { when: 'struck', if: 'below-half', do: 'halve', limit: 'fight' } },
  'race-window': { tier: 'major', name: 'Race Window', fx: { when: 'crit', do: 'refund-skill' } },
  'deep-inspection': { tier: 'major', name: 'Deep Inspection', fx: { when: 'hit', if: 'target-telling', do: 'damage%' }, value: [30, 45] },
  'clean-room': { tier: 'major', name: 'Clean Room', fx: { when: 'struck', do: 'crit-normal' } },
  // Skill rules (dist/skillrules.mjs): each changes how one skill of one class plays. They were drafted mods on a breach;
  // now they roll like any rule, but only when the roll names a class (rollItem's cls: the breach campaign), and only
  // that class's. text(v): the rule's sentence. patch(v): the skill's fields while a fight runs.
  aftershock: { tier: 'minor', cls: 'breaker', skill: 'crack', name: 'Aftershock', of: 'of Aftershocks', value: [5, 12], text: (v) => `Crack also deals ${v} damage to the target for each ◆ it breaks.` },
  'zero-click': { tier: 'major', cls: 'breaker', skill: 'exploit', name: 'Zero Click', value: [4, 10], text: (v) => `Exploit also deals ${v} damage to every other part, and Exposes every part for 2 cycles.` },
  backpressure: { tier: 'minor', cls: 'bastion', skill: 'rate-limit', name: 'Backpressure', of: 'of Backpressure', text: () => 'Rate Limit also delays the target\'s next attack by 1 cycle.' },
  'reflective-acl': { tier: 'major', cls: 'bastion', skill: 'firewall', name: 'Reflective ACL', value: [100, 160], text: (v) => `Deals ${v}% of a hit back to the part that dealt it when your shield absorbs that whole hit.` },
  'long-poll': { tier: 'minor', cls: 'infiltrator', skill: 'keepalive', name: 'Long Poll', of: 'of Long Polling', text: () => 'Keepalive makes every burn on the target tick once more.' },
  'viral-load': { tier: 'major', cls: 'infiltrator', skill: 'inject', name: 'Viral Load', value: [2, 6], patch: (v) => ({ grow: v }), short: (v) => `Burn 20 ×4, +${v} a tick`, text: (v) => `Inject's burn deals ${v} more damage each time it ticks.` },
  snare: { tier: 'minor', cls: 'operator', skill: 'hook', name: 'Snare', of: 'of Snares', text: () => 'Hook also delays the target\'s next attack by 1 cycle.' },
  daemonize: { tier: 'major', cls: 'operator', skill: 'deploy', name: 'Daemonize', value: [8, 14], patch: (v) => ({ helper: v, ticks: 40 }), short: (v) => `Helper: ${v} until done`, text: (v) => `Deploy's helper deals ${v} damage each cycle and stays for the rest of the fight.` },
};
// The rules a roll can carry: the general ones, and a class's skill rules when the roll names that class.
export const rulePool = (tier, cls = null) => Object.keys(RULES).filter((k) => RULES[k].tier === tier && (!RULES[k].cls || RULES[k].cls === cls));
// A rule's number at an item level (roll: 0–1, ±10%).
export const ruleValue = (id, level, roll = 0.5) => {
  const v = RULES[id]?.value;
  if (!v) return undefined;
  const t = Math.min(1.25, (Math.max(1, level) - 1) / 39);
  return Math.max(1, Math.round((v[0] + (v[1] - v[0]) * t) * (0.9 + 0.2 * roll)));
};
export const affixValue = (id, level, roll = 0.5) => {
  const a = AFFIXES[id], t = Math.max(0, (Math.max(1, level) - 1) / 19);
  const v = (a.lo + (a.hi - a.lo) * t) * (0.85 + 0.3 * roll);
  return STATS[a.stat]?.dp || Math.abs(a.hi) < 2 ? Math.round(v * 10) / 10 : Math.round(v);
};
const NAME_A = ['Ghost', 'Null', 'Black', 'Silent', 'Hollow', 'Iron', 'Glass', 'Static', 'Dead', 'Pale', 'Burnt', 'Cold', 'Feral', 'Rust', 'Neon', 'Grey'];
const NAME_B = { exploit: ['Fang', 'Needle', 'Spike', 'Wedge', 'Payload', 'Lance'], proxy: ['Veil', 'Lattice', 'Bastion', 'Shroud', 'Bulwark', 'Mesh'], shell: ['Den', 'Cradle', 'Hollow', 'Burrow', 'Root', 'Nest'], script: ['Loop', 'Hook', 'Thread', 'Whisper', 'Daemon', 'Trick'], implant: ['Seed', 'Heart', 'Core', 'Tick', 'Ghost', 'Knot'] };

// Rarity: D2 colours. `mult` scales the base's primaries; `affixes`: [min, max] numeric affixes; `rule`:
// the rule affix it carries (RULES). Protocols drop white or better: Scrap is for filters only.
export const RARITIES = {
  scrap: { name: 'Scrap', colour: 'grey', mult: 0.8, affixes: [0, 0], scrap: 1 }, // filters only (filters.mjs)
  stock: { name: 'Stock', colour: 'white', mult: 1, affixes: [0, 0], scrap: 2 },
  tuned: { name: 'Tuned', colour: 'blue', mult: 1.1, affixes: [0, 1], rule: 'minor', scrap: 3 },
  custom: { name: 'Custom', colour: 'yellow', mult: 1.2, affixes: [2, 4], rule: 'major', scrap: 5 },
  zeroday: { name: 'Zero-day', colour: 'gold', mult: 1.3, affixes: [0, 0], scrap: 10 },
  indemnified: { name: 'Indemnified', colour: 'orange', mult: 1.4, affixes: [2, 2], scrap: 10 },
};
export const RARITY_ORDER = ['scrap', 'stock', 'tuned', 'custom', 'zeroday', 'indemnified'];
// What deconstructing gives: salvage, code (the family it dropped from) and Exploits.
export const DECONSTRUCT = {
  scrap: { salvage: [1, 1], code: 0, exploit: 0 },
  stock: { salvage: [1, 2], code: 0, exploit: 0 },
  tuned: { salvage: [2, 3], code: 1, exploit: 0 },
  custom: { salvage: [5, 5], code: 2, exploit: 1 },
  zeroday: { salvage: [10, 10], code: 4, exploit: 3 },
  indemnified: { salvage: [10, 10], code: 4, exploit: 0 }, // bought with Indemnity: no Exploits back, or the store mints them
};

// Zero-day protocols: a Custom protocol plus one special effect. One of each per loadout.
// Found on runs (rarely ready-made, more often as source you bank and compile at home).
export const ZERO_DAYS = {
  rootkit: { name: 'Rootkit', effect: 'Your first hit in each fight ignores armor.' },
  'race-condition': { name: 'Race Condition', effect: 'Resets the cooldown of the first skill that misses in each fight.' },
  'buffer-overflow': { name: 'Buffer Overflow', effect: 'Makes your next hit a critical strike whenever you break a part.' },
  // Sold only by Halcyon Mutual (chase items: never found, never compiled).
  deductible: { name: 'Deductible', effect: 'The first attack that lands on you in each fight deals no damage.', chase: true, group: 'survival' },
  subrogation: { name: 'Subrogation', effect: 'When a part hits you, your next skill hit on it deals double damage.', chase: true, group: 'offense' },
  'total-loss': { name: 'Total Loss', effect: 'When you break a part, deals damage to every other part equal to 25% of the broken part\'s max Integrity. Armor absorbs it as usual, and a part this breaks sets it off again.', chase: true, group: 'offense' },
  actuarial: { name: 'Actuarial Model', effect: 'Veiled parts cannot hide their attack timers from you.', chase: true, group: 'utility' },
};
export const FOUND_ZERO_DAYS = Object.keys(ZERO_DAYS).filter((z) => !ZERO_DAYS[z].chase);

// Drops: set in play time, then turned into odds per kill with the measured pace (kills an
// hour). A blue about every 25 minutes, a yellow every two hours, a gold about every 11 hours;
// most kills drop nothing. Grindy on purpose. See the items design doc.
export const LOOT = {
  killsPerHour: 20, // measured: what the pacing bot averages (bot.mjs, about 10-18 with its waits); the System page shows yours
  // Per kill (vaults and double rolls on guards add the rest, to land near the targets:
  // a blue every 20–30 min, a yellow about two hours, a gold every 10–12 hours).
  minutes: { tuned: 36, custom: 180, zeroday: 900 },
  common: 0.65 / 6, // share of kills that drop a white (about one in nine; there are no greys)
  trophy: 200, // a strain's own unique: 1 in this many kills of that strain
  vault: { stock: 80, tuned: 16, custom: 3.5, zeroday: 0.5 }, // a vault's protocol (kit.bin), white or better
  vaultKit: 0.5, // share of vaults holding a protocol (kit.bin)
  vaultBlueprint: 0.25, // share holding a blueprint (blueprint.bp)
  vaultSource: 0.25, // share of layer-2+ vaults holding source (.src)
  rolls: { home: 1, guard: 2, pit: 2, bounty: 2 },
  depthBonus: 0.25, // per layer past the first, on blue and yellow odds
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
  if (rarity === 'scrap') rarity = 'stock'; // no grey protocols
  if (rarity === 'zeroday' && !zeroDay) rarity = 'custom'; // a random gold is a unique: see uniqueItem
  if (zeroDay) rarity = ZERO_DAYS[zeroDay].chase ? 'indemnified' : 'zeroday';
  const r = RARITIES[rarity];
  const zSlot = zeroDay ? OLD_SLOT[ZERO_DAYS[zeroDay].group] || 'script' : null;
  const slot = SLOTS[opts.slot] ? opts.slot : OLD_SLOT[opts.group] || (SLOTS[opts.group] ? opts.group : null) || zSlot || pick(rand, ['exploit', 'proxy', 'shell', 'script', ...(level >= 15 ? ['implant'] : [])]);
  const base = baseFor(slot, level) || baseFor(slot === 'implant' ? 'script' : slot, level) || 'proof-of-concept';
  const stats = primaries(base, level, r.mult, rand);
  // Affixes: at most one prefix and one suffix on a blue, up to three of each on a yellow.
  const affixes = [];
  const pool = Object.keys(AFFIXES).filter((k) => AFFIXES[k].from <= level);
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
  // Its rule: a minor one on a blue, a major one on a yellow (RULES).
  const tier = !zeroDay && r.rule;
  const rule = tier ? pick(rand, rulePool(tier, opts.cls)) : null;
  const ruleVal = rule ? ruleValue(rule, level, rand()) : undefined;
  const pre = affixes.map((a) => AFFIXES[a]).find((a) => a.kind === 'prefix'), suf = affixes.map((a) => AFFIXES[a]).find((a) => a.kind === 'suffix');
  const name = zeroDay ? ZERO_DAYS[zeroDay].name
    : rarity === 'custom' ? `${pick(rand, NAME_A)} ${pick(rand, NAME_B[slot] || NAME_B.script)}`
    : [pre?.name, BASES[base].name, suf?.name || (rule && RULES[rule].of)].filter(Boolean).join(' ');
  return { kind: 'protocol', side: 'hacker', group: slot, base, rarity, level, stats, affixes, zeroDay, unique: null, name, ...(rule ? { rule, ...(ruleVal ? { ruleValue: ruleVal } : {}) } : {}) };
}
// Which affix carries a stat (for compiling a chosen stat).
export const AFFIX_FOR = Object.fromEntries(Object.entries(AFFIXES).map(([id, a]) => [a.stat, id]));
// The stat a player chasing `chase` (a subclass's list, data.mjs SUBS) wants on their i-th protocol: the
// list in turn, one per slot. Only a rarity with affixes can carry one (a white has none).
export const chaseStat = (chase, i, rarity) => (RARITIES[rarity]?.affixes[1] && chase?.length ? chase[i % chase.length] : undefined);

// A named unique (content/items.mjs) at an item level. Each primary is the higher of two numbers: the
// best base of its slot at that level times ITEM_SCALE.uniqueBase (a yellow's), or its own listed number
// grown from its own level. So a unique keeps up with what drops beside it through its level band. A
// listed stat the base doesn't carry comes along at its own number, secondaries as written, and the
// downside in full.
export function uniqueItem(u, level, rand) {
  const L = Math.max(u.level, level || u.level);
  const k = power(L) / power(u.level);
  const stats = {};
  const q = ITEM_SCALE.unique;
  const slot = BASES[u.base]?.slot || 'script';
  const best = baseFor(slot, L) || u.base;
  const fromBase = BASES[best] ? primaries(best, L, ITEM_SCALE.uniqueBase, rand) : {};
  for (const [stat, v] of Object.entries(u.primary || {})) stats[stat] = round(stat, (Array.isArray(v) ? v[0] + (v[1] - v[0]) * rand() : v) * k * q) || 1;
  for (const [stat, v] of Object.entries(fromBase)) stats[stat] = Math.max(stats[stat] || 0, v);
  for (const [stat, v] of Object.entries(u.secondary || {})) addStats(stats, { [stat]: Math.max(STATS[stat]?.dp ? 0.1 : 1, round(stat, (Array.isArray(v) ? v[0] + (v[1] - v[0]) * rand() : v) * q)) });
  addStats(stats, u.downside);
  return { kind: 'protocol', side: 'hacker', group: slot, base: best, rarity: 'zeroday', level: L, stats, affixes: [], zeroDay: null, unique: u.id, name: u.name };
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
// No ports: every service you hold the blueprint for can run (there are four). What each version costs and takes (real time: 15 minutes, an hour, four hours). v2 needs
// server level 10, v3 level 25. Salvage is any salvage (what deconstructing items gives).
// Economy pass: a v1 is about 10 minutes of income at level 5, a v2 about half an hour at 15.
export const VERSIONS = [
  { v: 1, code: 12, exploit: 0, credits: 120, salvage: 6, minutes: 15, needs: 1 },
  { v: 2, code: 40, exploit: 1, credits: 600, salvage: 15, minutes: 60, needs: 10 },
  { v: 3, code: 100, exploit: 3, credits: 2000, salvage: 40, minutes: 240, needs: 25 },
];
// One rule per service. `stat`/`values`: what it adds per version (see serviceValue).
// `code`: which code it's built from.
// The home fight belongs to the wall now: what the Filter Bay, RAID Array, Hardened Kernel, Scrubber,
// Hot-patcher and Counter-intrusion did comes from the firewall's tiers and its filters (firewall.mjs
// TIER_PERKS, filters.mjs FILTER_STATS), and Cron Job and Snapshot are daemons (data.mjs DAEMONS).
// Old saves: progression.mjs (v34).
export const SERVICES = {
  uplink: { name: 'Route Logger', code: 'cipher', stat: 'routeBoost', values: [25, 50, 75], unit: '% more from route files', about: 'Route files, trace records, injectors and log sweeps trace further, so you find the next layer sooner.' },
  buildfarm: { name: 'Build Farm', code: 'kernel', stat: 'compileDiscount', values: [15, 25, 35], unit: '% off compiling', about: 'Compiling protocols costs less.' },
  router: { name: 'Edge Router', code: 'worm', stat: 'bandwidth', values: [1, 2, 3], unit: ' outpost slots', about: 'Run more outposts at once.' },
  scheduler: { name: 'Scheduler', code: 'kernel', stat: 'scheduler', values: [60, 30, 15], unit: '-minute collection', about: 'Collects every outpost on a timer, so you never have to visit.' },
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

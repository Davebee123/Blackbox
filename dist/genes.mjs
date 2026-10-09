// The gene library (docs/genome.md). A virus is a body (its family) plus genes, and a crew wrote it (authors.mjs).
// Every family, strain, third part, mutation, tell and guard rule in the game is a gene here, so the codex, `scan`
// and the compatibility rules read one shape. This module is data with no imports: data.mjs builds viruses from it.
//
// A gene:
//   name, adj     its name, and the adjective a virus named for it takes (WARDED CRYPTJACK)
//   cat           attack (what a part does when its attack lands), part (a part whose life or death changes a
//                 rule), defence (how a part takes damage), rule (a whole-virus modifier), tell (a move announced
//                 on the timeline; tells.mjs)
//   axis, role    the habit of yours it punishes (AXES), as the primary punishment there or an amplifier
//   beat          'global' (it punishes every direct hit on its cycle) or 'part' (a beat on one part), or none
//   cost, opens   its weight in budget points (1 light to 3 heavy) and the lowest virus level that brings it
//   does, telegraph, answer, implicit   what it does, how you see it coming, what answers it, and the line an
//                 item would carry from it (phase 2: implicits)
//   suits         the bodies and authors that write it (a signature gene of an author in authors.mjs)
//   decode        how the codex decodes it: 'part' (break a part that carries it), 'tell' (read it), 'kills'
//                 (beat two viruses that carry it)
//   carried(p)    true for a part (a built part, or its spec) that carries it
//   parts         a third part's spec, by family (data.mjs FAMILIES pulls them into their pools)
//   mutation      a passive rule a wild virus rolls as its mutation (data.mjs MUTATIONS)
//   bot           how the planner answers it (planner.mjs, tells.mjs): focus, quiet, strip, window, delay, switch
//   counter       the gene ACTUARY brings when this one is beaten often (phase 5)
// New genes (Exfiltrate, SYN Flood, Front End…) join this table with the same shape. Breach nodes roll genomes from
// these (rollGenome, below): their third parts and mutations, from the author's toolkit by the budget (budgetFor).

// icon: its glyph (glyphs.mjs); colour: its chips' colour.
export const AXES = {
  burst: { name: 'Burst', punishes: 'standing in front of big hits', icon: 'damage', colour: '#ff5b3d' },
  attrition: { name: 'Attrition', punishes: 'letting damage build up over time', icon: 'burn', colour: '#ff9f43' },
  feedback: { name: 'Feedback', punishes: 'firing a direct hit at the wrong time', icon: 'mirror', colour: '#b8a6ff' },
  tempo: { name: 'Tempo', punishes: 'leaning on cooldowns and long skills', icon: 'sync', colour: '#6fb6ff' },
  sustain: { name: 'Sustain', punishes: 'slow kills', icon: 'payload', colour: '#7bd389' },
  shell: { name: 'Shell', punishes: 'single big hits on one part', icon: 'shield', colour: '#f1b92f' },
  order: { name: 'Order', punishes: 'killing parts in the wrong order', icon: 'pipeline', colour: '#e07bd0' },
  clock: { name: 'Clock', punishes: 'long fights', icon: 'clock', colour: '#ffd85c' },
  fog: { name: 'Fog', punishes: 'not knowing what is coming', icon: 'stealth', colour: '#9fb0c8' },
  swarm: { name: 'Swarm', punishes: 'ignoring adds', icon: 'spider', colour: '#8fd46b' },
  pierce: { name: 'Pierce', punishes: 'stacking shields, ◆ and heals', icon: 'spike', colour: '#7fd1c7' },
};
// icon: the glyph a gene you haven't seen shows (??? and its category: so you know it's a part behaviour, say).
export const CATS = {
  attack: { name: 'Attack types', one: 'attack type', icon: 'hit' },
  part: { name: 'Part behaviours', one: 'part behaviour', icon: 'module' },
  defence: { name: 'Defences', one: 'defence', icon: 'reduction' },
  rule: { name: 'Passive rules', one: 'passive rule', icon: 'config' },
  tell: { name: 'Tells', one: 'tell', icon: 'signal' },
};

const A = (x) => x?.attack || null;
export const GENES = {
  // ---------- attack types ----------
  surge: { name: 'Surge', adj: 'Surging', cat: 'attack', axis: 'burst', role: 'primary', cost: 1, opens: 1, decode: 'part', suits: 'Every body',
    does: 'Deals a plain heavy hit every 3 to 5 cycles.', telegraph: 'Its cell on the timeline shows the damage after your Block.', answer: 'Break or delay the part. Block, a ◆, a shield, Brace, Bulkhead and Throttle soften the hit.',
    implicit: 'Deals more damage to its family\'s parts and takes less from them.', carried: () => false }, // the plain hit: partGenes gives it to a damage part that carries nothing else
  encrypt: { name: 'Encrypt', adj: 'Encrypting', cat: 'attack', axis: 'attrition', role: 'primary', cost: 3, opens: 1, decode: 'part', suits: 'Ransomware, TOLLGATE',
    does: 'Adds a stack of encryption that damages you every cycle until its part breaks.', telegraph: 'Its cell on the timeline, then an Encrypted status on you.', answer: 'Break the Encryptor. Purge, Scrub and Rollback clear the encryption, and a ◆ stops one Encrypt.',
    implicit: 'Encryption on you stacks slower.', carried: (p) => A(p)?.effect === 'encrypt', counter: 'badsectors' },
  replicate: { name: 'Replicate', adj: 'Replicating', cat: 'attack', axis: 'swarm', role: 'primary', cost: 3, opens: 1, decode: 'part', suits: 'Worm, the Crawler, SWARMLINE',
    does: 'Spawns a fragment that gnaws you every cycle, up to 3 at once.', telegraph: 'Its cell on the timeline, then fragments on the board.', answer: 'Clear fragments with Fork Bomb, Garbage Collect, Multicast, DMZ or Spike, or break the Replicator.',
    implicit: 'More damage on fragments and adds.', carried: (p) => A(p)?.effect === 'replicate' && !p.overrun, counter: 'c2' },
  scramble: { name: 'Scramble', adj: 'Scrambling', cat: 'attack', axis: 'feedback', role: 'primary', cost: 3, opens: 1, decode: 'part', suits: 'Ghostroot, PALEMASK',
    does: 'Hits you, then Scrambles you for 2 cycles. While you are Scrambled, each of your attacks may hit you instead, at half damage.', telegraph: 'Its cell on the timeline, then a Scrambled status on you.', answer: 'Scrub cleanses it, and a ◆ stops it. While you are Scrambled, fire quiet commands.',
    implicit: 'Scrambled hits on you deal less.', carried: (p) => A(p)?.effect === 'scramble', bot: { quiet: 'scrambled' } },
  floodramp: { name: 'Flood ramp', adj: 'Flooding', cat: 'attack', axis: 'attrition', role: 'primary', cost: 3, opens: 6, decode: 'part', suits: 'Worm, SWARMLINE (the Floodgate)',
    does: 'Attacks every cycle, dealing 1 more damage each time. Any delay resets it.', telegraph: 'A cell on every cycle, its number climbing.', answer: 'Delay it with Suspend, Quarantine, Jam, Spoofed ACK or the Stall daemon, or break the Flooder, which has no armor.',
    implicit: 'Ramping attacks on you grow slower.', carried: (p) => !!A(p)?.ramp, bot: { delay: true } },
  siphon: { name: 'Siphon', adj: 'Siphoning', cat: 'attack', axis: 'sustain', role: 'primary', cost: 3, opens: 8, decode: 'part', suits: 'Worm, SWARMLINE (the Leech)',
    does: 'Heals the most damaged part for the damage its hit deals, and removes one burn from that part.', telegraph: 'Its cell on the timeline, marked siphon.', answer: 'Shields, Block and Throttle shrink the hit, and with it the heal. Implant keeps a part from being healed. Or break the part.',
    implicit: 'Heals a virus part gets are smaller.', carried: (p) => !!A(p)?.siphon, counter: 'antivirussweep' },
  mend: { name: 'Mend', adj: 'Mending', cat: 'attack', axis: 'sustain', role: 'primary', cost: 3, opens: 3, decode: 'part', suits: 'Worm, SWARMLINE (the Patchwork)',
    does: 'Heals the most damaged part every 3 cycles.', telegraph: 'Its cell on the timeline, marked heal.', answer: 'Break the mender first, delay it, or burst a part down between heals. Implant and Cache Poison spoil the heal.',
    implicit: 'Heals a virus part gets are smaller.', carried: (p) => A(p)?.effect === 'heal', counter: 'antivirussweep' },
  deadline: { name: 'Deadline', adj: 'Extorting', cat: 'attack', axis: 'burst', role: 'primary', cost: 2, opens: 6, decode: 'part', suits: 'Ransomware, TOLLGATE (the Extortion)',
    does: 'Winds up a big hit. Dealing enough damage to its part in the 2 cycles before it lands calls it off.', telegraph: 'Its cell shows the threshold and the damage you have dealt.', answer: 'Burst the part, or burn it, during the window.',
    implicit: 'Damage you deal counts more toward wind-up thresholds.', carried: (p) => !!A(p)?.windup },
  escalation: { name: 'Escalation', adj: 'Escalating', cat: 'attack', axis: 'clock', role: 'primary', cost: 2, opens: 1, decode: 'part', suits: 'ICE, Kestrel (the Tracer)',
    does: 'Its attack deals more damage every cycle the fight goes on.', telegraph: 'The number on its cell climbs.', answer: 'Break its part early.',
    implicit: 'Attacks that grow with time grow slower on you.', carried: (p) => !!A(p)?.grow },
  hivebrood: { name: 'Hive brood', adj: 'Brooding', cat: 'attack', axis: 'swarm', role: 'primary', cost: 3, opens: 11, decode: 'part', suits: 'Worm, SWARMLINE (the Overrun)',
    does: 'Spawns fragments whose bite deals 1 more damage every cycle they live.', telegraph: 'Its cell on the timeline, and each fragment\'s bite on its row.', answer: 'Clear fragments young, or break the Hive.',
    implicit: 'More damage on fragments and adds.', carried: (p) => !!p.overrun },

  // ---------- part behaviours ----------
  ward: { name: 'Ward', adj: 'Warded', cat: 'part', axis: 'shell', role: 'primary', cost: 2, opens: 3, decode: 'part', suits: 'Ransomware, TOLLGATE',
    does: 'While it lives, its partner loses at most 25% of its max Integrity each cycle.', telegraph: 'A warded tag on the partner shows the damage held back.', answer: 'Break the ward first, or chip the partner down under the cap. Lockpick, Keyjam, Sudo and Zero-day get through it.',
    implicit: 'Your hits get through a ward\'s cap more.', carried: (p) => !!p.ward, bot: { focus: 'first' }, counter: 'mutexlock',
    parts: { ransomware: { id: 'lockbox', name: 'Lockbox', integrity: 16, armor: 0, loot: 'Lock Pin', ward: 'encryptor', from: 3, pool: 'third' } } },
  mutexlock: { name: 'Mutex lock', adj: 'Locked', cat: 'part', axis: 'shell', role: 'primary', cost: 3, opens: 8, decode: 'part', suits: 'Ransomware, TOLLGATE',
    does: 'While the Mutex lives, its partner wears a shield of 25% of its max Integrity, which returns 4 cycles after it breaks.', telegraph: 'A lock tag on the partner, then a countdown to the relock.', answer: 'Break the Mutex, or burst through one lock. Lockpick, Thermal Throttle and Sudo get through it.',
    implicit: 'Locks take more from you.', carried: (p) => !!p.lock, bot: { focus: 'first' }, counter: 'ratecap',
    parts: { ransomware: { id: 'mutex', name: 'Mutex', integrity: 18, armor: 1, loot: 'Mutex Handle', lock: 'encryptor', from: 8, pool: 'third' } } },
  tripwire: { name: 'Tripwire', adj: 'Wired', cat: 'part', axis: 'order', role: 'primary', cost: 2, opens: 20, decode: 'part', suits: 'Ransomware, TOLLGATE',
    does: 'If it breaks while other parts live, they go loud for the rest of the fight, dealing 25% more damage and attacking 1 cycle sooner.', telegraph: 'A tripwire tag, then a loud tag on the others.', answer: 'Break it last. Quiet Wire, Logic Bomb and Sudo keep it quiet, and Throttle silences a loud part.',
    implicit: 'Loud parts hit you less.', carried: (p) => !!p.deadman, bot: { focus: 'last' }, counter: 'zipbomb',
    parts: { ransomware: { id: 'tripwire', name: 'Tripwire', integrity: 18, armor: 1, loot: 'Trip Coil', deadman: true, from: 20, pool: 'third', attack: { name: 'Ping', effect: 'damage', amount: 3, interval: 3, first: 3 } } } },
  twin: { name: 'Twin', adj: 'Twinned', cat: 'part', axis: 'order', role: 'primary', cost: 2, opens: 3, decode: 'part', suits: 'Worm, SWARMLINE',
    does: 'A twin broken while the other lives reboots at 40% Integrity 3 cycles later. It reboots only once.', telegraph: 'A Reboot chip on the board.', answer: 'Break both close together. Split Brain and Logic Bomb stop the reboot.',
    implicit: 'A twin reboots with less.', carried: (p) => !!p.twin, bot: { focus: 'together' }, counter: 'hotspare',
    parts: { worm: { id: 'mirror', name: 'Mirror', integrity: 18, armor: 1, loot: 'Mirror Shard', twin: 'replicator', from: 3, pool: 'third', attack: { name: 'Splice', effect: 'damage', amount: 3, interval: 4, first: 3 } } } },
  c2: { name: 'C2 command', adj: 'Commanded', cat: 'part', axis: 'swarm', role: 'amplifier', cost: 2, opens: 8, decode: 'part', suits: 'Worm, SWARMLINE',
    does: 'Fragments gnaw 50% harder while it lives, and all of them drop when it breaks.', telegraph: 'A commands-fragments tag.', answer: 'Break it once fragments are up.',
    implicit: 'More damage on a part that commands others.', carried: (p) => !!p.command, bot: { focus: 'first' },
    parts: { worm: { id: 'c2', name: 'C2 Node', integrity: 18, armor: 1, loot: 'C2 Beacon', command: true, from: 8, pool: 'third', attack: { name: 'Beacon', effect: 'damage', amount: 3, interval: 4, first: 3 } } } },
  decoymirror: { name: 'Decoy mirror', adj: 'Mirrored', cat: 'part', axis: 'feedback', role: 'amplifier', beat: 'global', cost: 3, opens: 4, decode: 'part', suits: 'Ghostroot, PALEMASK',
    does: 'Every 4th cycle, your commands deal no damage and 30% bounces back at you. Its timers are veiled.', telegraph: 'A Mirror chip in its column, once it is visible.', answer: 'Fire nothing direct on its beat, or break it. Mirror Maze and Sudo get through.',
    implicit: 'Bounces and mirrors hit you less.', carried: (p) => !!p.reflect, bot: { quiet: 'beat' }, counter: 'phaseshift',
    parts: { ghostroot: { id: 'decoy', name: 'Decoy', integrity: 18, armor: 1, veiled: true, loot: 'Decoy Shell', reflect: 4, from: 4, pool: 'third' } } },
  mimic: { name: 'Mimic', adj: 'Mimicking', cat: 'part', axis: 'feedback', role: 'amplifier', beat: 'global', cost: 3, opens: 8, decode: 'part', suits: 'Ghostroot, NULL CHOIR',
    does: 'Records you, and on its beat plays your command\'s direct damage back at you.', telegraph: 'Its beat chip is always on the board.', answer: 'Go quiet on its beat with a debuff, a strip, a burn, a helper, a shield or hold, or break it. Reflector, Log Wipe and Sudo also beat it.',
    implicit: 'Playback on you deals less.', carried: (p) => !!p.mimic, bot: { quiet: 'beat' }, counter: 'handshake',
    parts: { ghostroot: { id: 'mimic', name: 'Mimic', integrity: 18, armor: 1, veiled: true, loot: 'Mimic Mask', mimic: true, from: 8, pool: 'third' } } },
  keyring: { name: 'Keyring', adj: 'Keyed', cat: 'part', axis: 'shell', role: 'primary', beat: 'part', cost: 2, opens: 1, decode: 'part', suits: 'ICE, Kestrel (the Bouncer)',
    does: 'Re-arms its partner to full ◆ every 4 cycles, 3 times.', telegraph: 'A re-arm chip on the board.', answer: 'Break the partner between re-arms. Break the Keyring first only when you cannot get through the partner\'s armor before the next re-arm.',
    implicit: 'Re-armed ◆ come back one fewer.', carried: (p) => !!p.rearm, bot: { focus: 'partner' } },
  cycletax: { name: 'Cycle tax', adj: 'Taxing', cat: 'part', axis: 'tempo', role: 'primary', cost: 2, opens: 5, decode: 'part', suits: 'Ransomware, GLASSJAW (the Hashrat)',
    does: 'While it lives, your cooldowns tick down only every other cycle. Its own attack fires only once it is the last part left.', telegraph: 'A tax status on you.', answer: 'Break it. Clock Speed and skills with short cooldowns soften the tax.',
    implicit: 'Clock Speed fills faster while you\'re taxed or slowed.', carried: (p) => !!p.tax, counter: 'synflood' },

  // ---------- defences ----------
  veil: { name: 'Veil', adj: 'Veiled', cat: 'defence', axis: 'fog', role: 'primary', cost: 1, opens: 1, decode: 'part', suits: 'Ghostroot, the Sentinel, PALEMASK, NULL CHOIR',
    does: 'Its timers are hidden while it wears ◆.', telegraph: 'Grey cells and a veiled tag.', answer: 'Strip its armor or Tag it. Side Channel, Unmask and the Actuarial Model also show its timers.',
    implicit: 'Veiled timers show a cycle or two ahead anyway.', carried: (p) => !!p.veiled, counter: 'dormant' },
  phaseshift: { name: 'Phase shift', adj: 'Phasing', cat: 'defence', axis: 'feedback', role: 'primary', beat: 'part', cost: 3, opens: 4, decode: 'part', suits: 'Ghostroot, PALEMASK (the Flicker)',
    does: 'On odd cycles it is out of phase. Every hit passes through it, and 15% of your command bounces back at you.', telegraph: 'Its row greys on odd cycles.', answer: 'Hit it on even cycles.',
    implicit: 'Out-of-phase bounces deal less.', carried: (p) => !!p.phase, bot: { even: true } },
  synclock: { name: 'Sync lock', adj: 'Synced', cat: 'defence', axis: 'tempo', role: 'primary', beat: 'part', cost: 3, opens: 4, decode: 'part', suits: 'Ghostroot, NULL CHOIR (the Keylogger)',
    does: 'Only commands fired in a Sync Window hurt it, and a window opens every cycle while it lives.', telegraph: 'A Sync Window on every cycle bar.', answer: 'Fire in the window. Metronome and Logger Spool reward it.',
    implicit: 'The Sync Window is wider against it.', carried: (p) => !!p.syncOnly, bot: { window: true } },

  // ---------- passive rules ----------
  armored: { name: 'Armored', adj: 'Armored', cat: 'rule', axis: 'shell', role: 'amplifier', cost: 2, opens: 4, decode: 'kills', mutation: true, suits: 'Any body, TOLLGATE',
    does: 'Every part has 1 more ◆.', telegraph: 'An armored tag and the extra ◆.', answer: 'Break ◆ fast with Crack, Rate Limit or Fork, or go through it with Polymorph and other hits that ignore armor.',
    implicit: 'Your strips break one more ◆ on its parts now and then.', counter: 'adaptive' },
  regenerative: { name: 'Regenerative', adj: 'Regenerating', cat: 'rule', axis: 'shell', role: 'amplifier', cost: 1, opens: 4, decode: 'kills', mutation: true, suits: 'Worm, SWARMLINE',
    does: 'A part with no armor patches its ◆ back 1 cycle sooner.', telegraph: 'A regenerative tag and the patch cell.', answer: 'Strip a part only when you can finish it. Sticky Bit, Rowhammer and Bit Rot slow the patch.',
    implicit: 'Its parts patch later.' },
  hasty: { name: 'Hasty', adj: 'Hasty', cat: 'rule', axis: 'clock', role: 'primary', cost: 2, opens: 4, decode: 'kills', mutation: true, suits: 'Any body, SWARMLINE, GLASSJAW',
    does: 'Every attack comes 1 cycle sooner and repeats 1 cycle faster, but its parts have 10% less Integrity.', telegraph: 'A hasty tag.', answer: 'Race it, or delay it.',
    implicit: 'Attacks that came sooner deal less.', counter: 'ransomtimer' },
  adaptive: { name: 'Adaptive', adj: 'Adaptive', cat: 'rule', axis: 'shell', role: 'amplifier', cost: 1, opens: 4, decode: 'kills', mutation: true, suits: 'Any body, NULL CHOIR, ACTUARY',
    does: 'A part your commands hit 3 cycles in a row adapts, gaining 1 ◆ at the end of that cycle.', telegraph: 'An adapting tag shows 1 cycle ahead.', answer: 'Switch targets for a cycle, or finish it on the third hit.',
    implicit: 'Adapting needs one more cycle in a row.', bot: { switch: true } },
  linked: { name: 'Linked', adj: 'Linked', cat: 'rule', axis: 'order', role: 'amplifier', cost: 1, opens: 1, decode: 'kills', suits: 'Every v2 and v3 virus',
    does: 'When a part breaks, a third of its attack damage passes to the next surviving part.', telegraph: 'A rerouted tag shows the added damage.', answer: 'Choose your kill order.',
    implicit: 'Rerouted hits deal less of the extra.' },
  echo: { name: 'Echo', adj: 'Echoing', cat: 'rule', axis: 'attrition', role: 'primary', cost: 3, opens: 8, decode: 'part', suits: 'Ghostroot, PALEMASK (the Echo)',
    does: 'While the Echo lives, every damage attack that gets through to you repeats 1 cycle later at half damage.', telegraph: 'Echo cells on the timeline.', answer: 'Break the Echo. Shields and Block shrink what repeats.',
    implicit: 'Echoes on you deal less.', carried: (p) => !!p.echo },
  dormant: { name: 'Dormant', adj: 'Dormant', cat: 'rule', axis: 'fog', role: 'primary', cost: 2, opens: 10, decode: 'part', suits: 'Ghostroot, PALEMASK (the Sleeper)',
    does: 'Its attacks wait off the timeline until you hit it or cycle 6 begins. Then it wakes with an Alarm.', telegraph: 'A dormant tag, then WAKES in the log.', answer: 'Open with something big, or set up before it wakes.',
    implicit: 'A dormant virus\'s first attack deals less.', carried: (p) => !!A(p)?.alarm },
  rage: { name: 'Rage', adj: 'Raging', cat: 'rule', axis: 'burst', role: 'amplifier', cost: 2, opens: 9, decode: 'kills', suits: 'Ransomware, TOLLGATE (the Bricker)',
    does: 'Each part deals 30% more damage once it drops below half Integrity.', telegraph: 'The rage shows on its cell.', answer: 'Take each part from healthy to broken in one burst.',
    implicit: 'More damage on a part above half.', carried: (p) => !!p.enrage },
  keystrokedump: { name: 'Keystroke dump', adj: 'Logging', cat: 'rule', axis: 'feedback', role: 'primary', cost: 2, opens: 4, decode: 'part', suits: 'Ghostroot, NULL CHOIR (the Keylogger), LANTERN',
    does: 'Every command fired outside a Sync Window is logged. At 3 logs, the Logger\'s Dump lands the next cycle. It also Dumps every 6 cycles.', telegraph: 'The log count on the Logger, and the Dump cell.', answer: 'Fire in the window, or break the Logger.',
    implicit: 'Out-of-sync commands log only every other time.', carried: (p) => !!A(p)?.dump, bot: { window: true } },

  // ---------- tells (tells.mjs): each TELLS entry in data.mjs names its gene ----------
  overcharge: { name: 'Overcharge', adj: 'Overcharged', cat: 'tell', axis: 'burst', role: 'amplifier', cost: 1, opens: 1, decode: 'tell', suits: 'Every body, and every named build\'s own charge',
    does: 'Charges its part\'s next attack to deal much more damage.', telegraph: 'A charge chip on its part\'s row that shows NOW in its window.', answer: 'Deal a burst of damage to its part in its window, or break 2 ◆ on it, twice as much for an elite or a boss. Suspend, Jam, Spoofed ACK and Segfault also answer it, or soften the hit.',
    implicit: 'Charged hits on you deal less.' },
  fulldisk: { name: 'Full Disk', adj: 'Full', cat: 'tell', axis: 'attrition', role: 'amplifier', cost: 2, opens: 1, decode: 'tell', suits: 'Ransomware',
    does: 'Charges its Encrypt with a burst of encryption for 3 cycles.', telegraph: 'A charge chip on the Encryptor.', answer: 'Deal a burst of damage to its part in its window. If it lands, Purge, Scrub or Rollback clears the encryption.',
    implicit: 'Encryption on you stacks slower.' },
  massmailer: { name: 'Mass Mailer', adj: 'Mailing', cat: 'tell', axis: 'swarm', role: 'amplifier', cost: 2, opens: 1, decode: 'tell', suits: 'Worm, the Crawler',
    does: 'Charges its Replicate to hatch 2 fragments.', telegraph: 'A charge chip on the Replicator.', answer: 'Deal a burst of damage to its part in its window, or cast DMZ.',
    implicit: 'More damage on fragments and adds.' },
  possession: { name: 'Possession', adj: 'Possessed', cat: 'tell', axis: 'feedback', role: 'amplifier', cost: 2, opens: 1, decode: 'tell', suits: 'Ghostroot',
    does: 'Charges its Scramble to last 2 cycles longer.', telegraph: 'A charge chip on the Scrambler.', answer: 'Deal a burst of damage to its part in its window, or Scrub the Scramble off.',
    implicit: 'Scrambled hits on you deal less.' },
  batteringram: { name: 'Battering Ram', adj: 'Ramming', cat: 'tell', axis: 'burst', role: 'amplifier', cost: 2, opens: 1, decode: 'tell', suits: 'ICE (the Bouncer)',
    does: 'Charges its part\'s attack to deal much more damage. Its part wears ◆, so breaking 2 ◆ on it in its window calls it off.', telegraph: 'A charge chip that asks for 2 ◆.', answer: 'Break 2 ◆ on its part in its window.',
    implicit: 'Charged hits on you deal less.' },
  hotfix: { name: 'Hotfix', adj: 'Hotfixed', cat: 'tell', axis: 'sustain', role: 'amplifier', cost: 2, opens: 3, decode: 'tell', suits: 'Worm (the Patchwork and the Leech)',
    does: 'Charges its heal to heal far more.', telegraph: 'A charge chip on the healer.', answer: 'Deal a burst of damage to its part in its window. Implant and Cache Poison spoil the heal.',
    implicit: 'Heals a virus part gets are smaller.' },
  doubleextortion: { name: 'Double Extortion', adj: 'Extorting', cat: 'tell', axis: 'burst', role: 'amplifier', cost: 2, opens: 10, decode: 'tell', suits: 'Ransomware',
    does: 'Compiles a cast that makes every attack deal 35% more damage for 4 cycles.', telegraph: 'A Compiling… cell that shows NOW in its window.', answer: 'Interrupt it with SIGINT or two hits on its part in its window. Quarantine, Overvolt, Thermal Runaway, Hijack, Reroute, Kill Switch and IRQ Storm also interrupt it.',
    implicit: 'Casts on the virus run shorter.' },
  selfupdate: { name: 'Self-Update', adj: 'Updating', cat: 'tell', axis: 'sustain', role: 'amplifier', cost: 2, opens: 10, decode: 'tell', suits: 'Worm',
    does: 'Compiles a cast that grows every part\'s Integrity by 25%.', telegraph: 'A Compiling… cell.', answer: 'Interrupt it the same way as Double Extortion.',
    implicit: 'Casts on the virus run shorter.' },
  persistence: { name: 'Persistence', adj: 'Persistent', cat: 'tell', axis: 'clock', role: 'amplifier', cost: 2, opens: 10, decode: 'tell', suits: 'Ghostroot, every guard (as Call Home)',
    does: 'Compiles a cast that makes every attack repeat 1 cycle faster for 4 cycles.', telegraph: 'A Compiling… cell.', answer: 'Interrupt it the same way as Double Extortion.',
    implicit: 'Casts on the virus run shorter.' },
  rekey: { name: 'Re-key', adj: 'Re-keyed', cat: 'tell', axis: 'shell', role: 'amplifier', cost: 2, opens: 6, decode: 'tell', suits: 'Elites, bosses and the Sentinel',
    does: 'If its part still wears ◆ when the seal lands, it re-arms to full with 1 more ◆, and every stripped part gets 1 ◆ back.', telegraph: 'A Sealing cell.', answer: 'Strip its part before it lands. Bit Rot, Cache Poison and Write Blocker also beat it.',
    implicit: 'Seals that land leave more of your ◆ and shield.', bot: { strip: true } },
};
for (const [id, g] of Object.entries(GENES)) { g.id = id; g.beat ||= null; g.bot ||= null; }
export const GENE_IDS = Object.keys(GENES);

// The genes a part carries: what its spec or its flags say, and Surge for a plain damage attacker that carries
// nothing else. Genes that sit on a part beside its attack (Veil, Rage) come with it.
const SHARED = ['veil', 'rage'];
export function partGenes(p) {
  if (!p || p.kind === 'fragment') return [];
  const out = GENE_IDS.filter((id) => GENES[id].carried?.(p));
  const own = out.filter((id) => !SHARED.includes(id)); // a Tripwire's Ping or a Mirror's Splice belongs to its gene
  if (!own.length && A(p)?.effect === 'damage') out.unshift('surge');
  return out;
}

// ---------- the compatibility rules (docs/genome.md 5.3) ----------
// Hard exclusions, on top of the rules (some name genes that phase 3 brings).
export const EXCLUDE = [['synclock', 'clockglitch'], ['twin', 'hotspare'], ['dormant', 'honeypot']];
export const NO_BOSS = ['ransomtimer'];
// Global beats may cover at most one cycle in this many.
export const BEAT_SPAN = 4;
// Rules 1 and 2 on a genome (gene ids, duplicates allowed: a second Decoy is a second beat), and the hard
// exclusions. Tells don't count toward rule 1 (the designer's decision: the tell system keeps them apart). Burst is
// exempt from rule 1 (the spike cap bounds it). Returns the broken rules as sentences, or [] when it's legal.
export function compatible(genes, { boss = false } = {}) {
  const out = [], list = genes.filter((id) => GENES[id]);
  const axes = {};
  for (const id of list) {
    const g = GENES[id];
    if (g.cat === 'tell' || g.axis === 'burst') continue;
    (axes[g.axis] ||= { primary: 0, amplifier: 0, ids: [] })[g.role]++;
    axes[g.axis].ids.push(g.name);
  }
  for (const [axis, n] of Object.entries(axes)) if (n.primary > 1 || n.amplifier > 1) out.push(`It carries ${n.ids.join(', ')} on ${AXES[axis].name}, where one punishment and one amplifier are allowed.`);
  const beats = list.filter((id) => GENES[id].beat);
  if (beats.length > 1) out.push(`It carries ${beats.length} beats (${beats.map((id) => GENES[id].name).join(', ')}), where one is allowed.`);
  for (const [a, b] of EXCLUDE) if (genes.includes(a) && genes.includes(b)) out.push(`${GENES[a]?.name || a} never rolls with ${GENES[b]?.name || b}.`);
  if (boss) for (const id of NO_BOSS) if (genes.includes(id)) out.push(`${GENES[id]?.name || id} never goes on a boss.`);
  return out;
}

// ---------- the budget (docs/genome.md 5.1), for phase 3's rolled genes ----------
// Points a wild virus spends on rolled genes at a level and grade. The body and its tells are free. Breach nodes roll
// by it (rollGenome); the old game's wild viruses still roll one third part or strain and maybe one mutation (data.mjs).
export const BUDGET = { wild: [[1, 0], [4, 2], [8, 4], [13, 5], [17, 6], [25, 7], [33, 8]], grade: { 2: 1, 3: 2 }, elite: 3, champion: 2 };
export function budgetFor(level, { grade = 1, elite = false, champion = false } = {}) {
  const base = BUDGET.wild.reduce((n, [L, pts]) => (level >= L ? pts : n), 0);
  return base + (BUDGET.grade[grade] || 0) + (elite ? BUDGET.elite : 0) + (champion ? BUDGET.champion : 0);
}

// ---------- the roll (docs/genome.md 5.2), for breach nodes (breach.mjs) ----------
// How many genes a wild virus rolls at a level (an elite one more), and how many of them may be mutations (rule
// genes): one on a wild virus, two on an elite (the designer's cap). A third part is a gene too, and a body has room
// for one.
export const GENE_COUNT = [[1, 0], [4, 1], [8, 2], [25, 3]];
export const MUTATION_CAP = { wild: 1, elite: 2 };
// Weights by author: a signature gene 3, the rest of its toolkit 1, anything else 0.1 (any author can surprise you).
export const ROLL_WEIGHT = { signature: 3, toolkit: 1, other: 0.1 };
// Roll a genome: gene ids drawn by weight from the genes open at the level that fit the budget, struck when they break
// a compatibility rule (eight tries a draw), until the count or the budget runs out. Rolled genes today are the
// third parts a body can grow (genes.mjs parts) and the mutations (mutation: true): every one is wired in play.
//   rand        the roll's own stream (so it never moves the game's other dice)
//   family      the body: only its third parts can roll; core, its body's genes (for the compatibility rules)
//   signature, toolkit   the author's (authors.mjs)
//   elite       +3 points, one more gene, two mutations; bonus: points on top (Testbed)
//   known       a set of gene ids: roll only these (Sinkhole: genes you've decoded)
export function rollGenome({ rand, level, family, core = [], signature = [], toolkit = [], elite = false, bonus = 0, known = null } = {}) {
  let budget = budgetFor(level, { elite }) + bonus;
  const count = GENE_COUNT.reduce((n, [L, k]) => (level >= L ? k : n), 0) + (elite && level >= 4 ? 1 : 0);
  const cap = elite ? MUTATION_CAP.elite : MUTATION_CAP.wild;
  const weight = (id) => (signature.includes(id) ? ROLL_WEIGHT.signature : toolkit.includes(id) ? ROLL_WEIGHT.toolkit : ROLL_WEIGHT.other);
  let pool = GENE_IDS.filter((id) => { const g = GENES[id]; if (g.opens > level || (known && !known.has(id))) return false; return g.mutation || (g.parts?.[family] && (g.parts[family].from || 1) <= level); });
  const picked = [];
  while (picked.length < count && budget > 0) {
    const fits = pool.filter((id) => GENES[id].cost <= budget && !(GENES[id].parts && picked.some((x) => GENES[x].parts)) && !(GENES[id].mutation && picked.filter((x) => GENES[x].mutation).length >= cap));
    let got = null;
    for (let t = 0; t < 8 && fits.length && !got; t++) {
      const total = fits.reduce((n, id) => n + weight(id), 0);
      let x = rand() * total, id = fits[fits.length - 1];
      for (const f of fits) if ((x -= weight(f)) < 0) { id = f; break; }
      if (compatible([...core, ...picked, id]).length) { fits.splice(fits.indexOf(id), 1); pool = pool.filter((y) => y !== id); } else got = id;
    }
    if (!got) break;
    picked.push(got); budget -= GENES[got].cost; pool = pool.filter((y) => y !== got);
  }
  return picked;
}

// ---------- the sim switch (genesim.mjs) ----------
// The planner answers every gene it has a rule for. A gene in `ignore` it plays as if it weren't there: the
// per-gene version of TELL.bots.answer.
export const GENE_BOTS = { ignore: new Set() };
export const ignores = (id) => GENE_BOTS.ignore.size > 0 && GENE_BOTS.ignore.has(id);

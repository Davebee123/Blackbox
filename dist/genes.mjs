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
// New genes (Exfiltrate, SYN Flood, Front End…) join this table in phase 3 with the same shape, and wild viruses
// start rolling them from their author's toolkit by the budget (budgetFor). Until then nothing here rolls on its own.

export const AXES = {
  burst: { name: 'Burst', punishes: 'standing in front of big hits', icon: 'event-warning' },
  attrition: { name: 'Attrition', punishes: 'letting damage build up over time', icon: 'injector' },
  feedback: { name: 'Feedback', punishes: 'firing a direct hit at the wrong time', icon: 'interrupt' },
  tempo: { name: 'Tempo', punishes: 'leaning on cooldowns and long skills', icon: 'behavior' },
  sustain: { name: 'Sustain', punishes: 'slow kills', icon: 'server' },
  shell: { name: 'Shell', punishes: 'single big hits on one part', icon: 'shell-shield' },
  order: { name: 'Order', punishes: 'killing parts in the wrong order', icon: 'command' },
  clock: { name: 'Clock', punishes: 'long fights', icon: 'pulse-node' },
  fog: { name: 'Fog', punishes: 'not knowing what is coming', icon: 'scan' },
  swarm: { name: 'Swarm', punishes: 'ignoring adds', icon: 'mutation' },
  pierce: { name: 'Pierce', punishes: 'stacking shields, ◆ and heals', icon: 'expand' },
};
export const CATS = {
  attack: { name: 'Attack types', one: 'attack type' },
  part: { name: 'Part behaviours', one: 'part behaviour' },
  defence: { name: 'Defences', one: 'defence' },
  rule: { name: 'Passive rules', one: 'passive rule' },
  tell: { name: 'Tells', one: 'tell' },
};

const A = (x) => x?.attack || null;
export const GENES = {
  // ---------- attack types ----------
  surge: { name: 'Surge', adj: 'Surging', cat: 'attack', axis: 'burst', role: 'primary', cost: 1, opens: 1, decode: 'part', suits: 'Every body',
    does: 'A plain heavy hit every 3 to 5 cycles.', telegraph: 'Its cell on the timeline, with the number after your Block.', answer: 'Break or delay the part, Block, a ◆, a shield, Brace, Bulkhead or Throttle.',
    implicit: 'The family\'s bane: more damage on its parts, and less from them.', carried: () => false }, // the plain hit: partGenes gives it to a damage part that carries nothing else
  encrypt: { name: 'Encrypt', adj: 'Encrypting', cat: 'attack', axis: 'attrition', role: 'primary', cost: 3, opens: 1, decode: 'part', suits: 'Ransomware, TOLLGATE',
    does: 'Adds to a stack that hits you every cycle until its part breaks.', telegraph: 'Its cell, then an Encrypted N status.', answer: 'Break the Encryptor. Purge, Scrub or Rollback clear it, and a ◆ or Lockdown stops one Encrypt.',
    implicit: 'Encryption on you stacks slower.', carried: (p) => A(p)?.effect === 'encrypt', counter: 'badsectors' },
  replicate: { name: 'Replicate', adj: 'Replicating', cat: 'attack', axis: 'swarm', role: 'primary', cost: 3, opens: 1, decode: 'part', suits: 'Worm, the Crawler, SWARMLINE',
    does: 'Spawns a fragment, up to three, that gnaws you every cycle.', telegraph: 'Its cell, then fragments on the board.', answer: 'Fork Bomb, Garbage Collect, Multicast, DMZ, Spike on fragments, or break the Replicator.',
    implicit: 'More damage on fragments and adds.', carried: (p) => A(p)?.effect === 'replicate' && !p.overrun, counter: 'c2' },
  scramble: { name: 'Scramble', adj: 'Scrambling', cat: 'attack', axis: 'feedback', role: 'primary', cost: 3, opens: 1, decode: 'part', suits: 'Ghostroot, PALEMASK',
    does: 'A hit, then two cycles where each of your attacks may hit you instead, at half.', telegraph: 'Its cell, then Scrambled.', answer: 'Scrub, a ◆ or Lockdown, or quiet commands while scrambled.',
    implicit: 'Scrambled hits on you deal less.', carried: (p) => A(p)?.effect === 'scramble', bot: { quiet: 'scrambled' } },
  floodramp: { name: 'Flood ramp', adj: 'Flooding', cat: 'attack', axis: 'attrition', role: 'primary', cost: 3, opens: 6, decode: 'part', suits: 'Worm, SWARMLINE (the Floodgate)',
    does: 'Hits every cycle, one harder each time, and any delay resets it.', telegraph: 'Every cell, the number climbing.', answer: 'Any delay (Suspend, Quarantine, Jam, Spoofed ACK, the Stall daemon), or break the bare Flooder.',
    implicit: 'Ramping attacks on you grow slower.', carried: (p) => !!A(p)?.ramp, bot: { delay: true } },
  siphon: { name: 'Siphon', adj: 'Siphoning', cat: 'attack', axis: 'sustain', role: 'primary', cost: 3, opens: 8, decode: 'part', suits: 'Worm, SWARMLINE (the Leech)',
    does: 'Its hit heals its most damaged part by what it dealt and clears one burn there.', telegraph: 'Its cell, marked siphon.', answer: 'Shields and Block (less dealt, less healed), Throttle, Implant, or break it.',
    implicit: 'Heals a virus part gets are smaller.', carried: (p) => !!A(p)?.siphon, counter: 'antivirussweep' },
  mend: { name: 'Mend', adj: 'Mending', cat: 'attack', axis: 'sustain', role: 'primary', cost: 3, opens: 3, decode: 'part', suits: 'Worm, SWARMLINE (the Patchwork)',
    does: 'Heals the most damaged part every 3 cycles.', telegraph: 'Its cell, marked heal.', answer: 'Break the mender first, delays, Implant, Cache Poison, or burst a part between mends.',
    implicit: 'Heals a virus part gets are smaller.', carried: (p) => A(p)?.effect === 'heal', counter: 'antivirussweep' },
  deadline: { name: 'Deadline', adj: 'Extorting', cat: 'attack', axis: 'burst', role: 'primary', cost: 2, opens: 6, decode: 'part', suits: 'Ransomware, TOLLGATE (the Extortion)',
    does: 'A big hit that winds up. Deal enough damage to its part in the 2 cycles before it lands and it\'s called off.', telegraph: 'Its cell shows the threshold and what you\'ve dealt.', answer: 'Burst or burns on the part in the window.',
    implicit: 'Damage you deal counts more toward wind-up thresholds.', carried: (p) => !!A(p)?.windup },
  escalation: { name: 'Escalation', adj: 'Escalating', cat: 'attack', axis: 'clock', role: 'primary', cost: 2, opens: 1, decode: 'part', suits: 'ICE, Kestrel (the Tracer)',
    does: 'Its attack hits harder every cycle the fight goes on.', telegraph: 'The number climbing on its cell.', answer: 'Kill its part early.',
    implicit: 'Attacks that grow with time grow slower on you.', carried: (p) => !!A(p)?.grow },
  hivebrood: { name: 'Hive brood', adj: 'Brooding', cat: 'attack', axis: 'swarm', role: 'primary', cost: 3, opens: 11, decode: 'part', suits: 'Worm, SWARMLINE (the Overrun)',
    does: 'Spawns fragments that bite one harder every cycle they live.', telegraph: 'Its cell, and each fragment\'s bite on its row.', answer: 'Clear fragments young, or break the Hive.',
    implicit: 'More damage on fragments and adds.', carried: (p) => !!p.overrun },

  // ---------- part behaviours ----------
  ward: { name: 'Ward', adj: 'Warded', cat: 'part', axis: 'shell', role: 'primary', cost: 2, opens: 3, decode: 'part', suits: 'Ransomware, TOLLGATE',
    does: 'While its part lives, its partner loses at most 25% of its max a cycle.', telegraph: 'warded: N held back, on the partner.', answer: 'Break the ward first, or chip under the cap. Lockpick, Keyjam, Sudo, Zero-Day.',
    implicit: 'Your hits get through a ward\'s cap more.', carried: (p) => !!p.ward, bot: { focus: 'first' }, counter: 'mutexlock',
    parts: { ransomware: { id: 'lockbox', name: 'Lockbox', integrity: 16, armor: 0, loot: 'Lock Pin', ward: 'encryptor', from: 3, pool: 'third' } } },
  mutexlock: { name: 'Mutex lock', adj: 'Locked', cat: 'part', axis: 'shell', role: 'primary', cost: 3, opens: 8, decode: 'part', suits: 'Ransomware, TOLLGATE',
    does: 'Its partner wears a shield of 25% of its max that comes back 4 cycles after it breaks, while the Mutex lives.', telegraph: 'lock N, then relocks in N.', answer: 'Break the Mutex, or burst through one lock. Lockpick, Thermal Throttle, Sudo.',
    implicit: 'Locks take more from you.', carried: (p) => !!p.lock, bot: { focus: 'first' }, counter: 'ratecap',
    parts: { ransomware: { id: 'mutex', name: 'Mutex', integrity: 18, armor: 1, loot: 'Mutex Handle', lock: 'encryptor', from: 8, pool: 'third' } } },
  tripwire: { name: 'Tripwire', adj: 'Wired', cat: 'part', axis: 'order', role: 'primary', cost: 2, opens: 20, decode: 'part', suits: 'Ransomware, TOLLGATE',
    does: 'Break it while others live and they go loud: 25% harder and a cycle sooner for the fight.', telegraph: 'A tripwire tag, then loud.', answer: 'Break it last. Quiet Wire, Logic Bomb, Sudo, Throttle on loud parts.',
    implicit: 'Loud parts hit you less.', carried: (p) => !!p.deadman, bot: { focus: 'last' }, counter: 'zipbomb',
    parts: { ransomware: { id: 'tripwire', name: 'Tripwire', integrity: 18, armor: 1, loot: 'Trip Coil', deadman: true, from: 20, pool: 'third', attack: { name: 'Ping', effect: 'damage', amount: 3, interval: 3, first: 3 } } } },
  twin: { name: 'Twin', adj: 'Twinned', cat: 'part', axis: 'order', role: 'primary', cost: 2, opens: 3, decode: 'part', suits: 'Worm, SWARMLINE',
    does: 'Break one twin alone and it reboots at 40% three cycles later, once.', telegraph: 'A Reboot chip on the board.', answer: 'Break both close together. Split Brain, Logic Bomb.',
    implicit: 'A twin reboots with less.', carried: (p) => !!p.twin, bot: { focus: 'together' }, counter: 'hotspare',
    parts: { worm: { id: 'mirror', name: 'Mirror', integrity: 18, armor: 1, loot: 'Mirror Shard', twin: 'replicator', from: 3, pool: 'third', attack: { name: 'Splice', effect: 'damage', amount: 3, interval: 4, first: 3 } } } },
  c2: { name: 'C2 command', adj: 'Commanded', cat: 'part', axis: 'swarm', role: 'amplifier', cost: 2, opens: 8, decode: 'part', suits: 'Worm, SWARMLINE',
    does: 'Fragments gnaw 50% harder while it lives, and all drop when it breaks.', telegraph: 'A commands fragments tag.', answer: 'Break it once fragments are up.',
    implicit: 'More damage on a part that commands others.', carried: (p) => !!p.command, bot: { focus: 'first' },
    parts: { worm: { id: 'c2', name: 'C2 Node', integrity: 18, armor: 1, loot: 'C2 Beacon', command: true, from: 8, pool: 'third', attack: { name: 'Beacon', effect: 'damage', amount: 3, interval: 4, first: 3 } } } },
  decoymirror: { name: 'Decoy mirror', adj: 'Mirrored', cat: 'part', axis: 'feedback', role: 'amplifier', beat: 'global', cost: 3, opens: 4, decode: 'part', suits: 'Ghostroot, PALEMASK',
    does: 'Every 4th cycle your commands do nothing and 30% bounces back. Veiled.', telegraph: 'A Mirror chip in its column once visible.', answer: 'Fire nothing direct on its beat, or break it. Mirror Maze, Sudo.',
    implicit: 'Bounces and mirrors hit you less.', carried: (p) => !!p.reflect, bot: { quiet: 'beat' }, counter: 'phaseshift',
    parts: { ghostroot: { id: 'decoy', name: 'Decoy', integrity: 18, armor: 1, veiled: true, loot: 'Decoy Shell', reflect: 4, from: 4, pool: 'third' } } },
  mimic: { name: 'Mimic', adj: 'Mimicking', cat: 'part', axis: 'feedback', role: 'amplifier', beat: 'global', cost: 3, opens: 8, decode: 'part', suits: 'Ghostroot, NULL CHOIR',
    does: 'Records you and on its beat plays your command\'s direct hit back at you.', telegraph: 'Its beat chip, always on the board.', answer: 'Go quiet on the beat (a debuff, a strip, a burn, a helper, a shield, hold), or break it. Reflector, Log Wipe, Sudo.',
    implicit: 'Playback on you deals less.', carried: (p) => !!p.mimic, bot: { quiet: 'beat' }, counter: 'handshake',
    parts: { ghostroot: { id: 'mimic', name: 'Mimic', integrity: 18, armor: 1, veiled: true, loot: 'Mimic Mask', mimic: true, from: 8, pool: 'third' } } },
  keyring: { name: 'Keyring', adj: 'Keyed', cat: 'part', axis: 'shell', role: 'primary', beat: 'part', cost: 2, opens: 1, decode: 'part', suits: 'ICE, Kestrel (the Bouncer)',
    does: 'Re-arms its partner to full ◆ every 4 cycles, three times.', telegraph: 'Re-arm on the board.', answer: 'Break the Keyring, or kill the partner between re-arms.',
    implicit: 'Re-armed ◆ come back one fewer.', carried: (p) => !!p.rearm, bot: { focus: 'first' } },
  cycletax: { name: 'Cycle tax', adj: 'Taxing', cat: 'part', axis: 'tempo', role: 'primary', cost: 2, opens: 5, decode: 'part', suits: 'Ransomware, GLASSJAW (the Hashrat)',
    does: 'While its part lives your cooldowns tick only every other cycle. Its own attack fires only when it\'s alone.', telegraph: 'A tax status on you.', answer: 'Break it, Clock Speed, short skills.',
    implicit: 'Clock Speed fills faster while you\'re taxed or slowed.', carried: (p) => !!p.tax, counter: 'synflood' },

  // ---------- defences ----------
  veil: { name: 'Veil', adj: 'Veiled', cat: 'defence', axis: 'fog', role: 'primary', cost: 1, opens: 1, decode: 'part', suits: 'Ghostroot, the Sentinel, PALEMASK, NULL CHOIR',
    does: 'Its timers are hidden while it wears ◆.', telegraph: 'Grey cells, and a veiled tag.', answer: 'Strip it, Tag it, Night Light.',
    implicit: 'Veiled timers show a cycle or two ahead anyway.', carried: (p) => !!p.veiled, counter: 'dormant' },
  phaseshift: { name: 'Phase shift', adj: 'Phasing', cat: 'defence', axis: 'feedback', role: 'primary', beat: 'part', cost: 3, opens: 4, decode: 'part', suits: 'Ghostroot, PALEMASK (the Flicker)',
    does: 'Out of phase on odd cycles: every hit passes through and 15% of your command bounces back.', telegraph: 'Its row greys on odd cycles.', answer: 'Hit it on even cycles.',
    implicit: 'Out-of-phase bounces deal less.', carried: (p) => !!p.phase, bot: { even: true } },
  synclock: { name: 'Sync lock', adj: 'Synced', cat: 'defence', axis: 'tempo', role: 'primary', beat: 'part', cost: 3, opens: 4, decode: 'part', suits: 'Ghostroot, NULL CHOIR (the Keylogger)',
    does: 'Only commands fired in a Sync Window hurt it, and a window opens every cycle while it lives.', telegraph: 'The Sync Window on every cycle bar.', answer: 'Fire in the window. Metronome, Logger Spool.',
    implicit: 'The Sync Window is wider against it.', carried: (p) => !!p.syncOnly, bot: { window: true } },

  // ---------- passive rules ----------
  armored: { name: 'Armored', adj: 'Armored', cat: 'rule', axis: 'shell', role: 'amplifier', cost: 2, opens: 4, decode: 'kills', mutation: true, suits: 'Any body, TOLLGATE',
    does: 'Every part has one more ◆.', telegraph: 'An armored tag, and the chits.', answer: 'Strippers (Crack, Rate Limit, Fork, Polymorph) and piercing hits.',
    implicit: 'Your strips break one more ◆ on its parts now and then.', counter: 'adaptive' },
  regenerative: { name: 'Regenerative', adj: 'Regenerating', cat: 'rule', axis: 'shell', role: 'amplifier', cost: 1, opens: 4, decode: 'kills', mutation: true, suits: 'Worm, SWARMLINE',
    does: 'A stripped part patches its armor a cycle sooner, so strip it only when you can finish it.', telegraph: 'A regenerative tag, and the patch cell.', answer: 'Strip only when you can finish. Sticky Bit, Rowhammer, Bit Rot.',
    implicit: 'Its parts patch later.' },
  hasty: { name: 'Hasty', adj: 'Hasty', cat: 'rule', axis: 'clock', role: 'primary', cost: 2, opens: 4, decode: 'kills', mutation: true, suits: 'Any body, SWARMLINE, GLASSJAW',
    does: 'Every attack comes a cycle sooner and repeats a cycle faster, but its parts have 10% less Integrity, so kill it fast.', telegraph: 'A hasty tag.', answer: 'Race it, or delay it.',
    implicit: 'Attacks that came sooner deal less.', counter: 'ransomtimer' },
  adaptive: { name: 'Adaptive', adj: 'Adaptive', cat: 'rule', axis: 'shell', role: 'amplifier', cost: 1, opens: 4, decode: 'kills', mutation: true, suits: 'Any body, NULL CHOIR, ACTUARY',
    does: 'A part your commands hit three cycles in a row adapts: it gains a ◆ at the end of that cycle.', telegraph: 'An adapting tag a cycle ahead.', answer: 'Switch targets for a cycle, or finish it on the third hit.',
    implicit: 'Adapting needs one more cycle in a row.', bot: { switch: true } },
  linked: { name: 'Linked', adj: 'Linked', cat: 'rule', axis: 'order', role: 'amplifier', cost: 1, opens: 1, decode: 'kills', suits: 'Every v2 and v3 virus',
    does: 'A broken part passes a third of its hit to the next survivor.', telegraph: 'A +N rerouted tag.', answer: 'Pick your kill order.',
    implicit: 'Rerouted hits deal less of the extra.' },
  echo: { name: 'Echo', adj: 'Echoing', cat: 'rule', axis: 'attrition', role: 'primary', cost: 3, opens: 8, decode: 'part', suits: 'Ghostroot, PALEMASK (the Echo)',
    does: 'Every damage attack that gets through repeats next cycle at half, while the Echo lives.', telegraph: 'Echo cells on the timeline.', answer: 'Break the Echo, shields, Block.',
    implicit: 'Echoes on you deal less.', carried: (p) => !!p.echo },
  dormant: { name: 'Dormant', adj: 'Dormant', cat: 'rule', axis: 'fog', role: 'primary', cost: 2, opens: 10, decode: 'part', suits: 'Ghostroot, PALEMASK (the Sleeper)',
    does: 'Attacks wait off the timeline until a hit or cycle 6, then wake with an Alarm.', telegraph: 'dormant, then WAKES.', answer: 'Open with something big, or set up before it wakes.',
    implicit: 'A dormant virus\'s first attack deals less.', carried: (p) => !!A(p)?.alarm },
  rage: { name: 'Rage', adj: 'Raging', cat: 'rule', axis: 'burst', role: 'amplifier', cost: 2, opens: 9, decode: 'kills', suits: 'Ransomware, TOLLGATE (the Bricker)',
    does: 'A part hits 30% harder once it\'s below half.', telegraph: 'The rage shows on its cell.', answer: 'Take a part from healthy to dead in one go.',
    implicit: 'More damage on a part above half.', carried: (p) => !!p.enrage },
  keystrokedump: { name: 'Keystroke dump', adj: 'Logging', cat: 'rule', axis: 'feedback', role: 'primary', cost: 2, opens: 4, decode: 'part', suits: 'Ghostroot, NULL CHOIR (the Keylogger), LANTERN',
    does: 'Every command fired outside a Sync Window is logged. At 3 the Logger\'s Dump lands next cycle. It also Dumps every 6.', telegraph: 'The log count on the Logger, and the Dump cell.', answer: 'Fire in the window, or break the Logger.',
    implicit: 'Out-of-sync commands log only every other time.', carried: (p) => !!A(p)?.dump, bot: { window: true } },

  // ---------- tells (tells.mjs): each TELLS entry in data.mjs names its gene ----------
  overcharge: { name: 'Overcharge', adj: 'Overcharged', cat: 'tell', axis: 'burst', role: 'amplifier', cost: 1, opens: 1, decode: 'tell', suits: 'Every body, and every named build\'s own charge',
    does: 'Its part\'s attack, much bigger.', telegraph: 'A charge chip on its part\'s row.', answer: 'Hit it (twice for an elite or boss), Suspend, Jam, Spoofed ACK, Segfault, or soften it.',
    implicit: 'Charged hits on you deal less.' },
  fulldisk: { name: 'Full Disk', adj: 'Full', cat: 'tell', axis: 'attrition', role: 'amplifier', cost: 2, opens: 1, decode: 'tell', suits: 'Ransomware',
    does: 'Its Encrypt, plus a burst of encryption for 3 cycles.', telegraph: 'A charge chip on the Encryptor.', answer: 'Hit it, then Purge, Scrub or Rollback the burst.',
    implicit: 'Encryption on you stacks slower.' },
  massmailer: { name: 'Mass Mailer', adj: 'Mailing', cat: 'tell', axis: 'swarm', role: 'amplifier', cost: 2, opens: 1, decode: 'tell', suits: 'Worm, the Crawler',
    does: 'A Replicate that hatches two.', telegraph: 'A charge chip on the Replicator.', answer: 'Hit it, or DMZ.',
    implicit: 'More damage on fragments and adds.' },
  possession: { name: 'Possession', adj: 'Possessed', cat: 'tell', axis: 'feedback', role: 'amplifier', cost: 2, opens: 1, decode: 'tell', suits: 'Ghostroot',
    does: 'A Scramble that lasts two cycles longer.', telegraph: 'A charge chip on the Scrambler.', answer: 'Hit it, or Scrub.',
    implicit: 'Scrambled hits on you deal less.' },
  batteringram: { name: 'Battering Ram', adj: 'Ramming', cat: 'tell', axis: 'burst', role: 'amplifier', cost: 2, opens: 1, decode: 'tell', suits: 'ICE (the Bouncer)',
    does: 'Its attack, much bigger. Called off by breaking ◆2 off its part, not by a hit.', telegraph: 'A charge chip that asks for a strip.', answer: 'Strip it.',
    implicit: 'Charged hits on you deal less.' },
  hotfix: { name: 'Hotfix', adj: 'Hotfixed', cat: 'tell', axis: 'sustain', role: 'amplifier', cost: 2, opens: 3, decode: 'tell', suits: 'Worm (the Patchwork and the Leech)',
    does: 'A heal, far bigger.', telegraph: 'A charge chip on the healer.', answer: 'Hit it, Implant, Cache Poison.',
    implicit: 'Heals a virus part gets are smaller.' },
  doubleextortion: { name: 'Double Extortion', adj: 'Extorting', cat: 'tell', axis: 'burst', role: 'amplifier', cost: 2, opens: 10, decode: 'tell', suits: 'Ransomware',
    does: 'Every attack hits 35% harder for 4 cycles.', telegraph: 'A Compiling… cell.', answer: 'SIGINT, two hits, Quarantine, Overvolt, Thermal Runaway, Hijack, Reroute, Kill Switch, IRQ Storm.',
    implicit: 'Casts on the virus run shorter.' },
  selfupdate: { name: 'Self-Update', adj: 'Updating', cat: 'tell', axis: 'sustain', role: 'amplifier', cost: 2, opens: 10, decode: 'tell', suits: 'Worm',
    does: 'Every part grows a quarter more Integrity.', telegraph: 'A Compiling… cell.', answer: 'As Double Extortion.',
    implicit: 'Casts on the virus run shorter.' },
  persistence: { name: 'Persistence', adj: 'Persistent', cat: 'tell', axis: 'clock', role: 'amplifier', cost: 2, opens: 10, decode: 'tell', suits: 'Ghostroot, every guard (as Call Home)',
    does: 'Every attack repeats a cycle faster for 4 cycles.', telegraph: 'A Compiling… cell.', answer: 'As Double Extortion.',
    implicit: 'Casts on the virus run shorter.' },
  rekey: { name: 'Re-key', adj: 'Re-keyed', cat: 'tell', axis: 'shell', role: 'amplifier', cost: 2, opens: 6, decode: 'tell', suits: 'Elites, bosses and the Sentinel',
    does: 'If its part still wears ◆, it re-arms with one more and stripped parts get one back.', telegraph: 'A Sealing cell.', answer: 'Strip it first, Bit Rot, Cache Poison, Write Blocker.',
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
// Points a wild virus spends on rolled genes at a level and grade. The body and its tells are free. Nothing calls
// this to roll yet: today's wild viruses still roll one third part or strain and maybe one mutation (data.mjs).
export const BUDGET = { wild: [[1, 0], [4, 2], [8, 4], [13, 5], [17, 6], [25, 7], [33, 8]], grade: { 2: 1, 3: 2 }, elite: 3, champion: 2 };
export function budgetFor(level, { grade = 1, elite = false, champion = false } = {}) {
  const base = BUDGET.wild.reduce((n, [L, pts]) => (level >= L ? pts : n), 0);
  return base + (BUDGET.grade[grade] || 0) + (elite ? BUDGET.elite : 0) + (champion ? BUDGET.champion : 0);
}

// ---------- the sim switch (genesim.mjs) ----------
// The planner answers every gene it has a rule for. A gene in `ignore` it plays as if it weren't there: the
// per-gene version of TELL.bots.answer.
export const GENE_BOTS = { ignore: new Set() };
export const ignores = (id) => GENE_BOTS.ignore.size > 0 && GENE_BOTS.ignore.has(id);

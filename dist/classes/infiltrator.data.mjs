// Infiltrator subclasses: Payload and Phantom. Data only (no engine imports): the skills they add to
// ABILITIES, and each subclass's skill line, edge and talent tree. The engine side (what new skills do,
// talents, the edge, how the planner plays them) lives in ./infiltrator.mjs.
//
// A subclass is picked at level 10 (`subclass <id>`; switching is free, at home). Its skill line unlocks
// at SUBCLASS.unlocks in data.mjs (levels 10 to 38), in the order written here (eleven skills). Run skills
// (`run`: Spoof and Tap) take no slot and come at levels of their own. Its talent tree has the same shape as
// before: three filler rows of two ranked nodes, and three tiers of two picks.
// edge.legacy: the class's old edge (EDGE in data.mjs), now this subclass's.
import { f, t } from './kit.mjs';

// New skills (ABILITIES entries, same fields as data.mjs). Give each a cls and a sub.
// Numbers that grow with your level sit in damage/tick fields (the library scales them on screen).
export const abilities = {
  // Payload: burns that spread, pile up and go off.
  wormable: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Wormable', target: 'part', damage: 0, tick: 8, ticks: 4, cooldown: 3, icon: 'mutation',
    short: 'Burn 8 ×4; spreads Inject',
    help: 'wormable <part> — Burns the target for 8 damage every cycle for 4 cycles, spreading to one more part each cycle. Your Inject on the target spreads with it.',
    desc: 'Releases a burn that finds its own way through the virus. Every cycle the original ticks, it copies itself onto a part with no Wormable on it yet, with the time it has left, and carries your Inject on the target along with it. An Inject it carries onto a part that already has one refreshes it. The copies burn but do not spread.',
  },
  skim: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Skim', target: 'part', damage: 0, tick: 9, ticks: 4, drain: 4, cooldown: 3, icon: 'clear',
    short: 'Burn 9 ×4; heals 4 a tick',
    help: 'skim <part> — Burns the target for 9 damage every cycle for 4 cycles, healing you for 4 with each tick.',
    desc: 'Skims a little off the top. Burns the target for 9 damage every cycle for 4 cycles, and each tick that deals damage heals you for 4 Signal, or 4 Integrity at home.',
  },
  polymorph: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Polymorph', target: 'part', damage: 0, tick: 14, bareTick: 14, scales: ['bareTick'], ticks: 3, cooldown: 3, icon: 'mutation',
    short: 'Burn 14 ×3, ignores ◆',
    help: 'polymorph <part> — Burns the target for 14 damage every cycle for 3 cycles, ignoring armor.',
    desc: 'Releases a burn that rewrites itself every cycle, so armor never learns to stop it. Its ticks ignore ◆. Detonate and Keepalive reach it only on a part with an ordinary burn as well, and Propagate and Backdoor do not count it. Tag, Thrash, IRQ Storm and Bloom all work on it.',
  },
  thrash: {
    cls: 'infiltrator', sub: 'payload', verb: 'debuff', name: 'Thrash', target: 'part', damage: 0, cycles: 3, cooldown: 5, icon: 'overload',
    short: 'Burns on it tick twice',
    help: 'thrash <part> — For 3 cycles, every burn on the target ticks twice per cycle, whoever applied it.',
    desc: 'Forces the target to page its own memory in and out until it chokes. For 3 cycles, every burn on it ticks twice per cycle, yours and your crew\'s alike, and the extra tick does not use up the burn.',
  },
  'irq-storm': {
    cls: 'infiltrator', sub: 'payload', verb: 'hit', name: 'IRQ Storm', target: 'none', damage: 0, cooldown: 4, icon: 'event-warning',
    short: 'Every burn ticks now',
    help: 'irq-storm — Every burn you have running ticks once immediately. Each part it reaches counts it as a hit from you, calling off a charge or counting toward interrupting a cast.',
    desc: 'Floods the virus with interrupts. Every burn you have running ticks once immediately, on every part at once, and none of them runs out any sooner. Each part the storm reaches counts it as a hit from you, so it calls off a charge winding up on a burning part, or counts toward interrupting a cast.',
  },
  fuzz: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Fuzz', target: 'part', damage: 12, tick: 8, ticks: 3, counts: 2, cooldown: 4, icon: 'event-warning',
    short: '12 + burn 8; 2 hits vs tells',
    help: 'fuzz <part> — Deals 12 damage and burns the target for 8 every cycle for 3 cycles. Its hit counts twice toward the burst that calls off a charge, and as two hits against a cast.',
    desc: 'Throws malformed input at the target until something breaks, dealing 12 damage and burning it for 8 every cycle for 3 cycles. The garbage counts as two hits against a tell, so one Fuzz interrupts a cast or calls off an elite\'s charge.',
  },
  'logic-trap': {
    cls: 'infiltrator', sub: 'payload', verb: 'shield', name: 'Logic Trap', target: 'none', damage: 0, cut: 0.5, cooldown: 6, icon: 'mutation',
    short: 'Next hit half; burns jump',
    help: 'logic-trap — The next hit against you deals half damage, and its attacker catches a copy of every burn on your target.',
    desc: 'Booby-traps your own session. The next hit against you deals half damage, and the part that landed it catches a copy of every burn you have running on your target.',
  },
  outbreak: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Outbreak', target: 'none', damage: 0, tick: 20, ticks: 4, cycles: 4, cooldown: 10, icon: 'mutation',
    short: 'Injects every part',
    help: 'outbreak — Applies Inject to every part (20 damage every cycle for 4 cycles), refreshing any already there. For 4 cycles, your burns cannot be removed.',
    desc: 'Lets it loose. Applies Inject to every part at once, refreshing an Inject already there, and for 4 cycles nothing the virus does can remove your burns. A Leech cannot feed them away, and a Patchwork cannot patch them out.',
  },
  // Phantom: crits, decoys and getting out clean.
  backstab: {
    cls: 'infiltrator', sub: 'phantom', verb: 'hit', name: 'Backstab', target: 'part', damage: 32, cooldown: 2, icon: 'behavior',
    short: '32 damage; crits busy parts',
    help: 'backstab <part> — Deals 32 damage to the target. Always critically strikes a part busy with a tell: winding up a charge, compiling a cast, sealing or recording.',
    desc: 'Strikes while the target is looking the other way, dealing 32 damage. Always critically strikes a part busy with a tell: winding up a charge, compiling a cast, sealing, or the Mimic recording. The hit counts as your answer to the tell.',
  },
  'shadow-copy': {
    cls: 'infiltrator', sub: 'phantom', verb: 'shield', name: 'Shadow Copy', target: 'none', ally: true, damage: 0, cooldown: 5, icon: 'behavior',
    short: 'A decoy takes the next hit',
    help: 'shadow-copy [name] — A decoy takes the next hit aimed at you and makes Opening usable. In a crew, can target a crewmate.',
    desc: 'Leaves a copy of your session where the virus expects you. The next attack aimed at you, or at the crewmate you name, hits the copy instead and deals no damage. While the virus is busy with the copy, Opening becomes usable.',
  },
  fingerprint: {
    cls: 'infiltrator', sub: 'phantom', verb: 'hit', name: 'Fingerprint', target: 'part', damage: 15, cooldown: 3, icon: 'weakness',
    short: '15 damage; Weak Spot fresh',
    help: 'fingerprint <part> — Deals 15 damage and refreshes Weak Spot on the target.',
    desc: 'Takes the target\'s measure, dealing 15 damage. You learn enough about it that your next hit on it is a critical strike again, as if it were the first.',
  },
  'side-channel': {
    cls: 'infiltrator', sub: 'phantom', verb: 'hit', name: 'Side Channel', target: 'part', damage: 20, pierce: true, cycles: 3, cooldown: 2, icon: 'behavior',
    short: '20 ignoring ◆; shows timer',
    help: 'side-channel <part> — Deals 20 damage to the target, ignoring armor, and reveals its attack timer for 3 cycles, even through a veil.',
    desc: 'Listens to the target\'s power draw instead of its output, dealing 20 damage and ignoring armor. For 3 cycles, you can read its attack timer, even through a veil.',
  },
  'rotate-keys': {
    cls: 'infiltrator', sub: 'phantom', verb: 'shield', name: 'Rotate Keys', target: 'none', damage: 0, cut: 0.3, hits: 2, cooldown: 6, icon: 'clear',
    short: 'Cleanse; next 2 hits −30%',
    help: 'rotate-keys — Removes encryption, Scrambled and Corrupted from you. The next 2 hits against you deal 30% less damage, and each makes Opening usable.',
    desc: 'Rotates every key you hold, removing encryption, Scrambled and Corrupted from you. The next 2 hits against you deal 30% less damage while the virus works out who you are now, and each of them makes Opening usable.',
  },
  unmask: {
    cls: 'infiltrator', sub: 'phantom', verb: 'hit', name: 'Unmask', target: 'part', damage: 26, pierce: true, cycles: 4, crit: 25, cooldown: 4, icon: 'weakness',
    short: '26 ignoring ◆; +25% crit',
    help: 'unmask <part> — Deals 26 damage to the target, ignoring armor, and unmasks it for 4 cycles. Your hits against an unmasked part have a 25% higher chance to critically strike, and its timer shows through a veil. An unmasked Decoy or Mimic cannot copy you on its next beat.',
    desc: 'Pulls the mask off the target, dealing 26 damage and ignoring armor. For 4 cycles, your hits against it have a 25% higher chance to critically strike, and its timer shows through a veil. A Decoy or Mimic you unmask has nothing of you to copy on its next beat.',
  },
  vanish: {
    cls: 'infiltrator', sub: 'phantom', verb: 'shield', name: 'Vanish', target: 'none', damage: 0, misses: 2, cooldown: 12, icon: 'behavior',
    short: 'Next 2 attacks miss',
    help: 'vanish — The next 2 attacks against you miss, and Weak Spot is refreshed on every part. Opening stays usable for 2 cycles after each miss.',
    desc: 'Drops off the network. The next 2 attacks against you miss, and every part forgets you have hit it, so Weak Spot is fresh everywhere. Each miss leaves Opening usable for 2 cycles.',
  },
  'log-wipe': {
    cls: 'infiltrator', sub: 'phantom', verb: 'buff', name: 'Log Wipe', target: 'none', damage: 0, cooldown: 6, icon: 'clear',
    short: 'Weak Spot fresh; hit half',
    help: 'log-wipe — Refreshes Weak Spot on every part, and the next hit against you deals half damage. The Mimic\'s next beat has nothing to copy.',
    desc: 'Clears every trace of you from the virus\'s logs. It forgets you have hit anything, so your next hit on each part is a critical strike again, and the next attack against you deals half damage. The Mimic\'s next beat has nothing to copy.',
  },
};

export const subs = {
  payload: {
    name: 'Payload', role: ['DPS', 'Damage over time'], idea: 'Plant it, and let it spread.', solo: 'Burns that take whole viruses apart.', crew: 'Spreads damage across every part.', lean: 'crew',
    chase: ['payload', 'crit'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { name: 'Bloom', rule: 'When a part you are burning breaks, its burns jump to the next part.' },
    skills: ['wormable', 'detonate', 'fuzz', 'implant', 'skim', 'polymorph', 'logic-trap', 'propagate', 'thrash', 'outbreak', 'irq-storm'],
    rotationCore: ['inject', 'tag', 'wormable', 'detonate'],
    presets: {
      rotation: ['inject', 'tag', 'keepalive', 'wormable', 'detonate', 'backdoor', 'fuzz', 'implant', 'thrash', 'outbreak', 'skim', 'irq-storm', 'polymorph'],
      swarm: ['inject', 'propagate', 'keepalive', 'wormable', 'detonate', 'backdoor', 'fuzz', 'logic-trap', 'thrash', 'outbreak', 'tag', 'implant', 'skim'],
    },
    layers: { core: ['inject', 'tag', 'keepalive', 'wormable', 'detonate', 'backdoor'], utility: ['fuzz', 'skim', 'logic-trap', 'irq-storm'], cooldown: ['implant', 'thrash', 'outbreak'], specialist: ['polymorph', 'propagate'] },
    tags: { polymorph: 'Armor', propagate: 'Fragments', implant: 'Healers' },
    fillers: [
      [f('heap-spray', 'Heap Spray', 'Increases the damage of each Inject tick by 3 per rank.', 3), f('persistent-tag', 'Persistent Tag', 'Increases the damage of burns on a Tagged part by 10% per rank.', 0.1)],
      [f('shaped-charge', 'Shaped Charge', 'Increases the damage of Detonate by 10% per rank.', 0.1), f('backchannel', 'Backchannel', 'Increases the damage of Backdoor by 4 per rank.', 4)],
      [f('low-profile', 'Low Profile', 'Reduces the damage you take from attacks by 3% per rank.', 0.03), f('virulence', 'Virulence', 'Increases the damage of each Wormable, Skim and Polymorph tick by 2 per rank.', 2)],
    ],
    talents: [
      [t('supercookie', 'Supercookie', 'Tag lasts 6 cycles.'), t('polymorphic', 'Long Fuse', 'Inject lasts 6 cycles.')],
      [t('contagion', 'Contagion', 'Each Inject also starts a copy of itself on the part whose attack lands soonest, or refreshes the one there.'), t('assassinate', 'Assassinate', 'Detonate deals double damage to a Tagged part.')],
      [t('superspreader', 'Superspreader', 'Bloom copies the burns to every other part, not only the next one.'), t('persistence', 'Persistence', 'Rootkit Implant can be used twice per fight.')],
    ],
  },
  phantom: {
    name: 'Phantom', role: ['DPS', 'Burst', 'Stealth runs'], idea: 'In, out, and never seen.', solo: 'Critical strikes, and the easiest runs.', crew: 'Gets the crew past guards and picks off parts.', lean: 'solo',
    chase: ['crit', 'damage'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { legacy: true, name: 'Weak Spot', rule: 'Your first hit that damages each part is a critical strike. A hit that pierces armor to get there does not count.' },
    skills: ['fingerprint', 'null-route', 'opening', 'backstab', 'side-channel', 'shadow-copy', 'rotate-keys', 'log-wipe', 'unmask', 'vanish', 'implant'],
    run: { spoof: 20, tap: 30 }, // run skills: no slot
    rotationCore: ['inject', 'backdoor', 'backstab', 'side-channel'],
    presets: {
      rotation: ['backstab', 'fingerprint', 'opening', 'side-channel', 'inject', 'backdoor', 'unmask', 'null-route', 'shadow-copy', 'vanish', 'log-wipe', 'rotate-keys', 'tag', 'keepalive'],
      evasion: ['opening', 'null-route', 'shadow-copy', 'rotate-keys', 'backstab', 'side-channel', 'inject', 'backdoor', 'unmask', 'vanish', 'fingerprint', 'log-wipe', 'tag', 'keepalive'],
    },
    layers: { core: ['backstab', 'fingerprint', 'opening', 'side-channel', 'inject', 'backdoor', 'tag', 'keepalive'], utility: ['null-route', 'shadow-copy', 'rotate-keys'], cooldown: ['log-wipe', 'vanish', 'implant'], specialist: ['unmask'] },
    tags: { unmask: 'Mimic', 'log-wipe': 'Mimic' },
    fillers: [
      [f('cold-open', 'Cold Open', 'Increases the damage of Weak Spot hits by 5% per rank.', 0.05), f('recon', 'Recon', 'Increases the damage of Opening by 5 per rank.', 5)],
      [f('pivot', 'Pivot', 'Increases the damage of Backstab by 10% per rank.', 0.1), f('onion-routing', 'Onion Routing', 'Increases your max Signal on runs by 3 per rank.', 3)],
      [f('low-profile', 'Low Profile', 'Reduces the damage you take from attacks by 3% per rank.', 0.03), f('backchannel', 'Backchannel', 'Increases the damage of Backdoor by 4 per rank.', 4)],
    ],
    talents: [
      [t('fast-hands', 'Fast Hands', 'Opening stays usable for 2 cycles.'), t('blind-spot', 'Blind Spot', 'Weak Spot also makes your first burn tick on each part a critical strike.')],
      [t('kill-chain', 'Kill Chain', 'Breaking a part resets the cooldown of Backstab and makes Opening usable.'), t('rotating-proxies', 'Rotating Proxies', 'Spoof can be used twice per run.')],
      [t('deep-cover', 'Deep Cover', 'Log Wipe also resets the cooldowns of Null Route and Shadow Copy.'), t('leaked-creds', 'Leaked Creds', 'You slip past 3 guards per run, instead of 1.')],
    ],
  },
};

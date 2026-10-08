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
  // Payload: burns that spread, stack up and go off.
  wormable: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Wormable', target: 'part', damage: 0, tick: 10, ticks: 4, cooldown: 3, icon: 'mutation',
    short: 'Burn 10 ×4, spreads',
    help: 'wormable <part> — Burns the target for 10 damage every cycle for 4 cycles. Each cycle it burns, it spreads a copy to one more part.',
    desc: 'A burn that finds its own way through the virus. Every cycle the original ticks, it copies itself onto a part that has no Wormable on it yet, with the time it has left. The copies burn but do not spread.',
  },
  skim: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Skim', target: 'part', damage: 0, tick: 9, ticks: 4, drain: 4, cooldown: 3, icon: 'clear',
    short: 'Burn 9 ×4, heals you',
    help: 'skim <part> — Burns the target for 9 damage every cycle for 4 cycles. Each tick heals you for 4.',
    desc: 'A quiet burn that skims a little off the top. Each tick that does damage pays some of it back to you as Signal (or Integrity at home).',
  },
  polymorph: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Polymorph', target: 'part', damage: 0, tick: 14, bareTick: 14, scales: ['bareTick'], ticks: 3, cooldown: 3, icon: 'mutation',
    short: 'Burn 14 ×3, through ◆',
    help: 'polymorph <part> — Burns the target for 14 damage every cycle for 3 cycles, straight through armor.',
    desc: 'A burn that rewrites itself every cycle, so armor never learns to stop it. Its ticks go straight through ◆. Detonate and Keepalive reach it only on a part with an ordinary burn as well, and Propagate and Backdoor do not count it. Tag, Thrash, IRQ Storm and Bloom all work on it.',
  },
  thrash: {
    cls: 'infiltrator', sub: 'payload', verb: 'debuff', name: 'Thrash', target: 'part', damage: 0, cycles: 3, cooldown: 5, icon: 'overload',
    short: 'Burns on it tick twice',
    help: 'thrash <part> — For 3 cycles, every burn on the target ticks twice each cycle, whoever started it.',
    desc: 'Forces the part to page its own memory in and out until it chokes. While it is Thrashing, each burn on it (yours and your crew\'s) ticks a second time every cycle, and the extra tick does not use up the burn.',
  },
  'irq-storm': {
    cls: 'infiltrator', sub: 'payload', verb: 'hit', name: 'IRQ Storm', target: 'none', damage: 0, cooldown: 4, icon: 'event-warning',
    short: 'Every burn ticks now',
    help: 'irq-storm — Every burn you have on every part ticks once more right now. Each part it reaches takes it as a hit from your command, which calls off a charge or counts toward stopping a cast.',
    desc: 'A flood of interrupts. Every burn you are running ticks one extra time, on every part at once, and none of them runs out any sooner. Each part the storm reaches takes it as a hit from you, so it calls off a charge winding up on a burning part, or counts toward stopping a cast.',
  },
  fuzz: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Fuzz', target: 'part', damage: 12, tick: 8, ticks: 3, counts: 2, cooldown: 4, icon: 'event-warning',
    short: '12 damage + burn 8, counts ×2',
    help: 'fuzz <part> — Deals 12 damage and burns the target for 8 every cycle for 3 cycles. Its hit counts twice against a tell, so it calls off an elite\'s charge or stops a cast.',
    desc: 'Throw malformed input at a part until something breaks. It takes 12 damage and burns for 8 a cycle for 3 cycles, and the garbage it sends counts twice against a tell: one Fuzz stops a cast or calls off an elite\'s charge.',
  },
  'logic-trap': {
    cls: 'infiltrator', sub: 'payload', verb: 'shield', name: 'Logic Trap', target: 'none', damage: 0, cut: 0.5, cooldown: 6, icon: 'mutation',
    short: 'Next hit half; burns jump',
    help: 'logic-trap — The next hit on you deals half damage, and the part that lands it catches a copy of every burn on your target.',
    desc: 'Booby-trap your own session. The next hit on you deals half, and the part that landed it catches a copy of every burn you have running on your target.',
  },
  outbreak: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Outbreak', target: 'none', damage: 0, tick: 12, ticks: 3, cycles: 4, cooldown: 10, icon: 'mutation',
    short: 'Injects all; burns stick',
    help: 'outbreak — Every part catches an Inject, 12 damage every cycle for 3 cycles. For 4 cycles nothing can clear your burns.',
    desc: 'Let it loose. Every part of the virus catches an Inject at once, and for 4 cycles nothing the virus does can clear your burns: a Leech can\'t feed them away and a Patchwork can\'t patch them out.',
  },
  // Phantom: crits, decoys and getting out clean.
  backstab: {
    cls: 'infiltrator', sub: 'phantom', verb: 'hit', name: 'Backstab', target: 'part', damage: 32, cooldown: 2, icon: 'behavior',
    short: '32 damage, crits a busy part',
    help: 'backstab <part> — Deals 32 damage to the target. Always a critical strike against a part busy with a tell: winding up a charge, compiling a cast, sealing or recording.',
    desc: 'Strike while it is looking the other way. A part busy with a tell (a charge winding up, a cast compiling, a seal, the Mimic recording) never sees it coming: the hit always crits, and it counts as your answer.',
  },
  'shadow-copy': {
    cls: 'infiltrator', sub: 'phantom', verb: 'shield', name: 'Shadow Copy', target: 'none', ally: true, damage: 0, cooldown: 5, icon: 'behavior',
    short: 'A decoy takes the next hit',
    help: 'shadow-copy [name] — A decoy of you takes the next hit that would land on you, and Opening lights up when it does. In a crew, shadow-copy nyx puts the decoy on nyx.',
    desc: 'Leaves a copy of your session where the virus expects you. The next attack that would hit you (or the crewmate you name) hits the copy instead and does nothing, and while it is busy with the copy, Opening lights up.',
  },
  fingerprint: {
    cls: 'infiltrator', sub: 'phantom', verb: 'hit', name: 'Fingerprint', target: 'part', damage: 15, cooldown: 3, icon: 'weakness',
    short: '15 damage, Weak Spot fresh',
    help: 'fingerprint <part> — Deals 15 damage and makes Weak Spot fresh on the target again.',
    desc: 'Take the part\'s measure. It takes 15 damage, and you have learned enough about it that your next hit on its bare code crits again, as if it were the first.',
  },
  'side-channel': {
    cls: 'infiltrator', sub: 'phantom', verb: 'hit', name: 'Side Channel', target: 'part', damage: 20, pierce: true, cycles: 3, cooldown: 2, icon: 'behavior',
    short: '20 through ◆; timer shows',
    help: 'side-channel <part> — Deals 20 damage straight through armor. The target\'s timer shows for 3 cycles, even through a veil.',
    desc: 'Listen to the part\'s power draw instead of its output. It takes 20 damage straight through armor, and for 3 cycles you can read its attack timer even through a veil.',
  },
  'rotate-keys': {
    cls: 'infiltrator', sub: 'phantom', verb: 'shield', name: 'Rotate Keys', target: 'none', damage: 0, cut: 0.3, hits: 2, cooldown: 6, icon: 'clear',
    short: 'Cleanses; next 2 hits −30%',
    help: 'rotate-keys — Clears encryption, Scrambled and Corrupted. The next 2 hits on you deal 30% less, and each one lights Opening.',
    desc: 'Rotate every key you hold. Encryption, Scrambled and Corrupted come off you, and the next 2 hits that find you land 30% lighter while the virus works out who you are now. Each of them lights Opening.',
  },
  unmask: {
    cls: 'infiltrator', sub: 'phantom', verb: 'hit', name: 'Unmask', target: 'part', damage: 26, pierce: true, cycles: 4, crit: 25, cooldown: 4, icon: 'weakness',
    short: '26 through ◆; crits +25%',
    help: 'unmask <part> — Deals 26 damage straight through armor and unmasks the target for 4 cycles. Your hits on an unmasked part have +25% crit chance, and its timer shows through a veil. A Decoy or Mimic you unmask has nothing of you to copy on its next beat.',
    desc: 'Pull the mask off a part. It takes 26 damage straight through armor, and for 4 cycles your hits on it crit 25% more often and its timer shows through a veil. A Decoy or a Mimic you unmask has nothing of you to copy on its next beat.',
  },
  vanish: {
    cls: 'infiltrator', sub: 'phantom', verb: 'shield', name: 'Vanish', target: 'none', damage: 0, misses: 2, cooldown: 12, icon: 'behavior',
    short: 'Next 2 attacks miss',
    help: 'vanish — The next 2 attacks on you miss, and Weak Spot is fresh on every part. Opening stays lit for 2 cycles after each miss.',
    desc: 'Drop off the network. The next 2 attacks on you miss, every part forgets you have hit it so Weak Spot is fresh everywhere, and each miss leaves Opening lit for 2 cycles.',
  },
  'log-wipe': {
    cls: 'infiltrator', sub: 'phantom', verb: 'buff', name: 'Log Wipe', target: 'none', damage: 0, cooldown: 6, icon: 'clear',
    short: 'Weak Spot fresh; hit half',
    help: 'log-wipe — Makes Weak Spot fresh on every part, and the next hit on you deals half damage. The Mimic\'s next beat has nothing of you to play.',
    desc: 'Clears every trace of you from the virus\'s logs. It forgets you have hit anything, so your next hit on each part crits again, and the next attack that finds you only half lands.',
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
      [f('heap-spray', 'Heap Spray', 'Increases the damage of each Inject tick by 2 per rank.', 2), f('persistent-tag', 'Persistent Tag', 'Increases the damage of burns on a Tagged part by 10% per rank.', 0.1)],
      [f('shaped-charge', 'Shaped Charge', 'Increases the damage of Detonate by 10% per rank.', 0.1), f('backchannel', 'Backchannel', 'Increases the damage of Backdoor by 4 per rank.', 4)],
      [f('low-profile', 'Low Profile', 'Reduces the damage you take from attacks by 3% per rank.', 0.03), f('virulence', 'Virulence', 'Increases the damage of each Wormable, Skim and Polymorph tick by 2 per rank.', 2)],
    ],
    talents: [
      [t('supercookie', 'Supercookie', 'Tag lasts 6 cycles.'), t('polymorphic', 'Long Fuse', 'Inject lasts 5 cycles.')],
      [t('contagion', 'Contagion', 'Each Inject also starts a copy on the part whose attack lands soonest.'), t('assassinate', 'Assassinate', 'Detonate deals double damage to a Tagged part.')],
      [t('superspreader', 'Superspreader', 'Bloom copies the burns to every other part, not just the next one.'), t('persistence', 'Persistence', 'Rootkit Implant can be used twice per fight.')],
    ],
  },
  phantom: {
    name: 'Phantom', role: ['DPS', 'Burst', 'Stealth runs'], idea: 'In, out, and never seen.', solo: 'Crits, and the easiest runs.', crew: 'Gets the crew past guards and picks off parts.', lean: 'solo',
    chase: ['crit', 'damage'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { legacy: true, name: 'Weak Spot', rule: 'Your first hit on each part\'s bare code crits (not through armor).' },
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
      [t('fast-hands', 'Fast Hands', 'Opening stays lit for 2 cycles.'), t('blind-spot', 'Blind Spot', 'Weak Spot also crits your first burn tick on each part.')],
      [t('kill-chain', 'Kill Chain', 'Breaking a part readies Backstab and lights Opening.'), t('rotating-proxies', 'Rotating Proxies', 'Spoof can be used twice per run.')],
      [t('deep-cover', 'Deep Cover', 'Log Wipe also readies Null Route and Shadow Copy.'), t('leaked-creds', 'Leaked Creds', 'You slip past 3 guards per run instead of 1.')],
    ],
  },
};

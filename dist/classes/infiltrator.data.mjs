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
    short: 'Burn 10×4, spreads',
    help: 'wormable <part> — burns it for 10 a cycle for 4 cycles. Each cycle it burns, it also spreads a copy to one more part.',
    desc: 'A burn that finds its own way through the virus. Every cycle the original ticks, it copies itself onto a part that has no Wormable on it yet, with the time it has left. The copies burn but do not spread.',
  },
  skim: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Skim', target: 'part', damage: 0, tick: 9, ticks: 4, drain: 4, cooldown: 3, icon: 'clear',
    short: 'Burn 9×4, heals 4 a tick',
    help: 'skim <part> — burns it for 9 a cycle for 4 cycles, and every tick that lands heals you 4.',
    desc: 'A quiet burn that skims a little off the top. Each tick that does damage pays some of it back to you as Signal (or Integrity at home).',
  },
  polymorph: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Polymorph', target: 'part', damage: 0, tick: 14, bareTick: 10, scales: ['bareTick'], ticks: 3, cooldown: 3, icon: 'mutation',
    short: 'Burn 14×3 thru ◆; 10 on bare',
    help: 'polymorph <part> — burns it for 14 a cycle for 3 cycles, straight through armor. Once the part is bare, it burns for 10.',
    desc: 'A burn that rewrites itself every cycle, so armor never learns to stop it. Its ticks go straight through ◆. Detonate and Keepalive reach it only on a part with an ordinary burn as well, and Propagate and Backdoor do not count it. Tag, Thrash, IRQ Storm and Bloom all work on it.',
  },
  thrash: {
    cls: 'infiltrator', sub: 'payload', verb: 'debuff', name: 'Thrash', target: 'part', damage: 0, cycles: 3, cooldown: 5, icon: 'overload',
    short: 'Burns on it tick twice',
    help: 'thrash <part> — for 3 cycles, every burn on it ticks twice a cycle, from anyone.',
    desc: 'Forces the part to page its own memory in and out until it chokes. While it is Thrashing, each burn on it (yours and your crew\'s) ticks a second time every cycle, and the extra tick does not use up the burn.',
  },
  'irq-storm': {
    cls: 'infiltrator', sub: 'payload', verb: 'hit', name: 'IRQ Storm', target: 'none', damage: 0, cooldown: 4, icon: 'event-warning',
    short: 'Every burn ticks now; hits tells',
    help: 'irq-storm — every burn you have, on every part, ticks once more right now. Each part it ticks counts it as a hit from your command: it calls a charge off, or counts toward a cast.',
    desc: 'A flood of interrupts. Every burn you are running ticks one extra time, on every part at once, and none of them runs out any sooner. Each part the storm reaches takes it as a hit from you, so it calls off a charge winding up on a burning part, or counts toward stopping a cast.',
  },
  fuzz: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Fuzz', target: 'part', damage: 12, tick: 8, ticks: 3, counts: 2, cooldown: 4, icon: 'event-warning',
    short: 'Hit 12 + burn 8×3; counts twice',
    help: 'fuzz <part> — 12 damage, and a burn of 8 a cycle for 3 cycles. Its hit counts twice against a tell: it calls off an elite\'s charge, or stops a cast.',
    desc: 'Throw malformed input at a part until something breaks. It takes 12 damage and burns for 8 a cycle for 3 cycles, and the garbage it sends counts twice against a tell: one Fuzz stops a cast or calls off an elite\'s charge.',
  },
  'logic-trap': {
    cls: 'infiltrator', sub: 'payload', verb: 'shield', name: 'Logic Trap', target: 'none', damage: 0, cut: 0.5, cooldown: 6, icon: 'mutation',
    short: 'Next hit half; its part catches your burns',
    help: 'logic-trap — the next hit on you deals half, and the part that lands it catches a copy of every burn you have on your target.',
    desc: 'Booby-trap your own session. The next hit on you deals half, and the part that landed it catches a copy of every burn you have running on your target.',
  },
  outbreak: {
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Outbreak', target: 'none', damage: 0, tick: 12, ticks: 3, cycles: 4, cooldown: 10, icon: 'mutation',
    short: 'Inject every part; burns stick',
    help: 'outbreak — every part catches an Inject (12 a cycle for 3 cycles), and for 4 cycles nothing can clear your burns.',
    desc: 'Let it loose. Every part of the virus catches an Inject at once, and for 4 cycles nothing the virus does can clear your burns: a Leech can\'t feed them away and a Patchwork can\'t patch them out.',
  },
  // Phantom: crits, decoys and getting out clean.
  backstab: {
    cls: 'infiltrator', sub: 'phantom', verb: 'hit', name: 'Backstab', target: 'part', damage: 32, cooldown: 2, icon: 'behavior',
    short: 'Hit 32, crits a busy part',
    help: 'backstab <part> — 32 damage. It always crits a part that\'s busy with a tell: winding up a charge, compiling a cast, sealing or recording.',
    desc: 'Strike while it is looking the other way. A part busy with a tell (a charge winding up, a cast compiling, a seal, the Mimic recording) never sees it coming: the hit always crits, and it counts as your answer.',
  },
  'shadow-copy': {
    cls: 'infiltrator', sub: 'phantom', verb: 'shield', name: 'Shadow Copy', target: 'none', ally: true, damage: 0, cooldown: 5, icon: 'behavior',
    short: 'A decoy takes the next hit',
    help: 'shadow-copy [name] — a decoy of you takes the next hit that would land on you, and Opening lights up when it does. In a crew, shadow-copy nyx puts the decoy on nyx.',
    desc: 'Leaves a copy of your session where the virus expects you. The next attack that would hit you (or the crewmate you name) hits the copy instead and does nothing, and while it is busy with the copy, Opening lights up.',
  },
  fingerprint: {
    cls: 'infiltrator', sub: 'phantom', verb: 'hit', name: 'Fingerprint', target: 'part', damage: 15, cooldown: 3, icon: 'weakness',
    short: 'Hit 15; Weak Spot fresh',
    help: 'fingerprint <part> — 15 damage, and Weak Spot is fresh on it again.',
    desc: 'Take the part\'s measure. It takes 15 damage, and you have learned enough about it that your next hit on its bare code crits again, as if it were the first.',
  },
  'side-channel': {
    cls: 'infiltrator', sub: 'phantom', verb: 'hit', name: 'Side Channel', target: 'part', damage: 20, pierce: true, cycles: 3, cooldown: 2, icon: 'behavior',
    short: 'Hit 20 thru ◆; timer shows',
    help: 'side-channel <part> — 20 damage straight through armor, and its timer shows for 3 cycles even if it is veiled.',
    desc: 'Listen to the part\'s power draw instead of its output. It takes 20 damage straight through armor, and for 3 cycles you can read its attack timer even through a veil.',
  },
  'rotate-keys': {
    cls: 'infiltrator', sub: 'phantom', verb: 'shield', name: 'Rotate Keys', target: 'none', damage: 0, cut: 0.3, cooldown: 6, icon: 'clear',
    short: 'Cleanse; next hit −30%',
    help: 'rotate-keys — clears encryption, Scrambled and Corrupted from you, and the next hit on you deals 30% less.',
    desc: 'Rotate every key you hold. Encryption, Scrambled and Corrupted come off you, and the next hit that finds you lands 30% lighter while the virus works out who you are now.',
  },
  unmask: {
    cls: 'infiltrator', sub: 'phantom', verb: 'hit', name: 'Unmask', target: 'part', damage: 20, cycles: 4, cooldown: 4, icon: 'weakness',
    short: 'Hit 20; veil off, no copy',
    help: 'unmask <part> — 20 damage. Its veil drops for 4 cycles, and if it is a Decoy or a Mimic it can\'t copy you on its next beat.',
    desc: 'Pull the mask off a part. It takes 20 damage and its veil drops for 4 cycles, and a Decoy or a Mimic you unmask has nothing to copy on its next beat.',
  },
  vanish: {
    cls: 'infiltrator', sub: 'phantom', verb: 'shield', name: 'Vanish', target: 'none', damage: 0, misses: 2, cooldown: 12, icon: 'behavior',
    short: 'Next 2 attacks miss; Weak Spot fresh',
    help: 'vanish — the next 2 attacks on you miss, Weak Spot is fresh on every part, and Opening stays lit for 2 cycles after each miss.',
    desc: 'Drop off the network. The next 2 attacks on you miss, every part forgets you have hit it so Weak Spot is fresh everywhere, and each miss leaves Opening lit for 2 cycles.',
  },
  'log-wipe': {
    cls: 'infiltrator', sub: 'phantom', verb: 'buff', name: 'Log Wipe', target: 'none', damage: 0, cooldown: 6, icon: 'clear',
    short: 'Weak Spot again, next hit half',
    help: 'log-wipe — wipe your tracks: Weak Spot is fresh on every part again, the next hit on you deals half, and the Mimic\'s next beat has nothing of you to play.',
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
      [f('heap-spray', 'Heap Spray', 'Inject +2 per tick per rank.', 2), f('persistent-tag', 'Persistent Tag', 'Tagged burns tick +10% more per rank.', 0.1)],
      [f('shaped-charge', 'Shaped Charge', 'Detonate deals +10% per rank.', 0.1), f('backchannel', 'Backchannel', 'Backdoor +4 damage per rank.', 4)],
      [f('low-profile', 'Low Profile', 'Take 3% less damage from attacks per rank.', 0.03), f('virulence', 'Virulence', 'Wormable, Skim and Polymorph +2 per tick per rank.', 2)],
    ],
    talents: [
      [t('supercookie', 'Supercookie', 'Tag lasts 6 cycles.'), t('polymorphic', 'Long Fuse', 'Inject lasts 5 cycles.')],
      [t('contagion', 'Contagion', 'Each Inject also starts a copy on the part whose attack lands soonest.'), t('assassinate', 'Assassinate', 'Detonate on a Tagged part deals double.')],
      [t('superspreader', 'Superspreader', 'Bloom copies the burns to every other part, not just the next one.'), t('persistence', 'Persistence', 'Rootkit Implant can be used twice a fight.')],
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
      rotation: ['backstab', 'fingerprint', 'opening', 'side-channel', 'inject', 'backdoor', 'null-route', 'shadow-copy', 'vanish', 'log-wipe', 'rotate-keys', 'tag', 'keepalive'],
      ghostroot: ['backstab', 'fingerprint', 'opening', 'side-channel', 'inject', 'backdoor', 'null-route', 'shadow-copy', 'unmask', 'rotate-keys', 'log-wipe', 'tag', 'keepalive'],
    },
    layers: { core: ['backstab', 'fingerprint', 'opening', 'side-channel', 'inject', 'backdoor', 'tag', 'keepalive'], utility: ['null-route', 'shadow-copy', 'rotate-keys'], cooldown: ['log-wipe', 'vanish', 'implant'], specialist: ['unmask'] },
    tags: { unmask: 'Mimic', 'log-wipe': 'Mimic' },
    fillers: [
      [f('cold-open', 'Cold Open', 'Weak Spot hits deal +5% per rank.', 0.05), f('recon', 'Recon', 'Opening +5 damage per rank.', 5)],
      [f('pivot', 'Pivot', 'Backstab deals +10% per rank.', 0.1), f('onion-routing', 'Onion Routing', '+3 max Signal on runs per rank.', 3)],
      [f('low-profile', 'Low Profile', 'Take 3% less damage from attacks per rank.', 0.03), f('backchannel', 'Backchannel', 'Backdoor +4 damage per rank.', 4)],
    ],
    talents: [
      [t('fast-hands', 'Fast Hands', 'Opening stays lit for 2 cycles.'), t('blind-spot', 'Blind Spot', 'Weak Spot also crits your first burn tick on each part.')],
      [t('kill-chain', 'Kill Chain', 'Breaking a part readies Backstab and lights Opening.'), t('rotating-proxies', 'Rotating Proxies', 'Spoof twice per run.')],
      [t('deep-cover', 'Deep Cover', 'Log Wipe also readies Null Route and Shadow Copy.'), t('leaked-creds', 'Leaked Creds', 'Slip past 3 guards a run instead of 1.')],
    ],
  },
};

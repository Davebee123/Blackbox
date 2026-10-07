// Infiltrator subclasses: Payload and Phantom. Data only (no engine imports): the skills they add to
// ABILITIES, and each subclass's skill line, edge and talent tree. The engine side (what new skills do,
// talents, the edge, how the planner plays them) lives in ./infiltrator.mjs.
//
// A subclass is picked at level 10 (`subclass <id>`; switching is free, at home). Its skill line unlocks
// at SUB_UNLOCKS in data.mjs, in the order written here (up to 8). Its talent tree has the same shape as
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
    cls: 'infiltrator', sub: 'payload', verb: 'burn', name: 'Polymorph', target: 'part', damage: 0, tick: 14, ticks: 3, cooldown: 3, icon: 'mutation',
    short: 'Burn 14×3 through armor',
    help: 'polymorph <part> — burns it for 14 a cycle for 3 cycles, straight through armor.',
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
    short: 'Every burn ticks now',
    help: 'irq-storm — every burn you have, on every part, ticks once more right now.',
    desc: 'A flood of interrupts. Every burn you are running ticks one extra time, on every part at once, and none of them runs out any sooner.',
  },
  // Phantom: crits, decoys and getting out clean.
  backstab: {
    cls: 'infiltrator', sub: 'phantom', verb: 'hit', name: 'Backstab', target: 'part', damage: 32, cooldown: 2, icon: 'behavior',
    short: 'Hit 32, crits if not due',
    help: 'backstab <part> — 32 damage. It crits if the part\'s attack is not due this cycle or the next.',
    desc: 'Strike while it is looking the other way. If the part has no attack landing this cycle or next, the hit always crits.',
  },
  'shadow-copy': {
    cls: 'infiltrator', sub: 'phantom', verb: 'shield', name: 'Shadow Copy', target: 'none', ally: true, damage: 0, cooldown: 5, icon: 'behavior',
    short: 'A decoy takes the next hit',
    help: 'shadow-copy [name] — a decoy of you takes the next hit that would land on you, and Opening lights up when it does. In a crew, shadow-copy nyx puts the decoy on nyx.',
    desc: 'Leaves a copy of your session where the virus expects you. The next attack that would hit you (or the crewmate you name) hits the copy instead and does nothing, and while it is busy with the copy, Opening lights up.',
  },
  'log-wipe': {
    cls: 'infiltrator', sub: 'phantom', verb: 'buff', name: 'Log Wipe', target: 'none', damage: 0, cooldown: 6, icon: 'clear',
    short: 'Weak Spot again, next hit half',
    help: 'log-wipe — wipe your tracks: Weak Spot is fresh on every part again, and the next hit on you deals half.',
    desc: 'Clears every trace of you from the virus\'s logs. It forgets you have hit anything, so your next hit on each part crits again, and the next attack that finds you only half lands.',
  },
};

export const subs = {
  payload: {
    name: 'Payload', role: ['DPS', 'Damage over time'], idea: 'Plant it, and let it spread.', solo: 'Burns that take whole viruses apart.', crew: 'Spreads damage across every part.',
    chase: ['payload', 'crit'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { name: 'Bloom', rule: 'When a part you are burning breaks, its burns jump to the next part.' },
    skills: ['wormable', 'detonate', 'implant', 'skim', 'propagate', 'polymorph', 'thrash', 'irq-storm'],
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
    name: 'Phantom', role: ['DPS', 'Burst', 'Stealth runs'], idea: 'In, out, and never seen.', solo: 'Crits, and the easiest runs.', crew: 'Gets the crew past guards and picks off parts.',
    chase: ['crit', 'damage'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { legacy: true, name: 'Weak Spot', rule: 'Your first hit on each part\'s bare code crits (not through armor).' },
    skills: ['null-route', 'opening', 'backstab', 'spoof', 'shadow-copy', 'tap', 'log-wipe', 'implant'],
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

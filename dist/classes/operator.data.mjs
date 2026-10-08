// Operator subclasses: Herder and Hijacker. Data only (no engine imports): the skills they add to
// ABILITIES, and each subclass's skill line, edge and talent tree. The engine side (what new skills do,
// talents, the edge, how the planner plays them) lives in ./operator.mjs.
//
// A subclass is picked at level 10 (`subclass <id>`; switching is free, at home). Its skill line unlocks
// at SUBCLASS.unlocks in data.mjs (levels 10 to 38), in the order written here (eleven skills). Its talent tree has the same shape as
// before: three filler rows of two ranked nodes, and three tiers of two picks.
// edge.legacy: the class's old edge (EDGE in data.mjs), now this subclass's.
import { f, t } from './kit.mjs';

// New skills (ABILITIES entries, same fields as data.mjs). Give each a cls and a sub.
// Numbers the engine reads from here (operator.mjs): helper/ticks (Fan-out), cycles (Mesh, Cache
// Poison), boost/count (Malloc), share (OOM Kill, Spoofed ACK, Hijack), cap/floor (Replay, Spoofed ACK),
// patch (Cache Poison: what a turned patch hits for).
export const abilities = {
  // Herder: the swarm.
  'fan-out': { cls: 'operator', sub: 'herder', verb: 'burn', name: 'Fan-out', target: 'part', damage: 0, helper: 6, ticks: 3, cooldown: 4, icon: 'expand', short: 'Helper 6 ×3 on every part', help: 'fan-out <part> — sends a helper to every part (this one first) to hit it for 6 every cycle for 3 cycles.', desc: 'Fan out a helper to every part of the virus. Each one hits its part for 6 damage every cycle for 3 cycles.' },
  mesh: { cls: 'operator', sub: 'herder', verb: 'buff', name: 'Mesh', target: 'none', damage: 0, cycles: 3, share: 0.5, cooldown: 8, icon: 'server', short: 'Helpers hit now, then splash all', help: 'mesh — every helper hits once now, and for 3 cycles every helper hit that does damage also hits every other part for half.', desc: 'Network your helpers. Every helper hits its part once right away, and for 3 cycles every helper hit that does damage also hits every other part for half as much. Those hits break armor too.' },
  nohup: { cls: 'operator', sub: 'herder', verb: 'hit', name: 'nohup', target: 'part', damage: 20, helper: 5, ticks: 2, cooldown: 2, icon: 'command', short: 'Hit 20 + helper 5 ×2', help: 'nohup <part> — 20 damage now, and a helper that hits it for 5 every cycle for 2 cycles.', desc: 'Start a process that ignores the hangup. It hits the part for 20 now and leaves a helper on it that hits for 5 every cycle for 2 cycles.' },
  'load-shed': { cls: 'operator', sub: 'herder', verb: 'shield', name: 'Load Shed', target: 'none', damage: 0, cooldown: 5, icon: 'expand', short: 'Helpers soak the next hit', help: 'load-shed — the next attack on you is split over your helpers. Each takes an even share off it and loses that much of the damage it has left, and you take what is left over.', desc: 'Shed load onto the swarm. The next attack on you is split over every helper you have running: each takes an even share and loses that much of the damage it had left to deal. You take whatever the swarm couldn\'t carry.' },
  crontab: { cls: 'operator', sub: 'herder', verb: 'burn', name: 'Crontab', target: 'part', damage: 0, hit: 20, scales: ['hit'], once: true, cooldown: 0, icon: 'command', short: 'A helper for the whole fight', help: 'crontab <part> — once per fight: a helper that hits it for 20 every other cycle until the fight ends. It moves on when its part breaks.', desc: 'Schedule a job that never stops. Once per fight, a helper that hits the part for 20 every other cycle until the fight is over, and moves to the next part when its part breaks. It takes no helper slot.' },
  malloc: { cls: 'operator', sub: 'herder', verb: 'buff', name: 'Malloc', target: 'none', damage: 0, boost: 0.5, count: 3, cooldown: 5, icon: 'overload', short: 'Next 3 helpers +50%', help: 'malloc — the next 3 helpers you start deal 50% more and run a cycle longer.', desc: 'Allocate more memory. The next 3 helpers you start deal 50% more damage and run a cycle longer.' },
  'oom-kill': { cls: 'operator', sub: 'herder', verb: 'heal', name: 'OOM Kill', target: 'none', damage: 0, share: 0.4, cooldown: 6, icon: 'clear', short: 'Helpers → heal', help: 'oom-kill — the out-of-memory killer takes every helper you have running, and you heal for 40% of the damage they had left.', desc: 'Let the out-of-memory killer reap every helper you have running. You heal for 40% of the damage they still had left to deal.' },
  // Hijacker: their code, your commands.
  'spoofed-ack': { cls: 'operator', sub: 'hijacker', verb: 'stun', name: 'Spoofed ACK', target: 'attack', damage: 0, delay: 1, share: 0.5, cap: 40, cooldown: 5, icon: 'interrupt', short: 'Delay 1, half back; drains a charge', help: 'spoofed-ack <part> — fake the handshake: its attack waits a cycle, and the part takes half that attack (up to 40). A charge on it drains out, and the part takes half the charge (up to 60). It is Jammed until the attack goes off.', desc: 'Fake the handshake. The part’s attack waits a cycle, and the part takes half of that attack itself (up to 40). It stays Jammed until the attack goes off.' },
  hijack: { cls: 'operator', sub: 'hijacker', verb: 'stun', name: 'Hijack', target: 'attack', damage: 0, recall: true, share: 0.5, cap: 60, cooldown: 6, icon: 'command', short: 'Spend a helper: steal its tell', help: 'hijack <part> — pull one of your helpers off it to take over its tell. A charge lands on another part of the virus at full size, through armor; a cast compiles for you instead (+35% damage for 4 cycles). With no tell on it, its next hit lands on its own side for half. It is Jammed until then.', desc: 'Pull one of your helpers off the part to take over what it is winding up. A charge lands on another part of the virus at its full charged size, straight through armor (a part on its own hits itself). A cast compiles for you: your hits deal 35% more for 4 cycles. With no tell on the part, you only get its next plain hit, turned on its own side at half. The part stays Jammed until then.' },
  'cache-poison': { cls: 'operator', sub: 'hijacker', verb: 'debuff', name: 'Cache Poison', target: 'part', damage: 0, cycles: 5, patch: 15, burn: 5, scales: ['patch', 'burn'], cooldown: 4, icon: 'mutation', short: 'Burn 5; its repairs and seals hurt it', help: 'cache-poison <part> — Poisoned for 5 cycles: it takes 5 a cycle, an armor patch it is due hits it for 15 instead, a heal it casts hurts the part it was meant for, and a seal it lands fails and hits it for 30.', desc: 'Poison the part’s cache for 5 cycles. It takes 5 damage a cycle, an armor patch it is due hits it for 15 damage instead of putting a ◆ back, a heal it casts on its own side does that much damage instead, and a seal it starts reads back poison: it fails and hits the part for twice the patch.' },
  sniff: { cls: 'operator', sub: 'hijacker', verb: 'hit', name: 'Sniff', target: 'part', damage: 18, helper: 4, ticks: 2, cooldown: 2, icon: 'exploit', short: 'Hit 18, leave a foothold', help: 'sniff <part> — 18 damage, and it leaves a foothold: a helper that hits it for 4 for 2 cycles.', desc: 'Sniff the part’s traffic. It takes 18 damage, and you leave a foothold in it: a small helper that hits for 4 for 2 cycles, there for Hijack, Barrier or Blackhole to spend.' },
  takeover: { cls: 'operator', sub: 'hijacker', verb: 'stun', name: 'Takeover', target: 'attack', damage: 0, cycles: 2, cooldown: 12, icon: 'command', short: 'Its attacks hit its own side, 2', help: 'takeover <part> — for 2 cycles, its attacks land on the other parts of the virus at full size instead of on you. A part on its own hits itself.', desc: 'Take the whole part over. For 2 cycles every attack it makes, charged or not, lands on the other parts of the virus at full size instead of on you. A part on its own hits itself.' },
  'echo-cancel': { cls: 'operator', sub: 'hijacker', verb: 'hit', name: 'Echo Cancel', target: 'part', damage: 24, cycles: 4, cooldown: 4, icon: 'interrupt', short: 'Hit 24; its echo turns on the virus', help: 'echo-cancel <part> — 24 damage. An Echo on it stops repeating your hits, and the Mimic or a Decoy plays its next beat back at the virus instead of you.', desc: 'Feed the part its own signal, phase-flipped. It takes 24 damage, an Echo on it stops repeating the hits it lands on you, and a Mimic or a Decoy you cancel plays its next beat back into itself instead of you.' },
  replay: { cls: 'operator', sub: 'hijacker', verb: 'hit', name: 'Replay', target: 'part', damage: 0, cap: 40, floor: 25, cooldown: 5, icon: 'exploit', short: 'Its attack back; a charge ×2', help: 'replay <part> — record its attack and play it back at it: it takes its own attack’s size (25 to 40), straight through armor. A charge winding up on it plays back at its charged size, up to 80.', desc: 'Record the part’s attack and play it back at it. The part takes its own attack’s size, at least 25 and at most 40, straight through armor. Catch it winding up a charge and you record the charged hit: up to 80.' },
  blackhole: { cls: 'operator', sub: 'hijacker', verb: 'stun', name: 'Blackhole', target: 'attack', damage: 0, recall: true, cooldown: 6, icon: 'event-lock', short: 'Spend a helper: drop its attack', help: 'blackhole <part> — pull one of your helpers off it: its next attack is dropped and does nothing. It is Jammed until then.', desc: 'Pull one of your helpers off the part to route its next attack into a blackhole. The attack does nothing at all, whatever it is. The part stays Jammed until then.' },
};

export const subs = {
  herder: {
    name: 'Herder', role: ['Summoner', 'Damage over time'], idea: 'More processes than they can kill.', solo: 'A swarm of helpers doing the work.', crew: 'Constant damage on everything.', lean: 'crew',
    chase: ['payload', 'signal'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { legacy: true, name: 'Last Gasp', rule: 'Each helper hits once more as it expires.' },
    skills: ['fan-out', 'nohup', 'kill-switch', 'load-shed', 'fork', 'mesh', 'garbage-collect', 'malloc', 'crontab', 'oom-kill', 'cron-storm'],
    rotationCore: ['deploy', 'botnet', 'nohup', 'hook'],
    presets: {
      rotation: ['deploy', 'botnet', 'nohup', 'hook', 'kill-switch', 'spawn', 'load-shed', 'fan-out', 'mesh', 'crontab', 'malloc', 'fork', 'cron-storm'],
      swarm: ['deploy', 'botnet', 'nohup', 'hook', 'kill-switch', 'garbage-collect', 'fork', 'fan-out', 'mesh', 'load-shed', 'spawn', 'malloc'],
    },
    layers: { core: ['deploy', 'botnet', 'fan-out', 'nohup', 'spawn', 'hook'], utility: ['kill-switch', 'load-shed', 'oom-kill'], cooldown: ['mesh', 'malloc', 'cron-storm'], specialist: ['fork', 'garbage-collect', 'crontab'] },
    tags: { fork: 'Armor', 'garbage-collect': 'Fragments', crontab: 'Bosses' },
    fillers: [
      [f('thread-pool', 'Thread Pool', 'Deploy helpers deal +1 per rank.', 1), f('node-pool', 'Node Pool', 'Botnet helpers deal +1 per rank.', 1)],
      [f('wide-area', 'Wide Area', 'Fan-out helpers deal +1 per rank.', 1), f('dead-mans-switch', 'Dead Man’s Switch', 'Kill Switch cashes in +5% per rank.', 0.05)],
      [f('load-balancer', 'Load Balancer', 'Take 3% less damage from attacks per rank.', 0.03), f('gc-tuning', 'GC Tuning', 'Garbage Collect deals 30% more per rank.', 0.3)],
    ],
    talents: [
      [t('big-process', 'Big Process', 'Deploy helpers deal 14.'), t('long-running', 'Long-running', 'Deploy helpers last 6 cycles.')],
      [t('hive', 'Hive', 'Your helper cap is 9.'), t('hydra', 'Hydra', 'When a part breaks, each of your helpers on it splits in two on the next part, up to your cap.')],
      [t('zombie-process', 'Zombie Process', 'Last Gasp hits twice.'), t('supervisor', 'Supervisor', 'Kill Switch readies Deploy.')],
    ],
  },
  hijacker: {
    name: 'Hijacker', role: ['Control', 'Support'], idea: 'Their code, your commands.', solo: 'Turns the virus against itself.', crew: 'Shuts attacks down for everyone.', lean: 'crew',
    chase: ['payload', 'clock'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { name: 'Man in the Middle', rule: 'Jammed parts take +20% from everyone, and a part with your helper on it (a foothold) takes +20% from you.' },
    skills: ['sniff', 'replay', 'spoofed-ack', 'hijack', 'jam', 'barrier', 'cache-poison', 'takeover', 'echo-cancel', 'reroute', 'blackhole'],
    rotationCore: ['sniff', 'replay', 'botnet', 'jam'],
    presets: {
      rotation: ['sniff', 'replay', 'botnet', 'jam', 'spoofed-ack', 'hijack', 'barrier', 'takeover', 'deploy', 'spawn', 'hook', 'cache-poison', 'blackhole'],
      rules: ['sniff', 'replay', 'botnet', 'jam', 'spoofed-ack', 'hijack', 'cache-poison', 'echo-cancel', 'takeover', 'deploy', 'spawn', 'barrier', 'hook'],
    },
    layers: { core: ['sniff', 'replay', 'botnet', 'jam', 'deploy', 'spawn', 'hook'], utility: ['spoofed-ack', 'hijack', 'barrier', 'reroute'], cooldown: ['takeover', 'blackhole'], specialist: ['cache-poison', 'echo-cancel'] },
    tags: { 'cache-poison': 'Seals', 'echo-cancel': 'Mimic' },
    fillers: [
      [f('thread-pool', 'Thread Pool', 'Deploy helpers deal +1 per rank.', 1), f('kernel-hook', 'Kernel Hook', 'Hooked parts take +1 more per hit per rank.', 1)],
      [f('ack-flood', 'ACK Flood', 'Spoofed ACK sends back +10% of the attack per rank.', 0.1), f('cold-storage', 'Cold Storage', 'Barrier shields 10% more per rank.', 0.1)],
      [f('load-balancer', 'Load Balancer', 'Take 3% less damage from attacks per rank.', 0.03), f('packet-capture', 'Packet Capture', 'Replay hits +5 per rank.', 5)],
    ],
    talents: [
      [t('long-jam', 'Long Jam', 'Jam pushes the attack back 2 cycles.'), t('loopback', 'Loopback', 'Jam and Blackhole leave the helper running.')],
      [t('double-agent', 'Double Agent', 'Hijack takes the part’s next two attacks.'), t('crosstalk', 'Crosstalk', 'A hijacked hit lands on every other part.')],
      [t('full-duplex', 'Full Duplex', 'Jammed parts take +40% from everyone, not +20%.'), t('kill-chain', 'Kill Chain', 'Breaking a Jammed part readies Jam, Spoofed ACK and Hijack.')],
    ],
  },
};

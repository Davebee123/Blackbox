// Operator subclasses: Herder and Hijacker. Data only (no engine imports): the skills they add to
// ABILITIES, and each subclass's skill line, edge and talent tree. The engine side (what new skills do,
// talents, the edge, how the planner plays them) lives in ./operator.mjs.
//
// A subclass is picked at level 10 (`subclass <id>`; switching is free, at home). Its skill line unlocks
// at SUB_UNLOCKS in data.mjs, in the order written here (up to 8). Its talent tree has the same shape as
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
  mesh: { cls: 'operator', sub: 'herder', verb: 'buff', name: 'Mesh', target: 'none', damage: 0, cycles: 3, share: 0.5, cooldown: 6, icon: 'server', short: 'Helper hits splash all', help: 'mesh — for 3 cycles, every helper hit that does damage also hits every other part for half as much.', desc: 'Network your helpers for 3 cycles. Every helper hit that does damage also hits every other part for half as much, and those hits break armor too.' },
  malloc: { cls: 'operator', sub: 'herder', verb: 'buff', name: 'Malloc', target: 'none', damage: 0, boost: 0.5, count: 3, cooldown: 5, icon: 'overload', short: 'Next 3 helpers +50%', help: 'malloc — the next 3 helpers you start deal 50% more and run a cycle longer.', desc: 'Allocate more memory. The next 3 helpers you start deal 50% more damage and run a cycle longer.' },
  'oom-kill': { cls: 'operator', sub: 'herder', verb: 'heal', name: 'OOM Kill', target: 'none', damage: 0, share: 0.4, cooldown: 6, icon: 'clear', short: 'Helpers → heal', help: 'oom-kill — the out-of-memory killer takes every helper you have running, and you heal for 40% of the damage they had left.', desc: 'Let the out-of-memory killer reap every helper you have running. You heal for 40% of the damage they still had left to deal.' },
  // Hijacker: their code, your commands.
  'spoofed-ack': { cls: 'operator', sub: 'hijacker', verb: 'stun', name: 'Spoofed ACK', target: 'attack', damage: 0, delay: 1, share: 0.5, cap: 40, cooldown: 5, icon: 'interrupt', short: 'Delay 1, half back; drains a charge', help: 'spoofed-ack <part> — fake the handshake: its attack waits a cycle, and the part takes half that attack (up to 40). A charge on it drains out, and the part takes half the charge (up to 60). It is Jammed until the attack goes off.', desc: 'Fake the handshake. The part’s attack waits a cycle, and the part takes half of that attack itself (up to 40). It stays Jammed until the attack goes off.' },
  hijack: { cls: 'operator', sub: 'hijacker', verb: 'stun', name: 'Hijack', target: 'attack', damage: 0, recall: true, share: 0.5, cap: 60, cooldown: 6, icon: 'command', short: 'Spend a helper: steal its tell', help: 'hijack <part> — pull one of your helpers off it to take over its tell. A charge lands on another part of the virus at full size, through armor; a cast compiles for you instead (+35% damage for 4 cycles). With no tell on it, its next hit lands on its own side for half. It is Jammed until then.', desc: 'Pull one of your helpers off the part to take over what it is winding up. A charge lands on another part of the virus at its full charged size, straight through armor (a part on its own hits itself). A cast compiles for you: your hits deal 35% more for 4 cycles. With no tell on the part, you only get its next plain hit, turned on its own side at half. The part stays Jammed until then.' },
  'cache-poison': { cls: 'operator', sub: 'hijacker', verb: 'debuff', name: 'Cache Poison', target: 'part', damage: 0, cycles: 5, patch: 15, scales: ['patch'], cooldown: 4, icon: 'mutation', short: 'Its repairs and seals hurt it', help: 'cache-poison <part> — Poisoned for 5 cycles: an armor patch it is due hits it for 15 instead, a heal it casts hurts the part it was meant for, and a seal it lands fails and hits it for 30.', desc: 'Poison the part’s cache for 5 cycles. An armor patch it is due hits it for 15 damage instead of putting a ◆ back, a heal it casts on its own side does that much damage instead, and a seal it starts reads back poison: it fails and hits the part for twice the patch.' },
  replay: { cls: 'operator', sub: 'hijacker', verb: 'hit', name: 'Replay', target: 'part', damage: 0, cap: 40, floor: 25, cooldown: 5, icon: 'exploit', short: 'Its attack back; a charge ×2', help: 'replay <part> — record its attack and play it back at it: it takes its own attack’s size (25 to 40), straight through armor. A charge winding up on it plays back at its charged size, up to 80.', desc: 'Record the part’s attack and play it back at it. The part takes its own attack’s size, at least 25 and at most 40, straight through armor. Catch it winding up a charge and you record the charged hit: up to 80.' },
  blackhole: { cls: 'operator', sub: 'hijacker', verb: 'stun', name: 'Blackhole', target: 'attack', damage: 0, recall: true, cooldown: 6, icon: 'event-lock', short: 'Spend a helper: drop its attack', help: 'blackhole <part> — pull one of your helpers off it: its next attack is dropped and does nothing. It is Jammed until then.', desc: 'Pull one of your helpers off the part to route its next attack into a blackhole. The attack does nothing at all, whatever it is. The part stays Jammed until then.' },
};

export const subs = {
  herder: {
    name: 'Herder', role: ['Summoner', 'Damage over time'], idea: 'More processes than they can kill.', solo: 'A swarm of helpers doing the work.', crew: 'Constant damage on everything.',
    chase: ['payload', 'signal'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { legacy: true, name: 'Last Gasp', rule: 'Each helper hits once more as it expires.' },
    skills: ['fan-out', 'mesh', 'kill-switch', 'garbage-collect', 'malloc', 'fork', 'oom-kill', 'cron-storm'],
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
    name: 'Hijacker', role: ['Control', 'Support'], idea: 'Their code, your commands.', solo: 'Turns the virus against itself.', crew: 'Shuts attacks down for everyone.',
    chase: ['payload', 'clock'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { name: 'Man in the Middle', rule: 'Jammed parts take +20% from everyone, and a part with your helper on it (a foothold) takes +20% from you.' },
    skills: ['jam', 'hijack', 'replay', 'spoofed-ack', 'barrier', 'cache-poison', 'reroute', 'blackhole'],
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

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
  'fan-out': { cls: 'operator', sub: 'herder', verb: 'burn', name: 'Fan-out', target: 'part', damage: 0, helper: 6, ticks: 3, cooldown: 4, icon: 'expand', short: 'A helper on every part', help: 'fan-out <part> — Sends a helper to every part, starting with the target, each dealing 6 damage every cycle for 3 cycles.', desc: 'Fans a helper out to every part of the virus, starting with the target. Each one deals 6 damage to its part every cycle for 3 cycles.' },
  mesh: { cls: 'operator', sub: 'herder', verb: 'buff', name: 'Mesh', target: 'none', damage: 0, cycles: 3, share: 0.5, cooldown: 8, icon: 'server', short: 'Helpers strike, then splash', help: 'mesh — Every helper strikes once immediately. For 3 cycles, each helper hit also deals half its damage to every other part.', desc: 'Networks your helpers. Every helper strikes once immediately, and for 3 cycles each helper hit that deals damage also deals half as much to every other part. Those hits break ◆ too.' },
  nohup: { cls: 'operator', sub: 'herder', verb: 'hit', name: 'nohup', target: 'part', damage: 20, helper: 5, ticks: 2, cooldown: 2, icon: 'command', short: '20 damage + helper 5 ×2', help: 'nohup <part> — Deals 20 damage and leaves a helper that deals 5 damage to the target every cycle for 2 cycles.', desc: 'Starts a process that ignores the hangup, dealing 20 damage and leaving a helper that deals 5 damage to the target every cycle for 2 cycles.' },
  'load-shed': { cls: 'operator', sub: 'herder', verb: 'shield', name: 'Load Shed', target: 'none', damage: 0, cooldown: 5, icon: 'expand', short: 'Helpers soak the next hit', help: 'load-shed — Your helpers split the next attack against you evenly, each losing that much of its remaining damage. You take whatever they cannot absorb.', desc: 'Sheds the load onto the swarm. Your helpers split the next attack against you evenly, each losing that much of the damage it had left. You take whatever the swarm cannot carry.' },
  crontab: { cls: 'operator', sub: 'herder', verb: 'burn', name: 'Crontab', target: 'part', damage: 0, hit: 20, scales: ['hit'], once: true, cooldown: 0, icon: 'command', short: 'A helper for the whole fight', help: 'crontab <part> — Starts a helper that deals 20 damage to the target every other cycle for the rest of the fight, moving on when its part breaks. Usable once per fight.', desc: 'Schedules a job that never stops. Starts a helper that deals 20 damage to the target every other cycle until the fight ends, moving to the next part when its part breaks. It takes no helper slot. Usable once per fight.' },
  malloc: { cls: 'operator', sub: 'herder', verb: 'buff', name: 'Malloc', target: 'none', damage: 0, boost: 0.5, count: 3, cooldown: 5, icon: 'overload', short: 'Next 3 helpers +50%', help: 'malloc — Your next 3 helpers deal 50% more damage and last 1 cycle longer.', desc: 'Allocates more memory. The next 3 helpers you start deal 50% more damage and last 1 cycle longer.' },
  'oom-kill': { cls: 'operator', sub: 'herder', verb: 'heal', name: 'OOM Kill', target: 'none', damage: 0, share: 0.4, cooldown: 6, icon: 'clear', short: 'Ends helpers to heal', help: 'oom-kill — Ends all your helpers and heals you for 40% of the damage they had left.', desc: 'Lets the out-of-memory killer reap every helper you have running. Heals you for 40% of the damage they still had left to deal.' },
  // Hijacker: their code, your commands.
  'spoofed-ack': { cls: 'operator', sub: 'hijacker', verb: 'stun', name: 'Spoofed ACK', target: 'attack', damage: 0, delay: 1, share: 0.5, cap: 40, cooldown: 5, icon: 'interrupt', short: 'Delays 1; returns half', help: 'spoofed-ack <part> — Delays the target\'s next attack by 1 cycle and deals half that attack\'s damage to it, up to 40. A charged attack loses its charge, and the target takes half the charge, up to 60. Jams the target until it attacks.', desc: 'Fakes the handshake. Delays the target\'s next attack by 1 cycle and deals half that attack\'s damage to it, up to 40. The target stays Jammed until the attack goes off.' },
  hijack: { cls: 'operator', sub: 'hijacker', verb: 'stun', name: 'Hijack', target: 'attack', damage: 0, recall: true, share: 0.5, cap: 60, cooldown: 6, icon: 'command', short: 'A helper steals its tell', help: 'hijack <part> — Spends one of your helpers on the target to seize its tell. A stolen charge strikes another part at full size, ignoring armor. A stolen cast empowers you instead, increasing your damage by 35% for 4 cycles. With no tell, the target\'s next hit strikes its own side for half. Jams the target until then.', desc: 'Pulls one of your helpers off the target to take over what it is winding up. A stolen charge lands on another part at its full charged size, ignoring armor, and a part on its own hits itself. A stolen cast compiles for you instead, and your hits deal 35% more damage for 4 cycles. With no tell on the target, its next hit lands on its own side at half damage. The target stays Jammed until then.' },
  'cache-poison': { cls: 'operator', sub: 'hijacker', verb: 'debuff', name: 'Cache Poison', target: 'part', damage: 18, cycles: 5, patch: 15, burn: 8, weaken: 0.2, scales: ['patch', 'burn'], cooldown: 4, icon: 'mutation', short: '18 + poison 8; −20% hits', help: 'cache-poison <part> — Deals 18 damage and poisons the target for 5 cycles. A poisoned part takes 8 damage every cycle and deals 20% less damage. Its armor patches damage it for 15 instead, its heals harm their target, and its seals fail and deal 30 damage to it.', desc: 'Poisons the target\'s cache, dealing 18 damage and 8 damage every cycle for 5 cycles. While poisoned, its attacks deal 20% less damage. An armor patch it is due deals 15 damage to it instead of restoring a ◆, a heal it casts on its own side deals that much damage instead, and a seal it starts reads back poison, failing and damaging it for twice the patch.' },
  sniff: { cls: 'operator', sub: 'hijacker', verb: 'hit', name: 'Sniff', target: 'part', damage: 18, helper: 4, ticks: 2, cooldown: 2, icon: 'exploit', short: '18 damage; a foothold', help: 'sniff <part> — Deals 18 damage and leaves a foothold: a helper that deals 4 damage to the target every cycle for 2 cycles.', desc: 'Sniffs the target\'s traffic, dealing 18 damage and leaving a foothold: a small helper that deals 4 damage to it every cycle for 2 cycles, ready for Hijack, Barrier or Blackhole to spend.' },
  takeover: { cls: 'operator', sub: 'hijacker', verb: 'stun', name: 'Takeover', target: 'attack', damage: 0, cycles: 2, cooldown: 12, icon: 'command', short: 'Its attacks hit its side', help: 'takeover <part> — For 2 cycles, the target\'s attacks strike the other parts of the virus at full damage instead of you. A part on its own strikes itself.', desc: 'Takes the whole target over. For 2 cycles, every attack it makes, charged or not, lands on the other parts of the virus at full damage instead of on you. A part on its own hits itself.' },
  'echo-cancel': { cls: 'operator', sub: 'hijacker', verb: 'hit', name: 'Echo Cancel', target: 'part', damage: 24, cycles: 4, cooldown: 4, icon: 'interrupt', short: '24 damage; turns echoes', help: 'echo-cancel <part> — Deals 24 damage to the target. An Echo stops repeating your hits, and a Mimic or Decoy turns its next beat against the virus.', desc: 'Feeds the target its own signal, phase-flipped, dealing 24 damage. An Echo stops repeating the hits it lands on you, and a Mimic or Decoy you cancel plays its next beat back into itself instead of at you.' },
  replay: { cls: 'operator', sub: 'hijacker', verb: 'hit', name: 'Replay', target: 'part', damage: 0, cap: 40, floor: 25, cooldown: 5, icon: 'exploit', short: 'Its own attack, replayed', help: 'replay <part> — Turns the target\'s own attack against it, dealing 25 to 40 damage and ignoring armor. If the target is winding up a charge, replays the charged attack instead, up to 80.', desc: 'Records the target\'s attack and plays it back at it, dealing its own attack\'s damage, at least 25 and at most 40, ignoring armor. If the target is winding up a charge, records the charged hit instead, up to 80.' },
  blackhole: { cls: 'operator', sub: 'hijacker', verb: 'stun', name: 'Blackhole', target: 'attack', damage: 0, recall: true, cooldown: 6, icon: 'event-lock', short: 'Spends a helper: no attack', help: 'blackhole <part> — Spends one of your helpers on the target to nullify its next attack. Jams the target until then.', desc: 'Pulls one of your helpers off the target to route its next attack into a blackhole. The attack does nothing at all, whatever it is. The target stays Jammed until then.' },
};

export const subs = {
  herder: {
    name: 'Herder', role: ['Summoner', 'Damage over time'], idea: 'More processes than they can kill.', solo: 'A swarm of helpers doing the work.', crew: 'Constant damage on everything.', lean: 'crew',
    chase: ['payload', 'signal'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { legacy: true, name: 'Last Gasp', rule: 'Each of your helpers strikes once more as it expires.' },
    skills: ['fan-out', 'nohup', 'kill-switch', 'load-shed', 'fork', 'mesh', 'garbage-collect', 'malloc', 'crontab', 'oom-kill', 'cron-storm'],
    rotationCore: ['deploy', 'botnet', 'nohup', 'hook'],
    presets: {
      rotation: ['deploy', 'botnet', 'nohup', 'hook', 'kill-switch', 'spawn', 'load-shed', 'fan-out', 'mesh', 'crontab', 'malloc', 'fork', 'cron-storm'],
      swarm: ['deploy', 'botnet', 'nohup', 'hook', 'kill-switch', 'spawn', 'load-shed', 'fan-out', 'garbage-collect', 'fork', 'mesh', 'malloc', 'crontab'],
    },
    layers: { core: ['deploy', 'botnet', 'fan-out', 'nohup', 'spawn', 'hook'], utility: ['kill-switch', 'load-shed', 'oom-kill'], cooldown: ['mesh', 'malloc', 'cron-storm'], specialist: ['fork', 'garbage-collect', 'crontab'] },
    tags: { fork: 'Armor', 'garbage-collect': 'Fragments', crontab: 'Bosses' },
    fillers: [
      [f('thread-pool', 'Thread Pool', 'Increases the damage of Deploy helpers by 1 per rank.', 1), f('node-pool', 'Node Pool', 'Increases the damage of Botnet helpers by 1 per rank.', 1)],
      [f('wide-area', 'Wide Area', 'Increases the damage of Fan-out helpers by 1 per rank.', 1), f('dead-mans-switch', 'Dead Man’s Switch', 'Increases the damage of Kill Switch by 5% per rank.', 0.05)],
      [f('load-balancer', 'Load Balancer', 'Reduces the damage you take from attacks by 3% per rank.', 0.03), f('gc-tuning', 'GC Tuning', 'Increases the damage of Garbage Collect by 30% per rank.', 0.3)],
    ],
    talents: [
      [t('big-process', 'Big Process', 'Deploy helpers deal 14 damage.'), t('long-running', 'Long-running', 'Deploy helpers last 6 cycles.')],
      [t('hive', 'Hive', 'Raises your helper cap to 9.'), t('hydra', 'Hydra', 'When a part breaks, each of your helpers on it splits in two on the next part, up to your helper cap.')],
      [t('zombie-process', 'Zombie Process', 'Last Gasp strikes twice.'), t('supervisor', 'Supervisor', 'Kill Switch resets the cooldown of Deploy.')],
    ],
  },
  hijacker: {
    name: 'Hijacker', role: ['Control', 'Support'], idea: 'Their code, your commands.', solo: 'Turns the virus against itself.', crew: 'Shuts attacks down for everyone.', lean: 'crew',
    chase: ['payload', 'clock'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { name: 'Man in the Middle', rule: 'Jammed parts take 20% more damage from everyone, and a part with your helper on it (a foothold) takes 20% more damage from you.' },
    skills: ['sniff', 'replay', 'spoofed-ack', 'hijack', 'jam', 'barrier', 'cache-poison', 'takeover', 'echo-cancel', 'reroute', 'blackhole'],
    rotationCore: ['sniff', 'replay', 'botnet', 'deploy'],
    presets: {
      rotation: ['sniff', 'replay', 'botnet', 'deploy', 'jam', 'spoofed-ack', 'hijack', 'barrier', 'takeover', 'spawn', 'hook', 'cache-poison', 'blackhole'],
      rules: ['sniff', 'replay', 'botnet', 'jam', 'spoofed-ack', 'hijack', 'cache-poison', 'echo-cancel', 'takeover', 'deploy', 'spawn', 'barrier', 'hook'],
    },
    layers: { core: ['sniff', 'replay', 'botnet', 'jam', 'deploy', 'spawn', 'hook'], utility: ['spoofed-ack', 'hijack', 'barrier', 'reroute'], cooldown: ['takeover', 'blackhole'], specialist: ['cache-poison', 'echo-cancel'] },
    tags: { 'cache-poison': 'Seals', 'echo-cancel': 'Mimic' },
    fillers: [
      [f('thread-pool', 'Thread Pool', 'Increases the damage of Deploy helpers by 1 per rank.', 1), f('kernel-hook', 'Kernel Hook', 'Increases the damage Hooked adds to each hit by 1 per rank.', 1)],
      [f('ack-flood', 'ACK Flood', 'Increases the share of the attack Spoofed ACK sends back by 10% per rank.', 0.1), f('cold-storage', 'Cold Storage', 'Increases the shield from Barrier by 10% per rank.', 0.1)],
      [f('load-balancer', 'Load Balancer', 'Reduces the damage you take from attacks by 3% per rank.', 0.03), f('packet-capture', 'Packet Capture', 'Increases the damage of Replay by 5 per rank.', 5)],
    ],
    talents: [
      [t('long-jam', 'Long Jam', 'Jam delays the attack 2 cycles, instead of 1.'), t('loopback', 'Loopback', 'Jam and Blackhole leave the helper running.')],
      [t('double-agent', 'Double Agent', 'Hijack takes the target’s next 2 attacks.'), t('crosstalk', 'Crosstalk', 'A hijacked hit lands on every other part.')],
      [t('full-duplex', 'Full Duplex', 'Jammed parts take 40% more damage from everyone, instead of 20%.'), t('kill-chain', 'Kill Chain', 'Breaking a Jammed part resets the cooldowns of Jam, Spoofed ACK and Hijack.')],
    ],
  },
};

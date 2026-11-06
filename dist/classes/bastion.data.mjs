// Bastion subclasses: Warden and Sysop. Data only (no engine imports): the skills they add to
// ABILITIES, and each subclass's skill line, edge and talent tree. The engine side (what new skills do,
// talents, the edge, how the planner plays them) lives in ./bastion.mjs.
//
// A subclass is picked at level 10 (`subclass <id>`; switching is free, at home). Its skill line unlocks
// at SUBCLASS.unlocks in data.mjs (levels 10 to 38), in the order written here (eleven skills). Its talent tree is six tiers
// of three picks.
// edge.legacy: the class's old edge (EDGE in data.mjs), now this subclass's.
import { t, c } from './kit.mjs';

// New skills (ABILITIES entries, same fields as data.mjs). Give each a cls and a sub.
// Fields the engine reads generically: taunt (draw fire in a crew), once, ally. The rest (cut, cap,
// heal, tick, ticks, cycles) are read by ./bastion.mjs; heal and tick also scale in the skill text.
export const abilities = {
  // Warden: the tank. Draws fire, soaks it, sends it back.
  bulkhead: { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'Bulkhead', target: 'none', damage: 0, cut: 0.5, charged: 0.75, cycles: 2, taunt: 2, cooldown: 6, icon: 'shell-shield', short: 'Half damage; ¼ from charges',
    help: 'bulkhead — For 2 cycles, attacks against you deal half damage, and charged attacks deal a quarter. In a crew, draws all attacks to you for the duration.',
    desc: 'Seals the bulkheads. For 2 cycles, attacks against you deal half damage, and charged attacks deal a quarter. In a crew, draws all attacks to you for those 2 cycles.' },
  blowback: { cls: 'bastion', sub: 'warden', verb: 'hit', name: 'Blowback', target: 'part', damage: 0, cap: 70, chits: 2, cooldown: 3, icon: 'spike', short: 'Returns all damage taken',
    help: 'blowback <part> — Deals damage equal to every attack that has hit you since your last Blowback, including damage absorbed or reduced, up to 70. Makes Retaliate usable next cycle. Breaks 2 ◆ on an armored target.',
    desc: 'Sends it all back. Deals damage to the target equal to every attack that has hit you since your last Blowback, counting what your shields and cuts absorbed, up to 70. Makes Retaliate usable next cycle. Breaks 2 ◆ on an armored target.' },
  reject: { cls: 'bastion', sub: 'warden', verb: 'hit', name: 'Reject', target: 'part', damage: 28, guard: 10, scales: ['guard'], cooldown: 2, icon: 'interrupt', short: '28 damage; shield 10',
    help: 'reject <part> — Deals 28 damage to the target. If the target was the last part to hit you, also shields you for 10.',
    desc: 'Refuses the connection and throws it back, dealing 28 damage to the target. If the target was the last part to hit you (your Grudge), also shields you for 10.' },
  'circuit-breaker': { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'Circuit Breaker', target: 'none', damage: 0, cycles: 3, most: 0.1, cooldown: 12, icon: 'event-lock', short: 'No hit over 10%, 3 cycles',
    help: 'circuit-breaker — For 3 cycles, no single attack can deal more than 10% of your max Signal. The damage prevented is added to your next Blowback.',
    desc: 'Trips the breaker before the surge. For 3 cycles, no single attack can deal more than 10% of your max Signal, however big or charged it is. The damage prevented is added to your next Blowback.' },
  honeypot: { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'Honeypot', target: 'none', damage: 0, cycles: 2, cut: 15, scales: ['cut'], cooldown: 6, icon: 'shell-shield', short: 'Next hit −15; eats Scrambles',
    help: 'honeypot — For 2 cycles, the next hit against you deals 15 less damage, and the honeypot absorbs any Scramble, Possession or Mimic beat aimed at you.',
    desc: 'Leaves something sweet on the wire. For 2 cycles, the next hit against you deals 15 less damage, and the honeypot absorbs any Scramble, Possession or Mimic beat aimed at you.' },
  dmz: { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'DMZ', target: 'none', damage: 0, cut: 0.3, minor: 0.1, cycles: 2, cooldown: 6, icon: 'event-lock', short: 'Crew takes 30% less',
    help: 'dmz — For 2 cycles, attacks deal 30% less damage to you and your crew. Fragment bites and hits below 10% of your max deal no damage, and Replicate spawns nothing.',
    desc: 'Opens a demilitarized zone around the crew. For 2 cycles, attacks deal 30% less damage to you and everyone fighting beside you. Fragment bites and hits below 10% of your max deal no damage, and a Replicate that lands inside it spawns nothing.' },
  // Sysop: the healer. Heals that spill into shields, and fixes for what a virus does to a crewmate.
  multicast: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Multicast', target: 'none', damage: 0, heal: 16, splash: 6, scales: ['splash'], cooldown: 4, icon: 'expand', short: 'Heals all 16; 6 to parts',
    help: 'multicast — Heals you and every crewmate for 16, and deals 6 damage to every part. Fragments take 16.',
    desc: 'Sends one packet to every host. Heals you and every crewmate for 16, deals 6 damage to every part of the virus, and deals 16 damage to every fragment.' },
  checksum: { cls: 'bastion', sub: 'sysop', verb: 'hit', name: 'Checksum', target: 'part', damage: 24, share: 0.25, cooldown: 2, icon: 'server', short: '24 damage, heals 25%',
    help: 'checksum <part> — Deals 24 damage and heals you for 25% of the damage dealt. In a crew, heals the most injured crewmate instead.',
    desc: 'Verifies the target against a known good copy, dealing 24 damage and healing for 25% of the damage dealt. Heals you, or in a crew the most injured crewmate.' },
  'maintenance-window': { cls: 'bastion', sub: 'sysop', verb: 'buff', name: 'Maintenance Window', target: 'none', damage: 0, cycles: 3, boost: 0.5, share: 0.25, cooldown: 12, icon: 'server', short: 'Heals +50%; hits heal',
    help: 'maintenance-window — For 3 cycles, your heals are 50% stronger and your hits heal you for 25% of the damage dealt.',
    desc: 'Takes the system down for maintenance on your terms. For 3 cycles, your heals are 50% stronger and your hits heal you for 25% of the damage dealt. Plan it for the cycles a boss hits hardest.' },
  revoke: { cls: 'bastion', sub: 'sysop', verb: 'hit', name: 'Revoke', target: 'part', damage: 22, cycles: 4, weaken: 0.25, cooldown: 4, icon: 'event-lock', short: '22 damage; it deals −25%',
    help: 'revoke <part> — Deals 22 damage and revokes the target for 4 cycles. A revoked part deals 25% less damage, and its heals, patches and Self-Updates fail. A heal it casts on its own side heals you instead.',
    desc: 'Revokes the target\'s certificate, dealing 22 damage. For 4 cycles, its attacks deal 25% less damage and nothing it signs goes through. An armor patch fails, a Self-Update it is compiling stops, and a heal it casts on its own side heals you instead.' },
  heartbeat: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Heartbeat', target: 'none', ally: true, damage: 0, tick: 4, ticks: 4, cooldown: 4, icon: 'server', short: 'Heal 4 ×4; charges −25%',
    help: 'heartbeat [name] — Heals for 4 every cycle for 4 cycles, starting now. Charged attacks against the healed target deal 25% less while it lasts. In a crew, can target a crewmate. A new Heartbeat replaces the old one.',
    desc: 'Keeps the session alive. Heals you or a crewmate for 4 every cycle for 4 cycles, starting this cycle. While it lasts, charged attacks against them deal 25% less damage, so put it up when a charge is winding up. A second Heartbeat on the same player replaces the first.' },
  scrub: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Scrub', target: 'none', ally: true, damage: 0, heal: 8, cooldown: 5, icon: 'clear', short: 'Cleanse; heal 8 or 12',
    help: 'scrub [name] — Removes encryption (including a Full Disk burst), Scrambled and Corrupted, and heals for 8, or 12 if anything was removed. In a crew, can target a crewmate.',
    desc: 'Scrubs the logs clean, removing encryption, Scrambled and Corrupted from you or a crewmate. Heals them for 8, or half again if there was something to clean.' },
  rollback: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Rollback', target: 'none', ally: true, damage: 0, cooldown: 6, icon: 'behavior', short: 'Undoes the last hit or cast',
    help: 'rollback [name] — Undoes the last attack that hurt you, restoring all the damage it dealt or deleting the fragment it spawned. Removes Corrupted. When alone, also undoes a cast that just compiled. In a crew, can target a crewmate.',
    desc: 'Restores the last good state. Undoes the last attack that hurt you or a crewmate, healing all the damage it dealt or deleting the fragment it spawned, and removes Corrupted. When alone, also rolls back a cast the virus just compiled, ending its buff.' },
  'hot-standby': { cls: 'bastion', sub: 'sysop', verb: 'shield', name: 'Hot Standby', target: 'none', ally: true, damage: 0, once: true, cooldown: 0, icon: 'shell-shield', short: 'Survive at 1; once',
    help: 'hot-standby [name] — The next attack that would reduce you to 0 leaves you at 1 instead. Usable once per fight. In a crew, can target a crewmate.',
    desc: 'Keeps a spare running. The next attack that would drop you or a crewmate to 0 leaves them at 1 instead. Usable once per fight.' },
  rebalance: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Rebalance', target: 'none', damage: 0, heal: 6, cooldown: 6, icon: 'mutation', short: 'Evens the crew; heals 6',
    help: 'rebalance — Evens out Signal so everyone in the fight has the same share of their max, then heals everyone for 6. When alone, heals you for 12.',
    desc: 'Spreads the load. Evens out Signal so everyone in the fight has the same share of their max, the crew\'s average, then heals everyone for 6. When alone, heals you for 12.' },
};

export const subs = {
  warden: {
    name: 'Warden', role: ['Tank', 'Retaliation'], idea: 'Every hit comes to you, and goes back.', solo: 'Outlasts anything and hits back.', crew: 'The tank: draws fire and turns it around.', lean: 'crew',
    chase: ['signal', 'restore'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { legacy: true, name: 'Grudge', rule: 'The part that last hit you takes +20% from your hits.' },
    skills: ['reject', 'suspend', 'bulkhead', 'blowback', 'harden', 'quarantine', 'throttle', 'circuit-breaker', 'dmz', 'honeypot', 'failover'],
    rotationCore: ['rate-limit', 'purge', 'reject', 'blowback'],
    presets: {
      rotation: ['rate-limit', 'purge', 'reject', 'blowback', 'suspend', 'harden', 'bulkhead', 'quarantine', 'circuit-breaker', 'retaliate', 'failover', 'throttle', 'firewall'],
      swarm: ['rate-limit', 'purge', 'reject', 'blowback', 'suspend', 'quarantine', 'dmz', 'throttle', 'circuit-breaker', 'retaliate', 'harden', 'bulkhead', 'firewall'],
    },
    layers: { core: ['rate-limit', 'purge', 'reject', 'blowback', 'retaliate'], utility: ['firewall', 'suspend', 'bulkhead', 'harden', 'quarantine'], cooldown: ['circuit-breaker', 'failover'], specialist: ['throttle', 'dmz', 'honeypot'] },
    tags: { throttle: 'Loud parts', dmz: 'Fragments', honeypot: 'Mimic', firewall: 'Crew' },
    // The talent tiers (docs/builds.md): one of three a tier, each opening at its level (LOADOUT.tiers). The first is
    // the plain pick, the middle changes how a skill plays, the third fires on a shared event (combat.mjs fireEvent).
    tiers: [
      [t('deep-packet-inspection', 'Deep Packet Inspection', 'Makes Firewall absorb 30 instead of 16.'), t('token-bucket', 'Token Bucket', 'Makes Rate Limit Throttle the target\'s next 2 attacks instead of 1.'), t('rebound', 'Rebound', 'Makes your next Reject deal double damage when an attack hits you.')],
      [t('deep-buffer', 'Deep Buffer', 'Increases the damage of Blowback by 25%.'), t('tarpit', 'Tarpit', 'Makes Suspend also Throttle the target until its attack lands.'), t('flow-control', 'Flow Control', 'Makes Retaliate usable on a part when you answer its tell.')],
      [t('hardened-kernel', 'Hardened Kernel', 'Increases your max Signal by 10%.'), t('write-protect', 'Write Protect', 'Makes Harden give 2 ◆, but it costs 10% of your max Signal.'), t('bounce-buffer', 'Bounce Buffer', 'Deals the damage your shield absorbs back to the part that hit you.')],
      [t('denylist', 'Denylist', 'Increases Grudge\'s bonus from 20% to 30%.'), t('counterflow', 'Counterflow', 'Makes Retaliate also send back everything Blowback has stored, as a second hit, and empties it.'), t('dead-letter', 'Dead Letter', 'Stores a part\'s move for your next Blowback when you cut it, as if it had hit you.')],
      [t('uptime', 'Uptime', 'Leaves you at 1 Signal when a hit would drop you to 0. Works once per fight.'), t('honey-farm', 'Honey Farm', 'Makes Honeypot soften the next 2 hits on you instead of 1.'), t('heat-shield', 'Heat Shield', 'Shields you for 3 when one of your burns ticks.')],
      [t('kernel-panic', 'Kernel Panic', 'Increases your damage by 30% while you are below a third of your Signal.'), t('fail-fast', 'Fail-Fast', 'Makes Failover hit only the target, for double damage.'), t('retransmit', 'Retransmit', 'Makes Retaliate usable when you land a critical strike.')],
    ],
    // The capstone row (levels 45 and 50): pick one; its second rank comes at 50.
    capstones: [
      c('iron-curtain', 'Iron Curtain', ['The part that last hit you deals 15% less damage to you.', 'The part that last hit you deals 30% less damage to you.'], [0.15, 0.3]),
      c('eye-for-an-eye', 'Eye for an Eye', ['Each attack that hits you deals 40% of its damage back to the part that made it.', 'Each attack that hits you deals 80% of its damage back to the part that made it.'], [0.4, 0.8]),
    ],
  },
  sysop: {
    name: 'Sysop', role: ['Healer', 'Support'], idea: 'Keep everyone up, and the logs clean.', solo: 'Slow alone. Its hits are small, but it keeps itself standing.', crew: 'The healer: keeps the crew standing and undoes what the virus does.', lean: 'crew',
    chase: ['restore', 'clock'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { name: 'Overprovision', rule: 'Healing past full turns into a shield, up to 20.' },
    alone: 0.75, // alone (no crew), the Sysop's hits and burns deal this share: a healer levels slowly solo, and safely
    skills: ['checksum', 'reclaim', 'patch', 'heartbeat', 'scrub', 'multicast', 'rollback', 'maintenance-window', 'revoke', 'hot-standby', 'rebalance'],
    rotationCore: ['checksum', 'reclaim', 'purge', 'heartbeat'],
    presets: {
      rotation: ['rate-limit', 'checksum', 'reclaim', 'purge', 'heartbeat', 'scrub', 'patch', 'maintenance-window', 'rollback', 'retaliate', 'hot-standby', 'multicast', 'firewall'],
      healers: ['rate-limit', 'checksum', 'reclaim', 'purge', 'heartbeat', 'scrub', 'revoke', 'maintenance-window', 'rollback', 'patch', 'retaliate', 'multicast', 'firewall'],
    },
    layers: { core: ['rate-limit', 'checksum', 'reclaim', 'purge', 'retaliate'], utility: ['firewall', 'patch', 'heartbeat', 'scrub'], cooldown: ['rollback', 'maintenance-window', 'hot-standby'], specialist: ['multicast', 'revoke', 'rebalance'] },
    tags: { multicast: 'Fragments', revoke: 'Healers', rebalance: 'Crew', firewall: 'Crew' },
    // The talent tiers (docs/builds.md): one of three a tier, each opening at its level (LOADOUT.tiers). The first is
    // the plain pick, the middle changes how a skill plays, the third fires on a shared event (combat.mjs fireEvent).
    tiers: [
      [t('parity-bit', 'Parity Bit', 'Makes Checksum heal for half the damage it deals instead of a quarter.'), t('hot-fix', 'Hot Fix', 'Makes Firewall also heal you for 10.'), t('health-probe', 'Health Probe', 'Makes Checksum usable again when you gain a shield. Works once per cycle.')],
      [t('tick-rate', 'Tick Rate', 'Increases Heartbeat\'s heal by 3 every cycle.'), t('service-pack', 'Service Pack', 'Makes Patch heal its whole amount up front.'), t('health-check', 'Health Check', 'Ticks your Heartbeat on you once more when an attack hits you. Works once per cycle.')],
      [t('anycast', 'Anycast', 'Increases Multicast\'s heal by 8.'), t('ping-flood', 'Ping Flood', 'Makes Multicast also hit every part for what it heals each player.'), t('clean-slate', 'Clean Slate', 'Increases your next heal by 50% when you answer a tell.')],
      [t('critical-path', 'Critical Path', 'Increases your heals by 50% on anyone below a third of their Signal.'), t('redistribute', 'Redistribute', 'Makes Reclaim also heal the lowest crewmate as much as it heals you. Alone, it heals you twice as much.'), t('change-freeze', 'Change Freeze', 'Shields you and every crewmate for 8 when you cut a part\'s move.')],
      [t('overcommit', 'Overcommit', 'Lets Overprovision hold 40 shield instead of 20.'), t('revocation-list', 'Revocation List', 'Makes Revoke hit every part for half, and revoke them all for 2 cycles.'), t('trickle-charge', 'Trickle Charge', 'Heals the lowest player for 3 when one of your burns ticks.')],
      [t('high-availability', 'High Availability', 'Increases all your heals by 15%.'), t('graceful-restart', 'Graceful Restart', 'Makes Hot Standby also heal the player it saves to half their Signal.'), t('teardown', 'Teardown', 'Heals you and every crewmate for 10 when a part breaks.')],
    ],
    // The capstone row (levels 45 and 50): pick one; its second rank comes at 50.
    capstones: [
      c('root-cause', 'Root Cause', ['Your heals also deal 15% of their size as damage to the part that last hit you.', 'Your heals also deal 30% of their size as damage to the part that last hit you.'], [0.15, 0.3]),
      c('warm-standby', 'Warm Standby', ['You start each fight with a shield of 10% of your max Signal.', 'You start each fight with a shield of 20% of your max Signal.'], [0.1, 0.2]),
    ],
  },
};

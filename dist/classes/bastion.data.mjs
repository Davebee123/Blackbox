// Bastion subclasses: Warden and Sysop. Data only (no engine imports): the skills they add to
// ABILITIES, and each subclass's skill line, edge and talent tree. The engine side (what new skills do,
// talents, the edge, how the planner plays them) lives in ./bastion.mjs.
//
// A subclass is picked at level 10 (`subclass <id>`; switching is free, at home). Its skill line unlocks
// at SUBCLASS.unlocks in data.mjs (levels 10 to 38), in the order written here (eleven skills). Its talent tree has the same shape as
// before: three filler rows of two ranked nodes, and three tiers of two picks.
// edge.legacy: the class's old edge (EDGE in data.mjs), now this subclass's.
import { f, t } from './kit.mjs';

// New skills (ABILITIES entries, same fields as data.mjs). Give each a cls and a sub.
// Fields the engine reads generically: taunt (draw fire in a crew), once, ally. The rest (cut, cap,
// heal, tick, ticks, cycles) are read by ./bastion.mjs; heal and tick also scale in the skill text.
export const abilities = {
  // Warden: the tank. Draws fire, soaks it, sends it back.
  bulkhead: { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'Bulkhead', target: 'none', damage: 0, cut: 0.5, charged: 0.75, cycles: 2, taunt: 2, cooldown: 6, icon: 'shell-shield', short: 'Attacks half, charges ¼',
    help: 'bulkhead — For 2 cycles, attacks on you deal half damage, and a charged one a quarter. In a crew, every attack comes at you for those 2 cycles.',
    desc: 'Seal the bulkheads. This cycle and next, every attack that lands on you deals half damage, and a charged one only a quarter. With a crew, every attack comes at you instead of them for those 2 cycles.' },
  blowback: { cls: 'bastion', sub: 'warden', verb: 'hit', name: 'Blowback', target: 'part', damage: 0, cap: 70, chits: 2, cooldown: 3, icon: 'spike', short: 'Hits back all you soaked',
    help: 'blowback <part> — Deals damage equal to every attack that has hit you since your last Blowback, shields and cuts included, up to 70. Lights Retaliate for the next cycle. Breaks 2 ◆ on an armored part.',
    desc: 'Send it all back. Blowback hits a part for the full size of every attack that has hit you since your last Blowback, counting what your shields and cuts took off, up to 70, and Retaliate lights up for the next cycle. On armor it breaks 2 ◆.' },
  reject: { cls: 'bastion', sub: 'warden', verb: 'hit', name: 'Reject', target: 'part', damage: 28, guard: 10, scales: ['guard'], cooldown: 2, icon: 'interrupt', short: '28 damage; Grudge shields 10',
    help: 'reject <part> — Deals 28 damage to the target. Shields you for 10 if it is the part that last hit you.',
    desc: 'Refuse the connection and throw it back. Reject hits a part for 28, and if that part is the one that last hit you (your Grudge), you raise a 10 shield as you do it.' },
  'circuit-breaker': { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'Circuit Breaker', target: 'none', damage: 0, cycles: 3, most: 0.1, cooldown: 12, icon: 'event-lock', short: 'No hit over 10%, 3 cycles',
    help: 'circuit-breaker — For 3 cycles, no attack can take more than a tenth of your max Signal. The damage it stops is stored for your next Blowback.',
    desc: 'Trip the breaker before the surge. For 3 cycles no attack can take more than a tenth of your max Signal, however big or charged it is, and everything it would have dealt past that is stored for your next Blowback.' },
  honeypot: { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'Honeypot', target: 'none', damage: 0, cycles: 2, cut: 15, scales: ['cut'], cooldown: 6, icon: 'shell-shield', short: 'Next hit −15, eats scrambles',
    help: 'honeypot — For 2 cycles, the next hit on you deals 15 less, and a Scramble, a Possession or the Mimic\'s beat lands on the honeypot instead of you.',
    desc: 'Leave something sweet on the wire. For 2 cycles the next hit on you deals 15 less, and anything that wants your session instead of your Signal (a Scramble, a Possession, the Mimic\'s beat) goes after the honeypot and leaves you alone.' },
  dmz: { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'DMZ', target: 'none', damage: 0, cut: 0.3, minor: 0.1, cycles: 2, cooldown: 6, icon: 'event-lock', short: 'All take 30% less, 2 cycles',
    help: 'dmz — For 2 cycles, attacks deal 30% less to you and your crew. Fragment bites and hits under a tenth of your max do nothing, and a Replicate spawns nothing.',
    desc: 'Open a demilitarized zone around the crew. This cycle and next, every attack deals 30% less to you and to everyone fighting beside you, and the small stuff (fragment bites, hits under a tenth of your max) doesn\'t get in at all. A Replicate that lands inside it spawns nothing.' },
  // Sysop: the healer. Heals that spill into shields, and fixes for what a virus does to a crewmate.
  multicast: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Multicast', target: 'none', damage: 0, heal: 16, splash: 6, scales: ['splash'], cooldown: 4, icon: 'expand', short: 'Heals all 16; 6 to parts',
    help: 'multicast — Heals you and every crewmate for 16, and deals 6 damage to every part. Fragments take 16.',
    desc: 'One packet, every host. Multicast heals you and everyone fighting beside you for 16, and the same packet hits every part of the virus for 6 and floods every fragment for 16.' },
  checksum: { cls: 'bastion', sub: 'sysop', verb: 'hit', name: 'Checksum', target: 'part', damage: 24, share: 0.25, cooldown: 2, icon: 'server', short: '24 damage, heals a quarter',
    help: 'checksum <part> — Deals 24 damage and heals you for a quarter of the damage dealt. In a crew, it heals the lowest crewmate instead.',
    desc: 'Verify the part against a known good copy and repair what it took. Checksum hits for 24 and heals a quarter of what it dealt: you alone, or in a crew whoever is lowest.' },
  'maintenance-window': { cls: 'bastion', sub: 'sysop', verb: 'buff', name: 'Maintenance Window', target: 'none', damage: 0, cycles: 3, boost: 0.5, share: 0.25, cooldown: 12, icon: 'server', short: 'Heals +50%, hits heal',
    help: 'maintenance-window — For 3 cycles, your heals heal 50% more and your hits heal you for a quarter of the damage they deal.',
    desc: 'Take the system down for maintenance on your terms. For 3 cycles every heal you cast heals half again, and every hit you land heals you for a quarter of what it dealt. Plan it for the cycles a boss hits hardest.' },
  revoke: { cls: 'bastion', sub: 'sysop', verb: 'hit', name: 'Revoke', target: 'part', damage: 22, cycles: 4, weaken: 0.25, cooldown: 4, icon: 'event-lock', short: '22 damage; it hits −25%',
    help: 'revoke <part> — Deals 22 damage and revokes the target for 4 cycles. A revoked part\'s attacks deal 25% less, and a heal, patch or Self-Update it casts fails. A heal it casts on its own side heals you instead.',
    desc: 'Revoke the part\'s certificate. It takes 22 damage, and for 4 cycles its attacks deal 25% less and nothing it signs goes through: an armor patch fails, a Self-Update it is compiling stops, and a heal it casts on its own side lands on you instead.' },
  heartbeat: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Heartbeat', target: 'none', ally: true, damage: 0, tick: 4, ticks: 4, cooldown: 4, icon: 'server', short: 'Heal 4 ×4; charges −25%',
    help: 'heartbeat [name] — Heals you for 4 every cycle for 4 cycles, starting now. A charged hit on you deals 25% less while it runs. In a crew, heartbeat nyx heals nyx. A new Heartbeat replaces the old one.',
    desc: 'Keep the session alive. Heartbeat heals you or a crewmate for 4 every cycle for 4 cycles, starting this cycle, and while it beats, a charged hit on them deals 25% less. Put it up when a charge is winding up. A second Heartbeat on the same player replaces the first.' },
  scrub: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Scrub', target: 'none', ally: true, damage: 0, heal: 8, cooldown: 5, icon: 'clear', short: 'Cleanse, heal 8 or more',
    help: 'scrub [name] — Clears encryption, a Full Disk burst, Scrambled and Corrupted, and heals you for 8. Heals half again if it cleared something. In a crew, scrub nyx cleans nyx.',
    desc: 'Scrub the logs clean. Scrub clears encryption, Scrambled and Corrupted from you or a crewmate and heals them for 8, half again if there was something to clean.' },
  rollback: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Rollback', target: 'none', ally: true, damage: 0, cooldown: 6, icon: 'behavior', short: 'Undoes the last hit or cast',
    help: 'rollback [name] — Undoes the last attack that hurt you: it heals back all that attack dealt, or deletes the fragment it spawned. Clears Corrupted. Alone, it also undoes a cast that just compiled. In a crew, rollback nyx does it for nyx.',
    desc: 'Restore the last good state. Rollback undoes the last attack that hurt you or a crewmate: it heals back everything that attack did, or deletes the fragment it spawned, and wipes Corrupted. A cast the virus just compiled is rolled back too: its buff ends.' },
  'hot-standby': { cls: 'bastion', sub: 'sysop', verb: 'shield', name: 'Hot Standby', target: 'none', ally: true, damage: 0, once: true, cooldown: 0, icon: 'shell-shield', short: 'Holds you at 1, once a fight',
    help: 'hot-standby [name] — The next attack that would drop you to 0 leaves you at 1 instead. Once per fight. In a crew, hot-standby nyx covers nyx.',
    desc: 'Keep a spare running. Once per fight, put yourself or a crewmate on standby: the next attack that would drop them to 0 leaves them at 1 instead.' },
  rebalance: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Rebalance', target: 'none', damage: 0, heal: 6, cooldown: 6, icon: 'mutation', short: 'Evens the crew, heals 6',
    help: 'rebalance — Moves everyone in the fight to the crew\'s average share of their max Signal, then heals everyone for 6. Alone, it heals you for twice that.',
    desc: 'Spread the load. Rebalance moves everyone in the fight to the same share of their max Signal, the crew\'s average, and then heals everyone for 6. Alone, it heals you for 12.' },
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
    fillers: [
      [f('reverse-shell', 'Reverse Shell', 'Increases the damage of Retaliate by 5 per rank.', 5), f('deep-buffer', 'Deep Buffer', 'Increases the damage of Blowback by 10% per rank.', 0.1)],
      [f('hardened-kernel', 'Hardened Kernel', 'Reduces the damage you take from attacks by 3% per rank.', 0.03), f('stateful-firewall', 'Stateful Firewall', 'Increases the damage Firewall absorbs by 5 per rank.', 5)],
      [f('vendetta', 'Vendetta', 'Increases the bonus damage of Grudge by 5% per rank.', 0.05), f('token-bucket', 'Token Bucket', 'Increases the damage of Rate Limit by 4 per rank.', 4)],
    ],
    talents: [
      [t('tarpit', 'Tarpit', 'Suspend also Throttles the part until its attack lands.'), t('deep-packet-inspection', 'Deep Packet Inspection', 'Firewall absorbs 30 damage.')],
      [t('counterflow', 'Counterflow', 'Retaliate also sends back everything Blowback has stored.'), t('write-protect', 'Write Protect', 'Harden gives two ◆, but costs 10% of your max Signal.')],
      [t('uptime', 'Uptime', 'A hit that would drop you to 0 leaves you at 1 instead. Once per fight.'), t('kernel-panic', 'Kernel Panic', 'Your hits deal 30% more damage while you are below a third of your Signal.')],
    ],
  },
  sysop: {
    name: 'Sysop', role: ['Healer', 'Support'], idea: 'Keep everyone up, and the logs clean.', solo: 'Slow alone: small hits, though it keeps itself standing.', crew: 'The healer: keeps the crew standing and undoes what the virus does.', lean: 'crew',
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
    fillers: [
      [f('patch-notes', 'Patch Notes', 'Increases the healing of Patch by 3 per rank.', 3), f('fan-out', 'Fan-out', 'Increases the healing of Multicast by 3 per rank.', 3)],
      [f('reserve-pool', 'Reserve Pool', 'Increases the shield Overprovision holds by 5 per rank.', 5), f('redundancy', 'Redundancy', 'Increases your max Signal on runs by 4 per rank.', 4)],
      [f('tick-rate', 'Tick Rate', 'Increases the healing of each Heartbeat tick by 1 per rank.', 1), f('hardened-kernel', 'Hardened Kernel', 'Reduces the damage you take from attacks by 3% per rank.', 0.03)],
    ],
    talents: [
      [t('service-pack', 'Service Pack', 'Patch heals for 10 up front.'), t('ping-flood', 'Ping Flood', 'Multicast also deals damage to every part equal to what it heals.')],
      [t('critical-path', 'Critical Path', 'Your heals on anyone under a third of their Signal heal 50% more.'), t('redistribute', 'Redistribute', 'Reclaim heals the lowest crewmate as much as it heals you. Alone, it heals you twice as much.')],
      [t('overcommit', 'Overcommit', 'Overprovision holds twice as much shield.'), t('loopback', 'Loopback', 'Every heal you cast also heals you for a third of it.')],
    ],
  },
};

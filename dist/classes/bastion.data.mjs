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
  bulkhead: { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'Bulkhead', target: 'none', damage: 0, cut: 0.5, charged: 0.75, cycles: 2, taunt: 2, cooldown: 6, icon: 'shell-shield', short: 'Half 2; a charge a quarter',
    help: 'bulkhead — this cycle and next, attacks on you deal half, and a charged one a quarter. With a crew, every attack comes at you for those 2 cycles.',
    desc: 'Seal the bulkheads. This cycle and next, every attack that lands on you deals half damage, and a charged one only a quarter. With a crew, every attack comes at you instead of them for those 2 cycles.' },
  blowback: { cls: 'bastion', sub: 'warden', verb: 'hit', name: 'Blowback', target: 'part', damage: 0, cap: 70, chits: 2, cooldown: 3, icon: 'spike', short: 'Hit back all you soaked; lights Retaliate',
    help: 'blowback <part> — hits it for the full size of every attack that has hit you since your last Blowback, shields and cuts included, up to 70, and Retaliate is lit for the next cycle. On armor it breaks 2 ◆.',
    desc: 'Send it all back. Blowback hits a part for the full size of every attack that has hit you since your last Blowback, counting what your shields and cuts took off, up to 70, and Retaliate lights up for the next cycle. On armor it breaks 2 ◆.' },
  reject: { cls: 'bastion', sub: 'warden', verb: 'hit', name: 'Reject', target: 'part', damage: 28, guard: 10, scales: ['guard'], cooldown: 2, icon: 'interrupt', short: 'Hit 28; shield 10 on your Grudge',
    help: 'reject <part> — 28 damage. On the part that last hit you, you also shield 10.',
    desc: 'Refuse the connection and throw it back. Reject hits a part for 28, and if that part is the one that last hit you (your Grudge), you raise a 10 shield as you do it.' },
  'circuit-breaker': { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'Circuit Breaker', target: 'none', damage: 0, cycles: 3, most: 0.1, cooldown: 12, icon: 'event-lock', short: 'No hit over a tenth, 3 cycles',
    help: 'circuit-breaker — for 3 cycles, no attack can take more than a tenth of your max Signal from you. What it would have dealt past that goes into Blowback.',
    desc: 'Trip the breaker before the surge. For 3 cycles no attack can take more than a tenth of your max Signal, however big or charged it is, and everything it would have dealt past that is stored for your next Blowback.' },
  honeypot: { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'Honeypot', target: 'none', damage: 0, cycles: 2, cut: 15, scales: ['cut'], cooldown: 6, icon: 'shell-shield', short: 'Next hit −15; scrambles miss you',
    help: 'honeypot — for 2 cycles, the next hit on you deals 15 less, and a Scramble, a Possession or the Mimic\'s beat lands on the honeypot instead of you.',
    desc: 'Leave something sweet on the wire. For 2 cycles the next hit on you deals 15 less, and anything that wants your session instead of your Signal (a Scramble, a Possession, the Mimic\'s beat) goes after the honeypot and leaves you alone.' },
  dmz: { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'DMZ', target: 'none', damage: 0, cut: 0.3, minor: 0.1, cycles: 2, cooldown: 6, icon: 'event-lock', short: '−30%; no bites, no spawns',
    help: 'dmz — this cycle and next, attacks deal 30% less to you and everyone in your crew, fragment bites and hits under a tenth of your max do nothing, and a Replicate spawns nothing.',
    desc: 'Open a demilitarized zone around the crew. This cycle and next, every attack deals 30% less to you and to everyone fighting beside you, and the small stuff (fragment bites, hits under a tenth of your max) doesn\'t get in at all. A Replicate that lands inside it spawns nothing.' },
  // Sysop: the healer. Heals that spill into shields, and fixes for what a virus does to a crewmate.
  multicast: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Multicast', target: 'none', damage: 0, heal: 16, splash: 6, scales: ['splash'], cooldown: 4, icon: 'expand', short: 'Heal 16 all; parts 6, fragments 16',
    help: 'multicast — heals you and everyone in your crew for 16. Every part takes 6, and every fragment takes 16.',
    desc: 'One packet, every host. Multicast heals you and everyone fighting beside you for 16, and the same packet hits every part of the virus for 6 and floods every fragment for 16.' },
  checksum: { cls: 'bastion', sub: 'sysop', verb: 'hit', name: 'Checksum', target: 'part', damage: 24, share: 0.25, cooldown: 2, icon: 'server', short: 'Hit 24, heal a quarter',
    help: 'checksum <part> — 24 damage, and you heal a quarter of what it does. In a crew, the lowest crewmate heals instead.',
    desc: 'Verify the part against a known good copy and repair what it took. Checksum hits for 24 and heals a quarter of what it dealt: you alone, or in a crew whoever is lowest.' },
  'maintenance-window': { cls: 'bastion', sub: 'sysop', verb: 'buff', name: 'Maintenance Window', target: 'none', damage: 0, cycles: 3, boost: 0.5, share: 0.25, cooldown: 12, icon: 'server', short: 'Heals +50%, hits heal, 3 cycles',
    help: 'maintenance-window — for 3 cycles, your heals heal 50% more, and your hits heal you for a quarter of what they deal.',
    desc: 'Take the system down for maintenance on your terms. For 3 cycles every heal you cast heals half again, and every hit you land heals you for a quarter of what it dealt. Plan it for the cycles a boss hits hardest.' },
  revoke: { cls: 'bastion', sub: 'sysop', verb: 'hit', name: 'Revoke', target: 'part', damage: 22, cycles: 4, cooldown: 4, icon: 'event-lock', short: 'Hit 22; its heals and patches fail',
    help: 'revoke <part> — 22 damage. For 4 cycles a heal, patch or Self-Update it casts fails, and a heal it would have cast on its own side heals you instead.',
    desc: 'Revoke the part\'s certificate. It takes 22 damage, and for 4 cycles nothing it signs goes through: an armor patch fails, a Self-Update it is compiling stops, and a heal it casts on its own side lands on you instead.' },
  heartbeat: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Heartbeat', target: 'none', ally: true, damage: 0, tick: 4, ticks: 4, cooldown: 4, icon: 'server', short: 'Heal 4×4; a charge −25%',
    help: 'heartbeat [name] — heals you 4 a cycle for 4 cycles, starting now, and a charged hit on you while it runs deals 25% less. In a crew, heartbeat nyx does it for nyx. A new Heartbeat replaces the old one.',
    desc: 'Keep the session alive. Heartbeat heals you or a crewmate for 4 every cycle for 4 cycles, starting this cycle, and while it beats, a charged hit on them deals 25% less. Put it up when a charge is winding up. A second Heartbeat on the same player replaces the first.' },
  scrub: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Scrub', target: 'none', ally: true, damage: 0, heal: 8, cooldown: 5, icon: 'clear', short: 'Cleanse, heal 8 (12 if dirty)',
    help: 'scrub [name] — clears encryption (a Full Disk burst too), Scrambled and Corrupted from you, and heals you 8, or 12 if it cleared something. In a crew, scrub nyx does it for nyx.',
    desc: 'Scrub the logs clean. Scrub clears encryption, Scrambled and Corrupted from you or a crewmate and heals them for 8, half again if there was something to clean.' },
  rollback: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Rollback', target: 'none', ally: true, damage: 0, cooldown: 6, icon: 'behavior', short: 'Undo the last hit or cast',
    help: 'rollback [name] — undoes the last attack that hurt you (heals back all it did, or deletes the fragment it spawned) and clears Corrupted. Alone, it also undoes a cast that just compiled. In a crew, rollback nyx does it for nyx.',
    desc: 'Restore the last good state. Rollback undoes the last attack that hurt you or a crewmate: it heals back everything that attack did, or deletes the fragment it spawned, and wipes Corrupted. A cast the virus just compiled is rolled back too: its buff ends.' },
  'hot-standby': { cls: 'bastion', sub: 'sysop', verb: 'shield', name: 'Hot Standby', target: 'none', ally: true, damage: 0, once: true, cooldown: 0, icon: 'shell-shield', short: 'Hold at 1, once',
    help: 'hot-standby [name] — once per fight, the next attack that would drop you to 0 leaves you at 1 instead. In a crew, hot-standby nyx covers nyx.',
    desc: 'Keep a spare running. Once per fight, put yourself or a crewmate on standby: the next attack that would drop them to 0 leaves them at 1 instead.' },
  rebalance: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Rebalance', target: 'none', damage: 0, heal: 6, cooldown: 6, icon: 'mutation', short: 'Even out the crew, heal 6; alone 12',
    help: 'rebalance — evens out the Signal of everyone in the fight (each moves to the crew\'s average share of their max), then heals everyone 6. Alone, it heals you 12.',
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
      [f('reverse-shell', 'Reverse Shell', 'Retaliate hits +5 per rank.', 5), f('deep-buffer', 'Deep Buffer', 'Blowback deals +10% per rank.', 0.1)],
      [f('hardened-kernel', 'Hardened Kernel', 'Take 3% less damage from attacks per rank.', 0.03), f('stateful-firewall', 'Stateful Firewall', 'Firewall absorbs +5 per rank.', 5)],
      [f('vendetta', 'Vendetta', 'Grudge adds +5% more per rank.', 0.05), f('token-bucket', 'Token Bucket', 'Rate Limit +4 damage per rank.', 4)],
    ],
    talents: [
      [t('tarpit', 'Tarpit', 'Suspend also Throttles the part until its attack lands.'), t('deep-packet-inspection', 'Deep Packet Inspection', 'Firewall absorbs 30.')],
      [t('counterflow', 'Counterflow', 'Retaliate also sends back everything Blowback has stored.'), t('write-protect', 'Write Protect', 'Harden gives two ◆, but costs 10% of your max Signal.')],
      [t('uptime', 'Uptime', 'Once per fight, a hit that would drop you to 0 leaves you at 1.'), t('kernel-panic', 'Kernel Panic', 'Below a third of your Signal, your hits deal 30% more.')],
    ],
  },
  sysop: {
    name: 'Sysop', role: ['Healer', 'Support'], idea: 'Keep everyone up, and the logs clean.', solo: 'Slow alone: small hits, though it keeps itself standing.', crew: 'The healer: keeps the crew standing and undoes what the virus does.', lean: 'crew',
    chase: ['restore', 'clock'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { name: 'Overprovision', rule: 'Healing past full turns into a shield, up to 20.' },
    skills: ['checksum', 'reclaim', 'patch', 'heartbeat', 'scrub', 'multicast', 'rollback', 'maintenance-window', 'revoke', 'hot-standby', 'rebalance'],
    rotationCore: ['rate-limit', 'checksum', 'reclaim', 'purge'],
    presets: {
      rotation: ['rate-limit', 'checksum', 'reclaim', 'purge', 'heartbeat', 'scrub', 'patch', 'maintenance-window', 'rollback', 'retaliate', 'hot-standby', 'multicast', 'firewall'],
      healers: ['rate-limit', 'checksum', 'reclaim', 'purge', 'heartbeat', 'scrub', 'revoke', 'maintenance-window', 'rollback', 'patch', 'retaliate', 'multicast', 'firewall'],
    },
    layers: { core: ['rate-limit', 'checksum', 'reclaim', 'purge', 'retaliate'], utility: ['firewall', 'patch', 'heartbeat', 'scrub'], cooldown: ['rollback', 'maintenance-window', 'hot-standby'], specialist: ['multicast', 'revoke', 'rebalance'] },
    tags: { multicast: 'Fragments', revoke: 'Healers', rebalance: 'Crew', firewall: 'Crew' },
    fillers: [
      [f('patch-notes', 'Patch Notes', 'Patch heals +3 per rank.', 3), f('fan-out', 'Fan-out', 'Multicast heals +3 per rank.', 3)],
      [f('reserve-pool', 'Reserve Pool', 'Overprovision holds +5 more shield per rank.', 5), f('redundancy', 'Redundancy', '+4 max Signal on runs per rank.', 4)],
      [f('tick-rate', 'Tick Rate', 'Heartbeat heals +1 a cycle per rank.', 1), f('hardened-kernel', 'Hardened Kernel', 'Take 3% less damage from attacks per rank.', 0.03)],
    ],
    talents: [
      [t('service-pack', 'Service Pack', 'Patch heals 10 up front.'), t('ping-flood', 'Ping Flood', 'Multicast also hits every part for what it heals.')],
      [t('critical-path', 'Critical Path', 'Your heals on anyone under a third of their Signal heal 50% more.'), t('redistribute', 'Redistribute', 'Reclaim heals the lowest crewmate as much as it heals you. Alone, it heals you twice as much.')],
      [t('overcommit', 'Overcommit', 'Overprovision holds twice as much shield.'), t('loopback', 'Loopback', 'Every heal you cast also heals you for a third of it.')],
    ],
  },
};

// Skill text for the library: `desc` is an MMO-style tooltip in the style of `help` (docs/style-guide.md): a hacker verb in the
// third person, then plain mechanics (its numbers scale with level, like `short`). `lore` is one line of flavour. The fight's ability bar keeps `short`.
export const SKILL_TEXT = {
  spike: { desc: 'Spikes the target for 25 damage. With no target named, hits the last part you attacked.', lore: 'The first thing every hacker learns. Still works.' },

  // Breaker: break it before it breaks you.
  overload: { desc: 'Overclocks the target, dealing 40 damage. A critical strike resets the cooldown.', lore: 'Push the clock past spec and let the silicon scream.' },
  exploit: { desc: 'Exploits a hole in the target, dealing 15 damage and Exposing it for 2 cycles. Attacks against an Exposed target have a 25% higher chance to critically strike.', lore: 'Every system has a door somebody forgot to lock.' },
  crack: { desc: 'Cracks the target\'s casing, breaking 3 ◆.', lore: 'Hardened code is only hard until it isn’t.' },
  shatter: { desc: 'Shatters the target for 38 damage, and its shards deal 12 damage to every other part with no armor. Usable only for 1 cycle after you break the target\'s last ◆.', lore: 'Once the shell is gone, there’s nothing left to catch you.' },
  flood: { desc: 'Floods the target with garbage traffic, dealing 38 damage. Deals double damage to a target with no armor.', lore: 'Brute force is a strategy. An honest one.' },
  segfault: { desc: 'Crashes the target, dealing 30 damage. Deals triple damage to a target winding up a charge.', lore: 'Read past the end of the buffer and watch it fall over.' },
  'fork-bomb': { desc: 'Forks the virus to death, breaking 3 ◆ on every armored part and dealing 16 damage to every part with no armor. Fragments take triple damage.', lore: ':(){ :|:& };: — the oldest joke on the net.' },
  'thermal-runaway': { desc: 'Overheats the target, burning it for 4, 8, 12 and 16 damage over 4 cycles. Each tick counts as a hit against a cast the target is compiling.', lore: 'Disable the fans. Let the heat do the rest.' },
  brace: { desc: 'Braces for the hit, reducing the damage you take by 30% for 2 cycles. Attackers take twice the damage prevented.', lore: 'Plant your feet. Make it hurt to touch you.' },
  sudo: { desc: 'Takes root access for 2 cycles. Your hits pass through ◆, still breaking one each, and ignore locks and wards. Tripwires you break stay quiet, and Decoys and Mimics cannot copy you.', lore: 'You are not in the sudoers file. You are now.' },
  'zero-day': { desc: 'Fires an unpatched exploit at the target, dealing 65 damage and ignoring armor, locks and wards. Usable once per fight.', lore: 'An exploit nobody has seen. You only get to use it once.' },

  // Bastion: nothing lands unless you allow it.
  'rate-limit': { desc: 'Rate-limits the target, dealing 45 damage and halving its next attack. Deals 15 additional damage if the target attacks this cycle. Breaks 2 ◆ on an armored target.', lore: 'Packets per second: yours to decide. Everything over the limit waits, or drops.' },
  firewall: { desc: 'Raises a firewall that shields you from the next 16 damage. If it absorbs an entire hit, Retaliate becomes usable. In a crew, draws all attacks to you for 3 cycles.', lore: 'Default deny. Everything else asks permission.' },
  retaliate: { desc: 'Strikes back at the target for twice the damage of the last attack that hit you, up to 60. Usable only the cycle after you are hit.', lore: 'Every packet it sent you, it gets back with interest.' },
  suspend: { desc: 'Suspends the target\'s process, delaying its next attack by 2 cycles. A charged attack loses its charge. With no target named, delays the attack due soonest.', lore: 'Freeze the process mid-thought. Let it wonder.' },
  patch: { desc: 'Hot-patches the wound, healing for 4, then 2 every cycle for 3 cycles. In a crew, can target a crewmate.', lore: 'Hot-fix the wound while the fight is still live.' },
  throttle: { desc: 'Throttles the target, dealing 20 damage and halving its attack damage for 3 cycles. Against a loud part, lasts 6 cycles and silences it.', lore: 'Rate-limit the bastard down to a trickle.' },
  purge: { desc: 'Purges the target, burning it for 6 damage every cycle for 4 cycles and healing you for 2 with each tick. Removes encryption and Corrupted from you.', lore: 'Flush the infection. Keep what it was carrying.' },
  harden: { desc: 'Hardens your system, granting you 1 ◆. The next attack against you deals no damage.', lore: 'Strip the attack surface to bare metal.' },
  reclaim: { desc: 'Reclaims memory from the target, dealing 35 damage and healing you for 50% of the damage dealt. Breaks 2 ◆ on an armored target.', lore: 'Its memory was always yours. Take it back.' },
  quarantine: { desc: 'Quarantines the target, delaying its next attack by 3 cycles. The target takes 25% more damage until it attacks. Interrupts a cast it is compiling.', lore: 'Wall it off where it can’t hurt anyone. Then hurt it.' },
  failover: { desc: 'Fails over to backup, dealing damage to every part equal to 25% of your missing health (minimum 20).', lore: 'The worse it gets, the harder the backup swings.' },

  // Infiltrator: know where to hit, and slip through runs.
  inject: { desc: 'Injects a payload into the target, burning it for 12 damage every cycle for 3 cycles. Stacks up to 3 times on one part.', lore: 'By the time it notices, it’s already inside.' },
  tag: { desc: 'Tags the target, dealing 10 damage. For 4 cycles, burns on it deal 50% more damage, and its attack timer shows through a veil.', lore: 'Once you’re tagged, there is nowhere dark enough.' },
  backdoor: { desc: 'Slips in through a backdoor, dealing 24 damage to the target and ignoring armor. Deals 6 additional damage for each burn on it.', lore: 'Why knock when you left yourself a way in?' },
  keepalive: { desc: 'Sends a heartbeat down the wire. Every burn on the target ticks once immediately and lasts 2 cycles longer.', lore: 'Send a heartbeat down the wire and the session never times out.' },
  detonate: { desc: 'Detonates every burn on the target, dealing all their remaining damage at once, increased by 50%.', lore: 'All that patient poison, cashed in at once.' },
  opening: { desc: 'Exploits an opening in the target, dealing 50 damage. Usable only the cycle after an attack misses you or is delayed.', lore: 'It swung and missed. Now it’s wide open.' },
  propagate: { desc: 'Propagates your burns on the target to every other part.', lore: 'One infection is a problem. Many is an outbreak.' },
  'null-route': { desc: 'Null-routes incoming traffic. The next attack against you misses, and your next skill is a critical strike.', lore: 'Send its traffic into the void. Step out of the dark.' },
  implant: { desc: 'Implants a rootkit in the target, burning it for 10 damage every cycle until it breaks. The target cannot be healed or grow while burning. Usable once per fight.', lore: 'It lives in the kernel now. It isn’t leaving.' },

  // Operator: write the script, let it run.
  deploy: { desc: 'Deploys a helper that deals 12 damage to the target every cycle for 4 cycles. It moves to another part if the target breaks.', lore: 'Push to prod. Let it do the work.' },
  hook: { desc: 'Hooks the target, dealing 10 damage. For 4 cycles, every hit on it deals 6 additional damage, including helpers and burns.', lore: 'Intercept every call and add a little something.' },
  botnet: { desc: 'Points a botnet at the target: three small helpers that each deal 4 damage to it every cycle for 3 cycles.', lore: 'A thousand borrowed machines, all pointed one way.' },
  spawn: { desc: 'Spawns a small helper that deals 7 damage to the target every cycle for 3 cycles.', lore: 'Another child process, another pair of hands.' },
  jam: { desc: 'Jams the target, dealing 15 damage. If one of your helpers is on it, spends that helper to delay its attack 1 cycle.', lore: 'Throw a worker in the gears. It was built for that.' },
  'kill-switch': { desc: 'Pulls the kill switch. All your helpers deal their remaining damage at once, plus their Last Gasp.', lore: 'Pull the pin on everything you’ve got running.' },
  'garbage-collect': { desc: 'Collects the garbage, dealing 14 damage to every part and triple damage to fragments. Your helpers last 1 cycle longer.', lore: 'Clear the dead weight. Keep the good threads alive.' },
  fork: { desc: 'Forks your helpers. For 4 cycles, each ◆ they break spawns another helper on that part, up to your helper cap.', lore: 'Every process you spawn spawns its own.' },
  barrier: { desc: 'Recompiles one of your helpers on the target into a shield, worth all the damage it had left.', lore: 'Recompile the attacker into armor.' },
  reroute: { desc: 'Reroutes all your helpers to the target, each striking once on arrival.', lore: 'Change one route and the whole swarm turns.' },
  'cron-storm': { desc: 'Schedules a storm. Every helper you have running strikes twice this cycle.', lore: '* * * * * — everything, everywhere, all at once.' },
};

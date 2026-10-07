// Skill text for the library: `desc` is an MMO-style tooltip: a hacker verb, then plain mechanics (its numbers scale with
// level, like `short`), `lore` is one line of flavour. The fight's ability bar keeps `short`.
export const SKILL_TEXT = {
  spike: { desc: 'Spike a part, dealing 25 damage. With no target, hits the last part you hit.', lore: 'The first thing every hacker learns. Still works.' },

  // Breaker: break it before it breaks you.
  overload: { desc: 'Overclock a part, dealing 40 damage. Critical hits reset the cooldown.', lore: 'Push the clock past spec and let the silicon scream.' },
  exploit: { desc: 'For 2 cycles, open a hole in a part\'s defenses, increasing the chance to crit on that part by 25%.', lore: 'Every system has a door somebody forgot to lock.' },
  crack: { desc: 'Crack a part\'s armor, removing 3 ◆.', lore: 'Hardened code is only hard until it isn’t.' },
  shatter: { desc: 'Shatter a part, dealing 55 damage. Usable for 2 cycles after you strip a part\'s last armor.', lore: 'Once the shell is gone, there’s nothing left to catch you.' },
  flood: { desc: 'Flood a part with garbage traffic, dealing 30 damage. Deals double damage to parts with no armor.', lore: 'Brute force is a strategy. An honest one.' },
  segfault: { desc: 'Crash a part, dealing 30 damage. Deals triple damage to parts below 30% health.', lore: 'Read past the end of the buffer and watch it fall over.' },
  'fork-bomb': { desc: 'Flood every part, dealing 15 damage to each. Exposed parts take 30.', lore: ':(){ :|:& };: — the oldest joke on the net.' },
  'thermal-runaway': { desc: 'Overheat a part, burning it for 6 damage per cycle. The burn grows by 4 each cycle.', lore: 'Disable the fans. Let the heat do the rest.' },
  brace: { desc: 'For 2 cycles, gain 5 Block. Attackers lose 1 armor, or take 10 damage if they have none.', lore: 'Plant your feet. Make it hurt to touch you.' },
  sudo: { desc: 'Gain root access. For 2 cycles, all your hits are critical hits.', lore: 'You are not in the sudoers file. You are now.' },
  'zero-day': { desc: 'Unleash an unpatched exploit, dealing 80 damage that ignores armor. Once per fight.', lore: 'An exploit nobody has seen. You only get to use it once.' },

  // Bastion: nothing lands unless you allow it.
  'rate-limit': { desc: 'Hit a part for 30 damage (15 more if its attack is due this cycle) and Throttle its next attack to half. Breaks 2 ◆.', lore: 'Packets per second: yours to decide. Everything over the limit waits, or drops.' },
  firewall: { desc: 'Raise a firewall that absorbs 20 damage. Absorbing a full hit enables Retaliate. With a crew, every attack comes at you for 2 cycles.', lore: 'Default deny. Everything else asks permission.' },
  retaliate: { desc: 'Strike back at a part, dealing double the damage you just took (up to 60). Usable the cycle after you are hit.', lore: 'Every packet it sent you, it gets back with interest.' },
  suspend: { desc: 'Suspend a part, delaying its attack by 2 cycles. With no target, delays the next attack to land.', lore: 'Freeze the process mid-thought. Let it wonder.' },
  patch: { desc: 'Patch yourself, restoring 10 Integrity, then 5 per cycle for 3 cycles.', lore: 'Hot-fix the wound while the fight is still live.' },
  throttle: { desc: 'Throttle a part, reducing its attack damage by 50% for 3 cycles.', lore: 'Rate-limit the bastard down to a trickle.' },
  purge: { desc: 'Purge a part, dealing 6 damage per cycle for 4 cycles and restoring 2 Integrity per tick. Removes your encryption.', lore: 'Flush the infection. Keep what it was carrying.' },
  harden: { desc: 'Harden your system. The next attack against you deals no damage.', lore: 'Strip the attack surface to bare metal.' },
  reclaim: { desc: 'Reclaim memory from a part, dealing 35 damage and restoring half as Integrity.', lore: 'Its memory was always yours. Take it back.' },
  quarantine: { desc: 'Quarantine a part, delaying its attack by 3 cycles. It takes 25% more damage while delayed.', lore: 'Wall it off where it can’t hurt anyone. Then hurt it.' },
  failover: { desc: 'Fail over to backup, dealing damage to every part equal to 25% of your missing Integrity (minimum 20).', lore: 'The worse it gets, the harder the backup swings.' },

  // Infiltrator: know where to hit, and slip through runs.
  inject: { desc: 'Inject a payload into a part, dealing 8 damage per cycle for 3 cycles. Stacks up to 3 times.', lore: 'By the time it notices, it’s already inside.' },
  tag: { desc: 'Tag a part for 4 cycles. Burns on it deal 50% more damage, and its attack timer is always visible.', lore: 'Once you’re tagged, there is nowhere dark enough.' },
  backdoor: { desc: 'Enter through a backdoor, dealing 24 damage that ignores armor. Deals 6 extra damage per burn on the part.', lore: 'Why knock when you left yourself a way in?' },
  keepalive: { desc: 'Every burn on the part lasts 2 cycles longer.', lore: 'Send a heartbeat down the wire and the session never times out.' },
  detonate: { desc: 'Detonate every burn on a part, dealing all their remaining damage at once, increased by 50%.', lore: 'All that patient poison, cashed in at once.' },
  opening: { desc: 'Exploit an opening, dealing 50 damage. Usable the cycle after an attack misses you or is delayed.', lore: 'It swung and missed. Now it’s wide open.' },
  propagate: { desc: 'Copy every burn on a part to all other parts.', lore: 'One infection is a problem. Many is an outbreak.' },
  'null-route': { desc: 'Null-route incoming traffic. All attacks this cycle miss you, and your next skill is a critical hit.', lore: 'Send its traffic into the void. Step out of the dark.' },
  implant: { desc: 'Implant a rootkit, burning a part for 10 damage per cycle until it breaks. Once per fight.', lore: 'It lives in the kernel now. It isn’t leaving.' },

  // Operator: write the script, let it run.
  deploy: { desc: 'Deploy a helper that deals 12 damage per cycle to a part for 4 cycles. Moves on if the part breaks.', lore: 'Push to prod. Let it do the work.' },
  hook: { desc: 'Hook a part for 4 cycles. All damage it takes is increased by 6.', lore: 'Intercept every call and add a little something.' },
  botnet: { desc: 'Deploy three helpers that each deal 4 damage per cycle to a part for three cycles.', lore: 'A thousand borrowed machines, all pointed one way.' },
  spawn: { desc: 'Spawn a helper that deals 5 damage per cycle to a part for 3 cycles.', lore: 'Another child process, another pair of hands.' },
  jam: { desc: 'Recall a helper from a part to delay its attack by 1 cycle.', lore: 'Throw a worker in the gears. It was built for that.' },
  'kill-switch': { desc: 'All your helpers deal their remaining damage immediately.', lore: 'Pull the pin on everything you’ve got running.' },
  'garbage-collect': { desc: 'Deal 10 damage to every part and extend your helpers by 1 cycle.', lore: 'Clear the dead weight. Keep the good threads alive.' },
  fork: { desc: 'For 4 cycles, helper hits have a 15% chance to spawn another helper.', lore: 'Every process you spawn spawns its own.' },
  barrier: { desc: 'Recall a helper from a part and convert its remaining damage into a shield.', lore: 'Recompile the attacker into armor.' },
  reroute: { desc: 'Reroute all helpers to a part. Each hits it once on arrival.', lore: 'Change one route and the whole swarm turns.' },
  'cron-storm': { desc: 'All your helpers hit twice this cycle.', lore: '* * * * * — everything, everywhere, all at once.' },
};

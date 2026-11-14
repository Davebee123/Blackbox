// Legends (docs/legends.md): very rare, very strong level-50 uniques, each a rule built around one skill. Bench only:
// none drops (no sources, and they join UNIQUES only when registerLegends runs, which only the legends sim does).
// Each rule's code sits at its skill's own site in the engine, behind legend(s, id) (combat.mjs), which is false
// until registerLegends runs, so no fight changes without one equipped.
const BASE = { exploit: 'hypervisor-escape', proxy: 'covert-channel', shell: 'firmware-shell', script: 'metamorphic-engine', implant: 'firmware-rootkit' };
const STATS = {
  exploit: { primary: { damage: [102, 128] }, secondary: { crit: 12, critDamage: 24 } },
  proxy: { primary: { signal: 446, reduction: 12 }, secondary: { regen: 20, reduction: 4 } },
  shell: { primary: { signal: 223, regen: 48, restore: 96 }, secondary: { reduction: 6, restore: 24 } },
  script: { primary: { damage: 40, signal: 169, payload: 21 }, secondary: { payload: 12, clock: 8 } },
  implant: { primary: { damage: 25, signal: 123 }, secondary: { damage: 12, signal: 48 } },
};
// [id, name, for (a class or a subclass, or null for everyone), slot, rule]
const LIST = [
  ['flashover', 'Flashover', 'breaker', 'exploit', 'Overload always crits a part with no ◆.'],
  ['avalanche', 'Avalanche', 'demolitionist', 'exploit', 'Overkill has no cap, and a part it breaks spills its leftover again.'],
  ['positive-feedback', 'Positive Feedback', 'overclocker', 'script', 'Each ◆ you break refreshes your Momentum.'],
  ['bounce-message', 'Bounce Message', 'bastion', 'shell', 'When your shield soaks a whole hit, Retaliate fires that cycle for free.'],
  ['stress-test', 'Stress Test', 'warden', 'shell', 'Blowback has no cap, and a charged attack counts double toward it.'],
  ['headroom', 'Headroom', 'sysop', 'script', 'Overprovision has no cap. Each hit spends up to 10 shield to deal that much more.'],
  ['first-light', 'First Light', 'infiltrator', 'script', 'Each part you break opens a Surprise window on your next cycle.'],
  ['reinfection', 'Reinfection', 'payload', 'script', 'Up to 3 Injects on a part, each on its own clock. Inject cools a cycle slower.'],
  ['dead-angle', 'Dead Angle', 'phantom', 'proxy', 'Each attack that misses you makes Weak Spot fresh on every part.'],
  ['wakeup-call', 'Wakeup Call', 'operator', 'implant', 'When a helper expires, each of your daemons acts again (once a cycle).'],
  ['quine', 'Quine', 'herder', 'script', "An expiring helper starts a copy of itself at half damage. Copies don't copy."],
  ['crossed-wires', 'Crossed Wires', 'hijacker', 'script', "A Jammed part's next attack lands on the virus's other parts instead of you (half on a boss)."],
  ['sigkill', 'SIGKILL', null, 'implant', 'SIGINT is ready every 5 cycles.'],
  ['third-rail', 'Third Rail', null, 'implant', 'Every part has a third interrupt tick, at 75%.'],
  ['perfect-pitch', 'Perfect Pitch', null, 'implant', 'Sync Windows open twice as often.'],
  ['patch-gap', 'Patch Gap', 'demolitionist', 'exploit', 'Zero-Day readies again each time a part breaks.'],
  ['detonator-cord', 'Detonator Cord', 'demolitionist', 'script', 'Logic Bomb sits on every part at once, and one going off sets off the rest.'],
  ['red-zone', 'Red Zone', 'overclocker', 'exploit', 'Segfault on a part winding up a charge readies again at once.'],
  ['rate-card', 'Rate Card', 'bastion', 'exploit', "Throttle stacks: each Rate Limit halves the part's next attack again."],
  ['flatline', 'Flatline', 'warden', 'shell', 'Below a quarter of your Signal, Failover has no cooldown.'],
  ['bleach', 'Bleach', 'sysop', 'shell', "Scrub also bleaches a part: clears its buffs and casts, and its ◆ can't patch for 3 cycles."],
  ['long-tail', 'Long Tail', 'infiltrator', 'script', 'Implant is once a part instead of once a fight.'],
  ['pressure-cooker', 'Pressure Cooker', 'payload', 'exploit', 'Detonate leaves the burns running.'],
  ['knife-edge', 'Knife Edge', 'phantom', 'exploit', 'A Backstab crit makes Weak Spot fresh on its part.'],
  ['ulimit', 'Ulimit', 'operator', 'script', 'No helper cap.'],
  ['cron-farm', 'Cron Farm', 'herder', 'script', "Crontab runs once a part instead of once a fight; a new one doesn't replace the last."],
  ['instant-replay', 'Instant Replay', 'hijacker', 'exploit', "Replay plays back the last tell that hit you, at double, in place of the part's own attack."],
];
export const LEGENDS = LIST.map(([id, name, lean, slot, effectText]) => ({ id, name, base: BASE[slot], level: 50, ...STATS[slot], lean, slot, legend: true, effectText, sources: [], flavour: '' }));
// The engine's switch and the sim's counters: on once registered; fires[id] counts each time a legend's rule changes
// something in a fight (the sim reads and resets it).
export const LEG = { on: false, ids: new Set(LEGENDS.map((u) => u.id)), fires: {} };
export const legendFired = (id, n = 1) => { LEG.fires[id] = (LEG.fires[id] || 0) + n; };
// Put the legends into a UNIQUES table (combat.mjs's) and turn their rules on.
export function registerLegends(uniques) {
  for (const u of LEGENDS) uniques[u.id] = u;
  LEG.on = true;
}

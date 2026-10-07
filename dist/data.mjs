// BLACKBOX rules data. Every tunable number lives here; see GAME_RULES.md.
// Subclasses (level 10) live in dist/classes/<class>.data.mjs and join ABILITIES and ARCHETYPES below.
import * as BREAKER_SUBS from './classes/breaker.data.mjs';
import * as BASTION_SUBS from './classes/bastion.data.mjs';
import * as INFILTRATOR_SUBS from './classes/infiltrator.data.mjs';
import * as OPERATOR_SUBS from './classes/operator.data.mjs';
const CLASS_DATA = { breaker: BREAKER_SUBS, bastion: BASTION_SUBS, infiltrator: INFILTRATOR_SUBS, operator: OPERATOR_SUBS };

export const CONFIG = {
  // Heals you cast and damage over time (burns, helpers) keep this share of the +4% a level everything
  // else gets; the rest comes from gear (Restore, Payload), so a built healer or burn class outscales a bare one.
  healLevel: 0.5,
  dotLevel: 0.5,
  cycleMs: 8000, // default; players pick a speed below
  speeds: { relaxed: 12000, normal: 8000, fast: 5000 },
  // Server
  maxIntegrity: 100,
  scramble: { chance: 0.25, self: 0.5 }, // Ghostroot's Scrambler: while you're Scrambled, each attack may hit you instead, at half
  // Level gap, WoW-style: something above you takes less from you (−7% a level past the first,
  // never under 40%) and hits you harder (+10% a level past the first), so orange (3–4 up) is a
  // real fight and red a gamble.
  // Below you, a little the other way (3% a level, up to +15% dealt / −30% taken).
  gap: { dealt: 0.07, taken: 0.1, floor: 0.4, below: 0.03 },
  phaseBounce: 0.15, // Flicker: 15% of your command's hit on an out-of-phase part bounces back at you
  enrage: 1.3, // Bricker: a part under half Integrity hits this much harder
  linked: 0.33, // Linked parts (v2+): the share of a broken part's hit its survivor takes on (a half broke Breakers on v2 Ghostroots)
  startingCredits: 0, // you start broke: caches, kills and contracts pay
  // Topping up: Signal and server Integrity rest back slowly for free, or you pay to have them
  // full now. The price is for a full bar at your level; less missing costs less (at least 1).
  // Signal goes by your class level, Integrity by your server level.
  topUp: { signal: [8, 1.5], server: [10, 2] }, // [base, per level]
  // Crits: your hits crit at baseCrit% (+ Crit from protocols) for ×1.5. Enemy damage attacks
  // crit at enemyCrit (from enemy level 3; a brand-new server never sees one).
  baseCrit: 5,
  enemyCrit: 0.1,
  // Misses, Classic-style: against a same-level target, 5% of damaging hits miss; each level
  // the target is above you adds 1%, each level below takes 1% off (never under 0). Your
  // Accuracy (and the defender's Evasion) adjust it. A miss still spends the cooldown.
  misses: true,
  baseMiss: 5,
  maxMiss: 60,
  // Power: every level, players' and enemies' numbers grow 4% (level 1 = the base numbers).
  powerPerLevel: 0.04,
  // Enemy parts are tougher than one or two of your hits: fights run long enough that attacks
  // land, so gear and planning are what keep you standing.
  partToughness: 1.7,
  // Enemy hits also grow a little faster than your power, level by level: your kit and talents
  // keep up only if your gear and services do.
  enemyRamp: 0.03,
  // The monster pass (friction.mjs): fights on your Signal (runs, SPRAWL-00, rogue servers) are
  // tuned against the gear you're likely to have, so a level is a grind until an item lands.
  runHp: 1.4, // × part Integrity on top of partToughness
  runDamage: 2.1, // × enemy attacks
  thirdTrim: 0.85, // a family's third part (Lockbox, Mirror, Decoy) comes out of the other two's Integrity
  ward: 0.25, // Lockbox: the warded part loses at most this share of its max a cycle
  twinReboot: { in: 3, at: 0.4, max: 1 }, // Mirror: a twin reboots this many cycles later at 40% with its armor, once
  mirrorBounce: 0.3, // Decoy: a mirrored command does nothing and this share bounces back
  runEarly: [1, 1, 1.35, 1.5, 1.45, 1.45, 1.45, 1.45, 1.45, 1.45, 1.45, 1.45, 1.35, 1.25, 1.15, 1.05], // and this on top, by enemy level (1 past 16): levels 5–12 hit hardest, before gear catches up
  // ...and from level 10 a late step on top of that (linear between the points, flat after the last): your
  // subclass, talents, a fifth and sixth protocol slot and v2–v3 services outgrow the 4% a level, so without
  // it a same-level fight cost blues 30% at 10 and only 22–30% at 18–30. Bosses and elites keep their own
  // numbers (crew content is tuned for crews).
  runLate: [[9, 1], [10, 1.1], [18, 1.12], [30, 1.35]],
  xpEarly: { bonus: 0.15, full: 10, gone: 15 }, // levels up to 10 take 15% more XP, easing back to normal by 15
  // A broken part leaves salvage behind only sometimes.
  salvageChance: 0.35,
  maxMobLevel: 60,
  // Armor: a hit on an armored part does no damage and breaks one chit (a heavy hit from your
  // command, heavyHit or more, breaks two); this many cycles after its last chit breaks, a part
  // patches one chit back (unless you've broken it). Parts with 2+ chits wear half again as many.
  patchDelay: 5,
  heavyHit: 40,
  armorScale: 1.5,
  // Status
  exposedMultiplier: 1.5,
  exposedCycles: 2,
  weakMultiplier: 1.5,
  // Interrupt
  interruptDelay: 2,
  // Trace
  traceGain: 20,
  reactiveBonus: 1.5, // unused since Reactive was cut; kept so old saves don't break
  // Planning and daemons
  planLength: 3, // cycles you can queue ahead with ';'
  // Sync Window: a slice early in a cycle (always inside the first half), at a new spot each time.
  // It opens on 25% of cycles; the Sync protocol stat adds to that. Fire your command inside it
  // for +10% damage and your class's sync bonus (SYNC). About a second at the normal speed, and
  // forgiving: a press up to `grace` (of the cycle) either side of it still counts.
  // Auto-repeat and planned steps never sync.
  sync: { width: 0.1, grace: 0.03, from: 0.05, to: 0.5, bonus: 0.1, chance: 0.25 },
  // Infiltrator Surprise: the first cycle of every fight always opens a (blue, wider) window.
  // Fired in it: Inject lands an extra stack, Tag lasts 6 cycles and burns tick +75%,
  // Keepalive stretches burns 4 cycles.
  surprise: { width: 0.15, injectStacks: 2, tagCycles: 6, tagged: 1.75, keepalive: 4 },
  // Infiltrator Slip: walk past a guard without a fight, once a run (Leaked Creds: 3).
  slip: { perRun: 1, leakedCreds: 3 },
  daemonSlots: 1, // +1 at server levels 10 and 20; Operators +1
  // Runs
  depthThreat: 3, // guard threat added per depth below the first
  depthLoot: 0.4, // caches hold 40% more credits per layer down
  maxSignal: 100, // your health out in the net (it carries between connections and rests back up)
  cdCost: 1, // Signal spent per move between directories
  leadBase: 25, // lead progress every neutralized virus gives (four kills; a Route Logger adds more)
  cacheCredits: 30,
  hoardBonus: 0.5, // Hoard quirk: caches pay 50% more
  trapSignal: 10, // pulling honeypot bait
  // Worm fragments
  rearmMax: 3, // the Bouncer's Keyring re-arms this many times, then overheats
  fragmentIntegrity: 18, // no armor: one Spike breaks one
  fragmentDamage: 3,
  fragmentCap: 3,
  // Invasions (idle play): found locations send viruses home while you're logged on. Times
  // are logged-on time (a closed or hidden game doesn't advance them), except Degraded mode,
  // which runs on the real clock.
  invasion: {
    firstMs: 3 * 60000, // after your first location is found
    everyMs: [6 * 60000, 10 * 60000], // between one invader clearing and the next setting out
    travelMs: 2 * 60000, // from a layer-1 location; +1 minute per layer deeper
    perLayerMs: 60000,
    maxTickMs: 5000, // a long gap (closed tab, sleep) counts as this much
    // The wall: your Firewall rating vs the invader's strength (both 100 × power(level)).
    wall: 0.75, // rating with no Firewall service (the Firewall's versions set 1, 1.2, 1.45)
    block: 1.2, // rating/strength at or above: blocked at the wall
    breach: 0.8, // at or below: breach. In between: siege.
    mutated: 1.1, // a mutated invader is this much stronger
    chip: 1, // % of max Integrity a breach takes per minute (a siege less, down to 0 at the block line)
    grind: [4, 20], // % of the invader a siege wears down per minute, from the breach line to the block line
    blockedXp: 0.25, // share of a kill's XP when the wall stops one (plus one salvage)
    open: { pace: 0.4, reward: 1.5 }, // Open ports (online only): invasions 2.5× as often, each worth +50%
  },
  // Resting: between fights the server repairs itself, 2% of its max a minute (empty to full in
  // about 50 minutes), offline too. It stops while an invader is sieging or breaching your wall.
  // Or pay to top up (topUp above).
  restRegen: 0.02,
  signalRest: 0.2, // Signal back per minute at home, out of a fight: empty to full in 5 minutes, offline too
  booster: { restore: 0.5 }, // Signal booster (retired: no longer crafted; ones already carried still work on a run)
  // The rogue server: where you go to fight from the start. Viruses sit in its folders at
  // your level, up to level 3 (it's a starter area), and come back a while after you kill them. Signal carries between connections
  // (and rests back up like the server); you need a quarter of it to connect.
  zone: { id: 'sprawl', name: 'SPRAWL-00', respawnMs: 90000, minSignal: 0.25, maxLevel: 5, starterKills: 2, starterHit: 0.6, bossRespawnMs: 30 * 60000 }, // your first two kills: SPRAWL's hits land at 60% while you learn the board // SPRAWL follows you up to level 5 (a spawn now and then one higher); past that it's grey-ish filler
  relockMs: 30000, // any server but an outpost won't take you back for 30 seconds after you leave: no jack out, top up, return
  // Crash: the server reboots at half Integrity and runs degraded for 10 real minutes.
  reboot: 0.5,
  degradedMs: 10 * 60000,
};

// Every ability that works in a fight. Each does ONE thing (a verb):
//   hit (direct damage) · burn (damage every cycle) · stun (delays an attack)
//   debuff (makes a part easier to hurt, or weaker) · shield/heal · buff (you, for a while) · util
// Synergy comes from combining verbs (a debuff boosts every hit and every burn tick;
// burn ticks and helper hits count as hits for Hook), never from rules inside one skill.
// Keys are not fixed per skill: 1 is Spike, 2–8 your equipped skills, 9 SIGINT from level 10 (see keyMap).
// target: 'part' | 'attack' (a part with an attack; optional) | 'none'. pierce: goes through armor chits. bare: only on a part with no armor.
export const ABILITIES = {
  // cantrips: everyone
  sigint: { verb: 'stun', name: 'SIGINT', target: 'none', damage: 0, cooldown: 8, icon: 'interrupt', short: 'Interrupt a cast', help: 'sigint — interrupts the cast a crew boss is compiling (Compiling… on its row). Some casts can\'t be interrupted, and an interrupted boss casts its next one a cycle sooner. Ready every 8 cycles.' },
  spike: { verb: 'hit', name: 'Spike', target: 'part', damage: 25, cooldown: 0, icon: 'spike', short: 'Hit 25', help: 'spike <part> — 25 damage. If you type nothing, you Spike the last part you hit.' },
  // Every class skill is simple, with one twist: a burn (damage over cycles), a proc (something
  // you do lights up a key for a cycle or two), a reactive window (usable right after an event),
  // or an execute. proc: the event that opens it; window: how many cycles it stays lit.
  // Breaker: burst, crits, breaking armor
  overload: { cls: 'breaker', verb: 'hit', name: 'Overload', target: 'part', damage: 40, cooldown: 3, icon: 'overload', short: 'Hit 40, crit resets', help: 'overload <part> — 40 damage. If it crits, its cooldown resets.' },
  exploit: { cls: 'breaker', verb: 'debuff', name: 'Exploit', target: 'part', damage: 0, status: 'exposed', cycles: 1, cooldown: 2, icon: 'exploit', short: 'Exposed: +25% crit', help: 'exploit <part> — Exposed this cycle and next: every hit on it from anyone has +25% crit chance.' },
  crack: { cls: 'breaker', verb: 'debuff', name: 'Crack', target: 'part', damage: 0, strip: 3, cooldown: 3, icon: 'shell-shield', short: 'Strip 3 ◆', help: 'crack <part> — breaks 3 ◆ on it at once.' },
  shatter: { cls: 'breaker', verb: 'hit', name: 'Shatter', target: 'part', damage: 38, proc: 'stripped', window: 2, cooldown: 0, icon: 'overload', short: 'Hit 38 (after a strip)', help: 'shatter <part> — lights up for 2 cycles when you break a part\'s last ◆. 38 damage.' },
  flood: { cls: 'breaker', verb: 'hit', name: 'Flood', target: 'part', damage: 38, cooldown: 4, icon: 'overload', short: 'Hit 38, ×2 if bare', help: 'flood <part> — 38 damage, double on a part with no armor left.' },
  segfault: { cls: 'breaker', verb: 'hit', name: 'Segfault', target: 'part', damage: 30, execute: 3, cooldown: 3, icon: 'spike', short: 'Hit 30, ×3 below 30%', help: 'segfault <part> — 30 damage, three times that on a part under 30%.' },
  'fork-bomb': { cls: 'breaker', verb: 'hit', name: 'Fork Bomb', target: 'none', damage: 0, all: 15, cooldown: 3, icon: 'overload', short: 'Hit 15 all', help: 'fork-bomb — 15 damage to every part, 30 to an Exposed one.' },
  'thermal-runaway': { cls: 'breaker', verb: 'burn', name: 'Thermal Runaway', target: 'part', damage: 0, tick: 6, grow: 4, ticks: 4, cooldown: 4, icon: 'injector', short: 'Burn 6→18', help: 'thermal-runaway <part> — burns it for 6, then 10, 14 and 18.' },
  brace: { cls: 'breaker', verb: 'buff', name: 'Brace', target: 'none', damage: 0, cycles: 2, block: 5, cooldown: 5, icon: 'shell-shield', short: 'Block 5, crack back', help: 'brace — for 2 cycles: +5 Block, and whatever hits you loses a ◆ (or takes 10 if it has none).' },
  sudo: { cls: 'breaker', verb: 'buff', name: 'Sudo', target: 'none', damage: 0, cycles: 2, cooldown: 6, icon: 'behavior', short: 'Crit for 2', help: 'sudo — this cycle and next, every hit you land crits.' },
  'zero-day': { cls: 'breaker', verb: 'hit', name: 'Zero-day', target: 'part', damage: 65, pierce: true, once: true, cooldown: 0, icon: 'event-warning', short: 'Hit 65 through armor, once', help: 'zero-day <part> — 65 damage straight through armor. Once per fight.' },
  // Bastion: the battle cleric. Shields and heals that feed its hits.
  'rate-limit': { cls: 'bastion', verb: 'hit', name: 'Rate Limit', target: 'part', damage: 45, due: 15, chits: 2, status: 'throttled', cooldown: 3, icon: 'interrupt', short: 'Hit 45 (+15 if due), throttle', help: 'rate-limit <part> — 45 damage, +15 if its attack is due this cycle, and its next attack deals half (Throttled). On armor it breaks 2 ◆.' },
  firewall: { cls: 'bastion', verb: 'shield', name: 'Firewall', target: 'none', damage: 0, shield: 16, taunt: 3, cooldown: 4, icon: 'shell-shield', short: 'Shield 16, draw fire', help: 'firewall — shields you from the next 16 damage. If it soaks a whole hit, Retaliate lights up. With a crew, every attack comes at you for 3 cycles.' },
  retaliate: { cls: 'bastion', verb: 'hit', name: 'Retaliate', target: 'part', damage: 0, proc: 'struck', window: 1, cap: 60, cooldown: 0, icon: 'shell-shield', short: 'Hit back ×2', help: 'retaliate <part> — hits back for twice the size of the last attack that reached you (or your shield), up to 60, the cycle after.' },
  suspend: { cls: 'bastion', verb: 'stun', name: 'Suspend', target: 'attack', damage: 0, delay: 2, cooldown: 4, icon: 'interrupt', short: 'Delay 2', help: 'suspend [part] — SIGSTOP: push its attack back 2 cycles. With no part, the attack landing soonest.' },
  patch: { cls: 'bastion', verb: 'heal', name: 'Patch', target: 'none', damage: 0, heal: 4, pack: 10, tick: 2, ticks: 3, cooldown: 4, icon: 'server', short: 'Heal 4 + 2×3', help: 'patch [name] — heal 4 now, then 2 a cycle for 3 cycles. In a crew, patch nyx heals nyx instead.' },
  throttle: { cls: 'bastion', verb: 'debuff', name: 'Throttle', target: 'attack', damage: 0, status: 'throttled', cycles: 3, cooldown: 4, icon: 'interrupt', short: 'Weaken −50%', help: 'throttle [part] — its attacks deal half for 3 cycles.' },
  purge: { cls: 'bastion', verb: 'burn', name: 'Purge', target: 'part', damage: 0, tick: 6, ticks: 4, drain: 2, cooldown: 4, icon: 'clear', short: 'Burn 6×4, heal, decrypt', help: 'purge <part> — burns it for 6 a cycle for 4 cycles; each tick heals you 2. It also clears your encryption.' },
  harden: { cls: 'bastion', verb: 'shield', name: 'Harden', target: 'none', damage: 0, cooldown: 6, icon: 'shell-shield', short: 'Block next attack', help: 'harden — gain a ◆: the next attack on you does nothing, however big.' },
  reclaim: { cls: 'bastion', verb: 'hit', name: 'Reclaim', target: 'part', damage: 35, lifesteal: 0.5, chits: 2, cooldown: 3, icon: 'server', short: 'Hit 35, heal half', help: 'reclaim <part> — 35 damage, and you heal half of what it does. On armor it breaks 2 ◆.' },
  quarantine: { cls: 'bastion', verb: 'stun', name: 'Quarantine', target: 'attack', damage: 0, delay: 3, status: 'quarantined', cycles: 3, cooldown: 6, icon: 'event-lock', short: 'Delay 3, +25% dmg', help: 'quarantine [part] — push its attack back 3 cycles; while it waits, it takes +25% damage.' },
  failover: { cls: 'bastion', verb: 'hit', name: 'Failover', target: 'none', damage: 0, cooldown: 5, icon: 'event-warning', short: 'Hit all for missing/4', help: 'failover — hit every part for a quarter of your missing health (at least 20).' },
  // Infiltrator: burns and precision
  inject: { cls: 'infiltrator', verb: 'burn', name: 'Inject', target: 'part', damage: 0, tick: 12, ticks: 3, stacks: 3, cooldown: 1, icon: 'injector', short: 'Burn 12×3, stacks', help: 'inject <part> — 12 damage every cycle for 3 cycles. It stacks: up to 3 on one part, each with its own timer.' },
  tag: { cls: 'infiltrator', verb: 'debuff', name: 'Tag', target: 'part', damage: 0, status: 'tagged', cycles: 4, cooldown: 3, icon: 'weakness', short: 'Burns +50%, timer', help: 'tag <part> — for 4 cycles, burns on it tick 50% harder and its timer shows even if it is veiled.' },
  backdoor: { cls: 'infiltrator', verb: 'hit', name: 'Backdoor', target: 'part', damage: 24, pierce: true, perBurn: 6, cooldown: 4, icon: 'injector', short: 'Hit 24 thru armor, +6/burn', help: 'backdoor <part> — 24 damage straight through armor, +6 for each burn on it.' },
  keepalive: { cls: 'infiltrator', verb: 'util', name: 'Keepalive', target: 'part', damage: 0, cycles: 2, cooldown: 2, icon: 'injector', short: 'Burns +2 cycles', help: 'keepalive <part> — every burn on it lasts 2 cycles longer.' },
  detonate: { cls: 'infiltrator', verb: 'hit', name: 'Detonate', target: 'part', damage: 0, cooldown: 4, icon: 'event-warning', short: 'Burns now ×1.5', help: 'detonate <part> — every burn on it deals all its remaining damage now, ×1.5.' },
  opening: { cls: 'infiltrator', verb: 'hit', name: 'Opening', target: 'part', damage: 50, proc: 'slipped', window: 1, cooldown: 0, icon: 'behavior', short: 'Hit 50 (after a miss)', help: 'opening <part> — hits it for 50 the cycle after an attack misses you or is delayed.' },
  propagate: { cls: 'infiltrator', verb: 'util', name: 'Propagate', target: 'part', damage: 0, cooldown: 5, icon: 'mutation', short: 'Copy burns to all', help: 'propagate <part> — copy your burns on it to every other part.' },
  'null-route': { cls: 'infiltrator', verb: 'shield', name: 'Null Route', target: 'none', damage: 0, cooldown: 6, icon: 'behavior', short: 'Dodge one; next skill crits', help: 'null-route — the next attack misses you, and your next skill crits.' },
  implant: { cls: 'infiltrator', verb: 'burn', name: 'Rootkit Implant', target: 'part', damage: 0, tick: 10, ticks: 99, once: true, cooldown: 0, icon: 'injector', short: 'Burn 10 until it breaks', help: 'implant <part> — burns it for 10 every cycle until the part breaks. Once per fight.' },
  // Operator: helpers, and what you do with them
  deploy: { cls: 'operator', verb: 'burn', name: 'Deploy', target: 'part', damage: 0, helper: 12, ticks: 4, cooldown: 4, icon: 'command', short: 'Helper 12 ×4', help: 'deploy <part> — sends a helper to hit it for 12 every cycle for 4 cycles (it moves on if the part breaks).' },
  hook: { cls: 'operator', verb: 'debuff', name: 'Hook', target: 'part', damage: 0, status: 'hooked', cycles: 4, cooldown: 3, icon: 'injector', short: 'Hooked 4', help: 'hook <part> — Hooked for 4 cycles: every hit on it from anyone (helpers and burns too) gets +6.' },
  botnet: { cls: 'operator', verb: 'burn', name: 'Botnet', target: 'part', damage: 0, helper: 4, helpers: 3, ticks: 3, cooldown: 5, icon: 'command', short: '3 helpers 4 ×3', help: 'botnet <part> — three small helpers hit it for 4 each every cycle for 3 cycles.' },
  spawn: { cls: 'operator', verb: 'burn', name: 'Spawn', target: 'part', damage: 0, helper: 5, ticks: 3, cooldown: 1, icon: 'command', short: 'Helper 5 ×3', help: 'spawn <part> — sends a small helper to hit it for 5 every cycle for 3 cycles.' },
  jam: { cls: 'operator', verb: 'stun', name: 'Jam', target: 'attack', damage: 0, delay: 1, recall: true, cooldown: 2, icon: 'interrupt', short: 'Spend a helper: delay 1', help: 'jam <part> — pull one of your helpers off it to push its attack back a cycle.' },
  'kill-switch': { cls: 'operator', verb: 'hit', name: 'Kill Switch', target: 'none', damage: 0, cooldown: 3, icon: 'event-warning', short: 'Cash in helpers', help: 'kill-switch — your helpers deal all their remaining damage now.' },
  'garbage-collect': { cls: 'operator', verb: 'hit', name: 'Garbage Collect', target: 'none', damage: 0, all: 10, cooldown: 3, icon: 'clear', short: 'Hit 10 all, helpers +1', help: 'garbage-collect — 10 damage to every part, and your helpers last a cycle longer.' },
  fork: { cls: 'operator', verb: 'buff', name: 'Fork', target: 'none', damage: 0, cycles: 4, chance: 15, cooldown: 6, icon: 'expand', short: 'Helpers may split', help: 'fork — for 4 cycles, each helper hit has a 15% chance to start another helper (up to your helper cap).' },
  barrier: { cls: 'operator', verb: 'shield', name: 'Barrier', target: 'part', damage: 0, recall: true, cooldown: 3, icon: 'shell-shield', short: 'Spend a helper: shield', help: 'barrier <part> — pull one of your helpers off it: a shield worth all the damage it had left.' },
  reroute: { cls: 'operator', verb: 'util', name: 'Reroute', target: 'part', damage: 0, cooldown: 4, icon: 'command', short: 'Move helpers, each hits', help: 'reroute <part> — every helper moves to this part and hits it once on arrival.' },
  'cron-storm': { cls: 'operator', verb: 'hit', name: 'Cron Storm', target: 'none', damage: 0, cooldown: 6, icon: 'expand', short: 'Helpers hit twice', help: 'cron-storm — every helper hits twice this cycle.' },
};
// The subclasses' own skills (dist/classes/<class>.data.mjs).
for (const d of Object.values(CLASS_DATA)) Object.assign(ABILITIES, d.abilities);

// Daemons: small programs you find (daemon.exe in vaults, now and then from guards and kills).
// A slotted daemon acts on its own cooldown, in addition to your order. Finding one you have
// upgrades it (v1 → v3): its numbers ×1, ×1.5, ×2 (and grow with your power). `once`: fires
// by itself once per fight when its moment comes.
export const DAEMONS = {
  sweeper: { name: 'Sweeper', cooldown: 4, amount: 10, rule: 'Hits the part whose attack lands soonest for 10.' },
  fuzzer: { name: 'Fuzzer', cooldown: 5, rule: 'Breaks a ◆ on an armored part.' },
  stall: { name: 'Stall', cooldown: 6, rule: 'Pushes the attack landing soonest back a cycle.' },
  mender: { name: 'Mender', cooldown: 5, amount: 8, rule: 'Heals you 8.' },
  spider: { name: 'Spider', cooldown: 5, amount: 4, rule: 'Burns the part you last hit for 4 a cycle, for 3 cycles.' },
  mirror: { name: 'Mirror', cooldown: 3, amount: 12, rule: 'Hits the part you last hit for 12.' },
  watchman: { name: 'Watchman', once: true, amount: 20, rule: 'Once per fight: delays an attack of 20 or more by a cycle (v2: two cycles; v3: twice a fight).' },
  canary: { name: 'Canary', once: true, amount: 15, rule: 'Once per fight: shields you for 15 the first time you drop below half.' },
};
export const DAEMON_VERSIONS = [1, 1.5, 2];
export const DAEMON_DROPS = { vault: 0.1, guard: 0.01, home: 0.0025 };

// Shared numbers for statuses and passives.
export const SKILLS = {
  exposed: 25, // Exposed: +25% crit chance on hits against it (Breaker)
  tagged: 1.5, // Tagged: burns on it tick +50% (Infiltrator)
  quarantined: 1.25, // Quarantined: +25% damage while its attack is held (Bastion)
  helperCap: 6, // Operator: most helpers out at once
  hooked: 6, // Hooked: +6 per hit (Operator)
  throttled: 0.5, // Throttled: attacks deal half (Bastion)
  momentum: 0.1, // Breaker passive: +10% per part you break...
  momentumMax: 3, // ...up to 3 stacks (+30%)...
  momentumCycles: 2, // ...lasting 2 cycles after your last break (each break refreshes it)
  hardened: 1, // Bastion passive: damage hits each fight that land softer (a full block was too much)...
  hardenedCut: 0.25, // ...by this much (half kept Bastion far below the friction target)
  siphonSignalShare: 1, // Siphon heals Signal on runs, Integrity at home
  fixedCounter: 12,
};

// Attack effects: damage (Integrity or Signal), encrypt (a stack of damage every cycle until the
// Encryptor breaks), blind (your timeline goes dark for a few cycles), replicate (spawn a fragment).
// Damage is the threat: nothing a virus does takes credits, trace or files.
// Every virus is its parts: a basic attacker and a signature part, each small enough
// to break off in a hit or two once its armor is gone. Armor is chits on the part:
// a hit on an armored part does no damage and breaks one chit (armor-piercing hits go
// through). Attacks are rare and heavy, telegraphed well ahead: plan the takedown.
// `veiled` parts hide their attack timers while they still have armor.
export const FAMILIES = {
  ransomware: {
    name: 'Ransomware',
    threatens: 'Integrity',
    summary: 'Encrypts your server: every Encrypt adds damage each cycle until you break the Encryptor, which holds the key.',
    parts: [
      { id: 'pulse', name: 'Pulse Node', integrity: 34, armor: 1, loot: 'Pulse Kernel', attack: { name: 'Surge', effect: 'damage', amount: 14, interval: 4, first: 3 } },
      { id: 'encryptor', name: 'Encryptor', integrity: 38, armor: 1, loot: 'Cipher Seed', special: true, attack: { name: 'Encrypt', effect: 'encrypt', amount: 4, interval: 5, first: 4 } },
      // From level 3: the Lockbox wards the Encryptor (it can't lose more than a quarter of itself a cycle while the Lockbox lives).
      { id: 'lockbox', name: 'Lockbox', integrity: 16, armor: 0, loot: 'Lock Pin', ward: 'encryptor', from: 3 },
    ],
  },
  worm: {
    name: 'Worm',
    threatens: 'Integrity',
    summary: 'Spawns fragments that gnaw the server every cycle. The Replicator makes them.',
    parts: [
      { id: 'pulse', name: 'Pulse Node', integrity: 34, armor: 1, loot: 'Pulse Kernel', attack: { name: 'Surge', effect: 'damage', amount: 12, interval: 4, first: 4 } },
      { id: 'replicator', name: 'Replicator', integrity: 38, armor: 1, loot: 'Replication Seed', special: true, attack: { name: 'Replicate', effect: 'replicate', amount: 1, interval: 4, first: 3, hit: 4 } }, // a small Splice hit with each spawn
      // From level 3: the Mirror and the Replicator are twins. Break one while the other lives and it reboots.
      { id: 'mirror', name: 'Mirror', integrity: 18, armor: 1, loot: 'Mirror Shard', twin: 'replicator', from: 3, attack: { name: 'Splice', effect: 'damage', amount: 3, interval: 4, first: 3 } },
    ],
  },
  ghostroot: {
    name: 'Ghostroot',
    threatens: 'Integrity',
    summary: 'Veiled: its timers stay hidden while its parts are armored. The Scrambler hits you and scrambles you for 2 cycles: each of your attacks has a 25% chance to hit you instead, at half strength.',
    parts: [
      // The Scrambler carries the threat, not the Pulse: killing the Pulse first no longer halves the fight.
      { id: 'pulse', name: 'Pulse Node', integrity: 34, armor: 1, veiled: true, loot: 'Pulse Kernel', attack: { name: 'Surge', effect: 'damage', amount: 11, interval: 4, first: 3 } },
      { id: 'scrambler', name: 'Scrambler', integrity: 40, armor: 1, veiled: true, loot: 'Signal Key', special: true, attack: { name: 'Scramble', effect: 'scramble', amount: 2, hit: 9, interval: 4, first: 2 } },
      // From level 4: every 4th cycle the Decoy mirrors your commands. They do nothing, and some bounces back.
      { id: 'decoy', name: 'Decoy', integrity: 18, armor: 1, veiled: true, loot: 'Decoy Shell', reflect: 4, from: 4 },
    ],
  },
};

// Strains: variants of a home family, each built around one rule. They share their lineage's
// art, materials and leads. They live deeper in the network, never on SPRAWL-00: from its layer
// and its level on, a strain takes the place of the plain family about half the time in what a
// server sends (invaders, outpost natives, swarms). See the strains design doc.
const PULSE = (amount, first) => ({ id: 'pulse', name: 'Pulse Node', integrity: 34, armor: 1, loot: 'Pulse Kernel', attack: { name: 'Surge', effect: 'damage', amount, interval: 4, first } });
export const STRAINS = {
  keylogger: {
    lineage: 'ghostroot', from: 4, depth: 2, name: 'Keylogger',
    rule: 'A Sync Window opens every cycle. The Logger only takes damage from commands fired inside it; every command fired outside it is logged, and 3 logs come back as an 18-damage Dump. It Dumps on its own every 6 cycles too.',
    parts: [PULSE(12, 3), { id: 'logger', name: 'Logger', integrity: 30, armor: 1, loot: 'Logger Spool', special: true, syncOnly: true, attack: { name: 'Dump', effect: 'damage', amount: 18, interval: 6, first: 6, dump: true } }],
  },
  hashrat: {
    lineage: 'ransomware', from: 5, depth: 2, name: 'Hashrat',
    rule: 'While the Miner lives, your cooldowns tick down only every other cycle. Left alone, it Overclocks: 4 damage every 2 cycles.',
    parts: [PULSE(12, 3), { id: 'miner', name: 'Miner', integrity: 30, armor: 0, loot: 'Miner Rig', special: true, tax: true, attack: { name: 'Overclock', effect: 'damage', amount: 4, interval: 2, first: 2, alone: true } }],
  },
  floodgate: {
    lineage: 'worm', from: 6, depth: 2, name: 'Floodgate',
    rule: 'The Flooder hits every cycle, one harder each time; any delay resets it.',
    parts: [PULSE(12, 4), { id: 'flooder', name: 'Flooder', integrity: 28, armor: 0, loot: 'Flood Valve', special: true, attack: { name: 'Flood', effect: 'damage', amount: 2, interval: 1, first: 2, ramp: 1 } }],
  },
  leech: {
    lineage: 'worm', from: 8, depth: 2, name: 'Leech',
    rule: 'The Tap heals its most damaged part by everything its bite deals, and clears one burn from it.',
    parts: [PULSE(12, 4), { id: 'tap', name: 'Tap', integrity: 28, armor: 1, loot: 'Tap Fang', special: true, attack: { name: 'Siphon', effect: 'damage', amount: 8, interval: 3, first: 3, siphon: true } }],
  },
  sleeper: {
    lineage: 'ghostroot', from: 10, depth: 2, name: 'Sleeper', dormant: 6,
    rule: 'Dormant until you deal damage or cycle 6. When it wakes, the Cell sounds a 14-damage Alarm and the Pulse Node attacks a cycle sooner.',
    parts: [PULSE(14, 3), { id: 'cell', name: 'Cell', integrity: 32, armor: 1, loot: 'Cell Key', special: true, attack: { name: 'Alarm', effect: 'damage', amount: 14, interval: 5, first: 999, alarm: true } }],
  },
  // Wave 1b: six more for the early climb (levels 3–11), all from layer 2.
  patchwork: {
    lineage: 'worm', from: 3, depth: 2, name: 'Patchwork',
    rule: 'Every 3 cycles the Patcher heals the most damaged part by 12. Kill it first, or burst the other one down between patches.',
    parts: [PULSE(12, 4), { id: 'patcher', name: 'Patcher', integrity: 28, armor: 1, loot: 'Patch Kit', special: true, attack: { name: 'Patch', effect: 'heal', amount: 12, interval: 3, first: 3 } }],
  },
  flicker: {
    lineage: 'ghostroot', from: 4, depth: 2, name: 'Flicker',
    rule: 'The Shade is only there on even cycles. On odd cycles your hits pass straight through it, and 15% of the hit bounces back at you. It strikes when it is there.',
    parts: [PULSE(13, 3), { id: 'shade', name: 'Shade', integrity: 22, armor: 1, loot: 'Shade Lens', special: true, phase: true, attack: { name: 'Fade', effect: 'damage', amount: 5, interval: 2, first: 2 } }],
  },
  extortion: {
    lineage: 'ransomware', from: 6, depth: 2, name: 'Extortion',
    rule: 'The Demand winds up a 26-damage Deadline. Deal it 14 damage in the 2 cycles before it lands and the Deadline is called off.',
    parts: [PULSE(12, 3), { id: 'demand', name: 'Demand', integrity: 40, armor: 0, loot: 'Ransom Note', special: true, attack: { name: 'Deadline', effect: 'damage', amount: 26, interval: 5, first: 4, windup: 14 } }],
  },
  echo: {
    lineage: 'ghostroot', from: 8, depth: 2, name: 'Echo',
    rule: 'While the Echo lives, every hit you take repeats a cycle later at half damage, and it Reverbs for 6 every 4 cycles.',
    parts: [PULSE(14, 3), { id: 'echo', name: 'Echo', integrity: 30, armor: 1, loot: 'Echo Chamber', special: true, echo: true, attack: { name: 'Reverb', effect: 'damage', amount: 6, interval: 4, first: 3 } }],
  },
  bricker: {
    lineage: 'ransomware', from: 9, depth: 2, name: 'Bricker', enrage: true,
    rule: 'Each part hits 30% harder once it drops below half Integrity. Take parts from healthy to dead in one go.',
    parts: [PULSE(12, 3), { id: 'locker', name: 'Locker', integrity: 36, armor: 1, loot: 'Brick Key', special: true, attack: { name: 'Brick', effect: 'damage', amount: 10, interval: 3, first: 3 } }],
  },
  overrun: {
    lineage: 'worm', from: 11, depth: 2, name: 'Overrun',
    rule: 'The Hive spawns fragments that bite one harder every cycle they live. Clear them young, or kill the Hive.',
    parts: [PULSE(10, 4), { id: 'hive', name: 'Hive', integrity: 34, armor: 1, loot: 'Hive Comb', special: true, overrun: true, attack: { name: 'Swarm', effect: 'replicate', amount: 1, interval: 4, first: 2 } }],
  },
};
// The strains a family can field at a level, on a server this many layers deep.
export const strainsFor = (family, level, depth = 99) => Object.keys(STRAINS).filter((k) => STRAINS[k].lineage === family && level >= STRAINS[k].from && depth >= (STRAINS[k].depth || 2));
export const STRAIN_SHARE = 0.5;

// Grades: the same virus, bigger. Layer 1 servers send v1 (the starter numbers), layer 2 v2,
// layer 3 and deeper v3. Only the stats change: Integrity, attack damage, and at v3 one more
// armor chit on the basic part. (On top of the level a deeper server already adds.)
export const GRADES = { 1: { hp: 1, dmg: 1, armor: 0 }, 2: { hp: 1.15, dmg: 1.1, armor: 0 }, 3: { hp: 1.35, dmg: 1.25, armor: 0 } };
export const gradeFor = (depth) => Math.min(3, Math.max(1, depth || 1));
// What a server this deep sends: its grade, and maybe a strain (fixed by the seed).
export function variantFor(family, level, depth, seed) {
  const grade = gradeFor(depth);
  const pool = strainsFor(family, level, depth || 1), roll = rng((seed ^ 0x5bd1e995) >>> 0);
  const strain = pool.length && roll() < STRAIN_SHARE ? pool[Math.floor(roll() * pool.length)] : null;
  return { grade, strain };
}

// Guards found out in the net. Never picked for home intrusions. Lighter: you have 50 Signal.
export const GUARDS = {
  watchdog: {
    name: 'Watchdog',
    threatens: 'Signal',
    guard: true,
    art: 'watchdog',
    summary: 'Security daemon guarding a directory. The Tracker winds up one big hit.',
    parts: [
      { id: 'sentry', name: 'Sentry', integrity: 24, armor: 0, loot: 'Sentry Lens', attack: { name: 'Sweep', effect: 'damage', amount: 6, interval: 3, first: 2 } },
      { id: 'tracker', name: 'Tracker', integrity: 28, armor: 1, loot: 'Tracker Core', special: true, attack: { name: 'Trace-back', effect: 'damage', amount: 16, interval: 5, first: 4 } },
    ],
  },
  // Part ids match the Ghostroot art regions, so it draws as a veiled root creature.
  sentinel: {
    name: 'Sentinel',
    threatens: 'Signal',
    guard: true,
    art: 'ghostroot',
    summary: 'Veiled security daemon: its timers stay hidden while its parts are armored.',
    parts: [
      { id: 'pulse', name: 'Lens', integrity: 24, armor: 1, veiled: true, loot: 'Sentinel Lens', attack: { name: 'Glare', effect: 'damage', amount: 10, interval: 4, first: 3 } },
      { id: 'scrambler', name: 'Lockout', integrity: 24, armor: 1, veiled: true, loot: 'Lockout Relay', special: true, attack: { name: 'Lockout', effect: 'damage', amount: 7, interval: 3, first: 2 } },
    ],
  },
  // Worm-shaped guard: its Brood spawns fragments that gnaw your Signal.
  crawler: {
    name: 'Crawler',
    threatens: 'Signal',
    guard: true,
    art: 'worm',
    summary: 'Nesting guard. The Brood spawns fragments that gnaw your Signal every cycle.',
    parts: [
      { id: 'pulse', name: 'Maw', integrity: 24, armor: 0, loot: 'Crawler Maw', attack: { name: 'Bite', effect: 'damage', amount: 7, interval: 3, first: 2 } },
      { id: 'replicator', name: 'Brood', integrity: 28, armor: 1, loot: 'Brood Seed', special: true, attack: { name: 'Brood', effect: 'replicate', amount: 1, interval: 4, first: 3 } },
    ],
  },
  // Ransomware-shaped guard: the Shredder winds up one heavy strike.
  shredder: {
    name: 'Shredder',
    threatens: 'Signal',
    guard: true,
    art: 'ransomware',
    summary: 'Archive guard. The Shredder winds up one heavy strike on your Signal.',
    parts: [
      { id: 'pulse', name: 'Grinder', integrity: 26, armor: 1, loot: 'Grinder Core', attack: { name: 'Grind', effect: 'damage', amount: 9, interval: 4, first: 3 } },
      { id: 'encryptor', name: 'Shredder', integrity: 26, armor: 1, loot: 'Shredder Blade', special: true, attack: { name: 'Shred', effect: 'damage', amount: 14, interval: 5, first: 4 } },
    ],
  },
  // ICE: countermeasures that replace a Watchdog or Sentinel on layer 2 and deeper, about half
  // the time. Each has one rule (shown as a tag in the fight header).
  // Ransomware-shaped: the Keyring re-arms the Gate to full armor every 4 cycles.
  bouncer: {
    name: 'Bouncer',
    threatens: 'Signal',
    guard: true,
    ice: true,
    art: 'ransomware',
    rule: 'Every 4 cycles the Keyring re-arms the Gate to full armor, three times, then it overheats. Break the Keyring, or kill the Gate between re-arms.',
    summary: 'ICE on the door. The Keyring keeps re-arming the Gate.',
    parts: [
      { id: 'pulse', name: 'Gate', integrity: 30, armor: 3, loot: 'Gate Hinge', attack: { name: 'Ram', effect: 'damage', amount: 10, interval: 3, first: 2 } },
      { id: 'encryptor', name: 'Keyring', integrity: 22, armor: 1, loot: 'Keyring', special: true, rearm: 4 },
    ],
  },
  // Watchdog-shaped: the longer the fight, the harder the Trace-back.
  tracer: {
    name: 'Tracer',
    threatens: 'Signal',
    guard: true,
    ice: true,
    art: 'watchdog',
    rule: 'Its Trace-back grows every cycle the fight goes on. Race it.',
    summary: 'Trace ICE. Every cycle you spend, it gets closer.',
    parts: [
      { id: 'sentry', name: 'Probe', integrity: 22, armor: 0, loot: 'Probe Lens', attack: { name: 'Ping', effect: 'damage', amount: 4, interval: 2, first: 2 } },
      { id: 'tracker', name: 'Tracker', integrity: 28, armor: 1, loot: 'Trace Coil', special: true, attack: { name: 'Trace-back', effect: 'damage', amount: 6, interval: 3, first: 3, grow: 2 } },
    ],
  },
};

// Every mutation is visible from the start and changes a decision.
export const MUTATIONS = {
  armored: { name: 'Armored', rule: 'Every part has one more ◆.' },
  regenerative: { name: 'Regenerative', rule: 'A stripped part patches its armor a cycle sooner, so strip it only when you can finish it.' },
  hasty: { name: 'Hasty', rule: 'Every attack comes a cycle sooner and repeats a cycle faster, but its parts have 10% less Integrity, so kill it fast.' },
  rerouting: { name: 'Rerouting', rule: 'When a part breaks, a third of its attack damage reroutes to the surviving part that attacks next.', retired: true }, // every v2+ virus is Linked now (combat.mjs)
  adaptive: { name: 'Adaptive', rule: 'A part your commands hit three cycles in a row adapts: it gains a ◆ at the end of that cycle.' },
};

// The mutations a virus can roll (a retired one only lingers on old saves' viruses).
export const ROLLED_MUTATIONS = Object.keys(MUTATIONS).filter((k) => !MUTATIONS[k].retired);

export const FIXTURES = {
  cryptjack: { name: 'CRYPTJACK', family: 'ransomware', mutation: null, threat: 15 },
  splinter: { name: 'SPLINTER', family: 'worm', mutation: 'regenerative', threat: 14 },
  ghostroot: { name: 'GHOSTROOT', family: 'ghostroot', mutation: 'hasty', threat: 15 },
  watchdog: { name: 'WATCHDOG', family: 'watchdog', mutation: null, threat: 13 },
  sentinel: { name: 'SENTINEL', family: 'sentinel', mutation: null, threat: 13 },
  crawler: { name: 'CRAWLER', family: 'crawler', mutation: null, threat: 13 },
  shredder: { name: 'SHREDDER', family: 'shredder', mutation: null, threat: 13 },
  bouncer: { name: 'BOUNCER', family: 'bouncer', mutation: null, threat: 13 },
  tracer: { name: 'TRACER', family: 'tracer', mutation: null, threat: 13 },
};

const familyOf = (id) => FAMILIES[id] || GUARDS[id];

export const TICKER = ['SCRAP 14.22 +1.8%', 'ZERO-DAY 441.08 −3.1%', 'KESSLER NETWORK DENIES BREACH', 'BOUNTY: VANTA NODE / 850C', 'SECTOR 07: RELAY TRAFFIC UNUSUAL'];

function rng(seed) {
  let state = (seed ^ 0x9e3779b9) >>> 0;
  state = Math.imul(state ^ (state >>> 16), 0x21f0aaad) >>> 0;
  state = Math.imul(state ^ (state >>> 15), 0x735a2d97) >>> 0;
  return () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
}

export function makePart(spec, kind, scale, extraArmor = 0) {
  const max = Math.max(1, Math.round(spec.integrity * scale * (kind === 'fragment' ? 1 : CONFIG.partToughness)));
  const worn = (spec.armor || 0) + extraArmor;
  const armor = worn >= 2 ? Math.round(worn * CONFIG.armorScale) : worn; // 2 → 3, 3 → 5, 4 → 6
  return {
    id: spec.id,
    name: spec.name,
    kind,
    integrity: max,
    max,
    armor,
    maxArmor: armor,
    patchAt: null,
    veiled: !!spec.veiled,
    loot: spec.loot || null,
    special: !!spec.special,
    syncOnly: !!spec.syncOnly, // Keylogger's Logger: only commands fired in a Sync Window hurt it
    tax: !!spec.tax, // Hashrat's Miner: your cooldowns run at half speed while it lives
    phase: !!spec.phase, // Flicker's Shade: only there on even cycles
    echo: !!spec.echo, // Echo: every hit you take repeats next cycle at half
    overrun: !!spec.overrun, // Overrun's Hive: its fragments bite harder every cycle
    rearm: spec.rearm || 0, // Bouncer's Keyring: re-arms the other part every N cycles
    ward: spec.ward || null, // Lockbox: the part it wards loses at most CONFIG.ward of its max a cycle
    twin: spec.twin || null, // Mirror: its twin; break one while the other lives and it reboots
    reflect: spec.reflect || 0, // Decoy: every Nth cycle your commands are mirrored
    attack: spec.attack ? { ...spec.attack, due: spec.attack.first, amount: spec.attack.amount } : null,
    exposedUntil: 0,
    lastDamaged: 0,
    boosted: false,
  };
}

// What an enemy's level adds beyond size: an armor chit on the signature part at level 3
// and again at 7, one on the basic part at 13, and first attacks a cycle sooner from 15.
// (Threat = level + 9.) Home intrusions reach these as the server levels up; deep guards sooner.
export const THREAT_STEPS = { armor: [{ threat: 14, part: 'special' }, { threat: 16, part: 'special' }, { threat: 22, part: 'basic' }], sooner: 24 };

// Power at a level: 4% more per level from level 1 (players and enemies alike).
// The late step (CONFIG.runLate) at an enemy level: 1 up to the first point, linear between points, flat after.
export function runLate(level, pts = CONFIG.runLate) {
  if (!pts?.length || level <= pts[0][0]) return 1;
  for (let i = 1; i < pts.length; i++) if (level <= pts[i][0]) { const [a, x] = pts[i - 1], [b, y] = pts[i]; return x + ((y - x) * (level - a)) / (b - a); }
  return pts.at(-1)[1];
}
export const power = (level) => 1 + CONFIG.powerPerLevel * (Math.max(1, level) - 1);
// Enemies match you level for level (no soft start: the first fights should cost something).
export const mobPower = (level) => power(level) * 1;

// ---------- crew bosses (raid.mjs) ----------
// Each phase gives every role a job (docs/bosses.md has the review sheet). Mechanic kinds and their fields
// are in raid.mjs MECHANICS; size is a share of the victim's max Signal (scaled down before level 16).
// THE FOREMAN: the tank and interrupt check.
const FOREMAN = {
  targets: { pulse: 'aggro' },
  quiet: ['encryptor'], // its Encryptor's encryption is LAYOFFS now (a cast the crew can stop)
  enrage: { name: 'Mass Layoff', size: 0.2 },
  phases: [
    { from: 1, name: 'Day shift', mechs: [
      { id: 'pinkslip', kind: 'buster', name: 'Pink Slip', target: 'aggro', size: 0.9, every: 6, first: 4 },
      { id: 'bell', kind: 'pulse', name: 'Shift Bell', size: 0.1, every: 5, first: 3 },
      { id: 'payroll', kind: 'priority', name: 'Payroll Lockbox', hp: 0.07, ward: 0.75, fuse: 4, size: 0.3, every: 10, first: 2 },
      { id: 'scabs', kind: 'adds', name: 'Scab', target: 'marked', count: 2, hp: 0.02, hit: 0.07, every: 7, first: 6 },
      { id: 'clockin', kind: 'pulse', name: 'Clock In', cast: true, interrupt: true, size: 0.45, every: 5, first: 3 },
    ] },
    { from: 0.5, name: 'Layoffs', say: 'The Foreman starts the layoffs. LAYOFFS compiles every 5 cycles, and every PINK SLIP leaves Thermal Stress.', mechs: [
      { id: 'pinkslip', kind: 'buster', name: 'Pink Slip', target: 'aggro', size: 0.9, every: 6, first: 3, stress: true },
      { id: 'bell', kind: 'pulse', name: 'Shift Bell', size: 0.1, every: 5, first: 4 },
      { id: 'scabs', kind: 'adds', name: 'Scab', target: 'marked', count: 2, hp: 0.02, hit: 0.07, every: 7, first: 4 },
      { id: 'layoffs', kind: 'dot', name: 'Layoffs', target: 'crew', cast: true, interrupt: true, size: 0.08, lasts: 99, every: 5, first: 2 },
    ] },
  ],
};
// HEATSINK: the healer check.
const HEATSINK = {
  targets: { pulse: 'aggro', mirror: 'lowest' },
  enrage: { name: 'Thermal Runaway', size: 0.2 },
  quiet: ['replicator'], // its Replicator sends workers (the adds below) instead of fragments
  phases: [
    { from: 1, name: 'Warm loop', mechs: [
      { id: 'spike', kind: 'pulse', name: 'Thermal Spike', size: 0.06, grow: 0.012, every: 3, first: 3 },
      { id: 'overheat', kind: 'burst', name: 'Overheat', target: 'marked', size: 0.3, every: 5, first: 4 },
      { id: 'leak', kind: 'dot', name: 'Coolant Leak', target: 'marked', count: 1, size: 0.1, lasts: 99, every: 4, first: 2, from: 12 },
      { id: 'workers', kind: 'adds', name: 'Coolant Worker', target: 'marked', count: 2, hp: 0.025, hit: 0.05, every: 7, first: 5, source: 'replicator' },
      { id: 'stall', kind: 'dot', name: 'Fan Stall', target: 'crew', cast: true, interrupt: true, size: 0.06, lasts: 4, every: 8, first: 7 },
    ] },
    { from: 0.4, name: 'Meltdown', say: 'The Heatsink melts down. THERMAL SPIKE every 2 cycles, and COOLANT LEAK on two of you.', mechs: [
      { id: 'meltspike', kind: 'pulse', name: 'Thermal Spike', size: 0.06, grow: 0.008, every: 2, first: 2 },
      { id: 'overheat', kind: 'burst', name: 'Overheat', target: 'marked', size: 0.3, every: 5, first: 3 },
      { id: 'leak', kind: 'dot', name: 'Coolant Leak', target: 'marked', count: 2, size: 0.1, lasts: 99, spread: 3, every: 6, first: 2, from: 12 },
      { id: 'coremelt', kind: 'buster', name: 'Core Melt', target: 'aggro', size: 0.4, every: 5, first: 4 },
      { id: 'stall', kind: 'dot', name: 'Fan Stall', target: 'crew', cast: true, interrupt: true, size: 0.06, lasts: 4, every: 8, first: 5 },
    ] },
  ],
};
// COLDWALLET: the damage check, and everyone's.
const COLDWALLET = {
  targets: { pulse: 'aggro' },
  enrage: { name: 'Liquidation', size: 0.2 },
  phases: [
    { from: 1, name: 'Hot wallet', mechs: [
      { id: 'margin', kind: 'buster', name: 'Margin Call', target: 'aggro', size: 0.55, every: 4, first: 3 },
      { id: 'gas', kind: 'pulse', name: 'Gas Fee', size: 0.1, every: 4, first: 5 },
      { id: 'coldstorage', kind: 'shield', name: 'Cold Storage', amount: 0.12, window: 3, size: 0.35, every: 6, first: 4 },
      { id: 'rugpull', kind: 'pulse', name: 'Rug Pull', cast: true, interrupt: true, size: 0.3, every: 7, first: 6 },
    ] },
    { from: 0.5, name: 'Bank run', say: 'A bank run on the Coldwallet. WITHDRAWAL compiles every 5 cycles and can\'t be interrupted, and ENCRYPTED SECTORS lock up the healer.', mechs: [
      { id: 'margin', kind: 'buster', name: 'Margin Call', target: 'aggro', size: 0.55, every: 4, first: 3 },
      { id: 'withdrawal', kind: 'pulse', name: 'Withdrawal', cast: true, interrupt: false, size: 0.3, every: 5, first: 2 },
      { id: 'sectors', kind: 'absorb', name: 'Encrypted Sectors', target: 'healer', size: 0.3, every: 6, first: 3 },
      { id: 'coldstorage', kind: 'shield', name: 'Cold Storage', amount: 0.12, window: 3, size: 0.35, every: 6, first: 5 },
    ] },
  ],
};
// Elites: group content (a third of a Pit's folders, the trunk server's too). Much bigger, harder
// hitting and better armored; they pay three times the XP and roll for drops three times.
// Elites are crew rooms (WoW elites): very unlikely solo, three loot rolls, a blue at least, a small
// unique chance. Only in Pit folders, never on the way to anything you need.
// Bosses: a solo fight with phases. hp and dmg scale the whole virus; at each phase's share of its
// total Integrity it does something (re-arm every part, call in a Sentry, attack faster), and from
// enrageAt every attack lands every cycle, a quarter harder. healerDmg (optional): damage that steps up by
// level (runLate points). raid: a crew boss on the group boss framework (raid.mjs, the farm's three): its
// phases are mechanics with target rules and telegraphs, and its own parts hit softly (dmg).
export const BOSSES = {
  // The Resident (run.mjs /core): about two wins in three for a geared player at its level.
  resident: { name: 'Resident', hp: 1.4, dmg: 1, enrageAt: 18, phases: [{ at: 0.5, do: ['rearm'], say: 'The Resident re-arms every part.' }] },
  // RELAY-KING (run.mjs): a worm boss in SPRAWL-00's /net from level 3, back every half hour.
  relayking: { name: 'RELAY-KING', family: 'worm', hp: 1.6, dmg: 1, enrageAt: 16, phases: [{ at: 0.5, do: ['faster'], say: 'RELAY-KING speeds up: every attack comes a cycle sooner.' }] },
  // REPO MAN (events.mjs): the bounty from level 8.
  repoman: { name: 'REPO MAN', family: 'ransomware', hp: 1.6, dmg: 1, enrageAt: 18, phases: [{ at: 0.6, do: ['rearm'], say: 'REPO MAN re-arms every part.' }, { at: 0.3, do: ['faster'], say: 'REPO MAN gets desperate: every attack comes a cycle sooner.' }] },
  // HOLLOW CHOIR (events.mjs): a ghostroot boss from level 10. At half it splits off a second Decoy, on the off-beat.
  // KESSLER-FARM-00 (rogue.mjs FARM), the crew dungeon: crew bosses on the group boss framework (raid.mjs).
  // Sized for a crew of four (smaller crews get a smaller boss: crewHp in raid.mjs). Their own parts hit
  // softly (dmg) and go at whoever holds aggro; the danger is the mechanics, each a share of max Signal.
  foreman: { name: 'THE FOREMAN', family: 'ransomware', hp: 13, dmg: 0.45, enrageAt: 22, phases: [], raid: FOREMAN },
  heatsink: { name: 'HEATSINK', family: 'worm', hp: 15, dmg: 0.45, enrageAt: 25, phases: [], raid: HEATSINK },
  coldwallet: { name: 'COLDWALLET', family: 'ghostroot', hp: 8, dmg: 0.45, enrageAt: 18, phases: [], raid: COLDWALLET },
  choir: { name: 'HOLLOW CHOIR', family: 'ghostroot', hp: 1.6, dmg: 1, enrageAt: 16, phases: [{ at: 0.5, do: ['spawn:decoy'], say: 'The Hollow Choir splits off a second Decoy, on the off-beat: now it mirrors you two cycles in four.' }] },
};
export const ENRAGE = { dmg: 1.25, warn: 3 };
// A hot run (connect <server> +hot): friction you choose. Every fight on it has more Integrity and hits
// harder; every kill pays more XP and rolls for loot once more.
export const HOT_RUN = { hp: 1.25, dmg: 1.2, xp: 1.25, rolls: 1 };
// Each boss has two uniques of its own (content/items.mjs, source kind 'boss'): this chance a kill, and
// this much more for every kill that gave none (shown in the log and the collection).
export const BOSS_LOOT = { chance: 0.3, pity: 0.1 };
export const ELITE = { hp: 5.2, dmg: 1.3, armor: 1, xp: 3, rolls: 3, share: 1 / 3, floor: 'tuned', unique: 0.08, goneMs: 30 * 60000 }; // goneMs: an elite that beats you moves on, and its folder fills again this much later

// Build a virus from a named fixture or a seeded random variant.
export function createVirus(key = 'cryptjack', seed = 1, overrides = {}) {
  const next = rng(seed);
  const random = key === 'random';
  const fixture = FIXTURES[key];
  const forced = STRAINS[key] ? key : null;
  if (!random && !fixture && !forced) throw new Error('Unknown fixture ' + key);
  const homeFamilies = Object.keys(FAMILIES);
  const familyId = overrides.family || BOSSES[overrides.boss]?.family || (forced ? STRAINS[forced].lineage : random ? homeFamilies[Math.floor(next() * homeFamilies.length)] : fixture.family);
  const family = familyOf(familyId);
  const mutationIds = ROLLED_MUTATIONS;
  const rolled = random ? mutationIds[Math.floor(next() * mutationIds.length)] : forced ? null : fixture.mutation;
  const mutation = overrides.mutation !== undefined ? overrides.mutation : rolled;
  const threat = overrides.threat ?? (random ? 12 + Math.floor(next() * 9) : forced ? 13 : fixture.threat);
  const level = Math.max(1, threat - 9);
  // A strain (forced by key, or chosen by variantFor for deeper servers) and a grade.
  const strainId = forced || overrides.strain || null;
  const strain = strainId ? STRAINS[strainId] : null;
  const grade = GRADES[overrides.grade] ? overrides.grade : 1, g = GRADES[grade];
  const scale = mobPower(level) * (mutation === 'hasty' ? 0.9 : 1) * (overrides.run ? CONFIG.runHp : 1);

  // Tougher viruses wear more armor and strike sooner (see THREAT_STEPS).
  const extra = (spec) => (mutation === 'armored' ? 1 : 0) + THREAT_STEPS.armor.filter((x) => threat >= x.threat && (x.part === 'any' || (x.part === 'special') === !!spec.special)).length;
  // A family's third part joins wild viruses from its level (named fixtures stay as they are); the others give up some Integrity for it.
  const specs = (strain ? strain.parts : family.parts).filter((spec) => !spec.from || ((random || overrides.family) && level >= spec.from));
  const trim = specs.some((spec) => spec.from) ? CONFIG.thirdTrim : 1;
  const parts = specs.map((spec) => makePart(spec, 'system', scale * g.hp * (spec.from ? 1 : trim), extra(spec) + (spec.special ? 0 : g.armor)));
  const step = overrides.run ? (CONFIG.runEarly[level - 1] ?? 1) * (overrides.boss || overrides.elite ? 1 : runLate(level)) : 1;
  const dmgScale = mobPower(level) * (1 + CONFIG.enemyRamp * (level - 1)) * g.dmg * (overrides.run ? CONFIG.runDamage * step : 1);
  // Encryption stacks, so it skips the early-game and late steps (they would compound).
  for (const p of parts) if (p.attack && ['damage', 'encrypt'].includes(p.attack.effect)) p.attack.amount = Math.max(1, Math.round(p.attack.amount * dmgScale / (p.attack.effect === 'encrypt' ? step : 1)));
  for (const p of parts) if (p.attack?.effect === 'heal') p.attack.amount = Math.max(1, Math.round(p.attack.amount * scale * g.hp));
  for (const p of parts) if (p.attack?.hit) p.attack.hit = Math.max(1, Math.round(p.attack.hit * dmgScale)); // a special that also hits (the Scrambler)
  for (const p of parts) if (p.attack?.grow) p.attack.grow = Math.max(1, Math.round(p.attack.grow * dmgScale));
  for (const p of parts) if (p.attack?.windup) p.attack.windup = Math.max(1, Math.round(p.attack.windup * scale * g.hp));
  if (strain?.enrage) for (const p of parts) p.enrage = true;
  for (const p of parts) if (p.attack?.ramp) { p.attack.rampBy = Math.max(1, Math.round(p.attack.ramp * dmgScale)); p.attack.step = 0; }
  const sooner = (mutation === 'hasty' ? 1 : 0) + (threat >= THREAT_STEPS.sooner ? 1 : 0);
  for (const p of parts) if (p.attack && p.attack.due < 900) p.attack.due = Math.max(2, p.attack.due - sooner); // never on cycle 1: you always get a move first
  // Hasty also repeats faster (at least every 2 cycles), so it stays a pressure mutation at every level.
  if (mutation === 'hasty') for (const p of parts) if (p.attack?.interval) p.attack.interval = Math.max(2, p.attack.interval - 1);
  // A dormant strain's attacks wait off the timeline until it wakes.
  if (strain?.dormant) for (const p of parts) if (p.attack) { p.attack.wake = Math.max(1, p.attack.due - 1); p.attack.due = 999; }

  if (overrides.elite) for (const p of parts) {
    p.max = p.integrity = Math.round(p.max * (overrides.eliteHp ?? ELITE.hp));
    p.armor = p.maxArmor = p.maxArmor + ELITE.armor;
    if (p.attack && ['damage', 'encrypt'].includes(p.attack.effect)) p.attack.amount = Math.max(1, Math.round(p.attack.amount * ELITE.dmg));
    if (p.attack?.hit) p.attack.hit = Math.max(1, Math.round(p.attack.hit * ELITE.dmg));
    if (p.attack?.rampBy) p.attack.rampBy = Math.max(1, Math.round(p.attack.rampBy * ELITE.dmg));
  }
  // A boss (BOSSES): bigger and a little harder; its phases and enrage timer ride on the virus.
  const boss = BOSSES[overrides.boss] || null;
  if (boss) for (const p of parts) {
    p.max = p.integrity = Math.round(p.max * (overrides.bossHp ?? boss.hp));
    const dmg = boss.dmg * (boss.healerDmg ? runLate(level, boss.healerDmg) : 1);
    for (const k of ['amount', 'hit', 'rampBy']) if (p.attack?.[k] && (k !== 'amount' || ['damage', 'encrypt'].includes(p.attack.effect))) p.attack[k] = Math.max(1, Math.round(p.attack[k] * dmg));
  }
  const weakPoint = parts[Math.floor(next() * parts.length)].id;
  const tagNo = String(seed >>> 0).slice(-4).padStart(4, '0');
  const name = (overrides.elite ? 'ELITE ' : '') + (strain ? strain.name.toUpperCase() + '-' + tagNo : random ? family.name.toUpperCase() + '-' + tagNo : fixture.name) + (grade > 1 ? ` v${grade}` : '');
  // Enemy damage can crit, from level 3 (like mutations).
  const crit = level >= SERVER.mutationsFrom ? CONFIG.enemyCrit : 0;
  return { id: familyId + '-' + seed, name, family: familyId, strain: strainId, grade, dormant: strain?.dormant ? true : false, art: family.art || familyId, mutation, threat, level, power: dmgScale * (overrides.elite ? ELITE.dmg : 1), hpPower: scale, crit, threatens: family.threatens, parts, weakPoint, weakKnown: false, ...(overrides.elite ? { elite: true } : {}), ...(boss ? { boss: overrides.boss, phases: boss.phases.map((x) => ({ ...x, done: false })), enrageAt: boss.enrageAt } : {}) };
}

// ---------- locations ----------

const OWNERS = ['KESSLER', 'VANTA', 'HALVARD', 'ORIN', 'MOTHWELL', 'SABLE'];
const NODES = ['RELAY', 'CACHE', 'MIRROR', 'SINK', 'DEPOT', 'SPUR'];
const WORDS = ['saltmarsh', 'bluejay', 'kiln', 'ferrous', 'parallax', 'marrow', 'lantern', 'quarry'];

export const TEMPLATES = ['relay', 'mailhub', 'mirror', 'archive', 'lab'];

// Every location carries its family's quirk: one visible rule, like a mutation.
export const QUIRKS = {
  hoard: { family: 'ransomware', name: 'Hoard', rule: 'Caches pay 50% more, but the guards are Armored.' },
  nest: { family: 'worm', name: 'Nest', rule: 'An extra /nest folder holds a Crawler and its brood. It is optional, but it is good for salvage.' },
  hidden: { family: 'ghostroot', name: 'Hidden', rule: 'Something is stashed in a hidden folder, and ls -a shows it.' },
};
export const quirkOf = (family) => Object.keys(QUIRKS).find((k) => QUIRKS[k].family === family) || null;
export const MONTHS = ['jan', 'feb', 'mar'];

export function createLocation(family, seed, depth = 1) {
  const next = rng(seed * 7 + 3);
  const pick = (list) => list[Math.floor(next() * list.length)];
  const owner = pick(OWNERS);
  const node = pick(NODES);
  const others = Object.keys(FAMILIES).filter((f) => f !== family);
  return {
    id: `${owner}-${node}-${String(seed % 100).padStart(2, '0')}`.toLowerCase(),
    name: `${owner}-${node}-${String(seed % 100).padStart(2, '0')}`,
    family,
    seed,
    owner,
    password: pick(WORDS) + String(10 + Math.floor(next() * 89)),
    deeper: pick(others),
    template: TEMPLATES[Math.floor(next() * TEMPLATES.length)],
    quirk: quirkOf(family),
    month: MONTHS[Math.floor(next() * MONTHS.length)],
    depth,
    state: { cleared: {}, unlocked: {}, taken: {} },
    runs: 0,
  };
}

// The server levels from everything the crew does for it: defending it and banking loot.
// Its level opens daemon slots, sets how tough intrusions are, and when service versions open.
// The server levels with everyone: it gets every bit of XP any hacker earns, plus a little for
// banked loot. Its level sets its base Integrity and opens daemon slots.
// Each layer of the net has a level band: servers found there sit inside it (EverQuest/WoW zone ranges).
export const BANDS = [[1, 9], [7, 18], [16, 28], [26, 40], [38, 50]];
// Your layer: the deepest one whose band you've reached.
export const layerFor = (level) => BANDS.reduce((d, [lo], i) => (level >= lo ? i + 1 : d), 1);
export const SERVER = {
  maxLevel: 50,
  xpToNext: (level) => xpToNext(level),
  xp: { item: 10, creditsPer: 10 }, // banking: 10 per item, 1 per 10 credits
  // Enemies have a level. Home intrusions come in at your level; a location keeps the level
  // it was found at: your level on any layer whose band holds it, otherwise 2 more per layer
  // deeper, kept inside the layer's band (a deeper layer sits ahead of you, a shallower one behind).
  layerFor,
  locationLevel: (hackerLevel, depth) => {
    const [lo, hi] = BANDS[Math.min(BANDS.length, Math.max(1, depth || 1)) - 1];
    if (hackerLevel >= lo && hackerLevel <= hi) return hackerLevel;
    return Math.min(hi, Math.max(lo, hackerLevel + 2 * ((depth || 1) - layerFor(hackerLevel))));
  },
  guardLevel: (level, depth) => level + 3 * (depth - 1), // (old saves without a location level)
  mutationsFrom: 3, // enemy crits start here
  // How often a virus at a level is mutated: none below 4, a quarter to level 9, then 40% (wild ones,
  // invasions; swarms are a little under). The difficulty steps at level 3 no longer all land at once.
  mutationChance: (level) => (level < 4 ? 0 : level < 10 ? 0.25 : 0.4),
  daemonSlotsAt: [10, 20], // +1 daemon slot at each of these server levels
  // Threat is the level on the internal scale that sizes a virus (4% per point from 15).
  threat: (mobLevel) => 9 + mobLevel,
};

// ---------- classes, skills, levels and talents ----------
// Each class levels on its own, from 1 to 50, a long WoW-style climb. Every level adds 4%
// power; skills unlock along the way (the bar is full at 18, the last skill at 38); a talent
// point every other level from 10 (21 by level 50, a full tree).
export const LOADOUT = { equipSlots: 7, maxLevel: 50, talentFrom: 10, talentEvery: 2, trialUntil: 5, specFrom: 5, specRanks: 2 }; // spec: at level 5 pick one of your class's two first-row talents, worth specRanks free ranks // trialUntil: until a class reaches it, switching carries your level over
// What unlocks at each hacker level (same shape for every class; `order` fills the skill steps).
export const UNLOCKS = [
  { level: 1, what: 'spike' }, { level: 1, what: 0 }, { level: 3, what: 1 }, { level: 5, what: 2 },
  // Your 4th skill (Crack, Retaliate, Backdoor, Botnet) comes before Backtrace: armor needs an answer early.
  { level: 7, what: 3 }, { level: 10, what: 'edge' }, // the edge comes with your subclass; its skills at SUBCLASS.unlocks
  { level: 10, what: 'sigint' }, // everyone's interrupt, for crew bosses' casts (raid.mjs)
];
// XP: a kill is worth 20 + 10 per enemy level. Level L to L+1 takes about 5 + 1.2×L kills of
// your own level (6 at level 1, 27 at 18, 64 at 49): an MMO-length climb, 1,700 fights to 50.
export const killXp = (level) => 20 + 10 * Math.max(1, level);
const early = (c, L) => 1 + c.bonus * Math.min(1, Math.max(0, (c.gone - L) / (c.gone - c.full)));
export const xpToNext = (level) => Math.round(killXp(level) * (5 + 1.2 * level) * early(CONFIG.xpEarly, level));
// WoW-style: enemies above you give a little more, ones below give less, 10 levels below nothing.
export const xpScale = (gap) => (gap >= 0 ? 1 + 0.05 * Math.min(gap, 5) : Math.max(0, 1 + 0.1 * gap));
// Other XP, as shares of a kill at that level.
export const XP = { home: 1, guard: 0.8, vault: 1.5, newLocation: 0.7 };
// The talent tree, top to bottom: filler rows (ranked, up to 3 each) between the
// three choice tiers. A row opens once you've spent `need` points in the rows above it.
export const TREE = [
  { kind: 'filler', row: 0, need: 0 },
  { kind: 'choice', tier: 0, need: 3 },
  { kind: 'filler', row: 1, need: 4 },
  { kind: 'choice', tier: 1, need: 8 },
  { kind: 'filler', row: 2, need: 9 },
  { kind: 'choice', tier: 2, need: 14 },
];
const f = (id, name, rule, per) => ({ id, name, rule, per, max: 3 });
export const CANTRIPS = [
  { key: '1', id: 'spike', name: 'Spike', rule: 'Hit 25. If you type nothing, you Spike the last part you hit.' },
  { key: '9', id: 'sigint', name: 'SIGINT', rule: 'Interrupts the cast a crew boss is compiling. Some casts can\'t be interrupted, and an interrupted boss casts its next one a cycle sooner. It\'s ready every 8 cycles.' },
];
// Edge: each class's signature passive, from level 10 (the root of its talent tree).
export const EDGE = {
  // sub: since subclasses, the old edge belongs to one of them (edge(s, cls) in combat.mjs checks it).
  breaker: { name: 'Overkill', rule: 'When your hit breaks a part, the damage left over spills onto the next part (up to 20).', cap: 20, sub: 'demolitionist' },
  bastion: { name: 'Grudge', rule: 'The part that last hit you takes +20% from your hits.', bonus: 0.2, sub: 'warden' },
  infiltrator: { name: 'Weak Spot', rule: 'Your first hit on each part\'s bare code crits (not through armor).', sub: 'phantom' },
  operator: { name: 'Last Gasp', rule: 'Each helper hits once more as it expires.', sub: 'herder' },
};
// Sync Window bonuses: each class syncs its own way.
export const SYNC = {
  breaker: { amount: 1, rule: 'Cracks an extra ◆ on the part you hit.' },
  bastion: { amount: 8, rule: 'Shields you for 8.' },
  infiltrator: { amount: 1, rule: 'Stretches your burns on the part you hit by a cycle.' },
  operator: { amount: 1, rule: 'Makes each helper hit once more.' },
};
// Shared statuses: each class makes one; anyone's hits cash it in.
export const STATUSES = {
  exposed: { name: 'Exposed', by: 'Breaker', rule: 'Every hit on it from anyone has +25% crit chance.' },
  tagged: { name: 'Tagged', by: 'Infiltrator', rule: 'Burns on it from anyone tick 50% harder; its timer shows even if it is veiled.' },
  throttled: { name: 'Throttled', by: 'Bastion', rule: 'Its attacks deal half.' },
  hooked: { name: 'Hooked', by: 'Operator', rule: 'Every hit from anyone (helpers and burns too) gets +6.' },
};
const t = (id, name, rule) => ({ id, name, rule });
const sentence = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const card = (id) => ({ id, name: ABILITIES[id]?.name || id, rule: sentence(ABILITIES[id]?.help.replace(/^[^—]*— /, '') || ''), verb: ABILITIES[id]?.verb || 'util' });
const RUN_SKILLS = {
  spoof: { id: 'spoof', name: 'Spoof', rule: 'On runs: once per run, the next guarded folder doesn\'t start a fight. Read and pull one file there.', verb: 'run' },
  tap: { id: 'tap', name: 'Tap', rule: 'On runs: once per run, print the whole folder tree, its guards, and which file holds the key.', verb: 'run' },
};
const skillsOf = (ids) => ids.map((id) => RUN_SKILLS[id] || card(id));
// A class's subclasses, from its module: skill cards for their lines, plus their trees and edge.
const subsOf = (cls) => Object.fromEntries(Object.entries(CLASS_DATA[cls].subs).map(([id, x]) => [id, { ...x, id, cls, cards: skillsOf(x.skills) }]));
export const ARCHETYPES = {
  breaker: {
    name: 'Breaker', role: ['DPS', 'Burst'], idea: 'Break it before it breaks you.', solo: 'Fastest kills.', crew: 'Opens damage windows for everyone.',
    status: 'exposed',
    passive: { name: 'Momentum', rule: 'Each part you break: +10% damage for 2 cycles, up to 3 stacks. Another break refreshes it.' },
    core: ['overload', 'flood', 'exploit', 'crack'], // levels 1–7; the rest of a kit is its subclass's (subs)
    spec: [f('overclocked', 'Overclocked Core', '+3% damage per rank.', 0.03), f('chain-exploit', 'Chain Exploit', 'Momentum +2% per stack per rank.', 0.02)], // the level-5 specialty: one of these, two free ranks
    subs: subsOf('breaker'),
    skills: [], // every skill the class can have, core and both subclasses (filled in below)
  },
  bastion: {
    name: 'Bastion', role: ['Tank', 'Healer'], idea: 'Nothing lands unless you allow it.', solo: 'Survives anything.', crew: 'The tank and healer.',
    status: 'throttled',
    passive: { name: 'Hardened', rule: 'The first damage hit on you each fight deals 25% less.' },
    core: ['rate-limit', 'firewall', 'purge', 'retaliate'], // levels 1–7; the rest of a kit is its subclass's (subs)
    spec: [f('patch-notes', 'Patch Notes', 'Patch heals +3 per rank.', 3), f('stateful-firewall', 'Stateful Firewall', 'Firewall absorbs +5 per rank.', 5)], // the level-5 specialty: one of these, two free ranks
    subs: subsOf('bastion'),
    skills: [], // every skill the class can have, core and both subclasses (filled in below)
  },
  infiltrator: {
    name: 'Infiltrator', role: ['DPS', 'Damage over time', 'Stealth runs'], idea: 'Know where to hit, and slip through runs.', solo: 'Precision damage and the easiest runs.', crew: 'Tags targets and gets the crew past guards.',
    status: 'tagged',
    passive: { name: 'Ghost', rule: 'Slip past one guard a run without a fight. Every fight opens with a blue Surprise window: Inject, Tag and Keepalive fired in it hit harder. Return trips on runs are free.' },
    core: ['inject', 'backdoor', 'keepalive', 'tag'], // levels 1–7; the rest of a kit is its subclass's (subs)
    spec: [f('heap-spray', 'Heap Spray', 'Inject +2 per tick per rank.', 2), f('recon', 'Recon', 'Opening +5 damage per rank.', 5)], // the level-5 specialty: one of these, two free ranks
    subs: subsOf('infiltrator'),
    skills: [], // every skill the class can have, core and both subclasses (filled in below)
  },
  operator: {
    name: 'Operator', role: ['Support', 'Summoner'], idea: 'Write the script, let it run.', solo: 'Steady damage without constant input.', crew: 'Makes everyone’s hits count for more.',
    status: 'hooked',
    passive: { name: 'Extra thread', rule: '+1 daemon slot.' },
    core: ['deploy', 'hook', 'spawn', 'botnet'], // levels 1–7; the rest of a kit is its subclass's (subs)
    spec: [f('thread-pool', 'Thread Pool', 'Deploy helpers deal +1 per rank.', 1), f('kernel-hook', 'Kernel Hook', 'Hooked parts take +1 more per hit per rank.', 1)], // the level-5 specialty: one of these, two free ranks
    subs: subsOf('operator'),
    skills: [], // every skill the class can have, core and both subclasses (filled in below)
  },
};
// Skills in unlock order for a class; the first seven fill the bar by level 18.
// Subclasses: picked at SUBCLASS.from (when the edge used to come); each has its own skill line,
// unlocking at SUBCLASS.unlocks in the order its module writes them, its own edge and talent tree.
export const SUBCLASS = { from: 10, unlocks: [12, 14, 18, 22, 26, 30, 34, 38] };
// Every subclass by id (ids are unique across classes): { id, cls, name, edge, skills, cards, fillers, talents }.
export const SUBS = Object.fromEntries(Object.values(ARCHETYPES).flatMap((a) => Object.values(a.subs).map((x) => [x.id, x])));
// The class that never picked one plays its old-edge subclass (EDGE[cls].sub) until it does.
export const defaultSub = (arch) => EDGE[arch]?.sub || Object.keys(ARCHETYPES[arch].subs)[0];
for (const a of Object.values(ARCHETYPES)) {
  const seen = new Set();
  a.skills = skillsOf([...a.core, ...Object.values(a.subs).flatMap((x) => x.skills)].filter((id) => !seen.has(id) && seen.add(id)));
}
// A kit's skills in unlock order: the class's core, then its subclass's line (none before you pick).
export const skillOrder = (arch, sub = null) => [...ARCHETYPES[arch].core, ...(sub && ARCHETYPES[arch].subs[sub] ? ARCHETYPES[arch].subs[sub].skills : [])];
export const startingSkills = (arch) => skillOrder(arch).slice(0, LOADOUT.equipSlots);
// Level at which a class learns a skill or cantrip. A subclass skill: at its place in that subclass's
// line (with no subclass named, the first of the class's lines that has it).
export function unlockLevel(arch, id, sub = null) {
  const i = ARCHETYPES[arch].core.indexOf(id);
  const u = UNLOCKS.find((x) => (i >= 0 ? x.what === i : x.what === id)); // the core, the cantrips, the edge
  if (u) return u.level;
  const subs = sub ? [ARCHETYPES[arch].subs[sub]].filter(Boolean) : Object.values(ARCHETYPES[arch].subs);
  for (const x of subs) { const j = x.skills.indexOf(id); if (j >= 0) return SUBCLASS.unlocks[j] ?? Infinity; }
  return Infinity;
}

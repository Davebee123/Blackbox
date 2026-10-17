// BLACKBOX rules data. Every tunable number lives here; see GAME_RULES.md.
// Subclasses (level 10) live in dist/classes/<class>.data.mjs and join ABILITIES and ARCHETYPES below.
import * as BREAKER_SUBS from './classes/breaker.data.mjs';
import * as BASTION_SUBS from './classes/bastion.data.mjs';
import * as INFILTRATOR_SUBS from './classes/infiltrator.data.mjs';
import * as OPERATOR_SUBS from './classes/operator.data.mjs';
const CLASS_DATA = { breaker: BREAKER_SUBS, bastion: BASTION_SUBS, infiltrator: INFILTRATOR_SUBS, operator: OPERATOR_SUBS };
// Viruses are built from genes (genes.mjs) and written by authors (authors.mjs): docs/genome.md.
import { GENES, partGenes } from './genes.mjs';
import { crewOf, buildAuthor, bossAuthor } from './authors.mjs';

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
  // The third parts that change the fight (FAMILIES, pool 'third'; GAME_RULES.md Families):
  mutex: { share: 0.25, every: 4 }, // Mutex: the part it locks carries a shield of a quarter of its max, back to full 4 cycles after it breaks
  tripwire: { loud: 1.25 }, // Tripwire: break it while the others live and they hit 25% harder, each attack a cycle sooner
  c2: { gnaw: 0.5 }, // C2 Node: while it lives, fragments gnaw 50% harder; break it and they drop with it
  runEarly: [1, 1, 1.35, 1.5, 1.45, 1.45, 1.45, 1.45, 1.45, 1.45, 1.45, 1.45, 1.35, 1.25, 1.15, 1.05], // and this on top, by enemy level (1 past 16): levels 5–12 hit hardest, before gear catches up
  // ...and from level 10 a late step on top of that (linear between the points, flat after the last): your
  // subclass, talents, a fifth and sixth protocol slot and v2–v3 services outgrow the 4% a level, so without
  // it a same-level fight cost blues 30% at 10 and only 22–30% at 18–30. Bosses and elites keep their own
  // numbers (crew content is tuned for crews).
  runLate: [[9, 1], [10, 0.95], [18, 1], [30, 1.2]], // lower than it was (1.1, 1.12, 1.35): a tell you let land costs more now (TELL)
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
  // Fired in it: Inject ticks once at once (on top of its cycle's tick), Tag lasts 6 cycles and burns
  // tick +75%, Keepalive stretches burns 4 cycles.
  surprise: { width: 0.15, injectNow: 1, tagCycles: 6, tagged: 1.75, keepalive: 4 },
  // Infiltrator Slip: walk past a guard without a fight, once a run (Leaked Creds: 3).
  slip: { perRun: 1 },
  daemonSlots: 2, // +1 at server levels 15, 30 and 45 (your highest class level); Operators +1
  // Runs
  depthThreat: 3, // guard threat added per depth below the first
  depthLoot: 0.4, // caches hold 40% more credits per old layer down (layerOf: floors 1, 2, 3–4, 5–6, 7–8)
  maxSignal: 100, // your health out in the net (it carries between connections and rests back up)
  cdCost: 1, // Signal spent per move between directories
  leadBase: 25, // lead progress every neutralized virus gives (four kills; a Route Logger adds more)
  cacheCredits: 30,
  hoardBonus: 0.5, // Hoard quirk: caches pay 50% more
  trapSignal: 10, // pulling honeypot bait
  // Worm fragments
  rearmMax: 3, // the Bouncer's Keyring re-arms this many times, then overheats
  // The spike cap (docs/genome.md rule 5, as the designer set it in docs/kits.md 11). A solo boss's single landing on
  // you, charged or plain, never takes more than 60% of your max Signal (Integrity at home), so it hurts but never
  // one-shots you. A wild virus's or a guard's charge stops at 45% (tells.mjs). Crew bosses (raid.mjs) have their own rules.
  spikeCap: { wild: 0.45, boss: 0.6 },
  fragmentIntegrity: 18, // no armor: one Spike breaks one
  fragmentDamage: 3,
  fragmentCap: 3,
  // Invasions (idle play): found locations send viruses home while you're logged on. Times
  // are logged-on time (a closed or hidden game doesn't advance them), except Degraded mode,
  // which runs on the real clock.
  invasion: {
    firstMs: 3 * 60000, // after your first location is found
    everyMs: [20 * 60000, 30 * 60000], // between one invasion clearing and the next setting out (fewer, bigger: invasion.mjs KINDS)
    travelMs: 2 * 60000, // from a floor-1 server; +1 minute per floor down (perFloorMs)
    perFloorMs: 60000,
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
  // about 50 minutes), offline too, at half that while an invasion is contested or breaching at your wall.
  // Or pay to top up (topUp above).
  restRegen: 0.02,
  signalRest: 0.2, // Signal back per minute at home, out of a fight: empty to full in 5 minutes, offline too
  booster: { restore: 0.5 }, // Signal booster (retired: no longer crafted; ones already carried still work on a run)
  // The rogue server: where you go to fight from the start. Viruses sit in its folders at
  // your level, up to level 3 (it's a starter area), and come back a while after you kill them. Signal carries between connections
  // (and rests back up like the server); you need a quarter of it to connect.
  zone: { id: 'sprawl', name: 'SPRAWL-00', respawnMs: 90000, minSignal: 0.25, maxLevel: 5, starterKills: 2, starterHit: 0.6, bossRespawnMs: 30 * 60000 }, // your first two kills: SPRAWL's hits land at 60% while you learn the board // SPRAWL follows you up to level 5 (a spawn now and then one higher); past that it's grey-ish filler
  relockMs: 30000, // any server but an outpost won't take you back for 30 seconds after you leave: no jack out, top up, return
  // The Exfil (floorplan.mjs, netrooms.mjs): a process smuggling a stolen archive off a rogue server, a loot mob. One
  // roll a run (rogue.mjs: a run lasts until the server reboots), chance of an Exfil; after one turns up, none on any of
  // your rogue servers for cooldownMs (yours:
  // it lives on your save). Caught, it escapes after `escape` cycles. Beaten: one item roll (rolls: the best of two,
  // never a guaranteed blue), `credits` Stashes' worth of credits, one of the server's uniques at `unique`.
  exfil: { chance: 0.25, cooldownMs: 45 * 60000, escape: 6, credits: 10, rolls: 2, unique: 0.05 },
  // Crash: the server reboots at half Integrity and runs degraded for 10 real minutes.
  reboot: 0.5,
  degradedMs: 10 * 60000,
};

// Every ability that works in a fight. Each does ONE thing (a verb):
//   hit (direct damage) · burn (damage every cycle) · stun (delays an attack)
//   debuff (makes a part easier to hurt, or weaker) · shield/heal · buff (you, for a while) · util
// Synergy comes from combining verbs (a debuff boosts every hit and every burn tick;
// burn ticks and helper hits count as hits for Hook), never from rules inside one skill.
// Keys are not fixed per skill: 1 is Spike, 2–9 and 0 your equipped skills (seven slots, eight at 22, nine at 30), - SIGINT from level 10 (see keyMap).
// target: 'part' | 'attack' (a part with an attack; optional) | 'none'. pierce: goes through armor chits. bare: only on a part with no armor.
export const ABILITIES = {
  // cantrips: everyone
  sigint: { verb: 'stun', name: 'SIGINT', target: 'none', damage: 0, cooldown: 8, icon: 'interrupt', short: 'Interrupts a cast', help: 'sigint — Interrupts a cast that is compiling on a virus part or a crew boss. Some casts can\'t be interrupted, and a crew boss you interrupt casts its next one sooner. 8 cycle cooldown.' },
  // Key 1: every class's plain hit, with a name of its own (SPIKE below). Typing `spike` works for every class.
  spike: { verb: 'hit', name: 'Spike', target: 'part', damage: 25, cooldown: 0, icon: 'spike', short: '25 damage', help: 'spike <part> — Deals 25 damage to the target. With no target, Spike hits the last part you hit.' },
  // Every class skill is simple, with one twist: a burn (damage over cycles), a proc (something
  // you do lights up a key for a cycle or two), a reactive window (usable right after an event),
  // or an execute. proc: the event that opens it; window: how many cycles it stays lit.
  // Breaker: burst, crits, breaking armor
  overload: { cls: 'breaker', verb: 'hit', name: 'Overload', target: 'part', damage: 40, cooldown: 3, icon: 'overload', short: '40 damage; crits reset it', help: 'overload <part> — Deals 40 damage to the target. A critical strike resets the cooldown.' },
  exploit: { cls: 'breaker', verb: 'debuff', name: 'Exploit', target: 'part', damage: 15, status: 'exposed', cycles: 1, cooldown: 2, icon: 'exploit', short: '15 damage, Exposes 2 cycles', help: 'exploit <part> — Deals 15 damage and Exposes the target for 2 cycles. Attacks against an Exposed target have a 25% higher chance to critically strike.' },
  crack: { cls: 'breaker', verb: 'debuff', name: 'Crack', target: 'part', damage: 0, strip: 3, cooldown: 2, icon: 'shell-shield', short: 'Breaks 3 ◆', help: 'crack <part> — Breaks 3 ◆ on the target.' },
  // noAnswer: a follow-up, not an answer to a tell (tells.mjs): its hit never calls one off.
  shatter: { cls: 'breaker', verb: 'hit', name: 'Shatter', target: 'part', damage: 38, shards: 12, scales: ['shards'], proc: 'stripped', window: 1, noAnswer: true, cooldown: 0, icon: 'overload', short: '38 damage; shards hit 12', help: 'shatter <part> — Deals 38 damage to the target, and its shards deal 12 damage to every other part with no armor. Usable only for 1 cycle after you break the target\'s last ◆.' },
  flood: { cls: 'breaker', verb: 'hit', name: 'Flood', target: 'part', damage: 38, cooldown: 6, icon: 'overload', short: '38 damage, ×2 vs no armor', help: 'flood <part> — Deals 38 damage to the target. Deals double damage to a target with no armor.' },
  segfault: { cls: 'breaker', verb: 'hit', name: 'Segfault', target: 'part', damage: 30, execute: 3, cooldown: 3, icon: 'spike', short: '30 damage, ×3 vs a charge', help: 'segfault <part> — Deals 30 damage to the target. Deals triple damage to a target winding up a charge.' },
  'fork-bomb': { cls: 'breaker', verb: 'hit', name: 'Fork Bomb', target: 'none', damage: 0, strip: 3, bareHit: 16, fragx: 3, scales: ['bareHit'], cooldown: 4, icon: 'overload', short: 'Breaks 3 ◆ on all; 16 to bare', help: 'fork-bomb — Breaks 3 ◆ on every armored part and deals 16 damage to every part with no armor. Fragments take triple damage.' },
  'thermal-runaway': { cls: 'breaker', verb: 'burn', name: 'Thermal Runaway', target: 'part', damage: 0, tick: 4, grow: 4, ticks: 4, cooldown: 4, icon: 'injector', short: 'Burn 4→16; hits casts', help: 'thermal-runaway <part> — Burns the target for 4, 8, 12 and 16 damage over 4 cycles. Each tick counts as a hit against a cast the target is compiling.' },
  brace: { cls: 'breaker', verb: 'buff', name: 'Brace', target: 'none', damage: 0, cycles: 2, cut: 0.3, back: 2, cooldown: 5, icon: 'shell-shield', short: '−30% taken; returns 2×', help: 'brace — Reduces the damage you take by 30% for 2 cycles. Attackers take twice the damage prevented.' },
  sudo: { cls: 'breaker', verb: 'buff', name: 'Sudo', target: 'none', damage: 0, cycles: 2, cooldown: 8, icon: 'behavior', short: 'Hits ignore ◆ and rules', help: 'sudo — For 2 cycles, your hits pass through ◆, still breaking one each, and ignore locks and wards. Tripwires you break stay quiet, and Decoys and Mimics cannot copy you.' },
  'zero-day': { cls: 'breaker', verb: 'hit', name: 'Zero-day', target: 'part', damage: 65, pierce: true, unlock: true, once: true, cooldown: 0, icon: 'event-warning', short: '65 damage, ignores ◆; once', help: 'zero-day <part> — Deals 65 damage to the target, ignoring armor, locks and wards. Usable once per fight.' },
  // Bastion: the battle cleric. Shields and heals that feed its hits.
  'rate-limit': { cls: 'bastion', verb: 'hit', name: 'Rate Limit', target: 'part', damage: 45, due: 15, chits: 2, status: 'throttled', cooldown: 3, icon: 'interrupt', short: '45 damage; halves its hit', help: 'rate-limit <part> — Deals 45 damage and Throttles the target, halving its next attack. Deals 15 additional damage if the target attacks this cycle. Breaks 2 ◆ on an armored target.' },
  firewall: { cls: 'bastion', verb: 'shield', name: 'Firewall', target: 'none', damage: 0, shield: 16, taunt: 3, cooldown: 4, icon: 'shell-shield', short: 'Shield 16; draws fire', help: 'firewall — Shields you from the next 16 damage. If the shield absorbs an entire hit, Retaliate becomes usable. In a crew, draws all attacks to you for 3 cycles.' },
  retaliate: { cls: 'bastion', verb: 'hit', name: 'Retaliate', target: 'part', damage: 0, proc: 'struck', window: 1, cap: 60, cooldown: 0, icon: 'shell-shield', short: 'Returns 2× the last hit', help: 'retaliate <part> — Deals twice the damage of the last attack that hit you or your shield, up to 60. Usable only the cycle after you are hit.' },
  suspend: { cls: 'bastion', verb: 'stun', name: 'Suspend', target: 'attack', damage: 0, delay: 2, cooldown: 4, icon: 'interrupt', short: 'Delays 2; drains charges', help: 'suspend [part] — Delays the target\'s next attack by 2 cycles. A charged attack loses its charge. With no target named, delays the attack due soonest.' },
  patch: { cls: 'bastion', verb: 'heal', name: 'Patch', target: 'none', damage: 0, heal: 4, pack: 10, tick: 2, ticks: 3, cooldown: 4, icon: 'server', short: 'Heal 4, then 2 ×3', help: 'patch [name] — Heals for 4, then 2 every cycle for 3 cycles. In a crew, can target a crewmate.' },
  throttle: { cls: 'bastion', verb: 'debuff', name: 'Throttle', target: 'attack', damage: 20, status: 'throttled', cycles: 3, loud: 6, cooldown: 4, icon: 'interrupt', short: '20 damage; its hits halved', help: 'throttle [part] — Deals 20 damage and halves the target\'s attack damage for 3 cycles. Against a loud part (a Tripwire set off, Double Extortion, a Bricker\'s rage), lasts 6 cycles and silences it.' },
  purge: { cls: 'bastion', verb: 'burn', name: 'Purge', target: 'part', damage: 0, tick: 6, ticks: 4, drain: 2, cooldown: 4, icon: 'clear', short: 'Burn 6 ×4; heals, cleanses', help: 'purge <part> — Burns the target for 6 damage every cycle for 4 cycles, healing you for 2 with each tick. Removes encryption and Corrupted from you.' },
  harden: { cls: 'bastion', verb: 'shield', name: 'Harden', target: 'none', damage: 0, cooldown: 6, icon: 'shell-shield', short: 'Blocks the next attack', help: 'harden — Grants you 1 ◆. The next attack against you deals no damage.' },
  reclaim: { cls: 'bastion', verb: 'hit', name: 'Reclaim', target: 'part', damage: 35, lifesteal: 0.5, chits: 2, cooldown: 3, icon: 'server', short: '35 damage, heals 50%', help: 'reclaim <part> — Deals 35 damage and heals you for 50% of the damage dealt. Breaks 2 ◆ on an armored target.' },
  quarantine: { cls: 'bastion', verb: 'stun', name: 'Quarantine', target: 'attack', damage: 0, delay: 3, status: 'quarantined', cycles: 3, cooldown: 6, icon: 'event-lock', short: 'Delays 3, +25%; interrupts', help: 'quarantine [part] — Delays the target\'s next attack by 3 cycles, and the target takes 25% more damage until it attacks. Interrupts a cast it is compiling.' },
  failover: { cls: 'bastion', verb: 'hit', name: 'Failover', target: 'none', damage: 0, cooldown: 5, icon: 'event-warning', short: 'Hits all: ¼ missing health', help: 'failover — Deals damage to every part equal to 25% of your missing health (minimum 20).' },
  // Infiltrator: burns and precision
  // Inject: one heavy burn a part. Pressing it again on the same part refreshes it (refresh: no second copy).
  inject: { cls: 'infiltrator', verb: 'burn', name: 'Inject', target: 'part', damage: 0, tick: 20, ticks: 4, refresh: true, cooldown: 3, icon: 'injector', short: 'Burn 20 ×4; refreshes', help: 'inject <part> — Burns the target for 20 damage every cycle for 4 cycles. Reapplying it refreshes the duration.' },
  tag: { cls: 'infiltrator', verb: 'debuff', name: 'Tag', target: 'part', damage: 10, status: 'tagged', cycles: 4, cooldown: 3, icon: 'weakness', short: '10 damage; burns +50%', help: 'tag <part> — Deals 10 damage and Tags the target for 4 cycles. Burns on a Tagged part deal 50% more damage, and its attack timer shows through a veil.' },
  backdoor: { cls: 'infiltrator', verb: 'hit', name: 'Backdoor', target: 'part', damage: 24, pierce: true, burning: 12, cooldown: 4, icon: 'injector', short: '24 ignoring ◆; +12 if burning', help: 'backdoor <part> — Deals 24 damage to the target, ignoring armor, and 12 more if it is burning (any burns, not per burn).' },
  keepalive: { cls: 'infiltrator', verb: 'util', name: 'Keepalive', target: 'part', damage: 0, cycles: 2, cooldown: 3, icon: 'injector', short: 'Burns tick now; +2 cycles', help: 'keepalive <part> — Every burn on the target ticks once immediately and lasts 2 cycles longer.' },
  detonate: { cls: 'infiltrator', verb: 'hit', name: 'Detonate', target: 'part', damage: 0, mult: 1.5, cooldown: 4, icon: 'event-warning', short: 'Burns go off now, +50%', help: 'detonate <part> — Every burn on the target deals all its remaining damage at once, increased by 50%.' },
  opening: { cls: 'infiltrator', verb: 'hit', name: 'Opening', target: 'part', damage: 50, proc: 'slipped', window: 1, cooldown: 0, icon: 'behavior', short: '50 damage after a miss', help: 'opening <part> — Deals 50 damage to the target. Usable only the cycle after an attack misses you or is delayed.' },
  propagate: { cls: 'infiltrator', verb: 'util', name: 'Propagate', target: 'part', damage: 0, cooldown: 5, icon: 'mutation', short: 'Copies its burns to all', help: 'propagate <part> — Copies your burns on the target to every other part.' },
  'null-route': { cls: 'infiltrator', verb: 'shield', name: 'Null Route', target: 'none', damage: 0, cooldown: 6, icon: 'behavior', short: 'Next attack misses; crit', help: 'null-route — The next attack against you misses, and your next skill is a critical strike.' },
  implant: { cls: 'infiltrator', verb: 'burn', name: 'Rootkit Implant', target: 'part', damage: 0, tick: 10, ticks: 99, once: true, cooldown: 0, icon: 'injector', short: 'Burn 10 until it breaks', help: 'implant <part> — Burns the target for 10 damage every cycle until it breaks. The target cannot be healed or grow while burning. Usable once per fight.' },
  // Operator: helpers, and what you do with them
  deploy: { cls: 'operator', verb: 'burn', name: 'Deploy', target: 'part', damage: 0, helper: 12, ticks: 4, cooldown: 4, icon: 'command', short: 'Helper: 12 ×4', help: 'deploy <part> — Sends a helper that deals 12 damage to the target every cycle for 4 cycles. It moves to another part if the target breaks.' },
  hook: { cls: 'operator', verb: 'debuff', name: 'Hook', target: 'part', damage: 10, status: 'hooked', cycles: 4, cooldown: 3, icon: 'injector', short: '10 damage; hits on it +6', help: 'hook <part> — Deals 10 damage and Hooks the target for 4 cycles. Every hit on a Hooked part deals 6 additional damage, including helpers and burns.' },
  botnet: { cls: 'operator', verb: 'burn', name: 'Botnet', target: 'part', damage: 0, helper: 4, helpers: 3, ticks: 3, cooldown: 5, icon: 'command', short: '3 helpers: 4 ×3 each', help: 'botnet <part> — Sends three small helpers that each deal 4 damage to the target every cycle for 3 cycles.' },
  spawn: { cls: 'operator', verb: 'burn', name: 'Spawn', target: 'part', damage: 0, helper: 7, ticks: 3, cooldown: 1, icon: 'command', short: 'Helper: 7 ×3', help: 'spawn <part> — Sends a small helper that deals 7 damage to the target every cycle for 3 cycles.' },
  jam: { cls: 'operator', verb: 'hit', name: 'Jam', target: 'attack', damage: 15, cooldown: 2, icon: 'interrupt', short: '15 damage; Jams it', help: 'jam <part> — Deals 15 damage and Jams the target until its next attack. If one of your helpers is on it, spends that helper to delay the attack 1 cycle, and a charged attack loses its charge.' },
  'kill-switch': { cls: 'operator', verb: 'hit', name: 'Kill Switch', target: 'none', damage: 0, cooldown: 3, icon: 'event-warning', short: 'Helpers cash in at once', help: 'kill-switch — All your helpers deal their remaining damage at once, plus their Last Gasp. Each part hit counts it as a hit from you, calling off a charge.' },
  'garbage-collect': { cls: 'operator', verb: 'hit', name: 'Garbage Collect', target: 'none', damage: 0, all: 14, fragx: 3, cooldown: 3, icon: 'clear', short: '14 to all; helpers +1 cycle', help: 'garbage-collect — Deals 14 damage to every part and triple damage to fragments. Your helpers last 1 cycle longer.' },
  fork: { cls: 'operator', verb: 'buff', name: 'Fork', target: 'none', damage: 0, cycles: 4, cooldown: 6, icon: 'expand', short: 'Each ◆ broken: a helper', help: 'fork — For 4 cycles, each ◆ your helpers break spawns another helper on that part, up to your helper cap.' },
  barrier: { cls: 'operator', verb: 'shield', name: 'Barrier', target: 'part', damage: 0, recall: true, cooldown: 3, icon: 'shell-shield', short: 'Spends a helper: shield', help: 'barrier <part> — Spends one of your helpers on the target to shield you for all the damage it had left.' },
  reroute: { cls: 'operator', verb: 'util', name: 'Reroute', target: 'part', damage: 0, cooldown: 4, icon: 'command', short: 'All helpers to it; each a hit', help: 'reroute <part> — Moves all your helpers to the target, each striking once on arrival. Each arrival counts as a hit from you, so two helpers interrupt a cast.' },
  'cron-storm': { cls: 'operator', verb: 'hit', name: 'Cron Storm', target: 'none', damage: 0, cooldown: 6, icon: 'expand', short: 'Every helper strikes twice', help: 'cron-storm — Every helper you have running strikes twice this cycle.' },
};
// The subclasses' own skills (dist/classes/<class>.data.mjs).
for (const d of Object.values(CLASS_DATA)) Object.assign(ABILITIES, d.abilities);

// Daemons: small programs that fight beside you, and only invasions drop them (invasion.mjs daemonDrop).
// Each belongs to a band (DAEMON_BANDS, below: an invasion drops its level's band, now and then an earlier one's)
// and drops at the invasion's level, an item level: its number n grows with it like a protocol's stats
// (×power(level)). A higher-level copy is just better and replaces yours; the lower one scraps for code.
//   cd    acts on its own cooldown (cycles), right after your order. exfil: only in an Exfil fight.
//   on    acts when something happens instead (once: once a fight):
//         start (the fight starts) · half, quarter (you drop below half, a quarter) · crash (a hit would take
//         you to 0) · big (a big attack is about to land) · cut (an interrupt cancels a move) · stripped (a
//         part's last ◆ breaks) · told (a part starts winding up a tell) · charge (the same, a charge only) ·
//         answered (you answer a tell) · soaked (your shield takes a hit) · burnout (one of your burns runs
//         out) · crit (you land a crit) · broke (a part breaks) · low (a part drops below a quarter) · synced
//         (you fire in a Sync Window)
//   rule  one tooltip line; {n} is its number at its level (pct: a share of your max).
export const DAEMONS = {
  // ---------- band 1 (levels 1–9): the old ten's first eight, about 60% of what they were ----------
  sweeper: { name: 'Sweeper', band: 1, cd: 4, n: 6, rule: 'Deals {n} damage to the part whose attack lands soonest.' },
  mirror: { name: 'Mirror', band: 1, cd: 3, n: 7, rule: 'Deals {n} damage to the part you last attacked.' },
  spider: { name: 'Spider', band: 1, cd: 5, n: 2.5, rule: 'Burns the part you last attacked for {n} a cycle for 3 cycles.' },
  mender: { name: 'Mender', band: 1, cd: 5, n: 5, rule: 'Heals you for {n}.' },
  fuzzer: { name: 'Fuzzer', band: 1, cd: 6, n: 5, rule: 'Breaks 1 ◆ on the most armored part. With no ◆ left, deals {n} to the soonest attacker.' },
  stall: { name: 'Stall', band: 1, cd: 7, n: 3, rule: 'Delays the attack that lands soonest by 1 cycle, and deals {n} to its part.' },
  canary: { name: 'Canary', band: 1, on: 'half', once: true, n: 9, rule: 'The first time you drop below half health, shields you for {n}.' },
  snapshot: { name: 'Snapshot', band: 1, on: 'half', once: true, n: 5, pct: true, rule: 'The first time you drop below half health, heals you for {n}% of your max.' },
  // ---------- band 2 (7–18): tells and interrupts ----------
  cron: { name: 'Cron Job', band: 2, cd: 3, n: 5, rule: 'Deals {n} damage to the part winding up a tell, or else to the soonest attacker.' },
  watchman: { name: 'Watchman', band: 2, on: 'big', once: true, n: 6, rule: 'The first big attack about to land waits 1 cycle, and its part takes {n}.' },
  breakpoint: { name: 'Breakpoint', band: 2, on: 'cut', n: 8, rule: 'When you interrupt a move, that part takes {n}.' },
  nudge: { name: 'Nudge', band: 2, cd: 4, n: 6, rule: 'Deals {n} damage to the part closest to its next tick.' },
  drain: { name: 'Drain', band: 2, cd: 5, n: 6, rule: 'Deals {n} damage to the soonest attacker and heals you for half that.' },
  kindle: { name: 'Kindle', band: 2, cd: 4, n: 4, rule: 'Deals {n} damage to every burning part.' },
  airbag: { name: 'Airbag', band: 2, on: 'start', n: 10, rule: 'Shields you for {n} as the fight starts.' },
  crowbar: { name: 'Crowbar', band: 2, on: 'stripped', n: 8, rule: "When a part's last ◆ breaks, it takes {n}." },
  // ---------- band 3 (16–28): shields, ◆ and the tells ----------
  flare: { name: 'Flare', band: 3, cd: 6, n: 5, rule: 'Exposes the soonest attacker for 2 cycles and deals {n} damage to it.' },
  wiretap: { name: 'Wiretap', band: 3, on: 'answered', n: 10, rule: 'When you answer a tell, shields you for {n}.' },
  capacitor: { name: 'Capacitor', band: 3, cd: 5, n: 5, rule: 'Shields you for {n}.' },
  backscatter: { name: 'Backscatter', band: 3, on: 'soaked', n: 4, rule: 'When your shield takes a hit, the attacker takes {n}. Once a cycle.' },
  drill: { name: 'Drill', band: 3, cd: 5, n: 6, rule: 'Deals {n} damage to the most armored part, through its ◆.' },
  afterburn: { name: 'Afterburn', band: 3, on: 'burnout', n: 6, rule: 'When one of your burns runs out, its part takes {n}.' },
  lookout: { name: 'Lookout', band: 3, on: 'told', n: 7, rule: 'When a part starts winding up a tell, it takes {n}.' },
  checkpoint: { name: 'Checkpoint', band: 3, on: 'quarter', once: true, n: 14, rule: 'The first time you drop below a quarter of your health, heals you for {n}.' },
  // ---------- band 4 (26–40): breaks, crits, fragments and the Exfil ----------
  leash: { name: 'Leash', band: 4, cd: 2, n: 8, exfil: true, rule: "An Exfil's upload takes 1 cycle longer, and it takes {n} every 2 cycles." },
  sieve: { name: 'Sieve', band: 4, cd: 3, n: 5, rule: 'Deals {n} damage to every fragment.' },
  ricochet: { name: 'Ricochet', band: 4, on: 'crit', n: 5, rule: 'When you land a critical strike, another part takes {n}. Once a cycle.' },
  spite: { name: 'Spite', band: 4, on: 'half', once: true, n: 16, rule: 'The first time you drop below half health, the part that hit you takes {n}.' },
  domino: { name: 'Domino', band: 4, on: 'broke', n: 9, rule: 'When a part breaks, the soonest attacker takes {n}.' },
  rod: { name: 'Lightning Rod', band: 4, on: 'charge', n: 10, rule: 'When a part winds up a charge, shields you for {n}.' },
  overseer: { name: 'Overseer', band: 4, cd: 2, n: 3, rule: 'Deals {n} damage to the soonest attacker.' },
  reaper: { name: 'Reaper', band: 4, on: 'low', n: 8, rule: 'When a part drops below a quarter of its Integrity, it takes {n}.' },
  // ---------- band 5 (38–50): wider reach ----------
  broadcast: { name: 'Broadcast', band: 5, cd: 4, n: 3, rule: 'Deals {n} damage to every part.' },
  void: { name: 'Void', band: 5, cd: 8, n: 6, rule: 'Pushes the attack that lands soonest back a full interval, and deals {n} to its part.' },
  pendulum: { name: 'Pendulum', band: 5, on: 'synced', n: 7, rule: 'When you fire in a Sync Window, your target takes {n}.' },
  sledge: { name: 'Sledge', band: 5, cd: 6, n: 4, rule: 'Breaks 1 ◆ on every armored part. Parts with none take {n}.' },
  hotspare: { name: 'Hot Spare', band: 5, cd: 5, n: 5, rule: 'Heals you for {n}, or shields you for {n} when you are at full health.' },
  lifeline: { name: 'Lifeline', band: 5, on: 'crash', once: true, n: 10, rule: 'The first hit that would take you to 0 leaves you at 1, and heals you for {n}.' },
  tandem: { name: 'Tandem', band: 5, cd: 3, n: 4, rule: 'Deals {n} damage to the soonest attacker and {n} to the part you last attacked.' },
  guillotine: { name: 'Guillotine', band: 5, on: 'cut', n: 5, rule: 'When you interrupt a move, every other part takes {n}.' },
};
// Drops (invasion.mjs daemonDrop): the chance a stop leaves one, by how it was stopped, plus `pity` for every
// stop in a row without one (BOSS_LOOT's bad-luck protection, reset by a drop). `earlier`: the share that comes
// from an earlier band than the invasion's. A capture (a champion you kill) is a sure one.
// What a kill's old daemon drop became (a daemon from a vault became a code cache, run.mjs backup.bin): an Exploit,
// at the same odds, from a kill and from a guard.
export const SPARE_EXPLOIT = { home: 0.0025, guard: 0.01 };
export const DAEMON_DROP = { you: 0.35, intercept: 0.5, wall: 0.15, capture: 1, pity: 0.05, earlier: 0.25 };
// A unit of code at a level: what a point of invasion bounty pays (invasion.mjs), what a scrapped daemon gives,
// and what the wall's prices count in (firewall.mjs: its tiers from +3, harden.sh, a crafted filter).
export const codeUnit = (level) => 4 + Math.floor(Math.max(1, level) / 3);
export const daemonBand = (level) => DAEMON_BANDS.reduce((d, [lo], i) => (level >= lo ? i + 1 : d), 1); // an invasion's band: the deepest DAEMON_BANDS entry its level has reached
export const bandDaemons = (band) => Object.keys(DAEMONS).filter((id) => DAEMONS[id].band === band);
// A daemon's number at an item level, like a protocol's stats.
export const daemonN = (id, level) => Math.max(1, Math.round(DAEMONS[id].n * power(level)));
// When it acts, in words: "Every 4 cycles", "Once a fight", "On a cut".
const ON_WORD = { start: 'As a fight starts', half: 'Below half', quarter: 'Below a quarter', crash: 'On a killing blow', big: 'On a big attack', cut: 'On an interrupt', stripped: 'On a stripped part', told: 'On a tell', charge: 'On a charge', answered: 'On an answered tell', soaked: 'On a shield hit', burnout: 'On a burn ending', crit: 'On a crit', broke: 'On a break', low: 'Below a quarter (a part)', synced: 'On a Sync Window' };
export const daemonWhen = (id) => { const d = DAEMONS[id]; return d.cd ? `Every ${d.cd} cycles` : `${ON_WORD[d.on] || d.on}${d.once ? ' · once a fight' : ''}`; };

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
// A family is a body: its two core parts and their core genes (genes.mjs), its stem (the name its viruses
// carry: CRYPTJACK-4821), and its pool of third parts. A third part is a gene's part (genes.mjs GENES[id].parts);
// a wild virus brings one of those open at its level, picked by its seed, in the pool's order.
const thirds = (family, ids) => ids.map((g) => ({ ...GENES[g].parts[family], gene: g }));
export const FAMILIES = {
  ransomware: {
    name: 'Ransomware',
    stem: 'CRYPTJACK',
    threatens: 'Integrity',
    summary: 'Encrypts your server. Each Encrypt adds damage every cycle until you break the Encryptor, which holds the key.',
    core: ['surge', 'encrypt'],
    third: ['ward', 'mutexlock', 'tripwire'], // the Lockbox from level 3, the Mutex from 8, the Tripwire from 20
    parts: [
      { id: 'pulse', name: 'Pulse Node', integrity: 34, armor: 1, loot: 'Pulse Kernel', attack: { name: 'Surge', effect: 'damage', amount: 14, interval: 4, first: 3 } },
      { id: 'encryptor', name: 'Encryptor', integrity: 38, armor: 1, loot: 'Cipher Seed', special: true, attack: { name: 'Encrypt', effect: 'encrypt', amount: 4, interval: 5, first: 4 } },
    ],
  },
  worm: {
    name: 'Worm',
    stem: 'SPLINTER',
    threatens: 'Integrity',
    summary: 'Spawns fragments that gnaw your server every cycle. The Replicator makes them.',
    core: ['surge', 'replicate'],
    third: ['twin', 'c2'], // the Mirror from level 3, the C2 Node from 8
    parts: [
      { id: 'pulse', name: 'Pulse Node', integrity: 34, armor: 1, loot: 'Pulse Kernel', attack: { name: 'Surge', effect: 'damage', amount: 12, interval: 4, first: 4 } },
      { id: 'replicator', name: 'Replicator', integrity: 38, armor: 1, loot: 'Replication Seed', special: true, attack: { name: 'Replicate', effect: 'replicate', amount: 1, interval: 4, first: 3, hit: 4 } }, // a small Splice hit with each spawn
    ],
  },
  ghostroot: {
    name: 'Ghostroot',
    stem: 'GHOSTROOT',
    threatens: 'Integrity',
    summary: 'Its timers stay hidden while its parts are armored. The Scrambler hits you and Scrambles you for 2 cycles. While you are Scrambled, each of your attacks has a 25% chance to hit you instead, at half damage.',
    core: ['surge', 'scramble', 'veil'],
    third: ['decoymirror', 'mimic'], // the Decoy from level 4, the Mimic from 8
    parts: [
      // The Scrambler carries the threat, not the Pulse: killing the Pulse first no longer halves the fight.
      { id: 'pulse', name: 'Pulse Node', integrity: 34, armor: 1, veiled: true, loot: 'Pulse Kernel', attack: { name: 'Surge', effect: 'damage', amount: 11, interval: 4, first: 3 } },
      { id: 'scrambler', name: 'Scrambler', integrity: 40, armor: 1, veiled: true, loot: 'Signal Key', special: true, attack: { name: 'Scramble', effect: 'scramble', amount: 2, hit: 9, interval: 4, first: 2 } },
    ],
  },
};
for (const [k, f] of Object.entries(FAMILIES)) f.parts.push(...thirds(k, f.third));

// Strains: variants of a home family, each built around one rule: a named build of its author (authors.mjs), its
// fixed genes (genes) on its rule's part, and its charge's gene (tell.gene). They share their lineage's
// art, materials and leads. They live deeper in the network, never on SPRAWL-00: from its layer
// and its level on, a strain takes the place of the plain family about half the time in what a
// server sends (invaders, outpost natives, swarms). See the strains design doc.
const PULSE = (amount, first) => ({ id: 'pulse', name: 'Pulse Node', integrity: 34, armor: 1, loot: 'Pulse Kernel', attack: { name: 'Surge', effect: 'damage', amount, interval: 4, first } });
export const STRAINS = {
  keylogger: {
    lineage: 'ghostroot', from: 4, depth: 2, name: 'Keylogger', genes: ['synclock', 'keystrokedump'], tell: { name: 'Keystorm', gene: 'overcharge' },
    rule: 'A Sync Window opens every cycle. The Logger takes damage only from commands fired inside the window. Every command fired outside it is logged, and at 3 logs the Logger Dumps for 18 damage. It also Dumps on its own every 6 cycles.',
    parts: [PULSE(12, 3), { id: 'logger', name: 'Logger', integrity: 30, armor: 1, loot: 'Logger Spool', special: true, syncOnly: true, attack: { name: 'Dump', effect: 'damage', amount: 18, interval: 6, first: 6, dump: true } }],
  },
  hashrat: {
    lineage: 'ransomware', from: 5, depth: 2, name: 'Hashrat', genes: ['cycletax'], tell: { name: 'Overcharge', part: 'basic', gene: 'overcharge' },
    rule: 'While the Miner lives, your cooldowns tick down only every other cycle. Once it is the last part left, it Overclocks for 4 damage every 2 cycles.',
    parts: [PULSE(12, 3), { id: 'miner', name: 'Miner', integrity: 30, armor: 0, loot: 'Miner Rig', special: true, tax: true, attack: { name: 'Overclock', effect: 'damage', amount: 4, interval: 2, first: 2, alone: true } }],
  },
  floodgate: {
    lineage: 'worm', from: 6, depth: 2, name: 'Floodgate', genes: ['floodramp'], tell: { name: 'Deluge', gene: 'overcharge' },
    rule: 'The Flooder attacks every cycle, dealing 1 more damage each time. Any delay resets it.',
    parts: [PULSE(12, 4), { id: 'flooder', name: 'Flooder', integrity: 28, armor: 0, loot: 'Flood Valve', special: true, attack: { name: 'Flood', effect: 'damage', amount: 2, interval: 1, first: 2, ramp: 1 } }],
  },
  leech: {
    lineage: 'worm', from: 8, depth: 2, name: 'Leech', genes: ['siphon'], tell: { name: 'Gorge', gene: 'hotfix' },
    rule: 'The Tap\'s bite heals the most damaged part for all the damage it deals, and removes one burn from that part.',
    parts: [PULSE(12, 4), { id: 'tap', name: 'Tap', integrity: 28, armor: 1, loot: 'Tap Fang', special: true, attack: { name: 'Siphon', effect: 'damage', amount: 8, interval: 3, first: 3, siphon: true } }],
  },
  sleeper: {
    lineage: 'ghostroot', from: 10, depth: 2, name: 'Sleeper', genes: ['dormant'], tell: { name: 'Wake-up Call', gene: 'overcharge' }, dormant: 6,
    rule: 'Stays dormant until you deal damage or cycle 6 begins. When it wakes, the Cell sounds an Alarm for 14 damage, and the Pulse Node attacks 1 cycle faster from then on.',
    parts: [PULSE(14, 3), { id: 'cell', name: 'Cell', integrity: 32, armor: 1, loot: 'Cell Key', special: true, attack: { name: 'Alarm', effect: 'damage', amount: 14, interval: 5, first: 999, alarm: true } }],
  },
  // Wave 1b: six more for the early climb (levels 3–11), all from layer 2.
  patchwork: {
    lineage: 'worm', from: 3, depth: 2, name: 'Patchwork', genes: ['mend'], tell: { name: 'Hotfix', gene: 'hotfix' },
    rule: 'Every 3 cycles, the Patcher heals the most damaged part for 12. Break the Pulse Node first and the Patcher drops its Patch and takes over the Surge (Fallback). Break the Patcher first, or burst the other part down between heals.',
    parts: [PULSE(12, 4), { id: 'patcher', name: 'Patcher', integrity: 28, armor: 1, loot: 'Patch Kit', special: true, fallback: 'pulse', attack: { name: 'Patch', effect: 'heal', amount: 12, interval: 3, first: 3 } }],
  },
  flicker: {
    lineage: 'ghostroot', from: 4, depth: 2, name: 'Flicker', genes: ['phaseshift'], tell: { name: 'Blink', gene: 'overcharge' },
    rule: 'The Shade is present only on even cycles, and it attacks only then. On odd cycles, your hits pass through it and 15% of the damage bounces back at you.',
    parts: [PULSE(13, 3), { id: 'shade', name: 'Shade', integrity: 22, armor: 1, loot: 'Shade Lens', special: true, phase: true, attack: { name: 'Fade', effect: 'damage', amount: 5, interval: 2, first: 2 } }],
  },
  extortion: {
    lineage: 'ransomware', from: 6, depth: 2, name: 'Extortion', genes: ['deadline'], tell: { name: 'Overcharge', part: 'basic', gene: 'overcharge' },
    rule: 'The Demand winds up a Deadline for 26 damage. Dealing 14 damage to the Demand in the 2 cycles before it lands calls the Deadline off.',
    parts: [PULSE(12, 3), { id: 'demand', name: 'Demand', integrity: 40, armor: 0, loot: 'Ransom Note', special: true, attack: { name: 'Deadline', effect: 'damage', amount: 26, interval: 5, first: 4, windup: 14 } }],
  },
  echo: {
    lineage: 'ghostroot', from: 8, depth: 2, name: 'Echo', genes: ['echo'], tell: { name: 'Feedback', gene: 'overcharge' },
    rule: 'While the Echo lives, every hit you take repeats 1 cycle later at half damage. The Echo also Reverbs for 6 damage every 4 cycles.',
    parts: [PULSE(14, 3), { id: 'echo', name: 'Echo', integrity: 30, armor: 1, loot: 'Echo Chamber', special: true, echo: true, attack: { name: 'Reverb', effect: 'damage', amount: 6, interval: 4, first: 3 } }],
  },
  bricker: {
    lineage: 'ransomware', from: 9, depth: 2, name: 'Bricker', genes: ['rage'], tell: { name: 'Brick Wall', gene: 'overcharge' }, enrage: true,
    rule: 'Each part deals 30% more damage once it drops below half Integrity. Take each part from healthy to broken in one burst.',
    parts: [PULSE(12, 3), { id: 'locker', name: 'Locker', integrity: 36, armor: 1, loot: 'Brick Key', special: true, attack: { name: 'Brick', effect: 'damage', amount: 10, interval: 3, first: 3 } }],
  },
  overrun: {
    lineage: 'worm', from: 11, depth: 2, name: 'Overrun', genes: ['hivebrood'], tell: { name: 'Swarm', spawn: 1, gene: 'massmailer' },
    rule: 'The Hive spawns fragments whose bite deals 1 more damage every cycle they live. Clear them young, or break the Hive.',
    parts: [PULSE(10, 4), { id: 'hive', name: 'Hive', integrity: 34, armor: 1, loot: 'Hive Comb', special: true, overrun: true, attack: { name: 'Swarm', effect: 'replicate', amount: 1, interval: 4, first: 2 } }],
  },
};
for (const [k, st] of Object.entries(STRAINS)) st.author = buildAuthor(k);
// The strains a family can field at a level, on a server this many floors down.
export const strainsFor = (family, level, depth = 99) => Object.keys(STRAINS).filter((k) => STRAINS[k].lineage === family && level >= STRAINS[k].from && depth >= (STRAINS[k].depth || 2));
export const STRAIN_SHARE = 0.5;

// Grades: the same virus, bigger. Floor 1 servers send v1 (the starter numbers), floors 2 and 3 v2,
// floor 4 and deeper v3 (where the old layer 3 began, by level). Only the stats change: Integrity, attack damage, and at
// v3 one more armor chit on the basic part. (On top of the level a deeper server already adds.)
export const GRADES = { 1: { hp: 1, dmg: 1, armor: 0 }, 2: { hp: 1.15, dmg: 1.1, armor: 0 }, 3: { hp: 1.35, dmg: 1.25, armor: 0 } };
export const gradeFor = (floor) => ((floor || 1) <= 1 ? 1 : floor <= 3 ? 2 : 3);
// What a server this deep sends: its grade, and maybe a strain (fixed by the seed).
// native: the network's native strain (network.mjs), STRAIN_NATIVE times as likely as its family's others there.
export const STRAIN_NATIVE = 5;
export function variantFor(family, level, depth, seed, native = null) {
  const grade = gradeFor(depth);
  const pool = strainsFor(family, level, depth || 1), roll = rng((seed ^ 0x5bd1e995) >>> 0);
  if (!pool.length || roll() >= STRAIN_SHARE) return { grade, strain: null };
  const w = (k) => (k === native ? STRAIN_NATIVE : 1);
  let r = roll() * pool.reduce((n, k) => n + w(k), 0), strain = pool.at(-1);
  for (const k of pool) { r -= w(k); if (r < 0) { strain = k; break; } }
  return { grade, strain };
}

// Guards found out in the net. Never picked for home intrusions. Lighter: you have 50 Signal.
export const GUARDS = {
  watchdog: {
    name: 'Watchdog',
    threatens: 'Signal',
    guard: true,
    art: 'watchdog',
    summary: 'A security program guarding a directory. The Tracker winds up one big hit.',
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
    summary: 'A veiled security program. Its timers stay hidden while its parts are armored.',
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
    summary: 'A nesting guard. The Brood spawns fragments that gnaw your Signal every cycle. Break the Maw first and the Brood takes over its Bite.',
    parts: [
      { id: 'pulse', name: 'Maw', integrity: 24, armor: 0, loot: 'Crawler Maw', attack: { name: 'Bite', effect: 'damage', amount: 7, interval: 3, first: 2 } },
      { id: 'replicator', name: 'Brood', integrity: 28, armor: 1, loot: 'Brood Seed', special: true, fallback: 'pulse', attack: { name: 'Brood', effect: 'replicate', amount: 1, interval: 4, first: 3 } },
    ],
  },
  // Ransomware-shaped guard: the Shredder winds up one heavy strike.
  shredder: {
    name: 'Shredder',
    threatens: 'Signal',
    guard: true,
    art: 'ransomware',
    summary: 'An archive guard. The Shredder winds up one heavy strike on your Signal.',
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
    rule: 'Every 4 cycles, the Keyring re-arms the Gate to full armor. After 3 re-arms it overheats. The Keyring has no attack of its own, but break the Gate while it stands and the Keyring takes over its Ram (Fallback). Break the Gate between re-arms, or the Keyring first when the Gate\'s armor is too thick to get through in time.',
    summary: 'ICE on the door. The Keyring keeps re-arming the Gate, and takes over its Ram if the Gate breaks first.',
    parts: [
      { id: 'pulse', name: 'Gate', integrity: 30, armor: 3, loot: 'Gate Hinge', attack: { name: 'Ram', effect: 'damage', amount: 10, interval: 3, first: 2 } },
      { id: 'encryptor', name: 'Keyring', integrity: 22, armor: 1, loot: 'Keyring', special: true, rearm: 4, fallback: 'pulse' },
    ],
  },
  // Watchdog-shaped: the longer the fight, the harder the Trace-back.
  tracer: {
    name: 'Tracer',
    threatens: 'Signal',
    guard: true,
    ice: true,
    art: 'watchdog',
    rule: 'Its Trace-back deals more damage every cycle the fight goes on. Race it.',
    summary: 'Trace ICE. Every cycle you spend brings it closer.',
    parts: [
      { id: 'sentry', name: 'Probe', integrity: 22, armor: 0, loot: 'Probe Lens', attack: { name: 'Ping', effect: 'damage', amount: 4, interval: 2, first: 2 } },
      { id: 'tracker', name: 'Tracker', integrity: 28, armor: 1, loot: 'Trace Coil', special: true, attack: { name: 'Trace-back', effect: 'damage', amount: 6, interval: 3, first: 3, grow: 2 } },
    ],
  },
};

// Every mutation is visible from the start and changes a decision. A mutation is a passive rule gene a wild virus
// rolls (genes.mjs, mutation: true): its rule is the gene's. Rerouting is retired (every v2+ virus is Linked now,
// combat.mjs), and only lingers on old saves' viruses.
const mutation = (id) => ({ name: GENES[id].name, rule: GENES[id].does, gene: id });
export const MUTATIONS = {
  armored: mutation('armored'),
  regenerative: mutation('regenerative'),
  hasty: mutation('hasty'),
  rerouting: { name: 'Rerouting', rule: 'When a part breaks, a third of its attack damage reroutes to the surviving part that attacks next.', retired: true, gene: 'linked' },
  adaptive: mutation('adaptive'),
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

// Bodies that live only in server rooms (dist/families.mjs registers the Trojan, the Cryptominer and the Wiper here for
// the rooms playtest, docs/servers.md R0). They are kept out of FAMILIES so nothing in the old game rolls them.
export const ROOM_FAMILIES = {};
const familyOf = (id) => FAMILIES[id] || GUARDS[id] || ROOM_FAMILIES[id];

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
    lock: spec.lock || null, // Mutex: the part it holds a lock (a shield) on
    deadman: !!spec.deadman, // Tripwire: break it while the others live and they go loud
    command: !!spec.command, // C2 Node: fragments gnaw harder while it lives, and drop when it breaks
    mimic: !!spec.mimic, // Mimic: plays your last command back at you (its tell)
    fallback: spec.fallback || null, // Fallback (Keyring, Brood, Patcher, Cooler): the part whose attack it takes over when that part breaks
    ...(spec.wardCommands ? { wardCommands: true } : {}), // HASHLORD's Pool Lock: its ward holds back your commands only, not burns or helpers
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
// hitting and better armored; they pay three times the XP and drop better (LOOT.odds.elite in gear.mjs).
// Elites are crew rooms (WoW elites): very unlikely solo, better loot odds than trash and a small
// unique chance. Only in Pit folders, never on the way to anything you need.
// Bosses: a solo fight with phases. hp and dmg scale the whole virus; at each phase's share of its
// total Integrity it does something (re-arm every part, call in a Sentry, attack faster), and from
// enrageAt every attack lands every cycle, a quarter harder. healerDmg (optional): damage that steps up by
// level (runLate points). raid: a crew boss on the group boss framework (raid.mjs, the farm's three): its
// phases are mechanics with target rules and telegraphs, and its own parts hit softly (dmg).
// A strain boss (two parts, its strain's rule) is soft at 10 and hard to keep up with by 30: its hits step with level.
const STRAIN_BOSS_LATE = [[8, 1], [10, 0.8], [18, 1.1], [30, 1.45]];
// HASHLORD's own step, flatter and longer: its Pulse Node carried the fight (a Surge took half your Signal at 30), and a
// charge on top of a plain hit that big went past the spike cap (docs/genome.md rule 5). More Integrity, smaller hits.
const HASHLORD_LATE = [[8, 1], [10, 0.8], [18, 0.95], [30, 1.1]];
export const BOSSES = {
  // The Resident (run.mjs /core): about two wins in three for a geared player at its level.
  resident: { name: 'Resident', hp: 1.4, dmg: 1, enrageAt: 18, phases: [{ at: 0.5, do: ['rearm'], say: 'The Resident re-arms every part.' }] },
  // RELAY-KING (run.mjs): a worm boss in SPRAWL-00's /net from level 3, back every half hour.
  relayking: { name: 'RELAY-KING', family: 'worm', hp: 1.6, dmg: 1, enrageAt: 16, phases: [{ at: 0.5, do: ['faster'], say: 'RELAY-KING speeds up. Every attack comes a cycle sooner.' }] },
  // REPO MAN (events.mjs): the bounty from level 8.
  repoman: { name: 'REPO MAN', family: 'ransomware', hp: 1.6, dmg: 1, enrageAt: 18, phases: [{ at: 0.6, do: ['rearm'], say: 'REPO MAN re-arms every part.' }, { at: 0.3, do: ['faster'], say: 'REPO MAN gets desperate. Every attack comes a cycle sooner.' }] },
  // HOLLOW CHOIR (events.mjs): a ghostroot boss from level 10. At half its Decoy's bounce rises from 30% to 50% (Harmony), in
  // place of the second Decoy it used to split off on the off-beat: one global beat, as the compatibility rules ask (genes.mjs).
  // KESSLER-FARM-00 (rogue.mjs FARM), the crew dungeon: crew bosses on the group boss framework (raid.mjs).
  // Sized for a crew of four (smaller crews get a smaller boss: crewHp in raid.mjs). Their own parts hit
  // softly (dmg) and go at whoever holds aggro; the danger is the mechanics, each a share of max Signal.
  foreman: { name: 'THE FOREMAN', family: 'ransomware', hp: 13, dmg: 0.45, enrageAt: 22, phases: [], raid: FOREMAN },
  heatsink: { name: 'HEATSINK', family: 'worm', hp: 17, dmg: 0.45, enrageAt: 25, phases: [], raid: HEATSINK },
  coldwallet: { name: 'COLDWALLET', family: 'ghostroot', hp: 8.8, dmg: 0.45, enrageAt: 18, phases: [], raid: COLDWALLET },
  choir: { name: 'HOLLOW CHOIR', family: 'ghostroot', hp: 1.6, dmg: 1, enrageAt: 16, signature: { name: 'Harmony', rule: 'At half Integrity, its Decoy\'s mirror bounces back 50% of your command instead of 30%.' }, phases: [{ at: 0.5, do: ['harmony'], say: 'The Hollow Choir finds its harmony. On the Decoy\'s beat, half of what you fire now bounces back.' }] },
  // Native bosses (network.mjs): each network rolls one of these for its lair, a rogue server of its own. Solo bosses
  // on the tells framework: every tell open at their level, a signature charge of their own (TELLS, TELL_SETS by id;
  // a strain boss renames its strain's charge), a third part they always bring (third), and phases. Their drops are
  // their network's native uniques (BOSS_LOOT odds and pity).
  'nb-deadbolt': { name: 'DEADBOLT', family: 'ransomware', third: 'mutex', native: true, lair: 'DEADBOLT-VAULT', hp: 1.25, dmg: 1, enrageAt: 18, about: 'A Mutex locks its Encryptor. At 60% Integrity it re-arms every part, and at 30% a second Mutex throws a fresh lock.', phases: [{ at: 0.6, do: ['rearm'], say: 'DEADBOLT re-arms every part.' }, { at: 0.3, do: ['spawn:mutex'], say: 'DEADBOLT throws a second Mutex. The Encryptor is locked again.' }] },
  'nb-tripmine': { name: 'TRIPMINE', family: 'ransomware', third: 'tripwire', native: true, lair: 'TRIPMINE-YARD', hp: 1.6, dmg: 1, enrageAt: 18, about: 'If its Tripwire breaks first, the other parts go loud. Below level 20 it brings a Lockbox instead. At half Integrity, every attack comes a cycle sooner.', phases: [{ at: 0.5, do: ['faster'], say: 'TRIPMINE arms the yard. Every attack comes a cycle sooner.' }] },
  // Since R1 (docs/servers.md 3.5) the interrupt answers a charge for every class, and a boss's charges and casts sit off
  // its ♛ part, so HASHLORD hits harder (dmg 1.5, was 1.1) and MIRRORSHADE too (1.15, was 0.9) to stay in the boss band.
  // HASHLORD, rebuilt (docs/genome.md 7.5): GLASSJAW's Hashrat build, from level 16. A Pool Lock wards its Miner, but only
  // against your commands: burns and helpers go through at full. Block Reward (a Self-Update on the Miner) and the Chain Fork
  // at half, when a second Miner spins up (the tax comes back if the first is gone, and the Pool Lock wards it too).
  'nb-hashlord': { name: 'HASHLORD', family: 'ransomware', strain: 'hashrat', native: true, lair: 'HASHLORD-RIG', charge: 'Difficulty Bomb', floor: 16, band: 'B',
    extra: [{ id: 'poollock', name: 'Pool Lock', integrity: 16, armor: 0, loot: 'Lock Pin', ward: 'miner', wardCommands: true }],
    signature: { name: 'Chain Fork', rule: 'At half Integrity, a second Miner spins up. Its cycle tax returns if the first Miner is gone, and the Pool Lock wards it too while the Lock stands.' },
    hp: 3.9, dmg: 1.5, healerDmg: HASHLORD_LATE, enrageAt: 18, about: 'A Hashrat boss. While its Miner lives, your cooldowns tick down only every other cycle, and a Pool Lock wards the Miner against your commands. Burns and helpers get through at full. At 60% Integrity it re-arms every part, and at half the Chain Fork spins up a second Miner.', phases: [{ at: 0.6, do: ['rearm'], say: 'HASHLORD re-arms every part.' }, { at: 0.5, do: ['spawn:miner'], say: 'HASHLORD forks the chain. A second Miner spins up.' }] },
  'nb-backorifice': { name: 'BACK ORIFICE', family: 'worm', third: 'c2', native: true, lair: 'BACKORIFICE-C2', hp: 1.3, dmg: 0.95, enrageAt: 17, about: 'A C2 Node commands its fragments. At half Integrity, every attack comes a cycle sooner, and at 25% a Mirror twins the Replicator.', phases: [{ at: 0.5, do: ['faster'], say: 'BACK ORIFICE opens every port. Every attack comes a cycle sooner.' }, { at: 0.25, do: ['spawn:mirror'], say: 'BACK ORIFICE spins up a Mirror. Break it and the Replicator together.' }] },
  'nb-patchday': { name: 'PATCH TUESDAY', family: 'worm', strain: 'patchwork', native: true, lair: 'PATCHDAY-WSUS', charge: 'Rollup', hp: 2.2, dmg: 1.45, healerDmg: STRAIN_BOSS_LATE, enrageAt: 18, about: 'A Patchwork boss. Its Patcher heals the most damaged part, and takes over the Surge if its Pulse Node breaks first. At 60% Integrity it re-arms every part, and at 30% every attack comes a cycle sooner.', phases: [{ at: 0.6, do: ['rearm'], say: 'PATCH TUESDAY re-arms every part.' }, { at: 0.3, do: ['faster'], say: 'PATCH TUESDAY forces a reboot. Every attack comes a cycle sooner.' }] },
  'nb-floodwall': { name: 'FLOODWALL', family: 'worm', strain: 'floodgate', native: true, lair: 'FLOODWALL-SLUICE', charge: 'Storm Surge', hp: 1.6, dmg: 0.95, healerDmg: STRAIN_BOSS_LATE, enrageAt: 18, about: 'A Floodgate boss. Its Flooder attacks every cycle, harder each time, and any delay resets it. At half Integrity it re-arms every part.', phases: [{ at: 0.5, do: ['rearm'], say: 'FLOODWALL re-arms every part.' }] },
  // MIRRORSHADE, rebuilt (docs/genome.md 7.5): NULL CHOIR's, from level 12. One feedback amplifier (the Mimic) on its Scramble,
  // a plain charge (Glass Cut), and the Doppelganger at half: the Mimic stops recording and takes the shape of the first part
  // you broke, or of the Pulse Node. At 12 and 13 its Scrambler is trimmed (trim): ◆3, and a Scramble every 5 cycles.
  // mimic: while you're Scrambled its Mimic plays your hit back twice over (tells.mjs mimicLands). Its beats fall in the
  // Scramble, and with the class kits' openers going quiet there by habit, a plain playback cost a blind player too little.
  'nb-mirrorshade': { name: 'MIRRORSHADE', family: 'ghostroot', third: 'mimic', native: true, lair: 'MIRRORSHADE-HALL', floor: 12, band: 'A',
    trim: { below: 14, part: 'scrambler', armor: 3, interval: 5 },
    signature: { name: 'Doppelganger', rule: 'At half Integrity, the Mimic stops recording and takes the shape of the first part you broke, with its attack and its ◆. If you have not broken one, it takes the shape of the Pulse Node.' },
    hp: 1.34, dmg: 1.15, mimic: 2, enrageAt: 17, about: 'A Mimic plays your commands back at you on its beat, at double damage while you are Scrambled. At 60% Integrity it re-arms every part, and at half the Mimic stops recording and becomes a Doppelganger of the first part you broke.', phases: [{ at: 0.6, do: ['rearm'], say: 'MIRRORSHADE re-arms every part.' }, { at: 0.5, do: ['doppelganger'], say: 'MIRRORSHADE\'s Mimic stops recording and takes a shape.' }] },
  'nb-sleepwalker': { name: 'SLEEPWALKER', family: 'ghostroot', strain: 'sleeper', native: true, lair: 'SLEEPWALKER-WARD', charge: 'Night Terror', hp: 1.5, dmg: 1, healerDmg: STRAIN_BOSS_LATE, enrageAt: 18, about: 'A Sleeper boss. It stays dormant until you hit it, then its Cell sounds the Alarm. At half Integrity it re-arms every part.', phases: [{ at: 0.5, do: ['rearm'], say: 'SLEEPWALKER wakes all the way. Every part re-arms.' }] },
  'nb-echolalia': { name: 'ECHOLALIA', family: 'ghostroot', strain: 'echo', native: true, lair: 'ECHOLALIA-CHAMBER', charge: 'Last Word', hp: 1.6, dmg: 1, healerDmg: STRAIN_BOSS_LATE, enrageAt: 18, about: 'An Echo boss. Every hit that gets through to you repeats 1 cycle later at half damage. At 60% Integrity it re-arms every part, and at 30% every attack comes a cycle sooner.', phases: [{ at: 0.6, do: ['rearm'], say: 'ECHOLALIA re-arms every part.' }, { at: 0.3, do: ['faster'], say: 'ECHOLALIA starts talking over you. Every attack comes a cycle sooner.' }] },
};
export const NATIVE_BOSSES = Object.keys(BOSSES).filter((k) => BOSSES[k].native);
export const ENRAGE = { dmg: 1.25, warn: 3 };
// A loud run (connect <server> loud; called a hot run in the code): friction you choose. Every fight on it has more Integrity and hits
// harder; every kill pays more XP and rolls for loot once more.
export const HOT_RUN = { hp: 1.25, dmg: 1.2, xp: 1.25, rolls: 1 };
// A boss's loot (WoW's dungeon bosses, combat.mjs bossLoot): one item every kill, a blue at its level or a yellow
// `yellow` of the time, and its uniques (two each, content/items.mjs source kind 'boss'; a native boss, its network's):
// `chance` a kill, `pity` more for each kill that gave none, back to `chance` on a drop (the log, the Collection and
// the Codex show it). A crew boss (raid.mjs) is better: always a yellow, its uniques at `raid`'s odds, and `raid.gold`
// a kill for a world unique too. once: bosses that drop each of their own uniques only once (bossUnique).
// resident: 'elite' rolls the Resident like an elite (no sure item: one is met on every takeover), 'boss' like the rest.
export const BOSS_LOOT = { chance: 0.15, pity: 0.05, yellow: 0.25, raid: { chance: 0.3, pity: 0.1, gold: 0.1 }, once: ['resident'], resident: 'elite' };
export const ELITE = { hp: 5.2, dmg: 1.3, armor: 1, xp: 3, share: 1 / 3, goneMs: 30 * 60000 }; // goneMs: an elite that beats you moves on, and its folder fills again this much later

// ---------- solo tells (tells.mjs) ----------
// A tell is a big move a part announces ahead, on its row of the board and in the log, that you plan your interrupts
// around (docs/servers.md 3.5). Solo fights only (wild viruses, guards, elites, strains, the solo bosses, home
// intrusions); crew bosses have their own mechanics (raid.mjs). One clock: a tell rides the timeline, it never runs on
// a timer of its own. Four kinds:
//   charge  powers up one of its part's scheduled attacks (mult, capped). Its cell on the board turns into the
//           charge `lead` cycles ahead, and it lands when that attack was due; delaying the attack moves it. An
//           interrupt on its part on its cycle (interrupt.mjs) calls it off, or a skill built for it.
//   cast    compiling a buff on the virus (does) for castLasts cycles, from level 10: a marked cell on its part's
//           row. SIGINT in its window (castWindow cycles, ending the cycle it lands) stops it, and so does an
//           interrupt on its part in the window.
//   seal    if the part still wears ◆ when it lands, it re-arms to full with one ◆ more, and every stripped part
//           gets a ◆ back (and from level 6 your ◆ and shield go). Strip it before then.
//   mimic   the Mimic plays the command you fire on its beat back at you (its direct damage). Go quiet then, or cut it.
// Breaking a tell's part always stops it.
export const TELL = {
  // By the virus's level: how many tells it brings (count: none to level 5, the ticks are the lesson; one from 6;
  // two from 17), how many can be live at once (live), how far ahead each shows (lead), how much bigger a charge is
  // (mult), the most a charge adds to the hit it rides on as a share of your max (cap; dot: Full Disk's burst a
  // cycle), and the after-effects of a tell that lands (after: your last skill locked that many cycles; burn:
  // Corrupted, a share of your max a cycle for 3; hang: your next command doesn't fire).
  tiers: [
    { to: 5, count: 0, live: 1, lead: 3, mult: 2.5, cap: 0.12, dot: 0.03, after: 0, burn: 0, hang: 0 },
    { to: 9, count: 1, live: 1, lead: 3, mult: 2.5, cap: 0.12, dot: 0.03, after: 1, burn: 0, hang: 0 },
    { to: 16, count: 1, live: 1, lead: 3, mult: 2.5, cap: 0.18, dot: 0.045, after: 1, burn: 0.03, hang: 0 },
    { to: 99, count: 2, live: 2, lead: 3, mult: 3, cap: 0.25, dot: 0.06, after: 1, burn: 0.04, hang: 0 },
  ],
  castWindow: 2, // a cast can be answered on the cycle it lands and the one before
  ceiling: 0.6, // a solo boss's tell never lands for more than this share of your max (or the plain hit, if that's bigger); a wild virus's stops at CONFIG.spikeCap.wild (tells.mjs ceilingOf)
  // An elite brings one more tell (from level 6), and each can cost 15% more (never past the ceiling). A solo boss
  // brings every tell open at its level, at least `count`. A boss staggers Open like any part, but keeps its clock
  // (delay 0).
  elite: { count: 1, cap: 1.15 },
  boss: { count: 3, cap: 1.1, delay: 0 },
  champion: { cap: 1.1 }, // a champion invasion (elite-grade, but sized for one): the usual tells, its charges a little bigger

  castFrom: 10, // casts come with SIGINT
  first: 3, // the first tell lands no sooner than this cycle (a cast and a second charge one later, a seal three)
  rest: { charge: 7, cast: 7, seal: 7 }, // after a tell lands or is answered, the next of its kind may land this many cycles on, plus a seeded 0..jitter (a charge 4 before R1: a cut answers it now, and a part has two ticks a fight)
  jitter: 2,
  heavy: 0.06, // another part's attack this big (a share of your max) on the same cycle: a charge waits for the next one
  burst: 3, // Full Disk: its burst of encryption lasts this many cycles
  castLasts: 4, // a cast's buff lasts this many cycles (another one starts the clock over, it doesn't stack)
  loud: 1.35, // Double Extortion: its attacks hit 35% harder
  grow: 0.25, // Self-Update: every part grows a quarter more Integrity
  mimic: 1, // the Mimic hits you with your last command's direct damage, all of it
  // Reading pays: a charge, a cast or the Mimic answered in its window staggers the part. It's Open (×mult from
  // everyone for `cycles`) and its next attack lands `delay` cycles later. A seal stopped readies the skill that
  // did it. Each read adds xp of the kill's XP (up to xpMax), and reading every tell in a fight (two or more said)
  // rolls its loot once more.
  open: { mult: 1.5, cycles: 2, delay: 1 },
  read: { xp: 0.1, xpMax: 0.4, rolls: 1, min: 2 },
  bots: { answer: true }, // sim switch (balance.mjs): a bot that plays as if it can't see tells
  sim: { only: null }, // sim switch (genesim.mjs): only the tells of these genes (tells.mjs plannedTells)
};
// The library. part: the fixed part it sits on ('special', the family's signature part; 'basic'; or a part id),
// shown on the chip and in the codex. gene: the tell gene it is (genes.mjs); a boss's or a guard's own name for one. A charge needs a part with an attack (it falls back to the other one).
export const TELLS = {
  // Charges: cut the part on its cycle (an interrupt), or soften it.
  fulldisk: { kind: 'charge', name: 'Full Disk', gene: 'fulldisk', part: 'special' }, // an Encrypt with a burst of encryption on top for 3 cycles
  massmailer: { kind: 'charge', name: 'Mass Mailer', gene: 'massmailer', part: 'special', spawn: 0 }, // a Replicate that hatches two (up to the limit); one more on top before R1, when a burst could answer it
  possession: { kind: 'charge', name: 'Possession', gene: 'possession', part: 'special', longer: 2 }, // a Scramble that lasts two cycles longer (Scrub clears it)
  lockon: { kind: 'charge', name: 'Lock-on', gene: 'overcharge', part: 'special' }, // Watchdog, Tracer: the Tracker
  infest: { kind: 'charge', name: 'Infest', gene: 'massmailer', part: 'special', spawn: 0 }, // Crawler: the Brood
  deepshred: { kind: 'charge', name: 'Deep Shred', gene: 'overcharge', part: 'special', shred: true }, // Shredder: it shreds a file in your pack too
  overcharge: { kind: 'charge', name: 'Overcharge', gene: 'overcharge', part: 'basic' }, // from level 17 (the tier's third tell): a second charge, on the other attacker
  ram: { kind: 'charge', name: 'Battering Ram', gene: 'batteringram', part: 'basic' }, // Bouncer (only its Gate attacks): the Gate wears ◆, so it mostly asks for ◆2 in the window
  // Casts (from level 10): SIGINT or a cut in its window, or break the part.
  extortion: { kind: 'cast', name: 'Double Extortion', gene: 'doubleextortion', part: 'special', does: 'loud' }, // its attacks hit 35% harder for 4 cycles
  selfupdate: { kind: 'cast', name: 'Self-Update', gene: 'selfupdate', part: 'special', does: 'grow' }, // every part grows a quarter more Integrity
  persistence: { kind: 'cast', name: 'Persistence', gene: 'persistence', part: 'special', does: 'haste' }, // its attacks repeat a cycle faster for 4 cycles
  callhome: { kind: 'cast', name: 'Call Home', gene: 'persistence', part: 'special', does: 'haste' }, // guards
  // Seals: strip the part before it lands, or it re-arms with one ◆ more.
  keyrotation: { kind: 'seal', name: 'Key Rotation', gene: 'rekey', part: 'special' },
  resync: { kind: 'seal', name: 'Resync', gene: 'rekey', part: 'special' },
  godark: { kind: 'seal', name: 'Go Dark', gene: 'rekey', part: 'special' },
  blacklist: { kind: 'seal', name: 'Blacklist', gene: 'rekey', part: 'special' }, // Sentinel: the Lockout
  // The Mimic's beat (a part's nature, not counted against the tier's count): every 4 cycles from cycle 3.
  mimic: { kind: 'mimic', name: 'Mimic', gene: 'mimic', part: 'mimic', first: 3, every: 4 },
  // Native bosses' signature charges (BOSSES nb-*): the family's charge, under the boss's own name.
  deadbolt: { kind: 'charge', name: 'Deadbolt', gene: 'fulldisk', part: 'special' },
  claymore: { kind: 'charge', name: 'Claymore', gene: 'overcharge', part: 'basic' },
  spamrun: { kind: 'charge', name: 'Spam Run', gene: 'massmailer', part: 'special', spawn: 1 },
  doppelganger: { kind: 'charge', name: 'Doppelganger', gene: 'possession', part: 'special', longer: 2 }, // MIRRORSHADE's before its rebuild
  glasscut: { kind: 'charge', name: 'Glass Cut', gene: 'overcharge', part: 'special' }, // MIRRORSHADE: a plain Overcharge on the Scrambler
  difficultybomb: { kind: 'charge', name: 'Difficulty Bomb', gene: 'overcharge', part: 'basic' }, // HASHLORD: on the Pulse Node
  blockreward: { kind: 'cast', name: 'Block Reward', gene: 'selfupdate', part: 'miner', does: 'grow' }, // HASHLORD: a Self-Update on the Miner
};
// Which tells each virus brings, in order: a tier's count takes the first ones open at the virus's level
// (a cast from TELL.castFrom; a seal from SEAL_FROM, on a part that wears ◆). Strains bring their own charge
// (STRAINS[id].tell, on their rule's part) and their lineage's cast and seal.
export const SEAL_FROM = 6;
export const TELL_SETS = {
  ransomware: ['fulldisk', 'extortion', 'overcharge', 'keyrotation'],
  worm: ['massmailer', 'selfupdate', 'overcharge', 'resync'],
  ghostroot: ['possession', 'persistence', 'overcharge', 'godark'],
  watchdog: ['lockon', 'callhome', 'overcharge'],
  sentinel: ['blacklist', 'callhome'],
  crawler: ['infest', 'callhome', 'overcharge'],
  shredder: ['deepshred', 'callhome', 'overcharge'],
  bouncer: ['ram', 'callhome'],
  tracer: ['lockon', 'callhome', 'overcharge'],
  // Native bosses on a family (a strain boss brings its strain's set, its charge renamed: BOSSES[id].charge).
  'nb-deadbolt': ['deadbolt', 'extortion', 'overcharge', 'keyrotation'],
  'nb-tripmine': ['claymore', 'extortion', 'fulldisk', 'keyrotation'],
  'nb-backorifice': ['spamrun', 'selfupdate', 'overcharge', 'resync'],
  'nb-mirrorshade': ['glasscut', 'persistence', 'godark'], // its charge is a plain one now: the Mimic is its one feedback amplifier
  'nb-hashlord': ['difficultybomb', 'blockreward', 'keyrotation'],
};

// ---------- the genome (genes.mjs, docs/genome.md) ----------
// What a virus is made of, before any number: a body (its family's core genes, or a guard's), a named build (a
// strain's genes on its rule's part), the genes today's dice roll (a third part and a mutation), and its grade
// (Linked from v2). The roll is today's: the third part by its own hash of the seed, the mutation off the virus's
// dice, so nothing else moves. overrides.genes forces the rolled genes instead (a probe in genesim.mjs; phase 3
// rolls them from an author's toolkit by the budget, genes.mjs budgetFor).
// Each gene on the virus says where it came from (src): core, build, rolled, grade or boss.
export function genomeOf(parts, { strain = null, mutation = null, grade = 1, boss = null, ice = false, srcs = [], linked = false } = {}) {
  const out = [];
  const add = (id, src) => { if (GENES[id] && !out.some((x) => x.id === id)) out.push({ id, src }); };
  const build = STRAINS[strain]?.genes || [];
  const srcOf = (p, i, id) => (srcs[i] ? (boss ? 'boss' : srcs[i]) : build.includes(id) || (ice && p.special) ? 'build' : 'core');
  parts.forEach((p, i) => { for (const id of partGenes(p)) add(id, srcOf(p, i, id)); });
  if (mutation && MUTATIONS[mutation]) add(MUTATIONS[mutation].gene, boss ? 'boss' : 'rolled');
  if (grade >= 2) add('linked', 'grade');
  else if (linked) add('linked', 'rolled'); // forced (a probe)
  return out;
}
// A wild virus's name before its tag: its body's stem, after the adjective of its costliest rolled gene (the first
// rolled, on a tie). A strain is a named build: its name is its own.
export function stemOf(family, genome = []) {
  const f = familyOf(family), stem = f?.stem || f?.name.toUpperCase() || String(family).toUpperCase();
  const rolled = genome.filter((g) => g.src === 'rolled' && GENES[g.id]);
  const top = rolled.reduce((best, g) => (!best || GENES[g.id].cost > GENES[best.id].cost ? g : best), null);
  return top ? `${GENES[top.id].adj.toUpperCase()} ${stem}` : stem;
}
// Who wrote it (authors.mjs): a boss's author, a named build's, Kestrel for ICE and the Sentinel, then whoever
// the fight's place says (a faction's server, a guard's server; null for SPRAWL-00's strays), then the family's crew.
export function authorOf({ family, strain = null, boss = null }, context) {
  if (boss) return BOSSES[boss]?.author ?? bossAuthor(boss) ?? (context !== undefined ? context : crewOf(family));
  if (strain) return STRAINS[strain]?.author || null;
  if (GUARDS[family]?.ice || family === 'sentinel') return 'kestrel';
  if (context !== undefined) return context;
  return crewOf(family);
}

// Build a virus from a named fixture or a seeded random variant.
// overrides: family, strain, grade, mutation, threat, run, elite (eliteHp), boss (bossHp), genes (the rolled genes,
// forced), author (who the fight's place says wrote it, when the virus has no author of its own; null: nobody's).
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
  const genes = Array.isArray(overrides.genes) ? overrides.genes : null; // forced rolled genes
  const mutation = overrides.mutation !== undefined ? overrides.mutation : genes ? genes.find((id) => GENES[id]?.mutation) || null : rolled;
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
  const open = (strain ? strain.parts : family.parts).filter((spec) => !spec.from || ((random || overrides.family) && level >= spec.from));
  // The third part: a gene's part (genes.mjs), one of those open at its level (the family's pool, in order), picked by its own hash of the
  // seed so it never moves the virus's other rolls. A boss keeps its family's first (the classic one).
  const pool = open.filter((spec) => spec.pool === 'third');
  const own = overrides.boss && pool.find((spec) => spec.id === BOSSES[overrides.boss]?.third); // a native boss brings its own (data BOSSES nb-*)
  const third = genes ? pool.find((spec) => genes.includes(spec.gene)) || null : pool.length ? own || pool[overrides.boss ? 0 : (Math.imul((seed >>> 0) ^ 0x7f4a7c15, 2246822519) >>> 0) % pool.length] : null;
  const specs = [...open.filter((spec) => spec.pool !== 'third' || spec === third), ...(BOSSES[overrides.boss]?.extra || [])]; // a boss's own parts (HASHLORD's Pool Lock)
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
  // Under its trim level a boss's budget trims a part: fewer ◆, a slower attack (MIRRORSHADE's Scrambler at 12 and 13).
  const cut = boss?.trim && level < boss.trim.below && parts.find((p) => p.id === boss.trim.part);
  if (cut) { cut.armor = cut.maxArmor = Math.min(cut.maxArmor, boss.trim.armor); if (cut.attack) cut.attack.interval = Math.max(cut.attack.interval, boss.trim.interval); }
  const weakPoint = parts[Math.floor(next() * parts.length)].id;
  const srcs = specs.map((spec) => (spec.pool === 'third' || boss?.extra?.includes(spec) ? 'rolled' : null));
  const genome = genomeOf(parts, { strain: strainId, mutation, grade, boss: overrides.boss || null, ice: !!family.ice, srcs, linked: !!genes?.includes('linked') });
  // Its name (docs/genome.md 5.4): the adjective of its costliest rolled gene, its body's stem or its build's name, its
  // tag (the seed's four digits, or its file's) and its grade: WARDED CRYPTJACK-4821 v2. Named fixtures keep theirs.
  const tagNo = overrides.tag ? String(overrides.tag).slice(-4).padStart(4, '0') : String(seed >>> 0).slice(-4).padStart(4, '0');
  const name = (overrides.elite ? 'ELITE ' : '') + (strain ? strain.name.toUpperCase() + '-' + tagNo : random ? stemOf(familyId, genome) + '-' + tagNo : fixture.name) + (grade > 1 ? ` v${grade}` : '');
  // Enemy damage can crit, from level 3 (like mutations).
  const crit = level >= SERVER.mutationsFrom ? CONFIG.enemyCrit : 0;
  const author = authorOf({ family: familyId, strain: strainId, boss: overrides.boss || null }, overrides.author);
  return { id: familyId + '-' + seed, name, family: familyId, strain: strainId, grade, dormant: strain?.dormant ? true : false, art: family.art || familyId, mutation, threat, level, power: dmgScale * (overrides.elite ? ELITE.dmg : 1), hpPower: scale, crit, threatens: family.threatens, parts, weakPoint, weakKnown: false, ...(overrides.elite ? { elite: true } : {}), ...(boss ? { boss: overrides.boss, phases: boss.phases.map((x) => ({ ...x, done: false })), enrageAt: boss.enrageAt } : {}),
    genes: genome, author };
}

// ---------- locations ----------

const OWNERS = ['KESSLER', 'VANTA', 'HALVARD', 'ORIN', 'MOTHWELL', 'SABLE'];
const NODES = ['RELAY', 'CACHE', 'MIRROR', 'SINK', 'DEPOT', 'SPUR'];
const WORDS = ['saltmarsh', 'bluejay', 'kiln', 'ferrous', 'parallax', 'marrow', 'lantern', 'quarry'];

export const TEMPLATES = ['relay', 'mailhub', 'mirror', 'archive', 'lab'];

// Every location carries its family's quirk: one visible rule, like a mutation.
export const QUIRKS = {
  hoard: { family: 'ransomware', name: 'Hoard', rule: 'Caches pay 50% more, but the guards are Armored.' },
  nest: { family: 'worm', name: 'Nest', rule: 'An extra /nest folder holds a Crawler and its brood. It is optional, and good for components.' },
  hidden: { family: 'ghostroot', name: 'Hidden', rule: 'Something is stashed in a hidden folder. ls -a shows it.' },
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

// Your server's level is your highest class level (combat.mjs serverLevel): it has no XP of its own.
// It sets its base Integrity and opens daemon slots, service versions, outpost bandwidth, buildings
// and architecture.
// The network is a stack of eight floors going down (docs/servers.md 5, R3): each its own diagram (floors.mjs), with its
// own level band, shape and size. A server's level is fixed when its floor is generated: the near side of a floor sits
// at the band's floor, the exit's neighbours at its top (EverQuest/WoW zone ranges, each a step down the tower).
export const FLOORS = [
  { name: 'The Sprawl', band: [1, 8], shape: 'star', servers: 10, exits: 1 },
  { name: 'Backhaul', band: [7, 14], shape: 'trunk', servers: 12, exits: 1 },
  { name: 'The Stacks', band: [13, 20], shape: 'lattice', servers: 14, exits: 1 },
  { name: 'Coldline', band: [19, 26], shape: 'ring', servers: 14, exits: 2 },
  { name: 'Deep Core', band: [25, 32], shape: 'bridge', servers: 16, exits: 2 },
  { name: 'Kernel Space', band: [31, 38], shape: 'tree', servers: 16, exits: 2 },
  { name: 'The Sink', band: [37, 44], shape: 'funnel', servers: 18, exits: 2 },
  { name: 'Bedrock', band: [43, 50], shape: 'islands', servers: 18, exits: 0 },
];
const fl = (floor) => FLOORS[Math.min(FLOORS.length, Math.max(1, floor || 1)) - 1];
export const bandOf = (floor) => fl(floor).band;
// Your floor: the deepest one whose band your level has reached (it replaced "your layer").
export const floorFor = (level) => FLOORS.reduce((d, f, i) => (level >= f.band[0] ? i + 1 : d), 1);
// Daemons keep their own five bands (an invasion drops its level's band, daemons.mjs): the old layers' bands.
export const DAEMON_BANDS = [[1, 9], [7, 18], [16, 28], [26, 40], [38, 50]];
// Content still names the five old layers (an item's vault or rogue source, `layer`; loot's depth bonus): a floor reads
// as the old layer its band's middle sat in (1, 2, 3, 3, 4, 4, 5, 5), so drops by level are as they were.
export const layerOf = (floor) => DAEMON_BANDS.reduce((d, [lo], i) => ((bandOf(floor)[0] + bandOf(floor)[1]) / 2 >= lo ? i + 1 : d), 1);
// The first floor whose band reads as an old layer (for words: "Floor 3 vaults").
export const floorOfLayer = (layer) => FLOORS.findIndex((_, i) => layerOf(i + 1) >= layer) + 1 || FLOORS.length;
export const SERVER = {
  maxLevel: 50,
  // Enemies have a level. Home intrusions come in at your level. A server's level is its place on its floor (place:
  // 0 by the entry, 1 by the exit), fixed when the floor is generated.
  floorFor,
  locationLevel: (floor, place = 0) => { const [lo, hi] = bandOf(floor); return Math.round(lo + Math.max(0, Math.min(1, place)) * (hi - lo)); },
  // What keeps up with you (a rogue server, a held server's root processes, the farm): your level, kept inside its floor's band.
  keepUp: (hackerLevel, floor) => { const [lo, hi] = bandOf(floor); return Math.min(hi, Math.max(lo, hackerLevel)); },
  guardLevel: (level, depth) => level + 3 * (depth - 1), // (old saves without a location level)
  mutationsFrom: 3, // enemy crits start here
  // How often a virus at a level is mutated: none below 4, a quarter to level 9, then 40% (wild ones,
  // invasions; swarms are a little under). The difficulty steps at level 3 no longer all land at once.
  mutationChance: (level) => (level < 4 ? 0 : level < 10 ? 0.25 : 0.4),
  daemonSlotsAt: [15, 30, 45], // +1 daemon slot at each of these server levels
  // Threat is the level on the internal scale that sizes a virus (4% per point from 15).
  threat: (mobLevel) => 9 + mobLevel,
};

// ---------- classes, skills, levels and talents ----------
// Each class levels on its own, from 1 to 50, a long WoW-style climb. Every level adds 4%
// power; skills unlock along the way (seven bar slots, an eighth at 22 and a ninth at 30; the last skill at 38);
// a talent point every other level from 10 (21 by level 50, a full tree).
// bar: [level, slots] steps; equipSlots: the most you'll ever have. keys: the key each slot is on, in order.
// kit: from level 5 (specFrom) one of a class's two first-row talents (ARCHETYPES[cls].spec) is part of its base kit, specRanks
// free ranks: the level-5 specialty pick is gone. The Infiltrator's is Recon: two ranks of Heap Spray took a blue Payload from
// 34% to 21% of its Signal a fight at level 10 (docs/progression.md), far past the few percent the others add.
export const LOADOUT = { equipSlots: 9, bar: [[1, 7], [22, 8], [30, 9]], keys: ['2', '3', '4', '5', '6', '7', '8', '9', '0'], maxLevel: 50, talentFrom: 10, talentEvery: 2, capstoneAt: [45, 50], trialUntil: 5, specFrom: 5, specRanks: 2, kit: { breaker: 'overclocked', bastion: 'patch-notes', infiltrator: 'recon', operator: 'thread-pool' } }; // trialUntil: until a class reaches it, switching carries your level over
// What unlocks at each hacker level (same shape for every class; `order` fills the skill steps).
export const UNLOCKS = [
  { level: 1, what: 'spike' }, { level: 1, what: 0 }, { level: 3, what: 1 }, { level: 5, what: 2 },
  // Your 4th skill (Crack, Retaliate, Backdoor, Botnet) comes before Backtrace: armor needs an answer early.
  { level: 7, what: 3 }, { level: 10, what: 'edge' }, // the edge comes with your subclass; its skills at SUBCLASS.unlocks
  { level: 10, what: 'sigint' }, // everyone's interrupt, for casts: a crew boss's (raid.mjs), a solo tell's (tells.mjs)
];
// XP: a kill is worth 20 + 10 per enemy level. The climb is long: about 100 hours of real play to 50 at
// LOOT.killsPerHour (150 kills an hour), front-loaded (an hour to 5, 4 to 10, 15 to 20, 35 to 30, 65 to 40): a sandbox,
// not a storyline. CLIMB.kills is what level L to L+1 takes, in kills of your own level (straight between its points):
// 23 at level 1 (minutes), 160 at 4, 172 at 10, 523 at 20, 818 at 30, 1,000 at 40, 1,137 at 49: about 31,000 to 50 on
// paper. The pacing bot earns about 2 kills of XP a fight (rooms pay 1.25, elites, first clears, Mapped servers,
// contracts), so it fights about 15,000 times on the way (pacing.mjs). The points were cut 10-23% when a Mapped or held
// server's rooms began to respawn in minutes (docs/progression.md 7): the bot farms them, which pays less a fight than
// exploring did, and the climb ran 11-33% long. CLIMB.minutes is the real play a level should
// take (5 at level 1, 48 at 10, 95 at 20, 160 at 30, 200 at 40, 220 at 49): Behind's target, and the table's sum.
// Before save v42 a level took 5 + 1.2 × L kills (V41_KILLS): about 1,700 to 50, 7 hours of real play.
export const CLIMB = {
  kills: [[1, 23], [2, 62], [3, 130], [4, 160], [5, 170], [10, 172], [15, 366], [20, 523], [25, 673], [30, 818], [35, 909], [40, 1000], [45, 1068], [49, 1137]],
  minutes: [[1, 5], [4, 27], [5, 28], [9, 44], [10, 48], [19, 84], [20, 95], [29, 145], [30, 160], [39, 200], [49, 220]],
};
const along = (pts, L) => {
  if (L <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (L <= pts[i][0]) { const [a, x] = pts[i - 1], [b, y] = pts[i]; return x + ((y - x) * (L - a)) / (b - a); }
  return pts.at(-1)[1];
};
export const killXp = (level) => 20 + 10 * Math.max(1, level);
export const killsToNext = (level) => along(CLIMB.kills, Math.max(1, level));
export const xpToNext = (level) => Math.round(killXp(level) * killsToNext(level));
export const V41_KILLS = (level) => 5 + 1.2 * Math.max(1, level);
export const v41XpToNext = (level) => Math.round(killXp(level) * V41_KILLS(level)); // the curve before save v42 (its migration)
// One-off deeds (a first clear, a Mapped server, a takeover, a Root level, a decode, a puzzle board, a first craft) grow
// with the climb, so exploring still pays its part: their kill shares (ROOMS.xp, XP, ...) are the old curve's times
// DEED.share of how much longer the level is than before v42 (climbStretch): about 6.5 at level 4, 4.3 at 9, 7.1 at 19,
// 7.9 at 29, 7.1 at 49. A full share kept deeds' part of a level, but the long climb finishes every floor where the old
// one outgrew half of it, so deeds came to 80% of the XP; at 0.4 they are about a quarter (pacing.mjs). Kills, and
// work that is so many kills (contracts), are not scaled.
export const climbStretch = (level) => killsToNext(level) / V41_KILLS(level); // how much longer a level is than before v42
export const DEED = { share: 0.4 };
export const deedScale = (level) => Math.max(1, DEED.share * climbStretch(level));
// WoW-style: enemies above you give a little more, ones below give less, 10 levels below nothing.
export const xpScale = (gap) => (gap >= 0 ? 1 + 0.05 * Math.min(gap, 5) : Math.max(0, 1 + 0.1 * gap));
// Other XP, as shares of a kill at that level.
export const XP = { home: 1, guard: 0.8, vault: 1.5, newLocation: 0.7 };
// Catch-up (Behind): each level has a target of CLIMB.minutes of active play (28 at 5, 48 at 10, 95 at 20, 160 at
// 30, 200 at 40). Once a level runs past `after` times its target, kills pay +bonus until the level ends. Only time
// you played counts.
export const CATCHUP = { after: 1.25, bonus: 0.5 };
export const levelTarget = (level) => Math.round(along(CLIMB.minutes, Math.max(1, level)) * 60000);
// Rested (World of Warcraft's rule): time safely away (no crash) banks 5% of a level every 8 hours, of the level you're on
// when it banks, up to 1.5 levels (10 days away from empty). Kills spend it: each pays double until it runs out
// (combat.mjs payKill). A night away is about 5% of a level, a weekend about 30%.
export const RESTED = { share: 0.05, everyMs: 8 * 3600000, cap: 1.5 };
export const restedGain = (level, ms) => (xpToNext(level) * RESTED.share * ms) / RESTED.everyMs;
export const restedCap = (level) => Math.round(RESTED.cap * xpToNext(level));
// The talent tree, top to bottom: filler rows (ranked, up to 3 each) between the
// three choice tiers. A row opens once you've spent `need` points in the rows above it.
// The capstone row under them (each subclass's `capstones`, two of them) has its own points, one at each
// LOADOUT.capstoneAt level (45 and 50): the first picks one, the second gives it its second rank. Talent points
// never reach it, and its points go nowhere else. It opens with 15 points spent above it (the third tier picked).
export const TREE = [
  { kind: 'filler', row: 0, need: 0 },
  { kind: 'choice', tier: 0, need: 3 },
  { kind: 'filler', row: 1, need: 4 },
  { kind: 'choice', tier: 1, need: 8 },
  { kind: 'filler', row: 2, need: 9 },
  { kind: 'choice', tier: 2, need: 14 },
  { kind: 'capstone', need: 15 },
];
const f = (id, name, rule, per) => ({ id, name, rule, per, max: 3 });
// Key 1, the plain hit every class has: a plain 25 with no cooldown, the filler under every rotation. Each class
// calls it by its own name and types its own word for it (`spike` works for every class too). Its id stays
// `spike` everywhere in the code and the save.
export const SPIKE = {
  breaker: { word: 'bash', name: 'Bash', rule: 'Deals 25 damage to the target. With no target named, hits the last part you attacked.' },
  bastion: { word: 'ban', name: 'Ban', rule: 'Deals 25 damage to the target. With no target named, hits the last part you attacked.' },
  infiltrator: { word: 'poke', name: 'Poke', rule: 'Deals 25 damage to the target. With no target named, hits the last part you attacked.' },
  operator: { word: 'ping', name: 'Ping', rule: 'Deals 25 damage to the target. With no target named, hits the last part you attacked.' },
};
export const spikeOf = (arch) => SPIKE[arch] || { word: 'spike', name: 'Spike', rule: 'Deals 25 damage to the target. With no target, Spike hits the last part you hit.' };
// The cantrips as a class sees them: key 1 under its own name.
export const cantripsOf = (arch) => CANTRIPS.map((c) => (c.id === 'spike' ? { ...c, name: spikeOf(arch).name, word: spikeOf(arch).word, rule: spikeOf(arch).rule } : c));
export const CANTRIPS = [
  { key: '1', id: 'spike', name: 'Spike', rule: 'Deals 25 damage to the target. With no target, Spike hits the last part you hit.' },
  { key: '-', id: 'sigint', name: 'SIGINT', rule: 'Interrupts a cast that is compiling on a virus part or a crew boss. Some casts can\'t be interrupted, and a crew boss you interrupt casts its next one sooner. 8 cycle cooldown.' },
];
// Edge: each class's signature passive, from level 10 (the root of its talent tree).
export const EDGE = {
  // sub: since subclasses, the old edge belongs to one of them (edge(s, cls) in combat.mjs checks it).
  breaker: { name: 'Overkill', rule: 'When your hit breaks a part, the leftover damage spills onto the next part, up to 20.', cap: 20, sub: 'demolitionist' },
  bastion: { name: 'Grudge', rule: 'Your hits deal 20% more damage to the part that last hit you.', bonus: 0.2, sub: 'warden' },
  infiltrator: { name: 'Weak Spot', rule: 'Your first hit that damages each part is a critical strike. A hit that pierces armor to get there does not count.', sub: 'phantom' },
  operator: { name: 'Last Gasp', rule: 'Each of your helpers strikes once more as it expires.', sub: 'herder' },
};
// Sync Window bonuses: each class syncs its own way.
export const SYNC = {
  // tag: the word that floats up with SYNCED when the bonus lands.
  breaker: { amount: 1, rule: 'Breaks 1 more ◆ on the part you hit.', tag: '+1 ◆' },
  bastion: { amount: 8, rule: 'Shields you for 8.', tag: '+8 shield' },
  infiltrator: { amount: 1, rule: 'Extends your burns on the part you hit by 1 cycle.', tag: 'burns +1' },
  operator: { amount: 1, rule: 'Makes each of your helpers strike once more.', tag: 'helpers again' },
};
// Shared statuses: each class makes one; anyone's hits cash it in.
export const STATUSES = {
  exposed: { name: 'Exposed', by: 'Breaker', rule: 'Hits on it from anyone have a 25% higher chance to critically strike.' },
  tagged: { name: 'Tagged', by: 'Infiltrator', rule: 'Burns on it from anyone deal 50% more damage. Its attack timer shows even through a veil.' },
  throttled: { name: 'Throttled', by: 'Bastion', rule: 'Its attacks deal half damage.' },
  hooked: { name: 'Hooked', by: 'Operator', rule: 'Every hit on it from anyone, including helpers and burns, deals 6 additional damage.' },
};
const t = (id, name, rule) => ({ id, name, rule });
const sentence = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const card = (id) => ({ id, name: ABILITIES[id]?.name || id, rule: sentence(ABILITIES[id]?.help.replace(/^[^—]*— /, '') || ''), verb: ABILITIES[id]?.verb || 'util' });
const RUN_SKILLS = {
  spoof: { id: 'spoof', name: 'Spoof', rule: 'The next guarded folder you enter does not start a fight, so you can read and pull one file there. Usable once per run.', verb: 'run' },
  tap: { id: 'tap', name: 'Tap', rule: 'Prints the server\'s whole folder tree, its guards, and which file holds the key. Usable once per run.', verb: 'run' },
};
const skillsOf = (ids) => ids.map((id) => RUN_SKILLS[id] || card(id));
// A subclass's line: its eleven bar skills at SUBCLASS.unlocks, and its run skills (`run`) at their own levels,
// in unlock order.
export const SUBCLASS = { from: 10, unlocks: [10, 12, 14, 16, 18, 20, 22, 26, 30, 34, 38] };
// Lines and unlock levels are fixed once the classes load, and a fight asks for them on every command:
// both are worked out once (the pacing bot's long climbs spent a third of their time here).
const LINES = new WeakMap();
function lineOf(x) {
  if (LINES.has(x)) return LINES.get(x);
  const out = x.skills.map((id, i) => ({ id, level: SUBCLASS.unlocks[i] ?? Infinity }));
  for (const [id, level] of Object.entries(x.run || {})) out.push({ id, level });
  out.sort((a, b) => a.level - b.level);
  LINES.set(x, out);
  return out;
}
const lineIds = (x) => lineOf(x).map((y) => y.id);
export { lineOf };
// A class's subclasses, from its module: skill cards for their lines, plus their trees and edge.
const subsOf = (cls) => Object.fromEntries(Object.entries(CLASS_DATA[cls].subs).map(([id, x]) => [id, { ...x, id, cls, cards: skillsOf(lineIds(x)) }]));
export const ARCHETYPES = {
  breaker: {
    name: 'Breaker', role: ['DPS', 'Burst'], idea: 'Break it before it breaks you.', solo: 'Fastest kills.', crew: 'Opens damage windows for everyone.',
    status: 'exposed',
    passive: { name: 'Momentum', rule: 'Each part you break increases your damage by 10% for 2 cycles, stacking up to 3 times. Another break refreshes the duration.' },
    core: ['overload', 'flood', 'exploit', 'crack'], // levels 1–7; the rest of a kit is its subclass's (subs)
    spec: [f('overclocked', 'Overclocked Core', 'Increases all damage you deal by 3% per rank.', 0.03), f('chain-exploit', 'Chain Exploit', 'Increases the damage each Momentum stack gives by 2% per rank.', 0.02)], // the level-5 specialty: one of these, two free ranks
    subs: subsOf('breaker'),
    skills: [], // every skill the class can have, core and both subclasses (filled in below)
  },
  bastion: {
    name: 'Bastion', role: ['Tank', 'Healer'], idea: 'Nothing lands unless you allow it.', solo: 'Survives anything.', crew: 'The tank and healer.',
    status: 'throttled',
    passive: { name: 'Hardened', rule: 'The first hit that damages you in each fight deals 25% less damage.' },
    core: ['rate-limit', 'firewall', 'purge', 'retaliate'], // levels 1–7; the rest of a kit is its subclass's (subs)
    spec: [f('patch-notes', 'Patch Notes', 'Increases the healing of Patch by 3 per rank.', 3), f('stateful-firewall', 'Stateful Firewall', 'Increases the damage Firewall absorbs by 5 per rank.', 5)], // the level-5 specialty: one of these, two free ranks
    subs: subsOf('bastion'),
    skills: [], // every skill the class can have, core and both subclasses (filled in below)
  },
  infiltrator: {
    name: 'Infiltrator', role: ['DPS', 'Damage over time', 'Stealth runs'], idea: 'Know where to hit, and slip through runs.', solo: 'Precision damage and the easiest runs.', crew: 'Tags targets and gets the crew past guards.',
    status: 'tagged',
    passive: { name: 'Ghost', rule: 'Slips you past one guard per run without a fight. Every fight opens with a blue Surprise window, and Inject, Tag and Keepalive fired in it are stronger. Return trips on runs are free.' },
    core: ['inject', 'backdoor', 'keepalive', 'tag'], // levels 1–7; the rest of a kit is its subclass's (subs)
    spec: [f('heap-spray', 'Heap Spray', 'Increases the damage of each Inject tick by 3 per rank.', 3), f('recon', 'Recon', 'Increases the damage of Opening by 5 per rank.', 5)], // the level-5 specialty: one of these, two free ranks
    subs: subsOf('infiltrator'),
    skills: [], // every skill the class can have, core and both subclasses (filled in below)
  },
  operator: {
    name: 'Operator', role: ['Support', 'Summoner'], idea: 'Write the script, let it run.', solo: 'Steady damage without constant input.', crew: 'Makes everyone’s hits count for more.',
    status: 'hooked',
    passive: { name: 'Extra thread', rule: 'Grants 1 extra daemon slot.' },
    core: ['deploy', 'hook', 'spawn', 'botnet'], // levels 1–7; the rest of a kit is its subclass's (subs)
    spec: [f('thread-pool', 'Thread Pool', 'Increases the damage of Deploy helpers by 1 per rank.', 1), f('kernel-hook', 'Kernel Hook', 'Increases the damage Hooked adds to each hit by 1 per rank.', 1)], // the level-5 specialty: one of these, two free ranks
    subs: subsOf('operator'),
    skills: [], // every skill the class can have, core and both subclasses (filled in below)
  },
};
// Skills in unlock order for a class.
// Subclasses: picked at SUBCLASS.from (when the edge used to come); each has its own skill line of eleven,
// unlocking at SUBCLASS.unlocks in the order its module writes them, its own edge and talent tree. Run skills
// (the Phantom's Spoof and Tap) take no slot and come at levels of their own (the subclass's `run`).
// Every subclass by id (ids are unique across classes): { id, cls, name, edge, skills, cards, fillers, talents }.
export const SUBS = Object.fromEntries(Object.values(ARCHETYPES).flatMap((a) => Object.values(a.subs).map((x) => [x.id, x])));
// The class that never picked one plays its old-edge subclass (EDGE[cls].sub) until it does.
export const defaultSub = (arch) => EDGE[arch]?.sub || Object.keys(ARCHETYPES[arch].subs)[0];
for (const a of Object.values(ARCHETYPES)) {
  const seen = new Set();
  a.skills = skillsOf([...a.core, ...Object.values(a.subs).flatMap((x) => lineIds(x))].filter((id) => !seen.has(id) && seen.add(id)));
}
// A kit's skills in unlock order: the class's core, then its subclass's line (none before you pick), run skills
// in among them at their own levels.
export const skillOrder = (arch, sub = null) => [...ARCHETYPES[arch].core, ...(sub && ARCHETYPES[arch].subs[sub] ? lineIds(ARCHETYPES[arch].subs[sub]) : [])];
// Bar slots at a level (LOADOUT.bar), and the run skills (Spoof, Tap), which never take a slot: they're
// typed on runs.
export const barSlots = (level) => LOADOUT.bar.reduce((n, [l, k]) => (level >= l ? k : n), LOADOUT.bar[0][1]);
export const isRunSkill = (id) => !!RUN_SKILLS[id];
export const startingSkills = (arch) => skillOrder(arch).filter((id) => !isRunSkill(id)).slice(0, barSlots(1));
// Level at which a class learns a skill or cantrip. A subclass skill: at its place in that subclass's
// line (with no subclass named, the first of the class's lines that has it).
const UNLOCK_AT = new Map();
export function unlockLevel(arch, id, sub = null) {
  let byArch = UNLOCK_AT.get(arch);
  if (!byArch) UNLOCK_AT.set(arch, (byArch = new Map()));
  let bySub = byArch.get(sub);
  if (!bySub) byArch.set(sub, (bySub = new Map()));
  let at = bySub.get(id);
  if (at === undefined) bySub.set(id, (at = unlockAt(arch, id, sub)));
  return at;
}
function unlockAt(arch, id, sub) {
  const i = ARCHETYPES[arch].core.indexOf(id);
  const u = UNLOCKS.find((x) => (i >= 0 ? x.what === i : x.what === id)); // the core, the cantrips, the edge
  if (u) return u.level;
  const subs = sub ? [ARCHETYPES[arch].subs[sub]].filter(Boolean) : Object.values(ARCHETYPES[arch].subs);
  for (const x of subs) { const at = lineOf(x).find((y) => y.id === id); if (at) return at.level; }
  return Infinity;
}
// The shipped presets of a subclass (its data's `presets`): `rotation` first. Each is a priority list: the bar it
// gives at a level is the first keys of it you know, in its order, and then whatever else you know in unlock order
// if slots are left over (presetBar).
export const shippedPresets = (sub) => SUBS[sub]?.presets || {};
export function presetBar(arch, sub, level, list, known = null) {
  const slots = barSlots(level);
  const has = known ? (id) => known.includes(id) : (id) => unlockLevel(arch, id, sub) <= level;
  const fight = (id) => !isRunSkill(id) && has(id) && skillOrder(arch, sub).includes(id);
  const out = [];
  for (const id of list) if (out.length < slots && fight(id) && !out.includes(id)) out.push(id);
  for (const id of skillOrder(arch, sub)) if (out.length < slots && fight(id) && !out.includes(id)) out.push(id);
  return out;
}

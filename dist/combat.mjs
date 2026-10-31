// BLACKBOX combat engine. Pure and deterministic: commands in, events out.
// Rendering never advances the simulation. This file is written so it can
// later run on a shared server unchanged.
import { onFound, memoryCommand, isLive, joinCost, memoryRestore } from './memory.mjs';
import { onFirstServer } from './scenes.mjs';
import { barSlots, isRunSkill, SUBCLASS, SUBS, defaultSub, ELITE, BOSS_LOOT, BOSSES, ENRAGE, makePart, EDGE, SYNC, CONFIG, ABILITIES, SKILLS, DAEMONS, SPARE_EXPLOIT, FAMILIES, FIXTURES, GUARDS, MUTATIONS, STRAINS, SERVER, TEMPLATES, layerOf, floorOfLayer, createVirus, createLocation, ARCHETYPES, CANTRIPS, LOADOUT, TREE, UNLOCKS, XP, xpToNext, killXp, xpScale, deedScale, power, mobPower, skillOrder, unlockLevel, lineOf, presetBar, shippedPresets, spikeOf, SPIKE } from './data.mjs';
// The subclasses' engine side (dist/classes/<class>.mjs): what their skills, talents and edges do.
import BREAKER_FX, { momentumCap } from './classes/breaker.mjs';
import BASTION_FX from './classes/bastion.mjs';
import INFILTRATOR_FX from './classes/infiltrator.mjs';
import OPERATOR_FX from './classes/operator.mjs';

import { contractKill, contractTakeover, standingCrash, mailCommand, tickMail, initMail, openContracts, systemLetter, contractPackLost, contractDefuse, contractLocated } from './mail.mjs';
import { tickStore, buy, indemnityRestore } from './store.mjs';
import { buyFrom, claimServer, reclaimCheck, clearedFor, strikeServer } from './factions.mjs';
import { tickMarket, marketCommand } from './market.mjs';
import { tickPayloads, payloadCommand } from './payload.mjs';
import { tickHubs, hubCommand, hubWon } from './hubs.mjs';
import { IMPLICIT_HOOKS } from './faction-gear.mjs';
import { gainComponents, componentsRestore } from './salvage.mjs';
// Configs are gone (service side-grades; Triage was the last). A save that owned any is refunded.
const RETIRED_CONFIGS = ['stateful', 'reflective', 'inspection', 'adaptive', 'sticky', 'toll', 'beacon', 'tar', 'sting', 'triage'];
const CONFIG_REFUND = 250;
import { fleetCommand, fleetWon } from './fleet.mjs';
import { eventCommand, eventWon, outbreakMult, eventKill } from './events.mjs';
import { postsOf, programsOn, listenBoost as postBoost, componentChance, retireOutposts, retireLetter, PROGRAM_IDS, codebasesOf } from './sockets.mjs';
import { consortiumWon } from './consortium.mjs';
import { rollRogue, rogueKill } from './rogue.mjs';
import { raidStart, raidLand, raidCycle, raidShield, raidBroke, raidTaken, raidAbsorb, noteDealt, noteHeal, cleanse, attackTarget, sigint, sigintCheck } from './raid.mjs';
import { tellStart, tellCycle, tellLand, tellBroke, chargeNow, tellIntents, tellSigint, tellSigintCheck, tellOn, tellsOf, overclockMult, hotCharge } from './tells.mjs';
import { prepareTicks, onHit as tickHit, blastCut, BOSS_RULES } from './interrupt.mjs';
import { TELL, ROOM_FAMILIES, DAMPER_KINDS, floorFor, partGenesFor } from './data.mjs';
import { holdsPart, objectiveBroke, objectiveCycle, objectiveBonus, bonusXp, bonusRolls } from './objectives.mjs';
import { mechValidate, mechIntercept, mechFired, mechPower, exposedCut, mechLanded, mechCommandHit, mechStart, mechClose, mechBroke, lagged, stunnedNow, missedTurn } from './mechanics.mjs';
import { tickRoot, processWon } from './root.mjs';
import { firewallCommand, wear, raidShare, hardenRestore } from './firewall.mjs';
import { rollSpecials, specialsRestore, hasSpecial, SPECIAL, leaningOf } from './specials.mjs';
import { leanDealt, leanTaken, leanPaid } from './leanings.mjs';
import { levelGains, nextGains, progressionRestore, climbRestore, craftRestore, RETIRED } from './progression.mjs';
import { invaderDown, invasionRestore, signatureRestore } from './invasion.mjs';
import { runDaemons, daemonsOn, daemonsHurt, flushDaemons, lifeline, lifelineHeal, daemonCommand, daemonRestore, slottedDaemons, daemonAmount, watchmanBar, gainDaemon } from './daemons.mjs';
export { daemonSlots, slottedDaemons, daemonLevel, daemonAmount, daemonNext, watchmanBar, gainDaemon } from './daemons.mjs';
import { filterCommand, filterStat, FILTER_STATS, rollFilter, addFilter } from './filters.mjs';
import { spawnHidden, huntKill, hiddenNode, hiddenLead, HIDDEN, installRelay, useItem, syncFlags, traceNear, leadOf } from './hidden.mjs';
import { slotNode, pickSlot, hiddenAt, hiddenNear, floorOfSlot, lairAt, floorLairBosses, reached, floorCommand, floorsRestore, floorsLetter } from './floors.mjs';
import { STATS, RARITIES, RARITY_ORDER, ZERO_DAYS, LOOT, lootOdds, magicFind, uniqueItem, DECONSTRUCT, SLOTS, OLD_SLOT, BASES, AFFIX_FOR, STASH_CAP, CRIT, ECHO, PROTOCOL_NAMES, protocolSlots, rollItem, statLine, itemLabel, MATERIALS, codeOf, codeDrop, EXPLOIT_CHANCE, RULES, IMPLICITS, implicitFx, PROTOCOL_STATS, SLOT_KINDS, GROUPS, groupOf, statValue, seeded, statsRestore } from './gear.mjs';

import ITEMS from './content/items.mjs';
import { SETS, setFx, activeSets, isPiece, setPool, SET_LOOT, CLASS_SET, setPityKey, SET_EVENT, sourcePool, sourceKey, setOf, setsRestore, SET_HOOKS, setStat, setSignal, setHealMult, sxOf, restFast } from './sets.mjs';
import { fxText, fxList } from './content.mjs';
import { deathRecap } from './recap.mjs';
import { situationOf } from './situations.mjs';
import { seeGenes, winGenes, genomeCommand, virusGenes, bylined, logFight, logWin, dexOf } from './genome.mjs';
import { fightOver, achievementsRestore } from './achievements.mjs';
import { collectionRestore, homeOfUnique, logGo } from './collection.mjs';
import { researchOf, gainResearch, knows as knowsAt, masteryDmg, masteryDrop, TIER, researchAt } from './research.mjs';
import { PARTS, heatOf } from './parts.mjs';
import { crewOf, factionAuthor, AUTHORS } from './authors.mjs';
import { noteUse } from './mastery.mjs';
import { fightNet, noteKill, nativeRoll, biasCode, richMult, networkRestore, networkCommand, lairUniques, lairFell, mine, netOf, isNative, named, nameOf, nameNative, openLair } from './network.mjs';

export const SAVE_VERSION = 53; // v53: the cryptogram's key, s.cipher (puzzles.mjs cipherOf: made on first use, keyed on the field); v52: rivals' memory, s.rivals (rivals.mjs rivalsRestore: made on first use, keyed on the field); v51: the scanner's log, s.scanner (scanner.mjs scannerOf: made on first use, keyed on the field); v50: site traits become server specials (specials.mjs specialsRestore); v49: crafting is gone: recipes, plans and their files become credits, Zero-day source the Zero-day (progression.mjs craftRestore); v48: Indemnity retires: an older save's unspent Indemnity becomes credits once, with a letter from Halcyon (store.mjs indemnityRestore); v47: one kind of component: an older save's pile of named pieces (s.salvage) becomes its count, s.components (salvage.mjs componentsRestore); v46: no default subclass: a class past level 10 that never picked plays its core until it does (subRestore); v45: sets, each loaded protocol stamped with when it went on and the storyline's LOWLIGHT Badge beat armed (sets.mjs setsRestore); v44: whole-number stats, Regen over 5 cycles and Payload flat (gear.mjs statsRestore); v43: threads, quests found in rooms (threads.mjs threadsRestore); v42: the long climb, XP into a level keeps its share (progression.mjs climbRestore); v41: layers become floors (floors.mjs floorsRestore); v40: outposts, buildings, plans, services, architecture and the dividend retire for sockets (sockets.mjs retireOutposts, netrooms.mjs socketRoomsRestore, GAME_RULES.md "Saves"); v39: every server is a room graph (netrooms.mjs roomsRestore, GAME_RULES.md "Runs: servers as rooms"); v38: two shipped presets renamed (presetRenameRestore); v37: 15-key pools, reordered lines and presets (kitRestore); v36: networks (network.mjs networkRestore: a network seed for every save); v31: subclasses (retireClassTrees); v32: Payload is a percentage; v33: invasion kinds, bounties, signatures, and the firewall follows the network (invasionRestore, firewallRestore); v34: one level, no server XP, specialty, ports, home-fight services or greys (progression.mjs progressionRestore); v35: the nine-key bar, run skills off it, one-clock tells (barRestore)

// run.mjs registers callbacks here (it imports this file, so we can't import it).
export const hooks = { flee: null, now: null };
// Class modules' hooks (see the header of dist/classes/breaker.mjs for each one).
const CLASS_HOOKS = [];
// Set bonuses (sets.mjs SET_HOOKS) run after them, on the same hooks: a class module's own effect is in place before them.
// The faction implicits' own kinds (faction-gear.mjs IMPLICIT_HOOKS) last.
const classHooks = () => (CLASS_HOOKS.length ? CLASS_HOOKS : CLASS_HOOKS.push(BREAKER_FX, BASTION_FX, INFILTRATOR_FX, OPERATOR_FX, SET_HOOKS, IMPLICIT_HOOKS) && CLASS_HOOKS);
const classUse = (id) => { for (const h of classHooks()) if (h.use?.[id]) return h.use[id]; return null; };
const classCheck = (id) => { for (const h of classHooks()) if (h.validate?.[id]) return h.validate[id]; return null; };
// Run a hook on every class module: 'each' calls them all; 'mult' multiplies their numbers; 'sum' adds them.
export const classEach = (name, ...args) => { for (const h of classHooks()) h[name]?.(...args); };
const classMult = (name, ...args) => classHooks().reduce((m, h) => m * (h[name] ? h[name](...args) ?? 1 : 1), 1);
// What the class modules make of an attack from part p on you (the taken hooks' product; the capstone tests read it).
export const takenMult = (s, p) => classMult('taken', s, p.attack, p);
const classSum = (name, ...args) => classHooks().reduce((n, h) => n + (h[name] ? h[name](...args) || 0 : 0), 0);
// The first module's answer that isn't null (a last blow held: Bedrock's).
const classFirst = (name, ...args) => { for (const h of classHooks()) { const v = h[name]?.(...args); if (v != null) return v; } return null; };
export const classPlan = (s, t) => { for (const h of classHooks()) { const c = h.plan?.(s, t); if (c) return c; } return null; };
// A subclass's cheap core keys (its fill hook): what the planner presses on the next threat when its own big keys
// are cooling, before key 1.
export const classFill = (s, t) => classHooks().flatMap((h) => (h.fill ? h.fill(s, t) || [] : [])); // now: the clock (tests set it). crew.mjs adds crewAct, crewActOne, crewActNamed, crewStanding, crewTurns, crewAll, crewHurt, crewEngage, crewEnd; run.mjs crewGuests, foldersOf; the browser sets stepped.

export function fresh() {
  const s = {
    version: SAVE_VERSION,
    server: { integrity: CONFIG.maxIntegrity, max: CONFIG.maxIntegrity, credits: CONFIG.startingCredits },
    encounter: null,
    leadProgress: { ransomware: 0, worm: 0, ghostroot: 0 },
    locations: [],
    run: null,
    daemons: [], // slotted daemon ids
    daemonLv: {}, // daemon id → its level (invasions drop them: daemons.mjs)
    // Protocols: one shared stash; each class loads its own (gear.rigs[class] = protocol ids).
    stash: [],
    gear: { rigs: {} },
    // The server runs services (id → version), one install at a time.
    services: {},
    install: null,
    materials: { cipher: 0, worm: 0, kernel: 0, exploit: 0 },
    // Invasions: the one invader on its way or at the wall; the network's logged-on clock;
    // Degraded mode after a crash; a gate intrusion parked while you fight an invader.
    invasion: null,
    net: { wall: null, next: null },
    degraded: null,
    gate: null,
    nextItem: 0,
    rng: 0x2545f491,
    loadout: { archetype: 'breaker', picks: {}, ranks: {}, equipped: {} },
    // Each class levels on its own and starts at 1. The server's level is your highest class's.
    hackers: {},
    components: 0, // salvage.mjs
    logs: [],
    reports: [],
    serial: 0,
    seed: 1,
    settings: { sound: true, motion: true, speed: 'relaxed', haptics: true, tips: true, seen: {} }, // seen: first-time tips already shown
    tutorialCompleted: false,
    harvesters: [], // packaged harvesters waiting to go on an outpost
    harvKinds: [], // harvester kinds you can compile
    configs: {}, // service → config running on it
    fleet: null, // a virus fleet on its way to one of your outposts
    architecture: null, // fortress | hub | lab, picked at server level 20
  };
  dexOf(s); // the Codex tab's record: kills, bosses fought, tells and sets met (genome.mjs)
  researchOf(s); // part research (research.mjs): empty
  initMail(s); // the first LOWLIGHT mail is waiting
  return bindRooms(s);
}
// s.rooms: the server's rooms you're on (floorplan.mjs). On the real save it's the run's server's (netrooms.mjs keeps
// each server's rooms on its location, loc.floorplan), so it's never saved twice: a getter, left out of the JSON. The
// rooms playtest sets its own server on it (kept as s.roomsPlay, never saved).
export function bindRooms(s) {
  if (!s || Object.getOwnPropertyDescriptor(s, 'rooms')?.get) return s;
  const own = s.rooms, at = { i: -1 };
  delete s.rooms;
  Object.defineProperty(s, 'rooms', {
    configurable: true, enumerable: false,
    get() {
      if (this.roomsPlay) return this.roomsPlay;
      const r = this.run;
      if (!r?.rooms || r.loc === 'rooms') return null;
      if (r.loc === CONFIG.zone.id) return this.zone?.floorplan || null;
      // The server you're on, by id: where it was last time if it's still there (the pacing bot asks thousands of times a visit).
      let loc = this.locations?.[at.i];
      if (loc?.id !== r.loc) { at.i = this.locations?.findIndex((l) => l.id === r.loc) ?? -1; loc = at.i >= 0 ? this.locations[at.i] : findLocation(this, r.loc); }
      return loc?.floorplan || null;
    },
    set(v) { this.roomsPlay = v; },
  });
  if (own) s.roomsPlay = own;
  return s;
}

// ---------- helpers ----------

export const active = (s) => s.encounter?.phase === 'active';
// A fight that holds a clock (a siege waits while you fight it): only while it's actually running.
// A paused fight (or one left open over a reload, which comes back paused) holds nothing.
export const holding = (s, key, id) => active(s) && !s.encounter.paused && s.encounter[key] === id;
export const alive = (p) => !!p && p.integrity > 0;
export const parts = (s) => s.encounter?.virus.parts || [];
export const part = (s, id) => parts(s).find((p) => p.id === id);
export const livingParts = (s) => parts(s).filter(alive);
export const attackers = (s) => livingParts(s).filter((p) => p.attack);

export function virusIntegrity(s) {
  const all = parts(s);
  return { current: all.reduce((n, p) => n + p.integrity, 0), max: all.reduce((n, p) => n + p.max, 0) };
}

// Seconds per cycle come from the player's speed setting. Rules count cycles, so balance is unchanged.
export function cycleLength(s) {
  return CONFIG.speeds[s.settings?.speed] || CONFIG.cycleMs;
}

// Cycles between a part losing its last armor chit and patching one back.
// A virus's mutation, in force: its own (createVirus), or a breach's rolled one (breach.mjs v.mutations), which lives
// on a part and ends when that part breaks.
export const mutated = (s, id) => { const v = s.encounter?.virus; return !!v && (v.mutation === id || !!v.mutations?.some((m) => m.id === id && alive(part(s, m.part)))); };
export const patchDelay = (s) => CONFIG.patchDelay - (mutated(s, 'regenerative') ? 1 : 0) + rank(s, 'armor-cracker') + fxFire(s, 'custom', { do: 'patch-slow' }, false).reduce((n, x) => n + x.value, 0);
// Total armor chits left on the virus (and how many it started with).
export function armorLeft(s) {
  const all = livingParts(s);
  return { current: all.reduce((n, p) => n + (p.armor || 0), 0), max: parts(s).reduce((n, p) => n + (p.maxArmor || 0), 0) };
}

// ---------- your class in a fight ----------
// Key 1 is Spike, everyone's free hit; 2–9 and 0 are your equipped skills, in order (seven slots, an eighth at 22 and
// a ninth at 30: LOADOUT.bar); - is SIGINT, everyone's interrupt (from level 10: it stops a cast, raid.mjs and
// tells.mjs). A key only appears once your class's level unlocks it.
export const CANTRIP_IDS = ['spike', 'sigint'];
// Key 1 under your class's own name (SPIKE in data.mjs): a command as you'd see it ("bash pulse" for "spike pulse").
export const spikeWord = (s) => spikeOf(classOf(s)).word;
export const spikeName = (s) => spikeOf(classOf(s)).name;
export const said = (s, text) => (text ? shownTargets(s, String(text).replace(/^spike(?= |$)/, spikeWord(s))) : text);
// A command as you see it: a packed part (packParts) by its shown name, never its id.
export const shownKey = (p) => (p.packedAs ? p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : p.id);
function shownTargets(s, text) {
  for (const p of s.encounter?.virus?.parts || []) if (p.packedAs) text = text.replace(new RegExp(`(^|[ ;])${p.id}(?=$|[ ;.,])`, 'g'), `$1${shownKey(p)}`);
  return text;
}
export const classOf = (s) => s.loadout?.archetype || 'breaker';
// Your subclass (SUBS in data.mjs; dist/classes/): from SUBCLASS.from, the one you picked. There is no default:
// until you pick, a class plays its core alone (no subclass skills, edge, presets or tree), and the Loadout's
// subclass breakout waits for you (skills-view.mjs). Before that level, none.
// A pick only counts if it names a subclass of that class (an unknown id is no pick).
const pickedSub = (s, arch) => { const x = s.loadout?.sub?.[arch]; return SUBS[x]?.cls === arch ? x : null; };
export const subOf = (s, arch = classOf(s)) => (hackerLevel(s, arch) >= SUBCLASS.from ? pickedSub(s, arch) : null);
export const subPicked = (s, arch = classOf(s)) => !!pickedSub(s, arch);
// A class at SUBCLASS.from or past it that hasn't picked: the breakout's moment (skills-view.mjs breakoutDue).
export const subWaiting = (s, arch = classOf(s)) => hackerLevel(s, arch) >= SUBCLASS.from && !pickedSub(s, arch);
// "Later" on the breakout: it stops opening by itself for that class (s.loadout.subLater); the page keeps its entry.
export function subLater(s, arch = classOf(s)) { (s.loadout.subLater ||= {})[arch] = true; }
// Is this subclass's edge on? Class modules check their own edges with it.
export const subEdge = (s, id) => CONFIG.edges !== false && subOf(s) === id;
// Your subclass's tree and skill line (null before SUBCLASS.from).
export const kitOf = (s, arch = classOf(s)) => SUBS[subOf(s, arch)] || null;
// Where a kit's choices are kept: the subclass's own key, so each subclass keeps its own tree and bar.
const kitKey = (s, arch) => (s.loadout?.devKit ? arch : subOf(s, arch) || arch);
// Is this talent picked for your current subclass?
// s.loadout.devKit (tests of single mechanics): every skill of the class by its level, and the talents it names.
export function hasTalent(s, id) {
  if (s.loadout?.devKit) return (s.loadout.devKit.talents || []).includes(id);
  const kit = kitOf(s);
  if (!kit) return false;
  const picks = picksOf(s, classOf(s));
  return kit.talents.some((pair, i) => (picks[i] === 0 || picks[i] === 1) && pair[picks[i]].id === id);
}
// Cooldowns after talents.
function talentCooldown(s, id) {
  if (id === 'overload' && hasTalent(s, 'hair-trigger')) return 2;
  if (id === 'suspend' && hasTalent(s, 'preemption')) return 2;
  let base = ABILITIES[id]?.cooldown || 0;
  for (const h of classHooks()) if (h.cooldown) base = h.cooldown(s, id, base);
  return base;
}
// The skill on your bar with the shortest cooldown over 1 cycle (the first of a tie), for Microcode (shortest-cd).
const shortestSkill = (s) => usable(s).map((id) => [id, talentCooldown(s, id)]).filter(([, c]) => c > 1).sort((a, b) => a[1] - b[1])[0]?.[0] || null;
export function cooldownOf(s, id) {
  const base = talentCooldown(s, id);
  if ((id === 'overload' && hasTalent(s, 'hair-trigger')) || (id === 'suspend' && hasTalent(s, 'preemption'))) return base;
  // A unique that shortens one skill's cooldown (effect skill-cd), never under 1; or the shortest on your bar (shortest-cd).
  let off = fxFire(s, 'always', { do: 'skill-cd' }, false).filter((x) => x.fx.skill === id).reduce((n, x) => n + x.value, 0);
  const short = fxHas(s, 'shortest-cd');
  if (short && base > 1 && shortestSkill(s) === id) off += Number(short.fx.value) || 0;
  return off && base ? Math.max(1, base - off) : base;
}
// The bar in key order: [[key, id], …] (keyMap is the same as an object; '0' would sort first in it).
export function barKeys(s) {
  const out = [];
  const lvl = hackerLevel(s);
  const arch = classOf(s);
  const key = (id) => CANTRIPS.find((c) => c.id === id)?.key;
  if (unlockLevel(arch, 'spike') <= lvl) out.push([key('spike'), 'spike']);
  equippedSkills(s, arch).forEach((id, i) => out.push([LOADOUT.keys[i], id]));
  for (const id of CANTRIP_IDS.slice(1)) if (unlockLevel(arch, id) <= lvl) out.push([key(id), id]);
  return out;
}
export const keyMap = (s) => Object.fromEntries(barKeys(s));
// Bar slots for a class at its level (LOADOUT.bar).
export const slotsOf = (s, arch = classOf(s)) => barSlots(hackerLevel(s, arch));
// The key a slot is on (0-based), for messages.
const slotKey = (i) => LOADOUT.keys[i] ?? String(i + 2);
export const keyOf = (s, id) => barKeys(s).find(([, v]) => v === id)?.[0] || '';
// Abilities you can use in a fight right now (run-only skills like Spoof are not fight abilities).
export const usable = (s) => barKeys(s).map(([, id]) => id).filter((id) => ABILITIES[id]);

// What the current fight damages: your server at home, your Signal on a run.
export function defender(s) {
  return s.encounter?.mode === 'run' ? s.run : s.server;
}
export const familyInfo = (id) => FAMILIES[id] || GUARDS[id] || ROOM_FAMILIES[id];
// The room bodies' rules (families.mjs) run in a room fight, and in any fight of a family whose rules travel with it
// (data.mjs FAMILIES rules: the Cryptominer, the Wiper).
const bodyRules = (e) => !!e.rooms || (!!FAMILIES[e.virus?.family]?.rules && !e.virus.strain); // (a strain of theirs, the Hashrat, has its own body)

// Veiled parts hide their attack timers while they still have armor; Blind hides every timer for a
// few cycles. A Tagged part's timer always shows.
export function timersHidden(s, p = null) {
  const c = s.encounter.cycle;
  // Actuarial Model (Halcyon): nothing hides its timers from you.
  const near = fxHas(s, 'unveil'), soon = (x) => !!near && !!x.attack && x.attack.due - c <= (Number(near.fx.value) || 0); // Sounding Line: its next attack shows once it is close
  const smoke = livingParts(s).some((x) => x.obfuscate); // an Obfuscator: every part stays veiled while it lives, bare or not
  const blind = livingParts(s).some((x) => x.obfuscate && x.exe); // an Obfuscator.exe: Tag reveals nothing
  const hides = (x) => alive(x) && !(!blind && x.taggedUntil >= c) && !(x.seenUntil >= c) && (smoke ? !!x.attack || x.veiled : x.veiled && x.armor > 0) && !zeroDay(s, 'actuarial') && !soon(x); // seenUntil: Side Channel, Unmask
  return p ? hides(p) : livingParts(s).some(hides);
}

// Statuses on a part (the debuffs every class can cash in).
export function statusesOn(s, p) {
  const c = s.encounter.cycle;
  return ['exposed', 'tagged', 'hooked', 'throttled', 'quarantined', 'jammed', 'poisoned', 'thrash', 'open'].filter((k) => p[k + 'Until'] >= c);
}
export const on = (s, p, k) => p[k + 'Until'] >= s.encounter.cycle;
// What a Hooked part takes on top of each hit (the planner counts it on helpers).
export const hookHit = (s, p) => (on(s, p, 'hooked') ? scaled(s, SKILLS.hooked + rank(s, 'kernel-hook')) : 0);
export const buffed = (e, k) => e.buffs?.[k] >= e.cycle;

// opts.mine: your own hit (your buffs apply). Armor isn't a multiplier: see hit().
// Breaker Momentum: stacks still running, and the damage they add (Chain Exploit +2% a stack per rank).
export const momentumStacks = (s) => { const m = s.encounter?.momentum; return m && m.until >= s.encounter.cycle ? m.stacks : 0; };
export const momentumBonus = (s) => (SKILLS.momentum + 0.02 * rank(s, 'chain-exploit')) * momentumStacks(s);

// Level gap (CONFIG.gap): what you deal to something above you, and what it deals you.
// One level up is still about even; it counts from the second.
const over = (g) => Math.max(0, g - 1);
export const gapDealt = (g) => (g > 0 ? Math.max(CONFIG.gap.floor, 1 - CONFIG.gap.dealt * over(g)) : 1 + Math.min(0.15, CONFIG.gap.below * -g));
export const gapTaken = (g) => (g > 0 ? 1 + CONFIG.gap.taken * over(g) : Math.max(0.7, 1 - CONFIG.gap.below * -g));
export function damageMultiplier(s, p, opts = {}) {
  const e = s.encounter;
  if (opts.flat) return 1; // damage already counted once (a Lockbox's held damage landing)
  let m = opts.server ? 1 : gapDealt(levelGap(s));
  if (opts.dot && on(s, p, 'tagged')) m *= SKILLS.tagged + (p.tagBoost || 0) + 0.1 * rank(s, 'persistent-tag');
  if (on(s, p, 'quarantined')) m *= SKILLS.quarantined;
  if (on(s, p, 'open')) m *= TELL.open.mult; // a tell read: the part is open (tells.mjs)
  m *= overclockMult(s); // an Overclock that landed: every part takes double (tells.mjs, breaches only)
  if (p.loud) m *= CONFIG.tripwire.taken; // a Tripwire tripped: the loud parts take more from everything (loud both ways)
  if (e.virus.weakKnown && e.virus.weakPoint === p.id) m *= CONFIG.weakMultiplier;
  m *= leanDealt(e, p); // the server's leaning: Venting, Wind-up (leanings.mjs)
  if (opts.mine) {
    m *= 1 + 0.03 * rank(s, 'overclocked');
    if (classOf(s) === 'breaker') m *= 1 + momentumBonus(s);
    if (hasTalent(s, 'unsafe-mode')) m *= 1.3;
    if (e.synced) m *= 1 + CONFIG.sync.bonus;
    for (const x of fxFire(s, 'hit', { target: p, do: 'damage%', cmd: !opts.dot && !opts.by ? e.commanding?.id : null })) m *= 1 + x.value / 100;
    m *= buffMult(s); // a timed buff from a break (Floodgate, Fuse Map)
    if (!opts.dot && e.throttledUntil >= e.cycle) m *= TELL.copy.throttled; // a debuff the Mimic copied onto you (tells.mjs): your hits deal half
  }
  if (opts.dot) for (const x of fxFire(s, 'custom', { do: 'dot%' })) m *= 1 + x.value / 100;
  // Burns or helpers alone, on a part that meets the condition (Brackish, Riptide). A helper's hit carries src 'helper'.
  if (opts.dot && !opts.server) for (const x of fxFire(s, 'hit', { target: p, do: opts.src === 'helper' ? 'helper%' : 'burn%' })) m *= 1 + x.value / 100;
  if (!opts.server) m *= classMult('dealt', s, p, opts) * (1 - rebootSick(s)); // reboot sickness: your server is rebooting
  m *= masteryDmg(s, e.virus, p); // a part you've mastered takes 3% more from all of yours (research.mjs; never a crewmate's)
  return m;
}

// Base damage of a skill against a part, before the part's multipliers.
export function skillBase(s, id, p) {
  const a = ABILITIES[id];
  let base = a?.damage || 0;
  if (id === 'overload') base = (hasTalent(s, 'hair-trigger') ? 35 : base) + 4 * rank(s, 'heat-sink');
  const e = s.encounter;
  if (id === 'rate-limit') base += 4 * rank(s, 'token-bucket') + (p?.attack && p.attack.due <= e?.cycle ? a.due : 0); // choke it as it sends: more if its attack is due now
  if (id === 'backdoor') base += 4 * rank(s, 'backchannel') + (burnsOn(s, p).length ? a.burning : 0); // a flat bonus on a burning part, however many burns
  if (id === 'opening') base += 5 * rank(s, 'recon');
  if (id === 'flood' && p && !(p.armor > 0)) base *= 2;
  if (id === 'exploit' && hasTalent(s, 'sharp-exploit')) base = 20;
  // Segfault: crash it mid-wind-up (a charge on it, tells.mjs); Core Dump: under 30% too.
  if (id === 'segfault' && p && (tellOn(s, p, 'charge') || (hasTalent(s, 'core-dump') && p.integrity < p.max * 0.3))) base *= a.execute;
  // Retaliate: twice the attack that reached you (it's already your size: no power scaling).
  if (id === 'retaliate') return Math.min(scaled(s, a.cap), 2 * (e?.procs?.struck?.amount || 0)) + (rank(s, 'reverse-shell') ? scaled(s, 5 * rank(s, 'reverse-shell')) : 0);
  return base * powerOf(s);
}
// Your burns on a part (Inject, Purge, Thermal Runaway…).
export const burnsOn = (s, p) => (p && s.encounter?.burns ? s.encounter.burns.filter((b) => b.target === p.id) : []);
// A refreshing burn (ABILITIES[id].refresh: Inject) is one a part: a second copy landing there (reapplied,
// copied or moved: Propagate, Bloom, Contagion, Outbreak, Wormable…) merges into the one already there, keeping
// the longer duration and the bigger tick. Merges every pair in your burns; returns the burn left for b.
export function mergeBurns(e, b = null) {
  const keep = new Map();
  for (let i = 0; i < e.burns.length; i++) {
    const x = e.burns[i];
    if (!ABILITIES[x.id]?.refresh) continue;
    const k = x.id + ' ' + x.target, y = keep.get(k);
    if (!y) { keep.set(k, x); continue; }
    y.left = Math.max(y.left, x.left); y.damage = Math.max(y.damage, x.damage); y.synced = !!(y.synced || x.synced);
    e.burns.splice(i--, 1);
  }
  return b && !e.burns.includes(b) ? keep.get(b.id + ' ' + b.target) || null : b;
}
// Start a burn (or refresh the one of its kind already there): the burn now running.
export function addBurn(e, b) { e.burns.push(b); return mergeBurns(e, b); }
// Inject's length: 4 cycles (Long Fuse 6).
export const injectTicks = (s) => (hasTalent(s, 'polymorphic') ? 6 : ABILITIES.inject.ticks);
// Inject's tick before scaling: Heap Spray +3 a rank.
export const injectTick = (s) => ABILITIES.inject.tick + 3 * rank(s, 'heap-spray');
export const helpersOn = (s, p) => (p && s.encounter?.helpers ? s.encounter.helpers.filter((h) => h.target === p.id) : []);
export const helperCap = (s) => (hasTalent(s, 'hive') ? 9 : SKILLS.helperCap);
// Procs and reactive windows: a key lights up after an event and stays lit through `until`.
//   stripped: you broke a part's last chit (Shatter) · struck: an attack reached you (Retaliate) ·
//   slipped: an attack missed you or was delayed (Opening).
export const procOpen = (s, kind) => { const e = s.encounter; const x = e?.procs?.[kind]; return !!x && (typeof x === 'number' ? x : x.until) >= e.cycle; };
export function openProc(s, kind, extra = {}) {
  const e = s.encounter;
  const ids = Object.keys(ABILITIES).filter((id) => ABILITIES[id].proc === kind && usable(s).includes(id));
  if (!ids.length) return;
  const a = ABILITIES[ids[0]];
  const longer = (kind === 'struck' && hasTalent(s, 'active-defense')) || (kind === 'slipped' && hasTalent(s, 'fast-hands'));
  (e.procs ||= {})[kind] = { until: e.cycle + a.window + (longer ? 1 : 0), ...extra };
  emit(s, 'proc', `${a.name} is usable now.`, { ability: ids[0] });
}
// One delay a wind-up: the first thing that pushes a part's attack later (a skill, a talent, a unique, a set bonus, a
// daemon, Stealth, a read, a script) holds its timer, and every other delay does nothing until it lands, so it always
// lands in the end. The hold is the timer it set (attack.late): landing, a cut or anything else that moves the timer
// lets it go. extend: a push that lengthens the delay this same command just set (Bus Fault, Choirbook, the stagger of
// a tell it answers) adds to it. Every player delay in a fight goes through here; the part's own timing (a Miner
// waiting, a Sleeper) and a breach's head start, set before the fight (breach.mjs), don't. The cycles it moved the
// attack: 0 if it was held.
export const delayHeld = (p) => p?.attack?.late != null && p.attack.late.due === p.attack.due;
export function delayAttack(s, p, n, { extend = false } = {}) {
  const e = s.encounter, atk = p?.attack;
  if (!atk || !(n > 0) || atk.due >= 900) return 0;
  const by = e?.commanding ? `${e.cycle}:${s.who || ''}` : null;
  if (delayHeld(p) && !(extend && by && atk.late.by === by)) return 0;
  atk.due += n;
  atk.late = { due: atk.due, by };
  return n;
}
// A skill whose delay found the attack held says so (the other sources just don't move it).
export const heldNote = (s, p) => emit(s, 'status', `The ${p.name}'s ${p.attack.name} is already delayed. It lands on cycle ${p.attack.due}.`, { target: p.id, held: true });
// Armor-piercing: goes straight through armor chits (Backdoor, Bypass; Overload with Piercing).
// Piercing (Breaker talent): only a fight's first Overload goes through armor.
export const ignoresArmor = (s, id) => !!ABILITIES[id]?.pierce || (id === 'overload' && hasTalent(s, 'piercing') && !s.encounter?.once?.pierced);

// What a skill would do to a part now: 0 if armor would absorb it (it breaks a chit instead).
export function previewDamage(s, abilityId, p) {
  if (!p || !skillBase(s, abilityId, p) || frozenNow(s, p)) return 0;
  if (p.armor > 0 && !ignoresArmor(s, abilityId) && !rootkitReady(s)) return 0;
  let n = Math.floor((skillBase(s, abilityId, p) + gearStat(s, 'damage')) * damageMultiplier(s, p, { mine: true }) + 1e-9);
  const root = s.encounter && buffed(s.encounter, 'sudo');
  const capN = !root ? capOf(s, p) : null;
  if (capN) n = Math.min(n, capN); // a Limiter's cap (a Limiter.exe's on every part)
  return Math.min(p.integrity, n);
}
// Armor takes this hit: the ◆ a damaging skill of yours would break on p instead of dealing its damage (hit below), or
// 0. 0 too for a hit that goes through (Backdoor and the other piercers, Piercing's first Overload, Rootkit, a
// Breaker's Sudo, Dead Reckoning's first hit on a part, Thermal Throttle hot enough) and for the skills built to break
// ◆ (Crack, Shaped Charge, Fork Bomb: strip; Rate Limit, Reclaim, Chain Reaction, Bit Rot: chits). A heavy hit breaks 2.
// The fight tray and the board mark a key it holds for (view.mjs armorBadge).
export function armorTakes(s, id, p) {
  const a = ABILITIES[id], e = s.encounter;
  if (!a || !alive(p) || !(p.armor > 0) || a.strip || a.chits > 1) return 0;
  const stacks = a.pierceAt ? momentumStacks(s) : 0; // Thermal Throttle: its base and Momentum, through ◆ from pierceAt
  const base = a.pierceAt ? (a.base + a.perStack * stacks) * powerOf(s) : skillBase(s, id, p);
  if (!(base > 0) || (a.pierceAt && stacks >= a.pierceAt)) return 0;
  if (ignoresArmor(s, id) || rootkitReady(s)) return 0;
  if (e && buffed(e, 'sudo') && classOf(s) === 'breaker') return 0;
  if (e && fxHas(s, 'first-pierce') && !e.fxs?.touched?.[p.id]) return 0;
  const heavy = !a.tick && (base >= CONFIG.heavyHit * powerOf(s) - 1e-9 || fxFire(s, 'hit', { target: p, do: 'shatter' }, false).length > 0);
  return heavy && p.armor > 1 ? 2 : 1;
}

export function readyIn(s, abilityId) {
  const e = s.encounter;
  if (!e) return 0;
  return Math.max(0, (e.readyAt[abilityId] || 0) - e.cycle);
}

// Seeded randomness (crits, drops, rolls). The state lives in the save, so a reload never rerolls.
export function rand(s) {
  let t = (s.rng = ((s.rng >>> 0) + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------- protocols (you) ----------
// Your class's protocols: generic slots, any protocol in any slot (4 to start, 6 by level 30).
export const stashItem = (s, id) => (s.stash || []).find((i) => i.id === id) || null;
const gearOf = (s) => (s.gear ||= { rigs: {} });
export const rigOf = (s, arch = classOf(s)) => { const g = gearOf(s); if (!Array.isArray(g.rigs[arch])) g.rigs[arch] = []; return g.rigs[arch]; };
export const slotCount = (s, arch = classOf(s)) => protocolSlots(hackerLevel(s, arch));
// The protocols your class is running, in slot order.
export const loaded = (s, arch = classOf(s)) => rigOf(s, arch).slice(0, slotCount(s, arch)).map((id) => id && stashItem(s, id)).filter(Boolean);
// Is a set piece loaded (sets.mjs)? Its bonuses, green lines and stats only count then.
export const piecesOn = (s) => loaded(s).some((it) => it.unique && UNIQUES[it.unique]?.set);
// Slots are typed: each takes one category of protocol (SLOT_KINDS). Index = slot.
export const freeSlot = (s, kind, arch = classOf(s)) => { const rig = rigOf(s, arch); for (let i = 0; i < slotCount(s, arch); i++) if (SLOT_KINDS[i] === kind && !(rig[i] && stashItem(s, rig[i]))) return i; return -1; };
const unslot = (s, id) => { for (const r of Object.values(gearOf(s).rigs)) if (Array.isArray(r)) for (let i = 0; i < r.length; i++) if (r[i] === id) r[i] = null; };
// Which class has a protocol loaded, or null.
export function loadedOn(s, id) {
  for (const [arch, rig] of Object.entries(gearOf(s).rigs)) if (Array.isArray(rig) && rig.includes(id)) return arch;
  return null;
}

// ---------- the server ----------
// (Services retired with outposts in save v40, GAME_RULES.md "Saves": a save that ran one got what it cost back, sockets.mjs
// retireOutposts. The server runs no rules of its own; the firewall, its filters and the daemons are its kit.)
const baseMax = (s) => Math.round(CONFIG.maxIntegrity * power(serverLevel(s)));

// A stat's total. side 'hacker': your protocols; 'server': the firewall's filters at home; none: both.
// (Survival stats exist on both sides and count where that side is defending.)
export function gearStat(s, stat, side = null) {
  let n = 0, pieces = false;
  let pct = 0;
  if (side !== 'server') for (const it of loaded(s)) {
    n += it.stats[stat] || 0;
    const u = it.unique && UNIQUES[it.unique];
    if (u?.set) pieces = true;
    if (!u?.effect) continue;
    fxList(u).forEach((fx, i) => {
      if (fx.stat !== stat || ['signal', 'integrity'].includes(stat)) return;
      // A unique whose stat counts double while its condition holds (Hotfix, Shade Filter…).
      if (fx.when === 'always' && fx.do === 'stat-x2' && fxCond(s, fx)) n += it.stats[stat] || 0;
      // One that adds to a stat, or raises it by a share, while its condition holds (Siltstone, Depth Gauge, Pressure Hull…).
      if (fx.when === 'always' && fx.do === 'stat+' && fxCond(s, fx)) n += fxScale(s, fx);
      if (fx.when === 'always' && fx.do === 'stat%' && fxCond(s, fx)) pct += Number(fx.value) || 0;
      n += fightStat(s, u.id, fx, i, stat); // its stacks and timed buffs in this fight (Seawall, Turbidity)
    });
  }
  if (pieces) n += setStat(s, stat); // a set piece's own stat, its green line, a set bonus (sets.mjs)
  if (pct) n = Math.round(n * (1 + pct / 100));
  if (side !== 'hacker') n += (FILTER_STATS[stat]?.home ? (FILTER_STATS[stat].pct ? Math.round((serverMax(s) * filterStat(s, stat)) / 100) : filterStat(s, stat)) : 0); // the firewall's filters for the fights at home: decoys, a sandbox, Block, a shield, Regen, barbs
  return STATS[stat]?.cap ? Math.min(STATS[stat].cap, n) : n;
}
// Who's being defended right now: your rig on a run, the server at home.
export const guarding = (s) => (s.encounter && (active(s) || s.encounter.phase === 'alert') ? (s.encounter.mode === 'run' ? 'hacker' : 'server') : s.run ? 'hacker' : 'server');
export const defense = (s, stat) => gearStat(s, stat, guarding(s));
export const critMultiplier = () => CRIT.multiplier;
// Your power: every level, your numbers grow 4% (damage, heals, shields, Signal).
export const powerOf = (s) => power(hackerLevel(s));
export const scaled = (s, n) => Math.max(1, Math.round(n * powerOf(s)));
// Heals you cast: CONFIG.healLevel of the level growth, times Restore. restoreMult alone for heals that
// give back damage (Reclaim's half, Rollback), which already grow with it.
export const restoreMult = (s) => 1 + gearStat(s, 'restore') / 100;
export const healScaled = (s, n) => Math.max(1, Math.round(n * (1 + (powerOf(s) - 1) * CONFIG.healLevel) * restoreMult(s) * setHealMult(s))); // setHealMult: Link, Mesh (sets.mjs)
// Damage over time (burn ticks, helper hits): built with scaled(), it keeps CONFIG.dotLevel of the level
// growth at the hit (dotMult), and Payload adds its flat number to each one (dotHit), as Damage does to a skill hit.
export const dotMult = (s) => (1 + (powerOf(s) - 1) * CONFIG.dotLevel) / powerOf(s);
export const dotHit = (s, base) => base * dotMult(s) + gearStat(s, 'payload');
// Regen a cycle (or a move, or a minute at home): Regen counts over STATS.regen.every of them.
export const regenRate = (n) => n / (STATS.regen.every || 1);
// The level gap to the enemy you're fighting (positive: it's above you).
export const levelGap = (s) => (s.encounter?.virus?.level || hackerLevel(s)) - hackerLevel(s);
// Classic-style misses: 5% against a same-level target, +1% per level it's above you, −1% per
// level below (never under 0). Your hits: less your Accuracy. Its hits: plus your Evasion.
const gapMiss = (gap) => Math.min(CONFIG.maxMiss, Math.max(0, CONFIG.baseMiss + gap));
export const missChance = (s) => (CONFIG.misses ? Math.max(0, gapMiss(levelGap(s)) - gearStat(s, 'accuracy')) : 0);
export const enemyMissChance = (s) => (CONFIG.misses ? Math.min(75, gapMiss(-levelGap(s)) + defense(s, 'evasion')) : defense(s, 'evasion'));
// Server Regen between fights: very slow (its number every 5 real minutes, as in a fight it is every 5 cycles).
// Between fights: resting (see CONFIG.restRegen) plus any Self-healing filter's Regen.
const maxSignalOf = (s) => maxSignal(s);
export function idleRegen(s, ms) {
  // Signal rests back up while you're not connected.
  let changed = false;
  if (!s.run && s.signal != null && !active(s)) {
    const max = maxSignalOf(s);
    if (s.signal < max) {
      s.signalAcc = (s.signalAcc || 0) + ((CONFIG.signalRest * max * ms) / 60000) * (piecesOn(s) ? restFast(s) : 1); // Night Shift (3): faster (sets.mjs)
      const n = Math.floor(s.signalAcc + 1e-9);
      if (n) { s.signalAcc -= n; s.signal = Math.min(max, s.signal + n); changed = true; }
    }
    if (s.signal >= max) s.signal = null; // full again: back to "whatever your max is"
  }
  if (active(s) || s.server.integrity <= 0 || s.server.integrity >= s.server.max) return changed;
  const besieged = s.invasion && ['siege', 'breach'].includes(s.invasion.state);
  const rate = regenRate(gearStat(s, 'regen', 'server')) + CONFIG.restRegen * s.server.max * (besieged ? 0.5 : 1); // half rate while an invasion is at the wall
  if (!rate) return changed;
  s.server.regenAcc = (s.server.regenAcc || 0) + (rate * ms) / 60000;
  if (s.server.regenAcc < 1 - 1e-9) return changed;
  const n = Math.floor(s.server.regenAcc + 1e-9);
  s.server.regenAcc -= n;
  s.server.integrity = Math.min(s.server.max, s.server.integrity + n);
  return true;
}
export const zeroDay = (s, id) => loaded(s).find((it) => it.zeroDay === id) || null;
export const critChance = (s) => CONFIG.baseCrit + gearStat(s, 'crit', 'hacker');
export const serverMax = (s) => baseMax(s) + Math.round(baseMax(s) * raidShare(s)); // firewall tiers +1, +3, +5: +5% each
// Rootkit: your first hit each fight goes through armor.
export const rootkitReady = (s) => !!zeroDay(s, 'rootkit') && active(s) && !s.encounter.once?.rootkit;
// Keep the server's max Integrity in step with its level (your highest class level) and its firewall tier.
export function syncServer(s) {
  const max = serverMax(s);
  const delta = max - s.server.max;
  s.server.max = max;
  if (delta > 0 && s.server.integrity > 0) s.server.integrity += delta;
  s.server.integrity = Math.min(s.server.integrity, max);
}
// A new protocol into the stash. A full stash breaks it down for components instead.
export function addItem(s, item, why = 'Loot: ') {
  s.stash ||= [];
  if (item.unique && !(s.collection ||= {})[item.unique]) { s.collection[item.unique] = hooks.now?.() ?? Date.now(); emit(s, 'collected', `Collection: ${item.name}.`, { unique: item.unique, go: logGo(homeOfUnique(item.unique)) }); }
  if (s.stash.length >= STASH_CAP) {
    const got = deconstruct(s, item);
    emit(s, 'info', `Your stash is full (${STASH_CAP}), so ${itemLabel(item)} was deconstructed for ${got}.`);
    return null;
  }
  const it = { ...item, id: 'g' + (s.nextItem = (s.nextItem || 0) + 1) };
  s.stash.push(it);
  emit(s, 'drop', `${why}${itemLabel(it)}${it.unique || it.zeroDay ? ' (Zero-day)' : ''}: ${statLine(it.stats)}.`, { item: it, rarity: it.rarity, ...(it.unique && setOf(it.unique) ? { set: setOf(it.unique).id } : {}) }); // set: a set piece (bot.mjs counts them)
  return it;
}
// Break an item down: components, code (the family it dropped from) and Exploits. Returns a summary.
// out (optional): rows for the gain card (app.js), { label, qty, kind, text }.
export function deconstruct(s, item, out = null) {
  const d = DECONSTRUCT[item.rarity] || DECONSTRUCT.stock;
  const n = d.salvage[0] + Math.floor(rand(s) * (d.salvage[1] - d.salvage[0] + 1)) + Math.floor((item.level || 1) / 10);
  gainComponents(s, n); // components (salvage.mjs)
  const code = item.from && codeOf(item.from) ? codeOf(item.from) : ['cipher', 'worm', 'kernel'][Math.floor(rand(s) * 3)];
  const mats = materialsOf(s);
  if (d.code) mats[code] = (mats[code] || 0) + d.code;
  const ex = item.compiled ? 0 : d.exploit; // what you compiled yourself gives no Exploits back
  if (ex) mats.exploit = (mats.exploit || 0) + ex;
  if (out) out.push({ label: 'Components', qty: `+${n}`, kind: 'loot', text: `${n} components` }, ...(d.code ? [{ label: MATERIALS[code].name, qty: `+${d.code}`, kind: 'code', text: `${d.code} ${MATERIALS[code].name}` }] : []), ...(ex ? [{ label: 'Exploit', qty: `+${ex}`, kind: 'exploit', text: `${ex} Exploit` }] : []));
  return [`${n} components`, d.code && `${d.code} ${MATERIALS[code].name}`, ex && `${ex} Exploit${ex > 1 ? 's' : ''}`].filter(Boolean).join(', ');
}
// ---------- drops ----------
// Uniques written in content/items.mjs (the editor's Uniques page).
export const UNIQUES = Object.fromEntries((ITEMS.uniques || []).map((u) => [u.id, u]));
const uniqueById = (id) => UNIQUES[id] || null;
// Does a unique drop from here? ctx: { kind: sprawl|home|guard|rogue|vault, id, layer, floor, rare, strain }.
// A source with a floor (floor: 7, The Sink) drops on that floor only. A ★ rare spawn's (kind rare) whatever room it is in.
const onFloor = (src, ctx) => !src.floor || src.floor === ctx.floor;
const dropsHere = (u, ctx) => (u.sources || []).some((src) => (src.kind === ctx.kind && (!src.id || src.id === ctx.id) && (!src.layer || (ctx.layer || 1) >= src.layer) && onFloor(src, ctx))
  || (src.kind === 'sprawl' && ctx.kind === 'sprawl') || (src.kind === 'guard' && ctx.kind === 'guard' && src.id === ctx.id) || (src.kind === 'rare' && !!ctx.rare && onFloor(src, ctx)));
// The uniques a source kind drops on a floor (a lair's, a thread's, a puzzle board's), open at a level: one you lack first.
export const floorUniques = (kind, floor, level) => Object.values(UNIQUES).filter((u) => u.level <= level + 2 && !isPiece(u.id) && (u.sources || []).some((src) => src.kind === kind && src.floor === floor));
export function floorUnique(s, kind, floor, level, pick = () => rand(s)) {
  const pool = floorUniques(kind, floor, level);
  if (!pool.length) return null;
  const fresh = pool.filter((u) => !s.collection?.[u.id]), heard = fresh.filter((u) => u.id === s.listen && postsOf(s));
  const from = heard.length ? heard : fresh.length ? fresh : pool;
  return from[Math.floor(pick() * from.length)];
}
// Sources that give a unique as a reward, never a drop (a feud: the faction pieces, faction-gear.mjs).
export const REWARD_SOURCES = ['story', 'contract', 'store', 'feud'];
export function uniqueFrom(s, ctx, level) {
  const pool = Object.values(UNIQUES).filter((u) => u.level <= level + 2 && !isPiece(u.id) && dropsHere(u, ctx) && !REWARD_SOURCES.includes(ctx.kind)); // a set piece drops off its own table (setDrop)
  return pickUnique(s, pool);
}
// A Guarded server's vault (specials.mjs): one of its floor's uniques (any source's there), else its layer's vault
// table's, open at its level.
export function guardedUnique(s, floor, level) {
  const open = Object.values(UNIQUES).filter((u) => u.level <= level + 2 && !isPiece(u.id)), on = (f) => f === floor || (Array.isArray(f) && f.includes(floor));
  const here = open.filter((u) => (u.sources || []).some((src) => on(src.floor)));
  return pickUnique(s, here.length ? here : open.filter((u) => dropsHere(u, { kind: 'vault', layer: layerOf(floor), floor })));
}
// One of a pool, a unique that leans toward your class (its lean) LEAN times as likely.
const LEAN = 3;
// A lean to your subclass counts in full; to your class (or the other subclass of it), two thirds.
const leanWeight = (s, u) => (!u.lean ? 1 : u.lean === subOf(s) ? LEAN : u.lean === classOf(s) || SUBS[u.lean]?.cls === classOf(s) ? LEAN * 2 / 3 : 1);
// A set piece's: a class set's (a tier set) comes up CLASS_SET times as often for its own class, any other by its lean.
const setWeight = (s, u) => { const cls = setOf(u.id)?.cls; return cls ? (cls === classOf(s) ? CLASS_SET : 1) : leanWeight(s, u); };
function pickUnique(s, pool, weight = leanWeight) {
  if (!pool.length) return null;
  const w = (u) => weight(s, u) * (u.id === s.listen ? listenBoost(s) : 1);
  let r = rand(s) * pool.reduce((n, u) => n + w(u), 0);
  for (const u of pool) { r -= w(u); if (r < 0) return u; }
  return pool.at(-1);
}
// A boss's own uniques (sources kind 'boss'): its odds a kill (BOSS_LOOT, a crew boss's BOSS_LOOT.raid), its pity more
// for every kill that gave none (s.pity[boss]), back to the base on a drop. One you haven't found comes first.
export const bossUniques = (boss) => Object.values(UNIQUES).filter((u) => !isPiece(u.id) && (u.sources || []).some((src) => src.kind === 'boss' && src.id === boss)); // a boss's set pieces roll on their own table (setDrop)
export const bossOdds = (boss) => (BOSSES[boss]?.raid ? BOSS_LOOT.raid : BOSS_LOOT);
// A boss that drops each of its own only once (BOSS_LOOT.once: the Resident, met on every takeover) is done once you
// hold them all: no more roll for them, and nothing in its place (it drops only as an elite).
export const bossDone = (s, boss) => BOSS_LOOT.once.includes(boss) && bossUniques(boss).every((u) => s.collection?.[u.id]);
export const bossChance = (s, boss) => Math.min(1, (bossOdds(boss).chance + bossOdds(boss).pity * (s.pity?.[boss] || 0)) * (bossUniques(boss).some((u) => u.id === s.listen) ? listenBoost(s) : 1) * (s.breach?.fx?.listen || 1) + (s.breach?.fx?.unique || 0)); // a breach's Listening Post (rewrites.mjs), and a dig in's +10% (world.mjs)
// Does this boss always drop an item (BOSS_LOOT.resident: the Resident's switch)?
export const sureDrop = (boss) => !!BOSSES[boss] && (boss !== 'resident' || BOSS_LOOT.resident === 'boss');
// What a boss kill drops (WoW's dungeon boss): one item at its level from its table (a blue, or a yellow BOSS_LOOT.yellow
// of the time; a crew boss a yellow, and BOSS_LOOT.raid.gold a world unique on top), then the roll for its uniques.
function bossLoot(s, boss, level) {
  const B = BOSSES[boss], name = B?.name || boss;
  if (sureDrop(boss)) {
    const rarity = B.raid || rand(s) < BOSS_LOOT.yellow ? 'custom' : 'tuned';
    const it = rollItem(() => rand(s), { level, rarity, cls: classOf(s) });
    if (B.family) it.from = B.family;
    addItem(s, it, `${name} drops: `);
    if (B.raid && rand(s) < BOSS_LOOT.raid.gold) { const u = eliteUnique(s, level, ['raid']); if (u) addItem(s, uniqueItem(u, level, () => rand(s)), `${name} drops: `); }
  }
  bossUnique(s, boss, level);
  // Its set pieces (sets.mjs): a crew boss's (Mesh, and the class sets: the level-50 tier sets), a lair boss's (by its
  // floor: the floor 3–8 bosses' pieces until they are built, and on Bedrock the tier sets too), or a named boss's own.
  const lair = B?.native && s.run && findLocation(s, s.run.loc);
  const why = `${name} drops: `;
  if (B?.raid) setDrop(s, { kind: 'crew', id: boss }, level, name, { why });
  else if (B?.native) setDrop(s, { kind: 'lair', floor: lair?.depth || SERVER.floorFor(level) }, level, name, { why });
  else if (B) setDrop(s, { kind: 'boss', id: boss }, level, name, { why });
}
// A boss's loot table, as its Codex page shows it (WoW's dungeon journal): its sure item, its uniques (??? until you
// find one; a native boss's once its first fall names them) and the chance the next kill drops one.
export function bossTable(s, boss) {
  const B = BOSSES[boss], native = !!B?.native, raid = !!B?.raid, odds = native ? BOSS_LOOT : bossOdds(boss);
  const ids = native ? (floorLairBosses(s).includes(boss) ? mine(s)?.uniques || [] : []) : bossUniques(boss).map((u) => u.id);
  return {
    sure: sureDrop(boss) ? (raid ? 'custom' : 'tuned') : null, yellow: BOSS_LOOT.yellow, raid, native, gold: raid ? BOSS_LOOT.raid.gold : 0,
    chance: native ? lairChance(s, 'you') : bossDone(s, boss) ? 0 : bossChance(s, boss), base: odds.chance, pity: odds.pity, done: !native && bossDone(s, boss),
    uniques: ids.map((id) => ({ id, name: named(s, id) ? UNIQUES[id].name : null, level: UNIQUES[id].level, got: !!s.collection?.[id] })).sort((a, b) => a.level - b.level),
  };
}
// The Listening Post (a program, sockets.mjs): kills on a server running one roll for the unique you name twice as often.
export const listenBoost = (s) => postBoost(s);
const listened = (s) => (s.listen && listenBoost(s) > 1 ? UNIQUES[s.listen] || null : null);
export function listenCommand(s, text) {
  const want = text.replace(/^listen\s*/, '').trim().toLowerCase();
  if (!postsOf(s)) return warn(s, 'Listening needs a Listening Post: a program you build in a server\'s socket.');
  if (!want) return emit(s, 'info', s.listen && UNIQUES[s.listen] ? `Listening for ${UNIQUES[s.listen].name}. Kills on a server running a Listening Post roll for it twice as often.` : 'Listening for nothing. Type listen <unique>, or pick one in the Collection.');
  const u = UNIQUES[want] || Object.values(UNIQUES).find((x) => x.name.toLowerCase() === want);
  if (!u || (isNative(u.id) && !named(s, u.id))) return warn(s, `No unique called ${want}.`); // a native you haven't heard named stays ???
  if ((u.sources || []).every((src) => REWARD_SOURCES.includes(src.kind))) return warn(s, `${u.name} is a reward, not a drop. Nothing to listen for.`);
  s.listen = u.id;
  // A native unique (network.mjs): on its own network the usual boost; anywhere else the post lifts it off its network too.
  if (isNative(u.id)) return emit(s, 'info', `Listening for ${u.name}. Kills on a server running a Listening Post roll for it twice as often, and it drops ${1 + postsOf(s)} times as often off its network.`);
  return emit(s, 'info', `Listening for ${u.name}. Kills on a server running a Listening Post roll for it twice as often.`);
}
function bossUnique(s, boss, level) {
  if (BOSSES[boss]?.native) return nativeBossUnique(s, boss, level);
  const pool = bossUniques(boss);
  if (!pool.length) return;
  const name = BOSSES[boss]?.name || boss;
  if (bossDone(s, boss)) return; // the Resident with both of its own found: no roll at all (it drops as an elite)
  if (rand(s) < bossChance(s, boss)) {
    (s.pity ||= {})[boss] = 0;
    const fresh = pool.filter((u) => !s.collection?.[u.id]), heard = fresh.filter((u) => u.id === s.listen && postsOf(s));
    const from = heard.length ? heard : fresh.length ? fresh : pool;
    const u = from[Math.floor(rand(s) * from.length)];
    addItem(s, uniqueItem(u, level, () => rand(s)), `${name} drops: `);
  } else {
    (s.pity ||= {})[boss] = (s.pity[boss] || 0) + 1;
    emit(s, 'info', `No unique from ${name} this time. The next kill has a ${Math.round(bossChance(s, boss) * 100)}% chance.`);
  }
}
// A native boss (network.mjs, its lair): its network's natives open at its level, at BOSS_LOOT's odds and pity
// (kept per network), one you haven't found first. The first time it falls it names them all.
export const lairKey = (s, who) => 'lair:' + (who || '');
export const lairChance = (s, who) => Math.min(1, BOSS_LOOT.chance + BOSS_LOOT.pity * (s.pity?.[lairKey(s, who)] || 0));
// On a floor whose lair has uniques of its own (source kind 'lair': The Sink's, Bedrock's), they join the natives in
// the same roll, at the same odds: a bigger table, not more drops. They carry no network.
const fightFloor = (s, e = s.encounter) => findLocation(s, e?.wild || e?.process || s.run?.loc)?.depth || null;
function nativeBossUnique(s, boss, level) {
  const who = fightNet(s), name = BOSSES[boss].name, key = lairKey(s, who), floor = fightFloor(s);
  const pool = [...lairUniques(s, who, level), ...(floor ? floorUniques('lair', floor, level).map((u) => u.id) : [])];
  lairFell(s, who, boss);
  if (!pool.length) return;
  const heard = pool.includes(s.listen) && postsOf(s) ? listenBoost(s) : 1;
  if (rand(s) < Math.min(1, lairChance(s, who) * heard + (s.breach?.fx?.unique || 0))) { // a dig in's +10% (world.mjs)
    (s.pity ||= {})[key] = 0;
    const fresh = pool.filter((id) => !s.collection?.[id]), from = fresh.includes(s.listen) ? [s.listen] : fresh.length ? fresh : pool;
    const it = uniqueItem(UNIQUES[from[Math.floor(rand(s) * from.length)]], level, () => rand(s));
    if (isNative(it.unique)) it.home = { name: nameOf(s, who), who };
    addItem(s, it, `${name} drops: `);
  } else {
    (s.pity ||= {})[key] = (s.pity[key] || 0) + 1;
    emit(s, 'info', `No ${pool.some((id) => !isNative(id)) ? '' : 'native '}unique from ${name} this time. The next kill has a ${Math.round(lairChance(s, who) * 100)}% chance.`);
  }
}
// Set pieces (sets.mjs SET_LOOT): each source rolls once an event for the pieces it drops, at its kind's odds. Its
// chance, plus its pity for every event of that source without one while you lack a piece it drops (s.pity, keyed by
// sets.mjs sourceKey, back to nothing on a drop); once you've found them all, a flat `found` and no pity. A piece you
// lack comes first, a class set's comes up CLASS_SET times as often for its class (setWeight), and a Listening Post
// listening for one lifts it like a boss's. ctx: { kind, id, floor, layer, lineage } (sets.mjs fromHere); level: the
// piece's item level.
export const setDropPool = (ctx, level = 99) => sourcePool(ctx).filter((u) => u.level <= level + 2);
export function setChance(s, ctx, level = 99) {
  const pool = setDropPool(ctx, level), odds = SET_LOOT[ctx.kind];
  if (!pool.length || !odds) return 0;
  const lacking = pool.some((u) => !s.collection?.[u.id]);
  const base = lacking ? odds.chance + odds.pity * (s.pity?.[sourceKey(ctx)] || 0) : odds.found;
  return Math.min(1, base * (pool.some((u) => u.id === s.listen) ? listenBoost(s) : 1));
}
// The roll: a piece or null. pack: on a traced server it goes in your run's pack (banked when you jack out), else
// straight into your stash. A miss while you lack one says the next chance.
export function setDrop(s, ctx, level, who, { pack = false, path = null, why = `${who}: ` } = {}) {
  const pool = setDropPool(ctx, level);
  if (!pool.length || !SET_LOOT[ctx.kind]) return null;
  const key = sourceKey(ctx), lacking = pool.some((u) => !s.collection?.[u.id]), sets = [...new Set(pool.map((u) => setOf(u.id)?.name))];
  if (rand(s) < setChance(s, ctx, level)) {
    (s.pity ||= {})[key] = 0;
    const fresh = pool.filter((u) => !s.collection?.[u.id]), heard = fresh.filter((u) => u.id === s.listen && postsOf(s));
    const it = uniqueItem(pickUnique(s, heard.length ? heard : fresh.length ? fresh : pool, setWeight), level, () => rand(s));
    const set = setOf(it.unique);
    if (pack && s.run) {
      s.run.pack.push({ path: path || `#set-${s.serial}`, name: 'protocol.bin', kind: 'gear', size: '32k', item: it });
      emit(s, 'drop', `${who} dropped ${itemLabel(it)}, a ${set?.name || 'set'} piece: ${statLine(it.stats)}. In your pack until you jack out.`, { item: it, pack: true, rarity: it.rarity, set: set?.id || null, setFrom: ctx.kind });
      return it;
    }
    return addItem(s, it, why);
  }
  if (!lacking) return null;
  (s.pity ||= {})[key] = (s.pity[key] || 0) + 1;
  emit(s, 'info', `No ${sets.length === 1 ? sets[0] : 'set'} piece from ${who} this time. The next ${SET_EVENT[ctx.kind] || 'kill'} has a ${Math.round(setChance(s, ctx, level) * 100)}% chance.`, { set: sets.length === 1 ? setOf(pool[0].id)?.id : null, setFrom: ctx.kind });
  return null;
}
// A guard's own set pieces (Kestrel Clearance), as save v45 kept them: its chance, and its table on its Codex page (the
// dungeon journal, like bossTable): its pieces (??? until found), the floor they start on, and the next kill's chance
// with its pity. null for a guard with no set piece.
export const guardSetChance = (s, guard) => setChance(s, { kind: 'guard', id: guard });
export function guardSetTable(s, guard) {
  const pool = sourcePool({ kind: 'guard', id: guard });
  if (!pool.length) return null;
  const set = setOf(pool[0].id), layer = Math.max(...pool.map((u) => u.sources.find((x) => x.kind === 'guard' && x.id === guard).layer || 1)), odds = SET_LOOT.guard;
  return {
    set: set.id, name: set.name, floor: floorOfLayer(layer), chance: guardSetChance(s, guard), base: odds.chance, pity: odds.pity, found: odds.found,
    lacking: pool.some((u) => !s.collection?.[u.id]), pieces: pool.map((u) => ({ id: u.id, name: s.collection?.[u.id] ? u.name : null, level: u.level, got: !!s.collection?.[u.id] })),
  };
}
// A kill's set rolls (roomKill, the old runs' guards): the guard's own, a ★ rare spawn's, a strain's, and a crew's
// bosses and elites (GLASSJAW's). floor: the server's.
function killSets(s, { v, key, guard, rare, floor, layer, pack, path }) {
  const lvl = v.level;
  if (guard) setDrop(s, { kind: 'guard', id: key, layer }, lvl, v.name, { pack, path: path + '/set' });
  if (rare) setDrop(s, { kind: 'rare', floor }, lvl, v.name, { pack, path: path + '/set-rare' });
  if (v.strain) setDrop(s, { kind: 'strain', lineage: STRAINS[v.strain]?.lineage }, lvl, v.name, { pack, path: path + '/set-strain' });
  if (v.author && (v.elite || v.boss)) setDrop(s, { kind: 'author', id: v.author }, lvl, v.name, { pack, path: path + '/set-author' });
}
// After a kill on a network: maybe one of its native uniques (network.mjs, on its own dice). A guard's goes in your pack.
function nativeDrop(s, e, pack = false) {
  noteKill(s, e); // what you learn about the network by fighting on it (network.mjs intelOf)
  const it = nativeRoll(s, fightNet(s, e), e.virus.level, e.virus.elite || e.virus.boss ? 3 : 1, e.virus.level);
  if (!it) return;
  if (pack && s.run) { s.run.pack.push({ path: `${e.room}/#native-${e.seed}-${s.serial}`, name: 'protocol.bin', kind: 'gear', size: '32k', item: it }); emit(s, 'drop', `${e.virus.name} dropped ${itemLabel(it)}, native to ${it.home?.name || 'another network'}. In your pack until you jack out.`, { item: it, pack: true, rarity: it.rarity }); }
  else addItem(s, it, `Native to ${it.home?.name || 'another network'}: `);
}
// A puzzle board won on a floor with uniques of its own (source kind 'puzzle', floorplan.mjs finishPuzzle): a board
// stands in for the fights around it, so it rolls an elite's odds of a gold (LOOT.odds.elite, Scavenge as magic find, a
// Listening Post on the one you want), for one of them, one you lack first. Returns the item, or null.
export function puzzleUnique(s, floor, level) {
  const pool = floorUniques('puzzle', floor, level);
  if (!pool.length) return null;
  const heard = pool.some((u) => u.id === s.listen) ? listenBoost(s) : 1;
  if (!(rand(s) < lootOdds('elite').zeroday * magicFind(gearStat(s, 'scavenge')) * heard)) return null;
  const u = floorUnique(s, 'puzzle', floor, level);
  return u ? uniqueItem(u, level, () => rand(s)) : null;
}
// An elite's unique: any world drop (SPRAWL, vaults, guards, rogue servers, rare spawns, threads, puzzle boards) up to its
// level, wherever it was written to drop. Story, contract, store, lair and strain uniques stay where they belong. A crew
// boss's (more: 'raid') adds its own.
export const WORLD_SOURCES = ['sprawl', 'vault', 'guard', 'rogue', 'rare', 'thread', 'puzzle'];
function eliteUnique(s, level, more = []) {
  const pool = Object.values(UNIQUES).filter((u) => u.level <= level + 2 && !isPiece(u.id) && (u.sources || []).some((src) => WORLD_SOURCES.includes(src.kind) || more.includes(src.kind)));
  return pickUnique(s, pool);
}
// One roll at a tier's odds (LOOT.odds: trash, elite, rare): mostly nothing, now and then a white, rarely better.
// Scavenge is magic find; depth helps a little. A gold is a unique that drops here (an elite's or a rare's: any world
// unique), else a yellow.
function rollOnce(s, ctx, level, tier) {
  const lu = listened(s), heard = lu && lu.level <= level + 2 && dropsHere(lu, ctx) ? listenBoost(s) : 1; // a Listening Post's unique drops here
  const odds = lootOdds(tier), mf = magicFind(gearStat(s, 'scavenge')), deep = 1 + LOOT.depthBonus * Math.max(0, (ctx.layer || 1) - 1);
  const gold = odds.zeroday * heard * mf, yellow = gold + odds.custom * deep * mf, blue = yellow + odds.tuned * deep * mf;
  const r = rand(s);
  let rarity = r < gold ? 'zeroday' : r < yellow ? 'custom' : r < blue ? 'tuned' : r < blue + odds.stock ? 'stock' : null;
  if (!rarity) return null;
  if (rarity === 'zeroday') {
    const u = uniqueFrom(s, ctx, level) || (tier !== 'trash' ? eliteUnique(s, level) : null);
    if (u) return uniqueItem(u, level, () => rand(s));
    rarity = 'custom';
  }
  return rollItem(() => rand(s), { level, rarity });
}
// A kill's tier: a ★ rare spawn, an elite (elite rooms, Pit elites, guards, mirrors, a boss without a sure drop), or trash.
export const tierOf = (ctx) => ctx.tier || (ctx.rare ? 'rare' : ctx.elite || ctx.boss || ctx.kind === 'guard' ? 'elite' : 'trash');
// What a fight drops, or null: the best of its rolls (Pits and bounties roll twice, LOOT.rolls). A boss with a sure
// drop rolls none here: bossLoot gives its item. A strain also has its own trophy: 1 in LOOT.trophy kills of that strain.
export function rollDrop(s, ctx, level) {
  if (typeof ctx === 'string') ctx = { kind: ctx === 'guard' ? 'guard' : 'home' };
  const rolls = ctx.boss && sureDrop(ctx.boss) ? 0 : (ctx.rolls || LOOT.rolls[ctx.kind] || 1) + (ctx.flat ? 0 : (s.encounter?.cleanRead && s.encounter.phase !== 'active' ? TELL.read.rolls : 0) + bonusRolls(s.encounter)); // every tell in the fight read: once more (tells.mjs), and a met objective (objectives.mjs). flat: its rolls and no more (the Exfil's)
  const tier = tierOf(ctx);
  let best = null;
  for (let i = 0; i < rolls; i++) {
    const it = rollOnce(s, ctx, level, tier);
    if (it && (!best || RARITY_ORDER.indexOf(it.rarity) > RARITY_ORDER.indexOf(best.rarity))) best = it;
  }
  // Its trophies: the strain's own, and any unique that drops from strain kills (no strain named) open at the level, in the
  // same roll (a bigger table, not more drops). One you lack first.
  const trophies = ctx.strain ? strainTrophies(ctx.strain, level) : [];
  if (ctx.strain && (ctx.trophy || rand(s) < (trophies.some((u) => u.id === s.listen) ? listenBoost(s) : 1) / LOOT.trophy)) { // a streak reward rolls for it outright
    const fresh = trophies.filter((u) => !s.collection?.[u.id]), from = fresh.length ? fresh : trophies;
    const t = from.length > 1 ? from[Math.floor(rand(s) * from.length)] : from[0];
    if (t) best = uniqueItem(t, level, () => rand(s));
  }
  if (best && ctx.family) best.from = ctx.family;
  return best;
}
export const strainTrophies = (strain, level) => Object.values(UNIQUES).filter((u) => !u.set && (u.sources || []).some((src) => src.kind === 'strain' && (src.id === strain || (!src.id && u.level <= level + 2))));
// Your pace: kills an hour of active play (the System page shows it; loot targets assume LOOT.killsPerHour; the odds are a kill at a time).
export const paceOf = (s) => { const p = s.pace || { kills: 0, ms: 0 }; return { kills: p.kills, minutes: p.ms / 60000, perHour: p.ms > 5 * 60000 ? Math.round(p.kills / (p.ms / 3600000)) : null }; };
// A unique by id, as a reward (story beats, contracts).
export function giveUnique(s, id, why = 'Reward: ') {
  const u = uniqueById(id);
  if (!u) return null;
  return addItem(s, uniqueItem(u, hackerLevel(s), () => rand(s)), why);
}
// A contract delivered (mail.mjs): what your set bonuses do then (LOWLIGHT Kit: your Signal full, and the next kill's
// XP up by its value, kept in s.killXp until a kill spends it).
export function setDeliver(s) {
  for (const x of fxFire(s, 'deliver')) {
    if (x.fx.do === 'fill-signal') {
      if (s.run) s.run.integrity = Math.max(s.run.integrity, s.run.max || maxSignal(s));
      else s.signal = null; // full: whatever your max is
      emit(s, 'net-good', `${x.name}: your Signal is full.`, firedOf([x]));
    }
    if (x.fx.do === 'kill-xp') { s.killXp = Math.max(s.killXp || 0, x.value); s.killXpFrom = x.name; emit(s, 'status', `${x.name}: your next kill pays ${x.value}% more XP.`, firedOf([x])); }
  }
}

// ---------- unique effects ----------
// Each loaded unique's effect (blocks from content/items.mjs). fxCond: does its condition hold now?
// A blue's or a yellow's rule (gear.mjs RULES) runs the same way, at its item's value; the same rule twice counts once, at its best.
// Policy Engine (a native unique, rule-amp): every rule's number counts that much more.
// A unique with several effects (effect: [...]) lists each; the second and later carry ids of their own (<id>:1…),
// so each keeps its own once-a-fight.
const fxIdOf = (uid, i) => (i ? `${uid}:${i}` : uid);
const uniqueFx = (s) => {
  const out = [], rules = {}, imps = {};
  for (const it of loaded(s)) {
    if (it.unique) fxList(UNIQUES[it.unique]).forEach((fx, i) => out.push({ it, fx, id: fxIdOf(it.unique, i) }));
    if (IMPLICITS[it.implicit] && !((imps[it.implicit]?.implicitValue || 0) >= (it.implicitValue || 0))) imps[it.implicit] = it; // a faction implicit: once, at its best
    const r = it.rule && RULES[it.rule];
    if (r && !((rules[it.rule]?.fx.value || 0) >= (it.ruleValue || 0) && rules[it.rule])) rules[it.rule] = { it, fx: { ...r.fx, value: it.ruleValue }, id: 'rule:' + it.rule, name: r.name };
  }
  out.push(...setFx(loaded(s))); // set bonuses (sets.mjs): the bonuses your worn pieces open, as effect blocks
  out.push(...(hooks.extraFx?.(s) || [])); // more effect blocks from outside the engine (none today)
  const amp = out.find((x) => x.fx.do === 'rule-amp');
  if (amp) for (const x of Object.values(rules)) if (Number.isFinite(x.fx.value)) x.fx.value = Math.round(x.fx.value * (1 + amp.fx.value / 100)); // a whole number, as every rule's is
  // The faction implicits (gear.mjs IMPLICITS; faction-gear.mjs IMPLICIT_HOOKS runs their own kinds), one a faction.
  const own = Object.entries(imps).flatMap(([f, it]) => implicitFx(it).map((fx, i) => ({ it, fx, id: `implicit:${f}${i ? ':' + i : ''}`, name: IMPLICITS[f].name, implicit: f })));
  return out.concat(Object.values(rules), own);
};
// The fight HUD's gear row reads the same list and conditions (fightread.mjs gearLive), so it lights exactly when they hold.
export const gearFx = (s) => uniqueFx(s);
export const telling = (s, p) => !!tellsOf(s)?.list.some((t) => t.told && (!p || t.part === p.id));
export const fxHolds = (s, fx, ctx = {}) => fxCond(s, fx, ctx);
// An effect that fired, on its event: the HUD's gear chip flashes and its name floats off the board (app.js).
const firedOf = (xs) => (xs.length ? { gear: xs.map((x) => ({ id: x.id, name: x.name || x.it.name })) } : {});
function fxCond(s, fx, ctx = {}) {
  const e = s.encounter, p = ctx.target;
  const d = () => (e?.mode === 'run' || s.run ? s.run || { integrity: 1, max: 1 } : s.server);
  if (fx.sub && subOf(s) !== fx.sub) return false; // a class set's subclass line (sets.mjs): that subclass only
  switch (fx.if || '') {
    case '': return true;
    case 'target-below-half': return !!p && p.integrity < p.max / 2;
    case 'target-bare': return !!p && !p.armor;
    case 'target-winding': return !!p?.attack && !!e && p.attack.due - e.cycle <= 1;
    case 'target-tagged': return !!p && !!e && p.taggedUntil >= e.cycle;
    case 'target-burning': return !!p && burnsOn(s, p).length > 0;
    case 'target-telling': return !!p && telling(s, p);
    case 'target-signature': return !!p?.special;
    case 'any-tell': return telling(s, null);
    case 'charged': return !!ctx.atk?.tell;
    case 'synced': return !!e?.synced || !!ctx.synced;
    case 'even-cycle': return !!e && e.cycle % 2 === 0;
    case 'odd-cycle': return !!e && e.cycle % 2 === 1;
    case 'below-half': return d().integrity < d().max / 2;
    case 'below-20': return d().integrity < d().max * 0.2;
    case 'crit': return !!ctx.crit;
    case 'target-open': return !!p && !!e && p.openUntil >= e.cycle;
    case 'target-locked': return !!p && (p.lockHp > 0 || livingParts(s).some((x) => wards(x, p)));
    case 'target-loud': return !!p && (!!p.loud || (!!p.enrage && p.integrity < p.max / 2) || (e?.virus.buffs?.loud ?? -1) >= (e?.cycle ?? 0));
    case 'target-fragment': return !!p && p.kind === 'fragment';
    case 'moment': return !!ctx.cmd && !!situationOf(s, ctx.cmd);
    case 'no-chit': return !!e && !(e.chits > 0);
    // The deep uniques' (levels 39-50).
    case 'target-attacked': return !!p && !!e && p.lastLanded === e.cycle - 1; // the players act first: its attack last cycle came after your command
    case 'target-healthiest': return !!p && alive(p) && livingParts(s).every((x) => x.integrity <= p.integrity);
    case 'target-jammed': return !!p && !!e && p.jammedUntil >= e.cycle;
    case 'target-armored': return !!p && p.maxArmor > 0;
    case 'target-last': return alive(p) && livingParts(s).length === 1;
    case 'one-left': return !!e && livingParts(s).length === 1; // after a break: one part still standing
    case 'below-25': return d().integrity < d().max * 0.25;
    case 'shielded': return (e?.shield || 0) > 0;
    case 'momentum-full': return !!e && classOf(s) === 'breaker' && momentumStacks(s) >= momentumCap(s);
    case 'helper-out': return (e?.helpers?.length || 0) > 0;
    case 'no-helper': return !!e && !e.helpers?.length;
    case 'blocked': return blockOf(s) > 0;
    case 'big-hit': return ctx.amount > (d().max * (fx.over || 0)) / 100; // the attack's size as it reaches you, before Block
    case 'to-below-half': return ctx.lands != null && d().integrity >= d().max / 2 && d().integrity - ctx.lands < d().max / 2; // what would get through to your Signal
    case 'first-use': return !!ctx.cmd && !!e && (e.metrics?.actions?.[ctx.cmd] || 0) <= 1;
    case 'above-75': return d().integrity > d().max * 0.75;
    case 'late': return !!e && e.cycle >= 6;
    default: return false;
  }
}
// The set bonuses open on what you wear (sets.mjs activeSets: each piece count's bonus counts once).
export const setBonusCount = (s) => activeSets(loaded(s)).reduce((n, r) => n + r.open.length, 0);
const fxScale = (s, fx) => {
  const e = s.encounter;
  const d = () => defender(s) || { integrity: 1, max: 1 };
  const k = fx.scale === 'cycles' ? Math.max(0, (e?.cycle || 1) - 1) : fx.scale === 'contracts' ? (s.mail?.jobs || []).filter((j) => !j.done).length : fx.scale === 'broken' ? e?.breaks || 0 : fx.scale === 'reads' ? e?.metrics?.reads || 0
    : fx.scale === 'chits' ? e?.chits || 0 : fx.scale === 'crew' ? (e ? alliesOf(s).length : 0) : fx.scale === 'missing' ? Math.max(0, Math.floor((1 - d().integrity / Math.max(1, d().max)) * 10 + 1e-9)) : fx.scale === 'sets' ? setBonusCount(s) : 1;
  const v = (Number(fx.value) || 0) * k;
  return fx.cap ? Math.min(fx.cap, v) : v;
};
// The fight state your gear's effects keep (e.fxs): stacks for the fight, timed buffs, boosts banked for later, counts.
// Each player keeps their own (crew.mjs gives each crewmate a fresh one).
const fxState = (e) => (e.fxs ||= {});
// A stat your effects add to for a while in a fight: the stacks (stack, Seawall) and the timed buffs (buff with a stat, Turbidity).
function fightStat(s, uid, fx, i, stat) {
  const e = s.encounter;
  if (!e || !active(s) || fx.stat !== stat) return 0;
  const st = fxState(e), id = fxIdOf(uid, i);
  if (fx.do === 'stack') return st.stack?.[id] || 0;
  if (fx.do === 'buff') { const b = st.buff?.[id]; return b && b.until >= e.cycle ? b.stacks * (Number(fx.value) || 0) : 0; }
  return 0;
}
// The damage your timed buffs add now (buff without a stat: Floodgate, Fuse Map), as a multiplier.
function buffMult(s) {
  const e = s.encounter, b = e?.fxs?.buff;
  if (!b || !wears(s, 'buff')) return 1;
  let m = 1;
  for (const x of uniqueFx(s)) if (x.fx.do === 'buff' && !x.fx.stat && b[x.id]?.until >= e.cycle) m *= 1 + (b[x.id].stacks * (Number(x.fx.value) || 0)) / 100;
  return m;
}
// A timed buff's stack: one more (up to its stacks) and its timer refreshed.
function addBuff(s, x) {
  const e = s.encounter, b = (fxState(e).buff ||= {}), was = b[x.id]?.until >= e.cycle ? b[x.id].stacks : 0;
  b[x.id] = { stacks: Math.min(x.fx.stacks || 1, was + 1), until: e.cycle + (x.fx.cycles || 1) };
  emit(s, 'status', `${x.name || x.it.name}: ${x.fx.stat ? `+${b[x.id].stacks * x.value}${STATS[x.fx.stat]?.unit || ''} ${STATS[x.fx.stat]?.name || x.fx.stat}` : `+${b[x.id].stacks * x.value}% damage`} for ${x.fx.cycles || 1} ${(x.fx.cycles || 1) === 1 ? 'cycle' : 'cycles'}.`, { mark: 'buff', ...firedOf([x]) });
}
// The sum of the values of your effects of one kind that hold now (heal%, taken%, cache%…).
const fxSum = (s, when, what, ctx = {}, spend = false) => fxFire(s, when, { ...ctx, do: what }, spend).reduce((n, x) => n + x.value, 0);
export const fxPct = (s, what) => fxSum(s, 'custom', what); // cache% (netrooms.mjs), explore-xp% (floorplan.mjs)
function fxReady(s, fx, id) {
  const e = s.encounter;
  if (fx.limit === 'fight') return !e?.once?.['fx:' + id];
  if (fx.limit === 'run') return !s.run?.fx?.[id];
  if (fx.limit === 'cooldown') return !((s.fxCooldown || {})[id] > (hooks.now?.() ?? Date.now()));
  return true;
}
function fxSpend(s, fx, id) {
  if (fx.limit === 'fight' && s.encounter) s.encounter.once['fx:' + id] = true;
  if (fx.limit === 'run' && s.run) (s.run.fx ||= {})[id] = true;
  if (fx.limit === 'cooldown') (s.fxCooldown ||= {})[id] = (hooks.now?.() ?? Date.now()) + (fx.cooldown || 60) * 60000;
}
// The deep uniques' effect kinds (content.mjs FX_DO, levels 39-50): their hooks run on every hit, heal and cycle, and
// nearly every fight carries none of them, so a kind you don't wear answers at once (fxKinds: the kinds on your rig,
// kept while the rig is the same).
const DEEP = new Set(['stat+', 'stat%', 'max-signal%', 'heal%', 'stack', 'buff', 'taken%', 'hit-cap', 'helper-soak', 'next-boost', 'shield%', 'shield-absorb', 'block-dot', 'burn%', 'helper%', 'crit-damage%', 'crit-double', 'first-skill-crit', 'first-pierce', 'spill', 'repeat', 'burn-now', 'burn-sap', 'helper-long', 'helper-now', 'helper-cd', 'free-helper', 'jam-delay', 'first-cd', 'shortest-cd', 'chit-fade', 'clock-start', 'momentum', 'spend%', 'momentum-cleave', 'momentum-safe', 'unveil', 'explore-xp%', 'cache%', 'rewind']);
const KINDS = new WeakMap();
function fxKinds(s) {
  const key = hooks.extraFx ? null : `${classOf(s)}|${hackerLevel(s)}|${rigOf(s).join(',')}|${(s.stash || []).length}|${s.equipN || 0}|${Object.keys(SETS).length}`; // what is loaded, and the sets
  const was = key !== null && KINDS.get(s);
  if (was && was.key === key) return was.kinds;
  const kinds = new Set(uniqueFx(s).map((x) => x.fx.do));
  if (key !== null) KINDS.set(s, { key, kinds });
  return kinds;
}
const wears = (s, what) => !DEEP.has(what) || fxKinds(s).has(what);
// Effects firing now: [{ fx, it, id, value }]. spend: use up their limits.
export function fxFire(s, when, ctx = {}, spend = true) {
  const out = [];
  if (ctx.do && !wears(s, ctx.do)) return out;
  for (const x of uniqueFx(s)) {
    if (x.fx.when !== when || (ctx.do && x.fx.do !== ctx.do) || !fxCond(s, x.fx, ctx) || !fxReady(s, x.fx, x.id)) continue;
    if (spend) fxSpend(s, x.fx, x.id);
    out.push({ ...x, value: fxScale(s, x.fx) });
  }
  return out;
}
const fxHas = (s, what) => (wears(s, what) && uniqueFx(s).find((x) => x.fx.do === what)) || null;
export const fxOn = fxHas; // tells.mjs: Canary Token, Read Receipt, Reflector, Write Blocker, Hush Money, Sandman
export const effectLine = (it) => (it?.unique && UNIQUES[it.unique]?.effect ? fxText(fxList(UNIQUES[it.unique]), (k) => STATS[k]?.name || ABILITIES[k]?.name || k) : it?.rule && RULES[it.rule] ? `${RULES[it.rule].name} — ${RULES[it.rule].text ? RULES[it.rule].text(it.ruleValue) : fxText({ ...RULES[it.rule].fx, value: it.ruleValue }, (k) => STATS[k]?.name || ABILITIES[k]?.name || k)}` : '');
// An item's faction implicit as its tooltip line (gear.mjs IMPLICITS text), '' for none.
export const implicitText = (it) => IMPLICITS[it?.implicit]?.text(it.implicitValue) || '';
// What fires when you call off a tell (tells.mjs: a charge or cast hit off in time, a cast stopped by SIGINT).
export function fxAnswer(s, p = null) {
  const e = s.encounter;
  if (!e) return;
  for (const x of fxFire(s, 'answer')) {
    const who = x.name || x.it.name;
    if (x.fx.do === 'read-hit' && alive(p) && !e.reading) { e.reading = true; hit(s, p, x.value, { by: who }); e.reading = false; } // Ping of Death: the part you read takes it
    if (x.fx.do === 'refund') { for (const k of Object.keys(e.readyAt)) e.readyAt[k] = Math.max(e.cycle, e.readyAt[k] - x.value); emit(s, 'status', `${who} reduces your cooldowns by ${x.value}.`, firedOf([x])); }
    if (x.fx.do === 'heal') heal(s, x.value, who, firedOf([x]));
    if (x.fx.do === 'shield') { e.shield = (e.shield || 0) + x.value; emit(s, 'status', `${who} raises your shield to ${e.shield}.`, { mark: 'shield', ...firedOf([x]) }); }
    if (x.fx.do === 'shield%') { e.shield = (e.shield || 0) + Math.max(1, Math.round((defender(s).max * x.value) / 100)); emit(s, 'status', `${who} raises your shield to ${e.shield}.`, { mark: 'shield', ...firedOf([x]) }); } // Choirbook (2): a share of your max
  }
}
// How much one command counts toward calling off a tell (Double Tap, Spectre: twice).


// Code materials: kills, guards and vault caches give the family's code; Exploits are rare.
export const materialsOf = (s) => (s.materials ||= { cipher: 0, worm: 0, kernel: 0, exploit: 0 });
export function gainCode(s, gains, why = '') {
  const m = materialsOf(s);
  const parts = Object.entries(gains).filter(([, n]) => n > 0);
  if (!parts.length) return;
  for (const [k, n] of parts) m[k] = (m[k] || 0) + n;
  emit(s, 'code', `${why}${parts.map(([k, n]) => `+${n} ${MATERIALS[k].name}`).join(', ')}.`, { gains: Object.fromEntries(parts) });
}
// What a kill of a family at a level drops (Scavenge adds to it).
// On a network rich in a code, part of it comes as that code (network.mjs biasCode); a guard's goes in your pack and
// leans when you bank it. A network rich in Exploits drops them more often.
export function codeFrom(s, family, level, source) {
  const k = codeOf(family), who = fightNet(s);
  const out = {};
  if (k) out[k] = Math.round(codeDrop(level) * (source === 'guard' ? 1.5 : 1) * (1 + gearStat(s, 'scavenge', 'hacker') / 100) * outbreakMult(s, family));
  if (rand(s) < EXPLOIT_CHANCE[source] * richMult(s, who, 'exploit')) out.exploit = 1;
  return source === 'guard' ? out : biasCode(s, who, out);
}

// (Buyout, finishing a timed build for credits, went with installs and outposts in R2: programs are instant.)

// ---------- the world's clock ----------
// Mail, the store, markets, payloads, hubs, Root and the hot strain, in real time. `now` comes from the caller (the
// engine keeps no clock). (The install queue it once ran went with services in R2.)
export function tickServices(s, now = Date.now()) {
  const first = s.serial;
  tickMail(s, now);
  tickStore(s, now);
  tickMarket(s, now);
  tickPayloads(s, now);
  tickHubs(s, now);
  tickRoot(s, now, (loc) => hooks.procRooms?.(loc) || []);
  tickHot(s, now);
  return since(s, first);
}

// A packed part in a log line (packParts): "the packed part", whatever the line called it.
const packedVoice = (m) => m.replace(/(^|[.!?]\s+|\n)(?:[Tt]he )?Packed part/g, '$1The packed part').replace(/\b(?:[Tt]he )?Packed part/g, 'the packed part');
export function emit(s, type, message, detail = {}) {
  if (typeof message === 'string' && message.includes('Packed part')) message = packedVoice(message);
  const event = { id: ++s.serial, cycle: s.encounter?.cycle || 0, type, message, ...(s.who ? { who: s.who } : {}), ...detail }; // who: a crewmate's name (crew.mjs)
  s.logs.push(event);
  if (s.logs.length > 600) s.logs.shift();
  hooks.emitted?.(s, event); // your gear's skill rules react to what happens (skillrules.mjs, through breach.mjs)
  return event;
}

export function warn(s, text, detail = {}) {
  if (active(s)) s.encounter.metrics.invalid++;
  emit(s, 'warning', text, { ...detail, ...(active(s) ? { fight: true } : {}) }); // fight typos stay on the fight screen, out of the run terminal
}

const since = (s, first) => s.logs.filter((e) => e.id > first);
const normalize = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ');
const squash = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
// What you type to aim at a part: its name ("grinder", "lock-core"), or its id when two living parts share a name.
export const partKey = (s, p) => {
  if (!p) return '';
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // The shortest that still finds this part: its first word, then its whole name, then its id.
  return [slug.split('-')[0], slug].find((k) => k && findPart(s, k) === p) || p.id;
};

// ---------- encounter lifecycle ----------

export function selectEncounter(s, key = 'cryptjack', seed = s.seed, opts = {}) {
  const mode = opts.mode || 'home';
  if (active(s)) return warn(s, 'Finish the current fight first.');
  if (mode === 'home' && s.run) return warn(s, 'You are out on a run. Type jack out first.');
  if (mode === 'home' && s.server.integrity <= 0) return warn(s, 'Server crashed. Type developer reboot to restore the test server.');
  const virus = encounterVirus(s, key, seed, opts);
  if (mode === 'home') { s.seed = seed; s.gate = null; }
  (s.met ||= {})[virus.strain || virus.family] = true; // the Codex names what you've met
  s.encounter = { phase: 'alert', mode, zone: !!opts.zone, wild: opts.wild || null, process: opts.process || null, room: opts.room || null, key, virus, seed, cycle: 1, elapsedMs: 0, paused: false, queue: null, plan: [], lastAttack: null, readyAt: {}, nextFragment: 1, metrics: null, breaks: 0, helpers: [], burns: [], buffs: {}, shield: 0, chits: 0, undo: null, encrypt: 0, scrambleUntil: 0, clock: 0, regenAcc: 0, leechAcc: 0, once: {}, soft: opts.zone && !opts.wild && !opts.process && (s.pace?.kills || 0) < CONFIG.zone.starterKills ? CONFIG.zone.starterHit : 1 }; // soft: your first kills in SPRAWL-00 hit softer, so you can learn the board
  const lean = mode === 'run' && s.run ? leaningOf(findLocation(s, s.run.loc)) : null;
  if (lean) s.encounter.leaning = { id: lean, paid: 0 }; // the server's leaning (leanings.mjs)
  if (s.run?.unpack?.includes(virus.id)) { // scanned before the fight: a Packer hides nothing (genes.mjs packer); a Packer.exe all but one
    const pk = virus.parts.find((x) => x.packer);
    if (pk?.exe) s.encounter.unpackedOne = virus.parts.find((x) => x.kind === 'system' && !x.packer && !x.special && !x.basic)?.id || null; else s.encounter.unpacked = true;
  }
  packParts(s);
  const signed = virus.author && AUTHORS[virus.author] ? ` ${AUTHORS[virus.author].name} wrote it.` : '';
  if (!opts.quiet) emit(s, 'intrusion', opts.zone
    ? `${virus.name} in ${opts.room}. Level ${virus.level} ${familyInfo(virus.family).name}.${signed}`
    : mode === 'run'
    ? `${virus.name} guards ${opts.room}.${signed}`
    : `${virus.name} detected. Level ${virus.level} ${familyInfo(virus.family).name}.${signed}`);
}
// The parts plan's mix at a level (developer parts, parts.test.mjs): n wild viruses as a veteran meets them, the kinds
// among them, the share that bring the signature, the part counts and the doubled basics, and the most common parts.
export function partsMix(level, n = 300) {
  const kinds = new Map(), counts = [0, 0, 0];
  let sig = 0, dup = 0;
  for (let seed = 1; seed <= n; seed++) {
    const v = createVirus('random', seed, { threat: SERVER.threat(level) });
    for (const p of v.parts) { const id = p.copy ? p.id.slice(0, -1) : p.id; kinds.set(id, (kinds.get(id) || 0) + 1); }
    if (!v.noSignature) sig++;
    if (v.parts.some((p) => p.copy)) dup++;
    counts[Math.min(4, v.parts.length) - 2]++;
  }
  const top = [...kinds.entries()].sort((a, b) => b[1] - a[1]).map(([id, k]) => `${id} ${Math.round((k / n) * 100)}%`).join(', ');
  return { n, kinds: kinds.size, sig: sig / n, dup: dup / n, counts, top, list: [...kinds.keys()] };
}
// The virus a fight brings (selectEncounter), and what `scan` shows before you start one (run.mjs): the same
// seed and place always build the same virus, and building it changes nothing.
export function encounterVirus(s, key, seed, opts = {}) {
  const mode = opts.mode || 'home';
  const over = {};
  // Every enemy has a level. Home intrusions match the server level (random ones may be
  // one higher); guards pass theirs in. A new server meets level-1 viruses.
  let lvl = opts.level;
  if (lvl === undefined && !opts.threat && mode === 'home') lvl = hackerLevel(s) + (key === 'random' ? (seed >>> 0) % 2 : 0);
  if (lvl !== undefined) lvl = Math.min(CONFIG.maxMobLevel, lvl);
  if (lvl !== undefined) {
    over.threat = SERVER.threat(Math.max(1, lvl));
    // A wild virus is mutated only as often as SERVER.mutationChance says (fixed by its seed).
    if (key === 'random' && opts.mutation === undefined && ((Math.imul(seed >>> 0, 2654435761) >>> 0) / 2 ** 32) >= SERVER.mutationChance(lvl)) over.mutation = null;
    else if (lvl < 4) over.mutation = null;
  }
  if (opts.threat) over.threat = opts.threat;
  if (opts.mutation !== undefined) over.mutation = opts.mutation;
  if (opts.family) over.family = opts.family;
  if (opts.strain) over.strain = opts.strain;
  if (opts.grade) over.grade = opts.grade;
  if (opts.elite) { over.elite = true; if (opts.eliteHp) over.eliteHp = opts.eliteHp; }
  if (opts.boss) { over.boss = opts.boss; if (opts.bossHp) over.bossHp = opts.bossHp; }
  if (opts.genes) over.genes = opts.genes; // forced rolled genes (genesim.mjs probes)
  if (opts.basic) over.basic = opts.basic; // a forced basic (parts.mjs: genesim.mjs probes, the playtest page)
  if (Array.isArray(opts.exe)) over.exe = opts.exe; // forced .exe builds (exe.mjs: the playtest page, the tests)
  if (opts.classic) over.classic = true; // the shape from before the parts roll (a Pulse Node, the signature, one third): balance.mjs's designed fight sets
  if (mode === 'run') over.run = true; // tuned for Signal fights (CONFIG.runHp, runDamage)
  if (opts.tag) over.tag = opts.tag; // a file's four digits: the fight carries its file's tag (WARDED CRYPTJACK-4821)
  // Its floor (parts.mjs PARTS.floor, natives): the server's, or with no server (home, SPRAWL-00, a sim) your floor at
  // the fight's level. A ★ rare spawn (floorplan.mjs) brings a native like an elite.
  over.floor = floorOfFight(s, mode, opts, lvl ?? Math.max(1, (over.threat ?? SERVER.threat(1)) - 9));
  if (opts.rare) over.rare = true;
  // Kestrel's Idle Timer (PARTS.kestrel): from floor 3, half the guard posts and ICE bring one, by their seed.
  if (PARTS.on && GUARDS[key] && mode === 'run' && !opts.nest && !opts.genes && over.floor >= PARTS.kestrel.floor && ((Math.imul((seed >>> 0) ^ 0x6a09e667, 2246822519) >>> 0) / 2 ** 32) < PARTS.kestrel.share) over.genes = ['idletimer'];
  // A guard's lever (docs/puzzle-levers.md 5): from PARTS.lever, a Zip Bomb on every guard but the Sentinel (data.mjs GUARDS).
  if (PARTS.on && GUARDS[key] && key !== 'sentinel' && mode === 'run' && !opts.nest && !opts.genes && (lvl ?? 1) >= PARTS.lever) over.genes = [...(over.genes || []), 'zipbomb'];
  const by = placeAuthor(s, mode, opts);
  if (by !== undefined) over.author = by;
  // One stranger a fight (parts.mjs): a part you've never met (research 0) comes alone. A sim plays a veteran (s.metAll).
  if (key === 'random' && !s.metAll) over.seen = (spec, family) => researchAt(s, `${family}:${spec.id}`) > 0;
  const virus = (hooks.createVirus || createVirus)(key, seed, over); // hooks.createVirus: golden.test.mjs plays the same fight on the builder from before genes
  if (opts.name) virus.name = opts.name; // a fight with a name already on screen (a boss, a bounty)
  return virus;
}
// The floor a fight is on: opts.floor, the server you're on (a run: its location's floor, a rooms playtest's), or with
// no server (home, SPRAWL-00's strays, a sim) your floor at the fight's level.
export function floorOfFight(s, mode, opts = {}, level = 1) {
  if (opts.floor) return opts.floor;
  if (mode === 'run' && s.run) {
    if (s.run.loc === CONFIG.zone.id) return 1; // SPRAWL-00, floor 1's entry
    const loc = findLocation(s, opts.wild || opts.process || s.run.loc);
    if (loc?.depth) return loc.depth;
    if (!loc && s.rooms?.floor) return s.rooms.floor; // a rooms playtest's server
  }
  return floorFor(level);
}
// Who the place says wrote what runs there (authors.mjs), when the virus has no author of its own: SPRAWL-00's strays
// are nobody's, a faction's server is that faction's, a traced server's guards and Resident are its family's crew.
// undefined: the virus's own (its family's crew). opts.author overrides.
function placeAuthor(s, mode, opts) {
  if (opts.author !== undefined) return opts.author;
  if (opts.zone && !opts.wild && !opts.process) return null;
  if (mode !== 'run' || !s.run || opts.process) return undefined;
  const loc = findLocation(s, s.run.loc);
  if (!loc || loc.zone || loc.rogue) return undefined;
  return loc.faction ? factionAuthor(loc.faction) ?? crewOf(loc.family) : crewOf(loc.family);
}

// A lead toward a server: since R3 (floors.mjs) every trace runs along a floor's links, so a lead from a place goes to
// one of the ? servers linked to it (its family's first): SPRAWL-00's strays, an invader beaten, a log sweep. Family
// leads that located a server anywhere on your layer are gone. at: where it came from (a location, or SPRAWL-00).
export function addLead(s, family, amount, why = '', at = null) {
  if (!(amount > 0)) return [];
  return traceNear(s, at || { id: CONFIG.zone.id }, amount, why, { one: true, family });
}

// A server by id: one you've traced, or a consortium member's (consortium.mjs).
export const findLocation = (s, id) => s.locations.find((l) => l.id === id) || s.consortium?.servers?.find((l) => l.id === id) || (s.occupation?.id === id ? s.occupation : null) || s.threads?.servers?.find((l) => l.id === id) || null; // a thread's temporary server is no server of your network (threads.mjs)

// A server located on a floor (floors.mjs): at a slot (a ? traced to 100%, a floor's landing server), or, when no slot
// is named (a developer find, a story's server), the next free slot on that floor (pickSlot: a ? of its family first).
// Its level and kind are its slot's: fixed when the floor was generated. A lair's slot holds the network's lair.
export function addLocation(s, family, depth = 1, parent = null, slot = null) {
  const node = slot ? slotNode(s, slot) : pickSlot(s, depth, family);
  const hid = node ? hiddenAt(s, node.id) : null;
  if (hid) s.hidden.splice(s.hidden.indexOf(hid), 1);
  if (node) depth = floorOfSlot(node.id);
  if (node?.kind === 'lair') {
    const lair = lairAt(s, node, parent);
    if (lair) {
      s.locations.push(lair);
      spawnHidden(s, lair);
      if (hid) contractLocated(s, hid, lair);
      emit(s, 'located', `LOCATED on floor ${depth}: ${lair.name}. Something lives in its Core.`, { location: lair.id, floor: depth });
      return lair;
    }
  }
  s.foundSeq = Math.max(s.foundSeq || 0, s.locations.length) + 1; // a running count
  let seed = s.seed * 31 + (s.foundSeq - 1) * 7 + 5;
  let loc = createLocation(family, seed, depth);
  while (s.locations.some((l) => l.id === loc.id)) loc = createLocation(family, ++seed, depth);
  loc.template = node?.template || TEMPLATES[s.locations.filter((l) => !l.rogue).length % TEMPLATES.length]; // its slot's kind
  loc.level = node ? node.level : SERVER.keepUp(hackerLevel(s), depth); // fixed when its floor was generated: its guards' level, and its vault gear's
  if (node) loc.slot = node.id;
  if (node?.author) loc.author = node.author; // its floor's holder wrote it (floors.mjs)
  if (parent) loc.parent = parent;
  if (!s.locations.some((l) => !l.rogue && !l.zone)) loc.starter = true; // your first server's vault: a protocol and spare credits
  loc.special = rollSpecials(loc); // its server special, from its seed (specials.mjs); a rogue server's goes
  if (!node || (node.d > 1 && !node.main)) rollRogue(s, loc); // about 1 in 6 is a rogue server: wild, respawning, never taken (never beside a floor's entry or on its main road: floors.mjs)
  claimServer(s, loc); // about one in eight belongs to a faction (factions.mjs)
  s.locations.push(loc);
  spawnHidden(s, loc);
  if (hid) contractLocated(s, hid, loc); // contracts aimed at the ? follow it
  onFound(s, loc); // memory full: it arrives detached (memory.mjs)
  dropStaleFinds(s);
  emit(s, 'located', `LOCATED on floor ${depth}: ${loc.name}.`, { location: loc.id, floor: depth });
  if (loc.starter) onFirstServer(s, loc); // wick's transmission (scenes.mjs)
  return loc;
}

// Finds you never connected to: keep the newest FIND_CAP. An older one nothing points at (no
// contract, nothing found through it) drops off the map, with the unknown servers past it.
export const FIND_CAP = 10;
function dropStaleFinds(s) {
  const busy = new Set(openContracts(s).flatMap((c) => [c.loc, (s.hidden || []).find((n) => n.id === c.hidden)?.via]).filter(Boolean));
  const never = (l) => (l.fresh && l.detached) || l.unseen; // found, never connected (unseen: memory off)
  const unused = (l) => never(l) && !l.slot && !busy.has(l.id) && !s.locations.some((x) => x.parent === l.id); // a floor's servers stay: the floor bounds them
  while (s.locations.filter(never).length > FIND_CAP) {
    const old = s.locations.find(unused);
    if (!old) break;
    s.locations.splice(s.locations.indexOf(old), 1);
    s.hidden = (s.hidden || []).filter((n) => n.via !== old.id);
  }
}

// ---------- levels ----------
// Each class (hacker profile) levels on its own from 1. XP goes to the class you're playing.
export const hackerOf = (s, arch = classOf(s)) => (s.hackers ||= {})[arch] ||= { level: 1, xp: 0 };
export const hackerLevel = (s, arch = classOf(s)) => hackerOf(s, arch).level;
// Still trying classes: no class has reached LOADOUT.trialUntil, so switching carries your level over.
export const classTrial = (s) => !Object.values(s.hackers || {}).some((h) => h.level >= LOADOUT.trialUntil);
// XP for something at an enemy/location level: a share of a kill, scaled by the level gap.
export const xpFor = (s, level, share = 1) => Math.round(killXp(level) * share * xpScale(level - hackerLevel(s)));
// XP for a one-off deed (a first clear, Mapped, a takeover, a Root level, a decode, a first trade): its share of a
// kill on the old curve, scaled with the climb at your level (deedScale in data.mjs), so it stays a share of a level.
export const deedXpFor = (s, level, share = 1) => xpFor(s, level, share * deedScale(hackerLevel(s)));
export const gainsTalent = (level) => level >= LOADOUT.talentFrom && (level - LOADOUT.talentFrom) % LOADOUT.talentEvery === 0;
// The first time you do something (a trade at a hub):
// half a kill of XP, once. id: what it was, so it never pays twice.
export function firstTime(s, id, why, kind = 'build', share = 0.5) {
  const done = (s.firsts ||= []);
  if (done.includes(id)) return;
  done.push(id);
  gainXp(s, deedXpFor(s, hackerLevel(s), share), why, kind);
}
// Out of SPRAWL-00 (WoW's starter-zone breadcrumb): by level 4 you've traced a server (SPRAWL-00's
// lowest-level neighbour, level 1), and at 5 wick points you at one you haven't cracked yet.
function breadcrumb(s, level) {
  const tame = (s.locations || []).filter((l) => !l.rogue && !l.member);
  if (level === 4 && !tame.length) { const h = hiddenNear(s, { id: CONFIG.zone.id }).sort((a, b) => a.level - b.level || b.lead - a.lead)[0]; addLocation(s, h?.family || 'worm', 1, h?.via || null, h?.slot || null); }
  const open = (s.locations || []).find((l) => !l.rogue && !l.member && !l.takenOver);
  if (level === 5 && open && !tame.some((l) => Object.keys(l.state?.unlocked || {}).length)) emit(s, 'breadcrumb', `wick: strays won't feed you forever. ${open.name} has a vault. go open it.`, { location: open.id });
}
// Decoding a part you've never broken: kills of XP (Phase 4). One kill: at two it paid half the XP of
// levels 1–5 and left a cliff at 6 (docs/progression.md).
export const DECODE_XP = 1;
// ---------- the hot strain ----------
// Every 4 hours one strain open at your level runs hot: +50% XP and lead from it (EverQuest's hot
// zones). On the pager when it changes.
export const HOT = { everyMs: 4 * 3600000, bonus: 0.5 };
export const hotStrain = (s, now = hooks.now?.() ?? Date.now()) => (s.hot && now < s.hot.until ? s.hot.strain : null);
// Fixed by the 4-hour window, not your save: everyone sees the same hot strain (it'll matter online).
function tickHot(s, now) {
  if (s.hot && now < s.hot.until) return;
  const L = hackerLevel(s), open = Object.keys(STRAINS).filter((k) => STRAINS[k].from <= L);
  if (!open.length) return;
  const slot = Math.floor(now / HOT.everyMs);
  const pick = open[(Math.imul(slot, 2654435761) >>> 0) % open.length];
  s.hot = { strain: pick, until: (slot + 1) * HOT.everyMs };
  emit(s, 'hot-strain', `${STRAINS[pick].name} is running hot. Its kills give 50% more XP and lead for 4 hours.`, { strain: pick });
}
// ---------- varied play (Fresh) ----------
// XP comes in kinds. The first XP of a kind other than fighting that you haven't earned in 20 minutes
// of active play pays half again and says so (a Fresh row). Its cap is a kill's worth scaled like the deeds it rides on
// (deedScale in data.mjs: DEED.share times the level's stretch, 4 to 8 kills on the long climb), so it stays half a
// deed rather than a few percent of one (freshCap). Nothing fades: doing one thing over and
// over just pays normally. Small events (under half a kill) never count, so a free action can't
// farm it. Contracts are a wrapper: no bonus, tallied as the activity behind them.
export const FRESH = { gapMs: 20 * 60000, bonus: 0.5, minKill: 0.5 };
export const XP_KINDS = { fight: 'Fights', breakin: 'Break-ins', intel: 'Intel', build: 'Building', trade: 'Trading' };
const playMs = (s) => s.pace?.ms || 0;
export const freshCap = (level) => killXp(level) * deedScale(level); // the most one Fresh bonus pays at your level
function freshBonus(s, amount, kind) {
  const L = hackerLevel(s), k = killXp(L);
  if (!XP_KINDS[kind] || kind === 'fight' || !(FRESH.bonus > 0) || amount < k * FRESH.minKill) return 0; // fighting is the default: the bonus is for stepping away from it
  const last = (s.freshAt ||= {})[kind], now = playMs(s);
  s.freshAt[kind] = now;
  if (last != null && now - last < FRESH.gapMs) return 0;
  return Math.max(1, Math.round(Math.min(amount * FRESH.bonus, freshCap(L))));
}
// kind: what earned it (XP_KINDS), for the Fresh bonus. tally: what it counts as in the XP mix
// (a contract's activity), when there's no bonus.
export function gainXp(s, amount, why, kind = null, tally = kind) {
  if (amount <= 0) return;
  const bonus = freshBonus(s, amount, kind);
  if (bonus) { emit(s, 'fresh', `Fresh bonus +${bonus} XP (${XP_KINDS[kind]}).`, { amount: bonus, kind }); amount += bonus; }
  if (tally) (s.xpMix ||= {})[tally] = (s.xpMix[tally] || 0) + amount;
  const h = hackerOf(s);
  if (h.level >= LOADOUT.maxLevel) return;
  h.xp += amount;
  emit(s, 'xp', `+${amount} XP${why ? ' · ' + why : ''}.`, { amount, kind: tally });
  while (h.level < LOADOUT.maxLevel && h.xp >= xpToNext(h.level)) {
    const arch = classOf(s);
    // Pin the bar you have now before the level changes, so nothing falls off it (and the preset it follows).
    const fol = followOf(s, arch);
    if (!s.loadout.equipped[kitKey(s, arch)]) s.loadout.equipped[kitKey(s, arch)] = [...equippedSkills(s, arch)];
    if (fol) (s.loadout.follow ||= {})[kitKey(s, arch)] = fol;
    h.xp -= xpToNext(h.level);
    const top = serverLevel(s); // your highest class level before this one (the server's level)
    h.level++;
    if (h.level > top) syncServer(s); // the server's level is your highest class level
    breadcrumb(s, h.level);
    // Rogue servers keep up with you inside their floor's band (rogue.mjs does it on a visit too).
    for (const l of s.locations || []) if (l.rogue && !l.member) l.level = Math.max(l.level || 1, SERVER.keepUp(h.level, l.depth || 1));
    const sub = subOf(s, arch);
    // Reaching your subclass level: the bar you had carries into the subclass's own bar.
    if (sub && !s.loadout.equipped[sub]) { s.loadout.equipped[sub] = [...(s.loadout.equipped[arch] || equippedSkills(s, arch))]; (s.loadout.follow ||= {})[sub] = 'rotation'; }
    const got = newAtLevel(arch, h.level, sub);
    // A bar that follows a shipped preset fills from it (keys that stay keep their place). Otherwise new skills go
    // onto the bar while there's room, and the rest to the shelf.
    const k = kitKey(s, arch), eq = (s.loadout.equipped[k] ||= [...equippedSkills(s, arch)]);
    const f = s.loadout.follow?.[k], fp = f && presetsOf(s, arch)[f], before = [...eq];
    if (fp?.shipped) s.loadout.equipped[k] = refill(eq, presetKeys(s, arch, f));
    else for (const g of got) if (skillOrder(arch, sub).includes(g) && !isRunSkill(g) && eq.length < barSlots(h.level) && !eq.includes(g)) eq.push(g);
    const now = s.loadout.equipped[k];
    const shelved = [...got.filter((g) => ABILITIES[g] && skillOrder(arch, sub).includes(g) && !isRunSkill(g) && !now.includes(g)), ...before.filter((g) => !now.includes(g))];
    const wants = (g) => Object.keys(presetsOf(s, arch)).filter((n) => { const x = presetsOf(s, arch)[n]; return (x.shipped ? presetKeys(s, arch, n) : x).includes(g); });
    const shelf = shelved.map((g) => `${ABILITIES[g].name} ${got.includes(g) ? 'goes on' : 'moves to'} the shelf${wants(g).length ? `: your ${andList(wants(g))} preset${wants(g).length === 1 ? ' uses' : 's use'} it (loadout use ${wants(g)[0]})` : ''}.`).join(' ');
    const names = got.filter((id) => id !== 'edge' || sub).map((id) => (id === 'edge' ? `${SUBS[sub].edge.name} (${SUBS[sub].edge.rule.replace(/\.$/, '')})` : ARCHETYPES[arch].skills.find((x) => x.id === id)?.name || ABILITIES[id]?.name || id));
    const pickSub = h.level === SUBCLASS.from && !subPicked(s, arch) ? ` Choose a subclass: ${Object.values(ARCHETYPES[arch].subs).map((x) => `${x.name} (subclass ${x.id})`).join(' or ')}. Until you do, you play the ${ARCHETYPES[arch].name} core.` : '';
    const talent = (gainsTalent(h.level) ? ' +1 talent point.' : '') + (h.level === LOADOUT.capstoneAt[0] ? ' +1 capstone point: pick a capstone (talent capstone a|b).' : h.level === LOADOUT.capstoneAt[1] ? ' Your capstone reaches rank 2.' : '') + pickSub;
    const { gains, next } = levelUpGains(arch, sub, h.level, top);
    emit(s, 'level-up', `LEVEL ${h.level} ${ARCHETYPES[arch].name.toUpperCase()}.${names.length ? ' New: ' + names.join(', ') + '.' : ''}${shelf ? ' ' + shelf : ''}${talent} Power +4%.`, { level: h.level, arch, sub: sub || null, unlocked: got, gains, next, server: h.level > top ? s.server.max : null });
  }
  if (h.level >= LOADOUT.maxLevel) h.xp = 0;
}
// The banner lists what the level brings on every track, and the next level that brings something. With no
// subclass picked, the subclass level brings a subclass to pick, and later levels only what the core brings.
// top: your highest class level before this one (the server's level), so the server's gains count once.
export function levelUpGains(arch, sub, L, top = L - 1) {
  const skillsAt = (l) => newAtLevel(arch, l, l >= SUBCLASS.from ? sub : null).map((id) => (id === 'edge' ? (sub ? SUBS[sub].edge.name : 'a subclass to pick') : ARCHETYPES[arch].skills.find((x) => x.id === id)?.name || ABILITIES[id]?.name || CANTRIPS.find((c) => c.id === id)?.name || id));
  return { gains: [...skillsAt(L), ...levelGains(arch, L, top)], next: nextGains(arch, L, Math.max(top, L), skillsAt) };
}
// A level-up as gainXp would log it, for the level-up prototypes' preview (developer levelup preview): nothing on
// the save changes. The Integrity is what the server would have at that level.
export function levelUpPreview(s, L) {
  const arch = classOf(s), sub = L >= SUBCLASS.from ? subOf(s, arch) : null;
  const { gains, next } = levelUpGains(arch, sub, L, L - 1);
  return { type: 'level-up', preview: true, level: L, arch, sub: sub || null, unlocked: newAtLevel(arch, L, sub), gains, next, server: Math.round(100 * power(L)), message: `LEVEL ${L} ${ARCHETYPES[arch].name.toUpperCase()}.` };
}
// Skills and cantrips a class gains exactly at a level.
export function newAtLevel(arch, lvl, sub = null) {
  const core = UNLOCKS.filter((u) => u.level === lvl).map((u) => (typeof u.what === 'number' ? ARCHETYPES[arch].core[u.what] : u.what));
  const line = sub && ARCHETYPES[arch].subs[sub] ? lineOf(ARCHETYPES[arch].subs[sub]).filter((x) => x.level === lvl).map((x) => x.id) : [];
  return [...core, ...line];
}
// The next thing a class will unlock, for the "next at level N" hint.
export function nextUnlock(s, arch = classOf(s)) {
  const lvl = hackerLevel(s, arch), sub = subOf(s, arch); // no subclass picked: the core's unlocks and the subclass itself
  const all = [...UNLOCKS.map((u) => ({ level: u.level, id: typeof u.what === 'number' ? ARCHETYPES[arch].core[u.what] : u.what })), ...(sub ? lineOf(ARCHETYPES[arch].subs[sub]) : [])];
  const u = all.filter((x) => x.level > lvl).sort((a, b) => a.level - b.level)[0];
  if (!u) return null;
  return { level: u.level, id: u.id, name: u.id === 'edge' ? 'your subclass' : ARCHETYPES[arch].skills.find((x) => x.id === u.id)?.name || ABILITIES[u.id]?.name || u.id };
}

// Your server's level is your highest class level: no XP of its own. devServer: a floor for testing
// (developer server <n>).
export const serverLevel = (s) => Math.min(SERVER.maxLevel, Math.max(1, s.devServer || 0, ...Object.values(s.hackers || {}).map((h) => h?.level || 1)));
// The class whose level it is.
export const serverClass = (s) => Object.entries(s.hackers || {}).sort((a, b) => (b[1]?.level || 1) - (a[1]?.level || 1))[0]?.[0] || classOf(s);

// Subclasses (v31): a class's talent ranks move into its default subclass's tree (the nodes it still
// has); tier picks are cleared, the points free to spend again. Bars carry over as each subclass is used.
function retireClassTrees(s, was) {
  const L = (s.loadout ||= {});
  // A subclass pick that isn't one of that class's (renamed, or a hand-edited save) is dropped.
  if (L.sub) for (const [arch, x] of Object.entries(L.sub)) if (SUBS[x]?.cls !== arch) delete L.sub[arch];
  for (const arch of Object.keys(ARCHETYPES)) {
    const sub = defaultSub(arch), ids = new Set(SUBS[sub].fillers.flat().map((n) => n.id));
    const old = L.ranks?.[arch];
    if (old && Object.keys(old).length && !L.ranks[sub]) L.ranks[sub] = Object.fromEntries(Object.entries(old).filter(([id]) => ids.has(id)));
    if (L.ranks?.[arch]) delete L.ranks[arch];
    if (L.picks?.[arch]) delete L.picks[arch];
    // A class already past the subclass level: its old bar becomes its default subclass's, the skills
    // that moved to the other line fall off, and what it knows fills the slots they leave (as a level-up would).
    if (was < 31 && L.equipped?.[arch] && !L.equipped[sub] && subOf(s, arch)) {
      const known = knownSkills(s, arch), kept = L.equipped[arch].filter((id) => known.includes(id));
      L.equipped[sub] = [...kept, ...known.filter((id) => !kept.includes(id))].slice(0, slotsOf(s, arch));
    }
  }
}
// v46: no default subclass. Before it, a class from level 10 that never picked played its default (EDGE[cls].sub:
// Demolitionist, Warden, Phantom, Herder). Now it plays its core until you pick, so such a save loses what the
// default lent it: its bar keeps its core keys (the default's keys go), the talent
// points it spent in the default's tree come back (ranks, tier picks and the capstone cleared), and its program moves
// to the class (the routines it wrote). Its presets stay, for a pick. The breakout opens the next time you're home
// (no Later is set). A key the default's skill held goes back to a core skill that wasn't on the bar, else empty; a
// bar the player trimmed stays trimmed.
export function subRestore(s, was) {
  if (was >= 46) return;
  const L = (s.loadout ||= {});
  for (const arch of Object.keys(ARCHETYPES)) {
    if (!subWaiting(s, arch)) continue;
    const d = defaultSub(arch), core = ARCHETYPES[arch].core;
    const known = knownSkills(s, arch).filter((id) => !isRunSkill(id));
    const old = L.equipped?.[d] || L.equipped?.[arch];
    if (old) { // no bar saved: it's the core's default bar already
      const kept = old.filter((id, i) => core.includes(id) && known.includes(id) && old.indexOf(id) === i), gone = old.length - kept.length;
      (L.equipped ||= {})[arch] = [...kept, ...known.filter((id) => !kept.includes(id)).slice(0, gone)].slice(0, slotsOf(s, arch)); // a key the default held goes back to a core skill not on the bar, else empty
    }
    for (const k of ['equipped', 'follow', 'cooling', 'ranks', 'picks', 'caps']) if (L[k]) delete L[k][d];
    if (L.follow) delete L.follow[arch];
    const P = s.programs?.by;
    if (P?.[d]) { P[arch] = JSON.parse(JSON.stringify(P[d])); delete P[d]; }
  }
}
// v34: the bar grows a slot at 22 and another at 30 (LOADOUT.bar), and run skills (Spoof, Tap) take none. A saved
// bar loses its run skills, and a class past 22 or 30 gets the new slots filled as a level-up would have: the
// skills that unlocked at those levels first, then whatever else it knows that isn't on the bar. A fight saved
// mid-way keeps going with no tells (they were on the old clock).
function barRestore(s, was) {
  if (was >= 35) return;
  const L = s.loadout || {};
  for (const [key, bar] of Object.entries(L.equipped || {})) {
    if (!Array.isArray(bar)) continue;
    const arch = SUBS[key]?.cls || (ARCHETYPES[key] ? key : null);
    if (!arch) continue;
    const sub = SUBS[key] ? key : null, lvl = hackerOf(s, arch).level;
    const kept = bar.filter((id) => !isRunSkill(id));
    const known = skillOrder(arch, sub).filter((id) => !isRunSkill(id) && unlockLevel(arch, id, sub) <= lvl);
    const fresh = defaultBar(arch, sub, lvl).filter((id) => !kept.includes(id));
    const rest = [...known].reverse().filter((id) => !kept.includes(id) && !fresh.includes(id));
    const extra = Math.max(0, barSlots(lvl) - 7); // the slots that are new (the bar held seven)
    L.equipped[key] = [...kept, ...[...fresh, ...rest].slice(0, extra)].slice(0, barSlots(lvl));
  }
  if (s.encounter?.virus?.tells) delete s.encounter.virus.tells;
}
// v37: each subclass line grew to eleven skills and was reordered (docs/kits.md). A save keeps every skill it knew:
// one that now opens later than the save's level goes to loadout.kept. Its bars keep their keys, and a slot the
// new order leaves free fills from the `rotation` preset. A bar nobody edited (the old default at that level)
// becomes the new default and follows `rotation`. Every subclass gets its two shipped presets. Key 1 kept its id
// (`spike`): each class's name for it is only what it is called and typed, so nothing in a save names it.
export const V36_LINES = {
  demolitionist: ['shatter', 'fork-bomb', 'shaped-charge', 'thermal-runaway', 'logic-bomb', 'chain-reaction', 'bit-rot', 'zero-day'],
  overclocker: ['overvolt', 'segfault', 'thermal-throttle', 'brace', 'stack-smash', 'sudo', 'turbo-boost', 'zero-day'],
  warden: ['suspend', 'bulkhead', 'blowback', 'throttle', 'harden', 'quarantine', 'dmz', 'failover'],
  sysop: ['patch', 'multicast', 'heartbeat', 'scrub', 'reclaim', 'rollback', 'hot-standby', 'rebalance'],
  payload: ['wormable', 'detonate', 'implant', 'skim', 'propagate', 'polymorph', 'thrash', 'irq-storm'],
  phantom: ['null-route', 'opening', 'backstab', 'spoof', 'shadow-copy', 'tap', 'log-wipe', 'implant'],
  herder: ['fan-out', 'mesh', 'kill-switch', 'garbage-collect', 'malloc', 'fork', 'oom-kill', 'cron-storm'],
  hijacker: ['jam', 'hijack', 'replay', 'spoofed-ack', 'barrier', 'cache-poison', 'reroute', 'blackhole'],
};
const V36_UNLOCKS = [12, 14, 18, 22, 26, 30, 34, 38];
// The v36 default bar: every skill that unlocked while a slot was free.
function v36Default(arch, sub, level) {
  const at = [...ARCHETYPES[arch].core.map((id) => [id, unlockLevel(arch, id)]), ...V36_LINES[sub].map((id, i) => [id, V36_UNLOCKS[i]])].filter(([id, l]) => !isRunSkill(id) && l <= level).sort((a, b) => a[1] - b[1]);
  const out = [];
  for (const [id, l] of at) if (out.length < barSlots(l)) out.push(id);
  return out;
}
function kitRestore(s, was) {
  if (was >= 37) return;
  const L = (s.loadout ||= {});
  for (const [sub, x] of Object.entries(SUBS)) {
    const arch = x.cls, lvl = hackerOf(s, arch).level;
    if (lvl < SUBCLASS.from) continue;
    const knew = V36_LINES[sub].filter((id, i) => V36_UNLOCKS[i] <= lvl);
    const later = knew.filter((id) => unlockLevel(arch, id, sub) > lvl);
    if (later.length) (L.kept ||= {})[sub] = later;
    const known = skillOrder(arch, sub).filter((id) => unlockLevel(arch, id, sub) <= lvl || later.includes(id));
    (L.presets ||= {})[sub] ||= Object.fromEntries(Object.keys(shippedPresets(sub)).map((k) => [k, { shipped: true }]));
    const bar = L.equipped?.[sub];
    if (!Array.isArray(bar)) continue;
    const old = v36Default(arch, sub, lvl), same = bar.length === old.length && bar.every((id, i) => old[i] === id); // keys moved around: edited
    (L.follow ||= {})[sub] = same ? 'rotation' : null;
    if (same) { L.equipped[sub] = presetBar(arch, sub, lvl, shippedPresets(sub).rotation || [], known); continue; }
    const kept = bar.filter((id) => known.includes(id) && !isRunSkill(id));
    const fill = presetBar(arch, sub, lvl, shippedPresets(sub).rotation || [], known).filter((id) => !kept.includes(id));
    L.equipped[sub] = [...kept, ...fill].slice(0, barSlots(lvl));
  }
}
// v38: the Demolitionist's and the Phantom's second presets became playstyles of their own (docs/kits.md 11): `swarm`
// is `area` and `ghostroot` is `evasion`. A save keeps its place in the list and the bar that follows it. A preset a
// player saved under the old name is theirs and stays as it is.
export const PRESET_RENAMES = { demolitionist: { swarm: 'area' }, phantom: { ghostroot: 'evasion' } };
function presetRenameRestore(s, was) {
  if (was >= 38) return;
  const L = s.loadout || {};
  for (const [sub, names] of Object.entries(PRESET_RENAMES)) {
    const all = L.presets?.[sub];
    for (const [from, to] of Object.entries(names)) {
      if (!all?.[from]?.shipped || all[to]) continue;
      L.presets[sub] = Object.fromEntries(Object.entries(L.presets[sub]).map(([k, v]) => [k === from ? to : k, v]));
      if (L.follow?.[sub] === from) L.follow[sub] = to;
    }
  }
}
// A rank node a subclass's tree swapped for another: the ranks a save put in the old one move to the new one,
// in the same row. Keyed on what's saved, so it runs on every load. Phantom's Backchannel became Log Rotation.
export const NODE_SWAPS = { phantom: { backchannel: 'log-rotation' } };
function nodeSwapRestore(s) {
  for (const [sub, swaps] of Object.entries(NODE_SWAPS)) {
    const r = s.loadout?.ranks?.[sub];
    if (r) for (const [from, to] of Object.entries(swaps)) if (r[from]) { r[to] = Math.min(3, (r[to] || 0) + r[from]); delete r[from]; }
  }
}
// ---------- talents ----------
// Talent points: one every other level from 10 (21 by level 50). Per class; changing picks is free.
export const talentPoints = (s, arch = classOf(s)) => { const l = hackerLevel(s, arch); return l < LOADOUT.talentFrom ? 0 : Math.floor((l - LOADOUT.talentFrom) / LOADOUT.talentEvery) + 1; };
// Talent picks and ranks are kept per subclass (each subclass has its own tree).
export const picksOf = (s, arch) => s.loadout?.picks?.[kitKey(s, arch)] || [];
export const ranksOf = (s, arch) => s.loadout?.ranks?.[kitKey(s, arch)] || {};
// ---------- capstones (the row under the tree: TREE's last row, each subclass's `capstones`) ----------
// Their own points, one at each LOADOUT.capstoneAt level (45, 50): talent points never reach the row, and its
// points go nowhere else. The first picks one of the two (s.loadout.caps[subclass]: 0 or 1; changing it is free, like
// a tier's pick); the second, at 50, gives the picked one its second rank on its own (it has nowhere else to go).
export const capstonePoints = (s, arch = classOf(s)) => LOADOUT.capstoneAt.filter((l) => hackerLevel(s, arch) >= l).length;
export const capPickOf = (s, arch = classOf(s)) => s.loadout?.caps?.[kitKey(s, arch)];
const CAPSTONES = () => (CAPS_BY_ID ||= Object.fromEntries(Object.values(SUBS).flatMap((x) => (x.capstones || []).map((c) => [c.id, c]))));
let CAPS_BY_ID = null;
export const capstoneNode = (id) => CAPSTONES()[id] || null;
// Your current class's rank in a capstone (0, 1 or 2). s.loadout.devKit.caps: { id: rank } for tests of one rule.
export function capRank(s, id) {
  if (s.loadout?.devKit) return s.loadout.devKit.caps?.[id] || 0;
  const pick = s.loadout?.caps?.[kitKey(s, classOf(s))];
  if (pick !== 0 && pick !== 1) return 0;
  const node = kitOf(s)?.capstones?.[pick];
  return node && node.id === id ? Math.min(node.max, capstonePoints(s)) : 0;
}
// The number a capstone uses at your rank (its `ranks`), or 0 without it.
export const capValue = (s, id) => { const r = capRank(s, id); return r ? capstoneNode(id).ranks[r - 1] : 0; };
// The capstone row's state: 'picked', 'open' (a point to spend), 'blocked' (needs points above it), 'locked' (before 45).
export function capState(s, arch) {
  if (picked(capPickOf(s, arch))) return 'picked';
  if (!capstonePoints(s, arch)) return 'locked';
  return spentAbove(s, arch, TREE.findIndex((r) => r.kind === 'capstone')) < TREE.find((r) => r.kind === 'capstone').need ? 'blocked' : 'open';
}
// Skills a class knows at its level (its core, and its subclass's line), and the ones on its bar.
// The bar a player who kept the defaults has at their level: every skill that unlocked while a slot was free
// (the level-up puts each one on the bar while there's room; a slot opens at 22 and 30 with that level's skill).
// Since the 15-key pools (docs/kits.md) it is the shipped `rotation` preset at that level (presetBar in data.mjs):
// the bar a player who never edits has, filled as skills unlock.
export function defaultBar(arch, sub, level) {
  return presetBar(arch, sub, level, sub ? shippedPresets(sub).rotation || [] : []);
}
// kept: skills a save knew before the lines were reordered (v37), which now open later. A save keeps them.
export const knownSkills = (s, arch) => {
  if (s.loadout?.devKit) return ARCHETYPES[arch].skills.map((x) => x.id).filter((id) => unlockLevel(arch, id) <= hackerLevel(s, arch));
  const sub = subOf(s, arch), kept = (sub && s.loadout?.kept?.[sub]) || [];
  return skillOrder(arch, sub).filter((id) => unlockLevel(arch, id, sub) <= hackerLevel(s, arch) || kept.includes(id));
};
export const equippedSkills = (s, arch) => {
  const known = knownSkills(s, arch);
  const eq = s.loadout?.equipped?.[kitKey(s, arch)] || s.loadout?.equipped?.[arch];
  const fight = known.filter((id) => !isRunSkill(id)); // Spoof and Tap never take a slot: they're typed on runs
  return (eq ? eq.filter((id) => fight.includes(id)) : s.loadout?.devKit ? fight : defaultBar(arch, subOf(s, arch), hackerLevel(s, arch))).slice(0, slotsOf(s, arch));
};
const findSkill = (arch, name) => ARCHETYPES[arch].skills.find((x) => x.id === name || x.id === name.replace(/ /g, '-') || x.name.toLowerCase() === name);

// ---------- presets (docs/kits.md 5.2) ----------
// A preset belongs to one subclass and holds the keys of a bar in order. Two ship with each subclass (`rotation`
// and one conditional build, SUBS[sub].presets): a shipped preset is a priority list that fills as skills unlock.
// One you save is the bar as it was. s.loadout.presets[sub] = { name: { shipped: true } | [ids] }, in the order
// they were made; s.loadout.follow[sub]: the preset the bar was last set from (a shipped one keeps filling the
// bar as you level). Swapping works anywhere out of a fight, and every key a swap puts on the bar starts your
// next fight cooling, as if you had just pressed it (s.loadout.cooling[sub]).
export const PRESETS = { most: 6, name: /^[a-z0-9][a-z0-9-]{0,15}$/, onceCooling: 3 };
export function presetsOf(s, arch = classOf(s)) {
  const sub = subOf(s, arch);
  if (!sub) return {};
  const all = ((s.loadout ||= {}).presets ||= {});
  if (!all[sub]) all[sub] = Object.fromEntries(Object.keys(shippedPresets(sub)).map((k) => [k, { shipped: true }]));
  return all[sub];
}
// The bar a preset gives you now: a shipped one at your level, a saved one as saved (keys you don't know drop out).
export function presetKeys(s, arch, name) {
  const sub = subOf(s, arch), p = presetsOf(s, arch)[name];
  if (!p) return null;
  const known = knownSkills(s, arch);
  if (p.shipped) return presetBar(arch, sub, hackerLevel(s, arch), shippedPresets(sub)[name] || [], known);
  const fight = known.filter((id) => !isRunSkill(id));
  return p.filter((id, i) => fight.includes(id) && p.indexOf(id) === i).slice(0, slotsOf(s, arch));
}
// The preset your bar follows (a fresh bar follows `rotation`), or null once you've edited it by hand.
export const followOf = (s, arch = classOf(s)) => { const k = kitKey(s, arch), f = s.loadout?.follow?.[k]; return f !== undefined ? f : s.loadout?.equipped?.[k] ? null : subOf(s, arch) ? 'rotation' : null; };
// A new bar over an old one: keys that stay keep their place, the new ones fill the gaps in order.
function refill(old, want) {
  const out = old.map((id) => (want.includes(id) ? id : null));
  for (const id of want) if (!out.includes(id)) { const i = out.indexOf(null); if (i >= 0) out[i] = id; else out.push(id); }
  return out.filter(Boolean);
}
// Put a bar on: the keys it brings in start your next fight cooling. Returns { in, out }.
function setBar(s, arch, bar, follow) {
  const k = kitKey(s, arch), was = equippedSkills(s, arch);
  s.loadout.equipped[k] = [...bar];
  (s.loadout.follow ||= {})[k] = follow;
  const brought = bar.filter((id) => !was.includes(id)), out = was.filter((id) => !bar.includes(id));
  const cool = ((s.loadout.cooling ||= {})[k] ||= []);
  for (const id of brought) if ((cooldownOf(s, id) || ABILITIES[id]?.once) && !cool.includes(id)) cool.push(id);
  s.loadout.cooling[k] = cool.filter((id) => bar.includes(id));
  return { in: brought, out };
}
const keysLine = (bar) => bar.map((id, i) => `${slotKey(i)} ${id}`).join(' · ');
const nameList = (ids) => ids.map((id) => ABILITIES[id]?.name || id);
const andList = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
// The keys that start your next fight cooling (engage): as if just pressed, a once-a-fight skill for a few cycles.
function coolSwapped(s) {
  const k = kitKey(s, classOf(s)), list = s.loadout?.cooling?.[k];
  if (!list?.length) return;
  const e = s.encounter, bar = usable(s);
  const cooled = list.filter((id) => bar.includes(id));
  for (const id of cooled) e.readyAt[id] = e.cycle + (ABILITIES[id]?.once ? PRESETS.onceCooling : cooldownOf(s, id));
  delete s.loadout.cooling[k];
  if (cooled.length) emit(s, 'status', `You swapped in ${andList(nameList(cooled))} before this fight, so ${cooled.length === 1 ? 'it is' : 'they are'} still cooling.`);
}
function presetCommand(s, words) {
  const arch = classOf(s), sub = subOf(s, arch), verb = words[1] || 'list', name = words.slice(2).join('-');
  if (!sub) return warn(s, `Presets come with your subclass, at level ${SUBCLASS.from}.`);
  const all = presetsOf(s, arch), names = Object.keys(all), kit = SUBS[sub];
  const say = (n) => `${n}: ${keysLine(presetKeys(s, arch, n))}${all[n].shipped ? ' (shipped)' : ''}`;
  if (verb === 'list') return emit(s, 'info', names.length ? `${kit.name} presets. ${names.map(say).join('. ')}.${followOf(s, arch) ? ` Your bar follows ${followOf(s, arch)}.` : ''}` : `No ${kit.name} presets. Type loadout save <name>.`);
  if (!['save', 'use', 'show', 'delete'].includes(verb)) return warn(s, 'usage: loadout save <name> · loadout use <name> · loadout list · loadout show <name> · loadout delete <name>');
  if (!name) return warn(s, `usage: loadout ${verb} <name>.${names.length ? ` Your presets: ${names.join(', ')}.` : ''}`);
  if (verb !== 'save' && !all[name]) { const near = closest(name, names); return warn(s, `No preset called ${name}.${near ? ` Did you mean ${near}?` : names.length ? ` Your presets: ${names.join(', ')}.` : ''}`, near ? { suggest: `loadout ${verb} ${near}` } : {}); }
  if (verb === 'show') {
    const bar = presetKeys(s, arch, name), lay = kit.layers || {};
    const layer = (id) => Object.keys(lay).find((k) => lay[k].includes(id)) || 'core';
    return emit(s, 'info', `${name}${all[name].shipped ? ' (shipped)' : ''}: ${bar.map((id, i) => `${slotKey(i)} ${ABILITIES[id]?.name || id} (${layer(id)})`).join(' · ')}.`);
  }
  if (active(s)) return warn(s, 'Presets change between fights. Finish this one first.');
  if (verb === 'delete') {
    delete all[name];
    if (s.loadout.follow?.[kitKey(s, arch)] === name) s.loadout.follow[kitKey(s, arch)] = null;
    return emit(s, 'loadout', `Preset ${name} deleted.`);
  }
  if (verb === 'save') {
    if (!PRESETS.name.test(name)) return warn(s, 'A preset name is one word of up to 16 letters, digits or dashes.');
    if (!all[name] && names.length >= PRESETS.most) return warn(s, `You have ${PRESETS.most} ${kit.name} presets already. Delete one first.`);
    const bar = equippedSkills(s, arch);
    all[name] = [...bar];
    (s.loadout.follow ||= {})[kitKey(s, arch)] = name;
    return emit(s, 'loadout', `Saved ${name}: ${keysLine(bar)}.`);
  }
  // use
  const bar = presetKeys(s, arch, name);
  const missing = all[name].shipped ? [] : all[name].filter((id) => !bar.includes(id));
  const r = setBar(s, arch, bar, name);
  const moved = r.in.length || r.out.length;
  const cooling = r.in.filter((id) => cooldownOf(s, id) || ABILITIES[id]?.once);
  emit(s, 'loadout', `Bar set from ${name}.${moved ? ` In: ${r.in.map((id) => `${id} (${slotKey(bar.indexOf(id))})`).join(', ') || 'nothing'}. Out: ${r.out.join(', ') || 'nothing'}.` : ' It was already on your bar.'}${missing.length ? ` You don't know ${andList(missing)}, so ${missing.length === 1 ? 'it stays' : 'they stay'} off.` : ''}${cooling.length ? ` ${andList(nameList(cooling))} start${cooling.length === 1 ? 's' : ''} your next fight cooling.` : ''}`);
}
const picked = (x) => x === 0 || x === 1;

// Points spent in one row of the tree (see TREE in data.mjs).
// kit: a subclass (SUBS), whose fillers and talents make the tree.
function rowSpent(picks, ranks, kit, row) {
  if (!kit || row.kind === 'capstone') return 0; // the capstone row spends its own points (capstonePoints)
  if (row.kind === 'choice') return picked(picks[row.tier]) ? 1 : 0;
  return kit.fillers[row.row].reduce((n, node) => n + (ranks[node.id] || 0), 0);
}
const spentAboveWith = (picks, ranks, kit, i) => TREE.slice(0, i).reduce((n, row) => n + rowSpent(picks, ranks, kit, row), 0);
export const pointsSpent = (s, arch) => TREE.reduce((n, row) => n + rowSpent(picksOf(s, arch), ranksOf(s, arch), kitOf(s, arch), row), 0);
export const spentAbove = (s, arch, i) => spentAboveWith(picksOf(s, arch), ranksOf(s, arch), kitOf(s, arch), i);
// cap: the capstone picked (0, 1, or nothing): it needs its row's points above it too.
function treeValid(picks, ranks, kit, cap) {
  return TREE.every((row, i) => !(row.kind === 'capstone' ? picked(cap) : rowSpent(picks, ranks, kit, row)) || spentAboveWith(picks, ranks, kit, i) >= row.need);
}
// Can a rank in this node come back without leaving a deeper pick short of the points above it?
export function canTakeBack(s, arch, id) {
  const kit = kitOf(s, arch), ranks = { ...ranksOf(s, arch) };
  if (!kit || !ranks[id]) return false;
  ranks[id]--;
  return treeValid(picksOf(s, arch), ranks, kit, capPickOf(s, arch));
}
// Row state: 'open' (can spend here), 'locked' (open but no free points), 'blocked' (needs more points above).
export function rowState(s, arch, i) {
  if (spentAbove(s, arch, i) < TREE[i].need) return 'blocked';
  return pointsSpent(s, arch) < talentPoints(s, arch) ? 'open' : 'locked';
}
export function tierState(s, arch, tier) {
  if (picked(picksOf(s, arch)[tier])) return 'picked';
  return rowState(s, arch, TREE.findIndex((r) => r.kind === 'choice' && r.tier === tier));
}
// Your current class's rank in a filler node.
export const rank = (s, id) => (ranksOf(s, classOf(s))[id] || 0) + (kitTalent(classOf(s)).id === id && hackerLevel(s) >= LOADOUT.specFrom ? LOADOUT.specRanks : 0);
// The class's kit talent: from level 5, the first of its two first-row talents, LOADOUT.specRanks free
// ranks in it (it was the level-5 specialty pick; the measured gain was a few percent, so it's simply yours).
export const kitTalent = (arch) => ARCHETYPES[arch].spec.find((o) => o.id === LOADOUT.kit[arch]) || ARCHETYPES[arch].spec[0];
export const specRule = (o) => o.rule.replace(/\d+/, (n) => String(Number(n) * LOADOUT.specRanks)).replace(' per rank', '');
const fillerNode = (kit, id) => kit?.fillers.flat().find((n) => n.id === id || n.name.toLowerCase() === id);

// subclass [class] [<id>]: the first pick anywhere out of a fight; switching back and forth, at home.
// Free. Each subclass keeps its own bar and talent tree, so switching back finds them as you left them.
function subclassCommand(s, text) {
  const words = text.split(' ').slice(1);
  const arch = ARCHETYPES[words[0]] ? words.shift() : classOf(s);
  const opts = Object.values(ARCHETYPES[arch].subs);
  const say = opts.map((x) => `${x.name} (subclass ${x.id}): ${x.idea}`).join(' Or ');
  if (hackerLevel(s, arch) < SUBCLASS.from) return warn(s, `Your ${ARCHETYPES[arch].name} subclass comes at level ${SUBCLASS.from}. ${say}`);
  const want = words.join(' ').toLowerCase();
  if (!want) return emit(s, 'info', `${subPicked(s, arch) ? `Subclass: ${SUBS[subOf(s, arch)].name}.` : 'Subclass: not picked yet.'} ${say}`);
  const x = opts.find((o) => o.id === want || o.name.toLowerCase() === want);
  if (!x) return warn(s, `${ARCHETYPES[arch].name} subclasses: ${opts.map((o) => o.id).join(', ')}.`);
  if (active(s)) return warn(s, 'Finish the fight first.');
  if (subPicked(s, arch) && s.run) return warn(s, 'Switch subclass at home. Jack out first.');
  if (subPicked(s, arch) && s.loadout.sub[arch] === x.id) return emit(s, 'info', `You're already a ${x.name}.`);
  (s.loadout.sub ||= {})[arch] = x.id;
  if (!s.loadout.equipped[x.id]) { s.loadout.equipped[x.id] = defaultBar(arch, x.id, hackerLevel(s, arch)); (s.loadout.follow ||= {})[x.id] = 'rotation'; }
  emit(s, 'loadout', `Subclass: ${x.name}. ${x.idea} Edge: ${x.edge.name}. ${x.edge.rule}`);
}

function loadoutCommand(s, text) {
  const words = text.split(' ');
  if (words[0] === 'loadout') return presetCommand(s, words);
  // Keys change anywhere out of a fight (docs/kits.md 9); talents and classes, at home.
  if (active(s)) return warn(s, words[0] === 'equip' || words[0] === 'unequip' ? 'Change your keys between fights. Finish this one first.' : 'Change your loadout at home, between fights.');
  if (s.run && !['equip', 'unequip'].includes(words[0])) return warn(s, 'Change your loadout at home, between fights.');
  if (['equip', 'unequip'].includes(words[0])) {
    // equip|unequip [class] <skill>, and equip [class] <skill> <key>: on that key (a skill already on the bar swaps
    // places with the one there; one that isn't sends it to the shelf).
    let rest = words.slice(1);
    let arch = s.loadout.archetype;
    if (ARCHETYPES[rest[0]]) { arch = rest[0]; rest = rest.slice(1); }
    const onKey = words[0] === 'equip' && rest.length > 1 && LOADOUT.keys.includes(rest.at(-1)) ? LOADOUT.keys.indexOf(rest.pop()) : -1;
    const skill = rest.length ? findSkill(arch, rest.join(' ')) : null;
    if (!skill) return warn(s, `usage: ${words[0]} <skill>. ${ARCHETYPES[arch].name} skills: ${skillOrder(arch, subOf(s, arch)).join(', ')}.`);
    const known = knownSkills(s, arch), equipped = [...equippedSkills(s, arch)];
    const line = subOf(s, arch) ? skillOrder(arch, subOf(s, arch)) : ARCHETYPES[arch].core;
    if (!line.includes(skill.id)) { const other = Object.values(ARCHETYPES[arch].subs).find((x) => x.skills.includes(skill.id)); return warn(s, `${skill.name} is a ${other?.name || 'subclass'} skill${hackerLevel(s, arch) < SUBCLASS.from ? ` (subclasses come at level ${SUBCLASS.from})` : ` (subclass ${other?.id})`}.`); }
    if (!known.includes(skill.id)) return warn(s, `${skill.name} unlocks at ${ARCHETYPES[arch].name} level ${unlockLevel(arch, skill.id, subOf(s, arch))}.`);
    if (words[0] === 'unequip') {
      if (!equipped.includes(skill.id)) return warn(s, `${skill.name} isn't equipped.`);
      s.loadout.equipped[kitKey(s, arch)] = equipped.filter((x) => x !== skill.id);
      (s.loadout.follow ||= {})[kitKey(s, arch)] = null;
      return emit(s, 'loadout', `${skill.name} unequipped.`);
    }
    if (isRunSkill(skill.id)) return warn(s, `${skill.name} is a run skill and takes no slot. Type ${skill.id} on a run.`);
    if (onKey >= 0) {
      const slots = slotsOf(s, arch), from = equipped.indexOf(skill.id), there = equipped[onKey];
      if (onKey >= slots) return warn(s, `Key ${slotKey(onKey)} opens at level ${LOADOUT.bar.find(([, n]) => n > onKey)?.[0]}.`);
      if (from === onKey) return emit(s, 'info', `${skill.name} is on key ${slotKey(onKey)}.`);
      const bar = [...equipped];
      if (from >= 0 && there) { bar[from] = there; bar[onKey] = skill.id; } else if (from >= 0) { bar.splice(from, 1); bar.push(skill.id); } else if (there) bar[onKey] = skill.id; else bar.push(skill.id);
      const cools = arch === classOf(s) && !equipped.includes(skill.id) && (cooldownOf(s, skill.id) || ABILITIES[skill.id]?.once);
      if (arch === classOf(s)) setBar(s, arch, bar, null);
      else { s.loadout.equipped[kitKey(s, arch)] = bar; (s.loadout.follow ||= {})[kitKey(s, arch)] = null; }
      const moved = there && from >= 0 ? `, ${ABILITIES[there]?.name || there} to key ${slotKey(from)}` : there ? `; ${ABILITIES[there]?.name || there} goes to the shelf` : '';
      return emit(s, 'loadout', `${skill.name} on key ${slotKey(bar.indexOf(skill.id))}${moved}.${cools ? ' It starts your next fight cooling.' : ''}`);
    }
    if (equipped.includes(skill.id)) return warn(s, `${skill.name} is already on key ${slotKey(equipped.indexOf(skill.id))}.`);
    const slots = slotsOf(s, arch);
    if (equipped.length >= slots) return warn(s, `All ${slots} slots are full. Unequip one first.`);
    const cools = arch === classOf(s) && (cooldownOf(s, skill.id) || ABILITIES[skill.id]?.once);
    if (arch === classOf(s)) setBar(s, arch, [...equipped, skill.id], null);
    else { s.loadout.equipped[kitKey(s, arch)] = [...equipped, skill.id]; (s.loadout.follow ||= {})[kitKey(s, arch)] = null; }
    return emit(s, 'loadout', `${skill.name} equipped on key ${slotKey(equipped.length)}.${cools ? ' It starts your next fight cooling.' : ''}`);
  }
  if (words[0] === 'specialty') {
    const arch = ARCHETYPES[words[1]] ? words[1] : s.loadout.archetype, k = kitTalent(arch);
    return emit(s, 'info', `There's no specialty to pick any more. ${k.name} is part of the ${ARCHETYPES[arch].name} kit from level ${LOADOUT.specFrom}: ${specRule(k)}`);
  }
  if (words[0] === 'archetype') {
    const id = words[1] === 'sysadmin' ? 'bastion' : words[1]; // its old name still works
    if (!id) return emit(s, 'info', `Class: ${ARCHETYPES[s.loadout.archetype].name} (level ${hackerLevel(s)}). Options: ${Object.keys(ARCHETYPES).join(', ')}.`);
    if (!ARCHETYPES[id]) return warn(s, `No class called ${id}. Try: ${Object.keys(ARCHETYPES).join(', ')}.`);
    // Trying classes out: until any class reaches LOADOUT.trialUntil, a switch to a class you haven't
    // played takes your level and XP with it, so your first pick costs nothing to change.
    const from = s.loadout.archetype, cur = hackerOf(s, from), to = hackerOf(s, id);
    const trial = id !== from && classTrial(s) && to.level === 1 && !to.xp && (cur.level > 1 || cur.xp);
    if (trial) { s.hackers[id] = { ...cur }; s.hackers[from] = { level: 1, xp: 0 }; }
    s.loadout.archetype = id;
    return emit(s, 'loadout', `Class: ${ARCHETYPES[id].name}, level ${hackerLevel(s, id)}.${trial ? ' Your level came with you.' : ''} ${ARCHETYPES[id].solo}`);
  }
  // talent [class] <1-3> <a|b> · talent add|remove <node> · talent reset [class]
  let rest = words.slice(1);
  let arch = s.loadout.archetype;
  if (ARCHETYPES[rest[0]]) { arch = rest[0]; rest = rest.slice(1); }
  if (ARCHETYPES[rest[1]] && rest[0] === 'reset') arch = rest[1];
  if (rest[0] === 'reset') {
    s.loadout.picks[kitKey(s, arch)] = [];
    s.loadout.ranks[kitKey(s, arch)] = {};
    if (s.loadout.caps) delete s.loadout.caps[kitKey(s, arch)];
    const cp = capstonePoints(s, arch);
    return emit(s, 'loadout', `${ARCHETYPES[arch].name} talents cleared. ${talentPoints(s, arch)} point(s) free${cp ? `, and your capstone to pick again` : ''}.`);
  }
  const noPoints = hackerLevel(s, arch) < LOADOUT.talentFrom ? `Talents start at level ${LOADOUT.talentFrom}.` : `No free talent points. You get one every ${LOADOUT.talentEvery} levels.`;
  if (rest[0] === 'add' || rest[0] === 'remove') {
    const kit = kitOf(s, arch);
    if (!kit) return warn(s, `Talents start at level ${LOADOUT.talentFrom}, with your subclass.`);
    const node = fillerNode(kit, rest.slice(1).join(' '));
    if (!node) return warn(s, `usage: talent add|remove <node>. ${kit.name} nodes: ${kit.fillers.flat().map((n) => n.id).join(', ')}.`);
    const ranks = { ...ranksOf(s, arch) };
    const i = TREE.findIndex((r) => r.kind === 'filler' && kit.fillers[r.row].includes(node));
    if (rest[0] === 'add') {
      if ((ranks[node.id] || 0) >= node.max) return warn(s, `${node.name} is at max rank.`);
      const st = rowState(s, arch, i);
      if (st === 'blocked') return warn(s, `${node.name} needs ${TREE[i].need} points spent above it.`);
      if (st === 'locked') return warn(s, noPoints);
      ranks[node.id] = (ranks[node.id] || 0) + 1;
    } else {
      if (!ranks[node.id]) return warn(s, `${node.name} has no ranks.`);
      ranks[node.id]--;
      if (!treeValid(picksOf(s, arch), ranks, kit, capPickOf(s, arch))) return warn(s, 'Deeper picks depend on that point. Take those back first.');
    }
    s.loadout.ranks[kitKey(s, arch)] = ranks;
    return emit(s, 'loadout', `${node.name} ${ranks[node.id]}/${node.max}. ${node.rule}`);
  }
  // talent capstone <a|b> (or talent 4 <a|b>): the row under the tree, from level 45, on its own points.
  if (rest[0] === 'capstone' || rest[0] === '4') {
    const kit = kitOf(s, arch), side = rest[1];
    if (!kit) return warn(s, `Talents start at level ${LOADOUT.talentFrom}, with your subclass.`);
    if (!['a', 'b'].includes(side)) return warn(s, `usage: talent capstone <a|b>. ${kit.name} capstones: ${kit.capstones.map((x, j) => `${j ? 'b' : 'a'} ${x.name}`).join(', ')}.`);
    const st = capState(s, arch);
    if (st === 'locked') return warn(s, `Capstones come at level ${LOADOUT.capstoneAt[0]}, on a point of their own (its second rank at ${LOADOUT.capstoneAt[1]}).`);
    if (st === 'blocked') return warn(s, `The capstone needs ${TREE.find((r) => r.kind === 'capstone').need} points spent above it.`);
    (s.loadout.caps ||= {})[kitKey(s, arch)] = side === 'a' ? 0 : 1;
    const node = kit.capstones[side === 'a' ? 0 : 1], r = Math.min(node.max, capstonePoints(s, arch));
    return emit(s, 'loadout', `${kit.name} capstone: ${node.name} (rank ${r}/${node.max}). ${node.rules[r - 1]}${r < node.max ? ` Rank ${node.max} at level ${LOADOUT.capstoneAt[node.max - 1]}: ${node.rules[node.max - 1]}` : ''}`);
  }
  const tier = Number(rest[0]), side = rest[1];
  if (!(tier >= 1 && tier <= 3) || !['a', 'b'].includes(side)) return warn(s, 'usage: talent <1-3> <a|b> · talent capstone <a|b> · talent add|remove <node> · talent reset');
  const state = tierState(s, arch, tier - 1);
  if (state === 'blocked') return warn(s, `Tier ${tier} needs ${TREE.find((r) => r.kind === 'choice' && r.tier === tier - 1).need} points spent above it.`);
  if (state === 'locked') return warn(s, noPoints);
  const picks = [...picksOf(s, arch)];
  picks[tier - 1] = side === 'a' ? 0 : 1;
  s.loadout.picks[kitKey(s, arch)] = picks;
  const talent = kitOf(s, arch).talents[tier - 1][picks[tier - 1]];
  emit(s, 'loadout', `${kitOf(s, arch).name} tier ${tier}: ${talent.name}. ${talent.rule}`);
}

// ---------- upgrades ----------
// Max Signal%: set pieces and bonuses (sets.mjs) and Bedframe, Firmware (max-signal%) raise the whole of it.
const signalOf = (s) => Math.round(CONFIG.maxSignal * powerOf(s)) + gearStat(s, 'signal') + 4 * rank(s, 'redundancy') + 3 * rank(s, 'onion-routing') + 3 * rank(s, 'extra-memory');
export const maxSignal = (s) => {
  const n = signalOf(s), pct = (piecesOn(s) ? setSignal(s) : 0) + fxSum(s, 'always', 'max-signal%'), sick = rebootSick(s), m = pct ? n + Math.round((n * pct) / 100) : n;
  return sick ? Math.max(1, Math.round(m * (1 - sick))) : m;
};
// Reboot sickness (CONFIG.rebootSick): while your server reboots (Degraded), your max Signal and the damage you deal are
// down by a share that grows with the deepest floor you've reached. Clearing your own occupied server (a crash while
// away) is how you bring it back sooner, so it doesn't count there.
export const rebootSick = (s) => (!s.degraded || (s.occupation && s.run?.loc === s.occupation.id) ? 0 : CONFIG.rebootSick[Math.min(CONFIG.rebootSick.length, s.floors?.reached || 1) - 1]);
// A run's Signal follows reboot sickness as it comes and goes: its max drops at a crash (Signal with it) and comes
// back when the server is back online (Signal doesn't).
export function syncRunSignal(s) {
  if (!s.run) return;
  s.run.max = maxSignal(s);
  s.run.integrity = Math.min(s.run.integrity, s.run.max);
}

// Protocols at home: protocols · load <protocol> · unload <protocol|slot> · deconstruct <protocol>.
function protocolCommand(s, text) {
  const [word, ...restWords] = text.split(' ');
  const arg = restWords.join(' ').trim();
  if (word === 'protocols' || word === 'gear') {
    const on = loaded(s);
    return emit(s, 'info', `Protocols (${on.length}/${slotCount(s)}): ${on.map(itemLabel).join(', ') || 'none loaded'}. Stash ${(s.stash || []).length}/${STASH_CAP}.`);
  }
  if (active(s) || s.run) return warn(s, 'Change protocols at home, between fights.');
  if (word === 'load') {
    const it = stashItem(s, arg);
    if (!it) return warn(s, arg ? `No protocol ${arg} in your stash.` : 'load <protocol>: see the Loadout page for ids.');
    const rig = rigOf(s);
    if (rig.includes(it.id)) return warn(s, `${itemLabel(it)} is already loaded.`);
    if (it.zeroDay && zeroDay(s, it.zeroDay)) return warn(s, `You're already running ${ZERO_DAYS[it.zeroDay].name}. One of each Zero-day at a time.`);
    if (it.unique && loaded(s).some((x) => x.unique === it.unique)) return warn(s, `You're already running ${it.name}. One of each at a time.`);
    let slot = freeSlot(s, groupOf(it));
    // A full slot swaps: the item in it goes back to the stash.
    const same = SLOT_KINDS.slice(0, slotCount(s)).indexOf(groupOf(it));
    if (slot < 0 && same < 0) return warn(s, groupOf(it) === 'implant' ? 'Implant slots open at level 15.' : `You have no ${SLOTS[groupOf(it)]?.name || groupOf(it)} slot.`);
    const out = slot < 0 ? stashItem(s, rig[same]) : null;
    if (slot < 0) slot = same;
    if (out) emit(s, 'gear', `${itemLabel(out)} back in the stash.`, { item: out.id });
    // One place at a time: loading it here takes it off any other class.
    unslot(s, it.id);
    rig[slot] = it.id;
    it.on = s.equipN = (s.equipN || 0) + 1; // when it went on: the 4-piece set rule keeps the set that reached four first (sets.mjs)
    return emit(s, 'gear', `${itemLabel(it)} loaded in slot ${slot + 1} (${loaded(s).length}/${slotCount(s)}).`, { item: it.id });
  }
  if (word === 'unload') {
    const rig = rigOf(s);
    const id = /^\d+$/.test(arg) ? rig[Number(arg) - 1] : arg;
    const i = id ? rig.indexOf(id) : -1;
    if (i < 0) return warn(s, arg ? `${arg} isn't loaded.` : 'unload <protocol or slot number>.');
    rig[i] = null;
    return emit(s, 'gear', `${itemLabel(stashItem(s, id))} unloaded.`, { item: id });
  }
  if (word === 'scrap' || word === 'deconstruct') {
    const it = stashItem(s, arg);
    if (!it) return warn(s, arg ? `No item ${arg} in your stash.` : 'deconstruct <item>.');
    unslot(s, it.id);
    s.stash = s.stash.filter((x) => x.id !== it.id);
    const gains = [];
    return emit(s, 'gear', `${itemLabel(it)} deconstructed: ${deconstruct(s, it, gains)}.`, { item: it.id, gains, name: itemLabel(it) });
  }
}

// Services went with outposts (R2): the commands say where their jobs went.
function serviceCommand(s) {
  return warn(s, 'Services are gone. Programs in a server\'s sockets bend that server\'s rules: clear a socket room, then build.');
}

// How long a server makes you wait to reconnect after a disconnect: CONFIG.relockMs, and CONFIG.deathWait.each more for
// each disconnect on its run (loc.deaths), up to CONFIG.deathWait.cap.
export const relockWait = (deaths = 0) => Math.min(CONFIG.deathWait.cap, CONFIG.relockMs + deaths * CONFIG.deathWait.each);
// Losing all Signal on a run: back home, pack lost, server untouched. The server waits a little longer for each
// disconnect on its run (relockWait).
export function disconnect(s, reason) {
  const run = s.run;
  if (!run) return;
  // Deadman's Switch: jack out with the pack instead (then it rearms on a real-time cooldown).
  const dead = hooks.jackOut && fxFire(s, 'disconnect', { do: 'jackout' })[0];
  if (dead) {
    emit(s, 'net-good', `Your Signal is gone, but ${dead.it.name} trips. You jack out with your pack.`);
    run.integrity = 0;
    if (s.encounter?.mode === 'run' && s.encounter.phase !== 'active') s.encounter = null;
    return hooks.jackOut(s);
  }
  const loc = run.loc === CONFIG.zone.id ? s.zone : findLocation(s, run.loc);
  const failed = s.mail?.jobs ? contractPackLost(s, run) : []; // a contract's item in the pack goes with it, and its contract fails (mail.mjs)
  const lost = run.pack.length;
  const by = s.encounter?.mode === 'run' ? s.encounter.virus?.name : null; // what took you out, for the card
  const recap = s.encounter?.mode === 'run' ? deathRecap(s) : null; // how: the last cycles' Signal and hits (recap.mjs)
  s.signal = Math.max(0, run.integrity);
  s.run = null;
  const wait = loc ? relockWait((loc.deaths = (loc.deaths || 0) + 1)) : 0;
  if (loc) loc.lockUntil = (hooks.now?.() ?? Date.now()) + wait; // every server: see rogue.mjs relocks/relockLeft
  if (s.encounter?.mode === 'run' && s.encounter.phase !== 'active') s.encounter = null;
  if (s.parked) { s.encounter = s.parked; s.parked = null; }
  if (s.gate && s.encounter?.phase !== 'alert') { s.encounter = s.gate; s.gate = null; }
  emit(s, 'disconnected', `DISCONNECTED${reason ? ': ' + reason : ''}. ${lost ? `${lost} unbanked ${lost === 1 ? 'file' : 'files'} lost.` : ''} Your server is untouched.`, { by, reason: reason || '', lost, where: loc?.name || '', relockMs: wait, deaths: loc?.deaths || 0, failed, ...(recap ? { recap } : {}) });
}

function newMetrics(s) {
  const e = s.encounter;
  return {
    enemy: e.virus.name, family: e.virus.family, level: e.virus.level, room: e.room, mutation: e.virus.mutation, seed: e.seed,
    mode: e.mode, startIntegrity: defender(s).integrity, startCredits: s.server.credits,
    actions: Object.fromEntries(Object.keys(ABILITIES).map((k) => [k, 0])),
    auto: 0, holds: 0, invalid: 0, breakOrder: [], interrupts: 0, attacksLanded: 0,
    attackDamage: 0, encrypted: 0, loot: [], misses: 0, evaded: 0,
    cycles: 0, result: null, endIntegrity: null, lead: null,
  };
}

function engage(s) {
  // A gate intrusion parked during an invader fight comes back when you engage.
  if (s.gate && !active(s) && s.encounter?.phase !== 'alert' && !s.run) { s.encounter = s.gate; s.gate = null; }
  const e = s.encounter;
  if (!e || e.phase !== 'alert') return warn(s, 'No intrusion waiting.');
  e.phase = 'active';
  e.metrics = newMetrics(s);
  e.serial0 = s.serial; // where the fight's log starts (achievements.mjs reads its last cycle)
  rollSync(s);
  // Bastion Hardened: start the fight with an armor chit of your own.
  e.chits = 0;
  e.hardened = classOf(s) === 'bastion' ? SKILLS.hardened : 0; // Bastion's passive: the first damage hit each fight lands at half
  classEach('start', s);
  coolSwapped(s); // keys a preset or an equip put on the bar since your last fight start it cooling
  // Uniques that fire as a fight starts (Gate Bypass, Cell Key).
  for (const x of fxFire(s, 'start')) {
    if (x.fx.do === 'chit') { e.chits++; emit(s, 'status', `${x.it.name}: you start with a ◆.`); }
    if (x.fx.do === 'chit-fade') fadingChit(s, x);
    if (x.fx.do === 'clock-start' && gearStat(s, 'clock')) e.clock = Math.max(e.clock || 0, Number(x.fx.value) || 0); // Clock Tree: the meter starts part full
    if (x.fx.do === 'force-crit') e.forceCrit = true;
    if (x.fx.do === 'shield') { e.shield = (e.shield || 0) + x.value; emit(s, 'status', `${x.name || x.it.name}: you start behind a ${x.value} shield.`, { mark: 'shield' }); }
    if (x.fx.do === 'shield%') { const n = Math.max(1, Math.round((defender(s).max * x.value) / 100)); e.shield = (e.shield || 0) + n; emit(s, 'status', `${x.name || x.it.name}: you start behind a ${n} shield.`, { mark: 'shield', ...firedOf([x]) }); } // Cold Boot
    if (x.fx.do === 'first-skill-crit') fxState(e).critSkill = true; // POST Code: spent by your first skill that hits (playerPhase)
  }
  // A filter of the Scrubber starts every home fight shielded.
  if (e.mode === 'home' && gearStat(s, 'shield', 'server')) e.shield = (e.shield || 0) + gearStat(s, 'shield', 'server');
  daemonsOn(s, 'start'); // the Airbag, and the Leash on an Exfil (daemons.mjs)
  noteSignal(s, e.cycle - 1); // the Signal you came in with, as the cycle before the first (Last Known Good, the death recap)
  // Stealth: each part's first attack may come a cycle later (a delay like any, delayAttack).
  const st = gearStat(s, 'stealth');
  if (st) {
    const late = attackers(s).filter((p) => rand(s) * 100 < st && delayAttack(s, p, 1));
    if (late.length) emit(s, 'status', `Stealth: ${late.map((p) => p.name).join(' and ')} ${late.length === 1 ? 'attacks' : 'attack'} a cycle later.`);
  }
  emit(s, 'engage', `Engaged ${e.virus.name}.`);
  hooks.crewEngage?.(s); // crew.mjs: crewmates join (run fights only)
  raidStart(s); // a crew boss (raid.mjs): its mechanics, once the crew is in
  // Mutex: the part it locks starts the fight behind its shield (sized once the crew has made the virus bigger).
  for (const m of livingParts(s).filter((x) => x.lock)) { const t = part(s, m.lock); if (alive(t)) { t.lockMax = t.lockHp = Math.max(1, Math.round(t.max * CONFIG.mutex.share)); t.lockAt = null; } }
  seeGenes(s, e.virus); // the rules' chips: what you fight, you've seen (genome.mjs)
  logFight(s, e.virus); // the Codex tab: a boss fought, a mutation and what it rode on (genome.mjs)
  prepareTicks(s); // the interrupt's ticks on every part, and a boss's rule (interrupt.mjs; not a crew boss or a breach)
  tellStart(s); // a solo fight's tells (tells.mjs)
}

// Fast kills: beat your own usual pace (cycles per 100 Integrity of virus, kept per class) by a
// quarter and the kill pays a quarter more XP. Measured against you, so every class can earn it.
export const PARTY_XP = 0.1; // a party splits the kill's XP, plus 10% per extra player
export const FAST = { share: 0.75, bonus: 0.25, after: 5, weight: 0.2 };
function fastKill(s, e) {
  const total = e.virus.parts.reduce((n, p) => n + p.max, 0);
  if (!total || !e.cycle) return false;
  const rate = (e.cycle / total) * 100;
  const p = ((s.par ||= {})[classOf(s)] ||= { n: 0, rate });
  const fast = p.n >= FAST.after && rate <= p.rate * FAST.share;
  p.rate = p.n ? p.rate + (rate - p.rate) * FAST.weight : rate;
  p.n++;
  return fast;
}
function payKill(s, e, base, why) {
  // A party splits the kill's XP, with a small bonus per extra player (PARTY_XP). Members who dropped in
  // (consortium guests) take their share of the damage they dealt, so joining late pays only for what
  // you did; you and your own crew split the rest evenly.
  const n = e.party || 1, pool = xpFor(s, e.virus.level, base) * (e.virus.elite ? ELITE.xp : 1) * (1 + PARTY_XP * (n - 1));
  const dealt = e.virus.dealt || {}, total = Object.values(dealt).reduce((a, b) => a + b, 0);
  const guests = n > 1 ? e.guests || [] : [];
  const guestShare = total ? guests.reduce((a, g) => a + (dealt[g] || 0), 0) / total : 0;
  const xp = Math.max(1, Math.round((pool * (1 - guestShare)) / Math.max(1, n - guests.length)));
  const bonus = e.fast ? Math.max(1, Math.round(xp * FAST.bonus)) : 0;
  if (bonus) emit(s, 'fast-kill', `Fast kill: ${e.cycle} cycles. +${bonus} XP.`, { amount: bonus, cycles: e.cycle });
  const hot = e.virus.strain && e.virus.strain === hotStrain(s) ? Math.max(1, Math.round(xp * HOT.bonus)) : 0;
  if (hot) emit(s, 'hot-kill', `Hot strain: +${hot} XP.`, { amount: hot });
  // Rested (WoW): XP banked while you were safely away doubles a kill until it runs out.
  // Reading tells (tells.mjs): each one answered by a command adds to the kill.
  const reads = e.metrics?.reads || 0, read = reads ? Math.max(1, Math.round(xp * Math.min(TELL.read.xpMax, TELL.read.xp * reads))) : 0;
  if (read) emit(s, 'read-xp', `Read ${reads} ${reads === 1 ? 'tell' : 'tells'}: +${read} XP.${e.cleanRead ? ' You read every tell, so the loot rolls once more.' : ''}`, { amount: read, reads, clean: !!e.cleanRead });
  const rested = Math.floor(Math.min(s.rested || 0, xp)); // whole XP only; the fraction waits in s.rested
  if (rested) { s.rested -= rested; emit(s, 'rested', `Rested: +${rested} XP.`, { amount: rested }); }
  // LOWLIGHT Kit (2): the kill after a delivered contract pays more (s.killXp, a percentage; setDeliver).
  const kit = s.killXp ? Math.max(1, Math.round((xp * s.killXp) / 100)) : 0;
  if (kit) { emit(s, 'set-xp', `${s.killXpFrom || 'Set bonus'}: +${kit} XP.`, { amount: kit }); delete s.killXp; delete s.killXpFrom; }
  const obj = bonusXp(e, xp); // a met objective (objectives.mjs)
  if (obj) emit(s, 'objective-xp', `Objective: +${obj} XP.`, { amount: obj });
  gainXp(s, xp + bonus + hot + read + rested + kit + obj, why, 'fight', e.xpKind || 'fight'); // xpKind: what it tallies as (a held server's respawns: build, netrooms.mjs)
}

// A room fight won on the network (netrooms.mjs, GAME_RULES.md "Runs: servers as rooms"): what the kill pays besides its XP. wild: SPRAWL-00
// or a rogue server, straight into your bank as their folders always paid; otherwise a traced server's, into the run's
// pack (banked when you jack out, lost if you're disconnected), like a guard's drops. guard: a guard post, an elite, a
// boss: an elite's odds (a boss with a sure drop rolls none: bossLoot). rare: a ★ rare spawn's. family: the lineage the kill counts as (contracts, leads, code). Returns what a Pit's
// second roll needs.
// A kill's rare Exploit (data.mjs SPARE_EXPLOIT: what its daemon drop became), into your pack on a run.
function packExploit(s, path, who) {
  s.run.pack.push({ path, name: 'exploit.bin', kind: 'code', size: '8k', material: 'exploit', amount: 1 });
  emit(s, 'code', `${who} dropped an Exploit. In your pack until you jack out.`, { gains: { exploit: 1 }, pack: true });
}
export function roomKill(s, e, { wild = false, sprawl = false, guard = false, bounty = null, family = e.virus.family, loc = null, rare = false } = {}) {
  const v = e.virus, lvl = v.level;
  contractKill(s, { family, zone: sprawl, bounty, level: lvl, strain: v.strain, virus: v.family }); // virus: its own family (a Grind job's), family its lineage
  eventKill(s, family); // an outbreak's source (events.mjs chains)
  huntKill(s, family);
  // SPRAWL-00's strays trace one of its ? servers (floors.mjs), falling with the level gap like XP (not guards or bosses).
  // Everywhere else a trace comes from first clears (netrooms.mjs), the vault's record and the rest (hidden.mjs).
  if (sprawl && !guard && FAMILIES[family]) addLead(s, family, leadOf(s, lvl, !!v.strain && v.strain === hotStrain(s)), '', { id: CONFIG.zone.id });
  if (wild) {
    gainCode(s, codeFrom(s, family, lvl, 'home'), 'Code: ');
    const ctx = { kind: sprawl ? 'sprawl' : 'rogue', id: loc?.rogue?.kind, layer: layerOf(loc?.depth || 1), floor: loc?.depth || null, family, strain: v.strain, elite: !!v.elite || guard, boss: v.boss || null, rare, rolls: bounty ? LOOT.rolls.bounty : undefined };
    const item = rollDrop(s, ctx, lvl);
    if (item) addItem(s, item);
    killSets(s, { v, rare, floor: loc?.depth || 1 }); // set pieces (sets.mjs), straight into your stash
    nativeDrop(s, e);
    if (rand(s) < SPARE_EXPLOIT.home) gainCode(s, { exploit: 1 }, 'Exploit recovered: ');
    return { more: () => rollDrop(s, { ...ctx, strain: null }, lvl) };
  }
  if (!s.run) return {};
  const tag = `${e.room}/#${e.seed}-${s.serial}`, src = guard ? 'guard' : 'home';
  // A Honeytoken on the server (sockets.mjs): its kills roll for loot once more.
  for (let i = programsOn(loc).includes('honeytoken') ? 2 : 1, n = 0; n < i; n++) {
    const item = rollDrop(s, { kind: guard ? 'guard' : 'home', id: e.key, layer: layerOf(loc?.depth || 1), floor: loc?.depth || null, family: loc?.family || family, elite: !!v.elite, boss: v.boss || null, rare }, lvl);
    if (item) { s.run.pack.push({ path: `${tag}/drop${n || ''}`, name: 'protocol.bin', kind: 'gear', size: '32k', item }); emit(s, 'drop', `${v.name} dropped ${itemLabel(item)}: ${statLine(item.stats)}. In your pack until you jack out.`, { item, pack: true }); }
  }
  killSets(s, { v, key: e.key, guard, rare, floor: loc?.depth || 1, layer: layerOf(loc?.depth || 1), pack: true, path: tag }); // set pieces (sets.mjs)
  nativeDrop(s, e, true);
  if (rand(s) < (guard ? SPARE_EXPLOIT.guard : SPARE_EXPLOIT.home)) packExploit(s, `${tag}/xp`, v.name);
  const gains = codeFrom(s, family, lvl, src);
  if (hasSpecial(loc, 'rich')) for (const m of Object.keys(gains)) if (m !== 'exploit') gains[m] *= SPECIAL.code; // a Rich server's kills drop twice the code (specials.mjs)
  for (const [m, n] of Object.entries(gains)) s.run.pack.push({ path: `${tag}/code-${m}`, name: `${m}.code`, kind: 'code', size: '8k', material: m, amount: n });
  if (Object.keys(gains).length) emit(s, 'code', `${v.name} dropped ${Object.entries(gains).map(([m, n]) => `${n} ${MATERIALS[m].name}`).join(' and ')}. In your pack until you jack out.`, { gains, pack: true });
  return {};
}

export function finish(s, result) {
  const e = s.encounter;
  if (!active(s)) return;
  hooks.crewEnd?.(s, result);
  e.phase = result;
  e.queue = null;
  e.plan = [];
  e.paused = false;
  const d = defender(s);
  let lead = 0;
  // Lead falls with the level gap like XP does: a grey kill (10+ levels under you) traces nothing.
  if ((e.mode === 'home' || e.zone) && result === 'victory') lead = Math.round(CONFIG.leadBase * Math.min(1, xpScale(e.virus.level - hackerLevel(s))) * (e.virus.strain && e.virus.strain === hotStrain(s) ? 1 + HOT.bonus : 1));

  if (result === 'victory') { (s.pace ||= { kills: 0, ms: 0 }).kills++; e.fast = fastKill(s, e); } // for kills an hour (System page)
  // Every tell in the fight read (two or more said, each answered by a command, none landed): a clean read (tells.mjs).
  if (result === 'victory' && e.metrics.tells) { const xs = Object.values(e.metrics.tells), said = xs.reduce((n, x) => n + x.said, 0); e.cleanRead = said >= TELL.read.min && xs.every((x) => x.read >= x.said && !x.landed); }
  if (result === 'victory' && e.virus.boss) bossLoot(s, e.virus.boss, e.virus.level); // its sure item and its uniques' roll
  if (result === 'victory') winGenes(s, e.virus); // a mutation's rule decodes at two kills (genome.mjs)
  if (result === 'victory') logWin(s, e.virus); // the Codex tab's kill counts (genome.mjs)
  Object.assign(e.metrics, { cycles: e.cycle, endIntegrity: d.integrity, endCredits: s.server.credits, lead, result });
  s.reports.push(structuredClone(e.metrics));
  if (s.reports.length > 50) s.reports.shift();
  fightOver(s, e, result); // what the fight did toward an achievement (achievements.mjs): counts and one-fight feats, nothing else
  // A breach node (breach.mjs): the kill's XP here. The draft, the pack and the map are the breach's.
  if (e.breach) {
    emit(s, result === 'victory' ? 'victory' : 'crashed', result === 'victory' ? `${e.virus.name} neutralized in ${e.cycle} cycles. ${!e.metrics.attackDamage ? 'Nothing got through.' : `Took ${e.metrics.attackDamage} damage.`} Signal ${d.integrity}/${d.max}.` : `${e.virus.name} burned your Signal to zero.`, { mode: 'breach' });
    if (result === 'victory') payKill(s, e, XP.guard * (e.breachXp || 1), `${e.virus.name} neutralized`); // a campaign breach pays its own (breach.mjs)
    hooks.breachEnd?.(s, result);
    return;
  }
  // A server room (floorplan.mjs, the rooms playtest): the kill's XP here. Progress, loot and the pack are the room's.
  if (e.rooms) {
    if (result === 'escaped') emit(s, 'escaped', 'Upload complete. The archive is gone.', { mode: 'rooms', cycles: e.cycle }); // a runner got away (the Exfil: its upload completed)
    else if (result === 'victory' && e.objective?.kind === 'uptime') emit(s, 'victory', `Uptime held for ${e.cycle} cycles. Signal ${d.integrity}/${d.max}.`, { mode: 'rooms' });
    else emit(s, result === 'victory' ? 'victory' : 'crashed', result === 'victory' ? `${e.virus.name} neutralized in ${e.cycle} cycles. ${!e.metrics.attackDamage ? 'Nothing got through.' : `Took ${e.metrics.attackDamage} damage.`} Signal ${d.integrity}/${d.max}.` : `${e.virus.name} burned your Signal to zero.`, { mode: 'rooms' });
    if (result === 'victory') { objectiveBonus(s, e); payKill(s, e, e.roomsXp || 1, `${e.virus.name} neutralized`); } // a met objective's components (objectives.mjs)
    hooks.roomEnd?.(s, result);
    return;
  }
  // The rogue server: a kill pays like a home kill, straight away (nothing to lose in a pack),
  // and the folder fills again a while later.
  if (e.zone) {
    const now = hooks.now?.() ?? Date.now();
    const wild = e.wild && findLocation(s, e.wild); // a rogue server's folder, or SPRAWL-00's
    const spawn = wild || e.process ? null : s.zone?.spawns?.[e.room]; // a rotation's process (root.mjs) isn't SPRAWL's
    // A named contract target you lost to stays put, so the contract can still be finished.
    const keep = (spawn?.bounty || spawn?.boss) && result !== 'victory'; // a boss you lost to stays too
    // A named target that beat you twice is worn down too: it drops back to v1.
    if (keep && (spawn.losses = (spawn.losses || 0) + 1) >= 2 && spawn.grade > 1) { delete spawn.grade; emit(s, 'info', `${spawn.name} is worn down and drops back to v1.`); }
    if (spawn && !keep) { spawn.alive = false; spawn.respawnAt = now + (spawn.boss ? CONFIG.zone.bossRespawnMs : CONFIG.zone.respawnMs); }
    // A Pit elite that beats you (or that you run from) moves on: no retrying it until it's gone.
    const elite = wild && !wild.farm && e.virus.elite && result !== 'victory' && wild.spawns?.[e.room]; // the farm's are a crew's job: they stay
    if (elite?.alive && elite.elite) { elite.alive = false; elite.respawnAt = now + ELITE.goneMs; emit(s, 'info', `${elite.name} moved on. The folder fills again in about ${Math.round(ELITE.goneMs / 60000)} minutes.`); }
    const named = spawn?.bounty && !keep ? spawn.name : null;
    if (named) delete spawn.bounty;
    if (result === 'victory') {
      emit(s, 'victory', `${e.virus.name} neutralized in ${e.cycle} cycles. ${!e.metrics.attackDamage ? 'Nothing got through.' : `Took ${e.metrics.attackDamage} damage.`} Signal ${d.integrity}/${d.max}.`, { mode: 'run' });
      contractKill(s, { family: e.virus.family, zone: true, bounty: named, level: e.virus.level, strain: e.virus.strain });
      eventKill(s, e.virus.family); // an outbreak's source (events.mjs chains)
      huntKill(s, e.virus.family);
      payKill(s, e, XP.home, `${e.virus.name} neutralized`);
      gainCode(s, codeFrom(s, e.virus.family, e.virus.level, 'home'), 'Code: ');
      const ctx = { kind: wild || e.process ? 'rogue' : 'sprawl', id: wild?.rogue?.kind, layer: layerOf(wild?.depth || findLocation(s, e.process)?.depth || 1), family: e.virus.family, strain: e.virus.strain, elite: !!e.virus.elite || !!e.virus.boss, boss: e.virus.boss || null, rolls: named ? LOOT.rolls.bounty : undefined };
      const item = rollDrop(s, ctx, e.virus.level);
      if (item) addItem(s, item);
      nativeDrop(s, e); // network.mjs: its own dice
      if (rand(s) < SPARE_EXPLOIT.home) gainCode(s, { exploit: 1 }, 'Exploit recovered: ');
      if (lead && !wild && !e.process) addLead(s, e.virus.family, lead, '', { id: CONFIG.zone.id }); // SPRAWL-00's strays trace its ? servers
      if (wild) rogueKill(s, wild, e.room, now, () => { const more = rollDrop(s, { ...ctx, strain: null }, e.virus.level); if (more) addItem(s, more, 'The Pit gives up more: '); });
      if (e.process) processWon(s, e); // root access grows (root.mjs)
      hooks.runWon?.(s);
    } else {
      emit(s, 'crashed', `${e.virus.name} burned your Signal to zero.`, { mode: 'run' });
      disconnect(s, 'Signal lost');
    }
    return;
  }
  if (e.mode === 'run') {
    if (result === 'victory') {
      const loc = findLocation(s, s.run?.loc);
      if (loc) { loc.state.cleared[e.room] = true; clearedFor(s, loc); } // a faction's server: they like that (factions.mjs)
      // The Resident (run.mjs /core): beat it and the server is yours.
      if (loc && e.virus.boss === 'resident' && !loc.takenOver) { loc.resident = null; strikeServer(s, loc, 'takeover'); contractTakeover(s, loc); }
      emit(s, 'victory', `${e.virus.name} down. ${e.room} is open. ${!e.metrics.attackDamage ? 'Nothing got through.' : `Took ${e.metrics.attackDamage} damage.`} Signal ${d.integrity}/${d.max}.`, { mode: 'run' });
      contractKill(s, { family: e.virus.family, zone: false, level: e.virus.level, strain: e.virus.strain });
      eventKill(s, e.virus.family); // an outbreak's source (events.mjs chains)
      payKill(s, e, XP.guard, `${e.virus.name} down`);
      // A guard's drop goes in your pack: it's yours once you jack out.
      const item = s.run && rollDrop(s, { kind: 'guard', id: e.key, layer: layerOf(loc?.depth || 1), family: loc?.family, boss: e.virus.boss || null }, e.virus.level);
      if (item) {
        s.run.pack.push({ path: `${e.room}/#drop-${e.seed}-${s.serial}`, name: 'protocol.bin', kind: 'gear', size: '32k', item });
        emit(s, 'drop', `${e.virus.name} dropped ${itemLabel(item)}: ${statLine(item.stats)}. In your pack until you jack out.`, { item, pack: true });
      }
      if (s.run) killSets(s, { v: e.virus, key: e.key, guard: true, floor: loc?.depth || 1, layer: layerOf(loc?.depth || 1), pack: true, path: `${e.room}/#${e.seed}-${s.serial}` }); // set pieces (sets.mjs)
      if (s.run) nativeDrop(s, e, true); // network.mjs: its own dice, into your pack
      if (s.run && rand(s) < SPARE_EXPLOIT.guard) packExploit(s, `${e.room}/#xp-${e.seed}-${s.serial}`, e.virus.name);
      // Guards drop their location's code, into your pack too.
      const gains = s.run && codeFrom(s, loc?.family, e.virus.level, 'guard');
      for (const [m, n] of Object.entries(gains || {})) s.run.pack.push({ path: `${e.room}/#code-${m}-${e.seed}-${s.serial}`, name: `${m}.code`, kind: 'code', size: '8k', material: m, amount: n });
      if (gains && Object.keys(gains).length) emit(s, 'code', `${e.virus.name} dropped ${Object.entries(gains).map(([m, n]) => `${n} ${MATERIALS[m].name}`).join(' and ')}. In your pack until you jack out.`, { gains, pack: true });
      hooks.runWon?.(s);
    } else {
      emit(s, 'crashed', `${e.virus.name} burned your Signal to zero.`, { mode: 'run' });
      // A Resident that beats you grows: a level more for 6 hours, up to three.
      const home = e.virus.boss === 'resident' && findLocation(s, s.run?.loc);
      if (home) { const now = hooks.now?.() ?? Date.now(), had = home.resident && now - home.resident.at < 6 * 3600000 ? home.resident.bonus : 0; home.resident = { bonus: Math.min(3, had + 1), at: now }; emit(s, 'warning', `The Resident of ${home.name} beat you. It's a level stronger for the next 6 hours.`, { location: home.id }); }
      disconnect(s, 'Signal lost');
    }
    return;
  }
  const clean = !e.metrics.attackDamage;
  emit(s, result, result === 'victory' ? `${e.virus.name} neutralized in ${e.cycle} cycles. ${clean ? 'Nothing got through.' : `Took ${e.metrics.attackDamage} damage.`} Server ${s.server.integrity}/${s.server.max}.` : 'SERVER CRASHED. The fight is over.', { invader: !!e.invader });
  const inv = e.invader && s.invasion?.id === e.invader ? s.invasion : null;
  const hid = inv?.hidden ? hiddenNode(s, inv.hidden) : null; // an invader from a server you haven't found
  if (result === 'victory') {
    contractKill(s, { family: e.virus.family, zone: false, level: e.virus.level, strain: e.virus.strain });
    eventKill(s, e.virus.family); // an outbreak's source (events.mjs chains)
    if (!hid) huntKill(s, e.virus.family);
    payKill(s, e, XP.home, `${e.virus.name} neutralized`);
    gainCode(s, codeFrom(s, e.virus.family, e.virus.level, 'home'), 'Code: ');
    const item = rollDrop(s, { kind: 'home', family: e.virus.family, strain: e.virus.strain, layer: e.virus.grade || 1, elite: !!e.virus.elite, boss: e.virus.boss || null }, e.virus.level);
    if (item) addItem(s, item);
    nativeDrop(s, e); // network.mjs: its own dice
    if (rand(s) < SPARE_EXPLOIT.home) gainCode(s, { exploit: 1 }, 'Exploit recovered: ');
    if (inv) invaderDown(s, inv); // the next of a pack steps up, or the bounty (invasion.mjs)
    if (e.member || e.raid || e.roamer) consortiumWon(s, e); // a fight for the consortium (consortium.mjs)
    if (e.fleet) fleetWon(s, e);
    if (e.event) eventWon(s, e); // a courier or a bounty (events.mjs)
    if (e.retake || e.hubClear) hubWon(s, e);
  } else {
    // The invader stays at the wall, as worn down as you left it.
    if (inv) { const v = virusIntegrity(s); inv.hp = Math.max(0.05, v.max ? v.current / v.max : 1); }
    crashServer(s);
  }
  // Beating an invader from an unknown server traces most of the way back to it.
  if (lead && hid) hiddenLead(s, hid, HIDDEN.winLead + (lead - CONFIG.leadBase));
  else if (lead && inv) addLead(s, e.virus.family, lead, 'Its route: ', findLocation(s, inv.from)); // the road back: a ? next to the server it came from
}

// ---------- crashes and invasions (engine side; the network lives in invasion.mjs) ----------
// A crash reboots the server at half Integrity and puts it in Degraded mode for 10 real
// minutes: the wall is down (invaders wait, none set out), installs pause, and the server earns
// no XP. You can still fight, explore and level. The clock starts at the next network tick.
// ms, since: a longer reboot that started at a known time (a crash while you were away).
export function crashServer(s, ms = CONFIG.degradedMs, since = null) {
  s.server.integrity = Math.max(1, Math.round(s.server.max * CONFIG.reboot));
  s.degraded = { since, until: since == null ? null : since + ms, ms };
  syncRunSignal(s);
  standingCrash(s);
  emit(s, 'degraded', `REBOOTED at ${s.server.integrity}/${s.server.max}. Degraded for ${ms >= 3600000 ? `${ms / 3600000} hours` : `${ms / 60000} minutes`}: −${Math.round(rebootSick(s) * 100)}% max Signal and damage.`);
}
// When the next invader sets out: some logged-on minutes from now.
export function scheduleInvasion(s) {
  const [lo, hi] = CONFIG.invasion.everyMs;
  (s.net ||= { wall: null, next: null }).next = Math.round(lo + rand(s) * (hi - lo));
}
export function endInvasion(s, message, detail = {}) {
  const inv = s.invasion;
  s.invasion = null;
  scheduleInvasion(s);
  if (message) emit(s, 'invasion-cleared', message, { invader: inv?.id, ...detail });
}

// ---------- parsing and validation ----------

function findPart(s, text) {
  const q = squash(text);
  if (!q) return null;
  const living = livingParts(s);
  const exact = living.filter((p) => squash(p.id) === q || squash(p.name) === q);
  const matches = exact.length ? exact : living.filter((p) => squash(p.id).startsWith(q) || squash(p.name).startsWith(q));
  return matches.length === 1 ? matches[0] : null;
}

// Typos: edit distance, for "did you mean". Small words only, so it's cheap.
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] ? d[i - 2][j - 2] + 1 : Infinity);
  return d[a.length][b.length];
}
// A command that isn't one, with no fight running: a fight order says so; a run command says where it
// works; anything else gets a "did you mean" (clickable in the notice).
const HOME_WORDS = ['connect', 'jack', 'mail', 'repair', 'top', 'install', 'uninstall', 'cancel', 'load', 'unload', 'deconstruct', 'craft', 'filter', 'firewall', 'relay', 'use', 'detach', 'attach', 'encounter', 'status', 'daemon', 'speed', 'consortium', 'market', 'buy', 'sell', 'event', 'config', 'map', 'server', 'loadout', 'system', 'help', 'mail', 'equip', 'unequip', 'whoami'];
const RUN_WORDS = ['ls', 'cd', 'cat', 'pull', 'unlock', 'attack', 'engage', 'slip', 'spoof', 'tap', 'sweep'];
function unknownAtHome(s, text) {
  const [w, ...rest] = text.split(' ');
  if (ABILITIES[w] || ['spike', 'hold', 'cancel', spikeWord(s)].includes(w)) return warn(s, 'No fight running.');
  if (RUN_WORDS.includes(w)) return warn(s, `${w} works on a run: connect to a server first.`);
  const near = closest(w, [...new Set(HOME_WORDS)]);
  if (near) { const fix = [near, ...rest].join(' '); return warn(s, `Unknown command "${w}". Did you mean ${fix}?`, { suggest: fix }); }
  return warn(s, `Unknown command "${w}". Type help for the list.`);
}
// The closest of `options` to `word`, if it's close enough to be a typo (or `word` starts it).
export function closest(word, options) {
  const q = squash(word);
  if (!q) return null;
  let best = null, bd = Infinity;
  for (const o of options) { const d = squash(o).startsWith(q) ? 0.5 : distance(q, squash(o)); if (d < bd) { bd = d; best = o; } }
  return bd <= Math.max(1, Math.min(2, Math.floor(q.length / 3))) ? best : null;
}
// What the player probably meant by a command that didn't parse (null: no good guess).
function suggestFor(s, words) {
  const bar = Object.values(keyMap(s)).filter((id) => usable(s).includes(id));
  const parts = livingParts(s);
  const target = (rest) => { if (!rest) return ''; const p = findPart(s, rest) || parts.find((x) => x.id === closest(rest, parts.map((y) => y.id)) || x.name === closest(rest, parts.map((y) => y.name))); return p ? ' ' + partKey(s, p) : null; };
  // "spikefrag2": a skill and a part with the space missing.
  for (const id of bar) for (const w of id === 'spike' ? ['spike', spikeWord(s)] : [id]) if (words[0].startsWith(w) && words[0].length > w.length) { const t = target(words[0].slice(w.length) + words.slice(1).join('')); if (t) return (id === 'spike' ? spikeWord(s) : id) + t; }
  const id = closest(words[0], bar);
  if (!id) { const t = words.length === 1 ? target(words[0]) : null; return t ? spikeWord(s) + t : null; } // just a part: Spike it
  if (id === 'spike') { const t = target(words.slice(1).join(' ')); return spikeWord(s) + (t === null ? ' ' : t); }
  if (ABILITIES[id]?.target === 'none' || ABILITIES[id]?.target === 'attack') return id;
  const t = target(words.slice(1).join(' '));
  return t === null ? id + ' ' : id + t;
}

// Accepts ids ("rate-limit"), two words ("rate limit"), or a key number ("4").
function abilityFrom(s, words) {
  const keys = keyMap(s);
  if (keys[words[0]]) return { id: keys[words[0]], used: 1 };
  if (words[0] === spikeWord(s)) return { id: 'spike', used: 1 }; // your class's name for key 1
  if (ABILITIES[words[0]]) return { id: words[0], used: 1 };
  if (words[1] && ABILITIES[words[0] + '-' + words[1]]) return { id: words[0] + '-' + words[1], used: 2 };
  return null;
}

export function parse(s, input) {
  const text = normalize(input);
  const words = text.split(' ');
  const found = abilityFrom(s, words);
  const bar = Object.entries(keyMap(s)).map(([k, id]) => `${k} ${id === 'spike' ? spikeWord(s) : id}`).join(' · ');
  if (!found) { const suggest = suggestFor(s, words); return { error: `Unknown command "${words[0]}".${suggest ? ` Did you mean ${suggest.trim()}?` : ` Your keys: ${bar}.`}`, suggest }; }
  const ability = found.id;
  const a = ABILITIES[ability];
  if (!usable(s).includes(ability)) return { error: `${a.name} isn't on your bar. Your keys: ${bar}.` };
  const rest = words.slice(found.used);
  const arg = rest.join(' ');
  // In a crew, Patch takes a crewmate's name and heals them instead (crew.mjs hooks.crewAllies).
  if ((ability === 'patch' || a.ally) && arg) return allyOf(s, arg) ? { ability, ally: arg } : { error: `${arg} isn't in this fight with you.` };
  if (a.target === 'none') return arg ? { error: `${a.name} doesn't take a target.` } : { ability };
  if (a.target === 'attack' && !arg) {
    const soonest = attackers(s).sort((x, y) => x.attack.due - y.attack.due)[0];
    return soonest ? { ability, target: soonest.id } : { error: 'Nothing left to interrupt.' };
  }
  if (!arg) { // no part named: the last part you hit, else the one that attacks soonest, else any
    const t = lastTarget(s) || soonestAttacker(s) || livingParts(s)[0];
    return t ? { ability, target: t.id } : { error: 'Nothing left to hit.' };
  }
  const target = findPart(s, arg);
  if (!target) {
    const keyOf = (p) => (packed(s, s.encounter?.virus, p) ? partKey(s, p) : p.id), keys = livingParts(s).map(keyOf); // a packed part by its shown name
    const named = livingParts(s).find((p) => p.name === closest(arg, livingParts(s).map((x) => x.name)));
    const near = closest(arg, keys) || (named ? keyOf(named) : null);
    const suggest = near ? `${ability === 'spike' ? spikeWord(s) : words.slice(0, found.used).join(' ')} ${near}` : null;
    return { error: `No part called "${arg}".${suggest ? ` Did you mean ${suggest}?` : ` Targets: ${keys.join(', ')}.`}`, suggest };
  }
  return { ability, target: target.id };
}

export function validate(s, intent) {
  const e = s.encounter;
  const a = ABILITIES[intent.ability];
  if (e?.junk === intent.ability) return null; // the junked key: firing it clears the junk (mechanics.mjs)
  const why = mechValidate(s, intent); // Sandboxed: no direct hits
  if (why) return why;
  const wait = intent.ignoreCooldown ? 0 : readyIn(s, intent.ability);
  if (wait) return `${a.name} is ready in ${wait} ${wait === 1 ? 'cycle' : 'cycles'}.`;
  if (a.target !== 'none' && !alive(part(s, intent.target))) return 'That part is already broken.';
  if (intent.target && frozenNow(s, part(s, intent.target))) { const p = part(s, intent.target), n = p.thawAt - e.cycle + 1; return `The ${p.name} is frozen. It thaws in ${n} ${n === 1 ? 'cycle' : 'cycles'}.`; }
  if (a.proc === 'stripped' && procOpen(s, a.proc) && e.procs.stripped.part && e.procs.stripped.part !== intent.target && alive(part(s, e.procs.stripped.part))) return `${a.name} is usable only on the ${part(s, e.procs.stripped.part).name}, the part you just stripped.`;
  if (a.proc && !procOpen(s, a.proc)) return `${a.name} isn't usable yet. ${a.proc === 'stripped' ? 'Break a part\'s last ◆ first.' : a.proc === 'struck' ? 'It becomes usable after an attack reaches you.' : 'It becomes usable after an attack misses you or is delayed.'}`;
  if (a.once && e.once?.[intent.ability]) return `${a.name} is used up for this fight.`;
  if (a.bare && part(s, intent.target).armor > 0) {
    const p = part(s, intent.target);
    return `${a.name} needs a part with no armor. The ${p.name} has ${p.armor} ◆.`;
  }
  if (intent.ability === 'crack' && !part(s, intent.target).armor) return `${part(s, intent.target).name} has no armor to crack.`;
  if (['suspend', 'quarantine', 'throttle', 'jam'].includes(intent.ability) && !part(s, intent.target).attack) return `${part(s, intent.target).name} has no attack.`;
  if (a.recall && !helpersOn(s, part(s, intent.target)).length) return `You have no helper on ${part(s, intent.target).name}.`;
  if (['detonate', 'propagate', 'keepalive'].includes(intent.ability) && !burnsOn(s, part(s, intent.target)).filter((b) => intent.ability !== 'detonate' || b.id !== 'implant').length) return `No burns on ${part(s, intent.target).name}${intent.ability === 'detonate' && burnsOn(s, part(s, intent.target)).length ? ' but the Rootkit Implant (it burns until the part breaks)' : ''}.`;
  if (['reroute', 'cron-storm'].includes(intent.ability) && !e.helpers.length) return 'No helpers running.';
  if (intent.ability === 'kill-switch' && !e.helpers.length) return 'No helpers running.';
  if (intent.ability === 'sigint') { const why = e.virus.raid ? sigintCheck(s) : tellSigintCheck(s); if (why) return why; } // a solo cast: only in its window (tells.mjs)
  const check = classCheck(intent.ability);
  if (check) { const why = check(s, intent); if (why) return why; }
  if (intent.ally && !allyOf(s, intent.ally)) return `${intent.ally} isn't standing.`;
  if (intent.ability === 'patch') {
    const to = intent.ally ? allyOf(s, intent.ally) : s;
    if (!to) return `${intent.ally} isn't standing.`;
    if (defender(to).integrity >= defender(to).max) return intent.ally ? `${intent.ally} is at full Signal.` : 'Already at full health.';
  }
  if (intent.ability === 'failover' && defender(s).integrity >= defender(s).max) return 'Failover needs missing health.';
  return null;
}

// ---------- commands ----------

export function command(s, input, now = hooks.now?.() ?? Date.now()) {
  const first = s.serial;
  if (typeof input !== 'string' || !input.trim() || input.length > 160) {
    warn(s, 'Enter a command of 1–160 characters.');
    return since(s, first);
  }
  const text = normalize(input);
  const e = s.encounter;
  tickServices(s, now);

  if (text === 'status') {
    emit(s, 'info', `Server ${s.server.integrity}/${s.server.max}, ${s.server.credits} credits. ${active(s) ? `Cycle ${e.cycle}; queued: ${e.queue?.text || 'auto'}.` : 'No active fight.'}`);
  } else if (text === 'developer reboot') {
    if (active(s)) warn(s, 'Developer reboot works outside combat only.');
    else {
      if (s.run) disconnect(s, 'developer reboot');
      s.server.integrity = s.server.max;
      s.server.credits = Math.max(s.server.credits, 160);
      s.degraded = null;
      syncRunSignal(s);
      emit(s, 'info', 'Developer reboot: Integrity and test credits restored.');
    }
  } else if (text === 'developer refill') { // Signal and Integrity to full, in a fight or out (the test bench's panel)
    s.server.integrity = s.server.max;
    s.signal = null; // full: whatever your max is
    if (s.run) s.run.integrity = s.run.max;
    s.degraded = null;
    if (s.run) s.run.integrity = s.run.max = maxSignal(s);
    emit(s, 'info', 'Developer: Signal and Integrity full.');
  } else if (/^developer credits \d+$/.test(text)) {
    const n = Math.min(1e6, Number(text.split(' ')[2]));
    s.server.credits += n;
    emit(s, 'info', `Developer: +${n} credits.`);
  } else if (/^developer fight (random|[a-z]+|part:[a-z0-9-]+)( \d+)?( \d+)?$/.test(text)) {
    // developer fight <family|random> [level] [seed]: a home fight at that level (your level by default), at once.
    // developer fight part:<id> [level]: one with that basic or third part, at the level it opens (as ?playtest=part:<id>).
    const [, , what, lv, sd] = text.split(' '), L = Math.max(1, Math.min(LOADOUT.maxLevel, Number(lv) || hackerLevel(s))), seed = Number(sd) >>> 0 || 1;
    const exeOn = /\.exe$/.test(what), pid = what.startsWith('part:') ? what.slice(5).replace(/\.exe$/, '') : null, home = pid && Object.entries(FAMILIES).find(([, f]) => f.parts.some((x) => x.id === pid)); // part:<id>.exe: its .exe build
    if (active(s) || s.run) warn(s, active(s) ? 'Finish the fight first.' : 'Jack out first: developer fight is a fight at home.');
    else if (pid && !home) warn(s, `No part called ${pid}.`);
    else if (!pid && what !== 'random' && !FAMILIES[what]) warn(s, `developer fight <random|${Object.keys(FAMILIES).join('|')}|part:<id>> [level] [seed]`);
    else {
      if (home) { const spec = home[1].parts.find((x) => x.id === pid), PL = lv ? L : Math.max(spec.from || 1, 3); selectEncounter(s, 'random', seed, { level: PL, family: home[0], mutation: null, ...(exeOn ? { exe: [pid] } : {}), ...(spec.pool === 'third' ? { genes: partGenesFor(home[0], spec, PL), basic: 'pulse' } : { basic: pid }) }); }
      else selectEncounter(s, 'random', seed, { level: L, ...(what !== 'random' ? { family: what } : {}), mutation: null });
      engage(s);
    }
  } else if (/^developer parts( [a-z]+( [\d.]+){1,2}| profile [a-z]+ (steady|ramp|burst) [\d.]+)?$/.test(text)) { // the parts plan's numbers (parts.mjs PARTS): show them and the mix, or set one
    const [, , k, a, b, c] = text.split(' '), key = Object.keys(PARTS).find((x) => x.toLowerCase() === k);
    if (k && !key) warn(s, `No parts number ${k}. Try: ${Object.keys(PARTS).filter((x) => x !== 'native' && x !== 'count').join(', ')}.`);
    else if (key === 'profile') { if (!PARTS.profile[a]) warn(s, `No profile for ${a}. Try: ${Object.keys(PARTS.profile).join(', ')}.`); else { PARTS.profile[a][b] = Number(c); emit(s, 'info', `Developer: the ${a} profile's ${b} is ${c}.`); } } // developer parts profile <family> <steady|ramp|burst> <value>
    else if (['weight', 'native', 'roles', 'ratchet'].includes(key)) warn(s, `${key} is set by name in parts.mjs.`);
    else if (key === 'pressure') { if (b == null) warn(s, 'pressure is a range: developer parts pressure <low> <high>.'); else { PARTS.pressure = [Number(a), Number(b)]; emit(s, 'info', `Developer: parts pressure is ${a} to ${b}.`); } }
    else if (key && Array.isArray(PARTS[key])) { if (b == null) warn(s, `${key} is a table: developer parts ${k} <level> <value>.`); else { const L = Number(a), row = PARTS[key].find(([x]) => x === L); if (row) row[1] = Number(b); else PARTS[key] = [...PARTS[key], [L, Number(b)]].sort((x, y) => x[0] - y[0]); emit(s, 'info', `Developer: parts ${key} from level ${L} is ${b}.`); } }
    else if (key) { PARTS[key] = key === 'on' ? a !== '0' : Number(a); emit(s, 'info', `Developer: parts ${key} is ${PARTS[key]}.`); }
    const L = hackerLevel(s), m = partsMix(L);
    const nums = Object.entries(PARTS).filter(([x]) => x !== 'native').map(([x, v]) => `${x} ${v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(v).map(([g, w]) => `${g}:${w && typeof w === 'object' ? Object.values(w).join('/') : w}`).join(' ') : Array.isArray(v) && !Array.isArray(v[0]) ? v.join(' to ') : Array.isArray(v) ? v.map(([l, y]) => `${l}:${Array.isArray(y) ? y.map((z) => Math.round(z * 100)).join('/') : Math.round(y * 1000) / 1000}`).join(' ') : v}`).join(' · ');
    emit(s, 'info', `Parts: ${nums}.`);
    emit(s, 'info', `Mix at level ${L} (${m.n} fights): ${m.kinds} kinds, signature in ${Math.round(m.sig * 100)}%, ${m.counts.map((n, i) => `${i + 2} parts ${Math.round((n / m.n) * 100)}%`).join(', ')}, a doubled basic in ${Math.round(m.dup * 100)}%. ${m.top}.`);
  } else if (/^developer bossrule [abc]$/.test(text)) { // the boss rule for every boss fight (interrupt.mjs, GAME_RULES.md "Solo bosses")
    s.bossRule = text.split(' ')[2];
    emit(s, 'info', `Boss rule ${s.bossRule}: ${BOSS_RULES[s.bossRule].name}. From your next boss fight.`);
  } else if (/^developer (codebases|components \d+)$/.test(text)) { // sockets.mjs: every codebase, or components
    if (text.endsWith('codebases')) { for (const id of PROGRAM_IDS) if (!codebasesOf(s).includes(id)) codebasesOf(s).push(id); emit(s, 'info', 'Developer: every codebase learned.'); }
    else { const n = gainComponents(s, Number(text.split(' ')[2])); emit(s, 'info', `Developer: +${n} components.`); }
  } else if (/^developer location (ransomware|worm|ghostroot)$/.test(text)) {
    const had = new Set(s.locations.map((l) => l.id));
    addLocation(s, text.split(' ')[2], Math.min(reached(s), SERVER.floorFor(hackerLevel(s)))); // the next ? of that family on your floor (floors.mjs pickSlot)
    for (const l of s.locations) if (!had.has(l.id) && l.fresh && joinCost(s, l).fits) memoryCommand(s, 'attach', l.id); // developer finds join your network
  } else if (/^repair( \d+)?$/.test(text)) {
    topUp(s, 'server', text.split(' ')[1] ? Number(text.split(' ')[1]) : null);
  } else if (/^top ?up( signal)?( \d+)?$/.test(text)) {
    const n = text.match(/(\d+)$/);
    topUp(s, 'signal', n ? Number(n[1]) : null);
  } else if (/^encounter [a-z]+( \d+)?$/.test(text) && (FIXTURES[text.split(' ')[1]] || STRAINS[text.split(' ')[1]] || text.split(' ')[1] === 'random')) {
    const [, key, seed] = text.split(' ');
    selectEncounter(s, key, seed ? Number(seed) >>> 0 : (s.seed + 1) >>> 0);
  } else if (text === 'engage') {
    engage(s);
  } else if (/^(compile|relay craft|filter craft)( |$)/.test(text)) {
    warn(s, 'Nothing is crafted any more: protocols, filters and relays are found or bought.');
  } else if (/^(gear|protocols|load|unload|scrap|deconstruct)( |$)/.test(text)) {
    protocolCommand(s, text);
  } else if (/^(services|install|uninstall)( |$)/.test(text) || text === 'cancel install' || text === 'buyout install') {
    serviceCommand(s);
  } else if (/^(attach|detach) \S+$/.test(text)) {
    const [verb, id] = text.split(' ');
    memoryCommand(s, verb, id, now);
  } else if (/^developer network \d+$/.test(text)) { // network.mjs: another seed (your lair rolls again)
    s.netSeed = Number(text.split(' ')[2]) >>> 0 || 1;
    s.locations = s.locations.filter((l) => !l.lair || l.member);
    s.netPity = {};
    emit(s, 'info', `Developer: network seed ${s.netSeed}.`);
  } else if (text === 'developer lair') {
    if (!openLair(s, true)) warn(s, s.netSeed ? 'Your lair is already on the map.' : 'No network seed.');
  } else if (/^developer native \S+$/.test(text)) {
    const id = text.split(' ')[2];
    if (!isNative(id)) warn(s, `No native unique called ${id}.`);
    else { nameNative(s, id); giveUnique(s, id, 'Developer: '); }
  } else if (/^developer salvage \d+$/.test(text)) {
    const n = gainComponents(s, Number(text.split(' ')[2]));
    emit(s, 'info', `Developer: +${n} components.`);
  } else if (/^developer daemon( |$)/.test(text)) {
    // developer daemon <id|all> [level]: a daemon at a level (testing; only invasions drop them in play).
    const [, , id, lv] = text.split(' '), L = Math.max(1, Number(lv) || hackerLevel(s));
    const ids = id === 'all' ? Object.keys(DAEMONS) : DAEMONS[id] ? [id] : [];
    if (!ids.length) warn(s, `developer daemon <${Object.keys(DAEMONS).join('|')}|all> [level]`);
    for (const k of ids) gainDaemon(s, k, L, { why: 'Developer: ' });
  } else if (/^developer code \d+$/.test(text)) {
    const n = Number(text.split(' ')[2]);
    gainCode(s, { cipher: n, worm: n, kernel: n, exploit: Math.ceil(n / 10) }, 'Developer: ');
  } else if (/^subclass( |$)/.test(text)) {
    subclassCommand(s, text);
  } else if (/^listen( |$)/.test(text)) {
    listenCommand(s, text);
  } else if (/^archetype( \w+)?$/.test(text) || /^talent( |$)/.test(text) || /^(equip|unequip)( |$)/.test(text) || /^specialty( |$)/.test(text) || /^loadout( |$)/.test(text)) {
    loadoutCommand(s, text);
  } else if (/^developer level \d+$/.test(text)) {
    const want = Math.max(1, Math.min(LOADOUT.maxLevel, Number(text.split(' ')[2])));
    const h = hackerOf(s);
    while (h.level < want) gainXp(s, Math.max(1, xpToNext(h.level) - h.xp));
    if (h.level > want) { h.level = want; h.xp = 0; }
    emit(s, 'info', `Developer: ${ARCHETYPES[classOf(s)].name} level ${h.level}.`);
  } else if (/^developer server \d+$/.test(text)) {
    // Your server's level is your highest class level; for testing, this sets a floor under it.
    s.devServer = Math.max(1, Math.min(SERVER.maxLevel, Number(text.split(' ')[2])));
    syncServer(s);
    emit(s, 'info', `Developer: server level ${serverLevel(s)} (a floor under your highest class level, for testing).`);
  } else if (/^filter (equip|unequip|scrap) \d+$/.test(text)) {
    filterCommand(s, text);
  } else if (/^firewall (upgrade|defrag)( \S+)?$/.test(text) || text === 'defrag') {
    firewallCommand(s, text, now);
  } else if (/^hub( |$)/.test(text)) {
    hubCommand(s, text);
  } else if (/^payload( |$)/.test(text)) {
    payloadCommand(s, text, now);
  } else if (/^market( |$)/.test(text)) {
    marketCommand(s, text, now);
  } else if (/^buy \S+ \S+$/.test(text)) {
    const [, f, id] = text.split(' ');
    buyFrom(s, f, id, now);
  } else if (/^buy \S+$/.test(text)) {
    buy(s, text.split(' ')[1]);
  } else if (/^architecture( |$)/.test(text)) {
    warn(s, 'Server architecture is gone. Programs in a server\'s sockets are the choices now.');
  } else if (/^(fleet|swarm)( |$)/.test(text)) {
    fleetCommand(s, text);
  } else if (/^event( |$)/.test(text)) {
    eventCommand(s, text);
  } else if (/^(floors?|descend)( |$)/.test(text)) {
    floorCommand(s, text); // floors.mjs: the floors you've reached, the map's floor, the way down
  } else if (/^network( |$)/.test(text)) {
    networkCommand(s, text); // network.mjs: your network's signature, or a member's
  } else if (/^(inspect|scan)( |$)/.test(text)) {
    genomeCommand(s, text); // genome.mjs: a part's genes (free, no cycle), or the card of what you're facing
  } else if (text.startsWith('config ') || text.startsWith('craft config ')) {
    warn(s, 'Configs are gone: services run as they come.');
  } else if (text.startsWith('outpost ') || /^build( |$)/.test(text)) {
    warn(s, 'Outposts are gone. Build in a server\'s socket rooms: connect, clear a socket, and build there.');
  } else if (/^craft( booster)?$/.test(text)) {
    warn(s, 'Signal boosters are gone. Top up your Signal with credits at home.');
  } else if (/^relay \S+$/.test(text)) {
    installRelay(s, text.split(' ')[1]);
  } else if (/^use /.test(text)) {
    useItem(s, text);
  } else if (text === 'mail' || text.startsWith('mail ')) {
    mailCommand(s, text, now);
  } else if (text === 'daemon' || text.startsWith('daemon ')) {
    daemonCommand(s, text);
  } else if (/^program( |$)/.test(text) && hooks.programCommand) {
    hooks.programCommand(s, text); // routines.mjs: your program's routines, its presets and its rails
  } else if (/^speed (relaxed|normal|fast)$/.test(text)) {
    s.settings.speed = text.split(' ')[1];
    emit(s, 'info', `Speed: ${s.settings.speed}, ${cycleLength(s) / 1000} seconds per cycle.`);
  } else if (text === 'go' || text === 'now') {
    if (!active(s)) warn(s, 'No fight running.');
    else {
      if (s.encounter.paused) { s.encounter.paused = false; s.encounter.autoPaused = false; emit(s, 'info', 'Resumed.'); } // any order resumes a paused fight
      const q = s.encounter.queue;
      s.encounter.synced = !!q && q.ability !== 'hold' && inSync(s, s.encounter.elapsedMs / cycleLength(s));
      resolveCycle(s);
    }
  } else if (text === 'pause' || text === 'resume') {
    if (!active(s)) warn(s, 'No fight to pause.');
    else {
      e.paused = text === 'pause';
      emit(s, 'info', e.paused ? 'Paused. Type resume.' : 'Resumed.');
    }
  } else if (!active(s)) {
    unknownAtHome(s, text);
  } else if (e.paused) {
    // A paused fight resumes on any order (a reload or a tab switch pauses it): then the order goes through.
    e.paused = false; e.autoPaused = false;
    emit(s, 'info', 'Resumed.');
    command(s, input, now);
    return since(s, first);
  } else if (text === 'cancel') {
    e.queue = null;
    e.plan = [];
    emit(s, 'queued', e.lastAttack ? `Cleared. Auto-repeat will use ${said(s, e.lastAttack)}.` : 'Cleared.');
  } else {
    // "a; b; c" plans the next cycles. A new command always replaces the old plan.
    const steps = text.split(';').map((x) => x.trim()).filter(Boolean);
    if (steps.length > CONFIG.planLength) warn(s, `You can plan ${CONFIG.planLength} cycles ahead. Extra steps were dropped.`);
    const intents = steps.slice(0, CONFIG.planLength).map((x, i) => toIntent(s, x, i === 0));
    const bad = intents.find((x) => x.error);
    if (bad) warn(s, bad.error, bad.suggest && steps.length === 1 ? { suggest: bad.suggest } : {});
    else {
      e.queue = intents[0];
      e.plan = intents.slice(1);
      emit(s, 'queued', intents.length > 1 ? `Planned: ${intents.map((x) => said(s, x.text)).join(' → ')}.` : `Queued: ${said(s, intents[0].text)}.`);
    }
  }
  return since(s, first);
}

// Turn typed text into something the engine can do this (or a later) cycle.
// Later plan steps skip the cooldown check; it's re-checked when they fire.
export function toIntent(s, text, checkNow = true) {
  const e = s.encounter;
  // "… last" (or "late"): this command goes at the back of the cycle, after everyone else's.
  const last = /\s(last|late)$/.test(text);
  if (last) text = text.replace(/\s(last|late)$/, '');
  if (text === 'hold' || text === 'wait') return { ability: 'hold', text: 'hold' };
  if (text === 'interrupt') text = 'sigint';
  if (text === 'jack out') return e.mode === 'run' ? { ability: 'flee', text: 'jack out' } : { error: 'You are home. Nothing to jack out of.' };
  const intent = parse(s, text);
  if (intent.error) return intent;
  if (checkNow) {
    const error = validate(s, intent);
    if (error) return { error };
  }
  const text2 = (intent.target ? `${intent.ability} ${intent.target}` : intent.ally ? `${intent.ability} ${intent.ally}` : intent.ability) + (last ? ' last' : '');
  return { ...intent, text: text2, at: e?.cycle, ...(last ? { last: true } : {}) };
}

// Turn order in a crew cycle: everyone's command by what it does, so a big hit isn't wasted on
// armor someone was about to strip. 0 armor strippers (Spike, Crack), 1 debuffs and the rest,
// 2 damage skills, 3 anything marked "last". Ties keep their order (you, then the crew).
export const STRIPPERS = ['spike', 'crack'];
export function turnPriority(enc) {
  const q = enc?.queue || (enc?.lastAttack ? { ability: enc.lastAttack.split(' ')[0] } : null);
  if (!q || q.ability === 'hold') return 1;
  if (q.last) return 3;
  const a = ABILITIES[q.ability];
  return STRIPPERS.includes(q.ability) || a?.strip ? 0 : a?.verb === 'hit' ? 2 : 1;
}
// This cycle's turns: 'you' and crewmates' names, in priority order.
export function turnOrder(s) {
  const crew = hooks.crewStanding?.(s) || [];
  const actors = [{ who: 'you', p: turnPriority(s.encounter) }, ...crew.map((m) => ({ who: m.who, p: turnPriority(m.encounter) }))];
  return actors.map((x, i) => ({ ...x, i })).sort((a, b) => a.p - b.p || a.i - b.i).map((x) => x.who);
}
// One actor's turn in a crew cycle. False if the fight ended (you fled).
function actorTurn(s, who) {
  if (who === 'you') return playerPhase(s, 'command');
  hooks.crewActNamed?.(s, who);
  return active(s);
}

const signalNow = (s) => Math.min(maxSignal(s), s.signal ?? maxSignal(s)); // as run.mjs
// Topping up: pay to have Signal or server Integrity full now (CONFIG.topUp), instead of resting.
export function topUpPrice(s, what) {
  const [base, per] = CONFIG.topUp[what];
  return Math.round(base + per * (what === 'signal' ? hackerLevel(s) : serverLevel(s)));
}
// What it costs to fill `points` of the bar (all that's missing by default).
export function topUpCost(s, what, points = null) {
  const max = what === 'signal' ? maxSignal(s) : s.server.max;
  const missing = what === 'signal' ? max - signalNow(s) : s.server.max - s.server.integrity;
  const n = Math.min(missing, points ?? missing);
  return n > 0 ? Math.max(1, Math.ceil((topUpPrice(s, what) * n) / max)) : 0;
}
function topUp(s, what, wanted = null) {
  if (active(s)) return warn(s, 'Finish the fight first.');
  const signal = what === 'signal';
  if (signal && s.run) return warn(s, 'Top up at home. On a run, use a Signal patch from the store.');
  if (!signal && s.server.integrity <= 0) return warn(s, 'The server crashed. Type developer reboot.');
  const max = signal ? maxSignal(s) : s.server.max;
  const now = signal ? signalNow(s) : s.server.integrity;
  let n = Math.min(max - now, wanted ?? max);
  if (n <= 0) return warn(s, signal ? 'Signal is already full.' : 'Server is already at full Integrity.');
  while (n > 0 && topUpCost(s, what, n) > s.server.credits) n--; // as much as you can afford
  if (n <= 0) return warn(s, `Not enough credits (${topUpCost(s, what)} to fill it).`);
  const cost = topUpCost(s, what, n);
  s.server.credits -= cost;
  if (signal) { s.signal = now + n >= max ? null : now + n; s.signalAcc = 0; }
  else s.server.integrity += n;
  emit(s, 'repair', signal ? `Signal topped up: +${n} for ${cost} credits. Signal ${now + n}/${max}.` : `Repaired ${n} Integrity for ${cost} credits. Server ${s.server.integrity}/${s.server.max}.`, { what, credits: cost });
}

// ---------- resolution ----------

// opts: mine (your own hit: Breaker Momentum applies), ignoreArmor, by (label for the log), noHook.
// Returns the damage dealt and any overflow past zero.
// A Rootkit Implant burning on a part: it can't be healed or grown (Patcher, Siphon, Self-Update).
export const implanted = (s, p) => (s.encounter?.burns || []).some((b) => b.id === 'implant' && b.target === p.id) || alliesOf(s).some((x) => (x.st.encounter?.burns || []).some((b) => b.id === 'implant' && b.target === p.id));
// A part's last ◆ broke under your command: who did it (a seal that fails then readies that skill, tells.mjs).
export function stripMark(s, p) {
  daemonsOn(s, 'stripped', { part: p.id }); // Crowbar
  const c = s.encounter?.commanding;
  if (c && c.id && !c.auto && c.target === p.id) p.strippedBy = { who: s.who || '', id: c.id, cycle: c.at ?? s.encounter.cycle };
}
// Where a hit came from, for its own number on screen (app.js, dmgfx.mjs): src 'burn' (a tick of damage over
// time), 'helper', 'daemon' or 'reflect' (damage turned back on the virus), via the name it carries; your own
// command's hit names its skill. Look only: nothing in play reads it.
const srcOf = (e, opts) => ({
  ...(opts.src || opts.dot ? { src: opts.src || 'burn' } : {}),
  ...(opts.by ? { via: opts.by } : opts.mine && !opts.dot && e.commanding?.id ? { skill: e.commanding.id } : {}),
});
export function hit(s, p, base, opts = {}) {
  const e = s.encounter;
  if (!alive(p)) return { dealt: 0, overflow: 0 };
  // Cold Store: frozen, nothing reaches it (it isn't on the timeline either) until it thaws.
  if (frozenNow(s, p)) {
    if (base > 0 && (opts.mine || opts.dot)) emit(s, 'status', `${opts.by ? opts.by + ': ' : ''}the ${p.name} is frozen. Nothing gets through until it thaws.`, { target: p.id, frozen: true });
    return { dealt: 0, overflow: 0, absorbed: true };
  }
  // The parts plan's rules on your own command's hit (burns, helpers, area hits and the server's go past them).
  const cmd = opts.mine && !opts.dot && !opts.by && !opts.server && base > 0;
  // Front End: while it wears ◆, a single-target command at its partner lands on it.
  if (cmd && !opts.fronted && e.commanding?.target === p.id && ABILITIES[e.commanding.id]?.target !== 'none' && !buffed(e, 'sudo')) {
    const fe = livingParts(s).find((x) => x.front && x !== p && (x.armor > 0 || x.exe) && frontOf(s, x) === p);
    if (fe) { emit(s, 'status', `The ${fe.name} takes your hit on the ${p.name}.`, { target: fe.id, from: p.id, fronted: true }); return hit(s, fe, base, { ...opts, fronted: true }); }
  }
  if (cmd && p.special) e.virus.idleHit = e.cycle; // the Idle Timer counts from the signature's last command hit
  // Hotspot: a command hit on it powers up the virus's next attack 2 or more cycles away (tells.mjs).
  if ((cmd || (p.exe && base > 0 && !opts.server)) && p.hotspot && p.hotAt !== e.cycle) { p.hotAt = e.cycle; hotCharge(s, p); } // a Hotspot.exe: burns and helpers too
  if (cmd) mechCommandHit(s, p); // Thorns, a Swap passing your statuses on, the Bodyguard's target (mechanics.mjs)
  // Adaptive (mutation): count the cycles in a row your commands hit this part (the chit comes at cycle end).
  if (mutated(s, 'adaptive') && opts.mine && !opts.dot && !opts.server && base > 0 && p.adaptAt !== e.cycle) {
    p.adaptRun = p.adaptAt === e.cycle - 1 ? (p.adaptRun || 0) + 1 : 1;
    p.adaptAt = e.cycle;
  }
  // Sleeper: any hit wakes it.
  if (e.virus.dormant && base > 0) e.virus.woke = true;
  // Keylogger: the Logger only feels commands fired in a Sync Window (and the burns and helpers
  // they started).
  if (p.syncOnly && !(opts.dot ? opts.synced : e.synced && !opts.server)) {
    emit(s, 'status', `${opts.by ? opts.by + ': ' : ''}${p.name} logs it and shrugs it off. Only a command fired in the Sync Window hurts it.`, { target: p.id });
    return { dealt: 0, overflow: 0, absorbed: true };
  }
  // Flicker: the Shade is only there on even cycles; on odd ones everything passes through it, and
  // your own command's static bounces back at you (a quarter of the hit; never your last point).
  if (p.phase && e.cycle % 2 === 1 && base > 0) {
    const back = opts.mine && !opts.dot ? Math.min(Math.max(1, Math.round(base * CONFIG.phaseBounce)), defender(s).integrity - 1) : 0;
    const took = back > 0 ? takeDamage(s, back, p.id, `${p.name} static`) : 0;
    emit(s, 'status', `${opts.by ? opts.by + ': ' : ''}passes through the ${p.name}. It is out of phase until next cycle.`, { target: p.id });
    if (took) emit(s, 'server-hit', `The static bounces back off the ${p.name}: −${took}.`, { source: p.id, amount: took, bounce: true });
    return { dealt: 0, overflow: 0, absorbed: true };
  }
  // Decoy (docs/puzzle-levers.md 3.8): its beat bent your command onto the part it points at (bendCommand). Pointing at
  // itself, each hit of that command lands on the Decoy and part of it bounces back at you (never your last point;
  // HOLLOW CHOIR's Harmony raises it). Mirror Maze (a native unique) let the command through unbent, at its share.
  const root = opts.mine && !opts.server && (buffed(e, 'sudo') || opts.unlock); // Sudo (Overclocker): the parts' rules don't hold you; Zero-day goes through locks
  if (cmd && e.commanding?.maze) base = Math.max(1, Math.round((base * e.commanding.maze) / 100));
  if (cmd && e.commanding?.bounce === p.id) {
    const back = Math.min(Math.max(1, Math.round(base * (p.bounce ?? CONFIG.mirrorBounce))), defender(s).integrity - 1);
    const took = back > 0 ? takeDamage(s, back, p.id, `${p.name} bounce`) : 0;
    if (took) emit(s, 'server-hit', `Part of it bounces back off the ${p.name}: −${took}.`, { source: p.id, amount: took, bounce: true });
  }
  // A crew boss's firewall phase (raid.mjs): while its shield is up, every hit on the boss lands on the shield,
  // armor or not.
  if (base > 0 && e.virus.raid?.shield && !p.raidAdd) {
    const n = Math.floor((opts.dot ? dotHit(s, base) : base + (opts.mine && !opts.server ? gearStat(s, 'damage') : 0)) * damageMultiplier(s, p, opts) + 1e-9);
    raidShield(s, p, n, true);
    if (!opts.server) noteDealt(s, n); // it still draws aggro
    return { dealt: 0, overflow: 0, absorbed: true };
  }
  // Dead Reckoning (first-pierce): your first hit on each part this fight goes through its ◆.
  if (opts.mine && !opts.dot && !opts.server && base > 0 && fxHas(s, 'first-pierce')) {
    const seen = (fxState(e).touched ||= {});
    if (!seen[p.id]) { seen[p.id] = true; if (p.armor > 0 && !opts.pierce) opts = { ...opts, pierce: true }; }
  }
  // Armor chits: a hit on an armored part does no damage and breaks one chit.
  // Burn ticks, helpers and every target of a spread hit count, one chit each.
  // Sudo (Overclocker): your hits go through ◆, and each still breaks one on the way.
  if (p.armor > 0 && !opts.pierce && opts.mine && !opts.server && !opts.dot && buffed(e, 'sudo') && classOf(s) === 'breaker') {
    p.armor -= 1;
    if (!p.armor) { p.patchAt = e.cycle + patchDelay(s); stripMark(s, p); openProc(s, 'stripped', { part: p.id }); }
    classEach('chipped', s, p, 1, opts);
    opts = { ...opts, pierce: true };
  }
  // Damper: while it wears ◆, the kind of hit it drops deals it nothing, but still breaks a ◆ (even one that would go
  // through armor).
  if (p.damper && p.armor > 0 && opts.pierce && [p.damperKind, p.damperKind2].includes(hitKind(s, p, opts))) opts = { ...opts, pierce: false, damped: true };
  if (p.armor > 0 && !opts.pierce) {
    // A heavy hit from your own command cracks two.
    const heavy = (opts.chits > 1 || (opts.mine && !opts.dot && !opts.by && (base >= CONFIG.heavyHit * powerOf(s) - 1e-9 || fxFire(s, 'hit', { target: p, do: 'shatter' }).length))) && p.armor > 1; // (base is already your size; Shellshock breaks two)
    p.armor -= heavy ? 2 : 1;
    p.lastDamaged = e.cycle;
    if (!opts.server) classEach('chipped', s, p, heavy ? 2 : 1, opts); // Debris Field (dist/classes)
    if (!p.armor) { p.patchAt = e.cycle + patchDelay(s) + (p.phase ? 1 : 0); stripMark(s, p); if (!opts.server) openProc(s, 'stripped', { part: p.id }); }
    const patchNote = `Its armor is broken, and it patches in ${patchDelay(s)} ${patchDelay(s) === 1 ? 'cycle' : 'cycles'}`;
    // Your command's own hit says whose it was: a big hit spent on ◆ reads as absorbed, not as a miss (app.js floats
    // ◆ ABSORBED off it: absorbed). Burns, helpers, extra hits and a server's keep the plain line.
    const cmd = opts.mine && !opts.dot && !opts.by && !opts.server && e.commanding?.id && ABILITIES[e.commanding.id] ? e.commanding.id : null;
    const n = heavy ? 2 : 1;
    if (cmd) emit(s, 'armor', `${cmd === 'spike' ? spikeName(s) : ABILITIES[cmd].name}: absorbed by ${p.name}'s ◆ (${n} broken${p.armor ? `, ${p.armor} left` : ''}).${p.armor ? '' : ` ${patchNote}.`}`, { target: p.id, left: p.armor, absorbed: true, ability: cmd, broke: n });
    else emit(s, 'armor', `${opts.by ? opts.by + ': ' : ''}${p.name} ${heavy ? 'two ◆ broken' : '◆ broken'}${p.armor ? ` (${p.armor} left)` : `. ${patchNote}`}.`, { target: p.id, left: p.armor, broke: n });
    return { dealt: 0, overflow: 0, absorbed: true };
  }
  // Flat gear: Damage on your skill hits, Payload on burn ticks and helper hits.
  if (base > 0 && !opts.server) {
    if (opts.dot) base = dotHit(s, base); // damage over time's share of level growth, plus Payload
    else if (opts.mine) base += gearStat(s, 'damage') + fxFire(s, 'hit', { target: p, do: 'damage+' }).reduce((n, x) => n + x.value, 0);
  }
  let raw = Math.floor(base * damageMultiplier(s, p, opts) + 1e-9); // tolerance: 25 × 1.5 × 1.2 is 45, not 44.999…
  const lean = leanDealt(e, p);
  if (lean > 1 && raw > 0) leanPaid(e, p, raw - Math.round(raw / lean));
  // Subrogation (Halcyon): the part that last hit you takes double from your next skill hit.
  if (raw > 0 && opts.mine && e.subro === p.id) { raw *= 2; e.subro = null; emit(s, 'status', `Subrogation: ${p.name} pays double.`, { target: p.id }); }
  // Grudge (Bastion's edge): the part that last hit you takes more from your hits.
  if (raw > 0 && opts.mine && !opts.server && e.grudge === p.id && edge(s, 'bastion')) raw = Math.floor(raw * (1 + EDGE.bastion.bonus));
  // Weak Spot (Infiltrator's edge): your first damaging hit on each part's bare code crits (a hit
  // through armor doesn't find it, and doesn't use it up).
  const weak = raw > 0 && opts.mine && !opts.dot && !opts.server && edge(s, 'infiltrator') && !(opts.pierce && p.armor > 0) && !(e.weakHit ||= {})[p.id];
  if (weak) e.weakHit[p.id] = true;
  // Crits: a roll on every hit that does damage.
  // Buffer Overflow (Zero-day): after you break a part, your next damaging hit crits.
  // POST Code (first-skill-crit): every hit of your first damaging skill each fight.
  const first = raw > 0 && opts.mine && !opts.dot && !opts.server && !!e.commanding && !!e.fxs?.critSkill;
  if (first) e.fxs.critHit = true;
  const forced = raw > 0 && !opts.server && (weak || e.forceCrit || opts.crit || first);
  if (forced && e.forceCrit) e.forceCrit = false;
  // Exposed: every hit on it, from anyone, has a better crit chance.
  const chance = critChance(s) + (opts.server ? 0 : classSum('crit', s, p, opts)) + (on(s, p, 'exposed') ? SKILLS.exposed + 5 * rank(s, 'exploit-kit') : 0) + (opts.mine ? fxFire(s, 'hit', { target: p, do: 'crit%' }).reduce((n, x) => n + x.value, 0) : 0);
  const crit = forced || (raw > 0 && !opts.flat && !opts.blast && chance > 0 && rand(s) * 100 < chance); // a held cash-in or a blast never crits
  let doubled = false;
  if (crit) {
    let mult = critMultiplier(s) * (opts.server ? 1 : classMult('critDealt', s, p, opts)), flat = opts.server ? 0 : gearStat(s, 'critDamage'); // critDealt: Burst Buffer (sets.mjs)
    // Bit Flip (crit-double): every Nth critical strike of yours in a fight deals its bonus twice over.
    const dbl = opts.mine && !opts.server && fxHas(s, 'crit-double');
    if (dbl) { const n = (fxState(e).crits = (fxState(e).crits || 0) + 1); if (n % (Number(dbl.fx.value) || 4) === 0) { mult = 1 + 2 * (mult - 1); flat *= 2; doubled = true; } }
    raw = Math.floor(raw * mult) + flat;
    // Deepwater (crit-damage%): more on a part that meets its condition.
    if (opts.mine && !opts.server) for (const x of fxFire(s, 'hit', { target: p, do: 'crit-damage%' })) raw = Math.floor(raw * (1 + x.value / 100));
  }
  let dealt = Math.min(p.integrity, raw);
  const notes = [];
  // Limiter: no single hit takes more than its share of its max. The rest is lost.
  if (dealt > 0 && !root && capOf(s, p)) { const cap = capOf(s, p); if (dealt > cap) { notes.push(`capped: ${dealt - cap} lost`); dealt = cap; } }
  // Lockbox: while it lives, the part it wards loses at most a quarter of its max a cycle, from everything. HASHLORD's Pool
  // Lock (wardCommands) holds back your commands only: burns and helpers go through at full.
  const crush = opts.mine && !opts.server ? 1 + (fxHas(s, 'lock-crush')?.fx.value || 0) / 100 : 1; // Lockpick (a native unique): locks and wards give way faster
  // What the cap holds back isn't lost: the Lockbox holds it, for its partner when it breaks (breakPart; docs/puzzle-levers.md 3.4).
  const warder = dealt > 0 && !root ? livingParts(s).find((x) => wards(x, p) && !(x.wardCommands && opts.dot)) : null;
  if (warder) {
    const cap = Math.max(1, Math.round(p.max * (p.wardShare ?? CONFIG.ward) * crush)), used = p.wardAt === e.cycle ? p.wardUsed : 0;
    const was = dealt;
    dealt = Math.max(0, Math.min(dealt, cap - used));
    p.wardAt = e.cycle; p.wardUsed = used + dealt;
    if (dealt < was) { (warder.held ||= {})[p.id] = (warder.held[p.id] || 0) + was - dealt; notes.push(`warded: ${was - dealt} held`); }
  }
  // Mutex: while it lives, the part it locks carries a shield (its lock) that takes the hit first.
  let unlocked = false, soaked = 0, lockWas = 0, lockLost = 0;
  if (dealt > 0 && !root && p.lockHp > 0 && livingParts(s).some((x) => x.lock === p.id)) {
    const soak = Math.min(p.lockHp, Math.ceil(dealt * crush)), spent = Math.min(dealt, Math.ceil(soak / crush));
    lockWas = p.lockHp; lockLost = soak;
    p.lockHp -= soak; dealt -= spent; soaked = spent;
    notes.push(`lock: ${soak} held`);
    if (!p.lockHp) { p.lockAt = e.cycle + (p.relock ?? CONFIG.mutex.every); unlocked = true; }
  }
  // Buffer: its shield on the part below it takes your command hits first (burns and helpers go under it).
  if (dealt > 0 && !root && p.bufHp > 0 && opts.mine && !opts.dot && !opts.by && !opts.server && bufferOn(s, p)) {
    const soak = Math.min(p.bufHp, dealt);
    lockWas = p.bufHp; lockLost = soak;
    p.bufHp -= soak; dealt -= soak; soaked = soak;
    notes.push(`buffer: ${soak} held`);
  }
  // A crew boss (raid.mjs): a firewall phase's shield takes the hit first, a priority add's ward cuts it.
  if (dealt > 0 && e.virus.raid) { const was = dealt; dealt = raidShield(s, p, dealt); if (dealt < was && !dealt) notes.push('shielded'); }
  if (crit) notes.push(doubled ? 'CRIT, doubled' : 'CRIT');
  if (opts.pierce && p.armor > 0) notes.push('through armor');
  if (p.exposedUntil >= e.cycle) notes.push('exposed');
  if (p.taggedUntil >= e.cycle) notes.push('tagged');
  if (e.virus.weakKnown && e.virus.weakPoint === p.id) notes.push('weak point');
  if (dealt > 0 && holdsPart(e, p)) dealt = Math.min(dealt, Math.max(0, p.integrity - 1)); // Uptime: the virus can't be broken (objectives.mjs)
  const above = p.integrity >= p.max / 4;
  p.integrity -= dealt;
  if (above && p.integrity > 0 && p.integrity < p.max / 4) daemonsOn(s, 'low', { part: p.id }); // Reaper
  if (crit && opts.mine && dealt > 0) daemonsOn(s, 'crit', { part: p.id }); // Ricochet
  if (dealt > 0 && s.encounter?.virus) { const d = (s.encounter.virus.dealt ||= {}); d[s.who || ''] = (d[s.who || ''] || 0) + dealt; } // who did the damage: drop-ins earn by it
  if (dealt > 0 && e.virus.raid && !opts.server) noteDealt(s, dealt); // aggro (raid.mjs)
  p.lastDamaged = e.cycle;
  // Leech: a share of what you deal heals you (paid out once per cycle).
  if (!opts.server && opts.mine && dealt > 0) e.leechAcc = (e.leechAcc || 0) + gearStat(s, 'leech') * (crit ? Math.max(1, ...fxFire(s, 'crit', { do: 'leech-x' }).map((x) => x.value)) : 1);
  if (crit && opts.mine && dealt > 0) for (const x of fxFire(s, 'crit', { do: 'heal' })) heal(s, x.value, x.name || x.it.name);
  if (crit && opts.mine && dealt > 0) for (const x of fxFire(s, 'crit', { do: 'restore%' })) heal(s, Math.max(1, Math.round((defender(s).max * x.value) / 100)), x.name || x.it.name, firedOf([x])); // Root of Trust
  if (crit && opts.mine && dealt > 0) for (const x of fxFire(s, 'crit', { do: 'buff' })) addBuff(s, x); // Turbidity
  // Race Window, Hot Reload: a crit from your command readies that skill again.
  if (crit && opts.mine && !opts.dot && dealt > 0 && e.commanding && e.lastSkill && e.readyAt[e.lastSkill] > e.cycle) for (const x of fxFire(s, 'crit', { do: 'refund-skill' })) { delete e.readyAt[e.lastSkill]; emit(s, 'status', `${x.name || x.it.name}: ${ABILITIES[e.lastSkill]?.name || e.lastSkill} is ready again.`); break; }
  e.lastCrit = !!crit && !!opts.mine;
  // Your gear's conditional rules that went into this hit (a bonus to its damage, or the crit chance behind a crit).
  const fired = opts.mine && !opts.server && raw > 0 ? [
    ...fxFire(s, 'hit', { target: p, do: 'damage%', cmd: !opts.dot && !opts.by ? e.commanding?.id : null }, false),
    ...(opts.dot ? [] : fxFire(s, 'hit', { target: p, do: 'damage+' }, false)),
    ...(crit && !forced ? fxFire(s, 'hit', { target: p, do: 'crit%' }, false) : []),
  ].filter((x) => x.fx.if) : [];
  // shield: what the Mutex's lock took of it, from lockWas, with the part at hp after the hit (the board's lock segment
  // drains by it: view.mjs, app.js; dmgfx.mjs's number says it was absorbed).
  emit(s, 'damage', `${opts.by ? opts.by + ': ' : ''}${p.name} −${dealt}${notes.length ? ` (${notes.join(', ')})` : ''}. ${p.integrity}/${p.max}.`, { target: p.id, amount: dealt, crit, ...srcOf(e, opts), ...firedOf(fired), hp: p.integrity, ...(lockLost ? { shield: lockLost, lockWas } : {}) }); // hp: what's left after this hit (the board steps its bar down hit by hit)
  if (unlocked) emit(s, 'armor', `The ${p.name}'s lock breaks. The Mutex locks it again in ${p.relock ?? CONFIG.mutex.every} cycles unless you break the Mutex.`, { target: p.id, left: p.armor, lock: 'broke' });
  // A server room's bodies' own rules on a hit (families.mjs: a Trojan's Package unpacks). 'gone': the part left the
  // board without breaking. Then the interrupt's ticks (interrupt.mjs), in every fight that has them.
  if (bodyRules(e) && dealt > 0 && hooks.roomHit && hooks.roomHit(s, p, p.integrity + dealt, dealt, opts) === 'gone') return { dealt, overflow: 0, crit, broke: false };
  if (e.ticked && dealt > 0) tickHit(s, p, p.integrity + dealt, dealt, opts);
  // Extortion: damage dealt to a winding-up Demand in the 2 cycles before it lands calls it off.
  const w = p.attack?.windup;
  if (w && dealt > 0 && p.integrity > 0 && p.attack.due - e.cycle <= 2) {
    p.attack.wound = (p.attack.wound || 0) + dealt;
    if (p.attack.wound >= w) {
      p.attack.due = e.cycle + p.attack.interval;
      p.attack.wound = 0;
      emit(s, 'blocked', `${p.attack.name} is called off. You hit the ${p.name} hard enough, and it starts over.`, { source: p.id });
    }
  }
  if (p.integrity === 0) {
    breakPart(s, p);
    // Overkill (Breaker's edge): what was left over spills onto the next part.
    const spill = Math.min(EDGE.breaker.cap + classSum('spill', s), raw - dealt), next = spill > 0 && opts.mine && !opts.overkill && edge(s, 'breaker') ? soonestAttacker(s) : null; // spill: Wrecking Crew's Demolitionist line (sets.mjs)
    if (next) hit(s, next, spill, { by: 'Overkill', overkill: true, pierce: true, noHook: true });
    // Spillway (spill): up to its number (a skill's number, grown with your level) of what was left after that.
    const sw = opts.mine && !opts.overkill ? fxHas(s, 'spill') : null, more = sw ? Math.min(scaled(s, Number(sw.fx.value) || 0), raw - dealt - (next ? spill : 0)) : 0, to = more > 0 ? soonestAttacker(s) : null;
    if (to && alive(to)) hit(s, to, more, { by: sw.it?.name || sw.name, overkill: true, pierce: true, noHook: true });
  } else if (on(s, p, 'hooked') && !opts.noHook) hit(s, p, scaled(s, SKILLS.hooked + rank(s, 'kernel-hook')), { by: 'Hook', noHook: true });
  // Wire Wrap (momentum-cleave): armed by a break that left your Momentum full, your next skill's hit lands on every other part too.
  const wrap = e.fxs?.cleave;
  if (wrap && wrap.at < e.cycle && raw > 0 && opts.mine && !opts.dot && !opts.by && e.commanding) {
    e.fxs.cleave = null;
    const n = Math.max(1, Math.round((raw * wrap.value) / 100)), rest = livingParts(s).filter((x) => x !== p);
    if (rest.length) emit(s, 'status', `${wrap.name}: the hit carries to ${rest.length === 1 ? 'the other part' : `the other ${rest.length} parts`}.`, { target: p.id, gear: [{ id: wrap.id, name: wrap.name }] });
    for (const x of rest) if (alive(x)) hit(s, x, n, { by: wrap.name, overkill: true, noHook: true });
  }
  const out = { dealt, overflow: Math.max(0, raw - dealt), crit, broke: p.integrity === 0 };
  if (!opts.server) classEach('hit', s, p, out, opts);
  return out;
}

// Bosses (BOSSES): a phase fires once the virus is down to its share of total Integrity; from
// enrageAt every attack lands every cycle, a quarter harder, with a warning a few cycles ahead.
function bossPhases(s) {
  const e = s.encounter, v = e.virus;
  if (!v.boss) return;
  const life = virusIntegrity(s), share = life.max ? life.current / life.max : 0;
  for (const ph of v.phases || []) {
    if (ph.done || share > ph.at || !life.current) continue;
    ph.done = true;
    let say = ph.say;
    for (const act of ph.do) {
      if (act === 'rearm') for (const p of livingParts(s)) if (p.kind === 'system') { p.armor = Math.max(1, p.maxArmor); p.maxArmor = p.armor; p.patchAt = null; }
      if (act === 'faster') for (const p of attackers(s)) p.attack.interval = Math.max(2, p.attack.interval - 1);
      if (act.startsWith('spawn') || act.startsWith('fork')) { // spawn:<part> from the boss's family, its strain or its own parts (a second one gets its own id); plain spawn: a Sentry. fork:<part>: one at the boss's size (HASHLORD's Chain Fork)
        const id = act.split(':')[1] || 'sentry';
        const pool = [...(STRAINS[v.strain]?.parts || []), ...(BOSSES[v.boss]?.extra || []), ...((FAMILIES[v.family] || GUARDS[v.family])?.parts || [])];
        const spec = pool.find((x) => x.id === id) || GUARDS.watchdog.parts.find((x) => x.id === 'sentry');
        const p = makePart(spec, 'system', v.hpPower);
        if (parts(s).some((x) => x.id === p.id)) { p.id += '2'; p.name += ' II'; if (p.reflect) p.reflectOff = Math.floor(p.reflect / 2); }
        if (p.attack) { p.attack.amount = Math.max(1, Math.round(p.attack.amount * v.power)); p.attack.due = e.cycle + 1; }
        if (act.startsWith('fork') && BOSSES[v.boss]) p.max = p.integrity = Math.round(p.max * BOSSES[v.boss].hp);
        v.parts.push(p);
        if (p.lock) { const t = part(s, p.lock); if (alive(t)) { t.lockMax = t.lockHp = Math.max(1, Math.round(t.max * CONFIG.mutex.share)); t.lockAt = null; } } // a Mutex that joins locks its part at once
        for (const w of livingParts(s).filter((x) => x.ward === spec.id && p.id !== spec.id)) (w.wardsToo ||= []).push(p.id); // HASHLORD's Pool Lock wards the forked Miner too
      }
      if (act === 'harmony') { const d = livingParts(s).find((x) => x.reflect); if (d) d.bounce = CONFIG.decoy.harmony; else say = 'The Hollow Choir reaches for its harmony, but its Decoy is broken.'; }
      if (act === 'doppelganger') say = doppelganger(s);
    }
    emit(s, 'phase', `PHASE ${v.phases.filter((x) => x.done).length + 1}. ${say}`, { boss: v.boss });
  }
  if (v.enrageAt && e.cycle === v.enrageAt - ENRAGE.warn) emit(s, 'warning', `${v.name} enrages in ${ENRAGE.warn} cycles. Then every attack lands every cycle.`);
  if (v.enrageAt && e.cycle === v.enrageAt && !v.enraged) {
    v.enraged = true;
    for (const p of attackers(s)) { p.attack.interval = 1; p.attack.due = Math.min(p.attack.due, e.cycle + 1); if (['damage', 'encrypt'].includes(p.attack.effect)) p.attack.amount = Math.round(p.attack.amount * ENRAGE.dmg); }
    emit(s, 'phase', `${v.name} ENRAGES. Every attack lands every cycle.`, { boss: v.boss, enrage: true });
  }
}

// MIRRORSHADE's Doppelganger: the Mimic stops recording and takes the shape of the first part you broke (its attack and
// its ◆), or of the Pulse Node if you haven't broken one. What the phase card says.
function doppelganger(s) {
  const e = s.encounter, v = e.virus, m = livingParts(s).find((x) => x.mimic);
  if (!m) return `${v.name}'s Mimic is already broken, so the Doppelganger has no body to take.`;
  const first = (e.metrics?.breakOrder || []).map((id) => part(s, id)).find((x) => x && x !== m && x.kind === 'system' && x.attack);
  const shape = first || part(s, 'pulse') || livingParts(s).find((x) => x !== m && x.attack);
  m.mimic = false;
  m.doppel = shape?.name || null;
  if (!shape) return `${v.name}'s Mimic stops recording.`;
  m.attack = { ...shape.attack, due: e.cycle + 2, n: 0, hasted: false };
  m.armor = m.maxArmor = Math.max(m.armor, shape.maxArmor); m.patchAt = null;
  return `${v.name}'s Mimic stops recording and takes the shape of the ${shape.name}${first ? ', the first part you broke' : ''}: its ${shape.attack.name} and ${m.armor} ◆.`;
}
// The parts plan's tethers: the part a Buffer shields (the next living part below it, else the one above), the part
// a Front End stands in front of (the signature, else the basic, else the next part), the signature an Idle Timer watches.
const sysParts = (s) => livingParts(s).filter((x) => x.kind === 'system');
export function belowOf(s, p) { const xs = sysParts(s).filter((x) => x !== p), all = parts(s); return xs.find((x) => all.indexOf(x) > all.indexOf(p)) || xs.at(-1) || null; }
export const bufferOn = (s, p) => livingParts(s).find((x) => (x.buffer && belowOf(s, x) === p) || (x.mech === 'bodyguard' && p.bufBy === x.id)) || null; // a Bodyguard's shield too (mechanics.mjs)
export function frontOf(s, fe) { const xs = sysParts(s).filter((x) => x !== fe && !x.front); return xs.find((x) => x.special) || xs.find((x) => x.basic) || xs[0] || null; }
export const signatureOf = (s) => livingParts(s).find((x) => x.special && x.kind === 'system') || null;
// The parts plan's second wave (P2): a Cold Store still frozen (untouchable, off the timeline), a Spare still asleep,
// the kind of hit a Damper drops, and a Packer's ???.
export const frozenNow = (s, p) => !!p?.frozen && !p.thawed && (s.encounter?.cycle ?? 1) <= (p.thawAt ?? p.frozen);
export const asleep = (p) => !!p?.spare && !p.booted;
export const limitOf = (p) => Math.max(1, Math.round(p.max * p.limit));
// The cap on a part's hits: its own Limiter's, or a standing Limiter.exe's on every part (null: none).
export function capOf(s, p) { const l = p.limit || (s?.encounter ? livingParts(s).find((x) => x.limit && x.exe && x !== p)?.limit : 0); return l ? Math.max(1, Math.round(p.max * l)) : null; }
// What kind of hit this is, for a Damper: a burn's tick, a helper's hit, or an area hit (a command's hit on a part it
// wasn't aimed at, a spill); null for a single-target command's own hit or the server's.
export function hitKind(s, p, opts = {}) {
  const e = s.encounter;
  if (opts.src === 'helper') return 'helper';
  if (opts.dot || ['Detonate', 'Pandemic'].includes(opts.by)) return 'burn';
  if (opts.server) return null;
  if (opts.overkill || ['Thundering Herd', 'Arc Flash'].includes(opts.by)) return 'area';
  const c = e?.commanding;
  if (opts.mine && c?.id && (ABILITIES[c.id]?.target === 'none' || (c.target && c.target !== p.id))) return 'area';
  return null;
}
// A living Packer, not unpacked (by a scan before the fight, or by breaking it): the virus's rolled parts hide who they
// are. Each shows as a Packed part (A, B… when there are more), its attack's name as ???, its tags, telegraphs, rule
// and inspect hidden; what it does still happens. p.packedAs keeps its own names until it unpacks.
export const packerOn = (s, v = s?.encounter?.virus) => !!v && !s?.encounter?.unpacked && s?.encounter?.virus === v && v.parts.some((x) => x.packer && alive(x));
export const packed = (s, v, p) => packerOn(s, v) && !!p && !p.packer && p.kind === 'system' && !p.special && !p.basic && p.id !== s.encounter.unpackedOne;
export const PACKED_NAME = 'Packed part';
export function packParts(s) {
  const v = s.encounter?.virus;
  if (!packerOn(s, v)) return;
  const xs = v.parts.filter((p) => packed(s, v, p) && !p.packedAs);
  xs.forEach((p, i) => {
    p.packedAs = { name: p.name, attack: p.attack?.name ?? null };
    p.name = xs.length > 1 ? `${PACKED_NAME} ${'ABCDEFGH'[i]}` : PACKED_NAME;
    if (p.attack) p.attack.name = '???';
  });
}
// The Packer broke (breakPart): every packed part takes its own names back. Returns the parts that unpacked.
export function unpackParts(s) {
  const out = [];
  for (const p of s.encounter?.virus?.parts || []) {
    if (!p.packedAs) continue;
    p.name = p.packedAs.name;
    if (p.attack?.name === '???' && p.packedAs.attack != null) p.attack.name = p.packedAs.attack;
    delete p.packedAs;
    out.push(p);
  }
  return out;
}
// A part that wards another (a Lockbox, HASHLORD's Pool Lock, which wards a forked Miner too).
export const wards = (x, p) => !!p && (x.ward === p.id || !!x.wardsToo?.includes(p.id));
// The Decoy whose beat is this cycle (it mirrors your commands), and a part's twin (Mirror).
export const mirrorOn = (s, cycle = s.encounter?.cycle) => livingParts(s).find((x) => x.reflect && (cycle + (x.reflectOff || 0)) % x.reflect === 0) || null;
// The Decoy's pointer (docs/puzzle-levers.md 3.8, decided 9.6): where its next beat (this cycle's, if it's on) bends your
// hit. It moves each beat: a part picked by the fight's seed and the beat's cycle among the standing system parts, never
// the one the last beat pointed at (the Decoy itself is one of them). It shows on the board (a dashed red tether) once
// the Decoy's timers do: its ◆ stripped, or Tagged. { decoy, at (the beat's cycle), to (the part), was (the last beat's part), shown, bad }, or null.
const beatFrom = (d, c) => { let k = c; while ((k + (d.reflectOff || 0)) % d.reflect) k++; return k; };
export function bendOf(s, d = livingParts(s).find((x) => x.reflect)) {
  const e = s.encounter;
  if (!e || !d?.reflect || !alive(d)) return null;
  const at = beatFrom(d, e.cycle), ps = livingParts(s).filter((x) => x.kind === 'system' && !frozenNow(s, x));
  let b = d.bend;
  if (!b || b.at !== at || !ps.some((x) => x.id === b.to)) {
    const was = !b ? null : b.at !== at ? b.to : b.was, pool = ps.filter((x) => x.id !== was);
    const k = (Math.imul(((e.seed || 0) + 0x9e37) >>> 0, 2654435761) ^ Math.imul(at + 1, 40503)) >>> 0;
    b = d.bend = { at, to: (pool[k % Math.max(1, pool.length)] || d).id, was };
  }
  const to = part(s, b.to);
  return { decoy: d, at, to, was: b.was, shown: !timersHidden(s, d), bad: bendBad(s, d, to) };
}
// A part the Decoy's bend must not put your hit on now: the Decoy itself (part of it bounces back), or a part to break
// last (a Tripwire, a Zip Bomb, a Hotspot) while another part stands.
export const bendBad = (s, d, p) => !!p && (p === d || ((!!p.deadman || !!p.fuse || !!p.hotspot) && livingParts(s).some((x) => x !== p && x.kind === 'system' && !x.deadman && !x.fuse && !x.hotspot)));
const twinOf = (s, p) => parts(s).find((x) => x !== p && (x.twin === p.id || p.twin === x.id)) || null;

// The living part whose attack lands soonest (ties: the bigger hit).
export function soonestAttacker(s, except = null) {
  return attackers(s).filter((p) => p.id !== except).sort((a, b) => a.attack.due - b.attack.due || b.attack.amount - a.attack.amount)[0] || livingParts(s).find((p) => p.id !== except && !frozenNow(s, p)) || livingParts(s).find((p) => p.id !== except) || null;
}

// The codex: what a virus component does stays ??? until you've researched it (research.mjs: a break, a cut or a tell
// answered; its name always shows, so you can target it). Keyed by strain or family, and the part.
export const codexKey = (v, p) => `${v.strain || v.family}:${p.id}`;
export const knowsPart = (s, v, p) => knowsAt(s, v, p, TIER.decoded);
function breakPart(s, p) {
  const e = s.encounter;
  // +1 research on the part (not a crewmate's break, not a fragment), for its first break in the fight only: a part
  // that comes back (a Trojan's redeployed Courier, a Mirror's rebooted twin) can't be farmed. Cuts and tells still count.
  if (!p.brokeOnce) gainResearch(s, e.virus, p, 'break');
  p.brokeOnce = true;
  e.metrics.breakOrder.push(p.id);
  if (p.kind !== 'fragment') e.breaks = (e.breaks || 0) + 1;
  mechBroke(s, p); // Vendetta (mechanics.mjs)
  objectiveBroke(s, p); // a Priority's part (objectives.mjs)
  // Mirror: break one twin while the other lives, and it reboots a few cycles later (at most twice).
  const tw = twinOf(s, p);
  if (tw && alive(tw) && (p.reboots || 0) < (p.rebootMax ?? CONFIG.twinReboot.max) && !p.quiet && !fxHas(s, 'no-reboot')) { p.rebootAt = e.cycle + CONFIG.twinReboot.in; emit(s, 'status', `${p.name} is down, but its twin ${tw.name} will reboot it in ${CONFIG.twinReboot.in} cycles. Break both.`, { target: p.id }); }
  // Breaker Momentum: a stack per break (up to SKILLS.momentumMax), for SKILLS.momentumCycles cycles after the last one.
  if (p.kind !== 'fragment' && classOf(s) === 'breaker') e.momentum = { stacks: Math.min(SKILLS.momentumMax, momentumStacks(s) + 1), until: e.cycle + SKILLS.momentumCycles };
  // Breaker Cascade Failure talent: the first break resets your cooldowns.
  if (hasTalent(s, 'cascade-failure') && !e.once.rampage) { e.once.rampage = true; e.readyAt = {}; emit(s, 'status', 'Cascade Failure resets your cooldowns.'); }
  classEach('broke', s, p);
  if (p.kind !== 'fragment') daemonsOn(s, 'broke', { part: p.id }); // Domino
  if (bodyRules(e)) hooks.roomBroke?.(s, p); // a room body's rule on a break (families.mjs)
  // Uniques that fire on a break (Cryptominer, Zero Cool).
  for (const x of fxFire(s, 'break', { crit: e.lastCrit, target: p })) {
    const who = x.name || x.it.name;
    if (x.fx.do === 'chit-fade') fadingChit(s, x); // Bitrot Ward: down to the last part
    // Kill Chain (a native unique): the next part to attack is Open, as if you'd read it.
    if (x.fx.do === 'break-open') { const t = soonestAttacker(s, p.id); if (alive(t) && t !== p && t.kind === 'system') { t.openUntil = Math.max(t.openUntil || 0, e.cycle + x.value); emit(s, 'read', `${who} leaves the ${t.name} Open.`, { target: t.id, open: true }); } }
    if (x.fx.do === 'refund') { for (const k of Object.keys(e.readyAt)) e.readyAt[k] = Math.max(e.cycle, e.readyAt[k] - x.value); emit(s, 'status', `${who} reduces your cooldowns by ${x.value}.`); }
    if (x.fx.do === 'refund-skill' && e.lastSkill) { delete e.readyAt[e.lastSkill]; emit(s, 'status', `${who}: ${ABILITIES[e.lastSkill]?.name || e.lastSkill} is ready again.`); }
    if (x.fx.do === 'heal') heal(s, x.value, who);
    if (x.fx.do === 'buff') addBuff(s, x); // Floodgate, Fuse Map: more damage for a few cycles
    if (x.fx.do === 'momentum' && p.kind !== 'fragment') classEach('gain', s, x.value, who); // Fuse Map: a Breaker's Momentum (classes/breaker.mjs)
    // Daisy Chain, Log4Shell: the part winding up a tell takes a hit (or the next to attack). Not from a hit it set off.
    if (x.fx.do === 'break-hit' && !e.chaining) {
      const t = livingParts(s).find((q) => q !== p && q.kind === 'system' && telling(s, q)) || soonestAttacker(s, p.id);
      if (alive(t) && t !== p) { e.chaining = true; hit(s, t, x.value, { by: who }); e.chaining = false; }
    }
  }
  // Wire Wrap (momentum-cleave): a break that leaves your Momentum full arms your next skill.
  const wrap = p.kind !== 'fragment' && fxHas(s, 'momentum-cleave');
  if (wrap && classOf(s) === 'breaker' && momentumStacks(s) >= momentumCap(s)) {
    if (!e.fxs?.cleave) emit(s, 'status', `${wrap.it?.name || wrap.name}: your Momentum is full. Your next skill also hits every other part for ${wrap.fx.value}%.`, { mark: 'buff', ...firedOf([wrap]) });
    fxState(e).cleave = { at: e.cycle, value: Number(wrap.fx.value) || 0, name: wrap.it?.name || wrap.name, id: wrap.id };
  }
  // Slammer: burns on the part you broke jump to the next part, with what they had left.
  if (fxHas(s, 'burn-jump')) {
    const next = soonestAttacker(s, p.id);
    const moved = alive(next) && next !== p ? e.burns.filter((b) => b.target === p.id && b.left > 0) : [];
    for (const b of moved) b.target = next.id;
    if (moved.length) mergeBurns(e);
    if (moved.length) emit(s, 'status', `${fxHas(s, 'burn-jump').it.name}: ${moved.length === 1 ? 'a burn jumps' : `${moved.length} burns jump`} to ${next.name}.`, { target: next.id, mark: 'burn' });
  }
  // The weak point moves: a new one forms on another part.
  if (e.virus.weakPoint === p.id) {
    const next = livingParts(s).find((x) => x.kind === 'system');
    const wasKnown = e.virus.weakKnown;
    if (next) { e.virus.weakPoint = next.id; e.virus.weakKnown = false; }
    if (wasKnown && next && usable(s).includes('scan')) emit(s, 'info', 'A new weak point formed. Scan to find it.');
  }
  // Zip Bomb: its fuse burns, then it hits you (cycleStart), unless the fight ends first.
  if (p.fuse && !p.fuseAt) { const fz = p.fuseIn ?? CONFIG.zipbomb.fuse; p.fuseAt = e.cycle + fz; emit(s, 'warning', `The ${p.name}'s fuse is lit. It goes off in ${fz === 1 ? '1 cycle' : `${fz} cycles`} unless the fight ends first.`, { target: p.id, fuse: p.fuseAt }); }
  // Spare: the signature broke while a Spare sleeps: it boots a little later with the signature's attack (cycleClose).
  if (p.special && p.attack) for (const sp of livingParts(s).filter((x) => asleep(x) && !x.bootAt)) {
    sp.bootAt = e.cycle + sp.spare.in; sp.bootFrom = { id: p.id, name: p.name, max: p.max, attack: { ...p.attack } };
    emit(s, 'warning', `The ${sp.name} boots in ${sp.spare.in} cycles with the ${p.name}'s ${p.attack.name}. It drops its ◆ as it boots.`, { target: sp.id, boot: sp.bootAt });
  }
  if (p.packer && !livingParts(s).some((x) => x.packer)) { // the last Packer: everything it packed unpacks, for good
    e.unpacked = true;
    const xs = unpackParts(s);
    if (livingParts(s).some((x) => x !== p)) emit(s, 'status', `The ${p.name} breaks, and the virus's rules unpack.${xs.length ? ` The packed ${xs.length === 1 ? 'part was' : 'parts were'} ${andList(xs.map((x) => `the ${x.name}`))}.` : ''}`, { target: p.id, unpack: true });
  }
  if (p.loot) e.lastLoot = p.loot; // a part that drops components broke (a Harvester's and an elite's one more: floorplan.mjs)
  // Components: 60% in a room fight, an elite's always, 35% elsewhere (sockets.mjs); a network rich in components
  // (network.mjs) and a part you've mastered (research.mjs, 25% more) on top.
  if (p.loot && rand(s) < componentChance(s, e, CONFIG.salvageChance) * richMult(s, fightNet(s), 'salvage') * masteryDrop(s, e.virus, p)) {
    gainComponents(s, 1);
    e.metrics?.loot?.push(p.loot);
    emit(s, 'loot', 'Component recovered.', { target: p.id });
  }
  // An .exe build (exe.mjs) broken: one more component, and the Codex learns the build (codex-view.mjs).
  if (p.exe) {
    gainComponents(s, 1);
    emit(s, 'loot', `The ${p.name} gives up a component.`, { target: p.id });
    (s.exeSeen ||= {})[p.exe] = true;
  }
  if (e.lastAttack && e.lastAttack.endsWith(' ' + p.id)) {
    e.lastAttack = null;
    e.autoStopped = true;
  }
  emit(s, 'broken', `${p.name.toUpperCase()} BROKEN${p.attack ? `. ${p.attack.name} stops` : ''}.`, { target: p.id });
  if (p.attack?.effect === 'encrypt' && !p.encrypted) contractDefuse(s); // broken before it ever encrypted you (a contract counts it: mail.mjs)
  if (e.virus.raid) raidBroke(s); // a crew boss's adds go down with it
  if (e.virus.tells) tellBroke(s, p); // its tells stop with it (tells.mjs)
  // Lockbox: held, not lost (docs/puzzle-levers.md 3.4). Half of what its ward held back lands on each partner at once.
  for (const [id, n] of Object.entries(p.held || {})) {
    const t = part(s, id), land = Math.floor(n * CONFIG.wardHeld);
    if (!alive(t) || land <= 0) continue;
    emit(s, 'status', `The ${p.name} breaks open: ${land} of the ${n} it held lands on the ${t.name}.`, { target: t.id, from: p.id, held: land });
    hit(s, t, land, { by: p.name, server: true, pierce: true, flat: true, held: true });
  }
  if (p.held) p.held = null;
  // Mutex: its lock goes with it.
  // (A lock it had already lost doesn't come back either: its relock countdown goes too.)
  if (p.lock) { const t = part(s, p.lock); if (t && !livingParts(s).some((x) => x.lock === t.id)) t.lockAt = null; if (t?.lockHp) { t.lockHp = 0; emit(s, 'status', `The ${t.name}'s lock is gone with the Mutex.`, { target: t.id, lock: 'gone', from: p.id }); } }
  // C2 Node: the fragments lose their command, and drop with it.
  if (p.command) {
    const frags = livingParts(s).filter((x) => x.kind === 'fragment');
    for (const f of frags) f.integrity = 0;
    if (frags.length) emit(s, 'broken', `${frags.length === 1 ? 'Its fragment drops' : `All ${frags.length} fragments drop`} with the C2 Node.`, { target: frags[0].id, c2: true });
  }
  // Tripwire: break it while the others live and they go loud: harder hits, each attack a cycle sooner.
  const hush = p.deadman && !p.quiet && !buffed(e, 'sudo') && fxHas(s, 'quiet-trip'); // Quiet Wire (a native unique)
  if (p.deadman && (buffed(e, 'sudo') || p.quiet || hush)) emit(s, 'status', `The ${p.name} breaks without a sound. ${p.quiet ? 'The Logic Bomb took it clean' : hush ? `${hush.it.name} cut it quietly` : 'Root access kept it quiet'}.`, { target: p.id });
  else if (p.deadman) {
    // Loud both ways (docs/puzzle-levers.md 3.2): they also take more damage (damageMultiplier) and drop their ◆ for good.
    const loud = livingParts(s).filter((x) => x.kind === 'system');
    let shed = 0;
    for (const x of loud) {
      x.loud = true;
      if (x.armor > 0) { shed += x.armor; x.armor = 0; }
      x.patchAt = null;
      const a = x.attack;
      if (!a) continue;
      if (['damage', 'encrypt'].includes(a.effect)) a.amount = Math.max(1, Math.round(a.amount * CONFIG.tripwire.loud));
      if (a.hit) a.hit = Math.max(1, Math.round(a.hit * CONFIG.tripwire.loud));
      if (a.due > e.cycle && a.due < 900) a.due = Math.max(e.cycle, a.due - (p.loudSooner ?? CONFIG.tripwire.sooner)); // its next attack a cycle sooner: one due next cycle lands this one
      if (a.interval > 2) { const cut = Math.min(p.loudSooner ?? CONFIG.tripwire.sooner, a.interval - 2); a.interval -= cut; a.loudCut = cut; } // every attack after it a cycle sooner too (2 at the fastest)
    }
    if (loud.length) emit(s, 'phase', `TRIPWIRE. ${andList(loud.map((x) => x.name))} ${loud.length === 1 ? 'goes' : 'go'} loud: ${Math.round((CONFIG.tripwire.loud - 1) * 100)}% more damage dealt and every attack ${(p.loudSooner ?? CONFIG.tripwire.sooner) > 1 ? `${p.loudSooner ?? CONFIG.tripwire.sooner} cycles` : 'a cycle'} sooner, ${Math.round((CONFIG.tripwire.taken - 1) * 100)}% more damage taken${shed ? ` and ${shed} ◆ dropped` : ''}.`, { target: loud[0].id, tripwire: true, shed });
  }
  // Linked parts (every v2 or bigger virus; the old Rerouting mutation too): a third of the broken part's hit
  // goes to the survivor that attacks next (WoW council fights). A survivor whose attack isn't a hit
  // (Encrypt, Scramble, Replicate) gains a hit on top of what it does (landAttack's `hit`).
  const hitOf = (x) => (x.attack?.effect === 'damage' ? x.attack.amount : x.attack?.hit || 0);
  if ((e.virus.mutation === 'rerouting' || (e.virus.grade >= 2 && !e.virus.unlinked) || e.virus.genes?.some((g) => g.id === 'linked')) && hitOf(p) > 0) {
    const to = livingParts(s).filter((x) => x !== p && x.attack && x.attack.effect !== 'heal' && x.fallback !== p.id).sort((a, b) => a.attack.due - b.attack.due)[0]; // a fallback part takes it whole (below)
    const add = Math.max(1, Math.round(hitOf(p) * CONFIG.linked));
    if (to) {
      if (to.attack.effect === 'damage') to.attack.amount += add; else to.attack.hit = (to.attack.hit || 0) + add;
      to.rerouted = (to.rerouted || 0) + add;
      emit(s, 'reroute', `Linked: ${p.attack.name} passes to the ${to.name}, and its ${to.attack.name} ${to.attack.effect === 'damage' ? 'deals' : 'now hits for'} ${add} more.`, { target: to.id, from: p.id, amount: add });
    }
  }
  // Fallback (a Bouncer's Keyring, a Crawler's Brood, Patchwork's Patcher, a Cryptominer's Cooler): break its partner
  // while it stands and it takes over the partner's attack, so breaking the part that attacks first doesn't leave the
  // other harmless. A part with no attack (or a heal) takes it whole; one whose attack isn't a hit (a Brood's spawns)
  // hits for it on top. Linked passes nothing to it (above): it takes the attack once, whole.
  for (const f of livingParts(s).filter((x) => x.fallback === p.id && p.attack)) {
    const a = p.attack;
    // On its own clock: in place of its own next move (a Patcher's next Patch), or a full interval after the break.
    if (!f.attack || f.attack.effect === 'heal') f.attack = { ...a, due: f.attack ? Math.max(e.cycle + 1, f.attack.due) : e.cycle + Math.max(2, a.interval || 2), n: 0, hasted: false };
    else if (f.attack.effect !== 'damage') f.attack.hit = (f.attack.hit || 0) + (a.effect === 'damage' ? a.amount : a.hit || 0);
    f.tookOver = p.id;
    emit(s, 'reroute', `FALLBACK. The ${f.name} takes over the ${p.name}'s ${a.name}.`, { target: f.id, from: p.id, fallback: true });
  }
  if (zeroDay(s, 'buffer-overflow') && !e.forceCrit) { e.forceCrit = true; emit(s, 'status', 'Buffer Overflow makes your next hit a critical strike.'); }
  // Total Loss (Halcyon, Preferred): the wreck hits everything else. Chains through what it breaks.
  if (zeroDay(s, 'total-loss')) {
    const others = livingParts(s).filter((x) => x !== p);
    if (others.length) emit(s, 'status', `Total Loss: ${p.name} takes the rest down with it.`, { target: p.id });
    for (const x of others) if (alive(x)) hit(s, x, Math.round((p.max || 0) * 0.25), { by: 'Total Loss', server: true });
  }
  // Breaking the Encryptor hands you the key: the encryption stops.
  // An Encryptor.exe (exe.mjs) leaves it on, a step lighter each cycle (the encryption's tick below).
  if (e.encrypt && p.attack?.effect === 'encrypt' && !livingParts(s).some((x) => x.attack?.effect === 'encrypt')) {
    if (p.drain) { e.drain = Math.max(1, p.attack.amount); emit(s, 'status', `The ${p.name} breaks, but your encryption stays on. It drops ${e.drain} a cycle. Purge clears it.`, { target: p.id }); }
    else { e.encrypt = 0; e.burst = null; emit(s, 'decrypted', 'Key recovered. Your server is decrypted.', { target: p.id }); }
  }
  if (e.autoStopped) {
    e.autoStopped = false;
    if (virusIntegrity(s).current > 0) emit(s, 'warning-soft', 'That part is broken. Pick your next target.');
  }
}

// The cooldown a skill you just used starts: its own (cooldownOf), less what your gear takes off this once. Bootstrap
// (first-cd): each skill's first in the fight. Backwash (helper-cd): the next helper skill after a helper expired.
// Never under 1, and a skill with none keeps none.
function fxCooldown(s, id, a) {
  const e = s.encounter, cd = cooldownOf(s, id);
  if (!(cd > 1)) return cd;
  let off = (e.metrics?.actions?.[id] || 0) <= 1 ? fxSum(s, 'custom', 'first-cd') : 0;
  const st = e.fxs;
  if (a?.helper && st?.helperCd) { off += st.helperCd; st.helperCd = 0; }
  return off ? Math.max(1, cd - off) : cd;
}
// The Decoy's beat (docs/puzzle-levers.md 3.8, decided 9.6): your command at one part goes to the part its pointer is on
// (bendOf), whatever it is: a hit, a strip, a burn, a helper, a debuff. Pointing at itself, a hit lands on the Decoy and
// part of it bounces back (hit). Area commands and the ones on you aren't bent; a command at an attack bends only onto a
// part with one, and one that couldn't fire there isn't bent. Sudo, Unmask and Echo Cancel go straight through; Mirror
// Maze (a native unique) lets it through unbent, its hits at its share.
function bendCommand(s, intent) {
  const e = s.encounter, a = ABILITIES[intent.ability], d = mirrorOn(s);
  if (!d || !intent.target || !['part', 'attack'].includes(a?.target) || buffed(e, 'sudo') || d.unmaskUntil >= e.cycle) return intent;
  const to = bendOf(s, d)?.to, self = to === d;
  if (!to || (to.id === intent.target && !self)) return intent;
  const maze = fxHas(s, 'decoy-pass');
  if (maze) {
    if (e.commanding) e.commanding.maze = maze.fx.value;
    emit(s, 'status', `${maze.it.name} gets through the ${d.name}'s bend at ${maze.fx.value}%.`, { target: intent.target });
    return intent;
  }
  const bent = { ...intent, target: to.id, text: `${intent.ability} ${to.id}` };
  if (to.id !== intent.target && validate(s, bent)) return intent;
  if (to.id !== intent.target) emit(s, 'status', `The ${d.name} bends your ${intent.ability === 'spike' ? spikeName(s) : a.name} onto ${self ? 'itself' : `the ${to.name}`}.`, { target: to.id, from: intent.target, bent: true });
  if (e.commanding) Object.assign(e.commanding, { target: to.id, bounce: self ? d.id : null });
  return bent;
}
function useAbility(s, intent, auto = false) {
  const e = s.encounter;
  if (intent.ability === 'hold') {
    e.lastCmd = { id: 'hold', cycle: e.cycle };
    e.metrics.holds++;
    emit(s, 'hold', 'Held. No command fired.');
    return;
  }
  if (intent.ability === 'flee') {
    emit(s, 'fled', `${auto === 'daemon' ? 'Wimpy daemon: ' : ''}EMERGENCY JACK OUT. The guard stays, and you keep your pack.`);
    hooks.flee?.(s);
    return;
  }
  const error = validate(s, intent);
  if (error) {
    emit(s, 'warning', `${auto === 'program' ? '⟳ Your program' : auto ? 'Auto-repeat' : 'Command'} failed: ${error}`);
    return;
  }
  if (auto !== 'daemon') intent = bendCommand(s, intent);
  const id = intent.ability;
  const a = id === 'spike' ? { ...ABILITIES.spike, name: spikeName(s) } : ABILITIES[id];
  const target = part(s, intent.target);
  // What a set bonus compares after the skill (sets.mjs SET_HOOKS.used): your shield, the parts' jams and timers, the
  // helpers and burns already out, and the crew's Signal and shields. Only with a set piece loaded.
  const before = sxOf(s) ? { shield: e.shield || 0, parts: Object.fromEntries(livingParts(s).map((p) => [p.id, { jam: p.jammedUntil || 0, due: p.attack?.due }])), burns: new Set(e.burns), helpers: new Set(e.helpers), allies: alliesOf(s).map((a) => ({ who: a.who, st: a.st, integrity: defender(a.st)?.integrity || 0, shield: a.st.encounter?.shield || 0 })) } : null;
  e.metrics.actions[id] = (e.metrics.actions[id] || 0) + 1;
  noteUse(s, id, auto, classOf(s)); // ability mastery (mastery.mjs): yours, not a daemon's or a crewmate's
  if (auto === 'daemon') e.metrics.daemon = (e.metrics.daemon || 0) + 1;
  else if (auto) e.metrics.auto++;
  if (!intent.ignoreCooldown) e.readyAt[id] = e.cycle + fxCooldown(s, id, a);
  if (a.once) e.once[id] = true;
  emit(s, 'resolved', `${auto === 'daemon' ? `Daemon ${intent.daemon}: ` : auto === 'program' ? '⟳ ' : ''}${said(s, intent.text)}${auto && auto !== 'daemon' && auto !== 'program' ? ' (timer ran out)' : ''}.`, { ability: id, target: intent.target, auto });
  const base = target ? skillBase(s, id, target) : 0;
  e.lastSkill = id;
  e.lastCmd = { id, cycle: e.cycle, target: intent.target || null }; // what the Mimic plays back (tells.mjs)
  e.cmdLog = [...(e.cmdLog || []).slice(-2), e.lastCmd]; // a Mimic.exe plays back the dearer of your last two
  // An empty cycle Spikes the last part you hit.
  if (base && auto !== 'daemon') e.lastAttack = `spike ${intent.target}`;

  // One verb per skill.
  // Misses: a damaging skill can miss (the enemy's evasion, less your Accuracy). It does
  // nothing at all, and the cooldown is still spent.
  if ((base || a.all) && missChance(s) > 0 && rand(s) * 100 < missChance(s)) {
    e.metrics.misses++;
    emit(s, 'miss', `${a.name} MISSES${target ? ' ' + target.name : ''}.${cooldownOf(s, id) > 1 && !intent.ignoreCooldown ? ` Cooldown spent (${cooldownOf(s, id)}).` : ''}`, { target: target?.id, ability: id });
    // Race Condition (Zero-day): the first miss each fight gives the cooldown straight back.
    if (zeroDay(s, 'race-condition') && !e.once.race) { e.once.race = true; delete e.readyAt[id]; emit(s, 'status', `Race Condition: ${a.name} is ready again.`); }
    classEach('used', s, { id, target, res: null, before }); // a miss still counts as a skill used (sets.mjs)
    return;
  }
  // Scrambled (Ghostroot's Scrambler): the attack may turn on you, at half strength. The cooldown is spent.
  if ((base || a.all) && e.scrambleUntil >= e.cycle && rand(s) < CONFIG.scramble.chance) {
    const amount = Math.max(1, Math.round((base || a.all * powerOf(s)) * (e.scrambleSelf ?? CONFIG.scramble.self))); // a Scrambler.exe's: at full
    const dealt = takeDamage(s, amount, null, a.name);
    emit(s, 'scrambled', `SCRAMBLED. ${a.name} hits YOU for ${dealt}.`, { ability: id, amount: dealt });
    classEach('used', s, { id, target, res: null, before });
    return;
  }
  const rootkit = base && rootkitReady(s);
  if (rootkit) e.once.rootkit = true;
  if (a.counts && e.commanding) e.commanding.counts = a.counts; // Fuzz: its hit counts twice against a tell
  // Null Route: your next skill crits.
  const crit = base > 0 && e.nextCrit ? ((e.nextCrit = false), true) : false;
  const res = base ? hit(s, target, base, { mine: true, crit, chits: a.chits, pierce: ignoresArmor(s, id) || rootkit, unlock: !!a.unlock, by: rootkit && target.armor > 0 ? 'Rootkit' : undefined }) : null;
  if (id === 'overload' && hasTalent(s, 'piercing')) e.once.pierced = true;
  // Echo: the hit may repeat for half (on armor, it breaks another chit).
  if (base && alive(target) && gearStat(s, 'echo') && rand(s) * 100 < gearStat(s, 'echo')) hit(s, target, Math.max(1, Math.round(base * (fxHas(s, 'echo-full') ? 1 : ECHO.share))), { mine: true, by: 'Echo' });
  // Init Vector (repeat): armed every few cycles (cycleClose), your next damaging skill hits again for its share.
  const rep = base && alive(target) && e.fxs?.repeat;
  if (rep) { e.fxs.repeat = null; hit(s, target, Math.max(1, Math.round((base * rep.share) / 100)), { mine: true, by: rep.name }); }
  // Overload: a crit resets its cooldown.
  if (id === 'overload' && res?.crit) { delete e.readyAt.overload; emit(s, 'proc', 'Overload lands a critical strike and is ready again.', { ability: 'overload' }); }
  if (a.proc) delete e.procs[a.proc]; // Shatter, Retaliate, Opening spend their window
  if (a.lifesteal && res?.dealt) heal(s, Math.max(1, Math.round(res.dealt * a.lifesteal * restoreMult(s) * classMult('drawn', s))), a.name); // drawn: a class's heals from its hits (the Sysop alone heals from what it would have dealt)
  if (a.all) for (const p of livingParts(s)) hit(s, p, a.all * powerOf(s) * (a.fragx && p.kind === 'fragment' ? a.fragx : 1), { mine: true, by: a.name }); // fragments take more (Fork Bomb, Garbage Collect)
  if (id === 'garbage-collect') for (const h of e.helpers) h.left++;
  if (id === 'failover') {
    const d = defender(s);
    const amount = Math.max(scaled(s, 20), Math.round((d.max - d.integrity) / 4));
    for (const p of livingParts(s)) hit(s, p, amount, { mine: true, by: a.name });
  }
  if (a.status && alive(target)) {
    let n = a.cycles;
    if (id === 'tag' && hasTalent(s, 'supercookie')) n = 6;
    if (id === 'tag') { target.tagBoost = e.surprise ? CONFIG.surprise.tagged - SKILLS.tagged : 0; if (e.surprise) n = Math.max(n, CONFIG.surprise.tagCycles); }
    // Rate Limit: Throttled through its next attack (never shortening a longer Throttle).
    if (id === 'rate-limit') n = Math.max(0, (target.attack?.due ?? e.cycle) - e.cycle);
    // Throttle (Warden) on a part gone loud: longer, and the loud wears off.
    if (id === 'throttle' && (target.loud || e.virus.buffs?.loud >= e.cycle || (target.enrage && target.integrity < target.max / 2))) {
      n = a.loud;
      if (target.loud && target.attack) { const k = CONFIG.tripwire.loud; for (const f of ['amount', 'hit']) if (target.attack[f] && (f === 'hit' || ['damage', 'encrypt'].includes(target.attack.effect))) target.attack[f] = Math.max(1, Math.round(target.attack[f] / k)); if (target.attack.loudCut) { target.attack.interval += target.attack.loudCut; target.attack.loudCut = 0; } target.loud = false; emit(s, 'status', `${target.name} quiets down: it isn't loud any more.`, { target: target.id }); }
    }
    target[a.status + 'Until'] = id === 'rate-limit' ? Math.max(target[a.status + 'Until'] || 0, e.cycle + n) : e.cycle + n;
    emit(s, 'status', id === 'rate-limit' ? `${target.name} ${STATUS_WORD[a.status]} for its next attack.` : `${target.name} ${id === 'tag' && target.tagBoost ? `Tagged (burns +${Math.round((CONFIG.surprise.tagged - 1) * 100)}%, timer visible)` : STATUS_WORD[a.status]} for ${n} ${n === 1 ? 'cycle' : 'cycles'}.`, { target: target.id, mark: a.status, ability: id });
  }
  if (a.tick && a.verb === 'burn' && target) {
    // Inject: Long Fuse makes it longer. Reapplied, it refreshes the one already on the part (the longer
    // duration of the two) instead of adding a second. Fired in the Surprise window it also ticks at once.
    const ticks = id === 'inject' ? injectTicks(s) : a.ticks;
    const tick = scaled(s, id === 'inject' ? injectTick(s) : a.tick);
    const was = a.refresh && burnsOn(s, target).some((b) => b.id === id);
    const b = addBurn(e, { id, target: target.id, damage: tick, grow: a.grow ? scaled(s, a.grow) : 0, left: ticks, name: a.name, drain: a.drain ? healScaled(s, a.drain) : 0, synced: !!e.synced });
    emit(s, 'status', was ? `${a.name} refreshed on the ${target.name}: ${b.damage} every cycle for ${b.left} cycles.` : `${target.name} is burning for ${tick}${a.grow ? ', growing,' : ''} every cycle${ticks > 20 ? ' until it breaks' : ` for ${ticks} cycles`}.`, { target: target.id, mark: 'burn', ability: id });
    if (id === 'inject' && e.surprise) for (let k = 0; k < CONFIG.surprise.injectNow && alive(target); k++) hit(s, target, b.damage, { by: 'Inject (Surprise)', dot: true, synced: b.synced });
  }
  if (id === 'purge') coolRatchet(s);
  if (id === 'purge' && (e.encrypt || e.burst || e.corrupt)) { const what = e.corrupt && !(e.encrypt || e.burst) ? 'corruption' : 'encryption'; e.encrypt = 0; e.burst = null; e.corrupt = null; emit(s, 'decrypted', `Purge clears your ${what}.`); }
  if (id === 'purge' && e.badBlock) { e.badBlock = null; emit(s, 'decrypted', 'Purge clears your cracked cells.'); }
  if (id === 'purge' && e.virus.raid) cleanse(s, ['dots', 'stress']); // a crew boss's damage over time and Thermal Stress
  if (id === 'sigint') { if (e.virus.raid) sigint(s); else tellSigint(s); } // a crew boss's cast, or a solo one (tells.mjs)
  if (a.verb === 'heal' && e.virus.raid) noteHeal(s); // the healer rule (raid.mjs)
  if (a.helper) {
    let dmg = a.helper, n = a.ticks, count = a.helpers || 1;
    if (id === 'deploy') {
      if (hasTalent(s, 'big-process')) dmg = 14;
      dmg += rank(s, 'thread-pool');
      if (hasTalent(s, 'long-running')) n = 6;
      if (hasTalent(s, 'parallel-deploy')) { count = 2; dmg = Math.round(dmg / 2); }
    }
    if (id === 'botnet') { if (hasTalent(s, 'extra-nodes')) count = 4; dmg += rank(s, 'node-pool'); }
    dmg = scaled(s, dmg);
    count = Math.min(count, helperCap(s) - e.helpers.length);
    for (let k = 0; k < count; k++) e.helpers.push({ target: target.id, damage: dmg, left: n, synced: !!e.synced, sent: e.cycle, by: a.name });
    emit(s, 'status', count > 0 ? `${count === 1 ? 'A helper' : count + ' helpers'} on the ${target.name}, dealing ${dmg} every cycle for ${n} cycles.` : `Helper cap reached (${helperCap(s)}).`, { target: target.id, mark: count > 0 ? 'helper' : null, ability: id });
  }
  // Jam and Barrier spend one of your helpers on that part.
  if (a.recall) {
    const h = helpersOn(s, target)[0];
    e.helpers.splice(e.helpers.indexOf(h), 1);
    if (id === 'barrier') { const amount = h.damage * h.left; e.shield = (e.shield || 0) + amount; emit(s, 'status', `Barrier turns a helper into a ${amount} shield (${e.shield} in all).`, { mark: 'shield', ability: id }); }
  }
  const moved = a.delay && target ? delayAttack(s, target, a.delay) : 0; // a class hook answering a tell needs it (Suspend, Spoofed ACK)
  if (moved) {
    if (target.attack.ramp && target.attack.step) { target.attack.step = 0; emit(s, 'status', `${target.attack.name} resets, and its ramp starts over.`, { target: target.id }); }
    e.metrics.interrupts++;
    emit(s, 'interrupt', `${target.attack.name} delayed ${moved} ${moved === 1 ? 'cycle' : 'cycles'}.`, { target: target.id });
    openProc(s, 'slipped');
  } else if (a.delay && target?.attack) heldNote(s, target);
  if (['brace', 'sudo', 'fork'].includes(id)) {
    e.buffs[id] = e.cycle + a.cycles - 1;
    emit(s, 'status', `${a.name} for ${a.cycles} cycles.`, { mark: 'buff', ability: id });
  }
  if (a.shield) {
    const amount = scaled(s, id === 'firewall' ? (hasTalent(s, 'deep-packet-inspection') ? 30 : a.shield) + 5 * rank(s, 'stateful-firewall') : a.shield);
    e.shield = Math.max(e.shield || 0, amount);
    emit(s, 'status', `Shield up. It absorbs the next ${amount} damage.`, { mark: 'shield', ability: id });
  }
  // Taunt (Bastion Firewall), in a crew only: every damage attack comes at you for a.taunt cycles.
  if (a.taunt && (s.who || hooks.crewTurns?.(s))) {
    e.buffs.sinkhole = e.cycle + a.taunt - 1;
    emit(s, 'status', `Drawing fire. Every attack comes at ${s.who || 'you'} for ${a.taunt} cycles.`, { mark: 'buff', ability: id });
  }
  if (id === 'patch') {
    const to = (intent.ally && allyOf(s, intent.ally)) || s, label = to === s ? a.name : `${a.name} from ${s.who || 'you'}`;
    heal(to, healScaled(s, (hasTalent(s, 'service-pack') ? a.pack : a.heal) + 3 * rank(s, 'patch-notes')), label);
    to.encounter.regen = { amount: healScaled(s, a.tick), left: a.ticks, from: to.encounter.cycle + 1, name: label };
    if (e.virus.raid) cleanse(to, ['dots']); // a crew boss's Corruption: Patch cleanses it (raid.mjs)
  }
  if (id === 'null-route') { e.nullRoute = 1; e.nextCrit = true; emit(s, 'status', 'Null-routed. The next attack misses you, and your next skill is a critical strike.', { mark: 'buff', ability: id }); }
  if (id === 'crack') {
    const n = Math.min(a.strip, target.armor);
    target.armor -= n;
    if (n) classEach('chipped', s, target, n, { mine: true });
    if (!target.armor) stripMark(s, target);
    emit(s, 'armor', `Crack: ${target.name} loses ${n} ◆${target.armor ? ` (${target.armor} left)` : `. Its armor is broken, and it patches in ${patchDelay(s)} ${patchDelay(s) === 1 ? 'cycle' : 'cycles'}`}.`, { target: target.id, left: target.armor });
    if (!target.armor) { target.patchAt = e.cycle + patchDelay(s); openProc(s, 'stripped', { part: target.id }); }
  }
  if (id === 'harden') { e.chits = (e.chits || 0) + 1; emit(s, 'status', `Hardened. The next attack on you does nothing${e.chits > 1 ? ` (${e.chits} ◆)` : ''}.`, { mark: 'shield', ability: id }); }
  if (id === 'detonate') {
    // A Rootkit Implant burns until the part breaks: it has no "rest" to cash in, so it keeps burning
    // (cashing in its 99-tick timer one-shot any part).
    const mine = burnsOn(s, target).filter((b) => b.id !== 'implant');
    let total = 0, ticks = 0;
    for (const b of mine) { for (let k = 0; k < b.left; k++) total += b.damage + (b.grow || 0) * k; ticks += b.left; e.burns.splice(e.burns.indexOf(b), 1); }
    hit(s, target, Math.round((total * dotMult(s) + ticks * gearStat(s, 'payload')) * a.mult * (hasTalent(s, 'assassinate') && on(s, target, 'tagged') ? 2 : 1)), { by: 'Detonate', pierce: true }); // burns' worth, Payload included
  }
  if (id === 'propagate') {
    // Fragments catch the copies at double.
    const mine = burnsOn(s, target);
    let n = 0;
    for (const p of livingParts(s)) if (p.id !== target.id) for (const b of mine) { addBurn(e, { ...b, target: p.id, damage: p.kind === 'fragment' ? b.damage * 2 : b.damage }); n++; }
    emit(s, 'status', `Propagate: ${n} ${n === 1 ? 'burn' : 'burns'} copied to the other parts${livingParts(s).some((p) => p.kind === 'fragment') ? ', fragments at double' : ''}.`, { mark: 'burn', ability: id });
  }
  if (id === 'reroute') {
    for (const h of e.helpers) { h.target = target.id; h.sent = e.cycle; hit(s, target, h.damage, { by: 'Helper', dot: true, src: 'helper' }); if (!alive(target)) break; } // sent there now (the Mimic's beat counts it: tells.mjs)
  }
  if (id === 'cron-storm') {
    for (const h of [...e.helpers]) { const t = alive(part(s, h.target)) ? part(s, h.target) : soonestAttacker(s); if (t) hit(s, t, h.damage, { by: 'Cron Storm', dot: true, src: 'helper' }); if (virusIntegrity(s).current === 0) break; }
  }
  if (id === 'kill-switch') {
    // Supervisor (Operator talent): cashing in your helpers readies Deploy.
    if (hasTalent(s, 'supervisor') && e.readyAt.deploy) { delete e.readyAt.deploy; emit(s, 'proc', 'Supervisor: Deploy is ready.', { ability: 'deploy' }); }
    for (const h of e.helpers.splice(0)) {
      const t = alive(part(s, h.target)) ? part(s, h.target) : soonestAttacker(s);
      // Last Gasp comes with it, so cashing in early loses nothing. On armor each hit it had left breaks a ◆ first,
      // as it would have, and the rest land at once.
      let n = h.left + (edge(s, 'operator') ? 1 : 0);
      if (t) { while (n > 0 && t.armor > 0 && alive(t)) { hit(s, t, h.damage, { by: 'Kill Switch', dot: true, src: 'helper' }); n--; } if (n > 0 && alive(t)) hit(s, t, Math.round(h.damage * n * (1 + 0.05 * rank(s, 'dead-mans-switch'))), { by: 'Kill Switch', dot: true, src: 'helper' }); }
    }
  }
  if (id === 'keepalive') {
    // Every burn on it ticks once now (without using itself up), then runs longer.
    for (const b of burnsOn(s, target)) { if (!alive(target)) break; hit(s, target, b.damage + (b.fxGrow || 0), { by: `Keepalive (${b.name})`, dot: true, synced: b.synced }); }
    stretchBurns(s, target, e.surprise ? CONFIG.surprise.keepalive : a.cycles, 'Keepalive');
  }
  // A subclass skill's own effect (dist/classes/<class>.mjs). to: the crewmate an ally skill was aimed at.
  classUse(id)?.(s, { a, id, target, to: (intent.ally && allyOf(s, intent.ally)) || s, res, base, intent, auto, e, moved });
  classEach('used', s, { id, target, res, before }); // set bonuses on what the skill did (sets.mjs)
  hooks.commanded?.(s, { id, target, res, auto }); // a skill rule acts after the command it changes (skillrules.mjs)
}
// Who's standing beside you in this fight, by name ('you' is the player): for ally skills and class modules.
export const alliesOf = (s) => hooks.crewAllies?.(s) || [];
const STATUS_WORD = { exposed: 'Exposed (+25% critical strike chance)', tagged: 'Tagged (burns +50%, timer visible)', hooked: 'Hooked (+6 per hit)', throttled: 'Throttled (attacks deal half)', quarantined: 'Quarantined (+25% damage)' };

// Your class's edge (EDGE in data.mjs), from its level.
// Since subclasses, a class's old edge is one subclass's (EDGE[cls].sub).
export const edge = (s, cls) => CONFIG.edges !== false && classOf(s) === cls && subOf(s) === EDGE[cls].sub; // CONFIG.edges: tests of other numbers turn them off
// Keepalive and the Infiltrator's Sync: every burn on a part runs longer.
export function stretchBurns(s, t, cycles, label) {
  const burns = alive(t) ? burnsOn(s, t) : [];
  if (!burns.length) return false;
  for (const b of burns) b.left += cycles;
  emit(s, 'status', `${label} extends ${burns.length} burn${burns.length === 1 ? '' : 's'} on the ${t.name} by ${cycles} cycle${cycles === 1 ? '' : 's'}.`, { target: t.id });
  return true;
}

// Who else is standing in this fight, by name ('you' for the player, to a crewmate): crew.mjs.
const allyOf = (s, who) => hooks.crewAllies?.(s)?.find((x) => x.who === who)?.st || null;
// How high healing can take you. In a breach, never past the Signal you brought into the fight (breach.mjs
// fightFrom): heals and shields count inside a fight, defrag and patches between them. The bar marks it (healCap).
const fightFromOf = (s) => (s.run?.breach ? s.breach?.fightFrom : s.run?.rooms ? s.rooms?.fightFrom : null); // a breach's, or a server room's (floorplan.mjs)
export const healCap = (s) => { const d = defender(s), from = fightFromOf(s); return from != null ? Math.min(d.max, from) : d.max; };
// lift: a restore that counts like a patch (the Sasser script): it ignores the cap and raises it with you.
export function heal(s, amount, label, { lift = false, gear = null } = {}) {
  const d = defender(s);
  const more = s.encounter ? fxSum(s, 'always', 'heal%') : 0; // the healing you receive (Sump Pump, Bedframe)
  if (more) amount = Math.max(1, Math.round(amount * (1 + more / 100)));
  if (s.encounter?.virus?.raid) amount = raidAbsorb(s, amount); // encrypted sectors (raid.mjs)
  amount = Math.round(amount * classMult('healing', s, label)); // a heal you cast, larger (Runbook: sets.mjs)
  const bb = s.encounter?.badBlock; // Bad Block: the cracked cells eat the heal first
  if (bb?.left > 0 && amount > 0) { const eat = Math.min(bb.left, amount); bb.left -= eat; amount -= eat; if (!bb.left) s.encounter.badBlock = null; emit(s, 'blocked', `${bb.name}: ${eat} of ${label} is lost in the cracked cells.`, { source: bb.source, badblock: eat }); if (!amount) return; }
  const cap = lift ? d.max : healCap(s), healed = Math.max(0, Math.min(amount, cap - d.integrity));
  d.integrity += healed;
  if (healed < amount && d.integrity >= d.max) classEach('overheal', s, amount - healed); // healing past full (On-Call: sets.mjs)
  if (s.encounter?.commanding && healed) fxState(s.encounter).healed = (fxState(s.encounter).healed || 0) + healed; // what your command healed (Anchor Chain's next heal)
  if (lift && s.run?.breach && s.breach?.fightFrom != null) s.breach.fightFrom = Math.max(s.breach.fightFrom, d.integrity);
  if (lift && s.run?.rooms && s.rooms?.fightFrom != null) s.rooms.fightFrom = Math.max(s.rooms.fightFrom, d.integrity);
  emit(s, 'heal', `${label} +${healed}${healed < amount && cap < d.max ? ` (capped at ${cap}, the Signal you came in with)` : ''}. ${s.encounter.mode === 'run' ? 'Signal' : 'Server'} ${d.integrity}/${d.max}.`, { amount: healed, ...(gear ? { gear } : {}) });
}

// Bastion Uptime: once per fight, a blow that would drop you to 0 leaves you at 1.
function survive(s, d, dmg) {
  const e = s.encounter;
  if (d.integrity - dmg <= 0 && hasTalent(s, 'uptime') && !e.once.uptime) {
    e.once.uptime = true;
    emit(s, 'heal', 'Uptime holds you at 1.');
    return Math.max(0, d.integrity - 1);
  }
  if (d.integrity - dmg <= 0 && hooks.lastBlow) { const kept = hooks.lastBlow(s, d, dmg); if (kept != null) return kept; } // a breach's Restore Point (breach.mjs)
  if (d.integrity - dmg <= 0) { const kept = classFirst('lastBlow', s, d, dmg); if (kept != null) return kept; } // Bedrock (4) (sets.mjs)
  if (d.integrity - dmg <= 0) { const kept = lifeline(s, d, dmg); if (kept != null) return kept; } // the Lifeline daemon
  return dmg;
}

// Restore from backup: undo the last attack (heal its damage, or delete the fragment it spawned)
// and wipe all encryption.
function rollback(s) {
  const e = s.encounter;
  const u = e.undo;
  e.undo = null;
  if (u?.type === 'damage') heal(s, u.amount, 'Rolled back');
  if (u?.type === 'replicate') { const f = part(s, u.part); if (alive(f)) { f.integrity = 0; emit(s, 'heal', `Rolled back. ${f.name} is deleted.`, { target: f.id }); } }
  coolRatchet(s);
  if (e.encrypt || e.burst || e.corrupt) { e.encrypt = 0; e.burst = null; e.corrupt = null; emit(s, 'decrypted', 'Rolled back. Your encryption is wiped.'); }
  if (e.badBlock) { e.badBlock = null; emit(s, 'decrypted', 'Rolled back. Your cracked cells are clean.'); }
}

// Block: taken off every hit, but a hit never drops below half.
export const blockOf = (s) => defense(s, 'reduction');
export const blocked = (s, amount) => (blockOf(s) ? Math.max(Math.ceil(amount / 2), amount - blockOf(s)) : amount);

// Special attacks: the ones Lockdown shuts off.
const SPECIALS = ['encrypt', 'scramble', 'replicate'];
// Purge or Rollback: a Ratchet's stack starts over, its next step a full step away (as an Encryptor's next Encrypt).
function coolRatchet(s) {
  const e = s.encounter;
  for (const p of livingParts(s)) if (heatOf(p, e.cycle + 1)) { p.ratchet.from = e.cycle + p.ratchet.every - 1; emit(s, 'decrypted', `${p.name}'s ${p.ratchet.name} starts over.`, { target: p.id }); }
}

// Damage from an attack or from encryption: your shield soaks it first.
// dot: damage over time on you (encryption, a Full Disk burst, Corrupted, an Echo's repeat).
export function takeDamage(s, amount, source, label, { dot = false } = {}) {
  const e = s.encounter;
  const d = defender(s);
  // Your gear's cut to the damage you take while its condition holds (Ballast, Brownout, Cofferdam, Strata).
  const less = fxSum(s, 'always', 'taken%');
  if (less) amount = Math.max(0, Math.round(amount * Math.max(0, 1 - less / 100)));
  // Reduction: the rig's on runs, the server's at home. Cold Iron (block-dot): all of it off damage over time.
  amount = dot && blockOf(s) && fxHas(s, 'block-dot') ? Math.max(0, amount - blockOf(s)) : blocked(s, amount);
  if (e.shield > 0) {
    // Bedrock Seal (shield-absorb): each point of shield takes more than one point of damage.
    const k = 1 + fxSum(s, 'custom', 'shield-absorb') / 100;
    const soaked = Math.min(k > 1 ? Math.floor(e.shield * k + 1e-9) : e.shield, amount);
    e.shield -= k > 1 ? Math.min(e.shield, Math.ceil(soaked / k - 1e-9)) : soaked;
    amount -= soaked;
    emit(s, 'blocked', `Shield absorbs ${soaked} of ${label}${e.shield ? ` (${e.shield} left)` : ''}.`, { source, amount: soaked, shield: true });
    if (soaked) daemonsOn(s, 'soaked', { source }); // Backscatter
  }
  const dealt = survive(s, d, Math.min(d.integrity, amount));
  d.integrity -= dealt;
  if (e.mode === 'home' && dealt) wear(s, dealt); // your server's Integrity: it wears your firewall
  e.metrics.attackDamage += dealt;
  lifelineHeal(s); // a Lifeline that just held you at 1 (daemons.mjs)
  if (dealt) daemonsHurt(s, source); // below half, below a quarter: Canary, Snapshot, Spite, Checkpoint
  if (dealt && d.integrity > 0) rewind(s);
  return dealt;
}
// Last Known Good (rewind): once a fight, below 20% your Signal goes back to what it was `value` cycles ago (the end of
// that cycle: cycleClose keeps the last few), healing at most `cap`% of your max. Never down, and never past the heal cap.
function rewind(s) {
  const e = s.encounter, d = defender(s), x = fxFire(s, 'struck', { do: 'rewind' }, false)[0];
  if (!x) return;
  const was = fxState(e).sig || {}, at = e.cycle - (Number(x.fx.value) || 3), keys = Object.keys(was).map(Number).filter((c) => c <= at);
  const then = keys.length ? was[Math.max(...keys)] : was[Math.min(...Object.keys(was).map(Number))] ?? d.integrity;
  const got = Math.max(0, Math.min(then - d.integrity, Math.round((d.max * (x.fx.cap || 100)) / 100), healCap(s) - d.integrity));
  if (!got) return; // nothing to go back to: it waits for a fall that it can undo
  fxSpend(s, x.fx, x.id);
  d.integrity += got;
  emit(s, 'heal', `${x.name || x.it.name}: your Signal goes back to where it was ${Number(x.fx.value) || 3} cycles ago, +${got}. Signal ${d.integrity}/${d.max}.`, { amount: got, ...firedOf([x]) });
}
// The Signal you held at the end of each recent cycle (and as the fight started, as the cycle before its first), for
// rewind and the death recap's strip (recap.mjs).
function noteSignal(s, at = s.encounter.cycle) {
  const st = fxState(s.encounter);
  st.sig = { ...(st.sig || {}), [at]: defender(s).integrity };
  for (const c of Object.keys(st.sig)) if (Number(c) < at - 6) delete st.sig[c];
}

// A crew boss's mechanic landing on one player (raid.mjs): a buster, a pulse, a burst, a tick of
// Corruption. It can't miss or crit, but your armor chit stops it whole, Null Route dodges it (not a tick
// of damage over time), and shields, Block, Bulkhead, DMZ, Thermal Stress and Hot Standby all count.
export function mechanicHit(s, amount, label, source = 'raid', opts = {}) {
  const e = s.encounter;
  if (!e || defender(s).integrity <= 0) return 0;
  if (!opts.dot && (e.nullRoute > 0 || e.buffs['null-route'] >= e.cycle)) { dodged(e); emit(s, 'blocked', `${label} misses ${s.who || 'you'}, null-routed.`, { source }); openProc(s, 'slipped'); slipLonger(s); return 0; }
  if (!opts.dot && e.chits > 0) { e.chits--; emit(s, 'blocked', `${label} hits ${s.who ? s.who + '\'s' : 'your'} ◆ and does nothing.`, { source }); return 0; }
  const p = { id: source, name: label, integrity: 1, max: 1, attack: { name: label, effect: 'damage', amount, interval: 99 } };
  const dealt = takeDamage(s, absorbed(s, Math.max(1, Math.round(amount * classMult('taken', s, p.attack, p) * raidTaken(s))), p.attack, p), source, label);
  if (dealt) { classEach('struck', s, p.attack, dealt, p); e.undo = { type: 'damage', amount: dealt }; }
  return dealt;
}

// Class modules' last word on what an attack deals you (absorb hooks: Circuit Breaker caps it, Load Shed spreads
// it over your helpers, Honeypot takes some off): applied in turn, after every multiplier.
const absorbed = (s, amount, atk, p) => classHooks().reduce((n, h) => (h.absorb ? Math.max(0, Math.round(h.absorb(s, n, atk, p) ?? n)) : n), amount);
// Null Route spends its dodge; Vanish (Phantom) holds two.
function dodged(e) { if (e.nullRoute > 1) e.nullRoute--; else { e.nullRoute = 0; delete e.buffs['null-route']; } }
// Vanish: each miss it gives leaves Opening lit for 2 cycles.
function slipLonger(s) {
  const e = s.encounter;
  if (!(e.slipLong > 0)) return;
  e.slipLong--;
  if (e.procs?.slipped) e.procs.slipped.until = Math.max(e.procs.slipped.until, e.cycle + 2);
}
// What an attack hits for right now: Floodgate's ramp and Bricker's rage included.
export function attackAmount(p) {
  const a = p.attack;
  let n = a.amount + (a.ramp ? (a.step || 0) * (a.rampBy || 1) : 0) + (a.bonus || 0) + (a.lift || 0); // lift: a Cipher Block's or a Fan-in's (liftOf)
  if (p.enrage && p.integrity < p.max / 2) n *= CONFIG.enrage;
  return Math.round(n);
}

// A Cipher Block hits harder for each Encrypt on you, a Fan-in for each fragment on the board: its attack's lift now.
export function liftOf(s) {
  const e = s.encounter;
  if (!e?.virus) return;
  const enc = livingParts(s).find((x) => x.attack?.effect === 'encrypt'), stacks = (e.encrypt > 0 ? Math.max(1, Math.round(e.encrypt / Math.max(1, enc?.attack.amount || e.encrypt))) : 0)
    + livingParts(s).reduce((n, x) => n + (x.ratchet ? Math.round(heatOf(x, e.cycle) / x.ratchet.amount) : 0), 0); // a Ratchet's steps count as Encrypts (parts.mjs)
  const frags = livingParts(s).filter((x) => x.kind === 'fragment').length;
  for (const p of livingParts(s)) if (p.attack && (p.cipher || p.fanin)) p.attack.lift = Math.round(p.attack.amount * ((p.cipher || 0) * stacks + (p.fanin || 0) * frags));
}
// The cycles a part's attack lands on, from now until `until` (exclusive): its timer, then its interval; a volley
// (taps: a Repeater, a Prism) on back to back cycles, its next volley an interval after the first.
export function landingsOf(p, until) {
  const a = p.attack, out = [];
  if (!a || a.due >= 900) return out;
  if (!p.taps) { for (let c = a.due; c < until; c += Math.max(1, a.interval)) out.push(c); return out; }
  let start = a.tap ? a.volley : a.due, k = a.tap || 0, c = a.due;
  while (c < until && out.length < 40) {
    out.push(c);
    k++;
    if (k < p.taps) c++;
    else { start = start + Math.max(1, a.interval); c = Math.max(start, c + 1); k = 0; }
  }
  return out;
}
// C2 Node: while it lives, fragments gnaw harder (CONFIG.c2).
export const c2Gnaw = (s, p) => { const c = p.kind === 'fragment' ? livingParts(s).filter((x) => x.command) : []; return c.length ? 1 + Math.max(...c.map((x) => x.gnaw ?? CONFIG.c2.gnaw)) : 1; }; // a C2 Node.exe's gnaw
// A player drawing fire this cycle (Bastion Firewall in a crew): the one every attack goes at.
export const drawingFire = (s) => (s.encounter?.buffs?.sinkhole >= s.encounter?.cycle ? s : null);

// The spike cap (CONFIG.spikeCap): a solo boss's single landing never takes more than 60% of your max, and a wild
// virus's or a guard's charge (a tell, atk.tell) no more than 45%. A crew boss (raid.mjs) is left to its own rules.
export const spikeCap = (s, atk = null) => {
  const e = s.encounter, share = e?.virus?.raid ? null : e?.virus?.boss ? CONFIG.spikeCap.boss : atk?.tell ? CONFIG.spikeCap.wild : null;
  return share ? Math.max(1, Math.floor(defender(s).max * share)) : Infinity;
};
const spikeCapped = (s, n, atk) => Math.min(n, spikeCap(s, atk));
// Mooring (hit-cap): no single attack takes more than its share of your max.
const hitCapped = (s, n) => { const x = fxHas(s, 'hit-cap'); return x ? Math.min(n, Math.max(1, Math.floor((defender(s).max * (Number(x.fx.value) || 100)) / 100))) : n; };
// Bilge (burn-sap): each burn you started on a part this fight takes a share off its hits on you, up to the cap.
const sapOf = (s, p) => { const x = fxHas(s, 'burn-sap'), n = s.encounter?.fxs?.burned?.[p.id] || 0; return x && n ? 1 - Math.min(x.fx.cap || 100, n * (Number(x.fx.value) || 0)) / 100 : 1; };
// After an attack reaches you, hit or soaked: what your gear stacks or banks on it (Seawall's Block, Anchor Chain's next heal).
function struckFx(s, atk) {
  const st = fxState(s.encounter);
  for (const x of fxFire(s, 'struck', { do: 'stack', atk })) { const had = (st.stack ||= {})[x.id] || 0; st.stack[x.id] = Math.min(x.fx.cap || Infinity, had + x.value); if (st.stack[x.id] > had) emit(s, 'status', `${x.name || x.it.name}: +${st.stack[x.id] - had} ${STATS[x.fx.stat]?.name || x.fx.stat} for the fight (${st.stack[x.id]}).`, { mark: 'shield', ...firedOf([x]) }); }
  for (const x of fxFire(s, 'struck', { do: 'next-boost', atk })) st.boost = { value: Math.max(st.boost?.value || 0, x.value), name: x.name || x.it.name, id: x.id };
}
// A timed buff of a stat your gear runs now (Turbidity's Stealth).
const buffStat = (s, stat) => (!s.encounter?.fxs?.buff ? 0 : uniqueFx(s).reduce((n, x) => n + (x.fx.do === 'buff' && x.fx.stat === stat && x.it?.unique ? fightStat(s, x.it.unique, x.fx, Number(x.id.split(':')[1] || 0), stat) : 0), 0));
// A Scraper's landing (genes.mjs scraper): it takes the buffs you put up before it landed. Your ◆ it takes as it lands
// (so they don't stop its hit); your shield (what is left once its hit is through it) and your timed buffs (the
// status strip's own: Momentum, Brace, Sudo…; not Null Route, which makes it miss) after. It wears 1 ◆ for each one
// it took (2 for two ◆ or more), up to p.scrape in all over the fight.
export function timedBuffs(s) {
  const e = s.encounter, out = [];
  if (momentumStacks(s)) out.push({ name: 'Momentum', take: () => { e.momentum = null; } });
  for (const [k, until] of Object.entries(e.buffs || {})) if (k !== 'null-route' && until >= e.cycle) out.push({ name: k === 'sinkhole' ? 'Drawing fire' : k === 'stolen' ? 'Stolen cast' : ABILITIES[k]?.name || k, take: () => { delete e.buffs[k]; } });
  return out;
}
function scrapeYou(s, p, atk, { chits = 0, shield = 0, buffs = [] }) {
  const e = s.encounter, took = (chits ? Math.min(chits, 2) : 0) + (shield ? 1 : 0) + buffs.length;
  const gain = Math.min(Math.max(0, p.scrape - (p.scraped || 0)), took);
  if (chits) e.chits = 0;
  if (shield) e.shield = 0;
  for (const b of buffs) b.take();
  if (gain) { p.armor += gain; p.scraped = (p.scraped || 0) + gain; p.maxArmor = Math.max(p.maxArmor || 0, p.armor); p.patchAt = null; }
  const what = [chits ? `${chits} ◆` : '', shield ? `${shield} shield` : '', ...buffs.map((b) => b.name)].filter(Boolean);
  emit(s, 'blind', `${atk.name} scrapes off your ${andList(what)}${gain ? `. The ${p.name} wears ${gain} more ◆` : ''}.`, { source: p.id, scrape: true, shield, chits, buffs: buffs.map((b) => b.name), gain });
}
function landAttack(s, p) {
  const e = s.encounter;
  const atk = p.attack;
  liftOf(s);
  const power = attackAmount(p) * c2Gnaw(s, p) * (e.soft || 1) * gapTaken(levelGap(s)) * (p.boosted ? CONFIG.reactiveBonus : 1) * (on(s, p, 'throttled') ? (hasTalent(s, 'backpressure') ? 0.25 : SKILLS.throttled) : 1) * mechPower(s, p, true);
  // A hit: a damage attack, or a special that also hits (the Scrambler's Scramble). Its size is `hit`, scaled like the rest.
  const hits = atk.effect === 'damage' || !!atk.hit, hitPower = atk.hit ? (power * atk.hit) / Math.max(1, atk.amount) : power;
  p.boosted = false;
  if (atk.windup) atk.wound = 0;
  // Patchwork: the Patcher's attack is a heal on its own side. Nothing of yours stops it.
  if (atk.effect === 'heal') {
    atk.due = e.cycle + atk.interval;
    atk.n = (atk.n || 0) + 1;
    // Revoke (Sysop): its heal lands on you instead.
    if (p.revokedUntil >= e.cycle) { emit(s, 'blocked', `${atk.name} is revoked: it heals ${s.who || 'you'} instead.`, { source: p.id }); return heal(s, Math.max(1, Math.round(atk.amount)), `${p.name}'s revoked ${atk.name}`); }
    const hurt = livingParts(s).filter((x) => x.integrity < x.max && !implanted(s, x)).sort((a, b) => a.integrity / a.max - b.integrity / b.max)[0];
    if (!hurt) return emit(s, 'status', `${atk.name} finds nothing to patch${livingParts(s).some((x) => implanted(s, x)) ? ', because a Rootkit Implant blocks it' : ''}.`, { source: p.id });
    const got = Math.min(Math.round(atk.amount), hurt.max - hurt.integrity);
    hurt.integrity += got;
    return emit(s, 'heal', `${p.name} patches ${hurt.name}: +${got}. ${hurt.integrity}/${hurt.max}.`, { target: hurt.id, amount: got });
  }
  // Stealth from a timed buff (Turbidity): while it runs, each attack on you may come a cycle later, as a fight's first
  // attacks may with Stealth (engage). Not a tell's (its own clock, tells.mjs).
  const lurk = !atk.tell && buffStat(s, 'stealth');
  if (lurk && rand(s) * 100 < lurk && delayAttack(s, p, e.cycle + 1 - atk.due)) return emit(s, 'status', `Stealth: ${p.name}'s ${atk.name} comes a cycle later.`, { source: p.id });
  if (watchman(s, p)) return; // before the landing: the attack it holds lands next cycle, as its own landing
  p.lastLanded = e.cycle;
  atk.due = e.cycle + atk.interval; // it lands: the next attack can be delayed again
  atk.n = (atk.n || 0) + 1; // its landings: a charge rides one of them (tells.mjs)
  // A volley (a Repeater's Double Tap, a Prism's Spread): its next hit the next cycle, then an interval after the first.
  if (p.taps) {
    if (!atk.tap) atk.volley = e.cycle;
    atk.tap = (atk.tap || 0) + 1;
    if (atk.tap < p.taps) atk.due = e.cycle + 1; else { atk.due = Math.max(e.cycle + 1, atk.volley + atk.interval); atk.tap = 0; atk.volley = null; }
  }
  if (atk.ramp) atk.step = (atk.step || 0) + 1; // Floodgate: one harder each time
  if (atk.dump) e.keylog = 0; // Keylogger: the log empties into the Dump
  // Null Route: this cycle's attacks miss (and Opening lights up).
  if (e.nullRoute > 0 || e.buffs['null-route'] >= e.cycle) { dodged(e); emit(s, 'blocked', `${atk.name} misses. You null-routed it.`, { source: p.id }); openProc(s, 'slipped'); return slipLonger(s); }
  // Scraper: as it lands it takes your ◆ (so they don't stop its hit), then your shield once its hit is through it and
  // your timed buffs (scrapeYou), and wears up to 2 of them as ◆, 2 in all over the fight.
  if (p.scrape && e.chits > 0) scrapeYou(s, p, atk, { chits: e.chits });
  // Retaliate lights up when a damage attack reaches you, whatever soaks it.
  if (hits) openProc(s, 'struck', { amount: Math.round(hitPower) });
  // Your armor chits (Bastion): the whole attack does nothing, however big.
  if (e.chits > 0 && atk.effect !== 'replicate') {
    e.chits--;
    return emit(s, 'blocked', `${atk.name} hits your ◆ and does nothing${e.chits ? ` (${e.chits} left)` : ''}.`, { source: p.id });
  }
  e.metrics.attacksLanded++;
  // Sanitize: a special attack may fail outright.
  if (SPECIALS.includes(atk.effect) && defense(s, 'sanitize') && rand(s) * 100 < defense(s, 'sanitize')) return emit(s, 'blocked', `${atk.name} fails. Sanitize stopped it.`, { source: p.id });
  // Misses: a damage attack can miss you (level gap, plus your Evasion).
  if (hits && enemyMissChance(s) > 0 && rand(s) * 100 < enemyMissChance(s)) {
    e.metrics.evaded++;
    openProc(s, 'slipped');
    return emit(s, 'evaded', `${atk.name} misses you${defense(s, 'evasion') ? ' (evaded)' : ''}.`, { source: p.id });
  }
  // Deductible (Halcyon): the first attack that lands each fight costs you nothing.
  if (hits && zeroDay(s, 'deductible') && !e.once.deductible) {
    e.once.deductible = true;
    return emit(s, 'blocked', `Deductible: ${atk.name} is covered.`, { source: p.id });
  }
  if (hits) {
    const tough = 1 - 0.03 * (rank(s, 'failsafe') + rank(s, 'hardened-kernel') + rank(s, 'low-profile') + rank(s, 'load-balancer'));
    // Enemy crits: a roll on every damage attack (from enemy level 3).
    let crit = !atk.noCrit && (e.virus.crit || 0) > 0 && rand(s) < e.virus.crit; // a tell never crits (tells.mjs): it's already as big as it gets
    const normal = crit && fxFire(s, 'struck', { do: 'crit-normal', atk })[0]; // Underwriter's Seal, Cold Wallet, Ground Plane
    if (normal) { crit = false; emit(s, 'blocked', `${normal.name || normal.it.name}: ${atk.name} would have been a critical strike. It lands as a normal hit.`, { source: p.id, ...firedOf([normal]) }); }
    // A helper takes it (Weir): the hit lands on it instead of you, and it expires.
    const soak = fxFire(s, 'struck', { do: 'helper-soak', atk })[0];
    if (soak) {
      const h = [...e.helpers].sort((a, b) => a.left - b.left)[0];
      e.helpers.splice(e.helpers.indexOf(h), 1);
      return emit(s, 'blocked', `${soak.name || soak.it.name}: a helper takes ${atk.name} for you, and expires.`, { source: p.id, ...firedOf([soak]) });
    }
    // Its size as it reaches you, before any cut (Drain Plug's big hit), and what would get through to your Signal (Read-Only).
    const sap = sapOf(s, p), took = classMult('taken', s, atk, p);
    const pre = Math.round(hitPower * sap * (hasTalent(s, 'unsafe-mode') ? 1.2 : 1) * tough * (crit ? CRIT.multiplier : 1) * took * (e.virus.raid ? raidTaken(s) : 1));
    const lands = Math.max(0, blocked(s, pre) - (e.shield || 0));
    let half = fxFire(s, 'struck', { do: 'halve', atk, amount: pre, lands })[0];
    if (half) emit(s, 'blocked', `${half.name || half.it.name}: ${atk.name} deals half damage.`, { source: p.id, ...firedOf([half]) });
    let cut = half ? 0.5 : 1;
    if (!half && e.hardened > 0) { e.hardened--; cut = 1 - SKILLS.hardenedCut; emit(s, 'blocked', `Hardened: ${atk.name} deals ${Math.round(SKILLS.hardenedCut * 100)}% less damage.`, { source: p.id }); }
    for (const x of fxFire(s, 'struck', { do: 'taken%', atk, amount: pre, lands })) { cut *= Math.max(0, 1 - x.value / 100); emit(s, 'blocked', `${x.name || x.it.name}: ${atk.name} deals ${x.value}% less damage.`, { source: p.id, ...firedOf([x]) }); } // Read-Only
    cut *= exposedCut(s); // Exposed (a Prober, mechanics.mjs): this hit deals more, and the status clears
    const brown = leanTaken(e, p); // Brownout (leanings.mjs): your command aimed at its part this cycle
    if (brown < 1) { leanPaid(e, p, Math.round(pre * cut * (1 - brown))); cut *= brown; }
    // Blindside (Ghostroot): a hit you couldn't see coming lands harder.
    const dealt = takeDamage(s, absorbed(s, hitCapped(s, spikeCapped(s, Math.round(hitPower * sap * (hasTalent(s, 'unsafe-mode') ? 1.2 : 1) * tough * (crit ? CRIT.multiplier : 1) * cut * took * (e.virus.raid ? raidTaken(s) : 1)), atk)), atk, p), p.id, atk.name);
    struckFx(s, atk);
    if (dealt) classEach('struck', s, atk, dealt, p);
    if (p.mech) mechLanded(s, p, atk); // the status it leaves on you, or what it cashes in (mechanics.mjs)
    if (p.scrape && (e.shield > 0 || timedBuffs(s).length)) scrapeYou(s, p, atk, { shield: e.shield, buffs: timedBuffs(s) });
    // Bad Block: your next heals lose up to its share of your max (a fresh pool each time it lands, not a bigger one).
    if (p.badblock) {
      const n = Math.max(1, Math.round(defender(s).max * p.badblock));
      e.badBlock = { left: n, max: n, source: p.id, name: p.name };
      emit(s, 'blind', `${atk.name} cracks your next heals: they lose up to ${n}. Purge, Scrub or Rollback clears it.`, { source: p.id, badblock: n });
    }
    for (const x of dealt ? fxFire(s, 'struck', { do: 'restore%', atk }) : []) heal(s, Math.max(1, Math.round((defender(s).max * x.value) / 100)), x.name || x.it.name, firedOf([x]));
    if (dealt) { e.undo = { type: 'damage', amount: dealt }; e.grudge = p.id; } // Grudge (Bastion): it last hit you
    // Echo: while the Echo lives, the hit repeats next cycle at half.
    if (dealt && !atk.echoed && livingParts(s).some((x) => x.echo && !(x.echoCancelUntil >= e.cycle))) { // Echo Cancel: it stops repeating
      const half = Math.max(1, Math.round(dealt / 2));
      (e.echoes ||= []).push({ due: e.cycle + 1, amount: half, name: atk.name });
    }
    // Leech: the bite heals its most damaged part and clears a burn from it.
    if (dealt && atk.siphon) {
      const hurt = livingParts(s).filter((x) => !implanted(s, x)).sort((a, b) => a.integrity / a.max - b.integrity / b.max)[0];
      if (hurt) {
        const got = Math.min(dealt, hurt.max - hurt.integrity);
        hurt.integrity += got;
        const b = e.burns.findIndex((x) => x.target === hurt.id && !(e.stickyUntil >= e.cycle)); // Outbreak: nothing clears your burns
        if (b >= 0) e.burns.splice(b, 1);
        emit(s, 'status', `${atk.name} feeds ${hurt.name}${got ? `: +${got}` : ''}${b >= 0 ? ', and a burn on it is gone' : ''}.`, { target: hurt.id, amount: got });
      }
    }
    if (dealt && zeroDay(s, 'subrogation')) e.subro = p.id;
    // Backlog: the skill you fired this cycle cools down longer (one with no cooldown loses nothing).
    if (p.backlog) {
      const id = e.lastCmd?.cycle === e.cycle ? e.lastCmd.id : null;
      if (id && ABILITIES[id] && e.readyAt[id] > e.cycle) { e.readyAt[id] += p.backlog; (e.backlogged ||= {})[id] = e.readyAt[id]; emit(s, 'locked', `${atk.name} lands on your queue. ${ABILITIES[id].name} cools ${p.backlog} cycles longer.`, { source: p.id, ability: id, cycles: p.backlog, backlog: true }); }
    }
    const verb = crit ? 'CRITS' : 'hits';
    if (dealt) emit(s, 'server-hit', e.mode === 'run' ? `${atk.name} ${verb} your Signal: −${dealt}.` : `${atk.name} ${verb} the server: −${dealt} Integrity.`, { source: p.id, amount: dealt, crit, atk: atk.name, ...(atk.tell ? { tell: atk.tell } : {}) });
    // Countermeasures (server gear): whatever hits your server takes a hit back.
    const cm = e.mode === 'home' && gearStat(s, 'countermeasures', 'server');
    if (cm && dealt && alive(p)) hit(s, p, cm, { by: 'Countermeasures', server: true, src: 'reflect' });
  }
  if (atk.effect === 'encrypt') {
    // Stacks: every Encrypt adds to the damage your server takes each cycle, until the Encryptor breaks.
    const add = Math.max(1, Math.round(power * (fxHas(s, 'encrypt-half') ? 0.5 : 1)));
    e.encrypt = (e.encrypt || 0) + add;
    p.encrypted = true;
    emit(s, 'encrypt', `${atk.name} lands, and your ${e.mode === 'run' ? 'Signal' : 'server'} is encrypted. You take ${e.encrypt} damage every cycle until you break the ${p.name}.`, { source: p.id, amount: add, total: e.encrypt });
  }
  // A basic carrying its Ghostroot's burst (parts.mjs PARTS.profile): its hit Scrambles you too, on the Scrambler's clock.
  if (atk.scrambles && atk.effect === 'damage' && !(e.scrambleUntil > e.cycle) && e.cycle - (atk.scrambledAt ?? -99) >= (atk.scrambleEvery || 1)) {
    atk.scrambledAt = e.cycle;
    if (e.buffs?.honeypot >= e.cycle) { delete e.buffs.honeypot; emit(s, 'blocked', `${atk.name} goes after your honeypot. You aren't Scrambled.`, { source: p.id, ability: 'honeypot' }); }
    else { const n = Math.max(1, Math.round(atk.scrambles) - (fxHas(s, 'blind-short') ? 1 : 0)); e.scrambleUntil = e.cycle + n; e.scrambleSelf = null; emit(s, 'blind', `${atk.name} Scrambles you for ${n} ${n === 1 ? 'cycle' : 'cycles'}. Each of your attacks has a ${Math.round(CONFIG.scramble.chance * 100)}% chance to hit you instead.`, { source: p.id }); }
  }
  if (atk.effect === 'scramble' && e.buffs?.honeypot >= e.cycle) {
    delete e.buffs.honeypot; // Honeypot (Warden): the scramble goes after the honeypot
    emit(s, 'blocked', `${atk.name} goes after your honeypot. You aren't Scrambled.`, { source: p.id, ability: 'honeypot' });
  } else if (atk.effect === 'scramble') {
    // Scrambled: for a few cycles, each of your attacks may hit you instead (useAbility).
    const n = Math.max(1, Math.round(atk.amount) - (fxHas(s, 'blind-short') ? 1 : 0)); // cycles: not scaled by level
    e.scrambleUntil = e.cycle + n; e.scrambleSelf = p.selfFull ? 1 : null;
    emit(s, 'blind', `${atk.name} lands, and you are SCRAMBLED for ${n} ${n === 1 ? 'cycle' : 'cycles'}. Each of your attacks has a ${Math.round(CONFIG.scramble.chance * 100)}% chance to hit you instead.`, { source: p.id });
  } else if (atk.effect === 'replicate') {
    const living = livingParts(s).filter((x) => x.kind === 'fragment').length;
    if (e.buffs?.dmz >= e.cycle) emit(s, 'blocked', `${atk.name} fizzles. Nothing new gets into the DMZ.`, { source: p.id, ability: 'dmz' }); // Warden DMZ
    else if (living >= CONFIG.fragmentCap) emit(s, 'info', `${atk.name} fizzles. The fragment limit is reached.`, { source: p.id });
    else for (let k = 0; k < (p.spawnN || 1) && livingParts(s).filter((x) => x.kind === 'fragment').length < CONFIG.fragmentCap; k++) { // a Replicator.exe hatches two
      const n = e.nextFragment++;
      const pw = e.virus.power || 1;
      const amount = Math.max(1, Math.round(CONFIG.fragmentDamage * pw));
      const hp = Math.max(1, Math.round(CONFIG.fragmentIntegrity * (e.virus.hpPower ?? pw))); // health follows the virus's health scale, not its damage
      e.virus.parts.push({ id: 'frag' + n, name: 'Fragment ' + n, kind: 'fragment', integrity: hp, max: hp, armor: 0, maxArmor: 0, patchAt: null, veiled: false, loot: null, special: false, attack: { name: 'Gnaw', effect: 'damage', amount, interval: 1, due: e.cycle + 1 }, exposedUntil: 0, lastDamaged: 0, boosted: false });
      if (p.overrun) { const f = e.virus.parts.at(-1); f.attack.ramp = 1; f.attack.rampBy = Math.max(1, Math.round(pw)); f.attack.step = 0; }
      e.undo = { type: 'replicate', part: 'frag' + n };
      emit(s, 'spawn', `Fragment ${n} spawns with ${hp} Integrity. It gnaws ${amount} every cycle.`, { source: p.id, target: 'frag' + n });
    }
  }
  if (bodyRules(e)) hooks.roomLanded?.(s, p, atk); // a room body's attack that got through (families.mjs: a Wiper's Wipe)
}

// One player's part of a cycle: their command (or auto-repeat), their daemons, then their burns,
// helpers, regen and the server's Cron Job. Returns false if they fled. Each crewmate runs this
// on their own state against the shared virus (crew.mjs).
// phase: 'all' (solo), or 'command' (your turn in a crew cycle) and 'after' (once everyone has gone:
// daemons, burns, helpers, regen).
// What your command started, healed or shielded (commandFx reads it after): the burns and helpers there were, and the shield.
const beforeCommand = (e) => { if (e.fxs) e.fxs.healed = 0; return { burns: new Set(e.burns), helpers: new Set(e.helpers), shield: e.shield || 0 }; };
// What your gear does with your command once it has gone: the burns it started (Burn-In ticks each once, Bilge counts
// them on their part), the helpers it called (Ebb, Load Order), a banked boost to what it healed or shielded (Anchor
// Chain), and your first damaging skill's crits spent (POST Code).
function commandFx(s, before) {
  const e = s.encounter;
  if (!e || !active(s)) return;
  const st = fxState(e);
  if (st.critHit) { st.critSkill = false; st.critHit = false; }
  const burns = e.burns.filter((b) => !before.burns.has(b));
  if (burns.length && fxHas(s, 'burn-sap')) for (const b of burns) (st.burned ||= {})[b.target] = (st.burned[b.target] || 0) + 1;
  const now = burns.length && fxHas(s, 'burn-now');
  if (now) for (const b of burns) { const t = part(s, b.target); if (alive(t) && e.burns.includes(b)) hit(s, t, b.damage + (b.fxGrow || 0), { by: `${b.name} (${now.it?.name || now.name})`, dot: true, synced: b.synced }); }
  const called = e.helpers.filter((h) => !before.helpers.has(h));
  if (called.length) {
    for (const x of fxFire(s, 'helper', { do: 'helper-long' })) { called[0].left += x.value; emit(s, 'status', `${x.name || x.it.name}: your first helper runs ${x.value} ${x.value === 1 ? 'cycle' : 'cycles'} longer.`, { mark: 'helper', ...firedOf([x]) }); }
    for (const x of fxFire(s, 'helper', { do: 'helper-now' })) for (const h of called) { const t = part(s, h.target); if (alive(t)) hit(s, t, h.damage, { by: x.name || x.it.name, dot: true, synced: h.synced, src: 'helper' }); }
  }
  const boost = st.boost, shielded = (e.shield || 0) - before.shield;
  if (boost && (st.healed > 0 || shielded > 0)) {
    st.boost = null;
    if (st.healed > 0) heal(s, Math.max(1, Math.round((st.healed * boost.value) / 100)), boost.name, firedOf([boost]));
    if (shielded > 0) { const add = Math.max(1, Math.round((shielded * boost.value) / 100)); e.shield += add; emit(s, 'status', `${boost.name}: +${add} shield (${e.shield}).`, { mark: 'shield', ...firedOf([boost]) }); }
  }
}
// One of your helpers ran out (playerPhase): Backwash banks a shorter cooldown for your next helper skill (helper-cd).
function helperGone(s) {
  const e = s.encounter;
  for (const x of fxFire(s, 'expire', { do: 'helper-cd' })) fxState(e).helperCd = Math.max(fxState(e).helperCd || 0, x.value);
}
// Your program's turn (routines.mjs): a move it picked, fired like auto-repeat (never in a Sync Window, never a read of
// a tell), or a hold when all that's left is yours to play.
function programTurn(s, prog) {
  const e = s.encounter;
  if (prog.hold) {
    e.metrics.holds++;
    e.lastCmd = { id: 'hold', cycle: e.cycle };
    emit(s, prog.type || 'hold', prog.message, { target: prog.part || null, exception: true, auto: 'program' });
    return;
  }
  const intent = toIntent(s, prog.text);
  if (intent.error) { emit(s, 'hold', `⟳ Your program had no move: ${intent.error}`, { auto: 'program' }); e.metrics.holds++; return; }
  e.metrics.program = (e.metrics.program || 0) + 1;
  e.aim = { cycle: e.cycle, target: intent.target || null };
  e.commanding = { id: intent.ability, target: intent.target || null, auto: true, program: true }; // like auto-repeat: never a read
  const before = beforeCommand(e);
  try { useAbility(s, intent, 'program'); } finally { e.commanding = false; }
  commandFx(s, before);
}
export function playerPhase(s, phase = 'all') {
  const e = s.encounter;
  if (phase !== 'after') {
  // Your target broke before your turn (a crewmate got it): the same command goes at the next threat.
  if (e.queue?.target && !alive(part(s, e.queue.target))) {
    const next = soonestAttacker(s) || livingParts(s)[0];
    if (next) { emit(s, 'info', `${part(s, e.queue.target)?.name || 'Your target'} is already broken, so ${ABILITIES[e.queue.ability]?.name || e.queue.ability} goes at the ${next.name}.`); e.queue = { ...e.queue, target: next.id, text: `${e.queue.ability} ${next.id}` }; }
  }
  // Your program (routines.mjs, when the browser runs one): what it does when you typed nothing. Off, it's null and
  // the timer falls back to auto-repeat as before.
  const prog = !e.queue && hooks.program ? hooks.program(s) : null;
  // Hung (a tell that landed, tells.mjs): this cycle's command doesn't fire.
  // Stunned (a Stunner, mechanics.mjs) the same; either way the Punisher gets its free attack.
  if ((e.hung === e.cycle || stunnedNow(s)) && (e.queue || e.lastAttack || prog)) {
    emit(s, 'hung', e.hung === e.cycle ? 'HUNG. Your command does not fire this cycle.' : 'STUNNED. Your command does not fire this cycle.', {});
    missedTurn(s);
    e.metrics.holds++;
    e.lastCmd = { id: 'hold', cycle: e.cycle };
  } else if (e.queue && mechIntercept(s, e.queue.ability)) { // the junked key cleared, or a direct hit Sandboxed (mechanics.mjs)
    e.metrics.holds++;
  } else if (e.queue) {
    const q = e.queue;
    e.surprise = !!(e.synced && e.sync?.surprise && q.ability !== 'hold'); // Infiltrator Surprise (see CONFIG.surprise)
    e.aim = { cycle: e.cycle, target: q.target || null }; // the part your command aims at (Brownout, leanings.mjs)
    e.commanding = { id: q.ability, target: q.target || null, at: q.at ?? e.cycle, auto: false }; // your command: a tell on its part may count it (tells.mjs)
    const before = beforeCommand(e);
    hooks.programActed?.(s, q); // routines.mjs: a part that was yours to play, played: your program takes it from here
    try { useAbility(s, q); } finally { e.commanding = false; }
    commandFx(s, before);
    if (e.synced && active(s) && q.ability !== 'hold') { syncBonus(s, q); daemonsOn(s, 'synced', { part: q.target }); } // Pendulum
    e.surprise = false;
  }
  else if (prog) programTurn(s, prog);
  else if (e.lastAttack) {
    const intent = parse(s, e.lastAttack);
    if (intent.error) emit(s, 'hold', 'Auto-repeat had no target. Nothing fired.');
    else if (mechIntercept(s, intent.ability)) e.metrics.holds++;
    else {
      intent.text = `${intent.ability} ${intent.target}`;
      e.aim = { cycle: e.cycle, target: intent.target || null };
      e.commanding = { id: intent.ability, target: intent.target || null, auto: true }; // auto-repeat never answers a tell
      const before = beforeCommand(e);
      try { useAbility(s, intent, true); } finally { e.commanding = false; }
      commandFx(s, before);
    }
  } else {
    e.metrics.holds++;
    emit(s, 'hold', 'No command. Nothing fired.');
  }
  // Keylogger: a command fired outside the window is logged; 3 logs come back as the Dump.
  const logger = livingParts(s).find((x) => x.syncOnly);
  if (logger && (e.queue || e.lastAttack || (prog && !prog.hold)) && !e.synced && !(e.queue && e.queue.ability === 'hold') && logger.attack) {
    e.keylog = (e.keylog || 0) + 1;
    if (e.keylog >= 3 && logger.attack.due > e.cycle + 1) { logger.attack.due = e.cycle + 1; emit(s, 'status', `The ${logger.name} has logged 3 keystrokes. It Dumps next cycle.`, { target: logger.id }); }
    else if (e.keylog < 3) emit(s, 'status', `The ${logger.name} logs a keystroke (${e.keylog}/3).`, { target: logger.id });
  }
  mechFired(s); // Leak's price, the Countdown's count, a Volatile Corrupted cleansed (mechanics.mjs)
  e.synced = false;
  flushDaemons(s); // what your command set off (daemons.mjs)
  }
  if (phase === 'command') return active(s);
  // 1a. Slotted daemons act too, each on its own cooldown.
  if (active(s)) runDaemons(s);
  if (!active(s)) return false; // fled mid-fight
  e.queue = e.plan.shift() || null;

  // 1b. Burns and helpers tick after you. Every tick is a hit (Hook adds to it). A refreshing burn (Inject)
  // is one a part: any second copy that got there merges first.
  mergeBurns(e);
  for (const b of [...e.burns]) {
    if (virusIntegrity(s).current === 0) break;
    if (!e.burns.includes(b)) continue; // merged into another as it moved (a break's burns jumping on)
    const t = part(s, b.target);
    if (alive(t)) {
      const r = hit(s, t, b.damage + (b.fxGrow || 0), { by: b.name, dot: true, synced: b.synced });
      if (b.drain && r.dealt) heal(s, b.drain, b.name);
      const grow = fxHas(s, 'burn-grow');
      if (grow) b.fxGrow = Math.min(grow.fx.cap || 99, (b.fxGrow || 0) + (Number(grow.fx.value) || 1));
    }
    b.damage += b.grow || 0;
    b.left--;
    if (!b.left && alive(t)) daemonsOn(s, 'burnout', { part: t.id }); // Afterburn
  }
  e.burns = e.burns.filter((b) => b.left > 0 && alive(part(s, b.target)));
  // What each helper hit this cycle, for the Mimic's beat (tells.mjs mimicLands: it plays back the helpers on its part
  // that were sent once the beat was said). Plain data: the encounter is saved.
  e.helperHits = { cycle: e.cycle, list: [] };
  for (const h of [...e.helpers]) {
    if (virusIntegrity(s).current === 0) break;
    h.sent ??= e.cycle; // a helper from somewhere that didn't stamp it: sent this cycle
    let t = part(s, h.target);
    if (!alive(t)) { t = soonestAttacker(s); if (t) h.target = t.id; }
    if (t) e.helperHits.list.push({ target: t.id, damage: h.damage, sent: h.sent, by: h.by || null });
    const r = t ? hit(s, t, h.damage, { by: 'Helper', dot: true, synced: h.synced, src: 'helper' }) : null;
    h.left--;
    // Fork (Herder): a ◆ a helper breaks while it runs starts another helper on that part (up to the cap).
    if (t && r?.absorbed && !r.dealt && buffed(e, 'fork') && alive(t) && e.helpers.length < helperCap(s)) { e.helpers.push({ target: t.id, damage: h.damage, left: 3, sent: e.cycle, by: ABILITIES.fork.name }); emit(s, 'status', `Fork: a ◆ breaks, and a helper splits off on the ${t.name}.`, { target: t.id, mark: 'helper' }); }
    // Last Gasp (Operator's edge): one more hit as it expires.
    if (!h.left && t && alive(t) && edge(s, 'operator')) hit(s, t, h.damage, { by: 'Last Gasp', dot: true, synced: h.synced, src: 'helper' });
    if (!h.left) helperGone(s);
  }
  e.helpers = e.helpers.filter((h) => h.left > 0);
  flushDaemons(s);
  if (e.regen && e.regen.from <= e.cycle && e.regen.left > 0) { heal(s, e.regen.amount, e.regen.name || 'Patch'); e.regen.left--; }
  classEach('cycle', s); // class modules: the end of this player's turn
  // Leech pays out; Regen ticks (the rig's on runs, the server's at home).
  if (e.leechAcc >= 1) { const n = Math.floor(e.leechAcc); e.leechAcc -= n; heal(s, n, 'Leech'); }
  const rg = regenRate(defense(s, 'regen')) * (1 + fxSum(s, 'always', 'heal%') / 100); // Regen R: R every 5 cycles (more with Sump Pump, Bedframe: heal%)
  if (rg) {
    e.regenAcc = (e.regenAcc || 0) + rg;
    const n = Math.floor(e.regenAcc + 1e-9);
    if (n) { e.regenAcc -= n; const d = defender(s); const got = Math.max(0, Math.min(n, healCap(s) - d.integrity)); d.integrity += got; if (got) emit(s, 'regen', `Regen +${got}.`, { amount: got }); }
  }

  return true;
}

export function resolveCycle(s) {
  if (!active(s) || s.encounter.paused) return [];
  const first = s.serial;
  const e = s.encounter;
  if (e.steps) return []; // a stepped cycle is still playing out (stepCycle)

  // 1. The players act first, so breaking a part on its last cycle stops its attack.
  const turns = virusIntegrity(s).current > 0 ? hooks.crewTurns?.(s) || 0 : 0;
  if (!turns) { // solo
    if (lagged(s)) return lagCycle(s, first); // Lag (mechanics.mjs): the virus acts first
    if (!playerPhase(s)) return since(s, first);
    // Stepped (the browser): the virus answers a beat later, as its own step, when it has an attack due.
    if (hooks.stepped && virusIntegrity(s).current > 0 && dueNow(s).length) { e.steps = { order: [], next: 0, of: 0, after: true }; return since(s, first); }
    return endCycle(s, first);
  }
  // With a crew, everyone's command goes in priority order (turnOrder: strippers first).
  const order = turnOrder(s);
  // Stepped co-op (the browser sets hooks.stepped): the first turn now, each of the rest, then the
  // virus's, as its own step (stepCycle), so the screen can show them one after another.
  if (hooks.stepped) {
    e.steps = { order, next: 1, of: order.length };
    if (!actorTurn(s, order[0])) { e.steps = null; return since(s, first); }
    return since(s, first);
  }
  for (const who of order) { if (virusIntegrity(s).current === 0) break; if (!actorTurn(s, who)) return since(s, first); }
  if (!playerPhase(s, 'after')) return since(s, first);
  return endCycle(s, first);
}

// The next step of a stepped cycle: one crewmate's turn, or (after the last) the virus's part.
export function stepCycle(s) {
  const e = s.encounter;
  if (!active(s) || !e.steps || e.paused) return [];
  const first = s.serial;
  if (virusIntegrity(s).current > 0 && e.steps.next < e.steps.of) {
    if (!actorTurn(s, e.steps.order[e.steps.next++])) { e.steps = null; }
    return since(s, first);
  }
  // Everyone has gone: your daemons, burns and helpers.
  if (!e.steps.after) { e.steps.after = true; if (!playerPhase(s, 'after')) { e.steps = null; return since(s, first); } if (e.steps && virusIntegrity(s).current > 0) return since(s, first); }
  // The virus's turn: each attack due lands as its own step.
  if (!e.steps.due) {
    if (cycleStart(s)) { e.steps = null; return since(s, first); }
    e.steps.due = dueNow(s).map((p) => p.id);
    e.steps.landed = 0;
  }
  while (e.steps.due.length) {
    const p = part(s, e.steps.due.shift());
    if (!p || !alive(p) || !p.attack || p.attack.due > e.cycle) continue;
    e.steps.landed++;
    if (strike(s, p)) { e.steps = null; return since(s, first); }
    if (e.steps.due.length) return since(s, first);
  }
  const landed = e.steps.landed;
  e.steps = null;
  if (e.virus.tells && tellLand(s)) return since(s, first);
  if (virusIntegrity(s).current === 0) { finish(s, 'victory'); return since(s, first); } // a hit back in the virus's half took its last part (Reflector)
  if (e.virus.raid && raidLand(s)) return since(s, first);
  cycleClose(s, landed);
  return since(s, first);
}

// The rest of a cycle once everyone has acted (the virus's part), in three pieces so a stepped
// cycle can land its attacks one at a time.
// The start of the virus's part of a cycle: the kill check, encryption, a Sleeper waking,
// echoes. True if the fight ended.
function cycleStart(s) {
  const e = s.encounter;
  if (virusIntegrity(s).current === 0) {
    finish(s, 'victory');
    return true;
  }

  // 1c. Encryption eats your server every cycle until the Encryptor breaks.
  if (e.encrypt > 0) {
    const src = livingParts(s).find((x) => x.attack?.effect === 'encrypt');
    const dealt = takeDamage(s, e.encrypt, src?.id, 'the encryption', { dot: true });
    e.metrics.encrypted += dealt;
    if (dealt) emit(s, 'encrypted', `Encrypted: −${dealt}. ${e.mode === 'run' ? 'Signal' : 'Server'} ${defender(s).integrity}/${defender(s).max}.`, { source: src?.id, amount: dealt });
    if (defender(s).integrity <= 0) {
      finish(s, 'crashed');
      return true;
    }
    // An Encryptor.exe broken: the stack drains a step a cycle (a living Encryptor stops the drain).
    if (e.drain && !src) { e.encrypt = Math.max(0, e.encrypt - e.drain); if (!e.encrypt) { e.drain = null; emit(s, 'decrypted', 'The encryption runs out. Your server is decrypted.'); } }
  }

  // A Ratchet (parts.mjs PARTS.profile: a rolled fight's ramp with no Encryptor to carry it): the basic's own stack,
  // a step more every few cycles it lives, gone when it breaks.
  for (const p of livingParts(s)) {
    const heat = heatOf(p, e.cycle);
    if (!heat) continue;
    const dealt = takeDamage(s, heat, p.id, p.ratchet.name, { dot: true });
    e.metrics.encrypted += dealt;
    if (dealt) emit(s, 'encrypted', `${p.ratchet.name} (${p.name}): −${dealt}. ${e.mode === 'run' ? 'Signal' : 'Server'} ${defender(s).integrity}/${defender(s).max}.`, { source: p.id, amount: dealt, ratchet: true });
    if (defender(s).integrity <= 0) { finish(s, 'crashed'); return true; }
  }

  // Full Disk (a tell, tells.mjs): a burst of encryption on top of the stack, for a few cycles.
  if (e.burst?.left > 0) {
    const burst = e.burst, dealt = takeDamage(s, burst.amount, burst.source, burst.name, { dot: true }); // (what reacts to the hit can clear it: a breach's Reflective ACL breaking the Encryptor)
    burst.left--;
    e.metrics.encrypted += dealt;
    if (dealt) emit(s, 'encrypted', `${burst.name}: −${dealt}. ${e.mode === 'run' ? 'Signal' : 'Server'} ${defender(s).integrity}/${defender(s).max}.`, { source: burst.source, amount: dealt });
    if (!burst.left && e.burst === burst) e.burst = null;
    if (defender(s).integrity <= 0) { finish(s, 'crashed'); return true; }
  }

  // Corrupted (a tell that landed, tells.mjs): a few cycles of damage on you, until it runs out or you cleanse it
  // (Purge, Scrub, Rollback).
  if (e.corrupt?.left > 0) {
    const dealt = takeDamage(s, e.corrupt.amount, e.corrupt.source, 'Corrupted', { dot: true });
    e.corrupt.left--;
    if (dealt) emit(s, 'encrypted', `Corrupted (${e.corrupt.name}): −${dealt}. ${e.mode === 'run' ? 'Signal' : 'Server'} ${defender(s).integrity}/${defender(s).max}.`, { source: e.corrupt.source, amount: dealt, corrupt: true });
    if (!e.corrupt.left) e.corrupt = null;
    if (defender(s).integrity <= 0) { finish(s, 'crashed'); return true; }
  }

  // Sleeper: dormant until a hit or its timer wakes it. While it sleeps its attacks wait.
  if (e.virus.dormant) {
    if (e.virus.woke || e.cycle >= (e.virus.wakeAt ?? STRAINS.sleeper.dormant)) {
      e.virus.dormant = false;
      for (const p of attackers(s)) {
        if (p.mech === 'opportunist' && !p.woke) continue; // the Lurking Sleeper's: it wakes on a debuff, not with the virus
        if (p.attack.alarm) p.attack.due = e.cycle;
        else if (e.virus.cold) p.attack.due = e.cycle + (p.attack.wake || 1); // Cold storage's (floorplan.mjs coldSleep): at its own pace
        else { p.attack.interval = Math.max(2, p.attack.interval - 1); p.attack.due = e.cycle + Math.min(p.attack.interval, p.attack.wake || p.attack.interval); }
      }
      emit(s, 'status', `${e.virus.name} WAKES.`, {});
    }
  }

  // A Zip Bomb's fuse runs out, on both sides (docs/puzzle-levers.md 3.3): 20% of your max, unless a ◆ or a shield
  // takes it (Block doesn't); then every part of the virus loses a ◆ and takes its share of its own max (blastOf),
  // through ◆, and what each has due this cycle is cut (interrupt.mjs blastCut). A blast that breaks the last part wins
  // the fight.
  for (const z of parts(s).filter((x) => x.fuseAt && x.fuseAt <= e.cycle && !x.fused)) {
    z.fused = true;
    const n = Math.max(1, Math.round(defender(s).max * CONFIG.zipbomb.share));
    if (e.chits > 0) { e.chits--; emit(s, 'blocked', `The ${z.name} goes off on your ◆ and does nothing to you${e.chits ? ` (${e.chits} left)` : ''}.`, { source: z.id, fuse: true }); }
    else {
      const soak = Math.min(e.shield || 0, n);
      if (soak) e.shield -= soak;
      const dealt = n - soak > 0 ? takeDamage(s, n - soak, z.id, `${z.name} fuse`) : 0;
      emit(s, 'server-hit', `The ${z.name} goes off: −${dealt}${soak ? ` (${soak} on your shield)` : ''}.`, { source: z.id, amount: dealt, atk: 'Fuse', fuse: true });
      if (defender(s).integrity <= 0) { finish(s, 'crashed'); return true; }
    }
    const hitBy = livingParts(s).filter((x) => !frozenNow(s, x));
    if (hitBy.length) emit(s, 'phase', `The blast hits the virus too: every part loses a ◆ and ${Math.round(CONFIG.zipbomb.parts * 100)}% of its max.`, { source: z.id, blast: true });
    for (const x of hitBy) {
      if (!alive(x)) continue; // broken by the blast already (a part's own rule on breaking)
      blastCut(s, x, z.name);
      if (x.armor > 0) { x.armor--; if (!x.armor) x.patchAt = e.cycle + patchDelay(s); }
      hit(s, x, blastOf(x), { by: `${z.name} blast`, server: true, pierce: true, blast: true });
    }
    if (virusIntegrity(s).current === 0) { finish(s, 'victory'); return true; }
  }

  // Echoes of last cycle's hits (Echo strain): they land first, and die with the Echo.
  if (e.echoes?.length) {
    const due = e.echoes.filter((x) => x.due <= e.cycle);
    e.echoes = e.echoes.filter((x) => x.due > e.cycle);
    const src = livingParts(s).find((x) => x.echo);
    for (const x of due) {
      if (!src) break;
      const dealt = takeDamage(s, x.amount, src.id, x.name + ' echo', { dot: true });
      if (dealt) emit(s, 'server-hit', `${x.name} echoes: −${dealt}.`, { source: src.id, amount: dealt, atk: `${x.name} echo` });
      if (defender(s).integrity <= 0) { finish(s, 'crashed'); return true; }
    }
  }

  return mechStart(s); // the Punisher's free attack, the Countdown's big turn (mechanics.mjs)
}
// What a Zip Bomb's blast deals a part of the virus: its share of the part's own max (docs/puzzle-levers.md 3.3).
export const blastOf = (p) => Math.max(1, Math.round((p?.max || 0) * CONFIG.zipbomb.parts));
// Attacks due now, soonest first.
// A part that only attacks alone (the Hashrat's Miner) waits a cycle at a time while it has company.
const dueNow = (s) => {
  const live = livingParts(s).length;
  for (const p of attackers(s)) if (p.attack.alone && live > 1 && p.attack.due <= s.encounter.cycle) p.attack.due = s.encounter.cycle + 1;
  return attackers(s).sort((a, b) => a.attack.due - b.attack.due).filter((p) => p.attack.due <= s.encounter.cycle && !chargeNow(s, p)); // a charge takes the place of its part's attack (tells.mjs)
};
// One part's attack lands. True if the fight ended.
function strike(s, p) {
  const e = s.encounter;
  if (!alive(p) || !p.attack || p.attack.due > e.cycle) return false;
  // Co-op: a damage attack lands on everyone in the fight, each taking it in full (crew.mjs),
  // unless someone is drawing fire (Bastion Firewall): then it all goes at them.
  const crew = p.attack.effect === 'damage' ? hooks.crewAll?.(s) || [] : [];
  const sink = crew.length ? drawingFire(s) || crew.find(drawingFire) : null;
  // A crew boss's attack with a target rule (raid.mjs): it goes at one player (a taunt still pulls it).
  const aimed = !sink && p.attack.target && p.attack.effect === 'damage' && e.virus.raid ? attackTarget(s, p) : null;
  if (sink) landAttack(sink, p);
  else if (aimed) landAttack(aimed, p);
  else {
    for (const m of crew) landAttack(m, { ...p, attack: { ...p.attack } }); // a copy each, so its timer and ramp move once
    landAttack(s, p);
  }
  flushDaemons(s); // what it set off: Spite, Backscatter, a Watchman's hit
  hooks.crewHurt?.(s);
  if (defender(s).integrity <= 0) { finish(s, 'crashed'); return true; }
  if (virusIntegrity(s).current === 0) { finish(s, 'victory'); return true; }
  return false;
}
// A part strikes with an attack that isn't its own (a tell, tells.mjs): the same landing, to the same players,
// its own timer untouched. True if the fight ended.
export function strikeWith(s, p, atk) {
  const real = p.attack;
  p.attack = { ...atk, due: s.encounter.cycle };
  try { return strike(s, p); } finally { p.attack = real; }
}
// A ◆ that fades after its cycles if you still hold it (Bitrot Ward: when a break leaves one part). cycleFx takes it away.
function fadingChit(s, x) {
  const e = s.encounter, n = Number(x.fx.value) || 2;
  e.chits++;
  fxState(e).chitFade = e.cycle + n - 1;
  emit(s, 'status', `${x.name || x.it.name}: you gain a ◆ for ${n} cycles.`, { mark: 'shield', ...firedOf([x]) });
}
// Your gear at the end of a cycle, on its beat (value: every that many cycles). Bitrot Ward (chit-fade): its ◆, if you
// still hold it, fades after its cycles. Init Vector (repeat): your next damaging skill is armed to hit
// again. Watchdog Timer (free-helper): with no helper of yours out, one joins for a few cycles, a Deploy helper's size.
// Then the Signal you end it on (Last Known Good, the death recap).
function cycleFx(s) {
  const e = s.encounter, st = fxState(e), beat = (x) => e.cycle % Math.max(1, Number(x.fx.value) || 1) === 0;
  if (st.chitFade && !(e.chits > 0)) delete st.chitFade; // the ◆ was spent
  if (st.chitFade && e.cycle >= st.chitFade) { delete st.chitFade; e.chits--; emit(s, 'status', 'Bitrot Ward: your ◆ fades.'); }
  for (const x of fxFire(s, 'cycle', { do: 'repeat' })) if (beat(x)) st.repeat = { share: Number(x.fx.share) || 0, name: x.name || x.it.name };
  for (const x of fxFire(s, 'cycle', { do: 'free-helper' })) {
    const t = soonestAttacker(s);
    if (!beat(x) || e.helpers.length || !alive(t)) continue;
    const n = Math.max(1, Number(x.fx.cycles) || 2), dmg = scaled(s, ABILITIES.deploy.helper);
    e.helpers.push({ target: t.id, damage: dmg, left: n, synced: false, sent: e.cycle, by: x.name || x.it.name });
    emit(s, 'status', `${x.name || x.it.name}: a helper joins you on the ${t.name}, dealing ${dmg} every cycle for ${n} cycles.`, { target: t.id, mark: 'helper', ...firedOf([x]) });
  }
  noteSignal(s);
}
// The end of a cycle once the attacks are in: patches, cooldown effects, the turn over.
function cycleClose(s, landed) {
  const e = s.encounter;
  // 4. The virus patches itself: a part left without armor too long gets one chit back.
  for (const p of livingParts(s)) {
    if (p.maxArmor > 0 && p.armor === 0 && p.patchAt !== null && e.cycle >= p.patchAt && p.revokedUntil >= e.cycle) { p.patchAt = e.cycle + 1; emit(s, 'status', `${p.name}'s patch is revoked. It cannot sign it.`, { target: p.id }); continue; } // Revoke (Sysop)
    if (p.maxArmor > 0 && p.armor === 0 && p.patchAt !== null && e.cycle >= p.patchAt) {
      p.armor = 1;
      p.patchAt = null;
      emit(s, 'patch', `${p.name} patches 1 ◆ back.`, { target: p.id });
    }
  }

  bossPhases(s);
  // Mirror: a broken twin comes back while its twin still lives.
  for (const p of parts(s).filter((x) => x.rebootAt && x.integrity === 0 && e.cycle >= x.rebootAt)) {
    const tw = twinOf(s, p);
    p.rebootAt = null;
    if (!tw || !alive(tw)) continue;
    p.reboots = (p.reboots || 0) + 1;
    Object.assign(p, { integrity: Math.round(p.max * CONFIG.twinReboot.at), armor: p.maxArmor, patchAt: null });
    if (p.attack) p.attack.due = e.cycle + 2;
    emit(s, 'patch', `${p.name} REBOOTS at ${p.integrity}/${p.max}${p.reboots >= (p.rebootMax ?? CONFIG.twinReboot.max) ? '. It can\'t do it again.' : '.'}`, { target: p.id, reboot: true });
  }
  // Spare: it boots at its share of the broken signature's max, with its attack, two cycles after it broke.
  for (const p of livingParts(s).filter((x) => asleep(x) && x.bootAt && e.cycle >= x.bootAt)) {
    const from = p.bootFrom;
    p.booted = true; p.bootAt = null;
    p.max = p.integrity = Math.max(p.integrity, Math.round(from.max * p.spare.at));
    const shed = p.armor; // it comes up soft: the ◆ it slept under drop, and none patch back
    p.armor = 0; p.maxArmor = 0; p.patchAt = null;
    p.attack = { ...from.attack, due: e.cycle + 2, n: 0, tap: 0, volley: null, wound: 0 };
    emit(s, 'spawn', `The ${p.name} BOOTS at ${p.integrity}/${p.max}, running the ${from.name}'s ${from.attack.name}.${shed ? ` It drops its ${shed} ◆.` : ''}`, { target: p.id, booted: true });
  }
  // Cold Store: it thaws and joins the fight, its first Chill a cycle after the Thaw chip at the earliest.
  for (const p of livingParts(s).filter((x) => x.frozen && !x.thawed && e.cycle >= x.thawAt)) {
    p.thawed = true;
    const soon = p.thawHard ? 1 : 2; // a Cold Store.exe: one more ◆, its Chill the next cycle
    if (p.thawHard) { p.armor += 1; p.maxArmor = (p.maxArmor || 0) + 1; p.patchAt = null; }
    if (p.chill) { p.attack = { ...p.chill, due: p.thawHard ? e.cycle + 1 : Math.max(p.chill.due, e.cycle + 2) }; p.chill = null; }
    emit(s, 'status', `The ${p.name} THAWS and joins the fight${p.thawHard ? ' with one more ◆' : ''}${p.attack ? `: its ${p.attack.name} lands ${soon === 1 ? 'next cycle' : `in ${soon} cycles`}` : ''}.`, { target: p.id, thaw: true });
  }
  // Adaptive (mutation): a part hit three cycles running hardens.
  if (mutated(s, 'adaptive')) for (const p of livingParts(s).filter((x) => x.adaptAt === e.cycle && x.adaptRun >= 3)) {
    p.armor += 1; p.maxArmor = Math.max(p.maxArmor || 0, p.armor); p.patchAt = null; p.adaptRun = 0;
    emit(s, 'patch', `${p.name} adapts: +1 ◆.`, { target: p.id, adapt: true });
  }
  // Bouncer: the Keyring re-arms the other parts to full armor on its beat, three times; then it
  // overheats and stops, so the fight can't stall forever.
  for (const k of livingParts(s).filter((x) => x.rearm && e.cycle % x.rearm === 0 && (x.rearms || 0) < CONFIG.rearmMax)) {
    const re = livingParts(s).filter((x) => x !== k && x.maxArmor > x.armor);
    for (const x of re) { x.armor = x.maxArmor; x.patchAt = null; }
    if (!re.length) continue;
    k.rearms = (k.rearms || 0) + 1;
    emit(s, 'patch', `${k.name} re-arms ${re.map((x) => x.name).join(' and ')} to full armor.${k.rearms >= CONFIG.rearmMax ? ` The ${k.name} overheats and cannot re-arm again.` : ''}`, { target: re[0].id });
  }
  // Buffer: on its beat it shields the part below it (a fresh shield, not a bigger one).
  for (const b of livingParts(s).filter((x) => x.buffer && (e.cycle - 1) % x.buffer.every === 0)) {
    const t = belowOf(s, b);
    if (!t) continue;
    const n = Math.max(1, Math.round(b.max * b.buffer.share));
    for (const x of parts(s)) if (x !== t && x.bufBy === b.id) x.bufHp = 0;
    t.bufHp = n; t.bufMax = n; t.bufBy = b.id;
    emit(s, 'patch', `The ${b.name} shields the ${t.name}: ${n}. Your commands hit the shield first.`, { target: t.id, from: b.id, buffer: true });
  }
  // Idle Timer: the signature untouched by your commands for its count, every part re-arms to full ◆.
  for (const it of livingParts(s).filter((x) => x.idle)) {
    const sig = signatureOf(s);
    if (!sig) continue;
    if (e.cycle - (e.virus.idleHit || 0) < it.idle) continue;
    e.virus.idleHit = e.cycle;
    const re = livingParts(s).filter((x) => x.maxArmor > x.armor);
    for (const x of re) { x.armor = x.maxArmor; x.patchAt = null; }
    emit(s, 'patch', re.length ? `IDLE. The ${it.name} re-arms ${re.map((x) => x.name).join(' and ')} to full ◆.` : `IDLE. The ${it.name} times out, but every part still wears its ◆.`, { target: (re[0] || it).id, idle: true });
  }
  mechClose(s); // the mechanics list's parts at the cycle's end: Predator, Opportunist, Feeder, Amplifier, Bodyguard, Backtrace
  // Mutex: a broken lock comes back while the Mutex lives.
  for (const p of livingParts(s).filter((x) => x.lockAt != null && e.cycle >= x.lockAt)) {
    p.lockAt = null;
    if (livingParts(s).some((x) => x.lock === p.id)) { p.lockHp = p.lockMax; emit(s, 'patch', `The Mutex locks the ${p.name} again with a ${p.lockMax} shield.`, { target: p.id, lock: true }); }
  }
  // Tracer: every cycle the fight goes on, its Trace-back hits harder.
  for (const p of attackers(s).filter((x) => x.attack.grow)) p.attack.bonus = (p.attack.bonus || 0) + p.attack.grow;

  // Clock Speed: the meter fills each cycle; when it's full, every cooldown ticks one extra cycle.
  const clk = gearStat(s, 'clock');
  if (clk) {
    e.clock = (e.clock || 0) + clk;
    while (e.clock >= 100) {
      e.clock -= 100;
      const cooling = Object.keys(e.readyAt).filter((k) => e.readyAt[k] > e.cycle + 1);
      for (const k of cooling) e.readyAt[k] -= 1;
      e.clockPaid = e.cycle + 1; // the meter flashes for the cycle this one hands over to (view.mjs clockMeter)
      if (cooling.length) emit(s, 'status', 'Clock Speed: your cooldowns tick one extra cycle.');
    }
  }

  // Hashrat: while the Miner lives, your cooldowns stand still every other cycle.
  if (livingParts(s).some((x) => x.tax) && e.cycle % 2 === 1) {
    const cooling = Object.keys(e.readyAt).filter((k) => e.readyAt[k] > e.cycle + 1);
    for (const k of cooling) e.readyAt[k] += 1;
    if (cooling.length && !e.once.taxed) { e.once.taxed = true; emit(s, 'status', 'The Miner is eating your cycles. Your cooldowns run at half speed while it lives.'); }
  }
  cycleFx(s);
  // A breach's end of cycle (breach.mjs): an enrage, a Lab's overheat. It can end the fight either way.
  if (hooks.cycleEnd && e.breach) {
    hooks.cycleEnd(s);
    if (virusIntegrity(s).current === 0) return finish(s, 'victory');
    if (defender(s).integrity <= 0) return finish(s, 'crashed');
  }
  // A server room's end of cycle (floorplan.mjs): an elite's enrage, a Lab's overheat, the room bodies' clocks.
  if (hooks.roomCycle && bodyRules(e)) {
    hooks.roomCycle(s);
    if (virusIntegrity(s).current === 0) return finish(s, 'victory');
    if (defender(s).integrity <= 0) return finish(s, 'crashed');
  }
  // An objective's clock (objectives.mjs): the Exfil's upload completes and it gets away, Uptime held wins, a Priority missed.
  { const end = objectiveCycle(s); if (end) return finish(s, end); }

  e.cycle++;
  e.elapsedMs = 0;
  rollSync(s);
  if (e.virus.raid) raidCycle(s); // a crew boss: its phase, then what it announces (raid.mjs)
  if (e.virus.tells) { tellCycle(s); flushDaemons(s); } // a solo fight's tells: what it announces now (tells.mjs); a Lookout's hit
  hooks.programCycle?.(s); // routines.mjs: a part that's yours to play, and the auto jack-out rail
}
// A lagged cycle (a Jitter's Lag, mechanics.mjs): the virus's attacks land, then your command, then the cycle closes.
function lagCycle(s, first) {
  if (cycleStart(s)) return since(s, first);
  let landed = 0;
  for (const p of dueNow(s)) { if (p.attack?.due > s.encounter.cycle) continue; landed++; if (strike(s, p)) return since(s, first); }
  if (s.encounter.virus.tells && tellLand(s)) return since(s, first);
  emit(s, 'status', 'LAG. Your command lands after the virus acts.', { lag: true });
  if (!playerPhase(s)) return since(s, first);
  if (virusIntegrity(s).current === 0) { finish(s, 'victory'); return since(s, first); }
  cycleClose(s, landed);
  return since(s, first);
}
function endCycle(s, first) {
  if (cycleStart(s)) return since(s, first);
  // 2. Enemy attacks due this cycle.
  let landed = 0;
  for (const p of dueNow(s)) {
    if (p.attack?.due > s.encounter.cycle) continue;
    landed++;
    if (strike(s, p)) return since(s, first);
  }
  if (s.encounter.virus.tells && tellLand(s)) return since(s, first); // the tells due now (tells.mjs)
  if (virusIntegrity(s).current === 0) { finish(s, 'victory'); return since(s, first); } // a hit back in the virus's half took its last part (Reflector)
  if (s.encounter.virus.raid && raidLand(s)) return since(s, first);
  cycleClose(s, landed);
  return since(s, first);
}

// ---------- the Sync Window ----------
// A slice of each cycle at a new spot every cycle. A command fired inside it (Enter while the bar
// is in the window) deals +10% and adds your class's sync bonus.
export function rollSync(s) {
  const e = s.encounter, c = CONFIG.sync;
  if (!e) return;
  // Its own hash of the fight and the cycle, so it never shifts the game's dice.
  const hash = (k) => { const x = Math.sin((e.seed || 1) * 12.9898 + e.cycle * 78.233 + k) * 43758.5453; return x - Math.floor(x); };
  const keylogger = livingParts(s).some((x) => x.syncOnly);
  const surprise = classOf(s) === 'infiltrator' && e.cycle === 1;
  const width = (surprise ? CONFIG.surprise.width : keylogger ? 0.14 : c.width) * (fxHas(s, 'sync-wide') ? 1.5 : 1);
  if (!keylogger && !surprise && hash(311.7) >= syncChance(s)) { e.sync = null; return; }
  e.sync = { at: c.from + hash(0) * (c.to - width - c.from), width, ...(surprise ? { surprise: true } : {}) };
}
// Chance a cycle opens a window: 25%, plus the Sync stat on your protocols.
export const syncChance = (s) => Math.min(1, CONFIG.sync.chance + gearStat(s, 'sync', 'hacker') / 100);
// A little either side of the window still counts (CONFIG.sync.grace): it's about rhythm, not pixels.
export const inSync = (s, frac) => { const w = s.encounter?.sync, g = CONFIG.sync.grace || 0; return !!w && frac >= w.at - g && frac <= w.at + w.width + g; };
function syncBonus(s, intent) {
  const e = s.encounter, cls = classOf(s), b = SYNC[cls];
  if (!b) return;
  const t = intent?.target && part(s, intent.target);
  let what = '';
  if (cls === 'breaker' && alive(t) && t.armor > 0) {
    t.armor--; t.lastDamaged = e.cycle;
    if (!t.armor) t.patchAt = e.cycle + patchDelay(s);
    emit(s, 'armor', `Sync breaks 1 ◆ on the ${t.name}${t.armor ? ` (${t.armor} left)` : '. Its armor is broken'}.`, { target: t.id, left: t.armor });
    what = 'a ◆ cracks';
  } else if (cls === 'bastion') { e.shield = (e.shield || 0) + b.amount; what = `+${b.amount} shield (${e.shield})`; }
  else if (cls === 'infiltrator') { if (stretchBurns(s, t, b.amount, 'Sync')) what = 'burns last longer'; }
  else if (cls === 'operator' && e.helpers.length) {
    for (const h of [...e.helpers]) { const ht = alive(part(s, h.target)) ? part(s, h.target) : soonestAttacker(s); if (ht) hit(s, ht, h.damage, { by: 'Helper', dot: true, src: 'helper' }); if (virusIntegrity(s).current === 0) break; }
    what = 'helpers strike again';
  }
  const surprise = e.surprise && ['inject', 'tag', 'keepalive'].includes(intent?.ability);
  emit(s, 'synced', `${surprise ? 'SURPRISE' : 'SYNCED'}: +${Math.round(CONFIG.sync.bonus * 100)}% damage${what ? `, ${what}` : ''}${surprise ? `, ${{ inject: 'Inject ticks at once', tag: `Tag for ${CONFIG.surprise.tagCycles} cycles, burns +${Math.round((CONFIG.surprise.tagged - 1) * 100)}%`, keepalive: `burns +${CONFIG.surprise.keepalive} cycles` }[intent.ability]}` : ''}.`, { target: intent?.target || null, surprise, bonus: what ? b.tag : '' });
}

// The part your last command hit, if it still stands.
const lastTarget = (s) => { const t = s.encounter.lastAttack && part(s, s.encounter.lastAttack.split(' ')[1]); return alive(t) ? t : null; };
// ---------- daemons (daemons.mjs) ----------
// Watchman: once a fight, the first big attack about to land waits a cycle, and its part takes the Watchman's hit
// (after the attacks, flushDaemons). The bar is a big attack at your power.
function watchman(s, p) {
  const e = s.encounter;
  if (!slottedDaemons(s).includes('watchman') || e.inDaemon || p.attack.tell || e.once['dmn-watchman'] || p.attack.effect !== 'damage' || p.attack.amount < watchmanBar(s) || delayHeld(p)) return false;
  e.once['dmn-watchman'] = true;
  delayAttack(s, p, e.cycle + 1 - p.attack.due);
  emit(s, 'interrupt', `Watchman delays ${p.attack.name} a cycle.`, { target: p.id, auto: 'daemon' });
  (e.daemonQueue ||= []).push({ id: 'watchman', x: { part: p.id } });
  openProc(s, 'slipped');
  return true;
}

export function advance(s, deltaMs) {
  const first = s.serial;
  if (active(s) && !s.encounter.paused && !s.encounter.steps) { // the clock waits while a stepped cycle plays out
    s.encounter.elapsedMs += Math.max(0, deltaMs);
    while (active(s) && s.encounter.elapsedMs >= cycleLength(s)) {
      const remaining = s.encounter.elapsedMs - cycleLength(s);
      resolveCycle(s);
      if (active(s)) s.encounter.elapsedMs = remaining;
    }
  }
  return since(s, first);
}

// Upcoming enemy intents for the timeline: column 0 lands at the end of this cycle.
// When parts with broken armor patch a chit back, as timeline columns (0 = end of this cycle).
export function patches(s, columns = 4) {
  const e = s.encounter;
  if (!active(s)) return [];
  return livingParts(s).filter((p) => p.maxArmor > 0 && p.armor === 0 && p.patchAt !== null)
    .map((p) => ({ source: p.id, col: p.patchAt - e.cycle }))
    .filter((x) => x.col >= 0 && x.col < columns);
}

export function intents(s, columns = 4) {
  const e = s.encounter;
  if (!active(s)) return [];
  const out = [];
  // Tells (tells.mjs): each on its part's row, never hidden. A charge takes the place of its part's attack in its column.
  const told = tellIntents(s, columns);
  const charged = new Set(told.filter((t) => t.tell === 'charge').map((t) => `${t.source}@${t.col}`));
  liftOf(s);
  for (const p of attackers(s)) {
    const hidden = timersHidden(s, p);
    let boosted = p.boosted;
    // Ramps (Floodgate, Overrun) and growth (Tracer) show up column by column; a volley's hits on back to back cycles.
    const a = p.attack, step0 = a.step, bonus0 = a.bonus;
    const at = landingsOf(p, e.cycle + columns);
    at.forEach((due, k) => {
      const col = due - e.cycle;
      if (a.grow) a.bonus = (bonus0 || 0) + a.grow * Math.max(0, col);
      const tap = p.taps ? { tap: ((a.tap || 0) + k) % p.taps + 1, taps: p.taps } : {}; // which hit of its volley
      if (col >= 0 && !charged.has(`${p.id}@${col}`)) out.push({ source: p.id, name: a.name, effect: a.effect, amount: Math.round(attackAmount(p) * c2Gnaw(s, p) * (boosted ? CONFIG.reactiveBonus : 1) * mechPower(s, p, false, k > 0)), ...(a.hit ? { hit: Math.round(a.hit * (boosted ? CONFIG.reactiveBonus : 1)) } : {}), col, hidden, kind: p.kind, ...tap, ...(p.backlog ? { syn: true } : {}), ...(p.scrape ? { scrape: true } : {}), ...(p.badblock ? { bad: true } : {}), ...(due === a.due && delayHeld(p) ? { held: true } : {}) }); // held: already delayed, it lands there
      if (a.ramp) a.step = (a.step || 0) + 1;
      boosted = false;
    });
    a.step = step0; a.bonus = bonus0;
  }
  // A Zip Bomb's fuse (it stays on the board, broken, until it goes off) and a Buffer's next shield.
  for (const z of parts(s).filter((x) => x.fuseAt && !x.fused && x.fuseAt - e.cycle >= 0 && x.fuseAt - e.cycle < columns)) out.push({ source: z.id, name: 'Fuse', effect: 'fuse', amount: Math.max(1, Math.round(defender(s).max * CONFIG.zipbomb.share)), col: z.fuseAt - e.cycle, hidden: false, kind: z.kind });
  for (const b of livingParts(s).filter((x) => x.buffer)) for (let col = 0; col < columns; col++) if ((e.cycle + col - 1) % b.buffer.every === 0) { const t = belowOf(s, b); if (t) out.push({ source: b.id, name: 'Shield', effect: 'buffer', amount: Math.max(1, Math.round(b.max * b.buffer.share)), col, hidden: false, kind: b.kind, to: t.id }); }
  const echo = livingParts(s).find((x) => x.echo);
  if (echo) for (const x of e.echoes || []) if (x.due - e.cycle >= 0 && x.due - e.cycle < columns) out.push({ source: echo.id, name: x.name + ' echo', effect: 'damage', amount: x.amount, col: x.due - e.cycle, hidden: false, kind: echo.kind });
  // The Decoy's beat (your hit bent), and a broken twin's reboot: chips on the board like attacks. The beat always shows;
  // where its next one points (to) only once the Decoy's timers do (veiled: not yet).
  for (const decoy of livingParts(s).filter((x) => x.reflect)) {
    const b = bendOf(s, decoy);
    for (let col = 0; col < columns; col++) if ((e.cycle + col + (decoy.reflectOff || 0)) % decoy.reflect === 0) out.push({ source: decoy.id, name: 'Bend', effect: 'mirror', amount: Math.round((decoy.bounce ?? CONFIG.mirrorBounce) * 100), col, hidden: false, veiled: !b.shown, to: b.shown && b.at === e.cycle + col ? b.to.id : null, toName: b.shown && b.at === e.cycle + col ? b.to.name : null, self: b.to === decoy, harm: b.shown && b.at === e.cycle + col ? b.bad : null, kind: decoy.kind });
  }
  for (const p of parts(s)) if (p.rebootAt && p.integrity === 0 && p.rebootAt - e.cycle >= 0 && p.rebootAt - e.cycle < columns) out.push({ source: p.id, name: 'Reboot', effect: 'reboot', amount: Math.round(p.max * CONFIG.twinReboot.at), col: p.rebootAt - e.cycle, hidden: false, kind: p.kind });
  // A Cold Store's thaw and a Spare's boot (the parts plan's P2): on the cycle each joins the fight.
  for (const p of livingParts(s)) if (p.frozen && !p.thawed && p.thawAt - e.cycle >= 0 && p.thawAt - e.cycle < columns) out.push({ source: p.id, name: 'Thaw', effect: 'thaw', amount: p.chill ? attackAmount({ ...p, attack: p.chill }) : 0, col: p.thawAt - e.cycle, hidden: false, kind: p.kind });
  for (const p of livingParts(s)) if (asleep(p) && p.bootAt && p.bootAt - e.cycle >= 0 && p.bootAt - e.cycle < columns) out.push({ source: p.id, name: 'Boot', effect: 'boot', amount: Math.round((p.bootFrom?.max || 0) * p.spare.at), col: p.bootAt - e.cycle, hidden: false, kind: p.kind });
  out.push(...told);
  if (bodyRules(e) && hooks.roomIntents) out.push(...hooks.roomIntents(s, columns)); // a room body's other moves (families.mjs: a Courier's deliveries)
  // A packed part's chips (packParts): their timing and amount, named ???, marks off (view.mjs). Tells keep their own.
  const pk = new Set(e.virus.parts.filter((p) => packed(s, e.virus, p)).map((p) => p.id));
  if (pk.size) for (const i of out) if (pk.has(i.source) && !i.tell) Object.assign(i, { name: '???', packed: true });
  return out.sort((a, b) => a.col - b.col);
}

// Old id → new id, for saves from before the v9 renames.
export const RENAMED = {
  execute: 'segfault', cleave: 'fork-bomb', adrenaline: 'sudo', rend: 'memory-leak', lunge: 'bypass', rally: 'pass-the-hash',
  bloodlust: 'chain-exploit', 'thick-skin': 'failsafe', blindside: 'side-channel', mark: 'tag', leech: 'siphon', vanish: 'null-route', cloak: 'spoof',
  toxin: 'heap-spray', 'quiet-feet': 'onion-routing', 'lingering-mark': 'persistent-tag', 'sharp-counter': 'reverse-shell', 'thick-firewall': 'stateful-firewall',
  swarm: 'botnet', hive: 'node-pool', 'hook-line': 'kernel-hook',
};
const renameKeys = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [RENAMED[k] || k, v]));
function renameIds(s) {
  for (const arch of Object.keys(s.loadout.equipped)) s.loadout.equipped[arch] = s.loadout.equipped[arch].map((id) => RENAMED[id] || id);
  for (const arch of Object.keys(s.loadout.ranks)) s.loadout.ranks[arch] = renameKeys(s.loadout.ranks[arch]);
  for (const d of s.daemons) { const [w, ...rest] = String(d.command || '').split(' '); if (RENAMED[w]) d.command = [RENAMED[w], ...rest].join(' '); }
  const e = s.encounter;
  if (e) {
    e.readyAt = renameKeys(e.readyAt);
    e.buffs = renameKeys(e.buffs);
    e.once = renameKeys(e.once);
    for (const p of e.virus?.parts || []) if ('markedUntil' in p) { p.taggedUntil = p.markedUntil; delete p.markedUntil; }
    e.queue = null; // a queued order may use an old name: the player re-types it
    e.plan = [];
  }
}

// v12: the old Upgrades list retires. Hardening and Amplifier come back as running services;
// the Signal booster as a loaded protocol.
function migrateUpgrades(s) {
  s.stash ||= [];
  s.gear = { rigs: {} };
  s.recipes ||= [];
  s.services ||= {};
  s.nextItem ||= 0;
  if (!Number.isFinite(s.rng)) s.rng = ((s.seed || 1) * 2654435761) >>> 0;
  const up = s.upgrades || {};
  if (up.hardening) s.services.raid = 1;
  if (up.amplifier) s.services.uplink = 1;
  if (up.signal) {
    const it = { id: 'g' + (s.nextItem += 1), kind: 'protocol', side: 'hacker', rarity: 'stock', level: 3 * up.signal, stats: { signal: 10 * up.signal }, zeroDay: null, name: 'Stock Relay' };
    s.stash.push(it);
    rigOf(s).push(it.id);
  }
  delete s.upgrades;
  syncServer(s);
  if (s.encounter) s.encounter = null;
  s.version = SAVE_VERSION;
}

// v18: protocols have a category (offense, defense, utility) and go in slots of that kind; the
// power stats became flat numbers. Each protocol keeps its strongest stat's category (other
// stats drop off), percent power stats convert at the same roll quality, and loaded
// protocols move into slots of their kind (one that doesn't fit goes back to the stash).
const OLD_PCT = { damage: 6, critDamage: 15, payload: 8, leech: 2.5, reduction: 4 };
function migrateCategories(s) {
  for (const it of s.stash || []) {
    if (it.kind !== 'protocol') continue;
    const group = STATS[Object.keys(it.stats || {})[0]]?.group || 'offense';
    const stats = {};
    for (const [k, v] of Object.entries(it.stats || {})) {
      if (STATS[k]?.group !== group) continue;
      if (OLD_PCT[k]) { const q = v / (OLD_PCT[k] * (1 + it.level / 25)); stats[k] = Math.max(1, Math.round(STATS[k].base * power(it.level) * q)); } else stats[k] = v;
    }
    it.stats = stats;
    it.group = group;
  }
  for (const [arch, rig] of Object.entries(s.gear?.rigs || {})) {
    if (!Array.isArray(rig)) continue;
    const ids = rig.filter(Boolean);
    rig.length = 0;
    for (const id of ids) { const it = stashItem(s, id); const i = it ? freeSlot(s, groupOf(it), arch) : -1; if (i >= 0) rig[i] = id; }
  }
}

// v15: gear splits into protocols (you) and services (the server). Server gear that was
// installed becomes v1 of the matching service, free; the rest turns into code. Your rig's
// items become protocols in generic slots.
const OLD_SERVER_STAT = { integrity: 'raid', reduction: 'kernel', shield: 'scrubber', regen: 'hotpatch', repair: 'hotpatch', countermeasures: 'counter', evasion: 'honeypot', sanitize: 'sandbox', trace: 'uplink', lead: 'uplink' };
function migrateToProtocols(s) {
  s.services ||= {};
  s.install = null;
  materialsOf(s);
  s.recipes = [...new Set((s.recipes || []).map((r) => (r === 'cron-job' ? 'cron' : r)))];
  const g = s.gear || {};
  const running = new Set(Object.values(g.server || {}));
  const keep = [];
  for (const it of s.stash || []) {
    if (it.kind === 'protocol') { keep.push(it); continue; }
    if (it.side === 'server') {
      const svc = it.zeroDay === 'cron-job' ? 'cron' : it.zeroDay === 'snapshot' ? 'snapshot' : OLD_SERVER_STAT[Object.keys(it.stats || {})[0]];
      const def = RETIRED[svc]; // v34 retired most of these; progressionRestore converts them
      if (svc && def?.daemon && !s.recipes.includes(svc)) s.recipes.push(svc);
      if (svc && def && running.has(it.id) && !s.services[svc]) s.services[svc] = 1;
      else {
        const codes = [].concat(def?.code || 'kernel');
        for (const c of codes) materialsOf(s)[c] += Math.ceil(({ stock: 1, tuned: 2, custom: 3, zeroday: 5 }[it.rarity] || 1) * 5 / codes.length); // the old scrap values
      }
    } else {
      const zd = it.zeroDay && ZERO_DAYS[it.zeroDay] ? it.zeroDay : null;
      const first = Object.keys(it.stats || {})[0];
      keep.push({ id: it.id, kind: 'protocol', side: 'hacker', rarity: it.rarity, level: it.level, stats: it.stats, zeroDay: zd, name: zd ? ZERO_DAYS[zd].name : `${RARITIES[it.rarity]?.name || 'Stock'} ${PROTOCOL_NAMES[first] || 'Protocol'}` });
    }
  }
  s.stash = keep;
  const rigs = {};
  for (const [arch, rig] of Object.entries(g.rigs || {})) {
    rigs[arch] = (Array.isArray(rig) ? rig : Object.values(rig)).filter((id) => keep.some((x) => x.id === id)).slice(0, protocolSlots(hackerLevel(s, arch)));
  }
  s.gear = { rigs };
  syncServer(s);
  s.version = SAVE_VERSION;
}

// v30: the wall is three knobs. Tarpit, Honeypot and Sandbox (services) and the firewall, Tarpit
// and Honeypot configs are gone: each service you ran comes back as a filter carrying its stat
// (blue for v1 and v2, yellow for v3), each config you owned as its credits, an install in progress
// as its price.
const RETIRED_SERVICES = { tarpit: 'tarpit', honeypot: 'evasion', sandbox: 'sanitize' };
// Configs are gone: refund the ones you crafted (any save, any version; it only pays once).
function retireConfigs(s) {
  const gone = new Set(RETIRED_CONFIGS);
  const refund = (s.configsOwned || []).filter((k) => gone.has(k)).length * CONFIG_REFUND;
  if (refund) { s.server.credits += refund; emit(s, 'info', `Configs retired: +${refund} credits.`); }
  s.configs = {}; s.configsOwned = []; s.configsKnown = [];
}
// Harvester traits are gone too: every harvester is plain (site traits and modules do those jobs).
function retireTraits(s) {
  for (const h of s.harvesters || []) h.traits = [];
  for (const l of s.locations || []) if (l.outpost?.h) l.outpost.h.traits = [];
  for (const l of s.locations || []) if (l.outpost) { delete l.outpost.infest; delete l.outpost.siege; }
  for (const l of s.locations || []) if (l.outpost?.fw) Object.assign(l.outpost.fw, { frag: 0, defragUntil: 0 }); // holdings' firewalls don't fragment
  for (const h of Object.values(s.hubs || {})) if (h.captured?.wall) Object.assign(h.captured.wall, { frag: 0, defragUntil: 0 }); // infestations are gone; natives come as a swarm now
}
function retireWall(s, was) {
  if (was >= 30) return;
  const L = Math.max(1, serverLevel(s));
  for (const [id, stat] of Object.entries(RETIRED_SERVICES)) {
    const v = s.services?.[id];
    if (v) { addFilter(s, rollFilter(seeded(L * 31 + v), { level: L, rarity: v >= 3 ? 'custom' : 'tuned', stat }), `${id[0].toUpperCase() + id.slice(1)} retired: `); delete s.services[id]; }
    if (s.install?.id === id) { s.server.credits += [120, 600, 2000][s.install.v - 1] || 0; s.install = null; }
    if (s.configs) delete s.configs[id];
  }
  if (s.configs) delete s.configs.firewall;
  if (s.recipes) s.recipes = s.recipes.filter((k) => !RETIRED_SERVICES[k]);
}
// The Shunt (a P2 third) was cut. A save that still holds one, in the fight under way or in a virus it keeps (a room's
// guard, an invasion's), loses it: the fight's own becomes a plain part with no rule (its burns, helpers and orders on
// it stay good), any other virus's leaves it, and no virus carries its gene. No SAVE_VERSION: it keys on the part.
export function shuntRestore(s) {
  const live = s.encounter?.virus, seen = new Set();
  const walk = (o, depth) => {
    if (!o || typeof o !== 'object' || seen.has(o) || depth > 12) return;
    seen.add(o);
    if (Array.isArray(o)) { for (const x of o) walk(x, depth + 1); return; }
    if (Array.isArray(o.parts) && o.parts.some((p) => p && (p.id === 'shunt' || 'shunt' in p))) {
      if (o === live) for (const p of o.parts) delete p?.shunt;
      else o.parts = o.parts.filter((p) => !(p && (p.id === 'shunt' || 'shunt' in p)));
    }
    if (Array.isArray(o.genes) && o.parts) o.genes = o.genes.filter((g) => (g?.id ?? g) !== 'shunt');
    for (const [k, v] of Object.entries(o)) if (k !== 'logs') walk(v, depth + 1);
  };
  walk(s, 0);
}
export function restore(raw) {
  if (!raw || ![6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, SAVE_VERSION].includes(raw.version)) return fresh();
  try {
    const s = bindRooms(structuredClone(raw));
    const was = s.version;
    // v23: the Sysadmin is the Bastion now. Its level, tree and bar come along.
    // Smash is Flood now: on the bar and anything keyed by it.
    for (const bar of Object.values(s.loadout?.equipped || {})) if (Array.isArray(bar)) bar.forEach((id, i) => { if (id === 'smash') bar[i] = 'flood'; if (id === 'kill-process') bar[i] = 'rate-limit'; });
    // v29: items are weaker (gear.mjs ITEM_SCALE, the Damage and Signal affixes, uniques). Protocols you
    // already own come down the same ~30% on Damage, Signal and Regen.
    if (was < 29) for (const it of s.stash || []) if (it.kind === 'protocol') for (const k of ['damage', 'signal', 'regen']) if (it.stats?.[k] > 0) it.stats[k] = Math.max(k === 'regen' ? 0.1 : 1, k === 'regen' ? Math.round(it.stats[k] * 0.7 * 10) / 10 : Math.round(it.stats[k] * 0.7));
    // v28: hubs are found by tracing them. An earlier load step wrongly marked every hub found;
    // keep only the ones traced to 100% (or held).
    if (was < 28 && s.hubs) s.hubFound = Object.fromEntries(Object.keys(s.hubs).filter((f) => (s.hubLead?.[f] || 0) >= 100 || s.hubs[f]?.captured).map((f) => [f, true]));
    // Bastion's first skill became Rate Limit: kill -9's ranks carry over to Token Bucket.
    for (const r of Object.values(s.loadout?.ranks || {})) if (r && r['kill-9'] !== undefined) { r['token-bucket'] = (r['token-bucket'] || 0) + r['kill-9']; delete r['kill-9']; }
    if (was < 23) {
      const mv = (o) => { if (o && o.sysadmin !== undefined) { o.bastion = o.sysadmin; delete o.sysadmin; } };
      mv(s.hackers); mv(s.loadout?.picks); mv(s.loadout?.ranks); mv(s.loadout?.equipped); mv(s.gear?.rigs);
      if (s.loadout?.archetype === 'sysadmin') s.loadout.archetype = 'bastion';
    }
    if (s.version === 6) {
      s.version = SAVE_VERSION;
      s.leadProgress = { ransomware: 0, worm: 0, ghostroot: 0 };
      s.locations = [];
      s.run = null;
      delete s.leads;
      if (s.encounter) s.encounter.mode = 'home';
    }
    if (!Number.isFinite(s.server?.integrity) || !Array.isArray(s.logs)) return fresh();
    s.settings.speed ||= 'normal';
    if (s.settings.haptics === undefined) s.settings.haptics = true;
    if (s.settings.tips === undefined) s.settings.tips = true;
    s.settings.seen ||= {};
    s.daemons ||= [];
    if (was < 12) s.upgrades ||= {};
    s.loadout ||= { archetype: 'breaker', picks: {} };
    s.loadout.ranks ||= {};
    s.loadout.equipped ||= {};
    // v8: levels arrive. Every class starts at level 1 with a fresh tree.
    if (was < 8) { s.hackers = {}; s.serverXp = 0; s.loadout.picks = {}; s.loadout.ranks = {}; s.loadout.equipped = {}; if (s.encounter) s.encounter = null; s.version = SAVE_VERSION; }
    // v9: skills and talents got hacker names. Carry equipped skills, ranks, daemons and a live fight over.
    if (was === 8) { renameIds(s); s.version = SAVE_VERSION; }
    // v10: armor moved onto the parts. A fight saved under the old rules can't continue.
    if (was < 10) { if (s.encounter) s.encounter = null; s.version = SAVE_VERSION; }
    // v11: the Vault and theft are gone; the Encryptor encrypts instead. Drop a fight saved under the old attacks.
    if (was < 11) { if (s.encounter) s.encounter = null; delete s.server.vault; delete s.upgrades.shielding; s.version = SAVE_VERSION; }
    // v12: gear arrives and the Upgrades list retires. What you bought comes back as installed Stock gear.
    if (was < 12) migrateUpgrades(s);
    // v13: the stat set grew; Repair folded into Regen.
    if (was < 13) {
      for (const it of s.stash || []) if (it.stats?.repair) { it.stats.regen = Math.max(0.1, Math.round((it.stats.repair / 15) * 10) / 10); delete it.stats.repair; }
      if (s.encounter && active(s)) s.encounter = null;
      s.version = SAVE_VERSION;
    }
    // v14: levels run to 50. A class keeps what it had unlocked (its level roughly doubles);
    // the server's level matches your best class; a pending intrusion is rerolled at the new levels.
    if (was < 14) {
      for (const h of Object.values(s.hackers || {})) { h.level = Math.min(LOADOUT.maxLevel, h.level <= 4 ? 2 * h.level - 1 : 2 * h.level); h.xp = 0; }
      for (const l of s.locations || []) l.level = Math.min(CONFIG.maxMobLevel, (l.level || 1) * 2);
      s.encounter = null;
      s.stash ||= []; s.gear ||= { server: {}, rigs: {} };
      s.version = SAVE_VERSION;
    }
    if (was < 15) migrateToProtocols(s);
    s.hackers ||= {};
    s.stash ||= [];
    s.gear ||= { rigs: {} };
    s.recipes ||= [];
    s.services ||= {};
    s.install ||= null;
    // v16: invasions. Nothing to convert; the network starts fresh.
    s.invasion ||= null;
    s.net ||= { wall: null, next: null };
    s.degraded ||= null;
    s.gate ||= null;
    // v17: services and recipes are blueprints you find. You keep a blueprint for every service
    // you already run or are installing.
    if (was < 17) for (const id of [...Object.keys(s.services), s.install?.id].filter(Boolean)) if (!s.recipes.includes(id)) s.recipes.push(id);
    if (was < 18) migrateCategories(s);
    // v19: skills reworked and daemons are found programs. Old daemon rules and old skill picks
    // go; each class re-fills its bar from the new kit.
    if (was < 19) { s.daemons = []; s.daemonsOwned = {}; s.loadout.equipped = {}; s.loadout.picks = {}; if (s.encounter) s.encounter = null; }
    // v20: Mail, contracts and the Halcyon retainer. A server whose vault you already opened is yours.
    if (was < 20) for (const l of s.locations || []) if (Object.keys(l.state?.unlocked || {}).length) l.takenOver = true;
    // v21: the hidden network and the contract board (and Indemnity, retired in v48). Found servers get their unknown neighbours.
    if (was < 21) for (const l of s.locations || []) spawnHidden(s, l);
    // v22: Interrupt and Trace left the shared keys; each kit has a level-5 skill and seven slots.
    if (was < 22) for (const [arch, eq] of Object.entries(s.loadout.equipped || {})) {
      const add = skillOrder(arch)[2];
      if (ARCHETYPES[arch] && hackerLevel(s, arch) >= unlockLevel(arch, add) && !eq.includes(add) && eq.length < 7) eq.splice(Math.min(2, eq.length), 0, add);
    }
    // v24: outposts. Nobody has a harvester yet (site traits became specials: specialsRestore).
    s.harvesters ||= [];
    s.harvKinds ||= [];
    // v25: service configs and virus fleets. Nothing to convert.
    s.configs ||= {}; s.configsKnown ||= []; s.configsOwned ||= [];
    s.fleet ||= null;
    s.retake = null; // a hub's retake is a swarm now (fleet.mjs); one in flight on an old save is dropped
    // v26: outpost modules, the Load Balancer and Scheduler, server architecture.
    if (!('architecture' in s)) s.architecture = null;
    // v27: loot. The three category slots become Exploit, Proxy, Shell and Script; old protocols
    // keep their stats and move to the matching slot. Old rarities keep their names.
    if (was < 27) {
      for (const it of s.stash || []) if (it.kind === 'protocol') { it.group = OLD_SLOT[it.group] || (SLOTS[it.group] ? it.group : 'script'); it.affixes ||= []; it.unique ||= null; }
      for (const [arch, rig] of Object.entries(s.gear?.rigs || {})) {
        if (!Array.isArray(rig)) continue;
        const ids = rig.filter(Boolean);
        rig.length = 0;
        for (const id of ids) { const i = freeSlot(s, groupOf(stashItem(s, id) || {}), arch); if (i >= 0) rig[i] = id; }
      }
    }
    s.pace ||= { kills: 0, ms: 0 };
    // Uplink trace is gone: Traceroute became Keepalive, the Tracer daemon became Stall.
    for (const eq of Object.values(s.loadout.equipped || {})) for (let i = 0; i < eq.length; i++) if (eq[i] === 'traceroute') eq[i] = 'keepalive';
    if (s.daemonsOwned?.tracer) { s.daemonsOwned.stall = Math.max(s.daemonsOwned.stall || 0, s.daemonsOwned.tracer); delete s.daemonsOwned.tracer; }
    if (s.daemons) s.daemons = s.daemons.map((d) => (d === 'tracer' ? 'stall' : d));
    if (s.encounter) { delete s.encounter.trace; delete s.encounter.pendingTrace; }
    retireWall(s, was);
    retireConfigs(s);
    memoryRestore(s);
    retireTraits(s);
    // v32: Payload was flat (+1–2 a tick); it's a percentage now, about what the flat bonus was worth.
    if (was < 32) for (const it of s.stash || []) if (it.stats?.payload) it.stats.payload = Math.round(it.stats.payload * 7);
    retireClassTrees(s, was); // subclasses: each class's old tree moves to its default subclass
    invasionRestore(s, was); // v33: invasion kinds, bounties, signatures
    progressionRestore(s, was); // v34: one level; services, the specialty and greys folded away
    climbRestore(s, was); // v42: the long climb (data.mjs CLIMB): levels kept, XP into a level kept as its share
    barRestore(s, was); // v35: the nine-key bar, and tells on one clock
    kitRestore(s, was); // v37: 15-key pools, reordered lines, presets
    presetRenameRestore(s, was); // v38: swarm is area (Demolitionist), ghostroot is evasion (Phantom)
    nodeSwapRestore(s); // talent nodes a tree swapped out: their ranks go to the node in their place
    networkRestore(s, was); // v36: every save's network gets a seed (network.mjs)
    daemonRestore(s); // daemons have levels, not versions (daemons.mjs); keyed on the old field, not the version
    signatureRestore(s); // signatures are gone: what you held becomes code (invasion.mjs)
    for (const l of [s.zone, ...(s.locations || [])].filter(Boolean)) delete l.drop; // dead drops became courier events (events.mjs)
    delete s.station;
    for (const h of Object.values(s.hackers || {})) { delete h.ms; delete h.behind; } // the Behind catch-up is gone: its level clock and its once-a-level note
    s.collection ||= {}; for (const it of s.stash || []) if (it.unique) s.collection[it.unique] ||= 1; // what you already hold counts
    dexOf(s); // the Codex tab's record (genome.mjs): an older save starts it empty (its sets come from each server's floorplan codex)
    researchOf(s); // part research (research.mjs): an older save's decoded parts start decoded, and research on the old 1/5/20 scale is tripled once
    initMail(s);
    indemnityRestore(s); // v48: Indemnity retires: what you held becomes credits, once (store.mjs); keyed on the field
    { const back = retireOutposts(s, was); const l = back && s.locations?.length ? retireLetter(back) : null; if (l) systemLetter(s, l); } // v40: outposts, services and the rest retire (sockets.mjs)
    syncFlags(s); // servers a relay already pings get their route files
    s.version = SAVE_VERSION;
    materialsOf(s);
    if (!Number.isFinite(s.rng)) s.rng = 0x2545f491;
    s.loadout.equipped ||= {};
    for (const l of s.locations || []) { l.template ||= 'relay'; l.depth ||= 1; reclaimCheck(l); }
    { const back = floorsRestore(s, was); const l = back && was < 41 ? floorsLetter(back) : null; if (l) systemLetter(s, l); } // v41: layers become floors (floors.mjs)
    specialsRestore(s); // v50: site traits become server specials (specials.mjs); keyed on the field
    hooks.roomsRestore?.(s, was); // v39: every server you'd found is a room graph (netrooms.mjs)
    hooks.threadsRestore?.(s, was); // v43: threads (threads.mjs): an older save starts with none
    statsRestore(s, was); // v44: whole-number stats: Regen five times over 5 cycles, Payload flat at each item's level (gear.mjs)
    setsRestore(s, was); // v45: sets: loaded protocols stamped in slot order, set pieces you hold found, the Badge beat armed (sets.mjs)
    subRestore(s, was); // v46: no default subclass: a class past 10 that never picked plays its core (its default's keys and talent points back)
    hardenRestore(s); // harden.sh is gone: scripts you held come back as credits (firewall.mjs)
    componentsRestore(s); // v47: a pile of named components becomes its count (salvage.mjs); keyed on the field
    { const l = craftRestore(s); if (l) systemLetter(s, l); } // v49: crafting goes (progression.mjs): keyed on what the save holds
    shuntRestore(s); // the Shunt was cut (docs/parts-plan.md): keyed on the part, not the version
    collectionRestore(s); // the collection log (collection.mjs): an older save's mastered parts, beaten strains and won bosses, stamped quietly; keyed on each slot
    try { achievementsRestore(s); } catch (err) { hooks.restoreError?.(err); } // achievements.mjs: an older save earns what it has already done (its titles and stickers too), quietly; never costs the save
    if (s.encounter) s.encounter.plan ||= [];
    if (s.encounter?.virus) packParts(s); // a fight saved before packed parts hid their names
    if (s.encounter?.escapeAt) { s.encounter.objective ||= { kind: 'exfil', n: s.encounter.escapeAt }; delete s.encounter.escapeAt; } // an Exfil saved mid-fight: its upload becomes its objective (objectives.mjs); keyed on the field
    if (active(s)) { s.encounter.paused = true; s.encounter.autoPaused = true; } // resumes on the next order, or opening the Fight tab
    return s;
  } catch (err) {
    hooks.restoreError?.(err); // a test or the console can see why a save fell back to fresh
    return fresh();
  }
}

export function suggestions(s, input = '') {
  const text = input.toLowerCase().trimStart();
  const space = text.indexOf(' ');
  const living = livingParts(s);
  const lo = loadoutSuggestions(s, text);
  if (lo) return lo;
  if (space > 0) {
    const ability = text.slice(0, space);
    const a = ABILITIES[ability === spikeWord(s) ? 'spike' : ability];
    const prefix = text.slice(space + 1).trim();
    if (a && ['part', 'attack'].includes(a.target)) {
      const keys = (a.target === 'attack' ? attackers(s) : living).map((p) => partKey(s, p));
      return keys.filter((k) => k.startsWith(prefix)).map((k) => `${ability} ${k}`);
    }
  }
  const base = active(s)
    ? [...usable(s).map((id) => (id === 'spike' ? spikeWord(s) : id)), 'hold', 'pause', 'resume', 'cancel', 'status', 'scan', ...living.filter((p) => p.kind !== 'fragment').map((p) => `inspect ${packed(s, s.encounter.virus, p) ? partKey(s, p) : p.id}`)]
    : ['engage', 'jack in', 'mail', 'repair', 'top up', 'protocols', 'load', 'unload', 'encounter cryptjack', 'encounter splinter', 'encounter ghostroot', 'encounter random', 'status', 'developer reboot'];
  return base.filter((x) => x.startsWith(text));
}

// Tab completion for presets: loadout use|show|delete|save <name>, and the loadout verbs themselves.
export function loadoutSuggestions(s, input = '') {
  const text = input.toLowerCase().trimStart();
  if (!/^lo/.test(text) || active(s)) return null;
  const m = text.match(/^loadout (use|show|delete|save) ?(.*)$/);
  if (m) return Object.keys(presetsOf(s)).filter((n) => n.startsWith(m[2].trim())).map((n) => `loadout ${m[1]} ${n}`);
  return ['loadout list', 'loadout use ', 'loadout save ', 'loadout show ', 'loadout delete '].filter((x) => x.startsWith(text) && x !== text);
}

export { MUTATIONS };

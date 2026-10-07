// BLACKBOX combat engine. Pure and deterministic: commands in, events out.
// Rendering never advances the simulation. This file is written so it can
// later run on a shared server unchanged.
import { onFound, memoryCommand, isLive, joinCost } from './memory.mjs';
import { ELITE, EDGE, SYNC, CONFIG, ABILITIES, SKILLS, DAEMONS, DAEMON_VERSIONS, DAEMON_DROPS, FAMILIES, FIXTURES, GUARDS, MUTATIONS, STRAINS, SERVER, TEMPLATES, createVirus, createLocation, ARCHETYPES, LOADOUT, TREE, UNLOCKS, XP, xpToNext, killXp, xpScale, power, mobPower, skillOrder, unlockLevel } from './data.mjs';

import { contractKill, standingCrash, mailCommand, tickMail, initMail, openContracts } from './mail.mjs';
import { tickStore, buy } from './store.mjs';
import { buyFrom, claimServer, reclaimCheck, clearedFor } from './factions.mjs';
import { tickMarket, marketCommand } from './market.mjs';
import { tickPayloads, payloadCommand } from './payload.mjs';
import { tickHubs, hubCommand, hubWon } from './hubs.mjs';
import { SALVAGE_COSTS, settle, spend, splitPay, canAfford } from './salvage.mjs';
import { has as hasConfig, configCommand, CONFIGS, known as configsKnown, bankConfig, RETIRED_CONFIGS, CONFIG_COST } from './configs.mjs';
import { fleetCommand, fleetWon } from './fleet.mjs';
import { architectureCommand, archCredits } from './architecture.mjs';
import { outpostCommand, outpostWon, infestWon, siteTrait, OUTPOST, knowsPlan, learnPlan } from './outpost.mjs';
import { consortiumWon } from './consortium.mjs';
import { rollRogue, rogueKill } from './rogue.mjs';
import { tickRoot, processWon } from './root.mjs';
import { firewallCommand, wear } from './firewall.mjs';
import { portsCommand } from './invasion.mjs';
import { filterCommand, CRAFTABLE, knowsFilter, learnFilter, filterStat, FILTER_STATS, rollFilter, addFilter } from './filters.mjs';
import { spawnHidden, huntKill, hiddenNode, hiddenLead, HIDDEN, installRelay, useItem, syncFlags } from './hidden.mjs';
import { STATS, RARITIES, RARITY_ORDER, ZERO_DAYS, LOOT, lootOdds, magicFind, uniqueItem, DECONSTRUCT, SLOTS, OLD_SLOT, BASES, AFFIX_FOR, COMPILE, STASH_CAP, CRIT, ECHO, PROTOCOL_NAMES, protocolSlots, rollItem, statLine, itemLabel, MATERIALS, codeOf, codeDrop, EXPLOIT_CHANCE, SERVICES, SERVICE_SOURCES, VERSIONS, ports, serviceCost, serviceSalvage, costLine, BLUEPRINTS, BLUEPRINT_CHANCE, blueprintName, recipeId, recipeStat, PROTOCOL_STATS, SLOT_KINDS, GROUPS, groupOf, statValue, seeded } from './gear.mjs';

import ITEMS from './content/items.mjs';
import { fxText } from './content.mjs';

export const SAVE_VERSION = 30;

// run.mjs registers callbacks here (it imports this file, so we can't import it).
export const hooks = { flee: null, now: null }; // now: the clock (tests set it). crew.mjs adds crewAct, crewActOne, crewActNamed, crewStanding, crewTurns, crewAll, crewHurt, crewEngage, crewEnd; run.mjs crewGuests, foldersOf; the browser sets stepped.

export function fresh() {
  const s = {
    version: SAVE_VERSION,
    server: { integrity: CONFIG.maxIntegrity, max: CONFIG.maxIntegrity, credits: CONFIG.startingCredits },
    encounter: null,
    leadProgress: { ransomware: 0, worm: 0, ghostroot: 0 },
    locations: [],
    run: null,
    daemons: [], // slotted daemon ids
    daemonsOwned: {}, // daemon id → version (1–3)
    // Protocols: one shared stash; each class loads its own (gear.rigs[class] = protocol ids).
    stash: [],
    gear: { rigs: {} },
    recipes: [], // sources you've banked: Zero-day protocols you can compile, special services you can install
    // The server runs services (id → version) on its ports, one install at a time.
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
    // Each class levels on its own and starts at 1. The server levels from everyone's work.
    hackers: {},
    serverXp: 0,
    salvage: [],
    logs: [],
    reports: [],
    serial: 0,
    seed: 1,
    settings: { sound: true, motion: true, speed: 'relaxed', haptics: true, tips: true, seen: {} }, // seen: first-time tips already shown
    tutorialCompleted: false,
    harvesters: [], // packaged harvesters waiting to go on an outpost
    harvKinds: [], // harvester kinds you can compile
    configs: {}, // service → config running on it
    configsKnown: [], // config sources banked (craftable)
    configsOwned: [], // configs crafted
    fleet: null, // a virus fleet on its way to one of your outposts
    architecture: null, // fortress | hub | lab, picked at server level 20
  };
  initMail(s); // the first LOWLIGHT mail is waiting
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
export const patchDelay = (s) => CONFIG.patchDelay - (s.encounter?.virus.mutation === 'regenerative' ? 1 : 0) + rank(s, 'armor-cracker');
// Total armor chits left on the virus (and how many it started with).
export function armorLeft(s) {
  const all = livingParts(s);
  return { current: all.reduce((n, p) => n + (p.armor || 0), 0), max: parts(s).reduce((n, p) => n + (p.maxArmor || 0), 0) };
}

// ---------- your class in a fight ----------
// Key 1 is Spike, everyone's free hit; 2–8 are your seven equipped skills, in order.
// A key only appears once your class's level unlocks it.
export const CANTRIP_IDS = ['spike'];
export const classOf = (s) => s.loadout?.archetype || 'breaker';
// Is this talent picked for your current class?
export function hasTalent(s, id) {
  const arch = classOf(s);
  const picks = s.loadout?.picks?.[arch] || [];
  return ARCHETYPES[arch].talents.some((pair, i) => (picks[i] === 0 || picks[i] === 1) && pair[picks[i]].id === id);
}
// Cooldowns after talents.
export function cooldownOf(s, id) {
  if (id === 'overload' && hasTalent(s, 'hair-trigger')) return 2;
  if (id === 'suspend' && hasTalent(s, 'preemption')) return 2;
  return ABILITIES[id]?.cooldown || 0;
}
export function keyMap(s) {
  const map = {};
  const lvl = hackerLevel(s);
  const arch = classOf(s);
  CANTRIP_IDS.forEach((id, i) => { if (unlockLevel(arch, id) <= lvl) map[String(i + 1)] = id; });
  equippedSkills(s, arch).forEach((id, i) => { map[String(i + 2)] = id; });
  return map;
}
export const keyOf = (s, id) => Object.entries(keyMap(s)).find(([, v]) => v === id)?.[0] || '';
// Abilities you can use in a fight right now (run-only skills like Spoof are not fight abilities).
export const usable = (s) => Object.values(keyMap(s)).filter((id) => ABILITIES[id]);

// What the current fight damages: your server at home, your Signal on a run.
export function defender(s) {
  return s.encounter?.mode === 'run' ? s.run : s.server;
}
export const familyInfo = (id) => FAMILIES[id] || GUARDS[id];

// Veiled parts hide their attack timers while they still have armor; Blind hides every timer for a
// few cycles. A Tagged part's timer always shows.
export function timersHidden(s, p = null) {
  const c = s.encounter.cycle;
  // Actuarial Model (Halcyon): nothing hides its timers from you.
  const hides = (x) => alive(x) && !(x.taggedUntil >= c) && x.veiled && x.armor > 0 && !zeroDay(s, 'actuarial');
  return p ? hides(p) : livingParts(s).some(hides);
}

// Statuses on a part (the debuffs every class can cash in).
export function statusesOn(s, p) {
  const c = s.encounter.cycle;
  return ['exposed', 'tagged', 'hooked', 'throttled', 'quarantined'].filter((k) => p[k + 'Until'] >= c);
}
const on = (s, p, k) => p[k + 'Until'] >= s.encounter.cycle;
const buffed = (e, k) => e.buffs?.[k] >= e.cycle;

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
  let m = opts.server ? 1 : gapDealt(levelGap(s));
  if (opts.dot && on(s, p, 'tagged')) m *= SKILLS.tagged + (p.tagBoost || 0) + 0.1 * rank(s, 'persistent-tag');
  if (on(s, p, 'quarantined')) m *= SKILLS.quarantined;
  if (e.virus.weakKnown && e.virus.weakPoint === p.id) m *= CONFIG.weakMultiplier;
  if (opts.mine) {
    m *= 1 + 0.03 * rank(s, 'overclocked');
    if (classOf(s) === 'breaker') m *= 1 + momentumBonus(s);
    if (hasTalent(s, 'unsafe-mode')) m *= 1.3;
    if (e.synced) m *= 1 + CONFIG.sync.bonus;
    for (const x of fxFire(s, 'hit', { target: p, do: 'damage%' })) m *= 1 + x.value / 100;
  }
  if (opts.dot) for (const x of fxFire(s, 'custom', { do: 'dot%' })) m *= 1 + x.value / 100;
  return m;
}

// Base damage of a skill against a part, before the part's multipliers.
export function skillBase(s, id, p) {
  const a = ABILITIES[id];
  let base = a?.damage || 0;
  if (id === 'overload') base = (hasTalent(s, 'hair-trigger') ? 35 : base) + 4 * rank(s, 'heat-sink');
  const e = s.encounter;
  if (id === 'rate-limit') base += 4 * rank(s, 'token-bucket') + (p?.attack && p.attack.due <= e?.cycle ? a.due : 0); // choke it as it sends: more if its attack is due now
  if (id === 'backdoor') base += 4 * rank(s, 'backchannel') + a.perBurn * burnsOn(s, p).length;
  if (id === 'opening') base += 5 * rank(s, 'recon');
  if (id === 'flood' && p && !(p.armor > 0)) base *= 2;
  if (id === 'exploit' && hasTalent(s, 'sharp-exploit')) base = 20;
  if (id === 'segfault' && p && p.integrity < p.max * (hasTalent(s, 'core-dump') ? 0.4 : 0.3)) base *= a.execute;
  // Retaliate: twice the attack that reached you (it's already your size: no power scaling).
  if (id === 'retaliate') return Math.min(scaled(s, a.cap), 2 * (e?.procs?.struck?.amount || 0)) + (rank(s, 'reverse-shell') ? scaled(s, 5 * rank(s, 'reverse-shell')) : 0);
  return base * powerOf(s);
}
// Your burns on a part (Inject stacks, Purge, Thermal Runaway…).
export const burnsOn = (s, p) => (p && s.encounter?.burns ? s.encounter.burns.filter((b) => b.target === p.id) : []);
export const helpersOn = (s, p) => (p && s.encounter?.helpers ? s.encounter.helpers.filter((h) => h.target === p.id) : []);
export const helperCap = (s) => (hasTalent(s, 'hive') ? 9 : SKILLS.helperCap);
// Procs and reactive windows: a key lights up after an event and stays lit through `until`.
//   stripped: you broke a part's last chit (Shatter) · struck: an attack reached you (Retaliate) ·
//   slipped: an attack missed you or was delayed (Opening).
export const procOpen = (s, kind) => { const e = s.encounter; const x = e?.procs?.[kind]; return !!x && (typeof x === 'number' ? x : x.until) >= e.cycle; };
function openProc(s, kind, extra = {}) {
  const e = s.encounter;
  const ids = Object.keys(ABILITIES).filter((id) => ABILITIES[id].proc === kind && usable(s).includes(id));
  if (!ids.length) return;
  const a = ABILITIES[ids[0]];
  const longer = (kind === 'struck' && hasTalent(s, 'active-defense')) || (kind === 'slipped' && hasTalent(s, 'fast-hands'));
  (e.procs ||= {})[kind] = { until: e.cycle + a.window + (longer ? 1 : 0), ...extra };
  emit(s, 'proc', `${a.name} is lit.`, { ability: ids[0] });
}
// Armor-piercing: goes straight through armor chits (Backdoor, Bypass; Overload with Piercing).
// Piercing (Breaker talent): only a fight's first Overload goes through armor.
export const ignoresArmor = (s, id) => !!ABILITIES[id]?.pierce || (id === 'overload' && hasTalent(s, 'piercing') && !s.encounter?.once?.pierced);

// What a skill would do to a part now: 0 if armor would absorb it (it breaks a chit instead).
export function previewDamage(s, abilityId, p) {
  if (!p || !skillBase(s, abilityId, p)) return 0;
  if (p.armor > 0 && !ignoresArmor(s, abilityId) && !rootkitReady(s)) return 0;
  return Math.min(p.integrity, Math.floor((skillBase(s, abilityId, p) + gearStat(s, 'damage')) * damageMultiplier(s, p, { mine: true }) + 1e-9));
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
// Slots are typed: each takes one category of protocol (SLOT_KINDS). Index = slot.
export const freeSlot = (s, kind, arch = classOf(s)) => { const rig = rigOf(s, arch); for (let i = 0; i < slotCount(s, arch); i++) if (SLOT_KINDS[i] === kind && !(rig[i] && stashItem(s, rig[i]))) return i; return -1; };
const unslot = (s, id) => { for (const r of Object.values(gearOf(s).rigs)) if (Array.isArray(r)) for (let i = 0; i < r.length; i++) if (r[i] === id) r[i] = null; };
// Which class has a protocol loaded, or null.
export function loadedOn(s, id) {
  for (const [arch, rig] of Object.entries(gearOf(s).rigs)) if (Array.isArray(rig) && rig.includes(id)) return arch;
  return null;
}

// ---------- services (the server) ----------
export const serviceVersion = (s, id) => (s.services || {})[id] || 0;
export const portsUsed = (s) => Object.keys(s.services || {}).length + (s.install && !serviceVersion(s, s.install.id) ? 1 : 0);
export const portCount = (s) => ports(serverLevel(s));
const baseMax = (s) => Math.round(CONFIG.maxIntegrity * power(serverLevel(s)));
// What a running service adds, in the stat's own terms.
export function serviceValue(s, id, v = serviceVersion(s, id)) {
  const d = SERVICES[id];
  if (!d || !v) return 0;
  const x = d.values[v - 1];
  if (d.stat === 'integrity') return Math.round((baseMax(s) * x) / 100);
  if (d.stat === 'shield') return Math.round((serverMax(s) * x) / 100);
  if (d.flat) return STATS[d.stat]?.dp ? Math.round(x * power(serverLevel(s)) * 10) / 10 : Math.max(1, Math.round(x * power(serverLevel(s))));
  return x;
}
export function serviceStat(s, stat) {
  let n = 0;
  for (const id of Object.keys(s.services || {})) if (SERVICES[id]?.stat === stat) n += serviceValue(s, id);
  // Hot-patcher Triage: double repair below half Integrity, half above.
  if (stat === 'regen' && n && hasConfig(s, 'triage')) n *= s.server.integrity < serverMax(s) / 2 ? 2 : 0.5;
  return n;
}

// A stat's total. side 'hacker': your protocols; 'server': the server's services; none: both.
// (Survival stats exist on both sides and count where that side is defending.)
export function gearStat(s, stat, side = null) {
  let n = 0;
  if (side !== 'server') for (const it of loaded(s)) {
    n += it.stats[stat] || 0;
    // A unique whose stat counts double while its condition holds (Hotfix, Shade Filter…).
    const fx = it.unique && UNIQUES[it.unique]?.effect;
    if (fx?.when === 'always' && fx.do === 'stat-x2' && fx.stat === stat && !['signal', 'integrity'].includes(stat) && fxCond(s, fx)) n += it.stats[stat] || 0;
  }
  if (side !== 'hacker') n += serviceStat(s, stat) + (FILTER_STATS[stat]?.home ? filterStat(s, stat) : 0); // decoys and a sandbox in the firewall's filters
  if (STATS[stat]?.dp) n = Math.round(n * 10) / 10;
  return STATS[stat]?.cap ? Math.min(STATS[stat].cap, n) : n;
}
// Who's being defended right now: your rig on a run, the server at home.
export const guarding = (s) => (s.encounter && (active(s) || s.encounter.phase === 'alert') ? (s.encounter.mode === 'run' ? 'hacker' : 'server') : s.run ? 'hacker' : 'server');
export const defense = (s, stat) => gearStat(s, stat, guarding(s));
export const critMultiplier = () => CRIT.multiplier;
// Your power: every level, your numbers grow 4% (damage, heals, shields, Signal).
export const powerOf = (s) => power(hackerLevel(s));
const scaled = (s, n) => Math.max(1, Math.round(n * powerOf(s)));
// The level gap to the enemy you're fighting (positive: it's above you).
export const levelGap = (s) => (s.encounter?.virus?.level || hackerLevel(s)) - hackerLevel(s);
// Classic-style misses: 5% against a same-level target, +1% per level it's above you, −1% per
// level below (never under 0). Your hits: less your Accuracy. Its hits: plus your Evasion.
const gapMiss = (gap) => Math.min(CONFIG.maxMiss, Math.max(0, CONFIG.baseMiss + gap));
export const missChance = (s) => (CONFIG.misses ? Math.max(0, gapMiss(levelGap(s)) - gearStat(s, 'accuracy')) : 0);
export const enemyMissChance = (s) => (CONFIG.misses ? Math.min(75, gapMiss(-levelGap(s)) + defense(s, 'evasion')) : defense(s, 'evasion'));
// Server Regen between fights: very slow (its per-cycle value, per real minute).
// Between fights: resting (see CONFIG.restRegen) plus any Hot-patcher, per minute.
const maxSignalOf = (s) => maxSignal(s);
export function idleRegen(s, ms) {
  // Signal rests back up while you're not connected.
  let changed = false;
  if (!s.run && s.signal != null && !active(s)) {
    const max = maxSignalOf(s);
    if (s.signal < max) {
      s.signalAcc = (s.signalAcc || 0) + (CONFIG.signalRest * max * ms) / 60000;
      const n = Math.floor(s.signalAcc + 1e-9);
      if (n) { s.signalAcc -= n; s.signal = Math.min(max, s.signal + n); changed = true; }
    }
    if (s.signal >= max) s.signal = null; // full again: back to "whatever your max is"
  }
  if (active(s) || s.server.integrity <= 0 || s.server.integrity >= s.server.max) return changed;
  const besieged = s.invasion && ['siege', 'breach'].includes(s.invasion.state);
  const rate = gearStat(s, 'regen', 'server') + (besieged ? 0 : CONFIG.restRegen * s.server.max);
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
export const serverMax = (s) => baseMax(s) + serviceStat(s, 'integrity');
// Cron Job and Snapshot are services now.
export const cronDamage = (s) => Math.round(8 * power(serverLevel(s)) * (SERVICES.cron.values[serviceVersion(s, 'cron') - 1] || 0));
// Rootkit: your first hit each fight goes through armor.
export const rootkitReady = (s) => !!zeroDay(s, 'rootkit') && active(s) && !s.encounter.once?.rootkit;
// Keep the server's max Integrity in step with its level and its RAID Array.
export function syncServer(s) {
  const max = serverMax(s);
  const delta = max - s.server.max;
  s.server.max = max;
  if (delta > 0 && s.server.integrity > 0) s.server.integrity += delta;
  s.server.integrity = Math.min(s.server.integrity, max);
}
// A new protocol into the stash. A full stash scraps it for salvage instead.
export function addItem(s, item, why = 'Loot: ') {
  s.stash ||= [];
  if (s.stash.length >= STASH_CAP) {
    const got = deconstruct(s, item);
    emit(s, 'info', `Stash full (${STASH_CAP}): ${itemLabel(item)} deconstructed: ${got}.`);
    return null;
  }
  const it = { ...item, id: 'g' + (s.nextItem = (s.nextItem || 0) + 1) };
  s.stash.push(it);
  emit(s, 'drop', `${why}${itemLabel(it)}${it.unique || it.zeroDay ? ' (Zero-day)' : ''}: ${statLine(it.stats)}.`, { item: it, rarity: it.rarity });
  return it;
}
// Break an item down: salvage, code (the family it dropped from) and Exploits. Returns a summary.
// out (optional): rows for the gain card (app.js), { label, qty, kind, text }.
export function deconstruct(s, item, out = null) {
  const d = DECONSTRUCT[item.rarity] || DECONSTRUCT.stock;
  const n = d.salvage[0] + Math.floor(rand(s) * (d.salvage[1] - d.salvage[0] + 1)) + Math.floor((item.level || 1) / 10);
  for (let i = 0; i < n; i++) s.salvage.push({ name: 'Scrap', virus: itemLabel(item), seed: 0 });
  const code = item.from && codeOf(item.from) ? codeOf(item.from) : ['cipher', 'worm', 'kernel'][Math.floor(rand(s) * 3)];
  const mats = materialsOf(s);
  if (d.code) mats[code] = (mats[code] || 0) + d.code;
  const ex = item.compiled ? 0 : d.exploit; // what you compiled yourself gives no Exploits back
  if (ex) mats.exploit = (mats.exploit || 0) + ex;
  if (out) out.push({ label: 'Salvage', qty: `+${n}`, kind: 'loot', text: `${n} salvage` }, ...(d.code ? [{ label: MATERIALS[code].name, qty: `+${d.code}`, kind: 'code', text: `${d.code} ${MATERIALS[code].name}` }] : []), ...(ex ? [{ label: 'Exploit', qty: `+${ex}`, kind: 'exploit', text: `${ex} Exploit` }] : []));
  return [`${n} salvage`, d.code && `${d.code} ${MATERIALS[code].name}`, ex && `${ex} Exploit${ex > 1 ? 's' : ''}`].filter(Boolean).join(', ');
}
// ---------- drops ----------
// Uniques written in content/items.mjs (the editor's Uniques page).
export const UNIQUES = Object.fromEntries((ITEMS.uniques || []).map((u) => [u.id, u]));
const uniqueById = (id) => UNIQUES[id] || null;
// Does a unique drop from here? ctx: { kind: sprawl|home|guard|rogue|vault, id, layer, strain }.
const dropsHere = (u, ctx) => (u.sources || []).some((src) => src.kind === ctx.kind && (!src.id || src.id === ctx.id) && (!src.layer || (ctx.layer || 1) >= src.layer)
  || (src.kind === 'sprawl' && ctx.kind === 'sprawl') || (src.kind === 'guard' && ctx.kind === 'guard' && src.id === ctx.id));
export function uniqueFrom(s, ctx, level) {
  const pool = Object.values(UNIQUES).filter((u) => u.level <= level + 2 && dropsHere(u, ctx) && !['story', 'contract', 'store'].includes(ctx.kind));
  return pool.length ? pool[Math.floor(rand(s) * pool.length)] : null;
}
// An elite's unique: any world drop (SPRAWL, vaults, guards, rogue servers) up to its level, wherever
// it was written to drop. Story, contract, store and strain uniques stay where they belong.
const WORLD = ['sprawl', 'vault', 'guard', 'rogue'];
function eliteUnique(s, level) {
  const pool = Object.values(UNIQUES).filter((u) => u.level <= level + 2 && (u.sources || []).some((src) => WORLD.includes(src.kind)));
  return pool.length ? pool[Math.floor(rand(s) * pool.length)] : null;
}
// One roll: maybe nothing, mostly grey or white, now and then blue, rarely yellow or gold. Odds come
// from time targets and the pace (LOOT.killsPerHour); Scavenge is magic find; depth helps a little.
function rollOnce(s, ctx, level) {
  const odds = lootOdds(), mf = magicFind(gearStat(s, 'scavenge')), deep = 1 + LOOT.depthBonus * Math.max(0, (ctx.layer || 1) - 1);
  const r = rand(s);
  let rarity = null;
  if (r < odds.zeroday * mf) rarity = 'zeroday';
  else if (r < (odds.zeroday + odds.custom * deep) * mf) rarity = 'custom';
  else if (r < (odds.zeroday + (odds.custom + odds.tuned) * deep) * mf) rarity = 'tuned';
  else if (r < LOOT.common) rarity = rand(s) < LOOT.greyShare ? 'scrap' : 'stock';
  if (!rarity) return null;
  if (rarity === 'zeroday') {
    const u = uniqueFrom(s, ctx, level);
    if (u) return uniqueItem(u, level, () => rand(s));
    rarity = 'custom';
  }
  return rollItem(() => rand(s), { level, rarity });
}
// What a fight drops, or null: the best of its rolls (guards, Pits and bounties roll twice).
// A strain also has its own trophy: 1 in LOOT.trophy kills of that strain.
export function rollDrop(s, ctx, level) {
  if (typeof ctx === 'string') ctx = { kind: ctx === 'guard' ? 'guard' : 'home' };
  const rolls = ctx.rolls || LOOT.rolls[ctx.kind] || 1;
  let best = null;
  for (let i = 0; i < rolls; i++) {
    const it = rollOnce(s, ctx, level);
    if (it && (!best || RARITY_ORDER.indexOf(it.rarity) > RARITY_ORDER.indexOf(best.rarity))) best = it;
  }
  // An elite (a crew room): never less than a blue, and now and then a unique.
  if (ctx.elite) {
    if (rand(s) < ELITE.unique) { const u = eliteUnique(s, level); if (u) best = uniqueItem(u, level, () => rand(s)); }
    if (!best || RARITY_ORDER.indexOf(best.rarity) < RARITY_ORDER.indexOf(ELITE.floor)) best = rollItem(() => rand(s), { level, rarity: ELITE.floor });
  }
  if (ctx.strain && (ctx.trophy || rand(s) < 1 / LOOT.trophy)) { // a streak reward rolls for it outright
    const t = Object.values(UNIQUES).find((u) => (u.sources || []).some((src) => src.kind === 'strain' && src.id === ctx.strain));
    if (t) best = uniqueItem(t, level, () => rand(s));
  }
  if (best && ctx.family) best.from = ctx.family;
  return best;
}
// Your pace: kills an hour of active play (the System page shows it; drop odds assume LOOT.killsPerHour).
export const paceOf = (s) => { const p = s.pace || { kills: 0, ms: 0 }; return { kills: p.kills, minutes: p.ms / 60000, perHour: p.ms > 5 * 60000 ? Math.round(p.kills / (p.ms / 3600000)) : null }; };
// A unique by id, as a reward (story beats, contracts).
export function giveUnique(s, id, why = 'Reward: ') {
  const u = uniqueById(id);
  if (!u) return null;
  return addItem(s, uniqueItem(u, hackerLevel(s), () => rand(s)), why);
}

// ---------- unique effects ----------
// Each loaded unique's effect (blocks from content/items.mjs). fxCond: does its condition hold now?
const uniqueFx = (s) => loaded(s).map((it) => (it.unique && UNIQUES[it.unique]?.effect ? { it, fx: UNIQUES[it.unique].effect, id: it.unique } : null)).filter(Boolean);
function fxCond(s, fx, ctx = {}) {
  const e = s.encounter, p = ctx.target;
  const d = () => (e?.mode === 'run' || s.run ? s.run || { integrity: 1, max: 1 } : s.server);
  switch (fx.if || '') {
    case '': return true;
    case 'target-below-half': return !!p && p.integrity < p.max / 2;
    case 'target-bare': return !!p && !p.armor;
    case 'target-winding': return !!p?.attack && !!e && p.attack.due - e.cycle <= 1;
    case 'synced': return !!e?.synced || !!ctx.synced;
    case 'even-cycle': return !!e && e.cycle % 2 === 0;
    case 'odd-cycle': return !!e && e.cycle % 2 === 1;
    case 'below-half': return d().integrity < d().max / 2;
    case 'below-20': return d().integrity < d().max * 0.2;
    case 'crit': return !!ctx.crit;
    default: return false;
  }
}
const fxScale = (s, fx) => {
  const e = s.encounter;
  const k = fx.scale === 'cycles' ? Math.max(0, (e?.cycle || 1) - 1) : fx.scale === 'contracts' ? (s.mail?.jobs || []).filter((j) => !j.done).length : fx.scale === 'broken' ? e?.breaks || 0 : 1;
  const v = (Number(fx.value) || 0) * k;
  return fx.cap ? Math.min(fx.cap, v) : v;
};
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
// Effects firing now: [{ fx, it, id, value }]. spend: use up their limits.
export function fxFire(s, when, ctx = {}, spend = true) {
  const out = [];
  for (const x of uniqueFx(s)) {
    if (x.fx.when !== when || (ctx.do && x.fx.do !== ctx.do) || !fxCond(s, x.fx, ctx) || !fxReady(s, x.fx, x.id)) continue;
    if (spend) fxSpend(s, x.fx, x.id);
    out.push({ ...x, value: fxScale(s, x.fx) });
  }
  return out;
}
const fxHas = (s, what) => uniqueFx(s).find((x) => x.fx.do === what) || null;
export const effectLine = (it) => (it?.unique && UNIQUES[it.unique]?.effect ? fxText(UNIQUES[it.unique].effect, (k) => STATS[k]?.name || k) : '');

// ---------- blueprints ----------
export const knows = (s, id) => (s.recipes || []).includes(id);
export const knownRecipes = (s) => PROTOCOL_STATS.filter((k) => knows(s, recipeId(k)));
// Learn a blueprint you don't have yet: the Firewall first, then any other. Every one known:
// it's salvage instead.
// A blueprint teaches something you don't know yet, from every kind of recipe: a protocol recipe or
// a service source, a filter recipe, a harvester or module plan, a config source. The first is
// always the Firewall.
export function learnBlueprint(s, why = '') {
  s.recipes ||= [];
  const left = BLUEPRINTS.filter((id) => !knows(s, id));
  const others = [
    ...CRAFTABLE.filter((k) => !knowsFilter(s, k)).map((k) => () => learnFilter(s, k, why)),
    ...Object.keys(OUTPOST.plans).filter((k) => !knowsPlan(s, k)).map((k) => () => learnPlan(s, k, why)),
    ...Object.keys(CONFIGS).filter((k) => !configsKnown(s).includes(k)).map((k) => () => bankConfig(s, k, why)),
  ];
  if (!left.length && !others.length) {
    for (let i = 0; i < 2; i++) s.salvage.push({ name: 'Blueprint scraps', virus: 'blueprint', seed: 0 });
    return emit(s, 'info', `${why}a blueprint you already know: +2 salvage.`);
  }
  const k = Math.floor(rand(s) * (left.length + others.length));
  if (k >= left.length) return others[k - left.length]();
  const id = left[k];
  s.recipes.push(id);
  const stat = recipeStat(id);
  return emit(s, 'drop', stat ? `${why}${blueprintName(id)}. You can compile ${STATS[stat].name} protocols.` : `${why}${blueprintName(id)}. You can install ${SERVICES[id].name}.`, { recipe: id });
}

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
function codeFrom(s, family, level, source) {
  const k = codeOf(family);
  const out = {};
  if (k) out[k] = Math.round(codeDrop(level) * (source === 'guard' ? 1.5 : 1) * (1 + gearStat(s, 'scavenge', 'hacker') / 100));
  if (rand(s) < EXPLOIT_CHANCE[source]) out.exploit = 1;
  return out;
}

// ---------- buyout ----------
// Master of Orion style: finish a timed build now for credits. 3× its credit cost when it starts,
// falling with the time left (never under 20). Installs and upgrades here; outposts (a slot
// resetting, a lockdown) in outpost.mjs.
export const BUYOUT = { mult: 3, min: 20, lockdown: 250, reset: 80 };
export const buyoutPrice = (base, left, total) => (left <= 0 ? 0 : Math.max(BUYOUT.min, Math.ceil(BUYOUT.mult * base * Math.min(1, left / total))));
export const installBuyout = (s, now = Date.now()) => (s.install ? buyoutPrice(VERSIONS[s.install.v - 1].credits, s.install.doneAt - now, s.install.doneAt - s.install.startedAt) : 0);

// ---------- the install queue ----------
// One install at a time, in real time. `now` comes from the caller (the engine keeps no clock).
export function tickServices(s, now = Date.now()) {
  const first = s.serial;
  const job = s.install;
  if (job && now >= job.doneAt && !s.degraded) {
    s.install = null;
    (s.services ||= {})[job.id] = job.v;
    syncServer(s);
    emit(s, 'service-done', `${SERVICES[job.id].name} v${job.v} is running.`, { service: job.id, v: job.v });
    firstTime(s, `install-${job.id}-${job.v}`, `${SERVICES[job.id].name} v${job.v} running`);
  }
  tickMail(s, now);
  tickStore(s, now);
  tickMarket(s, now);
  tickPayloads(s, now);
  tickHubs(s, now);
  tickRoot(s, now, (loc) => hooks.procRooms?.(loc) || []);
  tickHot(s, now);
  return since(s, first);
}

export function emit(s, type, message, detail = {}) {
  const event = { id: ++s.serial, cycle: s.encounter?.cycle || 0, type, message, ...(s.who ? { who: s.who } : {}), ...detail }; // who: a crewmate's name (crew.mjs)
  s.logs.push(event);
  if (s.logs.length > 600) s.logs.shift();
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
  if (opts.elite) over.elite = true;
  if (mode === 'run') over.run = true; // tuned for Signal fights (CONFIG.runHp, runDamage)
  const virus = createVirus(key, seed, over);
  if (mode === 'home') { s.seed = seed; s.gate = null; }
  if (opts.name) virus.name = opts.name; // a fight with a name already on screen (a file you attacked)
  (s.met ||= {})[virus.strain || virus.family] = true; // the Codex names what you've met
  s.encounter = { phase: 'alert', mode, zone: !!opts.zone, wild: opts.wild || null, process: opts.process || null, room: opts.room || null, key, virus, seed, cycle: 1, elapsedMs: 0, paused: false, queue: null, plan: [], lastAttack: null, readyAt: {}, nextFragment: 1, metrics: null, breaks: 0, helpers: [], burns: [], buffs: {}, shield: 0, chits: 0, undo: null, encrypt: 0, scrambleUntil: 0, clock: 0, regenAcc: 0, leechAcc: 0, once: {}, soft: opts.zone && !opts.wild && !opts.process && hackerLevel(s) < CONFIG.zone.starterBelow ? CONFIG.zone.starterHit : 1 }; // soft: your first levels in SPRAWL-00 hit softer, so you can learn the board
  if (!opts.quiet) emit(s, 'intrusion', opts.zone
    ? `${virus.name} in ${opts.room}. Level ${virus.level} ${familyInfo(virus.family).name}.`
    : mode === 'run'
    ? `${virus.name} guards ${opts.room}.`
    : `${virus.name} detected. Level ${virus.level} ${familyInfo(virus.family).name}.`);
}

// Every neutralized virus moves you toward its origin. 100 = a location.
// `next`: a route file's lead (a log sweep) locates on the layer past yours; a kill's, on yours.
export function addLead(s, family, amount, why = '', next = false) {
  s.leadProgress[family] = (s.leadProgress[family] || 0) + amount;
  emit(s, 'lead', `${why}${FAMILIES[family].name} lead +${amount}% (${Math.min(100, s.leadProgress[family])}%).`, { family });
  while (s.leadProgress[family] >= 100) {
    s.leadProgress[family] -= 100;
    addLocation(s, family, SERVER.layerFor(hackerLevel(s)) + (next ? 1 : 0)); // kills trace your own layer
  }
}

// A server by id: one you've traced, or a consortium member's (consortium.mjs).
export const findLocation = (s, id) => s.locations.find((l) => l.id === id) || s.consortium?.servers?.find((l) => l.id === id) || (s.occupation?.id === id ? s.occupation : null);

// Templates rotate so consecutive locations play differently.
export function addLocation(s, family, depth = 1, parent = null) {
  s.foundSeq = Math.max(s.foundSeq || 0, s.locations.length) + 1; // a running count: dropped finds (FIND_CAP) don't come back
  let seed = s.seed * 31 + (s.foundSeq - 1) * 7 + 5;
  let loc = createLocation(family, seed, depth);
  while (s.locations.some((l) => l.id === loc.id)) loc = createLocation(family, ++seed, depth);
  loc.template = TEMPLATES[s.locations.filter((l) => !l.rogue).length % TEMPLATES.length]; // rogue servers don't take a turn
  loc.level = SERVER.locationLevel(hackerLevel(s), depth); // fixed when found: its guards' level, and its vault gear's
  if (parent) loc.parent = parent;
  if (!s.locations.some((l) => !l.rogue && !l.zone)) loc.starter = true; // your first server's vault: a protocol and a blueprint
  loc.trait = siteTrait(loc);
  rollRogue(s, loc); // about 1 in 6 is a rogue server: wild, respawning, never taken
  claimServer(s, loc); // about one in eight belongs to a faction (factions.mjs)
  s.locations.push(loc);
  spawnHidden(s, loc);
  onFound(s, loc); // memory full: it arrives detached (memory.mjs)
  dropStaleFinds(s);
  emit(s, 'located', `${depth > 1 ? `DEEPER NODE (layer ${depth})` : 'ORIGIN LOCATED'}: ${loc.name}.`, { location: loc.id });
  return loc;
}

// Finds you never connected to: keep the newest FIND_CAP. An older one nothing points at (no
// contract, nothing found through it) drops off the map, with the unknown servers past it.
export const FIND_CAP = 10;
function dropStaleFinds(s) {
  const busy = new Set(openContracts(s).flatMap((c) => [c.loc, (s.hidden || []).find((n) => n.id === c.hidden)?.via]).filter(Boolean));
  const unused = (l) => l.fresh && l.detached && !busy.has(l.id) && !s.locations.some((x) => x.parent === l.id);
  while (s.locations.filter((l) => l.fresh && l.detached).length > FIND_CAP) {
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
export const gainsTalent = (level) => level >= LOADOUT.talentFrom && (level - LOADOUT.talentFrom) % LOADOUT.talentEvery === 0;
// The first time you make or do something (a recipe crafted, a service installed, a trade at a hub):
// half a kill of XP, once. id: what it was, so it never pays twice.
export function firstTime(s, id, why, kind = 'build', share = 0.5) {
  const done = (s.firsts ||= []);
  if (done.includes(id)) return;
  done.push(id);
  gainXp(s, xpFor(s, hackerLevel(s), share), why, kind);
}
// Out of SPRAWL-00 (WoW's starter-zone breadcrumb): by level 4 you've traced a server (the family
// you've chased most), and at 5 wick points you at one you haven't cracked yet.
function breadcrumb(s, level) {
  const tame = (s.locations || []).filter((l) => !l.rogue && !l.member);
  if (level === 4 && !tame.length) addLocation(s, Object.entries(s.leadProgress || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'worm', 1);
  const open = (s.locations || []).find((l) => !l.rogue && !l.member && !l.takenOver);
  if (level === 5 && open && !tame.some((l) => Object.keys(l.state?.unlocked || {}).length)) emit(s, 'breadcrumb', `wick: strays won't feed you forever. ${open.name} has a vault. go open it.`, { location: open.id });
}
// Decoding a part you've never broken: kills of XP (Phase 4).
export const DECODE_XP = 2;
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
  emit(s, 'hot-strain', `${STRAINS[pick].name} is running hot: +50% XP and lead for 4 hours.`, { strain: pick });
}
// ---------- varied play (Fresh) ----------
// XP comes in kinds. The first XP of a kind other than fighting that you haven't earned in 20 minutes
// of active play pays half again (up to one kill's worth) and says so (a Fresh row). Nothing fades: doing one thing over and
// over just pays normally. Small events (under half a kill) never count, so a free action can't
// farm it. Contracts are a wrapper: no bonus, tallied as the activity behind them.
export const FRESH = { gapMs: 20 * 60000, bonus: 0.5, minKill: 0.5 };
export const XP_KINDS = { fight: 'Fights', breakin: 'Break-ins', intel: 'Intel', build: 'Building', trade: 'Trading' };
const playMs = (s) => s.pace?.ms || 0;
function freshBonus(s, amount, kind) {
  const L = hackerLevel(s), k = killXp(L);
  if (!XP_KINDS[kind] || kind === 'fight' || !(FRESH.bonus > 0) || amount < k * FRESH.minKill) return 0; // fighting is the default: the bonus is for stepping away from it
  const last = (s.freshAt ||= {})[kind], now = playMs(s);
  s.freshAt[kind] = now;
  if (last != null && now - last < FRESH.gapMs) return 0;
  return Math.max(1, Math.round(Math.min(amount * FRESH.bonus, k)));
}
// kind: what earned it (XP_KINDS), for the Fresh bonus. tally: what it counts as in the XP mix
// (a contract's activity), when there's no bonus.
export function gainXp(s, amount, why, kind = null, tally = kind) {
  if (amount <= 0) return;
  const bonus = freshBonus(s, amount, kind);
  if (bonus) { emit(s, 'fresh', `Fresh bonus +${bonus} XP (${XP_KINDS[kind]}).`, { amount: bonus, kind }); amount += bonus; }
  if (tally) (s.xpMix ||= {})[tally] = (s.xpMix[tally] || 0) + amount;
  // The server levels with everyone: it gets every point any hacker earns.
  gainServerXp(s, amount, why);
  const h = hackerOf(s);
  if (h.level >= LOADOUT.maxLevel) return;
  h.xp += amount;
  emit(s, 'xp', `+${amount} XP${why ? ' · ' + why : ''}.`, { amount, kind: tally });
  while (h.level < LOADOUT.maxLevel && h.xp >= xpToNext(h.level)) {
    const arch = classOf(s);
    // Pin the bar you have now before the level changes, so nothing falls off it.
    if (!s.loadout.equipped[arch]) s.loadout.equipped[arch] = [...equippedSkills(s, arch)];
    h.xp -= xpToNext(h.level);
    h.level++;
    breadcrumb(s, h.level);
    // Rogue servers keep up with you inside their layer's band (rogue.mjs does it on a visit too).
    for (const l of s.locations || []) if (l.rogue && !l.member) l.level = Math.max(l.level || 1, SERVER.locationLevel(h.level, l.depth || 1));
    const got = newAtLevel(arch, h.level);
    // New skills go straight onto the bar while there's room.
    const eq = s.loadout.equipped[arch];
    for (const g of got) if (skillOrder(arch).includes(g) && eq.length < LOADOUT.equipSlots && !eq.includes(g)) eq.push(g);
    const names = got.map((id) => (id === 'edge' ? `${EDGE[arch].name} (${EDGE[arch].rule.replace(/\.$/, '')})` : ARCHETYPES[arch].skills.find((x) => x.id === id)?.name || ABILITIES[id]?.name || id));
    const talent = gainsTalent(h.level) ? ' +1 talent point.' : '';
    emit(s, 'level-up', `LEVEL ${h.level} ${ARCHETYPES[arch].name.toUpperCase()}.${names.length ? ' New: ' + names.join(', ') + '.' : ''}${talent} Power +4%.`, { level: h.level, unlocked: got });
  }
  if (h.level >= LOADOUT.maxLevel) h.xp = 0;
}
// Skills and cantrips a class gains exactly at a level.
export function newAtLevel(arch, lvl) {
  return UNLOCKS.filter((u) => u.level === lvl).map((u) => (typeof u.what === 'number' ? skillOrder(arch)[u.what] : u.what));
}
// The next thing a class will unlock, for the "next at level N" hint.
export function nextUnlock(s, arch = classOf(s)) {
  const lvl = hackerLevel(s, arch);
  const u = UNLOCKS.find((x) => x.level > lvl);
  if (!u) return null;
  const id = typeof u.what === 'number' ? skillOrder(arch)[u.what] : u.what;
  return { level: u.level, id, name: id === 'edge' ? EDGE[arch].name : ARCHETYPES[arch].skills.find((x) => x.id === id)?.name || ABILITIES[id]?.name || id };
}

// The server levels from everyone's work: defending it and banking loot.
export function serverLevel(s) {
  let lvl = 1, xp = s.serverXp || 0;
  while (lvl < SERVER.maxLevel && xp >= SERVER.xpToNext(lvl)) { xp -= SERVER.xpToNext(lvl); lvl++; }
  return lvl;
}
export function serverProgress(s) {
  let lvl = 1, xp = s.serverXp || 0;
  while (lvl < SERVER.maxLevel && xp >= SERVER.xpToNext(lvl)) { xp -= SERVER.xpToNext(lvl); lvl++; }
  return { level: lvl, xp, next: lvl < SERVER.maxLevel ? SERVER.xpToNext(lvl) : 0 };
}
export function gainServerXp(s, amount, why) {
  if (amount <= 0) return;
  if (s.degraded) return; // a rebooting server earns nothing (Degraded mode)
  const before = serverLevel(s);
  s.serverXp = (s.serverXp || 0) + amount;
  const after = serverLevel(s);
  if (after > before) {
    syncServer(s);
    const slot = SERVER.daemonSlotsAt.includes(after) ? ' +1 daemon slot.' : '';
    emit(s, 'server-level', `SERVER LEVEL ${after}.${slot} Max Integrity ${s.server.max}.`, { level: after, serverXp: amount, why });
  } // no log line otherwise: it mirrors your own XP line, and the server card shows its bar
}

// ---------- talents ----------
// Talent points: one every other level from 10 (21 by level 50). Per class; changing picks is free.
export const talentPoints = (s, arch = classOf(s)) => { const l = hackerLevel(s, arch); return l < LOADOUT.talentFrom ? 0 : Math.floor((l - LOADOUT.talentFrom) / LOADOUT.talentEvery) + 1; };
export const picksOf = (s, arch) => s.loadout?.picks?.[arch] || [];
export const ranksOf = (s, arch) => s.loadout?.ranks?.[arch] || {};
// Skills a class knows at its level, and the ones on its bar.
export const knownSkills = (s, arch) => skillOrder(arch).filter((id) => unlockLevel(arch, id) <= hackerLevel(s, arch));
export const equippedSkills = (s, arch) => {
  const known = knownSkills(s, arch);
  const eq = s.loadout?.equipped?.[arch];
  return (eq ? eq.filter((id) => known.includes(id)) : known.slice(0, LOADOUT.equipSlots)).slice(0, LOADOUT.equipSlots);
};
const findSkill = (arch, name) => ARCHETYPES[arch].skills.find((x) => x.id === name || x.id === name.replace(/ /g, '-') || x.name.toLowerCase() === name);
const picked = (x) => x === 0 || x === 1;

// Points spent in one row of the tree (see TREE in data.mjs).
function rowSpent(picks, ranks, arch, row) {
  if (row.kind === 'choice') return picked(picks[row.tier]) ? 1 : 0;
  return ARCHETYPES[arch].fillers[row.row].reduce((n, node) => n + (ranks[node.id] || 0), 0);
}
const spentAboveWith = (picks, ranks, arch, i) => TREE.slice(0, i).reduce((n, row) => n + rowSpent(picks, ranks, arch, row), 0);
export const pointsSpent = (s, arch) => TREE.reduce((n, row) => n + rowSpent(picksOf(s, arch), ranksOf(s, arch), arch, row), 0);
export const spentAbove = (s, arch, i) => spentAboveWith(picksOf(s, arch), ranksOf(s, arch), arch, i);
function treeValid(picks, ranks, arch) {
  return TREE.every((row, i) => !rowSpent(picks, ranks, arch, row) || spentAboveWith(picks, ranks, arch, i) >= row.need);
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
export const rank = (s, id) => ranksOf(s, classOf(s))[id] || 0;
const fillerNode = (arch, id) => ARCHETYPES[arch].fillers.flat().find((n) => n.id === id || n.name.toLowerCase() === id);

function loadoutCommand(s, text) {
  const words = text.split(' ');
  if (active(s) || s.run) return warn(s, 'Change your loadout at home, between fights.');
  if (['equip', 'unequip'].includes(words[0])) {
    // equip|unequip [class] <skill>
    let rest = words.slice(1);
    let arch = s.loadout.archetype;
    if (ARCHETYPES[rest[0]]) { arch = rest[0]; rest = rest.slice(1); }
    const skill = rest.length ? findSkill(arch, rest.join(' ')) : null;
    if (!skill) return warn(s, `usage: ${words[0]} <skill>. ${ARCHETYPES[arch].name} skills: ${skillOrder(arch).join(', ')}.`);
    const known = knownSkills(s, arch), equipped = [...equippedSkills(s, arch)];
    if (!known.includes(skill.id)) return warn(s, `${skill.name} unlocks at ${ARCHETYPES[arch].name} level ${unlockLevel(arch, skill.id)}.`);
    if (words[0] === 'unequip') {
      if (!equipped.includes(skill.id)) return warn(s, `${skill.name} isn't equipped.`);
      s.loadout.equipped[arch] = equipped.filter((x) => x !== skill.id);
      return emit(s, 'loadout', `${skill.name} unequipped.`);
    }
    if (equipped.includes(skill.id)) return warn(s, `${skill.name} is already on key ${equipped.indexOf(skill.id) + 2}.`);
    if (equipped.length >= LOADOUT.equipSlots) return warn(s, `All ${LOADOUT.equipSlots} slots are full. Unequip one first.`);
    s.loadout.equipped[arch] = [...equipped, skill.id];
    return emit(s, 'loadout', `${skill.name} equipped on key ${equipped.length + 2}.`);
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
    s.loadout.picks[arch] = [];
    s.loadout.ranks[arch] = {};
    return emit(s, 'loadout', `${ARCHETYPES[arch].name} talents cleared. ${talentPoints(s, arch)} point(s) free.`);
  }
  const noPoints = hackerLevel(s, arch) < LOADOUT.talentFrom ? `Talents start at level ${LOADOUT.talentFrom}.` : `No free talent points. You get one every ${LOADOUT.talentEvery} levels.`;
  if (rest[0] === 'add' || rest[0] === 'remove') {
    const node = fillerNode(arch, rest.slice(1).join(' '));
    if (!node) return warn(s, `usage: talent add|remove <node>. ${ARCHETYPES[arch].name} nodes: ${ARCHETYPES[arch].fillers.flat().map((n) => n.id).join(', ')}.`);
    const ranks = { ...ranksOf(s, arch) };
    const i = TREE.findIndex((r) => r.kind === 'filler' && ARCHETYPES[arch].fillers[r.row].includes(node));
    if (rest[0] === 'add') {
      if ((ranks[node.id] || 0) >= node.max) return warn(s, `${node.name} is at max rank.`);
      const st = rowState(s, arch, i);
      if (st === 'blocked') return warn(s, `${node.name} needs ${TREE[i].need} points spent above it.`);
      if (st === 'locked') return warn(s, noPoints);
      ranks[node.id] = (ranks[node.id] || 0) + 1;
    } else {
      if (!ranks[node.id]) return warn(s, `${node.name} has no ranks.`);
      ranks[node.id]--;
      if (!treeValid(picksOf(s, arch), ranks, arch)) return warn(s, 'Deeper picks depend on that point. Take those back first.');
    }
    s.loadout.ranks[arch] = ranks;
    return emit(s, 'loadout', `${node.name} ${ranks[node.id]}/${node.max}. ${node.rule}`);
  }
  const tier = Number(rest[0]), side = rest[1];
  if (!(tier >= 1 && tier <= 3) || !['a', 'b'].includes(side)) return warn(s, 'usage: talent <1-3> <a|b> · talent add|remove <node> · talent reset');
  const state = tierState(s, arch, tier - 1);
  if (state === 'blocked') return warn(s, `Tier ${tier} needs ${TREE.find((r) => r.kind === 'choice' && r.tier === tier - 1).need} points spent above it.`);
  if (state === 'locked') return warn(s, noPoints);
  const picks = [...picksOf(s, arch)];
  picks[tier - 1] = side === 'a' ? 0 : 1;
  s.loadout.picks[arch] = picks;
  const talent = ARCHETYPES[arch].talents[tier - 1][picks[tier - 1]];
  emit(s, 'loadout', `${ARCHETYPES[arch].name} tier ${tier}: ${talent.name}. ${talent.rule}`);
}

// ---------- upgrades ----------
export const daemonSlots = (s) => CONFIG.daemonSlots + SERVER.daemonSlotsAt.filter((l) => serverLevel(s) >= l).length + (classOf(s) === 'operator' ? 1 : 0);
export const maxSignal = (s) => Math.round(CONFIG.maxSignal * powerOf(s)) + gearStat(s, 'signal') + 4 * rank(s, 'redundancy') + 3 * rank(s, 'onion-routing') + 3 * rank(s, 'extra-memory');

// Protocols at home: protocols · load <protocol> · unload <protocol|slot> · scrap <protocol> ·
// compile [stat] · compile <zero-day>.
export const compileCost = (s, zd = false) => {
  const c = zd ? COMPILE.zeroDayCost(hackerLevel(s)) : COMPILE.cost(hackerLevel(s));
  const off = serviceStat(s, 'compileDiscount') / 100;
  return { credits: archCredits(s, Math.round(c.credits * (1 - off))), salvage: Math.max(1, Math.round(c.salvage * (1 - off))) };
};
function protocolCommand(s, full) {
  const [text, payText] = splitPay(full);
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
  if (word === 'compile') {
    const zd = ZERO_DAYS[arg] && !ZERO_DAYS[arg].chase ? arg : Object.keys(ZERO_DAYS).find((z) => !ZERO_DAYS[z].chase && ZERO_DAYS[z].name.toLowerCase() === arg);
    if (SERVICES[arg]) return warn(s, `${SERVICES[arg].name} is a service: install it on the Server page.`);
    let stat = !zd && arg ? Object.keys(STATS).find((k) => k === arg || STATS[k].name.toLowerCase() === arg || PROTOCOL_NAMES[k]?.toLowerCase() === arg) : null;
    const mine = knownRecipes(s);
    if (!zd && arg && !stat) return warn(s, `compile <recipe>: ${mine.join(', ') || 'you have no recipes yet'}${(s.recipes || []).some((r) => ZERO_DAYS[r]) ? `, or a Zero-day you have source for: ${s.recipes.filter((r) => ZERO_DAYS[r]).join(', ')}` : ''}.`);
    if (stat && !PROTOCOL_NAMES[stat]) return warn(s, `${STATS[stat].name} comes from services, not protocols.`);
    if (zd && !(s.recipes || []).includes(zd)) return warn(s, `You don't have ${ZERO_DAYS[zd].name} source. Find ${zd}.src in a vault on a deeper run.`);
    if (!zd && !mine.length) return warn(s, 'You have no protocol recipes yet. They turn up in vaults, and now and then on a kill.');
    if (stat && !mine.includes(stat)) return warn(s, `You don't have the ${PROTOCOL_NAMES[stat]} recipe yet.`);
    if (!zd && !stat) stat = mine[Math.floor(rand(s) * mine.length)];
    const c = compileCost(s, !!zd);
    if (s.server.credits < c.credits) return warn(s, `Compiling needs ${c.credits} credits. You have ${s.server.credits}c.`);
    const pay = settle(s, zd ? SALVAGE_COSTS.zeroday(c.salvage) : SALVAGE_COSTS.protocol(c.salvage), payText);
    if (typeof pay === 'string') return warn(s, `Compiling: ${pay}`);
    s.server.credits -= c.credits;
    spend(s, pay);
    const lvl = hackerLevel(s); // you compile protocols at your own level
    const made = rollItem(() => rand(s), zd ? { level: lvl, zeroDay: zd } : { level: lvl, stat: AFFIX_FOR[stat] ? stat : null, source: 'compile' });
    made.compiled = true; // breaks down for salvage and code, never Exploits (no compile-to-sell loop)
    addItem(s, made, 'Compiled: ');
    return firstTime(s, 'compile-' + (zd || stat), `first ${zd ? ZERO_DAYS[zd].name : PROTOCOL_NAMES[stat]} compiled`);
  }
}

// Services at home: services · install <service> (or upgrade it) · uninstall <service> · cancel install.
const serviceId = (arg) => (SERVICES[arg] ? arg : Object.keys(SERVICES).find((k) => SERVICES[k].name.toLowerCase() === arg || SERVICES[k].name.toLowerCase().replace(/[^a-z]/g, '') === arg.replace(/[^a-z]/g, '')));
// Why a service can't be installed (or upgraded) right now, or null.
export function installBlock(s, id) {
  const d = SERVICES[id];
  if (!d) return 'No such service.';
  const v = serviceVersion(s, id) + 1;
  if (v > VERSIONS.length) return `${d.name} is at v${VERSIONS.length}, the top version.`;
  if (s.install) return `Installing ${SERVICES[s.install.id].name} v${s.install.v}. One install at a time.`;
  if (d.special && !knows(s, id)) return `${d.name} needs its source: find ${id}.src in a vault on a deeper run.`;
  if (!d.special && !knows(s, id)) return `You don't have the ${d.name} blueprint yet.`;
  if (v === 1 && portsUsed(s) >= portCount(s)) return `All ${portCount(s)} service slots are in use. Uninstall a service first.`;
  if (serverLevel(s) < VERSIONS[v - 1].needs) return `${d.name} v${v} needs server level ${VERSIONS[v - 1].needs}.`;
  const cost = serviceCost(id, v), m = materialsOf(s);
  const short = Object.entries(cost).filter(([k, n]) => n > (k === 'credits' ? s.server.credits : m[k] || 0));
  if (short.length || !canAfford(s, SALVAGE_COSTS.service(serviceSalvage(v)))) return `${d.name} v${v} needs ${costLine({ ...cost, salvage: serviceSalvage(v) })}.`;
  return null;
}
function serviceCommand(s, text, now) {
  const [word, ...restWords] = text.split(' ');
  const arg = restWords.join(' ').trim();
  if (word === 'services') {
    const on = Object.entries(s.services || {}).map(([id, v]) => `${SERVICES[id].name} v${v}`);
    return emit(s, 'info', `Ports ${portsUsed(s)}/${portCount(s)}: ${on.join(', ') || 'nothing running'}.${s.install ? ` Installing ${SERVICES[s.install.id].name} v${s.install.v}.` : ''}`);
  }
  if (active(s)) return warn(s, 'Change services between fights.');
  if (text === 'buyout' || text === 'buyout install') {
    if (!s.install) return warn(s, 'Nothing is installing.');
    if (s.degraded) return warn(s, 'Installs wait while the server is degraded.');
    const price = installBuyout(s, now);
    if (s.server.credits < price) return warn(s, `Finishing it now costs ${price} credits; you have ${s.server.credits}.`);
    s.server.credits -= price;
    s.install.doneAt = now;
    emit(s, 'bought', `Bought out: ${SERVICES[s.install.id].name} v${s.install.v} for ${price} credits.`, { amount: price });
    return tickServices(s, now);
  }
  if (text === 'cancel install') {
    const job = s.install;
    if (!job) return warn(s, 'Nothing is installing.');
    s.install = null;
    const cost = serviceCost(job.id, job.v), m = materialsOf(s);
    for (const [k, n] of Object.entries(cost)) if (k === 'credits') s.server.credits += n; else m[k] = (m[k] || 0) + n;
    for (const [name, n] of Object.entries(job.pay || {})) for (let i = 0; i < n; i++) s.salvage.push({ name, virus: 'refund', seed: 0 });
    return emit(s, 'service', `${SERVICES[job.id].name} v${job.v} cancelled. Everything refunded.`, { service: job.id });
  }
  const id = serviceId(arg);
  if (word === 'install') {
    if (!id) return warn(s, `install <service>: ${Object.keys(SERVICES).join(', ')}.`);
    const why = installBlock(s, id);
    if (why) return warn(s, why);
    const v = serviceVersion(s, id) + 1, cost = serviceCost(id, v), m = materialsOf(s);
    const pay = settle(s, SALVAGE_COSTS.service(serviceSalvage(v)), null);
    if (typeof pay === 'string') return warn(s, `${SERVICES[id].name} v${v}: ${pay}`);
    spend(s, pay);
    for (const [k, n] of Object.entries(cost)) if (k === 'credits') s.server.credits -= n; else m[k] -= n;
    const mins = VERSIONS[v - 1].minutes;
    s.install = { id, v, startedAt: now, doneAt: now + mins * 60000, pay };
    return emit(s, 'service', `${v > 1 ? 'Upgrading' : 'Installing'} ${SERVICES[id].name} to v${v}: ${mins} minute${mins === 1 ? '' : 's'}.`, { service: id, v });
  }
  if (word === 'uninstall') {
    if (!id || !serviceVersion(s, id)) return warn(s, arg ? `${arg} isn't running.` : 'uninstall <service>.');
    if (s.install?.id === id) return warn(s, `${SERVICES[id].name} is being upgraded. Type cancel install first.`);
    const v = serviceVersion(s, id);
    delete s.services[id];
    // Half the code comes back; credits don't.
    const back = {};
    for (let k = 1; k <= v; k++) for (const [m, n] of Object.entries(serviceCost(id, k))) if (m !== 'credits') back[m] = (back[m] || 0) + n;
    const refund = Object.fromEntries(Object.entries(back).map(([m, n]) => [m, Math.floor(n / 2)]));
    for (const [m, n] of Object.entries(refund)) materialsOf(s)[m] += n;
    syncServer(s);
    return emit(s, 'service', `${SERVICES[id].name} uninstalled. Half its code came back: ${costLine(refund) || 'nothing'}.`, { service: id });
  }
}

// Losing all Signal on a run: back home, pack lost, server untouched.
export function disconnect(s, reason) {
  const run = s.run;
  if (!run) return;
  // Deadman's Switch: jack out with the pack instead (then it rearms on a real-time cooldown).
  const dead = hooks.jackOut && fxFire(s, 'disconnect', { do: 'jackout' })[0];
  if (dead) {
    emit(s, 'net-good', `${dead.it.name}: Signal gone, but the switch trips. You jack out with your pack.`);
    run.integrity = 0;
    if (s.encounter?.mode === 'run' && s.encounter.phase !== 'active') s.encounter = null;
    return hooks.jackOut(s);
  }
  const loc = run.loc === CONFIG.zone.id ? s.zone : findLocation(s, run.loc);
  const lost = run.pack.length;
  const by = s.encounter?.mode === 'run' ? s.encounter.virus?.name : null; // what took you out, for the card
  s.signal = Math.max(0, run.integrity);
  s.run = null;
  if (loc && !loc.outpost?.h) loc.lockUntil = (hooks.now?.() ?? Date.now()) + CONFIG.relockMs; // any server but an outpost: see rogue.mjs relocks/relockLeft
  if (s.encounter?.mode === 'run' && s.encounter.phase !== 'active') s.encounter = null;
  if (s.parked) { s.encounter = s.parked; s.parked = null; }
  if (s.gate && s.encounter?.phase !== 'alert') { s.encounter = s.gate; s.gate = null; }
  emit(s, 'disconnected', `DISCONNECTED${reason ? ': ' + reason : ''}. ${lost ? `${lost} unbanked ${lost === 1 ? 'file' : 'files'} lost.` : ''} Your server is untouched.`, { by, reason: reason || '', lost, where: loc?.name || '', relockMs: loc && !loc.outpost?.h ? CONFIG.relockMs : 0 });
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
  rollSync(s);
  // Bastion Hardened: start the fight with an armor chit of your own.
  e.chits = 0;
  e.hardened = classOf(s) === 'bastion' ? SKILLS.hardened : 0; // Bastion's passive: the first damage hit each fight lands at half
  // Uniques that fire as a fight starts (Gate Bypass, Cell Key).
  for (const x of fxFire(s, 'start')) {
    if (x.fx.do === 'chit') { e.chits++; emit(s, 'status', `${x.it.name}: you start with a ◆.`); }
    if (x.fx.do === 'force-crit') e.forceCrit = true;
  }
  // Server gear: a Shield stat starts every home fight shielded.
  if (e.mode === 'home' && gearStat(s, 'shield', 'server')) e.shield = gearStat(s, 'shield', 'server');
  // Stealth: each part's first attack may come a cycle later.
  const st = gearStat(s, 'stealth');
  if (st) {
    const late = attackers(s).filter((p) => rand(s) * 100 < st);
    for (const p of late) p.attack.due += 1;
    if (late.length) emit(s, 'status', `Stealth: ${late.map((p) => p.name).join(' and ')} ${late.length === 1 ? 'attacks' : 'attack'} a cycle later.`);
  }
  emit(s, 'engage', `Engaged ${e.virus.name}.`);
  hooks.crewEngage?.(s); // crew.mjs: crewmates join (run fights only)
}

// Fast kills: beat your own usual pace (cycles per 100 Integrity of virus, kept per class) by a
// quarter and the kill pays a quarter more XP. Measured against you, so every class can earn it.
const PARTY_XP = 0.1; // a party splits the kill's XP, plus 10% per extra player
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
  // A party splits the kill's XP, with a small bonus per extra player (PARTY_XP).
  const n = e.party || 1;
  const xp = Math.max(1, Math.round((xpFor(s, e.virus.level, base) * (e.virus.elite ? ELITE.xp : 1) * (1 + PARTY_XP * (n - 1))) / n));
  const bonus = e.fast ? Math.max(1, Math.round(xp * FAST.bonus)) : 0;
  if (bonus) emit(s, 'fast-kill', `Fast kill: ${e.cycle} cycles. +${bonus} XP.`, { amount: bonus, cycles: e.cycle });
  const hot = e.virus.strain && e.virus.strain === hotStrain(s) ? Math.max(1, Math.round(xp * HOT.bonus)) : 0;
  if (hot) emit(s, 'hot-kill', `Hot strain: +${hot} XP.`, { amount: hot });
  // Rested (WoW): XP banked while you were safely away doubles a kill until it runs out.
  const rested = Math.floor(Math.min(s.rested || 0, xp)); // whole XP only; the fraction waits in s.rested
  if (rested) { s.rested -= rested; emit(s, 'rested', `Rested: +${rested} XP.`, { amount: rested }); }
  gainXp(s, xp + bonus + hot + rested, why, 'fight');
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
  Object.assign(e.metrics, { cycles: e.cycle, endIntegrity: d.integrity, endCredits: s.server.credits, lead, result });
  s.reports.push(structuredClone(e.metrics));
  if (s.reports.length > 50) s.reports.shift();
  // The rogue server: a kill pays like a home kill, straight away (nothing to lose in a pack),
  // and the folder fills again a while later.
  if (e.zone) {
    const now = hooks.now?.() ?? Date.now();
    const wild = e.wild && findLocation(s, e.wild); // a rogue server's folder, or SPRAWL-00's
    const spawn = wild || e.process ? null : s.zone?.spawns?.[e.room]; // a rotation's process (root.mjs) isn't SPRAWL's
    // A named contract target you lost to stays put, so the contract can still be finished.
    const keep = spawn?.bounty && result !== 'victory';
    // A named target that beat you twice is worn down too: it drops back to v1.
    if (keep && (spawn.losses = (spawn.losses || 0) + 1) >= 2 && spawn.grade > 1) { delete spawn.grade; emit(s, 'info', `${spawn.name} is worn down: back to v1.`); }
    if (spawn && !keep) { spawn.alive = false; spawn.respawnAt = now + CONFIG.zone.respawnMs; }
    const named = spawn?.bounty && !keep ? spawn.name : null;
    if (named) delete spawn.bounty;
    if (result === 'victory') {
      emit(s, 'victory', `${e.virus.name} neutralized in ${e.cycle} cycles. ${!e.metrics.attackDamage ? 'Nothing got through.' : `Took ${e.metrics.attackDamage} damage.`} Signal ${d.integrity}/${d.max}.`, { mode: 'run' });
      contractKill(s, { family: e.virus.family, zone: true, bounty: named, level: e.virus.level, strain: e.virus.strain });
      huntKill(s, e.virus.family);
      payKill(s, e, XP.home, `${e.virus.name} neutralized`);
      gainCode(s, codeFrom(s, e.virus.family, e.virus.level, 'home'), 'Code: ');
      const ctx = { kind: wild || e.process ? 'rogue' : 'sprawl', id: wild?.rogue?.kind, layer: wild?.depth || findLocation(s, e.process)?.depth || 1, family: e.virus.family, strain: e.virus.strain, elite: !!e.virus.elite, rolls: e.virus.elite ? ELITE.rolls : named ? LOOT.rolls.bounty : undefined };
      const item = rollDrop(s, ctx, e.virus.level);
      if (item) addItem(s, item);
      if (rand(s) < BLUEPRINT_CHANCE.home) learnBlueprint(s, 'Blueprint recovered: ');
      if (rand(s) < DAEMON_DROPS.home) learnDaemon(s, 'Daemon recovered: ');
      if (lead) addLead(s, e.virus.family, lead);
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
      emit(s, 'victory', `${e.virus.name} down. ${e.room} is open. ${!e.metrics.attackDamage ? 'Nothing got through.' : `Took ${e.metrics.attackDamage} damage.`} Signal ${d.integrity}/${d.max}.`, { mode: 'run' });
      contractKill(s, { family: e.virus.family, zone: false, level: e.virus.level, strain: e.virus.strain });
      payKill(s, e, XP.guard, `${e.virus.name} down`);
      // A guard's drop goes in your pack: it's yours once you jack out.
      const item = s.run && rollDrop(s, { kind: 'guard', id: e.key, layer: loc?.depth || 1, family: loc?.family }, e.virus.level);
      if (item) {
        s.run.pack.push({ path: `${e.room}/#drop-${e.seed}-${s.serial}`, name: 'protocol.bin', kind: 'gear', size: '32k', item });
        emit(s, 'drop', `${e.virus.name} dropped ${itemLabel(item)}: ${statLine(item.stats)}. In your pack until you jack out.`, { item, pack: true });
      }
      if (s.run && rand(s) < DAEMON_DROPS.guard) {
        s.run.pack.push({ path: `${e.room}/#dm-${e.seed}-${s.serial}`, name: 'daemon.exe', kind: 'daemon', size: '96k' });
        emit(s, 'drop', `${e.virus.name} dropped a daemon. In your pack until you jack out.`, { pack: true });
      }
      // A guard sometimes carries a blueprint, into your pack like the rest.
      if (s.run && rand(s) < BLUEPRINT_CHANCE.guard) {
        s.run.pack.push({ path: `${e.room}/#bp-${e.seed}-${s.serial}`, name: 'blueprint.bp', kind: 'blueprint', size: '64k' });
        emit(s, 'drop', `${e.virus.name} dropped a blueprint. In your pack until you jack out.`, { pack: true });
      }
      // Guards drop their location's code, into your pack too.
      const gains = s.run && codeFrom(s, loc?.family, e.virus.level, 'guard');
      for (const [m, n] of Object.entries(gains || {})) s.run.pack.push({ path: `${e.room}/#code-${m}-${e.seed}-${s.serial}`, name: `${m}.code`, kind: 'code', size: '8k', material: m, amount: n });
      if (gains && Object.keys(gains).length) emit(s, 'code', `${e.virus.name} dropped ${Object.entries(gains).map(([m, n]) => `${n} ${MATERIALS[m].name}`).join(' and ')}. In your pack until you jack out.`, { gains, pack: true });
      hooks.runWon?.(s);
    } else {
      emit(s, 'crashed', `${e.virus.name} burned your Signal to zero.`, { mode: 'run' });
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
    if (!hid) huntKill(s, e.virus.family);
    payKill(s, e, XP.home, `${e.virus.name} neutralized`);
    gainCode(s, codeFrom(s, e.virus.family, e.virus.level, 'home'), 'Code: ');
    if (inv?.open) { const k = codeOf(e.virus.family); if (k) gainCode(s, { [k]: Math.max(1, Math.round(codeDrop(e.virus.level) * (CONFIG.invasion.open.reward - 1) * 2)) }, 'Open ports bonus: '); gainXp(s, xpFor(s, e.virus.level, CONFIG.invasion.open.reward - 1), 'open ports', 'fight'); }
    const item = rollDrop(s, { kind: 'home', family: e.virus.family, strain: e.virus.strain, layer: e.virus.grade || 1 }, e.virus.level);
    if (item) addItem(s, item);
    if (rand(s) < BLUEPRINT_CHANCE.home) learnBlueprint(s, 'Blueprint recovered: ');
    if (rand(s) < DAEMON_DROPS.home) learnDaemon(s, 'Daemon recovered: ');
    if (inv) endInvasion(s, `${inv.name} is gone from your wall.`);
    if (e.outpost) outpostWon(s, e);
    if (e.infest) infestWon(s, e);
    if (e.member || e.raid || e.roamer) consortiumWon(s, e); // a fight for the consortium (consortium.mjs)
    if (e.fleet) fleetWon(s, e);
    if (e.retake || e.hubClear) hubWon(s, e);
  } else {
    // The invader stays at the wall, as worn down as you left it.
    if (inv) { const v = virusIntegrity(s); inv.hp = Math.max(0.05, v.max ? v.current / v.max : 1); }
    crashServer(s);
  }
  // Beating an invader from an unknown server traces most of the way back to it.
  if (lead && hid) hiddenLead(s, hid, HIDDEN.winLead + (lead - CONFIG.leadBase));
  else if (lead) addLead(s, e.virus.family, lead);
}

// ---------- crashes and invasions (engine side; the network lives in invasion.mjs) ----------
// A crash reboots the server at half Integrity and puts it in Degraded mode for 10 real
// minutes: the wall is down (invaders wait, none set out), installs pause, and the server earns
// no XP. You can still fight, explore and level. The clock starts at the next network tick.
// ms, since: a longer reboot that started at a known time (a crash while you were away).
export function crashServer(s, ms = CONFIG.degradedMs, since = null) {
  s.server.integrity = Math.max(1, Math.round(s.server.max * CONFIG.reboot));
  s.degraded = { since, until: since == null ? null : since + ms, ms };
  standingCrash(s);
  emit(s, 'degraded', `REBOOTED at ${s.server.integrity}/${s.server.max}. Degraded for ${ms >= 3600000 ? `${ms / 3600000} hours` : `${ms / 60000} minutes`}.`);
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
const HOME_WORDS = ['connect', 'jack', 'mail', 'outpost', 'repair', 'top', 'install', 'uninstall', 'cancel', 'load', 'unload', 'compile', 'deconstruct', 'craft', 'filter', 'firewall', 'relay', 'use', 'detach', 'attach', 'encounter', 'status', 'daemon', 'speed', 'consortium', 'market', 'buy', 'sell', 'architecture', 'config', 'map', 'server', 'loadout', 'system', 'help', 'mail', 'equip', 'unequip', 'whoami'];
const RUN_WORDS = ['ls', 'cd', 'cat', 'pull', 'unlock', 'attack', 'engage', 'slip', 'spoof', 'tap', 'sweep'];
function unknownAtHome(s, text) {
  const [w, ...rest] = text.split(' ');
  if (ABILITIES[w] || ['spike', 'hold', 'cancel'].includes(w)) return warn(s, 'No fight running.');
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
  for (const id of bar) if (words[0].startsWith(id) && words[0].length > id.length) { const t = target(words[0].slice(id.length) + words.slice(1).join('')); if (t) return id + t; }
  const id = closest(words[0], bar);
  if (!id) { const t = words.length === 1 ? target(words[0]) : null; return t ? 'spike' + t : null; } // just a part: Spike it
  if (ABILITIES[id]?.target === 'none' || ABILITIES[id]?.target === 'attack') return id;
  const t = target(words.slice(1).join(' '));
  return t === null ? id + ' ' : id + t;
}

// Accepts ids ("rate-limit"), two words ("rate limit"), or a key number ("4").
function abilityFrom(s, words) {
  const keys = keyMap(s);
  if (keys[words[0]]) return { id: keys[words[0]], used: 1 };
  if (ABILITIES[words[0]]) return { id: words[0], used: 1 };
  if (words[1] && ABILITIES[words[0] + '-' + words[1]]) return { id: words[0] + '-' + words[1], used: 2 };
  return null;
}

export function parse(s, input) {
  const text = normalize(input);
  const words = text.split(' ');
  const found = abilityFrom(s, words);
  const bar = Object.entries(keyMap(s)).map(([k, id]) => `${k} ${id}`).join(' · ');
  if (!found) { const suggest = suggestFor(s, words); return { error: `Unknown command "${words[0]}".${suggest ? ` Did you mean ${suggest.trim()}?` : ` Your keys: ${bar}.`}`, suggest }; }
  const ability = found.id;
  const a = ABILITIES[ability];
  if (!usable(s).includes(ability)) return { error: `${a.name} isn't on your bar. Your keys: ${bar}.` };
  const rest = words.slice(found.used);
  const arg = rest.join(' ');
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
    const near = closest(arg, livingParts(s).map((p) => p.id)) || livingParts(s).find((p) => p.name === closest(arg, livingParts(s).map((x) => x.name)))?.id;
    const suggest = near ? `${words.slice(0, found.used).join(' ')} ${near}` : null;
    return { error: `No part called "${arg}".${suggest ? ` Did you mean ${suggest}?` : ` Targets: ${livingParts(s).map((p) => p.id).join(', ')}.`}`, suggest };
  }
  return { ability, target: target.id };
}

export function validate(s, intent) {
  const e = s.encounter;
  const a = ABILITIES[intent.ability];
  const wait = intent.ignoreCooldown ? 0 : readyIn(s, intent.ability);
  if (wait) return `${a.name} is ready in ${wait} ${wait === 1 ? 'cycle' : 'cycles'}.`;
  if (a.target !== 'none' && !alive(part(s, intent.target))) return 'That part is already broken.';
  if (a.proc && !procOpen(s, a.proc)) return `${a.name} isn't lit. ${a.proc === 'stripped' ? 'Break a part\'s last ◆ first.' : a.proc === 'struck' ? 'It lights up after an attack reaches you.' : 'It lights up after an attack misses you or is delayed.'}`;
  if (a.once && e.once?.[intent.ability]) return `${a.name} is used up for this fight.`;
  if (a.bare && part(s, intent.target).armor > 0) {
    const p = part(s, intent.target);
    return `${a.name} needs a part with no armor. ${p.name} has ${p.armor} ${p.armor === 1 ? 'chit' : 'chits'}.`;
  }
  if (intent.ability === 'crack' && !part(s, intent.target).armor) return `${part(s, intent.target).name} has no armor to crack.`;
  if (['suspend', 'quarantine', 'throttle', 'jam'].includes(intent.ability) && !part(s, intent.target).attack) return `${part(s, intent.target).name} has no attack.`;
  if (a.recall && !helpersOn(s, part(s, intent.target)).length) return `You have no helper on ${part(s, intent.target).name}.`;
  if (['detonate', 'propagate', 'keepalive'].includes(intent.ability) && !burnsOn(s, part(s, intent.target)).length) return `No burns on ${part(s, intent.target).name}.`;
  if (['reroute', 'cron-storm'].includes(intent.ability) && !e.helpers.length) return 'No helpers running.';
  if (intent.ability === 'kill-switch' && !e.helpers.length) return 'No helpers running.';
  if (intent.ability === 'patch' && defender(s).integrity >= defender(s).max) return 'Already at full health.';
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
      emit(s, 'info', 'Developer reboot: Integrity and test credits restored.');
    }
  } else if (/^developer location (ransomware|worm|ghostroot)$/.test(text)) {
    const had = new Set(s.locations.map((l) => l.id));
    addLead(s, text.split(' ')[2], 100, 'Developer: ');
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
  } else if (/^(gear|protocols|load|unload|scrap|deconstruct|compile)( |$)/.test(text)) {
    protocolCommand(s, text);
  } else if (/^(services|install|uninstall)( |$)/.test(text) || text === 'cancel install' || text === 'buyout' || text === 'buyout install') {
    serviceCommand(s, text, now);
  } else if (/^(attach|detach) \S+$/.test(text)) {
    const [verb, id] = text.split(' ');
    memoryCommand(s, verb, id, now);
  } else if (text === 'developer finish') {
    if (!s.install) warn(s, 'Nothing is installing.');
    else { s.install.doneAt = now; tickServices(s, now); }
  } else if (text === 'developer blueprints') {
    s.recipes = [...new Set([...(s.recipes || []), ...BLUEPRINTS, ...SERVICE_SOURCES])];
    emit(s, 'info', 'Developer: every blueprint and service source learned.');
  } else if (/^developer salvage \d+$/.test(text)) {
    const n = Number(text.split(' ')[2]);
    for (let i = 0; i < n; i++) s.salvage.push({ name: 'Scrap', virus: 'developer', seed: 0 });
    emit(s, 'info', `Developer: +${n} salvage.`);
  } else if (/^developer code \d+$/.test(text)) {
    const n = Number(text.split(' ')[2]);
    gainCode(s, { cipher: n, worm: n, kernel: n, exploit: Math.ceil(n / 10) }, 'Developer: ');
  } else if (/^archetype( \w+)?$/.test(text) || /^talent( |$)/.test(text) || /^(equip|unequip)( |$)/.test(text)) {
    loadoutCommand(s, text);
  } else if (/^developer level \d+$/.test(text)) {
    const want = Math.max(1, Math.min(LOADOUT.maxLevel, Number(text.split(' ')[2])));
    const h = hackerOf(s);
    while (h.level < want) gainXp(s, xpToNext(h.level) - h.xp);
    if (h.level > want) { h.level = want; h.xp = 0; }
    emit(s, 'info', `Developer: ${ARCHETYPES[classOf(s)].name} level ${h.level}.`);
  } else if (/^developer server \d+$/.test(text)) {
    const want = Math.max(1, Math.min(SERVER.maxLevel, Number(text.split(' ')[2])));
    let xp = 0; for (let l = 1; l < want; l++) xp += SERVER.xpToNext(l);
    s.serverXp = xp;
    emit(s, 'info', `Developer: server level ${serverLevel(s)}.`);
  } else if (/^filter (equip|unequip|scrap) \d+$/.test(text) || /^filter craft( \w+)?( pay .*)?$/.test(text)) {
    filterCommand(s, text);
  } else if (/^firewall (upgrade|defrag|harden)( \S+)?$/.test(text) || text === 'defrag') {
    firewallCommand(s, text, now);
  } else if (text === 'open ports' || text === 'close ports') {
    portsCommand(s, text);
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
    architectureCommand(s, text);
  } else if (/^(fleet|swarm)( |$)/.test(text)) {
    fleetCommand(s, text);
  } else if (text.startsWith('config ') || text.startsWith('craft config ')) {
    configCommand(s, text);
  } else if (text.startsWith('outpost ')) {
    outpostCommand(s, text, now);
  } else if (/^craft( booster)?( pay .*)?$/.test(text)) {
    warn(s, 'Signal boosters are gone. Top up your Signal with credits at home.');
  } else if (/^relay \S+$/.test(text)) {
    installRelay(s, text.split(' ')[1]);
  } else if (/^use /.test(text)) {
    useItem(s, text);
  } else if (text === 'mail' || text.startsWith('mail ')) {
    mailCommand(s, text, now);
  } else if (text === 'daemon' || text.startsWith('daemon ')) {
    daemonCommand(s, text);
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
    emit(s, 'queued', e.lastAttack ? `Cleared. Auto-repeat will use: ${e.lastAttack}.` : 'Cleared.');
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
      emit(s, 'queued', intents.length > 1 ? `Planned: ${intents.map((x) => x.text).join(' → ')}.` : `Queued: ${intents[0].text}.`);
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
  if (text === 'jack out') return e.mode === 'run' ? { ability: 'flee', text: 'jack out' } : { error: 'You are home. Nothing to jack out of.' };
  const intent = parse(s, text);
  if (intent.error) return intent;
  if (checkNow) {
    const error = validate(s, intent);
    if (error) return { error };
  }
  const text2 = (intent.target ? `${intent.ability} ${intent.target}` : intent.ability) + (last ? ' last' : '');
  return { ...intent, text: text2, ...(last ? { last: true } : {}) };
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
// What a unit of code counts for when you're short of credits (top-ups).
export const CODE_CREDITS = 8;
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
  if (signal && s.run) return warn(s, 'Top up at home. On a run: a Signal patch from the store.');
  if (!signal && s.server.integrity <= 0) return warn(s, 'The server crashed. Type developer reboot.');
  const max = signal ? maxSignal(s) : s.server.max;
  const now = signal ? signalNow(s) : s.server.integrity;
  let n = Math.min(max - now, wanted ?? max);
  if (n <= 0) return warn(s, signal ? 'Signal is already full.' : 'Server is already at full Integrity.');
  // Short on credits: the rest comes out of your biggest pile of code (any kind), CODE_CREDITS each.
  const mats = materialsOf(s), pile = ['cipher', 'worm', 'kernel'].sort((a, b) => (mats[b] || 0) - (mats[a] || 0))[0];
  const short = Math.max(0, topUpCost(s, what, n) - s.server.credits), code = Math.ceil(short / CODE_CREDITS);
  let paidCode = 0;
  if (short && (mats[pile] || 0) >= code) { paidCode = code; mats[pile] -= code; s.server.credits += code * CODE_CREDITS; }
  while (n > 0 && topUpCost(s, what, n) > s.server.credits) n--; // as much as you can afford
  if (n <= 0) return warn(s, `Not enough credits (${topUpCost(s, what)} to fill it).`);
  const cost = topUpCost(s, what, n);
  s.server.credits -= cost;
  if (paidCode) emit(s, 'info', `Paid ${paidCode} ${MATERIALS[pile].name} toward it.`);
  if (signal) { s.signal = now + n >= max ? null : now + n; s.signalAcc = 0; }
  else s.server.integrity += n;
  emit(s, 'repair', signal ? `Signal topped up: +${n} for ${cost} credits. Signal ${now + n}/${max}.` : `Repaired ${n} Integrity for ${cost} credits. Server ${s.server.integrity}/${s.server.max}.`, { what, credits: cost });
}

// ---------- resolution ----------

// opts: mine (your own hit: Breaker Momentum applies), ignoreArmor, by (label for the log), noHook.
// Returns the damage dealt and any overflow past zero.
function hit(s, p, base, opts = {}) {
  const e = s.encounter;
  if (!alive(p)) return { dealt: 0, overflow: 0 };
  // Adaptive (mutation): count the cycles in a row your commands hit this part (the chit comes at cycle end).
  if (e.virus.mutation === 'adaptive' && opts.mine && !opts.dot && !opts.server && base > 0 && p.adaptAt !== e.cycle) {
    p.adaptRun = p.adaptAt === e.cycle - 1 ? (p.adaptRun || 0) + 1 : 1;
    p.adaptAt = e.cycle;
  }
  // Sleeper: any hit wakes it.
  if (e.virus.dormant && base > 0) e.virus.woke = true;
  // Keylogger: the Logger only feels commands fired in a Sync Window (and the burns and helpers
  // they started).
  if (p.syncOnly && !(opts.dot ? opts.synced : e.synced && !opts.server)) {
    emit(s, 'status', `${opts.by ? opts.by + ': ' : ''}${p.name} logs it and shrugs it off. Out of sync.`, { target: p.id });
    return { dealt: 0, overflow: 0, absorbed: true };
  }
  // Flicker: the Shade is only there on even cycles; on odd ones everything passes through it, and
  // your own command's static bounces back at you (a quarter of the hit; never your last point).
  if (p.phase && e.cycle % 2 === 1 && base > 0) {
    const back = opts.mine && !opts.dot ? Math.min(Math.max(1, Math.round(base * CONFIG.phaseBounce)), defender(s).integrity - 1) : 0;
    const took = back > 0 ? takeDamage(s, back, p.id, `${p.name} static`) : 0;
    emit(s, 'status', `${opts.by ? opts.by + ': ' : ''}passes through the ${p.name}. Out of phase: it's back next cycle.`, { target: p.id });
    if (took) emit(s, 'server-hit', `The static bounces back off the ${p.name}: −${took}.`, { source: p.id, amount: took, bounce: true });
    return { dealt: 0, overflow: 0, absorbed: true };
  }
  // Armor chits: a hit on an armored part does no damage and breaks one chit.
  // Burn ticks, helpers and every target of a spread hit count, one chit each.
  if (p.armor > 0 && !opts.pierce) {
    // A heavy hit from your own command cracks two.
    const heavy = (opts.chits > 1 || (opts.mine && !opts.dot && !opts.by && base >= CONFIG.heavyHit * powerOf(s) - 1e-9)) && p.armor > 1; // (base is already your size)
    p.armor -= heavy ? 2 : 1;
    p.lastDamaged = e.cycle;
    if (!p.armor) { p.patchAt = e.cycle + patchDelay(s) + (p.phase ? 1 : 0); if (!opts.server) openProc(s, 'stripped'); }
    emit(s, 'armor', `${opts.by ? opts.by + ': ' : ''}${p.name} ${heavy ? 'two ◆ broken' : '◆ broken'}${p.armor ? ` (${p.armor} left)` : `. Its armor is broken: it patches in ${patchDelay(s)} ${patchDelay(s) === 1 ? 'cycle' : 'cycles'}`}.`, { target: p.id, left: p.armor });
    return { dealt: 0, overflow: 0, absorbed: true };
  }
  // Flat gear: Damage on your skill hits, Payload on burn ticks and helper hits.
  if (base > 0 && !opts.server) base += opts.dot ? gearStat(s, 'payload') : opts.mine ? gearStat(s, 'damage') + fxFire(s, 'hit', { target: p, do: 'damage+' }).reduce((n, x) => n + x.value, 0) : 0;
  let raw = Math.floor(base * damageMultiplier(s, p, opts) + 1e-9); // tolerance: 25 × 1.5 × 1.2 is 45, not 44.999…
  // Subrogation (Halcyon): the part that last hit you takes double from your next skill hit.
  if (raw > 0 && opts.mine && e.subro === p.id) { raw *= 2; e.subro = null; emit(s, 'status', `Subrogation: ${p.name} pays double.`, { target: p.id }); }
  // Grudge (Bastion's edge): the part that last hit you takes more from your hits.
  if (raw > 0 && opts.mine && !opts.server && e.grudge === p.id && edge(s, 'bastion')) raw = Math.floor(raw * (1 + EDGE.bastion.bonus));
  // Weak Spot (Infiltrator's edge): your first damaging hit on each part crits.
  const weak = raw > 0 && opts.mine && !opts.dot && !opts.server && edge(s, 'infiltrator') && !(e.weakHit ||= {})[p.id];
  if (weak) e.weakHit[p.id] = true;
  // Crits: a roll on every hit that does damage.
  // Buffer Overflow (Zero-day): after you break a part, your next damaging hit crits.
  const forced = raw > 0 && !opts.server && (weak || e.forceCrit || opts.crit || (opts.mine && buffed(e, 'sudo')));
  if (forced && e.forceCrit) e.forceCrit = false;
  // Exposed: every hit on it, from anyone, has a better crit chance.
  const chance = critChance(s) + (on(s, p, 'exposed') ? SKILLS.exposed + 5 * rank(s, 'exploit-kit') : 0) + (opts.mine ? fxFire(s, 'hit', { target: p, do: 'crit%' }).reduce((n, x) => n + x.value, 0) : 0);
  const crit = forced || (raw > 0 && chance > 0 && rand(s) * 100 < chance);
  if (crit) raw = Math.floor(raw * critMultiplier(s)) + (opts.server ? 0 : gearStat(s, 'critDamage'));
  const dealt = Math.min(p.integrity, raw);
  const notes = [];
  if (crit) notes.push('CRIT');
  if (opts.pierce && p.armor > 0) notes.push('through armor');
  if (p.exposedUntil >= e.cycle) notes.push('exposed');
  if (p.taggedUntil >= e.cycle) notes.push('tagged');
  if (e.virus.weakKnown && e.virus.weakPoint === p.id) notes.push('weak point');
  p.integrity -= dealt;
  p.lastDamaged = e.cycle;
  // Leech: a share of what you deal heals you (paid out once per cycle).
  if (!opts.server && opts.mine && dealt > 0) e.leechAcc = (e.leechAcc || 0) + gearStat(s, 'leech') * (crit ? Math.max(1, ...fxFire(s, 'crit', { do: 'leech-x' }).map((x) => x.value)) : 1);
  if (crit && opts.mine && dealt > 0) for (const x of fxFire(s, 'crit', { do: 'heal' })) heal(s, x.value, x.it.name);
  e.lastCrit = !!crit && !!opts.mine;
  emit(s, 'damage', `${opts.by ? opts.by + ': ' : ''}${p.name} −${dealt}${notes.length ? ` (${notes.join(', ')})` : ''}. ${p.integrity}/${p.max}.`, { target: p.id, amount: dealt, crit });
  // Extortion: damage dealt to a winding-up Demand in the 2 cycles before it lands calls it off.
  const w = p.attack?.windup;
  if (w && dealt > 0 && p.integrity > 0 && p.attack.due - e.cycle <= 2) {
    p.attack.wound = (p.attack.wound || 0) + dealt;
    if (p.attack.wound >= w) {
      p.attack.due = e.cycle + p.attack.interval;
      p.attack.wound = 0;
      emit(s, 'blocked', `${p.attack.name} called off: you hit the ${p.name} hard enough. It starts over.`, { source: p.id });
    }
  }
  if (p.integrity === 0) {
    breakPart(s, p);
    // Overkill (Breaker's edge): what was left over spills onto the next part.
    const spill = Math.min(EDGE.breaker.cap, raw - dealt), next = spill > 0 && opts.mine && !opts.overkill && edge(s, 'breaker') ? soonestAttacker(s) : null;
    if (next) hit(s, next, spill, { by: 'Overkill', overkill: true, pierce: true, noHook: true });
  } else if (on(s, p, 'hooked') && !opts.noHook) hit(s, p, scaled(s, SKILLS.hooked + rank(s, 'kernel-hook')), { by: 'Hook', noHook: true });
  return { dealt, overflow: Math.max(0, raw - dealt), crit };
}

// The living part whose attack lands soonest (ties: the bigger hit).
function soonestAttacker(s, except = null) {
  return attackers(s).filter((p) => p.id !== except).sort((a, b) => a.attack.due - b.attack.due || b.attack.amount - a.attack.amount)[0] || livingParts(s).find((p) => p.id !== except) || null;
}

// The codex: what a virus component does stays ??? until you've broken one (its name always shows,
// so you can target it). Keyed by strain or family, and the part.
export const codexKey = (v, p) => `${v.strain || v.family}:${p.id}`;
export const knowsPart = (s, v, p) => p.kind === 'fragment' || !!s.codex?.[codexKey(v, p)];
function breakPart(s, p) {
  const e = s.encounter;
  // The first time you break a part: it's decoded in the Codex, and that pays two kills of XP.
  if (p.kind !== 'fragment' && !s.codex?.[codexKey(e.virus, p)] && !s.who) { (s.codex ||= {})[codexKey(e.virus, p)] = true; emit(s, 'codex', `${p.name} decoded. Hover it to see what it does.`, { target: p.id }); gainXp(s, xpFor(s, e.virus.level, DECODE_XP), `${p.name} decoded`, 'intel'); }
  e.metrics.breakOrder.push(p.id);
  if (p.kind !== 'fragment') e.breaks = (e.breaks || 0) + 1;
  // Breaker Momentum: a stack per break (up to SKILLS.momentumMax), for SKILLS.momentumCycles cycles after the last one.
  if (p.kind !== 'fragment' && classOf(s) === 'breaker') e.momentum = { stacks: Math.min(SKILLS.momentumMax, momentumStacks(s) + 1), until: e.cycle + SKILLS.momentumCycles };
  // Breaker Cascade Failure talent: the first break resets your cooldowns.
  if (hasTalent(s, 'cascade-failure') && !e.once.rampage) { e.once.rampage = true; e.readyAt = {}; emit(s, 'status', 'Cascade Failure: cooldowns reset.'); }
  // Uniques that fire on a break (Cryptominer, Zero Cool).
  for (const x of fxFire(s, 'break', { crit: e.lastCrit })) {
    if (x.fx.do === 'refund') { for (const k of Object.keys(e.readyAt)) e.readyAt[k] = Math.max(e.cycle, e.readyAt[k] - x.value); emit(s, 'status', `${x.it.name}: your cooldowns drop by ${x.value}.`); }
    if (x.fx.do === 'refund-skill' && e.lastSkill) { delete e.readyAt[e.lastSkill]; emit(s, 'status', `${x.it.name}: ${ABILITIES[e.lastSkill]?.name || e.lastSkill} is ready again.`); }
    if (x.fx.do === 'heal') heal(s, x.value, x.it.name);
  }
  // The weak point moves: a new one forms on another part.
  if (e.virus.weakPoint === p.id) {
    const next = livingParts(s).find((x) => x.kind === 'system');
    const wasKnown = e.virus.weakKnown;
    if (next) { e.virus.weakPoint = next.id; e.virus.weakKnown = false; }
    if (wasKnown && next && usable(s).includes('scan')) emit(s, 'info', 'A new weak point formed. Scan to find it.');
  }
  if (p.loot && rand(s) < CONFIG.salvageChance) {
    s.salvage.push({ name: p.loot, virus: e.virus.name, seed: e.seed });
    e.metrics?.loot?.push(p.loot);
    emit(s, 'loot', `${p.loot} recovered.`, { target: p.id });
  }
  if (e.lastAttack && e.lastAttack.endsWith(' ' + p.id)) {
    e.lastAttack = null;
    e.autoStopped = true;
  }
  emit(s, 'broken', `${p.name.toUpperCase()} BROKEN${p.attack ? `. ${p.attack.name} stops` : ''}.`, { target: p.id });
  // Linked parts (every v2 or bigger virus; the old Rerouting mutation too): a third of the broken part's hit
  // goes to the survivor that attacks next (WoW council fights). A survivor whose attack isn't a hit
  // (Encrypt, Scramble, Replicate) gains a hit on top of what it does (landAttack's `hit`).
  const hitOf = (x) => (x.attack?.effect === 'damage' ? x.attack.amount : x.attack?.hit || 0);
  if ((e.virus.mutation === 'rerouting' || e.virus.grade >= 2) && hitOf(p) > 0) {
    const to = livingParts(s).filter((x) => x !== p && x.attack && x.attack.effect !== 'heal').sort((a, b) => a.attack.due - b.attack.due)[0];
    const add = Math.max(1, Math.round(hitOf(p) * CONFIG.linked));
    if (to) {
      if (to.attack.effect === 'damage') to.attack.amount += add; else to.attack.hit = (to.attack.hit || 0) + add;
      to.rerouted = (to.rerouted || 0) + add;
      emit(s, 'reroute', `Linked: ${p.attack.name} passes to ${to.name}: its ${to.attack.name} ${to.attack.effect === 'damage' ? '' : 'now hits '}+${add}.`, { target: to.id, from: p.id, amount: add });
    }
  }
  if (zeroDay(s, 'buffer-overflow') && !e.forceCrit) { e.forceCrit = true; emit(s, 'status', 'Buffer Overflow: your next hit crits.'); }
  // Total Loss (Halcyon, Preferred): the wreck hits everything else. Chains through what it breaks.
  if (zeroDay(s, 'total-loss')) {
    const others = livingParts(s).filter((x) => x !== p);
    if (others.length) emit(s, 'status', `Total Loss: ${p.name} takes the rest down with it.`, { target: p.id });
    for (const x of others) if (alive(x)) hit(s, x, Math.round((p.max || 0) * 0.25), { by: 'Total Loss', server: true });
  }
  // Breaking the Encryptor hands you the key: the encryption stops.
  if (e.encrypt && p.attack?.effect === 'encrypt' && !livingParts(s).some((x) => x.attack?.effect === 'encrypt')) {
    e.encrypt = 0;
    emit(s, 'decrypted', 'Key recovered: your server is decrypted.', { target: p.id });
  }
  if (e.autoStopped) {
    e.autoStopped = false;
    if (virusIntegrity(s).current > 0) emit(s, 'warning-soft', 'That part is broken. Pick your next target.');
  }
}

function useAbility(s, intent, auto = false) {
  const e = s.encounter;
  if (intent.ability === 'hold') {
    e.metrics.holds++;
    emit(s, 'hold', 'Held. No command fired.');
    return;
  }
  if (intent.ability === 'flee') {
    emit(s, 'fled', `${auto === 'daemon' ? 'Wimpy daemon: ' : ''}EMERGENCY JACK OUT. The guard stays; you keep your pack.`);
    hooks.flee?.(s);
    return;
  }
  const error = validate(s, intent);
  if (error) {
    emit(s, 'warning', `${auto ? 'Auto-repeat' : 'Command'} failed: ${error}`);
    return;
  }
  const id = intent.ability;
  const a = ABILITIES[id];
  const target = part(s, intent.target);
  e.metrics.actions[id] = (e.metrics.actions[id] || 0) + 1;
  if (auto === 'daemon') e.metrics.daemon = (e.metrics.daemon || 0) + 1;
  else if (auto) e.metrics.auto++;
  if (!intent.ignoreCooldown) e.readyAt[id] = e.cycle + cooldownOf(s, id);
  if (a.once) e.once[id] = true;
  emit(s, 'resolved', `${auto === 'daemon' ? `Daemon ${intent.daemon}: ` : ''}${intent.text}${auto && auto !== 'daemon' ? ' (timer ran out)' : ''}.`, { ability: id, target: intent.target, auto });
  const base = target ? skillBase(s, id, target) : 0;
  e.lastSkill = id;
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
    return;
  }
  // Scrambled (Ghostroot's Scrambler): the attack may turn on you, at half strength. The cooldown is spent.
  if ((base || a.all) && e.scrambleUntil >= e.cycle && rand(s) < CONFIG.scramble.chance) {
    const amount = Math.max(1, Math.round((base || a.all * powerOf(s)) * CONFIG.scramble.self));
    const dealt = takeDamage(s, amount, null, a.name);
    emit(s, 'scrambled', `SCRAMBLED: ${a.name} hits YOU for ${dealt}.`, { ability: id, amount: dealt });
    return;
  }
  const rootkit = base && rootkitReady(s);
  if (rootkit) e.once.rootkit = true;
  // Null Route: your next skill crits.
  const crit = base > 0 && e.nextCrit ? ((e.nextCrit = false), true) : false;
  const res = base ? hit(s, target, base, { mine: true, crit, chits: a.chits, pierce: ignoresArmor(s, id) || rootkit, by: rootkit && target.armor > 0 ? 'Rootkit' : undefined }) : null;
  if (id === 'overload' && hasTalent(s, 'piercing')) e.once.pierced = true;
  // Echo: the hit may repeat for half (on armor, it breaks another chit).
  if (base && alive(target) && gearStat(s, 'echo') && rand(s) * 100 < gearStat(s, 'echo')) hit(s, target, Math.max(1, Math.round(base * (fxHas(s, 'echo-full') ? 1 : ECHO.share))), { mine: true, by: 'Echo' });
  // Overload: a crit resets its cooldown.
  if (id === 'overload' && res?.crit) { delete e.readyAt.overload; emit(s, 'proc', 'Overload crit: ready again.', { ability: 'overload' }); }
  if (a.proc) delete e.procs[a.proc]; // Shatter, Retaliate, Opening spend their window
  if (a.lifesteal && res?.dealt) heal(s, Math.max(1, Math.round(res.dealt * a.lifesteal)), a.name);
  if (a.all) for (const p of livingParts(s)) hit(s, p, a.all * powerOf(s) * (id === 'fork-bomb' && on(s, p, 'exposed') ? 2 : 1), { mine: true, by: a.name });
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
    target[a.status + 'Until'] = id === 'rate-limit' ? Math.max(target[a.status + 'Until'] || 0, e.cycle + n) : e.cycle + n;
    emit(s, 'status', id === 'rate-limit' ? `${target.name} ${STATUS_WORD[a.status]} for its next attack.` : `${target.name} ${id === 'tag' && target.tagBoost ? `Tagged (burns +${Math.round((CONFIG.surprise.tagged - 1) * 100)}%, timer visible)` : STATUS_WORD[a.status]} for ${n} ${n === 1 ? 'cycle' : 'cycles'}.`, { target: target.id, mark: a.status, ability: id });
  }
  if (a.tick && a.verb === 'burn') {
    let ticks = id === 'inject' && hasTalent(s, 'polymorphic') ? 5 : a.ticks;
    const tick = scaled(s, a.tick + (id === 'inject' ? 2 * rank(s, 'heap-spray') : 0));
    // Inject stacks up to 3 on one part; a fourth replaces the oldest.
    for (let k = 0; k < (id === 'inject' && e.surprise ? CONFIG.surprise.injectStacks : 1); k++) {
      if (a.stacks) { const mine = e.burns.filter((b) => b.target === target.id && b.id === id); if (mine.length >= a.stacks) e.burns.splice(e.burns.indexOf(mine[0]), 1); }
      e.burns.push({ id, target: target.id, damage: tick, grow: a.grow ? scaled(s, a.grow) : 0, left: ticks, name: a.name, drain: a.drain ? scaled(s, a.drain) : 0, synced: !!e.synced });
    }
    const stack = a.stacks ? e.burns.filter((b) => b.target === target.id && b.id === id).length : 0;
    emit(s, 'status', `${target.name} burning: ${tick}${a.grow ? ', growing' : ''} per cycle${ticks > 20 ? ' until it breaks' : ` for ${ticks} cycles`}${stack > 1 ? ` (${stack} stacks)` : ''}.`, { target: target.id, mark: 'burn', ability: id });
  }
  if (id === 'purge' && e.encrypt) { e.encrypt = 0; emit(s, 'decrypted', 'Purge: your encryption is cleared.'); }
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
    for (let k = 0; k < count; k++) e.helpers.push({ target: target.id, damage: dmg, left: n, synced: !!e.synced });
    emit(s, 'status', count > 0 ? `${count === 1 ? 'Helper' : count + ' helpers'} on ${target.name}: ${dmg} per cycle for ${n} cycles.` : `Helper cap reached (${helperCap(s)}).`, { target: target.id, mark: count > 0 ? 'helper' : null, ability: id });
  }
  // Jam and Barrier spend one of your helpers on that part.
  if (a.recall) {
    const h = helpersOn(s, target)[0];
    e.helpers.splice(e.helpers.indexOf(h), 1);
    if (id === 'barrier') { const amount = h.damage * h.left; e.shield = (e.shield || 0) + amount; emit(s, 'status', `Barrier: a helper becomes a ${amount} shield (${e.shield}).`, { mark: 'shield', ability: id }); }
  }
  if (a.delay && target) {
    target.attack.due += a.delay;
    if (target.attack.ramp && target.attack.step) { target.attack.step = 0; emit(s, 'status', `${target.attack.name} reset: the ramp starts over.`, { target: target.id }); }
    e.metrics.interrupts++;
    emit(s, 'interrupt', `${target.attack.name} delayed ${a.delay} ${a.delay === 1 ? 'cycle' : 'cycles'}.`, { target: target.id });
    openProc(s, 'slipped');
  }
  if (['brace', 'sudo', 'fork'].includes(id)) {
    e.buffs[id] = e.cycle + a.cycles - 1;
    emit(s, 'status', `${a.name} for ${a.cycles} cycles.`, { mark: 'buff', ability: id });
  }
  if (a.shield) {
    const amount = scaled(s, id === 'firewall' ? (hasTalent(s, 'deep-packet-inspection') ? 30 : a.shield) + 5 * rank(s, 'stateful-firewall') : a.shield);
    e.shield = Math.max(e.shield || 0, amount);
    emit(s, 'status', `Shield up: absorbs the next ${amount} damage.`, { mark: 'shield', ability: id });
  }
  // Taunt (Bastion Firewall), in a crew only: every damage attack comes at you for a.taunt cycles.
  if (a.taunt && (s.who || hooks.crewTurns?.(s))) {
    e.buffs.sinkhole = e.cycle + a.taunt - 1;
    emit(s, 'status', `Drawing fire: every attack comes at ${s.who || 'you'} for ${a.taunt} cycles.`, { mark: 'buff', ability: id });
  }
  if (id === 'patch') {
    heal(s, scaled(s, (hasTalent(s, 'service-pack') ? 20 : a.heal) + 3 * rank(s, 'patch-notes')), a.name);
    e.regen = { amount: scaled(s, a.tick), left: a.ticks, from: e.cycle + 1, name: a.name };
  }
  if (id === 'null-route') { e.nullRoute = 1; e.nextCrit = true; emit(s, 'status', 'Null-routed: the next attack misses you, and your next skill crits.', { mark: 'buff', ability: id }); }
  if (id === 'crack') {
    const n = Math.min(a.strip, target.armor);
    target.armor -= n;
    emit(s, 'armor', `Crack: ${target.name} loses ${n} ${n === 1 ? 'chit' : 'chits'}${target.armor ? ` (${target.armor} left)` : `. Its armor is broken: it patches in ${patchDelay(s)} ${patchDelay(s) === 1 ? 'cycle' : 'cycles'}`}.`, { target: target.id, left: target.armor });
    if (!target.armor) { target.patchAt = e.cycle + patchDelay(s); openProc(s, 'stripped'); }
  }
  if (id === 'harden') { e.chits = (e.chits || 0) + 1; emit(s, 'status', `Hardened: the next attack on you does nothing${e.chits > 1 ? ` (${e.chits} chits)` : ''}.`, { mark: 'shield', ability: id }); }
  if (id === 'detonate') {
    const mine = burnsOn(s, target);
    let total = 0;
    for (const b of mine) { for (let k = 0; k < b.left; k++) total += b.damage + (b.grow || 0) * k; e.burns.splice(e.burns.indexOf(b), 1); }
    hit(s, target, Math.round(total * 1.5 * (hasTalent(s, 'assassinate') && on(s, target, 'tagged') ? 2 : 1)), { by: 'Detonate', pierce: true });
  }
  if (id === 'propagate') {
    const mine = burnsOn(s, target);
    let n = 0;
    for (const p of livingParts(s)) if (p.id !== target.id) for (const b of mine) { e.burns.push({ ...b, target: p.id }); n++; }
    emit(s, 'status', `Propagate: ${n} ${n === 1 ? 'burn' : 'burns'} copied to the other parts.`, { mark: 'burn', ability: id });
  }
  if (id === 'reroute') {
    for (const h of e.helpers) { h.target = target.id; hit(s, target, h.damage, { by: 'Helper', dot: true }); if (!alive(target)) break; }
  }
  if (id === 'cron-storm') {
    for (const h of [...e.helpers]) { const t = alive(part(s, h.target)) ? part(s, h.target) : soonestAttacker(s); if (t) hit(s, t, h.damage, { by: 'Cron Storm', dot: true }); if (virusIntegrity(s).current === 0) break; }
  }
  if (id === 'kill-switch') {
    // Supervisor (Operator talent): cashing in your helpers readies Deploy.
    if (hasTalent(s, 'supervisor') && e.readyAt.deploy) { delete e.readyAt.deploy; emit(s, 'proc', 'Supervisor: Deploy is ready.', { ability: 'deploy' }); }
    for (const h of e.helpers.splice(0)) {
      const t = alive(part(s, h.target)) ? part(s, h.target) : soonestAttacker(s);
      if (t) hit(s, t, Math.round(h.damage * h.left * (1 + 0.05 * rank(s, 'dead-mans-switch'))), { by: 'Kill Switch', dot: true });
    }
  }
  if (id === 'keepalive') stretchBurns(s, target, e.surprise ? CONFIG.surprise.keepalive : a.cycles, 'Keepalive');
}
const STATUS_WORD = { exposed: 'Exposed (+25% crit chance)', tagged: 'Tagged (burns +50%, timer visible)', hooked: 'Hooked (+6 per hit)', throttled: 'Throttled (attacks deal half)', quarantined: 'Quarantined (+25% damage)' };

// Your class's edge (EDGE in data.mjs), from its level.
export const edge = (s, cls) => CONFIG.edges !== false && classOf(s) === cls && hackerLevel(s) >= unlockLevel(cls, 'edge'); // CONFIG.edges: tests of other numbers turn them off
// Keepalive and the Infiltrator's Sync: every burn on a part runs longer.
function stretchBurns(s, t, cycles, label) {
  const burns = alive(t) ? burnsOn(s, t) : [];
  if (!burns.length) return false;
  for (const b of burns) b.left += cycles;
  emit(s, 'status', `${label}: ${burns.length} burn${burns.length === 1 ? '' : 's'} on ${t.name} +${cycles} cycle${cycles === 1 ? '' : 's'}.`, { target: t.id });
  return true;
}

function heal(s, amount, label) {
  const d = defender(s);
  const healed = Math.min(amount, d.max - d.integrity);
  d.integrity += healed;
  emit(s, 'heal', `${label} +${healed}. ${s.encounter.mode === 'run' ? 'Signal' : 'Server'} ${d.integrity}/${d.max}.`, { amount: healed });
}

// Bastion Uptime: once per fight, a blow that would drop you to 0 leaves you at 1.
function survive(s, d, dmg) {
  const e = s.encounter;
  if (d.integrity - dmg <= 0 && hasTalent(s, 'uptime') && !e.once.uptime) {
    e.once.uptime = true;
    emit(s, 'heal', 'Uptime: you hold at 1.');
    return Math.max(0, d.integrity - 1);
  }
  return dmg;
}

// Restore from backup: undo the last attack (heal its damage, or delete the fragment it spawned)
// and wipe all encryption.
function rollback(s) {
  const e = s.encounter;
  const u = e.undo;
  e.undo = null;
  if (u?.type === 'damage') heal(s, u.amount, 'Rolled back');
  if (u?.type === 'replicate') { const f = part(s, u.part); if (alive(f)) { f.integrity = 0; emit(s, 'heal', `Rolled back: ${f.name} deleted.`, { target: f.id }); } }
  if (e.encrypt) { e.encrypt = 0; emit(s, 'decrypted', 'Rolled back: encryption wiped.'); }
}

export const cronDue = (cycle) => cycle % 3 === 0;
// Block: taken off every hit, but a hit never drops below half.
export const blockOf = (s) => defense(s, 'reduction') + (s.encounter?.buffs?.brace >= s.encounter?.cycle ? scaled(s, ABILITIES.brace.block) : 0);
export const blocked = (s, amount) => (blockOf(s) ? Math.max(Math.ceil(amount / 2), amount - blockOf(s)) : amount);

// Special attacks: the ones Lockdown shuts off.
const SPECIALS = ['encrypt', 'scramble', 'replicate'];

// Damage from an attack or from encryption: your shield soaks it first.
function takeDamage(s, amount, source, label) {
  const e = s.encounter;
  const d = defender(s);
  // Reduction: the rig's on runs, the server's at home.
  amount = blocked(s, amount);
  if (e.shield > 0) {
    const soaked = Math.min(e.shield, amount);
    e.shield -= soaked;
    amount -= soaked;
    emit(s, 'blocked', `Shield absorbs ${soaked} of ${label}${e.shield ? ` (${e.shield} left)` : ''}.`, { source, amount: soaked });
  }
  const dealt = survive(s, d, Math.min(d.integrity, amount));
  d.integrity -= dealt;
  if (e.mode === 'home' && dealt) wear(s, dealt); // your server's Integrity: it wears your firewall
  e.metrics.attackDamage += dealt;
  if (dealt) canary(s);
  // Snapshot (Zero-day): once per home fight, dropping below half restores 20.
  if (dealt && e.mode === 'home' && !e.once.snapshot && d.integrity > 0 && d.integrity < d.max / 2 && serviceVersion(s, 'snapshot')) {
    e.once.snapshot = true;
    heal(s, Math.round((d.max * serviceValue(s, 'snapshot')) / 100), 'Snapshot restored');
  }
  return dealt;
}

// What an attack hits for right now: Floodgate's ramp and Bricker's rage included.
export function attackAmount(p) {
  const a = p.attack;
  let n = a.amount + (a.ramp ? (a.step || 0) * (a.rampBy || 1) : 0) + (a.bonus || 0);
  if (p.enrage && p.integrity < p.max / 2) n *= CONFIG.enrage;
  return Math.round(n);
}

// A player drawing fire this cycle (Bastion Firewall in a crew): the one every attack goes at.
export const drawingFire = (s) => (s.encounter?.buffs?.sinkhole >= s.encounter?.cycle ? s : null);

function landAttack(s, p) {
  const e = s.encounter;
  const atk = p.attack;
  const power = attackAmount(p) * (e.soft || 1) * gapTaken(levelGap(s)) * (p.boosted ? CONFIG.reactiveBonus : 1) * (on(s, p, 'throttled') ? (hasTalent(s, 'backpressure') ? 0.25 : SKILLS.throttled) : 1);
  // A hit: a damage attack, or a special that also hits (the Scrambler's Scramble). Its size is `hit`, scaled like the rest.
  const hits = atk.effect === 'damage' || !!atk.hit, hitPower = atk.hit ? (power * atk.hit) / Math.max(1, atk.amount) : power;
  p.boosted = false;
  if (atk.windup) atk.wound = 0;
  // Patchwork: the Patcher's attack is a heal on its own side. Nothing of yours stops it.
  if (atk.effect === 'heal') {
    atk.due = e.cycle + atk.interval;
    const hurt = livingParts(s).filter((x) => x.integrity < x.max).sort((a, b) => a.integrity / a.max - b.integrity / b.max)[0];
    if (!hurt) return emit(s, 'status', `${atk.name}: nothing to patch.`, { source: p.id });
    const got = Math.min(Math.round(atk.amount), hurt.max - hurt.integrity);
    hurt.integrity += got;
    return emit(s, 'heal', `${p.name} patches ${hurt.name}: +${got}. ${hurt.integrity}/${hurt.max}.`, { target: hurt.id, amount: got });
  }
  p.lastLanded = e.cycle;
  atk.due = e.cycle + atk.interval;
  if (atk.ramp) atk.step = (atk.step || 0) + 1; // Floodgate: one harder each time
  if (atk.dump) e.keylog = 0; // Keylogger: the log empties into the Dump
  if (watchman(s, p)) return;
  // Null Route: this cycle's attacks miss (and Opening lights up).
  if (e.nullRoute > 0 || e.buffs['null-route'] >= e.cycle) { e.nullRoute = 0; delete e.buffs['null-route']; emit(s, 'blocked', `${atk.name} misses: you null-routed it.`, { source: p.id }); return openProc(s, 'slipped'); }
  // Retaliate lights up when a damage attack reaches you, whatever soaks it.
  if (hits) openProc(s, 'struck', { amount: Math.round(hitPower) });
  // Your armor chits (Bastion): the whole attack does nothing, however big.
  if (e.chits > 0 && atk.effect !== 'replicate') {
    e.chits--;
    return emit(s, 'blocked', `${atk.name} hits your ◆ and does nothing${e.chits ? ` (${e.chits} left)` : ''}.`, { source: p.id });
  }
  e.metrics.attacksLanded++;
  // Sanitize: a special attack may fail outright.
  if (SPECIALS.includes(atk.effect) && defense(s, 'sanitize') && rand(s) * 100 < defense(s, 'sanitize')) return emit(s, 'blocked', `${atk.name} fails: sanitized.`, { source: p.id });
  // Misses: a damage attack can miss you (level gap, plus your Evasion).
  if (hits && enemyMissChance(s) > 0 && rand(s) * 100 < enemyMissChance(s)) {
    e.metrics.evaded++;
    openProc(s, 'slipped');
    return emit(s, 'evaded', `${atk.name} misses you${defense(s, 'evasion') ? ' (evaded)' : ''}.`, { source: p.id });
  }
  // Breaker Brace: whatever hits you loses an armor chit (or takes 10 if it has none).
  if (buffed(e, 'brace') && alive(p) && hits) {
    if (p.armor > 0) { p.armor--; if (!p.armor) p.patchAt = e.cycle + patchDelay(s) + (p.phase ? 1 : 0); emit(s, 'armor', `Brace: ${p.name} loses a ◆${p.armor ? ` (${p.armor} left)` : ''}.`, { target: p.id, left: p.armor }); if (!p.armor) openProc(s, 'stripped'); }
    else hit(s, p, scaled(s, 10), { by: 'Brace' });
  }
  // Deductible (Halcyon): the first attack that lands each fight costs you nothing.
  if (hits && zeroDay(s, 'deductible') && !e.once.deductible) {
    e.once.deductible = true;
    return emit(s, 'blocked', `Deductible: ${atk.name} is covered.`, { source: p.id });
  }
  if (hits) {
    const tough = 1 - 0.03 * (rank(s, 'failsafe') + rank(s, 'hardened-kernel') + rank(s, 'low-profile') + rank(s, 'load-balancer'));
    // Enemy crits: a roll on every damage attack (from enemy level 3).
    let crit = (e.virus.crit || 0) > 0 && rand(s) < e.virus.crit;
    if (crit && fxFire(s, 'struck', { do: 'crit-normal' }).length) { crit = false; emit(s, 'blocked', `Underwritten: ${atk.name} would have crit. It lands as a normal hit.`, { source: p.id }); }
    let half = fxFire(s, 'struck', { do: 'halve' })[0];
    if (half) emit(s, 'blocked', `${half.it.name}: ${atk.name} deals half.`, { source: p.id });
    else if (e.hardened > 0) { e.hardened--; half = true; emit(s, 'blocked', `Hardened: ${atk.name} deals half.`, { source: p.id }); }
    // Blindside (Ghostroot): a hit you couldn't see coming lands harder.
    const dealt = takeDamage(s, Math.round(hitPower * (hasTalent(s, 'unsafe-mode') ? 1.2 : 1) * tough * (crit ? CRIT.multiplier : 1) * (half ? 0.5 : 1)), p.id, atk.name);
    for (const x of dealt ? fxFire(s, 'struck', { do: 'restore%' }) : []) heal(s, Math.max(1, Math.round((defender(s).max * x.value) / 100)), x.it.name);
    if (dealt) { e.undo = { type: 'damage', amount: dealt }; e.grudge = p.id; } // Grudge (Bastion): it last hit you
    // Echo: while the Echo lives, the hit repeats next cycle at half.
    if (dealt && !atk.echoed && livingParts(s).some((x) => x.echo)) {
      const half = Math.max(1, Math.round(dealt / 2));
      (e.echoes ||= []).push({ due: e.cycle + 1, amount: half, name: atk.name });
    }
    // Leech: the bite heals its most damaged part and clears a burn from it.
    if (dealt && atk.siphon) {
      const hurt = livingParts(s).sort((a, b) => a.integrity / a.max - b.integrity / b.max)[0];
      if (hurt) {
        const got = Math.min(dealt, hurt.max - hurt.integrity);
        hurt.integrity += got;
        const b = e.burns.findIndex((x) => x.target === hurt.id);
        if (b >= 0) e.burns.splice(b, 1);
        emit(s, 'status', `${atk.name} feeds ${hurt.name}${got ? `: +${got}` : ''}${b >= 0 ? ', and a burn on it is gone' : ''}.`, { target: hurt.id, amount: got });
      }
    }
    if (dealt && zeroDay(s, 'subrogation')) e.subro = p.id;
    const verb = crit ? 'CRITS' : 'hits';
    if (dealt) emit(s, 'server-hit', e.mode === 'run' ? `${atk.name} ${verb} your Signal: −${dealt}.` : `${atk.name} ${verb} the server: −${dealt} Integrity.`, { source: p.id, amount: dealt, crit });
    // Countermeasures (server gear): whatever hits your server takes a hit back.
    const cm = e.mode === 'home' && gearStat(s, 'countermeasures', 'server');
    if (cm && dealt && alive(p)) hit(s, p, cm, { by: 'Countermeasures', server: true });
  }
  if (atk.effect === 'encrypt') {
    // Stacks: every Encrypt adds to the damage your server takes each cycle, until the Encryptor breaks.
    const add = Math.max(1, Math.round(power * (fxHas(s, 'encrypt-half') ? 0.5 : 1)));
    e.encrypt = (e.encrypt || 0) + add;
    emit(s, 'encrypt', `${atk.name}: your ${e.mode === 'run' ? 'Signal' : 'server'} is encrypted. −${e.encrypt} every cycle until you break the ${p.name}.`, { source: p.id, amount: add, total: e.encrypt });
  }
  if (atk.effect === 'scramble') {
    // Scrambled: for a few cycles, each of your attacks may hit you instead (useAbility).
    const n = Math.max(1, Math.round(atk.amount) - (fxHas(s, 'blind-short') ? 1 : 0)); // cycles: not scaled by level
    e.scrambleUntil = e.cycle + n;
    emit(s, 'blind', `${atk.name}: you're SCRAMBLED for ${n} ${n === 1 ? 'cycle' : 'cycles'}. Each attack has a ${Math.round(CONFIG.scramble.chance * 100)}% chance to hit you instead.`, { source: p.id });
  } else if (atk.effect === 'replicate') {
    const living = livingParts(s).filter((x) => x.kind === 'fragment').length;
    if (living >= CONFIG.fragmentCap) emit(s, 'info', `${atk.name} fizzles: fragment limit reached.`, { source: p.id });
    else {
      const n = e.nextFragment++;
      const pw = e.virus.power || 1;
      const amount = Math.max(1, Math.round(CONFIG.fragmentDamage * pw));
      const hp = Math.max(1, Math.round(CONFIG.fragmentIntegrity * (e.virus.hpPower ?? pw))); // health follows the virus's health scale, not its damage
      e.virus.parts.push({ id: 'frag' + n, name: 'Fragment ' + n, kind: 'fragment', integrity: hp, max: hp, armor: 0, maxArmor: 0, patchAt: null, veiled: false, loot: null, special: false, attack: { name: 'Gnaw', effect: 'damage', amount, interval: 1, due: e.cycle + 1 }, exposedUntil: 0, lastDamaged: 0, boosted: false });
      if (p.overrun) { const f = e.virus.parts.at(-1); f.attack.ramp = 1; f.attack.rampBy = Math.max(1, Math.round(pw)); f.attack.step = 0; }
      e.undo = { type: 'replicate', part: 'frag' + n };
      emit(s, 'spawn', `Fragment ${n} spawned: ${hp} Integrity, gnaws ${amount} per cycle.`, { source: p.id, target: 'frag' + n });
    }
  }
}

// One player's part of a cycle: their command (or auto-repeat), their daemons, then their burns,
// helpers, regen and the server's Cron Job. Returns false if they fled. Each crewmate runs this
// on their own state against the shared virus (crew.mjs).
// phase: 'all' (solo), or 'command' (your turn in a crew cycle) and 'after' (once everyone has gone:
// daemons, burns, helpers, regen).
export function playerPhase(s, phase = 'all') {
  const e = s.encounter;
  if (phase !== 'after') {
  // Your target broke before your turn (a crewmate got it): the same command goes at the next threat.
  if (e.queue?.target && !alive(part(s, e.queue.target))) {
    const next = soonestAttacker(s) || livingParts(s)[0];
    if (next) { emit(s, 'info', `${part(s, e.queue.target)?.name || 'Your target'} is already broken: ${ABILITIES[e.queue.ability]?.name || e.queue.ability} goes at ${next.name}.`); e.queue = { ...e.queue, target: next.id, text: `${e.queue.ability} ${next.id}` }; }
  }
  if (e.queue) {
    const q = e.queue;
    e.surprise = !!(e.synced && e.sync?.surprise && q.ability !== 'hold'); // Infiltrator Surprise (see CONFIG.surprise)
    useAbility(s, q);
    if (e.synced && active(s) && q.ability !== 'hold') syncBonus(s, q);
    e.surprise = false;
  }
  else if (e.lastAttack) {
    const intent = parse(s, e.lastAttack);
    if (intent.error) emit(s, 'hold', 'Auto-repeat had no target. Nothing fired.');
    else {
      intent.text = `${intent.ability} ${intent.target}`;
      useAbility(s, intent, true);
    }
  } else {
    e.metrics.holds++;
    emit(s, 'hold', 'No command. Nothing fired.');
  }
  // Keylogger: a command fired outside the window is logged; 3 logs come back as the Dump.
  const logger = livingParts(s).find((x) => x.syncOnly);
  if (logger && (e.queue || e.lastAttack) && !e.synced && !(e.queue && e.queue.ability === 'hold') && logger.attack) {
    e.keylog = (e.keylog || 0) + 1;
    if (e.keylog >= 3 && logger.attack.due > e.cycle + 1) { logger.attack.due = e.cycle + 1; emit(s, 'status', `${logger.name}: 3 keystrokes logged. Dump next cycle.`, { target: logger.id }); }
    else if (e.keylog < 3) emit(s, 'status', `${logger.name}: keystroke logged (${e.keylog}/3).`, { target: logger.id });
  }
  e.synced = false;
  }
  if (phase === 'command') return active(s);
  // 1a. Slotted daemons act too, each on its own cooldown.
  if (active(s)) runDaemons(s);
  if (!active(s)) return false; // fled mid-fight
  e.queue = e.plan.shift() || null;

  // 1b. Burns and helpers tick after you. Every tick is a hit (Hook adds to it).
  for (const b of [...e.burns]) {
    if (virusIntegrity(s).current === 0) break;
    const t = part(s, b.target);
    if (alive(t)) {
      const r = hit(s, t, b.damage + (b.fxGrow || 0), { by: b.name, dot: true, synced: b.synced });
      if (b.drain && r.dealt) heal(s, b.drain, b.name);
      const grow = fxHas(s, 'burn-grow');
      if (grow) b.fxGrow = Math.min(grow.fx.cap || 99, (b.fxGrow || 0) + (Number(grow.fx.value) || 1));
    }
    b.damage += b.grow || 0;
    b.left--;
  }
  e.burns = e.burns.filter((b) => b.left > 0 && alive(part(s, b.target)));
  for (const h of [...e.helpers]) {
    if (virusIntegrity(s).current === 0) break;
    let t = part(s, h.target);
    if (!alive(t)) { t = soonestAttacker(s); if (t) h.target = t.id; }
    if (t) hit(s, t, h.damage, { by: 'Helper', dot: true, synced: h.synced });
    h.left--;
    // Last Gasp (Operator's edge): one more hit as it expires.
    if (!h.left && t && alive(t) && edge(s, 'operator')) hit(s, t, h.damage, { by: 'Last Gasp', dot: true, synced: h.synced });
    // Fork: a helper hit may start another helper (up to the cap).
    if (t && buffed(e, 'fork') && e.helpers.length < helperCap(s) && rand(s) * 100 < ABILITIES.fork.chance) { e.helpers.push({ target: t.id, damage: h.damage, left: 3 }); emit(s, 'status', 'Fork: a helper splits.', { target: t.id }); }
  }
  e.helpers = e.helpers.filter((h) => h.left > 0);
  if (e.regen && e.regen.from <= e.cycle && e.regen.left > 0) { heal(s, e.regen.amount, e.regen.name || 'Patch'); e.regen.left--; }
  // Leech pays out; Regen ticks (the rig's on runs, the server's at home).
  if (e.leechAcc >= 1) { const n = Math.floor(e.leechAcc); e.leechAcc -= n; heal(s, n, 'Leech'); }
  const rg = defense(s, 'regen');
  if (rg) {
    e.regenAcc = (e.regenAcc || 0) + rg;
    const n = Math.floor(e.regenAcc);
    if (n) { e.regenAcc -= n; const d = defender(s); const got = Math.min(n, d.max - d.integrity); d.integrity += got; if (got) emit(s, 'regen', `Regen +${got}.`, { amount: got }); }
  }
  // Cron Job (Zero-day): every 3rd cycle of a home fight, the server hits the soonest attacker.
  const cron = e.mode === 'home' && serviceVersion(s, 'cron');
  if (cron && cronDue(e.cycle) && virusIntegrity(s).current > 0) {
    const t = soonestAttacker(s);
    if (t) hit(s, t, cronDamage(s), { by: 'Cron Job', server: true });
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
    const dealt = takeDamage(s, e.encrypt, src?.id, 'the encryption');
    e.metrics.encrypted += dealt;
    if (dealt) emit(s, 'encrypted', `Encrypted: −${dealt}. ${e.mode === 'run' ? 'Signal' : 'Server'} ${defender(s).integrity}/${defender(s).max}.`, { source: src?.id, amount: dealt });
    if (defender(s).integrity <= 0) {
      finish(s, 'crashed');
      return true;
    }
  }

  // Sleeper: dormant until a hit or its timer wakes it. While it sleeps its attacks wait.
  if (e.virus.dormant) {
    if (e.virus.woke || e.cycle >= STRAINS.sleeper.dormant) {
      e.virus.dormant = false;
      for (const p of attackers(s)) {
        if (p.attack.alarm) p.attack.due = e.cycle;
        else { p.attack.interval = Math.max(2, p.attack.interval - 1); p.attack.due = e.cycle + Math.min(p.attack.interval, p.attack.wake || p.attack.interval); }
      }
      emit(s, 'status', `${e.virus.name} WAKES.`, {});
    }
  }

  // Echoes of last cycle's hits (Echo strain): they land first, and die with the Echo.
  if (e.echoes?.length) {
    const due = e.echoes.filter((x) => x.due <= e.cycle);
    e.echoes = e.echoes.filter((x) => x.due > e.cycle);
    const src = livingParts(s).find((x) => x.echo);
    for (const x of due) {
      if (!src) break;
      const dealt = takeDamage(s, x.amount, src.id, x.name + ' echo');
      if (dealt) emit(s, 'server-hit', `${x.name} echoes: −${dealt}.`, { source: src.id, amount: dealt });
      if (defender(s).integrity <= 0) { finish(s, 'crashed'); return true; }
    }
  }

  return false;
}
// Attacks due now, soonest first.
// A part that only attacks alone (the Hashrat's Miner) waits a cycle at a time while it has company.
const dueNow = (s) => {
  const live = livingParts(s).length;
  for (const p of attackers(s)) if (p.attack.alone && live > 1 && p.attack.due <= s.encounter.cycle) p.attack.due = s.encounter.cycle + 1;
  return attackers(s).sort((a, b) => a.attack.due - b.attack.due).filter((p) => p.attack.due <= s.encounter.cycle);
};
// One part's attack lands. True if the fight ended.
function strike(s, p) {
  const e = s.encounter;
  if (!alive(p) || !p.attack || p.attack.due > e.cycle) return false;
  // Co-op: a damage attack lands on everyone in the fight, each taking it in full (crew.mjs),
  // unless someone is drawing fire (Bastion Firewall): then it all goes at them.
  const crew = p.attack.effect === 'damage' ? hooks.crewAll?.(s) || [] : [];
  const sink = crew.length ? drawingFire(s) || crew.find(drawingFire) : null;
  if (sink) landAttack(sink, p);
  else {
    for (const m of crew) landAttack(m, { ...p, attack: { ...p.attack } }); // a copy each, so its timer and ramp move once
    landAttack(s, p);
  }
  hooks.crewHurt?.(s);
  if (defender(s).integrity <= 0) { finish(s, 'crashed'); return true; }
  if (virusIntegrity(s).current === 0) { finish(s, 'victory'); return true; }
  return false;
}
// The end of a cycle once the attacks are in: patches, cooldown effects, the turn over.
function cycleClose(s, landed) {
  const e = s.encounter;
  // 4. The virus patches itself: a part left without armor too long gets one chit back.
  for (const p of livingParts(s)) {
    if (p.maxArmor > 0 && p.armor === 0 && p.patchAt !== null && e.cycle >= p.patchAt) {
      p.armor = 1;
      p.patchAt = null;
      emit(s, 'patch', `${p.name} patched: 1 ◆ back.`, { target: p.id });
    }
  }

  // Adaptive (mutation): a part hit three cycles running hardens.
  if (e.virus.mutation === 'adaptive') for (const p of livingParts(s).filter((x) => x.adaptAt === e.cycle && x.adaptRun >= 3)) {
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
    emit(s, 'patch', `${k.name} re-arms ${re.map((x) => x.name).join(' and ')}: full armor.${k.rearms >= CONFIG.rearmMax ? ` ${k.name} overheats: no more re-arms.` : ''}`, { target: re[0].id });
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
      if (cooling.length) emit(s, 'status', 'Clock Speed: your cooldowns tick one extra cycle.');
    }
  }

  // Hashrat: while the Miner lives, your cooldowns stand still every other cycle.
  if (livingParts(s).some((x) => x.tax) && e.cycle % 2 === 1) {
    const cooling = Object.keys(e.readyAt).filter((k) => e.readyAt[k] > e.cycle + 1);
    for (const k of cooling) e.readyAt[k] += 1;
    if (cooling.length && !e.once.taxed) { e.once.taxed = true; emit(s, 'status', 'The Miner is eating your cycles: cooldowns run at half speed while it lives.'); }
  }

  e.cycle++;
  e.elapsedMs = 0;
  rollSync(s);
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
    emit(s, 'armor', `Sync: ${t.name} ◆ cracked${t.armor ? ` (${t.armor} left)` : '. Its armor is broken'}.`, { target: t.id, left: t.armor });
    what = 'a ◆ cracks';
  } else if (cls === 'bastion') { e.shield = (e.shield || 0) + b.amount; what = `+${b.amount} shield (${e.shield})`; }
  else if (cls === 'infiltrator') { if (stretchBurns(s, t, b.amount, 'Sync')) what = 'burns last longer'; }
  else if (cls === 'operator' && e.helpers.length) {
    for (const h of [...e.helpers]) { const ht = alive(part(s, h.target)) ? part(s, h.target) : soonestAttacker(s); if (ht) hit(s, ht, h.damage, { by: 'Helper', dot: true }); if (virusIntegrity(s).current === 0) break; }
    what = 'helpers strike again';
  }
  const surprise = e.surprise && ['inject', 'tag', 'keepalive'].includes(intent?.ability);
  emit(s, 'synced', `${surprise ? 'SURPRISE' : 'SYNCED'}: +${Math.round(CONFIG.sync.bonus * 100)}% damage${what ? `, ${what}` : ''}${surprise ? `, ${{ inject: 'an extra Inject stack', tag: `Tag for ${CONFIG.surprise.tagCycles} cycles, burns +${Math.round((CONFIG.surprise.tagged - 1) * 100)}%`, keepalive: `burns +${CONFIG.surprise.keepalive} cycles` }[intent.ability]}` : ''}.`, { target: intent?.target || null, surprise });
}

// ---------- daemons ----------
// Found programs. A slotted daemon acts on its own cooldown after your order, every cycle it's
// ready; the once-per-fight ones wait for their moment (see landAttack and takeDamage).
export const daemonVersion = (s, id) => (s.daemonsOwned || {})[id] || 0;
export const slottedDaemons = (s) => (s.daemons || []).filter((id) => DAEMONS[id] && daemonVersion(s, id));
export const daemonAmount = (s, id) => scaled(s, (DAEMONS[id].amount || 0) * DAEMON_VERSIONS[daemonVersion(s, id) - 1]);
// When a daemon acts next (a cycle number), or null for the once-per-fight ones.
export const daemonNext = (s, id) => (DAEMONS[id].once ? null : Math.max(s.encounter.cycle, s.encounter.daemonReady?.[id] || s.encounter.cycle));
const lastTarget = (s) => { const t = s.encounter.lastAttack && part(s, s.encounter.lastAttack.split(' ')[1]); return alive(t) ? t : null; };
function runDaemons(s) {
  const e = s.encounter;
  e.daemonReady ||= {};
  for (const id of slottedDaemons(s)) {
    const d = DAEMONS[id];
    if (d.once || !active(s) || virusIntegrity(s).current === 0 || daemonNext(s, id) > e.cycle) continue;
    const say = (text) => emit(s, 'resolved', `${d.name}: ${text}.`, { auto: 'daemon', daemon: id });
    let acted = true;
    if (id === 'sweeper') { const t = soonestAttacker(s); if (t) { say(`hits ${t.name}`); hit(s, t, daemonAmount(s, id), { by: d.name }); } else acted = false; }
    else if (id === 'fuzzer') { const t = livingParts(s).filter((p) => p.armor > 0).sort((x, y) => y.armor - x.armor)[0]; if (t) { say(`fuzzes ${t.name}`); hit(s, t, 1, { by: d.name }); } else acted = false; }
    else if (id === 'stall') { const t = soonestAttacker(s); if (t?.attack) { say(`stalls ${t.name}`); t.attack.due++; } else acted = false; }
    else if (id === 'mender') { const dd = defender(s); if (dd.integrity < dd.max) { say('patches you'); heal(s, daemonAmount(s, id), d.name); } else acted = false; }
    else if (id === 'spider') { const t = lastTarget(s) || soonestAttacker(s); if (t) { say(`bites ${t.name}`); e.burns.push({ id: 'spider', target: t.id, damage: daemonAmount(s, id), grow: 0, left: 3, name: d.name, drain: 0 }); } else acted = false; }
    else if (id === 'mirror') { const t = lastTarget(s); if (t) { say(`echoes you on ${t.name}`); hit(s, t, daemonAmount(s, id), { by: d.name }); } else acted = false; }
    if (!acted) continue;
    e.daemonReady[id] = e.cycle + d.cooldown;
    e.metrics.daemon = (e.metrics.daemon || 0) + 1;

  }
}
// Watchman: once per fight, a big attack about to land waits a cycle.
// Watchman: its bar (a big attack) scales with your power, never with its version; a version buys a
// longer delay (v2: two cycles) and a second use a fight (v3).
export const watchmanBar = (s) => scaled(s, DAEMONS.watchman.amount);
function watchman(s, p) {
  const e = s.encounter, v = daemonVersion(s, 'watchman');
  if (!slottedDaemons(s).includes('watchman') || (e.once.watchman || 0) >= (v >= 3 ? 2 : 1) || p.attack.effect !== 'damage' || p.attack.amount < watchmanBar(s)) return false;
  e.once.watchman = (e.once.watchman || 0) + 1;
  const n = v >= 2 ? 2 : 1;
  p.attack.due = e.cycle + n;
  emit(s, 'interrupt', `Watchman delays ${p.attack.name} ${n === 1 ? 'a cycle' : `${n} cycles`}.`, { target: p.id, auto: 'daemon' });
  openProc(s, 'slipped');
  return true;
}
// Canary: once per fight, dropping below half raises a shield.
function canary(s) {
  const e = s.encounter, d = defender(s);
  if (!slottedDaemons(s).includes('canary') || e.once.canary || d.integrity <= 0 || d.integrity >= d.max / 2) return;
  e.once.canary = true;
  e.shield = (e.shield || 0) + daemonAmount(s, 'canary');
  emit(s, 'status', `Canary: shield ${e.shield}.`, { auto: 'daemon' });
}
// A found daemon: a new one at v1, or an upgrade to one you have (v3 is the top: salvage instead).
export function learnDaemon(s, why = '', id = null) {
  s.daemonsOwned ||= {};
  id ||= Object.keys(DAEMONS)[Math.floor(rand(s) * Object.keys(DAEMONS).length)];
  const v = daemonVersion(s, id);
  if (v >= DAEMON_VERSIONS.length) { for (let i = 0; i < 3; i++) s.salvage.push({ name: 'Daemon scraps', virus: 'daemon', seed: 0 }); return emit(s, 'info', `${why}${DAEMONS[id].name} v3 again: +3 salvage.`); }
  s.daemonsOwned[id] = v + 1;
  // Not slotted for you: you choose (Daemons page).
  return emit(s, 'drop', `${why}${DAEMONS[id].name} ${v ? `v${v + 1}` : 'daemon'}. ${DAEMONS[id].rule}`, { daemon: id });
}
function daemonCommand(s, text) {
  const [, word, arg] = text.match(/^daemons?(?: (\w+))?(?: (\S+))?$/) || [];
  const id = arg && Object.keys(DAEMONS).find((k) => k === arg || DAEMONS[k].name.toLowerCase() === arg);
  if (!word || word === 'list') return emit(s, 'info', `Daemons (${slottedDaemons(s).length}/${daemonSlots(s)} slotted): ${Object.keys(s.daemonsOwned || {}).map((k) => `${DAEMONS[k].name} v${daemonVersion(s, k)}${slottedDaemons(s).includes(k) ? ' (slotted)' : ''}`).join(', ') || 'none found yet'}.`);
  if (active(s)) return warn(s, 'Change daemons between fights.');
  if (!id || !daemonVersion(s, id)) return warn(s, arg ? `You don't have a daemon called ${arg}.` : 'daemon slot <name> · daemon unslot <name>.');
  if (word === 'slot') {
    if (slottedDaemons(s).includes(id)) return warn(s, `${DAEMONS[id].name} is already slotted.`);
    if (slottedDaemons(s).length >= daemonSlots(s)) return warn(s, `All ${daemonSlots(s)} daemon slots are full. Unslot one first.`);
    s.daemons = [...slottedDaemons(s), id];
    return emit(s, 'daemon-set', `${DAEMONS[id].name} slotted.`);
  }
  if (word === 'unslot') { s.daemons = slottedDaemons(s).filter((k) => k !== id); return emit(s, 'daemon-set', `${DAEMONS[id].name} unslotted.`); }
  return warn(s, 'daemon slot <name> · daemon unslot <name>.');
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
  for (const p of attackers(s)) {
    const hidden = timersHidden(s, p);
    let due = p.attack.due;
    let boosted = p.boosted;
    // Ramps (Floodgate, Overrun) and growth (Tracer) show up column by column.
    const a = p.attack, step0 = a.step, bonus0 = a.bonus;
    while (due - e.cycle < columns) {
      const col = due - e.cycle;
      if (a.grow) a.bonus = (bonus0 || 0) + a.grow * Math.max(0, col);
      if (col >= 0) out.push({ source: p.id, name: a.name, effect: a.effect, amount: Math.round(attackAmount(p) * (boosted ? CONFIG.reactiveBonus : 1)), ...(a.hit ? { hit: Math.round(a.hit * (boosted ? CONFIG.reactiveBonus : 1)) } : {}), col, hidden, kind: p.kind });
      if (a.ramp) a.step = (a.step || 0) + 1;
      boosted = false;
      due += a.interval;
    }
    a.step = step0; a.bonus = bonus0;
  }
  const echo = livingParts(s).find((x) => x.echo);
  if (echo) for (const x of e.echoes || []) if (x.due - e.cycle >= 0 && x.due - e.cycle < columns) out.push({ source: echo.id, name: x.name + ' echo', effect: 'damage', amount: x.amount, col: x.due - e.cycle, hidden: false, kind: echo.kind });
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
      if (svc && SERVICES[svc].special && !s.recipes.includes(svc)) s.recipes.push(svc);
      if (svc && running.has(it.id) && !s.services[svc] && Object.keys(s.services).length < portCount(s)) s.services[svc] = 1;
      else {
        const codes = [].concat(SERVICES[svc]?.code || 'kernel');
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
function retireWall(s, was) {
  if (was >= 30) return;
  const L = Math.max(1, serverLevel(s));
  for (const [id, stat] of Object.entries(RETIRED_SERVICES)) {
    const v = s.services?.[id];
    if (v) { addFilter(s, rollFilter(seeded(L * 31 + v), { level: L, rarity: v >= 3 ? 'custom' : 'tuned', stat }), `${id[0].toUpperCase() + id.slice(1)} retired: `); delete s.services[id]; }
    if (s.install?.id === id) { s.server.credits += VERSIONS[s.install.v - 1].credits; s.install = null; }
    if (s.configs) delete s.configs[id];
  }
  if (s.configs) delete s.configs.firewall;
  const gone = new Set(RETIRED_CONFIGS);
  const refund = (s.configsOwned || []).filter((k) => gone.has(k)).length * CONFIG_COST.credits;
  if (refund) { s.server.credits += refund; emit(s, 'info', `Firewall configs retired: +${refund} credits.`); }
  if (s.configsOwned) s.configsOwned = s.configsOwned.filter((k) => !gone.has(k));
  if (s.configsKnown) s.configsKnown = s.configsKnown.filter((k) => !gone.has(k));
  if (s.recipes) s.recipes = s.recipes.filter((k) => !RETIRED_SERVICES[k]);
}
export function restore(raw) {
  if (!raw || ![6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, SAVE_VERSION].includes(raw.version)) return fresh();
  try {
    const s = structuredClone(raw);
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
      const best = Math.max(1, ...Object.values(s.hackers || {}).map((h) => h.level));
      let xp = 0; for (let l = 1; l < best; l++) xp += SERVER.xpToNext(l);
      s.serverXp = xp;
      for (const l of s.locations || []) l.level = Math.min(CONFIG.maxMobLevel, (l.level || 1) * 2);
      s.encounter = null;
      s.stash ||= []; s.gear ||= { server: {}, rigs: {} };
      s.version = SAVE_VERSION;
    }
    if (was < 15) migrateToProtocols(s);
    s.hackers ||= {};
    s.serverXp ||= 0;
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
    s.daemonsOwned ||= {};
    // v20: Mail, contracts and the Halcyon retainer. A server whose vault you already opened is yours.
    if (was < 20) for (const l of s.locations || []) if (Object.keys(l.state?.unlocked || {}).length) l.takenOver = true;
    // v21: the hidden network, the contract board and Indemnity. Found servers get their unknown neighbours.
    if (was < 21) for (const l of s.locations || []) spawnHidden(s, l);
    // v22: Interrupt and Trace left the shared keys; each kit has a level-5 skill and seven slots.
    if (was < 22) for (const [arch, eq] of Object.entries(s.loadout.equipped || {})) {
      const add = skillOrder(arch)[2];
      if (ARCHETYPES[arch] && hackerLevel(s, arch) >= unlockLevel(arch, add) && !eq.includes(add) && eq.length < LOADOUT.equipSlots) eq.splice(Math.min(2, eq.length), 0, add);
    }
    // v24: outposts. Found servers get their site trait; nobody has a harvester yet.
    if (was < 24) for (const l of s.locations || []) if (!('trait' in l)) l.trait = siteTrait(l);
    s.harvesters ||= [];
    s.harvKinds ||= [];
    // v25: service configs and virus fleets. Nothing to convert.
    s.configs ||= {}; s.configsKnown ||= []; s.configsOwned ||= [];
    s.fleet ||= null;
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
    initMail(s);
    syncFlags(s); // servers a relay already pings get their route files
    s.version = SAVE_VERSION;
    materialsOf(s);
    if (!Number.isFinite(s.rng)) s.rng = 0x2545f491;
    s.loadout.equipped ||= {};
    for (const l of s.locations || []) { l.template ||= 'relay'; l.depth ||= 1; reclaimCheck(l); }
    if (s.encounter) s.encounter.plan ||= [];
    if (active(s)) { s.encounter.paused = true; s.encounter.autoPaused = true; } // resumes on the next order, or opening the Fight tab
    return s;
  } catch {
    return fresh();
  }
}

export function suggestions(s, input = '') {
  const text = input.toLowerCase().trimStart();
  const space = text.indexOf(' ');
  const living = livingParts(s);
  if (space > 0) {
    const ability = text.slice(0, space);
    const a = ABILITIES[ability];
    const prefix = text.slice(space + 1).trim();
    if (a && ['part', 'attack'].includes(a.target)) {
      const keys = (a.target === 'attack' ? attackers(s) : living).map((p) => partKey(s, p));
      return keys.filter((k) => k.startsWith(prefix)).map((k) => `${ability} ${k}`);
    }
  }
  const base = active(s)
    ? [...usable(s), 'hold', 'pause', 'resume', 'cancel', 'status']
    : ['engage', 'jack in', 'mail', 'outpost', 'repair', 'top up', 'protocols', 'services', 'compile', 'install', 'uninstall', 'load', 'unload', 'encounter cryptjack', 'encounter splinter', 'encounter ghostroot', 'encounter random', 'status', 'developer reboot'];
  return base.filter((x) => x.startsWith(text));
}

export { MUTATIONS };

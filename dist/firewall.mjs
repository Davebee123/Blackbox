// The firewall: what meets every threat that comes for your server. Linear and yours to build:
//   level      upgraded a step at a time with credits and Cipher code; it never grows by itself
//   fragments  every threat it meets fragments it (a 16-block grid); each 4 fragmented blocks
//              cost it a level. Defrag restores it, running weaker for a few minutes meanwhile.
//   hardening  harden.sh (a hub-shop consumable): +3 levels for 8 hours.
// Its effective level is what it blocks outright: an invader at or under it bounces.
import { emit, warn, hooks, serverLevel } from './combat.mjs';
import { CONFIG, power } from './data.mjs';
import { items } from './hidden.mjs';
import { filterStat } from './filters.mjs';
import { FACTIONS } from './factions.mjs';
import { rootWall } from './root.mjs';
import { archWall } from './architecture.mjs';
import { consortiumWall } from './consortium.mjs';
const HUB_LEVEL = (f) => FACTIONS[f].hub.level;

export const FIREWALL = {
  blocks: 16, // the grid
  perLevel: 4, // fragmented blocks per level lost
  frag: { blocked: 1, siege: 2, breach: 3 }, // blocks fragmented by a threat it meets
  defragMs: 3 * 60000, defragLoss: 2, // a defrag's time, and the levels it runs down meanwhile
  harden: { plus: 3, ms: 8 * 3600000 },
  maxLevel: 60,
};
// Major versions: every 10 levels (v1 is levels 1–9, v2 from 10…). The upgrade into a new
// version costs more (and an Exploit), and each version brings a perk, for any firewall.
export const VERSION_EVERY = 10;
export const VERSION_PERKS = [
  { v: 2, perk: 'defrag', name: 'Defrag 30% faster' },
  { v: 3, perk: 'slot', name: '+1 filter slot' },
  { v: 4, perk: 'wear', name: 'Wears 25% slower' },
  { v: 5, perk: 'slot', name: '+1 filter slot' },
  { v: 6, perk: 'harden', name: 'harden.sh lasts twice as long' },
];
export const versionOf = (level) => 1 + Math.floor(Math.max(0, level) / VERSION_EVERY);
export const perksAt = (level) => VERSION_PERKS.filter((p) => p.v <= versionOf(level));
const perk = (s, id, loc = null) => perksAt(fwAt(s, loc).level).filter((p) => p.perk === id).length;
export const versionSlots = (s) => perk(s, 'slot'); // your home firewall's extra filter slots
// To go from level L to L+1 (mostly Cipher, so code has somewhere to go): a major version (L+1 a multiple of 10) triples the credits, doubles the Cipher and takes an Exploit.
// Cipher is the wall's code, with some Worm and Kernel too: every family's code has a use late on.
export const upgradeCost = (L) => {
  const major = (L + 1) % VERSION_EVERY === 0, half = 1 + Math.floor(L / 2);
  const base = { credits: 15 + 10 * L, cipher: 2 + L, worm: half, kernel: half };
  return major ? { credits: base.credits * 3, cipher: base.cipher * 2, worm: half * 2, kernel: half * 2, exploit: 1, major: true } : base;
};
const MATS = ['cipher', 'worm', 'kernel', 'exploit'];
export const canPay = (s, c) => s.server.credits >= c.credits && MATS.every((m) => (s.materials?.[m] || 0) >= (c[m] || 0));
// A defrag: credits for every fragmented block, more on a bigger firewall.
export const defragCost = (f) => Math.max(5, Math.round(f.frag * (3 + f.level)));

const clock = () => hooks.now?.() ?? Date.now();
// Old saves had a wall from the server's level and the Filter Bay service's version: start the
// firewall where that wall blocked, so nobody loses ground.
function startLevel(s) {
  const v = s.services?.firewall || 0, k = v ? [1, 1.2, 1.45][v - 1] : 0.75, rating = power(serverLevel(s)) * k;
  let blocks = 1;
  for (let L = 1; L <= FIREWALL.maxLevel; L++) if (rating >= power(L) * CONFIG.invasion.block) blocks = L;
  return blocks;
}
export const fwOf = (s) => (s.firewall ||= { level: startLevel(s), frag: 0, defragUntil: 0, hardenUntil: 0 });
// Every outpost has its own: it comes with the server, at the server's level, and is built up
// the same way. A Firewall Node module adds NODE_PLUS levels. loc null: your home server.
export const NODE_PLUS = 3;
// A hub you hold (hubs.mjs: its captured record, with the hub's level) has one too.
const fresh = (level) => ({ level: Math.max(1, level || 1), frag: 0, defragUntil: 0, hardenUntil: 0 });
export const fwAt = (s, loc = null) => (!loc ? fwOf(s) : loc.outpost ? (loc.outpost.fw ||= fresh(loc.level)) : (loc.fw ||= fresh(loc.level)));

export const fragLevels = (s, loc = null) => Math.floor(fwAt(s, loc).frag / FIREWALL.perLevel);
export const defragging = (s, at = clock(), loc = null) => fwAt(s, loc).defragUntil > at;
export const hardenLeft = (s, at = clock(), loc = null) => Math.max(0, fwAt(s, loc).hardenUntil - at);
// What it blocks outright right now (against a family, its filters' bonus for that family too).
// Filters are your home firewall's; an outpost's has its Firewall Node instead.
// The wall is three knobs you turn (its level, filters, harden.sh); everything else that adds
// levels shows as one "+N": architecture and consortium at home, a Firewall Node and Root 5 on an outpost.
export const wallBonus = (s, loc = null) => (loc ? ((loc.mods || []).includes('node') ? NODE_PLUS : 0) + rootWall(loc) : archWall(s) + consortiumWall(s));
export function effLevel(s, at = clock(), family = null, loc = null) {
  const f = fwAt(s, loc);
  const kit = loc ? 0 : filterStat(s, 'strength') + (family ? filterStat(s, family) : 0);
  return Math.max(0, f.level + kit + wallBonus(s, loc) - fragLevels(s, loc) - (defragging(s, at, loc) ? FIREWALL.defragLoss : 0) + (hardenLeft(s, at, loc) ? FIREWALL.harden.plus : 0));
}
// Filters: slower fragmentation, a faster defrag (each capped at 80%).
const less = (s, k) => 1 - Math.min(0.8, filterStat(s, k) / 100);
export const defragMs = (s, loc = null) => Math.round(FIREWALL.defragMs * (loc ? 1 : less(s, 'defrag')) * (perk(s, 'defrag', loc) ? 0.7 : 1));

// A threat met it: fragment.
export function fragment(s, outcome, loc = null) {
  const f = fwAt(s, loc);
  f.frag = Math.min(FIREWALL.blocks, Math.round((f.frag + (FIREWALL.frag[outcome] || 0) * (loc ? 1 : less(s, 'frag')) * (perk(s, 'wear', loc) ? 0.75 : 1)) * 100) / 100);
}
// Your server losing Integrity wears your home firewall: a block for every 5% of max lost (an
// invasion chipping at you, hits in a home fight). Filters that slow fragmentation slow this too.
export const WEAR_STEP = 0.05;
export function wear(s, points) {
  if (!(points > 0)) return;
  const f = fwOf(s), step = Math.max(1, s.server.max * WEAR_STEP);
  f.wear = (f.wear || 0) + points;
  while (f.wear >= step) { f.wear -= step; f.frag = Math.min(FIREWALL.blocks, Math.round((f.frag + less(s, 'frag') * (perk(s, 'wear') ? 0.75 : 1)) * 100) / 100); }
}
// The clock: a defrag that's done leaves it whole (home, and every outpost).
export function tickFirewall(s, at = clock()) {
  for (const loc of [null, ...(s.locations || []).filter((l) => l.outpost?.h), ...Object.values(s.hubs || {}).map((h) => h.captured?.wall).filter(Boolean)]) {
    const f = fwAt(s, loc);
    if (!f.defragUntil || at < f.defragUntil) continue;
    f.defragUntil = 0; f.frag = 0;
    emit(s, 'firewall', `Defrag done${loc?.name ? ` on ${loc.name}` : loc ? ' on your hub' : ''}: firewall back to level ${effLevel(s, at, null, loc)}.`, loc ? { location: loc.id } : {});
  }
}
// The wall's rating at a holding, against a threat's strength (invasion.mjs's numbers): it blocks
// threats at or under its effective level outright.
export const ratingAt = (s, loc, family = null, at = clock()) => { const L = effLevel(s, at, family, loc); return L < 1 ? 100 * CONFIG.invasion.wall : 100 * power(L) * CONFIG.invasion.block; };

// firewall upgrade|defrag|harden [server]: your home firewall, or an outpost's.
export function firewallCommand(s, text, at = clock()) {
  const [, verb0, id] = text.split(' '), verb = text === 'defrag' ? 'defrag' : verb0;
  // A server (your outpost) or a faction (a hub you hold).
  const hubF = id && s.hubs?.[id]?.captured ? id : null;
  const loc = !id ? null : hubF ? (s.hubs[hubF].captured.wall ||= { level: HUB_LEVEL(hubF) }) : (s.locations || []).find((l) => l.id === id || l.name.toLowerCase() === id);
  if (id && !hubF && !loc?.outpost?.h) return warn(s, 'Only your home server, your outposts and hubs you hold have a firewall you run.');
  const f = fwAt(s, loc), where = hubF ? 'Your hub\'s firewall' : loc ? `${loc.name}'s firewall` : 'Firewall';
  if (verb === 'upgrade') {
    if (f.level >= FIREWALL.maxLevel) return warn(s, `${where} is at its highest level.`);
    const c = upgradeCost(f.level);
    if (!canPay(s, c)) return warn(s, `Level ${f.level + 1} takes ${c.credits} credits, ${c.cipher} Cipher, ${c.worm} Worm and ${c.kernel} Kernel code${c.exploit ? ' and an Exploit (a new version)' : ''}.`);
    s.server.credits -= c.credits; for (const m of MATS) if (c[m]) s.materials[m] -= c[m];
    f.level++;
    const got = c.major ? VERSION_PERKS.find((p) => p.v === versionOf(f.level)) : null;
    return emit(s, 'firewall', `${where}: level ${f.level}${c.major ? `, version ${versionOf(f.level)}${got ? `: ${got.name}` : ''}` : ''}.`, loc ? { location: loc.id } : {});
  }
  if (verb === 'defrag') {
    if (defragging(s, at, loc)) return warn(s, 'Already defragmenting.');
    if (!f.frag) return warn(s, 'Nothing to defragment.');
    const price = defragCost(f);
    if (s.server.credits < price) return warn(s, `A defrag costs ${price} credits.`);
    s.server.credits -= price;
    const ms = defragMs(s, loc);
    f.defragUntil = at + ms;
    return emit(s, 'firewall', `${where}: defragmenting for ${price} credits, ${Math.round(ms / 6000) / 10} minutes, ${FIREWALL.defragLoss} levels down meanwhile.`, loc ? { location: loc.id } : {});
  }
  if (verb === 'harden') {
    if (!items(s).harden) return warn(s, 'You have no hardening script. Hub shops sell harden.sh.');
    items(s).harden--;
    f.hardenUntil = Math.max(at, f.hardenUntil) + FIREWALL.harden.ms * (perk(s, 'harden', loc) ? 2 : 1);
    return emit(s, 'firewall', `harden.sh: ${where} +${FIREWALL.harden.plus} levels for ${Math.round(hardenLeft(s, at, loc) / 3600000)} hours.`, loc ? { location: loc.id } : {});
  }
  return warn(s, 'firewall upgrade|defrag|harden [server]');
}

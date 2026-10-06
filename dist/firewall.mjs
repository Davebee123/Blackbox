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
const HUB_LEVEL = (f) => FACTIONS[f].hub.level;

export const FIREWALL = {
  blocks: 16, // the grid
  perLevel: 4, // fragmented blocks per level lost
  frag: { blocked: 1, siege: 2, breach: 3 }, // blocks fragmented by a threat it meets
  defragMs: 3 * 60000, defragLoss: 2, // a defrag's time, and the levels it runs down meanwhile
  harden: { plus: 3, ms: 8 * 3600000 },
  maxLevel: 60,
};
// To go from level L to L+1.
export const upgradeCost = (L) => ({ credits: 30 + 20 * L, cipher: 2 + L });
// A defrag: credits for every fragmented block, more on a bigger firewall.
export const defragCost = (f) => Math.max(5, Math.round(f.frag * (3 + f.level)));
// Squelch (pull the next threat in now, then quiet): Kernel code, by the threat's level.
export const squelchCost = (level) => 2 + Math.floor(Math.max(1, level) / 5);
export function paySquelch(s, level) {
  const k = squelchCost(level), have = s.materials?.kernel || 0;
  if (have < k) { warn(s, `Squelch takes ${k} Kernel code (you have ${have}).`); return false; }
  s.materials.kernel -= k;
  return true;
}

const clock = () => hooks.now?.() ?? Date.now();
// Old saves had a wall from the server's level and the Firewall service's version: start the
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
export function effLevel(s, at = clock(), family = null, loc = null) {
  const f = fwAt(s, loc);
  const kit = loc ? (loc.mods || []).includes('node') ? NODE_PLUS : 0 : filterStat(s, 'strength') + (family ? filterStat(s, family) : 0);
  return Math.max(0, f.level + kit - fragLevels(s, loc) - (defragging(s, at, loc) ? FIREWALL.defragLoss : 0) + (hardenLeft(s, at, loc) ? FIREWALL.harden.plus : 0));
}
// Filters: slower fragmentation, a faster defrag (each capped at 80%).
const less = (s, k) => 1 - Math.min(0.8, filterStat(s, k) / 100);
export const defragMs = (s) => Math.round(FIREWALL.defragMs * less(s, 'defrag'));

// A threat met it: fragment.
export function fragment(s, outcome, loc = null) {
  const f = fwAt(s, loc);
  f.frag = Math.min(FIREWALL.blocks, Math.round((f.frag + (FIREWALL.frag[outcome] || 0) * (loc ? 1 : less(s, 'frag'))) * 100) / 100);
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
    const c = upgradeCost(f.level), have = s.materials?.cipher || 0;
    if (s.server.credits < c.credits || have < c.cipher) return warn(s, `Level ${f.level + 1} takes ${c.credits} credits and ${c.cipher} Cipher code.`);
    s.server.credits -= c.credits; s.materials.cipher -= c.cipher;
    f.level++;
    return emit(s, 'firewall', `${where}: level ${f.level}.`, loc ? { location: loc.id } : {});
  }
  if (verb === 'defrag') {
    if (defragging(s, at, loc)) return warn(s, 'Already defragmenting.');
    if (!f.frag) return warn(s, 'Nothing to defragment.');
    const price = defragCost(f);
    if (s.server.credits < price) return warn(s, `A defrag costs ${price} credits.`);
    s.server.credits -= price;
    const ms = loc ? FIREWALL.defragMs : defragMs(s);
    f.defragUntil = at + ms;
    return emit(s, 'firewall', `${where}: defragmenting for ${price} credits, ${Math.round(ms / 6000) / 10} minutes, ${FIREWALL.defragLoss} levels down meanwhile.`, loc ? { location: loc.id } : {});
  }
  if (verb === 'harden') {
    if (!items(s).harden) return warn(s, 'You have no hardening script. Hub shops sell harden.sh.');
    items(s).harden--;
    f.hardenUntil = Math.max(at, f.hardenUntil) + FIREWALL.harden.ms;
    return emit(s, 'firewall', `harden.sh: ${where} +${FIREWALL.harden.plus} levels for ${Math.round(hardenLeft(s, at, loc) / 3600000)} hours.`, loc ? { location: loc.id } : {});
  }
  return warn(s, 'firewall upgrade|defrag|harden [server]');
}

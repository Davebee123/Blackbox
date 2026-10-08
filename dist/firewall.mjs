// The firewall: what meets every threat that comes for something you hold. It follows the network:
//   base       your home wall's base is the highest-level server attached to your network, minus
//              BASE_GAP (an outpost's or a hub's, that holding's own level). It moves with what you
//              attach and detach, for free: keeping level with your network is no longer a bill.
//   tier       upgrades buy a margin on top, +1 to +6 (TIERS), each a real price; tiers carry perks
//              (TIER_PERKS: a faster defrag, filter slots, slower wear, a longer harden.sh).
//   fragments  an invasion that gets past it (contested: a block, a breach: two) fragments it (a
//              16-block grid); each 4 fragmented blocks cost it a level. Buying a tier leaves it
//              whole; Defrag restores it without one, running weaker for a few minutes meanwhile.
//   hardening  harden.sh (a hub-shop consumable, or written from signatures): +3 levels for 8 hours.
// Filters and the +N chip (architecture, the consortium's Grid, a Firewall Node, Root 5) add on top.
// Its effective level is what it blocks outright: an invader at or under it bounces.
import { emit, warn, hooks } from './combat.mjs';
import { CONFIG, power } from './data.mjs';
import { items } from './hidden.mjs';
import { filterStat } from './filters.mjs';
import { FACTIONS } from './factions.mjs';
import { rootWall } from './root.mjs';
import { archWall } from './architecture.mjs';
import { consortiumWall } from './consortium.mjs';
import { isLive } from './memory.mjs';
const HUB_LEVEL = (f) => FACTIONS[f].hub.level;

export const FIREWALL = {
  blocks: 16, // the grid
  perLevel: 4, // fragmented blocks per level lost
  frag: { blocked: 0, siege: 1, breach: 2 }, // blocks fragmented by a threat it meets (invasion.mjs cracks a block at a time)
  defragMs: 3 * 60000, defragLoss: 2, // a defrag's time, and the levels it runs down meanwhile
  harden: { plus: 3, ms: 8 * 3600000, sigs: 6 }, // sigs: what writing a harden.sh costs when you hold none
};
export const BASE_GAP = 2; // your home wall's base: your highest attached server's level, less this (never under 1)
export const TIERS = 6; // +1 to +6 on top of the base
// Perks by tier, for any firewall (home, outpost, hub). Add one here and read it with tierPerk().
export const TIER_PERKS = [
  { tier: 2, perk: 'defrag', name: 'Defrag 30% faster' },
  { tier: 3, perk: 'slot', name: '+1 filter slot' },
  { tier: 4, perk: 'wear', name: 'Fragments 25% slower' },
  { tier: 5, perk: 'slot', name: '+1 filter slot' },
  { tier: 6, perk: 'harden', name: 'harden.sh lasts twice as long' },
];
export const perksAt = (tier) => TIER_PERKS.filter((p) => p.tier <= tier);

// The highest level any server attached to your network sends (rogue servers and members' don't).
export const netTop = (s) => Math.max(0, ...(s.locations || []).filter((l) => !l.rogue && !l.member && isLive(s, l)).map((l) => l.level || 1));

const clock = () => hooks.now?.() ?? Date.now();
export const fwOf = (s) => (s.firewall ||= { plus: 0, frag: 0, defragUntil: 0, hardenUntil: 0 });
// Every outpost has its own, based on that server's level; a hub you hold (hubs.mjs: its captured
// record, with the hub's level) has one too. A Firewall Node module adds NODE_PLUS levels. loc null: your home server.
export const NODE_PLUS = 3;
const fresh = () => ({ plus: 0, frag: 0, defragUntil: 0, hardenUntil: 0 });
export const fwAt = (s, loc = null) => (!loc ? fwOf(s) : loc.outpost ? (loc.outpost.fw ||= fresh()) : (loc.fw ||= fresh()));
// The level it starts from: the network's (home) or the holding's own. pin: a fixed base, for
// testing (developer wall <n>, and the tests).
export function baseOf(s, loc = null) {
  const f = fwAt(s, loc);
  if (f.pin != null) return f.pin;
  return loc ? Math.max(1, loc.level || 1) : Math.max(1, netTop(s) - BASE_GAP);
}
export const tierOf = (s, loc = null) => Math.min(TIERS, fwAt(s, loc).plus || 0);
export const tierPerk = (s, id, loc = null) => perksAt(tierOf(s, loc)).filter((p) => p.perk === id).length;
export const tierSlots = (s) => tierPerk(s, 'slot'); // your home firewall's extra filter slots
// Its level before filters, the +N chip, fragmentation and hardening: base + tier.
export const fwLevel = (s, loc = null) => baseOf(s, loc) + tierOf(s, loc);

// What tier t costs (from t − 1), on a base of B: credits and code that grow with the base and the
// tier, so a margin is a choice (the first two are cheap, the last a goal), never a toll you pay to
// keep up. Tiers 3 and up also take signatures, which only invasions pay.
export const tierCost = (t, B) => {
  const L = Math.max(1, B);
  return { credits: Math.round((25 + 6 * L) * t), cipher: Math.round((2 + L / 3) * t), worm: Math.ceil(t * (1 + L / 10)), kernel: Math.ceil(t * (1 + L / 10)), ...(t >= 3 ? { sigs: 3 * (t - 2) } : {}) };
};
// The next tier's price for this firewall (null at +6).
export const upgradeCost = (s, loc = null) => (tierOf(s, loc) >= TIERS ? null : tierCost(tierOf(s, loc) + 1, baseOf(s, loc)));
const MATS = ['cipher', 'worm', 'kernel', 'exploit'];
export const canPay = (s, c) => !!c && s.server.credits >= c.credits && MATS.every((m) => (s.materials?.[m] || 0) >= (c[m] || 0)) && (s.sigs || 0) >= (c.sigs || 0);
// A defrag: credits for every fragmented block, more on a bigger firewall.
export const defragCost = (s, loc = null) => Math.max(5, Math.round(fwAt(s, loc).frag * (3 + fwLevel(s, loc))));

export const fragLevels = (s, loc = null) => Math.floor(fwAt(s, loc).frag / FIREWALL.perLevel);
export const defragging = (s, at = clock(), loc = null) => fwAt(s, loc).defragUntil > at;
export const hardenLeft = (s, at = clock(), loc = null) => Math.max(0, fwAt(s, loc).hardenUntil - at);
// What it blocks outright right now (against a family, its filters' bonus for that family too).
// Filters are your home firewall's; an outpost's has its Firewall Node instead.
// The wall is three knobs you turn (its tier, filters, harden.sh) on a base the network sets;
// everything else that adds levels shows as one "+N": architecture and consortium at home, a
// Firewall Node and Root 5 on an outpost.
export const wallBonus = (s, loc = null) => (loc ? ((loc.buildings || []).includes('node') ? NODE_PLUS : 0) + ((loc.buildings || []).includes('citadel') ? 2 * NODE_PLUS : 0) + rootWall(loc) : archWall(s) + consortiumWall(s));
export function effLevel(s, at = clock(), family = null, loc = null) {
  const kit = loc ? 0 : filterStat(s, 'strength') + (family ? filterStat(s, family) : 0);
  return Math.max(0, fwLevel(s, loc) + kit + wallBonus(s, loc) - fragLevels(s, loc) - (defragging(s, at, loc) ? FIREWALL.defragLoss : 0) + (hardenLeft(s, at, loc) ? FIREWALL.harden.plus : 0));
}
// Filters: slower fragmentation, a faster defrag (each capped at 80%).
const less = (s, k) => 1 - Math.min(0.8, filterStat(s, k) / 100);
export const defragMs = (s, loc = null) => Math.round(FIREWALL.defragMs * (loc ? 1 : less(s, 'defrag')) * (tierPerk(s, 'defrag', loc) ? 0.7 : 1));

// A threat met it: fragment.
export function fragment(s, outcome, loc = null) {
  if (loc) return; // an outpost's or hub's firewall is a level, nothing more (threat merge): only home fragments
  const f = fwAt(s, loc);
  f.frag = Math.min(FIREWALL.blocks, Math.round((f.frag + (FIREWALL.frag[outcome] || 0) * less(s, 'frag') * (tierPerk(s, 'wear') ? 0.75 : 1)) * 100) / 100);
}
// Integrity lost no longer wears the firewall point by point (a chore every few minutes): an
// invasion that gets past it cracks it once (invasion.mjs crack). Kept so combat.mjs can still call it.
export function wear() {}
// The clock: a defrag that's done leaves it whole (home, and every outpost).
export function tickFirewall(s, at = clock()) {
  for (const loc of [null, ...(s.locations || []).filter((l) => l.takenOver && l.buildings?.length), ...Object.values(s.hubs || {}).map((h) => h.captured?.wall).filter(Boolean)]) {
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
  if (id && !hubF && !(loc?.takenOver && loc.buildings?.length)) return warn(s, 'Only your home server, your outposts and hubs you hold have a firewall you run.');
  const f = fwAt(s, loc), where = hubF ? 'Your hub\'s firewall' : loc ? `${loc.name}'s firewall` : 'Firewall';
  if (verb === 'upgrade') {
    const c = upgradeCost(s, loc), t = tierOf(s, loc) + 1;
    if (!c) return warn(s, `${where} is at +${TIERS}, the most a firewall takes over its base.`);
    if (!canPay(s, c)) return warn(s, `+${t} takes ${c.credits} credits, ${c.cipher} Cipher, ${c.worm} Worm and ${c.kernel} Kernel code${c.sigs ? ` and ${c.sigs} signatures` : ''}.`);
    s.server.credits -= c.credits; for (const m of MATS) if (c[m]) s.materials[m] -= c[m];
    if (c.sigs) s.sigs -= c.sigs;
    f.plus = t;
    // An upgrade rebuilds it whole: fragmentation (and a defrag running) are gone with it.
    const mended = f.frag > 0 || f.defragUntil > at;
    f.frag = 0; f.wear = 0; f.defragUntil = 0;
    const got = TIER_PERKS.find((p) => p.tier === t);
    return emit(s, 'firewall', `${where}: +${t} over its base, level ${fwLevel(s, loc)}${got ? `. ${got.name}` : ''}${mended ? '. Every block is whole again' : ''}.`, loc ? { location: loc.id } : {});
  }
  if (verb === 'defrag') {
    if (defragging(s, at, loc)) return warn(s, 'Already defragmenting.');
    if (!f.frag) return warn(s, 'Nothing to defragment.');
    const price = defragCost(s, loc);
    if (s.server.credits < price) return warn(s, `A defrag costs ${price} credits.`);
    s.server.credits -= price;
    const ms = defragMs(s, loc);
    f.defragUntil = at + ms;
    return emit(s, 'firewall', `${where}: defragmenting for ${price} credits, ${Math.round(ms / 6000) / 10} minutes, ${FIREWALL.defragLoss} levels down meanwhile.`, loc ? { location: loc.id } : {});
  }
  if (verb === 'harden') {
    // No script on hand: write one from signatures (the answer to a big invasion you can see coming).
    const write = !items(s).harden;
    if (write && (s.sigs || 0) < FIREWALL.harden.sigs) return warn(s, `You have no hardening script. Hub shops sell harden.sh, or you can write one from ${FIREWALL.harden.sigs} signatures (you hold ${s.sigs || 0}).`);
    if (write) s.sigs -= FIREWALL.harden.sigs; else items(s).harden--;
    f.hardenUntil = Math.max(at, f.hardenUntil) + FIREWALL.harden.ms * (tierPerk(s, 'harden', loc) ? 2 : 1);
    return emit(s, 'firewall', `harden.sh${write ? `, written from ${FIREWALL.harden.sigs} signatures` : ''}: ${where} +${FIREWALL.harden.plus} levels for ${Math.round(hardenLeft(s, at, loc) / 3600000)} hours.`, loc ? { location: loc.id } : {});
  }
  return warn(s, 'firewall upgrade|defrag|harden [server]');
}
// developer wall <n>|off: pin your home wall's base at a level (testing), or let it follow the network again.
export function developerWall(s, text) {
  const arg = text.split(' ')[2], f = fwOf(s);
  if (arg === 'off') { delete f.pin; return emit(s, 'info', `Developer: your wall follows the network again (base ${baseOf(s)}).`); }
  f.pin = Math.max(0, Number(arg) || 0);
  emit(s, 'info', `Developer: your wall's base is pinned at ${f.pin}.`);
}

// ---------- old saves ----------
// v33: a wall was a level you climbed from 1 (the old price below). It becomes the tier nearest the
// margin it had over its new base (0 to +6), and whatever the old climb cost beyond that tier's
// price comes back (credits, code, Exploits).
const oldCost = (L) => {
  const major = (L + 1) % 10 === 0, half = 1 + Math.floor(L / 2), c = { credits: 15 + 10 * L, cipher: 2 + L, worm: half, kernel: half, exploit: 0 };
  return major ? { credits: c.credits * 3, cipher: c.cipher * 2, worm: half * 2, kernel: half * 2, exploit: 1 } : c;
};
function convert(s, f, base, from, label) {
  if (!f || f.plus != null || f.level == null) return null;
  const level = f.level, t = Math.max(0, Math.min(TIERS, level - base));
  const paid = { credits: 0, cipher: 0, worm: 0, kernel: 0, exploit: 0 };
  for (let L = from; L < level; L++) for (const [k, v] of Object.entries(oldCost(L))) paid[k] += v;
  for (let k = 1; k <= t; k++) for (const [m, v] of Object.entries(tierCost(k, base))) if (m in paid) paid[m] -= v;
  delete f.level;
  f.plus = t;
  const back = Object.fromEntries(Object.entries(paid).filter(([, v]) => v > 0));
  if (back.credits) s.server.credits += back.credits;
  for (const m of MATS) if (back[m]) (s.materials ||= {})[m] = (s.materials[m] || 0) + back[m];
  const line = Object.entries(back).map(([k, v]) => `${v} ${k === 'credits' ? 'credits' : k === 'exploit' ? (v === 1 ? 'Exploit' : 'Exploits') : k[0].toUpperCase() + k.slice(1) + ' code'}`).join(', ');
  emit(s, 'firewall', `${label} follows your network now: level ${level} became +${t} over its base of ${base}.${line ? ` Refunded: ${line}.` : ''}`);
  return back;
}
export function firewallRestore(s, was) {
  if (was >= 33) return;
  convert(s, s.firewall, Math.max(1, netTop(s) - BASE_GAP), 1, 'Your firewall');
  for (const l of s.locations || []) if (l.outpost?.fw) convert(s, l.outpost.fw, Math.max(1, l.level || 1), Math.max(1, l.level || 1), `${l.name}'s firewall`);
  for (const h of Object.values(s.hubs || {})) { const w = h.captured?.wall; if (w?.fw) convert(s, w.fw, Math.max(1, w.level || 1), Math.max(1, w.level || 1), 'Your hub\'s firewall'); }
}

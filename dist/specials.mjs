// Server specials (docs/server-specials.md): a traced server's one rule, an upside and a cost, fixed by its seed (two
// from floor 5 down). Each points at a program that leans in (lean) and one that fixes the cost (fix). loc.special is
// a list of ids; a wild server (rogue, lair, the farm, a member's) has none. Where each rule is read:
//   volatile  invasion.mjs, hidden.mjs (sendWeight, sendShift, DAEMON_DROP.volatile)
//   stable    sendWeight; its rest room netrooms.mjs (floorplan.mjs addRestRoom)
//   rich      combat.mjs roomKill (code), netrooms.mjs (vault code, Armored guards and Resident)
//   hostile   netrooms.mjs tune (XP, hits)
//   legacy    netrooms.mjs rare; run.mjs residentLevel
//   backbone  netrooms.mjs socketsFor; invasion.mjs travel
//   hardened  netrooms.mjs (vault, Armored), rootClear
//   guarded   netrooms.mjs (the Core's crew elite, the vault's unique)
import { seeded } from './gear.mjs';
import { LEANING_IDS } from './leanings.mjs';

export const SPECIAL = {
  send: { volatile: 2, stable: 0.5 }, // how often a server sends, against the rest (hidden.mjs pickOrigin)
  volatile: 2, daemon: 0.5, // its invaders' levels; a daemon from one you kill (DAEMON_DROP.volatile)
  shift: 2, // Amplifier and Lockdown: levels onto the invaders a server sends
  code: 2, xp: 1.5, hits: 1.25, resident: 1, vault: 2, root: 2, travel: 0.5,
  guarded: 1 / 25, deep: 5, // Guarded's odds; the floor where a server takes two
};
// chips: [glyph, value, label], upside then cost (the tooltip's tt-more). answer: the muted ▸ line.
export const SPECIALS = {
  volatile: { name: 'Volatile', glyph: '⚡', rule: 'Sends invasions twice as often. Its invaders come 2 levels higher. One you kill drops a daemon half the time.',
    up: [['kill', '×2', 'Invasions it sends'], ['daemon', '50%', 'Daemons from its invaders you kill']], cost: [['kill', '+2 lv', 'Its invaders']], lean: 'amplifier', fix: 'lockdown', answer: 'Amplifier raises it. Lockdown lowers it.' },
  stable: { name: 'Stable', glyph: '≈', rule: 'Has one more rest room. Sends invasions half as often.',
    up: [['heal', '+1', 'Rest room']], cost: [['kill', '×½', 'Invasions it sends']], lean: 'lockdown', fix: 'amplifier', answer: 'Lockdown calms it further. Amplifier raises its invaders.' },
  rich: { name: 'Rich', glyph: '⌗', rule: 'Its kills and its vault drop twice the code. Its guards and Resident are Armored.',
    up: [['materials', '×2', 'Code from kills and the vault']], cost: [['shield', '◆', 'Armored guards and Resident']], lean: 'siphon', fix: 'patch', answer: 'Code Siphon adds more. Patch Injector strips the armor.' },
  hostile: { name: 'Hostile', glyph: '↻', rule: 'Its fights pay 50% more XP. Its viruses hit 25% harder.',
    up: [['xp', '+50%', 'XP from its fights']], cost: [['signal', '+25%', 'Damage you take']], lean: 'defrag', fix: 'bulkhead', answer: 'Defrag Bay rests you. Bulkhead shields its fights.' },
  legacy: { name: 'Legacy', glyph: '★', rule: 'Its rare spawns come twice as often. Its Resident fights a level higher.',
    up: [['kill', '★ ×2', 'Rare spawns']], cost: [['kill', '+1 lv', 'Its Resident']], lean: 'post', fix: 'bulkhead', answer: 'Listening Post leans in. Bulkhead shields its fights.' },
  backbone: { name: 'Backbone', glyph: '⊞', rule: 'Has one more socket room. Its invasions reach your wall twice as fast.',
    up: [['module', '+1', 'Socket room']], cost: [['clock', '×½', 'Its invasions\' travel time']], lean: null, fix: 'lockdown', answer: 'Any program fits. Lockdown lowers its invaders.' },
  hardened: { name: 'Hardened', glyph: '◆', rule: 'Its vault pays double. Root climbs twice as fast. Its guards and Resident are Armored.',
    up: [['credits', '×2', 'Vault'], ['takeover', '×2', 'Root']], cost: [['shield', '◆', 'Armored guards and Resident']], lean: 'honeytoken', fix: 'patch', answer: 'Honeytoken leans in. Patch Injector strips the armor.' },
  guarded: { name: 'Guarded', glyph: '♜', rare: true, rule: 'Its vault holds one of its floor\'s uniques. A crew elite holds its Core.',
    up: [['item', '+1', 'A unique of its floor']], cost: [['kill', '◆ CREW', 'Its Core']], lean: null, fix: null, answer: 'Bring a crew to its Core.' },
};
const COMMON = Object.keys(SPECIALS).filter((id) => !SPECIALS[id].rare);

export const specialsOf = (loc) => (Array.isArray(loc?.special) ? loc.special : loc?.special ? [loc.special] : []);
export const hasSpecial = (loc, id) => specialsOf(loc).includes(id);
// A server's specials from its seed: one, a second (never the same) from floor 5 down. Guarded comes 1 in 25.
export function rollSpecials(loc) {
  const r = seeded(((loc.seed || 1) * 37 + 11) >>> 0), out = [];
  const pick = () => (r() < SPECIAL.guarded ? 'guarded' : COMMON[Math.floor(r() * COMMON.length)]);
  out.push(pick());
  if ((loc.depth || 1) >= SPECIAL.deep) { let x = pick(); for (let i = 0; i < 8 && out.includes(x); i++) x = pick(); if (!out.includes(x)) out.push(x); }
  return out;
}
// Its leaning (leanings.mjs), from its seed: every traced server has one, a wild one none. Nothing saved.
export const leaningOf = (loc) => (traced(loc) ? LEANING_IDS[seeded(((loc.seed || 1) * 53 + 7) >>> 0)() * LEANING_IDS.length | 0] : null);
// Rich and Hardened: its guards and Resident are Armored.
export const armoredAt = (loc) => hasSpecial(loc, 'rich') || hasSpecial(loc, 'hardened');
// Whether a location takes specials: a traced server, never a wild one or another player's.
export const traced = (loc) => !!loc && !loc.rogue && !loc.zone && !loc.farm && !loc.lair && !loc.member && !loc.trunk && !loc.home && !loc.temp;

// ---------- invasions ----------
const runs = (loc, id) => Object.values(loc?.floorplan?.programs || {}).includes(id);
// How often this server sends, against the rest of your network's: Volatile twice, Stable half.
export const sendWeight = (loc) => specialsOf(loc).reduce((w, id) => w * (SPECIAL.send[id] ?? 1), 1);
// Levels onto the invaders it sends: Volatile +2, an Amplifier +2, a Lockdown −2.
export const sendShift = (loc) => (hasSpecial(loc, 'volatile') ? SPECIAL.volatile : 0) + (runs(loc, 'amplifier') ? SPECIAL.shift : 0) - (runs(loc, 'lockdown') ? SPECIAL.shift : 0);
// Its invasions' travel time: Backbone halves it.
export const sendTravel = (loc) => (hasSpecial(loc, 'backbone') ? SPECIAL.travel : 1);
// One of a list, by sendWeight, on one roll (0–1).
export function pickSender(list, x) {
  let r = x * list.reduce((n, l) => n + sendWeight(l), 0);
  for (const l of list) { r -= sendWeight(l); if (r < 0) return l; }
  return list.at(-1);
}

// ---------- the save ----------
// loc.trait becomes loc.special (Rich, Legacy, Backbone, Hostile and Hardened keep their names); a traced server with
// none rolls its own. Keyed on the field: safe to run twice.
export function specialsRestore(s) {
  for (const loc of s.locations || []) {
    if ('special' in loc) continue;
    const was = loc.trait, rolled = traced(loc) ? rollSpecials(loc) : null;
    loc.special = !rolled ? null : SPECIALS[was] ? [was, ...rolled.filter((x) => x !== was)].slice(0, rolled.length) : rolled;
    delete loc.trait;
  }
}

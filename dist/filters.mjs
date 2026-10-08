// Filters: gear for your firewall, rolled like protocols (a rarity, an item level, stats). They sit
// in the firewall's slots (two, and one more at each of tiers +1, +3 and +5) and change what it does,
// never what it targets: more levels, more against one family, slower fragmentation, a faster defrag,
// more grind and less chip while contested, and for the fights at home decoys, a sandbox, Block, a
// shield, Regen and barbs, and on rarer ones a tar pit, a sting or a reflection. The home-fight stats
// were services once (the Hardened Kernel, the Scrubber, the Hot-patcher, Counter-intrusion).
// Getting one: filter.flt in some vaults (pull it, jack out to bank it; Stock or Tuned at best),
// crafting (it takes signatures, which only invasions pay), and captures from invasions, the only
// place Custom filters (and the rare tar, sting and reflection) come from. Equip at home.
import { emit, warn, active, hackerLevel, materialsOf, rand, firstTime } from './combat.mjs';
import { SALVAGE_COSTS, settle, spend, splitPay } from './salvage.mjs';
import { RARITIES, seeded } from './gear.mjs';
import { power } from './data.mjs';
import { tierSlots } from './firewall.mjs';

export const FILTER_CAP = 12; // how many you can hold
export const VAULT_CHANCE = 0.15;
// Bases by item level: each adds a level of strength per 10 item levels, the higher ones more.
const BASES = [
  { from: 1, name: 'Packet Filter', k: 1 },
  { from: 10, name: 'Stateful Filter', k: 1.15 },
  { from: 25, name: 'Deep Filter', k: 1.3 },
  { from: 40, name: 'Neural Filter', k: 1.45 },
];
// Affixes: what each adds, its range (scaled a little by item level), and its name.
export const FILTER_STATS = {
  worm: { name: ' lv vs Worm', range: [2, 4], kind: 'suffix', label: 'of Wormguard', family: true },
  ransomware: { name: ' lv vs Ransomware', range: [2, 4], kind: 'suffix', label: 'of Lockbreak', family: true },
  ghostroot: { name: ' lv vs Ghostroot', range: [2, 4], kind: 'suffix', label: 'of Exorcism', family: true },
  frag: { name: '% less fragmentation', range: [15, 40], kind: 'prefix', label: 'Compacted' },
  defrag: { name: '% faster defrag', range: [20, 50], kind: 'prefix', label: 'Indexed' },
  grind: { name: '% more wear on invaders', range: [15, 35], kind: 'prefix', label: 'Abrasive' },
  chip: { name: '% less chip damage', range: [15, 35], kind: 'prefix', label: 'Buffered' },
  evasion: { name: '% Evasion at home', range: [2, 5], kind: 'prefix', label: 'Decoy', home: true },
  sanitize: { name: '% Sanitize at home', range: [10, 25], kind: 'prefix', label: 'Sandboxed', home: true },
  // scale: the range grows with the filter's item level (+4% a level, as the services' numbers did).
  reduction: { name: ' Block at home', range: [2, 6], kind: 'prefix', label: 'Hardened', home: true, scale: true },
  regen: { name: ' Regen at home', range: [0.3, 1], kind: 'prefix', label: 'Self-healing', home: true, scale: true, dp: true },
  shield: { name: '% of max Integrity as a shield in home fights', range: [4, 10], kind: 'suffix', label: 'of the Scrubber', home: true, pct: true },
  countermeasures: { name: ' damage back on every hit at home', range: [2, 6], kind: 'suffix', label: 'of Barbs', home: true, scale: true },
  tarpit: { name: '% slower invasions', range: [15, 30], kind: 'suffix', label: 'of Tar', rare: true },
  sting: { name: '% of each invader worn down on arrival', range: [10, 25], kind: 'suffix', label: 'of the Hive', rare: true },
  reflect: { name: ' code from each invader it stops', range: [2, 5], kind: 'suffix', label: 'of Reflection', rare: true },
};
const AFFIXES = { scrap: [0, 0], stock: [0, 0], tuned: [1, 2], custom: [3, 3] };
const MULT = { scrap: 0.8, stock: 1, tuned: 1.1, custom: 1.25 };

const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
// One stat's number on a filter at item level L.
const statRoll = (k, r, L) => {
  const x = FILTER_STATS[k], [a, b] = x.range, v = (a + (b - a) * r()) * (x.scale ? power(L) : 1) + (x.family ? Math.floor(L / 20) : 0);
  return x.dp ? Math.max(0.1, Math.round(v * 10) / 10) : Math.max(1, Math.round(v));
};
export const baseName = (L) => [...BASES].reverse().find((b) => Math.max(1, L) >= b.from).name;
export function rollFilter(r, { level = 1, rarity = null, stat = null } = {}) {
  const L = Math.max(1, level);
  rarity ||= ((x) => (x < 0.15 ? 'scrap' : x < 0.6 ? 'stock' : x < 0.92 ? 'tuned' : 'custom'))(r());
  const base = [...BASES].reverse().find((b) => L >= b.from);
  const stats = { strength: Math.max(1, Math.round((1 + L / 10) * base.k * MULT[rarity])) };
  const [lo, hi] = AFFIXES[rarity], n = Math.max(stat ? 1 : 0, lo + Math.floor(r() * (hi - lo + 1)));
  const taken = [];
  // A crafted filter is built around the stat you pick.
  if (stat && FILTER_STATS[stat]) { stats[stat] = statRoll(stat, r, L); taken.push(stat); }
  while (taken.length < n) {
    const ok = Object.keys(FILTER_STATS).filter((k) => !taken.includes(k) && (!FILTER_STATS[k].rare || rarity === 'custom') && !(FILTER_STATS[k].family && taken.some((t) => FILTER_STATS[t].family)));
    if (!ok.length) break;
    const k = pick(r, ok);
    stats[k] = statRoll(k, r, L);
    taken.push(k);
  }
  const pre = taken.map((k) => FILTER_STATS[k]).find((x) => x.kind === 'prefix'), suf = taken.map((k) => FILTER_STATS[k]).find((x) => x.kind === 'suffix');
  return { kind: 'filter', rarity, level: L, stats, name: [pre?.label, base.name, suf?.label].filter(Boolean).join(' ') };
}
// What a vault's filter.flt holds, if it has one (fixed by the server's seed).
// Never better than Tuned: Custom filters come from invasions (invasion.mjs capture).
export function vaultFilter(loc) {
  if (!loc || loc.zone || loc.rogue) return null;
  const r = seeded(loc.seed * 31 + 7);
  if (r() >= VAULT_CHANCE) return null;
  const x = r();
  return rollFilter(r, { level: loc.level || 1, rarity: x < 0.15 ? 'scrap' : x < 0.6 ? 'stock' : 'tuned' });
}

const own = (s) => (s.filters ||= { held: [], on: [] }); // on: indexes into held
export const filtersOf = (s) => own(s).held;
// Slots: two, plus one at each of your firewall's tiers +1, +3 and +5 (the Filter Bay folded into the wall).
export const BASE_SLOTS = 2;
export const slotsOf = (s) => BASE_SLOTS + tierSlots(s);
export const equipped = (s) => own(s).on.slice(0, slotsOf(s)).map((i) => own(s).held[i]).filter(Boolean);
// The sum of a stat over what's equipped.
export const filterStat = (s, k) => equipped(s).reduce((a, f) => a + (f.stats[k] || 0), 0);

export function addFilter(s, f, why = '') {
  const o = own(s);
  if (o.held.length >= FILTER_CAP) { for (let i = 0; i < 2; i++) s.salvage.push({ name: 'Filter scraps', virus: 'filter', seed: 0 }); return emit(s, 'drop', `${why}${f.name}, but you hold ${FILTER_CAP} filters already: +2 salvage.`); }
  o.held.push(f);
  emit(s, 'drop', `${why}${f.name} (${RARITIES[f.rarity].name}, lv ${f.level}).`, { filter: f.name });
}
// A stat line: "+3 lv · +3 lv vs Worm · 25% less fragmentation".
export const filterLine = (f) => [`+${f.stats.strength} lv`, ...Object.entries(f.stats).filter(([k]) => k !== 'strength').map(([k, v]) => `${FILTER_STATS[k].family ? '+' : ''}${v}${FILTER_STATS[k].name}`)].join(' · ');

// Crafting one (the Craft page): a Tuned filter at your level, built around the stat you pick
// (or any). Credits, Cipher code, salvage and signatures (the wall's currency: invasions pay it).
export const CRAFTABLE = Object.keys(FILTER_STATS).filter((k) => !FILTER_STATS[k].rare);
// Filter recipes: one per stat, taught by blueprints that viruses drop.
export const filterRecipes = (s) => (s.filterRecipes ||= []);
export const knowsFilter = (s, k) => filterRecipes(s).includes(k);
export const recipeLabel = (k) => FILTER_STATS[k].label.replace(/^of (the )?/, '');
export function learnFilter(s, k, why = '') {
  if (knowsFilter(s, k)) return;
  filterRecipes(s).push(k);
  emit(s, 'drop', `${why}${recipeLabel(k)} filter recipe. You can craft filters built around ${FILTER_STATS[k].name.trim()} (Craft page).`, { filterRecipe: k });
}
export const filterCost = (L) => ({ credits: 60 + 8 * L, code: { cipher: 6 + Math.floor(L / 2) }, salvage: 4, sigs: 3 });
function craftFilter(s, stat, payText) {
  if (s.run || active(s)) return warn(s, 'Craft at home, between fights.');
  if (stat && !CRAFTABLE.includes(stat)) return warn(s, `Filters: ${CRAFTABLE.join(', ')}, or any.`);
  if (stat && !knowsFilter(s, stat)) return warn(s, `You don't have the ${recipeLabel(stat)} recipe yet. Viruses drop blueprints.`);
  if (!stat && !filterRecipes(s).length) return warn(s, 'You know no filter recipes yet. Viruses drop blueprints.');
  if (!stat) stat = filterRecipes(s)[Math.floor(rand(s) * filterRecipes(s).length)]; // any of yours
  if (own(s).held.length >= FILTER_CAP) return warn(s, `You hold ${FILTER_CAP} filters. Scrap one first.`);
  const L = hackerLevel(s), c = filterCost(L), mats = materialsOf(s);
  if (s.server.credits < c.credits || (mats.cipher || 0) < c.code.cipher || (s.sigs || 0) < c.sigs) return warn(s, `A filter takes ${c.credits} credits, ${c.code.cipher} Cipher code and ${c.sigs} signatures (you hold ${s.sigs || 0}).`);
  const pay = settle(s, SALVAGE_COSTS.filter(), payText);
  if (typeof pay === 'string') return warn(s, pay);
  spend(s, pay);
  s.server.credits -= c.credits; mats.cipher -= c.code.cipher; s.sigs -= c.sigs;
  addFilter(s, rollFilter(() => rand(s), { level: L, rarity: 'tuned', stat }), 'Crafted: ');
  firstTime(s, 'filter-' + stat, `first ${recipeLabel(stat)} filter`);
}
export function filterCommand(s, full) {
  const [text, payText] = splitPay(full);
  const m = text.match(/^filter craft(?: (\w+))?$/);
  if (m) return craftFilter(s, m[1] && m[1] !== 'any' ? m[1] : null, payText);
  return filterAction(s, text);
}
function filterAction(s, text) {
  const [, verb, n] = text.split(' '), i = Number(n) - 1, o = own(s), f = o.held[i];
  if (!['equip', 'unequip', 'scrap'].includes(verb) || !f) return warn(s, 'filter equip|unequip|scrap <n>');
  if (s.run || active(s)) return warn(s, 'Filters go in and out at home, not on a run or mid-fight.');
  if (verb === 'equip') {
    if (o.on.includes(i)) return warn(s, `${f.name} is already in.`);
    if (o.on.length >= slotsOf(s)) return warn(s, `Every filter slot is full (${slotsOf(s)}). Take one out first, or buy a firewall tier: +1, +3 and +5 each add a slot.`);
    o.on.push(i);
    return emit(s, 'firewall', `${f.name} in: ${filterLine(f)}.`);
  }
  if (verb === 'unequip') {
    if (!o.on.includes(i)) return warn(s, `${f.name} isn't in.`);
    o.on = o.on.filter((x) => x !== i);
    return emit(s, 'firewall', `${f.name} out.`);
  }
  // scrap: salvage back, and the indexes after it shift down.
  o.held.splice(i, 1);
  o.on = o.on.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x));
  const back = { scrap: 1, stock: 1, tuned: 2, custom: 3 }[f.rarity] || 1;
  for (let k = 0; k < back; k++) s.salvage.push({ name: 'Filter scraps', virus: 'filter', seed: 0 });
  emit(s, 'gear', `Scrapped ${f.name}: +${back} salvage.`, { gains: [{ label: 'Salvage', qty: `+${back}`, kind: 'loot', text: `${back} salvage` }], name: f.name });
}

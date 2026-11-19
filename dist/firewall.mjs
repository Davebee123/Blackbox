// The firewall is gone (v66): HOME is its Integrity, and invasions chip it until you intercept them (invasion.mjs).
// What's left here: the old saves' refunds, and the developer's Integrity command.
import { emit } from './combat.mjs';
import { isLive } from './memory.mjs';
import { connectedTo } from './hidden.mjs';
import { gainComponents } from './salvage.mjs';

// The base an old wall sat on: your highest connected server's level, less 2 (never under 1).
const netTop = (s) => Math.max(0, ...(s.locations || []).filter((l) => !l.rogue && !l.member && isLive(s, l) && connectedTo(l)).map((l) => l.level || 1));
export const baseOf = (s) => Math.max(1, netTop(s) - 2);
const MATS = ['cipher', 'worm', 'kernel', 'exploit'];
const unit = (L) => 4 + Math.floor(Math.max(1, L) / 3); // data.mjs codeUnit
// What tier t of the old wall cost on a base B.
const tierCost = (t, B) => {
  const L = Math.max(1, B), more = t >= 3 ? (t - 2) * unit(L) : 0;
  return { credits: Math.round((25 + 6 * L) * t), cipher: Math.round((2 + L / 3) * t) + more, worm: Math.ceil(t * (1 + L / 10)) + more, kernel: Math.ceil(t * (1 + L / 10)) + more };
};
// Before v33 a wall was a level you climbed from 1, at this price.
const oldCost = (L) => {
  const major = (L + 1) % 10 === 0, half = 1 + Math.floor(L / 2), c = { credits: 15 + 10 * L, cipher: 2 + L, worm: half, kernel: half, exploit: 0 };
  return major ? { credits: c.credits * 3, cipher: c.cipher * 2, worm: half * 2, kernel: half * 2, exploit: 1 } : c;
};
const SCRAP = { scrap: 1, stock: 1, tuned: 2, custom: 3 }; // components a filter scrapped for

// The wall's tiers come back as what they cost at your base now (an older climbed wall, its climb), held filters as
// the components they scrapped for. Keyed on the fields, so it's safe to run twice.
export function wallRestore(s) {
  const f = s.firewall;
  if (f) {
    const paid = { credits: 0, cipher: 0, worm: 0, kernel: 0, exploit: 0 }, B = baseOf(s);
    if (f.plus != null) for (let t = 1; t <= Math.min(6, f.plus); t++) for (const [k, v] of Object.entries(tierCost(t, B))) paid[k] += v;
    else if (f.level != null) for (let L = 1; L < f.level; L++) for (const [k, v] of Object.entries(oldCost(L))) paid[k] += v;
    delete s.firewall;
    if (paid.credits && s.server) s.server.credits += paid.credits;
    for (const m of MATS) if (paid[m]) (s.materials ||= {})[m] = (s.materials[m] || 0) + paid[m];
    const line = Object.entries(paid).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k === 'credits' ? 'credits' : k === 'exploit' ? (v === 1 ? 'Exploit' : 'Exploits') : k[0].toUpperCase() + k.slice(1) + ' code'}`).join(', ');
    if (line) emit(s, 'info', `The firewall is gone. What you put into it came back: ${line}.`);
  }
  const carried = (s.run?.pack || []).filter((x) => x.kind === 'filter').map((x) => x.filter);
  if (carried.length) s.run.pack = s.run.pack.filter((x) => x.kind !== 'filter');
  if (s.filters || carried.length) {
    const n = [...(s.filters?.held || []), ...carried].reduce((a, x) => a + (SCRAP[x?.rarity] || 1), 0);
    delete s.filters;
    if (n) gainComponents(s, n);
  }
  for (const l of s.locations || []) { delete l.fw; if (l.outpost) delete l.outpost.fw; }
  if (s.configs) delete s.configs.firewall;
}
// harden.sh is gone: a script you held comes back as the credits a hub shop asked for it, and one running stops.
// Keyed on the field, not the version.
export function hardenRestore(s) {
  const held = s.items?.harden || 0;
  if (s.items) delete s.items.harden;
  if (s.store?.slots) s.store.slots = s.store.slots.filter((x) => x.id !== 'harden'); // Halcyon's stock
  if (held > 0 && s.server) s.server.credits += held * (70 + 6 * baseOf(s));
}
// developer integrity <n>: your server at n Integrity (testing).
export function developerDamage(s, text) {
  const n = Number(text.split(' ')[2]) || 0;
  s.server.integrity = Math.max(1, Math.min(s.server.max, n));
  emit(s, 'info', `Developer: your Integrity at ${s.server.integrity}/${s.server.max}.`);
}

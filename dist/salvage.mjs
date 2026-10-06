// Salvage works like mana: most costs take ANY salvage (generic), and a few also need a
// SPECIFIC piece (a Pulse Kernel, a guard's component). Pieces pile into named stacks. Plain
// scrap (from scrapping protocols, spare blueprints, store lots) only ever pays the generic part.
//
// A payment is { stackName: count }. You can choose it yourself (the picker, or `... pay
// pulse-kernel:1,scrap:3` on the command line); otherwise autoPay spends plain scrap first, then
// pieces no recipe asks for, then the most plentiful, and keeps what a recipe needs.
import { CONFIG } from './data.mjs';
const CONFIG_SALVAGE = 6; // configs.mjs CONFIG_COST.salvage

// Guard components: what the guards on runs leave behind.
export const GUARD_PARTS = ['Sentry Lens', 'Tracker Core', 'Sentinel Lens', 'Lockout Relay', 'Crawler Maw', 'Brood Seed', 'Shredder Blade', 'Grinder Core'];

// Recipes' salvage costs. any: generic pieces. need: [{ label, names, n }].
export const SALVAGE_COSTS = {
  protocol: (n) => ({ any: n, need: [] }),
  zeroday: (n) => ({ any: Math.max(0, n - 2), need: [{ label: 'guard component', names: GUARD_PARTS, n: 2 }] }),
  config: () => ({ any: CONFIG_SALVAGE, need: [] }),
  service: (n) => ({ any: n, need: [] }),
  module: () => ({ any: 5, need: [] }),
  filter: () => ({ any: 4, need: [] }),
  'harvester-siphon': () => ({ any: 5, need: [{ label: 'Replication Seed', names: ['Replication Seed'], n: 1 }] }),
  'harvester-scraper': () => ({ any: 5, need: [{ label: 'Cipher Seed', names: ['Cipher Seed'], n: 1 }] }),
  'harvester-tap': () => ({ any: 5, need: [{ label: 'Signal Key', names: ['Signal Key'], n: 1 }] }),
};
const WANTED = new Set(Object.values(SALVAGE_COSTS).flatMap((f) => f(4).need.flatMap((x) => x.names)));
export const isComponent = (name) => WANTED.has(name);

const plural = (x) => (x.n > 1 && !/s$/.test(x.label) ? x.label + 's' : x.label);
export const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const total = (cost) => cost.any + cost.need.reduce((n, x) => n + x.n, 0);
export const costLabel = (cost) => [cost.any ? `${cost.any} salvage` : '', ...cost.need.map((x) => `${x.n} ${plural(x)}`)].filter(Boolean).join(' + ');

// Your salvage as stacks, components first, then by size.
export function stacks(s) {
  const m = new Map();
  for (const p of s.salvage || []) m.set(p.name, (m.get(p.name) || 0) + 1);
  return [...m].map(([name, n]) => ({ name, n, component: isComponent(name) })).sort((a, b) => b.component - a.component || b.n - a.n || a.name.localeCompare(b.name));
}
const have = (s) => Object.fromEntries(stacks(s).map((x) => [x.name, x.n]));

// Does this payment cover the cost with pieces you actually have? Returns null if so, or what's wrong.
export function payProblem(s, cost, pay) {
  const h = have(s);
  let count = 0;
  for (const [name, n] of Object.entries(pay)) {
    if (n < 0 || (h[name] || 0) < n) return `You don't have ${n} ${name}.`;
    count += n;
  }
  const left = { ...pay };
  for (const need of cost.need) {
    let got = 0;
    for (const name of need.names) { const take = Math.min(left[name] || 0, need.n - got); got += take; left[name] = (left[name] || 0) - take; }
    if (got < need.n) return `Needs ${need.n} ${plural(need)}.`;
  }
  if (count !== total(cost)) return count < total(cost) ? `Needs ${total(cost) - count} more salvage.` : `That's ${count - total(cost)} more salvage than it takes.`;
  return null;
}

// The default payment, or null if you can't cover it.
export function autoPay(s, cost) {
  const h = have(s), pay = {};
  const take = (name, n) => { const t = Math.min(n, h[name] || 0); if (t) { h[name] -= t; pay[name] = (pay[name] || 0) + t; } return t; };
  for (const need of cost.need) {
    let want = need.n;
    for (const name of [...need.names].sort((a, b) => (h[b] || 0) - (h[a] || 0))) want -= take(name, want);
    if (want > 0) return null;
  }
  let want = cost.any;
  const order = Object.keys(h).sort((a, b) => isComponent(a) - isComponent(b) || (h[b] || 0) - (h[a] || 0));
  for (const name of order) { if (!want) break; want -= take(name, want); }
  return want > 0 ? null : pay;
}

// "pulse-kernel:1,scrap:3" → { 'Pulse Kernel': 1, Scrap: 3 } (names resolved against your stacks).
export function parsePay(s, text) {
  const bySlug = Object.fromEntries(stacks(s).map((x) => [slug(x.name), x.name]));
  const pay = {};
  for (const part of text.split(',').map((x) => x.trim()).filter(Boolean)) {
    const [k, v = '1'] = part.split(':');
    const name = bySlug[slug(k)];
    if (!name) return null;
    pay[name] = (pay[name] || 0) + Math.max(0, Number(v) || 0);
  }
  return pay;
}
// Split "compile evasion pay a:1,b:2" into the command and the payment text.
export const splitPay = (text) => { const i = text.indexOf(' pay '); return i < 0 ? [text, null] : [text.slice(0, i), text.slice(i + 5)]; };

// Settle a cost: the chosen payment (checked) or the default. Returns the payment, or a string saying why not.
export function settle(s, cost, payText) {
  const pay = payText != null ? parsePay(s, payText) : autoPay(s, cost);
  if (!pay) return payText != null ? 'That payment names salvage you don\'t have.' : `Needs ${costLabel(cost)}.`;
  const why = payProblem(s, cost, pay);
  return why || pay;
}
export function spend(s, pay) {
  for (const [name, n] of Object.entries(pay)) {
    for (let i = 0; i < n; i++) {
      const at = s.salvage.findIndex((p) => p.name === name);
      if (at >= 0) s.salvage.splice(at, 1);
    }
  }
}
export const canAfford = (s, cost) => !!autoPay(s, cost);

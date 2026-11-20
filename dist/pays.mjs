// What pays what (docs/pays.md): each activity pays its own thing, at its old value in credits (market.mjs WARES' base
// prices, WORTH here), and the director reacts to the ticker. While a live ticker card raises a ware's price at a hub
// (s.ticker.live: a move with mult > 1, not a leaked card still waiting), what pays that ware is dealt REACT times as
// often: an Outbreak of that code's family and its Patient zero, the surge among run cards (components), the Exfil and
// a Settlement run (Exploits), a Rack pull (components). Weights only: every caller keeps its own dice.
// No imports: events.mjs, floorplan.mjs and the rest load it early.

export const WORTH = { code: 14, exploit: 140, salvage: 7 }; // credits a unit: market.mjs WARES' base prices
export const REACT = 2;
const CODE = { ransomware: 'cipher', worm: 'worm', ghostroot: 'kernel' }; // gear.mjs codeOf, for the three that break out

// A code amount as credits (a cache's code comes as credits).
export const codeCredits = (n) => Math.round(n * WORTH.code);
// Credits as Exploits (the Exfil's archive), at least one.
export const asExploits = (credits) => Math.max(1, Math.round(credits / WORTH.exploit));
// Credits as components (a surge's wave), at least one.
export const asComponents = (credits) => Math.max(1, Math.round(credits / WORTH.salvage));

// The wares a live ticker card wants now: a set of ware ids (cipher, worm, kernel, exploit, salvage).
export function wanted(s) {
  const out = new Set();
  for (const c of s?.ticker?.live || []) {
    if (c.wait > 0) continue;
    for (const x of c.moves || []) if (x.mult > 1 && x.ware && x.ware !== '*') out.add(x.ware);
  }
  return out;
}
export const wants = (s, ware) => wanted(s).has(ware);
// REACT when the ticker wants the ware, else 1.
export const reactMult = (s, ware) => (wants(s, ware) ? REACT : 1);
// An outbreak's family weight: REACT for a family whose code is wanted.
export const familyMult = (s, family) => (CODE[family] ? reactMult(s, CODE[family]) : 1);

// What pays each ware (a price's tooltip, docs/pays.md The map).
export const PAYERS = {
  code: ['Invasions', 'Outbreak', 'Patient zero', 'Quarantine', 'Packet routing', 'vault payloads', "Root's stash room", 'a Code Siphon'],
  exploit: ['Settlement runs', 'the Exfil', 'elites', 'guard posts'],
  salvage: ['Rack pulls', 'Surge room', 'Cascade', 'Deadlock', 'a Nest', 'scrapping', 'a Harvester'],
};
export const payersOf = (ware) => PAYERS[ware === 'cipher' || ware === 'worm' || ware === 'kernel' ? 'code' : ware] || [];

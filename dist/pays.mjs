// What pays what (docs/pays.md): each activity pays its own thing at its old value in credits, at the market's base
// prices (market.mjs WARES), so moving an activity's pay between wares keeps what it's worth. No imports: events.mjs,
// floorplan.mjs and the rest load it early.

export const WORTH = { code: 14, exploit: 140, salvage: 7 }; // credits a unit: market.mjs WARES' base prices

// A code amount as credits (a cache's code comes as credits).
export const codeCredits = (n) => Math.round(n * WORTH.code);
// Credits as Exploits (the Exfil's archive), at least one.
export const asExploits = (credits) => Math.max(1, Math.round(credits / WORTH.exploit));
// Credits as components (a surge's wave), at least one.
export const asComponents = (credits) => Math.max(1, Math.round(credits / WORTH.salvage));

// Components: one currency, a count on the save (s.components). Every broken part drops the same kind
// (docs/variety-plan.md 4). The family codes (Cipher, Worm and Kernel code, and Exploits) stay apart: they're
// s.materials.
//
// Until v47 they were a list of named pieces in s.salvage (Fuse Wire, Thermal Pad, Pulse Kernel…).
// componentsRestore turns an older save's pile into its count, so nothing is lost.

export const componentsOf = (s) => s.components || 0;
export function gainComponents(s, n) {
  s.components = componentsOf(s) + n;
  return n;
}
// Spending them: a payload (payload.mjs), and a sale at a hub's market (market.mjs). Nothing else costs components.
export const canAfford = (s, n) => componentsOf(s) >= n;
export function spend(s, n) {
  s.components = Math.max(0, componentsOf(s) - n);
}

// v47: an older save's pile of named pieces becomes its count. Keyed on the field, so it runs once.
export function componentsRestore(s) {
  if (Array.isArray(s.salvage)) s.components = componentsOf(s) + s.salvage.length;
  delete s.salvage;
  s.components ||= 0;
}

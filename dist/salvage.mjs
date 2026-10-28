// Components: one currency, a count on the save (s.components). Every broken part drops the same kind
// (docs/variety-plan.md 4), and every cost that takes components takes any of them. The family codes
// (Cipher, Worm and Kernel code, and Exploits) stay apart: they're s.materials.
//
// Until v47 they were a list of named pieces in s.salvage (Fuse Wire, Thermal Pad, Pulse Kernel…), and a few
// costs named one (a zero-day protocol 2 guard components, a socket its server's own); they take plain ones
// now. componentsRestore turns an older save's pile into its count, so nothing is lost.

export const componentsOf = (s) => s.components || 0;
export function gainComponents(s, n) {
  s.components = componentsOf(s) + n;
  return n;
}
export const canAfford = (s, n) => componentsOf(s) >= n;
export const costLabel = (n) => `${n} component${n === 1 ? '' : 's'}`;
// Settle a cost: null when you hold enough, or a string saying why not.
export const payProblem = (s, n) => (canAfford(s, n) ? null : `Needs ${costLabel(n)}. You have ${componentsOf(s)}.`);
export function spend(s, n) {
  s.components = Math.max(0, componentsOf(s) - n);
}

// v47: an older save's pile of named pieces becomes its count. Keyed on the field, so it runs once.
export function componentsRestore(s) {
  if (Array.isArray(s.salvage)) s.components = componentsOf(s) + s.salvage.length;
  delete s.salvage;
  s.components ||= 0;
}

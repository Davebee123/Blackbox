// Helpers for the class modules (dist/classes/<class>.data.mjs): talent nodes, written the same way data.mjs writes them.
// A talent is one pick of a tier's three.
export const t = (id, name, rule) => ({ id, name, rule });
// A capstone (the row under the tree, from level 45): two ranks, rules[0] at rank 1 and rules[1] at rank 2 (level 50),
// ranks the number each rank uses (the class modules read it with capValue in combat.mjs).
export const c = (id, name, rules, ranks) => ({ id, name, rule: rules[0], rules, ranks, max: 2 });

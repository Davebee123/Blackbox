// Helpers for the class modules (dist/classes/<class>.data.mjs): talent nodes, written the same way
// data.mjs writes them. A filler is a ranked node (up to 3 ranks, `per` a rank); a talent is a pick.
export const f = (id, name, rule, per) => ({ id, name, rule, per, max: 3 });
export const t = (id, name, rule) => ({ id, name, rule });
// A capstone (the row under the tree, from level 45): two ranks, rules[0] at rank 1 and rules[1] at rank 2 (level 50),
// ranks the number each rank uses (the class modules read it with capValue in combat.mjs).
export const c = (id, name, rules, ranks) => ({ id, name, rule: rules[0], rules, ranks, max: 2 });

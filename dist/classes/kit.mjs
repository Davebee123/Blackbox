// Helpers for the class modules (dist/classes/<class>.data.mjs): talent nodes, written the same way
// data.mjs writes them. A filler is a ranked node (up to 3 ranks, `per` a rank); a talent is a pick.
export const f = (id, name, rule, per) => ({ id, name, rule, per, max: 3 });
export const t = (id, name, rule) => ({ id, name, rule });

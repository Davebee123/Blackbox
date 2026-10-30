// Leanings (docs/leanings.md): a traced server's one positive rule, keyed on the virus's timeline so it never favours a
// class. Its id comes from the server's seed (specials.mjs leaningOf); a fight on that server carries it as
// e.leaning = { id, paid, last } (combat.mjs selectEncounter). Where each is read:
//   venting, windup  combat.mjs damageMultiplier (the size), hit (paid)
//   brownout         combat.mjs landAttack; e.aim, your command's part this cycle (combat.mjs playerPhase)
export const LEANING = { venting: 1.5, windup: 1.25, brownout: 0.7 };
// glyph: the tag's icon. paid: the chip that counts what it has paid this fight (damage dealt, or Signal kept).
export const LEANINGS = {
  venting: { name: 'Venting', glyph: 'burn', paid: 'damage', rule: 'A part takes 50% more damage on the cycle after it attacks.', answer: 'Hit the part that just attacked.' },
  windup: { name: 'Wind-up', glyph: 'clock', paid: 'damage', rule: 'A part takes 25% more damage on the cycle its attack lands.', answer: 'Hit the part whose attack lands this cycle.' },
  brownout: { name: 'Brownout', glyph: 'reduction', paid: 'signal', rule: 'An attack deals 30% less damage to you when your command aims at its part that cycle.', answer: 'Aim at the part whose attack lands this cycle.' },
};
export const LEANING_IDS = Object.keys(LEANINGS);

const id = (e) => e?.leaning?.id || null;
// Venting and Wind-up: what a part takes, from anyone's hit, this cycle.
export function leanDealt(e, p) {
  if (!p || !e) return 1;
  if (id(e) === 'venting' && p.lastLanded != null && p.lastLanded === e.cycle - 1) return LEANING.venting;
  if (id(e) === 'windup' && p.attack && p.attack.due === e.cycle) return LEANING.windup;
  return 1;
}
// Brownout: what a part's attack deals you, when your command aimed at it this cycle (Spawn and Deploy count).
export const leanTaken = (e, p) => (id(e) === 'brownout' && p && e.aim?.cycle === e.cycle && e.aim.target === p.id ? LEANING.brownout : 1);
// Count what it paid, on a part, this cycle: the fight header's total and the board's tag (view.mjs).
export function leanPaid(e, p, n) {
  if (!id(e) || !(n > 0)) return;
  const L = e.leaning;
  L.paid = (L.paid || 0) + n;
  if (L.last?.cycle !== e.cycle) L.last = { cycle: e.cycle, parts: {} };
  L.last.parts[p.id] = (L.last.parts[p.id] || 0) + n;
}
// What it paid on the cycle just played (the board shows it; nothing shows ahead of time): { part id: amount }, or null.
export const leanShown = (e) => (e?.leaning?.last && e.leaning.last.cycle === e.cycle - 1 ? e.leaning.last.parts : null);

// Goals in sight (docs/demo-plan.md Phase 8): the earned pieces and achievements nearest done, for the map's tracker
// under Contracts. Pinned pieces (earned.mjs pins) come first; the rest fill in on their own, the furthest along first.
// Pure: the save in, a list out. Reads earned.mjs and achievements.mjs, changes neither.
import { UNIQUES } from './combat.mjs';
import { EARNED, earnedOf, pinsOf, PIN_MAX } from './earned.mjs';
import { achievements, earned, progressOf, rewardText } from './achievements.mjs';

// One goal: { kind: 'piece' | 'ach', id, name, n, of, what (its rule in words), reward (words, or a piece's name) }.
const piece = (s, id) => { const p = earnedOf(s, id); return p && { kind: 'piece', id, name: UNIQUES[id].name, n: p.n, of: p.of, what: p.todo, pinned: false }; };
export function goalsOf(s, k = PIN_MAX) {
  const pins = pinsOf(s).map((id) => ({ ...piece(s, id), pinned: true })).filter((g) => g.id);
  const open = [];
  for (const u of EARNED) {
    if (pins.some((g) => g.id === u.id)) continue;
    const p = earnedOf(s, u.id);
    if (p && p.open && !p.got && !p.full && p.n > 0) open.push(piece(s, u.id));
  }
  for (const a of achievements()) {
    if (earned(s, a.id)) continue;
    const pr = progressOf(a, s);
    if (!Array.isArray(pr)) continue;
    const [n, of] = pr;
    if (!(n > 0) || n >= of) continue;
    open.push({ kind: 'ach', id: a.id, name: a.name, n, of, what: a.rule, reward: rewardText(a), pinned: false });
  }
  open.sort((a, b) => b.n / b.of - a.n / a.of || a.of - a.n - (b.of - b.n));
  return [...pins, ...open].slice(0, k);
}

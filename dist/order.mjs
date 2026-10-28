// The order levers (docs/puzzle-levers.md 3.2 to 3.4): parts whose right moment to break depends on the board. Each
// reads one fact the board shows, and the planner (planner.mjs), the routine's WHEN chips (routines.mjs) and the board's
// marks (view.mjs, fightread.mjs) all read it here, so the three agree.
//
//   loudWins(s)     the Tripwire: breaking it now and then the others loud (they take more and drop their ◆) ends them no
//                   later within CONFIG.tripwire.window cycles, and costs you no more on the way, than leaving it: a race
//                   you win
//   blastPays(s)    the Zip Bomb: its blast would break a part, and a ◆ or a shield of yours covers the fuse
//   cashIn(s)       the Lockbox: half of what it holds breaks its partner the moment it breaks
//   heldOf(s, p)    what a Lockbox holds, for which partner, and what lands when it breaks
//   race(s, list, n)  your next n cycles played out on a list of parts, one at a time in order: whether they all break
import { ABILITIES, CONFIG } from './data.mjs';
import { livingParts, part, alive, frozenNow, usable, readyIn, cooldownOf, previewDamage, defender, blastOf, scaled, ignoresArmor, attackAmount, toIntent, intents } from './combat.mjs';

const others = (s, p) => livingParts(s).filter((x) => x !== p && x.kind === 'system' && !frozenNow(s, x));

// ---------- your pace ----------
// What one of your skills deals p with no ◆ (as it would be once loud, with `loud` true), its own caps counted (a
// Limiter's), within `left` cycles: a burn or a helper all its ticks by then. Crits aren't guessed.
function dmgOn(s, id, p, loud, left = 1) {
  const a = ABILITIES[id], dot = a?.tick || a?.helper;
  if (dot) return Math.round(scaled(s, dot) * (loud || p.loud ? CONFIG.tripwire.taken : 1)) * Math.min(a.ticks || 1, left) * (a.helpers || 1);
  const was = { integrity: p.integrity, armor: p.armor, loud: p.loud };
  Object.assign(p, { integrity: 1e9, armor: 0, loud: loud || p.loud });
  try { return previewDamage(s, id, p); } finally { Object.assign(p, was); }
}
// Your next n cycles played out on a list of parts ([{ p, loud }]), one at a time in order: each cycle the skill on your
// bar, ready by then, that does the most to the part in front (through its ◆ if it can: a piercing hit, else the biggest
// strip, else any hit breaks one ◆; on a bare part the biggest hit, a burn or a helper counted by its ticks left in the
// window). A skill used is ready again after its cooldown. The burns and helpers already out tick on their parts first.
// A proc is ready while lit (Shatter: the cycle after you break a part's last ◆, its shards on every other bare part).
// The cycles it takes to break every part (Infinity: not within n). Crits and the virus's moves aren't guessed.
export function race(s, list, n, out = null) {
  const e = s.encounter;
  if (!e) return Infinity;
  const ids = usable(s).filter((id) => ABILITIES[id]?.target === 'part');
  const lit = (id) => !toIntent(s, `${id} ${list[0]?.p.id}`).error;
  const ready = Object.fromEntries(ids.map((id) => [id, ABILITIES[id].proc ? (lit(id) ? 0 : Infinity) : readyIn(s, id)]));
  const left = list.map((x) => ({ ...x, armor: x.loud ? 0 : x.p.armor || 0, hp: x.p.integrity }));
  for (const b of [...(e.burns || []), ...(e.helpers || [])]) { const x = left.find((y) => y.p.id === b.target); if (x) x.hp -= Math.round(b.damage * (x.loud ? CONFIG.tripwire.taken : 1)) * Math.min(n, b.left); }
  for (let c = 0; c < n; c++) {
    for (const y of left) if (y.hp <= 0 && y.at == null) y.at = c; // the cycle it breaks in (the one before this)
    if (out && c === 0) out.push(...left);
    const x = left.find((y) => y.hp > 0);
    if (!x) return c;
    const can = ids.filter((id) => ready[id] <= c);
    for (const id of ids) if (ABILITIES[id].proc && ready[id] < c) ready[id] = Infinity; // a proc's window is one cycle
    let use = null;
    if (x.armor > 0) {
      const pierce = can.filter((id) => ignoresArmor(s, id)).sort((a, b) => dmgOn(s, b, x.p, x.loud) - dmgOn(s, a, x.p, x.loud))[0];
      const strip = can.filter((id) => ABILITIES[id].strip > 1).sort((a, b) => ABILITIES[b].strip - ABILITIES[a].strip)[0];
      use = pierce || strip || can.find((id) => !ABILITIES[id].tick && !ABILITIES[id].helper) || null;
      if (use === pierce && pierce) x.hp -= dmgOn(s, use, x.p, x.loud);
      else if (use) { x.armor -= ABILITIES[use].strip || 1; if (x.armor <= 0) for (const id of ids) if (ABILITIES[id].proc === 'stripped') ready[id] = c + 1; }
    } else {
      use = can.sort((a, b) => dmgOn(s, b, x.p, x.loud, n - c) - dmgOn(s, a, x.p, x.loud, n - c))[0] || null;
      if (use) x.hp -= dmgOn(s, use, x.p, x.loud, n - c);
    }
    if (use) ready[use] = ABILITIES[use].proc ? Infinity : c + Math.max(1, cooldownOf(s, use));
    // Shards (Shatter): every other part with no ◆ takes them too.
    if (use && ABILITIES[use].shards) for (const y of left) if (y !== x && y.hp > 0 && !(y.armor > 0)) y.hp -= Math.round(scaled(s, ABILITIES[use].shards) * (y.loud ? CONFIG.tripwire.taken : 1));
  }
  for (const y of left) if (y.hp <= 0 && y.at == null) y.at = n;
  return left.every((y) => y.hp <= 0) ? n : Infinity;
}
// What the virus's visible attacks deal you over the next n cycles, its parts breaking as a race played them (each item's
// `at`: its attacks stop the cycle it breaks in). From trip (the cycle the Tripwire breaks), the loud ones hit harder and
// sooner (CONFIG.tripwire). Your ◆ and shield take what they would; Block and crits aren't guessed.
function taken(s, items, n, trip = null) {
  const e = s.encounter, c0 = e.cycle, T = CONFIG.tripwire, hits = [];
  for (const y of items) {
    const a = y.p.attack;
    if (!a || !(a.interval > 0) || a.due >= 900) continue;
    const end = Math.min(n, y.at ?? n), amt = attackAmount(y.p);
    let k = a.due - c0, iv = a.interval, moved = false;
    while (k < end) {
      if (y.loud && trip != null && k > trip && !moved) { k = Math.max(trip, k - T.sooner); iv = Math.max(2, iv - T.sooner); moved = true; if (k >= end) break; }
      hits.push([k, y.loud && trip != null && k >= trip ? Math.round(amt * T.loud) : amt]);
      k += iv;
    }
  }
  // Your ◆ take the first hits whole, then your shield soaks what it can.
  hits.sort((x, y) => x[0] - y[0]);
  const total = hits.slice(e.chits || 0).reduce((n2, h) => n2 + h[1], 0);
  return Math.max(0, total - (e.shield || 0));
}

// ---------- the Tripwire: loud both ways ----------
// The Tripwire standing, its trip still loud (no Sudo, no Logic Bomb or Quiet Wire on it), with parts left to go loud.
export const tripwireOf = (s) => livingParts(s).find((p) => p.deadman && !p.quiet && others(s, p).length) || null;
// The parts whose next attack a trip now would pull into this cycle (due next cycle, a cycle sooner).
export const alarmOf = (s, rest) => rest.filter((p) => p.attack && p.attack.due === s.encounter.cycle + 1);
// Loud wins: breaking the Tripwire now, then every other part loud (no ◆, more damage taken), the smallest first, takes
// no more of your cycles than breaking the others as they are, within CONFIG.tripwire.window cycles. Loud parts attack
// sooner and harder, so a trip that doesn't end the fight sooner costs you.
export function loudWins(s) {
  const t = tripwireOf(s);
  if (!t || (s.encounter.buffs?.sudo ?? -1) >= s.encounter.cycle) return null;
  const rest = others(s, t).sort((a, b) => a.integrity - b.integrity), n = CONFIG.tripwire.window;
  // A trip this cycle pulls the attacks due next cycle into this one: with nothing up to take them, not now.
  const pulled = alarmOf(s, rest);
  if (pulled.length && race(s, [{ p: t, loud: false }], 1) === 1 && !(s.encounter.chits >= pulled.length) && (s.encounter.shield || 0) < pulled.reduce((k, p) => k + attackAmount(p) * CONFIG.tripwire.loud, 0)) return null;
  // The race both ways: tripping it must end the others no later, and cost you no more on the way, than leaving it.
  const L = [], Q = [];
  const loud = race(s, [{ p: t, loud: false }, ...rest.map((p) => ({ p, loud: true }))], n, L);
  if (loud === Infinity) return null;
  const quiet = race(s, rest.map((p) => ({ p, loud: false })), n, Q);
  if (loud > quiet) return null;
  const trip = L[0]?.at ?? 0;
  if (taken(s, L, n, trip) > taken(s, [...Q, { p: t, loud: false }], n)) return null;
  // And no big hit (a tenth of your max or more) lands while you're still on the Tripwire: those cycles are the race's
  // cost, spent while the parts that hit hardest stand.
  const big = defender(s).max * 0.1, c0 = s.encounter.cycle;
  if (trip > 0 && rest.some((p) => p.attack && p.attack.due - c0 < trip && attackAmount(p) >= big)) return null;
  return { part: t, rest, loud, quiet };
}

// ---------- the Zip Bomb: the blast hits both sides ----------
// What the blast takes from you, uncovered.
export const biteOf = (s) => Math.max(1, Math.round(defender(s).max * CONFIG.zipbomb.share));
// A skill on your bar that covers a fuse: a ◆ (Harden) or a shield of its own (Firewall).
export const covers = (s, id) => id === 'harden' || (ABILITIES[id]?.target === 'none' && ABILITIES[id]?.shield > 0);
// Your cover for a blast `inN` cycles out: a ◆ or a shield up, or a cover skill ready by then.
export function coverFor(s, inN = CONFIG.zipbomb.fuse) {
  const e = s.encounter;
  if (e.chits > 0) return { kind: 'chit' };
  if ((e.shield || 0) * 2 >= biteOf(s)) return { kind: 'shield' };
  const id = usable(s).find((x) => covers(s, x) && readyIn(s, x) <= inN);
  return id ? { kind: 'skill', id } : null;
}
// The Zip Bomb standing (its fuse not lit), or one whose fuse burns.
export const zipOf = (s) => s.encounter?.virus.parts.find((p) => p.fuse && !p.fused && (alive(p) || p.fuseAt)) || null;
// The parts its blast would break: each one's Integrity under its bite (blastOf; a loud one takes more).
export function blastBreaks(s, z = zipOf(s)) {
  if (!z) return [];
  return livingParts(s).filter((x) => x !== z && !frozenNow(s, x) && x.integrity <= Math.floor(blastOf(x) * (x.loud ? CONFIG.tripwire.taken : 1)));
}
// Blast pays: the Zip Bomb breaks this cycle (one hit of yours does it), its blast would break another part (its bar under
// the bite) when the fuse runs out, and a ◆ or a shield of yours covers the fuse.
export function blastPays(s) {
  const z = zipOf(s);
  if (!z || !alive(z) || !others(s, z).length) return null;
  const breaks = blastBreaks(s, z);
  if (!breaks.length || race(s, [{ p: z, loud: false }], 1) !== 1) return null;
  const cover = coverFor(s);
  return cover ? { part: z, breaks, cover } : null;
}

// ---------- the Lockbox: held, not lost ----------
// What a Lockbox holds now: [{ partner, held, land }] for each partner still standing.
export function heldOf(s, p) {
  return Object.entries(p?.held || {}).map(([id, n]) => ({ partner: part(s, id), held: n, land: Math.floor(n * CONFIG.wardHeld) })).filter((x) => alive(x.partner) && x.held > 0);
}
export function cashIn(s) {
  for (const box of livingParts(s).filter((p) => p.held)) {
    const x = heldOf(s, box).find((h) => h.land >= h.partner.integrity);
    if (x) return { part: box, ...x };
  }
  return null;
}

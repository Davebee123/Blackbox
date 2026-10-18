// Faction gear (docs/loot-plan.md Faction gear). Two halves:
//   implicits   one fixed line on an item from a faction, in its mark and colour (gear.mjs IMPLICITS, withImplicit;
//               combat.mjs gearStat and uniqueFx run it). Rolled onto the items a faction gives: a feud runner's drop,
//               its contracts' items, its Shop's sealed item, its servers' vaults. Never on a unique or a set piece.
//   pieces      five faction uniques, one a faction (content/items.mjs, faction: <id>, source kind 'feud'), each built
//               from PARTS.need parts. A feud won for a side gives one part of its piece (events.mjs feudBonus), kept
//               as a count on the save (s.factionParts), not in the stash. At its hub, `hub assemble <faction>` spends
//               the parts for the piece at your level; once you hold it, the next lot re-tunes it to your level (the
//               same item, its stats, base and implicit grown). Feuds are their only source.
// Read from the written items (not combat.mjs UNIQUES), so this module loads before the engine has finished (hubs.mjs).
import ITEMS from './content/items.mjs';
import { emit, warn, rand, active, hackerLevel, addItem, gearFx, fxHolds, defender, soonestAttacker, alive, attackAmount, blocked, skillBase, hit, heal } from './combat.mjs';
import { uniqueItem, itemLabel, STASH_CAP } from './gear.mjs';
import { FACTIONS, hubOf } from './factions.mjs';

// ---------- implicits in a fight ----------
// The implicits' own kinds (gear.mjs IMPLICITS), a class-hook module combat.mjs runs after the sets' (CLASS_HOOKS):
//   claim         Halcyon's Claims: a hit over its share of your max is a claim, a share of it healed two cycles later
//                 (e.fxs.imp.claims; the HUD's Signal bar shows each one pending)
//   appraise      Kestrel's Appraisal: a break appraises the next part to attack: its timer shows (seenUntil), its next
//                 hit shows on its row (view.mjs partTags), and it takes more from you until it breaks
//   glass-taken%  GLASSJAW's Glass Jaw, its down side (its up side is a damage% block the engine runs)
//   clean-signal  LANTERN's Clean Signal: a stack each cycle no attack landed on you (up to its stacks), more on your
//                 skills for each; an attack that lands clears them
//   chorus        NULL CHOIR's Chorus: the same damaging skill twice in a row, and the second hits again for a share
// Each player keeps their own (e.fxs.imp, fresh at a fight's start). One block a faction (combat.mjs uniqueFx).
const own = (s, d) => gearFx(s).find((x) => x.implicit && x.fx.do === d) || null;
const stOf = (s) => ((s.encounter.fxs ||= {}).imp ||= { claims: [], clean: 0, hurt: false, last: null, appraised: null });
const chip = (x) => ({ gear: [{ id: x.id, name: x.name }] }); // the HUD's gear chip flashes, its name floats (combat.mjs firedOf)
export const pendingClaims = (s) => s.encounter?.fxs?.imp?.claims || [];
export const appraisedOf = (s) => s.encounter?.fxs?.imp?.appraised || null;
export const cleanStacks = (s) => s.encounter?.fxs?.imp?.clean || 0;
export const IMPLICIT_HOOKS = {
  start(s) { if (s.encounter) (s.encounter.fxs ||= {}).imp = { claims: [], clean: 0, hurt: false, last: null, appraised: null }; },
  dealt(s, p, opts = {}) {
    const st = s.encounter?.fxs?.imp;
    if (!st || !p) return 1;
    let m = 1;
    if (st.appraised?.part === p.id && (opts.mine || opts.dot)) m *= 1 + st.appraised.value / 100;
    const c = st.clean && opts.mine && !opts.dot && !opts.by ? own(s, 'clean-signal') : null;
    if (c) m *= 1 + (st.clean * c.fx.value) / 100;
    return m;
  },
  taken(s) { const x = own(s, 'glass-taken%'); return x && fxHolds(s, x.fx) ? 1 + x.fx.value / 100 : 1; },
  struck(s, atk, dealt) {
    const e = s.encounter;
    if (!e || !dealt) return;
    const st = stOf(s), x = own(s, 'claim');
    if (x && fxHolds(s, x.fx, { amount: dealt })) {
      const n = Math.max(1, Math.round((dealt * x.fx.value) / 100));
      st.claims.push({ at: e.cycle + 2, amount: n, name: x.name, id: x.id });
      emit(s, 'status', `${x.name}: a claim of ${n}, paid in 2 cycles.`, { mark: 'shield', ...chip(x) });
    }
    st.hurt = true;
    const c = st.clean && own(s, 'clean-signal');
    if (c) emit(s, 'status', `${c.name} lost.`, { mark: 'debuff', ...chip(c) });
    st.clean = 0;
  },
  broke(s, p) {
    const e = s.encounter, st = e && stOf(s);
    if (!st) return;
    if (st.appraised?.part === p.id) st.appraised = null;
    const x = own(s, 'appraise'), t = x && soonestAttacker(s, p.id);
    if (!alive(t) || t === p || !t.attack) return;
    st.appraised = { part: t.id, value: x.fx.value, name: x.name };
    t.seenUntil = Math.max(t.seenUntil || 0, t.attack.due); // its timer shows through a veil until it lands
    emit(s, 'status', `${x.name}: the ${t.name} is appraised. Its next hit: ${blocked(s, attackAmount(t))}.`, { target: t.id, mark: 'buff', ...chip(x) });
  },
  cycle(s) {
    const e = s.encounter, st = e?.fxs?.imp;
    if (!st) return;
    for (const c of st.claims.filter((x) => x.at <= e.cycle)) heal(s, c.amount, `${c.name} pays out`, { gear: [{ id: c.id, name: c.name }] });
    st.claims = st.claims.filter((x) => x.at > e.cycle);
    const c = own(s, 'clean-signal');
    if (c && !st.hurt && st.clean < (c.fx.stacks || 3)) { st.clean++; emit(s, 'status', `${c.name} ${st.clean}: your skills deal ${st.clean * c.fx.value}% more.`, { mark: 'buff', ...chip(c) }); }
    st.hurt = false;
  },
  used(s, { id, target, res }) {
    const e = s.encounter, st = e && stOf(s);
    if (!st) return;
    const x = st.last === id && res?.dealt > 0 && alive(target) ? own(s, 'chorus') : null;
    st.last = id;
    if (!x) return;
    st.last = null; // the copy answers the pair: a third in a row starts the next one
    hit(s, target, Math.max(1, Math.round((skillBase(s, id, target) * x.fx.value) / 100)), { mine: true, by: x.name });
  },
};

export const PARTS = { need: 3 };
// Each faction's piece (the written unique), and the faction a piece belongs to.
export const PIECES = Object.fromEntries((ITEMS.uniques || []).filter((u) => u.faction).map((u) => [u.faction, u]));
export const pieceOf = (f) => PIECES[f] || null;
export const isFactionPiece = (id) => Object.values(PIECES).some((u) => u.id === id);
// The parts you hold toward a faction's piece (spent ones gone).
export const partsOf = (s, f) => s.factionParts?.[f] || 0;
// Your copy of the piece: the highest-level one in your stash, or null (never assembled, or broken down since).
export const heldPiece = (s, f) => (s.stash || []).filter((it) => it.unique && it.unique === PIECES[f]?.id).sort((a, b) => b.level - a.level)[0] || null;
// What the hub's tile shows: the piece, the parts held, and what assembling would do now.
export function pieceState(s, f) {
  const u = PIECES[f];
  if (!u) return null;
  const parts = partsOf(s, f), held = heldPiece(s, f), L = hackerLevel(s);
  const verb = held ? 'retune' : 'assemble', current = !!held && held.level >= L;
  return { f, id: u.id, name: u.name, parts, need: PARTS.need, held, verb, current, ready: parts >= PARTS.need && !current, level: L, found: !!s.collection?.[u.id] };
}
// A feud won for a side: one part of its piece. Returns the part's line for the feud's message.
export function gainPart(s, f) {
  const u = PIECES[f];
  if (!u) return '';
  const n = ((s.factionParts ||= {})[f] = partsOf(s, f) + 1);
  emit(s, 'part', `A part of ${u.name}: ${Math.min(n, PARTS.need)}/${PARTS.need}${n > PARTS.need ? ` (${n} held)` : ''}.${n >= PARTS.need ? ` Assemble it at ${FACTIONS[f].hub.name}.` : ''}`, { faction: f, unique: u.id, parts: n });
  return `a part of ${u.name}`;
}
// hub assemble <faction>: the piece at your level from PARTS.need parts, or your piece re-tuned to it.
export function assemble(s, f) {
  const u = PIECES[f];
  if (!u || !FACTIONS[f]) return warn(s, 'hub assemble <faction>');
  if (!hubOf(s, f)) return warn(s, `Assemble ${u.name} at ${FACTIONS[f].hub.name}, once you have found it.`);
  if (active(s)) return warn(s, 'Finish the fight first.');
  const st = pieceState(s, f);
  if (st.parts < PARTS.need) return warn(s, `${u.name} takes ${PARTS.need} parts. You hold ${st.parts}. Win feuds for ${FACTIONS[f].short} for more.`);
  if (st.current) return warn(s, `Your ${u.name} is already at your level (${st.held.level}). Keep the parts for the next level.`);
  const fresh = uniqueItem(u, st.level, () => rand(s));
  if (st.held) {
    const was = st.held.level;
    Object.assign(st.held, { level: fresh.level, base: fresh.base, stats: fresh.stats, implicit: fresh.implicit, implicitValue: fresh.implicitValue });
    s.factionParts[f] -= PARTS.need;
    return emit(s, 'drop', `Re-tuned ${u.name}: v${was} to ${itemLabel(st.held)}.`, { item: st.held, rarity: st.held.rarity, faction: f });
  }
  if ((s.stash || []).length >= STASH_CAP) return warn(s, `Your stash is full (${STASH_CAP}). Make room for ${u.name} first.`);
  s.factionParts[f] -= PARTS.need;
  return addItem(s, fresh, `Assembled at ${FACTIONS[f].hub.name}: `);
}

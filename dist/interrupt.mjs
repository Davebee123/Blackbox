// The interrupt (docs/servers.md 3): one rule for every fight (R1: not only a server room's; a crew boss keeps its own
// framework, raid.mjs). Every part has two
// ticks, at 50% and 25% of its max Integrity. When damage takes a part across a tick on a cycle that part's move is
// due, its move this cycle is cancelled. Each tick works once a fight, whether or not anything was due.
//
//   what's cancelled  whatever the part does this cycle: its attack, a charge riding it, a cast or a seal landing on
//                     it, a Courier's delivery (families.mjs). A patch isn't a move.
//   after a cancel    its schedule goes on as if the move had landed: the next comes at its usual interval from now.
//   when it counts    anything that damages the part before attacks resolve: your command, daemons, burns, helpers,
//                     a spill. The hook sits where damage lands (combat.mjs hit, hooks.roomHit).
//   a wasted tick     crossed with nothing due: spent for nothing. One hit across both spends both and cancels one
//                     move at most. A part healed back over a spent tick doesn't re-arm it.
//   small parts       none: fragments (a Trojan's Packages and Droppers ride as fragments), the Spam Flood, and any
//                     part under TICKS.small Integrity at level 6 scale (a Mutex).
//   verbs             a body can do something else at its ticks (families.mjs VERBS): a Rig vents, a Loader delays
//                     the next delivery. Those work whenever they're crossed.
//
// Bosses (3.4) ship under three rules, switchable for the playtest (BOSS_RULES):
//   a  the boss's core part (its signature part, ♛) has phase ticks instead: crossing one starts its next phase. Its
//      other parts interrupt as usual, and its phases no longer follow its total Integrity.
//   b  every part interrupts; phases stay on total Integrity; it brings one more charge.
//   c  phases at 50% and 25% of total; ticks interrupt, but the fight has a budget of TICKS.budget cancels.
import { emit, alive, part, livingParts, hooks, previewDamage, ignoresArmor, toIntent, usable, readyIn, fxOn } from './combat.mjs';
import { FAMILIES, GUARDS, STRAINS, BOSSES, ROOM_FAMILIES, ABILITIES, TELL } from './data.mjs';
import { tellsOf, tellAnswer, tellNext, tierOf, inWindow, answers } from './tells.mjs';
import { raidDef } from './raid.mjs';
import { gainResearch } from './research.mjs';
import { daemonsOn } from './daemons.mjs';

export const TICKS = { at: [0.5, 0.25], small: 20, budget: 3 };
export const BOSS_RULES = {
  a: { name: 'Core ticks are phases', short: 'phases on its ♛ part', text: "The boss's core part (♛) has phase ticks at 50% and 25% instead of interrupts. Taking it across one starts the next phase. Its other parts interrupt as usual." },
  b: { name: 'Every part interrupts', short: 'every part interrupts', text: 'Every part has normal ticks. Phases stay on total Integrity, and the boss brings one more charge.' },
  c: { name: 'Phases plus a budget', short: `${TICKS.budget} interrupts a fight`, text: `Phases come at 50% and 25% of total Integrity. Ticks interrupt, but only ${TICKS.budget} times a fight, shown as pips on its bar.` },
};
const pct = (at) => (at === 0.5 ? 'half' : `${Math.round(at * 100)}%`);
// The fights the rule plays in: every one but a crew boss's (prepareTicks marks them as they start).
export const ticked = (e) => !!e?.ticked;
// As a fight is engaged (combat.mjs engage, before its tells are dealt): ticks on its parts, and a boss's rule (3.4: (a)
// by default, `developer bossrule a|b|c` switches it; a server room sets its own first, floorplan.mjs).
export function prepareTicks(s) {
  const e = s.encounter, v = e?.virus;
  if (!v || raidDef(v) || e.breach) return; // a crew boss keeps its framework; the breach build (R5 deletes it) its own rules
  e.ticked = true;
  armTicks(s);
  if (v.boss && !e.bossRule) bossRule(s, s.bossRule || 'a');
}

// ---------- which parts carry ticks ----------
// A part's Integrity at level 6 scale: its spec, wherever it was built from.
function specOf(v, p) {
  const id = String(p.id).replace(/\d+$/, '');
  const pools = [FAMILIES[v.family]?.parts, GUARDS[v.family]?.parts, ROOM_FAMILIES[v.family]?.parts, STRAINS[v.strain]?.parts, BOSSES[v.boss]?.extra];
  for (const xs of pools) { const x = (xs || []).find((q) => q.id === id || q.id === p.id); if (x) return x; }
  return null;
}
export const hasTicks = (v, p) => p.kind !== 'fragment' && !p.spam && !p.noTicks && (specOf(v, p)?.integrity ?? TICKS.small) >= TICKS.small;
const fresh = () => TICKS.at.map((at) => ({ at, spent: false }));
// Every part that carries ticks gets them; a part that joins later (a boss's spawn) gets them on its first hit.
export function armTicks(s) {
  const v = s.encounter.virus;
  for (const p of v.parts) if (!p.ticks && hasTicks(v, p)) p.ticks = fresh();
}
// The boss rule (BOSS_RULES): set up before the fight is engaged, so (b)'s extra charge is dealt with the rest.
export function bossRule(s, rule = 'a') {
  const e = s.encounter, v = e?.virus;
  if (!v?.boss) return;
  e.bossRule = BOSS_RULES[rule] ? rule : 'a';
  armTicks(s);
  if (e.bossRule === 'a') {
    const core = v.parts.find((p) => p.special) || v.parts[0];
    core.core = true;
    core.ticks = TICKS.at.map((at, i) => ({ at, spent: false, phase: i }));
    for (const ph of v.phases || []) ph.at = -1; // never by its total: the ticks start them
  } else if (e.bossRule === 'b') {
    if (v.boss === 'nb-deadbolt') v.tellSet = [...new Set([...(v.tellSet || []), 'deadbolt', 'extortion', 'overcharge', 'fulldisk'])];
    v.extraTells = TELL.boss.count + 1 - tierOf(v.level).count; // its set, and one more charge (a boss's count is at least TELL.boss.count)
  } else if (e.bossRule === 'c') {
    (v.phases || []).forEach((ph, i) => { ph.at = TICKS.at[i] ?? ph.at; });
    e.cutBudget = TICKS.budget;
  }
}

// ---------- the rule ----------
// What the part has due this cycle: its attack (a charge rides it), its delivery, a tell landing on it.
export function dueOf(s, p) {
  const e = s.encounter, out = [];
  if (!alive(p)) return out;
  if (p.attack && p.attack.due <= e.cycle && p.attack.due < 900) out.push({ kind: 'attack', name: p.attack.name });
  if (p.deliver && p.deliver.due <= e.cycle) out.push({ kind: 'deliver', name: 'Delivery' });
  // A tell on it: a cast compiling in its window (2 cycles), a seal or a Mimic's beat landing now (3.5). A charge rides
  // its attack, so cancelling the attack calls it off.
  for (const t of tellsOf(s)?.list || []) if (t.told && t.part === p.id && t.kind !== 'charge' && (t.kind === 'cast' ? inWindow(s, t) : tellNext(s, t) === e.cycle)) out.push({ kind: 'tell', name: t.name, t });
  return out;
}
// The next tick a part would cross, and the damage that takes it there (none: no tick left, or it can't be cut now).
export function nextTick(p) { return (p.ticks || []).find((t) => !t.spent) || null; }
export const toCross = (p, t = nextTick(p)) => (t ? Math.max(1, p.integrity - Math.floor(t.at * p.max)) : null);
// Damage landed on a part (combat.mjs hit, hooks.roomHit): the ticks it crossed, and what they do.
export function onHit(s, p, was, dealt) {
  const e = s.encounter, v = e?.virus;
  if (!ticked(e) || dealt <= 0) return;
  if (!p.ticks && hasTicks(v, p)) p.ticks = fresh();
  if (!p.ticks) return;
  const crossed = p.ticks.filter((t) => !t.spent && was > t.at * p.max && p.integrity <= t.at * p.max);
  if (!crossed.length) return;
  for (const t of crossed) t.spent = true;
  e.metrics.ticks = (e.metrics.ticks || 0) + crossed.length;
  if (p.integrity <= 0) return; // it broke: everything it did stops with it
  const verb = hooks.tickVerb?.(s, p) || 'cancel';
  // (a) a boss's core part: each tick starts a phase, at the end of this cycle.
  if (p.core) {
    for (const t of crossed) {
      const ph = v.phases?.[t.phase];
      if (ph && !ph.done) ph.at = 2;
      emit(s, 'cut', `You take ${v.name}'s ${p.name} under ${pct(t.at)}. Its next phase starts.`, { target: p.id, tick: t.at, phase: true });
    }
    return;
  }
  if (verb !== 'cancel') { for (const t of crossed) hooks.tickDo?.(s, p, verb, t); return; }
  const due = dueOf(s, p);
  if (!due.length) { for (const t of crossed) wasted(s, p, t, 'with nothing due'); return; }
  if (e.cutBudget != null && e.cutBudget <= 0) { for (const t of crossed) wasted(s, p, t, `but ${v.name}'s interrupt budget is spent`); return; }
  cancel(s, p, due, crossed[0]);
  for (const t of crossed.slice(1)) wasted(s, p, t, 'in the same hit');
}
function wasted(s, p, t, why) {
  const e = s.encounter;
  e.metrics.wasted = (e.metrics.wasted || 0) + 1;
  emit(s, 'tick-wasted', `The ${p.name} crosses ${pct(t.at)} ${why}. That tick is spent.`, { target: p.id, tick: t.at, wasted: true });
}
// The attack due now is cancelled (a cut, or SIGINT on a charge riding it: tells.mjs tellSigint). Its schedule goes on
// as if it had landed.
export function cancelAttack(s, p) {
  const e = s.encounter, a = p.attack;
  a.due = a.tap ? Math.max(e.cycle + 1, a.volley + a.interval) : e.cycle + a.interval; // a volley cut mid-way: the rest of it goes too
  a.tap = 0; a.volley = null;
  a.n = (a.n || 0) + 1;
  if (a.windup) a.wound = 0;
}
// Cancel what the part has due now. Its schedule goes on as if it had landed.
function cancel(s, p, due, t) {
  const e = s.encounter, names = [];
  if (e.cutBudget != null) e.cutBudget--;
  for (const d of due) {
    if (d.kind === 'attack') {
      const a = p.attack;
      // A charge riding this attack is answered by the cancel (tells.mjs): it rests as if called off.
      const charge = (tellsOf(s)?.list || []).find((x) => x.told && x.kind === 'charge' && x.part === p.id && x.n === (a.n || 0));
      if (charge) { tellAnswer(s, charge, p, `Cut: ${charge.name.toUpperCase()} called off.`, { stagger: false }); names.push(charge.name); }
      else names.push(a.name);
      cancelAttack(s, p);
    } else if (d.kind === 'deliver') { p.deliver.due = e.cycle + p.deliver.interval; names.push('delivery'); }
    else if (d.kind === 'tell') { tellAnswer(s, d.t, p, `You cut the ${p.name} on its cycle: ${d.t.name.toUpperCase()} is stopped.`, { stagger: false }); names.push(d.t.name); }
  }
  e.metrics.cuts = (e.metrics.cuts || 0) + 1;
  p.cutAt = e.cycle;
  // Double Tap (gear: tell-hits): a move you cut leaves its part Open, +50% from everyone for 2 cycles.
  if (fxOn(s, 'tell-hits') && alive(p)) p.openUntil = Math.max(p.openUntil || 0, e.cycle + TELL.open.cycles - 1);
  const what = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)} are` : `${names[0]} is`;
  emit(s, 'cut', `INTERRUPTED. You take the ${p.name} under ${pct(t.at)}. Its ${what} cancelled.${e.cutBudget != null ? ` ${e.cutBudget} of ${TICKS.budget} interrupts left this fight.` : ''}`, { target: p.id, tick: t.at, cut: true });
  gainResearch(s, e.virus, p, 'cut'); // +1 research on the part you cut (research.mjs; a crewmate's cut is theirs)
  daemonsOn(s, 'cut', { part: p.id }); // Breakpoint, Guillotine
}

// ---------- reading it ----------
// Every part with a move due now and a tick to cross: what crossing takes (the board's Now column, docs/servers.md 3.3).
// Returns [{ part, need, armor, verb }]; need null when no tick is left.
export function cutsNow(s) {
  const e = s.encounter;
  if (!ticked(e)) return [];
  return livingParts(s).filter((p) => p.ticks && dueOf(s, p).length && !p.core).map((p) => ({ part: p.id, need: toCross(p), armor: p.armor || 0, budget: e.cutBudget }));
}
// What a command would do to a part's ticks: 'cut' (crosses one on a cycle it has something due), 'waste', 'both'
// (two at once, one wasted), or null.
export function crossBy(s, id, p) {
  if (!ticked(s.encounter) || !p?.ticks || !alive(p)) return null;
  if (p.armor > 0 && !ignoresArmor(s, id)) return null;
  const dmg = previewDamage(s, id, p), left = p.ticks.filter((t) => !t.spent && p.integrity - dmg <= t.at * p.max && p.integrity - dmg > 0);
  if (!left.length) return null;
  const due = dueOf(s, p).length > 0;
  return left.length > 1 ? (due ? 'both' : 'waste') : due ? 'cut' : 'waste';
}

// ---------- the bots (planner.mjs) ----------
// A part due now with a tick you can reach with one command: cross it, and only the one (a big hit that crosses both
// wastes one). Burn classes' ticks count too, so a part already doomed to cross by its burns is left to them.
const CUTTERS = ['spike', 'zero-day', 'retaliate', 'opening', 'segfault', 'overload', 'flood', 'shatter', 'backdoor', 'reclaim', 'rate-limit', 'reject', 'checksum', 'hot-loop', 'backstab', 'fingerprint', 'side-channel', 'unmask', 'nohup', 'sniff', 'jam', 'echo-cancel', 'revoke', 'throttle', 'hook', 'tag', 'chain-reaction', 'exploit', 'inject', 'deploy', 'spawn', 'thermal-runaway', 'purge', 'detonate'];
const ok = (s, text) => !toIntent(s, text).error;
// A part whose cut answers a tell now (a charge riding the attack due, a cast in its window, a beat or a seal landing)
// goes first, for a bot that reads tells; then the biggest attack due.
const telling = (s, p) => answers() && (dueOf(s, p).some((d) => d.kind === 'tell') || (tellsOf(s)?.list || []).some((t) => t.told && t.kind === 'charge' && t.part === p.id && p.attack && t.n === (p.attack.n || 0) && p.attack.due <= s.encounter.cycle));
export function interruptMove(s, plan = null) {
  const e = s.encounter;
  if (!ticked(e)) return null;
  const targets = livingParts(s).filter((p) => p.ticks && !p.core && nextTick(p) && dueOf(s, p).length);
  const rank = (p) => (telling(s, p) ? 1e6 : 0) + (p.attack?.amount || 0);
  for (const p of targets.sort((a, b) => rank(b) - rank(a))) {
    const t = nextTick(p), need = toCross(p, t), second = p.ticks.find((x) => x !== t && !x.spent);
    const room = second ? p.integrity - Math.floor(second.at * p.max) : p.integrity; // more than this crosses the second too (or breaks it)
    // The plan already does it (or breaks the part, which stops the move too).
    if (plan && plan.endsWith(' ' + p.id)) { const id = plan.split(' ')[0]; const d = ABILITIES[id] && (!(p.armor > 0) || ignoresArmor(s, id)) ? previewDamage(s, id, p) : 0; if (d >= need) return null; }
    // On ◆ only a hit through armor crosses (3.2: strip first, or pierce).
    const fits = CUTTERS.filter((id) => usable(s).includes(id) && readyIn(s, id) === 0 && ABILITIES[id]?.damage && (!(p.armor > 0) || ignoresArmor(s, id)) && ok(s, `${id} ${p.id}`)).map((id) => ({ id, d: previewDamage(s, id, p) })).filter((x) => x.d >= need);
    if (!fits.length) continue;
    // The smallest that crosses one tick, else the one that breaks it outright, else any.
    const one = fits.filter((x) => x.d < room).sort((a, b) => a.d - b.d)[0] || fits.filter((x) => x.d >= p.integrity).sort((a, b) => a.d - b.d)[0] || fits.sort((a, b) => a.d - b.d)[0];
    return `${one.id} ${p.id}`;
  }
  return null;
}
// Keep a tick for a tell (docs/servers.md 3.5): a plan that would cross a part's tick on a quiet cycle while a told
// charge (or a cast) on it lands in the next 3 cycles goes at another part instead.
export function saveTick(s, plan) {
  const e = s.encounter;
  if (!ticked(e) || !plan || !answers()) return null;
  const [id, target] = plan.split(' '), p = target && part(s, target);
  if (!p?.ticks || !ABILITIES[id] || crossBy(s, id, p) !== 'waste' || previewDamage(s, id, p) >= p.integrity) return null;
  const coming = (tellsOf(s)?.list || []).find((t) => t.told && ['charge', 'cast'].includes(t.kind) && t.part === p.id && tellNext(s, t) - e.cycle >= 1 && tellNext(s, t) - e.cycle <= 3);
  if (!coming) return null;
  // Never onto a part that is best broken last (a Tripwire, a Zip Bomb) or set off by a hit (a Hotspot).
  const other = livingParts(s).find((q) => q !== p && !q.deadman && !q.fuse && !q.hotspot && ok(s, `${id} ${q.id}`) && crossBy(s, id, q) !== 'waste');
  return other ? `${id} ${other.id}` : null;
}
export const ticksOn = (p) => (p?.ticks || []).map((t) => ({ at: t.at, spent: t.spent, phase: t.phase != null }));

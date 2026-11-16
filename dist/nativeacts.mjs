// Floor 2's lair bosses in acts (docs/solo-bosses.md "The act-bars redesign", session 3): each act's own rule, a flag on
// the virus set by its phase verb (combat.mjs bossPhases), so the next act's refill takes it away (acts.mjs barsTurn).
//
//   DEADBOLT       act 2 Tumblers: a Deadbolt that lands locks the Encryptor again at full. Act 3 Double lock: a
//                  second Mutex in the Pulse Node's seat (seat:pulse).
//   BACK ORIFICE   act 2 Round robin: one part is open, moving every 3 cycles; the rest take half. Act 3: a Mirror in
//                  the Pulse Node's seat, the twins rebooting each other twice (combat.mjs bossPhases 'twice').
//   PATCH TUESDAY  act 2 Out of band: a part that crosses a tick is patched at once. Act 3 Hotfix: the last part you
//                  break comes back once at 25%.
//   SLEEPWALKER    dormant at each act's start (acts.mjs barsTurn). Act 2 REM: one part dozes (its attack waits) and
//                  takes double damage; a hit on it wakes it and sounds the Alarm. Act 3 Night Terror: the dozer
//                  charges instead of waiting; a hit wakes it, sounds the Alarm and calls the charge off.
//   MIRRORSHADE    act 2 Doppelganger (combat.mjs). Act 3 Shatter: the Mimic's beat plays your hit back as three
//                  shards, a third each (tells.mjs mimicLands).
import { emit, alive, part, livingParts, strikeWith } from './combat.mjs';
import { tellsOf, forceCharge, callOff } from './tells.mjs';
import { TICKS } from './interrupt.mjs';

export const NATIVE = {
  robin: { every: 3, shut: 0.5 }, // Round robin: the open part moves every 3 cycles; a shut part takes half
  hotfix: 0.25, // Hotfix: the last part broken comes back at a quarter of its max
  rem: { every: 4, taken: 2 }, // REM: a part dozes every 4 cycles; a dozer takes double
  shards: 3, // Shatter
};
export const NATIVE_VERBS = new Set(['tumblers', 'robin', 'outofband', 'hotfix', 'rem', 'terror', 'shatter']);

const sys = (s) => livingParts(s).filter((x) => x.kind === 'system');

// A phase's verb (combat.mjs bossPhases), as the act begins.
export function nativeVerb(s, act) {
  const e = s.encounter, v = e.virus;
  if (act === 'tumblers') v.tumblers = true;
  if (act === 'robin') { const p = sys(s)[0]; v.robin = { open: p?.id || null, next: e.cycle + 1 + NATIVE.robin.every }; }
  if (act === 'outofband') v.oob = true;
  if (act === 'hotfix') v.hotfix = true;
  if (act === 'rem' || act === 'terror') v.rem = { part: null, next: null, until: null, terror: act === 'terror' };
  if (act === 'shatter') v.shatter = true;
}

// ---------- DEADBOLT ----------
// A charge landed (tells.mjs tellLand): Tumblers relocks every part a Mutex holds.
export function nativeCharge(s, t) {
  const v = s.encounter.virus;
  if (!v.tumblers || t.id !== 'deadbolt') return;
  for (const p of livingParts(s).filter((x) => x.lockMax && x.lockHp < x.lockMax && livingParts(s).some((m) => m.lock === x.id))) {
    p.lockHp = p.lockMax; p.lockAt = null;
    emit(s, 'patch', `TUMBLERS. The ${t.name} lands, and the Mutex locks the ${p.name} again with a ${p.lockMax} shield.`, { target: p.id, lock: true, tumblers: true });
  }
}

// ---------- BACK ORIFICE ----------
export const robinOpen = (s) => { const k = s.encounter?.virus?.robin; return k ? part(s, k.open) : null; };
export const robinIn = (s) => { const k = s.encounter?.virus?.robin; return k ? Math.max(0, k.next - s.encounter.cycle) : null; };
// The cycle's end: the port moves on its rhythm, or at once from a part that broke.
function robinCycle(s) {
  const e = s.encounter, k = e.virus.robin, xs = sys(s);
  if (!k || !xs.length) return;
  const open = part(s, k.open);
  if (alive(open) && e.cycle + 1 < k.next) return;
  const all = e.virus.parts, from = open ? all.indexOf(open) : -1;
  const to = xs.find((x) => all.indexOf(x) > from) || xs[0];
  k.open = to.id; k.next = e.cycle + 1 + NATIVE.robin.every;
  if (to !== open) emit(s, 'status', `ROUND ROBIN. The ${to.name} is open for ${NATIVE.robin.every} cycles. The other parts take half.`, { target: to.id, robin: true });
}

// ---------- PATCH TUESDAY ----------
const patcher = (s) => livingParts(s).find((x) => x.attack?.effect === 'heal') || null;
// A hit crossed a tick on a part that still stands (interrupt.mjs onHit): Out of band patches it at once, once a hit.
export function oobCrossed(s, p, crossed) {
  const v = s.encounter.virus, h = v.oob && crossed.length && alive(p) ? patcher(s) : null;
  if (!h) return;
  const got = Math.min(h.attack.amount, p.max - p.integrity);
  if (got <= 0) return;
  p.integrity += got;
  emit(s, 'heal', `OUT OF BAND. The ${h.name} patches the ${p.name} at once for ${got}.`, { source: h.id, target: p.id, amount: got, oob: true });
}
// A part broke (combat.mjs breakPart): with nothing else standing, Hotfix brings it back at a quarter, once an act.
export function hotfixBroke(s, p) {
  const v = s.encounter.virus;
  if (v.hotfix !== true || p.kind === 'fragment' || livingParts(s).length) return;
  v.hotfix = 'done';
  p.integrity = Math.max(1, Math.round(p.max * NATIVE.hotfix));
  p.ticks = TICKS.at.map((at) => ({ at, spent: p.integrity <= at * p.max }));
  emit(s, 'patch', `HOTFIX. The ${p.name} comes back at ${p.integrity}/${p.max}.`, { target: p.id, hotfix: true });
}

// ---------- SLEEPWALKER ----------
export const dozer = (s) => { const r = s.encounter?.virus?.rem; return r?.part ? part(s, r.part) : null; };
const alarmOf = (s) => livingParts(s).find((x) => x.attack?.alarm) || null;
function doze(s, p) {
  const e = s.encounter, r = e.virus.rem;
  r.part = p.id; r.until = e.cycle + 1 + NATIVE.rem.every;
  if (r.terror) {
    const t = forceCharge(s, p, 'Night Terror', 'terror', 1, 2, NATIVE.rem.every);
    emit(s, 'warning', `NIGHT TERROR. The ${p.name} dozes and charges. A hit wakes it and sounds the Alarm.`, { target: p.id, doze: true });
    if (!t) r.until = e.cycle + 2; // nothing to charge: it dozes one cycle
    return;
  }
  if (p.attack && p.attack.due < 900) { p.dozeDue = p.attack.due; p.attack.due = 999; }
  emit(s, 'status', `REM. The ${p.name} dozes. It takes double damage, and a hit on it sounds the Alarm.`, { target: p.id, doze: true });
}
function wake(s, p, hit) {
  const e = s.encounter, r = e.virus.rem;
  r.part = null;
  if (p.dozeDue != null) { if (p.attack) p.attack.due = Math.max(e.cycle + 1, p.dozeDue); delete p.dozeDue; }
  const t = tellsOf(s)?.list.find((x) => x.id === 'terror' && x.told);
  if (!hit) return;
  r.woke = { part: p.id, at: e.cycle }; // the hit that woke it, and the rest of the cycle's, still take double
  if (alarmOf(s)) r.alarm = true;
  if (t) callOff(s, t, `You wake the ${p.name}, and its Night Terror is called off.`);
  emit(s, 'warning', `You wake the ${p.name}.${r.alarm ? ' The Alarm sounds.' : ''}`, { target: p.id, wake: true });
}
// Your hit on a part (combat.mjs hit): a dozer wakes.
export function remHit(s, p, base, opts) {
  const r = s.encounter.virus.rem;
  if (r?.part === p.id && base > 0 && !opts.server) wake(s, p, true);
}
// The virus's half (combat.mjs endCycle, after the Backlash): an Alarm a wake sounded lands. True if the fight ended.
export function nativeLand(s) {
  const r = s.encounter.virus.rem, c = r?.alarm && alarmOf(s);
  if (!r?.alarm) return false;
  r.alarm = false;
  return !!c && strikeWith(s, c, { ...c.attack, name: 'Alarm', interval: 99, noCrit: true });
}
function remCycle(s) {
  const e = s.encounter, v = e.virus, r = v.rem;
  if (!r || v.dormant) return;
  const d = dozer(s);
  if (r.part && !alive(d)) r.part = null;
  if (d && alive(d)) {
    const charging = r.terror && tellsOf(s)?.list.some((x) => x.id === 'terror' && x.part === d.id && !x.gone);
    if (charging || e.cycle + 1 < r.until) return;
    wake(s, d, false);
  }
  if (r.next == null) r.next = e.cycle + 1;
  if (e.cycle + 1 < r.next) return;
  const xs = sys(s), last = r.last;
  const to = xs.filter((x) => xs.length < 2 || x.id !== last).sort((a, b) => b.integrity / b.max - a.integrity / a.max)[0];
  if (!to) return;
  r.last = to.id; r.next = e.cycle + 1 + NATIVE.rem.every;
  doze(s, to);
}

// ---------- the board's numbers ----------
// What a part takes from every hit (combat.mjs damageMultiplier): half on a shut port, double on a dozer.
export function nativeTaken(s, p) {
  const e = s.encounter, v = e.virus;
  let m = 1;
  if (v.robin && p.kind === 'system' && p.id !== v.robin.open) m *= NATIVE.robin.shut;
  if (v.rem && (v.rem.part === p.id || (v.rem.woke?.part === p.id && v.rem.woke.at === e.cycle))) m *= NATIVE.rem.taken;
  return m;
}
// The cycle's end (combat.mjs bossPhases, after the act's verbs).
export function nativeCycle(s) {
  const v = s.encounter.virus;
  if (v.robin) robinCycle(s);
  if (v.rem) remCycle(s);
}

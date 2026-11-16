// The hubs' chase protocols (gear.mjs ZERO_DAYS, chase: true; sold on each hub's chase line, factions.mjs CHASE). Halcyon's
// four (Deductible, Subrogation, Actuarial Model, Total Loss) run in combat.mjs; the other factions' twelve run here, on the
// class hooks (combat.mjs classHooks, ahead of the faction implicits so Carrier Wave can shelter Clean Signal):
//   intake     a hit about to come off your health: Shell Company halves it, Failover stops it at 25%
//   struck     a hit that dealt damage: Golden Parachute; Carrier Wave marks Clean Signal kept (faction-gear.mjs)
//   critDealt  Black Budget, above 75% health
//   dealt      Crescendo, on a skill repeated in a row
//   hit        Escrow banks a break's overflow and pays it on your next hit; Numbers Station at full Clean Signal
//   broke      Cold Aisle arms
//   used       Refrain halves a repeat's cooldown; the repeat count Crescendo reads
//   cycleEnd   Dead Air (no attack reached you this cycle) and Cold Aisle tick your cooldowns one extra cycle
// Round (Chorus's second hit lands on another part too) is in faction-gear.mjs, beside Chorus.
import { emit, zeroDay, defender, livingParts, alive, hit, heal } from './combat.mjs';
import { cleanStacks } from './faction-gear.mjs';

export const CHASE_FX = { failover: 0.25, shell: 0.75, budget: 0.75, budgetCrit: 1.5, parachute: [0.25, 0.5], cold: 2, crescendo: 0.15, crescendoMax: 4, clean: 3 };
const has = (s, id) => (s.encounter ? zeroDay(s, id) : null);
const stOf = (s) => ((s.encounter.fxs ||= {}).chase ||= { once: {}, bank: 0, cold: 0, last: null, streak: 0 });
const chip = (it) => ({ gear: [{ id: it.id, name: it.name }] });
// Cooldowns still running past next cycle tick one more (Clock Speed's tick).
function tick(s, it, why) {
  const e = s.encounter, cooling = Object.keys(e.readyAt || {}).filter((k) => e.readyAt[k] > e.cycle + 1);
  for (const k of cooling) e.readyAt[k] -= 1;
  if (cooling.length) emit(s, 'status', `${it.name}: ${why}`, { mark: 'buff', quiet: true, ...chip(it) });
}

export const CHASE_HOOKS = {
  start(s) { if (s.encounter) (s.encounter.fxs ||= {}).chase = { once: {}, bank: 0, cold: 0, last: null, streak: 0 }; },
  intake(s, d, amount) {
    if (!(amount > 0)) return amount;
    const st = stOf(s);
    const sc = has(s, 'shell-company');
    if (sc && !st.once.shell && d.integrity - amount < d.max * CHASE_FX.shell) {
      st.once.shell = true;
      amount = Math.max(1, Math.round(amount / 2));
      emit(s, 'blocked', `${sc.name}: half of that hit is written off.`, { ...chip(sc) });
    }
    const fo = has(s, 'failover'), floor = Math.ceil(d.max * CHASE_FX.failover);
    if (fo && !st.once.failover && d.integrity >= floor && d.integrity - amount < floor) {
      st.once.failover = true;
      amount = d.integrity - floor;
      emit(s, 'blocked', `${fo.name}: the standby takes the rest. You hold at ${floor}.`, { ...chip(fo) });
    }
    return amount;
  },
  struck(s, atk, dealt) {
    if (!s.encounter || !dealt) return;
    const st = stOf(s), d = defender(s);
    const gp = has(s, 'golden-parachute'), [under, to] = CHASE_FX.parachute;
    if (gp && !st.once.parachute && d.integrity > 0 && d.integrity < d.max * under) {
      st.once.parachute = true;
      heal(s, Math.ceil(d.max * to) - d.integrity, gp.name, chip(gp));
    }
    const cw = has(s, 'carrier-wave'), imp = s.encounter.fxs?.imp;
    if (cw && !st.once.carrier && imp?.clean > 0) { st.once.carrier = true; imp.keep = true; }
  },
  critDealt(s, p, opts = {}) {
    if (!opts.mine || !has(s, 'black-budget')) return 1;
    const d = defender(s);
    return d.integrity > d.max * CHASE_FX.budget ? CHASE_FX.budgetCrit : 1;
  },
  dealt(s, p, opts = {}) {
    const e = s.encounter;
    if (!e || !opts.mine || opts.dot || opts.by || !e.commanding || !has(s, 'crescendo')) return 1;
    const st = stOf(s);
    return st.last === e.commanding.id ? 1 + CHASE_FX.crescendo * Math.min(CHASE_FX.crescendoMax, st.streak + 1) : 1;
  },
  hit(s, p, out, opts = {}) {
    const e = s.encounter;
    if (!e || !opts.mine || opts.by) return;
    const st = stOf(s);
    const es = has(s, 'escrow');
    if (es && st.bank > 0 && !opts.dot) {
      const to = alive(p) ? p : livingParts(s)[0], n = st.bank;
      st.bank = 0;
      if (to) hit(s, to, n, { mine: true, by: es.name, pierce: true, noHook: true });
    }
    if (es && out.broke && out.overflow > 0) {
      st.bank += out.overflow;
      emit(s, 'status', `${es.name}: ${out.overflow} held for your next hit.`, { mark: 'buff', ...chip(es) });
    }
    const ns = has(s, 'numbers-station');
    if (ns && !opts.dot && e.commanding && cleanStacks(s) >= CHASE_FX.clean && out.dealt > 0) {
      e.fxs.imp.clean = 0;
      const rest = livingParts(s).filter((x) => x !== p);
      if (rest.length) emit(s, 'status', `${ns.name}: the hit goes out to every part.`, { mark: 'buff', ...chip(ns) });
      for (const x of rest) if (alive(x)) hit(s, x, out.dealt, { mine: true, by: ns.name, noHook: true });
    }
  },
  broke(s) { if (s.encounter && has(s, 'cold-aisle')) stOf(s).cold = CHASE_FX.cold; },
  used(s, { id }) {
    const e = s.encounter;
    if (!e || !id) return;
    const st = stOf(s), same = st.last === id;
    st.streak = same ? st.streak + 1 : 0;
    st.last = id;
    const rf = same && has(s, 'refrain'), left = (e.readyAt?.[id] ?? 0) - e.cycle;
    if (rf && left > 1) { e.readyAt[id] = e.cycle + Math.ceil(left / 2); emit(s, 'status', `${rf.name}: the repeat cools in half the time.`, { mark: 'buff', quiet: true, ...chip(rf) }); }
  },
  cycleEnd(s) {
    const e = s.encounter;
    if (!e) return;
    const st = stOf(s);
    const da = has(s, 'dead-air');
    if (da && e.reached !== e.cycle) tick(s, da, 'nothing reached you. Your cooldowns tick one extra cycle.');
    const ca = st.cold > 0 && has(s, 'cold-aisle');
    if (ca) { st.cold--; tick(s, ca, 'your cooldowns tick one extra cycle.'); }
  },
};

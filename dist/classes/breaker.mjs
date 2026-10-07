// Breaker subclasses, the engine side: what the subclass skills, talents and edges do, and how
// the planner plays them. The data (skills, trees) is in ./breaker.data.mjs.
//
// Every hook is optional, and runs for every player in every fight: gate each one on the player's
// class or subclass (subOf, subEdge, hasTalent, rank). combat.mjs calls them (see CLASS_HOOKS there):
//   use[id](s, ctx)        after the generic part of a skill resolves. ctx: { a, id, target, to, res, base, intent, auto, e }
//                          (to: the ally an `ally: true` skill was aimed at, else s)
//   validate[id](s, intent) a reason the skill can't be used now, or null
//   start(s)               a fight starts (also for crewmates)
//   cycle(s)               the end of this player's turn each cycle (after burns and helpers)
//   dealt(s, p, opts)      a multiplier on damage this player deals to part p (opts.mine, opts.dot)
//   taken(s, atk, p)       a multiplier on an attack's damage to this player
//   crit(s, p, opts)       extra crit chance (percent) on a hit
//   cooldown(s, id, cd)    the cooldown to use instead of cd
//   hit(s, p, res, opts)   after a hit lands (res.dealt, res.crit, res.broke)
//   broke(s, p)            this player broke part p
//   struck(s, atk, dealt, p) an attack landed on this player
//   plan(s, t)             a command for the planner (bots, crewmates, balance scripts), or null to fall through
//
// State: fight state this module keeps lives on the encounter under bk* names, created when first
// needed (a crewmate's encounter is a copy of the leader's at engage, so nothing is made at start).
// Part state (Bit Rot, Exposed Wiring) lives on the shared parts and remembers whose it is.
import { subOf, subEdge, hasTalent, rank, emit, hit, rand, part, alive, livingParts, attackers, soonestAttacker, on, buffed, openProc, scaled, powerOf, defender, momentumStacks, classOf, missChance, patchDelay, toIntent, readyIn, damageMultiplier, gearStat, edge, previewDamage, ignoresArmor, usable } from '../combat.mjs';
import { ABILITIES, SKILLS, EDGE } from '../data.mjs';
import { subs } from './breaker.data.mjs';

const A = (id) => ABILITIES[id];
const who = (s) => s.who || '';
const breaker = (s) => classOf(s) === 'breaker';
const isDemo = (s) => breaker(s) && subOf(s) === 'demolitionist';
const isOC = (s) => breaker(s) && subOf(s) === 'overclocker';

// ---------- Momentum (Redline lets it stack to 5) ----------
// combat.mjs keeps e.momentum = { stacks, until } and caps a break at SKILLS.momentumMax. This module
// mirrors what it sets in e.bkMomentum, so a break can stack past 3 under Redline.
const redline = (s) => subEdge(s, 'overclocker');
export const momentumCap = (s) => (redline(s) ? subs.overclocker.edge.max : SKILLS.momentumMax);
const lasts = (s, cycles) => cycles + rank(s, 'heat-spreader');
function setMomentum(s, stacks, until) {
  const e = s.encounter;
  e.momentum = stacks > 0 ? { stacks, until } : null;
  e.bkMomentum = e.momentum ? { ...e.momentum } : null;
}
// Add stacks (a break, Feedback Loop, Turbo Boost), refreshing the timer.
function addMomentum(s, n, cycles = SKILLS.momentumCycles) {
  const e = s.encounter;
  const cur = momentumStacks(s);
  setMomentum(s, Math.min(momentumCap(s), cur + n), Math.max(e.momentum?.until ?? 0, e.cycle + lasts(s, cycles)));
}

// ---------- shared helpers ----------
// A damaging skill whose damage this module deals: it can miss like any other (combat.mjs useAbility
// rolls only for skills with a base damage). The cooldown is spent either way.
function missed(s, ctx) {
  const e = s.encounter;
  if (!(missChance(s) > 0 && rand(s) * 100 < missChance(s))) return false;
  e.metrics.misses++;
  emit(s, 'miss', `${ctx.a.name} MISSES${ctx.target ? ' ' + ctx.target.name : ''}.`, { target: ctx.target?.id, ability: ctx.id });
  return true;
}
// Signal (Integrity at home) a skill costs. Never your last point.
const costOf = (s, id) => { const n = A(id).cost - 2 * rank(s, 'liquid-cooling'); return n > 0 ? scaled(s, n) : 0; };
function pay(s, id) {
  const d = defender(s), n = Math.min(costOf(s, id), d.integrity - 1);
  if (n <= 0) return;
  d.integrity -= n;
  emit(s, 'status', `${A(id).name} costs you ${n}. ${s.encounter.mode === 'run' ? 'Signal' : 'Server'} ${d.integrity}/${d.max}.`, { amount: n, ability: id });
}
const afford = (s, id) => (costOf(s, id) && defender(s).integrity <= costOf(s, id) ? `${A(id).name} costs ${costOf(s, id)} and you only have ${defender(s).integrity}.` : null);
// Break chits off a part outside a hit (Shaped Charge, Cluster Charge, Bit Rot). Lights Shatter when it's bare.
function strip(s, p, n, label) {
  const e = s.encounter;
  const k = Math.min(n, p.armor || 0);
  if (!k) return 0;
  p.armor -= k;
  p.lastDamaged = e.cycle;
  if (!p.armor) { p.patchAt = e.cycle + patchDelay(s) + (p.phase ? 1 : 0); openProc(s, 'stripped'); }
  emit(s, 'armor', `${label}: ${p.name} loses ${k} ◆${p.armor ? ` (${p.armor} left)` : `. Its armor is broken: it patches in ${patchDelay(s)} ${patchDelay(s) === 1 ? 'cycle' : 'cycles'}`}.`, { target: p.id, left: p.armor });
  return k;
}
const blastMult = (s) => 1 + 0.1 * rank(s, 'blast-radius');

// ---------- skills ----------
const use = {
  // Demolitionist
  'shaped-charge'(s, { a, id, target, e }) {
    if (target.armor > 0) {
      strip(s, target, target.armor, a.name);
      // The blast is loud: the part's attack comes sooner.
      if (a.provoke && target.attack && target.attack.due > e.cycle) { target.attack.due = Math.max(e.cycle, target.attack.due - a.provoke); emit(s, 'status', `${target.name} is provoked, so its ${target.attack.name} comes ${a.provoke === 1 ? 'a cycle' : a.provoke + ' cycles'} sooner.`, { target: target.id }); }
    } else if (!missed(s, { a, id, target })) { hit(s, target, a.bareHit * powerOf(s), { mine: true }); e.lastAttack = `spike ${target.id}`; }
    // Cluster Charge: the blast takes 2 ◆ off every other part too.
    if (hasTalent(s, 'cluster-charge')) for (const p of livingParts(s)) if (p !== target && p.armor > 0) strip(s, p, 2, 'Cluster Charge');
  },
  'logic-bomb'(s, { a, target, e }) {
    (e.bkBombs ||= []).push({ target: target.id, at: e.cycle + a.fuse, who: who(s) });
    emit(s, 'status', `Logic Bomb planted in ${target.name}. It goes off in ${a.fuse} cycles.`, { target: target.id, mark: 'burn', ability: 'logic-bomb' });
  },
  'chain-reaction'(s, { a, e }) {
    e.buffs['chain-reaction'] = e.cycle + a.cycles - 1;
    emit(s, 'status', `Chain Reaction is running for ${a.cycles} cycles. Every part you break hits the rest for ${scaled(s, a.blast)}.`, { mark: 'buff', ability: 'chain-reaction' });
  },
  'bit-rot'(s, { a, target, e }) {
    target.bkRot = { until: e.cycle + a.cycles - 1, who: who(s) };
    emit(s, 'status', `${target.name} is rotting for ${a.cycles} cycles. It loses a ◆ each cycle and can't patch.`, { target: target.id, mark: 'debuff', ability: 'bit-rot' });
  },
  'thermal-runaway'(s, { target, e }) {
    const burn = e.burns.filter((b) => b.id === 'thermal-runaway' && b.target === target.id).at(-1);
    if (!burn) return;
    // Deep Burn: +2 a tick per rank.
    if (rank(s, 'deep-burn')) burn.damage += scaled(s, 2 * rank(s, 'deep-burn'));
    // Meltdown: the same burn on every other part, at half.
    if (hasTalent(s, 'meltdown')) {
      const others = livingParts(s).filter((p) => p !== target);
      for (const p of others) e.burns.push({ ...burn, target: p.id, damage: Math.max(1, Math.round(burn.damage / 2)), grow: Math.round((burn.grow || 0) / 2) });
      if (others.length) emit(s, 'status', `Meltdown sets ${others.map((p) => p.name).join(' and ')} burning too, at half strength.`, { mark: 'burn', ability: 'thermal-runaway' });
    }
  },
  // Overclocker
  overvolt(s, { a, e }) {
    pay(s, 'overvolt');
    e.buffs.overvolt = e.cycle + a.cycles;
    emit(s, 'status', `Overvolted. Your next Overload in the next ${a.cycles} cycles hits twice.`, { mark: 'buff', ability: 'overvolt' });
  },
  overload(s, { target, base, e }) {
    if (!buffed(e, 'overvolt')) return;
    delete e.buffs.overvolt;
    if (!alive(target)) return;
    const r = hit(s, target, base, { mine: true, by: 'Overvolt', chits: 2 });
    if (r.crit) { delete e.readyAt.overload; emit(s, 'proc', 'Overload crit: ready again.', { ability: 'overload' }); }
  },
  'thermal-throttle'(s, { a, id, target, e }) {
    if (missed(s, { a, id, target })) return;
    const stacks = momentumStacks(s);
    const keep = hasTalent(s, 'burn-in') ? Math.floor(stacks / 2) : 0;
    setMomentum(s, keep, e.momentum?.until ?? e.cycle);
    if (stacks) emit(s, 'status', `Thermal Throttle spends ${stacks - keep} Momentum ${stacks - keep === 1 ? 'stack' : 'stacks'}${keep ? ` (${keep} kept)` : ''}.`, { ability: id });
    hit(s, target, (a.base + a.perStack * stacks) * powerOf(s), { mine: true, pierce: stacks >= (a.pierceAt || 1) });
    e.lastAttack = `spike ${target.id}`;
  },
  'stack-smash'(s, { a, target, res, base }) {
    let r = res;
    for (let k = 0; k < a.repeats && r?.crit && alive(target); k++) r = hit(s, target, base, { mine: true, by: 'Stack Smash' });
  },
  'turbo-boost'(s, { a, e }) {
    pay(s, 'turbo-boost');
    addMomentum(s, a.gain, a.cycles);
    emit(s, 'status', `Turbo Boost gives you ${momentumStacks(s)} Momentum ${momentumStacks(s) === 1 ? 'stack' : 'stacks'} for ${e.momentum.until - e.cycle} cycles.`, { mark: 'buff', ability: 'turbo-boost' });
  },
};

const validate = {
  overvolt: (s) => afford(s, 'overvolt'),
  'thermal-throttle': (s) => (momentumStacks(s) ? null : 'Thermal Throttle needs Momentum. Break a part first.'),
  'turbo-boost': (s) => afford(s, 'turbo-boost') || (momentumStacks(s) >= momentumCap(s) ? 'Your Momentum is already full.' : null),
  'bit-rot': (s, intent) => { const p = part(s, intent.target); return p && !p.armor && !p.maxArmor ? `${p.name} has no armor to rot.` : null; },
};

// ---------- the rest of the hooks ----------
// A Logic Bomb goes off: the part it was planted in (or the next one, if that broke), then the rest.
function detonate(s, bomb) {
  const a = A('logic-bomb');
  const t = alive(part(s, bomb.target)) ? part(s, bomb.target) : soonestAttacker(s);
  if (!t) return;
  emit(s, 'status', `Logic Bomb goes off in ${t.name}.`, { target: t.id, ability: 'logic-bomb' });
  const rest = livingParts(s).filter((p) => p !== t);
  hit(s, t, a.bomb * powerOf(s), { mine: true, by: 'Logic Bomb', chits: 2 });
  for (const p of rest) if (alive(p)) hit(s, p, a.blast * powerOf(s), { mine: true, by: 'Logic Bomb' });
}

function cycle(s) {
  if (!breaker(s)) return;
  const e = s.encounter;
  // Logic Bombs whose fuse ran out.
  if (e.bkBombs?.length) {
    const due = e.bkBombs.filter((b) => b.at <= e.cycle && b.who === who(s));
    e.bkBombs = e.bkBombs.filter((b) => !due.includes(b));
    for (const b of due) if (livingParts(s).length) detonate(s, b);
  }
  for (const p of livingParts(s)) {
    // Bit Rot: a ◆ a cycle, and no patching while it lasts.
    const rot = p.bkRot;
    if (rot && rot.who === who(s) && rot.until >= e.cycle) {
      if (p.armor > 0) strip(s, p, 1, 'Bit Rot');
      if (!p.armor && p.patchAt != null) p.patchAt = Math.max(p.patchAt, rot.until + 1);
    }
    // Exposed Wiring: a part that loses its last ◆ is Exposed for your next 2 cycles.
    if (p.maxArmor > 0 && p.armor > 0) delete p.bkBare;
    else if (p.maxArmor > 0 && !p.armor && hasTalent(s, 'exposed-wiring') && !p.bkBare) {
      p.bkBare = true;
      p.exposedUntil = Math.max(p.exposedUntil || 0, e.cycle + 2);
      emit(s, 'status', `Exposed Wiring leaves ${p.name} Exposed for 2 cycles.`, { target: p.id, mark: 'exposed' });
    }
    // Scorched Earth: nothing patches back.
    if (hasTalent(s, 'scorched-earth') && !p.armor && p.patchAt != null) p.patchAt = null;
  }
}

function dealt(s, p, opts) {
  if (!opts.mine || opts.dot || !breaker(s)) return 1;
  const e = s.encounter;
  let m = 1;
  // Blast Radius: the spread hits.
  if (['Fork Bomb', 'Logic Bomb', 'Chain Reaction'].includes(opts.by)) m *= blastMult(s);
  // Shrapnel: Shatter.
  if (!opts.by && e.lastSkill === 'shatter') m *= 1 + 0.08 * rank(s, 'shrapnel');
  // Core Voltage: Segfault and Stack Smash (its repeats too).
  if ((!opts.by && ['segfault', 'stack-smash'].includes(e.lastSkill)) || opts.by === 'Stack Smash') m *= 1 + 0.08 * rank(s, 'core-voltage');
  return m;
}

// Redline: 10% more damage taken while you have Momentum.
const taken = (s) => (redline(s) && momentumStacks(s) > 0 ? subs.overclocker.edge.taken : 1);

// Critical Heat: with 4 or more stacks, every hit you land crits.
const crit = (s, p, opts) => (opts.mine && hasTalent(s, 'critical-heat') && momentumStacks(s) >= 4 ? 100 : 0);

function onHit(s, p, res, opts) {
  if (!breaker(s)) return;
  const e = s.encounter;
  // combat.mjs's own Overkill spill (not `mine`): remember where it went, for Total Overkill below.
  if (opts.by === 'Overkill') { e.bkSpilled = p.id; return; }
  if (!opts.mine) return;
  // Feedback Loop: every crit you land adds a stack.
  if (res.crit && res.dealt > 0 && !opts.dot && hasTalent(s, 'feedback-loop')) addMomentum(s, 1);
  // Total Overkill: the spill goes onto every other part, not just the one combat.mjs picked.
  if (res.broke && !opts.overkill && res.overflow > 0 && hasTalent(s, 'total-overkill') && edge(s, 'breaker')) {
    const spill = Math.min(EDGE.breaker.cap, res.overflow), skip = e.bkSpilled;
    for (const x of livingParts(s)) if (x.id !== skip && alive(x)) hit(s, x, spill, { by: 'Overkill', overkill: true, pierce: true, noHook: true });
  }
  if (!opts.overkill) e.bkSpilled = null;
}

function broke(s, p) {
  if (!breaker(s)) return;
  const e = s.encounter;
  // Redline (and Heat Spreader): the break's stack goes past 3, and lasts longer per rank.
  if (p.kind !== 'fragment') {
    const prev = e.bkMomentum && e.bkMomentum.until >= e.cycle ? e.bkMomentum.stacks : 0;
    const was = e.momentum?.stacks || 0;
    setMomentum(s, Math.min(momentumCap(s), Math.max(was, prev + 1)), e.cycle + lasts(s, SKILLS.momentumCycles));
  }
  // Chain Reaction: the break blows up into every other part.
  if (buffed(e, 'chain-reaction')) {
    const rest = livingParts(s).filter((x) => x !== p);
    if (rest.length) emit(s, 'status', `${p.name} blows up in a Chain Reaction.`, { target: p.id, ability: 'chain-reaction' });
    for (const x of rest) if (alive(x)) hit(s, x, A('chain-reaction').blast * powerOf(s), { mine: true, by: 'Chain Reaction' });
  }
}

// ---------- the planner ----------
const ok = (s, text) => !toIntent(s, text).error;
const bare = (p) => alive(p) && !p.armor;
// Damage a hit of `base` (before your power) would do to p now, with your multipliers.
const estimate = (s, p, base) => Math.floor((base * powerOf(s) + gearStat(s, 'damage')) * damageMultiplier(s, p, { mine: true }));
const HITS = ['zero-day', 'shatter', 'segfault', 'overload', 'flood', 'stack-smash', 'spike'];
// Can the generic planner break p this cycle with a plain hit? Then let it.
const killable = (s, p) => HITS.some((id) => ok(s, id + ' ' + p.id) && (bare(p) || ignoresArmor(s, id)) && previewDamage(s, id, p) >= p.integrity);
const dueNow = (s) => attackers(s).filter((p) => p.attack.due <= s.encounter.cycle);
// Thermal Throttle's hit: the stacks it spends add to its base, and no longer to your multiplier.
function ttDamage(s, p) {
  const e = s.encounter, a = A('thermal-throttle'), st = momentumStacks(s), keep = hasTalent(s, 'burn-in') ? Math.floor(st / 2) : 0;
  const saved = e.momentum;
  e.momentum = keep ? { stacks: keep, until: saved.until } : null;
  const m = damageMultiplier(s, p, { mine: true });
  e.momentum = saved;
  return Math.floor(((a.base + a.perStack * st) * powerOf(s) + gearStat(s, 'damage')) * m);
}
const healthy = (s, share) => defender(s).integrity > defender(s).max * share;

function planDemo(s, t) {
  const e = s.encounter;
  const others = livingParts(s).filter((p) => p !== t);
  // Something about to fire, a lit Shatter on a bare part, or a kill: the generic rules handle those.
  if (dueNow(s).length || livingParts(s).some((p) => bare(p) && killable(s, p)) || killable(s, t) || (bare(t) && ok(s, 'shatter ' + t.id))) return null;
  const armorElsewhere = others.reduce((n, p) => n + (p.armor || 0), 0);
  // Strip: Shaped Charge on a thick shell, or when Crack is cooling (Cluster Charge: when the rest wear armor too).
  const calm = (p) => !p.attack || p.attack.due - e.cycle >= 2; // provoked, its attack still lands after your next command
  if (calm(t) && (t.armor >= 4 || (t.armor >= 2 && (!ok(s, 'crack ' + t.id) || (hasTalent(s, 'cluster-charge') && armorElsewhere >= 2))))) {
    if (ok(s, 'shaped-charge ' + t.id)) return 'shaped-charge ' + t.id;
  }
  // Bit Rot: armor that patches back, when the quick strips are cooling.
  if (t.maxArmor >= 2 && t.armor >= 1 && !(t.bkRot?.until >= e.cycle) && !ok(s, 'crack ' + t.id) && !ok(s, 'shaped-charge ' + t.id) && ok(s, 'bit-rot ' + t.id)) return 'bit-rot ' + t.id;
  // Chain Reaction: worth a turn with three or more parts up.
  if (livingParts(s).length >= 3 && ok(s, 'chain-reaction')) return 'chain-reaction';
  // Logic Bomb: a big part with its armor gone (or nearly), or several parts to catch in the blast.
  if ((t.armor || 0) <= 1 && (t.integrity >= estimate(s, t, A('logic-bomb').bomb) || others.length >= 2) && ok(s, 'logic-bomb ' + t.id)) return 'logic-bomb ' + t.id;
  // A part stripped bare: Shaped Charge hits it for 30 when nothing bigger is ready.
  if (bare(t) && !['overload', 'flood', 'segfault'].some((id) => ok(s, id + ' ' + t.id)) && ok(s, 'shaped-charge ' + t.id) && t.integrity > estimate(s, t, 25)) return 'shaped-charge ' + t.id;
  return null;
}

function planOC(s, t) {
  const e = s.encounter, st = momentumStacks(s), due = dueNow(s);
  const tt = (p) => st >= 1 && ok(s, 'thermal-throttle ' + p.id);
  // A Thermal Throttle that breaks a part about to fire, or the target, armor or not: take it.
  const through = st >= (A('thermal-throttle').pierceAt || 1);
  for (const p of [...due, t]) if (tt(p) && (bare(p) || through) && ttDamage(s, p) >= p.integrity && !killable(s, p)) return 'thermal-throttle ' + p.id;
  if (due.length || killable(s, t) || livingParts(s).some((p) => bare(p) && killable(s, p))) return null;
  // Spend the stacks: through armor once there are enough, or on a bare part when it beats your other hits.
  const fading = e.momentum && e.momentum.until <= e.cycle;
  const best = Math.max(0, ...['overload', 'flood', 'segfault', 'stack-smash'].filter((id) => ok(s, id + ' ' + t.id)).map((id) => previewDamage(s, id, t)));
  if (tt(t) && !bare(t) && through) return 'thermal-throttle ' + t.id;
  if (tt(t) && bare(t) && (st >= 2 || fading) && ttDamage(s, t) >= best) return 'thermal-throttle ' + t.id;
  // Turbo Boost ahead of a Thermal Throttle on a big part.
  const big = t.integrity >= estimate(s, t, A('thermal-throttle').base + A('thermal-throttle').perStack * (st + A('turbo-boost').gain)) * 0.7;
  if (st < 2 && usable(s).includes('thermal-throttle') && readyIn(s, 'thermal-throttle') <= 1 && big && healthy(s, 0.5) && ok(s, 'turbo-boost')) return 'turbo-boost';
  if (!bare(t)) return null;
  // An Overload with Overvolt on it; Overvolt when Overload is ready and the part will take both hits.
  if (buffed(e, 'overvolt') && ok(s, 'overload ' + t.id)) return 'overload ' + t.id;
  if (readyIn(s, 'overload') <= 1 && t.integrity > previewDamage(s, 'overload', t) * 1.3 && healthy(s, 0.4) && ok(s, 'overvolt')) return 'overvolt';
  // Stack Smash when its crits are likely, or when nothing bigger is ready.
  const likely = buffed(e, 'sudo') || on(s, t, 'exposed') || (hasTalent(s, 'critical-heat') && st >= 4);
  if (ok(s, 'stack-smash ' + t.id) && (likely || !['overload', 'flood', 'segfault'].some((id) => ok(s, id + ' ' + t.id)))) return 'stack-smash ' + t.id;
  return null;
}

function plan(s, t) {
  if (!t || !s.encounter) return null;
  if (isDemo(s)) return planDemo(s, t);
  if (isOC(s)) return planOC(s, t);
  return null;
}

export default { use, validate, cycle, dealt, taken, crit, hit: onHit, broke, plan };

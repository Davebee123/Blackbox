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
import { subOf, subEdge, hasTalent, rank, emit, hit, rand, part, alive, livingParts, attackers, soonestAttacker, on, buffed, openProc, scaled, powerOf, defender, momentumStacks, classOf, missChance, patchDelay, toIntent, readyIn, damageMultiplier, gearStat, edge, previewDamage, ignoresArmor, usable, stripMark, mirrorOn, intents, heal, healScaled } from '../combat.mjs';
import { ABILITIES, SKILLS, EDGE } from '../data.mjs';
import { tellHit, tellOn, tellAnswer, chargeSize } from '../tells.mjs';
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
  if (label !== 'Bit Rot') tellHit(s, p, { chits: k }); // a command's strip hits it: a tell on it may count it (tells.mjs)
  if (!p.armor) { p.patchAt = e.cycle + patchDelay(s) + (p.phase ? 1 : 0); if (label !== 'Bit Rot') stripMark(s, p); openProc(s, 'stripped', { part: p.id }); }
  chipped(s, p, k); // Debris Field
  emit(s, 'armor', `${label}: ${p.name} loses ${k} ◆${p.armor ? ` (${p.armor} left)` : `. Its armor is broken, and it patches in ${patchDelay(s)} ${patchDelay(s) === 1 ? 'cycle' : 'cycles'}`}.`, { target: p.id, left: p.armor });
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
  // Chain Reaction: the part is wired to blow if it breaks within its cycles (broke, below).
  'chain-reaction'(s, { a, target, e }) {
    if (!alive(target)) return;
    target.bkChain = { until: e.cycle + a.cycles - 1, who: who(s) };
    emit(s, 'status', `${target.name} is wired to blow. If it breaks in the next ${a.cycles} cycles, it hits every other part for ${scaled(s, a.blast)}.`, { target: target.id, mark: 'debuff', ability: 'chain-reaction' });
  },
  // Bit Rot: any part rots and takes more from you; one that wears armor also loses a ◆ a cycle and can't patch.
  'bit-rot'(s, { a, target, e }) {
    if (!alive(target)) return;
    target.bkRot = { until: e.cycle + a.cycles - 1, who: who(s) };
    const shell = target.armor > 0 || target.maxArmor > 0;
    emit(s, 'status', `${target.name} is rotting for ${a.cycles} cycles. It takes ${Math.round(a.more * 100)}% more damage from you${shell ? ', loses a ◆ each cycle and cannot patch' : ''}.`, { target: target.id, mark: 'debuff', ability: 'bit-rot' });
  },
  // Fork Bomb: a strip on every armored part and a hit on every bare one (fragments three times over). The part whose
  // attack lands soonest goes last, so a Shatter it lights is on that one.
  'fork-bomb'(s, { a, id, e }) {
    if (missed(s, { a, id })) return;
    const order = [...livingParts(s)].sort((x, y) => (y.attack?.due ?? 99) - (x.attack?.due ?? 99));
    for (const p of order) {
      if (!alive(p)) continue;
      if (p.armor > 0) strip(s, p, a.strip, a.name);
      else hit(s, p, a.bareHit * powerOf(s) * (p.kind === 'fragment' ? a.fragx : 1), { mine: true, by: a.name });
    }
    e.lastAttack = null;
  },
  // Shatter: its shards hit every other bare part.
  shatter(s, { a, target }) {
    for (const p of livingParts(s)) if (p !== target && !(p.armor > 0)) hit(s, p, a.shards * powerOf(s), { mine: true, by: 'Shatter shards' });
  },
  'debris-field'(s, { a, e }) {
    e.buffs['debris-field'] = e.cycle + a.cycles - 1;
    e.bkDebris = 0;
    emit(s, 'status', `Debris Field for ${a.cycles} cycles. Every ◆ you break shields you for ${scaled(s, a.per)}, up to ${scaled(s, a.most)}.`, { mark: 'buff', ability: 'debris-field' });
  },
  // Backfire: a charge winding up on it goes off inside it, and the attack lands plain (a read, tells.mjs).
  // (The charge was read before its hit landed: validate below. The hit may have called it off already.)
  backfire(s, { a, target, e }) {
    const snap = e.bkBackfire;
    e.bkBackfire = null;
    if (!alive(target) || !snap || snap.target !== target.id || snap.cycle !== e.cycle) return;
    const extra = Math.min(scaled(s, a.cap), Math.max(scaled(s, 15), Math.round(snap.extra)));
    const msg = `BACKFIRE: ${snap.t.name.toUpperCase()} goes off inside the ${target.name}. Its ${target.attack?.name || 'attack'} lands plain.`;
    if (snap.t.told) tellAnswer(s, snap.t, target, msg); else emit(s, 'blocked', msg, { source: target.id, ability: 'backfire' });
    hit(s, target, extra, { mine: true, pierce: true, by: 'Backfire' });
  },
  'rm-rf'(s, { a, e }) {
    e.buffs['rm-rf'] = e.cycle + a.cycles - 1;
    emit(s, 'status', `rm -rf for ${a.cycles} cycles. Every hit you land also hits every other part for half damage.`, { mark: 'buff', ability: 'rm-rf' });
  },
  'thermal-runaway'(s, { target, e }) {
    const burn = e.burns.filter((b) => b.id === 'thermal-runaway' && b.target === target.id).at(-1);
    if (!burn) return;
    burn.who = who(s);
    // Deep Burn: +2 a tick per rank.
    if (rank(s, 'deep-burn')) burn.damage += scaled(s, 2 * rank(s, 'deep-burn'));
    // Meltdown: the same burn on every other part, at half.
    if (hasTalent(s, 'meltdown')) {
      const others = livingParts(s).filter((p) => p !== target);
      for (const p of others) e.burns.push({ ...burn, target: p.id, damage: Math.max(1, Math.round(burn.damage / 2)), grow: Math.round((burn.grow || 0) / 2) });
      if (others.length) emit(s, 'status', `Meltdown sets ${others.map((p) => p.name).join(' and ')} burning too, for half damage.`, { mark: 'burn', ability: 'thermal-runaway' });
    }
  },
  // Overclocker
  // Overvolt: two hits in one command, and each counts against a tell on the part (tells.mjs).
  overvolt(s, { a, id, target, e }) {
    pay(s, 'overvolt');
    if (e.commanding) e.commanding.counts = a.hits;
    for (let k = 0; k < a.hits && alive(target); k++) { if (missed(s, { a, id, target })) continue; hit(s, target, a.hit * powerOf(s), { mine: true }); }
    e.lastAttack = `spike ${target.id}`;
  },
  'thermal-throttle'(s, { a, id, target, e }) {
    if (missed(s, { a, id, target })) return;
    const stacks = momentumStacks(s);
    const keep = hasTalent(s, 'burn-in') ? Math.floor(stacks / 2) : 0;
    setMomentum(s, keep, e.momentum?.until ?? e.cycle);
    if (stacks) emit(s, 'status', `Thermal Throttle spends ${stacks - keep} Momentum ${stacks - keep === 1 ? 'stack' : 'stacks'}${keep ? ` (${keep} kept)` : ''}.`, { ability: id });
    hit(s, target, (a.base + a.perStack * stacks) * powerOf(s), { mine: true, pierce: stacks >= (a.pierceAt || 1), unlock: stacks >= (a.pierceAt || 1) });
    e.lastAttack = `spike ${target.id}`;
  },
  'stack-smash'(s, { a, target, res, base }) {
    let r = res;
    const exposed = target.exposedUntil >= s.encounter.cycle; // Exposed: the second hit comes for sure
    for (let k = 0; k < a.repeats && (r?.crit || (k === 0 && exposed)) && alive(target); k++) r = hit(s, target, base, { mine: true, by: 'Stack Smash' });
  },
  'hot-loop'(s, { a }) { addMomentum(s, 1, a.cycles); },
  vent(s, { a, e }) {
    const stacks = momentumStacks(s), d = defender(s);
    setMomentum(s, 0, e.cycle);
    const cleared = [];
    if (e.encrypt > 0 || e.burst) { e.encrypt = 0; e.burst = null; cleared.push('encryption'); }
    if (e.corrupt) { e.corrupt = null; cleared.push('Corrupted'); }
    if (e.scrambleUntil >= e.cycle) { e.scrambleUntil = 0; cleared.push('Scrambled'); }
    emit(s, 'status', `Vent: ${stacks ? `${stacks} Momentum ${stacks === 1 ? 'stack' : 'stacks'} dumped` : 'nothing to dump'}${cleared.length ? `, and ${cleared.join(' and ')} cleared` : ''}.`, { ability: 'vent' });
    heal(s, healScaled(s, a.heal * Math.max(1, stacks)), 'Vent');
    if (d.integrity > d.max) d.integrity = d.max;
  },
  'fault-injection'(s, { a, target, e }) {
    if (!alive(target)) return;
    target.bkFault = { until: e.cycle + a.cycles - 1, who: who(s) };
    emit(s, 'status', `Fault Injection: every hit you land on the ${target.name} is a critical strike for ${a.cycles} cycles.`, { target: target.id, mark: 'debuff', ability: 'fault-injection' });
  },
  'turbo-boost'(s, { a, e }) {
    const low = defender(s).integrity < defender(s).max / 2; // run it hot when you're hurt: free, and one more stack
    if (!low) pay(s, 'turbo-boost');
    addMomentum(s, a.gain + (low ? 1 : 0), a.cycles);
    emit(s, 'status', `Turbo Boost gives you ${momentumStacks(s)} Momentum ${momentumStacks(s) === 1 ? 'stack' : 'stacks'} for ${e.momentum.until - e.cycle} cycles.`, { mark: 'buff', ability: 'turbo-boost' });
  },
};

const validate = {
  // Backfire reads the charge before its own hit lands (that hit may call the charge off).
  backfire: (s, intent) => {
    const p = part(s, intent.target), ch = p && chargeSize(s, p);
    s.encounter.bkBackfire = ch && p.attack && ch.t.n === (p.attack.n || 0) ? { target: p.id, cycle: s.encounter.cycle, t: ch.t, extra: ch.amount - (p.attack.effect === 'damage' ? p.attack.amount : p.attack.hit || 0) } : null;
    return null;
  },
  overvolt: (s) => afford(s, 'overvolt'),
  'turbo-boost': (s) => (defender(s).integrity < defender(s).max / 2 ? null : afford(s, 'turbo-boost')) || (momentumStacks(s) >= momentumCap(s) ? 'Your Momentum is already full.' : null),
  'thermal-throttle': (s) => (momentumStacks(s) ? null : 'Thermal Throttle needs Momentum. Break a part first.'),
};

// ---------- the rest of the hooks ----------
// A Logic Bomb goes off: the part it was planted in (or the next one, if that broke), then the rest.
function detonate(s, bomb) {
  const a = A('logic-bomb');
  const t = alive(part(s, bomb.target)) ? part(s, bomb.target) : soonestAttacker(s);
  if (!t) return;
  emit(s, 'status', `Logic Bomb goes off in ${t.name}.`, { target: t.id, ability: 'logic-bomb' });
  const rest = livingParts(s).filter((p) => p !== t);
  // What the bomb breaks goes down for good: no twin reboots it, a Tripwire stays quiet (combat.mjs breakPart).
  const clean = (p, n, opts) => { p.quiet = true; hit(s, p, n, opts); if (alive(p)) delete p.quiet; };
  clean(t, a.bomb * powerOf(s), { mine: true, by: 'Logic Bomb', chits: 2 });
  for (const p of rest) if (alive(p)) clean(p, a.blast * powerOf(s), { mine: true, by: 'Logic Bomb' });
}

function cycle(s) {
  if (!breaker(s)) return;
  const e = s.encounter;
  // Thermal Runaway: each tick on a part compiling a cast counts as a hit on it (tells.mjs), once a cycle.
  for (const b of e.burns.filter((x) => x.id === 'thermal-runaway' && x.who === who(s))) {
    const p = part(s, b.target);
    if (alive(p) && tellOn(s, p, 'cast')) tellHit(s, p, { cmd: { id: 'thermal-runaway', target: p.id, at: e.cycle }, key: `tr:${e.cycle}:${who(s)}` });
  }
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
  if (!opts.mine || !breaker(s)) return 1;
  const e = s.encounter;
  // Bit Rot: a rotting part takes more from you, burns included.
  const rot = p.bkRot && p.bkRot.who === who(s) && p.bkRot.until >= e.cycle ? 1 + A('bit-rot').more : 1;
  if (opts.dot) return rot;
  let m = rot;
  // Blast Radius: the spread hits.
  if (['Fork Bomb', 'Logic Bomb', 'Chain Reaction'].includes(opts.by)) m *= blastMult(s);
  // Shrapnel: Shatter.
  if (!opts.by && e.lastSkill === 'shatter') m *= 1 + 0.08 * rank(s, 'shrapnel');
  // Core Voltage: Segfault and Stack Smash (its repeats too).
  if ((!opts.by && ['segfault', 'stack-smash'].includes(e.lastSkill)) || opts.by === 'Stack Smash') m *= 1 + 0.08 * rank(s, 'core-voltage');
  return m;
}

// Redline: 10% more damage taken while you have Momentum. Brace: 30% less, and what it saved goes back (struck).
const taken = (s) => (redline(s) && momentumStacks(s) > 0 ? subs.overclocker.edge.taken : 1) * (breaker(s) && buffed(s.encounter, 'brace') ? 1 - A('brace').cut : 1);
function struck(s, atk, dealt, p) {
  if (!breaker(s) || !buffed(s.encounter, 'brace') || !alive(p) || !(dealt > 0)) return;
  const a = A('brace'), saved = Math.round((dealt * a.cut) / (1 - a.cut));
  if (saved > 0) hit(s, p, saved * a.back, { mine: true, by: 'Brace' });
}

// Critical Heat: with 4 or more stacks, every hit you land crits. Fault Injection: every hit you land on its part.
const crit = (s, p, opts) => (opts.mine && ((hasTalent(s, 'critical-heat') && momentumStacks(s) >= 4) || (p.bkFault?.who === who(s) && p.bkFault.until >= s.encounter.cycle && breaker(s))) ? 100 : 0);
// Debris Field: every ◆ you break while it runs shields you, up to its most.
function chipped(s, p, n) {
  const e = s.encounter;
  if (!breaker(s) || !buffed(e, 'debris-field') || !(n > 0)) return;
  const a = A('debris-field'), room = scaled(s, a.most) - (e.bkDebris || 0), add = Math.min(room, n * scaled(s, a.per));
  if (add <= 0) return;
  e.bkDebris = (e.bkDebris || 0) + add;
  e.shield = (e.shield || 0) + add;
  emit(s, 'status', `Debris Field: +${add} shield (${e.shield}).`, { mark: 'shield', ability: 'debris-field' });
}

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
  // rm -rf: every hit you land also lands on every other part for half (not its own spill, not burns).
  if (buffed(e, 'rm-rf') && res.dealt > 0 && !opts.dot && !opts.rmrf && opts.by !== 'Overkill') {
    const half = Math.max(1, Math.round(res.dealt * A('rm-rf').share));
    for (const x of livingParts(s)) if (x !== p && alive(x)) hit(s, x, half, { mine: true, by: 'rm -rf', rmrf: true, noHook: true });
  }
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
  // Chain Reaction: a part wired to blow (or broken by a blast) blows up into every other part.
  if ((p.bkChain?.who === who(s) && p.bkChain.until >= e.cycle) || e.bkBlasting) {
    delete p.bkChain;
    const rest = livingParts(s).filter((x) => x !== p);
    if (rest.length) emit(s, 'status', `${p.name} blows up in a Chain Reaction.`, { target: p.id, ability: 'chain-reaction' });
    const was = e.bkBlasting;
    e.bkBlasting = true; // a part the blast breaks blows up too
    try { for (const x of rest) if (alive(x)) hit(s, x, A('chain-reaction').blast * powerOf(s), { mine: true, by: 'Chain Reaction' }); } finally { e.bkBlasting = was; }
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

// A charge riding the next attack of a part, landing within `lag` cycles: Backfire blows it up inside it.
const charging = (s, lag = 2) => livingParts(s).find((p) => { const ch = tellOn(s, p, 'charge'); return ch && p.attack && ch.n === (p.attack.n || 0) && p.attack.due - s.encounter.cycle <= lag; });
// What lands on you this cycle and next, by size.
const incoming = (s, within = 0) => intents(s).filter((i) => i.col <= within && !i.hidden && (i.effect === 'damage' || i.hit)).reduce((n, i) => n + (i.hit || i.amount || 0), 0);
// What one Fork Bomb is worth now: its hit on every bare part (fragments three times over, no more than each has
// left), and a ◆ off every armored one, counted as a small hit.
function forkValue(s) {
  const a = A('fork-bomb');
  return livingParts(s).reduce((n, p) => n + (p.armor > 0 ? (Math.min(p.armor, a.strip) * estimate(s, p, 25)) / 3 : Math.min(p.integrity, estimate(s, p, a.bareHit * (p.kind === 'fragment' ? a.fragx : 1)))), 0);
}
// ◆ one Fork Bomb breaks now, over every armored part.
const forkChits = (s) => livingParts(s).reduce((n, p) => n + Math.min(p.armor || 0, A('fork-bomb').strip), 0);
function planDemo(s, t) {
  const e = s.encounter, d = defender(s), living = livingParts(s);
  const calm0 = (p) => !A('shaped-charge').provoke || !p.attack || p.attack.due - e.cycle >= 2;
  // A charge winding up: Backfire blows it up inside its part (armor or not), and the attack lands plain.
  const ch = charging(s, 1);
  if (ch && !living.some((p) => bare(p) && killable(s, p)) && ok(s, 'backfire ' + ch.id)) return 'backfire ' + ch.id; // a kill first
  // Fragments up: Fork Bomb takes them (three times over) and hits everything else on the way.
  if (living.some((p) => p.kind === 'fragment') && living.length >= 3 && ok(s, 'fork-bomb')) return 'fork-bomb';
  // Chain Reaction on a fragment or a part one hit from breaking, with two or more others to catch the blast.
  // (fragments up: the weakest one; otherwise a part its own 30 breaks now, so the blast goes off this cycle)
  const fragsUp = living.filter((p) => p.kind === 'fragment');
  const fuse = (fragsUp.length >= 2 ? fragsUp : living.filter((p) => p.integrity <= estimate(s, p, 30))).filter((p) => !(p.armor > 0)).sort((a, b) => a.integrity - b.integrity)[0];
  const litOn = e.procs?.stripped?.until >= e.cycle && alive(part(s, e.procs.stripped.part)) && ok(s, 'shatter ' + e.procs.stripped.part); // a lit Shatter is spent first
  if (fuse && living.length >= 3 && !litOn && !dueNow(s).length && !living.some((p) => p.deadman) && ok(s, 'chain-reaction ' + fuse.id)) return 'chain-reaction ' + fuse.id; // never into a Tripwire
  // Debris Field before a big strip, with an attack a cycle or two out for the shield to soak.
  const armorAll = living.reduce((n, p) => n + (p.armor || 0), 0);
  if (armorAll >= 3 && !dueNow(s).length && incoming(s, 2) >= d.max * 0.08 && (ok(s, 'crack ' + t.id) || ok(s, 'shaped-charge ' + t.id)) && ok(s, 'debris-field')) return 'debris-field';
  // Bit Rot on a part about to seal that wears ◆ more than Crack takes: the seal fails outright, ◆ or not.
  const seal = livingParts(s).find((p) => tellOn(s, p, 'seal') && p.armor >= 2 && !(p.bkRot?.until >= e.cycle) && !(p.armor <= 3 && ok(s, 'crack ' + p.id)));
  if (seal && ok(s, 'bit-rot ' + seal.id)) return 'bit-rot ' + seal.id;
  const others = livingParts(s).filter((p) => p !== t);
  // The general uses (no kill to take first). Chain Reaction breaks the last ◆ or two off a part and wires it, so the
  // Shatter that follows sets off the blast on every other part (on a bare part it is a big hit that does the same).
  // Bit Rot opens on a thick shell, or strips while Crack cools: two ◆ now and one a cycle, so a ◆3 part is bare for
  // Shatter next cycle, and it takes more from you while it rots.
  const killFirst = livingParts(s).some((p) => bare(p) && killable(s, p)) || killable(s, t) || dueNow(s).length || litOn;
  const wire = living.length >= 2 && !t.deadman && !living.some((p) => p.deadman) && (bare(t) ? !ok(s, 'shatter ' + t.id) && t.integrity > estimate(s, t, 30) : t.armor <= A('chain-reaction').chits);
  if (!killFirst && wire && ok(s, 'chain-reaction ' + t.id)) return 'chain-reaction ' + t.id;
  if (!killFirst && !(t.bkRot?.until >= e.cycle) && (t.armor >= 4 || (t.armor >= 2 && !ok(s, 'crack ' + t.id) && !(t.armor >= 4 && calm0(t) && ok(s, 'shaped-charge ' + t.id)))) && ok(s, 'bit-rot ' + t.id)) return 'bit-rot ' + t.id;
  // Something about to fire, a lit Shatter on a bare part, or a kill: the generic rules handle those.
  if (dueNow(s).length || livingParts(s).some((p) => bare(p) && killable(s, p)) || killable(s, t) || (bare(t) && ok(s, 'shatter ' + t.id))) return null;
  // rm -rf before the big hits on a bare part, with the rest of the virus standing to catch half.
  const rest = living.filter((p) => p !== t && !p.deadman).reduce((n, p) => n + p.integrity, 0);
  if (bare(t) && living.length >= 2 && rest >= estimate(s, t, 50) && t.integrity > estimate(s, t, 40) && ['shatter', 'flood', 'overload'].some((id) => ok(s, id + ' ' + t.id)) && !living.some((p) => p.deadman) && ok(s, 'rm-rf')) return 'rm-rf';
  const armorElsewhere = others.reduce((n, p) => n + (p.armor || 0), 0);
  // Strip: Shaped Charge on a thick shell, or when Crack is cooling (Cluster Charge: when the rest wear armor too).
  const calm = (p) => !A('shaped-charge').provoke || !p.attack || p.attack.due - e.cycle >= 2; // provoked (if it provokes), its attack still lands after your next command
  if (calm(t) && (t.armor >= 4 || (t.armor >= 2 && (!ok(s, 'crack ' + t.id) || (hasTalent(s, 'cluster-charge') && armorElsewhere >= 2))))) {
    if (ok(s, 'shaped-charge ' + t.id)) return 'shaped-charge ' + t.id;
  }
  // Bit Rot: armor that patches back, when the quick strips are cooling.
  if (t.maxArmor >= 2 && t.armor >= 1 && !(t.bkRot?.until >= e.cycle) && !ok(s, 'crack ' + t.id) && !ok(s, 'shaped-charge ' + t.id) && ok(s, 'bit-rot ' + t.id)) return 'bit-rot ' + t.id;
  // Fork Bomb: fragments up (it breaks them three times over).
  const frags = livingParts(s).filter((p) => p.kind === 'fragment');
  if (frags.length >= 2 && ok(s, 'fork-bomb')) return 'fork-bomb';
  // Thermal Runaway on a part compiling a cast, when SIGINT won't be ready for it: its ticks stop the cast.
  const cast = livingParts(s).find((p) => tellOn(s, p, 'cast'));
  if (cast && (!usable(s).includes('sigint') || readyIn(s, 'sigint') > 1) && ok(s, 'thermal-runaway ' + cast.id)) return 'thermal-runaway ' + cast.id;
  // Chain Reaction: two parts low enough to set each other off, or fragments to catch.
  const low = livingParts(s).filter((p) => p.integrity <= p.max * 0.35).length;
  if ((low >= 2 || (frags.length >= 2 && livingParts(s).length >= 3)) && ok(s, 'chain-reaction')) return 'chain-reaction';
  // Logic Bomb: twins (both go down for good), a Tripwire with one other part left (it goes quietly), or simply a
  // burst on a part that will still stand in two cycles, with another part to catch the blast.
  const twin = livingParts(s).find((p) => p.twin && alive(part(s, p.twin)));
  const trip = livingParts(s).find((p) => p.deadman) && livingParts(s).filter((p) => p.kind === 'system').length <= 2;
  const lasts = t.integrity >= estimate(s, t, 110) && living.length >= 3 && !t.deadman && !(t.armor > 0 && ok(s, 'crack ' + t.id));
  if ((twin || trip || lasts) && ok(s, 'logic-bomb ' + t.id)) return 'logic-bomb ' + t.id;

  // The general uses of the area kit: Bit Rot on a part that will take a while (everything you land on it hits
  // harder), Chain Reaction as a big hit with others standing to catch the blast, Fork Bomb when every part
  // together takes more than one hit on the target.
  const bestHit = Math.max(0, ...['overload', 'flood', 'segfault', 'chain-reaction'].filter((id) => ok(s, id + ' ' + t.id)).map((id) => previewDamage(s, id, t)));
  // Fork Bomb: a Crack on every part at once. Press it when it breaks more than Crack would and still bares the
  // target (so Shatter follows), or when its hit on the bare parts beats one hit on the target.
  const forkBares = !(t.armor > A('fork-bomb').strip) || !ok(s, 'crack ' + t.id);
  if (living.length >= 2 && ok(s, 'fork-bomb') && ((forkBares && forkChits(s) > Math.min(t.armor || 0, A('crack').strip) + 1) || (living.filter(bare).length >= 2 && forkValue(s) >= Math.max(bestHit, estimate(s, t, 25))))) return 'fork-bomb';

  // A part stripped bare: Shaped Charge hits it for 30 when nothing bigger is ready.
  if (bare(t) && !['overload', 'flood', 'segfault'].some((id) => ok(s, id + ' ' + t.id)) && ok(s, 'shaped-charge ' + t.id) && t.integrity > estimate(s, t, 25)) return 'shaped-charge ' + t.id;
  return null;
}

function planOC(s, t) {
  const e = s.encounter, st = momentumStacks(s), due = dueNow(s), d = defender(s);
  // Vent the heat: Corrupted, encryption or a scramble on you, or low with stacks to turn into Signal.
  const dirty = e.corrupt || e.encrypt >= 6 || e.burst || e.scrambleUntil >= e.cycle;
  if ((dirty && st >= 1) || (dirty && !healthy(s, 0.5)) || (!healthy(s, 0.35) && st >= 2)) { if (ok(s, 'vent')) return 'vent'; }
  if (livingParts(s).some((p) => (bare(p) || p === t) && killable(s, p))) return null; // a kill first
  // Fault Injection on a big part, with the big hits ready to land on it.
  const ready = ['segfault', 'overload', 'thermal-throttle', 'stack-smash', 'flood', 'hot-loop'].filter((id) => usable(s).includes(id) && readyIn(s, id) <= 1).length;
  if (t.integrity >= estimate(s, t, 90) && ready >= 2 && (bare(t) || st >= 2) && ok(s, 'fault-injection ' + t.id)) return 'fault-injection ' + t.id;
  // Segfault crashes a part mid-wind-up: three times the hit, and it calls the charge off.
  const charging = livingParts(s).find((p) => tellOn(s, p, 'charge') && !(p.armor > 0));
  if (charging && ok(s, 'segfault ' + charging.id)) return 'segfault ' + charging.id;
  // Stack Smash on an Exposed bare part: it hits twice for sure, and its crits keep going.
  const exposed = [t, ...livingParts(s)].find((p) => bare(p) && p.exposedUntil >= e.cycle && p.integrity > estimate(s, p, 30));
  if (exposed && ok(s, 'stack-smash ' + exposed.id)) return 'stack-smash ' + exposed.id;
  // Set it up: Exploit a big bare part when Stack Smash is ready for next cycle and nothing lands now.
  if (!due.length && bare(t) && usable(s).includes('stack-smash') && readyIn(s, 'stack-smash') <= 1 && !(t.exposedUntil >= e.cycle) && t.integrity > estimate(s, t, 90) && ok(s, 'exploit ' + t.id)) return 'exploit ' + t.id;
  // Overvolt: two hits in one command, a cast stopped (when SIGINT is cooling), or two ◆ off a part about to seal.
  const busy = livingParts(s).find((p) => (tellOn(s, p, 'cast') && (!usable(s).includes('sigint') || readyIn(s, 'sigint') > 0)) || (tellOn(s, p, 'seal') && p.armor === 2));
  if (busy && healthy(s, 0.3) && ok(s, 'overvolt ' + busy.id)) return 'overvolt ' + busy.id;
  // Brace: a charge landing now that nobody called off, or a big hit you can't stop.
  const now = intents(s).filter((i) => i.col === 0 && (i.effect === 'damage' || i.hit));
  const big = now.reduce((n, i) => n + (i.hit || i.amount), 0);
  if (now.some((i) => i.tell === 'charge' && (i.hit || i.amount) >= d.max * 0.15) && ok(s, 'brace')) return 'brace';
  // Sudo: a part whose rule is in your way (a lock or a ward on what you're bursting, a Tripwire about to go, a Decoy or Mimic beat),
  // or thick armor with Crack cooling: for two cycles every hit goes through.
  const rule = (t.lockHp > 0 && livingParts(s).some((p) => p.lock === t.id)) || livingParts(s).some((p) => p.ward === t.id) || (t.deadman && livingParts(s).filter((p) => p.kind === 'system').length > 1) || mirrorOn(s) || mirrorOn(s, e.cycle + 1);
  if ((rule || (t.armor >= 3 && !ok(s, 'crack ' + t.id))) && ok(s, 'sudo')) return 'sudo';
  // Turbo Boost when you're hurt: free stacks for a Thermal Throttle.
  if (!healthy(s, 0.5) && usable(s).includes('thermal-throttle') && readyIn(s, 'thermal-throttle') <= 1 && ok(s, 'turbo-boost')) return 'turbo-boost';
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
  if (!bare(t)) return null;
  // Hot Loop builds the heat Thermal Throttle spends: press it when Throttle is ready next and the stacks are short.
  if (st < 2 && usable(s).includes('thermal-throttle') && readyIn(s, 'thermal-throttle') <= 1 && ok(s, 'hot-loop ' + t.id) && t.integrity > estimate(s, t, 22)) return 'hot-loop ' + t.id;
  // Stack Smash wants Exposed (every crit hits again): Exploit first on a big bare part.
  if (usable(s).includes('stack-smash') && readyIn(s, 'stack-smash') <= 1 && !on(s, t, 'exposed') && t.integrity > estimate(s, t, 60) && ok(s, 'exploit ' + t.id)) return 'exploit ' + t.id;
  // Stack Smash when its crits are likely (Exposed, Critical Heat), or when nothing bigger is ready.
  const likely = on(s, t, 'exposed') || (hasTalent(s, 'critical-heat') && st >= 4);
  if (ok(s, 'stack-smash ' + t.id) && (likely || !['overload', 'flood', 'segfault'].some((id) => ok(s, id + ' ' + t.id)))) return 'stack-smash ' + t.id;
  return null;
}

function plan(s, t) {
  if (!t || !s.encounter) return null;
  if (isDemo(s)) return planDemo(s, t);
  if (isOC(s)) return planOC(s, t);
  return null;
}
// The cheap keys between the big ones (planner.mjs, before key 1).
function fill(s, t) {
  if (!breaker(s) || !t) return [];
  if (isDemo(s)) return ['backfire ' + t.id, 'chain-reaction ' + t.id, 'bit-rot ' + t.id, 'exploit ' + t.id];
  if (isOC(s)) return ['stack-smash ' + t.id, 'hot-loop ' + t.id];
  return [];
}

export default { use, validate, cycle, dealt, taken, struck, crit, hit: onHit, broke, chipped, plan, fill };

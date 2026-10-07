// Operator subclasses, the engine side: what the subclass skills, talents and edges do, and how
// the planner plays them. The data (skills, trees) is in ./operator.data.mjs.
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
// Marks this module keeps on a part (the virus is shared, so a crewmate's hooks see them too):
//   jammedUntil            Jammed (Jam, Spoofed ACK, Hijack, Blackhole): until its held attack goes off.
//   mitmUntil, mitmBonus   Man in the Middle (Hijacker's edge): a Jammed part takes +20% from everyone.
//   hijack                 { left, share, cap, cross }: its next attack(s) turn on its own side (Hijack).
//   blackhole              its next attack does nothing (Blackhole).
//   poisonedUntil, poison  Cache Poison: its patches and heals turn into damage.
// Held attacks resolve in cycle(), which runs after a player's turn and before the virus attacks.
import { subOf, subEdge, hasTalent, rank, emit, hit, heal, part, alive, livingParts, helpersOn, helperCap, on, buffed, scaled, soonestAttacker, classOf, attackAmount, toIntent, usable, intents, defender, previewDamage, readyIn, patchDelay } from '../combat.mjs';
import { ABILITIES } from '../data.mjs';

const A = (id) => ABILITIES[id];
const cycles = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;

// ---------- shared pieces ----------
// The size of a part's attack, as a hit: a damage attack's amount (Floodgate's ramp and the rest
// included, half if Throttled), or the hit a special carries (the Scrambler's). 0 for the rest.
function attackSize(s, p) {
  const atk = p?.attack;
  if (!atk) return 0;
  const n = atk.effect === 'damage' ? attackAmount(p) : atk.hit || 0;
  return Math.round(n * (on(s, p, 'throttled') ? 0.5 : 1));
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Jammed: until its held attack goes off (at least through next cycle). With Man in the Middle,
// it takes more from everyone while it lasts.
function jamMark(s, p) {
  const e = s.encounter;
  if (!alive(p)) return;
  const until = Math.max(e.cycle + 1, p.attack?.due ?? e.cycle + 1);
  p.jammedUntil = Math.max(p.jammedUntil || 0, until);
  if (subEdge(s, 'hijacker')) {
    p.mitmUntil = Math.max(p.mitmUntil || 0, until);
    p.mitmBonus = Math.max(p.mitmBonus || 0, hasTalent(s, 'full-duplex') ? 0.4 : 0.2);
  }
}

// The helper a recall skill (Jam, Barrier, Blackhole) is about to spend: validate sees it before
// the generic recall takes it, so Loopback and Cold Storage know what it was.
function snapRecall(s, intent) {
  const e = s.encounter, p = part(s, intent.target);
  const h = p && helpersOn(s, p)[0];
  e.recalled = h ? { ...h, at: e.cycle, target: p.id } : null;
}
const recalled = (s, target) => { const r = s.encounter.recalled; return r && r.at === s.encounter.cycle && r.target === target.id ? r : null; };
// Loopback (Hijacker talent): the helper you spent comes straight back.
function loopback(s, target) {
  const r = recalled(s, target);
  if (!r || !hasTalent(s, 'loopback') || s.encounter.helpers.length >= helperCap(s)) return;
  const { at, ...h } = r;
  s.encounter.helpers.push(h);
  emit(s, 'status', `Loopback: your helper keeps running on the ${target.name}.`, { target: target.id, mark: 'helper' });
}

// Malloc (Herder): the next helpers started deal more and run longer. Helpers this command started
// are the ones not seen yet (cycle() marks every helper seen at the end of each turn).
function freshHelpers(s) {
  const e = s.encounter;
  let n = 0;
  for (const h of e.helpers) {
    if (h.seen) continue;
    h.seen = true;
    if (e.malloc > 0) { h.damage = Math.round(h.damage * (1 + A('malloc').boost)); h.left++; e.malloc--; n++; }
  }
  if (n) emit(s, 'status', `Malloc: ${n === 1 ? 'a helper' : n + ' helpers'} with more memory: +${Math.round(A('malloc').boost * 100)}% and a cycle longer.${e.malloc ? ` ${e.malloc} left.` : ''}`, { mark: 'helper' });
}

// ---------- held attacks (resolved before the virus's turn) ----------
// The part a hijacked hit lands on: the other part whose attack lands soonest, else itself.
function resolveHeld(s) {
  const e = s.encounter;
  if (e.virus.dormant) return;
  const living = livingParts(s);
  for (const p of living) {
    const atk = p.attack;
    if (!alive(p) || !atk || atk.due > e.cycle || (atk.alone && living.length > 1)) continue;
    if (p.blackhole) {
      delete p.blackhole;
      atk.due = e.cycle + atk.interval;
      if (atk.windup) atk.wound = 0;
      e.metrics.interrupts++;
      emit(s, 'blocked', `${atk.name} falls into the blackhole and does nothing.`, { source: p.id });
      continue;
    }
    if (p.hijack) {
      const hj = p.hijack;
      const size = attackSize(s, p);
      atk.due = e.cycle + atk.interval;
      if (atk.windup) atk.wound = 0;
      e.metrics.interrupts++;
      if (--hj.left <= 0) delete p.hijack; else jamMark(s, p);
      if (size > 0) {
        const others = livingParts(s).filter((x) => x !== p);
        const to = !others.length ? [p] : hj.cross ? others : [soonestAttacker(s, p.id) || others[0]];
        const amount = Math.max(1, Math.min(hj.cap || Infinity, Math.round(size * hj.share)));
        emit(s, 'blocked', `HIJACKED: ${p.name}'s ${atk.name} turns on ${to.length > 1 ? 'every other part' : to[0] === p ? 'itself' : 'the ' + to[0].name}.`, { source: p.id, target: to[0].id });
        for (const x of to) if (alive(x)) hit(s, x, amount, { by: 'Hijack', pierce: true });
      } else emit(s, 'blocked', `HIJACKED: ${p.name}'s ${atk.name} goes nowhere.`, { source: p.id });
      continue;
    }
    // Cache Poison: a heal it casts hurts the part it was meant for.
    if (atk.effect === 'heal' && on(s, p, 'poisoned')) {
      atk.due = e.cycle + atk.interval;
      const meant = livingParts(s).sort((a, b) => a.integrity / a.max - b.integrity / b.max)[0];
      emit(s, 'blocked', `${p.name}'s ${atk.name} is poisoned: it hurts the ${meant.name} instead.`, { source: p.id, target: meant.id });
      hit(s, meant, Math.max(1, Math.round(atk.amount)), { by: 'Cache Poison', pierce: true });
    }
  }
  // Cache Poison: an armor patch that's due hits the part instead, and its patch timer starts over.
  for (const p of livingParts(s)) {
    if (!on(s, p, 'poisoned') || !(p.maxArmor > 0) || p.armor !== 0 || p.patchAt == null || e.cycle < p.patchAt) continue;
    p.patchAt = e.cycle + patchDelay(s);
    emit(s, 'status', `${p.name} tries to patch from a poisoned cache. The patch hits it instead.`, { target: p.id });
    hit(s, p, p.poison || scaled(s, A('cache-poison').patch), { by: 'Cache Poison' });
  }
}

// ---------- the planner ----------
const ok = (s, text) => !toIntent(s, text).error;
const firstOk = (s, list) => list.find((c) => c && ok(s, c)) || null;
const landingNow = (s) => intents(s).filter((i) => i.col === 0 && !i.hidden);
const queued = (s, p) => helpersOn(s, p).reduce((n, h) => n + h.damage * h.left, 0);
const helperValue = (s) => s.encounter.helpers.reduce((n, h) => n + h.damage * h.left, 0);
// Something the generic planner would finish right now (a part about to fire, or a bare one):
// leave those to it.
function finishable(s) {
  const now = new Set(landingNow(s).map((i) => i.source));
  for (const p of livingParts(s)) {
    if (p.armor > 0 || !(now.has(p.id) || p.patchAt != null)) continue;
    if (ok(s, 'spike ' + p.id) && previewDamage(s, 'spike', p) >= p.integrity) return true;
    if (queued(s, p) >= p.integrity && ok(s, 'kill-switch')) return true;
  }
  return false;
}
// The attack landing now that's worth answering (the generic planner's bar), biggest first.
function threatNow(s) {
  const d = defender(s);
  return landingNow(s).filter((i) => (i.effect !== 'damage' || i.amount >= Math.max(6, d.max * 0.08)) && !['mirror', 'reboot'].includes(i.effect) && alive(part(s, i.source)) && !part(s, i.source).phase)
    .sort((a, b) => b.amount - a.amount)[0] || null;
}

function herderPlan(s, t) {
  const e = s.encounter, d = defender(s), living = livingParts(s), n = e.helpers.length;
  if (finishable(s)) return null;
  return firstOk(s, [
    // Low: reap the swarm for a heal.
    d.integrity < d.max * 0.45 && helperValue(s) >= d.max * 0.12 && 'oom-kill',
    // A helper on everything (room for one per part).
    living.length >= 2 && n <= helperCap(s) - living.length && 'fan-out ' + t.id,
    // Memory before the big spawns.
    !e.malloc && n < helperCap(s) - 2 && (ok(s, 'deploy ' + t.id) || ok(s, 'botnet ' + t.id)) && t.integrity > t.max * 0.5 && 'malloc',
    n >= 3 && living.length >= 2 && !buffed(e, 'mesh') && 'mesh',
    n >= 4 && 'cron-storm',
    n >= 3 && !buffed(e, 'fork') && 'fork',
  ]);
}

function hijackerPlan(s, t) {
  const e = s.encounter;
  if (finishable(s)) return null;
  const big = threatNow(s);
  if (big) {
    const id = big.source, p = part(s, id), hits = big.effect === 'damage' || big.hit;
    const answer = firstOk(s, big.effect === 'heal'
      ? ['cache-poison ' + id, 'hijack ' + id, 'blackhole ' + id, 'spoofed-ack ' + id]
      : hits
        ? ['hijack ' + id, 'spoofed-ack ' + id, 'blackhole ' + id, helpersOn(s, p).length && 'jam ' + id]
        : ['blackhole ' + id, 'hijack ' + id, 'spoofed-ack ' + id, helpersOn(s, p).length && 'jam ' + id]);
    if (answer) return answer;
  }
  // A patch coming, or a healer about to heal: poison it.
  const patching = livingParts(s).find((p) => p.maxArmor > 0 && p.armor === 0 && p.patchAt != null && p.patchAt - e.cycle <= 1 && !on(s, p, 'poisoned'));
  const healer = livingParts(s).find((p) => p.attack?.effect === 'heal' && p.attack.due - e.cycle <= 2 && !on(s, p, 'poisoned'));
  // Fodder for Jam and Blackhole: a cheap helper on the next attacker.
  // (only when Hijack and Spoofed ACK won't be ready for it)
  const has = (id) => usable(s).includes(id);
  const next = livingParts(s).filter((p) => p.attack && p.attack.due - e.cycle >= 1 && p.attack.due - e.cycle <= 2 && (p.attack.effect !== 'damage' || attackSize(s, p) >= defender(s).max * 0.08)).sort((a, b) => a.attack.due - b.attack.due)[0];
  const covered = next && has('spoofed-ack') && readyIn(s, 'spoofed-ack') <= next.attack.due - e.cycle;
  const spender = next && ['hijack', 'blackhole'].some((id) => has(id) && readyIn(s, id) <= next.attack.due - e.cycle);
  const others = e.helpers.filter((h) => h.target !== t.id).length;
  return firstOk(s, [
    healer && 'cache-poison ' + healer.id,
    patching && 'cache-poison ' + patching.id,
    t.attack && attackSize(s, t) >= scaled(s, A('replay').floor) && 'replay ' + t.id,
    next && !covered && spender && !helpersOn(s, next).length && 'spawn ' + next.id,
    !t.armor && others >= 3 && 'reroute ' + t.id,
  ]);
}

export default {
  use: {
    // ----- Herder -----
    'fan-out': (s, { a, target, e }) => {
      const dmg = scaled(s, a.helper + rank(s, 'wide-area'));
      for (const h of e.helpers) if (!h.seen) h.damage = dmg;
      let n = 0;
      for (const p of livingParts(s)) {
        if (p === target || e.helpers.length >= helperCap(s)) continue;
        e.helpers.push({ target: p.id, damage: dmg, left: a.ticks, synced: !!e.synced });
        n++;
      }
      if (n) emit(s, 'status', `Fan-out: helpers on ${n === 1 ? 'one more part' : n + ' more parts'}, ${dmg} per cycle for ${cycles(a.ticks)}.`, { mark: 'helper', ability: 'fan-out' });
      freshHelpers(s);
    },
    deploy: (s) => freshHelpers(s),
    spawn: (s) => freshHelpers(s),
    botnet: (s) => freshHelpers(s),
    mesh: (s, { a, e }) => {
      e.buffs.mesh = e.cycle + a.cycles - 1;
      emit(s, 'status', `Mesh for ${cycles(a.cycles)}: every helper hit splashes half onto every other part.`, { mark: 'buff', ability: 'mesh' });
    },
    malloc: (s, { a, e }) => {
      e.malloc = a.count;
      emit(s, 'status', `Malloc: your next ${a.count} helpers deal +${Math.round(a.boost * 100)}% and run a cycle longer.`, { mark: 'buff', ability: 'malloc' });
    },
    'oom-kill': (s, { a, e }) => {
      const total = helperValue(s), n = e.helpers.length;
      e.helpers = [];
      emit(s, 'status', `OOM Kill: ${n === 1 ? 'one helper' : n + ' helpers'} reaped.`, { ability: 'oom-kill' });
      heal(s, Math.max(1, Math.round(total * a.share)), 'OOM Kill');
    },
    // ----- Hijacker -----
    jam: (s, { target, e }) => {
      if (!alive(target)) return;
      // Long Jam: a second cycle.
      if (hasTalent(s, 'long-jam') && target.attack) { target.attack.due += 1; emit(s, 'interrupt', `Long Jam: ${target.attack.name} waits another cycle.`, { target: target.id }); }
      loopback(s, target);
      jamMark(s, target);
    },
    barrier: (s, { target, e }) => {
      const r = recalled(s, target), k = 0.1 * rank(s, 'cold-storage');
      if (r && k) { const more = Math.round(r.damage * r.left * k); e.shield = (e.shield || 0) + more; emit(s, 'status', `Cold Storage: +${more} shield (${e.shield}).`, { mark: 'shield' }); }
    },
    'spoofed-ack': (s, { a, target }) => {
      if (!alive(target)) return;
      const share = a.share + 0.1 * rank(s, 'ack-flood');
      const back = clamp(Math.round(attackSize(s, target) * share), scaled(s, 8), scaled(s, a.cap));
      jamMark(s, target);
      hit(s, target, back, { mine: true, by: 'Spoofed ACK' });
    },
    hijack: (s, { a, target }) => {
      if (!alive(target)) return;
      target.hijack = { left: hasTalent(s, 'double-agent') ? 2 : 1, share: a.share, cap: scaled(s, a.cap), cross: hasTalent(s, 'crosstalk') };
      jamMark(s, target);
      emit(s, 'status', `${target.name} hijacked: its next ${target.hijack.left === 2 ? 'two attacks turn' : 'attack turns'} on its own side. Jammed.`, { target: target.id, ability: 'hijack' });
    },
    blackhole: (s, { target }) => {
      if (!alive(target)) return;
      target.blackhole = true;
      loopback(s, target);
      jamMark(s, target);
      emit(s, 'status', `Blackhole: ${target.name}'s next attack goes nowhere. Jammed.`, { target: target.id, ability: 'blackhole' });
    },
    'cache-poison': (s, { a, target, e }) => {
      if (!alive(target)) return;
      target.poisonedUntil = e.cycle + a.cycles;
      target.poison = scaled(s, a.patch);
      emit(s, 'status', `${target.name} Poisoned for ${cycles(a.cycles)}: its patches and heals turn into damage.`, { target: target.id, ability: 'cache-poison' });
    },
    replay: (s, { a, target }) => {
      if (!alive(target)) return;
      const amount = clamp(attackSize(s, target), scaled(s, a.floor), scaled(s, a.cap)) + (rank(s, 'packet-capture') ? scaled(s, 5 * rank(s, 'packet-capture')) : 0);
      emit(s, 'status', `Replay: ${target.name}'s ${target.attack?.name || 'attack'} plays back at it.`, { target: target.id, ability: 'replay' });
      hit(s, target, amount, { mine: true, pierce: true, by: 'Replay' });
    },
  },
  validate: {
    jam: (s, intent) => (snapRecall(s, intent), null),
    barrier: (s, intent) => (snapRecall(s, intent), null),
    blackhole: (s, intent) => {
      const p = part(s, intent.target);
      if (!p.attack) return `${p.name} has no attack.`;
      if (p.blackhole) return `${p.name}'s next attack is already going into the blackhole.`;
      snapRecall(s, intent);
      return null;
    },
    'spoofed-ack': (s, intent) => (part(s, intent.target).attack ? null : `${part(s, intent.target).name} has no attack.`),
    replay: (s, intent) => (part(s, intent.target).attack ? null : `${part(s, intent.target).name} has no attack to record.`),
    hijack: (s, intent) => {
      const p = part(s, intent.target);
      if (!p.attack) return `${p.name} has no attack.`;
      if (p.hijack) return `${p.name} is already hijacked.`;
      snapRecall(s, intent);
      return null;
    },
    'oom-kill': (s) => (s.encounter.helpers.length ? null : 'No helpers running.'),
  },
  cycle(s) {
    const e = s.encounter;
    if (!e) return;
    // Zombie Process (Herder talent): a helper that just ran out hits once more on top of Last Gasp.
    if (e.expiring && hasTalent(s, 'zombie-process') && subEdge(s, 'herder')) {
      for (const h of e.expiring) { const p = part(s, h.target); if (h.left === 0 && alive(p)) hit(s, p, h.damage, { by: 'Zombie Process', dot: true, synced: h.synced }); }
    }
    e.expiring = e.helpers.filter((h) => h.left === 1);
    for (const h of e.helpers) h.seen = true;
    resolveHeld(s);
  },
  // Man in the Middle: a Jammed part takes more from everyone (the mark is on the part).
  // GC Tuning (Herder rank): Garbage Collect hits harder.
  dealt(s, p, opts = {}) {
    let m = p.mitmUntil >= s.encounter.cycle ? 1 + (p.mitmBonus || 0.2) : 1;
    if (opts.mine && opts.by === 'Garbage Collect' && rank(s, 'gc-tuning')) m *= 1 + 0.3 * rank(s, 'gc-tuning');
    return m;
  },
  hit(s, p, res, opts) {
    const e = s.encounter;
    // Mesh (Herder): a helper hit that does damage splashes half onto every other part.
    if (res.dealt > 0 && (opts.by === 'Helper' || opts.by === 'Last Gasp') && buffed(e, 'mesh') && classOf(s) === 'operator') {
      const half = Math.max(1, Math.round(res.dealt * A('mesh').share));
      for (const x of livingParts(s)) if (x !== p) hit(s, x, half, { by: 'Mesh', server: true });
    }
  },
  broke(s, p) {
    const e = s.encounter;
    // Talent ids aren't unique across classes (a Phantom has a Kill Chain too): only an Operator's count here.
    if (classOf(s) !== 'operator') return;
    // Hydra (Herder talent): each helper on the broken part splits in two on the next one.
    if (hasTalent(s, 'hydra')) {
      const next = soonestAttacker(s);
      const mine = e.helpers.filter((h) => h.target === p.id);
      if (next && mine.length) {
        let n = 0;
        for (const h of mine) { h.target = next.id; if (e.helpers.length < helperCap(s)) { e.helpers.push({ ...h }); n++; } }
        emit(s, 'status', `Hydra: ${mine.length === 1 ? 'a helper moves' : mine.length + ' helpers move'} to the ${next.name}${n ? ` and ${n === 1 ? 'one splits' : n + ' split'}` : ''}.`, { target: next.id, mark: 'helper' });
      }
    }
    // Kill Chain (Hijacker talent): breaking a Jammed part readies your control skills.
    if (hasTalent(s, 'kill-chain') && p.jammedUntil >= e.cycle) {
      for (const id of ['jam', 'spoofed-ack', 'hijack']) delete e.readyAt[id];
      emit(s, 'proc', 'Kill Chain: Jam, Spoofed ACK and Hijack are ready.', { ability: 'jam' });
    }
  },
  plan(s, t) {
    if (classOf(s) !== 'operator' || !t) return null;
    const sub = subOf(s);
    return sub === 'herder' ? herderPlan(s, t) : sub === 'hijacker' ? hijackerPlan(s, t) : null;
  },
};

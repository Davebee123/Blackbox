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
import { subOf, subEdge, hasTalent, rank, emit, hit, heal, part, alive, livingParts, helpersOn, helperCap, on, buffed, scaled, soonestAttacker, classOf, attackAmount, toIntent, usable, intents, defender, previewDamage, readyIn, patchDelay, restoreMult, openProc, attackers } from '../combat.mjs';
import { ABILITIES } from '../data.mjs';
import { chargeNow, tellOn, landsAt, tellAnswer, chargeSize } from '../tells.mjs';

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
    if (p.blackhole && !chargeNow(s, p)) { // a charged attack: tells.mjs drops it into the blackhole as it lands
      delete p.blackhole;
      atk.due = e.cycle + atk.interval;
      atk.n = (atk.n || 0) + 1;
      if (atk.windup) atk.wound = 0;
      e.metrics.interrupts++;
      emit(s, 'blocked', `${atk.name} falls into the blackhole and does nothing.`, { source: p.id });
      continue;
    }
    // Takeover: for its cycles, every attack it makes turns on its own side at full size.
    const took = p.takeoverUntil >= e.cycle ? { left: Infinity, share: 1, cap: Infinity, cross: false, at: p.takeoverAt, takeover: true } : null;
    if (p.hijack || took) {
      const hj = p.hijack || took;
      // A charge riding this attack: it's yours, at its full charged size (tells.mjs).
      const ch = chargeNow(s, p) ? chargeSize(s, p) : null;
      const size = ch ? ch.amount : attackSize(s, p);
      if (ch) tellAnswer(s, ch.t, p, `HIJACKED: ${ch.t.name.toUpperCase()} is yours.`, { at: hj.at });
      atk.due = e.cycle + atk.interval;
      atk.n = (atk.n || 0) + 1;
      if (atk.windup) atk.wound = 0;
      e.metrics.interrupts++;
      if (hj.takeover) jamMark(s, p);
      else if (--hj.left <= 0) delete p.hijack; else jamMark(s, p);
      if (size > 0) {
        const others = livingParts(s).filter((x) => x !== p);
        const to = !others.length ? [p] : hj.cross ? others : [soonestAttacker(s, p.id) || others[0]];
        const amount = Math.max(1, ch ? size : Math.min(hj.cap || Infinity, Math.round(size * hj.share)));
        emit(s, 'blocked', `${hj.takeover ? 'TAKEN OVER' : 'HIJACKED'}: ${p.name}'s ${atk.name} turns on ${to.length > 1 ? 'every other part' : to[0] === p ? 'itself' : 'the ' + to[0].name}.`, { source: p.id, target: to[0].id });
        for (const x of to) if (alive(x)) hit(s, x, amount, { by: hj.takeover ? 'Takeover' : 'Hijack', pierce: true });
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
    // (helpers that would finish it: Kill Switch only to stop an attack, planner.mjs)
  }
  return false;
}
// The attack landing now that's worth answering (the generic planner's bar), biggest first.
function threatNow(s) {
  const d = defender(s);
  return landingNow(s).filter((i) => (i.effect !== 'damage' || i.amount >= Math.max(6, d.max * 0.08)) && !['mirror', 'reboot'].includes(i.effect) && alive(part(s, i.source)) && !part(s, i.source).phase)
    .sort((a, b) => b.amount - a.amount)[0] || null;
}

// A tell about to land (this cycle or next) on a part, of a kind.
const tellSoon = (s, kinds, lag = 1) => livingParts(s).map((p) => [p, tellOn(s, p)]).find(([p, x]) => x && kinds.includes(x.kind) && (x.kind === 'charge' && p.attack ? landsAt(p, x.n) : x.next) - s.encounter.cycle <= lag) || [null, null];
function herderPlan(s, t) {
  const e = s.encounter, d = defender(s), living = livingParts(s), n = e.helpers.length;
  // A big hit landing now with the swarm out: shed it onto the helpers.
  const big = threatNow(s);
  if (big && n >= 3 && (big.hit || big.amount) >= d.max * 0.14 && helperValue(s) >= (big.hit || big.amount) * 0.6 && !finishable(s) && ok(s, 'load-shed')) return 'load-shed';
  // Fragments up: Garbage Collect takes them all at once, where a Spike takes one.
  if (living.some((p) => p.kind === 'fragment') && living.length >= 3 && ok(s, 'garbage-collect')) return 'garbage-collect';
  if (finishable(s)) return null;
  // Crontab once, on the part that will stand longest: it hits every other cycle until the fight ends.
  const long = [...living].sort((a, b) => b.integrity - a.integrity)[0];
  if (long && long.integrity >= scaled(s, 60) && !e.crontab && ok(s, 'crontab ' + long.id)) return 'crontab ' + long.id;
  const [told] = tellSoon(s, ['charge', 'cast']);
  const frags = living.filter((p) => p.kind === 'fragment').length;
  const armor = living.reduce((k, p) => k + (p.armor || 0), 0);
  return firstOk(s, [
    // Kill Switch: your helpers on a part about to land a tell cash in, and each part they hit takes it as your hit.
    told && livingParts(s).filter((p) => tellOn(s, p) && helpersOn(s, p).length).length >= 2 && 'kill-switch', // two tells answered at once
    // Garbage Collect: fragments up.
    frags >= 2 && 'garbage-collect',
    // Cron Storm: a full swarm hits twice.
    n >= 5 && 'cron-storm',
    // Fork: thick armor for the swarm to crack (each ◆ starts a helper).
    armor >= 3 && n >= 2 && !buffed(e, 'fork') && 'fork',
    // Low: reap the swarm for a heal.
    d.integrity < d.max * 0.45 && helperValue(s) >= d.max * 0.12 && 'oom-kill',
    // A helper on everything: three parts or more (room for one each), or a tell on another part for Kill Switch to cash in.
    (living.length >= 3 || (usable(s).includes('kill-switch') && living.some((p) => p !== t && tellOn(s, p) && !helpersOn(s, p).length))) && n <= helperCap(s) - living.length && (!ok(s, 'botnet ' + t.id) || buffed(e, 'fork') || ok(s, 'fork')) && 'fan-out ' + t.id, // Botnet first (three on the target beat one on each), unless Fork will split a helper on every ◆
    // Memory before the big spawns.
    !e.malloc && n < helperCap(s) - 2 && (ok(s, 'deploy ' + t.id) || ok(s, 'botnet ' + t.id)) && t.integrity > t.max * 0.5 && 'malloc',
    n >= 3 && living.length >= 2 && !buffed(e, 'mesh') && 'mesh',
    // Hook a part your swarm is on: +6 on every helper hit.
    helpersOn(s, t).length >= 3 && !on(s, t, 'hooked') && 'hook ' + t.id,
    n >= 4 && 'cron-storm',
    // nohup between the big helpers: a hit now and one more on the part.
    !(t.armor > 0) && 'nohup ' + t.id,
  ]);
}

function hijackerPlan(s, t) {
  const e = s.encounter;
  if (finishable(s)) return null;
  // Echo Cancel on a Mimic, a Decoy or an Echo: its next beat turns on the virus.
  const echo = livingParts(s).find((p) => (p.mimic || p.reflect || p.echo) && !(p.echoCancelUntil >= e.cycle));
  if (echo && ok(s, 'echo-cancel ' + echo.id)) return 'echo-cancel ' + echo.id;
  // The tells: Hijack a charge or a cast (a helper on the part spends it), Replay a charge at its charged size,
  // Reroute the swarm into a cast (each arrival a hit), Cache Poison a seal, Blackhole a charge you can't stop.
  const [tp, tt] = tellSoon(s, ['charge', 'cast', 'seal']);
  if (tp) {
    const with_ = helpersOn(s, tp).length;
    const c = firstOk(s, tt.kind === 'seal'
      ? [tp.armor > 1 && 'cache-poison ' + tp.id]
      : [with_ && 'hijack ' + tp.id, tt.kind === 'charge' && 'spoofed-ack ' + tp.id, tt.kind === 'charge' && with_ && 'jam ' + tp.id, tt.kind === 'charge' && 'replay ' + tp.id, tt.kind === 'cast' && e.helpers.length >= 2 && 'reroute ' + tp.id, tt.kind === 'charge' && with_ && 'blackhole ' + tp.id]);
    if (c) return c;
    // A charge about to land on you that nothing else answers: turn a helper on that part into a shield.
    if (tt.kind === 'charge' && with_) { const b = firstOk(s, ['barrier ' + tp.id]); if (b) return b; }
  }
  // Takeover (once the tells are answered): the hardest-hitting part with others standing, its attack (or a charge on it) a cycle or two out.
  const crowd = livingParts(s).length >= 2;
  const boss = attackers(s).filter((p) => p.attack.due - e.cycle <= A('takeover').cycles - 1 && (p.attack.effect === 'damage' || p.attack.hit)).sort((a, b) => (chargeSize(s, b)?.amount || attackSize(s, b)) - (chargeSize(s, a)?.amount || attackSize(s, a)))[0];
  if (boss && crowd && ((chargeSize(s, boss)?.amount || attackSize(s, boss)) >= defender(s).max * 0.12) && ok(s, 'takeover ' + boss.id)) return 'takeover ' + boss.id;
  // Low, and a big hit landing now: the helper on that part becomes a shield worth what it had left.
  const bigNow = threatNow(s);
  if (bigNow && defender(s).integrity < defender(s).max * 0.5 && helpersOn(s, part(s, bigNow.source)).length) { const b = firstOk(s, ['barrier ' + bigNow.source]); if (b) return b; }
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

// The cheap keys between the big ones (planner.mjs, before key 1).
function fill(s, t) {
  if (classOf(s) !== 'operator' || !t) return [];
  const sub = subOf(s);
  if (sub === 'herder') return ['nohup ' + t.id, 'hook ' + t.id]; // (Spawn's 7 a cycle is slower than a Ping: not a filler)
  if (sub === 'hijacker') return ['sniff ' + t.id, t.attack && 'jam ' + t.id, 'echo-cancel ' + t.id, !on(s, t, 'poisoned') && 'cache-poison ' + t.id, 'spawn ' + t.id];
  return [];
}
export default {
  fill,
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
    nohup: (s) => freshHelpers(s),
    sniff: (s) => freshHelpers(s),
    mesh: (s, { a, e }) => {
      e.buffs.mesh = e.cycle + a.cycles - 1;
      emit(s, 'status', `Mesh for ${cycles(a.cycles)}: every helper hit splashes half onto every other part.`, { mark: 'buff', ability: 'mesh' });
      // Every helper hits once now, so the command is never wasted.
      for (const h of [...e.helpers]) { let t = part(s, h.target); if (!alive(t)) t = soonestAttacker(s); if (t) hit(s, t, h.damage, { by: 'Helper', dot: true, synced: h.synced }); if (!livingParts(s).length) break; }
    },
    'load-shed': (s, { e }) => {
      e.loadShed = true;
      emit(s, 'status', `Load Shed: the next attack on you is split over your ${e.helpers.length === 1 ? 'helper' : e.helpers.length + ' helpers'}.`, { mark: 'shield', ability: 'load-shed' });
    },
    crontab: (s, { a, target, e }) => {
      e.crontab = { target: target.id, damage: scaled(s, a.hit), from: e.cycle };
      emit(s, 'status', `Crontab: a job hits the ${target.name} for ${e.crontab.damage} every other cycle until the fight ends.`, { target: target.id, mark: 'helper', ability: 'crontab' });
    },
    malloc: (s, { a, e }) => {
      e.malloc = a.count;
      emit(s, 'status', `Malloc: your next ${a.count} helpers deal +${Math.round(a.boost * 100)}% and run a cycle longer.`, { mark: 'buff', ability: 'malloc' });
    },
    'oom-kill': (s, { a, e }) => {
      const total = helperValue(s), n = e.helpers.length;
      e.helpers = [];
      emit(s, 'status', `OOM Kill: ${n === 1 ? 'one helper' : n + ' helpers'} reaped.`, { ability: 'oom-kill' });
      heal(s, Math.max(1, Math.round(total * a.share * restoreMult(s))), 'OOM Kill');
    },
    // ----- Hijacker -----
    // Jam: a hit that leaves it Jammed. With one of your helpers on it, the helper goes too and the attack waits a cycle.
    jam: (s, { target, e }) => {
      if (!alive(target)) return;
      const h = helpersOn(s, target)[0];
      if (h && target.attack) {
        e.helpers.splice(e.helpers.indexOf(h), 1);
        // A charge on the attack you jammed loses its signal: it lands plain, a cycle later (a read, tells.mjs).
        const ch = tellOn(s, target, 'charge');
        if (ch && ch.n === (target.attack.n || 0)) tellAnswer(s, ch, target, `JAMMED: ${ch.name.toUpperCase()} loses its signal. The ${target.name}'s ${target.attack.name} lands plain, a cycle later.`);
        target.attack.due += 1 + (hasTalent(s, 'long-jam') ? 1 : 0); // Long Jam: a second cycle
        if (target.attack.ramp && target.attack.step) target.attack.step = 0;
        e.metrics.interrupts++;
        emit(s, 'interrupt', `Jam pulls your helper off the ${target.name}: its ${target.attack.name} waits ${hasTalent(s, 'long-jam') ? '2 cycles' : 'a cycle'}.`, { target: target.id });
        openProc(s, 'slipped');
        loopback(s, target);
      }
      jamMark(s, target);
    },
    takeover: (s, { a, target, e }) => {
      if (!alive(target)) return;
      target.takeoverUntil = e.cycle + a.cycles - 1;
      target.takeoverAt = e.commanding?.at ?? e.cycle;
      jamMark(s, target);
      emit(s, 'status', `${target.name} taken over for ${cycles(a.cycles)}: its attacks land on its own side at full size.`, { target: target.id, ability: 'takeover' });
    },
    'echo-cancel': (s, { a, target, e }) => {
      if (!alive(target)) return;
      target.echoCancelUntil = e.cycle + a.cycles - 1;
      if (target.echo && e.echoes?.length) { e.echoes = []; emit(s, 'status', `Echo Cancel: the ${target.name}'s echoes go quiet.`, { target: target.id }); }
      if (target.reflect || target.mimic) target.unmaskUntil = e.cycle + a.cycles;
      if (target.reflect || target.mimic || target.echo) emit(s, 'status', `Echo Cancel on the ${target.name}: its next beat plays back into the virus.`, { target: target.id, ability: 'echo-cancel' });
    },
    barrier: (s, { target, e }) => {
      const r = recalled(s, target), k = 0.1 * rank(s, 'cold-storage');
      if (r && k) { const more = Math.round(r.damage * r.left * k); e.shield = (e.shield || 0) + more; emit(s, 'status', `Cold Storage: +${more} shield (${e.shield}).`, { mark: 'shield' }); }
    },
    'spoofed-ack': (s, { a, target }) => {
      if (!alive(target)) return;
      const share = a.share + 0.1 * rank(s, 'ack-flood');
      // A charge on the attack it fakes out: the ACK takes the charge's size, and the charge drains (a read, tells.mjs).
      const ch = chargeSize(s, target), riding = ch && target.attack && ch.t.n === (target.attack.n || 0);
      const size = riding ? ch.amount : attackSize(s, target);
      if (riding) tellAnswer(s, ch.t, target, `Spoofed ACK: ${ch.t.name.toUpperCase()} acks into nothing. The ${target.name}'s ${target.attack.name} lands plain, a cycle later.`);
      const back = clamp(Math.round(size * share), scaled(s, 8), scaled(s, a.cap) * (riding ? 1.5 : 1));
      jamMark(s, target);
      hit(s, target, back, { mine: true, by: 'Spoofed ACK' });
    },
    hijack: (s, { a, target, e }) => {
      if (!alive(target)) return;
      // A cast it's compiling compiles for you instead: your hits deal 35% more for 4 cycles (tells.mjs).
      const cast = tellOn(s, target, 'cast');
      if (cast) { tellAnswer(s, cast, target, `HIJACKED: ${cast.name.toUpperCase()} compiles for you. Your hits deal +35% for 4 cycles.`); e.buffs.stolen = e.cycle + 3; } // and its next attack is yours too
      target.hijack = { left: hasTalent(s, 'double-agent') ? 2 : 1, share: a.share, cap: scaled(s, a.cap), cross: hasTalent(s, 'crosstalk'), at: e.commanding?.at ?? e.cycle };
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
      e.burns.push({ id: 'cache-poison', target: target.id, damage: scaled(s, a.burn), grow: 0, left: a.cycles, name: 'Cache Poison', drain: 0, synced: !!e.synced }); // it bites every cycle too
      emit(s, 'status', `${target.name} Poisoned for ${cycles(a.cycles)}: its patches and heals turn into damage.`, { target: target.id, ability: 'cache-poison' });
    },
    replay: (s, { a, target }) => {
      if (!alive(target)) return;
      const ch = chargeSize(s, target); // a charge winding up plays back at its charged size, up to twice the cap
      const amount = clamp(ch ? ch.amount : attackSize(s, target), scaled(s, a.floor), scaled(s, a.cap) * (ch ? 2 : 1)) + (rank(s, 'packet-capture') ? scaled(s, 5 * rank(s, 'packet-capture')) : 0);
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
    // Crontab (Herder): every other cycle, until the fight ends; it moves on when its part breaks.
    const ct = e.crontab;
    if (ct && (e.cycle - ct.from) % 2 === 0 && livingParts(s).length) {
      let t = part(s, ct.target);
      if (!alive(t)) { t = soonestAttacker(s) || livingParts(s)[0]; if (t) ct.target = t.id; }
      if (t) hit(s, t, ct.damage, { by: 'Crontab', dot: true });
    }
    resolveHeld(s);
  },
  // Load Shed (Herder): the next attack is split over your helpers; each loses that much of what it had left.
  absorb(s, amount, atk, p) {
    const e = s.encounter;
    if (!e?.loadShed || classOf(s) !== 'operator' || !(amount > 0)) return amount;
    e.loadShed = false;
    const hs = e.helpers;
    if (!hs.length) return amount;
    const each = amount / hs.length;
    let took = 0;
    for (const h of hs) { const can = Math.min(each, h.damage * h.left); took += can; h.left = Math.max(0, Math.floor((h.damage * h.left - can) / Math.max(1, h.damage))); }
    e.helpers = hs.filter((h) => h.left > 0);
    took = Math.round(took);
    emit(s, 'blocked', `Load Shed: your helpers carry ${took} of ${atk.name}.`, { source: p?.id, ability: 'load-shed' });
    return amount - took;
  },
  // Man in the Middle: a Jammed part takes more from everyone (the mark is on the part).
  // GC Tuning (Herder rank): Garbage Collect hits harder.
  dealt(s, p, opts = {}) {
    let m = p.mitmUntil >= s.encounter.cycle ? 1 + (p.mitmBonus || 0.2) : 1;
    // Man in the Middle: a helper of yours on a part is a foothold, and your hits on it take the same.
    if (m === 1 && opts.mine && !['Helper', 'Last Gasp'].includes(opts.by) && subEdge(s, 'hijacker') && helpersOn(s, p).length >= 1) m = 1.2; // your command's hits only, not the helpers'
    if (opts.mine && buffed(s.encounter, 'stolen')) m *= 1.35; // a cast hijacked (Hijack)
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

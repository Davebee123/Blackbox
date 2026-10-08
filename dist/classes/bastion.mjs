// Bastion subclasses, the engine side: what the subclass skills, talents and edges do, and how
// the planner plays them. The data (skills, trees) is in ./bastion.data.mjs.
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
// State this module keeps on a player's encounter (plain data, so a saved fight still loads):
//   e.ledger   Warden: the size of every attack that has hit you since your last Blowback
//   e.hots     heals over time from a Sysop (Heartbeat, and Patch's ticks under Overprovision):
//              [{ id, name, amount, left, from, cap, crit, loop }] (cap: the healer's Overprovision cap,
//              0 without the edge; crit: Critical Path; loop: the healer's name, for Loopback)
//   e.standby  Hot Standby: the next attack that would drop this player to 0 leaves them at 1
import { slotsOf, subOf, subEdge, hasTalent, rank, emit, heal, hit, alive, part, livingParts, defender, alliesOf, buffed, on, scaled, attackAmount, gapTaken, levelGap, classOf, usable, intents, toIntent, readyIn, knownSkills, healScaled, restoreMult, previewDamage, attackers, openProc } from '../combat.mjs';
import { ABILITIES, SKILLS } from '../data.mjs';
import { tankMove, healMove, cleanse, savePatch, saveBulkhead } from '../raid.mjs';
import { tellOn, tellOpen, tellAnswer, undoCast, landsAt } from '../tells.mjs';
import { subs as SUBS_BASTION } from './bastion.data.mjs';
// (Circuit Breaker's cap and Honeypot's cut: the absorb hook below; Revoke's failed heals and patches: combat.mjs.)

const A = (id) => ABILITIES[id];

// ---------- shared helpers ----------
const frac = (st) => { const d = defender(st); return d.max ? d.integrity / d.max : 1; };
// Everyone standing in this fight, you first: [{ who, st }] ('you' is the player; a crewmate's own name).
const crewOf = (s) => [{ who: s.who || 'you', st: s, me: true }, ...alliesOf(s)];
// The ally a skill was aimed at, from an intent (no name: yourself).
const aimed = (s, intent) => (intent?.ally ? alliesOf(s).find((x) => x.who === intent.ally)?.st || null : s);
const nameOf = (st) => st.who || 'you';
// The command that aims an ally skill at st, as s would type it.
const aim = (s, id, st) => (st === s ? id : `${id} ${nameOf(st)}`);

// Overprovision (Sysop's edge): healing past full turns into a shield, up to 20 (40 with Overcommit;
// Reserve Pool adds 5 a rank). cap: the healer's, worked out when the heal was cast.
const capOf = (s) => (subEdge(s, 'sysop') ? scaled(s, 20 + 5 * rank(s, 'reserve-pool')) * (hasTalent(s, 'overcommit') ? 2 : 1) : 0);
function overprovision(to, over, cap) {
  const e = to.encounter;
  if (!e || over <= 0 || cap <= 0) return 0;
  const add = Math.min(over, Math.max(0, cap - (e.shield || 0)));
  if (add <= 0) return 0;
  e.shield = (e.shield || 0) + add;
  emit(to, 'status', `Overprovision: ${add} of it becomes a shield (${e.shield}).`, { mark: 'shield' });
  return add;
}
// A Sysop's heal: Critical Path, the heal itself, Overprovision on what spills past full, and Loopback.
// opts.cap / opts.crit / opts.loop override the healer's own (heals over time keep the numbers they were cast with).
// The Sysop alone (no crew in the fight): its hits and burns deal SUBS.sysop.alone of their size, so a solo fight takes
// it about twice as long as a damage dealer. The heals it draws from its hits (Checksum, Reclaim, Maintenance Window)
// still come from the full size, so it is as safe as before.
const aloneCut = (s) => (classOf(s) === 'bastion' && subOf(s) === 'sysop' && s.encounter && !alliesOf(s).length ? SUBS_BASTION.sysop.alone : 1);
const drawn = (s) => 1 / aloneCut(s);
function mend(s, to, amount, label, opts = {}) {
  const d = to && to.encounter && defender(to);
  if (!d || d.integrity <= 0) return 0;
  const crit = opts.crit ?? hasTalent(s, 'critical-path');
  if (crit && d.integrity < d.max / 3) amount = Math.round(amount * 1.5);
  if (!opts.plain && windowOpen(s)) amount = Math.round(amount * (1 + A('maintenance-window').boost)); // Maintenance Window: heals +50%
  const room = d.max - d.integrity;
  heal(to, amount, label);
  overprovision(to, amount - Math.min(amount, room), opts.cap ?? capOf(s));
  const loop = 'loop' in opts ? opts.loop : hasTalent(s, 'loopback') ? s : null;
  if (loop && !opts.looped && amount > 0) mend(loop, loop, Math.max(1, Math.round(amount / 3)), 'Loopback', { looped: true, crit: false, cap: opts.cap ?? capOf(loop), loop: null });
  return amount;
}
// The heal event a generic heal just wrote for this player (Patch's, Reclaim's): how much it healed.
function lastHeal(to, label) {
  const logs = to.logs || [];
  for (let i = logs.length - 1; i >= Math.max(0, logs.length - 12); i--) {
    const x = logs[i];
    if (x.type === 'heal' && (x.who || null) === (to.who || null) && x.message.startsWith(label + ' +')) return x.amount || 0;
  }
  return null;
}

// The size of an attack as it reaches you, before shields, cuts and armor (Blowback's ledger).
function attackSize(s, atk, p) {
  const throttled = on(s, p, 'throttled') ? (hasTalent(s, 'backpressure') ? 0.25 : SKILLS.throttled) : 1;
  const power = attackAmount(p) * (s.encounter.soft || 1) * gapTaken(levelGap(s)) * throttled;
  return Math.round(atk.hit ? (power * atk.hit) / Math.max(1, atk.amount) : power);
}
const blowbackOf = (s) => Math.min(scaled(s, A('blowback').cap), Math.round((s.encounter.ledger || 0) * (1 + 0.1 * rank(s, 'deep-buffer'))));

// A Sysop's heal over time on a player: one per kind (a new one replaces the old).
function addHot(s, to, hot) {
  const e = to.encounter;
  e.hots = (e.hots || []).filter((h) => h.id !== hot.id);
  e.hots.push({ ...hot, cap: capOf(s), crit: hasTalent(s, 'critical-path'), loop: hasTalent(s, 'loopback') ? nameOf(s) : null });
}
// Who cast a heal over time, from the player it ticks on (for Loopback): by name.
const caster = (to, who) => (nameOf(to) === who ? to : alliesOf(to).find((x) => x.who === who)?.st || null);

// Maintenance Window (Sysop): this healer's window is open.
const windowOpen = (s) => !!s?.encounter && buffed(s.encounter, 'maintenance-window') && classOf(s) === 'bastion';

// ---------- what the skills do ----------
const use = {
  // Warden: Reject throws it back, and shields you against the part that last hit you.
  reject(s, { a, target, e }) {
    if (e.grudge !== target.id) return;
    const n = scaled(s, a.guard);
    e.shield = (e.shield || 0) + n;
    emit(s, 'status', `Reject: the ${target.name} hit you last, so you shield ${n} (${e.shield}).`, { mark: 'shield', ability: 'reject' });
  },
  'circuit-breaker'(s, { a, e }) {
    e.buffs['circuit-breaker'] = e.cycle + a.cycles - 1;
    emit(s, 'status', `Circuit Breaker for ${a.cycles} cycles. No attack takes more than ${Math.round(defender(s).max * a.most)} from you.`, { mark: 'buff', ability: 'circuit-breaker' });
  },
  honeypot(s, { a, e }) {
    e.buffs.honeypot = e.cycle + a.cycles - 1;
    e.honeyCut = scaled(s, a.cut);
    emit(s, 'status', `Honeypot for ${a.cycles} cycles. The next hit on you deals ${e.honeyCut} less damage, and a Scramble or the Mimic's beat goes after the honeypot.`, { mark: 'buff', ability: 'honeypot' });
  },
  // Sysop
  checksum(s, { a, res }) {
    if (!(res?.dealt > 0)) return;
    const others = alliesOf(s).filter((x) => defender(x.st).integrity > 0).map((x) => x.st).sort((x, y) => frac(x) - frac(y));
    const to = others.length && frac(others[0]) < frac(s) ? others[0] : s; // in a crew, the lowest crewmate
    mend(s, to, Math.max(1, Math.round(res.dealt * a.share * restoreMult(s) * drawn(s))), to === s ? a.name : `${a.name} from ${s.who || 'you'}`);
  },
  'maintenance-window'(s, { a, e }) {
    e.buffs['maintenance-window'] = e.cycle + a.cycles - 1;
    emit(s, 'status', `Maintenance Window for ${a.cycles} cycles. Your heals heal ${Math.round(a.boost * 100)}% more, and your hits heal you for 25% of the damage they deal.`, { mark: 'buff', ability: 'maintenance-window' });
  },
  revoke(s, { a, target, e }) {
    if (!alive(target)) return;
    target.revokedUntil = e.cycle + a.cycles - 1;
    emit(s, 'status', `${target.name} revoked for ${a.cycles} cycles. Its heals, patches and updates fail.`, { target: target.id, mark: 'debuff', ability: 'revoke' });
    // A Self-Update it's compiling fails now (a read, tells.mjs).
    const c = tellOn(s, target, 'cast');
    if (c && c.does === 'grow') tellAnswer(s, c, target, `Revoked: the ${target.name} can't sign ${c.name.toUpperCase()}. It fails.`);
  },
  // Warden
  bulkhead(s, { a, e }) {
    e.buffs.bulkhead = e.cycle + a.cycles - 1;
    emit(s, 'status', `Bulkhead: attacks on ${s.who || 'you'} deal half damage for ${a.cycles} cycles.`, { mark: 'buff', ability: 'bulkhead' });
  },
  blowback(s, { target, e }) {
    const amount = blowbackOf(s);
    e.ledger = 0;
    if (alive(target) && amount > 0) hit(s, target, amount, { mine: true, chits: A('blowback').chits });
    // Retaliate is lit for the next cycle: the soak-and-return loop.
    if (amount > 0) openProc(s, 'struck', { amount: Math.max(e.procs?.struck?.amount || 0, Math.round(amount / 4)) });
  },
  // Quarantine: a cast the part is compiling is stopped (tells.mjs).
  quarantine(s, { target }) {
    const c = alive(target) && tellOn(s, target, 'cast');
    if (c) tellAnswer(s, c, target, `Quarantined: the ${target.name} can't finish compiling ${c.name.toUpperCase()}.`);
  },
  dmz(s, { a, e }) {
    e.buffs.dmz = e.cycle + a.cycles - 1;
    emit(s, 'status', `DMZ: attacks deal ${Math.round(a.cut * 100)}% less to ${alliesOf(s).length ? 'the whole crew' : s.who || 'you'} for ${a.cycles} cycles.`, { mark: 'buff', ability: 'dmz' });
  },
  // Warden talents on old skills
  suspend(s, { a, target, e }) {
    // A charge on the attack it pushed back drains out in its window: it lands plain (a read, tells.mjs). Before the
    // window the charge rides the attack it pushed back.
    const ch = alive(target) && target.attack && tellOn(s, target, 'charge');
    if (ch && ch.n === (target.attack.n || 0)) tellAnswer(s, ch, target, `SIGSTOP: ${ch.name.toUpperCase()} drains out of the ${target.name}. Its ${target.attack.name} lands plain, ${a.delay} cycles later.`, { moved: a.delay, stagger: false });
    if (!hasTalent(s, 'tarpit') || !alive(target) || !target.attack) return;
    target.throttledUntil = Math.max(target.throttledUntil || 0, target.attack.due);
    emit(s, 'status', `Tarpit: ${target.name} is Throttled until its attack lands, and its attacks deal half damage.`, { target: target.id, mark: 'throttled' });
  },
  retaliate(s, { target, e }) {
    if (!hasTalent(s, 'counterflow') || !alive(target) || !(e.ledger > 0)) return;
    const amount = blowbackOf(s);
    e.ledger = 0;
    hit(s, target, amount, { mine: true, by: 'Counterflow' });
  },
  harden(s, { e }) {
    if (!hasTalent(s, 'write-protect')) return;
    const d = defender(s), cost = Math.round(d.max * 0.1);
    d.integrity = Math.max(1, d.integrity - cost);
    e.chits = (e.chits || 0) + 1;
    emit(s, 'status', `Write Protect: a second ◆ (${e.chits} ◆ in all) for ${cost} Signal.`, { mark: 'shield', ability: 'harden' });
  },
  // Sysop
  patch(s, { a, to, e }) {
    // The generic Patch has healed; the Sysop's edge and talents act on what it did.
    const label = to === s ? a.name : `${a.name} from ${s.who || 'you'}`;
    const want = healScaled(s, (hasTalent(s, 'service-pack') ? a.pack : a.heal) + 3 * rank(s, 'patch-notes'));
    const got = lastHeal(to, label) ?? want;
    const d = defender(to);
    if (windowOpen(s)) mend(s, to, Math.round(want * A('maintenance-window').boost), label, { plain: true }); // Maintenance Window
    if (hasTalent(s, 'critical-path') && d.integrity - got < d.max / 3) mend(s, to, Math.round(want / 2), 'Critical Path', { loop: null });
    overprovision(to, want - got, capOf(s));
    if (hasTalent(s, 'loopback')) mend(s, s, Math.max(1, Math.round(want / 3)), 'Loopback', { looped: true, crit: false });
    // Under Overprovision, Patch's ticks run as the Sysop's own heal over time, so they spill into a shield too.
    const r = to.encounter.regen;
    if (r && r.name === label && (subEdge(s, 'sysop') || hasTalent(s, 'critical-path') || hasTalent(s, 'loopback'))) {
      to.encounter.regen = null;
      addHot(s, to, { id: 'patch', name: label, amount: r.amount, left: r.left, from: r.from });
    }
  },
  multicast(s, { a }) {
    const amount = healScaled(s, a.heal + 3 * rank(s, 'fan-out'));
    for (const x of crewOf(s)) mend(s, x.st, amount, x.me ? a.name : `${a.name} from ${s.who || 'you'}`);
    // The same packet floods every fragment for the heal, and splashes every other part (Ping Flood: the heal on every part).
    for (const p of livingParts(s)) hit(s, p, p.kind === 'fragment' || hasTalent(s, 'ping-flood') ? amount : scaled(s, a.splash), { mine: true, by: hasTalent(s, 'ping-flood') ? 'Ping Flood' : 'Multicast' });
  },
  heartbeat(s, { a, to }) {
    const label = to === s ? a.name : `${a.name} from ${s.who || 'you'}`;
    addHot(s, to, { id: 'heartbeat', name: label, amount: healScaled(s, a.tick + rank(s, 'tick-rate')), left: a.ticks, from: to.encounter.cycle });
    emit(to, 'status', `${label}: ${healScaled(s, a.tick + rank(s, 'tick-rate'))} a cycle for ${a.ticks} cycles.`, { mark: 'buff', ability: 'heartbeat' });
  },
  scrub(s, { a, to }) {
    const e = to.encounter, label = to === s ? a.name : `${a.name} from ${s.who || 'you'}`;
    const cleared = [];
    if (e.encrypt > 0 || e.burst) { e.encrypt = 0; e.burst = null; cleared.push('encryption'); } // a Full Disk's burst too (tells.mjs)
    if (e.corrupt) { e.corrupt = null; cleared.push('corruption'); } // a landed tell's after-effect (tells.mjs)
    if (e.scrambleUntil >= e.cycle) { e.scrambleUntil = 0; cleared.push('Scrambled'); }
    if (cleared.length) emit(to, 'decrypted', `${label}: ${cleared.join(' and ')} cleared.`);
    if (to.encounter.virus?.raid) cleanse(to, ['dots', 'absorb']); // a crew boss's Corruption and encrypted sectors (raid.mjs)
    mend(s, to, Math.round(healScaled(s, a.heal) * (cleared.length ? 1.5 : 1)), label); // half again with something to clean
  },
  rollback(s, { a, to }) {
    const e = to.encounter, u = e.undo, label = to === s ? a.name : `${a.name} from ${s.who || 'you'}`;
    e.undo = null;
    if (e.corrupt) { e.corrupt = null; emit(to, 'decrypted', `${label}: Corrupted wiped.`); }
    // A cast the virus just compiled rolls back too (tells.mjs): its buff ends.
    if (to === s && e.virus?.tells && undoCast(s)) emit(s, 'status', `${label}: the cast the virus compiled is rolled back.`, { mark: 'buff', ability: 'rollback' });
    if (u?.type === 'damage') mend(s, to, Math.round(u.amount * restoreMult(s)), label);
    if (u?.type === 'replicate') { const f = part(to, u.part); if (alive(f)) { f.integrity = 0; emit(to, 'heal', `${label}: ${f.name} deleted.`, { target: f.id }); } }
  },
  'hot-standby'(s, { a, to }) {
    to.encounter.standby = true;
    emit(to, 'status', `${to === s ? a.name : `${a.name} from ${s.who || 'you'}`}: the next attack that would drop ${nameOf(to)} to 0 leaves ${to === s ? 'you' : 'them'} at 1.`, { mark: 'buff', ability: 'hot-standby' });
  },
  rebalance(s, { a }) {
    const all = crewOf(s);
    if (all.length > 1) {
      const avg = all.reduce((n, x) => n + frac(x.st), 0) / all.length;
      for (const x of all) { const d = defender(x.st); d.integrity = Math.max(1, Math.min(d.max, Math.round(avg * d.max))); }
      emit(s, 'status', `Rebalance puts everyone at ${Math.round(avg * 100)}% of their Signal.`, { mark: 'buff', ability: 'rebalance' });
    }
    const amount = healScaled(s, a.heal) * (all.length > 1 ? 1 : 2); // alone, it heals you twice as much
    for (const x of all) mend(s, x.st, amount, x.me ? a.name : `${a.name} from ${s.who || 'you'}`);
  },
  reclaim(s, { res }) {
    if (!(res?.dealt > 0)) return;
    const amount = Math.max(1, Math.round(res.dealt * A('reclaim').lifesteal * restoreMult(s) * drawn(s)));
    // The generic lifesteal has healed you: what spilled past full is Overprovision's.
    overprovision(s, amount - (lastHeal(s, A('reclaim').name) ?? amount), capOf(s));
    if (windowOpen(s)) mend(s, s, Math.round(amount * A('maintenance-window').boost), 'Maintenance Window', { plain: true });
    if (!hasTalent(s, 'redistribute')) return;
    const others = alliesOf(s).filter((x) => defender(x.st).integrity > 0).sort((x, y) => frac(x.st) - frac(y.st));
    if (others.length) mend(s, others[0].st, amount, `Redistribute from ${s.who || 'you'}`);
    else mend(s, s, amount, 'Redistribute');
  },
};

const validate = {
  blowback(s) { return s.encounter.ledger > 0 ? null : 'Nothing has hit you since your last Blowback.'; },
  harden(s) {
    if (!hasTalent(s, 'write-protect')) return null;
    const d = defender(s);
    return d.integrity <= Math.round(d.max * 0.1) ? 'Write Protect needs 10% of your max Signal to spend.' : null;
  },
  rollback(s, intent) {
    const to = aimed(s, intent), e = to?.encounter, v = e?.virus;
    const cast = to === s && Object.values(v?.buffs || {}).some((u) => u >= e.cycle);
    return to && !e?.undo && !e?.corrupt && !cast ? `Nothing to roll back${to === s ? '' : ` on ${intent.ally}`}.` : null;
  },
  'hot-standby'(s, intent) {
    const to = aimed(s, intent);
    return to?.encounter?.standby ? `${to === s ? 'You are' : `${intent.ally} is`} already on standby.` : null;
  },
};

// ---------- the planner: how a Warden tanks and a Sysop heals ----------
const ok = (s, text) => !!text && !toIntent(s, text).error;
// Against a crew boss a healer keeps Patch for the Corruption it's about to cleanse (raid.mjs savePatch).
const first = (s, list) => list.find((c) => ok(s, c) && !(/^patch\b/.test(c) && savePatch(s)) && !(c === 'bulkhead' && saveBulkhead(s))) || null;
const landing = (s, cols = 0) => intents(s).filter((i) => i.col <= cols && !i.hidden && (i.effect === 'damage' || i.hit));

// The tells and parts a Bastion has a button for (tells.mjs), solo or in a crew: a charge drained with Suspend,
// a cast Quarantined when SIGINT is cooling, a loud part Throttled, fragments shut out with DMZ.
const killNow = (s) => livingParts(s).some((p) => !(p.armor > 0) && ['retaliate', 'rate-limit', 'reclaim', 'spike'].some((id) => ok(s, id + ' ' + p.id) && previewDamage(s, id, p) >= p.integrity));
const cooling = (s, id) => !usable(s).includes(id) || readyIn(s, id) > 0;
function readBoard(s) {
  const e = s.encounter, c = e.cycle;
  for (const p of livingParts(s)) {
    const ch = tellOpen(s, p, 'charge'); // in its window: before it, Suspend only pushes the charge back
    if (ch && p.attack && ch.n === (p.attack.n || 0) && ok(s, 'suspend ' + p.id)) return 'suspend ' + p.id;
    const cast = tellOpen(s, p, 'cast');
    if (cast && cooling(s, 'sigint') && ok(s, 'quarantine ' + p.id)) return 'quarantine ' + p.id;
  }
  const loud = attackers(s).find((p) => (p.loud || e.virus.buffs?.loud >= c || (p.enrage && p.integrity < p.max / 2)) && p.attack.due - c <= 2 && !on(s, p, 'throttled'));
  if (loud && ok(s, 'throttle ' + loud.id)) return 'throttle ' + loud.id;
  // A charge Suspend can't drain (cooling, or not yours): Throttle halves it.
  const charged = livingParts(s).find((p) => { const ch = tellOn(s, p, 'charge'); return ch && p.attack && ch.n === (p.attack.n || 0) && p.attack.due - c <= 1 && !on(s, p, 'throttled'); });
  if (charged && !ok(s, 'suspend ' + charged.id) && ok(s, 'throttle ' + charged.id)) return 'throttle ' + charged.id;
  // Two fragments gnawing: DMZ, and the bites do nothing.
  if (livingParts(s).filter((p) => p.kind === 'fragment').length >= 2 && !buffed(e, 'dmz') && ok(s, 'dmz')) return 'dmz';
  return null;
}
// A Scramble, a Possession or the Mimic's beat coming next cycle: the honeypot takes it.
const honeyMoment = (s) => { const e = s.encounter; return attackers(s).some((p) => p.attack.effect === 'scramble' && p.attack.due - e.cycle <= 1) || livingParts(s).some((p) => p.mimic && tellOn(s, p, 'mimic')); };
function wardenPlan(s, t) {
  const raid = tankMove(s); // a crew boss: hold aggro for its busters (raid.mjs)
  if (raid) return raid;
  const e = s.encounter, d = defender(s), allies = alliesOf(s);
  // Circuit Breaker: a charge or a big hit landing in the next two cycles, or a boss leaning on you.
  const surge = landing(s, 1).reduce((n, i) => Math.max(n, i.hit || i.amount || 0), 0);
  if (!buffed(e, 'circuit-breaker') && (surge >= d.max * 0.3 || (e.virus.boss && surge >= d.max * 0.2 && d.integrity < d.max * 0.6)) && ok(s, 'circuit-breaker')) return 'circuit-breaker';
  if (!(e.buffs?.honeypot >= e.cycle) && honeyMoment(s) && ok(s, 'honeypot')) return 'honeypot';
  // A Replicate landing now: DMZ, and it spawns nothing.
  if (attackers(s).some((p) => p.attack.effect === 'replicate' && p.attack.due <= e.cycle) && !buffed(e, 'dmz') && ok(s, 'dmz')) return 'dmz';
  // A charge landing now that nobody called off, or two hits at once, with Bulkhead cooling: DMZ takes 30% off for two cycles.
  const pile = landing(s, 0);
  if (!allies.length && (pile.length >= 2 || pile.some((i) => i.tell === 'charge')) && !buffed(e, 'dmz') && !buffed(e, 'bulkhead') && !ok(s, 'bulkhead') && !pile.some((i) => ok(s, 'suspend ' + i.source)) && ok(s, 'dmz')) return 'dmz';
  if (killNow(s)) return null;
  const read = readBoard(s);
  if (read) return read;
  // DMZ as a general cooldown: a heavy cycle on its way (a fifth of your max or more, now or next cycle) with
  // nothing else cutting it.
  const heavy = landing(s, 1).reduce((n, i) => n + (i.hit || i.amount || 0), 0);
  if (!allies.length && heavy >= d.max * 0.2 && !buffed(e, 'dmz') && !buffed(e, 'bulkhead') && !buffed(e, 'circuit-breaker') && !(landing(s, 0).length && ok(s, 'bulkhead')) && ok(s, 'dmz')) return 'dmz';
  // A charge landing now that nobody called off: Bulkhead takes three quarters off it.
  if (landing(s, 0).some((i) => i.tell === 'charge' && (i.hit || i.amount) >= d.max * 0.12) && !buffed(e, 'bulkhead') && ok(s, 'bulkhead')) return 'bulkhead';
  const now = landing(s, 0);
  const incoming = now.reduce((n, i) => n + (i.hit || i.amount), 0);
  const drawing = e.buffs?.sinkhole >= e.cycle;
  if (allies.length) {
    // The tank: when attacks are about to land on everyone, or the crew is hurt, pull the fire.
    const hurt = allies.some((x) => frac(x.st) < 0.7);
    if (!drawing && (now.length || (hurt && landing(s, 1).length))) {
      const pull = first(s, [d.integrity > d.max * 0.35 && 'bulkhead', d.integrity > d.max * 0.35 && 'firewall', now.length && 'dmz']);
      if (pull) return pull;
    }
    // Drawing fire with a big hit coming: armor up.
    if (drawing && incoming >= d.max * 0.12 && !e.chits) { const c = first(s, ['harden']); if (c) return c; }
  } else if (!buffed(e, 'bulkhead') && (now.length >= 2 || (incoming >= d.max * 0.12 && !ok(s, 'rate-limit ' + now[0].source) && !ok(s, 'suspend ' + now[0].source)))) {
    // Alone: two attacks at once, or a big one that Rate Limit and Suspend can't answer.
    if (ok(s, 'bulkhead')) return 'bulkhead';
  }
  // Blowback once it's worth a real hit: enough to break the part, or most of its cap.
  const bb = e.ledger > 0 && usable(s).includes('blowback') ? blowbackOf(s) : 0;
  if (bb && alive(t) && (t.armor > 0 ? t.armor >= 2 && bb >= scaled(s, 20) : bb >= Math.min(t.integrity, scaled(s, A('blowback').cap) * 0.6))) {
    if (ok(s, 'blowback ' + t.id)) return 'blowback ' + t.id;
  }
  return null;
}

// Revoke a part that heals, patches or grows (a Patcher, a Tap, a Self-Update, armor about to patch back).
const healerPart = (s) => livingParts(s).find((p) => !(p.revokedUntil >= s.encounter.cycle) && (p.attack?.effect === 'heal' || p.attack?.siphon || tellOn(s, p, 'cast')?.does === 'grow' || (p.maxArmor > 0 && p.armor === 0 && p.patchAt != null && p.patchAt - s.encounter.cycle <= 1)));
// When the Sysop bot heals (shares of max Signal). Alone it keeps its heals for when it's in trouble, so a
// Sysop solo is the weaker one on purpose; in a crew it heals ahead of the damage, most cycles.
export const HEAL = {
  urgent: 0.3, // anyone under this: Hot Standby, then the biggest heal there is
  solo: 0.3, // alone: Patch, Heartbeat (and Multicast a little lower) only under this
  soloTop: 0.75, // alone: Multicast and Rebalance top you up under this
  crew: 0.8, // in a crew: Patch the lowest under this
  crewAll: 0.85, // in a crew: Multicast when two or more are under this
  topUp: 0.95, // in a crew: keep a Heartbeat on the lowest under this
};
function sysopPlan(s, t) {
  const raid = healMove(s); // a crew boss: cleanse, and pre-heal whoever a big hit is marked for (raid.mjs)
  if (raid) return raid;
  const e = s.encounter;
  const all = crewOf(s).filter((x) => x.me || defender(x.st).integrity > 0).map((x) => ({ ...x, f: frac(x.st) })).sort((a, b) => a.f - b.f);
  const solo = all.length === 1;
  const low = all[0];
  // Fragments up: one Multicast floods them all (and heals) where a Spike takes one.
  if (livingParts(s).filter((p) => p.kind === 'fragment').length >= 2) { const c = first(s, ['multicast']); if (c) return c; }
  if (solo && killNow(s)) return null;
  // Maintenance Window: plan it for the cycles that hurt (alone under 60% with a hit coming; in a crew, two hurt).
  if (!buffed(e, 'maintenance-window') && ((solo && low.f < 0.6 && landing(s, 1).length) || (!solo && all.filter((x) => x.f < 0.75).length >= 2))) { const c = first(s, ['maintenance-window']); if (c) return c; }
  const heals = healerPart(s);
  if (heals) { const c = first(s, ['revoke ' + heals.id]); if (c) return c; }
  // Alone, Revoke is a general answer too: the part that hits hardest, its attack a cycle out, deals less while it's revoked.
  // (In a crew the healer heals; the crew's damage dealers take the part down.)
  const hardest = solo && attackers(s).filter((p) => !(p.revokedUntil >= e.cycle) && p.attack.effect === 'damage').sort((a, b) => b.attack.amount / b.attack.interval - a.attack.amount / a.attack.interval)[0];
  if (hardest && hardest.attack.due - e.cycle <= 1 && attackAmount(hardest) >= defender(low.st).max * 0.1) { const c = first(s, ['revoke ' + hardest.id]); if (c) return c; }
  // The tells a healer reads: a Heartbeat up before a charge lands (it lands half), Rollback after a hit or a
  // cast that got through, Scrub on Corrupted, Multicast into fragments.
  const charge = intents(s).find((i) => i.tell === 'charge' && i.col <= 1 && (i.hit || i.amount) >= defender(low.st).max * 0.12);
  const beating = (x) => x.st.encounter.hots?.some((h) => h.id === 'heartbeat' && h.left > 1);
  const aimedAt = !solo && charge ? all.find((x) => !x.me && x.st.encounter.buffs?.sinkhole >= x.st.encounter.cycle) || all.find((x) => x.me) : all.find((x) => x.me);
  if (charge && !beating(aimedAt)) { const c = first(s, [aim(s, 'heartbeat', aimedAt.st)]); if (c) return c; }
  if (solo && e.virus?.tells && Object.values(e.virus.buffs || {}).some((u) => u >= e.cycle + 2)) { const c = first(s, ['rollback']); if (c) return c; }
  const dirtyNow = all.find((x) => x.st.encounter.corrupt?.left >= 2);
  if (dirtyNow) { const c = first(s, [aim(s, 'scrub', dirtyNow.st), dirtyNow.me && 'purge ' + t.id]); if (c) return c; }
  { const read = readBoard(s); if (read && solo) return read; }
  // Encryption (on the player who leads the fight) or a scramble: scrub it.
  const dirty = all.find((x) => x.st.encounter.encrypt >= 6 || x.st.encounter.burst || x.st.encounter.scrambleUntil >= x.st.encounter.cycle);
  if (dirty && !solo) { const c = first(s, [aim(s, 'scrub', dirty.st)]); if (c) return c; }
  // Someone about to go: standby, then the biggest heal there is.
  if (low.f < HEAL.urgent) {
    const c = first(s, [!low.st.encounter.standby && aim(s, 'hot-standby', low.st), aim(s, 'patch', low.st), aim(s, 'rollback', low.st), !solo && 'multicast', aim(s, 'heartbeat', low.st), aim(s, 'scrub', low.st)]);
    if (c) return c;
  }
  // Two or more hurt: the crew heal.
  if (all.filter((x) => x.f < HEAL.crewAll).length >= 2) { const c = first(s, ['multicast']); if (c) return c; }
  // Uneven crew: rebalance.
  if (!solo && all.at(-1).f - low.f > 0.45 && low.f < 0.5) { const c = first(s, ['rebalance']); if (c) return c; }
  const undo = (x) => (x.st.encounter.undo?.type === 'damage' ? x.st.encounter.undo.amount : 0);
  const hb = (x) => x.st.encounter.hots?.some((h) => h.id === 'heartbeat' && h.left > 0);
  if (low.f < (solo ? HEAL.solo : HEAL.crew)) {
    const c = first(s, [aim(s, 'patch', low.st), undo(low) >= defender(low.st).max * 0.12 && aim(s, 'rollback', low.st), !hb(low) && aim(s, 'heartbeat', low.st), !solo && 'multicast']);
    if (c) return c;
  }
  // Keep the tank (whoever is drawing fire) and anyone slipping on a heartbeat.
  const tank = all.find((x) => !x.me && x.st.encounter.buffs?.sinkhole >= x.st.encounter.cycle);
  if (tank && tank.f < 0.9 && !hb(tank)) { const c = first(s, [aim(s, 'heartbeat', tank.st)]); if (c) return c; }
  if (!solo && low.f < HEAL.topUp && !hb(low)) { const c = first(s, [aim(s, 'heartbeat', low.st)]); if (c) return c; }
  if (dirty) { const c = first(s, [aim(s, 'scrub', dirty.st)]); if (c) return c; }
  // Alone: keep a heartbeat going once you're hurt; Multicast when it's all there is (with Ping
  // Flood it's also a hit on every part).
  if (solo && low.f < HEAL.solo && !hb(low)) { const c = first(s, ['heartbeat']); if (c) return c; }
  if (hasTalent(s, 'ping-flood') && livingParts(s).filter((p) => !p.armor).length >= 2) { const c = first(s, ['multicast']); if (c) return c; }
  if (solo && low.f < HEAL.solo - 0.05) { const c = first(s, ['multicast']); if (c) return c; }
  // Alone, Multicast and Rebalance are top-ups: a heal and, for Multicast, a hit on every part.
  if (solo && low.f < HEAL.soloTop) { const c = first(s, ['multicast', 'rebalance']); if (c) return c; }
  return null;
}

// A sim crewmate's bar (crew.mjs builds bots with the default bar): the slots' worth its role wants,
// of the ones it knows. A Warden keeps its tanking kit, a Sysop its heals (the crew tank and crew healer builds,
// docs/kits.md 4.3 and 4.4).
const BOT_BAR = {
  warden: ['rate-limit', 'firewall', 'retaliate', 'bulkhead', 'blowback', 'harden', 'dmz', 'suspend', 'purge', 'circuit-breaker', 'reject', 'throttle', 'quarantine', 'failover'],
  sysop: ['rate-limit', 'firewall', 'patch', 'multicast', 'hot-standby', 'heartbeat', 'scrub', 'rollback', 'maintenance-window', 'retaliate', 'purge', 'rebalance', 'reclaim', 'checksum'],
};
// The Warden's and the Sysop's cheap core hits, before key 1 (planner.mjs).
function fill(s, t) {
  if (classOf(s) !== 'bastion' || !t) return [];
  const sub = subOf(s);
  if (sub === 'warden') { const g = alive(part(s, s.encounter.grudge)) ? part(s, s.encounter.grudge) : null; return [g && 'reject ' + g.id, 'reject ' + t.id, 'throttle ' + t.id]; }
  if (sub === 'sysop') return ['checksum ' + t.id, 'revoke ' + t.id];
  return [];
}

export default {
  use,
  validate,
  fill,
  start(s) {
    const e = s.encounter;
    e.ledger = 0; e.hots = []; e.standby = false;
    const sub = classOf(s) === 'bastion' && s.who && s.host && !s.guest ? subOf(s) : null;
    if (BOT_BAR[sub]) { const known = knownSkills(s, 'bastion'); s.loadout.equipped[sub] = BOT_BAR[sub].filter((id) => known.includes(id)).slice(0, slotsOf(s, 'bastion')); }
  },
  // Heals over time from a Sysop tick at the end of the player's turn.
  cycle(s) {
    const e = s.encounter;
    if (!e.hots?.length) return;
    for (const h of e.hots) {
      if (h.left <= 0 || h.from > e.cycle) continue;
      const by = h.loop ? caster(s, h.loop) : null;
      mend(by || s, s, h.amount, h.name, { cap: h.cap, crit: h.crit, loop: by });
      h.left--;
    }
    e.hots = e.hots.filter((h) => h.left > 0);
  },
  // Bulkhead and DMZ cut what lands on you (DMZ from anyone in the fight); the Warden logs every attack's size for Blowback.
  taken(s, atk, p) {
    const e = s.encounter;
    let m = 1;
    if (buffed(e, 'bulkhead')) m *= 1 - (atk.tell ? A('bulkhead').charged : A('bulkhead').cut); // a charged hit (tells.mjs): a quarter
    if (buffed(e, 'dmz') || alliesOf(s).some((x) => x.st.encounter?.buffs?.dmz >= e.cycle)) {
      const size = atk.effect === 'damage' ? attackAmount(p) : atk.hit || 0;
      m *= p.kind === 'fragment' || size < defender(s).max * A('dmz').minor ? 0 : 1 - A('dmz').cut; // the small stuff doesn't get in
    }
    // Revoke (Sysop): a revoked part's attacks deal less, on anyone.
    if (p?.revokedUntil >= e.cycle) m *= 1 - A('revoke').weaken;
    // Heartbeat (Sysop) running on you: a charged hit deals half.
    if (atk.tell && e.hots?.some((h) => h.id === 'heartbeat' && h.left > 0)) m *= 0.75;
    if (classOf(s) === 'bastion' && subOf(s) === 'warden' && usable(s).includes('blowback')) e.ledger = (e.ledger || 0) + attackSize(s, atk, p);
    return m;
  },
  // Circuit Breaker caps a hit at a tenth of your max (the rest goes to Blowback); Honeypot takes some off the next.
  absorb(s, amount, atk, p) {
    const e = s.encounter;
    if (classOf(s) !== 'bastion' || !e) return amount;
    if (e.buffs?.honeypot >= e.cycle && e.honeyCut > 0 && amount > 0) { const cut = Math.min(amount, e.honeyCut); e.honeyCut = 0; amount -= cut; emit(s, 'blocked', `The honeypot takes ${cut} of ${atk.name}.`, { source: p?.id, ability: 'honeypot' }); }
    const cap = Math.max(1, Math.round(defender(s).max * A('circuit-breaker').most));
    if (buffed(e, 'circuit-breaker') && amount > cap) {
      if (subOf(s) === 'warden' && usable(s).includes('blowback')) e.ledger = (e.ledger || 0) + (amount - cap);
      emit(s, 'blocked', `Circuit Breaker trips: ${atk.name} takes ${cap} instead of ${amount}.`, { source: p?.id, ability: 'circuit-breaker' });
      return cap;
    }
    return amount;
  },
  // Hot Standby: an attack that drops a player on standby to 0 leaves them at 1.
  struck(s, atk, dealt, p) {
    const e = s.encounter, d = defender(s);
    if (e.standby && d.integrity <= 0) {
      e.standby = false;
      d.integrity = 1;
      emit(s, 'heal', `Hot Standby: ${s.who || 'you'} ${s.who ? 'holds' : 'hold'} at 1.`, { amount: 1 });
    }
  },
  // Vendetta (Grudge +5% a rank) and Kernel Panic (+30% under a third).
  // Maintenance Window: your hits heal you for a quarter of what they deal.
  hit(s, p, res, opts) {
    if (!windowOpen(s) || !opts.mine || opts.dot || opts.server || !(res.dealt > 0)) return;
    mend(s, s, Math.max(1, Math.round(res.dealt * A('maintenance-window').share * restoreMult(s) * drawn(s))), 'Maintenance Window', { plain: true, loop: null });
  },
  drawn: (s) => drawn(s),
  dealt(s, p, opts) {
    if (!opts.mine || opts.server) return 1;
    let m = 1;
    // A healer alone (the Sysop with no crew): its hits are small, so a solo fight takes it about twice as long.
    m *= aloneCut(s);
    if (rank(s, 'vendetta') && s.encounter.grudge === p.id && subEdge(s, 'warden')) m *= 1 + 0.05 * rank(s, 'vendetta');
    if (hasTalent(s, 'kernel-panic')) { const d = defender(s); if (d.integrity < d.max / 3) m *= 1.3; }
    return m;
  },
  plan(s, t) {
    if (classOf(s) !== 'bastion') return null;
    const sub = subOf(s);
    return sub === 'warden' ? wardenPlan(s, t) : sub === 'sysop' ? sysopPlan(s, t) : !sub ? tankMove(s) : null; // before subclasses a Bastion tanks
  },
};

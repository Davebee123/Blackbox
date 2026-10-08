// Infiltrator subclasses, the engine side: what the subclass skills, talents and edges do, and how
// the planner plays them. The data (skills, trees) is in ./infiltrator.data.mjs.
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
// Payload: Bloom (a broken part's burns jump on), Wormable (spreads a copy a cycle), Polymorph (a burn
// through armor, ticked here), Thrash (burns on a part tick twice), IRQ Storm (every burn ticks now).
// Phantom: Backstab (crits on a part that isn't about to attack), Shadow Copy (a decoy eats the next
// hit), Log Wipe (Weak Spot fresh again). Weak Spot itself is in combat.mjs (edge(s, 'infiltrator')).
import { CONFIG, ABILITIES } from '../data.mjs';
import { soonest, doomed } from '../planner.mjs';
import { tellOn, tellHit } from '../tells.mjs';
import { subOf, subEdge, hasTalent, rank, emit, hit, part, alive, livingParts, attackers, soonestAttacker, burnsOn, classOf, alliesOf, openProc, scaled, toIntent, intents, defender, on, virusIntegrity, previewDamage, mirrorOn, usable, readyIn } from '../combat.mjs';

const A = (id) => ABILITIES[id];
const isInf = (s) => classOf(s) === 'infiltrator';
const talent = (s, id) => isInf(s) && hasTalent(s, id);
const ranked = (s, id) => (isInf(s) ? rank(s, id) : 0);
// This player's own Infiltrator state in the fight. Crewmates' encounters are shallow copies of the
// leader's, so a state that isn't tagged with this player's name is someone else's: start over.
function mine(s) {
  const e = s.encounter, who = s.who || '';
  if (!e.infil || e.infil.who !== who) e.infil = { who, poly: [], weakDot: {}, decoy: null, wiped: false, implants: 0 };
  return e.infil;
}
const virulence = (s) => (ranked(s, 'virulence') ? scaled(s, 2 * ranked(s, 'virulence')) : 0); // Virulence (Payload filler): +2 a tick a rank
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
// Polymorph's burns: kept apart from the engine's (which armor stops) and ticked here, through armor.
const polyOn = (s, p) => (s.encounter.infil?.who === (s.who || '') ? s.encounter.infil.poly.filter((b) => b.target === p.id) : []);
const allBurnsOn = (s, p) => [...burnsOn(s, p), ...polyOn(s, p)];
// Polymorph burns full through ◆ and half once the part is bare.
const tick = (s, b, t, by = b.name) => hit(s, t, (b.poly && !(t.armor > 0) ? b.bare ?? Math.max(1, Math.round(b.damage / 2)) : b.damage) + (b.fxGrow || 0), { by, dot: true, synced: b.synced, pierce: !!b.poly });
// Everyone standing in this fight, you first (crewmates' states too): Bloom and Thrash reach them all.
const everyone = (s) => { const out = [s]; for (const x of alliesOf(s)) if (x.st && !out.includes(x.st)) out.push(x.st); return out; };
const thrashing = (s, p) => alive(p) && p.thrashUntil >= s.encounter.cycle;
const SEEN = 'infilSeen'; // the burns at the end of this player's last turn (for Thrash), never saved

// Bloom (Payload's edge): the burns on a part that just broke jump to the part attacking soonest, a
// cycle shorter (Superspreader: copies go to every other part too). For every Payload in the fight,
// whoever broke it; before the engine drops burns on dead parts at the end of the turn.
function bloom(s, p) {
  if (!subEdge(s, 'payload')) return;
  const e = s.encounter;
  const moving = [...e.burns.filter((b) => b.target === p.id && b.left > 1), ...(e.infil?.who === (s.who || '') ? e.infil.poly.filter((b) => b.target === p.id && b.left > 1) : [])];
  if (!moving.length) return;
  const next = soonestAttacker(s, p.id);
  if (!next || !alive(next)) return;
  for (const b of moving) { b.target = next.id; b.left--; }
  let copies = 0;
  if (talent(s, 'superspreader')) {
    for (const x of livingParts(s)) if (x !== next) for (const b of moving) { (b.poly ? mine(s).poly : e.burns).push({ ...b, target: x.id, spreads: false }); copies++; }
  }
  emit(s, 'status', `Bloom: ${plural(moving.length, 'burn')} jump${moving.length === 1 ? 's' : ''} from the ${p.name} to the ${next.name}${copies ? `, and Superspreader copies ${copies === 1 ? 'one' : 'them'} to every other part` : ''}.`, { target: next.id, mark: 'burn' });
}

// Backstab crits when the part's attack isn't due this cycle or the next.
// Backstab crits a part busy with a tell (tells.mjs): a charge winding up, a cast compiling, a seal, the Mimic recording.
const notDue = (s, p) => !!tellOn(s, p);

export default {
  use: {
    // Wormable: the cast one spreads (its copies don't).
    wormable(s, { target, e }) {
      const b = e.burns.filter((x) => x.id === 'wormable' && x.target === target.id).at(-1);
      if (!b) return;
      b.spreads = true;
      b.damage += virulence(s);
    },
    skim(s, { target, e }) { const b = e.burns.filter((x) => x.id === 'skim' && x.target === target.id).at(-1); if (b) b.damage += virulence(s); },
    // Polymorph: out of the engine's burns, into our own (ticked through armor in cycle).
    polymorph(s, { a, target, e }) {
      const b = e.burns.filter((x) => x.id === 'polymorph' && x.target === target.id).at(-1);
      if (!b) return;
      e.burns.splice(e.burns.indexOf(b), 1);
      b.damage += virulence(s);
      b.bare = scaled(s, a.bareTick) + virulence(s); // on a bare part it burns for 10, never less than a Spike's worth over its run
      b.poly = true;
      mine(s).poly.push(b);
    },
    'logic-trap'(s) {
      mine(s).trap = true;
      emit(s, 'status', 'Logic Trap set: the next hit on you deals half, and its part catches your burns.', { mark: 'shield', ability: 'logic-trap' });
    },
    outbreak(s, { a, e }) {
      const tick = scaled(s, A('inject').tick + 2 * rank(s, 'heap-spray'));
      for (const p of livingParts(s)) {
        const there = e.burns.filter((b) => b.id === 'inject' && b.target === p.id);
        if (there.length >= 3) e.burns.splice(e.burns.indexOf(there[0]), 1);
        e.burns.push({ id: 'inject', target: p.id, damage: tick, grow: 0, left: a.ticks, name: 'Inject', drain: 0, synced: !!e.synced });
      }
      e.stickyUntil = e.cycle + a.cycles - 1;
      emit(s, 'status', `Outbreak: every part catches an Inject, ${tick} a cycle, and for ${a.cycles} cycles nothing clears your burns.`, { mark: 'burn', ability: 'outbreak' });
    },
    fingerprint(s, { target, e }) {
      if (!alive(target) || !e.weakHit) return;
      delete e.weakHit[target.id];
      emit(s, 'status', `Fingerprinted: Weak Spot is fresh on the ${target.name}.`, { target: target.id, ability: 'fingerprint' });
    },
    'side-channel'(s, { a, target, e }) { if (alive(target)) target.seenUntil = Math.max(target.seenUntil || 0, e.cycle + a.cycles - 1); },
    unmask(s, { a, target, e }) {
      if (!alive(target)) return;
      target.seenUntil = Math.max(target.seenUntil || 0, e.cycle + a.cycles - 1);
      if (target.reflect || target.mimic) target.unmaskUntil = e.cycle + a.cycles;
      emit(s, 'status', `${target.name} unmasked: its veil is down for ${a.cycles} cycles${target.reflect || target.mimic ? ', and it has nothing of you to copy on its next beat' : ''}.`, { target: target.id, mark: 'debuff', ability: 'unmask' });
    },
    'rotate-keys'(s, { e }) {
      const cleared = [];
      if (e.encrypt > 0 || e.burst) { e.encrypt = 0; e.burst = null; cleared.push('encryption'); }
      if (e.corrupt) { e.corrupt = null; cleared.push('Corrupted'); }
      if (e.scrambleUntil >= e.cycle) { e.scrambleUntil = 0; cleared.push('Scrambled'); }
      mine(s).rotated = true;
      emit(s, 'status', `Keys rotated${cleared.length ? `: ${cleared.join(' and ')} cleared` : ''}. The next hit on you deals 30% less.`, { mark: 'shield', ability: 'rotate-keys' });
    },
    vanish(s, { a, e }) {
      e.nullRoute = Math.max(e.nullRoute || 0, a.misses);
      e.slipLong = a.misses; // each miss leaves Opening lit for 2 cycles (combat.mjs landAttack)
      e.weakHit = {};
      mine(s).weakDot = {};
      emit(s, 'status', `Vanished: the next ${a.misses} attacks on you miss, and Weak Spot is fresh on every part.`, { mark: 'buff', ability: 'vanish' });
    },
    thrash(s, { target, a, e }) {
      target.thrashUntil = e.cycle + a.cycles - 1;
      emit(s, 'status', `${target.name} Thrashing for ${plural(a.cycles, 'cycle')}: every burn on it ticks twice a cycle.`, { target: target.id, mark: 'burn', ability: 'thrash' });
    },
    'irq-storm'(s, { e }) {
      const all = [...e.burns, ...mine(s).poly];
      let n = 0;
      const reached = new Set();
      for (const b of all) { if (virusIntegrity(s).current === 0) break; const t = part(s, b.target); if (alive(t)) { tick(s, b, t, `IRQ Storm (${b.name})`); n++; reached.add(t); } }
      // Each part it reaches takes it as a hit from your command (tells.mjs).
      for (const t of reached) if (alive(t)) tellHit(s, t, { cmd: { id: 'irq-storm', target: t.id, at: e.commanding?.at ?? e.cycle }, key: `irq:${e.cycle}:${s.who || ''}:${t.id}` });
      emit(s, 'status', `IRQ Storm: ${plural(n, 'burn')} ticked at once.`, { mark: 'burn', ability: 'irq-storm' });
    },
    // Detonate and Keepalive reach Polymorph's burns too.
    detonate(s, { target }) {
      const st = mine(s), poly = polyOn(s, target);
      if (!poly.length || !alive(target)) return;
      let total = 0;
      for (const b of poly) { total += b.damage * b.left; st.poly.splice(st.poly.indexOf(b), 1); }
      hit(s, target, Math.round(total * 1.5 * (talent(s, 'assassinate') && on(s, target, 'tagged') ? 2 : 1)), { by: 'Detonate', pierce: true });
    },
    keepalive(s, { target, a, e }) { for (const b of polyOn(s, target)) { if (alive(target)) tick(s, b, target, `Keepalive (${b.name})`); b.left += e.surprise ? CONFIG.surprise.keepalive : a.cycles; } },
    // Contagion (Payload talent): the new Inject also starts on the part attacking soonest.
    inject(s, { target, e }) {
      if (!talent(s, 'contagion')) return;
      const b = e.burns.filter((x) => x.id === 'inject' && x.target === target.id).at(-1);
      const to = attackers(s).filter((p) => p !== target).sort((x, y) => x.attack.due - y.attack.due)[0] || livingParts(s).find((p) => p !== target);
      if (!b || !to) return;
      const there = e.burns.filter((x) => x.id === 'inject' && x.target === to.id);
      if (there.length >= 3) e.burns.splice(e.burns.indexOf(there[0]), 1);
      e.burns.push({ ...b, target: to.id });
      emit(s, 'status', `Contagion: the Inject spreads to the ${to.name}.`, { target: to.id, mark: 'burn' });
    },
    // Persistence (Payload talent): a second Implant.
    implant(s, { e }) {
      const st = mine(s);
      st.implants++;
      if (talent(s, 'persistence') && st.implants < 2) { delete e.once.implant; emit(s, 'status', 'Persistence: one more Implant this fight.'); }
    },
    'shadow-copy'(s, { to }) {
      const st = mine(to);
      st.decoy = { from: s.who || '' };
      emit(s, 'status', `Shadow Copy: a decoy of ${to === s ? 'you' : to.who} takes the next hit.`, { mark: 'shield', ability: 'shadow-copy' });
    },
    'log-wipe'(s, { e }) {
      e.weakHit = {};
      const st = mine(s);
      st.weakDot = {};
      st.wiped = true;
      e.mimicBlind = true; // the Mimic's next beat has nothing of you (tells.mjs)
      let extra = '';
      if (talent(s, 'deep-cover')) { delete e.readyAt['null-route']; delete e.readyAt['shadow-copy']; extra = ' Deep Cover: Null Route and Shadow Copy are ready.'; }
      emit(s, 'status', `Logs wiped. Weak Spot is fresh on every part, and the next hit on you deals half.${extra}`, { mark: 'buff', ability: 'log-wipe' });
    },
  },
  validate: {
    'irq-storm': (s) => (s.encounter.burns.length || mine(s).poly.length ? null : 'No burns running.'),
  },
  start(s) { if (isInf(s)) mine(s); },
  cycle(s) {
    const e = s.encounter;
    // Thrash: every burn on a Thrashing part ticks again (anyone's; the extra tick costs nothing). A burn
    // whose last tick was this cycle is already gone from the list: last turn's (kept off the save, and
    // off crewmates' copies of the encounter) still has it.
    const ended = (e[SEEN] || []).filter((b) => b.left <= 0 && !e.burns.includes(b));
    for (const b of [...ended, ...e.burns]) { if (virusIntegrity(s).current === 0) break; const t = part(s, b.target); if (thrashing(s, t)) tick(s, b, t, `${b.name} (thrash)`); }
    Object.defineProperty(e, SEEN, { value: e.burns.length ? [...e.burns] : null, writable: true, configurable: true, enumerable: false });
    if (virusIntegrity(s).current === 0) return;
    if (!isInf(s)) return;
    const st = mine(s);
    // Polymorph's burns tick through armor, twice on a Thrashing part.
    for (const b of [...st.poly]) {
      if (virusIntegrity(s).current === 0) break;
      const t = part(s, b.target);
      if (alive(t)) { tick(s, b, t); if (thrashing(s, t)) tick(s, b, t, `${b.name} (thrash)`); }
      b.left--;
    }
    st.poly = st.poly.filter((b) => b.left > 0 && alive(part(s, b.target)));
    // Wormable: each one cast spreads a copy to a part that has none yet.
    for (const b of e.burns.filter((x) => x.id === 'wormable' && x.spreads && x.left > 0)) {
      const has = new Set(e.burns.filter((x) => x.id === 'wormable').map((x) => x.target));
      const to = attackers(s).filter((p) => !has.has(p.id)).sort((x, y) => x.attack.due - y.attack.due)[0] || livingParts(s).find((p) => !has.has(p.id));
      if (!to) continue;
      e.burns.push({ ...b, target: to.id, spreads: false });
      emit(s, 'status', `Wormable spreads to the ${to.name}.`, { target: to.id, mark: 'burn' });
    }
  },
  dealt(s, p, opts) {
    if (!isInf(s)) return 1;
    const e = s.encounter;
    let m = 1;
    if (opts.by === 'Detonate') m *= 1 + 0.1 * rank(s, 'shaped-charge');
    // Cold Open: the hit Weak Spot is about to crit.
    if (opts.mine && !opts.dot && !opts.by && subEdge(s, 'phantom') && !(opts.pierce && p.armor > 0) && !e.weakHit?.[p.id]) m *= 1 + 0.05 * rank(s, 'cold-open');
    if (opts.mine && !opts.dot && !opts.by && e.lastSkill === 'backstab') m *= 1 + 0.1 * rank(s, 'pivot');
    return m;
  },
  crit(s, p, opts) {
    if (!isInf(s)) return 0;
    const e = s.encounter;
    if (opts.mine && !opts.dot && !opts.by && e.lastSkill === 'backstab' && notDue(s, p)) return 100;
    // Blind Spot (Phantom talent): your first burn tick on each part crits too.
    if (opts.dot && subEdge(s, 'phantom') && hasTalent(s, 'blind-spot')) { const st = mine(s); if (!st.weakDot[p.id]) { st.weakDot[p.id] = true; return 100; } }
    return 0;
  },
  taken(s, atk, p) {
    const st = s.encounter?.infil;
    if (!st || st.who !== (s.who || '')) return 1;
    if (st.decoy) {
      const from = st.decoy.from;
      st.decoy = null;
      emit(s, 'blocked', `${atk.name} hits the shadow copy. It does nothing.`, {});
      const caster = everyone(s).find((x) => (x.who || '') === from) || s;
      openProc(caster, 'slipped');
      return 0;
    }
    let m = 1;
    if (st.wiped) { st.wiped = false; emit(s, 'blocked', `${atk.name} can't find you in the logs: it deals half.`, {}); m *= 0.5; }
    if (st.rotated) { st.rotated = false; emit(s, 'blocked', `${atk.name} hits a key you've already rotated: it deals 30% less.`, {}); m *= 1 - A('rotate-keys').cut; }
    // Logic Trap: the hit deals half, and the part that lands it catches a copy of every burn on your target.
    if (st.trap && p) {
      st.trap = false;
      const e = s.encounter, at = part(s, (e.lastAttack || '').split(' ')[1]) || null;
      const copies = at && at !== p && alive(p) ? e.burns.filter((b) => b.target === at.id) : [];
      for (const b of copies) e.burns.push({ ...b, target: p.id, spreads: false });
      emit(s, 'blocked', `${atk.name} springs your Logic Trap: it deals half${copies.length ? `, and the ${p.name} catches ${plural(copies.length, 'burn')}` : ''}.`, { source: p.id, ability: 'logic-trap' });
      m *= 1 - A('logic-trap').cut;
    }
    return m;
  },
  broke(s, p) {
    for (const st of everyone(s)) bloom(st, p);
    // Kill Chain (Phantom talent): a break readies Backstab and lights Opening.
    if (talent(s, 'kill-chain') && virusIntegrity(s).current > 0) {
      delete s.encounter.readyAt.backstab;
      openProc(s, 'slipped');
      emit(s, 'status', 'Kill Chain: Backstab is ready.', { ability: 'backstab' });
    }
  },
  plan(s, t) { return isInf(s) && subOf(s) ? plan(s, t) : null; },
  fill: (s, t) => fill(s, t),
};

// ---------- the planner ----------
const ok = (s, text) => !toIntent(s, text).error;
const first = (s, list) => list.find((c) => c && ok(s, c)) || null;
// The cheap keys between the big ones (planner.mjs, before key 1).
export function fill(s, t) {
  if (!isInf(s) || !t) return [];
  const sub = subOf(s);
  if (sub === 'payload') return ['fuzz ' + t.id, 'keepalive ' + t.id, 'skim ' + t.id];
  if (sub === 'phantom') return [!t.armor && 'backstab ' + t.id, 'side-channel ' + t.id, 'fingerprint ' + t.id, 'unmask ' + t.id];
  return [];
}
const dueIn = (s, p) => (p?.attack ? p.attack.due - s.encounter.cycle : 99);
// What lands on you this cycle and next, by size.
const incoming = (s, within = 0) => intents(s).filter((i) => i.col <= within && !i.hidden && (i.effect === 'damage' || i.hit)).reduce((n, i) => n + (i.effect === 'damage' ? i.amount : i.hit || 0), 0);
// Damage still to come from your burns on a part (Polymorph's too).
// What Detonate would cash in: a Rootkit Implant isn't (it burns until the part breaks).
const queued = (s, p) => allBurnsOn(s, p).reduce((n, b) => n + (b.id === 'implant' ? 0 : b.damage * b.left), 0);
// A hit that breaks a part about to fire (or a bare one) right now, cheapest first (not a Shade out of phase).
const HITS = ['opening', 'fingerprint', 'tag', 'fuzz', 'side-channel', 'unmask', 'spike', 'backstab', 'backdoor']; // the cheapest that does it
const killNow = (s) => {
  for (const p of [...livingParts(s).filter((x) => dueIn(s, x) <= 0), ...livingParts(s).filter((x) => !x.armor)]) {
    if ((p.phase && s.encounter.cycle % 2 === 1) || doomed(s, p)) continue;
    for (const id of HITS) if (ok(s, id + ' ' + p.id) && previewDamage(s, id, p) >= p.integrity) return id + ' ' + p.id;
  }
  return null;
};

function plan(s, t0) {
  const sub = subOf(s), d = defender(s);
  if (mirrorOn(s) && !(mirrorOn(s).unmaskUntil >= s.encounter.cycle)) return null; // a Decoy's beat: the shared planner plays quiet (unless it's unmasked)
  const kill = killNow(s);
  if (kill) return kill; // a hit that breaks a part about to fire, or a bare one
  const living = livingParts(s);
  const hurt = d.integrity / d.max;
  // The target: the shared planner's, unless it only took the soonest attacker and a bigger threat is up.
  let t = t0 === soonest(s) && !(t0.attack?.effect === 'replicate' && living.some((p) => p.kind === 'fragment')) ? pick(s, t0) : t0;
  // A Phantom hits in bursts, and a Lockbox caps those: break the Lockbox first.
  const warder = sub === 'phantom' && living.find((p) => p.ward === t.id);
  if (warder) t = warder;
  // A big hit lands this cycle: a decoy, a dodge or a wipe takes it (the Payload's Logic Trap halves it and
  // hands the part your burns).
  const heavy = incoming(s, 0);
  if (heavy >= Math.max(8, d.max * 0.1)) {
    const dodge = first(s, ['shadow-copy', heavy >= d.max * 0.12 && 'logic-trap', heavy >= d.max * 0.18 && 'null-route', heavy >= d.max * 0.15 && 'log-wipe', heavy >= d.max * 0.12 && 'rotate-keys']);
    if (dodge) return dodge;
  }
  // Two big hits in the next two cycles: Vanish takes both.
  if (incoming(s, 1) >= d.max * 0.25 && intents(s).filter((i) => i.col <= 1 && !i.hidden && (i.effect === 'damage' || i.hit)).length >= 2) { const c = first(s, ['vanish']); if (c) return c; }
  // Encryption, Corrupted or a scramble on you: rotate the keys.
  const e0 = s.encounter;
  if (e0.corrupt || e0.encrypt >= 6 || e0.burst || e0.scrambleUntil >= e0.cycle) { const c = first(s, ['rotate-keys']); if (c) return c; }
  return (sub === 'payload' ? payloadPlan(s, t, living, hurt) : phantomPlan(s, t, living, hurt)) || core(s, t);
}
// The part to burn: the planner's, or the one that hits hardest for its size if that's much worse.
function pick(s, t0) {
  const threat = (p) => (p.attack ? (p.attack.effect === 'damage' ? p.attack.amount : p.attack.hit || 4) / Math.max(1, p.attack.interval) : 0) / Math.max(20, p.integrity + 15 * (p.armor || 0));
  const best = livingParts(s).filter((p) => !p.phase).sort((a, b) => threat(b) - threat(a))[0];
  return best && threat(best) > 1.5 * threat(t0) ? best : t0;
}
// The class's core kit: Inject to three stacks, Tag them, Keepalive what's about to run out, Backdoor.
function core(s, t) {
  const e = s.encounter, burns = burnsOn(s, t), q = queued(s, t);
  if (e.cycle === 1 && e.sync?.surprise) return first(s, ['inject ' + t.id, 'tag ' + t.id]);
  // A Phantom leads with its direct hits (Weak Spot, Backstab, Side Channel) and keeps one or two burns under them.
  if (subOf(s) === 'phantom') return first(s, [
    !t.armor && 'opening ' + t.id,
    !t.armor && 'backstab ' + t.id,
    burns.length < 1 && 'inject ' + t.id,
    t.armor > 0 && 'side-channel ' + t.id,
    'backdoor ' + t.id,
    burns.length < 2 && t.integrity > 60 && 'inject ' + t.id,
    ...fill(s, t),
    'inject ' + t.id,
  ]);
  return first(s, [
    burns.length >= 2 && q * 1.5 >= t.integrity * 0.8 && 'detonate ' + t.id,
    burns.length >= 2 && !on(s, t, 'tagged') && q < t.integrity * 1.2 && 'tag ' + t.id,
    burns.length < 3 && 'inject ' + t.id,
    burns.length >= 2 && burns.some((b) => b.left <= 1) && q < t.integrity && 'keepalive ' + t.id,
    'backdoor ' + t.id,
    ...fill(s, t),
    'inject ' + t.id,
  ]);
}

const injects = (s, p) => burnsOn(s, p).filter((b) => b.id === 'inject').length;
export const INJECT_FLOOR = 1; // then the line, then more stacks
function payloadPlan(s, t, living, hurt) {
  const e = s.encounter;
  // IRQ Storm: a charge or a cast about to land on a part you're burning (each part it ticks counts as your hit).
  const told = living.find((p) => allBurnsOn(s, p).length && tellOn(s, p) && ['charge', 'cast'].includes(tellOn(s, p).kind));
  if (told) { const c = first(s, ['irq-storm']); if (c) return c; }
  // The Implant on a part that heals or grows (a Patcher, a Tap, a Self-Update on the board): it can't while it burns.
  const healer = living.find((p) => p.attack?.effect === 'heal' || p.attack?.siphon || tellOn(s, p, 'cast')?.does === 'grow');
  if (healer) { const c = first(s, ['implant ' + healer.id]); if (c) return c; }
  // Opening move (the Surprise window): Inject, for the extra stack.
  if (e.cycle === 1 && e.sync?.surprise && t.armor === 0) return first(s, ['inject ' + t.id]);
  // A finisher: Detonate when the burns left on it break it (or nearly).
  const q = queued(s, t);
  if (q * 1.5 >= t.integrity && allBurnsOn(s, t).length >= 1 && t.armor === 0) { const c = first(s, ['detonate ' + t.id]); if (c) return c; }
  // Outbreak: three parts or more, or fragments: every part catches an Inject at once.
  if (living.length >= 3 || (living.length >= 2 && living.some((p) => p.kind === 'fragment'))) { const c = first(s, ['outbreak']); if (c) return c; }
  // Inject first: three stacks on the target carry the Payload, and the line comes on top of them.
  if (injects(s, t) < INJECT_FLOOR && queued(s, t) < t.integrity) { const c = first(s, ['inject ' + t.id]); if (c) return c; }
  // Fuzz: a hit and a burn, and a tell on it counts it twice.
  if (tellOn(s, t) && ['charge', 'cast'].includes(tellOn(s, t).kind)) { const c = first(s, ['fuzz ' + t.id]); if (c) return c; }
  // Thick armor: Polymorph burns straight through it while the other burns break ◆.
  if (t.armor >= 2) { const c = first(s, ['polymorph ' + t.id]); if (c) return c; }
  // The moments: low on Signal (Skim pays it back), one part loaded and the rest clean (Propagate), three burns
  // stacked on a bare part (Thrash).
  if (hurt < 0.6) { const c = first(s, ['skim ' + t.id]); if (c) return c; }
  if (allBurnsOn(s, t).length >= 2 && living.filter((p) => p !== t && !allBurnsOn(s, p).length).length >= 1) { const c = first(s, ['propagate ' + t.id]); if (c) return c; }
  if (allBurnsOn(s, t).length >= 2 && !t.armor && t.integrity > queued(s, t) * 0.5) { const c = first(s, ['thrash ' + t.id]); if (c) return c; }
  // Several parts, or fragments: spread (once the target carries a stack, so the copies come with something to cash in).
  if (living.length >= 2 && injects(s, t) >= 1) { const c = first(s, ['wormable ' + t.id]); if (c) return c; }
  // Implant the biggest part early, once.
  const big = [...living].sort((a, b) => b.integrity - a.integrity)[0];
  if (big && big.integrity >= 60) { const c = first(s, ['implant ' + big.id]); if (c) return c; }
  // Tag the stacks once two burns are on it, then Fuzz on top (a hit and a burn of its own).
  if (allBurnsOn(s, t).length >= 2 && !on(s, t, 'tagged') && queued(s, t) < t.integrity * 1.2) { const c = first(s, ['tag ' + t.id]); if (c) return c; }
  if (queued(s, t) < t.integrity) { const c = first(s, ['fuzz ' + t.id]); if (c) return c; }
  if (injects(s, t) < 3 && queued(s, t) < t.integrity) { const c = first(s, ['inject ' + t.id]); if (c) return c; }
  // Thrash: three or more burns stacked on a bare part, each ticks twice.
  if (allBurnsOn(s, t).length >= 3 && !t.armor && t.integrity > queued(s, t) * 0.5) { const c = first(s, ['thrash ' + t.id]); if (c) return c; }
  // Propagate: one part loaded, the others clean.
  if (allBurnsOn(s, t).length >= 2 && living.filter((p) => p !== t && !allBurnsOn(s, p).length).length >= 2) { const c = first(s, ['propagate ' + t.id]); if (c) return c; }
  // Polymorph: the biggest burn, and armor doesn't stop it.
  if (t.armor > 0) { const c = first(s, ['polymorph ' + t.id]); if (c) return c; } // through ◆; half once it's bare
  // Plenty of burns out: make them count twice.
  const burning = e.burns.length + (e.infil?.poly?.length || 0);
  if (allBurnsOn(s, t).length >= 2 && t.integrity > queued(s, t) * 0.5 && !t.armor) { const c = first(s, ['thrash ' + t.id]); if (c) return c; }
  if (burning >= 3) { const c = first(s, ['irq-storm']); if (c) return c; }
  if (hurt < 0.7) { const c = first(s, ['skim ' + t.id]); if (c) return c; }
  if (living.length >= 3 && burnsOn(s, t).length >= 2) { const c = first(s, ['propagate ' + t.id]); if (c) return c; }
  return null;
}

function phantomPlan(s, t, living, hurt) {
  const e = s.encounter;
  // Unmask a Mimic or a Decoy whose beat is coming: it has nothing of you to copy.
  const mask = living.find((p) => (p.mimic || p.reflect) && !(p.unmaskUntil >= e.cycle) && (mirrorOn(s, e.cycle + 1) === p || (tellOn(s, p, 'mimic')?.next ?? 99) - e.cycle === 1));
  if (mask) { const c = first(s, ['unmask ' + mask.id]); if (c) return c; }
  // Backstab a part busy with a tell: a sure crit, and it answers the tell.
  const busy = living.find((p) => !p.armor && notDue(s, p) && !p.mimic) || (!t.armor && notDue(s, t) ? t : null);
  if (busy) { const c = first(s, ['backstab ' + busy.id]); if (c) return c; }
  // Fingerprint a bare part whose Weak Spot is used, with Backstab ready next: the Backstab crits again.
  if (!t.armor && e.weakHit?.[t.id] && usable(s).includes('backstab') && readyIn(s, 'backstab') <= 1 && t.integrity > 40) { const c = first(s, ['fingerprint ' + t.id]); if (c) return c; }
  // Weak Spot used up on every part: wipe the logs.
  const fresh = living.filter((p) => !e.weakHit?.[p.id]).length;
  if (fresh === 0 && living.length >= 2) { const c = first(s, ['log-wipe']); if (c) return c; }
  if (t.integrity >= 60) { const c = first(s, ['implant ' + t.id]); if (c) return c; }
  // Weak Spot: the first hit on each part's bare code crits, so open on a fresh part with the biggest hit to hand.
  if (!e.weakHit?.[t.id] && !(e.cycle === 1 && e.sync?.surprise)) { const c = first(s, ['opening ' + t.id, 'backdoor ' + t.id, !t.armor && 'backstab ' + t.id, !t.armor && 'spike ' + t.id]); if (c) return c; }
  // A bare part: Backstab beats a Spike even without the crit, so it goes whenever it's ready (a lit Opening first).
  if (!t.armor) { const c = first(s, ['opening ' + t.id, 'backstab ' + t.id]); if (c) return c; }
  return null;
}

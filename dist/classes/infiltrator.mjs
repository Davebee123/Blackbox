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
import { CONFIG } from '../data.mjs';
import { soonest } from '../planner.mjs';
import { subOf, subEdge, hasTalent, rank, emit, hit, part, alive, livingParts, attackers, soonestAttacker, burnsOn, classOf, alliesOf, openProc, scaled, toIntent, intents, defender, on, virusIntegrity, previewDamage, mirrorOn } from '../combat.mjs';

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
const tick = (s, b, t, by = b.name) => hit(s, t, b.damage + (b.fxGrow || 0), { by, dot: true, synced: b.synced, pierce: !!b.poly });
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
const notDue = (s, p) => !p.attack || p.attack.due > s.encounter.cycle + 1;

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
    polymorph(s, { target, e }) {
      const b = e.burns.filter((x) => x.id === 'polymorph' && x.target === target.id).at(-1);
      if (!b) return;
      e.burns.splice(e.burns.indexOf(b), 1);
      b.damage += virulence(s);
      b.poly = true;
      mine(s).poly.push(b);
    },
    thrash(s, { target, a, e }) {
      target.thrashUntil = e.cycle + a.cycles - 1;
      emit(s, 'status', `${target.name} Thrashing for ${plural(a.cycles, 'cycle')}: every burn on it ticks twice a cycle.`, { target: target.id, mark: 'burn', ability: 'thrash' });
    },
    'irq-storm'(s, { e }) {
      const all = [...e.burns, ...mine(s).poly];
      let n = 0;
      for (const b of all) { if (virusIntegrity(s).current === 0) break; const t = part(s, b.target); if (alive(t)) { tick(s, b, t, `IRQ Storm (${b.name})`); n++; } }
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
    keepalive(s, { target, a, e }) { for (const b of polyOn(s, target)) b.left += e.surprise ? CONFIG.surprise.keepalive : a.cycles; },
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
  taken(s, atk) {
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
    if (st.wiped) { st.wiped = false; emit(s, 'blocked', `${atk.name} can't find you in the logs: it deals half.`, {}); return 0.5; }
    return 1;
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
};

// ---------- the planner ----------
const ok = (s, text) => !toIntent(s, text).error;
const first = (s, list) => list.find((c) => c && ok(s, c)) || null;
const dueIn = (s, p) => (p?.attack ? p.attack.due - s.encounter.cycle : 99);
// What lands on you this cycle and next, by size.
const incoming = (s, within = 0) => intents(s).filter((i) => i.col <= within && !i.hidden && (i.effect === 'damage' || i.hit)).reduce((n, i) => n + (i.effect === 'damage' ? i.amount : i.hit || 0), 0);
// Damage still to come from your burns on a part (Polymorph's too).
// What Detonate would cash in: a Rootkit Implant isn't (it burns until the part breaks).
const queued = (s, p) => allBurnsOn(s, p).reduce((n, b) => n + (b.id === 'implant' ? 0 : b.damage * b.left), 0);
// A hit that breaks a part about to fire (or a bare one) right now, cheapest first (not a Shade out of phase).
const HITS = ['opening', 'spike', 'backstab', 'backdoor'];
const killNow = (s) => {
  for (const p of [...livingParts(s).filter((x) => dueIn(s, x) <= 0), ...livingParts(s).filter((x) => !x.armor)]) {
    if (p.phase && s.encounter.cycle % 2 === 1) continue;
    for (const id of HITS) if (ok(s, id + ' ' + p.id) && previewDamage(s, id, p) >= p.integrity) return id + ' ' + p.id;
  }
  return null;
};

function plan(s, t0) {
  const sub = subOf(s), d = defender(s);
  if (mirrorOn(s)) return null; // a Decoy's beat: the shared planner plays quiet
  const kill = killNow(s);
  if (kill) return kill; // a hit that breaks a part about to fire, or a bare one
  const living = livingParts(s);
  const hurt = d.integrity / d.max;
  // The target: the shared planner's, unless it only took the soonest attacker and a bigger threat is up.
  let t = t0 === soonest(s) && !(t0.attack?.effect === 'replicate' && living.some((p) => p.kind === 'fragment')) ? pick(s, t0) : t0;
  // A Phantom hits in bursts, and a Lockbox caps those: break the Lockbox first.
  const warder = sub === 'phantom' && living.find((p) => p.ward === t.id);
  if (warder) t = warder;
  // A big hit lands this cycle: a decoy, a dodge or a wipe takes it.
  const heavy = incoming(s, 0);
  if (heavy >= Math.max(8, d.max * 0.1)) {
    const dodge = first(s, ['shadow-copy', heavy >= d.max * 0.18 && 'null-route', heavy >= d.max * 0.15 && 'log-wipe']);
    if (dodge) return dodge;
  }
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
  return first(s, [
    burns.length >= 2 && q * 1.5 >= t.integrity * 0.8 && 'detonate ' + t.id,
    burns.length >= 2 && !on(s, t, 'tagged') && q < t.integrity * 1.2 && 'tag ' + t.id,
    burns.length < 3 && 'inject ' + t.id,
    burns.length >= 2 && burns.some((b) => b.left <= 1) && q < t.integrity && 'keepalive ' + t.id,
    'backdoor ' + t.id,
    'inject ' + t.id,
  ]);
}

function payloadPlan(s, t, living, hurt) {
  const e = s.encounter;
  // Opening move (the Surprise window): Inject, for the extra stack.
  if (e.cycle === 1 && e.sync?.surprise && t.armor === 0) return first(s, ['inject ' + t.id]);
  // A finisher: Detonate when the burns left on it break it (or nearly).
  const q = queued(s, t);
  if (q * 1.5 >= t.integrity && allBurnsOn(s, t).length >= 1 && t.armor === 0) { const c = first(s, ['detonate ' + t.id]); if (c) return c; }
  // Several parts, or fragments: spread.
  if (living.length >= 2) { const c = first(s, ['wormable ' + t.id]); if (c) return c; }
  // Implant the biggest part early, once.
  const big = [...living].sort((a, b) => b.integrity - a.integrity)[0];
  if (big && big.integrity >= 60) { const c = first(s, ['implant ' + big.id]); if (c) return c; }
  // Polymorph: the biggest burn, and armor doesn't stop it.
  if (t.armor > 0 || allBurnsOn(s, t).length < 4) { const c = first(s, ['polymorph ' + t.id]); if (c) return c; }
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
  // Backstab when it's sure to crit.
  if (!t.armor && notDue(s, t)) { const c = first(s, ['backstab ' + t.id]); if (c) return c; }
  // Weak Spot used up on every part: wipe the logs.
  const fresh = living.filter((p) => !e.weakHit?.[p.id]).length;
  if (fresh === 0 && living.length >= 2) { const c = first(s, ['log-wipe']); if (c) return c; }
  if (t.integrity >= 60) { const c = first(s, ['implant ' + t.id]); if (c) return c; }
  // Weak Spot: the first hit on each part's bare code crits, so open on a fresh part with the biggest hit to hand.
  if (!e.weakHit?.[t.id] && !(e.cycle === 1 && e.sync?.surprise)) { const c = first(s, ['opening ' + t.id, 'backdoor ' + t.id, !t.armor && 'backstab ' + t.id, !t.armor && 'spike ' + t.id]); if (c) return c; }
  // A bare part: Backstab beats a Spike even without the crit.
  if (!t.armor && burnsOn(s, t).length >= 2) { const c = first(s, ['backstab ' + t.id]); if (c) return c; }
  return null;
}

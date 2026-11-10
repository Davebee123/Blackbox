// The mechanics list (docs/mechanics-list.md): twenty components for the designer to play, built lean (CLAUDE.md "Lean
// first"). Each is a third part (genes.mjs, its spec's `mech`), and its whole rule lives here: combat.mjs calls the hooks
// below at a handful of points in the cycle, and the board (fightread.mjs mechRead, view.mjs) reads the same state.
//
// Statuses on you (each from a part's attack that lands; a ◆ on you stops it whole, as it stops a Scramble):
//   exposed  Prober     your next incoming hit deals more, then it clears
//   lag      Jitter     for a few cycles your command lands after the virus acts (solo fights)
//   leak     Leaker     for a few cycles every command you fire costs a share of your max; holding is free
//   sandbox  Sandbox    for a cycle only quiet commands fire (strips, burns, helpers, shields, buffs): no direct hits
//   stunner  Stunner    your next command doesn't fire
//   junk     Junker     a dead key takes one of your bar's keys; firing that key clears it, and that is your command
// Abilities your statuses unlock:
//   predator     while you're Encrypted or Corrupted, it attacks every cycle
//   opportunist  asleep, off the timeline, until you carry any debuff; then it wakes for good
//   feeder       each cycle heals the most damaged part by a share of its max for each debuff you carry
//   punisher     a free extra attack on a cycle your command didn't fire because you were Hung or Stunned
//   harvester    its attack consumes your Corrupted for a hit of a share of your max a cycle it had left
//   volatile     its attack leaves you Corrupted; cleansing that deals the rest of it at once
// Buffs and support on the virus:
//   amplifier    each cycle it boosts the next attack of one other part, in turn
//   bodyguard    at the end of each cycle it shields the part your command hit (the shield takes only commands)
//   vendetta     while it stands, each other part you break makes the rest hit harder for the fight
//   thorns       your command hits on it leave you Corrupted, a stack each
// Timing and control:
//   countdown    after you fire enough commands, every part attacks at once
//   backtrace    each status you carry adds a stack each cycle; at the count it calls in a fragment
//   swap         its attack Throttles you; while it stands, your next command hit moves Throttled, Exposed or Corrupted
//                off you onto that part
//   turncoat     below half your Signal its attack Scrambles you too
//
// Parts 1 (docs/mechanics-list.md "Parts 1"): fifteen more, built the same way. Each size is a multiple of the part's
// own attack; a part with no attack sizes its hit at level 6 and scales it with the virus (sized). A rule's own hit
// (a Discharge, a Drain, a repeat) lands like any attack, marked `rule` so no other rule counts it.
//   overreacher  the cycle after its Lunge lands it takes more damage from everyone
//   livewire     each command that hits it brings its next Snap a cycle sooner, up to a count a wind-up
//   condenser    each attack from another part that lands on you stores a charge; at the count it Discharges
//   pacer        every few cycles every other attack repeats a cycle faster; your command hit starts its count over
//   cutout       taking it across a tick pushes every attack back a cycle (the timers move: no delay is used up)
//   magnet       its Pull deals its amount for each ◆ it wears, and each ◆ you strip from another part lands on it
//   deadhand     broken mid wind-up, its Payout lands at once (the start of the virus's half, if the fight goes on)
//   reservoir    its Flush is scaled by the share of Integrity it has left
//   flyback      the cycle after an attack lands on you it repeats the biggest at half
//   shutter      its ◆ are shut for a few cycles (worn, and nothing strips them), then open (none), in turn
//   cistern      each attack you cut is held at its size; every few cycles it Drains all it holds onto you
//   welder       its Weld also puts a ◆ back on the other part that wears the least
//   matcher      the same key fired two cycles running sets off its hit
//   splitter     taken under half it splits into two parts, each with half its Integrity, its max and its Rend
//   auditor      its Audit deals more for each key of yours on cooldown as it lands
import { ABILITIES, CONFIG, TELL } from './data.mjs';
import { emit, alive, part, livingParts, attackers, defender, takeDamage, usable, rand, strikeWith, implanted, addBurn, attackAmount, readyIn, spikeName, blocked, delayHeld, previewDamage, codexKey } from './combat.mjs';
import { copyKind, tellsOf, chargeSize } from './tells.mjs';
import { TICKS, crossBy, dueOf } from './interrupt.mjs';

// The numbers, every one a *start* (docs/mechanics-list.md): the designer's play tunes them.
export const MECH = {
  exposed: { mult: 1.5 },
  lag: { cycles: 2 },
  leak: { cycles: 3, share: 0.03 },
  sandbox: { cycles: 1 },
  predator: { every: 1 },
  feeder: { share: 0.02 },
  harvester: { share: 0.04 },
  volatile: { share: 0.02, cycles: 3 },
  amplifier: { mult: 1.5 },
  bodyguard: { share: 0.15 },
  vendetta: { more: 0.2 },
  thorns: { share: 0.01, cycles: 3 },
  countdown: { at: 10 },
  backtrace: { at: 5 },
  swap: { cycles: 2 },
  turncoat: { below: 0.5, cycles: 2 },
  // Parts 1. amount: a hit at level 6, scaled with the virus. per: a multiple of the part's own attack.
  overreacher: { more: 0.5 },
  livewire: { max: 3 },
  condenser: { at: 3, amount: 16 },
  pacer: { every: 3, max: 2, floor: 2 },
  cutout: { back: 1 },
  magnet: { max: 6 },
  flyback: { share: 0.5 },
  shutter: { shut: 2, open: 2 },
  cistern: { every: 6 },
  matcher: { amount: 12 },
  splitter: { at: 0.5 },
  auditor: { per: 5 / 6, max: 5 },
};
const cyc = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;
const pct = (x) => `${Math.round(x * 100)}%`;
const shareOf = (s, x) => Math.max(1, Math.round(defender(s).max * x));
const mechs = (s, id) => livingParts(s).filter((p) => p.mech === id);
const has = (s, id) => mechs(s, id).length > 0;
const sized = (v, n) => Math.max(1, Math.round(n * (v?.power || 1)));
const pips = (n, of, on = '●', off = '○') => ({ text: on.repeat(Math.max(0, Math.min(n, of))), dim: off.repeat(Math.max(0, of - n)) });
// A rule's own hit, outside the part's timer: it lands like any attack (your ◆, a shield and Block all count).
const ruleHit = (s, p, name, amount, o) => strikeWith(s, p, { name, effect: 'damage', amount, interval: 0, noCrit: true, rule: p.mech }, o);
// What an attack hits for, as its chip says it: its damage, or the hit a special carries.
const sizeOf = (p, atk = p.attack) => (atk.effect === 'damage' ? attackAmount(p) : atk.hit || 0);
// A Shutter's armor by the cycle: shut for a few, then open for a few, from cycle 1.
export const shutAt = (c) => (c - 1) % (MECH.shutter.shut + MECH.shutter.open) < MECH.shutter.shut;
export const mechShut = (s, p) => p?.mech === 'shutter' && p.armor > 0 && shutAt(s.encounter.cycle);
// Your keys on cooldown now (key 1 and SIGINT included), as an Auditor counts them.
const cooling = (s) => Math.min(MECH.auditor.max, usable(s).filter((id) => id !== 'hold' && readyIn(s, id) > 0).length);
const perKey = (p) => Math.max(1, Math.round(p.attack.amount * MECH.auditor.per));
const keyName = (s, id) => (id === 'spike' ? spikeName(s) : ABILITIES[id]?.name || id);
// The cycle a Pacer's next Step comes at the end of, and a Cistern's next Drain lands on.
const stepAt = (s, p) => (p.stepAt ??= s.encounter.cycle + MECH.pacer.every - 1);
const drainAt = (s, p) => (p.drainAt ??= s.encounter.cycle + MECH.cistern.every - 1);
// A Live Wire's pulls on the Snap it is winding up now (they go when that one lands or is cut).
const pulls = (p) => (p.pullFor === (p.attack?.n || 0) ? p.pulls || 0 : 0);
// A Dead Man's Hand whose break would land its Payout now: not the last part standing, and no Payout this cycle or last.
const staked = (s, p) => !!p.attack && !(p.lastLanded >= s.encounter.cycle - 1) && livingParts(s).some((x) => x !== p);

// ---------- the debuffs you carry ----------
// Every status the virus has on you now, by name: the body's (Encrypted, Scrambled), a landed tell's (Corrupted, Hung,
// a skill offline), the Mimic's (Throttled), the Bad Block's (Cracked) and this list's. Opportunist, Feeder and
// Backtrace count them.
export function youDebuffs(s) {
  const e = s.encounter, c = e.cycle, out = [];
  if (e.encrypt > 0) out.push('Encrypted');
  if (e.corrupt?.left > 0) out.push('Corrupted');
  if (e.scrambleUntil > c) out.push('Scrambled');
  if (e.hung >= c) out.push('Hung');
  if (e.throttledUntil >= c) out.push('Throttled');
  if (e.badBlock?.left > 0) out.push('Cracked');
  if (Object.values(e.locked || {}).some((u) => u >= c)) out.push('Offline');
  if (e.exposedHit) out.push('Exposed');
  if (e.lagUntil >= c) out.push('Lag');
  if (e.leakUntil >= c) out.push('Leak');
  if (e.sandboxUntil >= c) out.push('Sandboxed');
  if (e.stunned >= c) out.push('Stunned');
  if (e.junk) out.push('Junk process');
  return out;
}
export const lagged = (s) => s.encounter.lagUntil >= s.encounter.cycle;
export const junkKey = (s) => s.encounter?.junk || null;
// A direct hit (the Mimic's 'hit' copy): what Sandboxed stops.
export const directHit = (id) => copyKind(id) === 'hit';

// ---------- your command ----------
// Before your command is accepted: Sandboxed refuses a direct hit, so you can pick another.
export function mechValidate(s, intent) {
  const e = s.encounter;
  if (e?.sandboxUntil >= e.cycle && directHit(intent.ability) && e.junk !== intent.ability) return `You are Sandboxed. ${ABILITIES[intent.ability].name} is a direct hit, and only quiet commands fire this cycle.`;
  return null;
}
// As your command fires (typed, or auto-repeat): true when it was spent here. The junked key clears the junk; a direct
// hit under Sandboxed (queued before it landed) doesn't fire.
export function mechIntercept(s, id) {
  const e = s.encounter;
  if (e.junk && id === e.junk) {
    emit(s, 'status', `You clear the junk process off ${ABILITIES[id]?.name || id}. It's your key again next cycle.`, { junk: true });
    e.junk = null; e.lastCmd = { id: 'hold', cycle: e.cycle };
    return true;
  }
  if (e.sandboxUntil >= e.cycle && directHit(id)) {
    emit(s, 'hung', `SANDBOXED. ${ABILITIES[id]?.name || id} is a direct hit and does not fire.`, {});
    e.lastCmd = { id: 'hold', cycle: e.cycle };
    return true;
  }
  return false;
}
// A command of yours that didn't fire because you were Hung or Stunned (combat.mjs playerPhase): the Punisher's window.
export const stunnedNow = (s) => s.encounter.stunned === s.encounter.cycle;
export const missedTurn = (s) => { s.encounter.missedAt = s.encounter.cycle; };
// After your command phase: Leak's price, the Countdown's count, and a Volatile Corrupted you just cleansed.
export function mechFired(s) {
  if (!s.encounter?.virus) return; // the fight ended on your command (jacked out)
  const e = s.encounter, fired = e.lastCmd?.cycle === e.cycle && e.lastCmd.id !== 'hold';
  if (fired && e.leakUntil >= e.cycle) {
    const d = defender(s), n = Math.min(Math.max(0, d.integrity - 1), shareOf(s, MECH.leak.share)); // never your last point
    if (n) { d.integrity -= n; emit(s, 'server-hit', `Leak: your command costs ${n}.`, { amount: n, atk: 'Leak', leak: true }); }
  }
  if (fired) for (const p of mechs(s, 'countdown')) p.count = (p.count || 0) + 1;
  // A Matcher: the same key as last cycle sets it off (it lands with the virus's half, mechStart).
  for (const p of fired ? mechs(s, 'matcher') : []) {
    if (p.key?.id === e.lastCmd.id && p.key.cycle === e.cycle - 1) { p.matchAt = e.cycle; emit(s, 'status', `The ${p.name} matches ${keyName(s, e.lastCmd.id)}, two cycles running.`, { target: p.id, mech: 'matcher' }); }
    p.key = { id: e.lastCmd.id, cycle: e.cycle };
  }
  pulled(s); // a Magnet takes the ◆ your command stripped
  const v = e.volatile;
  if (v && e.corrupt !== v.ref) {
    e.volatile = null;
    const n = !e.corrupt && v.ref.left > 0 ? v.ref.amount * v.ref.left : 0; // cleansed (not run out, nor replaced by a tell's)
    if (n) { const dealt = takeDamage(s, n, v.source, 'Volatile'); emit(s, 'server-hit', `The Corrupted was Volatile: cleansing it deals the rest at once, −${dealt}.`, { source: v.source, amount: dealt, atk: 'Volatile' }); }
  }
}

// ---------- the virus's attacks ----------
// What a part's attack deals over its own: an Amplifier's boost on its next one (spent as it lands: `spend`; not on a
// `later` one, for the board's cells past the first), and Vendetta's stacks.
export function mechPower(s, p, spend = false, later = false) {
  const e = s.encounter;
  let m = 1 + MECH.vendetta.more * (e.virus.vendetta || 0);
  if (p.amped && !later && alive(part(s, p.amped))) { m *= MECH.amplifier.mult; if (spend) p.amped = null; }
  return m;
}
// Exposed: the hit about to land on you deals more, and the status clears.
export function exposedCut(s) {
  const e = s.encounter;
  if (!e.exposedHit) return 1;
  e.exposedHit = false;
  emit(s, 'status', `You were Exposed: this hit deals ${pct(MECH.exposed.mult - 1)} more.`, {});
  return MECH.exposed.mult;
}
// A part's attack got through to you (past your ◆, a miss and Null Route): the status it leaves, or what it cashes in.
export function mechLanded(s, p, atk) {
  const e = s.encounter, c = e.cycle, say = (text) => emit(s, 'blind', `${atk.name} ${text}`, { source: p.id, mech: p.mech });
  if (atk.rule) return; // a rule's own hit (a Discharge, a Drain, a repeat): no status rides it, and nothing repeats it
  // A Flyback repeats the biggest hit of the cycle, at its size on the board.
  for (const f of mechs(s, 'flyback')) if (f !== p && sizeOf(p, atk) > (f.fly?.cycle === c ? f.fly.amount : 0)) f.fly = { cycle: c, amount: sizeOf(p, atk), name: atk.name };
  switch (p.mech) {
    case 'overreacher': p.softAt = c + 1; return emit(s, 'status', `${atk.name} overreaches. The ${p.name} takes ${pct(MECH.overreacher.more)} more damage next cycle.`, { target: p.id, mech: 'overreacher' });
    case 'welder': {
      const t = livingParts(s).filter((x) => x !== p && x.kind !== 'fragment' && x.mech !== 'shutter' && x.armor < (x.maxArmor || 0)).sort((a, b) => a.armor - b.armor)[0];
      if (!t) return;
      t.armor += 1; t.patchAt = null;
      return emit(s, 'patch', `${atk.name} puts 1 ◆ back on the ${t.name} (${t.armor}).`, { target: t.id, from: p.id, mech: 'welder' });
    }
    case 'exposed': e.exposedHit = true; return say(`leaves you Exposed. Your next incoming hit deals ${pct(MECH.exposed.mult - 1)} more.`);
    case 'lag': e.lagUntil = c + MECH.lag.cycles; return say(`lags you for ${cyc(MECH.lag.cycles)}. Your command lands after the virus acts.`);
    case 'leak': e.leakUntil = c + MECH.leak.cycles; return say(`leaks you for ${cyc(MECH.leak.cycles)}. Each command you fire costs ${shareOf(s, MECH.leak.share)}. Holding is free.`);
    case 'sandbox': e.sandboxUntil = c + MECH.sandbox.cycles; return say(`Sandboxes you for ${cyc(MECH.sandbox.cycles)}. Only quiet commands fire.`);
    case 'stunner': e.stunned = c + 1; return say('STUNS you. Your next command does not fire.');
    case 'junk': {
      const keys = usable(s).filter((id) => !['spike', 'sigint', 'hold'].includes(id) && id !== e.junk);
      if (e.junk || !keys.length) return;
      e.junk = keys[Math.floor(rand(s) * keys.length)];
      return say(`drops a junk process on ${ABILITIES[e.junk].name}. Fire that key to clear it.`);
    }
    case 'harvester': {
      const k = e.corrupt?.left > 0 ? e.corrupt.left : 0;
      if (!k) return;
      e.corrupt = null; e.volatile = null; // reaped, not cleansed: a Volatile's rest doesn't land on top (the Scythe)
      const dealt = takeDamage(s, shareOf(s, MECH.harvester.share * k), p.id, 'Harvest');
      return say(`consumes your Corrupted (${k} left): −${dealt}.`);
    }
    case 'volatile': {
      const n = shareOf(s, MECH.volatile.share), was = e.corrupt?.left > 0 ? e.corrupt : null;
      if (was) { was.amount += n; was.left = Math.max(was.left, MECH.volatile.cycles); }
      e.corrupt = was || { name: p.name, amount: n, left: MECH.volatile.cycles, source: p.id };
      e.volatile = { ref: e.corrupt, source: p.id };
      return say(`leaves you Corrupted (Volatile), ${e.corrupt.amount} damage every cycle. Cleansing it deals the rest at once.`);
    }
    case 'swap': e.throttledUntil = Math.max(e.throttledUntil ?? -1, c + MECH.swap.cycles); return say(`Throttles you for ${cyc(MECH.swap.cycles)}. Your next command hit moves it onto that part.`);
    case 'turncoat': {
      const d = defender(s);
      if (d.integrity >= d.max * MECH.turncoat.below || e.scrambleUntil > c) return;
      e.scrambleUntil = c + MECH.turncoat.cycles;
      return say(`turns on you below half: you are SCRAMBLED for ${cyc(MECH.turncoat.cycles)}.`);
    }
  }
}
// An attack got through to you, whatever it does (combat.mjs landAttack, its end): a Condenser's charge, for one from
// another part. Not a fragment's gnaw, nor a rule's own hit.
export function mechThrough(s, p, atk) {
  if (atk.rule || p.kind === 'fragment') return;
  for (const x of mechs(s, 'condenser')) {
    if (x === p || (x.charge || 0) >= MECH.condenser.at) continue;
    x.charge = (x.charge || 0) + 1;
    emit(s, 'status', `The ${x.name} stores a charge from ${atk.name} (${x.charge}/${MECH.condenser.at}).`, { target: x.id, mech: 'condenser' });
  }
}
// After an attack has landed (combat.mjs strike): a full Condenser Discharges at once, and empties. True if the fight ended.
export function mechStruck(s) {
  const e = s.encounter;
  for (const x of e?.virus ? mechs(s, 'condenser').filter((y) => (y.charge || 0) >= MECH.condenser.at) : []) {
    x.charge = 0;
    emit(s, 'status', `The ${x.name} is full. It discharges.`, { source: x.id, mech: 'condenser' });
    if (ruleHit(s, x, 'Discharge', sized(e.virus, MECH.condenser.amount))) return true;
  }
  return false;
}
// What a part takes from every hit, over its own (combat.mjs damageMultiplier): an Overreacher, the cycle after its Lunge landed.
export const mechTaken = (s, p) => (p.mech === 'overreacher' && p.softAt === s.encounter.cycle ? 1 + MECH.overreacher.more : 1);
// An attack's lift now (combat.mjs liftOf, attackAmount): a Magnet's Pull by the ◆ it wears, a Reservoir's Flush by the
// Integrity it has left, an Auditor's Audit by your keys on cooldown.
export function mechLift(s) {
  for (const p of s.encounter.virus.parts) {
    const a = p.attack;
    if (!p.mech || !a || a.rule) continue;
    if (p.mech === 'magnet') a.lift = a.amount * (p.armor - 1);
    else if (p.mech === 'reservoir') a.lift = Math.round(a.amount * (Math.max(0, p.integrity) / p.max - 1));
    else if (p.mech === 'auditor') a.lift = perKey(p) * cooling(s);
  }
}
// An attack about to be cut (interrupt.mjs cancel and blastCut, tells.mjs tellSigint): a Cistern holds it, at the size
// it would have landed (a charge riding it: the charge's).
export function mechCut(s, p) {
  const a = p?.attack, pools = a && !a.rule ? mechs(s, 'cistern').filter((x) => x !== p) : [];
  if (!pools.length) return;
  const t = (tellsOf(s)?.list || []).find((x) => x.told && x.kind === 'charge' && x.part === p.id && x.n === (a.n || 0));
  const n = Math.round((t && chargeSize(s, p)?.amount) || sizeOf(p) * mechPower(s, p));
  if (!(n > 0)) return;
  for (const x of pools) { x.pool = (x.pool || 0) + n; emit(s, 'status', `The ${x.name} holds the ${a.name} you cut: ${x.pool}.`, { target: x.id, mech: 'cistern' }); }
}
// A tick crossed (interrupt.mjs onHit): true when the part's rule takes it (no cut, and no tick wasted). A Cutout trips:
// every attack on the virus lands later. The timers move as they are, so a delay one already carries stays its one
// delay (combat.mjs delayAttack).
export function mechTicked(s, p, crossed) {
  // A Splitter's 50% tick with nothing due isn't wasted: it splits there (mechHurt).
  if (p.mech === 'splitter' && !p.split && alive(p) && crossed.length === 1 && crossed[0].at === MECH.splitter.at && !dueOf(s, p).length) return true;
  if (p.mech !== 'cutout') return false;
  const n = crossed.length * MECH.cutout.back;
  for (const x of attackers(s).filter((y) => y.attack.due < 900)) { const a = x.attack, held = delayHeld(x); a.due += n; if (held) a.late.due = a.due; }
  emit(s, 'cut', `TRIPPED. The ${p.name} crosses ${Math.round(crossed[0].at * 100)}%, and every attack lands ${cyc(n)} later.`, { target: p.id, tick: crossed[0].at, delay: true, mech: 'cutout' });
  return true;
}
// Damage landed on a part (combat.mjs hit, after its ticks): a Splitter taken under half splits in two. Each half has
// half the Integrity left and half the max (so its bar and the tick it has left stand where they stood), and half the
// Rend, the second's between the first's.
export function mechHurt(s, p) {
  if (p.mech !== 'splitter' || p.split || !alive(p) || p.integrity > p.max * MECH.splitter.at) return;
  const v = s.encounter.virus, a = p.attack, hp = Math.max(1, Math.ceil(p.integrity / 2));
  p.split = true; p.max = Math.max(hp, Math.ceil(p.max / 2)); p.integrity = hp;
  if (a) a.amount = Math.max(1, Math.round(a.amount / 2));
  const q = { ...p, id: p.id + '2', name: p.name + ' 2', loot: null, ticks: p.ticks?.map((x) => ({ ...x })), brokeOnce: false, strippedBy: null, attack: a ? { ...a, due: a.due >= 900 ? a.due : a.due + Math.max(1, Math.round(a.interval / 2)), n: 0, late: null } : null };
  v.parts.splice(v.parts.indexOf(p) + 1, 0, q);
  if (s.research?.[codexKey(v, p)] != null && s.research[codexKey(v, q)] == null) s.research[codexKey(v, q)] = s.research[codexKey(v, p)]; // the same part, known the same
  emit(s, 'spawn', `The ${p.name} SPLITS under ${pct(MECH.splitter.at)}: two parts at ${hp}/${p.max} Integrity${a ? `, each with a ${a.name} of ${a.amount}` : ''}.`, { source: p.id, target: q.id, mech: 'splitter' });
}
// A Magnet: each ◆ stripped from another part since the last look lands on it (the armor every part wore then: seen).
function pulled(s) {
  if (!has(s, 'magnet')) return;
  const live = livingParts(s).filter((x) => x.kind !== 'fragment');
  const lost = live.filter((x) => x.mech !== 'magnet' && x.mech !== 'shutter' && x.armorSeen > x.armor).reduce((n, x) => n + x.armorSeen - x.armor, 0);
  for (const x of live) x.armorSeen = x.armor;
  for (const m of lost ? mechs(s, 'magnet') : []) {
    const got = Math.min(lost, MECH.magnet.max - m.armor);
    if (got <= 0) continue;
    m.armor += got; m.maxArmor = Math.max(m.maxArmor || 0, m.armor); m.patchAt = null; m.armorSeen = m.armor;
    emit(s, 'patch', `The ${m.name} pulls ${got} ◆ onto itself (${m.armor}).`, { target: m.id, mech: 'magnet' });
  }
}

// ---------- your command's hit on a part (combat.mjs hit) ----------
// Thorns, a Swap passing your statuses on, and the part a Bodyguard shields at the cycle's end.
export function mechCommandHit(s, p) {
  const e = s.encounter, c = e.cycle;
  e.guardHit = { id: p.id, cycle: c };
  // A Live Wire: one pull a command, up to its count a wind-up, never onto this cycle.
  if (p.mech === 'livewire' && p.pullAt !== c && p.attack && p.attack.due < 900) {
    p.pullAt = c;
    const a = p.attack, n = pulls(p);
    if (n < MECH.livewire.max && a.due > c + 1) {
      const held = delayHeld(p);
      a.due -= 1; if (held) a.late.due = a.due;
      p.pullFor = a.n || 0; p.pulls = n + 1;
      emit(s, 'status', `The ${p.name} twitches: its ${a.name} comes 1 cycle sooner (${p.pulls}/${MECH.livewire.max}).`, { target: p.id, mech: 'livewire' });
    }
  }
  // A Pacer: its count starts over.
  if (p.mech === 'pacer' && (p.steps || 0) < MECH.pacer.max && stepAt(s, p) !== c + MECH.pacer.every - 1) {
    p.stepAt = c + MECH.pacer.every - 1;
    emit(s, 'status', `The ${p.name} loses its count. Its next step is ${cyc(MECH.pacer.every)} away.`, { target: p.id, mech: 'pacer' });
  }
  if (p.mech === 'thorns' && p.thornAt !== c) {
    p.thornAt = c;
    const n = shareOf(s, MECH.thorns.share), was = e.corrupt?.left > 0 ? e.corrupt : null;
    if (was) { was.amount += n; was.left = Math.max(was.left, MECH.thorns.cycles); } else e.corrupt = { name: p.name, amount: n, left: MECH.thorns.cycles, source: p.id };
    emit(s, 'blind', `The ${p.name}'s thorns: you are Corrupted, ${e.corrupt.amount} damage every cycle.`, { source: p.id, mech: 'thorns' });
  }
  if (!has(s, 'swap') || p.mech === 'swap') return;
  const moved = [];
  if (e.throttledUntil >= c) { p.throttledUntil = Math.max(p.throttledUntil || 0, e.throttledUntil); e.throttledUntil = -1; moved.push('Throttled'); }
  if (e.exposedHit) { e.exposedHit = false; p.exposedUntil = Math.max(p.exposedUntil || 0, c + 1); moved.push('Exposed'); }
  if (e.corrupt?.left > 0 && !e.volatile) { addBurn(e, { id: 'swap', name: 'Corrupted', target: p.id, damage: e.corrupt.amount, left: e.corrupt.left }); e.corrupt = null; moved.push('Corrupted'); }
  if (moved.length) emit(s, 'status', `Swap: your ${moved.join(' and ')} moves onto the ${p.name}.`, { target: p.id, mech: 'swap' });
}

// ---------- the cycle ----------
// The start of the virus's half (combat.mjs cycleStart): the Punisher's free attack, the Countdown's big turn. True if
// the fight ended.
export function mechStart(s) {
  const e = s.encounter, c = e.cycle, over = () => defender(s).integrity <= 0 || !livingParts(s).length;
  pulled(s); // a Magnet takes the ◆ your burns, helpers and daemons stripped
  // A Dead Man's Hand broken mid wind-up: its Payout lands first.
  for (const id of e.payouts?.splice(0) || []) {
    const p = part(s, id);
    if (p?.attack && (strikeWith(s, p, { ...p.attack, rule: 'deadhand' }, { dead: true }) || over())) return true;
  }
  // A Flyback's repeat of last cycle's biggest hit, a Matcher's hit, a Cistern's Drain.
  for (const p of mechs(s, 'flyback').filter((x) => x.fly?.cycle === c - 1)) {
    const f = p.fly; p.fly = null;
    emit(s, 'status', `The ${p.name} repeats ${f.name} at half.`, { source: p.id, mech: 'flyback' });
    if (ruleHit(s, p, f.name, Math.max(1, Math.round(f.amount * MECH.flyback.share))) || over()) return true;
  }
  for (const p of mechs(s, 'matcher').filter((x) => x.matchAt === c)) if (ruleHit(s, p, 'Match', sized(e.virus, MECH.matcher.amount)) || over()) return true;
  for (const p of mechs(s, 'cistern').filter((x) => c >= drainAt(s, x))) {
    const n = p.pool || 0;
    p.pool = 0; p.drainAt = c + MECH.cistern.every;
    if (n && (ruleHit(s, p, 'Drain', n) || over())) return true;
  }
  if (e.missedAt === e.cycle) for (const p of mechs(s, 'punisher').filter((x) => x.attack)) {
    emit(s, 'status', `The ${p.name} punishes the command you lost: a free ${p.attack.name}.`, { source: p.id, mech: 'punisher' });
    if (strikeWith(s, p, { ...p.attack, free: true }) || over()) return true;
  }
  for (const p of mechs(s, 'countdown').filter((x) => (x.count || 0) >= MECH.countdown.at)) {
    p.count = 0;
    const all = attackers(s).filter((x) => x.kind !== 'fragment' || x.attack.effect === 'damage');
    emit(s, 'phase', `COUNTDOWN. The ${p.name} reaches zero: every part attacks at once.`, { source: p.id, mech: 'countdown' });
    for (const x of all) if (alive(x) && (strikeWith(s, x, { ...x.attack }) || over())) return true;
  }
  return false;
}
// The end of the cycle (combat.mjs cycleClose): what each part does with what you carry, and its turn.
export function mechClose(s) {
  const e = s.encounter, c = e.cycle, debuffs = youDebuffs(s);
  // A Pacer's Step: every other attack repeats a cycle faster (what's on the timeline stays where it is).
  for (const p of mechs(s, 'pacer').filter((x) => (x.steps || 0) < MECH.pacer.max && c >= stepAt(s, x))) {
    p.steps = (p.steps || 0) + 1; p.stepAt = c + MECH.pacer.every;
    for (const x of attackers(s)) if (x !== p && x.attack.interval > MECH.pacer.floor) { x.attack.interval -= 1; x.attack.paced = (x.attack.paced || 0) + 1; }
    emit(s, 'phase', `STEP. The ${p.name} sets the pace: every attack repeats 1 cycle faster (tempo ▲${p.steps}).`, { source: p.id, mech: 'pacer' });
  }
  // A Shutter's armor for the next cycle, and the armor a Magnet reads strips against.
  for (const p of mechs(s, 'shutter')) { p.armor = shutAt(c + 1) ? p.maxArmor : 0; p.patchAt = null; }
  if (has(s, 'magnet')) for (const p of livingParts(s)) p.armorSeen = p.armor;
  for (const p of mechs(s, 'predator')) {
    const was = p.hunting;
    p.hunting = e.encrypt > 0 || e.corrupt?.left > 0;
    if (p.hunting && !was) emit(s, 'status', `The ${p.name} smells ${e.encrypt > 0 ? 'the encryption' : 'the corruption'} on you. It attacks every cycle until you're clean.`, { target: p.id, mech: 'predator' });
    if (p.hunting && p.attack && p.attack.due > c + MECH.predator.every) p.attack.due = c + MECH.predator.every;
  }
  for (const p of mechs(s, 'opportunist').filter((x) => !x.woke && debuffs.length && x.attack)) {
    p.woke = true; p.attack.due = c + 1;
    emit(s, 'status', `The ${p.name} WAKES: you carry ${debuffs[0]}. It attacks next cycle.`, { target: p.id, mech: 'opportunist' });
  }
  for (const p of mechs(s, 'feeder')) {
    const hurt = livingParts(s).filter((x) => x.kind !== 'fragment' && x.integrity < x.max && !implanted(s, x)).sort((a, b) => a.integrity / a.max - b.integrity / b.max)[0];
    if (!hurt || !debuffs.length) continue;
    const got = Math.min(hurt.max - hurt.integrity, Math.max(1, Math.round(hurt.max * MECH.feeder.share * debuffs.length)));
    hurt.integrity += got;
    emit(s, 'heal', `The ${p.name} feeds on your ${debuffs.length} ${debuffs.length === 1 ? 'debuff' : 'debuffs'}: the ${hurt.name} +${got}.`, { target: hurt.id, amount: got, mech: 'feeder' });
  }
  for (const p of mechs(s, 'amplifier')) {
    const others = attackers(s).filter((x) => x !== p && x.kind !== 'fragment');
    if (!others.length) continue;
    const t = others[(p.ampTurn = ((p.ampTurn ?? -1) + 1) % others.length)];
    if (t.amped) continue;
    t.amped = p.id;
    emit(s, 'status', `The ${p.name} boosts the ${t.name}'s next attack: +${pct(MECH.amplifier.mult - 1)}.`, { target: t.id, mech: 'amplifier' });
  }
  for (const p of mechs(s, 'bodyguard')) {
    const t = e.guardHit?.cycle === c ? part(s, e.guardHit.id) : null;
    if (!t || t === p || !alive(t) || t.kind === 'fragment') continue;
    const n = Math.max(1, Math.round(t.max * MECH.bodyguard.share));
    for (const x of livingParts(s)) if (x !== t && x.bufBy === p.id) x.bufHp = 0;
    t.bufHp = n; t.bufMax = n; t.bufBy = p.id;
    emit(s, 'patch', `The ${p.name} shields the ${t.name}: ${n}. Your commands hit the shield first.`, { target: t.id, from: p.id, buffer: true, mech: 'bodyguard' });
  }
  for (const p of mechs(s, 'backtrace')) {
    p.trace = (p.trace || 0) + debuffs.length;
    if (p.trace < MECH.backtrace.at) continue;
    p.trace = 0;
    spawnFragment(s, p);
  }
}
// A part you broke (combat.mjs breakPart): Vendetta's stack while a Vendetta stands.
export function mechBroke(s, p) {
  const e = s.encounter;
  // A Dead Man's Hand: the Payout it was winding up lands at once (mechStart, with the virus's half).
  if (p.mech === 'deadhand' && staked(s, p)) {
    (e.payouts ||= []).push(p.id);
    emit(s, 'status', `The ${p.name} breaks mid wind-up. Its ${p.attack.name} lands at once.`, { source: p.id, mech: 'deadhand' });
  }
  // A Pacer: the tempo goes with it.
  if (p.mech === 'pacer' && !has(s, 'pacer')) {
    const back = attackers(s).filter((x) => x.attack.paced);
    for (const x of back) { x.attack.interval += x.attack.paced; x.attack.paced = 0; }
    if (back.length) emit(s, 'status', `The ${p.name} breaks, and every attack returns to its own pace.`, { target: p.id, mech: 'pacer' });
  }
  if (p.kind === 'fragment' || p.mech === 'vendetta' || !has(s, 'vendetta')) return;
  e.virus.vendetta = (e.virus.vendetta || 0) + 1;
  emit(s, 'status', `Vendetta: the rest of the virus hits ${pct(MECH.vendetta.more * e.virus.vendetta)} harder for the fight.`, { mech: 'vendetta' });
}
// A fragment, as a Replicate spawns one (combat.mjs landAttack), within the cap and outside a DMZ.
function spawnFragment(s, p) {
  const e = s.encounter;
  if (e.buffs?.dmz >= e.cycle) return emit(s, 'blocked', `The ${p.name} calls in a fragment, but nothing new gets into the DMZ.`, { source: p.id });
  if (livingParts(s).filter((x) => x.kind === 'fragment').length >= CONFIG.fragmentCap) return;
  const n = e.nextFragment++, pw = e.virus.power || 1;
  const amount = Math.max(1, Math.round(CONFIG.fragmentDamage * pw)), hp = Math.max(1, Math.round(CONFIG.fragmentIntegrity * (e.virus.addPower ?? e.virus.hpPower ?? pw)));
  e.virus.parts.push({ id: 'frag' + n, name: 'Fragment ' + n, kind: 'fragment', integrity: hp, max: hp, armor: 0, maxArmor: 0, patchAt: null, veiled: false, loot: null, special: false, attack: { name: 'Gnaw', effect: 'damage', amount, interval: 1, due: e.cycle + 1 }, exposedUntil: 0, lastDamaged: 0, boosted: false });
  emit(s, 'spawn', `BACKTRACE. The ${p.name} traces you and calls in Fragment ${n}.`, { source: p.id, target: 'frag' + n, mech: 'backtrace' });
}

// ---------- the board ----------
// What a part does, its answer and its cue under its name (fightread.mjs readOf): [does, answer, cue]. `atk` is its
// attack's own line ("Deals 4 damage to you every 3 cycles.").
export function mechRead(s, p, atk = '', v = null) {
  const e = s?.encounter, live = !!e?.virus?.parts?.includes(p), a = atk ? `${atk} ` : '';
  const cue = (text, icon) => ({ text, icon, link: null });
  const hit = (n) => (s ? blocked(s, n) : n), at = p.attack, name = at?.name || 'attack', each = at ? `every ${cyc(at.interval)}` : '', pw = live ? e.virus : v;
  if (live) mechLift(s);
  switch (p.mech) {
    // Parts 1: their marks are tags and chips (mechTags, mechChips), so they carry no cue.
    case 'overreacher': return [`${a}For 1 cycle after its ${name} lands, it takes ${pct(MECH.overreacher.more)} more damage.`, `Cut the ${name}, or hit it the cycle after.`, null];
    case 'livewire': return [`${a}Each command that hits it brings its next ${name} 1 cycle sooner, up to ${MECH.livewire.max}.`, 'Leave it until a few hits can finish it.', null];
    case 'condenser': return [`Has no attack of its own. Each attack that lands on you stores a charge. At ${MECH.condenser.at} it deals ${hit(sized(pw, MECH.condenser.amount))} damage to you and empties.`, 'Cut the attack that would fill it, or break it.', null];
    case 'pacer': return [`Has no attack of its own. Every ${cyc(MECH.pacer.every)}, every attack repeats 1 cycle faster, up to ${MECH.pacer.max}. A command that hits the ${p.name} starts its count over.`, 'Hit it before each step, or break it.', null];
    case 'cutout': { const n = live && p.ticks ? p.ticks.filter((x) => !x.spent).length : TICKS.at.length; return [`Has no attack of its own. Taking it across a tick pushes every attack back ${cyc(MECH.cutout.back)}. It has ${n} ${n === 1 ? 'tick' : 'ticks'}${n < TICKS.at.length ? ' left' : ''}.`, 'Cross a tick when a big attack is due.', null]; }
    case 'magnet': return [`Deals ${hit(at.amount)} damage to you for each ◆ it wears, ${each}${live ? `, ${hit(attackAmount(p))} now` : ''}. Each ◆ you strip from another part lands on the ${p.name}, up to ${MECH.magnet.max}.`, `Strip the ${p.name} before its ${name} lands.`, null];
    case 'deadhand': return [`${a}When it breaks, the ${name} it is winding up lands at once, unless one landed this cycle or the last.`, `Break it the cycle after its ${name} lands.`, null];
    case 'reservoir': return [`Deals up to ${hit(at.amount)} damage to you ${each}, less by the share of Integrity it has lost${live ? `, ${hit(attackAmount(p))} now` : ''}.`, `Damage it before each ${name}.`, null];
    case 'flyback': return [`Has no attack of its own. The cycle after an attack lands on you, the ${p.name} repeats it at half.`, `Cut the attack it would repeat, or break the ${p.name}.`, null];
    case 'shutter': return [`${a}Its armor shuts for ${cyc(MECH.shutter.shut)}, then opens for ${MECH.shutter.open}, in turn. Shut, its ◆ cannot be stripped.`, 'Save your big hits for the cycles it is open.', null];
    case 'cistern': return [`Has no attack of its own. Each attack you cut is held in the ${p.name}. Every ${cyc(MECH.cistern.every)} it deals all it holds to you, and empties.`, 'Break it before it drains, or let small attacks land.', null];
    case 'welder': return [`${atk.replace(/\.$/, '')}, and puts 1 ◆ back on the part that wears the least.`, `Cut the ${name}, or break the ${p.name} before you strip.`, null];
    case 'matcher': return [`Has no timed attack. When you fire the same key two cycles running, it deals ${hit(sized(pw, MECH.matcher.amount))} damage to you at once.`, 'Change keys every cycle while it stands.', null];
    case 'splitter': return p.split ? [`${a}It has split, and its other half attacks on alternate cycles.`, 'Break one half, then the other.', null]
      : [`${a}Taken under ${pct(MECH.splitter.at)}, it splits into two parts that each deal ${hit(Math.max(1, Math.round(attackAmount(p) / 2)))}, on alternate cycles.`, 'Split it when two small hits suit you better.', null];
    case 'auditor': return [`Deals ${hit(at.amount)} damage to you ${each}, and ${hit(perKey(p))} more for each of your keys on cooldown when it lands${live ? `, ${hit(attackAmount(p))} now` : ''}.`, `Fire your long cooldowns just after its ${name} lands.`, null];
    case 'exposed': return [`${a}When its ${p.attack?.name || 'attack'} lands, you are Exposed. Your next incoming hit deals ${pct(MECH.exposed.mult - 1)} more.`, 'Take the next hit on a ◆ or a shield.', cue('exposes you', 'spike')];
    case 'lag': return [`${a}When it lands, you lag for ${cyc(MECH.lag.cycles)}. Your command lands after the virus acts, so it can't cut an attack due then.`, 'Cut and race before it lands.', cue('lags you', 'clock')];
    case 'leak': return [`${a}When it lands, you leak for ${cyc(MECH.leak.cycles)}. Every command you fire costs ${pct(MECH.leak.share)} of your max health. Holding is free.`, 'Hold, or fire only what counts.', cue('leaks you', 'burn')];
    case 'sandbox': return [`${a}When it lands, you are Sandboxed for ${cyc(MECH.sandbox.cycles)}. Only quiet commands fire. Strips, burns, helpers, shields and buffs still go, and direct hits don't.`, 'Finish what needs a direct hit before it lands.', cue('sandboxes you', 'shield')];
    case 'stunner': return [`${a}When it lands, you are Stunned, and your next command does not fire. A ◆ on you takes the hit and breaks instead.`, 'Wear a ◆ when it lands.', cue('stuns you', 'damage')];
    case 'junk': return [`${a}When it lands, a junk process takes one of your bar's keys. Firing that key clears it, and that is your command for the cycle.`, 'Clear it when the key matters.', cue(e?.junk && live ? `junk on ${ABILITIES[e.junk]?.name}` : 'junks a key', 'crate')];
    case 'predator': return [`${a}While you're Encrypted or Corrupted, it attacks every cycle.`, 'Cleanse, or break it before you carry either.', cue(live && p.hunting ? 'hunting you' : 'hunts the encrypted', 'damage')];
    case 'opportunist': return [p.woke && live ? `${a}Awake. It woke when you carried a debuff, and it stays awake.` : `Asleep, off the timeline, until you carry any debuff. Then it wakes for good and attacks the next cycle.${atk ? ` Once awake, it ${atk[0].toLowerCase()}${atk.slice(1)}` : ''}`, 'Break it while it sleeps, or keep clean.', cue(p.woke && live ? 'awake' : 'sleeps till you carry a debuff', 'stealth')];
    case 'feeder': return [`At the end of each cycle, it heals the most damaged part by ${pct(MECH.feeder.share)} of that part's max for each debuff you carry.${live ? ` You carry ${youDebuffs(s).length}.` : ''}`, 'Cleanse, or kill faster than it feeds.', cue('feeds on your debuffs', 'heal')];
    case 'punisher': return [`${a}When you're Hung or Stunned and lose a command, it gets a free extra attack that cycle.`, 'Answer the tells and stuns that would hang you.', cue('punishes a lost turn', 'damage')];
    case 'harvester': return [`${a}Its attack consumes all your Corrupted for an extra hit of ${pct(MECH.harvester.share)} of your max for each cycle it had left.`, 'Cleanse Corrupted before it lands.', cue('reaps your Corrupted', 'burn')];
    case 'volatile': return [`${a}When it lands, you are Corrupted for ${pct(MECH.volatile.share)} of your max every cycle for ${cyc(MECH.volatile.cycles)}. Cleansing it deals what it had left at once.`, 'Let it run out, or cleanse with a shield up.', cue('volatile corruption', 'burn')];
    case 'amplifier': { const t = live ? e.virus.parts.find((x) => alive(x) && x.amped === p.id) : null; return [`Has no attack of its own. Each cycle it boosts the next attack of another part, in turn. That attack deals ${pct(MECH.amplifier.mult - 1)} more.`, 'Break the boosted part first, or the Amplifier.', cue(t ? `boosts ${t.name}` : 'boosts the others', 'sync')]; }
    case 'bodyguard': return [`Has no attack of its own. At the end of each cycle, it shields the part your command hit for ${pct(MECH.bodyguard.share)} of that part's max. The shield takes only your commands.`, 'Switch targets, or break the Bodyguard first.', cue('shields your target', 'shield')];
    case 'vendetta': { const n = live ? e.virus.vendetta || 0 : 0; return [`${a || 'Has no attack of its own. '}While it stands, each other part you break makes the rest hit ${pct(MECH.vendetta.more)} harder for the rest of the fight.`, 'Break the Vendetta first.', cue(n ? `+${pct(MECH.vendetta.more * n)} damage` : 'avenges each break', 'damage')]; }
    case 'thorns': return [`${a}Each command that hits it leaves you Corrupted, a stack of ${pct(MECH.thorns.share)} of your max a cycle for ${cyc(MECH.thorns.cycles)}. Burns and helpers don't.`, 'Use burns and helpers on it.', cue('thorns', 'spike')];
    case 'countdown': { const left = MECH.countdown.at - (p.count || 0); return [`Has no attack of its own. It counts the commands you fire. At ${MECH.countdown.at}, every part attacks at once, and the count starts over. Holding doesn't count.`, 'Hold to stall it, or break it.', cue(live ? `big turn in ${left}` : `counts ${MECH.countdown.at} commands`, 'clock')]; }
    case 'backtrace': return [`Has no attack of its own. Each cycle, each status you carry adds a stack. At ${MECH.backtrace.at} stacks, it calls in a fragment, and the stacks start over.`, 'Cleanse, or break it.', cue(live ? `trace ${p.trace || 0}/${MECH.backtrace.at}` : 'traces your statuses', 'spider')];
    case 'swap': return [`${a}When it lands, you are Throttled for ${cyc(MECH.swap.cycles)}. While it stands, your next command hit moves your Throttled, Exposed or Corrupted onto the part it hits.`, 'Pass it to the part whose attack you want weak.', cue('passes your debuffs', 'mirror')];
    case 'turncoat': return [`${a}Below ${pct(MECH.turncoat.below)} of your Signal, it changes stance, and its attack Scrambles you for ${cyc(MECH.turncoat.cycles)}.`, 'Heal to stay over half, or break it first.', cue(live && defender(s).integrity < defender(s).max * MECH.turncoat.below ? 'scrambles now' : 'turns below half', 'mirror')];
  }
  return [atk || 'Has no attack of its own.', '', null];
}
// Parts 1 on the board (view.mjs). A part's tags under its name: { text, dim (dimmed pips), tail, hot (red: a threat), tip }.
export function mechTags(s, p) {
  const e = s.encounter, c = e.cycle, out = [], hit = (n) => blocked(s, n);
  const tag = (text, tip, o = {}) => out.push({ text, dim: '', tail: '', hot: false, tip, ...o });
  if (!alive(p)) return out;
  mechLift(s);
  switch (p.mech) {
    case 'overreacher': if (p.softAt === c) tag(`soft +${pct(MECH.overreacher.more)}`, `Soft: its ${p.attack?.name || 'attack'} landed last cycle. It takes ${pct(MECH.overreacher.more)} more damage this cycle.`); break;
    case 'livewire': tag('', `Pulled ${pulls(p)} of ${MECH.livewire.max}. Each command that hits it brings its next ${p.attack?.name || 'attack'} 1 cycle sooner. The count clears when it lands.`, { ...pips(pulls(p), MECH.livewire.max, '▲', '△'), tail: ' sooner', hot: true }); break;
    case 'condenser': tag('', `Charge ${p.charge || 0} of ${MECH.condenser.at}. Each attack that lands on you stores one. Full, it deals ${hit(sized(e.virus, MECH.condenser.amount))} damage to you at once.`, { ...pips(p.charge || 0, MECH.condenser.at), tail: ' charge' }); break;
    case 'pacer': {
      if (p.steps) tag(`tempo ▲${p.steps}`, `Tempo: every other attack repeats ${cyc(p.steps)} faster while the ${p.name} stands.`, { hot: true });
      if ((p.steps || 0) < MECH.pacer.max) { const left = Math.max(0, stepAt(s, p) - c); tag('', `Its next step comes ${left ? `in ${cyc(left)}` : 'at the end of this cycle'}. A command that hits it starts the count over.`, pips(MECH.pacer.every - left, MECH.pacer.every)); }
      break;
    }
    case 'cutout': { const n = p.ticks ? p.ticks.filter((x) => !x.spent).length : TICKS.at.length; if (n) tag(`${n} ${n === 1 ? 'trip' : 'trips'}`, `Trips left: each tick it crosses pushes every attack back ${cyc(MECH.cutout.back)}.`); break; }
    case 'magnet': if (p.attack) tag(`−${hit(p.attack.amount)} a ◆`, `Its ${p.attack.name} deals ${hit(p.attack.amount)} damage for each ◆ it wears, ${hit(attackAmount(p))} now. It holds up to ${MECH.magnet.max}.`, { hot: true }); break;
    case 'deadhand': if (staked(s, p)) tag(`on break −${hit(attackAmount(p))}`, `Broken now, its ${p.attack.name} lands at once for ${hit(attackAmount(p))}.`, { hot: true }); break;
    case 'cistern': {
      if (p.pool) tag(`holds ${hit(p.pool)}`, `Holds ${hit(p.pool)} damage from the attacks you cut. Its Drain deals all of it to you.`, { hot: true });
      const left = Math.max(0, drainAt(s, p) - c);
      tag('', `Its Drain comes ${left ? `in ${cyc(left)}` : 'this cycle'}.`, pips(MECH.cistern.every - left, MECH.cistern.every));
      break;
    }
    case 'matcher': if (p.key?.cycle === c - 1 || p.key?.cycle === c) tag(`last key: ${keyName(s, p.key.id)}`, `Your last key. Fired again ${p.key.cycle === c ? 'next' : 'this'} cycle, it sets the ${p.name} off.`); break;
    case 'splitter': if (!p.split) tag(`splits at ${pct(MECH.splitter.at)}`, `Taken under ${pct(MECH.splitter.at)}, it splits into two parts.`); break;
    case 'auditor': { const n = cooling(s); if (n) tag(`${n} ${n === 1 ? 'key' : 'keys'} cooling`, `${n} of your keys ${n === 1 ? 'is' : 'are'} on cooldown. Each adds ${hit(perKey(p))} to its ${p.attack?.name || 'attack'}.`, { hot: true }); break; }
  }
  return out;
}
// Their chips on the timeline, beside what intents() lists (`list`: the board's attack chips, sizes after your Block):
// { source, col, cls, name, text, icon, tip }. cls: soft (dashed amber, yours to use), cond (dashed red, a hit that
// comes if), hotchip (red), steelchip (armor), trip (dashed teal, what your queued command would do), ghost.
export function mechChips(s, columns = 4, list = []) {
  const e = s.encounter, c = e.cycle, out = [], hit = (n) => blocked(s, n);
  const add = (p, col, cls, name, text, tip, icon = null) => { if (col >= 0 && col < columns) out.push({ source: p.id, col, cls, name, text, icon, tip }); };
  const lands = list.filter((i) => !i.hidden && (!i.tell || i.tell === 'charge'));
  const hurts = (i) => i.effect === 'damage' || i.hit, num = (i) => (i.effect === 'damage' ? i.amount : i.hit);
  const when = (col) => (col === 0 ? 'this cycle' : col === 1 ? 'next cycle' : `in ${col} cycles`);
  for (const p of livingParts(s)) {
    switch (p.mech) {
      case 'overreacher': {
        const tip = `Soft: the cycle after its ${p.attack?.name || 'attack'} lands, it takes ${pct(MECH.overreacher.more)} more damage from everyone. A cut one leaves no soft cycle.`;
        if (p.softAt === c) add(p, 0, 'soft', 'Soft', `+${pct(MECH.overreacher.more)}`, tip);
        for (const i of lands.filter((x) => x.source === p.id && hurts(x))) add(p, i.col + 1, 'soft', 'Soft', `+${pct(MECH.overreacher.more)}`, tip);
        break;
      }
      case 'livewire': if (pulls(p) && p.attack) add(p, p.attack.due + pulls(p) - c, 'ghost', p.attack.name, '', `Where its ${p.attack.name} stood before you pulled it ${cyc(pulls(p))} sooner.`); break;
      case 'condenser': {
        const next = lands.find((i) => i.source !== p.id && i.kind !== 'fragment' && ['damage', 'encrypt', 'scramble', 'replicate'].includes(i.effect));
        const n = hit(sized(e.virus, MECH.condenser.amount));
        if ((p.charge || 0) === MECH.condenser.at - 1 && next) add(p, next.col, 'hotchip', 'Discharge', `−${n}`, `Discharge: if ${next.name} lands ${when(next.col)}, the ${p.name} is full and deals ${n} damage to you at once.`, 'event-warning');
        break;
      }
      case 'pacer': if ((p.steps || 0) < MECH.pacer.max) { const col = Math.max(0, stepAt(s, p) - c); add(p, col, 'hotchip', 'Step', 'all ▲1', `Step: at the end of ${col === 0 ? 'this cycle' : `cycle ${c + col}`}, every other attack repeats 1 cycle faster. A command that hits the ${p.name} starts its count over.`, 'server'); } break;
      case 'cutout': if (e.queue?.target === p.id && crossBy(s, e.queue.ability, p)) add(p, 0, 'trip', 'trip', `▸ all +${MECH.cutout.back}`, `Your command takes the ${p.name} across a tick: every attack lands ${cyc(MECH.cutout.back)} later.`); break;
      case 'flyback': {
        const tip = (name, n, col) => `${name}: if it lands, the ${p.name} repeats it ${when(col)} for ${n}.`;
        if (p.fly?.cycle === c - 1) { const n = hit(Math.max(1, Math.round(p.fly.amount * MECH.flyback.share))); add(p, 0, 'cond', p.fly.name, `−${n}`, `${p.fly.name}: the ${p.name} repeats last cycle's hit this cycle for ${n}.`, 'server'); }
        for (let col = 0; col + 1 < columns; col++) {
          const big = lands.filter((i) => i.col === col && i.source !== p.id && hurts(i) && num(i) > 0).sort((x, y) => num(y) - num(x))[0];
          if (big) { const n = Math.max(1, Math.round(num(big) * MECH.flyback.share)); add(p, col + 1, 'cond', big.plain || big.name, `−${n}`, tip(big.plain || big.name, n, col + 1), 'server'); }
        }
        break;
      }
      case 'shutter': for (let col = 0; col < columns; col++) {
        if (shutAt(c + col)) add(p, col, 'steelchip', 'Shut', '◆'.repeat(p.maxArmor || 0), `Shut: it wears its ◆, and nothing strips them. Hits that go through armor still land.`);
        else add(p, col, 'soft', 'Open', '0 ◆', 'Open: it wears no ◆.');
      } break;
      case 'cistern': if (p.pool) { const col = Math.max(0, drainAt(s, p) - c), n = hit(p.pool); add(p, col, 'hotchip', 'Drain', `−${n}`, `Drain: deals the ${n} it holds to you ${when(col)}, and empties.`, 'event-warning'); } break;
      case 'matcher': if (p.key?.cycle === c - 1) { const n = hit(sized(e.virus, MECH.matcher.amount)), k = keyName(s, p.key.id); add(p, 0, 'cond', k, `▸ −${n}`, `${k}: fired again this cycle, the ${p.name} deals ${n} damage to you.`, 'event-warning'); } break;
      case 'splitter': {
        const q = e.queue?.target === p.id && !p.split && !(p.armor > 0) ? previewDamage(s, e.queue.ability, p) : 0;
        if (q > 0 && q < p.integrity && p.integrity - q <= p.max * MECH.splitter.at) { const n = hit(Math.max(1, Math.round(attackAmount(p) / 2))); add(p, 0, 'trip', 'split', `▸ 2 × −${n}`, `Your command takes the ${p.name} under ${pct(MECH.splitter.at)}: it splits into two parts that each deal ${n}.`); }
        break;
      }
    }
  }
  return out;
}
// A mark on a part's own attack chip (combat.mjs intents): a Welder's Weld is steel, and says the ◆ it puts back.
export const mechMark = (p) => (p.mech === 'welder' ? { cls: 'steelchip', tail: ' · +1 ◆' } : {});
// A class on one of its bar's ticks (view.mjs ticksMarkup): a Cutout's are amber (yours to use), a Splitter's 50% red until it splits.
export const mechTick = (p, t) => (p.mech === 'cutout' ? ' sw' : p.mech === 'splitter' && !p.split && t.at === MECH.splitter.at ? ' split' : '');
// The statuses on you, for the board's strip (view.mjs statusSpans): { name, until, title, value }.
export function youMarks(s) {
  const e = s.encounter, c = e.cycle, out = [];
  if (e.exposedHit) out.push({ name: 'Exposed', until: c, title: `Your next incoming hit deals ${pct(MECH.exposed.mult - 1)} more, then it clears.`, value: `+${pct(MECH.exposed.mult - 1)}` });
  if (e.lagUntil >= c) out.push({ name: 'Lag', until: e.lagUntil, title: 'Your command lands after the virus acts this cycle.' });
  if (e.leakUntil >= c) out.push({ name: 'Leak', until: e.leakUntil, title: `Each command you fire costs ${shareOf(s, MECH.leak.share)}. Holding is free.`, value: `−${shareOf(s, MECH.leak.share)}` });
  if (e.sandboxUntil >= c) out.push({ name: 'Sandboxed', until: e.sandboxUntil, title: 'Only quiet commands fire: strips, burns, helpers, shields and buffs. Direct hits don\'t.' });
  if (e.stunned >= c) out.push({ name: 'Stunned', until: e.stunned, title: 'Your command does not fire that cycle.' });
  if (e.junk) out.push({ name: 'Junk process', until: c, title: `A junk process holds ${ABILITIES[e.junk]?.name || e.junk}. Fire that key to clear it.` });
  return out;
}

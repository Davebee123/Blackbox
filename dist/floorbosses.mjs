// The floor 2 and 3 bosses (docs/solo-bosses.md "Proposed: floors 2–8", docs/boss-guide.md): each a part and a rule of its
// own, three acts from its ♛'s ticks at 60% and 30% (BOSSES ticks), and its beat on its own part (acts.mjs beat 'part').
//
//   CENTRIFUGE      Bidding: each Surge the Gavel lands spins it faster (every 4, 3, 2); a delay or Throttle on it
//                   withdraws it to every 4. A Surge at every 2 sells: the buyer named on the Gavel joins as a part with
//                   its crew's rule (TOLLGATE a Lockbox warding the Rotor, SWARMLINE a Mirror twinned with the Gavel,
//                   PALEMASK a Veil whose timers hide), and the Gavel drops back to every 3. Act 2 (Reserve price): a
//                   withdraw steps it back one. Act 3 (Second lot): each sale brings two buyers.
//   SHAKEDOWN       Ransom Clock: 12 cycles; at 0 it leaks 30% of your max and restarts at 6. A Deadline that lands pays
//                   the ransom (+3); one called off (its wind-up, a cut, SIGINT) buys nothing. Act 2: a second Demand,
//                   its Deadline on the same cycle. Act 3 (Final notice): a leak re-arms the Demands and brings the
//                   Lockbox back.
//   SHOULDER SURFER Replay: a Sync Window every other cycle. The Logger takes damage only from commands fired in it;
//                   each one outside is logged, and at 3 its Dump plays your last logged command back at its full hit.
//                   Act 2 (Again): on its beat, every 4, it plays your last three commands back in order. Act 3 (From the
//                   top): the log never clears, and the Dump plays the biggest command logged.
//   RECURSION       Call: frames stack, main() (♛) at the bottom. Your one-part commands reach only the top frame; burns,
//                   helpers and area hits reach every frame. Every 4 cycles the top frame pushes a new one at 60% of its
//                   max, unless it is under a quarter of its own. Act 2 (Return): a frame that breaks makes the one
//                   beneath attack a cycle sooner, 50% harder. Act 3 (Overflow): at 5 frames every frame attacks at once.
//
// The rules' state rides on the virus (v.bid, v.ransom, v.surf, v.stack); combat.mjs calls in at engage (fbStart), at a
// landing (fbPower, fbLanded), a delay or Throttle (fbSlowed), a break (fbBroke), your command (fbAim, fbCommand,
// fbLogged), a phase's verbs (fbVerb) and the cycle's end (fbCycle). Their uniques (content/items.mjs) hook in here too.
import { emit, alive, part, livingParts, hit, takeDamage, strikeWith, defender, fxOn, attackAmount } from './combat.mjs';
import { BOSSES } from './data.mjs';
import { mimicHit, copyKind } from './tells.mjs';

export const FB = {
  bid: { slow: 4, fast: 2, after: 3, buyers: ['tollgate', 'swarmline', 'palemask'] },
  ransom: { clock: 12, restart: 6, pay: 3, leak: 0.3 },
  surf: { log: 3, again: 4, echo: 0.4 }, // echo: an Again note's share of its hit (40%: at half, a burst sung back took 95% of a reader's bar in three cycles)
  stack: { call: 4, push: 0.6, under: 0.25, overflow: 5, ret: 1.5, cap: 7 },
};
export const BUYER = { tollgate: 'TOLLGATE', swarmline: 'SWARMLINE', palemask: 'PALEMASK' };
export const FB_VERBS = new Set(['reserve', 'lot2', 'demand2', 'notice', 'again', 'top', 'return', 'overflow']);
const cyc = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;
const fx = (s, what) => (s.encounter ? fxOn(s, what) : null);
const fxVal = (x) => Number(x?.fx?.value) || 0;
const fxName = (x) => x?.it?.name || x?.name || '';
const actNow = (v) => 1 + (v?.phases || []).filter((x) => x.done).length;

// ---------- engage ----------
export function fbStart(s) {
  const e = s.encounter, v = e?.virus;
  if (!v?.boss || !BOSSES[v.boss]) return;
  const late = fx(s, 'late'); // Escrow: a boss's enrage and its countdowns come later
  if (late && v.enrageAt) v.enrageAt += fxVal(late);
  if (v.boss === 'centrifuge') v.bid = { k: (e.seed >>> 0) % FB.bid.buyers.length, sold: 0, lots: 1, reserve: false };
  if (v.boss === 'shakedown') v.ransom = { left: FB.ransom.clock + fxVal(late), paid: 0, leaks: 0, notice: false };
  if (v.boss === 'shouldersurfer') v.surf = { again: null, top: false };
  if (v.boss === 'recursion') v.stack = { callAt: e.cycle + FB.stack.call - 1, n: v.parts.filter((p) => p.frame != null).length, ret: false, overflow: false };
}

// ---------- CENTRIFUGE: Bidding ----------
export const nextBuyer = (v, k = 0) => FB.bid.buyers[(v.bid.k + k) % FB.bid.buyers.length];
function sell(s, gavel) {
  const e = s.encounter, v = e.virus, B = BOSSES[v.boss], joined = [];
  for (let n = 0; n < v.bid.lots; n++) {
    const who = nextBuyer(v);
    v.bid.k++;
    const spec = B.buyers[who];
    if (livingParts(s).some((x) => x.buyer === who)) continue; // one of each at a time: a second sale of it re-arms it
    const p = joinPart(s, spec, gavel);
    p.buyer = who;
    joined.push(`${BUYER[who]}'s ${p.name}`);
  }
  v.bid.sold++;
  emit(s, 'spawn', joined.length ? `SOLD. ${joined.join(' and ')} ${joined.length === 1 ? 'joins' : 'join'} the fight.` : 'SOLD. The buyer is already here.', { source: gavel.id, sold: true });
}
// A part joins the fight from a spec: the boss's size, its hits the virus's (combat.mjs bossPhases spawn's way).
function joinPart(s, spec, near) {
  const e = s.encounter, v = e.virus, B = BOSSES[v.boss];
  const old = v.parts.find((x) => x.id === spec.id);
  if (old) v.parts.splice(v.parts.indexOf(old), 1);
  const max = Math.max(1, Math.round(spec.integrity * (v.hpPower || 1) * (B.hp || 1) * (v.long ? B.long?.hp || 1 : 1)));
  const p = { id: spec.id, name: spec.name, kind: 'system', integrity: max, max, armor: spec.armor || 0, maxArmor: spec.armor || 0, patchAt: null, veiled: !!spec.veiled, loot: spec.loot || null, special: false,
    ward: spec.ward || null, twin: spec.twin || null, exposedUntil: 0, lastDamaged: 0, boosted: false, ticks: null };
  if (spec.attack) p.attack = { ...spec.attack, amount: Math.max(1, Math.round(spec.attack.amount * (v.power || 1) * (B.dmg || 1) * (v.long ? B.long?.dmg || 1 : 1))), due: e.cycle + 2, n: 0 };
  v.parts.splice(v.parts.indexOf(near) + 1, 0, p);
  return p;
}
// A delay or a Throttle on a part (combat.mjs useAbility): the Gavel's bid withdrawn; Cascade Failure.
export function fbSlowed(s, p, how) {
  const e = s.encounter, v = e?.virus;
  if (!alive(p)) return;
  if (p.gavel && p.attack && v.bid) {
    const was = p.attack.interval, to = v.bid.reserve ? Math.min(FB.bid.slow, was + 1) : FB.bid.slow;
    if (to !== was) { p.attack.interval = to; emit(s, 'status', `WITHDRAWN. Your ${how} takes the ${p.name} back to every ${to} cycles.`, { target: p.id, withdraw: true }); }
  }
  const cf = fx(s, 'slow-hit');
  if (cf && p.attack) hit(s, p, fxVal(cf), { by: fxName(cf), pierce: true, noHook: true, server: true });
}

// ---------- SHOULDER SURFER: Replay ----------
// The Sync Window opens on even cycles only (combat.mjs rollSync).
export const surfShut = (s) => s.encounter?.virus?.boss === 'shouldersurfer' && s.encounter.cycle % 2 === 1;
// A command fired outside the window (combat.mjs keylog): remembered for the Dump.
export function fbLogged(s) {
  const e = s.encounter;
  if (e.virus.boss !== 'shouldersurfer' || !e.lastCmd || e.lastCmd.id === 'hold') return;
  e.logged = [...(e.logged || []), { ...e.lastCmd }];
}
const hitOf = (s, c) => (c && copyKind(c.id) === 'hit' ? mimicHit(s, c.id, part(s, c.target) || livingParts(s)[0]) : 0);
// What the Dump plays back: the last command logged (the biggest, from the top), at its full hit; 0: the flat Dump.
export function dumpOf(s) {
  const e = s.encounter, log = e.logged || [];
  if (!log.length) return null;
  const pick = e.virus.surf?.top ? log.reduce((a, c) => (hitOf(s, c) > hitOf(s, a) ? c : a)) : log.at(-1);
  const n = hitOf(s, pick);
  return n > 0 ? { id: pick.id, amount: n } : null;
}
// The first part each fight that plays back or copies your command misses with it (Privacy Screen).
export function screened(s, p, what) {
  const e = s.encounter, x = fx(s, 'screen');
  if (!x || e.once?.screen) return false;
  (e.once ||= {}).screen = true;
  emit(s, 'blocked', `${fxName(x)}: the ${p.name}'s ${what} misses you.`, { source: p.id, gear: [{ id: x.it?.id, name: fxName(x) }] });
  return true;
}

// ---------- RECURSION: Call ----------
export const frames = (s) => livingParts(s).filter((x) => x.frame != null);
export const topFrame = (s) => frames(s).reduce((a, x) => (!a || x.frame > a.frame ? x : a), null);
export const canCall = (p) => !!p && p.integrity >= FB.stack.under * p.max;
// Your one-part command at a frame below the top lands on the top frame (burns, helpers and area hits reach every frame).
export function fbAim(s, intent, a) {
  const v = s.encounter?.virus;
  if (!v?.stack || !a || !['part', 'attack'].includes(a.target) || a.verb === 'burn' || a.helper) return intent;
  const t = part(s, intent.target), top = topFrame(s);
  if (!t || t.frame == null || !top || t === top) return intent;
  emit(s, 'status', `CALL STACK. Your ${a.name} at ${t.name} reaches only the top frame: ${top.name}.`, { target: top.id, stack: true });
  return { ...intent, target: top.id };
}
function push(s) {
  const e = s.encounter, v = e.virus, top = topFrame(s);
  if (!top || !canCall(top) || frames(s).length >= FB.stack.cap) return null;
  const n = ++v.stack.n, max = Math.max(1, Math.round(top.max * FB.stack.push));
  const p = { id: `frame${n}`, name: `Frame ${top.frame + 1}`, kind: 'system', frame: top.frame + 1, integrity: max, max, armor: 0, maxArmor: 0, patchAt: null, veiled: false, loot: null, special: false, exposedUntil: 0, lastDamaged: 0, boosted: false,
    attack: { ...(top.attack || { name: 'Surge', effect: 'damage', amount: 1, interval: 4 }), due: e.cycle + 2, n: 0 } };
  v.parts.push(p);
  emit(s, 'spawn', `CALL. ${top.name} pushes ${p.name} on top, at ${max} Integrity.`, { source: top.id, target: p.id, call: true });
  return p;
}

// ---------- the hooks ----------
// A landing's size (combat.mjs landAttack, before it lands): a Return's boost, the Dump's replay, Governor, Stack Guard.
export function fbPower(s, p, atk) {
  const e = s.encounter;
  let m = 1;
  if (p.returnBoost && atk === p.attack) { m *= p.returnBoost; p.returnBoost = 0; }
  if (atk.dump && e.virus.surf) { const d = dumpOf(s), base = attackAmount(p) || 1; if (d) { m *= d.amount / base; e.dumped = d.id; } else e.dumped = null; }
  const gov = fx(s, 'governor');
  if (gov && p.lastLanded != null && e.cycle - p.lastLanded <= 2) m *= 1 - fxVal(gov) / 100;
  const guard = fx(s, 'break-guard');
  if (guard && e.stackGuard >= e.cycle && (atk.effect === 'damage' || atk.hit)) { m *= 1 - fxVal(guard) / 100; e.stackGuard = 0; }
  return m;
}
// Before it lands, once its timer has moved on: true if it misses (Privacy Screen on a playback).
export const fbMisses = (s, p, atk) => !!((atk.dump && s.encounter.dumped) || atk.again) && screened(s, p, atk.name);
// An attack landed (combat.mjs landAttack, its timer moved on): the Gavel's bid, a Deadline paid, the Dump's log.
export function fbLanded(s, p, atk) {
  const e = s.encounter, v = e.virus;
  if (p.gavel && atk === p.attack && v.bid) {
    if (atk.interval <= FB.bid.fast) { sell(s, p); atk.interval = FB.bid.after; }
    else { atk.interval = Math.max(FB.bid.fast, atk.interval - 1); emit(s, 'status', `BID. The ${p.name} spins up: every ${atk.interval} cycles${atk.interval <= FB.bid.fast ? `. Its next Surge sells to ${BUYER[nextBuyer(v)]}` : ''}.`, { source: p.id, bid: atk.interval }); }
    atk.due = e.cycle + atk.interval;
  }
  if (p.deadline && atk === p.attack && v.ransom) { v.ransom.left += FB.ransom.pay; v.ransom.paid++; emit(s, 'status', `RANSOM PAID. The Ransom Clock gains ${FB.ransom.pay}: ${cyc(v.ransom.left)}.`, { source: p.id, ransom: v.ransom.left }); }
  if (atk.dump && v.surf && !v.surf.top) e.logged = []; // from the top: the log never clears (combat.mjs keeps its count)
}
// A part broke (combat.mjs breakPart): RECURSION's Return; Tail Call, Stack Guard.
export function fbBroke(s, p) {
  const e = s.encounter, v = e.virus;
  if (v.stack?.ret && p.frame != null) {
    const below = frames(s).filter((x) => x.frame < p.frame).sort((a, b) => b.frame - a.frame)[0];
    if (below?.attack) { below.attack.due = Math.max(e.cycle + 1, below.attack.due - 1); below.returnBoost = FB.stack.ret; emit(s, 'status', `RETURN. ${below.name} attacks a cycle sooner, ${Math.round((FB.stack.ret - 1) * 100)}% harder.`, { target: below.id, ret: true }); }
  }
  const tc = fx(s, 'break-burns');
  if (tc) for (const b of [...(e.burns || [])]) { const t = part(s, b.target); if (t && t !== p && alive(t)) hit(s, t, b.damage, { by: fxName(tc), dot: true, noHook: true }); }
  if (fx(s, 'break-guard')) e.stackGuard = e.cycle + 2;
}
// Your command (combat.mjs useAbility): Muscle Memory's rhythm.
export function fbCommand(s) {
  const e = s.encounter;
  e.rhythm = { prev: e.rhythm?.last ?? null, last: e.cycle };
}
export function fbDealt(s, opts) {
  const e = s.encounter, mm = opts.mine && !opts.dot && !opts.by && e?.commanding ? fx(s, 'rhythm') : null;
  return mm && e.rhythm?.last === e.cycle && e.rhythm.prev != null && e.cycle - e.rhythm.prev === 2 ? 1 + fxVal(mm) / 100 : 1;
}
// A phase's verbs (combat.mjs bossPhases).
export function fbVerb(s, act) {
  const e = s.encounter, v = e.virus;
  if (act === 'reserve' && v.bid) v.bid.reserve = true;
  if (act === 'lot2' && v.bid) v.bid.lots = 2;
  if (act === 'demand2') {
    const d = livingParts(s).find((x) => x.deadline), spec = BOSSES[v.boss].extra.find((x) => x.id === 'demand');
    const p = joinPart(s, { ...spec, id: 'demand2', name: 'Demand II' }, d || v.parts.at(-1));
    p.deadline = true;
    if (p.attack) { p.attack.windup = d?.attack?.windup || 0; p.attack.wound = 0; p.attack.due = d?.attack ? Math.max(e.cycle + 1, d.attack.due) : e.cycle + 3; }
    for (const w of livingParts(s).filter((x) => x.ward === 'demand')) (w.wardsToo ||= []).push('demand2');
  }
  if (act === 'notice' && v.ransom) v.ransom.notice = true;
  if (act === 'again' && v.surf) v.surf.again = e.cycle + FB.surf.again;
  if (act === 'top' && v.surf) v.surf.top = true;
  if (act === 'return' && v.stack) v.stack.ret = true;
  if (act === 'overflow' && v.stack) v.stack.overflow = true;
  return null;
}
// The cycle's end (combat.mjs cycleClose): the Ransom Clock, the Again beat, a Call. 'crashed' if a leak ended the
// fight, 'over' if a landing already did.
export function fbCycle(s) {
  const e = s.encounter, v = e.virus;
  if (v.ransom && livingParts(s).length) {
    const R = v.ransom;
    R.left--;
    if (R.left <= 0) {
      const src = livingParts(s).find((x) => x.core) || livingParts(s)[0], n = Math.max(1, Math.round(defender(s).max * FB.ransom.leak));
      const dealt = takeDamage(s, n, src.id, 'Ransom leak');
      R.left = FB.ransom.restart + fxVal(fx(s, 'late'));
      R.leaks++;
      emit(s, 'server-hit', `RANSOM LEAK: −${dealt}. The clock restarts at ${R.left}.`, { source: src.id, amount: dealt, leak: true });
      if (R.notice) {
        for (const d of livingParts(s).filter((x) => x.deadline)) { d.armor = Math.max(d.armor, d.maxArmor || 1); d.maxArmor = d.armor; d.patchAt = null; }
        const box = v.parts.find((x) => x.ward === 'demand');
        if (box && !alive(box)) { box.integrity = box.max; box.armor = box.maxArmor; emit(s, 'spawn', `FINAL NOTICE. The ${box.name} is back, and the Demands re-arm.`, { target: box.id }); }
        else emit(s, 'patch', 'FINAL NOTICE. The Demands re-arm.', { target: src.id });
      }
      if (defender(s).integrity <= 0) return 'crashed';
    }
  }
  if (v.surf?.again && e.cycle >= v.surf.again) {
    v.surf.again = e.cycle + FB.surf.again;
    const lg = livingParts(s).find((x) => x.core) || livingParts(s)[0];
    const notes = (e.cmdLog || []).filter((c) => c.cycle > e.cycle - 3 && hitOf(s, c) > 0);
    if (!notes.length) emit(s, 'blocked', `AGAIN. The ${lg.name} has nothing of yours to play back.`, { source: lg.id });
    for (const c of notes) if (strikeWith(s, lg, { name: 'Again', effect: 'damage', amount: Math.max(1, Math.round(hitOf(s, c) * FB.surf.echo)), interval: 1, noCrit: true, again: true })) return 'over';
  }
  if (v.stack && e.cycle >= v.stack.callAt) {
    v.stack.callAt = e.cycle + FB.stack.call;
    const top = topFrame(s);
    if (top && !canCall(top)) emit(s, 'status', `${top.name} is too low to Call.`, { source: top.id });
    else push(s);
    if (v.stack.overflow && frames(s).length >= FB.stack.overflow) {
      for (const f of frames(s)) if (f.attack) f.attack.due = e.cycle + 2;
      emit(s, 'warning', `OVERFLOW. ${frames(s).length} frames: every frame attacks next cycle.`, { overflow: true });
    }
  }
  return null;
}
// Chips on the board (combat.mjs intents): the Ransom Clock's leak, on the ♛'s row.
export function fbIntents(s, columns) {
  const e = s.encounter, v = e.virus, out = [];
  if (v.ransom) {
    const col = v.ransom.left - 1, src = livingParts(s).find((x) => x.core);
    if (src && col >= 0 && col < columns) out.push({ source: src.id, name: 'Ransom leak', effect: 'damage', amount: Math.round(defender(s).max * FB.ransom.leak), col, hidden: false, kind: 'system', leak: true });
  }
  return out;
}

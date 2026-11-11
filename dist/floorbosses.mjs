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
//   NIGHT DESK      No Timeout: its attacks never land. Each waits on its part as a pending trade (2 as it opens);
//                   your one-part command on a part settles its trades on you at half. At 4 pending all settle in full,
//                   and every later trade opens 25% bigger. Only the Desk takes damage (12% of its max a hit at most);
//                   its traders go with it. Act 2 (Night shift): a pending trade grows 10% a cycle. Act 3 (Finality):
//                   each trade you settle heals the Desk 4% of its max.
//   BYZANTINE       Vote: every 4 cycles, if the most damaged Node is 15% or more under the Nodes' average, it is restored
//                   to the average and every Node hits 30% harder for the fight. A hit takes 20% of a Node's max at most.
//                   Act 2 (Traitor): the most damaged Node turns; while it isn't the most damaged, the restore goes to
//                   the healthiest Node's level. Act 3 (Hard fork): a Node that breaks returns at the next vote at the
//                   others' average, unless every other Node is under half.
//   CAMSWARM        Telnet Sweep: every 5 cycles each part under half (never the Hive) hatches a fragment and shields it;
//                   each one hatched brings the next sweep a cycle sooner. A fragment that lives 3 cycles becomes a
//                   Camera with a Surge of its own; break its part and it drops. A hit takes 15% of a part's max at most.
//                   Act 2 (Botnet): every Camera fires with the C2 Node's Beacon, and a broken C2 Node comes back. Act 3
//                   (Lockout): the Hive boots a Camera, and takes no damage while a Camera stands.
//
// The rules' state rides on the virus (v.bid, v.ransom, v.surf, v.stack, v.desk, v.vote, v.swarm); combat.mjs calls in at engage (fbStart), at a
// landing (fbPower, fbLanded), a delay or Throttle (fbSlowed), a break (fbBroke), your command (fbAim, fbCommand,
// fbLogged), a phase's verbs (fbVerb) and the cycle's end (fbCycle). Their uniques (content/items.mjs) hook in here too.
import { emit, alive, part, livingParts, hit, takeDamage, strikeWith, defender, fxOn, attackAmount } from './combat.mjs';
import { BOSSES, CONFIG } from './data.mjs';
import { mimicHit, copyKind } from './tells.mjs';

export const FB = {
  bid: { slow: 4, fast: 2, after: 3, sold: 0.5, buyers: ['tollgate', 'swarmline', 'palemask'] }, // sold: each sale makes the Gavel's Surge that much harder, for the fight
  ransom: { clock: 10, restart: 5, pay: 3, leak: 0.35, grow: 0.15, most: 0.65 }, // a leak takes 35% of your max, 15 more each leak after, up to 65%
  surf: { log: 2, again: 4, echo: 0.4, grow: 0.5 }, // grow: each Dump that lands makes the next one that much bigger, for the fight; // echo: an Again note's share of its hit (40%: at half, a burst sung back took 95% of a reader's bar in three cycles)
  stack: { call: 4, push: 0.6, under: 0.25, overflow: 5, ret: 1.5, cap: 7, deeper: 0.35, sooner: 1, soonest: 3 }, // sooner: each Call let through brings the next one a cycle sooner, down to every soonest; // deeper: each Call let through makes every frame hit that much harder
  desk: { full: 4, half: 0.5, grow: 0.1, margin: 0.25, limit: 0.12, backlog: 2, heal: 0.04 }, // heal: what each trade settled under Finality gives the Desk back, of its max; limit: the most one hit takes off the Desk, of its max; backlog: trades pending as the fight opens, on its traders // margin: each Table full opens every later trade that much bigger, for the fight
  vote: { every: 4, pass: 0.15, harder: 0.3, limit: 0.2 }, // limit: the most one hit takes off a Node while another stands, of its max // pass: how far under the level it is restored to the most damaged Node must be; harder: each vote that passes, every Node's hits
  overdraft: 3, // Overdraft: cycles the rest of the hit lands over
  swarm: { sweep: 5, soonest: 2, grows: 3, cams: 4, limit: 0.15, gnaw: 2 }, // soonest: each fragment a sweep hatches brings the next sweep a cycle sooner, down to this; limit: the most one hit takes off a part, of its max // grows: cycles a fragment lives before it is a Camera; cams: Cameras at once
};
export const BUYER = { tollgate: 'TOLLGATE', swarmline: 'SWARMLINE', palemask: 'PALEMASK' };
export const FB_VERBS = new Set(['reserve', 'lot2', 'demand2', 'notice', 'again', 'top', 'return', 'overflow', 'nightshift', 'finality', 'traitor', 'hardfork', 'botnet', 'lockout']);
const cyc = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;
const fx = (s, what) => (s.encounter ? fxOn(s, what) : null);
const fxVal = (x) => Number(x?.fx?.value) || 0;
const fxName = (x) => x?.it?.name || x?.name || '';
// What the next Ransom leak takes, as a share of your max (each leak takes more), and how much harder the stack hits.
export const leakOf = (v) => Math.min(FB.ransom.most, FB.ransom.leak + FB.ransom.grow * (v?.ransom?.leaks || 0));
export const depthOf = (v) => 1 + FB.stack.deeper * (v?.stack?.calls || 0);
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
  if (v.boss === 'nightdesk') {
    v.desk = { margin: 0, night: null, final: false };
    const desk = v.parts.find((p) => p.role === 'desk'), tr = v.parts.filter((p) => p.role === 'trader' && p.attack);
    if (desk) desk.limit = FB.desk.limit;
    for (let i = 0; i < FB.desk.backlog && tr.length; i++) { const p = tr[i % tr.length]; (p.pending ||= []).push({ amount: Math.max(1, Math.round(attackAmount(p))), at: e.cycle, name: p.attack.name }); } // the backlog: it was settling before you came
  }
  if (v.boss === 'byzantine') { v.vote = { at: e.cycle + FB.vote.every - 1, passed: 0, traitor: null, fork: false }; for (const p of v.parts) if (p.role === 'node') p.limit = FB.vote.limit; }
  if (v.boss === 'camswarm') { v.swarm = { at: e.cycle + FB.swarm.sweep - 1, every: FB.swarm.sweep, n: 0, botnet: false, lockout: false }; for (const p of v.parts) p.limit = FB.swarm.limit; }
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
    ward: spec.ward || null, twin: spec.twin || null, exposedUntil: 0, lastDamaged: 0, boosted: false, ticks: null, ...(spec.role ? { role: spec.role } : {}), ...(spec.noTicks ? { noTicks: true } : {}) };
  if (spec.attack) p.attack = { ...spec.attack, amount: Math.max(1, Math.round(spec.attack.amount * (v.power || 1) * (B.dmg || 1) * (v.long ? B.long?.dmg || 1 : 1))), due: e.cycle + 2, n: 0 };
  v.parts.splice(v.parts.indexOf(near) + 1, 0, p);
  return p;
}
// Your one-part command at the Gavel while the Rotor stands (combat.mjs useAbility): a bid, its Surge one cycle sooner
// (a delay or a Throttle withdraws it instead).
export function fbBid(s, target, a) {
  const e = s.encounter, v = e?.virus;
  if (!v?.bid || !alive(target) || !target.gavel || !target.attack || !a || !['part', 'attack'].includes(a.target) || a.delay > 0 || a.status === 'throttled' || !livingParts(s).some((x) => x.core)) return;
  if (target.attack.interval <= FB.bid.fast) return;
  target.attack.interval--;
  target.attack.due = Math.min(target.attack.due, e.cycle + target.attack.interval);
  emit(s, 'status', `YOU BID. Your ${a.name} on the ${target.name} spins it up: every ${target.attack.interval} cycles${target.attack.interval <= FB.bid.fast ? `. Its next Surge sells to ${BUYER[nextBuyer(v)]}` : ''}.`, { target: target.id, bid: target.attack.interval });
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

// The Gavel's selling Surge, landing this cycle at every 2: SIGINT cuts it and withdraws the bid (tells.mjs tellSigint),
// so every class has an answer, not only the ones with a delay or a Throttle.
export const sellingGavel = (s) => { const g = s.encounter?.virus?.bid && livingParts(s).find((p) => p.gavel && p.attack); return g && g.attack.interval <= FB.bid.fast && g.attack.due === s.encounter.cycle ? g : null; };

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
// A Call due this cycle, the top frame able to make it: SIGINT stops it (tells.mjs tellSigint), as it stops a cast.
export const callingNow = (s) => { const v = s.encounter?.virus, top = v?.stack && topFrame(s); return top && v.stack.callAt === s.encounter.cycle && canCall(top) && frames(s).length < FB.stack.cap ? top : null; };
export function stopCall(s) {
  const e = s.encounter, v = e.virus, top = topFrame(s);
  v.stack.callAt = e.cycle + Math.max(FB.stack.soonest, FB.stack.call - FB.stack.sooner * (v.stack.calls || 0));
  emit(s, 'interrupt', `SIGINT stops the ${top.name}'s Call. The next one comes in ${v.stack.callAt - e.cycle} cycles.`, { target: top.id, call: true });
}
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
  v.stack.calls = (v.stack.calls || 0) + 1;
  emit(s, 'spawn', `CALL. ${top.name} pushes ${p.name} on top, at ${max} Integrity. Every frame now hits ${Math.round((depthOf(v) - 1) * 100)}% harder.`, { source: top.id, target: p.id, call: true });
  return p;
}

// ---------- NIGHT DESK: No Timeout ----------
export const pendingOf = (s) => livingParts(s).flatMap((p) => (p.pending || []).map((t) => ({ ...t, part: p })));
// What a pending trade settles for in full now: its size as it opened, grown 10% a cycle on the night shift.
export const tradeOf = (s, t) => { const from = s.encounter.virus.desk?.night; return Math.max(1, Math.round(t.amount * (from != null ? 1 + FB.desk.grow * Math.max(0, s.encounter.cycle - Math.max(t.at, from)) : 1))); };
// An attack of its that would land (combat.mjs landAttack, by fbMisses): it waits on its part as a pending trade.
function holdTrade(s, p, atk, power) {
  const e = s.encounter, v = e.virus, n = Math.max(1, Math.round(power * (1 + FB.desk.margin * v.desk.margin)));
  (p.pending ||= []).push({ amount: n, at: e.cycle, name: atk.name });
  const all = pendingOf(s);
  emit(s, 'status', `PENDING. The ${p.name}'s ${atk.name} waits as a trade: ${n}. ${all.length} of ${FB.desk.full} pending.`, { source: p.id, pending: all.length });
  if (all.length < FB.desk.full) return;
  const total = all.reduce((sum, t) => sum + tradeOf(s, t), 0);
  for (const x of livingParts(s)) x.pending = [];
  v.desk.margin++;
  const dealt = takeDamage(s, total, p.id, 'Table full');
  emit(s, 'server-hit', `TABLE FULL. All ${all.length} trades settle in full: −${dealt}. Every trade now opens ${Math.round(FB.desk.margin * v.desk.margin * 100)}% bigger.`, { source: p.id, amount: dealt, atk: 'Table full', full: true });
}
// Your one-part command's hit on a part (combat.mjs hit): its trades settle on you at half.
// Finality: the other half heals the Desk.
export function fbCmdHit(s, p) {
  const e = s.encounter, v = e?.virus;
  if (e?.preAuth) e.preAuthUsed = e.cycle; // Pre-Authorization: spent on this command
  if (!v?.desk || !p.pending?.length) return;
  const k = p.pending.length, whole = p.pending.reduce((sum, t) => sum + tradeOf(s, t), 0), n = Math.max(1, Math.round(whole * FB.desk.half));
  p.pending = [];
  p.answered = e.cycle;
  const dealt = takeDamage(s, n, p.id, 'Settled trade');
  emit(s, 'server-hit', `SETTLED. The ${p.name}'s ${k === 1 ? 'trade settles' : `${k} trades settle`} at half: −${dealt}.`, { source: p.id, amount: dealt, atk: 'Settled trade', settled: true });
  const desk = v.desk.final && livingParts(s).find((x) => x.core);
  if (desk && desk.integrity < desk.max) { const got = Math.min(Math.max(1, Math.round(desk.max * FB.desk.heal * k)), desk.max - desk.integrity); desk.integrity += got; emit(s, 'heal', `FINALITY. The ${desk.name} keeps the other half: +${got}. ${desk.integrity}/${desk.max}.`, { target: desk.id, amount: got }); }
}

// ---------- BYZANTINE: Vote ----------
export const nodesOf = (s) => livingParts(s).filter((p) => p.role === 'node');
const frac = (p) => p.integrity / p.max;
// The next vote as it stands: the Node it would restore, the level it restores to, and whether it passes.
export function voteOf(s) {
  const v = s.encounter?.virus, ns = v?.vote ? nodesOf(s) : [];
  if (ns.length < 2) return null;
  const low = ns.reduce((a, p) => (frac(p) < frac(a) ? p : a)), high = ns.reduce((a, p) => (frac(p) > frac(a) ? p : a));
  const tr = v.vote.traitor && ns.find((p) => p.id === v.vote.traitor), turned = !!tr && tr !== low;
  const to = turned ? frac(high) : ns.reduce((n, p) => n + frac(p), 0) / ns.length;
  return { low, high, to, turned, passes: to - frac(low) >= FB.vote.pass - 1e-9, gain: Math.max(0, Math.round(to * low.max) - low.integrity) };
}
// The broken Nodes a Hard fork would bring back at the next vote, and the level they return at (null: none).
export function forkOf(s) {
  const v = s.encounter?.virus, ns = v?.vote?.fork ? nodesOf(s) : [];
  const gone = ns.length ? v.parts.filter((p) => p.role === 'node' && p.integrity === 0) : [];
  if (!gone.length || ns.every((p) => frac(p) < 0.5)) return null;
  return { gone, to: ns.reduce((n, p) => n + frac(p), 0) / ns.length };
}
function vote(s) {
  const e = s.encounter, v = e.virus, fk = forkOf(s);
  if (fk) for (const p of fk.gone) {
    Object.assign(p, { integrity: Math.max(1, Math.round(p.max * fk.to)), armor: p.maxArmor, patchAt: null });
    if (p.attack) p.attack.due = e.cycle + 2;
    emit(s, 'patch', `HARD FORK. ${p.name} returns at ${p.integrity}/${p.max}.`, { target: p.id, reboot: true });
  }
  const x = voteOf(s);
  if (!x) return;
  if (!x.passes) return emit(s, 'blocked', `VOTE. It fails: no Node is ${Math.round(FB.vote.pass * 100)}% under ${x.turned ? 'the healthiest' : 'the average'}.`, { source: x.low.id, vote: false });
  x.low.integrity += x.gain;
  v.vote.passed++;
  emit(s, 'heal', `VOTE. It passes${x.turned ? ', and the traitor swings it' : ''}: ${x.low.name} is restored to ${x.low.integrity}/${x.low.max}. Every Node now hits ${Math.round(FB.vote.harder * v.vote.passed * 100)}% harder.`, { target: x.low.id, amount: x.gain, vote: true });
}

// ---------- CAMSWARM: Telnet Sweep ----------
export const camerasOf = (s) => livingParts(s).filter((p) => p.role === 'camera');
export const fragsOf = (s) => livingParts(s).filter((p) => p.kind === 'fragment');
export const hatchers = (s) => livingParts(s).filter((p) => p.kind === 'system' && !p.core && p.integrity < p.max / 2); // never the Hive itself
// The part a fragment hatched from, while it stands: it shields the fragment.
export const parentOf = (s, f) => { const p = f?.kind === 'fragment' && f.parent ? part(s, f.parent) : null; return alive(p) ? p : null; };
const sized = (v, n, k = 'hp') => { const B = BOSSES[v.boss]; return Math.max(1, Math.round(n * (k === 'hp' ? (v.hpPower || 1) * (B.hp || 1) * (v.long ? B.long?.hp || 1 : 1) : (v.power || 1) * (B.dmg || 1) * (v.long ? B.long?.dmg || 1 : 1)))); };
// A fragment hatches beside a part (combat.mjs landAttack replicate's fragment).
function hatch(s, from) {
  const e = s.encounter, v = e.virus;
  if (fragsOf(s).length >= CONFIG.fragmentCap) return null;
  const n = e.nextFragment++, pw = v.power || 1, hp = Math.max(1, Math.round(CONFIG.fragmentIntegrity * (v.addPower ?? v.hpPower ?? pw)));
  const f = { id: 'frag' + n, name: 'Fragment ' + n, kind: 'fragment', integrity: hp, max: hp, armor: 0, maxArmor: 0, patchAt: null, veiled: false, loot: null, special: false, hatched: e.cycle, parent: from.id,
    attack: { name: 'Gnaw', effect: 'damage', amount: Math.max(1, Math.round(CONFIG.fragmentDamage * pw)), interval: 1, due: e.cycle + 1 }, exposedUntil: 0, lastDamaged: 0, boosted: false };
  v.parts.push(f);
  emit(s, 'spawn', `${from.name} hatches Fragment ${n}, and shields it. It becomes a Camera in ${cyc(FB.swarm.grows)} unless the ${from.name} breaks first.`, { source: from.id, target: f.id });
  return f;
}
// A fragment that lived its cycles (or the Hive's own, at the Lockout) is a Camera: a part with a Surge of its own.
function camera(s, f) {
  const e = s.encounter, v = e.virus, spec = BOSSES[v.boss].camera, n = ++v.swarm.n, max = sized(v, spec.integrity), was = f.name;
  Object.assign(f, { name: `Camera ${n}`, kind: 'system', role: 'camera', noTicks: true, loot: spec.loot, integrity: max, max, hatched: null, parent: null, limit: FB.swarm.limit, attack: { ...spec.attack, amount: sized(v, spec.attack.amount, 'dmg'), due: e.cycle + 2, n: 0 } });
  emit(s, 'spawn', `RECRUITED. ${was} is now ${f.name}: ${max} Integrity, a Surge every ${spec.attack.interval} cycles.`, { target: f.id, camera: true });
  return f;
}
// The Hive under the Lockout: nothing reaches it while a Camera stands (combat.mjs hit).
export function fbShrugs(s, p, opts, base) {
  const v = s.encounter?.virus;
  // NIGHT DESK's traders: on the Desk's books, they take no damage while it stands.
  if (v?.desk && p.role === 'trader' && base > 0) { if (p.answered !== s.encounter.cycle || opts.dot || opts.by) emit(s, 'status', `${opts.by ? opts.by + ': ' : ''}the ${p.name} takes no damage while the Desk stands.`, { target: p.id, books: true }); return true; }
  // CAMSWARM: a fragment is shielded while the part that hatched it stands.
  if (v?.swarm && base > 0 && !opts.unshield && parentOf(s, p)) { emit(s, 'status', `${opts.by ? opts.by + ': ' : ''}${p.name} is shielded by the ${parentOf(s, p).name}.`, { target: p.id, shielded: true }); return true; }
  if (!v?.swarm?.lockout || !p.core || !(base > 0) || !camerasOf(s).length) return false;
  emit(s, 'status', `${opts.by ? opts.by + ': ' : ''}LOCKOUT. The ${p.name} takes nothing while a Camera stands.`, { target: p.id, lockout: true });
  return true;
}

// ---------- the hooks ----------
// A landing's size (combat.mjs landAttack, before it lands): a Return's boost, the Dump's replay, Governor, Stack Guard.
export function fbPower(s, p, atk) {
  const e = s.encounter;
  let m = 1;
  if (p.returnBoost && atk === p.attack) { m *= p.returnBoost; p.returnBoost = 0; }
  if (p.gavel && atk === p.attack && e.virus.bid?.sold) m *= 1 + FB.bid.sold * e.virus.bid.sold; // each sale, a harder Surge
  if (p.frame != null && e.virus.stack) m *= depthOf(e.virus); // each Call let through, a harder stack
  if (p.kind === 'fragment' && e.virus.swarm) m *= FB.swarm.gnaw; // CAMSWARM's fragments bite harder
  if (p.role === 'node' && e.virus.vote?.passed) m *= 1 + FB.vote.harder * e.virus.vote.passed; // each vote that passed, harder Nodes
  if (atk.dump && e.virus.surf?.dumps) m *= 1 + FB.surf.grow * e.virus.surf.dumps; // each Dump before it, a bigger one
  if (atk.dump && e.virus.surf) { const d = dumpOf(s), base = attackAmount(p) || 1; if (d) { m *= d.amount / base; e.dumped = d.id; } else e.dumped = null; }
  // Quorum Sensor: the second attack to land on you in a cycle.
  const qs = fx(s, 'second-less');
  if (qs && e.landings?.cycle === e.cycle && e.landings.n === 1 && (atk.effect === 'damage' || atk.hit)) m *= 1 - fxVal(qs) / 100;
  const gov = fx(s, 'governor');
  if (gov && p.lastLanded != null && e.cycle - p.lastLanded <= 2) m *= 1 - fxVal(gov) / 100;
  const guard = fx(s, 'break-guard');
  if (guard && e.stackGuard >= e.cycle && (atk.effect === 'damage' || atk.hit)) { m *= 1 - fxVal(guard) / 100; e.stackGuard = 0; }
  return m;
}
// Before it lands, once its timer has moved on: true if it misses (Privacy Screen on a playback).
// NIGHT DESK: nothing of its lands. It waits as a pending trade (power: the hit as it would have landed).
export function fbMisses(s, p, atk, power = 0) {
  if (s.encounter.virus.desk && (atk.effect === 'damage' || atk.hit)) { holdTrade(s, p, atk, power); return true; }
  return !!((atk.dump && s.encounter.dumped) || atk.again) && screened(s, p, atk.name);
}
// An attack landed (combat.mjs landAttack, its timer moved on): the Gavel's bid, a Deadline paid, the Dump's log.
export function fbLanded(s, p, atk) {
  const e = s.encounter, v = e.virus;
  if (atk.effect === 'damage' || atk.hit) e.landings = { cycle: e.cycle, n: (e.landings?.cycle === e.cycle ? e.landings.n : 0) + 1 }; // Quorum Sensor counts them
  if (p.gavel && atk === p.attack && v.bid) {
    if (atk.interval <= FB.bid.fast && livingParts(s).some((x) => x.core)) { sell(s, p); atk.interval = FB.bid.after; } // nothing sells once the Rotor ♛ is down
    else if (atk.interval <= FB.bid.fast) { /* the Rotor is down: no more sales, the Gavel stays at every 2 */ }
    else { atk.interval = Math.max(FB.bid.fast, atk.interval - 1); emit(s, 'status', `BID. The ${p.name} spins up: every ${atk.interval} cycles${atk.interval <= FB.bid.fast ? `. Its next Surge sells to ${BUYER[nextBuyer(v)]}` : ''}.`, { source: p.id, bid: atk.interval }); }
    atk.due = e.cycle + atk.interval;
  }
  if (p.deadline && atk === p.attack && v.ransom) { v.ransom.left += FB.ransom.pay; v.ransom.paid++; emit(s, 'status', `RANSOM PAID. The Ransom Clock gains ${FB.ransom.pay}: ${cyc(v.ransom.left)}.`, { source: p.id, ransom: v.ransom.left }); }
  // Only a Dump that played your command back grows the next one.
  if (atk.dump && v.surf && e.dumped) { v.surf.dumps = (v.surf.dumps || 0) + 1; emit(s, 'status', `The ${p.name}'s next Dump hits ${Math.round(FB.surf.grow * v.surf.dumps * 100)}% harder.`, { source: p.id, dumps: v.surf.dumps }); }
  if (atk.dump && v.surf && !v.surf.top) e.logged = []; // from the top: the log never clears (combat.mjs keeps its count)
  if (p.role === 'c2' && v.swarm?.botnet) v.swarm.beacon = e.cycle; // the Cameras fire with it (fbCycle)
}
// A part broke (combat.mjs breakPart): RECURSION's Return; Tail Call, Stack Guard.
export function fbBroke(s, p) {
  const e = s.encounter, v = e.virus;
  if (v.stack?.ret && p.frame != null) {
    const below = frames(s).filter((x) => x.frame < p.frame).sort((a, b) => b.frame - a.frame)[0];
    if (below?.attack) { below.attack.due = Math.max(e.cycle + 1, below.attack.due - 1); below.returnBoost = FB.stack.ret; emit(s, 'status', `RETURN. ${below.name} attacks a cycle sooner, ${Math.round((FB.stack.ret - 1) * 100)}% harder.`, { target: below.id, ret: true }); }
  }
  // SHAKEDOWN: a Demand broken while the Collector runs the clock is a missed payment: the time left is halved.
  if (p.deadline && v.ransom && livingParts(s).some((x) => x.core)) { const was = v.ransom.left; v.ransom.left = Math.max(1, Math.ceil(was / 2)); emit(s, 'warning', `MISSED PAYMENT. The ${p.name} is gone: the Ransom Clock drops from ${was} to ${v.ransom.left}.`, { target: p.id, ransom: v.ransom.left }); }
  // CAMSWARM: the fragments a part hatched drop with it.
  if (v.swarm) { const fr = livingParts(s).filter((x) => x.kind === 'fragment' && x.parent === p.id); for (const x of fr) x.integrity = 0; if (fr.length) emit(s, 'broken', `${fr.length === 1 ? 'Its fragment drops' : `Its ${fr.length} fragments drop`} with the ${p.name}.`, { target: fr[0].id, dropped: true }); }
  // NIGHT DESK: its traders go with the Desk.
  if (v.desk && p.role === 'desk') { const tr = livingParts(s).filter((x) => x.role === 'trader'); for (const x of tr) { x.integrity = 0; x.pending = []; } if (tr.length) emit(s, 'broken', `The ${p.name} closes, and ${tr.map((x) => `the ${x.name}`).join(' and ')} ${tr.length === 1 ? 'goes' : 'go'} with it.`, { target: tr[0].id, closed: true }); }
  const tc = fx(s, 'break-burns');
  if (tc) for (const b of [...(e.burns || [])]) { const t = part(s, b.target); if (t && t !== p && alive(t)) hit(s, t, b.damage, { by: fxName(tc), dot: true, noHook: true }); }
  if (fx(s, 'break-guard')) e.stackGuard = e.cycle + 2;
  // Mass Reboot: every fragment takes its hit when a part breaks.
  const mr = p.kind !== 'fragment' ? fx(s, 'break-frags') : null;
  if (mr) for (const f of livingParts(s).filter((x) => x.kind === 'fragment')) hit(s, f, fxVal(mr), { by: fxName(mr), pierce: true, noHook: true, server: true, unshield: true });
}
// Your command (combat.mjs useAbility): Muscle Memory's rhythm.
export function fbCommand(s) {
  const e = s.encounter;
  e.rhythm = { prev: e.rhythm?.last ?? null, last: e.cycle };
}
export function fbDealt(s, opts) {
  const e = s.encounter, mm = opts.mine && !opts.dot && !opts.by && e?.commanding ? fx(s, 'rhythm') : null;
  let m = mm && e.rhythm?.last === e.cycle && e.rhythm.prev != null && e.cycle - e.rhythm.prev === 2 ? 1 + fxVal(mm) / 100 : 1;
  if (!e || !opts.mine || opts.server) return m;
  // Majority Attack: more for each part below half. Pre-Authorization: your command after a shield went up.
  const ma = fx(s, 'low-parts%');
  if (ma) m *= 1 + Math.min(Number(ma.fx.cap) || Infinity, fxVal(ma) * livingParts(s).filter((x) => x.kind !== 'fragment' && x.integrity < x.max / 2).length) / 100;
  const pa = !opts.dot && !opts.by && e.commanding && e.preAuth ? fx(s, 'shield-hit') : null;
  if (pa) m *= 1 + fxVal(pa) / 100;
  return m;
}
// Overdraft (combat.mjs takeDamage, what would get through): once a fight a hit that would take you under its share of
// your max leaves you there, and the rest lands over the next 3 cycles (fbCycle).
export function fbTaken(s, d, amount) {
  const e = s.encounter, od = e && !e.once?.overdraft && !e.overdrawn ? fx(s, 'overdraft') : null;
  if (!od) return amount;
  const floor = Math.round((d.max * fxVal(od)) / 100);
  if (d.integrity <= floor || d.integrity - amount >= floor) return amount;
  const rest = amount - (d.integrity - floor);
  (e.once ||= {}).overdraft = true;
  e.overdraft = { left: FB.overdraft, each: Math.ceil(rest / FB.overdraft), name: fxName(od) };
  emit(s, 'blocked', `${fxName(od)}: you are left at ${floor}. The other ${rest} lands over the next ${cyc(FB.overdraft)}.`, { gear: [{ id: od.it?.id, name: fxName(od) }] });
  return amount - rest;
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
  if (act === 'nightshift' && v.desk) v.desk.night = e.cycle;
  if (act === 'finality' && v.desk) v.desk.final = true;
  if (act === 'traitor' && v.vote) {
    // The traitor: the most damaged Node as the act starts, so the rule holds until you break it.
    const ns = nodesOf(s), t = ns.length ? ns.reduce((a, p) => (frac(p) < frac(a) ? p : a)) : null;
    if (t) { v.vote.traitor = t.id; return `BYZANTINE turns ${t.name}. While the traitor is not the most damaged, a vote restores to the healthiest Node's level.`; }
  }
  if (act === 'hardfork' && v.vote) v.vote.fork = true;
  if (act === 'botnet' && v.swarm) {
    v.swarm.botnet = true;
    const spec = BOSSES[v.boss].extra.find((x) => x.role === 'c2');
    if (!livingParts(s).some((x) => x.role === 'c2')) { const p = joinPart(s, spec, livingParts(s).find((x) => x.core) || v.parts[0]); return `CAMSWARM links its Cameras, and the ${p.name} is back. Each Camera fires when the Beacon lands.`; }
  }
  if (act === 'lockout' && v.swarm) {
    v.swarm.lockout = true;
    const hive = livingParts(s).find((x) => x.core);
    if (hive && camerasOf(s).length < FB.swarm.cams) { const f = hatch(s, hive); if (f) camera(s, f); } // the Hive's own: a Camera at once
  }
  return null;
}
// The cycle's end (combat.mjs cycleClose): the Ransom Clock, the Again beat, a Call. 'crashed' if a leak ended the
// fight, 'over' if a landing already did.
export function fbCycle(s) {
  const e = s.encounter, v = e.virus;
  // Overdraft's bill, and Pre-Authorization's hold: a shield that went up this cycle arms your next command.
  if (e.overdraft?.left > 0) { e.overdrawn = true; try { const n = takeDamage(s, e.overdraft.each, null, e.overdraft.name, { dot: true }); emit(s, 'server-hit', `${e.overdraft.name}: −${n}.`, { amount: n, atk: e.overdraft.name, dot: true }); } finally { e.overdrawn = false; } e.overdraft.left--; if (defender(s).integrity <= 0) return 'crashed'; }
  if (e.preAuthUsed === e.cycle) e.preAuth = false;
  if (fx(s, 'shield-hit') && (e.shield || 0) > (e.shieldWas || 0)) e.preAuth = true;
  e.shieldWas = e.shield || 0;
  if (v.ransom && livingParts(s).some((x) => x.core)) { // the Collector ♛ runs the clock: break it and the clock stops
    const R = v.ransom;
    R.left--;
    if (R.left <= 0) {
      const src = livingParts(s).find((x) => x.core) || livingParts(s)[0], n = Math.max(1, Math.round(defender(s).max * leakOf(v)));
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
  if (v.desk && defender(s).integrity <= 0) return 'crashed';
  if (v.vote && e.cycle >= v.vote.at) { vote(s); v.vote.at = e.cycle + FB.vote.every; }
  if (v.swarm) {
    // The Cameras fire with the Beacon that landed this cycle.
    if (v.swarm.botnet && v.swarm.beacon === e.cycle) for (const c of camerasOf(s)) if (c.attack && strikeWith(s, c, { ...c.attack, name: 'Botnet Surge', interval: 1 })) return 'over';
    for (const f of fragsOf(s)) if (f.hatched == null) f.hatched = e.cycle; // one a tell spawned grows too
    for (const f of fragsOf(s)) if (e.cycle - f.hatched >= FB.swarm.grows && camerasOf(s).length < FB.swarm.cams) camera(s, f);
    if (e.cycle >= v.swarm.at) {
      const from = hatchers(s), n = from.filter((p) => hatch(s, p)).length;
      v.swarm.every = Math.max(FB.swarm.soonest, v.swarm.every - n);
      v.swarm.at = e.cycle + v.swarm.every;
      if (!from.length) emit(s, 'blocked', 'TELNET SWEEP. No part is under half: nothing hatches.', { sweep: false });
      else emit(s, 'warning', `TELNET SWEEP. ${from.length === 1 ? 'One part is' : `${from.length} parts are`} under half. The next sweep comes in ${cyc(v.swarm.every)}.`, { sweep: true, every: v.swarm.every });
    }
  }
  if (v.stack && e.cycle >= v.stack.callAt) {
    const top = topFrame(s);
    if (top && !canCall(top)) emit(s, 'status', `${top.name} is too low to Call.`, { source: top.id });
    else push(s);
    v.stack.callAt = e.cycle + Math.max(FB.stack.soonest, FB.stack.call - FB.stack.sooner * (v.stack.calls || 0)); // each Call let through, the next one sooner
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
    if (src && col >= 0 && col < columns) out.push({ source: src.id, name: 'Ransom leak', effect: 'damage', amount: Math.round(defender(s).max * leakOf(v)), col, hidden: false, kind: 'system', leak: true });
  }
  // BYZANTINE's vote, on the Node it would restore; CAMSWARM's sweep, on the Hive.
  const x = v.vote && voteOf(s), vc = v.vote ? v.vote.at - e.cycle : -1;
  if (x && vc >= 0 && vc < columns) out.push({ source: x.low.id, name: 'Vote', effect: 'heal', amount: x.passes ? x.gain : 0, col: vc, hidden: false, kind: 'system', vote: true });
  const hive = v.swarm && livingParts(s).find((p) => p.core), sc = v.swarm ? v.swarm.at - e.cycle : -1;
  if (hive && sc >= 0 && sc < columns) out.push({ source: hive.id, name: 'Telnet Sweep', effect: 'replicate', amount: hatchers(s).length, col: sc, hidden: false, kind: 'system', sweep: true });
  return out;
}

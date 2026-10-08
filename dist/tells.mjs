// Solo tells: moves a virus's parts announce ahead, that the player answers (TELL, TELLS and TELL_SETS in
// data.mjs; GAME_RULES.md "Tells"; docs/solo-tells.md is the designer's review sheet). The crew bosses have
// their own mechanics (raid.mjs); everything else that fights you alone brings tells: wild viruses, guards,
// elites, strains, the solo bosses and home intrusions.
//
// Every tell sits on a part (its source), shows on that part's row of the board `lead` cycles before it lands,
// and is said once in the log when it's announced. Breaking the source always stops it. The kinds:
//   charge  the part's next attack, much bigger. Its wind-up (a share of the part's max) dealt to the part
//           before it lands calls it off; a ◆, a shield, Null Route, Throttle, Brace and Block soften it.
//   cast    compiling a buff on the virus, from level 10. SIGINT stops it, and so does its wind-up.
//   seal    if the part still wears ◆ when it lands, it re-arms to full and wears one ◆ more. Strip it first.
//   mimic   the Mimic plays the command you fired this cycle back at you. Fire something quiet on its beat.
// A tell has its own clock: delaying the part's attack doesn't move it. A charge takes the place of the
// part's own attack (its timer starts over when the charge lands).
//
// State lives on the shared virus (v.tells), so a crewmate sees the same tells:
//   list  [{ id, kind, name, part, at (cycle it's announced), next (cycle it lands), told, wound, need, ... }]
//   tier  the level tier's numbers (lead, mult, cap, dot), with an elite's or a boss's extra cap
import { emit, alive, part, livingParts, attackers, defender, hackerLevel, skillBase, gearStat, attackAmount, strikeWith, toIntent, usable, readyIn, previewDamage, fxAnswer, tellWeight } from './combat.mjs';
import { CONFIG, TELL, TELLS, TELL_SETS, SEAL_FROM, STRAINS, ABILITIES } from './data.mjs';
import { raidDef } from './raid.mjs';

// What a fight's tells did, on its metrics (the gap test reads them): said, answered, landed, and the
// Signal (or Integrity) they cost you, by tell.
const tally = (s, t, k, n = 1) => { const m = (s.host || s).encounter?.metrics; if (!m) return; const x = ((m.tells ||= {})[t.id] ||= { said: 0, answered: 0, landed: 0, cost: 0 }); x[k] += n; };
export const tierOf = (level) => TELL.tiers.find((t) => level <= t.to) || TELL.tiers.at(-1);
export const tellsOf = (s) => s.encounter?.virus?.tells || null;
const label = (t) => t.name.toUpperCase();
const sourceOf = (s, t) => (t.part ? part(s, t.part) : null);

// Where a tell sits: 'idle' (picked when it's announced: idleOf), 'basic', 'special', a part id, or a list (the
// first one there).
function findSource(v, spec) {
  const ids = Array.isArray(spec) ? spec : [spec];
  for (const id of ids) {
    const p = id === 'basic' ? v.parts.find((x) => x.kind === 'system' && !x.special && x.attack && !x.ward && !x.lock && !x.twin && !x.reflect && !x.mimic && !x.command && !x.deadman)
      : id === 'special' ? v.parts.find((x) => x.special) : v.parts.find((x) => x.id === id);
    if (p) return p;
  }
  return null;
}
// Which parts can carry a tell of this kind: an attacker for a charge, a part wearing ◆ for a seal, any for a cast.
const fits = (t, p) => alive(p) && p.kind === 'system' && !p.mimic && (t.kind === 'charge' ? !!p.attack && p.attack.due < 900 : t.kind === 'seal' ? p.armor > 0 : true);
// The part you've left alone longest (the last cycle anything hit it, armor or not), the signature part first on a tie.
function idleOf(s, t) {
  const c = s.encounter.cycle;
  return livingParts(s).filter((p) => fits(t, p) && !others(s, t).some((x) => x.part === p.id)).sort((a, b) => (a.lastDamaged || 0) - (b.lastDamaged || 0) || b.special - a.special || (a.attack?.due ?? 99) - (b.attack?.due ?? 99))[0] || null;
}
// The tells a virus could bring, in order: a strain's own charge and its lineage's cast and seal, else its family's (or guard's).
function setOf(v) {
  const st = v.strain && STRAINS[v.strain];
  if (st?.tell) {
    const own = { kind: 'charge', first: 2, every: 6, part: 'idle', other: 'Overcharge', ...st.tell, id: 'strain' };
    return [own, ...(TELL_SETS[st.lineage] || []).slice(1).map((id) => ({ ...TELLS[id], id }))];
  }
  return (TELL_SETS[v.family] || []).map((id) => ({ ...TELLS[id], id }));
}

// ---------- the fight ----------
// When a solo fight starts (after the crew joins): which tells this virus brings, and when each is first said.
export function tellStart(s) {
  const e = s.encounter, v = e?.virus;
  if (!v || v.tells || CONFIG.tells === false || raidDef(v)) return;
  if ((e.soft ?? 1) < 1) return; // SPRAWL-00's first kills: you're learning the board (CONFIG.zone.starterHit)
  const tier = tierOf(v.level);
  // A crew elite brings more and harder tells; a champion invasion (elite-grade, sized for one) only bigger charges.
  const elite = v.elite && !v.champion;
  let count = tier.count + (elite ? TELL.elite.count : 0);
  if (v.boss) count = Math.max(count, TELL.boss.count);
  const list = [];
  for (const def of setOf(v)) {
    if (list.length >= count) break;
    if (def.kind === 'cast' && v.level < TELL.castFrom) continue;
    if (def.kind === 'seal' && v.level < SEAL_FROM) continue;
    if (def.part === 'idle') {
      if (!v.parts.some((p) => p.kind === 'system' && !p.mimic && (def.kind === 'charge' ? p.attack : def.kind === 'seal' ? p.maxArmor > 0 : true))) continue;
      list.push({ ...def, part: null, idle: true });
      continue;
    }
    const p = findSource(v, def.part);
    if (!p || (def.kind === 'seal' && !(p.maxArmor > 0)) || (def.kind === 'charge' && !p.attack)) continue;
    list.push({ ...def, part: p.id });
  }
  // The Mimic's beat comes with the part, not the tier.
  const mim = v.parts.find((p) => p.mimic);
  if (mim && TELLS.mimic) list.push({ ...TELLS.mimic, id: 'mimic', part: mim.id });
  const cap = tier.cap * (elite ? TELL.elite.cap : v.champion ? TELL.champion.cap : v.boss ? TELL.boss.cap : 1);
  const hits = tier.hits + (elite ? TELL.elite.hits : v.boss ? TELL.boss.hits : 0);
  v.tells = { list: list.map((t) => ({ ...t, base: t.name, at: t.first, next: null, told: false, wound: 0, count: 0 })), tier: { ...tier, hits, cap, dot: tier.dot * (cap / tier.cap) } };
  announce(s);
}
const others = (s, t) => tellsOf(s).list.filter((x) => x !== t && x.told);
// Announce what's due to be announced: it lands `lead` cycles on (never in the same cycle as another tell).
function announce(s) {
  const e = s.encounter, T = tellsOf(s);
  if (!T || e.virus.dormant) return; // a Sleeper says nothing until it wakes
  for (const t of T.list) {
    if (t.told || e.cycle < t.at) continue;
    // An idle tell sits on the part you've left alone longest, picked now (its name goes with the part).
    if (t.idle) { const q = idleOf(s, t); if (!q) { t.at = e.cycle + 1; continue; } t.part = q.id; t.name = q.special || !t.other ? t.base : t.other; }
    const p = sourceOf(s, t);
    if (!alive(p)) continue;
    if (t.kind === 'seal' && !(p.armor > 0)) { t.at = e.cycle + 1; continue; } // nothing to seal with yet: it waits for its ◆
    let next = e.cycle + T.tier.lead;
    // A charge is the part's own next attack, made bigger: it's said when that attack is `lead` away (a part
    // that attacks more often than that charges on its own beat).
    const a = t.kind === 'charge' && p.attack;
    if (a && a.due < 900 && a.interval > T.tier.lead) {
      if (a.due - e.cycle !== T.tier.lead) continue;
      next = a.due;
    } else while (others(s, t).some((x) => x.next === next)) next++;
    Object.assign(t, { told: true, next, wound: 0, need: needOf(s, t), hitBy: [] });
    tally(s, t, 'said');
    emit(s, 'telegraph', sayOf(s, t, p), { source: p.id, tell: t.id, kind: t.kind, at: next });
  }
}
// The hits that call a charge or a cast off: commands of yours that damage the part or break a ◆ on it.
const needOf = (s, t) => (t.kind === 'charge' ? tellsOf(s).tier.hits : t.kind === 'cast' ? tellsOf(s).tier.castHits : 0);
const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const when = (n) => (n <= 0 ? 'this cycle' : n === 1 ? 'next cycle' : `in ${n} cycles`);
// What the log says when a tell is announced: what's coming, when, and what answers it.
function sayOf(s, t, p) {
  const n = t.next - s.encounter.cycle, L = label(t);
  if (t.kind === 'charge') return `The ${p.name} winds up ${L}. It lands ${when(n)}. Hit it ${times(t.need)} before then to stop it, or brace for it.`;
  if (t.kind === 'cast') return `The ${p.name} is compiling ${L}. It lands ${when(n)}. SIGINT stops it, and so does hitting the ${p.name} ${times(t.need)}.`;
  if (t.kind === 'seal') return `The ${p.name} starts ${L}. If it still wears ◆ ${when(n)}, it re-arms with one ◆ more and every stripped part gets a ◆ back. Strip it first.`;
  return `The ${p.name} is recording you. ${when(n).replace(/^./, (c) => c.toUpperCase())} it plays back whatever you fire, so fire something quiet then.`;
}

// A new cycle (after the old one closed): announcements.
export function tellCycle(s) {
  if (!tellsOf(s) || s.encounter.phase !== 'active') return;
  castsEnd(s);
  announce(s);
}

// One of your commands hit a part: it damaged it or broke a ◆ (combat.mjs hit, Crack, a strip; burns, helpers
// and echoes don't count). Each command counts once toward a charge's or a cast's hits.
export function tellHit(s, p) {
  const T = tellsOf(s), e = s.encounter;
  if (!T || !alive(p)) return;
  const key = `${e.cycle}:${s.who || ''}`;
  for (const t of T.list) {
    if (!t.told || t.part !== p.id || !t.need || t.next < e.cycle || t.hitBy.includes(key)) continue;
    t.hitBy.push(key);
    t.wound += tellWeight(s); // Double Tap, Spectre: a command counts twice
    if (t.wound < t.need) { emit(s, 'status', `${label(t)}: ${t.wound} of ${t.need} hits. One more before it lands stops it.`, { source: p.id, tell: t.id }); continue; }
    // A charge called off knocks the attack it was riding on back (TELL.knock cycles): it lands later, at its usual size.
    const a = t.kind === 'charge' && p.attack;
    if (a && a.due <= t.next) a.due = Math.max(a.due, t.next) + TELL.knock;
    emit(s, t.kind === 'cast' ? 'interrupt' : 'blocked', t.kind === 'cast' ? `You hit the ${p.name} out of its compile: ${label(t)} is stopped.` : `You hit the ${p.name} in time: ${label(t)} is called off${a ? `, and its plain ${a.name} is knocked back ${TELL.knock === 1 ? 'a cycle' : `${TELL.knock} cycles`}` : ''}.`, { source: p.id, target: p.id, tell: t.id, answered: true });
    rest(s, t, e.cycle, true);
    fxAnswer(s); // gear that fires when you call off a tell (Retry Loop, Abort Handler, Ctrl-C…)
  }
}
// A tell is done (it landed, or it was answered): the next one comes `every` cycles on.
function rest(s, t, from, answered = false) {
  const lead = tellsOf(s).tier.lead;
  t.told = false; t.wound = 0; t.count++;
  if (answered) { t.answered = (t.answered || 0) + 1; tally(s, t, 'answered'); }
  t.at = from + Math.max(1, t.every - lead);
  t.next = null;
}
// A part broke (combat.mjs breakPart): its tells stop.
export function tellBroke(s, p) {
  const T = tellsOf(s);
  if (!T) return;
  for (const t of T.list.filter((x) => x.part === p.id)) {
    if (t.told) { emit(s, 'blocked', `${label(t)} dies with the ${p.name}.`, { source: p.id, tell: t.id, answered: true }); tally(s, t, 'answered'); }
    if (t.idle) { rest(s, t, s.encounter.cycle); t.part = null; } // another part takes it up later
    else { t.told = false; t.gone = true; }
  }
  T.list = T.list.filter((t) => !t.gone);
}

// A charge landing this cycle from this part: it takes the place of the part's own attack.
export const chargeNow = (s, p) => !!tellsOf(s)?.list.some((t) => t.kind === 'charge' && t.told && t.part === p.id && t.next === s.encounter.cycle);
// What a charge does when it lands, as the attack it replaces would (so ◆, shields, Null Route, Throttle and
// Brace all count), bigger, never more than the tier's cap of your max (cap; dot for a stack).
function chargeAttack(s, t, p) {
  const T = tellsOf(s), max = defender(s).max, a = p.attack;
  const enr = p.enrage && p.integrity < p.max / 2 ? CONFIG.enrage : 1; // attackAmount counts Bricker's rage again: take it out
  // Bigger by mult, but adding no more than cap of your max, and never past the ceiling.
  const big = (n, cap) => Math.max(1, Math.round(Math.min(TELL.ceiling * max, n + Math.min(cap * max, n * (T.tier.mult - 1)))));
  const base = { ...a, name: t.name, ramp: 0, step: 0, rampBy: 0, bonus: 0, grow: 0, windup: 0, wound: 0, noCrit: true, tell: t.id };
  if (a.effect === 'damage') return { ...base, amount: Math.max(1, Math.round(big(attackAmount(p), T.tier.cap) / enr)) };
  if (a.effect === 'encrypt') return { ...base, burst: Math.max(1, Math.round(Math.min(T.tier.dot * max, a.amount * (T.tier.mult - 1)))) }; // its Encrypt, and a burst on top (TELL.burst cycles)
  if (a.effect === 'scramble') return { ...base, amount: a.amount + (t.longer || 0), hit: a.hit ? (t.plain ? a.hit : big(a.hit, T.tier.cap)) : 0 }; // Possession: the same hit, a longer scramble
  if (a.effect === 'heal') return { ...base, amount: Math.round(a.amount * T.tier.mult) };
  return { ...base, hit: a.hit || 0 }; // replicate: the spawns come on top (t.spawn)
}
// The virus's half, after its parts' attacks: each tell due lands. True if the fight ended.
export function tellLand(s) {
  const T = tellsOf(s), e = s.encounter;
  if (!T) return false;
  for (const t of T.list.filter((x) => x.told && x.next === e.cycle)) {
    const p = sourceOf(s, t);
    if (!alive(p)) continue;
    const was = defender(s).integrity;
    const done = () => { const lost = was - defender(s).integrity; if (lost > 0) tally(s, t, 'cost', lost); };
    if (t.kind !== 'seal' || p.armor > 0) tally(s, t, 'landed');
    if (t.kind === 'charge') {
      if (!p.attack) { rest(s, t, e.cycle); continue; }
      const atk = chargeAttack(s, t, p), locked = s.encounter.encrypt || 0;
      if (strikeWith(s, p, atk)) return done(), true;
      // Full Disk: a burst of encryption on top of its Encrypt, for TELL.burst cycles (it goes when the part breaks, or with Purge).
      if (atk.burst && (s.encounter.encrypt || 0) > locked) { // its Encrypt got through (a ◆, Null Route or Sanitize stops both)
        s.encounter.burst = { name: t.name, amount: atk.burst, left: TELL.burst, source: p.id };
        emit(s, 'encrypt', `${label(t)}: a burst of encryption on top, −${atk.burst} a cycle for ${TELL.burst} cycles.`, { source: p.id, amount: atk.burst, tell: t.id, missed: true });
        tally(s, t, 'cost', atk.burst * TELL.burst);
      }
      // A brood: more spawns on top of the charged one (up to the usual limit).
      if (t.spawn && atk.effect === 'replicate' && alive(p)) for (let k = 0; k < t.spawn; k++) strikeWith(s, p, { ...atk, hit: 0 });
      if (t.shred) shred(s, p, t);
      if (alive(p) && p.attack) { p.attack.due = Math.max(p.attack.due, e.cycle + p.attack.interval); if (p.attack.ramp) p.attack.step = (p.attack.step || 0) + 1; } // it took the attack's place (a ramp still climbs)
      done();
    } else if (t.kind === 'seal') {
      if (p.armor > 0) {
        // It re-arms to full with one ◆ more for the rest of the fight, and every stripped part gets a ◆ back.
        p.maxArmor += 1; p.armor = p.maxArmor; p.patchAt = null;
        const re = livingParts(s).filter((x) => x !== p && x.maxArmor > 0 && x.armor < x.maxArmor);
        for (const x of re) { x.armor++; x.patchAt = null; }
        emit(s, 'patch', `${label(t)} goes through while the ${p.name} still wears ◆. It re-arms to ${p.armor} ◆${re.length ? `, and ${re.map((x) => x.name).join(' and ')} ${re.length === 1 ? 'gets' : 'each get'} a ◆ back` : ''}.`, { target: p.id, tell: t.id, missed: true });
      } else emit(s, 'blocked', `${label(t)} fails. The ${p.name} has no ◆ left to seal with.`, { source: p.id, tell: t.id, answered: true });
    } else if (t.kind === 'cast') {
      castLands(s, t, p);
    } else if (t.kind === 'mimic') {
      if (mimicLands(s, t, p)) return done(), true;
      done();
    }
    rest(s, t, e.cycle, t.kind === 'seal' && !(p.armor > 0));
  }
  return false;
}
// A cast that compiled: a buff on the virus for TELL.castLasts cycles (a second one starts the clock over).
function castLands(s, t, p) {
  const v = s.encounter.virus, c = s.encounter.cycle, until = c + TELL.castLasts;
  const fresh = !(v.buffs?.[t.does] >= c);
  (v.buffs ||= {})[t.does] = until;
  if (t.does === 'loud') {
    if (fresh) for (const x of attackers(s)) boost(x, TELL.loud);
    emit(s, 'phase', `${label(t)} compiles. Every attack ${v.name} has hits ${Math.round((TELL.loud - 1) * 100)}% harder for ${TELL.castLasts} cycles.`, { target: p.id, tell: t.id, missed: true });
  } else if (t.does === 'grow') {
    const all = livingParts(s).filter((x) => x.kind === 'system');
    for (const x of all) { const n = Math.round(x.max * TELL.grow); x.max += n; x.integrity += n; }
    emit(s, 'phase', `${label(t)} compiles. ${all.map((x) => x.name).join(', ')} ${all.length === 1 ? 'grows' : 'grow'} ${Math.round(TELL.grow * 100)}% more Integrity.`, { target: p.id, tell: t.id, missed: true });
  } else if (t.does === 'haste') {
    // What's on the timeline stays where it is (nothing lands unannounced); the repeats after it come sooner.
    if (fresh) for (const x of attackers(s)) if (x.attack.interval > 2) { x.attack.hasted = true; x.attack.interval--; }
    emit(s, 'phase', `${label(t)} compiles. For ${TELL.castLasts} cycles, every attack ${v.name} has repeats a cycle faster.`, { target: p.id, tell: t.id, missed: true });
  }
}
const boost = (x, k) => { const a = x.attack; if (!a) return; if (['damage', 'encrypt'].includes(a.effect)) a.amount = Math.max(1, Math.round(a.amount * k)); if (a.hit) a.hit = Math.max(1, Math.round(a.hit * k)); };
// A cast's buff that ran out (combat.mjs cycleClose, through tellCycle): its attacks go back to what they were.
function castsEnd(s) {
  const v = s.encounter.virus, c = s.encounter.cycle;
  for (const [k, until] of Object.entries(v.buffs || {})) {
    if (until >= c) continue;
    delete v.buffs[k];
    if (k === 'loud') for (const x of attackers(s)) boost(x, 1 / TELL.loud);
    if (k === 'haste') for (const x of attackers(s).filter((y) => y.attack.hasted)) { x.attack.hasted = false; x.attack.interval++; }
    emit(s, 'status', `${v.name}'s ${k === 'loud' ? 'extortion' : 'persistence'} runs out.`, {});
  }
}
// What the Mimic would play back of a command: its direct hit (a skill's listed damage, at your size, times
// TELL.mimic; burns, helpers, shields and debuffs give it nothing), before your Block and shields.
export function mimicHit(s, id, target) {
  const a = ABILITIES[id];
  return a && a.damage > 0 && a.verb === 'hit' ? Math.round((skillBase(s, id, target) + gearStat(s, 'damage')) * TELL.mimic) : 0;
}
// The Mimic plays back the command you fired this cycle: its direct damage, at you. True if the fight ended.
function mimicLands(s, t, p) {
  const host = s.host || s, e = host.encounter, last = e.lastCmd;
  const id = last && last.cycle === e.cycle ? last.id : null, a = id && ABILITIES[id];
  const target = last && part(host, last.target);
  const direct = id ? mimicHit(host, id, target || p) / TELL.mimic : 0;
  if (!direct) { emit(s, 'blocked', `The ${p.name} plays back ${a ? a.name : 'nothing'}, and there's no hit in it to copy.`, { source: p.id, tell: t.id, answered: true }); return false; }
  const amount = Math.max(1, Math.round(Math.min(TELL.ceiling * defender(host).max, direct * TELL.mimic)));
  emit(s, 'status', `The ${p.name} plays your ${a.name} back at you.`, { source: p.id, tell: t.id, missed: true });
  return strikeWith(s, p, { name: `${a.name} (mimicked)`, effect: 'damage', amount, interval: 99, noCrit: true, tell: t.id });
}
// The Shredder's Deep Shred: it shreds the newest code or credits file in your pack (never a protocol, a blueprint or a key).
function shred(s, p, t) {
  const pack = s.run?.pack;
  if (!pack?.length) return;
  for (let i = pack.length - 1; i >= 0; i--) {
    const f = pack[i];
    if (!['code', 'credits', 'cache'].includes(f.kind)) continue;
    pack.splice(i, 1);
    emit(s, 'status', `${label(t)} shreds ${f.name} out of your pack.`, { source: p.id, tell: t.id, missed: true, shred: f.name });
    return;
  }
}

// ---------- SIGINT on a solo cast ----------
// The cast compiling now (the one landing soonest), for SIGINT.
export function tellCast(s) {
  const T = tellsOf(s);
  return T ? T.list.filter((t) => t.kind === 'cast' && t.told).sort((a, b) => a.next - b.next)[0] || null : null;
}
export function tellSigint(s) {
  const t = tellCast(s);
  if (!t) return false;
  const p = sourceOf(s, t);
  t.interrupted = (t.interrupted || 0) + 1;
  s.encounter.metrics.interrupts++;
  rest(s, t, s.encounter.cycle, true);
  t.at = Math.max(s.encounter.cycle + 1, t.at - TELL.sooner);
  emit(s, 'interrupt', `SIGINT stops ${label(t)}. The ${p?.name || 'virus'} starts the next one ${TELL.sooner} cycles sooner.`, { target: p?.id, tell: t.id, answered: true });
  fxAnswer(s);
  return true;
}

// ---------- the board ----------
// What's coming, for intents() (combat.mjs): each told tell on its part's row, in the column it lands.
// effect: what a charge does when it lands (so the forecast and the planner read a charged hit as a hit);
// 'tell' for the rest. need/wound: a wind-up's progress.
export function tellIntents(s, columns = 4) {
  const T = tellsOf(s), e = s.encounter;
  if (!T || e.phase !== 'active') return [];
  const out = [];
  for (const t of T.list) {
    if (!t.told) continue;
    const col = t.next - e.cycle, p = sourceOf(s, t);
    if (col < 0 || col >= columns || !alive(p)) continue;
    const x = { source: p.id, name: t.name, tell: t.kind, id: t.id, col, hidden: false, kind: p.kind, need: t.need, wound: t.wound, does: t.does || null, effect: 'tell', amount: 0 };
    if (t.kind === 'charge' && p.attack) {
      const atk = chargeAttack(s, t, p);
      x.effect = atk.effect;
      x.amount = atk.effect === 'damage' ? Math.round(atk.amount * (p.enrage && p.integrity < p.max / 2 ? CONFIG.enrage : 1)) : atk.amount;
      if (atk.hit) x.hit = atk.hit;
      if (t.spawn) x.spawn = t.spawn + 1;
    }
    out.push(x);
  }
  return out;
}

// ---------- the bots (planner.mjs) ----------
// How a player who reads tells answers them: SIGINT a cast it can't hit through, go quiet on the Mimic's
// beat, strip a part that's about to seal, put damage on a charge it can call off. TELL.bots.answer false: a bot
// that plays as if there were none (balance.mjs, for the gap test).
export const answers = () => TELL.bots.answer !== false;
const ok = (s, text) => !!text && !toIntent(s, text).error;
const first = (s, list) => list.find((c) => ok(s, c)) || null;
const soon = (s, lag) => (tellsOf(s)?.list || []).filter((t) => t.told && t.next - s.encounter.cycle <= lag);
// Commands that deal no direct damage: what you fire on the Mimic's beat.
export const QUIET = ['harden', 'firewall', 'bulkhead', 'dmz', 'multicast', 'heartbeat', 'shadow-copy', 'log-wipe', 'overvolt', 'turbo-boost', 'chain-reaction', 'malloc', 'brace', 'patch', 'null-route'];
const quietFor = (s, t) => [...QUIET, ...['crack', 'shaped-charge', 'bit-rot', 'exploit', 'tag', 'hook', 'inject', 'deploy', 'spawn', 'botnet', 'fan-out', 'purge', 'thermal-runaway', 'keepalive'].map((id) => id + ' ' + t.id), 'hold'];
// Something of yours that softens a hit, ready by the time it lands.
const MITIGATE = ['harden', 'bulkhead', 'firewall', 'null-route', 'dmz', 'shadow-copy', 'hot-standby', 'brace'];
const covered = (s, turns) => MITIGATE.some((id) => usable(s).includes(id) && readyIn(s, id) <= turns - 1);
// What a charge costs you if it lands (calling it off saves the whole attack), in Signal, roughly: a stack and a
// burst bleed a few cycles, a spawn gnaws.
function chargeCost(s, t, p) {
  if (!p.attack) return 0;
  const atk = chargeAttack(s, t, p), a = p.attack, max = defender(s).max;
  if (atk.effect === 'damage') return atk.amount;
  if (atk.effect === 'encrypt') return (atk.burst || 0) * TELL.burst + a.amount * 3;
  if (atk.effect === 'scramble') return (atk.hit || 0) + max * 0.07 * (2 + (t.longer || 0));
  if (atk.effect === 'replicate') return (atk.hit || 0) + (1 + (t.spawn || 0)) * max * 0.08;
  return max * 0.06; // a bigger heal on its side
}
// What a cast would cost you if it compiles, in Signal, roughly: the extra its buff adds to the attacks due while
// it lasts, or (Self-Update) a share of the Integrity it adds, as what you take while you chew through it.
function castWorth(s, t) {
  const c = s.encounter.cycle, L = TELL.castLasts, due = (x) => Math.max(0, Math.floor((c + L - x.attack.due) / x.attack.interval) + 1);
  const hits = attackers(s).filter((x) => ['damage', 'encrypt'].includes(x.attack.effect) || x.attack.hit);
  const size = (x) => x.attack.hit || x.attack.amount;
  if (t.does === 'loud') return hits.reduce((n, x) => n + size(x) * (TELL.loud - 1) * due(x), 0);
  if (t.does === 'haste') return hits.reduce((n, x) => n + size(x) * Math.max(0, Math.floor(L / Math.max(2, x.attack.interval - 1)) - Math.floor(L / x.attack.interval)), 0);
  if (t.does === 'grow') return livingParts(s).reduce((n, x) => n + x.max * TELL.grow, 0) * 0.3;
  return 0;
}
// The best command of yours that hits a part now (it counts toward a charge's or a cast's hits): on armor a
// Spike breaks a ◆; on bare code, your biggest ready hit.
const HITS = ['shatter', 'retaliate', 'opening', 'segfault', 'overload', 'flood', 'backdoor', 'backstab', 'reclaim', 'rate-limit', 'blowback', 'stack-smash', 'crack', 'shaped-charge', 'spike'];
function hitOn(s, p) {
  if (p.armor > 0) return first(s, ['crack ' + p.id, 'spike ' + p.id]);
  return HITS.map((id) => id + ' ' + p.id).filter((c) => ok(s, c)).sort((a, b) => previewDamage(s, b.split(' ')[0], p) - previewDamage(s, a.split(' ')[0], p))[0] || null;
}
// A planned command that hits this part (so it counts toward its tell's hits).
const hitsIt = (planned, p) => { const [id, at] = (planned || '').split(' '); return at === p.id && (ABILITIES[id]?.damage > 0 || ['crack', 'shaped-charge', 'retaliate', 'opening', 'segfault', 'shatter', 'stack-smash', 'thermal-throttle', 'blowback'].includes(id) || ABILITIES[id]?.verb === 'hit'); };
// A planned command that breaks a part: nothing a tell asks for is worth more.
function kills(s, planned) {
  const [id, at] = (planned || '').split(' '), p = at && part(s, at);
  return !!(p && alive(p) && ABILITIES[id] && !(p.armor > 0) && previewDamage(s, id, p) >= p.integrity);
}
// Stripping a part in one command: Spike on its last ◆, Crack or Shaped Charge on more.
const quickStrip = (s, p) => p.armor <= 1 || (p.armor <= 3 && usable(s).includes('crack') && readyIn(s, 'crack') === 0) || (usable(s).includes('shaped-charge') && readyIn(s, 'shaped-charge') === 0);
// A part whose attack lands big this cycle or next (at least `size`, or a fifth of your max): the usual play
// (break it, soften it) comes first.
const urgentHit = (s, c, p, size) => attackers(s).some((x) => x !== p && x.attack.due - c <= 1 && (x.attack.effect === 'damage' ? x.attack.amount : x.attack.hit || 0) >= Math.min(size, defender(s).max * 0.2));
// A command that answers a tell right now, or null. Each answer waits for its last chance, so the usual play
// (a kill, a part about to fire) goes first; none overrides a kill or a hit you're softening.
//   charge: hit its part with a command, when what it adds is worth one (and no softener covers it)
//   cast:   SIGINT on the cycle it lands, when its buff is worth a command; else hit it
//   mimic:  on its beat, a command with no direct hit, when the planned one would come back hard
//   seal:   strip its part, when one command does it
export function tellMove(s, t0 = null, planned = null) {
  if (!answers() || TELL.bots.move === false || !tellsOf(s) || kills(s, planned) || MITIGATE.includes((planned || '').split(' ')[0])) return null;
  const c = s.encounter.cycle, max = defender(s).max;
  // The Mimic plays back what you fire this cycle: a hit to answer a charge comes back at you then (Crack doesn't).
  const recording = soon(s, 0).some((t) => t.kind === 'mimic');
  for (const t of soon(s, 2).sort((a, b) => a.next - b.next)) {
    const p = sourceOf(s, t);
    if (!alive(p)) continue;
    const now = t.next === c, turns = t.next - c + 1, left = (t.need || 0) - (t.wound || 0);
    if (t.kind === 'charge' && TELL.bots.hit !== false && left > 0 && turns <= left + 1 && !hitsIt(planned, p)) { // a cycle before the last: on the last one you'd rather soften it
      // Worth a command: more so when the command it replaces sets up damage over time (a burn or helpers).
      const cost = chargeCost(s, t, p), builds = ABILITIES[(planned || '').split(' ')[0]]?.verb === 'burn';
      if (cost >= max * (builds ? 0.14 : 0.06) && !urgentHit(s, c, p, cost)) { const h = hitOn(s, p); if (h && (!recording || !mimicHit(s, h.split(' ')[0], p))) return h; }
    }
    if (t.kind === 'cast' && left > 0) {
      const worth = castWorth(s, t);
      if (now && TELL.bots.sigint !== false && hackerLevel(s) >= TELL.castFrom && ok(s, 'sigint') && worth >= max * 0.06 && !urgentHit(s, c, p, worth)) return 'sigint';
      // (Hitting a cast off takes two commands: a bot leaves that to its usual play.)
    }
    if (t.kind === 'mimic' && TELL.bots.quiet !== false && now && planned) {
      const id = planned.split(' ')[0];
      const hard = mimicHit(s, id, part(s, planned.split(' ')[1]) || p) >= max * 0.06;
      if (hard) return first(s, quietFor(s, t0 && alive(t0) ? t0 : livingParts(s).find((x) => x !== p) || p));
    }
    // A seal costs its part one ◆ more: worth a command only if one command strips it.
    if (t.kind === 'seal' && TELL.bots.strip !== false && t.next - c <= 1 && p.armor > 0 && quickStrip(s, p)) {
      const strip = first(s, [p.armor >= 2 && 'shaped-charge ' + p.id, p.armor >= 2 && 'crack ' + p.id, p.armor <= 1 && 'spike ' + p.id]);
      if (strip) return strip;
    }
  }
  return null;
}
// tellMove does it all now: no target to switch to.
export const tellFocus = () => null;
// For the gap test and tests: what a fight's tells did (said, answered, landed).
export function tellLog(s) {
  return s.logs.filter((e) => e.tell).map((e) => ({ tell: e.tell, type: e.type, answered: !!e.answered, missed: !!e.missed }));
}

// Solo tells: moves a virus's parts announce ahead, that the player answers (TELL, TELLS and TELL_SETS in
// data.mjs; GAME_RULES.md "Tells"; docs/solo-tells.md is the designer's review sheet). The crew bosses have
// their own mechanics (raid.mjs); everything else that fights you alone brings tells: wild viruses, guards,
// elites, strains, the solo bosses and home intrusions.
//
// One clock. A tell never runs on a timer of its own:
//   charge  powers up one of its part's scheduled attacks, an attack already on the timeline. Its cell turns into
//           the charge `lead` cycles ahead (or more) and it lands exactly when that attack was due. Delaying the
//           attack moves the charge with it. It rides the attack's landing count (attack.n), not a cycle.
//   cast    compiling a buff on the virus, from level 10: a marked cell on its part's row, `lead` cycles ahead.
//   seal    if its part still wears ◆ when it lands, it re-arms with one ◆ more and every stripped part gets one
//           back. A marked cell, `lead` ahead.
//   mimic   the Mimic's beat (every 4 cycles): it plays the command you fire then back at you.
// Each tell sits on a fixed part (the family's signature part for its charge and seal, its basic part for its
// cast), shown on the chip and in the codex. No pile-ups: a charge never lands with another part's heavy attack
// or on a Mimic's beat, below level 17 one tell is live at a time, from 17 two, never on the same cycle.
//
// Deliberate answers. Only a command of yours aimed at the part, typed after the tell was said, counts: area hits,
// burns, helpers, spills, auto-repeat and daemons don't. A charge asks for a hit (or `strip ◆N`), a cast SIGINT
// or two hits, a seal a strip, the Mimic a quiet command. Reading pays: a charge or the Mimic called off leaves
// the part Open (+50% from everyone for 2 cycles); a cast or a seal stopped readies the skill that did it. Each
// read adds XP to the kill, and reading every tell in a fight rolls its loot once more. Ignoring hurts: from level
// 10 a charge can add a quarter of your max, and a tell that lands leaves an after-effect (your last skill locked,
// your ◆ and shield gone).
//
// State lives on the shared virus (v.tells), so a crewmate sees the same tells:
//   list  [{ id, kind, name, part, told, said (cycle it was said), next (cycle it lands), n (a charge: the
//         attack's landing it rides), after (the soonest the next one may land), wound, need, answer }]
//   tier  the level tier's numbers (lead, live, mult, cap, dot, after), with an elite's or a boss's extra cap
import { hit, implanted, emit, alive, part, livingParts, attackers, defender, hackerLevel, skillBase, gearStat, attackAmount, strikeWith, toIntent, usable, readyIn, previewDamage, alliesOf, fxAnswer, tellWeight, fxOn } from './combat.mjs';
import { CONFIG, TELL, TELLS, TELL_SETS, SEAL_FROM, STRAINS, ABILITIES, BOSSES } from './data.mjs';
import { raidDef } from './raid.mjs';
import { readGene, seeGene } from './genome.mjs';
import { ignores } from './genes.mjs';

// What a fight's tells did, on its metrics (the gap test reads them): said, answered, read (answered by a command
// of yours, not by breaking the part), landed, and the Signal (or Integrity) they cost you, by tell.
const tally = (s, t, k, n = 1) => { const m = (s.host || s).encounter?.metrics; if (!m) return; const x = ((m.tells ||= {})[t.id] ||= { said: 0, answered: 0, read: 0, landed: 0, cost: 0 }); x[k] += n; if (k === 'read') m.reads = (m.reads || 0) + n; };
export const tierOf = (level) => TELL.tiers.find((t) => level <= t.to) || TELL.tiers.at(-1);
export const tellsOf = (s) => s.encounter?.virus?.tells || null;
const label = (t) => t.name.toUpperCase();
const sourceOf = (s, t) => (t.part ? part(s, t.part) : null);
const cycles = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;

// The fixed part a tell sits on: 'special' (the signature part), 'basic', or a part id; a charge needs a part
// with an attack, so it falls back to the other system part that has one.
const isSystem = (x) => x.kind === 'system' || !x.kind; // a part, or a part's spec (the codex)
const isBasic = (x) => isSystem(x) && !x.special && !x.ward && !x.lock && !x.twin && !x.reflect && !x.mimic && !x.command && !x.deadman;
function findSource(v, def) {
  const sys = v.parts.filter((x) => isSystem(x) && !x.mimic && !x.from);
  const pick = def.part === 'special' ? sys.find((x) => x.special) : def.part === 'basic' ? sys.find(isBasic) : sys.find((x) => x.id === def.part);
  const fits = (p) => !!p && (def.kind === 'charge' ? !!p.attack : def.kind === 'seal' ? (p.maxArmor ?? p.armor) > 0 : true);
  if (fits(pick)) return pick;
  return [sys.find((x) => x.special), sys.find(isBasic), ...sys].find(fits) || null;
}
// The tells a virus could bring, in order: a strain's own charge and its lineage's cast and seal, else its family's (or guard's).
// A native boss (BOSSES nb-*) brings its own set, or its strain's with the charge under the boss's name. Each names its gene.
function setOf(v) {
  const st = v.strain && STRAINS[v.strain], boss = v.boss && BOSSES[v.boss];
  if (st?.tell && !TELL_SETS[v.boss]) {
    const own = { kind: 'charge', part: 'special', gene: 'overcharge', ...st.tell, ...(boss?.charge ? { name: boss.charge } : {}), id: 'strain' };
    return [own, ...(TELL_SETS[st.lineage] || []).slice(1).map((id) => ({ ...TELLS[id], id }))];
  }
  return (TELL_SETS[v.boss] || TELL_SETS[v.family] || []).map((id) => ({ ...TELLS[id], id }));
}
// The tell a part powers up, for the codex (view.mjs partAbout): its name and kind, or null.
export function partTells(v, p) {
  const out = [];
  for (const def of setOf(v)) { if (def.kind === 'seal' || def.id === 'overcharge') continue; const q = findSource(v, def); if (q?.id === p.id) out.push({ name: def.name, kind: def.kind }); }
  if (p.mimic) out.push({ name: 'Mimic', kind: 'mimic' });
  return out;
}

// A small seeded jitter (0..TELL.jitter) that never touches the game's dice: which scheduled attack gets powered up.
const jitter = (v, t) => { const x = Math.sin(((v.id || '').length * 31 + (t.count || 0) * 7.13 + t.id.length * 3.7 + (parseInt(String(v.id).split('-').pop(), 10) || 1) * 0.0137) * 91.7) * 43758.5453; return Math.floor((x - Math.floor(x)) * (TELL.jitter + 1)); };

// ---------- the fight ----------
// The tells a virus brings at its level, each on its fixed part, and the Mimic's beat: what tellStart deals out, and
// what scan and the codex show (genome.mjs). A crew elite brings more; a solo boss every one open at its level.
// TELL.sim.only (genesim.mjs): only the tells of these genes, to measure one at a time.
export function plannedTells(v) {
  const tier = tierOf(v.level);
  const elite = v.elite && !v.champion;
  let count = tier.count + (elite ? TELL.elite.count : 0);
  if (v.boss) count = Math.max(count, TELL.boss.count);
  const list = [];
  for (const def of setOf(v)) {
    if (list.length >= count) break;
    if (def.kind === 'cast' && v.level < TELL.castFrom) continue;
    if (def.kind === 'seal' && v.level < SEAL_FROM) continue;
    const p = findSource(v, def);
    if (!p) continue;
    list.push({ ...def, part: p.id });
  }
  // The Mimic's beat comes with the part, not the tier.
  const mim = v.parts.find((p) => p.mimic);
  if (mim && TELLS.mimic) list.push({ ...TELLS.mimic, id: 'mimic', part: mim.id });
  const only = TELL.sim?.only;
  return only ? list.filter((t) => t.kind === 'mimic' || only.includes(t.gene)) : list;
}
// When a solo fight starts (after the crew joins): which tells this virus brings.
export function tellStart(s) {
  const e = s.encounter, v = e?.virus;
  if (!v || v.tells || CONFIG.tells === false || raidDef(v)) return;
  if ((e.soft ?? 1) < 1) return; // SPRAWL-00's first kills: you're learning the board (CONFIG.zone.starterHit)
  const tier = tierOf(v.level);
  // A crew elite brings more and harder tells; a champion invasion (elite-grade, sized for one) only bigger charges.
  const elite = v.elite && !v.champion;
  const list = plannedTells(v);
  const cap = tier.cap * (elite ? TELL.elite.cap : v.champion ? TELL.champion.cap : v.boss ? TELL.boss.cap : 1);
  const hits = tier.hits + (elite ? TELL.elite.hits : v.boss ? TELL.boss.hits : 0);
  v.tells = { list: list.map((t, i) => ({ ...t, told: false, next: null, n: null, said: null, wound: 0, count: 0, after: t.kind === 'mimic' ? t.first : TELL.first + (t.kind === 'seal' ? 3 : i ? 1 : 0) })), tier: { ...tier, hits, cap, dot: tier.dot * (cap / tier.cap) } };
  for (const t of v.tells.list) if (t.kind !== 'mimic') t.after += jitter(v, t);
  announce(s);
}
const live = (s, t = null) => tellsOf(s).list.filter((x) => x !== t && x.told && x.kind !== 'mimic');
// The cycle a part's attack lands for the n-th time (attack.n counts its landings): its timer, then its interval.
export const landsAt = (p, n) => p.attack.due + (n - (p.attack.n || 0)) * p.attack.interval;
// The Mimic's beat: every `every` cycles from `first`.
const beatAt = (t, c) => c >= t.first && (c - t.first) % t.every === 0;
// Another part's heavy attack lands on cycle c: a charge never piles up on it.
function heavyAt(s, p, c) {
  const max = defender(s).max;
  return attackers(s).some((x) => x !== p && x.kind === 'system' && x.attack.due < 900 && c >= x.attack.due && (c - x.attack.due) % Math.max(1, x.attack.interval) === 0
    && ((x.attack.effect === 'damage' ? attackAmount(x) : x.attack.hit || 0) >= max * TELL.heavy || ['encrypt', 'scramble'].includes(x.attack.effect)));
}
// Announce what can be announced now: the live limit has room, its part stands, and the cycle it would land on is
// at least `lead` away, visible on the board, and clear of other tells, Mimic beats and (a charge) heavy attacks.
function announce(s) {
  const e = s.encounter, T = tellsOf(s);
  if (!T || e.virus.dormant) return; // a Sleeper says nothing until it wakes
  // Canary Token (a native unique): a tell is announced further ahead, never past the board's last column.
  const c = e.cycle, lead = Math.min(3, T.tier.lead + (fxOn(s, 'warn-early')?.fx.value || 0)), beats = T.list.filter((x) => x.kind === 'mimic');
  const clear = (t, x) => x >= t.after && !live(s, t).some((o) => o.next === x) && !beats.some((b) => alive(sourceOf(s, b)) && beatAt(b, x));
  for (const t of [...T.list].sort((a, b) => a.after - b.after)) {
    if (t.told) continue;
    const p = sourceOf(s, t);
    if (!alive(p)) continue;
    if (t.kind === 'mimic' && !p.mimic) continue; // a Mimic that stopped recording (MIRRORSHADE's Doppelganger) has no beat
    if (t.kind === 'mimic') { // the beat: always on the board, as soon as it's within the board's four columns
      for (let x = c; x <= c + 3; x++) if (beatAt(t, x)) { say(s, t, p, x, null); break; }
      continue;
    }
    if (live(s, t).length >= T.tier.live) continue;
    if (t.kind === 'charge') {
      if (!p.attack || p.attack.due >= 900) continue;
      const n0 = p.attack.n || 0;
      for (let n = n0; ; n++) {
        const x = landsAt(p, n), col = x - c;
        if (col > 3) break; // not on the board yet
        if (col < lead || !clear(t, x) || heavyAt(s, p, x)) continue;
        say(s, t, p, x, n);
        break;
      }
    } else {
      if (t.kind === 'seal' && !(p.armor > 0)) continue; // nothing to seal with yet: it waits for its ◆
      const x = c + lead;
      if (clear(t, x)) say(s, t, p, x, null);
    }
  }
}
function say(s, t, p, next, n) {
  const e = s.encounter;
  Object.assign(t, { told: true, said: e.cycle, next, n, wound: 0, need: needOf(s, t), hitBy: [], chits: 0 });
  if (t.kind !== 'mimic') tally(s, t, 'said');
  seeGene(s.host || s, t.gene, e.virus.author); // the gene codex: a tell you've met is seen (genome.mjs)
  emit(s, 'telegraph', sayOf(s, t, p), { source: p.id, tell: t.id, kind: t.kind, at: next });
}
// What a deliberate answer takes: hits (a charge, a cast), ◆ broken (a strip charge).
const needOf = (s, t) => (t.kind === 'charge' ? (t.answer === 'strip' ? t.strip || 2 : tellsOf(s).tier.hits) : t.kind === 'cast' ? tellsOf(s).tier.castHits : 0);
const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const when = (n) => (n <= 0 ? 'this cycle' : n === 1 ? 'next cycle' : `in ${n} cycles`);
// The answer, exactly, for the chip's last line and the log: what counts.
export function answerOf(t, p) {
  if (t.kind === 'charge') return t.answer === 'strip' ? `strip ◆${t.need} off the ${p?.name}` : `hit the ${p?.name}${t.need > 1 ? ` ×${t.need}` : ''}`;
  if (t.kind === 'cast') return `SIGINT, or hit the ${p?.name} ×${t.need}`;
  if (t.kind === 'seal') return `strip the ${p?.name}`;
  return 'go quiet';
}
// What the log says when a tell is announced: what's coming, when, and what answers it.
function sayOf(s, t, p) {
  const n = t.next - s.encounter.cycle, L = label(t);
  if (t.kind === 'charge') return `The ${p.name} charges its ${p.attack?.name || 'attack'} into ${L}. It lands ${when(n)}. ${t.answer === 'strip' ? `Strip ${t.need} ◆ off it` : `Hit the ${p.name} ${times(t.need)}`} with a command before then to call it off.`;
  if (t.kind === 'cast') return `The ${p.name} is compiling ${L}. It lands ${when(n)}. SIGINT stops it, and so does hitting the ${p.name} ${times(t.need)}.`;
  if (t.kind === 'seal') return `The ${p.name} starts ${L}. If it still wears ◆ ${when(n)}, it re-arms with one ◆ more and every stripped part gets a ◆ back. Strip it first.`;
  return `The ${p.name} is recording you. ${when(n).replace(/^./, (c) => c.toUpperCase())} it plays back whatever you fire, so fire something quiet then.`;
}

// A new cycle (after the old one closed): announcements. A charge whose attack went by without landing as a
// charge (a Blackhole, a Hijack) is over.
export function tellCycle(s) {
  if (!tellsOf(s) || s.encounter.phase !== 'active') return;
  castsEnd(s);
  for (const t of tellsOf(s).list) if (t.told && t.kind === 'charge') { const p = sourceOf(s, t); if (alive(p) && p.attack && (p.attack.n || 0) > t.n) rest(s, t, s.encounter.cycle - 1); }
  announce(s);
}

// One of your commands hit a part: it damaged it or broke ◆ on it (combat.mjs hit, Crack, a strip). It counts
// toward a tell on that part only if it's deliberate: your command aimed at that part, typed after the tell was
// said, not auto-repeat or a daemon, and a direct hit (combat.mjs leaves out burns, helpers and spills).
// opts.chits: the ◆ it broke (a strip charge counts those). Each command counts once toward hits (Overvolt twice).
// opts.cmd: a stand-in for your command (a skill that hits for you later, as Thermal Runaway's ticks or Kill Switch's
// cash-in on each part: dist/classes/*.mjs), opts.key: what it counts as, so it adds to the cycle's command hit.
export function tellHit(s, p, opts = {}) {
  const T = tellsOf(s), e = s.encounter, cmd = opts.cmd || e.commanding;
  if (!T || !alive(p) || !cmd || cmd === true || cmd.auto || cmd.target !== p.id || ABILITIES[cmd.id]?.noAnswer) return;
  for (const t of T.list) {
    if (!t.told || t.part !== p.id || !t.need || t.next < e.cycle || (cmd.at ?? e.cycle) < t.said) continue;
    // Double Tap, Spectre (combat.mjs tellWeight): each command counts twice, a hit or a ◆.
    if (t.answer === 'strip') { if (!opts.chits) continue; t.wound = Math.min(t.need, t.wound + opts.chits * tellWeight(s)); }
    else {
      const key = opts.key || `${e.cycle}:${s.who || ''}`, used = t.hitBy.filter((k) => k === key).length;
      if (used >= (cmd.counts || 1)) continue;
      t.hitBy.push(key);
      t.wound = Math.min(t.need, t.wound + tellWeight(s));
    }
    if (t.wound < t.need) { emit(s, 'status', `${label(t)}: ${t.wound} of ${t.need}${t.answer === 'strip' ? ' ◆' : ' hits'}. ${t.need - t.wound} more before it lands stops it.`, { source: p.id, tell: t.id }); continue; }
    if (t.kind === 'cast') { emit(s, 'interrupt', `You hit the ${p.name} out of its compile: ${label(t)} is stopped.`, { source: p.id, target: p.id, tell: t.id, answered: true }); read(s, t, p, { open: true }); }
    else { emit(s, 'blocked', `You hit the ${p.name} in time: ${label(t)} is called off. Its ${p.attack?.name || 'attack'} lands plain.`, { source: p.id, target: p.id, tell: t.id, answered: true }); read(s, t, p, { open: true }); }
    rest(s, t, e.cycle, true);
  }
}
// A skill built for a tell answers it outright (Suspend drains a charge, Quarantine holds a cast, Hijack takes one
// over, dist/classes/*.mjs): it counts as a read when it's a command of yours, typed after the tell was said.
// at: when the answer was typed, for one that resolves later (Hijack).
export function tellAnswer(s, t, p, msg, { open = t.kind !== 'seal', skill = null, at = null } = {}) {
  const e = s.encounter, cmd = e.commanding;
  emit(s, t.kind === 'cast' ? 'interrupt' : 'blocked', msg, { source: p.id, target: p.id, tell: t.id, answered: true });
  if (at != null ? at >= t.said : cmd && !cmd.auto && (cmd.at ?? e.cycle) >= t.said) read(s, t, p, { open, skill: skill || (open ? null : cmd?.id) });
  rest(s, t, e.cycle, true);
}
// Reading pays: the part opens (+50% from everyone for 2 cycles), or the skill that answered is ready again.
function read(s, t, p, { open = false, skill = null } = {}) {
  const e = s.encounter;
  tally(s, t, 'read');
  readGene(s.host || s, t); // the gene codex: a tell you read is decoded (genome.mjs)
  if (open && alive(p)) {
    const n = TELL.open.cycles + (fxOn(s, 'open-long')?.fx.value || 0); // Read Receipt (a native unique): Open lasts longer
    p.openUntil = Math.max(p.openUntil || 0, e.cycle + n - 1);
    emit(s, 'read', `READ: the ${p.name} is open. It takes +${Math.round((TELL.open.mult - 1) * 100)}% from everyone for ${cycles(n)}.`, { target: p.id, tell: t.id, open: true });
  } else if (skill && ABILITIES[skill]) {
    delete e.readyAt[skill];
    emit(s, 'read', `READ: ${ABILITIES[skill].name} is ready again.`, { target: p?.id, tell: t.id, ability: skill });
  }
  fxAnswer(s, p); // gear that fires when you call off a tell (Abort Handler, Ctrl-C, Ping of Death…)
}
// A tell is done (it landed, or it was answered): the next one may land `rest` cycles on, give or take.
function rest(s, t, from, answered = false) {
  // A charge answered early: the attack it rode still lands (plain), so the next charge rides a later one.
  const p = t.kind === 'charge' && t.n != null ? sourceOf(s, t) : null;
  if (p?.attack && alive(p)) from = Math.max(from, landsAt(p, t.n));
  t.told = false; t.wound = 0; t.count++; t.n = null;
  if (answered) { t.answered = (t.answered || 0) + 1; tally(s, t, 'answered'); }
  if (t.kind === 'mimic') { t.next = null; return; }
  t.after = from + (TELL.rest[t.kind] ?? 3) + jitter(s.encounter.virus, t);
  t.next = null;
}
// A part broke (combat.mjs breakPart): its tells stop for good (they sit on a fixed part).
export function tellBroke(s, p) {
  const T = tellsOf(s);
  if (!T) return;
  for (const t of T.list.filter((x) => x.part === p.id)) {
    if (t.told) { emit(s, 'blocked', `${label(t)} dies with the ${p.name}.`, { source: p.id, tell: t.id, answered: true }); if (t.kind !== 'mimic') tally(s, t, 'answered'); }
    t.gone = true; t.told = false;
  }
  T.list = T.list.filter((t) => !t.gone);
}

// A charge landing this cycle from this part: the attack due now is the one it rides.
export const chargeNow = (s, p) => !!tellsOf(s)?.list.some((t) => t.kind === 'charge' && t.told && t.part === p.id && p.attack && t.n === (p.attack.n || 0) && p.attack.due <= s.encounter.cycle);
// What a charge does when it lands, as the attack it powers up would (so ◆, shields, Null Route, Throttle and
// Brace all count), bigger, never more than the tier's cap of your max on top (cap; dot for a stack), never past the ceiling.
// The most a tell lands for, as a share of your max: a solo boss's TELL.ceiling (its landing is capped at 60% in
// combat.mjs spikeCap), a wild virus's or a guard's the spike cap's 45% (CONFIG.spikeCap.wild).
const ceilingOf = (s) => (s.encounter?.virus?.boss ? TELL.ceiling : Math.min(TELL.ceiling, CONFIG.spikeCap.wild));
function chargeAttack(s, t, p) {
  const T = tellsOf(s), max = defender(s).max, a = p.attack;
  const enr = p.enrage && p.integrity < p.max / 2 ? CONFIG.enrage : 1; // attackAmount counts Bricker's rage again: take it out
  const big = (n, cap) => Math.max(1, Math.round(Math.max(n, Math.min(ceilingOf(s) * max, n + Math.min(cap * max, n * (T.tier.mult - 1))))));
  const base = { ...a, name: t.name, ramp: 0, step: 0, rampBy: 0, bonus: 0, grow: 0, windup: 0, wound: 0, noCrit: true, tell: t.id };
  if (a.effect === 'damage') return { ...base, amount: Math.max(1, Math.round(big(attackAmount(p), T.tier.cap) / enr)) };
  if (a.effect === 'encrypt') return { ...base, burst: Math.max(1, Math.round(Math.min(T.tier.dot * max, a.amount * (T.tier.mult - 1)))) }; // its Encrypt, and a burst on top (TELL.burst cycles)
  if (a.effect === 'scramble') return { ...base, amount: a.amount + (t.longer || 0), hit: a.hit ? (t.plain ? a.hit : big(a.hit, T.tier.cap)) : 0 }; // Possession: the same hit, a longer scramble
  if (a.effect === 'heal') return { ...base, amount: Math.round(a.amount * T.tier.mult) };
  return { ...base, hit: a.hit ? big(a.hit, T.tier.cap * 0.5) : 0 }; // replicate: the spawns come on top (t.spawn)
}
// After-effects: a tell that lands leaves something behind (from level 6; the tier's `after` cycles).
// Corrupted: a charge that got through leaves damage on you for 3 cycles (the tier's burn of your max a cycle),
// until it runs out or you cleanse it (Purge, Scrub, Rollback).
// Sandman (a native unique): a tell that lands leaves nothing behind.
const clean = (s) => !!fxOn(s.host || s, 'no-after');
function corrupt(s, t, p) {
  const k = tellsOf(s).tier.burn;
  if (!k || clean(s)) return;
  const amount = Math.max(1, Math.round(defender(s).max * k));
  s.encounter.corrupt = { name: t.name, amount, left: 3, source: p.id };
  emit(s, 'status', `${label(t)} leaves you Corrupted. You take ${amount} damage every cycle for 3 cycles, unless Purge or Scrub cleanses it.`, { source: p.id, tell: t.id, mark: 'corrupt' });
}
// Your last skill (not Spike or SIGINT) is knocked offline: locked for that many cycles. From level 10 a charge or
// a cast that lands hangs you too: your next command doesn't fire (tier.hang).
function hang(s, t) {
  if (!tellsOf(s).tier.hang || clean(s)) return;
  s.encounter.hung = s.encounter.cycle + 1;
  emit(s, 'status', `${label(t)} hangs your session. Your next command will not fire.`, { tell: t.id, mark: 'hung' });
}
function lockLast(s, t, why) {
  const e = s.encounter, n = tellsOf(s).tier.after;
  const id = e.lastSkill && !['spike', 'sigint'].includes(e.lastSkill) ? e.lastSkill : null;
  if (!n || !id || !ABILITIES[id] || clean(s)) return;
  e.readyAt[id] = Math.max(e.readyAt[id] || 0, e.cycle + n + 1);
  (e.locked ||= {})[id] = e.cycle + n;
  emit(s, 'locked', `${why} knocks ${ABILITIES[id].name} offline for ${cycles(n)}.`, { ability: id, tell: t.id, cycles: n });
}
// The virus's half, after its parts' attacks: each tell due lands. True if the fight ended.
export function tellLand(s) {
  const T = tellsOf(s), e = s.encounter;
  if (!T) return false;
  for (const t of T.list.filter((x) => x.told && (x.kind === 'charge' ? chargeNow(s, sourceOf(s, x) || {}) : x.next === e.cycle))) {
    const p = sourceOf(s, t);
    if (!alive(p)) continue;
    const was = defender(s).integrity;
    const done = () => { const lost = was - defender(s).integrity; if (lost > 0) tally(s, t, 'cost', lost); };
    if (t.kind !== 'seal' || p.armor > 0) { if (t.kind !== 'mimic') tally(s, t, 'landed'); }
    if (t.kind === 'charge') {
      // Blackhole (Hijacker): the charged attack goes into it like any other.
      if (p.blackhole) { delete p.blackhole; emit(s, 'blocked', `${label(t)} falls into the blackhole and does nothing.`, { source: p.id, tell: t.id, answered: true }); advance(p, e); tally(s, t, 'answered'); rest(s, t, e.cycle, false); continue; }
      const atk = chargeAttack(s, t, p), locked = s.encounter.encrypt || 0, shield = e.shield || 0;
      if (strikeWith(s, p, atk)) return done(), true;
      advance(p, e);
      // Full Disk: a burst of encryption on top of its Encrypt, for TELL.burst cycles (it goes when the part breaks, or with Purge).
      if (atk.burst && (s.encounter.encrypt || 0) > locked) { // its Encrypt got through (a ◆, Null Route or Sanitize stops both)
        s.encounter.burst = { name: t.name, amount: atk.burst, left: TELL.burst, source: p.id };
        emit(s, 'encrypt', `${label(t)} adds a burst of encryption, dealing ${atk.burst} damage every cycle for ${TELL.burst} cycles.`, { source: p.id, amount: atk.burst, tell: t.id, missed: true });
        tally(s, t, 'cost', atk.burst * TELL.burst);
      }
      // A brood: more spawns on top of the charged one (up to the usual limit).
      if (t.spawn && atk.effect === 'replicate' && alive(p)) for (let k = 0; k < t.spawn; k++) strikeWith(s, p, { ...atk, hit: 0 });
      if (t.shred) shred(s, p, t);
      // It got through (it hurt, or it took your shield): the after-effect.
      if (was > defender(s).integrity || (e.shield || 0) < shield || (s.encounter.encrypt || 0) > locked) { lockLast(s, t, label(t)); corrupt(s, t, p); hang(s, t); }
      done();
    } else if (t.kind === 'seal') {
      if (p.armor > 0 && p.bkRot?.until >= e.cycle) { // Bit Rot (Demolitionist): a rotting part can't seal
        emit(s, 'blocked', `${label(t)} fails: the ${p.name} is rotting.`, { source: p.id, tell: t.id, answered: true });
        read(s, t, p, { open: true });
      } else if (p.armor > 0 && p.poisonedUntil >= e.cycle) { // Cache Poison (Hijacker): the seal reads back poison
        emit(s, 'blocked', `${label(t)} reads a poisoned cache and fails. It hits the ${p.name} instead.`, { source: p.id, tell: t.id, answered: true });
        tally(s, t, 'answered'); read(s, t, p, { open: true });
        hit(s, p, 2 * (p.poison || 15), { by: 'Cache Poison', pierce: true });
      } else if (p.armor > 0) {
        // It re-arms to full with one ◆ more for the rest of the fight, and every stripped part gets a ◆ back. Your ◆ and shield go too.
        p.maxArmor += 1; p.armor = p.maxArmor; p.patchAt = null;
        const re = livingParts(s).filter((x) => x !== p && x.maxArmor > 0 && x.armor < x.maxArmor);
        for (const x of re) { x.armor++; x.patchAt = null; }
        const proof = !!fxOn(s, 'seal-proof'); // Write Blocker (a native unique): it writes nothing back to you
        const mine = T.tier.after && !proof && (e.chits || e.shield) ? ' Your ◆ and shield go with it.' : '';
        if (mine) { e.chits = 0; e.shield = 0; }
        if (T.tier.after && !proof) corrupt(s, t, p);
        emit(s, 'patch', `${label(t)} goes through while the ${p.name} still wears ◆. It re-arms to ${p.armor} ◆${re.length ? `, and ${re.map((x) => x.name).join(' and ')} ${re.length === 1 ? 'gets' : 'each get'} a ◆ back` : ''}.${mine}`, { target: p.id, tell: t.id, missed: true });
      } else {
        emit(s, 'blocked', `${label(t)} fails. The ${p.name} has no ◆ left to seal with.`, { source: p.id, tell: t.id, answered: true });
        // The strip that did it, if it was a read (after the seal was said): that skill is ready again.
        const by = p.strippedBy;
        const who = by && by.cycle >= t.said ? [s, ...alliesOf(s).map((x) => x.st)].find((x) => (x.who || '') === by.who) : null;
        if (who) read(who, t, p, { skill: by.id });
      }
    } else if (t.kind === 'cast' && t.does === 'grow' && p.revokedUntil >= e.cycle) { // Revoke (Sysop): it can't sign the update
      emit(s, 'interrupt', `${label(t)} fails: the ${p.name} is revoked.`, { source: p.id, tell: t.id, answered: true });
      read(s, t, p, { open: true });
    } else if (t.kind === 'cast') {
      castLands(s, t, p);
      lockLast(s, t, label(t)); corrupt(s, t, p); hang(s, t);
    } else if (t.kind === 'mimic') {
      const r = mimicLands(s, t, p);
      if (r === true) return done(), true;
      if (r === 'quiet') { tally(s, t, 'read'); read(s, t, p, { open: true }); }
      done();
    }
    rest(s, t, e.cycle, t.kind === 'seal' && !(p.armor > 0));
  }
  return false;
}
// The attack a charge rode is spent: its timer moves on, as a landing would (combat.mjs landAttack).
function advance(p, e) {
  if (!p.attack) return;
  p.attack.due = Math.max(p.attack.due, e.cycle + p.attack.interval);
  p.attack.n = (p.attack.n || 0) + 1;
  if (p.attack.ramp) p.attack.step = (p.attack.step || 0) + 1;
}
// A cast that compiled: a buff on the virus for TELL.castLasts cycles (a second one starts the clock over).
function castLands(s, t, p) {
  const v = s.encounter.virus, c = s.encounter.cycle, lasts = Math.max(1, TELL.castLasts - (fxOn(s, 'cast-short')?.fx.value || 0)), until = c + lasts; // Hush Money (a native unique): it ends sooner
  const fresh = !(v.buffs?.[t.does] >= c);
  (v.buffs ||= {})[t.does] = until;
  if (t.does === 'loud') {
    if (fresh) for (const x of attackers(s)) boost(x, TELL.loud);
    emit(s, 'phase', `${label(t)} compiles. For ${cycles(lasts)}, every attack from ${v.name} deals ${Math.round((TELL.loud - 1) * 100)}% more damage.`, { target: p.id, tell: t.id, missed: true });
  } else if (t.does === 'grow') {
    const all = livingParts(s).filter((x) => x.kind === 'system' && !implanted(s, x)); // a Rootkit Implant stops it growing
    for (const x of all) { const n = Math.round(x.max * TELL.grow); x.max += n; x.integrity += n; }
    emit(s, 'phase', `${label(t)} compiles. ${all.map((x) => x.name).join(', ')} ${all.length === 1 ? 'grows' : 'grow'} ${Math.round(TELL.grow * 100)}% more Integrity.`, { target: p.id, tell: t.id, missed: true });
  } else if (t.does === 'haste') {
    // What's on the timeline stays where it is (nothing lands unannounced); the repeats after it come sooner.
    if (fresh) for (const x of attackers(s)) if (x.attack.interval > 2) { x.attack.hasted = true; x.attack.interval--; }
    emit(s, 'phase', `${label(t)} compiles. For ${cycles(lasts)}, every attack from ${v.name} repeats a cycle faster.`, { target: p.id, tell: t.id, missed: true });
  }
}
const boost = (x, k) => { const a = x.attack; if (!a) return; if (['damage', 'encrypt'].includes(a.effect)) a.amount = Math.max(1, Math.round(a.amount * k)); if (a.hit) a.hit = Math.max(1, Math.round(a.hit * k)); };
// Undo a cast that compiled (Sysop Rollback): its buff ends now.
export function undoCast(s) {
  const v = s.encounter.virus, c = s.encounter.cycle;
  const live = Object.entries(v.buffs || {}).filter(([, until]) => until >= c).map(([k]) => k);
  for (const k of live) v.buffs[k] = c - 1;
  castsEnd(s, true);
  return live.length;
}
// A cast's buff that ran out (combat.mjs cycleClose, through tellCycle): its attacks go back to what they were.
function castsEnd(s, quiet = false) {
  const v = s.encounter.virus, c = s.encounter.cycle;
  for (const [k, until] of Object.entries(v.buffs || {})) {
    if (until >= c) continue;
    delete v.buffs[k];
    if (k === 'loud') for (const x of attackers(s)) boost(x, 1 / TELL.loud);
    if (k === 'haste') for (const x of attackers(s).filter((y) => y.attack.hasted)) { x.attack.hasted = false; x.attack.interval++; }
    if (!quiet) emit(s, 'status', `${v.name}'s ${k === 'loud' ? 'extortion' : k === 'grow' ? 'update' : 'persistence'} runs out.`, {});
  }
}
// What the Mimic would play back of a command: its direct hit (a skill's listed damage, at your size, times
// TELL.mimic; burns, helpers, shields and debuffs give it nothing), before your Block and shields.
export function mimicHit(s, id, target) {
  const a = ABILITIES[id];
  if (a?.hit && a.verb === 'hit') return Math.round((a.hit * (a.hits || 1) * (skillBase(s, 'spike', target) / ABILITIES.spike.damage) + gearStat(s, 'damage')) * TELL.mimic); // Overvolt's two hits
  return a && a.damage > 0 && a.verb === 'hit' ? Math.round((skillBase(s, id, target) + gearStat(s, 'damage')) * TELL.mimic) : 0;
}
// The Mimic plays back the command you fired this cycle: its direct damage, at you. true if the fight ended,
// 'quiet' if you gave it nothing (a read: it opens).
function mimicLands(s, t, p) {
  if (!p.mimic) return false; // it stopped recording (MIRRORSHADE's Doppelganger)
  const host = s.host || s, e = host.encounter, last = e.lastCmd;
  const honey = e.buffs?.honeypot >= e.cycle; // Honeypot (Warden): the beat goes after the honeypot
  if (honey) { delete e.buffs.honeypot; emit(s, 'blocked', `The ${p.name}'s beat goes after your honeypot.`, { source: p.id, tell: t.id, answered: true }); }
  const blind = e.buffs?.sudo >= e.cycle || e.mimicBlind || honey || p.unmaskUntil >= e.cycle; // Sudo, Log Wipe, Unmask: it has nothing of you
  if (e.mimicBlind) delete e.mimicBlind;
  const id = last && last.cycle === e.cycle && !blind ? last.id : null, a = id && ABILITIES[id];
  const target = last && part(host, last.target);
  const direct = id ? mimicHit(host, id, target || p) / TELL.mimic : 0;
  if (!direct) { emit(s, 'blocked', `The ${p.name} plays back ${a ? a.name : 'nothing'}, and there's no hit in it to copy.`, { source: p.id, tell: t.id, answered: !!a }); return a ? 'quiet' : false; }
  // Reflector (a native unique): the playback lands on the Mimic instead, at a share of the hit. Echo Cancel: all of it.
  const turn = p.echoCancelUntil >= e.cycle ? { it: { name: 'Echo Cancel' }, fx: { value: 100 } } : fxOn(host, 'mimic-turn');
  if (turn) {
    tally(s, t, 'answered');
    emit(s, 'blocked', `The ${p.name} plays your ${a.name} back, and ${turn.it.name} turns it on the ${p.name}.`, { source: p.id, tell: t.id, answered: true });
    hit(host, p, Math.max(1, Math.round((direct * turn.fx.value) / 100)), { by: turn.it.name, pierce: true });
    return false;
  }
  tally(s, t, 'landed');
  // A boss's Mimic that sits on its Scramble (BOSSES mimic, MIRRORSHADE's): while you're Scrambled it plays your hit
  // back that many times over, still under the ceiling.
  const loud = s.encounter.scrambleUntil >= s.encounter.cycle ? BOSSES[e.virus.boss]?.mimic || 1 : 1;
  const amount = Math.max(1, Math.round(Math.min(ceilingOf(s) * defender(host).max, direct * TELL.mimic * loud)));
  emit(s, 'status', loud > 1 ? `You're Scrambled, and the ${p.name} plays your ${a.name} back at you ${loud === 2 ? 'twice' : `${loud} times`} over.` : `The ${p.name} plays your ${a.name} back at you.`, { source: p.id, tell: t.id, missed: true });
  const over = strikeWith(s, p, { name: `${a.name} (mimicked)`, effect: 'damage', amount, interval: 99, noCrit: true, tell: t.id });
  if (!over) { lockLast(s, t, 'MIMIC'); corrupt(s, t, p); }
  return over;
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
  emit(s, 'interrupt', `SIGINT stops ${label(t)}.`, { target: p?.id, tell: t.id, answered: true });
  if ((s.encounter.commanding?.at ?? s.encounter.cycle) >= t.said) read(s, t, p, { open: true });
  rest(s, t, s.encounter.cycle, true);
  return true;
}
// A charge riding the attack due now on p, and what it would hit for (Hijack, Replay: dist/classes/operator.mjs).
export function chargeSize(s, p) {
  const t = tellOn(s, p, 'charge');
  if (!t || !p.attack) return null;
  const atk = chargeAttack(s, t, p);
  return { t, amount: atk.effect === 'damage' ? atk.amount : atk.hit || 0, now: chargeNow(s, p) };
}
// A told tell on a part, of a kind (or any): the situational skills read the board with it (dist/classes/*.mjs).
export const tellOn = (s, p, kind = null) => (p && tellsOf(s)?.list.find((t) => t.told && t.part === p.id && (!kind || t.kind === kind))) || null;

// ---------- the board ----------
// What's coming, for intents() (combat.mjs): each told tell on its part's row, in the column it lands.
// effect: what a charge does when it lands (so the forecast and the planner read a charged hit as a hit);
// 'tell' for the rest. need/wound: a wind-up's progress. answer: exactly what counts.
export function tellIntents(s, columns = 4) {
  const T = tellsOf(s), e = s.encounter;
  if (!T || e.phase !== 'active') return [];
  const out = [];
  for (const t of T.list) {
    if (!t.told) continue;
    const p = sourceOf(s, t);
    if (!alive(p)) continue;
    const next = t.kind === 'charge' && p.attack ? landsAt(p, t.n) : t.next;
    const col = next - e.cycle;
    if (col < 0 || col >= columns) continue;
    const x = { source: p.id, name: t.name, tell: t.kind, id: t.id, gene: t.gene || null, col, hidden: false, kind: p.kind, need: t.need, wound: t.wound, does: t.does || null, effect: 'tell', amount: 0, answer: answerOf(t, p), strip: t.answer === 'strip' };
    if (t.kind === 'charge' && p.attack) {
      const atk = chargeAttack(s, t, p);
      x.effect = atk.effect;
      x.amount = atk.effect === 'damage' ? Math.round(atk.amount * (p.enrage && p.integrity < p.max / 2 ? CONFIG.enrage : 1)) : atk.amount;
      if (atk.hit) x.hit = atk.hit;
      if (t.spawn) x.spawn = t.spawn + 1;
      x.plain = p.attack.name;
    }
    out.push(x);
  }
  return out;
}

// ---------- the bots (planner.mjs) ----------
// How a player who reads tells answers them: hit a charging part (or strip it), SIGINT a cast or hit it twice,
// go quiet on the Mimic's beat, strip a part that's about to seal. TELL.bots.answer false: a bot that plays as if
// there were none (balance.mjs, for the gap test).
export const answers = () => TELL.bots.answer !== false;
const ok = (s, text) => !!text && !toIntent(s, text).error;
const first = (s, list) => list.find((c) => ok(s, c)) || null;
const soon = (s, lag) => (tellsOf(s)?.list || []).filter((t) => t.told && !ignores(t.gene) && tellNext(s, t) - s.encounter.cycle <= lag); // a gene the sim ignores (genes.mjs GENE_BOTS) goes unanswered
const tellNext = (s, t) => { const p = sourceOf(s, t); return t.kind === 'charge' && p?.attack && t.n != null ? landsAt(p, t.n) : t.next; };
// Commands that deal no direct damage: what you fire on the Mimic's beat.
export const QUIET = ['harden', 'firewall', 'bulkhead', 'dmz', 'heartbeat', 'shadow-copy', 'log-wipe', 'turbo-boost', 'malloc', 'brace', 'patch', 'null-route', 'sudo', 'fork', 'debris-field', 'rm-rf', 'vent', 'circuit-breaker', 'honeypot', 'maintenance-window', 'logic-trap', 'rotate-keys', 'vanish', 'load-shed', 'multicast', 'mesh'];
const quietFor = (s, t) => [...QUIET, ...['crack', 'shaped-charge', 'bit-rot', 'exploit', 'tag', 'hook', 'inject', 'deploy', 'spawn', 'botnet', 'fan-out', 'purge', 'thermal-runaway', 'keepalive', 'wormable', 'polymorph', 'skim', 'thrash', 'cache-poison'].map((id) => id + ' ' + t.id), 'hold'];
// The best command of yours that answers a charge or a cast on p: the hit that does the most to it (a skill built
// for the moment, Segfault, Backstab, Overvolt, comes out on top by itself), or on armor whatever breaks ◆.
const HITS = ['segfault', 'backstab', 'overvolt', 'backfire', 'fuzz', 'retaliate', 'opening', 'overload', 'flood', 'backdoor', 'reclaim', 'rate-limit', 'blowback', 'stack-smash', 'replay', 'spoofed-ack', 'thermal-throttle', 'reject', 'checksum', 'hot-loop', 'fingerprint', 'side-channel', 'unmask', 'revoke', 'sniff', 'echo-cancel', 'nohup', 'jam', 'chain-reaction', 'bit-rot', 'throttle', 'crack', 'shaped-charge', 'spike'];
const counts = (s, text) => { const id = text.split(' ')[0]; return !ABILITIES[id]?.noAnswer; };
function hitOn(s, p, strip = false) {
  if (p.armor > 0 || strip) return first(s, [p.armor >= 2 && 'crack ' + p.id, p.armor >= 2 && 'shaped-charge ' + p.id, p.armor >= 2 && 'rate-limit ' + p.id, 'overvolt ' + p.id, 'spike ' + p.id].filter(Boolean));
  return HITS.map((id) => id + ' ' + p.id).filter((c) => ok(s, c) && counts(s, c)).sort((a, b) => score(s, b, p) - score(s, a, p))[0] || null;
}
const score = (s, text, p) => { const id = text.split(' ')[0]; return previewDamage(s, id, p) + (['overvolt', 'fuzz'].includes(id) ? 40 : 0) + (id === 'backfire' && tellOn(s, p, 'charge') ? 60 : 0) + (id === 'backstab' && tellOn(s, p) ? 30 : 0); };
// Skills built to answer a tell outright (dist/classes/*.mjs): a plan that fires one of them on the part answers it.
const BUILT = { charge: ['suspend', 'jam', 'spoofed-ack', 'hijack', 'blackhole', 'irq-storm', 'kill-switch', 'reroute', 'replay', 'backfire', 'takeover'], cast: ['quarantine', 'hijack', 'sigint', 'overvolt', 'fuzz', 'irq-storm', 'kill-switch', 'reroute', 'thermal-runaway'], seal: ['bit-rot', 'cache-poison', 'shaped-charge', 'crack'] };
// (Kill Switch and Reroute have no target: they count only on a part your helpers are on.)
const built = (planned, t, p, s = null) => { const [id, at] = (planned || '').split(' '); return (BUILT[t.kind] || []).includes(id) && (at ? at === p.id : !s || !['kill-switch', 'reroute'].includes(id) || s.encounter.helpers.some((h) => h.target === p.id)); };
// A planned command that answers this tell (it's aimed at the part and hits it).
const hitsIt = (planned, p) => { const [id, at] = (planned || '').split(' '); return at === p.id && !ABILITIES[id]?.noAnswer && (ABILITIES[id]?.damage > 0 || ['crack', 'shaped-charge', 'retaliate', 'opening', 'segfault', 'stack-smash', 'thermal-throttle', 'blowback', 'overvolt', 'replay', 'spoofed-ack', 'reclaim', 'backfire'].includes(id) || ABILITIES[id]?.verb === 'hit'); };
// A planned command that breaks a part: nothing a tell asks for is worth more.
function kills(s, planned) {
  const [id, at] = (planned || '').split(' '), p = at && part(s, at);
  return !!(p && alive(p) && ABILITIES[id] && !(p.armor > 0) && previewDamage(s, id, p) >= p.integrity);
}
// What a charge costs you if it lands, over its plain attack, in Signal, roughly: a stack and a burst bleed a
// few cycles, a spawn gnaws. after: what its after-effect (a locked skill) is worth.
function chargeCost(s, t, p) {
  if (!p.attack) return 0;
  const atk = chargeAttack(s, t, p), a = p.attack, max = defender(s).max;
  if (atk.effect === 'damage') return atk.amount - attackAmount(p);
  if (atk.effect === 'encrypt') return (atk.burst || 0) * TELL.burst;
  if (atk.effect === 'scramble') return Math.max(0, (atk.hit || 0) - (a.hit || 0)) + max * 0.07 * (t.longer || 0);
  if (atk.effect === 'replicate') return Math.max(0, (atk.hit || 0) - (a.hit || 0)) + (t.spawn || 0) * max * 0.08;
  return max * 0.06; // a bigger heal on its side
}
const after = (s) => (tellsOf(s).tier.after ? defender(s).max * 0.04 * tellsOf(s).tier.after : 0);
// Stripping a part in one command: Spike on its last ◆, Crack or Shaped Charge on more.
const quickStrip = (s, p) => p.armor <= 1 || (p.armor <= 3 && usable(s).includes('crack') && readyIn(s, 'crack') === 0) || (usable(s).includes('shaped-charge') && readyIn(s, 'shaped-charge') === 0);
// A command that answers a tell right now, or null. A reader answers every one it can, as soon as it's sure the
// command counts (it was said already); a kill still comes first.
//   charge: hit its part (or strip it) with a command, the best one it has for that
//   cast:   SIGINT; or two hits if SIGINT is cooling and there's time
//   mimic:  on its beat, a command with no direct hit, when the planned one would come back
//   seal:   strip its part, when one command does it
export function tellMove(s, t0 = null, planned = null) {
  if (!answers() || TELL.bots.move === false || !tellsOf(s)) return null;
  const c = s.encounter.cycle;
  // A Mimic with nothing to copy this beat (Unmask, Echo Cancel, Log Wipe, Honeypot, Sudo): no need to go quiet.
  const e0 = s.encounter, blind = (p) => !p || p.unmaskUntil >= c || p.echoCancelUntil >= c || e0.mimicBlind || e0.buffs?.honeypot >= c || e0.buffs?.sudo >= c;
  const recording = soon(s, 0).find((t) => t.kind === 'mimic' && !blind(sourceOf(s, t)));
  // The Mimic's beat comes first: a hit fired into it comes straight back, a kill too (unless it ends the fight).
  if (recording && TELL.bots.quiet !== false && planned && !(kills(s, planned) && livingParts(s).length === 1)) {
    const id = planned.split(' ')[0], m = sourceOf(s, recording);
    if (mimicHit(s, id, part(s, planned.split(' ')[1]) || m) > 0) return first(s, quietFor(s, t0 && alive(t0) ? t0 : livingParts(s).find((x) => x !== m) || m));
  }
  // On a beat it's recording, an answer with a direct hit in it comes straight back too: a cast or a seal waits for a
  // quiet answer, or for the next cycle.
  const echoes = (text) => !!(text && recording && mimicHit(s, text.split(' ')[0], part(s, text.split(' ')[1]) || sourceOf(s, recording)) > 0);
  // A kill comes first, unless a charge landing now (on another part) costs more than the kill saves.
  if (kills(s, planned)) {
    const big = soon(s, 0).find((t) => t.kind === 'charge' && t.part !== (planned || '').split(' ')[1] && chargeCost(s, t, sourceOf(s, t)) + after(s) >= defender(s).max * 0.12);
    if (!big || livingParts(s).length === 1) return null;
    const p = sourceOf(s, big), h = alive(p) && hitOn(s, p, big.answer === 'strip');
    return h || null;
  }
  for (const t of soon(s, 3).sort((a, b) => tellNext(s, a) - tellNext(s, b))) {
    const p = sourceOf(s, t);
    if (!alive(p)) continue;
    const next = tellNext(s, t), now = next === c, left = (t.need || 0) - (t.wound || 0);
    // A charge: on its last chance (or the one before, when it takes two), when what it adds is worth a command.
    if (t.kind === 'charge' && TELL.bots.hit !== false && left > 0 && next - c + 1 <= Math.max(1, left)) {
      if (built(planned, t, p, s) || (t.answer === 'strip' ? planned?.endsWith(' ' + p.id) && /^(crack|shaped-charge|spike|rate-limit|overvolt)/.test(planned) && p.armor > 0 : hitsIt(planned, p))) return null; // the plan answers it already
      const builds = ABILITIES[(planned || '').split(' ')[0]]?.verb === 'burn';
      if (chargeCost(s, t, p) + after(s) >= defender(s).max * (builds ? 0.12 : 0.05)) {
        const h = hitOn(s, p, t.answer === 'strip');
        if (h && (!recording || !mimicHit(s, h.split(' ')[0], p))) return h;
      }
    }
    if (t.kind === 'cast' && left > 0 && built(planned, t, p, s)) return null;
    if (t.kind === 'cast' && left > 0) {
      // A skill built for a cast answers it and does something besides (damage, a stun): keep SIGINT for the next one.
      const own = next - c <= 1 && first(s, [left <= 2 && 'overvolt ' + p.id, 'quarantine ' + p.id, s.encounter.helpers.some((h) => h.target === p.id) && 'hijack ' + p.id, s.encounter.helpers.length >= left && 'reroute ' + p.id, next - c >= 1 && left <= 2 && 'thermal-runaway ' + p.id]);
      if (own && !echoes(own)) return own;
      if (TELL.bots.sigint !== false && hackerLevel(s) >= TELL.castFrom && ok(s, 'sigint') && next - c <= 1) return 'sigint';
      if (!usable(s).includes('sigint') || readyIn(s, 'sigint') > next - c) {
        if (hitsIt(planned, p)) return null;
        const h = left <= next - c + 1 ? hitOn(s, p) : null;
        if (h && !echoes(h)) return h;
      }
    }
    // A seal: strip its part before it lands, when one command does it (or two, with time).
    if (t.kind === 'seal' && TELL.bots.strip !== false && next - c <= 1 && p.armor > 0 && quickStrip(s, p)) {
      const strip = first(s, [p.armor >= 2 && 'shaped-charge ' + p.id, p.armor >= 2 && 'crack ' + p.id, p.armor >= 2 && 'rate-limit ' + p.id, p.armor <= 2 && 'overvolt ' + p.id, p.armor <= 1 && 'spike ' + p.id]);
      if (strip && !echoes(strip)) return strip;
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

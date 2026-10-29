// Solo tells: the big moves a virus's parts announce ahead, that you plan your interrupts around (TELL, TELLS and
// TELL_SETS in data.mjs; GAME_RULES.md "Tells"; docs/servers.md 3.5). The crew bosses have their own mechanics
// (raid.mjs); everything else that fights you alone brings tells: wild viruses, guards, elites, strains, the solo
// bosses and home intrusions.
//
// One clock. A tell never runs on a timer of its own:
//   charge  powers up one of its part's scheduled attacks, an attack already on the timeline. Its cell turns into
//           the charge `lead` cycles ahead and it lands exactly when that attack was due. Delaying the attack moves
//           the charge with it. It rides the attack's landing count (attack.n), not a cycle.
//   cast    compiling a buff on the virus, from level 10: a marked cell on its part's row, `lead` cycles ahead.
//   seal    a dial (docs/puzzle-levers.md 3.5): each ◆ its part still wears when it lands gives one ◆ back to every
//           part (TELL.seal), never past that part's max. A full strip costs nothing, a half strip half. A marked
//           cell, `lead` ahead, that shows the ◆ it would hand out.
//   mimic   the Mimic's beat (every 4 cycles): it copies the command you fire then and turns it on you (copyOf).
// Each tell sits on a fixed part (the family's signature part for its charge and seal, its basic part for its
// cast), shown on the chip and in the codex. No pile-ups: a charge never lands with another part's heavy attack
// or on a Mimic's beat, below level 17 one tell is live at a time, from 17 two, never on the same cycle.
//
// The answers (3.5). A charge: an interrupt on its part on its cycle (interrupt.mjs: the attack it rides is cancelled,
// and the charge with it), or a skill built for it (Suspend, Jam, Spoofed ACK, Hijack, Blackhole, Backfire); ◆, a
// shield, Brace and Bulkhead soften it; from level 17 SIGINT cuts it on its cycle too. A cast: SIGINT in its 2-cycle window, an
// interrupt on its part in the window, or a built answer (Quarantine, Hijack, Revoke). One SIGINT, two clocks: each
// cast and charge shows its price (tellPrice), and SIGINT goes on the dearer one (docs/puzzle-levers.md 3.6). A seal:
// strip the part before it lands, as far as it pays. The Mimic: fire what costs
// least to have copied on its beat, or interrupt it then. Reading pays: a charge, a cast or the Mimic answered staggers the part (Open,
// +50% from everyone for 2 cycles) and adds XP to the kill; reading every tell in a fight rolls its loot once more.
// Ignoring hurts: a tell that lands leaves an after-effect (your last skill locked, Corrupted, Hung) by level.
//
// Counts: none at levels 1 to 5 (the ticks are the lesson), one from 6, two from 17; an elite one more from 6; a
// solo boss its fixed set.
//
// State lives on the shared virus (v.tells), so a crewmate sees the same tells:
//   list  [{ id, kind, name, part, told, said (cycle it was said), next (cycle it lands), n (a charge: the
//         attack's landing it rides), after (the soonest the next one may land), opened (the cycle its window
//         opened, once logged) }]
//   tier  the level tier's numbers (count, live, lead, mult, cap, dot, after, burn, hang), with an elite's or a
//         boss's extra cap
import { hit, implanted, emit, alive, part, livingParts, attackers, defender, hackerLevel, skillBase, gearStat, attackAmount, strikeWith, toIntent, usable, readyIn, alliesOf, fxAnswer, fxOn, cooldownOf, armorTakes, ignoresArmor } from './combat.mjs';
import { CONFIG, TELL, TELLS, TELL_SETS, SEAL_FROM, STRAINS, ABILITIES, BOSSES } from './data.mjs';
import { previewDamage, delayAttack, blocked, scaled } from './combat.mjs';
import { raidDef } from './raid.mjs';
import { readGene, seeGene, logTell } from './genome.mjs';
import { gainResearch } from './research.mjs';
import { daemonsOn } from './daemons.mjs';
import { cancelAttack, crossBy, interruptMove, nextTick } from './interrupt.mjs';
import { ignores } from './genes.mjs';
import { contractDid } from './mail.mjs';

// What a fight's tells did, on its metrics (the gap test reads them): said, answered, read (answered by a command
// of yours, not by breaking the part), landed, and the Signal (or Integrity) they cost you, by tell.
const tally = (s, t, k, n = 1) => { if (k === 'answered') daemonsOn(s, 'answered', { part: t.part }); const m = (s.host || s).encounter?.metrics; if (!m) return; const x = ((m.tells ||= {})[t.id] ||= { said: 0, answered: 0, read: 0, landed: 0, cost: 0 }); x[k] += n; if (k === 'read') m.reads = (m.reads || 0) + n; };
export const tierOf = (level) => TELL.tiers.find((t) => level <= t.to) || TELL.tiers.at(-1);
export const tellsOf = (s) => s.encounter?.virus?.tells || null;
const label = (t) => t.name.toUpperCase();
const sourceOf = (s, t) => (t.part ? part(s, t.part) : null);
const cycles = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;

// The fixed part a tell sits on: 'special' (the signature part), 'basic', or a part id; a charge needs a part
// with an attack, so it falls back to the other system part that has one. A charge or a cast stays off a boss's ♛
// part (interrupt.mjs, rule a: its ticks start phases and cut nothing) while another part can carry it.
const isSystem = (x) => x.kind === 'system' || !x.kind; // a part, or a part's spec (the codex)
// A basic part (parts.mjs): never a third part's rule. A charge never rides an Accumulator (its Discharge is the big
// hit already) or a volley (a Repeater's, a Prism's); the basic with the biggest plain hit carries it.
const RULED = ['ward', 'lock', 'twin', 'reflect', 'mimic', 'command', 'deadman', 'fuse', 'hotspot', 'idle', 'front', 'backlog', 'limit', 'spare', 'scrape', 'packer', 'badblock', 'damper', 'frozen', 'mech'];
const isBasic = (x) => isSystem(x) && !x.special && !RULED.some((k) => x[k]);
const plainHit = (x) => (x.attack?.effect === 'damage' ? x.attack.amount : 0);
export function findSource(v, def) {
  const sys = v.parts.filter((x) => isSystem(x) && !x.mimic && (!x.from || x.pool === 'basic'));
  const basics = sys.filter(isBasic).sort((a, b) => plainHit(b) - plainHit(a));
  const pick = def.part === 'special' ? sys.find((x) => x.special) : def.part === 'basic' ? basics.find((x) => !x.accum && !x.taps) || basics[0] : sys.find((x) => x.id === def.part);
  const can = (p) => !!p && (def.kind === 'charge' ? !!p.attack && !p.accum && !p.taps : def.kind === 'seal' ? (p.maxArmor ?? p.armor) > 0 : true);
  const cut = def.kind === 'charge' || def.kind === 'cast', other = cut && sys.some((x) => !x.core && can(x));
  const fits = (p) => can(p) && !(other && p.core);
  if (fits(pick)) return pick;
  return [sys.find((x) => x.special), ...basics, ...sys].find(fits) || null;
}
// Two tells from the roguelite redesign (docs/roguelite.md 5.2), brought by breach viruses only (breach.mjs sets
// v.tellSet): each asks for its own verb, and letting it land can be the right call.
//   overclock  a cast (SIGINT or two hits in its window). If it lands, for `lasts` cycles every part takes `mult`×
//              damage and every attack comes a cycle sooner: a gamble for whoever holds a big cooldown.
//   lock       no answer but breaking the part. When it lands it arms: the first command you fire after it is locked
//              for `cycles` cycles, key 1 included. The play is what you feed it (a long cooldown you just used).
export const NEW_TELLS = {
  overclock: { kind: 'cast', name: 'Overclock', part: 'basic', does: 'overclock', lasts: 2, mult: 2 },
  lock: { kind: 'lock', name: 'Lock', part: 'special', cycles: 3 },
};
const tellDef = (id) => TELLS[id] || NEW_TELLS[id];
// Parts take this much more while their virus is Overclocked (combat.mjs damageMultiplier).
export const overclockMult = (s) => { const e = s.encounter; return e?.virus?.buffs?.overclock >= e?.cycle ? NEW_TELLS.overclock.mult : 1; };
// The tells a virus could bring, in order: a strain's own charge and its lineage's cast and seal, else its family's (or guard's).
// A native boss (BOSSES nb-*) brings its own set, or its strain's with the charge under the boss's name. Each names its gene.
function setOf(v) {
  if (v.tellSet) return v.tellSet.map((id) => ({ ...tellDef(id), id })); // a breach virus: its own kinds (breach.mjs)
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
  let count = tier.count + (elite && tier.count ? TELL.elite.count : 0) + (v.extraTells || 0); // extraTells: a breach gate at heat 2 (breach.mjs), a boss rule (interrupt.mjs)
  if (v.boss) count = Math.max(count, TELL.boss.count);
  const list = [];
  for (let def of setOf(v)) {
    if (list.length >= count) break;
    if (def.kind === 'cast' && v.level < TELL.castFrom) continue;
    if (def.kind === 'seal' && v.level < SEAL_FROM) continue;
    // No signature this fight (parts.mjs): its charge becomes a plain Overcharge on another part; its cast and seal
    // fall back to another part as any tell does.
    if (def.part === 'special' && v.noSignature && def.kind === 'charge') def = { ...TELLS.overcharge, id: def.id };
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
  v.tells = { list: list.map((t, i) => ({ ...t, told: false, next: null, n: null, said: null, count: 0, after: t.kind === 'mimic' ? t.first : TELL.first + (t.kind === 'seal' ? TELL.sealAfter : i ? 1 : 0) })), tier: { ...tier, cap, dot: tier.dot * (cap / tier.cap) } };
  for (const t of v.tells.list) if (t.kind !== 'mimic') t.after += jitter(v, t);
  announce(s);
}
const live = (s, t = null) => tellsOf(s).list.filter((x) => x !== t && x.told && x.kind !== 'mimic');
// The cycle a part's attack lands for the n-th time (attack.n counts its landings): its timer, then its interval.
export const landsAt = (p, n) => p.attack.due + (n - (p.attack.n || 0)) * p.attack.interval;
// The cycle a told tell lands: a charge rides its attack, the rest sit on their own cell.
export const tellNext = (s, t) => { const p = sourceOf(s, t); return t.kind === 'charge' && p?.attack && t.n != null ? landsAt(p, t.n) : t.next; };
// The window: the cycles a tell can be answered in, ending the cycle it lands. A cast's is TELL.castWindow (2), a
// charge's, a seal's and the Mimic's just the cycle it lands. It never opens before the tell was said. moved: cycles
// a skill just pushed the attack back (Suspend, Spoofed ACK answer the window the charge was in when they fired).
const lengthOf = (s, t) => (t.kind === 'cast' ? TELL.castWindow : 1);
export function windowOf(s, t, moved = 0) {
  const to = tellNext(s, t);
  if (to == null) return null;
  const at = to - moved;
  return { from: Math.max(t.said ?? at, at - lengthOf(s, t) + 1), to: at, len: lengthOf(s, t) };
}
export const inWindow = (s, t, moved = 0) => { const w = windowOf(s, t, moved), c = s.encounter.cycle; return !!w && c >= w.from && c <= w.to; };
// A told tell on a part whose window is open now (the skills that answer one outright read the board with it).
export const tellOpen = (s, p, kind = null) => { const t = tellOn(s, p, kind); return t && inWindow(s, t) ? t : null; };
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
    if (t.told || t.gone || t.once) continue; // a Hotspot's charge comes only when you set it off
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
  Object.assign(t, { told: true, said: e.cycle, next, n, opened: null });
  if (t.kind !== 'mimic') tally(s, t, 'said');
  seeGene(s.host || s, t.gene, e.virus.author); // its chip: a tell you've met is seen (genome.mjs)
  logTell(s.host || s, t); // the Codex tab: this tell, by name
  emit(s, 'telegraph', sayOf(s, t, p), { source: p.id, tell: t.id, kind: t.kind, at: next, name: label(t) });
  daemonsOn(s, 'told', { part: p.id }); // Lookout
  if (t.kind === 'charge') daemonsOn(s, 'charge', { part: p.id }); // Lightning Rod
  const w = windowOf(s, t);
  if (w && w.from <= e.cycle) t.opened = e.cycle; // said inside its window: the line above says so
}
const when = (n) => (n <= 0 ? 'this cycle' : n === 1 ? 'next cycle' : `in ${n} cycles`);
// The answer, exactly, for the chip's hover and the log: what counts, and when.
// sig: SIGINT cuts this charge too (sigintCharges, from TELL.sigintChargeFrom).
export function answerOf(t, p, sig = false) {
  if (t.kind === 'charge') return `cut the ${p?.name} on its cycle${p?.armor > 0 ? `, past its ${p.armor} ◆` : ''}${sig ? ', or SIGINT it then' : ''}`;
  if (t.kind === 'cast') return `SIGINT in its window, or cut the ${p?.name} in it`;
  if (t.kind === 'seal') return `strip the ${p?.name} before it lands`;
  if (t.kind === 'lock') return `break the ${p?.name}, or feed it a skill already cooling`;
  return 'go quiet on the beat, or cut it then';
}
// When its window opens, as the log says it: 'now', or 'next cycle', 'in 2 cycles'.
function windowWhen(s, t) { const w = windowOf(s, t); return w ? Math.max(0, w.from - s.encounter.cycle) : 0; }
// What the log says when a tell is announced, as short as its chip's tooltip (fightread.mjs tellTip): what, when, on
// which part, and the answer. The Encryptor's FULL DISK lands in 3 cycles. Cut it on that cycle.
export function sayOf(s, t, p = sourceOf(s, t)) {
  const n = tellNext(s, t) - s.encounter.cycle, L = label(t), head = t.kind === 'mimic' ? `The ${p.name} plays you back ${when(n)}.` : `The ${p.name}'s ${L} lands ${when(n)}.`;
  if (t.kind === 'charge') return `${head} Cut it on that cycle${p.armor > 0 ? `, past its ${p.armor} ◆` : ''}.`;
  if (t.kind === 'cast') return `${head} SIGINT or cut it in its window${n > 0 && windowWhen(s, t) <= 0 ? ', open now' : ''}.`;
  if (t.kind === 'seal') return `${head} Each ◆ it still wears then comes back on every part: strip its ${p.armor} ◆ first.`;
  if (t.kind === 'lock') return `${head} It locks your next command for ${cycles(t.cycles || 3)}. Break it, or feed it a cooling skill.`;
  return `${head} It copies what you fire then and turns it on you. Fire what costs least to have copied, or cut it.`;
}
// A tell's window opens (a new cycle): the log says so, once.
function windowOpens(s, t, p) {
  emit(s, 'telegraph', `${label(t)}'s window is open.`, { source: p.id, tell: t.id, kind: t.kind, at: tellNext(s, t), window: true, name: label(t) });
}

// A new cycle (after the old one closed): announcements. A charge whose attack went by without landing as a
// charge (a Blackhole, a Hijack) is over.
export function tellCycle(s) {
  if (!tellsOf(s) || s.encounter.phase !== 'active') return;
  castsEnd(s);
  lockTakes(s);
  for (const t of tellsOf(s).list) if (t.told && t.kind === 'charge') { const p = sourceOf(s, t); if (alive(p) && p.attack && (p.attack.n || 0) > t.n) rest(s, t, s.encounter.cycle - 1); }
  announce(s);
  // A cast's window that opens this cycle: the log says so, once (one said inside its window already said it).
  for (const t of tellsOf(s).list) {
    if (t.told && t.opened != null && !inWindow(s, t)) t.opened = null; // its attack was pushed back past it: it opens again later
    if (!t.told || t.kind !== 'cast' || t.opened != null || !inWindow(s, t)) continue; // a charge's is its own cycle: its chip says NOW
    const p = sourceOf(s, t);
    if (!alive(p)) continue;
    t.opened = s.encounter.cycle;
    windowOpens(s, t, p);
  }
}

// A skill built for a tell answers it outright (Suspend drains a charge, Quarantine holds a cast, Hijack takes one
// over, dist/classes/*.mjs), inside its window like any other answer: false (and nothing said) outside it, and the
// skill does only what it does anyway. It counts as a read when it's a command of yours, typed after the tell was
// said. at: when the answer was typed, for one that resolves later (Hijack). moved: cycles the skill just pushed the
// attack back. stagger false: the skill already delayed the attack itself (Suspend, Jam, Spoofed ACK).
// Answering a charge, a cast or a seal is research on the part it rides (research.mjs: +2; a crewmate's answer is
// theirs, so it never counts for you).
const credit = (who, t, p) => { if (who && ['charge', 'cast', 'seal'].includes(t.kind)) gainResearch(who, who.encounter?.virus, p, 'tell'); };
export function tellAnswer(s, t, p, msg, { open = t.kind !== 'seal', skill = null, at = null, moved = 0, stagger = TELL.open.built !== false } = {}) {
  const e = s.encounter, cmd = e.commanding;
  if (t.kind !== 'seal' && !inWindow(s, t, moved)) return false;
  emit(s, t.kind === 'cast' ? 'interrupt' : 'blocked', msg, { source: p.id, target: p.id, tell: t.id, answered: true });
  contractDid(s, 'interrupt'); // an Interrupt contract counts every attack answered
  if (at != null ? at >= t.said : cmd && !cmd.auto && (cmd.at ?? e.cycle) >= t.said) read(s, t, p, { open, stagger, skill: skill || (open ? null : cmd?.id) });
  rest(s, t, e.cycle, true);
  credit(s, t, p);
  return true;
}
// Reading pays. A charge, a cast or the Mimic answered staggers its part: it's Open (+50% from everyone for 2 cycles)
// and its next attack lands a cycle later (TELL.open.delay). A seal stopped readies the skill that did it.
function read(s, t, p, { open = false, skill = null, stagger = true } = {}) {
  const e = s.encounter;
  tally(s, t, 'read');
  readGene(s, t); // its chip shows its rule from now on (genome.mjs; a crewmate's read is theirs)
  if (open && alive(p)) {
    const n = TELL.open.cycles + (fxOn(s, 'open-long')?.fx.value || 0); // Read Receipt (a native unique): Open lasts longer
    p.openUntil = Math.max(p.openUntil || 0, e.cycle + n - 1);
    // A charge of another tell already riding that attack keeps its cycle (it was said clear of the Mimic's beat and of
    // other tells): no delay then.
    const riding = (tellsOf(s)?.list || []).some((x) => x !== t && x.told && x.kind === 'charge' && x.part === p.id && x.n === (p.attack?.n || 0));
    // One delay a wind-up (combat.mjs delayAttack): the stagger adds to a delay the answering command just set (Quarantine),
    // and does nothing to one from before.
    const late = stagger && !riding && p.attack && p.attack.due >= e.cycle ? delayAttack(s, p, (e.virus.boss ? TELL.boss.delay ?? TELL.open.delay : TELL.open.delay) || 0, { extend: true }) : 0; // a solo boss keeps its clock (TELL.boss.delay)
    emit(s, 'read', `READ: the ${p.name} is Open, taking ${Math.round((TELL.open.mult - 1) * 100)}% more damage for ${cycles(n)}.${late ? ` Its ${p.attack.name} comes ${cycles(late)} later.` : ''}`, { target: p.id, tell: t.id, open: true, stagger: late });
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
  t.told = false; t.count++; t.n = null;
  if (answered) { t.answered = (t.answered || 0) + 1; tally(s, t, 'answered'); }
  if (t.once) { t.gone = true; const T = tellsOf(s); T.list = T.list.filter((x) => x !== t); return; }
  if (t.kind === 'mimic') { t.next = null; return; }
  t.after = from + (TELL.rest[t.kind] ?? 3) + jitter(s.encounter.virus, t);
  t.next = null;
}
// Every tell that's been said and hasn't landed is called off, as if answered, with no stagger (a breach's Ripple20
// script, scripts.mjs). The Mimic's beat isn't a tell you can call off. Returns how many.
export function tellCallOff(s, by) {
  const T = tellsOf(s), e = s.encounter;
  let n = 0;
  for (const t of T?.list || []) {
    if (!t.told || t.kind === 'mimic') continue;
    const p = sourceOf(s, t);
    emit(s, t.kind === 'cast' ? 'interrupt' : 'blocked', `${by} calls off ${label(t)}.`, { source: p?.id, target: p?.id, tell: t.id, answered: true });
    contractDid(s, 'interrupt');
    rest(s, t, e.cycle, true);
    if (p) credit(s, t, p);
    n++;
  }
  return n;
}
// Hotspot (genes.mjs hotspot): a command hit on it turns the virus's next attack 2 or more cycles away into a charge,
// said at once (a Hot Charge on that part's row). One at a time; never on a Hotspot's own row or a part a charge
// can't ride. It is a charge like any other: cut it on its cycle.
export function hotCharge(s, hot) {
  const T = tellsOf(s), e = s.encounter;
  if (!T || !T.tier || T.list.some((t) => t.id === 'hotspot')) return null;
  const c = e.cycle, taken = new Set(T.list.filter((t) => t.told).map((t) => tellNext(s, t)));
  let best = null;
  for (const p of attackers(s)) {
    if (p === hot || p.accum || p.taps || p.attack.due >= 900 || p.kind !== 'system') continue;
    for (let n = p.attack.n || 0; n < (p.attack.n || 0) + 4; n++) { const x = landsAt(p, n); if (x - c >= 2 && !taken.has(x)) { if (!best || x < best.x) best = { p, n, x }; break; } }
  }
  if (!best) return null;
  const t = { kind: 'charge', name: 'Hot Charge', gene: 'hotspot', id: 'hotspot', part: best.p.id, once: true, told: false, next: null, n: null, said: null, count: 0, after: c, from: hot.id };
  T.list.push(t);
  say(s, t, best.p, best.x, best.n);
  return t;
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
  const T = tellsOf(s), max = defender(s).max, a = p.attack, k = 1;
  const enr = p.enrage && p.integrity < p.max / 2 ? CONFIG.enrage : 1; // attackAmount counts Bricker's rage again: take it out
  const big = (n, cap) => { const top = Math.max(n, Math.min(ceilingOf(s) * max, n + Math.min(cap * max, n * (T.tier.mult - 1)))); return Math.max(1, Math.round(n + (top - n) * k)); };
  const base = { ...a, name: t.name, ramp: 0, step: 0, rampBy: 0, bonus: 0, grow: 0, windup: 0, wound: 0, noCrit: true, tell: t.id, spawn: t.spawn || 0 };
  if (a.effect === 'damage') return { ...base, amount: Math.max(1, Math.round(big(attackAmount(p), T.tier.cap) / enr)) };
  if (a.effect === 'encrypt') return { ...base, burst: Math.round(Math.min(T.tier.dot * max, a.amount * (T.tier.mult - 1)) * k) }; // its Encrypt, and a burst on top (TELL.burst cycles)
  if (a.effect === 'scramble') return { ...base, amount: a.amount + Math.round((t.longer || 0) * k), hit: a.hit ? (t.plain ? a.hit : big(a.hit, T.tier.cap)) : 0 }; // Possession: the same hit, a longer scramble
  if (a.effect === 'heal') return { ...base, amount: Math.round(a.amount * (1 + (T.tier.mult - 1) * k)) };
  return { ...base, hit: a.hit ? big(a.hit, T.tier.cap * 0.5) : 0 }; // replicate: the spawns come on top (spawn)
}
// After-effects: a tell that lands leaves something behind (from level 6; the tier's `after` cycles).
// Corrupted: a charge that got through leaves damage on you for 3 cycles (the tier's burn of your max a cycle),
// until it runs out or you cleanse it (Purge, Scrub, Rollback).
// Sandman (a native unique): a tell that lands leaves nothing behind.
const clean = (s) => !!fxOn(s.host || s, 'no-after');
function corrupt(s, t, p, share = 1) {
  const k = tellsOf(s).tier.burn * share; // a seal: the share of its ◆ still on when it lands
  if (!k || clean(s)) return;
  const amount = Math.max(1, Math.round(defender(s).max * k));
  s.encounter.corrupt = { name: t.name, amount, left: 3, source: p.id };
  emit(s, 'status', `${label(t)} leaves you Corrupted, dealing ${amount} damage to you every cycle for 3 cycles.`, { source: p.id, tell: t.id, mark: 'corrupt' });
}
// Your last skill (not Spike or SIGINT) is knocked offline: locked for that many cycles. From level 10 a charge or
// a cast that lands hangs you too: your next command doesn't fire (tier.hang).
function hang(s, t) {
  if (!tellsOf(s).tier.hang || clean(s)) return;
  s.encounter.hung = s.encounter.cycle + 1;
  emit(s, 'status', `${label(t)} leaves you Hung. Your next command won't fire.`, { tell: t.id, mark: 'hung' });
}
function lockLast(s, t, why) {
  const e = s.encounter, n = tellsOf(s).tier.after;
  const id = e.lastSkill && !['spike', 'sigint'].includes(e.lastSkill) ? e.lastSkill : null;
  if (!n || !id || !ABILITIES[id] || clean(s)) return;
  e.readyAt[id] = Math.max(e.readyAt[id] || 0, e.cycle + n + 1);
  (e.locked ||= {})[id] = e.cycle + n;
  emit(s, 'locked', `${why} knocks ${ABILITIES[id].name} offline for ${cycles(n)}.`, { ability: id, tell: t.id, cycles: n });
}
// An armed Lock (a lock tell that landed): the first command you fired after it is locked for its cycles, counted from
// the cycle you fired it. A skill already cooling that long loses nothing. Holding fires nothing, so it waits.
function lockTakes(s) {
  const e = s.encounter, L = e.lockArmed, cmd = e.lastCmd;
  if (!L || !cmd || cmd.cycle <= L.at || cmd.id === 'hold' || cmd.id === 'flee') return;
  e.lockArmed = null;
  const id = cmd.id, a = ABILITIES[id], until = cmd.cycle + L.cycles, was = e.readyAt[id] || 0;
  if (!a) return;
  e.readyAt[id] = Math.max(was, until + 1);
  (e.locked ||= {})[id] = Math.max(e.locked[id] || 0, until);
  const name = id === 'spike' ? 'key 1' : a.name;
  emit(s, 'locked', was > until ? `${L.name.toUpperCase()} locks ${name}, which was cooling for longer anyway.` : `${L.name.toUpperCase()} locks ${name} for ${cycles(L.cycles)}.`, { ability: id, tell: L.tell, cycles: L.cycles, fed: was > until });
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
      if (p.blackhole) { delete p.blackhole; emit(s, 'blocked', `${label(t)} falls into the blackhole and does nothing.`, { source: p.id, tell: t.id, answered: true }); advance(p, e); tally(s, t, 'answered'); credit(s, t, p); rest(s, t, e.cycle, false); continue; }
      const atk = chargeAttack(s, t, p), locked = s.encounter.encrypt || 0, shield = e.shield || 0;
      if (strikeWith(s, p, atk)) return done(), true;
      advance(p, e);
      // Full Disk: a burst of encryption on top of its Encrypt, for TELL.burst cycles (it goes when the part breaks, or with Purge).
      if (atk.burst && (s.encounter.encrypt || 0) > locked) { // its Encrypt got through (a ◆, Null Route or Sanitize stops both)
        s.encounter.burst = { name: t.name, amount: atk.burst, left: TELL.burst, source: p.id };
        emit(s, 'encrypt', `${label(t)} lands. Your encryption deals ${atk.burst} more damage every cycle for ${TELL.burst} cycles.`, { source: p.id, amount: atk.burst, tell: t.id, missed: true });
        tally(s, t, 'cost', atk.burst * TELL.burst);
      }
      // A brood: more spawns on top of the charged one (up to the usual limit).
      if (atk.spawn && atk.effect === 'replicate' && alive(p)) for (let k = 0; k < atk.spawn; k++) strikeWith(s, p, { ...atk, hit: 0 });
      if (t.shred) shred(s, p, t);
      // It got through (it hurt, or it took your shield): the after-effect.
      if ((was > defender(s).integrity || (e.shield || 0) < shield || (s.encounter.encrypt || 0) > locked)) { lockLast(s, t, label(t)); corrupt(s, t, p); hang(s, t); }
      done();
    } else if (t.kind === 'seal') {
      if (p.armor > 0 && p.bkRot?.until >= e.cycle) { // Bit Rot (Demolitionist): a rotting part can't seal
        emit(s, 'blocked', `${label(t)} fails, because the ${p.name} is rotting.`, { source: p.id, tell: t.id, answered: true });
        read(s, t, p, { open: true }); credit(s, t, p);
      } else if (p.armor > 0 && p.poisonedUntil >= e.cycle) { // Cache Poison (Hijacker): the seal reads back poison
        emit(s, 'blocked', `${label(t)} fails on a poisoned cache and hits the ${p.name}.`, { source: p.id, tell: t.id, answered: true });
        tally(s, t, 'answered'); read(s, t, p, { open: true }); credit(s, t, p);
        hit(s, p, 2 * (p.poison || 15), { by: 'Cache Poison', pierce: true });
      } else if (p.armor > 0) {
        // A dial (docs/puzzle-levers.md 3.5): each ◆ it still wears gives one ◆ back to every part, itself included, never
        // past a part's max. What it does to you scales the same way: the share of its ◆ still on (sealShare) of your ◆
        // and shield goes, and you're Corrupted at that share. A full strip costs nothing, a half strip half.
        const got = sealGives(s, p).filter((x) => x.n > 0), share = sealShare(p);
        for (const { x, n } of got) { x.armor += n; x.patchAt = null; }
        const proof = !!fxOn(s, 'seal-proof'); // Write Blocker (a native unique): it writes nothing back to you
        const lose = (n) => Math.round((n || 0) * share);
        const mine = T.tier.after && !proof && (lose(e.chits) || lose(e.shield)) ? (share >= 1 ? ' Your ◆ and shield go.' : ` You lose ${Math.round(share * 100)}% of your ◆ and shield.`) : '';
        if (T.tier.after && !proof) { e.chits = (e.chits || 0) - lose(e.chits); e.shield = (e.shield || 0) - lose(e.shield); }
        if (T.tier.after && !proof) corrupt(s, t, p, share);
        emit(s, 'patch', `${label(t)} lands: ${got.length ? got.map(({ x, n }) => `the ${x.name} +${n} ◆`).join(', ') : 'every part is already at its max ◆'}.${mine}`, { target: p.id, tell: t.id, missed: true, armor: got.reduce((n, x) => n + x.n, 0) });
      } else {
        emit(s, 'blocked', `${label(t)} fails. The ${p.name} has no ◆ to seal.`, { source: p.id, tell: t.id, answered: true });
        // The strip that did it, if it was a read (after the seal was said): that skill is ready again.
        const by = p.strippedBy;
        const who = by && by.cycle >= t.said ? [s, ...alliesOf(s).map((x) => x.st)].find((x) => (x.who || '') === by.who) : null;
        if (who) read(who, t, p, { skill: by.id });
        credit(who || (by ? null : s), t, p); // the strip was yours (a crewmate's counts for them)
      }
    } else if (t.kind === 'cast' && t.does === 'grow' && p.revokedUntil >= e.cycle) { // Revoke (Sysop): it can't sign the update
      emit(s, 'interrupt', `${label(t)} fails, because the ${p.name} is revoked.`, { source: p.id, tell: t.id, answered: true });
      read(s, t, p, { open: true }); credit(s, t, p);
    } else if (t.kind === 'cast') {
      castLands(s, t, p);
      if (t.does !== 'overclock') { lockLast(s, t, label(t)); corrupt(s, t, p); hang(s, t); } // Overclock's cost is the gamble itself
    } else if (t.kind === 'lock') {
      e.lockArmed = { at: e.cycle, name: t.name, cycles: t.cycles || 3, tell: t.id, source: p.id };
      emit(s, 'status', `${label(t)} lands. Your next command locks for ${cycles(t.cycles || 3)}.`, { source: p.id, tell: t.id, missed: true, mark: 'lock' });
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
  const v = s.encounter.virus, c = s.encounter.cycle, lasts = Math.max(1, (t.lasts ?? TELL.castLasts) - (fxOn(s, 'cast-short')?.fx.value || 0)), until = c + lasts; // Hush Money (a native unique): it ends sooner
  const fresh = !(v.buffs?.[t.does] >= c);
  (v.buffs ||= {})[t.does] = until;
  if (t.does === 'loud') {
    if (fresh) for (const x of attackers(s)) boost(x, TELL.loud);
    emit(s, 'phase', `${label(t)} compiles. Every attack deals ${Math.round((TELL.loud - 1) * 100)}% more damage for ${cycles(lasts)}.`, { target: p.id, tell: t.id, missed: true });
  } else if (t.does === 'grow') {
    const all = livingParts(s).filter((x) => x.kind === 'system' && !implanted(s, x)); // a Rootkit Implant stops it growing
    const grown = all.map((x) => { const n = growOf(x, t); x.max += n; x.integrity += n; return n; }).reduce((a, b) => a + b, 0);
    emit(s, 'phase', `${label(t)} compiles. ${all.length === 1 ? `The ${all[0].name} grows` : 'Every part grows'} by ${Math.round((t.grow ?? TELL.grow) * 100)}% of the Integrity it has left, ${grown} in all.`, { target: p.id, tell: t.id, missed: true });
  } else if (t.does === 'overclock') {
    // Every attack still to come moves a cycle sooner (never onto this cycle, which is over), and every part takes double.
    if (fresh) for (const x of attackers(s)) if (x.attack.due < 900 && x.attack.due >= c + 2) x.attack.due--;
    emit(s, 'phase', `${label(t)} compiles. For ${cycles(lasts)}, every part takes double damage and every attack comes 1 cycle sooner.`, { target: p.id, tell: t.id, missed: true });
  } else if (t.does === 'haste') {
    // What's on the timeline stays where it is (nothing lands unannounced); the repeats after it come sooner.
    if (fresh) for (const x of attackers(s)) if (x.attack.interval > 2) { x.attack.hasted = true; x.attack.interval--; }
    emit(s, 'phase', `${label(t)} compiles. Every attack repeats 1 cycle faster for ${cycles(lasts)}.`, { target: p.id, tell: t.id, missed: true });
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
    if (!quiet) emit(s, 'status', `${v.name}'s ${k === 'loud' ? 'extortion' : k === 'grow' ? 'update' : k === 'overclock' ? 'overclock' : 'persistence'} runs out.`, {});
  }
}
// ---------- the Mimic copies everything (docs/puzzle-levers.md 3.1, decided 9.1) ----------
// On its beat the Mimic copies the command you fire and turns it on you, whatever it is (TELL.copy):
//   hit     hits you for its direct damage (mimicHit), a ◆ on you stops it whole
//   strip   strips that many of your ◆, and your shield (Crack, Exploit, Shaped Charge: all of them)
//   burn    leaves you Corrupted for its ticks, each a share of one of its own (a helper's hits count as its ticks)
//   debuff  leaves you Throttled for its cycles: your hits deal half
//   gift    a shield or a buff on you: the Mimic re-arms with a ◆
//   heal    heals the virus's most damaged part the same amount
//   hang    a stun, SIGINT or a utility: you're Hung, and your next command doesn't fire
//   hold    nothing, but the cycle is gone
// No copy is free, so which one is cheap depends on the board. copyOf says what a command would copy and what that
// costs you in Signal: the planner, the dear copy chip (routines.mjs) and the board's beat cell all read it.
export function copyKind(id) {
  const a = ABILITIES[id];
  if (!a || id === 'hold') return 'hold';
  if (a.strip > 0 || TELL.copy.strips.includes(id)) return 'strip';
  if (a.verb === 'stun' || a.verb === 'util') return 'hang';
  return { hit: 'hit', burn: 'burn', debuff: 'debuff', heal: 'heal' }[a.verb] || 'gift'; // a shield or a buff
}
// What the Mimic would play back of a command as a hit: its direct hit (a skill's listed damage, at your size, times
// TELL.mimic), before your Block and shields. A hit with no listed damage of its own copies as your key 1.
export function mimicHit(s, id, target) {
  const a = ABILITIES[id];
  if (!a || copyKind(id) !== 'hit') return 0;
  if (a.hit) return Math.round((a.hit * (a.hits || 1) * (skillBase(s, 'spike', target) / ABILITIES.spike.damage) + gearStat(s, 'damage')) * TELL.mimic); // Overvolt's two hits
  return Math.round((skillBase(s, a.damage > 0 ? id : 'spike', target) + gearStat(s, 'damage')) * TELL.mimic);
}
// The virus's pace: the damage its attacks deal you a cycle, on the average (after your Block). A cycle you lose costs this.
export function paceOf(s) {
  return attackers(s).reduce((n, p) => {
    const a = p.attack, hits = a.effect === 'damage' ? attackAmount(p) : a.hit || 0;
    return n + (hits > 0 && a.interval < 900 ? blocked(s, hits) / Math.max(1, a.interval) : 0);
  }, 0);
}
// The attack a ◆ on you stops next: the soonest hit on the board (what a ◆ you lose would have saved).
const nextHit = (s) => {
  const p = attackers(s).filter((x) => x.attack.effect === 'damage' || x.attack.hit).sort((a, b) => a.attack.due - b.attack.due)[0];
  return p ? blocked(s, p.attack.effect === 'damage' ? attackAmount(p) : p.attack.hit) : 0;
};
// Your hits' share of your damage (your bar's listed damage a cycle, hits against burns and helpers, key 1 aside): what
// Throttled takes from you.
const hitShare = (s) => {
  let hits = 0, rest = 0;
  for (const id of usable(s).filter((x) => x !== 'spike')) {
    const a = ABILITIES[id], per = 1 / (Math.max(1, a.cooldown || 0) + 1);
    if (a.verb === 'hit') hits += (a.damage || a.hit * (a.hits || 1) || 0) * per;
    else if (a.verb === 'burn') rest += (a.tick || a.helper || 0) * (a.helpers || 1) * Math.min(a.ticks || 1, 9) * per;
  }
  return hits + rest > 0 ? hits / (hits + rest) : 1;
};
const CLEANSE = ['purge', 'scrub', 'rollback'];
const mimicOf = (s) => livingParts(s).find((x) => x.mimic) || null;
// What firing `id` (at `target`) on the Mimic's beat would copy onto you, or null with no Mimic:
//   { kind, id, name, cost, text, short, ... }: cost is the Signal it takes from you, now or by the cycles it costs (a
//   lost cycle costs the virus's pace); text says what it does, after "Copies your Crack: " ("strips 2 ◆ from
//   you"), short the board's chip ("−2◆").
export function copyOf(s, id, target = null) {
  const host = s.host || s, e = host.encounter, m = mimicOf(host);
  if (!e || !m) return null;
  const a = ABILITIES[id], kind = copyKind(id), C = TELL.copy, max = defender(host).max, top = ceilingOf(host) * max, pace = paceOf(host);
  const name = id === 'spike' ? 'key 1' : a?.name || 'hold', out = { kind, id, name, cost: 0, text: '', short: '' };
  if (kind === 'hold') return { ...out, cost: pace, text: 'copies nothing, and the cycle is gone', short: 'nothing' };
  if (kind === 'hit') {
    // A boss's Mimic that sits on its Scramble (BOSSES mimic, MIRRORSHADE's): while you're Scrambled it plays your hit
    // back that many times over, still under the ceiling.
    const loud = e.scrambleUntil >= e.cycle ? BOSSES[e.virus.boss]?.mimic || 1 : 1;
    const amount = Math.max(1, Math.round(Math.min(top, mimicHit(host, id, target || m) * loud)));
    const T = tellsOf(host)?.tier, after = T?.burn && !clean(host) ? Math.round(max * T.burn) * 3 : 0; // Corrupted after it
    if (e.chits > 0) return { ...out, amount, loud, cost: nextHit(host), text: `hits you for ${amount}, and a ◆ on you takes it`, short: '−1◆' };
    return { ...out, amount, loud, cost: amount + after, text: `deals ${amount} damage to you`, short: `−${amount}` };
  }
  if (kind === 'strip') {
    const n = Math.min(e.chits || 0, a.strip === 99 ? e.chits || 0 : a.strip || 1), shield = e.shield || 0;
    const what = [n ? `${n} ◆` : '', shield ? `your ${shield} shield` : ''].filter(Boolean).join(' and ');
    const short = [n ? `−${n}◆` : '', shield ? `−${shield} shield` : ''].filter(Boolean).join(' ') || 'nothing';
    return { ...out, chits: n, shield, cost: n * nextHit(host) + shield, text: what ? `strips ${what} from you` : 'finds nothing on you to strip', short };
  }
  if (kind === 'burn') {
    const each = (a.tick || a.helper || a.hit || 0) * (a.helpers || 1), ticks = Math.min(a.ticks || 1, 9); // a Rootkit Implant's endless burn: a long one
    const per = Math.max(1, Math.round(scaled(host, each) * C.burn)), total = Math.min(top, per * ticks);
    // A cleanse ready by next cycle (Purge, Scrub, Rollback) takes it off after one tick.
    const wash = CLEANSE.some((k) => k !== id && usable(host).includes(k) && readyIn(host, k) <= 1);
    return { ...out, per, ticks, total, cost: wash ? per : total, text: `burns you for ${per} a cycle for ${cycles(ticks)}`, short: `${per}×${ticks}` };
  }
  if (kind === 'debuff') {
    const n = a.cycles || 1;
    return { ...out, cycles: n, cost: Math.round(n * (1 - C.throttled) * hitShare(host) * pace), text: `Throttles you for ${cycles(n)}, so your hits deal ${Math.round(C.throttled * 100)}%`, short: `Throttled ${n}` };
  }
  if (kind === 'heal') {
    const amount = scaled(host, (a.heal || 0) + (a.tick || 0) * (a.ticks || 0) || ABILITIES.spike.damage);
    const hurt = livingParts(host).filter((x) => x.integrity < x.max).sort((x, y) => (x.integrity - x.max) - (y.integrity - y.max))[0];
    const got = hurt ? Math.min(amount, hurt.max - hurt.integrity) : 0;
    return { ...out, amount: got, part: hurt?.id || null, cost: Math.round((got / Math.max(1, scaled(host, ABILITIES.spike.damage))) * pace), text: got ? `heals the ${hurt.name} for ${got}` : 'finds every part whole, and heals nothing', short: got ? `+${got} hp` : 'nothing' };
  }
  if (kind === 'hang') return { ...out, cost: pace, text: 'Hangs you, so your next command doesn\'t fire', short: 'Hung' };
  return { ...out, gift: C.gift, cost: Math.round(C.gift * C.giftCost * pace), text: `re-arms the ${m.name} with ${C.gift} ◆`, short: `+${C.gift}◆ to it` }; // a shield or a buff
}
// A copy is dear when it costs a tenth of your max or more (TELL.copy.dear): the dear copy chip's line.
export const dearCopy = (s, c) => !!c && c.cost >= TELL.copy.dear * defender(s.host || s).max;
// The Mimic's beat on the board (said, still to land) and its part, or null (planner.mjs, the board's helper pips).
export function beatOn(s) {
  const c = s.encounter?.cycle, t = tellsOf(s)?.list.find((x) => x.kind === 'mimic' && x.told && x.next >= c);
  const p = t && sourceOf(s, t);
  return t && alive(p) && p.mimic ? { t, p } : null;
}
// Nothing of you reaches the Mimic on cycle c: Sudo, Unmask, Log Wipe, a Honeypot or Echo Cancel.
export const beatBlind = (s, p, c) => { const e = (s.host || s).encounter; return e.buffs?.sudo >= c || !!e.mimicBlind || e.buffs?.honeypot >= c || p.unmaskUntil >= c || p.echoCancelUntil >= c; };
// The helpers the Mimic's beat catches (docs/puzzle-fights.md 3.2, rules 2 and 3): each helper that hit its part this
// cycle (combat.mjs helperHits), if it was sent on or after the cycle the beat was said. One placed before you could see
// the beat is never caught.
export function caughtHelpers(s, t, p) {
  const e = (s.host || s).encounter, x = e.helperHits;
  return x && x.cycle === e.cycle ? x.list.filter((h) => h.target === p.id && h.sent != null && h.sent >= t.said) : [];
}
// The Mimic copies the command you fired this cycle (copyOf) and turns it on you, and plays back the helpers it catches
// (each at its own size) as a hit, never past the tell ceiling. true if the fight ended, 'quiet' if the copy cost you
// little (a read: it opens).
function mimicLands(s, t, p) {
  if (!p.mimic) return false; // it stopped recording (MIRRORSHADE's Doppelganger)
  const host = s.host || s, e = host.encounter, last = e.lastCmd;
  const honey = e.buffs?.honeypot >= e.cycle; // Honeypot (Warden): the beat goes after the honeypot
  if (honey) { delete e.buffs.honeypot; emit(s, 'blocked', `The ${p.name}'s beat goes after your honeypot.`, { source: p.id, tell: t.id, answered: true }); }
  const blind = e.buffs?.sudo >= e.cycle || e.mimicBlind || honey || p.unmaskUntil >= e.cycle; // Sudo, Log Wipe, Unmask: it has nothing of you
  if (e.mimicBlind) delete e.mimicBlind;
  const id = last && last.cycle === e.cycle && !blind ? last.id : null, a = id && ABILITIES[id];
  const copy = a ? copyOf(host, id, part(host, last.target)) : null;
  // Echo Cancel blinds it to your helpers too (it turns your command on the Mimic, below).
  const caught = blind || p.echoCancelUntil >= e.cycle ? [] : caughtHelpers(s, t, p), swarm = caught.reduce((n, h) => n + h.damage, 0);
  const direct = copy?.kind === 'hit' ? copy.amount : 0;
  if (!copy && !swarm) { emit(s, 'blocked', `The ${p.name} has nothing to copy.`, { source: p.id, tell: t.id }); return false; }
  const what = !swarm ? `your ${copy.name}` : `${copy ? `your ${copy.name} and ` : 'your '}${caught.length === 1 ? 'helper' : `${caught.length} helpers`}`;
  // Reflector (a native unique): a played-back hit lands on the Mimic instead, at a share of it. Echo Cancel: all of it,
  // and whatever else it copied comes to nothing.
  const turn = p.echoCancelUntil >= e.cycle ? { it: { name: 'Echo Cancel' }, fx: { value: 100 } } : fxOn(host, 'mimic-turn');
  if (turn && (direct + swarm > 0 || p.echoCancelUntil >= e.cycle)) {
    tally(s, t, 'answered');
    emit(s, 'blocked', `The ${p.name} copies ${what}, and ${turn.it.name} turns it on the ${p.name}.`, { source: p.id, tell: t.id, answered: true });
    if (direct + swarm > 0) hit(host, p, Math.max(1, Math.round(((direct + swarm) * turn.fx.value) / 100)), { by: turn.it.name, pierce: true });
    return false;
  }
  // The copy, unless it is a hit (that lands with the helpers, below).
  const cheap = copy && !dearCopy(host, copy) && !swarm;
  if (copy && copy.kind !== 'hit') {
    landCopy(s, t, p, copy);
    if (!swarm) { if (cheap) return 'quiet'; tally(s, t, 'landed'); return false; }
  }
  tally(s, t, 'landed');
  const amount = Math.max(1, Math.round(Math.min(ceilingOf(s) * defender(host).max, direct + swarm * TELL.mimic)));
  const loud = copy?.loud > 1 && direct;
  emit(s, 'status', loud ? `You're Scrambled, and the ${p.name} plays ${what} back at you ${copy.loud === 2 ? 'twice' : `${copy.loud} times`} over.` : `The ${p.name} plays ${what} back at you.`, { source: p.id, tell: t.id, missed: true, ...(swarm ? { helpers: caught.length } : {}) });
  const over = strikeWith(s, p, { name: `${direct ? a.name : 'Helpers'}${direct && swarm ? ' and helpers' : ''} (mimicked)`, effect: 'damage', amount, interval: 99, noCrit: true, tell: t.id });
  if (!over) { if (direct) lockLast(s, t, 'MIMIC'); corrupt(s, t, p); } // your command's skill goes offline; helpers alone lock nothing
  return over;
}
// A copy that isn't a hit lands on you (or, a shield or a heal, on its side).
function landCopy(s, t, p, c) {
  const host = s.host || s, e = host.encounter, src = { source: p.id, tell: t.id, copy: c.kind };
  if (c.kind === 'hold') return;
  const say = (type, msg, o = {}) => emit(s, type, `The ${p.name} copies your ${c.name} and ${msg}`, { ...src, ...o });
  if (c.kind === 'strip') {
    if (!c.chits && !c.shield) return say('blocked', `${c.text}.`, { answered: true });
    e.chits -= c.chits; e.shield -= c.shield;
    return say('blind', `${c.text}.`, { missed: true });
  }
  if (c.kind === 'burn') {
    const was = e.corrupt?.left > 0 ? e.corrupt : null;
    e.corrupt = { name: 'Mimic', amount: c.per + (was?.amount || 0), left: Math.max(c.ticks, was?.left || 0), source: p.id };
    return say('status', `leaves you Corrupted, ${c.per} damage every cycle for ${cycles(c.ticks)}.`, { mark: 'corrupt', missed: true });
  }
  if (c.kind === 'debuff') {
    e.throttledUntil = Math.max(e.throttledUntil || 0, e.cycle + c.cycles);
    return say('status', `Throttles you for ${cycles(c.cycles)}, so your hits deal ${Math.round(TELL.copy.throttled * 100)}%.`, { mark: 'throttled', missed: true });
  }
  if (c.kind === 'gift') {
    p.armor = (p.armor || 0) + c.gift; p.maxArmor = Math.max(p.maxArmor || 0, p.armor); p.patchAt = null;
    return say('patch', `re-arms to ${p.armor} ◆.`, { target: p.id, missed: true });
  }
  if (c.kind === 'heal') {
    const x = c.part && part(host, c.part);
    if (!x || !alive(x) || !c.amount) return say('blocked', `${c.text}.`, { answered: true });
    const got = Math.min(c.amount, x.max - x.integrity);
    x.integrity += got;
    return say('heal', `heals the ${x.name} for ${got}.`, { target: x.id, amount: got, missed: true });
  }
  if (c.kind === 'hang') {
    e.hung = e.cycle + 1;
    return say('status', 'Hangs you. Your next command won\'t fire.', { mark: 'hung', missed: true });
  }
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

// ---------- SIGINT: one key, two clocks (docs/puzzle-levers.md 3.6) ----------
// The tells SIGINT can stop: a told cast, and a told charge (TELL.sigintCharge), soonest first.
// SIGINT cuts charges from TELL.sigintChargeFrom (a virus's level), where a charge and a cast compete for it. The breach
// build keeps its own rules (GAME_RULES.md "Tells"): there SIGINT stops casts only.
export const sigintCharges = (s) => !!TELL.sigintCharge && !s.encounter?.breach && (s.encounter?.virus?.level || 0) >= (TELL.sigintChargeFrom || 0);
const sigintable = (s) => (tellsOf(s)?.list || []).filter((t) => t.told && (t.kind === 'cast' || (t.kind === 'charge' && sigintCharges(s))) && alive(sourceOf(s, t))).sort((a, b) => tellNext(s, a) - tellNext(s, b));
// The cast compiling now (the one landing soonest).
export function tellCast(s) {
  const T = tellsOf(s);
  return T ? T.list.filter((t) => t.kind === 'cast' && t.told).sort((a, b) => a.next - b.next)[0] || null : null;
}
// What SIGINT would stop now: the cast in its window, else the charge on its cycle, or null.
export const sigintTarget = (s) => { const xs = sigintable(s).filter((t) => inWindow(s, t)); return xs.find((t) => t.kind === 'cast') || xs[0] || null; }; // a cast first: a charge open with it can still be cut
// Why SIGINT can't fire on a solo fight now, or null: nothing compiling or charging, or no window open yet.
export function tellSigintCheck(s) {
  if (sigintTarget(s)) return null;
  const t = sigintable(s)[0];
  const what = sigintCharges(s) ? 'a cast or a charge' : 'a cast';
  if (!t) return `Nothing is compiling${sigintCharges(s) ? ' or charging' : ''}. SIGINT stops ${what}.`;
  return `Too early. ${t.name}'s window opens ${when(windowWhen(s, t))}. SIGINT only stops ${what} in its window.`;
}
export function tellSigint(s) {
  const t = sigintTarget(s), e = s.encounter;
  if (!t) return false;
  const p = sourceOf(s, t);
  t.interrupted = (t.interrupted || 0) + 1;
  e.metrics.interrupts++;
  // A charge: SIGINT cuts it as a cut on its part does (interrupt.mjs cancelAttack): the attack it rides is cancelled,
  // charge and all, and its schedule goes on as if it had landed.
  if (t.kind === 'charge') {
    tellAnswer(s, t, p, `SIGINT cuts ${label(t)}: the ${p.name}'s ${p.attack?.name || 'attack'} is cancelled.`, { stagger: false });
    if (p.attack) cancelAttack(s, p);
    return true;
  }
  emit(s, 'interrupt', `SIGINT stops ${label(t)}.`, { target: p?.id, tell: t.id, answered: true });
  contractDid(s, 'interrupt');
  if ((e.commanding?.at ?? e.cycle) >= t.said) read(s, t, p, { open: true });
  rest(s, t, e.cycle, true);
  if (p) credit(s, t, p);
  return true;
}

// ---------- prices (docs/puzzle-levers.md 3.5, 3.6) ----------
// What each tell would cost you if it lands, as its cell shows it.
// The ◆ a seal landing now would hand out, part by part: each ◆ its part still wears gives TELL.seal back to every
// part, itself included, never past that part's max.
export const sealGives = (s, p) => livingParts(s).filter((x) => (x.maxArmor ?? 0) > 0).map((x) => ({ x, n: Math.max(0, Math.min((p?.armor || 0) * TELL.seal, x.maxArmor - (x.armor || 0))) }));
// What a seal landing now does to you, as a share of the full cost: the ◆ its part still wears of its max.
export const sealShare = (p) => Math.min(1, (p?.armor || 0) / Math.max(1, p?.maxArmor || p?.armor || 1));
// Self-Update: a part grows by TELL.grow of the Integrity it has left.
export const growOf = (x, t = null) => Math.round(Math.max(0, x.integrity) * (t?.grow ?? TELL.grow)); // a cast may carry its own share (TELLS: a boss's)
// What one landing of a part's attack costs you: its hit (an Encrypt's encryption).
const hitOf = (x) => (x.attack?.effect === 'damage' ? attackAmount(x) : x.attack?.hit || (x.attack?.effect === 'encrypt' ? x.attack.amount : 0));
// The landings of an attack from cycle `from` to `to`: its timer, then every `every` cycles (a hasted one's after the first).
function landingsIn(a, from, to, every = a.interval) {
  if (!a || a.due >= 900) return 0;
  let c = a.due;
  while (c < from) c += Math.max(1, a.interval);
  let n = 0;
  for (; c <= to; c += Math.max(1, every)) n++;
  return n;
}
// Integrity the virus gains, as your Signal: the cycles it takes you to deal it at your pace so far (Spike's at the
// least), times what the virus deals you a cycle.
export function hpAsSignal(s, hp, p = null) {
  const e = s.encounter, v = e.virus;
  const dealt = v.parts.filter((x) => x.kind === 'system').reduce((n, x) => n + Math.max(0, x.max - Math.max(0, x.integrity)), 0);
  const spike = p && alive(p) ? previewDamage(s, 'spike', p) : 0;
  const pace = Math.max(1, spike, dealt / Math.max(1, e.cycle - 1));
  const incoming = attackers(s).filter((x) => x.attack.due < 900).reduce((n, x) => n + hitOf(x) / Math.max(1, x.attack.interval), 0);
  return Math.round((hp / pace) * incoming);
}
const lastsOf = (s, t) => Math.max(1, (t.lasts ?? TELL.castLasts) - (fxOn(s, 'cast-short')?.fx.value || 0));
// A tell's price: { signal } for a charge or a cast (a Self-Update adds hp, the Integrity it grows), { armor } for a
// seal (the ◆ it hands out in all), or null. A charge: its whole landing (SIGINT or a cut cancels the attack). Double
// Extortion and Persistence: the Signal they'd add from the attacks due in their cycles. The after-effects are the same
// for every tell, so they're left out.
export function tellPrice(s, t) {
  const p = t && sourceOf(s, t);
  if (!t?.told || !alive(p)) return null;
  const at = tellNext(s, t);
  if (t.kind === 'charge') {
    if (!p.attack) return null;
    const atk = chargeAttack(s, t, p), enr = p.enrage && p.integrity < p.max / 2 ? CONFIG.enrage : 1;
    if (atk.effect === 'damage') return { signal: Math.round(atk.amount * enr) };
    if (atk.effect === 'encrypt') return { signal: atk.amount + (atk.burst || 0) * TELL.burst };
    if (atk.effect === 'heal') return { signal: hpAsSignal(s, atk.amount, p), hp: atk.amount };
    return { signal: atk.hit || 0 };
  }
  if (t.kind === 'cast') {
    const from = at + 1, to = at + lastsOf(s, t), xs = attackers(s).filter((x) => x.attack.due < 900);
    if (t.does === 'loud') return { signal: xs.reduce((n, x) => n + landingsIn(x.attack, from, to) * Math.round(hitOf(x) * (TELL.loud - 1)), 0) };
    if (t.does === 'haste') return { signal: xs.filter((x) => x.attack.interval > 2).reduce((n, x) => n + (landingsIn(x.attack, from, to, x.attack.interval - 1) - landingsIn(x.attack, from, to)) * hitOf(x), 0) };
    if (t.does === 'grow') { const hp = livingParts(s).filter((x) => x.kind === 'system' && !implanted(s, x)).reduce((n, x) => n + growOf(x, t), 0); return { signal: hpAsSignal(s, hp, p), hp }; }
    return { signal: 0 };
  }
  if (t.kind === 'seal') return { armor: sealGives(s, p).reduce((n, x) => n + x.n, 0) };
  return null;
}
// The live tells SIGINT could stop, dearest first (the planner and the dearer chip read it).
export const pricedTells = (s) => sigintable(s).map((t) => ({ t, p: sourceOf(s, t), price: tellPrice(s, t)?.signal ?? 0 })).sort((a, b) => b.price - a.price);
// SIGINT's key (view.mjs): each live cast and charge, its window in cycles from now (from, to), its price, and whether
// SIGINT is ready before that window closes (reach).
export function sigintWindows(s) {
  if (!tellsOf(s) || s.encounter.phase !== 'active') return [];
  const c = s.encounter.cycle, wait = readyIn(s, 'sigint');
  return sigintable(s).map((t) => { const w = windowOf(s, t); return w && { t, name: t.name, kind: t.kind, from: Math.max(0, w.from - c), to: w.to - c, price: tellPrice(s, t)?.signal ?? 0, wait, reach: wait <= w.to - c }; }).filter((x) => x && x.to >= 0);
}
// This tell costs more than every other live one SIGINT could stop (or it's the only one).
export const dearest = (s, t) => { const xs = pricedTells(s), me = xs.find((x) => x.t === t); return !!me && xs.every((x) => x.t === t || x.price < me.price); };
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
// 'tell' for the rest. answer: exactly what counts.
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
    // The window, in the board's columns: winFrom (the first column it can be answered in) to col; open: it is now.
    const w = windowOf(s, t);
    const winFrom = Math.max(0, (w?.from ?? next) - e.cycle);
    const x = { source: p.id, name: t.name, tell: t.kind, id: t.id, gene: t.gene || null, col, hidden: false, kind: p.kind, does: t.does || null, effect: 'tell', amount: 0, answer: answerOf(t, p, sigintCharges(s)),
      winFrom, open: winFrom === 0, armored: p.armor > 0 };
    if (t.kind === 'charge' && p.attack) {
      const atk = chargeAttack(s, t, p);
      x.effect = atk.effect;
      x.amount = atk.effect === 'damage' ? Math.round(atk.amount * (p.enrage && p.integrity < p.max / 2 ? CONFIG.enrage : 1)) : atk.amount;
      if (atk.hit) x.hit = atk.hit;
      if (atk.burst) x.burst = atk.burst; // Full Disk: its burst of encryption a cycle, on top
      if (t.shred) x.shred = true; // Deep Shred: a file from your pack too
      if (t.spawn) x.spawn = t.spawn + 1;
      x.plain = p.attack.name;
    }
    // Its price (tellPrice): the Signal a charge or a cast would cost you, a Self-Update's Integrity, a seal's ◆ a part.
    const price = tellPrice(s, t);
    if (price?.signal != null) x.price = price.signal;
    if (price?.hp != null) x.grow = price.hp;
    if (t.kind === 'seal') { x.give = p.armor * TELL.seal; x.armorOut = price?.armor || 0; }
    out.push(x);
  }
  return out;
}

// ---------- the bots (planner.mjs) ----------
// How a player who reads tells answers them: SIGINT a cast in its window, go quiet on the Mimic's beat, strip a part
// that's about to seal. A charge (and a cast when SIGINT is cooling) is cut: the planner's interruptMove (interrupt.mjs)
// takes the part across a tick on its cycle, ahead of any other cut, and saveTick keeps the tick for it.
// TELL.bots.answer false: a bot that plays as if there were none (balance.mjs, for the gap test).
export const answers = () => TELL.bots.answer !== false;
const ok = (s, text) => !!text && !toIntent(s, text).error;
const first = (s, list) => list.find((c) => ok(s, c)) || null;
const soon = (s, lag) => (tellsOf(s)?.list || []).filter((t) => t.told && !ignores(t.gene) && tellNext(s, t) - s.encounter.cycle <= lag); // a gene the sim ignores (genes.mjs GENE_BOTS) goes unanswered
// Commands that deal no direct damage, aimed at no part: the quiet moves (a Scramble's, the Decoy's beat: planner.mjs quietOf; the Mimic's beat weighs them too, beatMove).
export const QUIET = ['harden', 'firewall', 'bulkhead', 'dmz', 'heartbeat', 'shadow-copy', 'log-wipe', 'turbo-boost', 'malloc', 'brace', 'patch', 'null-route', 'sudo', 'fork', 'debris-field', 'rm-rf', 'vent', 'circuit-breaker', 'honeypot', 'maintenance-window', 'logic-trap', 'rotate-keys', 'vanish', 'load-shed', 'multicast', 'mesh'];
// A planned command that breaks a part: nothing a tell asks for is worth more.
function kills(s, planned) {
  const [id, at] = (planned || '').split(' '), p = at && part(s, at);
  return !!(p && alive(p) && ABILITIES[id] && !(p.armor > 0) && previewDamage(s, id, p) >= p.integrity);
}
// The commands that strip every ◆ off p, one a cycle, within `within` cycles (a skill's cooldown counted), strongest
// first: Shaped Charge all of them, Crack its strip, a heavy hit or Overvolt two, any other hit one. null if it can't.
const STRIPS = ['shaped-charge', 'crack', 'overvolt', 'fork-bomb', 'flood', 'overload', 'exploit', 'spike'];
const stripOff = (id, left) => (id === 'shaped-charge' ? left : ABILITIES[id]?.strip || (id === 'overvolt' ? 2 : (ABILITIES[id]?.damage || 0) >= CONFIG.heavyHit ? 2 : 1));
function stripPlan(s, p, within) {
  if (p.lockHp > 0 || livingParts(s).some((x) => x.ward === p.id)) return null; // a lock or a ward soaks the cut anyway
  let left = p.armor;
  const out = [], used = {};
  for (let k = 0; k < within && left > 0; k++) {
    const can = STRIPS.filter((id) => usable(s).includes(id) || id === 'spike').filter((id) => readyIn(s, id) <= k && !(used[id] != null && k - used[id] < Math.max(1, cooldownOf(s, id))));
    const off = (id) => stripOff(id, left);
    const best = can.filter((id) => ok(s, ABILITIES[id]?.target === 'none' ? id : `${id} ${p.id}`) || k > 0).sort((a, b) => off(b) - off(a))[0];
    if (!best) return null;
    used[best] = k;
    left -= off(best);
    out.push(ABILITIES[best]?.target === 'none' ? best : `${best} ${p.id}`);
  }
  return left <= 0 ? out : null;
}
// SIGINT on the dearer tell (docs/puzzle-levers.md 3.6): the tell SIGINT would stop now, if it costs more than every
// other live tell SIGINT could stop (or is the only one), and the planned command doesn't answer it already (a cut on a
// charge's part, a kill, a skill built for it). Else null.
const BUILT_CHARGE = ['hijack', 'blackhole', 'backfire']; // they stop the whole move; a delay that drains the charge (Suspend, Jam, Spoofed ACK) still lets the plain attack land
function sigintNow(s, planned = null) {
  if (TELL.bots.sigint === false || hackerLevel(s) < TELL.castFrom || !ok(s, 'sigint')) return null;
  const t = sigintTarget(s);
  if (!t || ignores(t.gene)) return null;
  const [id, at] = (planned || '').split(' '), p = sourceOf(s, t);
  if (t.kind === 'charge' && at === p.id && ABILITIES[id] && (BUILT_CHARGE.includes(id) || kills(s, planned) || ['cut', 'both'].includes(crossBy(s, id, p)))) return null;
  // A fixed habit (solved.mjs FIXED.sigint, TELL.bots.sigintOn): SIGINT every tell of one kind, and none of the other.
  const only = TELL.bots.sigintOn;
  if (only) return t.kind === only ? t : null;
  // A cut on its part answers it now as well: the cut goes, and SIGINT stays for the other.
  const cut = interruptMove(s, planned);
  if (cut && cut.split(' ')[1] === p.id) return null;
  // In a crew there's a SIGINT on every bar: nothing to save it for.
  if (alliesOf(s).length) return t;
  // The dearer one, of what SIGINT would be needed for: another live tell whose part a cut can still reach on its cycle
  // (a tick left, no more than one ◆ in the way) needs no SIGINT, so it doesn't count against this one.
  const mine = tellPrice(s, t).signal;
  return pricedTells(s).every((x) => x.t === t || x.price < mine || cuttable(s, x.p, x.t)) ? t : null;
}
// A part a cut can still reach on a tell's cycle: the fight has the interrupt, the part has a tick left, and no more than
// one ◆ is in the way, or the planner can strip it bare by then (stripPlan, as it does for a charge ahead of its cut).
function cuttable(s, p, t) {
  const e = s.encounter;
  if (!e.ticked || !alive(p) || p.core || !nextTick(p) || (e.cutBudget != null && e.cutBudget <= 0)) return false;
  if (!((p.armor || 0) > 1)) return true;
  const by = tellNext(s, t) - e.cycle;
  return by > 0 && TELL.bots.strip !== false && e.virus.level >= TELL.castFrom && (stripPlan(s, p, by)?.length || 99) <= by;
}
// A seal (a dial, docs/puzzle-levers.md 3.5), weighed in ◆ on the board: the ◆ it would hand out with k ◆ on its part,
// and what it takes from you as TELL.weigh.sealYou ◆ at full share. A strip that takes ◆ off its part changes both
// (its own room grows as it's stripped, so a part strip can cost more than none).
function sealCost(s, p, k) {
  const was = p.armor;
  p.armor = Math.max(0, k);
  try { return sealGives(s, p).reduce((n, x) => n + x.n, 0) + (tellsOf(s).tier.after && !fxOn(s, 'seal-proof') ? TELL.weigh.sealYou * sealShare(p) : 0); } finally { p.armor = was; }
}
// The ◆ a command takes off p: a strip skill's (Shaped Charge all of them), a skill's ◆ count, else what its hit breaks.
export function stripBy(s, id, p) {
  const a = ABILITIES[id];
  if (!a || !(p?.armor > 0)) return 0;
  if (id === 'shaped-charge') return p.armor;
  if (a.strip || a.chits > 1) return Math.min(p.armor, Math.max(a.strip || 0, a.chits > 1 ? a.chits : 0));
  return Math.min(p.armor, armorTakes(s, id, p));
}
// Your best strip at p now: the ready command that takes the most ◆ off it (the shorter cooldown on a tie), or null.
export function bestStrip(s, p) {
  if (!alive(p) || !(p.armor > 0)) return null;
  return usable(s).filter((id) => id !== 'sigint' && readyIn(s, id) === 0)
    .map((id) => ({ id, n: stripBy(s, id, p), text: ['none', 'aggro'].includes(ABILITIES[id].target) ? id : `${id} ${p.id}` }))
    .filter((x) => x.n > 0 && ok(s, x.text)).sort((a, b) => b.n - a.n || cooldownOf(s, a.id) - cooldownOf(s, b.id))[0] || null;
}
// The strip to fire on a sealing part now, or null. The commands left before it lands (this one included) are counted
// at your best strip's rate. The planner waits while it has commands to spare, keeps a plan that strips the part as
// well, and strips when what that saves (sealCost) is at least TELL.weigh.sealCmd ◆ for each command it takes.
function sealStrip(s, t, p, planned = null) {
  const left = tellNext(s, t) - s.encounter.cycle + 1, best = bestStrip(s, p);
  if (left < 1 || !best) return null;
  const [id, at] = String(planned || '').split(' ');
  if ((at === p.id || (ABILITIES[id] && ['none', 'aggro'].includes(ABILITIES[id].target))) && stripBy(s, id, p) >= best.n) return null; // the plan strips it as well
  if (at === p.id && ABILITIES[id] && (ignoresArmor(s, id) || !(p.armor > 0)) && previewDamage(s, id, p) >= p.integrity) return null; // or breaks it through its ◆
  const need = Math.ceil(p.armor / best.n);
  if (need < left) return null; // time to spare: strip later, as late as it can be done
  const k = Math.max(0, p.armor - best.n * left);
  return sealCost(s, p, p.armor) - sealCost(s, p, k) >= TELL.weigh.sealCmd * Math.min(need, left) ? best.text : null;
}
// The Mimic recording this cycle (its beat lands now, and it sees you), or null.
function recordingNow(s) {
  const c = s.encounter.cycle, e0 = s.encounter, blind = (p) => !p || p.unmaskUntil >= c || p.echoCancelUntil >= c || e0.mimicBlind || e0.buffs?.honeypot >= c || e0.buffs?.sudo >= c;
  return soon(s, 0).find((t) => t.kind === 'mimic' && !blind(sourceOf(s, t))) || null;
}
// What a command fired now would cost you on the Mimic's beat (copyOf).
export const copyCost = (s, text) => (!text || text === 'hold' ? paceOf(s) : copyOf(s, text.split(' ')[0], part(s, text.split(' ')[1]))?.cost || 0);
// A command whose copy would be dear on the Mimic's beat this cycle (copyOf, TELL.copy.dear): the planner keeps its cuts
// out of the beat too.
export function echoesNow(s, text) {
  if (!text || !answers() || !tellsOf(s) || !recordingNow(s)) return false;
  return dearCopy(s, copyOf(s, text.split(' ')[0], part(s, text.split(' ')[1])));
}
// On the Mimic's beat: the planned command, or the one whose copy costs least for what it does. Every copy costs
// something (copyOf), and what a command does is worth cycles of the virus's pace: the plan a cycle (two when it breaks
// a part), another of your commands half of one (TELL.copy.lesser), hold nothing (its copy is the cycle it loses).
const BEAT_ALTS = ['crack', 'shaped-charge', 'bit-rot', 'exploit', 'tag', 'hook', 'throttle', 'inject', 'deploy', 'spawn', 'botnet', 'fan-out', 'purge', 'thermal-runaway', 'keepalive', 'wormable', 'polymorph', 'skim', 'thrash', 'cache-poison', 'spike'];
function beatMove(s, planned, t) {
  const m = sourceOf(s, recordingNow(s)), pace = paceOf(s), at = t && alive(t) && t !== m ? t : livingParts(s).find((x) => x !== m) || m;
  let best = { text: planned, net: copyCost(s, planned) - pace * (kills(s, planned) ? 2 : 1) };
  for (const text of [...QUIET, ...BEAT_ALTS.map((id) => id + ' ' + at.id), 'hold']) {
    if (text === planned || !ok(s, text)) continue;
    const net = text === 'hold' ? 0 : copyCost(s, text) - pace * TELL.copy.lesser;
    if (net < best.net) best = { text, net };
  }
  return best.text;
}
// A command that answers a tell right now, or null. A kill still comes first.
//   cast:   SIGINT in its window (a skill built for it first, when it has one), or a cut (interruptMove)
//   mimic:  on its beat, a command with no direct hit, when the planned one would come back
//   seal:   strip its part, when one command does it
//   lock:   feed it the readiest long cooldown
export function tellMove(s, t0 = null, planned = null) {
  if (!answers() || TELL.bots.move === false || !tellsOf(s)) return null;
  const c = s.encounter.cycle;
  // An armed Lock (it landed): feed it the readiest long cooldown instead of key 1 or a short key, so it costs little.
  const pid = (planned || '').split(' ')[0];
  if (s.encounter.lockArmed && planned && pid !== 'sigint' && cooldownOf(s, pid) < 3) {
    const at = planned.split(' ')[1];
    const feed = usable(s).filter((id) => !['spike', 'sigint'].includes(id) && cooldownOf(s, id) >= 3 && readyIn(s, id) === 0).sort((a, b) => cooldownOf(s, b) - cooldownOf(s, a))
      .map((id) => (['part', 'attack'].includes(ABILITIES[id].target) ? `${id} ${at}` : id)).find((x) => ok(s, x));
    if (feed) return feed;
  }
  // The Mimic's beat comes first: whatever you fire comes back at you (copyOf), so fire the command whose copy costs
  // least (a kill that ends the fight still fires). A Mimic with nothing to copy (Unmask, Echo Cancel, Log Wipe,
  // Honeypot, Sudo) asks nothing.
  const recording = recordingNow(s);
  if (recording && TELL.bots.quiet !== false && planned && !(kills(s, planned) && livingParts(s).length === 1)) {
    const best = beatMove(s, planned, t0);
    if (best !== planned) return best;
  }
  const echoes = (text) => echoesNow(s, text);
  // A charge whose part has to be stripped starting now to bare it for the cut (see below) comes before a kill.
  // (Below level 10 a kit has three or four keys: stripping ahead costs more than the charge, so it doesn't.)
  const prep = soon(s, 3).filter((t) => t.kind === 'charge' && TELL.bots.strip !== false && s.encounter.virus.level >= TELL.castFrom && alive(sourceOf(s, t)) && sourceOf(s, t).armor > 0 && sourceOf(s, t).ticks?.some((x) => !x.spent) && tellNext(s, t) > c)
    .map((t) => stripPlan(s, sourceOf(s, t), tellNext(s, t) - c)?.length === tellNext(s, t) - c && stripPlan(s, sourceOf(s, t), tellNext(s, t) - c)[0]).find(Boolean);
  if (prep && livingParts(s).length > 1 && !echoes(prep) && ok(s, prep)) return prep;
  // A kill comes first: the dearer tell landing this cycle on another part is SIGINTed first, while the virus has more
  // than it.
  if (kills(s, planned)) {
    const last = sigintNow(s, planned);
    if (last && tellNext(s, last) === c && last.part !== (planned || '').split(' ')[1] && livingParts(s).length > 1) return 'sigint';
    return null;
  }
  for (const t of soon(s, 3).sort((a, b) => tellNext(s, a) - tellNext(s, b))) {
    const p = sourceOf(s, t);
    if (!alive(p)) continue;
    const next = tellNext(s, t);
    if (t.kind === 'cast' && inWindow(s, t)) {
      // A skill built for a cast answers it and does something besides (a stun, a buff): keep SIGINT for the next one.
      const own = first(s, ['quarantine ' + p.id, s.encounter.helpers.some((h) => h.target === p.id) && 'hijack ' + p.id]);
      if (own && !echoes(own)) return own;
    }
    // SIGINT goes on the dearer tell (docs/puzzle-levers.md 3.6): a cast in its window, or a charge on its cycle that
    // the plan doesn't cut, when it costs more than every other live one. The cheaper one is cut, or let land.
    // On the Mimic's beat SIGINT is copied (it Hangs you): a cast whose window is open next cycle too waits a cycle.
    if (sigintNow(s, planned) === t && !(recording && t.kind === 'cast' && next > c)) return 'sigint';
    // A seal (a dial, 3.5): strip its part when that saves enough of what it would hand out (sealStrip).
    if (t.kind === 'seal' && TELL.bots.strip !== false && TELL.bots.seal !== false && p.armor > 0) {
      const strip = sealStrip(s, t, p, planned);
      if (strip && !echoes(strip)) return strip;
    }
    // A charge on an armored part: strip it over the lead, as late as it can be done, so the cut lands on its cycle
    // (◆ guards the ticks, 3.2). A part it can't bare in time is left to land (a shield, Brace, ◆ soften it).
    if (t.kind === 'charge' && TELL.bots.strip !== false && s.encounter.virus.level >= TELL.castFrom && next > c && p.armor > 0 && p.ticks?.some((x) => !x.spent)) {
      const plan = stripPlan(s, p, next - c);
      if (plan && plan.length === next - c && !echoes(plan[0])) return plan[0];
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

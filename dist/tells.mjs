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
// The window. A charge or a cast can only be answered in its last cycles: the cycle it lands (tier.window cycles
// for a charge, castHits for a cast, so two hits fit). Hits before the window don't count. A tell said with less
// lead than its window is open from the moment it's said. A seal and the Mimic are timed by their own landing.
//
// Deliberate answers. Only a command of yours aimed at the part, typed after the tell was said, counts: area hits,
// burns, helpers, spills, auto-repeat and daemons don't. A charge asks for a burst in its window: damage from your
// commands worth tier.share of the part's max, each ◆ broken counting as 1/tier.chits of it (so ◆2 is a whole one).
// Half the burst lands it plain, with no after-effect, and less takes its extra off in step. A cast asks for SIGINT or two hits in its window, a
// seal a strip before it lands, the Mimic a quiet command on its beat. Reading pays: a charge, a cast or the Mimic
// answered staggers the part (Open, +50% from everyone for 2 cycles, and its next attack a cycle later); a seal
// stopped readies the skill that did it. Each read adds XP to the kill, and reading every tell in a fight rolls its
// loot once more. Ignoring hurts: from level 10 a charge can add a quarter of your max, and a tell that lands leaves
// an after-effect (your last skill locked, your ◆ and shield gone).
//
// State lives on the shared virus (v.tells), so a crewmate sees the same tells:
//   list  [{ id, kind, name, part, told, said (cycle it was said), next (cycle it lands), n (a charge: the
//         attack's landing it rides), after (the soonest the next one may land), wound (burst dealt, or hits),
//         need (the burst, or the hits), opened (the cycle its window opened, once logged) }]
//   tier  the level tier's numbers (lead, live, window, share, chits, mult, cap, dot, after), with an elite's or a
//         boss's longer window, its share and ◆ rate, and its extra cap
import { hit, implanted, emit, alive, part, livingParts, attackers, defender, hackerLevel, skillBase, gearStat, attackAmount, strikeWith, toIntent, usable, readyIn, previewDamage, alliesOf, fxAnswer, tellWeight, fxOn, cooldownOf, ignoresArmor, powerOf } from './combat.mjs';
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
  let count = tier.count + (elite ? TELL.elite.count : 0) + (v.extraTells || 0); // extraTells: a breach gate at heat 2 (breach.mjs)
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
  // An elite's or a boss's charge: a window a cycle longer, its own share of a much bigger part, and ◆ worth less each.
  const big = elite ? TELL.elite : v.boss ? TELL.boss : null;
  const win = { window: tier.window + (big?.window || 0), share: big?.share ?? tier.share, chits: big?.chits ?? TELL.chits };
  v.tells = { list: list.map((t, i) => ({ ...t, told: false, next: null, n: null, said: null, wound: 0, count: 0, after: t.kind === 'mimic' ? t.first : TELL.first + (t.kind === 'seal' ? 3 : i ? 1 : 0) })), tier: { ...tier, ...win, cap, dot: tier.dot * (cap / tier.cap) } };
  for (const t of v.tells.list) if (t.kind !== 'mimic') t.after += jitter(v, t);
  announce(s);
}
const live = (s, t = null) => tellsOf(s).list.filter((x) => x !== t && x.told && x.kind !== 'mimic');
// The cycle a part's attack lands for the n-th time (attack.n counts its landings): its timer, then its interval.
export const landsAt = (p, n) => p.attack.due + (n - (p.attack.n || 0)) * p.attack.interval;
// The cycle a told tell lands: a charge rides its attack, the rest sit on their own cell.
export const tellNext = (s, t) => { const p = sourceOf(s, t); return t.kind === 'charge' && p?.attack && t.n != null ? landsAt(p, t.n) : t.next; };
// The window: the cycles a tell can be answered in, ending the cycle it lands. A charge's is tier.window long (an
// elite's or a boss's a cycle more), a cast's castHits (two hits fit), a seal's and the Mimic's just that cycle. It
// never opens before the tell was said. moved: cycles a skill just pushed the attack back (Suspend, Spoofed ACK
// answer the window the charge was in when they fired).
const lengthOf = (s, t) => { const T = tellsOf(s)?.tier || {}; return t.kind === 'charge' ? T.window || 1 : t.kind === 'cast' ? T.castHits || 2 : 1; };
export function windowOf(s, t, moved = 0) {
  const to = tellNext(s, t);
  if (to == null) return null;
  const at = to - moved;
  return { from: Math.max(t.said ?? at, at - lengthOf(s, t) + 1), to: at, len: lengthOf(s, t) };
}
export const inWindow = (s, t, moved = 0) => { const w = windowOf(s, t, moved), c = s.encounter.cycle; return !!w && c >= w.from && c <= w.to; };
// A told tell on a part whose window is open now (the skills that answer one outright read the board with it).
export const tellOpen = (s, p, kind = null) => { const t = tellOn(s, p, kind); return t && inWindow(s, t) ? t : null; };
// What one ◆ broken in the window is worth toward a charge's burst.
const chitValue = (s, t) => t.need / (tellsOf(s)?.tier.chits || TELL.chits);
// ◆ still to break for the rest of a burst, and the burst left.
export const burstLeft = (s, t) => Math.max(0, (t.need || 0) - (t.wound || 0));
export const chitsLeft = (s, t) => Math.ceil(burstLeft(s, t) / Math.max(1e-9, chitValue(s, t)) - 1e-9);
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
  Object.assign(t, { told: true, said: e.cycle, next, n, wound: 0, need: needOf(s, t, p), hitBy: [], chits: 0, opened: null, early: null });
  if (t.kind !== 'mimic') tally(s, t, 'said');
  seeGene(s.host || s, t.gene, e.virus.author); // the gene codex: a tell you've met is seen (genome.mjs)
  emit(s, 'telegraph', sayOf(s, t, p), { source: p.id, tell: t.id, kind: t.kind, at: next });
  const w = windowOf(s, t);
  if (w && w.from <= e.cycle) t.opened = e.cycle; // said inside its window: the line above says so
}
// What a deliberate answer takes: a charge, a burst (the tier's share of its part's max); a cast, hits.
const needOf = (s, t, p) => (t.kind === 'charge' ? Math.max(1, Math.round((tellsOf(s).tier.share || 0.5) * (p?.max || 1))) : t.kind === 'cast' ? tellsOf(s).tier.castHits : 0);
const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const when = (n) => (n <= 0 ? 'this cycle' : n === 1 ? 'next cycle' : `in ${n} cycles`);
const upper = (x) => x.replace(/^./, (c) => c.toUpperCase());
// The answer, exactly, for the chip's hover and the log: what counts, and when.
export function answerOf(t, p, s = null) {
  const armored = p?.armor > 0, chits = s ? chitsLeft(s, t) : null;
  const left = s ? burstLeft(s, t) : t.need;
  if (t.kind === 'charge') return `deal ${left} to the ${p?.name} in its window${armored && chits ? `, or break ${chits} ◆ on it` : ''}`;
  if (t.kind === 'cast') return `SIGINT in its window, or hit the ${p?.name} ${times(Math.max(1, (t.need || 0) - (t.wound || 0)))} in it`;
  if (t.kind === 'seal') return `strip the ${p?.name} before it lands`;
  if (t.kind === 'lock') return `break the ${p?.name}, or let it land and feed it a skill that is cooling anyway`;
  return 'go quiet on the beat';
}
// When its window opens, as the log says it: 'now', or 'next cycle', 'in 2 cycles'.
function windowWhen(s, t) { const w = windowOf(s, t); return w ? Math.max(0, w.from - s.encounter.cycle) : 0; }
// What the log says when a tell is announced: what's coming, when, when its window opens and what answers it.
function sayOf(s, t, p) {
  const n = tellNext(s, t) - s.encounter.cycle, L = label(t), w = windowOf(s, t), opens = windowWhen(s, t);
  // A one-cycle window is the cycle it lands; a longer one opens before it.
  const single = opens === n;
  const span = single ? (n ? 'on the cycle it lands' : 'this cycle') : w && w.to > Math.max(w.from, s.encounter.cycle) ? 'before it lands' : 'this cycle';
  const window = single ? '' : opens ? `Its window opens ${when(opens)}. ` : 'Its window is open now. ';
  const before = opens ? ' Hits before then don\'t count.' : '';
  if (t.kind === 'charge') {
    const or = p.armor > 0 ? `, or break ${chitsLeft(s, t)} ◆ on it,` : '';
    return `The ${p.name} charges its ${p.attack?.name || 'attack'} into ${L}. It lands ${when(n)}. ${window}Deal ${t.need} to the ${p.name} ${span}${or} to call it off.${before}`;
  }
  if (t.kind === 'cast') return `The ${p.name} is compiling ${L}. It lands ${when(n)}. ${window}SIGINT interrupts it ${opens ? 'then' : 'now'}, and so does hitting the ${p.name} ${times(t.need)} ${opens ? 'in the window' : 'before it lands'}.${before}`;
  if (t.kind === 'seal') return `The ${p.name} starts ${L}. If it still wears ◆ ${when(n)}, it re-arms with one ◆ more and every stripped part gets a ◆ back. Strip it before then.`;
  if (t.kind === 'lock') return `The ${p.name} starts ${L}. It lands ${when(n)}. After that, the first command you fire is locked for ${cycles(t.cycles || 3)}, key 1 included. Feed it a skill that is cooling anyway, or break the ${p.name}.`;
  return `The ${p.name} is recording you. ${upper(when(n))} it plays back whatever you fire, so fire something quiet then.`;
}
// A tell's window opens (a new cycle): the log says so, once, with what it takes now.
function windowOpens(s, t, p) {
  const left = burstLeft(s, t), last = tellNext(s, t) === s.encounter.cycle, L = label(t);
  const span = last ? 'this cycle' : 'before it lands';
  const text = t.kind === 'charge'
    ? `${L}'s window is open. Deal ${left} to the ${p.name} ${span}${p.armor > 0 ? `, or break ${chitsLeft(s, t)} ◆ on it,` : ''} to call it off.`
    : `${L}'s window is open. SIGINT interrupts it now, and so does hitting the ${p.name} ${times(left)} ${span}.`;
  emit(s, 'telegraph', text, { source: p.id, tell: t.id, kind: t.kind, at: tellNext(s, t), window: true });
}

// A new cycle (after the old one closed): announcements. A charge whose attack went by without landing as a
// charge (a Blackhole, a Hijack) is over.
export function tellCycle(s) {
  if (!tellsOf(s) || s.encounter.phase !== 'active') return;
  castsEnd(s);
  lockTakes(s);
  for (const t of tellsOf(s).list) if (t.told && t.kind === 'charge') { const p = sourceOf(s, t); if (alive(p) && p.attack && (p.attack.n || 0) > t.n) rest(s, t, s.encounter.cycle - 1); }
  announce(s);
  // Windows that open this cycle: the log says so, once a tell (one said inside its window already said it).
  for (const t of tellsOf(s).list) {
    if (t.told && t.opened != null && !inWindow(s, t)) t.opened = null; // its attack was pushed back past it: it opens again later
    if (!t.told || !['charge', 'cast'].includes(t.kind) || t.opened != null || !inWindow(s, t)) continue;
    const p = sourceOf(s, t);
    if (!alive(p)) continue;
    t.opened = s.encounter.cycle;
    windowOpens(s, t, p);
  }
}

// One of your commands hit a part: it damaged it or broke ◆ on it (combat.mjs hit, Crack, a strip). It counts
// toward a tell on that part only if it's deliberate (your command aimed at that part, typed after the tell was
// said, not auto-repeat or a daemon, and a direct hit: combat.mjs leaves out burns, helpers and spills) and it lands
// inside the tell's window. opts.dealt: the damage it did; opts.chits: the ◆ it broke.
//   charge  a burst: the damage counts, and each ◆ as 1/tier.chits of the burst. Double Tap and Spectre count it
//           twice (combat.mjs tellWeight), and so does Fuzz (its `counts`). Overvolt's two hits each count.
//   cast    hits: each command counts once (Overvolt and Fuzz twice, Double Tap and Spectre twice).
// opts.cmd: a stand-in for your command (a skill that hits for you later, as Thermal Runaway's ticks or Kill Switch's
// cash-in on each part: dist/classes/*.mjs), opts.key: what it counts as, so it adds to the cycle's command hit.
export function tellHit(s, p, opts = {}) {
  const T = tellsOf(s), e = s.encounter, cmd = opts.cmd || e.commanding;
  if (!T || !alive(p) || !cmd || cmd === true || cmd.auto || cmd.target !== p.id || ABILITIES[cmd.id]?.noAnswer) return;
  for (const t of T.list) {
    if (!t.told || t.part !== p.id || !t.need || !['charge', 'cast'].includes(t.kind) || tellNext(s, t) < e.cycle || (cmd.at ?? e.cycle) < t.said) continue;
    // Before the window: it doesn't count, and the log says when it will (once a cycle).
    if (!inWindow(s, t)) { early(s, t, p); continue; }
    const last = tellNext(s, t) === e.cycle;
    if (t.kind === 'charge') {
      const x = (ABILITIES[cmd.id]?.hits ? 1 : cmd.counts || 1) * tellWeight(s);
      const add = ((opts.dealt || 0) + (opts.chits || 0) * chitValue(s, t)) * x;
      if (add <= 0) continue;
      t.wound = Math.min(t.need, Math.round(t.wound + add));
      if (t.wound < t.need) { emit(s, 'status', `${label(t)}: ${t.wound} of ${t.need}. ${t.need - t.wound} more ${last ? 'this cycle' : 'before it lands'} calls it off${p.armor > 0 ? `, or ${chitsLeft(s, t)} ◆` : ''}.`, { source: p.id, tell: t.id, burst: t.wound, need: t.need }); continue; }
      emit(s, 'blocked', `You burst the ${p.name} in its window: ${label(t)} is called off.`, { source: p.id, target: p.id, tell: t.id, answered: true });
      read(s, t, p, { open: true });
    } else {
      const key = opts.key || `${e.cycle}:${s.who || ''}`, used = t.hitBy.filter((k) => k === key).length;
      if (used >= (cmd.counts || 1)) continue;
      t.hitBy.push(key);
      t.wound = Math.min(t.need, t.wound + tellWeight(s));
      if (t.wound < t.need) { emit(s, 'status', `${label(t)}: ${t.wound} of ${t.need} hits. ${t.need - t.wound} more ${last ? 'this cycle' : 'before it lands'} interrupts it.`, { source: p.id, tell: t.id }); continue; }
      emit(s, 'interrupt', `You hit the ${p.name} out of its compile: ${label(t)} is stopped.`, { source: p.id, target: p.id, tell: t.id, answered: true });
      read(s, t, p, { open: true });
    }
    rest(s, t, e.cycle, true);
  }
}
// A hit before the window: it does its damage, and the log says the tell isn't open yet (once a cycle).
function early(s, t, p) {
  const e = s.encounter;
  if (t.early === e.cycle) return;
  t.early = e.cycle;
  emit(s, 'status', `Too early for ${label(t)}. Its window opens ${when(windowWhen(s, t))}, and only hits in it count.`, { source: p.id, tell: t.id, early: true });
}
// A skill built for a tell answers it outright (Suspend drains a charge, Quarantine holds a cast, Hijack takes one
// over, dist/classes/*.mjs), inside its window like any other answer: false (and nothing said) outside it, and the
// skill does only what it does anyway. It counts as a read when it's a command of yours, typed after the tell was
// said. at: when the answer was typed, for one that resolves later (Hijack). moved: cycles the skill just pushed the
// attack back. stagger false: the skill already delayed the attack itself (Suspend, Jam, Spoofed ACK).
export function tellAnswer(s, t, p, msg, { open = t.kind !== 'seal', skill = null, at = null, moved = 0, stagger = TELL.open.built !== false } = {}) {
  const e = s.encounter, cmd = e.commanding;
  if (t.kind !== 'seal' && !inWindow(s, t, moved)) return false;
  emit(s, t.kind === 'cast' ? 'interrupt' : 'blocked', msg, { source: p.id, target: p.id, tell: t.id, answered: true });
  if (at != null ? at >= t.said : cmd && !cmd.auto && (cmd.at ?? e.cycle) >= t.said) read(s, t, p, { open, stagger, skill: skill || (open ? null : cmd?.id) });
  rest(s, t, e.cycle, true);
  return true;
}
// Reading pays. A charge, a cast or the Mimic answered staggers its part: it's Open (+50% from everyone for 2 cycles)
// and its next attack lands a cycle later (TELL.open.delay). A seal stopped readies the skill that did it.
function read(s, t, p, { open = false, skill = null, stagger = true } = {}) {
  const e = s.encounter;
  tally(s, t, 'read');
  readGene(s.host || s, t); // the gene codex: a tell you read is decoded (genome.mjs)
  if (open && alive(p)) {
    const n = TELL.open.cycles + (fxOn(s, 'open-long')?.fx.value || 0); // Read Receipt (a native unique): Open lasts longer
    p.openUntil = Math.max(p.openUntil || 0, e.cycle + n - 1);
    // A charge of another tell already riding that attack keeps its cycle (it was said clear of the Mimic's beat and of
    // other tells): no delay then.
    const riding = (tellsOf(s)?.list || []).some((x) => x !== t && x.told && x.kind === 'charge' && x.part === p.id && x.n === (p.attack?.n || 0));
    const late = stagger && !riding && p.attack && p.attack.due < 900 && p.attack.due >= e.cycle ? (e.virus.boss ? TELL.boss.delay ?? TELL.open.delay : TELL.open.delay) || 0 : 0; // a solo boss keeps its clock (TELL.boss.delay)
    if (late) p.attack.due += late;
    emit(s, 'read', `READ: the ${p.name} staggers. It takes +${Math.round((TELL.open.mult - 1) * 100)}% from everyone for ${cycles(n)}${late ? `, and its ${p.attack.name} lands ${late === 1 ? 'a cycle' : cycles(late)} later` : ''}.`, { target: p.id, tell: t.id, open: true, stagger: late });
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
// Every tell that's been said and hasn't landed is called off, as if answered, with no stagger (a breach's Ripple20
// script, scripts.mjs). The Mimic's beat isn't a tell you can call off. Returns how many.
export function tellCallOff(s, by) {
  const T = tellsOf(s), e = s.encounter;
  let n = 0;
  for (const t of T?.list || []) {
    if (!t.told || t.kind === 'mimic') continue;
    const p = sourceOf(s, t);
    emit(s, t.kind === 'cast' ? 'interrupt' : 'blocked', `${by} calls off ${label(t)}.`, { source: p?.id, target: p?.id, tell: t.id, answered: true });
    rest(s, t, e.cycle, true);
    n++;
  }
  return n;
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
// A partial burst softens it: what it adds over the plain attack shrinks in step with what you dealt, to nothing at
// half the burst (TELL.plain): soft, its spawns and its longer scramble too.
const softOf = (t) => (t.need > 0 && t.wound > 0 ? Math.max(0, 1 - t.wound / (t.need * TELL.plain)) : 1);
function chargeAttack(s, t, p) {
  const T = tellsOf(s), max = defender(s).max, a = p.attack, k = softOf(t);
  const enr = p.enrage && p.integrity < p.max / 2 ? CONFIG.enrage : 1; // attackAmount counts Bricker's rage again: take it out
  const big = (n, cap) => { const top = Math.max(n, Math.min(ceilingOf(s) * max, n + Math.min(cap * max, n * (T.tier.mult - 1)))); return Math.max(1, Math.round(n + (top - n) * k)); };
  const base = { ...a, name: t.name, ramp: 0, step: 0, rampBy: 0, bonus: 0, grow: 0, windup: 0, wound: 0, noCrit: true, tell: t.id, soft: k, spawn: Math.round((t.spawn || 0) * k) };
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
      if (p.blackhole) { delete p.blackhole; emit(s, 'blocked', `${label(t)} falls into the blackhole and does nothing.`, { source: p.id, tell: t.id, answered: true }); advance(p, e); tally(s, t, 'answered'); rest(s, t, e.cycle, false); continue; }
      const atk = chargeAttack(s, t, p), locked = s.encounter.encrypt || 0, shield = e.shield || 0;
      // A partial burst: it lands softer by the share you dealt in the window.
      if (atk.soft < 1) emit(s, 'status', `You burst ${t.wound} of ${t.need} into the ${p.name}. ${label(t)} ${atk.soft <= 0 ? `lands plain${tellsOf(s).tier.after ? ' and leaves nothing behind' : ''}` : `lands ${Math.round((1 - atk.soft) * 100)}% softer`}.`, { source: p.id, tell: t.id, burst: t.wound, need: t.need, plain: atk.soft <= 0 });
      if (strikeWith(s, p, atk)) return done(), true;
      advance(p, e);
      // Full Disk: a burst of encryption on top of its Encrypt, for TELL.burst cycles (it goes when the part breaks, or with Purge).
      if (atk.burst && (s.encounter.encrypt || 0) > locked) { // its Encrypt got through (a ◆, Null Route or Sanitize stops both)
        s.encounter.burst = { name: t.name, amount: atk.burst, left: TELL.burst, source: p.id };
        emit(s, 'encrypt', `${label(t)} adds a burst of encryption, dealing ${atk.burst} damage every cycle for ${TELL.burst} cycles.`, { source: p.id, amount: atk.burst, tell: t.id, missed: true });
        tally(s, t, 'cost', atk.burst * TELL.burst);
      }
      // A brood: more spawns on top of the charged one (up to the usual limit).
      if (atk.spawn && atk.effect === 'replicate' && alive(p)) for (let k = 0; k < atk.spawn; k++) strikeWith(s, p, { ...atk, hit: 0 });
      if (t.shred) shred(s, p, t);
      // It got through (it hurt, or it took your shield): the after-effect, unless your burst landed it plain.
      const spared = atk.soft <= 0;
      if (!spared && (was > defender(s).integrity || (e.shield || 0) < shield || (s.encounter.encrypt || 0) > locked)) { lockLast(s, t, label(t)); corrupt(s, t, p); hang(s, t); }
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
      if (t.does !== 'overclock') { lockLast(s, t, label(t)); corrupt(s, t, p); hang(s, t); } // Overclock's cost is the gamble itself
    } else if (t.kind === 'lock') {
      e.lockArmed = { at: e.cycle, name: t.name, cycles: t.cycles || 3, tell: t.id, source: p.id };
      emit(s, 'status', `${label(t)} lands. The first command you fire next is locked for ${cycles(t.cycles || 3)}, key 1 included.`, { source: p.id, tell: t.id, missed: true, mark: 'lock' });
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
    emit(s, 'phase', `${label(t)} compiles. For ${cycles(lasts)}, every attack from ${v.name} deals ${Math.round((TELL.loud - 1) * 100)}% more damage.`, { target: p.id, tell: t.id, missed: true });
  } else if (t.does === 'grow') {
    const all = livingParts(s).filter((x) => x.kind === 'system' && !implanted(s, x)); // a Rootkit Implant stops it growing
    for (const x of all) { const n = Math.round(x.max * TELL.grow); x.max += n; x.integrity += n; }
    emit(s, 'phase', `${label(t)} compiles. ${all.map((x) => x.name).join(', ')} ${all.length === 1 ? 'grows' : 'grow'} ${Math.round(TELL.grow * 100)}% more Integrity.`, { target: p.id, tell: t.id, missed: true });
  } else if (t.does === 'overclock') {
    // Every attack still to come moves a cycle sooner (never onto this cycle, which is over), and every part takes double.
    if (fresh) for (const x of attackers(s)) if (x.attack.due < 900 && x.attack.due >= c + 2) x.attack.due--;
    emit(s, 'phase', `${label(t)} compiles. For ${cycles(lasts)}, every part of ${v.name} takes double damage, and every attack comes a cycle sooner.`, { target: p.id, tell: t.id, missed: true });
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
    if (!quiet) emit(s, 'status', `${v.name}'s ${k === 'loud' ? 'extortion' : k === 'grow' ? 'update' : k === 'overclock' ? 'overclock' : 'persistence'} runs out.`, {});
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
// Why SIGINT can't fire on a solo fight now, or null: nothing compiling, or the cast's window isn't open yet.
export function tellSigintCheck(s) {
  const t = tellCast(s);
  if (!t) return 'Nothing is compiling. SIGINT stops a cast.';
  if (!inWindow(s, t)) return `Too early: ${t.name}'s window opens ${when(windowWhen(s, t))}. SIGINT only interrupts a cast in its window.`;
  return null;
}
export function tellSigint(s) {
  const t = tellCast(s);
  if (!t || !inWindow(s, t)) return false;
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
    // The window, in the board's columns: winFrom (the first column it can be answered in) to col; open: it is now.
    const w = windowOf(s, t);
    const winFrom = Math.max(0, (w?.from ?? next) - e.cycle);
    const x = { source: p.id, name: t.name, tell: t.kind, id: t.id, gene: t.gene || null, col, hidden: false, kind: p.kind, need: t.need, wound: t.wound, does: t.does || null, effect: 'tell', amount: 0, answer: answerOf(t, p, s),
      winFrom, open: winFrom === 0, armored: p.armor > 0, chits: t.kind === 'charge' && p.armor > 0 ? chitsLeft(s, t) : 0, left: burstLeft(s, t) };
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
// How a player who reads tells answers them: keep a burst for a charge's window and fire it then (strip the part
// the cycle before when the bare hit is the bigger burst), SIGINT a cast in its window or hit it twice, go quiet on
// the Mimic's beat, strip a part that's about to seal. TELL.bots.answer false: a bot that plays as if there were
// none (balance.mjs, for the gap test).
export const answers = () => TELL.bots.answer !== false;
const ok = (s, text) => !!text && !toIntent(s, text).error;
const first = (s, list) => list.find((c) => ok(s, c)) || null;
const soon = (s, lag) => (tellsOf(s)?.list || []).filter((t) => t.told && !ignores(t.gene) && tellNext(s, t) - s.encounter.cycle <= lag); // a gene the sim ignores (genes.mjs GENE_BOTS) goes unanswered
// Commands that deal no direct damage: what you fire on the Mimic's beat.
export const QUIET = ['harden', 'firewall', 'bulkhead', 'dmz', 'heartbeat', 'shadow-copy', 'log-wipe', 'turbo-boost', 'malloc', 'brace', 'patch', 'null-route', 'sudo', 'fork', 'debris-field', 'rm-rf', 'vent', 'circuit-breaker', 'honeypot', 'maintenance-window', 'logic-trap', 'rotate-keys', 'vanish', 'load-shed', 'multicast', 'mesh'];
const quietFor = (s, t) => [...QUIET, ...['crack', 'shaped-charge', 'bit-rot', 'exploit', 'tag', 'hook', 'inject', 'deploy', 'spawn', 'botnet', 'fan-out', 'purge', 'thermal-runaway', 'keepalive', 'wormable', 'polymorph', 'skim', 'thrash', 'cache-poison'].map((id) => id + ' ' + t.id), 'hold'];
// A cast's answer by hits: any hit of yours on the part counts once (Overvolt and Fuzz twice), on armor too.
const HITS = ['segfault', 'backstab', 'overvolt', 'backfire', 'fuzz', 'retaliate', 'opening', 'overload', 'flood', 'backdoor', 'reclaim', 'rate-limit', 'blowback', 'stack-smash', 'replay', 'spoofed-ack', 'thermal-throttle', 'reject', 'checksum', 'hot-loop', 'fingerprint', 'side-channel', 'unmask', 'revoke', 'sniff', 'echo-cancel', 'nohup', 'jam', 'chain-reaction', 'bit-rot', 'throttle', 'crack', 'shaped-charge', 'spike'];
const counts = (s, text) => { const id = text.split(' ')[0]; return !ABILITIES[id]?.noAnswer; };
function hitOn(s, p) {
  if (p.armor > 0) return first(s, ['overvolt ' + p.id, 'fuzz ' + p.id, p.armor >= 2 && 'crack ' + p.id, 'spike ' + p.id].filter(Boolean));
  return HITS.map((id) => id + ' ' + p.id).filter((c) => ok(s, c) && counts(s, c)).sort((a, b) => score(s, b, p) - score(s, a, p))[0] || null;
}
const score = (s, text, p) => { const id = text.split(' ')[0]; return previewDamage(s, id, p) + (['overvolt', 'fuzz'].includes(id) ? 40 : 0) + (id === 'backstab' && tellOn(s, p) ? 30 : 0); };
// Skills built to answer a tell outright (dist/classes/*.mjs): a plan that fires one of them on the part answers it.
const BUILT = { charge: ['suspend', 'jam', 'spoofed-ack', 'hijack', 'blackhole', 'backfire'], cast: ['quarantine', 'hijack', 'sigint', 'overvolt', 'fuzz', 'irq-storm', 'kill-switch', 'reroute', 'thermal-runaway'], seal: ['bit-rot', 'cache-poison', 'shaped-charge', 'crack'] };
// (Kill Switch and Reroute have no target: they count only on a part your helpers are on. Jam, Hijack and Blackhole
// take a helper on the part to answer a charge.)
const helped = (s, p) => s.encounter.helpers.some((h) => h.target === p.id);
const built = (planned, t, p, s = null) => {
  const [id, at] = (planned || '').split(' ');
  if (!(BUILT[t.kind] || []).includes(id)) return false;
  if (t.kind === 'charge' && s && ['jam', 'hijack', 'blackhole'].includes(id) && !helped(s, p)) return false;
  return at ? at === p.id : !s || !['kill-switch', 'reroute'].includes(id) || helped(s, p);
};
// The ◆ a command of yours breaks on an armored part: Crack its strip, Shaped Charge all of them, a heavy hit two,
// any other hit one (Overvolt's two hits each).
function chipsOf(s, id, q) {
  const a = ABILITIES[id];
  if (!a || !(q.armor > 0) || ignoresArmor(s, id)) return 0;
  const base = skillBase(s, id, q);
  const k = id === 'crack' ? a.strip : id === 'shaped-charge' ? q.armor : base > 0 ? (a.chits > 1 || base >= CONFIG.heavyHit * powerOf(s) ? 2 : 1) * (a.hits || 1) : 0;
  return Math.min(q.armor, k);
}
// What a command does toward a charge's burst on p, roughly: a skill built for it is a whole one; otherwise its hit
// (a break is a whole one too), or on armor the ◆ it breaks at their rate. Kill Switch and IRQ Storm cash in what's
// on the part. armor: as if the part wore that many ◆ (0: the cycle after a strip).
function burstOf(s, text, t, p, { armor = null, ready = false } = {}) {
  if (!text) return 0;
  const [id, at] = text.split(' '), a = ABILITIES[id];
  if (!a || a.noAnswer || (!ready && !ok(s, text))) return 0;
  if (built(text, t, p, s)) return t.need;
  const x = (a.hits ? 1 : a.counts || 1) * tellWeight(s);
  if (id === 'kill-switch') return helped(s, p) ? s.encounter.helpers.filter((h) => h.target === p.id).reduce((n, h) => n + h.damage * (h.left + 1), 0) * x : 0;
  if (id === 'irq-storm') return s.encounter.burns.filter((b) => b.target === p.id).reduce((n, b) => n + b.damage, 0) * x;
  if (at !== p.id) return 0;
  // Detonate cashes in your burns on it at once (half again), through ◆.
  if (id === 'detonate') return s.encounter.burns.filter((b) => b.target === p.id && b.id !== 'implant').reduce((n, b) => n + b.damage * b.left, 0) * 1.5 * x;
  const q = armor != null ? { ...p, armor } : p;
  if (q.armor > 0 && !ignoresArmor(s, id)) return chipsOf(s, id, q) * chitValue(s, t) * x;
  const d = previewDamage(s, id, q) * (id === 'backstab' ? 1.5 : 1); // Backstab crits a part busy with a tell
  return d >= q.integrity && d > 0 ? t.need : d * x;
}
// The command with the biggest burst on p from what's ready now (or within `by` cycles, for planning): the smallest
// one that does the whole thing, so the bigger keys stay ready, else the biggest there is.
function bestBurst(s, t, p, { by = 0, armor = null, without = null } = {}) {
  const ids = [...new Set([...usable(s), 'spike'])].filter((id) => id !== without && ABILITIES[id] && (by ? readyIn(s, id) <= by : true));
  const texts = ids.flatMap((id) => { const a = ABILITIES[id]; return a.target === 'part' || a.target === 'attack' ? [id + ' ' + p.id] : ['kill-switch', 'irq-storm'].includes(id) ? [id] : []; });
  const rated = texts.map((text) => ({ text, v: burstOf(s, text, t, p, { armor, ready: !!by && readyIn(s, text.split(' ')[0]) > 0 }) })).filter((x) => x.v > 0);
  const left = burstLeft(s, t);
  const whole = rated.filter((x) => x.v >= left).sort((a, b) => (cooldownOf(s, a.text.split(' ')[0]) - cooldownOf(s, b.text.split(' ')[0])) || a.v - b.v)[0];
  return whole || rated.sort((a, b) => b.v - a.v)[0] || null;
}
// Before a charge's window, three ways a plan can spoil it, and what to play instead:
//   strip ahead  the burst through ◆ falls short, a strip now bares the part, and a bare hit then does the whole thing
//                (a Breaker's strip-and-hit): strip it now.
//   chip         the plan chips the part's ◆ down to fewer than its window's burst needs without baring it (◆2 left is
//                a whole burst for Crack or a heavy hit, ◆1 only half): hit something else now.
//   spend        the plan fires the key the window needs, and it won't be ready again in time: Spike instead.
function holdFor(s, t, p, planned, toOpen) {
  const left = burstLeft(s, t), id = (planned || '').split(' ')[0], target = (planned || '').split(' ')[1];
  const keep = bestBurst(s, t, p, { by: toOpen });
  if (!keep) return null;
  const need = keep.text.split(' ')[0];
  if (toOpen === 1 && p.armor > 0 && keep.v < left) {
    const strip = first(s, [p.armor <= 1 && 'spike ' + p.id, p.armor <= ABILITIES.crack.strip && 'crack ' + p.id, 'shaped-charge ' + p.id, p.armor <= 2 && 'overvolt ' + p.id]);
    const sid = strip && strip.split(' ')[0];
    const then = strip && bestBurst(s, t, p, { by: 1, armor: 0, without: sid !== 'spike' && cooldownOf(s, sid) > 1 ? sid : null });
    if (then && then.v >= left && then.v > keep.v) return strip;
  }
  if (!planned) return null;
  if (target === p.id && p.armor > 0 && TELL.bots.chip !== false) {
    const after = p.armor - chipsOf(s, id, p);
    if (after > 0 && after < p.armor) {
      const then = bestBurst(s, t, p, { by: toOpen, armor: after, without: cooldownOf(s, id) > toOpen ? id : null });
      if (keep.v >= left && (then?.v || 0) < left) { // only to keep a whole answer whole
        const other = livingParts(s).filter((x) => x !== p).sort((a, b) => (a.attack?.due ?? 99) - (b.attack?.due ?? 99))[0];
        const alt = other && first(s, ['spike ' + other.id]);
        if (alt) return alt;
      }
    }
  }
  if (id !== need || id === 'spike' || cooldownOf(s, id) <= toOpen) return null;
  // The plan fires the window's key now: what's left for the window without it.
  const rest = bestBurst(s, t, p, { by: toOpen, without: id });
  if (rest && rest.v >= Math.min(left, keep.v)) return null;
  // Something else meanwhile: an Inject the part doesn't have yet (one a part), else a Spike.
  const fresh = (x) => x && !s.encounter.burns.some((b) => b.id === 'inject' && b.target === x);
  return first(s, [fresh(target) && 'inject ' + target, target && 'spike ' + target, 'spike ' + p.id]);
}
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
  if (atk.effect === 'replicate') return Math.max(0, (atk.hit || 0) - (a.hit || 0)) + (atk.spawn || 0) * max * 0.08;
  return max * 0.06; // a bigger heal on its side
}
const after = (s) => (tellsOf(s).tier.after ? defender(s).max * 0.04 * tellsOf(s).tier.after : 0);
// Stripping a part in one command: Spike on its last ◆, Crack or Shaped Charge on more.
const quickStrip = (s, p) => p.armor <= 1 || (p.armor <= 3 && usable(s).includes('crack') && readyIn(s, 'crack') === 0) || (usable(s).includes('shaped-charge') && readyIn(s, 'shaped-charge') === 0);
// A command that answers a tell right now, or null. A reader answers every one it can in its window, and plans for
// it before then; a kill still comes first.
//   charge: in its window, the biggest burst it has on the part (the smallest that does the whole thing); before
//           it, keep that key off cooldown, and strip the part the cycle before when the bare hit is the bigger burst
//   cast:   SIGINT in its window, or two hits in it when SIGINT is cooling
//   mimic:  on its beat, a command with no direct hit, when the planned one would come back
//   seal:   strip its part, when one command does it
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
    // A cast landing this cycle: SIGINT first, while the virus has more than this part.
    const cast = soon(s, 0).find((t) => t.kind === 'cast' && inWindow(s, t) && t.part !== (planned || '').split(' ')[1]);
    if (cast && livingParts(s).length > 1 && TELL.bots.sigint !== false && ok(s, 'sigint')) return 'sigint';
    const big = soon(s, 0).find((t) => t.kind === 'charge' && inWindow(s, t) && t.part !== (planned || '').split(' ')[1] && chargeCost(s, t, sourceOf(s, t)) + after(s) >= defender(s).max * 0.12);
    if (!big || livingParts(s).length === 1) return null;
    const p = sourceOf(s, big), h = alive(p) && bestBurst(s, big, p);
    return h && h.v >= burstLeft(s, big) * 0.5 ? h.text : null;
  }
  for (const t of soon(s, 3).sort((a, b) => tellNext(s, a) - tellNext(s, b))) {
    const p = sourceOf(s, t);
    if (!alive(p)) continue;
    const next = tellNext(s, t), left = burstLeft(s, t), w = windowOf(s, t), open = c >= w.from, toOpen = w.from - c;
    // A charge, when what it adds is worth a command: in its window, the biggest burst; before it, plan for it.
    if (t.kind === 'charge' && TELL.bots.hit !== false && left > 0) {
      const builds = ABILITIES[(planned || '').split(' ')[0]]?.verb === 'burn';
      if (chargeCost(s, t, p) + after(s) < defender(s).max * (builds ? 0.12 : 0.05)) continue;
      if (open) {
        const mine = burstOf(s, planned, t, p);
        if (mine >= left) return null; // the plan answers it already
        // Low, and the plan heals: survive first, unless the charge alone would take the rest.
        const d = defender(s), heals = ['heal', 'shield'].includes(ABILITIES[(planned || '').split(' ')[0]]?.verb);
        if (heals && TELL.bots.survive !== false && d.integrity < d.max * 0.35 && chargeCost(s, t, p) + attackAmount(p) < d.integrity) continue;
        // Worth the command when it calls the charge off, or bursts enough of it to land it plain.
        const h = bestBurst(s, t, p), enough = h && (h.v >= left || (t.wound || 0) + h.v >= t.need * TELL.plain);
        if (enough && h.v > mine && (!recording || !mimicHit(s, h.text.split(' ')[0], p))) return h.text;
        if (mine > 0) return null; // the plan bursts it as well as anything would: keep it, and plan nothing for a later tell over it
      } else if (TELL.bots.hold !== false) {
        const h = holdFor(s, t, p, planned, toOpen);
        if (h && !echoes(h)) return h;
      }
    }
    if (t.kind === 'cast' && left > 0 && built(planned, t, p, s) && (open || (planned || '').startsWith('thermal-runaway '))) return null;
    if (t.kind === 'cast' && left > 0) {
      // Thermal Runaway the cycle before the window: its ticks land in it, and each counts as a hit.
      const tr = toOpen === 1 && left <= 2 && first(s, ['thermal-runaway ' + p.id]);
      if (tr && !echoes(tr)) return tr;
      if (!open) continue;
      // A skill built for a cast answers it and does something besides (damage, a stun): keep SIGINT for the next one.
      const own = first(s, [left <= 2 && 'overvolt ' + p.id, left <= 2 && 'fuzz ' + p.id, 'quarantine ' + p.id, helped(s, p) && 'hijack ' + p.id, s.encounter.helpers.length >= left && 'reroute ' + p.id]);
      if (own && !echoes(own)) return own;
      if (TELL.bots.sigint !== false && hackerLevel(s) >= TELL.castFrom && ok(s, 'sigint')) return 'sigint';
      if (hitsIt(planned, p)) return null;
      const h = left <= next - c + 1 ? hitOn(s, p) : null;
      if (h && !echoes(h)) return h;
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

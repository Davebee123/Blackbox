// Crew bosses: the group boss framework. A boss with a `raid` in BOSSES (data.mjs) runs on it: KESSLER-FARM-00's
// Foreman, Heatsink and Coldwallet. The solo bosses (RELAY-KING, REPO MAN, HOLLOW CHOIR, the Residents) don't.
//
// A crew boss has phases by its health, and each phase lists mechanics from the library (MECHANICS below):
// every one of them is telegraphed (the board's Boss row and a log line: "PINK SLIP → kilo in 2") and lands
// on a target picked by a rule (TARGETS). A missed mechanic downs a player or takes a big share of their
// Signal, so every role has a job in every phase:
//   the tank holds aggro for the busters and clears Thermal Stress, and pulls the workers;
//   the healer heals through pulses, pre-heals the marked player and cleanses corruption;
//   damage breaks the priority adds and the shields in time and beats the enrage;
//   everyone interrupts casts with SIGINT (from level 10), and everyone hits a shield that has to break.
//
// State lives on the shared virus (v.raid), so a crewmate's view of the fight is the same as yours:
//   phase       the index of the phase running (def.phases)
//   mechs       { [id]: { next, count, told, who, interrupted } }: when each mechanic lands next (the cycle,
//               at the end of the virus's half), how often it has, whether it's announced and at whom
//   dealt, healed  { [who]: { [cycle]: n } }: damage dealt and heals cast, for aggro and the healer rule
//   fx          { [who]: { stress, dots, absorb } }: what's on each player (Thermal Stress stacks, damage over
//               time like Corruption, and encrypted sectors that eat the next heals)
//   shield      a firewall phase's shield over the boss: { name, amount, max, until, size }
// A boss's own parts can carry a target rule too (def.targets: { partId: 'aggro' }); adds a mechanic
// spawns are parts with raidAdd (their attacks go at the player they were sent at).
//
// To add a crew boss: give its BOSSES entry a `raid`: { targets (part id → target rule for its own attacks),
// quiet (parts whose attack a mechanic replaces), enrage ({ name, size }: from enrageAt, a hit on everyone
// every cycle), phases: [{ from (the health share it starts at), name, say, mechs }] }, where mechs are
// library kinds with their numbers (data.mjs has the three farm bosses as examples). Nothing else changes:
// the engine, the bots (planner.mjs, bastion.mjs) and the board read the same data.
import { hooks, emit, alive, defender, rand, hackerLevel, classOf, subOf, mechanicHit, toIntent, finish } from './combat.mjs';
import { BOSSES, makePart } from './data.mjs';

export const RAID = {
  warn: 2, // a mechanic is announced this many cycles before the cycle it lands in
  aggroWindow: 3, // aggro without a taunt: the most damage over this many cycles
  rest: 5, // a player marked by one mechanic isn't marked again for this many cycles, while anyone else can be
  stress: 0.25, // Thermal Stress: +25% damage taken per stack
  // Mechanic sizes by the boss's level (curve points): gentle while a crew has no heals, no Bulkhead and no
  // SIGINT (SIGINT comes at 10, Patch at 12, Bulkhead and Multicast at 14), full from 17, a little more by 30.
  scale: [[9, 0.4], [13, 0.6], [17, 1], [30, 1.2]],
  // Its Integrity by level, the same way: a crew before its subclass skills kills slower.
  hpScale: [[9, 0.8], [12, 0.85], [18, 1]],
  crewHp: [0.3, 0.42, 0.72, 1], // a crew boss's Integrity for a crew of 1–4: it's sized for four
  crewSize: [0.5, 0.5, 0.8, 1], // and its mechanics' sizes: a crew short of a role still has a chance
  enrageLate: 3, // and enrages this many cycles later for each player a crew is short of four
  wipe: 0.5, // the crew loses the fight once this share of it is down (two of three or four; you, in a duo): two misses usually lose
  interrupt: { from: 10, cooldown: 8, sooner: 1 },
  bots: { interrupt: true, tank: true }, // sim switches (farmsim.mjs): crews that ignore a mechanic
};
// A crew boss's Integrity for a crew of n, against the four it's built for: smaller crews get a smaller boss.
export const crewHp = (n) => RAID.crewHp[Math.max(1, Math.min(4, n)) - 1];
export const raidDef = (v) => BOSSES[v?.boss]?.raid || null;
export const raidOf = (s) => s.encounter?.virus?.raid || null;
// A value by level from points [[level, value], …]: flat before the first and after the last, linear between.
export function curve(level, pts) {
  if (level <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (level <= pts[i][0]) { const [a, x] = pts[i - 1], [b, y] = pts[i]; return x + ((y - x) * (level - a)) / (b - a); }
  return pts.at(-1)[1];
}
export const levelScale = (level) => curve(level, RAID.scale);
const whoOf = (st) => st.who || 'you';
const hostOf = (s) => s.host || s;
const fracOf = (st) => { const d = defender(st); return d.max ? d.integrity / d.max : 0; };

// ---------- who's in the fight ----------
// Everyone standing, the player first.
export function playersOf(s) {
  const host = hostOf(s);
  if (!host.encounter) return [];
  const mates = hooks.crewStanding?.(host) || []; // (not crewAll: that sets each crewmate's cycle, and a bot plans as of the next)
  return [host, ...mates].filter((st) => st.encounter && defender(st).integrity > 0);
}
const byName = (s, who) => playersOf(s).find((st) => whoOf(st) === who) || null;
export const fxOf = (s, who) => { const r = raidOf(s); return r ? (r.fx[who] ||= { stress: 0, dots: [], absorb: 0 }) : { stress: 0, dots: [], absorb: 0 }; };
const sumSince = (log, from) => Object.entries(log || {}).reduce((n, [c, x]) => n + (Number(c) >= from ? x : 0), 0);
const drawing = (st) => st.encounter?.buffs?.sinkhole >= st.encounter?.cycle;

// ---------- target rules ----------
// crew: everyone, in full. aggro: whoever is drawing fire, else whoever dealt the most over the last 3 cycles.
// marked: a random player who isn't holding aggro, picked when it's announced. lowest: the lowest Signal
// (by share) when it lands. healer: whoever cast the most heals over the last 6 cycles, else the lowest.
export const TARGETS = {
  crew: 'everyone, in full',
  aggro: 'the player holding aggro (drawing fire, else the most damage over the last 3 cycles)',
  marked: 'a player marked two cycles ahead (never the one holding aggro)',
  lowest: 'the player with the lowest Signal',
  healer: 'the healer (whoever cast the most heals lately)',
};
export function aggroOf(s) {
  const all = playersOf(s), r = raidOf(s), c = s.encounter.cycle;
  if (!all.length) return null;
  const sink = all.find(drawing);
  if (sink) return sink;
  if (!r) return all[0];
  const from = c - RAID.aggroWindow + 1;
  return all.map((st, i) => ({ st, i, n: sumSince(r.dealt[whoOf(st)], from) })).sort((a, b) => b.n - a.n || a.i - b.i)[0].st;
}
const lowestOf = (s) => playersOf(s).sort((a, b) => fracOf(a) - fracOf(b))[0] || null;
function healerOf(s) {
  const r = raidOf(s), c = s.encounter.cycle, all = playersOf(s);
  const best = all.map((st) => ({ st, n: sumSince(r?.healed[whoOf(st)], c - 5) })).sort((a, b) => b.n - a.n)[0];
  return best?.n > 0 ? best.st : all.find((st) => subOf(st) === 'sysop') || lowestOf(s);
}
// Pick n marked players with the boss's dice: not the one holding aggro, and not anyone marked in the last
// RAID.rest cycles, while there's anyone else.
export function pickMarked(s, n = 1) {
  const all = playersOf(s), tank = aggroOf(s), r = raidOf(s), c = s.encounter.cycle;
  const fresh = (st) => !(r.marked?.[whoOf(st)] > c - RAID.rest);
  const out = [];
  for (const rule of [(st) => st !== tank && fresh(st), (st) => st !== tank, () => true]) {
    const pool = all.filter((st) => !out.includes(st) && rule(st));
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand(hostOf(s)) * pool.length), 1)[0]);
  }
  for (const st of out) (r.marked ||= {})[whoOf(st)] = c;
  return out;
}
// Who a mechanic lands on, right now.
export function victims(s, m, def) {
  const rule = def.target || 'crew';
  if (rule === 'crew') return playersOf(s);
  if (rule === 'aggro') return [aggroOf(s)].filter(Boolean);
  if (rule === 'lowest') return [lowestOf(s)].filter(Boolean);
  if (rule === 'healer') return [healerOf(s)].filter(Boolean);
  if (rule === 'marked') { const named = (m.who || []).map((w) => byName(s, w)).filter(Boolean); return named; }
  return [];
}
// The target of a boss part's attack (def.targets, or an add's own): one player, or null for everyone.
export function attackTarget(s, p) {
  const rule = p.attack?.target;
  if (!rule || rule === 'crew' || !raidOf(s)) return null;
  if (rule === 'aggro') return aggroOf(s);
  if (rule === 'lowest') return lowestOf(s);
  if (rule === 'healer') return healerOf(s);
  if (rule === 'marked') return byName(s, p.attack.at) || aggroOf(s); // an add's player went down: it goes for whoever holds aggro
  return null;
}

// ---------- the mechanic library ----------
// Every mechanic has: id, kind, name, every (cycles between), first (cycles after its phase starts), target,
// size (a share of the victim's max Signal, before the level scale) and optionally cast (a Compiling cast:
// interrupt true or false), warn (how far ahead it's announced, default RAID.warn), from (the boss level it
// starts at; a cast SIGINT stops starts with SIGINT, at level 10) and source (a part that has to be alive). The kinds:
export const MECHANICS = {
  // A big hit on whoever holds aggro. stress: true adds a Thermal Stress stack to whoever takes it.
  buster: { role: 'tank', what: 'a big hit on whoever holds aggro' },
  // A hit on everyone; grow: each one hits this much more (a share of max Signal) than the last.
  pulse: { role: 'healer', what: 'a hit on the whole crew, growing each time' },
  // A big hit on a player marked two cycles ahead.
  burst: { role: 'healer', what: 'a big hit on a marked player' },
  // Damage over time on the target(s) until cleansed (Patch, Scrub, Purge) or it runs out (lasts). spread: left
  // that many cycles, it copies itself onto another player (a worm), and again every spread cycles after.
  dot: { role: 'healer', what: 'damage every cycle until it is cleansed' },
  // Encrypted sectors: the next heals on the target are eaten, up to size of their max Signal.
  absorb: { role: 'healer', what: 'eats the next heals on a player' },
  // Workers: count adds, each hitting a marked player every cycle unless someone draws fire.
  adds: { role: 'tank', what: 'adds that hit a marked player every cycle unless someone draws fire' },
  // A priority add: while it lives the boss takes ward less damage; every fuse cycles it lives it hits
  // everyone for size.
  priority: { role: 'damage', what: 'an add that shields the boss and goes off unless it is broken in time' },
  // A firewall phase: a shield over the boss (amount, a share of its max Integrity) to break within window
  // cycles, or it hits everyone for size.
  shield: { role: 'damage', what: 'a shield over the boss to break in time' },
};
const amountOf = (s, def, m, st) => Math.max(1, Math.round(defender(st).max * (def.size + (def.grow || 0) * (m.count || 0)) * (raidOf(s)?.scale ?? 1)));

// ---------- the fight ----------
// When a fight against a crew boss starts (after the crew joins): its state, its parts' target rules, phase 1.
export function raidStart(s) {
  const v = s.encounter?.virus, def = raidDef(v);
  if (!def || v.raid) return;
  const n = playersOf(s).length;
  v.raid = { phase: -1, mechs: {}, dealt: {}, healed: {}, fx: {}, shield: null, scale: levelScale(v.level) * RAID.crewSize[Math.min(4, n) - 1], adds: 0 };
  for (const [id, rule] of Object.entries(def.targets || {})) { const p = v.parts.find((x) => x.id === id); if (p?.attack) p.attack.target = rule; }
  for (const id of def.quiet || []) { const p = v.parts.find((x) => x.id === id); if (p) p.attack = null; } // a part whose job a mechanic does now
  const k = curve(v.level, RAID.hpScale);
  if (k !== 1) for (const p of v.parts) { p.max = Math.max(1, Math.round(p.max * k)); p.integrity = Math.max(1, Math.round(p.integrity * k)); }
  const short = Math.max(0, 4 - n);
  if (v.enrageAt && short) v.enrageAt += RAID.enrageLate * short; // a smaller crew needs longer
  enterPhase(s, 0);
  announce(s);
}
// The boss's health share, without its adds.
export function bossShare(s) {
  const own = s.encounter.virus.parts.filter((p) => !p.raidAdd);
  const max = own.reduce((n, p) => n + p.max, 0);
  return max ? own.reduce((n, p) => n + p.integrity, 0) / max : 0;
}
const phaseOf = (s) => { const def = raidDef(s.encounter.virus), share = bossShare(s); let i = 0; def.phases.forEach((ph, k) => { if (share <= ph.from) i = k; }); return i; };
function enterPhase(s, i) {
  const e = s.encounter, r = raidOf(s), ph = raidDef(e.virus).phases[i];
  const was = r.mechs;
  r.phase = i;
  r.mechs = {};
  for (const m of ph.mechs.filter((x) => mechOn(e.virus, x))) r.mechs[m.id] = was[m.id] && was[m.id].next > e.cycle ? { ...was[m.id], told: false } : { next: e.cycle + m.first, count: was[m.id]?.count || 0 };
  if (i > 0) emit(s, 'phase', `PHASE ${i + 1}. ${ph.say}`, { boss: e.virus.boss, raid: true });
}
// A mechanic runs from its level (from), and a cast SIGINT would stop only once the crew has SIGINT.
export const mechOn = (v, m) => v.level >= (m.from || 0) && !(m.interrupt && v.level < RAID.interrupt.from);
export const mechDef = (s, id) => { const r = raidOf(s); return r ? raidDef(s.encounter.virus).phases[r.phase].mechs.find((m) => m.id === id) : null; };
const label = (def) => def.name.toUpperCase();
const at = (list) => (list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list.at(-1) : list[0] || 'nobody');

// Who a mechanic is going at, for the board and the log: names, 'everyone', or the aggro holder.
export function aimOf(s, def, m) {
  const rule = def.target || 'crew';
  if (def.kind === 'shield' || def.kind === 'priority') return '';
  if (def.kind === 'adds' && !m.who?.length) return '';
  if (rule === 'crew') return 'everyone';
  if (rule === 'marked') return at(m.who || []);
  const st = rule === 'aggro' ? aggroOf(s) : rule === 'healer' ? healerOf(s) : lowestOf(s);
  return st ? whoOf(st) : '';
}
// Announce what's coming: marked players are picked now; a cast starts compiling. Runs each new cycle.
function announce(s) {
  const e = s.encounter, r = raidOf(s);
  for (const [id, m] of Object.entries(r.mechs)) {
    const def = mechDef(s, id), lead = def.warn ?? RAID.warn;
    if (m.told || m.next - e.cycle > lead) continue;
    m.told = true;
    if (def.target === 'marked') m.who = pickMarked(s, def.count && def.kind !== 'adds' ? def.count : 1).map(whoOf);
    const n = m.next - e.cycle, when = n <= 0 ? 'this cycle' : `in ${n}`;
    const aim = aimOf(s, def, m);
    const text = def.cast
      ? `${e.virus.name} is compiling ${label(def)}${aim ? ` → ${aim}` : ''}. It lands ${when}${def.interrupt ? '. SIGINT stops it' : ', and it can\'t be interrupted'}.`
      : tell(def, aim, when);
    emit(s, 'telegraph', text, { mech: id, at: m.next, aim: m.who || null, cast: !!def.cast });
  }
}

// A mechanic's announcement, in a plain sentence: "PINK SLIP → nyx in 2."
function tell(def, aim, when) {
  const L = label(def), n = def.count || 1;
  if (def.kind === 'priority') return `${L} comes online ${when}. Break it before it goes off.`;
  if (def.kind === 'shield') return `${L} goes up over the boss ${when}. Break it in ${def.window} cycles.`;
  if (def.kind === 'adds') return `${n > 1 ? `${n} ${L}S come` : `${L} comes`} online ${when} and ${n > 1 ? 'go' : 'goes'} for ${aim || 'whoever holds aggro'}.`;
  if (def.kind === 'pulse') return `${L} hits everyone ${when}.`;
  return `${L} → ${aim} ${when}.`;
}
// The virus's half, after its parts' attacks: damage over time ticks, then each mechanic due lands, then
// shields and priority adds that ran out go off. True if the fight ended.
export function raidLand(s) {
  const e = s.encounter, r = raidOf(s);
  if (!r) return false;
  // Damage over time (Corruption, the Layoffs encryption). One left on too long spreads.
  for (const st of playersOf(s)) {
    const fx = fxOf(s, whoOf(st));
    for (const d of fx.dots) {
      if (d.left <= 0) continue;
      const dealt = mechanicHit(st, d.amount, d.name, 'raid', { dot: true });
      if (dealt) emit(st, 'server-hit', `${d.name} burns ${st === hostOf(s) ? 'you' : whoOf(st)} for ${dealt}.`, { amount: dealt, raid: true });
      d.left--;
      if (d.spread && e.cycle >= d.spreadAt) {
        d.spreadAt = e.cycle + d.spread;
        const to = playersOf(s).filter((x) => !fxOf(s, whoOf(x)).dots.some((y) => y.id === d.id));
        const next = to[Math.floor(rand(hostOf(s)) * to.length)];
        if (next) { fxOf(s, whoOf(next)).dots.push({ ...d, spreadAt: e.cycle + d.spread }); emit(next, 'blind', `${d.name} spreads from ${whoOf(st)} to ${whoOf(next)}. Cleanse it sooner.`, { raid: true, fail: true }); }
      }
    }
    fx.dots = fx.dots.filter((d) => d.left > 0);
  }
  if (ended(s)) return true;
  for (const [id, m] of Object.entries(r.mechs)) {
    if (m.next !== e.cycle) continue;
    const def = mechDef(s, id);
    land(s, def, m);
    m.count = (m.count || 0) + 1;
    m.next = e.cycle + def.every;
    m.told = false; m.who = null;
    if (ended(s)) return true;
  }
  // Enrage: from the boss's enrage cycle, a hit on everyone every cycle (on top of its parts attacking every cycle).
  const rage = raidDef(e.virus).enrage;
  if (rage && e.virus.enrageAt && e.cycle >= e.virus.enrageAt) {
    emit(s, 'warning', `The boss is enraged, and ${label(rage)} hits everyone.`, { raid: true, fail: true }); // (bossPhases flashes ENRAGES once)
    for (const st of playersOf(s)) hitOne(s, st, Math.round(defender(st).max * rage.size * r.scale), rage.name);
    if (ended(s)) return true;
  }
  // A firewall phase's shield that's still up when its window closes.
  if (r.shield && e.cycle >= r.shield.until) {
    const sh = r.shield;
    r.shield = null;
    emit(s, 'phase', `${label(sh)} holds, and it goes off on everyone.`, { raid: true, fail: true });
    for (const st of playersOf(s)) hitOne(s, st, Math.round(defender(st).max * sh.size * r.scale), sh.name);
    if (ended(s)) return true;
  }
  // Priority adds still up when their fuse runs out.
  for (const p of e.virus.parts.filter((x) => alive(x) && x.raidFuse && e.cycle >= x.raidFuse.at)) {
    emit(s, 'phase', `${p.name.toUpperCase()} goes off and hits everyone. Break it sooner.`, { raid: true, fail: true });
    for (const st of playersOf(s)) hitOne(s, st, Math.round(defender(st).max * p.raidFuse.size * r.scale), p.name);
    p.raidFuse.at = e.cycle + p.raidFuse.every;
    if (ended(s)) return true;
  }
  return false;
}
const ended = (s) => {
  const host = hostOf(s);
  hooks.crewHurt?.(host);
  if (defender(host).integrity <= 0) { finish(host, 'crashed'); return true; }
  // A wipe: half the crew is down.
  const crew = [host, ...(hooks.crewMates?.(host) || []).filter((m) => m.encounter)];
  const down = crew.filter((st) => st !== host && (st.encounter.down || defender(st).integrity <= 0)).length;
  if (crew.length > 2 && down >= Math.max(2, crew.length * RAID.wipe)) {
    emit(host, 'phase', `WIPE. Half the crew is down, so ${host.encounter.virus.name} wins this one. Regroup and try again.`, { raid: true, fail: true });
    finish(host, 'crashed');
    return true;
  }
  return false;
};
function hitOne(s, st, amount, name) {
  const dealt = mechanicHit(st, amount, name, 'raid');
  if (dealt) emit(st, 'server-hit', `${name} hits ${st === hostOf(s) ? 'you' : whoOf(st)} for ${dealt}.`, { amount: dealt, raid: true });
  return dealt;
}
function land(s, def, m) {
  const e = s.encounter, r = raidOf(s), v = e.virus;
  const list = victims(s, m, def);
  // A mechanic with a source part stops once that part is broken (the Heatsink's Replicator sends the workers).
  if (def.source && !v.parts.some((p) => p.id === def.source && alive(p))) return;
  if (def.kind === 'buster' || def.kind === 'pulse' || def.kind === 'burst') {
    for (const st of list) {
      hitOne(s, st, amountOf(s, def, m, st), def.name);
      if (def.stress) { const fx = fxOf(s, whoOf(st)); fx.stress++; emit(st, 'status', `${st === hostOf(s) ? 'You carry' : `${whoOf(st)} carries`} ${fx.stress} ${fx.stress === 1 ? 'stack' : 'stacks'} of Thermal Stress and ${st === hostOf(s) ? 'take' : 'takes'} ${Math.round(fx.stress * RAID.stress * 100)}% more damage. Purge clears it.`, { raid: true }); }
    }
  } else if (def.kind === 'dot') {
    for (const st of list) {
      const fx = fxOf(s, whoOf(st));
      fx.dots = fx.dots.filter((d) => d.id !== def.id);
      fx.dots.push({ id: def.id, name: def.name, amount: amountOf(s, def, m, st), left: def.lasts || 4, ...(def.spread ? { spread: def.spread, spreadAt: e.cycle + def.spread } : {}) });
      const long = (def.lasts || 4) >= 20 ? 'until it is cleansed' : `for ${def.lasts || 4} cycles`;
      emit(st, 'blind', `${def.name} burns ${st === hostOf(s) ? 'you' : whoOf(st)} for ${amountOf(s, def, m, st)} every cycle ${long}${def.spread ? `, and it spreads in ${def.spread}` : ''}. Patch, Scrub or Purge cleanses it.`, { raid: true });
    }
  } else if (def.kind === 'absorb') {
    for (const st of list) {
      const fx = fxOf(s, whoOf(st));
      fx.absorb += amountOf(s, def, m, st);
      emit(st, 'encrypt', `${def.name} lock up ${st === hostOf(s) ? 'you' : whoOf(st)}, and they eat the next ${fx.absorb} healing. Scrub clears them.`, { raid: true });
    }
  } else if (def.kind === 'adds') {
    const who = list.length ? list : [aggroOf(s)].filter(Boolean);
    for (let k = 0; k < (def.count || 1); k++) {
      const n = ++r.adds, to = who[k % who.length];
      const hp = Math.max(1, Math.round(bossMax(s) * def.hp));
      const p = { ...makePart({ id: `${def.id}${n}`, name: `${def.name} ${n}`, integrity: 1 }, 'fragment', 1), integrity: hp, max: hp, raidAdd: def.id };
      p.attack = { name: def.hitName || 'Grind', effect: 'damage', amount: Math.max(1, Math.round(defender(to).max * def.hit * r.scale)), interval: 1, due: e.cycle + 1, target: 'marked', at: whoOf(to) };
      v.parts.push(p);
    }
    emit(s, 'spawn', `${def.count || 1} ${def.name}${(def.count || 1) > 1 ? 's' : ''} come online and go for ${at(who.map(whoOf))}. Draw their fire or break them.`, { raid: true });
  } else if (def.kind === 'priority') {
    const hp = Math.max(1, Math.round(bossMax(s) * def.hp));
    const n = ++r.adds;
    const p = { ...makePart({ id: def.id + (n > 1 ? n : ''), name: def.name, integrity: 1 }, 'fragment', 1), integrity: hp, max: hp, raidAdd: def.id, raidWard: def.ward || 0, raidFuse: { at: e.cycle + def.fuse, every: def.fuse, size: def.size } };
    v.parts.push(p);
    emit(s, 'spawn', `${def.name.toUpperCase()} comes online. The boss takes ${Math.round((def.ward || 0) * 100)}% less damage while it lives, and it goes off on everyone in ${def.fuse} cycles unless you break it.`, { raid: true });
  } else if (def.kind === 'shield') {
    const amount = Math.max(1, Math.round(bossMax(s) * def.amount));
    r.shield = { name: def.name, amount, max: amount, until: e.cycle + def.window, size: def.size };
    emit(s, 'phase', `${label(def)} puts a ${amount} shield over the boss. Break it in ${def.window} cycles or it goes off on everyone.`, { raid: true });
  }
}
const bossMax = (s) => s.encounter.virus.parts.filter((p) => !p.raidAdd).reduce((n, p) => n + p.max, 0);

// A new cycle (after the old one closed): a phase change, then announcements.
export function raidCycle(s) {
  const r = raidOf(s);
  if (!r || !active(s)) return;
  const i = phaseOf(s);
  if (i > r.phase) enterPhase(s, i);
  announce(s);
}
const active = (s) => s.encounter?.phase === 'active';

// ---------- what players do to it ----------
// Damage dealt (aggro) and heals cast (the healer rule), by player and cycle.
export function noteDealt(s, n) {
  const r = raidOf(s);
  if (!r || !(n > 0)) return;
  const log = (r.dealt[whoOf(s)] ||= {}), c = s.encounter.cycle;
  log[c] = (log[c] || 0) + n;
}
export function noteHeal(s) {
  const r = raidOf(s);
  if (!r) return;
  const log = (r.healed[whoOf(s)] ||= {}), c = s.encounter.cycle;
  log[c] = (log[c] || 0) + 1;
}
// A hit on the boss: a firewall phase's shield takes it first (whole: combat.mjs sends every hit there while
// it's up, armor or not); a priority add's ward cuts it. Returns what gets through.
export function raidShield(s, p, dealt, whole = false) {
  const r = raidOf(s);
  if (!r || p.raidAdd || dealt <= 0) return dealt;
  const ward = !whole && s.encounter.virus.parts.find((x) => alive(x) && x.raidWard);
  if (ward) dealt = Math.max(0, Math.round(dealt * (1 - ward.raidWard)));
  if (r.shield) {
    const soak = Math.min(r.shield.amount, dealt);
    r.shield.amount -= soak;
    dealt -= soak;
    if (soak) emit(s, 'armor', `${r.shield.name} absorbs ${soak}${r.shield.amount ? ` (${r.shield.amount} left)` : ''}.`, { target: p.id, raid: true });
    if (!r.shield.amount) { emit(s, 'broken', `${label(r.shield)} BROKEN.`, { raid: true }); r.shield = null; }
  }
  return dealt;
}
// The boss's own parts all broken: its adds go down with it.
export function raidBroke(s) {
  const v = s.encounter.virus;
  if (!v.raid || v.parts.some((p) => alive(p) && !p.raidAdd)) return;
  for (const p of v.parts) if (p.raidAdd) p.integrity = 0;
}
// Damage taken: Thermal Stress stacks.
export const raidTaken = (s) => 1 + RAID.stress * (raidOf(s) ? fxOf(s, whoOf(s)).stress : 0);
// Heals on a player eat into encrypted sectors first. Returns what's left of the heal.
export function raidAbsorb(s, amount) {
  const r = raidOf(s);
  if (!r || amount <= 0) return amount;
  const fx = r.fx[whoOf(s)];
  if (!fx?.absorb) return amount;
  const eat = Math.min(fx.absorb, amount);
  fx.absorb -= eat;
  emit(s, 'blocked', `The encrypted sectors eat ${eat} of the heal${fx.absorb ? `, and ${fx.absorb} are left` : ', and they are clear'}.`, { raid: true });
  return amount - eat;
}
// Cleansing: Purge (on yourself) clears damage over time and Thermal Stress; Patch (on anyone) damage over
// time; Scrub (on anyone) damage over time and encrypted sectors.
export function cleanse(s, what = ['dots', 'stress']) {
  const r = raidOf(s);
  const fx = r?.fx[whoOf(s)];
  if (!fx) return false;
  const gone = [];
  if (what.includes('dots') && fx.dots.length) { gone.push(at(fx.dots.map((d) => d.name))); fx.dots = []; }
  if (what.includes('stress') && fx.stress) { gone.push('Thermal Stress'); fx.stress = 0; }
  if (what.includes('absorb') && fx.absorb) { gone.push('the encrypted sectors'); fx.absorb = 0; }
  if (gone.length) emit(s, 'decrypted', `${at(gone)} cleared from ${whoOf(s)}.`, { raid: true });
  return gone.length > 0;
}

// ---------- SIGINT: everyone's interrupt ----------
// The cast compiling now that SIGINT would stop (the one landing soonest), and whether any cast is up at all.
export function castNow(s) {
  const r = raidOf(s);
  if (!r) return null;
  const up = Object.entries(r.mechs).map(([id, m]) => ({ id, m, def: mechDef(s, id) })).filter((x) => x.def.cast && x.m.told).sort((a, b) => a.m.next - b.m.next);
  return { any: up[0] || null, stoppable: up.find((x) => x.def.interrupt) || null };
}
export function sigintCheck(s) {
  const c = castNow(s);
  if (!c?.any) return 'Nothing is compiling. SIGINT only stops a boss cast.';
  if (!c.stoppable) return `${c.any.def.name} can't be interrupted.`;
  return null;
}
export function sigint(s) {
  const e = s.encounter, c = castNow(s)?.stoppable;
  if (!c) return;
  c.m.next = c.m.next + c.def.every - RAID.interrupt.sooner;
  c.m.told = false; c.m.who = null;
  c.m.interrupted = (c.m.interrupted || 0) + 1;
  e.metrics.interrupts++;
  emit(s, 'interrupt', `SIGINT stops ${label(c.def)}. The boss casts the next one a cycle sooner, in ${c.m.next - e.cycle}.`, { raid: true, mech: c.id });
}

// ---------- the board ----------
// What's coming, as chips for the board's Boss row: { id, name, kind, col, aim, cast, interrupt, amount }.
// col 0 lands at the end of this cycle. A firewall phase's shield and a priority add's fuse show too.
export function raidIntents(s, columns = 4) {
  const r = raidOf(s), e = s.encounter;
  if (!r || !active(s)) return [];
  const out = [];
  const me = s;
  for (const [id, m] of Object.entries(r.mechs)) {
    const def = mechDef(s, id), col = m.next - e.cycle;
    if (!m.told || col < 0 || col >= columns) continue;
    const st = def.target === 'marked' ? null : victims(s, m, def)[0];
    out.push({ id, name: def.name, kind: def.kind, col, aim: aimOf(s, def, m), cast: !!def.cast, interrupt: !!def.interrupt, who: m.who || null,
      amount: ['buster', 'pulse', 'burst', 'dot', 'absorb'].includes(def.kind) ? amountOf(s, def, m, st || me) : 0 });
  }
  if (r.shield) { const col = r.shield.until - e.cycle; if (col < columns) out.push({ id: 'shield', name: r.shield.name, kind: 'shield', col, aim: 'everyone', amount: r.shield.amount, left: true }); }
  for (const p of e.virus.parts.filter((x) => alive(x) && x.raidFuse)) { const col = p.raidFuse.at - e.cycle; if (col < columns) out.push({ id: p.id, name: p.name, kind: 'priority', col, aim: 'everyone', amount: p.integrity, left: true }); }
  return out.sort((a, b) => a.col - b.col);
}
// What's on a player (the crew strip and your status): Thermal Stress, damage over time, encrypted sectors, marks.
export function raidMarks(s, st) {
  const r = raidOf(s);
  if (!r) return [];
  const who = whoOf(st), fx = r.fx[who] || { stress: 0, dots: [], absorb: 0 }, out = [];
  const them = who === 'you' ? 'you' : who;
  if (fx.stress) out.push({ name: `Stress ×${fx.stress}`, kind: 'hot', tip: `${who === 'you' ? 'You carry' : `${who} carries`} ${fx.stress} ${fx.stress === 1 ? 'stack' : 'stacks'} of Thermal Stress and ${who === 'you' ? 'take' : 'takes'} ${Math.round(fx.stress * RAID.stress * 100)}% more damage. Purge clears it.` });
  for (const d of fx.dots) out.push({ name: d.name, kind: 'hot', tip: `${d.name} burns ${them} for ${d.amount} every cycle ${d.left >= 20 ? 'until it is cleansed' : `for ${d.left} more ${d.left === 1 ? 'cycle' : 'cycles'}`}.${d.spread ? ` It spreads to someone else in ${Math.max(0, d.spreadAt - s.encounter.cycle)}.` : ''} Patch, Scrub or Purge cleanses it.` });
  if (fx.absorb) out.push({ name: `Sectors ${fx.absorb}`, kind: 'hot', tip: `Encrypted sectors eat the next ${fx.absorb} healing on ${them}. Scrub clears them.` });
  for (const [id, m] of Object.entries(r.mechs)) if (m.told && (m.who || []).includes(who)) out.push({ name: `Marked: ${mechDef(s, id).name}`, kind: 'hot', tip: `${mechDef(s, id).name} lands on ${who === 'you' ? 'you' : who} in ${m.next - s.encounter.cycle}.` });
  if (aggroOf(s) === st && playersOf(s).length > 1) out.push({ name: 'Aggro', kind: 'you', tip: `The boss is aiming at ${them}, so its busters land on ${who === 'you' ? 'you' : 'them'}.` });
  return out;
}

// ---------- the bots (planner.mjs, bastion.mjs) ----------
// The cycle a bot's command runs in. A crewmate decides during the cycle before, but crew.mjs moves its cycle
// on while it does, so this is always the encounter's cycle.
const planFor = (s) => s.encounter.cycle;
const ok = (s, text) => !!text && !toIntent(s, text).error;
const first = (s, list) => list.find((c) => ok(s, c)) || null;
// Mechanics landing at the end of the cycle this command runs in (lag 0) or the one after (lag 1).
export function landing(s, lag = 0) {
  const r = raidOf(s);
  if (!r) return [];
  const c = planFor(s) + lag;
  return Object.entries(r.mechs).filter(([, m]) => m.told && m.next === c).map(([id, m]) => ({ id, m, def: mechDef(s, id) }));
}
const ROLE = { operator: 0, infiltrator: 1, breaker: 2, bastion: 3 };
// Who interrupts: a crewmate with SIGINT ready (support first, then damage, then the tank and healer, by
// name), so bots never count on the player; the player only when no crewmate can (the sims' planner).
export function interrupter(s) {
  if (!RAID.bots.interrupt) return null;
  const c = planFor(s), host = hostOf(s);
  const ready = playersOf(s).filter((st) => hackerLevel(st) >= RAID.interrupt.from && Math.max(0, (st.encounter.readyAt.sigint || 0) - c) === 0);
  return ready.sort((a, b) => (a === host) - (b === host) || (ROLE[classOf(a)] ?? 9) - (ROLE[classOf(b)] ?? 9) || whoOf(a).localeCompare(whoOf(b)))[0] || null;
}
// The crew's tank: a Warden; before subclasses (or with no Warden), a Bastion that isn't a Sysop.
export function tankOf(s) {
  const all = playersOf(s);
  return all.find((st) => subOf(st) === 'warden') || all.find((st) => classOf(st) === 'bastion' && subOf(st) !== 'sysop') || null;
}
export const noTaunt = (s) => !!raidOf(s) && playersOf(s).length > 1 && tankOf(s) !== s;
// Everyone's raid move, before their own play: interrupt, cleanse yourself, dodge a mark.
export function raidMove(s) {
  const r = raidOf(s);
  if (!r) return null;
  const now = landing(s, 0), soon = [...now, ...landing(s, 1)];
  const cast = soon.find((x) => x.def.cast && x.def.interrupt);
  if (cast && interrupter(s) === s && ok(s, 'sigint')) return 'sigint';
  const fx = fxOf(s, whoOf(s));
  if (fx.dots.length && classOf(s) === 'bastion') { const c = first(s, [`scrub`, ...partsFor(s).map((p) => 'purge ' + p.id)]); if (c) return c; }
  // Marked for a burst: a dodge, if you have one.
  if (now.some((x) => x.def.kind === 'burst' && (x.m.who || []).includes(whoOf(s)))) { const c = first(s, ['null-route', 'shadow-copy', 'harden']); if (c) return c; }
  return null;
}
const partsFor = (s) => s.encounter.virus.parts.filter(alive).sort((a, b) => (a.raidAdd ? 0 : 1) - (b.raidAdd ? 0 : 1));
// What damage should be on: a priority add, then workers going at someone, else the boss.
export function raidFocus(s) {
  if (!raidOf(s)) return null;
  const live = s.encounter.virus.parts.filter(alive);
  return live.find((p) => p.raidWard !== undefined && p.raidFuse) || live.filter((p) => p.raidAdd).sort((a, b) => a.integrity - b.integrity)[0] || null;
}
// The tank (a Warden; at levels before subclasses, a Bastion): hold aggro for every buster and while
// workers are up, mitigate the buster, and Purge Thermal Stress between busters.
export function tankMove(s) {
  const r = raidOf(s);
  if (!r || !RAID.bots.tank) return null;
  const e = s.encounter, c = planFor(s);
  const holds = e.buffs?.sinkhole >= c;
  const buster = landing(s, 0).find((x) => x.def.kind === 'buster' || x.def.target === 'aggro');
  const next = landing(s, 1).find((x) => x.def.kind === 'buster' || x.def.target === 'aggro');
  const adds = e.virus.parts.some((p) => alive(p) && p.raidAdd && p.attack);
  if (buster) {
    if (!holds) { const t = first(s, ['bulkhead', 'firewall']); if (t) return t; }
    const m = first(s, [!e.chits && 'harden', !(e.buffs?.bulkhead >= c) && 'bulkhead', 'dmz', !e.shield && 'firewall']);
    if (m) return m;
  }
  if (!holds && (next || adds)) { const t = first(s, ['firewall', next && 'bulkhead']); if (t) return t; }
  if (fxOf(s, whoOf(s)).stress >= 1 && !buster && !next) { const p = first(s, partsFor(s).map((x) => 'purge ' + x.id)); if (p) return p; }
  return null;
}
// A healer saves Patch (it cleanses) when Corruption is about to land and Patch would still be cooling;
// a tank saves Bulkhead for the buster that's coming.
export function savePatch(s) {
  const r = raidOf(s);
  if (!r) return false;
  const c = planFor(s);
  return Object.entries(r.mechs).some(([id, m]) => m.told && mechDef(s, id).kind === 'dot' && m.next - c < 4);
}
export function saveBulkhead(s) {
  const r = raidOf(s);
  if (!r) return false;
  const c = planFor(s);
  return Object.entries(r.mechs).some(([id, m]) => mechDef(s, id).kind === 'buster' && m.next > c && m.next - c < 6);
}
// The healer (a Sysop): cleanse, pre-heal whoever a big hit is about to land on, heal out encrypted sectors.
// While a firewall phase's shield is up, everyone hits it unless someone is in trouble.
export function healMove(s) {
  const r = raidOf(s);
  if (!r) return null;
  const shieldUp = !!r.shield && playersOf(s).every((st) => fracOf(st) >= 0.45);
  const aim = (st, id) => (st === s ? id : `${id} ${whoOf(st)}`);
  const all = playersOf(s);
  // Corruption on someone: Scrub or Patch it (the worst first).
  const dirty = all.filter((st) => fxOf(s, whoOf(st)).dots.length).sort((a, b) => fracOf(a) - fracOf(b));
  for (const st of dirty) { const c = first(s, [aim(st, 'scrub'), aim(st, 'patch'), st === s && partsFor(s)[0] && 'purge ' + partsFor(s)[0].id]); if (c) return c; }
  // A big single hit about to land: top its target up first.
  for (const x of [...landing(s, 0), ...landing(s, 1)].filter((x) => ['buster', 'burst'].includes(x.def.kind))) {
    for (const st of victims(s, x.m, x.def)) {
      const f = fracOf(st), size = x.def.size * r.scale;
      if (f < size + 0.35) { const c = first(s, [f < size + 0.05 && !st.encounter.standby && aim(st, 'hot-standby'), !savePatch(s) && aim(st, 'patch'), aim(st, 'heartbeat'), aim(st, 'rollback')]); if (c) return c; }
    }
  }
  // A pulse about to land and the crew low: heal everyone now.
  const pulse = landing(s, 0).find((x) => x.def.kind === 'pulse');
  if (pulse && all.filter((st) => fracOf(st) < 0.7).length >= 2) { const c = first(s, ['multicast', 'rebalance']); if (c) return c; }
  if (shieldUp) return null;
  // Against a crew boss there's always more coming: keep everyone topped up instead of hitting.
  if (all.filter((st) => fracOf(st) < 0.9).length >= 2) { const c = first(s, ['multicast']); if (c) return c; }
  const low = all.sort((a, b) => fracOf(a) - fracOf(b))[0];
  if (low && fracOf(low) < 0.9) {
    const hb = low.encounter.hots?.some((h) => h.id === 'heartbeat' && h.left > 0);
    const c = first(s, [!hb && aim(low, 'heartbeat'), !savePatch(s) && aim(low, 'patch')]);
    if (c) return c;
  }
  return null;
}

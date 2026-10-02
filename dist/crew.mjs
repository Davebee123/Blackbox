// Simulated crew: bot crewmates in your run fights, to try co-op before there's a server.
// `crew sim breaker bastion` (up to 3), `crew` to list, `crew off`. Each crewmate is a full player
// state of its own (class at your level, a Tuned protocol in every slot, its own Signal), fighting
// the same virus object as you on the same cycle, played by the balance planner (planner.mjs).
//
// Rules being tried out:
// - Everyone acts first each cycle (you, then the crew), then the virus.
// - A damage attack lands on everyone in the fight, each taking it in full (as if they fought it
//   alone). Encryption, blinds and fragments stay on you.
// - Enemies get CREW.hpPer more Integrity per extra player (CREW.dmgPer more damage, if set).
// - A crewmate at 0 Signal is down for the rest of the fight. You going down still ends it.
// - Only run fights (SPRAWL-00, rogue servers, guards); home intrusions stay solo.
// Crewmates live beside the save (not in it): s.crewSim holds who's in the crew.
import { hooks, fresh, command, playerPhase, active, addItem, maxSignal, hackerLevel, classOf, emit, warn, livingParts, alive, part } from './combat.mjs';
import { rollItem, seeded, protocolSlots, SLOT_KINDS } from './gear.mjs';
import { ARCHETYPES } from './data.mjs';
import { planner } from './planner.mjs';

export const CREW = {
  max: 3, // crewmates besides you
  hpPer: 1.5, // enemy Integrity: +150% per extra player
  dmgPer: 0, // enemy damage per extra player (0: each player takes each hit at its solo size)
  names: ['nyx', 'kilo', 'vanta', 'sable', 'moth', 'quill'],
};

// The crewmates' states, rebuilt from s.crewSim when needed. Kept off the save (not enumerable).
export function matesOf(s) {
  const want = s.crewSim || [];
  let m = s._mates;
  const key = want.map((x) => x.cls + ':' + x.name).join(',') + '@' + hackerLevel(s);
  if (!m || m.key !== key) {
    m = want.map((x, i) => makeMate(s, x, i));
    m.key = key;
    Object.defineProperty(s, '_mates', { value: m, enumerable: false, writable: true, configurable: true });
  }
  return m;
}
const inFight = (s) => matesOf(s).filter((m) => m.encounter && active(m));
export const mateUp = (m) => m.encounter && active(m) && m.run.integrity > 0;

function makeMate(host, { cls, name }, i) {
  const m = fresh();
  m.who = name;
  m.loadout.archetype = cls;
  const level = hackerLevel(host);
  m.hackers = { [cls]: { level, xp: 0 } };
  m.rng = ((host.rng || 1) * 31 + i * 7919) >>> 0;
  for (let k = 0; k < protocolSlots(level); k++) {
    const it = addItem(m, rollItem(seeded(level * 100 + k + i * 17), { level, rarity: 'tuned', group: SLOT_KINDS[k] }));
    command(m, 'load ' + it.id);
  }
  // One log and one event counter for the whole fight, so the log reads in order.
  m.logs = host.logs;
  Object.defineProperty(m, 'serial', { get: () => host.serial, set: (v) => { host.serial = v; }, enumerable: false, configurable: true });
  m.run = { loc: 'crew', cwd: '/', integrity: maxSignal(m), max: maxSignal(m), pack: [], visited: [] };
  return m;
}

// Next cycle's command for a crewmate: what the planner would do (it shows in their row).
function decide(m) {
  if (!mateUp(m) || !livingParts(m).length) return;
  const text = planner(m) || 'hold';
  m.encounter.plan = [];
  command(m, text);
}

hooks.crewEngage = (s) => {
  const e = s.encounter;
  if (e.mode !== 'run' || !(s.crewSim || []).length) return;
  const mates = matesOf(s);
  // A bigger party: tougher parts.
  const k = 1 + CREW.hpPer * mates.length;
  const kd = 1 + CREW.dmgPer * mates.length;
  for (const p of e.virus.parts) {
    p.max = Math.round(p.max * k); p.integrity = Math.round(p.integrity * k);
    if (p.attack && ['damage', 'encrypt'].includes(p.attack.effect)) p.attack.amount = Math.max(1, Math.round(p.attack.amount * kd));
  }
  for (const m of mates) {
    m.run.integrity = m.run.max = maxSignal(m); // crewmates rest up between fights
    m.encounter = { ...e, virus: e.virus, queue: null, plan: [], lastAttack: null, readyAt: {}, buffs: {}, burns: [], helpers: [], shield: 0, encrypt: 0, blindUntil: 0, echoes: [], once: {}, momentum: null, synced: false, keylog: 0, regenAcc: 0, leechAcc: 0, clock: 0, trace: 0, pendingTrace: 0, breaks: 0, undo: null,
      chits: classOf(m) === 'bastion' ? 1 : 0, metrics: structuredClone(e.metrics), down: false };
    decide(m);
  }
  emit(s, 'status', `Crew in: ${mates.map((m) => `${m.who} (${ARCHETYPES[classOf(m)].name})`).join(', ')}. The virus is ${Math.round((k - 1) * 100)}% tougher.`);
};

// One crewmate's turn (the i-th still standing).
function turn(s, m) {
  if (!m || !mateUp(m) || !livingParts(m).length) return;
  m.encounter.cycle = s.encounter.cycle;
  const q = m.encounter.queue;
  if (q?.target && !alive(part(m, q.target))) decide(m); // its target broke this cycle: pick again
  playerPhase(m);
  decide(m);
}
const standing = (s) => inFight(s).filter(mateUp);
hooks.crewAct = (s) => { for (const m of standing(s)) turn(s, m); };
hooks.crewTurns = (s) => standing(s).length;
hooks.crewActOne = (s, i) => turn(s, standing(s)[i]);

// Everyone still standing in the fight besides you: a damage attack lands on each of them too.
hooks.crewAll = (s) => inFight(s).filter(mateUp).map((m) => { m.encounter.cycle = s.encounter.cycle; return m; });

// After an attack on a crewmate: at 0 Signal they're down for the rest of the fight.
export function checkDown(s) {
  for (const m of inFight(s)) if (m.run.integrity <= 0 && !m.encounter.down) { m.encounter.down = true; m.run.integrity = 0; emit(m, 'status', `${m.who} is down.`); }
}
hooks.crewHurt = checkDown;

hooks.crewEnd = (s) => {
  for (const m of matesOf(s)) m.encounter = null;
};

// `crew`, `crew sim <class> [<class>…]`, `crew off`.
export function crewCommand(s, rest) {
  const first = s.serial;
  const words = rest.split(' ').filter(Boolean);
  if (!words.length) {
    const c = s.crewSim || [];
    emit(s, 'info', c.length ? `Crew (simulated): ${c.map((x) => `${x.name}, ${ARCHETYPES[x.cls].name}`).join(' · ')}. They fight beside you in run fights.` : 'No crew. Try: crew sim bastion infiltrator');
  } else if (words[0] === 'off') {
    s.crewSim = [];
    emit(s, 'info', 'Crew off. You fight alone.');
  } else if (words[0] === 'sim') {
    if (active(s)) return warn(s, 'Finish the fight first.'), s.logs.filter((e) => e.id > first);
    const picks = words.slice(1);
    const classes = Object.keys(ARCHETYPES);
    const want = (picks.length ? picks : classes.filter((c) => c !== classOf(s))).slice(0, CREW.max);
    const bad = want.find((c) => !ARCHETYPES[c]);
    if (bad) warn(s, `No class called ${bad}. Classes: ${classes.join(', ')}.`);
    else {
      s.crewSim = want.map((cls, i) => ({ cls, name: CREW.names[i] }));
      emit(s, 'info', `Crew (simulated): ${s.crewSim.map((x) => `${x.name}, ${ARCHETYPES[x.cls].name}`).join(' · ')}. They join your run fights.`);
    }
  } else warn(s, 'crew, crew sim <class> [<class>…], crew off');
  return s.logs.filter((e) => e.id > first);
}

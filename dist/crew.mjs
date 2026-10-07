// Simulated crew: bot crewmates in your run fights, to try co-op before there's a server.
// `crew sim breaker bastion` (up to 3), `crew` to list, `crew off`. Each crewmate is a full player
// state of its own (its class at its own level, fixed when it joins, a Stock protocol in every slot unless its entry gives a rarity, its own Signal), fighting
// the same virus object as you on the same cycle, played by the balance planner (planner.mjs).
//
// Rules being tried out:
// - Everyone acts first each cycle (you, then the crew), then the virus.
// - A damage attack lands on everyone in the fight, each taking it in full (as if they fought it
//   alone). Encryption, scrambles and fragments stay on you.
// - Enemies get CREW.hpPer more Integrity per extra player (CREW.dmgPer more damage, if set).
// - A crewmate at 0 Signal is down for the rest of the fight. You going down still ends it.
// - Only run fights (SPRAWL-00, rogue servers, guards); home intrusions stay solo.
// - A crewmate's Signal carries from fight to fight through a run, like yours (s.run.crew[name].signal).
//   One that went down reboots at CREW.reboot of its Signal for the next fight. A new run starts them full.
// - The sim crew is there from CREW.from: early levels are solo.
// Crewmates live beside the save (not in it): s.crewSim holds who's in the crew.
import { hooks, fresh, command, playerPhase, active, addItem, maxSignal, hackerLevel, classOf, emit, warn, livingParts, alive, part, classEach } from './combat.mjs';
import { rollItem, seeded, protocolSlots, SLOT_KINDS, chaseStat } from './gear.mjs';
import { ARCHETYPES, SKILLS, SUBS, SUBCLASS, defaultSub } from './data.mjs';
import { planner } from './planner.mjs';
import { online, isFriend } from './presence.mjs';
import { isMember } from './consortium.mjs';

export const CREW = {
  max: 3, // crewmates besides you
  hpPer: 0.5, // enemy Integrity: +50% per extra player: a party makes normal fights easy (MMO-style), but long enough for their mechanics to show
  bossPer: 0.8, // a boss grows more with the party than an ordinary fight (a crew of four made RELAY-KING trivial at +50%)
  elitePer: 0.05, // elites are built for a crew of four: they barely grow with it (0.15 made a full crew lose 8 in 20 at level 18)
  dmgPer: 0, // enemy damage per extra player (0: each player takes each hit at its solo size)
  from: 5, // class level for crew sim
  reboot: 0.25, // a crewmate that went down comes back at this much Signal for the next fight
  names: ['nyx', 'kilo', 'vanta', 'sable', 'moth', 'quill'],
};

// The crewmates' states, rebuilt from s.crewSim when needed. Kept off the save (not enumerable).
export function matesOf(s) {
  // A crewmate's level is its own, fixed when it joined (an old save's crew keeps the level it has now).
  for (const x of s.crewSim || []) x.level ??= hackerLevel(s);
  const want = [...(s.crewSim || []), ...(s.guests || [])]; // guests: consortium members who joined a fight on the consortium's ground
  let m = s._mates;
  const key = want.map((x) => `${x.cls}:${x.sub || ''}:${x.name}:${x.level ?? hackerLevel(s)}:${x.rarity || ''}`).join(',');
  if (!m || m.key !== key) {
    m = want.map((x, i) => makeMate(s, x, i));
    m.key = key;
    Object.defineProperty(s, '_mates', { value: m, enumerable: false, writable: true, configurable: true });
  }
  return m;
}
const inFight = (s) => matesOf(s).filter((m) => m.encounter && active(m));
// A crewmate's Signal between fights: what it carried out of the last one on this run, else full.
export const mateSignal = (s, m) => {
  const c = !m.guest && s.run?.crew?.[m.who];
  return c && c.signal != null ? (c.signal > 0 ? Math.min(c.signal, maxSignal(m)) : Math.max(1, Math.round(maxSignal(m) * CREW.reboot))) : maxSignal(m);
};
export const mateUp = (m) => m.encounter && active(m) && m.run.integrity > 0;

function makeMate(host, { cls, sub, name, guest, level: own, rarity = 'stock' }, i) {
  const m = fresh();
  if (guest) m.guest = true;
  m.who = name;
  Object.defineProperty(m, 'host', { value: host, enumerable: false, configurable: true });
  m.loadout.archetype = cls;
  if (sub) m.loadout.sub = { [cls]: sub }; // a subclass, from level 10 (else its class's default)
  const level = own ?? hackerLevel(host);
  m.hackers = { [cls]: { level, xp: 0 } };
  m.rng = ((host.rng || 1) * 31 + i * 7919) >>> 0;
  // Its gear: a protocol of its rarity (Stock unless the crew entry says) in every slot, each carrying a
  // stat its subclass chases (SUBS[sub].chase) when the rarity has affixes.
  const chase = SUBS[sub || (level >= SUBCLASS.from ? defaultSub(cls) : null)]?.chase;
  for (let k = 0; k < protocolSlots(level); k++) {
    const it = addItem(m, rollItem(seeded(level * 100 + k + i * 17), { level, rarity, group: SLOT_KINDS[k], stat: chaseStat(chase, k, rarity) }));
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

// Where a crewmate is on this run (run.mjs keeps s.run.crew); with no positions, they're with you.
export const crewAt = (s, name) => s.run?.crew?.[name]?.cwd ?? s.run?.cwd ?? null;
hooks.crewEngage = (s) => {
  const e = s.encounter;
  if (e.mode !== 'run') return;
  // Consortium members in this folder of its ground join as guests (run.mjs: hooks.crewGuests).
  const guests = (hooks.crewGuests?.(s, e.room) || []).filter((g) => !(s.crewSim || []).some((x) => x.name === g.name));
  s.guests = guests.slice(0, Math.max(0, CREW.max - (s.crewSim || []).length)).map((g) => ({ ...g, guest: true }));
  // Only the crew in the fight's folder fights it; the rest are elsewhere on the server.
  const all = matesOf(s);
  for (const m of all) m.encounter = null;
  const mates = all.filter((m) => m.guest || !s.run?.crew || crewAt(s, m.who) === e.room);
  if (!mates.length) return;
  // A bigger party: tougher parts.
  e.party = 1 + mates.length; // for the XP split (combat.mjs payKill)
  e.guests = mates.filter((m) => m.guest).map((m) => m.who); // drop-ins earn by their damage (payKill)
  // An elite is already sized for a crew, so it doesn't grow with it.
  const k = 1 + (e.virus.elite ? CREW.elitePer : e.virus.boss ? CREW.bossPer : CREW.hpPer) * mates.length;
  const kd = 1 + CREW.dmgPer * mates.length;
  for (const p of e.virus.parts) {
    p.max = Math.round(p.max * k); p.integrity = Math.round(p.integrity * k);
    if (p.attack && ['damage', 'encrypt'].includes(p.attack.effect)) p.attack.amount = Math.max(1, Math.round(p.attack.amount * kd));
  }
  for (const m of mates) {
    // Signal carries between fights on a run; guests (consortium drop-ins) come in rested.
    m.run.max = maxSignal(m);
    m.run.integrity = mateSignal(s, m);
    m.encounter = { ...e, virus: e.virus, queue: null, plan: [], lastAttack: null, readyAt: {}, buffs: {}, burns: [], helpers: [], shield: 0, encrypt: 0, scrambleUntil: 0, echoes: [], once: {}, momentum: null, synced: false, keylog: 0, regenAcc: 0, leechAcc: 0, clock: 0, trace: 0, pendingTrace: 0, breaks: 0, undo: null,
      chits: 0, hardened: classOf(m) === 'bastion' ? SKILLS.hardened : 0, metrics: structuredClone(e.metrics), down: false };
    classEach('start', m); // subclass modules (dist/classes)
    decide(m);
  }
  emit(s, 'status', `${mates.some((m) => m.guest) ? 'Crew and consortium in' : 'Crew in'}: ${mates.map((m) => `${m.who} (${ARCHETYPES[classOf(m)].name}${m.guest ? ', consortium' : ''})`).join(', ')}. The virus is ${Math.round((k - 1) * 100)}% tougher.`);
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
hooks.crewActNamed = (s, who) => turn(s, standing(s).find((m) => m.who === who));
hooks.crewStanding = (s) => standing(s); // for the turn order (combat.mjs turnOrder)
hooks.crewMates = (s) => matesOf(s).filter((m) => !m.guest); // your own crew (rogue.mjs: the farm's regroup)
// Everyone else standing in the fight, by name, as one player sees them: 'you' is the player.
// Patch takes one of these names (combat.mjs allyOf).
hooks.crewAllies = (s) => {
  const host = s.host || s;
  return [{ who: 'you', st: host }, ...standing(host).map((m) => ({ who: m.who, st: m }))].filter((x) => x.st !== s);
};

// Everyone still standing in the fight besides you: a damage attack lands on each of them too.
hooks.crewAll = (s) => inFight(s).filter(mateUp).map((m) => { m.encounter.cycle = s.encounter.cycle; return m; });

// After an attack on a crewmate: at 0 Signal they're down for the rest of the fight.
export function checkDown(s) {
  for (const m of inFight(s)) if (m.run.integrity <= 0 && !m.encounter.down) { m.encounter.down = true; m.run.integrity = 0; emit(m, 'status', `${m.who} is down.`); }
}
hooks.crewHurt = checkDown;

hooks.crewEnd = (s) => {
  for (const m of matesOf(s)) {
    const c = !m.guest && m.encounter && s.run?.crew?.[m.who];
    if (c) c.signal = Math.max(0, m.run.integrity);
    m.encounter = null;
  }
  s.guests = []; // guests go back to what they were doing
};

// `crew`, `crew sim <class> [<class>…]`, `crew invite <friend>`, `crew kick <name>`, `crew off`.
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
    if (hackerLevel(s) < CREW.from) return warn(s, `The sim crew comes at level ${CREW.from}. Until then you run alone.`), s.logs.filter((e) => e.id > first);
    const picks = words.slice(1);
    const classes = Object.keys(ARCHETYPES);
    const want = (picks.length ? picks : classes.filter((c) => c !== classOf(s))).slice(0, CREW.max);
    const bad = want.find((c) => !ARCHETYPES[c] && !SUBS[c]);
    if (bad) warn(s, `No class or subclass called ${bad}. Classes: ${classes.join(', ')}. Subclasses: ${Object.keys(SUBS).join(', ')}.`);
    else {
      // A class, or a subclass (crew sim sysop): at your level now; switching class later doesn't move theirs.
      s.crewSim = want.map((c, i) => ({ cls: SUBS[c]?.cls || c, ...(SUBS[c] ? { sub: c } : {}), name: CREW.names[i], level: hackerLevel(s) }));
      emit(s, 'info', `Crew (simulated): ${s.crewSim.map((x) => `${x.name}, ${x.sub ? SUBS[x.sub].name : ARCHETYPES[x.cls].name}`).join(' · ')}. They join your run fights.`);
    }
  } else if (words[0] === 'invite' && words[1]) {
    // A friend who's online joins as a crewmate (still a bot until there's a server), in their class.
    const h = words[1], who = online(s).find((x) => x.handle === h);
    if (active(s)) warn(s, 'Finish the fight first.');
    else if (!isFriend(s, h) && !isMember(s, h)) warn(s, `${h} isn't a friend or in your consortium.`);
    else if (!who) warn(s, `${h} isn't online.`);
    else if ((s.crewSim || []).some((x) => x.name === h)) warn(s, `${h} is already in your crew.`);
    else if ((s.crewSim || []).length >= CREW.max) warn(s, `Your crew is full (${CREW.max}). crew kick <name> first.`);
    else { (s.crewSim ||= []).push({ cls: who.cls, name: h, level: who.level }); if (s.run) (s.run.crew ||= {})[h] = { cwd: s.run.cwd, link: 'you' }; emit(s, 'info', `${h} (${ARCHETYPES[who.cls].name}) joins your crew.`); }
  } else if (words[0] === 'kick' && words[1]) {
    if (active(s)) warn(s, 'Finish the fight first.');
    else if (!(s.crewSim || []).some((x) => x.name === words[1])) warn(s, `${words[1]} isn't in your crew.`);
    else {
      s.crewSim = s.crewSim.filter((x) => x.name !== words[1]);
      if (s.run?.crew) delete s.run.crew[words[1]]; // off the run too
      if (s.run?.linkedTo === words[1]) s.run.linkedTo = null;
      emit(s, 'info', `${words[1]} leaves your crew.`);
    }
  } else warn(s, 'crew, crew sim <class> [<class>…], crew invite <friend>, crew kick <name>, crew off');
  return s.logs.filter((e) => e.id > first);
}

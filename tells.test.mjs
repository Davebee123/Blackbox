// Solo tells (tells.mjs) and the parts that change the fight (data.mjs FAMILIES, pool 'third'): each tell is
// announced before it lands, each answer works, each part does what it says; Flood and Crack's new cooldowns.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, active, intents, livingParts, keyMap, readyIn } from './dist/combat.mjs';
import { CONFIG, TELL, TELLS, TELL_SETS, ABILITIES, FAMILIES, createVirus } from './dist/data.mjs';
import { tellsOf, tellIntents, tellLog } from './dist/tells.mjs';
import { boardMarkup, partAbout } from './dist/view.mjs';
import { planner } from './dist/planner.mjs';
import { raidOf } from './dist/raid.mjs';

CONFIG.enemyCrit = 0; // exact numbers: no enemy crits, no misses
CONFIG.misses = false;

// A hacker of every class at a level, in a home fight against a wild virus of a family.
function fight({ level = 12, family = 'ransomware', cls = 'breaker', seed = 7, key = 'random', opts = {} } = {}) {
  const s = fresh();
  s.hackers = Object.fromEntries(['breaker', 'bastion', 'infiltrator', 'operator'].map((c) => [c, { level, xp: 0 }]));
  if (cls !== 'breaker') command(s, 'archetype ' + cls);
  selectEncounter(s, key, seed, { level, mutation: null, ...(key === 'random' ? { family } : {}), ...opts });
  command(s, 'engage');
  s.server.max = s.server.integrity = 5000; // a server that outlasts any test fight
  s.encounter.hardened = 0; // and no Bastion Hardened trimming the first hit
  return s;
}
// Make one tell (by id) announced now, on a part, landing in n cycles; the rest stay quiet.
function tell(s, id, partId, n = 2) {
  const T = tellsOf(s);
  for (const t of T.list) { t.told = false; t.at = 999; }
  const t = T.list.find((x) => x.id === id);
  assert.ok(t, `${id} is one of this virus's tells (${T.list.map((x) => x.id).join(', ')})`);
  const p = part(s, partId);
  Object.assign(t, { part: partId, told: true, next: s.encounter.cycle + n, wound: 0, hitBy: [], at: 999, name: !t.idle || p.special || !t.other ? t.base : t.other,
    need: t.kind === 'charge' ? T.tier.hits : t.kind === 'cast' ? T.tier.castHits : 0 });
  return t;
}
const quietParts = (s) => { for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999; };
const hold = (s, n = 1) => { for (let i = 0; i < n && active(s); i++) { command(s, 'hold'); resolveCycle(s); } };
const fire = (s, text) => { const ev = command(s, text); assert.ok(!ev.some((e) => e.type === 'warning'), ev.at(-1)?.message); return resolveCycle(s); };
const hp = (s) => s.server.integrity;

test('Flood cools down in 6 cycles, Crack in 2 (the Breaker retune)', () => {
  assert.equal(ABILITIES.flood.cooldown, 6);
  assert.equal(ABILITIES.crack.cooldown, 2);
  const s = fight({ level: 8 });
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0 });
  fire(s, 'flood pulse');
  assert.equal(readyIn(s, 'flood'), 5, 'ready again 6 cycles after it fired');
});

test('tells scale with the level: one gentle tell to 5 (said 3 ahead), two from 10 with a cast, and none in SPRAWL-00\'s first fights or at a crew boss', () => {
  const at = (level, opts = {}) => tellsOf(fight({ level, ...opts }));
  const low = at(3);
  assert.equal(low.list.filter((t) => t.kind !== 'mimic').length, 1);
  assert.equal(low.tier.lead, 3, 'gentle: announced three cycles ahead');
  assert.equal(low.list[0].kind, 'charge');
  const mid = at(12);
  assert.deepEqual(mid.list.filter((t) => t.kind !== 'mimic').map((t) => t.kind), ['charge', 'cast']);
  assert.equal(mid.tier.lead, 2);
  assert.ok(!at(8).list.some((t) => t.kind === 'cast'), 'no casts before SIGINT (level 10)');
  const elite = at(18, { opts: { elite: true } });
  assert.equal(elite.list.filter((t) => t.kind !== 'mimic').length, 3, 'an elite brings one more');
  assert.equal(elite.tier.hits, 2, 'and its charges take two hits');
  // SPRAWL-00's first two kills (soft) bring none.
  const s = fresh(); s.hackers = { breaker: { level: 1, xp: 0 } };
  selectEncounter(s, 'random', 3, { mode: 'run', zone: true, room: '/tmp', level: 1 });
  s.run = { loc: 'sprawl', cwd: '/tmp', integrity: 100, max: 100, pack: [], visited: ['/'] };
  command(s, 'engage');
  assert.ok(s.encounter.soft < 1 && !tellsOf(s), 'a new player\'s first fights stay plain');
  assert.ok(!createVirus('random', 1, { boss: 'foreman', threat: 30 }).tells, 'crew bosses keep their own mechanics');
});

test('every tell is announced before it lands: a log line and a chip on its part\'s row, lead cycles ahead', () => {
  for (const family of ['ransomware', 'worm', 'ghostroot']) {
    const s = fight({ level: 18, family, seed: 11 });
    const said = {};
    for (let i = 0; i < 30 && active(s); i++) {
      for (const x of tellIntents(s)) said[`${x.id}@${s.encounter.cycle + x.col}`] = true;
      command(s, 'hold'); resolveCycle(s);
    }
    const log = s.logs.filter((e) => e.tell);
    const announced = log.filter((e) => e.type === 'telegraph');
    assert.ok(announced.length >= 2, family + ': tells were said');
    for (const e of announced) assert.ok(e.at - e.cycle >= 2, `${family}: ${e.message} is said at least two cycles ahead`);
    // Everything that landed (missed) was on the board the cycle it landed, and said before.
    for (const e of log.filter((x) => x.missed)) {
      assert.ok(said[`${e.tell}@${e.cycle}`], `${family}: ${e.message} was on the board`);
      assert.ok(announced.some((a) => a.tell === e.tell && a.cycle < e.cycle), `${family}: ${e.message} was announced first`);
    }
  }
});

test('a tell sits on the part you have left alone longest (its name goes with the part)', () => {
  const s = fight({ level: 12, seed: 7 });
  quietParts(s);
  const t = tellsOf(s).list.find((x) => x.kind === 'charge');
  for (const p of livingParts(s)) p.lastDamaged = 5;
  part(s, 'pulse').lastDamaged = 0; // nobody has touched it
  t.told = false; t.at = s.encounter.cycle; part(s, 'pulse').attack.due = s.encounter.cycle + 3;
  hold(s);
  assert.equal(t.part, 'pulse');
  assert.equal(t.name, 'Overcharge', 'off the signature part, a charge is an Overcharge');
});

test('a charge: its part\'s next attack, much bigger; one command that hits the part calls it off and knocks the attack back', () => {
  // Ignored: it lands bigger than the plain attack.
  const s = fight({ level: 12, cls: 'bastion' });
  quietParts(s);
  const pulse = part(s, 'pulse');
  pulse.attack.due = s.encounter.cycle + 2;
  const t = tell(s, 'fulldisk', 'pulse', 2);
  const charged = tellIntents(s).find((x) => x.id === t.id);
  assert.ok(charged.amount > pulse.attack.amount, 'the board shows the charged hit');
  assert.ok(!intents(s).some((x) => x.source === 'pulse' && !x.tell && x.col === 2), 'it takes the place of the plain attack in its column');
  const before = hp(s);
  hold(s, 3);
  assert.ok(before - hp(s) >= charged.amount * 0.9, 'it landed at the charged size');
  // Answered: a Spike on its ◆ counts as a hit.
  const s2 = fight({ level: 12, cls: 'bastion' });
  quietParts(s2);
  const p2 = part(s2, 'pulse');
  p2.attack.due = s2.encounter.cycle + 2;
  const t2 = tell(s2, 'fulldisk', 'pulse', 2);
  assert.ok(p2.armor > 0);
  const ev = fire(s2, 'spike pulse');
  assert.ok(ev.some((e) => e.tell === t2.id && e.answered), 'called off');
  assert.equal(p2.attack.due, t2.next === null ? p2.attack.due : p2.attack.due);
  assert.ok(p2.attack.due >= s2.encounter.cycle + 1 + TELL.knock - 1, 'its plain attack is knocked back');
  const b2 = hp(s2);
  hold(s2, 2);
  assert.equal(hp(s2), b2, 'nothing landed when the charge would have');
});

test('only your commands count toward a charge\'s hits: burns and helpers don\'t', () => {
  const s = fight({ level: 12, cls: 'infiltrator' });
  quietParts(s);
  const pulse = part(s, 'pulse');
  Object.assign(pulse, { armor: 0, maxArmor: 0 });
  const t = tell(s, 'fulldisk', 'pulse', 3);
  s.encounter.burns.push({ id: 'inject', target: 'pulse', damage: 5, grow: 0, left: 9, name: 'Inject', drain: 0 });
  hold(s);
  assert.equal(t.wound, 0, 'a burn ticking on it is not a command');
  fire(s, 'spike pulse');
  assert.equal(tellsOf(s).list.find((x) => x.id === t.id).told, false, 'a Spike is');
});

test('a charge can be softened instead: a ◆ (Harden) stops it whole', () => {
  const s = fight({ level: 26, cls: 'bastion' });
  command(s, 'subclass warden');
  quietParts(s);
  const pulse = part(s, 'pulse');
  pulse.attack.due = s.encounter.cycle + 1;
  tell(s, 'fulldisk', 'pulse', 1);
  s.encounter.chits = 1;
  const before = hp(s);
  hold(s, 2);
  assert.equal(hp(s), before, 'the ◆ took it');
});

test('Full Disk: the Encrypt with a burst of encryption on top for 3 cycles, which goes when you break the Encryptor (or Purge, or Scrub)', () => {
  const s = fight({ level: 12, cls: 'bastion' });
  quietParts(s);
  const enc = part(s, 'encryptor');
  enc.attack.due = s.encounter.cycle + 1;
  tell(s, 'fulldisk', 'encryptor', 1);
  hold(s, 2);
  assert.ok(s.encounter.encrypt > 0 && s.encounter.burst?.left > 0, 'a stack and a burst');
  fire(s, 'purge pulse');
  assert.ok(!s.encounter.encrypt && !s.encounter.burst, 'Purge clears both');
});

test('Possession: its Scramble lasts two cycles longer', () => {
  const s = fight({ level: 12, family: 'ghostroot' });
  quietParts(s);
  const sc = part(s, 'scrambler');
  sc.attack.due = s.encounter.cycle + 1;
  tell(s, 'possession', 'scrambler', 1);
  hold(s, 2);
  assert.equal(s.encounter.scrambleUntil - (s.encounter.cycle - 1), sc.attack.amount + 2);
});

test('a cast: SIGINT stops it and the next comes two cycles sooner, so SIGINT (every 8) can\'t stop them all; two hits stop one too', () => {
  const s = fight({ level: 12 });
  quietParts(s);
  const t = tell(s, 'extortion', 'pulse', 2);
  assert.ok(keyMap(s)['9'] === 'sigint');
  const ev = fire(s, 'sigint');
  assert.ok(ev.some((e) => e.type === 'interrupt' && e.tell === t.id), 'SIGINT stops it');
  assert.equal(t.at, s.encounter.cycle - 1 + t.every - TELL.tiers[2].lead - TELL.sooner, 'the next one comes sooner');
  assert.ok(t.at + TELL.tiers[2].lead - (s.encounter.cycle - 1) < ABILITIES.sigint.cooldown, 'before SIGINT is ready again');
  // Two command hits.
  const s2 = fight({ level: 12 });
  quietParts(s2);
  const pulse = part(s2, 'pulse');
  Object.assign(pulse, { armor: 0, maxArmor: 0 });
  const t2 = tell(s2, 'extortion', 'pulse', 2);
  fire(s2, 'spike pulse');
  assert.ok(t2.told && t2.wound === 1);
  const ev2 = fire(s2, 'spike pulse');
  assert.ok(ev2.some((e) => e.tell === t2.id && e.answered), 'hit out of its compile');
  // Below level 10 there are no casts, and SIGINT finds nothing to stop.
  const s3 = fight({ level: 12 });
  quietParts(s3);
  assert.match(command(s3, 'sigint').at(-1).message, /Nothing is compiling/);
});

test('a cast that compiles is a buff for 4 cycles, and then it wears off', () => {
  const s = fight({ level: 12 });
  quietParts(s);
  const enc = part(s, 'encryptor'), base = enc.attack.amount;
  tell(s, 'extortion', 'pulse', 0);
  hold(s);
  assert.equal(enc.attack.amount, Math.round(base * TELL.loud), 'Double Extortion: harder hits');
  hold(s, TELL.castLasts);
  assert.equal(enc.attack.amount, base, 'and back after it runs out');
  // Persistence never moves an attack already on the timeline: the repeats come sooner.
  const g = fight({ level: 12, family: 'ghostroot' });
  quietParts(g);
  const sc = part(g, 'scrambler');
  sc.attack.due = g.encounter.cycle + 3;
  const due = sc.attack.due, every = sc.attack.interval;
  tell(g, 'persistence', 'pulse', 0);
  hold(g);
  assert.equal(sc.attack.due, due, 'what was announced stays put');
  assert.equal(sc.attack.interval, every - 1);
  // Self-Update grows every part.
  const w = fight({ level: 12, family: 'worm' });
  quietParts(w);
  const rep = part(w, 'replicator'), max = rep.max;
  tell(w, 'selfupdate', 'pulse', 0);
  hold(w);
  assert.equal(rep.max, max + Math.round(max * TELL.grow));
});

test('a seal: if its part still wears ◆ when it lands it re-arms with one more and every stripped part gets one back; strip it first and it fails', () => {
  const s = fight({ level: 18, opts: { elite: true } });
  quietParts(s);
  const enc = part(s, 'encryptor'), pulse = part(s, 'pulse');
  const t = tell(s, 'keyrotation', 'encryptor', 1);
  const max = enc.maxArmor;
  enc.armor = 1; pulse.armor = 0; pulse.patchAt = 99;
  hold(s, 2);
  assert.equal(enc.maxArmor, max + 1);
  assert.equal(enc.armor, max + 1);
  assert.equal(pulse.armor, 1, 'the stripped Pulse Node gets a ◆ back');
  // Stripped first.
  const s2 = fight({ level: 18, opts: { elite: true } });
  quietParts(s2);
  const e2 = part(s2, 'encryptor');
  const t2 = tell(s2, 'keyrotation', 'encryptor', 1);
  e2.armor = 1;
  const ev = fire(s2, 'spike encryptor');
  assert.equal(e2.armor, 0);
  hold(s2);
  assert.ok(s2.logs.some((e) => e.tell === t2.id && /fails/.test(e.message)));
  assert.equal(e2.maxArmor, max, 'no ◆ more');
});

test('the Mimic plays the command you fire on its beat back at you; a command with no direct hit gives it nothing', () => {
  const pick = (seed) => createVirus('random', seed, { family: 'ghostroot', threat: 9 + 12 }).parts.some((p) => p.mimic);
  const seed = Array.from({ length: 50 }, (_, i) => i + 1).find(pick);
  assert.ok(seed, 'a Mimic among the ghostroot third parts');
  const s = fight({ level: 12, family: 'ghostroot', seed });
  quietParts(s);
  const t = tell(s, 'mimic', 'mimic', 0);
  for (const p of livingParts(s)) Object.assign(p, { armor: 0, maxArmor: 0 });
  const before = hp(s);
  fire(s, 'overload pulse');
  assert.ok(before - hp(s) > 0, 'its Overload came back at it');
  const s2 = fight({ level: 12, family: 'ghostroot', seed });
  quietParts(s2);
  tell(s2, 'mimic', 'mimic', 0);
  const b2 = hp(s2);
  fire(s2, 'exploit pulse');
  assert.equal(hp(s2), b2, 'Exploit has no hit in it');
});

test('breaking a tell\'s part stops it', () => {
  const s = fight({ level: 12 });
  quietParts(s);
  const t = tell(s, 'fulldisk', 'pulse', 2);
  part(s, 'pulse').integrity = 1; part(s, 'pulse').armor = 0;
  fire(s, 'spike pulse');
  assert.ok(!t.told && s.logs.some((e) => e.tell === t.id && /dies with/.test(e.message)));
});

test('Deep Shred (the Shredder\'s tell) shreds a code file out of your pack when it lands', () => {
  const s = fresh(); s.hackers = { breaker: { level: 12, xp: 0 } };
  s.run = { loc: 'sim', cwd: '/srv', integrity: 300, max: 300, pack: [{ path: '/x', name: 'cipher.code', kind: 'code', material: 'cipher', amount: 2 }, { path: '/y', name: 'protocol.bin', kind: 'gear' }], visited: ['/'] };
  selectEncounter(s, 'shredder', 3, { mode: 'run', room: '/srv', level: 12 });
  command(s, 'engage');
  quietParts(s);
  part(s, 'encryptor').attack.due = s.encounter.cycle + 1;
  tell(s, 'deepshred', 'encryptor', 1);
  hold(s, 2);
  assert.deepEqual(s.run.pack.map((f) => f.name), ['protocol.bin'], 'the code is gone, the protocol isn\'t');
});

test('the third part comes from a pool from level 8: a family brings one of those open at its level, by its seed; a boss keeps the classic one', () => {
  for (const [family, pool] of [['ransomware', ['lockbox', 'mutex']], ['worm', ['mirror', 'c2']], ['ghostroot', ['decoy', 'mimic']]]) {
    const seen = new Set();
    for (let seed = 1; seed <= 40; seed++) {
      const v = createVirus('random', seed, { family, threat: 9 + 12 });
      const third = v.parts.filter((p) => FAMILIES[family].parts.find((x) => x.id === p.id)?.pool === 'third');
      assert.equal(third.length, 1, `${family} ${seed}: one third part`);
      seen.add(third[0].id);
    }
    assert.deepEqual([...seen].sort(), [...pool].sort(), family);
    assert.ok(createVirus('random', 3, { family, threat: 9 + 5 }).parts.some((p) => p.id === pool[0]), 'below 8: the classic one');
    assert.ok(createVirus('random', 5, { family, threat: 9 + 12, boss: 'resident' }).parts.some((p) => p.id === pool[0]), 'a boss: the classic one');
  }
  assert.ok(Array.from({ length: 40 }, (_, i) => createVirus('random', i + 1, { family: 'ransomware', threat: 9 + 22 })).some((v) => v.parts.some((p) => p.id === 'tripwire')), 'the Tripwire from 20');
});

const withPart = (family, id, level = 22) => Array.from({ length: 60 }, (_, i) => i + 1).find((seed) => createVirus('random', seed, { family, threat: 9 + level }).parts.some((p) => p.id === id));

test('Mutex: the Encryptor carries a lock (a shield) that takes hits first, comes back 4 cycles after it breaks, and goes with the Mutex', () => {
  const s = fight({ level: 12, seed: withPart('ransomware', 'mutex', 12) });
  quietParts(s);
  const enc = part(s, 'encryptor'), mutex = part(s, 'mutex');
  Object.assign(enc, { armor: 0, maxArmor: 0 });
  assert.ok(enc.lockHp > 0 && enc.lockHp === enc.lockMax);
  const was = enc.integrity;
  enc.lockHp = 5;
  fire(s, 'overload encryptor');
  assert.equal(enc.lockHp, 0, 'the lock took the first of it');
  assert.ok(enc.integrity < was, 'the rest went through');
  assert.equal(enc.lockAt, s.encounter.cycle - 1 + CONFIG.mutex.every);
  hold(s, CONFIG.mutex.every);
  assert.equal(enc.lockHp, enc.lockMax, 'locked again');
  Object.assign(mutex, { armor: 0, integrity: 1 });
  fire(s, 'spike mutex');
  assert.equal(enc.lockHp, 0, 'gone with the Mutex');
  assert.match(partAbout(mutex), /lock/);
});

test('Tripwire: break it while the others stand and they go loud (harder, a cycle sooner); break it last and nothing happens', () => {
  const s = fight({ level: 22, seed: withPart('ransomware', 'tripwire') });
  const trip = part(s, 'tripwire'), pulse = part(s, 'pulse');
  const amount = pulse.attack.amount, due = pulse.attack.due;
  Object.assign(trip, { armor: 0, integrity: 1 });
  fire(s, 'spike tripwire');
  assert.ok(pulse.loud);
  assert.equal(pulse.attack.amount, Math.round(amount * CONFIG.tripwire.loud));
  assert.ok(pulse.attack.due <= due, 'and sooner');
  assert.ok(s.logs.some((e) => e.tripwire));
  // Last: nothing left to set off.
  const s2 = fight({ level: 22, seed: withPart('ransomware', 'tripwire') });
  for (const p of livingParts(s2)) if (!p.deadman) p.integrity = 0;
  const t2 = part(s2, 'tripwire');
  Object.assign(t2, { armor: 0, integrity: 1 });
  command(s2, 'spike tripwire'); resolveCycle(s2);
  assert.ok(!s2.logs.some((e) => e.tripwire));
});

test('C2 Node: fragments gnaw half again as hard while it lives, and drop when it breaks', () => {
  const s = fight({ level: 12, family: 'worm', seed: withPart('worm', 'c2', 12) });
  quietParts(s);
  s.encounter.virus.parts.push({ id: 'frag9', name: 'Fragment 9', kind: 'fragment', integrity: 20, max: 20, armor: 0, maxArmor: 0, patchAt: null, attack: { name: 'Gnaw', effect: 'damage', amount: 10, interval: 1, due: s.encounter.cycle } });
  const chip = intents(s).find((i) => i.source === 'frag9');
  assert.equal(chip.amount, Math.round(10 * (1 + CONFIG.c2.gnaw)));
  const c2 = part(s, 'c2');
  Object.assign(c2, { armor: 0, integrity: 1 });
  fire(s, 'spike c2');
  assert.equal(part(s, 'frag9').integrity, 0, 'the fragment dropped with it');
});

test('the board shows a tell on its part\'s row even while the part is veiled, with what answers it', () => {
  const s = fight({ level: 12, family: 'ghostroot' });
  quietParts(s);
  const sc = part(s, 'scrambler');
  sc.attack.due = s.encounter.cycle + 2;
  assert.ok(sc.veiled && sc.armor > 0);
  tell(s, 'possession', 'scrambler', 2);
  const html = boardMarkup(s, null);
  assert.match(html, /intent raid tell t-charge/);
  assert.match(html, /POSSESSION|Possession/);
  assert.match(html, /hit it once/);
  const cast = fight({ level: 12 });
  quietParts(cast);
  tell(cast, 'extortion', 'pulse', 1);
  assert.match(boardMarkup(cast, null), /Compiling…[\s\S]*SIGINT, or hit ×2/);
});

test('bots read tells: the planner hits a charging part a cycle before the last one, SIGINTs a cast worth it, and goes quiet on the Mimic\'s beat', () => {
  const s = fight({ level: 12 });
  quietParts(s);
  for (const p of livingParts(s)) if (p.ward) p.integrity = 0; // no Lockbox to finish first
  const pulse = part(s, 'pulse');
  pulse.attack.due = s.encounter.cycle + 1;
  pulse.attack.amount = 30; // a charge worth a command on a 200 server
  part(s, 'encryptor').attack.amount = 30; // and the Encryptor the bigger threat: where a bot that ignores tells works
  s.server.max = s.server.integrity = 200;
  tell(s, 'fulldisk', 'pulse', 1);
  TELL.bots.answer = false;
  let plain;
  try { plain = planner(s); } finally { TELL.bots.answer = true; }
  assert.doesNotMatch(plain, / pulse$/, `a bot that ignores tells works on its own target (${plain})`);
  assert.match(planner(s), / pulse$/, 'a bot that reads them hits the charging Pulse Node');
  // A cast landing this cycle, worth a command, with nothing more urgent on: SIGINT.
  const c = fight({ level: 12 });
  quietParts(c);
  c.server.max = c.server.integrity = 200;
  for (const p of livingParts(c)) if (p.ward) p.integrity = 0; // no Lockbox to finish first
  for (const [id, n] of [['pulse', 2], ['encryptor', 3]]) Object.assign(part(c, id).attack, { due: c.encounter.cycle + n, amount: 40, effect: 'damage' });
  tell(c, 'extortion', 'pulse', 0);
  assert.equal(planner(c), 'sigint');
  const seed = Array.from({ length: 50 }, (_, i) => i + 1).find((x) => createVirus('random', x, { family: 'ghostroot', threat: 21 }).parts.some((p) => p.mimic));
  const g = fight({ level: 12, family: 'ghostroot', seed });
  quietParts(g);
  for (const p of livingParts(g)) Object.assign(p, { armor: 0, maxArmor: 0, integrity: p.max });
  for (const p of livingParts(g)) p.integrity = p.max = 999; // nothing breaks this cycle (a kill would come first)
  tell(g, 'mimic', 'mimic', 0);
  const cmd = planner(g), id = cmd.split(' ')[0];
  assert.ok(!(ABILITIES[id]?.damage > 0 && ABILITIES[id]?.verb === 'hit'), `quiet on the beat: ${cmd}`);
});

test('a fight\'s metrics count what its tells did (the gap test reads them)', () => {
  const s = fight({ level: 18, seed: 5 });
  for (let i = 0; i < 40 && active(s); i++) { command(s, planner(s) || 'hold'); resolveCycle(s); }
  const r = s.reports.at(-1);
  assert.ok(r.tells && Object.values(r.tells).some((x) => x.said > 0));
  assert.ok(tellLog(s).length > 0);
});

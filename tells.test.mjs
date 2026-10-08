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
// Make one tell (by id) said now on a part, landing in n cycles; the rest stay quiet. A charge rides the part's
// next attack: its timer is set to land then.
function tell(s, id, partId, n = 2) {
  const T = tellsOf(s), e = s.encounter;
  for (const t of T.list) { t.told = false; t.after = 999; }
  const t = T.list.find((x) => x.id === id);
  assert.ok(t, `${id} is one of this virus's tells (${T.list.map((x) => x.id).join(', ')})`);
  const p = part(s, partId);
  if (t.kind === 'charge') p.attack.due = e.cycle + n;
  Object.assign(t, { part: partId, told: true, said: e.cycle, next: e.cycle + n, n: t.kind === 'charge' ? p.attack.n || 0 : null, wound: 0, hitBy: [], after: 999,
    need: t.kind === 'charge' ? (t.answer === 'strip' ? t.strip : T.tier.hits) : t.kind === 'cast' ? T.tier.castHits : 0 });
  return t;
}
const quietParts = (s) => { for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999; };
const hold = (s, n = 1) => { for (let i = 0; i < n && active(s); i++) { command(s, 'hold'); resolveCycle(s); } };
const fire = (s, text) => { const ev = command(s, text); assert.ok(!ev.some((e) => e.type === 'warning'), ev.at(-1)?.message); return resolveCycle(s); };
const hp = (s) => s.server.integrity;
// A part a test hits without breaking it, and no armor in the way.
const bare = (s, id) => Object.assign(part(s, id), { armor: 0, maxArmor: 0, integrity: 999, max: 999 });

test('Flood cools down in 6 cycles, Crack in 2 (the Breaker retune)', () => {
  assert.equal(ABILITIES.flood.cooldown, 6);
  assert.equal(ABILITIES.crack.cooldown, 2);
  const s = fight({ level: 8 });
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0 });
  fire(s, 'flood pulse');
  assert.equal(readyIn(s, 'flood'), 5, 'ready again 6 cycles after it fired');
});

test('tells scale with the level: one gentle charge to 5 (said 3 ahead), a cast from 10, a second charge from 17, and none in SPRAWL-00\'s first fights or at a crew boss', () => {
  const at = (level, opts = {}) => tellsOf(fight({ level, ...opts }));
  const low = at(3);
  assert.equal(low.list.filter((t) => t.kind !== 'mimic').length, 1);
  assert.equal(low.tier.lead, 3, 'gentle: announced three cycles ahead');
  assert.equal(low.list[0].kind, 'charge');
  assert.equal(low.tier.after, 0, 'and nothing lingers when one lands');
  const mid = at(12);
  assert.deepEqual(mid.list.filter((t) => t.kind !== 'mimic').map((t) => t.kind), ['charge', 'cast']);
  assert.equal(mid.tier.lead, 2);
  assert.equal(mid.tier.live, 1, 'below 17, one live at a time');
  assert.ok(!at(8).list.some((t) => t.kind === 'cast'), 'no casts before SIGINT (level 10)');
  const top = at(18);
  assert.deepEqual(top.list.filter((t) => t.kind !== 'mimic').map((t) => t.id), ['fulldisk', 'extortion', 'overcharge']);
  assert.equal(top.tier.live, 2, 'from 17, two at most');
  const elite = at(18, { opts: { elite: true } });
  assert.equal(elite.list.filter((t) => t.kind !== 'mimic').length, 4, 'an elite brings one more, its seal');
  assert.equal(elite.tier.hits, 2, 'and its charges take two hits');
  // SPRAWL-00's first two kills (soft) bring none.
  const s = fresh(); s.hackers = { breaker: { level: 1, xp: 0 } };
  selectEncounter(s, 'random', 3, { mode: 'run', zone: true, room: '/tmp', level: 1 });
  s.run = { loc: 'sprawl', cwd: '/tmp', integrity: 100, max: 100, pack: [], visited: ['/'] };
  command(s, 'engage');
  assert.ok(s.encounter.soft < 1 && !tellsOf(s), 'a new player\'s first fights stay plain');
  assert.ok(!createVirus('random', 1, { boss: 'foreman', threat: 30 }).tells, 'crew bosses keep their own mechanics');
});

test('one clock: a charge powers up one of its part\'s scheduled attacks, said in that attack\'s cell at least lead cycles ahead, and lands exactly when it was due', () => {
  for (const [family, level] of [['ransomware', 4], ['ransomware', 12], ['worm', 18], ['ghostroot', 18]]) {
    for (const seed of [3, 11, 21]) {
      const s = fight({ level, family, seed });
      const lead = tellsOf(s).tier.lead;
      const seen = {};
      for (let i = 0; i < 30 && active(s); i++) {
        for (const x of tellIntents(s)) {
          seen[`${x.id}@${s.encounter.cycle + x.col}`] = true;
          if (x.tell === 'charge') {
            const p = part(s, x.source);
            assert.equal((p.attack.due - s.encounter.cycle) % 1, 0);
            const plain = intents(s).filter((i2) => i2.source === x.source && i2.col === x.col && !i2.tell);
            assert.equal(plain.length, 0, `${family} ${level}: the charge sits in its attack's cell, not beside it`);
          }
        }
        command(s, 'hold'); resolveCycle(s);
      }
      const log = s.logs.filter((e) => e.tell && e.type === 'telegraph');
      for (const e of log) if (e.kind !== 'mimic') assert.ok(e.at - e.cycle >= lead, `${family} ${level}: ${e.message} is said ${lead} or more cycles ahead`);
      for (const e of s.logs.filter((x) => x.tell && x.missed)) assert.ok(seen[`${e.tell}@${e.cycle}`], `${family} ${level}: ${e.message} was on the board`);
    }
  }
  // Delaying the attack moves its charge with it.
  const s = fight({ level: 12, cls: 'bastion' });
  quietParts(s);
  const t = tell(s, 'fulldisk', 'encryptor', 2);
  part(s, 'encryptor').attack.due += 1;
  assert.equal(tellIntents(s).find((x) => x.id === t.id).col, 3, 'a cycle later, with its attack');
  assert.ok(t.told);
});

test('each tell sits on a fixed part, shown on the chip and in the codex: the Encryptor\'s Full Disk, the Replicator\'s Mass Mailer, the Scrambler\'s Possession, casts on the signature part too', () => {
  for (const [family, charge, src] of [['ransomware', 'fulldisk', 'encryptor'], ['worm', 'massmailer', 'replicator'], ['ghostroot', 'possession', 'scrambler']]) {
    for (const seed of [1, 2, 3]) {
      const T = tellsOf(fight({ level: 12, family, seed }));
      assert.equal(T.list.find((x) => x.id === charge).part, src, `${family}: always the ${src}`);
    }
  }
  const s = fight({ level: 12 });
  assert.match(partAbout(part(s, 'encryptor'), s.encounter.virus), /Full Disk \(a charge\)/);
});

test('no pile-ups: a charge never lands with another part\'s heavy attack, and below 17 one tell is live at a time', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const s = fight({ level: 12, seed });
    for (let i = 0; i < 25 && active(s); i++) {
      const told = tellsOf(s).list.filter((x) => x.told && x.kind !== 'mimic');
      assert.ok(told.length <= 1, `seed ${seed}: one live at a time (${told.map((x) => x.id)})`);
      for (const x of tellIntents(s).filter((y) => y.tell === 'charge')) {
        const heavy = intents(s).filter((y) => y.col === x.col && !y.tell && y.source !== x.source && (y.amount || y.hit || 0) >= s.server.max * TELL.heavy);
        assert.equal(heavy.length, 0, `seed ${seed}: nothing heavy lands with ${x.name}`);
      }
      command(s, 'hold'); resolveCycle(s);
    }
  }
  for (let seed = 1; seed <= 8; seed++) {
    const s = fight({ level: 20, seed });
    for (let i = 0; i < 25 && active(s); i++) {
      const told = tellsOf(s).list.filter((x) => x.told && x.kind !== 'mimic');
      assert.ok(told.length <= 2, 'from 17, two at most');
      const at = told.map((x) => (x.kind === 'charge' ? part(s, x.part).attack.due + (x.n - (part(s, x.part).attack.n || 0)) * part(s, x.part).attack.interval : x.next));
      assert.equal(new Set(at).size, at.length, 'never on the same cycle');
      command(s, 'hold'); resolveCycle(s);
    }
  }
});

test('a charge: its attack, much bigger; only a command of yours aimed at the part, typed after it was said, calls it off, and the part is Open', () => {
  // Ignored: it lands bigger than the plain attack, and leaves you Corrupted, hung, and your last skill offline.
  const s = fight({ level: 12, cls: 'bastion' });
  quietParts(s);
  const enc = bare(s, 'encryptor');
  enc.attack = { name: 'Encrypt', effect: 'damage', amount: 20, interval: 5, due: 999 };
  const t = tell(s, 'fulldisk', 'encryptor', 1);
  const charged = tellIntents(s).find((x) => x.id === t.id);
  assert.ok(charged.amount > 20, 'the board shows the charged hit');
  const before = hp(s);
  fire(s, 'rate-limit pulse');
  hold(s);
  assert.ok(before - hp(s) >= charged.amount * 0.5 * 0.9, 'it landed at the charged size (Rate Limit throttled the Pulse, not this)');
  assert.ok(s.encounter.corrupt || s.logs.some((e) => /Corrupted/.test(e.message)), 'Corrupted');
  assert.ok(s.logs.some((e) => e.type === 'locked' && e.ability === 'rate-limit'), 'your last skill knocked offline');
  assert.equal(s.encounter.hung, s.encounter.cycle, 'and this cycle\'s command hangs');
  // Answered: a command hit on it after it was said. The part is Open, +50% for 2 cycles.
  const a = fight({ level: 12, cls: 'bastion' });
  quietParts(a);
  bare(a, 'encryptor');
  const ta = tell(a, 'fulldisk', 'encryptor', 2);
  const ev = fire(a, 'spike encryptor');
  assert.ok(ev.some((e) => e.tell === ta.id && e.answered), 'called off');
  assert.ok(ev.some((e) => e.type === 'read' && e.open), 'a read: the part is Open');
  assert.ok(part(a, 'encryptor').openUntil >= a.encounter.cycle, 'still open next cycle');
  // Area hits, burns and auto-repeat don't count; neither does a plan typed before it was said.
  const area = fight({ level: 16 });
  quietParts(area);
  bare(area, 'encryptor'); bare(area, 'pulse');
  const tb = tell(area, 'fulldisk', 'encryptor', 3);
  area.loadout.equipped.breaker = ['overload', 'flood', 'exploit', 'crack', 'fork-bomb'];
  area.loadout.sub = { breaker: 'demolitionist' };
  area.encounter.readyAt = {};
  command(area, 'fork-bomb'); resolveCycle(area);
  assert.equal(tb.wound, 0, 'Fork Bomb hit it, but an area hit is not an answer');
  area.encounter.burns.push({ id: 'inject', target: 'encryptor', damage: 5, grow: 0, left: 9, name: 'Inject', drain: 0 });
  hold(area);
  assert.equal(tb.wound, 0, 'a burn ticking on it is not a command');
  area.encounter.lastAttack = 'spike encryptor';
  resolveCycle(area); // nothing typed: auto-repeat
  assert.ok(tb.told && tb.wound === 0, 'auto-repeat is not an answer');
});

test('a strip charge: the Bouncer\'s Battering Ram asks for ◆2 off the Gate', () => {
  const s = fresh(); s.hackers = { breaker: { level: 12, xp: 0 } };
  s.run = { loc: 'sim', cwd: '/srv', integrity: 3000, max: 3000, pack: [], visited: ['/'] };
  selectEncounter(s, 'bouncer', 3, { mode: 'run', room: '/srv', level: 12 });
  command(s, 'engage');
  quietParts(s);
  const gate = part(s, 'pulse');
  Object.assign(gate, { armor: 5, maxArmor: 5 });
  const t = tell(s, 'ram', 'pulse', 3);
  assert.equal(t.need, 2);
  fire(s, 'spike pulse');
  assert.ok(t.told && t.wound === 1, 'one ◆ of two');
  fire(s, 'spike pulse');
  assert.ok(!t.told, 'two ◆: called off');
});

test('Full Disk: the Encrypt with a burst of encryption on top for 3 cycles, which goes when you break the Encryptor (or Purge, or Scrub)', () => {
  const s = fight({ level: 12, cls: 'bastion' });
  quietParts(s);
  tell(s, 'fulldisk', 'encryptor', 1);
  hold(s, 2);
  assert.ok(s.encounter.encrypt > 0 && s.encounter.burst?.left > 0, 'a stack and a burst');
  hold(s); // the hung cycle
  s.encounter.readyAt = {};
  fire(s, 'purge pulse');
  assert.ok(!s.encounter.encrypt && !s.encounter.burst && !s.encounter.corrupt, 'Purge clears all of it, Corrupted too');
});

test('Possession: its Scramble lasts two cycles longer', () => {
  const s = fight({ level: 12, family: 'ghostroot' });
  quietParts(s);
  const sc = part(s, 'scrambler');
  tell(s, 'possession', 'scrambler', 1);
  hold(s, 2);
  assert.equal(s.encounter.scrambleUntil - (s.encounter.cycle - 1), sc.attack.amount + 2);
});

test('a cast: SIGINT stops it and the part is Open; two command hits stop it too; ignored, it compiles a buff for 4 cycles', () => {
  const s = fight({ level: 12 });
  quietParts(s);
  const t = tell(s, 'extortion', 'encryptor', 2);
  assert.equal(keyMap(s)['-'], 'sigint');
  const ev = fire(s, 'sigint');
  assert.ok(ev.some((e) => e.type === 'interrupt' && e.tell === t.id), 'SIGINT stops it');
  assert.ok(ev.some((e) => e.type === 'read' && e.open), 'read: the Encryptor is Open');
  // Two command hits.
  const s2 = fight({ level: 12 });
  quietParts(s2);
  bare(s2, 'encryptor');
  const t2 = tell(s2, 'extortion', 'encryptor', 2);
  fire(s2, 'spike encryptor');
  assert.ok(t2.told && t2.wound === 1);
  const ev2 = fire(s2, 'spike encryptor');
  assert.ok(ev2.some((e) => e.tell === t2.id && e.answered), 'hit out of its compile');
  // Ignored: Double Extortion, harder hits for 4 cycles, and back after.
  const c = fight({ level: 12 });
  quietParts(c);
  const pulse = part(c, 'pulse'), base = pulse.attack.amount;
  tell(c, 'extortion', 'encryptor', 0);
  hold(c);
  assert.equal(pulse.attack.amount, Math.round(base * TELL.loud), 'Double Extortion: harder hits');
  hold(c, TELL.castLasts);
  assert.equal(pulse.attack.amount, base, 'and back after it runs out');
  // Nothing compiling: SIGINT finds nothing.
  const s3 = fight({ level: 12 });
  quietParts(s3);
  for (const x of tellsOf(s3).list) x.told = false;
  assert.match(command(s3, 'sigint').at(-1).message, /Nothing is compiling/);
});

test('a seal: if its part still wears ◆ when it lands it re-arms with one more and every stripped part gets one back; strip it first and the strip is ready again', () => {
  const s = fight({ level: 18, opts: { elite: true } });
  quietParts(s);
  const enc = part(s, 'encryptor'), pulse = part(s, 'pulse');
  tell(s, 'keyrotation', 'encryptor', 1);
  const max = enc.maxArmor;
  enc.armor = 1; pulse.armor = 0; pulse.patchAt = 99;
  hold(s, 2);
  assert.equal(enc.maxArmor, max + 1);
  assert.equal(enc.armor, max + 1);
  assert.equal(pulse.armor, 1, 'the stripped Pulse Node gets a ◆ back');
  // Stripped first, with Crack: the seal fails, and Crack is ready again.
  const s2 = fight({ level: 18, opts: { elite: true } });
  quietParts(s2);
  const e2 = part(s2, 'encryptor');
  const t2 = tell(s2, 'keyrotation', 'encryptor', 1);
  e2.armor = 2;
  fire(s2, 'crack encryptor');
  assert.equal(e2.armor, 0);
  assert.ok(readyIn(s2, 'crack') > 0, 'Crack cooling');
  hold(s2);
  assert.ok(s2.logs.some((e) => e.tell === t2.id && /fails/.test(e.message)));
  assert.equal(readyIn(s2, 'crack'), 0, 'read: Crack is ready again');
  assert.equal(e2.maxArmor, max, 'no ◆ more');
});

test('the Mimic plays the command you fire on its beat back at you; go quiet and it gives you an opening', () => {
  const pick = (seed) => createVirus('random', seed, { family: 'ghostroot', threat: 9 + 12 }).parts.some((p) => p.mimic);
  const seed = Array.from({ length: 50 }, (_, i) => i + 1).find(pick);
  assert.ok(seed, 'a Mimic among the ghostroot third parts');
  const s = fight({ level: 12, family: 'ghostroot', seed });
  quietParts(s);
  tell(s, 'mimic', 'mimic', 0);
  for (const p of livingParts(s)) Object.assign(p, { armor: 0, maxArmor: 0 });
  const before = hp(s);
  fire(s, 'overload pulse');
  assert.ok(before - hp(s) > 0, 'its Overload came back at it');
  assert.ok(s.logs.some((e) => e.type === 'locked'), 'and Overload is knocked offline');
  const s2 = fight({ level: 12, family: 'ghostroot', seed });
  quietParts(s2);
  tell(s2, 'mimic', 'mimic', 0);
  const b2 = hp(s2);
  const ev = fire(s2, 'exploit pulse');
  assert.equal(hp(s2), b2, 'Exploit has no hit in it');
  assert.ok(ev.some((e) => e.type === 'read' && e.open), 'read: the Mimic is Open');
});

test('breaking a tell\'s part stops it', () => {
  const s = fight({ level: 12 });
  quietParts(s);
  const t = tell(s, 'fulldisk', 'encryptor', 2);
  Object.assign(part(s, 'encryptor'), { integrity: 1, armor: 0 });
  s.encounter.burns.push({ id: 'inject', target: 'encryptor', damage: 5, grow: 0, left: 3, name: 'Inject', drain: 0 }); // a burn breaks it: no answer, it just dies
  hold(s);
  assert.ok(!t.told && s.logs.some((e) => e.tell === t.id && /dies with/.test(e.message)));
});

test('reading pays at the kill: XP for each tell read, and every tell read rolls the loot once more', () => {
  const s = fight({ level: 12 });
  for (let i = 0; i < 40 && active(s); i++) { command(s, planner(s) || 'hold'); resolveCycle(s); }
  const r = s.reports.at(-1), reads = r.reads || 0;
  if (r.result === 'victory' && reads) assert.ok(s.logs.some((e) => e.type === 'read-xp' && e.reads === reads && e.amount > 0));
  // The clean read: two or more said, all read, none landed.
  const c = fight({ level: 12 });
  c.encounter.metrics.tells = { fulldisk: { said: 2, answered: 2, read: 2, landed: 0, cost: 0 } };
  c.encounter.metrics.reads = 2;
  for (const p of c.encounter.virus.parts) p.integrity = 0;
  hold(c);
  assert.ok(c.encounter.cleanRead, 'every tell read');
  assert.ok(c.logs.some((e) => e.type === 'read-xp' && e.clean));
});

test('Deep Shred (the Shredder\'s tell) shreds a code file out of your pack when it lands', () => {
  const s = fresh(); s.hackers = { breaker: { level: 12, xp: 0 } };
  s.run = { loc: 'sim', cwd: '/srv', integrity: 300, max: 300, pack: [{ path: '/x', name: 'cipher.code', kind: 'code', material: 'cipher', amount: 2 }, { path: '/y', name: 'protocol.bin', kind: 'gear' }], visited: ['/'] };
  selectEncounter(s, 'shredder', 3, { mode: 'run', room: '/srv', level: 12 });
  command(s, 'engage');
  quietParts(s);
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
  s.encounter.virus.tells = null; // the part's rule alone
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

test('the board shows a tell in its attack\'s cell even while the part is veiled, with exactly what answers it', () => {
  const s = fight({ level: 12, family: 'ghostroot' });
  quietParts(s);
  const sc = part(s, 'scrambler');
  assert.ok(sc.veiled && sc.armor > 0);
  tell(s, 'possession', 'scrambler', 2);
  const html = boardMarkup(s, null);
  assert.match(html, /intent raid tell t-charge/);
  assert.match(html, /POSSESSION|Possession/);
  assert.match(html, /hit it/);
  assert.match(html, /Only a command of yours aimed at it counts/);
  const cast = fight({ level: 12 });
  quietParts(cast);
  tell(cast, 'extortion', 'encryptor', 1);
  assert.match(boardMarkup(cast, null), /Compiling…[\s\S]*SIGINT, or hit ×2/);
});

test('bots read tells: the planner hits a charging part on its last chance, SIGINTs a cast, and goes quiet on the Mimic\'s beat; one that ignores them doesn\'t', () => {
  const s = fight({ level: 12 });
  quietParts(s);
  for (const p of livingParts(s)) if (p.ward || p.lock) p.integrity = 0; // no Lockbox or Mutex to finish first
  s.server.max = s.server.integrity = 200;
  bare(s, 'encryptor'); bare(s, 'pulse');
  part(s, 'pulse').attack.due = s.encounter.cycle + 3; part(s, 'pulse').attack.amount = 40; // the bigger threat: where a bot that ignores tells works
  part(s, 'encryptor').attack = { name: 'Encrypt', effect: 'damage', amount: 25, interval: 5, due: 999 };
  tell(s, 'fulldisk', 'encryptor', 0);
  TELL.bots.answer = false;
  let plain;
  try { plain = planner(s); } finally { TELL.bots.answer = true; }
  assert.doesNotMatch(plain, / encryptor$/, `a bot that ignores tells works on its own target (${plain})`);
  assert.match(planner(s), / encryptor$/, 'a bot that reads them hits the charging Encryptor');
  const c = fight({ level: 12 });
  quietParts(c);
  c.server.max = c.server.integrity = 200;
  for (const p of livingParts(c)) if (p.ward || p.lock) p.integrity = 0;
  tell(c, 'extortion', 'encryptor', 1);
  assert.equal(planner(c), 'sigint');
  const seed = Array.from({ length: 50 }, (_, i) => i + 1).find((x) => createVirus('random', x, { family: 'ghostroot', threat: 21 }).parts.some((p) => p.mimic));
  const g = fight({ level: 12, family: 'ghostroot', seed });
  quietParts(g);
  for (const p of livingParts(g)) Object.assign(p, { armor: 0, maxArmor: 0, integrity: 999, max: 999 }); // nothing breaks this cycle
  tell(g, 'mimic', 'mimic', 0);
  const cmd = planner(g), id = cmd.split(' ')[0];
  assert.ok(!(ABILITIES[id]?.damage > 0 && ABILITIES[id]?.verb === 'hit'), `quiet on the beat: ${cmd}`);
});

// The situational skills are the natural answers to particular tells (docs/skills.md).
test('situational answers: Segfault triples on a charging part, Suspend drains a charge, Quarantine and Overvolt stop a cast, Hijack steals a charge, Blackhole eats one', () => {
  // Segfault: 30, ×3 on a part winding up a charge, and it calls it off.
  const s = fight({ level: 18, cls: 'breaker' });
  s.loadout.sub = { [s.loadout.archetype]: 'overclocker' };
  quietParts(s);
  bare(s, 'encryptor');
  const t = tell(s, 'fulldisk', 'encryptor', 2);
  s.loadout.equipped.overclocker = ['overload', 'flood', 'exploit', 'crack', 'overvolt', 'segfault', 'thermal-throttle'];
  const was = part(s, 'encryptor').integrity;
  fire(s, 'segfault encryptor');
  assert.ok(was - part(s, 'encryptor').integrity >= Math.floor(30 * 3 * 1.5), 'three times, and it is Open after');
  assert.ok(!t.told, 'called off');
  // Overvolt: two hits in one command stop a cast.
  const o = fight({ level: 18, cls: 'breaker' });
  o.loadout.sub = { [o.loadout.archetype]: 'overclocker' };
  quietParts(o);
  bare(o, 'encryptor');
  o.loadout.equipped.overclocker = ['overload', 'flood', 'exploit', 'crack', 'overvolt', 'segfault', 'thermal-throttle'];
  const to = tell(o, 'extortion', 'encryptor', 2);
  fire(o, 'overvolt encryptor');
  assert.ok(!to.told, 'one Overvolt, two hits: stopped');
  // Suspend (Warden): the charge drains out, and it lands plain later.
  const w = fight({ level: 18, cls: 'bastion' });
  w.loadout.sub = { [w.loadout.archetype]: 'warden' };
  quietParts(w);
  const tw = tell(w, 'fulldisk', 'encryptor', 1);
  const ev = fire(w, 'suspend encryptor');
  assert.ok(ev.some((e) => e.tell === tw.id && e.answered) && !tw.told, 'drained');
  // Quarantine (Warden, 30) stops a cast.
  const q = fight({ level: 30, cls: 'bastion' });
  q.loadout.sub = { [q.loadout.archetype]: 'warden' };
  quietParts(q);
  q.loadout.equipped.warden = ['rate-limit', 'firewall', 'purge', 'retaliate', 'quarantine'];
  const tq = tell(q, 'extortion', 'encryptor', 2);
  part(q, 'encryptor').attack.due = q.encounter.cycle + 3;
  fire(q, 'quarantine encryptor');
  assert.ok(!tq.told, 'quarantined: the cast is stopped');
  // Hijack: a helper on the charging part; the charge lands on the other part, whole, and never on you.
  const h = fight({ level: 18, cls: 'operator' });
  h.loadout.sub = { [h.loadout.archetype]: 'hijacker' };
  quietParts(h);
  bare(h, 'encryptor'); bare(h, 'pulse');
  part(h, 'encryptor').attack = { name: 'Encrypt', effect: 'damage', amount: 20, interval: 5, due: 999, n: 0 };
  h.loadout.equipped.hijacker = ['deploy', 'hook', 'spawn', 'botnet', 'jam', 'hijack', 'replay'];
  const th = tell(h, 'fulldisk', 'encryptor', 2);
  const big = tellIntents(h).find((x) => x.id === th.id).amount;
  fire(h, 'deploy encryptor');
  const hpWas = hp(h), pulseWas = part(h, 'pulse').integrity;
  fire(h, 'hijack encryptor');
  hold(h);
  assert.equal(hp(h), hpWas, 'nothing reached you');
  assert.ok(pulseWas - part(h, 'pulse').integrity >= big - 1, 'the Pulse Node took the whole charge');
  // Blackhole: the charged attack goes nowhere.
  const b = fight({ level: 38, cls: 'operator' });
  b.loadout.sub = { [b.loadout.archetype]: 'hijacker' };
  quietParts(b);
  b.loadout.equipped.hijacker = ['deploy', 'hook', 'spawn', 'botnet', 'blackhole'];
  const tb = tell(b, 'fulldisk', 'encryptor', 2);
  fire(b, 'deploy encryptor');
  const hb = hp(b);
  fire(b, 'blackhole encryptor');
  hold(b);
  assert.ok(hp(b) >= hb - 1 && !tb.told, 'into the blackhole');
});

test('situational answers to seals and casts: Bit Rot and Cache Poison fail a seal, Thermal Runaway\'s ticks stop a cast, Kill Switch and IRQ Storm count as your hits', () => {
  const r = fight({ level: 34, opts: { elite: true } });
  r.loadout.sub = { [r.loadout.archetype]: 'demolitionist' };
  quietParts(r);
  r.loadout.equipped.demolitionist = ['overload', 'flood', 'exploit', 'crack', 'bit-rot'];
  const enc = part(r, 'encryptor');
  enc.armor = enc.maxArmor = 5;
  const tr = tell(r, 'keyrotation', 'encryptor', 2);
  fire(r, 'bit-rot encryptor');
  hold(r, 2);
  assert.ok(r.logs.some((e) => e.tell === tr.id && /rotting/.test(e.message)), 'a rotting part can\'t seal');
  const c = fight({ level: 30, cls: 'operator', opts: { elite: true } });
  c.loadout.sub = { [c.loadout.archetype]: 'hijacker' };
  quietParts(c);
  c.loadout.equipped.hijacker = ['deploy', 'hook', 'spawn', 'botnet', 'cache-poison'];
  const ce = part(c, 'encryptor');
  ce.armor = ce.maxArmor = 3; ce.integrity = ce.max = 999;
  const tc = tell(c, 'keyrotation', 'encryptor', 2);
  fire(c, 'cache-poison encryptor');
  hold(c, 2);
  assert.ok(c.logs.some((e) => e.tell === tc.id && /poisoned/.test(e.message)) && ce.integrity < 999, 'a poisoned seal fails and hurts');
  // Thermal Runaway: each tick on a casting part is a hit on the cast.
  const d = fight({ level: 22, cls: 'breaker' });
  d.loadout.sub = { [d.loadout.archetype]: 'demolitionist' };
  quietParts(d);
  bare(d, 'encryptor');
  d.loadout.equipped.demolitionist = ['overload', 'flood', 'exploit', 'crack', 'thermal-runaway'];
  const td = tell(d, 'extortion', 'encryptor', 2);
  fire(d, 'thermal-runaway encryptor');
  hold(d);
  assert.ok(!td.told, 'two ticks: stopped');
  // Kill Switch: each part it cashes in on takes it as your hit.
  const k = fight({ level: 18, cls: 'operator' });
  k.loadout.sub = { [k.loadout.archetype]: 'herder' };
  quietParts(k);
  bare(k, 'encryptor');
  const tk = tell(k, 'fulldisk', 'encryptor', 3);
  fire(k, 'deploy encryptor');
  fire(k, 'kill-switch');
  assert.ok(!tk.told, 'cashed in on the charging part: called off');
});

test('a fight\'s metrics count what its tells did (the gap test reads them)', () => {
  const s = fight({ level: 18, seed: 5 });
  for (let i = 0; i < 40 && active(s); i++) { command(s, planner(s) || 'hold'); resolveCycle(s); }
  const r = s.reports.at(-1);
  assert.ok(r.tells && Object.values(r.tells).some((x) => x.said > 0));
  assert.ok(tellLog(s).length > 0);
});

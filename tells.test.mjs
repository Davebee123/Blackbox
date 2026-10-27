// Solo tells (tells.mjs) and the parts that change the fight (data.mjs FAMILIES, pool 'third'): each tell is
// announced before it lands, each answer works, each part does what it says; Flood and Crack's new cooldowns.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, active, intents, livingParts, keyMap, readyIn, previewDamage } from './dist/combat.mjs';
import { CONFIG, TELL, TELLS, TELL_SETS, ABILITIES, FAMILIES, createVirus } from './dist/data.mjs';
import { tellsOf, tellIntents, tellLog, sayOf, tellStart } from './dist/tells.mjs';
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
  selectEncounter(s, key, seed, { level, mutation: null, ...(key === 'random' ? { family, classic: true } : {}), ...opts }); // the classic shape (a Pulse Node, the signature, one third): the parts roll is parts.test.mjs's
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
  Object.assign(t, { part: partId, told: true, said: e.cycle, next: e.cycle + n, n: t.kind === 'charge' ? p.attack.n || 0 : null, after: 999, opened: null });
  return t;
}
// Deal a virus more tells than its level brings (a seal, a lock): its set dealt again with that many.
function retell(s, extra, set = null) {
  const v = s.encounter.virus;
  v.tells = null; v.extraTells = extra; if (set) v.tellSet = set;
  tellStart(s);
}
// A part a hit or two above its 50% tick, bare, both ticks fresh: one command takes it across (the interrupt).
const edge = (s, id, max = 100) => Object.assign(part(s, id), { armor: 0, maxArmor: 0, max, integrity: Math.floor(max * 0.5) + 2, ticks: [{ at: 0.5, spent: false }, { at: 0.25, spent: false }] });
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

test('tells scale with the level (docs/servers.md 3.5): none to 5 (the ticks are the lesson), one from 6, two from 17, an elite one more from 6; none in SPRAWL-00\'s first fights or at a crew boss', () => {
  const at = (level, opts = {}) => tellsOf(fight({ level, ...opts }));
  const kinds = (T) => T.list.filter((t) => t.kind !== 'mimic').map((t) => t.kind);
  assert.deepEqual(kinds(at(3)), [], 'levels 1 to 5: none');
  assert.deepEqual(kinds(at(3, { opts: { elite: true } })), [], 'not even on an elite');
  const mid = at(12);
  assert.deepEqual(kinds(mid), ['charge'], 'from 6, one');
  assert.equal(mid.tier.lead, 3, 'said three cycles ahead');
  assert.equal(mid.tier.live, 1, 'below 17, one live at a time');
  assert.equal(mid.tier.window, undefined, 'no windows by tier: a charge is answered on its cycle');
  assert.equal(mid.tier.share, undefined, 'and no burst');
  assert.deepEqual(kinds(at(12, { opts: { elite: true } })), ['charge', 'cast'], 'an elite one more');
  assert.ok(!at(8, { opts: { elite: true } }).list.some((t) => t.kind === 'cast'), 'no casts before SIGINT (level 10)');
  const top = at(18);
  assert.deepEqual(top.list.filter((t) => t.kind !== 'mimic').map((t) => t.id), ['fulldisk', 'extortion']);
  assert.equal(top.tier.live, 2, 'from 17, two at most');
  assert.equal(at(18, { opts: { elite: true } }).list.filter((t) => t.kind !== 'mimic').length, 3, 'an elite brings one more');
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
      const log = s.logs.filter((e) => e.tell && e.type === 'telegraph' && !e.window); // (a window opening is said in its own line)
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
  assert.match(partAbout(part(s, 'encryptor'), s.encounter.virus, s), /Charges Full Disk\./);
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

test('a charge: its attack, much bigger; a cut on its part on its cycle calls it off (the interrupt), and the part is Open', () => {
  // Ignored: it lands bigger than the plain attack, and leaves you Corrupted and your last skill offline (Hung from 17).
  const s = fight({ level: 12, cls: 'bastion' });
  quietParts(s);
  const enc = bare(s, 'encryptor');
  enc.attack = { name: 'Encrypt', effect: 'damage', amount: 20, interval: 5, due: 999 };
  const t = tell(s, 'fulldisk', 'encryptor', 1);
  const charged = tellIntents(s).find((x) => x.id === t.id);
  assert.ok(charged.amount >= 20 * 2, `the board shows the charged hit (${charged.amount})`);
  const before = hp(s);
  fire(s, 'rate-limit pulse');
  hold(s);
  assert.ok(before - hp(s) >= charged.amount * 0.5 * 0.9, 'it landed at the charged size (Rate Limit throttled the Pulse, not this)');
  assert.ok(s.encounter.corrupt || s.logs.some((e) => /Corrupted/.test(e.message)), 'Corrupted');
  assert.ok(s.logs.some((e) => e.type === 'locked' && e.ability === 'rate-limit'), 'your last skill knocked offline');
  assert.ok(!s.encounter.hung, 'no hang below 17');
  // Answered: the Encryptor taken across its tick on the cycle the charge lands. The attack it rides is cancelled,
  // the charge with it, and the part is Open, +50% for 2 cycles.
  const a = fight({ level: 12, cls: 'bastion' });
  quietParts(a);
  edge(a, 'encryptor');
  const ta = tell(a, 'fulldisk', 'encryptor', 0);
  const was = hp(a);
  const ev = fire(a, 'spike encryptor');
  assert.ok(ev.some((e) => e.type === 'cut' && e.cut && e.target === 'encryptor'), 'interrupted');
  assert.ok(ev.some((e) => e.tell === ta.id && e.answered), 'called off');
  assert.ok(ev.some((e) => e.type === 'read' && e.open), 'a read: the part is Open');
  assert.ok(part(a, 'encryptor').openUntil >= a.encounter.cycle, 'still open next cycle');
  assert.equal(hp(a), was, 'nothing landed');
  // A hit that doesn't cross a tick does its damage, and the charge stays.
  const b = fight({ level: 12, cls: 'bastion' });
  quietParts(b);
  bare(b, 'encryptor');
  const tb = tell(b, 'fulldisk', 'encryptor', 0);
  fire(b, 'spike encryptor');
  assert.ok(b.logs.some((e) => e.tell === tb.id && e.missed), 'not crossed: it lands');
  // Any damage crosses, a burn too, and it still cuts the charge (no read XP: a burn isn't your command).
  const c = fight({ level: 12, cls: 'bastion' });
  quietParts(c);
  edge(c, 'encryptor');
  const tc = tell(c, 'fulldisk', 'encryptor', 0);
  c.encounter.burns.push({ id: 'inject', target: 'encryptor', damage: 5, grow: 0, left: 9, name: 'Inject', drain: 0 });
  hold(c);
  assert.ok(c.logs.some((e) => e.tell === tc.id && e.answered), 'a burn crossing the tick on its cycle cuts it too');
});

test('on its cycle: a cut before a charge lands spends the tick for nothing, and the charge stays; a cast\'s window is two cycles', () => {
  const s = fight({ level: 12, cls: 'bastion' });
  quietParts(s);
  edge(s, 'encryptor');
  const t = tell(s, 'fulldisk', 'encryptor', 2);
  const ev = fire(s, 'spike encryptor');
  assert.ok(ev.some((e) => e.type === 'tick-wasted' && e.target === 'encryptor'), 'crossed with nothing due: the tick is spent');
  assert.ok(t.told, 'and the charge still comes');
  // A cast: answered on the cycle it lands or the one before, by a cut too.
  const c = fight({ level: 12, opts: { elite: true } });
  quietParts(c);
  edge(c, 'encryptor');
  const tc = tell(c, 'extortion', 'encryptor', 1);
  assert.equal(tellIntents(c).find((x) => x.id === tc.id).winFrom, 0, 'a cycle ahead: open now');
  const ev2 = fire(c, 'spike encryptor');
  assert.ok(ev2.some((e) => e.type === 'cut' && e.cut) && !tc.told, 'a cut in its window stops the cast');
});

test('◆ guards the ticks: a hit on ◆ crosses nothing, so strip the charging part first, or pierce it', () => {
  const s = fight({ level: 12 });
  quietParts(s);
  const enc = Object.assign(edge(s, 'encryptor'), { armor: 3, maxArmor: 3 });
  const t = tell(s, 'fulldisk', 'encryptor', 0);
  assert.match(tellIntents(s).find((x) => x.id === t.id).answer, /past its 3 ◆/);
  fire(s, 'spike encryptor');
  assert.equal(enc.armor, 2, 'the hit broke a ◆');
  assert.ok(s.logs.some((e) => e.tell === t.id && e.missed), 'and crossed nothing: it lands');
  // Stripped the cycle before, the cut lands on its cycle.
  const b = fresh(); b.hackers = { breaker: { level: 12, xp: 0 } };
  b.run = { loc: 'sim', cwd: '/srv', integrity: 3000, max: 3000, pack: [], visited: ['/'] };
  selectEncounter(b, 'bouncer', 3, { mode: 'run', room: '/srv', level: 12 });
  command(b, 'engage');
  quietParts(b);
  const gate = Object.assign(edge(b, 'pulse'), { armor: 2, maxArmor: 2 });
  const tr = tell(b, 'ram', 'pulse', 1);
  b.encounter.readyAt = {};
  fire(b, 'crack pulse');
  assert.equal(gate.armor, 0, 'Crack strips the Gate');
  assert.ok(fire(b, 'spike pulse').some((e) => e.tell === tr.id && e.answered), 'then the cut on its cycle calls it off');
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

test('a cast: SIGINT in its window stops it and the part is Open; a cut in it stops it too; ignored, it compiles a buff for 4 cycles', () => {
  const s = fight({ level: 12, opts: { elite: true } });
  quietParts(s);
  const t = tell(s, 'extortion', 'encryptor', 2);
  assert.equal(keyMap(s)['-'], 'sigint');
  assert.match(command(s, 'sigint').at(-1).message, /Too early/, 'its window (its last two cycles) isn\'t open yet');
  hold(s);
  const ev = fire(s, 'sigint');
  assert.ok(ev.some((e) => e.type === 'interrupt' && e.tell === t.id), 'SIGINT stops it');
  assert.ok(ev.some((e) => e.type === 'read' && e.open), 'read: the Encryptor is Open');
  // Command hits alone don't stop it any more: only a cut (a tick crossed) does.
  const s2 = fight({ level: 12, opts: { elite: true } });
  quietParts(s2);
  bare(s2, 'encryptor');
  const t2 = tell(s2, 'extortion', 'encryptor', 1);
  fire(s2, 'spike encryptor');
  assert.ok(t2.told, 'a hit that crosses nothing');
  const s3 = fight({ level: 12, opts: { elite: true } });
  quietParts(s3);
  edge(s3, 'encryptor');
  const t3 = tell(s3, 'extortion', 'encryptor', 1);
  assert.ok(fire(s3, 'spike encryptor').some((e) => e.tell === t3.id && e.answered), 'a cut out of its compile');
  // Ignored: Double Extortion, harder hits for 4 cycles, and back after.
  const c = fight({ level: 12, opts: { elite: true } });
  quietParts(c);
  const pulse = part(c, 'pulse'), base = pulse.attack.amount;
  tell(c, 'extortion', 'encryptor', 0);
  hold(c);
  assert.equal(pulse.attack.amount, Math.round(base * TELL.loud), 'Double Extortion: harder hits');
  hold(c, TELL.castLasts);
  assert.equal(pulse.attack.amount, base, 'and back after it runs out');
  // Nothing compiling: SIGINT finds nothing.
  const s4 = fight({ level: 12 });
  quietParts(s4);
  for (const x of tellsOf(s4).list) x.told = false;
  assert.match(command(s4, 'sigint').at(-1).message, /Nothing is compiling/);
});

test('a seal is a dial: each ◆ its part still wears when it lands gives one ◆ back to every part, never past its max; strip it first and the strip is ready again', () => {
  const s = fight({ level: 18, opts: { elite: true } });
  retell(s, 2);
  quietParts(s);
  const enc = part(s, 'encryptor'), pulse = part(s, 'pulse');
  tell(s, 'keyrotation', 'encryptor', 1);
  const max = enc.maxArmor;
  assert.ok(max >= 4, `the Encryptor wears ${max} ◆`);
  enc.armor = 2; pulse.armor = 0; pulse.maxArmor = 3; pulse.patchAt = 99;
  hold(s, 2);
  assert.equal(enc.maxArmor, max, 'no ◆ more on its max');
  assert.equal(enc.armor, 4, 'its own 2 ◆ come back on it');
  assert.equal(pulse.armor, 2, 'and on the stripped Pulse Node, 2 of its 3');
  // Stripped first, with Crack: the seal fails, and Crack is ready again.
  const s2 = fight({ level: 18, opts: { elite: true } });
  retell(s2, 2);
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
  const pick = (seed) => createVirus('random', seed, { family: 'ghostroot', threat: 9 + 12, classic: true }).parts.some((p) => p.mimic);
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

test('MIRRORSHADE\'s Mimic sits on its Scramble: while you\'re Scrambled it plays your hit back twice over', () => {
  const played = (scrambled) => {
    const s = fight({ level: 14, family: 'ghostroot', opts: { boss: 'nb-mirrorshade', name: 'MIRRORSHADE' } });
    quietParts(s);
    tell(s, 'mimic', 'mimic', 0);
    for (const p of livingParts(s)) Object.assign(p, { armor: 0, maxArmor: 0, integrity: 999, max: 999 });
    if (scrambled) s.encounter.scrambleUntil = s.encounter.cycle + 1;
    const before = hp(s);
    fire(s, 'overload pulse');
    return before - hp(s);
  };
  const chance = CONFIG.scramble.chance;
  CONFIG.scramble.chance = 0; // no self-hits from the Scramble: only the playback lands
  try {
    const plain = played(false), loud = played(true);
    assert.ok(plain > 0, 'its Overload came back at it');
    assert.ok(Math.abs(loud - 2 * plain) <= 1, `twice over while Scrambled: ${loud} against ${plain}`);
  } finally { CONFIG.scramble.chance = chance; }
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

test('the classic shape (a fixture, a boss, a designed set): the third part comes from a pool from level 8, by its seed; a boss keeps the classic one', () => {
  for (const [family, pool] of [['ransomware', ['lockbox', 'mutex']], ['worm', ['mirror', 'c2']], ['ghostroot', ['decoy', 'mimic']]]) {
    const seen = new Set();
    for (let seed = 1; seed <= 40; seed++) {
      const v = createVirus('random', seed, { family, threat: 9 + 12, classic: true });
      const third = v.parts.filter((p) => FAMILIES[family].parts.find((x) => x.id === p.id)?.pool === 'third');
      assert.equal(third.length, 1, `${family} ${seed}: one third part`);
      seen.add(third[0].id);
    }
    assert.deepEqual([...seen].sort(), [...pool].sort(), family);
    assert.ok(createVirus('random', 3, { family, threat: 9 + 5, classic: true }).parts.some((p) => p.id === pool[0]), 'below 8: the classic one');
    assert.ok(createVirus('random', 5, { family, threat: 9 + 12, boss: 'resident' }).parts.some((p) => p.id === pool[0]), 'a boss: the classic one');
  }
  assert.ok(Array.from({ length: 40 }, (_, i) => createVirus('random', i + 1, { family: 'ransomware', threat: 9 + 22, classic: true })).some((v) => v.parts.some((p) => p.id === 'tripwire')), 'the Tripwire from 20');
});

const withPart = (family, id, level = 22) => Array.from({ length: 60 }, (_, i) => i + 1).find((seed) => createVirus('random', seed, { family, threat: 9 + level, classic: true }).parts.some((p) => p.id === id));

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

test('the board shows a tell in its attack\'s cell even while the part is veiled, with exactly what answers it and when', () => {
  const s = fight({ level: 12, family: 'ghostroot' });
  quietParts(s);
  const sc = part(s, 'scrambler');
  assert.ok(sc.veiled && sc.armor > 0);
  const t = tell(s, 'possession', 'scrambler', 2);
  const html = boardMarkup(s, null);
  assert.match(html, /intent tell t-charge/);
  assert.match(html, /POSSESSION|Possession/);
  assert.match(html, new RegExp(`▸ Cut past ◆${sc.armor} or SIGINT<`), 'the cut, past its ◆, or SIGINT (the kick line says when)');
  assert.match(html, /<span class="tl-when">in 2<\/span>/);
  assert.doesNotMatch(html, /tl-win/, 'not on its cycle yet');
  assert.match(html, new RegExp(`title="Possession: [^"]*\n▸ Take the Scrambler under 50% in 2 cycles, past its ${sc.armor} ◆, or SIGINT it\\."`), 'the tooltip: what it does, then how to stop it and when');
  hold(s, 2);
  const now = boardMarkup(s, null);
  assert.match(now, /intent tell t-charge now win/, 'its cycle: the chip is lit');
  assert.match(now, /<b class="tl-win">NOW<\/b>/);
  assert.match(now, /under 50% this cycle/);
  // A cast's window is two cycles: the cell before it lands is marked, lit while you're in it.
  const cast = fight({ level: 12, opts: { elite: true } });
  quietParts(cast);
  tell(cast, 'extortion', 'encryptor', 1);
  const ch = boardMarkup(cast, null);
  assert.match(ch, /Casting[\s\S]*SIGINT or cut</);
  assert.match(ch, /title="Double Extortion: Every attack deals 35% more damage for 4 cycles\.[^"]* Can be interrupted now until it lands next cycle\.\n▸ SIGINT it, or take the Encryptor under 50%\."/);
  assert.match(ch, /tl-window live[^>]*><span class="tw-word">Window · <\/span>now/, 'the window marked on the timeline');
});

test('bots read tells: the planner cuts a charging part on its cycle (before any other cut), SIGINTs a cast, and goes quiet on the Mimic\'s beat; one that ignores them doesn\'t', () => {
  const s = fight({ level: 12 });
  quietParts(s);
  for (const p of livingParts(s)) if (p.ward || p.lock) p.integrity = 0; // no Lockbox or Mutex to finish first
  s.server.max = s.server.integrity = 200;
  edge(s, 'encryptor', 400); edge(s, 'pulse', 400); // nothing breaks this cycle
  part(s, 'pulse').attack.due = s.encounter.cycle; part(s, 'pulse').attack.amount = 40; // the bigger plain attack, due now too
  part(s, 'encryptor').attack = { name: 'Encrypt', effect: 'damage', amount: 25, interval: 5, due: 999 };
  tell(s, 'fulldisk', 'encryptor', 0);
  TELL.bots.answer = false;
  let plain;
  try { plain = planner(s); } finally { TELL.bots.answer = true; }
  assert.doesNotMatch(plain, / encryptor$/, `a bot that ignores tells cuts the bigger plain attack (${plain})`);
  assert.match(planner(s), / encryptor$/, 'a bot that reads them cuts the charging Encryptor');
  const c = fight({ level: 12, opts: { elite: true } });
  quietParts(c);
  c.server.max = c.server.integrity = 200;
  for (const p of livingParts(c)) if (p.ward || p.lock) p.integrity = 0;
  tell(c, 'extortion', 'encryptor', 1);
  assert.equal(planner(c), 'sigint');
  const seed = Array.from({ length: 50 }, (_, i) => i + 1).find((x) => createVirus('random', x, { family: 'ghostroot', threat: 21, classic: true }).parts.some((p) => p.mimic));
  const g = fight({ level: 12, family: 'ghostroot', seed });
  quietParts(g);
  for (const p of livingParts(g)) Object.assign(p, { armor: 0, maxArmor: 0, integrity: 999, max: 999 }); // nothing breaks this cycle
  tell(g, 'mimic', 'mimic', 0);
  const cmd = planner(g), id = cmd.split(' ')[0];
  assert.ok(!(ABILITIES[id]?.damage > 0 && ABILITIES[id]?.verb === 'hit'), `quiet on the beat: ${cmd}`);
});

test('the stagger: a solo boss stays Open but keeps its clock, and an attack another charge rides keeps its cycle', () => {
  const b = fight({ level: 14, family: 'ghostroot', opts: { boss: 'nb-mirrorshade', name: 'MIRRORSHADE' } });
  quietParts(b);
  const sc = bare(b, 'scrambler');
  const tb = tell(b, 'persistence', 'scrambler', 1);
  sc.attack.due = b.encounter.cycle + 1;
  const ev = fire(b, 'sigint');
  assert.ok(ev.some((e) => e.type === 'read' && e.open && !e.stagger), 'Open, no delay');
  assert.equal(sc.attack.due, b.encounter.cycle, 'its Scramble lands when it was due');
  assert.ok(!tb.told);
  // A cast read on a part whose next attack carries a charge: the charge keeps its cycle.
  const s = fight({ level: 18 });
  quietParts(s);
  const enc = bare(s, 'encryptor');
  enc.attack = { name: 'Encrypt', effect: 'damage', amount: 20, interval: 6, due: s.encounter.cycle + 2, n: 0 };
  const T = tellsOf(s);
  for (const x of T.list) { x.told = false; x.after = 999; }
  const cast = T.list.find((x) => x.id === 'extortion'), charge = T.list.find((x) => x.id === 'fulldisk');
  Object.assign(cast, { part: 'encryptor', told: true, said: s.encounter.cycle, next: s.encounter.cycle + 1, n: null, wound: 0, need: 2, hitBy: [], after: 999 });
  Object.assign(charge, { part: 'encryptor', told: true, said: s.encounter.cycle, next: s.encounter.cycle + 2, n: 0, wound: 0, need: 50, hitBy: [], after: 999 });
  const due = enc.attack.due;
  fire(s, 'sigint');
  assert.equal(enc.attack.due, due, 'Full Disk still lands when it was said to');
});

test('bots strip a charging part the cycle before its charge, so the cut can land on its cycle', () => {
  const s = fight({ level: 16 });
  quietParts(s);
  for (const p of livingParts(s)) if (p.ward || p.lock || p.twin) p.integrity = 0;
  const enc = Object.assign(edge(s, 'encryptor', 400), { armor: 1, maxArmor: 6 });
  enc.attack = { name: 'Encrypt', effect: 'damage', amount: 30, interval: 6, due: 999 };
  tell(s, 'fulldisk', 'encryptor', 1);
  const cmd = planner(s);
  assert.match(cmd, / encryptor$/, `it strips the Encryptor now (${cmd})`);
});

test('bots keep a tick for a charge: no cut wasted on the charging part before its cycle, then the cut on it', () => {
  const s = fight({ level: 12 });
  quietParts(s);
  for (const p of livingParts(s)) if (p.ward || p.lock || p.twin) p.integrity = 0;
  const enc = edge(s, 'encryptor');
  enc.attack = { name: 'Encrypt', effect: 'damage', amount: 30, interval: 6, due: 999 };
  bare(s, 'pulse');
  const t = tell(s, 'fulldisk', 'encryptor', 2);
  const fired = [];
  for (let i = 0; i < 3 && t.told; i++) { const cmd = planner(s); fired.push(cmd); command(s, cmd); resolveCycle(s); }
  assert.ok(!s.logs.some((e) => e.type === 'tick-wasted' && e.target === 'encryptor'), `no tick wasted on it (${fired.join(', ')})`);
  assert.ok(s.logs.some((e) => e.tell === t.id && e.answered), `cut on its cycle (${fired.join(', ')})`);
  assert.ok(fired.at(-1).endsWith(' encryptor'), `the cut (${fired.at(-1)})`);
});

// The situational skills are the natural answers to particular tells (docs/skills.md).
test('situational answers: Segfault triples on a charging part (and its hit cuts it), Suspend drains a charge, Quarantine stops a cast, Hijack steals a charge, Blackhole eats one', () => {
  // Segfault: 30, ×3 on a part winding up a charge, and across its tick on that cycle it calls it off.
  const s = fight({ level: 18, cls: 'breaker' });
  s.loadout.sub = { [s.loadout.archetype]: 'overclocker' };
  quietParts(s);
  const enc = edge(s, 'encryptor', 999);
  enc.integrity = 560;
  const t = tell(s, 'fulldisk', 'encryptor', 0);
  s.loadout.equipped.overclocker = ['overload', 'flood', 'exploit', 'crack', 'overvolt', 'segfault', 'thermal-throttle'];
  const was = enc.integrity;
  fire(s, 'segfault encryptor');
  assert.ok(was - enc.integrity >= 30 * 3, 'three times');
  assert.ok(!t.told, 'called off');
  // Suspend (Warden): the charge drains out, and it lands plain later.
  const w = fight({ level: 18, cls: 'bastion' });
  w.loadout.sub = { [w.loadout.archetype]: 'warden' };
  quietParts(w);
  const tw = tell(w, 'fulldisk', 'encryptor', 0); // on its cycle
  const ev = fire(w, 'suspend encryptor');
  assert.ok(ev.some((e) => e.tell === tw.id && e.answered) && !tw.told, 'drained');
  // Quarantine (Warden, 30) stops a cast.
  const q = fight({ level: 30, cls: 'bastion' });
  q.loadout.sub = { [q.loadout.archetype]: 'warden' };
  quietParts(q);
  q.loadout.equipped.warden = ['rate-limit', 'firewall', 'purge', 'retaliate', 'quarantine'];
  const tq = tell(q, 'extortion', 'encryptor', 1); // in its window
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

test('situational answers to seals and casts: Bit Rot and Cache Poison fail a seal; Thermal Runaway\'s burn and Kill Switch\'s helpers cut a tell like any damage', () => {
  const r = fight({ level: 34, opts: { elite: true } });
  retell(r, 2);
  r.loadout.sub = { [r.loadout.archetype]: 'demolitionist' };
  quietParts(r);
  r.loadout.equipped.demolitionist = ['overload', 'flood', 'exploit', 'crack', 'bit-rot'];
  const enc = part(r, 'encryptor');
  enc.armor = enc.maxArmor = 7; // Bit Rot's hit breaks two, and the rot one a cycle: the shell is still up when the seal lands
  const tr = tell(r, 'keyrotation', 'encryptor', 2);
  fire(r, 'bit-rot encryptor');
  hold(r, 2);
  assert.ok(r.logs.some((e) => e.tell === tr.id && /rotting/.test(e.message)), 'a rotting part can\'t seal');
  const c = fight({ level: 30, cls: 'operator', opts: { elite: true } });
  retell(c, 2);
  c.loadout.sub = { [c.loadout.archetype]: 'hijacker' };
  quietParts(c);
  c.loadout.equipped.hijacker = ['deploy', 'hook', 'spawn', 'botnet', 'cache-poison'];
  const ce = part(c, 'encryptor');
  ce.armor = ce.maxArmor = 6; ce.integrity = ce.max = 999; // the poison's own bite breaks a ◆ a cycle on armor
  const tc = tell(c, 'keyrotation', 'encryptor', 2);
  fire(c, 'cache-poison encryptor');
  hold(c, 2);
  assert.ok(c.logs.some((e) => e.tell === tc.id && /poisoned/.test(e.message)) && ce.integrity < 999, 'a poisoned seal fails and hurts');
  // Thermal Runaway: its hit and its ticks cross the casting part's tick in the cast's window.
  const d = fight({ level: 22, cls: 'breaker' });
  d.loadout.sub = { [d.loadout.archetype]: 'demolitionist' };
  quietParts(d);
  edge(d, 'encryptor', 999);
  d.loadout.equipped.demolitionist = ['overload', 'flood', 'exploit', 'crack', 'thermal-runaway'];
  const td = tell(d, 'extortion', 'encryptor', 1); // its window: this cycle and next
  fire(d, 'thermal-runaway encryptor');
  hold(d);
  assert.ok(!td.told, 'stopped');
  // Kill Switch: the helpers it cashes in cross the charging part's tick on its cycle.
  const k = fight({ level: 18, cls: 'operator' });
  k.loadout.sub = { [k.loadout.archetype]: 'herder' };
  quietParts(k);
  const ke = bare(k, 'encryptor');
  const tk = tell(k, 'fulldisk', 'encryptor', 1);
  fire(k, 'deploy encryptor');
  Object.assign(ke, { integrity: 505, ticks: [{ at: 0.5, spent: false }, { at: 0.25, spent: false }] });
  fire(k, 'kill-switch');
  assert.ok(!tk.told, 'cashed in on its cycle: called off');
});

test('a fight\'s metrics count what its tells did (the gap test reads them)', () => {
  const s = fight({ level: 18, seed: 5 });
  for (let i = 0; i < 40 && active(s); i++) { command(s, planner(s) || 'hold'); resolveCycle(s); }
  const r = s.reports.at(-1);
  assert.ok(r.tells && Object.values(r.tells).some((x) => x.said > 0));
  assert.ok(tellLog(s).length > 0);
});

test('the log\'s tell lines are as short as the chip\'s tooltip: what, when, on which part, and the answer', () => {
  // A charge, said 3 ahead: cut it on that cycle (past its ◆ when it wears them).
  const s = fight({ level: 12 });
  quietParts(s);
  const enc = part(s, 'encryptor');
  Object.assign(enc, { armor: 2, maxArmor: 2 });
  const t = tell(s, 'fulldisk', 'encryptor', 3);
  assert.equal(sayOf(s, t), 'The Encryptor\'s FULL DISK lands in 3 cycles. Cut it on that cycle, past its 2 ◆.');
  enc.armor = 0;
  assert.equal(sayOf(s, t), 'The Encryptor\'s FULL DISK lands in 3 cycles. Cut it on that cycle.');
  // A cast, a seal, the breach's Lock, and the Mimic's beat.
  const c = fight({ level: 12, opts: { elite: true } }); quietParts(c);
  assert.equal(sayOf(c, tell(c, 'extortion', 'encryptor', 2)), 'The Encryptor\'s DOUBLE EXTORTION lands in 2 cycles. SIGINT or cut it in its window.');
  assert.equal(sayOf(c, tell(c, 'extortion', 'encryptor', 1)), 'The Encryptor\'s DOUBLE EXTORTION lands next cycle. SIGINT or cut it in its window, open now.');
  retell(c, 4, ['fulldisk', 'extortion', 'keyrotation', 'lock']); quietParts(c);
  const armor = Object.assign(part(c, 'encryptor'), { armor: 3, maxArmor: 3 }).armor;
  assert.equal(sayOf(c, tell(c, 'keyrotation', 'encryptor', 2)), `The Encryptor's KEY ROTATION lands in 2 cycles. Each ◆ it still wears then comes back on every part: strip its ${armor} ◆ first.`);
  assert.equal(sayOf(c, tell(c, 'lock', 'encryptor', 2)), 'The Encryptor\'s LOCK lands in 2 cycles. It locks your next command for 3 cycles. Break it, or feed it a cooling skill.');
  const seed = Array.from({ length: 50 }, (_, i) => i + 1).find((x) => createVirus('random', x, { family: 'ghostroot', threat: 9 + 12, classic: true }).parts.some((p) => p.mimic));
  const m = fight({ level: 12, family: 'ghostroot', seed }); quietParts(m);
  assert.equal(sayOf(m, tell(m, 'mimic', 'mimic', 2)), 'The Mimic plays you back in 2 cycles. It copies what you fire then. Go quiet, or cut it.');
  // The cut, in a fight: the interrupt's line and the call-off.
  const g = fight({ level: 12, cls: 'bastion' }); quietParts(g); edge(g, 'encryptor');
  const tg = tell(g, 'fulldisk', 'encryptor', 0);
  const ev = fire(g, 'spike encryptor');
  assert.equal(ev.find((e) => e.tell === tg.id && e.answered).message, 'Cut: FULL DISK called off.');
  assert.match(ev.find((e) => e.type === 'cut').message, /^INTERRUPTED\. You take the Encryptor under half\. Its Full Disk is cancelled\.$/);
  // Every announcement in real fights, every family: one short line (its part's tell, when it lands, the answer).
  for (const [family, level] of [['ransomware', 12], ['worm', 17], ['ghostroot', 12], ['ransomware', 8]]) {
    const r = fight({ level, family, seed: 3 });
    for (let i = 0; i < 14 && active(r); i++) hold(r);
    const said = r.logs.filter((e) => e.type === 'telegraph' && e.tell && !e.window);
    assert.ok(said.length, `${family} ${level}: a tell was said`);
    for (const e of said) {
      assert.ok(e.message.length <= 100, `${family} ${level}: short (${e.message.length}): ${e.message}`);
      assert.match(e.message, /^The [A-Za-z0-9 -]+(?:'s [A-Z][A-Z0-9' -]+ lands| plays you back) (this cycle|next cycle|in \d+ cycles)\. /, e.message);
      assert.doesNotMatch(e.message, /Deal \d+|break \d+ ◆ in its window|hit it twice/, e.message);
      assert.ok(e.message.includes(e.name) || e.kind === 'mimic', `the event names the tell (app.js floats it): ${e.name}`);
    }
    for (const e of r.logs.filter((x) => x.type === 'telegraph' && x.tell && x.window)) assert.match(e.message, /^[A-Z][A-Z0-9' -]+'s window is open\.$/);
  }
});


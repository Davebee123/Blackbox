// Routines (docs/routines.md R1, routines.mjs): a program per class and subclass (the planner's rotation and your
// handler stack) moves when the timer runs out. It fires only what the board shows and only the WHEN chips your
// research has opened, never in the Sync Window, never a long cooldown unless a handler names it; a part, mutation or
// tell it doesn't cover throws an exception and it holds; anything you type overrides it; RAM limits the stack; the
// rails jack you out at your line and stop a walk before danger; a program's fight pays what the same fight pays you;
// an old save loads with the defaults.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, advance, selectEncounter, part, livingParts, attackers, hooks, active, restore, cycleLength, codexKey, barKeys, finish } from './dist/combat.mjs';
import { CONFIG, FAMILIES } from './dist/data.mjs';
import * as FP from './dist/floorplan.mjs';
import { play } from './dist/run.mjs';
import { planner } from './dist/planner.mjs';
import * as R from './dist/routines.mjs';
import { programMarkup } from './dist/routines-view.mjs';
import { boardMarkup, loadoutMarkup, logMarkup } from './dist/view.mjs';
import { TIPS } from './dist/tips.mjs';
import { TIER } from './dist/research.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.baseCrit = 0;
let clock = Date.UTC(2026, 0, 1);
hooks.now = () => clock;
R.installPrograms();

const FAMS = ['ransomware', 'worm', 'ghostroot'];
// Research every part of the home families to a tier (60: mastered, so no part or tell throws).
const study = (s, n = 60) => { s.research = {}; s.researchScale = 3; for (const f of FAMS) for (const p of FAMILIES[f].parts) s.research[`${f}:${p.id}`] = n; };
function fight({ cls = 'breaker', level = 14, family = 'ransomware', seed = 7, research = 60, opts = {} } = {}) {
  const s = fresh();
  FP.outfit(s, { cls, level });
  study(s, research);
  selectEncounter(s, 'random', seed, { level, family, mutation: null, classic: true, ...opts });
  command(s, 'engage');
  s.server.max = s.server.integrity = 5000;
  return s;
}
const since = (s, n) => s.logs.filter((e) => e.id > n);
const cycle = (s) => { const n = s.serial; resolveCycle(s); return since(s, n); };
const mine = (ev) => ev.filter((e) => e.type === 'resolved' && !e.who);

test('RAM comes from class level: 4 at level 1, 10 at 50; a plain handler costs 1, a rule chip 2, a mastered chip 3, a long cooldown 1 more', () => {
  assert.equal(R.ramOf(1), 4);
  assert.equal(R.ramOf(30), 8);
  assert.equal(R.ramOf(50), 10);
  for (let l = 2; l <= 50; l++) assert.ok(R.ramOf(l) >= R.ramOf(l - 1), `level ${l} never loses RAM`);
  const s = fight();
  assert.equal(R.handlerRam(s, { when: 'always', do: 'spike', target: 'soonest' }), 1);
  assert.equal(R.handlerRam(s, { when: 'ransomware:encryptor:due', do: 'crack', target: 'that' }), 2);
  assert.equal(R.handlerRam(s, { when: 'ransomware:encryptor:pretell', do: 'crack', target: 'that' }), 3);
  assert.equal(R.handlerRam(s, { when: 'always', do: 'flood', target: 'soonest' }), 2, 'Flood (cooldown 6) costs 1 more');
});

test('RAM limits the stack: an add past it is refused, and a handler past it (an old stack) sits out', () => {
  const s = fight({ level: 1 });
  assert.equal(R.ramFor(s), 4);
  for (let i = 0; i < 4; i++) command(s, 'program add always spike soonest');
  assert.equal(R.programOf(s).handlers.length, 4);
  const ev = command(s, 'program add always spike lowest');
  assert.match(ev.find((e) => e.type === 'warning').message, /needs 5 RAM\. You have 4/);
  assert.equal(R.programOf(s).handlers.length, 4);
  R.programOf(s).handlers.push({ when: 'always', do: 'spike', target: 'lowest' });
  const rows = R.handlerRows(s);
  assert.deepEqual(rows.map((r) => r.fits), [true, true, true, true, false], 'the fifth sits out');
  assert.equal(R.ramUsed(s), 4);
});

test('WHEN chips open by research: decoded its name and health, rule its timer and tell, mastered its prediction', () => {
  const s = fight({ research: 0 });
  const ref = 'ransomware:encryptor';
  const add = (when) => command(s, `program add ${when} crack that`).find((e) => e.type === 'warning')?.message || null;
  assert.match(add(`${ref}:present`), /research it first/);
  s.research[ref] = TIER.decoded;
  assert.equal(add(`${ref}:present`), null);
  assert.equal(add(`${ref}:low`), null);
  assert.match(add(`${ref}:due`), /research it first/);
  s.research[ref] = TIER.rule;
  assert.equal(add(`${ref}:due`), null);
  assert.match(add(`${ref}:pretell`), /research it first/);
  s.research[ref] = TIER.mastered;
  assert.equal(R.whenOpen(s, `${ref}:pretell`), true);
  // A handler whose chip isn't open (shared, or written for research you no longer match) never fires.
  const t = fight({ level: 4 }); // no tells yet
  t.research['ransomware:encryptor'] = TIER.decoded;
  R.programOf(t).handlers.push({ when: 'ransomware:encryptor:due', do: 'crack', target: 'that' });
  assert.equal(R.handlerRows(t)[0].runs, false);
  part(t, 'encryptor').attack.due = t.encounter.cycle;
  assert.equal(R.decide(t).handler, -1, 'the rotation plays instead');
  // The palette lists only what you've met, and shows a locked chip as locked.
  const html = programMarkup(t);
  assert.match(html, /Encryptor/);
  assert.match(html, /rt-chip rt-when locked/);
});

test('a handler fires on what the board shows: the first that fits, top to bottom, at its target; a veiled timer never counts', () => {
  const s = fight();
  const enc = part(s, 'encryptor'), pulse = part(s, 'pulse');
  for (const p of attackers(s)) p.attack.due = 999;
  command(s, 'program add ransomware:pulse:due overload that');
  command(s, 'program add ransomware:encryptor:present crack that');
  assert.deepEqual(R.decide(s), { text: 'crack encryptor', handler: 1 }, 'the first handler waits, the second fits');
  pulse.attack.due = s.encounter.cycle;
  assert.deepEqual(R.decide(s), { text: 'overload pulse', handler: 0 }, 'its attack lands now: the first fits');
  // Veiled with ◆ on: its timer is hidden, so "attacks now" can't be read.
  pulse.veiled = true; pulse.armor = Math.max(1, pulse.armor);
  assert.equal(R.decide(s).handler, 1, 'a hidden timer is not on the board');
  pulse.veiled = false;
  const ev = cycle(s);
  const r = mine(ev)[0];
  assert.equal(r.ability, 'overload'); assert.equal(r.target, 'pulse');
  assert.match(r.message, /^⟳ /, 'its move carries ⟳ in the log');
  assert.equal(r.auto, 'program');
  assert.match(logMarkup(s), /⟳ Overload pulse|⟳ overload pulse/i);
  void enc;
});

test('the program never takes the Sync Window: its move fires when the timer runs out, unsynced', () => {
  const s = fight();
  s.encounter.sync = { at: 0, width: 1 }; // the whole cycle is a window
  const n = s.serial;
  advance(s, cycleLength(s));
  const ev = since(s, n);
  assert.ok(mine(ev).length, 'it moved');
  assert.ok(!ev.some((e) => e.type === 'sync' || /SYNC/.test(e.message)), 'no sync bonus');
});

test('a long cooldown stays yours: the rotation never fires one (the planner would), a handler that names it does', () => {
  const used = { planner: new Set(), program: new Set() };
  for (const mode of ['planner', 'program']) for (let seed = 1; seed <= 9; seed++) {
    const s = fight({ seed, family: FAMS[seed % 3], opts: { classic: false } });
    R.programsOf(s).on = mode === 'program';
    for (let i = 0; i < 40 && active(s); i++) {
      if (mode === 'planner') command(s, planner(s));
      const ev = cycle(s);
      for (const e of mine(ev)) used[mode].add(e.ability);
      if (ev.some((e) => e.type === 'exception')) command(s, 'program resume');
    }
  }
  const long = [...used.planner].filter((id) => R.isLong(fight(), id));
  assert.ok(long.length, `the planner fires a long cooldown (${[...used.planner].join(', ')})`);
  for (const id of long) assert.ok(!used.program.has(id), `the rotation never fires ${id}`);
  // Named by a handler, it fires.
  const s = fight();
  command(s, 'program add always flood soonest');
  const r = mine(cycle(s))[0];
  assert.equal(r.ability, 'flood');
});

test('an uncovered part throws an exception: the program holds (no fallback move), the part is marked, and ` hands control back', () => {
  const s = fight({ research: 0, level: 2 });
  s.research['ransomware:pulse'] = TIER.decoded; // the Encryptor: never researched
  const xs = R.exceptionsOf(s);
  assert.deepEqual(xs.map((x) => x.key), ['part:ransomware:encryptor']);
  const html = boardMarkup(s);
  assert.match(html, /m-exc/, 'the part is marked');
  assert.match(html, /EXCEPTION/);
  assert.match(html, /data-command="program resume"/, 'the hand-back button');
  const ev = cycle(s);
  assert.equal(mine(ev).length, 0, 'nothing fired');
  assert.ok(ev.some((e) => e.type === 'exception' && /the Encryptor/.test(e.message)), 'the exception, once, with its cue');
  assert.ok(ev.some((e) => e.type === 'hold' && e.auto === 'program'));
  const ev2 = cycle(s);
  assert.ok(!ev2.some((e) => e.type === 'exception'), 'said once');
  assert.equal(mine(ev2).length, 0, 'it still holds');
  // You play it by hand: your command fires.
  command(s, 'spike encryptor');
  assert.equal(mine(cycle(s))[0]?.message.startsWith('⟳'), false);
  // Hand back: the program plays the rest.
  command(s, 'program resume');
  assert.equal(R.exceptionsOf(s).length, 0);
  assert.match(mine(cycle(s))[0].message, /^⟳ /);
  // A rule part decoded but not at its rule throws; a handler that names it covers it.
  const t = fight({ level: 4, opts: { genes: ['ward'] } });
  const box = livingParts(t).find((p) => p.ward), ref = codexKey(t.encounter.virus, box);
  t.research[ref] = TIER.decoded;
  command(t, 'program add always spike soonest');
  assert.deepEqual(R.exceptionsOf(t).map((x) => x.part), [box.id]);
  command(t, `program add ${ref}:present spike that`);
  assert.equal(R.exceptionsOf(t).length, 0, 'named by a handler: covered');
});

test('a mutation, a tell and a rule part need research or a handler; a boss always throws, again each phase', () => {
  const s = fight({ opts: { mutation: 'hasty' } });
  assert.ok(R.exceptionsOf(s).some((x) => x.key === 'mut:hasty'), 'an undecoded mutation');
  // A third part's rule: decoded is not enough, its rule is.
  const t = fight({ research: TIER.decoded, opts: { genes: ['mutexlock'] } });
  const mutex = livingParts(t).find((p) => p.lock);
  assert.ok(mutex, 'a Mutex in the fight');
  assert.ok(R.exceptionsOf(t).some((x) => x.part === mutex.id), 'its rule is not researched');
  t.research[codexKey(t.encounter.virus, mutex)] = TIER.rule;
  assert.ok(!R.exceptionsOf(t).some((x) => x.part === mutex.id));
  // A boss: its phase is always yours.
  const b = fresh();
  FP.outfit(b, { cls: 'breaker', level: 14 });
  study(b);
  selectEncounter(b, 'random', 3, { level: 14, family: 'ransomware', boss: 'resident', mutation: null });
  command(b, 'engage');
  assert.ok(R.exceptionsOf(b).some((x) => x.kind === 'boss'), 'the Resident throws');
  command(b, 'program resume');
  assert.ok(!R.exceptionsOf(b).some((x) => x.kind === 'boss'));
  const ph = b.encounter.virus.phases?.[0];
  if (ph) { ph.done = true; assert.ok(R.exceptionsOf(b).some((x) => x.kind === 'boss'), 'a new phase throws again'); }
});

test('anything you type overrides the program for that cycle; the board shows its next move ghosted on its target', () => {
  const s = fight();
  for (const p of attackers(s)) p.attack.due = 999;
  command(s, 'program add ransomware:encryptor:present crack that');
  const html = boardMarkup(s);
  assert.match(html, /intent mine prog ghost[^>]*data-at="encryptor"[^>]*>⟳ crack encryptor/, 'your row: the ghost');
  assert.match(html, /ghost-on[^>]*>⟳ Crack/, 'the part it will hit');
  command(s, 'spike pulse');
  assert.doesNotMatch(boardMarkup(s), /prog ghost/, 'a typed command replaces the ghost');
  const r = mine(cycle(s))[0];
  assert.doesNotMatch(r.message, /⟳|timer ran out/, 'your command');
  assert.equal(r.target, 'pulse');
  const r2 = mine(cycle(s))[0];
  assert.equal(r2.ability, 'crack', 'the next cycle is the program\'s again');
  // Off: the timer repeats your last hit, as before.
  command(s, 'program off');
  const r3 = mine(cycle(s))[0];
  assert.match(r3.message, /timer ran out/);
});

test('a program\'s fight pays what the same fight pays you: the same moves typed bring the same XP, loot and credits', () => {
  const run = (prog, moves = null) => {
    const s = fight({ level: 4, seed: 11, opts: { classic: false } });
    s.rng = 12345;
    R.programsOf(s).on = prog;
    const out = [];
    for (let i = 0; i < 60 && active(s); i++) {
      if (moves) command(s, moves[i] || 'spike ' + livingParts(s)[0].id);
      const ev = cycle(s);
      const m = mine(ev)[0];
      if (m) out.push(`${m.ability} ${m.target}`);
    }
    const xp = s.logs.filter((e) => e.type === 'xp').reduce((n, e) => n + e.amount, 0);
    const loot = s.logs.filter((e) => e.type === 'loot').map((e) => e.message.replace(/^⟳ /, ''));
    return { s, out, xp, loot, credits: s.server.credits, won: s.logs.some((e) => e.type === 'victory') };
  };
  const a = run(true);
  assert.ok(a.won, 'the program wins it');
  const b = run(false, a.out);
  assert.ok(b.won);
  assert.deepEqual(b.out, a.out, 'the same moves');
  assert.equal(a.xp, b.xp, 'the same XP');
  assert.deepEqual(a.loot, b.loot, 'the same loot');
  assert.equal(a.credits, b.credits, 'the same credits');
});

test('the rails: auto jack-out at your line, with your pack, in a fight or out of one; a walk stops before an elite', () => {
  const s = fresh();
  play(s, 'connect sprawl');
  assert.ok(s.run?.rooms);
  command(s, 'program jackout 30');
  assert.equal(R.rails(s).jackOut, 30);
  R.railCheck(s); // full Signal: the line is above you
  s.run.pack.push({ kind: 'credits', amount: 40, path: '/tmp/x', name: 'x.dat' });
  const credits = s.server.credits;
  play(s, 'cd /'); play(s, 'cd tmp'); play(s, 'attack');
  assert.ok(active(s));
  s.run.integrity = Math.floor((s.run.max || 100) * 0.25);
  const n = s.serial;
  for (const p of attackers(s)) p.attack.due = 999;
  resolveCycle(s);
  const ev = since(s, n);
  assert.ok(ev.some((e) => /AUTO JACK OUT/.test(e.message)), 'it jacks you out');
  assert.equal(s.run, null, 'home');
  assert.ok(s.server.credits >= credits + 40, 'with your pack');
  // Off: nothing.
  const t = fresh();
  play(t, 'connect sprawl');
  R.railCheck(t);
  t.run.integrity = 1;
  assert.equal(R.railCheck(t), false, 'off by default');
  // Stop before danger: a walk of more than one room waits before an elite.
  const u = fresh();
  u.rng = 7 * 7777;
  FP.outfit(u, { cls: 'breaker', level: 10 });
  FP.startRooms(u, { seed: 7, size: 'large', level: 10 });
  FP.connect(u);
  const g = u.rooms.graph, d = FP.distances(g, g.entry);
  const elite = FP.roomList(u).filter((r) => r.kind === 'elite').sort((a, b) => d[b.id] - d[a.id])[0];
  assert.ok(elite && d[elite.id] >= 2, 'an elite two rooms off');
  for (const r of FP.roomList(u)) { u.rooms.seen[r.id] = 'kind'; if (r.id !== elite.id && FP.FIGHTS.includes(r.kind)) u.rooms.down[r.id] = clock; }
  assert.equal(R.rails(u).danger, true, 'on by default');
  const m = u.serial;
  FP.walkToRoom(u, elite.path);
  assert.notEqual(u.rooms.at, elite.id, 'it never walks in');
  assert.ok(FP.neighbours(g, u.rooms.at).includes(elite.id), 'it waits next door');
  assert.ok(since(u, m).some((e) => e.type === 'rail' && /Stopped before/.test(e.message)), 'with a cue');
  assert.ok(!active(u));
  FP.go(u, elite.id);
  assert.equal(u.rooms.at, elite.id, 'one step of your own goes in');
  void finish;
});

test('programs are per class and per subclass on the save; an old save loads with the defaults', () => {
  const s = fight({ level: 4 });
  command(s, 'program add always spike soonest');
  assert.equal(R.programKey(s), 'breaker');
  FP.outfit(s, { cls: 'breaker', level: 14 });
  assert.equal(R.programKey(s), 'demolitionist');
  assert.equal(R.programOf(s).handlers.length, 1, 'a subclass starts from its class\'s program');
  command(s, 'program add always crack soonest');
  assert.equal(R.programOf(s, 'breaker').handlers.length, 1, 'each keeps its own');
  const back = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(R.programOf(back, 'demolitionist').handlers.length, 2, 'saved');
  const old = JSON.parse(JSON.stringify(fresh()));
  delete old.programs;
  const o = restore(old);
  assert.deepEqual(R.programsOf(o).rails, { jackOut: 0, danger: true });
  assert.equal(R.programsOf(o).on, true);
  assert.deepEqual(R.programOf(o).handlers, []);
});

test('the Program tab: the stack, RAM, the chips and the rails on one page; a tip for it', () => {
  const s = fight();
  command(s, 'program add ransomware:encryptor:due crack that');
  const html = loadoutMarkup(s, null, 'program');
  for (const k of ['rt-stack', 'rt-ram', 'data-rt-drop="when:0"', 'data-rt-set="1 when"', 'data-rt-drag="do:', 'data-rt-drag="target:', 'program jackout 30', 'program danger off', 'rotation']) assert.ok(html.includes(k), k);
  assert.match(html, /data-ltab="program"/);
  const tip = TIPS.find((t) => t.id === 'program-editor');
  assert.ok(tip && tip.text.length <= 200);
  void barKeys;
});

// Routines (docs/routines.md R1, routines.mjs): from class level 5, a program per class and subclass keeps a routine
// per virus (a Codex body) and the planner's rotation for the rest; the fight's virus picks the routine, each with its
// own RAM. It fires only what the board shows and only the WHEN chips your research has opened, never in the Sync
// Window, never a long cooldown unless a handler names it. In a fight against a virus whose routine you made or
// confirmed, a part it doesn't cover is yours to play: the program plays the rest and never targets it (a boss: the
// whole fight is yours). Presets fill a routine from the virus's parts; anything you type overrides it; the rails jack
// you out at your line and stop a walk before danger; a program's fight pays what the same fight pays you; an old save
// loads with the defaults, an R1 stack moved into its viruses' routines.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, advance, selectEncounter, part, livingParts, attackers, hooks, active, restore, cycleLength, codexKey, barKeys, finish, armorTakes as armorTakesHit } from './dist/combat.mjs';
import { CONFIG, FAMILIES, ABILITIES } from './dist/data.mjs';
import * as FP from './dist/floorplan.mjs';
import { play } from './dist/run.mjs';
import { planner } from './dist/planner.mjs';
import * as R from './dist/routines.mjs';
import { programMarkup } from './dist/routines-view.mjs';
import { boardMarkup, hudMarkup, loadoutMarkup, logMarkup } from './dist/view.mjs';
import { codexPageMarkup } from './dist/codex-view.mjs';
import { TIPS } from './dist/tips.mjs';
import { TIER } from './dist/research.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.baseCrit = 0;
let clock = Date.UTC(2026, 0, 1);
hooks.now = () => clock;
R.installPrograms();

const FAMS = ['ransomware', 'worm', 'ghostroot'];
// Research every part of the home families to a tier (60: mastered, so no part or tell is left to you).
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
const warning = (ev) => ev.find((e) => e.type === 'warning')?.message || null;

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

test('routines open at class level 5: below it the tab is locked, commands refuse, nothing is left to you and the timer repeats your last hit', () => {
  assert.equal(R.ROUTINES.unlockLevel, 5);
  const s = fight({ level: 4, research: 0 });
  assert.equal(R.unlocked(s), false);
  for (const c of ['program', 'program add always spike soonest', 'program jackout 30', 'program worm preset lowest', 'program on']) assert.equal(warning(command(s, c)), 'Routines unlock at level 5.', c);
  assert.equal(R.routineOf(s, 'ransomware').handlers.length, 0);
  R.routineOf(s, 'ransomware').confirmed = true; // even a confirmed routine: nothing throws below 5
  assert.deepEqual(R.exceptionsOf(s), [], 'no exceptions');
  assert.equal(R.decide(s), null);
  command(s, 'spike pulse');
  cycle(s);
  const ev = cycle(s);
  assert.match(mine(ev)[0].message, /timer ran out/, 'the old fallback: your last hit again');
  assert.ok(!ev.some((e) => e.type === 'exception'));
  const tab = loadoutMarkup(s, null, 'program');
  assert.match(tab, /data-ltab="program"[^>]*aria-disabled="true"[^>]*title="Routines unlock at level 5\."/, 'the tab, greyed, with its tooltip');
  assert.match(programMarkup(s), /rt-locked[\s\S]*Routines unlock at level 5\./, 'a short locked state');
  assert.doesNotMatch(programMarkup(s), /rt-stack|rt-presets/);
  s.research['ransomware:encryptor'] = TIER.decoded;
  s.met = { ransomware: true };
  assert.doesNotMatch(codexPageMarkup(s, 'family:ransomware'), /cx-handler/, 'no + handler in the Codex');
  // Level 5: it opens.
  FP.outfit(s, { cls: 'breaker', level: 5 });
  assert.equal(R.unlocked(s), true);
  assert.equal(warning(command(s, 'program add always spike soonest')), null);
  assert.match(codexPageMarkup(s, 'family:ransomware'), /cx-handler[^>]*data-rt-goto="program ransomware add ransomware:encryptor:present"/, 'the Codex\'s + handler opens the part\'s virus');
});

test('a routine a virus: the fight\'s virus picks it, one with none plays the rotation; each has its own RAM', () => {
  const s = fight({ level: 6 });
  for (const p of attackers(s)) p.attack.due = 999;
  const base = R.ramOf(6);
  assert.equal(R.ramFor(s, 'ransomware'), base);
  assert.equal(R.ramFor(s, 'worm'), base, 'every virus starts from the class level\'s RAM');
  assert.equal(R.ramBonus(s, 'worm'), 0, 'R2\'s per-virus RAM hook: nothing yet');
  assert.equal(warning(command(s, 'program worm add always spike soonest')), null);
  assert.equal(R.programsOf(s).focus, 'worm', 'naming a virus picks it');
  assert.equal(R.decide(s).handler, -1, 'a worm routine never plays a Ransomware fight: the rotation does');
  for (let i = 0; i < base; i++) assert.equal(warning(command(s, 'program ransomware add always spike lowest')), null);
  assert.equal(R.ramUsed(s, 'ransomware'), base);
  assert.match(warning(command(s, 'program ransomware add always spike lowest')), /needs \d+ RAM\. Ransomware has \d+/, 'Ransomware is full');
  assert.equal(R.ramUsed(s, 'worm'), 1, 'and Worm\'s RAM is its own');
  assert.equal(warning(command(s, 'program worm add always spike lowest')), null, 'Worm still has room');
  assert.equal(R.decide(s).handler, 0, 'the Ransomware fight plays the Ransomware routine');
  assert.match(R.decide(s).text, /^spike /);
  // A stack past its RAM (an old one): the rest sit out.
  R.routineOf(s, 'ransomware').handlers.push({ when: 'always', do: 'spike', target: 'lowest' });
  assert.equal(R.handlerRows(s, 'ransomware').at(-1).fits, false, 'the last sits out');
  assert.equal(R.ramUsed(s, 'ransomware'), base);
});

test('WHEN chips open by research: decoded its name and health, rule its timer and tell, mastered its prediction', () => {
  const s = fight({ research: 0 });
  const ref = 'ransomware:encryptor';
  const add = (when) => warning(command(s, `program ransomware add ${when} crack that`));
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
  // A handler whose chip isn't open (written for research you no longer match) never fires.
  const t = fight({ level: 5 });
  t.research['ransomware:encryptor'] = TIER.decoded;
  R.routineOf(t, 'ransomware').handlers.push({ when: 'ransomware:encryptor:due', do: 'crack', target: 'that' });
  assert.equal(R.handlerRows(t, 'ransomware')[0].runs, false);
  part(t, 'encryptor').attack.due = t.encounter.cycle;
  assert.equal(R.decide(t).handler, -1, 'the rotation plays instead');
  // The palette lists only the picked virus's parts you've met, and shows a locked chip as locked.
  t.research['worm:replicator'] = TIER.decoded;
  command(t, 'program ransomware');
  const html = programMarkup(t);
  assert.match(html, /Encryptor/);
  assert.match(html, /rt-chip rt-when locked/);
  assert.doesNotMatch(html.slice(html.indexOf('rt-palette')), /Replicator/, 'another virus\'s parts stay on its own routine');
});

test('a handler fires on what the board shows: the first that fits, top to bottom, at its target; a veiled timer never counts', () => {
  const s = fight();
  const pulse = part(s, 'pulse');
  for (const p of attackers(s)) p.attack.due = 999;
  command(s, 'program ransomware armor off'); // the handlers as written (Break ◆ first has its own tests)
  command(s, 'program ransomware add ransomware:pulse:due overload that');
  command(s, 'program ransomware add ransomware:encryptor:present crack that');
  assert.deepEqual(R.decide(s), { text: 'crack encryptor', handler: 1 }, 'the first handler waits, the second fits');
  pulse.attack.due = s.encounter.cycle;
  assert.deepEqual(R.decide(s), { text: 'overload pulse', handler: 0 }, 'its attack lands now: the first fits');
  pulse.veiled = true; pulse.armor = Math.max(1, pulse.armor);
  assert.equal(R.decide(s).handler, 1, 'a hidden timer is not on the board');
  pulse.veiled = false;
  const r = mine(cycle(s))[0];
  assert.equal(r.ability, 'overload'); assert.equal(r.target, 'pulse');
  assert.match(r.message, /^⟳ /, 'its move carries ⟳ in the log');
  assert.equal(r.auto, 'program');
  assert.match(logMarkup(s), /⟳ Overload pulse|⟳ overload pulse/i);
});

test('the program never takes the Sync Window: its move fires when the timer runs out, unsynced', () => {
  const s = fight();
  s.encounter.sync = { at: 0, width: 1 };
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
      for (const e of mine(cycle(s))) used[mode].add(e.ability);
    }
  }
  const long = [...used.planner].filter((id) => R.isLong(fight(), id));
  assert.ok(long.length, `the planner fires a long cooldown (${[...used.planner].join(', ')})`);
  for (const id of long) assert.ok(!used.program.has(id), `the rotation never fires ${id}`);
  const s = fight();
  command(s, 'program ransomware armor off'); // Flood itself, not a Crack first (Break ◆ first)
  command(s, 'program ransomware add always flood soonest');
  assert.equal(mine(cycle(s))[0].ability, 'flood');
});

test('a virus whose routine you never made or confirmed never throws, even with parts you haven\'t researched', () => {
  const s = fight({ level: 6, research: 0 });
  assert.equal(R.confirmed(s, 'ransomware'), false);
  assert.deepEqual(R.exceptionsOf(s), []);
  const ev = cycle(s);
  assert.ok(!ev.some((e) => e.type === 'exception'));
  assert.match(mine(ev)[0].message, /^⟳ /, 'the rotation plays it all');
  assert.doesNotMatch(boardMarkup(s), /m-exc|EXCEPTION/);
  // Confirmed (as it stands: no handlers), it throws.
  command(s, 'program ransomware confirm');
  assert.equal(R.confirmed(s, 'ransomware'), true);
  assert.ok(R.exceptionsOf(s).length, 'now its unresearched parts are yours');
  // Each way of making a routine yours confirms it: a preset, an added, an edited, a removed handler.
  for (const c of ['preset lowest', 'add always spike soonest']) {
    const t = fight({ level: 6, research: 0 });
    command(t, `program ransomware ${c}`);
    assert.equal(R.confirmed(t, 'ransomware'), true, c);
  }
  const u = fight({ level: 6 });
  R.routineOf(u, 'ransomware').handlers.push({ when: 'always', do: 'spike', target: 'soonest' });
  assert.equal(R.confirmed(u, 'ransomware'), false);
  command(u, 'program ransomware set 1 target lowest');
  assert.equal(R.confirmed(u, 'ransomware'), true, 'an edit');
});

test('an exception hands over only its part: the program plays the rest and never targets it; once you act on it, the program takes it too', () => {
  const s = fight({ level: 6 });
  s.research['ransomware:encryptor'] = 0; // the Encryptor: never researched, the rest mastered
  command(s, 'program ransomware confirm');
  assert.deepEqual(R.exceptionsOf(s).map((x) => x.part), ['encryptor']);
  const html = boardMarkup(s);
  assert.match(html, /m-exc[^>]*data-target="encryptor"/, 'its row is marked');
  assert.match(html, /rt-exc-tag" title="Your program has no handler for this part yet\. Play it yourself, or research it in the Codex\."><strong>EXCEPTION<\/strong><span> · no available handler<\/span>/, 'the full label on its tag line, with the tooltip');
  assert.match(html, /intent prog exc-mark" title="EXCEPTION · no available handler\. Your program has no handler for this part yet\.[^"]*"><strong>EXCEPTION<\/strong><\/div>/, 'only the word in its Now cell');
  assert.doesNotMatch(html, /program resume|rt-back/, 'no hand-back button');
  assert.match(html, /intent mine prog ghost[^>]*data-at="(?!encryptor)[a-z]+"/, 'the Now cell: its move on another part');
  const ev = cycle(s);
  const x = ev.filter((e) => e.type === 'exception');
  assert.equal(x.length, 1);
  assert.match(x[0].message, /^EXCEPTION · no available handler: the Encryptor\.$/);
  assert.equal(x[0].cue, true, 'the cue');
  assert.match(logMarkup(s), /class="exc">EXCEPTION · no available handler/, 'its log line in the exception colour');
  assert.notEqual(mine(ev)[0].target, 'encryptor', 'the program plays the others');
  const others = () => livingParts(s).filter((p) => p.id !== 'encryptor' && p.kind !== 'fragment');
  for (let i = 0; i < 40 && active(s) && others().length; i++) {
    const ev2 = cycle(s);
    assert.ok(!ev2.some((e) => e.type === 'exception'), 'said once');
    for (const m of mine(ev2)) assert.notEqual(m.target, 'encryptor', 'never at the Encryptor');
  }
  assert.equal(others().length, 0, 'the others are down');
  // Only the Encryptor is left: the program holds, and the Now cell says it's yours.
  assert.equal(R.decide(s).hold, true);
  assert.match(boardMarkup(s), /intent prog mine exc"[^>]*title="EXCEPTION · no available handler\.[^"]*Nothing fires[^"]*"><strong>EXCEPTION<\/strong>/);
  const held = cycle(s);
  assert.equal(mine(held).length, 0, 'nothing fires');
  assert.ok(held.some((e) => e.type === 'hold' && e.auto === 'program'));
  // You act on it: it's no longer yours alone, the program takes it from here. No key needed.
  command(s, 'spike encryptor');
  assert.doesNotMatch(mine(cycle(s))[0].message, /⟳/);
  assert.deepEqual(R.exceptionsOf(s), []);
  assert.match(mine(cycle(s))[0]?.message || '⟳', /^⟳ /);
  assert.match(warning(command(s, 'program resume')), /^program \[virus\]/, 'program resume is gone');
  // The cue is once a fight: a second part left to you later says so without it.
  const t = fight({ level: 6, research: 0, opts: { genes: ['ward'] } });
  for (const p of FAMILIES.ransomware.parts) t.research[`ransomware:${p.id}`] = TIER.mastered;
  const box = livingParts(t).find((p) => p.ward), ref = codexKey(t.encounter.virus, box);
  t.research[ref] = 0;
  t.research['ransomware:encryptor'] = 0;
  command(t, 'program ransomware confirm');
  R.noteExceptions(t);
  t.research['ransomware:encryptor'] = TIER.mastered;
  const later = t.logs.filter((e) => e.type === 'exception');
  assert.equal(later.length, 1, 'one line for both at once');
  assert.equal(later[0].cue, true);
  // A rule part decoded but not at its rule is yours; a handler that names it covers it.
  t.research[ref] = TIER.decoded;
  assert.deepEqual(R.exceptionsOf(t).map((x) => x.part), [box.id]);
  command(t, `program ransomware add ${ref}:present spike that`);
  assert.equal(R.exceptionsOf(t).length, 0, 'named by a handler: covered');
});

test('a broad TARGET leaves a Hotspot, a Tripwire or a Zip Bomb for last, as the rotation does; that part still hits it', () => {
  const s = fight({ level: 14, opts: { genes: ['hotspot'] } });
  const hot = livingParts(s).find((p) => p.hotspot);
  assert.ok(hot, 'a Hotspot in the fight');
  for (const p of livingParts(s)) if (p !== hot) p.integrity = Math.max(hot.integrity + 1, p.integrity);
  command(s, 'program ransomware armor off'); // the TARGET alone (Break ◆ first would crack it)
  command(s, 'program ransomware add always spike lowest');
  assert.equal(R.leftForLast(s, hot), true);
  assert.notEqual(R.decide(s).text, `spike ${hot.id}`, 'not the lowest when that sets it off');
  R.routineOf(s, 'ransomware').handlers = [{ when: `ransomware:${hot.id}:present`, do: 'spike', target: 'that' }];
  assert.equal(R.decide(s).text, `spike ${hot.id}`, 'named, it is hit');
  for (const p of livingParts(s)) if (p !== hot) p.integrity = 0;
  assert.equal(R.leftForLast(s, hot), false, 'alone, it is fair game');
});

test('a mutation is the program\'s; a rule part needs its rule; a tell needs mastery; a boss is wholly yours', () => {
  const s = fight({ level: 14, opts: { mutation: 'hasty' } });
  command(s, 'program ransomware confirm');
  assert.ok(!R.exceptionsOf(s).length, 'an undecoded mutation hands nothing over');
  const t = fight({ research: TIER.decoded, opts: { genes: ['mutexlock'] } });
  command(t, 'program ransomware confirm');
  const mutex = livingParts(t).find((p) => p.lock);
  assert.ok(R.exceptionsOf(t).some((x) => x.part === mutex.id), 'its rule is not researched');
  t.research[codexKey(t.encounter.virus, mutex)] = TIER.rule;
  assert.ok(!R.exceptionsOf(t).some((x) => x.part === mutex.id && x.kind === 'part'));
  // A boss: the whole fight is yours, one mark on its header; nothing fires.
  const b = fresh();
  FP.outfit(b, { cls: 'breaker', level: 14 });
  study(b);
  selectEncounter(b, 'random', 3, { level: 14, family: 'ransomware', boss: 'resident', mutation: null });
  command(b, 'engage');
  assert.deepEqual(R.exceptionsOf(b).map((x) => x.kind), ['fight'], 'the Resident: the whole fight');
  assert.equal(R.decide(b).whole, true);
  assert.match(hudMarkup(b), /rt-exc-tag[^>]*><strong>EXCEPTION<\/strong><span> · no available handler/, 'the header mark');
  assert.doesNotMatch(boardMarkup(b), /exc-mark/, 'no mark on its parts');
  const ev = cycle(b);
  assert.equal(mine(ev).length, 0, 'nothing fires');
  assert.equal(ev.filter((e) => e.type === 'exception').length, 1);
});

test('presets: ready-made routines from the virus\'s parts, each fitting its RAM with only chips you\'ve opened and skills on your bar', () => {
  for (const [level, research] of [[5, TIER.decoded], [14, TIER.rule], [30, TIER.mastered], [6, 0]]) for (const body of FAMS) {
    const s = fight({ level, research, family: body });
    const ps = R.presetsFor(s, body), bar = new Set(R.barSkills(s).map((x) => x.id));
    assert.ok(ps.length >= 2 && ps.length <= 4, `${body} at ${level}: ${ps.length} presets`);
    for (const p of ps) {
      assert.ok(p.handlers.reduce((n, h) => n + R.handlerRam(s, h), 0) <= R.ramFor(s, body), `${p.name} fits`);
      for (const h of p.handlers) {
        assert.ok(R.whenOpen(s, h.when), `${p.name}: ${h.when} is open`);
        assert.ok(bar.has(h.do), `${p.name}: ${h.do} is on the bar`);
        assert.ok(R.TARGETS[h.target]);
        const w = R.parseWhen(h.when);
        if (w.kind === 'part') assert.equal(R.refBody(w.ref), body, 'its own parts');
      }
      assert.match(p.name, /^[A-Z][^A-Z]*( [A-Z][a-z]+)?[^A-Z]*$/, `sentence case: ${p.name}`);
    }
    if (research >= TIER.decoded) assert.ok(ps.some((p) => p.id === 'signature'), `${body}: its signature part first`);
  }
  // Picking one replaces the stack and is marked; an edited stack comes back with undo.
  const s = fight({ level: 14 });
  command(s, 'program ransomware add always spike soonest');
  command(s, 'program ransomware preset signature');
  assert.equal(R.presetNow(s, 'ransomware'), 'signature');
  assert.match(programMarkup(s), /rt-pre on[^>]*preset signature/, 'the current one marked');
  assert.match(programMarkup(s), /program ransomware undo/, 'Undo, for the stack it replaced');
  command(s, 'program ransomware undo');
  assert.deepEqual(R.routineOf(s, 'ransomware').handlers, [{ when: 'always', do: 'spike', target: 'soonest' }]);
  command(s, 'program ransomware preset lowest');
  command(s, 'program ransomware preset signature');
  assert.deepEqual(R.routineOf(s, 'ransomware').undo, [{ when: 'always', do: 'spike', target: 'soonest' }], 'a preset over a preset keeps your own stack one undo away');
});

test('anything you type overrides the program for that cycle; the board shows its next move ghosted on its target', () => {
  const s = fight();
  for (const p of attackers(s)) p.attack.due = 999;
  command(s, 'program ransomware add ransomware:encryptor:present crack that');
  const html = boardMarkup(s);
  assert.match(html, /intent mine prog ghost[^>]*data-at="encryptor"[^>]*>⟳ crack encryptor/, 'your row: the ghost');
  assert.match(html, /ghost-on[^>]*>⟳ Crack/, 'the part it will hit');
  command(s, 'spike pulse');
  assert.doesNotMatch(boardMarkup(s), /prog ghost/, 'a typed command replaces the ghost');
  const r = mine(cycle(s))[0];
  assert.doesNotMatch(r.message, /⟳|timer ran out/, 'your command');
  assert.equal(r.target, 'pulse');
  assert.equal(mine(cycle(s))[0].ability, 'crack', 'the next cycle is the program\'s again');
  command(s, 'program off');
  assert.match(mine(cycle(s))[0].message, /timer ran out/);
});

test('a program\'s fight pays what the same fight pays you: the same moves typed bring the same XP, loot and credits', () => {
  const run = (prog, moves = null) => {
    const s = fight({ level: 5, seed: 11, opts: { classic: false } });
    s.rng = 12345;
    R.programsOf(s).on = prog;
    const out = [];
    for (let i = 0; i < 60 && active(s); i++) {
      if (moves) command(s, moves[i] || 'spike ' + livingParts(s)[0].id);
      const m = mine(cycle(s))[0];
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
  FP.outfit(s, { cls: 'breaker', level: 5 });
  play(s, 'connect sprawl');
  assert.ok(s.run?.rooms);
  command(s, 'program jackout 30');
  assert.equal(R.rails(s).jackOut, 30);
  R.railCheck(s);
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
  const t = fresh();
  FP.outfit(t, { cls: 'breaker', level: 5 });
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
  const s = fight({ level: 5 });
  command(s, 'program ransomware add always spike soonest');
  assert.equal(R.programKey(s), 'breaker');
  FP.outfit(s, { cls: 'breaker', level: 14 });
  assert.equal(R.programKey(s), 'demolitionist');
  assert.equal(R.routineOf(s, 'ransomware').handlers.length, 1, 'a subclass starts from its class\'s program');
  command(s, 'program ransomware add always crack soonest');
  assert.equal(R.routineOf(s, 'ransomware', 'breaker').handlers.length, 1, 'each keeps its own');
  const back = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(R.routineOf(back, 'ransomware', 'demolitionist').handlers.length, 2, 'saved');
  assert.equal(R.confirmed(back, 'ransomware'), true);
  const old = JSON.parse(JSON.stringify(fresh()));
  delete old.programs;
  const o = restore(old);
  assert.deepEqual(R.programsOf(o).rails, { jackOut: 0, danger: true });
  assert.equal(R.programsOf(o).on, true);
  assert.deepEqual(R.routineOf(o, 'ransomware').handlers, []);
});

test('an R1 save\'s single stack moves into its viruses\' routines, which count as yours', () => {
  const s = fight({ level: 5 });
  s.met = { ransomware: true, worm: true };
  const save = JSON.parse(JSON.stringify(s));
  save.programs = { on: true, rails: { jackOut: 20, danger: true }, by: { breaker: { handlers: [
    { when: 'ransomware:encryptor:present', do: 'crack', target: 'that' },
    { when: 'always', do: 'spike', target: 'lowest' },
    { when: 'worm:replicator:low', do: 'spike', target: 'that' },
    { when: 'hurt', do: 'spike', target: 'soonest' },
    { when: 'nonsense', do: 'spike', target: 'soonest' },
  ] } } };
  const o = restore(save);
  assert.equal(R.programsOf(o).rails.jackOut, 20, 'the rails as they were');
  assert.equal(R.programOf(o, 'breaker').handlers, undefined, 'the old stack is gone');
  assert.deepEqual(R.routineOf(o, 'ransomware', 'breaker').handlers.map((h) => h.when), ['ransomware:encryptor:present', 'always', 'hurt']);
  assert.deepEqual(R.routineOf(o, 'worm', 'breaker').handlers.map((h) => h.when), ['always', 'worm:replicator:low', 'hurt'], 'a handler naming no part: every met virus with room');
  assert.equal(R.routineOf(o, 'ghostroot', 'breaker').handlers.length, 0, 'not met: nothing');
  assert.equal(R.confirmed(o, 'ransomware'), true);
  assert.equal(R.confirmed(o, 'worm'), true);
  assert.equal(R.confirmed(o, 'ghostroot'), false);
  // No room: a handler naming no part is dropped, without an error.
  const t = fight({ level: 1 });
  t.met = { ransomware: true };
  const save2 = JSON.parse(JSON.stringify(t));
  save2.programs = { by: { breaker: { handlers: [1, 2, 3, 4, 5].map(() => ({ when: 'always', do: 'spike', target: 'soonest' })) } } };
  const o2 = restore(save2);
  assert.equal(R.routineOf(o2, 'ransomware', 'breaker').handlers.length, R.ramFor(o2, 'ransomware'), 'what fits');
});

test('the Program tab: viruses down the left, the picked one\'s presets, stack, chips and the rails; a tip for it', () => {
  const s = fight({ level: 14 });
  s.met = { ransomware: true, worm: true, ghostroot: true };
  s.research['ghostroot:pulse'] = 0; s.research['ghostroot:scrambler'] = 0;
  for (const p of FAMILIES.ghostroot.parts) s.research[`ghostroot:${p.id}`] = 0;
  command(s, 'program ransomware add ransomware:encryptor:due crack that');
  const html = loadoutMarkup(s, null, 'program');
  for (const k of ['rt-viruses', 'rt-stack', 'rt-ram', 'rt-presets', 'data-rt-body="ransomware"', 'data-rt-drop="when:0"', 'data-rt-set="1 when"', 'data-rt-drag="do:', 'data-rt-drag="target:', 'program jackout 30', 'program danger off', 'rotation', 'program ransomware remove 1']) assert.ok(html.includes(k), k);
  assert.match(html, /class="rt-v on set"[^>]*data-command="program ransomware"[\s\S]*?Ransomware[\s\S]*?1 handler/, 'the picked virus, its state');
  assert.match(html, /class="rt-v dim"[^>]*data-command="program ghostroot"[\s\S]*?no routine/, 'met but undecoded: greyed');
  assert.doesNotMatch(html, /data-command="program trojan"/, 'not met: hidden');
  assert.match(html, /<h1>Ransomware<\/h1>/);
  assert.match(html, /data-ltab="program"/);
  command(s, 'program worm');
  assert.match(loadoutMarkup(s, null, 'program'), /<h1>Worm<\/h1>[\s\S]*program worm confirm/, 'picking a virus opens its routine, with its Confirm');
  const tip = TIPS.find((t) => t.id === 'program-editor');
  assert.ok(tip && tip.text.length <= 200);
  void barKeys;
});

// ---------- Break ◆ first ----------
// A fight whose lowest part wears ◆ (the others well above it), nothing attacking: the handler's hit would be absorbed.
function armored({ level = 14, seed = 7, family = 'ransomware' } = {}) {
  const s = fight({ level, seed, family });
  for (const p of attackers(s)) p.attack.due = 999;
  const parts = livingParts(s), p = parts.find((x) => x.armor > 0);
  for (const x of parts) if (x !== p) x.integrity = x.max = 500;
  p.armor = 3;
  return { s, p };
}
const absorbedHits = (ev) => ev.filter((e) => e.type === 'armor' && e.absorbed);

test('Break ◆ first, on by default: a big hit a ◆ would take becomes Crack when it\'s ready, then the hit lands', () => {
  const { s, p } = armored();
  assert.equal(R.armorFirst(s, 'ransomware'), true, 'on for a new routine');
  command(s, 'program ransomware add always overload lowest');
  assert.ok(armorTakesHit(s, 'overload', p) > 0, 'Overload would be absorbed');
  assert.deepEqual(R.decide(s), { text: `crack ${p.id}`, handler: 0, armor: 'break' });
  assert.match(boardMarkup(s), /title="Your program(&#39;|')s next move \(handler 1, breaking ◆ first\)\.[^"]*">⟳ crack /, 'the ghost says so in its tooltip');
  const ev = cycle(s);
  assert.equal(mine(ev)[0].ability, 'crack');
  assert.equal(mine(ev)[0].target, p.id);
  assert.equal(absorbedHits(ev).length, 0, 'nothing absorbed');
  assert.equal(p.armor, 0);
  const next = mine(cycle(s))[0];
  assert.equal(next.ability, 'overload', 'the hit itself, now that it lands');
  assert.equal(next.target, p.id);
  // The breaker is the best one ready, from the ability data: the most of its ◆, then the shortest cooldown.
  const { s: t, p: q } = armored();
  q.armor = 5;
  assert.equal(R.breakerFor(t, q), `shaped-charge ${q.id}`, '5 ◆: Shaped Charge breaks them all');
  q.armor = 2;
  assert.equal(R.breakerFor(t, q), `crack ${q.id}`, '2 ◆: Crack, the shorter cooldown');
  t.encounter.readyAt.crack = t.encounter.cycle + 2;
  assert.equal(R.breakerFor(t, q), 'fork-bomb', 'Crack cooling: Fork Bomb (cooldown 4) before Shaped Charge (5); it takes no target');
  for (const [id, a] of Object.entries(ABILITIES)) {
    const want = a.pierce ? 0 : Math.max(a.strip || 0, a.chits > 1 ? a.chits : 0);
    assert.equal(R.breaks(id), want, id);
  }
  assert.ok(R.breaks('crack') && R.breaks('fork-bomb') && R.breaks('chain-reaction') && R.breaks('rate-limit'));
  assert.ok(!R.breaks('overload') && !R.breaks('spike') && !R.breaks('backdoor') && !R.breaks('shatter'));
});

test('Break ◆ first on a sleeping Spare: its 3 ◆ would take the hit, so the program breaks them first', () => {
  const s = fight({ family: 'worm', opts: { genes: ['spare'] } });
  for (const p of attackers(s)) p.attack.due = 999;
  const sp = part(s, 'spare');
  for (const x of livingParts(s)) if (x !== sp) x.integrity = x.max = 500;
  assert.equal(sp.armor, 3);
  command(s, 'program worm add always overload lowest');
  assert.ok(armorTakesHit(s, 'overload', sp) > 0, 'Overload would be absorbed');
  assert.equal(R.decide(s).armor, 'break');
  assert.match(R.decide(s).text, new RegExp(`^(crack|shaped-charge) ${sp.id}$|^fork-bomb$`));
});
test('Break ◆ first off: the old behaviour, the hit goes into the ◆', () => {
  const { s, p } = armored();
  command(s, 'program ransomware add always overload lowest');
  command(s, 'program ransomware armor off');
  assert.deepEqual(R.decide(s), { text: `overload ${p.id}`, handler: 0 });
  const ev = cycle(s);
  assert.equal(mine(ev)[0].ability, 'overload');
  assert.equal(absorbedHits(ev).length, 1, 'absorbed');
  assert.equal(p.armor, 1, 'a heavy hit breaks 2');
});

test('Break ◆ first with no breaker ready: soonest and lowest go at a part with no ◆, that part fires anyway', () => {
  const { s, p } = armored();
  const e = s.encounter;
  for (const { id } of R.barSkills(s)) if (R.breaks(id)) e.readyAt[id] = e.cycle + 3;
  const bare = livingParts(s).find((x) => x !== p);
  bare.armor = 0;
  command(s, 'program ransomware add always overload lowest');
  assert.equal(R.breakerFor(s, p), null, 'nothing ready');
  assert.deepEqual(R.decide(s), { text: `overload ${bare.id}`, handler: 0, armor: 'retarget' }, 'lowest: the lowest with no ◆');
  R.routineOf(s, 'ransomware').handlers[0].target = 'soonest';
  assert.equal(R.decide(s).text, `overload ${bare.id}`, 'soonest: the same');
  // That part names the part: the hit goes in anyway.
  R.routineOf(s, 'ransomware').handlers = [{ when: `${codexKey(e.virus, p)}:present`, do: 'overload', target: 'that' }];
  assert.deepEqual(R.decide(s), { text: `overload ${p.id}`, handler: 0 });
  // Every part armored: a broad TARGET has nowhere else to go, so it fires anyway.
  for (const x of livingParts(s)) x.armor = Math.max(2, x.armor);
  R.routineOf(s, 'ransomware').handlers = [{ when: 'always', do: 'overload', target: 'lowest' }];
  assert.deepEqual(R.decide(s), { text: `overload ${p.id}`, handler: 0 });
  assert.equal(absorbedHits(cycle(s)).length, 1);
});

test('Break ◆ first is free: it costs no RAM, so a routine keeps all its handlers; a cost, if the designer sets one, shows and counts', () => {
  const { s } = armored({ level: 6 });
  assert.equal(R.ROUTINES.armorRam, 0);
  const budget = R.ramFor(s, 'ransomware');
  for (let i = 0; i < budget; i++) command(s, 'program ransomware add always spike lowest');
  assert.equal(R.ramUsed(s, 'ransomware'), budget, 'a full routine, the option on');
  assert.ok(R.handlerRows(s, 'ransomware').every((r) => r.fits), 'every handler runs');
  command(s, 'program ransomware armor off');
  assert.equal(R.ramUsed(s, 'ransomware'), budget, 'off: the same RAM');
  command(s, 'program ransomware armor on');
  assert.doesNotMatch(programMarkup(s).match(/<button[^>]*rt-armor[\s\S]*?<\/button>/)[0], /rt-rc/, 'no cost circle');
  // At 1 RAM it would count against the routine (the last handler sits out) and show as 1R.
  R.ROUTINES.armorRam = 1;
  try {
    assert.equal(R.ramUsed(s, 'ransomware'), budget);
    assert.equal(R.handlerRows(s, 'ransomware').at(-1).fits, false, 'the last handler sits out');
    assert.match(programMarkup(s), /rt-armor on"[^>]*><span class="rt-rc" title="1 RAM"[^>]*>1R<\/span>/);
    command(s, 'program ransomware armor off');
    assert.match(warning(command(s, 'program ransomware armor on')), /needs \d+ RAM/, 'no room: refused');
    for (const p of R.presetsFor(s, 'ransomware')) assert.ok(p.handlers.reduce((n, h) => n + R.handlerRam(s, h), 0) + 1 <= budget, `${p.name} fits with it`);
  } finally { R.ROUTINES.armorRam = 0; }
});

test('the ready-made routines no longer waste hits on ◆: Focus the lowest and Before it hits in seeded fights', () => {
  const count = (preset, armor) => {
    const out = { hits: 0, absorbed: 0 };
    for (const family of FAMS) for (let seed = 1; seed <= 12; seed++) {
      const s = fight({ seed, family, opts: { classic: false } });
      for (const p of s.encounter.virus.parts) s.research[codexKey(s.encounter.virus, p)] = TIER.mastered;
      command(s, `program ${family} preset ${preset}`);
      if (R.presetNow(s, family) !== preset) continue;
      if (!armor) command(s, `program ${family} armor off`);
      for (let i = 0; i < 60 && active(s); i++) {
        const ev = cycle(s);
        out.hits += ev.filter((e) => e.type === 'resolved' && e.auto === 'program' && e.ability === 'overload').length;
        out.absorbed += ev.filter((e) => e.type === 'armor' && e.absorbed && e.ability === 'overload').length;
      }
    }
    return out;
  };
  for (const preset of ['lowest', 'hits']) {
    const off = count(preset, false), on = count(preset, true);
    assert.ok(on.hits > 0 && off.hits > 0, `${preset}: Overloads fired`);
    assert.ok(off.absorbed > 0, `${preset} off: some absorbed (${off.absorbed} of ${off.hits})`);
    assert.ok(on.absorbed * 4 <= off.absorbed, `${preset} on: ${on.absorbed} of ${on.hits} absorbed, against ${off.absorbed} of ${off.hits}`);
  }
  // Their own handlers don't fight it: the signature first is just your best hit at it, the option breaks its ◆ (a
  // Crack handler at "on board" would spend Crack on it once it's bare).
  const s = fight();
  const sig = R.presetsFor(s, 'ransomware').find((p) => p.id === 'signature');
  assert.deepEqual(sig.handlers, [{ when: 'ransomware:encryptor:present', do: 'overload', target: 'that' }]);
  assert.match(sig.tip, /Overload it, its ◆ broken first\./);
});

test('the toggle: a switch by the RAM meter, its command, saved per routine; it never makes a routine yours', () => {
  const s = fight({ level: 14 });
  const html = programMarkup(s);
  const btn = html.match(/<button[^>]*class="rt-armor on"[\s\S]*?<\/button>/)?.[0];
  assert.ok(btn, 'on, by default');
  assert.ok(html.indexOf('rt-armor') > html.indexOf('rt-ram') && html.indexOf('rt-armor') < html.indexOf('rt-presets'), 'beside the RAM meter, above the stack');
  assert.match(btn, /role="switch" aria-checked="true"/);
  assert.match(btn, /data-command="program ransomware armor off"/);
  assert.match(btn, /title="Break ◆ first: before a big hit would be absorbed by armor, your program cracks the armor first\."/);
  assert.match(btn, /Break <span class="rt-dia">◆<\/span> first/);
  const ev = command(s, 'program ransomware armor off');
  assert.equal(ev.find((e) => e.type === 'info').message, 'Ransomware: break ◆ first off.');
  assert.equal(R.armorFirst(s, 'ransomware'), false);
  assert.equal(R.routineOf(s, 'ransomware').armor, false);
  assert.equal(R.armorFirst(s, 'worm'), true, 'each routine its own');
  assert.equal(R.confirmed(s, 'ransomware'), false, 'a setting, not a handler: nothing is left to you for it');
  assert.match(programMarkup(s), /class="rt-armor"[^>]*aria-checked="false"[^>]*data-command="program ransomware armor on"/);
  assert.match(command(s, 'program').find((e) => e.type === 'info').message, /break ◆ first off/);
  assert.match(warning(command(s, 'program ransomware armor maybe')), /armor on or off/);
  // Saved, and carried to a subclass's first program.
  const back = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(R.armorFirst(back, 'ransomware'), false);
  command(s, 'program armor on'); // no virus named: the one picked last
  assert.equal(R.armorFirst(s, 'ransomware'), true);
  command(s, 'program ransomware armor off');
  const t = fight({ level: 5 });
  command(t, 'program ransomware add always spike soonest');
  command(t, 'program ransomware armor off');
  FP.outfit(t, { cls: 'breaker', level: 14 });
  assert.equal(R.armorFirst(t, 'ransomware'), false, 'a subclass starts from its class\'s routine');
  // A ready-made routine comes with it on.
  command(s, 'program ransomware preset lowest');
  assert.equal(R.armorFirst(s, 'ransomware'), true);
  // An older save's routines keep their handlers, with it on.
  const old = JSON.parse(JSON.stringify(fight({ level: 14 })));
  old.programs = { on: true, rails: { jackOut: 0, danger: true }, by: { demolitionist: { routines: { ransomware: { handlers: [{ when: 'always', do: 'overload', target: 'lowest' }], confirmed: true } } } } };
  const o = restore(old);
  assert.deepEqual(R.routineOf(o, 'ransomware').handlers, [{ when: 'always', do: 'overload', target: 'lowest' }]);
  assert.equal(R.armorFirst(o, 'ransomware'), true);
});

test('a part whose own id ends in a number keeps it (the C2 Node); only a second copy answers as the first', () => {
  assert.equal(R.refOf({ family: 'worm' }, { id: 'c2' }), 'worm:c2');
  assert.equal(R.refOf({ family: 'ransomware' }, { id: 'cipherblock2', copy: true }), 'ransomware:cipherblock');
});

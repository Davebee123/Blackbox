// The tells' levers (docs/puzzle-levers.md 3.5, 3.6): a seal is a dial, each cast and charge shows its price, Self-Update
// grows by a quarter of what a part has left, and SIGINT cuts a charge as well as a cast, so it goes on the dearer one.
// The planner reads it, routines have a WHEN chip and a preset for each, and solved.mjs has its no-fixed-rule entries.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, active, livingParts, readyIn, hooks } from './dist/combat.mjs';
import { CONFIG, TELL } from './dist/data.mjs';
import { tellsOf, tellStart, tellPrice, tellIntents, sigintTarget, sigintWindows, dearest, sealGives, growOf, bestStrip } from './dist/tells.mjs';
import { boardMarkup, trayMarkup } from './dist/view.mjs';
import { planner } from './dist/planner.mjs';
import { TIER } from './dist/research.mjs';
import * as R from './dist/routines.mjs';
import { FIXED, leverFights } from './solved.mjs';

CONFIG.enemyCrit = 0; // exact numbers: no enemy crits, no misses
CONFIG.misses = false;

// A Breaker at a level in a home fight against a wild virus of a family (its classic shape: a Pulse Node, the
// signature, one third part).
function fight({ level = 18, family = 'ransomware', seed = 7, opts = {} } = {}) {
  const s = fresh();
  s.hackers = Object.fromEntries(['breaker', 'bastion', 'infiltrator', 'operator'].map((c) => [c, { level, xp: 0 }]));
  selectEncounter(s, 'random', seed, { level, mutation: null, family, classic: true, ...opts });
  command(s, 'engage');
  s.server.max = s.server.integrity = 5000;
  s.encounter.hardened = 0;
  return s;
}
// Deal the virus these tells (its own kinds), then make each quiet until a test says one.
function deal(s, set) {
  const v = s.encounter.virus;
  v.tells = null; v.tellSet = set; v.extraTells = set.length;
  tellStart(s);
  for (const t of tellsOf(s).list) { t.told = false; t.after = 999; }
}
// One tell said now on a part, landing in n cycles (a charge rides the part's next attack, set to land then).
function tell(s, id, partId, n = 2) {
  const t = tellsOf(s).list.find((x) => x.id === id), p = part(s, partId), e = s.encounter;
  assert.ok(t, `${id} is dealt`);
  if (t.kind === 'charge') p.attack.due = e.cycle + n;
  Object.assign(t, { part: partId, told: true, said: e.cycle, next: e.cycle + n, n: t.kind === 'charge' ? p.attack.n || 0 : null, after: 999, opened: null });
  return t;
}
const quiet = (s) => { for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999; };
const hold = (s, n = 1) => { for (let i = 0; i < n && active(s); i++) { command(s, 'hold'); resolveCycle(s); } };
const fire = (s, text) => { const ev = command(s, text); assert.ok(!ev.some((e) => e.type === 'warning'), ev.at(-1)?.message); return resolveCycle(s); };
// The program's next move (routines.mjs preview, its cache keyed by the cycle: a test changes the board within one).
const peek = (s) => { s.serial = (s.serial || 0) + 1; return R.preview(s); };
const others = (s, keep) => { for (const p of livingParts(s)) if (!keep.includes(p.id)) p.integrity = 0; };

// ---------- 3.5 the seal ----------
test('a seal is a dial: each ◆ left on its part gives one ◆ back to every part, never past its max, and takes that share of what it costs you', () => {
  const s = fight();
  deal(s, ['keyrotation', 'fulldisk']); quiet(s);
  const enc = Object.assign(part(s, 'encryptor'), { armor: 2, maxArmor: 6 }), pulse = Object.assign(part(s, 'pulse'), { armor: 0, maxArmor: 3, patchAt: 99 });
  s.encounter.shield = 30;
  tell(s, 'keyrotation', 'encryptor', 0);
  assert.deepEqual(sealGives(s, enc).map(({ x, n }) => [x.id, n]).filter(([, n]) => n).sort(), [['encryptor', 2], ['pulse', 2]]);
  assert.equal(tellPrice(s, tellsOf(s).list.find((t) => t.id === 'keyrotation')).armor, 4, 'its price: 4 ◆ in all');
  hold(s);
  assert.deepEqual([enc.armor, enc.maxArmor, pulse.armor], [4, 6, 2], 'two back on each, its own max unchanged');
  assert.equal(s.encounter.shield, 20, 'a third of its ◆ were on (2 of 6): a third of your shield goes');
  assert.ok(s.encounter.corrupt?.amount < Math.round(s.server.max * tellsOf(s).tier.burn), 'Corrupted at that share');
  // Never past a part's max: a part one short gets one.
  const f = fight();
  deal(f, ['keyrotation', 'fulldisk']); quiet(f);
  const e2 = Object.assign(part(f, 'encryptor'), { armor: 3, maxArmor: 4 }), p2 = Object.assign(part(f, 'pulse'), { armor: 2, maxArmor: 3, patchAt: 99 });
  tell(f, 'keyrotation', 'encryptor', 0);
  hold(f);
  assert.deepEqual([e2.armor, p2.armor], [4, 3]);
  // A full strip costs nothing: it fails, and nothing comes back.
  const g = fight();
  deal(g, ['keyrotation', 'fulldisk']); quiet(g);
  Object.assign(part(g, 'encryptor'), { armor: 0, maxArmor: 6 }); const p3 = Object.assign(part(g, 'pulse'), { armor: 0, maxArmor: 3, patchAt: 99 });
  g.encounter.shield = 30;
  tell(g, 'keyrotation', 'encryptor', 0);
  const ev = (command(g, 'hold'), resolveCycle(g));
  assert.ok(ev.some((x) => /fails/.test(x.message || '')));
  assert.deepEqual([p3.armor, g.encounter.shield], [0, 30]);
});

test("a seal's cell shows the ◆ it would hand out, in steel, and its tooltip says how the dial works", () => {
  const s = fight();
  deal(s, ['keyrotation', 'fulldisk']); quiet(s);
  Object.assign(part(s, 'encryptor'), { armor: 3, maxArmor: 5 });
  tell(s, 'keyrotation', 'encryptor', 2);
  const html = boardMarkup(s, null);
  const out = tellIntents(s).find((x) => x.id === 'keyrotation').armorOut;
  assert.match(html, new RegExp(`<small class="tl-what tl-armor">\\+${out} ◆</small>`), 'the ◆ it would hand out in all');
  assert.match(html, /title="Key Rotation: Gives every part 1 ◆ back for each ◆ the Encryptor still wears when it lands, never past a part(&#39;|')s max\. That is 3 ◆ a part now, \d+ in all\./);
});

test('the planner strips a sealing part when that saves what it would hand out, and not when its plan strips it anyway', () => {
  const s = fight({ level: 18 });
  deal(s, ['keyrotation', 'fulldisk']); quiet(s);
  others(s, ['encryptor', 'pulse']);
  const enc = Object.assign(part(s, 'encryptor'), { armor: 1, maxArmor: 6, integrity: 900, max: 900 });
  Object.assign(part(s, 'pulse'), { armor: 0, maxArmor: 4, integrity: 900, max: 900, patchAt: 99 });
  tell(s, 'keyrotation', 'encryptor', 0);
  const cmd = planner(s);
  assert.match(cmd, / encryptor$/, `its last ◆ would come back on both parts: strip it (${cmd})`);
  assert.ok(bestStrip(s, enc), 'a strip is ready');
  // With time to spare, it waits.
  tell(s, 'keyrotation', 'encryptor', 3);
  assert.doesNotMatch(planner(s), /^(crack|spike|shaped-charge) encryptor$/, 'three cycles out, one strip needed: later');
});

// ---------- 3.6 prices and SIGINT ----------
test('each cast shows its price: Double Extortion and Persistence the Signal the attacks due in their cycles would add, Self-Update a quarter of what each part has left', () => {
  const s = fight();
  deal(s, ['extortion', 'fulldisk']); quiet(s);
  others(s, ['encryptor', 'pulse']);
  const pulse = part(s, 'pulse'), c = s.encounter.cycle;
  Object.assign(pulse.attack, { effect: 'damage', amount: 20, interval: 2, due: c + 2 });
  const t = tell(s, 'extortion', 'encryptor', 1);
  // It lands next cycle, and lasts 4: the Pulse Node's hits on c+2 and c+4 (c+6 is out), 35% more each.
  const per = Math.round(20 * (TELL.loud - 1)), lands = [c + 2, c + 4].filter((x) => x <= c + 1 + TELL.castLasts).length;
  assert.equal(tellPrice(s, t).signal, lands * per);
  const i = tellIntents(s).find((x) => x.id === 'extortion');
  assert.equal(i.price, lands * per);
  assert.match(boardMarkup(s, null), new RegExp(`<small class="tl-what tl-price">−${lands * per}</small>`));
  // Self-Update: a quarter of each part's Integrity now, so it's cheap late.
  const w = fight({ family: 'worm' });
  deal(w, ['selfupdate', 'massmailer']); quiet(w);
  const parts = livingParts(w).filter((p) => p.kind === 'system');
  const tu = tell(w, 'selfupdate', parts.find((p) => p.special).id, 0);
  const full = parts.reduce((n, p) => n + growOf(p), 0);
  assert.equal(tellPrice(w, tu).hp, full);
  for (const p of parts) p.integrity = Math.round(p.max / 4);
  assert.ok(tellPrice(w, tu).hp < full / 3, 'a quarter of what is left');
  const before = parts.map((p) => [p.max, p.integrity]);
  hold(w);
  parts.forEach((p, k) => assert.equal(p.integrity - before[k][1], Math.round(before[k][1] * TELL.grow), `${p.name} grows a quarter of what it had`));
});

test('SIGINT cuts a charge on its cycle as a cut does; with a cast and a charge both open, it stops the one that lands first', () => {
  const s = fight();
  deal(s, ['fulldisk', 'extortion']); quiet(s);
  const enc = part(s, 'encryptor'), c = s.encounter.cycle;
  const t = tell(s, 'fulldisk', 'encryptor', 1);
  assert.match(command(s, 'sigint').at(-1).message, /Too early\. Full Disk's window opens next cycle/);
  hold(s);
  const n = enc.attack.n || 0, hp0 = s.server.integrity;
  fire(s, 'sigint');
  assert.ok(!t.told, 'the charge is answered');
  assert.equal(s.server.integrity, hp0, 'nothing lands: the attack it rode is cancelled');
  assert.equal(enc.attack.n, n + 1, 'and its schedule goes on as if it had landed');
  assert.equal(enc.attack.due, c + 1 + enc.attack.interval);
  // Both open: the charge lands this cycle, the cast next. SIGINT now stops the charge; the cast's window stays open.
  const b = fight();
  deal(b, ['fulldisk', 'extortion']); quiet(b);
  const tc = tell(b, 'fulldisk', 'encryptor', 0), tx = tell(b, 'extortion', 'pulse', 1);
  assert.equal(sigintTarget(b), tc);
  fire(b, 'sigint');
  assert.ok(!tc.told && tx.told);
});

test('the planner SIGINTs the dearer tell, and cuts or lets land the cheaper one', () => {
  // A cheap cast open now, a dear charge on another part next cycle that no cut can reach: SIGINT waits for the charge.
  const s = fight({ level: 18 });
  deal(s, ['fulldisk', 'extortion']); quiet(s);
  others(s, ['encryptor', 'pulse']);
  const enc = Object.assign(part(s, 'encryptor'), { armor: 5, maxArmor: 5, integrity: 900, max: 900 });
  Object.assign(part(s, 'pulse'), { armor: 0, maxArmor: 0, integrity: 900, max: 900 });
  enc.attack = { name: 'Encrypt', effect: 'damage', amount: 60, interval: 6, due: 999 };
  const tx = tell(s, 'extortion', 'pulse', 0), tc = tell(s, 'fulldisk', 'encryptor', 1);
  assert.ok(tellPrice(s, tc).signal > tellPrice(s, tx).signal, 'the charge is dearer');
  assert.ok(!dearest(s, tx) && dearest(s, tc));
  assert.notEqual(planner(s), 'sigint', 'no SIGINT on the cheap cast');
  // Alone, the cast is the dearest there is: SIGINT it.
  tc.told = false;
  assert.equal(planner(s), 'sigint');
});

test('the SIGINT key shows its cooldown against each window: a pip per cast and charge, struck when it won\'t be ready', () => {
  const s = fight();
  deal(s, ['fulldisk', 'extortion']); quiet(s);
  tell(s, 'fulldisk', 'encryptor', 3); tell(s, 'extortion', 'pulse', 1);
  let html = trayMarkup(s);
  assert.equal((html.match(/class="sg-w"/g) || []).length, 2, 'both reachable');
  assert.match(html, /title="Full Disk: Charge\. Its window opens in 3 cycles\. If it lands, it costs you \d+ Signal\.\n▸ SIGINT is ready\."/);
  s.encounter.readyAt.sigint = s.encounter.cycle + 2;
  html = trayMarkup(s);
  assert.equal((html.match(/class="sg-w late"/g) || []).length, 1, 'the cast closes before SIGINT is back');
  assert.deepEqual(sigintWindows(s).map((w) => [w.name, w.reach]), [['Double Extortion', false], ['Full Disk', true]]);
  assert.equal(readyIn(s, 'sigint'), 2);
});

// ---------- 7 routines ----------
// Your program runs only while installed (routines.mjs installPrograms): around one test, then put back.
const PROGRAM_HOOKS = ['program', 'programCycle', 'programActed', 'railCheck', 'walkStop'];
function withPrograms(fn) {
  const was = PROGRAM_HOOKS.map((k) => hooks[k]);
  R.installPrograms();
  try { return fn(); } finally { PROGRAM_HOOKS.forEach((k, i) => { hooks[k] = was[i]; }); }
}
test('routines: seal dear on the sealing part and dearer, at the rule tier, each with its preset; a handler covers the tell', () => withPrograms(() => {
  const s = fight({ level: 18 });
  for (const p of s.encounter.virus.parts) s.research[R.refOf(s.encounter.virus, p)] = TIER.rule;
  deal(s, ['keyrotation', 'fulldisk', 'extortion']); quiet(s);
  const enc = Object.assign(part(s, 'encryptor'), { armor: 3, maxArmor: 5 });
  const ps = R.presetsFor(s, 'ransomware');
  const seal = ps.find((p) => p.id === 'seal:encryptor'), sig = ps.find((p) => p.id === 'sigint');
  assert.ok(seal && seal.part === 'encryptor', 'a seal preset on its part, as a lever');
  assert.equal(seal.handlers[0].when, 'ransomware:encryptor:sealdear');
  assert.deepEqual(sig.handlers, [{ when: 'dearer', do: 'sigint', target: 'that' }]);
  assert.equal(R.PART_WHEN.sealdear.ram, 2);
  assert.equal(R.GLOBAL_WHEN.dearer.ram, 2);
  // seal dear: within 2 cycles, 2 ◆ or more.
  command(s, 'program ransomware preset seal:encryptor');
  tell(s, 'keyrotation', 'encryptor', 3);
  assert.equal(peek(s)?.handler ?? -1, -1, 'three cycles out: not yet');
  tell(s, 'keyrotation', 'encryptor', 2);
  assert.equal(peek(s)?.handler, 0, 'two out with 3 ◆: it fires');
  assert.ok(!R.exceptionsOf(s).some((x) => x.kind === 'tell' && x.part === 'encryptor'), 'the seal is covered');
  enc.armor = 1;
  assert.equal(peek(s)?.handler ?? -1, -1, 'one ◆: cheap, let it land');
  // dearer → SIGINT: fires on the dearest open tell.
  const t = fight({ level: 18 });
  for (const p of t.encounter.virus.parts) t.research[R.refOf(t.encounter.virus, p)] = TIER.rule;
  deal(t, ['fulldisk', 'extortion']); quiet(t);
  command(t, 'program ransomware preset sigint');
  tell(t, 'extortion', 'encryptor', 1);
  assert.equal(peek(t)?.handler, 0);
  assert.equal(peek(t)?.text, 'sigint');
  assert.ok(!R.exceptionsOf(t).some((x) => x.kind === 'tell'), 'the cast is covered');
}));

// ---------- 6 no fixed rule ----------
test("solved.mjs: the seal's fights are the Sentinel's, the SIGINT fights carry a charge and a cast, and each side does what it says", () => {
  assert.deepEqual(Object.keys(FIXED.seal.sides), ['always strip', 'never strip']);
  assert.deepEqual(Object.keys(FIXED.sigint.sides), ['every cast', 'only charges']);
  const seal = leverFights(FIXED.seal, 18, 3);
  assert.equal(seal.length, 3);
  assert.ok(seal.every(([key]) => key === 'sentinel'));
  const sig = leverFights(FIXED.sigint, 18, 3);
  assert.equal(sig.length, 3);
  // The sides, on a board with a seal said on a part with ◆ and another part to hit.
  const s = fight({ level: 18 });
  deal(s, ['keyrotation', 'fulldisk']); quiet(s);
  others(s, ['encryptor', 'pulse']);
  Object.assign(part(s, 'encryptor'), { armor: 3, maxArmor: 5, integrity: 900, max: 900 });
  Object.assign(part(s, 'pulse'), { armor: 0, maxArmor: 0, integrity: 900, max: 900 });
  tell(s, 'keyrotation', 'encryptor', 2);
  assert.match(FIXED.seal.sides['always strip'](planner)(s), / encryptor$|^shaped-charge|^fork-bomb/);
  const never = FIXED.seal.sides['never strip'](() => 'crack encryptor')(s);
  assert.doesNotMatch(never, / encryptor$/, `never at the sealing part (${never})`);
  assert.equal(TELL.bots.seal, undefined, 'the switch is put back');
});

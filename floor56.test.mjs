// Floors 5 and 6's sets and uniques (docs/floor-items.md: levels 25-40, the thin middle in docs/item-builds.md): their
// data (name, slot, level, source and the source it moves to once built), and what each new effect kind does in a fight.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, addItem, loaded, UNIQUES, maxSignal, damageMultiplier, hit, takeDamage, cooldownOf, delayAttack, shieldWatch, tellStarted, floorUniques, setBonusCount } from './dist/combat.mjs';
import { uniqueItem, seeded, BASES, STATS } from './dist/gear.mjs';
import { CONFIG, defaultSub } from './dist/data.mjs';
import { SETS, SET_HOOKS, activeSets, sourcePool } from './dist/sets.mjs';
import { checkItems, fxText, fxList } from './dist/content.mjs';
import ITEMS from './dist/content/items.mjs';

CONFIG.length = { ...CONFIG.length, heal: null };
CONFIG.gearReq = 99;
CONFIG.baseCrit = -100; CONFIG.enemyCrit = 0; CONFIG.misses = false; // no crit unless one is forced: gear's crit stays under 100

// The plan's pieces and uniques: id, name, slot, level, source kind, floor, planned (the source it moves to once built).
const SETS56 = {
  fineprint: ['Fine Print', [26, 32], [['rider', 'Rider', 'proxy', 26], ['copay', 'Copay', 'shell', 27], ['exclusion', 'Exclusion', 'script', 30], ['premium', 'Premium', 'implant', 32]], ['lair', 5, 'Underwriting desk: its vaults and Core']],
  contiguous: ['Contiguous', [27, 31], [['sector', 'Sector', 'exploit', 27], ['cluster', 'Cluster', 'implant', 29], ['allocation-table', 'Allocation Table', 'script', 31]], ['lair', 5, 'Defrag boards']],
  crypter: ['Crypter', [26, 31], [['stub', 'Stub', 'exploit', 26], ['junk-code', 'Junk Code', 'script', 28], ['decryptor', 'Decryptor', 'shell', 31]], ['lair', 5, 'Polymorph kills']],
  domainadmin: ['Domain Admin', [32, 37], [['ticket', 'Ticket', 'implant', 32], ['group-policy', 'Group Policy', 'proxy', 33], ['schema', 'Schema', 'shell', 35], ['admin-rights', 'Admin Rights', 'exploit', 37]], ['lair', 6, 'Domain Controller vaults']],
  semaphore: ['Semaphore', [33, 37], [['spinlock', 'Spinlock', 'script', 33], ['semaphore', 'Semaphore', 'implant', 35], ['critical-section', 'Critical Section', 'shell', 37]], ['puzzle', 6, null]],
  hiddenprocess: ['Hidden Process', [32, 36], [['unlink', 'Unlink', 'exploit', 32], ['hollow', 'Hollow', 'script', 34], ['driver', 'Driver', 'implant', 36]], ['lair', 6, 'Rootkit kills']],
  watertight: ['Watertight', [34, 38], [['hatch', 'Hatch', 'proxy', 34], ['seal-plate', 'Seal Plate', 'shell', 36], ['pressure-door', 'Pressure Door', 'implant', 38]], ['lair', 6, 'Kestrel ICE on floor 6']],
};
// Built since (floorbosses.mjs): their boss drops them.
const BUILT56 = { 'GRACE PERIOD': 'graceperiod', 'EXIT NODE': 'exitnode' };
const U56 = [
  ['installment', 'Installment', 'implant', 28, 5, 'GRACE PERIOD'], ['late-fee', 'Late Fee', 'exploit', 28, 5, 'GRACE PERIOD'],
  ['antibody', 'Antibody', 'exploit', 32, 5, 'PARASITE'], ['tourniquet', 'Tourniquet', 'proxy', 32, 5, 'PARASITE'],
  ['hidden-service', 'Hidden Service', 'implant', 30, 5, 'EXIT NODE'], ['tail-circuit', 'Tail Circuit', 'exploit', 30, 5, 'EXIT NODE'],
  ['moral-hazard', 'Moral Hazard', 'exploit', 40, 5, 'ACTUARY'], ['reinsurance', 'Reinsurance', 'proxy', 40, 5, 'ACTUARY'],
  ['syscall-table', 'Syscall Table', 'script', 34, 6, 'RING ZERO'], ['ring-minus-one', 'Ring Minus One', 'implant', 34, 6, 'RING ZERO'],
  ['load-path', 'Load Path', 'exploit', 36, 6, 'BRICKWALL'], ['recovery-mode', 'Recovery Mode', 'script', 36, 6, 'BRICKWALL'],
  ['notice-period', 'Notice Period', 'script', 36, 6, 'BULKHEAD'], ['pressure-relief', 'Pressure Relief', 'shell', 36, 6, 'BULKHEAD'],
  ['generator', 'Generator', 'implant', 34, 6, 'BLACKOUT'], ['ups', 'UPS', 'shell', 34, 6, 'BLACKOUT'],
  ['dkom', 'DKOM', 'script', 33, 6, 'Rootkit kills'], ['golden-ticket', 'Golden Ticket', 'implant', 36, 6, 'Domain Controller Core vault'],
  ['pass-the-hash', 'Pass the Hash', 'exploit', 35, 6, 'Domain Controller vaults'],
];

// ---------- fixtures (deep-uniques.test.mjs's) ----------
const L = 50;
const vet = (cls = 'breaker') => { const s = fresh(); s.hackers = { [cls]: { level: L, xp: 0 } }; s.loadout.archetype = cls; s.loadout.sub = { [cls]: defaultSub(cls) }; return s; };
const wear = (s, ...ids) => ids.map((id) => { const it = addItem(s, uniqueItem(UNIQUES[id], UNIQUES[id].level, seeded(1))); command(s, 'load ' + it.id); assert.ok(loaded(s).some((x) => x.id === it.id), `${id} loaded`); return it; });
const wearSet = (s, id) => wear(s, ...SETS[id].pieces);
// A fight with no tells, nothing due and no ◆: the test sets what lands, and when.
function fight(s, { hp = 1000 } = {}) {
  s.run = { loc: 'x', cwd: '/', integrity: hp, max: hp, pack: [], visited: ['/'] };
  selectEncounter(s, 'cryptjack', 7, { level: L, mutation: null, mode: 'run' });
  command(s, 'engage');
  const e = s.encounter;
  e.virus.tells = null; e.hardened = 0;
  for (const p of e.virus.parts) { p.armor = p.maxArmor = 0; p.integrity = p.max = 5000; if (p.attack) p.attack.due = 999; }
  return e;
}
const pulse = (s) => part(s, 'pulse');
const enc = (s) => part(s, 'encryptor');
const ratio = (a, b) => Math.round((a / b) * 1000) / 1000;
// What one attack from the Pulse Node took from your Signal this cycle (more: the attack's own fields).
function landed(s, amount, more = {}) {
  const e = s.encounter, p = pulse(s), mark = s.serial;
  Object.assign(p.attack, { amount, due: e.cycle, interval: 999, ...more });
  command(s, 'hold'); resolveCycle(s);
  return s.logs.filter((x) => x.id > mark && x.type === 'server-hit' && x.source === 'pulse').reduce((n, x) => n + x.amount, 0);
}
const hold = (s, n = 1) => { for (let i = 0; i < n; i++) { command(s, 'hold'); resolveCycle(s); } };
// Your damage multiplier on a part against a plain rig's, the same fight.
function against(id, set = () => {}, of = pulse, opts = { mine: true }) {
  const s = vet(); wear(s, id); fight(s);
  const t = vet(); fight(t);
  set(s); set(t);
  return ratio(damageMultiplier(s, of(s), opts), damageMultiplier(t, of(t), opts));
}
// What your command dealt to the Pulse Node this cycle.
function fired(s, cmd) {
  const mark = s.serial;
  command(s, cmd); resolveCycle(s);
  return s.logs.filter((x) => x.id > mark && x.type === 'damage' && x.target === 'pulse' && x.skill).reduce((n, x) => n + x.amount, 0);
}

// ---------- the data ----------
test('floors 5 and 6: seven sets and nineteen uniques, each with the plan\'s name, slot, level and source, and the source it moves to', () => {
  assert.deepEqual(checkItems(ITEMS, BASES, STATS).filter((x) => x.bad).map((x) => x.msg), []);
  const all = [];
  for (const [id, [name, levels, pieces, [kind, floor, planned]]] of Object.entries(SETS56)) {
    const set = SETS[id];
    assert.equal(set.name, name);
    assert.deepEqual(set.levels, levels, `${name}: its band`);
    assert.ok(levels[1] - levels[0] <= 6, `${name}: six levels or fewer, so its pieces stay useful together`);
    assert.deepEqual(set.pieces, pieces.map((p) => p[0]));
    for (const [pid, pname, slot, level] of pieces) {
      const u = UNIQUES[pid];
      assert.equal(u.set, id);
      all.push([u, pname, slot, level]);
      const src = u.sources[0];
      assert.equal(u.sources.length, 1);
      assert.deepEqual([src.kind, src.floor, src.planned || null], [kind, floor, planned], `${pname}: its source`);
      if (kind === 'puzzle') assert.equal(src.id, 'deadlock', 'Semaphore: deep Deadlock boards');
      assert.ok(u.effect?.text && u.green?.text, `${pname}: its own bonus and its green line`);
    }
  }
  for (const [id, name, slot, level, floor, planned] of U56) {
    const u = UNIQUES[id];
    assert.ok(u && !u.set, id);
    all.push([u, name, slot, level]);
    assert.deepEqual(u.sources, BUILT56[planned] ? [{ kind: 'boss', id: BUILT56[planned] }] : [{ kind: 'lair', floor, planned }], `${name}: its floor's lair boss until ${planned} is built, then that boss`);
    assert.ok(u.flavour && !/break.?in|keyhole|breach|way in|intru|backdoor/i.test(u.flavour), `${name}: flavour`);
  }
  assert.equal(all.length, 23 + 19);
  // No rule names a virus, a family, a server kind or a boss.
  const words = /grace period|parasite|exit node|actuary|ring zero|brickwall|bulkhead|blackout|rootkit|polymorph|domain controller|kestrel|underwriting|cryptjack/i;
  for (const [u, name, slot, level] of all) {
    assert.equal(u.name, name);
    assert.equal(BASES[u.base].slot, slot, `${name}: slot`);
    assert.equal(u.level, level, `${name}: level`);
    assert.ok(fxText(fxList(u)) && !words.test(fxText(fxList(u))), `${name}: a general rule`);
    for (const [k, v] of Object.entries({ ...u.primary, ...u.secondary })) for (const x of [].concat(v)) assert.ok(Number.isInteger(x), `${name}: whole numbers (${k})`);
    // A sidegrade: its slot's best base at its level, never far past it.
    const main = slot === 'exploit' ? 'damage' : 'signal';
    const it = uniqueItem({ ...u, secondary: {} }, level, seeded(3)).stats[main], base = uniqueItem({ ...u, primary: {}, secondary: {}, downside: {} }, level, seeded(3)).stats[main];
    assert.ok(it >= base * 0.95 && it <= base * 1.1, `${name}: ${it} against a base's ${base}`);
  }
  // Where they drop: floor 5's lair boss rolls its uniques (ACTUARY's level-40 pair once the boss is 38 or more), floor 6's
  // its own; the set pieces come from the set roll; Semaphore from Deadlock boards on floor 6.
  assert.deepEqual(floorUniques('lair', 5, 32).map((u) => u.id).sort(), U56.filter((x) => x[4] === 5 && x[3] <= 34 && !BUILT56[x[5]]).map((x) => x[0]).sort());
  assert.deepEqual(floorUniques('lair', 6, 38).map((u) => u.id).sort(), U56.filter((x) => x[4] === 6).map((x) => x[0]).sort());
  assert.deepEqual(sourcePool({ kind: 'puzzle', id: 'deadlock', floor: 6 }).map((u) => u.id), SETS.semaphore.pieces);
  assert.deepEqual(sourcePool({ kind: 'puzzle', id: 'deadlock', floor: 2 }).map((u) => u.id), [], 'not a shallow board');
});

// ---------- your hits ----------
test('Installment: your first hit on each part every 3 cycles deals 10% more', () => {
  const s = vet(); wear(s, 'installment'); const e = fight(s);
  const t = vet(); fight(t);
  const m = (of) => ratio(damageMultiplier(s, of(s), { mine: true }), damageMultiplier(t, of(t), { mine: true }));
  assert.equal(m(pulse), 1.1);
  hit(s, pulse(s), 10, { mine: true });
  assert.equal(m(pulse), 1, 'spent on that part');
  assert.equal(m(enc), 1.1, 'the other part still pays');
  e.cycle += 2; t.encounter.cycle += 2;
  assert.equal(m(pulse), 1, 'not 2 cycles later');
  e.cycle += 1; t.encounter.cycle += 1;
  assert.equal(m(pulse), 1.1, 'again 3 cycles later');
});

test('damage% on the new conditions: Late Fee, Antibody, Tail Circuit, Junk Code; Moral Hazard by the tells that landed', () => {
  assert.equal(against('late-fee'), 1, 'Late Fee: not on a part that never patched');
  // A ◆ patched back at a cycle's end marks the part.
  { const s = vet(); wear(s, 'late-fee'); fight(s); const p = pulse(s); p.maxArmor = 1; p.armor = 0; p.patchAt = s.encounter.cycle; hold(s); assert.equal(p.armor, 1); assert.ok(p.repatched); }
  assert.equal(against('late-fee', (s) => { pulse(s).repatched = true; }), 1.15);
  // Antibody: a part that healed since your last hit on it, seen at the cycle's end.
  { const s = vet(); wear(s, 'antibody'); fight(s); const t = vet(); fight(t);
    const m = () => ratio(damageMultiplier(s, pulse(s), { mine: true }), damageMultiplier(t, pulse(t), { mine: true }));
    hit(s, pulse(s), 100, { mine: true }); hold(s); hold(t);
    assert.equal(m(), 1, 'Antibody: nothing healed');
    pulse(s).integrity += 50; hold(s); hold(t);
    assert.equal(m(), 1.4, 'Antibody: it healed');
    hold(s); hold(t);
    assert.equal(m(), 1, 'Antibody: only the cycle after the heal');
    // Tail Circuit: more Integrity than 2 cycles ago.
    const u = vet(); wear(u, 'tail-circuit'); fight(u); const v = vet(); fight(v);
    const n = () => ratio(damageMultiplier(u, pulse(u), { mine: true }), damageMultiplier(v, pulse(v), { mine: true }));
    pulse(u).integrity = 3000; hold(u, 2); hold(v, 2);
    assert.equal(n(), 1, 'Tail Circuit: the same as 2 cycles ago');
    pulse(u).integrity = 3100;
    assert.equal(n(), 1.1, 'Tail Circuit: more than 2 cycles ago');
  }
  // Junk Code (a set piece's own bonus): more on a part wearing ◆, to a hit that gets through it.
  { const s = vet(); wear(s, 'junk-code'); fight(s); const t = vet(); fight(t);
    const m = () => ratio(damageMultiplier(s, pulse(s), { mine: true }), damageMultiplier(t, pulse(t), { mine: true }));
    assert.equal(m(), 1);
    pulse(s).armor = pulse(t).armor = 1;
    assert.equal(m(), 1.06); }
  assert.equal(against('moral-hazard', (s) => { s.encounter.metrics.tells = { a: { landed: 3 }, b: { landed: 1 } }; }), 1.12, 'Moral Hazard: 3% for each of 4 tells');
  assert.equal(against('moral-hazard', (s) => { s.encounter.metrics.tells = { a: { landed: 20 } }; }), 1.3, 'Moral Hazard: up to 30%');
});

test('Ring Minus One: a skill that waited ready 2 cycles; Syscall Table: a run of different skills, reset by a repeat', () => {
  const s = vet(); wear(s, 'ring-minus-one'); fight(s);
  const one = fired(s, 'spike pulse'), now = () => ratio(fired(s, 'spike pulse'), one); // the first, on cycle 1: ready since the fight began
  hold(s, 2);
  assert.ok(Math.abs(now() - 1.15) < 0.03, 'Ring Minus One: ready for 2 cycles');
  assert.equal(now(), 1, 'Ring Minus One: fired again at once');
  hold(s);
  assert.equal(now(), 1, 'Ring Minus One: ready 1 cycle');
  hold(s, 2);
  assert.ok(Math.abs(now() - 1.15) < 0.03, 'Ring Minus One: and 2 again');
  // Syscall Table: the run is the skills fired since the last repeat (Spike here, standing in for each).
  const u = vet(); wear(u, 'syscall-table'); fight(u);
  const base = fired(u, 'spike pulse'), st = u.encounter.fxs, next = () => ratio(fired(u, 'spike pulse'), base);
  assert.deepEqual(st.sysRun, ['spike'], 'Syscall Table: the run starts');
  assert.deepEqual(st.sysRun, ['spike']);
  st.sysRun = ['x', 'y']; // two different skills landed before this one
  assert.ok(Math.abs(next() - 1.1) < 0.03, 'Syscall Table: 5% for each different skill before it');
  assert.deepEqual(st.sysRun, ['x', 'y', 'spike']);
  st.sysRun = ['spike', 'x', 'y', 'z', 'w', 'q', 'r'];
  assert.equal(next(), 1, 'Syscall Table: a repeat resets it');
  assert.deepEqual(st.sysRun, ['spike']);
  st.sysRun = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  assert.ok(Math.abs(next() - 1.25) < 0.03, 'Syscall Table: up to 25%');
});

test('out of reach: Generator sends your command on, DKOM pays on its return, Hidden Process (3) keeps burns ticking', () => {
  const freeze = (s, until) => Object.assign(pulse(s), { frozen: s.encounter.cycle, thawAt: until });
  // Generator: a frozen part takes nothing; with it, the next part takes the command at full.
  const s = vet(); wear(s, 'generator'); fight(s); freeze(s, 9);
  const t = vet(); fight(t); freeze(t, 9);
  assert.equal(hit(t, pulse(t), 100, { mine: true }).dealt, 0, 'frozen: nothing reaches it');
  const was = enc(s).integrity;
  assert.ok(hit(s, pulse(s), 100, { mine: true }).dealt > 0 && enc(s).integrity < was, 'Generator: the Encryptor takes it');
  assert.equal(pulse(s).integrity, pulse(s).max);
  // DKOM: a part out of reach last cycle and back in it now.
  const u = vet(); wear(u, 'dkom'); fight(u); freeze(u, 1);
  const v = vet(); fight(v); freeze(v, 1);
  const m = () => ratio(damageMultiplier(u, pulse(u), { mine: true }), damageMultiplier(v, pulse(v), { mine: true }));
  assert.equal(m(), 1, 'DKOM: still frozen');
  hold(u); hold(v);
  assert.equal(m(), 1.25, 'DKOM: thawed this cycle');
  hit(u, pulse(u), 10, { mine: true });
  assert.equal(m(), 1, 'DKOM: your first hit only');
  // Hidden Process (3): a burn's tick on a frozen part.
  const w = vet(); wearSet(w, 'hiddenprocess'); fight(w); freeze(w, 9);
  const b = { id: 'b', target: 'pulse', damage: 10, left: 3 };
  assert.ok(hit(w, pulse(w), 10, { by: 'Burn', dot: true, burn: b }).dealt > 0, 'Hidden Process (3): the burn ticks on');
  assert.equal(hit(t, pulse(t), 10, { by: 'Burn', dot: true, burn: b }).dealt, 0, 'without it, nothing');
  assert.equal(hit(w, pulse(w), 10, { mine: true }).dealt, 0, 'your commands still find nothing');
});

test('Load Path: a hit that breaks a ◆ still deals 15% of its damage; Pass the Hash: a crit passes to another part, once every 3 cycles', () => {
  const s = vet(); wear(s, 'load-path'); fight(s);
  const t = vet(); fight(t);
  for (const x of [s, t]) Object.assign(pulse(x), { armor: 2, maxArmor: 2 });
  hit(t, pulse(t), 200, { mine: true });
  assert.equal(pulse(t).integrity, pulse(t).max, 'a ◆ takes it all');
  hit(s, pulse(s), 200, { mine: true });
  const lost = pulse(s).max - pulse(s).integrity, full = hit(s, enc(s), 200, { mine: true }).dealt; // the same hit on a bare part
  assert.ok(pulse(s).armor < 2 && lost > 0 && Math.abs(lost - full * 0.15) <= 3, `Load Path: ${lost}, about 15% of ${full}`);
  const u = vet(); wear(u, 'pass-the-hash'); const e = fight(u);
  assert.ok(hit(u, pulse(u), 50, { mine: true, crit: true }).crit);
  assert.equal(hit(u, pulse(u), 50, { mine: true }).crit, false, 'not on the same part');
  assert.equal(hit(u, enc(u), 50, { mine: true }).crit, true, 'the next hit on another part');
  assert.equal(hit(u, pulse(u), 50, { mine: true }).crit, false, 'spent');
  hit(u, pulse(u), 50, { mine: true, crit: true });
  assert.equal(hit(u, enc(u), 50, { mine: true }).crit, false, 'once every 3 cycles');
  e.cycle += 3;
  hit(u, pulse(u), 50, { mine: true, crit: true });
  assert.equal(hit(u, enc(u), 50, { mine: true }).crit, true, 'and again 3 cycles later');
});

// ---------- the hits you take ----------
test('Hidden Service halves an attack every 6 cycles; UPS cuts the first 3 cycles\' hits; Recovery Mode caps a hit below half', () => {
  const s = vet(); wear(s, 'hidden-service'); const e = fight(s);
  const one = landed(s, 400), two = landed(s, 400);
  assert.equal(two - one, 200, `Hidden Service: the first attack deals half (${one}, then ${two})`);
  e.cycle += 6;
  assert.equal(landed(s, 400), one, 'Hidden Service: again 6 cycles later');
  const t = vet(); wear(t, 'ups'); fight(t);
  const early = landed(t, 400); hold(t, 2);
  const late = landed(t, 400);
  assert.equal(late - early, 80, `UPS: 20% less in the first 3 cycles (${early}, then ${late})`);
  const u = vet(); wear(u, 'recovery-mode'); const f = fight(u);
  const full = landed(u, 300);
  u.run.integrity = 400;
  assert.equal(landed(u, 300), 150, 'Recovery Mode: below half, capped at 15% of your max');
  u.run.integrity = 400;
  assert.equal(landed(u, 300), full, 'Recovery Mode: once every 6 cycles');
  f.cycle += 6; u.run.integrity = 400;
  assert.equal(landed(u, 300), 150);
  u.run.integrity = 900; f.cycle += 6;
  assert.equal(landed(u, 300), full, 'Recovery Mode: not above half');
});

test('Copay, Pressure Relief, Tourniquet: the first hit, a delayed attack and a siphon deal less; Reinsurance gives back a big hit as a shield', () => {
  const s = vet(); wear(s, 'copay'); fight(s);
  const a = landed(s, 500), b2 = landed(s, 500);
  assert.equal(b2 - a, 100, 'Copay: the first hit each fight deals 20% less');
  const u = vet(); wear(u, 'pressure-relief'); const e = fight(u);
  const plain = landed(u, 500);
  assert.equal(plain - landed(u, 500, { late: { due: e.cycle, by: '1:' } }), 100, 'Pressure Relief: 20% less, landing late');
  const v = vet(); wear(v, 'tourniquet'); fight(v);
  const w = vet(); fight(w);
  enc(v).integrity = enc(w).integrity = 1000;
  const pv = landed(v, 400), sv = landed(v, 400, { siphon: true }), sw = landed(w, 400, { siphon: true });
  assert.equal(pv - sv, 200, `Tourniquet: a siphon deals 50% less (${sv} against ${pv})`);
  assert.equal(enc(v).integrity - 1000, Math.round(sv / 2), 'Tourniquet: and heals half of what it took');
  assert.equal(enc(w).integrity - 1000, sw, 'without it, all of it');
  const r = vet(); wear(r, 'reinsurance'); const f = fight(r);
  const took = landed(r, 600);
  const over = took - Math.floor(r.run.max * 0.3);
  assert.ok(over > 0 && f.shield === Math.ceil(over / 2), 'Reinsurance: half the excess as the cycle closes');
  hold(r);
  assert.equal(f.shield, 2 * Math.ceil(over / 2), 'and the rest the next');
  f.shield = 0;
  landed(r, 600); hold(r, 2);
  assert.equal(f.shield, 0, 'once each fight');
});

test('Notice Period: a tell starting takes a cycle off the cooldown nearest done; Golden Ticket doubles your first shield', () => {
  const s = vet(); wear(s, 'notice-period'); const e = fight(s);
  e.readyAt = { overload: e.cycle + 4, crack: e.cycle + 2 };
  tellStarted(s);
  assert.deepEqual(e.readyAt, { overload: e.cycle + 4, crack: e.cycle + 1 });
  const t = vet(); fight(t); t.encounter.readyAt = { crack: 9 }; tellStarted(t);
  assert.deepEqual(t.encounter.readyAt, { crack: 9 }, 'without it, nothing');
  const u = vet(), base = maxSignal(u); const [gt] = wear(u, 'golden-ticket');
  assert.equal(maxSignal(u), Math.round((base + gt.stats.signal) * 1.06), 'Golden Ticket: 6% more max Signal');
  const f = fight(u);
  f.shield = 30; shieldWatch(u);
  assert.equal(f.shield, 60, 'the first shield, doubled');
  f.shield = 70; shieldWatch(u);
  assert.equal(f.shield, 70, 'only the first');
});

// ---------- the sets ----------
test('Fine Print: +8% max Signal (2), a tell that lands shields you (3), more damage behind a shield (4)', () => {
  const s = vet(); wearSet(s, 'fineprint'); const e = fight(s);
  assert.deepEqual(activeSets(loaded(s)).find((r) => r.id === 'fineprint').open, [2, 3, 4]);
  SET_HOOKS.struck(s, { name: 'Surge' }, 50, pulse(s));
  assert.equal(e.shield || 0, 0, 'not a plain attack');
  SET_HOOKS.struck(s, { name: 'Surge', tell: true }, 50, pulse(s));
  assert.equal(e.shield, Math.round(s.run.max * 0.05), 'Fine Print (3): 5% of your max');
  const was = damageMultiplier(s, pulse(s), { mine: true });
  e.shield = 0;
  assert.equal(ratio(was, damageMultiplier(s, pulse(s), { mine: true })), 1.1, 'Fine Print (4): 10% more while a shield holds');
  assert.equal(setBonusCount(s), 3);
});

test('Contiguous (3): each command in a row on one part deals 6% more than the last, up to 18%', () => {
  const s = vet(); wearSet(s, 'contiguous'); fight(s);
  const one = fired(s, 'spike pulse');
  const row = [1, 2, 3, 4].map(() => ratio(fired(s, 'spike pulse'), one));
  for (const [i, want] of [1.06, 1.12, 1.18, 1.18].entries()) assert.ok(Math.abs(row[i] - want) < 0.03, `${i + 2}th in a row: ${row[i]}`);
  fired(s, 'spike encryptor');
  assert.ok(Math.abs(ratio(fired(s, 'spike pulse'), one) - 1) < 0.03, 'another part starts the row over');
  hold(s);
  assert.ok(Math.abs(ratio(fired(s, 'spike pulse'), one) - 1) < 0.03, 'so does a cycle without a command');
});

test('Crypter (3) and Domain Admin (3, 4): a part\'s last ◆ broken crits your next hit elsewhere and eases a cooldown; from the third break, shorter cooldowns', () => {
  const s = vet(); wearSet(s, 'crypter'); fight(s);
  Object.assign(pulse(s), { armor: 1, maxArmor: 1 });
  hit(s, pulse(s), 50, { mine: true });
  assert.equal(pulse(s).armor, 0);
  assert.equal(hit(s, pulse(s), 50, { mine: true }).crit, false, 'not on the part you stripped');
  assert.equal(hit(s, enc(s), 50, { mine: true }).crit, true, 'Crypter (3): the next hit on another part');
  assert.equal(hit(s, enc(s), 50, { mine: true }).crit, false, 'once');
  const t = vet(); wearSet(t, 'domainadmin'); const e = fight(t);
  e.readyAt = { overload: e.cycle + 4, crack: e.cycle + 3 };
  Object.assign(pulse(t), { armor: 1, maxArmor: 1 });
  hit(t, pulse(t), 50, { mine: true });
  assert.deepEqual(e.readyAt, { overload: e.cycle + 4, crack: e.cycle + 2 }, 'Domain Admin (3)');
  const id = 'overload', cd = cooldownOf(t, id);
  e.breaks = 2;
  assert.equal(cooldownOf(t, id), cd);
  e.breaks = 3;
  assert.equal(cooldownOf(t, id), Math.max(1, cd - 1), 'Domain Admin (4): from the third break');
});

test('Semaphore (3): an attack you delay leaves its part Open for 1 cycle; Watertight (3): a big hit softens the next within 2 cycles', () => {
  const s = vet(); wearSet(s, 'semaphore'); const e = fight(s);
  pulse(s).attack.due = e.cycle + 2;
  delayAttack(s, pulse(s), 1);
  assert.equal(pulse(s).openUntil, e.cycle + 1);
  const t = vet(); wearSet(t, 'watertight'); const f = fight(t);
  const full = (n) => { const d = landed(t, n); t.run.integrity = t.run.max; return d; };
  const small = full(100), after = full(100);
  assert.equal(after, small, 'Watertight (3): a hit under 15% of your max sets nothing');
  const a = full(400), b = full(400), c = full(400);
  assert.equal(a - b, 80, 'Watertight (3): 20% less, after a big hit');
  assert.equal(c, b, 'and again after that one, a big hit too');
  f.cycle += 3;
  assert.equal(full(400), a, 'not 3 cycles later');
});

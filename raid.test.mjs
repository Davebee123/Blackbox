// Crew bosses (raid.mjs): target rules, telegraphs, the mechanic library, SIGINT, the farm's three bosses
// phase by phase, and a crew sim smoke test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, keyMap, readyIn, part, heal, hit } from './dist/combat.mjs';
import { BOSSES } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import { openFarm } from './dist/rogue.mjs';
import { matesOf } from './dist/crew.mjs';
import { RAID, MECHANICS, raidOf, aggroOf, victims, raidIntents, raidMarks, fxOf, playersOf, mechDef, bossShare, crewHp, castNow, cleanse, pickMarked } from './dist/raid.mjs';
import { planner } from './dist/planner.mjs';

const ROOM = { foreman: '/intake/racks', heatsink: '/cooling/loop', coldwallet: '/ledger/core' };
// A fight against one of the farm's bosses, you (a Breaker) and a sim crew, at a level.
function bossFight(boss, { level = 18, crew = ['warden', 'sysop', 'payload'] } = {}) {
  const s = fresh(); s.tutorialCompleted = true; s.hackers = { breaker: { level, xp: 0 } }; s.loadout.sub = { breaker: 'demolitionist' };
  const loc = openFarm(s);
  play(s, 'crew sim ' + crew.join(' '));
  play(s, 'connect kessler');
  for (const [r, sp] of Object.entries(loc.spawns)) if (r !== ROOM[boss]) { sp.alive = false; sp.respawnAt = Date.now() + 1e12; }
  loc.state.unlocked['/ledger'] = true;
  play(s, 'cd ' + ROOM[boss]); play(s, 'attack');
  assert.ok(active(s) && raidOf(s), `a crew boss fight with ${boss}`);
  return s;
}
const mate = (s, who) => matesOf(s).find((m) => m.who === who);
const holdAll = (s) => { command(s, 'hold'); for (const m of matesOf(s).filter((m) => m.encounter)) { m.encounter.queue = { ability: 'hold', text: 'hold' }; m.encounter.plan = []; } };
// Make one mechanic of the current phase land at the end of this cycle (announced, at these players).
function due(s, id, who = null) {
  const m = raidOf(s).mechs[id];
  assert.ok(m, `${id} is in this phase`);
  m.next = s.encounter.cycle; m.told = true; if (who) m.who = who;
  for (const [k, x] of Object.entries(raidOf(s).mechs)) if (k !== id && x.next <= s.encounter.cycle) x.next = s.encounter.cycle + 50;
}
const quietParts = (s) => { for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999; };
const sig = (st) => st.run.integrity;

test('a crew boss is sized for its crew: four by default, smaller crews a smaller boss and smaller mechanics', () => {
  assert.ok(crewHp(4) === 1 && crewHp(3) < 1 && crewHp(2) < crewHp(3));
  const big = bossFight('foreman'), small = bossFight('foreman', { crew: ['warden', 'sysop'] });
  const hp = (s) => s.encounter.virus.parts.reduce((n, p) => n + p.max, 0);
  assert.ok(hp(small) < hp(big) * 0.8, 'a crew of three meets a smaller Foreman');
  assert.ok(raidOf(small).scale < raidOf(big).scale, 'and smaller mechanics');
  assert.ok(small.encounter.virus.enrageAt > big.encounter.virus.enrageAt, 'and a later enrage');
  assert.ok(!BOSSES.relayking.raid && !BOSSES.repoman.raid && !BOSSES.choir.raid && !BOSSES.resident.raid, 'the solo bosses stay solo');
});

test('targets: aggro is whoever draws fire, else the most damage over the last 3 cycles; marked is never the aggro holder; lowest; crew', () => {
  const s = bossFight('foreman');
  const r = raidOf(s), c = s.encounter.cycle, nyx = mate(s, 'nyx'), vanta = mate(s, 'vanta');
  r.dealt = { you: { [c]: 50 }, vanta: { [c - 1]: 80 }, kilo: { [c - 5]: 999 } };
  assert.equal(aggroOf(s), vanta, 'the most damage in the window (kilo\'s was too long ago)');
  nyx.encounter.buffs.sinkhole = c + 1;
  assert.equal(aggroOf(s), nyx, 'a taunt takes it');
  for (let i = 0; i < 20; i++) { raidOf(s).marked = {}; assert.notEqual(pickMarked(s, 1)[0], nyx, 'never the aggro holder'); }
  raidOf(s).marked = {};
  const two = pickMarked(s, 2);
  assert.equal(two.length, 2);
  const third = pickMarked(s, 1)[0];
  assert.ok(!two.includes(third) && third !== nyx, 'not anyone marked in the last few cycles, while there\'s anyone else');
  mate(s, 'kilo').run.integrity = 5;
  assert.equal(victims(s, {}, { target: 'lowest' })[0], mate(s, 'kilo'));
  assert.equal(victims(s, {}, { target: 'crew' }).length, 4);
  assert.deepEqual(Object.keys(MECHANICS).sort(), ['absorb', 'adds', 'burst', 'buster', 'dot', 'priority', 'pulse', 'shield']);
});

test('telegraphs: every mechanic is announced on the board and in the log before it lands, with its target and cycles left', () => {
  const s = bossFight('foreman');
  const first = s.logs.filter((e) => e.type === 'telegraph');
  assert.ok(first.length, 'announced from the start');
  for (const e of first) assert.match(e.message, /(→ \w+|everyone|online|goes up) .*in \d|in \d/);
  const told = new Map();
  for (let n = 0; n < 24 && active(s); n++) {
    for (const e of s.logs.filter((e) => e.type === 'telegraph')) if (!told.has(e.mech + '@' + e.at)) told.set(e.mech + '@' + e.at, e);
    for (const i of raidIntents(s)) {
      assert.ok(i.col >= 0 && i.col < 4);
      if (!i.left) assert.ok(told.has(i.id + '@' + (s.encounter.cycle + i.col)), `${i.name} is on the board only once it's announced`);
    }
    // Everything that lands this cycle was announced at least a cycle before.
    const landing = Object.entries(raidOf(s).mechs).filter(([, m]) => m.next === s.encounter.cycle);
    for (const [id, m] of landing) assert.ok(m.told && told.get(id + '@' + m.next)?.cycle < s.encounter.cycle, `${id} lands announced`);
    command(s, planner(s) || 'hold'); resolveCycle(s);
  }
  assert.ok([...told.values()].some((e) => /PINK SLIP → \w+ in 2\./.test(e.message)), 'the log reads PINK SLIP → nyx in 2.');
  assert.ok([...told.values()].some((e) => /compiling CLOCK IN .* SIGINT stops it\./.test(e.message)), 'a cast says Compiling and whether SIGINT stops it');
});

test('a buster lands on the aggro holder and, under half, leaves Thermal Stress (+25% a stack); Purge clears it', () => {
  const s = bossFight('foreman');
  assert.ok(!mechDef(s, 'pinkslip').stress, 'no stress on the day shift');
  for (const p of s.encounter.virus.parts) p.integrity = Math.max(1, Math.round(p.max * 0.45));
  holdAll(s); resolveCycle(s);
  for (const st of playersOf(s)) { st.run.integrity = st.run.max; fxOf(s, st.who || 'you').dots = []; }
  quietParts(s);
  const nyx = mate(s, 'nyx');
  nyx.encounter.buffs.sinkhole = s.encounter.cycle;
  due(s, 'pinkslip');
  holdAll(s);
  const was = sig(nyx), you = sig(s);
  resolveCycle(s);
  assert.ok(was - sig(nyx) > nyx.run.max * 0.5, `the tank takes the buster (${was - sig(nyx)})`);
  assert.equal(sig(s), you, 'nobody else does');
  assert.equal(fxOf(s, 'nyx').stress, 1);
  assert.ok(raidMarks(s, nyx).some((x) => /Stress ×1/.test(x.name)), 'the crew strip shows the stacks');
  assert.ok(cleanse(nyx, ['stress']) && fxOf(s, 'nyx').stress === 0, 'Purge clears it');
});

test('a pulse hits everyone, and a growing one more each time', () => {
  const s = bossFight('heatsink');
  quietParts(s);
  const before = playersOf(s).map(sig);
  due(s, 'spike'); holdAll(s); resolveCycle(s);
  const hit1 = playersOf(s).map((st, i) => before[i] - sig(st));
  assert.ok(hit1.every((n) => n > 0), 'everyone is hit');
  for (const st of playersOf(s)) st.run.integrity = st.run.max;
  due(s, 'spike'); holdAll(s); resolveCycle(s);
  const hit2 = playersOf(s).map((st) => st.run.max - sig(st));
  assert.ok(hit2[0] > hit1[0], `it grows (${hit1[0]} then ${hit2[0]})`);
});

test('a marked burst lands on the marked player only; Corruption ticks until Patch, Scrub or Purge cleanses it, and spreads if left', () => {
  const s = bossFight('heatsink');
  quietParts(s);
  due(s, 'overheat', ['kilo']); holdAll(s);
  const kilo = mate(s, 'kilo'), was = sig(kilo), you = sig(s);
  resolveCycle(s);
  assert.ok(was - sig(kilo) > kilo.run.max * 0.2 && sig(s) === you, 'only the marked one');
  // Phase 2: Coolant Leak, two players, until cleansed, spreading.
  for (const p of s.encounter.virus.parts) p.integrity = Math.max(1, Math.round(p.max * 0.3));
  holdAll(s); resolveCycle(s);
  assert.equal(raidOf(s).phase, 1, 'the Heatsink melts down under 40%');
  quietParts(s);
  due(s, 'leak', ['vanta']); holdAll(s); resolveCycle(s);
  const vanta = mate(s, 'vanta');
  assert.equal(fxOf(s, 'vanta').dots.length, 1);
  const a = sig(vanta); holdAll(s); resolveCycle(s);
  assert.ok(sig(vanta) < a, 'it ticks');
  for (let i = 0; i < 4; i++) { holdAll(s); resolveCycle(s); }
  assert.ok(playersOf(s).filter((st) => fxOf(s, st.who || 'you').dots.length).length >= 2, 'left on, it spreads to someone else');
  quietParts(s); holdAll(s);
  for (const m of Object.values(raidOf(s).mechs)) m.next = s.encounter.cycle + 50;
  command(mate(s, 'kilo'), 'patch vanta');
  resolveCycle(s);
  assert.equal(fxOf(s, 'vanta').dots.length, 0, 'Patch cleanses it');
});

test('encrypted sectors eat the next heals on their target; Scrub clears them', () => {
  const s = bossFight('coldwallet');
  for (const p of s.encounter.virus.parts) p.integrity = Math.max(1, Math.round(p.max * 0.45));
  holdAll(s); resolveCycle(s);
  assert.equal(raidOf(s).phase, 1, 'the bank run, under half');
  quietParts(s);
  due(s, 'sectors'); holdAll(s); resolveCycle(s);
  const who = playersOf(s).find((st) => fxOf(s, st.who || 'you').absorb > 0);
  assert.ok(who, 'someone carries encrypted sectors');
  const fx = fxOf(s, who.who || 'you'), had = fx.absorb;
  who.run.integrity = Math.round(who.run.max / 2);
  const hp = sig(who);
  heal(who, 10, 'Test heal');
  assert.equal(sig(who), hp + Math.max(0, 10 - had), 'the heal is eaten first');
  assert.equal(fx.absorb, Math.max(0, had - 10));
  fx.absorb = 30;
  cleanse(who, ['absorb']);
  assert.equal(fx.absorb, 0);
});

test('workers go for the marked player every cycle, unless someone draws fire; the Replicator sends them, and they die with the boss', () => {
  const s = bossFight('heatsink');
  quietParts(s);
  due(s, 'workers', ['vanta']); holdAll(s); resolveCycle(s);
  const adds = s.encounter.virus.parts.filter((p) => p.raidAdd === 'workers');
  assert.equal(adds.length, 2);
  const vanta = mate(s, 'vanta'), a = sig(vanta);
  holdAll(s); resolveCycle(s);
  assert.ok(sig(vanta) < a, 'they hit the marked one');
  const nyx = mate(s, 'nyx'); nyx.encounter.buffs.sinkhole = s.encounter.cycle + 3;
  const b = sig(vanta), t = sig(nyx);
  holdAll(s); resolveCycle(s);
  assert.ok(sig(vanta) >= b, 'a taunt pulls them');
  assert.ok(sig(nyx) < t);
  for (const p of s.encounter.virus.parts) if (!p.raidAdd) p.integrity = 1;
  command(s, 'spike ' + s.encounter.virus.parts.find((p) => !p.raidAdd && p.integrity > 0).id);
  for (const p of s.encounter.virus.parts) if (!p.raidAdd) p.integrity = 0;
  s.encounter.virus.parts.find((p) => !p.raidAdd).integrity = 1; s.encounter.virus.parts.find((p) => !p.raidAdd).armor = 0;
  resolveCycle(s);
  assert.equal(s.reports.at(-1).result, 'victory', 'breaking the boss takes its adds down');
});

test('a priority add wards the boss and goes off on everyone when its fuse runs out', () => {
  const s = bossFight('foreman');
  quietParts(s);
  due(s, 'payroll'); holdAll(s); resolveCycle(s);
  const box = s.encounter.virus.parts.find((p) => p.raidAdd === 'payroll');
  assert.ok(box && box.raidWard > 0, 'the Payroll Lockbox is up');
  const boss = s.encounter.virus.parts.find((p) => !p.raidAdd && p.attack !== undefined && !p.armor) || s.encounter.virus.parts.find((p) => !p.raidAdd);
  boss.armor = 0;
  const r = hit(s, boss, 100, {});
  assert.ok(r.dealt <= 30, `the ward cuts it (${r.dealt})`);
  assert.ok(raidIntents(s).some((i) => i.kind === 'priority' && i.left), 'its fuse is on the board');
  const before = playersOf(s).map(sig);
  box.raidFuse.at = s.encounter.cycle;
  for (const m of Object.values(raidOf(s).mechs)) m.next = s.encounter.cycle + 50;
  quietParts(s); holdAll(s); resolveCycle(s);
  assert.ok(s.logs.some((e) => /PAYROLL LOCKBOX goes off/.test(e.message)), 'unbroken, it goes off');
  assert.ok(playersOf(s).every((st, i) => sig(st) < before[i]));
});

test('a firewall phase: every hit lands on the shield, armor or not; unbroken in time, it goes off on everyone', () => {
  const s = bossFight('coldwallet');
  quietParts(s);
  due(s, 'coldstorage'); holdAll(s); resolveCycle(s);
  const sh = raidOf(s).shield;
  assert.ok(sh && sh.amount > 0);
  const p = s.encounter.virus.parts.find((x) => x.armor > 0);
  const armor = p.armor, hp = p.integrity;
  hit(s, p, 40, { mine: true });
  assert.equal(p.armor, armor, 'no chit breaks: the shield takes it');
  assert.equal(p.integrity, hp);
  assert.ok(raidOf(s).shield.amount < sh.max);
  const before = playersOf(s).map(sig);
  for (let i = 0; i < 4 && raidOf(s).shield; i++) { quietParts(s); holdAll(s); resolveCycle(s); }
  assert.ok(s.logs.some((e) => /COLD STORAGE holds, and it goes off on everyone/.test(e.message)));
  assert.ok(playersOf(s).every((st, i) => sig(st) < before[i]));
});

test('enrage: from its cycle a crew boss hits everyone every cycle; a wipe (half the crew down) loses the fight', () => {
  const s = bossFight('coldwallet');
  quietParts(s);
  s.encounter.virus.enrageAt = s.encounter.cycle;
  const before = playersOf(s).map(sig);
  holdAll(s); resolveCycle(s);
  assert.ok(s.logs.some((e) => /The boss is enraged, and LIQUIDATION hits everyone/.test(e.message)));
  assert.ok(playersOf(s).every((st, i) => sig(st) < before[i]));
  const t = bossFight('foreman');
  quietParts(t);
  mate(t, 'nyx').run.integrity = 1; mate(t, 'kilo').run.integrity = 1;
  due(t, 'bell'); holdAll(t); resolveCycle(t);
  assert.ok(!active(t));
  assert.ok(t.logs.some((e) => /WIPE\. Half the crew is down, so/.test(e.message)));
});

test('SIGINT: key 9 from level 10; it only stops a telegraphed cast, some casts can\'t be stopped, it\'s ready every 8 cycles, and the boss casts its next one a cycle sooner', () => {
  const nine = bossFight('foreman', { level: 9, crew: ['bastion', 'operator'] });
  assert.ok(!Object.values(keyMap(nine)).includes('sigint'), 'not before level 10');
  assert.ok(!Object.values(raidOf(nine).mechs).length || !raidOf(nine).mechs.clockin, 'and below 10 the Foreman doesn\'t cast what SIGINT would stop');
  const s = bossFight('foreman');
  assert.equal(keyMap(s)['9'], 'sigint');
  quietParts(s);
  for (const m of Object.values(raidOf(s).mechs)) { m.told = false; m.next = s.encounter.cycle + 40; }
  assert.match(command(s, 'sigint').at(-1).message, /Nothing is compiling/);
  // A cast compiling: Clock In, landing next cycle.
  const m = raidOf(s).mechs.clockin;
  m.next = s.encounter.cycle + 1; m.told = true;
  assert.ok(castNow(s).stoppable);
  command(s, 'interrupt');
  assert.equal(s.encounter.queue.ability, 'sigint', '"interrupt" works too');
  const planned = m.next;
  resolveCycle(s);
  assert.ok(s.logs.some((e) => e.type === 'interrupt' && /SIGINT stops CLOCK IN/.test(e.message)));
  assert.equal(m.next, planned + mechDef(s, 'clockin').every - RAID.interrupt.sooner, 'the next one comes a cycle sooner');
  assert.equal(readyIn(s, 'sigint'), RAID.interrupt.cooldown - 1, 'ready again in 8');
  // An uninterruptible cast: the Coldwallet's Withdrawal.
  const c = bossFight('coldwallet');
  for (const p of c.encounter.virus.parts) p.integrity = Math.max(1, Math.round(p.max * 0.45));
  holdAll(c); resolveCycle(c);
  for (const x of Object.values(raidOf(c).mechs)) { x.told = false; x.next = c.encounter.cycle + 40; }
  Object.assign(raidOf(c).mechs.withdrawal, { told: true, next: c.encounter.cycle + 1 });
  assert.match(command(c, 'sigint').at(-1).message, /Withdrawal can't be interrupted/);
});

test('the Foreman: phase 1 a buster, a pulse, a priority add, workers and a cast; under half Layoffs (encrypts everyone) and busters with Thermal Stress', () => {
  const s = bossFight('foreman');
  const ids = (t) => Object.keys(raidOf(t).mechs).sort();
  assert.deepEqual(ids(s), ['bell', 'clockin', 'payroll', 'pinkslip', 'scabs']);
  assert.equal(part(s, 'pulse').attack.target, 'aggro', 'its Surge goes at the aggro holder');
  assert.equal(part(s, 'encryptor').attack, null, 'its Encryptor\'s work is Layoffs now');
  for (const p of s.encounter.virus.parts) p.integrity = Math.max(1, Math.round(p.max * 0.45));
  holdAll(s); resolveCycle(s);
  assert.ok(bossShare(s) < 0.5);
  assert.deepEqual(ids(s), ['bell', 'layoffs', 'pinkslip', 'scabs']);
  assert.ok(s.logs.some((e) => e.type === 'phase' && /PHASE 2\. The Foreman starts the layoffs/.test(e.message)));
  quietParts(s);
  due(s, 'layoffs'); holdAll(s); resolveCycle(s);
  assert.ok(playersOf(s).every((st) => fxOf(s, st.who || 'you').dots.some((d) => d.name === 'Layoffs')), 'Layoffs lands on everyone');
  assert.ok(mechDef(s, 'pinkslip').stress);
});

test('the Heatsink: growing pulses, a marked burst, workers, Corruption and a cast; under 40% pulses every 2, Corruption on two, a buster', () => {
  const s = bossFight('heatsink');
  assert.deepEqual(Object.keys(raidOf(s).mechs).sort(), ['leak', 'overheat', 'spike', 'stall', 'workers']);
  assert.equal(part(s, 'replicator').attack, null, 'its Replicator sends workers instead of fragments');
  for (const p of s.encounter.virus.parts) p.integrity = Math.max(1, Math.round(p.max * 0.35));
  holdAll(s); resolveCycle(s);
  assert.deepEqual(Object.keys(raidOf(s).mechs).sort(), ['coremelt', 'leak', 'meltspike', 'overheat', 'stall']);
  assert.equal(mechDef(s, 'meltspike').every, 2);
  assert.equal(mechDef(s, 'leak').count, 2);
});

test('the Coldwallet: Decoy beats, Cold Storage, a buster, a pulse and a cast; under half an uninterruptible Withdrawal and encrypted sectors on the healer; enrage at 18', () => {
  const s = bossFight('coldwallet');
  assert.deepEqual(Object.keys(raidOf(s).mechs).sort(), ['coldstorage', 'gas', 'margin', 'rugpull']);
  assert.ok(s.encounter.virus.parts.some((p) => p.reflect), 'the Decoy still mirrors on its beat');
  assert.equal(BOSSES.coldwallet.enrageAt, 18);
  for (const p of s.encounter.virus.parts) p.integrity = Math.max(1, Math.round(p.max * 0.45));
  holdAll(s); resolveCycle(s);
  assert.deepEqual(Object.keys(raidOf(s).mechs).sort(), ['coldstorage', 'margin', 'sectors', 'withdrawal']);
  assert.equal(mechDef(s, 'withdrawal').interrupt, false);
  assert.equal(mechDef(s, 'sectors').target, 'healer');
});

test('the bots: the tank taunts for the buster, the healer cleanses, someone interrupts, damage goes for the priority add', () => {
  const s = bossFight('foreman');
  const nyx = mate(s, 'nyx'), kilo = mate(s, 'kilo');
  let taunted = 0, busters = 0, interrupts = 0, casts = 0;
  for (let n = 0; n < 16 && active(s); n++) {
    const pending = Object.entries(raidOf(s).mechs).filter(([, m]) => m.next === s.encounter.cycle);
    command(s, planner(s) || 'hold'); resolveCycle(s);
    for (const [id] of pending) if (mechDef(s, id)?.kind === 'buster' || id === 'pinkslip') { busters++; if (s.logs.slice(-40).some((e) => /Pink Slip hits nyx/.test(e.message))) taunted++; }
  }
  interrupts = s.logs.filter((e) => e.type === 'interrupt' && e.raid).length;
  casts = s.logs.filter((e) => e.type === 'telegraph' && e.cast).length;
  assert.ok(busters > 0 && taunted / busters >= 0.75, `the Warden takes the Pink Slips (${taunted}/${busters})`);
  assert.ok(interrupts >= casts - 1, `casts get interrupted (${interrupts} of ${casts})`);
  assert.ok(nyx && kilo);
});

// Crew sims (farmsim.mjs), one boss each, a few seeds: a full crew wins; without SIGINT the Foreman wins.
test('crew sim smoke test: a full crew beats each boss; a crew that never interrupts loses to the Foreman', async () => {
  const { farmScore } = await import('./farmsim.mjs');
  for (const boss of ['foreman', 'heatsink', 'coldwallet']) {
    const r = farmScore('demolitionist', ['warden', 'sysop', 'payload'], 18, { seeds: 2, only: boss, tries: 1 });
    assert.equal(r.by[boss].wins, 2, `${boss}: ${r.by[boss].wins}/2`);
  }
  const none = farmScore('demolitionist', ['warden', 'sysop', 'payload'], 18, { seeds: 2, only: 'foreman', tries: 1, bots: { interrupt: false } });
  assert.equal(none.by.foreman.wins, 0, 'Clock In and Layoffs land');
  assert.equal(RAID.bots.interrupt, true, 'the switch is put back');
  const early = farmScore('demolitionist', ['bastion', 'operator'], 8, { seeds: 2 });
  assert.equal(early.cleared, 2, `at level 8 a crew of three clears the farm (${early.wins}/${early.tries})`);
});

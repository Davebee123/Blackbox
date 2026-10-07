// Subclasses (dist/classes): picked at level 10, each with its own skill line, edge and talent tree.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, knownSkills, equippedSkills, subOf, subPicked, kitOf, hasTalent, edge, rank, restore } from './dist/combat.mjs';
import { ARCHETYPES, SUBS, SUBCLASS, defaultSub, skillOrder, unlockLevel, EDGE } from './dist/data.mjs';
import { play } from './dist/run.mjs';

const at = (cls, level) => { const s = fresh(); s.loadout.archetype = cls; s.hackers = { [cls]: { level, xp: 0 } }; return s; };

test('every class has two subclasses, each with its own line, edge and full tree; the old edge belongs to one', () => {
  for (const [cls, a] of Object.entries(ARCHETYPES)) {
    const subs = Object.values(a.subs);
    assert.equal(subs.length, 2, cls);
    assert.equal(a.core.length, 4);
    for (const x of subs) {
      assert.equal(SUBS[x.id].cls, cls);
      assert.ok(x.skills.length >= 2 && x.skills.length <= SUBCLASS.unlocks.length, x.id);
      assert.ok(x.edge?.name && x.edge?.rule, x.id);
      assert.equal(x.fillers.length, 3); assert.ok(x.fillers.every((r) => r.length === 2));
      assert.equal(x.talents.length, 3); assert.ok(x.talents.every((r) => r.length === 2));
      for (const id of x.skills) assert.ok(a.skills.some((k) => k.id === id), `${id} is a ${cls} skill`);
    }
    assert.ok(a.subs[EDGE[cls].sub], `${cls}'s old edge goes to a subclass of it`);
  }
});

test('before level 10 a class has its core; at 10 it plays its default subclass until it picks', () => {
  const s = at('breaker', 9);
  assert.equal(subOf(s), null);
  assert.deepEqual(knownSkills(s, 'breaker'), ARCHETYPES.breaker.core);
  assert.match(command(s, 'subclass overclocker').at(-1).message, /comes at level 10/);
  s.hackers.breaker.level = 10;
  assert.equal(subOf(s), defaultSub('breaker'));
  assert.ok(!subPicked(s));
  s.hackers.breaker.level = 9; s.hackers.breaker.xp = 0;
  command(s, 'developer level 10');
  assert.ok(s.logs.some((e) => e.type === 'level-up' && /Pick a subclass: Demolitionist \(subclass demolitionist\) or Overclocker/.test(e.message)));
});

test('subclass <id>: the first pick anywhere out of a fight, switching only at home; each keeps its own bar and tree', () => {
  const s = at('breaker', 22);
  play(s, 'connect sprawl');
  command(s, 'subclass overclocker');
  assert.equal(subOf(s), 'overclocker', 'the first pick works on a run');
  assert.ok(knownSkills(s, 'breaker').includes('segfault'));
  assert.ok(!knownSkills(s, 'breaker').includes('shatter'), 'the other line is closed');
  assert.match(command(s, 'subclass demolitionist').at(-1).message, /at home/);
  play(s, 'jack out');
  command(s, 'subclass demolitionist');
  assert.equal(subOf(s), 'demolitionist');
  command(s, 'unequip shatter');
  assert.ok(!equippedSkills(s, 'breaker').includes('shatter'));
  command(s, 'talent add armor-cracker');
  assert.equal(rank(s, 'armor-cracker'), 1);
  command(s, 'subclass overclocker');
  assert.equal(rank(s, 'armor-cracker'), 0, 'its own tree');
  assert.ok(equippedSkills(s, 'breaker').includes('segfault'));
  command(s, 'subclass demolitionist');
  assert.equal(rank(s, 'armor-cracker'), 1, 'and back as you left it');
  assert.ok(!equippedSkills(s, 'breaker').includes('shatter'), 'the bar too');
  assert.match(command(s, 'equip segfault').at(-1).message, /an? Overclocker skill/);
});

test('an old edge only works in its subclass; subclass skills unlock along the line', () => {
  const s = at('bastion', 30);
  command(s, 'subclass warden');
  assert.ok(edge(s, 'bastion'), 'Grudge is the Warden\'s');
  command(s, 'subclass sysop');
  assert.ok(!edge(s, 'bastion'));
  assert.equal(kitOf(s).name, 'Sysop');
  const line = SUBS.sysop.skills;
  line.forEach((id, i) => assert.equal(unlockLevel('bastion', id, 'sysop'), SUBCLASS.unlocks[i], id));
  assert.deepEqual(skillOrder('bastion', 'sysop'), [...ARCHETYPES.bastion.core, ...line]);
});

test('an old save: its talent ranks move into the default subclass, tier picks come back as free points', () => {
  const s = at('breaker', 20);
  s.loadout.ranks = { breaker: { 'armor-cracker': 2, overclocked: 1 } };
  s.loadout.picks = { breaker: [1, 0] };
  s.version = 30;
  const t = restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(t.loadout.ranks.demolitionist, { 'armor-cracker': 2, overclocked: 1 });
  assert.equal(t.loadout.ranks.breaker, undefined);
  assert.equal(t.loadout.picks.breaker, undefined);
  assert.equal(rank(t, 'armor-cracker'), 2);
  assert.ok(!hasTalent(t, 'hair-trigger'));
});

test('crew sim takes a subclass: a Sysop crewmate', async () => {
  const { matesOf } = await import('./dist/crew.mjs');
  const s = at('breaker', 14);
  play(s, 'crew sim sysop herder');
  assert.deepEqual(s.crewSim.map((x) => x.sub), ['sysop', 'herder']);
  const [nyx] = matesOf(s);
  assert.equal(subOf(nyx), 'sysop');
  assert.ok(knownSkills(nyx, 'bastion').includes('patch'));
});

test('a saved subclass that is not one of its class\'s (unknown, or another class\'s) plays the default, and restore drops it', () => {
  for (const bad of ['bogus', 'sysop']) {
    const s = at('breaker', 22);
    s.loadout.sub = { breaker: bad };
    assert.equal(subOf(s), 'demolitionist', bad);
    assert.ok(!subPicked(s), bad);
    assert.ok(knownSkills(s, 'breaker').includes('shatter'), 'the default line, not just the core');
    assert.equal(kitOf(s).name, 'Demolitionist');
    assert.doesNotThrow(() => command(s, 'subclass'));
    const t = restore(JSON.parse(JSON.stringify(s)));
    assert.equal(t.loadout.sub.breaker, undefined, bad);
    assert.match(command(t, 'subclass').at(-1).message, /not picked yet/);
  }
  // A real pick below level 10 stays, for when the class gets there.
  const low = at('breaker', 9);
  low.loadout.sub = { breaker: 'overclocker' };
  const t = restore(JSON.parse(JSON.stringify(low)));
  assert.equal(subOf(t), null);
  t.hackers.breaker.level = 10;
  assert.equal(subOf(t), 'overclocker');
});

test('an old save past level 10: its bar becomes the default subclass\'s, with what it knows in the slots the other line\'s skills left', () => {
  const s = at('breaker', 22);
  s.loadout.equipped = { breaker: ['overload', 'flood', 'exploit', 'crack', 'brace', 'shatter', 'segfault'] };
  s.version = 30;
  const t = restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(equippedSkills(t, 'breaker'), ['overload', 'flood', 'exploit', 'crack', 'shatter', 'fork-bomb', 'shaped-charge']);
  // A save below 10 keeps its bar as it was.
  const low = at('bastion', 8);
  low.loadout.equipped = { bastion: ['rate-limit', 'firewall'] };
  low.version = 30;
  assert.deepEqual(equippedSkills(restore(JSON.parse(JSON.stringify(low))), 'bastion'), ['rate-limit', 'firewall']);
});

test('a talent id two subclasses share works only for its own class: a Phantom\'s Kill Chain is not the Hijacker\'s', async () => {
  const { selectEncounter, resolveCycle, part } = await import('./dist/combat.mjs');
  const s = at('infiltrator', 50);
  s.loadout.sub = { infiltrator: 'phantom' };
  s.loadout.picks.phantom = [undefined, 0, undefined];
  assert.ok(hasTalent(s, 'kill-chain'));
  selectEncounter(s, 'cryptjack', 7, { level: 6 });
  command(s, 'engage');
  // A crewmate Hijacker jammed it (the mark is on the shared part).
  Object.assign(part(s, 'pulse'), { armor: 0, maxArmor: 0, integrity: 1, jammedUntil: s.encounter.cycle + 3 });
  command(s, 'spike pulse');
  resolveCycle(s);
  assert.ok(s.logs.some((e) => /Kill Chain: Backstab is ready/.test(e.message)));
  assert.ok(!s.logs.some((e) => /Jam, Spoofed ACK and Hijack are ready/.test(e.message)));
});

test('subclass skills whose numbers grow with your level say so on screen (scales)', async () => {
  const { scaledText } = await import('./dist/view.mjs');
  const { ABILITIES, power } = await import('./dist/data.mjs');
  const s = at('breaker', 26), k = power(26);
  const n = (x) => String(Math.round(x * k));
  assert.match(scaledText(s, 'logic-bomb', ABILITIES['logic-bomb'].short), new RegExp(`Bomb ${n(50)}, \\+${n(20)} to all, in 2`));
  assert.match(scaledText(s, 'chain-reaction', ABILITIES['chain-reaction'].short), new RegExp(n(20)));
  assert.match(scaledText(s, 'thermal-throttle', ABILITIES['thermal-throttle'].short), new RegExp(`${n(20)} \\+${n(20)} a stack`));
  assert.match(scaledText(s, 'turbo-boost', ABILITIES['turbo-boost'].short), new RegExp(`\\+2 Momentum, costs ${n(6)}`));
  assert.match(scaledText(s, 'shaped-charge', ABILITIES['shaped-charge'].help), new RegExp(`deals ${n(30)} damage`));
  assert.match(scaledText(s, 'cache-poison', ABILITIES['cache-poison'].help), new RegExp(`for ${n(15)} instead`));
});

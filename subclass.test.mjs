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

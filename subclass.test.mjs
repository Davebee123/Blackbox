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

test('before level 10 a class has its core; from 10 it plays its core alone until it picks: no default subclass', () => {
  const s = at('breaker', 9);
  assert.equal(subOf(s), null);
  assert.deepEqual(knownSkills(s, 'breaker'), ARCHETYPES.breaker.core);
  assert.match(command(s, 'subclass overclocker').at(-1).message, /comes at level 10/);
  for (const level of [10, 22, 40]) {
    s.hackers.breaker.level = level;
    assert.equal(subOf(s), null, `no subclass at ${level} until a pick`);
    assert.ok(!subPicked(s));
    assert.equal(kitOf(s), null, 'no line, tree or presets');
    assert.deepEqual(knownSkills(s, 'breaker'), ARCHETYPES.breaker.core, 'the core alone');
    assert.ok(equippedSkills(s, 'breaker').every((id) => ARCHETYPES.breaker.core.includes(id)), 'no default subclass key on the bar');
    assert.ok(!edge(s, 'breaker'), 'and not the default\'s edge (Overkill)');
  }
  assert.match(command(s, 'equip shatter').at(-1).message, /Demolitionist skill/);
  assert.match(command(s, 'talent add armor-cracker').at(-1).message, /with your subclass/);
  assert.match(command(s, 'loadout list').at(-1).message, /Presets come with your subclass/);
  assert.match(command(s, 'subclass').at(-1).message, /not picked yet/);
  s.hackers.breaker.level = 9; s.hackers.breaker.xp = 0;
  command(s, 'developer level 10');
  const up = s.logs.find((e) => e.type === 'level-up' && /LEVEL 10/.test(e.message));
  assert.match(up.message, /Choose a subclass: Demolitionist \(subclass demolitionist\) or Overclocker \(subclass overclocker\)\. Until you do, you play the Breaker core\./);
  assert.doesNotMatch(up.message, /Overkill/, 'no edge comes before the pick');
  assert.ok(up.gains.includes('a subclass to pick'));
  // Every class, every level from 10: the same.
  for (const cls of Object.keys(ARCHETYPES)) {
    const x = at(cls, 30);
    assert.equal(subOf(x), null, cls);
    assert.ok(!edge(x, cls), cls);
    assert.deepEqual(knownSkills(x, cls), ARCHETYPES[cls].core, cls);
    command(x, `subclass ${defaultSub(cls)}`);
    assert.equal(subOf(x), defaultSub(cls), 'a pick is what gives it');
    assert.ok(edge(x, cls), `${cls}: its edge with the pick`);
  }
});

test('equip <skill> <key>: a skill goes on that key, swapping places with one on the bar or sending one to the shelf', () => {
  const s = at('breaker', 30);
  command(s, 'subclass demolitionist');
  const bar = () => equippedSkills(s, 'breaker');
  const was = bar(), at6 = was[4];
  assert.match(command(s, `equip ${was[0]} 6`).at(-1).message, new RegExp(`on key 6, .* to key 2`));
  assert.equal(bar()[4], was[0]); assert.equal(bar()[0], at6, 'the two swap places');
  const off = knownSkills(s, 'breaker').find((id) => !bar().includes(id));
  const out = bar()[8];
  assert.match(command(s, `equip ${off} 0`).at(-1).message, /goes to the shelf/);
  assert.equal(bar()[8], off); assert.ok(!bar().includes(out));
  assert.match(command(s, `equip ${off} 0`).at(-1).message, /is on key 0/);
  const low = at('breaker', 12);
  command(low, 'subclass demolitionist');
  assert.match(command(low, 'equip crack 9').at(-1).message, /opens at level 22/);
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

test('an old save from before subclasses: its talent points all come back (no subclass picked, so no tree yet)', () => {
  const s = at('breaker', 20);
  s.loadout.ranks = { breaker: { 'armor-cracker': 2, overclocked: 1 } };
  s.loadout.picks = { breaker: [1, 0] };
  s.version = 30;
  const t = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(t.loadout.ranks.demolitionist, undefined, 'the default subclass no longer keeps them');
  assert.equal(t.loadout.ranks.breaker, undefined);
  assert.equal(t.loadout.picks.breaker, undefined);
  assert.equal(rank(t, 'armor-cracker'), 0);
  assert.ok(!hasTalent(t, 'hair-trigger'));
  command(t, 'subclass demolitionist');
  assert.equal(rank(t, 'armor-cracker'), 0, 'a fresh tree to spend in');
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

test('a saved subclass that is not one of its class\'s (unknown, or another class\'s) is no pick, and restore drops it', () => {
  for (const bad of ['bogus', 'sysop']) {
    const s = at('breaker', 22);
    s.loadout.sub = { breaker: bad };
    assert.equal(subOf(s), null, bad);
    assert.ok(!subPicked(s), bad);
    assert.deepEqual(knownSkills(s, 'breaker'), ARCHETYPES.breaker.core, 'the core alone');
    assert.equal(kitOf(s), null);
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

test('an old save from before subclasses, past level 10: its bar keeps its core keys and loses every subclass skill', () => {
  const s = at('breaker', 22);
  s.loadout.equipped = { breaker: ['overload', 'flood', 'exploit', 'crack', 'brace', 'shatter', 'segfault'] };
  s.version = 30;
  const t = restore(JSON.parse(JSON.stringify(s)));
  const bar = equippedSkills(t, 'breaker');
  assert.deepEqual(bar, ['overload', 'flood', 'exploit', 'crack'], 'the core, in its keys');
  assert.equal(subOf(t), null);
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
  assert.match(scaledText(s, 'logic-bomb', ABILITIES['logic-bomb'].short), new RegExp(`Bomb: ${n(50)}, and ${n(20)} to all`));
  assert.match(scaledText(s, 'chain-reaction', ABILITIES['chain-reaction'].help), new RegExp(`explodes for ${n(30)} damage to every other part`));
  assert.match(scaledText(s, 'thermal-throttle', ABILITIES['thermal-throttle'].short), new RegExp(`${n(20)} \\+${n(20)} per Momentum`));
  assert.match(scaledText(s, 'turbo-boost', ABILITIES['turbo-boost'].help), new RegExp(`Costs ${n(6)} Signal`));
  assert.match(scaledText(s, 'overvolt', ABILITIES.overvolt.short), new RegExp(`Strikes twice for ${n(20)}`));
  assert.match(scaledText(s, 'shaped-charge', ABILITIES['shaped-charge'].help), new RegExp(`deals ${n(30)} damage instead`));
  assert.match(scaledText(s, 'cache-poison', ABILITIES['cache-poison'].help), new RegExp(`for ${n(15)} instead`));
});

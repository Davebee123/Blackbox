// Class kits (docs/kits.md): fifteen keys a subclass, presets, key 1 under each class's own name, and the v37 and v38 saves.
// The press-share and balance checks of the kit pass are in kits-balance.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, knownSkills, equippedSkills, readyIn, restore, defaultBar, presetsOf, presetKeys, followOf, loadoutSuggestions, PRESETS, SAVE_VERSION, V36_LINES, keyMap } from './dist/combat.mjs';
import { ABILITIES, ARCHETYPES, SUBS, SUBCLASS, SPIKE, unlockLevel, skillOrder, lineOf, barSlots, isRunSkill, shippedPresets, presetBar, cantripsOf } from './dist/data.mjs';

const at = (cls, level, sub = null) => { const s = fresh(); s.tutorialCompleted = true; s.loadout.archetype = cls; s.hackers = { [cls]: { level, xp: 0 } }; if (sub) s.loadout.sub = { [cls]: sub }; return s; };
const say = (s, text) => command(s, text).at(-1)?.message || '';
const fight = (s) => { selectEncounter(s, 'cryptjack', 7, { level: Math.min(30, s.hackers[s.loadout.archetype].level) }); command(s, 'engage'); };

test('every subclass line is eleven skills at 10, 12, 14, 16, 18, 20, 22, 26, 30, 34 and 38: fifteen keys with the core', () => {
  assert.deepEqual(SUBCLASS.unlocks, [10, 12, 14, 16, 18, 20, 22, 26, 30, 34, 38]);
  for (const [sub, x] of Object.entries(SUBS)) {
    assert.equal(x.skills.length, 11, sub);
    assert.equal(new Set(x.skills).size, 11, sub);
    const known = skillOrder(x.cls, sub).filter((id) => !isRunSkill(id) && unlockLevel(x.cls, id, sub) <= 38);
    assert.equal(known.length, 15, `${sub}: ${known.join(', ')}`);
    // Every skill a save knew in the old line is still in the new one (docs/kits.md 9: saves keep every known skill).
    for (const id of V36_LINES[sub]) assert.ok(skillOrder(x.cls, sub).includes(id), `${sub} keeps ${id}`);
    // A real core rotation: four core keys the subclass knows by 18, and each is pressed by its default bar.
    assert.equal(x.rotationCore.length, 4, sub);
    for (const id of x.rotationCore) assert.ok(id === 'spike' || unlockLevel(x.cls, id, sub) <= 18, `${sub} core ${id}`);
  }
  assert.equal(unlockLevel('bastion', 'reclaim', 'sysop'), 12);
  // The Phantom's run skills open at their own levels and never take a key.
  assert.deepEqual(lineOf(SUBS.phantom).filter((y) => isRunSkill(y.id)).map((y) => [y.id, y.level]), [['spoof', 20], ['tap', 30]]);
});

test('every new line skill has a short and a help line, and each line has cooldowns to press', () => {
  for (const [sub, x] of Object.entries(SUBS)) {
    for (const id of x.skills) {
      const a = ABILITIES[id];
      assert.ok(a?.short && a?.help?.startsWith(id), `${sub} ${id}`);
      assert.ok(!/\b(TODO|tbd)\b/i.test(a.help), id);
    }
    assert.ok(x.skills.filter((id) => ABILITIES[id].cooldown >= 6 || ABILITIES[id].once).length >= 2, `${sub}: two long cooldowns or once-a-fight keys`);
  }
});

test('two shipped presets a subclass, rotation first; the default bar is the rotation preset at your level', () => {
  for (const [sub, x] of Object.entries(SUBS)) {
    const names = Object.keys(shippedPresets(sub));
    assert.equal(names.length, 2, sub);
    assert.equal(names[0], 'rotation');
    for (const list of Object.values(x.presets)) for (const id of list) assert.ok(skillOrder(x.cls, sub).includes(id), `${sub} preset key ${id}`);
    for (const L of [10, 18, 30, 40]) {
      const bar = defaultBar(x.cls, sub, L);
      assert.equal(bar.length, Math.min(barSlots(L), skillOrder(x.cls, sub).filter((id) => !isRunSkill(id) && unlockLevel(x.cls, id, sub) <= L).length), `${sub} ${L}`);
      assert.deepEqual(bar, presetBar(x.cls, sub, L, x.presets.rotation));
    }
    // The rotation preset opens with the core rotation.
    for (const id of x.rotationCore) assert.ok(x.presets.rotation.slice(0, 6).includes(id), `${sub} rotation opens with ${id}`);
  }
});

test('loadout save, use, list, show and delete; a shipped preset keeps filling the bar as you level', () => {
  const s = at('breaker', 30, 'demolitionist');
  assert.equal(followOf(s), 'rotation');
  assert.match(say(s, 'loadout list'), /Demolitionist presets\. rotation: .*\(shipped\)\. area: .*\(shipped\)\. Your bar follows rotation\./);
  assert.match(say(s, 'loadout show area'), /^area \(shipped\): 2 Crack \(core\) · 3 Shatter \(core\) · 4 Fork Bomb \(specialist\)/);
  // use: the bar is the preset's, and what it brought in starts the next fight cooling.
  const was = equippedSkills(s, 'breaker');
  const msg = say(s, 'loadout use area');
  const bar = equippedSkills(s, 'breaker');
  assert.deepEqual(bar, presetKeys(s, 'breaker', 'area'));
  const brought = bar.filter((id) => !was.includes(id));
  assert.ok(brought.length >= 1, msg);
  assert.match(msg, /^Bar set from area\. In: /);
  assert.match(msg, /start(s)? your next fight cooling\./);
  assert.equal(followOf(s), 'area');
  // save: the bar as it is, under a name; edits by hand stop following a preset.
  say(s, 'unequip ' + bar.at(-1));
  assert.equal(followOf(s), null);
  assert.match(say(s, 'loadout save mine'), /^Saved mine: 2 crack/);
  assert.deepEqual(presetsOf(s).mine, bar.slice(0, -1));
  assert.equal(followOf(s), 'mine');
  assert.match(say(s, 'loadout use rotaton'), /No preset called rotaton\. Did you mean rotation\?/);
  assert.match(say(s, 'loadout save Bad Name!'), /one word of up to 16/);
  for (let i = Object.keys(presetsOf(s)).length; i < PRESETS.most; i++) say(s, 'loadout save extra' + i);
  assert.match(say(s, 'loadout save onemore'), /presets already\. Delete one first\./);
  assert.match(say(s, 'loadout delete mine'), /Preset mine deleted\./);
  assert.equal(presetsOf(s).mine, undefined);
  const last = Object.keys(presetsOf(s)).at(-1);
  assert.equal(followOf(s), last);
  say(s, 'loadout delete ' + last);
  assert.equal(followOf(s), null, 'deleting the preset the bar follows leaves the bar as it is');
  // A shipped preset fills as skills unlock: the level-up puts the new key on a bar that follows it.
  const t = at('bastion', 17, 'sysop');
  say(t, 'loadout use rotation');
  t.hackers.bastion.xp = 0;
  command(t, 'developer level 18');
  assert.deepEqual([...equippedSkills(t, 'bastion')].sort(), [...defaultBar('bastion', 'sysop', 18)].sort());
});

test('presets swap anywhere out of a fight, home or run; the keys a swap brings in start the next fight cooling', () => {
  const s = at('breaker', 30, 'demolitionist');
  say(s, 'loadout use area');
  const brought = presetKeys(s, 'breaker', 'area').filter((id) => !defaultBar('breaker', 'demolitionist', 30).includes(id) && (ABILITIES[id].cooldown || ABILITIES[id].once));
  assert.ok(brought.length, 'the area build brings in a key with a cooldown');
  fight(s);
  for (const id of brought) assert.ok(readyIn(s, id) > 0, `${id} starts cooling`);
  assert.ok(s.logs.some((e) => /Swapped in before this fight, still cooling:/.test(e.message)));
  // In a fight: no swapping, no saving, no deleting.
  for (const c of ['loadout use rotation', 'loadout save x', 'loadout delete area']) assert.match(say(s, c), /Presets change between fights\. Finish this one first\./);
  // list and show still work in a fight.
  assert.match(say(s, 'loadout show rotation'), /^rotation \(shipped\)/);
  // The next fight after that one: nothing cools from the swap any more.
  resolveCycle(s);
  s.encounter = null;
  fight(s);
  assert.equal(s.logs.filter((e) => /Swapped in before this fight/.test(e.message)).length, 1);
  // On a run, out of a fight: a swap works, equip and unequip too.
  const r = at('operator', 30, 'herder');
  r.run = { loc: 'sim', cwd: '/', integrity: 100, max: 100, pack: [], visited: ['/'] };
  assert.match(say(r, 'loadout use swarm'), /^Bar set from swarm\./);
  assert.match(say(r, 'unequip ' + equippedSkills(r, 'operator').at(-1)), /unequipped\./);
});

test('tab completion offers the loadout verbs and your preset names', () => {
  const s = at('infiltrator', 30, 'phantom');
  assert.deepEqual(loadoutSuggestions(s, 'loadout u'), ['loadout use ']);
  assert.deepEqual(loadoutSuggestions(s, 'loadout use '), ['loadout use rotation', 'loadout use evasion']);
  assert.deepEqual(loadoutSuggestions(s, 'loadout show e'), ['loadout show evasion']);
  say(s, 'loadout save mine');
  assert.ok(loadoutSuggestions(s, 'loadout delete ').includes('loadout delete mine'));
});

test('key 1 has each class\'s own name: Bash, Ban, Poke and Ping; spike still works for everyone', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(SPIKE).map(([c, x]) => [c, x.word])), { breaker: 'bash', bastion: 'ban', infiltrator: 'poke', operator: 'ping' });
  for (const [cls, x] of Object.entries(SPIKE)) {
    assert.equal(cantripsOf(cls).find((c) => c.id === 'spike').name, x.name);
    for (const word of [x.word, 'spike']) {
      const s = at(cls, 12);
      fight(s);
      const p = s.encounter.virus.parts.find((q) => q.integrity > 0);
      const before = s.logs.length;
      command(s, `${word} ${p.id}`);
      resolveCycle(s);
      const said = s.logs.slice(before).map((e) => e.message).join(' | ');
      assert.ok(s.encounter.queue === null || s.logs.slice(before).some((e) => e.type === 'resolved'), said);
      assert.match(said, new RegExp(`resolved ${x.word} ${p.id}|${x.word} ${p.id}`, 'i'), `${cls} ${word}: ${said}`);
    }
  }
  // The id stays spike: nothing in a save or the key map names Bash.
  const s = at('breaker', 12);
  assert.equal(keyMap(s)['1'], 'spike');
});

test('a v36 save: known skills stay known, untouched bars become the new default, edited bars keep their keys, presets are seeded', () => {
  // A Sysop at 13 knew Patch (12 in the old line); it now opens at 14 and is kept.
  const s = at('bastion', 13, 'sysop');
  s.loadout.equipped = { sysop: ['rate-limit', 'firewall', 'purge', 'retaliate', 'patch'] };
  // A Hijacker at 15 that moved its keys around and knew Jam (12) and Hijack (14).
  s.hackers.operator = { level: 15, xp: 0 };
  s.loadout.sub.operator = 'hijacker';
  s.loadout.equipped.hijacker = ['hijack', 'deploy', 'jam', 'botnet', 'hook', 'spawn'];
  s.version = 36;
  const t = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(t.version, SAVE_VERSION);
  assert.equal(SAVE_VERSION, 38);
  assert.ok(knownSkills(t, 'bastion').includes('patch'), 'Patch kept');
  assert.deepEqual(t.loadout.kept.sysop, ['patch']);
  assert.deepEqual(t.loadout.equipped.sysop, presetBar('bastion', 'sysop', 13, SUBS.sysop.presets.rotation, knownSkills(t, 'bastion')), 'an untouched bar becomes the new rotation, with what it kept');
  assert.ok(t.loadout.equipped.sysop.includes('checksum') && t.loadout.equipped.sysop.includes('patch'));
  assert.equal(t.loadout.follow.sysop, 'rotation');
  t.loadout.archetype = 'operator';
  for (const id of ['jam', 'hijack']) assert.ok(knownSkills(t, 'operator').includes(id), id);
  const bar = t.loadout.equipped.hijacker;
  assert.deepEqual(bar.slice(0, 6), ['hijack', 'deploy', 'jam', 'botnet', 'hook', 'spawn'], 'an edited bar keeps its keys in place');
  assert.equal(bar.length, Math.min(barSlots(15), knownSkills(t, 'operator').filter((id) => !isRunSkill(id)).length), 'and fills its free slots');
  assert.equal(t.loadout.follow.hijacker, null);
  for (const sub of ['sysop', 'hijacker']) assert.deepEqual(Object.keys(t.loadout.presets[sub]), ['rotation', Object.keys(SUBS[sub].presets)[1]]);
  // A save from before subclass level gets nothing it doesn't need.
  const low = at('breaker', 8);
  low.version = 36;
  const u = restore(JSON.parse(JSON.stringify(low)));
  assert.equal(u.loadout.kept, undefined);
  // Every class keeps a sane bar after the move: nothing it doesn't know.
  for (const cls of Object.keys(ARCHETYPES)) for (const id of equippedSkills(t, cls)) assert.ok(knownSkills(t, cls).includes(id), `${cls} ${id}`);
});

test('a v37 save: the Demolitionist\'s swarm preset becomes area and the Phantom\'s ghostroot becomes evasion, in place, with the bars that follow them', () => {
  const s = at('breaker', 30, 'demolitionist');
  s.hackers.infiltrator = { level: 30, xp: 0 };
  s.loadout.sub.infiltrator = 'phantom';
  s.loadout.presets = {
    demolitionist: { rotation: { shipped: true }, swarm: { shipped: true }, mine: ['crack', 'shatter'] },
    phantom: { rotation: { shipped: true }, ghostroot: { shipped: true } },
    payload: { rotation: { shipped: true }, swarm: { shipped: true } },
  };
  s.loadout.follow = { demolitionist: 'swarm', phantom: 'rotation', payload: 'swarm' };
  s.version = 37;
  const t = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(t.version, 38);
  assert.deepEqual(Object.keys(t.loadout.presets.demolitionist), ['rotation', 'area', 'mine']);
  assert.deepEqual(t.loadout.presets.demolitionist.mine, ['crack', 'shatter'], 'a saved preset is untouched');
  assert.deepEqual(Object.keys(t.loadout.presets.phantom), ['rotation', 'evasion']);
  assert.equal(t.loadout.follow.demolitionist, 'area', 'a bar that followed swarm follows area');
  assert.equal(t.loadout.follow.phantom, 'rotation');
  assert.deepEqual(Object.keys(t.loadout.presets.payload), ['rotation', 'swarm'], 'the other subclasses keep their names');
  assert.equal(t.loadout.follow.payload, 'swarm');
  assert.deepEqual(presetKeys(t, 'breaker', 'area'), presetBar('breaker', 'demolitionist', 30, SUBS.demolitionist.presets.area, knownSkills(t, 'breaker')));
  // A preset the player saved under the old name is theirs: it keeps the name, and nothing is renamed over it.
  const u = at('infiltrator', 30, 'phantom');
  u.loadout.presets = { phantom: { rotation: { shipped: true }, ghostroot: ['backstab', 'inject'] } };
  u.loadout.follow = { phantom: 'ghostroot' };
  u.version = 37;
  const v = restore(JSON.parse(JSON.stringify(u)));
  assert.deepEqual(v.loadout.presets.phantom.ghostroot, ['backstab', 'inject']);
  assert.equal(v.loadout.follow.phantom, 'ghostroot');
});

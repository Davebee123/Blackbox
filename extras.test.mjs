// The level-5 kit talent (the specialty that was), hot runs, the Listening Post, and couriers that carry a unique you're missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, rank, kitTalent, active, listenBoost, bossChance, UNIQUES } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { LOADOUT, HOT_RUN, ARCHETYPES } from './dist/data.mjs';
import { deal, eventText } from './dist/events.mjs';
import { BUILDINGS } from './dist/outpost.mjs';

test('the kit talent: from level 5 every class has the first of its first-row talents at two ranks; there is no specialty to pick', () => {
  const s = fresh();
  s.hackers = { bastion: { level: 4, xp: 0 } }; s.loadout.archetype = 'bastion';
  assert.equal(kitTalent('bastion').id, 'patch-notes');
  assert.equal(rank(s, 'patch-notes'), 0, 'not before level 5');
  s.hackers.bastion.level = 5;
  assert.equal(rank(s, 'patch-notes'), LOADOUT.specRanks);
  assert.equal(rank(s, 'stateful-firewall'), 0);
  assert.match(command(s, 'specialty stateful-firewall').at(-1).message, /no specialty to pick any more\. Patch Notes is part of the Bastion kit from level 5: Increases the healing of Patch by 6\./);
  assert.equal(rank(s, 'stateful-firewall'), 0, 'nothing to change');
  s.loadout.ranks = { warden: { 'patch-notes': 3 } }; s.hackers.bastion.level = 12;
  assert.equal(rank(s, 'patch-notes'), 5, 'the kit\'s two ranks come on top of any you buy');
  for (const c of Object.keys(ARCHETYPES)) assert.ok(kitTalent(c)?.id, c);
});

test('a loud run: connect <server> loud makes every fight tougher and every kill pay more', () => {
  const plain = fresh(), hot = fresh();
  for (const s of [plain, hot]) s.hackers = { breaker: { level: 5, xp: 0 } };
  play(plain, 'connect sprawl'); play(hot, 'connect sprawl loud');
  assert.ok(hot.run.hot && !plain.run.hot);
  assert.ok(hot.logs.some((e) => /LOUD RUN/.test(e.message)));
  for (const s of [plain, hot]) { play(s, 'cd var'); play(s, 'attack'); }
  const hp = (s) => s.encounter.virus.parts.reduce((n, p) => n + p.max, 0);
  assert.ok(Math.abs(hp(hot) / hp(plain) - HOT_RUN.hp) < 0.05, `${hp(hot)} vs ${hp(plain)}`);
  assert.ok(hot.encounter.virus.hot);
});

test('the Listening Post: listen <unique> makes it 25% likelier per post wherever it drops, bosses included', () => {
  assert.ok(BUILDINGS.post);
  const s = fresh();
  s.hackers = { breaker: { level: 8, xp: 0 } };
  command(s, 'developer location worm');
  assert.match(command(s, 'listen crown-packet').at(-1).message, /needs a Listening Post/);
  Object.assign(s.locations[0], { takenOver: true, buildings: ['post', 'post'] });
  const base = bossChance(s, 'relayking');
  command(s, 'listen Crown Packet');
  assert.equal(s.listen, 'crown-packet');
  assert.equal(listenBoost(s), 1.5);
  assert.ok(Math.abs(bossChance(s, 'relayking') - base * 1.5) < 1e-9);
  assert.match(command(s, "listen wick's old toolkit").at(-1).message, /a reward, not a drop/);
});

test('about one courier in six carries a unique you are missing, by name; take it and it is yours', async () => {
  let named = 0, n = 0, ev = null, st = null;
  for (let i = 0; i < 120; i++) {
    const s = fresh(); s.seed = i + 1; s.hackers = { breaker: { level: 6, xp: 0 } };
    command(s, 'developer location worm');
    const e = deal(s, 'courier');
    if (!e) continue;
    n++;
    if (e.unique) { named++; ev ||= e; st ||= s; assert.ok(!s.collection?.[e.unique]); }
  }
  assert.ok(named / n > 0.08 && named / n < 0.28, `${named}/${n}`);
  assert.match(eventText(st, ev), new RegExp(`carrying ${UNIQUES[ev.unique].name}, a unique you haven't found`));
  command(st, `event fight ${ev.id}`);
  for (const p of st.encounter.virus.parts) Object.assign(p, { integrity: 0, armor: 0 });
  st.encounter.virus.parts[0].integrity = 1;
  const { resolveCycle } = await import('./dist/combat.mjs');
  command(st, 'spike ' + st.encounter.virus.parts[0].id); resolveCycle(st);
  assert.ok(st.stash.some((it) => it.unique === ev.unique));
});

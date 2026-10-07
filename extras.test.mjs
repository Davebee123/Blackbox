// The level-5 specialty, hot runs, the Listening Post, and couriers that carry a unique you're missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, rank, specOf, active, listenBoost, bossChance, UNIQUES } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { LOADOUT, HOT_RUN, ARCHETYPES } from './dist/data.mjs';
import { deal, eventText } from './dist/events.mjs';
import { BUILDINGS } from './dist/outpost.mjs';

test('the specialty: at level 5 pick one of your class\'s two first-row talents, worth two ranks; free to change at home', () => {
  const s = fresh();
  s.hackers = { bastion: { level: 4, xp: 0 } }; s.loadout.archetype = 'bastion';
  command(s, 'specialty patch-notes');
  assert.equal(specOf(s), null, 'not before level 5');
  s.hackers.bastion.level = 5;
  assert.match(command(s, 'specialty').at(-1).message, /Patch Notes \(Patch heals \+6\) or Stateful Firewall \(Firewall absorbs \+10\)/);
  command(s, 'specialty stateful-firewall');
  assert.equal(rank(s, 'stateful-firewall'), LOADOUT.specRanks);
  assert.equal(rank(s, 'patch-notes'), 0);
  command(s, 'specialty patch-notes');
  assert.equal(rank(s, 'patch-notes'), 2, 'changed');
  for (const c of Object.keys(ARCHETYPES)) assert.equal(ARCHETYPES[c].spec.length, 2, c);
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

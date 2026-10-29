// The level-5 kit talent (the specialty that was), hot runs, the Listening Post, and couriers that carry a unique you're missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, rank, kitTalent, active, listenBoost, bossChance, UNIQUES } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { LOADOUT, ARCHETYPES } from './dist/data.mjs';
import { deal, eventText, DIRECTOR } from './dist/events.mjs';
import { PROGRAMS } from './dist/sockets.mjs';

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
  s.loadout.ranks = { warden: { 'patch-notes': 3 } }; s.loadout.sub = { bastion: 'warden' }; s.hackers.bastion.level = 12;
  assert.equal(rank(s, 'patch-notes'), 5, 'the kit\'s two ranks come on top of any you buy');
  for (const c of Object.keys(ARCHETYPES)) assert.ok(kitTalent(c)?.id, c);
});

test('the Listening Post (a program): listen <unique> makes it twice as likely on the post\'s server, bosses included', () => {
  assert.ok(PROGRAMS.post);
  const s = fresh();
  s.hackers = { breaker: { level: 8, xp: 0 } };
  command(s, 'developer location worm');
  assert.match(command(s, 'listen crown-packet').at(-1).message, /needs a Listening Post/);
  const loc = s.locations[0];
  loc.lockUntil = 0;
  play(s, 'connect ' + loc.id);
  const sock = Object.values(loc.floorplan.graph.rooms).find((x) => x.kind === 'socket');
  loc.floorplan.programs = { [sock.id]: 'post' };
  const base = bossChance(s, 'relayking');
  command(s, 'listen Crown Packet');
  assert.equal(s.listen, 'crown-packet');
  assert.equal(listenBoost(s), 2, 'on its server');
  assert.ok(Math.abs(bossChance(s, 'relayking') - Math.min(1, base * 2)) < 1e-9);
  play(s, 'jack out');
  assert.equal(listenBoost(s), 1, 'off it');
  assert.match(command(s, "listen wick's old toolkit").at(-1).message, /a reward, not a drop/);
});

test('about one courier in twenty carries a unique you are missing, by name, from level 10; take it and it is yours', async () => {
  let named = 0, n = 0, ev = null, st = null, low = 0;
  for (let i = 0; i < 120; i++) {
    const s = fresh(); s.seed = i + 1; s.hackers = { breaker: { level: 6, xp: 0 } };
    command(s, 'developer location worm');
    if (deal(s, 'courier')?.unique) low++;
  }
  assert.equal(low, 0, 'below DIRECTOR.namedFrom a courier never carries one');
  for (let i = 0; i < 240; i++) {
    const s = fresh(); s.seed = i + 1; s.hackers = { breaker: { level: 12, xp: 0 } };
    command(s, 'developer location worm');
    const e = deal(s, 'courier');
    if (!e) continue;
    n++;
    if (e.unique) { named++; ev ||= e; st ||= s; assert.ok(!s.collection?.[e.unique]); }
  }
  assert.equal(DIRECTOR.named, 20);
  assert.equal(DIRECTOR.namedFrom, 10);
  assert.ok(named / n > 0.015 && named / n < 0.11, `${named}/${n}`);
  assert.match(eventText(st, ev), new RegExp(`carrying ${UNIQUES[ev.unique].name}, a unique you haven't found`));
  command(st, `event fight ${ev.id}`);
  for (const p of st.encounter.virus.parts) Object.assign(p, { integrity: 0, armor: 0 });
  st.encounter.virus.parts[0].integrity = 1;
  const { resolveCycle } = await import('./dist/combat.mjs');
  command(st, 'spike ' + st.encounter.virus.parts[0].id); resolveCycle(st);
  assert.ok(st.stash.some((it) => it.unique === ev.unique));
});

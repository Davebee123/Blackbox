import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, hooks, active } from './dist/combat.mjs';
import { play, crewWander, layoutOf } from './dist/run.mjs';
import { online, PRESENCE } from './dist/presence.mjs';
import { matesOf } from './dist/crew.mjs';
import { isTerritory } from './dist/guild.mjs';

const world = () => { const s = fresh(); s.hackers = { breaker: { level: 6, xp: 0 } }; play(s, 'online sim'); return s; };

test('a guild: create, invite, kick; guildmates can be invited into the crew', () => {
  const s = world();
  play(s, 'guild invite nyx');
  assert.ok(!s.guild, 'no guild yet');
  play(s, 'guild create LOWLIGHT');
  assert.equal(s.guild.name, 'LOWLIGHT');
  play(s, 'guild invite nyx'); play(s, 'guild invite rook'); play(s, 'guild invite nobody');
  assert.deepEqual(s.guild.members, ['nyx', 'rook']);
  play(s, 'guild kick rook');
  assert.deepEqual(s.guild.members, ['nyx']);
  let t = 1_800_000_000_000;
  while (!online(s, t).some((x) => x.handle === 'nyx')) t += PRESENCE.moveMs;
  hooks.now = () => t;
  try {
    play(s, 'crew invite nyx');
    assert.equal(s.crewSim.at(-1).name, 'nyx', 'a guildmate (not a friend) can join the crew');
  } finally { hooks.now = null; }
});

test('territory: only a server you took over (or a rogue one); guildmates turn up in its folders and join fights there', () => {
  const s = world();
  play(s, 'guild create LOWLIGHT');
  for (const h of PRESENCE.pool.slice(0, 10)) play(s, 'guild invite ' + h);
  command(s, 'developer location ransomware');
  const loc = s.locations[0];
  play(s, 'guild claim ' + loc.id);
  assert.ok(!isTerritory(s, loc), 'not yours yet');
  loc.takenOver = true;
  play(s, 'guild claim ' + loc.id);
  assert.ok(isTerritory(s, loc));
  let t = 1_800_000_000_000, there = [];
  for (let i = 0; i < 400; i++, t += PRESENCE.moveMs) { there = online(s, t).filter((x) => x.place.kind === 'guild'); if (there.length) break; }
  assert.ok(there.length, 'guildmates come by');
  assert.ok(Object.keys(layoutOf(loc)).includes(there[0].place.folder));
  hooks.now = () => t;
  try {
    const g = there[0], room = g.place.folder;
    assert.deepEqual(hooks.crewGuests ? [] : [], []);
    play(s, 'connect ' + loc.id);
    const guests = hooks.crewGuests(s, room);
    assert.ok(guests.some((x) => x.name === g.handle), 'a guildmate in that folder would join a fight there');
  } finally { hooks.now = null; }
});

test('the crew strip: linked crew follow you, split crew wander, link follows them, regroup brings them back; only the crew in the folder fights', () => {
  const s = world();
  play(s, 'crew sim bastion infiltrator');
  play(s, 'connect sprawl');
  assert.deepEqual(Object.values(s.run.crew).map((c) => c.cwd), ['/', '/']);
  play(s, 'cd net');
  assert.deepEqual(Object.values(s.run.crew).map((c) => c.cwd), ['/net', '/net'], 'linked: they follow');
  play(s, 'split kilo');
  assert.equal(s.run.crew.kilo.link, null);
  play(s, 'cd ..');
  assert.equal(s.run.crew.kilo.cwd, '/net', 'split: kilo stays');
  assert.equal(s.run.crew.nyx.cwd, '/');
  for (let i = 0; i < 20; i++) crewWander(s);
  play(s, 'link kilo');
  assert.equal(s.run.linkedTo, 'kilo');
  assert.equal(s.run.cwd, s.run.crew.kilo.cwd, 'linking takes you to them');
  play(s, 'regroup');
  assert.ok(Object.values(s.run.crew).every((c) => c.cwd === s.run.cwd && c.link === 'you'));
  // Kilo goes off; a fight here has only nyx.
  play(s, 'split kilo'); s.run.crew.kilo.cwd = '/srv';
  play(s, 'cd /'); play(s, 'cd tmp'); play(s, 'attack');
  assert.ok(active(s));
  const fighting = matesOf(s).filter((m) => m.encounter).map((m) => m.who);
  assert.deepEqual(fighting, ['nyx'], 'kilo is elsewhere');
});

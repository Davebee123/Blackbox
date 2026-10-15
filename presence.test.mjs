import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hooks } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { online, inFolder, PRESENCE, isFriend } from './dist/presence.mjs';
import { peopleMarkup } from './dist/view.mjs';

test('online sim: a share of the pool is on, the same answer at the same time, moving on over time', () => {
  const s = fresh();
  assert.deepEqual(online(s), [], 'off until you ask');
  play(s, 'online sim');
  const t = 1_800_000_000_000;
  const a = online(s, t), b = online(s, t);
  assert.deepEqual(a, b, 'deterministic');
  assert.ok(a.length >= 3 && a.length <= 19, `${a.length} online`);
  const later = online(s, t + PRESENCE.moveMs * 3);
  assert.notDeepEqual(a.map((x) => x.place), later.map((x) => x.place), 'people move');
});

test('friends: add, list first in the panel, remove; only real handles', () => {
  const s = fresh();
  play(s, 'online sim');
  const t = 1_800_000_000_000;
  hooks.now = () => t;
  try {
    const someone = online(s)[0].handle;
    play(s, 'friend add nobody-here');
    assert.ok(!isFriend(s, 'nobody-here'));
    play(s, 'friend add ' + someone);
    assert.ok(isFriend(s, someone));
    assert.equal(online(s)[0].handle, someone, 'friends first');
    assert.match(peopleMarkup(s, 'friends', t), new RegExp(`data-run="crew invite ${someone}"`));
    play(s, 'crew invite ' + someone);
    assert.equal(s.crewSim.at(-1).name, someone, 'a friend online joins the crew in their class');
    play(s, 'friend remove ' + someone);
    assert.ok(!isFriend(s, someone));
  } finally { hooks.now = null; }
});

test('SPRAWL-00 is shared: ls shows who is in each room, and arriving says who is here', () => {
  const s = fresh();
  play(s, 'online sim');
  // Find a moment when somebody is in a SPRAWL-00 folder (its rooms since R1: netrooms.mjs).
  let t = 1_800_000_000_000, who = [];
  for (let i = 0; i < 200; i++, t += PRESENCE.moveMs) { who = online(s, t).filter((x) => x.place.kind === 'sprawl'); if (who.length) break; }
  hooks.now = () => t;
  try {
    const folder = who[0].place.folder;
    play(s, 'connect sprawl');
    for (const sp of Object.values(s.zone.spawns)) Object.assign(sp, { alive: false, respawnAt: t + 3600000 }); // a clear way
    const top = '/' + folder.split('/')[1], named = (f) => FP.roomList(s).find((r) => r.path0 === f).path; // rooms are named for what they are; cd still takes the folder
    const ls = play(s, 'ls').find((e) => e.type === 'rooms-out').message;
    // Rooms are unknown until you've been in them (floorplan.mjs fog): its line is a ?, the people in it still show.
    if (top === folder) assert.match(ls, new RegExp(`\\n\\d+  [A-Z]+\\d+  \\?  \\[\\?\\][^\\n]*${who[0].handle}`), 'their room shows them, unknown as it is');
    const said = play(s, 'cd ' + folder).map((e) => e.message).join(' ');
    assert.equal(s.run.cwd, named(folder));
    const here = inFolder(s, folder).map((x) => x.handle);
    assert.ok(here.includes(who[0].handle));
    for (const h of here) assert.match(said, new RegExp(h), 'arriving says who is here');
  } finally { hooks.now = null; }
});

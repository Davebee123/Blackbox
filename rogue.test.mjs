import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, finish, addLocation, hooks } from './dist/combat.mjs';
import { play, layoutOf, takeable } from './dist/run.mjs';
import { ROGUE, rogueRooms, rogueSpawns, relockLeft } from './dist/rogue.mjs';
import { pickOrigin } from './dist/hidden.mjs';
import { sweepKind } from './dist/forensics.mjs';
import { tickOutposts, INFEST } from './dist/outpost.mjs';
import { MEMORY } from './dist/memory.mjs';
MEMORY.base = 99; // these tests trace dozens of servers to find each kind

const world = () => { const s = fresh(); s.tutorialCompleted = true; s.hackers = { breaker: { level: 12, xp: 0 } }; return s; };
const rogueOf = (s, kind = null) => {
  for (let i = 0; i < 40; i++) {
    (s.net ||= {}).rogueDry = ROGUE.pity; // the pity rule makes the next one rogue
    const loc = addLocation(s, 'worm', 2);
    if (loc.rogue && (!kind || loc.rogue.kind === kind)) return loc;
  }
  throw new Error('no rogue of kind ' + kind);
};
const winFight = (s) => { command(s, 'engage'); finish(s, 'victory'); };

test('about 1 in 6 servers is rogue, never the first two, and never six tame in a row', () => {
  const s = world();
  let dry = 0, maxDry = 0, rogues = 0;
  for (let i = 0; i < 120; i++) {
    const loc = addLocation(s, ['worm', 'ransomware', 'ghostroot'][i % 3], 1);
    if (i < ROGUE.firstTame) assert.ok(!loc.rogue, 'the first two are tame');
    if (loc.rogue) { rogues++; dry = 0; } else if (i >= ROGUE.firstTame) maxDry = Math.max(maxDry, ++dry);
  }
  assert.ok(maxDry <= ROGUE.pity, `longest tame run ${maxDry}`);
  assert.ok(rogues >= 15 && rogues <= 40, `rogues: ${rogues}/120`);
});

test('a rogue server is wild: folders of viruses, no vault, nothing to take, no invaders, no incident log', () => {
  const s = world();
  addLocation(s, 'worm', 1); addLocation(s, 'worm', 1);
  const loc = rogueOf(s);
  const rooms = rogueRooms(loc);
  assert.ok(rooms.length >= 4 && rooms.length <= 8);
  assert.ok(!Object.values(layoutOf(loc)).some((d) => d.locked || d.guard));
  assert.deepEqual(takeable(loc), []);
  assert.equal(sweepKind(loc), null);
  for (let i = 0; i < 200; i++) assert.notEqual(pickOrigin(s).loc?.id, loc.id);
  const spawns = rogueSpawns(s, loc);
  assert.equal(Object.values(spawns).filter((x) => x.alive).length, rooms.length);
  for (const sp of Object.values(spawns)) assert.ok(sp.grade === 2, 'layer 2: v2');
});

test('kinds: a Nest is one family, a Pit runs 2 levels hot', () => {
  const s = world();
  addLocation(s, 'worm', 1); addLocation(s, 'worm', 1);
  const nest = rogueOf(s, 'nest');
  for (const sp of Object.values(rogueSpawns(s, nest))) assert.equal(sp.family, nest.family);
  const pit = rogueOf(s, 'pit');
  for (const sp of Object.values(rogueSpawns(s, pit))) assert.equal(sp.level, pit.level + ROGUE.pitLevels);
});

test('a kill empties the folder for 3–5 minutes; a Gauntlet cleared in one run pays once', () => {
  let t = 1_000_000;
  hooks.now = () => t;
  try {
    const s = world();
    addLocation(s, 'worm', 1); addLocation(s, 'worm', 1);
    const loc = rogueOf(s, 'gauntlet');
    play(s, `connect ${loc.id}`);
    assert.ok(s.run);
    const credits0 = s.server.credits;
    const rooms = rogueRooms(loc);
    for (const room of rooms) {
      play(s, `cd ${room}`);
      play(s, 'attack');
      assert.equal(s.encounter.wild, loc.id);
      winFight(s);
      const sp = loc.spawns[room];
      assert.equal(sp.alive, false);
      assert.ok(sp.respawnAt - t >= ROGUE.respawnMs[0] && sp.respawnAt - t <= ROGUE.respawnMs[1]);
      play(s, 'cd ..');
    }
    assert.ok(s.run.gauntletPaid);
    assert.ok(s.server.credits > credits0);
    t += ROGUE.respawnMs[1] + 1;
    assert.ok(Object.values(rogueSpawns(s, loc, t)).every((x) => x.alive), 'they come back');
  } finally { delete hooks.now; }
});

test('infestations: they come to your outposts, pay a bonus when cleared, and leave if ignored', () => {
  const s = world();
  const loc = addLocation(s, 'worm', 1);
  command(s, `attach ${loc.id}`);
  loc.takenOver = true;
  loc.outpost = { h: { kind: 'siphon', level: 5, traits: [] }, at: 0, stock: 0, siege: null, fallen: false };
  (s.net ||= {}).infestNext = 1; // due now (a long jump would also roll a siege)
  tickOutposts(s, 1, 2);
  const inf = loc.outpost.infest;
  assert.ok(inf && inf.count >= 2, 'an infestation arrives');
  const n = inf.count;
  for (let i = 0; i < n; i++) { command(s, `outpost clear ${loc.id}`); assert.equal(s.encounter.infest, loc.id); winFight(s); }
  assert.equal(loc.outpost.infest, null);
  assert.ok(loc.outpost.stock > 0, 'the stockpile got its bonus');
  // the next one, ignored, moves on
  s.net.infestNext = 1;
  tickOutposts(s, 2, 2);
  assert.ok(loc.outpost.infest);
  loc.outpost.infest.left = 1;
  tickOutposts(s, 3, 2);
  assert.equal(loc.outpost.infest, null);
});

test('jack out of a wild server and it will not take you back for a minute (no jack out, top up, return)', () => {
  let t = 5_000_000;
  hooks.now = () => t;
  try {
    const s = world();
    addLocation(s, 'worm', 1); addLocation(s, 'worm', 1);
    const loc = rogueOf(s);
    play(s, 'connect ' + loc.id);
    assert.ok(s.run);
    play(s, 'jack out');
    play(s, 'connect ' + loc.id);
    assert.ok(!s.run, 'locked right after jacking out');
    assert.equal(relockLeft(loc), ROGUE.relockMs / 1000);
    play(s, 'connect sprawl');
    assert.ok(s.run, 'other servers are not affected');
    play(s, 'jack out');
    play(s, 'connect sprawl');
    assert.ok(!s.run, 'SPRAWL-00 locks too');
    t += ROGUE.relockMs;
    play(s, 'connect ' + loc.id);
    assert.ok(s.run, 'open again after a minute');
  } finally { hooks.now = null; }
});

test('elites: a third of a Pit\'s folders, built for a crew, three times the XP', async () => {
  const { createVirus, ELITE } = await import('./dist/data.mjs');
  const plain = createVirus('random', 9, { level: 10 }), elite = createVirus('random', 9, { level: 10, elite: true });
  assert.ok(elite.elite && /^ELITE /.test(elite.name));
  elite.parts.forEach((p, i) => {
    assert.equal(p.max, Math.round(plain.parts[i].max * ELITE.hp));
    assert.equal(p.maxArmor, plain.parts[i].maxArmor + ELITE.armor);
  });
  // Across many Pit spawns, about a third are elite; never in a Nest or a Gauntlet.
  const s = world();
  let n = 0, el = 0;
  for (let i = 0; i < 30; i++) {
    const loc = { seed: 100 + i, level: 10, rogue: { kind: 'pit' }, spawns: {}, serial: 0 };
    for (const sp of Object.values(rogueSpawns(s, loc))) { n++; if (sp.elite) { el++; assert.match(sp.name, /^elite /); } }
    const nest = { seed: 100 + i, level: 10, family: 'worm', rogue: { kind: 'nest' }, spawns: {}, serial: 0 };
    assert.ok(Object.values(rogueSpawns(s, nest)).every((sp) => !sp.elite));
  }
  assert.ok(Math.abs(el / n - ELITE.share) < 0.1, `${el}/${n}`);
});

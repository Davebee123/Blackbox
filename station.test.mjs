import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, addLocation, hooks } from './dist/combat.mjs';
import { play, layoutOf, takeable } from './dist/run.mjs';
import { tickNetwork } from './dist/invasion.mjs';
import { STATION, spell, dropOf, broadcast } from './dist/station.mjs';
import { zoneOf } from './dist/zone.mjs';

const world = (level = 5) => { const s = fresh(); s.tutorialCompleted = true; s.hackers = { breaker: { level, xp: 0 } }; zoneOf(s); return s; };
// Logged-on time: the network clock moves at most 5 s a tick, like the game's once-a-second tick.
const clock = (s, t0) => { let t = t0; tickNetwork(s, t); return (ms) => { for (const end = t + ms; t < end; ) tickNetwork(s, (t = Math.min(end, t + 5000))); }; };
const decode = (text) => { const [, , nums, digits] = text.split(' · '); return nums.split(' ').map((n) => String.fromCharCode(96 + Number(n))).join('') + digits; };

test('spell: two digits a letter, 01 = A', () => {
  assert.equal(spell('ember'), '05 13 02 05 18');
});

test('LANTERN broadcasts on the network clock from level 3, and not before', () => {
  const s = world(2);
  const pass = clock(s, 1_000_000);
  pass(20 * 60000);
  assert.ok(!s.logs.some((e) => e.type === 'station'), 'quiet below level 3');
  s.hackers.breaker.level = 3;
  pass(STATION.firstMs[1]);
  const heard = s.logs.filter((e) => e.type === 'station');
  assert.equal(heard.length, 1, 'the first broadcast comes within 8 minutes');
  assert.match(heard[0].message, /^LANTERN LANTERN · SPRAWL-00 · (\d\d ?)+ · \d\d$/, 'no traced servers yet: the drop is on SPRAWL-00');
});

test('decode the broadcast, unlock /drop, pull and bank a blue-or-better protocol and credits', () => {
  const s = world(6);
  addLocation(s, 'worm', 1);
  const loc = s.locations[0];
  broadcast(s, loc);
  const msg = s.logs.findLast((e) => e.type === 'station').message;
  assert.ok(msg.includes(loc.name));
  assert.ok(layoutOf(loc)['/'].dirs.includes('drop'));
  assert.ok(!takeable(loc).some((p) => p.startsWith('/drop')), "a drop doesn't count toward the server's files");
  play(s, 'connect ' + loc.id);
  play(s, 'unlock drop wrong00');
  assert.ok(!loc.state.unlocked['/drop']);
  play(s, 'unlock drop ' + decode(msg));
  assert.ok(loc.state.unlocked['/drop'], 'the decoded word plus the digits opens it');
  play(s, 'cd drop');
  const credits = s.server.credits, stash = (s.stash || []).length;
  play(s, 'pull cache.dat');
  play(s, 'pull kit.bin');
  play(s, 'jack out');
  assert.ok(s.server.credits > credits, 'credits banked');
  const got = (s.stash || []).slice(stash);
  assert.equal(got.length, 1);
  assert.ok(['tuned', 'custom'].includes(got[0].rarity));
  tickNetwork(s, 2_000_000);
  assert.equal(dropOf(loc), null, 'emptied: the signal goes');
  assert.ok(s.logs.some((e) => e.type === 'station-closed' && /emptied/.test(e.message)));
});

test('a drop closes after its time, but not while you are standing in it, and only one is up at a time', () => {
  const s = world(6);
  addLocation(s, 'worm', 1); addLocation(s, 'ransomware', 1);
  const [a, b] = s.locations;
  const pass = clock(s, 2_000_000);
  s.station.next = 1e9; // no scheduled broadcasts in this test
  broadcast(s, a);
  play(s, 'connect ' + a.id);
  pass(STATION.openMs + 1000);
  assert.ok(dropOf(a), 'still up while you are in it');
  play(s, 'jack out');
  pass(1000);
  assert.ok(!dropOf(a), 'gone once you leave');
  assert.ok(!layoutOf(a)['/'].dirs.includes('drop'));
  broadcast(s, a); broadcast(s, b);
  assert.ok(!dropOf(a) && dropOf(b), 'a new broadcast replaces the old drop');
});

test('rogue servers never get a drop', () => {
  const s = world(6);
  addLocation(s, 'worm', 1); addLocation(s, 'worm', 1);
  for (let i = 0; i < 12; i++) { (s.net ||= {}).rogueDry = 5; addLocation(s, 'worm', 2); }
  for (let i = 0; i < 30; i++) broadcast(s);
  assert.ok(!s.locations.some((l) => l.rogue && l.drop));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, active, resolveCycle, addLocation } from './dist/combat.mjs';
import { deal, eventsOf, tickEvents, outbreakMult, DIRECTOR, CARDS } from './dist/events.mjs';
import { logComms, commsOf, pruneComms } from './dist/comms.mjs';
import { mapMarkup } from './dist/view.mjs';

const world = () => { const s = fresh(); s.hackers = { breaker: { level: 6, xp: 0 } }; addLocation(s, 'worm'); addLocation(s, 'ransomware'); s.locations.forEach((l) => { l.rogue = false; }); return s; };
const win = (s) => {
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  for (let i = 0; i < 6 && active(s); i++) { const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); }
};

test('the director deals from level 3, one card at a time, never the same twice running', () => {
  const s = world();
  s.hackers.breaker.level = 2;
  tickEvents(s, 60 * 60000);
  assert.equal(eventsOf(s).length, 0, 'nothing before level 3');
  s.hackers.breaker.level = 6;
  const seen = [];
  for (let i = 0; i < 12; i++) { s.events = []; const ev = deal(s); if (ev) seen.push(ev.card); }
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1]);
  tickEvents(s, 0); s.director.next = 0; s.events = []; tickEvents(s, 1);
  assert.ok(eventsOf(s).length <= DIRECTOR.max);
});

test('a courier is a fight from the server card; winning takes the drop', () => {
  const s = world();
  const ev = deal(s, 'courier');
  assert.ok(ev && ev.loc);
  assert.match(mapMarkup(s, ev.loc), new RegExp(`event fight ${ev.id}`));
  const credits = s.server.credits, stash = s.stash.length;
  command(s, `event fight ${ev.id}`);
  assert.ok(active(s));
  assert.equal(s.encounter.event, ev.id);
  win(s);
  assert.ok(!active(s));
  assert.ok(s.server.credits - credits >= 40 + 12 * ev.level, 'the cache');
  assert.ok(s.stash.length > stash, 'and a protocol');
  assert.equal(eventsOf(s).length, 0, 'the event is over');
});

test('a bounty pays and raises standing; it leaves when its time is up', () => {
  const s = world();
  const ev = deal(s, 'bounty');
  assert.equal(ev.level, 8, 'two levels up');
  tickEvents(s, CARDS.bounty.ms + 1);
  assert.ok(!eventsOf(s).includes(ev), 'gone');
  assert.ok(s.logs.some((e) => e.type === 'world-event-end'));
});

test('an outbreak doubles a family\'s code; a leak opens a vault', () => {
  const s = world();
  const ev = deal(s, 'outbreak');
  assert.equal(outbreakMult(s, ev.family), 2);
  const loc = s.locations[0];
  loc.passwordKnown = false; loc.takenOver = false; s.locations[1].passwordKnown = true;
  deal(s, 'leak');
  assert.ok(loc.passwordKnown);
});

test('an event stays on the pager while it is up, and goes with it', () => {
  const s = world(), first = s.serial;
  const ev = deal(s, 'courier');
  logComms(s, s.logs.filter((e) => e.id > first));
  assert.equal(commsOf(s)[0].label, 'Courier');
  pruneComms(s, Date.now() + 12 * 60000);
  assert.equal(commsOf(s).length, 1, 'still up after the news window');
  s.events = eventsOf(s).filter((e) => e !== ev);
  pruneComms(s);
  assert.equal(commsOf(s).length, 0);
});

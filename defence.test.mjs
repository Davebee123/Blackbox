// Defence calls (events.mjs CALL, docs/factions-plan.md 8): a faction server you've found is under attack from its owner's rival.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, active, resolveCycle, addLocation } from './dist/combat.mjs';
import { deal, eventsOf, tickEvents, CARDS, CALL } from './dist/events.mjs';
import { eventCard } from './dist/event-cards.mjs';
import { rep, FACTIONS, FACTION_FAMILY } from './dist/factions.mjs';
import { tickNetwork } from './dist/invasion.mjs';

const world = ({ level = 9, owner = 'kestrel' } = {}) => {
  const s = fresh(); s.tutorialCompleted = true; s.hackers = { breaker: { level, xp: 0 } };
  addLocation(s, 'worm'); addLocation(s, 'ransomware');
  s.locations.forEach((l) => { l.rogue = false; l.runs = 1; l.level = Math.min(l.level || 1, level); });
  s.locations[0].faction = owner;
  command(s, 'mail'); s.mail.boardOpen = true;
  s.director = { next: 9e9, n: 0, last: null };
  return s;
};
const win = (s) => {
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  for (let i = 0; i < 6 && active(s); i++) { const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); }
};
const reps = (s) => Object.fromEntries(Object.keys(FACTIONS).map((f) => [f, rep(s, f)]));

test('a call goes up only on a faction server you have found, from level 6, its attacker a rival of the owner', () => {
  assert.ok(!CARDS.call.where(world({ level: 5 })).length, 'not before level 6');
  const none = world(); delete none.locations[0].faction;
  assert.ok(!CARDS.call.where(none).length, 'no faction server, no call');
  const s = world(), ev = deal(s, 'call');
  assert.equal(ev.loc, s.locations[0].id);
  assert.equal(ev.owner, 'kestrel');
  assert.ok(FACTIONS.kestrel.rivals.includes(ev.by));
  assert.equal(ev.family, FACTION_FAMILY[ev.by]);
  assert.match(eventCard(s, ev), /event fight/, 'the card is its Defend button');
});

test('ignoring a call costs nothing', () => {
  const s = world(), ev = deal(s, 'call'), was = reps(s);
  tickEvents(s, CALL.ms + 1);
  assert.ok(!eventsOf(s).includes(ev), 'it rebooted');
  assert.deepEqual(reps(s), was);
});

test('holding a call pays the owner, with the usual ripples', () => {
  const s = world(), ev = deal(s, 'call'), was = reps(s);
  command(s, `event fight ${ev.id}`);
  assert.ok(s.encounter.virus.elite);
  win(s);
  assert.ok(!eventsOf(s).includes(ev), 'held: over');
  assert.equal(rep(s, 'kestrel'), was.kestrel + CALL.hold);
  assert.equal(rep(s, 'nullchoir'), Math.max(1, was.nullchoir - Math.round(CALL.hold / 2)), 'its rival cools');
  assert.equal(rep(s, 'halcyon'), was.halcyon + Math.round(CALL.hold / 4), 'its ally warms');
});

test('a reboot while you hold the call costs the owner (no ripple); your commission’s calls count half again both ways', () => {
  const s = world(), ev = deal(s, 'call'), was = reps(s);
  ev.fought = true; // answered (a fight started, then lost or left)
  tickEvents(s, CALL.ms + 1);
  assert.equal(rep(s, 'kestrel'), was.kestrel - CALL.reboot);
  for (const f of Object.keys(FACTIONS)) if (f !== 'kestrel') assert.equal(rep(s, f), was[f], `${f}: no ripple`);
  const t = world(); t.commission = 'kestrel'; t.standing = { ...t.standing, kestrel: 50 };
  const e2 = deal(t, 'call');
  command(t, `event fight ${e2.id}`); win(t);
  assert.equal(rep(t, 'kestrel'), 50 + Math.round(CALL.hold * CALL.commission));
  const u = world(); u.commission = 'kestrel'; u.standing = { ...u.standing, kestrel: 50 };
  const e3 = deal(u, 'call'); e3.fought = true;
  tickEvents(u, CALL.ms + 1);
  assert.equal(rep(u, 'kestrel'), 50 - Math.round(CALL.reboot * CALL.commission));
});

test('calls come only while you are logged on: none is dealt or comes due while you are away', () => {
  const s = world(); s.director = { next: 1, n: 0, last: null };
  const ev = deal(s, 'call'), left = ev.left;
  s.net = { ...(s.net || {}), wall: 1_000_000 };
  tickNetwork(s, 1_000_000 + 6 * 3600000); // six hours away
  assert.ok(eventsOf(s).includes(ev) && ev.left >= left - 120000, 'its clock barely moved while you were away');
});

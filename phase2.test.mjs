// Phase 2 of the pre-multiplayer review: a world with a direction.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, active, addLocation, hackerOf } from './dist/combat.mjs';
import { CONFIG, SERVER, THREAT_STEPS } from './dist/data.mjs';
import { planner } from './dist/planner.mjs';
import { offer, contractKill, openContracts, title as contractTitle } from './dist/mail.mjs';
import { rogueSpawns } from './dist/rogue.mjs';

const at = (L) => { const s = fresh(); hackerOf(s).level = L; return s; };
const win = (s) => { command(s, 'engage'); for (let n = 0; n < 200 && active(s); n++) { s.server.integrity = s.server.max; if (s.run) s.run.integrity = s.run.max; command(s, planner(s) || 'hold'); resolveCycle(s); } };
const leadFrom = (L, mob) => {
  const s = at(L);
  s.run = { loc: 'sprawl', cwd: '/', integrity: 999, max: 999, pack: [], visited: ['/'] };
  selectEncounter(s, 'random', 5, { mode: 'run', room: '/tmp', level: mob, zone: true });
  win(s);
  return s.reports.at(-1).lead;
};

test('grey kills trace nothing: lead falls with the level gap like XP', () => {
  assert.equal(leadFrom(12, 12), CONFIG.leadBase);
  assert.equal(leadFrom(12, 7), Math.round(CONFIG.leadBase * 0.5));
  assert.equal(leadFrom(15, 3), 0);
});

test('kills trace your own layer, inside its band', () => {
  const s = at(12);
  for (let i = 0; i < 4; i++) addLocation(s, 'worm', SERVER.layerFor(12));
  assert.ok(s.locations.every((l) => l.depth === 2 && l.level === 12));
});

test('kill contracts count kills within 4 levels of where they were posted, and pay XP at that level', () => {
  const s = at(12);
  s.mail = { offers: [], jobs: [], next: 1, boardOpen: true };
  let o; for (let i = 0; i < 50 && (!o || o.type !== 'kill'); i++) { s.mail.offers = []; o = offer(s, 0); }
  assert.equal(o.type, 'kill'); assert.equal(o.level, 12);
  s.mail.offers = []; s.mail.jobs.push(o); // taken
  const c = openContracts(s).find((x) => x.id === o.id);
  contractKill(s, { family: c.family, zone: false, level: 5 });
  assert.equal(c.got, 0, 'a grey kill does not count');
  contractKill(s, { family: c.family, zone: false, level: 8 });
  assert.equal(c.got, 1);
  assert.match(contractTitle(s, c), /Lv 8\+/);
});

test('SPRAWL-00 eases you in: the first armor step lands at level 5, and its viruses follow you to level 8', () => {
  assert.equal(THREAT_STEPS.armor[0].threat, SERVER.threat(5));
  assert.equal(CONFIG.zone.maxLevel, 8);
});

test('the first rogue server is a Nest of the family that traced it, and it keeps up with you inside its band', () => {
  const s = at(4);
  addLocation(s, 'worm', 1); addLocation(s, 'worm', 1);
  const nest = addLocation(s, 'ghostroot', 1);
  assert.equal(nest.rogue?.kind, 'nest'); assert.equal(nest.family, 'ghostroot');
  hackerOf(s).level = 7; rogueSpawns(s, nest, 0);
  assert.equal(nest.level, 7);
  hackerOf(s).level = 20; for (const sp of Object.values(nest.spawns)) sp.alive = false, sp.respawnAt = 0;
  rogueSpawns(s, nest, 1);
  assert.equal(nest.level, 9, 'layer 1 tops out at 9');
});

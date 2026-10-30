// Objectives (objectives.mjs, GAME_RULES.md "Objectives"): one server fight room in two carries Priority or Uptime in
// the lever's place; the Exfil's upload runs on the same engine; a met objective pays the loot roll, XP and components.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { GENES } from './dist/genes.mjs';
import { OBJ, OBJECTIVES, rollObjective } from './dist/objectives.mjs';
import { boardMarkup } from './dist/view.mjs';
import { roomsMarkup } from './dist/floorplan-view.mjs';
import { RIVAL } from './dist/rivals.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
RIVAL.chance = 0; CONFIG.exfil.chance = 0; // scripted walks
let clock = 1_700_000_000_000;
hooks.now = () => clock;
// A level-14 traced server, connected.
function server() {
  const s = fresh(); s.tutorialCompleted = true;
  s.hackers = { [s.loadout.archetype]: { level: 14, xp: 0 } };
  command(s, 'developer location ransomware');
  const loc = s.locations[0]; loc.lockUntil = 0; loc.level = 14;
  play(s, 'connect ' + loc.id);
  return s;
}
// A plain fight room whose spawn carries this objective (or none), its spawn count nudged until it does.
function roomWith(s, kind, family = null) {
  const R = s.rooms;
  for (const room of Object.values(R.graph.rooms).filter((r) => r.kind === 'process' && (!family || r.family === family))) {
    for (let n = 0; n < 40; n++) { R.spawns[room.id] = n; if ((FP.fightOf(s, room).objective || null) === kind) return room; }
  }
  throw new Error('no room with ' + kind);
}
const engage = (s, room) => { const R = s.rooms; R.at = FP.neighbours(R.graph, room.id)[0]; R.screen = null; FP.go(s, room.id); play(s, 'engage'); return s.encounter; };
const calm = (e) => { for (const p of e.virus.parts) if (p.attack) p.attack.amount = 0; };
const hold = (s) => { s.run.integrity = s.run.max; command(s, 'shield'); resolveCycle(s); };

test('the roll: one plain fight room in two from level 6, Priority or Uptime, the same for the card and the fight', () => {
  const kinds = {};
  for (let seed = 1; seed <= 4000; seed++) { const k = rollObjective(seed, 10); kinds[k] = (kinds[k] || 0) + 1; assert.equal(rollObjective(seed, 10), k); }
  assert.ok(Math.abs(kinds.null / 4000 - (1 - OBJ.share)) < 0.03, JSON.stringify(kinds));
  assert.ok(kinds.priority > 800 && kinds.uptime > 800, JSON.stringify(kinds));
  assert.equal([...Array(500)].filter((_, i) => rollObjective(i + 1, OBJ.from - 1)).length, 0, 'none below level 6');
  const s = server(), room = roomWith(s, 'uptime');
  assert.equal(engage(s, room).objective.kind, 'uptime', 'the fight brings the roll the card shows');
});

test('an objective takes the lever\'s place: a room whose third is a lever loses it for that fight', () => {
  const s = server(), lever = 'mutexlock';
  assert.ok(GENES[lever].lever, 'the Mutex is a lever');
  const room = roomWith(s, 'priority', 'ransomware');
  room.third = lever;
  const v = FP.virusOf(s, room);
  assert.ok(!v.parts.some((p) => p.id === 'mutex'), v.parts.map((p) => p.id).join(' '));
  const plain = roomWith(s, null, 'ransomware'); plain.third = lever;
  assert.ok(FP.virusOf(s, plain).parts.some((p) => p.id === 'mutex'), 'a room with no objective keeps it');
});

test('Priority: one part marked; broken in time it pays the bonus; missed, the fight goes on without it', () => {
  const s = server(), room = roomWith(s, 'priority'), e = engage(s, room), o = e.objective;
  assert.equal(o.n, OBJECTIVES.priority.n);
  const mark = e.virus.parts.find((p) => p.id === o.part);
  assert.ok(mark, 'a part is marked');
  const board = boardMarkup(s);
  assert.match(board, /class="tag prio"[^>]*data-tt-kind="Objective"/, 'its target on the part');
  assert.match(board, new RegExp(`class="ps-obj"[^>]*>Priority 0/${o.n}<`), 'its chip in the phase strip');
  calm(e);
  // Broken in time: met, and the win pays components and XP on top.
  mark.integrity = 1; mark.armor = 0;
  command(s, 'spike ' + mark.id); resolveCycle(s);
  assert.equal(o.met, true);
  const before = s.components;
  for (const p of e.virus.parts) Object.assign(p, { integrity: Math.min(p.integrity, 1), armor: 0 });
  const logs = [];
  for (let i = 0; i < 10 && active(s); i++) { const p = e.virus.parts.find((x) => x.integrity > 0); logs.push(...play(s, 'spike ' + p.id)); resolveCycle(s); }
  assert.equal(e.phase, 'victory');
  assert.ok(s.components >= before + OBJ.bonus.components, 'its components');
  // Missed: the fight goes on, and no bonus.
  FP.settle(s);
  const t = server(), r2 = roomWith(t, 'priority'), f = engage(t, r2);
  calm(f);
  for (let i = 0; i < OBJECTIVES.priority.n; i++) hold(t);
  assert.equal(f.objective.failed, true);
  assert.ok(active(t), 'the fight goes on');
  assert.doesNotMatch(boardMarkup(t), /class="tag prio"/, 'its mark is gone');
});

test('Uptime: the virus can\'t be broken, its attacks quicken, and holding to the end of its cycles wins with the bonus', () => {
  const s = server(), room = roomWith(s, 'uptime'), e = engage(s, room);
  calm(e);
  const p = e.virus.parts.find((x) => x.attack), was = p.attack.interval;
  for (const x of e.virus.parts) Object.assign(x, { integrity: 2, armor: 0 });
  command(s, 'spike ' + e.virus.parts[0].id); resolveCycle(s);
  assert.ok(e.virus.parts.every((x) => x.integrity >= 1), 'nothing breaks');
  for (let i = 1; i < OBJECTIVES.uptime.every; i++) hold(s);
  if (was > 1) assert.equal(p.attack.interval, was - 1, 'every 3 cycles its attacks come a cycle quicker');
  assert.match(boardMarkup(s), /class="ps-obj"[^>]*>Uptime \d\/8</);
  const before = s.components;
  for (let i = 0; i < 20 && active(s); i++) hold(s);
  assert.equal(e.phase, 'victory');
  assert.equal(e.cycle, OBJECTIVES.uptime.n, 'won at the end of its last cycle');
  assert.ok(e.objective.met && s.components >= before + OBJ.bonus.components);
});

test('the Exfil runs on the engine: its upload is its objective (the Leash's cycle: daemons.test.mjs), an old save\'s escapeAt carried over', () => {
  const s = server(), room = roomWith(s, null);
  const e = engage(s, room);
  assert.equal(e.objective ?? null, null, 'a plain room\'s fight with none');
  e.escapeAt = 6; // an Exfil saved mid-fight before objectives
  const back = restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.encounter.objective, { kind: 'exfil', n: 6 });
  assert.equal(back.encounter.escapeAt, undefined);
});

test('the map and the room card show a live room\'s objective, its icon and its bonus', () => {
  const s = server(), R = s.rooms, room = roomWith(s, 'priority');
  R.seen[room.id] = 'kind';
  const map = roomsMarkup(s);
  assert.match(map, new RegExp(`class="fp-tag obj" title="Priority: Break the marked part within ${OBJECTIVES.priority.n} cycles\\."`));
  assert.match(map, /href="#fp-i-target"/);
  R.at = FP.neighbours(R.graph, room.id)[0]; R.screen = null; FP.go(s, room.id);
  const card = roomsMarkup(s);
  assert.match(card, /fp-obj[^]*Priority<\/span> Break the marked part/);
  assert.match(card, /fp-obj-pay[^]*\+1[^]*\+50%[^]*\+2/, 'loot, XP and components, as icons');
});

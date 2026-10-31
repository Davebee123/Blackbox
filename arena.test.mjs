// The Arena (dist/arena.mjs, the bench's Dev drawer): every listed fight starts, the list comes from the data tables,
// and developer fight's options (level, seed, leaning, objective, again) do what they say.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, active, hackerLevel, resolveCycle } from './dist/combat.mjs';
import { FAMILIES, STRAINS, BOSSES, SUBS } from './dist/data.mjs';
import { RIVALS } from './dist/rivals.mjs';
import { KINDS } from './dist/invasion.mjs';
import { arenaList, arenaEntry, arenaLevel, ARENA_GROUPS } from './dist/arena.mjs';
import * as B from './dist/bench.mjs';

const bench = (as = 'phantom', level = 20) => { const s = fresh(); B.benchCommand(s, `bench ${as} ${level}`, { bench: 'x' }); return s; };
const says = (ev) => ev.map((e) => e.message).join(' | ');

test('every Arena entry starts a fight at its level, and plays', () => {
  for (const x of arenaList()) {
    const s = bench();
    const ev = command(s, `developer fight ${x.id}`);
    assert.ok(active(s), `${x.id}: ${says(ev)}`);
    assert.equal(s.encounter.arena, x.id);
    assert.equal(s.encounter.mode, 'home');
    for (let i = 0; i < 3 && active(s); i++) resolveCycle(s);
  }
});

test('the list is built from the tables: every family, strain, boss, rival fight and invader kind', () => {
  const ids = new Set(arenaList().map((x) => x.id));
  for (const k of Object.keys(FAMILIES)) assert.ok(ids.has(`family:${k}`), k);
  for (const k of Object.keys(STRAINS)) assert.ok(ids.has(`strain:${k}`), k);
  for (const k of Object.keys(BOSSES)) assert.ok(ids.has(`boss:${k}`), k);
  for (const [k, R] of Object.entries(RIVALS)) R.lineup.forEach((_, i) => assert.ok(ids.has(`rival:${k}.${i + 1}`), k));
  for (const k of Object.keys(KINDS)) assert.ok(ids.has(`invader:${k}`), k);
  assert.ok(ids.has('part:zipbomb') && ids.has('part:zipbomb.exe') && ids.has('elite:blastseal'));
  // A boss another session adds shows up by itself, in its group.
  BOSSES.testboss = { name: 'TEST BOSS', family: 'worm', hp: 1, dmg: 1, enrageAt: 18, phases: [] };
  try { assert.equal(arenaEntry('boss:testboss')?.group, 'solo'); } finally { delete BOSSES.testboss; }
  // Every row: a name, a kind and the level it opens; every group a heading.
  const groups = new Set(ARENA_GROUPS.map(([g]) => g));
  for (const x of arenaList()) { assert.ok(x.name && x.kind && x.opens >= 1, x.id); assert.ok(groups.has(x.group), x.id); }
});

test('level, seed, leaning and objective', () => {
  const s = bench('phantom', 10);
  command(s, 'developer fight strain:hashrat 12 7 leaning=venting objective=priority');
  const e = s.encounter;
  assert.equal(e.virus.level, 12); assert.equal(e.seed, 7); assert.equal(e.virus.strain, 'hashrat');
  assert.equal(e.leaning.id, 'venting');
  assert.equal(e.objective.kind, 'priority'); assert.ok(e.objective.part);
  assert.equal(s.arenaLast, 'strain:hashrat 12 7 leaning=venting objective=priority');
  // Empty: the level it opens, never under yours; a part's at the level it opens.
  assert.equal(arenaLevel(s, 'boss:nb-hashlord'), 16);
  assert.equal(arenaLevel(s, 'family:worm'), hackerLevel(s));
  assert.equal(arenaLevel(s, 'part:zipbomb'), 5);
  assert.equal(arenaLevel(s, 'rival:kudzu.1'), hackerLevel(s) + 1);
  // Bad words warn, and start nothing.
  for (const bad of ['developer fight boss:nobody', 'developer fight family:worm 10 1 leaning=nope', 'developer fight family:worm 10 1 objective=exfil', 'developer fight family:worm x']) {
    const t = bench('phantom', 10);
    assert.equal(command(t, bad).at(-1).type, 'warning', bad); assert.ok(!active(t), bad);
  }
});

test('Uptime is won on its clock in the Arena', () => {
  const s = bench('phantom', 20);
  command(s, 'developer fight family:worm 20 3 objective=uptime');
  for (let i = 0; i < 12 && active(s); i++) { command(s, 'developer refill'); resolveCycle(s); }
  assert.equal(s.encounter.phase, 'victory');
  assert.ok(s.encounter.virus.parts.some((p) => p.integrity > 0), 'won on the clock, not by breaking it');
});

test('again refights the last pick from the start, and again refill fills you first', () => {
  const s = bench('phantom', 10);
  assert.equal(command(s, 'developer fight again').at(-1).type, 'warning', 'nothing yet');
  command(s, 'developer fight boss:resident 10 9');
  const first = structuredClone(s.encounter.virus.parts.map((p) => p.max));
  resolveCycle(s); resolveCycle(s);
  command(s, 'developer fight again'); // mid-fight: dropped and fought again
  assert.ok(active(s)); assert.equal(s.encounter.cycle, 1); assert.deepEqual(s.encounter.virus.parts.map((p) => p.max), first);
  s.encounter.phase = 'crashed'; s.server.integrity = 0;
  command(s, 'developer fight again refill');
  assert.ok(active(s)); assert.equal(s.server.integrity, s.server.max);
});

test('a rival\'s second fight carries its counter', () => {
  const s = bench('phantom', 10);
  command(s, 'developer fight rival:kudzu.2');
  assert.ok(active(s));
  assert.ok(s.encounter.virus.parts.some((p) => p.rival), 'the counter part is on it');
  assert.match(s.encounter.virus.name, / \+ /);
});

test('?bench=arena builds the character asked for, again when it changes', () => {
  const s = bench('phantom', 20);
  assert.equal(B.arenaBuild(s, {}, 'phantom', '20'), null, 'the same: kept');
  assert.equal(B.arenaBuild(s, {}, 'phantom', '25'), 'phantom');
  assert.equal(B.arenaBuild(s, {}, 'herder', '20'), 'herder');
  assert.equal(B.arenaBuild(fresh(), null, null, null), Object.keys(SUBS)[0], 'a new arena: the first subclass');
  assert.equal(B.arenaBuild(s, {}, null, null), null);
});

test('the drawer: the Arena\'s picker lists every entry, the last pick selected', () => {
  const s = bench('phantom', 10);
  command(s, 'developer fight strain:echo 10 2');
  const html = B.panelMarkup(s);
  assert.equal((html.match(/data-arena-pick=/g) || []).length, arenaList().length);
  assert.match(html, /data-arena-pick="strain:echo"[^>]*aria-selected="true"/);
  assert.match(html, /data-arena-search/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { sweepPuzzle, sweepKind, SWEEP } from './dist/forensics.mjs';

const locAt = (depth, seed) => ({ seed, depth, owner: 'Vance', family: 'worm', deeper: 'ransomware', level: 5, state: {} });
const col = (p, name) => p.cols.indexOf(name);

test('about half the servers keep an incident file, of three kinds', () => {
  const kinds = {};
  for (let seed = 1; seed <= 400; seed++) { const k = sweepKind(locAt(1, seed)) || 'none'; kinds[k] = (kinds[k] || 0) + 1; }
  assert.ok(kinds.none > 140 && kinds.none < 260, `none: ${kinds.none}`);
  for (const k of ['auth', 'exfil', 'proc']) assert.ok(kinds[k] > 20, `${k}: ${kinds[k]}`);
  assert.equal(sweepKind({ zone: true, seed: 3 }), null);
});

test('every puzzle has one right answer among three suspects, and its trick holds', () => {
  let seen = 0;
  for (let seed = 1; seed < 300; seed++) for (const depth of [1, 2, 3]) {
    const p = sweepPuzzle(locAt(depth, seed));
    if (!p) continue;
    seen++;
    assert.equal(p.suspects.length, 3);
    assert.equal(new Set(p.suspects).size, 3, `${p.kind} ${seed} suspects distinct`);
    assert.ok(p.suspects.includes(p.answer));
    if (depth === 3) assert.ok(p.note, 'layer 3 always carries the clue note');
    if (p.kind === 'auth') {
      const rows = p.rows.map((x) => x.cells);
      const by = (a, res) => rows.filter((c) => c[4] === a && c[2] === res).length;
      assert.ok(by(p.answer, 'FAIL') >= 1 && by(p.answer, 'OK') >= 1);
    }
    if (p.kind === 'exfil') assert.ok(p.rows.some((x) => x.cells[col(p, 'dir')] === 'OUT' && x.cells[col(p, 'file')].startsWith(p.answer)));
    if (p.kind === 'proc') {
      const row = p.rows.find((x) => x.cells[0] === p.answer).cells;
      if (depth === 1) assert.ok(Number(row[3]) >= 90, 'the miner eats the CPU');
      if (depth === 2) assert.ok(row[1] !== '1' && row[4] === 'sshd', 'sshd with the wrong parent');
      if (depth === 3) assert.ok(row[4].includes('/tmp'), 'a fake kernel thread');
    }
  }
  assert.ok(seen > 300);
  assert.deepEqual(sweepPuzzle(locAt(2, 7)), sweepPuzzle(locAt(2, 7)));
});

test('sweeping on a run: wrong guesses shrink the lead, a right one lands once', () => {
  let s, loc;
  for (let k = 1; k < 50; k++) {
    s = fresh(); s.seed = k; s.tutorialCompleted = true;
    command(s, 'developer location worm');
    loc = s.locations[0];
    if (sweepKind(loc)) break;
  }
  const p = sweepPuzzle(loc);
  assert.ok(p, 'found a server with an incident file');
  play(s, `connect ${loc.id}`);
  const events = play(s, `cat ${p.file}`);
  assert.ok(events.some((e) => e.type === 'net-sweep' && e.sweep.rows.length >= 8));
  const wrong = p.suspects.find((a) => a !== p.answer);
  const before = s.leadProgress[loc.deeper] || 0;
  play(s, `sweep ${wrong}`);
  assert.equal(s.leadProgress[loc.deeper] || 0, before, 'a wrong guess gives nothing');
  play(s, `sweep ${p.answer}`);
  assert.equal(((s.leadProgress[loc.deeper] || 0) - before + 100) % 100, SWEEP.rewards[1]);
  assert.ok(play(s, `sweep ${p.answer}`).some((e) => /Already swept/.test(e.message)));
  assert.ok(play(s, `pull ${p.file}`).some((e) => /cat it to sweep/.test(e.message)));
});

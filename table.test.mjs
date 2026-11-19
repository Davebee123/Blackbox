import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, gainXp, hackerOf, rollDrop } from './dist/combat.mjs';
import { tickNetwork } from './dist/invasion.mjs';
import { contractDid, ready } from './dist/mail.mjs';
import { TABLE, countOf, moveTable, tickTable, full, clear, bandOf, orphanShare, orphanXpMult, intelXpMult, trashItemMult, clearOddsMult, rareMult, tableTip, tableKind, tableRows } from './dist/table.mjs';

const HOUR = 3600000;
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('the count is made on first use at 84%, and logged-on time fills it at 2 an hour', () => {
  const s = fresh();
  assert.equal(s.table, undefined);
  assert.equal(countOf(s), TABLE.start);
  tickTable(s, HOUR);
  close(s.table, 86);
  tickTable(s, 0);
  close(s.table, 86);
});

test('only logged-on time counts: a gap while logged off moves nothing', () => {
  const s = fresh(), t0 = 1_000_000_000_000;
  tickNetwork(s, t0);
  const before = countOf(s);
  tickNetwork(s, t0 + 6 * HOUR); // a closed game: the gap is time away
  assert.ok(countOf(s) - before < 0.01, `away moved it ${countOf(s) - before}`);
  for (let t = t0 + 6 * HOUR; t < t0 + 6 * HOUR + 30 * 60000; t += 1000) tickNetwork(s, t); // half an hour logged on
  close(countOf(s) - before, 1, 0.02);
});

test('your play empties it: an orphan 0.08, a Mapped server 1, an Orphans contract 2; it clamps at 70', () => {
  const s = fresh();
  moveTable(s, -TABLE.orphan);
  close(s.table, 83.92);
  moveTable(s, -TABLE.mapped);
  close(s.table, 82.92);
  moveTable(s, -TABLE.contract);
  close(s.table, 80.92);
  moveTable(s, -100);
  assert.equal(s.table, TABLE.min);
});

test('a cancel round at 95% takes 8 off', () => {
  const s = fresh();
  s.table = 94.5;
  assert.equal(tickTable(s, HOUR / 8), false);
  close(s.table, 94.75);
  assert.equal(tickTable(s, HOUR), true);
  close(s.table, 87);
  s.table = 95 - 1e-6;
  const out = tickNetwork(s, 1_000_000_000_000) && tickNetwork(s, 1_000_000_001_000);
  assert.ok(out.some((e) => e.type === 'table-cancel'), 'a Log line');
});

test('each band grows from its edge to its end', () => {
  const s = fresh(), at = (n) => { s.table = n; return s; };
  assert.equal(full(at(88)), 0); assert.equal(full(at(95)), 1); close(full(at(91.5)), 0.5);
  assert.equal(clear(at(80)), 0); assert.equal(clear(at(70)), 1); close(clear(at(75)), 0.5);
  assert.equal(bandOf(at(84)), 'between'); assert.equal(bandOf(at(90)), 'full'); assert.equal(bandOf(at(76)), 'clear');
  // Between the bands everything is as it was.
  at(84);
  for (const f of [orphanXpMult, intelXpMult, trashItemMult, clearOddsMult, rareMult]) assert.equal(f(s), 1);
  // At Full's end: orphan kills +25% XP, trash items ×1.5; Clear's untouched.
  at(95);
  close(orphanXpMult(s), 1.25); close(trashItemMult(s), 1.5); assert.equal(clearOddsMult(s), 1); assert.equal(intelXpMult(s), 1);
  // At Clear's end: Break-ins and Intel +25%, blue and yellow ×1.4, ★ rare spawns twice as often; Full's untouched.
  at(70);
  close(intelXpMult(s), 1.25); close(clearOddsMult(s), 1.4); close(rareMult(s), 2); assert.equal(orphanXpMult(s), 1); assert.equal(trashItemMult(s), 1);
  assert.match(tableTip(), /^Process table: /);
  assert.deepEqual(tableRows(at(76)).map((r) => r[1]), ["◌ Orphans", "Break-ins, Intel", "Elites, ★, vaults", "★ Rare spawns"]);
  assert.deepEqual(tableRows(at(92)).map((r) => r[1]), ["◌ Orphans", "◌ Orphan kills", "Trash", "Elites"]);
  assert.deepEqual(tableRows(at(84)).map((r) => r[2]), ["1 in 8"]);
  assert.equal(tableKind(at(76)), 'Clear band');
  assert.equal(tableKind(at(84)), 'Between the bands');
  assert.equal(tableKind(at(92)), 'Full band');
});

test('the orphans’ share: 1 in 8 between, 1 in 3 at Full’s end, 1 in 20 at Clear’s', () => {
  const s = fresh(), at = (n) => { s.table = n; return orphanShare(s); };
  close(at(84), 1 / 8); close(at(88), 1 / 8); close(at(80), 1 / 8);
  close(at(95), 1 / 3); close(at(70), 1 / 20);
  assert.ok(at(91) > 1 / 8 && at(91) < 1 / 3);
  assert.ok(at(76) < 1 / 8 && at(76) > 1 / 20);
});

test('Clear pays Break-ins and Intel more XP; Fights stay as they are', () => {
  const s = fresh(), xp = () => hackerOf(s).xp;
  s.table = 70;
  gainXp(s, 100, '', 'breakin'); // the first of a kind pays a Fresh bonus: past it
  let x = xp(); gainXp(s, 100, '', 'breakin'); assert.equal(xp() - x, 125);
  x = xp(); gainXp(s, 100, '', 'fight'); assert.equal(xp() - x, 100);
  s.table = 84;
  x = xp(); gainXp(s, 100, '', 'intel'); assert.ok(xp() - x <= 150 && xp() - x >= 100); // a Fresh bonus may add half
});

test('Full makes trash drop whites and blues 1.5× as often', () => {
  const items = (n) => { const s = fresh(); s.table = n; s.seed = 7; let k = 0; for (let i = 0; i < 20000; i++) if (rollDrop(s, { kind: 'home' }, 10)) k++; return k; };
  const mid = items(84), top = items(95);
  assert.ok(top / mid > 1.35 && top / mid < 1.65, `${top} / ${mid}`);
});

test('an Orphans contract counts orphans broken, and delivered frees two slots', () => {
  const s = fresh();
  s.tutorialCompleted = true;
  command(s, 'mail');
  const c = { id: 9001, type: 'orphans', count: 2, got: 0, taken: true, reward: { credits: 10, rep: 1 }, level: 1 };
  (s.mail.jobs ||= []).push(c);
  contractDid(s, 'orphans'); contractDid(s, 'orphans'); contractDid(s, 'orphans');
  assert.equal(c.got, 2);
  assert.ok(ready(s, c));
  command(s, `mail deliver ${c.id}`);
  assert.ok(c.done, 'delivered');
  close(countOf(s), TABLE.start - TABLE.contract);
});

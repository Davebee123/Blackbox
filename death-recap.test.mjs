// The death recap (recap.mjs): what the Disconnected card shows of how you lost. Your Integrity at the end of each of the
// last cycles, the hits that did it (the killing blow marked, a charge's tell on it), the totals, and markup that shows
// rather than explains: icons, numbers and short labels on the card, the sentences in its tooltips.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, part } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { xpTotal } from './dist/floorplan.mjs';
import { tellsOf } from './dist/tells.mjs';
import { gainMarkup } from './dist/view.mjs';
import { deathRecap, recapMarkup, RECAP, restoreMarkup, foldMarkup, sinceLabel } from './dist/recap.mjs';
import { maxSignal } from './dist/combat.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
const hold = (s, n = 200) => { for (let i = 0; i < n && active(s); i++) { command(s, 'hold'); resolveCycle(s); } };
const HURT = ['server-hit', 'encrypted', 'scrambled'];
// A run on rooms (netrooms.test.mjs): into a process room, engaged, with Integrity for a long fight.
function runFight() {
  const s = fresh(); s.tutorialCompleted = true;
  command(s, 'developer location ransomware');
  const loc = s.locations[0]; loc.lockUntil = 0;
  play(s, 'connect ' + loc.id);
  const next = FP.roomList(s).find((r) => FP.isUp(s, r) && r.kind === 'process'), R = s.rooms;
  R.at = FP.neighbours(R.graph, next.id)[0]; R.screen = null; FP.go(s, next.id);
  play(s, 'engage');
  return s;
}
// What's on the card to read, without its tags and attributes (the tooltips and the screen-reader label).
const visible = (html) => html.replace(/<[^>]*>/g, '\n').split('\n').map((x) => x.trim()).filter(Boolean);

test('a lost run fight: the disconnected event carries the recap of its last cycles', () => {
  const s = runFight();
  s.run.max = s.run.integrity = 400;
  const e = s.encounter, from = s.logs.findLast((x) => x.type === 'engage').id;
  hold(s);
  assert.equal(s.run, null, 'disconnected');
  const d = s.logs.findLast((x) => x.type === 'disconnected'), r = d.recap;
  assert.ok(r, 'the event carries it');
  assert.ok(e.cycle > RECAP.cycles + 2, `a long fight (${e.cycle} cycles)`);
  // Bounded: the last 6 cycles, one bar each, joined end to start, ending where you did.
  assert.equal(r.cycles, RECAP.cycles);
  assert.equal(r.bars.length, RECAP.cycles);
  assert.equal(r.end, e.cycle);
  assert.equal(r.bars.at(-1).to, 0, 'the last bar is empty');
  for (let i = 1; i < r.bars.length; i++) assert.equal(r.bars[i].from, r.bars[i - 1].to, 'one bar starts where the last ended');
  assert.ok(Object.keys(e.fxs.sig).length <= RECAP.cycles + 1, 'the fight notes only the last few cycles');
  // The hits: yours only, in the window, summed into at most 4 rows; the killing blow is the last one.
  const hits = s.logs.filter((x) => x.id > from && x.id < d.id && !x.who && HURT.includes(x.type) && x.amount > 0 && x.cycle >= r.from);
  assert.ok(hits.length, 'it took hits');
  assert.equal(r.took, hits.reduce((a, x) => a + x.amount, 0), 'taken: every hit in the window');
  assert.equal(r.took, r.bars.reduce((a, b) => a + b.took, 0));
  assert.equal(r.kill.amount, hits.at(-1).amount, 'the killing blow is the last hit');
  assert.equal(r.kill.part, e.virus.parts.find((p) => p.id === hits.at(-1).source)?.name || '');
  assert.ok(r.rows.length >= 1 && r.rows.length <= RECAP.rows);
  assert.equal(r.rows.filter((x) => x.last).length, 1, 'one row holds the last hit');
  for (let i = 1; i < r.rows.length; i++) assert.ok(r.rows[i - 1].amount >= r.rows[i].amount, 'biggest first');
  if (r.rows.length > 1) assert.ok(r.rows[0].top && r.rows.slice(1).every((x) => !x.top), 'the biggest is lit');
  assert.equal(r.healed, r.bars.reduce((a, b) => a + b.healed, 0));
  assert.ok(r.shielded >= 0);
});

test('rows: the same attack is one row, summed; past 4 rows the last hit still shows', () => {
  const parts = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({ id, name: `Part ${id}`, attack: { name: `Hit ${id}` }, integrity: 1, max: 1 }));
  const logs = [{ id: 1, cycle: 1, type: 'engage' }];
  let id = 2;
  const ev = (cycle, source, amount, x = {}) => logs.push({ id: id++, cycle, type: 'server-hit', source, amount, ...x });
  ev(2, 'a', 30); ev(3, 'a', 30); ev(3, 'b', 25); ev(4, 'c', 20); ev(4, 'd', 15); ev(5, 'b', 2, { who: 'Vex' }); ev(5, 'e', 5);
  logs.push({ id: id++, cycle: 4, type: 'heal', amount: 7 }, { id: id++, cycle: 4, type: 'blocked', shield: true, amount: 9 });
  const s = { logs, run: { integrity: 0, max: 200 }, encounter: { mode: 'run', cycle: 5, metrics: {}, virus: { parts }, fxs: { sig: { 1: 200, 2: 170, 3: 115, 4: 87 } } } };
  const r = deathRecap(s);
  assert.equal(r.rows.length, RECAP.rows);
  assert.deepEqual(r.rows.map((x) => [x.name, x.amount, x.n]), [['Hit a', 60, 2], ['Hit b', 25, 1], ['Hit c', 20, 1], ['Hit e', 5, 1]], 'a crewmate\'s hit is not yours; the small last hit takes the fourth row');
  assert.ok(r.rows.at(-1).last && r.rows[0].top);
  assert.deepEqual(r.kill, { name: 'Hit e', part: 'Part e', amount: 5, kind: 'attack', tell: null });
  assert.deepEqual([r.took, r.healed, r.shielded], [125, 7, 9]);
  assert.deepEqual(r.bars.map((b) => [b.c, b.from, b.to]), [[1, 200, 200], [2, 200, 170], [3, 170, 115], [4, 115, 87], [5, 87, 0]], 'from the cycle the fight started');
});

test('the card shows it, not explains it: numbers, marks and labels; the sentences live in tooltips', () => {
  const s = runFight();
  s.run.max = s.run.integrity = 300;
  hold(s);
  const r = s.logs.findLast((x) => x.type === 'disconnected').recap;
  const html = recapMarkup(r);
  assert.match(html, /class="rc-bar end"/);
  assert.equal((html.match(/class="rc-bar[ "]/g) || []).length, r.bars.length);
  for (const t of visible(html)) {
    assert.ok(!/[.!?]$/.test(t), `no sentence on the card: "${t}"`);
    assert.ok(t.split(/\s+/).length <= 3, `a label, not a line: "${t}"`);
  }
  const tips = [...html.matchAll(/title="([^"]*)"/g)].map((m) => m[1].replace(/&#39;/g, "'"));
  assert.ok(tips.length >= r.bars.length + r.rows.length + 3, 'every bar, row and total has its tip');
  for (const t of tips) assert.match(t, /^[A-Z][^]*\.$/, `a tip is a sentence-case sentence: "${t}"`);
  // On the Disconnected card it sits over the rows that were there before.
  const card = gainMarkup('Disconnected', 'X', [{ kind: 'lost', label: 'Taken out by X', qty: '', text: 'Integrity lost' }], true, html);
  assert.ok(card.indexOf('class="recap"') < card.indexOf('class="sp-rows"'));
  assert.equal(recapMarkup(null), '', 'nothing to show, nothing drawn');
});

test('No carrier, folded: the card opens on the image you are back to; the recap waits behind one row', () => {
  const s = runFight();
  const snap = s.run.snap, back = snap.integrity;
  assert.ok(snap.at > 0, 'the snap notes when it was taken');
  s.run.max = s.run.integrity = 400;
  hold(s);
  const d = s.logs.findLast((x) => x.type === 'disconnected');
  assert.ok(d.reverted && d.image, 'the event carries the image');
  assert.equal(d.image.at, snap.at);
  assert.equal(d.image.integrity, back, 'Integrity back to the connect');
  assert.equal(d.out, s.locations[0].id, 'and which server it was, for the map');
  const max = maxSignal(s), top = restoreMarkup(d, max, snap.at + 17 * 60000), fold = foldMarkup(d.recap, d.by);
  const pc = Math.round((back / max) * 100);
  assert.deepEqual(visible(top).slice(0, 3).map((x) => x.toLowerCase()), ['restored', `image ${new Date(snap.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`.toLowerCase(), `${pc}%`]);
  assert.ok(top.includes(`width:${pc}%`), 'the teal bar at the Integrity you are back to');
  assert.ok(visible(top).includes('17 min passed'), 'the net kept its time');
  assert.match(fold, /^<details class="rc-fold">/, 'the recap folded: closed until opened');
  assert.deepEqual(visible(fold).slice(0, 2), [`Taken out by ${d.by}`, `−${d.recap.took}`]);
  assert.ok(fold.includes(recapMarkup(d.recap)), 'the whole recap inside');
  assert.equal(restoreMarkup({ ...d, reverted: false }, max), '', 'nothing undone (an old save): no restore');
  assert.equal(foldMarkup(null, d.by), '');
  // A first run's XP is paid as you connect, before the snap: a disconnect keeps it, the card doesn't strike it, and
  // the next connect doesn't pay it again.
  const xp = xpTotal(s);
  assert.ok(xp > 0 && xp === snap.xp, 'the first run paid, and kept');
  assert.equal(d.visit.xp, 0, 'nothing struck that the death did not take');
  const loc = s.locations[0]; loc.lockUntil = 0;
  play(s, 'connect ' + loc.id);
  assert.equal(xpTotal(s), xp, 'paid once');
  assert.deepEqual([sinceLabel(10e3), sinceLabel(17 * 60000), sinceLabel(65 * 60000), sinceLabel(120 * 60000)], ['1 min', '17 min', '1 h 5 min', '2 h']);
});

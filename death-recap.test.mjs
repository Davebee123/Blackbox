// The death recap (recap.mjs): what the Disconnected card shows of how you lost. Your Signal at the end of each of the
// last cycles, the hits that did it (the killing blow marked, a charge's tell on it), the totals, and markup that shows
// rather than explains: icons, numbers and short labels on the card, the sentences in its tooltips.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, part } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { tellsOf } from './dist/tells.mjs';
import { nodeList, startBreach, outfit, fight } from './dist/breach.mjs';
import { breachMarkup } from './dist/breach-view.mjs';
import { gainMarkup } from './dist/view.mjs';
import { deathRecap, recapMarkup, RECAP } from './dist/recap.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
const hold = (s, n = 200) => { for (let i = 0; i < n && active(s); i++) { command(s, 'hold'); resolveCycle(s); } };
const HURT = ['server-hit', 'encrypted', 'scrambled'];
// A run on rooms (netrooms.test.mjs): into a process room, engaged, with Signal for a long fight.
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
function breachFight(tells) {
  const s = fresh();
  s.rng = 5 * 7777;
  outfit(s, { cls: 'breaker', level: 10, gearSeed: 5 });
  startBreach(s, { seed: 5, level: 10 });
  const n = nodeList(s.breach.map).find((x) => x.kind === 'virus' && x.act === 0);
  if (tells) n.tells = tells;
  fight(s, n);
  s.encounter.hardened = 0;
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

test('a charge that lands as the killing blow wears its tell, and its tip names the answer', () => {
  const s = breachFight(['overcharge']), e = s.encounter, T = tellsOf(s);
  for (const p of e.virus.parts) if (p.attack) p.attack.due = 999;
  const t = T.list.find((x) => x.id === 'overcharge'), p = part(s, t.part);
  p.attack.due = e.cycle + 2;
  Object.assign(t, { told: true, said: e.cycle, next: e.cycle + 2, n: p.attack.n || 0, wound: 0, hitBy: [], after: 999, opened: null, early: null, need: 0 });
  s.run.integrity = 5;
  hold(s, 10);
  assert.equal(s.breach.result, 'lost');
  const r = s.breach.lost.recap;
  assert.ok(r, 'the breach keeps it on the loss');
  assert.deepEqual(r.kill.tell, { kind: 'charge', name: 'Overcharge' });
  assert.equal(r.kill.part, p.name);
  const html = recapMarkup(r);
  assert.match(html, /class="rc-tell t-charge" style="--icon:url\('ui\/icons\/event-warning.svg'\)"/, 'the charge chip\'s icon');
  assert.match(html, new RegExp(`Overcharge is a charge\\. Cut the ${p.name} on its cycle to call it off\\.`));
  assert.match(html, /took your Signal to 0\./);
  assert.match(breachMarkup(s), /bx-capture lost[\s\S]*class="recap"/, 'on the breach\'s loss card');
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
  const card = gainMarkup('Disconnected', 'X', [{ kind: 'lost', label: 'Taken out by X', qty: '', text: 'Signal lost' }], true, html);
  assert.ok(card.indexOf('class="recap"') < card.indexOf('class="sp-rows"'));
  assert.equal(recapMarkup(null), '', 'nothing to show, nothing drawn');
});

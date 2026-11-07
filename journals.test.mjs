// Journals (journals.mjs, journals-view.mjs, docs/journals.md): 51 entries, a file in a vault on its floor, recorded
// with the day found, one Journals entry in the Ledger, and a document card on the first find.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, hooks } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { RIVAL } from './dist/rivals.mjs';
import { JOURNALS, WRITERS, JOURNAL, journalFor, findJournal, journalCount, headLine } from './dist/journals.mjs';
import { journalCardMarkup, journalLedgerMarkup } from './dist/journals-view.mjs';
import { logOf, logTotals } from './dist/collection-log.mjs';
import { collectionPageMarkup } from './dist/collection-view.mjs';

RIVAL.chance = 0; CONFIG.exfil.chance = 0;
let clock = 1_700_000_000_000;
hooks.now = () => clock;
const me = () => { const s = fresh(); s.tutorialCompleted = true; return s; };

test('the data: 51 entries by 13 writers, in date order, with sane C-years and floors', () => {
  assert.equal(JOURNALS.length, 51);
  assert.equal(WRITERS.length, 13);
  assert.equal(new Set(JOURNALS.map((e) => e.id)).size, 51);
  for (const e of JOURNALS) {
    assert.ok(e.cy >= -13 && e.cy <= 30, `${e.id}: C${e.cy}`);
    // C+N: the Nth year after the Cascade (10 November 2061), C−N the Nth before, C0 the day itself.
    const y = Number(e.date.slice(0, 4)) - 2061, md = e.date.slice(5), d = e.date.slice(0, 10);
    assert.equal(e.cy, d === '2061-11-10' ? 0 : d > '2061-11-10' ? y + (md >= '11-10' ? 1 : 0) : y - (md >= '11-10' ? 0 : 1), `${e.id}: ${e.date} is ${e.cyText}`);
    assert.ok(e.floor >= 1 && e.floor <= 8 && e.text.length >= 3, e.id);
    if (e.cy < 0 && e.floor !== 8) assert.equal(e.place, 'in a restored archive', `${e.id}: older than its floor`);
  }
  assert.deepEqual(JOURNALS.map((e) => e.n), JOURNALS.map((_, i) => i + 1));
  assert.ok(JOURNALS.every((e, i) => !i || JOURNALS[i - 1].date <= e.date), 'in date order');
  assert.equal(headLine(JOURNALS.find((e) => e.writer === 'Sabine Roth')), 'COURANT · CITY DESK · ROTH');
  assert.equal(headLine(JOURNALS.find((e) => e.writer === 'moth')), '~/notes/2088-03-12.txt');
  assert.equal(JOURNALS.filter((e) => e.medium === 'desk').length, 5, "Margit's five night-desk entries");
});

test('a vault holds its floor\'s earliest unfound entry on half the servers; finding one fills its slot, once', () => {
  const s = me(), loc = { seed: 1, depth: 8 };
  let seeds = 0;
  for (let i = 1; i <= 400; i++) if (journalFor(s, { seed: i, depth: 8 })) seeds++;
  assert.ok(Math.abs(seeds / 400 - JOURNAL.share) < 0.1, `${seeds}/400`);
  for (let i = 1; !journalFor(s, loc); i++) loc.seed = i;
  const j = journalFor(s, loc);
  assert.equal(j.floor, 8);
  assert.equal(j.id, JOURNALS.find((e) => e.floor === 8).id, 'the earliest first');
  assert.ok(findJournal(s, j.id, clock));
  assert.equal(s.journals[j.id], clock);
  assert.equal(s.journalCard, j.id, 'its card is up');
  assert.equal(findJournal(s, j.id, clock + 1), false, 'once');
  assert.notEqual(journalFor(s, loc).id, j.id, 'the next one');
  assert.equal(journalCount(s), 1);
});

test('opening a traced server\'s vault finds an entry from its floor, with no credits or items for it', () => {
  const s = me();
  command(s, 'developer location ransomware');
  const loc = s.locations[0]; loc.lockUntil = 0;
  for (let i = 1; !journalFor(s, loc); i++) loc.seed = i; // a server whose vault holds one
  play(s, 'connect ' + loc.id);
  const R = s.rooms, v = R.graph.vaults[0];
  R.visit.keys.push(v); R.at = FP.neighbours(R.graph, v)[0]; R.screen = null; FP.go(s, v);
  play(s, 'open');
  const got = Object.keys(s.journals || {});
  assert.equal(got.length, 1);
  assert.equal(JOURNALS.find((e) => e.id === got[0]).floor, loc.depth || 1);
  assert.ok(!s.run.pack.some((f) => /journal/.test(f.path)), 'never in the pack');
  play(s, 'pull');
  assert.equal(Object.keys(s.journals).length, 1, 'a vault gives one, once');
});

test('the Ledger: one Journals entry, n of 51, counted in the total; the timeline, the writers, the reading view; the card', () => {
  const s = me(), before = logTotals(logOf(s));
  const jr = logOf(s).find((g) => g.id === 'journal');
  assert.equal(jr.rows.length, 1);
  assert.equal(jr.rows[0].total, 51);
  const maud = JOURNALS.find((e) => e.writer === 'Maud Ilic');
  findJournal(s, maud.id, clock);
  const after = logTotals(logOf(s));
  assert.equal(after.have, before.have + 1);
  assert.equal(after.total, before.total);
  assert.equal(logOf(s).find((g) => g.id === 'journal').rows[0].have, 1);
  const page = collectionPageMarkup(s, 'journal:journals');
  assert.match(page, /CASCADE 02:14 · 10 NOV 2061/);
  assert.equal((page.match(/class="jr-chip/g) || []).length, 51, 'a chip an entry');
  assert.match(page, />MI</, 'a found chip shows the initials');
  assert.match(page, /Maud Ilic, 27 October 2061: Journal entry, C−1\. Found on 8 Bedrock, /);
  assert.match(page, /\?\?\?: Journal entry, C\+19\.\n▸ Open vaults on Backhaul\./);
  const open = journalLedgerMarkup(s, { writer: 'Maud Ilic' });
  assert.match(open, /class="jr-lines"/);
  assert.match(open, /jr-chip fade/, "the others' chips fade");
  const read = journalLedgerMarkup(s, { read: maud.id });
  assert.match(read, /‹ Writers/);
  assert.match(read, /jr-chip got lit/);
  assert.match(read, /Found on 8 Bedrock/);
  assert.match(read, new RegExp(maud.text[0].slice(0, 30)));
  const card = journalCardMarkup(s);
  assert.match(card, /Journal · <span class="pz-at">1\/51<\/span>/);
  assert.match(card, /data-jr-done/);
  assert.match(card, /Ledger ›/);
});

// The ping log (pings.mjs): what goes in, its order, a plain line fading and a page staying, and how a line reads.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh } from './dist/combat.mjs';
import { logComms, commsOf, markDone } from './dist/comms.mjs';
import { PINGS, pingsOf, pingsMarkup, lineOf, sticks } from './dist/pings.mjs';

const T = 1e12;
const line = (s, type, message, detail = {}, at = T) => logComms(s, [{ type, message, ...detail }], at)[0];
// A save with a letter, a contract ready, and news.
function world() {
  const s = fresh();
  s.mail = { list: [{ id: 1, read: false }], offers: [{ id: 7 }], jobs: [{ id: 8, type: 'kill', count: 3, got: 3, reward: {} }] };
  return s;
}

test('newest at the bottom; a plain line fades after 30 s, a page stays until it is dealt with', () => {
  const s = world();
  const letter = line(s, 'mail', 'New mail from wick · LOWLIGHT: hi.', { letter: 1, from: 'wick · LOWLIGHT', subject: 'hi' }, T);
  const pay = line(s, 'retainer', 'Halcyon retainer: +38 credits.', {}, T + 1000);
  const offer = line(s, 'board', 'New offer on the board: a job.', { offer: 7 }, T + 2000);
  assert.deepEqual(pingsOf(s, T + 3000).map((c) => c.id), [letter.id, pay.id, offer.id], 'oldest at the top');
  assert.ok(sticks(letter) && !sticks(pay) && !sticks(offer), 'a letter stays; pay and an offer only ping');
  assert.deepEqual(pingsOf(s, T + PINGS.fadeMs + 2001).map((c) => c.id), [letter.id], 'the plain lines faded; the letter waits');
  s.mail.list[0].read = true;
  assert.deepEqual(pingsOf(s, T + PINGS.fadeMs + 2001), [], 'read in Mail: dealt with');
});

test('a threat and a contract to turn in stay; handling one takes it off at once', () => {
  const s = world();
  const ready = line(s, 'contract-ready', 'Contract ready: a job. Deliver it from Mail.', { contract: 8 });
  const breach = line(s, 'wall-breach', 'cryptjack BREACHED your wall.', {}, T + 1);
  s.invasion = { id: 2, name: 'cryptjack', state: 'breach' };
  const later = T + 10 * 60000;
  assert.deepEqual(pingsOf(s, later).map((c) => c.id), [ready.id, breach.id]);
  s.mail.jobs[0].done = true;
  assert.deepEqual(pingsOf(s, later).map((c) => c.id), [breach.id], 'delivered');
  const news = line(s, 'store', 'x', {}, later);
  markDone(s, news.id);
  assert.ok(!pingsOf(s, later).includes(news), 'a line you clicked through goes');
  delete s.invasion;
  assert.deepEqual(pingsOf(s, later), [], 'the threat is over');
});

test('at most five: the pages that stay are kept, the oldest plain lines give way', () => {
  const s = world();
  line(s, 'wall-breach', 'cryptjack BREACHED your wall.');
  s.invasion = { id: 2, name: 'cryptjack', state: 'breach' };
  const types = ['retainer', 'store', 'standing-up', 'hot-strain', 'transfer-in', 'harvest'];
  types.forEach((type, i) => line(s, type, `Line ${i}.`, { location: 'x' }, T + 100 + i));
  const p = pingsOf(s, T + 1000);
  assert.equal(p.length, PINGS.max);
  assert.equal(p[0].label, 'Breach', 'the threat stays, oldest at the top');
  assert.deepEqual(p.slice(1).map((c) => c.text), ['Line 2.', 'Line 3.', 'Line 4.', 'Line 5.'], 'the newest four plain lines');
  assert.deepEqual(pingsOf(s, T + 1000, { only: (c) => c.kind === 'alert' }).map((c) => c.label), ['Breach'], 'a fight shows only threats');
});

test('a line: one short sentence, names bold, yours teal, a threat red; older lines fade in steps', () => {
  const s = world();
  const letter = line(s, 'mail', 'New mail from wick · LOWLIGHT: hi.', { letter: 1, from: 'wick · LOWLIGHT', subject: 'hi' });
  assert.equal(lineOf(s, letter), 'Letter from <b>wick</b>.');
  const inv = line(s, 'wall-siege', 'Invasion at your wall: GHOSTROOT, contested. −0.9% Integrity a minute. Bounty 14 Worm code.');
  assert.equal(lineOf(s, inv), 'Invasion at <span class="you">your wall</span>: <b>GHOSTROOT</b>, contested.');
  assert.equal(lineOf(s, line(s, 'retainer', 'Halcyon retainer: +38 credits.')), 'Retainer: +38 credits.', 'a line says whose it is');
  assert.equal(lineOf(s, line(s, 'invasion-cleared', 'Your wall stopped <b>lapsejack-2231</b> at the gate.', { blocked: true })), '<span class="you">Your wall</span> stopped &lt;b&gt;<b>lapsejack-2231</b>&lt;/b&gt; at the gate.', 'escaped first');
  s.invasion = { id: 2, name: 'GHOSTROOT', state: 'siege' };
  const html = pingsMarkup(s, T + 1000);
  assert.deepEqual([...html.matchAll(/style="--o:([\d.]+)"/g)].map((m) => m[1]), ['0.35', '0.55', '0.8', '1'], 'the newest is full, the older fade in steps');
  assert.match(html, /class="ping threat stays[^"]*"[^>]*><button type="button" class="pi-in" data-ping="\d+" title="GHOSTROOT: Invasion at your wall: [^"]*\n▸ Jack in" data-tt-kind="Invasion · Wall"/, 'a threat: red, it stays; its tooltip is a name, its kind, the line, the answer');
  assert.match(html, /data-t="\d+"><button/, 'a plain line carries when it came in, for its fade');
});

test('the log keeps the rules: no teal but yours, nothing moves', () => {
  const css = readFileSync(new URL('./dist/pings.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.deepEqual(css.match(/var\(--you\)/g), ['var(--you)'], 'teal only for what is yours');
  assert.doesNotMatch(css, /transform|translate|rotate|scale/, 'it fades; nothing moves');
  assert.doesNotMatch(css, /border:\s*1px|background:\s*[^n\s]/, 'frameless');
});

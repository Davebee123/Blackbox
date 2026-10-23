// The trial pagers (pager.mjs, pager-view.mjs): which lines are pages, what one tap does, the order and the counts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { benchCommand } from './dist/bench.mjs';
import { logComms, commsOf, seeAll, markDone } from './dist/comms.mjs';
import { MAIL, offers, jobs } from './dist/mail.mjs';
import * as PG from './dist/pager.mjs';
import * as PGV from './dist/pager-view.mjs';

// A level 12 character with a realistic pager: developer pager fill (a letter, an offer, a ready contract, a courier, a
// bounty, and six lines of news), run the way the game runs it.
function filled() {
  const s = fresh();
  benchCommand(s, 'bench demolitionist 12', { bench: 'pager-test' });
  logComms(s, play(s, 'developer pager fill'));
  return s;
}
const line = (s, type, message, detail = {}) => logComms(s, [{ type, message, ...detail }])[0];

test('pages are the lines you can act on; news only tells you something', () => {
  const s = fresh();
  const pages = [
    line(s, 'mail', 'New mail from wick: hi.', { letter: 1, from: 'wick', subject: 'hi' }),
    line(s, 'board', 'New offer on the board: a job.', { offer: 7 }),
    line(s, 'contract-ready', 'Contract ready: a job. Deliver it from Mail.', { contract: 7 }),
    line(s, 'world-event', 'A courier crosses X.', { card: 'courier', event: 3, location: 'x' }),
    line(s, 'thread-start', 'THREAD: a thread.', { thread: 't1' }),
    line(s, 'consortium-invite', 'dana invites you. consortium accept, or consortium decline.'),
  ];
  const threats = [
    line(s, 'wall-breach', 'cryptjack BREACHED your wall.'),
    line(s, 'invader', 'Invasion: lapsejack left X. At your wall in 4 min.', { invader: 1 }),
    line(s, 'hub-siege', 'A swarm reaches the Kestrel hub.', { faction: 'kestrel' }),
  ];
  const news = [
    line(s, 'retainer', 'Halcyon retainer: +38 credits.'),
    line(s, 'store', 'x'),
    line(s, 'standing-up', 'Halcyon standing +5.'),
    line(s, 'hot-strain', 'Keylogger is running hot.'),
    line(s, 'invasion-cleared', 'Your wall stopped it.', { blocked: true }),
    line(s, 'invader', 'lapsejack left X. Your wall will stop it.', { quiet: true }),
    line(s, 'located', 'Located: ORIN-CACHE-57.', { location: 'x' }),
    line(s, 'harvest', 'Your outpost harvested 3 Cipher.', { location: 'x' }),
    line(s, 'thread', 'A step on.', { thread: 't1' }),
    line(s, 'world-event', 'An outbreak of worms.', { card: 'outbreak', event: 4 }),
    line(s, 'achievement', 'Achievement: Uncrowned.', { achievements: ['uncrowned'] }),
  ];
  for (const c of pages) assert.equal(PG.classOf(c), 'page', c.label);
  for (const c of threats) assert.equal(PG.classOf(c), 'threat', c.label);
  for (const c of news) assert.equal(PG.classOf(c), 'news', `${c.label}: ${c.text}`);
});

test('the act runs the right thing: Deliver, Take, Intercept and Hunt are the real commands, a letter is Read', () => {
  const s = filled();
  const by = (kind) => PG.pages(s).find((c) => c.kind === kind);
  const ready = by('ready'), offer = by('offer'), letter = by('mail');
  assert.deepEqual(PG.actOf(s, ready), { label: 'Deliver', cmd: `mail deliver ${ready.ref}` });
  assert.deepEqual(PG.actOf(s, offer), { label: 'Take', cmd: `mail accept ${offer.ref}` });
  assert.deepEqual(PG.actOf(s, letter), { label: 'Read', go: letter.go });
  const courier = PG.pages(s).find((c) => c.card === 'courier'), bounty = PG.pages(s).find((c) => c.card === 'bounty');
  assert.deepEqual(PG.actOf(s, courier), { label: 'Intercept', cmd: `event fight ${courier.event}` });
  assert.equal(PG.actOf(s, bounty).label, 'Hunt');
  for (const c of PG.news(s)) assert.equal(PG.actOf(s, c), null, `${c.label} is news: no act`);
  // Running them does it: the contract delivered, the offer taken, the courier engaged.
  play(s, PG.actOf(s, ready).cmd);
  assert.ok(jobs(s).find((j) => j.id === ready.ref).done, 'delivered');
  assert.ok(!PG.pages(s).includes(ready), 'and its page is gone');
  play(s, PG.actOf(s, offer).cmd);
  assert.ok(!offers(s).some((o) => o.id === offer.ref) && jobs(s).some((j) => j.id === offer.ref), 'taken');
  play(s, PG.actOf(s, courier).cmd);
  assert.equal(s.encounter?.phase, 'active', 'the courier is engaged');
  assert.ok(!PG.pages(s).includes(courier), 'the page you are fighting is in hand, not waiting');
  assert.deepEqual(PG.actOf(s, bounty), { label: 'Show', go: bounty.go }, 'mid-fight, a fight page shows you where it is');
});

test('acts follow the game: a full hand reads the offer, a contract not done opens it, the wall says what it can', () => {
  const s = filled();
  const offer = PG.pages(s).find((c) => c.kind === 'offer');
  s.mail.jobs.push(...Array.from({ length: MAIL.take }, (_, i) => ({ id: 900 + i, type: 'kill', count: 3, got: 0, reward: {} })));
  assert.equal(PG.actOf(s, offer).go, offer.go, 'no room for another contract: read it in Mail');
  const ready = PG.pages(s).find((c) => c.kind === 'ready');
  jobs(s).find((j) => j.id === ready.ref).got = 0;
  assert.equal(PG.actOf(s, ready).go, ready.go, 'not done after all: open it');
  const t = fresh();
  const inv = line(t, 'invader', 'Invasion: lapsejack left X.', { invader: 1 });
  t.invasion = { id: 1, name: 'lapsejack', state: 'travel', kind: 'raider' };
  assert.deepEqual(PG.actOf(t, inv), { label: 'Show', go: 'map:invader' }, 'on its way: where it is');
  t.invasion.kind = 'thief';
  assert.deepEqual(PG.actOf(t, inv), { label: 'Intercept', cmd: 'intercept' }, 'a thief can be caught on the way');
  t.invasion.state = 'siege';
  assert.deepEqual(PG.actOf(t, inv), { label: 'Jack in', cmd: 'jack in' }, 'at the wall: jack in');
  const hub = line(t, 'hub-siege', 'A swarm reaches the Kestrel hub.', { faction: 'kestrel' });
  assert.deepEqual(PG.actOf(t, hub), { label: 'Defend', cmd: 'hub defend kestrel' });
});

test('the count is the pages; the order is threat, clock, pay, the rest, letters, offers', () => {
  const s = filled();
  const p = PG.pages(s);
  assert.equal(p.length, 5, 'a letter, an offer, a ready contract, a courier, a bounty');
  assert.ok(PG.news(s).length >= 5, 'and the news under them');
  assert.deepEqual(p.map((c) => c.kind === 'net' ? c.card : c.kind), ['courier', 'bounty', 'ready', 'mail', 'offer'], 'the courier has less time left than the bounty');
  assert.deepEqual(PG.lampOf(s), { on: true, blink: true, threat: false, n: 5 });
  seeAll(s);
  assert.deepEqual(PG.lampOf(s), { on: true, blink: false, threat: false, n: 5 }, 'looking stops the blink, not the count');
  line(s, 'wall-breach', 'cryptjack BREACHED your wall.');
  s.invasion = { id: 2, name: 'cryptjack', state: 'breach' };
  assert.equal(PG.pages(s)[0].label, 'Breach', 'a threat goes first');
  assert.deepEqual(PG.lampOf(s), { on: true, blink: true, threat: true, n: 6 });
  line(s, 'wall-siege', 'Your wall now contests cryptjack.');
  assert.equal(PG.pages(s).filter((c) => c.from === 'Wall').length, 1, 'one invasion at your wall is one page');
  assert.equal(PG.pages(s)[0].label, 'Invasion', 'the newest line says where it is now');
  for (const c of commsOf(s).filter((x) => x.from === 'Wall')) markDone(s, c.id);
  assert.equal(PG.lampOf(s).n, 5, 'handled: off the count');
  const letter = PG.pages(s).find((c) => c.kind === 'mail');
  s.mail.list.find((m) => `mail:l${m.id}` === letter.go).read = true;
  assert.ok(!PG.pages(s).includes(letter), 'a letter read in Mail is off the pager too');
  PG.clearNews(s);
  assert.ok(PG.pages(s).length === 4 && commsOf(s).every((c) => PG.pages(s).includes(c) || !c.seen), 'Clear takes the seen news and leaves the pages');
  play(s, 'developer pager clear');
  assert.deepEqual(PG.lampOf(s), { on: false, blink: false, threat: false, n: 0 });
});

test('the style: classic by default, ?pager= or the setting picks a direction', () => {
  const s = fresh();
  assert.equal(PG.pagerStyle(s), 'classic');
  assert.equal(PG.pagerStyle(s, 'b'), 'device');
  s.settings.pager = 'tray';
  assert.equal(PG.pagerStyle(s), 'tray');
  assert.equal(PG.pagerStyle(s, 'a'), 'action', 'the address wins');
  assert.equal(PG.pagerStyle(s, 'nonsense'), 'tray');
  assert.deepEqual(['a', 'b', 'c', 'classic'].map(PG.styleName), ['action', 'device', 'tray', 'classic']);
});

test('the three pagers draw the pages: A the top one and its button, B a page at a time, C an icon each', () => {
  const s = filled(), p = PG.pages(s);
  const a = PGV.actionMarkup(s);
  assert.match(a, new RegExp(`class="pg-act" data-pact="${p[0].id}"[^>]*>Intercept<`));
  assert.equal((a.match(/data-pact=/g) || []).length, 1, 'one button: the most urgent page');
  const b = PGV.deviceMarkup(s, p[2].id);
  assert.match(b, /<i>3\/5<\/i>/, 'the page count beside the next key');
  assert.match(b, new RegExp(`data-pact="${p[2].id}"[^>]*aria-label="Deliver"`), 'the act key does what line 2 says');
  assert.match(PGV.deviceMarkup(s, 999), /<i>1\/5<\/i>/, 'a page gone: back to the most urgent');
  const c = PGV.trayMarkup(s, 4);
  assert.equal((c.match(/class="pgc-tile/g) || []).length, 3, 'three icons and +2');
  assert.match(c, />\+2</);
  assert.equal((PGV.trayMarkup(s, 6).match(/class="pgc-tile/g) || []).length, 5);
  for (const html of [a, PGV.deviceMarkup(s), c]) assert.match(html, /title="Courier: [^"]+\n▸ Intercept"/, 'the tooltip is the line and its ▸ act');
  const inbox = PGV.inboxMarkup(s);
  assert.equal((inbox.match(/class="pgi[ "]/g) || []).length, 5, 'Comms lists the pages');
  assert.match(inbox, /<details class="pg-hist"><summary>News <b>\d+<\/b>/, 'and folds the news under them');
  const empty = fresh();
  assert.doesNotMatch(PGV.actionMarkup(empty) + PGV.deviceMarkup(empty) + PGV.trayMarkup(empty), /data-pact/, 'nothing to do: nothing to press');
});

test('the trial pagers keep the rules: no teal, nothing moves, no new sound', () => {
  const css = readFileSync(new URL('./dist/pager.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /--you|#7fd1c7/, 'teal is only ever you');
  assert.doesNotMatch(css.replace(/text-transform/g, ''), /transform|translate|rotate|@keyframes/, 'nothing moves (the lamp reuses the classic blink)');
  const app = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.match(app, /feel\.add\('pager', pgStyle\(\) === 'classic' \? '#pager' : '#pg'/, 'the pager beep is the classic one');
});

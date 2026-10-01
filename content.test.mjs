import test from 'node:test';
import assert from 'node:assert/strict';
import STORY from './dist/content/story.mjs';
import CONTRACTS from './dist/content/contracts.mjs';
import { check, fill } from './dist/content.mjs';

test('the written content has no mistakes the game can’t use', () => {
  const bad = check(STORY, CONTRACTS).filter((x) => x.bad);
  assert.deepEqual(bad.map((x) => `${x.where}: ${x.msg}`), []);
});

test('blanks fill in; unknown ones stay visible', () => {
  assert.equal(fill('Kill {count} {family}. {nope}', { count: 3, family: 'worm' }), 'Kill 3 worm. {nope}');
});

test('the checker catches unknown blanks, senders, ids and empty variants', () => {
  const story = { contacts: { wick: 'wick' }, beats: [
    { id: 'a', from: 'wick', subject: 'hi {handle}', body: ['kill {count} {server}'], job: { type: 'kill', count: 2 } },
    { id: 'a', from: 'nobody', subject: '', body: [''] },
  ] };
  const msgs = check(story, { kill: { halcyon: [] } }).map((x) => x.msg).join('\n');
  assert.match(msgs, /\{server\} isn't a blank/);
  assert.match(msgs, /Two beats share the id/);
  assert.match(msgs, /Unknown sender "nobody"/);
  assert.match(msgs, /No variants/);
  assert.doesNotMatch(msgs, /\{(handle|count)\} isn't/);
});

test('story triggers: a level gate waits, a letter with no job leads straight on, a delay holds', async () => {
  const { fresh, command, hooks } = await import('./dist/combat.mjs');
  const mail = await import('./dist/mail.mjs');
  const beats = STORY.beats;
  const saved = beats.splice(0, beats.length,
    { id: 'one', from: 'wick', subject: 'one', body: ['hello {handle}'] },
    { id: 'two', from: 'wick', subject: 'two', body: ['x'], when: { delay: 5 } },
    { id: 'three', from: 'wick', subject: 'three', body: ['x'], when: { level: 4 }, opensBoard: true });
  try {
    let t = 1_000_000; hooks.now = () => t;
    const s = fresh(); s.mail = null; s.profile = { handle: 'dave' };
    mail.initMail(s, t);
    assert.equal(s.mail.list[0].body[0], 'hello dave');
    mail.tickMail(s, t + 60000);
    assert.equal(s.mail.list.length, 1, 'the delay holds the next one');
    mail.tickMail(s, t + 6 * 60000);
    assert.equal(s.mail.list[0].subject, 'two');
    mail.tickMail(s, t + 7 * 60000);
    assert.equal(s.mail.list[0].subject, 'two', 'level 4 not reached');
    assert.equal(mail.boardOpen(s), false);
    s.hackers = { breaker: { level: 4, xp: 0 } };
    mail.tickMail(s, t + 8 * 60000);
    assert.equal(s.mail.list[0].subject, 'three');
    assert.ok(mail.boardOpen(s), 'its beat opened the board');
  } finally { beats.splice(0, beats.length, ...saved); delete (await import('./dist/combat.mjs')).hooks.now; }
});

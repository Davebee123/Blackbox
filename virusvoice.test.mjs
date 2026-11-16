// Virus attack sounds in a fight (dist/virusvoice.mjs): which events play which attack's sound, one sound an attack a
// batch, and the numbers waiting for the strike to land.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { voiceOf, voices, todayOf, themeOf, OTHERS, MAX, SHIFT_CAP } from './dist/virusvoice.mjs';
import { STRIKE_PLAN } from './dist/chipfx.mjs';
import { OWN_PLAN, hasAttack, PICKED } from './dist/virussound.mjs';

const PARTS = {
  pulse: { name: 'Pulse Node' }, rig: { name: 'Rig' }, enc: { name: 'Encryptor' }, mirror: { name: 'Mirror' }, rep: { name: 'Replicator' }, scr: { name: 'Scrambler' },
  sentry: { name: 'Sentry' }, relay: { name: 'Relay', broadcast: true }, brood: { name: 'Brood' }, f1: { name: 'Fragment 1' }, f2: { name: 'Fragment 2' }, f3: { name: 'Fragment 3' },
};
const ctx = (more = {}) => ({ partOf: (id) => PARTS[id], max: 100, lashing: true, chipNow: () => true, ...more });
let id = 0;
const ev = (type, x = {}) => ({ id: ++id, type, ...x });

test('each event finds its attack: a theme\'s strike, the lash for a part with none, and what isn\'t a hit on you', () => {
  const v = (type, x) => voiceOf(ev(type, x), ctx());
  assert.deepEqual(v('server-hit', { source: 'pulse', amount: 8 }), { key: 'surge', result: 'hit', power: 0.4, kind: 'hit' });
  assert.equal(v('server-hit', { source: 'rig', amount: 30, crit: true }).result, 'crit');
  assert.deepEqual([v('server-hit', { source: 'rig', amount: 30, crit: true, tell: 't1' }).result, v('server-hit', { source: 'rig', amount: 30 }).power], ['charge', 1]);
  assert.deepEqual([v('server-hit', { source: 'sentry', amount: 6 }).key, v('server-hit', { source: 'relay', amount: 6 }).result, v('server-hit', { source: 'f2', amount: 2 }).key], ['lash', 'beat', 'byte']);
  assert.equal(voiceOf(ev('server-hit', { source: 'rig', amount: 6 }), ctx({ packed: () => true })).key, 'lash', 'a packed part lashes');
  assert.deepEqual([v('evaded', { source: 'rig' }).result, v('blocked', { source: 'rig' }).result], ['evaded', 'blocked']);
  assert.deepEqual([v('encrypt', { source: 'enc', amount: 3 }).key, v('blind', { source: 'scr' }).key, v('spawn', { source: 'rep', target: 'f1' }).key], ['encrypt', 'blind', 'replicate']);
  assert.deepEqual([v('patch', { target: 'rig' }).key, v('patch', { target: 'rig', tell: 't' }).key, v('heal', { target: 'rig' }).key, v('phase', { target: 'rig', tell: 't' }).key], ['patch', 'seal', 'patch', 'cast']);
  // What keeps today's voice: a crewmate's, a tick with no part, a shield's soak, a tell called off, an act break, your own heal.
  for (const e of [ev('server-hit', { source: 'rig', amount: 5, who: 'ada' }), ev('server-hit', { amount: 5, dot: true }), ev('blocked', { source: 'rig', shield: true }), ev('blocked', { source: 'rig', tell: 't', answered: true }), ev('phase', { act: 2 }), ev('phase', { enrage: true }), ev('heal', {}), ev('spawn', { target: 'rig', booted: true }), ev('damage', { target: 'rig' })]) assert.equal(voiceOf(e, ctx()), null, e.type);
  for (const k of ['surge', 'hash', 'lash', 'byte', 'encrypt', 'blind', 'replicate', 'patch', 'seal', 'cast']) assert.ok(hasAttack(PICKED, k), `${k} has a sound in the pick`);
  assert.deepEqual([themeOf(PARTS.rig), themeOf(PARTS.sentry), themeOf(PARTS.rig, () => true), themeOf(null)], ['heat', null, null, null]);
  assert.deepEqual([todayOf({ type: 'server-hit', crit: true }), todayOf({ type: 'server-hit' }), todayOf({ type: 'evaded' }), todayOf({ type: 'phase' }), todayOf({ type: 'spawn' })], ['hurtcrit', 'hurt', 'evade', 'hurt', null]);
});

test('the numbers wait for the slowest strike: everything from the virus\'s first strike on moves by the same', () => {
  const mine = ev('damage', { target: 'rig', amount: 9 }), a = ev('server-hit', { source: 'pulse', amount: 5 }), b = ev('server-hit', { source: 'mirror', amount: 5 }), c = ev('status', { mark: 'corrupt' });
  const at = new Map([[mine, 0], [a, 300], [b, 600], [c, 600]]);
  const V = voices([mine, a, b, c], ctx({ delay: (e) => at.get(e), lashTravel: 140 }));
  // The Mirror's copies take 965 ms; its number was due at 600 + 140.
  assert.equal(V.shift, STRIKE_PLAN.copy.impact - 740);
  assert.deepEqual([V.delay(mine), V.delay(a), V.delay(b), V.delay(c)], [0, 300 + V.shift, 600 + V.shift, 600 + V.shift]);
  assert.deepEqual(V.list.map((x) => [x.key, x.mode, x.land]), [['surge', 'chip', 300 + V.shift + 140], ['copy', 'chip', STRIKE_PLAN.copy.impact]]);
  for (const x of V.list) assert.ok(x.land >= x.plan.impact, `${x.key} can get there`);
  // Numbers already late enough don't move; nor without a strike to wait for (Motion off, Screen effects off, no chip).
  assert.equal(voices([a], ctx({ delay: () => 2000 })).shift, 0);
  assert.equal(voices([a, b], ctx({ delay: () => 0, lashing: false })).shift, 0);
  assert.equal(voices([a, b], ctx({ delay: () => 0, chipNow: () => false })).shift, 0);
  assert.ok(SHIFT_CAP >= STRIKE_PLAN.copy.impact);
});

test('how each is timed: by its chip\'s strike, by the lash, or on its beat', () => {
  const mode = (e, more) => voices([e], ctx({ delay: () => 500, ...more })).list[0];
  assert.deepEqual([mode(ev('server-hit', { source: 'rig', amount: 5 })).mode, mode(ev('server-hit', { source: 'sentry', amount: 5 })).mode], ['chip', 'lash']);
  assert.equal(mode(ev('server-hit', { source: 'sentry', amount: 5 })).plan, OWN_PLAN.lash);
  assert.equal(mode(ev('server-hit', { source: 'rig', amount: 5 }), { lashing: false }).mode, 'beat');
  assert.equal(mode(ev('server-hit', { source: 'rig', amount: 5 }), { chipNow: () => false }).mode, 'beat');
  assert.equal(mode(ev('server-hit', { source: 'rig', amount: 5, bounce: true })).mode, 'beat', 'what bounces back has no chip');
  // What isn't a hit rides its own strike only: the Encryptor's locks, the Scrambler's glyphs, the Replicator's copies.
  assert.deepEqual([mode(ev('encrypt', { source: 'enc' })).mode, mode(ev('blind', { source: 'scr' })).mode, mode(ev('spawn', { source: 'rep', target: 'f1' })).mode], ['chip', 'chip', 'chip']);
  assert.deepEqual([mode(ev('blind', { source: 'rig' })).mode, mode(ev('spawn', { source: 'brood', target: 'f1' })).mode, mode(ev('patch', { target: 'rig' })).mode], ['beat', 'beat', 'beat']);
  assert.equal(mode(ev('spawn', { source: 'brood', target: 'f1' })).plan, STRIKE_PLAN.copy);
  // A part's second event in a batch has no chip left to go off.
  const two = voices([ev('server-hit', { source: 'rig', amount: 5 }), ev('server-hit', { source: 'rig', amount: 3 })], ctx()).list;
  assert.deepEqual(two.map((x) => x.mode), ['chip', 'beat']);
});

test('one sound an attack a batch: the biggest hit leads, each other attack follows quietly, the rest stay quiet', () => {
  const es = [ev('server-hit', { source: 'pulse', amount: 4 }), ev('server-hit', { source: 'rig', amount: 12 }), ev('server-hit', { source: 'f1', amount: 2 }), ev('server-hit', { source: 'f2', amount: 2 }), ev('server-hit', { source: 'f3', amount: 2 }), ev('server-hit', { source: 'sentry', amount: 3 })];
  const V = voices(es, ctx());
  assert.deepEqual(V.list.map((x) => [x.key, x.gain]), [['surge', OTHERS], ['hash', 1], ['byte', OTHERS], ['byte', 0], ['byte', 0], ['lash', OTHERS]]);
  assert.equal(V.voiced.size, es.length, 'every one of them loses the hurt');
  // A charge leads over a crit, a crit over a bigger plain hit.
  const lead = (...xs) => voices(xs, ctx()).list.find((x) => x.gain === 1).e;
  const crit = ev('server-hit', { source: 'pulse', amount: 3, crit: true }), big = ev('server-hit', { source: 'rig', amount: 40 }), charge = ev('server-hit', { source: 'mirror', amount: 9, tell: 't' });
  assert.equal(lead(big, crit), crit); assert.equal(lead(crit, charge, big), charge);
  // No more than MAX in all.
  const many = ['pulse', 'rig', 'mirror', 'sentry', 'f1', 'enc'].map((source) => ev(source === 'enc' ? 'encrypt' : 'server-hit', { source, amount: 5 }));
  assert.equal(voices(many, ctx()).list.filter((x) => x.gain > 0).length, MAX);
  // A hit that also scrambles you: the hit speaks for both. A Replicate beside a hit still boots.
  const both = voices([ev('server-hit', { source: 'rig', amount: 5 }), ev('blind', { source: 'rig' })], ctx()).list;
  assert.deepEqual(both.map((x) => x.gain), [1, 0]);
  // A blocked or evaded attack sounds as its chip goes off; a note beside a hit that landed keeps today's voice.
  const half = ev('blocked', { source: 'rig' }), hit = ev('server-hit', { source: 'rig', amount: 5 });
  assert.deepEqual(voices([half, hit], ctx()).list.map((x) => x.e), [hit]);
  assert.ok(!voices([half, hit], ctx()).voiced.has(half));
  assert.equal(voices([ev('evaded', { source: 'rig' })], ctx()).list[0].result, 'evaded');
  assert.equal(voices([ev('blocked', { source: 'rig' })], ctx({ chipNow: () => false })).list.length, 0);
  // Sound off: the timing still holds, and nothing loses its voice.
  const off = voices(es, ctx({ sound: false, delay: () => 0 }));
  assert.ok(off.shift > 0 && off.voiced.size === 0 && off.list.length === es.length);
});

test('a fight plays them: react() asks for the batch\'s voices, fire() holds a chip\'s strike for its number, and nothing else does', () => {
  const src = fs.readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
  assert.match(src, /const incoming = [^\n]*attackVoices\(events, /);
  assert.match(src, /feel\.mute\(voiced\.has\(e\) \|\| incoming\.voiced\.has\(e\)\)/);
  assert.match(src, /function fire\(b, spawned = \[\]\) \{[^]*?takeStrike\(/);
  assert.equal(src.match(/feel\.attack\(/g)?.length, 1, 'one place plays them: attackSound');
});

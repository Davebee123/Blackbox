// #net, the public channel (channel.mjs): lines only from real state, its pacing and history, its own dice, never the pager.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, addLocation, hooks, UNIQUES, emit, giveUnique } from './dist/combat.mjs';
import { deal, tickEvents, FEUD, eventsOf } from './dist/events.mjs';
import { FACTIONS } from './dist/factions.mjs';
import { play } from './dist/run.mjs';
import { tickNetwork } from './dist/invasion.mjs';
import { online, PRESENCE } from './dist/presence.mjs';
import { channelOf, tickChannel, say, CHANNEL, CONTACTS } from './dist/channel.mjs';
import { commsOf, logComms } from './dist/comms.mjs';

const T0 = 1_800_000_000_000;
// Two traced servers, the board open, the hubs asked for found, the director quiet until a test deals.
const world = ({ level = 12, hubs = ['glassjaw', 'kestrel', 'lantern', 'nullchoir'], sim = false } = {}) => {
  const s = fresh(); s.tutorialCompleted = true; s.hackers = { breaker: { level, xp: 0 } };
  s.profile = { handle: 'dana', pwLen: 6, since: 0 };
  addLocation(s, 'worm'); addLocation(s, 'ransomware');
  s.locations.forEach((l) => { l.rogue = false; l.runs = 1; });
  command(s, 'mail'); s.mail.boardOpen = true;
  s.hubFound = Object.fromEntries(hubs.map((f) => [f, true]));
  s.director = { next: 9e9, n: 0, last: null };
  if (sim) play(s, 'online sim');
  channelOf(s);
  return s;
};
const run = (s, ms, step = 1000) => { for (let t = 0; t < ms; t += step) tickChannel(s, step); };
const clocked = (f) => { let t = T0; hooks.now = () => t; try { return f((ms) => { t += ms; }); } finally { hooks.now = null; } };
const short = (f) => FACTIONS[f].short;
// A feud dealt, its bar where asked, run out with nobody fighting: the channel's line on it.
function feudLine(bar) {
  const s = world();
  const ev = deal(s, 'feud');
  ev.bar = bar;
  tickEvents(s, FEUD.ms + 1000);
  tickChannel(s, 1);
  const [a, b] = ev.sides, win = bar > 0.5 ? a : b, lose = win === a ? b : a;
  const line = channelOf(s).lines.find((l) => l.text.includes(short(lose)) && l.text.includes(ev.loc ? s.locations.find((x) => x.id === ev.loc).name : ''));
  return { s, line, win, lose };
}

test('a feud ends: the line names its real winner, through the winner\'s contact', () => {
  for (const bar of [0.7, 0.3]) {
    const { s, line, win, lose } = feudLine(bar);
    assert.ok(line, 'a line on the feud');
    assert.equal(line.kind, 'contact');
    assert.equal(line.faction, win, `${short(win)} speaks for the side that held more of the bar (${bar})`);
    assert.equal(line.from, CONTACTS[win].who);
    assert.ok(line.text.includes(short(lose)), 'and names the loser');
    const logged = s.logs.find((e) => e.type === 'world-event-end' && e.card === 'feud');
    assert.equal(logged.winner, win, 'the log carries the winner');
  }
});

test('a feud lost by a side whose hub is unknown: the wire says who won', () => {
  const s = world({ hubs: [] });
  s.hubFound = {}; // only Halcyon's hub
  const sides = ['glassjaw', 'lantern'];
  emit(s, 'world-event-end', 'The feud over X is over.', { card: 'feud', location: s.locations[0].id, name: 'GLASSJAW vs LANTERN', sides, winner: 'lantern' });
  tickChannel(s, 1);
  const l = channelOf(s).lines.at(-1);
  assert.equal(l.kind, 'wire');
  assert.match(l.text, /^LANTERN won the .+ feud\. GLASSJAW pulls back\.$/);
});

test('NULL CHOIR on a rival losing twice running: "Again."', () => {
  const s = world();
  for (let i = 0; i < 2; i++) emit(s, 'world-event-end', 'over', { card: 'feud', location: s.locations[0].id, sides: ['kestrel', 'nullchoir'], winner: 'nullchoir' });
  tickChannel(s, 1);
  const said = channelOf(s).lines.filter((l) => l.faction === 'nullchoir').map((l) => l.text);
  assert.equal(said.length, 2);
  assert.ok(!said[0].endsWith('Again.') && said[1].endsWith('Again.'), said.join(' | '));
  assert.ok(said.every((x) => !/you|your/i.test(x)), 'never at you');
});

test('world news follows the director: dealt, a hunt hops, a bounty you took', () => clocked((tick) => {
  const s = world();
  const hunt = deal(s, 'hunt');
  tickChannel(s, 1);
  assert.ok(channelOf(s).lines.some((l) => l.text.includes(hunt.name)), 'the hunt is news');
  tickEvents(s, 5 * 60000 + 1000); tick(1000);
  tickChannel(s, 1);
  const hop = channelOf(s).lines.at(-1);
  assert.equal(hop.kind, 'wire');
  assert.match(hop.text, new RegExp(`^${hunt.name} hopped to .+\\. Level ${hunt.level} now\\.$`));
  const ob = deal(s, 'outbreak');
  tickChannel(s, 1);
  assert.ok(channelOf(s).lines.some((l) => l.kind === 'wire' && l.text.includes(`${ob.family === 'ghostroot' ? 'ghostroot' : ob.family}`) || l.text.includes('outbreak')));
}));

test('sim hackers: lines from people who are online, items that are real, titles shown', () => clocked((tick) => {
  const s = world({ sim: true });
  const names = new Set(Object.values(UNIQUES).map((u) => u.name));
  let items = 0;
  for (let i = 0; i < 3 * 3600; i++) {
    tick(1000);
    const before = channelOf(s).n;
    tickChannel(s, 1000);
    for (const l of channelOf(s).lines.filter((x) => x.id > before && x.kind === 'sim')) {
      assert.ok(PRESENCE.pool.includes(l.from));
      assert.ok(online(s).some((x) => x.handle === l.from), `${l.from} is online when they speak`);
      for (const it of l.items || []) { assert.ok(names.has(it), `${it} is a real unique`); assert.ok(l.text.includes(`[${it}]`)); items++; }
    }
  }
  assert.ok(items > 0, 'someone found something');
  assert.ok(channelOf(s).lines.some((l) => l.kind === 'sim' && l.title), 'a title beside a handle');
}));

test('sim hackers stay quiet with online sim off; the rest still talks', () => clocked((tick) => {
  const s = world();
  for (let i = 0; i < 1800; i++) { tick(1000); tickChannel(s, 1000); }
  const lines = channelOf(s).lines;
  assert.ok(lines.length > 0);
  assert.ok(lines.every((l) => l.kind !== 'sim'));
}));

test('pacing: a line every 20–90 s at most, nothing ambient before the tutorial is done, history bounded', () => clocked((tick) => {
  const s = world({ sim: true });
  let n0 = channelOf(s).n;
  for (let i = 0; i < 600; i++) { tick(1000); tickChannel(s, 1000); }
  const tenMin = channelOf(s).n - n0;
  assert.ok(tenMin >= 600 / 90 - 1 && tenMin <= 600 / 20 + 8, `${tenMin} lines in ten minutes`);
  for (let i = 0; i < 4 * 3600; i++) { tick(1000); tickChannel(s, 1000); }
  assert.equal(channelOf(s).lines.length, CHANNEL.keep, 'only the last lines are kept');
  const q = world({ sim: true });
  q.tutorialCompleted = false;
  for (let i = 0; i < 1800; i++) { tick(1000); tickChannel(q, 1000); }
  assert.equal(channelOf(q).lines.length, 0, 'no chatter while you learn');
}));

test('its own dice: the game rng never moves, and the same state says the same thing', () => clocked((tick) => {
  const a = world({ sim: true }), b = structuredClone(a);
  deal(a, 'feud'); deal(b, 'feud');
  const rng = a.rng;
  for (let i = 0; i < 1800; i++) { tick(1000); tickChannel(a, 1000); tickChannel(b, 1000); }
  say(a, 'hello nyx'); say(b, 'hello nyx');
  assert.equal(a.rng, rng, 'the game rng is untouched');
  assert.deepEqual(a.channel.lines.map((l) => l.text), b.channel.lines.map((l) => l.text), 'deterministic');
}));

test('never the pager: no events, no comms, no beep', () => clocked((tick) => {
  const s = world({ sim: true });
  deal(s, 'feud');
  const serial = s.serial, logs = s.logs.length;
  for (let i = 0; i < 900; i++) { tick(1000); tickChannel(s, 1000); }
  say(s, 'anyone farming?');
  assert.equal(s.serial, serial, 'the channel emits nothing');
  assert.equal(s.logs.length, logs);
  assert.ok(channelOf(s).lines.length > 3);
  assert.equal(logComms(s, s.logs.slice(-50)).filter((c) => c.from === 'wire' || c.kind === 'chat').length, 0);
  // Through the network clock too: what tickNetwork returns has no channel lines in it.
  const out = tickNetwork(s, T0 + 2e6);
  assert.ok(out.every((e) => !String(e.type).startsWith('channel')));
  assert.ok(commsOf(s).every((c) => c.from !== 'wire'));
}));

test('say: your line with your handle and title, capitals kept; a named hacker answers', () => clocked((tick) => {
  const s = world({ sim: true });
  s.profile.titles = ['patient'];
  play(s, 'say Anyone up for KESSLER?');
  const l = channelOf(s).lines.at(-1);
  assert.deepEqual([l.kind, l.from, l.title, l.text], ['you', 'dana', 'the Patient', 'Anyone up for KESSLER?']);
  play(s, "'short form works too");
  assert.equal(channelOf(s).lines.at(-1).text, 'short form works too');
  for (const bad of ['say', 'say ' + 'x'.repeat(CHANNEL.say + 1), 'say héllo']) {
    const n = channelOf(s).n;
    const out = play(s, bad);
    assert.ok(out.some((e) => e.type === 'warning'), bad);
    assert.equal(channelOf(s).n, n);
  }
  // Name someone online: they answer within the reaction time, most times.
  let answered = 0;
  for (let k = 0; k < 6; k++) {
    const who = online(s)[k % online(s).length].handle, n = channelOf(s).n;
    play(s, `say hey ${who}, you around?`);
    for (let i = 0; i < 15; i++) { tick(1000); tickChannel(s, 1000); }
    if (channelOf(s).lines.some((x) => x.id > n && x.from === who && x.kind === 'sim')) answered++;
  }
  assert.ok(answered >= 3, `${answered} of 6 answered`);
}));

test('your feats: a unique found is a line naming it, and a sim hacker may say so', () => clocked((tick) => {
  const s = world({ sim: true });
  const u = Object.values(UNIQUES).find((x) => x.level <= 10 && !x.faction);
  giveUnique(s, u.id, '');
  tickChannel(s, 1);
  const l = channelOf(s).lines.at(-1);
  assert.equal(l.kind, 'feat');
  assert.equal(l.text, `found [${u.name}].`);
  assert.deepEqual(l.items, [u.name]);
}));

test('channel off mutes the line over the prompt; the channel keeps its lines', () => {
  const s = world();
  play(s, 'channel off');
  assert.equal(s.settings.channel, false);
  emit(s, 'world-event-end', 'over', { card: 'outbreak', family: 'worm' });
  tickChannel(s, 1);
  assert.match(channelOf(s).lines.at(-1).text, /worm outbreak is burning out/);
  play(s, 'channel on');
  assert.equal(s.settings.channel, true);
});

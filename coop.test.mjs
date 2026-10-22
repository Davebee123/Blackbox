// Co-op, peer to peer (docs/coop.md): the transports, the handshake, and (below) a shared fight, a shared run and the
// host swap, all with two saves in one process over an in-memory link.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from './dist/combat.mjs';
import { benchBuild } from './dist/bench.mjs';
import { memoryPair, broadcastHost, broadcastJoin, packCode, unpackCode, NET, roomCode } from './dist/coop-net.mjs';
import { characterOf, playerFrom } from './dist/coop-char.mjs';
import { hostSession, guestSession, COOP } from './dist/coop.mjs';

const bench = (as, level, handle) => { const s = fresh(); benchBuild(s, as, level); s.profile.handle = handle; return s; };
const clockAt = () => { const c = { t: 1_700_000_000_000 }; c.now = () => c.t; return c; };

test('memory link: messages arrive as copies, in order, never re-entrant', () => {
  const [a, b] = memoryPair();
  const got = [];
  b.onmessage = (m) => { got.push(m.n); if (m.n === 1) { b.send({ n: 'echo' }); a.send({ n: 3 }); got.push('after-send'); } };
  a.onmessage = (m) => got.push(m.n);
  const msg = { n: 1, deep: { x: 1 } };
  a.send(msg); a.send({ n: 2 });
  assert.deepEqual(got, [1, 'after-send', 'echo', 3, 2], 'a send inside a handler waits its turn (and goes before the caller\'s next)');
  let closed = 0;
  a.onclose = () => closed++; b.onclose = () => closed++;
  a.close(); a.close();
  assert.equal(closed, 2, 'both ends hear the close once');
  b.send({ n: 9 });
  assert.deepEqual(got.at(-1), 2, 'a closed link carries nothing');
});

test('invite codes: an SDP packs into a short pasteable code and back', async () => {
  const sdp = 'v=0\r\no=- 46117 2 IN IP4 127.0.0.1\r\n' + 'a=candidate:1 1 udp 2122260223 192.168.1.20 54321 typ host\r\n'.repeat(4);
  const code = await packCode(NET.prefix.offer, { sdp });
  assert.ok(code.startsWith('BBX1-z'), code.slice(0, 8));
  assert.ok(code.length < sdp.length, `deflated: ${code.length} < ${sdp.length}`);
  assert.match(code, /^[A-Za-z0-9_-]+$/, 'one word: no spaces, no padding');
  assert.deepEqual(await unpackCode(NET.prefix.offer, code), { sdp });
  await assert.rejects(unpackCode(NET.prefix.answer, code), /not a reply code/);
});

test('the character: a fight\'s worth of the save, nothing personal, and a player state rebuilt from it', () => {
  const g = bench('sysop', 12, 'moth');
  g.profile.email = 'someone@example.com'; // never on the wire, whatever the save holds
  const c = characterOf(g);
  assert.equal(c.name, 'moth'); assert.equal(c.cls, 'bastion'); assert.equal(c.level, 12);
  assert.ok(!JSON.stringify(c).includes('example.com'), 'no email');
  assert.deepEqual(Object.keys(c).sort(), ['cls', 'daemonLv', 'daemons', 'geneCodex', 'hackers', 'level', 'loadout', 'met', 'metAll', 'name', 'programs', 'research', 'rig', 'stash', 'v'].sort());
  assert.ok(!('locations' in c) && !('mail' in c) && !('server' in c), 'no world, no mail, no bank');
  assert.equal(c.stash.length, c.rig.filter(Boolean).length, 'only the protocols loaded for the class');
  const m = playerFrom(c);
  assert.equal(m.loadout.archetype, 'bastion');
  assert.equal(m.loadout.sub.bastion, 'sysop');
  assert.deepEqual(m.gear.rigs.bastion, c.rig);
  assert.ok(m.stash.every((it) => c.rig.includes(it.id)));
});

test('handshake: the guest says hello with its character; the host seats it under a name of its own; both hear pings', () => {
  const c = clockAt();
  const host = bench('breaker', 10, 'bench'), guest = bench('sysop', 10, 'bench'); // two benches: both "bench"
  const H = hostSession(host, { now: c.now });
  const [hl, gl] = memoryPair();
  H.add(hl);
  const G = guestSession(guest, gl, { now: c.now });
  assert.ok(G.joined, 'welcomed at once');
  assert.equal(G.host, 'bench');
  assert.equal(G.you, 'bench2', 'a name nobody else has here');
  assert.equal(G.hostChar.cls, 'breaker');
  assert.deepEqual(H.roster(), [{ name: 'bench2', cls: 'bastion', level: 10, lat: null }]);
  assert.match(H.notes.at(-1).message, /bench2 joins your party/);
  c.t += COOP.pingMs; H.tick(); G.tick();
  c.t += 35; // the pongs come back
  H.tick();
  assert.ok(H.roster()[0].lat != null && G.lat != null, 'latency both ways');
});

test('a full party, or another version, is refused', () => {
  const host = bench('breaker', 10, 'ana');
  const H = hostSession(host);
  const [a1, b1] = memoryPair(); H.add(a1); guestSession(bench('bastion', 10, 'bo'), b1);
  const [a2, b2] = memoryPair(); H.add(a2);
  const G2 = guestSession(bench('operator', 10, 'cy'), b2);
  assert.ok(!G2.joined && G2.closed);
  assert.match(G2.notes[0].message, /party is full/);
  assert.equal(H.roster().length, 1);
  const H2 = hostSession(host);
  const [a3, b3] = memoryPair(); H2.add(a3);
  b3.onmessage = (m) => { b3.last = m; };
  b3.send({ t: 'hello', v: 99, name: 'old', char: { cls: 'breaker' } });
  assert.match(b3.last.why, /different version/);
});

test('leave and drops: either side going ends it for the other, with a note', () => {
  const c = clockAt();
  const mk = () => { const H = hostSession(bench('breaker', 10, 'ana'), { now: c.now }); const [hl, gl] = memoryPair(); H.add(hl); const G = guestSession(bench('bastion', 10, 'bo'), gl, { now: c.now }); return { H, G }; };
  let { H, G } = mk();
  G.leave();
  assert.equal(H.roster().length, 0);
  assert.match(H.notes.at(-1).message, /bo leaves your party/);
  ({ H, G } = mk());
  H.leave();
  assert.ok(G.closed);
  assert.match(G.notes.at(-1).message, /ana ended the session\. You're home\./);
  ({ H, G } = mk());
  G.link.onmessage = () => {}; // the guest's game froze: nothing back
  c.t += COOP.dropMs + 1; H.tick();
  assert.match(H.notes.at(-1).message, /bo dropped/);
  ({ H, G } = mk());
  c.t += COOP.dropMs + 1; G.tick();
  assert.ok(G.closed);
  assert.match(G.notes.at(-1).message, /ana dropped\. You're home\./);
});

test('BroadcastChannel: two tabs find each other by a room code', async () => {
  const code = roomCode();
  assert.match(code, /^[a-z]{6}$/);
  const host = bench('breaker', 10, 'ana'), H = hostSession(host);
  const room = broadcastHost(code, (link) => H.add(link));
  const link = await broadcastJoin(code);
  const G = guestSession(bench('bastion', 10, 'bo'), link);
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(G.joined, 'welcomed over the channel');
  assert.equal(H.roster()[0].name, 'bo');
  G.leave();
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(H.roster().length, 0, 'the host hears the leave');
  room.close();
  await assert.rejects(broadcastJoin(roomCode(), { waitMs: 100 }), /Nobody is hosting/);
});

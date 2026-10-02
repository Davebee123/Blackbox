import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, hooks, active, resolveCycle } from './dist/combat.mjs';
import { play, crewWander, layoutOf, currentLocation } from './dist/run.mjs';
import { online, PRESENCE } from './dist/presence.mjs';
import { matesOf } from './dist/crew.mjs';
import * as consortiumMod from './dist/consortium.mjs';
import { dividendWaiting, dividendOf, rebooting, CONSORTIUM, memberServers, serversOf, sizeOf, tiersOf, tickConsortium, isGround, consortiumOf } from './dist/consortium.mjs';
import { bandwidth, OUTPOST } from './dist/outpost.mjs';
import { tickNetwork, ratioOf } from './dist/invasion.mjs';
import { rogueSpawns } from './dist/rogue.mjs';

const world = () => { const s = fresh(); s.hackers = { breaker: { level: 6, xp: 0 } }; play(s, 'online sim'); return s; };
const win = (s) => {
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  for (let i = 0; i < 6 && active(s); i++) { const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); }
};

test('a consortium: create, invite merges their server in, only the founder kicks, members can join the crew', () => {
  const s = world();
  play(s, 'consortium invite nyx');
  assert.ok(!consortiumOf(s), 'none yet');
  play(s, 'consortium create Lowlight Union');
  assert.equal(s.consortium.name, 'Lowlight Union', 'the name keeps its capitals');
  play(s, 'consortium invite nyx'); play(s, 'consortium invite rook'); play(s, 'consortium invite nobody');
  assert.deepEqual(s.consortium.members, ['nyx', 'rook']);
  assert.ok(serversOf(s, 'nyx').length >= 1 && serversOf(s, 'rook').length >= 1, 'each member brings their network');
  assert.ok(serversOf(s, 'nyx')[0].held, "a member's first server is an outpost");
  assert.deepEqual(memberServers(s).map((l) => l.id), memberServers(s).map((l) => l.id).filter((id, i, a) => a.indexOf(id) === i), 'ids are unique');
  play(s, 'consortium kick rook');
  assert.deepEqual(s.consortium.members, ['nyx']);
  assert.equal(serversOf(s, 'rook').length, 0, "rook's servers are gone with them");
  let t = 1_800_000_000_000;
  while (!online(s, t).some((x) => x.handle === 'nyx')) t += PRESENCE.moveMs;
  hooks.now = () => t;
  try {
    play(s, 'crew invite nyx');
    assert.equal(s.crewSim.at(-1).name, 'nyx', 'a member (not a friend) can join the crew');
  } finally { hooks.now = null; }
  play(s, 'consortium leave');
  assert.equal(consortiumOf(s), null);
  assert.equal(memberServers(s).length, 0, 'the trunk line is cut');
});

test('an old guild becomes a consortium', () => {
  const s = world();
  s.guild = { name: 'LOWLIGHT', members: ['nyx'], territory: [] };
  assert.equal(consortiumOf(s).name, 'LOWLIGHT');
  assert.equal(s.guild, undefined);
  assert.ok(serversOf(s, 'nyx').length);
});

test("an invite from someone else: accept merges you into their consortium, and you can't kick", () => {
  const s = world();
  hooks.now = () => 1_800_000_000_000;
  try {
    for (let i = 0; i < 40 && !s.consortiumInvite; i++) tickConsortium(s, 60000);
    const inv = s.consortiumInvite;
    assert.ok(inv, 'someone invites you');
    play(s, 'consortium accept');
    assert.equal(s.consortium.name, inv.name);
    assert.equal(s.consortium.founder, inv.from);
    assert.equal(sizeOf(s), inv.members.length + 1);
    play(s, 'consortium kick ' + inv.members[0]);
    assert.ok(s.consortium.members.includes(inv.members[0]), 'only the founder kicks');
  } finally { hooks.now = null; }
});

test("members' servers: connect; the vault doesn't make it yours; natives come back after a while", () => {
  const s = world();
  play(s, 'consortium create LOWLIGHT');
  play(s, 'consortium invite rook');
  const loc = serversOf(s, 'rook').find((l) => !l.rogue);
  play(s, 'connect ' + loc.id);
  assert.equal(currentLocation(s), loc);
  assert.ok(isGround(s, loc));
  play(s, 'unlock nothing x');
  loc.state.unlocked['/x'] = true; loc.state.cleared['/y'] = true;
  play(s, 'jack out');
  let t = Date.now() + CONSORTIUM.resetMs + 1000;
  hooks.now = () => t;
  try { play(s, 'connect ' + loc.id); } finally { hooks.now = null; }
  assert.deepEqual(loc.state.cleared, {}, 'the guards are back');
  assert.ok(!loc.takenOver);
});

test('a siege on a member outpost: defend it for a bounty; missing it costs you nothing', () => {
  const s = world();
  play(s, 'consortium create LOWLIGHT');
  play(s, 'consortium invite nyx');
  const loc = serversOf(s, 'nyx')[0];
  tickConsortium(s, CONSORTIUM.siegeEveryMs[1]);
  assert.ok(loc.held.siege, 'natives lay siege');
  const credits = s.server.credits;
  play(s, 'consortium defend ' + loc.id);
  assert.equal(s.encounter.member, loc.id);
  win(s);
  assert.equal(loc.held.siege, null);
  assert.equal(s.server.credits, credits + CONSORTIUM.bounty(loc.level).credits);
  tickConsortium(s, CONSORTIUM.siegeEveryMs[1]);
  const before = s.server.credits;
  tickConsortium(s, CONSORTIUM.siegeMs + 1);
  assert.equal(loc.held.siege, null, 'a member deals with it');
  assert.equal(s.server.credits, before);
});

test("the dividend: a share of what members' outposts produce, in kind, offline too, up to a cap; nothing while besieged", () => {
  const s = world();
  const t0 = 1_800_000_000_000;
  hooks.now = () => t0;
  try {
    play(s, 'consortium create LOWLIGHT');
    for (const h of ['nyx', 'ash', 'rook', 'byte']) play(s, 'consortium invite ' + h);
    const held = memberServers(s).filter((l) => l.held);
    assert.ok(held.length >= 3);
    const siphon = held.find((l) => l.held.kind !== 'scraper');
    assert.ok(Math.abs(dividendOf(s, siphon) - OUTPOST.kinds[siphon.held.kind].rate(siphon.level) * CONSORTIUM.dividend.share * 1.1) < 1e-9, 'a share of what it makes (+10%: Linked)');
    tickConsortium(s, 1000, t0 + 6 * 3600000); // six hours away
    const before = JSON.stringify(s.materials);
    const waiting = dividendWaiting(s);
    assert.ok(Object.keys(waiting.code).length, 'code waiting');
    play(s, 'consortium collect');
    assert.notEqual(JSON.stringify(s.materials), before, 'code collected');
    assert.ok(held.every((l) => (l.held.share || 0) < 1), 'whole units taken');
    tickConsortium(s, 1000, t0 + 200 * 3600000); // a long time away: it stops at the cap
    assert.ok((siphon.held.share || 0) <= dividendOf(s, siphon) * CONSORTIUM.dividend.capHours + 1e-9);
    siphon.held.siege = { left: CONSORTIUM.siegeMs, seed: 1 };
    assert.equal(dividendOf(s, siphon), 0, 'a besieged outpost pays nothing');
  } finally { hooks.now = null; }
});

test('size tiers: yield, doubled bounties, the trunk rogue server, bandwidth', () => {
  const s = world();
  play(s, 'consortium create LOWLIGHT');
  const bw = bandwidth(s);
  for (const h of PRESENCE.pool.slice(0, 11)) play(s, 'consortium invite ' + h);
  assert.equal(sizeOf(s), 12);
  assert.deepEqual(tiersOf(s).map((t) => t.at), [3, 5, 8, 12]);
  assert.equal(bandwidth(s), bw + 1);
  const trunk = memberServers(s).find((l) => l.trunk);
  assert.ok(trunk?.rogue, 'the trunk rogue server is up');
  play(s, 'connect trunk');
  assert.equal(s.run.loc, 'trunk');
  play(s, 'jack out');
  for (const h of PRESENCE.pool.slice(0, 6)) play(s, 'consortium kick ' + h);
  assert.ok(!memberServers(s).some((l) => l.trunk), 'too small again: it closes');
});

test("the consortium's ground is shared: members turn up in its folders and join fights there", () => {
  const s = world();
  play(s, 'consortium create LOWLIGHT');
  for (const h of PRESENCE.pool.slice(0, 10)) play(s, 'consortium invite ' + h);
  command(s, 'developer location ransomware');
  const mine = s.locations[0];
  assert.ok(!isGround(s, mine), 'a server you only traced is yours alone');
  mine.takenOver = true;
  assert.ok(isGround(s, mine), 'your outposts are shared ground');
  let t = 1_800_000_000_000, there = [];
  for (let i = 0; i < 400; i++, t += PRESENCE.moveMs) { there = online(s, t).filter((x) => x.place.kind === 'consortium' && x.place.loc === mine.id); if (there.length) break; }
  assert.ok(there.length, 'members come by');
  assert.ok(Object.keys(layoutOf(mine)).includes(there[0].place.folder));
  hooks.now = () => t;
  try {
    const g = there[0], room = g.place.folder;
    play(s, 'connect ' + mine.id);
    assert.ok(hooks.crewGuests(s, room).some((x) => x.name === g.handle), 'a member in that folder would join a fight there');
  } finally { hooks.now = null; }
});

test('the crew strip: linked crew follow you, split crew wander, link follows them, regroup brings them back; only the crew in the folder fights', () => {
  const s = world();
  play(s, 'crew sim bastion infiltrator');
  play(s, 'connect sprawl');
  assert.deepEqual(Object.values(s.run.crew).map((c) => c.cwd), ['/', '/']);
  play(s, 'cd net');
  assert.deepEqual(Object.values(s.run.crew).map((c) => c.cwd), ['/net', '/net'], 'linked: they follow');
  play(s, 'split kilo');
  assert.equal(s.run.crew.kilo.link, null);
  play(s, 'cd ..');
  assert.equal(s.run.crew.kilo.cwd, '/net', 'split: kilo stays');
  assert.equal(s.run.crew.nyx.cwd, '/');
  for (let i = 0; i < 20; i++) crewWander(s);
  play(s, 'link kilo');
  assert.equal(s.run.linkedTo, 'kilo');
  assert.equal(s.run.cwd, s.run.crew.kilo.cwd, 'linking takes you to them');
  play(s, 'regroup');
  assert.ok(Object.values(s.run.crew).every((c) => c.cwd === s.run.cwd && c.link === 'you'));
  // Kilo goes off; a fight here has only nyx.
  play(s, 'split kilo'); s.run.crew.kilo.cwd = '/srv';
  play(s, 'cd /'); play(s, 'cd tmp'); play(s, 'attack');
  assert.ok(active(s));
  const fighting = matesOf(s).filter((m) => m.encounter).map((m) => m.who);
  assert.deepEqual(fighting, ['nyx'], 'kilo is elsewhere');
});

// Helpers: always / never does a member step in.
const helping = (k, f) => { const was = CONSORTIUM.help; CONSORTIUM.help = k; try { f(); } finally { CONSORTIUM.help = was; } };
// Clear every folder of an occupied server you're on.
const clearOut = (s, loc) => {
  for (const room of Object.keys(rogueSpawns(s, loc))) {
    if (!loc.spawns[room].alive) continue;
    play(s, 'cd ' + room); play(s, 'attack'); win(s); play(s, 'cd /');
  }
};

test('away, in a consortium: a weak wall gets crashed; the server reboots for hours, occupied; clearing it brings it back', () => {
  helping(0, () => {
    const s = world();
    command(s, 'developer location ransomware');
    play(s, 'consortium create LOWLIGHT'); play(s, 'consortium invite nyx');
    const T0 = 1_800_000_000_000;
    tickNetwork(s, T0);
    s.server.integrity = 5;
    tickNetwork(s, T0 + 8 * 3600000); // eight hours away
    assert.ok(s.logs.some((e) => e.type === 'crashed' && /while you were away/.test(e.message)), 'crashed while away');
    assert.ok(s.occupation, 'occupied');
    // The reboot may already be over after eight hours; crash again to test clearing.
    if (!s.degraded) { s.degraded = { since: T0, until: T0 + 100 * 3600000, ms: 1 }; }
    s.occupation.lockUntil = 0;
    play(s, 'connect home');
    assert.equal(s.run?.loc, 'home');
    clearOut(s, s.occupation);
    assert.equal(s.degraded, null, 'cleared: back online');
  });
});

test('away, solo: nothing happens', () => {
  const s = world();
  command(s, 'developer location ransomware');
  const T0 = 1_800_000_000_000;
  tickNetwork(s, T0);
  s.server.integrity = 5;
  tickNetwork(s, T0 + 8 * 3600000);
  assert.equal(s.server.integrity, 5);
  assert.ok(!s.logs.some((e) => e.type === 'invader'));
});

test('away, a strong wall holds: invaders are stopped and nothing crashes', () => {
  helping(0, () => {
    const s = world();
    command(s, 'developer location ransomware');
    play(s, 'consortium create LOWLIGHT'); play(s, 'consortium invite nyx');
    s.services = { ...(s.services || {}), firewall: 3 };
    s.serverXp = 1e7; // a high-level server
    const T0 = 1_800_000_000_000;
    tickNetwork(s, T0);
    tickNetwork(s, T0 + 8 * 3600000);
    assert.ok(s.logs.filter((e) => e.type === 'invader').length >= 2, 'invaders came');
    assert.ok(!s.logs.some((e) => e.type === 'crashed'));
    assert.ok(s.logs.some((e) => e.type === 'invasion-cleared'), 'the wall stopped them');
  });
});

test("a raid on an away member's wall: defend it for a bounty, or their server crashes, occupied, and pays nothing meanwhile", () => {
  helping(0, () => {
    const s = world();
    play(s, 'consortium create LOWLIGHT'); play(s, 'consortium invite nyx');
    for (let i = 0; i < 40 && !s.consortium.raid; i++) tickConsortium(s, 60000);
    assert.equal(s.consortium.raid?.member, 'nyx');
    const credits = s.server.credits;
    play(s, 'consortium defend nyx');
    assert.ok(s.encounter?.raid);
    win(s);
    assert.equal(s.consortium.raid, null);
    assert.ok(s.server.credits > credits, 'bounty');
    for (let i = 0; i < 40 && !s.consortium.raid; i++) tickConsortium(s, 60000);
    tickConsortium(s, CONSORTIUM.raidMs + 1);
    assert.ok(rebooting(s, 'nyx'), "nyx's server crashed");
    assert.equal(dividendOf(s, serversOf(s, 'nyx').find((l) => l.held)), 0, 'their outposts pay nothing');
    const home = memberServers(s).find((l) => l.home);
    play(s, 'connect ' + home.id);
    clearOut(s, home);
    play(s, 'jack out');
    tickConsortium(s, 1000);
    assert.ok(!rebooting(s, 'nyx'), 'cleared: back up');
  });
});

test("a lost siege on a member's outpost: lockdown, retake it for a bounty; the virus travels to another outpost", () => {
  helping(0, () => {
    const s = world();
    play(s, 'consortium create LOWLIGHT');
    for (const h of ['nyx', 'ash', 'rook']) play(s, 'consortium invite ' + h);
    const loc = serversOf(s, 'nyx').find((l) => l.held);
    loc.held.siege = { left: 1000, seed: 3 };
    tickConsortium(s, 2000);
    assert.ok(loc.held.lockdown, 'lockdown');
    assert.equal(dividendOf(s, loc), 0);
    const r = s.consortium.roamer;
    assert.ok(r && r.from === loc.id && r.to !== loc.id, 'the virus moves on');
    play(s, 'consortium defend ' + loc.id);
    win(s);
    assert.equal(loc.held.lockdown, null, 'retaken');
    tickConsortium(s, CONSORTIUM.roam.travelMs);
    const hit = memberServers(s).find((l) => l.id === r.to);
    assert.equal(hit.held.siege?.hop, 1, 'it lands: a siege, one hop on');
  });
});

test('intercepting the travelling virus pays a growing bounty', () => {
  const s = world();
  play(s, 'consortium create LOWLIGHT');
  for (const h of ['nyx', 'ash']) play(s, 'consortium invite ' + h);
  const from = serversOf(s, 'nyx').find((l) => l.held);
  const { roam } = consortiumMod;
  roam(s, from, 2);
  assert.equal(s.consortium.roamer.hop, 3);
  const credits = s.server.credits;
  play(s, 'consortium intercept');
  assert.ok(s.encounter?.roamer);
  win(s);
  assert.equal(s.consortium.roamer, null);
  assert.ok(s.server.credits - credits >= CONSORTIUM.bounty(1).credits * 2, 'bounty x2 at hop 3');
  roam(s, from, 3);
  assert.equal(s.consortium.roamer, null, 'past three hops it burns out');
});

test('Grid: +10% wall', () => {
  const s = world();
  command(s, 'developer location ransomware');
  const inv = { level: 5, family: 'ransomware', mutation: null, grade: 1 };
  const base = ratioOf(s, inv);
  play(s, 'consortium create LOWLIGHT');
  for (const h of PRESENCE.pool.slice(0, 11)) play(s, 'consortium invite ' + h);
  assert.ok(Math.abs(ratioOf(s, inv) / base - 1.1) < 1e-9);
});

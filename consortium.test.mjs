import test from 'node:test';
import { floorsOf } from './dist/floors.mjs';
import assert from 'node:assert/strict';
import { fresh, command, hooks, active, resolveCycle } from './dist/combat.mjs';
import { play, crewWander, layoutOf, currentLocation } from './dist/run.mjs';
import { online, PRESENCE } from './dist/presence.mjs';
import { matesOf } from './dist/crew.mjs';
import * as consortiumMod from './dist/consortium.mjs';
import { rebooting, CONSORTIUM, memberServers, serversOf, sizeOf, tiersOf, tickConsortium, isGround, consortiumOf, consortiumSockets, consortiumLinked } from './dist/consortium.mjs';
import { tickNetwork, ratioOf } from './dist/invasion.mjs';
import { rogueSpawns } from './dist/rogue.mjs';
import * as FP from './dist/floorplan.mjs';

const world = () => { const s = fresh(); s.hackers = { breaker: { level: 6, xp: 0 } }; play(s, 'online sim'); return s; };
// A server found and connected to (only those send invasions: docs/servers.md 5.3).
const found = (s, family) => { command(s, `developer location ${family}`); s.locations.at(-1).runs = 1; return s.locations.at(-1); };
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
  assert.ok(serversOf(s, 'nyx').every((l) => !l.held), "a member's servers are just their servers (outposts went in R2)");
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
  if (loc.depth > 1) { assert.match(play(s, 'connect ' + loc.id).map((e) => e.message).join(' '), /Reach that floor yourself first/, 'a member\'s server on a floor you haven\'t reached waits'); floorsOf(s).reached = loc.depth; }
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

test('nothing comes for a member\'s servers any more: no sieges, no lockdowns, no dividend (R2)', () => {
  const s = world();
  play(s, 'consortium create LOWLIGHT');
  for (const h of ['nyx', 'ash', 'rook']) play(s, 'consortium invite ' + h);
  for (let i = 0; i < 20; i++) tickConsortium(s, 30 * 60000);
  assert.ok(memberServers(s).every((l) => !l.held), 'no outposts, no sieges');
  const credits = s.server.credits;
  play(s, 'consortium collect');
  assert.match(s.logs.at(-1).message, /dividend is gone/);
  assert.equal(s.server.credits, credits);
  assert.equal(CONSORTIUM.dividend, undefined);
});

test('size tiers: components on members\' servers, doubled bounties, the trunk rogue server, a socket room on every server', () => {
  const s = world();
  play(s, 'consortium create LOWLIGHT');
  assert.equal(consortiumLinked(s), false);
  assert.equal(consortiumSockets(s), 0);
  for (const h of PRESENCE.pool.slice(0, 11)) play(s, 'consortium invite ' + h);
  assert.equal(sizeOf(s), 12);
  assert.deepEqual(tiersOf(s).map((t) => t.at), [3, 5, 8, 12]);
  assert.equal(consortiumLinked(s), true, 'Linked: +10% components on members\' servers');
  assert.equal(consortiumSockets(s), 1, 'Grid: a socket room on every server');
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
  found(s, 'ransomware');
  const mine = s.locations[0];
  assert.ok(!isGround(s, mine), 'a server you only traced is yours alone');
  mine.takenOver = true;
  assert.ok(isGround(s, mine), 'the servers you hold are shared ground');
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
  // Since R1 SPRAWL-00's folders are rooms (netrooms.mjs), named for what they are: the crew is in a room, by its name.
  const named = (folder) => FP.roomList(s).find((r) => r.path0 === folder).path;
  assert.deepEqual(Object.values(s.run.crew).map((c) => c.cwd), ['Entry', 'Entry']);
  play(s, 'cd net');
  assert.match(named('/net'), /^Process \d$/);
  assert.deepEqual(Object.values(s.run.crew).map((c) => c.cwd), [named('/net'), named('/net')], 'linked: they follow');
  play(s, 'split kilo');
  assert.equal(s.run.crew.kilo.link, null);
  play(s, 'cd ..');
  assert.equal(s.run.crew.kilo.cwd, named('/net'), 'split: kilo stays');
  assert.equal(s.run.crew.nyx.cwd, 'Entry');
  for (let i = 0; i < 20; i++) crewWander(s);
  play(s, 'link kilo');
  assert.equal(s.run.linkedTo, 'kilo');
  assert.equal(s.run.cwd, s.run.crew.kilo.cwd, 'linking takes you to them');
  play(s, 'regroup');
  assert.ok(Object.values(s.run.crew).every((c) => c.cwd === s.run.cwd && c.link === 'you'));
  // Kilo goes off; a fight here has only nyx.
  play(s, 'split kilo'); s.run.crew.kilo.cwd = named('/srv');
  play(s, 'cd /'); play(s, 'cd tmp'); play(s, 'attack');
  assert.ok(active(s));
  const fighting = matesOf(s).filter((m) => m.encounter).map((m) => m.who);
  assert.deepEqual(fighting, ['nyx'], 'kilo is elsewhere');
  while (active(s)) { for (const p of s.encounter.virus.parts.filter((x) => x.integrity > 0)) Object.assign(p, { armor: 0, integrity: 1, attack: null, reflect: 0 }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); }
  play(s, 'link kilo');
  play(s, 'crew kick kilo');
  assert.ok(!s.crewSim.some((x) => x.name === 'kilo'), 'out of the crew');
  assert.ok(!s.run.crew.kilo, 'and off the run');
  assert.equal(s.run.linkedTo, null, 'no longer following them');
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
    found(s, 'ransomware');
    play(s, 'consortium create LOWLIGHT'); play(s, 'consortium invite nyx');
    s.firewall = { pin: 0, plus: 0, frag: 0, defragUntil: 0, hardenUntil: 0 }; // a weak wall
    const T0 = 1_800_000_000_000;
    tickNetwork(s, T0);
    s.server.integrity = 5;
    // Away, a half hour at a time, until the wall falls (the reboot after it runs 2 hours).
    for (let h = 1; h <= 24 && !s.logs.some((e) => e.type === 'crashed'); h++) tickNetwork(s, T0 + h * 1800000);
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

test('away, solo too: the network plays on, and your firewall decides', () => {
  const T0 = 1_800_000_000_000;
  const weak = world();
  found(weak, 'ransomware');
  weak.firewall = { pin: 0, plus: 0, frag: 0, defragUntil: 0, hardenUntil: 0 };
  tickNetwork(weak, T0);
  tickNetwork(weak, T0 + 8 * 3600000);
  assert.ok(weak.logs.some((e) => e.type === 'invader'), 'invaders came while you were away');
  assert.ok(weak.logs.some((e) => e.type === 'crashed'), 'nothing stopped them');
  const strong = world();
  found(strong, 'ransomware');
  strong.firewall = { pin: 30, plus: 0, frag: 0, defragUntil: 0, hardenUntil: 0 };
  tickNetwork(strong, T0);
  tickNetwork(strong, T0 + 8 * 3600000);
  assert.ok(strong.logs.some((e) => e.type === 'invasion-cleared'), 'the firewall stopped them');
  assert.ok(!strong.logs.some((e) => e.type === 'crashed'));
});

test('away, a strong wall holds: invaders are stopped and nothing crashes', () => {
  helping(0, () => {
    const s = world();
    found(s, 'ransomware');
    play(s, 'consortium create LOWLIGHT'); play(s, 'consortium invite nyx');
    s.hackers = { breaker: { level: 50, xp: 0 } }; // a high-level server (your highest class level)
    const T0 = 1_800_000_000_000;
    tickNetwork(s, T0);
    tickNetwork(s, T0 + 8 * 3600000);
    assert.ok(s.logs.filter((e) => e.type === 'invader').length >= 2, 'invaders came');
    assert.ok(!s.logs.some((e) => e.type === 'crashed'));
    assert.ok(s.logs.some((e) => e.type === 'invasion-cleared'), 'the wall stopped them');
  });
});

test('Grid: firewall +2 levels', async () => {
  const { effLevel } = await import('./dist/firewall.mjs');
  const s = world();
  found(s, 'ransomware');
  const base = effLevel(s, 0);
  play(s, 'consortium create LOWLIGHT');
  for (const h of PRESENCE.pool.slice(0, 11)) play(s, 'consortium invite ' + h);
  assert.equal(effLevel(s, 0), base + 2);
});

test('a member server reset brings fights and caches back, not vault loot or vault XP', async () => {
  const { fresh, command } = await import('./dist/combat.mjs');
  const { arrive, CONSORTIUM } = await import('./dist/consortium.mjs');
  const { takeable, fileInfo } = await import('./dist/run.mjs');
  const s = fresh();
  found(s, 'worm');
  const loc = s.locations[0];
  loc.member = 'k1ra';
  const files = takeable(loc);
  const kindOf = (p) => { const i = p.lastIndexOf('/'); return fileInfo(loc, p.slice(0, i) || '/', p.slice(i + 1))?.kind; };
  const cache = files.find((p) => ['credits', 'code'].includes(kindOf(p)));
  const loot = files.find((p) => !['credits', 'code'].includes(kindOf(p)));
  loc.state = { cleared: { '/x': true }, unlocked: { vault: true }, taken: { [cache]: true, [loot]: true } };
  loc.lastRun = 1;
  arrive(s, loc, fileInfo, 1 + CONSORTIUM.resetMs);
  assert.deepEqual(loc.state.cleared, {}, 'the natives are back');
  assert.ok(loc.state.unlocked.vault, 'the vault stays open: its XP was paid once');
  assert.ok(loc.state.taken[loot], 'pulled loot stays pulled');
  assert.ok(!loc.state.taken[cache], 'caches refill');
});

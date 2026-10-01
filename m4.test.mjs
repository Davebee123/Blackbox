import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, SAVE_VERSION } from './dist/combat.mjs';
import { play, layoutOf } from './dist/run.mjs';
import { CONFIG } from './dist/data.mjs';
import { tickNetwork, ratioOf, travelMs } from './dist/invasion.mjs';
import { CONFIGS, vaultConfig, configOn } from './dist/configs.mjs';
import { FLEET, launch } from './dist/fleet.mjs';
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;
const T0 = 1_000_000;
hooks.now = () => T0;
const win = (s) => {
  if (s.encounter?.phase === 'alert') command(s, 'engage');
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  for (let i = 0; i < 6 && active(s); i++) { const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); }
};
const takeOver = (s, loc) => {
  play(s, 'connect ' + loc.id);
  const layout = layoutOf(loc);
  const guardDir = Object.keys(layout).find((k) => layout[k].guard);
  const vault = Object.keys(layout).find((k) => layout[k].locked);
  play(s, 'cd ' + guardDir);
  if (s.encounter?.phase === 'alert' || active(s)) win(s);
  play(s, 'cd ' + vault.slice(0, vault.lastIndexOf('/')));
  play(s, `unlock vault ${loc.password}`);
  play(s, 'cd vault');
};
const withFirewall = () => { const s = fresh(); s.services = { firewall: 1, tarpit: 1, honeypot: 1, hotpatch: 1 }; return s; };

test('config source waits in some vaults; bank it, craft it, set it', () => {
  const s = fresh();
  let loc;
  for (let i = 0; i < 30 && !loc; i++) { command(s, 'developer location worm'); if (vaultConfig(s.locations.at(-1))) loc = s.locations.at(-1); }
  assert.ok(loc, 'some vault holds one');
  const id = vaultConfig(loc);
  takeOver(s, loc);
  play(s, `pull ${id}.cfg`);
  play(s, 'jack out');
  assert.ok(s.configsKnown.includes(id));
  s.services[CONFIGS[id].service] = 1;
  command(s, `config ${CONFIGS[id].service} ${id}`);
  assert.equal(configOn(s, CONFIGS[id].service), null, 'known is not owned: craft it first');
  s.server.credits = 1000; s.materials = { cipher: 50, worm: 50, kernel: 50, exploit: 0 }; s.salvage = Array.from({ length: 6 }, () => ({ name: 'Scrap' }));
  command(s, `craft config ${id}`);
  assert.ok(s.configsOwned.includes(id));
  command(s, `config ${CONFIGS[id].service} ${id}`);
  assert.equal(configOn(s, CONFIGS[id].service), id);
  command(s, `config ${CONFIGS[id].service} none`);
  assert.equal(configOn(s, CONFIGS[id].service), null);
});

test('Firewall configs bend the wall; Tarpit Sticky slows invaders more', () => {
  const s = withFirewall();
  s.configsOwned = Object.keys(CONFIGS);
  const inv = { level: 5, mutation: null, family: 'worm' };
  const base = ratioOf(s, inv);
  command(s, 'config firewall stateful');
  assert.ok(Math.abs(ratioOf(s, inv) / base - 1.2) < 1e-9);
  s.net.seen = { worm: 3, ransomware: 1 };
  command(s, 'config firewall adaptive');
  assert.ok(Math.abs(ratioOf(s, inv) / base - 1.4) < 1e-9);
  assert.ok(Math.abs(ratioOf(s, { ...inv, family: 'ransomware' }) / base - 0.9) < 1e-9);
  const slow = travelMs(s, 1);
  command(s, 'config tarpit sticky');
  assert.ok(travelMs(s, 1) > slow);
});

test('Hot-patcher Triage: double repair below half, half above', async () => {
  const { serviceStat } = await import('./dist/combat.mjs');
  const s = withFirewall();
  s.configsOwned = ['triage'];
  const plain = serviceStat(s, 'regen');
  command(s, 'config hotpatch triage');
  assert.equal(serviceStat(s, 'regen'), plain * 0.5);
  s.server.integrity = 10;
  assert.equal(serviceStat(s, 'regen'), plain * 2);
});

test('a fleet sets out for an outpost, sieges it, and breaks when every ship is down', () => {
  const s = fresh();
  command(s, 'developer location worm');
  const a = s.locations[0];
  a.takenOver = true;
  s.harvesters = [{ kind: 'siphon', level: 3, traits: [] }];
  command(s, `outpost install ${a.id}`, T0);
  const f = launch(s);
  assert.ok(f && f.target === a.id && f.ships >= 2);
  s.net.next = 1e12;
  let t = T0; s.net.wall = t;
  for (let i = 0; i < FLEET.travelMs / 1000 + 5; i++) tickNetwork(s, (t += 1000));
  assert.equal(s.fleet.state, 'siege');
  const n = s.fleet.ships;
  for (let i = 0; i < n; i++) { command(s, 'swarm engage'); win(s); }
  assert.equal(s.fleet, null);
  assert.equal(a.outpost.fallen, false);
  assert.ok(s.salvage.length >= n);
});

test('an undefended fleet takes the outpost', () => {
  const s = fresh();
  command(s, 'developer location worm');
  const a = s.locations[0];
  a.takenOver = true;
  s.harvesters = [{ kind: 'siphon', level: 3, traits: ['sturdy'] }];
  command(s, `outpost install ${a.id}`, T0);
  launch(s);
  s.net.next = 1e12;
  let t = T0; s.net.wall = t;
  for (let i = 0; i < (FLEET.travelMs + FLEET.siegeMs) / 1000 + 10; i++) tickNetwork(s, (t += 1000));
  assert.equal(s.fleet, null);
  assert.equal(a.outpost.fallen, 'held', 'Sturdy does not save it from a fleet');
});

test('a v24 save loads with configs and no fleet', () => {
  const s = fresh();
  delete s.configs; delete s.fleet;
  const back = restore(JSON.parse(JSON.stringify({ ...s, version: 24 })));
  assert.equal(back.version, SAVE_VERSION);
  assert.deepEqual(back.configs, {});
  assert.equal(back.fleet, null);
});

test('outpost modules: ports, Pipeline, Storage Array, Firewall Node, IDS', async () => {
  const { capOf, perHour, OUTPOST, outpostPorts } = await import('./dist/outpost.mjs');
  const s = fresh();
  command(s, 'developer location worm');
  const a = s.locations[0];
  a.takenOver = true;
  s.harvesters = [{ kind: 'siphon', level: 5, traits: [] }];
  command(s, `outpost install ${a.id}`, T0);
  const cap = capOf(a), rate = perHour(a, a.outpost.h, s);
  s.server.credits = 1000; s.materials.worm = 100;
  command(s, 'developer salvage 30');
  command(s, `outpost mod ${a.id} pipeline`);
  command(s, `outpost mod ${a.id} storage`);
  assert.equal(capOf(a), cap * 2);
  assert.ok(Math.abs(perHour(a, a.outpost.h, s) - rate * 1.5) < 1e-9);
  assert.equal(outpostPorts(s), 2);
  command(s, `outpost mod ${a.id} node`);
  assert.equal(a.mods.length, 2, 'two ports at the start');
  command(s, `outpost unmod ${a.id} storage`);
  command(s, `outpost mod ${a.id} node`);
  assert.ok(a.mods.includes('node'));
  launch(s);
  assert.equal(s.fleet.siegeLeft, FLEET.siegeMs * 2, 'a Firewall Node doubles a swarm siege');
});

test('Edge Router adds bandwidth; the Scheduler collects outposts on its own', async () => {
  const { bandwidth, stockOf } = await import('./dist/outpost.mjs');
  const s = fresh();
  const bw = bandwidth(s);
  s.services = { router: 2 };
  assert.equal(bandwidth(s), bw + 2);
  command(s, 'developer location worm');
  const a = s.locations[0];
  a.takenOver = true;
  s.harvesters = [{ kind: 'siphon', level: 5, traits: [] }];
  command(s, `outpost install ${a.id}`, T0);
  s.services.scheduler = 3; // every 15 minutes
  s.net.next = 1e12;
  tickNetwork(s, T0);
  const before = s.materials.worm;
  tickNetwork(s, T0 + 60 * 60000); // an hour of production, and the Scheduler is due
  assert.ok(s.materials.worm > before, 'collected without a visit');
  assert.equal(stockOf(a), 0);
});

test('architecture: picked at server level 20; Fortress walls, Hub bandwidth, Lab crafting', async () => {
  const { bandwidth } = await import('./dist/outpost.mjs');
  const { compileCost } = await import('./dist/combat.mjs');
  const s = withFirewall();
  command(s, 'architecture fortress');
  assert.equal(s.architecture, null, 'too early');
  command(s, 'developer server 20');
  const inv = { level: 20, mutation: null, family: 'worm' };
  const base = ratioOf(s, inv), bw = bandwidth(s), cc = compileCost(s).credits;
  command(s, 'architecture fortress');
  assert.ok(Math.abs(ratioOf(s, inv) / base - 1.25) < 1e-9);
  s.server.credits = 1500;
  command(s, 'architecture hub');
  assert.equal(s.server.credits, 500, 'switching costs 1000');
  assert.equal(bandwidth(s), bw + 2);
  s.server.credits = 1000;
  command(s, 'architecture lab');
  assert.equal(compileCost(s).credits, Math.round(cc * 0.7));
});

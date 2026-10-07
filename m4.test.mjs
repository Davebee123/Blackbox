import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, SAVE_VERSION } from './dist/combat.mjs';
import { play, layoutOf } from './dist/run.mjs';
import { CONFIG } from './dist/data.mjs';
import { tickNetwork, ratioOf, travelMs } from './dist/invasion.mjs';
import { FLEET, launch } from './dist/fleet.mjs';
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;
const T0 = 1_000_000;
hooks.now = () => T0;
const win = (s) => {
  if (s.encounter?.phase === 'alert') command(s, 'engage');
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  for (let i = 0; i < 30 && active(s); i++) { const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, "spike " + p.id); resolveCycle(s); }
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
  // The Resident in /core (run.mjs): beat it to take the server, then come back to the vault.
  play(s, 'cd /core');
  if (s.encounter?.phase === 'alert' || active(s)) win(s);
  play(s, 'cd ' + vault.slice(0, vault.lastIndexOf('/')));
  play(s, 'cd vault');
};
const withFirewall = () => { const s = fresh(); s.services = { firewall: 1, tarpit: 1, honeypot: 1, hotpatch: 1 }; return s; };

test('configs are gone (a save that owned one gets its credits back), and the wall is three knobs', async () => {
  const { restore, SAVE_VERSION } = await import('./dist/combat.mjs');
  const s = withFirewall();
  Object.assign(s, { version: 29, configsOwned: ['stateful', 'triage'], configsKnown: ['stateful', 'triage', 'beacon'], configs: { firewall: 'stateful' } });
  s.services = { ...s.services, tarpit: 2, honeypot: 1 };
  const credits = s.server.credits;
  const t = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(t.version, SAVE_VERSION);
  assert.deepEqual(t.configsOwned, []); assert.deepEqual(t.configsKnown, [], 'configs are gone, Triage too');
  assert.deepEqual(t.configs, {});
  assert.ok(!t.services.tarpit && !t.services.honeypot);
  assert.equal(t.server.credits, credits + 2 * 250, 'stateful and triage refunded');
  const stats = t.filters.held.map((f) => Object.keys(f.stats));
  assert.ok(stats.some((k) => k.includes('tarpit')) && stats.some((k) => k.includes('evasion')), 'each retired service comes back as a filter');
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
  assert.equal(a.outpost.lockdown, null);
  assert.ok(s.salvage.length >= n);
});

test('an undefended fleet puts the outpost in lockdown', () => {
  const s = fresh();
  command(s, 'developer location worm');
  const a = s.locations[0];
  a.takenOver = true;
  s.harvesters = [{ kind: 'siphon', level: 3, traits: [] }];
  command(s, `outpost install ${a.id}`, T0);
  launch(s);
  s.net.next = 1e12;
  let t = T0; s.net.wall = t;
  for (let i = 0; i < (FLEET.travelMs + FLEET.siegeMs) / 1000 + 10; i++) tickNetwork(s, (t += 1000));
  assert.equal(s.fleet, null);
  assert.ok(a.outpost.lockdown);
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
  const { capOf, perHour, OUTPOST, outpostPorts, modsOf, modStock, learnPlan } = await import('./dist/outpost.mjs');
  const s = fresh();
  command(s, 'developer location worm');
  const a = s.locations[0];
  a.takenOver = true;
  s.harvesters = [{ kind: 'siphon', level: 5, traits: [] }];
  command(s, `outpost install ${a.id}`, T0);
  const cap = capOf(a), rate = perHour(a, a.outpost.h, s);
  s.server.credits = 2000; s.materials.worm = 100; s.materials.kernel = 100; s.materials.cipher = 100;
  command(s, 'developer salvage 30');
  command(s, `outpost mod ${a.id} pipeline`);
  assert.equal(modsOf(a).length, 0, 'no module in stock');
  command(s, 'outpost build pipeline');
  assert.equal(modStock(s).pipeline || 0, 0, 'no plan, no module');
  for (const id of ['pipeline', 'storage', 'node']) { learnPlan(s, id); command(s, `outpost build ${id}`); }
  assert.deepEqual(modStock(s), { pipeline: 1, storage: 1, node: 1 });
  command(s, `outpost mod ${a.id} pipeline`);
  command(s, `outpost mod ${a.id} storage`);
  assert.equal(capOf(a), cap * 2);
  assert.ok(Math.abs(perHour(a, a.outpost.h, s) - rate * 1.5) < 1e-9);
  assert.equal(outpostPorts(s), 2);
  command(s, `outpost mod ${a.id} node`);
  assert.equal(a.mods.length, 2, 'two ports at the start');
  command(s, `outpost unmod ${a.id} storage`);
  assert.equal(modStock(s).storage, 1, 'a removed module goes back to your stock');
  command(s, `outpost mod ${a.id} node`);
  assert.ok(a.mods.includes('node'));
  const { effLevel, NODE_PLUS } = await import('./dist/firewall.mjs');
  const base = effLevel(s, undefined, null, a);
  command(s, `outpost unmod ${a.id} node`);
  assert.equal(effLevel(s, undefined, null, a), base - NODE_PLUS, 'a Firewall Node adds levels to the outpost\'s firewall');
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
  const { effLevel } = await import('./dist/firewall.mjs');
  const lv = effLevel(s, 0);
  command(s, 'architecture fortress');
  assert.equal(effLevel(s, 0), lv + 5, 'Fortress: firewall +5');
  s.server.credits = 1500;
  command(s, 'architecture hub');
  assert.equal(s.server.credits, 500, 'switching costs 1000');
  assert.equal(bandwidth(s), bw + 2);
  s.server.credits = 1000;
  command(s, 'architecture lab');
  assert.equal(compileCost(s).credits, Math.round(cc * 0.7));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, SAVE_VERSION } from './dist/combat.mjs';
import { play, layoutOf } from './dist/run.mjs';
import { CONFIG } from './dist/data.mjs';
import { tickNetwork, ratioOf, travelMs } from './dist/invasion.mjs';
import { launch } from './dist/fleet.mjs';
import { HUBS as FLEET } from './dist/hubs.mjs'; // a swarm's clock is a hub's
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
const FILTER_BAY = 120; // a v1 service's credits (the retired VERSIONS table)

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
  const { CRAFT_REFUND } = await import('./dist/progression.mjs');
  assert.equal(t.server.credits, credits + 2 * 250 + 2 * FILTER_BAY + CRAFT_REFUND.filter(1), 'stateful and triage refunded, and (v34) the Filter Bay and the Hot-patcher come back as what they cost, the filter recipe one taught as credits (v47)');
  const stats = t.filters.held.map((f) => Object.keys(f.stats));
  assert.ok(stats.some((k) => k.includes('tarpit')) && stats.some((k) => k.includes('evasion')), 'each retired service comes back as a filter');
});

// A hub you hold, its firewall pinned low so the swarm breaches (the wall's own tests are in firewall.test.mjs).
const hubHeld = async (s) => {
  const { hubWall } = await import('./dist/hubs.mjs');
  const { fwAt } = await import('./dist/firewall.mjs');
  (s.hubs ||= {}).kestrel = { id: 'hub-kestrel', faction: 'kestrel', stock: {}, restockAt: 0, captured: { at: 0, bank: 0 } };
  fwAt(s, hubWall(s, 'kestrel')).pin = 1;
};

test('a swarm only comes for a hub you hold (a held server has nothing to steal since R2); it sieges, and breaks when every ship is down', async () => {
  const s = fresh();
  command(s, 'developer location worm');
  s.locations[0].takenOver = true;
  assert.equal(launch(s), null, 'a held server is never a target');
  await hubHeld(s);
  const f = launch(s, T0, null, { hub: 'kestrel' });
  assert.ok(f && f.hub === 'kestrel' && f.ships >= 2);
  s.net.next = 1e12;
  let t = T0; s.net.wall = t;
  for (let i = 0; i < FLEET.travelMs / 1000 + 5; i++) tickNetwork(s, (t += 1000));
  assert.equal(s.fleet.state, 'siege');
  const n = s.fleet.ships, had = s.salvage.length;
  for (let i = 0; i < n; i++) { command(s, 'swarm engage'); win(s); }
  assert.equal(s.fleet, null);
  assert.ok(!s.hubs.kestrel.captured.lockdown);
  assert.ok(s.salvage.length >= had + n, 'a component a process');
});

test('an undefended swarm puts the hub in lockdown', async () => {
  const s = fresh();
  await hubHeld(s);
  launch(s, T0, null, { hub: 'kestrel' });
  s.net.next = 1e12;
  let t = T0; s.net.wall = t;
  for (let i = 0; i < (FLEET.travelMs + FLEET.siegeMs) / 1000 + 10; i++) tickNetwork(s, (t += 1000));
  assert.equal(s.fleet, null);
  assert.ok(s.hubs.kestrel.captured.lockdown);
});

test('a v24 save loads with configs and no fleet', () => {
  const s = fresh();
  delete s.configs; delete s.fleet;
  const back = restore(JSON.parse(JSON.stringify({ ...s, version: 24 })));
  assert.equal(back.version, SAVE_VERSION);
  assert.deepEqual(back.configs, {});
  assert.equal(back.fleet, null);
});

test('services, outposts and architecture are gone (R2): their commands say where the choices went, and a held server stores nothing while you are away', () => {
  const s = withFirewall();
  command(s, 'install router');
  assert.match(s.logs.at(-1).message, /Services are gone/);
  command(s, 'developer location worm');
  const a = s.locations[0];
  a.takenOver = true;
  command(s, `outpost ${a.id}`);
  assert.match(s.logs.at(-1).message, /Outposts are gone/);
  command(s, 'developer server 20');
  command(s, 'architecture fortress');
  assert.match(s.logs.at(-1).message, /architecture is gone/);
  assert.equal(s.architecture ?? null, null);
  s.net.next = 1e12;
  tickNetwork(s, T0);
  const before = JSON.stringify(s.materials);
  tickNetwork(s, T0 + 60 * 60000);
  assert.equal(JSON.stringify(s.materials), before, 'nothing produces on its own: programs pay as you clear rooms');
  assert.ok(!a.outpost && !a.buildings);
});

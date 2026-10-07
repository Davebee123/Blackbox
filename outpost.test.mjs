import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, SAVE_VERSION } from './dist/combat.mjs';
import { play, layoutOf } from './dist/run.mjs';
import { CONFIG } from './dist/data.mjs';
import { tickNetwork } from './dist/invasion.mjs';
import { startSiege, learnPlan, knowsPlan, OUTPOST, BUILDINGS, bandwidth, bandwidthUsed, stockOf, capOf, makes, siteTrait, slotsOf, buildingsOf, buildBlock, isOutpost, heatOf, retireHarvesters, has } from './dist/outpost.mjs';
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;

const T0 = 1_000_000;
hooks.now = () => T0;
const H = 3600000;
const win = (s) => {
  if (s.encounter?.phase === 'alert') command(s, 'engage');
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  for (let i = 0; i < 30 && active(s); i++) { const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); }
};
const found = (s, fam = 'worm') => { command(s, 'developer location ' + fam); const l = s.locations.at(-1); l.trait = null; return l; };
const rich = (s) => { s.server.credits = 1e5; Object.assign(s.materials, { worm: 1e3, cipher: 1e3, kernel: 1e3, exploit: 50 }); s.salvage = Array.from({ length: 400 }, () => ({ name: 'Scrap', virus: 't', seed: 0 })); };
const held = (s) => { const a = found(s); a.takenOver = true; rich(s); return a; };
const quiet = (s) => { s.net ||= {}; s.net.wall = T0; s.net.next = 1e12; s.net.fleetAt = 1e15; };

test('a server you hold has building slots by its size; you start knowing only the Code Siphon', () => {
  const s = fresh();
  const a = held(s);
  assert.ok([3, 4, 5].includes(slotsOf(a)));
  assert.ok(knowsPlan(s, 'siphon'));
  assert.ok(!knowsPlan(s, 'skimmer'));
  assert.match(buildBlock(s, a, 'skimmer'), /plan/);
  assert.equal(buildBlock(s, a, 'siphon'), null);
  assert.ok(!isOutpost(a), 'nothing built: not an outpost yet');
});

test('a build takes real time and money; when it lands the server is an outpost and starts producing', () => {
  const s = fresh();
  const a = held(s);
  quiet(s);
  const credits = s.server.credits;
  command(s, `outpost build ${a.id} siphon`, T0);
  assert.equal(a.build.id, 'siphon');
  assert.equal(s.server.credits, credits - BUILDINGS.siphon.cost.credits);
  learnPlan(s, 'node');
  assert.match(buildBlock(s, a, 'node'), /already building/);
  let t = T0;
  tickNetwork(s, (t += 5 * 60000));
  assert.ok(a.build, 'still building');
  tickNetwork(s, (t += 6 * 60000));
  assert.equal(a.build, null);
  assert.deepEqual(buildingsOf(a), ['siphon']);
  assert.ok(isOutpost(a));
  for (let i = 0; i < 4; i++) tickNetwork(s, (t += H));
  assert.ok(stockOf(a) >= 4, 'it filled while you were away');
  const code = s.materials.worm;
  play(s, 'connect ' + a.id);
  assert.ok(s.materials.worm > code, 'connecting collects it');
});

test('two builds at once across the network; slots and bandwidth cap what you build', () => {
  const s = fresh();
  const a = held(s), b = held(s), c = held(s);
  command(s, `outpost build ${a.id} siphon`, T0);
  command(s, `outpost build ${b.id} siphon`, T0);
  assert.match(buildBlock(s, c, 'siphon'), /2 things at once/);
  a.build = null; b.build = null;
  a.buildings = Array.from({ length: slotsOf(a) }, (_, i) => ['siphon', 'node', 'storage', 'ids', 'lure', 'mill'][i]);
  for (const id of ['mill']) learnPlan(s, id);
  assert.match(buildBlock(s, a, 'mill') || buildBlock(s, a, 'skimmer') || '', /slots are full|plan|already/);
  c.buildings = []; a.buildings = ['siphon']; b.buildings = [];
  // Fill the bandwidth with buildings elsewhere.
  const room = bandwidth(s) - bandwidthUsed(s);
  b.buildings = Array.from({ length: room }, () => 'siphon');
  assert.match(buildBlock(s, c, 'siphon'), /bandwidth/);
});

test('a specialisation needs its prerequisites, the server level, and one per server', () => {
  const s = fresh();
  const a = held(s);
  learnPlan(s, 'refinery'); learnPlan(s, 'skimmer'); learnPlan(s, 'mill');
  assert.match(buildBlock(s, a, 'refinery'), /server level 20/);
  s.serverXp = 1e9;
  assert.match(buildBlock(s, a, 'refinery'), /3 producers/);
  a.buildings = ['siphon', 'skimmer', 'mill'];
  a.trait = 'backbone';
  assert.equal(buildBlock(s, a, 'refinery'), null);
});

test('production: a Pipeline adds half, a Storage Array doubles what it can hold, a Rich site adds half', () => {
  const s = fresh();
  const a = held(s);
  a.buildings = ['siphon'];
  const base = makes(s, a).code, cap = capOf(s, a).code;
  a.buildings.push('pipeline');
  assert.ok(Math.abs(makes(s, a).code - base * 1.5) < 1e-9);
  a.buildings.push('storage');
  assert.ok(capOf(s, a).code >= cap * 2 * 1.5 - 1);
  a.trait = 'rich';
  assert.ok(Math.abs(makes(s, a).code - base * 2.25) < 1e-9);
});

test('more buildings draw more natives; an IDS halves it, a Honeytoken doubles it', () => {
  const s = fresh();
  const a = held(s);
  a.buildings = ['siphon'];
  const one = heatOf(s, a);
  a.buildings = ['siphon', 'node'];
  assert.ok(heatOf(s, a) > one);
  a.buildings = ['siphon', 'ids'];
  assert.ok(heatOf(s, a) < one);
  a.buildings = ['siphon', 'lure'];
  assert.ok(heatOf(s, a) > one * 1.9);
});

test('a Firewall Node adds 3 levels to its server\'s firewall, a Citadel 6', async () => {
  const { effLevel, NODE_PLUS } = await import('./dist/firewall.mjs');
  const s = fresh();
  const a = held(s);
  command(s, `developer outpost ${a.id} siphon`, T0);
  const base = effLevel(s, undefined, null, a);
  a.buildings.push('node');
  assert.equal(effLevel(s, undefined, null, a), base + NODE_PLUS);
  a.buildings.push('citadel');
  assert.equal(effLevel(s, undefined, null, a), base + 3 * NODE_PLUS);
});

test('taking a building down gives half its credits back', () => {
  const s = fresh();
  const a = held(s);
  command(s, `developer outpost ${a.id} siphon node`, T0);
  const c = s.server.credits;
  command(s, `outpost demolish ${a.id} node`, T0);
  assert.ok(!has(a, 'node'));
  assert.equal(s.server.credits, c + BUILDINGS.node.cost.credits / 2);
});

test('an undefended swarm puts the outpost in lockdown: nothing made, the store kept, servers past it open; retaking ends it', () => {
  const s = fresh();
  const a = found(s);
  command(s, 'developer location ransomware');
  const deep = s.locations.at(-1);
  deep.parent = a.id;
  command(s, `developer outpost ${a.id}`, T0);
  a.outpost.fw = { level: 0, frag: 0, defragUntil: 0, hardenUntil: 0 }; // nothing to stop them
  quiet(s);
  startSiege(s, a); s.fleet.arriveAt = T0; // its natives, at the door
  a.outpost.stock = { code: 3 };
  let t = T0;
  for (let i = 0; i < 620; i++) tickNetwork(s, (t += 1000));
  assert.ok(a.outpost.lockdown, 'in lockdown');
  assert.equal(stockOf(a), 3, 'the store is kept');
  for (let i = 0; i < 600; i++) tickNetwork(s, (t += 1000));
  assert.equal(stockOf(a), 3, 'nothing made meanwhile');
  play(s, 'connect ' + deep.id);
  assert.equal(s.run?.loc, deep.id, 'servers past it stay open');
  play(s, 'jack out');
  command(s, `outpost retake ${a.id}`, t);
  assert.ok(s.encounter?.outpost === a.id);
  win(s);
  assert.equal(a.outpost.lockdown, null);
});

test('a Citadel holds: a lost defence doesn\'t lock it down', async () => {
  const { fall } = await import('./dist/outpost.mjs');
  const s = fresh();
  const a = found(s);
  command(s, `developer outpost ${a.id} siphon citadel`, T0);
  fall(s, a);
  assert.ok(!a.outpost.lockdown);
});

test('a lockdown ends on its own; two left to run out in a day and the Resident regrows', () => {
  const s = fresh();
  const a = found(s);
  command(s, `developer outpost ${a.id}`, T0);
  quiet(s);
  let t = T0;
  a.outpost.lockdown = { left: 5000 };
  for (let i = 0; i < 6; i++) tickNetwork(s, (t += 1000));
  assert.equal(a.outpost.lockdown, null);
  assert.ok(a.takenOver);
  a.outpost.lockdown = { left: 5000 };
  for (let i = 0; i < 6; i++) tickNetwork(s, (t += 1000));
  assert.ok(!a.takenOver, 'the Resident regrew');
  assert.deepEqual(buildingsOf(a), ['siphon'], 'what you built waits');
});

test('defending in time breaks the natives\' swarm', () => {
  const s = fresh();
  const a = found(s);
  command(s, `developer outpost ${a.id}`, T0);
  startSiege(s, a);
  assert.ok(s.fleet?.natives, 'its natives come as a swarm');
  for (let i = 0; i < 4 && s.fleet; i++) { command(s, `outpost defend ${a.id}`, T0); win(s); }
  assert.equal(s.fleet, null, 'every virus down');
  assert.equal(a.outpost.lockdown, null);
});

test('a Sentry Daemon kills a virus of every swarm that reaches its server', () => {
  const s = fresh();
  const a = found(s);
  command(s, `developer outpost ${a.id} siphon sentry`, T0);
  quiet(s);
  startSiege(s, a);
  const n = s.fleet.ships;
  s.fleet.arriveAt = T0;
  tickNetwork(s, T0 + 1000);
  assert.ok(!s.fleet || s.fleet.ships === n - 1);
});

test('a Honeytoken draws swarms to its outpost first', async () => {
  const { launch } = await import('./dist/fleet.mjs');
  const s = fresh();
  const a = found(s), b = found(s);
  command(s, `developer outpost ${a.id}`, T0);
  command(s, `developer outpost ${b.id} siphon lure`, T0);
  for (let i = 0; i < 6; i++) { s.fleet = null; assert.equal(launch(s).target, b.id, 'swarms pick the Honeytoken'); }
});

test('plans: a known plan banked again is salvage; vaults never hold the Code Siphon\'s', async () => {
  const { vaultPlan, plansOf } = await import('./dist/outpost.mjs');
  assert.equal(vaultPlan({ rogue: {}, seed: 1 }), null);
  assert.notEqual(vaultPlan({ starter: true, seed: 1, level: 1 }), 'siphon');
  const s = fresh();
  learnPlan(s, 'node');
  assert.ok(knowsPlan(s, 'node'));
  const n = s.salvage.length;
  learnPlan(s, 'node');
  assert.equal(plansOf(s).length, 1);
  assert.equal(s.salvage.length, n + 2);
});

test('old saves: a harvester becomes its building, modules theirs, the rack and stock come back as credits', () => {
  const s = fresh();
  const a = found(s);
  a.takenOver = true;
  a.outpost = { h: { kind: 'scraper', level: 3 }, stock: 2, lockdown: null, at: T0 };
  a.mods = ['pipeline', 'node'];
  s.harvesters = [{ kind: 'siphon', level: 1 }];
  s.modStock = { storage: 1 };
  s.plans = ['scraper', 'tap', 'node'];
  const c = s.server.credits;
  retireHarvesters(s);
  assert.deepEqual(buildingsOf(a), ['miner', 'pipeline', 'node']);
  assert.ok(isOutpost(a));
  assert.equal(s.server.credits, c + 200 + 150);
  assert.ok(!s.harvesters && !s.modStock);
  assert.deepEqual(s.plans.sort(), ['miner', 'node', 'skimmer']);
});

test('site traits are fixed by the seed', () => {
  assert.equal(siteTrait({ seed: 77 }), siteTrait({ seed: 77 }));
});

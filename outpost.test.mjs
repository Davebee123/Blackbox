import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, SAVE_VERSION } from './dist/combat.mjs';
import { play, layoutOf } from './dist/run.mjs';
import { CONFIG } from './dist/data.mjs';
import { tickNetwork } from './dist/invasion.mjs';
import { learnPlan, knowsPlan, OUTPOST, harvesters, hasVx, bandwidth, stockOf, capOf, vxName, vaultHarvester, siteTrait } from './dist/outpost.mjs';
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;

const T0 = 1_000_000;
hooks.now = () => T0;
const H = 3600000;
const win = (s) => {
  if (s.encounter?.phase === 'alert') command(s, 'engage');
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  for (let i = 0; i < 6 && active(s); i++) { const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); }
};
const takeOver = (s, loc) => {
  if (s.run) play(s, 'jack out');
  play(s, 'connect ' + loc.id);
  const layout = layoutOf(loc);
  const guardDir = Object.keys(layout).find((k) => layout[k].guard);
  const vault = Object.keys(layout).find((k) => layout[k].locked);
  play(s, 'cd ' + guardDir);
  if (s.encounter?.phase === 'alert' || active(s)) win(s);
  play(s, 'cd ' + vault.slice(0, vault.lastIndexOf('/')));
  play(s, `unlock vault ${loc.password}`);
  play(s, 'cd vault');
  return vault;
};
const found = (s, fam = 'worm') => { command(s, 'developer location ' + fam); const l = s.locations.at(-1); l.trait = null; return l; };
const siphon = (level = 5, traits = []) => ({ kind: 'siphon', level, traits });

test('packaged natives are rare: only some vaults hold one, and they bank as harvesters', () => {
  const s = fresh();
  for (let i = 0; i < 60; i++) command(s, 'developer location ' + ['worm', 'ransomware', 'ghostroot'][i % 3]);
  const share = s.locations.filter(hasVx).length / s.locations.length;
  assert.ok(share > 0 && share < 0.3, `share ${share}`);
  const loc = s.locations.find(hasVx);
  for (const l of s.locations) if (l !== loc) l.takenOver = true;
  const vault = takeOver(s, loc);
  assert.ok(layoutOf(loc)[vault].files.includes(vxName(loc)));
  assert.ok(!layoutOf(s.locations.find((l) => !hasVx(l)))[vault]?.files.includes('worm.vx'));
  play(s, 'pull ' + vxName(loc));
  play(s, 'jack out');
  assert.equal(harvesters(s).length, 1);
  assert.equal(harvesters(s)[0].kind, vaultHarvester(loc).kind);
});

test('an outpost needs a taken-over server and bandwidth, and fills offline up to its cap', () => {
  const s = fresh();
  const a = found(s), b = found(s);
  s.harvesters = [siphon(), siphon()];
  command(s, `outpost install ${a.id}`, T0);
  assert.ok(!a.outpost?.h, 'not taken over yet');
  a.takenOver = b.takenOver = true;
  command(s, `outpost install ${a.id}`, T0);
  assert.ok(a.outpost.h);
  assert.equal(bandwidth(s), 1);
  command(s, `outpost install ${b.id}`, T0);
  assert.ok(!b.outpost?.h, 'no bandwidth left');
  // Offline for a day, behind a firewall nothing gets past: capped.
  a.outpost.fw = { level: 40, frag: 0, defragUntil: 0, hardenUntil: 0 };
  tickNetwork(s, T0);
  tickNetwork(s, T0 + 24 * H);
  assert.equal(stockOf(a), capOf(a));
  const before = s.materials.worm;
  play(s, 'connect ' + a.id);
  assert.equal(s.materials.worm - before, capOf(a));
  assert.equal(stockOf(a), 0);
});

test('Rich and Deep traits change yield and storage', () => {
  const s = fresh();
  const a = found(s);
  a.takenOver = true;
  s.harvesters = [siphon(10, ['deep'])];
  command(s, `outpost install ${a.id}`, T0);
  assert.equal(capOf(a), OUTPOST.kinds.siphon.cap(10) * 2);
});

test('an undefended siege puts the outpost in lockdown: no harvesting, stockpile kept, servers past it still open; retaking ends it', () => {
  const s = fresh();
  const a = found(s);
  a.takenOver = true;
  command(s, 'developer location ransomware');
  const deep = s.locations.at(-1);
  deep.parent = a.id;
  s.harvesters = [siphon()];
  command(s, `outpost install ${a.id}`, T0);
  a.outpost.fw = { level: 0, frag: 0, defragUntil: 0, hardenUntil: 0 }; // nothing to stop them
  a.outpost.siege = { left: OUTPOST.siegeMs, seed: 7 };
  a.outpost.stock = 3;
  s.net.wall = T0;
  s.net.next = 1e12; // no invaders in this test
  let t = T0;
  for (let i = 0; i < 620; i++) tickNetwork(s, (t += 1000));
  assert.ok(a.outpost.lockdown, 'in lockdown');
  assert.equal(stockOf(a), 3, 'the stockpile is kept');
  for (let i = 0; i < 600; i++) tickNetwork(s, (t += 1000));
  assert.equal(stockOf(a), 3, 'no harvesting meanwhile');
  play(s, 'connect ' + deep.id);
  assert.equal(s.run?.loc, deep.id, 'servers past it stay open');
  play(s, 'jack out');
  command(s, `outpost retake ${a.id}`, t);
  assert.ok(s.encounter?.outpost === a.id);
  win(s);
  assert.equal(a.outpost.lockdown, null);
});

test('a lockdown ends on its own', () => {
  const s = fresh();
  const a = found(s);
  a.takenOver = true;
  s.harvesters = [siphon()];
  command(s, `outpost install ${a.id}`, T0);
  a.outpost.lockdown = { left: 5000 };
  s.net.wall = T0; s.net.next = 1e12;
  let t = T0;
  for (let i = 0; i < 6; i++) tickNetwork(s, (t += 1000));
  assert.equal(a.outpost.lockdown, null);
});

test('defending in time breaks the siege', () => {
  const s = fresh();
  const a = found(s);
  a.takenOver = true;
  s.harvesters = [siphon()];
  command(s, `outpost install ${a.id}`, T0);
  a.outpost.siege = { left: OUTPOST.siegeMs, seed: 7 };
  command(s, `outpost defend ${a.id}`, T0);
  win(s);
  assert.equal(a.outpost.siege, null);
  assert.equal(a.outpost.lockdown, null);
});

test('pulling out returns the harvester and the port resets', () => {
  const s = fresh();
  const a = found(s);
  a.takenOver = true;
  s.harvesters = [siphon()];
  command(s, `outpost install ${a.id}`, T0);
  command(s, `outpost pull ${a.id}`, T0);
  assert.equal(harvesters(s).length, 1);
  command(s, `outpost install ${a.id}`, T0 + 60000);
  assert.ok(!a.outpost.h, 'port resetting');
  command(s, `outpost install ${a.id}`, T0 + OUTPOST.resetMs + 1);
  assert.ok(a.outpost.h);
});

test('compiling a Stock harvester costs credits and that kind\'s code', () => {
  const s = fresh();
  s.server.credits = 500;
  s.materials.kernel = OUTPOST.compile.code; s.salvage.push({ name: 'Signal Key' }); command(s, 'developer salvage 5');
  command(s, 'outpost compile tap');
  assert.equal(harvesters(s).length, 0, 'no plan');
  s.materials.kernel = 0; s.salvage = [];
  learnPlan(s, 'tap');
  assert.ok(knowsPlan(s, 'tap'));
  command(s, 'outpost compile tap');
  assert.equal(harvesters(s).length, 0, 'no kernel code');
  s.materials.kernel = OUTPOST.compile.code;
  command(s, 'outpost compile tap');
  assert.equal(harvesters(s).length, 0, 'no Signal Key');
  s.salvage.push({ name: 'Signal Key' });
  command(s, 'outpost compile tap');
  assert.equal(harvesters(s).length, 0, 'and some salvage');
  command(s, 'developer salvage 5');
  command(s, 'outpost compile tap');
  assert.equal(harvesters(s).length, 1);
  assert.equal(harvesters(s)[0].traits.length, 0);
  assert.equal(s.materials.kernel, 0);
  assert.equal(s.server.credits, 500 - OUTPOST.compile.credits);
});

test('a v23 save gets site traits and an empty harvester rack', () => {
  const s = fresh();
  const a = found(s);
  delete a.trait;
  delete s.harvesters;
  const back = restore(JSON.parse(JSON.stringify({ ...s, version: 23 })));
  assert.equal(back.version, SAVE_VERSION);
  assert.deepEqual(back.harvesters, []);
  assert.equal(back.locations[0].trait, siteTrait(a));
});

test('a Honeytoken draws trouble to its outpost (sooner and first) and pays double for beating it', async () => {
  const { launch } = await import('./dist/fleet.mjs');
  const { infestWon } = await import('./dist/outpost.mjs');
  const s = fresh();
  s.server.level = 20; s.serverXp = 1e9;
  const a = found(s), b = found(s);
  a.takenOver = b.takenOver = true;
  s.harvesters = [siphon(), siphon()];
  command(s, `outpost install ${a.id}`, T0);
  command(s, `outpost install ${b.id}`, T0);
  b.mods = ['lure'];
  for (let i = 0; i < 6; i++) { s.fleet = null; assert.equal(launch(s).target, b.id, 'swarms pick the Honeytoken'); }
  // Infestations: sooner with a lure out there, and on it.
  s.fleet = null;
  s.net = {};
  const { tickOutposts } = await import('./dist/outpost.mjs');
  for (let m = 1; m <= 50 && !b.outpost.infest; m++) tickOutposts(s, T0 + m * 60000, 60000); // logged on, a minute at a time
  assert.ok(b.outpost.infest && !a.outpost.infest, 'an infestation within 50 minutes, on the Honeytoken');
  // Clearing it pays double: two hours of harvest instead of one.
  b.outpost.stock = 0;
  b.outpost.infest.count = 1;
  infestWon(s, { infest: b.id });
  const lured = b.outpost.stock;
  a.outpost.stock = 0;
  a.outpost.infest = { total: 1, count: 1, left: 1e6, seed: 1 };
  infestWon(s, { infest: a.id });
  assert.ok(lured > a.outpost.stock, `${lured} vs ${a.outpost.stock}`);
});

test('plans: your first vault holds the Siphon plan; a known plan banked again is salvage', async () => {
  const { vaultPlan, learnPlan, knowsPlan, plansOf } = await import('./dist/outpost.mjs');
  assert.equal(vaultPlan({ starter: true, seed: 1 }), 'siphon');
  assert.equal(vaultPlan({ rogue: {}, seed: 1 }), null);
  const s = fresh();
  assert.ok(!knowsPlan(s, 'siphon'));
  learnPlan(s, 'siphon');
  assert.ok(knowsPlan(s, 'siphon'));
  const n = s.salvage.length;
  learnPlan(s, 'siphon');
  assert.equal(plansOf(s).length, 1);
  assert.equal(s.salvage.length, n + 2);
});

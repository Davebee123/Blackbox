// The firewall (firewall.mjs): a level you build, fragmentation, defrag, hardening.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, hooks } from './dist/combat.mjs';
import { FIREWALL, fwOf, effLevel, fragment, tickFirewall, upgradeCost } from './dist/firewall.mjs';
import { wallBands } from './dist/invasion.mjs';
import { items } from './dist/hidden.mjs';

const MIN = 60000;
const at = (t) => { hooks.now = () => t; };

test('it starts at level 1 and only goes up when you pay for it', () => {
  const s = fresh();
  assert.equal(fwOf(s).level, 1);
  command(s, 'developer server 20');
  assert.equal(effLevel(s), 1, 'a higher server level adds nothing');
  const c = upgradeCost(1);
  s.server.credits = c.credits; s.materials = { cipher: c.cipher };
  command(s, 'firewall upgrade');
  assert.equal(fwOf(s).level, 2);
  assert.equal(s.server.credits, 0); assert.equal(s.materials.cipher, 0);
  command(s, 'firewall upgrade');
  assert.equal(fwOf(s).level, 2, 'not without the price');
  assert.equal(wallBands(s).blocks, 2, 'it blocks its own level');
});

test('an old save starts the firewall where its wall blocked', () => {
  const s = fresh();
  command(s, 'developer server 10');
  s.services = { firewall: 3 };
  delete s.firewall;
  assert.equal(fwOf(s).level, 17, 'a v3 Firewall on a level-10 server blocked up to level 17');
});

test('threats fragment it, a level per 4 blocks; a defrag costs credits, runs weaker, then restores it', async () => {
  const { defragCost } = await import('./dist/firewall.mjs');
  const s = fresh(); at(0);
  fwOf(s).level = 10;
  fragment(s, 'breach'); fragment(s, 'siege');
  assert.equal(fwOf(s).frag, 5);
  assert.equal(effLevel(s, 0), 9);
  s.server.credits = 0;
  command(s, 'defrag', 0);
  assert.equal(fwOf(s).defragUntil, 0, 'not without the credits');
  const price = defragCost(fwOf(s));
  assert.equal(price, 5 * 13, '(3 + level) a fragmented block');
  s.server.credits = price;
  command(s, 'defrag', 0);
  assert.equal(s.server.credits, 0);
  assert.equal(effLevel(s, 1000), 9 - FIREWALL.defragLoss, 'weaker while it runs');
  at(FIREWALL.defragMs);
  tickFirewall(s, FIREWALL.defragMs);
  assert.equal(fwOf(s).frag, 0);
  assert.equal(effLevel(s, FIREWALL.defragMs), 10);
  for (let i = 0; i < 20; i++) fragment(s, 'breach');
  assert.equal(fwOf(s).frag, FIREWALL.blocks, 'never past the grid');
  hooks.now = null;
});

test('harden.sh: +3 levels for 8 hours, one script each', () => {
  const s = fresh(); at(0);
  fwOf(s).level = 4;
  command(s, 'firewall harden', 0);
  assert.equal(effLevel(s, 0), 4, 'no script, no hardening');
  items(s).harden = 1;
  command(s, 'firewall harden', 0);
  assert.equal(items(s).harden, 0);
  assert.equal(effLevel(s, 7 * 60 * MIN), 7);
  assert.equal(effLevel(s, 8 * 60 * MIN + 1), 4, 'and then it wears off');
  hooks.now = null;
});

test('filters: rolled gear for the firewall, in slots from the Firewall service', async () => {
  const { rollFilter, addFilter, filtersOf, equipped, vaultFilter } = await import('./dist/filters.mjs');
  const { seeded } = await import('./dist/gear.mjs');
  const s = fresh();
  fwOf(s).level = 5;
  const f = rollFilter(seeded(3), { level: 20, rarity: 'tuned' });
  assert.equal(f.kind, 'filter');
  assert.ok(f.stats.strength >= 1);
  assert.ok(Object.keys(f.stats).length >= 2, 'a blue has an affix');
  addFilter(s, f);
  command(s, 'filter equip 1');
  assert.equal(equipped(s).length, 0, 'no Firewall service, no slots');
  s.services = { firewall: 1 };
  command(s, 'filter equip 1');
  assert.equal(equipped(s).length, 1);
  assert.equal(effLevel(s), 5 + f.stats.strength, 'its strength adds levels');
  addFilter(s, rollFilter(seeded(4), { level: 20 }));
  command(s, 'filter equip 2');
  assert.equal(equipped(s).length, 1, 'one slot at v1');
  command(s, 'filter scrap 1');
  assert.equal(filtersOf(s).length, 1);
  assert.equal(equipped(s).length, 0, 'scrapping takes it out');
  // A family filter counts only against that family; fragmentation filters slow the wear.
  s.filters = { held: [{ kind: 'filter', rarity: 'tuned', level: 10, name: 'Compacted Packet Filter of Wormguard', stats: { strength: 1, worm: 3, frag: 50 } }], on: [0] };
  assert.equal(effLevel(s, undefined, 'worm'), 9);
  assert.equal(effLevel(s, undefined, 'ghostroot'), 6);
  fragment(s, 'breach');
  assert.equal(fwOf(s).frag, 1.5, 'half the wear');
  // Some vaults hold one, fixed by the server's seed.
  const loc = { seed: 0, level: 12 };
  for (; loc.seed < 200 && !vaultFilter(loc); loc.seed++);
  assert.ok(vaultFilter(loc), 'about one vault in seven');
  assert.deepEqual(vaultFilter(loc), vaultFilter({ ...loc }), 'the same every time');
});

test('a filter pulled from a vault is banked when you jack out', async () => {
  const { filtersOf } = await import('./dist/filters.mjs');
  const { play } = await import('./dist/run.mjs');
  const s = fresh();
  command(s, 'developer location worm');
  play(s, 'connect ' + s.locations[0].id);
  s.run.pack.push({ kind: 'filter', name: 'filter.flt', filter: { kind: 'filter', rarity: 'stock', level: 3, name: 'Packet Filter', stats: { strength: 1 } } });
  play(s, 'jack out');
  assert.equal(filtersOf(s).length, 1);
  assert.equal(filtersOf(s)[0].name, 'Packet Filter');
});

test('squelch: the next invasion comes now for Kernel code, and once it is dealt with a quiet period follows', async () => {
  const { tickNetwork } = await import('./dist/invasion.mjs');
  const { CONFIG } = await import('./dist/data.mjs');
  const s = fresh();
  command(s, 'developer location worm');
  fwOf(s).level = 20; // it will be blocked on the spot
  s.clock = 0; tickNetwork(s, 0);
  s.materials = { kernel: 0 };
  command(s, 'squelch');
  assert.ok(!s.logs.some((e) => /Squelch:/.test(e.message)), 'not without Kernel code');
  s.materials.kernel = 2;
  command(s, 'squelch');
  assert.equal(s.materials.kernel, 0, '2 Kernel at level 1');
  assert.equal(s.invasion, null, 'met at the wall at once, and stopped');
  assert.ok(s.logs.some((e) => /Squelch:/.test(e.message)));
  assert.equal(s.net.next, CONFIG.invasion.safeMs, 'then a safe period');
});

test('every outpost has its own firewall at its server\'s level; natives it blocks bounce, ones it contests are worn down', async () => {
  const { fwAt } = await import('./dist/firewall.mjs');
  const { tickOutposts, OUTPOST, squelchOutpost: baitOutpost } = await import('./dist/outpost.mjs');
  const s = fresh();
  command(s, 'developer location worm');
  const a = s.locations[0];
  a.level = 8; a.takenOver = true;
  s.harvesters = [{ kind: 'siphon', level: 8, traits: [] }];
  command(s, `outpost install ${a.id}`, 0);
  s.materials = { kernel: 20 };
  assert.equal(fwAt(s, a).level, 8, 'it comes with the server');
  baitOutpost(s, a, 0);
  assert.equal(a.outpost.siege, null, 'natives at its level bounce');
  assert.ok(a.outpost.quietUntil > 0, 'and a quiet period follows the squelch');
  assert.equal(s.materials.kernel, 20 - 3, 'Kernel code by its level (lv 8: 3)');
  fwAt(s, a).level = 3; a.outpost.quietUntil = 0;
  baitOutpost(s, a, 0);
  assert.ok(a.outpost.siege && a.outpost.siege.hp === 1, 'a weaker firewall lets them in');
  command(s, `firewall upgrade ${a.id}`);
  s.server.credits = 9999; s.materials = { cipher: 999, kernel: 0 };
  for (let i = 0; i < 4; i++) command(s, `firewall upgrade ${a.id}`);
  assert.equal(fwAt(s, a).level, 7);
  a.outpost.at = 0;
  tickOutposts(s, 60000, 60000);
  assert.ok(!a.outpost.siege || a.outpost.siege.hp < 1, 'contested: worn down');
  for (let t = 2; t < 10 && a.outpost.siege; t++) tickOutposts(s, t * 60000, 60000);
  assert.equal(a.outpost.siege, null);
  assert.ok(!a.outpost.lockdown, 'the firewall wore them down before the timer ran out');
});

test('a hub you hold: its swarm comes at the hub\'s level, never yours', async () => {
  const { tickRetake, HUBS } = await import('./dist/hubs.mjs');
  const { FACTIONS } = await import('./dist/factions.mjs');
  const s = fresh();
  command(s, 'developer level 40');
  s.hubs = { kestrel: { id: 'hub-kestrel', faction: 'kestrel', stock: {}, captured: { at: 0 } } };
  s.standing = { halcyon: 10, kestrel: -100 }; // Hostile: it wants its hub back
  s.net = { retakeAt: 0 };
  tickRetake(s, 1000, false, 1);
  assert.ok(s.retake, 'a swarm sets out');
  assert.equal(s.retake.level, FACTIONS.kestrel.hub.level + HUBS.levelUp);
});

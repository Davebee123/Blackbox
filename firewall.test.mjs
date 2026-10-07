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
  s.server.credits = c.credits; s.materials = { cipher: c.cipher, worm: c.worm, kernel: c.kernel };
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

test('every outpost has its own firewall at its server\'s level; natives it blocks bounce, ones it contests are worn down', async () => {
  const { fwAt } = await import('./dist/firewall.mjs');
  const { OUTPOST, startSiege } = await import('./dist/outpost.mjs');
  const s = fresh();
  command(s, 'developer location worm');
  const a = s.locations[0];
  a.level = 8; a.takenOver = true;
  s.harvesters = [{ kind: 'siphon', level: 8, traits: [] }];
  command(s, `outpost install ${a.id}`, 0);
  s.materials = { kernel: 20 };
  assert.equal(fwAt(s, a).level, 8, 'it comes with the server');
  const { tickFleet } = await import('./dist/fleet.mjs');
  const arrive = () => { startSiege(s, a); tickFleet(s, 0, false, s.fleet.arriveAt); };
  arrive();
  assert.equal(s.fleet, null, 'natives at its level bounce off its firewall');
  fwAt(s, a).level = 3;
  arrive();
  assert.ok(s.fleet?.state === 'siege', 'a weaker firewall lets them in');
  const ships = s.fleet.ships;
  command(s, `firewall upgrade ${a.id}`);
  s.server.credits = 9999; s.materials = { cipher: 999, worm: 999, kernel: 999 };
  for (let i = 0; i < 4; i++) command(s, `firewall upgrade ${a.id}`);
  assert.equal(fwAt(s, a).level, 7);
  s.fleet.siegeLeft = 60 * 60000; // time enough to see the wearing down
  for (let t = 1; t < 60 && s.fleet; t++) tickFleet(s, 60000, false, s.fleet?.arriveAt + t * 60000);
  assert.equal(s.fleet, null, `contested: the firewall wore all ${ships} down`);
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

test('the server losing Integrity wears its firewall: a block for every 5% of max lost', async () => {
  const { wear } = await import('./dist/firewall.mjs');
  const s = fresh();
  fwOf(s).level = 5;
  s.server.max = 100;
  wear(s, 4);
  assert.equal(fwOf(s).frag, 0, 'under 5%: nothing yet');
  wear(s, 1);
  assert.equal(fwOf(s).frag, 1);
  wear(s, 20);
  assert.equal(fwOf(s).frag, 5);
});

test('away: a long passive clock (one invasion every 2-4 hours); open ports speeds them up online', async () => {
  const { tickNetwork, AWAY } = await import('./dist/invasion.mjs');
  const T0 = 1_800_000_000_000;
  const s = fresh();
  command(s, 'developer location worm');
  fwOf(s).level = 30;
  tickNetwork(s, T0);
  tickNetwork(s, T0 + 8 * 3600000);
  const n = s.logs.filter((e) => e.type === 'invader').length;
  assert.ok(n >= 2 && n <= 4, `2-4 in eight hours away (${n})`);
  // Open ports: online, the next one comes 2.5× sooner; logging off closes them.
  const o = fresh();
  command(o, 'developer location worm');
  tickNetwork(o, T0);
  o.net.next = 10 * 60000;
  command(o, 'open ports');
  assert.equal(o.net.open, true);
  assert.equal(o.net.next, 4 * 60000);
  tickNetwork(o, T0 + 3 * 3600000);
  assert.equal(o.net.open, false, 'closed while you were away');
  assert.ok(AWAY.everyMs[0] >= 2 * 3600000);
});

test('major versions every 10 levels: the upgrade into one takes an Exploit, and each brings a perk', async () => {
  const { versionOf, upgradeCost, defragMs, FIREWALL } = await import('./dist/firewall.mjs');
  const { slotsOf } = await import('./dist/filters.mjs');
  assert.equal(versionOf(9), 1); assert.equal(versionOf(10), 2); assert.equal(versionOf(20), 3);
  assert.equal(upgradeCost(8).exploit, undefined);
  assert.deepEqual(upgradeCost(9), { credits: (15 + 90) * 3, cipher: 11 * 2, worm: 5 * 2, kernel: 5 * 2, exploit: 1, major: true });
  const s = fresh();
  fwOf(s).level = 9;
  s.server.credits = 9999; s.materials = { cipher: 99, worm: 99, kernel: 99, exploit: 0 };
  command(s, 'firewall upgrade');
  assert.equal(fwOf(s).level, 9, 'a new version needs an Exploit');
  s.materials.exploit = 1;
  command(s, 'firewall upgrade');
  assert.equal(fwOf(s).level, 10);
  assert.ok(s.logs.some((e) => /version 2: Defrag 30% faster/.test(e.message)));
  assert.equal(defragMs(s), Math.round(FIREWALL.defragMs * 0.7), 'v2: defrag 30% faster');
  assert.equal(slotsOf(s), 0, 'no slots yet without the service');
  fwOf(s).level = 20;
  assert.equal(slotsOf(s), 1, 'v3: a filter slot of its own');
  s.services = { firewall: 2 };
  assert.equal(slotsOf(s), 3, 'on top of the service\'s');
});

test('crafting a filter: a Tuned one at your level, built around the stat you pick', async () => {
  const { filtersOf, filterCost } = await import('./dist/filters.mjs');
  const s = fresh();
  command(s, 'developer level 10');
  const c = filterCost(10);
  s.server.credits = c.credits; s.materials = { cipher: c.code.cipher };
  command(s, 'filter craft grind');
  assert.equal(filtersOf(s).length, 0, 'not without salvage');
  command(s, 'developer salvage 4');
  command(s, 'filter craft grind');
  assert.equal(filtersOf(s).length, 0, 'not without its recipe');
  const { learnFilter } = await import('./dist/filters.mjs');
  learnFilter(s, 'grind');
  command(s, 'filter craft grind');
  const f = filtersOf(s)[0];
  assert.equal(f.rarity, 'tuned'); assert.equal(f.level, 10);
  assert.ok(f.stats.grind > 0, 'built around the stat you picked');
  assert.equal(s.server.credits, 0); assert.equal(s.materials.cipher, 0); assert.equal(s.salvage.length, 0);
});

test('the threat rail lists what is coming, hottest and soonest first', async () => {
  const { threatsOf } = await import('./dist/view.mjs');
  const s = fresh();
  command(s, 'developer location worm');
  assert.deepEqual(threatsOf(s), [], 'nothing yet');
  s.net.next = 5 * 60000;
  assert.equal(threatsOf(s)[0].name, 'Next invasion');
  s.invasion = { id: 'inv1', name: 'SPLINTER', level: 3, state: 'breach', hp: 0.6, left: 0, total: 1 };
  const list = threatsOf(s);
  assert.equal(list[0].name, 'SPLINTER', 'a breach first');
  assert.equal(list[0].cls, 'hot');
  assert.ok(!list.some((x) => x.name === 'Next invasion'), 'one at a time: the next waits for this one');
});

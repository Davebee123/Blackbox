// The firewall (firewall.mjs): a base that follows your network, tiers you buy on top, fragmentation, defrag, hardening.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, hooks } from './dist/combat.mjs';
import { FIREWALL, fwOf, effLevel, fragment, tickFirewall, upgradeCost, tierCost, baseOf, fwLevel, BASE_GAP, TIERS } from './dist/firewall.mjs';
import { wallBands } from './dist/invasion.mjs';
import { items } from './dist/hidden.mjs';

const MIN = 60000;
const at = (t) => { hooks.now = () => t; };

test('the base follows your network: the highest attached server less 2; tiers buy +1 to +6 on top', () => {
  const s = fresh();
  assert.equal(baseOf(s), 1, 'nothing attached: level 1, never less');
  command(s, 'developer location worm');
  command(s, 'developer location ransomware');
  s.locations[0].level = 12; s.locations[1].level = 7;
  assert.equal(baseOf(s), 12 - BASE_GAP);
  command(s, 'developer server 20');
  assert.equal(effLevel(s), 10, 'your server level adds nothing');
  const c = upgradeCost(s);
  assert.deepEqual(c, tierCost(1, baseOf(s)));
  s.server.credits = c.credits; s.materials = { cipher: c.cipher, worm: c.worm, kernel: c.kernel };
  command(s, 'firewall upgrade');
  assert.equal(fwOf(s).plus, 1);
  assert.equal(fwLevel(s), baseOf(s) + 1);
  assert.equal(s.server.credits, 0); assert.equal(s.materials.cipher, 0);
  command(s, 'firewall upgrade');
  assert.equal(fwOf(s).plus, 1, 'not without the price');
  // A bigger server on your network and the wall follows, for free; the tier stays on top.
  s.locations[1].level = 20;
  assert.equal(fwLevel(s), 20 - BASE_GAP + 1);
  assert.equal(wallBands(s).blocks, effLevel(s), 'it blocks its own level');
});

test('tier prices: cheap at first, a goal at the top, signatures from +3; +6 is the most', () => {
  const B = 10, total = (n) => Array.from({ length: n }, (_, i) => tierCost(i + 1, B).credits).reduce((a, b) => a + b, 0);
  assert.equal(tierCost(1, B).credits, 85);
  assert.ok(total(2) < 300, 'a margin of 2 is about an hour of income at level 10');
  assert.ok(total(TIERS) > 1500, 'the full margin is a long goal');
  assert.equal(tierCost(2, B).sigs, undefined);
  assert.equal(tierCost(3, B).sigs, 3);
  assert.equal(tierCost(6, B).sigs, 12);
  assert.ok(tierCost(1, 30).credits > tierCost(1, 10).credits, 'a tier on a bigger base costs more');
  const s = fresh();
  fwOf(s).plus = TIERS;
  assert.equal(upgradeCost(s), null);
  command(s, 'firewall upgrade');
  assert.match(s.logs.at(-1).message, /\+6, the most/);
});

test('old saves: a climbed wall becomes the tier nearest its margin over the new base, and the excess comes back', async () => {
  const { restore } = await import('./dist/combat.mjs');
  const s = fresh();
  command(s, 'developer location worm');
  s.locations[0].level = 12;
  const old = JSON.parse(JSON.stringify(s));
  old.version = 32;
  old.firewall = { level: 14, frag: 0, defragUntil: 0, hardenUntil: 0 };
  old.server.credits = 0; old.materials = { cipher: 0, worm: 0, kernel: 0, exploit: 0 };
  const r = restore(old);
  assert.equal(r.firewall.plus, 4, 'level 14 over a base of 10');
  assert.equal(r.firewall.level, undefined);
  assert.ok(r.server.credits > 400, `the climb to 14 cost more than +4 does now: ${r.server.credits} credits back`);
  assert.equal(r.materials.exploit, 1, 'the Exploit level 10 took');
  assert.ok(r.logs.some((e) => /became \+4/.test(e.message)));
  // A wall far over its base keeps +6 and refunds the rest; one under its base becomes +0.
  const hi = JSON.parse(JSON.stringify(old)); hi.firewall.level = 30;
  assert.equal(restore(hi).firewall.plus, 6);
  const lo = JSON.parse(JSON.stringify(old)); lo.firewall.level = 3;
  assert.equal(restore(lo).firewall.plus, 0);
});

test('threats fragment it, a level per 4 blocks; a defrag costs credits, runs weaker, then restores it', async () => {
  const { defragCost } = await import('./dist/firewall.mjs');
  const s = fresh(); at(0);
  fwOf(s).pin = 10;
  fragment(s, 'breach'); fragment(s, 'breach'); fragment(s, 'siege'); fragment(s, 'blocked');
  assert.equal(fwOf(s).frag, 5, 'a breach two blocks, a siege one, a block nothing');
  assert.equal(effLevel(s, 0), 9);
  s.server.credits = 0;
  command(s, 'defrag', 0);
  assert.equal(fwOf(s).defragUntil, 0, 'not without the credits');
  const price = defragCost(s);
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
  fwOf(s).pin = 4;
  command(s, 'firewall harden', 0);
  assert.equal(effLevel(s, 0), 4, 'no script, no hardening');
  items(s).harden = 1;
  command(s, 'firewall harden', 0);
  assert.equal(items(s).harden, 0);
  assert.equal(effLevel(s, 7 * 60 * MIN), 7);
  assert.equal(effLevel(s, 8 * 60 * MIN + 1), 4, 'and then it wears off');
  hooks.now = null;
});

test('filters: rolled gear for the firewall, in its two slots (and one more at tiers +1, +3 and +5)', async () => {
  const { rollFilter, addFilter, filtersOf, equipped, vaultFilter } = await import('./dist/filters.mjs');
  const { seeded } = await import('./dist/gear.mjs');
  const s = fresh();
  fwOf(s).pin = 5;
  const f = rollFilter(seeded(3), { level: 20, rarity: 'tuned' });
  assert.equal(f.kind, 'filter');
  assert.ok(f.stats.strength >= 1);
  assert.ok(Object.keys(f.stats).length >= 2, 'a blue has an affix');
  addFilter(s, f);
  command(s, 'filter equip 1');
  assert.equal(equipped(s).length, 1, 'the wall has two slots of its own (the Filter Bay folded into it)');
  assert.equal(effLevel(s), 5 + f.stats.strength, 'its strength adds levels');
  addFilter(s, rollFilter(seeded(4), { level: 20 }));
  addFilter(s, rollFilter(seeded(5), { level: 20 }));
  command(s, 'filter equip 2');
  command(s, 'filter equip 3');
  assert.equal(equipped(s).length, 2, 'two slots at +0');
  command(s, 'filter unequip 2');
  command(s, 'filter scrap 3');
  command(s, 'filter scrap 1');
  assert.equal(filtersOf(s).length, 1);
  assert.equal(equipped(s).length, 0, 'scrapping takes it out');
  // A family filter counts only against that family; fragmentation filters slow the wear.
  s.filters = { held: [{ kind: 'filter', rarity: 'tuned', level: 10, name: 'Compacted Packet Filter of Wormguard', stats: { strength: 1, worm: 3, frag: 50 } }], on: [0] };
  assert.equal(effLevel(s, undefined, 'worm'), 9);
  assert.equal(effLevel(s, undefined, 'ghostroot'), 6);
  fragment(s, 'breach');
  assert.equal(fwOf(s).frag, 1, 'half the wear');
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

test('every outpost has its own firewall based on its server\'s level; natives it blocks bounce, ones it contests are worn down', async () => {
  const { fwAt } = await import('./dist/firewall.mjs');
  const { OUTPOST, startSiege } = await import('./dist/outpost.mjs');
  const s = fresh();
  command(s, 'developer location worm');
  const a = s.locations[0];
  a.level = 8; a.takenOver = true;
  command(s, `developer outpost ${a.id}`, 0);
  s.materials = { kernel: 20 };
  const { fwLevel: lvAt } = await import('./dist/firewall.mjs');
  assert.equal(lvAt(s, a), 8, 'it comes with the server, at its level');
  const { tickFleet } = await import('./dist/fleet.mjs');
  const arrive = () => { startSiege(s, a); tickFleet(s, 0, false, s.fleet.arriveAt); };
  arrive();
  assert.equal(s.fleet, null, 'natives at its level bounce off its firewall');
  fwAt(s, a).pin = 3;
  arrive();
  assert.ok(s.fleet?.state === 'siege', 'a weaker firewall lets them in');
  const ships = s.fleet.ships;
  command(s, `firewall upgrade ${a.id}`);
  s.server.credits = 9999; s.materials = { cipher: 999, worm: 999, kernel: 999 };
  s.sigs = 99;
  for (let i = 0; i < 4; i++) command(s, `firewall upgrade ${a.id}`);
  assert.equal(fwAt(s, a).plus, 4);
  assert.equal(lvAt(s, a), 7, 'its base and four tiers');
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
  const { retakeOf } = await import('./dist/hubs.mjs');
  assert.ok(retakeOf(s), 'a swarm sets out');
  assert.equal(retakeOf(s).level, FACTIONS.kestrel.hub.level + HUBS.levelUp);
});

test('fragmentation comes from events: Integrity lost wears nothing, an upgrade leaves the firewall whole', async () => {
  const { wear } = await import('./dist/firewall.mjs');
  const s = fresh(); at(0);
  fwOf(s).pin = 5;
  wear(s, 50);
  assert.equal(fwOf(s).frag, 0, 'a hit in a home fight or a chip no longer fragments it');
  fwOf(s).frag = 6; fwOf(s).defragUntil = 1000;
  const c = upgradeCost(s);
  s.server.credits = c.credits; s.materials = { cipher: c.cipher, worm: c.worm, kernel: c.kernel };
  command(s, 'firewall upgrade', 0);
  assert.equal(fwOf(s).plus, 1);
  assert.equal(fwOf(s).frag, 0, 'the upgrade clears fragmentation');
  assert.equal(fwOf(s).defragUntil, 0, 'and a defrag it no longer needs');
  assert.ok(s.logs.at(-1).message.includes('Every block is whole again'));
  hooks.now = null;
});

test('harden.sh can be written from 6 signatures when you hold no script', async () => {
  const s = fresh(); at(0);
  fwOf(s).pin = 4;
  s.sigs = 5;
  command(s, 'firewall harden', 0);
  assert.equal(effLevel(s, 0), 4, 'not enough signatures');
  assert.match(s.logs.at(-1).message, /6 signatures/);
  s.sigs = 7;
  command(s, 'firewall harden', 0);
  assert.equal(s.sigs, 1);
  assert.equal(effLevel(s, 0), 7);
  items(s).harden = 1;
  command(s, 'firewall harden', 0);
  assert.equal(items(s).harden, 0, 'a script you hold goes first');
  assert.equal(s.sigs, 1);
  hooks.now = null;
});

test('away: a long passive clock (one invasion every 2-4 hours); open ports speeds them up online', async () => {
  const { tickNetwork, AWAY } = await import('./dist/invasion.mjs');
  const T0 = 1_800_000_000_000;
  const s = fresh();
  command(s, 'developer location worm');
  fwOf(s).pin = 30;
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

test('tier perks: +1, +3 and +5 a filter slot and +5% max Integrity each, +2 defrags faster, +4 fragments slower, +6 a longer harden.sh', async () => {
  const { defragMs, tierPerk, TIER_PERKS } = await import('./dist/firewall.mjs');
  const { slotsOf } = await import('./dist/filters.mjs');
  assert.deepEqual(TIER_PERKS.map((p) => `${p.tier}${p.perk}`), ['1slot', '1raid', '2defrag', '3slot', '3raid', '4wear', '5slot', '5raid', '6harden']);
  const s = fresh();
  fwOf(s).pin = 9;
  s.server.credits = 99999; s.materials = { cipher: 999, worm: 999, kernel: 999, exploit: 0 };
  const base = s.server.max;
  command(s, 'firewall upgrade');
  assert.equal(s.server.max, base + Math.round(base * 0.05), '+1: the RAID Array\'s +5% max Integrity lives on the wall now');
  assert.equal(slotsOf(s), 3, '+1: a third filter slot');
  command(s, 'firewall upgrade');
  assert.equal(fwOf(s).plus, 2);
  assert.ok(s.logs.at(-1).message.includes('30% faster defrag'));
  assert.equal(defragMs(s), Math.round(FIREWALL.defragMs * 0.7), '+2: defrag 30% faster');
  s.sigs = 2;
  command(s, 'firewall upgrade');
  assert.equal(fwOf(s).plus, 2, '+3 takes signatures, which only invasions pay');
  s.sigs = 3;
  command(s, 'firewall upgrade');
  assert.equal(fwOf(s).plus, 3);
  assert.equal(s.sigs, 0);
  assert.equal(slotsOf(s), 4, '+3: one more');
  fwOf(s).plus = 6;
  assert.equal(slotsOf(s), 5);
  assert.equal(tierPerk(s, 'raid'), 3, '+15% max Integrity at +5 and up, what a RAID Array v3 gave');
  assert.equal(tierPerk(s, 'harden'), 1);
  assert.equal(tierPerk(s, 'wear'), 1);
});

test('crafting a filter: a Tuned one at your level, built around the stat you pick', async () => {
  const { filtersOf, filterCost } = await import('./dist/filters.mjs');
  const s = fresh();
  command(s, 'developer level 10');
  const c = filterCost(10);
  s.server.credits = c.credits; s.materials = { cipher: c.code.cipher };
  assert.equal(c.sigs, 3);
  s.sigs = 3;
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
  assert.equal(s.server.credits, 0); assert.equal(s.materials.cipher, 0); assert.equal(s.salvage.length, 0); assert.equal(s.sigs, 0);
  s.server.credits = c.credits; s.materials.cipher = c.code.cipher; command(s, 'developer salvage 4');
  command(s, 'filter craft grind');
  assert.equal(filtersOf(s).length, 1, 'not without signatures');
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

// Progression (docs/progression.md): one headline level, a banner for every track, catch-up for a level that
// runs long, uniques that keep up, rule affixes on every blue and yellow, the new world uniques, and the v34
// migration that folded server XP, ports, the specialty, eight services and greys away.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, addItem, loaded, restore, serverLevel, syncServer, gainXp, hackerOf, finish, UNIQUES, fxAnswer, patchDelay, gearStat, daemonVersion, SAVE_VERSION, DECODE_XP, effectLine, previewDamage } from './dist/combat.mjs';
import { CONFIG, CATCHUP, levelTarget, xpToNext, killXp, power, LOADOUT, BOSS_LOOT } from './dist/data.mjs';
import { uniqueItem, rollItem, seeded, RULES, RARITIES, BASES, baseFor, primaries, SERVICES, VERSIONS } from './dist/gear.mjs';
import { tickPlay, behindOf } from './dist/progression.mjs';
import { levelUpLines } from './dist/view.mjs';
import { knowsFilter } from './dist/filters.mjs';

// Exact numbers: no crits, no misses, flat numbers, no level gap.
Object.assign(CONFIG, { baseCrit: 0, enemyCrit: 0, misses: false, partToughness: 1, enemyRamp: 0 });
const at = (levels) => { const s = fresh(); s.hackers = Object.fromEntries(Object.entries(levels).map(([c, l]) => [c, { level: l, xp: 0 }])); s.loadout.archetype = Object.keys(levels)[0]; syncServer(s); s.server.integrity = s.server.max; return s; };
const wear = (s, it) => { const x = addItem(s, it); command(s, 'load ' + x.id); assert.ok(loaded(s).some((y) => y.id === x.id), `${it.name} loaded`); return x; };
const fight = (s, level = 10) => { selectEncounter(s, 'cryptjack', 7, { level, mutation: null }); command(s, 'engage'); s.encounter.hardened = 0; return s; };
const bare = (s) => { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null }); return s; };
const telling = (s, p, extra = {}) => { s.encounter.virus.tells = { list: [{ id: 't', kind: 'charge', name: 'Full Disk', base: 'Full Disk', part: p.id, told: true, next: s.encounter.cycle + 2, wound: 0, need: 1, hitBy: [], every: 6, count: 0, ...extra }], tier: { lead: 2, hits: 1, cap: 0.1, mult: 2, dot: 0.03 } }; };
const rule = (id, level = 20, rarity = RULES[id].tier === 'minor' ? 'tuned' : 'custom') => ({ kind: 'protocol', side: 'hacker', group: 'script', base: 'one-liner', rarity, level, stats: { signal: 1 }, affixes: [], zeroDay: null, unique: null, name: RULES[id].name, rule: id, ruleValue: RULES[id].value ? RULES[id].value[1] : undefined });

test('one level: your server is at your highest class level, with no XP of its own; its gates read that', () => {
  const s = at({ breaker: 12, bastion: 20 });
  assert.equal(serverLevel(s), 20, 'the Bastion is the highest');
  assert.equal(s.server.max, Math.round(100 * power(20)));
  assert.equal(s.serverXp, undefined);
  gainXp(s, 50, 'test');
  assert.equal(s.serverXp, undefined, 'no server XP');
  const t = at({ breaker: 19 });
  gainXp(t, xpToNext(19), 'test');
  const up = t.logs.findLast((e) => e.type === 'level-up');
  assert.equal(up.level, 20);
  assert.ok(up.gains.includes('a daemon slot') && up.gains.includes('a choice of architecture'), up.gains.join(', '));
  assert.equal(t.server.max, Math.round(100 * power(20)), 'the server grew with it');
  assert.ok(up.next.level > 20 && up.next.gains.length, 'and the banner names the next level that brings something');
  // A class under your best one levels without moving the server: no server gains on its banner.
  const u = at({ breaker: 20, bastion: 15 });
  u.loadout.archetype = 'bastion';
  gainXp(u, xpToNext(15), 'test');
  const b = u.logs.findLast((e) => e.type === 'level-up');
  assert.equal(b.level, 16);
  assert.ok(b.gains.some((g) => /^layer 3/.test(g)), 'its own tracks still count: a layer');
  assert.ok(!b.gains.includes('an outpost slot') && b.server === null, 'not the server\'s');
  const lines = levelUpLines(up);
  assert.ok(lines.length >= 3 && lines.at(-1).ghost, 'the banner: what it brings, the power line, then a ghost line for the next');
});

test('decoding pays one kill, and the first levels have no extra XP to climb', () => {
  assert.equal(DECODE_XP, 1);
  for (const L of [1, 5, 9, 12]) assert.equal(xpToNext(L), Math.round(killXp(L) * (5 + 1.2 * L)), `level ${L}`);
});

test('Behind: once a level runs past 1.25× its target of play, kills pay +50% until the level ends', () => {
  const kill = (s) => { fight(s); for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1 }); const ev = []; for (const p of s.encounter.virus.parts) if (s.encounter.phase === 'active') { command(s, 'spike ' + p.id); ev.push(...resolveCycle(s)); } return ev; };
  const s = at({ breaker: 10 }), t = at({ breaker: 10 });
  assert.equal(levelTarget(10), (CATCHUP.base + CATCHUP.per * 10) * 60000, '28 minutes at level 10');
  tickPlay(s, levelTarget(10) * CATCHUP.after - 60000);
  assert.equal(behindOf(s).on, false, 'not yet');
  tickPlay(s, 120000);
  assert.equal(behindOf(s).on, true);
  const ev = kill(s), plain = kill(t);
  const xp = (evs) => evs.filter((e) => e.type === 'xp').reduce((n, e) => n + e.amount, 0);
  const behind = ev.find((e) => e.type === 'behind');
  assert.ok(behind && ev.some((e) => e.type === 'behind-on'), 'said once, and on the spoils');
  assert.equal(xp(ev) - xp(plain), behind.amount);
  assert.equal(behind.amount, Math.round(killXp(10) * CATCHUP.bonus), '+50% of the kill');
  // Only the class you play counts the time, and a new level starts its clock over.
  const h = hackerOf(s);
  gainXp(s, xpToNext(h.level) - h.xp, 'test');
  assert.equal(behindOf(s).ms, 0);
  assert.equal(behindOf(s).on, false);
});

test('uniques keep up: their primaries are the best base at their item level times a yellow\'s 1.2, if that\'s higher', () => {
  const ev = uniqueItem(UNIQUES['eviction-notice'], 20, seeded(3));
  assert.equal(ev.base, 'zero-click', 'the best Exploit base at 20');
  const white = rollItem(seeded(3), { level: 20, rarity: 'stock', slot: 'exploit' });
  assert.ok(ev.stats.damage > white.stats.damage, `Eviction Notice at 20 (${ev.stats.damage}) beats a white (${white.stats.damage})`);
  const floor = primaries('zero-click', 20, 1.2, () => 0).damage;
  assert.ok(ev.stats.damage >= floor, 'a yellow\'s numbers at least');
  const wifi = uniqueItem(UNIQUES['neighbours-wifi'], 2, seeded(1));
  assert.ok(wifi.stats.signal >= 18, 'an early unique whose own numbers are higher keeps them');
});

test('the Resident drops each of its uniques once, then a world unique you lack (or a yellow)', () => {
  const was = BOSS_LOOT.chance;
  BOSS_LOOT.chance = 1;
  const boss = (s) => { const mark = s.serial; selectEncounter(s, 'random', 7, { level: 12, boss: 'resident' }); command(s, 'engage'); finish(s, 'victory'); return s.logs.find((e) => e.id > mark && e.type === 'drop' && /Resident drops/i.test(e.message))?.item || s.logs.find((e) => e.id > mark && e.type === 'drop' && /drops: /.test(e.message))?.item; };
  const s = at({ breaker: 12 });
  const own = Object.values(UNIQUES).filter((u) => u.sources?.some((x) => x.kind === 'boss' && x.id === 'resident')).map((u) => u.id);
  const a = boss(s), b = boss(s);
  assert.deepEqual([a.unique, b.unique].sort(), own.sort(), 'both of its own, one each');
  const c = boss(s);
  assert.ok(c.unique && !own.includes(c.unique), `then a world unique: ${c.unique}`);
  assert.ok(UNIQUES[c.unique].sources.some((x) => ['sprawl', 'vault', 'guard', 'rogue'].includes(x.kind)));
  for (const u of Object.values(UNIQUES)) s.collection[u.id] = 1;
  assert.equal(boss(s).rarity, 'custom', 'and with nothing left to find, a yellow');
  BOSS_LOOT.chance = was;
});

test('every blue carries a minor rule and every yellow a major one; one number less; the same rule twice counts once', () => {
  for (let i = 0; i < 60; i++) {
    const r = seeded(100 + i), rarity = ['stock', 'tuned', 'custom'][i % 3];
    const it = rollItem(r, { level: 1 + (i % 40), rarity });
    assert.equal(it.rule ? RULES[it.rule].tier : null, RARITIES[rarity].rule || null);
    if (rarity === 'tuned') assert.ok(it.affixes.length <= 1, 'a blue: at most one number');
    if (rarity === 'custom') assert.ok(it.affixes.length >= 2 && it.affixes.length <= 4, 'a yellow: two to four');
    if (it.rule) assert.match(effectLine(it), new RegExp(`^${RULES[it.rule].name} — `));
  }
  const blue = rollItem(seeded(7), { level: 10, rarity: 'tuned', slot: 'exploit' });
  assert.ok(blue.name.includes(RULES[blue.rule].of) || blue.affixes.some((a) => blue.name.includes(a === 'precise' ? 'Precise' : '')), `a blue's name carries its rule when it has no suffix: ${blue.name}`);
});

test('rules at work: Interrupt Handler on a part winding up a tell, Exception Handler and Abort Handler when you call one off, Double Tap counts a command twice', async () => {
  const { damageMultiplier } = await import('./dist/combat.mjs');
  const s = fight(at({ breaker: 20 }), 20);
  const p = part(s, 'pulse');
  s.encounter.virus.tells = null;
  const plain = damageMultiplier(s, p, { mine: true });
  s.encounter = null;
  wear(s, rule('interrupt-handler'));
  wear(s, { ...rule('interrupt-handler'), group: 'exploit', base: 'zero-click', ruleValue: 99 });
  fight(s, 20);
  const q = part(s, 'pulse');
  s.encounter.virus.tells = null;
  assert.equal(damageMultiplier(s, q, { mine: true }), plain, 'nothing while no tell winds up on it');
  telling(s, q);
  assert.ok(Math.abs(damageMultiplier(s, q, { mine: true }) - plain * 1.99) < 1e-6, 'the best of the two, once: +99%');
  // Answers.
  const t = at({ bastion: 20 });
  wear(t, rule('exception-handler', 40));
  wear(t, { ...rule('abort-handler', 40), group: 'proxy', base: 'onion-circuit' });
  fight(t, 20);
  t.server.integrity = 50;
  fxAnswer(t);
  assert.equal(t.encounter.shield, RULES['exception-handler'].value[1], 'a shield');
  assert.equal(t.server.integrity, 50 + RULES['abort-handler'].value[1], 'and a heal');
  // Double Tap: a command counts twice toward a burst, so one Spike calls off a charge that needs more than a Spike.
  const u = at({ breaker: 20 });
  wear(u, rule('double-tap'));
  bare(fight(u, 20));
  const r = part(u, 'pulse');
  Object.assign(r, { integrity: 500, max: 500 });
  telling(u, r, { need: Math.round(previewDamage(u, 'spike', r) * 1.6), next: u.encounter.cycle, said: u.encounter.cycle }); // in its window
  command(u, 'spike pulse'); const ev = resolveCycle(u);
  assert.ok(ev.some((e) => e.tell === 't' && e.answered), 'called off with one command');
});

test('the new world uniques: Rowhammer, Slammer, Log4Shell, Shellshock, Blue Pill, Bulletproof Host, Ctrl-C, Interrupt Vector, Spectre, Hot Reload', async () => {
  const ids = ['rowhammer', 'ctrl-c', 'slammer', 'log4shell', 'spectre', 'bulletproof-host', 'hot-reload', 'interrupt-vector', 'blue-pill', 'shellshock'];
  for (const id of ids) {
    const u = UNIQUES[id];
    assert.ok(u && u.level >= 18 && u.level <= 40, id);
    assert.ok(u.sources.every((x) => ['vault', 'rogue', 'guard'].includes(x.kind)), `${id} is a world drop`);
  }
  // Rowhammer: bare parts patch 3 cycles later.
  const a = at({ breaker: 20 });
  const before = (fight(a, 20), patchDelay(a));
  a.encounter = null;
  wear(a, uniqueItem(UNIQUES.rowhammer, 20, seeded(1)));
  fight(a, 20);
  assert.equal(patchDelay(a), before + 3);
  // Shellshock: one hit breaks two ◆.
  const b = at({ breaker: 38 });
  wear(b, uniqueItem(UNIQUES.shellshock, 38, seeded(1)));
  fight(b, 38);
  const pb = part(b, 'pulse');
  Object.assign(pb, { armor: 3, maxArmor: 3 });
  command(b, 'spike pulse'); resolveCycle(b);
  assert.equal(pb.armor, 1, 'a Spike broke two');
  // Log4Shell: a break hits the part winding up a tell.
  const c = at({ bastion: 24 }); // not a Demolitionist: its Overkill would spill on top
  wear(c, uniqueItem(UNIQUES.log4shell, 24, seeded(1)));
  bare(fight(c, 24));
  const enc = part(c, 'encryptor'), pulse = part(c, 'pulse');
  Object.assign(enc, { integrity: 500, max: 500 });
  pulse.integrity = 1;
  telling(c, enc);
  command(c, 'spike pulse'); resolveCycle(c);
  assert.equal(enc.max - enc.integrity, UNIQUES.log4shell.effect.value, 'the Encryptor, winding up, took 22');
  // Slammer: burns on a broken part jump on.
  const d = at({ infiltrator: 22 });
  wear(d, uniqueItem(UNIQUES.slammer, 22, seeded(1)));
  bare(fight(d, 22));
  const p1 = part(d, 'pulse'), p2 = part(d, 'encryptor');
  Object.assign(p2, { integrity: 500, max: 500 });
  d.encounter.burns.push({ id: 'inject', target: p1.id, damage: 3, grow: 0, left: 4, name: 'Inject', drain: 0 });
  p1.integrity = 1;
  command(d, 'spike pulse'); resolveCycle(d);
  assert.ok(d.encounter.burns.some((x) => x.target === p2.id && x.name === 'Inject'), 'the burn moved to the Encryptor');
  // Bulletproof Host: Block counts double while a tell winds up.
  const e = at({ bastion: 28 });
  const host = wear(e, uniqueItem(UNIQUES['bulletproof-host'], 28, seeded(1)));
  fight(e, 28);
  e.encounter.mode = 'run'; e.run = { integrity: 100, max: 100, pack: [] };
  e.encounter.virus.tells = null;
  const block = gearStat(e, 'reduction');
  telling(e, part(e, 'pulse'));
  assert.equal(gearStat(e, 'reduction'), block + host.stats.reduction);
  // Blue Pill: a tell landing on you deals half; a plain hit doesn't.
  const { strikeWith } = await import('./dist/combat.mjs');
  const h = at({ bastion: 34 });
  wear(h, uniqueItem(UNIQUES['blue-pill'], 34, seeded(1)));
  fight(h, 34);
  h.encounter.chits = 0; h.encounter.shield = 0;
  const hp0 = h.server.integrity;
  strikeWith(h, part(h, 'pulse'), { name: 'Full Disk', effect: 'damage', amount: 40, interval: 99, noCrit: true, tell: 't' });
  const charged = hp0 - h.server.integrity;
  strikeWith(h, part(h, 'pulse'), { name: 'Surge', effect: 'damage', amount: 40, interval: 99, noCrit: true });
  assert.ok(charged > 0 && hp0 - charged - h.server.integrity > charged * 1.6, `charged ${charged}, plain ${hp0 - charged - h.server.integrity}`);
  // Interrupt Vector and Ctrl-C: calling off a tell.
  const f = at({ bastion: 32 }), g = at({ bastion: 32 });
  wear(f, uniqueItem(UNIQUES['interrupt-vector'], 32, seeded(1)));
  wear(g, uniqueItem(UNIQUES['ctrl-c'], 32, seeded(1)));
  fight(f, 32); fight(g, 32);
  fxAnswer(f);
  assert.equal(f.encounter.shield, 30);
  g.encounter.readyAt = { firewall: g.encounter.cycle + 3 };
  fxAnswer(g);
  assert.equal(g.encounter.readyAt.firewall, g.encounter.cycle + 1, 'every cooldown 2 sooner');
});

test('v34: server XP, ports, the specialty, eight services and grey protocols fold away, refunded in kind', () => {
  const old = at({ breaker: 26, bastion: 9 });
  Object.assign(old, { version: 33, serverXp: 123456 });
  old.services = { firewall: 2, raid: 1, kernel: 2, cron: 3, uplink: 1 };
  old.install = { id: 'scrubber', v: 1, startedAt: 0, doneAt: 1, pay: {} };
  old.recipes = ['firewall', 'raid', 'kernel', 'cron', 'scrubber', 'snapshot', 'uplink', 'hotpatch'];
  old.loadout.spec = { breaker: 'chain-exploit' };
  old.stash = [
    { id: 'g1', kind: 'protocol', side: 'hacker', group: 'exploit', base: 'zero-click', rarity: 'scrap', level: 20, stats: { damage: 7, evasion: -2 }, affixes: ['leaky'], zeroDay: null, unique: null, name: 'Zero-click that Leaks' },
    { id: 'g2', kind: 'protocol', side: 'hacker', group: 'exploit', base: 'proof-of-concept', rarity: 'zeroday', level: 20, stats: { damage: 6, crit: 2 }, affixes: [], zeroDay: null, unique: 'eviction-notice', name: 'Eviction Notice' },
    { id: 'g3', kind: 'protocol', side: 'hacker', group: 'proxy', base: 'onion-circuit', rarity: 'tuned', level: 20, stats: { signal: 50, reduction: 2, crit: 4 }, affixes: ['precise'], zeroDay: null, unique: null, name: 'Precise Onion Circuit' },
  ];
  const credits = old.server.credits, worm = old.materials.worm || 0;
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.equal(s.version, SAVE_VERSION);
  assert.ok(SAVE_VERSION >= 34);
  assert.equal(s.serverXp, undefined);
  assert.equal(serverLevel(s), 26, 'your highest class level');
  assert.deepEqual(s.services, { uplink: 1 }, 'only the network services stay');
  assert.equal(s.install, null);
  assert.equal(daemonVersion(s, 'cron'), 3, 'Cron Job is a daemon now, at its version');
  assert.equal(daemonVersion(s, 'snapshot'), 1, 'a Snapshot source you held is the daemon too');
  const paid = VERSIONS[0].credits * 3 + VERSIONS[1].credits * 2 + VERSIONS[0].credits; // Filter Bay v1–v2, RAID v1, Kernel v1–v2, the Scrubber's install
  assert.equal(s.server.credits, credits + paid, 'everything they cost, back');
  assert.equal(s.materials.worm, worm + VERSIONS[0].code, 'the RAID Array\'s Worm code');
  assert.ok(knowsFilter(s, 'reduction') && knowsFilter(s, 'shield') && knowsFilter(s, 'regen'), 'their blueprints are filter recipes now');
  assert.deepEqual(s.recipes, ['uplink']);
  assert.equal(s.loadout.spec, undefined, 'the specialty is gone');
  const grey = s.stash.find((x) => x.id === 'g1');
  assert.equal(grey.rarity, 'stock');
  assert.ok(Object.values(grey.stats).every((v) => v > 0), 'no junk');
  assert.ok(s.stash.find((x) => x.id === 'g2').stats.damage > 6, 'the unique grew to the best base at its level');
  assert.ok(RULES[s.stash.find((x) => x.id === 'g3').rule]?.tier === 'minor', 'the blue got its rule');
  assert.equal(s.stash.find((x) => x.id === 'g3').stats.crit, 4, 'and kept its numbers');
  assert.ok(s.logs.some((e) => /Refunded/.test(e.message)) && s.logs.some((e) => /specialty is gone/.test(e.message)));
  assert.deepEqual(Object.keys(SERVICES), ['uplink', 'buildfarm', 'router', 'scheduler']);
  assert.ok(Object.values(BASES).some((b) => b.level === 34) && Object.values(BASES).some((b) => b.level === 42), 'and two new base tiers');
  assert.equal(baseFor('exploit', 42), 'hypervisor-escape');
  assert.equal(LOADOUT.specRanks, 2);
});

// Progression (docs/progression.md): one headline level, a banner for every track, no catch-up (Behind is gone),
// uniques that keep up, rule affixes on every blue and yellow, the new world uniques, and the v34
// migration that folded server XP, ports, the specialty, eight services and greys away.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, addItem, loaded, restore, serverLevel, syncServer, gainXp, hackerOf, finish, UNIQUES, fxAnswer, patchDelay, gearStat, daemonLevel, SAVE_VERSION, DECODE_XP, effectLine, previewDamage, bossTable } from './dist/combat.mjs';
import { CONFIG, CLIMB, levelMinutes, xpToNext, killXp, killsToNext, v41XpToNext, deedScale, DEED, power, LOADOUT, BOSS_LOOT } from './dist/data.mjs';
import { uniqueItem, rollItem, seeded, RULES, RARITIES, BASES, baseFor, primaries, SERVICES } from './dist/gear.mjs';
const VERSIONS = [{ code: 12, credits: 120 }, { code: 40, credits: 600 }]; // what a service's v1 and v2 cost (the retired table)
import { tickPlay, CRAFT_REFUND } from './dist/progression.mjs';
import { levelUpSummary } from './dist/levelup-view.mjs';

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
  assert.ok(!up.gains.includes('a choice of architecture') && !up.gains.includes('a daemon slot'), up.gains.join(', ')); // architecture went in R2
  const f = at({ breaker: 14 });
  gainXp(f, xpToNext(14), 'test');
  assert.ok(f.logs.findLast((e) => e.type === 'level-up').gains.includes('a daemon slot'), 'a daemon slot at 15 (then 30 and 45)');
  assert.equal(t.server.max, Math.round(100 * power(20)), 'the server grew with it');
  assert.ok(up.next.level > 20 && up.next.gains.length, 'and the banner names the next level that brings something');
  // A class under your best one levels without moving the server: no server gains on its banner.
  const u = at({ breaker: 20, bastion: 12 });
  u.loadout.archetype = 'bastion';
  gainXp(u, xpToNext(12), 'test');
  const b = u.logs.findLast((e) => e.type === 'level-up');
  assert.equal(b.level, 13);
  assert.ok(b.gains.some((g) => /\(floor 3\)$/.test(g)), 'its own tracks still count: a floor');
  assert.ok(!b.gains.includes('an outpost slot') && b.server === null, 'not the server\'s');
  const sum = levelUpSummary([up]);
  assert.ok(sum.items.length >= 3 && sum.items.at(-2).kind === 'power' && sum.items.at(-1).kind === 'integrity' && sum.next.level === up.next.level, 'the level-up: what it brings, the power line and the Integrity, then the next level');
});

test('the long climb: a level is CLIMB.kills kills of your level (straight between its points), always longer than the last; one-off deeds keep their share of a level', () => {
  for (const [L, k] of CLIMB.kills) assert.equal(xpToNext(L), Math.round(killXp(L) * k), `level ${L}`);
  const [[a, x], [b, y]] = [CLIMB.kills.find((p) => p[0] === 10), CLIMB.kills.find((p) => p[0] === 15)];
  assert.equal(killsToNext(12), x + ((y - x) * (12 - a)) / (b - a), 'straight between 10 and 15');
  for (let L = 2; L < LOADOUT.maxLevel; L++) assert.ok(xpToNext(L) > xpToNext(L - 1), `level ${L} takes more than ${L - 1}`);
  for (let L = 2; L < LOADOUT.maxLevel; L++) assert.ok(levelMinutes(L) >= levelMinutes(L - 1), `the pace table at ${L}`);
  // About 100 hours of real play to 50 (CLIMB.minutes), front-loaded: a farmer's pace (pacing.mjs FARM_TARGET); one who
  // works contracts earns about 1.5x the XP an hour (PACE_TARGET, the table loop.test.mjs holds the bot to).
  const hours = (to) => { let m = 0; for (let L = 1; L < to; L++) m += levelMinutes(L); return m / 60; };
  for (const [L, h] of [[5, 1], [10, 4], [20, 15], [30, 35], [40, 65], [50, 100]]) assert.ok(Math.abs(hours(L) - h) / h < 0.1, `level ${L}: ${hours(L).toFixed(1)} hours of targets`);
  assert.ok(levelMinutes(1) <= 5, 'the first level comes in minutes');
  // A deed (Mapped, takeover, Root) is its old share of a kill times DEED.share of how much longer the level is than it
  // was, never less than a kill's share. A decode, a puzzle board and a log sweep are a kill each, unscaled.
  assert.equal(deedScale(1), Math.max(1, DEED.share * (killsToNext(1) / 6.2)));
  assert.ok(deedScale(30) > 5 && deedScale(30) < 12, `level 30: ${deedScale(30)}`);
  assert.equal(DECODE_XP, 1, 'decoding is one kill');
});

test('v42: an older save keeps every class\'s level, and its XP into the level keeps its share of the new, longer level', () => {
  const old = at({ breaker: 12, bastion: 30, operator: 50, infiltrator: 1 });
  old.version = 41;
  Object.assign(old.hackers.breaker, { xp: Math.round(v41XpToNext(12) * 2 / 3) });
  Object.assign(old.hackers.bastion, { xp: v41XpToNext(30) - 1 });
  Object.assign(old.hackers.infiltrator, { xp: 0 });
  old.rested = 500;
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.equal(s.version, SAVE_VERSION);
  assert.deepEqual(Object.fromEntries(Object.entries(s.hackers).map(([c, h]) => [c, h.level])), { breaker: 12, bastion: 30, operator: 50, infiltrator: 1 }, 'nobody loses a level');
  assert.ok(Math.abs(s.hackers.breaker.xp / xpToNext(12) - 2 / 3) < 0.001, `two thirds of the way to 13 is still two thirds (${s.hackers.breaker.xp} of ${xpToNext(12)})`);
  assert.ok(s.hackers.bastion.xp < xpToNext(30) && s.hackers.bastion.xp > xpToNext(30) * 0.99, 'a point short of 31 stays just short');
  assert.equal(s.hackers.infiltrator.xp, 0);
  assert.equal(s.hackers.operator.level, 50, 'the cap stays the cap');
  assert.equal(s.rested, 500, 'rested XP is kills banked: kept');
  // A save already on v42 is left alone.
  const again = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(again.hackers.breaker.xp, s.hackers.breaker.xp);
});

test('no catch-up: a level that runs long pays its kills the same, the play clock is only kills an hour, and an old save\'s Behind fields go', () => {
  const kill = (s) => { fight(s); for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1 }); const ev = []; for (const p of s.encounter.virus.parts) if (s.encounter.phase === 'active') { command(s, 'spike ' + p.id); ev.push(...resolveCycle(s)); } return ev; };
  const s = at({ breaker: 10 }), t = at({ breaker: 10 });
  tickPlay(s, 10 * 3600000); // ten hours on a level of 48 minutes (CLIMB.minutes)
  assert.equal(s.pace.ms, 10 * 3600000, 'the play clock counts toward kills an hour');
  assert.equal(hackerOf(s).ms, undefined, 'no level clock');
  const ev = kill(s), plain = kill(t);
  const xp = (evs) => evs.filter((e) => e.type === 'xp').reduce((n, e) => n + e.amount, 0);
  assert.equal(xp(ev), xp(plain), 'a long level pays a kill the same');
  assert.ok(!ev.some((e) => /^behind/.test(e.type)), 'no Behind row or note');
  // A save from before: its level clock and once-a-level note are dropped on load.
  const old = at({ breaker: 10, bastion: 4 });
  Object.assign(old.hackers.breaker, { ms: 99 * 60000, behind: 10 });
  Object.assign(old.hackers.bastion, { ms: 5000 });
  const back = restore(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(back.hackers.breaker, { level: 10, xp: 0 });
  assert.deepEqual(back.hackers.bastion, { level: 4, xp: 0 });
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

test('the Resident drops each of its uniques once, then no unique roll at all (it drops only as an elite)', () => {
  const was = BOSS_LOOT.chance;
  BOSS_LOOT.chance = 1;
  const boss = (s) => { const mark = s.serial; selectEncounter(s, 'random', 7, { level: 12, boss: 'resident' }); command(s, 'engage'); finish(s, 'victory'); return s.logs.find((e) => e.id > mark && e.type === 'drop' && /Resident drops/i.test(e.message))?.item || s.logs.find((e) => e.id > mark && e.type === 'drop' && /drops: /.test(e.message))?.item; };
  const s = at({ breaker: 12 });
  const own = Object.values(UNIQUES).filter((u) => u.sources?.some((x) => x.kind === 'boss' && x.id === 'resident')).map((u) => u.id);
  const a = boss(s), b = boss(s);
  assert.deepEqual([a.unique, b.unique].sort(), own.sort(), 'both of its own, one each');
  const mark = s.serial, pity = s.pity?.resident || 0;
  assert.equal(boss(s), undefined, 'then nothing from its roll: no yellow, no world unique');
  assert.ok(!s.logs.some((e) => e.id > mark && /Resident drops|No unique from Resident/i.test(e.message)), 'and no message');
  assert.equal(s.pity?.resident || 0, pity, 'its pity stays put');
  assert.equal(bossTable(s, 'resident').done, true);
  assert.equal(bossTable(s, 'resident').chance, 0);
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

test('rules at work: Interrupt Handler on a part winding up a tell, Exception Handler and Abort Handler when you call one off, Double Tap opens a part you cut', async () => {
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
  // Double Tap: a move you cut leaves its part Open (+50% for 2 cycles).
  const u = at({ breaker: 20 });
  wear(u, rule('double-tap'));
  bare(fight(u, 20));
  const r = part(u, 'pulse');
  Object.assign(r, { integrity: 52, max: 100, ticks: [{ at: 0.5, spent: false }, { at: 0.25, spent: false }] });
  r.attack.due = u.encounter.cycle;
  command(u, 'spike pulse'); const ev = resolveCycle(u);
  assert.ok(ev.some((e) => e.type === 'cut' && e.cut), 'cut');
  assert.ok(r.openUntil >= u.encounter.cycle, 'and Open');
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

test('v34: server XP, ports, the specialty, eight services and grey protocols fold away, refunded in kind (and v40 the last four)', () => {
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
  assert.deepEqual(s.services, {}, 'v34 kept the network services; v40 (R2, sockets) retired them too');
  assert.equal(s.install, null);
  assert.equal(daemonLevel(s, 'cron'), 26, 'Cron Job is a daemon now, at a level from its version (v3: your level)');
  assert.equal(daemonLevel(s, 'snapshot'), 22, 'a Snapshot source you held is the daemon too (as a v1: four under)');
  const paid = VERSIONS[0].credits * 3 + VERSIONS[1].credits * 2 + VERSIONS[0].credits + VERSIONS[0].credits; // Filter Bay v1–v2, RAID v1, Kernel v1–v2, the Scrubber's install; v40 the Uplink v1
  assert.equal(s.server.credits, credits + paid + 3 * CRAFT_REFUND.filter(26), 'everything they cost, back, and (v47) the three filter recipes their blueprints became, as credits');
  assert.equal(s.materials.worm, worm + VERSIONS[0].code, 'the RAID Array\'s Worm code');
  assert.equal(s.filterRecipes, undefined, 'no recipes: crafting went (v47)');
  assert.equal(s.recipes, undefined, 'the Uplink\'s blueprint went with it');
  assert.equal(s.loadout.spec, undefined, 'the specialty is gone');
  const grey = s.stash.find((x) => x.id === 'g1');
  assert.equal(grey.rarity, 'stock');
  assert.ok(Object.values(grey.stats).every((v) => v > 0), 'no junk');
  assert.ok(s.stash.find((x) => x.id === 'g2').stats.damage > 6, 'the unique grew to the best base at its level');
  assert.ok(RULES[s.stash.find((x) => x.id === 'g3').rule]?.tier === 'minor', 'the blue got its rule');
  assert.equal(s.stash.find((x) => x.id === 'g3').stats.crit, 4, 'and kept its numbers');
  assert.ok(s.logs.some((e) => /Refunded/.test(e.message)) && s.logs.some((e) => /specialty is gone/.test(e.message)));
  assert.deepEqual(Object.keys(SERVICES), [], 'no services since R2: programs in sockets');
  assert.ok(Object.values(BASES).some((b) => b.level === 34) && Object.values(BASES).some((b) => b.level === 42), 'and two new base tiers');
  assert.equal(baseFor('exploit', 42), 'hypervisor-escape');
  assert.equal(LOADOUT.specRanks, 2);
});

// Loot v2: uniques and their effect blocks, drops, deconstructing, rewards. See the items design doc.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gearStat, fresh, command, selectEncounter, resolveCycle, part, addItem, loaded, hooks, UNIQUES, rollDrop, giveUnique, paceOf, damageMultiplier, finish } from './dist/combat.mjs';
import { uniqueItem, seeded, LOOT, BASES, STATS } from './dist/gear.mjs';
import { CONFIG } from './dist/data.mjs';
import { checkItems } from './dist/content.mjs';
import ITEMS from './dist/content/items.mjs';

CONFIG.baseCrit = 0; CONFIG.enemyCrit = 0; CONFIG.misses = false;
const wear = (s, id, level = 30) => { const it = addItem(s, uniqueItem(UNIQUES[id], level, seeded(1))); command(s, 'load ' + it.id); assert.ok(loaded(s).some((x) => x.id === it.id), `${id} loaded`); return it; };
const fight = (s, key = 'cryptjack') => { selectEncounter(s, key, 7, { level: 30, mutation: null }); command(s, 'engage'); return s; };
const vet = () => { const s = fresh(); s.hackers = { breaker: { level: 30, xp: 0 } }; return s; };

test('the written uniques have no mistakes', () => {
  assert.deepEqual(checkItems(ITEMS, BASES, STATS).filter((x) => x.bad).map((x) => x.msg), []);
  assert.equal(Object.keys(UNIQUES).length, 55); // 30, two for each of the four bosses, nine leaning toward a class, and KESSLER-FARM-00's eight
});

test('effect blocks: damage when synced, a chit and a crit at the start, half the first hit', () => {
  const s = vet();
  wear(s, 'logger-spool');
  fight(s);
  const p = part(s, 'pulse');
  const plain = damageMultiplier(s, p, { mine: true });
  s.encounter.synced = true;
  assert.ok(damageMultiplier(s, p, { mine: true }) > plain * 1.24, '+25% in a Sync Window');
  const t = vet();
  wear(t, 'gate-bypass');
  wear(t, 'cell-key');
  fight(t);
  assert.equal(t.encounter.chits, 1, 'Gate Bypass: a chit');
  assert.ok(t.encounter.forceCrit, 'Cell Key: the first hit crits');
  const u = vet();
  wear(u, 'watchdog-whitelist');
  fight(u);
  for (const x of u.encounter.virus.parts) if (x.attack) x.attack.due = 99;
  const pulse = part(u, 'pulse'); pulse.attack.due = u.encounter.cycle; pulse.attack.interval = 1;
  let hp = u.server.integrity; command(u, 'hold'); resolveCycle(u); const first = hp - u.server.integrity;
  hp = u.server.integrity; command(u, 'hold'); resolveCycle(u); const second = hp - u.server.integrity;
  assert.ok(second > first * 1.6, `first hit halved (${first} then ${second})`);
});

test('stat-x2 counts a stat double while its condition holds; break refunds; Encryption halves', () => {
  const s = vet();
  const hot = wear(s, 'hotfix');
  s.run = { loc: 'x', cwd: '/', integrity: 100, max: 100, pack: [], visited: ['/'] };
  const high = gearStat(s, 'regen', 'hacker');
  s.run.integrity = 40;
  assert.equal(gearStat(s, 'regen', 'hacker'), Math.round(high * 2 * 10) / 10, 'Hotfix: Regen doubles below half');
  assert.ok(hot.stats.regen > 0);
  s.run = null;
  const t = vet(); wear(t, 'cryptominer'); fight(t);
  t.encounter.readyAt = { overload: t.encounter.cycle + 3 };
  for (const x of t.encounter.virus.parts) Object.assign(x, { armor: 0, integrity: 1 });
  command(t, 'spike pulse'); resolveCycle(t);
  assert.ok(t.encounter.readyAt.overload <= t.encounter.cycle + 2, 'a break took a cycle off');
  const u = vet(); wear(u, 'tollgate-token'); fight(u);
  const enc = part(u, 'encryptor'); enc.attack.due = u.encounter.cycle;
  const amount = enc.attack.amount; command(u, 'hold'); resolveCycle(u);
  assert.ok(u.encounter.encrypt <= Math.ceil(amount / 2), 'half as fast');
});

test("Deadman's Switch: Signal at 0 jacks you out with your pack, then waits 90 minutes", async () => {
  await import('./dist/run.mjs');
  let t = 1_000_000; hooks.now = () => t;
  try {
    const s = vet();
    wear(s, 'deadmans-switch');
    command(s, 'developer location worm');
    const { connect } = await import('./dist/run.mjs');
    connect(s, s.locations[0].id);
    s.run.pack.push({ path: '/x', name: 'x.dat', kind: 'item', item: 'Thing' });
    const before = s.salvage.length;
    const { disconnect } = await import('./dist/combat.mjs');
    disconnect(s, 'test');
    assert.equal(s.run, null);
    assert.equal(s.salvage.length, before + 1, 'the pack was banked');
    assert.ok(s.fxCooldown['deadmans-switch'] > t, 'rearming');
  } finally { delete hooks.now; }
});

test('drops: strains have trophies, uniques come from where they drop, rewards give uniques, kills count toward pace', () => {
  const s = vet();
  const was = LOOT.trophy; LOOT.trophy = 1;
  const it = rollDrop(s, { kind: 'sprawl', strain: 'keylogger', family: 'ghostroot' }, 6);
  LOOT.trophy = was;
  assert.equal(it.unique, 'logger-spool', 'the Keylogger trophy');
  assert.equal(it.from, 'ghostroot');
  const r = giveUnique(s, 'wicks-old-toolkit');
  assert.equal(r.name, "wick's Old Toolkit");
  fight(s); for (const x of s.encounter.virus.parts) x.integrity = 0; finish(s, 'victory');
  assert.equal(s.pace.kills, 1);
  assert.equal(paceOf(s).perHour, null, 'not enough time yet');
});

test('class uniques: Tagged and burning targets, a shorter skill cooldown, and a lean toward their class', async () => {
  const { cooldownOf, uniqueFrom, UNIQUES } = await import('./dist/combat.mjs');
  const { ABILITIES } = await import('./dist/data.mjs');
  const s = vet();
  wear(s, 'tracking-pixel');
  fight(s);
  const p = part(s, 'pulse');
  const plain = damageMultiplier(s, p, { mine: true });
  p.taggedUntil = s.encounter.cycle + 2;
  assert.ok(damageMultiplier(s, p, { mine: true }) > plain * 1.24, '+25% on a Tagged part');
  const t = vet();
  t.hackers = { infiltrator: { level: 10, xp: 0 } }; t.loadout.archetype = 'infiltrator';
  assert.equal(cooldownOf(t, 'tag'), ABILITIES.tag.cooldown);
  wear(t, 'spearphish');
  assert.equal(cooldownOf(t, 'tag'), ABILITIES.tag.cooldown - 1, 'Spearphish: Tag a cycle sooner');
  assert.equal(cooldownOf(t, 'inject'), ABILITIES.inject.cooldown);
  // The lean: an Infiltrator finds Infiltrator uniques three times as often.
  const count = (cls) => {
    const x = fresh(); x.loadout.archetype = cls; x.hackers = { [cls]: { level: 12, xp: 0 } }; x.rng = 7;
    let n = 0;
    for (let i = 0; i < 3000; i++) if (['payload', 'phantom'].includes(UNIQUES[uniqueFrom(x, { kind: 'sprawl' }, 12)?.id]?.lean)) n++;
    return n;
  };
  const inf = count('infiltrator'), brk = count('breaker');
  assert.ok(inf > brk * 2, `${inf} vs ${brk}`);
});

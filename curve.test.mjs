// The compounding level curve (docs/scaling.md 1): power compounds, flat numbers keep their weight through the lift,
// an older save's items are lifted once, and events, lairs and SPRAWL-00's rooms take their place's level.
// Gear carries your power (step 2): your own numbers grow on a slow line, and gear's filled stats carry the rest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, restore, addItem, command, gearFx, effectLine, UNIQUES, addLocation, maxSignal, powerOf } from './dist/combat.mjs';
import { CONFIG, power, line, lift, lifted, filled, gearFill, own, mobPower } from './dist/data.mjs';
import { rollItem, uniqueItem, seeded, liftFx, curveRestore, STATS } from './dist/gear.mjs';
import { deal } from './dist/events.mjs';
import { zoneSpawns, ZONE_LEVEL, KING_ROOM } from './dist/run.mjs';
import { zoneOf } from './dist/zone.mjs';
import { benchCurve, build } from './dist/bench.mjs';
import { at } from './balance.mjs';

test('power compounds: 6% a level, so a mob ten levels down is about half of you; the lift carries the 4% line up to it', () => {
  assert.equal(CONFIG.powerPerLevel, 0.06);
  assert.ok(Math.abs(power(31) / power(30) - 1.06) < 1e-12, 'a level: +6%');
  assert.ok(Math.abs(mobPower(20) / power(30) - 1 / 1.06 ** 10) < 1e-12 && mobPower(20) / power(30) < 0.56, 'ten below: 0.56 of you');
  assert.equal(line(26), 2, 'the line: 4% a level, linear');
  assert.equal(lift(1), 1);
  assert.ok(Math.abs(lift(30) * line(30) - power(30)) < 1e-12);
  assert.equal(lifted(6, 1), 6, 'a flat number at level 1 is itself');
});

test('gear keeps its share of you at every level and every rate: flat stats grow with power, chances do not', () => {
  const was = CONFIG.powerPerLevel;
  const share = (rate, L) => { CONFIG.powerPerLevel = rate; const it = rollItem(seeded(7), { level: L, rarity: 'tuned', slot: 'proxy' }); return { signal: it.stats.signal / power(L), it }; };
  for (const L of [10, 30, 50]) {
    const a = share(0.06, L), b = share(0.08, L);
    assert.ok(Math.abs(a.signal / b.signal - 1) < 0.02, `level ${L}: the same share of you at 6% and 8%`);
  }
  CONFIG.powerPerLevel = was;
  const it = rollItem(seeded(3), { level: 40, rarity: 'custom', slot: 'exploit', stat: 'crit' });
  assert.ok(it.stats.crit > 0 && it.stats.crit < 40, 'a chance stays a percentage');
  assert.ok(Object.keys(STATS).filter((k) => STATS[k].flat).every((k) => k !== 'ram' || !it.stats.ram || it.stats.ram <= 3), 'RAM is not lifted');
});

test('a unique\'s flat effect is lifted at its item level, its text with it; a share is not', () => {
  const lien = UNIQUES.lien;
  assert.deepEqual([lien.level, lien.effect.do, lien.effect.value], [8, 'damage+', 6]);
  const s = fresh(); s.hackers = { breaker: { level: 30, xp: 0 } };
  const it = addItem(s, uniqueItem(lien, 30, seeded(1))); command(s, 'load ' + it.id);
  const fx = gearFx(s).find((x) => x.it?.unique === 'lien').fx;
  assert.equal(fx.value, filled(6, 30), 'Lien: +6 damage, lifted and filled at its item level');
  assert.match(effectLine(it), new RegExp(`Adds ${filled(6, 30)} damage`), 'the tooltip says the number it deals');
  assert.deepEqual(liftFx({ when: 'hit', do: 'damage%', value: 20 }, 50), { when: 'hit', do: 'damage%', value: 20 }, 'a share stays');
  assert.equal(liftFx({ do: 'stat', stat: 'reduction', value: 2, text: '+2 Block' }, 50).text, `+${lifted(2, 50)} Block`);
  assert.equal(liftFx({ do: 'stat', stat: 'crit', value: 5, text: '+5% crit' }, 50).value, 5, 'Crit is a chance');
});

test('an older save: every item\'s flat stats lifted and filled once at its level (filters lifted), keyed on s.curve; a fresh save is already on the curve', () => {
  assert.equal(fresh().curve, 2);
  const s = fresh(); delete s.curve;
  s.stash.push({ id: 'g1', kind: 'protocol', side: 'hacker', group: 'proxy', rarity: 'tuned', level: 30, stats: { signal: 100, reduction: 3, evasion: 4, ram: 1 }, affixes: [], name: 'Old Proxy', rule: 'stack-canary', ruleValue: 4 });
  s.filters = { held: [{ id: 'f1', kind: 'filter', level: 20, stats: { strength: 3, reduction: 4, frag: 20 } }], on: [] };
  const r = restore(structuredClone(s)), it = r.stash.find((x) => x.id === 'g1');
  assert.deepEqual(it.stats, { signal: filled(100, 30), reduction: lifted(3, 30), evasion: 4, ram: 1 }, 'Signal lifted and filled, Block lifted; chances and RAM as they were');
  assert.equal(it.ruleValue, filled(4, 30), 'Stack Canary\'s shield is a flat number too');
  assert.deepEqual(r.filters.held[0].stats, { strength: 3, reduction: lifted(4, 20), frag: 20 });
  assert.equal(r.curve, 2);
  const twice = structuredClone(r); curveRestore(twice);
  assert.deepEqual(twice.stash.find((x) => x.id === 'g1').stats, it.stats, 'safe to run twice');
});

test('a v54 save (already lifted): its items\' filling stats × the fill once, the rest and filters as they were', () => {
  const s = fresh(); s.curve = 1;
  s.stash.push({ id: 'g1', kind: 'protocol', side: 'hacker', group: 'proxy', rarity: 'tuned', level: 30, stats: { signal: 400, damage: 50, reduction: 9, evasion: 4 }, affixes: [], name: 'Proxy', rule: 'stack-canary', ruleValue: 20 });
  s.filters = { held: [{ id: 'f1', kind: 'filter', level: 20, stats: { reduction: 9 } }], on: [] };
  const r = restore(structuredClone(s)), it = r.stash.find((x) => x.id === 'g1'), f = gearFill(30);
  assert.deepEqual(it.stats, { signal: Math.round(400 * f), damage: Math.round(50 * f), reduction: 9, evasion: 4 });
  assert.equal(it.ruleValue, Math.round(20 * f));
  assert.deepEqual(r.filters.held[0].stats, { reduction: 9 });
  const twice = structuredClone(r); curveRestore(twice);
  assert.deepEqual(twice.stash.find((x) => x.id === 'g1').stats, it.stats, 'safe to run twice');
});

test('gear carries your power: your own numbers stop growing at level 6; in its level\'s blues most of your Signal is gear, and old gear falls far short', () => {
  assert.equal(own(1), 1); assert.equal(own(6), power(6), 'the first levels: the curve'); assert.equal(own(30), power(6), 'then it holds');
  assert.equal(gearFill(1), 1); assert.equal(gearFill(6), 1, 'gear to level 6 is as it was');
  const sig = (L, opts) => { const s = fresh(); build(s, 'breaker', at(L), opts); return { max: maxSignal(s), k: powerOf(s) }; };
  for (const L of [20, 30]) {
    const blues = sig(L, {}), bare = sig(L, { noGear: true }), old = sig(L, { gearLevel: L - 10 });
    assert.equal(blues.k, own(L), 'skills scale on your own line');
    assert.ok(bare.max < 0.3 * blues.max, `level ${L}: the bare self is under 30% of a blue-geared one (${bare.max} of ${blues.max})`);
    assert.ok(old.max < 0.55 * blues.max, `level ${L}: gear ten levels old carries about half (${old.max} of ${blues.max})`);
  }
});

test('events take their server\'s level, never yours; SPRAWL-00\'s rooms keep theirs; ?curve sets a bench\'s rate', () => {
  const s = fresh(); s.tutorialCompleted = true; s.hackers = { breaker: { level: 12, xp: 0 } };
  addLocation(s, 'worm'); addLocation(s, 'ransomware');
  s.locations.forEach((l, i) => { l.rogue = false; l.runs = 1; l.level = 9 + i; });
  const ev = deal(s, 'courier');
  assert.ok(ev?.loc);
  assert.equal(ev.level, s.locations.find((l) => l.id === ev.loc).level);
  for (const L of [1, 9]) {
    const t = fresh(); t.hackers = { breaker: { level: L, xp: 0 } };
    const sp = zoneSpawns(t);
    for (const [room, x] of Object.entries(sp)) assert.equal(x.level, room === KING_ROOM ? CONFIG.zone.maxLevel : ZONE_LEVEL[room], `${room} at level ${L}`);
    assert.ok(zoneOf(t));
  }
  assert.deepEqual([benchCurve('?bench=a&curve=8'), benchCurve('?bench=a'), benchCurve('?curve=50')], [0.08, null, null]);
});

test('fight length (step 3): a Signal fight\'s Integrity × CONFIG.length.hp and its hits × dmg at its level; a solo boss its own; adds, breaches and crew bosses keep their size', async () => {
  const { createVirus, runLate, SERVER, BOSSES } = await import('./dist/data.mjs');
  const o = { threat: SERVER.threat(30), run: true, family: 'worm', mutation: null };
  const was = CONFIG.length;
  let base, boss0;
  try { CONFIG.length = { hp: [[1, 1]], dmg: [[1, 1]], boss: { hp: 1, dmg: 1 } }; base = createVirus('random', 7, o); } finally { CONFIG.length = was; }
  const long = createVirus('random', 7, o), short = createVirus('random', 7, { ...o, short: true });
  const hp = (v) => v.parts.reduce((n, p) => n + p.max, 0), hit = (v) => v.parts.find((p) => p.attack?.effect === 'damage').attack.amount;
  assert.ok(Math.abs(hp(long) / hp(base) / runLate(30, CONFIG.length.hp) - 1) < 0.02, 'Integrity up');
  assert.ok(Math.abs(hit(long) / hit(base) / runLate(30, CONFIG.length.dmg) - 1) < 0.1, 'hits down');
  assert.ok(runLate(45, CONFIG.length.hp) > runLate(10, CONFIG.length.hp), 'steeper late, where your damage outgrows a mob\'s Integrity');
  assert.equal(hp(short), hp(base), 'a breach keeps its own pace');
  assert.ok(Math.abs(long.addPower - base.hpPower) < 1e-9, 'its adds (fragments, Packages) keep their size');
  // A solo boss: its own Integrity, hits and enrage on your Signal; elsewhere its old enrage. A crew boss skips it.
  const b = { ...o, family: 'worm', strain: 'floodgate', boss: 'nb-floodwall' };
  assert.equal(createVirus('random', 7, b).enrageAt, BOSSES['nb-floodwall'].long.enrageAt);
  assert.equal(createVirus('random', 7, { ...b, short: true }).enrageAt, BOSSES['nb-floodwall'].enrageAt);
  try { CONFIG.length = { hp: [[1, 1]], dmg: [[1, 1]], boss: { hp: 1, dmg: 1 } }; boss0 = createVirus('random', 7, { ...o, family: 'ransomware', boss: 'foreman' }); } finally { CONFIG.length = was; }
  assert.equal(hp(createVirus('random', 7, { ...o, family: 'ransomware', boss: 'foreman' })), hp(boss0), 'a crew boss keeps its size');
});

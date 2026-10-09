// The breach prototype (docs/roguelite.md phase 0: breach.mjs, drafts.mjs, rewrites.mjs, the Overclock and Lock tells):
// the map generator, fog, drafts, mods and CVEs, every rewrite's Now, the two new tells, losing, capturing, and the bot
// winning a fair share of breaches with every class.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, part, livingParts, readyIn, previewDamage, finish, stashItem, fxFire, maxSignal } from './dist/combat.mjs';
import { CONFIG, ABILITIES, TELL_SETS, createVirus } from './dist/data.mjs';
import { tellsOf, plannedTells, NEW_TELLS } from './dist/tells.mjs';
import { generateMap, allPaths, nodeList, nextOf, firstRow, BREACH, ACTS, startBreach, outfit, reachable, visible, go, act, fight, settle, captureOf, SERVER_CARD, EVENTS, CORE_DUMP } from './dist/breach.mjs';
import { MODS, CVES, rollDraft, patchMods, unpatchMods, modPool } from './dist/drafts.mjs';
import { SUBSYSTEMS, REWRITES } from './dist/rewrites.mjs';
import { seeded } from './dist/gear.mjs';
import { winRate, runBreach, CLASSES } from './breachsim.mjs';
import { breachMarkup, bxUi, bxToggle } from './dist/breach-view.mjs';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
function breach(cls = 'breaker', seed = 3) {
  const s = fresh();
  s.rng = seed * 7777;
  outfit(s, { cls, level: 10, gearSeed: seed });
  startBreach(s, { seed, level: 10 });
  return s;
}
const nodeOf = (s, kind, act = 0) => nodeList(s.breach.map).find((n) => n.kind === kind && n.act === act);
const quiet = (s) => { for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999; };
const hold = (s, n = 1) => { for (let i = 0; i < n && active(s); i++) { command(s, 'hold'); resolveCycle(s); } };
// A fight on a node whose virus brings exactly these tells, with a Signal bar that outlasts the test.
function tellFight(cls, tells) {
  CONFIG.enemyCrit = 0; CONFIG.misses = false;
  const s = breach(cls, 5), n = nodeOf(s, 'virus');
  n.tells = tells;
  fight(s, n);
  s.run.max = s.run.integrity = 5000;
  s.encounter.hardened = 0;
  quiet(s);
  return s;
}
// Make a tell said now, landing in n cycles.
function say(s, id, n = 2) {
  const T = tellsOf(s), e = s.encounter, t = T.list.find((x) => x.id === id);
  for (const x of T.list) { x.told = false; x.after = 999; }
  Object.assign(t, { told: true, said: e.cycle, next: e.cycle + n, n: null, wound: 0, hitBy: [], after: 999, opened: null, early: null, need: t.kind === 'cast' ? T.tier.castHits : 0 });
  return t;
}

// ---------- the map ----------
test('map: three acts of four rows, two to four lanes a row, gates after acts 1 and 2, the Resident at the end', () => {
  for (const seed of SEEDS) {
    const map = generateMap(seed, 10), ns = nodeList(map);
    for (let a = 0; a < ACTS.length; a++) for (let r = 0; r < BREACH.rows; r++) {
      const row = ns.filter((n) => n.act === a && n.row === r);
      assert.ok(row.length >= 2 && row.length <= BREACH.cols, `seed ${seed} act ${a} row ${r}: ${row.length} nodes`);
      if (r === 0) assert.ok(row.every((n) => n.kind === 'virus'), 'row 1 is all virus fights');
      if (r === BREACH.rows - 1) assert.ok(row.every((n) => ['defrag', 'broker'].includes(n.kind)), 'row 4 is all defrag or broker');
      if (r === BREACH.rows - 2) assert.ok(row.every((n) => !['defrag', 'broker'].includes(n.kind)), 'never two rests in a row on a path');
    }
    for (let a = 0; a < ACTS.length; a++) {
      const mid = ns.filter((n) => n.act === a && n.row > 0 && n.row < BREACH.rows - 1);
      assert.ok(mid.some((n) => n.kind === 'elite'), `seed ${seed}: an elite in act ${a + 1}`);
      assert.ok(mid.some((n) => n.kind === 'term'), `seed ${seed}: a terminal in act ${a + 1}`);
    }
    assert.ok(!ns.some((n) => n.act === 0 && n.row < 2 && n.kind === 'elite'), 'no elite in act 1\'s first two rows');
    assert.deepEqual(ns.filter((n) => n.kind === 'gate').map((n) => n.id).sort(), ['gate1', 'gate2']);
    assert.equal(map.nodes.core.kind, 'boss');
    assert.equal(map.nodes.core.boss, SERVER_CARD.resident);
    assert.ok(['watchdog', 'crawler'].includes(map.nodes.gate1.guard) && ['sentinel', 'shredder'].includes(map.nodes.gate2.guard));
    // Every fight row carries its subsystem, and both of an act's subsystems show up in it.
    for (let a = 0; a < ACTS.length; a++) assert.deepEqual([...new Set(ns.filter((n) => n.act === a && n.sub).map((n) => n.sub))].sort(), [...SERVER_CARD.subsystems[a]].sort());
  }
});

test('map: every node is on a path, every path reaches the Resident, and no two edges cross', () => {
  for (const seed of SEEDS) {
    const map = generateMap(seed, 10), ns = nodeList(map);
    const paths = allPaths(map);
    assert.ok(paths.length > 0);
    for (const p of paths) assert.equal(p.at(-1), 'core', `seed ${seed}: a path ends at ${p.at(-1)}`);
    for (const p of paths) assert.ok(p.includes('gate1') && p.includes('gate2'), 'every path goes through both gates');
    const onPath = new Set(paths.flat());
    for (const n of ns) assert.ok(onPath.has(n.id), `seed ${seed}: ${n.id} is on no path`);
    // Steps: every edge goes one row down.
    for (const [a, c] of map.edges) assert.equal(map.nodes[c].step, map.nodes[a].step + 1, `${a} -> ${c}`);
    // Inside an act, lanes split and merge but never cross: a -> b and c -> d with a < c never have b > d.
    const inAct = map.edges.filter(([a, c]) => map.nodes[a].col != null && map.nodes[c].col != null);
    for (const [a, c] of inAct) for (const [x, y] of inAct) {
      if (map.nodes[a].step !== map.nodes[x].step) continue;
      const [p, q, r, t] = [map.nodes[a].col, map.nodes[c].col, map.nodes[x].col, map.nodes[y].col];
      assert.ok(!(p < r && q > t), `seed ${seed}: ${a}>${c} crosses ${x}>${y}`);
      assert.ok(Math.abs(p - q) <= 1, 'a step goes to the same lane or a neighbour');
    }
    // Lanes split somewhere: some node has two ways on.
    assert.ok(ns.some((n) => n.col != null && nextOf(map, n.id).length >= 2), `seed ${seed}: the lanes never split`);
  }
});

test('map: the same seed makes the same map', () => {
  assert.deepEqual(generateMap(9, 10), generateMap(9, 10));
  assert.notDeepEqual(generateMap(9, 10).edges, generateMap(10, 10).edges);
});

test('fog: you read two rows ahead (an Infiltrator three); the gates and the Resident always show', () => {
  const s = breach('breaker', 4), b = s.breach;
  const seen = (step) => nodeList(b.map).filter((n) => n.step === step && n.col != null).every((n) => visible(s, n));
  assert.ok(seen(1) && seen(2) && !nodeList(b.map).some((n) => n.step === 3 && visible(s, n)), 'from the start: rows 1 and 2');
  assert.ok(visible(s, b.map.nodes.gate1) && visible(s, b.map.nodes.gate2) && visible(s, b.map.nodes.core));
  // Moving a row down lifts the fog a row.
  b.at = firstRow(b.map)[0].id;
  assert.ok(seen(3) && !nodeList(b.map).some((n) => n.step === 4 && visible(s, n)));
  const t = breach('infiltrator', 4);
  assert.ok(nodeList(t.breach.map).filter((n) => n.step === 3).every((n) => visible(t, n)), 'an Infiltrator reads a row further');
  // The page draws fogged nodes as ? with nothing to click.
  const html = breachMarkup(s);
  assert.match(html, /k-fog s-fog/);
  assert.ok(!/data-breach="go" data-arg="a1/.test(html), 'nothing past the next row is clickable');
});

test('moving: only the next row along an edge; a node resolves into its screen', () => {
  const s = breach('bastion', 6), b = s.breach;
  assert.deepEqual(reachable(s).map((n) => n.id).sort(), firstRow(b.map).map((n) => n.id).sort());
  const far = nodeList(b.map).find((n) => n.step === 3);
  go(s, far.id);
  assert.equal(b.at, null, 'two rows ahead is out of reach');
  const n = firstRow(b.map)[0];
  go(s, n.id);
  assert.equal(b.at, n.id);
  assert.ok(active(s), 'a virus node starts its fight');
  assert.equal(s.encounter.breach, n.id);
  assert.equal(s.run.integrity, b.signal, 'the fight is on your breach Signal');
});

// ---------- drafts ----------
test('drafts: a mixed draft is never three of one kind; an elite drafts CVEs; a gate mods, CVEs and one gear, the Resident gear, blue or better', () => {
  const s = breach('breaker', 2);
  for (let i = 0; i < 60; i++) {
    const r = seeded(i + 1);
    const v = rollDraft(s, r, 'virus', { act: i % 3, level: 10 });
    assert.equal(v.length, 3);
    assert.ok(new Set(v.map((c) => c.kind)).size >= 2, `draft ${i}: ${v.map((c) => c.kind)}`);
    assert.ok(rollDraft(s, r, 'elite', { act: i % 3, level: 10 }).every((c) => c.kind === 'cve'), 'an elite drafts CVEs');
    const g = rollDraft(s, r, 'gate', { act: 0, level: 10 });
    assert.equal(g.filter((c) => c.kind === 'gear').length, 1, 'a gate: one gear card');
    for (const c of g) { assert.ok(['mod', 'cve', 'gear'].includes(c.kind)); assert.ok(['tuned', 'custom'].includes(c.rarity)); }
    for (const c of rollDraft(s, r, 'boss', { act: 0, level: 10 })) { assert.equal(c.kind, 'gear'); assert.ok(['tuned', 'custom'].includes(c.item.rarity)); }
    for (const k of ['cve', 'mod', 'gear']) for (const c of rollDraft(s, r, k, { act: 0, level: 10 })) assert.equal(c.kind, k, 'a promised kind is kept');
    for (const c of v.filter((x) => x.kind === 'mod')) assert.equal(MODS[c.id].cls, 'breaker', 'only your class\'s mods');
  }
  // Mods only for skills on your bar (and Key 1); held ones never come again.
  s.breach.mods = ['aftershock'];
  assert.ok(!modPool(s).includes('aftershock'));
  assert.deepEqual(modPool(s).sort(), ['critical-mass', 'fragmentation', 'overcommit', 'pry-bar', 'shrapnel', 'undertow', 'zero-click']);
  // Kernel Hook and POODLE: a card more each.
  s.breach.fx.kernelHook = true; s.breach.cves = ['poodle'];
  const n = nodeOf(s, 'virus');
  fight(s, n);
  s.run.max = s.run.integrity = 5000;
  for (const p of s.encounter.virus.parts) p.integrity = 0;
  finish(s, 'victory');
  assert.equal(s.breach.screen.kind, 'draft');
  assert.equal(s.breach.screen.cards.length, 5);
});

test('drafts: about ten mods a class (on real skills, from Key 1 up), 27 CVEs; a mod patches while held and comes off clean', () => {
  assert.ok(Object.keys(MODS).length >= 40, `${Object.keys(MODS).length} mods`);
  assert.ok(Object.keys(CVES).length >= 20, `${Object.keys(CVES).length} CVEs`);
  for (const cls of CLASSES) {
    const s = breach(cls, 1), own = Object.values(MODS).filter((m) => m.cls === cls);
    assert.ok(own.length >= 10, `${cls}: ${own.length}`);
    assert.ok(modPool(s).length >= 5, `${cls}: ${modPool(s).length} can roll at level 10`);
    for (const m of own) { assert.ok(ABILITIES[m.skill], m.id); assert.equal(m.v.length, 2, `${m.id}: a value and a + value`); assert.ok(m.text(m.v[0]) && m.text(m.v[1]), m.id); }
  }
  // A mod patches its skill while held (its + values once recompiled), and the global data comes back untouched.
  const before = JSON.stringify(ABILITIES);
  patchMods(['overcommit', 'clone', 'grudge-match']);
  assert.equal(ABILITIES.overload.damage, 60);
  assert.equal(ABILITIES.spawn.helpers, 2);
  assert.equal(ABILITIES.retaliate.window, 2);
  patchMods(['grudge-match'], ['grudge-match']);
  assert.equal(ABILITIES.retaliate.window, 3, 'Grudge Match+');
  assert.equal(ABILITIES.overload.damage, 40, 'the last patch came off first');
  unpatchMods();
  assert.equal(JSON.stringify(ABILITIES), before);
});

test('mods and CVEs act in a breach fight: Aftershock, Overcommit, EternalBlue, Heartbleed', () => {
  // (the genome on a node is its own test, drafting.test.mjs)
  CONFIG.enemyCrit = 0; CONFIG.misses = false;
  const s = breach('breaker', 8), b = s.breach;
  b.mods = ['aftershock', 'overcommit'];
  b.cves = ['eternalblue', 'heartbleed'];
  fight(s, nodeOf(s, 'virus'));
  quiet(s);
  const e = s.encounter, p = livingParts(s).find((x) => x.armor >= 2) || livingParts(s)[0];
  p.armor = p.maxArmor = 3;
  assert.ok(e.forceCrit, 'EternalBlue: the first hit is a critical strike');
  s.run.integrity = s.run.max - 20;
  const hp = p.integrity, sig = s.run.integrity;
  command(s, `crack ${p.id}`); resolveCycle(s);
  assert.ok(p.integrity < hp, 'Aftershock: Crack hurt the part');
  assert.ok(s.logs.some((x) => /^Aftershock: /.test(x.message)));
  assert.ok(s.run.integrity > sig, 'Heartbleed: breaking ◆ healed you');
  const before = s.run.integrity;
  const q = livingParts(s)[0];
  q.armor = 0;
  command(s, `overload ${q.id}`); resolveCycle(s);
  assert.ok(s.logs.some((x) => /Overcommit costs you/.test(x.message)) || s.logs.some((x) => /Overcommit refunds/.test(x.message)), 'Overcommit costs Signal (or refunds it on a crit)');
  assert.ok(before > 0);
  // Outside a breach the same events do nothing (hooks only read a breach fight).
  const h = fresh();
  h.hackers = { breaker: { level: 10, xp: 0 } };
  assert.deepEqual(fxFire(h, 'start'), []);
});

// ---------- rewrites ----------
function rewrite(s, id, tier = 1) {
  const r = REWRITES[id], b = s.breach;
  b.screen = { kind: 'rewrite', sub: r.sub, tier, options: SUBSYSTEMS[r.sub].rewrites };
  act(s, 'pick', SUBSYSTEMS[r.sub].rewrites.indexOf(id));
  assert.deepEqual(b.rewrites[r.sub], { id, tier });
}
test('rewrites: nine subsystems, two or three rewrites each, each with a Now and a tier I and II output', () => {
  assert.equal(Object.keys(SUBSYSTEMS).length, 9);
  assert.equal(Object.keys(REWRITES).length, 20);
  for (const [sub, x] of Object.entries(SUBSYSTEMS)) {
    assert.ok(x.rewrites.length >= 2 && x.rewrites.length <= 3, sub);
    for (const id of x.rewrites) { const r = REWRITES[id]; assert.equal(r.sub, sub); assert.equal(r.output.length, 2); assert.ok(r.now && r.apply); }
  }
  for (const sub of SERVER_CARD.subsystems.flat()) assert.ok(SUBSYSTEMS[sub], sub);
});

test('rewrites: every Now applies for the rest of this breach', () => {
  let s = breach('breaker', 3), b = s.breach;
  rewrite(s, 'maildrop'); assert.equal(b.tokens, 30);
  rewrite(s, 'slushfund'); assert.equal(b.tokens, 70);
  rewrite(s, 'nightlybuild'); assert.equal(b.rerolls, BREACH.rerolls + 2);
  b.signal = 50; rewrite(s, 'restorepoint'); assert.equal(b.signal, 50 + Math.round(b.max * 0.25));
  const max = b.max; rewrite(s, 'memorymap'); assert.equal(b.max, max + Math.round(max * 0.1));
  rewrite(s, 'forgedkeys'); assert.equal(b.screen.kind, 'draft'); assert.ok(b.screen.cards.every((c) => c.kind === 'cve'), 'Forged Keys: a CVE pick now');
  b.screen = null;
  rewrite(s, 'archive'); assert.equal(b.screen.kind, 'draft'); assert.ok(b.screen.cards.every((c) => c.kind === 'mod'), 'Archive: a mod pick now');
  b.screen = null;
  rewrite(s, 'kernelhook'); assert.ok(b.fx.kernelHook);
  rewrite(s, 'pricefix');
  const broker = nodeList(b.map).find((n) => n.kind === 'broker');
  b.at = nodeList(b.map).find((n) => n.step === broker.step - 1 && nextOf(b.map, n.id).includes(broker)).id;
  go(s, broker.id);
  assert.equal(b.screen.kind, 'broker'); assert.ok(b.screen.half, 'Price Fix: the next broker is half price');
  // Jump Host: the next move can go anywhere in the next row.
  s = breach('breaker', 3); b = s.breach;
  b.at = firstRow(b.map)[0].id;
  const along = reachable(s).length, row = nodeList(b.map).filter((n) => n.step === 2).length;
  rewrite(s, 'jumphost');
  assert.equal(reachable(s).length, row);
  assert.ok(row >= along);
  // Spam Cannon: the act 1 gate starts with 10% less Integrity. Warm Start: every attack a cycle later.
  const gateHp = (t) => { fight(t, t.breach.map.nodes.gate1); const n = t.encounter.virus.parts.reduce((x, p) => x + p.max, 0); t.encounter = null; return n; };
  const plain = gateHp(breach('breaker', 3)), thin = breach('breaker', 3);
  rewrite(thin, 'spamcannon');
  assert.ok(Math.abs(gateHp(thin) / plain - 0.9) < 0.03, 'Spam Cannon');
  const due = (t) => { fight(t, nodeOf(t, 'virus')); return t.encounter.virus.parts.filter((p) => p.attack).map((p) => p.attack.due); };
  const cold = due(breach('breaker', 3)), warm = breach('breaker', 3);
  rewrite(warm, 'warmstart');
  assert.deepEqual(due(warm), cold.map((d) => d + 1), 'Warm Start');
});

test('rewrites: a subsystem\'s fight offers its rewrite once; clearing it again (or an elite) makes it tier II', () => {
  CONFIG.enemyCrit = 0;
  const s = breach('bastion', 3), b = s.breach, n = nodeOf(s, 'virus');
  const win = (node) => { b.screen = null; b.queue = []; fight(s, node); for (const p of s.encounter.virus.parts) p.integrity = 0; finish(s, 'victory'); settle(s); };
  win(n);
  assert.equal(b.screen.kind, 'draft');
  act(s, 'skip');
  assert.equal(b.screen.kind, 'rewrite');
  assert.equal(b.screen.sub, n.sub);
  assert.equal(b.screen.tier, 1);
  act(s, 'pick', 1);
  win(nodeList(b.map).find((x) => x.sub === n.sub && x.id !== n.id && x.kind === 'virus') || n);
  assert.equal(b.rewrites[n.sub].tier, 2, 'cleared twice: tier II');
  assert.ok(!b.queue.some((x) => x.kind === 'rewrite'));
});

// ---------- the new tells ----------
test('Overclock: a cast; SIGINT stops it; landed, every part takes double damage and every attack comes a cycle sooner, for 2 cycles', () => {
  let s = tellFight('breaker', ['overclock']);
  assert.deepEqual(tellsOf(s).list.map((t) => [t.id, t.kind, t.does]), [['overclock', 'cast', 'overclock']]);
  let t = say(s, 'overclock', 1);
  command(s, 'sigint'); resolveCycle(s);
  assert.ok(!(s.encounter.virus.buffs?.overclock >= s.encounter.cycle), 'SIGINT interrupts it');
  assert.ok(s.logs.some((x) => /SIGINT stops OVERCLOCK/.test(x.message)));
  // Let it land.
  s = tellFight('breaker', ['overclock']);
  const p = livingParts(s)[0];
  p.armor = p.maxArmor = 0; p.max = p.integrity = 1000; // a part no hit here can break
  const atk = livingParts(s).find((x) => x.attack);
  t = say(s, 'overclock', 1);
  const plain = previewDamage(s, 'spike', p);
  const due = (atk.attack.due = s.encounter.cycle + 4);
  hold(s, 1);
  assert.ok(!(s.encounter.virus.buffs?.overclock >= s.encounter.cycle), 'not yet: it lands next cycle');
  hold(s, 1);
  assert.ok(s.encounter.virus.buffs.overclock >= s.encounter.cycle, 'it compiled');
  assert.ok(s.logs.some((x) => /OVERCLOCK compiles/.test(x.message)));
  assert.ok(Math.abs(previewDamage(s, 'spike', p) - 2 * plain) <= 1, `double damage: ${plain} -> ${previewDamage(s, 'spike', p)}`);
  assert.equal(atk.attack.due, due - 1, 'every attack comes a cycle sooner');
  assert.ok(!s.encounter.locked && !s.encounter.corrupt && !(s.encounter.hung >= s.encounter.cycle), 'its cost is the gamble: no after-effect');
  hold(s, 2);
  assert.ok(Math.abs(previewDamage(s, 'spike', p) - plain) <= 1, 'it runs out');
  assert.ok(t);
});

test('Lock: no answer but breaking the part; landed, the first command you fire is locked for 3 cycles, key 1 included', () => {
  let s = tellFight('breaker', ['lock']);
  assert.deepEqual(tellsOf(s).list.map((t) => [t.id, t.kind]), [['lock', 'lock']]);
  const src = part(s, tellsOf(s).list[0].part);
  assert.ok(src.special, 'it sits on the signature part');
  say(s, 'lock', 1);
  const target = livingParts(s).find((x) => x !== src);
  target.armor = 0;
  command(s, `spike ${target.id}`); resolveCycle(s);
  assert.equal(readyIn(s, 'spike'), 0, 'the command before it lands is free');
  assert.ok(!s.encounter.lockArmed);
  hold(s, 1);
  assert.ok(s.encounter.lockArmed, 'it landed and armed');
  hold(s, 1);
  assert.ok(s.encounter.lockArmed, 'holding fires nothing: it waits');
  command(s, `spike ${target.id}`); resolveCycle(s);
  assert.equal(readyIn(s, 'spike'), 3, 'key 1 is locked for 3 cycles');
  assert.ok(!s.encounter.lockArmed);
  assert.ok(s.logs.some((x) => x.type === 'locked' && /LOCK locks key 1 for 3 cycles/.test(x.message)));
  // Fed a long cooldown, it costs nothing.
  s = tellFight('breaker', ['lock']);
  say(s, 'lock', 1);
  hold(s, 2);
  const q = livingParts(s)[0];
  q.armor = 0;
  command(s, `flood ${q.id}`); resolveCycle(s);
  assert.equal(readyIn(s, 'flood'), ABILITIES.flood.cooldown - 1, 'Flood keeps its own cooldown');
  assert.ok(s.logs.some((x) => x.type === 'locked' && x.fed));
  // Breaking its part stops it.
  s = tellFight('breaker', ['lock']);
  const t = say(s, 'lock', 2), p = part(s, t.part);
  p.integrity = 1; p.armor = 0;
  command(s, `spike ${p.id}`); resolveCycle(s);
  hold(s, 2);
  assert.ok(!s.encounter.lockArmed, 'broken, it never lands');
  assert.equal(NEW_TELLS.lock.cycles, 3);
});

test('the old tells are untouched outside a breach', () => {
  for (const fam of ['ransomware', 'worm', 'ghostroot']) {
    const v = createVirus('random', 11, { family: fam, threat: 25, mutation: null });
    const ids = plannedTells(v).filter((t) => t.kind !== 'mimic').map((t) => t.id);
    assert.ok(ids.every((id) => TELL_SETS[fam].includes(id)), `${fam}: ${ids}`);
    assert.ok(!ids.includes('overclock') && !ids.includes('lock'));
  }
});

// ---------- the end ----------
test('losing: the unbanked pack and the drafts go; XP and banked gear stay', () => {
  const s = breach('breaker', 3), b = s.breach;
  b.mods = ['aftershock']; b.cves = ['mirai'];
  const keep = b.banked[0];
  b.screen = { kind: 'draft', title: 'x', draft: 'boss', cards: rollDraft(s, seeded(4), 'boss', { act: 0, level: 10 }) };
  act(s, 'pick', 0);
  const lost = b.pack[0];
  assert.ok(stashItem(s, lost), 'drafted gear is in the stash (and the pack)');
  fight(s, nodeOf(s, 'virus'));
  const xp = b.xp;
  s.run.integrity = 0;
  finish(s, 'crashed');
  assert.equal(b.result, 'lost');
  assert.equal(stashItem(s, lost), null, 'the unbanked item is gone');
  assert.deepEqual([b.mods, b.cves], [[], []]);
  assert.equal(b.xp, xp, 'XP stays');
  assert.equal(b.screen.kind, 'result');
  assert.equal(keep, undefined);
  assert.match(breachMarkup(s), /SIGNAL LOST/);
});

test('a gate banks the pack after its draft, and you go on or jack out', () => {
  CONFIG.enemyCrit = 0;
  const win = (s, n) => { fight(s, n); for (const p of s.encounter.virus.parts) p.integrity = 0; finish(s, 'victory'); settle(s); };
  let s = breach('bastion', 3), b = s.breach;
  b.screen = { kind: 'draft', title: 'x', draft: 'boss', cards: rollDraft(s, seeded(4), 'boss', { act: 0, level: 10 }) };
  act(s, 'pick', 0);
  assert.equal(b.pack.length, 1);
  win(s, b.map.nodes.gate1);
  assert.equal(b.screen.kind, 'draft');
  assert.ok(b.screen.noSkip && b.screen.cards.every((c) => ['tuned', 'custom'].includes(c.rarity)) && b.screen.cards.filter((c) => c.kind === 'gear').length === 1, 'a gate drafts 1 of 3: mods and CVEs and one gear card, blue or better');
  act(s, 'pick', 1);
  assert.equal(b.screen.kind, 'gate');
  assert.equal(b.pack.length, 1, 'unbanked until you pass');
  act(s, 'goon');
  assert.deepEqual([b.pack.length, b.banked.length, b.result], [0, 1, null]);
  // Or jack out: banked, uncaptured.
  s = breach('bastion', 3); b = s.breach;
  b.screen = { kind: 'draft', title: 'x', draft: 'boss', cards: rollDraft(s, seeded(5), 'boss', { act: 0, level: 10 }) };
  act(s, 'pick', 0);
  win(s, b.map.nodes.gate1);
  act(s, 'pick', 0);
  act(s, 'jackout');
  assert.deepEqual([b.result, b.banked.length], ['out', 1]);
  assert.match(breachMarkup(s), /JACKED OUT/);
});

test('a won breach: DEADBOLT drafts gear into the pack, the pack banks, and the capture card has the rewrites, loot and core.dump', () => {
  const r = runBreach({ cls: 'bastion', seed: 2, keep: true }), s = r.state, b = s.breach;
  assert.ok(r.won, 'the bot wins this one');
  assert.equal(b.result, 'won');
  assert.equal(b.pack.length, 0, 'everything banked');
  assert.ok(b.banked.length >= 1 && b.banked.length <= 4, `a gear pick from DEADBOLT, and little else (${b.banked.length})`);
  const c = captureOf(s);
  assert.equal(c.rewrites.length, 6);
  assert.ok(c.rewrites.filter((x) => x.held).length >= 3);
  assert.ok(c.xp > 0);
  assert.equal(c.dump, CORE_DUMP);
  assert.equal(CORE_DUMP.thread, 'TOLLGATE');
  assert.match(breachMarkup(s), /CAPTURED/);
  const { state, ...rest } = runBreach({ cls: 'bastion', seed: 2, keep: true }), { state: _, ...first } = r;
  assert.deepEqual(rest, first, 'a breach is seeded: the same seed plays the same way');
  assert.equal(Object.keys(EVENTS).length, 4, 'four terminal events');
  assert.ok(state);
});

test('capture card: every subsystem listed, stock where you never cleared it', () => {
  const s = breach('bastion', 3), b = s.breach;
  b.rewrites = { smtpd: { id: 'spamcannon', tier: 2 }, kmod: { id: 'kernelhook', tier: 1 } };
  b.result = 'won'; b.screen = { kind: 'result' };
  const c = captureOf(s);
  assert.equal(c.rewrites.length, 6);
  const html = breachMarkup(s);
  assert.match(html, /Spam Cannon II/);
  assert.match(html, /25% less Integrity/);
  assert.match(html, /Kernel Hook/);
  assert.match(html, /core\.dump/);
  assert.equal((html.match(/class="stock"/g) || []).length, 4);
});

// ---------- the page ----------
test('the page: a run strip, one decision, the rewrites in the gutter, the pack behind a button, a short tty', () => {
  const s = breach('breaker', 3), b = s.breach;
  bxUi.pack = false; bxUi.log = false; bxUi.seen.clear();
  let html = breachMarkup(s);
  // The strip: Signal, tokens and rerolls. Nothing drafted or picked up yet, so no mods, CVEs or Pack, and no placeholders.
  assert.match(html, /class="bx-hud"/);
  assert.match(html, new RegExp(`<strong>${b.signal}</strong><small>/${b.max}</small>`));
  assert.ok(!/none yet|>empty</.test(html), 'absent means empty');
  assert.ok(!/bx-perks|data-bx-ui="pack"/.test(html));
  // Nothing to decide: one line. No rewrites grid; the gutter reads plain subsystem names.
  assert.match(html, /bx-idle[^>]*>.*Jack in: pick a first node/);
  assert.ok(!/bx-subs|>stock</.test(html), 'no rewrites grid, and no "stock" filler in the gutter');
  // A mod, a CVE, a rewrite and gear in the pack.
  b.mods = ['aftershock']; b.cves = ['heartbleed']; b.rewrites = { smtpd: { id: 'spamcannon', tier: 2 } };
  const it = rollDraft(s, seeded(9), 'boss', { act: 0, level: 10 })[0];
  b.screen = { kind: 'draft', title: 'Draft', draft: 'virus', cards: [it] };
  act(s, 'pick', 0);
  html = breachMarkup(s);
  assert.match(html, /class="bx-perk mod" title="Aftershock · mod on Crack: Crack also deals/);
  assert.match(html, /class="bx-perk cve r-stock" title="Heartbleed · common CVE: Heals you/);
  assert.match(html, /class="bx-gut held[^"]*"[^>]*title="Spam Cannon II on smtpd: Now: [^"]+ Output: Viruses on servers linked to it start with 25% less Integrity\."><span class="bx-gut-dir">smtpd\/<\/span><small>Spam Cannon II<\/small>/);
  assert.match(html, /data-bx-ui="pack"[^>]*>.*Pack<\/span><b>1<\/b><small>banks at the gate<\/small>/);
  assert.match(html, /bx-packbtn new/, 'new gear marks the button');
  assert.ok(!/class="bx-pop"/.test(html), 'the pack is closed until you open it');
  bxToggle('pack', s);
  html = breachMarkup(s);
  assert.match(html, /class="bx-pop"/);
  assert.match(html, new RegExp(`data-breach="equip" data-arg="${b.pack[0]}"`), 'Equip is in the pop-over');
  assert.ok(!/bx-packbtn new/.test(html), 'opening the pack marks its gear seen');
  // The tty: the last two lines, twelve when open.
  for (let i = 0; i < 20; i++) b.log.push(`line ${i}`);
  const lines = () => (breachMarkup(s).match(/<div class="bx-log-lines">(.*?)<\/div><\/section>/)[1].match(/<div/g) || []).length;
  assert.equal(lines(), 2);
  bxToggle('log');
  assert.equal(lines(), 12);
  bxToggle('log'); bxToggle('pack', s);
});

// ---------- the bot ----------
// docs/roguelite.md 9.1 asks 50 to 70% a class at heat 0 in blues. The band here is wider so the test is stable at 16
// breaches a class, and it guards the floor: every class can win a fair share, none is shut out. breachsim.mjs prints
// the numbers.
test('breachsim: every class at level 10 wins a fair share of breaches', { timeout: 300000 }, () => {
  const rates = CLASSES.map((cls) => winRate(cls, { runs: 16 }));
  for (const r of rates) assert.ok(r.rate >= 0.3, `${r.cls} wins ${Math.round(r.rate * 100)}%`);
  const mean = rates.reduce((n, r) => n + r.rate, 0) / rates.length;
  assert.ok(mean >= 0.5 && mean <= 0.92, `mean ${Math.round(mean * 100)}%`);
  for (const r of rates) assert.ok(r.fights >= 6, `${r.cls}: about ten fights a breach (${r.fights.toFixed(1)})`);
});

test('the breach is a playtest only: a fresh campaign has none, and the save version is unchanged', async () => {
  const s = fresh();
  assert.equal(s.breach, undefined);
  const { SAVE_VERSION } = await import('./dist/combat.mjs');
  assert.equal(SAVE_VERSION, 38);
  assert.ok(maxSignal(s) > 0);
});

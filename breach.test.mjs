// The breach prototype (docs/roguelite.md phase 0 and 11: breach.mjs, rewrites.mjs, the Overclock and Lock tells): the
// map generator, fog, rewrites (output only), the two new tells, losing, capturing, the page, and the bot winning a
// fair share of breaches with every class. The map's dungeon pieces, scripts and skill rules: mapmech.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, part, livingParts, readyIn, previewDamage, finish, stashItem, maxSignal, addItem } from './dist/combat.mjs';
import { CONFIG, ABILITIES, TELL_SETS, createVirus } from './dist/data.mjs';
import { tellsOf, plannedTells, NEW_TELLS } from './dist/tells.mjs';
import { generateMap, allPaths, nodeList, nextOf, firstRow, BREACH, ACTS, startBreach, outfit, reachable, visible, go, act, fight, settle, captureOf, SERVER_CARD, EVENTS, CORE_DUMP } from './dist/breach.mjs';
import { SUBSYSTEMS, REWRITES } from './dist/rewrites.mjs';
import { seeded, rollItem } from './dist/gear.mjs';
import { winRate, runBreach, CLASSES, PICK } from './breachsim.mjs';
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

// ---------- rewrites ----------
function rewrite(s, id, tier = 1) {
  const r = REWRITES[id], b = s.breach;
  b.screen = { kind: 'rewrite', sub: r.sub, tier, options: SUBSYSTEMS[r.sub].rewrites };
  act(s, 'pick', SUBSYSTEMS[r.sub].rewrites.indexOf(id));
  assert.deepEqual(b.rewrites[r.sub], { id, tier });
}
test('rewrites: nine subsystems, two or three rewrites each, each a tier I and II output and nothing else', () => {
  assert.equal(Object.keys(SUBSYSTEMS).length, 9);
  assert.equal(Object.keys(REWRITES).length, 20);
  for (const [sub, x] of Object.entries(SUBSYSTEMS)) {
    assert.ok(x.rewrites.length >= 2 && x.rewrites.length <= 3, sub);
    for (const id of x.rewrites) { const r = REWRITES[id]; assert.equal(r.sub, sub); assert.equal(r.output.length, 2); assert.ok(!('now' in r) && !('apply' in r), `${id}: output only`); for (const o of r.output) assert.ok(!/draft|reroll|CVE|\bmod/i.test(o), `${id}: ${o}`); }
  }
  for (const sub of SERVER_CARD.subsystems.flat()) assert.ok(SUBSYSTEMS[sub], sub);
});

test('rewrites: picking one changes nothing on this breach; its output waits for the capture', () => {
  const s = breach('breaker', 3), b = s.breach;
  b.at = firstRow(b.map)[0].id;
  const before = JSON.stringify({ tokens: b.tokens, signal: b.signal, max: b.max, fx: b.fx, keys: b.keys, trace: b.trace, reach: reachable(s).map((n) => n.id) });
  for (const id of Object.keys(REWRITES)) { b.screen = null; rewrite(s, id); b.rewrites = {}; }
  b.screen = null;
  assert.equal(JSON.stringify({ tokens: b.tokens, signal: b.signal, max: b.max, fx: b.fx, keys: b.keys, trace: b.trace, reach: reachable(s).map((n) => n.id) }), before);
  assert.ok(s.logs.some((x) => /rewritten: Slush Fund\. Once you capture the server: Every breach starts with 40 tokens\./.test(x.message)));
  // The screen: Output, no Now.
  b.screen = { kind: 'rewrite', sub: 'smtpd', tier: 1, options: SUBSYSTEMS.smtpd.rewrites };
  const html = breachMarkup(s);
  assert.match(html, /Output<\/span>Mails you a script/);
  assert.ok(!/bx-now|>Now</.test(html));
});

test('rewrites: a subsystem\'s fight offers its rewrite once; clearing it again (or an elite) makes it tier II', () => {
  CONFIG.enemyCrit = 0;
  const s = breach('bastion', 3), b = s.breach, n = nodeOf(s, 'virus');
  const win = (node) => { b.screen = null; b.queue = []; fight(s, node); for (const p of s.encounter.virus.parts) p.integrity = 0; finish(s, 'victory'); settle(s); };
  win(n);
  assert.equal(b.screen.kind, 'rewrite', 'no draft: the rewrite comes straight after the fight');
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
// A protocol in the pack, as a drop would leave it.
const packed = (s, seed = 4) => { const it = addItem(s, rollItem(seeded(seed), { level: 10, rarity: 'tuned' }), 'Test: '); s.breach.pack.push(it.id); return it.id; };
test('losing: the unbanked pack goes; XP, banked gear and your scripts stay', () => {
  const s = breach('breaker', 3), b = s.breach;
  const scripts = [...b.scripts];
  const lost = packed(s);
  assert.ok(stashItem(s, lost), 'the drop is in the stash (and the pack)');
  fight(s, nodeOf(s, 'virus'));
  const xp = b.xp;
  s.run.integrity = 0;
  finish(s, 'crashed');
  assert.equal(b.result, 'lost');
  assert.equal(stashItem(s, lost), null, 'the unbanked item is gone');
  assert.deepEqual(b.scripts, scripts, 'scripts are yours: they stay');
  assert.equal(b.xp, xp, 'XP stays');
  assert.equal(b.screen.kind, 'result');
  assert.match(breachMarkup(s), /SIGNAL LOST[\s\S]*and your scripts/);
});

test('a gate banks the pack, and you go on or jack out', () => {
  CONFIG.enemyCrit = 0;
  const win = (s, n) => { fight(s, n); for (const p of s.encounter.virus.parts) p.integrity = 0; finish(s, 'victory'); settle(s); };
  let s = breach('bastion', 3), b = s.breach;
  packed(s);
  win(s, b.map.nodes.gate1);
  assert.equal(b.screen.kind, 'gate');
  const n = b.pack.length;
  assert.ok(n >= 1, 'unbanked until you pass (and a gate drops gear now and then)');
  act(s, 'goon');
  assert.deepEqual([b.pack.length, b.banked.length, b.result], [0, n, null]);
  // Or jack out: banked, uncaptured.
  s = breach('bastion', 3); b = s.breach;
  packed(s, 5);
  win(s, b.map.nodes.gate1);
  act(s, 'jackout');
  assert.equal(b.result, 'out');
  assert.ok(b.banked.length >= 1);
  assert.match(breachMarkup(s), /JACKED OUT/);
});

test('a won breach: DEADBOLT drops gear into the pack, the pack banks, and the capture card has the outputs, loot and core.dump', () => {
  let r = null;
  for (let seed = 1; seed < 30 && !r; seed++) { const x = runBreach({ cls: 'bastion', seed, keep: true }); if (x.won) r = x; }
  const s = r.state, b = s.breach;
  assert.equal(b.result, 'won');
  assert.equal(b.pack.length, 0, 'everything banked');
  assert.ok(b.banked.length >= 1 && b.banked.length <= 4, `DEADBOLT's drop, and little else (${b.banked.length})`);
  const c = captureOf(s);
  assert.equal(c.rewrites.length, 6);
  assert.ok(c.rewrites.filter((x) => x.held).length >= 3);
  assert.ok(c.xp > 0);
  assert.equal(c.dump, CORE_DUMP);
  assert.equal(CORE_DUMP.thread, 'TOLLGATE');
  const html = breachMarkup(s);
  assert.match(html, /CAPTURED[\s\S]*Output <small>/);
  assert.match(html, /Trace peak<\/span><b>\d+/);
  const { state, ...again } = runBreach({ cls: 'bastion', seed: r.seed, keep: true }), { state: _, ...first } = r;
  assert.deepEqual(again, first, 'a breach is seeded: the same seed plays the same way');
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
  // The strip: Signal, Trace, tokens, the server's rule and your scripts. Nothing picked up yet, so no Pack, and no
  // placeholders.
  assert.match(html, /class="bx-hud"/);
  assert.match(html, new RegExp(`<strong>${b.signal}</strong><small>/${b.max}</small>`));
  assert.match(html, /class="bx-trace ok"[^>]*><span class="lbl">Trace<\/span>/);
  assert.match(html, /bx-kind[^>]*><span class="lbl">Mailhub<\/span><b>Spam floods<\/b>/);
  assert.match(html, /Scripts 2\/3[\s\S]*class="bx-perk script r-stock" title="Sasser · common script: Restores 20%/);
  assert.ok(!/none yet|>empty</.test(html), 'absent means empty');
  assert.ok(!/data-bx-ui="pack"/.test(html));
  assert.ok(!/draft|reroll|bx-rw|bx-tag/i.test(html), 'no drafting left on the page');
  // Nothing to decide: one line. No rewrites grid; the gutter reads plain subsystem names.
  assert.match(html, /bx-idle[^>]*>.*Jack in: pick a first node/);
  assert.ok(!/bx-subs|>stock</.test(html), 'no rewrites grid, and no "stock" filler in the gutter');
  // A rewrite and gear in the pack.
  b.rewrites = { smtpd: { id: 'spamcannon', tier: 2 } };
  packed(s, 9);
  html = breachMarkup(s);
  assert.match(html, /class="bx-gut held[^"]*"[^>]*title="Spam Cannon II on smtpd\. Once you capture the server: Viruses on servers linked to it start with 25% less Integrity\."><span class="bx-gut-dir">smtpd\/<\/span><small>Spam Cannon II<\/small>/);
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
// docs/roguelite.md 9.1 asks 50 to 70% a class at heat 0 in blues; 11 has the measured table (breachsim.mjs). The band
// here is wider so the test is stable at 16 breaches a class, with the subclasses the campaign bot picks, and it
// guards the floor and the ceiling: every class can win a fair share, and the Bastion no longer wins them all.
test('breachsim: every class at level 10 wins a fair share of breaches, and none wins nearly all', { timeout: 300000 }, () => {
  const rates = CLASSES.map((cls) => winRate(cls, { runs: 16, sub: PICK[cls] }));
  for (const r of rates) assert.ok(r.rate >= 0.25 && r.rate <= 0.94, `${r.cls} wins ${Math.round(r.rate * 100)}%`);
  const mean = rates.reduce((n, r) => n + r.rate, 0) / rates.length;
  assert.ok(mean >= 0.45 && mean <= 0.85, `mean ${Math.round(mean * 100)}%`);
  for (const r of rates) assert.ok(r.fights >= 6, `${r.cls}: about ten fights a breach (${r.fights.toFixed(1)})`);
});

test('the breach is a playtest only: a fresh campaign has none, and the save version is unchanged', async () => {
  const s = fresh();
  assert.equal(s.breach, undefined);
  const { SAVE_VERSION } = await import('./dist/combat.mjs');
  assert.equal(SAVE_VERSION, 38);
  assert.ok(maxSignal(s) > 0);
});

test('healing cap: heals in a breach fight stop at the Signal you came in with, and the bar fences off the rest', async () => {
  const { heal, healCap } = await import('./dist/combat.mjs');
  const { hudMarkup } = await import('./dist/view.mjs');
  const s = breach('bastion', 3), b = s.breach;
  b.signal = Math.round(b.max * 0.6);
  fight(s, nodeOf(s, 'virus'));
  const came = s.run.integrity;
  assert.equal(healCap(s), came, 'the cap is the Signal brought in');
  s.run.integrity = came - 30;
  heal(s, 100, 'Test');
  assert.equal(s.run.integrity, came, 'a big heal stops at the cap');
  heal(s, 10, 'Test');
  assert.equal(s.run.integrity, came, 'at the cap, nothing more heals');
  assert.match(hudMarkup(s), /class="heal-cap" style="left:60(\.\d+)?%/, 'the bar marks the cap where it sits');
});

test('healing cap: Sasser restores like a patch, past the cap, and raises it', async () => {
  const { heal, healCap } = await import('./dist/combat.mjs');
  const s = breach('bastion', 3), b = s.breach;
  b.signal = Math.round(b.max * 0.5);
  fight(s, nodeOf(s, 'virus'));
  const came = s.run.integrity;
  heal(s, Math.round(b.max * 0.2), 'Sasser restores', { lift: true });
  assert.ok(s.run.integrity > came, 'Sasser goes past the Signal you came in with');
  assert.equal(healCap(s), s.run.integrity, 'and the cap rises with it');
});

// Sets (sets.mjs, content/sets.mjs; docs/genome.md 9): pieces are uniques carrying `set`, counted from what you have
// loaded, bonuses at 2, 3 and 4 with only one 4-piece bonus at a time, the bonuses running in the fight engine, the
// Kestrel guards' own pieces at a low chance with visible pity, the Collection's Sets, the tooltip and row lines, the
// LOWLIGHT Badge's story beat and save v45. The class bands with set pieces loaded are sets-balance.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fresh, command, selectEncounter, resolveCycle, active, finish, addItem, loaded, hackerOf, roomKill, rollDrop, uniqueFrom, guardSetChance, guardSetTable, setDeliver, maxSignal, restore, addLocation, gearFx, hooks, UNIQUES, SAVE_VERSION } from './dist/combat.mjs';
import { SETS, setOf, isPiece, piecesOf, activeSets, setFx, setCard, SET_LOOT, setPool, BADGE_BEAT } from './dist/sets.mjs';
import { uniqueItem, seeded, BASES, RARITIES } from './dist/gear.mjs';
import { itemTipMarkup, collectionSets, collectionMarkup, protocolSlotsCard, protocolStashCard } from './dist/view.mjs';
import { traceAdd, TRACE } from './dist/run.mjs';
import { trace as breachTrace } from './dist/breach.mjs';
import { STORY_LENGTH, openContracts, tickMail, ready } from './dist/mail.mjs';
import { entryOf } from './dist/codex.mjs';
import { codexPageMarkup } from './dist/codex-view.mjs';
import { CONFIG, GUARDS } from './dist/data.mjs';
import STORY from './dist/content/story.mjs';
import ITEMS from './dist/content/items.mjs';

CONFIG.baseCrit = 0; CONFIG.enemyCrit = 0; CONFIG.misses = false;
const T0 = 2_000_000;
hooks.now = () => T0;
const KESTREL = ['kestrel-badge', 'kestrel-token', 'kestrel-lanyard'];
const at = (L = 12) => { const s = fresh(); hackerOf(s).level = L; return s; };
const give = (s, id, level = 12) => addItem(s, uniqueItem(UNIQUES[id], level, seeded(3)));
const wear = (s, ids, level = 12) => ids.map((id) => { const it = give(s, id, level); command(s, 'load ' + it.id); return it; });
const onRun = (s) => { s.run = { loc: 'sim', cwd: '/', integrity: maxSignal(s), max: maxSignal(s), pack: [], visited: ['/'] }; return s; };
const guardFight = (s, key = 'watchdog', seed = 5) => { selectEncounter(s, key, seed, { mode: 'run', room: '/g', level: 12 }); onRun(s); command(s, 'engage'); s.run.integrity = s.run.max = 99999; return s.encounter; };
// A guard kill on a traced server: roomKill's guard path (netrooms.mjs 'won'), on a server this many floors down.
const guardKill = (s, guard, depth = 2, level = 12) => { s.run ||= onRun(s).run; roomKill(s, { virus: { level, name: GUARDS[guard].name.toUpperCase(), family: guard }, key: guard, room: '/gate', seed: s.serial }, { guard: true, loc: { depth, family: 'ransomware' } }); };
const packPieces = (s) => (s.run?.pack || []).filter((f) => f.item?.unique && isPiece(f.item.unique));

test('the sets are data: Kestrel Clearance (3) and LOWLIGHT Kit (2), each piece a unique carrying its set', () => {
  assert.deepEqual(Object.keys(SETS), ['kestrel', 'lowlight']);
  for (const [id, set] of Object.entries(SETS)) {
    assert.ok(set.pieces.length >= 2 && set.pieces.length <= 4, `${id}: two to four pieces`);
    for (const p of set.pieces) { assert.ok(UNIQUES[p], `${p} is a unique`); assert.equal(UNIQUES[p].set, id, `${p} carries set: ${id}`); }
    for (const n of Object.keys(set.bonuses)) assert.ok([2, 3, 4].includes(+n) && +n <= set.pieces.length, `${id}: a bonus at ${n}`);
  }
  // And the other way: every unique carrying a set is in that set's list.
  for (const u of ITEMS.uniques.filter((x) => x.set)) assert.ok(SETS[u.set]?.pieces.includes(u.id), `${u.id} is listed in ${u.set}`);
  assert.deepEqual(KESTREL.map((id) => BASES[UNIQUES[id].base].slot), ['proxy', 'script', 'shell']);
  assert.deepEqual(KESTREL.map((id) => UNIQUES[id].sources[0]), [{ kind: 'guard', id: 'bouncer', layer: 2 }, { kind: 'guard', id: 'tracer', layer: 2 }, { kind: 'guard', id: 'sentinel', layer: 2 }]);
  assert.deepEqual(piecesOf('lowlight'), ['wicks-old-toolkit', 'lowlight-badge']);
  assert.equal(BASES[UNIQUES['wicks-old-toolkit'].base].slot, 'exploit');
  assert.equal(BASES[UNIQUES['lowlight-badge'].base].slot, 'implant');
  assert.equal(SETS.kestrel.bonuses[2].text, "Trace on runs grows 25% slower, and a guard's first attack waits a cycle.");
  assert.equal(SETS.kestrel.bonuses[3].text, 'Every 5 cycles, if you have no ◆, you gain one.');
  assert.equal(SETS.lowlight.bonuses[2].text, 'Delivering a contract fills your Signal, and your next kill pays 25% more XP.');
  // Each piece keeps its own effect, grows with item level like every unique, and rolls no implicit.
  for (const id of KESTREL) assert.ok(UNIQUES[id].effect, `${id} has its own effect`);
  const lo = uniqueItem(UNIQUES['kestrel-badge'], 7, seeded(1)), hi = uniqueItem(UNIQUES['kestrel-badge'], 30, seeded(1));
  assert.ok(hi.stats.signal > lo.stats.signal && hi.level === 30, 'a piece found at 30 keeps up');
  for (const it of [lo, hi]) { assert.equal(it.rarity, 'zeroday'); assert.ok(!('implicit' in it) && !it.rule && !it.affixes.length, 'designed whole: no implicit, no rule, no affixes'); }
});

test('the set colour: its own token, apart from the five rarities and from teal (you)', () => {
  const css = fs.readFileSync(new URL('./dist/style.css', import.meta.url), 'utf8');
  const tok = (k) => css.match(new RegExp(`--${k}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1].toLowerCase();
  const set = tok('r-set');
  assert.ok(set, '--r-set is defined');
  for (const r of ['r-stock', 'r-tuned', 'r-custom', 'r-zeroday', 'r-indemnified', 'you', 'steel', 'daemon']) assert.notEqual(set, tok(r), `set green is not --${r}`);
  assert.ok(!/\.set-[a-z-]*[^{]*\{[^}]*var\(--you\)/.test(css), 'no set rule paints in teal');
  assert.ok(Object.keys(RARITIES).length === 6, 'the rarities are unchanged: a piece is a unique (gold)');
  const ui = fs.readFileSync(new URL('./docs/ui.md', import.meta.url), 'utf8');
  assert.match(ui, /--r-set/, 'docs/ui.md documents it');
});

test('counting: each piece you have loaded counts once; bonuses open at 2 and 3', () => {
  const s = at(12);
  assert.deepEqual(activeSets(loaded(s)), []);
  const [badge] = wear(s, ['kestrel-badge']);
  assert.deepEqual(activeSets(loaded(s)).map((r) => [r.id, r.n, r.total, r.open]), [['kestrel', 1, 3, []]]);
  assert.equal(setFx(loaded(s)).length, 0, 'one piece: no bonus');
  give(s, 'kestrel-token'); // in the stash, not loaded: doesn't count
  assert.equal(activeSets(loaded(s))[0].n, 1);
  wear(s, ['kestrel-token']);
  assert.deepEqual(activeSets(loaded(s))[0].open, [2]);
  assert.deepEqual(setFx(loaded(s)).map((x) => x.fx.do), ['trace-slow', 'guard-late']);
  wear(s, ['kestrel-lanyard']);
  assert.deepEqual(activeSets(loaded(s))[0].open, [2, 3]);
  assert.deepEqual(gearFx(s).filter((x) => x.set).map((x) => x.id), ['set:kestrel:2:0', 'set:kestrel:2:1', 'set:kestrel:3:0'], 'the engine lists the bonuses beside the pieces\' own effects');
  assert.ok(KESTREL.every((id) => gearFx(s).some((x) => x.id === id)), 'and every piece keeps its own');
  command(s, 'unload ' + badge.id);
  assert.deepEqual(activeSets(loaded(s))[0].open, [2], 'take one off and the 3-piece goes');
  // The same piece twice counts once (two copies can't both load, but a list can hold them).
  const twice = [badge, { ...badge, id: 'g999' }];
  assert.equal(activeSets(twice)[0].n, 1);
});

test('only one 4-piece bonus: of two sets that qualify, the one that reached four first keeps it', () => {
  const ids = ['lien', 'overtime', 'foremans-lanyard', 'hop-limit', 'cold-wallet', 'air-gap', 'thermal-paste', 'fan-curve'];
  const bonus = (name) => ({ 2: { text: `${name} two`, fx: [] }, 4: { text: `${name} four`, fx: [{ when: 'start', do: 'shield', value: 9 }] } });
  SETS.testa = { id: 'testa', name: 'Test A', pieces: ids.slice(0, 4), bonuses: bonus('A') };
  SETS.testb = { id: 'testb', name: 'Test B', pieces: ids.slice(4), bonuses: bonus('B') };
  try {
    const item = (id, on) => ({ ...uniqueItem(UNIQUES[id], 12, seeded(1)), id: 'x' + id, on });
    // A's four went on at 1–4, B's at 5–8: A reached four first.
    let worn = [...ids.slice(4).map((id, i) => item(id, 5 + i)), ...ids.slice(0, 4).map((id, i) => item(id, 1 + i))];
    let rows = activeSets(worn);
    assert.deepEqual(rows.find((r) => r.id === 'testa').open, [2, 4]);
    assert.deepEqual(rows.find((r) => r.id === 'testb').open, [2], 'B keeps its 2-piece');
    assert.deepEqual(rows.find((r) => r.id === 'testb').blocked, { at: 4, by: 'Test A' });
    assert.equal(setFx(worn).filter((x) => x.at === 4).length, 1, 'one 4-piece bonus runs');
    // B's last piece went on before A's: B reached four first (not slot order, not the first piece).
    worn = [...ids.slice(0, 3).map((id, i) => item(id, 1 + i)), item(ids[3], 20), ...ids.slice(4).map((id, i) => item(id, 5 + i))];
    rows = activeSets(worn);
    assert.deepEqual(rows.find((r) => r.id === 'testb').open, [2, 4]);
    assert.equal(rows.find((r) => r.id === 'testa').blocked.by, 'Test B');
    // The UI says so: the blocked line names the set holding it.
    const card = setCard('testa', { worn: ids, active: rows });
    assert.deepEqual(card.bonuses.map((b) => [b.at, b.on, b.blocked]), [[2, true, null], [4, false, 'Test B']]);
  } finally { delete SETS.testa; delete SETS.testb; }
});

test('Kestrel Clearance (2): a guard\'s first attack waits a cycle; Trace grows 25% slower', () => {
  const plain = guardFight(at(12)).virus.parts.map((p) => p.attack?.due);
  const s = at(12);
  wear(s, ['kestrel-badge', 'kestrel-token']);
  const e = guardFight(s);
  assert.deepEqual(e.virus.parts.map((p) => p.attack?.due), plain.map((d) => (d == null ? d : d + 1)));
  assert.ok(s.logs.some((l) => /Kestrel Clearance \(2\): the Watchdog's first attack waits a cycle/.test(l.message)));
  // Not on a plain virus.
  const w = at(12); wear(w, ['kestrel-badge', 'kestrel-token']);
  const base = at(12);
  for (const x of [w, base]) { selectEncounter(x, 'cryptjack', 5, { level: 12 }); command(x, 'engage'); }
  assert.deepEqual(w.encounter.virus.parts.map((p) => p.attack?.due), base.encounter.virus.parts.map((p) => p.attack?.due));
  // Trace (the old runs' and a breach's): 20 becomes 15; a fall is untouched.
  const run = (worn) => { const x = at(12); if (worn) wear(x, ['kestrel-badge', 'kestrel-token']); const loc = addLocation(x, 'worm', 1); x.run = { loc: loc.id, cwd: '/', integrity: 50, max: 50, pack: [], visited: ['/'], trace: 0 }; traceAdd(x, 20); const up = x.run.trace; traceAdd(x, -10); return [up, x.run.trace]; };
  assert.deepEqual(run(false), [20, 10]);
  assert.deepEqual(run(true), [15, 5]);
  const breach = (worn) => { const x = at(12); if (worn) wear(x, ['kestrel-badge', 'kestrel-token']); x.breach = { trace: 0, tracePeak: 0, rules: {}, log: [] }; breachTrace(x, 20); return x.breach.trace; };
  assert.equal(breach(false), 20);
  assert.equal(breach(true), 15);
  assert.ok(TRACE.cd > 0);
});

test('Kestrel Clearance (3): every 5th cycle, a ◆ if you have none', () => {
  const s = at(12);
  wear(s, KESTREL);
  const e = guardFight(s, 'shredder');
  const seen = {};
  for (let i = 0; i < 11 && active(s); i++) { e.chits = 0; command(s, 'hold'); resolveCycle(s); seen[e.cycle - 1] = e.chits; }
  assert.equal(seen[5], 1, 'after cycle 5');
  assert.equal(seen[10], 1, 'after cycle 10');
  assert.equal(seen[4] + seen[6] + seen[7], 0, 'not between');
  // With a ◆ already up it gives none (never stacks past one).
  const t = at(12); wear(t, KESTREL);
  const f = guardFight(t, 'shredder');
  for (let i = 0; i < 4 && active(t); i++) { command(t, 'hold'); resolveCycle(t); }
  f.chits = 1;
  command(t, 'hold'); resolveCycle(t);
  assert.ok(f.chits <= 1);
  // The HUD's gear row carries it, lit while you have no ◆.
  assert.ok(gearFx(t).some((x) => x.fx.if === 'no-chit'));
  // Two pieces: no ◆.
  const two = at(12); wear(two, ['kestrel-badge', 'kestrel-token']);
  const g = guardFight(two, 'shredder');
  for (let i = 0; i < 6 && active(two); i++) { g.chits = 0; command(two, 'hold'); resolveCycle(two); }
  assert.equal(g.chits, 0);
});

test('LOWLIGHT Kit (2): delivering a contract fills your Signal, and your next kill pays 25% more XP', () => {
  const kill = (s) => { selectEncounter(s, 'cryptjack', 9, { level: 22, mutation: null }); command(s, 'engage'); const mark = s.serial; finish(s, 'victory'); return s.logs.filter((l) => l.id > mark); };
  const base = at(22), s = at(22);
  wear(s, ['wicks-old-toolkit', 'lowlight-badge'], 22);
  wear(base, ['wicks-old-toolkit'], 22);
  assert.deepEqual(activeSets(loaded(s))[0].open, [2]);
  s.signal = 5; base.signal = 5;
  setDeliver(s); setDeliver(base);
  assert.equal(s.signal, null, 'full at home');
  assert.equal(base.signal, 5, 'one piece: nothing');
  assert.equal(s.killXp, 25);
  const xpOf = (log) => log.filter((l) => l.type === 'xp').reduce((n, l) => n + l.amount, 0);
  const a = kill(s), b = kill(base);
  const bonus = a.find((l) => l.type === 'set-xp');
  assert.ok(bonus && bonus.amount > 0, 'the kill names the bonus');
  assert.equal(xpOf(a) - xpOf(b), bonus.amount);
  assert.ok(Math.abs(bonus.amount / (xpOf(b) - (b.find((l) => l.type === 'behind')?.amount || 0))) - 0.25 < 0.05, `about 25%: ${bonus.amount} of ${xpOf(b)}`);
  assert.equal(s.killXp, undefined, 'one kill only');
  assert.equal(kill(s).find((l) => l.type === 'set-xp'), undefined);
  // On a run: your Signal fills.
  onRun(s); s.run.integrity = 3; setDeliver(s);
  assert.equal(s.run.integrity, s.run.max);
  // Mail's deliver runs it (mail.mjs): a materials job, delivered with both pieces on.
  const m = at(22);
  wear(m, ['wicks-old-toolkit', 'lowlight-badge'], 22);
  const j = { id: 77, type: 'materials', material: 'worm', amount: 1, got: 0, reward: { credits: 5 }, from: 'x', subject: 'x', body: [] };
  m.mail.jobs.push(j); m.materials = { ...(m.materials || {}), worm: 3 }; m.signal = 4;
  command(m, 'mail deliver 77');
  assert.ok(j.done);
  assert.equal(m.signal, null);
  assert.equal(m.killXp, 25);
});

test('the Kestrel guards drop their own piece: low odds, visible pity, the piece you lack first, floor 2 and below', () => {
  assert.deepEqual(setPool('bouncer').map((u) => u.id), ['kestrel-badge']);
  assert.deepEqual(setPool('watchdog'), []);
  assert.ok(SET_LOOT.chance <= 0.05 && SET_LOOT.pity > 0 && SET_LOOT.pity < SET_LOOT.chance && SET_LOOT.found < SET_LOOT.chance);
  const was = { ...SET_LOOT };
  try {
    // A miss: pity grows and the next chance is said.
    const s = at(12);
    SET_LOOT.chance = 0; SET_LOOT.pity = 0.02;
    guardKill(s, 'bouncer');
    assert.equal(s.pity['set:bouncer'], 1);
    assert.ok(s.logs.some((l) => /No Kestrel Clearance piece from BOUNCER this time\. The next kill has a 2% chance\./.test(l.message)), 'the next chance, said');
    Object.assign(SET_LOOT, was);
    assert.ok(Math.abs(guardSetChance(s, 'bouncer') - (SET_LOOT.chance + SET_LOOT.pity)) < 1e-9);
    // Floor 1: no roll at all (its pity doesn't move).
    guardKill(s, 'bouncer', 1);
    assert.equal(s.pity['set:bouncer'], 1);
    // A hit: the piece into your pack at the kill's level, pity back to nothing.
    SET_LOOT.chance = 2;
    guardKill(s, 'bouncer', 2, 14);
    const [f] = packPieces(s);
    assert.equal(f.item.unique, 'kestrel-badge');
    assert.equal(f.item.level, 14);
    assert.equal(s.pity['set:bouncer'], 0);
    assert.ok(s.logs.some((l) => l.type === 'drop' && l.set === 'kestrel' && /a Kestrel Clearance piece/.test(l.message)));
    Object.assign(SET_LOOT, was);
    // Found (banked): a flat chance and no pity.
    (s.collection ||= {})['kestrel-badge'] = 1;
    assert.equal(guardSetChance(s, 'bouncer'), SET_LOOT.found);
    SET_LOOT.found = -1;
    const before = s.pity['set:bouncer'];
    guardKill(s, 'bouncer');
    assert.equal(s.pity['set:bouncer'], before, 'no pity once found');
  } finally { Object.assign(SET_LOOT, was); }
  // The pace: about 8 kills of a guard for its piece, and the random golds never give one.
  let alive = 1, mean = 0;
  for (let k = 0; k < 200 && alive > 1e-9; k++) { mean += alive; alive *= 1 - Math.min(1, SET_LOOT.chance + SET_LOOT.pity * k); }
  assert.ok(mean > 6 && mean < 10, `kills to a piece ${mean.toFixed(1)}`);
  const s = at(20);
  for (let i = 0; i < 4000; i++) { const u = uniqueFrom(s, { kind: 'guard', id: 'bouncer', layer: 3 }, 20); assert.ok(!u || !isPiece(u.id)); }
  // Sampled: a fresh save's Tracer kills drop the Token about once every 8.
  const t = at(12); let kills = 0, got = 0;
  for (let i = 0; i < 1200; i++) { guardKill(t, 'tracer'); kills++; if (packPieces(t).length) { got++; t.run.pack = []; t.collection = {}; } }
  assert.ok(kills / got > 5 && kills / got < 11, `a Token every ${(kills / got).toFixed(1)} Tracer kills`);
});

test('the Codex shows a Kestrel guard\'s set piece, ??? until found, with the next kill\'s chance', () => {
  const s = at(12);
  s.met = { bouncer: true };
  const t = guardSetTable(s, 'bouncer');
  assert.deepEqual([t.name, t.floor, t.pieces[0].name, t.lacking], ['Kestrel Clearance', 2, null, true]);
  assert.equal(entryOf(s, 'guard:bouncer').setLoot.name, 'Kestrel Clearance');
  let html = codexPageMarkup(s, 'guard:bouncer');
  assert.match(html, /<b>\?\?\?<\/b><small>floor 2\+<\/small>/);
  assert.match(html, /Kestrel Clearance: 4% a kill, \+2% a miss\. Next kill <b class="you">4%<\/b>/);
  (s.pity ||= {})['set:bouncer'] = 3;
  assert.match(codexPageMarkup(s, 'guard:bouncer'), /Next kill <b class="you">10%<\/b>/);
  (s.collection ||= {})['kestrel-badge'] = 1;
  html = codexPageMarkup(s, 'guard:bouncer');
  assert.match(html, /Kestrel Badge/);
  assert.match(html, /Kestrel Clearance: found\. 1% a kill/);
  assert.equal(guardSetTable(s, 'watchdog'), null);
});

test('the Collection: a Sets section, a row a set, its pieces found (with where each drops) or ???', () => {
  const s = at(12);
  s.collection = { 'wicks-old-toolkit': 1 };
  let html = collectionSets(s);
  assert.match(html, /<h3 class="coll-sets-h">Sets<\/h3>/);
  assert.match(html, /Kestrel Clearance <span>0\/3<\/span>/);
  assert.match(html, /LOWLIGHT Kit <span>1\/2<\/span>/);
  assert.equal((html.match(/coll-q">\?\?\?/g) || []).length, 4, 'three Kestrel pieces and the Badge');
  assert.doesNotMatch(html, /Bouncer guard/, 'where a piece drops shows once you have found it');
  assert.match(html, /wick&#39;s Old Toolkit|wick's Old Toolkit/);
  assert.match(html, /Exploit · Storyline · Lv 1/);
  s.collection['kestrel-badge'] = 1;
  html = collectionSets(s);
  assert.match(html, /Kestrel Badge<\/b><small>Proxy · Bouncer guard · floor 2\+ · <span class="coll-odds"[^>]*>1% a kill<\/span>/);
  // In the whole log: the pieces sit under Sets, not in the main grid, and still count in its total.
  const full = collectionMarkup(s);
  assert.equal((full.match(/Kestrel Badge/g) || []).length, 1);
  assert.match(full, new RegExp(`Collection · 2/`));
});

test('the tooltip and the stash and slot rows: the set, its pieces and each bonus, greyed until on', () => {
  const s = at(12);
  s.collection = {};
  const [badge] = wear(s, ['kestrel-badge']);
  const token = give(s, 'kestrel-token');
  s.collection['kestrel-lanyard'] = 1; // found once, gone
  let tip = itemTipMarkup(s, badge.id);
  assert.match(tip, /<b class="set-name">Kestrel Clearance \(1\/3\)<\/b>/);
  assert.match(tip, /<span class="sp worn"[^>]*>Kestrel Badge<\/span>/);
  assert.match(tip, /<span class="sp held"[^>]*>Kestrel Token<\/span>/);
  assert.match(tip, /<span class="sp missing"[^>]*>Kestrel Lanyard<\/span>/);
  assert.match(tip, /<span class="sb"[^>]*>\(2\) Set: Trace on runs grows 25% slower, and a guard&#39;s first attack waits a cycle\.<\/span>|<span class="sb"[^>]*>\(2\) Set: Trace on runs grows 25% slower, and a guard's first attack waits a cycle\.<\/span>/);
  assert.match(tip, /<span class="sb"[^>]*>\(3\) Set: Every 5 cycles, if you have no ◆, you gain one\.<\/span>/);
  delete s.collection['kestrel-lanyard'];
  assert.match(itemTipMarkup(s, badge.id), /<span class="sp unknown"[^>]*>\?\?\?<\/span>/, 'never found: ???');
  command(s, 'load ' + token.id);
  tip = itemTipMarkup(s, badge.id);
  assert.match(tip, /Kestrel Clearance \(2\/3\)/);
  assert.match(tip, /<span class="sb on"[^>]*>\(2\) Set:/);
  assert.doesNotMatch(tip, /<span class="sb on"[^>]*>\(3\) Set:/);
  // The rows: a compact copy under the piece, in the slots and the stash.
  assert.match(protocolSlotsCard(s), /set-lines compact/);
  give(s, 'kestrel-lanyard');
  assert.match(protocolStashCard(s), /set-lines compact[^]*Kestrel Clearance \(2\/3\)/);
  // The Loadout: the active bonuses.
  const card = protocolSlotsCard(s);
  assert.match(card, /<h3>Set bonuses<\/h3>/);
  assert.match(card, /<span class="sb on">\(2\) Set: Trace on runs/);
  // A plain unique: no set lines.
  const plain = give(s, 'lien');
  assert.doesNotMatch(itemTipMarkup(s, plain.id), /set-lines/);
});

test('the LOWLIGHT Badge comes at level 22 from wick, with wick\'s Old Toolkit rebuilt at your level', () => {
  const beat = STORY.beats.find((b) => b.id === BADGE_BEAT);
  assert.ok(beat && beat.when.level === 22 && beat.reward.item === 'lowlight-badge' && beat.reward.items.includes('wicks-old-toolkit'));
  assert.equal(STORY.beats.at(-1).id, BADGE_BEAT);
  const s = at(20);
  s.mail.posted = STORY.beats.slice(0, -1).map((b) => b.id); s.mail.story = STORY_LENGTH - 1; s.mail.waiting = 'armed'; s.mail.waitFrom = 0;
  tickMail(s, T0);
  assert.ok(!openContracts(s).some((j) => j.beat === BADGE_BEAT), 'not before level 22');
  hackerOf(s).level = 22;
  tickMail(s, T0 + 1000);
  const j = openContracts(s).find((x) => x.beat === BADGE_BEAT);
  assert.ok(j && j.type === 'takeover');
  j.took = 'somewhere';
  assert.ok(ready(s, j));
  command(s, `mail deliver ${j.id}`);
  const got = s.stash.filter((it) => setOf(it.unique)?.id === 'lowlight');
  assert.deepEqual(got.map((it) => [it.unique, it.level]).sort(), [['lowlight-badge', 22], ['wicks-old-toolkit', 22]]);
});

test('save v45: loaded protocols are stamped in slot order, held pieces count as found, the Badge beat is armed', () => {
  assert.equal(SAVE_VERSION, 45);
  const s = at(22);
  const a = give(s, 'wicks-old-toolkit', 3), b = give(s, 'lien');
  command(s, 'load ' + a.id);
  const raw = structuredClone(s);
  raw.version = 44;
  delete raw.equipN;
  for (const it of raw.stash) delete it.on;
  raw.collection = {}; // a save whose toolkit came before the Collection
  raw.mail.posted = STORY.beats.slice(0, -1).map((x) => x.id); raw.mail.story = STORY_LENGTH - 1; raw.mail.waiting = false;
  const r = restore(raw);
  assert.equal(r.version, 45);
  assert.equal(r.stash.find((x) => x.id === a.id).on, 1);
  assert.equal(r.stash.find((x) => x.id === b.id).on, undefined, 'only what is loaded');
  assert.ok(r.collection['wicks-old-toolkit'], 'holding the Toolkit is owning the piece');
  assert.equal(r.mail.waiting, 'armed');
  // A new load stamps after them, and a v45 save round-trips untouched.
  command(r, 'load ' + b.id);
  assert.equal(r.stash.find((x) => x.id === b.id).on, 2);
  const again = restore(structuredClone(r));
  assert.deepEqual(again.stash.map((x) => x.on), r.stash.map((x) => x.on));
});

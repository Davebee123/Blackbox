// Sets (sets.mjs, content/sets.mjs; docs/genome.md 9, docs/loot-plan.md): the plan's 21 sets, pieces are uniques
// carrying `set`, counted from what you have loaded, each piece's own bonus and its green line, bonuses at 2, 3 and 4
// with only one 4-piece bonus at a time and a class set's subclass lines, the bonuses running in the fight engine,
// every source's pieces at a low chance with visible pity, the Collection's Sets, the tooltip and row lines, the
// LOWLIGHT Badge's story beat and save v45. The class bands with set pieces loaded are sets-balance.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fresh, command, selectEncounter, resolveCycle, finish, addItem, loaded, hackerOf, roomKill, uniqueFrom, guardSetChance, guardSetTable, setDeliver, maxSignal, restore, gearFx, fxHolds, gearStat, damageMultiplier, takeDamage, momentumStacks, setDrop, setDropPool, setChance, bossUniques, hooks, UNIQUES, SAVE_VERSION } from './dist/combat.mjs';
import { SETS, setOf, isPiece, piecesOf, activeSets, setFx, setCard, greenOf, SET_LOOT, CLASS_SET, SET_HOOKS, setPool, setCredits, BADGE_BEAT } from './dist/sets.mjs';
import { uniqueItem, seeded, BASES, RARITIES, STATS, baseFor } from './dist/gear.mjs';
import { itemTipMarkup, collectionSets, collectionMarkup, protocolSlotsCard, protocolStashCard, protocolDetailMarkup, protocolStatsCard, stashUi, rareLine } from './dist/view.mjs';
import { CARDS } from './dist/events.mjs';
import { PUZZLE_KINDS } from './dist/puzzles.mjs';
import { STORY_LENGTH, openContracts, tickMail, ready } from './dist/mail.mjs';
import { entryOf } from './dist/codex.mjs';
import { codexPageMarkup } from './dist/codex-view.mjs';
import { CONFIG, GUARDS, BOSSES, power } from './dist/data.mjs';
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


// The loot plan's 21 sets (docs/loot-plan.md): name, pieces with their slots, and the piece counts their bonuses open at.
const PLAN = {
  wrecking: ['Wrecking Crew', { Crowbar: 'exploit', 'Hard Hat': 'shell', 'Det Cord': 'script', 'Blast Map': 'implant' }, [2, 3, 4]],
  strongbox: ['Strongbox', { 'Vault Door': 'shell', Tumbler: 'implant', Drill: 'proxy', Combination: 'script' }, [2, 3, 4]],
  palemask: ['Palemask', { Veil: 'proxy', Pillow: 'shell', Exit: 'exploit', Mask: 'implant' }, [2, 3, 4]],
  'load-balanced': ['Load Balanced', { Relay: 'proxy', Cron: 'script', Core: 'implant', Parasite: 'shell' }, [2, 3, 4]],
  lowlight: ['LOWLIGHT Kit', { "wick's Old Toolkit": 'exploit', 'LOWLIGHT Badge': 'implant' }, [2]],
  bootdisk: ['Boot Disk', { Floppy: 'shell', 'Boot Sector': 'script' }, [2]],
  hivemind: ['Hive Mind', { Seed: 'exploit', Swarm: 'script', Carapace: 'shell', Queen: 'implant' }, [2, 3, 4]],
  kestrel: ['Kestrel Clearance', { 'Kestrel Badge': 'proxy', 'Kestrel Token': 'script', 'Kestrel Lanyard': 'shell' }, [2, 3]],
  nightshift: ['Night Shift', { Thermos: 'implant', Timecard: 'script', 'Night Light': 'proxy' }, [2, 3]],
  choirbook: ['Choirbook', { Psalter: 'script', Mirror: 'shell', Keys: 'exploit' }, [2, 3]],
  patchwork: ['Patchwork', { Stitch: 'exploit', Darn: 'proxy', Hem: 'shell', Seam: 'implant' }, [2, 3, 4]],
  lantern: ['Lantern Route', { Shortwave: 'proxy', Logbook: 'script', Antenna: 'implant' }, [2, 3]],
  glassceiling: ['Glass Ceiling', { Rotor: 'exploit', Quorum: 'proxy', Ledger: 'script', Parachute: 'implant' }, [2, 3, 4]],
  oncall: ['On-Call', { Pager: 'proxy', Runbook: 'script', Failover: 'shell' }, [2, 3]],
  coldstorage: ['Cold Storage', { Freezer: 'shell', 'Cold Cache': 'implant', 'Frost Line': 'proxy' }, [2, 3]],
  overtime: ['Overtime', { 'Punch Card': 'script', 'Time Clock': 'implant', 'Late Pass': 'proxy', 'Coffee Run': 'exploit' }, [2, 3, 4]],
  burstbuffer: ['Burst Buffer', { 'Cache Line': 'exploit', Prefetch: 'script', Flush: 'implant' }, [2, 3]],
  hotspare: ['Hot Spare', { Standby: 'shell', Failback: 'implant' }, [2]],
  mesh: ['Mesh', { Node: 'proxy', Link: 'script', Hub: 'implant' }, [2, 3]],
  deeparchive: ['Deep Archive', { Index: 'script', Spine: 'shell', Folio: 'exploit', Vellum: 'implant' }, [2, 3, 4]],
  bedrock: ['Bedrock', { 'Bedrock Plate': 'shell', 'Core Sample': 'implant', Pick: 'exploit', Survey: 'proxy' }, [2, 3, 4]],
};
const SUBS_OF = { breaker: ['demolitionist', 'overclocker'], bastion: ['warden', 'sysop'], infiltrator: ['phantom', 'payload'], operator: ['herder', 'hijacker'] };

test('the sets are data: every set in the plan, its pieces and slots, each piece a unique carrying its set', () => {
  assert.deepEqual(Object.keys(SETS).sort(), Object.keys(PLAN).sort());
  for (const [id, [name, pieces, at]] of Object.entries(PLAN)) {
    const set = SETS[id];
    assert.equal(set.name, name);
    assert.deepEqual(Object.fromEntries(set.pieces.map((p) => [UNIQUES[p].name, BASES[UNIQUES[p].base].slot])), pieces, `${name}: its pieces and slots`);
    assert.deepEqual(Object.keys(set.bonuses).map(Number), at, `${name}: bonuses at ${at}`);
    for (const p of set.pieces) { assert.ok(UNIQUES[p], `${p} is a unique`); assert.equal(UNIQUES[p].set, id, `${p} carries set: ${id}`); }
    // A class set takes four of the five slot kinds, so a general set can be worn beside it.
    if (set.cls) assert.equal(new Set(Object.values(pieces)).size, 4);
  }
  // And the other way: every unique carrying a set is in that set's list.
  for (const u of ITEMS.uniques.filter((x) => x.set)) assert.ok(SETS[u.set]?.pieces.includes(u.id), `${u.id} is listed in ${u.set}`);
  assert.deepEqual(KESTREL.map((id) => UNIQUES[id].sources[0]), [{ kind: 'guard', id: 'bouncer', layer: 2 }, { kind: 'guard', id: 'tracer', layer: 2 }, { kind: 'guard', id: 'sentinel', layer: 2 }]);
  assert.deepEqual(piecesOf('lowlight'), ['wicks-old-toolkit', 'lowlight-badge']);
  assert.equal(SETS.kestrel.bonuses[2].text, '+8% max Signal.');
  assert.equal(SETS.kestrel.bonuses[3].text, 'Once a fight, a hit that would take more than 30% of your max Signal deals 30% instead.');
  assert.equal(SETS.lowlight.bonuses[2].text, 'Delivering a contract fills your Signal, and your next kill pays 25% more XP.');
  // The class sets: one a class, its 4-piece with a line for each of the class's two subclasses, its pieces leaning to it.
  for (const [cls, subs] of Object.entries(SUBS_OF)) {
    const set = Object.values(SETS).find((x) => x.cls === cls);
    assert.ok(set, `a ${cls} set`);
    assert.deepEqual(Object.keys(set.bonuses[4].subs), subs);
    for (const p of set.pieces) assert.equal(UNIQUES[p].lean, cls, `${p} leans ${cls}`);
  }
  // Every piece has its own bonus (wick's Old Toolkit keeps none, as before) and a green line, with the plan's words.
  for (const id of Object.values(SETS).flatMap((x) => x.pieces)) {
    const u = UNIQUES[id];
    if (id !== 'wicks-old-toolkit') assert.ok(u.effect, `${id} has its own bonus`);
    assert.ok(u.green?.do && u.green.text, `${id} has a green line`);
    assert.ok(Object.keys(u.primary).length && (u.sources || []).length, `${id}: stats for its slot, and a source`);
  }
  assert.deepEqual(KESTREL.map((id) => UNIQUES[id].effect.value), [10, 10, 10]);
  // The words: combat and what you see, no virus, guard or boss by name, nothing casual.
  const words = Object.values(SETS).flatMap((x) => Object.values(x.bonuses).flatMap((b) => [b.text, ...Object.values(b.subs || {}).map((y) => y.text)]))
    .concat(Object.values(SETS).flatMap((x) => x.pieces).flatMap((id) => [UNIQUES[id].effect?.text, UNIQUES[id].green?.text]).filter(Boolean));
  const named = [...Object.values(GUARDS).map((g) => g.name), ...Object.values(BOSSES).map((b) => b.name), 'Resident', 'Keylogger'];
  for (const t of words) {
    assert.doesNotMatch(t, /keyhole|breach|way in|\bbreak-?in\b|intrusion|straight away/i, t);
    for (const n of named) assert.ok(!t.toLowerCase().includes(n.toLowerCase()), `${t} names ${n}`);
  }
  // Each piece grows with item level like every unique, in whole numbers, and rolls no implicit.
  const lo = uniqueItem(UNIQUES['kestrel-badge'], 7, seeded(1)), hi = uniqueItem(UNIQUES['kestrel-badge'], 30, seeded(1));
  assert.ok(hi.stats.signal > lo.stats.signal && hi.level === 30, 'a piece found at 30 keeps up');
  for (const it of [lo, hi]) { assert.equal(it.rarity, 'zeroday'); assert.ok(!('implicit' in it) && !it.rule && !it.affixes.length, 'designed whole: no implicit, no rule, no affixes'); }
  for (const id of Object.values(SETS).flatMap((x) => x.pieces)) assert.ok(Object.values(uniqueItem(UNIQUES[id], 50, seeded(1)).stats).every((v) => Number.isInteger(v)), `${id}: whole numbers`);
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


test('counting: each piece you have loaded counts once; bonuses open at 2 and 3, green lines at 2', () => {
  const s = at(12);
  assert.deepEqual(activeSets(loaded(s)), []);
  const [badge] = wear(s, ['kestrel-badge']);
  assert.deepEqual(activeSets(loaded(s)).map((r) => [r.id, r.n, r.total, r.open]), [['kestrel', 1, 3, []]]);
  assert.equal(setFx(loaded(s)).length, 0, 'one piece: no bonus, no green line');
  give(s, 'kestrel-token'); // in the stash, not loaded: doesn't count
  assert.equal(activeSets(loaded(s))[0].n, 1);
  wear(s, ['kestrel-token']);
  assert.deepEqual(activeSets(loaded(s))[0].open, [2]);
  assert.deepEqual(setFx(loaded(s)).map((x) => x.id), ['set:kestrel:2:0', 'green:kestrel-badge', 'green:kestrel-token']);
  wear(s, ['kestrel-lanyard']);
  assert.deepEqual(activeSets(loaded(s))[0].open, [2, 3]);
  assert.deepEqual(gearFx(s).filter((x) => x.set).map((x) => x.id), ['set:kestrel:2:0', 'set:kestrel:3:0', 'green:kestrel-badge', 'green:kestrel-lanyard', 'green:kestrel-token'], 'the engine lists the bonuses beside the pieces\' own effects');
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


test('Kestrel Clearance (2): +8% max Signal', () => {
  const s = at(12), base = at(12);
  wear(s, ['kestrel-badge']);
  const one = maxSignal(s);
  assert.ok(one > maxSignal(base), 'the Badge\'s own Signal');
  const [token] = wear(s, ['kestrel-token']);
  const raw = one + token.stats.signal;
  assert.equal(maxSignal(s), raw + Math.round((raw * 8) / 100), 'the whole, 8% more, rounded');
});

test('Kestrel Clearance (3): once a fight, a hit that would take more than 30% of your max Signal deals 30%', () => {
  const s = at(12);
  wear(s, KESTREL);
  guardFight(s);
  s.run.max = 100; s.run.integrity = 100;
  assert.equal(SET_HOOKS.absorb(s, 50, { name: 'Bite' }), 30);
  assert.ok(s.logs.some((l) => /Kestrel Clearance \(3\): Bite would take more than 30% of your max Signal\. It deals 30\./.test(l.message)));
  assert.equal(SET_HOOKS.absorb(s, 50, { name: 'Bite' }), 50, 'once a fight');
  // In a real landing: a part whose attack would take half your max takes 30%, Block and the shield after it.
  const t = at(12); wear(t, KESTREL);
  const f = guardFight(t, 'shredder');
  t.run.max = t.run.integrity = 200; f.shield = 0;
  const p = f.virus.parts.find((x) => x.attack?.effect === 'damage');
  for (const x of f.virus.parts) if (x.attack) x.attack.due = 99;
  Object.assign(p.attack, { amount: 100, due: f.cycle, hit: undefined });
  command(t, 'hold'); resolveCycle(t);
  assert.ok(200 - t.run.integrity <= 60, `capped: took ${200 - t.run.integrity}`);
  assert.ok(t.logs.some((l) => /Kestrel Clearance \(3\)/.test(l.message)));
  // Two pieces: no cap.
  const u = at(12); wear(u, ['kestrel-badge', 'kestrel-token']); guardFight(u);
  u.run.max = 100;
  assert.equal(SET_HOOKS.absorb(u, 50, { name: 'Bite' }), 50);
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
  assert.ok(Math.abs(bonus.amount / xpOf(b)) - 0.25 < 0.05, `about 25%: ${bonus.amount} of ${xpOf(b)}`);
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
  const G = SET_LOOT.guard;
  assert.ok(G.chance <= 0.05 && G.pity > 0 && G.pity < G.chance && G.found < G.chance);
  const was = { ...G };
  try {
    // A miss: pity grows and the next chance is said.
    const s = at(12);
    G.chance = 0; G.pity = 0.02;
    guardKill(s, 'bouncer');
    assert.equal(s.pity['set:bouncer'], 1);
    assert.ok(s.logs.some((l) => /No Kestrel Clearance piece from BOUNCER this time\. The next kill has a 2% chance\./.test(l.message)), 'the next chance, said');
    Object.assign(G, was);
    assert.ok(Math.abs(guardSetChance(s, 'bouncer') - (G.chance + G.pity)) < 1e-9);
    // Floor 1: no roll at all (its pity doesn't move).
    guardKill(s, 'bouncer', 1);
    assert.equal(s.pity['set:bouncer'], 1);
    // A hit: the piece into your pack at the kill's level, pity back to nothing.
    G.chance = 2;
    guardKill(s, 'bouncer', 2, 14);
    const [f] = packPieces(s);
    assert.equal(f.item.unique, 'kestrel-badge');
    assert.equal(f.item.level, 14);
    assert.equal(s.pity['set:bouncer'], 0);
    assert.ok(s.logs.some((l) => l.type === 'drop' && l.set === 'kestrel' && /a Kestrel Clearance piece/.test(l.message)));
    Object.assign(G, was);
    // Found (banked): a flat chance and no pity.
    (s.collection ||= {})['kestrel-badge'] = 1;
    assert.equal(guardSetChance(s, 'bouncer'), G.found);
    G.found = -1;
    const before = s.pity['set:bouncer'];
    guardKill(s, 'bouncer');
    assert.equal(s.pity['set:bouncer'], before, 'no pity once found');
  } finally { Object.assign(G, was); }
  // The pace: about 8 kills of a guard for its piece, and the random golds never give one.
  let alive = 1, mean = 0;
  for (let k = 0; k < 200 && alive > 1e-9; k++) { mean += alive; alive *= 1 - Math.min(1, G.chance + G.pity * k); }
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
  assert.equal((html.match(/coll-q">\?\?\?/g) || []).length, Object.values(SETS).flatMap((x) => x.pieces).length - 1, 'every piece but the Toolkit');
  assert.match(html, /Wrecking Crew <span>0\/4<\/span><\/b><small class="set-tier">Breaker tier set, level 50<\/small>/);
  // The class sets sit apart, under Tier sets, after every general set; a general set carries no tier line.
  const [general, tiers] = html.split('<h3 class="coll-sets-h">Tier sets · level 50</h3>');
  assert.ok(tiers && ['Wrecking Crew', 'Strongbox', 'Palemask', 'Load Balanced'].every((n) => tiers.includes(`${n} <span>`) && !general.includes(`${n} <span>`)), 'the tier sets under their own heading');
  assert.equal((tiers.match(/set-tier/g) || []).length, 4);
  assert.doesNotMatch(general, /set-tier/);
  assert.doesNotMatch(html, /Bouncer guard/, 'where a piece drops shows once you have found it');
  assert.match(html, /wick&#39;s Old Toolkit|wick's Old Toolkit/);
  assert.match(html, /Exploit · Storyline · Lv 1/);
  s.collection['kestrel-badge'] = 1;
  html = collectionSets(s);
  assert.match(html, /Kestrel Badge<\/b><small>Proxy · Bouncer guard · floor 2\+ · <span class="coll-odds"[^>]*>1% a kill<\/span>/);
  // A piece of the plan's sets says where it drops once found.
  s.collection.crowbar = 1; s.collection.floppy = 1;
  html = collectionSets(s);
  assert.match(html, /Crowbar<\/b><small>Exploit · Crew bosses, Floor 8 lair boss · Lv 50\+<\/small>/);
  assert.match(html, /Floppy<\/b><small>Shell · RELAY-KING, ★ rare spawns, floor 1 · Lv 1\+<\/small>/);
  delete s.collection.crowbar; delete s.collection.floppy;
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
  assert.match(tip, /<b class="set-name">Kestrel Clearance \(1\/3\)<\/b><span class="set-pieces">/, 'a general set: no tier line');
  assert.match(tip, /<span class="sp worn"[^>]*>Kestrel Badge<\/span>/);
  assert.match(tip, /<span class="sp held"[^>]*>Kestrel Token<\/span>/);
  assert.match(tip, /<span class="sp missing"[^>]*>Kestrel Lanyard<\/span>/);
  assert.match(tip, /<span class="sb"[^>]*>\(2\) Set: \+8% max Signal\.<\/span>/);
  assert.match(tip, /<span class="sb"[^>]*>\(3\) Set: Once a fight, a hit that would take more than 30% of your max Signal deals 30% instead\.<\/span>/);
  assert.match(tip, /<span class="sg"[^>]*>With 2 pieces: \+5% Clock Speed<\/span>/, 'its green line, grey');
  delete s.collection['kestrel-lanyard'];
  assert.match(itemTipMarkup(s, badge.id), /<span class="sp unknown"[^>]*>\?\?\?<\/span>/, 'never found: ???');
  command(s, 'load ' + token.id);
  tip = itemTipMarkup(s, badge.id);
  assert.match(tip, /Kestrel Clearance \(2\/3\)/);
  assert.match(tip, /<span class="sb on"[^>]*>\(2\) Set:/);
  assert.doesNotMatch(tip, /<span class="sb on"[^>]*>\(3\) Set:/);
  assert.match(tip, /<span class="sg on"[^>]*>With 2 pieces: \+5% Clock Speed<\/span>/, 'lit with two loaded');
  // On the board: the set and its count on the piece's footprint. A stash row keeps to name and numbers; its
  // datasheet popover has the set in full.
  assert.match(protocolSlotsCard(s), /<small class="silk-set">Kestrel Clearance \(2\/3\)<\/small>/);
  const lanyard = give(s, 'kestrel-lanyard');
  assert.doesNotMatch(protocolStashCard(s), /set-lines/);
  assert.match(protocolDetailMarkup(s, lanyard.id), /<b class="set-name">Kestrel Clearance \(2\/3\)<\/b>/);
  stashUi.sel = null;
  // The Loadout: the active bonuses, over the stat sheet.
  const card = protocolStatsCard(s);
  assert.match(card, /<h3>Set bonuses<\/h3>/);
  assert.match(card, /<span class="sb on">\(2\) Set: \+8% max Signal/);
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
  assert.ok(SAVE_VERSION >= 45);
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
  assert.equal(r.version, SAVE_VERSION);
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

// ---------- piece bonuses and green lines ----------
const fightAt = (s, L = 30) => { selectEncounter(s, 'cryptjack', 9, { level: L, mutation: null }); command(s, 'engage'); return s.encounter; };
const as = (cls, sub, L) => { const s = fresh(); s.loadout.archetype = cls; hackerOf(s).level = L; if (sub) s.loadout.sub = { [cls]: sub }; return s; };
const ratio = (a, b) => Math.round((a / b) * 1e6) / 1e6;

test('a piece works alone: stats for its slot and level, and its own small bonus', () => {
  const s = at(30);
  const [hat] = wear(s, ['hard-hat'], 30);
  assert.equal(BASES[hat.base].slot, 'shell');
  assert.equal(gearStat(s, 'reduction'), (hat.stats.reduction || 0) + 2, 'Hard Hat: +2 Block');
  assert.ok(hat.stats.signal > 0 && hat.stats.regen > 0, 'a shell\'s stats');
  // The Tumbler: +6% max Signal, on top of its own Signal.
  const t = at(32), plain = at(32);
  const [tum] = wear(t, ['tumbler'], 32);
  const raw = maxSignal(plain) + tum.stats.signal;
  assert.equal(maxSignal(t), raw + Math.round((raw * 6) / 100));
  // The Crowbar: +5% damage to parts below half, on all your damage (skill hits and burns alike).
  const c = at(30); wear(c, ['crowbar'], 30);
  const p = fightAt(c).virus.parts[0];
  const full = damageMultiplier(c, p, { mine: true }), dot = damageMultiplier(c, p, { dot: true });
  p.integrity = Math.floor(p.max / 2) - 1;
  assert.equal(ratio(damageMultiplier(c, p, { mine: true }), full), 1.05);
  assert.equal(ratio(damageMultiplier(c, p, { dot: true }), dot), 1.05);
  // Det Cord: a break heals 2% of your max.
  const d = at(30); wear(d, ['det-cord'], 30);
  const q = fightAt(d).virus.parts[0];
  d.server.integrity = Math.round(d.server.max / 2);
  q.integrity = 1; q.armor = 0;
  command(d, 'spike ' + q.id); resolveCycle(d);
  assert.ok(d.logs.some((l) => l.type === 'heal' && /^Det Cord/.test(l.message)), 'Det Cord heals on a break');
  // The Vault Door: the first hit on you each fight deals half.
  const v = at(30); wear(v, ['vault-door'], 30);
  assert.ok(gearFx(v).some((x) => x.fx.do === 'halve' && x.fx.limit === 'fight'));
});

test('a green line is grey with one piece and counts once two of its set are worn', () => {
  const s = at(30);
  wear(s, ['hard-hat'], 30);
  const crit = gearStat(s, 'crit');
  assert.equal(greenOf('hard-hat', loaded(s).map((x) => x.unique)).on, false, 'one piece: grey');
  wear(s, ['crowbar'], 30); // its green line: +5% crit; the Hard Hat's: +5% damage
  assert.equal(gearStat(s, 'crit'), crit + 5);
  assert.deepEqual(greenOf('crowbar', loaded(s).map((x) => x.unique)), { text: '+5% crit', at: 2, on: true });
  assert.equal(greenOf('blast-map', loaded(s).map((x) => x.unique)).on, false, 'a piece not loaded: grey');
  // A piece of another set doesn't light it.
  const t = at(30);
  wear(t, ['hard-hat', 'rotor'], 30);
  assert.equal(greenOf('hard-hat', loaded(t).map((x) => x.unique)).on, false);
  assert.ok(!setFx(loaded(t)).some((x) => x.id.startsWith('green:')));
  // Damage with the pair: the Hard Hat's green +5% and Wrecking Crew (2)'s +8%, against the Crowbar alone at full.
  const one = at(30); wear(one, ['crowbar'], 30);
  const m1 = damageMultiplier(one, fightAt(one).virus.parts[0], { mine: true }), m2 = damageMultiplier(s, fightAt(s).virus.parts[0], { mine: true });
  assert.equal(ratio(m2, m1), ratio(1.05 * 1.08, 1));
});

// ---------- set bonuses ----------
test('Patchwork: +5% damage and Signal at 2, +5% Clock Speed at 3, +2% for each different skill at 4, up to 12%', () => {
  const s = at(18);
  wear(s, ['stitch', 'darn'], 18);
  const fx = setFx(loaded(s));
  assert.ok(fx.some((x) => x.fx.do === 'signal%' && x.fx.value === 5) && fx.some((x) => x.fx.do === 'dmg%' && x.fx.value === 5 && x.at === 2));
  assert.equal(gearStat(s, 'clock'), 0);
  wear(s, ['hem'], 18);
  assert.equal(gearStat(s, 'clock'), 5, 'the 3-piece');
  wear(s, ['seam'], 18);
  assert.equal(gearStat(s, 'clock'), 9, 'and the Seam\'s own +4%');
  const e = fightAt(s, 18), p = e.virus.parts[0];
  const m0 = damageMultiplier(s, p, { mine: true });
  e.sx.skills.push('spike', 'a', 'b');
  assert.equal(ratio(damageMultiplier(s, p, { mine: true }), m0), 1.06, 'three skills: +6%');
  e.sx.skills.push('c', 'd', 'e', 'f', 'g');
  assert.equal(ratio(damageMultiplier(s, p, { mine: true }), m0), 1.12, 'up to +12%');
  // A real fight counts the skills you use.
  const t = at(18); wear(t, ['stitch', 'darn', 'hem', 'seam'], 18);
  const f = fightAt(t, 18);
  command(t, 'spike ' + f.virus.parts[0].id); resolveCycle(t);
  assert.deepEqual(f.sx.skills, ['spike']);
  assert.equal(STATS.clock.cap, 25);
});

test('Wrecking Crew (3) and (4): a break gives +10% damage, and the next damaging skill also hits the part beside it', () => {
  const s = at(32);
  wear(s, ['crowbar', 'det-cord', 'hard-hat', 'blast-map'], 32);
  const e = fightAt(s, 32), parts = e.virus.parts;
  parts.push({ ...structuredClone(parts[1]), id: 'spare', name: 'Spare' }); // a third part, so two are left after the break
  for (const x of parts) x.armor = 0;
  parts[0].integrity = 1;
  command(s, 'spike ' + parts[0].id); resolveCycle(s);
  assert.ok(!(parts[0].integrity > 0), 'broken');
  assert.ok(e.sx.rush?.value === 10 && e.sx.rush.until >= e.cycle, 'the rush');
  assert.equal(e.sx.splash, true, 'armed for the next skill, not the one that broke it');
  assert.ok(!s.logs.some((l) => /^Wrecking Crew \(4\): /.test(l.message)));
  const left = parts.filter((x) => x.integrity > 0);
  assert.ok(left.length >= 2, 'two parts left to hit');
  for (const x of left) { x.armor = 0; x.integrity = x.max = 500; }
  command(s, 'spike ' + left[0].id); resolveCycle(s);
  assert.ok(s.logs.some((l) => l.type === 'damage' && /^Wrecking Crew \(4\): /.test(l.message)), 'the splash');
  assert.equal(e.sx.splash, false, 'once a break');
});

test('Bedrock (3) and (4): +10% Clock Speed, the first cooldowns a cycle shorter; once a fight, a killing hit leaves you at 1', () => {
  const s = at(50);
  wear(s, ['bedrock-plate', 'core-sample', 'pick', 'survey'], 50);
  assert.equal(gearStat(s, 'clock'), 15, '+10%, and the Core Sample\'s green +5%');
  const e = guardFight(s);
  s.run.max = 1000; s.run.integrity = 50; e.shield = 0;
  takeDamage(s, 900, null, 'Test');
  assert.equal(s.run.integrity, 1);
  assert.equal(e.shield, 200, 'shielded for 20% of max');
  e.shield = 0;
  takeDamage(s, 900, null, 'Test');
  assert.equal(s.run.integrity, 0, 'once a fight');
  const t = at(50); wear(t, ['bedrock-plate', 'core-sample', 'pick'], 50); fightAt(t, 50);
  assert.equal(SET_HOOKS.cooldown(t, 'flood', 4), 3);
  t.encounter.sx.used.flood = true;
  assert.equal(SET_HOOKS.cooldown(t, 'flood', 4), 4, 'its first cooldown only');
  assert.equal(SET_HOOKS.cooldown(t, 'spike', 1), 1, 'never under 1');
});

test('Glass Ceiling (3): +10% damage below half Signal; Cold Storage (3): 8% less taken above 75%', () => {
  const s = at(26);
  wear(s, ['rotor', 'quorum', 'ledger'], 26);
  const p = guardFight(s).virus.parts[0];
  s.run.max = 100; s.run.integrity = 90;
  const hi = damageMultiplier(s, p, { mine: true });
  s.run.integrity = 40;
  assert.equal(ratio(damageMultiplier(s, p, { mine: true }), hi), 1.1);
  const c = at(26);
  wear(c, ['freezer', 'cold-cache', 'frost-line'], 26);
  guardFight(c);
  c.run.max = 100; c.run.integrity = 90;
  assert.equal(ratio(SET_HOOKS.taken(c), 1), 0.92);
  const block = gearStat(c, 'reduction');
  c.run.integrity = 60;
  assert.equal(SET_HOOKS.taken(c), 1);
  assert.equal(gearStat(c, 'reduction'), block - 1, 'the Frost Line\'s +1 Block above 75% only');
});

test('Hot Spare (2): the first time a fight drops you below 30%, a heal of 20% and 10% more damage', () => {
  const s = at(36);
  wear(s, ['standby', 'failback'], 36);
  const e = guardFight(s), p = e.virus.parts[0];
  s.run.max = 1000; s.run.integrity = 250;
  const before = damageMultiplier(s, p, { mine: true });
  SET_HOOKS.struck(s, { name: 'Bite' }, 10, p);
  assert.equal(s.run.integrity, 450, 'heals 20% of max');
  assert.equal(ratio(damageMultiplier(s, p, { mine: true }), before), 1.1);
  s.run.integrity = 250;
  SET_HOOKS.struck(s, { name: 'Bite' }, 10, p);
  assert.equal(s.run.integrity, 250, 'the first time only');
});

test('Load Balanced: helpers deal 10% more and last a cycle longer, and every third one arrives as two', () => {
  const s = as('operator', 'herder', 32), plain = as('operator', 'herder', 32);
  wear(s, ['cron', 'relay', 'parasite', 'core'], 32);
  const e = fightAt(s, 32), p = e.virus.parts[0];
  fightAt(plain, 32);
  assert.equal(ratio(damageMultiplier(s, p, { dot: true, src: 'helper' }), damageMultiplier(plain, plain.encounter.virus.parts[0], { dot: true, src: 'helper' })), ratio(1.1 * 1.05 * 1.05, 1), 'the 2-piece, the Cron and the Parasite\'s green +5% damage');
  // Three helpers called: each a cycle longer, the third one doubled.
  for (let i = 0; i < 3; i++) {
    const before = { shield: 0, parts: {}, burns: new Set(e.burns), helpers: new Set(e.helpers), allies: [] };
    e.helpers.push({ target: p.id, damage: 5, left: 3 });
    SET_HOOKS.used(s, { id: 'deploy', target: p, before });
  }
  assert.equal(e.helpers.length, 4);
  assert.ok(e.helpers.every((h) => h.left === 4));
  assert.equal(ratio(SET_HOOKS.dealt(s, p, { dot: true, src: 'helper', by: 'Last Gasp' }), SET_HOOKS.dealt(s, p, { dot: true, src: 'helper', by: 'Helper' })), 1.25, 'the Herder\'s Last Gasp');
  // The Hijacker's extra helper plants a second foothold, on another part.
  const h = as('operator', 'hijacker', 32); wear(h, ['cron', 'relay', 'parasite', 'core'], 32);
  const f = fightAt(h, 32), [a, b] = f.virus.parts;
  for (let i = 0; i < 3; i++) {
    const before = { shield: 0, parts: {}, burns: new Set(f.burns), helpers: new Set(f.helpers), allies: [] };
    f.helpers.push({ target: a.id, damage: 5, left: 3 });
    SET_HOOKS.used(h, { id: 'deploy', target: a, before });
  }
  assert.equal(f.helpers.filter((x) => x.target === b.id).length, 1);
});

test('a class set: anyone wears its 2- and 3-piece and the 4-piece\'s base line; each subclass line works for that subclass only', () => {
  const holds = (s, d) => gearFx(s).filter((x) => x.fx.do === d).some((x) => fxHolds(s, x.fx, {}));
  const crew = ['crowbar', 'det-cord', 'hard-hat', 'blast-map'];
  const demo = as('breaker', 'demolitionist', 32), oc = as('breaker', 'overclocker', 32), off = as('bastion', 'warden', 32);
  for (const s of [demo, oc, off]) { wear(s, crew, 32); fightAt(s, 32); }
  for (const s of [demo, oc, off]) { assert.ok(holds(s, 'break-splash'), 'the base 4-piece line'); assert.ok(holds(s, 'break-rush')); assert.ok(holds(s, 'dmg%')); }
  assert.deepEqual([demo, oc, off].map((s) => SET_HOOKS.spill(s)), [20, 0, 0], 'Overkill spills 20 more: the Demolitionist');
  assert.deepEqual([demo, oc, off].map((s) => holds(s, 'break-momentum')), [false, true, false], 'a Momentum: the Overclocker');
  // The Overclocker's break: two stacks of Momentum, where a plain break gives one.
  const plain = as('breaker', 'overclocker', 32); fightAt(plain, 32);
  for (const s of [oc, plain]) { for (const p of s.encounter.virus.parts) p.armor = 0; s.encounter.virus.parts[0].integrity = 1; command(s, 'spike ' + s.encounter.virus.parts[0].id); resolveCycle(s); }
  assert.equal(momentumStacks(oc), momentumStacks(plain) + 1);
  // Every class set reads the same way: each subclass's line for it, not the other's, not another class's.
  for (const [cls, [a, b]] of Object.entries(SUBS_OF)) {
    const set = Object.values(SETS).find((x) => x.cls === cls);
    const other = Object.keys(SUBS_OF).find((x) => x !== cls);
    for (const [who, sub, mine] of [[cls, a, a], [cls, b, b], [other, SUBS_OF[other][0], null]]) {
      const s = as(who, sub, 38);
      wear(s, set.pieces, 38); fightAt(s, 38);
      const subs = gearFx(s).filter((x) => x.fx.sub);
      assert.deepEqual([...new Set(subs.map((x) => x.fx.sub))].sort(), [a, b].sort(), `${set.name}: both lines listed`);
      for (const x of subs) assert.equal(fxHolds(s, x.fx, {}), x.fx.sub === mine, `${set.name} on a ${sub}: ${x.fx.sub}'s line`);
      assert.ok(gearFx(s).some((x) => x.at === 4 && !x.fx.sub && fxHolds(s, x.fx, { target: s.encounter.virus.parts[0] })), `${set.name}: the base line for a ${sub}`);
    }
  }
  // The tooltip lists both lines under the 4-piece, yours lit once it is on.
  const tip = itemTipMarkup(demo, loaded(demo)[0].id);
  assert.match(tip, /<b class="set-name">Wrecking Crew \(4\/4\)<\/b><small class="set-tier">Breaker tier set, level 50<\/small>/, 'the tooltip calls it the tier set for level 50');
  assert.doesNotMatch(protocolSlotsCard(demo), /set-tier/, 'a row keeps to one line of pieces');
  assert.match(tip, /<span class="sb sub on"[^>]*>Demolitionist: Overkill spills 20 more\.<\/span>/);
  assert.match(tip, /<span class="sb sub"[^>]*>Overclocker: You gain 1 Momentum\.<\/span>/);
  assert.match(protocolStatsCard(demo), /<span class="sb sub on">Demolitionist: Overkill spills 20 more\.<\/span>/);
});

test('Kestrel pieces held from save v45 keep working, as the retuned set', () => {
  assert.equal(SAVE_VERSION, 48, 'no save bump since v45 for sets (v46 is the subclass pick, v47 components, v48 Indemnity): a piece reads its bonuses from its unique, and its id and stats are unchanged');
  const s = at(12);
  const items = wear(s, KESTREL);
  (s.pity ||= {})['set:bouncer'] = 3;
  const r = restore(structuredClone(s));
  assert.deepEqual(r.stash.filter((x) => isPiece(x.unique)).map((x) => [x.unique, x.stats]), items.map((x) => [x.unique, x.stats]));
  assert.deepEqual(activeSets(loaded(r))[0].open, [2, 3]);
  assert.ok(gearFx(r).some((x) => x.fx.do === 'big-hit-cap') && gearFx(r).some((x) => x.fx.do === 'signal%' && x.fx.value === 8));
  assert.ok(!gearFx(r).some((x) => ['trace-slow', 'guard-late', 'chit-every'].includes(x.fx.do)), 'the old bonuses are gone');
  assert.equal(maxSignal(r), maxSignal(s));
  assert.equal(r.pity['set:bouncer'], 3, 'a guard\'s pity keeps its key');
  assert.equal(guardSetChance(r, 'bouncer'), Math.min(1, SET_LOOT.guard.found));
  delete r.collection['kestrel-badge'];
  assert.equal(guardSetChance(r, 'bouncer'), SET_LOOT.guard.chance + 3 * SET_LOOT.guard.pity);
  // An old v44 save holding a Kestrel piece (from before sets) comes through v45 to the same.
  const raw = structuredClone(s); raw.version = 44; raw.collection = {};
  const o = restore(raw);
  assert.ok(o.collection['kestrel-badge'] && activeSets(loaded(o))[0].open.includes(3));
});

// ---------- sources ----------
test('every piece has a source that rolls; a source rolls the pieces you lack first, with pity, then a flat chance', () => {
  const ROLLS = [['guard', { id: 'bouncer' }], ['guard', { id: 'tracer' }], ['guard', { id: 'sentinel' }], ['boss', { id: 'relayking' }], ['boss', { id: 'choir' }], ['boss', { id: 'repoman' }], ['crew', { id: 'foreman' }],
    ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((f) => [['lair', { floor: f }], ['rare', { floor: f }], ['vault', { floor: f }], ['thread', { floor: f }]]),
    ['strain', { lineage: 'ransomware' }], ['strain', { lineage: 'worm' }], ['strain', { lineage: 'ghostroot' }], ['author', { id: 'glassjaw' }], ['courier', {}], ['takeover', {}],
    ...PUZZLE_KINDS.map((id) => ['puzzle', { id }])];
  const reach = new Set(ROLLS.flatMap(([kind, x]) => setDropPool({ kind, layer: 9, ...x }).map((u) => u.id)));
  for (const id of Object.values(SETS).flatMap((x) => x.pieces).filter((p) => !UNIQUES[p].sources.every((x) => x.kind === 'story'))) assert.ok(reach.has(id), `${id} drops from somewhere`);
  for (const [kind, o] of Object.entries(SET_LOOT)) assert.ok(o.chance > 0 && o.pity > 0 && o.found > 0 && o.found <= o.chance, kind);
  // The floor 3 lair boss: On-Call's alone (the class sets are the level-50 tier sets now).
  assert.deepEqual(setDropPool({ kind: 'lair', floor: 3 }, 20).map((u) => u.id).sort(), ['pager', 'runbook']);
  const was = structuredClone(SET_LOOT);
  try {
    const s = at(20);
    SET_LOOT.lair.chance = 0;
    setDrop(s, { kind: 'lair', floor: 3 }, 20, 'DEADBOLT');
    assert.equal(s.pity['set:lair:3'], 1);
    assert.ok(s.logs.some((l) => new RegExp(`No On-Call piece from DEADBOLT this time\\. The next kill has a ${Math.round(SET_LOOT.lair.pity * 100)}% chance\\.`).test(l.message)), 'the next chance, said');
    // A crew boss at 50: Mesh's three and the tier sets' sixteen, the pieces you lack first, then the flat chance.
    const t = at(50);
    SET_LOOT.crew.chance = 0;
    setDrop(t, { kind: 'crew', id: 'foreman' }, 50, 'THE FOREMAN');
    assert.equal(t.pity['set:crew:foreman'], 1);
    assert.ok(t.logs.some((l) => new RegExp(`No set piece from THE FOREMAN this time\\. The next kill has a ${Math.round(SET_LOOT.crew.pity * 100)}% chance\\.`).test(l.message)), 'the next chance, said');
    SET_LOOT.crew.chance = 2;
    const got = [];
    for (let i = 0; i < 19; i++) got.push(setDrop(t, { kind: 'crew', id: 'foreman' }, 50, 'THE FOREMAN').unique);
    assert.equal(new Set(got).size, 19, 'the pieces you lack first');
    assert.equal(t.pity['set:crew:foreman'], 0);
    assert.equal(setChance(t, { kind: 'crew', id: 'foreman' }, 50), Math.min(1, SET_LOOT.crew.found), 'all found: the flat chance');
    // The deepest vaults: Deep Archive's, beside Cold Storage's (any vault); floor 4's, Cold Storage's alone.
    assert.deepEqual(setDropPool({ kind: 'vault', floor: 7 }, 44).map((u) => setOf(u.id).id).sort(), ['coldstorage', 'coldstorage', 'coldstorage', 'deeparchive', 'deeparchive', 'deeparchive', 'deeparchive']);
    assert.ok(setDropPool({ kind: 'vault', floor: 4 }, 44).every((u) => setOf(u.id).id === 'coldstorage'));
    // A vault's next chance names the vault; on a run the piece goes in your pack.
    const v = onRun(at(26)); SET_LOOT.vault.chance = 0;
    setDrop(v, { kind: 'vault', floor: 4 }, 26, "SRV's vault", { pack: true });
    assert.ok(v.logs.some((l) => /No Cold Storage piece from SRV's vault this time\. The next vault has a \d+% chance\./.test(l.message)));
    SET_LOOT.vault.chance = 2;
    setDrop(v, { kind: 'vault', floor: 4 }, 26, "SRV's vault", { pack: true });
    assert.equal(packPieces(v).length, 1);
    // A courier intercepted rolls for Lantern Route, into your stash.
    const c = at(16); SET_LOOT.courier.chance = 2;
    CARDS.courier.won(c, { level: 16, name: 'COURIER-1234', seed: 5 });
    assert.ok(c.stash.some((x) => setOf(x.unique)?.id === 'lantern'));
    // A ★ rare spawn on floor 1: Boot Disk; deeper, Burst Buffer's at its levels.
    assert.deepEqual(setDropPool({ kind: 'rare', floor: 1 }, 8).map((u) => u.id), ['floppy', 'boot-sector']);
    assert.deepEqual(setDropPool({ kind: 'rare', floor: 5 }, 26).map((u) => u.id), ['cache-line', 'prefetch']);
    // A boss's own uniques never include its set pieces (those roll on their own table).
    assert.ok(!bossUniques('relayking').some((u) => isPiece(u.id)));
    assert.ok(!bossUniques('choir').some((u) => isPiece(u.id)));
  } finally { for (const k of Object.keys(was)) Object.assign(SET_LOOT[k], was[k]); }
});

// ---------- the tier sets ----------
const TIERS = ['wrecking', 'strongbox', 'palemask', 'load-balanced'];
test('the class sets are the end-game tier sets: every piece level 50, the best stats for its slot there, from the crew bosses and the Bedrock lair boss', () => {
  assert.deepEqual(Object.values(SETS).filter((x) => x.tier).map((x) => x.id), TIERS);
  for (const id of TIERS) {
    const set = SETS[id];
    assert.equal(set.tier, 50);
    assert.deepEqual(set.levels, [50, 50]);
    for (const p of set.pieces) {
      const u = UNIQUES[p], slot = BASES[u.base].slot, best = baseFor(slot, 50);
      assert.equal(u.level, 50, `${p}: level 50`);
      assert.equal(u.base, best, `${p}: the best ${slot} base at 50`);
      // As the Bedrock uniques are statted: the base's primaries grown to 50, times 1.1.
      const k = (power(50) / power(BASES[best].level)) * 1.1;
      assert.deepEqual(u.primary, Object.fromEntries(Object.entries(BASES[best].primary).map(([st, v]) => [st, Array.isArray(v) ? v.map((x) => Math.round(x * k)) : Math.round(v * k)])), `${p}: its primaries`);
      assert.deepEqual(u.sources, [{ kind: 'crew' }, { kind: 'lair', floor: 8, planned: 'flash ranks' }], `${p}: the crew bosses and the Bedrock lair boss, flash ranks once built`);
    }
  }
  // Every crew boss and the Bedrock lair boss drop them at 50 (with Mesh's and Bedrock's), none before 48.
  const tierIds = TIERS.flatMap((id) => SETS[id].pieces).sort();
  for (const boss of ['foreman', 'heatsink', 'coldwallet']) {
    assert.deepEqual(setDropPool({ kind: 'crew', id: boss }, 50).filter((u) => setOf(u.id).tier).map((u) => u.id).sort(), tierIds, boss);
    assert.ok(setDropPool({ kind: 'crew', id: boss }, 47).every((u) => !setOf(u.id).tier), `${boss}: not under 48`);
  }
  assert.deepEqual(setDropPool({ kind: 'lair', floor: 8 }, 50).map((u) => u.id).filter((p) => !tierIds.includes(p)).sort(), ['bedrock-plate', 'core-sample', 'pick', 'survey']);
  assert.deepEqual(setDropPool({ kind: 'lair', floor: 8 }, 50).filter((u) => setOf(u.id).tier).map((u) => u.id).sort(), tierIds);
  // Floors 3 to 6 no longer drop them: their lair bosses keep their other pieces (On-Call on 3 and 4), and 5 and 6 none.
  for (const floor of [3, 4, 5, 6]) assert.ok(setDropPool({ kind: 'lair', floor }, 50).every((u) => !setOf(u.id).tier), `floor ${floor}`);
  assert.deepEqual([3, 4, 5, 6].map((floor) => setDropPool({ kind: 'lair', floor }, 50).map((u) => u.id).sort()), [['pager', 'runbook'], ['failover', 'pager', 'runbook'], [], []]);
  // No other source reaches them.
  for (const [kind, ctx] of [['vault', { floor: 8 }], ['rare', { floor: 8 }], ['thread', { floor: 8 }], ['boss', { id: 'relayking' }], ['strain', {}], ['takeover', {}], ['courier', {}]]) assert.ok(setDropPool({ kind, ...ctx }, 50).every((u) => !setOf(u.id).tier), kind);
});

test('a tier set drop comes up three times as often for your own class, pieces you lack first', () => {
  assert.equal(CLASS_SET, 3);
  const was = structuredClone(SET_LOOT);
  try {
    SET_LOOT.crew.chance = 2; SET_LOOT.lair.chance = 2;
    for (const [cls, own] of [['breaker', 'wrecking'], ['operator', 'load-balanced']]) {
      const n = { own: 0, other: 0, general: 0 };
      for (let i = 0; i < 900; i++) {
        const s = at(50); s.loadout.archetype = cls; s.hackers = { [cls]: { level: 50, xp: 0 } }; s.rng = i * 7919 + 1;
        const set = setOf(setDrop(s, { kind: 'crew', id: 'heatsink' }, 50, 'HEATSINK').unique);
        n[set.id === own ? 'own' : set.tier ? 'other' : 'general']++;
      }
      // Its four pieces at 3 each, the other twelve tier pieces and Mesh's three at 1: 12 in 27, 12 in 27, 3 in 27.
      const ratio = n.own / (n.other / 3);
      assert.ok(ratio > 2.5 && ratio < 3.5, `${cls}: ${JSON.stringify(n)}, ${ratio.toFixed(2)} times another class's set`);
      assert.ok(n.general > 50 && n.general < 160, `${cls}: Mesh still drops (${n.general})`);
    }
    // Pieces you lack come first: with your own set found, the next drops are the others', and Bedrock's.
    const s = at(50); s.loadout.archetype = 'breaker';
    s.collection = Object.fromEntries(SETS.wrecking.pieces.map((p) => [p, 1]));
    for (let i = 0; i < 16; i++) assert.notEqual(setOf(setDrop(s, { kind: 'lair', floor: 8 }, 50, 'X').unique).id, 'wrecking');
    assert.equal(setChance(s, { kind: 'lair', floor: 8 }, 50), SET_LOOT.lair.found, 'the other sixteen found: the flat chance');
  } finally { for (const k of Object.keys(was)) Object.assign(SET_LOOT[k], was[k]); }
});

test('tier pieces held from the floor 3 to 6 version keep their item level and stats, and work as the set', () => {
  assert.equal(SAVE_VERSION, 48, 'no save bump since v45 for sets (v46 is the subclass pick, v47 components, v48 Indemnity): a held piece keeps its stats and reads its bonuses from its unique and its set');
  // A Wrecking Crew found before, at its old levels and bases.
  const OLD = { crowbar: ['exploit-chain', 15, { damage: [15, 19] }], 'det-cord': ['loader', 20, { damage: 9, signal: 40, payload: 4 }], 'hard-hat': ['ghost-shell', 26, { signal: 70, regen: 15, restore: 30 }], 'blast-map': ['implant', 32, { damage: 6, signal: 30 }] };
  const s = as('breaker', 'demolitionist', 32);
  const held = Object.entries(OLD).map(([id, [base, level, primary]]) => { const it = addItem(s, uniqueItem({ ...UNIQUES[id], base, level, primary }, level, seeded(3))); command(s, 'load ' + it.id); return it; });
  assert.deepEqual(held.map((x) => x.level), [15, 20, 26, 32]);
  const r = restore(structuredClone(s));
  const back = r.stash.filter((x) => isPiece(x.unique));
  assert.deepEqual(back.map((x) => [x.unique, x.level, x.stats]), held.map((x) => [x.unique, x.level, x.stats]), 'the same item level and stats');
  assert.deepEqual(activeSets(loaded(r))[0].open, [2, 3, 4]);
  assert.ok(gearFx(r).some((x) => x.fx.do === 'break-splash') && gearFx(r).some((x) => x.fx.do === 'spill+' && fxHolds(r, x.fx, {})));
  assert.equal(gearStat(r, 'reduction'), held.reduce((n, x) => n + (x.stats.reduction || 0), 0) + 2, 'the Hard Hat\'s own +2 Block');
});

test('the Antenna shows a server\'s rare spawn on its map card; Lantern Route (3) pays caches and vaults more', () => {
  const s = at(16);
  const loc = { floorplan: { rare: { r1: true, r2: false }, graph: { rooms: { r1: { id: 'r1', path: '/var/proc' }, r2: { id: 'r2', path: '/tmp' } } } } };
  assert.equal(rareLine(s, loc), '');
  wear(s, ['antenna'], 16);
  assert.match(rareLine(s, loc), /★ Rare spawn<\/span> <small>\/var\/proc<\/small>/);
  assert.doesNotMatch(rareLine(s, loc), /\/tmp/);
  assert.equal(setCredits(s, 'cache'), 1);
  wear(s, ['shortwave', 'logbook'], 16);
  assert.equal(ratio(setCredits(s, 'cache'), 1), 1.35, 'the Logbook\'s 10% and the 3-piece\'s 25%');
  assert.equal(ratio(setCredits(s, 'vault'), 1), 1.25);
  assert.equal(gearStat(s, 'scavenge'), 5 + 10 + 5, 'the Shortwave, the 2-piece, the Antenna\'s green line');
});

test('the pace: about how many events of each source to a piece you lack, as GAME_RULES.md Sets lists them', () => {
  const mean = ({ chance, pity }) => { let alive = 1, m = 0; for (let k = 0; k < 1e5 && alive > 1e-9; k++) { m += alive; alive *= 1 - Math.min(1, chance + pity * k); } return m; };
  const RULES = { guard: 8, boss: 6, lair: 6, crew: 6, thread: 3.5, puzzle: 24, takeover: 15, vault: 44, courier: 35, author: 48, rare: 205, strain: 53 };
  assert.deepEqual(Object.keys(SET_LOOT).sort(), Object.keys(RULES).sort());
  for (const [kind, n] of Object.entries(RULES)) assert.ok(Math.abs(mean(SET_LOOT[kind]) / n - 1) < 0.15, `${kind}: ${mean(SET_LOOT[kind]).toFixed(1)} events, the rules say ${n}`);
  // The frequent sources are the slow ones: no source an event of which comes often (a kill, a vault) gives a piece in
  // fewer than 40 of them, bar a Kestrel guard post's own (about 8 kills of that one guard).
  for (const kind of ['rare', 'strain', 'author', 'vault']) assert.ok(mean(SET_LOOT[kind]) >= 40, kind);
});

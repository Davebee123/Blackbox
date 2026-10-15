// The Codex tab (dist/codex.mjs, dist/codex-view.mjs): an index of every kind of virus you can meet and an entry page
// for each, with only what you've found out. ??? until met (a boss until fought), a part's numbers once decoded (part
// research 1, research.mjs; research.test.mjs has the tiers), an attack set once faced in a room, a tell once one was
// said in your fight.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, hooks, finish, command, resolveCycle, restore, hackerLevel, selectEncounter } from './dist/combat.mjs';
import { CONFIG, BOSSES, STRAINS, GUARDS, FAMILIES, ROOM_FAMILIES, ROLLED_MUTATIONS } from './dist/data.mjs';
import * as FP from './dist/floorplan.mjs';
import { ATTACK_SETS, setName } from './dist/families.mjs';
import { entries, entryOf, sampleOf, partsOf, facedSet } from './dist/codex.mjs';
import { codexPageMarkup } from './dist/codex-view.mjs';
import { systemMarkup } from './dist/view.mjs';
import { TIPS, nextTip } from './dist/tips.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
let clock = Date.UTC(2026, 0, 1);
hooks.now = () => clock;
const server = (seed = 7, author = null) => {
  const s = fresh();
  s.rng = seed * 7777;
  FP.outfit(s, { cls: 'breaker', level: 10, gearSeed: seed });
  FP.startRooms(s, { seed, kind: 'Mailhub', size: 'large', level: 10, floor: 2, author });
  FP.connect(s);
  return s;
};
const place = (s, id) => { s.rooms.at = id; s.rooms.visit.walked[id] = true; s.rooms.screen = null; FP.look(s); };
const win = (s) => { s.encounter.virus.parts.forEach((p) => { p.integrity = 0; }); finish(s, 'victory'); FP.settle(s); };
const KEYS = [...[...Object.keys(FAMILIES), ...Object.keys(ROOM_FAMILIES)].map((id) => (ROOM_FAMILIES[id]?.runner ? `runner:${id}` : `family:${id}`)), ...Object.keys(STRAINS).map((id) => `strain:${id}`), ...Object.keys(GUARDS).map((id) => `guard:${id}`), ...Object.keys(BOSSES).map((id) => `boss:${id}`), ...ROLLED_MUTATIONS.map((id) => `mutation:${id}`)];
const rowsOf = (html) => [...html.matchAll(/<button type="button" class="cx-row([^"]*)" data-codex="([^"]+)"[^>]*>.*?<span class="cx-name">([^<]*)<\/span>/g)].map(([, cls, key, name]) => ({ key, unknown: cls.includes('unknown'), on: cls.includes(' on'), name }));

test('the Codex is a top-level tab between Loadout and System, and typing codex opens it', () => {
  const html = readFileSync('./dist/index.html', 'utf8'), tabs = [...html.matchAll(/data-module="(\w+)"/g)].map((m) => m[1]);
  assert.ok(tabs.indexOf('codex') > tabs.indexOf('loadout') && tabs.indexOf('codex') < tabs.indexOf('system'), 'between Loadout and System');
  assert.doesNotMatch(html.match(/<button data-module="codex"[^>]*>/)[0], /hidden/, 'always visible');
  assert.match(html, /href="codex.css"/);
  const app = readFileSync('./dist/app.js', 'utf8');
  assert.match(app, /const NAV = \[[^\]]*'codex'/, 'codex is a page you can type');
  assert.match(app, /codex: \(x\) => codexPageMarkup\(x, codexSel, codexIdx\)/, 'the page renders the Codex');
});

test('a fresh character: every entry ??? in its group, nothing spelled out, no undefined or NaN', () => {
  const s = fresh(), html = codexPageMarkup(s);
  const rows = rowsOf(html);
  assert.equal(rows.length, KEYS.length, 'one row an entry, every group');
  for (const r of rows) { assert.ok(r.unknown, `${r.key} is ??? (greyed)`); assert.equal(r.name, '???'); }
  for (const g of ['Families', 'Strains', 'Guards &amp; ICE', 'Bosses', 'Mutations']) assert.match(html, new RegExp(`<h3><span>${g}</span>`));
  assert.doesNotMatch(html, /<h3><span>Genes<\/span>/, 'no Genes group: a part\'s rules are its research');
  assert.match(html, /<h1 class="unknown">\?\?\?<\/h1>/, 'the entry it opens on is ??? too');
  assert.doesNotMatch(html, /Ransomware|Encryptor|Full Disk|DEADBOLT/, 'no names of what you have not met');
  for (const key of KEYS) { const h = codexPageMarkup(s, key); assert.doesNotMatch(h, /undefined|NaN/, key); }
  assert.doesNotMatch(codexPageMarkup(s, 'boss:nb-deadbolt'), /re-arms|Mutex/, "a boss's phases wait until you've fought it");
});

test('room fights fill it: the family, your kills, the set you faced (the others ???), parts ??? until researched', () => {
  const s = server(7);
  const room = FP.roomList(s).find((r) => r.kind === 'process' && FAMILIES[r.family] && !s.rooms.rare[r.id]);
  place(s, room.id); FP.fight(s, room);
  const v = s.encounter.virus, set = v.attackSet, fam = v.family;
  assert.ok(set && s.dex.sets[`${fam}:${set}`], 'the set you faced is in the Codex record');
  win(s);
  assert.equal(s.dex.kills[fam], 1, 'a kill of its family');
  const key = `family:${fam}`, html = codexPageMarkup(s, key);
  assert.ok(rowsOf(html).find((r) => r.key === key && !r.unknown && r.on), 'its row is named and open');
  assert.match(html, new RegExp(`<h1>${FAMILIES[fam].name}</h1>`));
  assert.match(html, /<span>Your kills<\/span><strong class="you">1<\/strong>/, 'your kills, in teal');
  // The set: named with its strip; every set you haven't faced is ???.
  const sets = Object.keys(ATTACK_SETS[fam]);
  assert.match(html, new RegExp(`<div class="cx-set"><div class="cxs-head"><b>${setName(fam, set)}</b>`));
  assert.equal((html.match(/cx-set unknown/g) || []).length, sets.length - 1, 'the other sets are ???');
  assert.equal((html.match(/class="m( dlv)?"/g) || []).length > 0, true, 'a mark per cycle a part fires');
  assert.match(html, /Each fight rolls its set, and nudges every part's first attack by up to 1 cycle\./);
  // Its parts: you broke none in this test, so the ones you haven't researched show their name and what they hit, and ???
  // for their numbers with what unlocks them.
  const e = entryOf(s, key);
  for (const x of e.parts.filter((p) => !p.known)) assert.ok(x.part, `${x.spec.id} is built`);
  assert.ok(e.parts.some((x) => !x.known), 'something left to decode');
  assert.match(html, /cx-part t0[\s\S]*?<p class="cxp-hits">[^<]+ · [a-z ]+<\/p>[\s\S]*?Research 1 to learn its numbers\./);
  assert.doesNotMatch(html, /undefined|NaN/);
});

test('a decoded part shows its numbers at your level, the same numbers a room fight at your level has', () => {
  const s = server(11);
  const L = hackerLevel(s);
  // Find a plain room at your level with no mutation, and fight it.
  const room = FP.roomList(s).find((r) => r.kind === 'process' && FAMILIES[r.family] && !s.rooms.rare[r.id] && !FP.fightOf(s, r).mutation);
  place(s, room.id); FP.fight(s, room);
  const v = s.encounter.virus, real = v.parts.find((p) => p.id === 'pulse');
  // Break its Pulse Node for real: decoded in the codex.
  Object.assign(real, { armor: 0, integrity: 1 });
  command(s, 'spike pulse'); resolveCycle(s);
  assert.equal(s.research[`${v.family}:pulse`], 1, 'decoded by breaking it: research 1');
  const x = partsOf(s, 'family', v.family).find((p) => p.spec.id === 'pulse');
  assert.ok(x.known);
  const sample = sampleOf('family', v.family, L, room.third || null).parts.find((p) => p.id === 'pulse');
  assert.equal(sample.max, real.max, "its Integrity is a room fight's at your level");
  assert.equal(sample.maxArmor, real.maxArmor, 'and its ◆');
  const html = codexPageMarkup(s, `family:${v.family}`);
  const cardOf = (h) => h.split(/<div class="cx-part t\d+[^"]*">/).find((c) => c.startsWith('<div class="cxp-head"><b>Pulse Node'));
  const card = cardOf(html);
  assert.ok(card, 'the Pulse Node has its card');
  assert.match(card, new RegExp(`<b>${x.part.max}</b> Integrity`), 'Integrity at your level');
  assert.match(card, new RegExp(`◆ <b>${x.part.maxArmor}</b>`), '◆ at your level');
  assert.match(card, new RegExp(`<b>Surge</b><span class="cxp-dmg">${x.part.attack.amount} damage</span><span class="cxp-when">every ${x.part.attack.interval} cycles`), 'its attack, damage and interval');
  assert.doesNotMatch(card, /cxp-answer/, 'its answer waits for research 5');
  assert.match(card, /Research 5 to learn its rule, its answer and its tells\./);
  s.research[`${v.family}:pulse`] = 5;
  assert.match(cardOf(codexPageMarkup(s, `family:${v.family}`)), /cxp-answer">Break it, or delay its attack/, 'at 5, what answers it (fightread partRead)');
  s.research[`${v.family}:pulse`] = 20;
  assert.match(cardOf(codexPageMarkup(s, `family:${v.family}`)), /Drops Pulse Kernel/, 'at 20, what it drops');
  // The same part one level up hits harder: the numbers follow your level.
  const lower = sampleOf('family', v.family, 1, null).parts.find((p) => p.id === 'pulse');
  assert.ok(x.part.max > lower.max && x.part.attack.amount > lower.attack.amount, 'level 10 numbers, not level 1');
  assert.match(html, /Parts <small>at <b class="you">Lv 10<\/b><\/small>/, 'the level, in teal');
});

test('tells: ??? until one is said in your fight, then what it does and what answers it', () => {
  const s = server(5);
  const room = FP.roomList(s).find((r) => r.kind === 'process' && r.family === 'ransomware') || FP.roomList(s).find((r) => r.kind === 'process' && FAMILIES[r.family]);
  const fam = room.family, key = `family:${fam}`;
  s.met = { ...(s.met || {}), [fam]: true };
  const before = codexPageMarkup(s, key);
  assert.ok((before.match(/cx-tell unknown/g) || []).length >= 1, 'its tells are ??? before you meet them');
  place(s, room.id); FP.fight(s, room);
  let said = null;
  for (let i = 0; i < 12 && !said && s.encounter?.phase === 'active'; i++) said = resolveCycle(s).find((e) => e.type === 'telegraph' && e.name)?.name;
  assert.ok(said, 'a level-10 virus says a tell');
  const t = s.encounter.virus.tells.list.find((x) => x.name.toUpperCase() === said);
  assert.equal(s.dex.tells[t.name.toLowerCase()], 1, 'the Codex record has it');
  const tell = entryOf(s, key).tells.find((x) => x.name === t.name);
  assert.ok(tell?.seen, 'seen on its page');
  const html = codexPageMarkup(s, key);
  assert.match(html, new RegExp(`<li class="cx-tell"><div class="cxt-head"><b>${t.name}</b>`));
  assert.match(html.split(`<b>${t.name}</b>`)[1], /cxp-does">[^<]+<\/p><p class="cxp-answer">[A-Z][^<]+\./, 'what it does and its answer');
});

test("bosses are ??? until fought; then their phases, rule and tells' shape", () => {
  const s = server(9);
  assert.match(codexPageMarkup(s, 'boss:nb-deadbolt'), /<h1 class="unknown">\?\?\?<\/h1>[\s\S]*Fight it to fill this page\./);
  const core = FP.roomList(s).find((r) => r.kind === 'core');
  place(s, core.id); FP.fight(s, core);
  assert.equal(s.dex.fought['nb-deadbolt'], 1, 'fought');
  const html = codexPageMarkup(s, 'boss:nb-deadbolt');
  assert.match(html, /<h1>DEADBOLT<\/h1>/);
  assert.match(html, /<span>Your fights<\/span><strong class="you">1<\/strong>/);
  for (const ph of BOSSES['nb-deadbolt'].phases) assert.ok(html.includes(ph.say.replace(/'/g, '&#39;')), 'each phase as it says it');
  assert.ok(html.includes(BOSSES['nb-deadbolt'].about), 'its rule');
  win(s);
  assert.equal(s.dex.won['nb-deadbolt'], 1);
  assert.doesNotMatch(html, /undefined|NaN/);
});

test('mutations: named with their rule once met, and where you saw them; the decode at two kills', () => {
  const s = fresh();
  selectEncounter(s, 'ghostroot', 1, { level: 8, mutation: 'hasty' }); // a Hasty GHOSTROOT
  command(s, 'engage');
  assert.deepEqual(s.dex.muts.hasty, ['ghostroot']);
  const html = codexPageMarkup(s, 'mutation:hasty');
  assert.match(html, /<h1>Hasty<\/h1>/);
  assert.match(html, /Every attack comes 1 cycle sooner/);
  assert.match(html, /<span class="tag">Ghostroot<\/span>/, 'seen on');
  assert.match(html, /Beat two viruses that carry it to decode the answer\./);
  assert.ok(rowsOf(codexPageMarkup(s)).find((r) => r.key === 'mutation:adaptive').unknown, 'one you have not met stays ???');
});

test('no Genes group or gene card anywhere: the System page has none, and a gene key is no entry', () => {
  const s = fresh();
  assert.doesNotMatch(systemMarkup(s), /codex-card|cx-gene|Codex ·/, 'no gene card on System');
  const html = codexPageMarkup(s, 'gene:attack');
  assert.doesNotMatch(html, /Genes|Attack types|cx-gene/i, 'an old gene key opens the first entry');
  assert.match(html, /data-entry="family:ransomware"/);
});

test('every entry renders with no undefined or NaN, for a character who has met everything', () => {
  const s = server(3);
  s.met = Object.fromEntries([...Object.keys(FAMILIES), ...Object.keys(ROOM_FAMILIES), ...Object.keys(STRAINS), ...Object.keys(GUARDS)].map((k) => [k, true]));
  for (const k of Object.keys(BOSSES)) { s.dex.fought[k] = 2; s.dex.won[k] = 1; }
  for (const k of ROLLED_MUTATIONS) s.dex.muts[k] = ['worm'];
  for (const [f, sets] of Object.entries(ATTACK_SETS)) for (const id of Object.keys(sets)) s.dex.sets[`${f}:${id}`] = 1;
  s.research = {};
  let k = 0;
  for (const id of Object.keys(FAMILIES)) for (const p of FAMILIES[id].parts) s.research[`${id}:${p.id}`] = [1, 5, 20][k++ % 3];
  for (const id of Object.keys(ROOM_FAMILIES)) for (const p of ROOM_FAMILIES[id].parts) s.research[`${id}:${p.id}`] = [1, 5, 20][k++ % 3];
  for (const key of KEYS) {
    const html = codexPageMarkup(s, key);
    assert.doesNotMatch(html, /undefined|NaN|\[object/, key);
    assert.match(html, /data-entry="[^"]+"/, key);
  }
  for (const r of rowsOf(codexPageMarkup(s))) assert.ok(!r.unknown, `${r.key} is named`);
});

test('save: the Codex record survives a reload; an older save starts it empty and reads its servers\' set codex', () => {
  const s = server(7);
  const room = FP.roomList(s).find((r) => r.kind === 'process' && FAMILIES[r.family]);
  place(s, room.id); FP.fight(s, room);
  const key = `${s.encounter.virus.family}:${s.encounter.virus.attackSet}`;
  win(s);
  const back = restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.dex, s.dex, 'kept as it was');
  const old = JSON.parse(JSON.stringify(fresh()));
  delete old.dex;
  const r = restore(old);
  assert.deepEqual(r.dex, { kills: {}, fought: {}, won: {}, tells: {}, sets: {}, muts: {} }, 'an older save gets an empty record');
  const [fam, set] = key.split(':');
  r.locations = [{ id: 'x', floorplan: { codex: { [key]: true } } }];
  assert.ok(facedSet(r, fam, set), "a set an older save faced on a server still counts");
});

test('the first-time tip points at the tab once you decode your first part, and never mid-fight', () => {
  const tip = TIPS.find((t) => t.id === 'codex');
  assert.ok(tip && tip.text.length <= 200 && tip.at === '.modules [data-module="codex"]');
  assert.ok((tip.text.match(/[.!?](\s|$)/g) || []).length <= 2, 'one or two sentences');
  const s = fresh();
  for (const t of TIPS) if (t.id !== 'codex') (s.settings.seen ||= {})[t.id] = 1;
  const visible = (sel) => sel === tip.at;
  assert.equal(nextTip(s, 'map', visible), null, 'nothing decoded yet');
  s.research = { 'ransomware:pulse': 1 };
  assert.equal(nextTip(s, 'map', visible)?.id, 'codex');
  assert.equal(nextTip(s, 'codex', visible), null, 'not on the Codex itself');
  command(s, 'encounter cryptjack'); command(s, 'engage');
  assert.equal(nextTip(s, 'combat', visible), null, 'not mid-fight');
});

test('the index lists every family a player can meet, old and room bodies, with its research %', () => {
  const s = fresh();
  s.met = { trojan: true };
  s.research = { 'trojan:courier': 1 };
  const fam = entries(s).find((g) => g.id === 'family');
  assert.deepEqual(fam.rows.map((r) => r.id), [...Object.keys(FAMILIES), ...Object.keys(ROOM_FAMILIES).filter((id) => !ROOM_FAMILIES[id].runner)]);
  assert.deepEqual(entries(s).find((g) => g.id === 'runner').rows.map((r) => r.key), ['runner:exfil'], 'the Exfil has its own row (Exfils)');
  const t = fam.rows.find((r) => r.id === 'trojan');
  assert.deepEqual([t.name, t.pct], ['Trojan', 3], 'two parts: 1 of 20 and 0 of 20, an average of 2.5%');
  assert.match(codexPageMarkup(s, 'family:trojan'), /<small class="cx-n" title="The average research of its parts">3%<\/small>/);
});

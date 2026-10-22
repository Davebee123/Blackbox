// Part research (research.mjs, GAME_RULES.md "Part research"): each part's count, earned in your fights (a break +1, a
// cut +1, a tell it rides answered +2), its tiers on the Codex and the board (3: its numbers, 15: its rule, answer and
// tells, 60: its loot and the mastery perk), the perk itself (+25% on its drop, +3% from all your damage, previews
// included), the mastered mark, an older save's decoded parts at 3 (and its 1/5/20 research tripled once), crewmates'
// fights not counting, and no player text
// that says gene.
import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, selectEncounter, part, hit, livingParts, attackers, restore, previewDamage, damageMultiplier, codexKey, knowsPart, hooks, skillBase, gearStat } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { RESEARCH, TIER, gainResearch, researchAt, mastered } from './dist/research.mjs';
import { codexPageMarkup } from './dist/codex-view.mjs';
import { entries } from './dist/codex.mjs';
import { boardMarkup, hudMarkup, systemMarkup, forecast } from './dist/view.mjs';
import { partTip } from './dist/fightread.mjs';
import { tellsOf, tellSigint } from './dist/tells.mjs';
import { TIPS } from './dist/tips.mjs';
import { REWRITES } from './dist/rewrites.mjs';
import { play } from './dist/run.mjs';
import { matesOf } from './dist/crew.mjs';
import { FRESH } from './dist/combat.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.baseCrit = 0;
FRESH.bonus = 0;
let clock = Date.UTC(2026, 0, 1);
hooks.now = () => clock;

// A home fight against a wild ransomware virus at a level, its attacks parked.
function fight({ level = 12, family = 'ransomware', seed = 7, opts = {} } = {}) {
  const s = fresh();
  s.hackers = { breaker: { level, xp: 0 } };
  selectEncounter(s, 'random', seed, { level, family, mutation: null, classic: true, ...opts }); // the classic shape: the parts roll is parts.test.mjs's
  command(s, 'engage');
  s.server.max = s.server.integrity = 5000;
  s.encounter.hardened = 0;
  for (const p of attackers(s)) p.attack.due = 999;
  return s;
}
const keyOf = (s, id) => codexKey(s.encounter.virus, part(s, id));
const breakIt = (s, id) => { const p = part(s, id); Object.assign(p, { armor: 0, integrity: 1 }); command(s, 'spike ' + id); return resolveCycle(s); };
// A part bare, two hits above its 50% tick, with both ticks fresh: one Spike takes it across.
const edge = (s, id, max = 100) => Object.assign(part(s, id), { armor: 0, maxArmor: 0, max, integrity: Math.floor(max * 0.5) + 2, ticks: [{ at: 0.5, spent: false }, { at: 0.25, spent: false }] });
// What a player reads: the text between tags, and every title and aria-label (class names are code, not text).
const readable = (html) => [...String(html).matchAll(/(?:title|aria-label)="([^"]*)"/g)].map((m) => m[1]).join('\n') + '\n' + String(html).replace(/<[^>]*>/g, ' ');

test('earning: a break is +1, a cut +1, a tell it rides answered +2; never past 60', () => {
  const s = fight();
  assert.deepEqual(s.research, {}, 'a fresh game starts empty');
  // A break.
  const ev = breakIt(s, 'pulse');
  assert.equal(s.research[keyOf(s, 'pulse')], RESEARCH.points.break);
  assert.ok(!ev.some((e) => e.type === 'codex'), 'one break is not enough to decode it');
  // A break that takes it to research 3 decodes it, and that pays its XP.
  const d = fight();
  d.research[keyOf(d, 'pulse')] = TIER.decoded - 1;
  const dev = breakIt(d, 'pulse');
  assert.ok(dev.some((e) => e.type === 'codex' && e.message === 'Pulse Node decoded: research 3. Hover it to see its numbers.'));
  assert.ok(dev.some((e) => e.type === 'xp' && / · Pulse Node decoded\./.test(e.message)), 'decoding pays its XP, as the first break did');
  // A cut: the Encryptor's move due this cycle, a Spike across its 50% tick.
  const c = fight(), enc = edge(c, 'encryptor');
  for (const x of tellsOf(c)?.list || []) { x.told = false; x.after = 999; } // no charge riding it: the cut alone
  enc.attack.due = c.encounter.cycle;
  const cut = (command(c, 'spike encryptor'), resolveCycle(c));
  assert.ok(cut.some((e) => e.type === 'cut' && e.cut));
  assert.equal(c.research[keyOf(c, 'encryptor')], RESEARCH.points.cut, 'a cut is +1');
  // A wasted tick (nothing due) earns nothing.
  const w = fight();
  edge(w, 'encryptor');
  command(w, 'spike encryptor'); resolveCycle(w);
  assert.equal(w.research[keyOf(w, 'encryptor')] || 0, 0, 'a wasted tick is no research');
  // A tell answered: SIGINT on a cast in its window, on the part it rides.
  const t = fight({ opts: { elite: true } });
  const T = tellsOf(t), cast = T.list.find((x) => x.kind === 'cast');
  assert.ok(cast, 'an elite at 12 brings a cast');
  for (const x of T.list) { x.told = false; x.after = 999; }
  Object.assign(cast, { told: true, said: t.encounter.cycle, next: t.encounter.cycle + 1, after: 999, opened: null });
  const on = cast.part;
  command(t, 'hold'); resolveCycle(t);
  const before = researchAt(t, keyOf(t, on));
  command(t, 'sigint');
  const said = resolveCycle(t);
  assert.ok(said.some((e) => e.type === 'interrupt' && e.tell === cast.id && e.answered), 'SIGINT stops it');
  assert.equal(researchAt(t, keyOf(t, on)) - before, RESEARCH.points.tell, 'an answered tell is +2 on the part it rides');
  // A cut that calls off a charge counts as both: the cut and the tell.
  const ch = fight();
  const charge = tellsOf(ch).list.find((x) => x.kind === 'charge');
  const src = edge(ch, charge.part);
  for (const x of tellsOf(ch).list) { x.told = false; x.after = 999; }
  src.attack.due = ch.encounter.cycle;
  Object.assign(charge, { told: true, said: ch.encounter.cycle - 3, next: ch.encounter.cycle, n: src.attack.n || 0, after: 999, opened: null });
  command(ch, `spike ${charge.part}`); resolveCycle(ch);
  assert.equal(ch.research[keyOf(ch, charge.part)], RESEARCH.points.cut + RESEARCH.points.tell, 'a cut on a charge: +1 and +2');
  // Capped at 60.
  const v = s.encounter.virus, p = part(s, 'encryptor');
  s.research[keyOf(s, 'encryptor')] = 59;
  gainResearch(s, v, p, 'tell');
  assert.equal(s.research[keyOf(s, 'encryptor')], RESEARCH.max);
  assert.equal(gainResearch(s, v, p, 'break'), 0, 'nothing more at 60');
});

test('tiers: a log line and a float event at 3, 15 and 60, nothing in between', () => {
  const s = fight(), v = s.encounter.virus, p = part(s, 'encryptor'), key = keyOf(s, 'encryptor');
  const n0 = s.logs.length;
  const lines = () => s.logs.slice(n0).filter((e) => ['codex', 'research', 'mastered'].includes(e.type));
  gainResearch(s, v, p, 'break');
  assert.equal(lines().length, 0, 'nothing at 1');
  gainResearch(s, v, p, 'tell');
  assert.equal(s.research[key], TIER.decoded);
  gainResearch(s, v, p, 'tell'); gainResearch(s, v, p, 'cut');
  assert.equal(lines().length, 1, 'nothing at 4 to 14');
  s.research[key] = TIER.rule - 1;
  gainResearch(s, v, p, 'cut');
  assert.equal(s.research[key], TIER.rule);
  assert.deepEqual(lines().map((e) => [e.type, e.message]), [['codex', 'Encryptor decoded: research 3. Hover it to see its numbers.'], ['research', 'Encryptor research 15: its rule and answers are in the Codex.']]);
  s.research[key] = 58;
  gainResearch(s, v, p, 'tell');
  const last = lines().at(-1);
  assert.equal(last.type, 'mastered');
  assert.equal(last.message, 'Encryptor mastered: research 60. Its component drops 25% more often, and you deal 3% more damage to it.');
  assert.equal(last.target, 'encryptor', 'on the part: the board floats it there');
});

test('the Codex reveals by tier: name and what it hits, then numbers, then rule, answer and tells, then loot and the mark', () => {
  const s = fight();
  s.met = { ransomware: true };
  const card = (n) => {
    s.research = { 'ransomware:encryptor': n };
    const html = codexPageMarkup(s, 'family:ransomware');
    return html.split(/(?=<div class="cx-part)/).find((c) => /<div class="cxp-head"><b>Encryptor/.test(c));
  };
  const c0 = card(0);
  assert.match(c0, /cx-part t0/); assert.match(c0, /<p class="cxp-hits">Encrypt · encrypts you<\/p>/);
  assert.match(c0, /\?\?\? Integrity/); assert.match(c0, /Research 3 to learn its numbers\. Break one, cut it or answer its tell\./);
  assert.match(c0, /<small class="cxr-n">0\/60<\/small>/);
  const c1 = card(TIER.decoded);
  assert.match(c1, /cx-part t3/); assert.match(c1, /<b>\d+<\/b> Integrity/); assert.match(c1, /<b>Encrypt<\/b><span class="cxp-dmg">\+\d+ encryption<\/span>/);
  assert.doesNotMatch(c1, /cxp-answer|cxp-does/); assert.match(c1, /Research 15 to learn its rule, its answer and its tells\./);
  assert.match(c1, /<i class="cxr-mk on" style="left:5%"/); assert.match(c1, /<i class="cxr-mk" style="left:25%"/);
  const c5 = card(TIER.rule);
  assert.match(c5, /<p class="cxp-does">Encrypts you/); assert.match(c5, /<p class="cxp-answer">Break it to end the encryption/);
  assert.match(c5, /<p class="cxp-rides">Charges <b>Full Disk<\/b>/, 'the tells it can ride');
  assert.match(c5, /Research 60 to learn its drop\./); assert.doesNotMatch(c5, /Drops /); assert.doesNotMatch(c5, /pmast/);
  const c20 = card(TIER.mastered);
  assert.match(c20, /cx-part t60 mastered/); assert.match(c20, /class="pmast"/); assert.match(c20, /Drops Cipher Seed/);
  assert.match(c20, /Mastered\. Its component drops 25% more often, and you deal 3% more damage to it\./);
  assert.match(c20, /<small class="cxr-n full">60\/60<\/small>/);
  // The loot list opens at 60 too.
  assert.match(codexPageMarkup(s, 'family:ransomware'), /<li class=""><svg[^>]*>[\s\S]*?<\/svg><b>Cipher Seed<\/b><small>Encryptor<\/small><\/li>/);
  s.research = { 'ransomware:encryptor': 59 };
  assert.match(codexPageMarkup(s, 'family:ransomware'), /<li class="unknown"><svg[^>]*>[\s\S]*?<\/svg><b>\?\?\?<\/b><small>Encryptor<\/small><\/li>/);
});

test('a body\'s research is the average of its parts\', each capped at 60: on its index row and its header; strains, guards and bosses too', () => {
  const s = fight();
  s.met = { ransomware: true, keylogger: true, watchdog: true };
  s.dex.fought['nb-deadbolt'] = 1;
  s.research = { 'ransomware:pulse': 60, 'ransomware:encryptor': 30 };
  const n = entries(s).find((g) => g.id === 'family').rows.find((r) => r.id === 'ransomware').pct;
  const parts = 15; // Pulse Node, Encryptor, its three basics (dist/parts.mjs) and its ten third parts
  assert.equal(n, Math.round(((1 + 0.5) / parts) * 100));
  const html = codexPageMarkup(s, 'family:ransomware');
  assert.match(html, new RegExp(`<small class="cx-n" title="The average research of its parts">${n}%</small>`));
  assert.match(html, new RegExp(`<span>Research</span><strong class="">${n}%</strong>`));
  s.research['keylogger:logger'] = 60;
  assert.ok(entries(s).find((g) => g.id === 'strain').rows.find((r) => r.id === 'keylogger').pct > 0, 'a strain on its own parts');
  assert.equal(entries(s).find((g) => g.id === 'guard').rows.find((r) => r.id === 'watchdog').pct, 0, 'a guard on its own');
  const boss = entries(s).find((g) => g.id === 'boss').rows.find((r) => r.id === 'nb-deadbolt');
  assert.ok(boss.pct > 0, 'a boss shares its parts\' research with its family');
  const page = codexPageMarkup(s, 'boss:nb-deadbolt');
  assert.match(page, /<h3 class="cx-kick">Parts/);
  assert.match(page, /Its parts share their research with its family\./);
  assert.match(page, /class="pmast"/, 'its mastered Pulse Node carries the mark');
  assert.doesNotMatch(page, /undefined|NaN/);
});

test('the board by tier: ??? then its attack and cue at 3, then its rule and answer at 15; the mastered mark at 60, not teal', () => {
  const s = fight(), v = s.encounter.virus, p = part(s, 'encryptor'), key = keyOf(s, 'encryptor');
  assert.match(partTip(s, v, p), /^Encryptor: \?\?\?\nBreak one, cut it or answer its tell to decode it\.$/);
  s.research = { [key]: TIER.decoded - 1 };
  assert.ok(!knowsPart(s, v, p), 'research 2 is not decoded');
  s.research = { [key]: TIER.decoded };
  assert.ok(knowsPart(s, v, p));
  assert.match(partTip(s, v, p), /^Encryptor: Encrypts you every \d+ cycles\. Each Encrypt adds \d+ damage a cycle until it breaks\.\nResearch 15 to learn its rule and answer\.$/);
  s.research = { [key]: TIER.rule };
  assert.match(partTip(s, v, p), /\nBreak it to end the encryption\. A ◆ on you stops one Encrypt\.$/);
  assert.doesNotMatch(boardMarkup(s, null), /pmast/);
  s.research = { [key]: TIER.mastered };
  const html = boardMarkup(s, null), row = html.split('data-target="').find((r) => r.startsWith('encryptor"'));
  assert.match(row, /<span class="pmast" title="Encryptor mastered: research 60\. Its component drops 25% more often, and you deal 3% more damage to it\.">/);
  assert.equal((html.match(/class="pmast"/g) || []).length, 1, 'only on the part you mastered');
  const css = readFileSync('./dist/style.css', 'utf8').match(/\.pmast \{[^}]*\}/)[0];
  assert.match(css, /color: var\(--amber-soft\)/);
  assert.doesNotMatch(css, /--you/, 'not teal: teal is you');
});

test('the perk: +3% from all your damage on that part only, in every preview on the board too', () => {
  const s = fight(), p = Object.assign(part(s, 'encryptor'), { armor: 0, maxArmor: 0, integrity: 5000, max: 5000 }), q = Object.assign(part(s, 'pulse'), { armor: 0, maxArmor: 0, integrity: 5000, max: 5000 });
  const m0 = damageMultiplier(s, p, { mine: true }), d0 = previewDamage(s, 'spike', p);
  s.research = { [keyOf(s, 'encryptor')]: TIER.mastered };
  assert.ok(mastered(s, s.encounter.virus, p) && !mastered(s, s.encounter.virus, q));
  assert.ok(Math.abs(damageMultiplier(s, p, { mine: true }) / m0 - RESEARCH.perk.dmg) < 1e-9, 'your commands: ×1.03');
  assert.ok(Math.abs(damageMultiplier(s, p, { dot: true }) / damageMultiplier(s, q, { dot: true }) - RESEARCH.perk.dmg) < 1e-9, 'your burns too');
  assert.equal(damageMultiplier(s, q, { mine: true }), m0, 'another part: nothing');
  const d20 = previewDamage(s, 'spike', p);
  const base = skillBase(s, 'spike', p) + gearStat(s, 'damage');
  assert.equal(d0, Math.floor(base * m0 + 1e-9));
  assert.equal(d20, Math.floor(base * m0 * RESEARCH.perk.dmg + 1e-9), `${d0} → ${d20}: the preview counts the 3%`);
  assert.ok(d20 > d0);
  // The board's numbers: the Spike readout on the row and the loss preview slice both say it.
  command(s, 'spike encryptor');
  assert.equal(forecast(s).parts.encryptor, d20, 'the loss preview');
  assert.match(boardMarkup(s, null), new RegExp(`title="Target Encryptor: spike deals ${d20}"`), 'the row says it');
  const was = p.integrity, ev = resolveCycle(s), dealt = ev.find((e) => e.type === 'damage' && e.target === 'encryptor')?.amount;
  assert.equal(dealt, d20, 'and the hit lands for what the preview said');
  assert.equal(was - p.integrity, d20);
});

test('the perk: its component drops 25% more often (×1.25 on whatever the chance is)', () => {
  // A roll between the plain chance and the mastered one: no drop at research 0, a drop at 60.
  let rng = 1;
  const roll = (x) => { const t = { rng: x }; let v = (t.rng = ((t.rng >>> 0) + 0x6d2b79f5) >>> 0); v = Math.imul(v ^ (v >>> 15), v | 1); v ^= v + Math.imul(v ^ (v >>> 7), v | 61); return ((v ^ (v >>> 14)) >>> 0) / 4294967296; };
  const lo = CONFIG.salvageChance, hi = CONFIG.salvageChance * RESEARCH.perk.drop;
  while (!(roll(rng) > lo + 0.01 && roll(rng) < hi - 0.01)) rng++;
  const drop = (n) => {
    const s = fight(), p = part(s, 'encryptor');
    s.research = n ? { [keyOf(s, 'encryptor')]: n } : {};
    Object.assign(p, { armor: 0, integrity: 1 });
    s.rng = rng;
    const first = s.serial;
    hit(s, p, 50, { pierce: true, server: true });
    return s.logs.filter((e) => e.id > first && e.type === 'loot').map((e) => e.message);
  };
  assert.deepEqual(drop(0), [], `a roll of ${roll(rng).toFixed(3)} misses ${lo}`);
  assert.deepEqual(drop(58), [], 'research 58 (59 with this break) is not mastery');
  assert.deepEqual(drop(60), ['Cipher Seed recovered.'], `and makes ${hi.toFixed(4)} mastered`);
  assert.deepEqual(drop(59), ['Cipher Seed recovered.'], 'the break that takes it to 60 already rolls with the perk');
  // Over many breaks the rate is the chance × 1.25.
  let a = 0, b = 0;
  for (let i = 1; i <= 2000; i++) { const r = roll(i * 7919); if (r < lo) a++; if (r < hi) b++; }
  assert.ok(Math.abs(b / a - RESEARCH.perk.drop) < 0.06, `${a} → ${b}`);
});

test('an older save: every part it decoded starts at research 3 (decoded), nothing else; a save keeps research', () => {
  const raw = JSON.parse(JSON.stringify(fresh()));
  delete raw.research;
  raw.codex = { 'ransomware:pulse': true, 'worm:replicator': true };
  const s = restore(raw);
  assert.deepEqual(s.research, { 'ransomware:pulse': 3, 'worm:replicator': 3 });
  assert.equal(s.codex, undefined, 'research holds it now');
  s.research['ransomware:encryptor'] = 7;
  const back = restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.research, { 'ransomware:pulse': 3, 'worm:replicator': 3, 'ransomware:encryptor': 7 }, 'a save on the new scale is not tripled again');
  // A save from the 1/5/20 scale: its research is tripled once (capped at 60), so nothing it had unlocked locks again.
  const old = JSON.parse(JSON.stringify(s));
  delete old.researchScale;
  old.research = { 'ransomware:pulse': 1, 'ransomware:encryptor': 5, 'worm:replicator': 20, 'ransomware:lockbox': 7 };
  const up = restore(old);
  assert.deepEqual(up.research, { 'ransomware:pulse': 3, 'ransomware:encryptor': 15, 'worm:replicator': 60, 'ransomware:lockbox': 21 });
  assert.deepEqual(restore(JSON.parse(JSON.stringify(up))).research, up.research, 'once');
  const none = JSON.parse(JSON.stringify(fresh()));
  delete none.research;
  assert.deepEqual(restore(none).research, {}, 'a save with no codex starts empty');
});

test('crewmates\' fights don\'t count for you: their breaks earn nothing, and your mastery is yours alone', () => {
  const s = fresh();
  s.hackers = { breaker: { level: 5, xp: 0 } };
  play(s, 'crew sim bastion');
  play(s, 'connect sprawl'); play(s, 'cd var'); play(s, 'attack');
  const [m] = matesOf(s);
  assert.ok(m?.who && m.encounter, 'a crewmate in the fight');
  const p = livingParts(s).find((x) => x.kind !== 'fragment'), key = codexKey(s.encounter.virus, p);
  Object.assign(p, { armor: 0 });
  hit(m, p, p.integrity + 50, { pierce: true });
  assert.equal(p.integrity, 0, 'the crewmate broke it');
  assert.equal(s.research[key] || 0, 0, 'no research for you');
  assert.deepEqual(Object.keys(m.research || {}), [], 'and none kept on a crewmate');
  const q = livingParts(s).find((x) => x.kind !== 'fragment');
  s.research[codexKey(s.encounter.virus, q)] = TIER.mastered;
  assert.ok(mastered(s, s.encounter.virus, q) && !mastered(m, s.encounter.virus, q), 'the perk is yours, not theirs');
});

test('no player text says gene: the Codex, the System page, the fight board, the HUD, the log, a scan and inspect, tips and rewrites', () => {
  const s = fight({ opts: { elite: true } });
  s.met = { ransomware: true, worm: true, ghostroot: true, keylogger: true, watchdog: true };
  s.dex.fought['nb-deadbolt'] = 1;
  s.research[keyOf(s, 'pulse')] = TIER.decoded - 1; // this break decodes it
  breakIt(s, 'pulse');
  s.research['ransomware:encryptor'] = TIER.rule;
  s.research['ransomware:lockbox'] = TIER.mastered;
  command(s, 'scan'); command(s, 'inspect encryptor');
  const texts = [boardMarkup(s, null), hudMarkup(s), systemMarkup(s), ...s.logs.map((e) => e.message)];
  for (const g of entries(s)) for (const r of g.rows) texts.push(codexPageMarkup(s, r.key));
  for (const t of TIPS) texts.push(t.text);
  for (const r of Object.values(REWRITES)) texts.push(...(r.output || []));
  const GENE = /\bgene(s|tic)?\b|genom/i; // a word, so Regenerative is no gene
  for (const t of texts) assert.doesNotMatch(readable(t), GENE, readable(t).match(/.{0,60}\bgen(e|om).{0,60}/i)?.[0]);
  assert.ok(s.logs.some((e) => e.type === 'codex'), 'a decode is in the log');
});

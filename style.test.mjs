// Tooltip style (docs/ui.md "Tooltip style (WoW grammar)"): every part, tell, mutation, gene and virus rule the
// player reads is written like a World of Warcraft tooltip. The name is the title, the mechanics come first in short
// declarative sentences with no advice in them, and the answer is one short imperative on its own ▸ line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, codexKey, part, selectEncounter } from './dist/combat.mjs';
import { CONFIG, FAMILIES, ROOM_FAMILIES, GUARDS, STRAINS, BOSSES, MUTATIONS } from './dist/data.mjs';
import { GENES } from './dist/genes.mjs';
import { partRead, partTip, tellTip, ANSWER } from './dist/fightread.mjs';
import { partsOf, bossParts, tellsOf as codexTells } from './dist/codex.mjs';
import { codexPageMarkup } from './dist/codex-view.mjs';
import { tellIntents, tellsOf } from './dist/tells.mjs';
import { ruleHtml } from './dist/ruletext.mjs';
import './dist/families.mjs';
import './dist/arena.mjs'; // developer fight (the Arena)

Object.assign(CONFIG, { enemyCrit: 0, misses: false });

// ---------- the rules, as checks ----------
const words = (t) => t.trim().split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length; // "1 ◆" is one word, ◆ none
const sentences = (t) => t.split(/(?<=[.!?])\s+(?=[A-Z0-9◆+−])/).filter(Boolean);
const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// An imperative at the head of a sentence is advice: it belongs on the answer line, never in the mechanics.
const ADVICE = /^(Break|Save|Use|Hit|Strip|Fire|Cut|Delay|Clear|Keep|Raise|Scan|Lead|Set|Take|Burn|Shield|Heal|Race|Go|Open|Finish|Leave|Vent|Choose|Switch|Interrupt|Deal)\b(?!,)/;
// What is wrong with one description: [] when it reads right.
function faults({ name, does, answer = '' }) {
  const out = [];
  for (const [field, t] of [['mechanics', does], ['answer', answer]]) {
    if (!t) continue;
    if (/:/.test(t)) out.push(`a colon in the ${field}`);
    if (/;/.test(t)) out.push(`a semicolon in the ${field}`);
    for (const x of sentences(t)) if (words(x) > 25) out.push(`a sentence of ${words(x)} words in the ${field}: ${x}`);
  }
  if (name && new RegExp(`^(the )?${escRe(name)}\\b`, 'i').test(does)) out.push('the name again at the start of the body');
  for (const x of sentences(does)) if (ADVICE.test(x)) out.push(`advice in the mechanics: ${x}`);
  return out;
}

// ---------- every description the player reads ----------
// The Codex's view of every body (a fresh save sees every card's text, the same partRead the board uses), the
// bosses' parts, the tells a body brings, every gene's does and answer, the mutations, the strains', ICE's and
// bosses' rules.
function everything() {
  const s = fresh(), out = [];
  const bodies = [...Object.keys(FAMILIES).map((id) => ['family', id]), ...Object.keys(ROOM_FAMILIES).map((id) => [ROOM_FAMILIES[id].runner ? 'runner' : 'family', id]), ...Object.keys(STRAINS).map((id) => ['strain', id]), ...Object.keys(GUARDS).map((id) => ['guard', id])];
  for (const [group, id] of bodies) {
    for (const x of partsOf(s, group, id)) if (x.part) { const r = partRead(null, x.virus, x.part); out.push({ kind: 'part', where: `${group}:${id}`, name: x.part.name, does: r.does, answer: r.answer }); }
    for (const t of codexTells(s, group, id)) out.push({ kind: 'tell', where: `${group}:${id}`, name: t.name, does: t.does, answer: t.answer });
  }
  for (const id of Object.keys(BOSSES)) {
    for (const x of bossParts({ ...s, dex: { fought: { [id]: 1 } } }, id)) { const r = partRead(null, x.virus, x.part); out.push({ kind: 'part', where: `boss:${id}`, name: x.part.name, does: r.does, answer: r.answer }); }
    for (const t of codexTells(s, 'boss', id)) out.push({ kind: 'tell', where: `boss:${id}`, name: t.name, does: t.does, answer: t.answer });
    if (BOSSES[id].about) out.push({ kind: 'boss', where: id, name: BOSSES[id].name, does: BOSSES[id].about });
    if (BOSSES[id].signature) out.push({ kind: 'boss', where: id, name: BOSSES[id].signature.name, does: BOSSES[id].signature.rule });
  }
  for (const [id, g] of Object.entries(GENES)) out.push({ kind: 'gene', where: id, name: g.name, does: g.does, answer: g.answer });
  for (const [id, m] of Object.entries(MUTATIONS)) out.push({ kind: 'mutation', where: id, name: m.name, does: m.rule });
  for (const [id, x] of Object.entries(STRAINS)) out.push({ kind: 'strain', where: id, name: x.name, does: x.rule, answer: x.answer });
  for (const [id, x] of Object.entries(GUARDS)) if (x.rule) out.push({ kind: 'ICE', where: id, name: x.name, does: x.rule, answer: x.answer });
  return out;
}
// A live fight with this part in it (?playtest=part:<id>), every part researched to its rule.
function liveFight(id, level = null) {
  const s = fresh();
  s.metAll = true;
  command(s, `developer fight part:${id}${level ? ` ${level}` : ''}`);
  const v = s.encounter.virus;
  for (const p of v.parts) s.research[codexKey(v, p)] = 15;
  return s;
}
const tipOf = (s, id) => partTip(s, s.encounter.virus, part(s, id));
const [mechanicsOf, answerOf] = [(tip) => tip.split('\n')[0].replace(/^[^:]+: /, ''), (tip) => tip.split('\n').find((l) => l.startsWith(ANSWER))?.slice(ANSWER.length) || ''];

test('every part, tell, mutation and gene description: no colon, no semicolon, no sentence over 25 words, no name at its start, no advice in the mechanics', () => {
  const all = everything();
  assert.ok(all.filter((x) => x.kind === 'part').length >= 50, `every kind of part (${all.filter((x) => x.kind === 'part').length})`);
  assert.ok(all.some((x) => x.kind === 'tell') && all.some((x) => x.kind === 'gene') && all.some((x) => x.kind === 'mutation'));
  const bad = all.map((x) => ({ x, f: faults(x) })).filter((y) => y.f.length);
  assert.deepEqual(bad.map(({ x, f }) => `${x.kind} ${x.name} (${x.where}): ${f.join('; ')}`), []);
});

test('a part\'s answer is one short imperative of 10 words or fewer, never a repeat of its mechanics', () => {
  for (const x of everything().filter((y) => y.kind === 'part' && y.answer)) {
    assert.ok(words(x.answer) <= 10, `${x.name} (${x.where}): ${x.answer}`);
    assert.match(x.answer, /^[A-Z][^.]*\.( [A-Z][^.]*\.)?$/, `${x.name}: one or two short sentences`);
    assert.ok(!x.does.includes(x.answer.replace(/\.$/, '')), `${x.name}: the answer repeats the mechanics`);
  }
});

test('every fight board tooltip of a basic or a third part: its name as the title, the mechanics, then its answer on its own ▸ line', () => {
  const ids = [...new Set(Object.values(FAMILIES).flatMap((f) => f.parts.filter((p) => p.pool === 'basic' || p.pool === 'third').map((p) => p.id)))];
  assert.ok(ids.length >= 25, `${ids.length} basics and thirds`);
  for (const id of ids) {
    const s = liveFight(id), v = s.encounter.virus;
    for (const p of v.parts) {
      const tip = partTip(s, v, p), lines = tip.split('\n');
      assert.ok(tip.startsWith(`${p.name}: `), `${id}: the name is the title: ${tip}`);
      assert.ok(lines.length <= 2, `${id} ${p.name}: the mechanics, then one line: ${tip}`);
      const f = faults({ name: p.name, does: mechanicsOf(tip), answer: answerOf(tip) });
      assert.deepEqual(f, [], `${id} ${p.name}: ${tip}`);
      if (lines[1] && !/Packer breaks/.test(lines[1])) assert.ok(lines[1].startsWith(ANSWER), `${id} ${p.name}: the answer line starts with ▸: ${tip}`);
    }
  }
});

test('the tell tooltips: what it does, then its answer on its own ▸ line, in the same grammar', () => {
  const s = fresh(); s.hackers = { breaker: { level: 17, xp: 0 } };
  selectEncounter(s, 'random', 7, { level: 17, family: 'ransomware', mutation: null, basic: 'pulse' });
  command(s, 'engage');
  for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999;
  const T = tellsOf(s);
  assert.ok(T?.list.length, 'it brings tells');
  for (const t of T.list) Object.assign(t, { told: true, said: s.encounter.cycle, next: s.encounter.cycle + 2, n: t.kind === 'charge' ? part(s, t.part).attack.n || 0 : null, after: 999, opened: null });
  for (const t of T.list) if (t.kind === 'charge') part(s, t.part).attack.due = s.encounter.cycle + 2;
  const tips = tellIntents(s).map((i) => tellTip(s, i, i.col));
  assert.ok(tips.length >= 2, tips.join('\n'));
  for (const tip of tips) {
    const name = tip.split(':')[0], lines = tip.split('\n');
    assert.equal(lines.length, 2, tip);
    assert.ok(lines[1].startsWith(ANSWER), tip);
    assert.deepEqual(faults({ name, does: mechanicsOf(tip), answer: answerOf(tip) }), [], tip);
  }
});

// ---------- six tooltips, spot-checked as the board shows them (live numbers) ----------
test('the Cold Store: frozen, then its Chill, all mechanics with no advice, and the answer on its own line', () => {
  const s = liveFight('coldstore'), cs = part(s, 'coldstore'), tip = tipOf(s, 'coldstore');
  const chill = s.encounter.virus.parts.find((p) => p.id === 'coldstore').chill;
  assert.equal(tip, `Cold Store: Frozen until the end of cycle ${cs.thawAt ?? cs.frozen}, off the timeline and immune to damage. After it thaws, its Chill deals ${tip.match(/Chill deals (\d+)/)[1]} damage to you every ${chill.interval} cycles. The first Chill lands 2 cycles after the thaw.\n▸ Break the others while it is frozen.`);
  const mech = mechanicsOf(tip);
  assert.doesNotMatch(mech, /\b(break the others|save|shield for|big hit)\b/i, 'no advice in the mechanics');
  for (const x of sentences(mech)) assert.doesNotMatch(x, ADVICE, x);
  assert.doesNotMatch(tip, /Frozen:|it \S+ it \S+ it/, 'no colon chain, no it… it… it');
  assert.equal(answerOf(tip), 'Break the others while it is frozen.');
});

test('the Encryptor, the Packer, the Mimic and the Pulse Node read in the same grammar', () => {
  const enc = liveFight('coldstore');
  assert.match(tipOf(enc, 'encryptor'), /^Encryptor: Encrypts you every 5 cycles\. Each Encrypt deals \d+ damage to you every cycle until the Encryptor breaks\. A ◆ on you blocks one Encrypt\.( Charges [A-Za-z -]+\.)?( Casts [A-Za-z -]+\.)?\n▸ Break it to end the encryption\.$/);
  assert.match(tipOf(enc, 'pulse'), /^Pulse Node: Deals \d+ damage to you every 4 cycles\.\n▸ Delay it, or soften the hit with ◆ and shields\.$/);
  const pk = liveFight('packer');
  assert.match(tipOf(pk, 'packer'), /^Packer: While it stands, each rolled part shows as a Packed part, its attack as \?\?\?\. The virus's rolled rules show as \?\?\?, even ones your Codex knows\. Hides its timers while it wears ◆\.\n▸ Scan before you engage, or break it\.$/);
  const packed = pk.encounter.virus.parts.find((p) => p.packedAs);
  assert.ok(packed, 'the Packer\'s page packs a part');
  assert.match(tipOf(pk, packed.id), /^Packed part: .*\nIts name and rule are hidden until the Packer breaks\.$/, 'a packed part says so plainly');
  const mi = liveFight('mimic');
  assert.match(tipOf(mi, 'mimic'), /^Mimic: Every 4 cycles, copies the command you fire and turns it on you\. A hit hits you, and a strip strips your ◆ and shield\. .* SIGINT or a stun Hangs you\. Hides its timers while it wears ◆\.\n▸ Fire what is cheapest to have copied, or hold\.$/);
});

test('the highlighter lights the new wording\'s facts on a Codex card: the damage, the cycles, the ◆', () => {
  const lit = (t) => [...ruleHtml(t).matchAll(/<b class="hi">(.*?)<\/b>/g)].map((m) => m[1]);
  assert.deepEqual(lit('Frozen until the end of cycle 5, off the timeline and immune to damage. After it thaws, its Chill deals 28 damage to you every 5 cycles.'), ['cycle 5', '28 damage', '5 cycles']);
  assert.deepEqual(lit('Re-arms the Gate to full ◆ every 4 cycles, up to 3 times. Has no attack of its own.'), ['4 cycles', 'up to 3 times']);
  assert.deepEqual(lit('Encrypts you every 5 cycles. Each Encrypt deals 7 damage to you every cycle until the Encryptor breaks. A ◆ on you blocks one Encrypt.'), ['5 cycles', '7 damage']);
  assert.deepEqual(lit('When broken while other parts stand, the others go loud for the rest of the fight. Loud parts deal 25% more damage and attack 1 cycle sooner.'), ['25% more damage', '1 cycle sooner']);
  // On the page: a Ransomware card at research 15 draws its mechanics through it, its answer plain on its ▸ line.
  const s = fresh(); s.met = { ransomware: true }; s.research = { 'ransomware:encryptor': 15 };
  const card = codexPageMarkup(s, 'family:ransomware').split(/<div class="cx-part t\d+[^"]*">/).find((c) => c.startsWith('<div class="cxp-head"><b>Encryptor'));
  assert.match(card, /<p class="cxp-does">Encrypts you every <b class="hi">5 cycles<\/b>\. Each Encrypt deals <b class="hi">\d+ damage<\/b> to you every cycle/);
  assert.match(card, /<p class="cxp-answer">Break it to end the encryption\.<\/p>/);
});

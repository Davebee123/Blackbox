// A virus's genome in play (docs/genome.md): the gene codex, `scan` and `inspect`. genes.mjs is the library and
// authors.mjs who writes them; data.mjs puts genes and an author on every virus it builds.
//
// The codex learns gene by gene, so knowing Ward on a ransomware virus means knowing it on a worm:
//   unknown  never met: ??? with its category
//   seen     it was in a fight with you (a tell, once it was said): its name, axis and category, and who used it
//   decoded  you broke a part that carries it, read it (a tell, the Mimic's beat), or beat two viruses that carry it
//            (a rule): its whole rule, its telegraph and its answers
// State lives in s.geneCodex ({ id: { seen, decoded, kills, by } }). A save from before genes has none: what its
// part codex (s.codex, kept as it was) and the families it met (s.met) say is read as genes, so nothing is lost and
// nothing migrates.
import { GENES, GENE_IDS, CATS, AXES, partGenes } from './genes.mjs';
import { AUTHORS } from './authors.mjs';
import { FAMILIES, STRAINS, GUARDS, genomeOf } from './data.mjs';
import { emit, warn, alive, familyInfo, classOf } from './combat.mjs';
import { plannedTells } from './tells.mjs';

// ---------- a virus's genes ----------
// Its genes (data.mjs createVirus), or, for a virus from a save before genes, read off its parts.
export const virusGenes = (v) => v?.genes || (v ? genomeOf(v.parts.filter((p) => p.kind !== 'fragment'), { strain: v.strain, mutation: v.mutation, grade: v.grade, boss: v.boss || null, ice: !!GUARDS[v.family]?.ice }) : []);
// The tell genes it brings at its level (tells.mjs plannedTells), in order, once each.
export function tellGenes(v) {
  const out = [];
  for (const t of plannedTells(v)) if (t.gene && GENES[t.gene]?.cat === 'tell' && !out.includes(t.gene)) out.push(t.gene);
  return out;
}
export const authorName = (id) => AUTHORS[id]?.name || null;
// The name with its byline: WARDED CRYPTJACK-4821 v2 · TOLLGATE.
export const bylined = (v) => (v.author && AUTHORS[v.author] ? `${v.name} · ${AUTHORS[v.author].name}` : v.name);

// ---------- the codex ----------
// What a save from before genes knew: each part it decoded (family or strain : part) decodes its genes, and each
// family or strain it met shows its core parts' genes as seen.
const SPECS = Object.fromEntries([...Object.entries(FAMILIES), ...Object.entries(STRAINS), ...Object.entries(GUARDS)].map(([k, f]) => [k, f.parts]));
const legacyDecoded = (s, id) => Object.keys(s.codex || {}).some((key) => { const [k, pid] = key.split(':'); const spec = SPECS[k]?.find((p) => p.id === pid); return spec && partGenes(spec).includes(id); });
const legacySeen = (s, id) => Object.keys(s.met || {}).some((k) => (SPECS[k] || []).some((p) => !p.pool && partGenes(p).includes(id)));
const entry = (s, id) => (s.geneCodex ||= {})[id] ||= { seen: 0, decoded: 0, kills: 0, by: [] };
export function geneState(s, id) {
  const x = s.geneCodex?.[id];
  if (x?.decoded || legacyDecoded(s, id)) return 'decoded';
  if (x?.seen || legacySeen(s, id)) return 'seen';
  return 'unknown';
}
export const decoded = (s, id) => geneState(s, id) === 'decoded';
// A fight: every gene of the virus but its tells is seen, and its author goes on the genes' list of who uses them.
export function seeGenes(s, v) {
  if (!v || s.who) return;
  for (const g of virusGenes(v)) seeGene(s, g.id, v.author);
}
export function seeGene(s, id, author = null) {
  if (!GENES[id] || s.who) return;
  const x = entry(s, id);
  x.seen = 1;
  if (author && !x.by.includes(author)) x.by.push(author);
}
// Decode a gene (once). Returns true the first time.
export function decodeGene(s, id) {
  if (!GENES[id] || s.who || decoded(s, id)) return false;
  const x = entry(s, id);
  x.seen = 1; x.decoded = 1;
  return true;
}
// A part broke: the genes it carries are decoded. Returns their names, for the codex line.
export function breakGenes(s, p) {
  return partGenes(p).filter((id) => GENES[id].decode === 'part' && decodeGene(s, id)).map((id) => GENES[id].name);
}
// A tell was read (tells.mjs): its gene is decoded, said or not before.
export function readGene(s, t) {
  const id = t?.gene;
  if (!GENES[id] || s.who) return;
  seeGene(s, id, s.encounter?.virus?.author);
  if (decodeGene(s, id)) emit(s, 'info', `${GENES[id].name} decoded. The codex has its rule now.`, { gene: id });
}
// A win: a rule gene decodes once you've beaten two viruses that carry it.
export function winGenes(s, v) {
  if (s.who) return;
  for (const g of virusGenes(v)) {
    if (GENES[g.id].decode !== 'kills' || decoded(s, g.id)) continue;
    const x = entry(s, g.id);
    x.kills = (x.kills || 0) + 1;
    if (x.kills >= 2 && decodeGene(s, g.id)) emit(s, 'info', `${GENES[g.id].name} decoded: two kills of it. The codex has its rule now.`, { gene: g.id });
  }
}
export const codexCount = (s) => ({ decoded: GENE_IDS.filter((id) => decoded(s, id)).length, seen: GENE_IDS.filter((id) => geneState(s, id) !== 'unknown').length, total: GENE_IDS.length });

// ---------- the genome card (scan) ----------
// What you can tell about a virus: its author, body, grade and every gene chip, named if you've seen it, ??? with its
// category otherwise. deep: an Infiltrator's scan, which shows the rule of genes you haven't decoded, for that fight.
const one = (id) => CATS[GENES[id].cat].one;
export function chipOf(s, id, src, deep = false) {
  // A mutation's rule shows once you've met it, as it always has (every mutation is visible from the start).
  const g = GENES[id], state = geneState(s, id), named = state !== 'unknown', open = state === 'decoded' || deep || (g.mutation && named);
  return { id, src, cat: g.cat, catName: one(id), axis: g.axis, axisName: AXES[g.axis].name, state, name: named || deep ? g.name : null, rule: open ? g.does : null, answer: open ? g.answer : null };
}
export function genomeCard(s, v, { deep = false } = {}) {
  const fam = familyInfo(v.family);
  const genes = virusGenes(v).map((g) => chipOf(s, g.id, g.src, deep));
  const tells = tellGenes(v).map((id) => chipOf(s, id, 'tell', deep));
  return { name: v.name, author: v.author || null, authorName: authorName(v.author), style: AUTHORS[v.author]?.style || null, body: fam?.name || v.family, level: v.level, grade: v.grade || 1, strain: v.strain ? STRAINS[v.strain]?.name : null, genes, tells, deep };
}
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
const an = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
// Chips as words: the names you know, then the ones you don't, counted by category ("two tells you haven't seen").
function named(chips) {
  const known = chips.filter((c) => c.name).map((c) => c.name), unknown = {};
  for (const c of chips.filter((x) => !x.name)) unknown[c.catName] = (unknown[c.catName] || 0) + 1;
  const rest = Object.entries(unknown).map(([cat, n]) => (n === 1 ? `${an(cat)} ${cat}` : `${NUM[n] || n} ${cat}s`) + ' you haven\'t seen');
  return list([...known, ...rest]);
}
// The card in plain sentences, for the log.
export function cardLines(card) {
  const by = card.authorName ? `, written by ${card.authorName}` : ', a stray nobody signs';
  const what = card.strain ? `a ${card.strain} build on a ${card.body.toLowerCase()} body` : `a ${card.body.toLowerCase()} body`;
  const out = [`${card.name}${by}. It is ${what}, level ${card.level}${card.grade > 1 ? `, grade v${card.grade}` : ''}.`];
  if (card.style) out.push(card.style);
  const core = card.genes.filter((c) => c.src === 'core'), more = card.genes.filter((c) => c.src !== 'core' && c.src !== 'grade'), grade = card.genes.filter((c) => c.src === 'grade');
  out.push(`Its body carries ${named(core)}.${more.length ? ` It also carries ${named(more)}.` : ''}${grade.length ? ` Its grade makes it ${named(grade)}.` : ''}`);
  if (card.tells.length) out.push(`It can announce ${named(card.tells)}.`);
  // An Infiltrator's scan reads the rules you haven't decoded (the rest are in your codex).
  if (card.deep) for (const c of [...card.genes, ...card.tells]) if (c.rule && c.state !== 'decoded') out.push(`${c.name} is ${an(c.catName)} ${c.catName}. ${c.rule}`);
  return out;
}

// ---------- inspect <part> (a fight; free) ----------
export function inspect(s, arg) {
  const e = s.encounter;
  if (!e) return warn(s, 'inspect works in a fight: inspect <part>.');
  const ps = e.virus.parts.filter((p) => p.kind !== 'fragment');
  const p = ps.find((x) => x.id === arg || x.name.toLowerCase() === arg) || ps.find((x) => x.id.startsWith(arg) || x.name.toLowerCase().startsWith(arg));
  if (!arg || !p) return warn(s, `inspect <part>: ${ps.map((x) => x.id).join(', ')}.`);
  const ids = partGenes(p), deep = scannedDeep(s, e.virus);
  if (!ids.length) return emit(s, 'info', `The ${p.name} carries no gene of its own.`, { target: p.id, inspect: true });
  const lines = ids.map((id) => {
    const c = chipOf(s, id, 'part', deep);
    if (c.rule) return `${c.name} is ${an(c.catName)} ${c.catName} that presses on ${c.axisName}. ${c.rule} ${c.answer}`;
    return `You haven't decoded ${c.name || `this ${c.catName}`} yet. Break a part that carries it to learn what it does.`;
  });
  return emit(s, 'info', `The ${p.name}${alive(p) ? '' : ', broken,'} carries ${named(ids.map((id) => chipOf(s, id, 'part', deep)))}.\n${lines.join('\n')}`, { target: p.id, inspect: true });
}
// An Infiltrator's scan reads deeper, for the fight it scanned.
export const scannedDeep = (s, v) => !!(v && s.run?.scanned?.includes(v.id));

// ---------- scan ----------
// The card for the virus you're facing (a fight at the gate, or under way): free, you can see it. On a run, scanning
// a virus or a guarded folder you can see before you engage is run.mjs's (it costs Signal and Trace).
export function scanFight(s) {
  const v = s.encounter?.virus;
  if (!v) return warn(s, 'Nothing to scan here. On a run, scan a virus or a guarded folder you can see.');
  return showCard(s, v, { deep: classOf(s) === 'infiltrator' || scannedDeep(s, v) });
}
export function showCard(s, v, { deep = false, type = 'scan' } = {}) {
  const card = genomeCard(s, v, { deep });
  return emit(s, type, cardLines(card).join('\n'), { card });
}
export function genomeCommand(s, text) {
  const [word, ...rest] = text.split(' ');
  const arg = rest.join(' ').trim().toLowerCase();
  if (word === 'inspect') return inspect(s, arg);
  if (s.encounter) return scanFight(s);
  return warn(s, 'scan works on a run, on a virus or a guarded folder you can see, or on what you are fighting.');
}
export { CATS, AXES };

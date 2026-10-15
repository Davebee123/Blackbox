// The Codex tab (codex-view.mjs draws it): every kind of virus you can meet, as an index and an entry page, and only
// what you've found out about each. Pure: it reads the save and the content tables, and builds sample viruses that it
// throws away.
//
//   entries(s)        the index: groups (Families, Strains, Guards & ICE, Runners, Bosses, Mutations), each row its name (or
//                     ??? until met), its icon and a small count (its research %, wins, kills toward a decode)
//   entryOf(s, key)   one entry's page data: the sample virus at your level, its parts with what you know of each,
//                     its attack sets (with their timing) and tells, each known or not, and its loot
//
// What unlocks what (the same rules as the fight board): an entry's name once you've met it (s.met, a boss once fought:
// s.dex.fought); a part's name once you've fought its family (a third part: once you've met one), then by its research
// (research.mjs): its numbers at 1, its rule, answer and tells at 5, its loot at 20; an attack set once you've faced it
// in a room (s.dex.sets, and each server's floorplan codex); a tell once one was said in your fight (s.dex.tells); a
// boss's phases once you've fought it.
import { FAMILIES, ROOM_FAMILIES, STRAINS, GUARDS, BOSSES, MUTATIONS, ROLLED_MUTATIONS, TELLS, TELL, CONFIG, SERVER, createVirus } from './data.mjs';
import { ATTACK_SETS, AUTHOR_FAMILIES, OPENS, applySet } from './families.mjs';
import { GENES, AXES } from './genes.mjs';
import { AUTHORS, crewOf, buildAuthor, bossAuthor } from './authors.mjs';
import { geneState } from './genome.mjs';
import { knowsPart, hackerLevel, bossUniques, codexKey } from './combat.mjs';
import { researchAt, tierAt, pctOf } from './research.mjs';
import { plannedTells, findSource, tierOf, answerOf } from './tells.mjs';
import { ROOMS } from './floorplan.mjs';

export const GROUPS = [
  { id: 'family', name: 'Families' },
  { id: 'strain', name: 'Strains' },
  { id: 'guard', name: 'Guards & ICE' },
  { id: 'runner', name: 'Runners' }, // the Mule: a room body that runs (families.mjs, runner: true)
  { id: 'boss', name: 'Bosses' },
  { id: 'mutation', name: 'Mutations' },
];
const FAMILY_ICON = { ransomware: 'lock', worm: 'worm', ghostroot: 'stealth', trojan: 'crate', cryptominer: 'kernel', wiper: 'scrubber' };
const GUARD_ICON = { watchdog: 'watchman', sentinel: 'ids', crawler: 'spider', shredder: 'claw', bouncer: 'firewall', tracer: 'tracer' };
const familyIds = () => [...Object.keys(FAMILIES), ...Object.keys(ROOM_FAMILIES).filter((id) => !ROOM_FAMILIES[id].runner)];
const runnerIds = () => Object.keys(ROOM_FAMILIES).filter((id) => ROOM_FAMILIES[id].runner);
const RUNNER_ICON = { mule: 'credits' };
const bodyOf = (id) => FAMILIES[id] || ROOM_FAMILIES[id] || GUARDS[id] || null;
export const SET_CYCLES = 12; // the attack sets' timing strip: cycles 1 to 12

// ---------- what you've met ----------
const dex = (s) => s.dex || {};
export const killsOf = (s, id) => dex(s).kills?.[id] || 0;
// An attack set you've faced: the Codex's own record, or any server's floorplan codex (a save from before the Codex tab).
export function facedSet(s, family, set) {
  const key = `${family}:${set}`;
  if (dex(s).sets?.[key]) return true;
  const plans = [s.roomsPlay, s.zone?.floorplan, ...(s.locations || []).map((l) => l.floorplan)];
  return plans.some((R) => R?.codex?.[key]);
}
export const tellSeen = (s, name) => !!dex(s).tells?.[String(name).toLowerCase()];
export const bossFought = (s, id) => (dex(s).fought?.[id] || 0) > 0;
function met(s, group, id) {
  if (group === 'family' || group === 'strain' || group === 'guard' || group === 'runner') return !!s.met?.[id] || killsOf(s, id) > 0;
  if (group === 'boss') return bossFought(s, id);
  if (group === 'mutation') return geneState(s, MUTATIONS[id].gene) !== 'unknown' || !!dex(s).muts?.[id]?.length;
  return false;
}

// ---------- sample viruses ----------
// A virus as a room fight builds it at a level (floorplan.mjs fight: a process's size, a guard's), with no nudge: what
// the Codex quotes "at your level". gene: the third part it brings. A family's comes under its Standard set (raw: before
// any set, for the attack sets' strips). Built once, kept, never fought.
const built = new Map();
export function sampleOf(group, id, level, gene = null, raw = false) {
  const key = `${group}:${id}:${gene || ''}:${level}${raw ? ':raw' : ''}`;
  if (built.has(key)) return built.get(key);
  const threat = SERVER.threat(level), seed = 4821;
  const v = group === 'strain' ? createVirus(id, seed, { threat, run: true, mutation: null })
    : createVirus('random', seed, { family: id, threat, run: true, mutation: null, genes: gene ? [gene] : [] });
  const S = ROOMS.size[group === 'guard' ? 'guard' : group === 'runner' ? 'mule' : 'process'];
  for (const p of v.parts) {
    p.max = p.integrity = Math.max(1, Math.round(p.max * S.hp));
    const a = p.attack;
    if (a && ['damage', 'encrypt'].includes(a.effect)) a.amount = Math.max(1, Math.round(a.amount * S.dmg));
    if (a?.hit) a.hit = Math.max(1, Math.round(a.hit * S.dmg));
    if (a?.rampBy) a.rampBy = Math.max(1, Math.round(a.rampBy * S.dmg));
  }
  if (group === 'family' && ATTACK_SETS[id] && !raw) applySet(v, Object.keys(ATTACK_SETS[id])[0], null); // its Standard set (a room body's Courier delivers by it)
  if (group === 'runner') for (const p of v.parts) p.armor = p.maxArmor = Math.min(p.maxArmor, 1); // a runner wears 1 ◆ at most (floorplan.mjs fight)
  v.id = `codex-${group}-${id}-${gene || 'core'}-${level}${raw ? '-raw' : ''}`;
  v.author = null;
  built.set(key, v);
  return v;
}
const levelOf = (s) => Math.max(1, Math.min(CONFIG.maxMobLevel, hackerLevel(s)));
// A body's parts, the third-part pool included: [{ spec, gene (a third part's), from (the level it opens at) }].
function specsOf(group, id) {
  if (group === 'strain') return STRAINS[id].parts.map((spec) => ({ spec, gene: null, from: STRAINS[id].from }));
  const body = bodyOf(id);
  return body.parts.map((spec) => ({ spec, gene: spec.pool === 'third' ? spec.gene : null, from: spec.from || OPENS[id] || 1 }));
}

// ---------- the index ----------
// One row: { key, group, id, name (null: ???), icon, count: { n, of } or null, note (a small word), known }.
function familyRow(s, group, id) {
  const known = met(s, group, id), body = group === 'strain' ? STRAINS[id] : bodyOf(id);
  const parts = known ? partsOf(s, group, id) : [];
  const icon = group === 'family' ? FAMILY_ICON[id] : group === 'guard' ? GUARD_ICON[id] : group === 'runner' ? RUNNER_ICON[id] : FAMILY_ICON[STRAINS[id].lineage];
  return { key: `${group}:${id}`, group, id, name: known ? body.name : null, icon: icon || 'module', known, count: null, pct: known ? pctOf(parts.map((p) => p.research)) : null };
}
export function entries(s) {
  const rows = [];
  for (const id of familyIds()) rows.push(familyRow(s, 'family', id));
  for (const id of Object.keys(STRAINS)) rows.push(familyRow(s, 'strain', id));
  for (const id of Object.keys(GUARDS)) rows.push(familyRow(s, 'guard', id));
  for (const id of runnerIds()) rows.push(familyRow(s, 'runner', id));
  for (const id of Object.keys(BOSSES)) {
    const known = bossFought(s, id), won = dex(s).won?.[id] || 0;
    const pct = known && !BOSSES[id].raid ? pctOf(bossParts(s, id).map((p) => p.research)) : null;
    rows.push({ key: `boss:${id}`, group: 'boss', id, name: known ? BOSSES[id].name : null, icon: BOSSES[id].raid ? 'raid' : 'bounty', known, count: null, pct, note: known && pct == null ? (won ? `×${won}` : 'fought') : null });
  }
  for (const id of ROLLED_MUTATIONS) {
    const known = met(s, 'mutation', id), g = GENES[MUTATIONS[id].gene], st = geneState(s, g.id);
    rows.push({ key: `mutation:${id}`, group: 'mutation', id, name: known ? MUTATIONS[id].name : null, icon: AXES[g.axis].icon, known, count: known ? { n: st === 'decoded' ? 2 : Math.min(1, s.geneCodex?.[g.id]?.kills || 0), of: 2 } : null, decoded: st === 'decoded' });
  }
  return GROUPS.map((g) => ({ ...g, rows: rows.filter((r) => r.group === g.id), met: rows.filter((r) => r.group === g.id && r.known).length }));
}
// The entry to open with nothing picked: the first family you've met, or the first family.
export const firstKey = (s) => entries(s)[0].rows.find((r) => r.known)?.key || `family:${familyIds()[0]}`;
export const validKey = (key) => {
  const [g, id] = String(key || '').split(':');
  return (g === 'family' && !!bodyOf(id) && !GUARDS[id] && !ROOM_FAMILIES[id]?.runner) || (g === 'runner' && !!ROOM_FAMILIES[id]?.runner) || (g === 'strain' && !!STRAINS[id]) || (g === 'guard' && !!GUARDS[id]) || (g === 'boss' && !!BOSSES[id]) || (g === 'mutation' && ROLLED_MUTATIONS.includes(id));
};

// ---------- a body's page ----------
// Its parts, each with its sample at your level (or at the level it opens, if that's later): { spec, part, virus,
// level, from, named (its name is yours to see), research (0 to 20, research.mjs), tier (0, 1, 5 or 20), known
// (decoded: research 1, its numbers) }.
export function partsOf(s, group, id) {
  const L = levelOf(s), specs = specsOf(group, id), thirds = specs.filter((x) => x.gene);
  const first = thirds.find((x) => x.from <= L)?.gene || null; // the core parts as a virus at your level brings them
  return specs.map((x) => {
    const level = Math.max(L, x.from), v = sampleOf(group, id, level, x.gene || (x.from <= L ? first : null));
    const p = v.parts.find((q) => q.id === x.spec.id) || null;
    // A third part: named once you've met one (its own rule seen in a fight), or researched it.
    const named = met(s, group, id) && (!x.gene || geneState(s, x.gene) !== 'unknown' || (p && knowsPart(s, v, p)));
    const n = p && met(s, group, id) ? researchAt(s, codexKey(v, p)) : 0;
    return { spec: x.spec, part: p, virus: v, level, from: x.from, gene: x.gene, named: !!named, research: n, tier: tierAt(n), known: !!p && met(s, group, id) && knowsPart(s, v, p) };
  });
}
// The authors who write it: its family's crew and the authors whose servers field it, or a build's or a boss's own.
export function authorsOf(group, id) {
  const out = [];
  const add = (a) => { if (a && AUTHORS[a] && !out.includes(a)) out.push(a); };
  if (group === 'family') { add(crewOf(id)); for (const [a, fams] of Object.entries(AUTHOR_FAMILIES)) if (fams.includes(id)) add(a); }
  if (group === 'strain' || group === 'guard') add(buildAuthor(id));
  if (group === 'boss') add(bossAuthor(id));
  return out;
}
// An attack set's timing strip: one row a part that fires (and a Courier's deliveries), each with the cycles (1 to 12)
// it fires on and its amount under the set at your level. lead: the part that leads (or 'both').
export function setRows(s, family, setId) {
  const set = ATTACK_SETS[family]?.[setId];
  if (!set) return null;
  const L = levelOf(s), v = structuredClone(sampleOf('family', family, L, null, true));
  applySet(v, setId, null);
  const rows = [];
  const marks = (first, interval) => { const out = []; for (let c = first; c <= SET_CYCLES; c += Math.max(1, interval)) out.push(c); return out; };
  for (const p of v.parts) {
    if (p.attack && p.attack.due < 900) rows.push({ part: p.id, name: p.name, attack: p.attack.name, effect: p.attack.effect, amount: p.attack.effect === 'scramble' ? p.attack.hit || 0 : p.attack.amount, interval: p.attack.interval, first: p.attack.due, cycles: marks(p.attack.due, p.attack.interval), mult: set.parts[p.id]?.mult || 1 });
    if (p.deliver) rows.push({ part: p.id, name: p.name, attack: 'Deliver', effect: 'deliver', amount: 0, interval: p.deliver.interval, first: p.deliver.first, cycles: marks(p.deliver.first, p.deliver.interval), mult: 1 });
  }
  const lead = set.lead === 'both' ? null : v.parts.find((p) => p.id === set.lead)?.name || null;
  return { id: setId, name: set.name, lead, both: set.lead === 'both', by: set.by.filter((a) => AUTHORS[a]), heat: set.heat || null, rows };
}
export function setsOf(s, family) {
  const sets = ATTACK_SETS[family];
  if (!sets) return [];
  return Object.keys(sets).map((id) => ({ id, faced: facedSet(s, family, id), ...(facedSet(s, family, id) ? setRows(s, family, id) : { name: null }) }));
}

// ---------- tells ----------
const KIND = { charge: 'Charge', cast: 'Cast', seal: 'Seal', mimic: 'Beat', lock: 'Lock' };
export const tellKind = (k) => KIND[k] || k;
// The tells a body can bring, in order, each with the part it sits on, the level it first comes at, what it does at
// your level and what answers it. A tell's level: the first at which a virus of it brings it (tells.mjs plannedTells).
const tellMemo = new Map();
function tellLevels(group, id) {
  const key = `${group}:${id}`;
  if (tellMemo.has(key)) return tellMemo.get(key);
  const out = new Map();
  const genes = group === 'family' || group === 'guard' ? [null, ...specsOf(group, id).filter((x) => x.gene).map((x) => x.gene)] : [null];
  for (let L = 1; L <= CONFIG.maxMobLevel; L++) for (const g of genes) {
    const spec = g ? specsOf(group, id).find((x) => x.gene === g) : null;
    if (spec && spec.from > L) continue;
    const v = group === 'boss' ? null : sampleOf(group, id, L, g);
    if (!v) continue;
    for (const t of plannedTells(v)) { const x = out.get(t.name); if (!x) out.set(t.name, { level: L, elite: null, def: t, gene: g }); else if (x.level == null) Object.assign(x, { level: L, def: t, gene: g }); }
    for (const t of plannedTells({ ...v, elite: true })) if (!out.has(t.name)) out.set(t.name, { level: null, elite: L, def: t, gene: g }); // an elite brings one more
  }
  tellMemo.set(key, out);
  return out;
}
const what = { loud: `Every attack deals ${Math.round((TELL.loud - 1) * 100)}% more damage for ${TELL.castLasts} cycles.`, grow: `Every part grows ${Math.round(TELL.grow * 100)}% more Integrity.`, haste: `Every attack repeats 1 cycle faster for ${TELL.castLasts} cycles.` };
export function tellDoes(def, p, level) {
  const T = tierOf(Math.max(6, level)), atk = p?.attack?.name || 'attack', x = `×${T.mult}`;
  if (def.kind === 'charge') {
    const more = def.gene === 'fulldisk' ? `, with a burst of encryption for ${TELL.burst} cycles` : def.spawn ? `, and it hatches ${def.spawn + 1} at once` : def.longer ? `, and its Scramble lasts ${def.longer} cycles longer` : def.shred ? ', and it shreds a file in your pack' : '';
    return `Powers up one of the ${p?.name || 'part'}'s ${atk}s to ${x}${more}.`;
  }
  if (def.kind === 'cast') return what[def.does] || 'Compiles a buff on the virus.';
  if (def.kind === 'seal') return `Re-arms the ${p?.name || 'part'} to full with 1 ◆ more if it still wears ◆, and every stripped part gets 1 ◆ back.`;
  if (def.kind === 'mimic') return `Plays the command you fire on its beat back at you, every ${TELLS.mimic.every} cycles from cycle ${TELLS.mimic.first}.`;
  return '';
}
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
export function tellsOf(s, group, id) {
  if (group === 'boss') return bossTells(s, id);
  const L = levelOf(s), lv = tellLevels(group, id);
  return [...lv.entries()].map(([name, { level, elite, def, gene }]) => {
    const at = Math.max(L, level ?? elite), v = sampleOf(group, id, at, gene), p = findSource(v, def) || v.parts.find((q) => q.id === def.part);
    return { name, kind: def.kind, part: p?.name || null, level, elite, seen: tellSeen(s, name), does: tellDoes(def, p, at), answer: cap(answerOf(def, p)) + '.' };
  });
}
// A solo boss as a fight builds it at your level (its floor, if that's later), sized as a boss room: its parts share
// their research with its family's or strain's (combat.mjs codexKey).
const bossBuilt = new Map();
export function bossSample(s, id) {
  const B = BOSSES[id], L = Math.max(levelOf(s), B.floor || 1), key = `${id}:${L}`;
  if (bossBuilt.has(key)) return bossBuilt.get(key);
  const st = B.strain && STRAINS[B.strain];
  const v = createVirus(st ? B.strain : 'random', 4821, { family: B.family || 'ransomware', threat: SERVER.threat(L), run: true, mutation: null, boss: id, ...(B.strain ? { strain: B.strain } : {}) });
  const S = ROOMS.size.boss;
  for (const p of v.parts) {
    p.max = p.integrity = Math.max(1, Math.round(p.max * S.hp));
    const a = p.attack;
    if (a && ['damage', 'encrypt'].includes(a.effect)) a.amount = Math.max(1, Math.round(a.amount * S.dmg));
    if (a?.hit) a.hit = Math.max(1, Math.round(a.hit * S.dmg));
  }
  v.id = `codex-boss-${id}-${L}`; v.author = null;
  const out = { level: L, virus: v };
  bossBuilt.set(key, out);
  return out;
}
// Its parts, in a body's part shape (partsOf): every one is named once you've fought it.
export function bossParts(s, id) {
  if (BOSSES[id].raid) return [];
  const { level, virus } = bossSample(s, id), fought = bossFought(s, id);
  return virus.parts.filter((p) => p.kind !== 'fragment').map((p) => {
    const n = fought ? researchAt(s, codexKey(virus, p)) : 0;
    return { spec: p, part: p, virus, level, from: 1, gene: null, named: fought, research: n, tier: tierAt(n), known: fought && knowsPart(s, virus, p) };
  });
}
// A solo boss brings every tell open at its level, at least three (TELL.boss.count): its own set, or its strain's with
// the charge under its own name, or its family's.
function bossTells(s, id) {
  const B = BOSSES[id];
  if (B.raid) return [];
  const L = Math.max(levelOf(s), B.floor || 1), st = B.strain && STRAINS[B.strain];
  const v = createVirus(st ? B.strain : 'random', 4821, { family: B.family || 'ransomware', threat: SERVER.threat(L), run: true, mutation: null, boss: id, ...(B.strain ? { strain: B.strain } : {}) });
  return plannedTells(v).map((t) => {
    const p = v.parts.find((q) => q.id === t.part);
    return { name: t.name, kind: t.kind, part: p?.name || null, level: null, elite: null, seen: tellSeen(s, t.name), does: tellDoes(t, p, L), answer: cap(answerOf(t, p)) + '.' };
  });
}

// ---------- one entry ----------
export function entryOf(s, key) {
  const [group, id] = String(key).split(':');
  const L = levelOf(s), known = met(s, group, id);
  const base = { key, group, id, level: L, known };
  if (!known) return base;
  if (group === 'family' || group === 'strain' || group === 'guard' || group === 'runner') {
    const body = group === 'strain' ? STRAINS[id] : bodyOf(id), parts = partsOf(s, group, id);
    const lineage = group === 'strain' ? body.lineage : null;
    return {
      ...base, name: body.name, stem: body.stem || null, threatens: body.threatens || (lineage ? bodyOf(lineage)?.threatens : null), summary: body.summary || null, escape: group === 'runner' ? CONFIG.mule.escape : null,
      rule: group === 'runner' ? `It runs from you, a room for each of your moves, and never through a live virus. Caught, it escapes after ${CONFIG.mule.escape} cycles.` : body.rule || null, ice: !!body.ice, lineage, opens: group === 'strain' ? body.from : group === 'family' ? OPENS[id] || 1 : null, depth: group === 'strain' ? body.depth || 2 : null,
      kills: killsOf(s, id), authors: authorsOf(group, id), parts, research: pctOf(parts.map((p) => p.research)), sets: group === 'family' ? setsOf(s, id) : [], tells: tellsOf(s, group, id),
      art: parts.find((x) => !x.gene)?.virus || parts[0]?.virus,
    };
  }
  if (group === 'boss') {
    const B = BOSSES[id];
    const phases = B.raid ? B.raid.phases.map((ph) => ({ at: ph.from, name: ph.name, say: ph.say || null, mechs: ph.mechs.map((m) => m.name) })) : B.phases.map((ph) => ({ at: ph.at, say: ph.say }));
    const uniques = bossUniques(id).map((u) => ({ name: s.collection?.[u.id] ? u.name : null, level: u.level }));
    return {
      ...base, name: B.name, family: B.family || null, strain: B.strain || null, raid: !!B.raid, about: B.about || null, signature: B.signature || null, hp: B.hp, enrageAt: B.enrageAt, floor: B.floor || null,
      lair: B.lair || null, fought: dex(s).fought?.[id] || 0, won: dex(s).won?.[id] || 0, authors: authorsOf('boss', id), phases, tells: tellsOf(s, 'boss', id), uniques,
      parts: bossParts(s, id),
      enrage: B.raid ? B.raid.enrage?.name || null : null,
    };
  }
  if (group === 'mutation') {
    const m = MUTATIONS[id], g = GENES[m.gene], st = geneState(s, g.id);
    const on = (dex(s).muts?.[id] || []).map((k) => STRAINS[k]?.name || bodyOf(k)?.name || k);
    return { ...base, name: m.name, rule: m.rule, axis: AXES[g.axis], decoded: st === 'decoded', kills: Math.min(2, s.geneCodex?.[g.id]?.kills || 0), telegraph: g.telegraph, answer: g.answer, opens: g.opens, on };
  }
  return base;
}

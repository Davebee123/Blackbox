// The Arena (the bench's Dev drawer, GAME_RULES.md "Developer tools"): every fightable thing, built from the data tables
// so new families, strains, bosses and rivals show up by themselves, and the one command behind its Fight button:
//   developer fight <kind>:<id> [level] [seed] [leaning=<id>] [objective=<id>]
//   developer fight <family|random> [level] [seed]      as before (family:<id> is the same)
//   developer fight part:<id>[.exe] [level] [seed]       a part's fight, at the level it opens by default
//   developer fight again [refill]                       the last pick again (refill: Signal and Integrity full first)
// A fight here is a home fight, engaged at once and flagged e.arena (objectives.mjs reads it for its clock).
import { selectEncounter, encounterVirus, command, warn, active, hackerLevel, hooks } from './combat.mjs';
import { FAMILIES, STRAINS, GUARDS, FIXTURES, BOSSES, FLOORS, LOADOUT, partGenesFor } from './data.mjs';
import { CLASHES } from './genes.mjs';
import { PARTS } from './parts.mjs';
import { EXE } from './exe.mjs';
import { FLOOR } from './floors.mjs';
import { FARM } from './rogue.mjs';
import { AUTHORS } from './authors.mjs';
import { RIVAL, RIVALS, COUNTERS, fightSpec, rivalArm, readFight, counterFor } from './rivals.mjs';
import { INVADER, KINDS, CHAMPION } from './invasion.mjs';
import { LEANINGS } from './leanings.mjs';
import { OBJECTIVES, armObjective } from './objectives.mjs';

// The list's groups in order: [group, its heading, the kind each row shows].
export const ARENA_GROUPS = [
  ['family', 'Families', 'Family'], ['wave1', 'Strains, wave 1', 'Strain'], ['wave2', 'Strains, wave 2', 'Strain'], ['mutated', 'Mutated strains', 'Strain'],
  ['ice', 'ICE', 'ICE'], ['part', 'Parts', 'Part'], ['exe', '.exe builds', '.exe build'], ['elite', 'Elites', 'Elite'],
  ['resident', 'Residents', 'Resident'], ['solo', 'Solo bosses', 'Solo boss'], ['lair', 'Lair bosses', 'Lair boss'], ['holder', 'Floor holders', 'Floor holder'],
  ['crew', 'Crew bosses', 'Crew boss'], ['rival', 'Rivals', 'Rival'], ['invader', 'Invaders', 'Invader'],
];
const KIND = Object.fromEntries(ARENA_GROUPS.map(([g, , k]) => [g, k]));
const band = (floor) => FLOORS[Math.max(1, Math.min(FLOORS.length, floor)) - 1]?.band[0] || 1;
// Every part once, with the family it's fought in (the first that has it).
const partHomes = () => { const out = new Map(); for (const [f, F] of Object.entries(FAMILIES)) for (const p of F.parts) if (!out.has(p.id)) out.set(p.id, [f, p]); return out; };
// A clash's families: those whose parts hold both its sides (a tell side fits any). None: it never rolls, so it isn't listed.
const clashSide = (k) => (k in PARTS.tells ? null : k);
function clashFamilies(c) {
  const genes = [c.a, c.b].map(clashSide).filter(Boolean);
  return Object.keys(FAMILIES).filter((f) => genes.every((g) => FAMILIES[f].parts.some((p) => p.gene === g)));
}
function clashOpens(c, fams) {
  const side = (k) => (k in PARTS.tells ? PARTS.tells[k] : Math.min(...fams.map((f) => FAMILIES[f].parts.find((p) => p.gene === k)?.from || 1)));
  return Math.max(PARTS.lever, side(c.a), side(c.b));
}
const bossGroup = (id, B) => (B.raid ? 'crew' : B.native ? 'lair' : B.holder ? 'holder' : id === 'resident' || B.resident ? 'resident' : 'solo');
function bossOpens(id, B) {
  if (B.floor || B.from) return B.floor || B.from;
  const lair = Object.entries(FLOOR.lairs || {}).find(([, xs]) => xs.includes(id));
  if (lair) return band(Number(lair[0]));
  return B.raid ? FARM.from : 1;
}

// Every entry: { id, group, kind, name, opens, tip }. tip: the row's tooltip lines after its name and kind.
export function arenaList() {
  const out = [], add = (group, id, name, opens, tip = []) => out.push({ id, group, kind: KIND[group], name, opens: Math.max(1, opens || 1), tip: tip.filter(Boolean) });
  for (const [k, F] of Object.entries(FAMILIES)) add('family', `family:${k}`, F.name, F.opens?.level || 1);
  for (const [k, S] of Object.entries(STRAINS)) add(S.mutates ? 'mutated' : S.parts.some((p) => p.mech) ? 'wave2' : 'wave1', `strain:${k}`, S.name, S.from, [S.rule, S.answer]);
  for (const k of Object.keys(GUARDS)) add('ice', `ice:${k}`, GUARDS[k].name || FIXTURES[k]?.name || k, (FIXTURES[k]?.threat || 10) - 9);
  for (const [id, [f, p]] of partHomes()) {
    add('part', `part:${id}`, p.name, p.from, [`A ${FAMILIES[f].name} part.`]);
    if (EXE[id]) add('exe', `part:${id}.exe`, `${p.name}.exe`, p.from, [EXE[id].what]);
  }
  for (const c of CLASHES) { const fams = clashFamilies(c); if (fams.length) add('elite', `elite:${c.id}`, c.name, clashOpens(c, fams), [c.pull, c.answer]); }
  for (const [id, B] of Object.entries(BOSSES)) add(bossGroup(id, B), `boss:${id}`, B.name, bossOpens(id, B), [B.about || B.signature?.rule]);
  if (!Object.values(BOSSES).some((B) => B.holder)) for (const a of Object.keys(FLOOR.holders.writes)) add('holder', `holder:${a}`, AUTHORS[a]?.name || a.toUpperCase(), band(FLOOR.holders.from), [`It writes ${FLOOR.holders.writes[a].map((f) => FAMILIES[f]?.name || f).join(', ')} servers.`]);
  for (const [id, R] of Object.entries(RIVALS)) R.lineup.forEach((_, i) => {
    let floor = 1; while (floor < FLOORS.length && RIVAL.fights(floor) <= i) floor++;
    add('rival', `rival:${id}.${i + 1}`, `${R.name} ${i + 1}/${R.lineup.length}`, band(floor), [i ? 'It adds its counter to how you won the fight before.' : null]);
  });
  for (const [k, K] of Object.entries(KINDS)) add('invader', `invader:${k}`, K.name, K.from, [K.lvl ? `It comes ${K.lvl > 0 ? `${K.lvl} over` : `${-K.lvl} under`} its level.` : null]);
  return out;
}
export const arenaEntry = (id) => arenaList().find((x) => x.id === id) || null;
export const arenaLeanings = () => Object.keys(LEANINGS);
export const arenaObjectives = () => Object.keys(OBJECTIVES).filter((k) => OBJECTIVES[k].bonus); // what wins a fight on its own clock (the Exfil's is a runner's)

// The level a pick fights at when none is set: a part's at the level it opens (as ?playtest=part:<id>), a rival's one
// over you, an invader's its kind's step over you, the rest yours, never under the level it opens.
export function arenaLevel(s, id) {
  const x = arenaEntry(id), L = hackerLevel(s), cap = (n) => Math.max(1, Math.min(LOADOUT.maxLevel, n));
  if (!x) return cap(L);
  if (x.group === 'part' || x.group === 'exe') return cap(Math.max(x.opens, 3));
  if (x.group === 'rival') return cap(Math.max(x.opens, L + RIVAL.level));
  if (x.group === 'invader') return cap(Math.max(x.opens, L + (KINDS[id.slice(8)].lvl || 0)));
  return cap(Math.max(x.opens, L));
}

const USAGE = 'developer fight <kind>:<id> [level] [seed] [leaning=<id>] [objective=<id>], or developer fight again [refill]';
// developer fight …: text is the command, normalized (lower case).
export function arenaCommand(s, text) {
  const words = text.split(' ').slice(2);
  if (words[0] === 'again') {
    if (words.length > 2 || (words[1] && words[1] !== 'refill')) return warn(s, USAGE);
    if (!s.arenaLast) return warn(s, 'Nothing to fight again yet. Pick one in the Arena.');
    if (active(s) && !s.encounter.arena) return warn(s, 'Finish the fight first.');
    if (active(s)) s.encounter = null; // an Arena fight in play: dropped, and fought again from the start
    if (words[1]) command(s, 'developer refill');
    return arenaCommand(s, `developer fight ${s.arenaLast}`);
  }
  let [what, ...rest] = words;
  if (!what) return warn(s, USAGE);
  if (what === 'random' || FAMILIES[what]) what = what === 'random' ? 'random' : `family:${what}`;
  const nums = [], opt = {};
  for (const w of rest) {
    const kv = /^(leaning|objective)=([a-z]+)$/.exec(w);
    if (kv) opt[kv[1]] = kv[2];
    else if (/^\d+$/.test(w) && nums.length < 2 && !Object.keys(opt).length) nums.push(Number(w));
    else return warn(s, USAGE);
  }
  if (opt.leaning && !LEANINGS[opt.leaning]) return warn(s, `No leaning called ${opt.leaning}. Try ${arenaLeanings().join(', ')}.`);
  if (opt.objective && !arenaObjectives().includes(opt.objective)) return warn(s, `No objective called ${opt.objective}. Try ${arenaObjectives().join(', ')}.`);
  if (what !== 'random' && !arenaEntry(what)) {
    if (what.startsWith('part:')) return warn(s, `No part called ${what.slice(5).replace(/\.exe$/, '')}.`);
    return warn(s, `No fight called ${what}. The Arena in the Dev drawer lists them all.`);
  }
  if (active(s)) return warn(s, 'Finish the fight first.');
  if (s.run) return warn(s, 'Jack out first: developer fight is a fight at home.');
  const L = nums[0] ? Math.max(1, Math.min(LOADOUT.maxLevel, nums[0])) : what === 'random' ? hackerLevel(s) : arenaLevel(s, what), seed = nums[1] >>> 0 || 1;
  const before = s.encounter;
  const spec = fightOf(s, what, L, seed, !nums[0]);
  if (!spec) return null;
  selectEncounter(s, spec.key, spec.seed, spec.opts);
  const e = s.encounter;
  if (!e || e === before || e.phase !== 'alert') return null;
  e.arena = what;
  spec.after?.(e);
  if (opt.leaning) e.leaning = { id: opt.leaning, paid: 0 };
  if (opt.objective) armObjective(s, e, opt.objective);
  s.arenaLast = [what, L, seed, ...(opt.leaning ? [`leaning=${opt.leaning}`] : []), ...(opt.objective ? [`objective=${opt.objective}`] : [])].join(' ');
  return command(s, 'engage');
}

hooks.arena = arenaCommand; // combat.mjs's developer fight (it can't import this: rivals.mjs needs floorplan.mjs, which needs combat.mjs first)

// What selectEncounter gets for a pick: { key, seed, opts, after(e) }, or null (it warned).
function fightOf(s, what, L, seed, free) {
  const [kind, id] = what.includes(':') ? [what.slice(0, what.indexOf(':')), what.slice(what.indexOf(':') + 1)] : [what, null];
  const home = { level: L, mutation: null };
  const pick = (xs) => xs[(seed >>> 0) % xs.length];
  if (kind === 'random') return { key: 'random', seed, opts: home };
  if (kind === 'family') return { key: 'random', seed, opts: { ...home, family: id } };
  if (kind === 'strain' || kind === 'ice') return { key: id, seed, opts: { level: L } };
  if (kind === 'part') {
    const pid = id.replace(/\.exe$/, ''), [fam, p] = partHomes().get(pid);
    return { key: 'random', seed, opts: { ...home, family: fam, ...(id.endsWith('.exe') ? { exe: [pid] } : {}), ...(p.pool === 'third' ? { genes: partGenesFor(fam, p, L), basic: 'pulse' } : { basic: pid }) } };
  }
  if (kind === 'elite') {
    // A clash comes by the elite's roll (parts.mjs): the first seed from this one that rolls it, at this level (or, with
    // no level set, the first level up that does).
    const c = CLASHES.find((x) => x.id === id), fams = clashFamilies(c);
    for (let lv = L; lv <= (free ? LOADOUT.maxLevel : L); lv++) for (const fam of fams) for (let k = 0; k < 32; k++) {
      const sd = (seed + k * 7919) >>> 0, opts = { level: lv, family: fam, elite: true, mutation: null };
      if (encounterVirus(s, 'random', sd, opts).clash === id) return { key: 'random', seed: sd, opts };
    }
    warn(s, `No elite rolls ${c.name} at level ${L}${PARTS.on ? '' : ' with the parts roll off'}.`);
    return null;
  }
  if (kind === 'boss') {
    const B = BOSSES[id], fam = B.family || pick(Object.keys(FAMILIES).filter((f) => !FAMILIES[f].opens));
    return { key: 'random', seed, opts: { ...home, family: fam, boss: id, name: id === 'resident' ? 'RESIDENT' : B.name, ...(B.strain ? { strain: B.strain } : {}) } };
  }
  if (kind === 'holder') return { key: 'random', seed, opts: { ...home, family: pick(FLOOR.holders.writes[id]), author: id } };
  if (kind === 'rival') {
    // Fight n of its lineup, one level over you. From the second, its counter: read from how you won the fight before
    // if that was this one's (rivals.mjs readFight), else its last read's.
    const [rid, n] = id.split('.'), i = Number(n) - 1, prev = s.encounter;
    const read = prev?.arena === `rival:${rid}.${i}` && prev.phase === 'victory' ? readFight(s, prev) : {};
    const v = { id: rid, seed, level: L, next: i ? counterFor(rid, read) : null }, f = fightSpec(v, i);
    return { key: f.key, seed: f.seed, opts: { ...f.opts, mode: 'home' }, after: (e) => { if (v.next) { rivalArm(s, e, v); e.virus.name += ` + ${COUNTERS[v.next.counter].name}`; } } };
  }
  if (kind === 'invader') {
    const fam = pick(Object.keys(INVADER)), key = INVADER[fam], champ = id === 'champion';
    return { key, seed, opts: { level: L, ...(champ ? { elite: true, eliteHp: CHAMPION.hp, name: `CHAMPION ${FIXTURES[key].name}` } : {}) }, after: (e) => { if (champ) e.virus.champion = true; } };
  }
  warn(s, USAGE);
  return null;
}

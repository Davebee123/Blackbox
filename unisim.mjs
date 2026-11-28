// What each unique is for, measured (docs/unique-roles.md): each one against a yellow (Custom) in its slot, the build's
// gear all yellow. Every subclass on the generic fights, and the subclasses it leans to in its situation (setsim.mjs
// SCENES). d: the change in Integrity a fight costs, in points of max (negative: the unique beats the yellow).
//   node unisim.mjs [ids] [--json]
import { fork } from 'node:child_process';
import { score, at, policyOf, fight } from './balance.mjs';
import { UNIQUES, hooks } from './dist/combat.mjs';
import { SUBS } from './dist/data.mjs';
import { SCENES } from './setsim.mjs';
import { fxList } from './dist/content.mjs';
const ALL = Object.keys(SUBS);
export const subsOf = (u) => (!u.lean ? ALL : SUBS[u.lean] ? [u.lean] : ALL.filter((s) => SUBS[s].cls === u.lean));
export function sceneOf(u) {
  const fx = fxList(u), k = fx.map((f) => `${f.if || ''} ${f.scale || ''} ${f.do}`).join(' ');
  if (fx.some((f) => ['below-half', 'below-25', 'below-20', 'to-below-half'].includes(f.if) || f.scale === 'missing')) return 'low';
  if (/unrested/.test(k)) return 'tired';
  if (/\blate\b|cycles/.test(k)) return 'long';
  if (/room-new/.test(k)) return 'rooms';
  if (/server-held|held/.test(k)) return 'held';
  if (/contracts/.test(k)) return 'contracts';
  if (/crew/.test(k)) return 'crew';
  return null;
}
const avg = (xs) => xs.reduce((a, c) => a + c, 0) / xs.length;
function sceneScore(sub, b, scene, uniques) {
  const sc = SCENES[scene], pol = policyOf(sub), was = hooks.crewAllies;
  if (sc.crew) hooks.crewAllies = (st) => ['a', 'b'].map((who) => ({ who, st }));
  try {
    const rs = sc.fights.map(({ guard, ...f }) => fight(pol, guard || 'random', b, guard ? { sub, uniques, rarity: 'custom', mode: 'run', guard: b.guard, seed: f.seed, before: sc.before } : { sub, uniques, rarity: 'custom', mode: 'run', zone: true, ...f, before: sc.before }));
    return avg(rs.map((r) => Math.min(100, r.lostPct)));
  } finally { hooks.crewAllies = was; }
}
const BASE = {};
const base = (sub, b, scene) => (BASE[`${sub}|${b.level}|${scene || ''}`] ??= scene ? sceneScore(sub, b, scene, []) : score(policyOf(sub), b, { sub, rarity: 'custom' }).lost);
export function measure(id) {
  const u = UNIQUES[id], b = at(u.level), scene = sceneOf(u), subs = subsOf(u), row = { id, level: u.level, scene, subs: u.lean ? subs : 'all', d: {}, niche: {} };
  for (const sub of ALL) row.d[sub] = Math.round((score(policyOf(sub), b, { sub, rarity: 'custom', uniques: [id] }).lost - base(sub, b)) * 10) / 10;
  for (const sub of subs) row.niche[sub] = scene ? Math.round((sceneScore(sub, b, scene, [id]) - base(sub, b, scene)) * 10) / 10 : row.d[sub];
  row.nicheAvg = Math.round(avg(Object.values(row.niche)) * 10) / 10;
  row.allAvg = Math.round(avg(Object.values(row.d)) * 10) / 10;
  return row;
}
const args = process.argv.slice(2), json = args.includes('--json');
let ids = args.find((a) => !a.startsWith('--'))?.split(',');
if (!ids) ids = Object.values(UNIQUES).filter((u) => !u.set && !u.faction).map((u) => u.id);
if (json) { for (const id of ids) console.log(JSON.stringify(measure(id))); }
else {
  const lanes = 4, parts = Array.from({ length: lanes }, (_, i) => ids.filter((_, k) => k % lanes === i));
  const rows = (await Promise.all(parts.map((p) => new Promise((ok) => { const kid = fork(new URL(import.meta.url).pathname, [p.join(','), '--json'], { silent: true }); let out = ''; kid.stdout.on('data', (d) => { out += d; }); kid.stderr.on('data', (d) => process.stderr.write(d)); kid.on('exit', () => ok(out.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)))); })))).flat();
  console.log(JSON.stringify(rows));
}

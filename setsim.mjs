// What each set is for, measured (docs/set-roles.md). Each set worn whole against the blues in its slots, at the top of
// its level band: every subclass on the generic fights (balance.mjs score), and the subclasses it is for in the situation
// it is for (its scene). d is the change in Integrity a fight costs, in points of your max: negative is easier.
//   node setsim.mjs                 every set, the table
//   node setsim.mjs glassceiling    one set (or several, comma-separated)
//   node setsim.mjs --json          the rows as JSON (workers use it)
import { fork } from 'node:child_process';
import { fight, score, at, policyOf } from './balance.mjs';
import { hooks } from './dist/combat.mjs';
import { SETS } from './dist/sets.mjs';
import { UNIQUES } from './dist/combat.mjs';
import { SUBS } from './dist/data.mjs';

export const ALL = Object.keys(SUBS);
// A scene: the fights a set's situation makes, each with what to set once the fight starts.
const once = (f) => (s) => { if (!s.__scene) { s.__scene = true; f(s); } };
const wild = (n, extra = {}) => Array.from({ length: n }, (_, i) => ({ seed: 700 + i, ...extra }));
export const SCENES = {
  low: { fights: wild(12), before: once((s) => { s.run.integrity = Math.round(s.run.max * 0.45); }), text: 'starting at 45% Integrity' },
  tired: { fights: wild(12), before: once((s) => { s.run.integrity = Math.round(s.run.max * 0.65); s.rooms = { ...(s.rooms || {}), at: 'sim', visit: { rested: false, bays: {} }, graph: { rooms: {} } }; }), text: 'unrested, starting at 65% Integrity' },
  long: { fights: wild(8, { elite: true, eliteHp: 5.2 }), text: 'elites (long fights)' },
  guards: { fights: ['watchdog', 'sentinel', 'crawler', 'shredder', 'bouncer', 'tracer'].map((g) => ({ guard: g, seed: 1 })), text: 'guard posts' },
  contracts: { fights: wild(12), before: once((s) => { s.mail = { ...(s.mail || {}), jobs: [1, 2, 3].map((i) => ({ id: 'sim' + i, done: false })) }; }), text: 'holding 3 contracts' },
  rooms: { fights: wild(12), before: once((s) => { s.rooms = { ...(s.rooms || {}), cleared: {}, graph: { rooms: {} } }; s.encounter.rooms ||= { room: 'sim-room' }; }), text: "in a room you haven't cleared" },
  held: { fights: wild(12), before: once((s) => { s.locations = [...(s.locations || []), { id: 'sim', takenOver: 1 }]; }), text: 'on a server you hold' },
  crew: { fights: wild(12), crew: true, text: 'with two crewmates' },
  shields: { fights: [...wild(6, { strain: 'thornwall' }), ...wild(6, { family: 'wiper' })], text: 'parts that shield (Bodyguards, Buffers)' },
};
// The sets: what each is for (shown as the answer line of its tooltip), whom, and in what scene. scene null: the
// generic fights are its situation. subs null: every subclass. combat false: not a fighting set.
export const ROLES = {
  wrecking: { subs: ['demolitionist', 'overclocker'] },
  strongbox: { subs: ['warden', 'sysop'], scene: 'long' },
  palemask: { subs: ['phantom', 'payload'] },
  'load-balanced': { subs: ['herder', 'hijacker'] },
  lowlight: { scene: 'contracts' },
  bootdisk: {},
  hivemind: { subs: ['payload', 'herder'] },
  kestrel: {},
  nightshift: { scene: 'tired' },
  choirbook: { subs: ['hijacker', 'warden'] },
  patchwork: {},
  switchback: { subs: ['warden', 'hijacker'] },
  longhaul: { combat: false },
  lantern: { combat: false },
  glassceiling: { scene: 'low' },
  oncall: { subs: ['sysop'], scene: 'tired' },
  coldstorage: {},
  coldstart: {},
  overtime: { scene: 'long' },
  burstbuffer: { subs: ['overclocker', 'phantom'] },
  fullcoverage: { scene: 'rooms' },
  fineprint: { subs: ['warden', 'sysop'], scene: 'long' },
  crypter: { subs: ['phantom'] },
  contiguous: { subs: ['phantom'] },
  hotspare: { scene: 'low' },
  mesh: { scene: 'crew' },
  bootloader: {},
  domainadmin: { subs: ['herder', 'hijacker'] },
  hiddenprocess: { subs: ['payload'] },
  semaphore: { subs: ['warden', 'hijacker'] },
  watertight: { scene: 'long' },
  tenure: { scene: 'held' },
  catchment: {},
  deeparchive: {},
  smashandgrab: { scene: 'shields' },
  payroll: {},
  backbone: { subs: ['demolitionist'] },
  atoll: {},
  bedrock: { scene: 'low' },
};
const levelOf = (id) => Math.max(...SETS[id].pieces.map((p) => UNIQUES[p].level));
const avg = (xs) => xs.reduce((a, c) => a + c, 0) / xs.length;
function sceneScore(sub, b, scene, uniques) {
  const sc = SCENES[scene], pol = policyOf(sub);
  const was = hooks.crewAllies;
  if (sc.crew) hooks.crewAllies = (st) => ['a', 'b'].map((who) => ({ who, st })); // two crewmates as the crew bonuses count them; they hold your own state
  try {
    const rs = sc.fights.map(({ guard, ...f }) => fight(pol, guard || 'random', b, guard ? { sub, uniques, mode: 'run', guard: b.guard, seed: f.seed, before: sc.before } : { sub, uniques, mode: 'run', zone: true, ...f, before: sc.before }));
    return { lost: avg(rs.map((r) => Math.min(100, r.lostPct))), wins: rs.filter((r) => r.win).length, total: rs.length };
  } finally { hooks.crewAllies = was; }
}
const BASE = {};
const base = (sub, b, scene) => (BASE[`${sub}|${b.level}|${scene || ''}`] ||= scene ? sceneScore(sub, b, scene, []) : score(policyOf(sub), b, { sub }));
export function measure(id) {
  const role = ROLES[id] || {}, L = levelOf(id), b = at(L), uniques = SETS[id].pieces;
  const row = { id, name: SETS[id].name, level: L, subs: role.subs || ALL, scene: role.scene || null, generic: {}, niche: {} };
  if (role.combat === false) return { ...row, combat: false };
  for (const sub of ALL) { const r = score(policyOf(sub), b, { sub, uniques }); row.generic[sub] = Math.round((r.lost - base(sub, b).lost) * 10) / 10; }
  for (const sub of row.subs) {
    const r = role.scene ? sceneScore(sub, b, role.scene, uniques) : null;
    row.niche[sub] = role.scene ? Math.round((r.lost - base(sub, b, role.scene).lost) * 10) / 10 : row.generic[sub];
  }
  const others = ALL.filter((s) => !row.subs.includes(s) || row.subs.length === ALL.length);
  row.nicheAvg = Math.round(avg(Object.values(row.niche)) * 10) / 10;
  row.genericAvg = Math.round(avg(others.map((s) => row.generic[s])) * 10) / 10;
  return row;
}

const run = async () => {
  const args = process.argv.slice(2), json = args.includes('--json');
  const ids = (args.find((a) => !a.startsWith('--')) || Object.keys(ROLES).join(',')).split(',');
  if (json) { for (const id of ids) console.log(JSON.stringify(measure(id))); return; }
  const lanes = 4, parts = Array.from({ length: lanes }, (_, i) => ids.filter((_, k) => k % lanes === i)).filter((x) => x.length);
  const rows = (await Promise.all(parts.map((p) => new Promise((ok) => {
    const kid = fork(new URL(import.meta.url).pathname, [p.join(','), '--json'], { silent: true });
    let out = ''; kid.stdout.on('data', (d) => { out += d; }); kid.stderr.on('data', (d) => process.stderr.write(d));
    kid.on('exit', () => ok(out.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))));
  })))).flat();
  const order = Object.fromEntries(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => order[a.id] - order[b.id]);
  const f = (n) => (n == null ? '   ·' : (n > 0 ? '+' : '') + n.toFixed(1)).padStart(5);
  console.log('set'.padEnd(16), 'Lv', 'scene'.padEnd(9), 'niche', 'rest ', ALL.map((s) => s.slice(0, 5).padStart(5)).join(' '));
  for (const r of rows) {
    if (r.combat === false) { console.log(r.id.padEnd(16), String(r.level).padStart(2), '(not a fighting set)'); continue; }
    console.log(r.id.padEnd(16), String(r.level).padStart(2), (r.scene || 'generic').padEnd(9), f(r.nicheAvg), f(r.genericAvg), ALL.map((s) => f(r.generic[s]) + (r.subs.includes(s) && r.subs.length < ALL.length ? '*' : ' ')).join(''));
  }
};
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) run();

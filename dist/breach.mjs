// A breach: one run through one server on a branching map (docs/roguelite.md, phase 0: "one breach, playable end to
// end"). Pure like the combat engine: state in, events out. It lives on s.breach, which only a playtest campaign
// carries (app.js ?playtest=breach): no save field, no migration.
//
// The run: three acts (Perimeter, Services, Kernel) of four rows each, a gate (a guard) after acts 1 and 2, and the
// Resident (DEADBOLT) at /core. Signal is the run's health and carries from node to node; a defrag heals it. Every
// fight drafts 1 of 3 (drafts.mjs); a subsystem's fight then rewrites it (rewrites.mjs). Beating a gate banks the
// pack. Losing costs the unbanked pack and the drafts; XP and banked gear stay.
//
// Fights are ordinary run fights (combat.mjs selectEncounter, mode 'run'), flagged e.breach: combat.mjs finish hands
// the end back here (hooks.breachEnd), and the mods and CVEs ride hooks.emitted and hooks.extraFx. Between fights
// s.run is null, so gear loads as at home; during one it holds your Signal, as on any run.
import { hooks, emit, warn, active, selectEncounter, command, maxSignal, hackerOf, hackerLevel, classOf, addItem, stashItem, rigOf, attackers } from './combat.mjs';
import { GUARDS, STRAINS, TELL, SUBS, LOADOUT, SUBCLASS, defaultSub, ARCHETYPES } from './data.mjs';
import { seeded, rollItem, itemLabel, protocolSlots, SLOT_KINDS, chaseStat } from './gear.mjs';
import { MODS, CVES, patchMods, unpatchMods, cveFx, onEvent, afterFightCves, rollDraft, DRAFT, cardText } from './drafts.mjs';
import { SUBSYSTEMS, REWRITES } from './rewrites.mjs';

// ---------- the server ----------
export const SERVER_CARD = {
  id: 'mx-14', name: 'MERIDIAN-MX-14', kind: 'Mailhub', author: 'tollgate', family: 'ransomware', resident: 'nb-deadbolt',
  subsystems: [['smtpd', 'sshd'], ['cron', 'ledger'], ['backup', 'kmod']],
  gates: [['watchdog', 'crawler'], ['sentinel', 'shredder']],
  builds: ['extortion', 'bricker'], // TOLLGATE's strains: one wild virus in five, once they're open at its level
};
export const ACTS = [{ name: 'Perimeter', dir: 'perimeter' }, { name: 'Services', dir: 'services' }, { name: 'Kernel', dir: 'kernel' }];
// Tuning. rows × cols per act, paths drawn through it, fog (rows ahead you can read), node weights for rows 2 and 3,
// tokens, a defrag's rest, an elite's size, the level steps (act 2 one over the server, act 3 two, the Resident one).
export const BREACH = {
  rows: 4, cols: 4, paths: 3, fog: 2, infiltratorFog: 3,
  weights: { virus: 40, elite: 15, term: 20, cache: 10, broker: 7, defrag: 8 },
  tokens: { virus: [12, 20], elite: 35, gate: 25, sandbox: 20, cache: [30, 60] },
  rest: 0.3, eliteHp: 1.5, strainShare: 0.15, actLevel: [0, 1, 2], gateLevel: [0, 1], bossLevel: 1,
  baitShare: 0.25, baitCost: 0.12, startTokens: 0, rerolls: 1,
  // A breach is nine or ten fights on one Signal bar with two or three rests: each fight is sized for that, by
  // node kind (its parts' Integrity and its attacks), on top of the run sizes every Signal fight already has.
  size: { virus: { hp: 1, dmg: 0.8 }, elite: { hp: 1, dmg: 0.6 }, gate: { hp: 1, dmg: 1 }, boss: { hp: 1, dmg: 0.85 } },
  // A wild virus brings one tell kind, an elite two (docs/roguelite.md 10.9). Overclock and Lock are the new ones; the
  // family's charge and seal stay in the mix.
  tells: { overclock: 3, lock: 3, charge: 2, seal: 2 },
};
const stepOf = (act, row) => act * (BREACH.rows + 1) + row + 1; // 1..4 an act's rows, 5 its gate; 15 the Resident

// ---------- the map ----------
// Slay the Spire's generator: draw paths from the first row to the last, each step to the same column or a
// neighbour, never crossing another edge. Nodes no path touches are gone; lanes split and merge where paths meet.
function lanes(r) {
  const { rows, cols, paths } = BREACH;
  for (let tries = 0; tries < 60; tries++) {
    const used = new Set(), edges = new Set(), starts = [];
    for (let p = 0; p < paths; p++) {
      let c = Math.floor(r() * cols);
      if (p === 1) while (c === starts[0]) c = Math.floor(r() * cols); // the first two paths start apart
      starts.push(c);
      used.add(`0:${c}`);
      for (let row = 0; row < rows - 1; row++) {
        const crosses = (x) => [...edges].some((k) => { const [rr, a, b] = k.split(/[:>]/).map(Number); return rr === row && ((a < c && b > x) || (a > c && b < x)); });
        const opts = [c - 1, c, c + 1].filter((x) => x >= 0 && x < cols && !crosses(x));
        const x = opts[Math.floor(r() * opts.length)] ?? c;
        edges.add(`${row}:${c}>${x}`); used.add(`${row + 1}:${x}`); c = x;
      }
    }
    const perRow = Array.from({ length: rows }, (_, row) => [...used].filter((k) => k.startsWith(row + ':')).length);
    if (perRow.every((n) => n >= 2)) return { used, edges };
  }
  // Never reached in practice: two straight lanes.
  const used = new Set(), edges = new Set();
  for (let row = 0; row < BREACH.rows; row++) for (const c of [0, 2]) { used.add(`${row}:${c}`); if (row < BREACH.rows - 1) edges.add(`${row}:${c}>${c}`); }
  return { used, edges };
}
function weighted(r, w) {
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (const [k, v] of Object.entries(w)) if ((x -= v) < 0) return k;
  return Object.keys(w)[0];
}
// The subsystem a row runs: rows 1 and 2 the act's two, row 3 one of them (it alternates by act), row 4 none (a rest row).
export const rowSub = (act, row) => { const [a, b] = SERVER_CARD.subsystems[act]; return row === 0 ? a : row === 1 ? b : row === 2 ? (act % 2 ? b : a) : null; };
// What a wild or elite node's virus will be, fixed when the map is made (so scan and the map agree).
function virusOf(r, node, level, elite) {
  const strains = SERVER_CARD.builds.filter((k) => STRAINS[k] && (STRAINS[k].from || 1) <= level);
  const strain = !elite && node.act > 0 && strains.length && r() < BREACH.strainShare ? strains[Math.floor(r() * strains.length)] : null; // past the perimeter
  const fam = SERVER_CARD.family, charge = { ransomware: 'fulldisk', worm: 'massmailer', ghostroot: 'possession' }[fam], seal = { ransomware: 'keyrotation', worm: 'resync', ghostroot: 'godark' }[fam];
  const pool = { ...BREACH.tells };
  if (level < TELL.castFrom) delete pool.overclock; // casts come with SIGINT
  const ids = { overclock: 'overclock', lock: 'lock', charge, seal };
  const tells = [];
  for (let i = 0; i < (elite ? 2 : 1); i++) { const k = weighted(r, pool); tells.push(ids[k]); delete pool[k]; }
  // At most one mutation on a wild virus (its third part is one), two on an elite: an elite may roll a mutation on top.
  return { family: fam, strain, tells, author: tells.includes('overclock') ? 'glassjaw' : SERVER_CARD.author, mutation: elite ? undefined : null };
}
export function generateMap(seed, level = 10) {
  const r = seeded(seed * 31 + 7);
  const nodes = {}, edges = [];
  const add = (n) => { nodes[n.id] = n; return n; };
  let prevExit = null; // the node the next act's first row hangs off (a gate)
  const events = shuffle(r, Object.keys(EVENTS));
  let ev = 0;
  for (let act = 0; act < ACTS.length; act++) {
    const { used, edges: es } = lanes(r);
    const lvl = level + BREACH.actLevel[act];
    const id = (row, c) => `a${act}r${row}c${c}`;
    for (const k of [...used].sort()) {
      const [row, c] = k.split(':').map(Number);
      add({ id: id(row, c), act, row, col: c, step: stepOf(act, row), sub: rowSub(act, row), level: lvl, seed: Math.floor(r() * 2 ** 31), kind: null, path: `/${ACTS[act].dir}/${rowSub(act, row) || 'tmp'}` });
    }
    for (const k of es) { const [row, a, b] = k.split(/[:>]/).map(Number); edges.push([id(row, a), id(row + 1, b)]); }
    // Kinds: row 1 all virus; row 4 all defrag or broker; rows 2 and 3 by weight. No elite in act 1's first two rows,
    // no broker or defrag the row before the rest row (never two in a row on a path).
    const actNodes = Object.values(nodes).filter((n) => n.act === act && n.kind == null);
    for (const n of actNodes) {
      if (n.row === 0) n.kind = 'virus';
      else if (n.row === BREACH.rows - 1) n.kind = r() < 0.5 ? 'defrag' : 'broker';
      else {
        const w = { ...BREACH.weights };
        if (act === 0 && n.row < 2) delete w.elite;
        if (n.row === BREACH.rows - 2) { delete w.broker; delete w.defrag; }
        n.kind = weighted(r, w);
      }
    }
    // At least one elite and one terminal an act, in the rows that allow them.
    const mid = actNodes.filter((n) => n.row > 0 && n.row < BREACH.rows - 1);
    if (!mid.some((n) => n.kind === 'elite')) { const c = mid.filter((n) => !(act === 0 && n.row < 2)).sort((a, b) => b.row - a.row || a.col - b.col)[0]; if (c) c.kind = 'elite'; }
    if (!mid.some((n) => n.kind === 'term')) { const c = mid.find((n) => n.kind !== 'elite'); if (c) c.kind = 'term'; }
    // A rest row of only brokers or only defrags still lets you choose: mix them when there are two or more.
    const rest = actNodes.filter((n) => n.row === BREACH.rows - 1);
    if (rest.length > 1 && rest.every((n) => n.kind === rest[0].kind)) rest[1].kind = rest[0].kind === 'defrag' ? 'broker' : 'defrag';
    for (const n of actNodes) {
      if (['virus', 'elite'].includes(n.kind)) Object.assign(n, virusOf(r, n, lvl, n.kind === 'elite'));
      if (n.kind === 'term') n.event = events[ev++ % events.length];
      if (n.kind === 'cache') { n.bait = r() < BREACH.baitShare; n.tokens = BREACH.tokens.cache[0] + Math.floor(r() * (BREACH.tokens.cache[1] - BREACH.tokens.cache[0] + 1)); }
      if (n.kind === 'broker') n.faction = ['glassjaw', 'halcyon', 'kestrel'][Math.floor(r() * 3)];
    }
    // Wire the act to what came before (all its first row hangs off the last gate) and to its own exit.
    const first = actNodes.filter((n) => n.row === 0), last = actNodes.filter((n) => n.row === BREACH.rows - 1);
    if (prevExit) for (const n of first) edges.push([prevExit, n.id]);
    if (act < ACTS.length - 1) {
      const pair = SERVER_CARD.gates[act], guard = pair[Math.floor(r() * pair.length)];
      const g = add({ id: `gate${act + 1}`, act, row: BREACH.rows, col: null, step: stepOf(act, BREACH.rows), kind: 'gate', guard, level: level + BREACH.gateLevel[act], seed: Math.floor(r() * 2 ** 31), path: `/${ACTS[act].dir}/gate` });
      for (const n of last) edges.push([n.id, g.id]);
      prevExit = g.id;
    } else {
      const core = add({ id: 'core', act, row: BREACH.rows, col: null, step: stepOf(act, BREACH.rows), kind: 'boss', boss: SERVER_CARD.resident, level: level + BREACH.bossLevel, seed: Math.floor(r() * 2 ** 31), path: '/core' });
      for (const n of last) edges.push([n.id, core.id]);
    }
  }
  return { nodes, edges, seed };
}
function shuffle(r, xs) { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const nodeList = (map) => Object.values(map.nodes);
export const nextOf = (map, id) => map.edges.filter(([a]) => a === id).map(([, b]) => map.nodes[b]);
export const firstRow = (map) => nodeList(map).filter((n) => n.step === 1);
// Every path from the first row ends at the Resident (the tests walk them all).
export function allPaths(map) {
  const out = [], walk = (n, path) => { const next = nextOf(map, n.id); if (!next.length) { out.push([...path, n.id]); return; } for (const x of next) walk(x, [...path, n.id]); };
  for (const n of firstRow(map)) walk(n, []);
  return out;
}

// ---------- terminal events ----------
// Four scenes, each a choice with a cost. lines: what the terminal shows. options: [label, what it does].
export const EVENTS = {
  cron: {
    name: 'Half-written cron', file: '/etc/cron.d/tollgate',
    lines: ['# deadbolt maintenance window. do not edit', '*/5 * * * *  root  /opt/gate/hold --signature --cycles 2', '# TODO(ops): enable after the mx-14 audit'],
    options: [
      { label: 'Finish it', text: "Costs 10% of your Signal. {Next}'s signature part attacks 2 cycles later." },
      { label: 'Wipe it', text: 'Grants you 15 tokens.' },
    ],
  },
  keys: {
    name: 'Leaked keys', file: '/home/ops/.ssh/keys.bak',
    lines: ['-----BEGIN OPENSSH PRIVATE KEY-----', 'comment: kestrel-ice-svc   expires: never', '-----END OPENSSH PRIVATE KEY-----'],
    options: [
      { label: 'Use them', text: '{Next} starts with 1 ◆ less on every part, but its attacks repeat a cycle faster.' },
      { label: 'Leave them', text: 'Nothing changes.' },
    ],
  },
  honeytoken: {
    name: 'Honeytoken', file: '/srv/claims/payroll_q3.xlsx',
    lines: ['-rw-r--r--  1 claims claims 4.1M  payroll_q3.xlsx', 'last opened: never   last modified: 3 minutes ago'],
    options: [
      { label: 'Pull it', text: 'Grants you 50 tokens. Costs 15% of your Signal.' },
      { label: 'Leave it', text: 'Nothing changes.' },
    ],
  },
  sandbox: {
    name: 'Sandbox sample', file: '/var/sandbox/samples',
    lines: ['root  6121  0.0  sandbox --cage --hold', 'cage 3: one sample, still running, still writing'],
    options: [
      { label: 'Fight it', text: 'Fights the sample at your current Signal. Its draft has a rare card for sure.' },
      { label: 'Leave it', text: 'Nothing changes.' },
    ],
  },
};
// Brokers: a faction's stall. What it sells, and its price for a Signal patch.
export const BROKERS = {
  glassjaw: { name: 'GLASSJAW', sells: 'Mods and CVEs', stock: ['mod', 'mod', 'cve'], patch: 45 },
  halcyon: { name: 'Halcyon', sells: 'Gear', stock: ['gear', 'gear', 'gear'], patch: 45 },
  kestrel: { name: 'Kestrel', sells: 'CVEs and Signal', stock: ['cve', 'cve', 'gear'], patch: 25 },
};
export const PRICES = { mod: 70, cve: { common: 80, uncommon: 110, rare: 150 }, gear: { stock: 60, tuned: 90, custom: 140 }, patch: 0.25 };

// ---------- the lore at the end ----------
export const CORE_DUMP = {
  title: 'core.dump', from: "recovered from DEADBOLT's process · pid 4471", thread: 'TOLLGATE', n: 1, of: 7,
  lines: [
    '02:14:07  ticket MX-14/0091 opened: "scheduled lock maintenance"',
    '02:14:07  requester: halcyon.claims   approver: (none)',
    '02:16:40  deadbolt v4 installed to /core. key escrow: 2 of 2',
    '02:16:41  escrow 1 -> halcyon.claims',
    '02:16:41  escrow 2 -> tollgate.ops',
    '02:16:44  build note: the lock is not the product. the clock is.',
    '02:16:44  build note: they pay to make it stop, then they pay to make it stop sooner.',
  ],
};

// ---------- your hacker, for a playtest ----------
// A class at a level with a subclass, its talents spent as a player would (balance.mjs build), and a blue protocol in
// every open slot, chasing its subclass's stats.
const fillOrder = (F) => [[F[0][0].id, 3], ['c0'], [F[1][0].id, 3], [F[1][1].id, 1], ['c1'], [F[2][0].id, 3], [F[2][1].id, 2], ['c2'], [F[0][1].id, 3], [F[1][1].id, 2], [F[2][1].id, 1]];
export function outfit(s, { cls = 'breaker', level = 10, sub = null, rarity = 'tuned', gearSeed = 0 } = {}) {
  s.loadout.archetype = ARCHETYPES[cls] ? cls : 'breaker';
  cls = s.loadout.archetype;
  s.hackers = { [cls]: { level, xp: 0 } };
  const pick = level >= SUBCLASS.from ? (SUBS[sub]?.cls === cls ? sub : defaultSub(cls)) : null, key = pick || cls, kit = SUBS[pick];
  if (pick) s.loadout.sub = { [cls]: pick };
  if (kit) {
    let left = level < LOADOUT.talentFrom ? 0 : Math.floor((level - LOADOUT.talentFrom) / LOADOUT.talentEvery) + 1;
    const ranks = {}, picks = [];
    for (const [id, n] of fillOrder(kit.fillers)) {
      if (left <= 0) break;
      if (!n) { picks[+id[1]] = 0; left--; } else { const k = Math.min(n, left); ranks[id] = (ranks[id] || 0) + k; left -= k; }
    }
    s.loadout.picks[key] = picks; s.loadout.ranks[key] = ranks;
  }
  for (let i = 0; i < protocolSlots(level); i++) {
    if (SLOT_KINDS[i] === 'implant' && level < 15) continue;
    const it = addItem(s, rollItem(seeded(level * 100 + i + gearSeed * 7919), { level, rarity, group: SLOT_KINDS[i], stat: chaseStat(kit?.chase, i, rarity) }), 'Issued: ');
    if (it) command(s, 'load ' + it.id);
  }
}

// ---------- the breach ----------
const rnd = (b, salt = 0) => seeded((b.seed * 2654435761 + (++b.rolls) * 40503 + salt) >>> 0);
const sigMax = (s, b) => Math.round(maxSignal(s) * (1 + (b.fx.memory || 0)));
export const signalOf = (s) => (s.run?.breach ? s.run.integrity : s.breach?.signal ?? 0);
export const maxOf = (s) => (s.run?.breach ? s.run.max : s.breach?.max ?? 0);
export const fogOf = (s) => (classOf(s) === 'infiltrator' ? BREACH.infiltratorFog : BREACH.fog);
export function startBreach(s, { seed = 1, level = hackerLevel(s) } = {}) {
  const map = generateMap(seed, level);
  s.breach = {
    v: 1, seed, level, server: SERVER_CARD.id, map, at: null, path: [], cleared: {}, rolls: 0,
    signal: 0, max: 0, tokens: BREACH.startTokens, rerolls: BREACH.rerolls, rareBoost: 0,
    mods: [], cves: [], rewrites: {}, pack: [], banked: [], fx: {}, screen: null, queue: [],
    xp: 0, xpFrom: { level: hackerLevel(s), xp: hackerOf(s).xp }, kills: 0, result: null, log: [],
  };
  const b = s.breach;
  b.max = sigMax(s, b); b.signal = b.max;
  s.run = null;
  unpatchMods();
  say(s, `CONNECTED to ${SERVER_CARD.name}. ${SERVER_CARD.kind}, level ${level}, ${SERVER_CARD.author.toUpperCase()}. Resident: DEADBOLT.`);
  return b;
}
// A line in the breach's terminal (and the game log).
function say(s, text, type = 'breach') {
  const b = s.breach;
  b.log.push(text);
  if (b.log.length > 40) b.log.shift();
  return emit(s, type, text);
}
const deny = (s, text) => { warn(s, text); return null; };
// After a fight: your Signal back on the breach, and s.run off so gear loads between nodes.
export function settle(s) {
  const b = s.breach;
  if (!b || !s.run?.breach || active(s)) return;
  b.signal = Math.max(0, Math.min(s.run.max, s.run.integrity));
  b.max = s.run.max;
  s.run = null;
  if (s.encounter?.breach) s.encounter = null; // the fight is over: a run fight with no run would have no Signal to read
}
export const currentNode = (s) => (s.breach?.at ? s.breach.map.nodes[s.breach.at] : null);
export const currentStep = (s) => currentNode(s)?.step || 0;
// Rows you can read: two ahead of where you stand (three for an Infiltrator). The gate and the Resident always show.
export const visible = (s, n) => !!s.breach && (n.kind === 'gate' || n.kind === 'boss' || n.step <= currentStep(s) + fogOf(s) || !!s.breach.cleared[n.id]);
// Where you can go now.
export function reachable(s) {
  const b = s.breach;
  if (!b || b.result || b.screen || active(s)) return [];
  const step = currentStep(s);
  if (!b.at) return firstRow(b.map);
  if (b.fx.jump) return nodeList(b.map).filter((n) => n.step === step + 1);
  return nextOf(b.map, b.at);
}

// Move to a node and resolve it. opts.pause: a fight starts paused (the browser).
export function go(s, id, opts = {}) {
  const b = s.breach, first = s.serial;
  if (!b) return [];
  settle(s);
  const n = b.map.nodes[id];
  if (b.result) deny(s, 'The breach is over.');
  else if (b.screen) deny(s, 'Finish what is on screen first.');
  else if (!n || !reachable(s).includes(n)) deny(s, n ? `${n.path} is not reachable from here.` : `No node ${id}.`);
  else {
    if (b.fx.jump && b.at && !nextOf(b.map, b.at).includes(n)) { b.fx.jump--; say(s, 'Jump Host: you hop lanes.'); }
    else if (b.fx.jump && b.at) b.fx.jump--;
    b.at = n.id; b.path.push(n.id);
    say(s, `cd ${n.path}`, 'breach-cmd');
    resolve(s, n, opts);
  }
  return s.logs.filter((e) => e.id > first);
}
function resolve(s, n, opts) {
  const b = s.breach;
  if (['virus', 'elite', 'gate', 'boss'].includes(n.kind)) return fight(s, n, opts);
  if (n.kind === 'cache') { b.screen = { kind: 'cache', node: n.id, read: false }; return say(s, `${n.path}: cache.dat, ${n.tokens} tokens' worth, and a protocol.`); }
  if (n.kind === 'defrag') { b.screen = { kind: 'defrag', node: n.id }; return say(s, `${n.path}: a quiet sector. Defrag here.`); }
  if (n.kind === 'broker') { b.screen = { kind: 'broker', node: n.id, faction: n.faction, stock: brokerStock(s, n), half: !!b.fx.halfPrice }; b.fx.halfPrice = false; return say(s, `${n.path}: ${BROKERS[n.faction].name} has a stall open.`); }
  if (n.kind === 'term') { b.screen = { kind: 'term', node: n.id, event: n.event }; return say(s, `${n.path}: ${EVENTS[n.event].file}`); }
}
// The fight a node brings: [key, seed, opts] for selectEncounter.
export function fightOf(s, n) {
  const room = n.path;
  if (n.kind === 'gate') return [n.guard, n.seed, { mode: 'run', room, level: n.level }];
  if (n.kind === 'boss') return ['random', n.seed, { mode: 'run', room, level: n.level, family: SERVER_CARD.family, boss: n.boss, mutation: null, name: 'DEADBOLT', author: SERVER_CARD.author }];
  const v = n.sample || n;
  return ['random', v.seed ?? n.seed, { mode: 'run', room, level: n.level, family: v.family, ...(v.strain ? { strain: v.strain } : {}), ...(v.mutation === null ? { mutation: null } : {}), author: v.author, ...(n.kind === 'elite' ? { elite: true, eliteHp: BREACH.eliteHp } : {}) }];
}
export function fight(s, n, { pause = false, sample = null } = {}) {
  const b = s.breach;
  s.encounter = null;
  b.max = sigMax(s, b);
  b.signal = Math.min(b.signal, b.max);
  s.run = { loc: 'breach', breach: true, cwd: n.path, integrity: b.signal, max: b.max, pack: [], visited: [n.path] };
  patchMods(b.mods);
  const [key, seed, opts] = fightOf(s, sample ? { ...n, kind: 'virus', sample } : n);
  selectEncounter(s, key, seed, { ...opts, quiet: true });
  const e = s.encounter;
  if (!e) return;
  e.breach = n.id;
  if (sample) e.breachSample = true;
  const size = BREACH.size[sample ? 'virus' : n.kind] || BREACH.size.virus;
  for (const p of e.virus.parts) {
    p.max = p.integrity = Math.max(1, Math.round(p.max * size.hp));
    const a = p.attack;
    if (a && ['damage', 'encrypt'].includes(a.effect)) a.amount = Math.max(1, Math.round(a.amount * size.dmg));
    if (a?.hit) a.hit = Math.max(1, Math.round(a.hit * size.dmg));
    if (a?.rampBy) a.rampBy = Math.max(1, Math.round(a.rampBy * size.dmg));
  }
  const tells = (sample || n).tells;
  if (tells && n.kind !== 'gate' && n.kind !== 'boss') e.virus.tellSet = tells;
  // The next gate (or the Resident, after the last one) remembers what you did on the way: a finished cron job, used
  // keys. Spam Cannon thins the act 1 gate.
  if (n.kind === 'gate' || n.kind === 'boss') {
    const g = b.fx.gate || {};
    if (n.kind === 'gate' && n.act === 0 && b.fx.gateHp < 1) for (const p of e.virus.parts) { p.max = p.integrity = Math.max(1, Math.round(p.max * b.fx.gateHp)); }
    if (g.delay) { const p = e.virus.parts.find((x) => x.special && x.attack) || attackers(s)[0]; if (p?.attack) p.attack.due += g.delay; }
    if (g.keys) for (const p of e.virus.parts) { if (p.maxArmor > 0) { p.maxArmor--; p.armor = Math.min(p.armor, p.maxArmor); } if (p.attack && p.attack.interval > 2) p.attack.interval--; }
    b.fx.gate = null;
  }
  if (b.fx.warm) for (const p of attackers(s)) if (p.attack.due < 900) p.attack.due += 1;
  const by = e.virus.author ? ` ${e.virus.author.toUpperCase()}.` : '';
  say(s, `${e.virus.name} holds ${n.path}. Level ${e.virus.level}.${by}`, 'intrusion');
  command(s, 'engage');
  if (pause && s.encounter) s.encounter.paused = true;
}

// The end of a breach fight (combat.mjs finish, through hooks.breachEnd): the draft, the rewrite, the pack.
function fightOver(s, result) {
  const b = s.breach, e = s.encounter, n = b?.map.nodes[e?.breach];
  if (!b || !n) return;
  if (result !== 'victory') return lose(s, `${e.virus.name} took your Signal to 0 at ${n.path}.`);
  b.kills++;
  const healed = afterFightCves(s, e);
  if (healed) emit(s, 'heal', `Sasser restores ${healed} Signal.`, { amount: healed });
  const r = rnd(b, 11);
  const draftArgs = { act: n.act, level: n.level, count: draftCount(b) };
  if (e.breachSample) { tokens(s, BREACH.tokens.sandbox); queue(s, { kind: 'draft', title: 'Sandbox sample', draft: 'rare', cards: rollDraft(s, r, 'rare', draftArgs) }); return next(s); }
  b.cleared[n.id] = true;
  if (n.kind === 'virus' || n.kind === 'elite') {
    tokens(s, n.kind === 'elite' ? BREACH.tokens.elite : BREACH.tokens.virus[0] + Math.floor(r() * (BREACH.tokens.virus[1] - BREACH.tokens.virus[0] + 1)));
    queue(s, { kind: 'draft', title: n.kind === 'elite' ? 'Elite draft' : 'Draft', draft: n.kind, cards: rollDraft(s, r, n.kind, draftArgs) });
    if (n.sub) rewriteFor(s, n);
  } else if (n.kind === 'gate') {
    tokens(s, BREACH.tokens.gate);
    queue(s, { kind: 'draft', title: `${GUARDS[n.guard].name} down`, draft: 'gate', cards: rollDraft(s, r, 'gate', { ...draftArgs, count: DRAFT.cards + (b.cves.includes('poodle') ? 1 : 0) }), noSkip: true });
    queue(s, { kind: 'gate', node: n.id });
  } else if (n.kind === 'boss') {
    // The Resident's loot table: three rolls into the pack (blue or better), then 1 of 3 gear.
    for (let i = 0; i < 3; i++) { const it = addItem(s, rollItem(r, { level: n.level, rarity: r() < 0.3 ? 'custom' : 'tuned' }), 'DEADBOLT drops '); if (it) b.pack.push(it.id); }
    queue(s, { kind: 'draft', title: 'DEADBOLT down', draft: 'boss', cards: rollDraft(s, r, 'boss', draftArgs), noSkip: true });
    queue(s, { kind: 'capture' });
  }
  next(s);
}
hooks.breachEnd = (s, result) => fightOver(s, result);
hooks.emitted = (s, ev) => {
  const b = s.breach;
  if (!b || b.result || hooks.emitted.busy) return;
  hooks.emitted.busy = true;
  try {
    if (ev.type === 'xp' && ev.amount > 0) b.xp += ev.amount;
    if (s.encounter?.breach) onEvent(s, ev);
  } finally { hooks.emitted.busy = false; }
};
hooks.extraFx = (s) => cveFx(s);

const draftCount = (b) => DRAFT.cards + (b.fx.kernelHook ? 1 : 0) + (b.cves.includes('poodle') ? 1 : 0);
function tokens(s, n) { s.breach.tokens += n; say(s, `+${n} tokens (${s.breach.tokens}).`, 'breach-good'); }
function queue(s, screen) { s.breach.queue.push(screen); }
// The next screen in the queue, or the map.
function next(s) {
  const b = s.breach;
  b.screen = b.queue.shift() || null;
  if (b.screen?.kind === 'capture') return capture(s);
  return b.screen;
}
// A subsystem's fight is won: pick its rewrite (tier II from an elite), or, cleared before, it goes to tier II.
function rewriteFor(s, n) {
  const b = s.breach, held = b.rewrites[n.sub];
  const tier = n.kind === 'elite' ? 2 : 1;
  if (held) {
    if (held.tier < 2) { held.tier = 2; say(s, `${n.sub} cleared again: ${REWRITES[held.id].name} goes to tier II.`, 'breach-good'); }
    return;
  }
  queue(s, { kind: 'rewrite', sub: n.sub, tier, options: SUBSYSTEMS[n.sub].rewrites });
}

// ---------- choices ----------
// One entry point for the screen's buttons, the terminal and the bot: act(s, verb, arg). Events out.
export function act(s, verb, arg = null) {
  const b = s.breach, first = s.serial;
  if (!b) return [];
  settle(s);
  const sc = b.screen;
  const out = () => s.logs.filter((e) => e.id > first);
  if (verb === 'go') return go(s, arg);
  if (verb === 'equip') { const it = stashItem(s, arg); if (it && b.pack.concat(b.banked).includes(it.id)) command(s, 'load ' + it.id); else deny(s, 'Equip what? Pick something from your pack.'); return out(); }
  if (b.result) { deny(s, 'The breach is over.'); return out(); }
  if (!sc) { deny(s, 'Nothing to choose. Pick a node on the map.'); return out(); }
  if (sc.kind === 'draft') {
    if (verb === 'pick') { const c = sc.cards[Number(arg)]; if (!c) deny(s, 'No such card.'); else { take(s, c); next(s); } }
    else if (verb === 'skip' && !sc.noSkip) { say(s, 'Draft skipped.'); tokens(s, DRAFT.skip); next(s); }
    else if (verb === 'reroll' && b.rerolls > 0) { b.rerolls--; const n = b.map.nodes[b.at]; sc.cards = rollDraft(s, rnd(b, 17), sc.draft, { act: n?.act ?? 0, level: n?.level ?? b.level, count: sc.cards.length }); say(s, `Draft rerolled. ${b.rerolls} ${b.rerolls === 1 ? 'reroll' : 'rerolls'} left.`); }
    else deny(s, verb === 'reroll' ? 'No rerolls left.' : 'Pick a card.');
  } else if (sc.kind === 'rewrite') {
    const id = sc.options[Number(arg)];
    if (verb !== 'pick' || !id) deny(s, 'Pick a rewrite.');
    else {
      const r = REWRITES[id];
      b.rewrites[sc.sub] = { id, tier: sc.tier };
      say(s, `${sc.sub} rewritten: ${r.name}${sc.tier > 1 ? ' II' : ''}. Now: ${r.now}`, 'breach-good');
      const more = r.apply(b, s); // Forged Keys, Archive: a draft of CVEs or mods, next
      const n = b.map.nodes[b.at];
      if (more) b.queue.unshift({ kind: 'draft', title: r.name, draft: more, cards: rollDraft(s, rnd(b, 23), more, { act: n?.act ?? 0, level: n?.level ?? b.level }) });
      next(s);
    }
  } else if (sc.kind === 'cache') {
    const n = b.map.nodes[sc.node];
    if (verb === 'cat') { sc.read = true; say(s, n.bait ? 'cat cache.dat: a canary string in every block. Pulling it trips the alarm.' : 'cat cache.dat: clean. Tokens, and a protocol.', n.bait ? 'breach-bad' : 'breach'); }
    else if (verb === 'pull') {
      if (n.bait) { const lost = Math.round(b.max * BREACH.baitCost); b.signal = Math.max(1, b.signal - lost); say(s, `The cache was bait. The canary trips and costs you ${lost} Signal.`, 'breach-bad'); }
      else { tokens(s, n.tokens); const it = addItem(s, rollItem(rnd(b, 5), { level: n.level, rarity: rnd(b, 6)() < 0.35 ? 'tuned' : 'stock' }), 'Pulled: '); if (it) { b.pack.push(it.id); say(s, `${itemLabel(it)} goes in your pack.`, 'breach-good'); } }
      b.cleared[n.id] = true; next(s);
    } else if (verb === 'leave') { b.cleared[n.id] = true; say(s, 'You leave the cache alone.'); next(s); }
    else deny(s, 'cat, pull or leave.');
  } else if (sc.kind === 'defrag') {
    if (verb === 'rest') { const n = Math.min(b.max - b.signal, Math.round(b.max * BREACH.rest)); b.signal += n; say(s, `Defrag: +${n} Signal (${b.signal}/${b.max}).`, 'breach-good'); b.cleared[sc.node] = true; next(s); }
    else if (verb === 'reslot') { sc.reslot = true; say(s, 'Re-slot: change your keys, then close it. Mods stay on their skills.'); }
    else if (verb === 'done' && sc.reslot) { b.cleared[sc.node] = true; say(s, 'Keys set.'); next(s); }
    else if (verb === 'slot' && sc.reslot) { command(s, String(arg)); }
    else deny(s, 'rest or reslot.');
  } else if (sc.kind === 'broker') {
    const price = (x) => Math.round(x * (sc.half ? 0.5 : 1));
    if (verb === 'buy') {
      const c = sc.stock[Number(arg)];
      if (!c || c.sold) deny(s, 'Sold, or not on the stall.');
      else if (b.tokens < price(c.price)) deny(s, `That costs ${price(c.price)} tokens. You have ${b.tokens}.`);
      else { b.tokens -= price(c.price); c.sold = true; say(s, `Bought for ${price(c.price)} tokens.`); take(s, c); }
    } else if (verb === 'patch') {
      const cost = price(BROKERS[sc.faction].patch);
      if (sc.patched) deny(s, 'One patch a stall.');
      else if (b.tokens < cost) deny(s, `A patch costs ${cost} tokens. You have ${b.tokens}.`);
      else { b.tokens -= cost; sc.patched = true; const n = Math.min(b.max - b.signal, Math.round(b.max * PRICES.patch)); b.signal += n; say(s, `Patched: +${n} Signal (${b.signal}/${b.max}).`, 'breach-good'); }
    } else if (verb === 'leave') { b.cleared[sc.node] = true; say(s, 'You close the stall.'); next(s); }
    else deny(s, 'buy, patch or leave.');
  } else if (sc.kind === 'term') {
    const i = Number(arg);
    if (verb !== 'choose' || !EVENTS[sc.event].options[i]) deny(s, 'Choose an option.');
    else termChoose(s, sc, i);
  } else if (sc.kind === 'gate') {
    if (verb === 'goon') { bank(s); say(s, 'You go deeper.'); next(s); }
    else if (verb === 'jackout') { bank(s); b.result = 'out'; b.screen = { kind: 'result' }; unpatchMods(); say(s, `JACKED OUT of ${SERVER_CARD.name}. Your pack is banked. The server stays uncaptured.`, 'jacked-out'); }
    else deny(s, 'Go on, or jack out.');
  }
  return out();
}
// A card you drafted or bought: a mod on its skill, a CVE, or gear in your pack.
function take(s, c) {
  const b = s.breach, t = cardText(c);
  if (c.kind === 'mod') { b.mods = b.mods.filter((id) => MODS[id].skill !== MODS[c.id].skill).concat(c.id); say(s, `Mod: ${t.name} on ${t.kicker.split(' · ')[1]}.`, 'breach-good'); }
  else if (c.kind === 'cve') { if (!b.cves.includes(c.id)) b.cves.push(c.id); say(s, `CVE: ${t.name}.`, 'breach-good'); }
  else { const it = addItem(s, c.item, 'Drafted: '); if (it) { b.pack.push(it.id); say(s, `${itemLabel(it)} goes in your pack. Equip it from there.`, 'breach-good'); } }
}
function bank(s) {
  const b = s.breach;
  if (b.pack.length) say(s, `Pack banked: ${b.pack.length} ${b.pack.length === 1 ? 'item' : 'items'}.`, 'breach-good');
  b.banked.push(...b.pack); b.pack = [];
}
function termChoose(s, sc, i) {
  const b = s.breach, n = b.map.nodes[sc.node], cost = (k) => { const lost = Math.round(b.max * k); b.signal = Math.max(1, b.signal - lost); return lost; };
  const done = () => { b.cleared[n.id] = true; next(s); };
  const ev = sc.event;
  if (ev === 'cron' && i === 0) { const lost = cost(0.1); (b.fx.gate ||= {}).delay = 2; say(s, `You finish the job. It costs you ${lost} Signal, and ${nextGuard(n).toLowerCase()}'s signature part will attack 2 cycles late.`, 'breach-good'); }
  else if (ev === 'cron') { tokens(s, 15); say(s, 'You wipe the job.'); }
  else if (ev === 'keys' && i === 0) { (b.fx.gate ||= {}).keys = true; say(s, `You load the keys. ${nextGuard(n)} will open thinner, and angrier.`, 'breach-good'); }
  else if (ev === 'honeytoken' && i === 0) { const lost = cost(0.15); tokens(s, 50); say(s, `The file was a honeytoken. Tracing it back costs you ${lost} Signal.`, 'breach-bad'); }
  else if (ev === 'sandbox' && i === 0) {
    // The sample: a wild virus at this act's level, one of the new tells, and a rare card in its draft.
    const r = rnd(b, 29);
    const sample = { ...virusOf(r, n, n.level, false), seed: Math.floor(r() * 2 ** 31) };
    b.cleared[n.id] = true; b.screen = null;
    say(s, 'You open the cage.');
    return fight(s, n, { sample, pause: !!sc.pause });
  } else say(s, 'You leave it.');
  done();
}
// Who a terminal's gate effects reach: the next gate, or the Resident after the last one.
export const nextGuard = (n) => (n.act < ACTS.length - 1 ? 'The next gate' : 'The Resident');
export const eventText = (n, text) => text.replace('{Next}', nextGuard(n));
function brokerStock(s, n) {
  const b = s.breach, r = rnd(b, 41), out = [];
  for (const kind of BROKERS[n.faction].stock) {
    const cards = rollDraft(s, r, kind === 'gear' ? 'gate' : kind === 'mod' ? 'mod' : 'cve', { act: n.act, level: n.level, count: 1 });
    const c = cards.find((x) => !out.some((y) => y.id && y.id === x.id)) || (kind !== 'gear' ? rollDraft(s, r, 'gate', { act: n.act, level: n.level, count: 1 })[0] : null);
    if (!c) continue;
    c.price = c.kind === 'mod' ? PRICES.mod : c.kind === 'cve' ? PRICES.cve[CVES[c.id].rarity] : PRICES.gear[c.rarity] || 90;
    out.push(c);
  }
  return out;
}

// ---------- the end ----------
function lose(s, why) {
  const b = s.breach;
  b.result = 'lost';
  const lost = [];
  for (const id of b.pack) { const it = stashItem(s, id); if (it) { lost.push(itemLabel(it)); for (const r of Object.values(s.gear?.rigs || {})) if (Array.isArray(r)) for (let i = 0; i < r.length; i++) if (r[i] === id) r[i] = null; s.stash = s.stash.filter((x) => x.id !== id); } }
  b.lost = { why, items: lost, mods: [...b.mods], cves: [...b.cves] };
  b.pack = []; b.mods = []; b.cves = []; b.tokens = 0; b.queue = [];
  b.screen = { kind: 'result' };
  unpatchMods();
  say(s, `SIGNAL LOST. ${why} ${lost.length ? `${lost.length} unbanked ${lost.length === 1 ? 'item' : 'items'} lost, with your drafts.` : 'Your drafts are gone.'} XP and banked gear stay.`, 'breach-bad');
}
function capture(s) {
  const b = s.breach;
  bank(s);
  b.result = 'won';
  b.screen = { kind: 'result' };
  unpatchMods();
  say(s, `${SERVER_CARD.name} captured. /core lists one more file: core.dump.`, 'breach-good');
  return b.screen;
}
// The capture card's numbers.
export function captureOf(s) {
  const b = s.breach;
  return {
    rewrites: Object.entries(SUBSYSTEMS).map(([sub]) => ({ sub, held: b.rewrites[sub] || null })),
    xp: b.xp, items: b.banked.map((id) => stashItem(s, id)).filter(Boolean), kills: b.kills, dump: CORE_DUMP,
  };
}

// ---------- the terminal ----------
// ls, cd, tree, and the screen's verbs typed: a breach is still a terminal.
export function breachCommand(s, text) {
  const b = s.breach, first = s.serial;
  const [word, ...rest] = text.trim().toLowerCase().split(/\s+/);
  const arg = rest.join(' ');
  const out = () => s.logs.filter((e) => e.id > first);
  if (word === 'ls') {
    const xs = reachable(s);
    say(s, xs.length ? xs.map((n, i) => `${i + 1}  ${(n.kind === 'gate' ? 'gate' : n.kind === 'boss' ? 'core' : n.sub || 'tmp')}/  [${n.kind === 'term' ? 'term' : n.kind}]`).join('\n') : b.screen ? 'Finish what is on screen first.' : 'Nowhere to go.', 'breach-out');
    return out();
  }
  if (word === 'cd' || word === 'go') {
    const xs = reachable(s), n = /^\d+$/.test(arg) ? xs[Number(arg) - 1] : xs.find((x) => x.id === arg) || xs.find((x) => (x.sub || x.kind) === arg.replace(/\/$/, ''));
    return n ? go(s, n.id) : (deny(s, `cd: ${arg || '?'}: not reachable. Type ls.`), out());
  }
  if (word === 'tree') { say(s, treeLines(s).join('\n'), 'breach-out'); return out(); }
  if (word === 'pick' || word === 'buy' || word === 'choose') return act(s, word, Number(arg) - 1);
  if (['skip', 'reroll', 'cat', 'pull', 'leave', 'rest', 'reslot', 'done', 'patch', 'goon'].includes(word)) return act(s, word);
  if (word === 'jack' && arg === 'out') return act(s, 'jackout');
  return null; // not a breach word: the caller passes it on
}
// The ASCII map: what you can read of it.
export function treeLines(s) {
  const b = s.breach, lines = [`/ ${SERVER_CARD.name}`];
  for (let act = 0; act < ACTS.length; act++) {
    lines.push(`├─ ${ACTS[act].dir}/`);
    for (let row = 0; row <= BREACH.rows; row++) {
      const ns = nodeList(b.map).filter((n) => n.act === act && n.row === row).sort((x, y) => (x.col ?? 0) - (y.col ?? 0));
      if (!ns.length) continue;
      const cells = ns.map((n) => (b.at === n.id ? '@' : b.cleared[n.id] ? 'x' : visible(s, n) ? MARK[n.kind] : '?'));
      lines.push(`│  ${(row === BREACH.rows ? (act === ACTS.length - 1 ? 'core' : 'gate') : rowSub(act, row) || 'tmp').padEnd(7)} ${cells.join('  ')}`);
    }
  }
  return lines;
}
export const MARK = { virus: 'v', elite: 'E', cache: '$', defrag: '+', broker: 'b', term: '>', gate: 'G', boss: 'R' };

// ---------- the bot (breachsim.mjs) ----------
// How a player walks the map: take fights while Signal is high, rest when it's low, take cards that fit.
export function botRoute(s) {
  const b = s.breach, xs = reachable(s);
  if (!xs.length) return null;
  const sig = b.signal / b.max;
  const score = (n) => {
    const look = [n, ...nextOf(b.map, n.id)];
    let v = 0;
    for (const x of look) {
      const k = x === n ? 1 : 0.4;
      if (x.kind === 'defrag') v += k * (sig < 0.6 ? 6 : 1);
      if (x.kind === 'broker') v += k * (b.tokens >= 80 ? 3 : sig < 0.5 && b.tokens >= 25 ? 2 : 0.5);
      if (x.kind === 'virus') v += k * (sig > 0.45 ? 2.5 : -1);
      if (x.kind === 'elite') v += k * (sig > 0.8 ? 3 : -4);
      if (x.kind === 'cache') v += k * 2;
      if (x.kind === 'term') v += k * 1.5;
    }
    return v;
  };
  return xs.map((n) => ({ n, v: score(n) })).sort((a, c) => c.v - a.v)[0].n.id;
}
// What to take: CVEs and mods first, gear when it's better than what's loaded (rarity, as the balance bot does).
export function botPick(s) {
  const b = s.breach, sc = b.screen;
  if (!sc) return null;
  const rank = { custom: 3, tuned: 2, stock: 1 };
  if (sc.kind === 'draft') {
    const v = (c) => (c.kind === 'cve' ? 10 + rank[c.rarity] : c.kind === 'mod' ? 9 : gearGain(s, c.item));
    const best = sc.cards.map((c, i) => ({ i, v: v(c) })).sort((a, c) => c.v - a.v)[0];
    return best ? ['pick', best.i] : ['skip'];
  }
  if (sc.kind === 'rewrite') { const pref = ['restorepoint', 'memorymap', 'kernelhook', 'warmstart', 'forgedkeys', 'spamcannon', 'slushfund', 'maildrop', 'jumphost', 'nightlybuild', 'pricefix', 'archive']; const i = sc.options.map((id, k) => [k, pref.indexOf(id)]).sort((a, c) => a[1] - c[1])[0][0]; return ['pick', i]; }
  if (sc.kind === 'cache') return sc.read ? [b.map.nodes[sc.node].bait ? 'leave' : 'pull'] : ['cat'];
  if (sc.kind === 'defrag') return ['rest'];
  if (sc.kind === 'broker') {
    if (!sc.patched && b.signal < b.max * 0.6 && b.tokens >= Math.round(BROKERS[sc.faction].patch * (sc.half ? 0.5 : 1))) return ['patch'];
    const i = sc.stock.findIndex((c) => !c.sold && c.kind !== 'gear' && b.tokens >= Math.round(c.price * (sc.half ? 0.5 : 1)));
    return i >= 0 ? ['buy', i] : ['leave'];
  }
  if (sc.kind === 'term') { const ev = sc.event; return ['choose', ev === 'cron' ? (b.signal > b.max * 0.6 ? 0 : 1) : ev === 'keys' ? 0 : ev === 'honeytoken' ? (b.signal > b.max * 0.7 ? 0 : 1) : (b.signal > b.max * 0.7 ? 0 : 1)]; }
  if (sc.kind === 'gate') return ['goon'];
  return null;
}
// What a protocol adds over the one in its slot, roughly: a bigger rarity, or a higher level.
function gearGain(s, it) {
  const rank = { custom: 3, tuned: 2, stock: 1 };
  const slot = SLOT_KINDS.indexOf(it.group), on = slot >= 0 ? stashItem(s, rigOf(s)[slot]) : null;
  return on ? (rank[it.rarity] - rank[on.rarity]) * 3 + (it.level - on.level) : 5;
}

// A breach: one run through one server on a branching map (docs/roguelite.md, phase 0: "one breach, playable end to
// end"). Pure like the combat engine: state in, events out. It lives on s.breach, which only a playtest campaign
// carries (app.js ?playtest=breach): no save field, no migration.
//
// The run: three acts (Perimeter, Services, Kernel) of four rows each, a gate (a guard) after acts 1 and 2, and the
// Resident (DEADBOLT) at /core. A campaign server (campaign.mjs) brings its own card: fewer acts or rows early on,
// its own Resident, subsystems and gates. Signal is the run's health and carries from node to node; a defrag heals it. Every
// fight drafts 1 of 3 (drafts.mjs), of the kind its node showed ahead (n.reward); a subsystem's fight then rewrites it
// (rewrites.mjs). Beating a gate banks the pack. Losing costs the unbanked pack and the drafts; XP and banked gear stay.
// Phase 3 (docs/roguelite.md 9.3): every wild and elite node rolls its genome (genomeOfNode, applyMutations), a breach
// has a heat (heat.mjs), a defrag recompiles mods, brokers have services, and the bots draft by policy (POLICIES).
//
// Fights are ordinary run fights (combat.mjs selectEncounter, mode 'run'), flagged e.breach: combat.mjs finish hands
// the end back here (hooks.breachEnd), and the mods and CVEs ride hooks.emitted and hooks.extraFx. Between fights
// s.run is null, so gear loads as at home; during one it holds your Signal, as on any run.
import { hooks, emit, warn, active, selectEncounter, command, maxSignal, hackerOf, hackerLevel, classOf, addItem, stashItem, rigOf, attackers, gainXp, part, alive, livingParts, equippedSkills } from './combat.mjs';
import { GUARDS, STRAINS, TELL, SUBS, LOADOUT, SUBCLASS, defaultSub, ARCHETYPES, BOSSES, FAMILIES, TELL_SETS, stemOf } from './data.mjs';
import { seeded, rollItem, itemLabel, protocolSlots, SLOT_KINDS, chaseStat } from './gear.mjs';
import { MODS, CVES, patchMods, unpatchMods, cveFx, onEvent, afterCommand, afterFightCves, rollDraft, DRAFT, cardText, modPool, modName, buildTags, linksOf, cvePool, cardDef } from './drafts.mjs';
import { SUBSYSTEMS, REWRITES } from './rewrites.mjs';
import { GENES, rollGenome, partGenes } from './genes.mjs';
import { AUTHORS } from './authors.mjs';
import { decoded } from './genome.mjs';
import { heatRules } from './heat.mjs';

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
  baitShare: 0.25, baitCost: 0.12, startTokens: 0, rerolls: 1, cacheGear: 0.3, // a cache is tokens; one in three holds a protocol too
  // A breach is nine or ten fights on one Signal bar with two or three rests: each fight is sized for that, by
  // node kind (its parts' Integrity and its attacks), on top of the run sizes every Signal fight already has.
  size: { virus: { hp: 1, dmg: 0.8 }, elite: { hp: 1, dmg: 0.6 }, gate: { hp: 1, dmg: 1 }, boss: { hp: 1, dmg: 0.85 } },
  // A wild virus brings one tell kind, an elite two (docs/roguelite.md 10.9). Overclock and Lock are the new ones; the
  // family's charge and seal stay in the mix.
  tells: { overclock: 3, lock: 3, charge: 2, seal: 2 },
  lockFrom: 5, // Lock waits until your bar has a cooldown worth feeding it
  // Rolled genomes (docs/genome.md 5, genes.mjs rollGenome): every wild and elite virus rolls its genes from its
  // author's toolkit within the budget. geneBonus: budget points on top (Testbed adds its own). Off: the phase 0 roll.
  genomes: true, geneBonus: -2,
  // Heat 1, Loud: a breach is ten fights on one Signal bar, so its loud is a step, not the old run's cliff (HOT_RUN).
  loud: { hp: 1.15, dmg: 1.1 },
};
// Server kinds lean the map (docs/roguelite.md 2.2): a Mirror one more terminal a row, an Archive caches twice as often.
export const KIND_WEIGHTS = { Mirror: { term: 30 }, Archive: { cache: 20 } };
const stepOf = (act, row, rows = BREACH.rows) => act * (rows + 1) + row + 1; // 1..4 an act's rows, 5 its gate; 15 the Resident
// A card's shape: its acts (one per pair of subsystems) and the rows in each.
export const actsOf = (card = SERVER_CARD) => card.subsystems.length;
export const rowsOf = (card = SERVER_CARD) => card.rows || BREACH.rows;
export const cardOf = (s) => s?.breach?.card || SERVER_CARD;
// The Resident's name as the card gives it (a generic boss can be renamed: VAULT WARDEN is BOSSES.resident).
export const residentName = (card = SERVER_CARD) => card.residentName || BOSSES[card.resident]?.name || 'the Resident';

// ---------- the map ----------
// Slay the Spire's generator: draw paths from the first row to the last, each step to the same column or a
// neighbour, never crossing another edge. Nodes no path touches are gone; lanes split and merge where paths meet.
function lanes(r, rows = BREACH.rows) {
  const { cols, paths } = BREACH;
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
  for (let row = 0; row < rows; row++) for (const c of [0, 2]) { used.add(`${row}:${c}`); if (row < rows - 1) edges.add(`${row}:${c}>${c}`); }
  return { used, edges };
}
function weighted(r, w) {
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (const [k, v] of Object.entries(w)) if ((x -= v) < 0) return k;
  return Object.keys(w)[0];
}
// The subsystem a row runs: rows 1 and 2 the act's two, row 3 one of them (it alternates by act), the last row none (a
// rest row). A three-row act (SPRAWL-00) runs its two, then rests.
export const rowSub = (act, row, card = SERVER_CARD) => { const [a, b] = card.subsystems[act], rows = rowsOf(card); return row >= rows - 1 ? null : row === 0 ? a : row === 1 ? b : row === 2 ? (act % 2 ? b : a) : null; };
// What a wild or elite node's virus will be, fixed when the map is made (so scan and the map agree).
function virusOf(r, node, level, elite, card = SERVER_CARD, gen = {}) {
  const strains = (card.builds || []).filter((k) => STRAINS[k] && (STRAINS[k].from || 1) <= level);
  const strain = !elite && node.act > 0 && strains.length && r() < BREACH.strainShare ? strains[Math.floor(r() * strains.length)] : null; // past the perimeter
  const fam = card.family, charge = { ransomware: 'fulldisk', worm: 'massmailer', ghostroot: 'possession' }[fam], seal = { ransomware: 'keyrotation', worm: 'resync', ghostroot: 'godark' }[fam];
  const pool = { ...BREACH.tells };
  if (level < TELL.castFrom) delete pool.overclock; // casts come with SIGINT
  if (level < BREACH.lockFrom) delete pool.lock; // Lock asks for a cooldown to feed it: not while your bar is two keys
  const ids = { overclock: 'overclock', lock: 'lock', charge, seal };
  const tells = [];
  for (let i = 0; i < (elite ? 2 : 1); i++) { const k = weighted(r, pool); tells.push(ids[k]); delete pool[k]; }
  const author = tells.includes('overclock') ? 'glassjaw' : card.author;
  if (!BREACH.genomes) return { family: fam, strain, tells, author, mutation: elite ? undefined : null };
  return { family: fam, strain, tells, author, ...genomeOfNode(r, level, fam, author, elite, !!strain, gen) };
}
// A node's genome (genes.mjs rollGenome): its third part (a part gene, or none) and its mutations, at most one on a wild
// virus and two on an elite. A named build keeps its own parts and rolls only mutations. gen: { bonus, known } from
// what your network runs (Testbed, Sinkhole).
export function genomeOfNode(r, level, family, author, elite = false, strain = false, gen = {}) {
  const A = AUTHORS[author] || {}, body = FAMILIES[family]?.parts || [];
  const core = body.filter((p) => p.pool !== 'third').flatMap((p) => partGenes(p));
  let genes = rollGenome({ rand: r, level, family, core, signature: A.signature || [], toolkit: A.toolkit || [], elite, bonus: BREACH.geneBonus + (gen.bonus || 0), known: gen.known || null });
  if (strain) genes = genes.filter((id) => GENES[id].mutation);
  return { third: genes.find((id) => GENES[id].parts) || null, muts: genes.filter((id) => GENES[id].mutation), genes };
}
// opts: heat (Rotation adds an elite an act), gen (genome options: Testbed, Sinkhole).
export function generateMap(seed, level = 10, card = SERVER_CARD, { heat = 0, gen = {} } = {}) {
  const r = seeded(seed * 31 + 7);
  const rules = heatRules(heat);
  const acts = actsOf(card), rows = rowsOf(card), w0 = { ...BREACH.weights, ...(KIND_WEIGHTS[card.kind] || {}) };
  const nodes = {}, edges = [];
  const add = (n) => { nodes[n.id] = n; return n; };
  let prevExit = null; // the node the next act's first row hangs off (a gate)
  const events = shuffle(r, Object.keys(EVENTS));
  let ev = 0;
  for (let act = 0; act < acts; act++) {
    const { used, edges: es } = lanes(r, rows);
    const lvl = level + BREACH.actLevel[act];
    const id = (row, c) => `a${act}r${row}c${c}`;
    for (const k of [...used].sort()) {
      const [row, c] = k.split(':').map(Number);
      add({ id: id(row, c), act, row, col: c, step: stepOf(act, row, rows), sub: rowSub(act, row, card), level: lvl, seed: Math.floor(r() * 2 ** 31), kind: null, path: `/${ACTS[act].dir}/${rowSub(act, row, card) || 'tmp'}` });
    }
    for (const k of es) { const [row, a, b] = k.split(/[:>]/).map(Number); edges.push([id(row, a), id(row + 1, b)]); }
    // Kinds: row 1 all virus; row 4 all defrag or broker; rows 2 and 3 by weight. No elite in act 1's first two rows,
    // no broker or defrag the row before the rest row (never two in a row on a path).
    const actNodes = Object.values(nodes).filter((n) => n.act === act && n.kind == null);
    for (const n of actNodes) {
      if (n.row === 0) n.kind = 'virus';
      else if (n.row === rows - 1) n.kind = r() < 0.5 ? 'defrag' : 'broker';
      else {
        const w = { ...w0 };
        if (act === 0 && n.row < 2) delete w.elite;
        if (n.row === rows - 2) { delete w.broker; delete w.defrag; }
        n.kind = weighted(r, w);
      }
    }
    // At least one elite and one terminal an act, in the rows that allow them.
    const mid = actNodes.filter((n) => n.row > 0 && n.row < rows - 1);
    if (!mid.some((n) => n.kind === 'elite')) { const c = mid.filter((n) => !(act === 0 && n.row < 2)).sort((a, b) => b.row - a.row || a.col - b.col)[0]; if (c) c.kind = 'elite'; }
    if (!mid.some((n) => n.kind === 'term')) { const c = mid.find((n) => n.kind !== 'elite'); if (c) c.kind = 'term'; }
    // Heat 3, Rotation: one more elite an act, on a virus node where elites may stand.
    if (rules.moreElites) { const c = mid.filter((n) => n.kind === 'virus' && !(act === 0 && n.row < 2)).sort((a, b) => b.row - a.row || b.col - a.col)[0]; if (c) c.kind = 'elite'; }
    // A rest row of only brokers or only defrags still lets you choose: mix them when there are two or more.
    const rest = actNodes.filter((n) => n.row === rows - 1);
    if (rest.length > 1 && rest.every((n) => n.kind === rest[0].kind)) rest[1].kind = rest[0].kind === 'defrag' ? 'broker' : 'defrag';
    for (const n of actNodes) {
      if (['virus', 'elite'].includes(n.kind)) Object.assign(n, virusOf(r, n, lvl, n.kind === 'elite', card, gen));
      if (n.kind === 'term') n.event = events[ev++ % events.length];
      if (n.kind === 'cache') { n.bait = r() < BREACH.baitShare; n.tokens = BREACH.tokens.cache[0] + Math.floor(r() * (BREACH.tokens.cache[1] - BREACH.tokens.cache[0] + 1)); n.gear = r() < BREACH.cacheGear; }
      if (n.kind === 'broker') n.faction = BROKER_IDS[Math.floor(r() * BROKER_IDS.length)];
    }
    // What each fight's draft offers, shown ahead (docs/roguelite.md 4.1): a mod, a CVE or gear. An elite's is CVEs.
    // Some fights past the perimeter promise a rare card too. Every act shows each kind at least once.
    const fights = actNodes.filter((n) => n.kind === 'virus' || n.kind === 'elite');
    for (const n of fights) { n.reward = n.kind === 'elite' ? 'cve' : weighted(r, DRAFT.reward); n.rare = act > 0 && r() < DRAFT.rareNode; }
    for (const k of ['mod', 'cve', 'gear']) if (!fights.some((n) => n.reward === k)) { const c = fights.filter((n) => n.kind === 'virus' && fights.filter((x) => x.reward === n.reward).length > 1)[0]; if (c) c.reward = k; }
    // Wire the act to what came before (all its first row hangs off the last gate) and to its own exit.
    const first = actNodes.filter((n) => n.row === 0), last = actNodes.filter((n) => n.row === rows - 1);
    if (prevExit) for (const n of first) edges.push([prevExit, n.id]);
    if (act < acts - 1) {
      const pair = card.gates[act], guard = pair[Math.floor(r() * pair.length)];
      const g = add({ id: `gate${act + 1}`, act, row: rows, col: null, step: stepOf(act, rows, rows), kind: 'gate', guard, level: level + BREACH.gateLevel[act], seed: Math.floor(r() * 2 ** 31), path: `/${ACTS[act].dir}/gate` });
      for (const n of last) edges.push([n.id, g.id]);
      prevExit = g.id;
    } else {
      const core = add({ id: 'core', act, row: rows, col: null, step: stepOf(act, rows, rows), kind: 'boss', boss: card.resident, level: level + BREACH.bossLevel, seed: Math.floor(r() * 2 ** 31), path: '/core' });
      for (const n of last) edges.push([n.id, core.id]);
    }
  }
  return { nodes, edges, seed, acts, rows };
}
function shuffle(r, xs) { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const nodeList = (map) => Object.values(map.nodes);
export const nextOf = (map, id) => map.edges.filter(([a]) => a === id).map(([, b]) => map.nodes[b]);
export const firstRow = (map) => nodeList(map).filter((n) => n.step === 1);
// Every path from the first row ends at the Resident (the tests walk them all).
// A Range replay (rewrites.mjs Range): the Resident alone at /core.
export function replayMap(seed, level, card = SERVER_CARD) {
  const r = seeded(seed * 31 + 7);
  const core = { id: 'core', act: 0, row: 0, col: null, step: 1, kind: 'boss', boss: card.resident, level: level + BREACH.bossLevel, seed: Math.floor(r() * 2 ** 31), path: '/core' };
  return { nodes: { core }, edges: [], seed, acts: 1, rows: 0, replay: true };
}
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
    lines: ['# resident maintenance window. do not edit', '*/5 * * * *  root  /opt/gate/hold --signature --cycles 2', '# TODO(ops): enable after the audit'],
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
// Brokers: a faction's stall (docs/roguelite.md 2.5). What it sells, its price for a Signal patch, and its own service.
// A stall's mods and CVEs lean to your build: each is the best fit of a few the stall could stock, so a broker is
// where you go looking for the card a combo is missing.
export const BROKERS = {
  glassjaw: { name: 'GLASSJAW', sells: 'Mods and CVEs', stock: ['mod', 'mod', 'cve'], patch: 45, service: { id: 'reroll', name: 'Reroll', price: 25, text: 'Grants you 1 draft reroll.' } },
  halcyon: { name: 'Halcyon', sells: 'Gear', stock: ['gear', 'gear', 'gear'], patch: 45 },
  kestrel: { name: 'Kestrel', sells: 'CVEs and Signal', stock: ['cve', 'cve', 'gear'], patch: 25 },
  nullchoir: { name: 'NULL CHOIR', sells: 'Mods, and recompiles them', stock: ['mod', 'mod', 'mod'], patch: 45, service: { id: 'recompile', name: 'Recompile', price: 60, text: 'Recompiles one of your mods to its + version.' } },
  lantern: { name: 'LANTERN', sells: 'CVEs, and maps', stock: ['cve', 'cve', 'mod'], patch: 45, service: { id: 'reveal', name: 'Map', price: 30, text: 'Shows every node of the act ahead, past the fog.' } },
};
const BROKER_IDS = Object.keys(BROKERS);
export const PRICES = { mod: { common: 55, uncommon: 70, rare: 95 }, cve: { common: 80, uncommon: 110, rare: 150 }, gear: { stock: 60, tuned: 90, custom: 140 }, patch: 0.25 };

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
// A subclass from level 10 and the talent points a level has, spent as a player would (the campaign bot calls it as it
// levels too). Returns the subclass's kit, or null below level 10.
export function spendTalents(s, { cls = classOf(s), level = hackerLevel(s), sub = null } = {}) {
  const pick = level >= SUBCLASS.from ? (SUBS[sub]?.cls === cls ? sub : SUBS[s.loadout.sub?.[cls]]?.cls === cls ? s.loadout.sub[cls] : defaultSub(cls)) : null, key = pick || cls, kit = SUBS[pick];
  if (pick) s.loadout.sub = { ...(s.loadout.sub || {}), [cls]: pick };
  if (kit) {
    let left = level < LOADOUT.talentFrom ? 0 : Math.floor((level - LOADOUT.talentFrom) / LOADOUT.talentEvery) + 1;
    const ranks = {}, picks = [];
    for (const [id, n] of fillOrder(kit.fillers)) {
      if (left <= 0) break;
      if (!n) { picks[+id[1]] = 0; left--; } else { const k = Math.min(n, left); ranks[id] = (ranks[id] || 0) + k; left -= k; }
    }
    s.loadout.picks[key] = picks; s.loadout.ranks[key] = ranks;
  }
  return kit || null;
}
export function outfit(s, { cls = 'breaker', level = 10, sub = null, rarity = 'tuned', gearSeed = 0 } = {}) {
  s.loadout.archetype = ARCHETYPES[cls] ? cls : 'breaker';
  cls = s.loadout.archetype;
  s.hackers = { [cls]: { level, xp: 0 } };
  const kit = spendTalents(s, { cls, level, sub });
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
// Rows you read ahead: two (an Infiltrator three), one fewer at heat 6, and Zone Transfer's on top (never past 2 at
// heat 6).
export const fogOf = (s) => {
  const b = s?.breach, inf = classOf(s) === 'infiltrator' ? 1 : 0;
  if (b?.rules?.fog) return Math.min(2, b.rules.fog + inf + (b.fx?.zone || 0));
  return (inf ? BREACH.infiltratorFog : BREACH.fog) + (b?.fx?.zone || 0);
};
// opts (a campaign breach, campaign.mjs; the playtest passes none of them):
//   card      the server: its name, kind, author, family, Resident, subsystems an act, gates, strains, rows
//   outputs   { rewriteId: tier } the rewrites your captured servers run for you (each once, at its best tier)
//   from      gates already beaten (a retry from a checkpoint): you start past the last one, with keep's rewrites
//   prior     the rewrites the server runs now (re-imaging: each subsystem you clear keeps it or changes it)
//   pool      { cves } the CVEs the draft can offer (the unlock pool); bounty: the one you took; lastMods: Archive's
//   xp        what each kill's XP is worth here (the campaign pays more than the playtest's flat guard XP)
//   heat      the breach's heat (heat.mjs): each rank adds a modifier and pays for it
//   replay    a Range replay: the Resident alone (campaign.mjs)
export function startBreach(s, { seed = 1, level = hackerLevel(s), card = SERVER_CARD, outputs = {}, from = 0, keep = {}, prior = null, pool = null, bounty = null, lastMods = [], xp = 1, heat = 0, replay = false } = {}) {
  const rules = heatRules(heat);
  // What your network does to the roll of this server's viruses: Testbed (linked) adds a point, Sinkhole (linked) keeps
  // them to genes you've decoded.
  const gen = { bonus: (outputs.testbed ? 1 : 0) - (outputs.sinkhole > 1 ? 1 : 0), known: outputs.sinkhole ? new Set(Object.keys(GENES).filter((id) => decoded(s, id))) : null };
  const map = replay ? replayMap(seed, level, card) : generateMap(seed, level, card, { heat, gen });
  s.breach = {
    v: 2, seed, level, server: card.id, map, at: null, path: [], cleared: {}, rolls: 0, heat: rules.heat, rules,
    signal: 0, max: 0, tokens: BREACH.startTokens, rerolls: rules.audit ? 0 : BREACH.rerolls, rareBoost: 0,
    mods: [], plus: [], cves: [], rewrites: {}, pack: [], banked: [], fx: { rareOdds: rules.rare, gearLevel: rules.itemLevel }, screen: null, queue: [],
    xp: 0, xpFrom: { level: hackerLevel(s), xp: hackerOf(s).xp }, kills: 0, result: null, log: [], gen: { bonus: gen.bonus, sinkhole: !!gen.known },
  };
  const b = s.breach;
  if (card !== SERVER_CARD) {
    Object.assign(b, { card, outputs: { ...outputs }, prior, pool, bounty, xpMult: xp * rules.xp, from, stats: { rests: 0, landed: 0, elites: 0, skips: 0, low: 1 } });
    applyOutputs(s, b, outputs, lastMods);
  }
  b.max = sigMax(s, b); b.signal = b.max;
  s.run = null;
  unpatchMods();
  say(s, `CONNECTED to ${card.name}. ${card.kind}, level ${level}, ${card.author.toUpperCase()}.${rules.heat ? ` Heat ${rules.heat}.` : ''} Resident: ${residentName(card)}.`);
  // A retry from a checkpoint: you stand on the last gate you beat, with the rewrites from the acts behind it.
  if (from > 0 && map.nodes[`gate${from}`]) {
    for (let k = 1; k <= from; k++) { const g = `gate${k}`; if (map.nodes[g]) { b.cleared[g] = true; b.path.push(g); } }
    b.at = `gate${from}`;
    for (const [sub, held] of Object.entries(keep || {})) b.rewrites[sub] = { ...held };
    say(s, `Checkpoint: you pick up past ${GUARDS[map.nodes[b.at].guard].name}, act ${from + 1}.`, 'breach-good');
  }
  if (b.queue.length && !b.screen) next(s);
  return b;
}
// What your captured servers do on this breach (rewrites.mjs output, docs/roguelite.md 3.2). Each rewrite once, at
// its best tier; the campaign works out which ones reach this server (Spam Cannon only from a linked server).
function applyOutputs(s, b, out, lastMods) {
  const t = (id) => out[id] || 0;
  if (t('slushfund')) b.tokens += t('slushfund') > 1 ? 80 : 40;
  if (t('memorymap')) b.fx.memory = t('memorymap') > 1 ? 0.15 : 0.1;
  if (t('kernelhook')) { b.fx.kernelHook = true; if (t('kernelhook') > 1) b.fx.gateHook = true; }
  if (t('warmstart')) { b.fx.warm = true; if (t('warmstart') > 1) b.fx.warmSigint = true; }
  if (t('nightlybuild')) { b.fx.nightly = t('nightlybuild'); b.rerolls += t('nightlybuild'); }
  if (t('pricefix')) b.fx.discount = t('pricefix') > 1 ? 0.4 : 0.25;
  if (t('restorepoint')) b.fx.restore = t('restorepoint') > 1 ? 0.4 : 0.25;
  if (t('spamcannon')) b.fx.thin = t('spamcannon') > 1 ? 0.25 : 0.15;
  if (t('maildrop')) b.fx.maildrop = t('maildrop');
  if (t('zonetransfer')) b.fx.zone = t('zonetransfer');
  if (t('audittrail')) b.fx.audit = true;
  if (t('serviceaccount')) b.fx.service = t('serviceaccount');
  if (t('listeningpost')) b.fx.listen = t('listeningpost') > 1 ? 2 : 1.5;
  if (t('testbed')) b.fx.gearLevel += t('testbed') > 1 ? 3 : 2;
  if (t('audittrail') > 1) b.fx.audit = 2;
  // Forged Keys: a CVE pick before the first node. Archive: one of the mods you ended your last breach with.
  if (t('forgedkeys')) b.queue.push({ kind: 'draft', title: 'Forged Keys', draft: 'cve', cards: rollDraft(s, rnd(b, 61), 'cve', { act: 0, level: b.level, boost: t('forgedkeys') > 1 ? 20 : 0 }), noSkip: false });
  if (t('archive')) {
    const bar = modPool(s), mods = (lastMods || []).filter((id) => bar.includes(id));
    if (mods.length) b.queue.push({ kind: 'draft', title: 'Archive', draft: 'mod', cards: mods.slice(0, 3).map((id) => ({ kind: 'mod', id, rarity: 'tuned' })), picks: t('archive') > 1 ? 2 : 1 });
  }
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
// Zone Transfer's Now and LANTERN's map reveal a whole act (b.fx.reveal).
export const visible = (s, n) => !!s.breach && (n.kind === 'gate' || n.kind === 'boss' || n.step <= currentStep(s) + fogOf(s) || !!s.breach.cleared[n.id] || !!s.breach.fx.reveal?.includes(n.act));
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
  if (n.kind === 'cache') { b.screen = { kind: 'cache', node: n.id, read: false }; return say(s, `${n.path}: cache.dat, ${n.tokens} tokens' worth${n.gear ? ', and a protocol' : ''}.`); }
  if (n.kind === 'defrag') { b.screen = { kind: 'defrag', node: n.id }; return say(s, `${n.path}: a quiet sector. Defrag here.`); }
  if (n.kind === 'broker') { b.screen = { kind: 'broker', node: n.id, faction: n.faction, stock: brokerStock(s, n), half: !!b.fx.halfPrice }; b.fx.halfPrice = false; return say(s, `${n.path}: ${BROKERS[n.faction].name} has a stall open.`); }
  if (n.kind === 'term') { b.screen = { kind: 'term', node: n.id, event: n.event }; return say(s, `${n.path}: ${EVENTS[n.event].file}`); }
}
// The fight a node brings: [key, seed, opts] for selectEncounter.
export function fightOf(s, n) {
  const room = n.path;
  if (n.kind === 'gate') return [n.guard, n.seed, { mode: 'run', room, level: n.level }];
  const card = cardOf(s);
  if (n.kind === 'boss') return ['random', n.seed, { mode: 'run', room, level: n.level, family: BOSSES[n.boss]?.family || card.family, boss: n.boss, mutation: null, name: residentName(card).toUpperCase(), author: card.author, ...(card.bossHp ? { bossHp: card.bossHp } : {}) }];
  const v = n.sample || n;
  // A rolled genome (genomeOfNode): its third part forced through createVirus's genes, no mutation there (breach.mjs
  // lays the rolled ones on parts after, applyMutations).
  const genome = v.genes ? { genes: v.third ? [v.third] : [], mutation: null } : (v.mutation === null ? { mutation: null } : {});
  return ['random', v.seed ?? n.seed, { mode: 'run', room, level: n.level, family: v.family, ...(v.strain ? { strain: v.strain } : {}), ...genome, author: v.author, ...(n.kind === 'elite' ? { elite: true, eliteHp: BREACH.eliteHp } : {}) }];
}
export function fight(s, n, { pause = false, sample = null } = {}) {
  const b = s.breach;
  s.encounter = null;
  b.max = sigMax(s, b);
  b.signal = Math.min(b.signal, b.max);
  s.run = { loc: 'breach', breach: true, cwd: n.path, integrity: b.signal, max: b.max, pack: [], visited: [n.path] };
  patchMods(b.mods, b.plus);
  const [key, seed, opts] = fightOf(s, sample ? { ...n, kind: 'virus', sample } : n);
  selectEncounter(s, key, seed, { ...opts, quiet: true });
  const e = s.encounter;
  if (!e) return;
  e.breach = n.id;
  if (sample) e.breachSample = true;
  const base = BREACH.size[sample ? 'virus' : n.kind] || BREACH.size.virus, more = b.card?.size || {};
  const loud = b.rules?.loud ? BREACH.loud : { hp: 1, dmg: 1 }; // heat 1: every fight bigger and harder
  const size = { hp: base.hp * (more.hp || 1) * loud.hp, dmg: base.dmg * (more.dmg || 1) * loud.dmg }; // a campaign card's own sizing on top
  for (const p of e.virus.parts) {
    p.max = p.integrity = Math.max(1, Math.round(p.max * size.hp));
    const a = p.attack;
    if (a && ['damage', 'encrypt'].includes(a.effect)) a.amount = Math.max(1, Math.round(a.amount * size.dmg));
    if (a?.hit) a.hit = Math.max(1, Math.round(a.hit * size.dmg));
    if (a?.rampBy) a.rampBy = Math.max(1, Math.round(a.rampBy * size.dmg));
  }
  const tells = (sample || n).tells;
  if (tells && n.kind !== 'gate' && n.kind !== 'boss') e.virus.tellSet = tells;
  // The rolled genome: its third part is marked (Stuxnet reads it), and its mutations go on parts.
  const g = sample || n;
  if (g.genes) applyMutations(s, e.virus, g, g.seed ?? n.seed);
  // Heat 2: gates bring one more tell (Lock). Heat 8: the Resident is bigger and re-arms at 80%.
  if (n.kind === 'gate' && b.rules?.gateTell) { e.virus.tellSet = [...(TELL_SETS[e.virus.family] || []), 'lock']; e.virus.extraTells = 1; }
  if (n.kind === 'boss' && b.rules?.resident) { for (const p of e.virus.parts) p.max = p.integrity = Math.round(p.max * 1.25); e.virus.phases = [{ at: 0.8, do: ['rearm'], say: `${e.virus.name} re-arms every part.`, done: false }, ...(e.virus.phases || [])]; }
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
  if (b.fx.warmSigint && e.readyAt) delete e.readyAt.sigint;
  // Spam Cannon on a linked server: every fight here starts thinner.
  if (b.fx.thin) for (const p of e.virus.parts) p.max = p.integrity = Math.max(1, Math.round(p.max * (1 - b.fx.thin)));
  // A campaign kill pays its own XP (campaign.mjs CAMPAIGN.xp): the Resident three times over, a gate half again.
  if (b.xpMult) e.breachXp = b.xpMult * (n.kind === 'boss' ? 3 : n.kind === 'gate' ? 1.5 : 1);
  const by = e.virus.author ? ` ${e.virus.author.toUpperCase()}.` : '';
  say(s, `${e.virus.name} holds ${n.path}. Level ${e.virus.level}.${by}`, 'intrusion');
  command(s, 'engage');
  if (pause && s.encounter) s.encounter.paused = true;
}

// Sinkhole's Now: the act's fights you haven't reached roll again, from the genes you've decoded.
function sinkholeNow(s, act) {
  const b = s.breach, known = new Set(Object.keys(GENES).filter((id) => decoded(s, id)));
  for (const n of nodeList(b.map).filter((x) => x.act === act && !b.cleared[x.id] && x.id !== b.at && x.genes)) Object.assign(n, genomeOfNode(seeded(n.seed ^ 0x51ab), n.level, n.family, n.author, n.kind === 'elite', !!n.strain, { known, bonus: b.gen?.bonus || 0 }));
  b.gen = { ...(b.gen || {}), sinkhole: true };
}
// A rolled genome on a built virus (docs/genome.md 5, the designer's rules): the third part carries its gene (p.rolled),
// and each mutation lives on a part, never the third where another will do, so breaking that part ends the rule
// (mutationEnds). Armored puts 1 ◆ on every part, Hasty brings every attack a cycle sooner and repeats it a cycle
// faster for 10% of every part's Integrity; Regenerative and Adaptive work while their part lives (combat.mjs mutated).
export function applyMutations(s, v, g, seed = 1) {
  const ps = v.parts.filter((p) => p.kind !== 'fragment');
  const third = g.third && ps.find((p) => partGenes(p).includes(g.third));
  if (third) third.rolled = true;
  v.mutations = [];
  let k = (Math.imul((seed >>> 0) ^ 0x5bd1e995, 2654435761) >>> 0);
  for (const id of g.muts || []) {
    const free = ps.filter((p) => p !== third && !p.carries?.length), from = free.length ? free : ps.filter((p) => !p.carries?.length).length ? ps.filter((p) => !p.carries?.length) : ps;
    const p = from[k % from.length]; k = Math.imul(k ^ 0x9e3779b9, 2246822519) >>> 0;
    (p.carries ||= []).push(id);
    v.mutations.push({ id, part: p.id });
    if (id === 'armored') for (const q of ps) { q.maxArmor = (q.maxArmor || 0) + 1; q.armor = (q.armor || 0) + 1; }
    if (id === 'hasty') for (const q of ps) { q.max = q.integrity = Math.max(1, Math.round(q.max * 0.9)); if (q.attack?.interval) { q.hasty = true; q.attack.interval = Math.max(2, q.attack.interval - 1); } if (q.attack && q.attack.due < 900) q.attack.due = Math.max(2, q.attack.due - 1); }
    if (!v.genes.some((x) => x.id === id)) v.genes.push({ id, src: 'rolled', part: p.id });
  }
  // Its name: the adjective of its costliest rolled gene, as createVirus names a wild one.
  if (!v.strain && v.mutations.length) { const was = stemOf(v.family, v.genes.filter((x) => !g.muts.includes(x.id))), now = stemOf(v.family, v.genes); if (was !== now) v.name = v.name.replace(was, now); }
}
// A part broke: the mutations it carried end.
function mutationEnds(s, p) {
  const v = s.encounter?.virus;
  if (!v?.mutations?.length || !p?.carries?.length) return;
  for (const id of p.carries) {
    if (id === 'armored') for (const q of livingParts(s)) { if (q.maxArmor > 0) { q.maxArmor--; q.armor = Math.min(q.armor, q.maxArmor); } }
    if (id === 'hasty') for (const q of livingParts(s)) if (q.hasty && q.attack) { q.hasty = false; q.attack.interval += 1; }
    emit(s, 'status', `The ${p.name} carried ${GENES[id]?.name || id}. The rule ends with it.`, { target: p.id });
  }
}

// The end of a breach fight (combat.mjs finish, through hooks.breachEnd): the draft, the rewrite, the pack.
function fightOver(s, result) {
  const b = s.breach, e = s.encounter, n = b?.map.nodes[e?.breach];
  if (!b || !n) return;
  if (b.stats) { b.stats.landed += Object.values(e.metrics?.tells || {}).reduce((k, x) => k + x.landed, 0); if (n.kind === 'elite' && result === 'victory') b.stats.elites++; }
  if (result !== 'victory') return lose(s, `${e.virus.name} took your Signal to 0 at ${n.path}.`);
  b.kills++;
  if (b.stats) b.stats.low = Math.min(b.stats.low, (s.run?.integrity ?? b.signal) / Math.max(1, s.run?.max ?? b.max));
  const [healed, paid] = afterFightCves(s, e);
  if (healed) emit(s, 'heal', `Sasser restores ${healed} Signal.`, { amount: healed });
  if (paid) tokens(s, paid);
  const r = rnd(b, 11);
  const draftArgs = { act: n.act, level: n.level, count: draftCount(b) };
  b.fx.nextMore = false; // Range's Now: one draft only
  if (e.breachSample) { tokens(s, BREACH.tokens.sandbox); queue(s, { kind: 'draft', title: 'Sandbox sample', draft: 'rare', cards: rollDraft(s, r, 'rare', draftArgs) }); return next(s); }
  b.cleared[n.id] = true;
  if (n.kind === 'virus' || n.kind === 'elite') {
    tokens(s, n.kind === 'elite' ? BREACH.tokens.elite : BREACH.tokens.virus[0] + Math.floor(r() * (BREACH.tokens.virus[1] - BREACH.tokens.virus[0] + 1)));
    // An elite pays a reroll too: an earned lever.
    if (n.kind === 'elite') { b.rerolls++; say(s, `+1 reroll (${b.rerolls}).`, 'breach-good'); if (b.fx.service > 1) bank(s); }
    // The draft keeps the node's promise: its reward kind, a rare card when it showed one. Listening Post's Now: the
    // next elite offers a card more.
    const kind = n.kind === 'elite' ? 'elite' : n.reward || 'virus', more = n.kind === 'elite' && b.fx.eliteMore ? 1 : 0;
    if (more) b.fx.eliteMore = false;
    queue(s, { kind: 'draft', title: n.kind === 'elite' ? 'Elite draft' : 'Draft', draft: kind, rare: !!n.rare, cards: rollDraft(s, r, kind, { ...draftArgs, count: draftArgs.count + more, rare: !!n.rare }) });
    if (n.sub) rewriteFor(s, n);
  } else if (n.kind === 'gate') {
    tokens(s, BREACH.tokens.gate);
    queue(s, { kind: 'draft', title: `${GUARDS[n.guard].name} down`, draft: 'gate', cards: rollDraft(s, r, 'gate', { ...draftArgs, count: DRAFT.cards + (b.cves.includes('poodle') ? 1 : 0) + (b.fx.gateHook ? 1 : 0) - (b.rules?.shortList ? 1 : 0) }), noSkip: true });
    queue(s, { kind: 'gate', node: n.id });
    if (b.fx.nightly) { b.rerolls += b.fx.nightly; say(s, `Nightly Build: +${b.fx.nightly} ${b.fx.nightly === 1 ? 'reroll' : 'rerolls'} for the next act.`, 'breach-good'); }
    breachHooks.gate?.(s, n); // a checkpoint (campaign.mjs)
  } else if (n.kind === 'boss') {
    // The Resident is a breach's gear moment: 1 of 3 gear, blue or better (its uniques roll on their own, combat.mjs
    // bossUnique). Mail Drop (a captured smtpd) adds a card to it, and a rare one at tier II.
    const who = residentName(cardOf(s)), mail = b.fx.maildrop || 0;
    queue(s, { kind: 'draft', title: `${who} down`, draft: 'boss', rare: mail > 1, cards: rollDraft(s, r, 'boss', { ...draftArgs, count: DRAFT.cards + (mail ? 1 : 0) + (b.cves.includes('poodle') ? 1 : 0) - (b.rules?.shortList ? 1 : 0), rare: mail > 1 }), noSkip: true });
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
    if (s.encounter?.breach && ev.type === 'broken' && !ev.c2) mutationEnds(s, part(s, ev.target));
    if (s.encounter?.breach) onEvent(s, ev);
  } finally { hooks.emitted.busy = false; }
};
hooks.commanded = (s, x) => { if (s.breach && !s.breach.result && s.encounter?.breach) afterCommand(s, x); };
hooks.extraFx = (s) => cveFx(s);
// Restore Point (a captured backup subsystem): once a breach, a blow that would take your Signal to 0 leaves you at 1
// and restores a share of it (combat.mjs survive, after Bastion's Uptime). Returns the damage dealt, or null.
hooks.lastBlow = (s, d) => {
  const b = s.breach, e = s.encounter;
  if (!b?.fx?.restore || b.fx.restored || !e?.breach) return null;
  b.fx.restored = true;
  const add = Math.round(d.max * b.fx.restore);
  emit(s, 'heal', `Restore Point holds you at 1 and restores ${add} Signal.`, { amount: add });
  d.integrity += add;
  return Math.max(0, d.integrity - 1 - add);
};
// What the campaign (campaign.mjs) listens for: a gate beaten (a checkpoint) and a breach that ended.
export const breachHooks = { gate: null, over: null };

const draftCount = (b) => DRAFT.cards + (b.fx.kernelHook ? 1 : 0) + (b.cves.includes('poodle') ? 1 : 0) - (b.rules?.shortList ? 1 : 0) + (b.fx.nextMore ? 1 : 0);
// A broker's price: half from Price Fix's Now, less again from its output.
export const priceOf = (b, sc, x) => Math.round(x * (sc.half ? 0.5 : 1) * (1 - (b.fx.discount || 0)));
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
  const was = b.prior?.[n.sub]; // re-imaging: what the server runs there now
  queue(s, { kind: 'rewrite', sub: n.sub, tier, options: SUBSYSTEMS[n.sub].rewrites, ...(was ? { was: { ...was } } : {}) });
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
    if (verb === 'pick') {
      const c = sc.cards[Number(arg)];
      if (!c) deny(s, 'No such card.');
      else if (sc.picks > 1) { take(s, c); sc.picks--; sc.cards.splice(Number(arg), 1); if (!sc.cards.length) next(s); } // Archive II: two picks
      else { take(s, c); next(s); }
    }
    else if (verb === 'skip' && !sc.noSkip) { say(s, 'Draft skipped.'); if (b.stats) b.stats.skips++; if (!b.rules?.audit) tokens(s, DRAFT.skip); next(s); }
    else if (verb === 'reroll' && b.rerolls > 0) { b.rerolls--; const n = b.map.nodes[b.at]; sc.cards = rollDraft(s, rnd(b, 17), sc.draft, { act: n?.act ?? 0, level: n?.level ?? b.level, count: sc.cards.length, rare: !!sc.rare }); say(s, `Draft rerolled. ${b.rerolls} ${b.rerolls === 1 ? 'reroll' : 'rerolls'} left.`); }
    else deny(s, verb === 'reroll' ? 'No rerolls left.' : 'Pick a card.');
  } else if (sc.kind === 'rewrite') {
    const id = sc.options[Number(arg)];
    if (verb !== 'pick' || !id) deny(s, 'Pick a rewrite.');
    else {
      const r = REWRITES[id], tier = sc.was?.id === id ? Math.max(sc.was.tier, sc.tier) : sc.tier; // re-imaging keeps the better tier
      b.rewrites[sc.sub] = { id, tier };
      say(s, `${sc.sub} rewritten: ${r.name}${tier > 1 ? ' II' : ''}. Now: ${r.now}`, 'breach-good');
      const more = r.apply(b, s); // Forged Keys, Archive: a draft of CVEs or mods, next. Sinkhole: the act re-rolls.
      const n = b.map.nodes[b.at];
      if (more === 'sinkhole') sinkholeNow(s, n?.act ?? 0);
      else if (more) b.queue.unshift({ kind: 'draft', title: r.name, draft: more, cards: rollDraft(s, rnd(b, 23), more, { act: n?.act ?? 0, level: n?.level ?? b.level }) });
      next(s);
    }
  } else if (sc.kind === 'cache') {
    const n = b.map.nodes[sc.node];
    if (verb === 'cat') { sc.read = true; say(s, n.bait ? 'cat cache.dat: a canary string in every block. Pulling it trips the alarm.' : `cat cache.dat: clean. Tokens${n.gear ? ', and a protocol' : ''}.`, n.bait ? 'breach-bad' : 'breach'); }
    else if (verb === 'pull') {
      if (n.bait) { const lost = Math.round(b.max * BREACH.baitCost); b.signal = Math.max(1, b.signal - lost); say(s, `The cache was bait. The canary trips and costs you ${lost} Signal.`, 'breach-bad'); }
      else { tokens(s, n.tokens); const it = n.gear && addItem(s, rollItem(rnd(b, 5), { level: n.level + (b.fx.gearLevel || 0), rarity: rnd(b, 6)() < 0.35 ? 'tuned' : 'stock' }), 'Pulled: '); if (it) { b.pack.push(it.id); say(s, `${itemLabel(it)} goes in your pack.`, 'breach-good'); } }
      b.cleared[n.id] = true; next(s);
    } else if (verb === 'leave') { b.cleared[n.id] = true; say(s, 'You leave the cache alone.'); next(s); }
    else deny(s, 'cat, pull or leave.');
  } else if (sc.kind === 'defrag') {
    // Rest, recompile (a mod to its + version) or re-slot. Zerologon: rest and recompile both. Service Account (a
    // captured sshd): jack out here with your pack.
    const zero = b.cves.includes('zerologon'), done = () => { b.cleared[sc.node] = true; next(s); };
    const rest = () => { const n = Math.min(b.max - b.signal, Math.round(b.max * restShare(b))); b.signal += n; if (b.stats) b.stats.rests++; sc.rested = true; say(s, `Defrag: +${n} Signal (${b.signal}/${b.max}).`, 'breach-good'); };
    if (verb === 'rest' && !sc.rested && !sc.recompile && !sc.reslot) { rest(); if (zero && recompilable(b).length) { sc.recompile = true; say(s, 'Zerologon: recompile a mod too.'); } else done(); }
    else if (verb === 'recompile' && !sc.reslot && !sc.recompile && recompilable(b).length) { sc.recompile = true; if (zero && !sc.rested) rest(); }
    else if (verb === 'plus' && sc.recompile) { const id = recompilable(b).includes(arg) ? arg : recompilable(b)[Number(arg)]; if (!id) deny(s, 'Recompile which mod?'); else { upgrade(s, id); done(); } }
    else if (verb === 'reslot' && !sc.recompile && !sc.rested) { sc.reslot = true; say(s, 'Re-slot: change your keys, then close it. Mods stay on their skills.'); }
    else if (verb === 'done' && (sc.reslot || sc.recompile)) { if (sc.reslot) say(s, 'Keys set.'); done(); }
    else if (verb === 'slot' && sc.reslot) { command(s, String(arg)); }
    else if (verb === 'jackout' && b.fx.service && !sc.reslot) { jackOut(s, 'Service Account'); }
    else deny(s, 'rest, recompile or reslot.');
  } else if (sc.kind === 'broker') {
    const price = (x) => priceOf(b, sc, x);
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
    } else if (verb === 'service') {
      // The stall's own service (BROKERS service): NULL CHOIR recompiles a mod, LANTERN shows the whole act,
      // GLASSJAW sells a reroll. Once a stall.
      const B = BROKERS[sc.faction], sv = B.service, cost = sv && price(sv.price);
      if (!sv || sc.served) deny(s, sv ? 'One service a stall.' : 'This stall has no service.');
      else if (b.tokens < cost) deny(s, `That costs ${cost} tokens. You have ${b.tokens}.`);
      else if (sv.id === 'recompile' && !recompilable(b).length) deny(s, 'You hold no mod to recompile.');
      else if (sv.id === 'recompile' && arg == null) { sc.recompile = true; }
      else {
        const id = sv.id === 'recompile' ? (recompilable(b).includes(arg) ? arg : recompilable(b)[Number(arg)]) : null;
        if (sv.id === 'recompile' && !id) deny(s, 'Recompile which mod?');
        else {
          b.tokens -= cost; sc.served = true; sc.recompile = false;
          if (sv.id === 'recompile') upgrade(s, id);
          if (sv.id === 'reveal') { const n = b.map.nodes[sc.node]; (b.fx.reveal ||= []).push(n.act + (n.row === b.map.rows - 1 && n.act < b.map.acts - 1 ? 1 : 0)); say(s, `LANTERN sells you the map: act ${b.fx.reveal.at(-1) + 1} shows whole.`, 'breach-good'); }
          if (sv.id === 'reroll') { b.rerolls++; say(s, `+1 reroll (${b.rerolls}).`, 'breach-good'); }
        }
      }
    } else if (verb === 'leave') { b.cleared[sc.node] = true; say(s, 'You close the stall.'); next(s); }
    else deny(s, 'buy, patch or leave.');
  } else if (sc.kind === 'term') {
    const i = Number(arg);
    if (verb !== 'choose' || !EVENTS[sc.event].options[i]) deny(s, 'Choose an option.');
    else termChoose(s, sc, i);
  } else if (sc.kind === 'gate') {
    if (verb === 'goon') { bank(s); say(s, 'You go deeper.'); next(s); }
    else if (verb === 'jackout') jackOut(s);
    else deny(s, 'Go on, or jack out.');
  }
  return out();
}
function jackOut(s, by = null) {
  const b = s.breach;
  bank(s); b.result = 'out'; b.screen = { kind: 'result' }; unpatchMods();
  say(s, `${by ? `${by}: ` : ''}JACKED OUT of ${cardOf(s).name}. Your pack is banked. The server stays uncaptured.`, 'jacked-out');
  breachHooks.over?.(s, 'out');
}
// A defrag's rest: 30% of your Signal, 20% at heat 4.
export const restShare = (b) => (b?.rules?.rest ?? BREACH.rest) + (b?.cves?.includes('zerologon') ? 0.1 : 0);
// The mods you could recompile to +: held, not + yet.
export const recompilable = (b) => b.mods.filter((id) => !b.plus.includes(id));
function upgrade(s, id) {
  const b = s.breach;
  if (!b.plus.includes(id)) b.plus.push(id);
  say(s, `Recompiled: ${modName(id, true)}. ${MODS[id].text(MODS[id].v[1])}`, 'breach-good');
}
// A card you drafted or bought: a mod on its skill (one a skill: it replaces the one there, + and all), a CVE, or gear
// in your pack.
function take(s, c) {
  const b = s.breach, t = cardText(c);
  if (c.kind === 'mod') { const gone = b.mods.filter((id) => MODS[id].skill === MODS[c.id].skill); b.mods = b.mods.filter((id) => !gone.includes(id)).concat(c.id); b.plus = b.plus.filter((id) => !gone.includes(id)); say(s, `Mod: ${t.name} on ${t.kicker.split(' · ')[1]}.`, 'breach-good'); }
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
  if (ev === 'cron' && i === 0) { const lost = cost(0.1); (b.fx.gate ||= {}).delay = 2; say(s, `You finish the job. It costs you ${lost} Signal, and ${nextGuard(n, b.map.acts).toLowerCase()}'s signature part will attack 2 cycles late.`, 'breach-good'); }
  else if (ev === 'cron') { tokens(s, 15); say(s, 'You wipe the job.'); }
  else if (ev === 'keys' && i === 0) { (b.fx.gate ||= {}).keys = true; say(s, `You load the keys. ${nextGuard(n, b.map.acts)} will open thinner, and angrier.`, 'breach-good'); }
  else if (ev === 'honeytoken' && i === 0) { const lost = cost(0.15); tokens(s, 50); say(s, `The file was a honeytoken. Tracing it back costs you ${lost} Signal.`, 'breach-bad'); }
  else if (ev === 'sandbox' && i === 0) {
    // The sample: a wild virus at this act's level, one of the new tells, and a rare card in its draft.
    const r = rnd(b, 29);
    const sample = { ...virusOf(r, n, n.level, false, cardOf(s)), seed: Math.floor(r() * 2 ** 31) };
    b.cleared[n.id] = true; b.screen = null;
    say(s, 'You open the cage.');
    return fight(s, n, { sample, pause: !!sc.pause });
  } else say(s, 'You leave it.');
  done();
}
// Who a terminal's gate effects reach: the next gate, or the Resident after the last one.
export const nextGuard = (n, acts = ACTS.length) => (n.act < acts - 1 ? 'The next gate' : 'The Resident');
export const eventText = (n, text, acts = ACTS.length) => text.replace('{Next}', nextGuard(n, acts));
function brokerStock(s, n) {
  const b = s.breach, r = rnd(b, 41), out = [], build = buildTags(s), boost = b.rareBoost;
  for (const kind of BROKERS[n.faction].stock) {
    // Three it could stock; the one that fits your build best goes on the stall.
    const pool = kind === 'gear' ? rollDraft(s, r, 'stall', { act: n.act, level: n.level, count: 1 }) : rollDraft(s, r, kind, { act: n.act, level: n.level, count: 3 });
    const fresh = pool.filter((x) => x.kind === kind && !out.some((y) => y.id && y.id === x.id));
    const c = fresh.sort((x, y) => linksOf(s, y, build).n - linksOf(s, x, build).n)[0] || (kind !== 'gear' ? rollDraft(s, r, 'stall', { act: n.act, level: n.level, count: 1 })[0] : null);
    if (!c) continue;
    c.price = c.kind === 'mod' ? PRICES.mod[MODS[c.id].rarity] : c.kind === 'cve' ? PRICES.cve[CVES[c.id].rarity] : PRICES.gear[c.rarity] || 90;
    out.push(c);
  }
  b.rareBoost = boost; // a stall's stock is not a draft: the pity stays where it was
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
  breachHooks.over?.(s, 'lost');
}
function capture(s) {
  const b = s.breach, card = cardOf(s);
  // Mail Drop (a captured smtpd): one more item on every capture, blue or better (yellow at tier II).
  bank(s);
  // The capture bonus: a third of the breach's kill XP (docs/roguelite.md 6.1). Only the campaign pays it.
  if (b.xpMult && b.xp > 0) gainXp(s, Math.round(b.xp / 3), `${card.name} captured`);
  b.result = 'won';
  b.screen = { kind: 'result' };
  unpatchMods();
  breachHooks.over?.(s, 'won');
  say(s, `${card.name} captured. ${b.dump === null ? 'Its core.dump is already in your Archive.' : '/core lists one more file: core.dump.'}`, 'breach-good');
  return b.screen;
}
// The capture card's numbers.
export function captureOf(s) {
  const b = s.breach;
  return {
    rewrites: cardOf(s).subsystems.flat().map((sub) => ({ sub, held: b.rewrites[sub] || b.prior?.[sub] || null, kept: !b.rewrites[sub] && !!b.prior?.[sub] })),
    xp: b.xp, items: b.banked.map((id) => stashItem(s, id)).filter(Boolean), kills: b.kills, dump: b.dump === undefined ? CORE_DUMP : b.dump,
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
    say(s, xs.length ? xs.map((n, i) => `${i + 1}  ${(n.kind === 'gate' ? 'gate' : n.kind === 'boss' ? 'core' : n.sub || 'tmp')}/  [${n.kind === 'term' ? 'term' : n.kind}${n.reward ? ` · ${n.rare ? 'rare ' : ''}${n.reward}` : ''}]`).join('\n') : b.screen ? 'Finish what is on screen first.' : 'Nowhere to go.', 'breach-out');
    return out();
  }
  if (word === 'cd' || word === 'go') {
    const xs = reachable(s), n = /^\d+$/.test(arg) ? xs[Number(arg) - 1] : xs.find((x) => x.id === arg) || xs.find((x) => (x.sub || x.kind) === arg.replace(/\/$/, ''));
    return n ? go(s, n.id) : (deny(s, `cd: ${arg || '?'}: not reachable. Type ls.`), out());
  }
  if (word === 'tree') { say(s, treeLines(s).join('\n'), 'breach-out'); return out(); }
  if (word === 'pick' || word === 'buy' || word === 'choose') return act(s, word, Number(arg) - 1);
  if (word === 'plus') return act(s, 'plus', arg || 0); // recompile: plus <mod>
  if (['skip', 'reroll', 'cat', 'pull', 'leave', 'rest', 'reslot', 'done', 'patch', 'goon', 'recompile', 'service'].includes(word)) return act(s, word);
  if (word === 'jack' && arg === 'out') return act(s, 'jackout');
  return null; // not a breach word: the caller passes it on
}
// The ASCII map: what you can read of it.
export function treeLines(s) {
  const b = s.breach, card = cardOf(s), acts = actsOf(card), rows = rowsOf(card), lines = [`/ ${card.name}`];
  for (let act = 0; act < acts; act++) {
    lines.push(`├─ ${ACTS[act].dir}/`);
    for (let row = 0; row <= rows; row++) {
      const ns = nodeList(b.map).filter((n) => n.act === act && n.row === row).sort((x, y) => (x.col ?? 0) - (y.col ?? 0));
      if (!ns.length) continue;
      const cells = ns.map((n) => (b.at === n.id ? '@' : b.cleared[n.id] ? 'x' : visible(s, n) ? MARK[n.kind] : '?'));
      lines.push(`│  ${(row === rows ? (act === acts - 1 ? 'core' : 'gate') : rowSub(act, row, card) || 'tmp').padEnd(7)} ${cells.join('  ')}`);
    }
  }
  return lines;
}
export const MARK = { virus: 'v', elite: 'E', cache: '$', defrag: '+', broker: 'b', term: '>', gate: 'G', boss: 'R' };

// ---------- the bot (breachsim.mjs) ----------
// How a player walks the map and drafts. Three draft policies, to measure how much drafting is skill:
//   random   takes a random card, rests at every defrag, buys a random card it can afford, walks for safety only
//   greedy   takes the rarest card (a CVE over a mod over gear on a tie), otherwise as random
//   smart    reads the tags: takes the card that links most with its kit and its cards, walks toward the rewards it
//            wants, rerolls a weak draft, recompiles at a defrag when its Signal allows, buys what links at a stall
// Every policy fights with the planner, equips gear that beats what's loaded and rewrites the same way, so the gap
// between them is the drafting.
export const POLICIES = ['random', 'greedy', 'smart'];
// The smart bot's knobs: how much a node's promised reward pulls its path, the value under which it rerolls a draft,
// and the Signal share over which it recompiles at a defrag instead of resting.
export const BOT = { route: 0.35, reroll: 2.6, recompile: 0.7 };
const RANK3 = { stock: 0, tuned: 1, custom: 2 };
// The bot's own dice (never the breach's: every policy meets the same maps and drafts).
const botRand = (b) => seeded((b.seed * 7919 + (b.botN = (b.botN || 0) + 1) * 104729) >>> 0)();
const policyOf = (s) => s.breach?.policy || 'smart';
// What a card is worth to the smart bot: its rarity, and its links with the build (the tags it shows on its tile).
export function cardValue(s, c, build = buildTags(s)) {
  if (BOT.value) { const v = BOT.value(s, c); if (v != null) return v; } // breachsim.mjs: a table of measured values (the oracle)
  if (c.kind === 'gear') { const g = gearGain(s, c.item); return g > 0 ? 1 + g * 0.45 : 0.3; }
  const b = s.breach, d = cardDef(c), links = linksOf(s, c, build).n;
  const replaces = c.kind === 'mod' && b.mods.some((id) => MODS[id].skill === MODS[c.id].skill);
  // Low on Signal, what keeps you alive counts for more.
  const need = b.signal < b.max * 0.5 && d.makes.some((t) => t === 'heal' || t === 'shield') ? 1 : 0;
  return 1.8 + RANK3[c.rarity] * 0.6 + links * 1.6 + need - (replaces ? 1.5 : 0) + (d.wants.length && !links ? -1 : 0);
}
// What a fight node's promised reward is worth to the smart bot, before it sees the cards.
function rewardValue(s, n) {
  if (!n.reward) return 0;
  const b = s.breach, build = buildTags(s);
  const best = (ids, kind) => Math.max(0, ...ids.map((id) => cardValue(s, { kind, id, rarity: CVE_RARITY[(kind === 'mod' ? MODS : CVES)[id].rarity] }, build)));
  const v = n.reward === 'mod' ? best(modPool(s), 'mod') : n.reward === 'cve' ? best(cvePool(s, build), 'cve') : 1.6;
  return BOT.route ? v * BOT.route + (n.rare ? 0.8 : 0) : 0;
}
const CVE_RARITY = { common: 'stock', uncommon: 'tuned', rare: 'custom' };
// How a player walks the map: take fights while Signal is high, rest when it's low, take cards that fit.
export function botRoute(s) {
  const b = s.breach, xs = reachable(s), smart = policyOf(s) === 'smart';
  if (!xs.length) return null;
  const sig = b.signal / b.max;
  const score = (n) => {
    const look = [n, ...nextOf(b.map, n.id)];
    let v = 0;
    for (const x of look) {
      const k = x === n ? 1 : 0.4;
      // The smart bot reads the risk too: an elite only once its build can take one (three cards, past the perimeter),
      // and a rest a little sooner.
      const ready = !smart || (x.act > 0 && b.mods.length + b.cves.length >= 3);
      if (x.kind === 'defrag') v += k * (sig < (smart ? 0.7 : 0.6) ? 6 : 1);
      if (x.kind === 'broker') v += k * (b.tokens >= 80 ? 3 : sig < 0.5 && b.tokens >= 25 ? 2 : 0.5);
      if (x.kind === 'virus') v += k * (sig > 0.45 ? 2.5 : -1);
      if (x.kind === 'elite') v += k * (sig > 0.8 && ready ? 3 : -4);
      if (x.kind === 'cache') v += k * 2;
      if (x.kind === 'term') v += k * 1.5;
      if (smart && visible(s, x) && (x.kind === 'virus' || (x.kind === 'elite' && sig > 0.8))) v += k * rewardValue(s, x);
    }
    return v;
  };
  return xs.map((n) => ({ n, v: score(n) })).sort((a, c) => c.v - a.v)[0].n.id;
}
// What to take, by policy.
export function botPick(s) {
  const b = s.breach, sc = b.screen, policy = policyOf(s);
  if (!sc) return null;
  if (sc.kind === 'draft') {
    if (!sc.cards.length) return sc.noSkip ? null : ['skip'];
    if (policy === 'none') return sc.noSkip ? ['pick', 0] : ['skip']; // a floor for the measurements: no drafts at all
    if (policy === 'random') return ['pick', Math.floor(botRand(b) * sc.cards.length)];
    if (policy === 'greedy') {
      const kindRank = { cve: 2, mod: 1, gear: 0 }, key = (c) => RANK3[c.rarity] * 3 + kindRank[c.kind];
      const top = Math.max(...sc.cards.map(key)), best = sc.cards.map((c, i) => [c, i]).filter(([c]) => key(c) === top);
      return ['pick', best[Math.floor(botRand(b) * best.length)][1]];
    }
    const build = buildTags(s), vals = sc.cards.map((c, i) => ({ i, v: cardValue(s, c, build) })).sort((a, c) => c.v - a.v);
    if (vals[0].v < BOT.reroll && b.rerolls > 0 && !sc.rerolled) { sc.rerolled = true; return ['reroll']; }
    return ['pick', vals[0].i];
  }
  if (sc.kind === 'rewrite') { const pref = ['restorepoint', 'memorymap', 'kernelhook', 'warmstart', 'forgedkeys', 'zonetransfer', 'spamcannon', 'testbed', 'slushfund', 'maildrop', 'audittrail', 'listeningpost', 'jumphost', 'nightlybuild', 'serviceaccount', 'bountyboard', 'range', 'sinkhole', 'pricefix', 'archive']; const i = sc.options.map((id, k) => [k, pref.indexOf(id)]).sort((a, c) => a[1] - c[1])[0][0]; return ['pick', i]; }
  if (sc.kind === 'cache') return sc.read ? [b.map.nodes[sc.node].bait ? 'leave' : 'pull'] : ['cat'];
  if (sc.kind === 'defrag') {
    const mods = recompilable(b);
    if (sc.recompile) { if (!mods.length) return ['done']; if (policy === 'random') return ['plus', mods[Math.floor(botRand(b) * mods.length)]]; const build = buildTags(s); return ['plus', mods.map((id) => ({ id, v: linksOf(s, { kind: 'mod', id }, build).n + RANK3[CVE_RARITY[MODS[id].rarity]] })).sort((a, c) => c.v - a.v)[0].id]; }
    if (policy === 'smart' && mods.length && (b.signal >= b.max * BOT.recompile || b.cves.includes('zerologon'))) return b.cves.includes('zerologon') ? ['rest'] : ['recompile'];
    return ['rest'];
  }
  if (sc.kind === 'broker') {
    const price = (x) => priceOf(b, sc, x);
    if (!sc.patched && b.signal < b.max * 0.6 && b.tokens >= price(BROKERS[sc.faction].patch)) return ['patch'];
    const sv = BROKERS[sc.faction].service;
    if (policy === 'smart' && sv?.id === 'recompile' && !sc.served && recompilable(b).length && b.tokens >= price(sv.price)) { if (!sc.recompile) return ['service']; const build = buildTags(s); return ['service', recompilable(b).sort((x, y) => linksOf(s, { kind: 'mod', id: y }, build).n - linksOf(s, { kind: 'mod', id: x }, build).n)[0]]; }
    const can = sc.stock.map((c, i) => [c, i]).filter(([c]) => !c.sold && c.kind !== 'gear' && b.tokens >= price(c.price));
    if (!can.length || policy === 'none') return ['leave'];
    if (policy === 'random') return ['buy', can[Math.floor(botRand(b) * can.length)][1]];
    if (policy === 'greedy') return ['buy', can.sort(([x], [y]) => RANK3[y.rarity] - RANK3[x.rarity])[0][1]];
    const build = buildTags(s), best = can.map(([c, i]) => ({ i, v: cardValue(s, c, build) })).sort((a, c) => c.v - a.v)[0];
    return best.v >= 2.6 ? ['buy', best.i] : ['leave'];
  }
  if (sc.kind === 'term') { const ev = sc.event; return ['choose', ev === 'cron' ? (b.signal > b.max * 0.6 ? 0 : 1) : ev === 'keys' ? 0 : ev === 'honeytoken' ? (b.signal > b.max * 0.7 ? 0 : 1) : (b.signal > b.max * 0.7 ? 0 : 1)]; }
  if (sc.kind === 'gate') return ['goon'];
  return null;
}
// What a protocol adds over the one in its slot, roughly: a bigger rarity, or a higher level.
function gearGain(s, it) {
  const rank = { custom: 3, tuned: 2, stock: 1, zeroday: 4, indemnified: 4 };
  const slot = SLOT_KINDS.indexOf(it.group), on = slot >= 0 ? stashItem(s, rigOf(s)[slot]) : null;
  return on ? (rank[it.rarity] - rank[on.rarity]) * 3 + (it.level - on.level) : 5;
}

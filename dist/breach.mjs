// A breach: one run through one server on a branching map (docs/roguelite.md, phase 0: "one breach, playable end to
// end"). Pure like the combat engine: state in, events out. It lives on s.breach, which only a playtest campaign
// carries (app.js ?playtest=breach), or the breach campaign (campaign.mjs).
//
// The run: three acts (Perimeter, Services, Kernel) of four rows each, a gate (a guard) after acts 1 and 2, and the
// Resident (DEADBOLT) at /core. A campaign server (campaign.mjs) brings its own card: fewer acts or rows early on,
// its own Resident, subsystems and gates. Signal is the run's health and carries from node to node; a defrag or a
// broker's patch restores it, and nothing else does: what heals you inside a fight never takes you over the Signal
// you started it with. A subsystem's fight rewrites it (rewrites.mjs): the rewrite is the server's output once you
// capture it. Beating a gate banks the pack. Losing costs the unbanked pack; XP, banked gear and your scripts stay.
//
// Your build is yours (docs/roguelite.md 11: no power inside a run): talents, subclass, gear and its rules
// (skillrules.mjs), uniques, presets. What a breach adds is the map, as a dungeon:
//   keys and vaults  a keycard rides on a virus (beat it, take the card); a vault on another branch opens with one, or
//                    can be forced, loudly. Vaults hold the good stuff: a better gear roll or a script, and a log.
//   switches         a security node: take it down (a fight, or a loud splice) and the act's viruses lose a ◆, or
//                    its gate opens weaker. A map effect on the enemy, never on you.
//   Trace            loud moves raise it (elites, vaults, bait, honeytokens), quiet steps and switches lower it. At
//                    TRACE.hunt a hunter ICE drops onto the map and closes a node every move you make.
//   server kinds     each kind plays by one rule of its own (KINDS): Mailhub spam floods, Archive deep storage,
//                    Relay hops, Mirror mirrors, Lab overheat.
//   scripts          one-shot programs you carry (scripts.mjs), one a fight. Vaults, elites, the hunter and the
//                    Resident drop them now and then; brokers sell them for tokens, and tokens come from caches.
// Loot is a chase: gear comes from elites, gates, vaults and the Resident (BREACH.loot), about one to three items a
// breach.
// Phase 3 (docs/roguelite.md 9.3): every wild and elite node rolls its genome (genomeOfNode, applyMutations), and a
// breach has a heat (heat.mjs).
//
// Fights are ordinary run fights (combat.mjs selectEncounter, mode 'run'), flagged e.breach: combat.mjs finish hands
// the end back here (hooks.breachEnd), skill rules ride hooks.emitted and hooks.commanded, and the end of each cycle
// (enrage, overheat) hooks.cycleEnd. Between fights s.run is null, so gear loads as at home; during one it holds your
// Signal, as on any run.
import { hooks, emit, warn, active, selectEncounter, command, maxSignal, hackerOf, hackerLevel, classOf, subOf, addItem, stashItem, rigOf, attackers, gainXp, part, livingParts, defender, hit } from './combat.mjs';
import { GUARDS, STRAINS, TELL, SUBS, LOADOUT, SUBCLASS, defaultSub, ARCHETYPES, BOSSES, FAMILIES, TELL_SETS, stemOf } from './data.mjs';
import { seeded, rollItem, itemLabel, protocolSlots, SLOT_KINDS, chaseStat } from './gear.mjs';
import { SUBSYSTEMS, REWRITES } from './rewrites.mjs';
import { GENES, rollGenome, partGenes } from './genes.mjs';
import { AUTHORS } from './authors.mjs';
import { decoded } from './genome.mjs';
import { heatRules } from './heat.mjs';
import { patchRules, unpatchRules, onEvent as ruleEvent, afterCommand as ruleCommand } from './skillrules.mjs';
import { SCRIPTS, giveScript, rollScript, scriptStock, priceOf as scriptPrice, scriptsOf, slotsOf, runScript } from './scripts.mjs';

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
  rows: 5, cols: 4, paths: 3, fog: 2, infiltratorFog: 3,
  weights: { virus: 40, elite: 15, term: 20, cache: 12, broker: 7, defrag: 8 },
  tokens: { cache: [30, 60], sandbox: 20 },
  rest: 0.35, eliteHp: 1.5, strainShare: 0.15, actLevel: [0, 1, 2], gateLevel: [0, 1], bossLevel: 1,
  baitShare: 0.25, baitCost: 0.12, startTokens: 0, cacheScript: 0.15,
  // A breach is nine or ten fights on one Signal bar with two or three rests: each fight is sized for that, by
  // node kind (its parts' Integrity and its attacks), on top of the run sizes every Signal fight already has. The
  // hunter is a Tracer ICE; a switch's ICE is a small watchdog.
  size: { virus: { hp: 0.85, dmg: 0.55 }, elite: { hp: 0.8, dmg: 0.45 }, gate: { hp: 0.9, dmg: 0.75 }, boss: { hp: 0.85, dmg: 0.6 }, hunter: { hp: 0.7, dmg: 0.55 }, ice: { hp: 0.6, dmg: 0.5 } },
  // A wild virus brings one tell kind, an elite two, one of them a charge: answer it with a burst (docs/roguelite.md
  // 11). Overclock and Lock are the new ones; the family's seal stays in the mix.
  tells: { charge: 4, overclock: 2, lock: 2, seal: 2 },
  lockFrom: 5, // Lock waits until your bar has a cooldown worth feeding it
  // Rolled genomes (docs/genome.md 5, genes.mjs rollGenome): every wild and elite virus rolls its genes from its
  // author's toolkit within the budget. geneBonus: budget points on top (Testbed adds its own). Off: the phase 0 roll.
  genomes: true, geneBonus: -2,
  // Heat 1, Loud: a breach is ten fights on one Signal bar, so its loud is a step, not the old run's cliff (HOT_RUN).
  loud: { hp: 1.15, dmg: 1.1 },
  // Enrage: a virus, an elite or a gate still up at this cycle hits first 50% harder, then a quarter more every 4
  // cycles. Outlasting a fight isn't a plan; a burst is. A Resident keeps the enrage it has (data.mjs BOSSES enrageAt).
  enrage: { virus: 8, elite: 9, gate: 10, first: 1.5, step: 1.25, every: 3 },
  // A subclass's (or, under level 10, a class's) own sizing on breaches (docs/roguelite.md 11): its fights' Integrity
  // and what they hit for. The Bastion's in-fight sustain still outlasts fights the others can't, so they hit it
  // harder. The Phantom, a burst class with no strip, meets thinner parts that hit softer. The rest even out the
  // classes' runs from level 1 (campaignsim.mjs).
  classSize: { bastion: { dmg: 1.15 }, breaker: { dmg: 0.9 }, infiltrator: { dmg: 0.85 }, payload: { dmg: 1 }, phantom: { hp: 0.85, dmg: 0.8 }, operator: { dmg: 1.05 } },
  // Loot (docs/roguelite.md 11: about one to three items banked a breach, a real upgrade every two or three). gear: the
  // odds an elite or a gate drops a protocol (the Resident always does); custom and white: a yellow's and a white's
  // share of it (blue otherwise); script: a script's odds.
  loot: { elite: { gear: 0.12, custom: 0.3, script: 0.25 }, gate: { gear: 0.08, white: 0.4, custom: 0.1 }, boss: { white: 0.45, custom: 0.1, script: 0.5 }, vault: { gear: 0.35, custom: 0.4 } },
};
// Trace on a breach (from run.mjs TRACE, docs/roguelite.md 2.1): how loud you've been, 0 to 100. alarm: a Mailhub's
// spam floods start; hunt: a hunter ICE drops onto the map; lose: under it, a hunter on the map loses you; after: where
// beating the hunter leaves it. The rest is what moves it. An Infiltrator raises it half as fast.
export const TRACE = { alarm: 30, hunt: 55, lose: 30, after: 15, elite: 20, open: 15, force: 35, bait: 25, quiet: -3, rest: -10, ice: -20, splice: 15, scrub: -30 };
// Server kinds: one rule each (docs/roguelite.md 11), shown on the server's card and the breach's strip.
export const KINDS = {
  Mailhub: { rule: 'Spam floods', text: `Every fight brings a Spam Flood once your Trace reaches ${TRACE.alarm}: one more part, weak and quick.` },
  Archive: { rule: 'Deep storage', text: 'Every act holds two vaults and two keycards.' },
  Relay: { rule: 'Hops', text: 'Every act has two open shortcuts that skip a row.' },
  Mirror: { rule: 'Mirrors', text: 'One cache in every act is a mirror, with an elite behind it.' },
  Lab: { rule: 'Overheat', text: 'From the 10th cycle of every fight, the rack burns you for 2% of your max Signal each cycle, and every part for 3% of its max Integrity.' },
};
export const OVERHEAT = { from: 10, share: 0.03, you: 0.02 };
// What a switch takes down (docs/roguelite.md 11): the act's viruses, or its gate (the Resident in the last act).
export const SWITCHES = {
  armor: { name: 'Patch server', text: 'Every virus left in this act loses 1 ◆ on every part.' },
  gate: { name: 'Gate relay', text: '{Next} starts with 20% less Integrity, and its first attack 2 cycles late.' },
};
// The logs a vault keeps, by author: a line or two of who was here.
export const VAULT_LOGS = {
  tollgate: ['escrow.log: 2 of 2 keys held. 1 of 2 keys paid for.', 'ops.txt: lock first, invoice second, insure third.'],
  swarmline: ['beacon.cfg: phone home every 300s. nobody ever answers.', 'list.csv: 4,112 rows. column C says "insured".'],
  nullchoir: ['score.mid: four beats, then silence, then four beats.', 'choir.txt: we sing what you type. type something kind.'],
  glassjaw: ['ledger.db: compute rented by the hour. client field blank.', 'bill.txt: we do not ask. we bill.'],
  palemask: ['mask.png: a face, cropped from a claims photo.', 'note.txt: wear it long enough and it wears you.'],
  kestrel: ['incident.log: alarm 4471 acknowledged. no unit dispatched.', 'rota.txt: on call this week: nobody.'],
};
const stepOf = (act, row, rows = BREACH.rows) => act * (rows + 1) + row + 1; // 1..5 an act's rows, 6 its gate; 18 the Resident
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
// The subsystem a row runs: rows 1 and 2 the act's two, then they take turns (which goes first alternates by act), the
// last row none (a rest row). A three-row act (SPRAWL-00) runs its two, then rests.
export const rowSub = (act, row, card = SERVER_CARD) => { const [a, b] = card.subsystems[act], rows = rowsOf(card); return row >= rows - 1 ? null : row === 0 ? a : row === 1 ? b : (row + act) % 2 ? b : a; };
// What a wild or elite node's virus will be, fixed when the map is made (so scan and the map agree). An elite's first
// tell is a charge, for a burst to answer.
function virusOf(r, node, level, elite, card = SERVER_CARD, gen = {}) {
  const strains = (card.builds || []).filter((k) => STRAINS[k] && (STRAINS[k].from || 1) <= level);
  const strain = !elite && node.act > 0 && strains.length && r() < BREACH.strainShare ? strains[Math.floor(r() * strains.length)] : null; // past the perimeter
  const fam = card.family, charge = { ransomware: 'fulldisk', worm: 'massmailer', ghostroot: 'possession' }[fam], seal = { ransomware: 'keyrotation', worm: 'resync', ghostroot: 'godark' }[fam];
  const pool = { ...BREACH.tells };
  if (level < TELL.castFrom) delete pool.overclock; // casts come with SIGINT
  if (level < BREACH.lockFrom) delete pool.lock; // Lock asks for a cooldown to feed it: not while your bar is two keys
  const ids = { overclock: 'overclock', lock: 'lock', charge, seal };
  const tells = [];
  if (elite) { tells.push(charge); delete pool.charge; }
  while (tells.length < (elite ? 2 : 1)) { const k = weighted(r, pool); tells.push(ids[k]); delete pool[k]; }
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
// The map's dungeon pieces in one act (docs/roguelite.md 11): a switch, keycards on viruses, vaults on other branches,
// a Mirror's mirrored cache, a Relay's shortcuts. A three-row act (the tutorial) has none of them.
function dungeon(r, actNodes, act, rows, card, edges, shortcuts, author) {
  if (rows < 4) return;
  const mid = actNodes.filter((n) => n.row > 0 && n.row < rows - 1);
  const pick = (xs) => xs[Math.floor(r() * xs.length)];
  const terms = mid.filter((n) => n.kind === 'term').length;
  // Mirror: one cache an act is a mirror (a virus or a spare terminal becomes the cache when there's none).
  if (card.kind === 'Mirror') {
    const m = pick(mid.filter((n) => n.kind === 'cache')) || pick(mid.filter((n) => n.kind === 'virus')) || (terms > 1 ? pick(mid.filter((n) => n.kind === 'term')) : null);
    if (m) { m.kind = 'cache'; m.mirror = true; delete m.event; }
  }
  const free = (n) => !n.mirror && !n.key;
  const spareTerm = () => mid.filter((x) => x.kind === 'term').length > 1;
  // A switch: a cache or a virus (never the act's only terminal or its elite).
  const sw = pick(mid.filter((n) => n.kind === 'cache' && free(n))) || pick(mid.filter((n) => n.kind === 'virus' && free(n))) || (spareTerm() ? pick(mid.filter((n) => n.kind === 'term')) : null);
  if (sw) { sw.kind = 'switch'; sw.effect = r() < 0.5 ? 'armor' : 'gate'; delete sw.event; }
  // Vaults sit in the act's middle rows; each one's keycard rides a virus in an earlier row, on another lane where
  // one can.
  const deep = card.kind === 'Archive' ? 2 : 1;
  for (let i = 0; i < deep; i++) {
    const vault = pick(mid.filter((n) => free(n) && (['virus', 'cache'].includes(n.kind) || (n.kind === 'term' && spareTerm()))));
    if (!vault) continue;
    const early = actNodes.filter((n) => n.kind === 'virus' && n.row < vault.row && n.row <= rows - 3 && free(n));
    const keyAt = pick(early.filter((n) => n.col !== vault.col)) || pick(early);
    if (keyAt) keyAt.key = true;
    vault.kind = 'vault'; delete vault.event;
    const L = BREACH.loot.vault, logs = VAULT_LOGS[author] || VAULT_LOGS.tollgate;
    vault.vault = r() < L.gear ? { kind: 'gear', rarity: r() < L.custom ? 'custom' : 'tuned' } : { kind: 'script', script: rollScript(r, 'uncommon') };
    vault.vault.log = logs[Math.floor(r() * logs.length)];
  }
  // Relay: two shortcuts an act, from a node to one two rows down (same lane or a neighbour), skipping the row between.
  if (card.kind === 'Relay') {
    const from = actNodes.filter((n) => n.row <= rows - 3).sort(() => r() - 0.5);
    let made = 0;
    for (const a of from) {
      const to = actNodes.filter((n) => n.row === a.row + 2 && Math.abs(n.col - a.col) <= 1 && !shortcuts.some(([x, y]) => x === a.id || y === n.id));
      const c = pick(to);
      if (c && !edges.some(([x, y]) => x === a.id && y === c.id)) { shortcuts.push([a.id, c.id]); if (++made >= 2) break; }
    }
  }
}
// opts: heat (Rotation adds an elite an act), gen (genome options: Testbed, Sinkhole).
export function generateMap(seed, level = 10, card = SERVER_CARD, { heat = 0, gen = {} } = {}) {
  const r = seeded(seed * 31 + 7);
  const rules = heatRules(heat);
  const acts = actsOf(card), rows = rowsOf(card), w0 = { ...BREACH.weights, ...(KIND_WEIGHTS[card.kind] || {}) };
  const nodes = {}, edges = [], shortcuts = [];
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
    const actEdges = [];
    for (const k of es) { const [row, a, b] = k.split(/[:>]/).map(Number); actEdges.push([id(row, a), id(row + 1, b)]); }
    edges.push(...actEdges);
    // Kinds: the first row all virus; the last all defrag or broker; the rows between by weight, with a broker or a
    // defrag only in the middle one (never two rests in a row on a path). No elite in act 1's first two rows.
    const actNodes = Object.values(nodes).filter((n) => n.act === act && n.kind == null);
    for (const n of actNodes) {
      if (n.row === 0) n.kind = 'virus';
      else if (n.row === rows - 1) n.kind = r() < 0.5 ? 'defrag' : 'broker';
      else {
        const w = { ...w0 };
        if (act === 0 && n.row < 2) delete w.elite;
        if (n.row !== Math.floor((rows - 1) / 2) || rows < 5) { delete w.broker; delete w.defrag; }
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
    dungeon(r, actNodes, act, rows, card, actEdges, shortcuts, card.author);
    for (const n of actNodes) {
      if (['virus', 'elite'].includes(n.kind) || n.mirror) Object.assign(n, virusOf(r, n, lvl, n.kind === 'elite' || !!n.mirror, card, gen));
      if (n.kind === 'term') n.event = events[ev++ % events.length];
      if (n.kind === 'cache') { n.bait = !n.mirror && r() < BREACH.baitShare; n.tokens = BREACH.tokens.cache[0] + Math.floor(r() * (BREACH.tokens.cache[1] - BREACH.tokens.cache[0] + 1)); n.script = !n.bait && !n.mirror && r() < BREACH.cacheScript ? rollScript(r) : null; }
      if (n.kind === 'broker') n.faction = BROKER_IDS[Math.floor(r() * BROKER_IDS.length)];
    }
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
  return { nodes, edges, shortcuts, seed, acts, rows };
}
// Server kinds lean the map a little too (docs/roguelite.md 2.2): an Archive holds caches twice as often.
export const KIND_WEIGHTS = { Archive: { cache: 20 } };
function shuffle(r, xs) { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const nodeList = (map) => Object.values(map.nodes);
export const nextOf = (map, id) => map.edges.filter(([a]) => a === id).map(([, b]) => map.nodes[b]);
// Where a node leads, shortcuts and all (a Relay's hops skip a row).
export const exitsOf = (map, id) => [...nextOf(map, id), ...(map.shortcuts || []).filter(([a]) => a === id).map(([, b]) => map.nodes[b])];
export const firstRow = (map) => nodeList(map).filter((n) => n.step === 1);
// A Range replay (rewrites.mjs Range): the Resident alone at /core.
export function replayMap(seed, level, card = SERVER_CARD) {
  const r = seeded(seed * 31 + 7);
  const core = { id: 'core', act: 0, row: 0, col: null, step: 1, kind: 'boss', boss: card.resident, level: level + BREACH.bossLevel, seed: Math.floor(r() * 2 ** 31), path: '/core' };
  return { nodes: { core }, edges: [], shortcuts: [], seed, acts: 1, rows: 0, replay: true };
}
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
    lines: ['# resident maintenance window. do not edit', '*/5 * * * *  root  /opt/gate/hold --signature --cycles 2', '# TODO(ops): enable after the audit'],
    options: [
      { label: 'Finish it', text: "Costs 10% of your Signal and raises your Trace by 10. {Next}'s signature part attacks 2 cycles later." },
      { label: 'Wipe it', text: 'Grants you 15 tokens.' },
    ],
  },
  keys: {
    name: 'Leaked creds', file: '/home/ops/.ssh/keys.bak',
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
      { label: 'Pull it', text: 'Grants you 50 tokens. Raises your Trace by 25.' },
      { label: 'Leave it', text: 'Nothing changes.' },
    ],
  },
  sandbox: {
    name: 'Sandbox sample', file: '/var/sandbox/samples',
    lines: ['root  6121  0.0  sandbox --cage --hold', 'cage 3: one sample, still running, still writing'],
    options: [
      { label: 'Fight it', text: 'Fights the sample at your current Signal. It carries a script, uncommon or rare.' },
      { label: 'Leave it', text: 'Nothing changes.' },
    ],
  },
};
// Brokers: a faction's stall (docs/roguelite.md 2.5). Scripts and a Signal patch, for tokens; LANTERN sells the map
// ahead, Kestrel scrubs your Trace. stock: how many scripts (floor: the lowest rarity it carries). patch: its price.
export const BROKERS = {
  glassjaw: { name: 'GLASSJAW', sells: 'Scripts', stock: 3, patch: 45 },
  halcyon: { name: 'Halcyon', sells: 'Scripts, uncommon or better', stock: 2, floor: 'uncommon', patch: 45 },
  kestrel: { name: 'Kestrel', sells: 'Scripts, a cheap patch and a scrub', stock: 2, patch: 25, service: { id: 'scrub', name: 'Scrub', price: 30, text: 'Lowers your Trace by 30.' } },
  nullchoir: { name: 'NULL CHOIR', sells: 'Scripts', stock: 3, patch: 45 },
  lantern: { name: 'LANTERN', sells: 'Scripts, and maps', stock: 2, patch: 45, service: { id: 'reveal', name: 'Map', price: 30, text: 'Shows every node of the act ahead, past the fog.' } },
};
const BROKER_IDS = Object.keys(BROKERS);
export const PRICES = { patch: 0.25 };

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
// The talent pick each tier takes (0 or 1): a sensible player's, by subclass (breachsim.mjs measures them).
export const TALENT_PICKS = { phantom: [0, 1, 1] };
// A subclass from level 10 and the talent points a level has, spent as a player would (the campaign bot calls it as it
// levels too). Returns the subclass's kit, or null below level 10.
export function spendTalents(s, { cls = classOf(s), level = hackerLevel(s), sub = null } = {}) {
  const pick = level >= SUBCLASS.from ? (SUBS[sub]?.cls === cls ? sub : SUBS[s.loadout.sub?.[cls]]?.cls === cls ? s.loadout.sub[cls] : defaultSub(cls)) : null, key = pick || cls, kit = SUBS[pick];
  if (pick) s.loadout.sub = { ...(s.loadout.sub || {}), [cls]: pick };
  if (kit) {
    let left = level < LOADOUT.talentFrom ? 0 : Math.floor((level - LOADOUT.talentFrom) / LOADOUT.talentEvery) + 1;
    const ranks = {}, picks = [], tp = TALENT_PICKS[pick] || [0, 0, 0];
    for (const [id, n] of fillOrder(kit.fillers)) {
      if (left <= 0) break;
      if (!n) { picks[+id[1]] = tp[+id[1]]; left--; } else { const k = Math.min(n, left); ranks[id] = (ranks[id] || 0) + k; left -= k; }
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
//   bounty    the bounty you took
//   xp        what each kill's XP is worth here (the campaign pays more than the playtest's flat guard XP)
//   heat      the breach's heat (heat.mjs): each rank adds a modifier and pays for it
//   replay    a Range replay: the Resident alone (campaign.mjs)
export function startBreach(s, { seed = 1, level = hackerLevel(s), card = SERVER_CARD, outputs = {}, from = 0, keep = {}, prior = null, bounty = null, xp = 1, heat = 0, replay = false } = {}) {
  const rules = heatRules(heat);
  // What your network does to the roll of this server's viruses: Testbed (linked) adds a point, Sinkhole (linked) keeps
  // them to genes you've decoded.
  const gen = { bonus: (outputs.testbed ? 1 : 0) - (outputs.sinkhole > 1 ? 1 : 0), known: outputs.sinkhole ? new Set(Object.keys(GENES).filter((id) => decoded(s, id))) : null };
  const map = replay ? replayMap(seed, level, card) : generateMap(seed, level, card, { heat, gen });
  const playtest = card === SERVER_CARD && !s.camp;
  s.breach = {
    v: 3, seed, level, server: card.id, map, at: null, path: [], cleared: {}, rolls: 0, heat: rules.heat, rules,
    signal: 0, max: 0, tokens: BREACH.startTokens, trace: rules.audit, tracePeak: rules.audit, keys: 0, hunter: null, switches: {},
    rewrites: {}, pack: [], banked: [], fx: { rareOdds: rules.rare, gearLevel: rules.itemLevel }, screen: null, queue: [],
    xp: 0, xpFrom: { level: hackerLevel(s), xp: hackerOf(s).xp }, kills: 0, result: null, log: [], gen: { bonus: gen.bonus, sinkhole: !!gen.known },
    stats: { rests: 0, landed: 0, elites: 0, low: 1, hunted: 0, vaults: 0, scripts: 0, found: 0 },
  };
  const b = s.breach;
  if (card !== SERVER_CARD) {
    Object.assign(b, { card, outputs: { ...outputs }, prior, bounty, xpMult: xp * rules.xp, from });
    applyOutputs(s, b, outputs);
  }
  b.max = sigMax(s, b); b.signal = b.max;
  s.run = null;
  unpatchRules();
  // A playtest has no campaign to carry scripts in: it hands you two to try.
  if (playtest && !scriptsOf(s).length) { scriptsOf(s).push('sasser', rollScript(rnd(b, 3), 'uncommon')); }
  say(s, `CONNECTED to ${card.name}. ${card.kind}, level ${level}, ${card.author.toUpperCase()}.${rules.heat ? ` Heat ${rules.heat}.` : ''} Resident: ${residentName(card)}.`);
  // A retry from a checkpoint: you stand on the last gate you beat, with the rewrites from the acts behind it.
  if (from > 0 && map.nodes[`gate${from}`]) {
    for (let k = 1; k <= from; k++) { const g = `gate${k}`; if (map.nodes[g]) { b.cleared[g] = true; b.path.push(g); } }
    b.at = `gate${from}`;
    for (const [sub, held] of Object.entries(keep || {})) b.rewrites[sub] = { ...held };
    say(s, `Checkpoint: you pick up past ${GUARDS[map.nodes[b.at].guard].name}, act ${from + 1}.`, 'breach-good');
  }
  return b;
}
// What your captured servers do on this breach (rewrites.mjs output, docs/roguelite.md 3.2). Each rewrite once, at
// its best tier; the campaign works out which ones reach this server (Spam Cannon only from a linked server).
function applyOutputs(s, b, out) {
  const t = (id) => out[id] || 0;
  if (t('slushfund')) b.tokens += t('slushfund') > 1 ? 80 : 40;
  if (t('memorymap')) b.fx.memory = t('memorymap') > 1 ? 0.15 : 0.1;
  if (t('kernelhook')) b.fx.kernel = t('kernelhook');
  if (t('warmstart')) { b.fx.warm = true; if (t('warmstart') > 1) b.fx.warmSigint = true; }
  if (t('nightlybuild')) b.fx.nightly = t('nightlybuild') > 1 ? 30 : 15;
  if (t('forgedkeys')) b.keys += t('forgedkeys');
  if (t('pricefix')) b.fx.discount = t('pricefix') > 1 ? 0.4 : 0.25;
  if (t('restorepoint')) b.fx.restore = t('restorepoint') > 1 ? 0.4 : 0.25;
  if (t('spamcannon')) b.fx.thin = t('spamcannon') > 1 ? 0.25 : 0.15;
  if (t('maildrop')) b.fx.maildrop = t('maildrop');
  if (t('zonetransfer')) b.fx.zone = t('zonetransfer');
  if (t('audittrail')) b.fx.audit = t('audittrail') > 1 ? 2 : true;
  if (t('serviceaccount')) b.fx.service = t('serviceaccount');
  if (t('listeningpost')) b.fx.listen = t('listeningpost') > 1 ? 2 : 1.5;
  if (t('testbed')) b.fx.gearLevel += t('testbed') > 1 ? 3 : 2;
}
// A line in the breach's terminal (and the game log).
function say(s, text, type = 'breach') {
  const b = s.breach;
  b.log.push(text);
  if (b.log.length > 40) b.log.shift();
  return emit(s, type, text);
}
const deny = (s, text) => { warn(s, text); return null; };
// After a fight: your Signal back on the breach (never over what you started the fight with: heals and shields only
// count inside a fight), and s.run off so gear loads between nodes.
export function settle(s) {
  const b = s.breach;
  if (!b || !s.run?.breach || active(s)) return;
  b.signal = Math.max(0, Math.min(s.run.max, s.run.integrity, b.fightFrom ?? s.run.max));
  b.max = s.run.max;
  s.run = null;
  if (s.encounter?.breach) s.encounter = null; // the fight is over: a run fight with no run would have no Signal to read
}
export const currentNode = (s) => (s.breach?.at ? s.breach.map.nodes[s.breach.at] : null);
export const currentStep = (s) => currentNode(s)?.step || 0;
// Rows you can read: two ahead of where you stand (three for an Infiltrator). The gate and the Resident always show.
// LANTERN's map reveals a whole act (b.fx.reveal). The hunter always shows: it wants to be seen.
export const visible = (s, n) => !!s.breach && (n.kind === 'gate' || n.kind === 'boss' || n.step <= currentStep(s) + fogOf(s) || !!s.breach.cleared[n.id] || !!s.breach.fx.reveal?.includes(n.act));
// Where you can go now: along an edge, or a Relay's shortcut.
export function reachable(s) {
  const b = s.breach;
  if (!b || b.result || b.screen || active(s)) return [];
  if (!b.at) return firstRow(b.map);
  return exitsOf(b.map, b.at);
}

// ---------- Trace ----------
// Raise (or lower) your Trace. Loud moves raise it (an Infiltrator half as fast, heat 7 half again), and at
// TRACE.hunt a hunter drops onto the map. Under TRACE.lose a hunter on the map loses you.
export function trace(s, n, why = '') {
  const b = s.breach;
  if (!b || !n) return;
  const k = n > 0 ? (classOf(s) === 'infiltrator' ? 0.5 : 1) * (b.rules?.tripwire || 1) : 1;
  const was = b.trace;
  b.trace = Math.max(0, Math.min(100, Math.round(b.trace + n * k)));
  b.tracePeak = Math.max(b.tracePeak || 0, b.trace);
  if (b.trace === was) return;
  say(s, `${why ? `${why} ` : ''}Trace ${b.trace > was ? '+' : ''}${b.trace - was} (${b.trace}).`, b.trace > was ? 'breach-bad' : 'breach-good');
  if (was < TRACE.alarm && b.trace >= TRACE.alarm && cardOf(s).kind === 'Mailhub') say(s, 'ALARM. The mail daemon floods every fight with spam from here on.', 'breach-bad');
  if (b.trace >= TRACE.hunt && !b.hunter) spawnHunter(s);
  if (b.hunter && b.trace < TRACE.lose) { say(s, 'The hunter loses your trace and drops off the map.', 'breach-good'); b.hunter = null; }
}
// The hunter drops two or three rows ahead of you in this act (the next one, from its last rows), on the lane farthest
// from yours, and closes in from there.
function spawnHunter(s) {
  const b = s.breach, here = currentNode(s), step = here?.step || 0, act = here?.act ?? 0;
  for (const [ahead, same] of [[3, true], [2, true], [1, true], [3, false], [2, false]]) {
    const xs = nodeList(b.map).filter((n) => n.step === step + ahead && n.col != null && !b.cleared[n.id] && (!same || n.act === act));
    if (!xs.length) continue;
    const at = xs.sort((x, y) => Math.abs(y.col - (here?.col ?? 1.5)) - Math.abs(x.col - (here?.col ?? 1.5)))[0];
    b.hunter = { at: at.id, level: at.level + 1 };
    b.stats.hunted++;
    say(s, `TRACED. A hunter ICE drops onto ${at.path} and comes for you, a node for every move you make.`, 'breach-bad');
    return;
  }
}
// One step of the hunter toward you, along the map's links (either way).
function hunterStep(s) {
  const b = s.breach, h = b.hunter;
  if (!h || !b.at || h.at === b.at) return;
  const links = [...b.map.edges, ...(b.map.shortcuts || [])], nb = (id) => links.filter(([x, y]) => x === id || y === id).map(([x, y]) => (x === id ? y : x));
  const prev = { [b.at]: null }, q = [b.at];
  while (q.length) { const id = q.shift(); if (id === h.at) break; for (const x of nb(id)) if (!(x in prev)) { prev[x] = id; q.push(x); } }
  if (!(h.at in prev)) return;
  const to = prev[h.at];
  if (to && b.map.nodes[to]?.col != null) h.at = to; // it waits rather than stand on a gate or the core
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
    const hop = b.at && !nextOf(b.map, b.at).includes(n);
    // A quiet step: leaving a node where you raised no Trace lowers it.
    if (b.at && !b.loud && b.trace > 0) trace(s, TRACE.quiet, 'A quiet step.');
    b.loud = false;
    b.at = n.id; b.path.push(n.id);
    say(s, `cd ${n.path}${hop ? ' (a hop: the row between is skipped)' : ''}`, 'breach-cmd');
    hunterStep(s);
    if (b.hunter?.at === n.id) { b.pending = n.id; say(s, 'The hunter is here.', 'breach-bad'); fight(s, n, { ...opts, as: 'hunter' }); }
    else resolve(s, n, opts);
  }
  return s.logs.filter((e) => e.id > first);
}
const loud = (s, n, why) => { s.breach.loud = true; trace(s, n, why); };
function resolve(s, n, opts) {
  const b = s.breach;
  if (['virus', 'elite', 'gate', 'boss'].includes(n.kind)) { if (n.kind === 'elite') loud(s, TRACE.elite, 'An elite is loud.'); return fight(s, n, opts); }
  if (n.kind === 'cache') { b.screen = { kind: 'cache', node: n.id, read: false, pause: !!opts.pause }; return say(s, `${n.path}: cache.dat, ${n.tokens} tokens' worth${n.script ? ', and a script' : ''}.`); }
  if (n.kind === 'defrag') { b.screen = { kind: 'defrag', node: n.id }; return say(s, `${n.path}: a quiet sector. Defrag here.`); }
  if (n.kind === 'broker') { b.screen = { kind: 'broker', node: n.id, faction: n.faction, stock: brokerStock(s, n) }; return say(s, `${n.path}: ${BROKERS[n.faction].name} has a stall open.`); }
  if (n.kind === 'term') { b.screen = { kind: 'term', node: n.id, event: n.event, pause: !!opts.pause }; return say(s, `${n.path}: ${EVENTS[n.event].file}`); }
  if (n.kind === 'vault') { b.screen = { kind: 'vault', node: n.id }; return say(s, `${n.path}: a vault door. ${b.keys ? `You hold ${b.keys === 1 ? 'a keycard' : `${b.keys} keycards`}.` : 'You hold no keycard.'}`); }
  if (n.kind === 'switch') { b.screen = { kind: 'switch', node: n.id, pause: !!opts.pause }; return say(s, `${n.path}: a security switch, ${SWITCHES[n.effect].name.toLowerCase()}.`); }
}
// The fight a node brings: [key, seed, opts] for selectEncounter. as: 'hunter' (the hunter ICE, caught you here),
// 'ice' (a switch's guard), 'mirror' (the elite behind a mirrored cache).
export function fightOf(s, n, as = null) {
  const room = n.path;
  if (as === 'hunter') return ['tracer', (n.seed ^ 0x7ace) >>> 0, { mode: 'run', room, level: s.breach.hunter?.level || n.level + 1, name: 'HUNTER' }];
  if (as === 'ice') return ['watchdog', (n.seed ^ 0x1ce) >>> 0, { mode: 'run', room, level: n.level, name: 'SWITCH ICE' }];
  if (n.kind === 'gate') return [n.guard, n.seed, { mode: 'run', room, level: n.level }];
  const card = cardOf(s);
  if (n.kind === 'boss') return ['random', n.seed, { mode: 'run', room, level: n.level, family: BOSSES[n.boss]?.family || card.family, boss: n.boss, mutation: null, name: residentName(card).toUpperCase(), author: card.author, ...(card.bossHp ? { bossHp: card.bossHp } : {}) }];
  const v = n.sample || n, elite = n.kind === 'elite' || as === 'mirror';
  // A rolled genome (genomeOfNode): its third part forced through createVirus's genes, no mutation there (breach.mjs
  // lays the rolled ones on parts after, applyMutations).
  const genome = v.genes ? { genes: v.third ? [v.third] : [], mutation: null } : (v.mutation === null ? { mutation: null } : {});
  return ['random', v.seed ?? n.seed, { mode: 'run', room, level: n.level, family: v.family, ...(v.strain ? { strain: v.strain } : {}), ...genome, author: v.author, ...(elite ? { elite: true, eliteHp: BREACH.eliteHp } : {}) }];
}
export function fight(s, n, { pause = false, sample = null, as = null } = {}) {
  const b = s.breach;
  s.encounter = null;
  b.max = sigMax(s, b);
  b.signal = Math.min(b.signal, b.max);
  b.fightFrom = b.signal;
  s.run = { loc: 'breach', breach: true, cwd: n.path, integrity: b.signal, max: b.max, pack: [], visited: [n.path] };
  const [key, seed, opts] = fightOf(s, sample ? { ...n, kind: 'virus', sample } : n, as);
  selectEncounter(s, key, seed, { ...opts, quiet: true });
  const e = s.encounter;
  if (!e) return;
  e.breach = n.id;
  if (sample) e.breachSample = true;
  if (as) e.breachAs = as;
  const kind = as === 'mirror' ? 'elite' : as || (sample ? 'virus' : n.kind);
  const base = BREACH.size[kind] || BREACH.size.virus, more = b.card?.size || {};
  const louder = b.rules?.loud ? BREACH.loud : { hp: 1, dmg: 1 }; // heat 1: every fight bigger and harder
  const mine = BREACH.classSize[subOf(s)] || BREACH.classSize[classOf(s)] || {};
  const size = { hp: base.hp * (more.hp || 1) * louder.hp * (mine.hp || 1), dmg: base.dmg * (more.dmg || 1) * louder.dmg * (mine.dmg || 1) }; // a campaign card's own sizing on top, and your class's
  for (const p of e.virus.parts) {
    p.max = p.integrity = Math.max(1, Math.round(p.max * size.hp));
    const a = p.attack;
    if (a && ['damage', 'encrypt'].includes(a.effect)) a.amount = Math.max(1, Math.round(a.amount * size.dmg));
    if (a?.hit) a.hit = Math.max(1, Math.round(a.hit * size.dmg));
    if (a?.rampBy) a.rampBy = Math.max(1, Math.round(a.rampBy * size.dmg));
  }
  const g = sample || n;
  const tells = g.tells;
  if (tells && !as?.match(/hunter|ice/) && n.kind !== 'gate' && n.kind !== 'boss') e.virus.tellSet = tells;
  // The rolled genome: its third part is marked, and its mutations go on parts.
  if (g.genes && !['hunter', 'ice'].includes(as)) applyMutations(s, e.virus, g, g.seed ?? n.seed);
  // Heat 2: gates bring one more tell (Lock). Heat 8: the Resident is bigger and re-arms at 80%.
  if (n.kind === 'gate' && !as && b.rules?.gateTell) { e.virus.tellSet = [...(TELL_SETS[e.virus.family] || []), 'lock']; e.virus.extraTells = 1; }
  if (n.kind === 'boss' && b.rules?.resident) { for (const p of e.virus.parts) p.max = p.integrity = Math.round(p.max * 1.25); e.virus.phases = [{ at: 0.8, do: ['rearm'], say: `${e.virus.name} re-arms every part.`, done: false }, ...(e.virus.phases || [])]; }
  // The next gate (or the Resident, after the last one) remembers what you did on the way: a finished cron job, used
  // creds, a gate relay switched off. Kernel Hook thins the Resident.
  if (!as && (n.kind === 'gate' || n.kind === 'boss')) {
    const gx = b.fx.gate || {};
    if (gx.delay) { const p = e.virus.parts.find((x) => x.special && x.attack) || attackers(s)[0]; if (p?.attack) p.attack.due += gx.delay; }
    if (gx.keys) for (const p of e.virus.parts) { if (p.maxArmor > 0) { p.maxArmor--; p.armor = Math.min(p.armor, p.maxArmor); } if (p.attack && p.attack.interval > 2) p.attack.interval--; }
    if (b.switches[n.act] === 'gate') { for (const p of e.virus.parts) { p.max = p.integrity = Math.max(1, Math.round(p.max * 0.8)); if (p.attack && p.attack.due < 900) p.attack.due += 2; } }
    if (n.kind === 'boss' && b.fx.kernel) for (const p of e.virus.parts) { if (p.maxArmor > 0) { p.maxArmor--; p.armor = Math.min(p.armor, p.maxArmor); } if (b.fx.kernel > 1) p.max = p.integrity = Math.max(1, Math.round(p.max * 0.9)); }
    b.fx.gate = null;
  }
  // A patch server switched off: every virus left in its act loses a ◆ on every part.
  if (b.switches[n.act] === 'armor' && !as?.match(/hunter|ice/) && n.kind !== 'boss') for (const p of e.virus.parts) if (p.maxArmor > 0) { p.maxArmor--; p.armor = Math.min(p.armor, p.maxArmor); }
  // Mailhub, after the alarm: a Spam Flood joins the fight.
  if (cardOf(s).kind === 'Mailhub' && b.trace >= TRACE.alarm && as !== 'ice') spamFlood(s, e);
  if (b.fx.warm) for (const p of attackers(s)) if (p.attack.due < 900) p.attack.due += 1;
  if (b.fx.warmSigint && e.readyAt) delete e.readyAt.sigint;
  // Spam Cannon on a linked server: every fight here starts thinner.
  if (b.fx.thin) for (const p of e.virus.parts) p.max = p.integrity = Math.max(1, Math.round(p.max * (1 - b.fx.thin)));
  // An elite, a gate or the Resident (or a mirror's elite) enrages if it lasts.
  const rage = BREACH.enrage[as === 'mirror' ? 'elite' : as ? null : n.kind];
  if (typeof rage === 'number') e.enrageAt = rage;
  // A campaign kill pays its own XP (campaign.mjs CAMPAIGN.xp): the Resident three times over, a gate half again.
  if (b.xpMult) e.breachXp = b.xpMult * (n.kind === 'boss' && !as ? 3 : (n.kind === 'gate' && !as) || as === 'hunter' ? 1.5 : 1);
  const by = e.virus.author ? ` ${e.virus.author.toUpperCase()}.` : '';
  say(s, `${e.virus.name} holds ${n.path}. Level ${e.virus.level}.${by}`, 'intrusion');
  command(s, 'engage');
  patchRules(s); // your gear's skill rules, for this fight
  if (pause && s.encounter) s.encounter.paused = true;
}
// A Mailhub's spam: a weak part, about a twelfth of the virus's Integrity, that hits for a quarter of its average.
function spamFlood(s, e) {
  const total = e.virus.parts.reduce((n, p) => n + p.max, 0), hits = attackers(s).map((p) => p.attack.amount || 0).filter(Boolean);
  const hp = Math.max(8, Math.round(total * 0.08)), dmg = Math.max(2, Math.round((hits.reduce((a, x) => a + x, 0) / Math.max(1, hits.length)) * 0.25));
  e.virus.parts.push({ id: 'spam', name: 'Spam Flood', integrity: hp, max: hp, armor: 0, maxArmor: 0, patchAt: null, veiled: false, loot: null, special: false, spam: true, attack: { name: 'Junk Mail', effect: 'damage', amount: dmg, interval: 3, due: e.cycle + 2 }, exposedUntil: 0, lastDamaged: 0, boosted: false });
  emit(s, 'status', `A Spam Flood joins the fight: ${hp} Integrity, ${dmg} damage every 3 cycles.`, { target: 'spam' });
}
// The end of each cycle in a breach fight (combat.mjs hooks.cycleEnd): enrage, and a Lab's overheat.
hooks.cycleEnd = (s) => {
  const e = s.encounter, b = s.breach;
  if (!e?.breach || !b) return;
  const R = BREACH.enrage;
  if (e.enrageAt && e.cycle >= e.enrageAt && (e.cycle - e.enrageAt) % R.every === 0) {
    const k = e.enraged ? R.step : R.first;
    e.enraged = (e.enraged || 0) + 1;
    for (const p of attackers(s)) { const a = p.attack; if (a.amount) a.amount = Math.round(a.amount * k); if (a.hit) a.hit = Math.round(a.hit * k); }
    emit(s, 'warning', `${e.virus.name} ENRAGES: its attacks deal ${Math.round((k - 1) * 100)}% more.`, {});
  }
  if (cardOf(s).kind === 'Lab' && e.cycle >= OVERHEAT.from) {
    const d = defender(s), you = Math.min(d.integrity, Math.max(1, Math.round(d.max * OVERHEAT.you)));
    d.integrity -= you;
    for (const p of livingParts(s)) hit(s, p, Math.max(1, Math.round(p.max * OVERHEAT.share)), { by: 'Overheat', pierce: true, server: true });
    emit(s, 'server-hit', `Overheat: the rack burns you for ${you}, and every part with you. Signal ${d.integrity}/${d.max}.`, { amount: you });
  }
};

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

// ---------- loot ----------
// A protocol into the pack, rolled for your class (its skill rules can roll), at the node's level and the breach's
// gear levels (heat, Testbed). Returns the item.
function gearDrop(s, n, rarity, why = 'Dropped: ') {
  const b = s.breach;
  const it = addItem(s, rollItem(rnd(b, 5), { level: n.level + (b.fx.gearLevel || 0), rarity, cls: classOf(s) }), why);
  if (it) { b.pack.push(it.id); b.stats.found++; say(s, `${itemLabel(it)} goes in your pack.`, 'breach-good'); }
  return it;
}
// What a won fight drops, by kind (BREACH.loot). Rare odds from heat move a blue to a yellow.
function dropsFor(s, n, kind) {
  const b = s.breach, r = rnd(b, 13), L = BREACH.loot[kind], rare = (b.fx.rareOdds || 0) / 100;
  if (!L) return;
  const rarity = () => { const x = r(); return x < (L.custom || 0) + rare ? 'custom' : x < (L.custom || 0) + rare + (L.white || 0) ? 'stock' : 'tuned'; };
  if (kind === 'boss') gearDrop(s, n, rarity(), `${residentName(cardOf(s))} drops: `);
  else if (r() < L.gear) gearDrop(s, n, rarity());
  if (L.script && r() < L.script) giveScript(s, rollScript(r, kind === 'boss' ? 'uncommon' : null), 'Recovered: ');
}

// The end of a breach fight (combat.mjs finish, through hooks.breachEnd): the drops, the rewrite, the pack.
function fightOver(s, result) {
  const b = s.breach, e = s.encounter, n = b?.map.nodes[e?.breach];
  if (!b || !n) return;
  unpatchRules();
  b.stats.landed += Object.values(e.metrics?.tells || {}).reduce((k, x) => k + x.landed, 0);
  if ((n.kind === 'elite' || e.breachAs === 'mirror') && result === 'victory') b.stats.elites++;
  if (result !== 'victory') return lose(s, `${e.virus.name} took your Signal to 0 at ${n.path}.`);
  b.kills++;
  b.stats.low = Math.min(b.stats.low, (s.run?.integrity ?? b.signal) / Math.max(1, s.run?.max ?? b.max));
  const as = e.breachAs;
  if (e.breachSample) { tokens(s, BREACH.tokens.sandbox); giveScript(s, rollScript(rnd(b, 11), 'uncommon'), 'The sample carried: '); return next(s); }
  if (as === 'hunter') {
    say(s, 'Hunter down.', 'breach-good');
    b.hunter = null;
    giveScript(s, rollScript(rnd(b, 17)), 'The hunter carried: ');
    b.trace = TRACE.after; say(s, `Trace drops to ${TRACE.after}.`, 'breach-good');
    if (b.pending) queue(s, { kind: 'ahead', node: b.pending });
    b.pending = null;
    return next(s);
  }
  if (as === 'ice') { switchDown(s, n); b.cleared[n.id] = true; trace(s, TRACE.ice, 'The switch goes quiet.'); return next(s); }
  if (as === 'mirror') { b.cleared[n.id] = true; dropsFor(s, n, 'elite'); return next(s); }
  b.cleared[n.id] = true;
  if (n.kind === 'virus' || n.kind === 'elite') {
    if (n.key) { b.keys++; say(s, `The ${e.virus.name} carried a keycard. You hold ${b.keys === 1 ? 'one' : b.keys}.`, 'breach-good'); }
    if (n.kind === 'elite') { dropsFor(s, n, 'elite'); if (b.fx.service > 1) bank(s); }
    if (n.sub) rewriteFor(s, n);
  } else if (n.kind === 'gate') {
    dropsFor(s, n, 'gate');
    if (b.fx.nightly && b.trace) trace(s, -b.fx.nightly, 'Nightly Build rotates the logs.');
    queue(s, { kind: 'gate', node: n.id });
    breachHooks.gate?.(s, n); // a checkpoint (campaign.mjs)
  } else if (n.kind === 'boss') {
    // The Resident is a breach's gear moment: a protocol, blue or better (its uniques roll on their own, combat.mjs
    // bossUnique), and now and then a script.
    dropsFor(s, n, 'boss');
    queue(s, { kind: 'capture' });
  }
  next(s);
}
hooks.breachEnd = (s, result) => fightOver(s, result);
hooks.emitted = (s, ev) => {
  const b = s.breach;
  if (hooks.emitted.busy) return;
  hooks.emitted.busy = true;
  try {
    if (b && !b.result && ev.type === 'xp' && ev.amount > 0) b.xp += ev.amount;
    if (b && s.encounter?.breach && ev.type === 'broken' && !ev.c2) mutationEnds(s, part(s, ev.target));
    ruleEvent(s, ev);
  } finally { hooks.emitted.busy = false; }
};
hooks.commanded = (s, x) => ruleCommand(s, x);
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

// A broker's price, less Price Fix's output.
export const priceOf = (b, sc, x) => Math.round(x * (1 - (b.fx.discount || 0)));
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
// A switch goes down: its effect on the act's enemies.
function switchDown(s, n) {
  const b = s.breach;
  b.switches[n.act] = n.effect;
  say(s, `${SWITCHES[n.effect].name} down. ${eventText(n, SWITCHES[n.effect].text, b.map.acts)}`, 'breach-good');
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
  const done = () => { b.cleared[sc.node] = true; next(s); };
  if (sc.kind === 'rewrite') {
    const id = sc.options[Number(arg)];
    if (verb !== 'pick' || !id) deny(s, 'Pick a rewrite.');
    else {
      const r = REWRITES[id], tier = sc.was?.id === id ? Math.max(sc.was.tier, sc.tier) : sc.tier; // re-imaging keeps the better tier
      b.rewrites[sc.sub] = { id, tier };
      say(s, `${sc.sub} rewritten: ${r.name}${tier > 1 ? ' II' : ''}. Once you capture the server: ${r.output[tier - 1]}`, 'breach-good');
      next(s);
    }
  } else if (sc.kind === 'cache') {
    const n = b.map.nodes[sc.node];
    if (verb === 'cat') { sc.read = true; say(s, n.mirror ? 'cat cache.dat: the file reads back your own handle. It is a mirror, and something waits behind it.' : n.bait ? 'cat cache.dat: a canary string in every block. Pulling it trips the alarm.' : `cat cache.dat: clean. Tokens${n.script ? ', and a script' : ''}.`, n.bait || n.mirror ? 'breach-bad' : 'breach'); }
    else if (verb === 'pull') {
      if (n.mirror) { b.screen = null; say(s, 'The mirror breaks. An elite steps out of it.', 'breach-bad'); fight(s, n, { as: 'mirror', pause: !!sc.pause }); return out(); }
      if (n.bait) { const lost = Math.round(b.max * BREACH.baitCost); b.signal = Math.max(1, b.signal - lost); say(s, `The cache was bait. The canary costs you ${lost} Signal.`, 'breach-bad'); loud(s, TRACE.bait, 'The canary sings.'); }
      else { tokens(s, n.tokens); if (n.script) giveScript(s, n.script, 'Pulled: '); }
      done();
    } else if (verb === 'leave') { say(s, 'You leave the cache alone.'); done(); }
    else deny(s, 'cat, pull or leave.');
  } else if (sc.kind === 'defrag') {
    // Rest or re-slot. Service Account (a captured sshd): jack out here with your pack.
    if (verb === 'rest' && !sc.reslot) { const n = Math.min(b.max - b.signal, Math.round(b.max * restShare(b))); b.signal += n; b.stats.rests++; say(s, `Defrag: +${n} Signal (${b.signal}/${b.max}).`, 'breach-good'); trace(s, TRACE.rest, 'The logs settle.'); b.loud = true; done(); }
    else if (verb === 'reslot' && !sc.reslot) { sc.reslot = true; say(s, 'Re-slot: change your keys, then close it.'); }
    else if (verb === 'done' && sc.reslot) { say(s, 'Keys set.'); done(); }
    else if (verb === 'slot' && sc.reslot) { command(s, String(arg)); }
    else if (verb === 'jackout' && b.fx.service && !sc.reslot) { jackOut(s, 'Service Account'); }
    else deny(s, 'rest or reslot.');
  } else if (sc.kind === 'broker') {
    const price = (x) => priceOf(b, sc, x), B = BROKERS[sc.faction];
    if (verb === 'buy') {
      const c = sc.stock[Number(arg)];
      if (!c || c.sold) deny(s, 'Sold, or not on the stall.');
      else if (b.tokens < price(c.price)) deny(s, `That costs ${price(c.price)} tokens. You have ${b.tokens}.`);
      else if (scriptsOf(s).length >= slotsOf(s)) deny(s, `Your ${slotsOf(s)} script slots are full. Run one first.`);
      else { b.tokens -= price(c.price); c.sold = true; say(s, `Bought for ${price(c.price)} tokens.`); giveScript(s, c.id, 'Bought: '); }
    } else if (verb === 'patch') {
      const cost = price(B.patch);
      if (sc.patched) deny(s, 'One patch a stall.');
      else if (b.tokens < cost) deny(s, `A patch costs ${cost} tokens. You have ${b.tokens}.`);
      else { b.tokens -= cost; sc.patched = true; const n = Math.min(b.max - b.signal, Math.round(b.max * PRICES.patch)); b.signal += n; say(s, `Patched: +${n} Signal (${b.signal}/${b.max}).`, 'breach-good'); }
    } else if (verb === 'service') {
      // The stall's own service: LANTERN shows the act ahead, Kestrel scrubs your Trace. Once a stall.
      const sv = B.service, cost = sv && price(sv.price);
      if (!sv || sc.served) deny(s, sv ? 'One service a stall.' : 'This stall has no service.');
      else if (b.tokens < cost) deny(s, `That costs ${cost} tokens. You have ${b.tokens}.`);
      else {
        b.tokens -= cost; sc.served = true;
        if (sv.id === 'reveal') { const n = b.map.nodes[sc.node]; (b.fx.reveal ||= []).push(n.act + (n.row === b.map.rows - 1 && n.act < b.map.acts - 1 ? 1 : 0)); say(s, `LANTERN sells you the map: act ${b.fx.reveal.at(-1) + 1} shows whole.`, 'breach-good'); }
        if (sv.id === 'scrub') trace(s, TRACE.scrub, 'Kestrel scrubs your logs.');
      }
    } else if (verb === 'leave') { say(s, 'You close the stall.'); done(); }
    else deny(s, 'buy, patch or leave.');
  } else if (sc.kind === 'term') {
    const i = Number(arg);
    if (verb !== 'choose' || !EVENTS[sc.event].options[i]) deny(s, 'Choose an option.');
    else termChoose(s, sc, i);
  } else if (sc.kind === 'vault') {
    const n = b.map.nodes[sc.node];
    if (sc.opened) { if (verb === 'leave') done(); else deny(s, 'The vault is empty now. Leave it.'); }
    else if (verb === 'open' && b.keys > 0) { b.keys--; say(s, 'The keycard opens the vault.'); loud(s, TRACE.open, 'The door logs it.'); openVault(s, sc, n); }
    else if (verb === 'open') deny(s, 'You hold no keycard. A virus carrying one shows it on the map.');
    else if (verb === 'force') { const lost = Math.round(b.max * 0.1); b.signal = Math.max(1, b.signal - lost); say(s, `You force the door. It costs you ${lost} Signal.`, 'breach-bad'); loud(s, TRACE.force, 'The alarm on the door goes off.'); openVault(s, sc, n); }
    else if (verb === 'leave') { say(s, 'You leave the vault shut.'); done(); }
    else deny(s, 'open, force or leave.');
  } else if (sc.kind === 'switch') {
    const n = b.map.nodes[sc.node];
    if (verb === 'fight') { b.screen = null; say(s, 'You go at the switch\'s ICE.'); fight(s, n, { as: 'ice', pause: !!sc.pause }); }
    else if (verb === 'splice') { switchDown(s, n); loud(s, TRACE.splice, 'The splice trips a log.'); done(); }
    else if (verb === 'leave') { say(s, 'You leave the switch up.'); done(); }
    else deny(s, 'fight, splice or leave.');
  } else if (sc.kind === 'ahead') {
    // The hunter is down, and the node it caught you on is still there.
    if (verb === 'enter') { b.screen = null; resolve(s, b.map.nodes[sc.node], { pause: !!arg }); }
    else deny(s, 'Go on into the node.');
  } else if (sc.kind === 'gate') {
    if (verb === 'goon') { bank(s); say(s, 'You go deeper.'); next(s); }
    else if (verb === 'jackout') jackOut(s);
    else deny(s, 'Go on, or jack out.');
  }
  return out();
}
// A vault opens: what it held, and its log.
function openVault(s, sc, n) {
  const b = s.breach, v = n.vault || { kind: 'gear', rarity: 'tuned' };
  sc.opened = true; b.stats.vaults++;
  if (v.kind === 'gear') sc.got = gearDrop(s, n, v.rarity, 'Vault: ')?.id || null;
  else sc.got = giveScript(s, v.script, 'Vault: ') ? v.script : null;
  if (v.log) say(s, `The vault keeps a log: ${v.log}`);
}
function jackOut(s, by = null) {
  const b = s.breach;
  bank(s); b.result = 'out'; b.screen = { kind: 'result' }; unpatchRules();
  say(s, `${by ? `${by}: ` : ''}JACKED OUT of ${cardOf(s).name}. Your pack is banked. The server stays uncaptured.`, 'jacked-out');
  breachHooks.over?.(s, 'out');
}
// A defrag's rest: 30% of your Signal, 20% at heat 4.
export const restShare = (b) => b?.rules?.rest ?? BREACH.rest;
function bank(s) {
  const b = s.breach;
  if (b.pack.length) say(s, `Pack banked: ${b.pack.length} ${b.pack.length === 1 ? 'item' : 'items'}.`, 'breach-good');
  b.banked.push(...b.pack); b.pack = [];
}
function termChoose(s, sc, i) {
  const b = s.breach, n = b.map.nodes[sc.node], cost = (k) => { const lost = Math.round(b.max * k); b.signal = Math.max(1, b.signal - lost); return lost; };
  const done = () => { b.cleared[n.id] = true; next(s); };
  const ev = sc.event;
  if (ev === 'cron' && i === 0) { const lost = cost(0.1); (b.fx.gate ||= {}).delay = 2; say(s, `You finish the job. It costs you ${lost} Signal, and ${nextGuard(n, b.map.acts).toLowerCase()}'s signature part will attack 2 cycles late.`, 'breach-good'); loud(s, 10, 'The job runs as root.'); }
  else if (ev === 'cron') { tokens(s, 15); say(s, 'You wipe the job.'); }
  else if (ev === 'keys' && i === 0) { (b.fx.gate ||= {}).keys = true; say(s, `You load the creds. ${nextGuard(n, b.map.acts)} will open thinner, and angrier.`, 'breach-good'); }
  else if (ev === 'honeytoken' && i === 0) { tokens(s, 50); say(s, 'The file was a honeytoken.', 'breach-bad'); loud(s, 25, 'It phones home.'); }
  else if (ev === 'sandbox' && i === 0) {
    // The sample: a wild virus at this act's level, and a script for beating it.
    const r = rnd(b, 29);
    const sample = { ...virusOf(r, n, n.level, false, cardOf(s)), seed: Math.floor(r() * 2 ** 31) };
    b.cleared[n.id] = true; b.screen = null;
    say(s, 'You open the cage.');
    return fight(s, n, { sample, pause: !!sc.pause });
  } else say(s, 'You leave it.');
  done();
}
// Who a terminal's or a switch's gate effects reach: the next gate, or the Resident after the last one.
export const nextGuard = (n, acts = ACTS.length) => (n.act < acts - 1 ? 'The next gate' : 'The Resident');
export const eventText = (n, text, acts = ACTS.length) => text.replace('{Next}', nextGuard(n, acts));
function brokerStock(s, n) {
  const b = s.breach, B = BROKERS[n.faction];
  return scriptStock(rnd(b, 41), B.stock, B.floor || null).map((id) => ({ id, price: scriptPrice(id) }));
}

// ---------- the end ----------
function lose(s, why) {
  const b = s.breach;
  b.result = 'lost';
  const lost = [];
  for (const id of b.pack) { const it = stashItem(s, id); if (it) { lost.push(itemLabel(it)); for (const r of Object.values(s.gear?.rigs || {})) if (Array.isArray(r)) for (let i = 0; i < r.length; i++) if (r[i] === id) r[i] = null; s.stash = s.stash.filter((x) => x.id !== id); } }
  b.lost = { why, items: lost };
  b.pack = []; b.tokens = 0; b.queue = []; b.hunter = null;
  b.screen = { kind: 'result' };
  unpatchRules();
  say(s, `SIGNAL LOST. ${why}${lost.length ? ` ${lost.length} unbanked ${lost.length === 1 ? 'item' : 'items'} lost.` : ''} XP, banked gear and your scripts stay.`, 'breach-bad');
  breachHooks.over?.(s, 'lost');
}
function capture(s) {
  const b = s.breach, card = cardOf(s);
  bank(s);
  // The capture bonus: a third of the breach's kill XP (docs/roguelite.md 6.1). Only the campaign pays it.
  if (b.xpMult && b.xp > 0) gainXp(s, Math.round(b.xp / 3), `${card.name} captured`);
  b.result = 'won';
  b.screen = { kind: 'result' };
  unpatchRules();
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
    trace: b.tracePeak || 0, vaults: b.stats?.vaults || 0, scripts: b.stats?.scripts || 0, hunted: b.stats?.hunted || 0,
  };
}

// ---------- the terminal ----------
// ls, cd, tree, and the screen's verbs typed: a breach is still a terminal.
const lsTag = (n) => `${n.kind === 'term' ? 'term' : n.kind}${n.key ? ' · keycard' : ''}`;
export function breachCommand(s, text) {
  const b = s.breach, first = s.serial;
  const [word, ...rest] = text.trim().toLowerCase().split(/\s+/);
  const arg = rest.join(' ');
  const out = () => s.logs.filter((e) => e.id > first);
  if (word === 'ls') {
    const xs = reachable(s);
    say(s, xs.length ? xs.map((n, i) => `${i + 1}  ${(n.kind === 'gate' ? 'gate' : n.kind === 'boss' ? 'core' : n.sub || 'tmp')}/  [${visible(s, n) ? lsTag(n) : '?'}]${b.hunter?.at === n.id ? '  HUNTER' : ''}`).join('\n') : b.screen ? 'Finish what is on screen first.' : 'Nowhere to go.', 'breach-out');
    return out();
  }
  if (word === 'cd' || word === 'go') {
    const xs = reachable(s), n = /^\d+$/.test(arg) ? xs[Number(arg) - 1] : xs.find((x) => x.id === arg) || xs.find((x) => (x.sub || x.kind) === arg.replace(/\/$/, ''));
    return n ? go(s, n.id) : (deny(s, `cd: ${arg || '?'}: not reachable. Type ls.`), out());
  }
  if (word === 'tree') { say(s, treeLines(s).join('\n'), 'breach-out'); return out(); }
  if (word === 'pick' || word === 'buy' || word === 'choose') return act(s, word, Number(arg) - 1);
  if (['cat', 'pull', 'leave', 'rest', 'reslot', 'done', 'patch', 'goon', 'service', 'open', 'force', 'splice', 'fight', 'enter'].includes(word)) return act(s, word);
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
      const cells = ns.map((n) => (b.at === n.id ? '@' : b.hunter?.at === n.id ? 'H' : b.cleared[n.id] ? 'x' : visible(s, n) ? (n.key ? 'K' : MARK[n.kind]) : '?'));
      lines.push(`│  ${(row === rows ? (act === acts - 1 ? 'core' : 'gate') : rowSub(act, row, card) || 'tmp').padEnd(7)} ${cells.join('  ')}`);
    }
  }
  return lines;
}
export const MARK = { virus: 'v', elite: 'E', cache: '$', defrag: '+', broker: 'b', term: '>', vault: 'V', switch: 'S', gate: 'G', boss: 'R' };

// ---------- the bot (breachsim.mjs, campaignsim.mjs) ----------
// How a sensible player walks the map: fights while Signal is high, rests when it's low, picks up keycards and opens
// vaults with them, takes switches down, keeps clear of the hunter, and spends tokens on scripts and patches. It
// fights with the planner (planner.mjs) and runs a script when one fits (botScript).
export const BOT = { rest: 0.7 };
// The bot's own dice (never the breach's).
const botRand = (b) => seeded((b.seed * 7919 + (b.botN = (b.botN || 0) + 1) * 104729) >>> 0)();
export function botRoute(s) {
  const b = s.breach, xs = reachable(s);
  if (!xs.length) return null;
  const sig = b.signal / b.max, hunter = b.hunter?.at;
  const near = (id) => hunter && (id === hunter || exitsOf(b.map, id).some((x) => x.id === hunter) || exitsOf(b.map, hunter).some((x) => x.id === id));
  const score = (n) => {
    const look = [n, ...exitsOf(b.map, n.id)];
    let v = 0;
    for (const x of look) {
      const k = x === n ? 1 : 0.4, seen = visible(s, x);
      if (!seen) continue;
      if (x.kind === 'defrag') v += k * (sig < BOT.rest ? 6 : 1);
      if (x.kind === 'broker') v += k * (b.tokens >= 60 ? 3 : sig < 0.5 && b.tokens >= 25 ? 2 : 0.5);
      if (x.kind === 'virus') v += k * (sig > 0.45 ? 2.5 + (x.key ? 1.5 : 0) : -1);
      if (x.kind === 'elite') v += k * (sig > 0.8 ? 2.5 : -4);
      if (x.kind === 'cache') v += k * 2;
      if (x.kind === 'term') v += k * 1.5;
      if (x.kind === 'vault') v += k * (b.keys ? 4 : 0.5);
      if (x.kind === 'switch') v += k * 2.5;
      if (near(x.id)) v -= k * (sig > 0.75 ? 1 : 5);
    }
    return v;
  };
  return xs.map((n) => ({ n, v: score(n) + botRand(b) * 0.01 })).sort((a, c) => c.v - a.v)[0].n.id;
}
// What to choose on a screen.
const REWRITE_PREF = ['restorepoint', 'memorymap', 'warmstart', 'kernelhook', 'zonetransfer', 'spamcannon', 'forgedkeys', 'testbed', 'slushfund', 'archive', 'maildrop', 'audittrail', 'listeningpost', 'nightlybuild', 'jumphost', 'serviceaccount', 'bountyboard', 'range', 'sinkhole', 'pricefix'];
export function botPick(s) {
  const b = s.breach, sc = b.screen, sig = b.signal / Math.max(1, b.max);
  if (!sc) return null;
  if (sc.kind === 'rewrite') { const i = sc.options.map((id, k) => [k, REWRITE_PREF.indexOf(id)]).sort((a, c) => a[1] - c[1])[0][0]; return ['pick', i]; }
  if (sc.kind === 'cache') { const n = b.map.nodes[sc.node]; if (!sc.read) return ['cat']; return [n.bait || (n.mirror && sig < 0.75) ? 'leave' : 'pull']; }
  if (sc.kind === 'defrag') return ['rest'];
  if (sc.kind === 'vault') return sc.opened ? ['leave'] : b.keys ? ['open'] : b.trace < 25 && sig > 0.7 ? ['force'] : ['leave'];
  if (sc.kind === 'switch') return sig > 0.65 ? ['fight'] : b.trace < 40 ? ['splice'] : ['leave'];
  if (sc.kind === 'broker') {
    const price = (x) => priceOf(b, sc, x), B = BROKERS[sc.faction];
    if (!sc.patched && sig < 0.6 && b.tokens >= price(B.patch)) return ['patch'];
    if (B.service?.id === 'scrub' && !sc.served && b.trace >= 50 && b.tokens >= price(B.service.price)) return ['service'];
    const can = sc.stock.map((c, i) => [c, i]).filter(([c]) => !c.sold && b.tokens >= price(c.price));
    if (can.length && scriptsOf(s).length < slotsOf(s)) return ['buy', can.sort(([x], [y]) => y.price - x.price)[0][1]];
    return ['leave'];
  }
  if (sc.kind === 'term') { const ev = sc.event; return ['choose', ev === 'cron' ? (sig > 0.6 && b.trace < 50 ? 0 : 1) : ev === 'keys' ? 0 : ev === 'honeytoken' ? (b.trace < 30 ? 0 : 1) : (sig > 0.7 ? 0 : 1)]; }
  if (sc.kind === 'gate') return ['goon'];
  if (sc.kind === 'ahead') return ['enter'];
  return null;
}
// When a sensible player runs a script: a heal when low, a shield or a delay before a heavy hit, the burst and tempo
// ones early in a big fight. Returns [slot] or null.
export function botScript(s) {
  const e = s.encounter, bag = scriptsOf(s);
  if (!e?.breach || e.scriptUsed || !bag.length || !active(s)) return null;
  const d = defender(s), low = d.integrity / Math.max(1, d.max), n = s.breach.map.nodes[e.breach], big = ['elite', 'gate', 'boss'].includes(n?.kind) || !!e.breachAs;
  const heavy = attackers(s).some((p) => p.attack.due <= e.cycle + 1 && (p.attack.amount || 0) >= d.integrity * 0.3);
  const told = !!e.virus.tells?.list?.some((t) => t.told && t.kind !== 'mimic');
  const at = (ids) => bag.findIndex((id) => ids.includes(id));
  let i = -1;
  if (low < 0.35) i = at(['sasser', 'krack', 'slowloris', 'shellshock']);
  if (i < 0 && heavy) i = at(['krack', 'shellshock', 'slowloris']);
  if (i < 0 && told && big) i = at(['ripple20', 'meltdown']);
  if (i < 0 && big && e.cycle <= 2) i = at(['bluekeep', 'spectre', 'mirai', 'conficker']);
  if (i < 0 && big && e.cycle >= 6) i = at(['conficker', 'meltdown', 'mirai']);
  return i >= 0 ? [i] : null;
}
// Run the bot's script, if it wants one.
export function botScriptRun(s) { const x = botScript(s); if (x) runScript(s, x[0]); return !!x; }

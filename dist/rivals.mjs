// Rivals (docs/rivals.md, GAME_RULES.md "Rivals"): named runners, one per crew, who race you to a server's vault and
// fight you trainer-style. Pure like floorplan.mjs, which calls these from its moves and fights (R.visit.rival).
//
//   the roll     at most one a visit, on a traced server whose vault is shut, rolled like the Exfil (netrooms.mjs
//                WORLD.rival: RIVAL.chance, on your own cooldown). It starts as far from the vault as the entry is.
//   the walk     a room for each of your moves, by the shortest route to the vault (never the Core), no key needed.
//                At the vault it opens it and takes its files, then walks to the entry and jacks out with them (got
//                away). Its room, its route and the vault show through the fog.
//   aggro        when it reaches your room (or you walk into its), it pulls you into its fights. No step back.
//   the fights   2 on floors 1–2, 3 from floor 3, one after another, one level over you. Your Signal carries; each
//                fight starts your cooldowns fresh. Between fights it adds one part to the next, read from how you
//                won the last (readFight), shown before you engage.
//   stakes       beat it and you take its pack, with the vault's files if it opened it. Lose and it's gone with both.
//   memory       s.rivals[id]: meetings, your record against it, how it last ended, the command HUSH quotes.
import { emit, encounterVirus, hackerLevel, addItem, classOf, hooks } from './combat.mjs';
import { GENES } from './genes.mjs';
import { AUTHORS } from './authors.mjs';
import { ABILITIES } from './data.mjs';
import { rollItem, seeded } from './gear.mjs';
import { distances, pathTo, ROOMS, WORLD } from './floorplan.mjs';

export const RIVAL = {
  chance: 0.2, cooldownMs: 60 * 60000, // a visit's roll, and your cooldown after one turns up
  level: 1, // levels over you
  fights: (floor) => (floor >= 3 ? 3 : 2),
  credits: 4, // its pack: this many Stashes' worth of credits, and an item one level over you
  rarity: 'tuned',
};

// The roster. lineup: its fights in order, a family (genes: its third) or a named build (strain). reads: [read,
// counter] in order, the first that matches, else the last.
export const RIVALS = {
  kudzu: {
    name: 'KUDZU', crew: 'swarmline', lineup: [{ family: 'trojan' }, { family: 'worm', genes: ['twin'] }, { family: 'worm' }],
    reads: [['burst', 'patcher'], ['spread', 'hotspare'], ['slow', 'floodramp']],
    line: (m) => (m.met > 1 ? 'hiii again!! brought friends' : 'hiii!! that vault is mine!!'),
    wick: { first: 'kudzu. swarmline sends it. it grows back if you let it.', won: 'kudzu. you beat it last time. it\'s been practising.', counter: { patcher: 'it saw you burst the first one. it brought a patcher.' } },
  },
  escrow: {
    name: 'ESCROW', crew: 'tollgate', lineup: [{ family: 'ransomware' }, { family: 'wiper' }, { family: 'cryptominer' }],
    reads: [['burst', 'mutexlock'], ['slow', 'deadline'], ['burns', 'deadline'], ['strips', 'ward']],
    line: (m) => `Invoice ${String(417 + (m.met || 0)).padStart(4, '0')}. Your time is billable.`,
    wick: { first: 'escrow\'s here. it bills by the cycle. don\'t pay.', won: 'escrow again. it kept your invoice.', counter: { deadline: 'you made escrow wait. it brought a deadline.' } },
  },
  hush: {
    name: 'HUSH', crew: 'palemask', lineup: [{ family: 'ghostroot' }, { strain: 'echo' }, { strain: 'sleeper' }],
    reads: [['reads', 'veil'], ['helpers', 'phaseshift'], ['burst', 'decoymirror']],
    line: (m) => `> ${m.quote || 'connect'}`, // it never speaks: your own last command
    wick: { first: 'hush is on this one. you won\'t see it till it\'s next to you.', won: 'it\'s quoting you again. read the board, not the chat.', counter: {} },
  },
};
for (const [id, r] of Object.entries(RIVALS)) r.id = id;
export const WICK_WIN = { vault: 'vault and pack both. good night.', pack: 'its pack. good night.' };

// What it adds between fights. A third part comes from a virus of its family built with it; a named build's part from
// that build; the Veil veils the whole next virus (each part wears a ◆ at least, so the veil holds).
export const COUNTERS = {
  patcher: { name: 'Patcher', gene: 'mend', strain: 'patchwork', part: 'patcher' },
  hotspare: { name: 'Hot spare', gene: 'spare', family: 'worm' },
  floodramp: { name: 'Flood ramp', gene: 'floodramp', strain: 'floodgate', part: 'flooder' },
  mutexlock: { name: 'Mutex lock', gene: 'mutexlock', family: 'ransomware' },
  deadline: { name: 'Deadline', gene: 'deadline', strain: 'extortion', part: 'demand' },
  ward: { name: 'Ward', gene: 'ward', family: 'ransomware' },
  veil: { name: 'Veil', gene: 'veil', veil: true },
  decoymirror: { name: 'Decoy mirror', gene: 'decoymirror', family: 'ghostroot' },
  phaseshift: { name: 'Phase shift', gene: 'phaseshift', strain: 'flicker', part: 'shade' },
};
// How you won a fight, in words (the card's "what you did").
export const READS = { burst: 'Burst one down', spread: 'Spread hits', slow: 'Slow kill', burns: 'Burns', strips: 'Small strips', reads: 'Every tell read', helpers: 'Helpers' };

const nowOf = () => hooks.now?.() ?? Date.now();
const say = (s, text, type = 'rooms') => { const R = s.rooms; R.log.push(text); if (R.log.length > 60) R.log.shift(); return emit(s, type, text); };
const ask = (fn, ...a) => (WORLD[fn] ? WORLD[fn](...a) : undefined);

// ---------- memory (the save) ----------
// s.rivals: { at, n } the last roll that brought one (your cooldown), by: each rival's memory.
export const rivalsOf = (s) => { const x = (s.rivals ||= { at: null, n: 0, by: {} }); x.by ||= {}; return x; };
export const memoryOf = (s, id) => (rivalsOf(s).by[id] ||= { met: 0, won: 0, lost: 0, away: 0, last: null, quote: null });
// v52: rivals' memory, made on first use; an older save starts with none (keyed on the field).
export function rivalsRestore(s) {
  if (!s.rivals || typeof s.rivals !== 'object' || Array.isArray(s.rivals)) { delete s.rivals; return; }
  const x = rivalsOf(s);
  for (const id of Object.keys(x.by)) if (!RIVALS[id]) delete x.by[id];
}
// The roll at a connect: a seed, or 0. One in RIVAL.chance, never while your cooldown runs.
export function rivalRoll(s, salt, t) {
  const x = rivalsOf(s);
  if (x.at != null && t < x.at + RIVAL.cooldownMs) return 0;
  const seed = (((salt >>> 0) * 2654435761 + (x.n || 0) * 7919) >>> 0) || 1;
  if (seeded(seed)() >= RIVAL.chance) return 0;
  x.at = t; x.n = (x.n || 0) + 1;
  return seed;
}

// ---------- on a run ----------
// The rival on this visit, while it's on the server (walking, or on you).
export const rivalOf = (s) => { const v = s.rooms?.visit?.rival; return v && (v.state === 'loose' || v.state === 'on') && s.rooms.at ? v : null; };
export const rivalAt = (s, id) => rivalOf(s)?.at === id;
const goalOf = (s, v) => (v.goal === 'vault' ? s.rooms.graph.vaults[0] : s.rooms.graph.entry);
// Its route to where it's going (the Core never on it), its room first.
export function routeOf(s, v = rivalOf(s)) {
  if (!v) return [];
  const g = s.rooms.graph;
  return pathTo(g, v.at, goalOf(s, v), (x) => x !== g.core) || [v.at];
}
// Rooms to the vault, for you and for it (the race on the vault's chip). null once it's no race.
export function raceOf(s, v = rivalOf(s)) {
  const R = s.rooms, vault = R?.graph.vaults[0];
  if (!v || v.goal !== 'vault' || !vault || R.opened[vault]) return null;
  const g = R.graph, mine = distances(g, R.at, (x) => x !== g.core)[vault];
  return { you: mine ?? null, it: routeOf(s, v).length - 1 };
}
// A visit's rival (WORLD.rival's seed, or the playtest's): it starts where the entry is as far from the vault, never
// next to you; its lineup's levels set now.
export function spawnRival(s, seed, id = null) {
  const R = s.rooms, g = R.graph, vault = g.vaults[0];
  if (!vault || R.opened[vault]) return null;
  const r = seeded((seed >>> 0) || 1), ids = Object.keys(RIVALS), who = RIVALS[id] ? id : ids[Math.floor(r() * ids.length)];
  const d = distances(g, vault, (x) => x !== g.core), near = distances(g, R.at || g.entry), far = d[g.entry] ?? 0;
  const pool = Object.keys(d).filter((x) => x !== g.entry && x !== vault && x !== g.core && (near[x] ?? 9) > 1);
  const want = pool.filter((x) => d[x] >= far), best = want.length ? Math.min(...want.map((x) => d[x])) : Math.max(...pool.map((x) => d[x]));
  const at = pool.filter((x) => d[x] === best).sort()[Math.floor(r() * pool.filter((x) => d[x] === best).length)];
  if (!at) return null;
  R.visit.rival = { id: who, seed: (seed >>> 0) || 1, at, goal: 'vault', state: 'loose', vault: false, fight: 0, fights: RIVAL.fights(R.floor || 1), level: hackerLevel(s) + RIVAL.level, next: null };
  look(s);
  say(s, `${RIVALS[who].name} is on ${R.name}, racing you to the vault.`, 'rooms-bad');
  return R.visit.rival;
}
// Its room, its route and the vault show through the fog.
function look(s) {
  const R = s.rooms, v = rivalOf(s);
  if (!v) return;
  for (const id of [...routeOf(s, v), R.graph.vaults[0]]) if (id) R.seen[id] ||= 'shape';
}
// A step for each of your moves: toward the vault, then the entry. True when it walks into your room.
export function rivalMove(s) {
  const R = s.rooms, v = rivalOf(s);
  if (!v || v.state !== 'loose') return false;
  const next = routeOf(s, v)[1];
  if (next) v.at = next;
  if (v.at === R.at) { look(s); return true; }
  const vault = R.graph.vaults[0], P = RIVALS[v.id];
  if (v.goal === 'vault' && v.at === vault) {
    if (!R.opened[vault]) { R.opened[vault] = nowOf(); v.vault = true; say(s, `${P.name} opens the vault and takes its files.`, 'rooms-bad'); }
    v.goal = 'out';
  } else if (v.goal === 'out' && v.at === R.graph.entry) {
    getaway(s, v);
    return false;
  }
  look(s);
  return false;
}
// It jacks out: with the vault's files, if it opened it.
function getaway(s, v) {
  const P = RIVALS[v.id];
  v.state = 'gone';
  if (v.vault) { ask('vaultGone', s); memoryOf(s, v.id).away++; memoryOf(s, v.id).last = 'away'; }
  say(s, v.vault ? `${P.name} jacks out with the vault's files.` : `${P.name} jacks out.`, v.vault ? 'rooms-bad' : 'rooms');
}
// You leave first: it finishes the job (the files go with it if it has them).
export function rivalLeave(s) {
  const v = rivalOf(s);
  if (v) getaway(s, v);
}
// It's on you: the challenge card, Engage only.
export function rivalMeet(s, room, opts = {}) {
  const R = s.rooms, v = rivalOf(s), P = RIVALS[v.id], m = memoryOf(s, v.id);
  v.state = 'on'; v.at = room.id;
  m.met++;
  R.visit.pending = room.id;
  R.screen = { kind: 'rival', room: room.id, pause: !!opts.pause };
  say(s, `${P.name} is on you.`, 'rooms-bad');
}
// Words for where it is (ls).
export function rivalLine(s) {
  const v = rivalOf(s);
  if (!v) return '';
  const race = raceOf(s, v), P = RIVALS[v.id];
  return race ? `${P.name} is ${race.it} ${race.it === 1 ? 'room' : 'rooms'} from the vault. You are ${race.you ?? '?'}.` : `${P.name} has the files and walks for the entry.`;
}

// ---------- the fights ----------
// Fight i of its lineup: a family's virus (its third forced) or a named build, one level over you, its crew's.
const fightSpec = (v, i) => {
  const P = RIVALS[v.id], spec = P.lineup[i] || P.lineup.at(-1);
  return { key: spec.strain || 'random', seed: ((v.seed + i * 7919) >>> 0) || 1, family: spec.family || null, opts: { mode: 'run', level: v.level, mutation: null, author: P.crew, ...(spec.strain ? {} : { family: spec.family }), ...(spec.genes ? { genes: spec.genes } : {}) } };
};
export function rivalFight(s, room) {
  const v = s.rooms.visit.rival, f = fightSpec(v, v.fight);
  return { key: f.key, seed: f.seed, opts: { ...f.opts, room: room.path }, size: 'rival', name: null, level: v.level, family: f.family, author: RIVALS[v.id].crew, set: undefined };
}
// The fight's lineup: what each one is, struck once beaten.
export function lineupOf(s, v = s.rooms?.visit?.rival) {
  if (!v) return [];
  return RIVALS[v.id].lineup.slice(0, v.fights).map((_, i) => {
    const f = fightSpec(v, i), vir = encounterVirus(s, f.key, f.seed, f.opts);
    return { i, name: vir.name, family: vir.family, strain: vir.strain || null, beaten: i < v.fight, next: i === v.fight };
  });
}
// The part it adds before the next fight, onto the virus just built (floorplan.mjs fight, before the room sizes it).
export function rivalArm(s, e) {
  const v = s.rooms.visit.rival, c = v?.next && COUNTERS[v.next.counter];
  if (!c) return null;
  const vir = e.virus;
  if (c.veil) {
    for (const p of vir.parts) { p.veiled = true; if (!p.maxArmor) p.armor = p.maxArmor = 1; }
  } else {
    const donor = c.strain ? encounterVirus(s, c.strain, v.seed, { mode: 'run', level: v.level, mutation: null })
      : encounterVirus(s, 'random', v.seed, { mode: 'run', level: v.level, family: c.family, basic: 'pulse', genes: [c.gene], mutation: null });
    const src = c.part ? donor.parts.find((p) => p.id === c.part) : donor.parts.find((p) => GENES[c.gene]?.carried(p));
    if (!src) return null;
    const p = structuredClone(src), ids = new Set(vir.parts.map((x) => x.id)), lead = vir.parts.find((x) => x.special) || vir.parts[0];
    while (ids.has(p.id)) p.id += 'x';
    p.special = false; // one signature a virus: the added part rides beside it
    for (const k of ['ward', 'lock', 'twin', 'fallback']) if (p[k] && !ids.has(p[k])) p[k] = lead.id; // what it protects, on this virus
    p.rival = true;
    vir.parts.push(p);
    if (Array.isArray(vir.genes)) vir.genes = null; // its genes read from its parts again (genome.mjs virusGenes)
  }
  e.rivalAdd = v.next.counter;
  return v.next.counter;
}
// How you won the fight that just ended, from its log: burst (one hit of a fifth of the virus or more), spread (your
// commands hit two parts in a cycle, a quarter of the time), slow (14 cycles or more), burns or helpers (a third of the
// damage), reads (every tell read, one at least), strips (◆ broken six times or more).
export function readFight(s, e) {
  const mine = s.logs.filter((x) => x.id > (e.serial0 || 0) && !x.who);
  const dmg = mine.filter((x) => x.type === 'damage'), total = dmg.reduce((n, x) => n + (x.amount || 0), 0) || 1;
  const size = e.virus.parts.filter((p) => p.kind !== 'fragment').reduce((n, p) => n + (p.max || 0), 0) || 1;
  const direct = dmg.filter((x) => !x.src), byCycle = {};
  for (const x of direct) (byCycle[x.cycle] ||= new Set()).add(x.target);
  const cyc = Object.values(byCycle), spread = cyc.length ? cyc.filter((t) => t.size >= 2).length / cyc.length : 0;
  const share = (f) => dmg.filter(f).reduce((n, x) => n + (x.amount || 0), 0) / total;
  const tells = Object.values(e.metrics?.tells || {}), said = tells.reduce((n, t) => n + t.said, 0), read = tells.reduce((n, t) => n + t.read, 0);
  return {
    burst: Math.max(0, ...direct.map((x) => x.amount || 0)) >= size * 0.2,
    spread: spread >= 0.25,
    slow: (e.cycle || 0) >= 14,
    burns: share((x) => x.src === 'burn') >= 1 / 3,
    helpers: share((x) => x.src === 'helper' || x.src === 'daemon') >= 1 / 3,
    reads: said > 0 && read >= said,
    strips: mine.filter((x) => x.type === 'armor' && x.broke).length >= 6,
    cycles: e.cycle || 0,
  };
}
// Its counter-pick from a read: the first of its reads that holds, else its last.
export function counterFor(id, read) {
  const xs = RIVALS[id].reads, hit = xs.find(([k]) => read[k]) || xs.at(-1);
  return { read: hit[0], counter: hit[1] };
}
// A fight in its lineup won: the next one waits behind the between-fights card, or it's down and the stakes are yours.
export function rivalWon(s, room, e) {
  const R = s.rooms, v = R.visit.rival, P = RIVALS[v.id], m = memoryOf(s, v.id);
  if (e.lastSkill) m.quote = ABILITIES[e.lastSkill]?.name?.toLowerCase() || e.lastSkill;
  v.fight++;
  if (v.fight < v.fights) {
    const read = readFight(s, e);
    v.next = { ...counterFor(v.id, read), cycles: read.cycles };
    R.screen = { kind: 'rival', room: room.id, between: true };
    say(s, `${P.name}: ${v.fight} down, ${v.fights - v.fight} to go. It adds a ${COUNTERS[v.next.counter].name}.`, 'rooms-bad');
    return false;
  }
  v.state = 'down'; v.next = null;
  m.won++; m.last = 'won';
  spoils(s, room, v);
  return true;
}
// Its pack (credits and an item one level over you) and, if it opened the vault, the vault's files: into your pack.
function spoils(s, room, v) {
  const R = s.rooms, P = RIVALS[v.id], r = seeded((v.seed ^ 0x5a17) >>> 0), L = hackerLevel(s) + RIVAL.level;
  if (v.vault) {
    const vault = R.graph.rooms[R.graph.vaults[0]];
    if (!(R.world && ask('vault', s, vault))) { const it = addItem(s, rollItem(r, { level: R.level, rarity: (vault.loot || {}).rarity || 'tuned', cls: classOf(s) }), 'The vault: '); if (it) { if (R.world) ask('packItem', s, it); else R.pack.push(it.id); } }
  }
  const credits = RIVAL.credits * ROOMS.purse(R.level || 1), it = addItem(s, rollItem(r, { level: L, rarity: RIVAL.rarity, cls: classOf(s) }), `${P.name}'s pack: `);
  if (R.world) { s.run.pack.push({ path: `${room.path}/#rival-${s.serial}`, name: 'pack.dat', kind: 'credits', amount: credits }); if (it) ask('packItem', s, it); }
  else { R.credits += credits; s.server.credits += credits; if (it) R.pack.push(it.id); }
  emit(s, 'spoil', `${P.name}'s pack: +${credits} credits.`, { label: 'Credits', qty: `+${credits}`, kind: 'credits', sub: `${P.name}'s pack`, pack: true });
  say(s, `${P.name} is down. Its pack is yours${v.vault ? ', and the vault\'s files' : ''}.`, 'rooms-good');
}
// A fight in its lineup lost (or fled): it's gone with its pack and anything it took.
export function rivalLost(s) {
  const v = s.rooms?.visit?.rival;
  if (!v || v.state !== 'on') return;
  const m = memoryOf(s, v.id);
  v.state = 'gone'; v.next = null;
  m.lost++; m.last = 'lost';
  if (v.vault) ask('vaultGone', s);
}
// wick's line for a moment: the challenge, between fights, the win.
export function wickLine(s, v, moment) {
  const P = RIVALS[v.id], m = memoryOf(s, v.id);
  if (moment === 'between') return P.wick.counter[v.next?.counter] || `it saw that. it brought a ${COUNTERS[v.next?.counter]?.name.toLowerCase() || 'part'}.`;
  if (moment === 'win') return v.vault ? WICK_WIN.vault : WICK_WIN.pack;
  return m.met > 1 && m.last === 'won' ? P.wick.won : P.wick.first;
}
// Its crew, for the byline.
export const crewName = (id) => AUTHORS[RIVALS[id].crew]?.name || '';
export const crewColour = (id) => AUTHORS[RIVALS[id].crew]?.colour || null;
// The line it says (KUDZU's, ESCROW's invoice, HUSH quoting your last command).
export const rivalSays = (s, id) => RIVALS[id].line(memoryOf(s, id));

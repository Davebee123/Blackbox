// Runners (docs/runners.md, R1): the people on your net. A stable cast per network, from its seed, each working a loop
// (hub, travel, work, travel back) worked out from the seed and logged-on time only: s.runners.ms counts the time the
// game is open (tickRunners, from invasion.mjs tickNetwork), so nothing moves while you're away. A job's outcome is
// rolled from the runner's level against the server's, never fought. A crash pulls the runner out; they're back at
// their hub next cycle. Runners never touch your servers, and nothing they do moves a faction.
//
// Saved: s.runners = { ms (logged-on time), known: { handle: { by, at, standing, met, helped, sig, sigAt, paid } } } (made
// on first use, keyed on the field; R2's fields are optional). Everything else (who they are, where they are, how far
// toward their trade) comes from the seed and ms.
//
// R2: meeting, standing and hiring. A runner working a server you're on is fighting in one of its rooms (meetingOf):
// walk in and Help, win, and their standing rises a tier. Standing 0–100 in four tiers. Anyone can be hired (hire): a fee
// the first time (smaller the better you know them), a cut of each run's credits, their bar from their presets. Hired, they're crew
// (crew.mjs, s.crewSim with runner: true); their Signal carries over (sig, a share of their max, refilling on logged-on
// time), at 0 they disconnect and are hireable again once full.
import { hackerLevel } from './combat.mjs';
import { ARCHETYPES, FLOORS, floorFor } from './data.mjs';
import { FACTIONS, FACTION_IDS } from './factions.mjs';
import { graphOf, locAt } from './floors.mjs';

export const RUNNERS = {
  cast: 32, // runners a network
  band: [-4, 4], // their levels, around yours
  cycleMs: [6 * 60000, 14 * 60000], // one loop: hub, out, work, back
  stages: [['hub', 0.15], ['out', 0.2], ['work', 0.45], ['back', 0.2]],
  odds: { base: 0.82, perLevel: 0.07, min: 0.25, max: 0.97 }, // a job's chance, by level against the server's
  temper: { Careful: 0.08, Steady: 0, Bold: -0.08 }, // and by temperament
  trade: [300, 900], // cycles to climb to the floor their trade is frozen on (50 to 150 hours logged on)
  star: 0.12, // a trait's chance of a ★
};
export const TEMPERS = ['Careful', 'Steady', 'Bold'];
export const TRAITS = {
  spotter: 'Spotter', swarm: 'Swarm', bulwark: 'Bulwark', decoy: 'Decoy', patch: 'Patch', repair: 'Repair', routefinder: 'Routefinder',
  mapper: 'Mapper', reader: 'Reader', archivist: 'Archivist', mentor: 'Mentor', coordinator: 'Coordinator', counterintel: 'Counter-intel',
  fixer: 'Fixer', haggler: 'Haggler', knownface: 'Known face', moonlighter: 'Moonlighter', gift: 'Gift', wildcard: 'Wildcard',
};
// The handles a cast is drawn from (the first twenty are presence.mjs's old pool).
export const HANDLES = ['nyx', 'kilo', 'vanta', 'sable', 'wisp', 'quill', 'rook', 'byte', 'ash', 'lumen', 'cipher_', 'zer0', 'echo9', 'grim', 'static', 'wren', 'halt', 'fen', 'oxide', 'marrow',
  'tamsin', 'ojo', 'kettle', 'mire', 'brask', 'pell', 'juno_k', 'saltpan', 'dov', 'harrow', 'ninefold', 'cobalt', 'lark', 'ferro', 'sixgun', 'tilde', 'moth', 'orin', 'vex', 'bodhi',
  'carrow', 'lint', 'nadir', 'pique', 'roan', 'sorrel', 'teff', 'umber', 'vell', 'yarrow', 'zinc', 'aster', 'brine', 'coil', 'dross', 'ember_', 'flint', 'gauze', 'hob', 'isk'];
// What each one is after: a payment frozen in the table.
const TRADES = ['a pension', "a florist's last week of takings", "a dead shop's payroll", "a mother's house sale", 'an insurance payout for a fire', 'back pay from a closed plant',
  'a deposit on a flat', 'a hospital refund', "a credit union's savings", 'a royalty payment', 'a ferry company\'s wages', 'a school fund'];
const KINDS = { relay: 'Relay', mailhub: 'Mailhub', mirror: 'Mirror', archive: 'Archive', lab: 'Lab', router: 'Router', honeypot: 'Honeypot', cold: 'Cold storage' };

// A number in [0, 1) from a string and a counter.
export function hash(text, n) {
  let h = 2166136261 ^ n;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const between = (x, [lo, hi]) => lo + Math.floor(x * (hi - lo + 1));

// ---------- the cast ----------
export const runnerSeed = (s) => (s.netSeed >>> 0) || 0;
const CAST = new Map();
// A network's cast, from its seed: the same seed, the same people. A save with no network seed has none.
export function castOf(s) {
  const seed = runnerSeed(s);
  if (!seed) return [];
  if (CAST.has(seed)) return CAST.get(seed);
  const order = HANDLES.map((h) => [hash(h, seed), h]).sort((a, b) => a[0] - b[0]).slice(0, RUNNERS.cast).map((x) => x[1]);
  const classes = Object.keys(ARCHETYPES), traitIds = Object.keys(TRAITS);
  const cast = order.map((h) => {
    const r = (n) => hash(h, seed ^ (n * 2654435761));
    const cls = classes[Math.floor(r(1) * classes.length)], subs = Object.keys(ARCHETYPES[cls].subs);
    const n = 1 + Math.floor(r(6) ** 2 * 4); // one to four traits, most have one or two
    const traits = traitIds.map((t, i) => [r(20 + i), t]).sort((a, b) => a[0] - b[0]).slice(0, n).map(([, t], i) => ({ id: t, star: r(50 + i) < RUNNERS.star }));
    return {
      handle: h, cls, sub: subs[Math.floor(r(2) * subs.length)], off: between(r(3), RUNNERS.band), faction: FACTION_IDS[Math.floor(r(4) * FACTION_IDS.length)],
      temper: TEMPERS[Math.floor(r(5) * TEMPERS.length)], traits, cycle: between(r(7), RUNNERS.cycleMs), phase: Math.floor(r(8) * RUNNERS.cycleMs[1]),
      need: between(r(9), RUNNERS.trade), tradeAt: Math.floor(r(10) * RUNNERS.trade[1]),
    };
  });
  CAST.set(seed, cast);
  return cast;
}
export const runnerOf = (s, h) => castOf(s).find((x) => x.handle === h) || null;
export const levelOf = (s, r) => Math.max(1, Math.min(50, hackerLevel(s) + r.off));

// ---------- the clock and what you know ----------
export function runnersOf(s) {
  const R = (s.runners ||= { ms: 0, known: {} });
  R.ms ||= 0; R.known ||= {};
  return R;
}
export const clockOf = (s) => s.runners?.ms || 0;
// Heard of: a runner whose line you've seen on #net (channel.mjs), or met. by: 'net' | 'met'; a meeting outranks hearsay.
export function know(s, h, by = 'net') { const k = runnersOf(s).known; if (runnerOf(s, h)) k[h] = { ...k[h], by: by === 'met' ? 'met' : k[h]?.by || by, at: clockOf(s) }; } // at: last heard
export const knownOf = (s) => Object.keys(s.runners?.known || {}).map((h) => runnerOf(s, h)).filter(Boolean);

// ---------- the loop ----------
const pathOf = (g, a, b) => {
  const prev = { [a]: null }, q = [a];
  while (q.length) { const x = q.shift(); if (x === b) break; for (const [p, r] of g.links) { const y = p === x ? r : r === x ? p : null; if (y && !(y in prev)) { prev[y] = x; q.push(y); } } }
  if (!(b in prev)) return [a];
  const out = []; for (let x = b; x != null; x = prev[x]) out.unshift(x);
  return out;
};
const chance = (r, L, server) => Math.max(RUNNERS.odds.min, Math.min(RUNNERS.odds.max, RUNNERS.odds.base + RUNNERS.odds.perLevel * (L - server) + RUNNERS.temper[r.temper]));
// Where a runner is at logged-on time t: { stage (hub | out | work | back | down), floor, base, target, path, at (the node
// they're on or just passed), f (0–1 along the path), k (the cycle), ok (the job's outcome), level, trade }.
export function stateOf(s, r, t = clockOf(s)) {
  const L = levelOf(s, r), x = t + r.phase, k = Math.floor(x / r.cycle), u = (x % r.cycle) / r.cycle;
  const fl = floorFor(L), g = graphOf(s, fl);
  const base = g.hubs[r.faction] || g.entry;
  const servers = Object.values(g.nodes).filter((n) => n.kind === 'server').sort((a, b) => Math.abs(a.level - L) - Math.abs(b.level - L) || (a.id < b.id ? -1 : 1));
  const target = servers[Math.floor(hash(r.handle, k * 7 + 1) * Math.min(4, servers.length))] || g.nodes[g.entry];
  const path = pathOf(g, base, target.id), ok = hash(r.handle, k * 7 + 3) < chance(r, L, target.level);
  let stage = 'hub', from = 0;
  for (const [name, w] of RUNNERS.stages) { if (u < from + w) { stage = name; break; } from += w; }
  const w = Object.fromEntries(RUNNERS.stages)[stage], f = Math.min(1, (u - from) / w);
  if (stage === 'back' && !ok) stage = 'down'; // crashed: pulled out, back at the hub next cycle
  const trade = tradeOf(r, k, fl);
  const st = { handle: r.handle, stage, floor: fl, base, target: target.id, path, f, k, ok, level: L, trade, g, left: Math.round((from + w - u) * r.cycle) }; // left: ms to the stage's end
  st.pos = posOf(st);
  return st;
}
// How far along their trade (frozen one to three floors below where they work): a new one each time they reach the last.
export function tradeOf(r, k, fl) {
  const n = k + r.tradeAt, i = Math.floor(n / r.need);
  return { what: TRADES[Math.floor(hash(r.handle, 900 + i) * TRADES.length)], floor: Math.min(FLOORS.length, fl + 1 + Math.floor(hash(r.handle, 950 + i) * 3)), part: (n % r.need) / r.need, n: i };
}
// Where on the floor: a node and, travelling, how far toward the next. { at, next, f, passed }.
function posOf(st) {
  const p = st.path, last = p.length - 1;
  if (st.stage === 'hub' || st.stage === 'down') return { at: st.base, next: null, f: 0, passed: [st.base] };
  if (st.stage === 'work') return { at: st.target, next: null, f: 0, passed: p };
  const route = st.stage === 'out' ? p : [...p].reverse(), d = st.f * last, i = Math.min(last, Math.floor(d));
  return { at: route[i], next: i < last ? route[i + 1] : null, f: d - i, passed: route.slice(0, i + 1) };
}
// Where they're heading (the dashed ring): the job going out and working it, the hub coming back. Null at the hub.
export const headingOf = (st) => (st.stage === 'out' || st.stage === 'work' ? st.target : st.stage === 'back' ? st.base : null);

// ---------- names ----------
// A node's name as you'd know it: a server you've located by its name, else its kind and floor.
export function nodeName(s, g, id) {
  const n = g.nodes[id];
  if (!n) return 'the net';
  if (n.kind === 'hub') return FACTIONS[n.hub]?.short || 'a hub';
  if (n.kind === 'entry') return g.n === 1 ? 'SPRAWL-00' : `the up-link to floor ${g.n - 1}`;
  return locAt(s, id)?.name || `a ${KINDS[n.template] || 'server'} on floor ${g.n}`;
}
export const kindName = (g, id) => KINDS[g.nodes[id]?.template] || 'server';
// The Rail's short place: a located server's name, else the kind and floor; a hub by its faction.
export function shortPlace(s, g, id) {
  const n = g.nodes[id];
  if (n?.kind === 'hub') return FACTIONS[n.hub]?.short || 'Hub';
  if (n?.kind === 'entry') return g.n === 1 ? 'SPRAWL-00' : `▲ F${g.n - 1}`;
  return locAt(s, id)?.name || `${KINDS[n?.template] || 'Server'} · F${g.n}`;
}
export const clsLabel = (r, L) => (L >= 10 ? ARCHETYPES[r.cls].subs[r.sub]?.name : null) || ARCHETYPES[r.cls].name;
// What they're doing, in a few words.
export function doing(s, st) {
  const g = st.g;
  if (st.stage === 'hub') return `between jobs at ${nodeName(s, g, st.base)}`;
  if (st.stage === 'down') return `crashed out, recovering at ${nodeName(s, g, st.base)}`;
  if (st.stage === 'work') return `working ${nodeName(s, g, st.target)}`;
  if (st.stage === 'out') return `heading for ${nodeName(s, g, st.target)}`;
  return `heading back to ${nodeName(s, g, st.base)}`;
}

// ---------- events, on logged-on time ----------
// The loop's turns between two moments: { h, kind (arrive | clear | crash | paid | trade), st }. A tick crosses at most
// one turn a runner (a stage lasts minutes); a long jump reports only where each one ended up.
function turnOf(a, b) {
  if (a.k === b.k && a.stage === b.stage) return null;
  if (b.k !== a.k && b.trade.n !== a.trade.n) return 'trade';
  if (b.stage === 'work') return 'arrive';
  if (b.stage === 'back') return 'clear';
  if (b.stage === 'down') return 'crash';
  if (b.stage === 'hub' && a.stage === 'back') return 'paid';
  return null;
}
// Logged-on time passes (invasion.mjs tickNetwork, through channel.mjs): the clock moves, and the turns come back.
export function tickRunners(s, dt) {
  const R = runnersOf(s), t0 = R.ms;
  R.ms += Math.max(0, dt || 0);
  if (!castOf(s).length || !dt) return [];
  const out = [];
  for (const r of castOf(s)) {
    const a = stateOf(s, r, t0), b = stateOf(s, r, R.ms), kind = turnOf(a, b);
    if (kind) out.push({ h: r.handle, kind, st: b, prev: a });
  }
  return out;
}

// ---------- presence (presence.mjs reads this) ----------
// A runner's place in presence's words: SPRAWL-00 for floor 1's entry (a folder there), else a server, a hub or the road.
export function placeOf(s, r, t = clockOf(s)) {
  const st = stateOf(s, r, t), g = st.g, at = st.pos.at, n = g.nodes[at];
  if (n?.kind === 'entry' && g.n === 1) return { kind: 'sprawl', stage: st.stage, at, floor: g.n, fighting: false };
  if (st.stage === 'out' || st.stage === 'back') return { kind: 'travel', stage: st.stage, to: headingOf(st), toName: shortPlace(s, g, headingOf(st)), words: nodeName(s, g, headingOf(st)), floor: g.n };
  return { kind: n?.kind === 'hub' ? 'hub' : 'server', stage: st.stage, at, name: shortPlace(s, g, at), words: nodeName(s, g, at), floor: g.n, fighting: st.stage === 'work' };
}

// ---------- standing (R2) ----------
export const STANDING = {
  tiers: [['Stranger', 0], ['Known', 25], ['Friend', 50], ['Close', 75]], // Known: leads (R3); Close: consortium (R4); each tier a smaller fee
  help: 25, // a room you win together: a tier
  knownFace: 1.5, // Known face: standing rises half again as fast
};
export const HIRE = {
  fee: 20, // credits a level, once, the first time you hire them
  byTier: [2, 1.5, 1, 0.75], // and by standing: a stranger twice that, Known half again, Close three quarters
  perTrait: 0.25, perStar: 0.25, // and a quarter more for each trait, a quarter more for each ★
  knownFace: 0.75, // Known face: a smaller fee
  cut: 0.1, // of the credits each run banks, while they're with you
  haggler: 0.5, // Haggler: half the cut
  recoverMs: 10 * 60000, // logged-on time from 0 Signal back to full
  from: 5, // your level
  sig: [0.35, 0.85], // a runner's Signal in a room you find them fighting in
};
const entryOf = (s, h) => s.runners?.known?.[h] || null;
export const standingOf = (s, h) => Math.max(0, Math.min(100, entryOf(s, h)?.standing || 0));
// A standing's tier: { i, name, at, next (its name, or null at Close), nextAt, f (0–1 toward it) }.
export function tierOf(n) {
  const T = STANDING.tiers;
  let i = 0;
  while (i + 1 < T.length && n >= T[i + 1][1]) i++;
  const next = T[i + 1];
  return { i, name: T[i][0], at: T[i][1], next: next ? next[0] : null, nextAt: next ? next[1] : 100, f: next ? (n - T[i][1]) / (next[1] - T[i][1]) : 1 };
}
const has = (r, id) => r.traits.find((x) => x.id === id) || null;
// What a raise of n comes to for them: Known face half again (★: half again on that).
export const gainOf = (r, n = STANDING.help) => { const kf = has(r, 'knownface'); return Math.round(n * (kf ? STANDING.knownFace * (kf.star ? 1.5 : 1) : 1)); };
// Standing up: n (a trait's ★ is half again), kept to 0–100. Returns the new tier when it crossed into one.
export function raiseStanding(s, h, n, met = '') {
  const r = runnerOf(s, h);
  if (!r) return null;
  know(s, h, 'met');
  const k = runnersOf(s).known[h], before = tierOf(standingOf(s, h)).i;
  k.standing = Math.min(100, standingOf(s, h) + gainOf(r, n));
  if (met && !k.met) k.met = met;
  const after = tierOf(k.standing);
  return after.i > before ? after : null;
}

// ---------- pay ----------
// The fee, once: credits by level, a quarter more a trait and a ★, by standing (HIRE.byTier). Known face takes a quarter off.
export function feeOf(s, r) {
  const kf = has(r, 'knownface'), stars = r.traits.filter((x) => x.star).length;
  return Math.round(HIRE.fee * levelOf(s, r) * (1 + HIRE.perTrait * r.traits.length + HIRE.perStar * stars) * HIRE.byTier[tierOf(standingOf(s, r.handle)).i] * (kf ? HIRE.knownFace : 1));
}
// Their cut of each run's banked credits (0–1). Haggler halves it (★: a quarter of it).
export function cutOf(r) { const hg = has(r, 'haggler'); return HIRE.cut * (hg ? (hg.star ? HIRE.haggler / 2 : HIRE.haggler) : 1); }
export const feePaid = (s, h) => !!entryOf(s, h)?.paid;

// ---------- Signal, busy ----------
// A runner's Signal as a share of their max (0–1): what they carried out of their last fight with you, refilling to
// full over HIRE.recoverMs of logged-on time.
export function sigOf(s, h) {
  const k = entryOf(s, h);
  if (k?.sig == null) return 1;
  return Math.min(1, k.sig + (clockOf(s) - (k.sigAt || 0)) / HIRE.recoverMs);
}
export function setSig(s, h, f) { const k = runnersOf(s).known; k[h] = { ...k[h], by: k[h]?.by || 'met', at: k[h]?.at ?? clockOf(s), sig: Math.max(0, Math.min(1, f)), sigAt: clockOf(s) }; }
export const hired = (s, h) => (s.crewSim || []).some((x) => x.runner && x.name === h);
// Busy: recovering from a disconnect (until full), or crashed out of a job (until their next cycle). { until (logged-on
// ms), why } or null.
export function busyOf(s, r, t = clockOf(s)) {
  if (hired(s, r.handle)) return null;
  const sig = sigOf(s, r.handle);
  if (sig < 1) return { until: t + Math.ceil((1 - sig) * HIRE.recoverMs), why: 'recovering' };
  const st = stateOf(s, r, t);
  if (st.stage === 'down') return { until: (st.k + 1) * r.cycle - r.phase, why: 'crashed' };
  return null;
}

// ---------- meeting ----------
// The runner fighting in a room on the server you're on: one whose job is this server, at work, whom you haven't helped
// on this job and haven't hired. Their room: a live process or elite room, picked from their handle and job, kept on
// the visit (R.visit.runner) so it doesn't move while you walk. { r, st, room, sig } or null.
export function meetingOf(s, isUp = null) {
  const R = s.rooms;
  if (!R?.world || !R.visit || !castOf(s).length) return null;
  const loc = (s.locations || []).find((l) => l.id === R.loc);
  if (!loc?.slot) return null;
  const kept = R.visit.runner;
  for (const r of castOf(s)) {
    const st = stateOf(s, r);
    if (st.stage !== 'work' || st.target !== loc.slot || hired(s, r.handle) || entryOf(s, r.handle)?.helped === st.k) continue;
    let room = kept?.h === r.handle && kept.k === st.k ? R.graph.rooms[kept.room] : null;
    if (!room || (isUp && !isUp(s, room))) {
      const rooms = Object.values(R.graph.rooms).filter((x) => (x.kind === 'process' || x.kind === 'elite') && !x.concealed && (!isUp || isUp(s, x))).sort((a, b) => (a.id < b.id ? -1 : 1));
      if (!rooms.length) continue;
      room = rooms[Math.floor(hash(r.handle, st.k * 7 + 5) * rooms.length)];
      R.visit.runner = { h: r.handle, k: st.k, room: room.id };
    }
    const [lo, hi] = HIRE.sig;
    return { r, st, room, sig: Math.round((lo + hash(r.handle, st.k * 7 + 6) * (hi - lo)) * 100) / 100 };
  }
  return null;
}
// A room you helped them win: standing up, and they leave the room (helped on this job).
export function helped(s, h) {
  const m = s.rooms?.visit?.runner, r = runnerOf(s, h);
  if (!r) return null;
  const st = stateOf(s, r), loc = (s.locations || []).find((l) => l.id === s.rooms?.loc);
  const tier = raiseStanding(s, h, STANDING.help, `You helped them clear a room on ${loc?.name || 'a server'}.`);
  runnersOf(s).known[h].helped = st.k;
  if (m?.h === h) s.rooms.visit.runner = null;
  return { standing: standingOf(s, h), tier };
}

// ---------- hiring ----------
// What stands between you and hiring them: a reason, or null.
export function cantHire(s, r) {
  if (hired(s, r.handle)) return 'already in your crew';
  if (hackerLevel(s) < HIRE.from) return `from level ${HIRE.from}`;
  const b = busyOf(s, r);
  if (b) return b.why === 'recovering' ? 'recovering' : 'crashed out';
  if ((s.crewSim || []).length >= 3) return 'crew full';
  if (!feePaid(s, r.handle) && (s.server?.credits || 0) < feeOf(s, r)) return 'not enough credits';
  return null;
}
// Their presets: their subclass's shipped bars (rotation first), or just rotation before a subclass.
export const PRESET_PLAY = { rotation: 'One target', area: 'Many parts', swarm: 'Many parts', rules: 'Part rules', evasion: 'Dodge hits', healers: 'Heal crew' };
export const PRESET_TIP = { rotation: 'They take one part down at a time.', area: 'They spread their hits over many parts.', swarm: 'They spread their hits over many parts.', rules: 'They go after the parts with rules first.', evasion: 'They dodge hits and pick their moments.', healers: "They keep the crew's Signal up." };

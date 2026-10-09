// Breach sim (docs/roguelite.md 9.1, phase 0): a bot plays whole breaches of MERIDIAN-MX-14. It walks the map
// (breach.mjs botRoute), drafts (botPick), loads gear that beats what's in its slot, and fights with the planner
// (planner.mjs), the same scripted player the balance harness uses. Heat 0, blue gear, the class's default subclass.
//   node breachsim.mjs [runs=20] [level=10]   win rates per class, and where the losses happen
// Phase 3 (docs/roguelite.md 9.3): how much drafting is skill. Draft policies (breach.mjs POLICIES: random, greedy,
// smart, and none, a floor that skips every draft) play the same maps and drafts, with the campaign's subclasses.
//   node breachsim.mjs skill [runs=48] [heat=2]    win rate by policy and class
//   node breachsim.mjs cards [runs=200] [heat=2]   the card table: pick rate and win rate when picked, by card
//   node breachsim.mjs variance [seeds=24] [reps=4] [heat=2]   per-seed win rates of the smart bot
import { fresh, command, resolveCycle, active, finish, stashItem, rigOf } from './dist/combat.mjs';
import { startBreach, outfit, act, go, botRoute, botPick } from './dist/breach.mjs';
import { planner } from './dist/planner.mjs';
import { MODS, CVES } from './dist/drafts.mjs';
import { SLOT_KINDS } from './dist/gear.mjs';

export const CLASSES = ['breaker', 'bastion', 'infiltrator', 'operator'];
const RANK = { stock: 1, tuned: 2, custom: 3, zeroday: 4 };

// One breach, start to end. Returns how it went.
// policy: the draft policy (breach.mjs POLICIES). heat: the breach's heat. rep: another run of the same map and drafts
// with other combat dice (the seed-variance check).
// give: cards to hold from the start (mod or CVE ids: the card probe).
export function runBreach({ cls = 'breaker', level = 10, seed = 1, sub = null, trace = false, keep = false, policy = 'smart', heat = 0, rep = 0, give = [] } = {}) {
  const s = fresh();
  s.rng = (seed * 2654435761 + cls.length * 97 + rep * 40503) >>> 0;
  outfit(s, { cls, level, sub, gearSeed: seed });
  const b = startBreach(s, { seed, level, heat });
  b.policy = policy;
  for (const id of give) { if (MODS[id]) b.mods.push(id); else if (CVES[id]) b.cves.push(id); }
  b.picks = []; // every draft: what was offered and what was taken (the card table)
  const { fights, cycles, stalls } = playOut(s, { trace });
  const at = b.map.nodes[b.at];
  return { ...(keep ? { state: s } : {}), cls, seed, policy, heat, picks: b.picks, won: b.result === 'won', result: b.result, fights, cycles, stalls, diedAt: b.result === 'lost' ? `${at?.kind}@act${(at?.act ?? 0) + 1}` : null, act: (at?.act ?? 0) + 1, mods: b.mods.length || b.lost?.mods.length || 0, cves: b.cves.length || b.lost?.cves.length || 0, rewrites: Object.keys(b.rewrites).length, xp: b.xp, signal: b.signal };
}
// Play the breach on s to its end: fights with the planner, screens with botPick, moves with botRoute, and gear that
// beats what's in its slot goes on as it lands in the pack (the campaign bot, campaignsim.mjs, uses it too).
export function playOut(s, { trace = false } = {}) {
  const b = s.breach;
  let fights = 0, cycles = 0, stalls = 0, nodes = 0;
  for (let step = 0; step < 500 && !b.result; step++) {
    if (active(s)) {
      fights++;
      for (let n = 0; n < 80 && active(s); n++) { command(s, planner(s) || 'hold'); resolveCycle(s); cycles++; }
      if (active(s)) { stalls++; finish(s, 'crashed'); } // 80 cycles: a stalemate counts as a loss
      continue;
    }
    if (b.screen) {
      const [verb, arg] = botPick(s) || ['leave'];
      if (b.picks && b.screen.kind === 'draft' && verb === 'pick') b.picks.push({ offered: b.screen.cards.filter((c) => c.id).map((c) => c.id), took: b.screen.cards[arg]?.id || null, step: b.map.nodes[b.at]?.step || 0 });
      const had = new Set(b.pack);
      act(s, verb, arg);
      for (const id of b.pack.filter((x) => !had.has(x))) if (better(s, stashItem(s, id))) act(s, 'equip', id);
      continue;
    }
    const id = botRoute(s);
    if (!id) break;
    go(s, id); nodes++;
    if (trace) console.log(b.at, b.map.nodes[b.at].kind, `${b.signal}/${b.max}`, b.tokens);
  }
  return { fights, cycles, stalls, nodes };
}
export function better(s, it) {
  if (!it) return false;
  const slot = SLOT_KINDS.indexOf(it.group), on = slot >= 0 ? stashItem(s, rigOf(s)[slot]) : null;
  return !on || RANK[it.rarity] > RANK[on.rarity] || (RANK[it.rarity] === RANK[on.rarity] && it.level > on.level);
}
// Many breaches for one class.
export function winRate(cls, { runs = 20, level = 10, from = 1, policy = 'smart', heat = 0 } = {}) {
  const out = [];
  for (let i = 0; i < runs; i++) out.push(runBreach({ cls, level, seed: from + i, policy, heat }));
  const wins = out.filter((r) => r.won).length;
  const where = {};
  for (const r of out) if (r.diedAt) where[r.diedAt] = (where[r.diedAt] || 0) + 1;
  return { cls, runs, wins, rate: wins / runs, where, fights: out.reduce((n, r) => n + r.fights, 0) / runs, runsOut: out };
}

// ---------- phase 3: skill against luck ----------
export const PICK = { breaker: 'demolitionist', bastion: 'warden', infiltrator: 'payload', operator: 'herder' };
// Win rates by policy on the same seeds: { [policy]: { [cls]: rate, all: rate } }.
export function skillGap({ classes = CLASSES, policies = ['random', 'greedy', 'smart'], runs = 48, heat = 2, from = 1, keep = false } = {}) {
  const out = {}, games = [];
  for (const policy of policies) {
    out[policy] = {};
    let w = 0, n = 0;
    for (const cls of classes) {
      let cw = 0;
      for (let i = 0; i < runs; i++) { const r = runBreach({ cls, seed: from + i, policy, heat, sub: PICK[cls] }); if (keep) games.push(r); if (r.won) cw++; }
      out[policy][cls] = cw / runs; w += cw; n += runs;
    }
    out[policy].all = w / n;
  }
  return keep ? { rates: out, games } : out;
}
// The card table, from random drafting (a card is taken by chance, not by need): for each card in each class, how
// often it was offered and taken, the win rate when taken, and when offered but passed over. A card's edge is the
// gap between the two, measured against the average card's.
export function cardTable(games, { min = 20 } = {}) {
  const st = {};
  for (const r of games) {
    const seen = new Set(), took = new Set();
    for (const p of r.picks) { for (const id of p.offered) seen.add(id); if (p.took) took.add(p.took); }
    for (const id of seen) { const k = `${r.cls}:${id}`, x = (st[k] ||= { cls: r.cls, id, offered: 0, picked: 0, wonPicked: 0, passed: 0, wonPassed: 0 }); x.offered++; if (took.has(id)) { x.picked++; if (r.won) x.wonPicked++; } else { x.passed++; if (r.won) x.wonPassed++; } }
  }
  const rows = Object.values(st).filter((x) => x.picked >= min && x.passed >= min / 2).map((x) => ({ ...x, pickRate: x.picked / x.offered, winPicked: x.wonPicked / x.picked, winPassed: x.wonPassed / x.passed, delta: x.wonPicked / x.picked - x.wonPassed / x.passed }));
  const mean = rows.reduce((n, x) => n + x.delta, 0) / Math.max(1, rows.length);
  for (const x of rows) x.edge = x.delta - mean;
  return rows.sort((a, b) => b.edge - a.edge);
}
// Seed variance: each seed (map, drafts, gear) played reps times with other combat dice. A seed that is lost every
// time is decided by its dice before any choice; the spread of per-seed win rates against the binomial spread says
// how much of the outcome the seed alone sets.
export function seedVariance({ classes = CLASSES, seeds = 24, reps = 4, heat = 2, policy = 'smart' } = {}) {
  const per = [];
  for (const cls of classes) for (let i = 1; i <= seeds; i++) { let w = 0; for (let rep = 0; rep < reps; rep++) if (runBreach({ cls, seed: i, rep, policy, heat, sub: PICK[cls] }).won) w++; per.push({ cls, seed: i, rate: w / reps }); }
  const mean = per.reduce((n, x) => n + x.rate, 0) / per.length;
  const sd = Math.sqrt(per.reduce((n, x) => n + (x.rate - mean) ** 2, 0) / per.length), noise = Math.sqrt((mean * (1 - mean)) / reps);
  return { per, mean, sd, noise, lostAlways: per.filter((x) => x.rate === 0).length / per.length, wonAlways: per.filter((x) => x.rate === 1).length / per.length };
}

if (import.meta.url === `file://${process.argv[1]}` && ['skill', 'cards', 'variance'].includes(process.argv[2])) {
  const [what, a, b, c] = process.argv.slice(2), pct = (x) => `${Math.round(x * 100)}%`;
  if (what === 'skill') {
    const r = skillGap({ runs: Number(a) || 48, heat: Number(b) || 2, policies: ['none', 'random', 'greedy', 'smart'] });
    console.log('policy   ' + CLASSES.map((x) => x.padEnd(12)).join('') + 'all');
    for (const [p, x] of Object.entries(r)) console.log(p.padEnd(9) + CLASSES.map((k) => pct(x[k]).padEnd(12)).join('') + pct(x.all));
  } else if (what === 'cards') {
    const { games } = skillGap({ runs: Number(a) || 200, heat: Number(b) || 2, policies: ['random'], keep: true });
    for (const x of cardTable(games)) console.log(`${x.cls.padEnd(12)} ${x.id.padEnd(18)} offered ${String(x.offered).padStart(4)}  pick ${pct(x.pickRate).padStart(4)}  win|picked ${pct(x.winPicked).padStart(4)}  win|passed ${pct(x.winPassed).padStart(4)}  edge ${Math.round(x.edge * 100)}`);
  } else {
    const v = seedVariance({ seeds: Number(a) || 24, reps: Number(b) || 4, heat: Number(c) || 2 });
    console.log(`mean ${pct(v.mean)}, per-seed sd ${v.sd.toFixed(2)} (dice alone ${v.noise.toFixed(2)}), seeds always lost ${pct(v.lostAlways)}, always won ${pct(v.wonAlways)}`);
  }
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = Number(process.argv[2]) || 20, level = Number(process.argv[3]) || 10;
  for (const cls of CLASSES) {
    const r = winRate(cls, { runs, level });
    console.log(`${cls.padEnd(12)} ${String(r.wins).padStart(3)}/${runs}  ${Math.round(r.rate * 100)}%  fights/run ${r.fights.toFixed(1)}  losses: ${Object.entries(r.where).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
  }
}

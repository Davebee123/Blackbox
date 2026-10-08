// Breach sim (docs/roguelite.md 9.1, phase 0): a bot plays whole breaches of MERIDIAN-MX-14. It walks the map
// (breach.mjs botRoute), drafts (botPick), loads gear that beats what's in its slot, and fights with the planner
// (planner.mjs), the same scripted player the balance harness uses. Heat 0, blue gear, the class's default subclass.
//   node breachsim.mjs [runs=20] [level=10]   win rates per class, and where the losses happen
import { fresh, command, resolveCycle, active, finish, stashItem, rigOf } from './dist/combat.mjs';
import { startBreach, outfit, act, go, botRoute, botPick } from './dist/breach.mjs';
import { planner } from './dist/planner.mjs';
import { SLOT_KINDS } from './dist/gear.mjs';

export const CLASSES = ['breaker', 'bastion', 'infiltrator', 'operator'];
const RANK = { stock: 1, tuned: 2, custom: 3, zeroday: 4 };

// One breach, start to end. Returns how it went.
export function runBreach({ cls = 'breaker', level = 10, seed = 1, sub = null, trace = false, keep = false } = {}) {
  const s = fresh();
  s.rng = (seed * 2654435761 + cls.length * 97) >>> 0;
  outfit(s, { cls, level, sub, gearSeed: seed });
  const b = startBreach(s, { seed, level });
  const { fights, cycles, stalls } = playOut(s, { trace });
  const at = b.map.nodes[b.at];
  return { ...(keep ? { state: s } : {}), cls, seed, won: b.result === 'won', result: b.result, fights, cycles, stalls, diedAt: b.result === 'lost' ? `${at?.kind}@act${(at?.act ?? 0) + 1}` : null, act: (at?.act ?? 0) + 1, mods: b.mods.length || b.lost?.mods.length || 0, cves: b.cves.length || b.lost?.cves.length || 0, rewrites: Object.keys(b.rewrites).length, xp: b.xp, signal: b.signal };
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
export function winRate(cls, { runs = 20, level = 10, from = 1 } = {}) {
  const out = [];
  for (let i = 0; i < runs; i++) out.push(runBreach({ cls, level, seed: from + i }));
  const wins = out.filter((r) => r.won).length;
  const where = {};
  for (const r of out) if (r.diedAt) where[r.diedAt] = (where[r.diedAt] || 0) + 1;
  return { cls, runs, wins, rate: wins / runs, where, fights: out.reduce((n, r) => n + r.fights, 0) / runs, runsOut: out };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = Number(process.argv[2]) || 20, level = Number(process.argv[3]) || 10;
  for (const cls of CLASSES) {
    const r = winRate(cls, { runs, level });
    console.log(`${cls.padEnd(12)} ${String(r.wins).padStart(3)}/${runs}  ${Math.round(r.rate * 100)}%  fights/run ${r.fights.toFixed(1)}  losses: ${Object.entries(r.where).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
  }
}

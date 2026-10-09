// Breach sim (docs/roguelite.md 9.1, 11): a bot plays whole breaches of MERIDIAN-MX-14. It walks the map (breach.mjs
// botRoute: keycards, vaults, switches, away from the hunter), decides each screen (botPick), runs a script when one
// fits (botScript), loads gear that beats what's in its slot, and fights with the planner (planner.mjs), the same
// scripted player the balance harness uses. Blue gear, the class's subclass.
//   node breachsim.mjs [runs=20] [level=10] [heat=0]   win rates per class, and where the losses happen
//   node breachsim.mjs subs [runs=40] [level=10] [heat=0]   win rates per subclass, with Trace, hunters and loot
//   node breachsim.mjs servers [runs=8] [heat=0]   every subclass on seven campaign servers (levels 7 to 19), each at
//                                                  the server's level: the campaign's breaches, one at a time
import { fresh, command, resolveCycle, active, finish, stashItem, rigOf } from './dist/combat.mjs';
import { startBreach, outfit, act, go, botRoute, botPick, botScriptRun } from './dist/breach.mjs';
import { SUBS } from './dist/data.mjs';
import { SERVER, cardFor } from './dist/campaign.mjs';
import { planner } from './dist/planner.mjs';
import { SLOT_KINDS } from './dist/gear.mjs';

export const CLASSES = ['breaker', 'bastion', 'infiltrator', 'operator'];
// The subclass a sensible player picks for breaches (the campaign bot's too).
export const PICK = { breaker: 'demolitionist', bastion: 'warden', infiltrator: 'payload', operator: 'herder' };
const RANK = { stock: 1, tuned: 2, custom: 3, zeroday: 4 };

// One breach, start to end. Returns how it went. rep: another run of the same map with other combat dice.
// server: a campaign server's id, played at its own level (you at that level too).
export function runBreach({ cls = 'breaker', level = 10, seed = 1, sub = null, trace = false, keep = false, heat = 0, rep = 0, server = null } = {}) {
  const s = fresh();
  s.rng = (seed * 2654435761 + cls.length * 97 + rep * 40503) >>> 0;
  if (server) level = SERVER[server].level;
  outfit(s, { cls, level, sub, gearSeed: seed });
  const b = startBreach(s, { seed, level, heat, ...(server ? { card: cardFor(SERVER[server]) } : {}) });
  const { fights, cycles, stalls } = playOut(s, { trace });
  const at = b.map.nodes[b.at];
  return { ...(keep ? { state: s } : {}), cls, seed, heat, won: b.result === 'won', result: b.result, fights, cycles, stalls, diedAt: b.result === 'lost' ? `${at?.kind}@act${(at?.act ?? 0) + 1}` : null, act: (at?.act ?? 0) + 1, rewrites: Object.keys(b.rewrites).length, xp: b.xp, signal: b.signal, trace: b.tracePeak, hunted: b.stats.hunted, vaults: b.stats.vaults, scripts: b.stats.scripts, found: b.stats.found };
}
// Play the breach on s to its end: fights with the planner (and a script when one fits), screens with botPick, moves
// with botRoute, and gear that beats what's in its slot goes on as it lands in the pack (the campaign bot,
// campaignsim.mjs, uses it too).
export function playOut(s, { trace = false } = {}) {
  const b = s.breach;
  let fights = 0, cycles = 0, stalls = 0, nodes = 0;
  const seen = new Set(b.pack);
  for (let step = 0; step < 500 && !b.result; step++) {
    if (!active(s)) for (const id of b.pack.filter((x) => !seen.has(x))) { seen.add(id); if (better(s, stashItem(s, id))) act(s, 'equip', id); }
    if (active(s)) {
      fights++;
      for (let n = 0; n < 80 && active(s); n++) { if (botScriptRun(s) && !active(s)) break; command(s, planner(s) || 'hold'); resolveCycle(s); cycles++; }
      if (active(s)) { stalls++; finish(s, 'crashed'); } // 80 cycles: a stalemate counts as a loss
      continue;
    }
    if (b.screen) {
      const [verb, arg] = botPick(s) || ['leave'];
      act(s, verb, arg);
      continue;
    }
    const id = botRoute(s);
    if (!id) break;
    go(s, id); nodes++;
    if (trace) console.log(b.at, b.map.nodes[b.at].kind, `${b.signal}/${b.max}`, `trace ${b.trace}`, b.hunter ? `hunter@${b.hunter.at}` : '');
  }
  return { fights, cycles, stalls, nodes };
}
export function better(s, it) {
  if (!it) return false;
  const slot = SLOT_KINDS.indexOf(it.group), on = slot >= 0 ? stashItem(s, rigOf(s)[slot]) : null;
  return !on || RANK[it.rarity] > RANK[on.rarity] || (RANK[it.rarity] === RANK[on.rarity] && it.level > on.level);
}
// Many breaches for one class (or subclass).
export const SIM_SERVERS = ['depot-7', 'chapel-0', 'meridian-14', 'mirror-12', 'sluice-2', 'hashlord-rig', 'ward-9'];
export function winRate(cls, { runs = 20, level = 10, from = 1, heat = 0, sub = null, servers = null } = {}) {
  const out = [];
  for (let i = 0; i < runs; i++) for (const server of servers || [null]) out.push(runBreach({ cls, level, seed: from + i, heat, sub, server }));
  runs = out.length;
  const wins = out.filter((r) => r.won).length;
  const where = {};
  for (const r of out) if (r.diedAt) where[r.diedAt] = (where[r.diedAt] || 0) + 1;
  const avg = (f) => out.reduce((n, r) => n + f(r), 0) / runs;
  return { cls, sub, runs, wins, rate: wins / runs, where, fights: avg((r) => r.fights), trace: avg((r) => r.trace), hunted: avg((r) => (r.hunted ? 1 : 0)), vaults: avg((r) => r.vaults), scripts: avg((r) => r.scripts), found: avg((r) => r.found), runsOut: out };
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === 'servers') {
  const runs = Number(process.argv[3]) || 8, heat = Number(process.argv[4]) || 0, pct = (x) => `${Math.round(x * 100)}%`;
  for (const sub of Object.keys(SUBS)) {
    const r = winRate(SUBS[sub].cls, { runs, heat, sub, servers: SIM_SERVERS });
    console.log(`${SUBS[sub].cls.padEnd(12)} ${sub.padEnd(14)} ${pct(r.rate).padStart(4)}  ${SIM_SERVERS.map((id, k) => `${id} ${pct(r.runsOut.filter((_, j) => j % SIM_SERVERS.length === k).filter((x) => x.won).length / runs)}`).join(' ')}`);
  }
} else if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === 'subs') {
  const [, , , a, b, c] = process.argv, runs = Number(a) || 40, level = Number(b) || 10, heat = Number(c) || 0, pct = (x) => `${Math.round(x * 100)}%`;
  for (const sub of Object.keys(SUBS)) {
    const r = winRate(SUBS[sub].cls, { runs, level, heat, sub });
    console.log(`${SUBS[sub].cls.padEnd(12)} ${sub.padEnd(14)} ${pct(r.rate).padStart(4)}  fights ${r.fights.toFixed(1)}  trace peak ${r.trace.toFixed(0)}  hunted ${pct(r.hunted)}  vaults ${r.vaults.toFixed(2)}  scripts run ${r.scripts.toFixed(1)}  items ${r.found.toFixed(1)}  losses: ${Object.entries(r.where).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
  }
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = Number(process.argv[2]) || 20, level = Number(process.argv[3]) || 10, heat = Number(process.argv[4]) || 0;
  for (const cls of CLASSES) {
    const r = winRate(cls, { runs, level, heat, sub: PICK[cls] });
    console.log(`${cls.padEnd(12)} ${String(r.wins).padStart(3)}/${runs}  ${Math.round(r.rate * 100)}%  fights/run ${r.fights.toFixed(1)}  losses: ${Object.entries(r.where).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
  }
}

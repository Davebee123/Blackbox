// The scripted fight player: one planner for every class (finish what you can, answer what lands
// now, strip, then finish), playing that class's own kit. Used by the balance scripts and by
// simulated crewmates (crew.mjs). It reads the fight through the engine's own functions.
import { classPlan, hooks, classOf, toIntent, intents, attackers, livingParts, alive, part, defender, previewDamage, ignoresArmor, readyIn, mirrorOn } from './combat.mjs';

const ok = (s, text) => !toIntent(s, text).error;
// Try commands in order; the first one that's valid right now wins.
const first = (s, list) => list.find((c) => c && ok(s, c)) || null;
const landingNow = (s) => intents(s).filter((i) => i.col === 0 && !i.hidden);
// The part to work on: the one whose (visible) attack lands soonest; hidden ones count as due in 2.
const dueOf = (s, p) => (intents(s).find((i) => i.source === p.id && !i.hidden)?.col ?? (p.attack ? 2 : 9));
export const soonest = (s) => attackers(s).sort((a, b) => dueOf(s, a) - dueOf(s, b) || b.max - a.max)[0] || livingParts(s)[0];
// How a player who reads the codex picks a target: the most threat per point of Integrity left
// (attack size over interval; encryption stacks, fragments multiply, a heal undoes work), armor
// counted as Integrity. Hidden timers don't matter: the codex says what each part does.
const threatOf = (p) => { const a = p.attack; if (!a) return 0; const amt = a.effect === 'damage' ? a.amount : a.effect === 'encrypt' ? a.amount * 3 + (a.hit || 0) : a.effect === 'replicate' ? 6 + (a.hit || 0) : a.effect === 'heal' ? 8 : a.hit || 0; return amt / Math.max(1, Math.min(a.interval || 4, 6)); };
// Burns and helpers already on a part count for it: switching away wastes them.
const invested = (s, p) => 1 + 0.6 * s.encounter.burns.filter((b) => b.target === p.id).length + 0.3 * s.encounter.helpers.filter((h) => h.target === p.id).length;
export const mostThreat = (s) => livingParts(s).map((p) => ({ p, k: (threatOf(p) * invested(s, p)) / (p.integrity + 10 * (p.armor || 0)) })).sort((a, b) => b.k - a.k || dueOf(s, a.p) - dueOf(s, b.p))[0]?.p || soonest(s);
const bare = (p) => alive(p) && !p.armor;
const HITS = ['zero-day', 'shatter', 'retaliate', 'opening', 'segfault', 'overload', 'flood', 'backdoor', 'reclaim', 'rate-limit', 'spike'];
// A command that breaks this part right now, if there is one.
// Flicker: the Shade is out of phase on odd cycles; a player hits something else then.
const phasedOut = (s, p) => p.phase && s.encounter.cycle % 2 === 1;
function killNow(s, p) {
  if (phasedOut(s, p)) return null;
  for (const id of HITS) {
    const text = id + ' ' + p.id;
    if (!ok(s, text)) continue;
    if ((bare(p) || ignoresArmor(s, id)) && previewDamage(s, id, p) >= p.integrity) return text;
  }
  return null;
}
const armored = (s) => livingParts(s).filter((p) => p.armor > 0);
const burnsOn = (s, p) => s.encounter.burns.filter((b) => b.target === p.id).length;
const helpersOn = (s, p) => s.encounter.helpers.filter((h) => h.target === p.id).length;

// One planner for every class: finish what you can, answer what lands now, strip, then finish.
// Commands a class doesn't have are skipped, so each class plays its own kit.
export function planner(s) {
  const now = landingNow(s);
  // Encrypted: the Encryptor holds the key, so it's the next threat whatever its timer says.
  const key = (s.encounter.encrypt > 0 && livingParts(s).find((p) => p.attack?.effect === 'encrypt')) || livingParts(s).find((p) => p.rearm) || (livingParts(s).some((p) => p.kind === 'fragment') && livingParts(s).find((p) => p.attack?.effect === 'replicate')); // a Bouncer's Keyring; a Replicator that keeps spawning
  // Burn classes (Infiltrator) get the most out of big parts that outlive their burns; the rest go for the biggest threat.
  const t0 = key || (classOf(s) === 'infiltrator' ? soonest(s) : mostThreat(s));
  let t = phasedOut(s, t0) ? livingParts(s).find((p) => !phasedOut(s, p)) || t0 : t0;
  // Lockbox: a warded part soaks a burst, so break the Lockbox first.
  const warder = livingParts(s).find((p) => p.ward === t.id);
  if (warder && classOf(s) !== 'infiltrator') t = warder; // burns tick under the cap anyway
  // Twins: work on the healthier of the pair, so both go down close together.
  const twin = livingParts(s).find((p) => p !== t && (p.twin === t.id || t.twin === p.id));
  if (twin && (twin.integrity / twin.max > t.integrity / t.max + 0.2 || (burnsOn(s, t) >= 2 && burnsOn(s, twin) < burnsOn(s, t)))) t = twin; // burns too: spread them over both
  // Decoy: on its beat your commands are mirrored, so set up instead (burns, helpers, defence).
  if (mirrorOn(s)) { const quiet = first(s, ['harden', 'firewall', 'bulkhead', 'dmz', 'multicast', 'heartbeat', 'shadow-copy', 'log-wipe', 'overvolt', 'turbo-boost', 'chain-reaction', 'malloc', 'fan-out ' + t.id, burnsOn(s, t) < 3 && 'inject ' + t.id, 'deploy ' + t.id, 'spawn ' + t.id, 'botnet ' + t.id, 'tag ' + t.id, 'patch', 'brace', 'hold']); if (quiet) return quiet; }
  // Adaptive: a third cycle in a row on the same part hardens it. Switch, unless this hit breaks it.
  const wary = (p) => s.encounter.virus.mutation === 'adaptive' && p.adaptRun >= 2 && p.adaptAt === s.encounter.cycle - 1;
  if (wary(t) && !killNow(s, t)) t = livingParts(s).filter((p) => p !== t && !wary(p) && !phasedOut(s, p)).sort((a, b) => dueOf(s, a) - dueOf(s, b))[0] || t;
  // A subclass's own play (dist/classes/<class>.mjs plan): its new skills, before the generic rules.
  const own = classPlan(s, t);
  if (own && ok(s, own)) return own;
  const d = defender(s);
  // 0. A lit proc is free damage: use it.
  const lit = first(s, ['shatter ' + t.id, 'retaliate ' + t.id, 'opening ' + t.id]);
  if (lit && bare(t)) return lit;
  // 1. Break a part that's about to fire, or a bare part before it patches.
  const urgent = [...new Set(now.map((i) => part(s, i.source)))].filter(alive);
  for (const p of [...urgent, ...livingParts(s).filter(bare)]) {
    const k = killNow(s, p);
    if (k) return k;
    const queued = s.encounter.helpers.filter((h) => h.target === p.id).reduce((n, h) => n + h.damage * h.left, 0);
    if (bare(p) && queued >= p.integrity && ok(s, 'kill-switch')) return 'kill-switch';
  }
  // 2. Something lands now that we can't break: answer it.
  const big = now.filter((i) => (i.effect !== 'damage' || i.amount >= Math.max(6, defender(s).max * 0.08)) && !part(s, i.source)?.phase).sort((a, b) => b.amount - a.amount)[0]; // a Shade in phase: hit it instead
  if (big) {
    const answer = first(s, [
      big.effect === 'damage' && s.encounter.chits === 0 && 'harden',
      big.effect === 'damage' && 'rate-limit ' + big.source, // hits harder when its attack is due, and halves it
      'suspend ' + big.source,
      helpersOn(s, part(s, big.source)) && 'jam ' + big.source,
      big.effect === 'damage' && 'firewall',
      big.effect === 'damage' && 'null-route',
      'quarantine ' + big.source,
      big.effect === 'damage' && 'throttle ' + big.source,
      big.effect === 'damage' && 'brace',
      big.effect === 'damage' && helpersOn(s, part(s, big.source)) && 'barrier ' + big.source,
    ]);
    if (answer) return answer;
  }
  // 2b. Heavy encryption: purge it. Low health: patch, or hit back with what you're missing.
  if (s.encounter.encrypt >= 6 && ok(s, 'purge ' + t.id)) return 'purge ' + t.id;
  if (d.integrity < d.max * 0.5) { const h = first(s, ['patch', 'failover', 'reclaim ' + t.id]); if (h) return h; }
  // A healer in a crew: patch whoever else is lowest, under half.
  const hurt = (hooks.crewAllies?.(s) || []).map((x) => ({ who: x.who, d: defender(x.st) })).filter((x) => x.d.integrity < x.d.max * 0.5).sort((a, b) => a.d.integrity / a.d.max - b.d.integrity / b.d.max)[0];
  if (hurt && ok(s, 'patch ' + hurt.who)) return 'patch ' + hurt.who;
  // 3. Work on the next threat: strip its armor with small or spread hits, then finish.
  if (t.armor > 0) {
    return first(s, [
      killNow(s, t),
      // Fork Bomb strips one ◆ a part: worth it only when Crack is cooling. (Spamming it whenever two
      // parts wore armor kept the Demolitionist from its real strip, Shaped Charge into Shatter.)
      armored(s).length >= 2 && !ok(s, 'crack ' + t.id) && !ok(s, 'shaped-charge ' + t.id) && 'fork-bomb',
      armored(s).length >= 2 && 'garbage-collect',
      t.armor >= 2 && 'crack ' + t.id,
      t.armor >= 2 && 'botnet ' + t.id,
      burnsOn(s, t) < 3 && 'inject ' + t.id,
      'thermal-runaway ' + t.id,
      'deploy ' + t.id,
      'spawn ' + t.id,
      'hook ' + t.id,
      'backdoor ' + t.id,
      'spike ' + t.id,
    ]);
  }
  return first(s, [
    killNow(s, t),
    livingParts(s).filter(bare).length >= 3 && 'fork-bomb', // three bare parts: the area hit
    t.integrity > 40 && readyIn(s, 'overload') <= 1 && (t.patchAt == null || t.patchAt > s.encounter.cycle + 1) && 'exploit ' + t.id,
    burnsOn(s, t) >= 2 && 'detonate ' + t.id,
    t.integrity > 30 && 'tag ' + t.id,
    burnsOn(s, t) < 3 && 'inject ' + t.id,
    'segfault ' + t.id, 'overload ' + t.id, 'flood ' + t.id, 'backdoor ' + t.id, 'reclaim ' + t.id, 'rate-limit ' + t.id,
    'deploy ' + t.id, 'thermal-runaway ' + t.id, 'sudo', 'spike ' + t.id,
  ]);
}


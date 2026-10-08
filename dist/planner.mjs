// The scripted fight player: one planner for every class (finish what you can, answer what lands
// now, strip, then finish), playing that class's own kit. Used by the balance scripts and by
// simulated crewmates (crew.mjs). It reads the fight through the engine's own functions.
import { classPlan, classFill, hooks, classOf, subOf, toIntent, intents, attackers, livingParts, alive, part, defender, previewDamage, ignoresArmor, readyIn, mirrorOn, usable, hookHit } from './combat.mjs';
import { ABILITIES, TELL } from './data.mjs';
import { raidMove, raidFocus, noTaunt } from './raid.mjs';
import { tellMove, tellFocus, answers, QUIET } from './tells.mjs';

// Against a crew boss only the tank taunts (a taunt pulls its busters onto you): raid.mjs noTaunt.
const ok = (s, text) => !toIntent(s, text).error && !(TAUNTS.has(text) && noTaunt(s));
const TAUNTS = new Set(['firewall', 'bulkhead']);
// Try commands in order; the first one that's valid right now wins.
const first = (s, list) => list.find((c) => c && ok(s, c)) || null;
// A bot that ignores tells (TELL.bots.answer false) reads the board as if they weren't there (tells.mjs).
const seen = (s) => intents(s).filter((i) => !i.tell || (answers() && TELL.bots.see !== false));
const landingNow = (s) => seen(s).filter((i) => i.col === 0 && !i.hidden);
// The part to work on: the one whose (visible) attack lands soonest; hidden ones count as due in 2.
const dueOf = (s, p) => (seen(s).find((i) => i.source === p.id && !i.hidden)?.col ?? (p.attack ? 2 : 9));
export const soonest = (s) => attackers(s).sort((a, b) => dueOf(s, a) - dueOf(s, b) || b.max - a.max)[0] || livingParts(s)[0];
// How a player who reads the codex picks a target: the most threat per point of Integrity left
// (attack size over interval; encryption stacks, fragments multiply, a heal undoes work), armor
// counted as Integrity. Hidden timers don't matter: the codex says what each part does.
const threatOf = (p) => { const a = p.attack; if (!a) return 0; const amt = a.effect === 'damage' ? a.amount : a.effect === 'encrypt' ? a.amount * 3 + (a.hit || 0) : a.effect === 'replicate' ? 6 + (a.hit || 0) : a.effect === 'heal' ? 8 : a.hit || 0; return amt / Math.max(1, Math.min(a.interval || 4, 6)); };
// Burns and helpers already on a part count for it: switching away wastes them.
const invested = (s, p) => 1 + 0.6 * s.encounter.burns.filter((b) => b.target === p.id).length + 0.3 * s.encounter.helpers.filter((h) => h.target === p.id).length;
// Parts that change the fight (data.mjs FAMILIES): a Tripwire sets the others off when it breaks, so it goes last;
// a C2 Node takes its fragments with it, so it goes first once they pile up.
const order = (s, p) => (p.deadman && livingParts(s).some((x) => x !== p && x.kind === 'system') ? 0.05 : p.command && livingParts(s).filter((x) => x.kind === 'fragment').length >= 2 ? 4 : 1);
export const mostThreat = (s) => livingParts(s).map((p) => ({ p, k: (threatOf(p) * invested(s, p) * order(s, p)) / (p.integrity + 10 * (p.armor || 0)) })).sort((a, b) => b.k - a.k || dueOf(s, a.p) - dueOf(s, b.p))[0]?.p || soonest(s);
const bare = (p) => alive(p) && !p.armor;
const HITS = ['zero-day', 'retaliate', 'opening', 'segfault', 'overload', 'flood', 'shatter', 'backdoor', 'reclaim', 'rate-limit', 'reject', 'checksum', 'hot-loop', 'backstab', 'fingerprint', 'side-channel', 'unmask', 'nohup', 'sniff', 'jam', 'echo-cancel', 'revoke', 'throttle', 'hook', 'tag', 'spike']; // the cheap core hits before key 1
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
// A part your burns and helpers break this cycle anyway (they tick after your command, before the virus):
// a command spent finishing it is wasted.
export const doomed = (s, p) => alive(p) && !(p.armor > 0) && s.encounter.burns.filter((b) => b.target === p.id).reduce((n, b) => n + b.damage, 0) + s.encounter.helpers.filter((h) => h.target === p.id).reduce((n, h) => n + h.damage + hookHit(s, p), 0) >= p.integrity;
const burnsOn = (s, p) => s.encounter.burns.filter((b) => b.target === p.id).length;
const helpersOn = (s, p) => s.encounter.helpers.filter((h) => h.target === p.id).length;

// One planner for every class: finish what you can, answer what lands now, strip, then finish.
// Commands a class doesn't have are skipped, so each class plays its own kit.
export function planner(s) {
  const plan = play(s);
  // Tells it answers outright (tells.mjs): SIGINT a cast, go quiet on the Mimic's beat when the plan hits hard,
  // strip a part about to seal.
  const at = livingParts(s).find((p) => plan && plan.endsWith(' ' + p.id)) || null;
  const told = tellMove(s, at, plan);
  if (told && ok(s, told)) return told;
  // Scrambled (a Scramble, or a Possession that made it longer): a big hit may turn on you, so set up instead,
  // unless the hit breaks the part.
  const e = s.encounter;
  if (e.scrambleUntil >= e.cycle && plan && at && !killing(s, plan, at)) {
    const id = plan.split(' ')[0];
    if (ABILITIES[id]?.damage > 25) { const quiet = first(s, [...QUIET, ...['crack', 'shaped-charge', 'bit-rot', 'exploit', 'tag', 'hook', 'inject', 'deploy', 'spawn', 'botnet', 'fan-out', 'purge', 'thermal-runaway', 'keepalive', 'spike'].map((k) => k + ' ' + at.id)]); if (quiet) return quiet; }
  }
  return plan;
}
const killing = (s, plan, p) => { const id = plan.split(' ')[0]; return !p.armor && previewDamage(s, id, p) >= p.integrity; };
function play(s) {
  const now = landingNow(s);
  // Encrypted: the Encryptor holds the key, so it's the next threat whatever its timer says.
  const key = (s.encounter.encrypt > 0 && livingParts(s).find((p) => p.attack?.effect === 'encrypt')) || livingParts(s).find((p) => p.rearm) || (livingParts(s).some((p) => p.kind === 'fragment') && livingParts(s).find((p) => p.attack?.effect === 'replicate')); // a Bouncer's Keyring; a Replicator that keeps spawning
  // Burn classes (Infiltrator) get the most out of big parts that outlive their burns; the rest go for the biggest threat.
  // A crew boss (raid.mjs): its mechanics first (interrupt, cleanse, dodge), then its priority add or workers.
  const raid = raidMove(s);
  if (raid && ok(s, raid)) return raid;
  // A tell (tells.mjs): a charge or cast whose wind-up it can reach, or a part about to seal.
  // A part left Open by a tell you read (tells.mjs): +50% from everyone for 2 cycles, so cash it in.
  const open = !raidFocus(s) && ['breaker', 'bastion'].includes(classOf(s)) && livingParts(s).find((p) => p.openUntil >= s.encounter.cycle && !p.deadman);
  const t0 = raidFocus(s) || tellFocus(s) || open || key || (classOf(s) === 'infiltrator' ? soonest(s) : mostThreat(s));
  let t = phasedOut(s, t0) ? livingParts(s).find((p) => !phasedOut(s, p)) || t0 : t0;
  // Lockbox: a warded part soaks a burst, so break the Lockbox first. Mutex: its lock comes back while it lives,
  // so break it first too (a burn class chips under either anyway).
  const burst = classOf(s) === 'breaker' && subOf(s) === 'overclocker';
  const warder = livingParts(s).find((p) => p.ward === t.id || (p.lock === t.id && t.lockHp > 0 && !burst)); // an Overclocker bursts through one lock
  if (warder && classOf(s) !== 'infiltrator') t = warder; // burns tick under the cap anyway
  // Tripwire: leave it for last while anything else stands.
  if (t.deadman) t = livingParts(s).filter((p) => p !== t && p.kind === 'system').sort((a, b) => dueOf(s, a) - dueOf(s, b))[0] || t;
  // Twins: work on the healthier of the pair, so both go down close together.
  const twin = livingParts(s).find((p) => p !== t && (p.twin === t.id || t.twin === p.id));
  if (twin && (twin.integrity / twin.max > t.integrity / t.max + 0.2 || (burnsOn(s, t) >= 2 && burnsOn(s, twin) < burnsOn(s, t)))) t = twin; // burns too: spread them over both
  // Decoy: on its beat your commands are mirrored, so set up instead (burns, helpers, defence).
  if (mirrorOn(s) && !(mirrorOn(s).unmaskUntil >= s.encounter.cycle)) { const quiet = first(s, [...QUIET.filter((id) => !['patch', 'null-route', 'sudo', 'fork', 'mesh'].includes(id)), 'fan-out ' + t.id, burnsOn(s, t) < 3 && 'inject ' + t.id, 'deploy ' + t.id, 'spawn ' + t.id, 'botnet ' + t.id, 'tag ' + t.id, 'patch', 'brace', 'hold']); if (quiet) return quiet; }
  // Adaptive: a third cycle in a row on the same part hardens it. Switch, unless this hit breaks it.
  const wary = (p) => s.encounter.virus.mutation === 'adaptive' && p.adaptRun >= 2 && p.adaptAt === s.encounter.cycle - 1;
  if (wary(t) && !killNow(s, t)) t = livingParts(s).filter((p) => p !== t && !wary(p) && !phasedOut(s, p)).sort((a, b) => dueOf(s, a) - dueOf(s, b))[0] || t;
  // A subclass's own play (dist/classes/<class>.mjs plan): its new skills, before the generic rules.
  const own = classPlan(s, t);
  if (own && ok(s, own)) return own;
  const d = defender(s);
  // 0. A lit proc: use it while it's the biggest hit you have on the part (it still takes your command).
  const lit = first(s, ['shatter ' + t.id, 'retaliate ' + t.id, 'opening ' + t.id]);
  const best = Math.max(0, ...['overload', 'flood', 'segfault', 'backdoor', 'reclaim'].filter((id) => ok(s, id + ' ' + t.id)).map((id) => previewDamage(s, id, t)));
  if (lit && bare(t) && (!lit.startsWith('shatter') || previewDamage(s, 'shatter', t) >= best)) return lit;
  // 1. Break a part that's about to fire, or a bare part before it patches.
  const urgent = [...new Set(now.map((i) => part(s, i.source)))].filter(alive);
  for (const p of [...urgent, ...livingParts(s).filter(bare)]) {
    if (doomed(s, p)) continue;
    // Kill Switch first when the helpers on a part break it: with Last Gasp in the cash-in it loses nothing, unless
    // some helpers still chip armor (cashed in on ◆ they break one each). On a part about to fire it's worth that.
    const queued = s.encounter.helpers.filter((h) => h.target === p.id).reduce((n, h) => n + h.damage * (h.left + 1), 0);
    if (bare(p) && (urgent.includes(p) || s.encounter.helpers.filter((h) => part(s, h.target)?.armor > 0).reduce((n, h) => n + h.left, 0) <= 2) && queued >= p.integrity && !killNow(s, p)?.match(/^(nohup|sniff) /) && ok(s, 'kill-switch')) return 'kill-switch'; // the helpers would finish it anyway: now, and the command is free
    const k = killNow(s, p);
    if (k) return k;
  }
  // 2. Something lands now that we can't break: answer it.
  const big = now.filter((i) => i.effect !== 'tell' && (i.effect !== 'damage' || i.amount >= Math.max(6, defender(s).max * 0.08)) && !part(s, i.source)?.phase).sort((a, b) => b.amount - a.amount)[0]; // a Shade in phase: hit it instead (a tell that isn't a hit: tellMove)
  if (big) {
    // A Tripwire's own hit: soften it, but don't break it while the others stand.
    const trip = part(s, big.source)?.deadman && livingParts(s).some((x) => x.id !== big.source && x.kind === 'system');
    const answer = first(s, trip ? ['harden', 'firewall', 'null-route', 'throttle ' + big.source, 'brace'] : [
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
  if (d.integrity < d.max * 0.5) { const h = first(s, [d.integrity < d.max * 0.3 && 'patch', 'failover', 'reclaim ' + t.id]); if (h) return h; } // a healer keeps Patch for under 30% (bastion.mjs HEAL.solo)
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
      armored(s).length >= 2 && livingParts(s).some((p) => p.kind === 'fragment') && 'garbage-collect', // its moment is fragments: as a strip it costs more than it breaks
      t.armor >= 2 && 'crack ' + t.id,
      t.armor >= 2 && 'botnet ' + t.id,
      burnsOn(s, t) < 3 && 'inject ' + t.id,
      'thermal-runaway ' + t.id,
      'deploy ' + t.id,
      'spawn ' + t.id,
      'hook ' + t.id,
      'backdoor ' + t.id,
      !burnsOn(s, t) && 'purge ' + t.id, // a Bastion's: its ticks crack ◆ too, and heal
      ...classFill(s, t),
      'spike ' + t.id,
    ]);
  }
  return first(s, [
    killNow(s, t),
    livingParts(s).filter(bare).length >= 3 && 'fork-bomb', // three bare parts: the area hit
    t.integrity > 90 && readyIn(s, 'overload') <= 1 && ['overload', 'flood', 'shatter'].filter((id) => readyIn(s, id) === 0 && usable(s).includes(id)).length >= 1 && (t.patchAt == null || t.patchAt > s.encounter.cycle + 1) && 'exploit ' + t.id,
    burnsOn(s, t) >= 2 && 'detonate ' + t.id,
    t.integrity > 30 && 'tag ' + t.id,
    burnsOn(s, t) < 3 && 'inject ' + t.id,
    'segfault ' + t.id, 'overload ' + t.id, 'flood ' + t.id, 'backdoor ' + t.id, 'reclaim ' + t.id, 'rate-limit ' + t.id,
    'deploy ' + t.id, 'thermal-runaway ' + t.id, 'sudo',
    !burnsOn(s, t) && t.integrity > 30 && 'purge ' + t.id, // a Bastion's filler: a burn that heals beats a Spike on a part that will last
    ...classFill(s, t),
    'spike ' + t.id,
  ]);
}


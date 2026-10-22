// The scripted fight player: one planner for every class (finish what you can, answer what lands
// now, strip, then finish), playing that class's own kit. Used by the balance scripts and by
// simulated crewmates (crew.mjs). It reads the fight through the engine's own functions.
import { classPlan, classFill, hooks, classOf, subOf, toIntent, intents, attackers, livingParts, alive, part, defender, previewDamage, ignoresArmor, readyIn, mirrorOn, usable, hookHit, wards, attackAmount, delayHeld, frontOf, bufferOn, signatureOf, cooldownOf, frozenNow, asleep } from './combat.mjs';
import { ABILITIES, TELL, CONFIG } from './data.mjs';
import { raidMove, raidFocus, noTaunt } from './raid.mjs';
import { tellMove, tellFocus, answers, QUIET, chargeNow, echoesNow } from './tells.mjs';
// genesim.mjs: a gene the sim ignores (genes.mjs GENE_BOTS) is played as if it weren't there, one gene at a time.
import { ignores } from './genes.mjs';
import { heatOf } from './parts.mjs';
import { interruptMove, saveTick } from './interrupt.mjs';

// Against a crew boss only the tank taunts (a taunt pulls its busters onto you): raid.mjs noTaunt.
// veto: skills the planner may not pick this call (routines.mjs: a program's rotation never fires a long cooldown).
let veto = null;
const ok = (s, text) => !(veto && veto(String(text).split(' ')[0])) && !toIntent(s, text).error && !(TAUNTS.has(text) && noTaunt(s));
const TAUNTS = new Set(['firewall', 'bulkhead']);
// Skills built to answer a big move (tells.mjs BUILT, and Takeover): a class plan that fires one keeps it over a cut.
const BUILT = new Set(['suspend', 'jam', 'spoofed-ack', 'hijack', 'blackhole', 'backfire', 'takeover', 'quarantine', 'revoke']);
// Try commands in order; the first one that's valid right now wins.
const first = (s, list) => list.find((c) => c && ok(s, c)) || null;
// A bot that ignores tells (TELL.bots.answer false) reads the board as if they weren't there (tells.mjs).
const seen = (s) => intents(s).filter((i) => !i.tell || (answers() && TELL.bots.see !== false && !ignores(i.gene)));
const landingNow = (s) => seen(s).filter((i) => i.col === 0 && !i.hidden);
// The part to work on: the one whose (visible) attack lands soonest; hidden ones count as due in 2.
const dueOf = (s, p) => (seen(s).find((i) => i.source === p.id && !i.hidden)?.col ?? (p.attack ? 2 : 9));
// A Cold Store still frozen (combat.mjs frozenNow): nothing reaches it, so a player works on the others meanwhile.
const reachable = (s, p) => ignores('coldstore') || !frozenNow(s, p);
export const soonest = (s) => attackers(s).sort((a, b) => dueOf(s, a) - dueOf(s, b) || b.max - a.max)[0] || livingParts(s).find((p) => reachable(s, p)) || livingParts(s)[0];
// How a player who reads the codex picks a target: the most threat per point of Integrity left
// (attack size over interval; encryption stacks, fragments multiply, a heal undoes work), armor
// counted as Integrity. Hidden timers don't matter: the codex says what each part does.
const threatOf = (p) => { const a = p.attack; if (!a) return 0; const amt = a.effect === 'damage' ? a.amount : a.effect === 'encrypt' ? a.amount * 3 + (a.hit || 0) : a.effect === 'replicate' ? 6 + (a.hit || 0) : a.effect === 'heal' ? 8 : a.hit || 0; return amt / Math.max(1, Math.min(a.interval || 4, 6)) + (p.ratchet ? (p.ratchet.amount * 3) / p.ratchet.every : 0); }; // a Ratchet stacks like an Encrypt
// Burns and helpers already on a part count for it: switching away wastes them.
const invested = (s, p) => 1 + 0.6 * s.encounter.burns.filter((b) => b.target === p.id).length + 0.3 * s.encounter.helpers.filter((h) => h.target === p.id).length;
// Parts that change the fight (data.mjs FAMILIES): a Tripwire sets the others off when it breaks, so it goes last;
// a C2 Node takes its fragments with it, so it goes first once they pile up. A boss's ♛ part with a phase still to
// come (interrupt.mjs, rule a) waits for the others: its phases start when you choose, after the add is down.
// A Zip Bomb goes last too (the fight ending puts its fuse out); a Hotspot late, by burns and helpers if it can.
const others = (s, p) => livingParts(s).some((x) => x !== p && x.kind === 'system');
const order = (s, p) => (p.core && p.ticks?.some((t) => !t.spent) && livingParts(s).some((x) => x !== p && x.attack) ? 0.4 : p.deadman && !ignores('tripwire') && others(s, p) ? 0.05 : p.fuse && !ignores('zipbomb') && others(s, p) ? 0.05 : p.hotspot && !ignores('hotspot') && others(s, p) ? 0.3 : p.command && !ignores('c2') && livingParts(s).filter((x) => x.kind === 'fragment').length >= 2 ? 4 : 1);
export const mostThreat = (s) => livingParts(s).filter((p) => reachable(s, p)).map((p) => ({ p, k: (threatOf(p) * invested(s, p) * order(s, p)) / (p.integrity + 10 * (p.armor || 0)) })).sort((a, b) => b.k - a.k || dueOf(s, a.p) - dueOf(s, b.p))[0]?.p || soonest(s);
const bare = (p) => alive(p) && !p.armor;
// A Trojan's Package while its Loader lives (families.mjs): any damage unpacks it, so a player leaves it alone.
const shunned = (s, p) => !!p?.pkg && !p.pkg.inert && livingParts(s).some((x) => x.id === 'loader');
const shunning = (s) => livingParts(s).some((p) => shunned(s, p));
const HITS = ['zero-day', 'retaliate', 'opening', 'chain-reaction', 'segfault', 'overload', 'flood', 'shatter', 'backdoor', 'reclaim', 'rate-limit', 'reject', 'checksum', 'hot-loop', 'backstab', 'fingerprint', 'side-channel', 'unmask', 'nohup', 'sniff', 'jam', 'echo-cancel', 'revoke', 'throttle', 'hook', 'tag', 'spike']; // the cheap core hits before key 1
// A command that breaks this part right now, if there is one.
// Flicker: the Shade is out of phase on odd cycles; a player hits something else then.
const phasedOut = (s, p) => p.phase && !ignores('phaseshift') && s.encounter.cycle % 2 === 1;
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
const injected = (s, p) => s.encounter.burns.some((b) => b.id === 'inject' && b.target === p.id); // one a part: another press only refreshes it
const helpersOn = (s, p) => s.encounter.helpers.filter((h) => h.target === p.id).length;

// A Bouncer's Keyring (genes.mjs keyring) has no attack: at the end of every 4th cycle it re-arms its partner, the
// Gate, to full ◆, three times. A re-arm only gives the shell back, so burns, helpers and hits through armor lose
// nothing to it, and the Gate comes first. A Breaker lives by its strips (the Overclocker less so: Thermal Throttle
// and Sudo go through ◆): when it can't get through the Gate's shell and break it before the next re-arm, every strip
// is wasted, so it breaks the Keyring first.
function keyringNow(s) {
  if (ignores('keyring') || classOf(s) !== 'breaker' || subOf(s) === 'overclocker') return null;
  const e = s.encounter, k = livingParts(s).find((p) => p.rearm && (p.rearms || 0) < CONFIG.rearmMax);
  const gate = k && livingParts(s).find((p) => p !== k && p.maxArmor > 0);
  if (!gate || !(gate.armor > 0) || ok(s, 'shaped-charge ' + gate.id)) return null;
  const left = k.rearm - ((e.cycle - 1) % k.rearm); // commands before the re-arm, this one included
  const strips = (ok(s, 'crack ' + gate.id) ? ABILITIES.crack.strip : 1) + Math.max(0, left - 2); // the last command is the kill
  return strips < gate.armor ? k : null;
}
// A Trojan's live Packages (families.mjs): any damage unpacks one, and a hit that splashes onto every part (shards, an
// area hit, a bomb's blast) unpacks them all, so while they're on the board a player swaps either (a class's own plan
// included) for a hit on a part that isn't a box.
const AREA = new Set(['shatter', 'fork-bomb', 'garbage-collect', 'failover', 'multicast', 'rm-rf', 'logic-bomb', 'chain-reaction', 'mesh', 'outbreak', 'propagate', 'fan-out']);
// The planner without some skills (veto(id) true: never picked), for a program's rotation (routines.mjs).
export function plannerWithout(s, no) {
  const was = veto;
  veto = no;
  try { return planner(s); } finally { veto = was; }
}
// Scraper: its Scrape takes your shield, your ◆ and your timed buffs as it lands, so a player puts up no ◆ and no buff
// into it (a shield still stops the hit itself, so Firewall stays).
const BUFFING = new Set(['harden', 'brace', 'sudo', 'fork', 'debris-field', 'rm-rf', 'circuit-breaker', 'honeypot', 'maintenance-window', 'bulkhead', 'dmz', 'mesh']);
const scrapeNow = (s) => !ignores('scraper') && landingNow(s).some((i) => part(s, i.source)?.scrape);
export function planner(s) {
  if (!scrapeNow(s)) return planner1(s);
  const was = veto;
  veto = (id) => BUFFING.has(id) || !!(was && was(id));
  try { return planner1(s); } finally { veto = was; }
}
function planner1(s) {
  const plan = plan0(s);
  if (!plan || !shunning(s)) return plan;
  const [id, at] = plan.split(' '), aim = part(s, at);
  if (!AREA.has(id) && !shunned(s, aim)) return plan;
  const t = (aim && !shunned(s, aim) ? aim : null) || livingParts(s).filter((p) => !shunned(s, p)).sort((a, b) => dueOf(s, a) - dueOf(s, b))[0];
  return (t && first(s, ['overload', 'flood', 'segfault', 'backdoor', 'reclaim', 'rate-limit', 'exploit', 'crack', 'inject', 'deploy', 'tag', 'spike'].map((id) => id + ' ' + t.id))) || 'hold';
}
// One planner for every class: finish what you can, answer what lands now, strip, then finish.
// Commands a class doesn't have are skipped, so each class plays its own kit.
function plan0(s) {
  const plan = play(s);
  // Tells it answers outright (tells.mjs): SIGINT a cast, go quiet on the Mimic's beat when the plan hits hard,
  // strip a part about to seal (or about to charge, so the cut can land).
  const at = livingParts(s).find((p) => plan && plan.endsWith(' ' + p.id)) || null;
  // The interrupt (interrupt.mjs): take a part across a tick on the cycle its move is due, a tell's first. A plan that
  // breaks a part beats a cut, unless the move the cut cancels is the bigger loss: a charge, or a hit of a tenth of
  // your bar from another part while the virus has more than the one the plan breaks. A big cut comes before the rest.
  const ticked = s.encounter.ticked, kill = plan && at && killing(s, plan, at);
  const cut = ticked ? interruptMove(s, plan) : null, cp = cut && part(s, cut.split(' ')[1]);
  const big = !!cp && (chargeNow(s, cp) || (cp.attack && attackAmount(cp) >= defender(s).max * 0.1));
  const worth = !kill || (big && cp !== at && livingParts(s).length > 1);
  const echo = cut && echoesNow(s, cut) && !(livingParts(s).length === 1 && killing(s, cut, cp)); // not into the Mimic's beat
  if (TELL.bots.bigCut !== false && cut && big && worth && !echo && !BUILT.has((plan || '').split(' ')[0]) && ok(s, cut)) return cut; // a class's own answer to that move stays
  // Tells it answers outright (tells.mjs): SIGINT a cast, go quiet on the Mimic's beat when the plan hits hard,
  // strip a part about to seal (or about to charge, so the cut can land).
  const told = tellMove(s, at, plan);
  if (told && ok(s, told)) return told;
  if (ticked) {
    if (cut && worth && !echo && ok(s, cut)) return cut;
    // Saving a tick for a charge pays from level 10; below it, with three or four keys, holding back cost more (the
    // rooms sim at level 6). TELL.bots.save false: never (a sim switch).
    const keep = !kill && TELL.bots.save !== false && s.encounter.virus.level >= TELL.castFrom && saveTick(s, plan);
    if (keep && ok(s, keep)) return keep;
  }
  // Backlog: its Ack lands this cycle, and the skill you fire cools 2 longer: fire one with no cooldown then.
  const e = s.encounter;
  const syn = !ignores('backlog') && landingNow(s).some((i) => i.syn);
  if (syn && plan && at && !killing(s, plan, at) && cooldownOf(s, plan.split(' ')[0]) >= 5 && ok(s, 'spike ' + at.id)) return 'spike ' + at.id; // a long cooldown only: on a short one the 2 cycles cost less than the swap
  // Scrambled (a Scramble, or a Possession that made it longer): a big hit may turn on you, so set up instead,
  // unless the hit breaks the part.
  if (e.scrambleUntil >= e.cycle && !ignores('scramble') && plan && at && !killing(s, plan, at)) {
    const id = plan.split(' ')[0];
    if (ABILITIES[id]?.damage > 25) { const quiet = first(s, [...QUIET, ...['crack', 'shaped-charge', 'bit-rot', 'exploit', 'tag', 'hook', 'inject', 'deploy', 'spawn', 'botnet', 'fan-out', 'purge', 'thermal-runaway', 'keepalive', 'spike'].map((k) => k + ' ' + at.id)]); if (quiet) return quiet; }
  }
  return plan;
}
const killing = (s, plan, p) => { const id = plan.split(' ')[0]; return !p.armor && previewDamage(s, id, p) >= p.integrity; };
function play(s) {
  const now = landingNow(s);
  // Encrypted: the Encryptor holds the key, so it's the next threat whatever its timer says.
  const key = (s.encounter.encrypt > 0 && !ignores('encrypt') && livingParts(s).find((p) => p.attack?.effect === 'encrypt')) || (!ignores('encrypt') && livingParts(s).find((p) => heatOf(p, s.encounter.cycle) > 0)) || keyringNow(s) || (livingParts(s).some((p) => p.kind === 'fragment') && livingParts(s).find((p) => p.attack?.effect === 'replicate')); // a Bouncer's Keyring on a re-arm cycle; a Replicator that keeps spawning
  // Burn classes (Infiltrator) get the most out of big parts that outlive their burns; the rest go for the biggest threat.
  // A crew boss (raid.mjs): its mechanics first (interrupt, cleanse, dodge), then its priority add or workers.
  const raid = raidMove(s);
  if (raid && ok(s, raid)) return raid;
  // A tell (tells.mjs): a charge or cast whose wind-up it can reach, or a part about to seal.
  // A part left Open by a tell you read (tells.mjs): +50% from everyone for 2 cycles, so cash it in.
  const open = !raidFocus(s) && ['breaker', 'bastion'].includes(classOf(s)) && livingParts(s).find((p) => p.openUntil >= s.encounter.cycle && !p.deadman);
  let t0 = raidFocus(s) || tellFocus(s) || open || key || (classOf(s) === 'infiltrator' ? soonest(s) : mostThreat(s));
  if (shunned(s, t0)) t0 = livingParts(s).filter((p) => !shunned(s, p)).sort((a, b) => dueOf(s, a) - dueOf(s, b))[0] || t0;
  // A Trojan's Loader (families.mjs): while a broken Courier waits on its redeploy, it's the part to break.
  const loader = s.encounter.virus.parts.some((p) => p.redeployAt != null) ? livingParts(s).find((p) => p.id === 'loader' && s.encounter.virus.family === 'trojan') : null;
  if (loader && !raidFocus(s) && !tellFocus(s)) t0 = loader;
  let t = phasedOut(s, t0) ? livingParts(s).find((p) => !phasedOut(s, p)) || t0 : t0;
  if (!reachable(s, t)) t = livingParts(s).filter((p) => reachable(s, p)).sort((a, b) => dueOf(s, a) - dueOf(s, b))[0] || t; // a frozen Cold Store: the others first
  // The parts plan's P2. Spare: once the signature is down, break it before it boots if its ◆ are nearly gone (it does
  // nothing until then); under more, let it boot and break it bare (it drops its ◆ as it boots).
  const sp = !ignores('spare') && livingParts(s).find((p) => asleep(p) && reachable(s, p));
  if (sp && sp.bootAt && sp.armor <= 1) t = sp;
  // Lockbox: a warded part soaks a burst, so break the Lockbox first. Mutex: its lock comes back while it lives,
  // so break it first too (a burn class chips under either anyway).
  const burst = classOf(s) === 'breaker' && subOf(s) === 'overclocker';
  const warder = livingParts(s).find((p) => (wards(p, t) && !ignores('ward')) || (p.lock === t.id && t.lockHp > 0 && !burst && !ignores('mutexlock'))); // an Overclocker bursts through one lock
  if (warder && classOf(s) !== 'infiltrator') t = warder; // burns tick under the cap anyway
  // Tripwire, Zip Bomb: leave them for last while anything else stands.
  if ((t.deadman && !ignores('tripwire')) || (t.fuse && !ignores('zipbomb'))) t = livingParts(s).filter((p) => p !== t && p.kind === 'system' && !p.deadman && !p.fuse).sort((a, b) => dueOf(s, a) - dueOf(s, b))[0] || livingParts(s).filter((p) => p !== t && p.kind === 'system').sort((a, b) => dueOf(s, a) - dueOf(s, b))[0] || t;
  // Front End: a direct hit on its partner lands on it while it wears ◆. A Breaker or a Bastion strips it first; burns and helpers go past.
  const fe = !ignores('frontend') && livingParts(s).find((p) => p.front && p.armor > 0 && frontOf(s, p) === t);
  if (fe && ['breaker', 'bastion'].includes(classOf(s))) t = fe;
  // The Infiltrator: an Inject on the partner goes past it; with none to fire, a direct hit would land on the Front End
  // anyway, so it strips the Front End (the parts plan's answer: Inject the partner). The helper classes keep the plain plan.
  else if (fe && classOf(s) === 'infiltrator') { const soft = first(s, [!injected(s, t) && 'inject ' + t.id]); if (soft) return soft; t = fe; }
  // Buffer: its shield takes direct hits; a Breaker or a Bastion breaks the bare Buffer first.
  const bf = !ignores('buffer') && t.bufHp > 0 ? bufferOn(s, t) : null;
  if (bf && !bf.armor && ['breaker', 'bastion'].includes(classOf(s))) t = bf;
  // Idle Timer: the signature untouched for its count re-arms every part. A hit on it in time keeps the count down.
  const idler = !ignores('idletimer') && livingParts(s).find((p) => p.idle), sig = idler && signatureOf(s);
  if (sig && t !== sig && idler.idle - (s.encounter.cycle - (s.encounter.virus.idleHit || 0)) <= 1 && livingParts(s).some((p) => p.maxArmor > 0 && p.armor < p.maxArmor)) t = sig;
  // Twins: work on the healthier of the pair, so both go down close together.
  const twin = livingParts(s).find((p) => p !== t && (p.twin === t.id || t.twin === p.id));
  if (twin && !ignores('twin') && (twin.integrity / twin.max > t.integrity / t.max + 0.2 || (burnsOn(s, t) >= 2 && burnsOn(s, twin) < burnsOn(s, t)))) t = twin; // burns too: spread them over both
  // Decoy: on its beat your commands are mirrored, so set up instead (burns, helpers, defence).
  if (mirrorOn(s) && !ignores('decoymirror') && !(mirrorOn(s).unmaskUntil >= s.encounter.cycle)) { const quiet = first(s, [...QUIET.filter((id) => !['patch', 'null-route', 'sudo', 'fork', 'mesh'].includes(id)), 'fan-out ' + t.id, 'inject ' + t.id, 'deploy ' + t.id, 'spawn ' + t.id, 'botnet ' + t.id, 'tag ' + t.id, 'patch', 'brace', 'hold']); if (quiet) return quiet; }
  // Adaptive: a third cycle in a row on the same part hardens it. Switch, unless this hit breaks it.
  const wary = (p) => s.encounter.virus.mutation === 'adaptive' && !ignores('adaptive') && p.adaptRun >= 2 && p.adaptAt === s.encounter.cycle - 1;
  if (wary(t) && !killNow(s, t)) t = livingParts(s).filter((p) => p !== t && !wary(p) && !phasedOut(s, p)).sort((a, b) => dueOf(s, a) - dueOf(s, b))[0] || t;
  // Hotspot: a direct hit sets it off. Burns and helpers don't: use them on it if you have them.
  if (t.hotspot && !ignores('hotspot')) { const soft = first(s, [!injected(s, t) && 'inject ' + t.id, 'deploy ' + t.id, 'spawn ' + t.id, 'botnet ' + t.id, !burnsOn(s, t) && 'purge ' + t.id]); if (soft) return soft; }
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
  // (Not a Zip Bomb or a Hotspot while anything else stands: one breaks last, the other is set off by a direct hit.)
  const later = (x) => ((x.fuse && !ignores('zipbomb')) || (x.hotspot && !ignores('hotspot'))) && others(s, x);
  for (const p of [...urgent, ...livingParts(s).filter(bare)].filter((x) => !shunned(s, x) && !later(x))) {
    if (doomed(s, p)) continue;
    // Kill Switch first when the helpers on a part break it: with Last Gasp in the cash-in it loses nothing, unless
    // some helpers still chip armor (cashed in on ◆ they break one each). On a part about to fire it's worth that.
    const queued = s.encounter.helpers.filter((h) => h.target === p.id).reduce((n, h) => n + h.damage * (h.left + 1), 0);
    if (bare(p) && (urgent.includes(p) || s.encounter.helpers.filter((h) => part(s, h.target)?.armor > 0).reduce((n, h) => n + h.left, 0) <= 2) && queued >= p.integrity && !killNow(s, p)?.match(/^(nohup|sniff) /) && ok(s, 'kill-switch')) return 'kill-switch'; // the helpers would finish it anyway: now, and the command is free
    const k = killNow(s, p);
    if (k) return k;
  }
  // 2. Something lands now that we can't break: answer it.
  // Cold Store: its first Chill comes a cycle or two after it thaws; a player saved a cut or a shield for it.
  const thawed = !ignores('coldstore') && livingParts(s).find((p) => p.frozen && p.thawed && p.attack && !p.attack.n && p.attack.due - s.encounter.cycle <= 1 && !(p.throttledUntil >= s.encounter.cycle));
  if (thawed) { const a = first(s, ['throttle ' + thawed.id, 'rate-limit ' + thawed.id, 'suspend ' + thawed.id, 'firewall']); if (a) return a; }
  // Scraper: its Scrape takes your ◆ as it lands (and your shield and timed buffs), so no ◆ goes up into it (planner).
  const scrape = !ignores('scraper') && now.some((i) => part(s, i.source)?.scrape);
  const fuse = !ignores('zipbomb') && now.find((i) => i.effect === 'fuse');
  if (fuse) { const cover = first(s, [!scrape && 'harden', 'firewall']); if (cover) return cover; } // a Zip Bomb's fuse: a ◆ or a shield takes it
  const big = now.filter((i) => i.effect !== 'tell' && i.effect !== 'buffer' && i.effect !== 'fuse' && (i.effect !== 'damage' || i.amount >= Math.max(6, defender(s).max * 0.08)) && !part(s, i.source)?.phase).sort((a, b) => b.amount - a.amount)[0]; // a Shade in phase: hit it instead (a tell that isn't a hit: tellMove)
  if (big) {
    // A Tripwire's own hit: soften it, but don't break it while the others stand.
    const trip = part(s, big.source)?.deadman && !ignores('tripwire') && livingParts(s).some((x) => x.id !== big.source && x.kind === 'system');
    const delayable = !delayHeld(part(s, big.source)); // already delayed once, a delay does nothing (combat.mjs delayAttack)
    const answer = first(s, (trip ? ['harden', 'firewall', 'null-route', 'throttle ' + big.source, 'brace'] : [
      big.effect === 'damage' && s.encounter.chits === 0 && 'harden',
      big.effect === 'damage' && 'rate-limit ' + big.source, // hits harder when its attack is due, and halves it
      delayable && 'suspend ' + big.source,
      delayable && helpersOn(s, part(s, big.source)) && 'jam ' + big.source,
      big.effect === 'damage' && 'firewall',
      big.effect === 'damage' && 'null-route',
      delayable && 'quarantine ' + big.source,
      big.effect === 'damage' && 'throttle ' + big.source,
      big.effect === 'damage' && 'brace',
      big.effect === 'damage' && helpersOn(s, part(s, big.source)) && 'barrier ' + big.source,
    ]).filter((c) => !scrape || String(c).split(' ')[0] !== 'harden'));
    if (answer) return answer;
  }
  // 2b. Heavy encryption: purge it. Low health: patch, or hit back with what you're missing.
  if ((s.encounter.encrypt || 0) + livingParts(s).reduce((n, p) => n + heatOf(p, s.encounter.cycle), 0) >= 6 && ok(s, 'purge ' + t.id)) return 'purge ' + t.id;
  // Bad Block: cracked cells eat your next heals; a class with a cleanse clears them before it heals.
  if (s.encounter.badBlock?.left > 0 && !ignores('badblock') && d.integrity < d.max * 0.75) { const c = first(s, ['purge ' + t.id, 'scrub', 'rotate-keys']); if (c) return c; }
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
      armored(s).length >= 2 && !ok(s, 'crack ' + t.id) && !ok(s, 'shaped-charge ' + t.id) && !shunning(s) && 'fork-bomb',
      armored(s).length >= 2 && livingParts(s).some((p) => p.kind === 'fragment') && !shunning(s) && 'garbage-collect', // its moment is fragments: as a strip it costs more than it breaks
      t.armor >= 2 && 'crack ' + t.id,
      t.armor >= 2 && 'botnet ' + t.id,
      !injected(s, t) && 'inject ' + t.id,
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
    livingParts(s).filter(bare).length >= 3 && !shunning(s) && 'fork-bomb', // three bare parts: the area hit
    t.integrity > 90 && readyIn(s, 'overload') <= 1 && ['overload', 'flood', 'shatter'].filter((id) => readyIn(s, id) === 0 && usable(s).includes(id)).length >= 1 && (t.patchAt == null || t.patchAt > s.encounter.cycle + 1) && 'exploit ' + t.id,
    burnsOn(s, t) >= 2 && 'detonate ' + t.id,
    t.integrity > 30 && 'tag ' + t.id,
    !injected(s, t) && 'inject ' + t.id,
    'segfault ' + t.id, livingParts(s).length >= 2 && 'chain-reaction ' + t.id, 'overload ' + t.id, 'flood ' + t.id, 'backdoor ' + t.id, 'reclaim ' + t.id, 'rate-limit ' + t.id,
    'deploy ' + t.id, 'thermal-runaway ' + t.id, 'sudo',
    !burnsOn(s, t) && t.integrity > 30 && 'purge ' + t.id, // a Bastion's filler: a burn that heals beats a Spike on a part that will last
    ...classFill(s, t),
    'spike ' + t.id,
  ]);
}


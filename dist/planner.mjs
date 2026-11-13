// The scripted fight player: one planner for every class (finish what you can, answer what lands
// now, strip, then finish), playing that class's own kit. Used by the balance scripts and by
// simulated crewmates (crew.mjs). It reads the fight through the engine's own functions.
import { gearDamage, classPlan, classFill, hooks, classOf, subOf, toIntent, intents, attackers, livingParts, alive, part, defender, previewDamage, ignoresArmor, readyIn, skillBase, mirrorOn, bendOf, bendBad, timersHidden, usable, hookHit, wards, attackAmount, delayHeld, frontOf, bufferOn, signatureOf, cooldownOf, frozenNow, asleep, scaled } from './combat.mjs';
import { ABILITIES, TELL, CONFIG, BOSSES } from './data.mjs';
import { raidMove, raidFocus, noTaunt } from './raid.mjs';
import { tellMove, tellFocus, answers, QUIET, chargeNow, echoesNow, beatOn, beatBlind, copyCost, paceOf, tellsOf, tellNext } from './tells.mjs';
// genesim.mjs: a gene the sim ignores (genes.mjs GENE_BOTS) is played as if it weren't there, one gene at a time.
import { ignores, GENES, GENE_BOTS } from './genes.mjs';
import { heatOf } from './parts.mjs';
import { interruptMove, saveTick, toCross } from './interrupt.mjs';
import { loudWins, blastPays, cashIn } from './order.mjs';
import { actsOf, lashOn } from './acts.mjs';
import { copyKind } from './tells.mjs';
import { topFrame, canCall, callingNow, FB, pendingOf, tradeOf, nodesOf, fragsOf, camerasOf, parentOf, leverLeft } from './floorbosses.mjs';

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
// Read (answers): NIGHT DESK's traders take no damage while the Desk stands, and CAMSWARM's Hive none under the Lockout
// while a Camera does (floorbosses.mjs).
const shut = (s, p) => { const v = s.encounter?.virus; return answers() && ((!!v?.desk && p.role === 'trader') || (!!v?.swarm?.lockout && !!p.core && camerasOf(s).length > 0) || (!!v?.swarm && !!parentOf(s, p))); };
const reachable = (s, p) => (ignores('coldstore') || !frozenNow(s, p)) && !shut(s, p);
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
// The order levers (order.mjs, docs/puzzle-levers.md 3.2 to 3.4) read the board first: a Tripwire goes now when loud
// wins, a Zip Bomb when its blast pays, a Lockbox when half of what it holds breaks its partner (leverNow).
const others = (s, p) => livingParts(s).some((x) => x !== p && x.kind === 'system');
// A part an order lever keeps for last right now (its lever doesn't say now).
const keptLast = (s, p) => ((p.fuse && !p.fuseAt && !ignores('zipbomb')) || (p.deadman && !p.quiet && !ignores('tripwire'))) && others(s, p) && leverNow(s) !== p && p !== prefer;
const leverNow = (s) => (!ignores('ward') && cashIn(s)?.part) || (!ignores('tripwire') && loudWins(s)?.part) || (!ignores('zipbomb') && blastPays(s)?.part) || null;
// A boss whose ♛ is worked through the fight (BOSSES work, docs/solo-bosses.md "Working the ♛"), read only (answers):
// the ♛ is the part to work on while it stands further up its bar than the rest of the boss does, by work.lead (none:
// the ♛ waits for the others, as on any boss).
const restOf = (v) => { const r = v.parts.filter((p) => p.kind === 'system' && !p.core && !p.noTicks); return r.reduce((n, p) => n + p.integrity, 0) / Math.max(1, r.reduce((n, p) => n + p.max, 0)); };
const crownNow = (s) => { const v = s.encounter.virus, W = BOSSES[v.boss]?.work, c = W?.lead != null && answers() && livingParts(s).find((p) => p.core); return c && c.ticks?.some((t) => !t.spent) && others(s, c) && reachable(s, c) && c.integrity / c.max > restOf(v) + W.lead ? c : null; };
const order = (s, p) => (p.core && p.ticks?.some((t) => !t.spent && t.phase != null) && livingParts(s).some((x) => x !== p && x.attack) && !(actsOf(s.encounter.virus) && ignores('leave')) ? 0.4 : p.deadman && !ignores('tripwire') && others(s, p) ? 0.05 : p.fuse && !ignores('zipbomb') && others(s, p) ? 0.05 : p.hotspot && !ignores('hotspot') && others(s, p) ? 0.3 : p.command && !ignores('c2') && livingParts(s).filter((x) => x.kind === 'fragment').length >= 2 ? 4 : 1);
export const mostThreat = (s) => livingParts(s).filter((p) => reachable(s, p)).map((p) => ({ p, k: (threatOf(p) * invested(s, p) * order(s, p)) / (p.integrity + 10 * (p.armor || 0)) })).sort((a, b) => b.k - a.k || dueOf(s, a.p) - dueOf(s, b.p))[0]?.p || soonest(s);
const bare = (p) => alive(p) && !p.armor;
// A Trojan's Package while its Loader lives (families.mjs): any damage unpacks it, so a player leaves it alone.
// A Botnet (families.mjs): an area kit farms its Zombies while its Signal holds; any other kit, or one under half its
// Signal, ends it at the C&C (the Zombies scatter).
const ending = (s) => (!ignores('volley') && (defender(s).integrity < defender(s).max / 2 || !usable(s).some((id) => AREA.has(id))) && livingParts(s).find((x) => x.cnc && x.zombies && reachable(s, x))) || null;
const shunned = (s, p) => (!!p?.pkg && !p.pkg.inert && livingParts(s).some((x) => x.id === 'loader')) || (!!p?.zombie && !!ending(s));
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
// What a Decoy's beat can't bend (combat.mjs bendCommand: only a command at one part bends): a shield or a buff on you,
// an area command, then hold. The planner's move on a beat it won't fire into, and solved.mjs's always-quiet side.
export const quietOf = () => [...QUIET.filter((id) => !['patch', 'null-route', 'sudo', 'fork', 'mesh'].includes(id)), 'fork-bomb', 'garbage-collect', 'failover', 'irq-storm', 'cron-storm', 'outbreak', 'kill-switch', 'patch', 'brace', 'hold'];
// solved.mjs's fixed sides (docs/puzzle-levers.md 6): a player that works on one part before the rest, whatever the
// board says. It still answers what lands now and the tells; only its choice of target is fixed.
let prefer = null;
export function preferring(p, fn) {
  const was = prefer;
  prefer = p;
  try { return fn(); } finally { prefer = was; }
}
// The planner without some skills (veto(id) true: never picked), for a program's rotation (routines.mjs).
export function plannerWithout(s, no) {
  const was = veto;
  veto = no;
  try { return planner(s); } finally { veto = was; }
}
// The kit player (docs/puzzle-fights.md 3.1): it plays your kit well and reads the timers, but reads nothing of the
// virus: no tell (TELL.bots.answer off) and no gene's rule (every gene in GENE_BOTS.ignore, the Buffer's too). A
// program's rotation (routines.mjs), and solved.mjs's kit player. read: genes it reads after all (a routine's beat
// chip fires the rotation on a beat: the chip is the reading, so it goes quiet on it).
const UNREAD = new Set([...Object.keys(GENES), 'buffer', 'backlash', 'leave']); // a P4 boss's beat and its ♛ (acts.mjs)
export function kitPlanner(s, no = null, read = null) {
  const answer = TELL.bots.answer, ignore = GENE_BOTS.ignore;
  TELL.bots.answer = !!read?.length && answer; GENE_BOTS.ignore = read?.length ? new Set([...UNREAD].filter((g) => !read.includes(g))) : UNREAD;
  try { return no ? plannerWithout(s, no) : planner(s); } finally { TELL.bots.answer = answer; GENE_BOTS.ignore = ignore; }
}
// The kit player aimed at one part (routines.mjs, the Rotation chip): it works on that part, and still sees the rest of
// the board (what lands now, a part it can break first, your health).
let focus = null;
export function kitPlannerAt(s, p, no = null, read = null) {
  const was = focus;
  focus = p;
  try { return kitPlanner(s, no, read); } finally { focus = was; }
}
// Scraper: its Scrape takes your shield, your ◆ and your timed buffs as it lands, so a player puts up no ◆ and no buff
// into it (a shield still stops the hit itself, so Firewall stays).
const BUFFING = new Set(['harden', 'brace', 'sudo', 'fork', 'debris-field', 'rm-rf', 'circuit-breaker', 'honeypot', 'maintenance-window', 'bulkhead', 'dmz', 'mesh']);
const scrapeNow = (s) => !ignores('scraper') && landingNow(s).some((i) => part(s, i.source)?.scrape);
export function planner(s) {
  if (s.encounter?.actBars && !livingParts(s).length) return 'hold'; // between acts (act bars): the next board comes in at the cycle's end
  if (!scrapeNow(s)) return heedFloor(s, heedActs(s, heedBend(s, heedHelpers(s, spareLast(s, planner1(s))))));
  const was = veto;
  veto = (id) => BUFFING.has(id) || !!(was && was(id));
  try { return heedFloor(s, heedActs(s, heedBend(s, heedHelpers(s, spareLast(s, planner1(s)))))); } finally { veto = was; }
}
// The floor 2 and 3 bosses' rules (floorbosses.mjs), read only (answers): withdraw the Gavel's bid at every 2; let a
// Deadline land when the Ransom Clock would leak first; on a closed cycle (or the two before an Again beat) fire nothing
// the Logger would play back; work on the top frame.
const SLOWS = Object.keys(ABILITIES).filter((id) => ABILITIES[id].delay > 0 || ABILITIES[id].status === 'throttled');
const hitsBack = (s, move) => { const [id] = String(move || '').split(' '); return copyKind(id) === 'hit' && (ABILITIES[id]?.damage || 0) > 12; };
function heedFloor(s, move) {
  const e = s.encounter, v = e?.virus;
  if (!v || !answers() || !move) return move;
  const [id, at] = String(move).split(' '), c = e.cycle;
  // one: a one-part command that hits (what a floor boss's rule counts as your command on a part).
  const hits1 = (k) => ['part', 'attack'].includes(ABILITIES[k]?.target) && (ABILITIES[k].damage || 0) > 0;
  if (v.bid) {
    const g = livingParts(s).find((p) => p.gavel && p.attack);
    if (g && g.attack.interval <= 2 && g.attack.due - c <= 1) { const slow = first(s, [...SLOWS.map((k) => `${k} ${g.id}`), ...(g.attack.due === c ? ['sigint'] : [])]); if (slow) return slow; }
    // A command at the Gavel is a bid while the Rotor stands: work the Rotor and the buyers, the Gavel last.
    const rotor = livingParts(s).find((p) => p.core), aim = at && part(s, at);
    if (g && rotor && aim === g && !SLOWS.includes(id)) { const alt = first(s, [`${id} ${rotor.id}`, ...HITS.map((k) => `${k} ${rotor.id}`)]); if (alt) return alt; }
    // No delay at hand: cut the selling Surge, when one command takes the Gavel across its tick on the cycle it lands.
    const n = g && g.attack.interval <= 2 && g.attack.due === c ? toCross(g) : null;
    if (n != null && !(g.armor > 0)) { const cut = first(s, [id, ...HITS].map((k) => `${k} ${g.id}`).filter((m) => previewDamage(s, m.split(' ')[0], g) >= n)); if (cut) return cut; }
  }
  if (v.ransom && at) {
    const d = part(s, at);
    // The Collector runs the clock and the Demand's Deadlines pay it: never break the last Demand while the Collector stands.
    const col = livingParts(s).find((p) => p.core);
    // Leverage: while a Demand stands the Collector loses only so much a cycle. A hit that would waste a third of itself
    // on that cap goes at a Demand winding up a Deadline the clock doesn't need (never breaking the last one); else the
    // biggest hit that fits the cap goes at the Collector.
    const left = col ? leverLeft(s, col) : null;
    if (left != null && d === col && hits1(id) && !(col.armor > 0) && previewDamage(s, id, col) > 1.5 * left) {
      const dem = livingParts(s).filter((p) => p.deadline && p.attack && p.attack.due - c <= 2 && v.ransom.left > p.attack.due - c + p.attack.interval).sort((a, b) => a.attack.due - b.attack.due)[0];
      const off = dem && !(killing(s, `${id} ${dem.id}`, dem) && livingParts(s).filter((p) => p.deadline).length === 1) && first(s, [`${id} ${dem.id}`]);
      if (off) return off;
      const fit = [...HITS, 'spike'].filter((k) => hits1(k) && ok(s, `${k} ${col.id}`) && previewDamage(s, k, col) <= 1.5 * left).sort((a, b) => previewDamage(s, b, col) - previewDamage(s, a, col))[0];
      if (fit) return `${fit} ${col.id}`;
    }
    if (d?.deadline && col && killing(s, move, d) && livingParts(s).filter((p) => p.deadline).length === 1) { const alt = first(s, [`${id} ${col.id}`, ...HITS.map((k) => `${k} ${col.id}`)]); if (alt) return alt; }
    if (d?.deadline && d.attack && !chargeNow(s, d) && d.attack.due - c <= 2 && v.ransom.left >= d.attack.due - c + 1 && v.ransom.left <= d.attack.due - c + d.attack.interval && !killing(s, move, d)) { // it lands before the leak, and the clock would leak before the next one
      const to = livingParts(s).find((p) => p.core) || livingParts(s).find((p) => !p.deadline);
      const alt = to && first(s, [`${id} ${to.id}`, ...HITS.map((k) => `${k} ${to.id}`)]);
      if (alt) return alt;
    }
  }
  if (v.stack) {
    // A Call this cycle or next: the top frame broken or brought under a quarter first, with the biggest hit that does it.
    const tf = topFrame(s);
    if (callingNow(s) && ok(s, 'sigint')) return 'sigint'; // the Call this cycle: SIGINT stops it
    if (tf && canCall(tf) && v.stack.callAt - c <= 1) {
      const need = tf.integrity - Math.floor(tf.max * 0.25) + 1, done = (m) => { const k = m.split(' ')[0]; return !(tf.armor > 0 && !ignoresArmor(s, k)) && previewDamage(s, k, tf) >= need; };
      if (!(at === tf.id && done(move))) { const hit = first(s, [...HITS, ...Object.keys(ABILITIES)].map((k) => `${k} ${tf.id}`).filter(done)); if (hit) return hit; }
    }
    // A top frame too low to Call holds the stack: break it just after a Call, never the cycle before one while the
    // frame beneath could Call. Meanwhile area hits, burns and helpers work the frames below.
    const top = topFrame(s), aim = at ? part(s, at) : null, below = top && livingParts(s).filter((p) => p.frame != null && p.frame < top.frame).sort((a, b) => b.frame - a.frame)[0];
    if (top && aim === top && !canCall(top) && canCall(below) && v.stack.callAt - c <= 1 && killing(s, move, top)) {
      const soft = first(s, [...[...AREA].filter((k) => !killing(s, k + ' ' + top.id, top)), ...['inject', 'deploy', 'botnet', 'spawn', 'thermal-runaway'].map((k) => `${k} ${below.id}`), ...quietOf(s)]);
      if (soft) return soft;
    }
  }
  const one = hits1(id), onto = (p) => first(s, [...(one ? [id] : []), ...HITS, 'spike'].filter(hits1).map((k) => `${k} ${p.id}`));
  if (v.desk) {
    // NIGHT DESK: only the Desk takes damage, and a hit on it settles its own trade. A trader's is answered from two
    // pending (Finality: only when the next one would fill the table), the biggest first.
    const pend = pendingOf(s), aim = at && part(s, at), desk = livingParts(s).find((p) => p.core), opens = (k) => livingParts(s).filter((p) => p.attack && p.attack.due <= c + k).length;
    const sum = (p) => p.pending.reduce((n, t) => n + tradeOf(s, t), 0), held = livingParts(s).filter((p) => p.pending?.length).sort((a, b) => (b === desk) - (a === desk) || sum(b) - sum(a));
    const must = pend.length + opens(1) >= FB.desk.full; // a trade can open before your command lands: a cycle ahead of the fourth
    if (held.length && must) { const m = one && aim === held[0] ? move : onto(held[0]); if (m) return m; } // the Desk's own first: the hit that settles it also lands
    if (desk && aim && aim !== desk && aim.role === 'trader') { const m = first(s, [`${id} ${desk.id}`]); if (m) return m; }
  }
  if (v.vote) {
    // BYZANTINE: spread it. Each one-part command goes at the healthiest Node (the traitor while it isn't the most
    // damaged, and never onto a Node the hit would leave under the traitor), and under the Hard fork no Node is broken
    // while another stands at half or more.
    const ns = nodesOf(s), aim = at && part(s, at), fr = (p) => p.integrity / p.max;
    if (ns.length > 1 && aim?.role === 'node' && !AREA.has(id)) {
      const tr = ns.find((p) => p.id === v.vote.traitor), byHealth = [...ns].sort((a, b) => fr(b) - fr(a) || a.armor - b.armor);
      // A Node that can be broken before the vote is broken (under the Hard fork, only once every other is under half).
      const left = v.vote.at - c + 1, size = (p) => Math.max(1, Math.min(previewDamage(s, hits1(id) ? id : 'spike', p), (p.limit || 1) * p.max));
      const fits = (p) => (p.armor || 0) + Math.ceil(p.integrity / size(p)) <= left && !(v.vote.fork && ns.some((x) => x !== p && fr(x) >= 0.5));
      let want = [...ns].sort((a, b) => a.integrity - b.integrity).find(fits);
      if (!want) {
        want = tr && ns.some((p) => p !== tr && fr(p) < fr(tr)) ? tr : byHealth.find((p) => p !== tr) || byHealth[0];
        if (v.vote.fork && killing(s, `${id} ${want.id}`, want) && ns.some((p) => p !== want && fr(p) >= 0.5)) want = byHealth.find((p) => p !== want) || want;
        // The Traitor: a hit that leaves another Node the most damaged swings the vote to the healthiest Node's level.
        // Of the Nodes it could hit, the one whose hit would have a vote restore the least (none, when one is safe).
        if (tr) {
          const swing = (t) => {
            const f = ns.map((p) => ({ p, f: p === t && !(p.armor > 0) ? Math.max(0, p.integrity - size(p)) / p.max : fr(p) })).filter((x) => x.f > 0);
            if (f.length < 2) return 0;
            const low = f.reduce((m, x) => (x.f < m.f ? x : m)), top = Math.max(...f.map((x) => x.f));
            const to = low.p !== tr && f.some((x) => x.p === tr) ? top : f.reduce((n, x) => n + x.f, 0) / f.length;
            return to - low.f >= FB.vote.pass - 1e-9 ? to - low.f : 0;
          };
          const safe = [want, ...byHealth.filter((p) => p !== want)].filter((p) => !(v.vote.fork && killing(s, `${id} ${p.id}`, p) && ns.some((x) => x !== p && fr(x) >= 0.5)));
          want = safe.reduce((m, p) => (swing(p) < swing(m) - 1e-9 ? p : m), safe[0] || want);
        }
      }
      if (want !== aim) { const m = first(s, [`${id} ${want.id}`]); if (m) return m; }
    }
  }
  if (v.swarm) {
    // CAMSWARM: the part that shields a fragment, before the fragment turns; a Camera before the Hive under the Lockout,
    // or before a Beacon on the Botnet; and no part taken under half that can't be broken before the next sweep (the
    // Hive never hatches: it takes what the others can't).
    const aim = at && part(s, at), hive = livingParts(s).find((p) => p.core), cams = camerasOf(s).sort((a, b) => a.integrity - b.integrity), tgt = !!ABILITIES[id]?.target && ABILITIES[id].target !== 'none' && !AREA.has(id);
    const to = (p) => first(s, [...(tgt ? [`${id} ${p.id}`] : []), ...[...HITS, 'spike'].filter(hits1).map((k) => `${k} ${p.id}`)]);
    const fuse = fragsOf(s).filter((f) => parentOf(s, f)).sort((a, b) => a.hatched - b.hatched)[0], host = fuse && parentOf(s, fuse);
    if (host && aim !== host) { const m = to(host); if (m) return m; }
    const loose = fragsOf(s).filter((f) => !parentOf(s, f)).sort((a, b) => a.hatched - b.hatched)[0];
    if (!host && loose && aim !== loose && loose.hatched + FB.swarm.grows - c <= 1) { const m = to(loose); if (m) return m; }
    const c2 = livingParts(s).find((p) => p.role === 'c2' && p.attack);
    const size = (p) => Math.max(1, Math.min(previewDamage(s, hits1(id) ? id : 'spike', p), (p.limit || 1) * p.max)), left = v.swarm.at - c; // commands after this one before the sweep
    const safe = (p) => p.integrity < p.max / 2 || p.armor > 0 || p.integrity - size(p) >= p.max / 2 || Math.ceil(p.integrity / size(p)) <= left + 1;
    if (!host && cams.length && tgt && aim?.role !== 'camera' && ((v.swarm.lockout && (aim === hive || !aim)) || (v.swarm.botnet && c2 && c2.attack.due - c <= 2))) { const cam = cams.find(safe); const m = cam && to(cam); if (m) return m; }
    if (!host && tgt && aim && aim.kind === 'system' && !aim.core && !safe(aim)) {
      const open = [...livingParts(s).filter((p) => p.kind === 'system' && !p.core && p !== aim && safe(p)), ...(hive && !shut(s, hive) ? [hive] : [])];
      const m = first(s, open.map((p) => `${id} ${p.id}`)) || first(s, quietOf(s));
      if (m) return m;
    }
  }
  if (v.grace) {
    // GRACE PERIOD: your command on a lapsed part on the cycle its charge lands calls the charge off.
    const due = (tellsOf(s)?.list || []).filter((t) => t.told && /^lapse:/.test(t.id) && tellNext(s, t) === c).map((t) => part(s, t.part)).find((p) => p && p.integrity > 0);
    if (due && at !== due.id) { const m = first(s, [...(['part', 'attack'].includes(ABILITIES[id]?.target) ? [id] : []), ...HITS, 'spike', 'crack'].map((k) => `${k} ${due.id}`)); if (m) return m; }
  }
  if (v.surf) {
    // A closed cycle: nothing at the Logger (it shrugs it off and logs it), and nothing big once the log has started.
    const shut = c % 2 === 1, beat = v.surf.again && v.surf.again - c <= 1, aim = at && part(s, at);
    const others = livingParts(s).filter((p) => !p.syncOnly && !frozenNow(s, p)).sort((a, b) => dueOf(s, a) - dueOf(s, b));
    if (shut && aim?.syncOnly) { const to = others[0], alt = to && !(hitsBack(s, move) && (e.keylog || 0) >= 1) && first(s, [`${id} ${to.id}`]); if (alt) return alt; }
    if ((shut && (e.keylog || 0) >= 1 && (hitsBack(s, move) || aim?.syncOnly)) || (beat && hitsBack(s, move))) return first(s, [...quietOf(s), ...(others[0] ? ['spike ' + others[0].id] : [])]) || 'hold';
    if (shut && aim?.syncOnly) return first(s, quietOf(s)) || 'hold';
  }
  return move;
}
// A P4 boss (acts.mjs): no command hit on the ♛ on its Backlash's beat, unless it breaks it, and the ♛ left above its
// next tick until this act's beat has played. The same command goes at another part, or a quiet move, or it waits.
function heedActs(s, move) {
  const v = s.encounter?.virus;
  if (!actsOf(v) || !move || move === 'hold') return move;
  const [id] = String(move).split(' '), it = toIntent(s, move), aim = it && !it.error ? part(s, it.target) : null;
  const bad = (p, k = id) => {
    if (!p) return false;
    const breaks = !(p.armor > 0 && !ignoresArmor(s, k)) && previewDamage(s, k, p) >= p.integrity;
    if (breaks) return false;
    if (!ignores('backlash') && lashOn(s, p)) return true;
    return false;
  };
  const hit = AREA.has(id) ? livingParts(s) : aim ? [aim] : [];
  if (!hit.some((p) => bad(p))) return move;
  if (!AREA.has(id)) { const to = livingParts(s).filter((x) => x !== aim && !frozenNow(s, x)).sort((a, b) => dueOf(s, a) - dueOf(s, b)).map((x) => `${id} ${x.id}`).find((t) => ok(s, t) && !bad(part(s, t.split(' ')[1]))); if (to) return to; }
  return first(s, quietOf(s).filter((q) => !AREA.has(q))) || 'hold';
}
// The Decoy (docs/puzzle-levers.md 3.8): on its beat a command at one part goes to the part it points at (combat.mjs
// bendCommand). Pointing at a part to break last while others stand, nothing that bends fires: a shield, a buff, an area
// command (quietOf). Pointing at itself, part of a hit bounces back, so it goes quiet when the bounce costs more than the
// half cycle quiet gives up. Veiled (the pointer doesn't show), it weighs where the pointer may be: any standing part but
// the one the last beat pointed at (the log said where that beat sent you). Else the command goes where it points: it
// lands there anyway. The cycle before a beat, it unveils a veiled Decoy when one command does it (a strip, or Tag).
// Sudo, Unmask and Echo Cancel go through it.
const bends = (s, id, to) => { const a = ABILITIES[id]; return !!a && (a.target === 'part' || (a.target === 'attack' && !!to?.attack)); };
function heedBend(s, move) {
  const e = s.encounter, [id, at] = String(move || '').split(' '), dec = mirrorOn(s);
  if (ignores('decoymirror')) return move;
  const next = !dec && mirrorOn(s, e.cycle + 1);
  const busy = tellsOf(s)?.list.some((t) => t.told && t.kind !== 'mimic'); // a tell to answer comes first
  if (next && !busy && timersHidden(s, next) && !(part(s, at) && killing(s, move, part(s, at)))) {
    const strip = next.armor <= 1 ? ['spike', 'crack', 'exploit'] : next.armor <= 3 ? ['crack'] : [];
    const unveil = first(s, [...['shaped-charge', ...strip, 'tag'].map((k) => `${k} ${next.id}`), next.armor <= 3 && 'fork-bomb']);
    if (unveil) return unveil;
  }
  if (!dec || !at || dec.unmaskUntil >= e.cycle || e.buffs?.sudo >= e.cycle) return move;
  const b = bendOf(s, dec), aim = part(s, at);
  if (!b?.to || !aim || !bends(s, id, b.to)) return move;
  // What the command is worth where it lands, in Signal: what it deals there, counted in your key 1's hits, each worth a
  // cycle of the virus's pace (on a part with no attack, half: it can wait; on ◆, a lesser move's worth), less what
  // bounces back. A command with no hit is worth a cycle where it lands. Quiet is worth half a cycle (TELL.copy.lesser),
  // hold nothing.
  const pace = paceOf(s), a = ABILITIES[id], hits = a.damage > 0 || a.hit > 0 || a.bareHit > 0 || a.verb === 'hit';
  const plan = Math.max(1, previewDamage(s, id, aim) || skillBase(s, id, aim)), b0 = skillBase(s, a.damage > 0 ? id : 'spike', aim) || 0, base = b0 + gearDamage(s, b0); // the whole hit bounces
  const key1 = Math.max(1, skillBase(s, 'spike', aim));
  const worth = (x) => {
    if (bendBad(s, dec, x) && x !== dec) return -Infinity; // a part to break last: never
    const k = x.attack ? 1 : TELL.copy.lesser;
    if (!hits) return k * pace;
    const dealt = x.armor > 0 && !ignoresArmor(s, id) ? key1 * TELL.copy.lesser : Math.min(plan, previewDamage(s, id, x));
    return k * (dealt / key1) * pace - (x === dec || dec.sings ? (dec.bounce ?? CONFIG.mirrorBounce) * base : 0);
  };
  const left = livingParts(s).filter((x) => x.kind === 'system' && x.id !== b.was), pool = b.shown ? [b.to] : left.length ? left : [dec];
  const fire = pool.reduce((n, x) => n + worth(x), 0) / pool.length, quiet = first(s, quietOf(s));
  if (quiet && fire < (quiet === 'hold' ? 0 : pace * TELL.copy.lesser)) return quiet;
  return b.shown && b.to !== aim && ok(s, `${id} ${b.to.id}`) ? `${id} ${b.to.id}` : move;
}
// A Zip Bomb and a Tripwire go last (order, below) unless their lever says now (leverNow), and no hit of a plan made for
// something else (a class's own kill) breaks one early: one that would finish it, or one a set's sure crit makes do so
// (Palemask: a part under half takes your next hit as a crit). The same skill goes onto another part instead, or it waits.
function spareLast(s, plan) {
  const [id, at] = String(plan || '').split(' '), p = part(s, at), e = s.encounter;
  const last = !!p && ((p.fuse && !p.fuseAt && !ignores('zipbomb')) || (p.deadman && !p.quiet && !ignores('tripwire') && !(e.buffs?.sudo >= e.cycle)));
  if (!last || !others(s, p) || p === prefer || leverNow(s) === p) return plan;
  const sure = p.sxCrit && Object.values(p.sxCrit).some(Boolean);
  if (!sure && !((bare(p) || ignoresArmor(s, id)) && previewDamage(s, id, p) >= p.integrity)) return plan;
  return first(s, livingParts(s).filter((x) => x !== p && x.kind === 'system' && !frozenNow(s, x)).map((x) => `${id} ${x.id}`)) || 'hold'; // nothing else to hit (a Cold Store still frozen): wait
}
function planner1(s) {
  const plan = plan0(s);
  if (!plan || !shunning(s)) return plan;
  const [id, at] = plan.split(' '), aim = part(s, at);
  if (!AREA.has(id) && !shunned(s, aim)) return plan;
  const t = (aim && !shunned(s, aim) ? aim : null) || ending(s) || livingParts(s).filter((p) => !shunned(s, p)).sort((a, b) => dueOf(s, a) - dueOf(s, b))[0];
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
  // A part left Open by a tell you read (tells.mjs): +50% from everyone for 2 cycles, so cash it in (not the Mimic while others stand: it has no attack).
  const open = !raidFocus(s) && ['breaker', 'bastion'].includes(classOf(s)) && livingParts(s).find((p) => p.openUntil >= s.encounter.cycle && !p.deadman && !(p.mimic && others(s, p)));
  const lever = leverNow(s), pick = (alive(prefer) && prefer) || lever;
  // RELAY-KING's Broadcast (a part's attack that grows by each fragment): clear the fragments in the cycle before it lands.
  const frag = answers() && livingParts(s).some((p) => p.broadcast && p.attack && p.attack.due - s.encounter.cycle <= 1) ? livingParts(s).filter((p) => p.kind === 'fragment').sort((a, b) => a.integrity - b.integrity)[0] : null;
  // HOLLOW CHOIR's second voice: break the weaker Mimic, so the Round sings with one voice.
  const voices = answers() ? livingParts(s).filter((p) => p.mimic) : [], voice = voices.length > 1 ? voices.sort((a, b) => a.integrity - b.integrity)[0] : null;
  let t0 = (alive(focus) && focus) || raidFocus(s) || tellFocus(s) || frag || voice || pick || open || crownNow(s) || key || (classOf(s) === 'infiltrator' ? soonest(s) : mostThreat(s));
  if (shunned(s, t0)) t0 = livingParts(s).filter((p) => !shunned(s, p)).sort((a, b) => dueOf(s, a) - dueOf(s, b))[0] || t0;
  // A Trojan's Loader (families.mjs): the part to break, its family's answer (the Courier only ever redeploys while it
  // stands, and every Package it delivers unpacks on a hit). Since fight length (data.mjs CONFIG.length) the Courier
  // outlasts enough deliveries that chasing the Droppers never ends.
  const loader = livingParts(s).find((p) => p.id === 'loader' && s.encounter.virus.family === 'trojan');
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
  if (warder && classOf(s) !== 'infiltrator' && t !== prefer) t = warder; // burns tick under the cap anyway
  // Tripwire, Zip Bomb: leave them for last while anything else stands.
  if (((t.deadman && !ignores('tripwire')) || (t.fuse && !ignores('zipbomb'))) && t !== pick) t = livingParts(s).filter((p) => p !== t && p.kind === 'system' && !p.deadman && !p.fuse).sort((a, b) => dueOf(s, a) - dueOf(s, b))[0] || livingParts(s).filter((p) => p !== t && p.kind === 'system').sort((a, b) => dueOf(s, a) - dueOf(s, b))[0] || t;
  // Front End: a direct hit on its partner lands on it while it wears ◆. A Breaker or a Bastion strips it first; burns and helpers go past.
  const fe = !ignores('frontend') && livingParts(s).find((p) => p.front && (p.armor > 0 || p.exe) && frontOf(s, p) === t);
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
  // Adaptive: a third cycle in a row on the same part hardens it. Switch, unless this hit breaks it.
  const wary = (p) => s.encounter.virus.mutation === 'adaptive' && !ignores('adaptive') && p.adaptRun >= 2 && p.adaptAt === s.encounter.cycle - 1;
  if (wary(t) && !killNow(s, t)) t = livingParts(s).filter((p) => p !== t && !wary(p) && !phasedOut(s, p)).sort((a, b) => dueOf(s, a) - dueOf(s, b))[0] || t;
  // Hotspot: a direct hit sets it off. Burns and helpers don't: use them on it if you have them.
  if (t.hotspot && !ignores('hotspot')) { const soft = first(s, [!injected(s, t) && 'inject ' + t.id, 'deploy ' + t.id, 'spawn ' + t.id, 'botnet ' + t.id, !burnsOn(s, t) && 'purge ' + t.id]); if (soft) return soft; }
  // Cryptominer (families.mjs): let the Rig cook while the rest stand, unless its Hash has doubled (a hit across its
  // tick vents it then); once it overheats, burst it.
  const rig = !ignores('hash') && livingParts(s).find((p) => p.hash || (p.tookOver === 'rig' && p.attack?.ramp));
  if (rig && t === rig && !s.encounter.virus.overheated && (rig.attack?.step || 0) * (rig.attack?.rampBy || 1) < (rig.attack?.amount || 0)) t = livingParts(s).filter((p) => p !== rig && reachable(s, p) && !shunned(s, p)).sort((a, b) => dueOf(s, a) - dueOf(s, b))[0] || t;
  // Twin Rig: work the healthier of the two, so both go down close together.
  const twinRig = !ignores('twinrig') && (t.id === 'rig' || t.twinrig) && livingParts(s).find((p) => p !== t && (p.id === 'rig' || p.twinrig) && reachable(s, p));
  if (twinRig && twinRig.integrity / twinRig.max > t.integrity / t.max + 0.2) t = twinRig;
  // Recycle Bin: it holds the key the Wipe took; cross one of its ticks to get the key back.
  const bin = !ignores('recyclebin') && livingParts(s).find((p) => p.bin && !p.armor && p.binHeld && s.encounter.wiped?.[p.binHeld.id] >= s.encounter.cycle && p.ticks?.some((x) => !x.spent) && reachable(s, p)); // bare: a hit gets it across
  if (bin) t = bin;
  // Wiper: a Wipe lands this cycle and takes your strongest ready key, so fire that key now.
  if (!ignores('wipe') && landingNow(s).some((i) => part(s, i.source)?.attack?.wipe === 'strongest')) {
    const key = usable(s).filter((id) => !['spike', 'sigint'].includes(id) && ABILITIES[id] && readyIn(s, id) === 0).sort((a, b) => (ABILITIES[b].damage || 0) - (ABILITIES[a].damage || 0) || (ABILITIES[b].cooldown || 0) - (ABILITIES[a].cooldown || 0))[0];
    if (key && ABILITIES[key].damage > 0 && !t.armor && ok(s, key + ' ' + t.id)) return key + ' ' + t.id; // a hit on a bare part only: a shield or heal waits for its moment
  }
  // Botnet (families.mjs): end it at the C&C unless an area kit can farm it (ending, above).
  if (ending(s)) t = ending(s);
  // A subclass's own play (dist/classes/<class>.mjs plan): its new skills, before the generic rules.
  // Palemask (sets.mjs, the Infiltrator's tier set): a part you took under half takes your next hit as a critical
  // strike. Spend it on the biggest direct hit you have ready, there (not on a part your burns finish anyway, or under ◆).
  const sure = livingParts(s).find((p) => p.sxCrit?.[s.who || ''] && !doomed(s, p) && !(p.armor > 0) && reachable(s, p) && !phasedOut(s, p) && !shunned(s, p) && !keptLast(s, p));
  if (sure) { const c = HITS.map((id) => id + ' ' + sure.id).filter((c) => ok(s, c) && previewDamage(s, c.split(' ')[0], sure) > 0).sort((a, b) => previewDamage(s, b.split(' ')[0], sure) - previewDamage(s, a.split(' ')[0], sure))[0]; if (c) return c; }
  const own = classPlan(s, t);
  // An order lever says now: a class's own plan goes at it too, and no Sudo makes a Tripwire's trip quiet (loud is the
  // point: the others drop their ◆ and take more).
  const astray = pick && t === pick && own && ((String(own).split(' ')[1] && String(own).split(' ')[1] !== pick.id) || (pick.deadman && String(own).split(' ')[0] === 'sudo'));
  if (own && ok(s, own) && !astray) return own;
  const d = defender(s);
  // 0. A lit proc: use it while it's the biggest hit you have on the part (it still takes your command).
  const lit = first(s, ['shatter ' + t.id, 'retaliate ' + t.id, 'opening ' + t.id]);
  const best = Math.max(0, ...['overload', 'flood', 'segfault', 'backdoor', 'reclaim'].filter((id) => ok(s, id + ' ' + t.id)).map((id) => previewDamage(s, id, t)));
  if (lit && bare(t) && (!lit.startsWith('shatter') || previewDamage(s, 'shatter', t) >= best)) return lit;
  // 1. Break a part that's about to fire, or a bare part before it patches.
  const urgent = [...new Set(now.map((i) => part(s, i.source)))].filter(alive);
  // (Not a Zip Bomb, a Tripwire or a Hotspot while anything else stands: two break last unless their lever says now, the
  // third is set off by a direct hit.)
  const later = (x) => (((x.fuse && !ignores('zipbomb')) || (x.deadman && !x.quiet && !ignores('tripwire'))) && x !== pick || (x.hotspot && !ignores('hotspot'))) && others(s, x); // a Tripwire too, unless loud wins
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

// ---------- the Operator's helpers (docs/puzzle-fights.md 3.2) ----------
// A helper's hit is your hit on every lever, and the Mimic's beat plays back the helpers on its part that were sent once
// it was said. So no helper goes onto the Mimic's part if its hits would still run on a beat on the board (one sent right
// after a beat, short enough to end before the next, is free), and none whose hits would break a Tripwire while other
// parts stand. The move is planned again with that part off the board and Fan-out vetoed (with the Mimic alone, with no
// helper skill). On the beat, Kill Switch cashes in the helpers it would catch.
const HELPS = new Set(Object.keys(ABILITIES).filter((id) => ABILITIES[id].helper));
let heeding = false;
// Every hit the helpers on p have left, with one more helper skill's on top: do they break it (a hit on ◆ breaks one)?
function helpersBreak(s, p, a) {
  const e = s.encounter, hits = e.helpers.filter((h) => h.target === p.id).flatMap((h) => Array(h.left).fill(h.damage));
  hits.push(...Array((a.helpers || 1) * (a.ticks || 1)).fill(scaled(s, a.helper)));
  let armor = p.armor || 0, dmg = e.burns.filter((b) => b.target === p.id).reduce((n, b) => n + b.damage * b.left, 0);
  for (const d of hits) { if (armor > 0) armor--; else dmg += d + hookHit(s, p); }
  return dmg >= p.integrity;
}
function heedHelpers(s, move) {
  if (heeding || !move) return move;
  const e = s.encounter, c = e.cycle, b = answers() && !ignores('mimic') ? beatOn(s) : null;
  const [id, at] = String(move).split(' ');
  // The helpers it would catch cost their hits; Kill Switch cashes them in, and its own copy is a hit too (tells.mjs copyOf).
  const caught = b ? e.helpers.filter((h) => h.target === b.p.id && h.left > 0 && h.sent >= b.t.said).reduce((n, h) => n + h.damage, 0) : 0;
  if (b && b.t.next === c && !beatBlind(s, b.p, c) && !(at === b.p.id && killing(s, move, b.p)) && caught > 0 && copyCost(s, 'kill-switch') < copyCost(s, move) + caught && ok(s, 'kill-switch')) return 'kill-switch';
  if (!HELPS.has(id)) return move;
  const a = ABILITIES[id], off = [];
  if (b && (at === b.p.id || id === 'fan-out') && b.t.next <= c + (a.ticks || 1) - 1 && !beatBlind(s, b.p, b.t.next)) off.push(b.p); // its hits run c to c + ticks - 1
  const trip = !ignores('tripwire') && !(e.buffs?.sudo >= c) && livingParts(s).find((p) => p.deadman && !p.quiet && others(s, p) && p !== prefer && p !== leverNow(s) && (at === p.id || id === 'fan-out'));
  if (trip && helpersBreak(s, trip, a)) off.push(trip);
  if (!off.length) return move;
  const hp = off.map((p) => p.integrity), was = veto, alone = livingParts(s).every((p) => off.includes(p));
  heeding = true;
  // Those parts off the board, or with nothing else standing (the Mimic alone: it has no attack, so waiting costs
  // nothing), no helper skill at all this cycle.
  if (!alone) off.forEach((p) => { p.integrity = 0; });
  let next;
  try { next = plannerWithout(s, (k) => (alone ? HELPS.has(k) : k === 'fan-out') || !!(was && was(k))) || 'hold'; } finally { off.forEach((p, i) => { p.integrity = hp[i]; }); heeding = false; }
  return echoesNow(s, next) ? 'hold' : next; // nothing quiet left for the beat: hold
}


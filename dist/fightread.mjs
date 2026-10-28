// Reading a fight (the designer's readability pass): the words on the fight board that say what a tell does and how
// to stop it, which of your gear's conditional rules are live right now, and what a part you've decoded does. Pure:
// view.mjs puts these into the board and the HUD, app.js only lights and flashes what they mark.
//
//   tellTip(s, i, c, to)   a tell chip's tooltip: its name, what happens if it lands (with the number), and how to
//                          stop it under the current rule (a burst, SIGINT, a strip, an interrupt tick) with its window
//   gearLive(s)            your equipped rules and unique effects that have a condition, each lit when it holds now
//   cycleGear(s, cycle)    the cycle-conditioned ones live on a cycle (the timeline's column headers)
//   partRead(s, v, p)      what a part does, how to answer it, and its one-word cue, from its spec and its flags
//   partTip(s, v, p)       the part's tooltip by its research (research.mjs): ??? until decoded, its attack at 1, its
//                          rule and answer from 5
//   partLinks(s, v)        what protects what: one link a rule that reaches from one part to another (a Mutex's lock, a
//                          Lockbox's ward, a Mirror's twin, a Keyring's re-arm), for the board's tethers
//   helperPlan(s, fc)      your helpers' schedule: a pip for each hit they have left (Now to +3) on the part it lands on,
//                          the ones that trip a lever, and where helpers move on from a part breaking this cycle
//   lockOf(s, v, p)        the lock shield a part wears now (its bar's absorb segment), wardOf the most a ward lets it lose
import { part, livingParts, bendOf, gearFx, fxHolds, blocked, attackAmount, knowsPart, usable, fxOn, alive, wards, belowOf, frontOf, signatureOf, frozenNow, asleep, limitOf, packed, active, attackers, hookHit } from './combat.mjs';
import { CONFIG, TELL, TELLS, BOSSES, STRAINS } from './data.mjs';
import { fxText } from './content.mjs';
import { tellsOf, tellIntents, partTells, NEW_TELLS, beatOn, beatBlind, copyOf, dearCopy } from './tells.mjs';
import { nextTick } from './interrupt.mjs';
import { BODY } from './families.mjs';
import { situationOf } from './situations.mjs';
import { knows, TIER } from './research.mjs';

const when = (n) => (n <= 0 ? 'this cycle' : n === 1 ? 'next cycle' : `in ${n} cycles`);
const cycles = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;
const every = (n) => (n === 1 ? 'every cycle' : `every ${n} cycles`);
const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const join = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const pct = (k) => `${Math.round(k * 100)}%`;
// A Damper's dropped kind (combat.mjs hitKind): its words and its icon.
export const DAMPED = { burn: { many: 'burns', short: 'burns', icon: 'burn' }, helper: { many: 'helpers', short: 'helpers', icon: 'daemon' }, area: { many: 'area hits', short: 'area hits', icon: 'spider' } };

// ---------- tells ----------
// What a tell that gets through leaves on you (tells.mjs corrupt, hang, lockLast), by the virus's tier. Sandman stops all of it.
function afterOf(s) {
  const T = tellsOf(s)?.tier;
  if (!T || fxOn(s, 'no-after')) return '';
  const on = [T.burn ? 'Corrupted' : '', T.hang ? 'Hung' : ''].filter(Boolean), off = T.after ? ` Takes your last skill offline for ${cycles(T.after)}.` : '';
  return (on.length ? ` Leaves you ${join(on)}.` : '') + off;
}
// The interrupt (interrupt.mjs): its part's next tick, crossed on the cycle it lands, cancels it.
function cutOf(s, p) {
  const e = s.encounter, t = e?.ticked && p && !p.core ? nextTick(p) : null;
  if (!t || (e.cutBudget != null && e.cutBudget <= 0)) return null;
  return t;
}
// The window, in the board's words: this cycle, in 2 cycles, now until it lands, from next cycle until it lands.
function windowWords(i, c) {
  if (c <= 0) return 'this cycle';
  if (i.open) return `now until it lands ${when(c)}`;
  if ((i.winFrom ?? c) >= c) return when(c);
  return `from ${when(i.winFrom)} until it lands ${when(c)}`;
}
// Line 1: what happens if it lands, with its number (and, for a cast, when it can be interrupted).
function landsLine(s, i, p, to, c) {
  const you = to === 'all' ? 'each of you' : to && to !== 'you' ? to : 'you';
  if (i.tell === 'charge') {
    const after = ['damage', 'encrypt'].includes(i.effect) || i.hit ? afterOf(s) : '';
    const shred = i.shred ? ' Shreds a file in your pack.' : '';
    if (i.effect === 'damage') return `Deals ${i.amount} damage to ${you}.${shred}${after}`;
    if (i.effect === 'encrypt') return `Adds ${i.amount} to your encryption. Deals a burst of ${i.burst || 0} damage to you every cycle for ${cycles(TELL.burst)}.${after}`;
    if (i.effect === 'replicate') return `${i.hit ? `Deals ${i.hit} damage to ${you} and spawns` : 'Spawns'} ${i.spawn || 1} ${(i.spawn || 1) === 1 ? 'fragment' : 'fragments'}.${after}`;
    if (i.effect === 'scramble') return `${i.hit ? `Deals ${i.hit} damage to ${you} and Scrambles` : 'Scrambles'} you for ${cycles(i.amount)}.${after}`;
    if (i.effect === 'heal') return `Heals the most damaged part for ${i.amount}.`;
    return `Powers up the ${p?.name}'s attack.${after}`;
  }
  if (i.tell === 'cast') {
    const lasts = Math.max(1, (i.does === 'overclock' ? NEW_TELLS.overclock.lasts : TELL.castLasts) - (fxOn(s, 'cast-short')?.fx.value || 0));
    const win = ` Can be interrupted ${windowWords(i, c)}.`;
    if (i.does === 'overclock') return `For ${cycles(lasts)}, every part takes double damage and every attack comes 1 cycle sooner.${win}`;
    const what = i.does === 'loud' ? `Every attack deals ${pct(TELL.loud - 1)} more damage for ${cycles(lasts)}.` : i.does === 'grow' ? `Increases every part's Integrity by ${pct(TELL.grow)}.` : `Every attack repeats 1 cycle faster for ${cycles(lasts)}.`;
    return what + afterOf(s) + win;
  }
  if (i.tell === 'seal') {
    const T = tellsOf(s)?.tier, proof = fxOn(s, 'seal-proof');
    const mine = T?.after && !proof ? ` Removes your ◆ and shield.${T.burn ? ' Leaves you Corrupted.' : ''}` : '';
    return `Re-arms the ${p?.name} to ${(p?.maxArmor || 0) + 1} ◆, and every stripped part gets 1 ◆ back. Fails if the ${p?.name} wears no ◆.${mine}`;
  }
  if (i.tell === 'lock') return `Locks the first command you fire after it for ${cycles(NEW_TELLS.lock.cycles)}, key 1 included.`;
  const twice = BOSSES[s.encounter?.virus?.boss]?.mimic > 1 ? ' A hit comes back twice over while you are Scrambled.' : '';
  const copy = i.copy ? ` Copies your ${i.copy.name}: ${i.copy.text}.` : '';
  return `Beat, ${when(c)}. Copies the command you fire then and turns it on you.${copy}${twice}`;
}
// Line 2: how to stop it, under the rule that applies here, and when: one short imperative.
function stopLine(s, i, p, c) {
  const name = p?.name || 'part', t = cutOf(s, p), under = t ? `take the ${name} under ${pct(t.at)}` : '';
  const armor = p?.armor > 0 ? `, past its ${p.armor} ◆` : '';
  if (i.tell === 'charge') return t ? `Take the ${name} under ${pct(t.at)} ${when(c)}${armor}.` : `Soften it with ◆, a shield or Brace. The ${name} has no tick left.`;
  if (i.tell === 'cast') return `SIGINT it${t ? `, or ${under}` : ''}.`;
  if (i.tell === 'seal') return p?.armor > 0 ? `Strip its ${p.armor} ◆ before it lands ${when(c)}.` : `Keep the ${name} stripped until it lands ${when(c)}.`;
  if (i.tell === 'lock') return `Break the ${name} first, or feed it a skill already cooling.`;
  return `Fire what costs you least to have copied, or hold${t ? `, or ${under}` : ''}.`;
}
// The Mimic's beat (tells.mjs copyOf): what the command you have selected (cmd: { ability, target }, none: hold) would
// copy onto you, for the beat cell's chip, its tooltip and the red ghost on your Signal bar or ◆ (view.mjs). col: how
// many cycles until the beat. null with no beat on the board, or one that sees nothing of you.
export function beatCopy(s, cmd) {
  const b = active(s) ? beatOn(s) : null;
  if (!b || beatBlind(s, b.p, b.t.next)) return null;
  const c = copyOf(s, cmd?.ability || 'hold', cmd?.target ? part(s, cmd.target) : null);
  return c ? { ...c, col: b.t.next - s.encounter.cycle, dear: dearCopy(s, c) } : null;
}
// The tooltip: "Name: line 1", then line 2 on its own ▸ line. The chip itself carries the kind, the timing, the number
// and the answer's verb.
export function tellTip(s, i, c = i.col, to = null) {
  const p = part(s, i.source);
  return `${i.name}: ${landsLine(s, i, p, to, c)}${answerLine(stopLine(s, i, p, c))}`;
}

// ---------- your gear, live ----------
// The conditions a hit can carry that read the board now (content.mjs FX_IF). 'crit' is the hit's own outcome, so a
// rule on it is never "live" ahead of time: it isn't listed.
const TARGET = /^target-/;
const KIND = { 'odd-cycle': 'cycle', 'even-cycle': 'cycle', synced: 'sync', 'below-half': 'you', 'below-20': 'you', 'any-tell': 'tell', 'target-telling': 'tell', charged: 'tell', moment: 'moment' };
export const GEAR_ICON = { cycle: 'clock', sync: 'sync', you: 'shield', tell: 'signal', target: 'crit', moment: 'buff', answer: 'counter' };
const nameOf = (x) => x.name || x.it?.name || x.id;
const lineOf = (x) => fxText(x.fx);
// Your equipped effects that wait on a condition, each with whether it holds now:
// [{ id, name, kind, cond, lit, spent, parts (ids it holds on, for a part's condition), text, tip }].
export function gearLive(s) {
  const e = s.encounter;
  if (!e?.virus) return [];
  const out = [];
  for (const x of gearFx(s)) {
    const fx = x.fx, cond = fx.if || '';
    if ((!cond && fx.when !== 'answer') || cond === 'crit') continue;
    const kind = !cond ? 'answer' : TARGET.test(cond) ? (cond === 'target-telling' ? 'tell' : 'target') : KIND[cond] || 'you';
    const spent = (fx.limit === 'fight' && !!e.once?.['fx:' + x.id]) || (fx.limit === 'run' && !!s.run?.fx?.[x.id]);
    let parts = [], lit;
    if (TARGET.test(cond)) { parts = livingParts(s).filter((p) => fxHolds(s, fx, { target: p })).map((p) => p.id); lit = parts.length > 0; }
    else if (!cond) lit = tellIntents(s).some((i) => i.open); // a rule on an answer: a tell's window is open
    else if (cond === 'charged') lit = tellIntents(s).some((i) => i.tell === 'charge' && i.col === 0);
    else if (cond === 'moment') lit = usable(s).some((id) => !!situationOf(s, id));
    else lit = fxHolds(s, fx, {});
    lit = lit && !spent;
    const now = spent ? 'Spent this fight.' : !lit ? '' : parts.length ? `Live now on the ${join(parts.map((id) => part(s, id)?.name || id))}.` : 'Live now.';
    out.push({ id: x.id, name: nameOf(x), kind, cond, lit, spent, parts, text: lineOf(x), tip: `${nameOf(x)}: ${lineOf(x)}${now ? '\n' + now : ''}` });
  }
  return out;
}
// The cycle-conditioned rules (odd or even cycles) live on a cycle: the timeline marks its column for them.
export function cycleGear(s, cycle) {
  return gearFx(s).filter((x) => ['odd-cycle', 'even-cycle'].includes(x.fx.if) && (x.fx.if === 'odd-cycle') === (cycle % 2 === 1)).map(nameOf);
}

// ---------- parts ----------
// A part's spec words, from what it is: its flags (data.mjs, genes.mjs parts, families.mjs bodies) first, then its
// attack. Numbers are the live part's (its level, the room's size), and a hit on you is after your Block, as the board shows.
// WoW tooltip grammar (docs/ui.md "Tooltip style"): the mechanics are short present-tense sentences that lead with the
// verb or the effect, with numerals and units and no advice. The answer is one short imperative on its own line.
const nameIn = (v, id) => v?.parts?.find((x) => x.id === id)?.name || ({ encryptor: 'Encryptor', replicator: 'Replicator', miner: 'Miner' }[id] || id);
const hitOf = (s, p) => (s ? blocked(s, attackAmount(p)) : attackAmount(p));
const deals = (n, who = 'you') => `Deals ${n} damage to ${who}`;
function attackRead(s, v, p) {
  const a = p.attack, n = hitOf(s, p), each = a.interval < 900 ? ` ${every(a.interval)}` : '';
  if (a.effect === 'encrypt') return [`Encrypts you${each}. Each Encrypt deals ${attackAmount(p)} damage to you every cycle until the ${p.name} breaks. A ◆ on you blocks one Encrypt.`, 'Break it to end the encryption.'];
  if (a.effect === 'replicate') return [`${a.hit ? `Deals ${s ? blocked(s, a.hit) : a.hit} damage to you and spawns` : 'Spawns'} a fragment${each}. Each fragment deals damage to you every cycle. Holds up to ${CONFIG.fragmentCap} fragments at once.`, 'Break it. Hit every part to clear fragments.'];
  if (a.effect === 'scramble') return [`${deals(s ? blocked(s, a.hit || 0) : a.hit || 0)}${each}, and Scrambles you for ${cycles(a.amount)}. While you are Scrambled, each of your attacks has a ${pct(CONFIG.scramble.chance)} chance to hit you instead, at half damage. A ◆ on you blocks the Scramble.`, 'Fire commands with no direct hit while Scrambled.'];
  if (a.effect === 'heal') return [`Heals the most damaged part for ${a.amount}${each}.`, 'Break it first, or finish a part between heals.'];
  if (a.windup) return [`Winds up a ${a.name} that deals ${n} damage to you. Dealing ${a.windup} damage to the ${p.name} in the 2 cycles before it lands calls it off.`, 'Save a burst for the wind-up.'];
  if (a.alarm) return [`Dormant until you deal damage or cycle ${Number.isFinite(v?.dormant) ? v.dormant : STRAINS[v?.strain]?.dormant || 6} begins. When it wakes, its ${a.name} deals ${n} damage to you.`, 'Set up before it wakes, then open big.'];
  if (a.dump) return [`Logs each command you fire outside a Sync Window. At 3 logs, its ${a.name} deals ${n} damage to you. Also ${a.name}s every ${a.interval} cycles.`, 'Fire inside the Sync Window.'];
  if (a.ramp) return [`${deals(n)}${each}. Each hit deals ${a.rampBy || 1} more than the last. A delay resets the climb.`, 'Delay it, or break it early.'];
  if (a.grow) return [`${deals(n)}${each}. Deals more damage every cycle the fight lasts.`, 'Break it early.'];
  if (p.taps) return [`${deals(n)} ${times(p.taps)} on back-to-back cycles${each}. A cut stops the rest of the volley, and a delay moves all of it.`, 'Cut it on its first hit.'];
  if (p.accum) return [`Charges a ${a.name} that deals ${n} damage to you${each}. Tells never charge it.`, 'Break it before its bar fills, or shield the hit.'];
  if (p.cipher) return [`${deals(n)}${each}. Deals ${pct(p.cipher)} more for each Encrypt or Ratchet step on you.`, 'Break the Encryptor, or Purge your encryption.'];
  if (p.fanin) return [`${deals(n)}${each}. Deals ${pct(p.fanin)} more for each fragment on the board.`, 'Clear the fragments, or break the Replicator.'];
  if (a.interval === 1) return [`${deals(n)} every cycle. Your Block reduces every hit.`, 'Break it early.'];
  if (a.siphon) return [`${deals(n)}${each}. Heals the most damaged part for the damage dealt, and removes 1 burn from that part.`, 'Shrink its hit with shields or Throttle, or break it.'];
  if (a.wipe) return [`${deals(n)}${each}. Wipes ${a.wipe === 'last' ? 'the skill you used last' : 'your strongest ready skill'} off your bar for ${cycles(a.wipeFor || 3)}. Never wipes key 1 or SIGINT.`, a.wipe === 'last' ? 'Lead with a cheap skill before its Wipe lands.' : 'Fire your big skill before its Wipe lands.'];
  return [`${deals(n)}${each}.`, 'Delay it, or soften the hit with ◆ and shields.'];
}
// [does, answer, cue]: cue is { text, icon, link } for a part whose rule reaches past its own row, or null. An empty
// answer leaves the answer line off (a part with nothing to add past "break it").
function readOf(s, v, p) {
  const fam = v?.family, other = (id) => nameIn(v, id);
  const took = (from) => `${attackRead(s, v, p)[0]} Took over the ${from}'s ${p.attack.name} when the ${from} broke.`;
  if (p.lock) {
    const t = v.parts.find((x) => x.id === p.lock), n = t?.lockMax || Math.max(1, Math.round((t?.max || 0) * CONFIG.mutex.share));
    return [`Locks the ${other(p.lock)} behind a shield that absorbs ${n} damage. The lock takes every hit first. While the ${p.name} stands, a broken lock returns ${cycles(CONFIG.mutex.every)} later.`, `Break the ${p.name} first, or burst through one lock.`, { text: `locks ${other(p.lock)}`, icon: 'lock', link: p.lock }];
  }
  if (p.ward) {
    const t = v.parts.find((x) => x.id === p.ward), cap = Math.max(1, Math.round((t?.max || 0) * CONFIG.ward));
    return [`Wards the ${other(p.ward)}. While the ${p.name} stands, the ${other(p.ward)} loses at most ${cap} Integrity a cycle.${p.wardCommands ? ' The ward holds back only your commands. Burns and helpers deal full damage.' : ''}`, p.wardCommands ? `Break the ${p.name} first, or burn the ${other(p.ward)}.` : `Break the ${p.name} first, or chip under the cap.`, { text: `wards ${other(p.ward)}`, icon: 'shield', link: p.ward }];
  }
  if (p.twin) return [`Twinned with the ${other(p.twin)}. A twin broken while the other stands reboots ${cycles(CONFIG.twinReboot.in)} later at ${pct(CONFIG.twinReboot.at)} Integrity. Reboots only once.`, `Break both within ${cycles(CONFIG.twinReboot.in)} of each other.`, { text: `twin of ${other(p.twin)}`, icon: 'mirror', link: p.twin }];
  if (p.rearm) {
    const others = v.parts.filter((x) => x !== p && x.kind !== 'fragment'), t = others.length === 1 ? others[0] : null, who = t ? `the ${t.name}` : 'every other part';
    if (p.tookOver && p.attack) return [took(other(p.tookOver)), '', null];
    return [`Re-arms ${who} to full ◆ every ${p.rearm} cycles, up to ${CONFIG.rearmMax} times. Has no attack of its own.${p.fallback ? ` ${fallbackLine(v, p)}` : ''}`, `Break ${who} between re-arms.`, { text: `re-arms ${t ? t.name : 'the others'}`, icon: 'repair', link: t?.id || null }];
  }
  if (p.reflect) return [`Every ${p.reflect} cycles, bends your command at one part onto the part it points at. It points at another part each beat. Pointing at itself, the command lands on the ${p.name} and ${pct(p.bounce ?? CONFIG.mirrorBounce)} of a hit bounces back at you. Area commands and the ones on you are not bent.`, 'Fire when it points at a part you want hit.', { text: `bends every ${p.reflect}`, icon: 'mirror', link: null }];
  if (p.mimic) return [`Every ${TELLS.mimic.every} cycles, copies the command you fire and turns it on you. A hit hits you, and a strip strips your ◆ and shield. A burn burns you, and a debuff Throttles you. A shield or buff goes to the ${p.name}, and a heal heals the virus. SIGINT or a stun Hangs you.`, 'Fire what is cheapest to have copied, or hold.', { text: 'copies you', icon: 'mirror', link: null }];
  if (p.deadman) return [`When broken while other parts stand, the others go loud for the rest of the fight. Loud parts deal ${pct(CONFIG.tripwire.loud - 1)} more damage and attack 1 cycle sooner.`, 'Break it last.', null];
  if (p.command) return [`Fragments deal ${pct(CONFIG.c2.gnaw)} more damage while the ${p.name} stands. When it breaks, every fragment drops.`, 'Break it once fragments are up.', null];
  if (p.tax) return [`While it stands, your cooldowns tick down only every other cycle. It attacks only when it is the last part left${p.attack ? `, dealing ${hitOf(s, p)} damage to you ${every(p.attack.interval)}` : ''}.`, 'Break it first.', { text: 'slows your cooldowns', icon: 'clock', link: null }];
  if (p.syncOnly) return [`Takes damage only from commands fired in a Sync Window. Logs each command you fire outside one.${p.attack ? ` At 3 logs, its ${p.attack.name} deals ${hitOf(s, p)} damage to you. Also ${p.attack.name}s ${every(p.attack.interval)}.` : ''}`, 'Fire inside the Sync Window.', { text: 'sync window only', icon: 'sync', link: null }];
  if (p.phase) return [`Goes out of phase on odd cycles. While it is out of phase, your hits pass through it, and ${pct(CONFIG.phaseBounce)} of each command's damage comes back to you.`, 'Hit it on even cycles.', null];
  if (p.echo) return ['While it stands, every hit you take repeats 1 cycle later at half damage. Shields and Block shrink what repeats.', 'Break it early.', null];
  // The parts plan (data.mjs BASICS, genes.mjs).
  if ((p.buffer || p.obfuscate) && p.tookOver && p.attack) return [took(other(p.tookOver)), '', null];
  if (p.buffer) { const t = v?.parts && s?.encounter?.virus === v ? belowOf(s, p) : null, n = Math.max(1, Math.round((p.max || p.integrity || 0) * p.buffer.share)); return [`Shields ${t ? `the ${t.name}` : 'the part below it'} for ${n} every ${p.buffer.every} cycles. The shield absorbs only your commands. Burns and helpers bypass it.${p.fallback && !p.tookOver ? ` ${fallbackLine(v, p)}` : ''}`, 'Break it first, or burn the shielded part.', { text: t ? `shields ${t.name}` : 'shields below', icon: 'shield', link: t?.id || null }]; }
  if (p.obfuscate) return [`While it stands, every part hides its timers, even with no ◆. Tag still reveals one.${p.fallback && !p.tookOver ? ` ${fallbackLine(v, p)}` : ''}`, 'Break it, or Tag the part you need to read.', { text: 'veils every part', icon: 'stealth', link: null }];
  if (p.fuse) return [`When broken, lights a ${CONFIG.zipbomb.fuse}-cycle fuse. The blast deals ${pct(CONFIG.zipbomb.share)} of your max health to you. A ◆ or a shield absorbs the blast. Ending the fight puts the fuse out.`, 'Break it last, or have a shield up.', { text: 'fuse on break', icon: 'damage', link: null }];
  if (p.hotspot) return ['When your command hits it, the virus\'s next attack 2 or more cycles away becomes a charge. Burns and helpers do not set it off.', 'Hit it with burns and helpers instead.', { text: 'charges on a hit', icon: 'burn', link: null }];
  if (p.idle) { const t = s?.encounter?.virus === v ? signatureOf(s) : v?.parts?.find((x) => x.special), who = t ? `the ${t.name}` : 'the signature part'; return [`Counts the cycles since your commands last hit ${who}. At ${p.idle}, every part re-arms to full ◆.`, `Hit ${who} at least every ${p.idle - 1} cycles.`, { text: `idle ${p.idle}`, icon: 'clock', link: t?.id || null }]; }
  if (p.front) { const t = s?.encounter?.virus === v ? frontOf(s, p) : v?.parts?.find((x) => x.special); return [`While it wears ◆, your single-target commands at ${t ? `the ${t.name}` : 'its partner'} hit the ${p.name} instead. Burns, helpers and hits on every part are not redirected.`, 'Strip its ◆ first, or hit every part.', { text: t ? `fronts ${t.name}` : 'fronts its partner', icon: 'firewall', link: t?.id || null }]; }
  if (p.backlog) return [`${attackRead(s, v, p)[0]} When its ${p.attack.name} lands, the skill you fired that cycle cools down ${cycles(p.backlog)} longer.`, 'On its cycle, fire a skill with no cooldown.', { text: 'slows a cooldown', icon: 'clock', link: null }];
  // The parts plan's P2 (genes.mjs): floors 3 and 4.
  const sigOf = () => (s?.encounter?.virus === v ? signatureOf(s) : null) || v?.parts?.find((x) => x.special) || null;
  if (p.limit) return [`${attackRead(s, v, p)[0]} No single hit takes more than ${limitOf(p)} of its Integrity, ${pct(p.limit)} of its max. Damage past the cap is lost.`, 'Use many small hits, like burns, helpers and ticks.', { text: 'caps each hit', icon: 'shield', link: null }]; // (its cap N tag says how much)
  if (p.spare && p.booted && p.attack) { const from = p.bootFrom?.name || 'signature'; return [`${attackRead(s, v, p)[0]} Booted with the ${from}'s ${p.attack.name} when the ${from} broke.`, '', null]; }
  if (p.spare) { const t = p.bootFrom || sigOf(), who = t ? `the ${t.name}` : 'the signature part'; return [`Sleeps under ${p.spare.armor ?? 0} ◆, off the timeline. When ${who} breaks, it boots ${cycles(p.spare.in)} later with ${pct(p.spare.at)} of ${t ? `the ${t.name}'s` : 'its'} max Integrity and its ${t?.attack?.name || 'attack'}, and drops its ◆.`, 'Pay for its ◆ asleep, or its Integrity once booted.', { text: t ? `boots as ${t.name}` : 'boots as the signature', icon: 'snapshot', link: t && alive(t) ? t.id : null }]; }
  if (p.scrape) return [`${attackRead(s, v, p)[0]} When its ${p.attack.name} lands, it removes your shield, your ◆ and your timed buffs, and gains up to ${p.scrape} ◆ from what it takes. Null Route makes it miss.`, 'Buff after it lands, not before.', { text: 'takes your buffs', icon: 'scraper', link: null }];
  if (p.packer) return ['While it stands, each rolled part shows as a Packed part, its attack as ???. The virus\'s rolled rules show as ???, even ones your Codex knows.', 'Scan before you engage, or break it.', { text: 'packs the rules', icon: 'crate', link: null }];
  if (p.badblock) return [`${attackRead(s, v, p)[0]} When its ${p.attack.name} lands, your next heals lose up to ${pct(p.badblock)} of your max health. Purge, Scrub, Rollback and Rotate Keys clear it.`, 'Heal before it lands.', { text: 'cracks your heals', icon: 'heal', link: null }];
  if (p.damper) { const k = DAMPED[p.damperKind] || DAMPED.burn; return [`While it wears ◆, it is immune to damage from ${k.many}. ${k.many[0].toUpperCase() + k.many.slice(1)} still break its ◆.`, 'Strip its ◆ first, then use anything.', null]; } // (its tag crosses out the kind it drops)
  // A Cold Store: a Codex card carries its Chill as its attack (codex.mjs sampleOf), sized as its attack line.
  if (p.frozen && !p.thawed) { const at = p.thawAt ?? p.frozen, c = p.attack ? p : p.chill ? { ...p, attack: p.chill } : null; return [`Frozen until the end of cycle ${at}, off the timeline and immune to damage.${c ? ` After it thaws, its ${c.attack.name} deals ${hitOf(s, c)} damage to you ${every(c.attack.interval)}. The first ${c.attack.name} lands 2 cycles after the thaw.` : ''}`, 'Break the others while it is frozen.', { text: `thaws after cycle ${at}`, icon: 'clock', link: null }]; }
  if (p.overrun) return [`Spawns a fragment${p.attack ? ` ${every(p.attack.interval)}` : ''}. Each fragment's bite deals 1 more damage every cycle it lives.`, 'Clear fragments young, or break it.', null];
  // A server room's bodies (families.mjs).
  if (fam === 'trojan' && p.id === 'courier') return [`${deals(p.attack ? hitOf(s, p) : 0)} ${every(p.attack?.interval || 5)}. Delivers a Package ${every((p.deliver || p.redeploy?.deliver)?.interval || 3)}. A Package unpacks into two Droppers ${cycles(BODY.package.opens)} after delivery, or when anything damages it while the Loader stands. While the Loader stands, a broken Courier redeploys ${cycles(BODY.redeploy.in)} later at ${pct(BODY.redeploy.at)} Integrity.`, 'Break the Loader, and leave the Packages alone.', null];
  if (fam === 'trojan' && p.id === 'loader') return [`While it stands, any damage to a Package unpacks it into two Droppers. Redeploys a broken Courier ${cycles(BODY.redeploy.in)} later at ${pct(BODY.redeploy.at)} Integrity, every time. Taking it across a tick delays the next delivery or redeploy by ${cycles(BODY.loader)}. When broken, the Courier stays down and every Package goes inert.`, 'Break it first.', { text: 'redeploys Courier', icon: 'upload', link: 'courier' }];
  if (p.pkg) return p.pkg.inert ? ['An inert box. Holds a Payload Box of credits.', 'Break it for the credits.', null] : [`Unpacks into two Droppers at the end of cycle ${p.pkg.opensAt}, or when anything damages it while the Loader stands.`, 'Leave it alone, or break the Loader first.', null];
  if (fam === 'cryptominer' && p.id === 'rig') return [`${deals(hitOf(s, p))} ${every(p.attack?.interval || 2)}. Each Hash deals ${p.attack?.rampBy || 1} more than the last. Gains heat every cycle. At ${BODY.heat.at} heat, overheats, stops hashing and burns itself until it breaks.`, 'Vent it with a cut, or let it cook.', null];
  if (fam === 'cryptominer' && p.id === 'cooler' && p.tookOver && p.attack) return [`Runs the Rig's Hash uncooled. ${deals(hitOf(s, p))} ${every(p.attack.interval)}. Each Hash deals ${p.attack.rampBy || 1} more than the last. Gains ${BODY.heat.hot} heat a cycle. At ${BODY.heat.at} heat, overheats and burns itself until it breaks.`, 'Vent it with a cut, or let it cook.', null];
  if (fam === 'cryptominer' && p.id === 'cooler') return [`Keeps the Rig cool. When broken, the Rig gains ${BODY.heat.hot} heat a cycle instead of ${BODY.heat.cooled}, and every Hash deals ${pct(BODY.heat.hard - 1)} more damage. If the Rig breaks first, the Cooler takes over its Hash, uncooled, at ${BODY.heat.hot} heat a cycle.`, 'Vent whichever part is left hashing, or let it cook.', { text: 'cools the Rig', icon: 'scheduler', link: 'rig' }];
  if (p.kind === 'fragment' && p.attack && !p.raidAdd) return [`${deals(hitOf(s, p))} ${every(p.attack.interval)}.`, String(p.id).startsWith('dropper') ? 'Break it, or hit every part.' : 'Hit every part to clear it.', null];
  if (p.raidFuse) return [`Goes off on everyone ${every(p.raidFuse.every)}.${p.raidWard ? ` While it stands, the boss takes ${pct(p.raidWard)} less damage.` : ''}`, 'Break it before it goes off.', null];
  if (p.spam) return [`${attackRead(s, v, p)[0]} Carries no ticks to interrupt.`, 'Break it in a hit or two.', null];
  if (p.fallback && !p.tookOver) { const [does, answer] = p.attack ? attackRead(s, v, p) : ['Has no attack of its own.', 'Break it once the others are handled.']; return [`${does} ${fallbackLine(v, p)}`, answer, { text: `falls back on ${other(p.fallback)}`, icon: 'relay', link: p.fallback }]; }
  if (p.attack) return [...attackRead(s, v, p), null];
  return ['Has no attack of its own.', 'Break it once the others are handled.', null];
}
// What a part does (its mechanics, its tells and veil after), how to answer it, and its cue.
// tells false: leave its tells out (the Codex's part card lists them on their own line).
export function partRead(s, v, p, { tells: withTells = true } = {}) {
  const [does, answer, cue] = readOf(s, v, p);
  // The tells it brings in this fight (or, with no fight, the ones its kind can bring), as what it does.
  const T = s?.encounter?.virus === v ? tellsOf(s) : null;
  const tl = !withTells ? [] : (T ? T.list.filter((t) => t.part === p.id).map((t) => ({ name: t.name, kind: t.kind })) : v ? partTells(v, p) : []).filter((x) => x.kind !== 'mimic');
  const VERB = { charge: 'Charges', cast: 'Casts', seal: 'Seals with', lock: 'Locks with' };
  const tells = tl.map((x) => `${VERB[x.kind] || 'Brings'} ${x.name}.`).join(' ');
  // A role it carries for a missing signature (parts.mjs PARTS.profile): a Ratchet, or the Scrambler's Scramble.
  const esc = p.ratchet ? `From cycle ${p.ratchet.from + 1}, its Ratchet deals ${p.ratchet.amount} damage to you every cycle. The Ratchet grows by ${p.ratchet.amount} every ${p.ratchet.every} cycles while the ${p.name} stands. Purge starts it over.` : '';
  const scr = p.attack?.scrambles ? `Its hits Scramble you for ${cycles(p.attack.scrambles)}, at most once ${every(p.attack.scrambleEvery || 1)}.` : '';
  const more = [esc, scr, p.veiled && !p.obfuscate ? 'Hides its timers while it wears ◆.' : '', p.enrage ? `Deals ${pct(CONFIG.enrage - 1)} more damage below half Integrity.` : '', tells].filter(Boolean).join(' ');
  const ans = p.ratchet ? 'Break it early to end the Ratchet.' : answer;
  return { does: more ? `${does} ${more}` : does, answer: ans, cue };
}
// A tooltip's answer line: its own last line, which app.js ttShow draws muted (a line that starts with ▸).
export const ANSWER = '▸ ';
export const answerLine = (a) => (a ? `\n${ANSWER}${a}` : '');
// The part row's tooltip, by its research (research.mjs). Until it's decoded: ??? and how to research it. At 1: its
// attack and timing. From 5: what it does, its tells, and what answers it.
export function partTip(s, v, p) {
  if (packed(s, v, p)) return `${p.name}: ${knowsPart(s, v, p) ? partAttack(s, v, p) : '???'}\nIts name and rule are hidden until the Packer breaks.`;
  if (!knowsPart(s, v, p)) return `${p.name}: ???\nBreak one, cut it or answer its tell to decode it.`;
  if (!knows(s, v, p, TIER.rule)) return `${p.name}: ${partAttack(s, v, p)}\nResearch ${TIER.rule} to learn its rule and answer.`;
  const r = partRead(s, v, p);
  return `${p.name}: ${r.does}${answerLine(r.answer)}`;
}
// Its attack and timing alone (a part decoded but not yet researched to its rule).
export const partAttack = (s, v, p) => (p.attack ? attackRead(s, v, p)[0] : 'Has no attack of its own.');
// Its cue on the row, once decoded (a Mutex: "locks Encryptor"), or null.
export const partCue = (s, v, p) => (packed(s, v, p) ? null : knowsPart(s, v, p) ? partRead(s, v, p).cue : null); // packed: its ??? tag says so
// The parts a live target condition holds on: { [part id]: [names] }, for the board's marks.
export function gearOnParts(live) {
  const out = {};
  for (const g of live) if (g.lit) for (const id of g.parts) (out[id] ||= []).push(g.name);
  return out;
}

// ---------- what protects what ----------
// One visual language for every rule that reaches from one part to another (view.mjs draws a tether between the rows
// with a node on it, app.js plays its shatter and snap): the Mutex's lock on its partner, a Lockbox's ward, a Mirror's
// twin, a Keyring re-arming its Gate, the Cryptominer's Cooler on its Rig, the C2 Node over its fragments. Linked
// (v2 and up) has no partner (a broken part's hit goes to whichever attacks next), so it draws none.
//   { kind, from, to: [ids], icon, known, up, count, snap, tip }
//   known  the codex knows the part the rule sits on (its node shows its icon and its tooltip says the rule; before
//          that the tether still shows, with ? on its node and ??? in its tooltip)
//   up     the rule holds now (a lock standing, a ward, both twins up, re-arms left): the tether glows
//   count  cycles until it comes back or fires (a broken lock relocking, the next re-arm, a broken twin's reboot), or null
//   snap   the part it sits on just broke (a dissolving row: view.mjs passes stands): the tether snaps and goes
export const LINK_ICON = { lock: 'lock', ward: 'shield', twin: 'mirror', rearm: 'repair', cool: 'scheduler', command: 'router', redeploy: 'upload', fallback: 'relay', buffer: 'shield', front: 'firewall', idle: 'clock', bend: 'mirror' };
// The lock shield on p now: { cur, max, by } (the Mutex holding it), or null.
export function lockOf(s, v, p) {
  if (!alive(p) || !(p.lockHp > 0)) return null;
  const by = v.parts.find((x) => alive(x) && x.lock === p.id);
  return by ? { cur: p.lockHp, max: p.lockMax || p.lockHp, by } : null;
}
// A ward on p: { cap, left, by }: the most it loses a cycle, and what's left of it this cycle (combat.mjs hit).
export function wardOf(s, v, p) {
  const by = alive(p) ? v.parts.find((x) => alive(x) && wards(x, p)) : null;
  if (!by) return null;
  const crush = 1 + (fxOn(s, 'lock-crush')?.fx.value || 0) / 100, cap = Math.max(1, Math.round(p.max * CONFIG.ward * crush));
  const used = p.wardAt === s.encounter?.cycle ? p.wardUsed || 0 : 0;
  return { cap, left: Math.max(0, cap - used), by };
}
const upTo = (n) => (n <= 0 ? 'at the end of this cycle' : when(n));
// A fallback part's line (combat.mjs breakPart): what it takes over when its partner breaks first.
function fallbackLine(v, p) {
  const t = v.parts.find((x) => x.id === p.fallback), a = t?.attack, name = t?.name || 'its partner', first = `If the ${name} breaks first, the ${p.name}`;
  if (!a) return `${first} takes over its attack.`;
  if (p.attack?.effect === 'heal') return `${first} drops its ${p.attack.name} and takes over the ${a.name}.`;
  if (!p.attack || p.attack.effect === 'damage') return `${first} takes over its ${a.name}.${v.family === 'cryptominer' ? ` The ${a.name} keeps its climb and heat, and runs uncooled at ${BODY.heat.hot} heat a cycle.` : ''}`;
  return `${first} adds the ${a.name} to its ${p.attack.name}.`;
}
function linkTip(s, v, l) {
  const p = part(s, l.from) || v.parts.find((x) => x.id === l.from), to = l.to.map((id) => v.parts.find((x) => x.id === id)).filter(Boolean);
  const names = join(to.map((x) => `the ${x.name}`));
  if (!l.known) return `${p.name}: ???\nSomething on it reaches ${names || 'another part'}. Break one to decode what it does.`;
  if (l.snap) return `${p.name}: broken. Its hold on ${names} is gone.`;
  if (l.kind === 'lock') {
    const t = to[0], lk = t?.lockHp > 0 ? t.lockHp : 0;
    return lk ? `${p.name} lock: ${names} wears a ${lk}/${t.lockMax || lk} shield that takes every hit first. A broken lock returns ${cycles(CONFIG.mutex.every)} later. Breaking the ${p.name} ends the lock for good.${answerLine(`Break the ${p.name} first.`)}`
      : `${p.name} lock: broken. The ${p.name} locks ${names} again ${upTo(l.count ?? CONFIG.mutex.every)}.${answerLine(`Finish ${names} before then, or break the ${p.name}.`)}`;
  }
  if (l.kind === 'ward') {
    const w = to[0] ? wardOf(s, v, to[0]) : null;
    return `${p.name} ward: ${names} loses at most ${w?.cap ?? '?'} Integrity a cycle${w ? ` (${w.left} left this cycle)` : ''}.${p.wardCommands ? ' Burns and helpers deal full damage.' : ''}${answerLine(`Break the ${p.name} first, or chip under the cap.`)}`;
  }
  if (l.kind === 'twin') {
    if (!to.length) { const down = v.parts.find((x) => (x.twin === p.id || p.twin === x.id) && !alive(x)); return `${p.name} twin: reboots the ${down?.name || 'other twin'} ${upTo(l.count ?? 0)} at ${pct(CONFIG.twinReboot.at)} Integrity, unless the ${p.name} breaks first.${answerLine(`Break the ${p.name} before then.`)}`; }
    return `${p.name} twin: twinned with ${names}. A twin broken while the other stands reboots ${cycles(CONFIG.twinReboot.in)} later at ${pct(CONFIG.twinReboot.at)} Integrity, once.${answerLine(`Break both within ${cycles(CONFIG.twinReboot.in)} of each other.`)}`;
  }
  const fo = p.fallback && to.some((x) => x.id === p.fallback) ? fallbackLine(v, p) : '';
  if (l.kind === 'fallback') return `${p.name} fallback: ${fo}${answerLine(`Break the ${p.name} first, or be ready for it.`)}`;
  if (l.kind === 'rearm') return l.up ? `${p.name} re-arm: re-arms ${names} to full ◆ ${upTo(l.count)}. ${CONFIG.rearmMax - (p.rearms || 0)} of ${CONFIG.rearmMax} re-arms left.${fo ? ` ${fo}` : ''}${answerLine(`Break ${names} between re-arms.`)}` : `${p.name} re-arm: overheated. Cannot re-arm ${names} again.${fo ? ` ${fo}` : ''}`;
  if (l.kind === 'redeploy') {
    const c = v.parts.find((x) => x.id === 'courier'), cn = c?.name || 'Courier', at = pct(BODY.redeploy.at);
    if (!to.length) return `${p.name} redeploy: the ${cn} comes back ${upTo(l.count ?? 0)} at ${at} Integrity, unless the ${p.name} breaks first.${answerLine(`Break the ${p.name} before then.`)}`;
    return `${p.name} redeploy: a ${cn} broken while the ${p.name} stands comes back ${cycles(BODY.redeploy.in)} later at ${at} Integrity, every time.${answerLine(`Break the ${p.name} first to keep the ${cn} down.`)}`;
  }
  if (l.kind === 'buffer') { const t = to[0], n = t?.bufHp > 0 && t.bufBy === p.id ? t.bufHp : 0; return n ? `${p.name} shield: ${names} wears a ${n} shield that absorbs your commands' hits first. Burns and helpers bypass it.${answerLine(`Burn ${names}, or break the ${p.name}.`)}` : `${p.name} shield: shields ${names} again ${upTo(l.count ?? 0)}.${answerLine(`Hit it before then, or break the ${p.name}.`)}`; }
  if (l.kind === 'front') return l.up ? `${p.name} front: while the ${p.name} wears ◆, your single-target commands at ${names} hit the ${p.name} instead.${answerLine('Strip its ◆, or hit every part.')}` : `${p.name} front: stripped. Your hits reach ${names} again until its ◆ patches back.`;
  if (l.kind === 'idle') return `${p.name}: ${l.count === 0 ? 'every part re-arms at the end of this cycle' : `every part re-arms to full ◆ ${upTo(l.count)}`} unless your command hits ${names}. Each hit on ${names} starts the count over.${answerLine(`Hit ${names} before then.`)}`;
  if (l.kind === 'bend') { const at = l.count === 0 ? 'this cycle' : when(l.count), self = !to.length; return `${p.name} bend: on its beat ${at}, your command at one part goes to ${self ? `the ${p.name} itself, and part of a hit bounces back at you` : names}.${answerLine(self || l.harm ? 'Fire nothing at one part then: a shield, a buff or an area command.' : `Fire then if you want ${names} hit.`)}`; }
  if (l.kind === 'command') return `${p.name} command: fragments deal ${pct(CONFIG.c2.gnaw)} more damage while the ${p.name} stands. When it breaks, every fragment drops.${answerLine('Break it once fragments are up.')}`;
  const r = partRead(s, v, p);
  return `${p.name}: ${r.does}${answerLine(r.answer)}`;
}
// stands(p): the parts a tether may hang from (the board passes its rows: the living and the dissolving).
export function partLinks(s, v = s.encounter?.virus, { stands = alive } = {}) {
  if (!v?.parts) return [];
  const cycle = s.encounter?.cycle || 0, out = [];
  const add = (kind, p, to, o = {}) => out.push({ kind, from: p.id, to: to.map((x) => x.id), icon: LINK_ICON[kind], known: knowsPart(s, v, p), up: true, count: null, snap: !alive(p), ...o });
  for (const p of v.parts.filter(stands)) {
    if (p.lock) {
      const t = v.parts.find((x) => x.id === p.lock);
      if (alive(t)) add('lock', p, [t], { up: alive(p) && t.lockHp > 0, count: alive(p) && !(t.lockHp > 0) && t.lockAt != null ? Math.max(0, t.lockAt - cycle) : null });
    }
    if (p.ward || p.wardsToo?.length) { const to = v.parts.filter((x) => alive(x) && x !== p && wards(p, x)); if (to.length) add('ward', p, to, { up: alive(p) }); }
    if (p.rearm) {
      const to = v.parts.filter((x) => alive(x) && x !== p && x.kind !== 'fragment' && x.maxArmor > 0);
      const left = alive(p) && (p.rearms || 0) < CONFIG.rearmMax;
      if (to.length) add('rearm', p, to, { up: left, count: left ? (p.rearm - (cycle % p.rearm)) % p.rearm : null });
    }
    if (v.family === 'cryptominer' && p.id === 'cooler') { const t = v.parts.find((x) => x.id === 'rig'); if (alive(t)) add('cool', p, [t], { up: alive(p) }); }
    if (p.command) { const to = v.parts.filter((x) => alive(x) && x.kind === 'fragment'); if (to.length) add('command', p, to, { up: alive(p) }); }
    // The parts plan: a Buffer's shield on the part below it, a Front End over its partner, an Idle Timer on the signature.
    if (p.buffer && alive(p)) { const t = belowOf(s, p); if (t) add('buffer', p, [t], { up: t.bufHp > 0 && t.bufBy === p.id, count: t.bufHp > 0 && t.bufBy === p.id ? null : (p.buffer.every - ((cycle - 1) % p.buffer.every)) % p.buffer.every }); }
    if (p.front && alive(p)) { const t = frontOf(s, p); if (t) add('front', p, [t], { up: p.armor > 0 }); }
    if (p.idle && alive(p)) { const t = signatureOf(s); if (t) add('idle', p, [t], { up: true, count: Math.max(0, p.idle - (cycle - (v.idleHit || 0))) }); }
    // The Decoy's pointer (combat.mjs bendOf): a dashed red tether to the part its next beat bends your command onto, once
    // its timers show (its ◆ stripped, or Tagged); pointing at itself, a stub on the Decoy. The countdown is the beat.
    if (p.reflect && alive(p)) { const b = bendOf(s, p); if (b?.shown) add('bend', p, b.to === p ? [] : [b.to], { up: true, count: Math.max(0, b.at - cycle), harm: b.bad }); }
    // A Trojan's Loader over its Courier: both up, a tether; the Courier down with its redeploy coming, a stub on the
    // Loader with the countdown (the Mirror's twin reboot, drawn the same way).
    if (v.family === 'trojan' && p.id === 'loader') {
      const c = v.parts.find((x) => x.id === 'courier');
      if (c && alive(c)) add('redeploy', p, [c], { up: alive(p) });
      else if (c?.redeployAt != null && alive(p)) add('redeploy', p, [], { up: false, count: Math.max(0, c.redeployAt - cycle) });
    }
  }
  // Twins, by pair (either may be the one down): both up, a tether; one down with its reboot coming, a stub on the one
  // standing with the countdown; one just broken for good (no reboot), the tether snaps.
  for (const p of v.parts.filter((x) => x.twin)) {
    const t = v.parts.find((x) => x.id === p.twin), known = knowsPart(s, v, p);
    if (!t) continue;
    if (alive(p) && alive(t)) { out.push({ kind: 'twin', from: p.id, to: [t.id], icon: LINK_ICON.twin, known, up: true, count: null, snap: false }); continue; }
    for (const [up, down] of [[p, t], [t, p]]) {
      if (!alive(up) || alive(down)) continue;
      if (down.rebootAt && stands(up)) out.push({ kind: 'twin', from: up.id, to: [], icon: LINK_ICON.twin, known, up: false, count: Math.max(0, down.rebootAt - cycle), snap: false });
      else if (!down.rebootAt && stands(down)) out.push({ kind: 'twin', from: down.id, to: [up.id], icon: LINK_ICON.twin, known, up: false, count: null, snap: true });
    }
  }
  // Fallback (combat.mjs): a part that takes over its partner's attack when the partner breaks. Its own tether, unless
  // a rule of its own already reaches the same partner (a Keyring's re-arm, a Cooler's cooling): that one says it.
  for (const p of v.parts.filter((x) => x.fallback && stands(x))) {
    const t = v.parts.find((x) => x.id === p.fallback);
    if (!t || !alive(t) || out.some((l) => l.from === p.id && l.to.includes(t.id))) continue;
    out.push({ kind: 'fallback', from: p.id, to: [t.id], icon: LINK_ICON.fallback, known: knowsPart(s, v, p), up: alive(p), count: null, snap: !alive(p) });
  }
  // A packed part's rule draws no tether (combat.mjs packed): the Packer hides it.
  const shown = out.filter((l) => !packed(s, v, v.parts.find((x) => x.id === l.from)));
  for (const l of shown) l.tip = linkTip(s, v, l);
  return shown;
}

// ---------- your helpers' schedule (docs/puzzle-fights.md 3.2) ----------
// Each helper's hits left, a pip a column (Now to +3) on the part it lands on then, played forward from the preview: your
// command first (fc, view.mjs forecast), then burns, then each helper in order, a hit on ◆ breaking one. A part that
// breaks sends its helpers on to the part that attacks soonest (combat.mjs). A pip trips a lever when the Mimic's beat
// would play it back (a helper sent once the beat was said) or when it breaks a Tripwire while other parts stand.
// moves: where the helpers of a part breaking this cycle go next (the board's move-on tether).
const whenOf = (c) => (c === 0 ? 'this cycle' : c === 1 ? 'next cycle' : `in ${c} cycles`);
export function helperPlan(s, fc = {}) {
  const e = s.encounter, out = { pips: [], moves: [] };
  if (!e?.helpers?.length || !active(s)) return out;
  const b = beatOn(s), hp = {}, armor = {}, broke = {};
  for (const p of livingParts(s)) {
    hp[p.id] = p.integrity - (fc.parts?.[p.id] || 0);
    armor[p.id] = Math.max(0, (p.armor || 0) - (fc.chits?.[p.id] || 0));
    if (hp[p.id] <= 0) broke[p.id] = 0;
  }
  const up = (id) => hp[id] > 0;
  const next = (not) => attackers(s).filter((p) => up(p.id) && p.id !== not).sort((x, y) => x.attack.due - y.attack.due || y.attack.amount - x.attack.amount)[0] || livingParts(s).find((p) => up(p.id) && p.id !== not) || null;
  const at = e.helpers.map((h) => h.target), moves = new Map();
  for (let c = 0; c < 4; c++) {
    for (const x of e.burns) if (x.left > c && up(x.target) && !(armor[x.target] > 0)) { hp[x.target] -= x.damage; if (!up(x.target)) broke[x.target] ??= c; }
    e.helpers.forEach((h, k) => {
      if (h.left <= c) return;
      if (!up(at[k])) {
        const n = next(at[k]);
        if (!n) return;
        if (broke[at[k]] === 0) { const key = `${at[k]}>${n.id}`; moves.set(key, { from: at[k], to: n.id, helpers: (moves.get(key)?.helpers || 0) + 1 }); }
        at[k] = n.id;
      }
      const id = at[k], p = part(s, id), dmg = h.damage + hookHit(s, p);
      let trips = null;
      if (armor[id] > 0) armor[id]--;
      else {
        hp[id] -= dmg;
        if (!up(id)) {
          broke[id] ??= c;
          if (p.deadman && !p.quiet && !(e.buffs?.sudo >= e.cycle + c) && livingParts(s).some((x) => x !== p && x.kind === 'system' && up(x.id))) trips = 'order';
        }
      }
      if (b && id === b.p.id && b.t.next === e.cycle + c && h.sent != null && h.sent >= b.t.said && !beatBlind(s, b.p, b.t.next)) trips = 'beat';
      const name = h.by ? `${h.by}: Helper. ` : 'Helper: ';
      const tip = trips === 'beat' ? `${name}Hits the ${p.name} for ${dmg} on its beat.${answerLine(`The ${p.name} plays it back at you. Move it or cash it in first.`)}`
        : trips === 'order' ? `${name}Breaks the ${p.name} ${whenOf(c)} while other parts stand.${answerLine('The others go loud. Break them first, or move it.')}`
        : `${name}Hits the ${p.name} for ${dmg} ${whenOf(c)}.`;
      out.pips.push({ helper: k, part: id, col: c, damage: dmg, trips, tip });
    });
    // The beat lands after the helpers: a Mimic they break this cycle plays nothing back.
    for (const x of out.pips) if (x.col === c && x.trips === 'beat' && !up(x.part)) Object.assign(x, { trips: null, tip: `${x.tip.split('\n')[0].replace(/ on its beat\.$/, ` ${whenOf(c)}.`)}` });
  }
  out.moves = [...moves.values()];
  return out;
}

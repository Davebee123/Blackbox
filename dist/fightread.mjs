// Reading a fight (the designer's readability pass): the words on the fight board that say what a tell does and how
// to stop it, which of your gear's conditional rules are live right now, and what a part you've decoded does. Pure:
// view.mjs puts these into the board and the HUD, app.js only lights and flashes what they mark.
//
//   tellTip(s, i, c, to)   a tell chip's tooltip: its name, what happens if it lands (with the number), and how to
//                          stop it under the current rule (a burst, SIGINT, a strip, an interrupt tick) with its window
//   gearLive(s)            your equipped rules and unique effects that have a condition, each lit when it holds now
//   cycleGear(s, cycle)    the cycle-conditioned ones live on a cycle (the timeline's column headers)
//   partRead(s, v, p)      what a part does, how to answer it, and its one-word cue, from its spec and its flags
//   partTip(s, v, p)       the part's tooltip: ??? and how to decode it until the codex knows it (combat.mjs knowsPart)
//   partLinks(s, v)        what protects what: one link a rule that reaches from one part to another (a Mutex's lock, a
//                          Lockbox's ward, a Mirror's twin, a Keyring's re-arm), for the board's tethers
//   lockOf(s, v, p)        the lock shield a part wears now (its bar's absorb segment), wardOf the most a ward lets it lose
import { part, livingParts, gearFx, fxHolds, blocked, attackAmount, knowsPart, usable, fxOn, alive, wards } from './combat.mjs';
import { CONFIG, TELL, TELLS, BOSSES } from './data.mjs';
import { fxText } from './content.mjs';
import { tellsOf, tellIntents, partTells, NEW_TELLS } from './tells.mjs';
import { nextTick } from './interrupt.mjs';
import { BODY } from './families.mjs';
import { situationOf } from './situations.mjs';

const when = (n) => (n <= 0 ? 'this cycle' : n === 1 ? 'next cycle' : `in ${n} cycles`);
const cycles = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;
const every = (n) => (n === 1 ? 'every cycle' : `every ${n} cycles`);
const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const join = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const pct = (k) => `${Math.round(k * 100)}%`;

// ---------- tells ----------
// What a tell that gets through leaves on you (tells.mjs corrupt, hang, lockLast), by the virus's tier. Sandman stops all of it.
function afterOf(s) {
  const T = tellsOf(s)?.tier;
  if (!T || fxOn(s, 'no-after')) return '';
  const on = [T.burn ? 'Corrupted' : '', T.hang ? 'Hung' : ''].filter(Boolean), off = T.after ? `your last skill offline for ${cycles(T.after)}` : '';
  if (on.length && off) return ` Leaves you ${join(on)}, and ${off}.`;
  if (on.length) return ` Leaves you ${join(on)}.`;
  return off ? ` Takes ${off}.` : '';
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
// Line 1: what happens if it lands, with its number.
function landsLine(s, i, p, to) {
  const you = to === 'all' ? 'each of you' : to && to !== 'you' ? to : 'you';
  if (i.tell === 'charge') {
    const after = ['damage', 'encrypt'].includes(i.effect) || i.hit ? afterOf(s) : '';
    const shred = i.shred ? ' Shreds a file in your pack.' : '';
    if (i.effect === 'damage') return `Deals ${i.amount} damage to ${you}.${shred}${after}`;
    if (i.effect === 'encrypt') return `Adds ${i.amount} to your encryption, and a burst of ${i.burst || 0} damage a cycle for ${cycles(TELL.burst)}.${after}`;
    if (i.effect === 'replicate') return `${i.hit ? `Deals ${i.hit} damage to ${you} and spawns` : 'Spawns'} ${i.spawn || 1} ${(i.spawn || 1) === 1 ? 'fragment' : 'fragments'}.${after}`;
    if (i.effect === 'scramble') return `${i.hit ? `Deals ${i.hit} damage to ${you} and Scrambles` : 'Scrambles'} you for ${cycles(i.amount)}.${after}`;
    if (i.effect === 'heal') return `Heals the most damaged part for ${i.amount}.`;
    return `Powers up the ${p?.name}'s attack.${after}`;
  }
  if (i.tell === 'cast') {
    const lasts = Math.max(1, (i.does === 'overclock' ? NEW_TELLS.overclock.lasts : TELL.castLasts) - (fxOn(s, 'cast-short')?.fx.value || 0));
    if (i.does === 'overclock') return `Every part takes double damage and every attack comes 1 cycle sooner, for ${cycles(lasts)}.`;
    const what = i.does === 'loud' ? `Every attack deals ${pct(TELL.loud - 1)} more damage for ${cycles(lasts)}.` : i.does === 'grow' ? `Every part grows ${pct(TELL.grow)} more Integrity.` : `Every attack repeats 1 cycle faster for ${cycles(lasts)}.`;
    return what + afterOf(s);
  }
  if (i.tell === 'seal') {
    const T = tellsOf(s)?.tier, proof = fxOn(s, 'seal-proof');
    const mine = T?.after && !proof ? ` Takes your ◆ and shield${T.burn ? ', and leaves you Corrupted' : ''}.` : '';
    return `Re-arms the ${p?.name} to ${(p?.maxArmor || 0) + 1} ◆, and every stripped part gets 1 ◆ back.${mine}`;
  }
  if (i.tell === 'lock') return `Locks the first command you fire after it for ${cycles(NEW_TELLS.lock.cycles)}, key 1 included.`;
  const twice = BOSSES[s.encounter?.virus?.boss]?.mimic > 1 ? ', twice over while you are Scrambled' : '';
  return `Plays the command you fire then back at you, its whole direct hit${twice}.`;
}
// Line 2: how to stop it, under the rule that applies here, and when.
function stopLine(s, i, p, c) {
  const name = p?.name || 'part', t = cutOf(s, p), under = t ? `take the ${name} under ${pct(t.at)}` : '';
  const armor = p?.armor > 0 ? ` (its ${p.armor} ◆ first, or pierce)` : '';
  if (i.tell === 'charge') return t ? `Cut it: ${under} ${when(c)}${armor}.` : `No tick left on the ${name}: soften it with ◆, a shield or Brace, or break the ${name} first.`;
  if (i.tell === 'cast') return `SIGINT${t ? `, or ${under}` : ''}. Window: ${windowWords(i, c)}.`;
  if (i.tell === 'seal') return p?.armor > 0 ? `Strip its ${p.armor} ◆ before it lands ${when(c)}.` : `It fails while the ${name} wears no ◆. Keep it stripped until it lands ${when(c)}.`;
  if (i.tell === 'lock') return `Break the ${name} before it lands ${when(c)}, or feed it a skill that is cooling anyway.`;
  return `Fire no direct hit on its beat (${when(c)}): a debuff, a strip, a burn or a shield${t ? `, or ${under} then` : ''}.`;
}
// The tooltip: "Name: line 1\nline 2". The chip itself carries the kind, the timing, the number and the answer's verb.
export function tellTip(s, i, c = i.col, to = null) {
  const p = part(s, i.source);
  return `${i.name}: ${landsLine(s, i, p, to)}\n${stopLine(s, i, p, c)}`;
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
const nameIn = (v, id) => v?.parts?.find((x) => x.id === id)?.name || ({ encryptor: 'Encryptor', replicator: 'Replicator', miner: 'Miner' }[id] || id);
const hitOf = (s, p) => (s ? blocked(s, attackAmount(p)) : attackAmount(p));
function attackRead(s, v, p) {
  const a = p.attack, n = hitOf(s, p), each = a.interval < 900 ? ` ${every(a.interval)}` : '';
  if (a.effect === 'encrypt') return [`Encrypts you${each}. Each Encrypt adds ${attackAmount(p)} damage a cycle until it breaks.`, 'Break it to end the encryption. A ◆ on you stops one Encrypt.'];
  if (a.effect === 'replicate') return [`${a.hit ? `Hits you for ${s ? blocked(s, a.hit) : a.hit} and spawns` : 'Spawns'} a fragment${each}. Each fragment gnaws you every cycle, up to ${CONFIG.fragmentCap} at once.`, 'Break it to stop the spawns, and clear fragments with hits on every part.'];
  if (a.effect === 'scramble') return [`Hits you for ${s ? blocked(s, a.hit || 0) : a.hit || 0}${each}, and Scrambles you for ${cycles(a.amount)}: each of your attacks then has a ${pct(CONFIG.scramble.chance)} chance to hit you instead, at half damage.`, 'While you are Scrambled, fire commands with no direct hit. A ◆ on you stops it.'];
  if (a.effect === 'heal') return [`Heals the most damaged part for ${a.amount}${each}.`, 'Break it first, or finish a part between heals.'];
  if (a.windup) return [`Winds up a ${n} ${a.name}. Dealing ${a.windup} to it in the 2 cycles before it lands calls it off.`, 'Burst it in the 2 cycles before the hit lands.'];
  if (a.alarm) return [`Sleeps until you deal damage or cycle ${v?.dormant || 6} begins, then sounds an ${a.name} for ${n}.`, 'Set up before it wakes, then open with something big.'];
  if (a.dump) return [`Dumps for ${n} once it has logged 3 commands fired outside a Sync Window, and every ${a.interval} cycles anyway.`, 'Fire inside the Sync Window.'];
  if (a.ramp) return [`Hits you for ${n}${each}, ${a.rampBy || 1} more each time it lands.`, 'Delay it to reset the climb, or break it.'];
  if (a.grow) return [`Hits you for ${n}${each}, more every cycle the fight lasts.`, 'Break it early.'];
  if (a.siphon) return [`Hits you for ${n}${each}, and heals the most damaged part for what it deals.`, 'Break it, or shrink its hit with a shield or Throttle.'];
  if (a.wipe) return [`Hits you for ${n}${each}, and wipes ${a.wipe === 'last' ? 'the skill you used last' : 'your strongest ready skill'} off your bar for ${cycles(a.wipeFor || 3)}. Key 1 and SIGINT are never wiped.`, a.wipe === 'last' ? 'Lead with a cheap skill before its Wipe lands, or break it.' : 'Fire your big skill before its Wipe lands, or break it.'];
  return [`Hits you for ${n}${each}.`, 'Break it, or delay its attack. ◆ and shields soften the hit.'];
}
// [does, answer, cue]: cue is { text, icon, link } for a part whose rule reaches past its own row, or null.
function readOf(s, v, p) {
  const fam = v?.family, other = (id) => nameIn(v, id);
  if (p.lock) {
    const t = v.parts.find((x) => x.id === p.lock), n = t?.lockMax || Math.max(1, Math.round((t?.max || 0) * CONFIG.mutex.share));
    return [`Locks the ${other(p.lock)} behind a ${n} shield that takes every hit first. While the ${p.name} stands, the lock comes back ${cycles(CONFIG.mutex.every)} after you break it.`, `Break the ${p.name} first, or break the lock and finish the ${other(p.lock)} within ${cycles(CONFIG.mutex.every)}.`, { text: `locks ${other(p.lock)}`, icon: 'lock', link: p.lock }];
  }
  if (p.ward) {
    const t = v.parts.find((x) => x.id === p.ward), cap = Math.max(1, Math.round((t?.max || 0) * CONFIG.ward));
    return [`Wards the ${other(p.ward)}: it loses at most ${cap} Integrity a cycle while the ${p.name} stands.${p.wardCommands ? ' Only your commands are held back. Burns and helpers go through at full.' : ''}`, p.wardCommands ? `Break the ${p.name} first, or burn the ${other(p.ward)}.` : `Break the ${p.name} first, or wear the ${other(p.ward)} down under the cap.`, { text: `wards ${other(p.ward)}`, icon: 'shield', link: p.ward }];
  }
  if (p.twin) return [`Twinned with the ${other(p.twin)}. Break one while the other stands, and it reboots at ${pct(CONFIG.twinReboot.at)} ${cycles(CONFIG.twinReboot.in)} later, once.`, `Break both within ${cycles(CONFIG.twinReboot.in)} of each other.`, { text: `twin of ${other(p.twin)}`, icon: 'mirror', link: p.twin }];
  if (p.rearm) {
    const others = v.parts.filter((x) => x !== p && x.kind !== 'fragment'), t = others.length === 1 ? others[0] : null, who = t ? `the ${t.name}` : 'every other part';
    return [`Re-arms ${who} to full ◆ every ${p.rearm} cycles, ${CONFIG.rearmMax} times. It has no attack.`, `Break ${who} between re-arms. Break the ${p.name} first only when its ◆ is too thick to get through in time.`, { text: `re-arms ${t ? t.name : 'the others'}`, icon: 'repair', link: t?.id || null }];
  }
  if (p.reflect) return [`Every ${p.reflect}th cycle it mirrors your commands: they deal no damage, and ${pct(p.bounce ?? CONFIG.mirrorBounce)} bounces back at you. Burns and helpers get through.`, 'Fire nothing direct on its beat, or break it.', { text: `mirrors every ${p.reflect}`, icon: 'mirror', link: null }];
  if (p.mimic) return [`Records you. Every ${TELLS.mimic.every} cycles it plays the command you fire back at you, its whole direct hit.`, 'On its beat, fire no direct hit: a debuff, a strip, a burn or a shield.', { text: 'copies you', icon: 'mirror', link: null }];
  if (p.deadman) return [`Break it while other parts stand and they go loud for the rest of the fight: ${pct(CONFIG.tripwire.loud - 1)} more damage, and every attack 1 cycle sooner.`, 'Break it last.', null];
  if (p.command) return [`Commands the fragments: they gnaw ${pct(CONFIG.c2.gnaw)} harder while it stands, and all of them drop when it breaks.`, 'Break it once fragments are up.', null];
  if (p.tax) return [`While it stands, your cooldowns tick down only every other cycle. It attacks only once it is the last part left${p.attack ? `, then hits you for ${hitOf(s, p)} ${every(p.attack.interval)}` : ''}.`, 'Break it first.', { text: 'slows your cooldowns', icon: 'clock', link: null }];
  if (p.syncOnly) return [`Takes damage only from commands fired in a Sync Window. Each command outside one is logged, and at 3 logs it Dumps${p.attack ? ` for ${hitOf(s, p)}. It also Dumps ${every(p.attack.interval)}` : ''}.`, 'Fire inside the Sync Window.', { text: 'sync window only', icon: 'sync', link: null }];
  if (p.phase) return [`Out of phase on odd cycles: hits pass through it, and ${pct(CONFIG.phaseBounce)} of your command bounces back at you.`, 'Hit it on even cycles.', null];
  if (p.echo) return ['While it stands, every hit you take repeats 1 cycle later at half damage.', 'Break it early. Shields and Block shrink what repeats.', null];
  if (p.overrun) return [`Spawns fragments${p.attack ? ` ${every(p.attack.interval)}` : ''} whose bite deals 1 more damage every cycle they live.`, 'Clear fragments young, or break it.', null];
  // A server room's bodies (families.mjs).
  if (fam === 'trojan' && p.deliver) return [`Hits you for ${p.attack ? hitOf(s, p) : 0} ${every(p.attack?.interval || 5)}, and delivers a Package ${every(p.deliver.interval)}. While the Loader stands, a Package unpacks into two Droppers when anything damages it, or on its own ${cycles(BODY.package.opens)} after delivery.`, 'Break the Loader first, and leave the Packages alone until then.', null];
  if (fam === 'trojan' && p.id === 'loader') return [`While it stands, any damage to a Package unpacks it into two Droppers. Taking it across a tick delays the next delivery by ${cycles(BODY.loader)}.`, 'Break it first. Every Package is then an inert box with credits inside.', null];
  if (p.pkg) return p.pkg.inert ? ['An inert box.', 'Break it for a Payload Box of credits.', null] : [`Unpacks into two Droppers at the end of cycle ${p.pkg.opensAt}, or the moment anything damages it while the Loader stands.`, 'Leave it alone, or break the Loader first.', null];
  if (fam === 'cryptominer' && p.id === 'rig') return [`Hashes you for ${hitOf(s, p)} ${every(p.attack?.interval || 2)}, ${p.attack?.rampBy || 1} more each time it lands, and heats up every cycle. At ${BODY.heat.at} heat it overheats: it stops hashing and burns itself until it breaks.`, 'Take it across a tick to vent its heat and its climb, or let it cook.', null];
  if (fam === 'cryptominer' && p.id === 'cooler') return [`Keeps the Rig cool. Break it and the Rig heats ${BODY.heat.hot} a cycle instead of ${BODY.heat.cooled}, and every Hash lands ${pct(BODY.heat.hard - 1)} harder.`, 'Leave it standing, or break it to make the Rig overheat sooner.', { text: 'cools the Rig', icon: 'scheduler', link: 'rig' }];
  if (p.kind === 'fragment' && p.attack && !p.raidAdd) return [`${String(p.id).startsWith('dropper') ? 'Sprays' : 'Gnaws'} you for ${hitOf(s, p)} ${every(p.attack.interval)}.`, String(p.id).startsWith('dropper') ? 'Break it, or clear it with a hit on every part.' : 'Clear it with a hit on every part, or break what spawns it.', null];
  if (p.raidFuse) return [`Goes off on everyone ${every(p.raidFuse.every)}${p.raidWard ? `, and the boss takes ${pct(p.raidWard)} less damage while it stands` : ''}.`, 'Break it before it goes off.', null];
  if (p.spam) return [...attackRead(s, v, p).slice(0, 1), 'Break it in a hit or two. It carries no ticks to interrupt.', null];
  if (p.attack) return [...attackRead(s, v, p), null];
  return ['It has no attack of its own.', 'Break it when the others are handled.', null];
}
// What a part does (one or two sentences, its tells and veil after), how to answer it, and its cue.
export function partRead(s, v, p) {
  const [does, answer, cue] = readOf(s, v, p);
  // The tells it brings in this fight (or, with no fight, the ones its kind can bring), as what it does.
  const T = s?.encounter?.virus === v ? tellsOf(s) : null;
  const tl = (T ? T.list.filter((t) => t.part === p.id).map((t) => ({ name: t.name, kind: t.kind })) : v ? partTells(v, p) : []).filter((x) => x.kind !== 'mimic');
  const VERB = { charge: 'Charges', cast: 'Casts', seal: 'Seals with', lock: 'Locks with' };
  const tells = tl.map((x) => `${VERB[x.kind] || 'Brings'} ${x.name}.`).join(' ');
  const more = [p.veiled ? 'Hides its timers while it wears ◆.' : '', p.enrage ? `Deals ${pct(CONFIG.enrage - 1)} more once it drops below half.` : '', tells].filter(Boolean).join(' ');
  return { does: more ? `${does} ${more}` : does, answer, cue };
}
// The part row's tooltip. Until the codex knows it: ??? and how to decode it.
export function partTip(s, v, p) {
  if (!knowsPart(s, v, p)) return `${p.name}: ???\nBreak one to decode what it does.`;
  const r = partRead(s, v, p);
  return `${p.name}: ${r.does}\n${r.answer}`;
}
// Its cue on the row, once decoded (a Mutex: "locks Encryptor"), or null.
export const partCue = (s, v, p) => (knowsPart(s, v, p) ? partRead(s, v, p).cue : null);
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
export const LINK_ICON = { lock: 'lock', ward: 'shield', twin: 'mirror', rearm: 'repair', cool: 'scheduler', command: 'router' };
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
function linkTip(s, v, l) {
  const p = part(s, l.from) || v.parts.find((x) => x.id === l.from), to = l.to.map((id) => v.parts.find((x) => x.id === id)).filter(Boolean);
  const names = join(to.map((x) => `the ${x.name}`));
  if (!l.known) return `${p.name}: ???\nSomething on it reaches ${names || 'another part'}. Break one to decode what it does.`;
  if (l.snap) return `${p.name}: broken. Its hold on ${names} is gone.`;
  if (l.kind === 'lock') {
    const t = to[0], lk = t?.lockHp > 0 ? t.lockHp : 0;
    return lk ? `${p.name} lock: ${names} wears a ${lk}/${t.lockMax || lk} shield that takes every hit first.\nBreak the ${p.name} and the lock is gone for good. Break the lock and it comes back ${cycles(CONFIG.mutex.every)} later.`
      : `${p.name} lock: broken. The ${p.name} locks ${names} again ${upTo(l.count ?? CONFIG.mutex.every)}.\nFinish ${names} before then, or break the ${p.name}.`;
  }
  if (l.kind === 'ward') {
    const w = to[0] ? wardOf(s, v, to[0]) : null;
    return `${p.name} ward: ${names} loses at most ${w?.cap ?? '?'} Integrity a cycle${w ? ` (${w.left} left this cycle)` : ''}.${p.wardCommands ? ' Burns and helpers go through at full.' : ''}\nBreak the ${p.name} first, or wear ${names} down under the cap.`;
  }
  if (l.kind === 'twin') {
    if (!to.length) { const down = v.parts.find((x) => (x.twin === p.id || p.twin === x.id) && !alive(x)); return `${p.name} twin: it reboots the ${down?.name || 'other twin'} ${upTo(l.count ?? 0)}, at ${pct(CONFIG.twinReboot.at)}.\nBreak the ${p.name} before then and it stays down.`; }
    return `${p.name} twin: ${names}. Break one while the other stands and it reboots at ${pct(CONFIG.twinReboot.at)} ${cycles(CONFIG.twinReboot.in)} later, once.\nBreak both within ${cycles(CONFIG.twinReboot.in)} of each other.`;
  }
  if (l.kind === 'rearm') return l.up ? `${p.name} re-arm: ${names} back to full ◆ ${upTo(l.count)}. ${CONFIG.rearmMax - (p.rearms || 0)} of ${CONFIG.rearmMax} re-arms left.\nBreak ${names} between re-arms.` : `${p.name} re-arm: overheated. It can't re-arm ${names} again.`;
  if (l.kind === 'command') return `${p.name} command: the fragments gnaw ${pct(CONFIG.c2.gnaw)} harder while it stands, and all of them drop when it breaks.\nBreak it once fragments are up.`;
  const r = partRead(s, v, p);
  return `${p.name}: ${r.does}\n${r.answer}`;
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
  for (const l of out) l.tip = linkTip(s, v, l);
  return out;
}

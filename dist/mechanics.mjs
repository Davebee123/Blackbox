// The mechanics list (docs/mechanics-list.md): twenty components for the designer to play, built lean (CLAUDE.md "Lean
// first"). Each is a third part (genes.mjs, its spec's `mech`), and its whole rule lives here: combat.mjs calls the hooks
// below at a handful of points in the cycle, and the board (fightread.mjs mechRead, view.mjs) reads the same state.
//
// Statuses on you (each from a part's attack that lands; a ◆ on you stops it whole, as it stops a Scramble):
//   exposed  Prober     your next incoming hit deals more, then it clears
//   lag      Jitter     for a few cycles your command lands after the virus acts (solo fights)
//   leak     Leaker     for a few cycles every command you fire costs a share of your max; holding is free
//   sandbox  Sandbox    for a cycle only quiet commands fire (strips, burns, helpers, shields, buffs): no direct hits
//   stunner  Stunner    your next command doesn't fire
//   junk     Junker     a dead key takes one of your bar's keys; firing that key clears it, and that is your command
// Abilities your statuses unlock:
//   predator     while you're Encrypted or Corrupted, it attacks every cycle
//   opportunist  asleep, off the timeline, until you carry any debuff; then it wakes for good
//   feeder       each cycle heals the most damaged part by a share of its max for each debuff you carry
//   punisher     a free extra attack on a cycle your command didn't fire because you were Hung or Stunned
//   harvester    its attack consumes your Corrupted for a hit of a share of your max a cycle it had left
//   volatile     its attack leaves you Corrupted; cleansing that deals the rest of it at once
// Buffs and support on the virus:
//   amplifier    each cycle it boosts the next attack of one other part, in turn
//   bodyguard    at the end of each cycle it shields the part your command hit (the shield takes only commands)
//   vendetta     while it stands, each other part you break makes the rest hit harder for the fight
//   thorns       your command hits on it leave you Corrupted, a stack each
// Timing and control:
//   countdown    after you fire enough commands, every part attacks at once
//   backtrace    each status you carry adds a stack each cycle; at the count it calls in a fragment
//   swap         its attack Throttles you; while it stands, your next command hit moves Throttled, Exposed or Corrupted
//                off you onto that part
//   turncoat     below half your Signal its attack Scrambles you too
import { ABILITIES, CONFIG, TELL } from './data.mjs';
import { emit, alive, part, livingParts, attackers, defender, takeDamage, usable, rand, strikeWith, implanted, addBurn } from './combat.mjs';
import { copyKind } from './tells.mjs';

// The numbers, every one a *start* (docs/mechanics-list.md): the designer's play tunes them.
export const MECH = {
  exposed: { mult: 1.5 },
  lag: { cycles: 2 },
  leak: { cycles: 3, share: 0.03 },
  sandbox: { cycles: 1 },
  predator: { every: 1 },
  feeder: { share: 0.02 },
  harvester: { share: 0.04 },
  volatile: { share: 0.02, cycles: 3 },
  amplifier: { mult: 1.5 },
  bodyguard: { share: 0.15 },
  vendetta: { more: 0.2 },
  thorns: { share: 0.01, cycles: 3 },
  countdown: { at: 10 },
  backtrace: { at: 5 },
  swap: { cycles: 2 },
  turncoat: { below: 0.5, cycles: 2 },
};
const cyc = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;
const pct = (x) => `${Math.round(x * 100)}%`;
const shareOf = (s, x) => Math.max(1, Math.round(defender(s).max * x));
const mechs = (s, id) => livingParts(s).filter((p) => p.mech === id);
const has = (s, id) => mechs(s, id).length > 0;

// ---------- the debuffs you carry ----------
// Every status the virus has on you now, by name: the body's (Encrypted, Scrambled), a landed tell's (Corrupted, Hung,
// a skill offline), the Mimic's (Throttled), the Bad Block's (Cracked) and this list's. Opportunist, Feeder and
// Backtrace count them.
export function youDebuffs(s) {
  const e = s.encounter, c = e.cycle, out = [];
  if (e.encrypt > 0) out.push('Encrypted');
  if (e.corrupt?.left > 0) out.push('Corrupted');
  if (e.scrambleUntil > c) out.push('Scrambled');
  if (e.hung >= c) out.push('Hung');
  if (e.throttledUntil >= c) out.push('Throttled');
  if (e.badBlock?.left > 0) out.push('Cracked');
  if (Object.values(e.locked || {}).some((u) => u >= c)) out.push('Offline');
  if (e.exposedHit) out.push('Exposed');
  if (e.lagUntil >= c) out.push('Lag');
  if (e.leakUntil >= c) out.push('Leak');
  if (e.sandboxUntil >= c) out.push('Sandboxed');
  if (e.stunned >= c) out.push('Stunned');
  if (e.junk) out.push('Junk process');
  return out;
}
export const lagged = (s) => s.encounter.lagUntil >= s.encounter.cycle;
export const junkKey = (s) => s.encounter?.junk || null;
// A direct hit (the Mimic's 'hit' copy): what Sandboxed stops.
export const directHit = (id) => copyKind(id) === 'hit';

// ---------- your command ----------
// Before your command is accepted: Sandboxed refuses a direct hit, so you can pick another.
export function mechValidate(s, intent) {
  const e = s.encounter;
  if (e?.sandboxUntil >= e.cycle && directHit(intent.ability) && e.junk !== intent.ability) return `You are Sandboxed. ${ABILITIES[intent.ability].name} is a direct hit, and only quiet commands fire this cycle.`;
  return null;
}
// As your command fires (typed, or auto-repeat): true when it was spent here. The junked key clears the junk; a direct
// hit under Sandboxed (queued before it landed) doesn't fire.
export function mechIntercept(s, id) {
  const e = s.encounter;
  if (e.junk && id === e.junk) {
    emit(s, 'status', `You clear the junk process off ${ABILITIES[id]?.name || id}. It's your key again next cycle.`, { junk: true });
    e.junk = null; e.lastCmd = { id: 'hold', cycle: e.cycle };
    return true;
  }
  if (e.sandboxUntil >= e.cycle && directHit(id)) {
    emit(s, 'hung', `SANDBOXED. ${ABILITIES[id]?.name || id} is a direct hit and does not fire.`, {});
    e.lastCmd = { id: 'hold', cycle: e.cycle };
    return true;
  }
  return false;
}
// A command of yours that didn't fire because you were Hung or Stunned (combat.mjs playerPhase): the Punisher's window.
export const stunnedNow = (s) => s.encounter.stunned === s.encounter.cycle;
export const missedTurn = (s) => { s.encounter.missedAt = s.encounter.cycle; };
// After your command phase: Leak's price, the Countdown's count, and a Volatile Corrupted you just cleansed.
export function mechFired(s) {
  if (!s.encounter?.virus) return; // the fight ended on your command (jacked out)
  const e = s.encounter, fired = e.lastCmd?.cycle === e.cycle && e.lastCmd.id !== 'hold';
  if (fired && e.leakUntil >= e.cycle) {
    const d = defender(s), n = Math.min(Math.max(0, d.integrity - 1), shareOf(s, MECH.leak.share)); // never your last point
    if (n) { d.integrity -= n; emit(s, 'server-hit', `Leak: your command costs ${n}.`, { amount: n, atk: 'Leak', leak: true }); }
  }
  if (fired) for (const p of mechs(s, 'countdown')) p.count = (p.count || 0) + 1;
  const v = e.volatile;
  if (v && e.corrupt !== v.ref) {
    e.volatile = null;
    const n = !e.corrupt && v.ref.left > 0 ? v.ref.amount * v.ref.left : 0; // cleansed (not run out, nor replaced by a tell's)
    if (n) { const dealt = takeDamage(s, n, v.source, 'Volatile'); emit(s, 'server-hit', `The Corrupted was Volatile: cleansing it deals the rest at once, −${dealt}.`, { source: v.source, amount: dealt, atk: 'Volatile' }); }
  }
}

// ---------- the virus's attacks ----------
// What a part's attack deals over its own: an Amplifier's boost on its next one (spent as it lands: `spend`; not on a
// `later` one, for the board's cells past the first), and Vendetta's stacks.
export function mechPower(s, p, spend = false, later = false) {
  const e = s.encounter;
  let m = 1 + MECH.vendetta.more * (e.virus.vendetta || 0);
  if (p.amped && !later && alive(part(s, p.amped))) { m *= MECH.amplifier.mult; if (spend) p.amped = null; }
  return m;
}
// Exposed: the hit about to land on you deals more, and the status clears.
export function exposedCut(s) {
  const e = s.encounter;
  if (!e.exposedHit) return 1;
  e.exposedHit = false;
  emit(s, 'status', `You were Exposed: this hit deals ${pct(MECH.exposed.mult - 1)} more.`, {});
  return MECH.exposed.mult;
}
// A part's attack got through to you (past your ◆, a miss and Null Route): the status it leaves, or what it cashes in.
export function mechLanded(s, p, atk) {
  const e = s.encounter, c = e.cycle, say = (text) => emit(s, 'blind', `${atk.name} ${text}`, { source: p.id, mech: p.mech });
  switch (p.mech) {
    case 'exposed': e.exposedHit = true; return say(`leaves you Exposed. Your next incoming hit deals ${pct(MECH.exposed.mult - 1)} more.`);
    case 'lag': e.lagUntil = c + MECH.lag.cycles; return say(`lags you for ${cyc(MECH.lag.cycles)}. Your command lands after the virus acts.`);
    case 'leak': e.leakUntil = c + MECH.leak.cycles; return say(`leaks you for ${cyc(MECH.leak.cycles)}. Each command you fire costs ${shareOf(s, MECH.leak.share)}. Holding is free.`);
    case 'sandbox': e.sandboxUntil = c + MECH.sandbox.cycles; return say(`Sandboxes you for ${cyc(MECH.sandbox.cycles)}. Only quiet commands fire.`);
    case 'stunner': e.stunned = c + 1; return say('STUNS you. Your next command does not fire.');
    case 'junk': {
      const keys = usable(s).filter((id) => !['spike', 'sigint', 'hold'].includes(id) && id !== e.junk);
      if (e.junk || !keys.length) return;
      e.junk = keys[Math.floor(rand(s) * keys.length)];
      return say(`drops a junk process on ${ABILITIES[e.junk].name}. Fire that key to clear it.`);
    }
    case 'harvester': {
      const k = e.corrupt?.left > 0 ? e.corrupt.left : 0;
      if (!k) return;
      e.corrupt = null; e.volatile = null; // reaped, not cleansed: a Volatile's rest doesn't land on top (the Scythe)
      const dealt = takeDamage(s, shareOf(s, MECH.harvester.share * k), p.id, 'Harvest');
      return say(`consumes your Corrupted (${k} left): −${dealt}.`);
    }
    case 'volatile': {
      const n = shareOf(s, MECH.volatile.share), was = e.corrupt?.left > 0 ? e.corrupt : null;
      if (was) { was.amount += n; was.left = Math.max(was.left, MECH.volatile.cycles); }
      e.corrupt = was || { name: p.name, amount: n, left: MECH.volatile.cycles, source: p.id };
      e.volatile = { ref: e.corrupt, source: p.id };
      return say(`leaves you Corrupted (Volatile), ${e.corrupt.amount} damage every cycle. Cleansing it deals the rest at once.`);
    }
    case 'swap': e.throttledUntil = Math.max(e.throttledUntil ?? -1, c + MECH.swap.cycles); return say(`Throttles you for ${cyc(MECH.swap.cycles)}. Your next command hit moves it onto that part.`);
    case 'turncoat': {
      const d = defender(s);
      if (d.integrity >= d.max * MECH.turncoat.below || e.scrambleUntil > c) return;
      e.scrambleUntil = c + MECH.turncoat.cycles;
      return say(`turns on you below half: you are SCRAMBLED for ${cyc(MECH.turncoat.cycles)}.`);
    }
  }
}

// ---------- your command's hit on a part (combat.mjs hit) ----------
// Thorns, a Swap passing your statuses on, and the part a Bodyguard shields at the cycle's end.
export function mechCommandHit(s, p) {
  const e = s.encounter, c = e.cycle;
  e.guardHit = { id: p.id, cycle: c };
  if (p.mech === 'thorns' && p.thornAt !== c) {
    p.thornAt = c;
    const n = shareOf(s, MECH.thorns.share), was = e.corrupt?.left > 0 ? e.corrupt : null;
    if (was) { was.amount += n; was.left = Math.max(was.left, MECH.thorns.cycles); } else e.corrupt = { name: p.name, amount: n, left: MECH.thorns.cycles, source: p.id };
    emit(s, 'blind', `The ${p.name}'s thorns: you are Corrupted, ${e.corrupt.amount} damage every cycle.`, { source: p.id, mech: 'thorns' });
  }
  if (!has(s, 'swap') || p.mech === 'swap') return;
  const moved = [];
  if (e.throttledUntil >= c) { p.throttledUntil = Math.max(p.throttledUntil || 0, e.throttledUntil); e.throttledUntil = -1; moved.push('Throttled'); }
  if (e.exposedHit) { e.exposedHit = false; p.exposedUntil = Math.max(p.exposedUntil || 0, c + 1); moved.push('Exposed'); }
  if (e.corrupt?.left > 0 && !e.volatile) { addBurn(e, { id: 'swap', name: 'Corrupted', target: p.id, damage: e.corrupt.amount, left: e.corrupt.left }); e.corrupt = null; moved.push('Corrupted'); }
  if (moved.length) emit(s, 'status', `Swap: your ${moved.join(' and ')} moves onto the ${p.name}.`, { target: p.id, mech: 'swap' });
}

// ---------- the cycle ----------
// The start of the virus's half (combat.mjs cycleStart): the Punisher's free attack, the Countdown's big turn. True if
// the fight ended.
export function mechStart(s) {
  const e = s.encounter, over = () => defender(s).integrity <= 0 || !livingParts(s).length;
  if (e.missedAt === e.cycle) for (const p of mechs(s, 'punisher').filter((x) => x.attack)) {
    emit(s, 'status', `The ${p.name} punishes the command you lost: a free ${p.attack.name}.`, { source: p.id, mech: 'punisher' });
    if (strikeWith(s, p, { ...p.attack, free: true }) || over()) return true;
  }
  for (const p of mechs(s, 'countdown').filter((x) => (x.count || 0) >= MECH.countdown.at)) {
    p.count = 0;
    const all = attackers(s).filter((x) => x.kind !== 'fragment' || x.attack.effect === 'damage');
    emit(s, 'phase', `COUNTDOWN. The ${p.name} reaches zero: every part attacks at once.`, { source: p.id, mech: 'countdown' });
    for (const x of all) if (alive(x) && (strikeWith(s, x, { ...x.attack }) || over())) return true;
  }
  return false;
}
// The end of the cycle (combat.mjs cycleClose): what each part does with what you carry, and its turn.
export function mechClose(s) {
  const e = s.encounter, c = e.cycle, debuffs = youDebuffs(s);
  for (const p of mechs(s, 'predator')) {
    const was = p.hunting;
    p.hunting = e.encrypt > 0 || e.corrupt?.left > 0;
    if (p.hunting && !was) emit(s, 'status', `The ${p.name} smells ${e.encrypt > 0 ? 'the encryption' : 'the corruption'} on you. It attacks every cycle until you're clean.`, { target: p.id, mech: 'predator' });
    if (p.hunting && p.attack && p.attack.due > c + MECH.predator.every) p.attack.due = c + MECH.predator.every;
  }
  for (const p of mechs(s, 'opportunist').filter((x) => !x.woke && debuffs.length && x.attack)) {
    p.woke = true; p.attack.due = c + 1;
    emit(s, 'status', `The ${p.name} WAKES: you carry ${debuffs[0]}. It attacks next cycle.`, { target: p.id, mech: 'opportunist' });
  }
  for (const p of mechs(s, 'feeder')) {
    const hurt = livingParts(s).filter((x) => x.kind !== 'fragment' && x.integrity < x.max && !implanted(s, x)).sort((a, b) => a.integrity / a.max - b.integrity / b.max)[0];
    if (!hurt || !debuffs.length) continue;
    const got = Math.min(hurt.max - hurt.integrity, Math.max(1, Math.round(hurt.max * MECH.feeder.share * debuffs.length)));
    hurt.integrity += got;
    emit(s, 'heal', `The ${p.name} feeds on your ${debuffs.length} ${debuffs.length === 1 ? 'debuff' : 'debuffs'}: the ${hurt.name} +${got}.`, { target: hurt.id, amount: got, mech: 'feeder' });
  }
  for (const p of mechs(s, 'amplifier')) {
    const others = attackers(s).filter((x) => x !== p && x.kind !== 'fragment');
    if (!others.length) continue;
    const t = others[(p.ampTurn = ((p.ampTurn ?? -1) + 1) % others.length)];
    if (t.amped) continue;
    t.amped = p.id;
    emit(s, 'status', `The ${p.name} boosts the ${t.name}'s next attack: +${pct(MECH.amplifier.mult - 1)}.`, { target: t.id, mech: 'amplifier' });
  }
  for (const p of mechs(s, 'bodyguard')) {
    const t = e.guardHit?.cycle === c ? part(s, e.guardHit.id) : null;
    if (!t || t === p || !alive(t) || t.kind === 'fragment') continue;
    const n = Math.max(1, Math.round(t.max * MECH.bodyguard.share));
    for (const x of livingParts(s)) if (x !== t && x.bufBy === p.id) x.bufHp = 0;
    t.bufHp = n; t.bufMax = n; t.bufBy = p.id;
    emit(s, 'patch', `The ${p.name} shields the ${t.name}: ${n}. Your commands hit the shield first.`, { target: t.id, from: p.id, buffer: true, mech: 'bodyguard' });
  }
  for (const p of mechs(s, 'backtrace')) {
    p.trace = (p.trace || 0) + debuffs.length;
    if (p.trace < MECH.backtrace.at) continue;
    p.trace = 0;
    spawnFragment(s, p);
  }
}
// A part you broke (combat.mjs breakPart): Vendetta's stack while a Vendetta stands.
export function mechBroke(s, p) {
  const e = s.encounter;
  if (p.kind === 'fragment' || p.mech === 'vendetta' || !has(s, 'vendetta')) return;
  e.virus.vendetta = (e.virus.vendetta || 0) + 1;
  emit(s, 'status', `Vendetta: the rest of the virus hits ${pct(MECH.vendetta.more * e.virus.vendetta)} harder for the fight.`, { mech: 'vendetta' });
}
// A fragment, as a Replicate spawns one (combat.mjs landAttack), within the cap and outside a DMZ.
function spawnFragment(s, p) {
  const e = s.encounter;
  if (e.buffs?.dmz >= e.cycle) return emit(s, 'blocked', `The ${p.name} calls in a fragment, but nothing new gets into the DMZ.`, { source: p.id });
  if (livingParts(s).filter((x) => x.kind === 'fragment').length >= CONFIG.fragmentCap) return;
  const n = e.nextFragment++, pw = e.virus.power || 1;
  const amount = Math.max(1, Math.round(CONFIG.fragmentDamage * pw)), hp = Math.max(1, Math.round(CONFIG.fragmentIntegrity * (e.virus.hpPower ?? pw)));
  e.virus.parts.push({ id: 'frag' + n, name: 'Fragment ' + n, kind: 'fragment', integrity: hp, max: hp, armor: 0, maxArmor: 0, patchAt: null, veiled: false, loot: null, special: false, attack: { name: 'Gnaw', effect: 'damage', amount, interval: 1, due: e.cycle + 1 }, exposedUntil: 0, lastDamaged: 0, boosted: false });
  emit(s, 'spawn', `BACKTRACE. The ${p.name} traces you and calls in Fragment ${n}.`, { source: p.id, target: 'frag' + n, mech: 'backtrace' });
}

// ---------- the board ----------
// What a part does, its answer and its cue under its name (fightread.mjs readOf): [does, answer, cue]. `atk` is its
// attack's own line ("Deals 4 damage to you every 3 cycles.").
export function mechRead(s, p, atk = '') {
  const e = s?.encounter, live = !!e?.virus?.parts?.includes(p), a = atk ? `${atk} ` : '';
  const cue = (text, icon) => ({ text, icon, link: null });
  switch (p.mech) {
    case 'exposed': return [`${a}When its ${p.attack?.name || 'attack'} lands, you are Exposed. Your next incoming hit deals ${pct(MECH.exposed.mult - 1)} more.`, 'Take the next hit on a ◆ or a shield.', cue('exposes you', 'spike')];
    case 'lag': return [`${a}When it lands, you lag for ${cyc(MECH.lag.cycles)}. Your command lands after the virus acts, so it can't cut an attack due then.`, 'Cut and race before it lands.', cue('lags you', 'clock')];
    case 'leak': return [`${a}When it lands, you leak for ${cyc(MECH.leak.cycles)}. Every command you fire costs ${pct(MECH.leak.share)} of your max health. Holding is free.`, 'Hold, or fire only what counts.', cue('leaks you', 'burn')];
    case 'sandbox': return [`${a}When it lands, you are Sandboxed for ${cyc(MECH.sandbox.cycles)}. Only quiet commands fire. Strips, burns, helpers, shields and buffs still go, and direct hits don't.`, 'Finish what needs a direct hit before it lands.', cue('sandboxes you', 'shield')];
    case 'stunner': return [`${a}When it lands, you are Stunned, and your next command does not fire. A ◆ on you takes the hit and breaks instead.`, 'Wear a ◆ when it lands.', cue('stuns you', 'damage')];
    case 'junk': return [`${a}When it lands, a junk process takes one of your bar's keys. Firing that key clears it, and that is your command for the cycle.`, 'Clear it when the key matters.', cue(e?.junk && live ? `junk on ${ABILITIES[e.junk]?.name}` : 'junks a key', 'crate')];
    case 'predator': return [`${a}While you're Encrypted or Corrupted, it attacks every cycle.`, 'Cleanse, or break it before you carry either.', cue(live && p.hunting ? 'hunting you' : 'hunts the encrypted', 'damage')];
    case 'opportunist': return [p.woke && live ? `${a}Awake. It woke when you carried a debuff, and it stays awake.` : `Asleep, off the timeline, until you carry any debuff. Then it wakes for good and attacks the next cycle.${atk ? ` Once awake, it ${atk[0].toLowerCase()}${atk.slice(1)}` : ''}`, 'Break it while it sleeps, or keep clean.', cue(p.woke && live ? 'awake' : 'sleeps till you carry a debuff', 'stealth')];
    case 'feeder': return [`At the end of each cycle, it heals the most damaged part by ${pct(MECH.feeder.share)} of that part's max for each debuff you carry.${live ? ` You carry ${youDebuffs(s).length}.` : ''}`, 'Cleanse, or kill faster than it feeds.', cue('feeds on your debuffs', 'heal')];
    case 'punisher': return [`${a}When you're Hung or Stunned and lose a command, it gets a free extra attack that cycle.`, 'Answer the tells and stuns that would hang you.', cue('punishes a lost turn', 'damage')];
    case 'harvester': return [`${a}Its attack consumes all your Corrupted for an extra hit of ${pct(MECH.harvester.share)} of your max for each cycle it had left.`, 'Cleanse Corrupted before it lands.', cue('reaps your Corrupted', 'burn')];
    case 'volatile': return [`${a}When it lands, you are Corrupted for ${pct(MECH.volatile.share)} of your max every cycle for ${cyc(MECH.volatile.cycles)}. Cleansing it deals what it had left at once.`, 'Let it run out, or cleanse with a shield up.', cue('volatile corruption', 'burn')];
    case 'amplifier': { const t = live ? e.virus.parts.find((x) => alive(x) && x.amped === p.id) : null; return [`Has no attack of its own. Each cycle it boosts the next attack of another part, in turn. That attack deals ${pct(MECH.amplifier.mult - 1)} more.`, 'Break the boosted part first, or the Amplifier.', cue(t ? `boosts ${t.name}` : 'boosts the others', 'sync')]; }
    case 'bodyguard': return [`Has no attack of its own. At the end of each cycle, it shields the part your command hit for ${pct(MECH.bodyguard.share)} of that part's max. The shield takes only your commands.`, 'Switch targets, or break the Bodyguard first.', cue('shields your target', 'shield')];
    case 'vendetta': { const n = live ? e.virus.vendetta || 0 : 0; return [`${a || 'Has no attack of its own. '}While it stands, each other part you break makes the rest hit ${pct(MECH.vendetta.more)} harder for the rest of the fight.`, 'Break the Vendetta first.', cue(n ? `+${pct(MECH.vendetta.more * n)} damage` : 'avenges each break', 'damage')]; }
    case 'thorns': return [`${a}Each command that hits it leaves you Corrupted, a stack of ${pct(MECH.thorns.share)} of your max a cycle for ${cyc(MECH.thorns.cycles)}. Burns and helpers don't.`, 'Use burns and helpers on it.', cue('thorns', 'spike')];
    case 'countdown': { const left = MECH.countdown.at - (p.count || 0); return [`Has no attack of its own. It counts the commands you fire. At ${MECH.countdown.at}, every part attacks at once, and the count starts over. Holding doesn't count.`, 'Hold to stall it, or break it.', cue(live ? `big turn in ${left}` : `counts ${MECH.countdown.at} commands`, 'clock')]; }
    case 'backtrace': return [`Has no attack of its own. Each cycle, each status you carry adds a stack. At ${MECH.backtrace.at} stacks, it calls in a fragment, and the stacks start over.`, 'Cleanse, or break it.', cue(live ? `trace ${p.trace || 0}/${MECH.backtrace.at}` : 'traces your statuses', 'spider')];
    case 'swap': return [`${a}When it lands, you are Throttled for ${cyc(MECH.swap.cycles)}. While it stands, your next command hit moves your Throttled, Exposed or Corrupted onto the part it hits.`, 'Pass it to the part whose attack you want weak.', cue('passes your debuffs', 'mirror')];
    case 'turncoat': return [`${a}Below ${pct(MECH.turncoat.below)} of your Signal, it changes stance, and its attack Scrambles you for ${cyc(MECH.turncoat.cycles)}.`, 'Heal to stay over half, or break it first.', cue(live && defender(s).integrity < defender(s).max * MECH.turncoat.below ? 'scrambles now' : 'turns below half', 'mirror')];
  }
  return [atk || 'Has no attack of its own.', '', null];
}
// The statuses on you, for the board's strip (view.mjs statusSpans): { name, until, title, value }.
export function youMarks(s) {
  const e = s.encounter, c = e.cycle, out = [];
  if (e.exposedHit) out.push({ name: 'Exposed', until: c, title: `Your next incoming hit deals ${pct(MECH.exposed.mult - 1)} more, then it clears.`, value: `+${pct(MECH.exposed.mult - 1)}` });
  if (e.lagUntil >= c) out.push({ name: 'Lag', until: e.lagUntil, title: 'Your command lands after the virus acts this cycle.' });
  if (e.leakUntil >= c) out.push({ name: 'Leak', until: e.leakUntil, title: `Each command you fire costs ${shareOf(s, MECH.leak.share)}. Holding is free.`, value: `−${shareOf(s, MECH.leak.share)}` });
  if (e.sandboxUntil >= c) out.push({ name: 'Sandboxed', until: e.sandboxUntil, title: 'Only quiet commands fire: strips, burns, helpers, shields and buffs. Direct hits don\'t.' });
  if (e.stunned >= c) out.push({ name: 'Stunned', until: e.stunned, title: 'Your command does not fire that cycle.' });
  if (e.junk) out.push({ name: 'Junk process', until: c, title: `A junk process holds ${ABILITIES[e.junk]?.name || e.junk}. Fire that key to clear it.` });
  return out;
}

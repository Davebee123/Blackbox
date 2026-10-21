// Daemons: small programs that fight beside you (data.mjs DAEMONS, GAME_RULES.md "Daemons"). Only invasions drop
// them (invasion.mjs daemonDrop), each at the invasion's level, an item level its number grows with. You hold one
// copy of each, the best you've found: a better one replaces it and the other scraps for code.
//   s.daemonLv   daemon id → its level (0 or missing: not found yet)
//   s.daemons    the ids you've slotted, up to daemonSlots
// A slotted daemon with a cooldown (cd) acts after your order on the cycles it's ready (runDaemons); one with a
// trigger (on) acts when its moment comes (daemonsOn, called where it happens). A shield or a heal lands at once;
// a hit waits for the end of the step it came in (flushDaemons), so it never lands inside another hit. Daemons
// never set off daemons.
import { DAEMONS, daemonN, daemonWhen, bandDaemons, daemonBand, DAEMON_DROP, DAEMON_BANDS, codeUnit, CONFIG, SERVER } from './data.mjs';
import { emit, warn, active, alive, part, livingParts, soonestAttacker, defender, virusIntegrity, hit, heal, rand, serverLevel, classOf, telling, gainCode, scaled, delayAttack } from './combat.mjs';
import { codeOf } from './gear.mjs';

// ---------- what you hold ----------
export const ownedOf = (s) => (s.daemonLv ||= {});
export const daemonLevel = (s, id) => (DAEMONS[id] && ownedOf(s)[id]) || 0;
export const daemonSlots = (s) => CONFIG.daemonSlots + SERVER.daemonSlotsAt.filter((l) => serverLevel(s) >= l).length + (classOf(s) === 'operator' ? 1 : 0);
export const slottedDaemons = (s) => (s.daemons || []).filter((id) => daemonLevel(s, id)).slice(0, daemonSlots(s));
export const daemonAmount = (s, id) => daemonN(id, daemonLevel(s, id) || 1);
// Its tooltip line with its number in (at its level, or at `level`).
export const daemonText = (id, level) => DAEMONS[id].rule.replaceAll('{n}', String(daemonN(id, level)));
// The bar a Watchman waits for: a big attack, at your power (its level buys its hit, not a lower bar).
export const watchmanBar = (s) => scaled(s, 20);
// When a cooldown daemon acts next (a cycle number), or null for a triggered one.
export const daemonNext = (s, id) => (!DAEMONS[id].cd ? null : Math.max(s.encounter.cycle, s.encounter.daemonReady?.[id] || s.encounter.cycle));
// The cycles of a fight's first n that a cooldown daemon acts in, by runDaemons' rule: in the first cycle it can (a
// fight's cycle 1), then every cd cycles after it acts. [] for a triggered one. (When it has nothing to do, such as no
// part burning for a Kindle, it waits a cycle and tries again; this is the schedule when it always can.)
export function daemonCycles(id, n = 12) {
  const cd = DAEMONS[id]?.cd, out = [];
  if (!cd) return out;
  for (let c = 1, ready = 1; c <= n; c++) if (c >= ready) { out.push(c); ready = c + cd; }
  return out;
}
// The order of play in a cycle with your party (resolveCycle, GAME_RULES.md "Daemons"): what goes before you as a
// fight starts (cycle 1: an Airbag), your command, the cooldown daemons that act this cycle in
// party order (runDaemons walks your slots in order), burns and helpers, then the virus. armed: the triggered ones,
// which act whenever their moment comes, in any step.
export function playOrder(s, cycle) {
  const party = slottedDaemons(s), on = (id) => DAEMONS[id].on;
  return {
    start: cycle === 1 ? party.filter((id) => on(id) === 'start') : [],
    daemons: party.filter((id) => daemonCycles(id, cycle).includes(cycle)),
    armed: party.filter((id) => !DAEMONS[id].cd && on(id) !== 'start'),
  };
}

// ---------- in a fight ----------
const lastTarget = (s) => { const t = s.encounter.lastAttack && part(s, s.encounter.lastAttack.split(' ')[1]); return alive(t) ? t : null; };
const say = (s, id, text) => emit(s, 'resolved', `${DAEMONS[id].name}: ${text}.`, { auto: 'daemon', daemon: id });
const strikeAt = (s, id, t, n = daemonAmount(s, id), opts = {}) => (alive(t) ? hit(s, t, n, { by: DAEMONS[id].name, src: 'daemon', ...opts }) : null);
const shield = (s, id, n = daemonAmount(s, id)) => { const e = s.encounter; e.shield = (e.shield || 0) + n; emit(s, 'status', `${DAEMONS[id].name} raises your shield to ${e.shield}.`, { auto: 'daemon', daemon: id, mark: 'shield' }); };
const armored = (s) => livingParts(s).filter((p) => p.armor > 0).sort((a, b) => b.armor - a.armor);
// The part closest to crossing its next unspent tick (interrupt.mjs), or the soonest attacker.
function nearTick(s) {
  let best = null, gap = Infinity;
  for (const p of livingParts(s)) for (const t of p.ticks || []) {
    const g = p.integrity - t.at * p.max;
    if (!t.spent && g > 0 && g < gap) { gap = g; best = p; }
  }
  return best || soonestAttacker(s);
}
// What a cooldown daemon does. False when it had nothing to do (it tries again next cycle).
const ACT = {
  sweeper: (s, id) => { const t = soonestAttacker(s); if (!t) return false; say(s, id, `hits ${t.name}`); strikeAt(s, id, t); },
  mirror: (s, id) => { const t = lastTarget(s); if (!t) return false; say(s, id, `echoes you on ${t.name}`); strikeAt(s, id, t); },
  spider: (s, id) => { const t = lastTarget(s) || soonestAttacker(s); if (!t) return false; say(s, id, `bites ${t.name}`); s.encounter.burns.push({ id: 'spider', target: t.id, damage: daemonAmount(s, id), grow: 0, left: 3, name: DAEMONS[id].name, drain: 0 }); },
  mender: (s, id) => { const d = defender(s); if (d.integrity >= d.max) return false; say(s, id, 'patches you'); heal(s, daemonAmount(s, id), DAEMONS[id].name); },
  fuzzer: (s, id) => { const a = armored(s)[0], t = a || soonestAttacker(s); if (!t) return false; say(s, id, `fuzzes ${t.name}`); strikeAt(s, id, t, a ? 1 : daemonAmount(s, id)); },
  stall: (s, id) => { const t = soonestAttacker(s); if (!t?.attack) return false; say(s, id, delayAttack(s, t, 1) ? `stalls ${t.name}` : `hits ${t.name}`); strikeAt(s, id, t); },
  cron: (s, id) => { const t = livingParts(s).find((q) => q.kind === 'system' && telling(s, q)) || soonestAttacker(s); if (!t) return false; say(s, id, `runs on ${t.name}`); strikeAt(s, id, t); },
  nudge: (s, id) => { const t = nearTick(s); if (!t) return false; say(s, id, `nudges ${t.name}`); strikeAt(s, id, t); },
  drain: (s, id) => { const t = soonestAttacker(s); if (!t) return false; say(s, id, `drains ${t.name}`); const r = strikeAt(s, id, t); if (r?.dealt) heal(s, Math.max(1, Math.round(r.dealt / 2)), DAEMONS[id].name); },
  kindle: (s, id) => { const hot = livingParts(s).filter((p) => s.encounter.burns.some((b) => b.target === p.id)); if (!hot.length) return false; say(s, id, `fans the burns on ${hot.map((p) => p.name).join(' and ')}`); for (const p of hot) strikeAt(s, id, p); },
  flare: (s, id) => { const t = soonestAttacker(s); if (!t) return false; say(s, id, `exposes ${t.name}`); t.exposedUntil = Math.max(t.exposedUntil || 0, s.encounter.cycle + CONFIG.exposedCycles); strikeAt(s, id, t); },
  capacitor: (s, id) => shield(s, id),
  drill: (s, id) => { const t = armored(s)[0] || soonestAttacker(s); if (!t) return false; say(s, id, `drills ${t.name}`); strikeAt(s, id, t, daemonAmount(s, id), { pierce: true }); },
  leash: (s, id) => { const t = soonestAttacker(s); if (!t) return false; say(s, id, `drags on ${t.name}`); strikeAt(s, id, t); },
  sieve: (s, id) => { const fr = livingParts(s).filter((p) => p.kind === 'fragment'); if (!fr.length) return false; say(s, id, `sifts ${fr.length === 1 ? 'a fragment' : `${fr.length} fragments`}`); for (const p of fr) strikeAt(s, id, p); },
  overseer: (s, id) => { const t = soonestAttacker(s); if (!t) return false; say(s, id, `hits ${t.name}`); strikeAt(s, id, t); },
  broadcast: (s, id) => { say(s, id, 'hits every part'); for (const p of livingParts(s)) strikeAt(s, id, p); },
  void: (s, id) => { const t = soonestAttacker(s); if (!t?.attack) return false; say(s, id, delayAttack(s, t, Math.max(1, t.attack.interval || 1)) ? `pushes ${t.attack.name} back` : `hits ${t.name}`); strikeAt(s, id, t); },
  sledge: (s, id) => { say(s, id, 'hammers every part'); for (const p of livingParts(s)) strikeAt(s, id, p, p.armor > 0 ? 1 : daemonAmount(s, id)); },
  hotspare: (s, id) => { const d = defender(s); if (d.integrity < d.max) { say(s, id, 'patches you'); heal(s, daemonAmount(s, id), DAEMONS[id].name); } else shield(s, id); },
  tandem: (s, id) => { const a = soonestAttacker(s), b = lastTarget(s); if (!a && !b) return false; say(s, id, 'strikes twice'); strikeAt(s, id, a); strikeAt(s, id, b); },
};
// What a triggered daemon does. self: a shield or a heal, at once; the rest wait for flushDaemons.
const ON = {
  airbag: { self: true, go: (s, id) => shield(s, id) },
  canary: { self: true, go: (s, id) => shield(s, id) },
  snapshot: { self: true, go: (s, id) => heal(s, Math.max(1, Math.round((defender(s).max * daemonAmount(s, id)) / 100)), 'Snapshot restored') },
  checkpoint: { self: true, go: (s, id) => heal(s, daemonAmount(s, id), 'Checkpoint restored') },
  wiretap: { self: true, go: (s, id) => shield(s, id) },
  rod: { self: true, go: (s, id) => shield(s, id) },
  watchman: { go: (s, id, x) => { const t = part(s, x.part); if (!alive(t)) return false; strikeAt(s, id, t); } }, // combat.mjs watchman: the delay, then this hit
  spite: { go: (s, id, x) => { const t = part(s, x.source); if (!alive(t)) return false; say(s, id, `bites back at ${t.name}`); strikeAt(s, id, t); } },
  breakpoint: { go: (s, id, x) => { const t = part(s, x.part); if (!alive(t)) return false; say(s, id, `lands on ${t.name}`); strikeAt(s, id, t); } },
  guillotine: { go: (s, id, x) => { const ts = livingParts(s).filter((p) => p.id !== x.part); if (!ts.length) return false; say(s, id, 'cuts through the rest'); for (const p of ts) strikeAt(s, id, p); } },
  crowbar: { go: (s, id, x) => { const t = part(s, x.part); if (!alive(t)) return false; say(s, id, `pries at ${t.name}`); strikeAt(s, id, t); } },
  backscatter: { cycle: true, go: (s, id, x) => { const t = part(s, x.source); if (!alive(t)) return false; say(s, id, `scatters back at ${t.name}`); strikeAt(s, id, t); } },
  afterburn: { go: (s, id, x) => { const t = part(s, x.part); if (!alive(t)) return false; say(s, id, `flares on ${t.name}`); strikeAt(s, id, t); } },
  lookout: { go: (s, id, x) => { const t = part(s, x.part); if (!alive(t)) return false; say(s, id, `spots ${t.name}`); strikeAt(s, id, t); } },
  ricochet: { cycle: true, go: (s, id, x) => { const t = soonestAttacker(s, x.part); if (!alive(t) || t.id === x.part) return false; say(s, id, `bounces to ${t.name}`); strikeAt(s, id, t); } },
  domino: { go: (s, id) => { const t = soonestAttacker(s); if (!alive(t)) return false; say(s, id, `knocks into ${t.name}`); strikeAt(s, id, t); } },
  reaper: { go: (s, id, x) => { const t = part(s, x.part); if (!alive(t)) return false; say(s, id, `reaps ${t.name}`); strikeAt(s, id, t); } },
  pendulum: { go: (s, id, x) => { const t = part(s, x.part) || lastTarget(s); if (!alive(t)) return false; say(s, id, `swings at ${t.name}`); strikeAt(s, id, t); } },
};
// Run fn as a daemon: what it does sets off no daemon; true if it acted.
function asDaemon(s, fn) {
  const e = s.encounter, was = e.inDaemon;
  e.inDaemon = true;
  try { return fn() !== false; } finally { e.inDaemon = was; }
}
// After your order: every slotted cooldown daemon that's ready acts.
export function runDaemons(s) {
  const e = s.encounter;
  e.daemonReady ||= {};
  flushDaemons(s);
  for (const id of slottedDaemons(s)) {
    const d = DAEMONS[id];
    if (!d.cd || !ACT[id] || !active(s) || virusIntegrity(s).current === 0 || daemonNext(s, id) > e.cycle) continue;
    if (d.exfil && !e.escapeAt) continue; // the Leash only works on an Exfil
    if (!asDaemon(s, () => ACT[id](s, id))) continue;
    e.daemonReady[id] = e.cycle + d.cd;
    e.metrics.daemon = (e.metrics.daemon || 0) + 1;
  }
}
// Something happened (see data.mjs DAEMONS `on`). x: what it happened to ({ part, source }).
export function daemonsOn(s, what, x = {}) {
  const e = s.encounter;
  if (!e || e.inDaemon || e.phase !== 'active') return;
  if (what === 'start') return fightStart(s);
  for (const id of slottedDaemons(s)) {
    const d = DAEMONS[id], h = ON[id];
    if (d.on !== what || !h) continue;
    e.once ||= {};
    if (d.once && e.once['dmn-' + id]) continue;
    if (h.cycle && e.once['dmn-' + id] === e.cycle) continue; // once a cycle
    e.once['dmn-' + id] = d.once ? true : e.cycle;
    if (h.self) { asDaemon(s, () => h.go(s, id, x)); e.metrics.daemon = (e.metrics.daemon || 0) + 1; }
    else (e.daemonQueue ||= []).push({ id, x });
  }
}
// The hits triggered daemons owe: they land now, between steps of the cycle.
export function flushDaemons(s) {
  const e = s.encounter;
  if (!e?.daemonQueue?.length) return;
  const q = e.daemonQueue;
  e.daemonQueue = [];
  for (const { id, x } of q) {
    if (!active(s) || virusIntegrity(s).current === 0) break;
    if (asDaemon(s, () => ON[id].go(s, id, x))) e.metrics.daemon = (e.metrics.daemon || 0) + 1;
  }
}
// As the fight starts: the Airbag, and the Leash on an Exfil's upload.
function fightStart(s) {
  const e = s.encounter, on = slottedDaemons(s);
  if (on.includes('airbag')) asDaemon(s, () => ON.airbag.go(s, 'airbag'));
  if (on.includes('leash') && e.escapeAt) { e.escapeAt += 1; emit(s, 'status', `Leash: the upload takes a cycle longer (${e.escapeAt} cycles).`, { auto: 'daemon', daemon: 'leash' }); }
}
// Your health after a hit (combat.mjs takeDamage): below half, below a quarter. source: the part that hit you.
export function daemonsHurt(s, source) {
  const d = defender(s);
  if (d.integrity <= 0) return;
  if (d.integrity < d.max / 2) daemonsOn(s, 'half', { source });
  if (d.integrity < d.max / 4) daemonsOn(s, 'quarter', { source });
}
// Lifeline (combat.mjs survive): the first hit that would take you to 0 leaves you at 1. Returns the damage to take.
export function lifeline(s, d, dmg) {
  const e = s.encounter;
  if (d.integrity - dmg > 0 || d.integrity <= 1 || !slottedDaemons(s).includes('lifeline') || e.once['dmn-lifeline']) return null;
  e.once['dmn-lifeline'] = true;
  e.lifelineDue = true; // it heals once the hit is in (takeDamage)
  say(s, 'lifeline', 'holds you at 1');
  return d.integrity - 1;
}
export function lifelineHeal(s) {
  const e = s.encounter;
  if (!e.lifelineDue) return;
  e.lifelineDue = false;
  heal(s, daemonAmount(s, 'lifeline'), 'Lifeline');
}

// ---------- finding them ----------
// An invasion's drop at a level: a daemon of its band (now and then an earlier band's), at that level.
export function rollDaemon(s, level, r = () => rand(s)) {
  const band = daemonBand(level), early = band > 1 && r() < DAEMON_DROP.earlier;
  const pool = bandDaemons(early ? 1 + Math.floor(r() * (band - 1)) : band);
  return pool[Math.floor(r() * pool.length)];
}
// A daemon at a level: new, better than yours (yours scraps for code), or no better (it scraps). family: whose code
// the scrap pays (the invader's; Cipher when there's none). Returns 'new', 'better' or 'scrap'.
export function gainDaemon(s, id, level, { why = '', family = null } = {}) {
  if (!DAEMONS[id]) return null;
  const L = Math.max(1, Math.round(level)), had = daemonLevel(s, id), code = codeOf(family) || 'cipher', d = DAEMONS[id];
  const scrap = (lv) => gainCode(s, { [code]: codeUnit(lv) }, `${d.name} lv ${lv} scrapped: `);
  if (had >= L) { emit(s, 'drop', `${why}${d.name} lv ${L}, no better than yours (lv ${had}).`, { daemon: id, level: L, scrap: true }); scrap(L); return 'scrap'; }
  ownedOf(s)[id] = L;
  emit(s, 'drop', `${why}${d.name} lv ${L}${had ? `, better than yours (lv ${had})` : ''}. ${daemonText(id, L)}`, { daemon: id, level: L });
  if (had) { scrap(had); return 'better'; }
  return 'new';
}
// Copies of the old (versioned) daemons, and a running Cron Job or Snapshot service: a version becomes a level near
// yours (v3 your level, v2 two under, v1 four under).
export const versionLevel = (s, v) => Math.max(1, serverLevel(s) - 2 * (3 - Math.min(3, Math.max(1, v || 1))));

// ---------- commands ----------
const idOf = (arg) => arg && Object.keys(DAEMONS).find((k) => k === arg || DAEMONS[k].name.toLowerCase().replace(/ /g, '') === arg.replace(/[- ]/g, ''));
export function daemonCommand(s, text) {
  const [, word, arg] = text.match(/^daemons?(?: (\w+))?(?: (.+))?$/) || [];
  if (word === 'swap') return daemonSwap(s, arg?.trim().toLowerCase() || '');
  const id = idOf(arg?.trim().toLowerCase());
  if (!word || word === 'list') return emit(s, 'info', `Daemons (${slottedDaemons(s).length}/${daemonSlots(s)} slotted): ${Object.keys(ownedOf(s)).filter((k) => daemonLevel(s, k)).map((k) => `${DAEMONS[k].name} lv ${daemonLevel(s, k)}${slottedDaemons(s).includes(k) ? ' (slotted)' : ''}`).join(', ') || 'none found yet. Invasions drop them'}.`);
  if (active(s)) return warn(s, 'Change daemons between fights.');
  if (!id || !daemonLevel(s, id)) return warn(s, arg ? `You don't have a daemon called ${arg}.` : USAGE);
  if (word === 'slot') {
    if (slottedDaemons(s).includes(id)) return warn(s, `${DAEMONS[id].name} is already slotted.`);
    if (slottedDaemons(s).length >= daemonSlots(s)) return warn(s, `All ${daemonSlots(s)} daemon slots are full. Unslot one first.`);
    s.daemons = [...slottedDaemons(s), id];
    return emit(s, 'daemon-set', `${DAEMONS[id].name} slotted.`);
  }
  if (word === 'unslot') { s.daemons = slottedDaemons(s).filter((k) => k !== id); return emit(s, 'daemon-set', `${DAEMONS[id].name} unslotted.`); }
  return warn(s, USAGE);
}

const USAGE = 'daemon slot <name> · daemon unslot <name> · daemon swap <slotted> <other>.';
// daemon swap <a> <b>: the slotted one of the two goes out and the other takes its place in the party, in either
// order. Names of two words work too (daemon swap cron job drill): every split of the words is tried.
function daemonSwap(s, arg) {
  if (active(s)) return warn(s, 'Change daemons between fights.');
  const words = arg.split(/\s+/).filter(Boolean);
  let pair = null;
  for (let i = 1; i < words.length && !pair; i++) { const a = idOf(words.slice(0, i).join(' ')), b = idOf(words.slice(i).join(' ')); if (a && b) pair = [a, b]; }
  if (!pair) return warn(s, 'daemon swap <slotted> <other>: two daemons, one of them slotted.');
  const party = slottedDaemons(s), [a, b] = pair, out = party.includes(a) ? a : party.includes(b) ? b : null, into = out === a ? b : a;
  if (!out) return warn(s, `Neither ${DAEMONS[a].name} nor ${DAEMONS[b].name} is slotted.`);
  if (out === into || party.includes(into)) return warn(s, `${DAEMONS[into].name} is already slotted.`);
  if (!daemonLevel(s, into)) return warn(s, `You don't have a daemon called ${DAEMONS[into].name}.`);
  s.daemons = party.map((k) => (k === out ? into : k));
  return emit(s, 'daemon-set', `${DAEMONS[into].name} slotted in place of ${DAEMONS[out].name}.`);
}

// ---------- old saves ----------
// Daemons were versions (v1–v3) and came from vaults, guards, kills, contracts and shops. Each one you had becomes
// that daemon at a level from its version and your level; slots follow the new rule (2, +1 at 15, 30 and 45).
export function daemonRestore(s) {
  const old = s.daemonsOwned;
  if (old && typeof old === 'object') {
    const got = [];
    for (const [id, v] of Object.entries(old)) {
      if (!DAEMONS[id] || !(v > 0)) continue;
      const L = versionLevel(s, v);
      if (L > daemonLevel(s, id)) ownedOf(s)[id] = L;
      got.push(`${DAEMONS[id].name} v${v} is lv ${daemonLevel(s, id)}`);
    }
    delete s.daemonsOwned;
    if (got.length) emit(s, 'info', `Daemons have levels now, not versions: ${got.join(', ')}.`);
  }
  ownedOf(s);
  s.daemons = [...new Set((s.daemons || []).filter((id) => typeof id === 'string' && DAEMONS[id]))];
}
export { daemonWhen, DAEMON_BANDS };

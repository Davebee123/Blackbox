// Hubs you hold (taken with a Backdoor, payload.mjs), and what their old owners do about it.
//
// A hub you hold: its market trades at its true price (no spread), its shop sells at cost with
// no tier locks, and it earns you a cut of its trade over real time (offline too), more while
// what it deals in is in demand. Collect it from the hub page. Never Halcyon's; two at most.
//
// Retaliation: while its owner is Hostile, it sends retake swarms at the hub, one at a time. They
// gather and travel on real time (logging off doesn't dodge them), but the siege only runs while
// you're logged on: you're never locked down while away. A hub earns nothing while a retake is
// out for it (on the way, waiting at the hub, or a fight against it left open). Intercept or
// defend, a process a fight. If the siege runs out, the hub goes into lockdown: its income stops
// until you clear it. You never lose it for good. A Hostile faction you strike without losing a hub answers once with a swarm at one
// of your outposts.
import { CONFIG, variantFor } from './data.mjs';
import { emit, warn, rand, active, holding, selectEncounter, command, gainXp, xpFor, gainCode, hackerLevel, hooks } from './combat.mjs';
import { FACTIONS, rep, REP_TIERS, captured, donate } from './factions.mjs';
import { CONDITIONS, HUB_CONDITION, outsideMult } from './market.mjs';
import { codeOf, codeDrop } from './gear.mjs';
import { launch, fleetOf } from './fleet.mjs';
import { outposts } from './outpost.mjs';

const now = () => hooks.now?.() ?? Date.now();

export const HUBS = {
  income: (hubLevel) => 10 + 3 * hubLevel, // credits an hour at normal demand
  bankHours: 24, // it holds this much uncollected
  firstMs: 30 * 60000, // logged-on time after a capture before the first retake
  everyMs: [2 * 3600000, 4 * 3600000], // between retakes
  travelMs: 10 * 60000, siegeMs: 8 * 60000, ships: 3, levelUp: 1,
  grudgeMs: 12 * 3600000, // a strike a Hostile faction still answers
};
// Each faction's crews write their own kind of virus.
export const FACTION_FAMILY = { halcyon: 'worm', glassjaw: 'ghostroot', kestrel: 'worm', lantern: 'worm', nullchoir: 'ransomware' };
const KEY = { ransomware: 'cryptjack', worm: 'splinter', ghostroot: 'ghostroot' };

const hub = (s, f) => s.hubs?.[f];
export const heldOf = (s) => Object.keys(s.hubs || {}).filter((f) => captured(s, f));
export const angry = (s, f) => rep(s, f) < REP_TIERS[1];
export const lockedDown = (s, f) => !!hub(s, f)?.captured?.lockdown;
export const retakeOf = (s) => s.retake || null;

// What the hub's market is doing for you: how hot what it deals in is right now (1 = normal).
// Outside factors only: your own trading there doesn't move its income.
export function demandOf(s, f) {
  const wants = Object.entries(CONDITIONS[HUB_CONDITION[f]].mult).filter(([, x]) => x > 1).map(([w]) => w);
  return wants.length ? Math.max(...wants.map((w) => outsideMult(s, f, w))) : 1;
}
export const incomeOf = (s, f) => Math.round(HUBS.income(FACTIONS[f].hub.level) * demandOf(s, f));
export function bankOf(s, f) {
  const c = hub(s, f)?.captured; if (!c) return 0;
  return Math.floor(c.bank || 0);
}

// Real time (from the service tick): held hubs earn.
export function tickHubs(s, at = now()) {
  for (const f of heldOf(s)) {
    const c = hub(s, f).captured;
    const hours = Math.max(0, at - (c.bankAt ?? at)) / 3600000;
    c.bankAt = at;
    if (c.lockdown || s.retake?.f === f || !hours) continue; // nothing while it's locked down or under attack
    c.bank = Math.min(HUBS.bankHours * incomeOf(s, f), (c.bank || 0) + incomeOf(s, f) * hours);
  }
}
export function collect(s, f) {
  if (!captured(s, f)) return warn(s, 'That hub isn’t yours.');
  const n = bankOf(s, f);
  if (!n) return warn(s, `Nothing to collect at ${FACTIONS[f].hub.name} yet.`);
  hub(s, f).captured.bank -= n;
  s.server.credits += n;
  emit(s, 'hub-paid', `Collected ${n} credits from ${FACTIONS[f].hub.name}.`, { faction: f });
}

// ---------- retaliation (logged-on time, from tickNetwork) ----------
export const retakeLeft = (s, at = now()) => { const r = s.retake; return !r ? 0 : r.state === 'travel' ? Math.max(0, r.arriveAt - at) : r.siegeLeft; };
function sendRetake(s, f, at) {
  const L = Math.min(CONFIG.maxMobLevel, Math.max(FACTIONS[f].hub.level, hackerLevel(s)) + HUBS.levelUp), family = FACTION_FAMILY[f];
  s.retakeSeq = (s.retakeSeq || 0) + 1;
  s.retake = { id: 'rt' + s.retakeSeq, f, family, key: KEY[family], level: L, ships: HUBS.ships, total: HUBS.ships, state: 'travel', arriveAt: at + HUBS.travelMs, travel: HUBS.travelMs, siegeLeft: HUBS.siegeMs, seed: (Math.floor(rand(s) * 2 ** 31) >>> 0) || 1 };
  emit(s, 'hub-retake', `Swarm from ${FACTIONS[f].short} at ${FACTIONS[f].hub.name}: ${HUBS.ships} processes (level ${L}), arriving in ${Math.round(HUBS.travelMs / 60000)} minutes.`, { faction: f });
}
export function tickRetake(s, dt, paused = false, at = now()) {
  const net = (s.net ||= {});
  // A Hostile faction answers a fresh strike once, at one of your outposts (as an ordinary swarm, in its colours).
  for (const f of Object.keys(s.hubs || {})) {
    const h = s.hubs[f];
    if (!h.grudgeAt || h.grudgeAt <= (h.grudgeSent || 0) || captured(s, f) || heldOf(s).length) continue;
    if (!angry(s, f) || at - h.grudgeAt > HUBS.grudgeMs) { h.grudgeSent = h.grudgeAt; continue; }
    if (paused || fleetOf(s) || !outposts(s).some((l) => !l.outpost.lockdown)) continue;
    h.grudgeSent = h.grudgeAt;
    launch(s, at, f);
  }
  const r = s.retake;
  if (!r) {
    const targets = heldOf(s).filter((f) => angry(s, f) && !lockedDown(s, f));
    if (!targets.length) { net.retakeAt = null; return; }
    // Real time: the next one gathers whether you're logged on or not.
    if (net.retakeAt == null) { const [lo, hi] = HUBS.everyMs; net.retakeAt = at + (net.retakeSent ? Math.round(lo + rand(s) * (hi - lo)) : HUBS.firstMs); }
    if (at < net.retakeAt) return;
    net.retakeAt = null; net.retakeSent = true;
    return sendRetake(s, targets[Math.floor(rand(s) * targets.length)], at);
  }
  if (!captured(s, r.f) || lockedDown(s, r.f)) { s.retake = null; return; }
  if (r.state === 'travel') {
    if (r.arriveAt == null) r.arriveAt = at + (r.left || 0); // a save from before real-time retakes
    if (at >= r.arriveAt) { r.state = 'siege'; emit(s, 'hub-siege', `Swarm from ${FACTIONS[r.f].short} at ${FACTIONS[r.f].hub.name}: ${r.ships} left. Defend within ${Math.round(HUBS.siegeMs / 60000)} minutes of play or it goes into lockdown.`, { faction: r.f }); }
    return;
  }
  // The siege: logged-on time only, and it waits while you fight.
  if (paused || dt <= 0 || holding(s, 'retake', r.id)) return;
  r.siegeLeft -= dt;
  if (r.siegeLeft <= 0) {
    s.retake = null;
    hub(s, r.f).captured.lockdown = { level: r.level, family: r.family, seed: r.seed };
    emit(s, 'hub-lockdown', `LOCKDOWN: ${FACTIONS[r.f].short} locked ${FACTIONS[r.f].hub.name} down. It earns nothing until you retake it.`, { faction: r.f });
  }
}

// One fight: the next retake process, or the lockdown's holder.
function fight(s, f, spec, tag, verb) {
  if (s.run) return warn(s, 'Jack out first.');
  if (active(s)) return warn(s, 'Finish the fight first.');
  const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
  const seed = (spec.seed + (spec.ships || 0) * 7919) >>> 0;
  const { strain, grade } = variantFor(spec.family, spec.level, 2, seed);
  selectEncounter(s, KEY[spec.family], seed, { level: spec.level, strain, grade, quiet: true });
  if (!s.encounter || s.encounter.phase === 'active') return;
  s.gate = gate && gate !== s.encounter ? gate : null;
  Object.assign(s.encounter, tag);
  emit(s, 'jack-in', `${verb}: ${s.encounter.virus.name} at ${FACTIONS[f].hub.name}.`, { faction: f });
  command(s, 'engage');
}
export function defend(s, f) {
  const r = s.retake;
  if (!r || r.f !== f) return warn(s, `Nobody is coming for ${FACTIONS[f]?.hub.name || 'that hub'}.`);
  fight(s, f, r, { retake: r.id }, r.state === 'travel' ? 'Intercepting' : 'Defending');
}
export function clear(s, f) {
  const d = hub(s, f)?.captured?.lockdown;
  if (!d) return warn(s, 'That hub isn’t in lockdown.');
  fight(s, f, d, { hubClear: f }, 'Retaking it');
}
// From finish() when a hub fight is won.
export function hubWon(s, e) {
  if (e.hubClear) {
    const c = hub(s, e.hubClear)?.captured; if (!c?.lockdown) return;
    c.lockdown = null; c.bankAt = now();
    gainXp(s, xpFor(s, e.virus?.level || hackerLevel(s), 1), 'lockdown cleared');
    return emit(s, 'hub-held', `${FACTIONS[e.hubClear].hub.name} is yours again.`, { faction: e.hubClear });
  }
  const r = s.retake;
  if (!r || e.retake !== r.id) return;
  r.ships--;
  if (r.ships > 0) return emit(s, 'hub-hit', `Process killed. ${r.ships} left${r.state === 'siege' ? ` (${Math.ceil(r.siegeLeft / 60000)} min left to defend)` : ''}.`, { faction: r.f });
  s.retake = null;
  const k = codeOf(r.family);
  if (k) gainCode(s, { [k]: r.total * codeDrop(r.level) * 2 }, 'Swarm broken: ');
  for (let i = 0; i < r.total; i++) s.salvage.push({ name: `${FACTIONS[r.f].short} process`, virus: 'retake', seed: r.seed + i });
  gainXp(s, xpFor(s, r.level, r.total * 0.5), 'swarm broken');
  emit(s, 'hub-held', `SWARM BROKEN. ${FACTIONS[r.f].hub.name} holds: +${r.total} salvage.`, { faction: r.f });
}

export function hubCommand(s, text) {
  const [, verb, f] = text.split(' ');
  if (!FACTIONS[f]) return warn(s, 'hub collect|defend|retake|donate <faction>');
  if (verb === 'collect') return collect(s, f);
  if (verb === 'defend') return defend(s, f);
  if (verb === 'retake' || verb === 'clear') return clear(s, f);
  if (verb === 'donate') return donate(s, f);
  return warn(s, 'hub collect|defend|retake|donate <faction>');
}

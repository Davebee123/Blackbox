// Swarms (internally "fleets"): a hub's old owner wants it back (hubs.mjs). Outposts' swarms and natives went with
// outposts in R2 (GAME_RULES.md "Sockets and programs": programs have nothing to steal and nothing to defend), so a swarm only ever
// comes for a hub you hold.
//
// It gathers and travels on real time (logging off doesn't dodge it), then meets the hub's firewall (firewall.mjs):
// blocked, it bounces; contested, the firewall kills a process now and then; a breach just runs the timer. Intercept it
// on the way or defend when it arrives: each fight kills one process. Break the whole swarm for a haul. Still there
// when its siege runs out, the hub goes into lockdown until you retake it (hubs.mjs).
import { CONFIG, FAMILIES, variantFor } from './data.mjs';
import { emit, warn, rand, active, holding, selectEncounter, command, gainXp, xpFor, gainCode, hooks } from './combat.mjs';
import { codeOf, codeDrop } from './gear.mjs';
import { FACTIONS, captured } from './factions.mjs';
import { ratingAt } from './firewall.mjs';
import { strength, outcome, grindRate } from './invasion.mjs';
import { HUBS, FACTION_FAMILY, hubWall, lockedDown } from './hubs.mjs';
import { gainComponents } from './salvage.mjs';

export const FLEET = {};
const SHIP = { ransomware: 'cryptjack', worm: 'splinter', ghostroot: 'ghostroot', cryptominer: 'xmrig', wiper: 'shamoon' };
export const fleetOf = (s) => s.fleet || null;
const clock = () => hooks.now?.() ?? Date.now();

// A hub's old owner sends a swarm at it, at its level + 1 (never yours). opts.hub: the faction. One at a time.
export function launch(s, at = clock(), faction = null, opts = {}) {
  if (s.fleet || !opts.hub) return null;
  const f = opts.hub, H = FACTIONS[f].hub, family = FACTION_FAMILY[f], level = Math.min(CONFIG.maxMobLevel, H.level + HUBS.levelUp);
  s.fleetSeq = (s.fleetSeq || 0) + 1;
  s.fleet = { id: 'fl' + s.fleetSeq, hub: f, faction: f, family, key: SHIP[family], level, ships: HUBS.ships, total: HUBS.ships, target: null, fromName: FACTIONS[f].short, from: null, hidden: null, state: 'travel', arriveAt: at + HUBS.travelMs, travel: HUBS.travelMs, siegeLeft: HUBS.siegeMs, seed: (Math.floor(rand(s) * 2 ** 31) >>> 0) || 1, mutation: null };
  emit(s, 'hub-retake', `SWARM from ${FACTIONS[f].short} at ${H.name}: ${HUBS.ships} viruses (level ${level}), arriving in ${Math.round(HUBS.travelMs / 60000)} minutes.`, { faction: f });
  return s.fleet;
}
export const fleetLeft = (s, at = clock()) => { const f = s.fleet; return !f ? 0 : f.state === 'travel' ? Math.max(0, (f.arriveAt ?? at + (f.left || 0)) - at) : f.siegeLeft; };

// Called from tickNetwork: real time (at) to travel, logged-on time (dt) for the siege. Degraded mode pauses it.
export function tickFleet(s, dt, paused = false, at = clock()) {
  if (paused) return;
  const f = s.fleet;
  if (!f) return;
  if (!f.hub) { s.fleet = null; return; } // an outpost's swarm from an older save: nothing to land on
  const ok = captured(s, f.hub) && !lockedDown(s, f.hub), name = FACTIONS[f.hub].hub.name, where = { faction: f.hub }, holder = hubWall(s, f.hub);
  if (!ok) return disband(s, 'Its target is already in lockdown: the swarm scatters.');
  const ratio = () => ratingAt(s, holder, f.family) / strength(f.level, null);
  if (f.state === 'travel') {
    if (f.arriveAt == null) f.arriveAt = at + (f.left || 0);
    if (at >= f.arriveAt) {
      const o = outcome(ratio());
      if (o === 'blocked') return disband(s, `The swarm bounced off ${name}'s firewall.`);
      f.state = 'siege';
      emit(s, 'hub-siege', `Swarm from ${FACTIONS[f.faction].short} at ${name}: ${f.ships} left, ${o === 'siege' ? 'contested by its firewall' : 'BREACHING its firewall'}. Defend within ${Math.round(f.siegeLeft / 60000)} minutes or it goes into lockdown.`, where);
    }
    return;
  }
  if (dt <= 0 || holding(s, 'fleet', f.id)) return; // the siege waits while you fight (not while the fight is paused)
  const r = ratio(), oc = outcome(r);
  if (oc === 'blocked') return disband(s, `${name}'s firewall turned the swarm back.`);
  if (oc === 'siege') {
    f.grind = (f.grind || 0) + (grindRate(r) / 100) * (dt / 60000);
    while (f.grind >= 1 && f.ships > 0) { f.grind -= 1; f.ships--; emit(s, 'hub-hit', `${name}'s firewall killed a virus. ${f.ships} left in the swarm.`, where); }
    if (f.ships <= 0) return disband(s, `${name}'s firewall wore the swarm down.`);
  }
  f.siegeLeft -= dt;
  if (f.siegeLeft <= 0) {
    s.fleet = null;
    s.hubs[f.hub].captured.lockdown = { level: f.level, family: f.family, seed: f.seed };
    emit(s, 'hub-lockdown', `LOCKDOWN: ${FACTIONS[f.hub].short} locked ${name} down. It earns nothing until you retake it.`, where);
  }
}
function disband(s, why) {
  s.fleet = null;
  if (why) emit(s, 'info', why);
}

// swarm engage (or fleet engage): fight the next process (intercept on the way, or defend at the hub).
export function fleetCommand(s, text) {
  const f = s.fleet;
  if (!f) return warn(s, 'No swarm is out.');
  if (!/^(fleet|swarm) engage$/.test(text)) return warn(s, 'usage: swarm engage');
  if (s.run) return warn(s, 'Jack out first.');
  if (active(s)) return warn(s, 'Finish the fight first.');
  const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
  const { strain, grade } = variantFor(f.family, f.level, 2, (f.seed + f.ships * 7919) >>> 0, null);
  selectEncounter(s, f.key, (f.seed + f.ships * 7919) >>> 0, { level: f.level, mutation: f.mutation, strain, grade, quiet: true });
  if (!s.encounter || s.encounter.phase === 'active') return;
  s.gate = gate && gate !== s.encounter ? gate : null;
  s.encounter.fleet = f.id;
  emit(s, 'jack-in', `${f.state === 'travel' ? 'Intercepting' : 'Defending'}: ${s.encounter.virus.name}, virus ${f.total - f.ships + 1} of ${f.total}.`, { faction: f.hub });
  command(s, 'engage');
}

// Called from finish() when a swarm fight is won.
export function fleetWon(s, e) {
  const f = s.fleet;
  if (!f || e.fleet !== f.id) return;
  f.ships--;
  const where = { faction: f.hub };
  if (f.ships > 0) return emit(s, 'hub-hit', `Virus killed. ${f.ships} left in the swarm${f.state === 'siege' ? ` (${Math.ceil(f.siegeLeft / 60000)} min left to defend)` : ''}.`, where);
  s.fleet = null;
  // The haul: code from every process, a component a process, and a bonus kill's worth of XP.
  const k = codeOf(f.family);
  if (k) gainCode(s, { [k]: f.total * codeDrop(f.level) * 2 }, 'Swarm broken: ');
  gainComponents(s, f.total);
  gainXp(s, xpFor(s, f.level, f.total * 0.5), 'swarm broken', 'fight');
  emit(s, 'hub-held', `SWARM BROKEN. ${f.total} viruses killed: ${FACTIONS[f.hub].hub.name} holds: +${f.total} components.`, where);
}

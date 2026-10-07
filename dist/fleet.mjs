// Swarms (internally "fleets"): once you run outposts, the network organises against them.
//
// Every so often (real time: logging off doesn't dodge it) a swarm of 2–4 processes gathers on a server past one of your
// outposts, usually one you haven't found, and sets out for it. You see it coming: its size, its
// family, where it's headed and when it lands. Intercept it on the way or defend when it
// arrives: each fight kills one process. Break the whole swarm for a haul. If it's still there
// when its siege runs out, the outpost goes into lockdown (see outpost.mjs: retake it to end it sooner).
// Everything runs on real time, online or off. At the outpost it meets its firewall (firewall.mjs):
// blocked, it bounces; contested, the firewall kills a process now and then; a breach just runs
// the timer. The outpost produces nothing while the swarm sits at it.
import { CONFIG, SERVER, MUTATIONS, ROLLED_MUTATIONS, FAMILIES, variantFor } from './data.mjs';
import { emit, warn, rand, active, holding, selectEncounter, command, gainXp, xpFor, gainCode, hooks } from './combat.mjs';
import { codeOf, codeDrop } from './gear.mjs';
import { FACTIONS } from './factions.mjs';
import { outposts, fall, hasMod } from './outpost.mjs';
import { hiddenNodes } from './hidden.mjs';
import { ratingAt, fragment } from './firewall.mjs';
import { strength, outcome, grindRate } from './invasion.mjs';

export const FLEET = {
  firstMs: 45 * 60000, // logged-on time after your first outpost before the first fleet
  everyMs: [90 * 60000, 150 * 60000], // between fleets (half that with a Honeytoken out there)
  travelMs: 10 * 60000, // warning time (Tarpit Beacon: half again)
  siegeMs: 8 * 60000, // at the outpost, before it falls
  levelUp: 2, // processes come in a little above the outpost's level
};
const SHIP = { ransomware: 'cryptjack', worm: 'splinter', ghostroot: 'ghostroot' };
const locOf = (s, id) => s.locations.find((l) => l.id === id);
export const fleetOf = (s) => s.fleet || null;

// Where it comes from: an unknown server hanging off the target if there is one, else a found one.
function origin(s, target) {
  const hid = hiddenNodes(s).filter((n) => n.via === target.id);
  if (hid.length) { const n = hid[Math.floor(rand(s) * hid.length)]; return { family: n.family, name: `an unknown server past ${target.name}`, hidden: n.id }; }
  const found = s.locations.filter((l) => l !== target && !l.rogue);
  const l = found.length ? found[Math.floor(rand(s) * found.length)] : target;
  return { family: l.family, name: l.name, from: l.id };
}

const clock = () => hooks.now?.() ?? Date.now();
// The outpost's firewall against the swarm (each process at the swarm's level).
const swarmRatio = (s, target, f) => ratingAt(s, target, f.family) / strength(f.level, f.mutation);
export function launch(s, at = clock(), faction = null) {
  const targets = outposts(s).filter((l) => !l.outpost.lockdown && !l.outpost.siege);
  if (!targets.length) return null;
  const pool = targets.some((l) => hasMod(l, 'lure')) ? targets.filter((l) => hasMod(l, 'lure')) : targets; // a Honeytoken first
  const target = pool[Math.floor(rand(s) * pool.length)];
  const o = origin(s, target);
  const ships = Math.min(4, 2 + Math.floor(outposts(s).length / 2) + (rand(s) < 0.3 ? 1 : 0));
  const level = Math.min(CONFIG.maxMobLevel, (target.level || 1) + FLEET.levelUp);
  const total = Math.round(FLEET.travelMs * (hasMod(target, 'ids') ? 1.5 : 1));
  s.fleetSeq = (s.fleetSeq || 0) + 1;
  s.fleet = { id: 'fl' + s.fleetSeq, family: o.family, key: SHIP[o.family], level, ships, total: ships, target: target.id, fromName: o.name, from: o.from || null, hidden: o.hidden || null, state: 'travel', arriveAt: at + total, travel: total, siegeLeft: FLEET.siegeMs, seed: (Math.floor(rand(s) * 2 ** 31) >>> 0) || 1, mutation: rand(s) < SERVER.mutationChance(level) * 0.75 ? ROLLED_MUTATIONS[Math.floor(rand(s) * ROLLED_MUTATIONS.length)] : null };
  if (faction) s.fleet.faction = faction;
  const who = faction ? ` from ${FACTIONS[faction].short}` : '';
  emit(s, 'fleet', `SWARM: Swarm${who} at your outpost on ${target.name}: ${ships} ${FAMILIES[o.family].name.toLowerCase()} viruses (level ${level}), arriving in ${Math.round(total / 60000)} minutes.`, { location: target.id });
  return s.fleet;
}

function schedule(s, at, first = false) {
  const net = (s.net ||= {});
  const [lo, hi] = FLEET.everyMs;
  net.fleetAt = at + (first ? FLEET.firstMs : Math.round((lo + rand(s) * (hi - lo)) * (outposts(s).some((l) => hasMod(l, 'lure')) ? 0.5 : 1)));
}
export const fleetLeft = (s, at = clock()) => { const f = s.fleet; return !f ? 0 : f.state === 'travel' ? Math.max(0, (f.arriveAt ?? at + (f.left || 0)) - at) : f.siegeLeft; };

// Called from tickNetwork: real time (at) to gather and travel, logged-on time (dt) for the
// siege. Degraded mode pauses it.
export function tickFleet(s, dt, paused = false, at = clock()) {
  if (paused) return;
  const f = s.fleet;
  if (!f) {
    if (!outposts(s).some((l) => !l.outpost.lockdown)) return;
    const net = (s.net ||= {});
    if (net.fleetNext != null && net.fleetAt == null) { net.fleetAt = at + net.fleetNext; delete net.fleetNext; } // saves from before real-time swarms
    if (net.fleetAt == null) schedule(s, at, true);
    if (at >= net.fleetAt) { launch(s, at); schedule(s, at); }
    return;
  }
  const target = locOf(s, f.target);
  if (!target?.outpost?.h || target.outpost.lockdown) return disband(s, 'Its target is already in lockdown: the swarm scatters.');
  if (f.state === 'travel') {
    if (f.arriveAt == null) f.arriveAt = at + (f.left || 0); // saves from before real-time swarms
    if (at >= f.arriveAt) {
      const o = outcome(swarmRatio(s, target, f));
      fragment(s, o, target);
      if (o === 'blocked') return disband(s, `The swarm bounced off ${target.name}'s firewall.`);
      f.state = 'siege';
      emit(s, 'fleet-siege', `Swarm${f.faction ? ` from ${FACTIONS[f.faction].short}` : ''} at your outpost on ${target.name}: ${f.ships} left, ${o === 'siege' ? 'contested by its firewall' : 'BREACHING its firewall'}. Defend within ${Math.round(FLEET.siegeMs / 60000)} minutes or it goes into lockdown.`, { location: target.id });
    }
    return;
  }
  if (dt <= 0 || holding(s, 'fleet', f.id)) return; // the siege waits while you fight (not while the fight is paused)
  // The outpost's firewall at work: contested, it wears down a process at a time.
  const r = swarmRatio(s, target, f), oc = outcome(r);
  if (oc === 'blocked') return disband(s, `${target.name}'s firewall turned the swarm back.`);
  if (oc === 'siege') {
    f.grind = (f.grind || 0) + (grindRate(r) / 100) * (dt / 60000);
    while (f.grind >= 1 && f.ships > 0) { f.grind -= 1; f.ships--; emit(s, 'fleet-hit', `${target.name}'s firewall killed a virus. ${f.ships} left in the swarm.`, { location: target.id }); }
    if (f.ships <= 0) return disband(s, `${target.name}'s firewall wore the swarm down.`);
  }
  f.siegeLeft -= dt;
  if (f.siegeLeft <= 0) {
    s.fleet = null;
    target.outpost.siege = null;
    emit(s, 'info', `The swarm took ${target.name}.`);
    fall(s, target, true);
  }
}
const fighting = (s, f) => active(s) && s.encounter?.fleet === f.id;

function disband(s, why) {
  s.fleet = null;
  if (why) emit(s, 'info', why);
}

// swarm engage (or fleet engage): fight the next process (intercept on the way, or defend at the outpost).
export function fleetCommand(s, text) {
  const f = s.fleet;
  if (!f) return warn(s, 'No swarm is out.');
  if (!/^(fleet|swarm) engage$/.test(text)) return warn(s, 'usage: swarm engage');
  if (s.run) return warn(s, 'Jack out first.');
  if (active(s)) return warn(s, 'Finish the fight first.');
  const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
  // A swarm comes from past the outpost, so it's graded one layer deeper.
  const tgt = s.locations.find((l) => l.id === f.target);
  const { strain, grade } = variantFor(f.family, f.level, (tgt?.depth || 1) + 1, (f.seed + f.ships * 7919) >>> 0);
  selectEncounter(s, f.key, (f.seed + f.ships * 7919) >>> 0, { level: f.level, mutation: f.mutation, strain, grade, quiet: true });
  if (!s.encounter || s.encounter.phase === 'active') return;
  s.gate = gate && gate !== s.encounter ? gate : null;
  s.encounter.fleet = f.id;
  emit(s, 'jack-in', `${f.state === 'travel' ? 'Intercepting' : 'Defending'}: ${s.encounter.virus.name}, virus ${f.total - f.ships + 1} of ${f.total}.`, { location: f.target });
  command(s, 'engage');
}

// Called from finish() when a fleet fight is won.
export function fleetWon(s, e) {
  const f = s.fleet;
  if (!f || e.fleet !== f.id) return;
  f.ships--;
  if (f.ships > 0) return emit(s, 'fleet-hit', `Virus killed. ${f.ships} left in the swarm${f.state === 'siege' ? ` (${Math.ceil(f.siegeLeft / 60000)} min left to defend)` : ''}.`, { location: f.target });
  s.fleet = null;
  // The haul: code from every process, salvage, and a bonus kill's worth of XP.
  const k = codeOf(f.family);
  if (k) gainCode(s, { [k]: f.total * codeDrop(f.level) * 2 * (hasMod(locOf(s, f.target), 'lure') ? 2 : 1) }, 'Swarm broken: ');
  for (let i = 0; i < f.total; i++) s.salvage.push({ name: `${FAMILIES[f.family].name} core`, virus: 'fleet', seed: f.seed + i });
  const lure = hasMod(locOf(s, f.target), 'lure') ? 2 : 1; // a Honeytoken pays double
  gainXp(s, xpFor(s, f.level, f.total * 0.5 * lure), 'swarm broken', 'fight');
  emit(s, 'fleet-broken', `SWARM BROKEN. ${f.total} viruses killed: +${f.total} salvage.`, { location: f.target });
}

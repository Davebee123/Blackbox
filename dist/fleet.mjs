// Swarms (internally "fleets"): once you run outposts, the network organises against them.
//
// Every so often (logged-on time) a swarm of 2–4 processes gathers on a server past one of your
// outposts, usually one you haven't found, and sets out for it. You see it coming: its size, its
// family, where it's headed and when it lands. Intercept it on the way or defend when it
// arrives: each fight kills one process. Break the whole swarm for a haul. If it's still there
// when its siege runs out, the outpost goes into lockdown (see outpost.mjs: retake it to end it sooner).
import { CONFIG, SERVER, MUTATIONS, FAMILIES, variantFor } from './data.mjs';
import { emit, warn, rand, active, selectEncounter, command, gainXp, xpFor, gainCode } from './combat.mjs';
import { codeOf, codeDrop } from './gear.mjs';
import { outposts, fall, hasMod } from './outpost.mjs';
import { hiddenNodes } from './hidden.mjs';
import { has as hasConfig } from './configs.mjs';

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

export function launch(s) {
  const targets = outposts(s).filter((l) => !l.outpost.lockdown && !l.outpost.siege);
  if (!targets.length) return null;
  const pool = targets.some((l) => hasMod(l, 'lure')) ? targets.filter((l) => hasMod(l, 'lure')) : targets; // a Honeytoken first
  const target = pool[Math.floor(rand(s) * pool.length)];
  const o = origin(s, target);
  const ships = Math.min(4, 2 + Math.floor(outposts(s).length / 2) + (rand(s) < 0.3 ? 1 : 0));
  const level = Math.min(CONFIG.maxMobLevel, (target.level || 1) + FLEET.levelUp);
  const total = Math.round(FLEET.travelMs * (hasConfig(s, 'beacon') ? 1.5 : 1) * (hasMod(target, 'ids') ? 1.5 : 1));
  s.fleetSeq = (s.fleetSeq || 0) + 1;
  s.fleet = { id: 'fl' + s.fleetSeq, family: o.family, key: SHIP[o.family], level, ships, total: ships, target: target.id, fromName: o.name, from: o.from || null, hidden: o.hidden || null, state: 'travel', left: total, travel: total, siegeLeft: FLEET.siegeMs * (hasMod(target, 'node') ? 2 : 1), seed: (Math.floor(rand(s) * 2 ** 31) >>> 0) || 1, mutation: level >= SERVER.mutationsFrom && rand(s) < 0.3 ? Object.keys(MUTATIONS)[Math.floor(rand(s) * Object.keys(MUTATIONS).length)] : null };
  emit(s, 'fleet', `SWARM: ${ships} ${FAMILIES[o.family].name.toLowerCase()} processes (level ${level}) left ${o.name}, headed for your outpost on ${target.name}. They land in ${Math.round(total / 60000)} minutes.`, { location: target.id });
  return s.fleet;
}

function schedule(s, first = false) {
  const net = (s.net ||= {});
  const [lo, hi] = FLEET.everyMs;
  net.fleetNext = first ? FLEET.firstMs : Math.round((lo + rand(s) * (hi - lo)) * (outposts(s).some((l) => hasMod(l, 'lure')) ? 0.5 : 1));
}

// Called from tickNetwork with logged-on time (dt). Degraded mode pauses it.
export function tickFleet(s, dt, paused = false) {
  if (paused || dt <= 0) return;
  const f = s.fleet;
  if (!f) {
    if (!outposts(s).some((l) => !l.outpost.lockdown)) return;
    const net = (s.net ||= {});
    if (net.fleetNext == null) schedule(s, true);
    net.fleetNext -= dt;
    if (net.fleetNext <= 0) { launch(s); schedule(s); }
    return;
  }
  const target = locOf(s, f.target);
  if (!target?.outpost?.h || target.outpost.lockdown) return disband(s, 'Its target is already in lockdown: the swarm scatters.');
  if (fighting(s, f)) return; // you're on it: the clock waits for the fight
  if (f.state === 'travel') {
    f.left -= dt;
    if (f.left <= 0) {
      f.state = 'siege';
      emit(s, 'fleet-siege', `SWARM AT ${target.name.toUpperCase()}: ${f.ships} left. Defend within ${Math.round(FLEET.siegeMs / 60000)} minutes or the outpost falls.`, { location: target.id });
    }
    return;
  }
  f.siegeLeft -= dt;
  if (f.siegeLeft <= 0) {
    s.fleet = null;
    target.outpost.siege = null;
    emit(s, 'info', `The swarm overran ${target.name}.`);
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
  emit(s, 'jack-in', `${f.state === 'travel' ? 'Intercepting' : 'Defending'}: ${s.encounter.virus.name}, process ${f.total - f.ships + 1} of ${f.total}.`, { location: f.target });
  command(s, 'engage');
}

// Called from finish() when a fleet fight is won.
export function fleetWon(s, e) {
  const f = s.fleet;
  if (!f || e.fleet !== f.id) return;
  f.ships--;
  if (f.ships > 0) return emit(s, 'fleet-hit', `Process killed. ${f.ships} left in the swarm${f.state === 'siege' ? ` (${Math.ceil(f.siegeLeft / 60000)} min on the siege)` : ''}.`, { location: f.target });
  s.fleet = null;
  // The haul: code from every process, salvage, and a bonus kill's worth of XP.
  const k = codeOf(f.family);
  if (k) gainCode(s, { [k]: f.total * codeDrop(f.level) * 2 * (hasMod(locOf(s, f.target), 'lure') ? 2 : 1) }, 'Swarm broken: ');
  for (let i = 0; i < f.total; i++) s.salvage.push({ name: `${FAMILIES[f.family].name} core`, virus: 'fleet', seed: f.seed + i });
  const lure = hasMod(locOf(s, f.target), 'lure') ? 2 : 1; // a Honeytoken pays double
  gainXp(s, xpFor(s, f.level, f.total * 0.5 * lure), 'swarm broken');
  emit(s, 'fleet-broken', `SWARM BROKEN. ${f.total} processes killed: +${f.total} salvage.`, { location: f.target });
}

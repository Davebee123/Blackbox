// Invasions: the idle layer. While you're logged on, locations you've found send viruses back
// along the network to your server, one at a time. Your wall (the Firewall service) meets each
// one, comparing its rating with the invader's strength:
//   20% or more stronger: blocked at the wall (a trickle of XP and salvage)
//   within 20%: a siege. The wall wears the invader down while it chips your server.
//   20% or more weaker: a breach. It chips your server (1% of max a minute) until you deal with it.
// You can jack in to fight one at the wall: it's as worn down as the siege left it, its armor
// is intact, and it's worth a full kill. There's no daemon that does it for you.
// A crash puts the server in Degraded mode (see crashServer in combat.mjs); the network waits.
import { tickOutposts } from './outpost.mjs';
import { tickFleet } from './fleet.mjs';
import { tickRetake } from './hubs.mjs';
import { tickStation } from './station.mjs';
import { tickConsortium, consortiumOf, consortiumWall, memberHelp, occupy, roam, CONSORTIUM } from './consortium.mjs';
import { has as hasConfig } from './configs.mjs';
import { effLevel, fragment, tickFirewall } from './firewall.mjs';
import { filterStat } from './filters.mjs';
import { archWall } from './architecture.mjs';
import { CONFIG, SERVER, MUTATIONS, createVirus, power, variantFor, GRADES } from './data.mjs';
import { SERVICES, codeOf, codeDrop } from './gear.mjs';
import { pickOrigin, hiddenNode, hiddenLead, HIDDEN } from './hidden.mjs';
import { emit, warn, rand, active, holding, serverLevel, serviceVersion, serviceValue, selectEncounter, crashServer, endInvasion, gainXp, xpFor, command, gainCode, addLead } from './combat.mjs';

const I = () => CONFIG.invasion;
const since = (s, first) => s.logs.filter((e) => e.id > first);
// Each family sends its own virus.
export const INVADER = { ransomware: 'cryptjack', worm: 'splinter', ghostroot: 'ghostroot' };

// ---------- the wall ----------
export const strength = (level, mutation = null, grade = 1) => 100 * power(level) * (mutation ? I().mutated : 1) * (GRADES[grade]?.hp || 1); // a v2/v3 invader is that much harder to stop
// Your wall's rating: your firewall's effective level (firewall.mjs), set so it blocks invaders at
// or under that level outright. Down while the server is Degraded.
export function wallRating(s, family = null) {
  if (s.degraded) return 0;
  const L = effLevel(s, undefined, family);
  return L < 1 ? 100 * I().wall : 100 * power(L) * I().block;
}
// Firewall configs bend the rating: Stateful +20%; Adaptive +40% against the family that has hit
// you most, −10% against the rest.
export const topFamily = (s) => Object.entries(s.net?.seen || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
export function configRating(s, family) {
  if (hasConfig(s, 'stateful')) return 1.2;
  if (hasConfig(s, 'adaptive')) return family && family === topFamily(s) ? 1.4 : 0.9;
  return 1;
}
export const ratioOf = (s, inv) => (wallRating(s, inv.family) * configRating(s, inv.family) * archWall(s) * consortiumWall(s)) / strength(inv.level, inv.mutation, inv.grade);
export const outcome = (ratio) => (ratio >= I().block ? 'blocked' : ratio > I().breach ? 'siege' : 'breach');
// 0 at the breach line, 1 at the block line.
const along = (ratio) => Math.min(1, Math.max(0, (ratio - I().breach) / (I().block - I().breach)));
// % of your max Integrity chipped per minute.
export function chipRate(ratio) {
  const o = outcome(ratio);
  return o === 'breach' ? I().chip : o === 'siege' ? I().chip * (1 - along(ratio)) : 0;
}
// % of the invader the wall wears down per minute (sieges only).
export const grindRate = (ratio) => (outcome(ratio) === 'siege' ? I().grind[0] + (I().grind[1] - I().grind[0]) * along(ratio) : 0);
// The invader levels your wall blocks outright, and holds at siege (unmutated invaders).
export function wallBands(s, rating = wallRating(s)) {
  let blocks = 0, holds = 0;
  for (let L = 1; L <= CONFIG.maxMobLevel; L++) {
    const r = rating / strength(L);
    if (r >= I().block) blocks = L;
    if (r > I().breach) holds = L;
  }
  return { blocks, holds };
}
// Travel time from a location: longer from deeper layers, longer still behind a Tarpit.
export const travelMs = (s, depth = 1) => Math.round((I().travelMs + I().perLayerMs * (Math.max(1, depth) - 1)) * (1 + (serviceValue(s, 'tarpit') * (hasConfig(s, 'sticky') ? 1.5 : 1) + filterStat(s, 'tarpit')) / 100));
export const fighting = (s, inv = s.invasion) => !!inv && active(s) && s.encounter.invader === inv.id;
export const degradedLeft = (s, now = Date.now()) => (s.degraded ? (s.degraded.until ? Math.max(0, s.degraded.until - now) : CONFIG.degradedMs) : 0);
// "2 min", "40s"
export const fmtLeft = (ms) => (ms >= 60000 ? `${Math.ceil(ms / 60000)} min` : `${Math.max(1, Math.ceil(ms / 1000))}s`);
const pct = (x) => `${Math.round(x * 10) / 10}%`;

// ---------- the network clock ----------
// Call about once a second with the real time. Only logged-on time counts for invasions: a gap
// (closed game, sleeping laptop) counts as a few seconds. Degraded mode runs on the real clock.
// In a consortium, the gap is played out too (away): invaders keep coming, at AWAY.pace, and your
// wall meets them; members sometimes stop one. A crash while away reboots for CONSORTIUM.rebootMs,
// occupied (consortium.mjs): clear it to come back sooner.
export const AWAY = { pace: 0.5, stepMs: 60000, maxMs: 24 * 3600000, helpMs: 3 * 60000 };
export function tickNetwork(s, now = Date.now()) {
  const first = s.serial;
  const net = (s.net ||= { wall: null, next: null });
  const prev = net.wall ?? now;
  net.wall = now;
  const gap = Math.max(0, now - prev), dt = Math.min(gap, I().maxTickMs);
  if (gap > dt && consortiumOf(s)) away(s, prev, now - dt);
  tickOutposts(s, now, dt, !!s.degraded); // degraded mode pauses outposts too
  tickFleet(s, dt, !!s.degraded, now);
  tickRetake(s, dt, !!s.degraded, now); // hubs you hold, and the factions that want them back
  tickFirewall(s, now); // a defrag that's done
  tickStation(s, dt); // the numbers station keeps broadcasting, degraded or not
  tickConsortium(s, dt, now); // the dividend, sieges, raids, the travelling virus, invites (consortium.mjs)
  if (s.degraded) {
    const d = s.degraded;
    if (d.until == null) { d.since = now; d.until = now + (d.ms ?? CONFIG.degradedMs); }
    // Installs don't progress while degraded: push the job back by the time spent degraded.
    const paused = Math.max(0, Math.min(now, d.until) - Math.max(prev, d.since));
    if (s.install && paused) { s.install.startedAt += paused; s.install.doneAt += paused; }
    if (now < d.until) return since(s, first); // the network waits too
    s.degraded = null;
    emit(s, 'rebooted', 'BACK ONLINE.');
  }
  stepInvasion(s, dt);
  return since(s, first);
}

// The time you were logged off, a minute at a time (up to a day).
function away(s, from, to) {
  for (let t = Math.max(from, to - AWAY.maxMs) + AWAY.stepMs; t <= to; t += AWAY.stepMs) {
    tickOutposts(s, t, AWAY.stepMs, !!s.degraded, true);
    const d = s.degraded;
    if (d) {
      if (d.until == null) { d.since = t; d.until = t + (d.ms ?? CONFIG.degradedMs); }
      if (t < d.until) continue;
      s.degraded = null;
      emit(s, 'rebooted', 'Your server came back online while you were away.');
    }
    stepInvasion(s, AWAY.stepMs, t);
  }
}

// The invader: setting out, on its way, then at the wall. at: the time, while away.
function stepInvasion(s, dt, at = null) {
  const net = s.net, inv = s.invasion;
  if (!inv) {
    if (!s.locations?.length) return;
    if (net.next == null) net.next = I().firstMs;
    net.next -= at == null ? dt : dt * AWAY.pace;
    if (net.next <= 0) depart(s);
    return;
  }
  if (inv.state === 'travel') {
    inv.left -= dt;
    if (inv.left <= 0) arrive(s);
    return;
  }
  if (holding(s, 'invader', inv.id)) return; // you're on it: the wall stands back (not while the fight is paused)
  const r = ratioOf(s, inv);
  const o = outcome(r);
  // The wall got stronger since it arrived (a Firewall, a new version, a server level).
  if (o === 'blocked') return stopped(s, inv, false);
  if (o !== inv.state) {
    inv.state = o;
    emit(s, o === 'siege' ? 'wall-siege' : 'wall-breach', o === 'siege' ? `Your wall now contests ${inv.name}.` : `${inv.name} broke through to a breach.`, { invader: inv.id });
  }
  if (o === 'siege') {
    inv.hp -= (grindRate(r) / 100) * (1 + filterStat(s, 'grind') / 100) * (dt / 60000);
    if (inv.hp <= 0) return stopped(s, inv, true);
  }
  // Away, a member may come and deal with it.
  if (at != null) {
    if (inv.helper === undefined) { inv.helper = memberHelp(s); inv.helpLeft = AWAY.helpMs; }
    if (inv.helper && (inv.helpLeft -= dt) <= 0) return endInvasion(s, `${inv.helper} stopped ${inv.name} at your wall while you were away.`);
  }
  inv.chipAcc = (inv.chipAcc || 0) + ((s.server.max * chipRate(r)) / 100) * (1 - Math.min(0.8, filterStat(s, 'chip') / 100)) * (dt / 60000);
  const n = Math.floor(inv.chipAcc + 1e-9);
  if (n > 0) {
    inv.chipAcc -= n;
    const floor = active(s) && s.encounter.mode === 'home' ? 1 : 0; // never ends a home fight you're in
    s.server.integrity = Math.max(floor, s.server.integrity - n);
    if (s.server.integrity <= 0) {
      emit(s, 'crashed', `${inv.name} chipped your server to zero${at != null ? ' while you were away' : ''}. SERVER CRASHED.`, { invader: inv.id, mode: 'home' });
      if (at == null) return crashServer(s);
      // Away: a long reboot, occupied by the invader's processes, and the virus moves on.
      crashServer(s, CONSORTIUM.rebootMs, at);
      s.occupation = occupy(s, { id: 'home', name: 'HOME', family: inv.family, level: inv.level, seed: inv.seed });
      endInvasion(s, `${inv.name} moved into your server. Connect to HOME and clear it to come back online sooner.`);
      roam(s, s.occupation, 0);
    }
  }
}

// One invader sets out from a location you've found, at that location's level.
// Sometimes it comes from a server you haven't found, through the one it hangs off.
function depart(s, from = null) {
  const o = from ? { loc: from } : pickOrigin(s);
  const h = o.hidden || null;
  const loc = h ? { id: h.via, name: 'an unknown server', family: h.family, level: h.level, depth: h.depth } : o.loc;
  if (!loc) return null;
  const via = h && s.locations.find((l) => l.id === h.via);
  const level = Math.min(CONFIG.maxMobLevel, loc.level || 1);
  const seed = (Math.floor(rand(s) * 2 ** 31) >>> 0) || 1;
  const ids = Object.keys(MUTATIONS);
  const mutation = level >= SERVER.mutationsFrom && rand(s) < 0.4 ? ids[Math.floor(rand(s) * ids.length)] : null;
  const key = INVADER[loc.family];
  const { strain, grade } = variantFor(loc.family, level, loc.depth || 1, seed); // deeper servers send bigger viruses, and strains
  const virus = createVirus(key, seed, { threat: SERVER.threat(level), mutation, strain, grade });
  const total = travelMs(s, loc.depth);
  s.net.seq = (s.net.seq || 0) + 1;
  (s.net.seen ||= {})[loc.family] = (s.net.seen[loc.family] || 0) + 1;
  s.invasion = { id: 'inv' + s.net.seq, from: loc.id, fromName: h ? `an unknown server past ${via?.name}` : loc.name, hidden: h?.id || null, family: loc.family, key, seed, level, mutation, strain, grade, name: virus.name, state: 'travel', left: total, total, hp: 1, chipAcc: 0 };
  emit(s, 'invader', `${virus.name} (level ${level}${mutation ? ', ' + MUTATIONS[mutation].name : ''}) left ${s.invasion.fromName}: an invasion, at your wall in ${fmtLeft(total)}.`, { invader: s.invasion.id });
  return s.invasion;
}

function arrive(s) {
  const inv = s.invasion;
  inv.left = 0;
  // Tarpit configs: Toll wears it down on the way; Beacon reads an unknown origin's route.
  if (hasConfig(s, 'toll')) inv.hp = Math.min(inv.hp, 0.8);
  if (filterStat(s, 'sting')) inv.hp = Math.min(inv.hp, 1 - filterStat(s, 'sting') / 100); // a filter's sting: it arrives worn
  if (hasConfig(s, 'beacon') && inv.hidden) hiddenLead(s, hiddenNode(s, inv.hidden), 15, 'Beacon: ');
  const r = ratioOf(s, inv);
  const o = outcome(r);
  fragment(s, o); // every threat it meets wears the firewall
  if (o === 'blocked') return stopped(s, inv, false);
  inv.state = o;
  if (o === 'siege') emit(s, 'wall-siege', `Invasion at your wall: ${inv.name}, contested. −${pct(chipRate(r))} Integrity a minute.`, { invader: inv.id });
  else emit(s, 'wall-breach', `${inv.name} BREACHED your wall. −${pct(chipRate(r))} Integrity a minute.`, { invader: inv.id });
}

// The wall stopped it: outright on arrival, or worn down by a siege.
function stopped(s, inv, ground) {
  const quiet = hasConfig(s, 'stateful'); // Stateful: dropped at the wall, nothing left behind
  if (!quiet) s.salvage.push({ name: `${inv.name} fragment`, virus: inv.name, seed: inv.seed });
  if (hasConfig(s, 'reflective')) { const k = codeOf(inv.family); if (k) gainCode(s, { [k]: 2 * codeDrop(inv.level) }, 'Reflective: '); }
  if (hasConfig(s, 'inspection')) { if (inv.hidden) hiddenLead(s, hiddenNode(s, inv.hidden), 20, 'Deep Inspection: '); else addLead(s, inv.family, 15, 'Deep Inspection: '); }
  endInvasion(s, `${ground ? `Your wall wore ${inv.name} down to nothing` : `Your wall stopped ${inv.name} (level ${inv.level}) from ${inv.fromName}`}${quiet ? '.' : ': +1 salvage.'}`, { blocked: true });
  gainXp(s, xpFor(s, inv.level, I().blockedXp), `${inv.name} stopped at the wall`);
  if (inv.hidden) hiddenLead(s, hiddenNode(s, inv.hidden), HIDDEN.blockLead, 'Its route: ');
}

// ---------- jacking in ----------
// Fight the invader at the wall yourself: worn down as the siege left it, armor intact, a full
// kill's worth. A waiting gate intrusion is parked and comes back when you next engage.
export function jackIn(s) {
  const first = s.serial;
  const inv = s.invasion;
  if (!inv) warn(s, s.locations?.length ? 'Nothing at your wall right now.' : 'Nothing at your wall. Invasions come from locations you have found.');
  else if (inv.state === 'travel') warn(s, `${inv.name} is still on its way (about ${fmtLeft(inv.left)}). Meet it at the wall.`);
  else if (s.run) warn(s, `You're out on a run. Jack out first, then jack in at the wall.`);
  else if (active(s)) warn(s, fighting(s, inv) ? 'You are already fighting it.' : 'Finish this fight first.');
  else {
    const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
    selectEncounter(s, inv.key, inv.seed, { level: inv.level, mutation: inv.mutation, strain: inv.strain, grade: inv.grade, quiet: true });
    s.gate = gate || null;
    const e = s.encounter;
    e.invader = inv.id;
    for (const p of e.virus.parts) p.integrity = Math.max(1, Math.round(p.max * inv.hp));
    emit(s, 'jack-in', `Jacked in at the wall: ${inv.name}${inv.hp < 1 ? `, ${Math.round(inv.hp * 100)}%` : ''}.`, { invader: inv.id });
    command(s, 'engage');
  }
  return since(s, first);
}

// ---------- testing ----------
// developer invade: an invader arrives at your wall now. developer crash: crash the server.
export function developerNetwork(s, text) {
  const first = s.serial;
  if (text === 'developer invade') {
    if (!s.locations?.length) warn(s, 'Find a location first (developer location worm).');
    else if (s.invasion) warn(s, `${s.invasion.name} is already ${s.invasion.state === 'travel' ? 'on its way' : 'at your wall'}.`);
    else { depart(s); arrive(s); }
  } else if (text === 'developer crash') {
    if (active(s)) warn(s, 'Not mid-fight.');
    else { emit(s, 'crashed', 'Developer: SERVER CRASHED.', { mode: 'home' }); crashServer(s); }
  }
  return since(s, first);
}

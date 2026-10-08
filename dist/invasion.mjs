// Invasions: the idle layer. While you're logged on, locations you've found send an invasion back
// along the network to your server about every 20–30 minutes. Each one is an event of a kind
// (KINDS): a raider, a pack, a pair, a champion, a saboteur, a thief or a scout, sometimes carrying
// its server's quirk. Your wall (the firewall) meets it, comparing its rating with the invasion's
// strength (its level plus what its kind adds at the wall, pushOf):
//   20% or more stronger: blocked at the wall, quietly (a log line, a pager entry, a little pay)
//   within 20%: contested. The wall wears it down while it chips your server.
//   20% or more weaker: a breach. It chips your server (1% of max a minute) until you deal with it.
// Only what gets past the wall asks for you. Jack in to fight it at the wall: it's as worn down as
// the wall left it, its armor is intact, it's worth a full kill, and its bounty in signatures (the
// wall's currency, from invasions only) grows the longer it's contested before you do.
// A crash puts the server in Degraded mode (see crashServer in combat.mjs); the network waits.
import { tickOutposts, outposts, stockOf } from './outpost.mjs';
import { tickFleet } from './fleet.mjs';
import { tickRetake } from './hubs.mjs';
import { tickEvents } from './events.mjs';
import { tickConsortium, consortiumOf, memberHelp, occupy, roam, CONSORTIUM } from './consortium.mjs';
import { isLive } from './memory.mjs';
import { effLevel, tickFirewall, fragment, ratingAt, firewallRestore } from './firewall.mjs';
import { filterStat, addFilter, rollFilter } from './filters.mjs';
import { CONFIG, SERVER, MUTATIONS, ROLLED_MUTATIONS, QUIRKS, quirkOf, createVirus, power, variantFor, killXp, xpToNext } from './data.mjs';
import { SERVICES, codeOf, rollItem, uniqueItem } from './gear.mjs';
import { pickOrigin, hiddenNode, hiddenLead, HIDDEN } from './hidden.mjs';
import { emit, warn, rand, active, holding, selectEncounter, crashServer, endInvasion, gainXp, xpFor, command, gainCode, hackerLevel, syncServer, addItem, UNIQUES, listenBoost } from './combat.mjs';

const I = () => CONFIG.invasion;
const since = (s, first) => s.logs.filter((e) => e.id > first);
// Each family sends its own virus.
export const INVADER = { ransomware: 'cryptjack', worm: 'splinter', ghostroot: 'ghostroot' };

// ---------- what comes ----------
// w: its weight in the roll. from: the sending server's level it needs. bounty: signatures (a pack's
// is per virus). lvl: levels over its server it comes at. push: levels it counts higher at your wall.
// travel: × the usual travel time. online: never rolled while you're away (you couldn't answer it).
export const KINDS = {
  raider: { name: 'Raider', w: 30, from: 1, bounty: 2 },
  pack: { name: 'Pack', w: 16, from: 3, bounty: 1, size: 3 },
  pair: { name: 'Pair', w: 12, from: 4, bounty: 3 },
  champion: { name: 'Champion', w: 12, from: 8, bounty: 5, lvl: 1, push: 2, travel: 1.5, capture: true },
  saboteur: { name: 'Saboteur', w: 10, from: 4, bounty: 3, lvl: 1 },
  thief: { name: 'Thief', w: 10, from: 3, bounty: 3, lvl: 2, travel: 4, online: true }, // two over: an outpost's own firewall sits at its server's level
  scout: { name: 'Scout', w: 10, from: 2, bounty: 2, lvl: -2, push: 5, travel: 0.5, online: true },
};
export const PACK_PUSH = 2; // every virus waiting behind the front adds this many levels at the wall
// An invasion carrying its server's quirk (raiders, packs and champions, now and then).
export const QUIRKED = { chance: 0.3, kinds: ['raider', 'pack', 'champion'], hoard: 1.5, hiddenPush: 2, brood: -2 };
export const CHAMPION = { hp: 1.5 }; // elite-grade (elite armor and hits, triple XP), sized for one player: a crew elite is ELITE.hp. About 25–50% of your server's health at levels 10–18 (the scripted planner in blues)
export const SCOUT = { mapMs: 5 * 60000, mark: 3 }; // how long it takes to map your wall; what the next one counts higher
export const THIEF = { take: 0.5, min: 3 }; // the share of each store it takes; the store it needs to be worth the trip
// Bounty: signatures. It grows by grow × base a minute while it's contested or breaching (you
// not on it), up to cap × base more, and that growth is yours only if you kill it. An outright block pays blocked × base.
export const BOUNTY = { grow: 0.25, cap: 2, blocked: 0.5 };
// Streak: invasions stopped in a row (by your wall or by you). Each one in it pays step more (up to
// max steps); every capture-th in a row drops a capture. A crash, a theft or a scout's map ends it.
export const STREAK = { step: 0.1, max: 5, capture: 5 };
// A capture (what a champion, or a streak, leaves behind): a protocol or a filter, Custom filters
// with the rare affixes only come from here, and a chance at an invasion-only unique (BOSS_LOOT's
// pattern: chance, plus pity for every capture without one).
export const CAPTURE = { chance: 0.2, pity: 0.1, filter: 0.4, custom: 0.3 };

const kindOf = (inv) => KINDS[inv?.kind] || KINDS.raider;
export const sigsOf = (s) => s.sigs || 0;
export const streakOf = (s) => s.net?.streak || 0;
export const streakMult = (s) => 1 + STREAK.step * Math.min(streakOf(s), STREAK.max);

// ---------- the wall ----------
// A v2 invader counts as 2 levels higher at the wall, a v3 as 4: your firewall blocks it at its level +2 / +4.
export const GRADE_LEVELS = 2;
export const strength = (level, mutation = null, grade = 1) => 100 * power(level + GRADE_LEVELS * ((grade || 1) - 1)) * (mutation ? I().mutated : 1);
// Your wall's rating: your firewall's effective level (firewall.mjs), set so it blocks invaders at
// or under that level outright. Down while the server is Degraded.
export function wallRating(s, family = null) {
  if (s.degraded) return 0;
  const L = effLevel(s, undefined, family);
  return L < 1 ? 100 * I().wall : 100 * power(L) * I().block;
}
export const topFamily = (s) => Object.entries(s.net?.seen || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
// The levels an invasion counts higher at the wall: its kind, its quirk, a scout's map, and two for
// every virus still waiting behind the one in front.
export const pushOf = (inv) => (inv?.push || 0) + PACK_PUSH * (inv?.queue?.length || 0);
export const wallLevelOf = (inv) => inv.level + pushOf(inv);
export const ratioOf = (s, inv) => wallRating(s, inv.family) / strength(wallLevelOf(inv), inv.mutation, inv.grade);
export const outcome = (ratio) => (ratio >= I().block ? 'blocked' : ratio > I().breach ? 'siege' : 'breach');
// What meets it where it's going: your wall, or (a thief) the outpost's firewall.
const targetOf = (s, inv) => (inv?.target ? (s.locations || []).find((l) => l.id === inv.target) || null : null);
export const verdictOf = (s, inv) => (inv.kind === 'thief' ? outcome((ratingAt(s, targetOf(s, inv), inv.family) || 0) / strength(wallLevelOf(inv), inv.mutation, inv.grade)) : outcome(ratioOf(s, inv)));
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
export const travelMs = (s, depth = 1) => Math.round((I().travelMs + I().perLayerMs * (Math.max(1, depth) - 1)) * (1 + filterStat(s, 'tarpit') / 100));
export const fighting = (s, inv = s.invasion) => !!inv && active(s) && s.encounter.invader === inv.id;
export const degradedLeft = (s, now = Date.now()) => (s.degraded ? (s.degraded.until ? Math.max(0, s.degraded.until - now) : CONFIG.degradedMs) : 0);
// "2 min", "40s"
export const fmtLeft = (ms) => (ms >= 60000 ? `${Math.ceil(ms / 60000)} min` : `${Math.max(1, Math.ceil(ms / 1000))}s`);
const pct = (x) => `${Math.round(x * 10) / 10}%`;

// ---------- the bounty ----------
// What it pays now if you kill it, the most it can grow to, and whether a capture comes with it.
export function bountyOf(s, inv = s.invasion) {
  if (!inv) return null;
  const base = inv.bounty ?? kindOf(inv).bounty, mult = streakMult(s) * (inv.open ? I().open.reward : 1);
  const r = (n) => Math.max(1, Math.round(n * mult));
  return { base, now: r(base + Math.floor(inv.grown || 0)), max: r(base * (1 + BOUNTY.cap)), blocked: r(Math.ceil(base * BOUNTY.blocked)), wall: r(base), capture: !!kindOf(inv).capture, streakCapture: (streakOf(s) + 1) % STREAK.capture === 0, mult };
}
// One plain sentence on what this invasion does, beyond chipping at your wall (the map and the Firewall card show it).
export function tellOf(s, inv = s.invasion) {
  if (!inv) return '';
  const svc = inv.service && SERVICES[inv.service]?.name, tgt = targetOf(s, inv);
  const say = {
    raider: '',
    pack: inv.queue?.length ? `A pack of ${inv.queue.length + 1}. It counts ${PACK_PUSH * inv.queue.length} levels higher at your wall until it thins out.` : 'The last of its pack.',
    pair: inv.queue?.length ? `${inv.name} and ${inv.queue[0].name} came together. The pair counts ${PACK_PUSH} levels higher at your wall until one of them falls.` : 'The other half of a pair.',
    champion: `A champion, built like an elite. It counts ${KINDS.champion.push} levels higher at your wall and leaves a capture when you kill it.`,
    saboteur: inv.sabotaged ? `It shut off your ${svc}. Kill it to bring it back.` : `If it gets past your wall, it shuts off your ${svc} until you kill it.`,
    thief: `It is after the stores on ${tgt?.name || 'your outpost'}. Intercept it on the way, or it takes half of what is stored there.`,
    scout: inv.state === 'watch' ? `It is mapping your wall. Kill it in the next ${fmtLeft(inv.mapLeft)}, or the next invasion counts ${SCOUT.mark} levels higher.` : `It wants to map your wall. If your wall doesn't stop it, kill it within ${fmtLeft(SCOUT.mapMs)} or the next invasion counts ${SCOUT.mark} levels higher.`,
  }[inv.kind || 'raider'] || '';
  const q = { hoard: `It carries its server's hoard: it is Armored, and its bounty is half again as big.`, nest: 'It brings a brood from its Nest, one more virus behind it.', hidden: `It hides like its server does, so it counts ${QUIRKED.hiddenPush} levels higher at your wall.` }[inv.quirk] || '';
  const m = inv.marked ? `A scout mapped your wall for it, so it counts ${inv.marked} levels higher.` : '';
  return [say, q, m].filter(Boolean).join(' ');
}
export const labelOf = (inv) => (inv ? kindOf(inv).name + (inv.kind === 'pack' && inv.queue?.length ? ` ×${inv.queue.length + 1}` : '') : '');

// ---------- the network clock ----------
// Call about once a second with the real time. Only logged-on time counts for invasions: a gap
// (closed game, sleeping laptop) counts as a few seconds. Degraded mode runs on the real clock.
// In a consortium, the gap is played out too (away): invaders keep coming, at AWAY.pace, and your
// wall meets them; members sometimes stop one. A crash while away reboots for CONSORTIUM.rebootMs,
// occupied (consortium.mjs): clear it to come back sooner.
// Away: a long passive clock of its own. One invasion every 2–4 hours while you're logged off
// (no thieves or scouts: you couldn't answer them); swarms and hubs' old owners come at a quarter pace.
export const AWAY = { everyMs: [2 * 3600000, 4 * 3600000], slow: 0.25, stepMs: 60000, maxMs: 24 * 3600000, helpMs: 3 * 60000 };
const awayGap = (s) => { const [lo, hi] = AWAY.everyMs; return Math.round(lo + rand(s) * (hi - lo)); };
export function tickNetwork(s, now = Date.now()) {
  const first = s.serial;
  const net = (s.net ||= { wall: null, next: null });
  const prev = net.wall ?? now;
  net.wall = now;
  unsabotage(s); // a saboteur that's gone gives your service back
  const gap = Math.max(0, now - prev), dt = Math.min(gap, I().maxTickMs);
  if (gap > dt) away(s, prev, now - dt); // logged off: the network plays on (firewall.mjs is the guard)
  tickOutposts(s, now, dt, !!s.degraded); // degraded mode pauses outposts too
  tickFleet(s, dt, !!s.degraded, now);
  tickRetake(s, dt, !!s.degraded, now); // hubs you hold, and the factions that want them back
  tickFirewall(s, now); // a defrag that's done
  tickEvents(s, dt); // the event director deals what happens on the net, degraded or not
  tickConsortium(s, dt, now); // the dividend, sieges, raids, the travelling virus, invites (consortium.mjs)
  crashCheck(s);
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
  if (s.net.open) { s.net.open = false; emit(s, 'firewall', 'Ports closed while you were away.'); } // Open ports is an online thing
  for (let t = Math.max(from, to - AWAY.maxMs) + AWAY.stepMs; t <= to; t += AWAY.stepMs) {
    tickOutposts(s, t, AWAY.stepMs, !!s.degraded, true);
    const d = s.degraded;
    if (d) {
      if (d.until == null) { d.since = t; d.until = t + (d.ms ?? CONFIG.degradedMs); }
      if (t < d.until) continue;
      s.degraded = null;
      emit(s, 'rebooted', 'Your server came back online while you were away.');
    }
    // Swarms and hubs' old owners gather at a quarter pace while you're away (their schedules slip).
    if (s.net.fleetAt != null && !s.fleet) s.net.fleetAt += AWAY.stepMs * (1 - AWAY.slow);
    if (s.net.retakeAt != null && !s.retake) s.net.retakeAt += AWAY.stepMs * (1 - AWAY.slow);
    tickFleet(s, AWAY.stepMs, false, t);
    tickRetake(s, AWAY.stepMs, false, t);
    stepInvasion(s, AWAY.stepMs, t);
    unsabotage(s);
    // Rested: every safe hour away (no crash) banks a kill's worth of XP, up to 1.5 levels.
    if (!s.degraded) { const L = hackerLevel(s); s.rested = Math.min(Math.round(1.5 * xpToNext(L)), (s.rested || 0) + killXp(L) / 60); }
  }
}

// A crash with an invasion on (a breach chipping you out, or a lost fight at the wall) ends the streak.
function crashCheck(s) {
  const inv = s.invasion;
  if (s.degraded && inv && !inv.crashed) { inv.crashed = true; breakStreak(s, `${inv.name} crashed your server`); }
}

// The invader: setting out, on its way, then at the wall. at: the time, while away.
function stepInvasion(s, dt, at = null) {
  const net = s.net, inv = s.invasion;
  if (!inv) {
    if (!s.locations?.length) return;
    if (at != null) {
      // Away: the long passive clock.
      if (net.awayNext == null) net.awayNext = awayGap(s);
      net.awayNext -= dt;
      if (net.awayNext <= 0) { net.awayNext = awayGap(s); depart(s, { away: true }); }
      return;
    }
    if (net.next == null) net.next = I().firstMs;
    net.next -= net.open ? dt / I().open.pace : dt; // Open ports: they come 2.5× as often
    if (net.next <= 0) { const inv = depart(s); if (inv && net.open) inv.open = true; }
    return;
  }
  if (inv.state === 'travel') {
    if (holding(s, 'invader', inv.id)) return; // you're on it (a thief you intercepted): it waits
    inv.left -= dt;
    if (inv.left <= 0) arrive(s);
    return;
  }
  if (holding(s, 'invader', inv.id)) return; // you're on it: the wall stands back (not while the fight is paused)
  if (inv.state === 'watch') { // a scout, mapping your wall: no chip, nothing for the wall to grind
    inv.mapLeft -= dt;
    if (inv.mapLeft <= 0) mapped(s, inv);
    return;
  }
  const r = ratioOf(s, inv);
  const o = outcome(r);
  // The wall got stronger since it arrived (a Firewall, a new version, harden.sh).
  if (o === 'blocked') return stopped(s, inv, 'blocked');
  if (o !== inv.state) {
    inv.state = o;
    crack(s, inv);
    sabotage(s, inv);
    emit(s, o === 'siege' ? 'wall-siege' : 'wall-breach', o === 'siege' ? `Your wall now contests ${inv.name}.` : `${inv.name} broke through to a breach.`, { invader: inv.id });
  }
  if (o === 'siege') {
    inv.hp -= (grindRate(r) / 100) * (1 + filterStat(s, 'grind') / 100) * (dt / 60000);
    if (inv.hp <= 0 && !nextUp(s, inv, 'Your wall wore down')) return stopped(s, inv, 'ground');
  }
  // The bounty grows while it sits at the wall getting the better of you.
  const base = inv.bounty ?? kindOf(inv).bounty;
  inv.grown = Math.min(base * BOUNTY.cap, (inv.grown || 0) + base * BOUNTY.grow * (dt / 60000));
  // Away, a member may come and deal with it.
  if (at != null) {
    if (inv.helper === undefined) { inv.helper = memberHelp(s); inv.helpLeft = AWAY.helpMs; }
    if (inv.helper && (inv.helpLeft -= dt) <= 0) { endInvasion(s, `${inv.helper} stopped ${inv.name} at your wall while you were away.`); return unsabotage(s); }
  }
  inv.chipAcc = (inv.chipAcc || 0) + ((s.server.max * chipRate(r)) / 100) * (1 - Math.min(0.8, filterStat(s, 'chip') / 100)) * (dt / 60000);
  const n = Math.floor(inv.chipAcc + 1e-9);
  if (n > 0) {
    inv.chipAcc -= n;
    const floor = active(s) && s.encounter.mode === 'home' ? 1 : 0; // never ends a home fight you're in
    s.server.integrity = Math.max(floor, s.server.integrity - n);
    if (s.server.integrity <= 0) {
      emit(s, 'crashed', `${inv.name} chipped your server to zero${at != null ? ' while you were away' : ''}. SERVER CRASHED.`, { invader: inv.id, mode: 'home' });
      inv.crashed = true;
      breakStreak(s, `${inv.name} crashed your server`);
      // Online: it got what it came for and leaves, so a breach you couldn't answer costs one crash, not a loop of them.
      if (at == null) { crashServer(s); endInvasion(s, `${inv.name} crashed your server and left your wall.`, { lost: true }); return unsabotage(s); }
      // Away: a long reboot, occupied by the invader's processes, and the virus moves on.
      crashServer(s, CONSORTIUM.rebootMs, at);
      s.occupation = occupy(s, { id: 'home', name: 'HOME', family: inv.family, level: inv.level, seed: inv.seed });
      endInvasion(s, `${inv.name} moved into your server. Connect to HOME and clear it to come back online sooner.`);
      unsabotage(s);
      roam(s, s.occupation, 0);
    }
  }
}

// Fragmentation comes from events, not from every point of Integrity: an invasion that gets
// contested cracks one block of your firewall, a breach two (the difference, if it gets worse).
function crack(s, inv) {
  const want = { siege: 1, breach: 2 }[inv.state] || 0, had = inv.cracked || 0;
  if (want <= had) return;
  inv.cracked = want;
  for (let i = had; i < want; i++) fragment(s, 'siege');
}

// The one in front is down: the next of a pack or pair steps up. False if there's no one left.
function nextUp(s, inv, why) {
  if (!inv.queue?.length) return false;
  const was = inv.name, u = inv.queue.shift();
  Object.assign(inv, u, { hp: 1 });
  emit(s, 'info', `${why} ${was}. ${u.name} steps up at your wall.`, { invader: inv.id });
  return true;
}

// One virus of an invasion: a seed, maybe a mutation, its server's grade and maybe a strain.
function unit(s, loc, level, mutation) {
  const seed = (Math.floor(rand(s) * 2 ** 31) >>> 0) || 1;
  if (mutation === undefined) mutation = rand(s) < SERVER.mutationChance(level) ? ROLLED_MUTATIONS[Math.floor(rand(s) * ROLLED_MUTATIONS.length)] : null;
  const key = INVADER[loc.family];
  const { strain, grade } = variantFor(loc.family, level, loc.depth || 1, seed); // deeper servers send bigger viruses, and strains
  const virus = createVirus(key, seed, { threat: SERVER.threat(level), mutation, strain, grade });
  return { key, seed, level, mutation, strain, grade, family: loc.family, name: virus.name };
}
const clampLv = (L) => Math.max(1, Math.min(CONFIG.maxMobLevel, L));
const tame = (s) => (s.locations || []).filter((l) => !l.rogue && !l.member && isLive(s, l) && !l.zone);
// A service a saboteur can shut off: the best one you run (never the Filter Bay: that's the wall itself).
function serviceTarget(s) {
  const ids = Object.keys(s.services || {}).filter((id) => id !== 'firewall' && SERVICES[id] && s.services[id] > 0);
  if (!ids.length) return null;
  const top = Math.max(...ids.map((id) => s.services[id])), best = ids.filter((id) => s.services[id] === top);
  return best[Math.floor(rand(s) * best.length)];
}
// An outpost a thief can rob: the one with the most in its store.
const richest = (s) => outposts(s).filter((l) => !l.outpost?.lockdown && stockOf(l) >= THIEF.min).sort((a, b) => stockOf(b) - stockOf(a))[0] || null;
// Which kind comes: weighted, by what the sending server's level allows and what you have for it to go after.
function rollKind(s, loc, awayRoll) {
  if (!s.net.seq) return 'raider'; // the first one is plain
  const ok = Object.entries(KINDS).filter(([k, K]) => (loc.level || 1) >= K.from && !(awayRoll && K.online)
    && (k !== 'pair' || tame(s).length >= 2) && (k !== 'saboteur' || serviceTarget(s)) && (k !== 'thief' || richest(s)));
  const roll = () => { let r = rand(s) * ok.reduce((n, [, K]) => n + K.w, 0); for (const [k, K] of ok) { r -= K.w; if (r < 0) return k; } return ok.at(-1)[0]; };
  let k = roll();
  if (k !== 'raider' && k === s.net.lastKind) k = roll(); // the same special twice in a row is rarer
  return k;
}

// One invasion sets out from a location you've found, at that location's level.
// Sometimes it comes from a server you haven't found, through the one it hangs off.
// want: { kind, away } (developer invade <kind>, the away clock).
function depart(s, want = {}) {
  let o = want.from ? { loc: want.from } : pickOrigin(s);
  // Half the time it's the strongest server you're attached to that sends it.
  if (o.loc && !want.from && rand(s) < 0.5) o = { loc: tame(s).sort((a, b) => (b.level || 1) - (a.level || 1))[0] || o.loc };
  const h = o.hidden || null;
  const via = h && s.locations.find((l) => l.id === h.via);
  if (h) h.seen = true; // an invader from it shows its family
  // From a server you haven't found, it comes through one you're attached to: at that server's
  // level and layer (what you've connected to sets what comes at you), on the longer road.
  let loc = h ? { id: h.via, name: 'an unknown server', family: h.family, level: Math.min(h.level, via?.level || h.level), depth: via?.depth || 1, road: h.depth } : o.loc;
  if (!loc) return null;
  const net = s.net;
  let kind = want.kind && KINDS[want.kind] ? want.kind : rollKind(s, loc, !!want.away);
  const quirk = want.quirk || (net.seq && QUIRKED.kinds.includes(kind) && rand(s) < QUIRKED.chance ? quirkOf(loc.family) : null); // the first one is plain
  const service = kind === 'saboteur' ? serviceTarget(s) : null, target = kind === 'thief' ? richest(s) : null;
  if ((kind === 'saboteur' && !service) || (kind === 'thief' && !target)) kind = 'raider';
  // A thief comes from somewhere else than the outpost it robs, when there's anywhere else.
  if (kind === 'thief' && loc.id === target.id) { const others = tame(s).filter((l) => l.id !== target.id); if (others.length) loc = others[Math.floor(rand(s) * others.length)]; }
  const K = KINDS[kind];
  const level = clampLv((loc.level || 1) + (KINDS[kind].lvl || 0));
  const front = unit(s, loc, level, quirk === 'hoard' ? 'armored' : undefined);
  const queue = [];
  if (kind === 'pack') for (let i = 1; i < K.size; i++) { const u = unit(s, loc, level); if (u.name === front.name) u.name += ` #${i + 1}`; queue.push(u); }
  if (kind === 'pair') { const others = tame(s).filter((l) => l.id !== loc.id), b = others[Math.floor(rand(s) * others.length)] || loc; queue.push(unit(s, b, clampLv(b.level || 1))); }
  if (quirk === 'nest') queue.push(unit(s, loc, clampLv(level + QUIRKED.brood)));
  const mark = net.mark || 0;
  net.mark = 0;
  const bounty = Math.round((kind === 'pack' ? K.bounty * K.size : KINDS[kind].bounty) * (quirk === 'hoard' ? QUIRKED.hoard : 1)) + (quirk === 'nest' ? 1 : 0);
  const total = Math.round(travelMs(s, loc.road || loc.depth) * (KINDS[kind].travel || 1));
  net.seq = (net.seq || 0) + 1;
  net.lastKind = kind;
  (net.seen ||= {})[loc.family] = (net.seen[loc.family] || 0) + 1;
  const fromName = h && loc.name === 'an unknown server' ? `an unknown server past ${via?.name}` : loc.name;
  s.invasion = { id: 'inv' + net.seq, kind, quirk, from: loc.id, fromName, hidden: h?.id || null, ...front, name: kind === 'champion' ? `CHAMPION ${front.name}` : front.name,
    queue, size: queue.length + 1, push: (KINDS[kind].push || 0) + (quirk === 'hidden' ? QUIRKED.hiddenPush : 0) + mark, marked: mark || 0,
    service, target: target?.id || null, state: 'travel', left: total, total, hp: 1, chipAcc: 0, bounty, grown: 0 };
  const inv = s.invasion;
  // Weak ones, the wall handles quietly: a log line and a pager entry, no alert.
  inv.quiet = verdictOf(s, inv) === 'blocked';
  const what = `${inv.name} (level ${level}${front.mutation ? ', ' + MUTATIONS[front.mutation].name : ''})`;
  if (inv.quiet) emit(s, 'invader', `${what} left ${fromName}. Your ${kind === 'thief' ? `firewall on ${target.name}` : 'wall'} will stop it.`, { invader: inv.id, quiet: true });
  else emit(s, 'invader', `${K.name === 'Raider' ? 'Invasion' : K.name.toUpperCase()}: ${what} left ${fromName}${kind === 'thief' ? `. It reaches ${target.name}` : '. At your wall'} in ${fmtLeft(total)}.${tellOf(s, inv) ? ' ' + tellOf(s, inv) : ''}`, { invader: inv.id, kind });
  return inv;
}

function arrive(s) {
  const inv = s.invasion;
  inv.left = 0;
  if (inv.kind === 'thief') return robbed(s, inv);
  // Filters of the Hive: it arrives worn.
  if (filterStat(s, 'sting')) inv.hp = Math.min(inv.hp, 1 - filterStat(s, 'sting') / 100);
  const r = ratioOf(s, inv);
  const o = outcome(r);
  if (o === 'blocked') return stopped(s, inv, 'blocked');
  if (inv.kind === 'scout') {
    inv.state = 'watch'; inv.mapLeft = SCOUT.mapMs;
    return emit(s, 'wall-scout', `${inv.name} is mapping your wall. Kill it in the next ${fmtLeft(SCOUT.mapMs)}, or the next invasion counts ${SCOUT.mark} levels higher.`, { invader: inv.id });
  }
  inv.state = o;
  crack(s, inv);
  sabotage(s, inv);
  const b = bountyOf(s, inv), pay = ` Bounty ${b.now} signatures, up to ${b.max} if you let it sit.`;
  if (o === 'siege') emit(s, 'wall-siege', `Invasion at your wall: ${inv.name}, contested. −${pct(chipRate(r))} Integrity a minute.${pay}`, { invader: inv.id });
  else emit(s, 'wall-breach', `${inv.name} BREACHED your wall. −${pct(chipRate(r))} Integrity a minute.${pay}`, { invader: inv.id });
}

// Pay the bounty in signatures (and a capture, if it comes with one). how: 'blocked' (outright),
// 'wall' (worn down), 'you' (your kill: the growth too). Returns the signatures.
function payOut(s, inv, how) {
  const b = bountyOf(s, inv);
  const n = how === 'blocked' ? b.blocked : how === 'wall' ? b.wall : b.now;
  s.sigs = sigsOf(s) + n;
  s.net.streak = streakOf(s) + 1;
  const L = Math.max(inv.level, hackerLevel(s) - 2);
  if (b.capture && how === 'you') capture(s, L, `${inv.name} leaves a capture: `);
  if (s.net.streak % STREAK.capture === 0) capture(s, L, `Streak of ${s.net.streak}: a capture. `);
  return n;
}
export function breakStreak(s, why) {
  const n = streakOf(s);
  if (!s.net) return;
  s.net.streak = 0;
  if (n > 1) emit(s, 'info', `Your streak of ${n} ended: ${why}.`);
}

// The wall stopped it: outright on arrival, or worn down by a siege.
function stopped(s, inv, how) {
  const blocked = how === 'blocked', quiet = blocked;
  for (let i = 0; i < (inv.open ? 2 : 1); i++) s.salvage.push({ name: `${inv.name} fragment`, virus: inv.name, seed: inv.seed });
  // A filter of Reflection: it drops some of its family's code.
  const k = filterStat(s, 'reflect') && codeOf(inv.family);
  if (k) gainCode(s, { [k]: filterStat(s, 'reflect') }, 'Reflection: ');
  const n = payOut(s, inv, blocked ? 'blocked' : 'wall');
  const where = inv.kind === 'thief' ? `The firewall on ${targetOf(s, inv)?.name || 'your outpost'}` : 'Your wall';
  const kind = inv.kind && inv.kind !== 'raider' ? `, ${inv.kind === 'pack' ? `a pack of ${inv.size}` : `a ${kindOf(inv).name.toLowerCase()}`}` : '';
  endInvasion(s, `${blocked ? `${where} stopped ${inv.name} (level ${inv.level}${kind}) from ${inv.fromName}` : `${where} wore ${inv.name} down to nothing`}: +${n} ${n === 1 ? 'signature' : 'signatures'}, +1 salvage.`, { blocked, quiet, sigs: n });
  unsabotage(s);
  gainXp(s, xpFor(s, inv.level, I().blockedXp * (inv.open ? I().open.reward : 1)), `${inv.name} stopped at the wall`, 'fight');
  if (inv.hidden) hiddenLead(s, hiddenNode(s, inv.hidden), HIDDEN.blockLead, 'Its route: ');
}

// You killed the one in front (combat.mjs finish): the next of a pack steps up, or it's over and the bounty is yours.
export function invaderDown(s, inv) {
  inv.mine = (inv.mine || 0) + 1;
  if (nextUp(s, inv, 'You took down')) return;
  const intercepted = inv.state === 'travel';
  const n = payOut(s, inv, 'you');
  endInvasion(s, `${inv.name} is gone ${intercepted ? `before it reached ${targetOf(s, inv)?.name || 'your outpost'}` : 'from your wall'}: +${n} ${n === 1 ? 'signature' : 'signatures'}.`, { sigs: n });
  unsabotage(s);
}

// A thief that got where it was going: the outpost's firewall stops it, or it takes half the store.
function robbed(s, inv) {
  const loc = targetOf(s, inv);
  if (!loc?.outpost) { endInvasion(s, `${inv.name} found nothing to take and left.`, { quiet: true }); return; }
  if (verdictOf(s, inv) === 'blocked') return stopped(s, inv, 'blocked');
  const st = loc.outpost.stock || {}, took = {};
  for (const [k, v] of Object.entries(st)) { const n = Math.floor(Math.floor(v) * THIEF.take); if (n > 0) { st[k] = v - n; took[k] = n; } }
  const line = Object.entries(took).map(([k, n]) => `${n} ${k === 'rolls' ? (n === 1 ? 'Data Miner roll' : 'Data Miner rolls') : k}`).join(', ');
  endInvasion(s, null);
  breakStreak(s, `${inv.name} robbed ${loc.name}`);
  emit(s, 'theft', `${inv.name} got into the stores on ${loc.name} and took ${line || 'nothing worth having'}.`, { location: loc.id });
}
// A scout that finished mapping your wall: the next invasion counts higher there.
function mapped(s, inv) {
  s.net.mark = SCOUT.mark;
  endInvasion(s, null);
  breakStreak(s, `${inv.name} mapped your wall`);
  emit(s, 'wall-mapped', `${inv.name} mapped your wall and left. The next invasion counts ${SCOUT.mark} levels higher at it.`, {});
}

// ---------- the saboteur ----------
// Through your wall, it shuts off one of your services until it's gone (kill it, or the wall wears it down).
function sabotage(s, inv) {
  if (inv.kind !== 'saboteur' || inv.sabotaged || s.net.sabotage || !['siege', 'breach'].includes(inv.state)) return;
  const id = inv.service && s.services?.[inv.service] ? inv.service : serviceTarget(s);
  if (!id) return;
  inv.service = id; inv.sabotaged = true;
  s.net.sabotage = { id, v: s.services[id], inv: inv.id };
  delete s.services[id];
  syncServer(s);
  emit(s, 'sabotage', `${inv.name} got past your wall and shut off your ${SERVICES[id].name}. Kill it to bring it back.`, { invader: inv.id });
}
export function unsabotage(s) {
  const x = s.net?.sabotage;
  if (!x || s.invasion?.id === x.inv) return;
  s.net.sabotage = null;
  (s.services ||= {})[x.id] = Math.max(s.services[x.id] || 0, x.v);
  syncServer(s);
  emit(s, 'firewall', `${SERVICES[x.id]?.name || x.id} is running again.`);
}
// While a saboteur holds one of your services, nothing gets installed or uninstalled.
export function sabotageBlock(s, text) {
  const x = s.net?.sabotage;
  if (!x || !/^(install|uninstall) /.test(text)) return false;
  warn(s, `${s.invasion?.name || 'A saboteur'} is in your services and has your ${SERVICES[x.id]?.name || x.id} shut off. Get rid of it first.`);
  return true;
}

// ---------- captures ----------
// Invasion-only uniques (content/items.mjs, source kind 'invasion').
export const invasionUniques = () => Object.values(UNIQUES).filter((u) => (u.sources || []).some((src) => src.kind === 'invasion'));
export const captureChance = (s) => Math.min(1, (CAPTURE.chance + CAPTURE.pity * (s.pity?.invasion || 0)) * (invasionUniques().some((u) => u.id === s.listen) ? listenBoost(s) : 1));
export function capture(s, level, why) {
  const pool = invasionUniques().filter((u) => u.level <= level + 2);
  if (pool.length) {
    if (rand(s) < captureChance(s)) {
      (s.pity ||= {}).invasion = 0;
      const fresh = pool.filter((u) => !s.collection?.[u.id]), heard = fresh.filter((u) => u.id === s.listen), from = heard.length ? heard : fresh.length ? fresh : pool;
      return addItem(s, uniqueItem(from[Math.floor(rand(s) * from.length)], level, () => rand(s)), why);
    }
    (s.pity ||= {}).invasion = (s.pity.invasion || 0) + 1;
  }
  if (rand(s) < CAPTURE.filter) return addFilter(s, rollFilter(() => rand(s), { level, rarity: 'custom' }), why);
  return addItem(s, rollItem(() => rand(s), { level, rarity: rand(s) < CAPTURE.custom ? 'custom' : 'tuned' }), why);
}

// Open ports: online only, invasions come 2.5× as often and each is worth +50%. Closes when you log off.
export function portsCommand(s, text) {
  const on = text === 'open ports';
  if (on && !(s.locations || []).some((l) => !l.rogue && isLive(s, l))) return warn(s, 'Nothing attached: invasions come from servers on your network.');
  if (!!s.net?.open === on) return warn(s, on ? 'Your ports are already open.' : 'Your ports are closed.');
  (s.net ||= {}).open = on;
  if (on && s.net.next > 0) s.net.next = Math.round(s.net.next * I().open.pace);
  emit(s, 'firewall', on ? 'Ports open: invasions come 2.5× as often, each worth +50%. They close when you log off.' : 'Ports closed.');
}

// ---------- jacking in ----------
// Fight the invader at the wall yourself: worn down as the siege left it, armor intact, a full
// kill's worth. A thief you meet on its way (intercept). A waiting gate intrusion is parked and
// comes back when you next engage. A champion is elite-grade.
export function jackIn(s, verb = 'jack in') {
  const first = s.serial;
  const inv = s.invasion;
  const thief = inv?.kind === 'thief' && inv.state === 'travel';
  if (!inv) warn(s, s.locations?.length ? 'Nothing at your wall right now.' : 'Nothing at your wall. Invasions come from locations you have found.');
  else if (verb === 'intercept' && !thief) warn(s, inv.state === 'travel' ? `Only a thief can be caught on its way. Meet ${inv.name} at your wall.` : `${inv.name} is at your wall already. Jack in.`);
  else if (inv.state === 'travel' && !thief) warn(s, `${inv.name} is still on its way (about ${fmtLeft(inv.left)}). Meet it at the wall.`);
  else if (s.run) warn(s, `You're out on a run. Jack out first, then ${thief ? 'intercept it' : 'jack in at the wall'}.`);
  else if (active(s)) warn(s, fighting(s, inv) ? 'You are already fighting it.' : 'Finish this fight first.');
  else {
    const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
    const champ = inv.kind === 'champion' && inv.name.startsWith('CHAMPION');
    selectEncounter(s, inv.key, inv.seed, { level: inv.level, mutation: inv.mutation, strain: inv.strain, grade: inv.grade, quiet: true, ...(champ ? { elite: true, eliteHp: CHAMPION.hp, name: inv.name } : {}) });
    s.gate = gate || null;
    const e = s.encounter;
    e.invader = inv.id;
    if (champ) e.virus.champion = true;
    for (const p of e.virus.parts) p.integrity = Math.max(1, Math.round(p.max * inv.hp));
    emit(s, 'jack-in', thief ? `Intercepted ${inv.name} on its way to ${targetOf(s, inv)?.name || 'your outpost'}.` : `Jacked in at the wall: ${inv.name}${inv.hp < 1 ? `, ${Math.round(inv.hp * 100)}%` : ''}.`, { invader: inv.id });
    command(s, 'engage');
  }
  return since(s, first);
}

// invasions: what's coming, what it does, what it pays; your streak and signatures.
export function invasionsCommand(s) {
  const first = s.serial, inv = s.invasion, lines = [];
  if (!s.locations?.length) lines.push('Nothing comes for your wall until you find a location.');
  else if (inv) {
    const b = bountyOf(s, inv), v = verdictOf(s, inv), at = inv.kind === 'thief' ? `the firewall on ${targetOf(s, inv)?.name}` : 'your wall';
    const where = inv.state === 'travel' ? `on its way, ${fmtLeft(inv.left)} out, and ${at} will ${v === 'blocked' ? 'stop it' : v === 'siege' ? 'contest it' : 'not hold it'}` : inv.state === 'watch' ? 'mapping your wall' : inv.state === 'siege' ? `contested at your wall, ${Math.round(inv.hp * 100)}% left` : 'breaching your wall';
    lines.push(`${labelOf(inv)}: ${inv.name}, level ${inv.level}, from ${inv.fromName}. It is ${where}.`);
    if (tellOf(s, inv)) lines.push(tellOf(s, inv));
    lines.push(`Kill it for ${b.now} ${b.now === 1 ? 'signature' : 'signatures'} (up to ${b.max} if it sits contested). The wall alone gets ${b.wall}, an outright block ${b.blocked}.${b.capture ? ' A capture comes with your kill.' : ''}`);
  } else if (s.net?.next > 0) lines.push(`The next invasion sets out in about ${fmtLeft(s.net.next * (s.net.open ? I().open.pace : 1))}.${s.net.mark ? ` A scout mapped your wall: it counts ${s.net.mark} levels higher.` : ''}`);
  lines.push(`Streak ${streakOf(s)}: the next stop pays +${Math.round((streakMult(s) - 1) * 100)}%, and a capture comes every ${STREAK.capture} in a row. You hold ${sigsOf(s)} ${sigsOf(s) === 1 ? 'signature' : 'signatures'}.`);
  for (const l of lines) emit(s, 'info', l);
  return since(s, first);
}

// ---------- old saves ----------
// v33: invasions have kinds, bounties and a streak. One already out becomes a raider.
export function invasionRestore(s, was) {
  if (was >= 33) return;
  const inv = s.invasion;
  if (inv) { inv.kind ||= 'raider'; inv.queue ||= []; inv.size ||= 1; inv.bounty ??= KINDS.raider.bounty; inv.grown ||= 0; inv.push ||= 0; }
  s.sigs ||= 0; // the streak starts at nothing (streakOf)
  firewallRestore(s, was); // the firewall follows the network: an old wall becomes a tier, any excess refunded
}

// ---------- testing ----------
// developer invade [kind]: an invasion at your wall now (a thief sets out). developer crash: crash the server.
export function developerNetwork(s, text) {
  const first = s.serial;
  const kind = text.split(' ')[2];
  if (text.startsWith('developer invade')) {
    if (kind && !KINDS[kind] && !QUIRKS[kind]) warn(s, `developer invade [${Object.keys(KINDS).join('|')}|${Object.keys(QUIRKS).join('|')}]`);
    else if (!s.locations?.length) warn(s, 'Find a location first (developer location worm).');
    else if (s.invasion) warn(s, `${s.invasion.name} is already ${s.invasion.state === 'travel' ? 'on its way' : 'at your wall'}.`);
    else {
      const q = QUIRKS[kind] ? kind : null, from = q ? tame(s).find((l) => quirkOf(l.family) === q) : null;
      if (q && !from) warn(s, `None of your servers has the ${QUIRKS[q].name} quirk.`);
      else { const inv = depart(s, q ? { kind: 'raider', quirk: q, from } : { kind }); if (inv && inv.kind !== 'thief') arrive(s); }
    }
  } else if (text === 'developer crash') {
    if (active(s)) warn(s, 'Not mid-fight.');
    else { emit(s, 'crashed', 'Developer: SERVER CRASHED.', { mode: 'home' }); crashServer(s); }
  }
  return since(s, first);
}

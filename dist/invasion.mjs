// Invasions: while you're logged on, servers you've connected to send an invasion back along the network to your
// server about every 20–30 minutes, at their level (GAME_RULES.md "Invasions"): 2 minutes on the road from floor 1, a
// minute more a floor down, and a deeper floor's servers send bigger grades and strains. Each one is a kind (KINDS): a
// raider, a pack, a pair, a champion or a saboteur, sometimes carrying its server's quirk. Nothing stops it but you:
// once it reaches HOME it chips your Integrity (1% of max a minute, never below 1) until you intercept it, and its
// bounty (its family's code) grows while it sits there. Left alone 15 minutes, it leaves, unpaid. Invasions are the only thing that drops daemons (daemons.mjs).
import { tickEvents } from './events.mjs';
import { tickConsortium, consortiumOf, memberHelp } from './consortium.mjs';
import { isLive } from './memory.mjs';
import { wallRestore, baseOf } from './firewall.mjs';
import { CONFIG, SERVER, MUTATIONS, ROLLED_MUTATIONS, QUIRKS, quirkOf, createVirus, line, variantFor, gradeFor, codeUnit, DAEMON_DROP, restedGain, restedCap } from './data.mjs';
import { gainDaemon, rollDaemon } from './daemons.mjs';
import { SERVICES, codeOf, uniqueItem, MATERIALS } from './gear.mjs';
import { pickOrigin, connectedTo } from './hidden.mjs';
import { emit, warn, rand, active, holding, selectEncounter, endInvasion, command, hackerLevel, syncServer, addItem, UNIQUES, listenBoost } from './combat.mjs';
import { nativeStrain } from './network.mjs';
import { sendShift, sendTravel, pickSender, hasSpecial } from './specials.mjs';
import { tickProfile } from './profile.mjs';
import { tickChannel } from './channel.mjs';
import { contractDid } from './mail.mjs';
import { tickTable } from './table.mjs';

const I = () => CONFIG.invasion;
const since = (s, first) => s.logs.filter((e) => e.id > first);
// Each family sends its own virus.
export const INVADER = { ransomware: 'cryptjack', worm: 'splinter', ghostroot: 'ghostroot', cryptominer: 'xmrig', wiper: 'shamoon', botnet: 'mirainet', logicbomb: 'timebomb' };

// ---------- what comes ----------
// w: its weight in the roll. from: the sending server's level it needs. bounty: points, each paying a unit of its
// family's code at its level (data.mjs codeUnit; a pack's is per virus). lvl: levels over its server it comes at.
// travel: × the usual travel time. online: never rolled while you're away (you couldn't answer it).
export const KINDS = {
  raider: { name: 'Raider', w: 30, from: 1, bounty: 2 },
  pack: { name: 'Pack', w: 16, from: 3, bounty: 1, size: 3 },
  pair: { name: 'Pair', w: 12, from: 4, bounty: 3 },
  champion: { name: 'Champion', w: 12, from: 8, bounty: 5, lvl: 1, travel: 1.5, capture: true },
  saboteur: { name: 'Saboteur', w: 10, from: 4, bounty: 3, lvl: 1 },
};
// An invasion carrying its server's quirk (raiders, packs and champions, now and then).
export const QUIRKED = { chance: 0.3, kinds: ['raider', 'pack', 'champion'], hoard: 1.5, brood: -2 };
export const CHAMPION = { hp: 1.5 }; // elite-grade (elite armor and hits, triple XP), sized for one player: a crew elite is ELITE.hp. About 25–50% of your server's health at levels 10–18 (the scripted planner in blues)
// A spotter you killed first (events.mjs, the Spotter card): the next invasion comes this many levels lower (a grade's worth,
// GRADE_LEVELS), and you know its server and kind before it sets out (net.scouted).
export const SCOUTED = { levels: 2 };
// Bounty: code. It grows by grow × base a minute while it sits at HOME, up to cap × base more.
export const BOUNTY = { grow: 0.25, cap: 2 };
// Left alone at HOME, it leaves after this long (its bounty capped at 8 minutes), unpaid; the next one is scheduled.
export const LEAVE_MS = 15 * 60000;
export const leavesIn = (inv) => Math.max(0, LEAVE_MS - (inv?.homeFor || 0));
// Streak: invasions you stopped in a row. Each one in it pays step more (up to max steps).
export const STREAK = { step: 0.1, max: 5 }; // a streak pays more code a stop; it no longer leaves a capture (invasions supply daemons already)
// A capture (what a champion you kill, or a streak, leaves behind): a sure daemon, and a chance at an
// invasion-only unique on top (BOSS_LOOT's pattern: chance, plus pity for every capture without one).
// Every other stop rolls for a daemon (data.mjs DAEMON_DROP, with its own pity).
export const CAPTURE = { chance: 0.1, pity: 0.05 }; // was 20% +10%: uniques stay under one an hour of real play (docs/progression.md)

const kindOf = (inv) => KINDS[inv?.kind] || KINDS.raider;
export const streakOf = (s) => s.net?.streak || 0;
export const streakMult = (s) => 1 + STREAK.step * Math.min(streakOf(s), STREAK.max);

// ---------- at HOME ----------
// A v2 invader is built two levels higher, a v3 four.
export const GRADE_LEVELS = 2;
export const strength = (level, mutation = null, grade = 1) => 100 * line(level + GRADE_LEVELS * ((grade || 1) - 1)) * (mutation ? I().mutated : 1);
export const topFamily = (s) => Object.entries(s.net?.seen || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
// % of your max Integrity it chips a minute at HOME.
export const chipRate = () => I().chip;
// Travel time from a server: 2 minutes from floor 1, a minute more a floor down.
export const travelMs = (s, floor = 1) => Math.round(I().travelMs + I().perFloorMs * (Math.max(1, floor) - 1));
export const fighting = (s, inv = s.invasion) => !!inv && active(s) && s.encounter.invader === inv.id;
// "2 min", "40s"
export const fmtLeft = (ms) => (ms >= 60000 ? `${Math.ceil(ms / 60000)} min` : `${Math.max(1, Math.ceil(ms / 1000))}s`);
const pct = (x) => `${Math.round(x * 10) / 10}%`;

// ---------- the bounty ----------
// What it pays now if you kill it, the most it can grow to, and whether a capture comes with it: code of its
// family (code: which), a unit of it at its level (data.mjs codeUnit) for each point of bounty.
export const bountyCode = (inv) => codeOf(inv?.family) || 'cipher';
export function bountyOf(s, inv = s.invasion) {
  if (!inv) return null;
  const base = inv.bounty ?? kindOf(inv).bounty, mult = streakMult(s), unit = codeUnit(inv.level);
  const r = (n) => Math.max(1, Math.round(n * mult * unit));
  return { base, code: bountyCode(inv), now: r(base + Math.floor(inv.grown || 0)), max: r(base * (1 + BOUNTY.cap)), capture: !!kindOf(inv).capture, mult };
}
// "13 Worm code"
export const codeText = (n, k) => `${n} ${MATERIALS[k]?.name || k}`;
// One plain sentence on what this invasion does, beyond chipping your Integrity (the map's cards show it).
// What its server's quirk does to an invasion, in a sentence (its tag's tooltip too: view.mjs).
export const quirkLine = (inv) => ({ hoard: `It carries its server's hoard, so it is Armored and its bounty is 50% bigger.`, nest: 'It brings a brood from its Nest, one more virus behind it.', })[inv?.quirk] || '';
export function tellOf(s, inv = s.invasion) {
  if (!inv) return '';
  const svc = inv.service && SERVICES[inv.service]?.name;
  const say = {
    raider: '',
    pack: inv.queue?.length ? `A pack of ${inv.queue.length + 1}, fought one after another.` : 'The last of its pack.',
    pair: inv.queue?.length ? `${inv.name} and ${inv.queue[0].name} came together.` : 'The other half of a pair.',
    champion: 'A champion, built like an elite. It leaves a daemon when you kill it.',
    saboteur: inv.sabotaged ? `It shut off your ${svc}. Kill it to bring it back.` : `Once it reaches HOME, it shuts off your ${svc} until you kill it.`,
  }[inv.kind || 'raider'] || '';
  const w = inv.scouted ? `You killed its spotter, so it comes ${inv.scouted} levels weaker.` : '';
  return [say, quirkLine(inv), w].filter(Boolean).join(' ');
}
export const labelOf = (inv) => (inv ? kindOf(inv).name + (inv.kind === 'pack' && inv.queue?.length ? ` ×${inv.queue.length + 1}` : '') : '');

// ---------- the network clock ----------
// Call about once a second with the real time. Only logged-on time counts for invasions: a gap
// (closed game, sleeping laptop) counts as a few seconds. The gap is played out too (away): invaders
// keep coming, at AWAY.pace, and chip HOME; in a consortium members sometimes stop one.
// Away: a long passive clock of its own. One invasion every 2–4 hours while you're logged off
export const AWAY = { everyMs: [2 * 3600000, 4 * 3600000], slow: 0.25, stepMs: 60000, maxMs: 24 * 3600000, helpMs: 3 * 60000 };
const awayGap = (s) => { const [lo, hi] = AWAY.everyMs; return Math.round(lo + rand(s) * (hi - lo)); };
export function tickNetwork(s, now = Date.now()) {
  const first = s.serial;
  const net = (s.net ||= { wall: null, next: null });
  const prev = net.wall ?? now;
  net.wall = now;
  unsabotage(s); // a saboteur that's gone gives your service back
  const gap = Math.max(0, now - prev), dt = Math.min(gap, I().maxTickMs);
  if (gap > dt) away(s, prev, now - dt); // logged off: the network plays on
  tickEvents(s, dt); // the event director deals what happens on the net
  if (tickTable(s, dt)) emit(s, 'table-cancel', 'LANTERN runs a cancel round. The process table drops eight points.'); // INIT's table (table.mjs): logged-on time fills it
  tickConsortium(s, dt, now); // the dividend, sieges, raids, the travelling virus, invites (consortium.mjs)
  tickProfile(s); // deeds from the log, and a title just earned (profile.mjs)
  tickChannel(s, dt); // #net, the public channel: news, contacts and who's chatting (channel.mjs)
  stepInvasion(s, dt);
  return since(s, first);
}

// Rested (RESTED in data.mjs): safe time away banks a share of the level you're on, up to the cap.
function rest(s, ms) {
  if (ms <= 0) return;
  const L = hackerLevel(s), cap = restedCap(L);
  if ((s.rested || 0) < cap) s.rested = Math.min(cap, (s.rested || 0) + restedGain(L, ms));
}
// The time you were logged off, a minute at a time (up to a day; Rested banks for all of it).
function away(s, from, to) {
  const start = Math.max(from, to - AWAY.maxMs);
  rest(s, start - from); // past a day: nothing is played out
  for (let t = start + AWAY.stepMs; t <= to; t += AWAY.stepMs) {
    stepInvasion(s, AWAY.stepMs, t);
    unsabotage(s);
    // Rested: every minute away banks its share of 5% of a level every 8 hours, up to 1.5 levels.
    rest(s, AWAY.stepMs);
  }
}

// The invader: setting out, on its way, then at HOME. at: the time, while away.
function stepInvasion(s, dt, at = null) {
  const net = s.net, inv = s.invasion;
  if (!inv) {
    if (!(s.locations || []).some(connectedTo)) return; // nothing sends one until you've connected to a server
    if (at != null) {
      // Away: the long passive clock.
      if (net.awayNext == null) net.awayNext = awayGap(s);
      net.awayNext -= dt;
      if (net.awayNext <= 0) { net.awayNext = awayGap(s); depart(s, { away: true }); }
      return;
    }
    if (net.next == null) net.next = I().firstMs;
    net.next -= dt;
    if (net.next <= 0) depart(s);
    return;
  }
  if (inv.state === 'travel') {
    if (holding(s, 'invader', inv.id)) return; // you intercepted it: it waits
    inv.left -= dt;
    if (inv.left <= 0) arrive(s);
    return;
  }
  if (holding(s, 'invader', inv.id)) return; // you're on it
  // Left alone long enough, it leaves, unpaid (LEAVE_MS).
  inv.homeFor = (inv.homeFor || 0) + dt;
  if (inv.homeFor >= LEAVE_MS) { endInvasion(s, `${inv.name} left HOME. Its bounty went with it.`, { lost: true }); return unsabotage(s); }
  // The bounty grows while it sits at HOME.
  const base = inv.bounty ?? kindOf(inv).bounty;
  inv.grown = Math.min(base * BOUNTY.cap, (inv.grown || 0) + base * BOUNTY.grow * (dt / 60000));
  // Away, a member may come and deal with it.
  if (at != null) {
    if (inv.helper === undefined) { inv.helper = memberHelp(s); inv.helpLeft = AWAY.helpMs; }
    if (inv.helper && (inv.helpLeft -= dt) <= 0) { endInvasion(s, `${inv.helper} stopped ${inv.name} at HOME while you were away.`); return unsabotage(s); }
  }
  // The chip takes your Integrity where it is (a run's own bar while you're out), never below 1.
  const bar = s.run || s.server;
  inv.chipAcc = (inv.chipAcc || 0) + ((bar.max * chipRate()) / 100) * (dt / 60000);
  const n = Math.floor(inv.chipAcc + 1e-9);
  if (n > 0) {
    inv.chipAcc -= n;
    bar.integrity = Math.max(Math.min(1, bar.integrity), bar.integrity - n);
  }
}

// The one in front is down: the next of a pack or pair steps up. False if there's no one left.
function nextUp(s, inv, why) {
  if (!inv.queue?.length) return false;
  const was = inv.name, u = inv.queue.shift();
  Object.assign(inv, u, { hp: 1 });
  emit(s, 'info', `${why} ${was}. ${u.name} steps up.`, { invader: inv.id });
  return true;
}

// One virus of an invasion: a seed, maybe a mutation, its server's grade and maybe a strain.
function unit(s, loc, level, mutation) {
  const seed = (Math.floor(rand(s) * 2 ** 31) >>> 0) || 1;
  if (mutation === undefined) mutation = rand(s) < SERVER.mutationChance(level) ? ROLLED_MUTATIONS[Math.floor(rand(s) * ROLLED_MUTATIONS.length)] : null;
  const key = INVADER[loc.family];
  const { strain, grade } = variantFor(loc.family, level, loc.depth || 1, seed, nativeStrain(s, 'you')); // deeper floors send bigger viruses, and strains
  const floor = loc.depth || 1; // its natives weigh on its source's floor (parts.mjs PARTS.floor)
  const virus = createVirus(key, seed, { threat: SERVER.threat(level), mutation, strain, grade, floor });
  return { key, seed, level, mutation, strain, grade, floor, family: loc.family, name: virus.name };
}
const clampLv = (L) => Math.max(1, Math.min(CONFIG.maxMobLevel, L));
const tame = (s) => (s.locations || []).filter((l) => !l.rogue && !l.member && isLive(s, l) && !l.zone && connectedTo(l));
// Whether invasions come for HOME at all: a server attached to your network that sends them.
export const invasionsLive = (s) => tame(s).length > 0;

// The servers that send invasions to HOME (one you have only found sends none).
export const sendersOf = (s) => tame(s);
// The grade a server's invasions come at: its floor's, as unit() rolls them (variantFor, data.mjs gradeFor).
export const senderGrade = (loc) => gradeFor(loc?.depth || 1);
// The level a plain invasion from a server comes at, as its build weighs it: its level, a special's or program's shift
// (specials.mjs) and GRADE_LEVELS for each grade over v1. sendTop: the highest of them (0 when nothing sends one).
export const sendsAt = (loc) => (loc?.level || 1) + sendShift(loc) + GRADE_LEVELS * (senderGrade(loc) - 1);
export const sendTop = (s) => Math.max(0, ...tame(s).map(sendsAt));
// A service a saboteur can shut off: the best one you run.
function serviceTarget(s) {
  const ids = Object.keys(s.services || {}).filter((id) => SERVICES[id] && s.services[id] > 0);
  if (!ids.length) return null;
  const top = Math.max(...ids.map((id) => s.services[id])), best = ids.filter((id) => s.services[id] === top);
  return best[Math.floor(rand(s) * best.length)];
}
// Which kind comes: weighted, by what the sending server's level allows and what you have for it to go after.
// r: the dice (the game's; a killed scout's own, scoutNext).
function rollKind(s, loc, awayRoll, r0 = () => rand(s)) {
  if (!s.net.seq) return 'raider'; // the first one is plain
  const ok = Object.entries(KINDS).filter(([k, K]) => (loc.level || 1) >= K.from && !(awayRoll && K.online)
    && (k !== 'pair' || tame(s).length >= 2) && (k !== 'saboteur' || serviceTarget(s)));
  const roll = () => { let r = r0() * ok.reduce((n, [, K]) => n + K.w, 0); for (const [k, K] of ok) { r -= K.w; if (r < 0) return k; } return ok.at(-1)[0]; };
  let k = roll();
  if (k !== 'raider' && k === s.net.lastKind) k = roll(); // the same special twice in a row is rarer
  return k;
}

// A scout killed at home (events.mjs): the next invasion's server and kind, rolled now on r (the event's own dice, so
// the game's rolls don't move), and SCOUTED.levels off it when it sets out. Returns { name, from } or null.
export function scoutNext(s, r) {
  const net = (s.net ||= { wall: null, next: null }), all = tame(s);
  if (!all.length) return null;
  const loc = r() < 0.5 ? [...all].sort((a, b) => (b.level || 1) - (a.level || 1))[0] : pickSender(all, r()); // half the time your strongest, as ever
  const kind = rollKind(s, loc, false, r);
  net.scouted = { levels: SCOUTED.levels, from: loc.id, kind };
  return { name: KINDS[kind].name, from: loc.name, kind };
}

// One invasion sets out from a location you've found, at that location's level.
// Sometimes it comes from a server you haven't found, through the one it hangs off.
// want: { kind, away } (developer invade <kind>, the away clock).
function depart(s, want = {}) {
  // Scouted (scoutNext): from that server, of that kind, and weaker. A server since detached: just weaker.
  const sc = s.net?.scouted || null;
  if (sc) {
    s.net.scouted = null;
    const from = !want.from && !want.kind && tame(s).find((l) => l.id === sc.from);
    if (from) want = { ...want, from, ...(want.away && KINDS[sc.kind]?.online ? {} : { kind: sc.kind }) };
  }
  const weak = sc?.levels || 0;
  let o = want.from ? { loc: want.from } : pickOrigin(s);
  // Half the time it's the strongest server you've connected to that sends it.
  if (o.loc && !want.from && rand(s) < 0.5) o = { loc: tame(s).sort((a, b) => (b.level || 1) - (a.level || 1))[0] || o.loc };
  const h = o.hidden || null;
  const via = h && s.locations.find((l) => l.id === h.via);
  if (h) h.seen = true; // an invader from it shows its family
  // From a server you haven't found, it comes through the one it hangs off: at that server's level and floor (what
  // you've connected to sets what comes at you).
  let loc = h ? { id: h.via, name: 'an unknown server', family: h.family, level: Math.min(h.level, via?.level || h.level), depth: via?.depth || 1, road: h.depth } : o.loc;
  if (!loc) return null;
  const net = s.net;
  let kind = want.kind && KINDS[want.kind] ? want.kind : rollKind(s, loc, !!want.away);
  const rolled = want.quirk || (net.seq && QUIRKED.kinds.includes(kind) && rand(s) < QUIRKED.chance ? quirkOf(loc.family) : null); // the first one is plain
  const quirk = ['hoard', 'nest'].includes(rolled) ? rolled : null; // the quirks an invasion carries (Hidden only ever moved it at the wall)
  const service = kind === 'saboteur' ? serviceTarget(s) : null;
  if (kind === 'saboteur' && !service) kind = 'raider';
  const K = KINDS[kind];
  const src = h ? null : loc; // its server's special and programs move its level and its road (specials.mjs)
  const level = clampLv((loc.level || 1) + (KINDS[kind].lvl || 0) - weak + sendShift(src));
  const front = unit(s, loc, level, quirk === 'hoard' ? 'armored' : undefined);
  const queue = [];
  if (kind === 'pack') for (let i = 1; i < K.size; i++) { const u = unit(s, loc, level); if (u.name === front.name) u.name += ` #${i + 1}`; queue.push(u); }
  if (kind === 'pair') { const others = tame(s).filter((l) => l.id !== loc.id), b = others[Math.floor(rand(s) * others.length)] || loc; queue.push(unit(s, b, clampLv((b.level || 1) - weak + sendShift(b)))); }
  if (quirk === 'nest') queue.push(unit(s, loc, clampLv(level + QUIRKED.brood)));
  const bounty = Math.round((kind === 'pack' ? K.bounty * K.size : KINDS[kind].bounty) * (quirk === 'hoard' ? QUIRKED.hoard : 1)) + (quirk === 'nest' ? 1 : 0);
  const total = Math.round(travelMs(s, loc.road || loc.depth) * (KINDS[kind].travel || 1) * sendTravel(src));
  net.seq = (net.seq || 0) + 1;
  net.lastKind = kind;
  (net.seen ||= {})[loc.family] = (net.seen[loc.family] || 0) + 1;
  const fromName = h && loc.name === 'an unknown server' ? `an unknown server past ${via?.name}` : loc.name;
  s.invasion = { id: 'inv' + net.seq, kind, quirk, from: loc.id, fromName, hidden: h?.id || null, ...front, name: kind === 'champion' ? `CHAMPION ${front.name}` : front.name,
    queue, size: queue.length + 1,
    service, state: 'travel', left: total, total, hp: 1, chipAcc: 0, bounty, grown: 0, ...(weak ? { scouted: weak } : {}) };
  const inv = s.invasion;
  const what = `${inv.name} (level ${level}${front.mutation ? ', ' + MUTATIONS[front.mutation].name : ''})`;
  emit(s, 'invader', `${K.name === 'Raider' ? 'Invasion' : K.name.toUpperCase()}: ${what} left ${fromName}. At HOME in ${fmtLeft(total)}.${tellOf(s, inv) ? ' ' + tellOf(s, inv) : ''}`, { invader: inv.id, kind });
  return inv;
}

function arrive(s) {
  const inv = s.invasion;
  inv.left = 0;
  inv.state = 'breach';
  sabotage(s, inv);
  const b = bountyOf(s, inv);
  emit(s, 'wall-breach', `${inv.name} reached HOME. −${pct(chipRate())} Integrity a minute. Bounty ${codeText(b.now, b.code)}, up to ${b.max} if you let it sit.`, { invader: inv.id });
}

// Pay the bounty in its family's code, and roll for a daemon (a capture brings a sure one). intercepted: caught on
// its road. Returns the code paid.
function payOut(s, inv, how, intercepted = false) {
  const b = bountyOf(s, inv), n = b.now;
  (s.materials ||= {})[b.code] = (s.materials[b.code] || 0) + n;
  s.net.streak = streakOf(s) + 1;
  const caps = [b.capture && `${inv.name} leaves a capture: `].filter(Boolean);
  for (const why of caps) { daemonDrop(s, inv, 'capture', why); capture(s, Math.max(inv.level, hackerLevel(s) - 2), why); }
  if (!caps.length) daemonDrop(s, inv, intercepted ? 'intercept' : 'you', `${inv.name} leaves a daemon: `);
  return n;
}
// The chance a stop leaves a daemon: by how it was stopped, plus the pity of every stop in a row without one.
export const daemonChance = (s, how) => Math.min(1, (DAEMON_DROP[how] ?? DAEMON_DROP.you) + DAEMON_DROP.pity * (s.pity?.daemon || 0));
// A daemon of the invasion's band at its level, or a miss (the next chance is better). Returns gainDaemon's result.
export function daemonDrop(s, inv, how, why = '') {
  const p = (s.pity ||= {}), from = !inv.hidden && (s.locations || []).find((l) => l.id === inv.from);
  if (['you', 'intercept'].includes(how) && hasSpecial(from, 'volatile') && DAEMON_DROP.volatile > DAEMON_DROP[how]) how = 'volatile'; // a Volatile server's invader you kill
  if (rand(s) >= daemonChance(s, how)) { p.daemon = (p.daemon || 0) + 1; return null; }
  p.daemon = 0;
  return gainDaemon(s, rollDaemon(s, inv.level), inv.level, { why, family: inv.family });
}
export function breakStreak(s, why) {
  const n = streakOf(s);
  if (!s.net) return;
  s.net.streak = 0;
  if (n > 1) emit(s, 'info', `Your streak of ${n} ended: ${why}.`);
}

// You killed the one in front (combat.mjs finish): the next of a pack steps up, or it's over and the bounty is yours.
export function invaderDown(s, inv) {
  inv.mine = (inv.mine || 0) + 1;
  if (nextUp(s, inv, 'You took down')) return;
  const intercepted = inv.state === 'travel', k = bountyCode(inv), n = bountyOf(s, inv).now;
  emit(s, 'code', `Bounty: +${codeText(n, k)}.`, { gains: { [k]: n } }); // its row on the fight's card
  payOut(s, inv, 'you', intercepted);
  contractDid(s, 'hold');
  endInvasion(s, `${inv.name} is gone ${intercepted ? 'before it reached HOME' : 'from HOME'}: +${codeText(n, k)}.`, {});
  unsabotage(s);
}

// ---------- the saboteur ----------
// At HOME, it shuts off one of your services until you kill it.
function sabotage(s, inv) {
  if (inv.kind !== 'saboteur' || inv.sabotaged || s.net.sabotage) return;
  const id = inv.service && s.services?.[inv.service] ? inv.service : serviceTarget(s);
  if (!id) return;
  inv.service = id; inv.sabotaged = true;
  s.net.sabotage = { id, v: s.services[id], inv: inv.id };
  delete s.services[id];
  syncServer(s);
  emit(s, 'sabotage', `${inv.name} shut off your ${SERVICES[id].name}. Kill it to bring it back.`, { invader: inv.id });
}
export function unsabotage(s) {
  const x = s.net?.sabotage;
  if (!x || s.invasion?.id === x.inv) return;
  s.net.sabotage = null;
  (s.services ||= {})[x.id] = Math.max(s.services[x.id] || 0, x.v);
  syncServer(s);
  emit(s, 'info', `${SERVICES[x.id]?.name || x.id} is running again.`);
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
// A capture's extra roll: one of the invasion-only uniques, one you don't have first. Nothing more when it misses:
// the sure daemon is the capture.
export function capture(s, level, why) {
  const pool = invasionUniques().filter((u) => u.level <= level + 2);
  if (!pool.length) return null;
  if (rand(s) < captureChance(s)) {
    (s.pity ||= {}).invasion = 0;
    const fresh = pool.filter((u) => !s.collection?.[u.id]), heard = fresh.filter((u) => u.id === s.listen), from = heard.length ? heard : fresh.length ? fresh : pool;
    return addItem(s, uniqueItem(from[Math.floor(rand(s) * from.length)], level, () => rand(s)), why);
  }
  (s.pity ||= {}).invasion = (s.pity.invasion || 0) + 1;
  return null;
}

// ---------- intercepting ----------
// Fight the invader yourself, on its road or at HOME: as worn as a fight you lost left it, armor intact, a full kill's worth. A waiting gate intrusion is
// parked and comes back when you next engage. A champion is elite-grade. ('jack in' is the same.)
export function jackIn(s) {
  const first = s.serial;
  const inv = s.invasion;
  if (!inv) warn(s, s.locations?.length ? 'Nothing is coming for HOME right now.' : 'Nothing is coming for HOME. Invasions come from servers you have connected to.');
  else if (s.run) warn(s, 'You\'re out on a run. Jack out first, then intercept it.');
  else if (active(s)) warn(s, fighting(s, inv) ? 'You are already fighting it.' : 'Finish this fight first.');
  else {
    const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
    const champ = inv.kind === 'champion' && inv.name.startsWith('CHAMPION');
    selectEncounter(s, inv.key, inv.seed, { level: inv.level, mutation: inv.mutation, strain: inv.strain, grade: inv.grade, quiet: true, ...(inv.floor ? { floor: inv.floor } : {}), ...(champ ? { elite: true, eliteHp: CHAMPION.hp, name: inv.name } : {}) });
    s.gate = gate || null;
    const e = s.encounter;
    e.invader = inv.id;
    if (champ) e.virus.champion = true;
    for (const p of e.virus.parts) p.integrity = Math.max(1, Math.round(p.max * inv.hp)); // as worn as a fight you lost left it
    emit(s, 'jack-in', inv.state === 'travel' ? `Intercepted ${inv.name} on its way to HOME.` : `Intercepted ${inv.name} at HOME.`, { invader: inv.id });
    command(s, 'engage');
  }
  return since(s, first);
}

// What a killed scout told you about the next one (scoutNext), as a sentence: '' when nothing.
export function scoutedLine(s) {
  const sc = s.net?.scouted, from = sc && (s.locations || []).find((l) => l.id === sc.from);
  return sc ? ` You killed its spotter: ${from ? `a ${KINDS[sc.kind].name.toLowerCase()} from ${from.name}, ` : ''}${sc.levels} levels weaker.` : '';
}
// invasions: what's coming, what it does, what it pays; your streak.
export function invasionsCommand(s) {
  const first = s.serial, inv = s.invasion, lines = [];
  if (!s.locations?.length) lines.push('Nothing comes for HOME until you find a location.');
  else if (inv) {
    const b = bountyOf(s, inv);
    const where = inv.state === 'travel' ? `on its way, ${fmtLeft(inv.left)} out` : 'at HOME';
    lines.push(`${labelOf(inv)}: ${inv.name}, level ${inv.level}, from ${inv.fromName}. It is ${where}.`);
    if (tellOf(s, inv)) lines.push(tellOf(s, inv));
    lines.push(`Kill it for ${codeText(b.now, b.code)} (up to ${b.max} if it sits at HOME).${b.capture ? ' A daemon comes with your kill.' : ''}${inv.state !== 'travel' ? ` Left alone, it leaves in ${fmtLeft(leavesIn(inv))}, unpaid.` : ''}`);
  } else if (s.net?.next > 0) lines.push(`The next invasion sets out in about ${fmtLeft(s.net.next)}.${scoutedLine(s)}`);
  lines.push(`Streak ${streakOf(s)}. The next stop pays ${Math.round((streakMult(s) - 1) * 100)}% more.`);
  for (const l of lines) emit(s, 'info', l);
  return since(s, first);
}

// ---------- old saves ----------
// v33: invasions have kinds, bounties and a streak. One already out becomes a raider.
export function invasionRestore(s, was) {
  if (was >= 33) return;
  const inv = s.invasion;
  if (inv) { inv.kind ||= 'raider'; inv.queue ||= []; inv.size ||= 1; inv.bounty ??= KINDS.raider.bounty; inv.grown ||= 0; inv.push ||= 0; }
}
// The wall is gone (v66): what was invested in it comes back, and an invasion out of a kind that's gone is a raider.
// Keyed on the fields (wallRestore, firewall.mjs).
export function wallgoneRestore(s) {
  wallRestore(s);
  const inv = s.invasion;
  if (!inv) return;
  if (inv.kind === 'scout' || inv.kind === 'thief') { inv.kind = 'raider'; delete inv.target; delete inv.mapLeft; }
  if (inv.state === 'siege' || inv.state === 'watch') inv.state = 'breach';
  delete inv.push; delete inv.marked; delete inv.cracked; delete inv.quiet;
  if (s.net) delete s.net.mark;
}

// Signatures were the wall's currency; they're gone. What you held becomes code, a unit (codeUnit at the old wall's
// base) for each, split over Cipher, Worm and Kernel as the wall's prices are. Keyed on the old field.
export function signatureRestore(s) {
  if (!('sigs' in s)) return;
  const n = Math.max(0, Math.floor(s.sigs || 0));
  delete s.sigs;
  if (!n) return;
  const each = Math.ceil((n * codeUnit(baseOf(s))) / 3), m = (s.materials ||= {});
  for (const k of ['cipher', 'worm', 'kernel']) m[k] = (m[k] || 0) + each;
  emit(s, 'info', `Signatures are gone. Your ${n} became ${each} each of Cipher, Worm and Kernel code.`);
}

// ---------- testing ----------
// developer invade [kind]: an invasion at HOME now.
export function developerNetwork(s, text) {
  const first = s.serial;
  const road = / road$/.test(text), kind = text.split(' ')[2] === 'road' ? undefined : text.split(' ')[2]; // road: it sets out on its road instead of arriving now
  if (text.startsWith('developer invade')) {
    if (kind && !KINDS[kind] && !QUIRKS[kind]) warn(s, `developer invade [${Object.keys(KINDS).join('|')}|${Object.keys(QUIRKS).join('|')}]`);
    else if (!s.locations?.length) warn(s, 'Find a location first (developer location worm).');
    else if (s.invasion) warn(s, `${s.invasion.name} is already ${s.invasion.state === 'travel' ? 'on its way' : 'at HOME'}.`);
    else {
      const q = QUIRKS[kind] ? kind : null, from = q ? tame(s).find((l) => quirkOf(l.family) === q) : null;
      if (q && !from) warn(s, `None of your servers has the ${QUIRKS[q].name} quirk.`);
      else { const any = !q && !tame(s).length ? [...(s.locations || [])].filter((l) => !l.rogue && !l.member && !l.zone).sort((a, b) => (b.level || 1) - (a.level || 1))[0] : null; const inv = depart(s, q ? { kind: 'raider', quirk: q, from } : { kind, ...(any ? { from: any } : {}) }); if (inv && inv.kind !== 'thief' && !road) arrive(s); } // a developer's comes even from a server you've only found
    }
  }
  return since(s, first);
}

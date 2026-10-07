// Consortium: hackers who merged their servers. Each member keeps their own home server and
// everything on it; merging runs a trunk line between the home servers, so every member can reach
// every other member's servers: their outposts, the servers they've traced, their rogue servers.
// Simulated members until there's a server (everyone says yes, and their networks are made up
// from their handles, kept near your level so there's something to play).
//
// - Shared ground: every member server, and your own outposts and rogue servers. Members online
//   turn up in its folders (presence.mjs) and join a fight in the folder they're in (crew.mjs).
//   Nobody outside the consortium is there, so nobody can take your kills.
// - Personal: credits, items, harvesters, stockpiles, your home server. Home intrusions stay solo.
//   What you find on a member's server is yours; their natives come back after a while.
// - Sieges: natives lay siege to members' outposts now and then, and invaders reach members' walls
//   while they're away. Anyone can defend for a bounty. Nobody does, and a member may still deal
//   with it; if not, the outpost goes into lockdown (no harvesting for a while) or the member's
//   server crashes and reboots, occupied by the invader's processes: anyone can connect and clear
//   them to end it sooner. Nothing is ever lost, only time.
// - The travelling virus: a lost siege or a crash sends the virus on along the trunk line to
//   another outpost (a member's or yours), a level stronger each hop, at most CONSORTIUM.roam.hops.
//   Intercept it for a growing bounty.
// - Away: in a consortium, your own wall and outposts keep being tested while you're logged off
//   (invasion.mjs, outpost.mjs). Your wall decides; members sometimes help.
// - Size: each merged server makes the network bigger and the consortium better (CONSORTIUM.tiers).
// - Leaving (or being kicked) cuts the trunk line. You lose nothing of your own.
// Pure: state in, events out. run.mjs routes the `consortium` command (and `guild`, the old name).
import { emit, warn, rand, hooks, hackerLevel, selectEncounter, command, gainCode, gainXp, xpFor, active, holding } from './combat.mjs';
import { createLocation, SERVER, FAMILIES, variantFor } from './data.mjs';
import { seeded, codeOf, MATERIALS } from './gear.mjs';
import { profileOf, PRESENCE, online, simOn } from './presence.mjs';
import { ROGUE, rogueSpawns } from './rogue.mjs';
import { OUTPOST, scrape } from './outpost.mjs';

export const CONSORTIUM = {
  max: 20, // home servers, yours included
  nameMax: 24,
  perMember: [1, 4], // servers on a member's network (simulated)
  near: 3, // simulated: a member's servers sit at most this many levels above yours
  resetMs: 20 * 60000, // a member's server you left gets its natives back after this
  siegeEveryMs: [10 * 60000, 18 * 60000], // logged-on time between sieges on members' outposts
  siegeMs: 8 * 60000, // how long you have to defend one
  inviteEveryMs: [5 * 60000, 12 * 60000], // simulated: how often someone invites you, while you're in none
  inviteMs: 10 * 60000, // how long an invite stays open
  bounty: (L) => ({ credits: 30 + 8 * L, code: 2 + Math.floor(L / 6) }),
  lockdownMs: 2 * 3600000, // a member's outpost after a lost siege (logged-on time while simulated)
  raidEveryMs: [15 * 60000, 25 * 60000], // simulated: an invader at an away member's wall
  raidMs: 8 * 60000, // how long you have to stop it
  rebootMs: 2 * 3600000, // a crashed server (yours while away: real time) reboots this long, unless cleared
  help: 0.5, // chance a member deals with a siege or invader nobody defended
  roam: { travelMs: 10 * 60000, hops: 3, bounty: 0.5 }, // the travelling virus: +50% bounty a hop
  homeRooms: ['services', 'daemons', 'vault', 'logs', 'cache', 'wall'], // a crashed home server's folders
  // The dividend: every member's outpost pays each other member a share of what it produces, in
  // kind (a Siphon's or Tap's code, a Scraper's finds), real time and offline too. The owner keeps
  // their whole stockpile: the share comes on top. It fills a small stock per outpost, up to
  // capHours' worth; an outpost under siege pays nothing.
  dividend: { share: 0.25, capHours: 12 },
  // The bigger the network (home servers merged), the better for everyone.
  tiers: [
    { at: 3, name: 'Linked', rule: '+10% outpost yield and dividend', yield: 0.1 },
    { at: 5, name: 'Mesh', rule: 'Invasion bounties doubled', bounty: 2 },
    { at: 8, name: 'Backbone', rule: 'A trunk rogue server opens on the network', trunk: true },
    { at: 12, name: 'Grid', rule: '+1 outpost slot and firewall +2 levels', bandwidth: 1, wall: 2 },
  ],
  names: ['Halyard', 'Null Choir', 'Black Lattice', 'Copperline', 'Saltmarsh Ring', 'Dead Channel', 'Quiet Meridian', 'Glasshouse', 'Low Signal', 'Tinroof'],
};

// A number from a string: the same handle always makes the same network.
function strSeed(text, n = 0) {
  let h = 2166136261 ^ n;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) || 1;
}
const between = (s, [lo, hi]) => lo + Math.floor(rand(s) * (hi - lo));

export const consortiumOf = (s) => {
  // Saves from before: a guild becomes a consortium (its claimed territory is everyone's now anyway).
  if (s.guild && !s.consortium) { s.consortium = { name: s.guild.name, founder: 'you', members: [...(s.guild.members || [])], servers: [] }; delete s.guild; buildNets(s); }
  return s.consortium || null;
};
export const isMember = (s, h) => !!consortiumOf(s)?.members.includes(h);
export const sizeOf = (s) => (consortiumOf(s) ? consortiumOf(s).members.length + 1 : 0);
export const tiersOf = (s) => CONSORTIUM.tiers.filter((t) => sizeOf(s) >= t.at);
export const nextTier = (s) => (consortiumOf(s) ? CONSORTIUM.tiers.find((t) => sizeOf(s) < t.at) || null : null);
const perk = (s, key, none) => tiersOf(s).reduce((v, t) => t[key] ?? v, none);
export const consortiumYield = (s) => 1 + perk(s, 'yield', 0);
export const consortiumBandwidth = (s) => perk(s, 'bandwidth', 0);
export const consortiumWall = (s) => perk(s, 'wall', 0); // firewall levels (firewall.mjs wallBonus)
// Nobody defended it: maybe a member dealt with it anyway (simulated). A handle, or null.
export function memberHelp(s) {
  const c = consortiumOf(s);
  if (!c?.members.length || rand(s) >= CONSORTIUM.help) return null;
  return c.members[Math.floor(rand(s) * c.members.length)];
}
// Members' servers (and the trunk rogue server), and the servers that are anyone's.
export const memberServers = (s) => consortiumOf(s)?.servers || [];
export const serversOf = (s, h) => memberServers(s).filter((l) => l.member === h);
// Shared ground: members' servers, plus your own outposts and rogue servers.
export const groundOf = (s) => (consortiumOf(s) ? [...memberServers(s), ...(s.locations || []).filter((l) => l.takenOver || l.rogue)] : []);
export const isGround = (s, loc) => !!loc && groundOf(s).some((l) => l.id === loc.id);
export const memberLevel = (s, h) => Math.max(1, Math.min(profileOf(h).level, hackerLevel(s) + CONSORTIUM.near));

// A member's network: 1–4 servers off their home server. The first is always an outpost; the rest
// are outposts, rogue servers or servers they've traced.
function buildNet(s, h) {
  const r = seeded(strSeed(h, 1)), L = memberLevel(s, h);
  const fams = Object.keys(FAMILIES), [lo, hi] = CONSORTIUM.perMember;
  const n = lo + Math.floor(r() * (hi - lo + 1));
  const taken = new Set([...(s.locations || []), ...memberServers(s)].map((l) => l.id));
  const out = [];
  for (let i = 0; i < n; i++) {
    let seed = strSeed(h, 10 + i) % 100000;
    const family = fams[Math.floor(r() * fams.length)];
    let loc = createLocation(family, seed, 1);
    while (taken.has(loc.id)) loc = createLocation(family, ++seed, 1);
    taken.add(loc.id);
    loc.level = SERVER.locationLevel(L, 1);
    loc.member = h;
    loc.trait = null;
    const roll = i === 0 ? 0 : r();
    if (roll < 0.55) loc.held = { kind: ['siphon', 'scraper', 'tap'][Math.floor(r() * 3)] }; // their outpost
    else if (roll < 0.85) { loc.rogue = { kind: Object.keys(ROGUE.kinds)[Math.floor(r() * 3)] }; loc.template = 'rogue'; loc.quirk = null; loc.spawns = {}; loc.serial = 0; }
    out.push(loc);
  }
  return out;
}
// Every member has their network; the trunk rogue server is there while the consortium is big enough.
export function buildNets(s) {
  const c = consortiumOf(s);
  if (!c) return;
  for (const h of c.members) if (!c.servers.some((l) => l.member === h)) c.servers.push(...buildNet(s, h));
  const trunk = c.servers.find((l) => l.trunk);
  if (perk(s, 'trunk', false) && !trunk) {
    let seed = strSeed(c.name, 7) % 100000, loc = createLocation('worm', seed, 1);
    while ([...(s.locations || []), ...c.servers].some((l) => l.id === loc.id)) loc = createLocation('worm', ++seed, 1);
    Object.assign(loc, { id: 'trunk', name: 'TRUNK', trunk: true, level: SERVER.locationLevel(hackerLevel(s), 1), trait: null, quirk: null, template: 'rogue', rogue: { kind: 'pit' }, spawns: {}, serial: 0 });
    c.servers.push(loc);
  } else if (!perk(s, 'trunk', false) && trunk && s.run?.loc !== trunk.id) c.servers = c.servers.filter((l) => l !== trunk);
}
const dropMember = (s, h) => { const c = consortiumOf(s); c.members = c.members.filter((x) => x !== h); c.servers = c.servers.filter((l) => l.member !== h); buildNets(s); };
const onTheirs = (s, h) => { const l = memberServers(s).find((x) => x.id === s.run?.loc); return l && (h ? l.member === h : true); };

// Connecting to a member's server you left a while ago: their natives are back.
// fileInfo: run.mjs's, passed in (importing it here would loop the modules).
export function arrive(s, loc, fileInfo, now = hooks.now?.() ?? Date.now()) {
  if (!loc?.member || loc.rogue) return;
  // A reset gives the fights and the caches back, not the loot: the vault stays open (its XP was paid once),
  // and anything but a credit or code cache you pulled stays pulled.
  if (loc.lastRun && now - loc.lastRun >= CONSORTIUM.resetMs) {
    const kept = Object.fromEntries(Object.entries(loc.state?.taken || {}).filter(([path]) => { const i = path.lastIndexOf('/'); return !['credits', 'code'].includes(fileInfo(loc, path.slice(0, i) || '/', path.slice(i + 1))?.kind); }));
    loc.state = { cleared: {}, unlocked: { ...(loc.state?.unlocked || {}) }, taken: kept };
  }
  loc.lastRun = now;
}

// The dividend: what one member outpost pays you an hour (code for a Siphon or Tap, rolls for a Scraper).
export function dividendOf(s, loc) {
  const k = OUTPOST.kinds[loc.held?.kind];
  if (!k || loc.held.siege || loc.held.lockdown || rebooting(s, loc.member)) return 0;
  return k.rate(loc.level || 1) * CONSORTIUM.dividend.share * consortiumYield(s);
}
const dividendCap = (s, loc) => dividendOf(s, { ...loc, held: { kind: loc.held.kind } }) * CONSORTIUM.dividend.capHours;
// What the pool holds and what it gains an hour: { code: { material: n }, rolls: n }.
function tally(s, f) {
  const out = { code: {}, rolls: 0 };
  for (const l of memberServers(s).filter((x) => x.held)) {
    const n = f(l);
    if (l.held.kind === 'scraper') out.rolls += n;
    else out.code[codeOf(l.family)] = (out.code[codeOf(l.family)] || 0) + n;
  }
  return out;
}
export const dividendRate = (s) => tally(s, (l) => dividendOf(s, l));
// Each member outpost's part of the dividend, for the table on the Consortium page.
export const dividendSources = (s) => memberServers(s).filter((l) => l.held).map((l) => ({ id: l.id, name: l.name, member: l.member, kind: l.held.kind, material: l.held.kind === 'scraper' ? null : codeOf(l.family), rate: dividendOf(s, l), waiting: l.held.share || 0, cap: dividendCap(s, l), stopped: !dividendOf(s, l) }));
export const dividendWaiting = (s) => tally(s, (l) => Math.floor(l.held.share || 0));
export const dividendText = (t, digits = 0) => [...Object.entries(t.code).filter(([, n]) => n >= (digits ? 0.05 : 1)).map(([m, n]) => `${digits ? n.toFixed(digits) : n} ${MATERIALS[m].name}`), ...(t.rolls >= (digits ? 0.05 : 1) ? [`${digits ? t.rolls.toFixed(digits) : t.rolls} ${t.rolls === 1 ? 'find' : 'finds'}`] : [])].join(', ');
const shareFull = (s) => memberServers(s).some((l) => l.held && dividendCap(s, l) && (l.held.share || 0) >= dividendCap(s, l));
// Fill each member outpost's share for the time since the last tick (real time: closed game included).
function accrue(s, now) {
  const c = consortiumOf(s);
  const hours = Math.max(0, now - (c.shareAt ?? now)) / 3600000;
  c.shareAt = now;
  if (!hours) return;
  for (const l of memberServers(s)) if (l.held) l.held.share = Math.min(dividendCap(s, l), (l.held.share || 0) + dividendOf(s, l) * hours);
}
// Take the whole units from every member outpost; the fractions stay to keep filling.
export function collectShare(s) {
  const c = consortiumOf(s), code = {}, finds = [];
  for (const l of memberServers(s)) {
    const n = Math.floor(l.held?.share || 0);
    if (!n) continue;
    l.held.share -= n;
    if (l.held.kind === 'scraper') finds.push(scrape(s, l, n, l.level || 1, 0, `${c.name} dividend: `));
    else code[codeOf(l.family)] = (code[codeOf(l.family)] || 0) + n;
  }
  if (!Object.keys(code).length && !finds.length) return warn(s, 'Nothing in the dividend yet.');
  if (Object.keys(code).length) gainCode(s, code, '');
  const got = [...Object.entries(code).map(([m, n]) => `${n} ${MATERIALS[m].name}`), ...finds.filter(Boolean)].join(', ');
  emit(s, 'harvest', `${c.name} dividend: ${got || 'a protocol'}.`);
}

// Occupation: a crashed home server, rebooting. It stays open: the invader's processes sit in its
// folders (no respawns, like a rogue server's), and clearing them all ends the reboot early.
export function occupy(s, { id, name, member = null, family, level, seed }) {
  const loc = createLocation(family, seed % 100000, 1);
  Object.assign(loc, { id, name, member, home: true, level, trait: null, quirk: null, template: 'rogue', rogue: { kind: 'nest' }, rooms: CONSORTIUM.homeRooms, spawns: {}, serial: 0, occupied: { left: CONSORTIUM.rebootMs } });
  rogueSpawns(s, loc); // the invader's processes move in
  return loc;
}
export const rebooting = (s, h) => !!h && memberServers(s).some((l) => l.home && l.member === h && !l.occupied.cleared);
// Every process in an occupied server is down (rogue.mjs rogueKill).
export function occupationCleared(s, loc) {
  if (loc.occupied.cleared) return;
  loc.occupied.cleared = true;
  gainXp(s, xpFor(s, loc.level || 1, 2), `${loc.name} cleared`, 'fight');
  if (!loc.member) {
    s.degraded = null;
    return emit(s, 'rebooted', 'OCCUPATION CLEARED: your server is back online.');
  }
  pay(s, loc.level || 1, 1, loc.family, `${loc.member}'s server is back online thanks to you.`);
}
// Occupations that are over (cleared or rebooted), once you're not standing in them.
function tidy(s) {
  const here = s.run?.loc;
  if (s.occupation && (s.occupation.occupied.cleared || !s.degraded) && here !== s.occupation.id) s.occupation = null;
  const c = consortiumOf(s);
  if (c) c.servers = c.servers.filter((l) => !l.home || here === l.id || (!l.occupied.cleared && l.occupied.left > 0));
}

// A bounty: credits and the family's code, times k (and Mesh's doubling).
export function bountyOf(s, L, k = 1) {
  const b = CONSORTIUM.bounty(L), mk = perk(s, 'bounty', 1);
  return { credits: Math.round(b.credits * k * mk), code: Math.round(b.code * k * mk) };
}
function pay(s, L, k, family, text) {
  const { credits, code } = bountyOf(s, L, k), m = codeOf(family);
  s.server.credits += credits;
  gainCode(s, { [m]: code }, '');
  gainXp(s, xpFor(s, L, 1), 'consortium bounty', 'fight');
  emit(s, 'outpost-held', `${text} Bounty: +${credits} credits, +${code} ${MATERIALS[m].name}.`);
}

// The travelling virus: from a lost siege or a crash, on along the trunk line to another outpost.
// prev: hops it has already made.
const outpostsOnNet = (s) => [...memberServers(s).filter((l) => l.held && !l.held.siege && !l.held.lockdown && !rebooting(s, l.member)), ...(s.locations || []).filter((l) => l.outpost?.h && !l.outpost.siege && !l.outpost.lockdown)];
export function roam(s, from, prev = 0) {
  const c = consortiumOf(s);
  if (!c || c.roamer) return;
  const hop = prev + 1;
  if (hop > CONSORTIUM.roam.hops) return emit(s, 'info', `The virus that took ${from.name} burns out on the trunk line.`);
  const targets = outpostsOnNet(s).filter((l) => l.id !== from.id);
  if (!targets.length) return;
  const to = targets[Math.floor(rand(s) * targets.length)];
  const level = Math.max(from.level || 1, to.level || 1) + 1;
  c.roamer = { name: NATIVE[from.family].toUpperCase(), family: from.family, level, hop, from: from.id, fromName: from.name, to: to.id, left: CONSORTIUM.roam.travelMs, total: CONSORTIUM.roam.travelMs, seed: (Math.floor(rand(s) * 2 ** 31) >>> 0) || 1 };
  emit(s, 'consortium-roam', `Invasion on the trunk line: ${c.roamer.name} (lv ${level}) left ${from.name} for ${to.member ? `${to.member}'s` : 'your'} outpost on ${to.name}. Intercept it for a bounty.`, { location: to.id });
}
function roamerArrives(s) {
  const c = consortiumOf(s), r = c.roamer;
  c.roamer = null;
  let to = [...memberServers(s), ...(s.locations || [])].find((l) => l.id === r.to);
  if (!to || !outpostsOnNet(s).includes(to)) to = outpostsOnNet(s).find((l) => l.id !== r.from); // its target is busy: the next one
  if (!to) return emit(s, 'info', `${r.name} finds nowhere to land and burns out.`);
  const siege = { left: to.held ? CONSORTIUM.siegeMs : OUTPOST.siegeMs, seed: r.seed, hop: r.hop };
  if (to.held) { to.held.siege = siege; emit(s, 'consortium-siege', `Invasion at ${to.member}'s outpost on ${to.name}: ${r.name}, a level stronger. Defend it within ${CONSORTIUM.siegeMs / 60000} minutes for a bounty.`, { location: to.id }); }
  else { to.outpost.siege = siege; emit(s, 'outpost-siege', `Invasion at your outpost on ${to.name}: ${r.name}, down the trunk line. Defend it within ${OUTPOST.siegeMs / 60000} minutes of play.`, { location: to.id }); }
}

// The network clock (logged-on time): sieges on members' outposts, and (simulated) invites. now:
// the real time, for the dividend.
export function tickConsortium(s, dt, now = hooks.now?.() ?? Date.now()) {
  const first = s.serial;
  const c = consortiumOf(s), net = (s.consortiumNet ||= {});
  tidy(s);
  if (c) {
    const was = shareFull(s);
    accrue(s, now);
    if (!was && shareFull(s)) emit(s, 'info', `${c.name}'s dividend is full: collect it from the people panel.`);
  }
  if (!c) {
    const inv = s.consortiumInvite;
    if (inv) { inv.left -= dt; if (inv.left <= 0) { s.consortiumInvite = null; emit(s, 'info', `${inv.from}'s invite to ${inv.name} lapsed.`); } }
    else if (simOn(s) && hackerLevel(s) >= 2) {
      if (net.inviteNext == null) net.inviteNext = between(s, CONSORTIUM.inviteEveryMs);
      net.inviteNext -= dt;
      if (net.inviteNext <= 0) { net.inviteNext = null; invite(s); }
    }
    return s.logs.filter((e) => e.id > first);
  }
  for (const loc of memberServers(s)) {
    if (loc.home) { loc.occupied.left -= dt; if (loc.occupied.left <= 0 && !loc.occupied.cleared) { loc.occupied.cleared = true; emit(s, 'info', `${loc.member}'s server finished rebooting.`); } continue; }
    const ld = loc.held?.lockdown;
    if (ld && !holding(s, 'member', loc.id)) { ld.left -= dt; if (ld.left <= 0) { loc.held.lockdown = null; emit(s, 'info', `The lockdown on ${loc.member}'s ${loc.name} is over.`, { location: loc.id }); } }
    const sg = loc.held?.siege;
    if (!sg) continue;
    if (holding(s, 'member', loc.id)) continue; // the clock waits while you fight for it (not while paused)
    sg.left -= dt;
    if (sg.left > 0) continue;
    loc.held.siege = null;
    const who = memberHelp(s);
    if (who) { emit(s, 'info', `${who} stopped the invasion at ${loc.member}'s ${loc.name}.`, { location: loc.id }); continue; }
    loc.held.lockdown = { left: CONSORTIUM.lockdownMs, seed: sg.seed, hop: sg.hop || 0 };
    emit(s, 'consortium-lockdown', `LOCKDOWN: natives took ${loc.member}'s ${loc.name}. It pays nothing for a while. Retake it for a bounty.`, { location: loc.id });
    roam(s, loc, sg.hop || 0);
  }
  // An invader at an away member's wall (simulated).
  const raid = c.raid;
  if (raid && !holding(s, 'raid', true)) { // the raid waits while you fight it (not while the fight is paused)
    raid.left -= dt;
    if (raid.left <= 0) {
      c.raid = null;
      const who = memberHelp(s);
      if (who && who !== raid.member) emit(s, 'info', `${who} stopped ${raid.name} at ${raid.member}'s wall.`);
      else crashMember(s, raid);
    }
  } else if (!raid && c.members.length) {
    if (net.raidNext == null) net.raidNext = between(s, CONSORTIUM.raidEveryMs);
    net.raidNext -= dt;
    if (net.raidNext <= 0) {
      net.raidNext = null;
      const away = c.members.filter((h) => !rebooting(s, h));
      if (away.length) {
        const h = away[Math.floor(rand(s) * away.length)], fams = Object.keys(FAMILIES), family = fams[Math.floor(rand(s) * fams.length)];
        c.raid = { member: h, family, name: NATIVE[family].toUpperCase(), level: memberLevel(s, h) + 1, left: CONSORTIUM.raidMs, seed: (Math.floor(rand(s) * 2 ** 31) >>> 0) || 1 };
        emit(s, 'consortium-raid', `Invasion at ${h}'s wall: ${c.raid.name} (lv ${c.raid.level}), while they're away. Defend it within ${CONSORTIUM.raidMs / 60000} minutes for a bounty.`);
      }
    }
  }
  if (c.roamer) { c.roamer.left -= dt; if (c.roamer.left <= 0) roamerArrives(s); }
  const open = memberServers(s).filter((l) => l.held && !l.held.siege && !l.held.lockdown);
  if (!open.length) return s.logs.filter((e) => e.id > first);
  if (net.siegeNext == null) net.siegeNext = between(s, CONSORTIUM.siegeEveryMs);
  net.siegeNext -= dt;
  if (net.siegeNext <= 0) {
    net.siegeNext = between(s, CONSORTIUM.siegeEveryMs);
    const loc = open[Math.floor(rand(s) * open.length)];
    loc.held.siege = { left: CONSORTIUM.siegeMs, seed: (Math.floor(rand(s) * 2 ** 31) >>> 0) || 1 };
    emit(s, 'consortium-siege', `Invasion at ${loc.member}'s outpost on ${loc.name}: its natives. Defend it within ${CONSORTIUM.siegeMs / 60000} minutes for a bounty.`, { location: loc.id });
  }
  return s.logs.filter((e) => e.id > first);
}
// A member's server crashed: it reboots, occupied, and the virus moves on.
function crashMember(s, raid) {
  const c = consortiumOf(s), h = raid.member;
  const loc = occupy(s, { id: `${h}-home`, name: `${h.toUpperCase()}-HOME`, member: h, family: raid.family, level: raid.level, seed: raid.seed });
  c.servers = c.servers.filter((l) => l.id !== loc.id);
  c.servers.push(loc);
  emit(s, 'consortium-crash', `${raid.name} crashed ${h}'s server. It's rebooting for ${CONSORTIUM.rebootMs / 3600000} hours, occupied: connect and clear it to bring it back sooner. Their outposts pay nothing meanwhile.`, { location: loc.id });
  roam(s, loc, 0);
}

// Simulated: someone online invites you to merge with their consortium.
export function invite(s, from) {
  const on = online(s).map((x) => x.handle);
  const h = from || on[Math.floor(rand(s) * on.length)] || PRESENCE.pool[0];
  const r = seeded(strSeed(h, 3));
  const others = PRESENCE.pool.filter((x) => x !== h).map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).slice(0, 1 + Math.floor(r() * 4)).map((x) => x[1]);
  const name = CONSORTIUM.names[Math.floor(r() * CONSORTIUM.names.length)];
  s.consortiumInvite = { from: h, name, members: [h, ...others], left: CONSORTIUM.inviteMs };
  emit(s, 'consortium-invite', `${h} invites you to merge servers with ${name} (${others.length + 2} servers). consortium accept, or consortium decline.`);
}

// Everything that needs someone right now, most urgent first: { kind, title, detail, left, total,
// level, family, cmd, label, bounty, mine }. The Consortium page shows them as cards.
export function alertsOf(s) {
  const c = consortiumOf(s), out = [];
  if (!c) return out;
  const own = s.occupation && !s.occupation.occupied.cleared ? s.occupation : null;
  if (own) out.push({ kind: 'crash', title: 'Your server crashed', detail: `Rebooting. Clear its ${CONSORTIUM.homeRooms.length} folders to bring it back now.`, left: s.degraded?.until ? Math.max(0, s.degraded.until - (hooks.now?.() ?? Date.now())) : CONSORTIUM.rebootMs, total: CONSORTIUM.rebootMs, level: own.level, family: own.family, cmd: 'connect home', label: 'Connect', mine: true });
  for (const l of s.locations || []) if (l.outpost?.siege) out.push({ kind: 'siege', title: `Invasion at your outpost on ${l.name}`, detail: 'Your outpost. Lose it and it goes into lockdown.', left: l.outpost.siege.left, total: OUTPOST.siegeMs, level: l.level || 1, family: l.family, cmd: `outpost defend ${l.id}`, label: 'Defend', mine: true });
  if (c.raid) out.push({ kind: 'raid', title: `Invasion at ${c.raid.member}'s wall`, detail: `${c.raid.name}. They're away: stop it or their server crashes.`, left: c.raid.left, total: CONSORTIUM.raidMs, level: c.raid.level, family: c.raid.family, cmd: `consortium defend ${c.raid.member}`, label: 'Defend', bounty: bountyOf(s, c.raid.level) });
  if (c.roamer) { const r = c.roamer; out.push({ kind: 'roam', title: `Invasion on the trunk line: ${r.name}`, detail: `Hop ${r.hop} of ${CONSORTIUM.roam.hops}, from ${r.fromName}. It arrives as an invasion.`, left: r.left, total: r.total, level: r.level, family: r.family, cmd: 'consortium intercept', label: 'Intercept', bounty: bountyOf(s, r.level, 1 + CONSORTIUM.roam.bounty * r.hop) }); }
  for (const l of memberServers(s)) {
    if (l.held?.siege) { const hop = l.held.siege.hop || 0; out.push({ kind: 'siege', title: `Invasion at ${l.member}'s outpost on ${l.name}`, detail: `${OUTPOST.kinds[l.held.kind].name} outpost. Lose it and it goes into lockdown.`, left: l.held.siege.left, total: CONSORTIUM.siegeMs, level: (l.level || 1) + hop, family: l.family, cmd: `consortium defend ${l.id}`, label: 'Defend', bounty: bountyOf(s, (l.level || 1) + hop, 1 + CONSORTIUM.roam.bounty * hop) }); }
    else if (l.held?.lockdown) out.push({ kind: 'lockdown', title: `${l.member}'s ${l.name} in lockdown`, detail: 'It pays no dividend until it ends. Retake it from the natives.', left: l.held.lockdown.left, total: CONSORTIUM.lockdownMs, level: l.level || 1, family: l.family, cmd: `consortium defend ${l.id}`, label: 'Retake', bounty: bountyOf(s, l.level || 1) });
    else if (l.home && !l.occupied.cleared) out.push({ kind: 'crash', title: `${l.member}'s server crashed`, detail: `Rebooting. Clear its ${CONSORTIUM.homeRooms.length} folders to bring it back.`, left: l.occupied.left, total: CONSORTIUM.rebootMs, level: l.level || 1, family: l.family, cmd: `connect ${l.id}`, label: 'Connect', bounty: bountyOf(s, l.level || 1) });
  }
  const urgency = { raid: 0, siege: 1, roam: 2, crash: 3, lockdown: 4 };
  return out.sort((a, b) => (b.mine || 0) - (a.mine || 0) || urgency[a.kind] - urgency[b.kind] || a.left - b.left);
}

// Fights for the consortium: a siege or lockdown on a member's outpost (e.member), an invader at an
// away member's wall (e.raid), the travelling virus (e.roamer).
const NATIVE = { ransomware: 'cryptjack', worm: 'splinter', ghostroot: 'ghostroot' };
function fight(s, { family, level, seed }, tag, text, location) {
  const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
  const { strain, grade } = variantFor(family, level, 1, seed);
  selectEncounter(s, NATIVE[family], seed, { level, strain, grade, quiet: true });
  if (!s.encounter || s.encounter.phase === 'active') return;
  s.gate = gate && gate !== s.encounter ? gate : null;
  Object.assign(s.encounter, tag);
  emit(s, 'jack-in', `${text}: ${s.encounter.virus.name}.`, { location });
  command(s, 'engage');
}
// Called from finish() when a consortium fight ends in a win.
export function consortiumWon(s, e) {
  const c = consortiumOf(s);
  if (!c) return;
  if (e.raid && c.raid) { const r = c.raid; c.raid = null; return pay(s, r.level, 1, r.family, `${r.name} stopped at ${r.member}'s wall.`); }
  if (e.roamer && c.roamer) { const r = c.roamer; c.roamer = null; return pay(s, r.level, 1 + CONSORTIUM.roam.bounty * r.hop, r.family, `${r.name} intercepted on the trunk line.`); }
  const loc = memberServers(s).find((l) => l.id === e.member);
  if (loc?.held?.siege) { const hop = loc.held.siege.hop || 0; loc.held.siege = null; return pay(s, (loc.level || 1) + hop, 1 + CONSORTIUM.roam.bounty * hop, loc.family, `Invasion stopped at ${loc.member}'s ${loc.name}.`); }
  if (loc?.held?.lockdown) { loc.held.lockdown = null; return pay(s, loc.level || 1, 1, loc.family, `${loc.member}'s ${loc.name} retaken: its lockdown is over.`); }
}

const USAGE = 'consortium, consortium collect, consortium create <name>, consortium invite <handle>, consortium kick <handle>, consortium leave, consortium accept, consortium decline, consortium defend <server|handle>, consortium intercept';
// `consortium` and its verbs. raw: as typed (a name keeps its capitals).
export function consortiumCommand(s, raw) {
  const first = s.serial;
  const [verbRaw = '', ...more] = raw.split(' ').filter(Boolean);
  const verb = verbRaw.toLowerCase();
  const arg = verb === 'create' ? more.join(' ') : more.join(' ').toLowerCase();
  const c = consortiumOf(s), done = () => s.logs.filter((e) => e.id > first);
  if (!verb) {
    if (!c) emit(s, 'info', s.consortiumInvite ? `No consortium. ${s.consortiumInvite.from} invited you to ${s.consortiumInvite.name}: consortium accept.` : 'No consortium. consortium create <name>, or wait for an invite.');
    else {
      const t = tiersOf(s), nx = nextTier(s);
      emit(s, 'info', `${c.name}: ${sizeOf(s)} servers merged (${['you', ...c.members].join(', ')}). Dividend from ${memberServers(s).filter((l) => l.held).length} member outposts: ${dividendText(dividendRate(s), 1) || 'nothing'} an hour; waiting: ${dividendText(dividendWaiting(s)) || 'nothing'} (consortium collect). ${t.length ? 'Bonuses: ' + t.map((x) => x.rule).join(', ') + '.' : 'No bonuses yet.'}${nx ? ` At ${nx.at}: ${nx.rule.toLowerCase()}.` : ''}`);
    }
    return done();
  }
  if (verb === 'create') {
    if (c) return warn(s, `You're already in ${c.name}. consortium leave first.`), done();
    const name = arg.trim().slice(0, CONSORTIUM.nameMax);
    if (!name) return warn(s, 'consortium create <name>'), done();
    s.consortium = { name, founder: 'you', members: [], servers: [], shareAt: hooks.now?.() ?? Date.now() };
    s.consortiumInvite = null;
    emit(s, 'info', `Consortium ${name} founded. Invite people from the people panel to merge their servers with yours.`);
    return done();
  }
  if (verb === 'accept' || verb === 'decline') {
    const inv = s.consortiumInvite;
    if (!inv) return warn(s, 'No invite open.'), done();
    if (c) return warn(s, `You're already in ${c.name}.`), done();
    s.consortiumInvite = null;
    if (verb === 'decline') return emit(s, 'info', `You turned down ${inv.name}.`), done();
    s.consortium = { name: inv.name, founder: inv.from, members: inv.members, servers: [], shareAt: hooks.now?.() ?? Date.now() };
    buildNets(s);
    emit(s, 'consortium-merged', `MERGED with ${inv.name}. A trunk line runs from your home server to ${inv.members.length} others: ${memberServers(s).length} servers to reach. See the Map.`);
    return done();
  }
  if (!c) return warn(s, s.consortiumInvite ? 'No consortium yet: consortium accept, or consortium create <name>.' : 'No consortium. consortium create <name>'), done();
  if (verb === 'leave') {
    if (active(s) || onTheirs(s)) return warn(s, 'Jack out first.'), done();
    s.consortium = null;
    emit(s, 'info', `You left ${c.name}. The trunk line is cut; everything of yours stays yours.`);
    return done();
  }
  if (verb === 'invite') {
    if (!PRESENCE.pool.includes(arg)) return warn(s, `No hacker called ${arg}.`), done();
    if (c.members.includes(arg) || c.founder === arg) return warn(s, `${arg} is already in ${c.name}.`), done();
    if (sizeOf(s) >= CONSORTIUM.max) return warn(s, `${c.name} is full (${CONSORTIUM.max} servers).`), done();
    const before = tiersOf(s).length;
    c.members.push(arg); // simulated: everyone says yes
    buildNets(s);
    emit(s, 'consortium-merged', `${arg} merges their server into ${c.name}: ${serversOf(s, arg).length} more ${serversOf(s, arg).length === 1 ? 'server' : 'servers'} on the network.`);
    if (tiersOf(s).length > before) { const t = tiersOf(s).at(-1); emit(s, 'consortium-tier', `${c.name} is ${sizeOf(s)} servers: ${t.name}. ${t.rule}.`); }
    return done();
  }
  if (verb === 'kick') {
    if (c.founder !== 'you') return warn(s, `Only ${c.founder}, who founded ${c.name}, can kick.`), done();
    if (!c.members.includes(arg)) return warn(s, `${arg} isn't in ${c.name}.`), done();
    if (onTheirs(s, arg)) return warn(s, `You're on ${arg}'s server. Jack out first.`), done();
    dropMember(s, arg);
    emit(s, 'info', `${arg} is out of ${c.name}. Their trunk line is cut.`);
    return done();
  }
  if (verb === 'collect') { accrue(s, hooks.now?.() ?? Date.now()); collectShare(s); return done(); }
  if (verb === 'defend' || verb === 'intercept') {
    if (s.run) return warn(s, 'Jack out first.'), done();
    if (active(s)) return warn(s, 'Finish the fight first.'), done();
    if (verb === 'intercept') {
      const r = c.roamer;
      if (!r) return warn(s, 'Nothing on the trunk line.'), done();
      return fight(s, r, { roamer: true }, `Intercepting ${r.name} on the trunk line`, r.to), done();
    }
    if (c.raid && c.raid.member === arg) return fight(s, c.raid, { raid: true }, `Defending ${arg}'s wall`), done();
    const loc = memberServers(s).find((l) => l.id === arg || l.name.toLowerCase() === arg);
    if (!loc?.held) return warn(s, `Nothing to defend called "${arg}".`), done();
    const sg = loc.held.siege, ld = loc.held.lockdown;
    if (!sg && !ld) return warn(s, `${loc.name} has no invasion and isn't in lockdown.`), done();
    fight(s, { family: loc.family, level: (loc.level || 1) + (sg?.hop || 0), seed: (sg || ld).seed || loc.seed }, { member: loc.id }, `${sg ? 'Defending' : 'Retaking'} ${loc.member}'s ${loc.name}`, loc.id);
    return done();
  }
  warn(s, USAGE);
  return done();
}

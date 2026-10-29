// Consortium: hackers who merged their servers. Each member keeps their own home server and
// everything on it; merging runs a trunk line between the home servers, so every member can reach
// every other member's servers: the servers they hold, the ones they've traced, their rogue servers.
// Simulated members until there's a server (everyone says yes, and their networks are made up
// from their handles, kept near your level so there's something to play).
//
// - Shared ground: every member server, and the servers you hold and your rogue servers. Members online
//   turn up in its folders (presence.mjs) and join a fight in the folder they're in (crew.mjs).
//   Nobody outside the consortium is there, so nobody can take your kills.
// - Personal: credits, items, components, your home server. Home intrusions stay solo.
//   What you find on a member's server is yours; their natives come back after a while.
// - Threats: none of a member's servers can be lost. (Sieges on members' outposts, their lockdowns, the dividend and
//   the travelling virus went with outposts in R2: programs aren't income, so there is nothing to raid or share.)
// - Size: each merged server makes the network bigger and the consortium better (CONSORTIUM.tiers).
// - Leaving (or being kicked) cuts the trunk line. You lose nothing of your own.
// Pure: state in, events out. run.mjs routes the `consortium` command (and `guild`, the old name).
import { emit, warn, rand, hooks, hackerLevel, selectEncounter, command, gainCode, gainXp, xpFor, active, holding, syncRunSignal } from './combat.mjs';
import { createLocation, SERVER, FAMILIES, variantFor, BOSSES } from './data.mjs';
import { seeded, codeOf, MATERIALS } from './gear.mjs';
import { profileOf, PRESENCE, online, simOn } from './presence.mjs';
import { ROGUE, rogueSpawns } from './rogue.mjs';
import { leanPick, nativeStrain, makeLair, biasCode, NETWORK } from './network.mjs';

export const CONSORTIUM = {
  max: 20, // home servers, yours included
  nameMax: 24,
  perMember: [1, 4], // servers on a member's network (simulated)
  near: 3, // simulated: a member's servers sit at most this many levels above yours
  resetMs: 20 * 60000, // a member's server you left gets its natives back after this
  inviteEveryMs: [5 * 60000, 12 * 60000], // simulated: how often someone invites you, while you're in none
  inviteMs: 10 * 60000, // how long an invite stays open
  bounty: (L) => ({ credits: 30 + 8 * L, code: 2 + Math.floor(L / 6) }),
  raidEveryMs: [15 * 60000, 25 * 60000], // simulated: an invader at an away member's wall
  raidMs: 8 * 60000, // how long you have to stop it
  rebootMs: 2 * 3600000, // a crashed server (yours while away: real time) reboots this long, unless cleared
  help: 0.5, // chance a member deals with a siege or invader nobody defended
  roam: { travelMs: 10 * 60000, hops: 3, bounty: 0.5 }, // the travelling virus: +50% bounty a hop
  homeRooms: ['services', 'daemons', 'vault', 'logs', 'cache', 'wall'], // a crashed home server's folders
  // The bigger the network (home servers merged), the better for everyone.
  tiers: [
    { at: 3, name: 'Linked', rule: '+10% components on members\' servers', components: true },
    { at: 5, name: 'Mesh', rule: 'Invasion bounties doubled', bounty: 2 },
    { at: 8, name: 'Backbone', rule: 'A trunk rogue server opens on the network', trunk: true },
    { at: 12, name: 'Grid', rule: '+1 socket room on every server and firewall +2 levels', sockets: 1, wall: 2 },
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
// The ladder's perks for the rest of the game: Linked's components (sockets.mjs), Grid's socket room (netrooms.mjs).
export const consortiumLinked = (s) => !!perk(s, 'components', false);
export const consortiumSockets = (s) => perk(s, 'sockets', 0);
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
// Shared ground: members' servers, plus the servers you hold and your rogue servers.
export const groundOf = (s) => (consortiumOf(s) ? [...memberServers(s), ...(s.locations || []).filter((l) => l.takenOver || l.rogue)] : []);
export const isGround = (s, loc) => !!loc && groundOf(s).some((l) => l.id === loc.id);
export const memberLevel = (s, h) => Math.max(1, Math.min(profileOf(h).level, hackerLevel(s) + CONSORTIUM.near));

// A member's network: 1–4 servers off their home server: servers they hold or traced, and rogue servers.
function buildNet(s, h) {
  const r = seeded(strSeed(h, 1)), L = memberLevel(s, h);
  const fams = Object.keys(FAMILIES), [lo, hi] = CONSORTIUM.perMember;
  const n = lo + Math.floor(r() * (hi - lo + 1));
  const taken = new Set([...(s.locations || []), ...memberServers(s)].map((l) => l.id));
  const out = [];
  for (let i = 0; i < n; i++) {
    let seed = strSeed(h, 10 + i) % 100000;
    const family = leanPick(s, h, r()); // their network's lean (network.mjs)
    const floor = SERVER.floorFor(L); // a member's servers sit on their own floors (GAME_RULES.md "Consortium")
    let loc = createLocation(family, seed, floor);
    while (taken.has(loc.id)) loc = createLocation(family, ++seed, floor);
    taken.add(loc.id);
    loc.level = SERVER.keepUp(L, floor);
    loc.member = h;
    loc.trait = null;
    const roll = i === 0 ? 0 : r();
    if (roll < 0.55) r(); // (was their outpost's kind: the roll stays, so a handle keeps its network)
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
  // Each member's lair (network.mjs): their native boss, on their network, from NETWORK.lairFrom.
  for (const h of c.members) {
    const L = memberLevel(s, h), have = c.servers.find((l) => l.id === `${h}-lair`);
    if (have) { have.level = L; continue; }
    if (L < NETWORK.lairFrom) continue;
    const lair = makeLair(s, h, L, `${h}-lair`, '');
    if (!lair) continue;
    lair.name = `${BOSSES[lair.lair].lair.split('-')[0]}-${h.toUpperCase()}`;
    lair.member = h;
    c.servers.push(lair);
  }
  const trunk = c.servers.find((l) => l.trunk);
  if (perk(s, 'trunk', false) && !trunk) {
    let seed = strSeed(c.name, 7) % 100000, loc = createLocation('worm', seed, 1);
    while ([...(s.locations || []), ...c.servers].some((l) => l.id === loc.id)) loc = createLocation('worm', ++seed, 1);
    Object.assign(loc, { id: 'trunk', name: 'TRUNK', trunk: true, level: SERVER.keepUp(hackerLevel(s), 1), trait: null, quirk: null, template: 'rogue', rogue: { kind: 'pit' }, spawns: {}, serial: 0 });
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
    syncRunSignal(s);
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
  if (c) { c.roamer = null; c.raid = null; } // trunk hops and raids at members' walls are cut (threat merge)
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

// The travelling virus went with outposts (R2): nothing to land on. invasion.mjs still calls this.
export function roam() {}

// The network clock (logged-on time): members' crashed servers rebooting, and (simulated) invites.
export function tickConsortium(s, dt, now = hooks.now?.() ?? Date.now()) {
  const first = s.serial;
  const c = consortiumOf(s), net = (s.consortiumNet ||= {});
  tidy(s);
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
    if (loc.home) { loc.occupied.left -= dt; if (loc.occupied.left <= 0 && !loc.occupied.cleared) { loc.occupied.cleared = true; emit(s, 'info', `${loc.member}'s server finished rebooting.`); } }
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
  }
  return s.logs.filter((e) => e.id > first);
}
// A member's server crashed: it reboots, occupied, and the virus moves on.
function crashMember(s, raid) {
  const c = consortiumOf(s), h = raid.member;
  const loc = occupy(s, { id: `${h}-home`, name: `${h.toUpperCase()}-HOME`, member: h, family: raid.family, level: raid.level, seed: raid.seed });
  c.servers = c.servers.filter((l) => l.id !== loc.id);
  c.servers.push(loc);
  emit(s, 'consortium-crash', `${raid.name} crashed ${h}'s server. It is rebooting for ${CONSORTIUM.rebootMs / 3600000} hours and is occupied. Connect and clear it to bring it back sooner.`, { location: loc.id });
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
  if (c.raid) out.push({ kind: 'raid', title: `Invasion at ${c.raid.member}'s wall`, detail: `${c.raid.name}. They're away: stop it or their server crashes.`, left: c.raid.left, total: CONSORTIUM.raidMs, level: c.raid.level, family: c.raid.family, cmd: `consortium defend ${c.raid.member}`, label: 'Defend', bounty: bountyOf(s, c.raid.level) });
  if (c.roamer) { const r = c.roamer; out.push({ kind: 'roam', title: `Invasion on the trunk line: ${r.name}`, detail: `Hop ${r.hop} of ${CONSORTIUM.roam.hops}, from ${r.fromName}. It arrives as an invasion.`, left: r.left, total: r.total, level: r.level, family: r.family, cmd: 'consortium intercept', label: 'Intercept', bounty: bountyOf(s, r.level, 1 + CONSORTIUM.roam.bounty * r.hop) }); }
  for (const l of memberServers(s)) {
    if (false) { const hop = l.held.siege.hop || 0; out.push({ kind: 'siege', title: `Invasion at ${l.member}'s outpost on ${l.name}`, detail: `${OUTPOST.kinds[l.held.kind].name} outpost. Lose it and it goes into lockdown.`, left: l.held.siege.left, total: CONSORTIUM.siegeMs, level: (l.level || 1) + hop, family: l.family, cmd: `consortium defend ${l.id}`, label: 'Defend', bounty: bountyOf(s, (l.level || 1) + hop, 1 + CONSORTIUM.roam.bounty * hop) }); }
    if (l.home && !l.occupied.cleared) out.push({ kind: 'crash', title: `${l.member}'s server crashed`, detail: `Rebooting. Clear its ${CONSORTIUM.homeRooms.length} folders to bring it back.`, left: l.occupied.left, total: CONSORTIUM.rebootMs, level: l.level || 1, family: l.family, cmd: `connect ${l.id}`, label: 'Connect', bounty: bountyOf(s, l.level || 1) });
  }
  const urgency = { raid: 0, siege: 1, roam: 2, crash: 3, lockdown: 4 };
  return out.sort((a, b) => (b.mine || 0) - (a.mine || 0) || urgency[a.kind] - urgency[b.kind] || a.left - b.left);
}

// Fights for the consortium: a siege or lockdown on a member's outpost (e.member), an invader at an
// away member's wall (e.raid), the travelling virus (e.roamer).
const NATIVE = { ransomware: 'cryptjack', worm: 'splinter', ghostroot: 'ghostroot' };
function fight(s, { family, level, seed }, tag, text, location) {
  const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
  const who = tag.member ? memberServers(s).find((l) => l.id === tag.member)?.member : null; // a member's native strain there (network.mjs)
  const { strain, grade } = variantFor(family, level, 1, seed, nativeStrain(s, who));
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
}

const USAGE = 'consortium, consortium create <name>, consortium invite <handle>, consortium kick <handle>, consortium leave, consortium accept, consortium decline, consortium defend <server|handle>, consortium intercept';
// `consortium` and its verbs. raw: as typed (a name keeps its capitals).
export function consortiumCommand(s, raw) {
  const first = s.serial;
  const [verbRaw = '', ...more] = raw.split(' ').filter(Boolean);
  const verb = verbRaw.toLowerCase();
  const arg = verb === 'create' ? more.join(' ') : more.join(' ').toLowerCase();
  const c = consortiumOf(s), done = () => s.logs.filter((e) => e.id > first);
  if (!verb) {
    if (!c) emit(s, 'info', s.consortiumInvite ? `No consortium. ${s.consortiumInvite.from} invited you to ${s.consortiumInvite.name}. Type consortium accept.` : 'No consortium. Type consortium create <name>, or wait for an invite.');
    else {
      const t = tiersOf(s), nx = nextTier(s);
      emit(s, 'info', `${c.name}: ${sizeOf(s)} servers merged (${['you', ...c.members].join(', ')}). ${t.length ? 'Bonuses: ' + t.map((x) => x.rule).join(', ') + '.' : 'No bonuses yet.'}${nx ? ` At ${nx.at}: ${nx.rule.toLowerCase()}.` : ''}`);
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
  if (!c) return warn(s, s.consortiumInvite ? 'No consortium yet. Type consortium accept, or consortium create <name>.' : 'No consortium. Type consortium create <name>.'), done();
  if (verb === 'leave') {
    if (active(s) || onTheirs(s)) return warn(s, 'Jack out first.'), done();
    s.consortium = null;
    emit(s, 'info', `You left ${c.name}. The trunk line is cut, and everything of yours stays yours.`);
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
  if (verb === 'collect') return warn(s, 'The dividend is gone: programs aren\'t income, so there is nothing to share.'), done();
  if (verb === 'defend' || verb === 'intercept') {
    if (s.run) return warn(s, 'Jack out first.'), done();
    if (active(s)) return warn(s, 'Finish the fight first.'), done();
    if (verb === 'intercept') {
      const r = c.roamer;
      if (!r) return warn(s, 'Nothing on the trunk line.'), done();
      return fight(s, r, { roamer: true }, `Intercepting ${r.name} on the trunk line`, r.to), done();
    }
    if (c.raid && c.raid.member === arg) return fight(s, c.raid, { raid: true }, `Defending ${arg}'s wall`), done();
    return warn(s, `Nothing to defend called "${arg}".`), done();
  }
  warn(s, USAGE);
  return done();
}

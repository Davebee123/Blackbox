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
// - Sieges: natives lay siege to members' outposts now and then. Anyone can defend one for a
//   bounty. Miss it and a member deals with it: it costs you nothing.
// - Size: each merged server makes the network bigger and the consortium better (CONSORTIUM.tiers).
// - Leaving (or being kicked) cuts the trunk line. You lose nothing of your own.
// Pure: state in, events out. run.mjs routes the `consortium` command (and `guild`, the old name).
import { emit, warn, rand, hooks, hackerLevel, selectEncounter, command, gainCode, gainXp, xpFor, active } from './combat.mjs';
import { createLocation, SERVER, FAMILIES, variantFor } from './data.mjs';
import { seeded, codeOf, MATERIALS } from './gear.mjs';
import { profileOf, PRESENCE, online, simOn } from './presence.mjs';
import { ROGUE } from './rogue.mjs';
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
  // The dividend: every member's outpost pays each other member a share of what it produces, in
  // kind (a Siphon's or Tap's code, a Scraper's finds), real time and offline too. The owner keeps
  // their whole stockpile: the share comes on top. It fills a small stock per outpost, up to
  // capHours' worth; an outpost under siege pays nothing.
  dividend: { share: 0.25, capHours: 12 },
  // The bigger the network (home servers merged), the better for everyone.
  tiers: [
    { at: 3, name: 'Linked', rule: '+10% outpost yield and dividend', yield: 0.1 },
    { at: 5, name: 'Mesh', rule: 'Siege bounties doubled', bounty: 2 },
    { at: 8, name: 'Backbone', rule: 'A trunk rogue server opens on the network', trunk: true },
    { at: 12, name: 'Grid', rule: '+1 bandwidth', bandwidth: 1 },
  ],
  names: ['Halyard', 'Null Choir', 'Black Lattice', 'Copperline', 'Saltmarsh Ring', 'Dead Channel', 'Quiet Meridian', 'Glasshouse', 'Low Orbit', 'Tinroof'],
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
export function arrive(s, loc, now = hooks.now?.() ?? Date.now()) {
  if (!loc?.member || loc.rogue) return;
  if (loc.lastRun && now - loc.lastRun >= CONSORTIUM.resetMs) loc.state = { cleared: {}, unlocked: {}, taken: {} };
  loc.lastRun = now;
}

// The dividend: what one member outpost pays you an hour (code for a Siphon or Tap, rolls for a Scraper).
export function dividendOf(s, loc) {
  const k = OUTPOST.kinds[loc.held?.kind];
  if (!k || loc.held.siege) return 0;
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

// The network clock (logged-on time): sieges on members' outposts, and (simulated) invites. now:
// the real time, for the dividend.
export function tickConsortium(s, dt, now = hooks.now?.() ?? Date.now()) {
  const first = s.serial;
  const c = consortiumOf(s), net = (s.consortiumNet ||= {});
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
    const sg = loc.held?.siege;
    if (!sg) continue;
    if (s.encounter?.member === loc.id && active(s)) continue; // the clock waits while you fight for it
    sg.left -= dt;
    if (sg.left > 0) continue;
    loc.held.siege = null;
    const others = c.members.filter((x) => x !== loc.member);
    const who = others.length && rand(s) < 0.6 ? others[Math.floor(rand(s) * others.length)] : null;
    emit(s, 'info', who ? `${who} broke the siege on ${loc.member}'s ${loc.name}.` : `${loc.member} drove the natives off ${loc.name} alone.`, { location: loc.id });
  }
  const open = memberServers(s).filter((l) => l.held && !l.held.siege);
  if (!open.length) return s.logs.filter((e) => e.id > first);
  if (net.siegeNext == null) net.siegeNext = between(s, CONSORTIUM.siegeEveryMs);
  net.siegeNext -= dt;
  if (net.siegeNext <= 0) {
    net.siegeNext = between(s, CONSORTIUM.siegeEveryMs);
    const loc = open[Math.floor(rand(s) * open.length)];
    loc.held.siege = { left: CONSORTIUM.siegeMs, seed: (Math.floor(rand(s) * 2 ** 31) >>> 0) || 1 };
    emit(s, 'consortium-siege', `Natives are sieging ${loc.member}'s outpost on ${loc.name}. Defend it within ${CONSORTIUM.siegeMs / 60000} minutes for a bounty.`, { location: loc.id });
  }
  return s.logs.filter((e) => e.id > first);
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

// A siege fight on a member's outpost: their server's natives, at its level.
const NATIVE = { ransomware: 'cryptjack', worm: 'splinter', ghostroot: 'ghostroot' };
function defend(s, loc) {
  const sg = loc.held.siege;
  const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
  const { strain, grade } = variantFor(loc.family, loc.level || 1, 1, sg.seed);
  selectEncounter(s, NATIVE[loc.family], sg.seed, { level: loc.level || 1, strain, grade, quiet: true });
  if (!s.encounter || s.encounter.phase === 'active') return;
  s.gate = gate && gate !== s.encounter ? gate : null;
  s.encounter.member = loc.id;
  emit(s, 'jack-in', `Defending ${loc.member}'s ${loc.name}: ${s.encounter.virus.name}.`, { location: loc.id });
  command(s, 'engage');
}
// Called from finish() when a fight with e.member ends in a win.
export function consortiumWon(s, e) {
  const loc = memberServers(s).find((l) => l.id === e.member);
  if (!loc?.held?.siege) return;
  loc.held.siege = null;
  const L = loc.level || 1, b = CONSORTIUM.bounty(L), k = perk(s, 'bounty', 1);
  const credits = b.credits * k, code = b.code * k, m = codeOf(loc.family);
  s.server.credits += credits;
  gainCode(s, { [m]: code }, '');
  gainXp(s, xpFor(s, L, 1), `${loc.name} defended`);
  emit(s, 'outpost-held', `Siege broken on ${loc.member}'s ${loc.name}. Bounty: +${credits} credits, +${code} ${MATERIALS[m].name}.`, { location: loc.id });
}

const USAGE = 'consortium, consortium collect, consortium create <name>, consortium invite <handle>, consortium kick <handle>, consortium leave, consortium accept, consortium decline, consortium defend <server>';
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
  if (verb === 'defend') {
    const loc = memberServers(s).find((l) => l.id === arg || l.name.toLowerCase() === arg);
    if (!loc?.held) return warn(s, `No member outpost called "${arg}".`), done();
    if (!loc.held.siege) return warn(s, `${loc.name} isn't under siege.`), done();
    if (s.run) return warn(s, 'Jack out first.'), done();
    if (active(s)) return warn(s, 'Finish the fight first.'), done();
    defend(s, loc);
    return done();
  }
  warn(s, USAGE);
  return done();
}

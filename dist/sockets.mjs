// Sockets (docs/servers.md 6, R2): the building system, small and local. A server's socket rooms are bus slots guarded
// by a process on your first visit (floorplan.mjs: kind 'socket'). Clear one and it's yours to build in: inject a
// program whose codebase you know, paid in credits, the server's code and Exploits. A program changes how its own
// server plays for as long as it runs, and never reaches another server.
//
//   socket rooms  small 1, medium 2, large 3 (floorplan.mjs ROOMS.sockets), +1 on a Backbone server (specials.mjs), +1 at Root 4, +1 on
//                 every traced server in a Grid consortium (netrooms.mjs), and a held server's Core is its core socket.
//   codebases     you start knowing the Harvester. Halcyon's store and the hub shops sell the rest, by standing and
//                 rep tier. The Build card lists only codebases you know.
//   costs         light: 140 credits + 15 of the server's code. Medium: 280 credits + 30 code + 1 Exploit. A quarter
//                 more a floor past the first.
//   one of each   a program once per server; instant; uninstall gives back half the credits and code.
//   components    what a broken part drops (one currency, a count: salvage.mjs): 60% a part in a room fight, an
//                 elite's parts always and one more at the kill, 35% anywhere else; a mastered part's 25% more
//                 (research.mjs). Payloads take them; a hub's market buys them, and never sells them.
//
// No upkeep and nothing to defend: programs aren't income, so nothing raids them (section 10, answer 7). This file holds
// the catalogue, codebases, costs and payment, components, and the save's retirement of outposts (retireOutposts).
// The rooms (sockets on the graph, the programs' effects) are floorplan.mjs; the world's sockets (Root 4, the core
// socket, Grid) are netrooms.mjs.
import { emit, warn, rand, hooks, materialsOf, gainCode, findLocation } from './combat.mjs';
import { seeded, MATERIALS, codeOf } from './gear.mjs';
import { gainComponents } from './salvage.mjs';
import { consortiumLinked } from './consortium.mjs';

// ---------- the catalogue (6.4: the first eight, then the specials' six) ----------
// rule: its tooltip, one line. weight: light | medium (6.3). code: what it costs in, if not the server's own code.
export const PROGRAMS = {
  harvester: { name: 'Harvester', weight: 'light', rule: 'Every virus you kill on this server drops 1 more component.' },
  cron: { name: 'Cron Spawner', weight: 'light', rule: 'Fight rooms on this server respawn twice as fast.' },
  siphon: { name: 'Code Siphon', weight: 'light', rule: 'Every fight room you clear on this server pays 3 more of its code.' },
  mill: { name: 'Cache Mill', weight: 'light', rule: 'Caches on this server refill twice as fast and pay 50% more.' },
  defrag: { name: 'Defrag Bay', weight: 'light', rule: 'Turns this room into a rest room: restores 25% of your max Signal, once a visit.' },
  tunnel: { name: 'Tunnel', weight: 'medium', rule: 'Links this room to the server\'s entry. Walking the link costs no Signal, and the hunter can\'t use it.' },
  snare: { name: 'Snare', weight: 'medium', rule: 'A hunter that walks into this room is held there for 4 of your moves. Once a visit.' },
  post: { name: 'Listening Post', weight: 'medium', rule: 'Kills on this server roll for the unique you name twice as often, wherever it can drop here.' },
  // The specials' programs (docs/server-specials.md): each leans into a special or fixes its cost.
  lockdown: { name: 'Lockdown', weight: 'medium', code: 'cipher', rule: 'Invasions this server sends come 2 levels lower.' },
  amplifier: { name: 'Amplifier', weight: 'medium', rule: 'Invasions this server sends come 2 levels higher.' },
  bulkhead: { name: 'Bulkhead', weight: 'medium', rule: 'The hunter can\'t pass through this room. Fights here and next door start behind a shield of 10% of your max Signal.' },
  patch: { name: 'Patch Injector', weight: 'medium', rule: 'Viruses on this server have 1 ◆ less on every part.' },
  honeytoken: { name: 'Honeytoken', weight: 'medium', rule: 'Viruses on this server come a grade higher, 1 in 4 as an elite. Their kills pay 50% more XP and roll for loot once more.' },
  lure: { name: 'Lure', weight: 'medium', rule: 'Fight rooms on this server respawn as the family you name, one you\'ve met.' },
};
export const PROGRAM_IDS = Object.keys(PROGRAMS);
// Codebases of programs still to come (R4): an old save's plans can already teach them (retireOutposts).
export const LATER = { turret: 'Sentry Turret', relay: 'Relay', range: 'Range', jumphost: 'Jump Host' };
export const codebaseName = (id) => PROGRAMS[id]?.name || LATER[id] || id;

export const SOCKET = {
  cost: { light: { credits: 140, code: 15, exploit: 0 }, medium: { credits: 280, code: 30, exploit: 1 } }, // credits: what its components sold for (7 each)
  floor: 0.25, // costs grow by a quarter a floor past the first
  refund: 0.5, // uninstall: half the credits and code back
  drop: { room: 0.6, elite: 1 }, // a part's components in a room fight (elsewhere CONFIG.salvageChance, 35%)
  linked: 1.1, // a Linked consortium: components drop 10% more on members' servers
  rest: 0.25, snare: 4, siphon: 3, // the Defrag Bay's rest, the Snare's hold, the Code Siphon's code
  patch: 1, bulkhead: 0.1, honey: { grade: 1, elite: 0.25, xp: 1.5 }, // the Patch Injector's ◆, the Bulkhead's shield, the Honeytoken's
  start: ['harvester'],
  price: { light: (L) => 200 + 10 * L, medium: (L) => 400 + 15 * L }, // credits at a hub
};
// The hubs' shelves (6.2), each codebase at a rep tier (index in REP_TIERS; Halcyon's in its store's standing tiers).
export const CODEBASE_SHOPS = {
  halcyon: [['harvester', 1], ['defrag', 1], ['mill', 2]],
  kestrel: [['snare', 2], ['bulkhead', 2], ['lockdown', 3]],
  lantern: [['post', 2], ['tunnel', 3]],
  glassjaw: [['siphon', 1], ['patch', 2], ['honeytoken', 3]],
  nullchoir: [['cron', 1], ['lure', 2], ['amplifier', 3]],
};

// ---------- codebases ----------
export const codebasesOf = (s) => (s.codebases ||= [...SOCKET.start]);
export const knowsCodebase = (s, id) => codebasesOf(s).includes(id);
export const unknownCodebases = (s) => PROGRAM_IDS.filter((id) => !knowsCodebase(s, id));
// Learn a codebase (bought: a shop's, by its id). Returns the id learnt, or null if you knew it.
export function learnCodebase(s, id, why = '') {
  if (!PROGRAMS[id] || knowsCodebase(s, id)) return null;
  codebasesOf(s).push(id);
  emit(s, 'drop', `${why}the ${codebaseName(id)} codebase. Build it in any socket you've cleared.`, { codebase: id });
  return id;
}
// A hub's codebases: [{ id, name, tier, price, known }].
export const shopCodebases = (s, f, L) => (CODEBASE_SHOPS[f] || []).filter(([id]) => PROGRAMS[id]).map(([id, tier]) => ({ id, name: `${PROGRAMS[id].name} codebase`, tier, price: SOCKET.price[PROGRAMS[id].weight](L), known: knowsCodebase(s, id) }));

// ---------- components ----------
// One part's chance to drop components when it breaks (combat.mjs breakPart): in a room fight 60% (an elite's 100%), elsewhere the
// base (35%). The rest (a mastered part, a network rich in it) multiplies on top there.
export function componentChance(s, e, base) {
  if (!e?.rooms) return base;
  const elite = !!e.virus?.elite || ['elite', 'guard'].includes(e.rooms.size);
  const member = s.run?.loc && findLocation(s, s.run.loc)?.member; // a Linked consortium's members' servers
  return (elite ? SOCKET.drop.elite : SOCKET.drop.room) * (member && linkedOn(s) ? SOCKET.linked : 1);
}
const linkedOn = (s) => consortiumLinked(s);

// ---------- costs ----------
// What a program costs on a server: { credits, code: { kind: n }, exploit }. R: the server's rooms (floorplan.mjs).
export function programCost(R, id) {
  const P = PROGRAMS[id], c = SOCKET.cost[P?.weight || 'light'], m = 1 + SOCKET.floor * Math.max(0, (R?.floor || 1) - 1);
  return { credits: Math.round(c.credits * m), code: { [P?.code || serverCode(R)]: Math.round(c.code * m) }, exploit: c.exploit }; // a program's own code (Lockdown's Cipher), else the server's
}
// The server's code: its own, else its family's, else its first fight room's.
export const serverCode = (R) => R?.code || codeOf(R?.family) || codeOf(Object.values(R?.graph?.rooms || {}).find((x) => x.family && codeOf(x.family))?.family) || 'cipher';
export const costLine = (c) => [`${c.credits} credits`, ...Object.entries(c.code).map(([k, n]) => `${n} ${MATERIALS[k].name}`), c.exploit ? `${c.exploit} Exploit${c.exploit > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ');
// Why you can't build this program in this socket now (or null). on: the programs already in the server's sockets.
export function buildBlock(s, R, room, id) {
  if (!PROGRAMS[id]) return 'No such program.';
  if (!knowsCodebase(s, id)) return `You need the ${PROGRAMS[id].name} codebase.`;
  if (Object.values(R.programs || {}).includes(id)) return `${R.name} already runs a ${PROGRAMS[id].name}.`;
  if (R.programs?.[room.id]) return `${PROGRAMS[R.programs[room.id]].name} runs here. Uninstall it first.`;
  const c = programCost(R, id), m = materialsOf(s);
  if (Object.entries(c.code).some(([k, n]) => (m[k] || 0) < n) || (m.exploit || 0) < c.exploit || (s.server?.credits || 0) < c.credits) return `It costs ${costLine(c)}.`;
  return null;
}
// Build it: pay and inject it. Returns true when it's in.
export function buildProgram(s, R, room, id) {
  const why = buildBlock(s, R, room, id);
  if (why) { warn(s, `${PROGRAMS[id]?.name || id}: ${why}`); return false; }
  const c = programCost(R, id), m = materialsOf(s);
  s.server.credits -= c.credits;
  for (const [k, n] of Object.entries(c.code)) m[k] -= n;
  m.exploit = (m.exploit || 0) - c.exploit;
  (R.programs ||= {})[room.id] = id;
  (R.paid ||= {})[room.id] = { credits: c.credits, code: c.code };
  emit(s, 'program', `${PROGRAMS[id].name} injected into ${room.path}. ${PROGRAMS[id].rule}`, { program: id, room: room.id });
  return true;
}
// Uninstall: free, half of its credits and code back (one built before credits: half its components).
export function uninstallProgram(s, R, room) {
  const id = R.programs?.[room.id];
  if (!id) { warn(s, 'Nothing runs here.'); return false; }
  delete R.programs[room.id];
  const paid = R.paid?.[room.id];
  if (R.paid) delete R.paid[room.id];
  const back = {}, credits = Math.floor((paid?.credits || 0) * SOCKET.refund);
  const spent = paid?.credits ? 0 : paid?.components ?? Object.values(paid?.pay || {}).reduce((n, k) => n + k, 0); // one built before credits: components (pay: a pile's payment, before v47)
  const comps = gainComponents(s, Math.floor(spent * SOCKET.refund));
  s.server.credits += credits;
  for (const [k, n] of Object.entries(paid?.code || {})) back[k] = Math.floor(n * SOCKET.refund);
  gainCode(s, back, '');
  emit(s, 'program', `${PROGRAMS[id].name} uninstalled from ${room.path}: ${credits ? `${credits} credits` : `${comps} components`}${Object.values(back).some(Boolean) ? `, ${Object.entries(back).filter(([, n]) => n).map(([k, n]) => `${n} ${MATERIALS[k].name}`).join(', ')}` : ''} back.`, { program: id, room: room.id, off: true });
  return true;
}

// ---------- programs across your servers ----------
const roomsOfLoc = (loc) => loc?.floorplan || null;
export const programsOn = (loc) => Object.values(roomsOfLoc(loc)?.programs || {});
// Listening Posts installed anywhere (listen needs one; a native unique's away chance counts them: network.mjs).
export const postsOf = (s) => (s.locations || []).reduce((n, l) => n + programsOn(l).filter((p) => p === 'post').length, 0);
// The named unique's drop on this kill: twice as often on a server running a Listening Post.
export const listenBoost = (s) => (s.listen && s.run?.loc && programsOn(findLocation(s, s.run.loc)).includes('post') ? 2 : 1);

// ---------- server size ----------
const SIZES = [['small', 0.3], ['medium', 0.5], ['large', 0.2]];
// A server's size, fixed by its seed (the old outpost size roll).
export function sizeOf(loc) {
  let x = seeded(loc.seed * 41 + 7)();
  for (const [id, p] of SIZES) { if ((x -= p) < 0) return { id }; }
  return { id: 'medium' };
}

// ---------- the save (v40): outposts, buildings, plans, services, architecture and the dividend retire ----------
// What each was worth, as it cost to make (credits, code of its server's family, salvage, Exploits). 9.3: every building's
// cost comes back as code and components (salvage counts one for one) and its credits; each plan, and each building's,
// becomes the matching program's codebase (6.4's "Was" column; a program still to come keeps its codebase for R4).
// Services, a build in the queue and an outpost's store pay back what they cost or held; the dividend waiting pays out.
const OLD_BUILDINGS = { siphon: [150, 10, 4, 0], skimmer: [300, 15, 8, 0], mill: [200, 12, 6, 0], node: [200, 12, 6, 0], storage: [250, 12, 6, 0], pipeline: [400, 20, 10, 0], ids: [350, 18, 8, 0], lure: [250, 12, 6, 0], miner: [500, 25, 12, 0], sentry: [600, 30, 15, 0], refinery: [2500, 120, 50, 3], post: [250, 12, 6, 0], citadel: [2500, 120, 50, 3] };
export const PLAN_TO = { siphon: 'siphon', skimmer: 'mill', mill: 'mill', miner: 'mill', scraper: 'mill', tap: 'mill', ids: 'snare', node: 'bulkhead', citadel: 'bulkhead', sentry: 'turret', lure: 'honeytoken', post: 'post', relay: 'relay' };
const OLD_SERVICES = { uplink: 'cipher', buildfarm: 'kernel', router: 'worm', scheduler: 'kernel' };
const OLD_VERSIONS = [[120, 12, 0, 6], [600, 40, 1, 15], [2000, 100, 3, 40]]; // credits, code, Exploits, salvage
export function retireOutposts(s, was) {
  if (was >= 40) return null;
  const back = { credits: 0, code: {}, exploit: 0, comps: 0, codebases: [] };
  const code = (k, n) => { if (k && n > 0) back.code[k] = (back.code[k] || 0) + n; };
  const comps = (n) => { if (n > 0) back.comps += gainComponents(s, n); };
  const teach = (plan) => { const id = PLAN_TO[plan]; if (id && !codebasesOf(s).includes(id)) { codebasesOf(s).push(id); back.codebases.push(id); } };
  codebasesOf(s);
  for (const loc of s.locations || []) {
    const k = codeOf(loc.family), o = loc.outpost;
    // Before buildings: a harvester and its modules were what became them (the old retireHarvesters).
    const built = [...(loc.buildings || []), ...(loc.build ? [loc.build.id] : []), ...(o?.h ? [o.h.kind === 'scraper' ? 'miner' : 'siphon'] : []), ...(loc.mods || [])];
    for (const id of built) {
      const c = OLD_BUILDINGS[id];
      if (!c) continue;
      back.credits += c[0]; code(k, c[1]); comps(c[2]); back.exploit += c[3];
      teach(id);
    }
    // What its store held: code, credits, salvage (as components), and a Data Miner's rolls (as credits).
    const st = o?.stock;
    if (st && typeof st === 'object') {
      code(k, Math.floor(st.code || 0));
      back.credits += Math.floor(st.credits || 0) + Math.floor(st.rolls || 0) * (20 + 3 * (loc.level || 1));
      comps(Math.floor(st.salvage || 0));
    } else if (o?.h && typeof o.stock === 'number') code(k, Math.floor(o.stock));
    for (const key of ['buildings', 'build', 'outpost', 'mods', 'lapsed', 'regrow']) delete loc[key];
  }
  back.credits += 200 * (s.harvesters || []).length;
  for (const n of Object.values(s.modStock || {})) back.credits += 150 * n;
  delete s.harvesters; delete s.modStock; delete s.harvKinds;
  for (const p of s.plans || []) teach(p);
  s.plans = (s.plans || []).includes('relay') ? ['relay'] : []; // the Relay plan (v49 turns it into credits: progression.mjs craftRestore)
  // Services: each version they ran, and the one installing, paid back.
  const svc = Object.entries(s.services || {}).filter(([id]) => OLD_SERVICES[id]).map(([id, v]) => [id, 1, v]);
  if (s.install && OLD_SERVICES[s.install.id]) svc.push([s.install.id, s.install.v, s.install.v]);
  for (const [id, from, to] of svc) for (let n = from; n <= to; n++) {
    const x = OLD_VERSIONS[n - 1];
    if (!x) continue;
    back.credits += x[0]; code(OLD_SERVICES[id], x[1]); back.exploit += x[2]; comps(x[3]);
  }
  s.services = {}; s.install = null;
  if (s.recipes) s.recipes = s.recipes.filter((id) => !OLD_SERVICES[id]); // their blueprints
  const arch = s.architecture;
  s.architecture = null;
  // Swarms at outposts, and the natives' clock, go; a hub's old owner still sends its own (fleet.mjs).
  if (s.fleet && !s.fleet.hub) s.fleet = null;
  if (s.net) { delete s.net.fleetAt; delete s.net.fleetNext; delete s.net.schedAt; }
  // The consortium's dividend: what's waiting pays out; members' outposts are just their servers now.
  for (const l of s.consortium?.servers || []) {
    if (!l.held) continue;
    const n = Math.floor(l.held.share || 0);
    if (n) { if (l.held.kind === 'scraper') back.credits += n * (20 + 3 * (l.level || 1)); else code(codeOf(l.family), n); }
    delete l.held;
  }
  if (s.consortium) delete s.consortium.shareAt;
  s.server.credits += back.credits;
  const m = materialsOf(s);
  for (const [k, n] of Object.entries(back.code)) m[k] = (m[k] || 0) + n;
  m.exploit = (m.exploit || 0) + back.exploit;
  back.arch = arch;
  return back;
}
// The letter that says what changed (mail.mjs systemLetter), from what retireOutposts gave back.
export function retireLetter(back) {
  if (!back) return null;
  const got = [back.credits ? `${back.credits} credits` : '', ...Object.entries(back.code).filter(([, n]) => n).map(([k, n]) => `${n} ${MATERIALS[k].name}`), back.exploit ? `${back.exploit} Exploit${back.exploit > 1 ? 's' : ''}` : '', back.comps ? `${back.comps} components` : ''].filter(Boolean);
  const cb = back.codebases.map(codebaseName);
  return {
    from: 'wick', subject: 'Outposts are gone. Sockets are in.',
    body: [`Servers have socket rooms now. Clear one and build a program in it: it bends that server's rules and nothing else. No stores, no bandwidth, nothing to defend.${got.length ? ` What you'd built and run came back as what it cost: ${got.join(', ')}.` : ''}${cb.length ? ` Your plans are codebases now: ${cb.join(', ')}.` : ''} You know the Harvester. Salvage is components.`, '— wick'],
  };
}

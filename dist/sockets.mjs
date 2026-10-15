// Sockets (docs/servers.md 6, R2): the building system, small and local. A server's socket rooms are bus slots guarded
// by a process on your first visit (floorplan.mjs: kind 'socket'). Clear one and it's yours to build in: inject a
// program whose codebase you know, paid in components, the server's code and Exploits. A program changes how its own
// server plays for as long as it runs, and never reaches another server.
//
//   socket rooms  small 1, medium 2, large 3 (floorplan.mjs ROOMS.sockets), +1 on a Backbone server, +1 at Root 4, +1 on
//                 every traced server in a Grid consortium (netrooms.mjs), and a held server's Core is its core socket.
//   codebases     you start knowing the Harvester. Vaults (one in three, your first always), a Resident's first fall
//                 (its author's list), Mapped, and hub shops by rep tier teach the rest. One you know banks as 4
//                 components instead. The Build card lists only codebases you know.
//   costs         light: 20 components + 15 of the server's code. Medium: 40 components (10 of them the server's own,
//                 named) + 30 code + 1 Exploit. A quarter more a layer past the first. Paid through salvage.mjs's picker.
//   one of each   a program once per server; instant; uninstall gives back half the components and code.
//   components    what a broken part drops (Pulse Kernel, Cipher Seed, a Heat Pipe): 60% a part in a room fight, an
//                 elite's parts always and one more at the kill, 35% anywhere else; a mastered part's 25% more
//                 (research.mjs). They live in s.salvage (the old name), and pay every cost that took salvage.
//
// No upkeep and nothing to defend: programs aren't income, so nothing raids them (section 10, answer 7). This file holds
// the catalogue, codebases, costs and payment, components, and the save's retirement of outposts (retireOutposts).
// The rooms (sockets on the graph, the programs' effects) are floorplan.mjs; the world's sockets (Root 4, the core
// socket, Grid) are netrooms.mjs.
import { emit, warn, rand, hooks, materialsOf, gainCode, findLocation } from './combat.mjs';
import { FAMILIES, ROOM_FAMILIES, GUARDS } from './data.mjs';
import { seeded, MATERIALS, codeOf } from './gear.mjs';
import { settle, spend, costLabel, autoPay } from './salvage.mjs';
import { consortiumLinked } from './consortium.mjs';

// ---------- the catalogue (6.4: the first eight) ----------
// rule: its tooltip, one line. weight: light | medium (6.3).
export const PROGRAMS = {
  harvester: { name: 'Harvester', weight: 'light', rule: 'Every virus you kill on this server drops 1 more component, from the part you broke last.' },
  cron: { name: 'Cron Spawner', weight: 'light', rule: 'Fight rooms on this server respawn twice as fast.' },
  siphon: { name: 'Code Siphon', weight: 'light', rule: 'Every fight room you clear on this server pays 3 more of its code.' },
  mill: { name: 'Cache Mill', weight: 'light', rule: 'Caches on this server refill twice as fast and pay 50% more.' },
  defrag: { name: 'Defrag Bay', weight: 'light', rule: 'Turns this room into a rest room: restores 25% of your max Signal, once a visit.' },
  tunnel: { name: 'Tunnel', weight: 'medium', rule: 'Links this room to the server\'s entry. Walking the link costs no Signal, and the hunter can\'t use it.' },
  snare: { name: 'Snare', weight: 'medium', rule: 'A hunter that walks into this room is held there for 4 of your moves. Once a visit.' },
  post: { name: 'Listening Post', weight: 'medium', rule: 'Kills on this server roll for the unique you name twice as often, wherever it can drop here.' },
};
export const PROGRAM_IDS = Object.keys(PROGRAMS);
// Codebases of programs still to come (R4): an old save's plans can already teach them (retireOutposts).
export const LATER = { bulkhead: 'Bulkhead', turret: 'Sentry Turret', patch: 'Patch Injector', lure: 'Lure', honeytoken: 'Honeytoken', relay: 'Relay', range: 'Range', jumphost: 'Jump Host' };
export const codebaseName = (id) => PROGRAMS[id]?.name || LATER[id] || id;

export const SOCKET = {
  cost: { light: { any: 20, named: 0, code: 15, exploit: 0 }, medium: { any: 30, named: 10, code: 30, exploit: 1 } },
  floor: 0.25, // costs grow by a quarter a layer past the first
  refund: 0.5, // uninstall: half the components and code back
  drop: { room: 0.6, elite: 1 }, // a part's component in a room fight (elsewhere CONFIG.salvageChance, 35%)
  linked: 1.1, // a Linked consortium: components drop 10% more on members' servers
  known: 4, // a codebase you already know banks as this many components
  vault: 1 / 3, // vaults holding a codebase (your first always does)
  rest: 0.25, snare: 4, siphon: 3, // the Defrag Bay's rest, the Snare's hold, the Code Siphon's code
  start: ['harvester'],
  price: { light: (L) => 200 + 10 * L, medium: (L) => 400 + 15 * L }, // credits at a hub
};
// Who teaches what when its Resident first falls.
export const AUTHOR_CODEBASES = {
  tollgate: ['siphon', 'cron', 'mill'], swarmline: ['harvester', 'cron', 'tunnel'], palemask: ['snare', 'tunnel', 'defrag'],
  glassjaw: ['siphon', 'mill', 'post'], lantern: ['post', 'tunnel', 'defrag'], nullchoir: ['cron', 'snare', 'post'], kestrel: ['snare', 'defrag'],
};
// The hubs' shelves (6.2), each codebase at a rep tier (index in REP_TIERS; Halcyon's in its store's standing tiers).
export const CODEBASE_SHOPS = {
  halcyon: [['harvester', 1], ['defrag', 1], ['mill', 2]],
  kestrel: [['snare', 2]],
  lantern: [['post', 2], ['tunnel', 3]],
  glassjaw: [['siphon', 1]],
  nullchoir: [['cron', 1]],
};

// ---------- codebases ----------
export const codebasesOf = (s) => (s.codebases ||= [...SOCKET.start]);
export const knowsCodebase = (s, id) => codebasesOf(s).includes(id);
export const unknownCodebases = (s) => PROGRAM_IDS.filter((id) => !knowsCodebase(s, id));
// Learn a codebase. id null: one you don't know (from `from`, else any), by the dice r. Known already (or nothing left
// to learn): SOCKET.known components from `pool` instead. Returns the id learnt, or null.
export function learnCodebase(s, id, why = '', { from = null, pool = null, r = () => rand(s) } = {}) {
  if (id == null) {
    const left = (from || PROGRAM_IDS).filter((x) => !knowsCodebase(s, x));
    const any = left.length ? left : from ? unknownCodebases(s) : [];
    id = any.length ? any[Math.floor(r() * any.length)] : null;
  }
  if (!id || knowsCodebase(s, id)) {
    gainComponents(s, SOCKET.known, pool);
    emit(s, 'info', `${why}${id ? `the ${codebaseName(id)} codebase, already known` : 'a codebase you already know'}: +${SOCKET.known} components.`);
    return null;
  }
  codebasesOf(s).push(id);
  emit(s, 'drop', `${why}the ${codebaseName(id)} codebase. ${PROGRAMS[id] ? `Build it in any socket you've cleared.` : 'Its program comes later.'}`, { codebase: id });
  return id;
}
// A vault's codebase file (run.mjs layoutOf), fixed by its seed: one vault in three, your first server's always.
export const vaultCodebase = (loc) => !!loc && !loc.zone && !loc.rogue && (!!loc.starter || seeded(((loc.seed || 1) * 37 + 13) >>> 0)() < SOCKET.vault);
// A hub's codebases: [{ id, name, tier, price, known }].
export const shopCodebases = (s, f, L) => (CODEBASE_SHOPS[f] || []).filter(([id]) => PROGRAMS[id]).map(([id, tier]) => ({ id, name: `${PROGRAMS[id].name} codebase`, tier, price: SOCKET.price[PROGRAMS[id].weight](L), known: knowsCodebase(s, id) }));

// ---------- components ----------
// A family's components: what its parts drop (a third part's too).
export const familyComponents = (f) => [...new Set(((FAMILIES[f] || ROOM_FAMILIES[f] || GUARDS[f])?.parts || []).map((p) => p.loot).filter(Boolean))];
// Where nothing names a family (an old save's plain salvage, a store lot, a known codebase off a server): the old three's.
export const COMMON = ['Pulse Kernel', 'Cipher Seed', 'Replication Seed', 'Signal Key'];
export function gainComponents(s, n, pool = null, why = '') {
  const from = pool?.length ? pool : COMMON;
  s.salvage ||= [];
  for (let i = 0; i < n; i++) s.salvage.push({ name: from[(s.salvage.length + i) % from.length], virus: why || 'component', seed: 0 });
  return n;
}
// One part's component chance when it breaks (combat.mjs breakPart): in a room fight 60% (an elite's 100%), elsewhere the
// base (35%). The rest (a mastered part, a network rich in it) multiplies on top there.
export function componentChance(s, e, base) {
  if (!e?.rooms) return base;
  const elite = !!e.virus?.elite || ['elite', 'guard'].includes(e.rooms.size);
  const member = s.run?.loc && findLocation(s, s.run.loc)?.member; // a Linked consortium's members' servers
  return (elite ? SOCKET.drop.elite : SOCKET.drop.room) * (member && linkedOn(s) ? SOCKET.linked : 1);
}
const linkedOn = (s) => consortiumLinked(s);

// ---------- costs ----------
// What a program costs on a server: { any, need, code: { kind: n }, exploit }. R: the server's rooms (floorplan.mjs).
export function programCost(R, id) {
  const P = PROGRAMS[id], c = SOCKET.cost[P?.weight || 'light'], m = 1 + SOCKET.floor * Math.max(0, (R?.floor || 1) - 1);
  const named = Math.round(c.named * m), names = serverComponents(R);
  return {
    any: Math.round((c.any + c.named) * m) - named, // the total rounds once (40 × 1.25 = 50, 13 of them named)
    need: named ? [{ label: `${R?.name || 'server'} component`, names, n: named }] : [],
    code: { [serverCode(R)]: Math.round(c.code * m) },
    exploit: c.exploit,
  };
}
// The server's own components (its fight rooms' families'), and its code.
export function serverComponents(R) {
  const fams = new Set(Object.values(R?.graph?.rooms || {}).map((x) => x.family).filter(Boolean));
  return [...new Set([...fams].flatMap(familyComponents))];
}
export const serverCode = (R) => R?.code || codeOf(R?.family) || codeOf(Object.values(R?.graph?.rooms || {}).find((x) => x.family && codeOf(x.family))?.family) || 'cipher';
export const costLine = (c) => [costLabel({ any: c.any, need: c.need }).replace(/salvage/g, 'components'), ...Object.entries(c.code).map(([k, n]) => `${n} ${MATERIALS[k].name}`), c.exploit ? `${c.exploit} Exploit${c.exploit > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ');
// Why you can't build this program in this socket now (or null). on: the programs already in the server's sockets.
export function buildBlock(s, R, room, id) {
  if (!PROGRAMS[id]) return 'No such program.';
  if (!knowsCodebase(s, id)) return `You need the ${PROGRAMS[id].name} codebase.`;
  if (Object.values(R.programs || {}).includes(id)) return `${R.name} already runs a ${PROGRAMS[id].name}.`;
  if (R.programs?.[room.id]) return `${PROGRAMS[R.programs[room.id]].name} runs here. Uninstall it first.`;
  const c = programCost(R, id), m = materialsOf(s);
  if (Object.entries(c.code).some(([k, n]) => (m[k] || 0) < n) || (m.exploit || 0) < c.exploit || !autoPay(s, { any: c.any, need: c.need })) return `It costs ${costLine(c)}.`;
  return null;
}
// Build it: pay (the picker's payment, or the default) and inject it. Returns true when it's in.
export function buildProgram(s, R, room, id, payText = null) {
  const why = buildBlock(s, R, room, id);
  if (why) { warn(s, `${PROGRAMS[id]?.name || id}: ${why}`); return false; }
  const c = programCost(R, id), m = materialsOf(s);
  const pay = settle(s, { any: c.any, need: c.need }, payText);
  if (typeof pay === 'string') { warn(s, `${PROGRAMS[id].name}: ${pay.replace(/salvage/g, 'components')}`); return false; }
  spend(s, pay);
  for (const [k, n] of Object.entries(c.code)) m[k] -= n;
  m.exploit = (m.exploit || 0) - c.exploit;
  (R.programs ||= {})[room.id] = id;
  (R.paid ||= {})[room.id] = { pay, code: c.code };
  emit(s, 'program', `${PROGRAMS[id].name} injected into ${room.path}. ${PROGRAMS[id].rule}`, { program: id, room: room.id });
  return true;
}
// Uninstall: free, half of its components and code back.
export function uninstallProgram(s, R, room) {
  const id = R.programs?.[room.id];
  if (!id) { warn(s, 'Nothing runs here.'); return false; }
  delete R.programs[room.id];
  const paid = R.paid?.[room.id];
  if (R.paid) delete R.paid[room.id];
  const back = {}, comps = [], paidList = Object.entries(paid?.pay || {});
  const want = Math.floor(paidList.reduce((n, [, k]) => n + k, 0) * SOCKET.refund);
  for (const [name, n] of paidList) for (let i = 0; i < Math.floor(n * SOCKET.refund); i++) comps.push(name);
  for (const [name, n] of paidList) if (comps.length < want && n % 2) comps.push(name); // the odd ones, until it's half
  for (const name of comps) s.salvage.push({ name, virus: 'refund', seed: 0 });
  for (const [k, n] of Object.entries(paid?.code || {})) back[k] = Math.floor(n * SOCKET.refund);
  gainCode(s, back, '');
  emit(s, 'program', `${PROGRAMS[id].name} uninstalled from ${room.path}: ${comps.length} components${Object.values(back).some(Boolean) ? `, ${Object.entries(back).filter(([, n]) => n).map(([k, n]) => `${n} ${MATERIALS[k].name}`).join(', ')}` : ''} back.`, { program: id, room: room.id, off: true });
  return true;
}

// ---------- programs across your servers ----------
const roomsOfLoc = (loc) => loc?.floorplan || null;
export const programsOn = (loc) => Object.values(roomsOfLoc(loc)?.programs || {});
// Listening Posts installed anywhere (listen needs one; a native unique's away chance counts them: network.mjs).
export const postsOf = (s) => (s.locations || []).reduce((n, l) => n + programsOn(l).filter((p) => p === 'post').length, 0);
// The named unique's drop on this kill: twice as often on a server running a Listening Post.
export const listenBoost = (s) => (s.listen && s.run?.loc && programsOn(findLocation(s, s.run.loc)).includes('post') ? 2 : 1);

// ---------- server traits (2.2: the old site traits, read in rooms) ----------
export const SITES = {
  rich: { name: 'Rich', rule: 'Its caches pay double.' },
  legacy: { name: 'Legacy', rule: 'Its rare spawns come twice as often.' },
  backbone: { name: 'Backbone', rule: 'One more socket room.' },
  hostile: { name: 'Hostile', rule: 'Its fight rooms respawn twice as fast.' },
  hardened: { name: 'Hardened', rule: 'Its Resident and guards are Armored.' },
};
const SITE_CHANCE = 0.45, SIZES = [['small', 0.3], ['medium', 0.5], ['large', 0.2]];
// A server trait (or none), fixed by its seed.
export function siteTrait(loc) {
  const r = seeded(loc.seed * 29 + 3);
  if (r() >= SITE_CHANCE) return null;
  const ids = Object.keys(SITES);
  return ids[Math.floor(r() * ids.length)];
}
export const siteLabel = (loc) => (loc?.trait ? SITES[loc.trait] : null);
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
// Plain salvage (no part's component): it pays as components now, one for one.
const PLAIN = /scrap|salvage| core$/; // Scrap, Plan scraps, Agency salvage, a swarm's "Worm core" (a guard's Tracker Core is a component)
export function retireOutposts(s, was) {
  if (was >= 40) return null;
  const back = { credits: 0, code: {}, exploit: 0, comps: 0, codebases: [] };
  const code = (k, n) => { if (k && n > 0) back.code[k] = (back.code[k] || 0) + n; };
  const comps = (n, pool) => { if (n > 0) back.comps += gainComponents(s, n, pool, 'refund'); };
  const teach = (plan) => { const id = PLAN_TO[plan]; if (id && !codebasesOf(s).includes(id)) { codebasesOf(s).push(id); back.codebases.push(id); } };
  codebasesOf(s);
  for (const loc of s.locations || []) {
    const k = codeOf(loc.family), pool = familyComponents(loc.family), o = loc.outpost;
    // Before buildings: a harvester and its modules were what became them (the old retireHarvesters).
    const built = [...(loc.buildings || []), ...(loc.build ? [loc.build.id] : []), ...(o?.h ? [o.h.kind === 'scraper' ? 'miner' : 'siphon'] : []), ...(loc.mods || [])];
    for (const id of built) {
      const c = OLD_BUILDINGS[id];
      if (!c) continue;
      back.credits += c[0]; code(k, c[1]); comps(c[2], pool); back.exploit += c[3];
      teach(id);
    }
    // What its store held: code, credits, salvage (as components), and a Data Miner's rolls (as credits).
    const st = o?.stock;
    if (st && typeof st === 'object') {
      code(k, Math.floor(st.code || 0));
      back.credits += Math.floor(st.credits || 0) + Math.floor(st.rolls || 0) * (20 + 3 * (loc.level || 1));
      comps(Math.floor(st.salvage || 0), pool);
    } else if (o?.h && typeof o.stock === 'number') code(k, Math.floor(o.stock));
    for (const key of ['buildings', 'build', 'outpost', 'mods', 'lapsed', 'regrow']) delete loc[key];
  }
  back.credits += 200 * (s.harvesters || []).length;
  for (const n of Object.values(s.modStock || {})) back.credits += 150 * n;
  delete s.harvesters; delete s.modStock; delete s.harvKinds;
  for (const p of s.plans || []) teach(p);
  s.plans = (s.plans || []).includes('relay') ? ['relay'] : []; // the Relay plan still crafts relays (hidden.mjs)
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
  // Plain salvage becomes components, one for one.
  let plain = 0;
  for (const p of s.salvage || []) if (PLAIN.test(p.name || '') || /^Scrap$/.test(p.name || '')) { p.name = COMMON[plain++ % COMMON.length]; p.virus = 'refund'; }
  s.server.credits += back.credits;
  const m = materialsOf(s);
  for (const [k, n] of Object.entries(back.code)) m[k] = (m[k] || 0) + n;
  m.exploit = (m.exploit || 0) + back.exploit;
  back.plain = plain; back.arch = arch;
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

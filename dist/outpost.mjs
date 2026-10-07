// Outposts: servers you've taken over (beat the Resident in /core, run.mjs), and what you build on them.
//
// MOO2-style: each held server has building slots (by its size, +1 on a Backbone site, +1 at Root 4).
// You build in real time, one build per server and two across the network, for credits, code and
// salvage. What you build decides what the server does: produce code, credits, salvage or loot,
// defend itself, or make the rest better. Bandwidth (yours, network-wide) caps how much runs at
// once, so you can't build everything everywhere. Nothing costs upkeep and nothing switches off.
//
// A server with buildings is an outpost: its natives notice it (more often the more you build), and
// a lost defence puts it in lockdown for a while (it stops producing; what's stored stays). Two
// lockdowns left to run out within a day and its Resident regrows (regrow).
import { MUTATIONS, variantFor, CONFIG } from './data.mjs';
import { isLive } from './memory.mjs';
import { rootPorts, rootYield } from './root.mjs';
import { ratingAt, fragment, effLevel } from './firewall.mjs';
import { strength, outcome, grindRate } from './invasion.mjs';
import { launch, fleetCommand } from './fleet.mjs';
import { hooks, emit, warn, rand, active, holding, gainCode, serverLevel, selectEncounter, command, rollDrop, addItem, materialsOf, serviceValue, serviceVersion, gainXp, xpFor, buyoutPrice, BUYOUT, firstTime } from './combat.mjs';
import { MATERIALS, codeOf, seeded } from './gear.mjs';
import { items } from './hidden.mjs';
import { SALVAGE_COSTS, settle, spend, splitPay, canAfford, costLabel } from './salvage.mjs';
import { archYield, archBandwidth, archNotice, archCredits } from './architecture.mjs';
import { consortiumYield, consortiumBandwidth, memberHelp, roam, memberServers } from './consortium.mjs';

// What you can build. kind: producer (fills the store), defence, support. bw: bandwidth it takes.
// cost: credits, code (of the server's family), salvage, Exploits. mins: real time to build.
// lv: server level it needs. plan: needs its plan (vaults, Halcyon's shop) unless you start with it.
// spec: a specialisation, one per server, needing others on the server first (needs).
export const BUILDINGS = {
  siphon: { name: 'Code Siphon', kind: 'producer', bw: 1, cost: { credits: 150, code: 10, salvage: 4 }, mins: 10, lv: 1, rule: 'Produces the server\'s code.', make: (L) => ({ code: 1.5 + L / 10 }) },
  skimmer: { name: 'Credit Skimmer', kind: 'producer', bw: 1, cost: { credits: 300, code: 15, salvage: 8 }, mins: 30, lv: 1, plan: true, heat: 1.5, rule: 'Produces credits. Its natives notice the server 50% more often.', make: (L) => ({ credits: 20 + 3 * L }) },
  mill: { name: 'Scrap Mill', kind: 'producer', bw: 1, cost: { credits: 200, code: 12, salvage: 6 }, mins: 20, lv: 1, plan: true, rule: 'Produces salvage.', make: (L) => ({ salvage: 1 + L / 15 }) },
  node: { name: 'Firewall Node', kind: 'defence', bw: 1, cost: { credits: 200, code: 12, salvage: 6 }, mins: 20, lv: 1, plan: true, rule: 'This server\'s firewall is 3 levels higher.' },
  storage: { name: 'Storage Array', kind: 'support', bw: 1, cost: { credits: 250, code: 12, salvage: 6 }, mins: 20, lv: 1, plan: true, rule: 'This server stores twice as much before it fills.' },
  pipeline: { name: 'Pipeline', kind: 'support', bw: 2, cost: { credits: 400, code: 20, salvage: 10 }, mins: 45, lv: 10, plan: true, rule: 'Producers on this server make 50% more.' },
  ids: { name: 'IDS', kind: 'defence', bw: 1, cost: { credits: 350, code: 18, salvage: 8 }, mins: 40, lv: 1, plan: true, heat: 0.5, rule: 'Natives notice it half as often, and swarms heading here are seen sooner.' },
  lure: { name: 'Honeytoken', kind: 'support', bw: 1, cost: { credits: 250, code: 12, salvage: 6 }, mins: 30, lv: 1, plan: true, heat: 2, rule: 'This server draws trouble. Natives notice it twice as often, and swarms come sooner and pick it first. Beating them here pays double.' },
  miner: { name: 'Data Miner', kind: 'producer', bw: 2, cost: { credits: 500, code: 25, salvage: 12 }, mins: 60, lv: 10, plan: true, rule: 'Rolls the server\'s loot every 90 minutes: credits, code, salvage, now and then a protocol. Better on a Legacy site.', make: () => ({ rolls: 1 / 1.5 }) },
  sentry: { name: 'Sentry Daemon', kind: 'defence', bw: 2, cost: { credits: 600, code: 30, salvage: 15 }, mins: 120, lv: 15, plan: true, rule: 'Kills one virus of every swarm that reaches this server.' },
  refinery: { name: 'Refinery', kind: 'producer', spec: true, bw: 3, cost: { credits: 2500, code: 120, salvage: 50, exploit: 3 }, mins: 360, lv: 20, plan: true, needs: { kind: 'producer', n: 3 }, rule: 'Producers on this server make 50% more, and it stores a day\'s worth.' },
  citadel: { name: 'Citadel', kind: 'defence', spec: true, bw: 3, cost: { credits: 2500, code: 120, salvage: 50, exploit: 3 }, mins: 360, lv: 20, plan: true, needs: { kind: 'defence', n: 2 }, rule: 'This server\'s firewall is 6 levels higher, and a lost defence never locks it down.' },
};

export const OUTPOST = {
  // Members' outposts in a consortium (consortium.mjs) still run the old harvester kinds.
  kinds: {
    siphon: { name: 'Siphon', about: 'A steady flow of the server\'s code.', rate: (L) => 1 + L / 10, cap: (L) => 6 + Math.floor(L / 2), notice: 1 },
    scraper: { name: 'Scraper', about: 'Rolls the server\'s loot now and then.', rate: () => 1 / 1.5, cap: () => 4, notice: 1 },
    tap: { name: 'Tap', about: 'A small trickle of code, rarely noticed.', rate: (L) => 0.5 + L / 20, cap: (L) => 4 + Math.floor(L / 4), notice: 0.25 },
  },
  // Location traits, fixed when a server is found.
  sites: {
    rich: { name: 'Rich', rule: 'Producers here make 50% more.' },
    legacy: { name: 'Legacy', rule: 'Better loot rolls here, and specialisations cost a quarter less.' },
    backbone: { name: 'Backbone', rule: 'One more building slot.' },
    hostile: { name: 'Hostile', rule: 'Natives come twice as often, and producers here make 50% more.' },
    hardened: { name: 'Hardened', rule: 'Its Resident and natives are Armored.' },
  },
  siteChance: 0.45,
  sizes: [['small', 3, 0.3], ['medium', 4, 0.5], ['large', 5, 0.2]], // building slots by server size
  maxSlots: 6,
  storeHours: 8, // a server stores this many hours of what it makes (Storage Array ×2, Refinery a day)
  heatPer: 0.15, // each building makes natives notice the server 15% more often
  queue: 2, // builds at once across the network
  refund: 0.5, // demolishing gives back this share of the cost
  noticeMs: 6 * 3600000, // mean logged-on time before natives notice an outpost
  siegeMs: 10 * 60000, // logged-on time to defend it before it falls
  regrowMs: 24 * 3600000, // two lockdowns left to run out within this and the Resident regrows
  lockdownMs: 2 * 3600000, // real time an outpost stays in lockdown after a lost defence
  // Plans: what you need to know before you can build something (Code Siphon needs none). Halcyon sells
  // them (store.mjs) and vaults hold them.
  plans: { skimmer: 260, mill: 200, node: 260, storage: 220, pipeline: 300, ids: 240, lure: 180, miner: 320, sentry: 380, refinery: 900, citadel: 900 }, // credits at Halcyon, plus 8 a level
  relay: { credits: 60, code: 6, material: 'kernel' }, // to craft one, once a contract has paid you the Relay plan
  planChance: 0.15, // share of vaults holding a plan you don't know yet
  bandwidth: (serverLv) => 3 + Math.floor(serverLv / 4), // network-wide: 3 at level 1, 8 at 20
};

export const plansOf = (s) => (s.plans ||= []);
export const knowsPlan = (s, id) => !BUILDINGS[id]?.plan && !!BUILDINGS[id] || plansOf(s).includes(id);
export const planName = (id) => (id === 'relay' ? 'Relay plan' : `${BUILDINGS[id]?.name || id} plan`);
export const planPrice = (id, L) => OUTPOST.plans[id] + 8 * L;
export function learnPlan(s, id, why = '') {
  if (!OUTPOST.plans[id] && id !== 'relay') return; // the Relay plan only comes from a contract
  if (plansOf(s).includes(id)) { for (let i = 0; i < 2; i++) s.salvage.push({ name: 'Plan scraps', virus: 'plan', seed: 0 }); return emit(s, 'info', `${why}${planName(id)}, already known: +2 salvage.`); }
  plansOf(s).push(id);
  emit(s, 'drop', `${why}${planName(id)}. You can ${id === 'relay' ? 'craft relays on the Craft page' : `build a ${BUILDINGS[id].name} on a server you hold`}.`, { plan: id });
}
// The plan a vault holds, if any (fixed by its seed).
export function vaultPlan(loc) {
  if (loc.zone || loc.rogue) return null;
  const r = seeded(loc.seed * 37 + 13);
  if (!loc.starter && r() >= OUTPOST.planChance) return null;
  const ids = Object.keys(OUTPOST.plans).filter((id) => BUILDINGS[id].lv <= (loc.level || 1) + 5);
  return ids[Math.floor(r() * ids.length)] || null;
}
const locOf = (s, id) => s.locations.find((l) => l.id === id || l.name.toLowerCase() === id);

// A location trait (or none), fixed by its seed.
export function siteTrait(loc) {
  const r = seeded(loc.seed * 29 + 3);
  if (r() >= OUTPOST.siteChance) return null;
  const ids = Object.keys(OUTPOST.sites);
  return ids[Math.floor(r() * ids.length)];
}
export const siteLabel = (loc) => (loc.trait ? OUTPOST.sites[loc.trait] : null);

// Slots and bandwidth -----------------------------------------------------------------------------
export function sizeOf(loc) {
  let x = seeded(loc.seed * 41 + 7)();
  for (const [id, n, p] of OUTPOST.sizes) { if ((x -= p) < 0) return { id, n }; }
  return { id: 'medium', n: 4 };
}
export const slotsOf = (loc) => Math.min(OUTPOST.maxSlots, sizeOf(loc).n + (loc.trait === 'backbone' ? 1 : 0) + rootPorts(loc));
export const buildingsOf = (loc) => (loc ? (loc.buildings ||= []) : []);
export const has = (loc, id) => !!loc?.buildings?.includes(id);
export const hasMod = has; // fleet.mjs, firewall.mjs: an outpost "running" a Honeytoken, an IDS, a Firewall Node
export const isOutpost = (loc) => !!loc?.takenOver && !!loc.buildings?.length;
export const outposts = (s) => (s.locations || []).filter((l) => isOutpost(l) && isLive(s, l)); // a detached server's outpost is frozen (memory.mjs)
export const bandwidth = (s) => OUTPOST.bandwidth(serverLevel(s)) + serviceValue(s, 'router') + archBandwidth(s) + consortiumBandwidth(s);
const bwOf = (ids) => ids.reduce((n, id) => n + (BUILDINGS[id]?.bw || 0), 0);
export const bandwidthUsed = (s) => (s.locations || []).filter((l) => l.takenOver).reduce((n, l) => n + bwOf(buildingsOf(l)) + (l.build ? BUILDINGS[l.build.id]?.bw || 0 : 0), 0);
export const building = (s) => (s.locations || []).filter((l) => l.build);
const legacyOff = (loc, b) => (b.spec && loc?.trait === 'legacy' ? 0.75 : 1);
export const buildCost = (s, id, loc = null) => {
  const b = BUILDINGS[id], k = loc ? codeOf(loc.family) : 'worm', m = legacyOff(loc, b);
  return { credits: Math.round(archCredits(s, b.cost.credits) * m), code: { [k]: Math.round(b.cost.code * m), ...(b.cost.exploit ? { exploit: b.cost.exploit } : {}) }, salvage: { any: Math.round(b.cost.salvage * m), need: [] } };
};
// Why you can't build this here right now (or null).
export function buildBlock(s, loc, id, now = hooks.now?.() ?? Date.now()) {
  const b = BUILDINGS[id];
  if (!b) return 'No such building.';
  if (!loc?.takenOver) return 'Take the server over first: beat the Resident in /core.';
  if (!knowsPlan(s, id)) return `You need the ${planName(id)}.`;
  if (serverLevel(s) < b.lv) return `Needs server level ${b.lv}.`;
  if (has(loc, id) || loc.build?.id === id) return `${loc.name} already has one.`;
  if (loc.build) return `${loc.name} is already building something.`;
  if (building(s).length >= OUTPOST.queue) return `You can build ${OUTPOST.queue} things at once across your network.`;
  if (buildingsOf(loc).length >= slotsOf(loc)) return `${loc.name}'s ${slotsOf(loc)} slots are full.`;
  if (bandwidthUsed(s) + b.bw > bandwidth(s)) return `Not enough bandwidth (${bandwidthUsed(s)}/${bandwidth(s)}, this takes ${b.bw}).`;
  if (b.spec && buildingsOf(loc).some((x) => BUILDINGS[x]?.spec)) return 'One specialisation per server.';
  if (b.needs && buildingsOf(loc).filter((x) => BUILDINGS[x]?.kind === b.needs.kind && !BUILDINGS[x].spec).length < b.needs.n) return `Needs ${b.needs.n} ${b.needs.kind === 'producer' ? 'producers' : 'defences'} on this server first.`;
  if (loc.outpost?.lockdown) return 'Not while it is in lockdown.';
  const c = buildCost(s, id, loc), have = materialsOf(s);
  if (s.server.credits < c.credits || Object.entries(c.code).some(([k, n]) => (have[k] || 0) < n) || !canAfford(s, c.salvage)) return `It costs ${costLine(c)}.`;
  return null;
}
export const costLine = (c) => [`${c.credits} credits`, ...Object.entries(c.code).map(([k, n]) => `${n} ${MATERIALS[k].name}`), c.salvage.any ? `${c.salvage.any} salvage` : ''].filter(Boolean).join(', ');

function startBuild(s, loc, id, payText, now) {
  const why = buildBlock(s, loc, id, now);
  if (why) return warn(s, `${BUILDINGS[id]?.name || id}: ${why}`);
  const c = buildCost(s, id, loc), have = materialsOf(s);
  const pay = settle(s, c.salvage, payText);
  if (typeof pay === 'string') return warn(s, `${BUILDINGS[id].name}: ${pay}`);
  spend(s, pay);
  s.server.credits -= c.credits;
  for (const [k, n] of Object.entries(c.code)) have[k] -= n;
  const ms = BUILDINGS[id].mins * 60000;
  loc.build = { id, startedAt: now, doneAt: now + ms };
  emit(s, 'outpost-up', `Building a ${BUILDINGS[id].name} on ${loc.name}: ${BUILDINGS[id].mins >= 60 ? `${BUILDINGS[id].mins / 60} h` : `${BUILDINGS[id].mins} min`}.`, { location: loc.id });
}
function finishBuild(s, loc) {
  const id = loc.build.id;
  loc.build = null;
  buildingsOf(loc).push(id);
  loc.outpost ||= { at: hooks.now?.() ?? Date.now(), stock: {}, lockdown: null };
  emit(s, 'outpost-up', `${BUILDINGS[id].name} built on ${loc.name}. ${BUILDINGS[id].rule}`, { location: loc.id });
  firstTime(s, 'building-' + id, `first ${BUILDINGS[id].name}`);
}
function demolish(s, loc, id) {
  if (!has(loc, id)) return warn(s, `${loc.name} has no ${BUILDINGS[id]?.name || id}.`);
  if (s.fleet?.target === loc.id && s.fleet.state === 'siege') return warn(s, 'Not while a swarm is at it.');
  loc.buildings = buildingsOf(loc).filter((x) => x !== id);
  const c = buildCost(s, id, loc), back = Math.round(c.credits * OUTPOST.refund);
  s.server.credits += back;
  emit(s, 'info', `${BUILDINGS[id].name} on ${loc.name} taken down: ${back} credits back.`, { location: loc.id });
}

// What it makes ----------------------------------------------------------------------------------
const yieldMult = (s, loc) => (has(loc, 'pipeline') ? 1.5 : 1) * (has(loc, 'refinery') ? 1.5 : 1) * (loc.trait === 'rich' || loc.trait === 'hostile' ? 1.5 : 1) * rootYield(loc) * (s ? archYield(s) * consortiumYield(s) : 1); // Root 4/5: ×1.25/×2 (root.mjs)
// Per hour, by resource: { code, credits, salvage, rolls }.
export function makes(s, loc) {
  const out = {}, m = yieldMult(s, loc), L = loc.level || 1;
  for (const id of buildingsOf(loc)) for (const [k, v] of Object.entries(BUILDINGS[id]?.make?.(L) || {})) out[k] = (out[k] || 0) + v * m;
  return out;
}
const storeHours = (loc) => OUTPOST.storeHours * (has(loc, 'storage') ? 2 : 1) * (has(loc, 'refinery') ? 3 : 1);
export const capOf = (s, loc) => Object.fromEntries(Object.entries(makes(s, loc)).map(([k, v]) => [k, k === 'rolls' ? Math.max(4, Math.round(v * storeHours(loc))) : Math.ceil(v * storeHours(loc))]));
export const stockOf = (loc) => Object.values(loc.outpost?.stock || {}).reduce((n, v) => n + Math.floor(v), 0);
function produce(s, loc, ms) {
  const o = loc.outpost;
  if (!o || o.lockdown || ms <= 0) return;
  const per = makes(s, loc), cap = capOf(s, loc);
  o.stock ||= {};
  for (const [k, v] of Object.entries(per)) o.stock[k] = Math.min(cap[k], (o.stock[k] || 0) + v * (ms / 3600000));
}

// Collect what's stored (on connect, or by the Scheduler).
export function collect(s, loc, why = 'Outpost: ') {
  const st = loc.outpost?.stock;
  if (!st || !stockOf(loc)) return;
  const take = (k) => { const n = Math.floor(st[k] || 0); st[k] = (st[k] || 0) - n; return n; };
  const code = take('code'), credits = take('credits'), salvage = take('salvage'), rolls = take('rolls');
  if (code) gainCode(s, { [codeOf(loc.family)]: code }, `${why}${loc.name}: `);
  if (credits) { s.server.credits += credits; emit(s, 'harvest', `${why}${loc.name}: +${credits} credits.`, { location: loc.id }); }
  for (let i = 0; i < salvage; i++) s.salvage.push({ name: `${loc.name} scrap`, virus: loc.name, seed: loc.seed + i });
  if (salvage) emit(s, 'harvest', `${why}${loc.name}: +${salvage} salvage.`, { location: loc.id });
  if (rolls) { const got = scrape(s, loc, rolls, loc.level || 1, loc.trait === 'legacy' ? 0.05 : 0, `${why}${loc.name}: `); emit(s, 'harvest', `${why}${loc.name}'s Data Miner turned up ${got || 'a protocol'}.`, { location: loc.id }); }
}
// n loot rolls on a server: mostly credits, some code, salvage, now and then a protocol. Returns
// what turned up, as text ('' if only protocols, which announce themselves). consortium.mjs uses it too.
export function scrape(s, loc, n, level, lucky = 0, why = '') {
  let credits = 0, code = 0, salvage = 0;
  for (let i = 0; i < n; i++) {
    const x = rand(s);
    if (x < 0.05 + lucky) { const item = rollDrop(s, 'guard', level); if (item) addItem(s, item, why); else credits += 20 + 3 * level; }
    else if (x < 0.15 + lucky * 2) salvage++;
    else if (x < 0.4 + lucky * 2) code += 2 + Math.floor(level / 10);
    else credits += 20 + 3 * level;
  }
  if (credits) s.server.credits += credits;
  for (let i = 0; i < salvage; i++) s.salvage.push({ name: `${loc.name} scrap`, virus: loc.name, seed: loc.seed + i });
  if (code) gainCode(s, { [codeOf(loc.family)]: code }, '');
  return [credits ? credits + ' credits' : '', code ? `${code} ${MATERIALS[codeOf(loc.family)].name}` : '', salvage ? `${salvage} salvage` : ''].filter(Boolean).join(', ');
}

// Testing (developer outpost <server> [building…]): a held server with these built (a Code Siphon if none).
export function devOutpost(s, id, ids = [], now = hooks.now?.() ?? Date.now()) {
  const loc = locOf(s, id);
  if (!loc) return warn(s, 'No such server.');
  loc.takenOver = true;
  loc.buildings = (ids.length ? ids : ['siphon']).filter((x) => BUILDINGS[x]);
  loc.outpost = { at: now, stock: {}, lockdown: null, ...(loc.outpost?.fw ? { fw: loc.outpost.fw } : {}) };
  emit(s, 'outpost-up', `${loc.name}: ${loc.buildings.map((x) => BUILDINGS[x].name).join(', ')}.`, { location: loc.id });
}

// Saves from before buildings: a harvester becomes its building, modules become theirs, and what
// can't fit (or was in the rack or the module stock) comes back as credits.
export function retireHarvesters(s) {
  const refund = (n) => { s.server.credits += n; return n; };
  let back = 0;
  for (const loc of s.locations || []) {
    const o = loc.outpost, was = [];
    if (o?.h) was.push(o.h.kind === 'scraper' ? 'miner' : 'siphon');
    for (const m of loc.mods || []) if (BUILDINGS[m]) was.push(m);
    if (!was.length) continue;
    if (o?.h && o.stock) gainCode(s, { [codeOf(loc.family)]: Math.floor(o.stock) }, `${loc.name}'s old harvester: `);
    for (const id of [...new Set(was)]) { if (buildingsOf(loc).length < slotsOf(loc)) buildingsOf(loc).push(id); else back += refund(150); }
    delete loc.mods;
    loc.outpost = { at: o?.at ?? Date.now(), stock: {}, lockdown: o?.lockdown || null, ...(o?.fw ? { fw: o.fw } : {}) };
  }
  for (const h of s.harvesters || []) back += refund(200);
  for (const n of Object.values(s.modStock || {})) back += refund(150 * n);
  delete s.harvesters; delete s.modStock;
  // Plans: a Scraper's becomes the Data Miner's, a Tap's the Credit Skimmer's; the Siphon needs none now.
  if (s.plans) s.plans = [...new Set(s.plans.map((p) => ({ scraper: 'miner', tap: 'skimmer' }[p] || p)).filter((p) => p === 'relay' || OUTPOST.plans[p]))];
  if (back) emit(s, 'info', `Harvesters and modules are buildings now. What didn't become one came back as ${back} credits.`);
}

// The clock ------------------------------------------------------------------------------------
// Production runs on real time (offline too). Natives notice an outpost on real time too, so
// logging off doesn't dodge them, but a siege only counts down while you're logged on: one that
// starts while you're away waits for you. An outpost produces nothing while a siege (or a swarm)
// sits at it.
export function tickOutposts(s, now, dt, paused = false, away = false) {
  tickBuilds(s, now);
  tickSites(s, now, dt, paused, away);
  if (!paused) tickScheduler(s, now);
}

// The Resident regrows: the server isn't yours until you beat it in /core again. What you built
// waits, idle, and comes back with it.
export function regrow(s, loc) {
  loc.takenOver = false;
  loc.lapsed = [];
  delete loc.state.cleared['/core'];
  emit(s, 'outpost-fell', `${loc.name}'s Resident regrew. The server isn't yours until you beat it in /core again. What you built there waits.`, { location: loc.id });
}

// Builds run in real time, offline too; a lockdown or a swarm at the server holds them up.
function tickBuilds(s, now) {
  for (const loc of s.locations || []) {
    const b = loc.build;
    if (!b) continue;
    const since = b.at ?? now;
    b.at = now;
    if (loc.outpost?.lockdown || (s.fleet?.target === loc.id && s.fleet.state === 'siege') || !loc.takenOver) { b.doneAt += Math.max(0, now - since); continue; }
    if (now >= b.doneAt) finishBuild(s, loc);
  }
}
// How much more often natives notice a server: each building, and some (a Credit Skimmer, a Honeytoken) more.
export const heatOf = (s, loc) => (1 + OUTPOST.heatPer * buildingsOf(loc).length) * buildingsOf(loc).reduce((m, id) => m * (BUILDINGS[id]?.heat || 1), 1) * (loc.trait === 'hostile' ? 2 : 1) * archNotice(s);

// (Infestations are gone: a Root rotation is the virus that moves in for you to clear.)
function tickSites(s, now, dt, paused, away) {
  for (const loc of outposts(s)) {
    const o = loc.outpost;
    if (o.fallen) { o.fallen = false; o.lockdown = { left: OUTPOST.lockdownMs }; } // saves from before lockdowns
    const since = o.at ?? now;
    o.at = now;
    if (o.lockdown) {
      o.lockdown.left -= now - since;
      if (o.lockdown.left > 0) continue;
      o.lockdown = null;
      // A lockdown you let run out while logged on: two in a day and the Resident regrows (run.mjs
      // /core). One that ends while you're away doesn't count: being away never costs you a server.
      if (!away) loc.lapsed = [...(loc.lapsed || []).filter((t) => now - t < OUTPOST.regrowMs), now];
      if ((loc.lapsed || []).length >= 2) { regrow(s, loc); continue; }
      emit(s, 'outpost-up', `${loc.name}'s lockdown is over: it's producing again. Another lockdown left to run out within a day and its Resident regrows.`, { location: loc.id });
      continue;
    }
    if (paused) continue;
    const elapsed = Math.max(0, now - since), swarmed = s.fleet?.target === loc.id && s.fleet.state === 'siege';
    if (!swarmed) produce(s, loc, elapsed);
    if (s.fleet) continue; // one swarm at a time: natives wait their turn
    const mult = heatOf(s, loc) * (away ? 0.5 : 1);
    if (elapsed > 0 && rand(s) < Math.min(1, elapsed / OUTPOST.noticeMs) * mult) startSiege(s, loc);
  }
}

// Natives come for it: a small swarm (fleet.mjs), at the outpost's level, from close by. It meets
// the outpost's firewall on arrival like any swarm.
export const nativeRatio = (s, loc, level = loc.level || 1) => ratingAt(s, loc, loc.family) / strength(level);
export const startSiege = (s, loc) => launch(s, hooks.now?.() ?? Date.now(), null, { natives: loc });

export function fall(s, loc, force = false) {
  const o = loc.outpost;
  // A Citadel holds: a lost defence costs you the fight, not the server's output.
  if (has(loc, 'citadel') && !force) return emit(s, 'outpost-held', `${loc.name}'s Citadel held: no lockdown.`, { location: loc.id });
  o.lockdown = { left: OUTPOST.lockdownMs }; // what's stored stays; the server stays open
  emit(s, 'outpost-fell', `LOCKDOWN: natives took ${loc.name}. It stops producing for ${OUTPOST.lockdownMs / 3600000} hours; what's stored is kept. Retake it to end it sooner.`, { location: loc.id });
}

// The Scheduler (a home service) collects every outpost on a timer, real time, offline too.
export const schedulerEvery = (s) => (serviceVersion(s, 'scheduler') ? serviceValue(s, 'scheduler') * 60000 : 0);
function tickScheduler(s, now) {
  const every = schedulerEvery(s);
  const net = (s.net ||= {});
  if (!every) { net.schedAt = null; return; }
  if (net.schedAt == null) { net.schedAt = now + every; return; }
  if (now < net.schedAt) return;
  net.schedAt = now + every;
  for (const loc of outposts(s)) if (!loc.outpost.lockdown && stockOf(loc)) collect(s, loc, 'Scheduler: ');
}

// Relays (hidden.mjs): crafted from the Relay plan, installed from a held server's card.
export const relayCost = (s) => ({ credits: archCredits(s, OUTPOST.relay.credits), code: { [OUTPOST.relay.material]: OUTPOST.relay.code }, salvage: SALVAGE_COSTS.relay() });
export const canBuildRelay = (s) => { const c = relayCost(s); return knowsPlan(s, 'relay') && s.server.credits >= c.credits && (materialsOf(s)[OUTPOST.relay.material] || 0) >= OUTPOST.relay.code && canAfford(s, c.salvage); };
function buildRelay(s, payText = null) {
  if (!knowsPlan(s, 'relay')) return warn(s, 'You don\'t have the Relay plan. Some Halcyon contracts pay it.');
  const c = relayCost(s), k = OUTPOST.relay.material, have = materialsOf(s);
  if (s.server.credits < c.credits || (have[k] || 0) < OUTPOST.relay.code) return warn(s, `A relay costs ${c.credits} credits, ${OUTPOST.relay.code} ${MATERIALS[k].name} and ${c.salvage.any} salvage.`);
  const pay = settle(s, c.salvage, payText);
  if (typeof pay === 'string') return warn(s, `Relay: ${pay}`);
  spend(s, pay);
  s.server.credits -= c.credits;
  have[k] -= OUTPOST.relay.code;
  items(s).relay += 1;
  emit(s, 'harvester', `Crafted a relay (${items(s).relay} in your kit). Install it from a server you've taken over.`, { relay: true });
}

// Fights ---------------------------------------------------------------------------------------
const NATIVE = { ransomware: 'cryptjack', worm: 'splinter', ghostroot: 'ghostroot' };
function fightNatives(s, loc, why) {
  const seed = ((loc.seed * 7 + (s.serial || 0)) >>> 0) || 1;
  const mutation = loc.trait === 'hardened' ? 'armored' : null;
  const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
  const { strain, grade } = variantFor(loc.family, loc.level || 1, loc.depth || 1, seed);
  selectEncounter(s, NATIVE[loc.family], seed, { level: loc.level || 1, mutation: mutation && MUTATIONS[mutation] ? mutation : null, strain, grade, quiet: true });
  if (!s.encounter || s.encounter.phase === 'active') return;
  s.gate = gate && gate !== s.encounter ? gate : null;
  s.encounter.outpost = loc.id;
  emit(s, 'jack-in', `${why} ${loc.name}: ${s.encounter.virus.name}.`, { location: loc.id });
  command(s, 'engage');
}

// Called from finish() when a fight with e.outpost ends in a win.
export function outpostWon(s, e) {
  const loc = locOf(s, e.outpost);
  const o = loc?.outpost;
  if (!o) return;
  if (o.lockdown) {
    o.lockdown = null;
    emit(s, 'outpost-held', `${loc.name} retaken: the lockdown is over and it's harvesting again.`, { location: loc.id });
  }
}

// Commands -------------------------------------------------------------------------------------
// outpost build <server> <building> · outpost demolish <server> <building> · outpost buyout <server>
// outpost defend <server> · outpost retake <server> (ends a lockdown) · outpost build relay (craft one)
// Buyout (combat.mjs BUYOUT): end a lockdown, or finish a build, now, for credits.
export function outpostBuyout(loc, now = Date.now()) {
  const o = loc?.outpost;
  if (o?.lockdown) return { what: 'lockdown', price: buyoutPrice(BUYOUT.lockdown, o.lockdown.left, OUTPOST.lockdownMs) };
  const b = loc?.build;
  if (b && now < b.doneAt) return { what: 'build', price: buyoutPrice(Math.round(BUILDINGS[b.id].cost.credits / 2), b.doneAt - now, b.doneAt - b.startedAt) };
  return null;
}
function buyout(s, loc, now) {
  const b = outpostBuyout(loc, now);
  if (!b) return warn(s, `Nothing to finish on ${loc.name}.`);
  if (s.server.credits < b.price) return warn(s, `That costs ${b.price} credits; you have ${s.server.credits}.`);
  s.server.credits -= b.price;
  if (b.what === 'lockdown') { loc.outpost.lockdown = null; emit(s, 'outpost-held', `Bought out: ${loc.name}'s lockdown is over for ${b.price} credits.`, { location: loc.id }); }
  else { emit(s, 'bought', `Bought out: the build on ${loc.name} is done for ${b.price} credits.`, { location: loc.id, amount: b.price }); finishBuild(s, loc); }
}
const byName = (id) => (BUILDINGS[id] ? id : Object.keys(BUILDINGS).find((k) => BUILDINGS[k].name.toLowerCase().replace(/\s+/g, '-') === id || BUILDINGS[k].name.toLowerCase().split(' ')[0] === id) || id);
export function outpostCommand(s, full, now) {
  const [text, payText] = splitPay(full);
  const [, verb, a, b] = text.split(' ');
  if (verb === 'build' && a === 'relay' && !b) return buildRelay(s, payText);
  if (['compile', 'install', 'pull', 'mod', 'unmod'].includes(verb)) return warn(s, 'Harvesters and modules are buildings now: outpost build <server> <building>.');
  const loc = a && locOf(s, a);
  const theirs = !loc && a && memberServers(s).find((l) => l.id === a || l.name.toLowerCase() === a);
  if (theirs) return warn(s, `${theirs.name} is ${theirs.member}'s: only they build there.`);
  if (!loc) return warn(s, 'usage: outpost build|demolish <server> <building>, or outpost buyout|defend|retake <server>');
  if (verb === 'build') return startBuild(s, loc, byName(b), payText, now);
  if (verb === 'demolish') return demolish(s, loc, byName(b));
  if (verb === 'buyout') return buyout(s, loc, now);
  if (s.run) return warn(s, 'Jack out first.');
  if (active(s)) return warn(s, 'Finish the fight first.');
  if (verb === 'defend') return s.fleet?.target === loc.id ? fleetCommand(s, 'swarm engage') : warn(s, `Nothing is coming for ${loc.name}.`);
  if (verb === 'retake') return loc.outpost?.lockdown ? fightNatives(s, loc, 'Retaking') : warn(s, `${loc.name} isn't in lockdown.`);
  warn(s, 'usage: outpost build|demolish <server> <building>, or outpost buyout|defend|retake <server>');
}

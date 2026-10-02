// Outposts: harvesters on servers you've taken over.
//
// A harvester is a packaged virus: a kind (Siphon, Scraper, Tap), a level, and 0–2 traits
// (Stock none, Tuned one, Custom two). Mostly you compile them (Stock, from credits and code).
// Rarely a vault holds a packaged native (<family>.vx), and only those can carry traits.
//
// Install one on a server you've taken over and it produces in real time, offline too, into a
// stockpile with a cap. Connecting to the server collects it. Bandwidth limits how many run at
// once.
//
// Natives notice outposts (logged-on time only) and lay siege: defend it in time or it falls.
// A fallen outpost loses its stockpile and goes dark. Retake it by beating the natives there,
// then repair it. While it's down, servers past it can't be reached, but invaders from past it
// still come through to you.
import { MUTATIONS, variantFor } from './data.mjs';
import { emit, warn, rand, active, gainCode, serverLevel, selectEncounter, command, rollDrop, addItem, materialsOf, serviceValue, serviceVersion, gainXp, xpFor } from './combat.mjs';
import { MATERIALS, codeOf, seeded } from './gear.mjs';
import { SALVAGE_COSTS, settle, spend, splitPay, canAfford, costLabel } from './salvage.mjs';
import { archYield, archBandwidth, archNotice, archCredits } from './architecture.mjs';
import { consortiumYield, consortiumBandwidth } from './consortium.mjs';

export const OUTPOST = {
  kinds: {
    siphon: { name: 'Siphon', about: 'A steady flow of the server\'s code.', rate: (L) => 1 + L / 10, cap: (L) => 6 + Math.floor(L / 2), notice: 1 },
    scraper: { name: 'Scraper', about: 'Rolls the server\'s loot now and then.', rate: () => 1 / 1.5, cap: () => 4, notice: 1 },
    tap: { name: 'Tap', about: 'A small trickle of code, rarely noticed.', rate: (L) => 0.5 + L / 20, cap: (L) => 4 + Math.floor(L / 4), notice: 0.25 },
  },
  traits: {
    rich: { name: 'Rich', rule: '+50% yield.' },
    deep: { name: 'Deep', rule: 'Double storage.' },
    quiet: { name: 'Quiet', rule: 'Natives notice it half as often.' },
    sturdy: { name: 'Sturdy', rule: 'Half the time, a siege gives up on its own.' },
    lucky: { name: 'Lucky', rule: 'Better loot rolls.' },
  },
  // Location traits, fixed when a server is found.
  sites: {
    rich: { name: 'Rich', rule: 'Harvesters here yield +50%.' },
    legacy: { name: 'Legacy', rule: 'Better loot rolls here.' },
    backbone: { name: 'Backbone', rule: 'An outpost here uses no bandwidth.' },
    hostile: { name: 'Hostile', rule: 'Twice the sieges, +50% yield.' },
    hardened: { name: 'Hardened', rule: 'Its natives are Armored.' },
  },
  siteChance: 0.45,
  kindOdds: [['siphon', 0.5], ['scraper', 0.3], ['tap', 0.2]],
  rarityOdds: [[0, 0.55], [1, 0.35], [2, 0.1]], // number of traits
  noticeMs: 4 * 3600000, // mean logged-on time before natives notice an outpost
  siegeMs: 10 * 60000, // logged-on time to defend it before it falls
  resetMs: 30 * 60000, // after a pull-out, the port resets before a new one fits
  stashCap: 6,
  vaultChance: 0.12, // share of vaults holding a packaged native (Legacy sites: double)
  compile: { credits: 200, code: 15, material: { siphon: 'worm', scraper: 'cipher', tap: 'kernel' } },
  repair: { credits: (L) => 40 + 8 * L, code: (L) => 4 + Math.floor(L / 5) },
  // Outpost ports and the modules that go in them. The ports belong to the server, so modules
  // stay put when you swap or pull the harvester, and sleep while the outpost is lost.
  ports: (serverLv) => 2 + (serverLv >= 20 ? 1 : 0) + (serverLv >= 35 ? 1 : 0),
  mods: {
    pipeline: { name: 'Pipeline', rule: '+50% yield.' },
    storage: { name: 'Storage Array', rule: 'Double storage.' },
    node: { name: 'Firewall Node', rule: 'Sieges and swarms here take twice as long to take it.' },
    ids: { name: 'IDS', rule: 'Natives notice it half as often, and swarms heading here are seen sooner.' },
  },
  modCost: { credits: 150, code: 8, salvage: 5 },
  bandwidth: (serverLv) => Math.min(5, 1 + Math.floor(serverLv / 10)),
};
const RARITY = ['Stock', 'Tuned', 'Custom'];

export const harvesters = (s) => (s.harvesters ||= []);
const locOf = (s, id) => s.locations.find((l) => l.id === id || l.name.toLowerCase() === id);
const pick = (r, odds) => { let x = r(); for (const [k, p] of odds) { if ((x -= p) < 0) return k; } return odds[0][0]; };

export const harvesterName = (h) => `${RARITY[h.traits.length]} ${OUTPOST.kinds[h.kind].name} lv${h.level}${h.traits.length ? ` (${h.traits.map((t) => OUTPOST.traits[t].name).join(', ')})` : ''}`;

// A location trait (or none), fixed by its seed.
export function siteTrait(loc) {
  const r = seeded(loc.seed * 29 + 3);
  if (r() >= OUTPOST.siteChance) return null;
  const ids = Object.keys(OUTPOST.sites);
  return ids[Math.floor(r() * ids.length)];
}

// The packaged native in a location's vault: the same every time you look.
export function vaultHarvester(loc) {
  const r = seeded(loc.seed * 17 + 9);
  const kind = pick(r, OUTPOST.kindOdds);
  let n = pick(r, OUTPOST.rarityOdds);
  if (loc.trait === 'legacy' && n < 2 && r() < 0.5) n++;
  const pool = Object.keys(OUTPOST.traits);
  const traits = [];
  while (traits.length < n) { const t = pool[Math.floor(r() * pool.length)]; if (!traits.includes(t)) traits.push(t); }
  return { kind, level: loc.level || 1, traits, family: loc.family };
}
export const vxName = (loc) => `${loc.family}.vx`;
export const hasVx = (loc) => !loc.zone && seeded(loc.seed * 19 + 11)() < OUTPOST.vaultChance * (loc.trait === 'legacy' ? 2 : 1);
export const compileCost = (kind, s = null) => ({ credits: s ? archCredits(s, OUTPOST.compile.credits) : OUTPOST.compile.credits, code: OUTPOST.compile.code, material: OUTPOST.compile.material[kind], salvage: SALVAGE_COSTS['harvester-' + kind]() });
export const canCompile = (s, kind) => { const c = compileCost(kind, s); return s.server.credits >= c.credits && (materialsOf(s)[c.material] || 0) >= c.code && harvesters(s).length < OUTPOST.stashCap && canAfford(s, c.salvage); };

// Banked on jack-out.
export function bankHarvester(s, h, why = 'Banked: ') {
  if (harvesters(s).length >= OUTPOST.stashCap) {
    for (let i = 0; i < 2; i++) s.salvage.push({ name: 'Harvester scraps', virus: 'harvester', seed: s.serial });
    return emit(s, 'info', `Your harvester rack is full (${OUTPOST.stashCap}): the package broke down into 2 salvage.`);
  }
  harvesters(s).push({ ...h });
  emit(s, 'harvester', `${why}${harvesterName(h)}, a packaged native. Install it on a server you've taken over.`, { harvester: true });
}

// Bandwidth -----------------------------------------------------------------------------------
export const bandwidth = (s) => OUTPOST.bandwidth(serverLevel(s)) + serviceValue(s, 'router') + archBandwidth(s) + consortiumBandwidth(s);
export const modsOf = (loc) => (loc ? (loc.mods ||= []) : []);
export const hasMod = (loc, id) => !!loc?.mods?.includes(id);
export const outpostPorts = (s) => OUTPOST.ports(serverLevel(s));
export const outposts = (s) => (s.locations || []).filter((l) => l.outpost?.h);
export const bandwidthUsed = (s) => outposts(s).filter((l) => l.trait !== 'backbone').length;

// Is this server cut off? Any server it hangs off (all the way up) is a fallen outpost.
export function cutOffBy(s, loc) {
  for (let p = loc?.parent && locOf(s, loc.parent), seen = 0; p && seen < 50; p = p.parent && locOf(s, p.parent), seen++) if (p.outpost?.fallen) return p;
  return null;
}

// Yield ----------------------------------------------------------------------------------------
const yieldMult = (loc, h, s) => (1 + (h.traits.includes('rich') ? 0.5 : 0) + (hasMod(loc, 'pipeline') ? 0.5 : 0)) * (loc.trait === 'rich' || loc.trait === 'hostile' ? 1.5 : 1) * (s ? archYield(s) * consortiumYield(s) : 1);
export const capOf = (loc, h = loc.outpost.h) => OUTPOST.kinds[h.kind].cap(h.level) * (h.traits.includes('deep') ? 2 : 1) * (hasMod(loc, 'storage') ? 2 : 1);
export const perHour = (loc, h = loc.outpost.h, s = null) => OUTPOST.kinds[h.kind].rate(h.level) * yieldMult(loc, h, s);
export const stockOf = (loc) => Math.floor(loc.outpost?.stock || 0);

function produce(s, loc, ms) {
  const o = loc.outpost;
  if (!o?.h || o.fallen || ms <= 0) return;
  o.stock = Math.min(capOf(loc), (o.stock || 0) + perHour(loc, o.h, s) * (ms / 3600000));
}

// Collect the stockpile (on connect, or when pulled out).
export function collect(s, loc, why = 'Outpost: ') {
  const o = loc.outpost;
  const n = stockOf(loc);
  if (!o?.h || !n) return;
  o.stock -= n;
  const h = o.h;
  if (h.kind !== 'scraper') return gainCode(s, { [codeOf(loc.family)]: n }, `${why}${loc.name}: `);
  const lucky = (h.traits.includes('lucky') ? 0.05 : 0) + (loc.trait === 'legacy' ? 0.05 : 0);
  let credits = 0, code = 0, salvage = 0;
  for (let i = 0; i < n; i++) {
    const x = rand(s);
    if (x < 0.05 + lucky) { const item = rollDrop(s, 'guard', h.level); if (item) addItem(s, item, `${why}${loc.name}: `); else credits += 20 + 3 * h.level; }
    else if (x < 0.15 + lucky * 2) salvage++;
    else if (x < 0.4 + lucky * 2) code += 2 + Math.floor(h.level / 10);
    else credits += 20 + 3 * h.level;
  }
  if (credits) s.server.credits += credits;
  for (let i = 0; i < salvage; i++) s.salvage.push({ name: `${loc.name} scrap`, virus: loc.name, seed: loc.seed + i });
  if (code) gainCode(s, { [codeOf(loc.family)]: code }, '');
  emit(s, 'harvest', `${why}${loc.name}'s Scraper turned up ${[credits ? credits + ' credits' : '', code ? `${code} ${MATERIALS[codeOf(loc.family)].name}` : '', salvage ? `${salvage} salvage` : ''].filter(Boolean).join(', ') || 'a protocol'}.`, { location: loc.id });
}

// The clock ------------------------------------------------------------------------------------
// Production runs on real time (offline too). Sieges run on logged-on time (dt), like invasions.
export function tickOutposts(s, now, dt, paused = false) {
  tickSites(s, now, dt, paused);
  if (!paused) { tickScheduler(s, now); tickInfest(s, dt); }
}

// Infestations ----------------------------------------------------------------------------------
// Now and then a few viruses move into one of your outposts for a while. Clear them (outpost
// clear <server>, one fight each) for a bonus to that outpost's stockpile and XP; ignore them and
// they move on, costing nothing. The more outposts you hold, the more often it happens, so the
// fighting grows with your network. Logged-on time, like sieges; Degraded mode pauses it.
export const INFEST = { everyMs: 60 * 60000, minMs: 15 * 60000, stayMs: 20 * 60000, size: [2, 3], bonusMs: 60 * 60000 };
const infestEvery = (n) => Math.max(INFEST.minMs, INFEST.everyMs / Math.max(1, n));
function tickInfest(s, dt) {
  if (dt <= 0) return;
  const net = (s.net ||= {});
  for (const loc of outposts(s)) {
    const inf = loc.outpost.infest;
    if (!inf) continue;
    if (s.encounter?.infest === loc.id && active(s)) continue; // the clock waits while you clear it
    inf.left -= dt;
    if (inf.left <= 0) { loc.outpost.infest = null; emit(s, 'info', `The infestation on ${loc.name} moved on.`, { location: loc.id }); }
  }
  const ok = outposts(s).filter((l) => !l.outpost.fallen && !l.outpost.siege && !l.outpost.infest);
  if (!ok.length) return;
  if (net.infestNext == null) net.infestNext = infestEvery(outposts(s).length);
  net.infestNext -= dt;
  if (net.infestNext > 0) return;
  net.infestNext = infestEvery(outposts(s).length);
  const loc = ok[Math.floor(rand(s) * ok.length)];
  const [lo, hi] = INFEST.size, n = lo + Math.floor(rand(s) * (hi - lo + 1));
  loc.outpost.infest = { total: n, count: n, left: INFEST.stayMs, seed: (Math.floor(rand(s) * 2 ** 31) >>> 0) || 1 };
  emit(s, 'infest', `INFESTED: ${n} viruses moved into your outpost on ${loc.name}. Clear them within ${INFEST.stayMs / 60000} minutes for a bonus.`, { location: loc.id });
}
function clearInfest(s, loc) {
  const inf = loc.outpost?.infest;
  if (!inf) return warn(s, `${loc.name} isn't infested.`);
  const seed = (inf.seed + inf.count * 7919) >>> 0;
  const fams = ['ransomware', 'worm', 'ghostroot'];
  const family = rand(s) < 0.6 ? loc.family : fams[seed % fams.length];
  const { strain, grade } = variantFor(family, loc.level || 1, loc.depth || 1, seed);
  const gate = s.encounter?.phase === 'alert' && s.encounter.mode !== 'run' ? s.encounter : s.gate;
  selectEncounter(s, 'random', seed, { level: loc.level || 1, family, strain, grade, mutation: null, quiet: true });
  if (!s.encounter || s.encounter.phase === 'active') return;
  s.gate = gate && gate !== s.encounter ? gate : null;
  s.encounter.infest = loc.id;
  emit(s, 'jack-in', `Clearing ${loc.name}: ${s.encounter.virus.name}, ${inf.total - inf.count + 1} of ${inf.total}.`, { location: loc.id });
  command(s, 'engage');
}
// Called from finish() when an infestation fight is won.
export function infestWon(s, e) {
  const loc = locOf(s, e.infest), inf = loc?.outpost?.infest;
  if (!inf) return;
  inf.count--;
  if (inf.count > 0) return emit(s, 'info', `${inf.count} left on ${loc.name}.`, { location: loc.id });
  loc.outpost.infest = null;
  const before = loc.outpost.stock || 0;
  produce(s, loc, INFEST.bonusMs);
  const got = Math.floor(loc.outpost.stock || 0) - Math.floor(before);
  gainXp(s, xpFor(s, loc.level || 1, 1), `${loc.name} cleared`);
  emit(s, 'outpost-held', `${loc.name} CLEARED. The outpost runs hot for a while: +${got} to its stockpile${got ? '' : ' (it was already full)'}.`, { location: loc.id });
}
function tickSites(s, now, dt, paused) {
  for (const loc of outposts(s)) {
    const o = loc.outpost;
    const since = o.at ?? now;
    o.at = now;
    if (paused) continue;
    produce(s, loc, now - since);
    if (o.fallen) continue;
    if (o.siege) {
      o.siege.left -= dt;
      if (o.siege.left <= 0 && !(s.encounter?.outpost === loc.id && active(s))) fall(s, loc);
      continue;
    }
    const mult = OUTPOST.kinds[o.h.kind].notice * (o.h.traits.includes('quiet') ? 0.5 : 1) * (loc.trait === 'hostile' ? 2 : 1) * (hasMod(loc, 'ids') ? 0.5 : 1) * archNotice(s);
    if (dt > 0 && rand(s) < (dt / OUTPOST.noticeMs) * mult) startSiege(s, loc);
  }
}

function startSiege(s, loc) {
  const seed = (Math.floor(rand(s) * 2 ** 31) >>> 0) || 1;
  const left = OUTPOST.siegeMs * (hasMod(loc, 'node') ? 2 : 1);
  loc.outpost.siege = { left, seed };
  emit(s, 'outpost-siege', `${loc.name}'s natives are sieging your outpost. Defend it within ${left / 60000} minutes or it falls.`, { location: loc.id });
}

export function fall(s, loc, force = false) {
  const o = loc.outpost;
  if (!force && o.h.traits.includes('sturdy') && rand(s) < 0.5) {
    o.siege = null;
    return emit(s, 'outpost-held', `${loc.name} held on its own: the Sturdy harvester outlasted the siege.`, { location: loc.id });
  }
  o.siege = null;
  o.stock = 0;
  o.fallen = 'held'; // natives hold it: retake it, then repair it
  const cut = s.locations.filter((l) => cutOffBy(s, l) === loc).length;
  emit(s, 'outpost-fell', `OUTPOST LOST: natives retook ${loc.name}. Its stockpile is gone and the harvester is dark.${cut ? ` ${cut} ${cut === 1 ? 'server' : 'servers'} past it can't be reached until you retake and repair it.` : ''}`, { location: loc.id });
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
  for (const loc of outposts(s)) if (!loc.outpost.fallen && stockOf(loc)) collect(s, loc, 'Scheduler: ');
}

// Modules ---------------------------------------------------------------------------------------
function installMod(s, loc, id) {
  const m = OUTPOST.mods[id];
  if (!m) return warn(s, `Modules: ${Object.keys(OUTPOST.mods).join(', ')}.`);
  if (!loc.takenOver) return warn(s, `Take ${loc.name} over first.`);
  if (hasMod(loc, id)) return warn(s, `${loc.name} already runs a ${m.name}.`);
  if (modsOf(loc).length >= outpostPorts(s)) return warn(s, `${loc.name}'s ports are full (${outpostPorts(s)}). Remove a module first.`);
  const credits = archCredits(s, OUTPOST.modCost.credits), code = OUTPOST.modCost.code, k = codeOf(loc.family), have = materialsOf(s);
  const pay = s.server.credits >= credits && (have[k] || 0) >= code && settle(s, SALVAGE_COSTS.module(), null);
  if (!pay || typeof pay === 'string') return warn(s, `A ${m.name} costs ${credits} credits, ${code} ${MATERIALS[k].name} and ${OUTPOST.modCost.salvage} salvage.`);
  spend(s, pay);
  s.server.credits -= credits;
  have[k] -= code;
  modsOf(loc).push(id);
  emit(s, 'outpost-up', `${m.name} installed on ${loc.name}: ${m.rule}`, { location: loc.id });
}
function removeMod(s, loc, id) {
  if (!hasMod(loc, id)) return warn(s, `${loc.name} has no ${OUTPOST.mods[id]?.name || id}.`);
  loc.mods = modsOf(loc).filter((x) => x !== id);
  const k = codeOf(loc.family);
  materialsOf(s)[k] = (materialsOf(s)[k] || 0) + Math.floor(OUTPOST.modCost.code / 2);
  emit(s, 'info', `${OUTPOST.mods[id].name} removed from ${loc.name}: +${Math.floor(OUTPOST.modCost.code / 2)} ${MATERIALS[k].name} back.`);
}

// Fights ---------------------------------------------------------------------------------------
const NATIVE = { ransomware: 'cryptjack', worm: 'splinter', ghostroot: 'ghostroot' };
function fightNatives(s, loc, why) {
  const seed = loc.outpost.siege?.seed || ((loc.seed * 7 + (s.serial || 0)) >>> 0) || 1;
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
  if (o.fallen === 'held') {
    o.fallen = 'damaged';
    emit(s, 'outpost-held', `${loc.name} is yours again, but the outpost is wrecked. Repair it to start harvesting.`, { location: loc.id });
  } else if (o.siege) {
    o.siege = null;
    emit(s, 'outpost-held', `Siege broken: ${loc.name} is safe.`, { location: loc.id });
  }
}

// Commands -------------------------------------------------------------------------------------
// outpost install <server> <n> · outpost pull <server> · outpost defend <server>
// outpost retake <server> · outpost repair <server> · outpost compile <kind>
export function outpostCommand(s, full, now) {
  const [text, payText] = splitPay(full);
  const [, verb, a, b] = text.split(' ');
  if (verb === 'compile') return compile(s, a, payText);
  const loc = a && locOf(s, a);
  if (!loc) return warn(s, 'usage: outpost install|pull|defend|clear|retake|repair|mod|unmod <server>, or outpost compile <kind>');
  if (verb === 'mod') return installMod(s, loc, b);
  if (verb === 'unmod') return removeMod(s, loc, b);
  const o = loc.outpost;
  if (verb === 'install') {
    if (!loc.takenOver) return warn(s, `Take ${loc.name} over first: open its vault.`);
    if (o?.h) return warn(s, `${loc.name} already runs a harvester.`);
    if (o?.readyAt && now < o.readyAt) return warn(s, `${loc.name}'s port is still resetting (${Math.ceil((o.readyAt - now) / 60000)} min).`);
    if (cutOffBy(s, loc)) return warn(s, `${loc.name} is cut off. Retake ${cutOffBy(s, loc).name} first.`);
    const i = Math.max(1, Number(b) || 1) - 1;
    const h = harvesters(s)[i];
    if (!h) return warn(s, 'You have no harvester. Compile one on the Map\'s server card.');
    if (loc.trait !== 'backbone' && bandwidthUsed(s) >= bandwidth(s)) return warn(s, `No bandwidth left (${bandwidthUsed(s)}/${bandwidth(s)}). Pull a harvester out, or level your server.`);
    harvesters(s).splice(i, 1);
    loc.outpost = { h, at: now, stock: 0, siege: null, fallen: false };
    return emit(s, 'outpost-up', `Outpost up on ${loc.name}: ${harvesterName(h)}. It fills while you're away; connect to collect.`, { location: loc.id });
  }
  if (!o?.h) return warn(s, `${loc.name} has no outpost.`);
  if (verb === 'pull') {
    if (o.fallen || o.siege) return warn(s, o.siege ? 'Not while it\'s under siege.' : 'Retake and repair it first.');
    collect(s, loc);
    if (harvesters(s).length >= OUTPOST.stashCap) return warn(s, `Your harvester rack is full (${OUTPOST.stashCap}).`);
    harvesters(s).push(o.h);
    loc.outpost = { readyAt: now + OUTPOST.resetMs };
    return emit(s, 'info', `Pulled the harvester out of ${loc.name}. Its port resets for ${OUTPOST.resetMs / 60000} minutes.`);
  }
  if (s.run) return warn(s, 'Jack out first.');
  if (active(s)) return warn(s, 'Finish the fight first.');
  if (verb === 'defend') return o.siege ? fightNatives(s, loc, 'Defending') : warn(s, `${loc.name} isn't under siege.`);
  if (verb === 'clear') return clearInfest(s, loc);
  if (verb === 'retake') return o.fallen === 'held' ? fightNatives(s, loc, 'Retaking') : warn(s, `${loc.name} isn't held by natives.`);
  if (verb === 'repair') {
    if (o.fallen !== 'damaged') return warn(s, o.fallen ? 'Retake it first.' : `${loc.name} doesn't need repair.`);
    const L = loc.level || 1, cr = OUTPOST.repair.credits(L), code = OUTPOST.repair.code(L), m = codeOf(loc.family), have = materialsOf(s);
    if (s.server.credits < cr || (have[m] || 0) < code) return warn(s, `Repair needs ${cr} credits and ${code} ${MATERIALS[m].name}.`);
    s.server.credits -= cr;
    have[m] -= code;
    o.fallen = false;
    o.at = now;
    return emit(s, 'outpost-up', `${loc.name} repaired (−${cr} credits, −${code} ${MATERIALS[m].name}). Harvesting again, and the route past it is open.`, { location: loc.id });
  }
  warn(s, 'usage: outpost install|pull|defend|retake|repair <server>');
}

function compile(s, kind, payText = null) {
  if (!OUTPOST.kinds[kind]) return warn(s, `Compile which? ${Object.keys(OUTPOST.kinds).join(', ')}.`);
  const c = compileCost(kind, s), have = materialsOf(s);
  if (harvesters(s).length >= OUTPOST.stashCap) return warn(s, `Your harvester rack is full (${OUTPOST.stashCap}).`);
  if (s.server.credits < c.credits || (have[c.material] || 0) < c.code) return warn(s, `A ${OUTPOST.kinds[kind].name} costs ${c.credits} credits, ${c.code} ${MATERIALS[c.material].name} and ${costLabel(c.salvage)}.`);
  const pay = settle(s, c.salvage, payText);
  if (typeof pay === 'string') return warn(s, `${OUTPOST.kinds[kind].name}: ${pay}`);
  s.server.credits -= c.credits;
  have[c.material] -= c.code;
  spend(s, pay);
  harvesters(s).push({ kind, level: serverLevel(s), traits: [] });
  emit(s, 'harvester', `Compiled: ${harvesterName(harvesters(s).at(-1))}.`, { harvester: true });
}

export const siteLabel = (loc) => (loc.trait ? OUTPOST.sites[loc.trait] : null);

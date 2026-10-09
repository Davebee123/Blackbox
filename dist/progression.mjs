// Progression: one headline level, what each level brings on every track, catch-up for a level that
// runs long, and the save migration that folded the extra tracks away (v34). docs/progression.md is the
// review sheet.
//   one level    your server's level is your highest class level (combat.mjs serverLevel). It has no XP
//                of its own. Every gate it had (daemon slots, service versions, bandwidth, buildings,
//                architecture, memory, base Integrity) reads that.
//   the banner   a level-up lists everything the level brings, on every track, and the next level that
//                brings something (levelGains, nextGains; app.js levelUp).
//   Behind       a level gets a target of CATCHUP.base + CATCHUP.per × level minutes of active play.
//                Past CATCHUP.after times that, kills pay CATCHUP.bonus more until the level ends.
//   v34          server XP, the specialty, ports, eight services and grey protocols are gone. What a save
//                had in them comes back in kind (progressionRestore).
import { emit, hackerOf, classOf, materialsOf, learnDaemon, daemonVersion, UNIQUES, gainsTalent, kitTalent } from './combat.mjs';
import { CATCHUP, levelTarget, LOADOUT, SERVER, BANDS, ARCHETYPES } from './data.mjs';
import { BASES, PROTOCOL_SLOTS, VERSIONS, MATERIALS, primaries, uniqueItem, seeded, RULES, ruleValue, RARITIES } from './gear.mjs';
import { OUTPOST, BUILDINGS } from './outpost.mjs';
import { ARCH_LEVEL } from './architecture.mjs';
import { MEMORY } from './memory.mjs';
import { learnFilter } from './filters.mjs';

// ---------- what a level brings ----------
// The tracks keyed off your level, at level L. top: the highest level your other classes have, so the
// server's gates count only when this level raises it.
export function levelGains(arch, L, top = 0) {
  const out = [];
  if (gainsTalent(L)) out.push('a talent point');
  const slot = PROTOCOL_SLOTS.find((x) => x.level === L);
  if (slot && L > 1) out.push(L === 15 ? 'a protocol slot (Implant), and Implants start to drop' : 'a protocol slot');
  const bases = Object.values(BASES).filter((b) => b.level === L && L > 1 && !b.uniqueOnly);
  if (bases.length) out.push(`new protocol bases: ${bases.map((b) => b.name).join(', ')}`);
  const layer = BANDS.findIndex(([lo]) => lo === L);
  if (layer > 0) out.push(`layer ${layer + 1} (your finds trace there)`);
  if (L === LOADOUT.specFrom) out.push(`${kitTalent(arch).name} in your kit`);
  if (L > top) {
    if (SERVER.daemonSlotsAt.includes(L)) out.push('a daemon slot');
    const v = VERSIONS.find((x) => x.needs === L && x.v > 1);
    if (v) out.push(`service v${v.v}`);
    if (OUTPOST.bandwidth(L) > OUTPOST.bandwidth(L - 1)) out.push('an outpost slot');
    const built = Object.values(BUILDINGS).filter((b) => b.lv === L && L > 1);
    if (built.length) out.push(`${built.length === 1 ? 'a building' : 'buildings'}: ${built.map((b) => b.name).join(', ')}`);
    if (L === ARCH_LEVEL) out.push('a choice of architecture');
    if (MEMORY.on && Math.floor(L / MEMORY.per) > Math.floor((L - 1) / MEMORY.per)) out.push('server memory +1');
  }
  return out;
}
// The next level after L that brings something beyond +4%: { level, gains } (skills: what newAtLevel names).
export function nextGains(arch, L, top, skillsAt) {
  for (let l = L + 1; l <= LOADOUT.maxLevel; l++) {
    const g = [...skillsAt(l), ...levelGains(arch, l, Math.max(top, L))];
    if (g.length) return { level: l, gains: g };
  }
  return null;
}

// ---------- catch-up (Behind) ----------
// Active play: the game open and used (app.js calls this once a second; bot.mjs as its clock runs). It
// counts toward your kills an hour (s.pace) and toward the level the class in use is on (h.ms).
export function tickPlay(s, dt) {
  if (!(dt > 0)) return;
  (s.pace ||= { kills: 0, ms: 0 }).ms += dt;
  const h = hackerOf(s);
  h.ms = (h.ms || 0) + dt;
}
// Where a class's current level stands against its target: { ms, target, after, on } (null at the cap).
export function behindOf(s, arch = classOf(s)) {
  const h = hackerOf(s, arch);
  if (h.level >= LOADOUT.maxLevel) return null;
  const ms = h.ms || 0, target = levelTarget(h.level);
  return { ms, target, after: target * CATCHUP.after, on: ms > target * CATCHUP.after };
}
// A kill's catch-up bonus on xp (0 when the level is on pace). Says so once a level, when it starts.
export function behindBonus(s, xp) {
  const b = behindOf(s);
  if (!b?.on) return 0;
  const h = hackerOf(s);
  if (h.behind !== h.level) { h.behind = h.level; emit(s, 'behind-on', `Behind: level ${h.level} is running long. Kills pay +${Math.round(CATCHUP.bonus * 100)}% XP until you reach ${h.level + 1}.`, { level: h.level }); }
  return Math.max(1, Math.round(xp * CATCHUP.bonus));
}
// A new level starts its clock.
export const levelStarted = (s, h) => { h.ms = 0; delete h.behind; };

// ---------- v34: one level, fewer tracks ----------
// The services that left, what they cost (VERSIONS, by version) and what they became.
export const RETIRED = {
  firewall: { name: 'Filter Bay', code: 'cipher' }, // its slots are the firewall's own now
  raid: { name: 'RAID Array', code: 'worm' }, // firewall tiers +1, +3, +5: +5% max Integrity each
  kernel: { name: 'Hardened Kernel', code: 'kernel', filter: 'reduction' },
  scrubber: { name: 'Scrubber', code: 'cipher', filter: 'shield' },
  hotpatch: { name: 'Hot-patcher', code: 'worm', filter: 'regen' },
  counter: { name: 'Counter-intrusion', code: 'worm', filter: 'countermeasures' },
  cron: { name: 'Cron Job', code: ['worm', 'kernel'], daemon: 'cron' },
  snapshot: { name: 'Snapshot', code: ['cipher', 'kernel'], daemon: 'snapshot' },
};
// What version v of a retired service cost (as gear.mjs serviceCost did): credits, code, Exploits, salvage.
function retiredCost(id, v) {
  const d = RETIRED[id], x = VERSIONS[v - 1], codes = Array.isArray(d.code) ? d.code : [d.code];
  const c = { credits: x.credits, exploit: x.exploit, salvage: x.salvage };
  for (const k of codes) c[k] = Math.ceil(x.code / codes.length) + (codes.length > 1 ? Math.ceil(x.code / 4) : 0);
  return c;
}
function payBack(s, c, into) {
  for (const [k, n] of Object.entries(c)) {
    if (!n) continue;
    into[k] = (into[k] || 0) + n;
    if (k === 'credits') s.server.credits += n;
    else if (k === 'salvage') for (let i = 0; i < n; i++) (s.salvage ||= []).push({ name: 'Scrap', virus: 'refund', seed: 0 });
    else materialsOf(s)[k] = (materialsOf(s)[k] || 0) + n;
  }
}
const line = (c) => Object.entries(c).filter(([, n]) => n).map(([k, n]) => (k === 'credits' ? `${n} credits` : k === 'salvage' ? `${n} salvage` : `${n} ${MATERIALS[k]?.name || k}`)).join(', ');
const hash = (str) => [...String(str)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
export function progressionRestore(s, was) {
  if (was >= 34) return;
  // One level: the server's XP goes. Its level is your highest class level from now on.
  delete s.serverXp;
  // Services that left: a Cron Job or Snapshot you ran becomes that daemon at its version; every other
  // one comes back as what it cost (every version), and its blueprint becomes the matching filter recipe.
  const back = {}, became = [];
  for (const [id, d] of Object.entries(RETIRED)) {
    const v = s.services?.[id] || 0;
    const job = s.install?.id === id ? s.install : null;
    if (d.daemon && (v || s.recipes?.includes(id))) {
      const want = Math.max(1, v);
      while (daemonVersion(s, d.daemon) < want) learnDaemon(s, '', d.daemon);
      became.push(`${d.name} is a daemon now (v${daemonVersion(s, d.daemon)})`);
    } else for (let k = 1; k <= v; k++) payBack(s, retiredCost(id, k), back);
    if (job) { payBack(s, retiredCost(id, job.v), back); s.install = null; }
    if (d.filter && (v || s.recipes?.includes(id))) learnFilter(s, d.filter, '');
    if (s.services) delete s.services[id];
    if (s.net?.sabotage?.id === id) s.net.sabotage = null;
  }
  if (s.recipes) s.recipes = s.recipes.filter((k) => !RETIRED[k]);
  if (Object.keys(back).length || became.length) emit(s, 'info', `Your server's services changed: the home fight is the firewall's job now (its tiers and filters).${became.length ? ` ${became.join('. ')}.` : ''}${Object.keys(back).length ? ` Refunded: ${line(back)}.` : ''}`);
  // The specialty: nothing was paid for it. The first of the two talents is part of every class's kit now.
  if (s.loadout?.spec && Object.keys(s.loadout.spec).length) emit(s, 'info', `The specialty is gone. From level ${LOADOUT.specFrom} every class has one of its first-row talents in its kit, at two ranks: ${Object.keys(s.loadout.spec).filter((a) => ARCHETYPES[a]).map((a) => `${ARCHETYPES[a].name} ${kitTalent(a).name}`).join(', ')}.`);
  if (s.loadout) delete s.loadout.spec;
  // Grey protocols are gone: each becomes a Stock one of its base and level, without its junk affix.
  let greys = 0;
  for (const it of s.stash || []) {
    if (it.kind !== 'protocol' || it.rarity !== 'scrap') continue;
    greys++;
    it.rarity = 'stock';
    it.affixes = [];
    if (BASES[it.base]) { it.stats = primaries(it.base, it.level || 1, RARITIES.stock.mult, seeded(hash(it.id))); it.name = BASES[it.base].name; }
    else for (const [k, v] of Object.entries(it.stats || {})) if (v < 0) delete it.stats[k];
  }
  if (greys) emit(s, 'info', `${greys} grey ${greys === 1 ? 'protocol is' : 'protocols are'} Stock now, without ${greys === 1 ? 'its' : 'their'} junk affix.`);
  // Uniques keep up with the best base at their item level now: each one you hold grows to it.
  for (const it of s.stash || []) {
    const u = it.unique && UNIQUES[it.unique];
    if (!u) continue;
    const now = uniqueItem(u, it.level || u.level, seeded(hash(it.id)));
    for (const [k, v] of Object.entries(now.stats)) if (v > 0 && v > (it.stats[k] || 0)) it.stats[k] = v;
    it.base = now.base;
  }
  // Every blue and yellow carries a rule now. The ones you already hold get one, and keep their numbers.
  for (const it of s.stash || []) {
    const tier = it.kind === 'protocol' && !it.zeroDay && !it.unique && !it.rule && RARITIES[it.rarity]?.rule;
    if (!tier) continue;
    const r = seeded(hash(it.id) + 11), ids = Object.keys(RULES).filter((k) => RULES[k].tier === tier && !RULES[k].cls);
    it.rule = ids[Math.floor(r() * ids.length)];
    const v = ruleValue(it.rule, it.level || 1, r());
    if (v) it.ruleValue = v;
  }
  // Behind: a class's level clock (h.ms) starts at 0 when it isn't there yet, so the level you're on counts from now.
}

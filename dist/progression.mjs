// Progression: one headline level, what each level brings on every track, the play clock, and the save
// migration that folded the extra tracks away (v34). docs/progression.md is the review sheet.
//   one level    your server's level is your highest class level (combat.mjs serverLevel). It has no XP
//                of its own. Its gates (daemon slots, memory, base Integrity) read that.
//   the banner   a level-up lists everything the level brings, on every track, and the next level that
//                brings something (levelGains, nextGains; app.js levelUp).
//   v34          server XP, the specialty, ports, eight services and grey protocols are gone. What a save
//                had in them comes back in kind (progressionRestore).
import { gainComponents } from './salvage.mjs';
import { emit, materialsOf, daemonLevel, UNIQUES, gainsTalent, kitTalent } from './combat.mjs';
import { versionLevel } from './daemons.mjs';
import { LOADOUT, SERVER, FLOORS, ARCHETYPES, xpToNext, v41XpToNext } from './data.mjs';
import { BASES, PROTOCOL_SLOTS, MATERIALS, primaries, uniqueItem, seeded, RULES, ruleValue, RARITIES } from './gear.mjs';
import { MEMORY } from './memory.mjs';
import { learnFilter } from './filters.mjs';

// ---------- what a level brings ----------
// The tracks keyed off your level, at level L. top: the highest level your other classes have, so the
// server's gates count only when this level raises it.
export function levelGains(arch, L, top = 0) {
  const out = [];
  if (gainsTalent(L)) out.push('a talent point');
  if (L === LOADOUT.capstoneAt[0]) out.push('a capstone point (pick one of two capstones)');
  if (L === LOADOUT.capstoneAt[1]) out.push("your capstone's second rank");
  const slot = PROTOCOL_SLOTS.find((x) => x.level === L);
  if (slot && L > 1) out.push(L === 15 ? 'a protocol slot (Implant), and Implants start to drop' : 'a protocol slot');
  const bases = Object.values(BASES).filter((b) => b.level === L && L > 1 && !b.uniqueOnly);
  if (bases.length) out.push(`new protocol bases: ${bases.map((b) => b.name).join(', ')}`);
  const floor = FLOORS.findIndex((f) => f.band[0] === L);
  if (floor > 0) out.push(`${FLOORS[floor].name} (floor ${floor + 1})`);
  if (L === LOADOUT.specFrom) out.push(`${kitTalent(arch).name} in your kit`);
  if (L > top) {
    if (SERVER.daemonSlotsAt.includes(L)) out.push('a daemon slot');
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

// ---------- the play clock ----------
// Active play: the game open and used (app.js calls this once a second; bot.mjs as its clock runs). It
// counts toward your kills an hour (s.pace), which Fresh runs on too (combat.mjs playMs).
export function tickPlay(s, dt) {
  if (!(dt > 0)) return;
  (s.pace ||= { kills: 0, ms: 0 }).ms += dt;
}

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
const OLD_VERSIONS = [{ code: 12, exploit: 0, credits: 120, salvage: 6 }, { code: 40, exploit: 1, credits: 600, salvage: 15 }, { code: 100, exploit: 3, credits: 2000, salvage: 40 }];
function retiredCost(id, v) {
  const d = RETIRED[id], x = OLD_VERSIONS[v - 1], codes = Array.isArray(d.code) ? d.code : [d.code];
  const c = { credits: x.credits, exploit: x.exploit, salvage: x.salvage };
  for (const k of codes) c[k] = Math.ceil(x.code / codes.length) + (codes.length > 1 ? Math.ceil(x.code / 4) : 0);
  return c;
}
function payBack(s, c, into) {
  for (const [k, n] of Object.entries(c)) {
    if (!n) continue;
    into[k] = (into[k] || 0) + n;
    if (k === 'credits') s.server.credits += n;
    else if (k === 'salvage') gainComponents(s, n); // components (salvage.mjs)
    else materialsOf(s)[k] = (materialsOf(s)[k] || 0) + n;
  }
}
const line = (c) => Object.entries(c).filter(([, n]) => n).map(([k, n]) => (k === 'credits' ? `${n} credits` : k === 'salvage' ? `${n} components` : `${n} ${MATERIALS[k]?.name || k}`)).join(', ');
const hash = (str) => [...String(str)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
// v42: the long climb (CLIMB in data.mjs, about 100 hours of real play to 50 where it was 7). Every class keeps its
// level (nobody loses one), and its XP into the level keeps its share of it: two thirds of the way to 13 on the old
// curve is two thirds of the way on the new one. Rested XP is a count of kills banked and stays as it is.
export function climbRestore(s, was) {
  if (was >= 42) return false;
  let moved = false;
  for (const h of Object.values(s.hackers || {})) {
    if (!h || !(h.level >= 1) || h.level >= LOADOUT.maxLevel) continue;
    const share = Math.min(1, Math.max(0, (h.xp || 0) / v41XpToNext(h.level)));
    const xp = Math.min(xpToNext(h.level) - 1, Math.round(share * xpToNext(h.level)));
    if (xp !== h.xp) { h.xp = xp; moved = true; }
  }
  return moved;
}
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
      const L = versionLevel(s, Math.max(1, v)); // a version became a level (daemons.mjs)
      if (daemonLevel(s, d.daemon) < L) (s.daemonLv ||= {})[d.daemon] = L;
      became.push(`${d.name} is a daemon now (lv ${daemonLevel(s, d.daemon)})`);
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
}

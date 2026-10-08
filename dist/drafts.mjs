// Drafts on a breach (docs/roguelite.md 4): mods, CVEs and gear, drafted 1 of 3 after a fight. Phase 0 of the
// roguelite redesign: 12 mods (three a class, on the core skills every level-10 bar carries) and 10 CVEs.
//
// A mod changes how one skill on your bar works, for this breach only. Most are field patches on ABILITIES, laid on
// while a breach runs and taken off when it ends (patchMods / unpatchMods): the global data is never changed for
// good. The rest react to what the fight emits (onEvent, through combat.mjs hooks.emitted).
// A CVE lasts the whole breach. Where an effect block already exists it is one (cveFx, through combat.mjs
// hooks.extraFx, read like a unique's effect); the others react to the fight's events too.
import { ABILITIES } from './data.mjs';
import { part, alive, livingParts, soonestAttacker, heal, hit, emit, powerOf, scaled, usable, cooldownOf, defender, equippedSkills, classOf } from './combat.mjs';
import { rollItem, RARITIES, itemLabel, statLine } from './gear.mjs';
import { overclockMult } from './tells.mjs';

// ---------- mods ----------
// patch: ABILITIES fields while the mod is held (its short line on the key too). text: the tooltip (base numbers,
// as a skill's help gives them). cost: what it gives up, in a word, for the card.
export const MODS = {
  aftershock: { cls: 'breaker', skill: 'crack', name: 'Aftershock', short: 'Breaks 3 ◆; 8 each', text: 'Crack also deals 8 damage to the target for each ◆ it breaks.' },
  overcommit: { cls: 'breaker', skill: 'overload', name: 'Overcommit', patch: { damage: 60 }, short: '60 damage; 4 Signal', text: 'Overload deals 60 damage and costs you 4 Signal. A critical strike refunds the Signal.' },
  undertow: { cls: 'breaker', skill: 'flood', name: 'Undertow', short: '38, ×2 bare; delays', text: "Flood also delays the target's next attack by 1 cycle when the target has no armor." },
  'grudge-match': { cls: 'bastion', skill: 'retaliate', name: 'Grudge Match', patch: { window: 2 }, short: 'Returns 2×; 2 cycles', text: 'Retaliate stays usable for 2 cycles after you are hit.' },
  'token-bucket': { cls: 'bastion', skill: 'rate-limit', name: 'Token Bucket', patch: { damage: 30 }, short: '30 damage; 2 attacks', text: "Rate Limit Throttles the target's next 2 attacks, but deals 15 less damage." },
  'deep-scan': { cls: 'bastion', skill: 'purge', name: 'Deep Scan', patch: { drain: 4 }, short: 'Burn 6 ×4; heals 4', text: 'Purge heals you for 4 with each tick instead of 2, and brings back a skill a tell knocked offline.' },
  persistence: { cls: 'infiltrator', skill: 'backdoor', name: 'Persistence', short: '24 through ◆; +1 cycle', text: 'Backdoor also makes every burn on the target last 1 cycle longer.' },
  'tracking-pixel': { cls: 'infiltrator', skill: 'tag', name: 'Tracking Pixel', short: 'Tag moves on a break', text: 'When a Tagged part breaks, Tag moves to the part whose attack lands soonest, with the cycles it had left.' },
  'long-poll': { cls: 'infiltrator', skill: 'keepalive', name: 'Long Poll', patch: { cooldown: 5 }, short: 'Burns tick twice now', text: 'Keepalive makes every burn on the target tick twice now, but its cooldown is 5 cycles.' },
  daemonize: { cls: 'operator', skill: 'deploy', name: 'Daemonize', patch: { helper: 8, ticks: 40 }, short: 'Helper: 8 until done', text: "Deploy's helper deals 8 damage each cycle and stays for the rest of the fight." },
  'barbed-hook': { cls: 'operator', skill: 'hook', name: 'Barbed Hook', patch: { damage: 0, cycles: 8 }, short: 'Hooked 8 cycles', text: 'Hook deals no damage, but the target stays Hooked for 8 cycles.' },
  clone: { cls: 'operator', skill: 'spawn', name: 'Clone', patch: { helpers: 2, cooldown: 2 }, short: '2 helpers: 7 ×3', text: 'Spawn sends 2 helpers, but its cooldown is 2 cycles.' },
};
for (const [id, m] of Object.entries(MODS)) m.id = id;

// The fields a mod changed, as they were: put back when the breach ends (or before the next one patches).
let saved = null;
export function unpatchMods() {
  if (!saved) return;
  for (const [skill, was] of Object.entries(saved)) for (const [k, v] of Object.entries(was)) { if (v === undefined) delete ABILITIES[skill][k]; else ABILITIES[skill][k] = v; }
  saved = null;
}
// Lay the held mods on (after taking any old ones off).
export function patchMods(mods) {
  unpatchMods();
  saved = {};
  for (const id of mods || []) {
    const m = MODS[id], a = m && ABILITIES[m.skill];
    if (!a) continue;
    const was = (saved[m.skill] ||= {});
    for (const [k, v] of Object.entries({ ...(m.patch || {}), short: m.short })) { if (!(k in was)) was[k] = a[k]; a[k] = v; }
  }
}
export const modOn = (s, id) => !!s.breach?.mods?.includes(id) && !!s.encounter?.breach;
// The mods your class can draft now: its skills on your bar, not held already.
export const modPool = (s) => { const bar = equippedSkills(s, classOf(s)); return Object.values(MODS).filter((m) => m.cls === classOf(s) && bar.includes(m.skill) && !s.breach?.mods?.includes(m.id)).map((m) => m.id); };

// ---------- CVEs ----------
// fx: an effect block (content.mjs), read like a unique's. The rest react to events (onEvent) or to the breach.
export const CVES = {
  heartbleed: { name: 'Heartbleed', rarity: 'common', text: 'Heals you for 3 each time you break a ◆.' },
  shellshock: { name: 'Shellshock', rarity: 'common', text: 'Delays the attack that lands soonest by 1 cycle at the start of each fight.' },
  eternalblue: { name: 'EternalBlue', rarity: 'common', fx: { when: 'start', do: 'force-crit' }, text: 'Makes your first hit each fight a critical strike.' },
  sasser: { name: 'Sasser', rarity: 'common', text: 'Restores 5% of your Signal after a fight where no tell landed.' },
  mirai: { name: 'Mirai', rarity: 'common', text: 'Sends a helper at the next part when you break a part, dealing 5 damage each cycle for 3 cycles.' },
  bluekeep: { name: 'BlueKeep', rarity: 'uncommon', text: 'Gates and the Resident start with 1 ◆ less on every part.' },
  conficker: { name: 'Conficker', rarity: 'uncommon', text: 'Makes your skill with the longest cooldown ready at once when a tell lands on you.' },
  codered: { name: 'Code Red', rarity: 'uncommon', text: 'Increases your damage by 25% while the virus is Overclocked.' },
  poodle: { name: 'POODLE', rarity: 'rare', text: 'Drafts offer 1 more card.' },
  ripple20: { name: 'Ripple20', rarity: 'rare', text: 'Readies SIGINT each time a tell lands on you.' },
};
for (const [id, c] of Object.entries(CVES)) c.id = id;
// A CVE's rarity, in the draft's colours: common white, uncommon blue, rare yellow.
export const CVE_TIER = { common: 'stock', uncommon: 'tuned', rare: 'custom' };
export const cveOn = (s, id) => !!s.breach?.cves?.includes(id);

// The effect blocks your CVEs lay on a breach fight (combat.mjs uniqueFx, through hooks.extraFx).
export function cveFx(s) {
  if (!s.breach || !s.encounter?.breach) return null;
  const out = [];
  for (const id of s.breach.cves || []) {
    const c = CVES[id];
    if (c?.fx) out.push({ it: { name: c.name }, name: c.name, fx: c.fx, id: 'cve:' + id });
    if (id === 'codered' && overclockMult(s) > 1) out.push({ it: { name: c.name }, name: c.name, fx: { when: 'hit', do: 'damage%', value: 25 }, id: 'cve:codered' });
  }
  return out;
}

// ---------- events ----------
// What a breach's mods and CVEs do when the fight says something happened (combat.mjs emit, through
// hooks.emitted). Nothing they do here sets anything else off: one reaction per event.
const landedTells = (e) => Object.values(e.metrics?.tells || {}).reduce((n, x) => n + x.landed, 0);
const chitsIn = (ev) => { const m = /loses (\d+) ◆/.exec(ev.message); return m ? Number(m[1]) : /two ◆ broken/.test(ev.message) ? 2 : /◆ broken/.test(ev.message) ? 1 : 0; };
const has = (s, id) => s.breach.mods.includes(id);
export function onEvent(s, ev) {
  const e = s.encounter, b = s.breach;
  if (!e?.breach || e.phase !== 'active' && ev.type !== 'engage') return;
  // Your command, as it resolves: what the mods on it do before and after it hits.
  if (ev.type === 'resolved' && ev.ability && ev.auto !== 'daemon') {
    e.breachCmd = { id: ev.ability, target: ev.target, cycle: e.cycle, hit: false };
    const p = ev.target && part(s, ev.target);
    if (ev.ability === 'overload' && has(s, 'overcommit')) { const d = defender(s); const n = Math.min(4, d.integrity - 1); if (n > 0) { d.integrity -= n; emit(s, 'status', `Overcommit costs you ${n} Signal. Signal ${d.integrity}/${d.max}.`, { amount: n, ability: 'overload' }); } }
    if (ev.ability === 'backdoor' && has(s, 'persistence') && alive(p)) { const burns = e.burns.filter((x) => x.target === p.id); for (const x of burns) x.left += 1; if (burns.length) emit(s, 'status', `Persistence: ${burns.length === 1 ? 'the burn' : `${burns.length} burns`} on the ${p.name} ${burns.length === 1 ? 'lasts' : 'last'} 1 cycle longer.`, { target: p.id, mark: 'burn' }); }
    if (ev.ability === 'keepalive' && has(s, 'long-poll') && alive(p)) for (const x of e.burns.filter((y) => y.target === p.id)) { if (!alive(p)) break; hit(s, p, x.damage, { by: `Long Poll (${x.name})`, dot: true }); }
    if (ev.ability === 'purge' && has(s, 'deep-scan')) { const off = Object.entries(e.locked || {}).filter(([, until]) => until >= e.cycle).map(([id]) => id)[0]; if (off) { delete e.locked[off]; e.readyAt[off] = Math.min(e.readyAt[off] || 0, e.cycle + 1); emit(s, 'proc', `Deep Scan brings ${ABILITIES[off]?.name || off} back online.`, { ability: off }); } }
    return;
  }
  // The first damage your command does to its target (no "By: " in front: not a burn, a helper or a spill).
  if (ev.type === 'damage' && e.breachCmd && !e.breachCmd.hit && ev.target === e.breachCmd.target && e.breachCmd.cycle === e.cycle && !/^[A-Z][\w() -]*: /.test(ev.message)) {
    e.breachCmd.hit = true;
    const p = part(s, ev.target);
    if (e.breachCmd.id === 'flood' && has(s, 'undertow') && alive(p) && !(p.armor > 0) && p.attack && p.attack.due < 900 && p.attack.due >= e.cycle) { p.attack.due += 1; emit(s, 'interrupt', `Undertow: the ${p.name}'s ${p.attack.name} is delayed 1 cycle.`, { target: p.id }); }
  }
  if (ev.type === 'proc' && ev.ability === 'overload' && has(s, 'overcommit') && /critical/.test(ev.message)) heal(s, 4, 'Overcommit refunds');
  if (ev.type === 'status' && ev.ability === 'rate-limit' && has(s, 'token-bucket')) { const p = part(s, ev.target); if (alive(p) && p.attack) p.throttledUntil = Math.max(p.throttledUntil || 0, p.attack.due + p.attack.interval); }
  // ◆ you break.
  if (ev.type === 'armor' && ev.target) {
    const n = chitsIn(ev), p = part(s, ev.target);
    if (n && /^Crack: /.test(ev.message) && has(s, 'aftershock') && alive(p)) hit(s, p, Math.round(8 * powerOf(s)) * n, { by: 'Aftershock', pierce: true });
    if (n && cveOn(s, 'heartbleed')) heal(s, 3 * n, 'Heartbleed');
  }
  // A part you broke.
  if (ev.type === 'broken' && !ev.c2) {
    const p = part(s, ev.target);
    if (p && p.kind !== 'fragment') {
      if (has(s, 'tracking-pixel') && p.taggedUntil >= e.cycle) { const q = soonestAttacker(s, p.id); if (alive(q) && q !== p) { q.taggedUntil = Math.max(q.taggedUntil || 0, p.taggedUntil); q.tagBoost = p.tagBoost || 0; emit(s, 'status', `Tracking Pixel moves Tag to the ${q.name}.`, { target: q.id, mark: 'tagged' }); } }
      if (cveOn(s, 'mirai')) { const q = soonestAttacker(s, p.id); if (alive(q) && q !== p) { const dmg = scaled(s, 5); e.helpers.push({ target: q.id, damage: dmg, left: 3, synced: false }); emit(s, 'status', `Mirai sends a helper at the ${q.name}, dealing ${dmg} every cycle for 3 cycles.`, { target: q.id, mark: 'helper' }); } }
    }
  }
  // A fight starts.
  if (ev.type === 'engage') {
    if (cveOn(s, 'shellshock')) { const q = soonestAttacker(s); if (q?.attack && q.attack.due < 900) { q.attack.due += 1; emit(s, 'interrupt', `Shellshock: the ${q.name}'s ${q.attack.name} is delayed 1 cycle.`, { target: q.id }); } }
    if (cveOn(s, 'bluekeep') && ['gate', 'boss'].includes(b.map.nodes[e.breach]?.kind)) { for (const q of livingParts(s)) { if (q.maxArmor > 0) { q.maxArmor--; q.armor = Math.min(q.armor, q.maxArmor); } } emit(s, 'status', `BlueKeep: every part of ${e.virus.name} starts with 1 ◆ less.`, {}); }
    e.breachLanded = 0;
  }
  // A tell that landed on you (tells.mjs tallies it): Conficker and Ripple20.
  if (e.metrics?.tells && (cveOn(s, 'conficker') || cveOn(s, 'ripple20'))) {
    const landed = landedTells(e);
    if (landed > (e.breachLanded || 0)) {
      e.breachLanded = landed;
      if (cveOn(s, 'ripple20') && e.readyAt.sigint > e.cycle) { delete e.readyAt.sigint; emit(s, 'proc', 'Ripple20: SIGINT is ready.', { ability: 'sigint' }); }
      if (cveOn(s, 'conficker')) { const id = usable(s).filter((x) => x !== 'sigint' && e.readyAt[x] > e.cycle).sort((a, c) => e.readyAt[c] - e.readyAt[a])[0]; if (id) { delete e.readyAt[id]; emit(s, 'proc', `Conficker: ${ABILITIES[id].name} is ready.`, { ability: id }); } }
    }
  }
}
// After a fight: Sasser.
export function afterFightCves(s, e) {
  if (cveOn(s, 'sasser') && !landedTells(e)) { const d = defender(s), n = Math.min(d.max - d.integrity, Math.round(d.max * 0.05)); if (n > 0) { d.integrity += n; return n; } }
  return 0;
}

// ---------- the draft ----------
// Rarity by act (white, blue, yellow): an elite moves 10 points from white to yellow. Every draft without a rare
// adds 3 points to the next one's rare odds.
export const RARITY_BY_ACT = [[60, 32, 8], [50, 36, 14], [40, 40, 20]];
export const DRAFT = { mod: 50, cve: 15, gear: 35, skip: 15, rareStep: 3, cards: 3 };
const RAR = ['stock', 'tuned', 'custom'];
function rollRarity(r, act, { elite = false, floor = null, boost = 0 } = {}) {
  let [w, bl, y] = RARITY_BY_ACT[Math.min(2, act)];
  if (elite) { w -= 10; y += 10; }
  w -= boost; y += boost;
  if (floor === 'tuned') { bl += Math.max(0, w); w = 0; }
  if (floor === 'custom') return 'custom';
  let x = r() * (w + bl + y);
  return x < w ? 'stock' : x < w + bl ? 'tuned' : 'custom';
}
const pickFrom = (r, list) => list[Math.floor(r() * list.length)];
function cveCard(s, r, act, opts = {}) {
  // The campaign's unlock pool (campaign.mjs): only the CVEs you've opened. The playtest offers every one.
  const held = s.breach.cves, open = s.breach.pool?.cves, pool = Object.values(CVES).filter((c) => !held.includes(c.id) && (!open || open.includes(c.id)));
  if (!pool.length) return null;
  const want = opts.rarity || { stock: 'common', tuned: 'uncommon', custom: 'rare' }[rollRarity(r, act, opts)];
  const tier = pool.filter((c) => c.rarity === want);
  const c = pickFrom(r, tier.length ? tier : pool);
  return { kind: 'cve', id: c.id, rarity: CVE_TIER[c.rarity] };
}
function modCard(s, r, taken) {
  const pool = modPool(s).filter((id) => !taken.includes(id));
  if (!pool.length) return null;
  const id = pickFrom(r, pool);
  return { kind: 'mod', id, rarity: 'tuned' };
}
function gearCard(s, r, act, level, opts = {}) {
  const rarity = rollRarity(r, act, opts);
  return { kind: 'gear', item: rollItem(r, { level, rarity }), rarity };
}
// A draft: kind 'virus' (mods, CVEs and gear), 'elite' (a CVE for sure, gear blue or better), 'gate' and 'boss' (gear
// blue or better), 'rare' (a sandbox: one yellow at least), 'cve' (Forged Keys: CVEs only), 'mod' (Archive: mods only).
export function rollDraft(s, r, kind, { act = 0, level = 10, count = DRAFT.cards, boost: extra = 0 } = {}) {
  const b = s.breach, cards = [], taken = [];
  const boost = (b.rareBoost || 0) + extra;
  const push = (c) => { if (c && !cards.some((x) => (x.id && x.id === c.id))) { cards.push(c); if (c.kind === 'mod') taken.push(c.id); } };
  if (kind === 'cve') { for (let i = 0; i < 12 && cards.length < count; i++) push(cveCard(s, r, act, { boost })); }
  else if (kind === 'mod') { for (let i = 0; i < 12 && cards.length < count; i++) push(modCard(s, r, taken)); }
  else if (kind === 'gate' || kind === 'boss') { for (let i = 0; i < count; i++) push(gearCard(s, r, act, level, { floor: 'tuned', boost })); }
  else {
    const elite = kind === 'elite';
    if (elite) push(cveCard(s, r, act, { elite, boost }));
    if (kind === 'rare') push(r() < 0.5 ? cveCard(s, r, act, { rarity: 'rare' }) : gearCard(s, r, act, level, { floor: 'custom' }));
    for (let i = 0; i < 20 && cards.length < count; i++) {
      const x = r() * (DRAFT.mod + DRAFT.cve + DRAFT.gear);
      push(x < DRAFT.mod ? modCard(s, r, taken) : x < DRAFT.mod + DRAFT.cve ? cveCard(s, r, act, { elite, boost }) : gearCard(s, r, act, level, { elite, floor: elite ? 'tuned' : null, boost }));
      // At least two kinds in every draft: the last card makes it so.
      if (cards.length === count - 1 && new Set(cards.map((c) => c.kind)).size === 1) push(cards[0].kind === 'gear' ? (modCard(s, r, taken) || cveCard(s, r, act, { boost })) : gearCard(s, r, act, level, { elite, boost }));
    }
  }
  // Rare odds creep up until a draft shows one.
  b.rareBoost = cards.some((c) => c.rarity === 'custom') ? 0 : boost + DRAFT.rareStep;
  return cards.slice(0, count);
}
// What a card says, for the screen and the log.
export function cardText(c) {
  if (c.kind === 'mod') { const m = MODS[c.id]; return { name: m.name, kicker: `Mod · ${ABILITIES[m.skill]?.name || m.skill}`, text: m.text }; }
  if (c.kind === 'cve') { const v = CVES[c.id]; return { name: v.name, kicker: `CVE · ${v.rarity[0].toUpperCase() + v.rarity.slice(1)}`, text: v.text }; }
  return { name: c.item.name, kicker: `Gear · ${RARITIES[c.item.rarity]?.name || ''} ${c.item.group}`, text: statLine(c.item.stats), label: itemLabel(c.item) };
}
